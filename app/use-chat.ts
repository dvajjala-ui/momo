'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ChatMessage, createChatPoll} from '../lib/chat-poll';

export function useChat(room: string, enabled: boolean, onError: (message: string) => void) {
  const [snapshot, setSnapshot] = useState<{room: string; messages: ChatMessage[]; announcement: string} | null>(null);
  const loader = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let previous: Set<string> | null = null;
    const poll = createChatPoll(room, messages => {
      const added = previous ? messages.filter(m => !previous!.has(m.id)).length : 0;
      previous = new Set(messages.map(m => m.id));
      setSnapshot(old => ({room, messages, announcement: added
        ? `${added} new ${added === 1 ? 'message' : 'messages'} at this table.`
        : old?.room === room ? old.announcement : ''}));
    }, message => {
      setSnapshot({room, messages: [], announcement: ''});
      onError(message);
    });
    loader.current = poll.load;
    void poll.load();
    const timer = setInterval(() => {if (!document.hidden) void poll.load();}, 5000);
    return () => {
      clearInterval(timer);
      poll.dispose();
      loader.current = null;
      // A new seat must never inherit the previous seat's private messages.
      setSnapshot(null);
    };
  }, [room, enabled, onError]);
  const reload = useCallback(async () => {await loader.current?.();}, []);
  const current = enabled && snapshot?.room === room ? snapshot : null;
  return {messages: current?.messages || [], loaded: !!current, announcement: current?.announcement || '', reload};
}
