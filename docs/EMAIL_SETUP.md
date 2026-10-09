# Momo letters — Gmail first

The owner selected email letters as the first invitation channel on 9 October 2026. Use the dedicated mailbox `the.world.is.waiting.for.uu@gmail.com`. A domain is not needed for the Gmail API route. This address is currently a contact address; the application has **not** been granted its sender authorization.

## Built, awaiting activation

- Email-only request with explicit adult acknowledgement and email consent, nickname kept separate.
- Separate confirmation letter requested by the member. A random, hashed, single-use link expires after 30 minutes; opening it alone does not verify an address. It can be confirmed on another device without signing in.
- Host review, HTML letter preview and plain text alternative for the selected published plan. All three letter styles and both food editions are retained. Date, public venue, full cost, description and no-pressure wording are included.
- Host sends one reviewed letter per verified inbox and plan. A durable hash deduplicates across device seats. An accepted provider response is **not** a delivery receipt or confirmed seat.
- A confirmation page for leaving the email list is included in every invitation. Leaving or changing the address invalidates its proof. Account deletion removes contact data and identity from email delivery rows, retaining only a hashed inbox/plan tombstone against repeat sends.
- At most 20 provider attempts per UTC day for this pilot (verification and invitation combined), and three verification attempts per inbox/day with a 60-second cooldown across device seats. Failed requests can consume a slot. No scheduled bulk send or automatic retry is implemented.

## Private Gmail authorization

The app uses Gmail API OAuth, not a Gmail password. It requests `gmail.send`, `openid` and `email`: sending plus an exact sender identity check. It does not request inbox reading. Google can revoke or expire tokens. Configure this dedicated mailbox only; the app fails closed if the actual authorized account differs from `GMAIL_SENDER`.

1. The owner signs into Google Cloud with the dedicated account, creates/selects a Momo project and enables Gmail API. Account registration and terms acceptance are owner actions.
2. Configure the Google Auth consent screen and an OAuth **Desktop app** client for the local enrollment helper. Include the exact sender as a test user while testing. Review Google's consent/verification requirements before release; an app left in Testing may have short-lived refresh credentials.
3. Add `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and `GMAIL_SENDER` privately to **`.env.gmail.local`**, which is ignored. Never paste them into chat or commit them. Check `git check-ignore .env.gmail.local` first.
4. Run `node scripts/connect-gmail.mjs` to check for private settings, then `node scripts/connect-gmail.mjs --connect` when the owner is ready. Open the printed **local** page. The owner completes Google sign-in and reviews the grant. The helper uses state and PKCE, binds only to loopback, checks the actual sender and writes the refresh credential privately. It never sends mail. It expires after ten minutes.
5. Store these as private Vercel Production secrets: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. Add `GMAIL_SENDER`, `EMAIL_PROVIDER=gmail` and the canonical `EMAIL_PUBLIC_URL=https://momo-ten-pied.vercel.app`. Keep `EMAIL_SENDING_ENABLED=false` until the approved migration/deployment and a specific owner-approved test recipient are ready. Preview settings should stay disconnected.

Enrollment credentials belong to this application. A Gmail connector inside Codex is a separate connection and does not supply runtime OAuth credentials to Momo.

## Deployment order

New additive migrations `0005_phone_verification` and `0006_email_letters` are required. They have only been applied in disposable local databases. Preserve existing migrations. Review the candidate first, obtain approval for the production schema/deployment, run the exact-database guarded migration command from `docs/CLOUDFLARE_SETUP.md`, then deploy. Rollback to the prior app leaves the additive tables unused.

Verify the live email request and confirmation UI with an owner-approved test inbox. Review a published plan and its letter before sending the one test invitation. Check the real inbox, Spam and the sender’s Sent folder. Do not infer delivery from `accepted`. A timeout or missing message ID records `unknown`; investigate in Gmail before any manual recovery. Gmail has no provider idempotency key; Momo’s durable attempt reservation prevents retries. Concurrent opt-out after an outbound request starts cannot recall that message.

For a larger launch, add delivery/bounce handling and a reviewed reminder queue, and replace the D1 management-API transport with a native Worker gateway. Sending limits and Gmail anti-abuse rules also apply. WhatsApp remains future scope with all existing activation gates.

Optional later provider: `EMAIL_PROVIDER=resend` with private `RESEND_API_KEY`, verified `EMAIL_FROM`, canonical URL and the same activation gate. This requires domain verification for real members. Its 24-hour provider idempotency window is supplemented by Momo’s permanent attempt reservation.

## Verification

```sh
pnpm exec tsc --noEmit
# PowerShell: $env:MOMO_TARGET='next'; pnpm exec next build
pnpm run build
node tests/community.integration.mjs
node tests/invitations.integration.mjs
# PowerShell: $env:MOMO_EMAIL_TEST_PROVIDER='gmail'; node tests/invitations.integration.mjs
```

The invitation suite intercepts all provider traffic, uses reserved test addresses/numbers and fails on unexpected outbound destinations. It covers forged/expired/reused links, consent/address changes, withdrawal races, deduplication, quotas, HTML escaping, MIME encoding, wrong Google-account denial, and future WhatsApp ownership proof. No real messages have been sent.

Candidate checks on 2026-10-09: TypeScript, Next build, Vinext build, community/invitation suites (Gmail and Resend fake providers), adapter checks, and targeted lint for the new files passed. Local browser checks covered email-only saving, explicit confirmation including a link opened on an already-mounted join page, host HTML preview, disabled sending without credentials, both food editions at 390px with no horizontal overflow, and delete-dialog Tab wrap/Escape/focus restoration without deleting data. Confirmation used a disposable local token fixture, not a delivered email. The enrollment helper was syntax-checked and its missing-settings path was checked; actual Google enrollment and real inbox rendering remain unverified. Existing repository-wide lint debt remains.

Primary references: [Gmail sending](https://developers.google.com/workspace/gmail/api/guides/sending), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Google offline OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Resend send API](https://resend.com/docs/api-reference/emails/send-email).
