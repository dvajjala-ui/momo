// Owner-operated, loopback-only OAuth enrollment. Never sends an email.
import {createServer} from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const path=new URL('../.env.gmail.local',import.meta.url);
let file={};try{file=parseEnv(readFileSync(path,'utf8'))}catch{}
const settings={...process.env,...file};
const required=['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_SENDER'];
if(required.some(key=>!settings[key])){console.log('Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_SENDER privately to .env.gmail.local. No Google connection was attempted.');process.exitCode=1}
else if(!process.argv.includes('--connect')){console.log('Private sender settings are present. Run with --connect only when the owner is ready to authorize the dedicated Gmail mailbox. No Google connection was attempted.')}
else{
 const port=4287,redirect=`http://127.0.0.1:${port}/oauth/callback`,state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');let exchanging=false;
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const [key,value]of Object.entries({client_id:settings.GMAIL_CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:'openid email https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',login_hint:settings.GMAIL_SENDER,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(key,value);
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);res.end('Use the local enrollment page.');return}
  const request=new URL(req.url,`http://127.0.0.1:${port}`);
  if(request.pathname==='/'){res.end(`<h1>Connect Momo’s Gmail sender</h1><p>The owner must sign in to the dedicated Momo mailbox and review Google’s permissions. This grants sending and basic identity access. It does not grant inbox reading.</p><p><a href="${url.toString().replace(/&/g,'&amp;')}">Continue to Google</a></p><p>No email will be sent by this enrollment.</p>`);return}
  const received=request.searchParams.get('state')||'';if(request.pathname!=='/oauth/callback'||!/^[a-f0-9]{64}$/.test(received)||!timingSafeEqual(Buffer.from(received),Buffer.from(state))||exchanging){res.writeHead(400);res.end('Invalid or already-used enrollment. Restart the command.');return}
  if(request.searchParams.get('error')||!request.searchParams.get('code')){res.writeHead(400);res.end('Authorization was not completed. No connection saved.');return}exchanging=true;
  try{
   const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(15000),body:new URLSearchParams({client_id:settings.GMAIL_CLIENT_ID,client_secret:settings.GMAIL_CLIENT_SECRET,code:request.searchParams.get('code'),redirect_uri:redirect,grant_type:'authorization_code',code_verifier:verifier})});const result=await response.json();
   if(!response.ok||!result.refresh_token||!result.access_token||!String(result.scope||'').split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw Error('Authorization incomplete');
   const account=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+result.access_token},signal:AbortSignal.timeout(15000)});const user=await account.json();if(!account.ok||!user.email_verified||String(user.email).toLowerCase()!==settings.GMAIL_SENDER.toLowerCase())throw Error('Wrong sender');
   const privateSettings={...file,GMAIL_CLIENT_ID:settings.GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET:settings.GMAIL_CLIENT_SECRET,GMAIL_SENDER:settings.GMAIL_SENDER,GMAIL_REFRESH_TOKEN:result.refresh_token,EMAIL_PROVIDER:'gmail',EMAIL_SENDING_ENABLED:'false'};
   writeFileSync(path,Object.entries(privateSettings).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n',{mode:0o600});res.end('<h1>Momo sender authorized</h1><p>The private refresh token was saved only in the ignored local settings file. Sending remains disabled. Close this page; configure the private production settings before testing a reviewed letter.</p>');console.log('Dedicated sender authorized; ignored settings saved privately. Sending remains disabled.');server.close();
  }catch{res.writeHead(400);res.end('Sender authorization could not be saved. Check the exact mailbox, scopes and private client settings, then restart. No credentials are shown here.');console.log('Gmail enrollment did not complete. No sender credentials were printed.');server.close()}
 });server.listen(port,'127.0.0.1',()=>console.log(`Owner enrollment page: http://127.0.0.1:${port}/`));server.on('error',()=>{console.log('Local enrollment could not start. Check port 4287.');process.exitCode=1});const timer=setTimeout(()=>server.close(),10*60000);timer.unref();
}
