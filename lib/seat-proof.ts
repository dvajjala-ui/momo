const PROOF=/^[a-f0-9]{64}$/;

export async function seatProof(token:string,secret:string){
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode('momo-seat-v1:'+token));
  return Array.from(new Uint8Array(signature)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function equalProof(actual:string|undefined,expected:string){
  if(!actual||!PROOF.test(actual))return false;
  let difference=0;
  for(let i=0;i<64;i++)difference|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return difference===0;
}
