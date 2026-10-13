import assert from 'node:assert/strict';
import gateway from '../cloudflare/db-gateway/worker.mjs';
import {imageSanitizerConfigured,sanitizeUploadedImage} from '../lib/image-sanitizer.ts';

const token='disposable-local-gateway-token-123456789';
const settings={MOMO_DB_GATEWAY_URL:'https://gateway.test',MOMO_DB_GATEWAY_TOKEN:token,MOMO_IMAGE_UPLOADS_ENABLED:'true'};
const input=Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3,4]);
const output=Uint8Array.from([82,73,70,70,4,0,0,0,87,69,66,80,1,2,3,4]);
let decoded=0,encoded=0;
const images={
  async info(stream){assert.deepEqual(new Uint8Array(await new Response(stream).arrayBuffer()),input);decoded++;return {format:'image/png',width:600,height:400}},
  input(stream){return {
    transform(options){assert.deepEqual(options,{width:2048,height:2048,fit:'scale-down'});return this},
    async output(options){assert.deepEqual(options,{format:'image/webp',quality:80,anim:false});assert.deepEqual(new Uint8Array(await new Response(stream).arrayBuffer()),input);encoded++;return {response:()=>new Response(output,{headers:{'Content-Type':'image/webp'}})}},
  }},
};
const env={MOMO_DB_GATEWAY_TOKEN:token,DB:{},IMAGES:images};
const request=(bytes=input,auth=token,contentType='image/png')=>new Request('https://gateway.test/v1/image',{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':contentType},body:bytes});
assert.equal((await gateway.fetch(request(input,'wrong'),env)).status,401);
assert.equal((await gateway.fetch(request(input,token,'text/html'),env)).status,415);
assert.equal((await gateway.fetch(request(new Uint8Array(3_000_001),token),env)).status,413);
assert.equal((await gateway.fetch(request(input),{...env,IMAGES:null})).status,503);
assert.equal(decoded,0);
console.log('PASS image gateway denies unauthorized, unsupported, oversized and unconfigured requests');

assert.equal(imageSanitizerConfigured({}),false);
assert.equal(imageSanitizerConfigured({...settings,MOMO_IMAGE_UPLOADS_ENABLED:'false'}),false);
assert.equal(imageSanitizerConfigured(settings),true);
await assert.rejects(sanitizeUploadedImage(input,'image/png',{}),/unavailable/);
const transport=(url,init)=>{assert.equal(url,'https://gateway.test/v1/image');assert.equal(init.headers.Authorization,'Bearer '+token);return gateway.fetch(new Request(url,init),env)};
const safe=await sanitizeUploadedImage(input,'image/png',settings,transport);
assert.deepEqual(safe,output);
assert.equal(decoded,1);assert.equal(encoded,1);
console.log('PASS image upload uses authenticated decode and WebP re-encode before storage');

const tooWide={...images,info:async()=>({format:'image/png',width:5000,height:20})};
assert.equal((await gateway.fetch(request(),{...env,IMAGES:tooWide})).status,422);
const tooManyPixels={...images,info:async()=>({format:'image/png',width:4000,height:4000})};
assert.equal((await gateway.fetch(request(),{...env,IMAGES:tooManyPixels})).status,422);
assert.equal(encoded,1);
await assert.rejects(sanitizeUploadedImage(input,'image/png',settings,async()=>new Response(input,{headers:{'Content-Type':'image/png'}})),/failed/);
await assert.rejects(sanitizeUploadedImage(input,'image/png',settings,async()=>new Response(new Uint8Array(3_000_001),{headers:{'Content-Type':'image/webp'}})),/too large/);
console.log('PASS dimensions and unexpected image outputs fail closed');
