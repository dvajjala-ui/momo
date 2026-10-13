// Two independent Next processes, one disposable local SQLite database.
// This proves cross-instance app behavior; it is not hosted D1/R2 evidence.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'momo-next-instances-'));
const origins=['http://localhost:4319','http://localhost:4320'];
const environment={...process.env,MOMO_TARGET:'next',MOMO_SQLITE_PATH:join(directory,'test.sqlite'),HOST_PASSCODE:'disposable-next-host-passcode'};
// Never inherit production storage or outbound provider configuration.
for(const key of Object.keys(environment))if(/^(CLOUDFLARE_|R2_|TURSO_|LIBSQL_|MOMO_DB_|MOMO_CHAT_|WHATSAPP_|GMAIL_|SMTP_|EMAIL_|VERCEL)/.test(key))delete environment[key];
const children=[];
const sessions=[];
let output='';
async function request(session,instance,path,data){
  const headers={Origin:origins[instance],...(session.cookie?{Cookie:session.cookie}:{})};
  if(data)headers['Content-Type']='application/json';
  const response=await fetch(origins[instance]+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined});
  const cookies=response.headers.getSetCookie().map(x=>x.split(';')[0]);
  if(cookies.length)session.cookie=[...session.cookie.split('; ').filter(Boolean).filter(x=>!cookies.some(c=>c.split('=')[0]===x.split('=')[0])),...cookies].join('; ');
  return {status:response.status,body:await response.json()};
}
async function member(name,instance){
  const session={cookie:''};sessions.push(session);
  const started=await request(session,instance,'/api/session',{action:'start'});
  assert.equal(started.status,200,JSON.stringify(started.body));
  assert.equal((await request(session,instance,'/api/community',{action:'profile',nickname:name,age:25,gender:'Test profile',avatar:1,rules:true})).status,200);
  return session;
}
try{
  for(let i=0;i<2;i++){
    const child=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(4319+i)],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});
    children.push(child);child.stdout.on('data',x=>{output+=x});child.stderr.on('data',x=>{output+=x});
    const deadline=Date.now()+60000;
    while(true){
      if(child.exitCode!==null)throw Error('Next exited: '+output);
      try{if((await fetch(origins[i]+'/api/community',{signal:AbortSignal.timeout(2000)})).status===200)break}catch{}
      if(Date.now()>deadline)throw Error('Next startup timed out: '+output);
      await new Promise(resolve=>setTimeout(resolve,250));
    }
  }
  const a=await member('Instance QA A',0),b=await member('Instance QA B',1),outsider=await member('Instance QA outsider',1);
  assert.equal((await request(a,0,'/api/community?view=me')).body.storage,'local');
  const wish=await request(a,0,'/api/community',{action:'wish',title:'Disposable instance wish',whenText:'Test only',area:'Test only',spots:2});
  assert.equal(wish.status,200);
  assert.equal((await request(b,1,'/api/community',{action:'joinWish',id:wish.body.id})).status,200);
  const home=await request(a,0,'/api/community?view=home');
  assert.equal(home.body.wishes.find(w=>w.id===wish.body.id).status,'ready');
  const room='w_'+wish.body.id;
  assert.equal((await request(b,1,'/api/community',{action:'message',room,body:'Cross-instance test message'})).status,200);
  assert.equal((await request(a,0,'/api/community?view=chat&room='+room)).body.messages[0].body,'Cross-instance test message');
  assert.equal((await request(outsider,1,'/api/community?view=chat&room='+room)).status,403);
  assert.equal((await request(outsider,0,'/api/community?view=host')).status,403);
  console.log('PASS wish capacity, gang messages and access controls across independent Next instances');
  const host=await member('Instance QA Host',0);
  assert.equal((await request(host,1,'/api/session',{action:'host',username:'momo',passcode:environment.HOST_PASSCODE})).status,200);
  const directory=await request(host,0,'/api/admin?view=members&q=Instance%20QA%20B');
  assert.equal(directory.status,200);
  assert.equal(directory.body.total,1);
  const memberId=directory.body.members[0].id;
  assert.equal((await request(host,1,'/api/admin',{action:'memberStatus',userId:memberId,status:'queued',reason:'Disposable instance check'})).status,200);
  assert.equal((await request(b,0,'/api/community?view=notices')).body.status,'queued');
  assert.equal((await request(b,0,'/api/community',{action:'message',room:'weekend',body:'Blocked while queued'})).status,403);
  assert.equal((await request(host,0,'/api/admin',{action:'hostMessage',userId:memberId,body:'Disposable private note'})).status,200);
  assert.equal((await request(b,1,'/api/community?view=notices')).body.messages[0].body,'Disposable private note');
  assert.equal((await request(host,1,'/api/admin',{action:'memberStatus',userId:memberId,status:'suspended',reason:'Disposable moderation check'})).status,200);
  assert.equal((await request(b,0,'/api/community?view=chat&room='+room)).status,403);
  assert.equal((await request(host,0,'/api/admin',{action:'memberStatus',userId:memberId,status:'active'})).status,200);
  assert.equal((await request(b,1,'/api/community?view=chat&room='+room)).status,200);
  console.log('PASS host queue, private notice, suspension and restoration across instances');
  for(const session of sessions)assert.equal((await request(session,1,'/api/community',{action:'deleteAccount'})).status,200);
  const after=await request({cookie:''},0,'/api/community?view=home');
  assert.equal(after.body.wishes.some(w=>w.id===wish.body.id),false);
  console.log('PASS deletion on the second instance is visible on the first');
}finally{
  for(const child of children){if(child.exitCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}}
  await rm(directory,{recursive:true,force:true});
}
