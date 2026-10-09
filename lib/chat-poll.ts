export type ChatMessage = {
  id: string; nickname: string; body: string; created: number;
  avatar: number; photo?: string | null; mine: boolean;
};

// One request at a time. Disposing a room prevents late responses from
// replacing the next room's messages or announcing its errors.
export function createChatPoll(
  room: string,
  receive: (messages: ChatMessage[]) => void,
  fail: (message: string, status?:number) => void,
  request: typeof fetch = fetch,
) {
  let disposed = false;
  let pending: Promise<void> | undefined;
  let controller: AbortController | undefined;
  function load(): Promise<void> {
    if (disposed) return Promise.resolve();
    if (pending) return pending;
    controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(() => controller?.abort(), 10000);
    pending = (async () => {
      try {
        const response = await request('/api/community?view=chat&room=' + encodeURIComponent(room), {signal});
        const data = await response.json() as {messages?: ChatMessage[]; error?: string};
        if (disposed) return;
        if (response.ok && Array.isArray(data.messages)) receive(data.messages);
        else fail(data.error || 'Could not open this table. Please try again.',response.status);
      } catch {
        if (!disposed) fail('Could not refresh this table. Please check your connection.');
      } finally {
        clearTimeout(timeout);
        pending = undefined;
      }
    })();
    return pending;
  }
  return {load, dispose() {disposed = true; controller?.abort();}};
}
