import {ChatMessage,createChatPoll} from './chat-poll';

type Options={request?:typeof fetch;socket?:(url:string,protocols:string[])=>WebSocket;hidden?:()=>boolean};
// One lifecycle per room. No socket, ticket request or pending send survives disposal.
export function createChatLive(room:string,receive:(messages:ChatMessage[])=>void,fail:(message:string,clear?:boolean)=>void,options:Options={}){
  const request=options.request||fetch,makeSocket=options.socket||((url,protocols)=>new WebSocket(url,protocols)),hidden=options.hidden||(()=>document.hidden);
  let disposed=false,denied=false,enabled:boolean|undefined,socket:WebSocket|undefined,connecting=false,attempt=0;
  let messages:ChatMessage[]=[],retry:{body:string;id:string}|undefined;
  let revision=0,pollStarted=0,lastHistory=0;
  const duringPoll=new Map<string,ChatMessage>();
  let timer:ReturnType<typeof setTimeout>|undefined,lease:ReturnType<typeof setTimeout>|undefined;
  let pending:{id:string;resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|undefined;
  let ticketController:AbortController|undefined;
  function accept(next:ChatMessage[]){if(disposed)return;messages=next.slice(-80);receive(messages)}
  const poll=createChatPoll(room,next=>{
    if(denied||lastHistory>pollStarted)return;
    const byId=new Map(next.map(m=>[m.id,m]));for(const [id,m] of duringPoll)byId.set(id,m);
    accept([...byId.values()].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id)));
  },(message,status)=>{if(!disposed){const clear=status===401||status===403;if(clear){denied=true;accept([]);socket?.close()}fail(message,clear)}},(url,options)=>{pollStarted=revision;duringPoll.clear();return request(url,options)});
  function rejectSend(){if(pending){clearTimeout(pending.timer);pending.reject(Error('Could not confirm this note. Retry it to check or save it once.'));pending=undefined}}
  function schedule(){if(disposed||denied||enabled===false||hidden())return;clearTimeout(timer);timer=setTimeout(()=>void connect(),Math.min(30000,1000*2**Math.min(attempt++,5))+Math.floor(Math.random()*500))}
  async function connect(){
    if(disposed||denied||connecting||hidden()||socket)return;
    connecting=true;ticketController=new AbortController();const timeout=setTimeout(()=>ticketController?.abort(),10000);
    try{
      const response=await request('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room}),cache:'no-store',signal:ticketController.signal});
      const data=await response.json() as {enabled?:boolean;url?:string;ticket?:string;error?:string};
      if(disposed)return;
      if(!response.ok){if(response.status===401||response.status===403){denied=true;fail(data.error||'This conversation is no longer available.',true);accept([]);return}throw Error('Connection unavailable.')}
      enabled=data.enabled===true;
      if(!enabled){await poll.load();return}
      if(!data.url?.startsWith('wss://')||!data.ticket)throw Error('Connection unavailable.');
      const current=makeSocket(data.url,['momo',data.ticket]);socket=current;
      current.onopen=()=>{
        if(disposed||socket!==current){current.close();return}attempt=0;
        // Fresh server authorization and authoritative bounded history each minute.
        lease=setTimeout(()=>{if(socket===current){socket=undefined;current.close(1000,'Renew seat');rejectSend();void connect()}},55000);
      };
      current.onmessage=event=>{
        if(disposed||denied||socket!==current)return;
        try{
          const b=JSON.parse(String(event.data));
          if(b.type==='revoked'){denied=true;accept([]);rejectSend();fail('This conversation is no longer available to your seat.',true);current.close();return}
          if(b.type==='history'&&Array.isArray(b.messages)){lastHistory=++revision;accept(b.messages)}
          if(b.type==='message'&&b.message?.id){revision++;duringPoll.set(b.message.id,b.message);if(duringPoll.size>80)duringPoll.delete(duringPoll.keys().next().value!);const byId=new Map(messages.map(m=>[m.id,m]));byId.set(b.message.id,b.message);accept([...byId.values()].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id)))}
          if(b.type==='ack'&&pending&&pending.id===b.clientId){const p=pending;pending=undefined;clearTimeout(p.timer);if(b.ok){retry=undefined;p.resolve()}else p.reject(Error(b.error||'Could not save this note.'))}
          if(b.type==='error'){rejectSend();fail(b.error||'Please retry this note.')}
        }catch{rejectSend()}
      };
      current.onclose=event=>{
        if(disposed||socket!==current)return;
        socket=undefined;clearTimeout(lease);rejectSend();
        if(denied)return;
        if(event.code===4403){denied=true;accept([]);fail('This conversation is no longer available to your seat.',true);return}
        void poll.load();schedule();
      };
      current.onerror=()=>current.close();
    }catch{if(!disposed){void poll.load();schedule()}}
    finally{connecting=false;clearTimeout(timeout)}
  }
  const interval=setInterval(()=>{if(!disposed&&!denied&&!hidden()&&socket?.readyState!==1)void poll.load()},5000);
  void connect();
  async function send(body:string){
    if(disposed||denied)throw Error('This conversation is no longer available.');
    if(pending)throw Error('Your previous note is still saving.');
    if(!retry||retry.body!==body)retry={body,id:crypto.randomUUID()};
    const id=retry.id;
    if(socket?.readyState===1){
      await new Promise<void>((resolve,reject)=>{
        pending={id,resolve,reject,timer:setTimeout(()=>rejectSend(),10000)};
        try{socket!.send(JSON.stringify({type:'send',clientId:id,body}))}catch{rejectSend()}
      });
    }else{
      const response=await request('/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'message',room,body,clientId:id}),signal:AbortSignal.timeout(15000)});
      const result=await response.json() as {error?:string};
      if(disposed)return;
      if(!response.ok)throw Error(result.error||'Could not save this note. Please retry it.');
      retry=undefined;await poll.load();
    }
  }
  return {
    send,reload:poll.load,
    visibility(){if(disposed)return;if(hidden()){clearTimeout(timer);clearTimeout(lease);const old=socket;socket=undefined;old?.close();rejectSend()}else{void poll.load();void connect()}},
    dispose(){disposed=true;clearInterval(interval);clearTimeout(timer);clearTimeout(lease);ticketController?.abort();poll.dispose();rejectSend();socket?.close();socket=undefined;messages=[];retry=undefined},
  };
}
