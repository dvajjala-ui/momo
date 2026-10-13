const EVENTS=new Set(['cross_origin_mutation_block','host_login_rate_limited','host_login_failed','admin_access_denied']);
const safeTrace=value=>typeof value==='string'&&value.length<=96&&/^[A-Za-z0-9:._-]+$/.test(value)?value:null;

// Machine-readable security events for Vercel/Worker log drains. Deliberately
// excludes query strings, IPs, cookies, auth headers, member IDs and user text.
export function securityEvent(req,event,status){
  let path='/';
  try{path=new URL(req.url).pathname}catch{}
  const trace=safeTrace(req.headers?.get?.('cf-ray'))||safeTrace(req.headers?.get?.('x-vercel-id'));
  console.warn(JSON.stringify({scope:'momo-security',event:EVENTS.has(event)?event:'security_event',status:Number(status)||0,path,trace,at:new Date().toISOString()}));
}
