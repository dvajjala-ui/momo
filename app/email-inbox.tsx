'use client';
import {useState} from 'react';
import {api,type Run} from './client';
import {useCurrentTime} from './use-current-time';
import {filterInbox,inboxEntries,inboxMatches,REQUEST_LABELS,type InboxFilter,type InboxScope} from '../lib/request-inbox';
import type {HostEmailRequest,InvitationEvent} from '../lib/invitation-types';

type Delivery={user_id:string;event_id:string;status:string;error?:string|null};
type Props={host:{email?:{configured:boolean};emailInvites?:HostEmailRequest[];emailInvitesTruncated?:boolean;emailDeliveries?:Delivery[]};event:InvitationEvent|undefined;busy:boolean;run:Run;loadHost:()=>Promise<void>;notify:(message:string)=>void;onSelectPlan:(id:string)=>void};
type LetterPreview={userId:string;eventId:string;requestVersion:string;letterVersion:string;subject:string;html:string;text:string};
const FILTERS:{id:InboxFilter;label:string}[]=[{id:'all',label:'All stages'},{id:'requested',label:'Needs review'},{id:'reviewed',label:'Reviewed'},{id:'confirmed',label:'Place confirmed'},{id:'invited',label:'Letter accepted'},{id:'declined',label:'Closed'},{id:'unverified',label:'Email check pending'},{id:'attention',label:'Attempt needs a check'}];
const dateLabel=(date:number)=>new Date(date).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})+' IST';

export default function EmailInbox({host,event,busy,run,loadHost,notify,onSelectPlan}:Props){
 const[preview,setPreview]=useState<LetterPreview|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState<InboxFilter>('all'),[scope,setScope]=useState<InboxScope>('selected');
 const now=useCurrentTime(),requests=host.emailInvites||[],deliveries=host.emailDeliveries||[];
 const entries=inboxEntries(requests,deliveries,event?.id,scope),visible=filterInbox(entries,filter,query);
 const upcoming=!!event&&Number.isFinite(Date.parse(event.date))&&Date.parse(event.date)>now;
 const activePreview=preview&&event?.id===preview.eventId&&visible.some(({request:i})=>i.user_id===preview.userId&&i.requestVersion===preview.requestVersion)?preview:null;
 async function changeStatus(i:HostEmailRequest,status:string){
  try{await api('emailRequestStatus',{userId:i.user_id,status,requestVersion:i.requestVersion});setPreview(null);notify('Request status saved. No message was sent.')}finally{await loadHost()}
 }
 return <section className="email-host" aria-labelledby="email-inbox-heading">
  <span className="eyebrow">LETTERS FROM MOMO</span><h2 id="email-inbox-heading">Email · {host.email?.configured?'sender configured':'sender waiting'}</h2>
  <p>{host.email?.configured?'Review a request, preview its letter, then send it once. Accepted means the provider received it; delivery has not been verified.':'Requests and previews work now; sending waits for a verified email sender.'}</p>
  <p className="hint">Selected plan: {event?.title||'Choose or publish a real plan'}. A host decision and an email attempt are separate. No letters are sent automatically.</p>
  <div className="inbox-toolbar">
   <label>Requests for<select value={scope} disabled={busy} onChange={e=>setScope(e.target.value as InboxScope)}><option value="selected">Selected plan</option><option value="interest">General interest list</option><option value="all">All loaded requests</option></select></label>
   <label>Stage<select value={filter} onChange={e=>setFilter(e.target.value as InboxFilter)}>{FILTERS.map(f=><option key={f.id} value={f.id}>{f.label} ({entries.filter(i=>inboxMatches(i,f.id)).length})</option>)}</select></label>
   <label>Find a request<input type="search" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder="Nickname, email, city or plan"/></label>
   <button type="button" className="button" disabled={busy} onClick={()=>void run(loadHost)}>Refresh inbox</button>
  </div>
  <p className="hint" role="status">{visible.length} shown of {entries.length} in this view · {requests.length} loaded. Attempts needing a check first, then oldest requests awaiting review.</p>
  {host.emailInvitesTruncated&&<p className="request-change-warning">This notebook contains the newest 200 requests. Counts and search cover those loaded requests only; older requests need a separate host review. Full inbox pagination is still pending.</p>}
  {!requests.length?<p>No email requests yet.</p>:!visible.length&&<div className="inbox-empty"><p>{!entries.length?scope==='selected'?'No requests for this selected plan. General interest has its own list.':'No requests in this view.':'No requests match these filters.'}</p><button type="button" className="textbutton" onClick={()=>{setScope('all');setFilter('all');setQuery('')}}>Show all loaded requests</button></div>}
  {visible.map(({request:i})=>{
   const delivery=deliveries.find(d=>d.user_id===i.user_id&&d.event_id===(i.event_id||event?.id)),wrongPlan=!!i.event_id&&i.event_id!==event?.id;
   const previewReady=activePreview?.userId===i.user_id;
   const sendReady=upcoming&&!wrongPlan&&host.email?.configured&&!!i.verified_at&&['reviewed','confirmed','invited'].includes(i.status)&&!delivery&&previewReady;
   return <article className="host-inbox-card" key={i.user_id}>
    <div className="section-head"><h3>{i.nickname||'A new person at the table'}</h3><span className="status-badge">{REQUEST_LABELS[i.status]||'Needs host check'}</span></div>
    <dl><dt>Requested plan</dt><dd>{i.event_id?i.event_title||'Plan no longer available':'General interest · no plan chosen'}</dd><dt>Email</dt><dd>{i.email}</dd><dt>City</dt><dd>{i.city}</dd><dt>Email check</dt><dd>{i.verified_at?'Confirmed':'Not confirmed'}</dd><dt>Requested</dt><dd>{dateLabel(i.created)}</dd><dt>Last updated</dt><dd>{dateLabel(i.updated)}</dd><dt>Food edition</dt><dd>{i.food_theme==='menu'?'Whole menu':'Momo'}</dd><dt>Letter style</dt><dd>{i.letter_style}</dd><dt>Email attempt</dt><dd>{delivery?.status||'Not sent'}{delivery?.error&&' · '+delivery.error}</dd></dl>
    {wrongPlan&&<p className="hint">Choose this person’s requested plan before previewing or sending. <button type="button" className="textbutton" disabled={busy} onClick={()=>{onSelectPlan(i.event_id!);setScope('selected');setPreview(null)}}>Select requested plan</button></p>}
    {!i.event_id&&<p className="hint">This is general interest. Ask them to request a published plan before confirming a place. A letter can invite them to the selected plan.</p>}
    {delivery&&<p className="hint">This plan already has an email attempt. Check its outcome; sending it again is blocked.</p>}
    <div className="actions">
     <button className="button" disabled={busy||i.status!=='requested'} onClick={()=>void run(()=>changeStatus(i,'reviewed'))}>Mark reviewed</button>
     <label className="inbox-status-control">Host decision<select value={i.status} disabled={busy} onChange={e=>void run(()=>changeStatus(i,e.target.value))}><option value="requested">Needs review</option><option value="reviewed">Reviewed</option><option value="invited" disabled>Letter accepted</option><option value="confirmed" disabled={!i.event_id}>Confirmed with person</option><option value="declined">Close request</option></select></label>
     <button className="button" disabled={busy||!upcoming||wrongPlan} onClick={()=>void run(async()=>{if(!event)return;setPreview(await api<LetterPreview>('previewEmail',{userId:i.user_id,eventId:event.id}))})}>Preview their letter</button>
     <button className="button blue" disabled={busy||!sendReady} onClick={()=>void run(async()=>{if(!event||!activePreview)return;try{await api('sendEmail',{userId:i.user_id,eventId:event.id,requestVersion:activePreview.requestVersion,letterVersion:activePreview.letterVersion});notify('The email provider accepted the letter. Delivery is not yet confirmed.')}finally{setPreview(null);await loadHost()}})}>Send this email letter</button>
    </div>
    {upcoming&&!wrongPlan&&!delivery&&!previewReady&&<p className="hint">Preview the current letter before sending. Changes to the request need a fresh preview.</p>}
   </article>;
  })}
  {activePreview&&<div className="email-preview"><h3>Letter preview</h3><p>Subject: {activePreview.subject}</p><iframe title="Momo email letter preview" sandbox="" referrerPolicy="no-referrer" srcDoc={activePreview.html}/><details><summary>Plain text version</summary><pre>{activePreview.text}</pre></details><button className="textbutton" onClick={()=>setPreview(null)}>Close preview</button></div>}
 </section>;
}
