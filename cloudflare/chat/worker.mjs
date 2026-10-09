import {DurableObject} from 'cloudflare:workers';
import {validRoom,chatAccess,chatHistory,persistChat,chatRecipients,publicMessage} from '../../lib/chat-core.mjs';
import {verifyChatTicket} from '../../lib/chat-ticket.mjs';

const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(request,secret){
  const token=request.headers.get('authorization')||'';
  if(!token.startsWith('Bearer ')||token.length>520)return false;
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(token.slice(7))),crypto.subtle.digest('SHA-256',encoder.encode(secret))]);
  const left=new Uint8Array(a),right=new Uint8Array(b);let diff=0;for(let i=0;i<32;i++)diff|=left[i]^right[i];return !diff;
}
async function readJson(request){
  const reader=request.body?.getReader();if(!reader)throw Error('Invalid request.');
  let text='',size=0;const decoder=new TextDecoder();
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw Error('Invalid request.')}text+=decoder.decode(value,{stream:true})}
  return JSON.parse(text+decoder.decode());
}
const seatValid=seat=>seat&&typeof seat.userId==='string'&&seat.userId.length>0&&seat.userId.length<=150&&typeof seat.admin==='boolean'&&validRoom(seat.room);

const worker={
  async fetch(request,env){
    try{
      const secret=env.MOMO_CHAT_SECRET,origin=env.MOMO_CHAT_APP_ORIGIN;
      if(typeof secret!=='string'||secret.length<32||!origin||!env.DB||!env.ROOMS)return reply({error:'Chat is unavailable.'},503);
      const url=new URL(request.url);let seat;
      if(url.pathname==='/connect'&&request.headers.get('upgrade')?.toLowerCase()==='websocket'){
        if(request.headers.get('origin')!==origin)return reply({error:'Access denied.'},403);
        const protocols=(request.headers.get('sec-websocket-protocol')||'').split(',').map(x=>x.trim());
        if(protocols.length!==2||protocols[0]!=='momo')return reply({error:'Access denied.'},401);
        seat=await verifyChatTicket(secret,protocols[1],origin);
        if(!seatValid(seat))return reply({error:'Access denied.'},401);
      }else{
        if(!await authorized(request,secret))return reply({error:'Access denied.'},401);
        if(request.method!=='POST'||!['/v1/access','/v1/history','/v1/send'].includes(url.pathname))return reply({error:'Not found.'},404);
        seat=await readJson(request);if(!seatValid(seat))return reply({error:'Invalid request.'},400);
      }
      const stub=env.ROOMS.get(env.ROOMS.idFromName(seat.room));
      // Never forward browser-supplied identity headers to the object.
      return await stub.fetch(new Request('https://room.internal'+url.pathname,{method:url.pathname==='/connect'?'GET':'POST',
        headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json',...(url.pathname==='/connect'?{Upgrade:'websocket','x-momo-seat':JSON.stringify(seat)}:{})},
        body:url.pathname==='/connect'?undefined:JSON.stringify(seat)}));
    }catch{return reply({error:'Chat is temporarily unavailable.'},503)}
  },
};
export default worker;

export class ChatRoom extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.queue=Promise.resolve();this.pending=0}
  serial(work){this.pending++;const next=this.queue.then(work);this.queue=next.catch(()=>{});return next.finally(()=>this.pending--)}
  async fetch(request){
    if(!await authorized(request,this.env.MOMO_CHAT_SECRET))return reply({error:'Access denied.'},401);
    try{
      const path=new URL(request.url).pathname;
      const seat=path==='/connect'?JSON.parse(request.headers.get('x-momo-seat')||'null'):await readJson(request);
      if(!seatValid(seat))return reply({error:'Invalid request.'},400);
      if(path==='/connect'){
        if(seat.expires<=Date.now()||!await chatAccess(this.env.DB,seat.room,seat.userId,seat.admin))return reply({error:'This conversation is not available.'},403);
        const sockets=this.ctx.getWebSockets().filter(ws=>{if(ws.deserializeAttachment().expires<=Date.now()){ws.close(4401,'Renew your seat.');return false}return true});
        if(sockets.length>=1000||sockets.filter(ws=>ws.deserializeAttachment()?.userId===seat.userId).length>=2)return reply({error:'Too many open connections.'},429);
        const history=await chatHistory(this.env.DB,seat.room,seat.userId,seat.admin);
        if(!history)return reply({error:'This conversation is not available.'},403);
        const [client,server]=Object.values(new WebSocketPair());
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({...seat,expires:Date.now()+60000,frames:0,window:Date.now()});
        server.send(JSON.stringify({type:'history',messages:history}));
        return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'momo'}});
      }
      if(path==='/v1/history'){
        const history=await chatHistory(this.env.DB,seat.room,seat.userId,seat.admin);
        return history?reply({messages:history}):reply({error:'This conversation is no longer available.'},403);
      }
      if(path==='/v1/access')return await chatAccess(this.env.DB,seat.room,seat.userId,seat.admin)?reply({allowed:true}):reply({error:'This conversation is no longer available.'},403);
      if(path==='/v1/send'){
        if(this.pending>=1024)return reply({error:'This table is busy. Please retry your note in a moment.'},429);
        return await this.serial(async()=>{const result=await this.send(seat);return reply(result,result.status)});
      }
      return reply({error:'Not found.'},404);
    }catch{return reply({error:'Chat is temporarily unavailable.'},503)}
  }
  async send(seat){
    const result=await persistChat(this.env.DB,seat);
    if(result.message&&!result.duplicate){
      // Persistence is authoritative. A broadcast error must not turn a saved
      // message into a failed send; reconnect/history recovers missed delivery.
      try{
        const sockets=this.ctx.getWebSockets();
        const active=sockets.filter(ws=>{const s=ws.deserializeAttachment();if(s.expires<=Date.now()){ws.close(4401,'Renew your seat.');return false}return true});
        const seats=active.map(ws=>ws.deserializeAttachment());
        const {allowed,eligible}=await chatRecipients(this.env.DB,seat.room,seats,seat.userId);
        for(const ws of active){const s=ws.deserializeAttachment();
          if(!allowed.has(s.userId)){
            // A public-room block hides the sender without closing the room.
            if(!eligible.has(s.userId)){
              ws.send(JSON.stringify({type:'revoked'}));
              ws.close(4403,'This conversation is no longer available.');
            }
            continue;
          }
          try{ws.send(JSON.stringify({type:'message',message:publicMessage(result.message,s.userId)}))}catch{ws.close(1011,'Reconnect to the table.')}
        }
      }catch{}
    }
    return {status:result.status,...(result.error?{error:result.error}:{ok:true,id:result.id,duplicate:!!result.duplicate})};
  }
  async webSocketMessage(ws,frame){
    const seat=ws.deserializeAttachment();
    if(seat.expires<=Date.now()){ws.close(4401,'Renew your seat.');return}
    const now=Date.now();if(seat.window<=now-10000){seat.window=now;seat.frames=0}seat.frames++;ws.serializeAttachment(seat);
    if(seat.frames>60||typeof frame!=='string'||frame.length>4096){ws.close(1008,'Please slow down.');return}
    let b;try{b=JSON.parse(frame)}catch{ws.close(1008,'Invalid message.');return}
    if(b.type!=='send'){ws.close(1008,'Invalid message.');return}
    if(this.pending>=1024){ws.send(JSON.stringify({type:'ack',clientId:b.clientId,status:429,error:'This table is busy. Please retry your note in a moment.'}));return}
    await this.serial(async()=>{
      try{
        if(seat.expires<=Date.now()){ws.close(4401,'Renew your seat.');return}
        const result=await this.send({...seat,clientId:b.clientId,body:b.body});
        ws.send(JSON.stringify({type:'ack',clientId:b.clientId,...result}));
        if(result.status===403)ws.close(4403,'This conversation is no longer available.');
      }catch{try{ws.send(JSON.stringify({type:'error',error:'Could not save this note. Please retry it.'}))}catch{}}
    });
  }
  webSocketClose(ws,code,reason){ws.close(code,reason)}
  webSocketError(ws){ws.close(1011,'Reconnect to the table.')}
}
