import {env} from 'cloudflare:workers';
type Letter={subject:string,html:string,text:string};
function base64(value:string){const bytes=new TextEncoder().encode(value);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
function folded(value:string){return base64(value).match(/.{1,76}/g)?.join('\r\n')||''}
function subjectHeader(value:string){const chunks:string[]=[];let chunk='';for(const char of value.replace(/[\r\n]/g,' ')){if(new TextEncoder().encode(chunk+char).length>45){chunks.push(chunk);chunk=''}chunk+=char}if(chunk)chunks.push(chunk);return chunks.map(c=>'=?UTF-8?B?'+base64(c)+'?=').join('\r\n ')}
function gmailMime(to:string,letter:Letter,key:string){
 const sender=String((env as unknown as Record<string,string>).GMAIL_SENDER);if(/[\r\n<>]/.test(to+sender))throw Error('Please check the email address.');const boundary='momo_'+crypto.randomUUID().replace(/-/g,'');
 const raw=[`From: Momo <${sender}>`,`To: ${to}`,`Subject: ${subjectHeader(letter.subject)}`,`Message-ID: <${key.replace(/[^a-zA-Z0-9]/g,'')}@momo.local>`,`Date: ${new Date().toUTCString()}`,'MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',folded(letter.text),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',folded(letter.html),`--${boundary}--`,''].join('\r\n');return base64(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function gmailAccess(){
 const e=env as unknown as Record<string,string>;let response:Response;
 try{response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:e.GMAIL_CLIENT_ID,client_secret:e.GMAIL_CLIENT_SECRET,refresh_token:e.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'})})}catch{throw Error('Please reconnect the Gmail sender; Google could not be reached.')}
 const result=await response.json().catch(()=>({})) as {access_token?:string,scope?:string};if(!response.ok||!result.access_token)throw Error('Please reconnect the Gmail sender; Google rejected its authorization.');if(result.scope&&!result.scope.split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw Error('Please authorize Gmail sending for the Momo mailbox.');
 // Check the actual token owner with only openid/email; never read the inbox.
 let account:Response;try{account=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${result.access_token}`},signal:AbortSignal.timeout(15000)})}catch{throw Error('Please reconnect the Momo mailbox; its identity could not be checked.')}
 const user=await account.json().catch(()=>({})) as {email?:string,email_verified?:boolean};if(!account.ok||user.email_verified!==true||user.email?.toLowerCase()!==String(e.GMAIL_SENDER).toLowerCase())throw Error('Please connect the exact Momo Gmail address with openid, email and send permissions.');return result.access_token;
}
export async function deliverEmail(to:string,letter:Letter,key:string,provider:string){
 const e=env as unknown as Record<string,string>;const gmail=provider==='gmail',access=gmail?await gmailAccess():e.RESEND_API_KEY;let response:Response;
 try{response=await fetch(gmail?'https://gmail.googleapis.com/gmail/v1/users/me/messages/send':'https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json',...(gmail?{}:{'Idempotency-Key':key})},body:JSON.stringify(gmail?{raw:gmailMime(to,letter,key)}:{from:e.EMAIL_FROM,to:[to],...letter})})}catch{throw Error('Email outcome unknown. Check the provider before trying again.')}
 const result=await response.json().catch(()=>({})) as {id?:string};if(!response.ok){if(response.status>=500)throw Error('Email outcome unknown. Check the provider before trying again.');throw Error(`Email provider rejected the request (${response.status}).`)}if(typeof result.id!=='string'||!result.id)throw Error('Email outcome unknown. The provider returned no identifier.');return result.id;
}
