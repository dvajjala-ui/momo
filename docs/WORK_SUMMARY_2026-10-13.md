# Momo work summary and next steps

Updated: 2026-10-13. Repository: dvajjala-ui/momo. Work continues directly on main.

## Current stage

The product implementation is in place. Hosted pilot verification is now completed for requirements #13, #19 and #20 at the tested workload. Production security activation (#14) is partially complete; real event information (#10) remains pending.

This is evidence for a controlled 100-seat pilot, not a promise of unlimited capacity or a complete production launch sign-off.

## What changed in this continuation

- The D1 gateway now returns allowlisted execution metrics to authenticated server callers: rows read/written, query duration and routing metadata. Previously the load probe received only changes, hiding actual usage.
- Added tests/hosted-sustained-probe.mjs: disposable 25/50/100-client fanout, reconnect, lease renewal, history recovery, retry deduplication, telemetry and verified cleanup. It accepts only explicitly named readiness Workers, not production endpoints.
- Fixed the real hosted image probe fixture. The old PNG had an invalid CRC; the new valid PNG contains a disposable metadata marker and verifies that re-encoding removes it.
- Fixed the firewall probe to test within one fixed window, use bounded concurrency, reject login redirects, and distinguish Vercel's 429 threshold response from its following 403/deny mitigation.
- Added global_fetch_strictly_public to the Cloudflare app build. The isolated app's calls to sibling Workers returned 503 without it; the combined lifecycle passed after the fix.
- Removed an unused lifecycle-probe variable and reconciled the requirements/runbook with the actual hosted results.

## What was created or configured

| Resource | Purpose / current state |
| --- | --- |
| D1 momo-readiness-20261013 | Separate disposable database; migrations 0000 through 0010 |
| R2 momo-readiness-media-20261013 | Separate disposable private-photo bucket |
| momo-readiness-db-20261013 | Authenticated test gateway with a real Images binding |
| momo-readiness-chat-20261013 | Separate Durable Object chat namespace |
| momo-readiness-app-20261013 | Isolated Cloudflare application for lifecycle, images and Turnstile checks |
| Vercel momo-readiness-20261013 | Isolated Vercel application using the disposable D1 gateway/chat |
| Momo readiness Turnstile widget | Exact preview hostname, managed mode, preclearance off; configured on the disposable Cloudflare app |
| Axiom momo-security dataset | Redacted security events only; 30-day retention shown in the account |
| Axiom Momo security ingest token | Dataset-scoped token created; not installed on any server. Replacement and remaining setup are pending at the owner's request |
| Vercel production Momo API pilot budget | Published and read back as enabled/enforcing: 120 API requests per 60 seconds per IP, 5-minute mitigation; WhatsApp webhook excluded |

Production gateway and chat Workers were also redeployed with the reviewed source, preserving their private settings and participant records. Production upload and Turnstile flags have not been activated. Persistent Axiom delivery is still off.

Temporary readiness resources remain available for the unfinished activation checks. Probe-created profiles, messages, receipts, wishes and photos were cleaned up by the passing probes. Remove the temporary resources after activation evidence is saved; they are not production resources.

## Actual hosted results

Source base: main 0e4e2de, plus the reviewed fixes described above. No real participants or external message recipients were used.

| Check | Result |
| --- | --- |
| Combined lifecycle, Cloudflare | PASS, 8.141 seconds |
| Combined lifecycle, isolated Vercel | PASS, 28.600 seconds |
| Private image upload/access/replacement/deletion | PASS on isolated Cloudflare app: WebP, metadata removed, anonymous 401, private/no-store, old/deleted images 404 |
| 25 clients, 2 rounds | PASS, delivery p50 169 ms / p95 185 ms / max 362 ms |
| 50 clients, 2 rounds | PASS, delivery p50 179 ms / p95 272 ms / max 279 ms |
| 100 clients, 18 rounds over 157.544 seconds | PASS, 1,800 live deliveries; p50 175 ms / p95 199 ms / max 618 ms |
| 100-client reconnect/history | All 100 recovered history; 200 lease renewals; all 400 socket connections successful |
| Delivery/errors | Zero missed or duplicate live messages; zero observed gateway, socket, server, unexpected-response or abnormal-close errors |
| Isolated Vercel firewall burst | PASS: 130 GET requests in 28.727 seconds; 119 HTTP 200, one HTTP 429, ten verified HTTP 403/deny mitigations |
| Production normal pages | Home, Join, Chat, Sidekicks, Host and public community API returned HTTP 200 |

The lifecycle exercised host login, profile/wish creation, one-click unnamed join, gang reading before profile entry, host lookup, queue/private note, queued denial/restore, suspension denial/restore and account/wish cleanup. These are baseline runs before real Turnstile token verification; the protected combined flow remains part of #14 activation.

### Provider measurements and their limits

- 100-client test window: 2026-10-13 13:17:04 to 13:19:49 UTC. Durable Object dashboard inspected for 18:47–18:51 IST.
- Gateway-visible usage: 205 rows read, 356 written, 110 metadata results and 7.9267 ms summed SQL timing. These cover the probe's gateway calls, not every internal chat query.
- D1 provider insight sample over the surrounding 30 minutes: 37 query groups, 2,783 queries, 10,772 rows read, 1,189 written and 520.933 ms summed duration. It includes ramps and other checks; it is not a measurement of only the 100-client run or account-wide quota headroom.
- Durable Object CPU: p50 0.23 ms, p90 3.24 ms, p99 16.6 ms, p99.9 25.84 ms. Displayed memory percentiles: 6.29 MB. No thrown exceptions, CPU/memory-limit hits or internal errors in the selected window.
- The provider's generic Errors counter showed 382. Do not call that counter zero. A separate normal-close control produced canceled and responseStreamDisconnected outcomes while the client checks passed, so ordinary socket closures can contribute to that classification. This does not establish an exact breakdown of all 382 outcomes.

The measured traffic was one room with one message every nine seconds, not a heavy multi-room soak or maximum-capacity test. Keep the product cap at 100 active seats and watch actual traffic/quotas.

## Basic application flow

1. Visitor opens Ghar, browses the wish wall and joins a plan with one click.
2. A device seat identifies the member. After Turnstile activation, new seats must pass the real challenge and receive signed seat proof.
3. A joined member can read gang chat immediately; nickname, age and self-described gender are requested when they first send.
4. Vercel routes the application API. The authenticated Cloudflare gateway persists D1 data; the chat Worker uses Durable Objects for WebSocket delivery and D1 for history.
5. The private /host page manages named and unnamed seats: queue, restore, suspend, remove and send private in-site notes.
6. When photo uploads are deliberately enabled, Images decodes/re-encodes to WebP, then private R2 storage serves authenticated no-store media.
7. Redacted security events are generated by the app. Axiom delivery/alerts will be enabled only after the remaining sink verification.

## Remaining work, in order

1. Finish real Turnstile verification in a working browser: signed-seat acceptance, replay rejection, forged-cookie rejection and protected lifecycle. The in-app browser failed the preview challenge; this is not recorded as a passing real-token test.
2. Create the separately approved Momo production widget after preview checks pass; configure its exact hostname and server-only settings, redeploy, then verify normal desktop/mobile seat flows.
3. Complete Axiom token replacement/setup when the owner resumes it. Observe one redacted event, configure owner alerts and prove a controlled failed-host-login event before production activation. The current token was briefly visible in a tool result, so replace it before server use.
4. Verify the intended Vercel production private-photo path before enabling MOMO_IMAGE_UPLOADS_ENABLED. The isolated Cloudflare path passed; the production flag remains off.
5. Supply the real first-event date, exact Kitab Ghar address, named host, end time, capacity, full cost, moderation contact and emergency/exit plan. Confirmed: Ahmedabad, Gujarat; 6 pm; open reading/talking/socialising/exploring.
6. Record final activation, remove disposable infrastructure/private test files, and begin the monitored 100-seat pilot. Keep email and WhatsApp sending separately gated.

## Verification status

Gateway, community, chat-ticket and read-before-profile integrations passed. TypeScript, repository lint, Vinext build and the serial Next Webpack production build passed during this continuation. Final narrow lint of all six changed gateway/probe JavaScript files passed before the push. Earlier local tooling stalls were resolved. Next and Vinext builds must run sequentially because both generate .next files.

No secret values, challenge tokens, host credentials or participant records belong in this document or Git.
