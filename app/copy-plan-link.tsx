'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Link as LinkIcon} from 'lucide-react';
import {planShareUrl} from '../lib/plan-discovery';

export default function CopyPlanLink({eventId}:{eventId:string}){
  const[copied,setCopied]=useState(false),[manualUrl,setManualUrl]=useState('');
  const field=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(manualUrl){field.current?.focus();field.current?.select()}},[manualUrl]);
  async function copy(){
    const url=planShareUrl(location.href,eventId);
    try{await navigator.clipboard.writeText(url);setCopied(true);setManualUrl('')}
    catch{setCopied(false);setManualUrl(url)}
  }
  return <div className="plan-share"><button type="button" className="button small" onClick={()=>void copy()}>{copied?<Check size={16}/>:<LinkIcon size={16}/>}Copy plan link</button>
    <span role="status" aria-live="polite">{copied?'Link copied. It shares the public plan only.':manualUrl?'Copy this link to share the public plan.':''}</span>
    {manualUrl&&<label>Public plan link<input ref={field} readOnly value={manualUrl} onFocus={e=>e.currentTarget.select()}/></label>}
  </div>;
}
