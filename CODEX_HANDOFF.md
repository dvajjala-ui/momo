# Momo: continue the existing project

Prepared 5 October 2026 for Dwarkesh Vajjala. This is a summary of the product conversation and implementation progress, not a verbatim chat export.

## Update — 8 October 2026

The site was simplified to 3 pages / 2 tabs (Ghar, Adda, Count me in), gained the wish wall, new animated SVG food icons, hero/princess/notebook postcards, a member badge and a working Vercel build. **`docs/ROADMAP.md` is now the live backlog**; the "Remaining work" list below is historical context.

## Start here

### Email-first continuation — 9 October 2026

The owner postponed WhatsApp and chose little email letters as the first invitation channel, then specified the existing dedicated Gmail address `the.world.is.waiting.for.uu@gmail.com` (no domain yet). Work is on `codex/email-invitations`: email-only consent, hashed single-use confirmation, host letter previews/reviewed sends, opt-out, durable deduplication and pilot quotas. Gmail API transport checks the exact token owner before sending; the Codex Gmail connector currently belongs to a different account and is not Momo's runtime authorization. `docs/EMAIL_SETUP.md` and the owner-operated, loopback-only `scripts/connect-gmail.mjs` explain private enrollment. No sender credentials, real email sends or production migration have been made. Additive migrations `0005_phone_verification` and `0006_email_letters` must be approved/applied before this candidate deploys. Existing production remains on the storage-tested main.

Future WhatsApp ownership proof (manual message + signed inbound challenge), host readiness preview and per-recipient send guards are retained behind existing gates. Keyboard improvements include a skip link, inert dialog background, initial focus, Tab wrap, Escape and focus restoration. The phone/email provider suites use fake outbound services only. Continue email activation with the dedicated mailbox; do not return to Meta signup as the next step. Scheduled reminders, delivery/bounce feedback and device-seat recovery through email are future work, not implementations. Read the live roadmap and email guide for release gates.

### Storage continuation — 9 October 2026

Latest GitHub main was pulled to `e144f8d`; work continues on `codex/launch-readiness`. Dedicated Cloudflare D1 `momo-community` and private Standard R2 `momo-media` were created with owner authorization. Server adapters and an explicit migration command have been added for Vercel. See `docs/CLOUDFLARE_SETUP.md` for identifiers, exact secret names and verification gates. Approved scoped credentials were created and saved as Production secrets in Vercel, all five migrations applied, and the owner entered HOST_PASSCODE privately. Real D1/R2 probes and full Next API checks across two local instances passed with disposable data cleaned up. PR #1 was merged to main (`6b7ff5c`) and its Vercel production build passed. The live API reports durable storage and authenticated photo support; disposable production checks passed for wish/gang persistence across independent requests, outsider and forged-identity denial, and private R2 photos. QA records and files were removed. The owner successfully opened the live host notebook; WhatsApp still reports setup needed. Post-deployment verification details are recorded in the deployment-verification pull request. Backline storage and the existing private Site were not altered.

Restored form focus outlines, corrected room/postcard button semantics and clarified temporary storage notices. The postcard exporter now fits long details within each panel or reports an error rather than silently clipping essential event information. Optional profile uploads are gated by actual photo storage; badge photos remain local. WhatsApp sending remains disabled. Existing lint debt remains; passing builds and local integration checks do not mean the entire launch backlog is complete.

Continue this project; do not rebuild or replace the design by default. Read this file, `AGENTS.md`, `README.md`, and `public/creative/whatsapp-setup.md`. Inspect the current code before changing it. The next substantial task is activating and verifying the email-letter candidate with the dedicated Gmail sender; WhatsApp is postponed. Any necessary credentials must be configured privately; ask for the specific missing account setup rather than asking the user to repeat the brief.

## What the user is making

Momo is an adult (18+) weekend food, games and meetup club, initially Ahmedabad. It should feel like a kid made a site for friends who grew up: minimal, nostalgic, playful, handwritten/crayon, a little filmy, never corporate or sales-focused. People leave a WhatsApp number, receive a transparent plan including date, public venue and full cost, and decide whether to attend. There is no pressure to come. Pseudonymous profiles and group chat are included; attendance-gated one-to-one chat is for later.

Important decisions from the conversation:

- A gently blinking “don’t like momos?” switch changes the food cast throughout the experience. Momo edition: steamed, deep-fried, tandoori, Schezwan. Whole-menu edition: pizza, Mumbai vada pav, noodles, pasta, chai/coffee, dal baati.
- Keep both editions for artwork, avatars, invitation postcards and cinematic-film briefs. Never revert to four identical steamed characters.
- Use the supplied references for the scrapbook; clearly distinguish inspiration from actual meetup memories.
- Remove quiet/lazy/couch-potato personality judgments. Talking, listening and awkward silence are all welcome. Do not label people as needing fixing.
- The previous MP4 slideshow was explicitly rejected. It has been removed. Two detailed 5-second animated-film briefs exist, but finished cinematic movies do not.
- Friendly film nostalgia was chosen for the brand; the user's suggested Hitler jokes were not adopted.
- Audience growth, especially welcoming adult women, is based on trust: named hosts, public venues, costs/end times, consent, moderation and freedom over photos/contact details. No fake scarcity, fake members or misleading safety guarantees.
- Contact email: the.world.is.waiting.for.uu@gmail.com. This is a contact/host allowlist address, not a connected mailbox.

## Completed and deployed

Live Site: https://momo-weekend-club.dwarkeshprakash.chatgpt.site

The Site remains owner-private. This GitHub repository being public does not change Site access. The underlying Site project is declared in `.openai/hosting.json`; preserve that ID and existing production database.

Published application source baseline: `279fd029624df7327c41d064e0ee6ae3492763c1` in the Site source repository. The GitHub import has different commit ancestry. This handoff adds documentation and a portable local test harness without changing deployed application behavior.

Implemented:

- Crayon notebook homepage, two theme states persisted as a UI preference, scrapbook supplied references, responsive CSS, reduced-motion support.
- Join form saves to D1; receipt shows reference, city, masked phone, request status and separate delivery status. An earlier real request was found in the production host inbox. It had not generated an email or WhatsApp message. No production request data is included here.
- Host allowlist, searchable request inbox, review/confirmation states, event publishing, invitation text and PNG export, gallery uploads, reporting/moderation.
- Three persistent group-chat rooms; nicknames/avatars/optional photos; 5-second polling; posting throttle; block/report and account deletion.
- Host-controlled Explore gallery. No fake meetup photos, participants or confirmed events seeded.
- Original generated food artwork; invitation postcards for both editions; video briefs and a practical launch plan in `/studio` and `public/creative/`.
- Meta Cloud API approved-template send code, per-person/event durable deduplication, signed webhook processing, delivery states, STOP opt-outs. Sending fails closed while required setup is missing.

## Remaining work and honest limits

1. **WhatsApp is NOT connected.** No real message has been sent or delivery-tested. Need actual Meta business sender, access token, graph version, approved 4-body-parameter template/language, app secret and verify token. Full checklist: `public/creative/whatsapp-setup.md`.
2. Current owner-private hosting blocks external Meta callbacks. Decide on a supported public webhook arrangement without silently making the whole Site public. Do not set readiness flags before the underlying setup actually exists.
3. Phone ownership verification is not implemented. Add a real verification flow before enabling automated sends to submitted numbers. A flag alone is not verification.
4. Signup currently uses ChatGPT sign-in. A phone-only onboarding flow was requested in the product vision and is still future work. Do not claim complete anonymity: members are pseudonymous to each other, accounts are identifiable to infrastructure/hosts.
5. Produce the actual films using the two briefs and original casts. Flow/Runway workflows are described in the briefs. There is no cinematic video-generation capability connected in the source environment.
6. Confirm invitation export on real browsers, including long event titles/venues. The source browser action did not show an error, but automated download-event verification timed out, so download completion has not been established.
7. Actual multi-user hosted chat and full Meta end-to-end tests remain undone. Consider callback/send races, recipient changes, retries, rate/abuse limits and moderation operations before public launch.
8. Supplied movie stills/memes/artwork have unverified licenses. Clear or replace for public launch; label references accurately. Trademark, privacy/event/venue obligations have not received legal clearance. Do not promise “no legal problems.”
9. Confirm real venue, named host, full cost, end time and capacity before publishing the first real event. The current plan is clearly an interest-list preview.
10. One-to-one chat after attendance is intentionally later. Do not fake attendance verification.

## Code map

- `app/momo.tsx`: view shell, join/receipt, profile/chat, Explore, privacy/rules.
- `app/home-playful.tsx`, `app/globals.css`: notebook homepage and visual system.
- `app/brand.tsx`: food themes/casts/names.
- `app/host-desk.tsx`: host inbox and event/gallery/moderation UI.
- `app/invitation.ts`: browser canvas PNG export.
- `app/wishes.tsx`, `app/letters.tsx`, `app/food-art.ts`: wish wall, postcards/badge, SVG food art.
- `lib/sqlite-d1.ts`, `lib/vercel-cloudflare-env.ts`, `lib/device-session.ts`, `app/api/session/route.ts`: the Vercel runtime.
- `docs/`: roadmap, film-series proposal, art prompts; `public/creative/`: WhatsApp setup and launch plan.
- `app/api/community/route.ts`: data, requests, chat and host mutations.
- `app/api/upload/route.ts`, `app/api/media/[id]/route.ts`: photo storage/access.
- `lib/whatsapp.ts`, `app/api/whatsapp/webhook/route.ts`: Meta sending/signature validation/receipts/STOP.
- `app/chatgpt-auth.ts`: hosting-provided identity headers. These require a trusted authentication gateway; never expose a standalone production Worker that trusts arbitrary client-supplied identity headers.
- `db/schema.ts`, `drizzle/`: D1 schema and migrations. Preserve applied migrations.
- `tests/community.integration.mjs`: disposable Miniflare Worker/D1 tests, no real recipients.

## Local development

Stack: React 19 + TypeScript, Vinext/Vite, Tailwind 4, Cloudflare Workers/D1/R2, Drizzle. This is not a plain Next.js/Vercel deployment. Use Node >=22.13 and pnpm 11.25.0, as pinned in `package.json`. Preserve the lockfile.

A clean checkout uses the portable execution profile automatically. With that pnpm version installed:

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run build
node tests/community.integration.mjs
pnpm run dev
```

The test harness initializes both migrations into disposable local databases. For persistent local D1 setup, inspect the generated Wrangler configuration and apply checked-in migrations locally only. Never point migration experiments at production.

The exported repository excludes node_modules, runtime credentials, real database rows/uploads, build output and local tool state. `.env.example` contains names/placeholders only. Production host allowlists and contact settings were configured through Sites runtime settings, not committed secret files.

## Validation already performed

- TypeScript check passed.
- Production-compatible build passed.
- 31 local integration assertions passed: anonymous-write denial, host permissions, consent and phone validation, private receipt fields, theme choice, chat persistence/identity stripping/throttling, report/block, host publishing/status review, WhatsApp fail-closed configuration, forged-signature rejection, valid callbacks, monotonic delivery status, STOP and deletion.
- Browser preview checked the new homepage, food switch and persistence into the join page, signed-out boundary and desktop layout. These checks do not substitute for live multi-user/Meta tests or a security audit.

## Hosting continuity

GitHub access was initially blocked with 404, restored in this handoff turn. The destination is `dwarkeshvajjala/momo`, branch `main`. No GitHub Actions deployment has been set up. Pushing here does not automatically deploy the existing Site.

If the next Codex environment has Sites installed, use the current Sites skills to open the existing project and reconcile code before publishing. Preserve the current audience and production records. Never create a duplicate Site merely because this GitHub repository has separate commit ancestry. If Sites is unavailable, keep code changes in GitHub and describe the deployment limitation.
