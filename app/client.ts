import {solveSeatChallenge} from './seat-challenge';
export async function api<T=unknown>(action:string,data:Record<string,unknown>={}):Promise<T>{const r=await fetch('/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});const d=await r.json().catch(()=>({})) as T&{error?:string};if(!r.ok)throw Error(d.error||'Please try again.');return d}
export async function session(action:'start'|'signout'|'host',data:Record<string,unknown>={}){
  const send=async(body:Record<string,unknown>)=>{
    const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body})});
    const d=await r.json().catch(()=>({})) as {error?:string;turnstileSiteKey?:string};
    return {r,d};
  };
  let {r,d}=await send(data);
  if(action==='start'&&r.status===428&&d.turnstileSiteKey){
    const turnstileToken=await solveSeatChallenge(d.turnstileSiteKey);
    ({r,d}=await send({...data,turnstileToken}));
  }
  if(!r.ok)throw Error(d.error||'Please try again.');
  return d;
}
export type Run=(fn:()=>Promise<void>)=>Promise<void>;
