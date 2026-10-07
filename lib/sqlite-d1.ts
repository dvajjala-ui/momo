// A small D1-compatible adapter so the same route code runs outside Cloudflare.
// Backends: Turso/libSQL over HTTP when TURSO_DATABASE_URL is set (durable),
// otherwise node:sqlite on local disk (durable locally, ephemeral on Vercel).
import {migrations} from './migrations.generated';

type Value=string|number|null;
type Row=Record<string,unknown>;
type Result={rows:Row[];changes:number};
interface Executor{exec(sql:string,args:Value[]):Promise<Result>;batch(list:[string,Value[]][]):Promise<Result[]>}

const READS=/^\s*(SELECT|WITH|PRAGMA)\b/i;
const toValue=(v:unknown):Value=>v===undefined||v===null?null:typeof v==='boolean'?(v?1:0):typeof v==='number'||typeof v==='string'?v:String(v);

async function sqliteExecutor(path:string):Promise<Executor>{
  const {DatabaseSync}=await import('node:sqlite');
  const {mkdirSync}=await import('node:fs');
  const {dirname}=await import('node:path');
  mkdirSync(dirname(path),{recursive:true});
  const db=new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  const one=(sql:string,args:Value[]):Result=>{const s=db.prepare(sql);if(READS.test(sql)||/\bRETURNING\b/i.test(sql))return {rows:s.all(...args) as Row[],changes:0};const r=s.run(...args);return {rows:[],changes:Number(r.changes)}};
  return {
    async exec(sql,args){return one(sql,args)},
    async batch(list){db.exec('BEGIN');try{const out=list.map(([s,a])=>one(s,a));db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}},
  };
}

function libsqlExecutor(url:string,token?:string):Executor{
  const base=url.replace(/^libsql:\/\//,'https://').replace(/\/$/,'');
  const arg=(v:Value)=>v===null?{type:'null'}:typeof v==='number'?(Number.isInteger(v)?{type:'integer',value:String(v)}:{type:'float',value:v}):{type:'text',value:v};
  const stmt=(sql:string,args:Value[])=>({sql,args:args.map(arg)});
  const decode=(r:any):Result=>{const cols:string[]=(r?.cols||[]).map((c:any)=>c.name);return {changes:Number(r?.affected_row_count||0),rows:(r?.rows||[]).map((row:any[])=>Object.fromEntries(row.map((cell:any,i:number)=>[cols[i],cell.type==='null'?null:cell.type==='integer'?Number(cell.value):cell.type==='float'?Number(cell.value):cell.value])))}};
  async function pipeline(requests:any[]){const res=await fetch(base+'/v2/pipeline',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({requests:[...requests,{type:'close'}]})});if(!res.ok)throw new Error('Database request failed ('+res.status+')');const data:any=await res.json();return data.results as any[]}
  return {
    async exec(sql,args){const [r]=await pipeline([{type:'execute',stmt:stmt(sql,args)}]);if(r.type!=='ok')throw new Error(r.error?.message||'Database error');return decode(r.response.result)},
    async batch(list){
      const steps:any[]=[{stmt:{sql:'BEGIN'}}];
      list.forEach(([s,a],i)=>steps.push({condition:{type:'ok',step:i},stmt:stmt(s,a)}));
      steps.push({condition:{type:'ok',step:list.length},stmt:{sql:'COMMIT'}});
      steps.push({condition:{type:'not',cond:{type:'ok',step:list.length+1}},stmt:{sql:'ROLLBACK'}});
      const [r]=await pipeline([{type:'batch',batch:{steps}}]);
      if(r.type!=='ok')throw new Error(r.error?.message||'Database error');
      const results=r.response.result;const failed=results.step_errors.find((e:any)=>e);if(failed)throw new Error(failed.message||'Database error');
      return list.map((_,i)=>decode(results.step_results[i+1]));
    },
  };
}

async function migrate(ex:Executor){
  await ex.exec('CREATE TABLE IF NOT EXISTS _momo_migrations (name text PRIMARY KEY, applied integer NOT NULL)',[]);
  const done=new Set((await ex.exec('SELECT name FROM _momo_migrations',[])).rows.map(r=>String(r.name)));
  for(const m of migrations){
    if(done.has(m.name))continue;
    const statements=m.sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
    await ex.batch([...statements.map(s=>[s,[]] as [string,Value[]]),['INSERT INTO _momo_migrations(name,applied) VALUES(?,?)',[m.name,Date.now()]]]);
  }
}

class Statement{
  constructor(private ready:()=>Promise<Executor>,readonly sql:string,readonly args:Value[]=[]){}
  bind(...values:unknown[]){return new Statement(this.ready,this.sql,values.map(toValue))}
  async first<T=Row>(column?:string):Promise<T|null>{const r=await (await this.ready()).exec(this.sql,this.args);const row=r.rows[0];if(!row)return null;return (column?row[column]:{...row}) as T}
  async all<T=Row>(){const r=await (await this.ready()).exec(this.sql,this.args);return {results:r.rows.map(x=>({...x})) as T[],success:true,meta:{changes:r.changes}}}
  async run(){const r=await (await this.ready()).exec(this.sql,this.args);return {results:r.rows,success:true,meta:{changes:r.changes}}}
}

export function createD1(){
  let pending:Promise<Executor>|null=null;
  const ready=()=>pending??=(async()=>{
    const url=process.env.TURSO_DATABASE_URL||process.env.LIBSQL_URL;
    const ex=url?libsqlExecutor(url,process.env.TURSO_AUTH_TOKEN||process.env.LIBSQL_AUTH_TOKEN):await sqliteExecutor(process.env.MOMO_SQLITE_PATH||(process.env.VERCEL?'/tmp/momo.sqlite':'.data/momo.sqlite'));
    await migrate(ex);return ex;
  })().catch(e=>{pending=null;throw e});
  return {
    prepare:(sql:string)=>new Statement(ready,sql),
    async batch(list:Statement[]){const results=await (await ready()).batch(list.map(s=>[s.sql,s.args]));return results.map(r=>({results:r.rows,success:true,meta:{changes:r.changes}}))},
  };
}

export const storageMode=()=>process.env.TURSO_DATABASE_URL||process.env.LIBSQL_URL?'durable':process.env.VERCEL?'preview':'local';
