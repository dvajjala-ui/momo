import {env} from 'cloudflare:workers';
import {db,json,sameOrigin,readBounded} from '../../../lib/momo-server';
import {sha256,newToken,rawSessionToken,sessionToken,sessionCookie,seatProofCookie,hostCookie,hostProof,clearCookies} from '../../../lib/device-session';
import {seatChallengeSettings,verifySeatChallenge} from '../../../lib/seat-turnstile';
import {seatProof} from '../../../lib/seat-proof';

function withCookies(data:unknown,status:number,cookies:string[]){const r=json(data,status);for(const c of cookies)r.headers.append('Set-Cookie',c);return r}

export async function POST(req:Request){try{
  if(!sameOrigin(req))return json({error:'Please use this site.'},403);
  const b=JSON.parse(new TextDecoder().decode(await readBounded(req,2000))||'{}') as Record<string,unknown>;
  const secure=new URL(req.url).protocol==='https:';
  const current=await sessionToken();
  if(b.action==='start'){
    if(current)return json({ok:true});
    const settings=env as unknown as Record<string,string|undefined>;
    const challenge=seatChallengeSettings(settings);
    if(challenge.enabled){
      if(!challenge.ready)return json({error:'Seat verification is temporarily unavailable.'},503);
      if(!b.turnstileToken)return json({error:'Verify your seat first.',turnstileSiteKey:challenge.siteKey},428);
      if(!await verifySeatChallenge(b.turnstileToken,new URL(req.url).hostname,settings))return json({error:'Seat verification did not pass. Please try again.'},403);
      const token=await rawSessionToken()||newToken();
      return withCookies({ok:true},200,[sessionCookie(token,secure),seatProofCookie(await seatProof(token,challenge.signingSecret),secure)]);
    }
    return withCookies({ok:true},200,[sessionCookie(newToken(),secure)]);
  }
  if(b.action==='signout')return withCookies({ok:true},200,clearCookies(secure));
  if(b.action==='host'){
    if(!current)return json({error:'Open a device seat before host login.'},403);
    const settings=env as unknown as Record<string,string|undefined>;
    const expected=String(settings.HOST_PASSCODE||'');
    const expectedUsername=String(settings.ADMIN_USERNAME||'momo');
    if(expected.length<12)return json({error:'Host access is not set up yet. Add a HOST_PASSCODE (12+ characters) in the deployment settings.'},403);
    const suppliedUsername=typeof b.username==='string'?b.username.trim():'';
    const suppliedPasscode=typeof b.passcode==='string'?b.passcode:'';
    const limitId=await sha256('host-login:'+current),now=Date.now();
    await db().prepare('INSERT INTO host_login_limits(id,window_start,attempts) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END,attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END').bind(limitId,now,now-600000,now-600000).run();
    const limit=await db().prepare('SELECT attempts FROM host_login_limits WHERE id=?').bind(limitId).first<{attempts:number}>();
    if(Number(limit?.attempts)>6){await new Promise(r=>setTimeout(r,900));return json({error:'Too many host login attempts. Wait ten minutes before trying again.'},429)}
    const [usernameHash,expectedUsernameHash,passcodeHash,expectedHash]=await Promise.all([sha256(suppliedUsername),sha256(expectedUsername),sha256(suppliedPasscode),sha256(expected)]);
    let difference=0;
    for(let i=0;i<64;i++)difference|=(usernameHash.charCodeAt(i)^expectedUsernameHash.charCodeAt(i))|(passcodeHash.charCodeAt(i)^expectedHash.charCodeAt(i));
    if(difference){await new Promise(r=>setTimeout(r,900));return json({error:'Username or passcode did not match.'},403)}
    const token=current||newToken();
    await db().prepare('DELETE FROM host_login_limits WHERE id=?').bind(limitId).run();
    return withCookies({ok:true},200,[...(current?[]:[sessionCookie(token,secure)]),hostCookie(await hostProof(token,expected),secure)]);
  }
  return json({error:'Unknown action.'},400);
}catch{return json({error:'We could not open your seat right now. Please try again.'},400)}}
