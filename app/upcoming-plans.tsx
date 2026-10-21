'use client';
import {useState} from 'react';
import {CalendarDays,MapPin,Search,Utensils} from 'lucide-react';
import type {InvitationEvent} from '../lib/invitation-types';
import {upcomingPlans} from '../lib/plan-discovery';
import CopyPlanLink from './copy-plan-link';
import type {Run} from './client';

export type PlansState='loading'|'ready'|'error';
export default function UpcomingPlans({events,now,state,busy,run,reload,hasRequest}:{events:InvitationEvent[];now:number;state:PlansState;busy:boolean;run:Run;reload:()=>Promise<void>;hasRequest:boolean}){
  const[query,setQuery]=useState(''),[expanded,setExpanded]=useState(false);
  if(state!=='ready')return <div className="plan-load-state" role="status"><h3>{state==='loading'?'Opening the plans…':'The plans could not load.'}</h3><p>{state==='loading'?'Checking the latest dates and places.':'Please retry to see the published plans and wish wall.'}</p>{state==='error'&&<button className="button" disabled={busy} onClick={()=>void run(reload)}>Try again</button>}</div>;
  const all=upcomingPlans(events,now),matching=upcomingPlans(events,now,query),searching=!!query.trim();
  const visible=searching||expanded?matching:matching.slice(0,3);
  return <div className="plan-browser" id="upcoming-plans">
    {!!all.length&&<div className="plan-browser-head"><h3>Upcoming plans</h3><p className="hint" role="status" aria-live="polite">{searching?`${matching.length} of ${all.length} plans match`:`${all.length} upcoming ${all.length===1?'plan':'plans'}`} · times in IST</p></div>}
    {(all.length>3||searching)&&<div className="plan-search"><label><span><Search size={16}/>Find a plan</span><input type="search" maxLength={120} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try a place, activity or cost"/></label>{searching&&<button className="textbutton" onClick={()=>setQuery('')}>Clear search</button>}</div>}
    <div className="plans">{visible.map(event=><article className="plan-card" key={event.id}><span className="torn-label">HOSTED PLAN</span><h3>{event.title}</h3><p>{event.description.split(/\n\s*\n/)[0].slice(0,220)}{event.description.split(/\n\s*\n/)[0].length>220?'…':''}</p><div className="event-meta"><span><CalendarDays size={17}/>{new Date(event.date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})} IST</span><span><MapPin size={17}/>{event.venue}</span><span><Utensils size={17}/>{event.cost}</span></div><a href={'/join?event='+encodeURIComponent(event.id)} className="button blue">Ask for a seat</a><CopyPlanLink eventId={event.id}/></article>)}</div>
    {!all.length&&<article className="plan-card"><span className="torn-label">THE NEXT TABLE</span><h3>No upcoming plan is published yet.</h3><p>Join the Ahmedabad interest list. The host shares a real date, public venue and full cost before you decide.</p><a href="/join" className="button blue">{hasRequest?'Check my spot':'Keep me in the loop'}</a><small>Interest list only. No booking or payment.</small></article>}
    {!!all.length&&!matching.length&&<div className="plan-load-state"><h3>No plans match that search.</h3><p>Try another place or activity, or clear the search to see the published plans.</p><button className="button" onClick={()=>setQuery('')}>Show upcoming plans</button></div>}
    {!searching&&all.length>3&&<button className="button plan-more" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show fewer plans':`See all ${all.length} upcoming plans`}</button>}
  </div>;
}
