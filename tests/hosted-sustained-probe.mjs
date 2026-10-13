// Disposable hosted D1/Durable Object probe. Never point this at production.
// Default: 100 sockets, 18 rounds over at least 153 seconds, renewed leases,
// one fully disconnected delivery recovered from history, and retry deduplication.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {signChatTicket} from '../lib/chat-ticket.mjs';

function disposableOrigin(value,kind){
  let url;try{url=new URL(value)}catch{throw Error('Set a disposable readiness Worker origin.')}
  const pattern=new RegExp('^momo-readiness-'+kind+'-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\\.workers\\.dev$');
  const match=url.hostname.match(pattern);
  if(url.protocol!=='https:'||!match||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Only exact https://momo-readiness-{db,chat}-<id>.<account>.workers.dev origins are allowed.');
  return {url,account:match[1]};
}
function credential(name){const value=process.env[name];if(typeof value!=='string'||value.length<32||value.length>512||value.trim()!==value)throw Error('Set a private '+name+' credential of 32–512 characters.');return value}
function integer(name,fallback,min,max){const value=Number(process.env[name]??fallback);if(!Number.isInteger(value)||value<min||value>max)throw Error(name+' must be an integer from '+min+' to '+max+'.');return value}
const database=disposableOrigin(process.env.MOMO_PROBE_DB_URL,'db');
const chat=disposableOrigin(process.env.MOMO_PROBE_CHAT_URL,'chat');
assert.equal(database.account,chat.account,'Disposable Workers must belong to the same account subdomain');
const dbToken=credential('MOMO_PROBE_DB_TOKEN'),chatSecret=credential('MOMO_PROBE_CHAT_SECRET');
const appOrigin=process.env.MOMO_PROBE_APP_ORIGIN||'http://127.0.0.1:4319';
const parsedOrigin=new URL(appOrigin);
assert.equal(parsedOrigin.origin,appOrigin,'MOMO_PROBE_APP_ORIGIN must be an exact origin without a trailing slash');
assert(!parsedOrigin.username&&!parsedOrigin.password&&['http:','https:'].includes(parsedOrigin.protocol),'Invalid application origin');
const clients=integer('MOMO_PROBE_CLIENTS',100,2,100);
const rounds=integer('MOMO_PROBE_ROUNDS',18,2,30);
const interval=integer('MOMO_PROBE_INTERVAL_MS',9000,1000,10000);
const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'));
const WebSocket=createRequire(require.resolve('miniflare'))('ws');
const prefix='probe_'+randomUUID().replaceAll('-','').slice(0,16);
const ids=Array.from({length:clients},(_,i)=>prefix+'_'+i);
const sockets=new Set(),generations=[],expected=new Map(),fanout=[],acks=[],health=[];
const metrics={gatewayQueryRequests:0,gatewaySqlStatements:0,gatewayReportedChanges:0,gatewayHealthRequests:0,gatewayErrors:0,rowsRead:0,rowsWritten:0,metadataResults:0,sqlDurationMs:0,servedByColo:{},servedByRegion:{},socketConnections:0,socketConnected:0,socketErrors:0,serverErrors:0,unexpectedResponses:0,abnormalCloses:0,leaseRenewals:0,reconnects:0,retryChecks:0,historyRecoveries:0};
const abort=new AbortController();
const timeout=setTimeout(()=>abort.abort(Error('Hosted probe exceeded eight minutes.')),8*60*1000);
const onInterrupt=()=>abort.abort(Error('Hosted probe interrupted; cleaning up disposable records.'));
process.once('SIGINT',onInterrupt);process.once('SIGTERM',onInterrupt);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const quantile=(values,p)=>values.length?Math.round(values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]):null;
const signal=ms=>AbortSignal.any([abort.signal,AbortSignal.timeout(ms)]);
function checkAbort(){abort.signal.throwIfAborted()}
async function query(batch,cleanup=false){
  metrics.gatewayQueryRequests++;metrics.gatewaySqlStatements+=batch.length;
  const response=await fetch(new URL('/v1/query',database.url),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+dbToken,'Content-Type':'application/json'},body:JSON.stringify({batch}),signal:cleanup?AbortSignal.timeout(20000):signal(20000)});
  const body=await response.json();
  if(!response.ok||!body.success||!Array.isArray(body.result)||body.result.some(row=>!row.success)){metrics.gatewayErrors++;throw Error('Disposable D1 query failed: '+response.status)}
  for(const row of body.result){
    const meta=row.meta||{};metrics.gatewayReportedChanges+=Number(meta.changes||0);
    if(Number.isFinite(meta.rows_read)&&Number.isFinite(meta.rows_written)){metrics.metadataResults++;metrics.rowsRead+=meta.rows_read;metrics.rowsWritten+=meta.rows_written}
    if(Number.isFinite(meta.timings?.sql_duration_ms))metrics.sqlDurationMs+=meta.timings.sql_duration_ms;
    for(const [key,bucket] of [['served_by_colo',metrics.servedByColo],['served_by_region',metrics.servedByRegion]])if(meta[key])bucket[meta[key]]=(bucket[meta[key]]||0)+1;
  }
  return body.result;
}
async function until(check,label,states=[],ms=20000){
  const deadline=Date.now()+ms;
  while(true){
    checkAbort();
    for(const state of states){if(state.problem)throw state.problem;if(state.closed&&!state.intentional)throw Error('Socket '+state.index+' closed unexpectedly ('+state.closed.code+').')}
    if(check())return;
    if(Date.now()>=deadline)throw Error(label+' timed out.');
    await sleep(20);
  }
}
async function connect(index){
  checkAbort();
  const ticket=await signChatTicket(chatSecret,{v:1,userId:ids[index],admin:false,room:'weekend',origin:appOrigin,expires:Date.now()+30000});
  const url=new URL('/connect',chat.url);url.protocol='wss:';
  const socket=new WebSocket(url,['momo',ticket],{origin:appOrigin,handshakeTimeout:15000,followRedirects:false});
  // Register before the handshake so even a partially opened batch is cleaned up.
  sockets.add(socket);metrics.socketConnections++;
  const state={socket,index,opened:0,history:null,messages:new Map(),acks:new Map(),closed:null,problem:null,intentional:false};
  generations.push(state);
  socket.once('open',()=>{state.opened=Date.now();metrics.socketConnected++});
  socket.on('error',()=>{if(!state.intentional){metrics.socketErrors++;state.problem=Error('Socket '+index+' transport error.')}});
  socket.once('unexpected-response',(request,response)=>{metrics.unexpectedResponses++;state.problem=Error('Socket '+index+' rejected ('+response.statusCode+').');response.resume();request.destroy();socket.terminate()});
  socket.once('close',(code)=>{state.closed={code};if(!state.intentional&&code!==1000)metrics.abnormalCloses++});
  socket.on('message',bytes=>{
    try{
      const item=JSON.parse(bytes.toString());
      if(item.type==='history'){
        assert.equal(state.history,null,'Unexpected second history frame');
        assert(Array.isArray(item.messages),'Malformed history frame');
        const own=item.messages.filter(message=>typeof message.body==='string'&&message.body.startsWith(prefix+' '));
        state.history=new Map(own.map(message=>[message.id,message]));
        assert.equal(state.history.size,own.length,'History contained duplicate message IDs');
      }else if(item.type==='message'&&typeof item.message?.body==='string'&&item.message.body.startsWith(prefix+' ')){
        const prior=state.messages.get(item.message.id);
        state.messages.set(item.message.id,{count:(prior?.count||0)+1,at:prior?.at??performance.now(),body:item.message.body});
        assert(!prior,'Duplicate live delivery');
      }else if(item.type==='ack'){
        const previous=state.acks.get(item.clientId)||[];previous.push(item);state.acks.set(item.clientId,previous);
        assert.equal(item.status,200,'Send acknowledgement failed');
        assert.equal(item.ok,true,'Missing successful send acknowledgement');
      }else if(['error','revoked'].includes(item.type)){metrics.serverErrors++;throw Error('Unexpected socket '+item.type+' frame.')}
    }catch{state.problem=Error('Socket '+index+' received an invalid, duplicate or failed frame.')}
  });
  await until(()=>state.opened&&state.history!==null,'Socket '+index+' connection/history',[state]);
  for(const [id,body] of expected)assert.equal(state.history.get(id)?.body,body,'Reconnect history missed persisted message '+id);
  return state;
}
async function connectAll(indices){
  const states=[];
  for(let offset=0;offset<indices.length;offset+=25){
    const batch=await Promise.allSettled(indices.slice(offset,offset+25).map(connect));
    const failed=batch.find(result=>result.status==='rejected');if(failed)throw failed.reason;
    states.push(...batch.map(result=>result.value));
  }
  return states;
}
async function closeStates(states){
  for(const state of states){state.intentional=true;state.socket.close(1000,'Disposable probe reconnect')}
  await until(()=>states.every(state=>state.socket.readyState===WebSocket.CLOSED),'Graceful socket close',[],5000);
}
async function sendAndVerify(states,round){
  const sender=states[round%states.length],clientId=randomUUID(),body=prefix+' fanout '+round;
  const started=performance.now();
  sender.socket.send(JSON.stringify({type:'send',clientId,body}));
  await until(()=>sender.acks.has(clientId),'Send acknowledgement',states);
  const ack=sender.acks.get(clientId)[0];
  assert.equal(ack.duplicate,false,'First send unexpectedly deduplicated');
  assert.equal(typeof ack.id,'string');expected.set(ack.id,body);acks.push(performance.now()-started);
  await until(()=>states.every(state=>state.messages.has(ack.id)),'Live fanout',states);
  for(const state of states){const received=state.messages.get(ack.id);assert.equal(received.count,1);assert.equal(received.body,body);fanout.push(received.at-started)}
  if(round===0||round===rounds-1){
    sender.socket.send(JSON.stringify({type:'send',clientId,body}));
    await until(()=>sender.acks.get(clientId)?.length===2,'Retry acknowledgement',states);
    assert.equal(sender.acks.get(clientId)[1].id,ack.id);assert.equal(sender.acks.get(clientId)[1].duplicate,true);
    metrics.retryChecks++;
  }
}
let result,failure,seedAttempted=false;
const cleanupErrors=[];
try{
  for(let offset=0;offset<ids.length;offset+=30){
    // A failed/ambiguous response can still have committed an earlier batch.
    seedAttempted=true;
    await query(ids.slice(offset,offset+30).map(id=>({sql:'INSERT INTO profiles(id,nickname,age,gender,created,dm_opt_in) VALUES(?,?,24,?,?,1)',params:[id,id,'Disposable probe',Date.now()]})));
  }
  let states=await connectAll(ids.map((_,index)=>index));
  const started=performance.now();
  for(let round=0;round<rounds;round++){
    const target=started+round*interval;
    while(performance.now()<target){checkAbort();await sleep(Math.min(100,target-performance.now()))}
    if(round===Math.ceil(rounds/2)){
      await closeStates(states);
      const body=prefix+' sent while disconnected';
      const response=await fetch(new URL('/v1/send',chat.url),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+chatSecret,'Content-Type':'application/json'},body:JSON.stringify({userId:ids[0],admin:false,room:'weekend',clientId:randomUUID(),body}),signal:signal(20000)});
      assert.equal(response.status,200,'Disconnected delivery could not persist');
      const ack=await response.json();assert.equal(ack.ok,true);assert.equal(ack.duplicate,false);assert.equal(typeof ack.id,'string');expected.set(ack.id,body);
      states=await connectAll(ids.map((_,index)=>index));metrics.reconnects+=clients;metrics.historyRecoveries+=clients;
    }
    // Match the app's pre-expiry renewal, keeping each server lease below 60s.
    const expiring=states.filter(state=>Date.now()-state.opened>=50000);
    if(expiring.length){
      await closeStates(expiring);
      for(const renewed of await connectAll(expiring.map(state=>state.index)))states[renewed.index]=renewed;
      metrics.leaseRenewals+=expiring.length;
    }
    await sendAndVerify(states,round);
    if((round+1)%6===0)console.log(JSON.stringify({progress:'fanout',completedRounds:round+1,rounds,clients,leaseRenewals:metrics.leaseRenewals}));
  }
  // Allow a delayed duplicate frame to surface before the final assertion.
  await sleep(500);
  await until(()=>true,'Final socket validation',states);
  const rows=await query([{sql:'SELECT id,body FROM messages WHERE user_id GLOB ?',params:[prefix+'_*']},{sql:'SELECT count(*) AS n FROM chat_send_receipts WHERE user_id GLOB ?',params:[prefix+'_*']}]);
  assert.equal(rows[0].results.length,expected.size,'Persisted message count differs from accepted sends');
  assert.equal(Number(rows[1].results[0].n),expected.size,'Retry receipts differ from accepted sends');
  for(const row of rows[0].results)assert.equal(expected.get(row.id),row.body,'Unexpected persisted probe message');
  for(const state of generations)for(const message of state.messages.values())assert.equal(message.count,1,'Duplicate live delivery');
  for(let i=0;i<30;i++){
    const began=performance.now();metrics.gatewayHealthRequests++;
    const response=await fetch(new URL('/health',database.url),{redirect:'error',headers:{Authorization:'Bearer '+dbToken},signal:signal(10000)});
    assert.equal(response.status,200);assert.equal((await response.json()).ok,true);health.push(performance.now()-began);
  }
  const durationMs=Math.round(performance.now()-started);
  result={result:'PASS',mode:clients===100&&durationMs>=120000&&metrics.leaseRenewals>=clients?'sustained-disposable':'bounded-smoke',clients,rounds,durationMs,persistedMessages:expected.size,liveDeliveries:fanout.length,missedMessages:0,duplicateLiveDeliveries:0,fanoutP50Ms:quantile(fanout,.5),fanoutP95Ms:quantile(fanout,.95),fanoutMaxMs:Math.round(Math.max(...fanout)),ackP95Ms:quantile(acks,.95),gatewayHealthP50Ms:quantile(health,.5),gatewayHealthP95Ms:quantile(health,.95)};
}catch(error){failure=error}finally{
  clearTimeout(timeout);
  for(const state of generations)state.intentional=true;
  for(const socket of sockets)try{if(socket.readyState===WebSocket.OPEN)socket.close(1000,'Disposable probe complete');else if(socket.readyState!==WebSocket.CLOSED)socket.terminate()}catch{cleanupErrors.push('Socket close failed')}
  const closeDeadline=Date.now()+5000;
  while([...sockets].some(socket=>socket.readyState!==WebSocket.CLOSED)&&Date.now()<closeDeadline)await sleep(20);
  const remaining=[...sockets].filter(socket=>socket.readyState!==WebSocket.CLOSED);
  if(remaining.length){cleanupErrors.push(remaining.length+' sockets required forced termination');for(const socket of remaining)socket.terminate()}
  if(seedAttempted){
    try{
      // GLOB uses literal underscores; LIKE would widen this disposable prefix.
      await query(['messages','chat_send_receipts','chat_send_limits','profiles'].map(table=>({sql:'DELETE FROM '+table+' WHERE '+(table==='profiles'?'id':'user_id')+' GLOB ?',params:[prefix+'_*']})),true);
      const remainingRows=await query(['messages','chat_send_receipts','chat_send_limits','profiles'].map(table=>({sql:'SELECT count(*) AS n FROM '+table+' WHERE '+(table==='profiles'?'id':'user_id')+' GLOB ?',params:[prefix+'_*']})),true);
      assert(remainingRows.every(row=>Number(row.results[0].n)===0),'Disposable records remain after cleanup');
    }catch{cleanupErrors.push('D1 cleanup/verification failed for disposable prefix '+prefix)}
  }
  process.removeListener('SIGINT',onInterrupt);process.removeListener('SIGTERM',onInterrupt);
}
if(failure||cleanupErrors.length){
  console.error(JSON.stringify({result:'FAIL',error:failure?.message||'Cleanup failed',cleanupErrors,disposablePrefix:prefix,metrics}));process.exitCode=1;
}else{
  console.log(JSON.stringify({...result,cleanup:'verified',metrics,d1Quota:{scope:'Reported rows cover gateway calls only. Chat/Durable Object D1 queries and account quota headroom require Cloudflare analytics for the same test window.'}}));
}
