import assert from 'node:assert/strict';
import {securityEvent,securitySinkSettings} from '../lib/ops-log.mjs';

const originalWarn=console.warn,originalError=console.error,lines=[],errors=[];console.warn=value=>lines.push(String(value));console.error=value=>errors.push(String(value));
try{
  const request=new Request('https://momo.test/api/admin?email=secret@example.test&token=top-secret',{headers:{
    Cookie:'momo_sid=super-secret-cookie',Authorization:'Bearer hidden-token','cf-ray':'abc123-AMD','x-forwarded-for':'203.0.113.99'
  }});
  await securityEvent(request,'admin_access_denied',403,{},fetch,100000);
  assert.equal(lines.length,1);
  const event=JSON.parse(lines[0]);
  assert.equal(event.scope,'momo-security');assert.equal(event.event,'admin_access_denied');assert.equal(event.status,403);assert.equal(event.path,'/api/admin');assert.equal(event.trace,'abc123-AMD');
  for(const secret of ['secret@example.test','top-secret','super-secret-cookie','hidden-token','203.0.113.99'])assert(!lines[0].includes(secret),`security log leaked ${secret}`);
  assert(!lines[0].includes('?'),'security log included a query string');

  const hostile=new Request('https://momo.test/api/session?passcode=never-log',{headers:{'cf-ray':'bad trace with spaces and secret@example.test'}});
  await securityEvent(hostile,'not-an-approved-event',403,{},fetch,101000);
  const fallback=JSON.parse(lines[1]);
  assert.equal(fallback.event,'security_event');assert.equal(fallback.path,'/api/session');assert.equal(fallback.trace,null);assert(!lines[1].includes('never-log'));assert(!lines[1].includes('secret@example.test'));

  assert.equal(securitySinkSettings({MOMO_SECURITY_AXIOM_ENABLED:'true',MOMO_SECURITY_AXIOM_DOMAIN:'evil.example',MOMO_SECURITY_AXIOM_DATASET:'momo',MOMO_SECURITY_AXIOM_TOKEN:'1234567890123456'}).ready,false);
  const settings={MOMO_SECURITY_AXIOM_ENABLED:'true',MOMO_SECURITY_AXIOM_DOMAIN:'us-east-1.aws.edge.axiom.co',MOMO_SECURITY_AXIOM_DATASET:'momo-security',MOMO_SECURITY_AXIOM_TOKEN:'ingest-only-token-123456'};
  const calls=[];
  const transport=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({ingested:1}),{status:200,headers:{'Content-Type':'application/json'}})};
  const sinkRequest=new Request('https://momo.test/api/session?password=must-not-leak',{headers:{Cookie:'momo_sid=hidden','x-vercel-id':'iad1::safe_trace'}});
  await securityEvent(sinkRequest,'host_login_failed',403,settings,transport,120000);
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://us-east-1.aws.edge.axiom.co/v1/ingest/momo-security');
  assert.equal(calls[0].options.headers.Authorization,'Bearer ingest-only-token-123456');
  const payload=JSON.parse(calls[0].options.body);assert.equal(payload.length,1);assert.equal(payload[0].event,'host_login_failed');assert.equal(payload[0].path,'/api/session');assert.equal(payload[0].trace,'iad1::safe_trace');
  const serialized=JSON.stringify(payload);for(const secret of ['must-not-leak','momo_sid','hidden','ingest-only-token-123456'])assert(!serialized.includes(secret),`security sink payload leaked ${secret}`);

  const noisyCalls=[];const noisyTransport=async(url,options)=>{noisyCalls.push({url,options});return new Response('{}',{status:200})};
  await securityEvent(new Request('https://momo.test/api/admin'), 'admin_access_denied',403,settings,noisyTransport,200000);
  await securityEvent(new Request('https://momo.test/api/admin'), 'admin_access_denied',403,settings,noisyTransport,200500);
  await securityEvent(new Request('https://momo.test/api/admin'), 'admin_access_denied',403,settings,noisyTransport,261000);
  assert.equal(noisyCalls.length,2,'noisy sink events should be capped to one per path/event per minute per instance');
  assert.equal(errors.length,0,'healthy sink should not emit delivery errors');
  console.log('PASS security events and optional sink omit participant and credential data');
}finally{console.warn=originalWarn;console.error=originalError}
