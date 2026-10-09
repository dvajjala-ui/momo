# Host controls and private notes

Candidate on `codex/admin-messaging`, based on the email-letter candidate. Production activation needs the additive `0005`, `0006` and `0007` migrations and a reviewed deployment.

## Host access

Open `/host`. On Vercel, the username defaults to `momo`; set `ADMIN_USERNAME` privately to change it. The password is the existing `HOST_PASSCODE` configured by the owner. No new password is committed. The Site continues to use the server-side `ADMIN_EMAILS` allowlist. Every admin API request checks the server identity; member-supplied roles and identity headers are not accepted on Vercel.

The same notebook contains a searchable, paginated member directory, consented email/phone details, nickname changes, suspension/restoration, typed-confirmation deletion, gang roster/removal, group size (2–500), host-recorded attendance, published-plan editing and public/gang message moderation. Existing invitation, plan creation, gallery and report controls remain in that page. The host does not create authenticated member identities or consent on someone else's behalf.

Suspension prevents posting, wish participation, private notes and invitation sends. Device seats are separate identities; suspension is not a phone-level ban. Deletion removes the member's profile, requests, photos, attendance, wishes and conversations. The hashed email-delivery tombstone remains to prevent repeated sends. Host actions have an audit record.

Published plans cannot be silently edited or removed once invitation attempts or attendance exist. Change the plan with the affected people and retain its record.

## Private notes

Only members whose attendance at the same published meetup was confirmed by a host can start a conversation, and both must opt in. Hosts can record attendance after the meetup starts for a gang member or a confirmed invite request. Opt-out, blocking, suspension or removal of the shared attendance closes existing conversation access on the server. Contacts never appear in the peer list or messages.

Adda has a conversation-type switch for community tables and private notes. Members can find a nickname, send a note, report it, block a peer and undo a block. The host console lists public/gang messages; a reported private note appears in the report inbox. Storage is not end-to-end encrypted.

## Capacity limits and next work

The current transport still polls every five seconds, loads the latest 80 messages, and throttles sends to one per three seconds. It is a small-pilot transport. Raising gang capacity to 500 does **not** establish that 500 concurrent chat users are supported. The home page transfers at most eight avatars per wish, and a single conditional SQLite insert prevents concurrent joins from overfilling a group.

Before broader launch, move chat reads/writes to a native Cloudflare D1 binding, add a Durable Object per room with WebSocket delivery, bounded history/cursors, idempotent sends, burst limits and access-revocation handling, then test reconnects, moderation and simultaneous clients. Cloudflare's [WebSocket guide](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [real-time chat tutorial](https://developers.cloudflare.com/workers/tutorials/deploy-a-realtime-chat-app/) describe the supported room architecture. Check actual [free-tier quotas](https://developers.cloudflare.com/durable-objects/platform/pricing/) before activation; free usage is limited.

## Verification

Run the Next production build and TypeScript check before the Vinext build, then `node tests/community.integration.mjs`. The disposable Worker/D1 suite exercises host permissions, member search/moderation, capacity, attendance, private access, blocks/opt-out and deletion. Invitation-provider suites intercept every outbound request. Neither local tests nor a preview prove production capacity or email delivery.
