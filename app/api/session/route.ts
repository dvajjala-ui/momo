import {env} from 'cloudflare:workers';
import {json,platform,sameOrigin,readBounded} from '../../../lib/momo-server';
import {sha256,newToken,sessionToken,sessionCookie,hostCookie,hostProof,clearCookies} from '../../../lib/device-session';

function withCookies(data:any,status:number,cookies:string[]){const r=json(data,status);for(const c of cookies)r.headers.append('Set-Cookie',c);return r}

// Device sessions exist only where no trusted sign-in gateway is available.
export async function POST(req:Request){try{
  if(platform()!=='vercel')return json({error:'Not found'},404);
  if(!sameOrigin(req))return json({error:'Please use this site.'},403);
  const b=JSON.parse(new TextDecoder().decode(await readBounded(req,2000))||'{}');
  const secure=new URL(req.url).protocol==='https:';
  const current=await sessionToken();
  if(b.action==='start')return current?json({ok:true}):withCookies({ok:true},200,[sessionCookie(newToken(),secure)]);
  if(b.action==='signout')return withCookies({ok:true},200,clearCookies(secure));
  if(b.action==='host'){
    const expected=String((env as any).HOST_PASSCODE||'');
    const expectedUsername=String((env as any).ADMIN_USERNAME||'momo');
    if(expected.length<12)return json({error:'Host access is not set up yet. Add a HOST_PASSCODE (12+ characters) in the deployment settings.'},403);
    const suppliedUsername=typeof b.username==='string'?b.username.trim():'';
    const suppliedPasscode=typeof b.passcode==='string'?b.passcode:'';
    const [usernameHash,expectedUsernameHash,passcodeHash,expectedHash]=await Promise.all([sha256(suppliedUsername),sha256(expectedUsername),sha256(suppliedPasscode),sha256(expected)]);
    let difference=0;
    for(let i=0;i<64;i++)difference|=(usernameHash.charCodeAt(i)^expectedUsernameHash.charCodeAt(i))|(passcodeHash.charCodeAt(i)^expectedHash.charCodeAt(i));
    if(difference){await new Promise(r=>setTimeout(r,900));return json({error:'Username or passcode did not match.'},403)}
    const token=current||newToken();
    return withCookies({ok:true},200,[...(current?[]:[sessionCookie(token,secure)]),hostCookie(await hostProof(token,expected),secure)]);
  }
  return json({error:'Unknown action.'},400);
}catch{return json({error:'We could not open your seat right now. Please try again.'},400)}}
