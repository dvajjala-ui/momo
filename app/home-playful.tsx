'use client';
import {CalendarDays,MapPin,Utensils} from 'lucide-react';
import {Cast,useBrand,ThemeSwitch,themePhoto,themeKinds,FoodIcon,SLOGANS} from './brand';
import Wishes from './wishes';
import {Letters} from './letters';
import {Run} from './client';

export default function PlayfulHome({data,me,busy,run,reload,signIn,onError,previewBanner}:{data:any,me:any,busy:boolean,run:Run,reload:()=>Promise<void>,signIn:React.ReactNode,onError:(s:string)=>void,previewBanner?:React.ReactNode}){
  const{theme}=useBrand();const photo=themePhoto(theme);const kinds=themeKinds(theme);const upcoming=data.events.filter((e:any)=>Date.parse(e.date)>Date.now()-6*3600000);const event=upcoming[0];
  return <main className="home">
    {previewBanner}
    <section className="hero">
      <div className="hero-copy">
        <span className="torn-label">AHMEDABAD · A WEEKEND FRIEND CLUB · 18+</span>
        <h1>Make a wish.<br/><em>We’ll get your gang ready.</em></h1>
        <p>Screens got easier. Making friends got harder. <br/>Momo is the excuse to step out: good food, a silly game, <br/>and people who slowly become <i>your people</i>.</p>
        <div className="hero-buttons"><a className="button blue" href="/join">{me?.invite?'See my spot':'Count me in'}</a><a className="hand-link" href="#wishes">see the wish wall ↓</a></div>
        <ThemeSwitch/>
      </div>
      <div className="hero-photo">
        <figure className="photo-card"><div className="paper-tape"/><img src={photo.src} alt={photo.alt}/><figcaption className="handwritten">{theme==='momo'?'the opening scene.':'one slice. many stories.'}</figcaption></figure>
        <span className="peek peek-a"><FoodIcon kind={kinds[0]}/></span><span className="peek peek-b"><FoodIcon kind={kinds[kinds.length-1]}/></span>
        <span className="hero-note">come and<br/>be found.</span>
        <small className="credit">Photo: <a href={photo.page} target="_blank" rel="noreferrer">{photo.credit}</a>, {photo.license}, via Wikimedia Commons</small>
      </div>
    </section>
    <div className="ribbon" aria-hidden="true"><div>{[...SLOGANS,...SLOGANS].map((s,i)=><span key={i}>{s}<b>✳</b></span>)}</div></div>
    <section className="parade"><div className="parade-head"><span className="handwritten">different {theme==='momo'?'fillings':'cravings'}. same table.</span><span className="little-label">COME AS YOU ARE</span></div><Cast labels/></section>
    <section className="how" id="the-plan">
      <div className="section-heading"><span className="handwritten">okay, here’s how it works.</span><h2>Three tiny steps.<br/>One <span className="crayon-underline">real</span> weekend.</h2></div>
      <div className="steps"><article><b>01</b><h3>Wish or pick a plan</h3><p>Make a wish (“badminton, Sunday?”) or tap into a plan a host already set up.</p></article><article><b>02</b><h3>Your gang fills up</h3><p>People say “I’m in”. A host confirms a public venue, a time and the full cost, all upfront.</p></article><article><b>03</b><h3>Show up. Be found.</h3><p>Talk, listen, or just eat. No icebreaker speeches. Leave whenever you like.</p></article></div>
      <div className="plans">{upcoming.length?upcoming.slice(0,3).map((e:any)=><article className="plan-card" key={e.id}><span className="torn-label">HOSTED PLAN</span><h3>{e.title}</h3><p>{e.description}</p><div className="event-meta"><span><CalendarDays size={17}/>{new Date(e.date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})} IST</span><span><MapPin size={17}/>{e.venue}</span><span><Utensils size={17}/>{e.cost}</span></div><a href={'/join?event='+e.id} className="button blue">Ask for a seat</a></article>):<article className="plan-card"><span className="torn-label">OUR FIRST TABLE IS TAKING SHAPE</span><h3>{theme==='momo'?'Momos. UNO. “One last round.”':'Good food. UNO. “One last round.”'}</h3><p>We’re putting together the first Ahmedabad get-together. Leave your number and we’ll send the real date, public venue and full cost before you decide.</p><a href="/join" className="button blue">{me?.invite?'Check my spot':'Keep me in the loop'}</a><small>Interest list only. No booking or payment.</small></article>}</div>
    </section>
    <Wishes wishes={data.wishes||[]} me={me} busy={busy} run={run} reload={reload} signIn={signIn}/>
    <section className="hi-note"><div className="note-paper">
      <p><mark className="hl-purple">Hi you!</mark> Somewhere between <mark className="hl-yellow">work, scrolling and “let’s plan soon”</mark>, the weekends got quiet. Old friends moved cities. New ones are <mark className="hl-blue">weirdly hard to make</mark> as a grown-up.</p>
      <p>That’s not a <mark className="hl-black">you problem</mark>. It happens to <mark className="hl-green">almost everyone</mark>. And there are so many people out there <mark className="hl-pink">waiting for someone to just say “chal, chalte hain”</mark>.</p>
      <p>So here’s the deal: you bring yourself, <mark className="hl-orange">we’ll bring the gang</mark>. Some momos. A silly game. A Saturday you’ll talk about on Monday.</p>
      <p className="sign">— somebody who also wanted <mark className="hl-yellow">their people</mark> ✳</p>
    </div></section>
    <section className="letters-section" id="letters"><div className="section-heading center"><span className="handwritten">a tiny invitation. a possible story.</span><h2>Send a little <span className="crayon-underline">“come along?”</span></h2><p>Pick the postcard that feels like you, or like the friend you want to invite.</p></div><Letters event={event} onError={onError}/></section>
    {data.gallery?.length>0&&<section className="memories"><div className="section-heading"><span className="handwritten">from our tables.</span><h2>Real people. <span className="crayon-underline">Real permission.</span></h2></div><div className="memory-strip">{data.gallery.slice(0,8).map((g:any)=><figure key={g.id} className="photo-card small"><img src={'/api/media/'+g.id} alt={g.caption}/><figcaption className="handwritten">{g.caption}</figcaption></figure>)}</div></section>}
  </main>;
}
