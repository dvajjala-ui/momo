// Server-to-server transport only. The browser never receives this credential.
const MAX_BODY=128*1024;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

async function authorized(request,expected){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')||header.length>520)return false;
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(header.slice(7))),crypto.subtle.digest('SHA-256',encoder.encode(expected))]);
  const left=new Uint8Array(a),right=new Uint8Array(b);let difference=0;
  for(let i=0;i<32;i++)difference|=left[i]^right[i];
  return difference===0;
}

async function readBody(request){
  if(Number(request.headers.get('content-length')||0)>MAX_BODY)throw Error('too-large');
  const reader=request.body?.getReader();if(!reader)throw Error('invalid');
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw Error('too-large')}chunks.push(value)}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}
  try{return JSON.parse(new TextDecoder().decode(data))}catch{throw Error('invalid')}
}

function valid(query){
  return query&&typeof query.sql==='string'&&query.sql.length<=20000
    && /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(query.sql)&&!query.sql.includes(';')
    && Array.isArray(query.params)&&query.params.length<=100
    && query.params.every(value=>value===null||typeof value==='string'||(typeof value==='number'&&Number.isFinite(value)));
}

export default {
  async fetch(request,env){
    const token=env.MOMO_DB_GATEWAY_TOKEN;
    if(typeof token!=='string'||token.length<32||!env.DB)return reply({success:false,error:'Gateway unavailable.'},503);
    if(!await authorized(request,token))return reply({success:false,error:'Access denied.'},401);
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/health'){
      try{await env.DB.prepare('SELECT 1').first();return reply({ok:true})}catch{return reply({ok:false},503)}
    }
    if(path!=='/v1/query')return reply({success:false,error:'Not found.'},404);
    if(request.method!=='POST')return reply({success:false,error:'Use POST.'},405);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({success:false,error:'Use JSON.'},415);
    let body;try{body=await readBody(request)}catch(error){return reply({success:false,error:'Invalid query request.'},error.message==='too-large'?413:400)}
    const batch=body?.batch??[body];
    if(!Array.isArray(batch)||!batch.length||batch.length>40||!batch.every(valid))return reply({success:false,error:'Invalid query request.'},400);
    try{
      // Native D1 batches execute sequentially and roll back together on failure.
      const rows=await env.DB.batch(batch.map(query=>env.DB.prepare(query.sql).bind(...query.params)));
      return reply({success:true,result:rows.map(row=>({success:row.success,results:row.results||[],meta:{changes:Number(row.meta?.changes||0)}}))});
    }catch{
      // SQL, parameters, contact details and provider errors never go into logs or responses.
      return reply({success:false,error:'Database query failed.'},503);
    }
  },
};
