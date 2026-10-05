# Momo — kal milte hain?

A playful adult weekend meetup club. A crayon notebook, shared food, and room to just be.

## This version

- Two complete visual themes: four distinct steamed, fried, tandoori and Schezwan momos; or pizza, vada pav, noodles, pasta, chai/coffee and dal baati. The switch carries through the homepage, avatars, Explore and invitation downloads.
- Original generated crayon casts, scrapbook references, responsive layouts and reduced-motion support.
- Saved invite requests, visible reference/receipt, masked phone, host review status and separate WhatsApp delivery status. Signup saves to the host inbox; it does not silently send email or WhatsApp.
- Host inbox, event publishing, gallery uploads, report moderation and actual-event invitation PNG downloads.
- Signed-in pseudonymous group chat, profile photos, reporting, blocking, throttled posting and account-data deletion. One-to-one chat remains a future feature.
- Meta WhatsApp Cloud API integration with approved-template sending, durable per-person/event deduplication, signed delivery callbacks and STOP opt-out processing. Disabled until real configuration and phone verification are complete.
- Two cinematic production briefs instead of the rejected slideshow, plus an Instagram/community launch plan in the creative notebook.

## Hosting and accounts

The Site remains owner-private. It uses platform-provided ChatGPT sign-in. Participants can use nicknames; they are not anonymous to the host/infrastructure. `ADMIN_EMAILS` is a server-side allowlist; empty configuration denies host access. The supplied contact is the.world.is.waiting.for.uu@gmail.com. Email contact is not an email-delivery integration.

D1 `DB` stores requests, profiles, chat, events and delivery metadata. R2 `BUCKET` stores uploaded photos. Drizzle migrations are additive; never modify applied migration files. Environment variable names and placeholders are in `.env.example`; configure actual secrets privately in runtime settings, never in Git.

## Still needed for launch

- Connect the actual Meta business sender, approved four-parameter invitation template and delivery webhook. See `public/creative/whatsapp-setup.md`. This owner-private Site cannot currently receive Meta's external webhook. Phone ownership verification is not implemented; its readiness flag is a deliberate launch gate, not a substitute for verification. No real WhatsApp invitation has been sent or tested.
- Supply confirmed public venue, named host, full cost, end time and complaint/moderation arrangements before listing a real meetup.
- Review brand availability, image rights, participant photo consent, local privacy and event obligations. This build does not constitute legal clearance or a production security audit. Age confirmation is self-attestation.
- GitHub access was restored on 5 October 2026. This repository contains the source handoff; see `CODEX_HANDOFF.md` for the continuation brief. GitHub changes do not automatically deploy to the existing Site.
- Public onboarding currently requires ChatGPT sign-in. Phone-only OTP onboarding and attendance-gated direct messages are not implemented.

## Creative files and provenance

- `public/momo-flavours.png`, `public/whole-menu.png`: original AI-generated wax-crayon food characters created for this project. No personality labels.
- `public/moodboard/*` and `public/food.jpg`: user-supplied references. Presented as inspiration, never as actual meetup memories. Licenses/ownership are unverified; clear or replace before public launch.
- SVG marks and downloadable canvas invitation layouts are original code-based assets.
- The old intro MP4 and old personality mascots were retired. No finished cinematic video is claimed. Both full briefs are under `public/creative/` and linked in `/studio`.
- Launch research uses official Timeleft, Bumble BFF, Google Flow, Runway and WhatsApp documentation; links are included in the relevant briefs.

## Development and validation

Use the existing pnpm lockfile. `npm run db:generate` generates schema migrations. `npm run build` produces a Cloudflare Workers-compatible build. Sites owns source synchronization and deployment.

TypeScript/build checks and disposable local Worker/D1 integration tests cover permissions, request persistence/privacy, theme preferences, chat, moderation and WhatsApp callbacks. The browser preview is used for theme/navigation/layout checks. Real multi-user hosted chat and end-to-end Meta delivery remain untested.
