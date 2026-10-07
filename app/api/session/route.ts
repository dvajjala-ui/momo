import {env} from 'cloudflare:workers';
import {db,json,platform,sameOrigin,readBounded} from '../../../lib/momo-server';
import {sha256,newToken,sessionToken,sessionCookie,clearSessionCookie} from '../../../lib/device-session';

// Device sessions exist only where no trusted sign-in gateway is available.
export async function POST(req:Request){try{
  if(platform()!=='vercel')return json({error:'Not found'},404);
  if(!sameOrigin(req))return json({error:'Please use this site.'},403);
  const b=JSON.parse(new TextDecoder().decode(await readBounded(req,2000))||'{}');
  const secure=new URL(req.url).protocol==='https:';
  const current=await sessionToken();
  const existing=current?await db().prepare('SELECT user_id FROM sessions WHERE token_hash=?').bind(await sha256(current)).first():null;
  async function ensure(){if(existing&&current)return {token:current,fresh:false};const token=newToken();await db().prepare('INSERT INTO sessions(token_hash,user_id,host,created) VALUES(?,?,0,?)').bind(await sha256(token),'m_'+crypto.randomUUID(),Date.now()).run();return {token,fresh:true}}
  if(b.action==='start'){const s=await ensure();return json({ok:true},200,s.fresh?{'Set-Cookie':sessionCookie(s.token,secure)}:{})}
  if(b.action==='signout'){if(current)await db().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(current)).run();return json({ok:true},200,{'Set-Cookie':clearSessionCookie(secure)})}
  if(b.action==='host'){
    const expected=String((env as any).HOST_PASSCODE||'');
    if(expected.length<12)return json({error:'Host access is not set up yet. Add a HOST_PASSCODE (12+ characters) in the deployment settings.'},403);
    const ok=typeof b.passcode==='string'&&(await sha256(b.passcode))===(await sha256(expected));
    if(!ok){await new Promise(r=>setTimeout(r,900));return json({error:'That passcode didn’t match.'},403)}
    const s=await ensure();await db().prepare('UPDATE sessions SET host=1 WHERE token_hash=?').bind(await sha256(s.token)).run();
    return json({ok:true},200,s.fresh?{'Set-Cookie':sessionCookie(s.token,secure)}:{});
  }
  return json({error:'Unknown action.'},400);
}catch{return json({error:'We could not open your seat right now. Please try again.'},400)}}
