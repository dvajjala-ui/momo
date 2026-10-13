import assert from 'node:assert/strict';
import {securityEvent} from '../lib/ops-log.mjs';

const original=console.warn,lines=[];console.warn=value=>lines.push(String(value));
try{
  const request=new Request('https://momo.test/api/admin?email=secret@example.test&token=top-secret',{headers:{
    Cookie:'momo_sid=super-secret-cookie',Authorization:'Bearer hidden-token','cf-ray':'abc123-AMD','x-forwarded-for':'203.0.113.99'
  }});
  securityEvent(request,'admin_access_denied',403);
  assert.equal(lines.length,1);
  const event=JSON.parse(lines[0]);
  assert.equal(event.scope,'momo-security');assert.equal(event.event,'admin_access_denied');assert.equal(event.status,403);assert.equal(event.path,'/api/admin');assert.equal(event.trace,'abc123-AMD');
  for(const secret of ['secret@example.test','top-secret','super-secret-cookie','hidden-token','203.0.113.99'])assert(!lines[0].includes(secret),`security log leaked ${secret}`);
  assert(!lines[0].includes('?'),'security log included a query string');

  const hostile=new Request('https://momo.test/api/session?passcode=never-log',{headers:{'cf-ray':'bad trace with spaces and secret@example.test'}});
  securityEvent(hostile,'not-an-approved-event',403);
  const fallback=JSON.parse(lines[1]);
  assert.equal(fallback.event,'security_event');assert.equal(fallback.path,'/api/session');assert.equal(fallback.trace,null);assert(!lines[1].includes('never-log'));assert(!lines[1].includes('secret@example.test'));
  console.log('PASS security events omit participant and credential data');
}finally{console.warn=original}
