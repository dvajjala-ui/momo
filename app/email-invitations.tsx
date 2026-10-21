'use client';
import {useEffect,useState} from 'react';
import {api,session,type Run} from './client';
import {LETTER_STYLES,type LetterStyle} from './invitation';
import {useBrand} from './brand';
import type {InvitationEvent,EmailInviteRow} from '../lib/invitation-types';
type Receipt={reference:string,maskedEmail:string,city:string,eventTitle?:string,eventId?:string|null,status:string,deliveryStatus:string,verified:boolean};
type SignupProps={me:{emailInvite?:Receipt|null,emailConfigured?:boolean,signedIn?:boolean},busy:boolean,run:Run,refresh:()=>Promise<void>,notify:(message:string)=>void,letter:LetterStyle,setLetter:(style:LetterStyle)=>void,eventId:string|null,eventTitle?:string,requestsOpen:boolean};
type HostInvite=Pick<EmailInviteRow,'user_id'|'email'|'city'|'event_id'|'status'|'verified_at'|'nickname'|'food_theme'|'letter_style'>;
type InboxProps={host:{email?:{configured:boolean},emailInvites?:HostInvite[],emailDeliveries?:{user_id:string,event_id:string,status:string,error?:string|null}[]},event:InvitationEvent|undefined,busy:boolean,run:Run,loadHost:()=>Promise<void>,notify:(message:string)=>void};
type LetterPreview={userId:string,eventId:string,subject:string,html:string,text:string};

export function EmailLink({refresh}:{refresh:()=>Promise<void>}){
 const [link,setLink]=useState<{action:string,token:string}|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 useEffect(()=>{const readLink=()=>{const match=location.hash.match(/^#email-(confirm|unsubscribe)=([a-f0-9]{64})$/);if(match){setLink({action:match[1],token:match[2]});setDone(false);setMessage('');history.replaceState(null,'',location.pathname+location.search)}};readLink();window.addEventListener('hashchange',readLink);return()=>window.removeEventListener('hashchange',readLink)},[]);
 if(!link)return null;
 return <section className="card email-confirm" aria-labelledby="email-link-title"><span className="eyebrow">A NOTE FROM YOUR INBOX</span><h2 id="email-link-title">{link.action==='confirm'?'Shall we write to you?':'Leave the letter list?'}</h2><p>{link.action==='confirm'?'Confirm that this email belongs to you. Invitations only start after a host reviews your request.':'This removes the email request for this letter. Your nickname and chats stay at the table.'}</p>{!done&&<button className="button blue" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{const r=await fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(link)});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Please try again.');setDone(true);setLink({...link,token:''});setMessage(link.action==='confirm'?'Email confirmed. Your request is ready for the host to review.':'You’ve left the email list.');await refresh()}catch(error){setMessage(error instanceof Error?error.message:'Please try again.')}finally{setBusy(false)}}}>{busy?'One moment…':link.action==='confirm'?'Confirm my email':'Leave the email list'}</button>}{message&&<p role="status">{message}</p>}</section>;
}

export default function EmailSignup({me,busy,run,refresh,notify,letter,setLetter,eventId,eventTitle,requestsOpen}:SignupProps){
 const {theme}=useBrand();
 const [accepted,setAccepted]=useState(false),[editing,setEditing]=useState(false);
 const receipt=me.emailInvite;
 const changingPlan=!!receipt&&(receipt.eventId||null)!==eventId;
 const showForm=requestsOpen&&(!receipt||editing||changingPlan);
 const status=receipt?.status;
 const nextStep=status==='declined'
   ? {title:'This request could not be accommodated',body:'Your place is not confirmed. You can explore another plan or leave the list.'}
   : !receipt?.verified
     ? {title:me.emailConfigured?'Next: confirm your email':'Saved · email letters are not open yet',body:me.emailConfigured?'Confirm the inbox belongs to you before the host can send an invitation.':'Your request is in the host notebook. No email has been sent; the confirmation step will appear here when letters open.'}
     : status==='confirmed'
       ? {title:'Your place is confirmed with the host',body:'Review the plan details and any notes from the host before you travel. Contact the host if you can no longer come.'}
       : status==='invited'
         ? {title:'An invitation was sent to the email provider',body:'Check your inbox and spam folder for the plan. Provider acceptance does not confirm delivery or your attendance; agree your place with the host.'}
         : status==='reviewed'
           ? {title:'The host has reviewed your request',body:'Your email is confirmed. Keep an eye on your inbox and this page for the invitation; your place is not confirmed yet.'}
           : {title:'Email confirmed · waiting for host review',body:'Your request is ready for the host. Your place is not confirmed yet, and there is no payment to make here.'};
 const form=showForm&&<form className="email-request-form" onSubmit={e=>{
   e.preventDefault();const f=new FormData(e.currentTarget);
   void run(async()=>{
     if(!me.signedIn)await session('start');
     await api('emailInvite',{email:f.get('email'),city:f.get('city'),consent:f.get('consent')==='on',letterStyle:letter,foodTheme:theme,eventId});
     setAccepted(false);setEditing(false);await refresh();notify('Your request is saved. Check the next step below.');
   });
 }}>
   <h3>{receipt?'Update your request':'Where should your letter go?'}</h3>
   {changingPlan&&<p className="request-change-warning" role="status">You already have a request for <b>{receipt.eventTitle||'the general interest list'}</b>. Submitting replaces that request with <b>{eventTitle||'the general interest list'}</b>. You have one invitation request at a time.</p>}
   <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/></label>
   {receipt&&<p className="hint">Enter your email again to update. Using the same address keeps its confirmation; a new address needs a new check.</p>}
   <label>Your city<input name="city" required minLength={2} maxLength={60} defaultValue={receipt?.city||'Ahmedabad'} placeholder="Where should we meet?"/></label>
   <fieldset className="letter-choice"><legend>Which letter feels like you?</legend>{LETTER_STYLES.map(s=><label key={s.id} className={'letter-radio ls-'+s.id}><input type="radio" name="letterStyle" value={s.id} checked={letter===s.id} onChange={()=>setLetter(s.id)}/><b>{s.name}</b><small>{s.note}</small></label>)}</fieldset>
   <label className="check"><input name="consent" type="checkbox" required/>I agree to receive Momo weekend letters by email and have read the <a href="#privacy">privacy notice</a>. I can leave anytime.</label>
   <button className="button blue full" disabled={busy}>{busy?'Saving…':receipt?'Update my request':'Save my request'}</button>
   <p className="hint">{!me.signedIn?'Submitting also opens a private seat on this device. ':''}Saving does not send a letter or confirm a booking. You choose when to request the confirmation email.</p>
   {editing&&!changingPlan&&<button type="button" className="textbutton" disabled={busy} onClick={()=>setEditing(false)}>Keep my current request</button>}
 </form>;
 return <>
   {receipt&&<section className="request-receipt" aria-labelledby="request-next-step">
     <span className="eyebrow">YOUR SAVED REQUEST · {receipt.reference}</span>
     <h3 id="request-next-step">{nextStep.title}</h3><p>{nextStep.body}</p>
     <ol className="request-progress" aria-label="Invitation progress">
       <li className="done">Request saved</li>
       <li className={receipt.verified?'done':''}>{receipt.verified?'Email confirmed':'Email check pending'}</li>
       <li className={status==='confirmed'?'done':''}>{status==='declined'?'Request closed':status==='confirmed'?'Place confirmed':'Host confirmation pending'}</li>
     </ol>
     <dl><div><dt>Email</dt><dd>{receipt.maskedEmail}</dd></div><div><dt>City</dt><dd>{receipt.city}</dd></div><div><dt>Plan</dt><dd>{receipt.eventTitle||'First meetup interest list'}</dd></div></dl>
     {!receipt.verified&&status!=='declined'&&me.emailConfigured&&<div className="phone-verification">
       <p>{accepted?'The provider accepted your confirmation letter. Check your inbox and spam folder; delivery is not yet confirmed.':'Request a confirmation link. It expires in 30 minutes.'}</p>
       <button type="button" className="button blue" disabled={busy} onClick={()=>void run(async()=>{await api('verifyEmail');setAccepted(true);await refresh()})}>{accepted?'Request another confirmation':'Send my confirmation link'}</button>
     </div>}
     {['failed','unknown'].includes(receipt.deliveryStatus)&&<p className="request-change-warning">The invitation attempt needs a host check. No automatic resend has been made. Your saved request is still here.</p>}
     <div className="actions">
       {requestsOpen&&!changingPlan&&!editing&&<button type="button" className="button" disabled={busy} onClick={()=>setEditing(true)}>Change my request</button>}
       <a className="hand-link" href="/chat">Visit Adda →</a>
       <button type="button" className="textbutton" disabled={busy} onClick={()=>void run(async()=>{await api('withdrawEmail');setAccepted(false);setEditing(false);await refresh();notify('You’ve left the email list. Your email address was removed.')})}>Leave the email list</button>
     </div>
   </section>}
   {form}
 </>;
}

export function EmailInbox({host,event,busy,run,loadHost,notify}:InboxProps){
 const [preview,setPreview]=useState<LetterPreview|null>(null);
 return <section className="email-host"><span className="eyebrow">LETTERS FROM MOMO</span><h2>Email · {host.email?.configured?'sender configured':'sender waiting'}</h2><p>{host.email?.configured?'Review a request, preview its letter, then send it once. Accepted means the provider received it; delivery has not been verified.':'Email letters are our first invitation channel. Requests and previews work now; sending waits for a verified email sender.'}</p><p className="hint">Selected plan: {event?.title||'Publish a real plan first'}. No letters are sent automatically.</p>{!host.emailInvites?.length&&<p>No email requests yet.</p>}{host.emailInvites?.map(i=>{const delivery=host.emailDeliveries?.find(d=>d.user_id===i.user_id&&d.event_id===event?.id);const wrongPlan=!!i.event_id&&i.event_id!==event?.id;return <article className="host-inbox-card" key={i.user_id}><div className="section-head"><h3>{i.nickname||'A new person at the table'}</h3><span className="status-badge">{i.status}</span></div><dl><dt>Email</dt><dd>{i.email}</dd><dt>City</dt><dd>{i.city}</dd><dt>Email check</dt><dd>{i.verified_at?'Confirmed':'Not confirmed'}</dd><dt>Food edition</dt><dd>{i.food_theme==='menu'?'Whole menu':'Momo'}</dd><dt>Letter style</dt><dd>{i.letter_style}</dd><dt>Email attempt</dt><dd>{delivery?.status||'Not sent'}{delivery?.error&&' · '+delivery.error}</dd></dl>{wrongPlan&&<p className="hint">This request is for a different plan. Choose that plan before sending.</p>}<div className="actions"><button className="button" disabled={busy} onClick={()=>run(async()=>{await api('emailRequestStatus',{userId:i.user_id,status:'reviewed'});await loadHost()})}>Mark reviewed</button><button className="button" disabled={busy||!event} onClick={()=>run(async()=>{if(!event)return;setPreview(await api<LetterPreview>('previewEmail',{userId:i.user_id,eventId:event.id}))})}>Preview their letter</button><button className="button blue" disabled={busy||!event||!host.email?.configured||!i.verified_at||wrongPlan||!['reviewed','confirmed','invited'].includes(i.status)||!!delivery||preview?.userId!==i.user_id||preview?.eventId!==event.id} onClick={()=>run(async()=>{if(!event)return;await api('sendEmail',{userId:i.user_id,eventId:event.id});await loadHost();notify('The email provider accepted the letter. Delivery is not yet confirmed.')})}>Send this email letter</button><select aria-label="Set email request status" value={i.status} disabled={busy} onChange={e=>run(async()=>{await api('emailRequestStatus',{userId:i.user_id,status:e.target.value});await loadHost()})}><option value="requested">Requested</option><option value="reviewed">Reviewed</option><option value="invited" disabled>Invited</option><option value="confirmed">Confirmed with person</option><option value="declined">Declined</option></select></div></article>})}{preview&&preview.eventId===event?.id&&<div className="email-preview"><h3>Letter preview</h3><p>Subject: {preview.subject}</p><iframe title="Momo email letter preview" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html}/><details><summary>Plain text version</summary><pre>{preview.text}</pre></details><button className="textbutton" onClick={()=>setPreview(null)}>Close preview</button></div>}</section>;
}
