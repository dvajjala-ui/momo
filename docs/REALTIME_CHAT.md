# Real-time chat candidate

The app includes a standalone Cloudflare chat Worker, one Durable Object per room, and an optional browser connection. It was deployed and enabled on Vercel Production on 2026-10-13 after the required D1 migrations and separate owner approval. The five-second poll remains a reconnect fallback.

## What is implemented

- Vercel derives identity and host access from the existing authenticated session. Its same-origin `/api/chat` endpoint checks the room on the chat Worker before issuing a signed ticket valid for 30 seconds. Browser-provided roles and identity headers cannot authorize a ticket on Vercel.
- The Worker checks the exact configured site origin and ticket signature. Tickets travel in the WebSocket subprotocol header, never a URL. The permanent secret is server-only.
- Native D1 checks public/gang/private room access at connection, history, send and delivery. Private notes still require shared confirmed attendance, mutual opt-in, no block in either direction and active members. A host role does not grant access to another person's private thread.
- A room uses hibernatable WebSockets and sends new messages incrementally. Each fanout uses one bounded recipient-access query, including block visibility, rather than a query for each connected member. History is at most 80 notes.
- An atomic D1 batch saves the note, its retry receipt and a member-wide budget of ten notes per ten seconds. HTTP and socket retries share a client message ID; retries do not duplicate a saved note, spend extra budget or resurrect a removed note. Changing the body/room while reusing an ID is rejected.
- The client reconnects with backoff, preserves the ID after an uncertain send, recovers persisted history, closes inactive-tab connections and ignores late responses from disposed rooms. A late history read cannot overwrite a newer live note.
- Connections renew server authorization every 55 seconds and have a 60-second lease. A removed member is excluded from subsequent fanout and gets a revocation frame. Blocks hide authors without closing a public room. An idle conversation is rechecked on renewal. Already received copies cannot be recalled.
- A failed broadcast does not change a successfully persisted note into a failed send. Renewal/history recovers a missed delivery. Socket failure falls back to the authenticated HTTP transport; it uses the same native chat service when configured. Permanent configuration failures do not silently switch storage.
- Up to two live connections per member per room and 1,000 connections per room are allowed by this candidate. Frame sizes/bursts and the pending-send queue are bounded; an overloaded room rejects additional sends with a retryable error. These values are guards, not production capacity promises.

## Local evidence

```sh
node tests/chat-live.test.mjs
node tests/realtime.integration.mjs
node tests/chat-ticket.integration.mjs # after the Vinext build
```

The isolated Worker/D1 suite covers signature/origin/expiry boundaries, live delivery, identity stripping, HTTP/socket deduplication, removed-note retries, reconnect history, blocks, gang removal, private-note revocation, cross-room burst races and transaction rollback. The client suite checks acknowledgements, uncertain sends, live/history races and disposal.

On 2026-10-13, a separate **500-client local network fanout** delivered one persisted note exactly once to every connected client: p50 33 ms, p95 42 ms, max 43 ms. These are Windows/Miniflare measurements with local disposable data; they do not establish Cloudflare-to-device latency, sustained throughput, production quotas or the number of users the hosted service can support. The default suite uses 50 clients. To repeat the larger local probe in PowerShell:

```powershell
$env:MOMO_CHAT_LOAD_CLIENTS='500'
node tests/realtime.integration.mjs
```

## Activation after review

1. Completed: applied additive migrations `0005` through `0010` to `momo-community`. `0008_serious_impossible_man` adds retry receipts and burst budgets; `0009_member_pilot` adds member-pilot controls; `0010_profile_details` adds chat age and gender fields.
2. Completed: reviewed `cloudflare/chat/wrangler.jsonc`, deployed the Worker and configured a separate 48-byte random `MOMO_CHAT_SECRET` plus the exact `MOMO_CHAT_APP_ORIGIN=https://momo-ten-pied.vercel.app` in private settings. Vercel Production has the matching server-only settings; no secret value was committed or placed in a command argument.
3. Completed smoke: a live disposable seat/profile opened Adda and Vercel logged successful `/api/chat` requests. Cloudflare showed 10 chat Worker invocations and zero execution errors at inspection. The seat was deleted through the site. No message or invitation was sent.
4. Remaining: test the exact hosted SHA with disposable private/gang rooms, reconnects, block/opt-out, suspension/removal, moderation and deletion in a separate test environment. Measure sustained fanout, reconnect storms, slow/offline clients, actual mobile latency and quotas. Complete physical-device/screen-reader review before a wider audience.

## Remaining limits

The hosted service is deployed but has not had a sustained load test. Permission checks use current database snapshots; an already in-flight delivery or previously received copy cannot be recalled. Moderated notes and profile edits are reconciled by refresh/renewal, rather than instantly rewriting all clients. Invitation delivery/bounces, email recovery and retention/cleanup policy for retry receipts remain separate work. The current retry receipts remain until member deletion; review storage growth and retention before broader launch.

Cloudflare's [hibernatable WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) allow idle connections to survive object hibernation. Its [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [D1 allowances](https://developers.cloudflare.com/d1/platform/pricing/) still apply; the free plan is not unlimited.
