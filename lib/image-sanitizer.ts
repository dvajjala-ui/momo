type Settings=Record<string,string|undefined>;
const MAX_IMAGE=3_000_000;

function config(settings:Settings){
  const token=settings.MOMO_DB_GATEWAY_TOKEN?.trim()||'';
  let url:URL;
  try{url=new URL(settings.MOMO_DB_GATEWAY_URL||'')}
  catch{return null}
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||token.length<32)return null;
  return {origin:url.origin,token};
}

export function imageSanitizerConfigured(settings:Settings=process.env){
  return settings.MOMO_IMAGE_UPLOADS_ENABLED==='true'&&!!config(settings);
}

export async function sanitizeUploadedImage(bytes:Uint8Array,type:string,settings:Settings=process.env,transport:typeof fetch=fetch){
  const gateway=config(settings);
  if(!gateway)throw new Error('Image processing is unavailable.');
  const response=await transport(gateway.origin+'/v1/image',{
    method:'POST',
    headers:{Authorization:`Bearer ${gateway.token}`,'Content-Type':type},
    body:new Uint8Array(bytes).buffer,
    cache:'no-store',
    signal:AbortSignal.timeout(20000),
  });
  if(!response.ok||response.headers.get('content-type')!=='image/webp'||Number(response.headers.get('content-length')||0)>MAX_IMAGE)throw new Error('Image processing failed.');
  const reader=response.body?.getReader();
  if(!reader)throw new Error('Image processing failed.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;
    if(size>MAX_IMAGE){await reader.cancel();throw new Error('Processed image is too large.')}
    chunks.push(value);
  }
  const output=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length}
  if(size<12||String.fromCharCode(...output.slice(0,4))!=='RIFF'||String.fromCharCode(...output.slice(8,12))!=='WEBP')throw new Error('Image processing failed.');
  return output;
}
