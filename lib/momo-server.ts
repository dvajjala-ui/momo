import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {deviceUser} from './device-session';
export function db(){if(!env.DB)throw new Error('Community storage is temporarily unavailable.');return env.DB}
export function bucket(){if(!env.BUCKET)throw new Error('Photo storage is temporarily unavailable.');return env.BUCKET}
// The hosted ChatGPT Site injects trusted identity headers. Anywhere else (Vercel), those headers
// could be forged, so identity comes only from our own device session cookie.
export const platform=():'vercel'|'sites'=>(env as any).MOMO_PLATFORM==='vercel'?'vercel':'sites';
export async function identity():Promise<{userId:string,email:string,displayName:string,fullName:string|null,host?:boolean}|null>{return platform()==='vercel'?deviceUser(db()):getChatGPTUser()}
export function isAdmin(user:any){if(!user)return false;if(platform()==='vercel')return user.host===true;const emails=((env as any).ADMIN_EMAILS||'').split(',').map((x:string)=>x.trim().toLowerCase()).filter(Boolean);return !!user.email&&emails.includes(user.email.toLowerCase())}
export function photosEnabled(){return !!env.BUCKET}
export function json(data:any,status=200,extra:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}})}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !!origin&&origin===new URL(req.url).origin}
export function str(x:unknown,min:number,max:number){if(typeof x!=='string'||x.trim().length<min||x.trim().length>max)throw new Error(`Please enter between ${min} and ${max} characters.`);return x.trim()}
export async function readBounded(req:Request,limit:number){if(Number(req.headers.get('content-length')||0)>limit)throw new Error('Please use a smaller request.');const reader=req.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let length=0;while(true){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new Error('Please use a smaller request.')}chunks.push(value)}const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}return data}
export async function requestReference(id:string,created:number){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id+':'+created));return 'MM-'+Array.from(new Uint8Array(bytes)).slice(0,5).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
