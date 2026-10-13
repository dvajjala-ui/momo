// Disposable hosted upload/private-media probe. It refuses the known production
// site, creates only a test profile/photo, and deletes the test seat afterwards.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

if(process.env.MOMO_HOSTED_IMAGE_DISPOSABLE!=='yes-delete-probe-data'){
  throw Error('Refusing image probe without MOMO_HOSTED_IMAGE_DISPOSABLE=yes-delete-probe-data');
}
const raw=process.env.MOMO_HOSTED_TEST_APP_URL;if(!raw)throw Error('Missing MOMO_HOSTED_TEST_APP_URL');
const app=new URL(raw);
if(app.protocol!=='https:')throw Error('Hosted image probe requires HTTPS.');
if(app.hostname==='momo-ten-pied.vercel.app')throw Error('Refusing hosted image probe against the known production site.');
const optionalTurnstileToken=process.env.MOMO_HOSTED_TURNSTILE_TOKEN||'';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
const suffix=randomUUID().replaceAll('-','').slice(0,10);

class Session{
  constructor(){this.cookies=new Map()}
  absorb(headers){
    const raw=typeof headers.getSetCookie==='function'?headers.getSetCookie():(headers.get('set-cookie')?[headers.get('set-cookie')]:[]);
    for(const line of raw){const first=line.split(';',1)[0],at=first.indexOf('=');if(at<1)continue;const name=first.slice(0,at),value=first.slice(at+1);if(value)this.cookies.set(name,value);else this.cookies.delete(name)}
  }
  header(){return [...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}
  async json(path,{method='GET',body}={}){
    const headers={Origin:app.origin};if(body!==undefined)headers['Content-Type']='application/json';const cookie=this.header();if(cookie)headers.Cookie=cookie;
    const response=await fetch(new URL(path,app),{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(20000)});
    this.absorb(response.headers);const text=await response.text();return {status:response.status,data:text?JSON.parse(text):{},headers:response.headers};
  }
  post(path,body){return this.json(path,{method:'POST',body})}
  async upload(){
    const form=new FormData();form.set('photo',new Blob([png],{type:'image/png'}),`probe-${suffix}.png`);form.set('kind','profile');form.set('consent','yes');
    const headers={Origin:app.origin};const cookie=this.header();if(cookie)headers.Cookie=cookie;
    const response=await fetch(new URL('/api/upload',app),{method:'POST',headers,body:form,redirect:'manual',signal:AbortSignal.timeout(30000)});
    const text=await response.text();return {status:response.status,data:text?JSON.parse(text):{},headers:response.headers};
  }
}

const session=new Session();let latestPhoto=null;
try{
  let opened=await session.post('/api/session',{action:'start'});
  if(opened.status===428){
    if(!optionalTurnstileToken)throw Error('Preview requires Turnstile. Supply a fresh MOMO_HOSTED_TURNSTILE_TOKEN from this disposable hostname.');
    opened=await session.post('/api/session',{action:'start',turnstileToken:optionalTurnstileToken});
  }
  assert.equal(opened.status,200,`Could not open disposable seat: ${JSON.stringify(opened.data)}`);
  assert(session.cookies.get('momo_sid'),'Disposable seat cookie missing');

  const profile=await session.post('/api/community',{action:'profile',nickname:`Img ${suffix}`.slice(0,30),age:24,gender:'Disposable probe',avatar:0,rules:true});
  assert.equal(profile.status,200,`Could not create disposable profile: ${JSON.stringify(profile.data)}`);

  const first=await session.upload();
  assert.equal(first.status,200,`Hosted upload failed. Confirm preview upload flag, R2 and reviewed image gateway binding: ${JSON.stringify(first.data)}`);
  assert.match(first.data.id,/^[0-9a-f-]{36}$/);latestPhoto=first.data.id;
  const me=await session.json('/api/community?view=me');assert.equal(me.status,200);assert.equal(me.data.profile?.photo,latestPhoto);

  const anonymous=await fetch(new URL(`/api/media/${latestPhoto}`,app),{redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(anonymous.status,401,'Private profile photo was readable without a member session');
  const signed=await fetch(new URL(`/api/media/${latestPhoto}`,app),{headers:{Cookie:session.header()},redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(signed.status,200);assert.equal(signed.headers.get('content-type'),'image/webp');assert.equal(signed.headers.get('cache-control'),'private, no-store');
  const safeBytes=new Uint8Array(await signed.arrayBuffer());assert(safeBytes.length>12,'Sanitized hosted image was empty');
  assert.equal(String.fromCharCode(...safeBytes.slice(0,4)),'RIFF');assert.equal(String.fromCharCode(...safeBytes.slice(8,12)),'WEBP');
  console.log('PASS hosted profile photo is re-encoded WebP and private/no-store');

  const oldPhoto=latestPhoto,second=await session.upload();assert.equal(second.status,200,JSON.stringify(second.data));assert.notEqual(second.data.id,oldPhoto);latestPhoto=second.data.id;
  const replaced=await fetch(new URL(`/api/media/${oldPhoto}`,app),{headers:{Cookie:session.header()},redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(replaced.status,404,'Replaced profile photo remained addressable');
  console.log('PASS replacing a profile photo removes the old media reference');

  const deleted=await session.post('/api/community',{action:'deleteAccount'});assert.equal(deleted.status,200,JSON.stringify(deleted.data));
  const afterDelete=await fetch(new URL(`/api/media/${latestPhoto}`,app),{headers:{Cookie:session.header()},redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(afterDelete.status,404,'Account deletion left profile media addressable');latestPhoto=null;
  console.log('PASS account deletion removes hosted profile media access');
}finally{
  try{await session.post('/api/community',{action:'deleteAccount'})}catch{}
  try{await session.post('/api/session',{action:'signout'})}catch{}
}
console.log('PASS disposable hosted image/private-media probe',JSON.stringify({host:app.hostname,productionDataTouched:false}));
