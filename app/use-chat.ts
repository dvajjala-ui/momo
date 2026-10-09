'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ChatMessage} from '../lib/chat-poll';
import {createChatLive} from '../lib/chat-live';

export function useChat(room: string, enabled: boolean, onError: (message: string) => void) {
  const [snapshot, setSnapshot] = useState<{room: string; messages: ChatMessage[]; announcement: string} | null>(null);
  const loader = useRef<(() => Promise<void>) | null>(null);
  const sender = useRef<((body:string) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let previous: Set<string> | null = null;
    const poll = createChatLive(room, messages => {
      const added = previous ? messages.filter(m => !previous!.has(m.id)).length : 0;
      previous = new Set(messages.map(m => m.id));
      setSnapshot(old => ({room, messages, announcement: added
        ? `${added} new ${added === 1 ? 'message' : 'messages'} at this table.`
        : old?.room === room ? old.announcement : ''}));
    }, (message,clear) => {
      if(clear)setSnapshot({room, messages: [], announcement: ''});
      onError(message);
    });
    loader.current = poll.reload;
    sender.current = poll.send;
    const visibility=()=>poll.visibility();
    document.addEventListener('visibilitychange',visibility);
    return () => {
      document.removeEventListener('visibilitychange',visibility);
      poll.dispose();
      loader.current = null;
      sender.current = null;
      // A new seat must never inherit the previous seat's private messages.
      setSnapshot(null);
    };
  }, [room, enabled, onError]);
  const reload = useCallback(async () => {await loader.current?.();}, []);
  const send = useCallback(async (body:string) => {if(!sender.current)throw Error('Open a conversation first.');await sender.current(body);}, []);
  const current = enabled && snapshot?.room === room ? snapshot : null;
  return {messages: current?.messages || [], loaded: !!current, announcement: current?.announcement || '', reload,send};
}
