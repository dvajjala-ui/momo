const EVENTS=new Set(['cross_origin_mutation_block','seat_challenge_failed','host_login_rate_limited','host_login_failed','admin_access_denied']);
const NOISY_EVENTS=new Set(['cross_origin_mutation_block','admin_access_denied']);
const recentSink=new Map();
let warnedInvalidSink=false;
const safeTrace=value=>typeof value==='string'&&value.length<=96&&/^[A-Za-z0-9:._-]+$/.test(value)?value:null;

export function securitySinkSettings(settings={}){
  if(settings.MOMO_SECURITY_AXIOM_ENABLED!=='true')return {enabled:false};
  const domain=String(settings.MOMO_SECURITY_AXIOM_DOMAIN||'').trim().toLowerCase();
  const dataset=String(settings.MOMO_SECURITY_AXIOM_DATASET||'').trim();
  const token=String(settings.MOMO_SECURITY_AXIOM_TOKEN||'').trim();
  const domainOk=domain.length<=180&&/^[a-z0-9.-]+\.edge\.axiom\.co$/.test(domain)&&!domain.includes('..');
  const datasetOk=/^[A-Za-z0-9._-]{1,128}$/.test(dataset);
  return {enabled:true,ready:domainOk&&datasetOk&&token.length>=16,domain,dataset,token};
}

function securityRecord(req,event,status,now){
  let path='/';
  try{path=new URL(req.url).pathname}catch{}
  const trace=safeTrace(req.headers?.get?.('cf-ray'))||safeTrace(req.headers?.get?.('x-vercel-id'));
  return {scope:'momo-security',event:EVENTS.has(event)?event:'security_event',status:Number(status)||0,path,trace,at:new Date(now).toISOString()};
}

function shouldSend(record,now){
  if(!NOISY_EVENTS.has(record.event))return true;
  const key=record.event+':'+record.path,last=recentSink.get(key)||0;
  if(now-last<60000)return false;
  recentSink.set(key,now);return true;
}

// Machine-readable security events. Console output and the optional external
// sink deliberately exclude query strings, IPs, cookies, auth headers, member
// IDs and user text. The sink is best effort: observability must never become
// an authentication dependency or a new SSRF primitive.
export async function securityEvent(req,event,status,settings={},transport=fetch,now=Date.now()){
  const record=securityRecord(req,event,status,now);
  console.warn(JSON.stringify(record));
  const sink=securitySinkSettings(settings);
  if(!sink.enabled)return record;
  if(!sink.ready){
    if(!warnedInvalidSink){warnedInvalidSink=true;console.error(JSON.stringify({scope:'momo-security-sink',event:'configuration_invalid',status:0,at:new Date(now).toISOString()}))}
    return record;
  }
  if(!shouldSend(record,now))return record;
  try{
    const response=await transport(`https://${sink.domain}/v1/ingest/${encodeURIComponent(sink.dataset)}`,{
      method:'POST',headers:{Authorization:'Bearer '+sink.token,'Content-Type':'application/json'},
      body:JSON.stringify([record]),cache:'no-store',signal:AbortSignal.timeout(750),
    });
    if(!response.ok)console.error(JSON.stringify({scope:'momo-security-sink',event:'delivery_failed',status:response.status,at:new Date(now).toISOString()}));
  }catch{console.error(JSON.stringify({scope:'momo-security-sink',event:'delivery_failed',status:0,at:new Date(now).toISOString()}))}
  return record;
}
