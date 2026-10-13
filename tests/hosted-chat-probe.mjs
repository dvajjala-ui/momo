// Explicit disposable-hosted probe only. It refuses the known production URLs and
// deletes only rows created with its unique probe prefix.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {signChatTicket} from '../lib/chat-ticket.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'));
const NodeWebSocket=require('ws');
const required=name=>{const value=process.env[name];if(!value)throw Error(`Missing ${name}`);return value};

if(process.env.MOMO_HOSTED_TEST_DISPOSABLE!=='yes-delete-only-probe-rows'){
  throw Error('Refusing hosted probe without MOMO_HOSTED_TEST_DISPOSABLE=yes-delete-only-probe-rows');
}
const dbUrl=new URL(required('MOMO_HOSTED_TEST_DB_URL'));
const dbToken=required('MOMO_HOSTED_TEST_DB_TOKEN');
const chatUrl=new URL(required('MOMO_HOSTED_TEST_CHAT_URL'));
const chatSecret=required('MOMO_HOSTED_TEST_CHAT_SECRET');
const origin=new URL(required('MOMO_HOSTED_TEST_ORIGIN')).origin;
const productionHosts=new Set(['momo-db-gateway.contact-dwarkesh.workers.dev','momo-chat.contact-dwarkesh.workers.dev']);
if(productionHosts.has(dbUrl.hostname)||productionHosts.has(chatUrl.hostname)||origin==='https://momo-ten-pied.vercel.app'){
  throw Error('Refusing to run the disposable hosted probe against the known production environment.');
}
if(dbUrl.protocol!=='https:'||chatUrl.protocol!=='https:')throw Error('Hosted probe URLs must use HTTPS.');
const clients=Number(process.env.MOMO_HOSTED_TEST_CLIENTS||25);
if(!Number.isInteger(clients)||clients<2||clients>200)throw Error('MOMO_HOSTED_TEST_CLIENTS must be 2-200.');

async function query(sql,params=[]){
  const response=await fetch(new URL('/v1/query',dbUrl),{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+dbToken},
    body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(15000),
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok||body.success!==true)throw Error(`Gateway query failed (${response.status})`);
  return body.result?.[0]||{results:[],meta:{changes:0}};
}
function percentile(values,p){return values[Math.min(values.length-1,Math.floor(values.length*p))]}
function waitFor(check,timeout=15000){return new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(check()){clearInterval(timer);resolve()}else if(Date.now()-started>timeout){clearInterval(timer);reject(Error('Timed out waiting for hosted probe event.'))}},25)})}
async function ticket(userId,room='food'){
  return signChatTicket(chatSecret,{v:1,userId,admin:false,room,origin,expires:Date.now()+30000});
}
async function connect(userId,room='food'){
  const url=new URL('/connect',chatUrl);url.protocol='wss:';
  const ws=new NodeWebSocket(url,['momo',await ticket(userId,room)],{origin});
  const received=[];ws.on('message',data=>received.push(JSON.parse(data.toString())));
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);ws.once('unexpected-response',(_req,res)=>reject(Error(`Hosted chat rejected ${res.statusCode}`)))});
  return {ws,received};
}

const runId=randomUUID().replaceAll('-','').slice(0,16),prefix=`probe-${runId}-`,room='food';
const ids=Array.from({length:clients},(_,index)=>prefix+index);
const sockets=[];
try{
  for(let start=0;start<ids.length;start+=40){
    const batch=ids.slice(start,start+40);
    for(const [offset,id] of batch.entries()){
      await query('INSERT INTO profiles(id,nickname,avatar,age,gender,created) VALUES(?,?,0,24,?,?)',[id,`Probe ${start+offset}`,'Disposable probe',Date.now()]);
    }
  }

  for(let start=0;start<ids.length;start+=20){
    const opened=await Promise.all(ids.slice(start,start+20).map(id=>connect(id,room)));
    sockets.push(...opened);
  }
  await waitFor(()=>sockets.every(client=>client.received.some(event=>event.type==='history')));

  const body=`Hosted fanout ${runId}`,clientId=randomUUID(),started=performance.now(),latencies=[];
  for(const client of sockets)client.ws.on('message',data=>{
    const event=JSON.parse(data.toString());
    if(event.type==='message'&&event.message?.body===body)latencies.push(performance.now()-started);
  });
  sockets[0].ws.send(JSON.stringify({type:'send',clientId,body}));
  await waitFor(()=>latencies.length===clients);
  latencies.sort((a,b)=>a-b);
  assert.equal(sockets.filter(client=>client.received.some(event=>event.type==='ack'&&event.clientId===clientId)).length,1);
  assert(sockets.every(client=>client.received.filter(event=>event.type==='message'&&event.message?.body===body).length===1));

  const reconnectCount=Math.min(10,clients),reconnected=[];
  for(let i=0;i<reconnectCount;i++)sockets[i].ws.close(1000,'Reconnect probe');
  await new Promise(resolve=>setTimeout(resolve,150));
  for(let i=0;i<reconnectCount;i++)reconnected.push(await connect(ids[i],room));
  sockets.push(...reconnected);
  await waitFor(()=>reconnected.every(client=>client.received.some(event=>event.type==='history'&&event.messages?.some(message=>message.body===body))));

  console.log('PASS disposable hosted chat probe',JSON.stringify({
    clients,reconnected:reconnectCount,
    p50Ms:Math.round(percentile(latencies,.5)),p95Ms:Math.round(percentile(latencies,.95)),maxMs:Math.round(latencies.at(-1)),
    messageCopies:latencies.length,
  }));
}finally{
  for(const client of sockets)try{client.ws.close(1000,'Probe cleanup')}catch{}
  const like=prefix+'%';
  for(const [sql,params] of [
    ['DELETE FROM messages WHERE user_id LIKE ?',[like]],
    ['DELETE FROM chat_send_receipts WHERE user_id LIKE ?',[like]],
    ['DELETE FROM chat_send_limits WHERE user_id LIKE ?',[like]],
    ['DELETE FROM blocks WHERE user_id LIKE ? OR blocked_id LIKE ?',[like,like]],
    ['DELETE FROM member_controls WHERE user_id LIKE ?',[like]],
    ['DELETE FROM profiles WHERE id LIKE ?',[like]],
  ]){
    try{await query(sql,params)}catch(error){console.error('Probe cleanup warning:',error.message)}
  }
}
