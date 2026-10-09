// Exercise the built application with device cookies and intercepted outbound
// traffic. This never contacts a deployed Worker or invitation provider.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {verifyChatTicket} from '../lib/chat-ticket.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),origin='https://momo.test';
const {Miniflare}=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'))('miniflare');
const secret='disposable-ticket-secret-12345678901234567',passcode='disposable-host-passcode';
const chat=new Miniflare({modules:true,scriptPath:root+'/cloudflare/chat/worker.mjs',modulesRoot:root,modulesRules:[{type:'ESModule',include:['**/*.mjs']}],compatibilityDate:'2026-05-15',d1Databases:['DB'],durableObjects:{ROOMS:{className:'ChatRoom',useSQLite:true}},bindings:{MOMO_CHAT_SECRET:secret,MOMO_CHAT_APP_ORIGIN:origin}});
const outbound=[];
const app=new Miniflare({modules:[{type:'ESModule',path:root+'/dist/server/index.js'},...readdirSync(root+'/dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js').map(path=>({type:'ESModule',path:root+'/dist/server/'+path}))],modulesRoot:root+'/dist/server',modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs']}],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{MOMO_PLATFORM:'vercel',HOST_PASSCODE:passcode,MOMO_CHAT_URL:'https://chat.test',MOMO_CHAT_SECRET:secret,MOMO_CHAT_APP_ORIGIN:origin},outboundService:async request=>{
  assert.equal(new URL(request.url).hostname,'chat.test','all network traffic must stay intercepted');
  assert.equal(request.headers.get('authorization'),'Bearer '+secret);
  const body=await request.text();outbound.push(JSON.parse(body));
  return chat.dispatchFetch(request.url,{method:request.method,headers:request.headers,body});
}});
const hash=value=>createHash('sha256').update(value).digest('hex');
const token='a'.repeat(64),userId='m_'+hash('member:'+token).slice(0,32),cookie='momo_sid='+token;
async function call(path,body,seatCookie=cookie,requestOrigin=origin){
  const response=await app.dispatchFetch(origin+path,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',...(seatCookie?{Cookie:seatCookie}:{}),'oai-authenticated-user-id':'forged-host','oai-authenticated-user-email':'host@example.test'},body:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
}
try{
  for(const mf of [app,chat]){
    const db=await mf.getD1Database('DB');for(const file of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync(root+'/drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
    await db.prepare('INSERT INTO profiles(id,nickname,created) VALUES(?,?,1)').bind(userId,'Cookie member').run();
  }
  assert.equal((await call('/api/chat',{room:'weekend'},null)).status,401,'forged identity headers cannot replace a device cookie');
  assert.equal((await call('/api/chat',{room:'weekend'},cookie,'https://outsider.test')).status,403);
  const opened=await call('/api/chat',{room:'weekend',userId:'forged',admin:true});
  assert.equal(opened.status,200);assert.equal(opened.data.enabled,true);assert.equal(opened.data.url,'wss://chat.test/connect');
  const claims=await verifyChatTicket(secret,opened.data.ticket,origin);assert.equal(claims.userId,userId);assert.equal(claims.admin,false);
  assert(!JSON.stringify(opened.data).includes(secret));
  const db=await chat.getD1Database('DB'),wish=randomUUID(),room='w_'+wish;
  await db.prepare("INSERT INTO wishes(id,user_id,title,when_text,area,spots,status,created) VALUES(?,'other','Local test','Test','Test',2,'open',1)").bind(wish).run();
  assert.equal((await call('/api/chat',{room,admin:true})).status,403,'browser role must not grant gang host access');
  assert.equal((await call('/api/chat',{room},cookie+'; momo_host='+'0'.repeat(64))).status,403,'forged host cookie must not grant access');
  const hostCookie=cookie+'; momo_host='+hash('host:'+passcode+':'+token);
  const host=await call('/api/chat',{room},hostCookie);assert.equal(host.status,200);
  assert.equal((await verifyChatTicket(secret,host.data.ticket,origin)).admin,true);
  const sent=await call('/api/community',{action:'message',room:'weekend',body:'Native route note',clientId:randomUUID(),userId:'forged',admin:true});
  assert.equal(sent.status,200);assert.equal((await db.prepare("SELECT user_id FROM messages WHERE body='Native route note'").first()).user_id,userId);
  assert(outbound.every(seat=>seat.userId===userId));
  console.log('PASS built device routes derive ticket/send identity and host role from cookies, deny forged headers/roles and keep the shared secret private');
}finally{await app.dispose();await chat.dispose()}
