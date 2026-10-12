# Momo to Pizza

**Make a wish. We'll get your gang ready.** A playful weekend friend club in Ahmedabad. A crayon notebook, shared food, and a way for the meetup to actually happen.

Next steps and what's blocked live in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## This version

- **3 pages, 2 tabs.** **Ghar** (`/`): hero, the food gang, how it works, hosted plans, the **wish wall**, a "Hi you" note and postcards. **Adda** (`/chat`): the group chat. **Count me in** (`/join`): invite list, nickname, postcard choice, member badge, rules and privacy. The host corner (`/host`) is for admins only. Old routes (`/explore`, `/studio`, `/privacy`, `/guidelines`) redirect.
- **Wish wall.** A member posts a plan ("Sunday badminton, need 4"). Others tap "I'm in". When it's full, the gang is marked ready and a host confirms a public venue, time and full cost. Signed-out visitors see wishes and head counts, never nicknames.
- **Two food editions** with hand-built, animated SVG friends: steamed (steam rises), fried (crispy blisters), tandoori (char), gravy (sits in a red pool); or Neapolitan pizza, vada pav, noodles, chai and dal baati. Pasta was removed. Image attribution is retained in the collapsed credits area.
- **Postcards:** Hero post (night sky, original "Momo-signal", POW), Princess post (pink glitter, tiara, wax seal) and Notebook post. People pick their own; hosts download each person's choice. No third-party logos or characters are used.
- **Member badge** ("This is who's coming on Saturday") drawn locally in the browser; the optional childhood photo is never uploaded.
- Host inbox, event publishing, gallery uploads, report moderation, pseudonymous chat, blocking, throttling and data deletion.
- **Email letters first:** email-only consent, double opt-in, host HTML/plain text letter preview, reviewed sends, opt-out and durable duplicate protection. Gmail API support for the dedicated Momo mailbox is built; its private authorization is still needed. See [Email setup](docs/EMAIL_SETUP.md).
- Future Meta WhatsApp Cloud API code (template sends, signed callbacks, STOP opt-out). It stays disabled until real configuration and phone verification exist.

## Hosting

Two targets share one codebase:

| Target | Build | Sign-in | Storage |
|--------|-------|---------|---------|
| Site (Cloudflare Workers via Vinext) | `pnpm run build` | Pseudonymous device session cookie; host via server settings | D1 `DB`, R2 `BUCKET` |
| Vercel (`vercel.json`) | `node scripts/embed-migrations.mjs && next build` | Pseudonymous device session cookie; host via `HOST_PASSCODE` | Cloudflare D1 REST + private R2 S3 when configured; alternative Turso/libSQL; otherwise SQLite in `/tmp` ("preview mode", resets) |

On Vercel, `cloudflare:workers` is aliased to `lib/vercel-cloudflare-env.ts`. Browser identity headers and browser-provided roles are never trusted on either target. D1 migrations are applied explicitly with `scripts/cloudflare-migrate.mjs`; Turso and local SQLite apply them automatically from `lib/migrations.generated.ts`. Preserve applied migrations. Secrets go in runtime settings, never in Git (see `.env.example`).

Local SQLite is for development. Vercel's `/tmp` fallback is temporary, even when it feels fast in a local test. The new server adapters support D1 and private R2 on Vercel; resource creation and local tests do not prove a live connection. Setup and verification: [Cloudflare guide](docs/CLOUDFLARE_SETUP.md).

## Still needed for launch

- Cloudflare D1/private R2 and host login are live and verified. The current candidate needs additive migrations `0005` through `0009`, the D1 gateway and realtime Workers, private runtime settings and a production smoke check.
- Add Cloudflare edge rate limits and Turnstile before broad promotion. Re-encode uploads server-side or keep them unavailable for a broad public pilot.
- Authorize the dedicated Gmail sender and verify a real confirmation/invitation with an owner-approved test inbox. Sending is disabled until then.
- Future WhatsApp: the real sender, template and public webhook, plus live ownership-proof testing. No real WhatsApp invitation has been sent.
- A confirmed public venue, named host, full cost, end time and moderation arrangements before listing a real meetup.
- Review brand availability, image rights, participant photo consent, privacy and event obligations. This is not legal clearance or a security audit. Age confirmation is self-attestation.

## Creative files and provenance

- `app/food-art.ts`: original code-drawn food characters (SVG) used on the site and on the postcards.
- Food photos: Wikimedia Commons, CC BY-SA 4.0, credited on the page (`themePhoto` in `app/brand.tsx`).
- `docs/moodboard/*`: user-supplied inspiration with unverified rights. These are no longer served by the site.
- `docs/video-series.md`: proposal for the 6-character short-film series (tools, prompts, feasibility). No films exist yet.
- `docs/art-and-icon-prompts.md`: prompts for the illustrated icon set, gang illustration and postcards.
- `docs/archive-*-film-brief.md`: earlier single-film briefs, kept for reference.

## Development and validation

```sh
pnpm install --frozen-lockfile
pnpm exec next typegen
pnpm exec tsc --noEmit
$env:MOMO_TARGET='next'; pnpm exec next build    # PowerShell: the Vercel build
pnpm run build                     # the Cloudflare/Sites build
pnpm lint
node tests/community.integration.mjs
node tests/invitations.integration.mjs
node tests/chat-ticket.integration.mjs
node tests/gateway.integration.mjs
node tests/chat-live.test.mjs
node tests/chat-poll.test.mjs
node tests/realtime.integration.mjs
node tests/storage.integration.mjs
```

The integration tests run against a disposable local Worker/D1 and cover permissions, invite privacy, chat, moderation, the wish wall and WhatsApp callbacks. They never contact real recipients.
