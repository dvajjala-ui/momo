// Run with private environment settings. Defaults to a read-only pending list.
import {readdirSync,readFileSync} from 'node:fs';
import {cloudflareD1Config,cloudflareExecutor} from '../lib/d1-http.ts';

const config=cloudflareD1Config();
if(!config)throw new Error('Set the three CLOUDFLARE_* D1 settings privately first.');
const apply=process.argv.includes('--apply');
const expected=process.argv.find(x=>x.startsWith('--database-id='))?.split('=')[1];
if(apply&&expected!==config.databaseId)throw new Error('Applying requires --database-id=<exact intended database UUID>.');
const ex=cloudflareExecutor(config);
const dir=new URL('../drizzle/',import.meta.url);
const files=readdirSync(dir).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
const table=await ex.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='_momo_migrations'",[]);
if(!table.rows.length){
  const existing=await ex.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'",[]);
  if(existing.rows.length)throw new Error('This database has existing tables without Momo migration history. Reconcile before applying.');
  if(apply)await ex.exec('CREATE TABLE _momo_migrations (name text PRIMARY KEY, applied integer NOT NULL)',[]);
}
const done=new Set(table.rows.length?(await ex.exec('SELECT name FROM _momo_migrations',[])).rows.map(r=>r.name):[]);
for(const file of files){
  const name=file.replace(/\.sql$/,'');
  if(done.has(name)){console.log('Already applied: '+name);continue;}
  console.log((apply?'Applying: ':'Pending: ')+name);
  if(apply){
    const statements=readFileSync(new URL(file,dir),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
    await ex.batch([...statements.map(sql=>[sql,[]]),['INSERT INTO _momo_migrations(name,applied) VALUES(?,?)',[name,Date.now()]]]);
  }
}
console.log(apply?'Migration check complete.':'Read-only check complete. No schema changed.');
