import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(realpathSync(new URL('../node_modules/wrangler/package.json',import.meta.url)));
const {buildSync}=require('esbuild');
const root=fileURLToPath(new URL('..',import.meta.url));mkdirSync(root+'/work/tests',{recursive:true});
buildSync({entryPoints:[root+'/lib/chat-live.ts'],outfile:root+'/work/tests/chat-live.mjs',bundle:true,format:'esm',platform:'browser'});
const {createChatLive}=await import('../work/tests/chat-live.mjs');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
class Socket{
  readyState=0;sent=[];
  open(){this.readyState=1;this.onopen?.()}
  message(value){this.onmessage?.({data:JSON.stringify(value)})}
  send(value){this.sent.push(JSON.parse(value))}
  close(code=1000){this.readyState=3;this.onclose?.({code})}
}
const snapshots=[],errors=[],sockets=[],writes=[];
let finishPoll,offline=false;
const live=createChatLive('weekend',messages=>snapshots.push(messages),e=>errors.push(e),{
  hidden:()=>false,
  socket:()=>{const socket=new Socket();sockets.push(socket);return socket},
  request:async(url,init)=>{
    if(url==='/api/chat')return Response.json({enabled:true,url:'wss://chat.test/connect',ticket:'disposable-ticket'});
    if(init?.method==='POST'){writes.push(JSON.parse(init.body));return Response.json({ok:true})}
    if(offline)throw Error('local offline probe');
    return new Promise(resolve=>{finishPoll=resolve});
  },
});
try{
  await tick();const socket=sockets[0];socket.open();
  socket.message({type:'history',messages:[]});
  const send=live.send('One note');const id=socket.sent[0].clientId;
  socket.message({type:'message',message:{id:'m1',body:'One note',created:1,nickname:'Chai',avatar:0,mine:true}});
  socket.message({type:'ack',clientId:id,ok:true});await send;
  assert.equal(snapshots.at(-1).length,1);
  offline=true;await live.reload();offline=false;
  assert.equal(snapshots.at(-1).length,1,'temporary offline refresh must preserve already received notes');
  const refresh=live.reload();
  socket.message({type:'message',message:{id:'m2',body:'During refresh',created:2,nickname:'Momo',avatar:1,mine:false}});
  finishPoll(Response.json({messages:[snapshots[1][0]]}));await refresh;
  assert.equal(snapshots.at(-1).at(-1).id,'m2','late history must preserve a newer live message');
  const uncertain=live.send('Retry the same note');const retryId=socket.sent.at(-1).clientId;
  const rejected=assert.rejects(uncertain,/Could not confirm/);socket.close();await rejected;
  finishPoll(Response.json({messages:[]}));await tick();
  const retry=live.send('Retry the same note');await tick();finishPoll(Response.json({messages:[]}));await retry;
  assert.equal(writes.at(-1).clientId,retryId,'HTTP retry after a socket drop must keep its idempotency key');
  live.dispose();const count=snapshots.length;
  socket.message({type:'message',message:{id:'private-late',body:'Must not show',created:99}});
  assert.equal(snapshots.length,count);
  console.log('PASS live merge, acknowledgements, uncertain-send retry IDs and disposed socket isolation');
}finally{live.dispose()}

let finishTicket,signal,opened=0;
const old=createChatLive('d_'+'a'.repeat(32),()=>assert.fail('late private room data'),()=>assert.fail('late private room error'),{
  hidden:()=>false,socket:()=>{opened++;return new Socket()},request:async(_url,init)=>{signal=init.signal;return new Promise(resolve=>{finishTicket=resolve})},
});
old.dispose();assert.equal(signal.aborted,true);finishTicket(Response.json({enabled:true,url:'wss://chat.test/connect',ticket:'old-ticket'}));await tick();assert.equal(opened,0);
console.log('PASS disposal aborts ticket fetch and cannot open an old private-room socket');

const revokedSnapshots=[],revokedErrors=[];let revokedSocket;
const revoked=createChatLive('food',m=>revokedSnapshots.push(m),e=>revokedErrors.push(e),{
  hidden:()=>false,request:async()=>Response.json({enabled:true,url:'wss://chat.test/connect',ticket:'ticket'}),socket:()=>revokedSocket=new Socket(),
});
try{
  await tick();revokedSocket.open();revokedSocket.message({type:'history',messages:[{id:'old'}]});revokedSocket.message({type:'revoked'});
  revokedSocket.message({type:'message',message:{id:'must-not-show',created:1}});
  assert.deepEqual(revokedSnapshots.at(-1),[]);assert.match(revokedErrors[0],/no longer available/);
  await assert.rejects(revoked.send('After revocation'),/no longer available/);
  console.log('PASS explicit revocation clears the conversation and stops further sends/delivery');
}finally{revoked.dispose()}
