// Disposable hosted end-to-end probe for the public app + host controls.
// It refuses the known production deployment and uses only normal HTTP APIs.
// Run this only against an isolated preview/database where test data may be deleted.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';

const required=name=>{const value=process.env[name];if(!value)throw Error(`Missing ${name}`);return value};
if(process.env.MOMO_HOSTED_LIFECYCLE_DISPOSABLE!=='yes-delete-probe-data'){
  throw Error('Refusing hosted lifecycle probe without MOMO_HOSTED_LIFECYCLE_DISPOSABLE=yes-delete-probe-data');
}
const app=new URL(required('MOMO_HOSTED_TEST_APP_URL'));
const hostPasscode=required('MOMO_HOSTED_TEST_HOST_PASSCODE');
const hostUsername=process.env.MOMO_HOSTED_TEST_ADMIN_USERNAME||'momo';
const turnstileTokens=(process.env.MOMO_HOSTED_TURNSTILE_TOKENS||'').split(/[\r\n,]+/).map(value=>value.trim()).filter(Boolean);
let turnstileTokenIndex=0;
if(app.protocol!=='https:')throw Error('Hosted lifecycle probe requires an HTTPS preview URL.');
if(app.origin==='https://momo-ten-pied.vercel.app'||app.hostname==='momo-ten-pied.vercel.app'){
  throw Error('Refusing to run the disposable lifecycle probe against the known production site.');
}
if(hostPasscode.length<12)throw Error('Disposable host passcode must be at least 12 characters.');

const runId=randomUUID().replaceAll('-','').slice(0,12);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const memberIdFor=token=>'m_'+sha256('member:'+token).slice(0,32);

class BrowserSession{
  constructor(label){this.label=label;this.cookies=new Map()}
  cookieHeader(){return [...this.cookies].map(([name,value])=>`${name}=${value}`).join('; ')}
  absorb(headers){
    const list=typeof headers.getSetCookie==='function'?headers.getSetCookie():[];
    const raw=list.length?list:(headers.get('set-cookie')?[headers.get('set-cookie')]:[]);
    for(const line of raw){
      if(!line)continue;
      const first=line.split(';',1)[0],index=first.indexOf('=');
      if(index<1)continue;
      const name=first.slice(0,index).trim(),value=first.slice(index+1).trim();
      if(!value)this.cookies.delete(name);else this.cookies.set(name,value);
    }
  }
  async request(path,{method='GET',body}={}){
    const url=new URL(path,app);
    const headers={Origin:app.origin};
    if(body!==undefined)headers['Content-Type']='application/json';
    const cookie=this.cookieHeader();if(cookie)headers.Cookie=cookie;
    const response=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(20000)});
    this.absorb(response.headers);
    const text=await response.text(),data=text?JSON.parse(text):{};
    return {status:response.status,data,headers:response.headers};
  }
  post(path,body){return this.request(path,{method:'POST',body})}
  memberId(){const token=this.cookies.get('momo_sid');return token?memberIdFor(token):null}
}

const expect=(name,result,status)=>{
  assert.equal(result.status,status,`${name}: expected ${status}, got ${result.status}: ${JSON.stringify(result.data)}`);
  console.log(`PASS ${name} (${status})`);
  return result.data;
};
function nextTurnstileToken(label){
  const token=turnstileTokens[turnstileTokenIndex++];
  if(!token){
    throw Error(`${label}: disposable preview requires Turnstile but no fresh token remains. Supply one single-use token per new seat in MOMO_HOSTED_TURNSTILE_TOKENS (comma/newline separated). Do not disable production Turnstile.`);
  }
  return token;
}
async function openSeat(session){
  let result=await session.post('/api/session',{action:'start'});
  if(result.status===428){
    const turnstileToken=nextTurnstileToken(session.label);
    result=await session.post('/api/session',{action:'start',turnstileToken});
  }
  expect(`${session.label} opens a device seat`,result,200);
  assert(session.cookies.get('momo_sid'),`${session.label}: session cookie missing`);
  return session.memberId();
}
async function signOut(session){try{await session.post('/api/session',{action:'signout'})}catch{}}
async function deleteOwnData(session){
  try{
    const result=await session.post('/api/community',{action:'deleteAccount'});
    if(![200,401].includes(result.status))console.error(`${session.label} cleanup warning:`,result.status,result.data);
  }catch(error){console.error(`${session.label} cleanup warning:`,error.message)}
}

const host=new BrowserSession('host'),creator=new BrowserSession('creator'),joiner=new BrowserSession('joiner');
let wishId=null;
const started=performance.now();
try{
  await openSeat(host);
  expect('host login',await host.post('/api/session',{action:'host',username:hostUsername,passcode:hostPasscode}),200);
  expect('host notebook opens',await host.request('/api/admin?view=overview'),200);

  const creatorId=await openSeat(creator);
  expect('creator makes a profile',await creator.post('/api/community',{action:'profile',nickname:`Host ${runId}`,age:24,gender:'Disposable probe',avatar:0,rules:true}),200);
  const wish=expect('creator makes a disposable wish',await creator.post('/api/community',{action:'wish',title:`Disposable meetup ${runId}`,whenText:'Probe only',area:'Disposable preview',spots:3}),200);
  wishId=wish.id;assert.match(wishId,/^[0-9a-f-]{36}$/i);

  const joinerId=await openSeat(joiner);
  expect('profile-less seat joins in one click',await joiner.post('/api/community',{action:'joinWish',id:wishId}),200);
  const me=expect('joined seat loads its account',await joiner.request('/api/community?view=me'),200);
  assert.equal(me.profile,null,'one-click join unexpectedly created a profile');
  assert(me.gangs?.some(g=>g.room===`w_${wishId}`),'joined gang room missing from account response');
  expect('profile-less joined seat reads gang chat',await joiner.request(`/api/community?view=chat&room=w_${wishId}`),200);

  const directory=expect('host finds the unnamed joined seat',await host.request(`/api/admin?view=members&q=${encodeURIComponent(joinerId)}`),200);
  assert.equal(directory.total,1,'host directory did not resolve exactly one disposable joined seat');
  assert.equal(directory.members?.[0]?.nickname,null,'joined seat should still be unnamed');

  expect('host queues joined seat',await host.post('/api/admin',{action:'memberStatus',userId:joinerId,status:'queued',reason:'Disposable lifecycle probe'}),200);
  expect('host sends private queue note',await host.post('/api/admin',{action:'hostMessage',userId:joinerId,body:`Disposable queue note ${runId}`}),200);
  const queued=expect('queued seat receives host note',await joiner.request('/api/community?view=notices'),200);
  assert.equal(queued.status,'queued');
  assert(queued.messages?.some(message=>message.body===`Disposable queue note ${runId}`),'host note missing');
  expect('queued seat cannot read community chat',await joiner.request(`/api/community?view=chat&room=w_${wishId}`),403);

  expect('host restores queued seat',await host.post('/api/admin',{action:'memberStatus',userId:joinerId,status:'active'}),200);
  expect('restored seat can read gang again',await joiner.request(`/api/community?view=chat&room=w_${wishId}`),200);
  expect('host suspends joined seat',await host.post('/api/admin',{action:'memberStatus',userId:joinerId,status:'suspended',reason:'Disposable suspension probe'}),200);
  expect('suspended seat loses gang chat access',await joiner.request(`/api/community?view=chat&room=w_${wishId}`),403);
  expect('host restores suspended seat',await host.post('/api/admin',{action:'memberStatus',userId:joinerId,status:'active'}),200);

  expect('joined seat deletes its own data',await joiner.post('/api/community',{action:'deleteAccount'}),200);
  const boardAfterJoinerDelete=expect('wish board survives joined-seat deletion',await creator.request('/api/community'),200);
  const remainingWish=boardAfterJoinerDelete.wishes?.find(item=>item.id===wishId);
  assert(remainingWish,'disposable wish disappeared before creator cleanup');
  assert.equal(Number(remainingWish.joined),1,'joined-seat deletion did not remove its gang membership');

  expect('creator deletes its own data',await creator.post('/api/community',{action:'deleteAccount'}),200);
  const boardAfterCreatorDelete=expect('creator deletion removes its wish',await host.request('/api/community'),200);
  assert(!boardAfterCreatorDelete.wishes?.some(item=>item.id===wishId),'creator deletion left the disposable wish behind');

  const elapsed=Math.round(performance.now()-started);
  console.log('PASS disposable hosted lifecycle probe',JSON.stringify({runId,creatorId,joinerId,elapsedMs:elapsed,turnstileTokensUsed:turnstileTokenIndex,productionDataTouched:false}));
}finally{
  // deleteAccount is intentionally allowed even when a seat is queued/suspended.
  // Cleanup is best effort because this script must not weaken application guards.
  await deleteOwnData(joiner);await deleteOwnData(creator);
  await signOut(joiner);await signOut(creator);await signOut(host);
}
