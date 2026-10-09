# Momo roadmap & continuation backlog

This file is the source of truth for whoever continues the work, human or a scheduled Claude session. Pick the **first unchecked item that isn't blocked**, do it, tick it off with a one-line note and the date, then commit.

## The idea (don't lose this)

Screens got easier; making friends as an adult got harder. Reddit has the conversations, but nobody actually meets. **Momo makes the meetup happen**: make a wish, a gang forms, a host locks a public venue, time and full cost, and people show up. The tone is playful, a crayon notebook with filmy nostalgia. It never feels corporate, never pressures anyone and never labels people.

The site is **3 pages and 2 tabs**: **Ghar** (home + wish wall), **Adda** (community chat + attendance-gated private notes) and **Count me in** (`/join`: invite list, nickname, postcard, badge, rules, privacy). The header's Host login opens the existing protected `/host` notebook. Don't add more top-level pages without the owner asking.

## Pending work at a glance — 9 October 2026

| Priority | Work | Current state |
| --- | --- | --- |
| Current build | Replace chat polling/D1 management access with a native Worker and WebSocket rooms; test reconnects, abuse limits and capacity | Admin/attendance/private-note candidate is built locally; current transport is still a small pilot |
| Candidate release | Review admin/private-note candidate; approve/apply migrations 0005–0007 and deploy | Host directory/moderation, capacity and attendance controls pass disposable integration tests; production is unchanged |
| Email activation | Connect the dedicated Gmail account, then verify a confirmation and one reviewed invitation in a real inbox | Email flow is built in draft PR #3; no sender grant or real message yet |
| First meetup | Confirm a named host, public venue, date/end time, full cost and capacity; review moderation and participant/photo permissions | No real event should be announced from a preview plan |
| After first pilot | Add delivery/bounce feedback and a host-reviewed reminder queue | Provider acceptance is the last current email status; reminders are not scheduled |
| Broader launch | Replace D1 management API access with a native Worker gateway and test capacity | Current D1 REST path is for a small pilot |
| Usability | Complete screen-reader and physical-device review | Keyboard, mobile layout and contrast fixes are underway; see accessibility item below |
| Later | Decide whether verified email should recover a lost device seat; connect WhatsApp sender/template/callback/phone proof; finish original art and two films; clear rights/privacy/event obligations | No WhatsApp account or film delivery is needed for the email pilot |

The detailed checkboxes below are authoritative. A GitHub push to the draft email branch produces a Vercel preview; it does not apply the new production migrations or release email sending.

## Current priority — host control and messaging

The owner requested one place to manage the app and confirmed that private notes must require shared host-confirmed attendance. Work is on `codex/admin-messaging`, stacked on the email candidate. See `docs/ADMIN_AND_CHAT.md`.

- [x] 2026-10-09: Host username/password form using the existing private passcode; server-protected overview, searchable/paginated members and contacts, nickname editing, suspension/restoration, typed deletion and audit history.
- [x] 2026-10-09: Gang rosters/removal and capacity controls (2–500), atomic join/capacity checks, bounded wish-card avatars, attendance controls, guarded plan editing and public/gang moderation in the same notebook.
- [x] 2026-10-09: Private notes require shared confirmed attendance and mutual opt-in. Blocks, opt-out and suspension close server access; report/unblock controls are included. Adda polls only the selected conversation type.
- [ ] Replace the five-second polling and three-second send throttle with a native Worker/D1 and WebSocket room service, idempotent sends, bounded history, burst limits and permission revocation. A 500-person capacity setting is not proof of concurrent chat capacity.
- [ ] Run multi-client reconnect, moderation and load checks against the new transport before activating it. Define and measure the latency target; do not promise zero delay.
- [ ] Review/deploy the tested candidate and apply additive migration `0007_nappy_goliath` alongside the earlier pending migrations. Keep production records and sending gates intact.

## Current priority — email letters

The owner selected email first on 2026-10-09 and specified `the.world.is.waiting.for.uu@gmail.com`. WhatsApp remains future scope. Candidate work is on `codex/email-invitations`; it is not deployed to production.

- [x] 2026-10-09: Email-only request, consent, hashed single-use confirmation, host HTML/plain-text letter preview in all three styles/both editions, reviewed send, opt-out, durable deduplication and pilot quotas. Gmail transport and exact-account check tested with intercepted provider traffic. No real emails sent.
- [x] 2026-10-09: Future phone-proof flow and host readiness preview built and tested with signed local callbacks. Sending gates remain disabled; no Meta account connected.
- [x] 2026-10-09: Corrected the canonical share-image base URL; Next no longer generates localhost image links. Local email/host mobile and keyboard checks passed. Candidate builds and isolated provider suites pass; this does not establish real email delivery.
- [x] 2026-10-09: Guarded chat polling by room so late responses cannot put private gang messages in another room; limited polls to one request at a time and announced new message counts without reading the entire chat on each refresh. Wish composer now focuses its title field and restores keyboard focus on close.
- [ ] Authorize the dedicated Gmail mailbox privately, apply the two new additive migrations after candidate approval, then test a real confirmation and one reviewed invitation in an owner-approved inbox. See `docs/EMAIL_SETUP.md`.
- [ ] Add email delivery/bounce handling and a reviewed reminder queue after the first pilot. Current status stops at provider acceptance; no scheduled reminders implemented.
- [ ] Recover a device seat through verified email, if the owner wants cross-device account recovery. Current confirmation verifies an invitation address, not a login.

## Blocked on the owner (needs your accounts; Claude must not do these alone)

- [x] 2026-10-09: **Cloudflare connection activated on production.** 2026-10-09: created dedicated D1 `momo-community` and private Standard R2 `momo-media`, applied the five existing migrations, added server adapters, and saved all six settings as Production secrets in Vercel. Real Cloudflare probes and the full Next API flow across two local server instances pass; disposable records were removed. PR #1 is merged and production is deployed: live `storage: "durable"`, `photos: true`, independent-request persistence, gang access denial and private media all pass, with QA data removed. The owner successfully opened the live host notebook. Post-deployment verification details are recorded in the deployment-verification pull request. See `docs/CLOUDFLARE_SETUP.md`.
- [x] 2026-10-09: **Host passcode configured on Vercel.** Owner entered `HOST_PASSCODE` privately as a Production secret. Live host login was verified by the owner; its value was not read back.
- [x] 2026-10-09: **Photo adapter for Vercel.** Private R2 S3 adapter added; profile upload is gated by `photos: true`, host uploads wait for storage, badge photos stay local. Local Worker and actual Cloudflare/Next checks cover permissions, consent, replacement and deletion. Live activation requires the candidate deployment.
- [ ] **Future WhatsApp Business** sender, template and webhook: see `public/creative/whatsapp-setup.md`. Keep the readiness flags false until it's real.
- [ ] **Capacity before a broader public launch.** D1 REST uses Cloudflare's 1,200 calls/5-minute management API limit. Gang polling now batches permission and messages into one call and skips hidden tabs. The current candidate is for a small pilot; a native D1 Worker gateway is needed before scaling beyond it. See the setup guide.
- [ ] **Future phone ownership activation:** the manual-message proof is built locally; it needs the real business sender and authenticated public callback before release.
- [ ] Decide **names** for the film characters and mascot (`docs/video-series.md`), and the tab names (Ghar/Adda).
- [ ] Generate the illustrated icon set, gang illustration and films with the prompts in `docs/art-and-icon-prompts.md` and `docs/video-series.md`. Image generation is available; character names and the final art direction need owner review. Finished cinematic films still need a video-generation workflow.

## Backlog (not blocked; pick from the top)

- [x] 2026-10-09: Long event titles, venues and costs fit postcard panels; confirmed PNG downloads and inspected all three styles in both food editions. Essential details are never silently clipped.

- [x] 2026-10-08: "Plan it": hosts see ready gangs in /host, the plan form is prefilled, events.wish_id links them, and the wish shows "planned ✳" with a link to the plan.
- [x] 2026-10-08: Members can report a wish (reports.kind), hosts see and remove reported wishes; removing a wish clears its reports.
- [x] 2026-10-08: Open Graph share image (`public/og.png`, generated by `scripts/make-share-images.mjs`).
- [x] 2026-10-08: Web app manifest + momo app icons (192/512/maskable/apple-touch), new favicon.
- [x] 2026-10-08: Moved to "Blocked on the owner": a hand-coded SVG of six people would look amateur; generate it with the prompt in docs/art-and-icon-prompts.md and drop it into public/art/.
- [ ] Accessibility pass: focus styles on tabs and letter tabs, `prefers-reduced-motion` already handled, colour contrast of the hand-written blue on cream. 2026-10-09: restored form focus outlines, corrected room/postcard button semantics, and checked the main blue/orange text contrast. The deployed preview was checked at 390px across Ghar, Join and Adda in both food editions: no horizontal overflow, labelled fields and visible keyboard focus. The email candidate also adds a skip link, inert modal background, initial focus, Tab wrap, Escape and focus restoration; local keyboard checks passed. Chat messages now use a navigable log with a separate polite new-message announcement, and wish entry restores focus. Full screen-reader and physical-device coverage remains.
- [x] 2026-10-09: Hindi/Gujarati sprinkle copy review: retained the light Ghar/Adda/kal milte hain tone, softened the invitation copy, and corrected the device-seat privacy claim. Native-language review is welcome before adding more translations.
- [x] 2026-10-09: Updated handoff, README and Cloudflare setup guide with tested state and remaining deployment/WhatsApp gates.

## Done

- [x] 2026-10-08: Private **gang rooms**: everyone in a wish gets a room in the Adda (`w_<wishId>`), hidden from outsiders; "Gang chat" button on the wish; removing a wish or deleting an account cleans its room.
- [x] 2026-10-08: `/join?event=…` shows which plan you are asking a seat for.
- [x] 2026-10-08: Mobile fixes (bottom tab bar, label wrapping) and visible focus outlines.

- [x] 2026-10-08: Simplified to 2 tabs and 3 pages; wish wall with "I'm in" and gang-ready state; animated SVG food icons (pasta removed); Hero, Princess and Notebook postcards; member badge; real CC-licensed photo per edition; Vercel build with SQLite/libSQL adapter and device sessions; docs for the film series and art prompts.

## Rules for any continuing session

- Read `AGENTS.md`, this file, then the code. Keep the crayon/notebook brand and both food editions.
- Run `npx tsc --noEmit`, `MOMO_TARGET=next npx next build`, `pnpm run build` and `node tests/community.integration.mjs` before committing.
- Work on a branch, push it, check the Vercel preview, then fast-forward `main` (pushing `main` deploys production).
- Never commit secrets. Never enable WhatsApp sending. Never accept third-party terms, create accounts or enter passwords on the owner's behalf: list those under "Blocked on the owner".
- No third-party logos or characters (Batman, Superman, film princesses, club crests), and no copyrighted film stills on the site.
