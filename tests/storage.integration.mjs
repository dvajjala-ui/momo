import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {cloudflareD1Config,cloudflareExecutor} from '../lib/d1-http.ts';
import {r2Config,createR2Bucket} from '../lib/r2-bucket.ts';
const require=createRequire(realpathSync(new URL('../node_modules/wrangler/package.json',import.meta.url)));
const {Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local")}}',d1Databases:['DB'],r2Buckets:['BUCKET']});
const settings={CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_D1_DATABASE_ID:'11111111-1111-1111-1111-111111111111',CLOUDFLARE_D1_API_TOKEN:'disposable-test-token',R2_BUCKET_NAME:'momo-test',R2_ACCESS_KEY_ID:'local-test-id',R2_SECRET_ACCESS_KEY:'local-test-secret'};
try{
  assert.equal(cloudflareD1Config({CLOUDFLARE_ACCOUNT_ID:settings.CLOUDFLARE_ACCOUNT_ID}),null);
  assert.throws(()=>cloudflareD1Config({CLOUDFLARE_D1_DATABASE_ID:settings.CLOUDFLARE_D1_DATABASE_ID}),/incomplete/);
  assert.throws(()=>r2Config({R2_BUCKET_NAME:'momo-test'}),/incomplete/);
  console.log('PASS partial storage configuration fails closed');
  const db=await mf.getD1Database('DB');
  // All transport is injected: this suite cannot contact Cloudflare or recipients.
  const ex=cloudflareExecutor(cloudflareD1Config(settings),async(url,init)=>{
    assert.equal(new URL(url).hostname,'api.cloudflare.com');
    assert.equal(init.headers.Authorization,'Bearer disposable-test-token');
    assert.equal(init.cache,'no-store');
    const body=JSON.parse(init.body),batch=body.batch||[body];
    try{
      const result=await db.batch(batch.map(q=>db.prepare(q.sql).bind(...q.params)));
      return Response.json({success:true,result});
    }catch{return Response.json({success:false},{status:400});}
  });
  await ex.exec('CREATE TABLE sample (id text PRIMARY KEY, n integer, optional text)',[]);
  await ex.exec('INSERT INTO sample VALUES(?,?,?)',["apostrophe's",7,null]);
  assert.deepEqual((await ex.exec('SELECT * FROM sample WHERE id=?',["apostrophe's"])).rows,[{id:"apostrophe's",n:7,optional:null}]);
  await ex.batch([['UPDATE sample SET n=? WHERE id=?',[8,"apostrophe's"]],['INSERT INTO sample VALUES(?,?,?)',['second',9,'text']]]);
  assert.equal((await ex.exec('SELECT n FROM sample WHERE id=?',["apostrophe's"])).rows[0].n,8);
  await assert.rejects(ex.batch([['UPDATE sample SET n=99',[]],['INSERT INTO sample VALUES(?,?,?)',['second',0,null]]]),/request failed/);
  assert.equal((await ex.exec('SELECT n FROM sample WHERE id=?',["apostrophe's"])).rows[0].n,8);
  console.log('PASS D1 parameter types, batch writes and rollback on failure');
  const failure=cloudflareExecutor(cloudflareD1Config(settings),async()=>Response.json({success:true,result:[{success:false}]}));
  await assert.rejects(failure.exec('SELECT 1',[]),/query failed/);
  console.log('PASS upstream SQL errors cannot become successful responses');
  const store=await mf.getR2Bucket('BUCKET');
  const bucket=createR2Bucket(r2Config(settings),async(req,init)=>{
    assert.equal(new URL(req.url).hostname,settings.CLOUDFLARE_ACCOUNT_ID+'.r2.cloudflarestorage.com');
    assert.match(req.headers.get('authorization'),/^AWS4-HMAC-SHA256 Credential=local-test-id\/.*\/auto\/s3\/aws4_request/);
    assert.equal(init.cache,'no-store');
    const key=decodeURIComponent(new URL(req.url).pathname.split('/').slice(2).join('/'));
    if(req.method==='PUT'){await store.put(key,await req.arrayBuffer(),{httpMetadata:{contentType:req.headers.get('content-type')}});return new Response(null,{status:200});}
    if(req.method==='DELETE'){await store.delete(key);return new Response(null,{status:204});}
    const obj=await store.get(key);return obj?new Response(obj.body,{headers:{'content-type':obj.httpMetadata.contentType}}):new Response(null,{status:404});
  });
  const bytes=new Uint8Array([1,2,3,4]);
  await bucket.put('test photo',bytes,{httpMetadata:{contentType:'image/png'}});
  const obj=await bucket.get('test photo');
  assert.equal(obj.httpMetadata.contentType,'image/png');
  assert.deepEqual(new Uint8Array(await new Response(obj.body).arrayBuffer()),bytes);
  await bucket.delete('test photo');assert.equal(await bucket.get('test photo'),null);
  const denied=createR2Bucket(r2Config(settings),async()=>new Response('Denied',{status:403}));
  await assert.rejects(denied.get('key'),/403/);
  console.log('PASS signed private R2 upload/read/delete, content type, missing object and access denial');
}finally{await mf.dispose();}
