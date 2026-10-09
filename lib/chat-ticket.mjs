const encoder=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const key=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
export async function signChatTicket(secret,claims){
  const body=encode(encoder.encode(JSON.stringify(claims)));
  return body+'.'+encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(body))));
}
export async function verifyChatTicket(secret,ticket,origin,now=Date.now()){
  try{
    if(typeof ticket!=='string'||ticket.length>2048)return null;
    const parts=ticket.split('.');if(parts.length!==2)return null;
    if(!await crypto.subtle.verify('HMAC',await key(secret),decode(parts[1]),encoder.encode(parts[0])))return null;
    const claims=JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if(claims.v!==1||typeof claims.userId!=='string'||!claims.userId||claims.userId.length>150||typeof claims.admin!=='boolean'||claims.origin!==origin||!Number.isSafeInteger(claims.expires)||claims.expires<=now||claims.expires>now+30000)return null;
    return claims;
  }catch{return null}
}
