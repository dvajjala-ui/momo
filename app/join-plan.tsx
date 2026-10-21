import {CalendarDays,MapPin,Utensils} from 'lucide-react';
import Link from 'next/link';
import type {InvitationEvent} from '../lib/invitation-types';

export default function JoinPlan({event,expired}:{event:InvitationEvent;expired:boolean}){
  return <section className="join-plan" aria-labelledby="join-plan-title">
    <span className="eyebrow">{expired?'THIS PLAN HAS STARTED':'THE PLAN YOU CHOSE'}</span>
    <h2 id="join-plan-title">{event.title}</h2>
    <p className="plan-description">{event.description}</p>
    <dl>
      <div><dt><CalendarDays size={17}/>When</dt><dd>{new Date(event.date).toLocaleString('en-IN',{dateStyle:'full',timeStyle:'short',timeZone:'Asia/Kolkata'})} IST</dd></div>
      <div><dt><MapPin size={17}/>Public venue</dt><dd>{event.venue}</dd></div>
      <div><dt><Utensils size={17}/>Full cost</dt><dd>{event.cost}</dd></div>
    </dl>
    <p className="hint">{expired?'New requests for this plan are closed. Your existing request remains available below.':'An invitation request is an expression of interest. The host confirms your place separately. Momo collects no payment here.'}</p>
    {expired&&<Link prefetch={false} className="hand-link" href="/#the-plan">Find an upcoming plan →</Link>}
  </section>;
}
