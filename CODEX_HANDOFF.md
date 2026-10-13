# Momo to Pizza handoff

Last updated: 2026-10-13

Read `AGENTS.md` and `docs/PRODUCTION_REQUIREMENTS.md` before making changes. The requirements file preserves the owner’s full 28-point brief verbatim and is the detailed source of truth.

## Latest continuation

Work directly on `main`, as the owner requested. The latest completed hosted checks, resource inventory, current stage, application flow and next steps are in `docs/WORK_SUMMARY_2026-10-13.md`. Requirements #13/#19/#20 now have isolated hosted pilot evidence; #10 and parts of #14 remain pending. The API perimeter rule is enforced. Production Turnstile, uploads and Axiom delivery remain unactivated until their remaining checks pass. Axiom token setup was left pending at the owner's request. Historical branch/SHA references below describe earlier work and are not the current checkout.

## Product

Momo to Pizza helps people turn a small food or activity idea into a real public meetup. It uses a playful crayon/scrapbook style and two persistent food editions. Keep the tone warm and low pressure. Do not invent members, events, urgency or safety claims. Do not label personalities.

The main experience is Ghar, Adda and Count me in. `/host` is the private direct owner route and is intentionally absent from public navigation. Device sessions provide low-friction pseudonymous seats. The browser cannot grant itself a role or identity.

Reference images under `assest/` have unverified publication rights. The current candidate uses original covers and treats those files as inspiration only. The two film documents are production briefs, not finished films.

## Current branch and production

- Production source: `main` at merge commit `d06df2d` (pull request #5)
- Current continuation branch: `codex/continue-launch-readiness`, created from `d06df2d`
- Vercel production: `https://momo-ten-pied.vercel.app`
- Existing Site: `https://momo-weekend-club.dwarkeshprakash.chatgpt.site`, owner-private
- Site project ID: preserved in `.openai/hosting.json`
- Cloudflare account: contains D1 `momo-community` and R2 `momo-media`
- Production D1 ledger: migrations `0000` through `0010`, verified after owner-approved application on 2026-10-13
- Cloudflare Workers: `momo-db-gateway` and `momo-chat` deployed on 2026-10-13 with separate private credentials

GitHub/Vercel and Sites have separate ancestry. A GitHub push does not publish the existing Site. Keep the Site audience and project ID unless the owner explicitly changes them.

Vercel Production has `HOST_PASSCODE`, the existing D1/R2 variables, and all five gateway/chat variables. The deployed Workers are at `https://momo-db-gateway.contact-dwarkesh.workers.dev` and `https://momo-chat.contact-dwarkesh.workers.dev`; `MOMO_CHAT_APP_ORIGIN` is the exact Vercel site origin. Do not expose or read back secret values.

The merged `d06df2d` build reached Vercel before its D1 migrations and `GET /api/community` returned HTTP 503. A restore bookmark was recorded in the ignored local `.wrangler/` directory, migrations `0005` through `0010` were applied in order to `momo-community` with owner approval, the ledger was read back, and the public API returned HTTP 200. This is an incident recovery check, not a complete hosted flow test.

After separate owner approval, the two Workers and their credentials were activated, the five Vercel Production settings were added, and the existing `d06df2d` deployment was rebuilt and aliased to the production URL. The read-only gateway probe passed. A live disposable device seat created a chat profile, opened Adda, and caused successful `/api/chat` requests; it was then permanently deleted with owner approval and the UI returned to signed-out state. A read-only D1 count confirmed zero profiles remain under its test nickname. No public wish, message, event, email or WhatsApp delivery was created. Cloudflare showed 106 gateway and 10 chat invocations with zero Worker errors at inspection. Temporary local copies of the new credentials were removed after verification; the D1 restore bookmark remains ignored under `.wrangler/`. These are small smoke checks, not sustained-load or complete host-flow evidence.

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

After the owner’s simplification request, TypeScript, repository lint, both production builds, community, invitation, chat-ticket and realtime integration checks passed again. These checks include nickname/age/gender persistence and chat output, invitation consent without an age gate, and the complete migration chain through `0010`. A subsequent narrow-screen browser pass checked the simplified Ghar, Join and Adda pages, seat creation and edition switching with an initialized disposable local D1. It found no browser errors and exposed a stale Adda sentence and wish-profile link, corrected on the continuation branch. The continuation branch passed TypeScript, lint, Vinext build, all eight relevant integration suites and the Next Webpack build; a default Turbopack Next build stalled locally and was interrupted. Desktop and physical-device checks remain pending.

`tests/vercel-storage.integration.mjs` was not rerun because it requires two separately configured Next servers backed by the same durable resources. Earlier production adapter evidence exists; use disposable data if repeating it.

## Production release order

Release follow-up on 2026-10-13: owner-approved PR #6 merged as `0793a09`. Vercel Production reported Ready for that exact merge commit at `momo-ten-pied.vercel.app`. Home, Join, Adda and the public community API returned HTTP 200, and the live Adda showed the corrected profile copy. The earlier `d06df2d` references above describe the initial Worker activation release.

`node tests/next-instances.integration.mjs` also passed against two independent local Next processes sharing a fresh disposable SQLite database. Wish capacity, cross-instance gang messages, outsider/host denial and cross-instance account deletion passed. The processes and temporary database were removed. This is local app persistence evidence; hosted D1/R2 and sustained-load checks remain open.

The two-instance host-control checks were added on the continuation branch and merged in pull request #7 as `0b02577`. This records code integration only; a Vercel readiness check for that exact merge was not recorded here.

Pull request #8 merged the image upload protection source as `3a6c18c`. New uploads fail closed unless R2, gateway settings and the server-only `MOMO_IMAGE_UPLOADS_ENABLED=true` flag are configured. The gateway source uses a Cloudflare Images binding to decode, limit dimensions and re-encode to WebP before R2 storage. Local mocked processor, fail-closed community and gateway integration checks passed, as did Next and Vinext builds, TypeScript and lint. The updated gateway and real Images binding have **not** been deployed or smoke-tested; keep the flag unset until a disposable hosted upload confirms conversion, metadata removal and private-media access rules. Existing media remains readable.

1. Completed: merge `d06df2d`, record a D1 restore bookmark, apply `0005` through `0010`, verify the ledger and restore the public API.
2. Completed: deploy `momo-db-gateway` and `momo-chat` with separate 48-byte random credentials and an exact chat origin; add the five server-only Vercel settings; redeploy `d06df2d`.
3. Completed smoke: authenticated gateway read, live device seat/profile, successful chat-ticket requests, Worker activity and test-seat deletion. Brief samples showed gateway health p50 139 ms/p95 397 ms (12 requests) and public community GET p50 1322 ms/p95 1462 ms (8 requests), with no failed responses. These do not establish hosted capacity.
4. Remaining before broader promotion: verify one-click wish/gang access, host controls, reconnect, queue/suspension and deletion in a separate disposable hosted environment; record sustained latency, errors, D1 usage and Durable Object behavior. Do not send invitations or create fake public events.

Before a large Reddit launch, add Cloudflare edge rate limits and Turnstile, deploy and verify the safe image processor or keep uploads paused, configure redacted monitoring and practice D1 restore. The current recommendation is a controlled pilot of at most 100 active seats after the production smoke check.

WhatsApp readiness flags remain gates. Do not enable sending until the real sender, approved template, public signed callback and phone verification work. Gmail is also disconnected and has sent no real message.

## Owner decisions kept last

The first real meetup still needs a venue with full address, date, named host, clear end time, capacity, full cost, moderation contact and emergency/exit plan. The stated options are Kitab Khana/Kitab Ghar or Sindhu Bhavan, starting around 5:00 pm.

## Working-tree care

Preserve unrelated creative work in `docs/video-series.md`, `docs/video-*.md`, `assest/` and `output/`. Keep it out of continuation commits unless the owner explicitly asks.

## Code map

- `app/momo.tsx`: shell, navigation, session/profile/chat/rules/privacy
- `app/home-playful.tsx`, `app/globals.css`: homepage and visual system
- `app/wishes.tsx`: wish wall and one-click join
- `app/letters.tsx`, `app/invitation.ts`: covers, letters and export
- `app/admin-console.tsx`, `app/host-desk.tsx`: host controls
- `app/sidekicks.tsx`, `app/sidekicks/page.tsx`: Sidekicks application
- `app/api/community/route.ts`, `app/api/admin/route.ts`: member and host APIs
- `lib/momo-server.ts`, `lib/member-access.ts`: device identity and access gates
- `cloudflare/db-gateway/`, `cloudflare/chat/`: active production Workers; keep credentials private
- `db/schema.ts`, `drizzle/`, `lib/migrations.generated.ts`: schema and preserved migration chain
- `docs/PRODUCTION_REQUIREMENTS.md`: exact requirements and status
- `docs/SECURITY_REVIEW.md`: threats, controls and remaining production work
