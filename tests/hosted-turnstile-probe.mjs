// Hosted Turnstile backend probe. A real challenge token must be supplied from
// the same disposable preview hostname. The script refuses the known production
// site and never weakens/verifies through a test-mode bypass.
import assert from 'node:assert/strict';

if(process.env.MOMO_TURNSTILE_TEST_DISPOSABLE!=='yes-verify-preview-seat'){
  throw Error('Refusing Turnstile probe without MOMO_TURNSTILE_TEST_DISPOSABLE=yes-verify-preview-seat');
}
const raw=process.env.MOMO_HOSTED_TEST_APP_URL;if(!raw)throw Error('Missing MOMO_HOSTED_TEST_APP_URL');
const token=process.env.MOMO_HOSTED_TURNSTILE_TOKEN;if(!token)throw Error('Missing MOMO_HOSTED_TURNSTILE_TOKEN from the disposable preview challenge.');
const app=new URL(raw);
if(app.protocol!=='https:')throw Error('Turnstile probe requires HTTPS.');
if(app.hostname==='momo-ten-pied.vercel.app')throw Error('Refusing Turnstile probe against the known production site.');

class Session{
  constructor(){this.cookies=new Map()}
  absorb(headers){
    const raw=typeof headers.getSetCookie==='function'?headers.getSetCookie():(headers.get('set-cookie')?[headers.get('set-cookie')]:[]);
    for(const line of raw){const first=line.split(';',1)[0],at=first.indexOf('=');if(at<1)continue;const name=first.slice(0,at),value=first.slice(at+1);if(value)this.cookies.set(name,value);else this.cookies.delete(name)}
  }
  header(){return [...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}
  async post(body){
    const headers={'Content-Type':'application/json',Origin:app.origin};const cookie=this.header();if(cookie)headers.Cookie=cookie;
    const response=await fetch(new URL('/api/session',app),{method:'POST',headers,body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)});
    this.absorb(response.headers);const text=await response.text();return {status:response.status,data:text?JSON.parse(text):{}};
  }
}
async function me(cookie=''){
  const headers={};if(cookie)headers.Cookie=cookie;
  const response=await fetch(new URL('/api/community?view=me',app),{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
  const text=await response.text();return {status:response.status,data:text?JSON.parse(text):{}};
}

const fresh=new Session();
const challenge=await fresh.post({action:'start'});
assert.equal(challenge.status,428,`Expected Turnstile challenge, got ${challenge.status}: ${JSON.stringify(challenge.data)}`);
assert.equal(challenge.data.error,'Verify your seat first.');assert.equal(typeof challenge.data.turnstileSiteKey,'string');assert(challenge.data.turnstileSiteKey.length>=10);
assert.equal(fresh.cookies.has('momo_sid'),false,'Challenge response must not create a session cookie.');
console.log('PASS new disposable seat is challenge-gated');

const accepted=await fresh.post({action:'start',turnstileToken:token});
assert.equal(accepted.status,200,`Valid preview token failed: ${JSON.stringify(accepted.data)}`);
assert(fresh.cookies.get('momo_sid'),'Verified seat cookie missing');assert(fresh.cookies.get('momo_seat'),'Signed seat proof cookie missing');
assert.equal((await me(fresh.header())).status,200,'Verified signed seat could not reach member API');
console.log('PASS real Siteverify result creates a signed disposable seat');

const replay=new Session();const replayed=await replay.post({action:'start',turnstileToken:token});
assert.equal(replayed.status,403,`Replayed token unexpectedly succeeded: ${JSON.stringify(replayed.data)}`);
assert.equal(replay.cookies.has('momo_sid'),false,'Replayed token created a session cookie');
console.log('PASS Turnstile token replay is rejected');

const forged='momo_sid='+'a'.repeat(64);
assert.equal((await me(forged)).status,401,'Unsigned forged momo_sid reached member APIs while Turnstile is enabled');
console.log('PASS forged unsigned seat cookie is rejected');

await fresh.post({action:'signout'}).catch(()=>{});
console.log('PASS disposable hosted Turnstile verification',JSON.stringify({host:app.hostname,productionDataTouched:false}));
