// Pseudonymous device identity for platforms without a trusted sign-in gateway.
// The cookie holds a random 256-bit token; the member id is derived from it, so
// identity needs no database lookup (serverless functions may not share storage).
// Host access is a second cookie that proves knowledge of HOST_PASSCODE for this token.
import {cookies} from 'next/headers';

export const SESSION_COOKIE='momo_sid';
export const HOST_COOKIE='momo_host';
const TOKEN=/^[a-f0-9]{64}$/;

export async function sha256(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')}
export function newToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('')}
export const memberId=async(token:string)=>'m_'+(await sha256('member:'+token)).slice(0,32);
export const hostProof=async(token:string,passcode:string)=>sha256('host:'+passcode+':'+token);

export async function sessionToken(){const t=(await cookies()).get(SESSION_COOKIE)?.value;return t&&TOKEN.test(t)?t:null}

export async function deviceUser(passcode:string|undefined){
  const token=await sessionToken();if(!token)return null;
  const proof=(await cookies()).get(HOST_COOKIE)?.value;
  const host=!!passcode&&passcode.length>=12&&!!proof&&proof===await hostProof(token,passcode);
  return {userId:await memberId(token),displayName:'',email:'',fullName:null,host};
}

const attrs=(secure:boolean,maxAge:number)=>`; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;
export const sessionCookie=(token:string,secure:boolean)=>SESSION_COOKIE+'='+token+attrs(secure,34560000);
export const hostCookie=(proof:string,secure:boolean)=>HOST_COOKIE+'='+proof+attrs(secure,2592000);
export const clearCookies=(secure:boolean)=>[SESSION_COOKIE+'='+attrs(secure,0),HOST_COOKIE+'='+attrs(secure,0)];
