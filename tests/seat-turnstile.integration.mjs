import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {realpathSync,readdirSync} from 'node:fs';
import {seatChallengeSettings,verifySeatChallenge} from '../lib/seat-turnstile.ts';
import {seatProof,equalProof} from '../lib/seat-proof.ts';

const settings={TURNSTILE_ENABLED:'true',TURNSTILE_SITE_KEY:'disposable-local-site-key',TURNSTILE_SECRET_KEY:'disposable-local-secret-123456',MOMO_SEAT_SIGNING_SECRET:'disposable-local-signing-secret-123456789'};
assert.equal(seatChallengeSettings({}).enabled,false);
assert.equal(seatChallengeSettings({...settings,TURNSTILE_SECRET_KEY:''}).ready,false);
assert.equal(seatChallengeSettings({...settings,MOMO_SEAT_SIGNING_SECRET:''}).ready,false);
assert.equal(seatChallengeSettings({...settings,MOMO_SEAT_SIGNING_SECRET:'short'}).ready,false);
assert.equal(seatChallengeSettings(settings).ready,true);
let calls=0;
const transport=async(url,init)=>{
  calls++;
  assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(init.method,'POST');
  assert.deepEqual(JSON.parse(init.body),{secret:settings.TURNSTILE_SECRET_KEY,response:'disposable-token'});
  return Response.json({success:true,hostname:'momo.test',action:'seat'});
};
assert.equal(await verifySeatChallenge('disposable-token','momo.test',settings,transport),true);
assert.equal(await verifySeatChallenge('disposable-token','wrong.test',settings,transport),false);
assert.equal(await verifySeatChallenge('', 'momo.test',settings,transport),false);
assert.equal(await verifySeatChallenge('x'.repeat(2049),'momo.test',settings,transport),false);
assert.equal(calls,2);
for(const result of [
  {success:false,hostname:'momo.test',action:'seat'},
  {success:true,hostname:'momo.test',action:'other'},
  {success:true,hostname:'other.test',action:'seat'},
])assert.equal(await verifySeatChallenge('disposable-token','momo.test',settings,async()=>Response.json(result)),false);
assert.equal(await verifySeatChallenge('disposable-token','momo.test',settings,async()=>{throw Error('offline')}),false);
console.log('PASS seat verification validates the token, action and exact hostname; failures deny');

const token='a'.repeat(64),proof=await seatProof(token,settings.MOMO_SEAT_SIGNING_SECRET);
assert.equal(equalProof(proof,proof),true);
assert.equal(equalProof('b'.repeat(64),proof),false);
assert.notEqual(await seatProof('b'.repeat(64),settings.MOMO_SEAT_SIGNING_SECRET),proof);
console.log('PASS seat cookies require a server HMAC proof tied to the device token');

const root=fileURLToPath(new URL('..',import.meta.url)).replace(/[\\/]$/,'');
const require=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
const mf=new Miniflare({
  modules:[{type:'ESModule',path:root+'/dist/server/index.js'},...readdirSync(root+'/dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js').map(p=>({type:'ESModule',path:root+'/dist/server/'+p}))],
  modulesRoot:root+'/dist/server',modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs']}],
  compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:settings,
});
try{
  const request=async(body,extra={})=>mf.dispatchFetch('https://momo.test/api/session',{method:'POST',headers:{Origin:'https://momo.test','Content-Type':'application/json',...extra},body:JSON.stringify(body)});
  const challenge=await request({action:'start'});
  assert.equal(challenge.status,428);
  assert.equal(challenge.headers.has('set-cookie'),false);
  const publicResult=await challenge.json();
  assert.equal(publicResult.turnstileSiteKey,settings.TURNSTILE_SITE_KEY);
  assert.equal(JSON.stringify(publicResult).includes(settings.TURNSTILE_SECRET_KEY),false);
  assert.equal(JSON.stringify(publicResult).includes(settings.MOMO_SEAT_SIGNING_SECRET),false);
  const forged=await request({action:'start'},{Cookie:'momo_sid='+token});
  assert.equal(forged.status,428);
  assert.equal(forged.headers.has('set-cookie'),false);
  const forgedMe=await mf.dispatchFetch('https://momo.test/api/community?view=me',{headers:{Cookie:'momo_sid='+token}});
  assert.equal(forgedMe.status,401);
  const existing=await request({action:'start'},{Cookie:'momo_sid='+token+'; momo_seat='+proof});
  assert.equal(existing.status,200);
  assert.equal(existing.headers.has('set-cookie'),false);
  console.log('PASS new and forged seats require Turnstile without leaking a cookie or secret; signed seats remain open');
}finally{await mf.dispose()}
