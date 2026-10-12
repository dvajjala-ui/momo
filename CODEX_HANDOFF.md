# Momo to Pizza handoff

Last updated: 2026-10-13

Read `AGENTS.md` and `docs/PRODUCTION_REQUIREMENTS.md` before making changes. The requirements file preserves the owner’s full 28-point brief verbatim and is the detailed source of truth.

## Product

Momo to Pizza helps people turn a small food or activity idea into a real public meetup. It uses a playful crayon/scrapbook style and two persistent food editions. Keep the tone warm and low pressure. Do not invent members, events, urgency or safety claims. Do not label personalities.

The main experience is Ghar, Adda and Count me in. `/host` is the private direct owner route and is intentionally absent from public navigation. Device sessions provide low-friction pseudonymous seats. The browser cannot grant itself a role or identity.

Reference images under `assest/` have unverified publication rights. The current candidate uses original covers and treats those files as inspiration only. The two film documents are production briefs, not finished films.

## Current branch and production

- Candidate branch: `codex/production-readiness-2`
- Candidate base: `b7cf62d`, identical to `origin/main` after fetch on 2026-10-13
- Vercel production: `https://momo-ten-pied.vercel.app`
- Existing Site: `https://momo-weekend-club.dwarkeshprakash.chatgpt.site`, owner-private
- Site project ID: preserved in `.openai/hosting.json`
- Cloudflare account: contains D1 `momo-community` and R2 `momo-media`
- Production D1 ledger: migrations `0000` through `0004`
- Cloudflare Workers: none deployed as of the inspection

GitHub/Vercel and Sites have separate ancestry. A GitHub push does not publish the existing Site. Keep the Site audience and project ID unless the owner explicitly changes them.

Vercel Production already has `HOST_PASSCODE` and existing D1/R2 variables. It does not have the five new gateway/chat variables. Do not expose or read back any secret values.

## Candidate changes

- Removed the ChatGPT sign-in module, links and trusted-identity-header path. Session state is site-owned and device-cookie based.
- Fixed signed-out UI state after a 401 and verified seat exit without a page reload.
- Renamed the product and document title to **Momo to Pizza**.
- Made the momo/pizza edition switch more visible.
- Added original sealed invitation covers that open into Hero, Princess or Notebook letters.
- Added D1-backed normalized nickname claims and conflict suggestions that preserve the typed nickname.
- Added one-click wish join before profile setup and a maximum of three active groups.
- Kept wish creators anonymous in public output.
- Added honest 100-active-seat enforcement, real counts, active/queued/suspended host controls and private site notes.
- Made unnamed one-click seats visible and manageable in the host directory.
- Added a Sidekicks page, D1 application storage and host review status without granting product privileges.
- Added D1-backed host-login attempt limits and global browser security headers.
- Added `docs/SECURITY_REVIEW.md`.
- Added a light “Made with love, always.” footer, focus-only skip link and collapsed image credits.
- Removed the age eligibility rule. Nickname, exact age and self-described gender are collected only when someone first tries to message and appear beside chat messages.
- Simplified Home and Join, removed the Join postcard preview/member badge/profile card, and kept the real momo/pizza photograph prominent in both editions.
- Fixed chat-ticket future clock skew handling.
- Disabled internal Next link prefetch where Vinext’s compatibility shim produced browser console errors.

The additive migration `drizzle/0009_member_pilot.sql` creates nickname claims, host messages, sidekick applications and host-login limits, and backfills active controls. `drizzle/0010_profile_details.sql` adds age and gender to profiles. `lib/migrations.generated.ts` includes migrations `0000` through `0010`.

## Verification

The candidate has passed:

- `pnpm exec next typegen`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm run build`
- `$env:MOMO_TARGET='next'; pnpm exec next build`
- `node tests/community.integration.mjs`
- `node tests/chat-ticket.integration.mjs`
- `node tests/invitations.integration.mjs`
- `node tests/gateway.integration.mjs`
- `node tests/chat-live.test.mjs`
- `node tests/chat-poll.test.mjs`
- `node tests/realtime.integration.mjs`
- `node tests/storage.integration.mjs`

Invitation tests use fake/intercepted providers and do not contact real email or WhatsApp recipients.

The 500-client local realtime probe delivered one persisted message exactly once to all clients: p50 33 ms, p95 42 ms, max 43 ms. This is isolated local evidence, not hosted capacity.

The built local Worker was checked in a browser for signed-out seat creation, edition persistence, invitation covers, one-click wish join, direct gang chat, deferred nickname setup, seat exit, Sidekicks submission, direct host login and administration of named and unnamed seats. A clean test page had no console errors.

After the owner’s simplification request, TypeScript, repository lint, both production builds, community, invitation, chat-ticket and realtime integration checks passed again. These checks include nickname/age/gender persistence and chat output, invitation consent without an age gate, and the complete migration chain through `0010`. Browser checks above describe the earlier layout; the simplified layout has not had a new visual browser pass yet.

`tests/vercel-storage.integration.mjs` was not rerun because it requires two separately configured Next servers backed by the same durable resources. Earlier production adapter evidence exists; use disposable data if repeating it.

## Production release order

1. Review and merge the exact candidate commit.
2. Create a production restore point and apply migrations `0005` through `0010` to D1 `momo-community` in order.
3. Generate separate strong secrets privately and deploy `momo-db-gateway` and `momo-chat`.
4. Add `MOMO_DB_GATEWAY_URL`, `MOMO_DB_GATEWAY_TOKEN`, `MOMO_CHAT_URL`, `MOMO_CHAT_SECRET` and `MOMO_CHAT_APP_ORIGIN` to Vercel Production. The app origin is `https://momo-ten-pied.vercel.app` unless the canonical production domain changes.
5. Deploy the reviewed commit and use disposable seats to check session, one-click join, host controls, gateway, chat reconnect, queue/suspension and deletion. Do not send invitations.
6. Record live latency, errors, D1 usage and Durable Object behavior before broad promotion.

Before a large Reddit launch, add Cloudflare edge rate limits and Turnstile, add server-side image decode/re-encode or disable uploads, configure redacted monitoring and practice D1 restore. The current recommendation is a controlled pilot of at most 100 active seats after the production smoke check.

WhatsApp readiness flags remain gates. Do not enable sending until the real sender, approved template, public signed callback and phone verification work. Gmail is also disconnected and has sent no real message.

## Owner decisions kept last

The first real meetup still needs a venue with full address, date, named host, clear end time, capacity, full cost, moderation contact and emergency/exit plan. The stated options are Kitab Khana/Kitab Ghar or Sindhu Bhavan, starting around 5:00 pm.

## Working-tree care

The owner has separate uncommitted creative work in `docs/video-series.md`, the untracked `docs/video-*.md` files, `assest/` and `output/`. Preserve it. Do not include it in the production-readiness commit unless the owner explicitly asks.

## Code map

- `app/momo.tsx`: shell, navigation, session/profile/chat/rules/privacy
- `app/home-playful.tsx`, `app/globals.css`: homepage and visual system
- `app/wishes.tsx`: wish wall and one-click join
- `app/letters.tsx`, `app/invitation.ts`: covers, letters and export
- `app/admin-console.tsx`, `app/host-desk.tsx`: host controls
- `app/sidekicks.tsx`, `app/sidekicks/page.tsx`: Sidekicks application
- `app/api/community/route.ts`, `app/api/admin/route.ts`: member and host APIs
- `lib/momo-server.ts`, `lib/member-access.ts`: device identity and access gates
- `cloudflare/db-gateway/`, `cloudflare/chat/`: inactive production Worker candidates
- `db/schema.ts`, `drizzle/`, `lib/migrations.generated.ts`: schema and preserved migration chain
- `docs/PRODUCTION_REQUIREMENTS.md`: exact requirements and status
- `docs/SECURITY_REVIEW.md`: threats, controls and remaining production work
