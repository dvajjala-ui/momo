type Settings=Record<string,string|undefined>;

export function seatChallengeSettings(settings:Settings){
  if(settings.TURNSTILE_ENABLED!=='true')return {enabled:false as const};
  const siteKey=settings.TURNSTILE_SITE_KEY?.trim()||'';
  const secret=settings.TURNSTILE_SECRET_KEY?.trim()||'';
  const signingSecret=settings.MOMO_SEAT_SIGNING_SECRET?.trim()||'';
  return {enabled:true as const,ready:siteKey.length>=10&&secret.length>=16&&signingSecret.length>=32,siteKey,secret,signingSecret};
}

export async function verifySeatChallenge(token:unknown,hostname:string,settings:Settings,transport:typeof fetch=fetch){
  const config=seatChallengeSettings(settings);
  if(!config.enabled||!config.ready||typeof token!=='string'||!token||token.length>2048)return false;
  try{
    const response=await transport('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({secret:config.secret,response:token}),
      cache:'no-store',
      signal:AbortSignal.timeout(8000),
    });
    if(!response.ok||Number(response.headers.get('content-length')||0)>4096)return false;
    const body=await response.text();
    if(body.length>4096)return false;
    const result=JSON.parse(body) as {success?:unknown;hostname?:unknown;action?:unknown};
    return result.success===true&&result.hostname===hostname&&result.action==='seat';
  }catch{return false}
}
