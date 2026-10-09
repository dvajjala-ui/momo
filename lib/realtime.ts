import {env} from 'cloudflare:workers';
import {signChatTicket} from './chat-ticket.mjs';

type Config={origin:string;appOrigin:string;secret:string};
export function chatConfig(settings:Record<string,string|undefined>=env as unknown as Record<string,string|undefined>):Config|null{
  if(!settings.MOMO_CHAT_URL&&!settings.MOMO_CHAT_SECRET&&!settings.MOMO_CHAT_APP_ORIGIN)return null;
  const secret=settings.MOMO_CHAT_SECRET?.trim()||'';
  try{
    const worker=new URL(settings.MOMO_CHAT_URL||''),app=new URL(settings.MOMO_CHAT_APP_ORIGIN||'');
    if([worker,app].some(u=>u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)||secret.length<32)throw Error();
    return {origin:worker.origin,appOrigin:app.origin,secret};
  }catch{throw Error('Chat settings are incomplete. Refusing temporary transport fallback.')}
}

type Seat={userId:string;admin:boolean;room:string};
export async function roomTicket(config:Config,seat:Seat){
  return {url:config.origin.replace('https:','wss:')+'/connect',ticket:await signChatTicket(config.secret,{v:1,...seat,origin:config.appOrigin,expires:Date.now()+30000})};
}

export async function chatRequest(config:Config,path:'access'|'history'|'send',seat:Seat&{body?:string;clientId?:string}){
  // No write retries. The caller retains its message ID for a reviewed retry.
  const response=await fetch(config.origin+'/v1/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.secret},body:JSON.stringify(seat),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const result=await response.json() as {error?:string;messages?:unknown[];ok?:boolean;id?:string};
  return {result,status:response.status};
}
