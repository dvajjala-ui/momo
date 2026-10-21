'use client';
import {useState} from 'react';
import {Lightbulb,RefreshCw} from 'lucide-react';
import {PROMPT_THEMES} from '../lib/conversation-prompts';

export default function ConversationStarters({busy,hasDraft,onChoose}:{busy:boolean;hasDraft:boolean;onChoose?:(prompt:string)=>void}){
  const[theme,setTheme]=useState(0),[index,setIndex]=useState(0);
  const group=PROMPT_THEMES[theme],prompt=group.prompts[index];
  return <details className="conversation-starters"><summary><Lightbulb size={17}/>Need an opening line?</summary>
    <p className="hint">A little nudge for the table. Anyone can pass; no one needs to share personal details.</p>
    <div className="prompt-themes" role="group" aria-label="Conversation prompt theme">{PROMPT_THEMES.map((item,i)=><button type="button" key={item.id} aria-pressed={theme===i} onClick={()=>{setTheme(i);setIndex(0)}}>{item.label}</button>)}</div>
    <p className="conversation-prompt" role="status" aria-live="polite">{prompt}</p>
    <div className="actions"><button type="button" className="textbutton" onClick={()=>setIndex(value=>(value+1)%group.prompts.length)}><RefreshCw size={15}/>Another prompt</button>{onChoose&&<button type="button" className="button small" disabled={busy||hasDraft} onClick={()=>onChoose(prompt)}>Put in my draft</button>}</div>
    <p className="hint">{!onChoose?'Read these for ideas. Your chat profile is only needed when you want to speak.':hasDraft?'Your current draft is kept. Clear it first to use a prompt.':'This only fills your message box. Edit it and choose Send when you’re ready.'}</p>
  </details>;
}
