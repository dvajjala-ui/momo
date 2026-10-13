// Read-only probe for a disposable Vercel preview with a WAF rate-limit rule.
// It refuses the known production hostname and never creates/mutates participant data.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

if(process.env.MOMO_FIREWALL_TEST_DISPOSABLE!=='yes-rate-limit-preview'){
  throw Error('Refusing firewall probe without MOMO_FIREWALL_TEST_DISPOSABLE=yes-rate-limit-preview');
}
const raw=process.env.MOMO_FIREWALL_TEST_URL;if(!raw)throw Error('Missing MOMO_FIREWALL_TEST_URL');
const base=new URL(raw);
if(base.protocol!=='https:')throw Error('Firewall probe requires HTTPS.');
if(base.hostname==='momo-ten-pied.vercel.app')throw Error('Refusing firewall probe against the known production site.');
const limit=Number(process.env.MOMO_FIREWALL_TEST_LIMIT||120);
if(!Number.isInteger(limit)||limit<5||limit>500)throw Error('MOMO_FIREWALL_TEST_LIMIT must be 5-500.');
const attempts=Math.min(500,limit+10),probe=randomUUID();
const concurrency=Number(process.env.MOMO_FIREWALL_TEST_CONCURRENCY||6);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>10)throw Error('Firewall concurrency must be 1-10.');
const timings=[],statuses=[],mitigations=[];
let next=0;
const recoveryDeadline=Date.now()+6*60*1000;
while(true){
  const baseline=await fetch(new URL('/api/community',base),{redirect:'manual',signal:AbortSignal.timeout(15000)});
  await baseline.arrayBuffer();
  if(baseline.status>=200&&baseline.status<300)break;
  if(baseline.status===403&&baseline.headers.get('x-vercel-mitigated')==='deny'&&Date.now()<recoveryDeadline){
    await new Promise(resolve=>setTimeout(resolve,5000));continue;
  }
  throw Error('Preview baseline must reach the app with HTTP 2xx, not a login redirect or existing mitigation: '+baseline.status);
}
// A fixed window can reset midway through an otherwise valid burst. Start just
// after a minute boundary so the configured 60-second policy is tested reliably.
if(process.env.MOMO_FIREWALL_TEST_ALIGN_WINDOW!=='false'){
  const wait=60000-Date.now()%60000+500;
  console.log('Waiting for a fresh fixed rate-limit window.');
  await new Promise(resolve=>setTimeout(resolve,wait));
}
const burstStarted=performance.now();
async function visit(i){
  const url=new URL('/api/community',base);url.searchParams.set('firewallProbe',probe);url.searchParams.set('n',String(i));
  const started=performance.now();
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'},redirect:'manual',signal:AbortSignal.timeout(15000)});
  timings[i]=performance.now()-started;statuses[i]=response.status;
  mitigations[i]=response.headers.get('x-vercel-mitigated');
  await response.arrayBuffer();
}
// Sequential app requests can span multiple windows and never cross the budget.
// Keep the read-only burst bounded while allowing it to finish within one window.
await Promise.all(Array.from({length:concurrency},async()=>{while(next<attempts){const index=next++;await visit(index)}}));
const elapsedMs=Math.round(performance.now()-burstStarted);
const allowed=statuses.filter(x=>x>=200&&x<300).length,limited=statuses.filter(x=>x===429).length;
// Vercel returns 429 at the threshold and then 403/deny for the persistent block.
// An arbitrary authentication 403 or redirect is never counted as mitigation.
const denied=statuses.filter((status,index)=>status===403&&mitigations[index]==='deny').length;
const other=statuses.filter((status,index)=>!(status>=200&&status<300)&&status!==429&&!(status===403&&mitigations[index]==='deny'));
console.log('Firewall burst observations',JSON.stringify({attempts,concurrency,elapsedMs,allowed,limited,denied,statusCounts:Object.fromEntries([...new Set(statuses)].map(status=>[status,statuses.filter(value=>value===status).length]))}));
assert(allowed>0,'Preview did not allow any normal request.');
assert(limited>0,`Expected at least one 429 after ${attempts} requests for a configured ${limit}-request window; statuses=${JSON.stringify(statuses)}`);
assert.equal(other.length,0,`Unexpected non-2xx/non-429 responses: ${JSON.stringify(other)}`);
const allowedTimings=timings.filter((_,i)=>statuses[i]>=200&&statuses[i]<400).sort((a,b)=>a-b);
const percentile=p=>Math.round(allowedTimings[Math.min(allowedTimings.length-1,Math.floor(allowedTimings.length*p))]||0);
console.log('PASS disposable Vercel firewall rate limit',JSON.stringify({attempts,concurrency,elapsedMs,allowed,limited,denied,p50Ms:percentile(.5),p95Ms:percentile(.95),productionDataTouched:false}));
