import type {HostEmailRequest} from './invitation-types';

export const REQUEST_LABELS:Record<string,string>={requested:'Needs review',reviewed:'Reviewed · place not confirmed',invited:'Letter accepted · place not confirmed',confirmed:'Place confirmed with person',declined:'Request closed'};
export type InboxFilter='all'|'requested'|'reviewed'|'confirmed'|'invited'|'declined'|'unverified'|'attention';
export type InboxScope='selected'|'interest'|'all';
type Delivery={user_id:string;event_id:string;status:string};
type Entry={request:HostEmailRequest;delivery:Delivery|undefined};
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g,' ').trim();
export const deliveryNeedsAttention=(delivery:Delivery|undefined)=>!!delivery&&['failed','unknown','sending'].includes(delivery.status);
export function inboxEntries(requests:HostEmailRequest[],deliveries:Delivery[],eventId:string|undefined,scope:InboxScope):Entry[]{
 return requests.filter(i=>scope==='all'||(scope==='interest'?!i.event_id:!!eventId&&i.event_id===eventId)).map(request=>({request,delivery:deliveries.find(d=>d.user_id===request.user_id&&d.event_id===(request.event_id||eventId))}));
}
export function inboxMatches(entry:Entry,filter:InboxFilter){return filter==='all'||(filter==='unverified'?!entry.request.verified_at:filter==='attention'?deliveryNeedsAttention(entry.delivery):entry.request.status===filter)}
export function filterInbox(entries:Entry[],filter:InboxFilter,query:string){
 const search=normalize(query);
 return entries.filter(entry=>inboxMatches(entry,filter)&&(!search||normalize([entry.request.nickname,entry.request.email,entry.request.city,entry.request.event_title,entry.request.event_id?entry.request.event_id:'General interest list'].filter(Boolean).join(' ')).includes(search))).sort((a,b)=>{
  const priority=(entry:Entry)=>deliveryNeedsAttention(entry.delivery)?0:entry.request.status==='requested'?1:entry.request.status==='reviewed'?2:3;
  return priority(a)-priority(b)||a.request.created-b.request.created||a.request.user_id.localeCompare(b.request.user_id);
 });
}

export function requestNextStep(receipt:{status:string;verified:boolean;eventId?:string|null},emailConfigured:boolean){
 if(receipt.status==='declined')return {title:'This request could not be accommodated',body:'Your place is not confirmed. You can explore another plan or leave the list.'};
 if(receipt.status==='confirmed'&&receipt.eventId)return {title:'Your place is confirmed with the host',body:'Review the plan details and any notes from the host before you travel. Contact the host if you can no longer come.'};
 if(!receipt.verified)return {title:emailConfigured?'Next: confirm your email':'Saved · email letters are not open yet',body:emailConfigured?'Confirm the inbox belongs to you before the host can send an invitation.':'Your request is in the host notebook. No email has been sent; the confirmation step will appear here when letters open.'};
 if(receipt.status==='invited')return {title:'An invitation was sent to the email provider',body:'Check your inbox and spam folder for the plan. Provider acceptance does not confirm delivery or your attendance; agree your place with the host.'};
 if(receipt.status==='reviewed'||receipt.status==='confirmed')return {title:'The host has reviewed your request',body:'Your email is confirmed. Keep an eye on your inbox and this page for the invitation; your place is not confirmed yet.'};
 return {title:'Email confirmed · waiting for host review',body:'Your request is ready for the host. Your place is not confirmed yet, and there is no payment to make here.'};
}
