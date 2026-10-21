'use client';
import {useCallback,useEffect,useState} from 'react';
import type {InvitationEvent} from '../lib/invitation-types';

type Result={id:string;state:'loading'|'ready'|'error';event:InvitationEvent|null};
export function usePublishedPlan(id:string|null,enabled:boolean){
  const[result,setResult]=useState<Result|null>(null),[version,setVersion]=useState(0);
  const retry=useCallback(()=>{setResult(null);setVersion(value=>value+1)},[]);
  useEffect(()=>{
    if(!enabled||!id)return;
    const controller=new AbortController();
    fetch('/api/community?view=plan&id='+encodeURIComponent(id),{signal:controller.signal}).then(async response=>{
      const data=await response.json() as {event?:InvitationEvent}|null;
      if(response.status===404)return null;
      if(!response.ok||!data?.event||data.event.id!==id)throw Error('Plan unavailable');
      return data.event;
    }).then(event=>{if(!controller.signal.aborted)setResult({id,state:'ready',event})}).catch(()=>{if(!controller.signal.aborted)setResult({id,state:'error',event:null})});
    return()=>controller.abort();
  },[id,enabled,version]);
  if(!id)return {state:'ready' as const,event:null,retry};
  return {state:result?.id===id?result.state:'loading' as const,event:result?.id===id?result.event:null,retry};
}
