'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation avoids a verified Vinext Link transition failure in the group overview. */
import {CalendarDays,MapPin,MessageCircle,RefreshCw,Users} from 'lucide-react';
import {api,type Run} from './client';
import type {GangRoom} from './community-types';

export default function YourGangs({gangs,busy,run,reload}:{gangs:GangRoom[];busy:boolean;run:Run;reload:()=>Promise<void>}){
  return <section className="your-gangs" id="your-gangs" aria-labelledby="your-gangs-title">
    <div className="your-gangs-heading"><div><span className="handwritten">your little corner.</span><h2 id="your-gangs-title">Your gangs <small>{gangs.length}/3</small></h2></div><button className="button small" disabled={busy} onClick={()=>void run(reload)}><RefreshCw size={15}/>Refresh</button></div>
    <p className="hint">{gangs.length>=3?'Your three active groups are here. Leave a group before joining or starting another.':'Keep up to three active groups here. Joining shows interest; the host confirms a real meetup separately.'}</p>
    {gangs.length?<div className="your-gangs-list">{gangs.map(g=><article className="your-gang-card" key={g.id}>
      <div className="your-gang-top"><span className="eyebrow">{g.mine?'YOUR WISH':'YOU JOINED'}</span><span className="badge">{g.eventId?'Plan published':g.joined>=g.spots?'Gang ready':'Gathering the gang'}</span></div>
      <h3>{g.title}</h3>
      <div className="event-meta"><span><CalendarDays size={16}/>{g.whenText}</span><span><MapPin size={16}/>{g.area}</span><span><Users size={16}/>{g.joined}/{g.spots} in</span></div>
      <div className="actions"><a className="button blue small" href={'/chat?room='+g.room}><MessageCircle size={16}/>Open gang chat</a>{g.eventId&&<a className="hand-link" href={'/join?event='+g.eventId}>See the plan →</a>}</div>
      {g.mine?<details className="gang-manage"><summary>Manage my wish</summary><p>Removing this wish closes the gang and removes its shared chat history for everyone. Published event records stay with the host.</p><button className="textbutton" disabled={busy} onClick={()=>void run(async()=>{await api('removeWish',{id:g.id});await reload()})}>Remove my wish and gang chat</button></details>:<details className="gang-manage"><summary>Leave this gang</summary><p>Your seat will be released and this gang chat will no longer be available to you. Messages you already sent stay with the group. If the host confirmed your attendance, contact them about cancelling it.</p><button className="textbutton" disabled={busy} onClick={()=>void run(async()=>{await api('leaveWish',{id:g.id});await reload()})}>Release my seat</button></details>}
    </article>)}</div>:<div className="your-gangs-empty"><Users size={25}/><p>No gangs yet. Find an idea you like on the wish wall; you can join before creating a chat profile.</p><a className="hand-link" href="/#wishes">Explore the wish wall →</a></div>}
  </section>;
}
