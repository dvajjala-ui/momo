# Momo to Pizza roadmap

The complete 28-point owner brief, exact expected behavior and per-item status live in [PRODUCTION_REQUIREMENTS.md](PRODUCTION_REQUIREMENTS.md). Update that file whenever a feature request is added or its status changes.

## Current release state

The production candidate is on `codex/production-readiness-2`, based on the exact current `origin/main` commit `b7cf62d` as checked on 2026-10-13.

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
- `18+` limited to Rules and product-source copy audited for long dash characters
- chat-ticket future-clock handling fixed
- disposable integration coverage expanded for the new member and host flows
- built-site browser checks for signed-out entry, one-click gang chat, deferred profile, seat exit, sidekick form and host controls
- 500-client local realtime fanout: p50 33 ms, p95 42 ms, max 43 ms, one delivery per client in the tested run

The new migration is `0009_member_pilot`. It is additive and follows the existing unapplied production migrations `0005` through `0008`.

## Release actions pending

- [ ] Review and merge the production-readiness pull request.
- [ ] Apply migrations `0005` through `0009` to production D1 `momo-community`, in order, and verify the migration ledger.
- [ ] Create separate private secrets and deploy `momo-db-gateway` and `momo-chat`.
- [ ] Add `MOMO_DB_GATEWAY_URL`, `MOMO_DB_GATEWAY_TOKEN`, `MOMO_CHAT_URL`, `MOMO_CHAT_SECRET` and `MOMO_CHAT_APP_ORIGIN` to Vercel Production.
- [ ] Deploy the exact reviewed commit and smoke-test the live site with disposable seats. Do not contact real invitation recipients.
- [ ] Record hosted gateway latency, WebSocket fanout/reconnect behavior, errors and quota use.
- [ ] Add Cloudflare Turnstile and edge rate limits before posting the link to a large public community.
- [ ] Add server-side image decode/re-encode and dimension limits, or keep uploads unavailable during a broad public launch.
- [ ] Configure redacted error monitoring and perform a D1 restore drill.

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

### Age and gender

Choose one:

1. Optional age band and self-described gender after joining, both skippable.
2. Collect neither.

Do not infer gender from photos and do not collect Aadhaar for this flow.

## Later work

- Connect the dedicated Gmail sender only when the owner is ready for a real test inbox. Email remains disabled and no real message has been sent.
- Keep WhatsApp disabled until the real sender, approved template, signed public callback and phone proof are working.
- Add delivery/bounce handling and a reviewed reminder queue after the first email pilot.
- Decide whether verified email should recover a lost device seat.
- Complete physical-device and screen-reader testing.
- Clear rights for user-supplied reference images or continue using original replacements.
- Produce the two film briefs through a real video workflow. They remain briefs, not finished movies.

## Continuing rules

- Read `AGENTS.md`, `CODEX_HANDOFF.md` and `PRODUCTION_REQUIREMENTS.md` before changing code.
- Preserve the scrapbook/crayon brand, both food editions, migrations and `.openai/hosting.json`.
- Never add fake members, fake events, pressure copy, personality labels or unsupported safety claims.
- Never trust browser roles or identity headers. Keep host authorization server-side.
- Never commit secrets or participant data. Invitation integration tests must use intercepted providers.
- Run type generation, TypeScript, lint, both production builds and the relevant disposable integrations after functional changes.
