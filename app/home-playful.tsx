'use client';
import {BadgeCheck,ShieldCheck,UserRoundCheck} from 'lucide-react';
import Image from 'next/image';
import {useBrand,ThemeSwitch,themePhoto,themeKinds,FoodIcon} from './brand';
import Wishes,{WishData} from './wishes';
import {Run} from './client';
import {useCurrentTime} from './use-current-time';
import type {InvitationEvent} from '../lib/invitation-types';
import YourGangs from './your-gangs';
import UpcomingPlans,{type PlansState} from './upcoming-plans';
import type {MemberState} from './community-types';

type HomeEvent=InvitationEvent&{id:string;description:string};
type HomeData={events:HomeEvent[];gallery:{id:string;caption:string}[];wishes:WishData[];pilot?:{active:number;capacity:number}};
type HomeMember=MemberState|null;
export default function PlayfulHome({data,me,busy,run,reload,signIn,previewBanner,plansState}:{data:HomeData,me:HomeMember,busy:boolean,run:Run,reload:()=>Promise<void>,signIn:React.ReactNode,previewBanner?:React.ReactNode,plansState:PlansState}){
  const{theme}=useBrand();const now=useCurrentTime();const photo=themePhoto(theme);const kinds=themeKinds(theme);
  return <main id="main-content" tabIndex={-1} className="home">
    {previewBanner}
    <section className="hero">
      <div className="hero-copy">
        <span className="torn-label">AHMEDABAD · A WEEKEND FRIEND CLUB</span>
        <h1>Make a wish.<br/><em>We’ll get your gang ready.</em></h1>
        <p>Screens got easier. Making friends got harder. <br/>Momo is the excuse to step out: good food, a silly game, <br/>and people who slowly become <i>your people</i>.</p>
        <div className="hero-buttons"><a className="button blue" href="/join">{(me?.emailInvite||me?.invite)?'See my spot':'Count me in'}</a><a className="hand-link" href="#wishes">see the wish wall ↓</a></div>
        {plansState==='ready'&&data.pilot&&<div className="pilot-count" aria-label={`${data.pilot.active} of ${data.pilot.capacity} pilot seats active`}><strong>{data.pilot.active}</strong><span>of {data.pilot.capacity} pilot seats active</span><small>Live count from the community database</small></div>}
        <ThemeSwitch/>
      </div>
      <div className="hero-photo">
        <figure className="photo-card"><div className="paper-tape"/><Image unoptimized width={1280} height={1376} src={photo.src} alt={photo.alt}/><figcaption className="handwritten">{theme==='momo'?'the opening scene.':'one slice. many stories.'}</figcaption></figure>
        <span className="peek peek-a"><FoodIcon kind={kinds[0]}/></span><span className="peek peek-b"><FoodIcon kind={kinds[kinds.length-1]}/></span>
        <span className="hero-note">come and<br/>be found.</span>
        <details className="photo-credits"><summary>Photo credits</summary><small>Photo: <a href={photo.page} target="_blank" rel="noreferrer">{photo.credit}</a>, <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>, via Wikimedia Commons. Display cropped for layout.</small></details>
      </div>
    </section>
    {me?.signedIn&&<YourGangs gangs={me.gangs} busy={busy} run={run} reload={reload}/>}
    <section className="how" id="the-plan">
      <div className="section-heading"><span className="handwritten">the whole plan.</span><h2>One clear path from curious to confirmed.</h2></div>
      <div className="steps"><article><b>01</b><h3>Explore first</h3><p>Read the plans and wish wall without giving Momo personal details.</p></article><article><b>02</b><h3>Save a seat</h3><p>Join a wish in one tap. This only reserves a device seat; it does not claim your identity is verified.</p></article><article><b>03</b><h3>Introduce yourself</h3><p>Before creating a wish or speaking, add one nickname, your age and self-described gender. The same profile is used everywhere.</p></article><article><b>04</b><h3>Meet in public</h3><p>The host shares the date, public venue and full cost. After you attend, your profile can show that a host met you.</p></article></div>
      <aside className="flow-note"><ShieldCheck size={24}/><div><b>Why joining and speaking are different</b><p>A one-tap join is a reversible expression of interest. Creating a plan, speaking to a group and receiving a real invitation carry more responsibility, so those steps ask for a profile or confirmed contact.</p></div></aside>
      <UpcomingPlans events={data.events} now={now} state={plansState} busy={busy} run={run} reload={reload} hasRequest={!!(me?.emailInvite||me?.invite)}/>
    </section>
    <section className="trust-section" aria-labelledby="trust-title">
      <div className="section-heading"><span className="handwritten">real checks, plain language.</span><h2 id="trust-title">Know what Momo actually knows.</h2><p>Momo shows evidence it can verify and labels everything else honestly.</p></div>
      <div className="trust-grid">
        <article><BadgeCheck/><h3>Contact checked</h3><p>The person confirmed an email address or phone number. It proves control of that contact, not their age or gender.</p></article>
        <article><UserRoundCheck/><h3>Met at Momo</h3><p>A host recorded that this person attended a published Momo meetup. This is Momo’s strongest community trust mark.</p></article>
        <article><ShieldCheck/><h3>Self-provided details</h3><p>Age and gender help people understand the table, but they remain self-provided. Momo does not guess gender from a face or collect Aadhaar.</p></article>
      </div>
    </section>
    {plansState==='ready'&&<Wishes wishes={data.wishes||[]} me={me} busy={busy} run={run} reload={reload} signIn={signIn}/>}
  </main>;
}
