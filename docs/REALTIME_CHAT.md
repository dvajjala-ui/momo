# Real-time chat candidate

The admin branch includes a standalone Cloudflare chat Worker, one Durable Object per room, and an optional browser connection. It is built and tested locally. **No chat Worker, secret, runtime setting or production migration has been activated.** Without its settings, the site continues using the existing five-second poll and three-second send throttle.

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

On 2026-10-09, a separate **500-client local network fanout** delivered one persisted note exactly once to every connected client: p50 41 ms, p95 51 ms, max 52 ms. These are Windows/Miniflare measurements with local disposable data; they do not establish Cloudflare-to-device latency, sustained throughput, production quotas or the number of users the hosted service can support. The default suite uses 50 clients. To repeat the larger local probe in PowerShell:

```powershell
$env:MOMO_CHAT_LOAD_CLIENTS='500'
node tests/realtime.integration.mjs
```

## Activation after review

1. Apply reviewed additive migrations `0005`–`0008` to the intended database before releasing the candidate. `0008_serious_impossible_man` adds retry receipts and burst budgets. Preserve existing records and earlier migrations. Disposable preview resources must be separate from production.
2. Review `cloudflare/chat/wrangler.jsonc`, including its existing `momo-community` binding and new SQLite Durable Object class migration. Set `MOMO_CHAT_APP_ORIGIN` to the exact intended HTTPS site origin. Do not allow arbitrary origins or reuse production settings for an unreviewed preview.
3. Configure a cryptographically random secret of at least 32 bytes privately as `MOMO_CHAT_SECRET` in the Worker and Vercel. Never paste its value into chat, command arguments, Git or screenshots. Use owner-operated secret entry. This credential authorizes room access and writes as application members; treat it like a database credential.
4. Deploy the reviewed chat Worker, then set `MOMO_CHAT_URL` to its HTTPS origin and `MOMO_CHAT_APP_ORIGIN` to the same exact site origin in Vercel. Keep these settings server-only. The D1 gateway has separate credentials/settings; see `D1_GATEWAY.md`.
5. Test the exact deployed SHA with disposable seats: group chat, confirmed-attendance private notes, reconnects, block/opt-out, suspension/removal, moderation and deletion. Remove disposable data through the application. Never send invitation messages during a chat probe.
6. Measure sustained hosted traffic, fanout, reconnect storms, slow/offline clients and actual mobile latency; record quotas and an achievable latency target. Complete physical-device/screen-reader review. Only then activate it for the intended audience.

## Remaining limits

The hosted service is not deployed or load-tested. Permission checks use current database snapshots; an already in-flight delivery or previously received copy cannot be recalled. Moderated notes and profile edits are reconciled by refresh/renewal, rather than instantly rewriting all clients. Invitation delivery/bounces, email recovery and retention/cleanup policy for retry receipts remain separate work. The current retry receipts remain until member deletion; review storage growth and retention before broader launch.

Cloudflare's [hibernatable WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) allow idle connections to survive object hibernation. Its [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [D1 allowances](https://developers.cloudflare.com/d1/platform/pricing/) still apply; the free plan is not unlimited.
