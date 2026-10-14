# Hosted production activation runbook

Last reviewed: 2026-10-13

This is the execution order for the remaining Momo production-readiness checks after the source work in PRs #11 through #17. Every probe is designed to use disposable data and, where applicable, refuses the known production hostname. Do not replace a failed check by weakening authorization, hostname validation, image privacy or rate limits.

The current known production app is `https://momo-ten-pied.vercel.app`.

## Latest execution results

See [work summary and next steps](WORK_SUMMARY_2026-10-13.md). Isolated Cloudflare/Vercel baseline lifecycle, private media checks, 25/50/100-client hosted sampling and the Vercel perimeter policy are now verified. Production Turnstile is deferred by the owner's low-friction product decision, and a 2026-10-14 disposable real-token replay check failed. Do not create or enable a production widget under this decision. Resume with production private-photo checks and Axiom sink/alerts only when the owner resumes token setup. Do not rerun completed destructive probes against production.

## What is already done

Do not repeat these as if they are still missing:

- D1 migrations through `0010` are present in production.
- D1 gateway and realtime Worker are deployed with separate credentials.
- a disposable authenticated gateway/chat smoke passed.
- a real Cloudflare Images binding sanitization smoke passed in a disposable gateway.
- a hosted 10-client realtime delivery/reconnect/history smoke passed.
- a disposable D1 Time Travel restore drill passed.
- read-before-profile realtime behavior is fixed and integration-tested.
- source contains redacted security events, D1 recovery procedures, Vercel Firewall guidance, optional persistent monitoring, and production-refusing hosted probes.
- production build/lint and relevant integration suites passed for the merged source.

## Safety rules for every hosted check

- Never point a disposable probe at `momo-ten-pied.vercel.app` if that probe explicitly refuses production.
- Never use real participant profiles, messages, contact details, photos or invitations as test data.
- Keep Gmail and WhatsApp sending disabled during these checks.
- Do not paste API tokens, host passcodes, Turnstile secrets, database tokens or fresh Turnstile challenge tokens into Git/PRs/screenshots.
- Delete disposable preview resources after results are recorded.
- Record only non-sensitive results: date, commit, environment label, pass/fail, client count, latency/error observations and safe provider metrics.

## Recommended execution order

Run these in this order so later checks inherit a verified base.

### 1. Create an isolated hosted preview

Use a separate preview deployment backed by disposable D1/R2/Worker resources where destructive test cleanup is acceptable.

Recommended properties:

- source commit: current reviewed `main`
- separate D1 database with migrations `0000` through `0010`
- separate R2 bucket
- separate gateway/chat Worker deployment or equivalent isolated bindings
- separate host passcode
- separate Turnstile widget for the preview
- upload flag enabled only in this preview after its reviewed image binding is present
- no real email/WhatsApp sender credentials

Do not reuse production participant storage for convenience.

### 2. Optional real Turnstile backend verification (currently deferred)

Configure the disposable preview:

- `TURNSTILE_ENABLED=true`
- disposable-preview `TURNSTILE_SITE_KEY`
- disposable-preview `TURNSTILE_SECRET_KEY`
- separate random `MOMO_SEAT_SIGNING_SECRET` of at least 32 characters

The client already renders Turnstile with `action: 'seat'`; the server requires exact hostname plus the same action.

Obtain one fresh challenge token from the disposable preview and run in PowerShell:

```powershell
$env:MOMO_TURNSTILE_TEST_DISPOSABLE = 'yes-verify-preview-seat'
$env:MOMO_HOSTED_TEST_APP_URL = 'https://YOUR-DISPOSABLE-PREVIEW.example'
$env:MOMO_HOSTED_TURNSTILE_TOKEN = 'FRESH-TOKEN-FROM-THAT-PREVIEW'
node tests/hosted-turnstile-probe.mjs
```

Required result if this feature is reconsidered: challenge/no-cookie, successful signed seat, replay rejection and forged unsigned-seat rejection all pass. The 2026-10-14 disposable browser check observed 428 without a token, 200 after a real challenge, but 200 again for the same captured token from an anonymous request; a separate invalid token returned 403. The source of the replay acceptance is not yet isolated. Keep production off.

Then manually verify the widget from Ghar, one-tap wish join, Sidekicks and Host on desktop plus a physical mobile device.

### 3. Combined application lifecycle

Use the same isolated preview/database after Turnstile handling is known-good. If the lifecycle preview has Turnstile enabled, create/verify the disposable sessions as required by that environment before executing the flow.

PowerShell:

```powershell
$env:MOMO_HOSTED_LIFECYCLE_DISPOSABLE = 'yes-delete-probe-data'
$env:MOMO_HOSTED_TEST_APP_URL = 'https://YOUR-DISPOSABLE-PREVIEW.example'
$env:MOMO_HOSTED_TEST_HOST_PASSCODE = 'DISPOSABLE-HOST-PASSCODE'
$env:MOMO_HOSTED_TEST_ADMIN_USERNAME = 'momo' # optional if default
node tests/hosted-lifecycle-probe.mjs
```

Required result: host login, creator profile/wish, one-click profile-less join, gang read, host lookup of unnamed seat, queue/private host note, queued denial, restore, suspension denial, restore and account/wish cleanup all pass.

If the script reports that Turnstile is required, do not change a deployment's security setting just to make the test pass. Use an isolated preview configuration appropriate for the lifecycle run.

### 4. Production-style private image path

On the disposable preview only, verify that the intended gateway has the reviewed Images binding and that `MOMO_IMAGE_UPLOADS_ENABLED=true` is set for that preview.

If Turnstile is enabled and the seat is new, provide a fresh preview token.

```powershell
$env:MOMO_HOSTED_IMAGE_DISPOSABLE = 'yes-delete-probe-data'
$env:MOMO_HOSTED_TEST_APP_URL = 'https://YOUR-DISPOSABLE-PREVIEW.example'
$env:MOMO_HOSTED_TURNSTILE_TOKEN = 'OPTIONAL-FRESH-PREVIEW-TOKEN'
node tests/hosted-image-access-probe.mjs
```

Required result:

- real upload path accepts disposable PNG
- returned stored media is WebP
- anonymous profile-media request is denied
- signed profile-media response is `private, no-store`
- replacement removes old media access
- account deletion removes current profile media access

Only after the same binding/private-media path is deployed intentionally to production should the production `MOMO_IMAGE_UPLOADS_ENABLED=true` flag be considered.

### 5. Longer hosted realtime/load sample

Use the disposable D1 gateway/chat Worker environment, never production participant data.

```powershell
$env:MOMO_HOSTED_TEST_DISPOSABLE = 'yes-delete-only-probe-rows'
$env:MOMO_HOSTED_TEST_DB_URL = 'https://DISPOSABLE-DB-GATEWAY.example'
$env:MOMO_HOSTED_TEST_DB_TOKEN = 'DISPOSABLE-GATEWAY-TOKEN'
$env:MOMO_HOSTED_TEST_CHAT_URL = 'https://DISPOSABLE-CHAT-WORKER.example'
$env:MOMO_HOSTED_TEST_CHAT_SECRET = 'DISPOSABLE-CHAT-SECRET'
$env:MOMO_HOSTED_TEST_ORIGIN = 'https://YOUR-DISPOSABLE-PREVIEW.example'
$env:MOMO_HOSTED_TEST_CLIENTS = '100'
node tests/hosted-chat-probe.mjs
```

Start at 25 or 50 clients if the disposable environment has not been exercised recently, then run the intended 100-seat pilot sample. Do not jump directly to a much larger number merely to produce an impressive result.

Record:

- clients connected
- messages missed/duplicated
- reconnect/history recovery result
- p50/p95/max delivery latency reported by the probe
- HTTP/WebSocket error rate
- D1 read/write/latency or overload observations available from Cloudflare
- Durable Object errors/CPU/memory/overload observations available from Cloudflare

Do not convert this into a universal concurrency claim. The product operating cap remains 100 active pilot seats.

### Sustained pilot probe

The 100-client evidence was recorded with `tests/hosted-sustained-probe.mjs`, using exact `momo-readiness-db-<id>.<account>.workers.dev` and matching chat origins. It accepts only these disposable Worker names. Set `MOMO_PROBE_DB_URL`, `MOMO_PROBE_CHAT_URL`, private `MOMO_PROBE_DB_TOKEN` / `MOMO_PROBE_CHAT_SECRET`, and the exact `MOMO_PROBE_APP_ORIGIN` matching the chat Worker setting. Set `MOMO_PROBE_CLIENTS` to 25, 50, then 100; default 18 rounds / 9-second cadence renews leases and recovers an offline delivery. Run `node tests/hosted-sustained-probe.mjs`. Keep credentials in process environment, never in Git or output.

### 6. Vercel Firewall activation

Because the public hostname is currently `vercel.app`, Vercel is the perimeter. Follow `docs/EDGE_RATE_LIMIT_SETUP.md`.

Use an isolated preview/firewall test target first:

```powershell
$env:MOMO_FIREWALL_TEST_DISPOSABLE = 'yes-rate-limit-preview'
$env:MOMO_FIREWALL_TEST_URL = 'https://YOUR-RATE-LIMIT-PREVIEW.example'
$env:MOMO_FIREWALL_TEST_LIMIT = '120'
node tests/hosted-firewall-probe.mjs
```

Required result: ordinary requests succeed and the controlled over-limit burst eventually receives 429/mitigation. Verify a normal browser on another ordinary flow remains usable.

Then configure/enforce the reviewed rule on the real public Vercel project. If the site later moves behind a Cloudflare-proxied custom domain, re-evaluate which provider is actually first in the request path before moving WAF rules.

### 7. Persistent redacted security monitoring

If using the reviewed Axiom option, configure only server-side variables:

- `MOMO_SECURITY_AXIOM_ENABLED=true`
- `MOMO_SECURITY_AXIOM_DOMAIN=<assigned *.edge.axiom.co host>`
- `MOMO_SECURITY_AXIOM_DATASET=<security dataset>`
- `MOMO_SECURITY_AXIOM_TOKEN=<ingest-only token restricted to that dataset>`

Then send exactly one redacted probe event:

```powershell
$env:MOMO_SECURITY_SINK_DISPOSABLE = 'yes-send-one-redacted-event'
node tests/hosted-security-sink-probe.mjs
```

Required result: exactly one `security_sink_probe` appears in the configured dataset with only the reviewed redacted fields.

Then create the alerts from `docs/SECURITY_MONITORING_SETUP.md` and verify one controlled failed host login in a disposable preview produces `host_login_failed`, while a successful login does not produce a failure event.

### 8. Final production activation

After the applicable isolated checks have passed:

1. Keep `TURNSTILE_ENABLED` unset. A production widget is deferred by owner choice and the replay result above.
2. Keep the verified Vercel Firewall rule on the current public project and watch the first traffic sample.
3. Configure the reviewed persistent security sink/alerts only after the owner resumes token setup.
4. Deploy the reviewed Images binding/private-media configuration to the intended production gateway.
5. Enable `MOMO_IMAGE_UPLOADS_ENABLED=true` only after the production-private media smoke succeeds; otherwise leave uploads paused.
6. Keep outbound email/WhatsApp disabled unless those providers are separately approved and verified.
7. Record the exact checks/date/commit in `docs/PRODUCTION_REQUIREMENTS.md` without recording secret values.

## Owner/event gate that testing cannot solve

The first real meetup cannot be called launch-ready until the owner supplies the remaining real details.

Already confirmed:

- Kitab Ghar
- Ahmedabad, Gujarat
- 6:00 PM start
- open/low-pressure reading, talking, socialising/exploring format

Still required:

- calendar date
- exact public street address for the chosen location
- named host
- planned end time
- attendee capacity
- full per-person cost including any taxes/minimum order
- moderation contact
- simple emergency/venue-exit plan

Do not invent or publish those missing details.

## Completion definition

The technical source work is complete when the reviewed probes/runbooks exist and pass repository verification. The **production activation** work is complete only after the hosted runs/configuration above are actually performed and recorded. Those are intentionally different statuses so the checklist does not claim a live control merely because code for it exists.
