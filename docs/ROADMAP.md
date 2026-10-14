# Momo to Pizza roadmap

The complete 28-point owner brief, exact expected behavior and per-item status live in [PRODUCTION_REQUIREMENTS.md](PRODUCTION_REQUIREMENTS.md). Update that file whenever a feature request is added or its status changes.

## Current release state

Production is currently sourced from `main` at `194f233` (14 October 2026). D1 migrations `0000` through `0010`, the database gateway, realtime Worker and private R2 path are active. The combined isolated lifecycle, 25/50/100-client hosted sample, Vercel API perimeter rule and production private-photo smoke passed. Uploads are enabled. Persistent Axiom monitoring and complete first-event details remain the two launch gaps from the 28-point brief. Production Turnstile stays off under the owner's low-friction decision and because its disposable replay check failed.

Completed in the candidate:

- device-only site sessions with all ChatGPT sign-in code and UI removed
- **Momo to Pizza** branding and a more visible momo/pizza edition switch
- custom sealed invitation covers that reveal the Hero, Princess or Notebook letter
- durable unique nicknames with suggestions that preserve the typed value
- one-click wish join before profile creation and a three-active-group limit
- anonymous wish ownership in public responses
- honest 100-seat active/queued/suspended pilot controls and real counts
- host site messages to named and unnamed device seats
- a Sidekicks application and host review flow without special access
- host-login throttling, security headers and a documented security review
- hidden public Host link, focus-only skip link, collapsed credits and the requested footer
- no age eligibility rule; nickname, age and self-described gender are collected only at first chat and shown beside messages
- simplified three-page flow with the real momo/pizza photo prominent and duplicate postcard/badge sections removed
- chat-ticket future-clock handling fixed
- disposable integration coverage expanded for the new member and host flows
- built-site browser checks for signed-out entry, one-click gang chat, deferred profile, seat exit, sidekick form and host controls
- 500-client local realtime fanout: p50 33 ms, p95 42 ms, max 43 ms, one delivery per client in the tested run

The newest migration is `0010_profile_details`. It adds nullable age and gender fields after the existing additive migration `0009_member_pilot`.

## Release actions pending

- [x] Review and merge the production-readiness pull request (`d06df2d`).
- [x] Record a D1 restore bookmark, apply migrations `0005` through `0010` to production `momo-community`, and verify the ledger and public API (2026-10-13).
- [x] Create separate private secrets and deploy `momo-db-gateway` and `momo-chat` (2026-10-13).
- [x] Add `MOMO_DB_GATEWAY_URL`, `MOMO_DB_GATEWAY_TOKEN`, `MOMO_CHAT_URL`, `MOMO_CHAT_SECRET` and `MOMO_CHAT_APP_ORIGIN` to Vercel Production; redeploy `d06df2d`.
- [x] Smoke-test a disposable live device seat, profile, Adda access and deletion without sending a message or invitation.
- [x] Verify hosted wish/gang, reconnect and host/queue/suspension flows in a disposable environment.
- [x] Record hosted 25/50/100-client latency, WebSocket fanout/reconnect behavior, client errors and provider measurements.
- [x] Enforce and verify the Vercel API perimeter rule.
- [x] Verify image decode/re-encode, metadata removal, private access, replacement and deletion in isolation and production; enable `MOMO_IMAGE_UPLOADS_ENABLED=true`.
- [x] Perform the disposable D1 Time Travel recovery drill and document the recurring procedure.
- [ ] Replace/configure the Axiom ingest-only token, observe one redacted probe and one controlled failed-host-login event, then configure pilot alerts.
- [ ] Keep Turnstile disabled. If the product decision changes, fix the observed replay acceptance and repeat protected desktop/mobile lifecycle checks before activation.
- [ ] Confirm the real event details and pass the go/no-go checklist in [`PILOT_OPERATIONS.md`](PILOT_OPERATIONS.md) before opening enrollment.

The existing Site project remains owner-private. Its ID in `.openai/hosting.json` must stay unchanged. GitHub/Vercel and Sites have separate deployment ancestry, so a GitHub push does not publish the Site.

## Owner decisions kept last

### First meetup

Choose and confirm one real plan before publishing it:

- Kitab Khana/Kitab Ghar or Sindhu Bhavan, with city and full public address
- calendar date, 5:00 pm start and a clear planned end time
- named host
- attendee capacity
- full per-person cost
- moderation contact and emergency/venue-exit plan

Guests can still leave whenever they want. The product should not publish “until bored” as the only end-time information.

## Later work

- Connect the dedicated Gmail sender only when the owner is ready for a real test inbox. Email remains disabled and no real message has been sent.
- Keep WhatsApp disabled until the real sender, approved template, signed public callback and phone proof are working.
- Add delivery/bounce handling and a reviewed reminder queue after the first email pilot.
- Decide whether verified email should recover a lost device seat.
- Complete physical-device and screen-reader testing.
- Keep the seven removed moodboard images out of the working tree unless publication rights are documented. Continue using original replacements and attributed Wikimedia food photos.
- Produce the two film briefs through a real video workflow. They remain briefs, not finished movies.

## Continuing rules

- Read `AGENTS.md`, `CODEX_HANDOFF.md` and `PRODUCTION_REQUIREMENTS.md` before changing code.
- Preserve the scrapbook/crayon brand, both food editions, migrations and `.openai/hosting.json`.
- Never add fake members, fake events, pressure copy, personality labels or unsupported safety claims.
- Never trust browser roles or identity headers. Keep host authorization server-side.
- Never commit secrets or participant data. Invitation integration tests must use intercepted providers.
- Run type generation, TypeScript, lint, both production builds and the relevant disposable integrations after functional changes.
