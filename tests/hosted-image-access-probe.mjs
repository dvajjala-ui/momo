// Hosted upload/private-media probe. Production requires a separate explicit
// switch and the exact known live hostname; it creates only a test profile/photo
// and deletes the test seat afterwards.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';

const raw=process.env.MOMO_HOSTED_TEST_APP_URL;if(!raw)throw Error('Missing MOMO_HOSTED_TEST_APP_URL');
const app=new URL(raw);
if(app.protocol!=='https:')throw Error('Hosted image probe requires HTTPS.');
if(app.pathname!=='/'||app.search||app.hash||app.username||app.password)throw Error('Hosted image probe requires a bare app origin.');
const production=app.hostname==='momo-ten-pied.vercel.app';
if(production){
  if(process.env.MOMO_HOSTED_IMAGE_PRODUCTION!=='yes-test-and-delete-one-live-seat'||process.env.MOMO_HOSTED_IMAGE_DISPOSABLE){
    throw Error('Refusing production image probe without its separate exact-host approval switch.');
  }
}else if(process.env.MOMO_HOSTED_IMAGE_DISPOSABLE!=='yes-delete-probe-data'||process.env.MOMO_HOSTED_IMAGE_PRODUCTION){
  throw Error('Refusing disposable image probe without MOMO_HOSTED_IMAGE_DISPOSABLE=yes-delete-probe-data.');
}
const optionalTurnstileToken=process.env.MOMO_HOSTED_TURNSTILE_TOKEN||'';
// Use a valid decodable image, with a CRC-checked ancillary metadata marker.
// The former one-pixel fixture had an invalid IDAT CRC and real Images rejected it.
const source=readFileSync(new URL('../public/icon-192.png',import.meta.url));
const marker='MOMO_DISPOSABLE_METADATA_'+randomUUID();
const payload=Buffer.from('Comment\0'+marker),chunk=Buffer.alloc(payload.length+12);
chunk.writeUInt32BE(payload.length);chunk.write('tEXt',4);payload.copy(chunk,8);
let crc=0xffffffff;
for(const byte of chunk.subarray(4,-4)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(crc&1?0xedb88320:0)}
chunk.writeUInt32BE((crc^0xffffffff)>>>0,chunk.length-4);
const png=Buffer.concat([source.subarray(0,-12),chunk,source.subarray(-12)]);
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
    if(!optionalTurnstileToken)throw Error('Hosted app requires Turnstile. Supply a fresh MOMO_HOSTED_TURNSTILE_TOKEN from this hostname.');
    opened=await session.post('/api/session',{action:'start',turnstileToken:optionalTurnstileToken});
  }
  assert.equal(opened.status,200,`Could not open test seat: ${JSON.stringify(opened.data)}`);
  assert(session.cookies.get('momo_sid'),'Test seat cookie missing');

  const profile=await session.post('/api/community',{action:'profile',nickname:`Img ${suffix}`.slice(0,30),age:24,gender:'Disposable probe',avatar:0,rules:true});
  assert.equal(profile.status,200,`Could not create disposable profile: ${JSON.stringify(profile.data)}`);

  const first=await session.upload();
  assert.equal(first.status,200,`Hosted upload failed. Confirm upload flag, R2 and reviewed image gateway binding: ${JSON.stringify(first.data)}`);
  assert.match(first.data.id,/^[0-9a-f-]{36}$/);latestPhoto=first.data.id;
  const me=await session.json('/api/community?view=me');assert.equal(me.status,200);assert.equal(me.data.profile?.photo,latestPhoto);

  const anonymous=await fetch(new URL(`/api/media/${latestPhoto}`,app),{redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(anonymous.status,401,'Private profile photo was readable without a member session');
  const signed=await fetch(new URL(`/api/media/${latestPhoto}`,app),{headers:{Cookie:session.header()},redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(signed.status,200);assert.equal(signed.headers.get('content-type'),'image/webp');assert.equal(signed.headers.get('cache-control'),'private, no-store');
  const safeBytes=new Uint8Array(await signed.arrayBuffer());assert(safeBytes.length>12,'Sanitized hosted image was empty');
  assert.equal(String.fromCharCode(...safeBytes.slice(0,4)),'RIFF');assert.equal(String.fromCharCode(...safeBytes.slice(8,12)),'WEBP');
  assert(!Buffer.from(safeBytes).includes(Buffer.from(marker)),'Source metadata marker survived re-encoding');
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
console.log('PASS hosted image/private-media probe',JSON.stringify({host:app.hostname,productionDataTouched:production,disposableSeatDeleted:true}));
