import {env} from 'cloudflare:workers';
import {db} from './momo-server';

export const PHONE_VERIFICATION_WINDOW=30*86400000;
const CHALLENGE_LIFETIME=10*60000;
const REQUEST_COOLDOWN=30000;
export function verificationSetup(){
  const e=env as unknown as Record<string,string>,number=String(e.WHATSAPP_VERIFICATION_NUMBER||'');
  return {available:/^\+[1-9]\d{7,14}$/.test(number)&&!!e.WHATSAPP_APP_SECRET&&!!e.WHATSAPP_VERIFY_TOKEN&&/^\d+$/.test(e.WHATSAPP_PHONE_NUMBER_ID||'')&&e.WHATSAPP_WEBHOOK_PUBLIC==='true',number};
}
async function digest(code:string){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function beginPhoneVerification(userId:string){
  const setup=verificationSetup();
  if(!setup.available)throw Error('WhatsApp verification is waiting for the business connection. Your request is saved.');
  const invite=await db().prepare('SELECT phone,consent FROM invites WHERE user_id=?').bind(userId).first<{phone:string,consent:string}>();
  if(!invite?.consent)throw Error('Save your invite request and consent first.');
  const now=Date.now(),expiresAt=now+CHALLENGE_LIFETIME;
  const code=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const result=await db().prepare('INSERT INTO phone_verifications(user_id,phone,code_hash,expires,created,verified_at) SELECT user_id,phone,?,?,?,NULL FROM invites WHERE user_id=? AND phone=? AND consent=? ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,code_hash=excluded.code_hash,expires=excluded.expires,created=excluded.created,verified_at=NULL WHERE phone_verifications.created<=?').bind(await digest(code),expiresAt,now,userId,invite.phone,invite.consent,now-REQUEST_COOLDOWN).run();
  if(!result.meta.changes)throw Error('Please wait 30 seconds before opening another verification message.');
  // The returned link goes only to this member. Codes never appear in the host inbox.
  return {ok:true,url:'https://wa.me/'+setup.number.slice(1)+'?text='+encodeURIComponent('MOMO VERIFY '+code),expiresAt};
}
// Call only after authenticating Meta's signature and configured sender ID.
export async function acceptPhoneVerification(from:unknown,text:unknown){
  if(typeof from!=='string'||!/^\d{8,15}$/.test(from)||typeof text!=='string')return false;
  const match=/^MOMO VERIFY ([a-f0-9]{32})$/i.exec(text.trim());
  if(!match)return false;
  const now=Date.now(),phone='+'+from;
  const result=await db().prepare('UPDATE phone_verifications SET verified_at=?,code_hash=NULL WHERE phone=? AND code_hash=? AND expires>? AND verified_at IS NULL AND EXISTS(SELECT 1 FROM invites i WHERE i.user_id=phone_verifications.user_id AND i.phone=phone_verifications.phone AND i.consent IS NOT NULL AND i.consent<>\'\')').bind(now,phone,await digest(match[1].toLowerCase()),now).run();
  return !!result.meta.changes;
}
export async function hasVerifiedPhone(userId:string,phone:string){
  return !!await db().prepare('SELECT user_id FROM phone_verifications WHERE user_id=? AND phone=? AND verified_at>=?').bind(userId,phone,Date.now()-PHONE_VERIFICATION_WINDOW).first();
}
