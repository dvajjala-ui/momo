// Sends exactly one redacted verification event to the configured optional
// Axiom sink. It does not call the Momo app, D1, R2 or participant APIs.
import assert from 'node:assert/strict';
import {securityEvent,securitySinkSettings} from '../lib/ops-log.mjs';

if(process.env.MOMO_SECURITY_SINK_DISPOSABLE!=='yes-send-one-redacted-event'){
  throw Error('Refusing security sink probe without MOMO_SECURITY_SINK_DISPOSABLE=yes-send-one-redacted-event');
}
const settings={
  MOMO_SECURITY_AXIOM_ENABLED:process.env.MOMO_SECURITY_AXIOM_ENABLED,
  MOMO_SECURITY_AXIOM_DOMAIN:process.env.MOMO_SECURITY_AXIOM_DOMAIN,
  MOMO_SECURITY_AXIOM_DATASET:process.env.MOMO_SECURITY_AXIOM_DATASET,
  MOMO_SECURITY_AXIOM_TOKEN:process.env.MOMO_SECURITY_AXIOM_TOKEN,
};
const sink=securitySinkSettings(settings);
assert(sink.enabled&&sink.ready,'Axiom security sink settings are not ready.');
const marker='probe-'+crypto.randomUUID();
const request=new Request(`https://momo-security-probe.invalid/verify?marker=${encodeURIComponent(marker)}&secret=must-not-leak`,{headers:{
  Cookie:'momo_sid=must-not-leak',Authorization:'Bearer must-not-leak','x-forwarded-for':'203.0.113.10','x-vercel-id':'probe::safe_trace'
}});
const record=await securityEvent(request,'security_sink_probe',200,settings);
assert.equal(record.event,'security_sink_probe');assert.equal(record.path,'/verify');assert.equal(record.trace,'probe::safe_trace');
const serialized=JSON.stringify(record);for(const value of [marker,'must-not-leak','203.0.113.10'])assert(!serialized.includes(value),`Probe record leaked ${value}`);
console.log('PASS sent one redacted security_sink_probe event; verify it in the configured dataset',JSON.stringify({dataset:sink.dataset,domain:sink.domain}));
