// Explicit disposable probes against the selected remote resources. No participants.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {cloudflareD1Config,cloudflareExecutor} from '../lib/d1-http.ts';
import {r2Config,createR2Bucket} from '../lib/r2-bucket.ts';
const config=cloudflareD1Config(),photos=r2Config();
if(!config||!photos)throw Error('Configure D1 and R2 privately first.');
const expected=process.argv.find(x=>x.startsWith('--database-id='))?.split('=')[1];
const bucket=process.argv.find(x=>x.startsWith('--bucket='))?.split('=')[1];
if(expected!==config.databaseId||bucket!==photos.bucket)throw Error('Pass the exact --database-id and --bucket before running disposable remote probes.');
const ex=cloudflareExecutor(config),r2=createR2Bucket(photos);
const table='_momo_probe_'+randomUUID().replaceAll('-',''),key='storage-probe/'+randomUUID();
let madeTable=false,madePhoto=false;
try{
  await ex.exec(`CREATE TABLE ${table} (id text PRIMARY KEY, n integer, optional text)`,[]);madeTable=true;
  await ex.exec(`INSERT INTO ${table} VALUES(?,?,?)`,["binding's test",7,null]);
  assert.deepEqual((await ex.exec(`SELECT * FROM ${table}`,[])).rows,[{id:"binding's test",n:7,optional:null}]);
  await ex.batch([[`UPDATE ${table} SET n=?`,[8]],[`INSERT INTO ${table} VALUES(?,?,?)`,['second',9,'ok']]]);
  await assert.rejects(ex.batch([[`UPDATE ${table} SET n=99`,[]],[`INSERT INTO ${table} VALUES(?,?,?)`,['second',0,null]]]));
  assert.equal((await ex.exec(`SELECT n FROM ${table} WHERE id=?`,["binding's test"])).rows[0].n,8);
  console.log('PASS remote D1 types, writes, reads and failed-batch rollback');
  const bytes=new TextEncoder().encode('Disposable Momo storage connection test.');
  await r2.put(key,bytes,{httpMetadata:{contentType:'text/plain'}});madePhoto=true;
  const object=await r2.get(key);assert.equal(object.httpMetadata.contentType,'text/plain');
  assert.deepEqual(new Uint8Array(await new Response(object.body).arrayBuffer()),bytes);
  await r2.delete(key);madePhoto=false;assert.equal(await r2.get(key),null);
  console.log('PASS remote private R2 write, read, metadata and deletion');
}finally{
  if(madeTable)await ex.exec(`DROP TABLE ${table}`,[]);
  if(madePhoto)await r2.delete(key);
  console.log('Disposable probe cleanup complete.');
}
