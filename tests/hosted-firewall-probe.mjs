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
const timings=[],statuses=[];
for(let i=0;i<attempts;i++){
  const url=new URL('/api/community',base);url.searchParams.set('firewallProbe',probe);url.searchParams.set('n',String(i));
  const started=performance.now();
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'},redirect:'manual',signal:AbortSignal.timeout(15000)});
  timings.push(performance.now()-started);statuses.push(response.status);
  await response.arrayBuffer();
}
const allowed=statuses.filter(x=>x>=200&&x<400).length,limited=statuses.filter(x=>x===429).length,other=statuses.filter(x=>!(x>=200&&x<400)&&x!==429);
assert(allowed>0,'Preview did not allow any normal request.');
assert(limited>0,`Expected at least one 429 after ${attempts} requests for a configured ${limit}-request window; statuses=${JSON.stringify(statuses)}`);
assert.equal(other.length,0,`Unexpected non-2xx/non-429 responses: ${JSON.stringify(other)}`);
const allowedTimings=timings.filter((_,i)=>statuses[i]>=200&&statuses[i]<400).sort((a,b)=>a-b);
const percentile=p=>Math.round(allowedTimings[Math.min(allowedTimings.length-1,Math.floor(allowedTimings.length*p))]||0);
console.log('PASS disposable Vercel firewall rate limit',JSON.stringify({attempts,allowed,limited,p50Ms:percentile(.5),p95Ms:percentile(.95),productionDataTouched:false}));
