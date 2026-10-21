# Momo to Pizza handoff

Last updated: 2026-10-21

Read `AGENTS.md` and `docs/PRODUCTION_REQUIREMENTS.md` before making changes. The requirements file preserves the owner’s full 28-point brief verbatim and is the detailed source of truth.

## Latest continuation

Work directly on `main`, as the owner requested. Fetch and inspect Git for the current source revision; the deployment history below records earlier releases. Requirements #13/#19/#20 have isolated hosted pilot evidence; production private photos and the Vercel API perimeter rule are active. #10 and persistent monitoring within #14 remain pending. Production Turnstile stays off by owner choice and because the disposable replay check failed. Axiom token setup remains paused at the owner's request. The 100-seat pilot is prepared but must not be described as monitored or open until the Axiom and real-event gates in `docs/PILOT_OPERATIONS.md` pass.

The 21 October product continuation clarifies Explore → Join → Participate → Attend, labels age/gender as self-provided, and adds contact/attendance trust marks. Count me in now opens a device seat as part of submitting the email request. Returning visitors see their saved request and next action first. Plan descriptions, timing, venue and cost appear before the form; expired or missing plans cannot replace a saved request. Switching plans requires an explicit form submission with a replacement notice. Email sends remain explicit and gated. See `docs/PRODUCT_FLOW_AND_TRUST.md`.

The next 21 October continuation adds **Your gangs** to Home and a collapsed overview in Adda, with counts, logistics, chat/plan links and explained leave/remove actions. Personal gangs remain available after they fall outside the public 40-wish window. Home mutations refresh both the wall and membership; leaving the selected gang moves Adda back to the weekend table. Conditional SQL now enforces the three-group budget across concurrent joins and wish creation. Paused/queued seats can release their own group or remove their own wish; ownership and participation restrictions still apply. No migration or provider-setting change is required. Worker build, TypeScript, repository lint and disposable community integrations passed. Mobile DOM checks confirmed three cards and no horizontal overflow; a Vinext Link transition failure was replaced with native navigation, but its final click-through retest is pending because browser access was disabled during QA. This does not clear the existing monitoring or real-event launch gates.

The plan-discovery continuation on 21 October adds chronological upcoming plans, search when there are more than three, expand/collapse and a public-only copy-link action with a manual-copy fallback. Started plans leave discovery; loading or failed reads no longer look like an empty community. The API reserves separate windows for the next 30 plans and 30 recent past plans, and `view=plan&id=…` resolves public details independently of those windows. Count me in loads the chosen plan directly, with cancellation of stale reads, retry and the existing expired/missing-plan gates. Email and the future WhatsApp form now use the same selected plan; expired/missing phone requests are also rejected before replacing saved data. No schema/provider changes or external sends. Plan-discovery tests, disposable community/invitation suites, Worker build, types and lint are the verification gates; browser click-through remains pending while local browser access is disabled.

The next reference-led continuation is documented in `docs/REFERENCE_PRODUCT_REVIEW_2026-10-21.md`: original optional Adda conversation prompts, room-scoped in-memory drafts, and selected-plan venue-map/calendar actions. Prompt selection only fills an empty composer for an existing complete profile; sending remains explicit. Signed-out member refresh clears drafts. The public calendar endpoint reads the current plan and rejects missing/started plans; the file is tentative, includes a 15-minute display reminder and has no invented end time, private contact or account-token parameters. It creates no seat and sends no messages. Structured event details, practical needs and post-event feedback are recorded as later work. No migration or provider settings are changed. Browser visual/click-through and calendar-app import checks remain pending while browser access is disabled.

Local verification for that continuation passed: Worker build, regenerated Next route types, TypeScript, repository lint, calendar/plan-discovery tests and the full disposable community integration suite. Deployment is checked after pushing.

The host-planning/marketing continuation is in `docs/PRODUCT_AND_MARKETING_ROADMAP.md`. The new guided composer validates real logistics, supports preview and saves a readable description in the existing schema; it is not a normalized event model or automatic RSVP cap. Legacy creation/free-text editing remain compatible. Home summaries are shorter and selected-plan details remain full. The host-only promotion disclosure prepares WhatsApp, Reddit/local-community and Instagram drafts using public event fields and clean event links. It never sends/posts, and it does not activate the held pilot. Newly published selected plans can resolve by direct lookup outside the bounded feed. No migrations, credentials or provider settings change. Final Worker build, regenerated route types, TypeScript, repository lint, host-planning tests and community/invitation integrations passed locally. Browser preview/copy checks remain pending while browser access is disabled.

## Product

Momo to Pizza helps people turn a small food or activity idea into a real public meetup. It uses a playful crayon/scrapbook style and two persistent food editions. Keep the tone warm and low pressure. Do not invent members, events, urgency or safety claims. Do not label personalities.

The main experience is Ghar, Adda and Count me in. `/host` is the private direct owner route and is intentionally absent from public navigation. Device sessions provide low-friction pseudonymous seats. The browser cannot grant itself a role or identity.

The seven unverified moodboard JPGs were removed from the current tree on 14 October 2026. Earlier Git history still contains them, so do not reuse or redistribute them without verified rights. The current candidate uses original covers. The two film documents are production briefs, not finished films.

## Initial deployment record (historical)

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

`node tests/next-instances.integration.mjs` also passed against two independent local Next processes sharing a fresh disposable SQLite database. Wish capacity, cross-instance gang messages, outsider/host denial and cross-instance account deletion passed. The processes and temporary database were removed. Later isolated hosted lifecycle, private-media and 25/50/100-client checks supplied the missing hosted evidence; see `docs/WORK_SUMMARY_2026-10-13.md`.

The two-instance host-control checks were added on the continuation branch and merged in pull request #7 as `0b02577`. This records code integration only; a Vercel readiness check for that exact merge was not recorded here.

Pull request #8 merged the image upload protection source as `3a6c18c`. The gateway uses a Cloudflare Images binding to decode, limit dimensions and re-encode to WebP before private R2 storage. Isolated and production checks later confirmed conversion, metadata removal, anonymous denial, authenticated access, replacement/deletion and R2 cleanup. Production uploads were enabled on 14 October 2026; keep the fail-closed flag and watch pilot upload failures.

1. Completed: merge `d06df2d`, record a D1 restore bookmark, apply `0005` through `0010`, verify the ledger and restore the public API.
2. Completed: deploy `momo-db-gateway` and `momo-chat` with separate 48-byte random credentials and an exact chat origin; add the five server-only Vercel settings; redeploy `d06df2d`.
3. Completed smoke: authenticated gateway read, live device seat/profile, successful chat-ticket requests, Worker activity and test-seat deletion. Brief samples showed gateway health p50 139 ms/p95 397 ms (12 requests) and public community GET p50 1322 ms/p95 1462 ms (8 requests), with no failed responses. These do not establish hosted capacity.
4. Completed for the controlled pilot: isolated one-click wish/gang access, host controls, reconnect, queue/suspension, deletion and 25/50/100-client hosted runs. Measurements and limits are in `docs/WORK_SUMMARY_2026-10-13.md`. Do not send invitations or create fake public events.

Before a large Reddit-style launch, finish persistent Axiom monitoring, physical-device accessibility, brand/media/privacy operations and the real first-event plan. The Vercel API rule, image processor/private-media path and disposable D1 restore drill are complete. Turnstile stays off under the current owner decision; fix and retest replay behavior before reconsidering it. The controlled pilot remains capped at 100 active seats.

WhatsApp readiness flags remain gates. Do not enable sending until the real sender, approved template, public signed callback and phone verification work. Gmail is also disconnected and has sent no real message.

## Owner decisions kept last

The first real meetup is intended for Kitab Ghar, Ahmedabad, Gujarat, starting at 6:00 pm with an open reading/talking/socialising/exploring format. It still needs a calendar date, exact public address, named host, clear end time, capacity, full cost, moderation contact and emergency/exit plan.

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
