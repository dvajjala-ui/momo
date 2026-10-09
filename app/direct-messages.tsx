'use client';
import {useCallback,useEffect,useState,FormEvent} from 'react';
import {Flag,Lock,Send} from 'lucide-react';
import {Avatar} from './wishes';
import {useChat} from './use-chat';
import {api} from './client';

type Peer={id:string;nickname:string;avatar:number};
type Thread={room:string;peerId:string;nickname:string};
type State={optedIn:boolean;attended:boolean;peers:Peer[];threads:Thread[];blocked:{id:string;nickname:string}[]};

async function direct<T={ok:boolean}>(action:string,body:Record<string,unknown>={}):Promise<T>{
  const response=await fetch('/api/direct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body})});
  const result=await response.json() as T&{error?:string};
  if(!response.ok)throw Error(result.error||'Private notes could not save right now.');
  return result;
}

export default function DirectMessages({active,profile}:{active:boolean;profile:boolean}){
  const [state,setState]=useState<State|null>(null),[room,setRoom]=useState(''),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reportId,setReportId]=useState(''),[reason,setReason]=useState(''),[search,setSearch]=useState('');
  const chat=useChat(room,active&&!!room,setError);
  const reload=useCallback(async()=>{
    const response=await fetch('/api/direct',{cache:'no-store'}),result:State&{error?:string}=await response.json();
    if(!response.ok)throw Error(result.error||'Private notes could not load right now.');
    setState(result);
    setRoom(current=>result.threads.some((thread:Thread)=>thread.room===current)?current:'');
  },[]);
  useEffect(()=>{if(!active||!profile)return;let live=true;fetch('/api/direct',{cache:'no-store'}).then(async response=>{const result:State&{error?:string}=await response.json();if(!response.ok)throw Error(result.error||'Private notes could not load right now.');if(live)setState(result)}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Private notes could not load.')});return()=>{live=false}},[active,profile]);
  async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work()}catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}}
  const selected=state?.threads.find(t=>t.room===room);
  const peers=state?.peers.filter(peer=>peer.nickname.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))||[];
  return <section className="direct-notes connection-state" aria-labelledby="direct-title">
    <div className="section-head"><div><span className="eyebrow">AFTER YOU’VE MET</span><h2 id="direct-title">Private notes.</h2></div><Lock size={22}/></div>
    <p>These open only after a host confirms that you and the other person attended the same meetup. Both people choose to opt in. You can turn them off, block someone or report a note at any time. Hosts can read reported notes.</p>
    {!active?<p>Pull up a chair to see your private notes.</p>:!profile?<p>Pick a nickname first to use private notes.</p>:!state?<p>Checking your seat…</p>:!state.attended?<p>A host has not confirmed your attendance at a meetup yet.</p>:<>
      <label className="check"><input type="checkbox" checked={state.optedIn} disabled={busy} onChange={e=>{const enabled=e.target.checked;void run(async()=>{await direct('preference',{enabled});if(!enabled){setRoom('');setText('')}await reload()})}}/>Allow private notes from people I attended a meetup with</label>
      {state.optedIn&&<><div className="direct-layout"><div className="direct-peers"><h3>People you met</h3><label>Find a nickname<input value={search} onChange={e=>setSearch(e.target.value)} maxLength={30}/></label>{peers.length?peers.map(peer=><button type="button" className={'direct-peer '+(selected?.peerId===peer.id?'on':'')} key={peer.id} disabled={busy} onClick={()=>void run(async()=>{const result=await direct<{room:string}>('start',{peerId:peer.id});await reload();setRoom(result.room);setReportId('');setText('')})}><Avatar i={peer.avatar}/><span>{peer.nickname}</span></button>):<p>{search?'No matching nickname.':'No shared attendee has opted in yet.'}</p>}</div>
        <div className="direct-conversation">{!selected?<p>Choose someone you met to open a conversation.</p>:<><div className="chat-heading"><h3>Notes with {selected.nickname}</h3><button className="textbutton" disabled={busy} onClick={()=>void run(async()=>{await direct('blockPeer',{peerId:selected.peerId});setRoom('');await reload()})}>Block</button></div><p className="sr-only" role="status" aria-live="polite">{chat.announcement}</p><div className="messages" role="log" aria-label={'Private notes with '+selected.nickname} aria-live="off" aria-relevant="additions">{!chat.loaded?<p className="hint">Opening notes…</p>:!chat.messages.length?<p className="hint">No notes here yet.</p>:chat.messages.map(message=><div className={'message '+(message.mine?'mine':'')} key={message.id}><Avatar i={message.avatar} photo={message.photo}/><div><strong>{message.nickname}</strong><time>{new Date(message.created).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</time><p>{message.body}</p></div>{!message.mine&&<button className="icon-button" aria-label={'Report note by '+message.nickname} onClick={()=>{setReportId(message.id);setReason('')}}><Flag size={15}/></button>}</div>)}</div><form className="composer" onSubmit={(e:FormEvent)=>{e.preventDefault();void run(async()=>{await api('message',{room,body:text});setText('');await chat.reload()})}}><input aria-label={'Write a note to '+selected.nickname} value={text} maxLength={500} onChange={e=>setText(e.target.value)} placeholder="Write a note…"/><button className="button blue" aria-label="Send private note" disabled={busy||!text.trim()}><Send size={18}/></button></form>{reportId&&<form className="admin-inline" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('report',{messageId:reportId,reason});setReportId('');setReason('')})}}><label>Why are you reporting this note?<input value={reason} minLength={3} maxLength={300} onChange={e=>setReason(e.target.value)} required/></label><button className="button small" disabled={busy}>Send report to host</button><button type="button" className="textbutton" onClick={()=>setReportId('')}>Cancel</button></form>}</>}</div></div></>}
    </>}
    {!!state?.blocked.length&&<details><summary>People you blocked</summary>{state.blocked.map(peer=><div className="manage-row" key={peer.id}><span>{peer.nickname}</span><button className="textbutton" disabled={busy} onClick={()=>void run(async()=>{await direct('unblockPeer',{peerId:peer.id});await reload()})}>Unblock</button></div>)}</details>}
    {error&&<p className="hint" role="alert">{error}</p>}
  </section>;
}
