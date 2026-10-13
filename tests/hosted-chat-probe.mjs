// Explicit disposable-hosted probe only. It refuses the known production URLs and
// deletes only rows created with its unique probe prefix.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {signChatTicket} from '../lib/chat-ticket.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const wranglerRequire=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'));
const NodeWebSocket=createRequire(wranglerRequire.resolve('miniflare'))('ws');
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

const telemetry={
  gateway:{requests:0,errors:0,networkMs:[],rowsRead:0,rowsWritten:0,changes:0,durationReportedTotal:0,sqlDurationMsTotal:0,servedByColo:{},servedByRegion:{},servedByPrimary:0},
  websocket:{connectAttempts:0,connectSuccesses:0,errors:0,unexpectedResponses:0,closes:0,abnormalCloses:0,serverErrors:0},
  reconnect:{attempted:0,succeeded:0,historyRecovered:0},
  delivery:{expected:clients,received:0,duplicates:0},
};
const addBucket=(bucket,key)=>{if(key)bucket[key]=(bucket[key]||0)+1};
const percentile=(values,p)=>values.length?values[Math.min(values.length-1,Math.max(0,Math.ceil(values.length*p)-1))]:null;
const latencySummary=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return {
    p50Ms:sorted.length?Math.round(percentile(sorted,.5)):null,
    p95Ms:sorted.length?Math.round(percentile(sorted,.95)):null,
    maxMs:sorted.length?Math.round(sorted.at(-1)):null,
  };
};
function collectD1Meta(meta={}){
  if(Number.isFinite(meta.rows_read))telemetry.gateway.rowsRead+=meta.rows_read;
  if(Number.isFinite(meta.rows_written))telemetry.gateway.rowsWritten+=meta.rows_written;
  if(Number.isFinite(meta.changes))telemetry.gateway.changes+=meta.changes;
  if(Number.isFinite(meta.duration))telemetry.gateway.durationReportedTotal+=meta.duration;
  if(Number.isFinite(meta.timings?.sql_duration_ms))telemetry.gateway.sqlDurationMsTotal+=meta.timings.sql_duration_ms;
  addBucket(telemetry.gateway.servedByColo,meta.served_by_colo);
  addBucket(telemetry.gateway.servedByRegion,meta.served_by_region);
  if(meta.served_by_primary===true)telemetry.gateway.servedByPrimary++;
}
async function query(sql,params=[]){
  telemetry.gateway.requests++;
  const started=performance.now();
  try{
    const response=await fetch(new URL('/v1/query',dbUrl),{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+dbToken},
      body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(15000),
    });
    telemetry.gateway.networkMs.push(performance.now()-started);
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.success!==true){telemetry.gateway.errors++;throw Error(`Gateway query failed (${response.status})`)}
    const result=body.result?.[0]||{results:[],meta:{changes:0}};
    collectD1Meta(result.meta);
    return result;
  }catch(error){
    if(telemetry.gateway.networkMs.length<telemetry.gateway.requests)telemetry.gateway.networkMs.push(performance.now()-started);
    if(!String(error?.message||'').startsWith('Gateway query failed'))telemetry.gateway.errors++;
    throw error;
  }
}
function waitFor(check,timeout=15000){return new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(check()){clearInterval(timer);resolve()}else if(Date.now()-started>timeout){clearInterval(timer);reject(Error('Timed out waiting for hosted probe event.'))}},25)})}
async function ticket(userId,room='food'){
  return signChatTicket(chatSecret,{v:1,userId,admin:false,room,origin,expires:Date.now()+30000});
}
async function connect(userId,room='food'){
  telemetry.websocket.connectAttempts++;
  const url=new URL('/connect',chatUrl);url.protocol='wss:';
  const ws=new NodeWebSocket(url,['momo',await ticket(userId,room)],{origin});
  const received=[];
  ws.on('message',data=>{
    const event=JSON.parse(data.toString());
    received.push(event);
    if(event.type==='error')telemetry.websocket.serverErrors++;
  });
  ws.on('error',()=>{telemetry.websocket.errors++});
  ws.on('close',code=>{
    telemetry.websocket.closes++;
    if(code!==1000)telemetry.websocket.abnormalCloses++;
  });
  await new Promise((resolve,reject)=>{
    ws.once('open',()=>{telemetry.websocket.connectSuccesses++;resolve()});
    ws.once('error',reject);
    ws.once('unexpected-response',(_req,res)=>{telemetry.websocket.unexpectedResponses++;reject(Error(`Hosted chat rejected ${res.statusCode}`))});
  });
  return {ws,received};
}

const runId=randomUUID().replaceAll('-','').slice(0,16),prefix=`probe-${runId}-`,room='food';
const ids=Array.from({length:clients},(_,index)=>prefix+index);
const sockets=[];
let latencies=[];
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

  const body=`Hosted fanout ${runId}`,clientId=randomUUID(),started=performance.now();
  for(const client of sockets)client.ws.on('message',data=>{
    const event=JSON.parse(data.toString());
    if(event.type==='message'&&event.message?.body===body)latencies.push(performance.now()-started);
  });
  sockets[0].ws.send(JSON.stringify({type:'send',clientId,body}));
  await waitFor(()=>latencies.length>=clients);
  await new Promise(resolve=>setTimeout(resolve,200));
  telemetry.delivery.received=latencies.length;
  telemetry.delivery.duplicates=Math.max(0,latencies.length-clients);
  assert.equal(sockets.filter(client=>client.received.some(event=>event.type==='ack'&&event.clientId===clientId)).length,1);
  assert.equal(telemetry.delivery.duplicates,0,'Hosted chat delivered duplicate copies.');
  assert(sockets.every(client=>client.received.filter(event=>event.type==='message'&&event.message?.body===body).length===1));

  const reconnectCount=Math.min(10,clients),reconnected=[];
  telemetry.reconnect.attempted=reconnectCount;
  for(let i=0;i<reconnectCount;i++)sockets[i].ws.close(1000,'Reconnect probe');
  await new Promise(resolve=>setTimeout(resolve,150));
  for(let i=0;i<reconnectCount;i++){
    const client=await connect(ids[i],room);
    reconnected.push(client);
    telemetry.reconnect.succeeded++;
  }
  sockets.push(...reconnected);
  await waitFor(()=>reconnected.every(client=>client.received.some(event=>event.type==='history'&&event.messages?.some(message=>message.body===body))));
  telemetry.reconnect.historyRecovered=reconnected.filter(client=>client.received.some(event=>event.type==='history'&&event.messages?.some(message=>message.body===body))).length;

  console.log('PASS disposable hosted chat probe',JSON.stringify({
    clients,
    delivery:{...telemetry.delivery,...latencySummary(latencies)},
    reconnect:telemetry.reconnect,
    websocket:telemetry.websocket,
    d1:{
      requests:telemetry.gateway.requests,
      errors:telemetry.gateway.errors,
      network:latencySummary(telemetry.gateway.networkMs),
      rowsRead:telemetry.gateway.rowsRead,
      rowsWritten:telemetry.gateway.rowsWritten,
      changes:telemetry.gateway.changes,
      durationReportedTotal:telemetry.gateway.durationReportedTotal,
      sqlDurationMsTotal:telemetry.gateway.sqlDurationMsTotal,
      servedByColo:telemetry.gateway.servedByColo,
      servedByRegion:telemetry.gateway.servedByRegion,
      servedByPrimary:telemetry.gateway.servedByPrimary,
    },
    durableObjectProviderMetrics:'Collect namespace request/error, CPU and memory/overload metrics from Cloudflare for the same test window; those provider metrics are not visible to this client probe.',
  }));
}catch(error){
  telemetry.delivery.received=latencies.length;
  telemetry.delivery.duplicates=Math.max(0,latencies.length-clients);
  console.error('FAIL disposable hosted chat probe',JSON.stringify({
    clients,
    error:String(error?.message||error),
    delivery:{...telemetry.delivery,...latencySummary(latencies)},
    reconnect:telemetry.reconnect,
    websocket:telemetry.websocket,
    d1:{requests:telemetry.gateway.requests,errors:telemetry.gateway.errors,network:latencySummary(telemetry.gateway.networkMs),rowsRead:telemetry.gateway.rowsRead,rowsWritten:telemetry.gateway.rowsWritten,changes:telemetry.gateway.changes,durationReportedTotal:telemetry.gateway.durationReportedTotal,sqlDurationMsTotal:telemetry.gateway.sqlDurationMsTotal,servedByColo:telemetry.gateway.servedByColo,servedByRegion:telemetry.gateway.servedByRegion,servedByPrimary:telemetry.gateway.servedByPrimary},
  }));
  throw error;
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
