'use client';
import {useEffect,useState} from 'react';
import {api} from './client';

export default function PhoneVerification({verified,available,onVerified}:{verified:boolean,available:boolean,onVerified:()=>Promise<void>}){
  const [link,setLink]=useState<{url:string,expiresAt:number}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(!link||verified)return;
    let cancelled=false,polling=false;
    const check=async()=>{
      if(cancelled||polling||document.hidden)return;
      if(Date.now()>=link.expiresAt){setLink(null);setError('That verification message expired. Prepare a new one.');return;}
      polling=true;
      try{
        const r=await fetch('/api/phone-verification',{cache:'no-store',signal:AbortSignal.timeout(10000)});
        if(!r.ok)return;
        const status=await r.json() as {verified?:boolean};
        if(!cancelled&&status.verified){setLink(null);await onVerified();}
      }catch{/* A temporary check failure does not discard the member's link. */}
      finally{polling=false;}
    };
    const timer=setInterval(check,5000);
    return()=>{cancelled=true;clearInterval(timer);};
  },[link,verified,onVerified]);
  if(verified)return <div className="phone-verification" role="status"><strong>Your number is verified.</strong><p>Hosts can use this number for invitations once the business connection is ready.</p></div>;
  if(!available)return <div className="phone-verification"><strong>Number verification is waiting for WhatsApp.</strong><p>Your request is saved. Automated invitations stay off until the connection is ready and you verify your number.</p></div>;
  async function prepare(){setBusy(true);setError('');try{setLink(await api('verifyPhone'));}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
  return <div className="phone-verification"><h4>Confirm this is your WhatsApp number.</h4><p>Send the prepared message from the same number you saved above. Momo will confirm it from WhatsApp’s reply to the website.</p>{!link?<button className="button" disabled={busy} onClick={prepare}>{busy?'Preparing…':'Prepare verification message'}</button>:<><a className="button blue" href={link.url} target="_blank" rel="noreferrer">Open WhatsApp to verify</a><p role="status">Waiting for your message. The link expires in 10 minutes.</p><p className="hint">Opening WhatsApp does not send anything. Review the message and tap Send there.</p></>}{error&&<p role="alert">{error}</p>}</div>;
}
