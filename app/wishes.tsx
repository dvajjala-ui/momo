'use client';
import {useState} from 'react';
import {Sparkles,Users,CalendarDays,MapPin,X} from 'lucide-react';
import {FoodIcon,themeKinds,useBrand} from './brand';
import {api,Run} from './client';

const IDEAS=['Sunday badminton doubles','Post-garba momo run','Board games + chai','Sunrise trek','Football 5-a-side','Pottery class, finally'];
export function Avatar({i=0,photo,large=false}:{i?:number,photo?:string|null,large?:boolean}){const{theme}=useBrand();const kinds=themeKinds(theme);return <span className={'avatar '+(large?'large':'')}>{photo?<img src={`/api/media/${photo}`} alt=""/>:<FoodIcon kind={kinds[Math.abs(i)%kinds.length]}/>}</span>}

export default function Wishes({wishes,me,busy,run,reload,signIn}:{wishes:any[],me:any,busy:boolean,run:Run,reload:()=>Promise<void>,signIn:React.ReactNode}){
  const[open,setOpen]=useState(false);const[title,setTitle]=useState('');
  const canWish=me?.signedIn&&me?.profile;
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),form=e.currentTarget;await run(async()=>{await api('wish',{title:f.get('title'),whenText:f.get('whenText'),area:f.get('area'),spots:Number(f.get('spots'))});form.reset();setTitle('');setOpen(false);await reload()})}
  return <section className="wish-wall" id="wishes">
    <div className="wish-head"><div><span className="handwritten">make a wish.</span><h2>Want to try something?<br/><span className="crayon-underline">Your gang is a wish away.</span></h2><p>Post the plan you keep postponing. When enough people say “I’m in”, the gang is ready, and a host helps you lock in a public place, a time and the full cost.</p></div><button className="button blue" onClick={()=>setOpen(true)}><Sparkles size={18}/>Make a wish</button></div>
    {open&&<div className="wish-form-card">{!canWish?<>{me?.signedIn?<p>Pick a nickname first, so your gang knows who made the wish. <a className="hand-link" href="/join#profile">Choose a nickname</a></p>:signIn}<button className="textbutton" onClick={()=>setOpen(false)}>Not now</button></>:<form onSubmit={submit}><button type="button" className="modal-close" aria-label="Close" onClick={()=>setOpen(false)}><X size={20}/></button><label>I wish someone would join me for…<input name="title" required minLength={3} maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Sunday morning badminton"/></label><div className="idea-chips">{IDEAS.map(x=><button type="button" key={x} onClick={()=>setTitle(x)}>{x}</button>)}</div><div className="wish-grid"><label>When<input name="whenText" required minLength={2} maxLength={60} placeholder="This Sunday, 7 am"/></label><label>Area<input name="area" required minLength={2} maxLength={60} defaultValue="Ahmedabad · " /></label><label>Gang size<select name="spots" defaultValue="4">{[2,3,4,5,6,8,10,12].map(n=><option key={n} value={n}>{n} people</option>)}</select></label></div><p className="hint">Only nicknames are shown. Meet only at the public place a host confirms, never at someone’s home.</p><button className="button blue" disabled={busy}><Sparkles size={17}/>{busy?'Wishing…':'Blow the candles'}</button></form>}</div>}
    <div className="wish-list">{wishes.map(w=>{const left=Math.max(0,w.spots-w.joined);const ready=left===0;return <article key={w.id} className={'wish-card '+(ready?'ready':'')}>
      <div className="wish-top">{w.by?<span className="wish-by"><Avatar i={w.by.avatar}/>{w.by.nickname} wished</span>:<span className="wish-by">someone wished</span>}{ready?<span className="badge ready">gang ready ✳</span>:<span className="badge">{left} more needed</span>}</div>
      <h3>{w.title}</h3>
      <div className="event-meta"><span><CalendarDays size={16}/>{w.whenText}</span><span><MapPin size={16}/>{w.area}</span><span><Users size={16}/>{w.joined}/{w.spots} in</span></div>
      <div className="meter" aria-hidden="true"><i style={{width:`${Math.min(100,w.joined/w.spots*100)}%`}}/></div>
      {w.gang?.length>0&&<div className="gang-row">{w.gang.slice(0,8).map((g:any,i:number)=><span key={i} title={g.nickname}><Avatar i={g.avatar}/></span>)}</div>}
      {ready&&<p className="hint">The gang’s ready. A host will share a public venue, time and full cost before anyone meets.</p>}
      <div className="wish-actions">{w.mine?<button className="textbutton" disabled={busy} onClick={()=>run(async()=>{await api('removeWish',{id:w.id});await reload()})}>Remove my wish</button>:w.joinedByMe?<button className="button" disabled={busy} onClick={()=>run(async()=>{await api('leaveWish',{id:w.id});await reload()})}>I’m in ✓ · leave</button>:<button className="button blue" disabled={busy||ready} onClick={()=>run(async()=>{if(!me?.signedIn||!me?.profile){setOpen(true);return}await api('joinWish',{id:w.id});await reload()})}>{ready?'Gang full':'I’m in'}</button>}{me?.admin&&!w.mine&&<button className="textbutton" disabled={busy} onClick={()=>run(async()=>{await api('removeWish',{id:w.id});await reload()})}>Remove (host)</button>}</div>
    </article>})}
    {!wishes.length&&<article className="wish-card example"><div className="wish-top"><span className="wish-by"><Avatar i={1}/>an example wish</span><span className="badge">3 more needed</span></div><h3>Sunday morning badminton, then poha</h3><div className="event-meta"><span><CalendarDays size={16}/>Sunday, 7 am</span><span><MapPin size={16}/>Ahmedabad · a public court</span><span><Users size={16}/>1/4 in</span></div><div className="meter"><i style={{width:'25%'}}/></div><p className="hint">This is just an example. The wall is empty. Be the first wish.</p><button className="button blue" onClick={()=>setOpen(true)}><Sparkles size={17}/>Make the first wish</button></article>}
    </div>
  </section>;
}
