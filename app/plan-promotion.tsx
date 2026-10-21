'use client';
import {useState,useSyncExternalStore} from 'react';
import {Copy} from 'lucide-react';
import type {InvitationEvent} from '../lib/invitation-types';
import {PROMOTION_CHANNELS,promotionDraft,type PromotionChannel} from '../lib/plan-promotion';
import {useCurrentTime} from './use-current-time';

const subscribe=()=>()=>{};
export default function PlanPromotion({event}:{event?:InvitationEvent}){
  const[channel,setChannel]=useState<PromotionChannel>('whatsapp'),[copied,setCopied]=useState(''),[manual,setManual]=useState(false);
  const origin=useSyncExternalStore(subscribe,()=>location.origin,()=>'');
  const now=useCurrentTime();
  const upcoming=!!event&&Number.isFinite(Date.parse(event.date))&&Date.parse(event.date)>now;
  const draft=upcoming&&origin?promotionDraft(event,channel,origin,now):'';
  return <details className="host-promotion connection-state"><summary>Prepare a promotion draft</summary>
    {!draft?<p>Choose an upcoming published plan above to prepare its public invitation copy.</p>:<>
      <p>Copy for the selected plan: <strong>{event!.title}</strong>. Check the real details and pilot launch gates before using it.</p>
      <label>Where will you share it?<select value={channel} onChange={change=>{setChannel(change.target.value as PromotionChannel);setManual(false)}}>{PROMOTION_CHANNELS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Draft to review<textarea className="promotion-copy" rows={12} readOnly value={draft} onFocus={focus=>focus.currentTarget.select()}/></label>
      <button type="button" className="button small" onClick={()=>void(async()=>{try{await navigator.clipboard.writeText(draft);setCopied(draft);setManual(false)}catch{setCopied('');setManual(true)}})()}><Copy size={16}/>Copy draft</button>
      <p role="status" aria-live="polite" className="hint">{copied===draft?'Draft copied. Review it before posting.':manual?'Clipboard access is unavailable. Select and copy the text above.':'This prepares text only. It does not post or send a message.'}</p>
      <p className="hint">Get the group admin’s permission where needed. Use your own or licensed media and recorded participant-photo permission. Describe the planned group honestly; confirm places with each person.</p>
    </>}
  </details>;
}
