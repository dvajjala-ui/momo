'use client';
import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';
import {useBrand,themeKinds,FoodTheme} from './brand';
import {LETTER_STYLES,LetterStyle,renderLetter,saveCanvas,renderBadge} from './invitation';

export function Letters({event,onError,initial='hero'}:{event?:any,onError:(s:string)=>void,initial?:LetterStyle}){
  const{theme}=useBrand();const[style,setStyle]=useState<LetterStyle>(initial);const[preview,setPreview]=useState<Record<string,string>>({});const[busy,setBusy]=useState(false);
  const key=style+theme+(event?.id||'');
  useEffect(()=>{if(preview[key])return;let live=true;renderLetter(style,theme as FoodTheme,event).then(c=>{if(live)setPreview(p=>({...p,[key]:c.toDataURL('image/jpeg',.82)}))}).catch(()=>{});return()=>{live=false}},[key]);
  return <div className="letters">
    <div className="letter-tabs" role="tablist" aria-label="Postcard style">{LETTER_STYLES.map(s=><button key={s.id} role="tab" aria-selected={style===s.id} className={'letter-tab '+s.id+(style===s.id?' on':'')} onClick={()=>setStyle(s.id)}><b>{s.name}</b><small>{s.note}</small></button>)}</div>
    <div className="letter-stage">{preview[key]?<img src={preview[key]} alt={LETTER_STYLES.find(s=>s.id===style)?.name+' invitation preview'}/>:<div className="letter-loading">drawing your postcard…</div>}</div>
    <button className="button blue" disabled={busy} onClick={async()=>{setBusy(true);try{await saveCanvas(await renderLetter(style,theme,event),`momo-${style}-invitation.png`)}catch(e){onError(e instanceof Error?e.message:'Could not make the postcard.')}finally{setBusy(false)}}}><Download size={17}/>{busy?'Making it…':'Download this postcard'}</button>
    <p className="tiny-note">{event?'Made for: '+event.title:'A preview card. Real plans get their own card once a host confirms them.'}</p>
  </div>;
}

export function BadgeMaker({nickname,avatar=0,onError}:{nickname?:string,avatar?:number,onError:(s:string)=>void}){
  const{theme}=useBrand();const[name,setName]=useState(nickname||'');const[role,setRole]=useState(theme==='momo'?'professional momo eater':'snack strategist');const[photo,setPhoto]=useState<string|null>(null);const[img,setImg]=useState('');const[busy,setBusy]=useState(false);
  useEffect(()=>{if(nickname)setName(nickname)},[nickname]);
  const kind=themeKinds(theme)[avatar%themeKinds(theme).length];
  useEffect(()=>{let live=true;const t=setTimeout(()=>renderBadge({name:name||'Your name',role,photo,kind}).then(c=>{if(live)setImg(c.toDataURL('image/jpeg',.8))}).catch(()=>{}),250);return()=>{live=false;clearTimeout(t)}},[name,role,photo,kind]);
  return <div className="badge-maker">
    <div className="badge-form"><label>Name on the badge<input value={name} maxLength={22} onChange={e=>setName(e.target.value)} placeholder="Your nickname"/></label><label>Occupation (be honest)<input value={role} maxLength={40} onChange={e=>setRole(e.target.value)}/></label><label>Childhood photo (optional)<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return setPhoto(null);if(f.size>8e6)return onError('Choose a photo under 8 MB.');const r=new FileReader();r.onload=()=>setPhoto(String(r.result));r.readAsDataURL(f)}}/></label><p className="hint">Your photo never leaves this browser. The badge is drawn on your device and isn’t uploaded.</p><button className="button blue" disabled={busy} onClick={async()=>{setBusy(true);try{await saveCanvas(await renderBadge({name:name||'Your name',role,photo,kind}),'momo-badge.png')}catch(e){onError(e instanceof Error?e.message:'Could not make the badge.')}finally{setBusy(false)}}}><Download size={17}/>Download my badge</button></div>
    <div className="badge-preview">{img?<img src={img} alt="Your Momo member badge preview"/>:<div className="letter-loading">printing your badge…</div>}</div>
  </div>;
}
