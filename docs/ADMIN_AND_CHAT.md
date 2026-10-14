# Host controls and private notes

The deployed production candidate includes these controls plus the member-pilot work. Production D1 has migrations `0000` through `0010`; the hosted lifecycle and recorded 100-client pilot sample passed.

## Host access

Open `/host`. The username defaults to `momo`; set `ADMIN_USERNAME` privately to change it. The password is the existing `HOST_PASSCODE` configured by the owner. No new password is committed. Every admin API request checks the server-owned host proof; member-supplied roles and identity headers are never accepted.

The same notebook contains a searchable, paginated member directory, consented email/phone details, nickname changes, suspension/restoration, typed-confirmation deletion, gang roster/removal, group size (2–500), host-recorded attendance, published-plan editing and public/gang message moderation. Existing invitation, plan creation, gallery and report controls remain in that page. The host does not create authenticated member identities or consent on someone else's behalf.

Suspension prevents posting, wish participation, private notes and invitation sends. Device seats are separate identities; suspension is not a phone-level ban. Deletion removes the member's profile, requests, photos, attendance, wishes and conversations. The hashed email-delivery tombstone remains to prevent repeated sends. Host actions have an audit record.

Published plans cannot be silently edited or removed once invitation attempts or attendance exist. Change the plan with the affected people and retain its record.

## Private notes

Only members whose attendance at the same published meetup was confirmed by a host can start a conversation, and both must opt in. Hosts can record attendance after the meetup starts for a gang member or a confirmed invite request. Opt-out, blocking, suspension or removal of the shared attendance closes existing conversation access on the server. Contacts never appear in the peer list or messages.

Adda has a conversation-type switch for community tables and private notes. Members can find a nickname, send a note, report it, block a peer and undo a block. The host console lists public/gang messages; a reported private note appears in the report inbox. Storage is not end-to-end encrypted.

## Capacity limits and next work

The five-second poll remains the authenticated fallback. The active production path uses the deployed Durable Object/WebSocket service, loads at most the latest 80 messages and keeps bounded member send budgets. Raising gang capacity to 500 does **not** establish that 500 concurrent chat users are supported. The home page transfers at most eight avatars per wish, and a single conditional D1 insert prevents concurrent joins from overfilling a group.

The native D1/Durable Object chat service is deployed with WebSocket delivery, idempotent sends, burst budgets, current permission checks and reconnect history. Isolated lifecycle and 25/50/100-client hosted checks passed, alongside a 500-client local fanout. The recorded hosted run supports the controlled 100-seat pilot workload; it does not prove a 500-person hosted ceiling. Physical-device/screen-reader checks and live quota monitoring remain required before broader promotion. See `REALTIME_CHAT.md`, `D1_GATEWAY.md` and `PILOT_OPERATIONS.md`.

## Verification

Run the Next production build and TypeScript check before the Vinext build, then `node tests/community.integration.mjs`. The disposable Worker/D1 suite exercises host permissions, member search/moderation, capacity, attendance, private access, blocks/opt-out and deletion. Invitation-provider suites intercept every outbound request. Neither local tests nor a preview prove production capacity or email delivery.
