import assert from 'node:assert/strict';
import {createChatPoll} from '../lib/chat-poll.ts';

let complete, signal, calls = 0;
const received = [], errors = [];
const oldRoom = createChatPoll('w_old-room', messages => received.push(messages), error => errors.push(error), async (url, options) => {
  calls++;
  assert.equal(url, '/api/community?view=chat&room=w_old-room');
  signal = options.signal;
  return new Promise(resolve => {complete = resolve;});
});
const first = oldRoom.load();
assert.equal(oldRoom.load(), first);
assert.equal(calls, 1, 'polling must not overlap');
oldRoom.dispose();
assert.equal(signal.aborted, true);
complete(Response.json({messages: [{id: 'private-old-message'}]}));
await first;
assert.deepEqual(received, [], 'a late private-room response must not populate the next room');
assert.deepEqual(errors, []);
await oldRoom.load();
assert.equal(calls, 1, 'disposed rooms must not fetch again');
console.log('PASS overlapping polls and late private-room responses');

const current = createChatPoll('food', messages => received.push(messages), error => errors.push(error), async () => Response.json({messages: [{id: 'current-message'}]}));
await current.load();
assert.deepEqual(received, [[{id: 'current-message'}]]);
current.dispose();
console.log('PASS current room loads independently');

for (const status of [401, 403]) {
  const denied = createChatPoll('food', () => assert.fail('denied messages must not be shown'), error => errors.push(error), async () => Response.json({error: 'Room access denied'}, {status}));
  await denied.load();
  denied.dispose();
}
assert.deepEqual(errors, ['Room access denied', 'Room access denied'], 'current access errors are announced');
const offline = createChatPoll('food', () => assert.fail(), error => errors.push(error), async () => {throw Error('network');});
await offline.load();
offline.dispose();
assert.match(errors.at(-1), /check your connection/);
console.log('PASS access and offline error handling');
