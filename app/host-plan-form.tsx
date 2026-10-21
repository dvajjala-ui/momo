'use client';
import {useRef,useState} from 'react';
import {Eye,Sparkles} from 'lucide-react';
import {guidedPlan,type GuidedPlan} from '../lib/host-plan';
import type {Run} from './client';
import type {WishData} from './wishes';

type Props={plan:WishData|null;busy:boolean;run:Run;api:<T=unknown>(action:string,data?:Record<string,unknown>)=>Promise<T>;onPublished:(id:string)=>Promise<void>;onClear:()=>void};
export default function HostPlanForm({plan,busy,run,api,onPublished,onClear}:Props){
  const form=useRef<HTMLFormElement>(null);
  const[preview,setPreview]=useState<GuidedPlan|null>(null),[error,setError]=useState('');
  function payload(element:HTMLFormElement){
    const fields=new FormData(element);
    return {title:fields.get('title'),date:String(fields.get('date'))+':00+05:30',venue:fields.get('venue'),cost:fields.get('cost'),category:fields.get('category'),wishId:plan?.id||null,
      planDetails:{hostName:fields.get('hostName'),endDate:String(fields.get('endDate'))+':00+05:30',capacity:Number(fields.get('capacity')),meetingPoint:fields.get('meetingPoint'),contact:fields.get('contact'),access:fields.get('access'),emergencyPlan:fields.get('emergencyPlan'),notes:fields.get('notes'),publicDetailsConfirmed:fields.get('publicDetailsConfirmed')==='on'}};
  }
  return <form ref={form} id="plan-form" className="form-card host-plan-form" onChange={event=>{if(!(event.target instanceof HTMLInputElement)||event.target.name!=='publicDetailsConfirmed')setPreview(null);setError('')}} onSubmit={event=>{
    event.preventDefault();const element=event.currentTarget;setError('');
    void run(async()=>{const input=payload(element);try{guidedPlan(input)}catch(cause){setError(cause instanceof Error?cause.message:'Please check the plan.');return}const result=await api<{id:string}>('event',input);await onPublished(result.id);element.reset();setPreview(null)});
  }}>
    <h2>{plan?'Plan this wish.':'Make a real plan.'}</h2>
    {plan&&<p className="hint">From “{plan.title}” · {plan.joined} interested people. <button type="button" className="textbutton" onClick={onClear}>Clear wish</button></p>}
    <p className="hint">Give people the details they need before asking for a place. Everything entered here will be public.</p>
    <fieldset><legend>1. The plan</legend>
      <label>Meetup name<input name="title" required minLength={3} maxLength={100} defaultValue={plan?.title||''}/></label>
      <div className="host-plan-pair"><label>Starts (India time)<input name="date" type="datetime-local" required/></label><label>Planned finish (India time)<input name="endDate" type="datetime-local" required/></label></div>
      <label>Public venue and full address<input name="venue" required minLength={3} maxLength={150} placeholder="Venue, street / area, city"/></label>
      <label>Full cost and what it covers<input name="cost" required maxLength={100} placeholder="Include food, activity and any venue charge"/></label>
      <div className="host-plan-pair"><label>Planned group size<input name="capacity" type="number" required min={2} max={100} defaultValue={plan?.spots||''}/></label><label>Category<select name="category"><option>Food + play</option><option>Food</option><option>Play</option></select></label></div>
      <p className="hint">This states the planned size. The host still reviews requests and confirms available places.</p>
      <label>What will the group do?<textarea name="notes" required minLength={5} maxLength={500} placeholder="Describe the food, activity and feel of the meetup."/></label>
    </fieldset>
    <fieldset><legend>2. Finding the table</legend>
      <label>Named host<input name="hostName" required minLength={2} maxLength={60} placeholder="The name people can ask for at the venue"/></label>
      <label>Where exactly should people meet?<input name="meetingPoint" required minLength={3} maxLength={150} placeholder="A confirmed entrance, table or landmark inside the venue"/></label>
      <label>Public host / moderation contact<input name="contact" required minLength={3} maxLength={120} placeholder="A contact you have permission to publish"/></label>
      <label>Venue access and dietary notes (optional)<input name="access" minLength={2} maxLength={160} placeholder="Only state arrangements confirmed with the venue"/></label>
      <label>Exit and help plan<textarea name="emergencyPlan" required minLength={5} maxLength={200} placeholder="Who to approach for help, how to leave, and the confirmed venue exit arrangements"/></label>
    </fieldset>
    <label className="check"><input name="publicDetailsConfirmed" type="checkbox" required/>I have confirmed these details with the venue and host, and have permission to publish the host contact.</label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="actions"><button type="button" className="button" disabled={busy} onClick={()=>{if(!form.current)return;try{setPreview(guidedPlan(payload(form.current),Date.now(),true));setError('')}catch(cause){setError(cause instanceof Error?cause.message:'Please check the plan.')}}}><Eye size={16}/>Preview plan</button><button className="button blue" disabled={busy}><Sparkles size={16}/>Publish plan</button></div>
    {preview&&<aside className="host-plan-preview" aria-label="Plan preview"><span className="eyebrow">PREVIEW ONLY</span><h3>{preview.title}</h3><p>{new Date(preview.date).toLocaleString('en-IN',{dateStyle:'full',timeStyle:'short',timeZone:'Asia/Kolkata'})} IST<br/>{preview.venue}<br/>Full cost: {preview.cost}</p><p className="plan-description">{preview.description}</p><small>This preview creates no event or invitation. Publish only once the details are confirmed.</small></aside>}
  </form>;
}
