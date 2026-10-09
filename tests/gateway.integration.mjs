// Isolated Miniflare/D1 only. This suite cannot contact production or recipients.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {d1GatewayConfig,gatewayExecutor} from '../lib/d1-http.ts';
const {Miniflare}=createRequire(realpathSync(new URL('../node_modules/wrangler/package.json',import.meta.url)))('miniflare');
const token='disposable-local-gateway-token-123456789';
const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('../cloudflare/db-gateway/worker.mjs',import.meta.url)),compatibilityDate:'2026-05-15',d1Databases:['DB'],bindings:{MOMO_DB_GATEWAY_TOKEN:token}});
try{
  assert.equal(d1GatewayConfig({}),null);
  for(const settings of [{MOMO_DB_GATEWAY_URL:'https://gateway.test'},{MOMO_DB_GATEWAY_TOKEN:token},{MOMO_DB_GATEWAY_URL:'http://gateway.test',MOMO_DB_GATEWAY_TOKEN:token},{MOMO_DB_GATEWAY_URL:'https://gateway.test/path',MOMO_DB_GATEWAY_TOKEN:token}])assert.throws(()=>d1GatewayConfig(settings),/incomplete/);
  console.log('PASS gateway configuration fails closed');
  const config=d1GatewayConfig({MOMO_DB_GATEWAY_URL:'https://gateway.test',MOMO_DB_GATEWAY_TOKEN:token});
  async function raw(body,auth=token,path='/v1/query',method='POST'){
    return mf.dispatchFetch('https://gateway.test'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:method==='POST'?(typeof body==='string'?body:JSON.stringify(body)):undefined});
  }
  assert.equal((await raw({sql:'SELECT 1',params:[]},null)).status,401);
  assert.equal((await raw('malformed','wrong')).status,401);
  const health=await raw(null,token,'/health','GET');assert.equal(health.status,200);assert.equal(health.headers.get('cache-control'),'no-store');assert.equal(health.headers.get('access-control-allow-origin'),null);
  assert.deepEqual(await health.json(),{ok:true});
  console.log('PASS only authorized servers can access the gateway');
  const db=await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE sample(id text PRIMARY KEY,n integer,optional text)').run();
  const ex=gatewayExecutor(config,async(url,init)=>{
    assert.equal(url,'https://gateway.test/v1/query');assert.equal(init.headers.Authorization,'Bearer '+token);assert.equal(init.cache,'no-store');
    return mf.dispatchFetch(url,init);
  });
  await ex.exec('INSERT INTO sample VALUES(?,?,?)',["test's",1,null]);
  assert.deepEqual((await ex.exec('SELECT * FROM sample WHERE id=?',["test's"])).rows,[{id:"test's",n:1,optional:null}]);
  await ex.batch([['UPDATE sample SET n=2 WHERE id=?',["test's"]],['INSERT INTO sample VALUES(?,?,?)',['second',3,'text']]]);
  await assert.rejects(ex.batch([['UPDATE sample SET n=99',[]],['INSERT INTO sample VALUES(?,?,?)',['second',0,null]]]),/request failed/);
  assert.equal((await ex.exec('SELECT n FROM sample WHERE id=?',["test's"])).rows[0].n,2);
  console.log('PASS native D1 parameter binding and atomic batch rollback');
  assert.equal((await raw({sql:'DROP TABLE sample',params:[]})).status,400);
  assert.equal((await raw({sql:'SELECT 1; SELECT 2',params:[]})).status,400);
  assert.equal((await raw({sql:'SELECT ?',params:[{}]})).status,400);
  assert.equal((await raw({batch:Array.from({length:41},()=>({sql:'SELECT 1',params:[]}))})).status,400);
  assert.equal((await raw('{"sql":"'+'x'.repeat(128*1024)+'"}')).status,413);
  const bad=await raw({sql:'SELECT * FROM missing_private_table',params:[]});assert.equal(bad.status,503);assert.deepEqual(await bad.json(),{success:false,error:'Database query failed.'});
  console.log('PASS bounded inputs, schema-operation denial and private errors');
  let calls=0;
  const unavailable=gatewayExecutor(config,async()=>{calls++;throw Error('disconnected')});
  await assert.rejects(unavailable.exec('INSERT INTO sample VALUES(?,?,?)',['uncertain',4,null]));assert.equal(calls,1);
  console.log('PASS uncertain writes are never automatically retried');
  await db.batch([db.prepare('CREATE TABLE capacity(id text PRIMARY KEY,spots integer)'),db.prepare('CREATE TABLE seats(id text PRIMARY KEY,group_id text)'),db.prepare("INSERT INTO capacity VALUES('test',10)")]);
  const joins=await Promise.all(Array.from({length:50},(_,i)=>ex.exec("INSERT OR IGNORE INTO seats(id,group_id) SELECT ?,id FROM capacity WHERE id=? AND (SELECT COUNT(*) FROM seats WHERE group_id=?)<spots",['local-'+i,'test','test'])));
  assert.equal(joins.filter(result=>result.changes===1).length,10);
  assert.equal((await ex.exec('SELECT COUNT(*) AS n FROM seats',[])).rows[0].n,10);
  console.log('PASS 50 simultaneous local joins never overfill ten seats');
}finally{await mf.dispose()}
