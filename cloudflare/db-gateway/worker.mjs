// Server-to-server transport only. The browser never receives this credential.
const MAX_BODY=128*1024;
const MAX_IMAGE=3_000_000;
const MAX_IMAGE_PIXELS=12_000_000;
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

async function readImage(request){
  if(Number(request.headers.get('content-length')||0)>MAX_IMAGE)throw Error('too-large');
  const reader=request.body?.getReader();if(!reader)throw Error('invalid');
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_IMAGE){await reader.cancel();throw Error('too-large')}chunks.push(value)}
  if(!size)throw Error('invalid');
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}
  return data;
}

async function sanitizeImage(request,images){
  if(!images)return reply({error:'Image processing is unavailable.'},503);
  if(!['image/png','image/jpeg','image/webp'].includes(request.headers.get('content-type')))return reply({error:'Choose a PNG, JPEG or WebP image.'},415);
  let bytes;try{bytes=await readImage(request)}catch(error){return reply({error:'Choose an image under 3 MB.'},error.message==='too-large'?413:400)}
  try{
    const stream=()=>new Blob([bytes]).stream();
    const info=await images.info(stream());
    if(info.format!==request.headers.get('content-type')||!Number.isInteger(info.width)||!Number.isInteger(info.height)||info.width<1||info.height<1||info.width>4096||info.height>4096||info.width*info.height>MAX_IMAGE_PIXELS)return reply({error:'Image format or dimensions are unsupported.'},422);
    // Encoding to WebP drops invisible EXIF metadata, including location data.
    const output=(await images.input(stream()).transform({width:2048,height:2048,fit:'scale-down'}).output({format:'image/webp',quality:80,anim:false})).response();
    if(!output.ok||output.headers.get('content-type')!=='image/webp')throw Error('invalid-output');
    const processed=await readImage(output);
    if(processed.length<12||String.fromCharCode(...processed.slice(0,4))!=='RIFF'||String.fromCharCode(...processed.slice(8,12))!=='WEBP')throw Error('invalid-output');
    return new Response(processed,{headers:{'Content-Type':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch{return reply({error:'Image could not be processed.'},422)}
}

function valid(query){
  return query&&typeof query.sql==='string'&&query.sql.length<=20000
    && /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(query.sql)&&!query.sql.includes(';')
    && Array.isArray(query.params)&&query.params.length<=100
    && query.params.every(value=>value===null||typeof value==='string'||(typeof value==='number'&&Number.isFinite(value)));
}

const gateway={
  async fetch(request,env){
    const token=env.MOMO_DB_GATEWAY_TOKEN;
    if(typeof token!=='string'||token.length<32||!env.DB)return reply({success:false,error:'Gateway unavailable.'},503);
    if(!await authorized(request,token))return reply({success:false,error:'Access denied.'},401);
    const path=new URL(request.url).pathname;
    if(path==='/v1/image')return request.method==='POST'?sanitizeImage(request,env.IMAGES):reply({error:'Use POST.'},405);
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
export default gateway;
