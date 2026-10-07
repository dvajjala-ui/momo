// Pseudonymous device sessions for platforms without a trusted sign-in gateway.
// The cookie holds a random token; only its SHA-256 hash is stored.
import {cookies} from 'next/headers';

export const SESSION_COOKIE='momo_sid';
const TOKEN=/^[a-f0-9]{64}$/;

export async function sha256(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')}
export function newToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('')}

export async function sessionToken(){const t=(await cookies()).get(SESSION_COOKIE)?.value;return t&&TOKEN.test(t)?t:null}

export async function deviceUser(database:any){
  const token=await sessionToken();if(!token)return null;
  const row=await database.prepare('SELECT user_id,host FROM sessions WHERE token_hash=?').bind(await sha256(token)).first();
  if(!row)return null;
  return {userId:String(row.user_id),displayName:'',email:'',fullName:null,host:Number(row.host)===1};
}

export function sessionCookie(token:string,secure:boolean){return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=34560000${secure?'; Secure':''}`}
export function clearSessionCookie(secure:boolean){return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`}
