'use client';
import {useEffect,useState} from 'react';
import {api,session,type Run} from './client';
import {LETTER_STYLES,type LetterStyle} from './invitation';
import {useBrand} from './brand';
import {requestNextStep} from '../lib/request-inbox';
export {default as EmailInbox} from './email-inbox';
type Receipt={reference:string,maskedEmail:string,city:string,eventTitle?:string,eventId?:string|null,status:string,deliveryStatus:string,verified:boolean};
type SignupProps={me:{emailInvite?:Receipt|null,emailConfigured?:boolean,signedIn?:boolean},busy:boolean,run:Run,refresh:()=>Promise<void>,notify:(message:string)=>void,letter:LetterStyle,setLetter:(style:LetterStyle)=>void,eventId:string|null,eventTitle?:string,requestsOpen:boolean};
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
 const placeConfirmed=status==='confirmed'&&!!receipt?.eventId;
 const nextStep=receipt?requestNextStep(receipt,!!me.emailConfigured):null;
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
   {receipt&&<p className="request-change-warning">Updating sends this request back for host review and clears any previous place confirmation. Contact the host first if you have already agreed to come.</p>}
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
     <h3 id="request-next-step">{nextStep?.title}</h3><p>{nextStep?.body}</p>
     <ol className="request-progress" aria-label="Invitation progress">
       <li className="done">Request saved</li>
       <li className={receipt.verified?'done':''}>{receipt.verified?'Email confirmed':'Email check pending'}</li>
       <li className={placeConfirmed?'done':''}>{status==='declined'?'Request closed':placeConfirmed?'Place confirmed':'Host confirmation pending'}</li>
     </ol>
     <dl><div><dt>Email</dt><dd>{receipt.maskedEmail}</dd></div><div><dt>City</dt><dd>{receipt.city}</dd></div><div><dt>Plan</dt><dd>{receipt.eventTitle||'First meetup interest list'}</dd></div></dl>
     {!receipt.verified&&status!=='declined'&&me.emailConfigured&&<div className="phone-verification">
       <p>{accepted?'The provider accepted your confirmation letter. Check your inbox and spam folder; delivery is not yet confirmed.':'Request a confirmation link. It expires in 30 minutes.'}</p>
       <button type="button" className="button blue" disabled={busy} onClick={()=>void run(async()=>{await api('verifyEmail');setAccepted(true);await refresh()})}>{accepted?'Request another confirmation':'Send my confirmation link'}</button>
     </div>}
     {['failed','unknown'].includes(receipt.deliveryStatus)&&<p className="request-change-warning">The invitation attempt needs a host check. No automatic resend has been made. Your saved request is still here.</p>}
     {placeConfirmed&&<p className="hint">Withdrawing removes this saved place confirmation. Contact the host too if arrangements have already been made.</p>}
     <div className="actions">
       {requestsOpen&&!changingPlan&&!editing&&<button type="button" className="button" disabled={busy} onClick={()=>setEditing(true)}>Change my request</button>}
       <a className="hand-link" href="/chat">Visit Adda →</a>
       <button type="button" className="textbutton" disabled={busy} onClick={()=>void run(async()=>{await api('withdrawEmail');setAccepted(false);setEditing(false);await refresh();notify('Your email request and any saved place confirmation were removed.')})}>{placeConfirmed?'Withdraw my confirmed request':'Leave the email list'}</button>
     </div>
   </section>}
   {form}
 </>;
}
