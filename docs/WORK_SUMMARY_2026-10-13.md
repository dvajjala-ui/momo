# Momo work summary and next steps

Updated: 2026-10-14. Repository: dvajjala-ui/momo. Work continues directly on main.

## Current stage

The product implementation is in place. Hosted pilot verification is now completed for requirements #13, #19 and #20 at the tested workload. Production security activation (#14) is partially complete; real event information (#10) remains pending.

This is evidence for a controlled 100-seat pilot, not a promise of unlimited capacity or a complete production launch sign-off. The owner prefers a low-friction seat flow, so production Turnstile activation is deferred.

Without a new-seat challenge, automated seat creation and spam remain possible, especially across many IP addresses. The enforced Vercel API limit, 100-seat cap and host moderation reduce abuse but cannot eliminate it. Review this choice if real traffic shows abuse.

## What changed in this continuation

- The D1 gateway now returns allowlisted execution metrics to authenticated server callers: rows read/written, query duration and routing metadata. Previously the load probe received only changes, hiding actual usage.
- Added tests/hosted-sustained-probe.mjs: disposable 25/50/100-client fanout, reconnect, lease renewal, history recovery, retry deduplication, telemetry and verified cleanup. It accepts only explicitly named readiness Workers, not production endpoints.
- Fixed the real hosted image probe fixture. The old PNG had an invalid CRC; the new valid PNG contains a disposable metadata marker and verifies that re-encoding removes it. The probe now requires a separate exact-host approval switch for the one-seat production smoke.
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
| One-week readiness R2 key | Object Read & Write only for `momo-readiness-media-20261013`; installed as hidden settings only in the isolated Vercel project; expires 2026-10-21 |
| Momo readiness Turnstile widget | Exact preview hostname, managed mode, preclearance off; configured on the disposable Cloudflare app |
| Axiom momo-security dataset | Redacted security events only; 30-day retention shown in the account |
| Axiom Momo security ingest token | Dataset-scoped token created; not installed on any server. Replacement and remaining setup are pending at the owner's request |
| Vercel production Momo API pilot budget | Published and read back as enabled/enforcing: 120 API requests per 60 seconds per IP, 5-minute mitigation; WhatsApp webhook excluded |

Production gateway and chat Workers were also redeployed with the reviewed source, preserving their private settings and participant records. Production photo uploads are now enabled after the 2026-10-14 live smoke. Production Turnstile and persistent Axiom delivery remain off.

Temporary readiness resources remain available for the unfinished activation checks. Probe-created profiles, messages, receipts, wishes and photos were cleaned up by the passing probes. Remove the temporary resources after activation evidence is saved; they are not production resources.

## Actual hosted results

Earlier hosted runs used main 0e4e2de plus the reviewed fixes described above. The 2026-10-14 Vercel private-photo checks used main `cae89c2` and a uniquely named disposable seat. No real participants or external message recipients were used.

| Check | Result |
| --- | --- |
| Combined lifecycle, Cloudflare | PASS, 8.141 seconds |
| Combined lifecycle, isolated Vercel | PASS, 28.600 seconds |
| Private image upload/access/replacement/deletion | PASS on isolated Cloudflare app: WebP, metadata removed, anonymous 401, private/no-store, old/deleted images 404 |
| Isolated Vercel private image path, 2026-10-14 | PASS on `momo-readiness-20261013.vercel.app`: WebP, metadata removed, anonymous 401, private/no-store, replacement/deletion 404; disposable seat deleted |
| Production private image path, 2026-10-14 | PASS on `momo-ten-pied.vercel.app` after redeploy `dpl_2BFwTf2QyM8z7LX7RfYbPnPoXqTu`: WebP, metadata removed, anonymous 401, private/no-store, replacement/deletion 404. The unique test seat was deleted; a refreshed Cloudflare `momo-media` listing showed 0 B and no objects afterwards. `MOMO_IMAGE_UPLOADS_ENABLED=true` remains on. |
| 25 clients, 2 rounds | PASS, delivery p50 169 ms / p95 185 ms / max 362 ms |
| 50 clients, 2 rounds | PASS, delivery p50 179 ms / p95 272 ms / max 279 ms |
| 100 clients, 18 rounds over 157.544 seconds | PASS, 1,800 live deliveries; p50 175 ms / p95 199 ms / max 618 ms |
| 100-client reconnect/history | All 100 recovered history; 200 lease renewals; all 400 socket connections successful |
| Delivery/errors | Zero missed or duplicate live messages; zero observed gateway, socket, server, unexpected-response or abnormal-close errors |
| Isolated Vercel firewall burst | PASS: 130 GET requests in 28.727 seconds; 119 HTTP 200, one HTTP 429, ten verified HTTP 403/deny mitigations |
| Production normal pages | Home, Join, Chat, Sidekicks, Host and public community API returned HTTP 200 |
| Real preview Turnstile browser check, 2026-10-14 | PARTIAL/FAIL: an anonymous start required verification (428), a completed challenge opened a seat (200), and member access worked (200). A second anonymous request using the same captured token also returned 200, though a tokenless request still returned 428. An invalid token returned 403; a forged seat cookie returned 401. The test seat was deleted and signed out. Do not enable this path in production. |

The lifecycle exercised host login, profile/wish creation, one-click unnamed join, gang reading before profile entry, host lookup, queue/private note, queued denial/restore, suspension denial/restore and account/wish cleanup. These are baseline runs with Turnstile disabled. The real preview check exposed an unexpected replay acceptance, and the owner chose to defer production Turnstile because the visible human check adds friction.

### Provider measurements and their limits

- 100-client test window: 2026-10-13 13:17:04 to 13:19:49 UTC. Durable Object dashboard inspected for 18:47–18:51 IST.
- Gateway-visible usage: 205 rows read, 356 written, 110 metadata results and 7.9267 ms summed SQL timing. These cover the probe's gateway calls, not every internal chat query.
- D1 provider insight sample over the surrounding 30 minutes: 37 query groups, 2,783 queries, 10,772 rows read, 1,189 written and 520.933 ms summed duration. It includes ramps and other checks; it is not a measurement of only the 100-client run or account-wide quota headroom.
- Durable Object CPU: p50 0.23 ms, p90 3.24 ms, p99 16.6 ms, p99.9 25.84 ms. Displayed memory percentiles: 6.29 MB. No thrown exceptions, CPU/memory-limit hits or internal errors in the selected window.
- The provider's generic Errors counter showed 382. Do not call that counter zero. A separate normal-close control produced canceled and responseStreamDisconnected outcomes while the client checks passed, so ordinary socket closures can contribute to that classification. This does not establish an exact breakdown of all 382 outcomes.

The measured traffic was one room with one message every nine seconds, not a heavy multi-room soak or maximum-capacity test. Keep the product cap at 100 active seats and watch actual traffic/quotas.

## Basic application flow

1. Visitor opens Ghar, browses the wish wall and joins a plan with one click.
2. A device seat identifies the member. Production Turnstile is off by owner choice; the public API perimeter rule and app moderation are the active controls. The optional challenge path must not be activated until its replay failure is resolved.
3. A joined member can read gang chat immediately; nickname, age and self-described gender are requested when they first send.
4. Vercel routes the application API. The authenticated Cloudflare gateway persists D1 data; the chat Worker uses Durable Objects for WebSocket delivery and D1 for history.
5. The private /host page manages named and unnamed seats: queue, restore, suspend, remove and send private in-site notes.
6. Photo uploads are enabled. Images decodes/re-encodes to WebP, then private R2 storage serves authenticated no-store media. Replacement and account deletion remove the prior objects.
7. Redacted security events are generated by the app. Axiom delivery/alerts will be enabled only after the remaining sink verification.

## Remaining work, in order

1. Keep production Turnstile off and do not create the production widget under the current low-friction product decision. If the owner later wants it, first reproduce and fix the preview replay result, then rerun the protected lifecycle and desktop/mobile flow.
2. Complete Axiom token replacement/setup only when the owner resumes it. Observe one redacted event, configure owner alerts and prove a controlled failed-host-login event before production activation. The current token was briefly visible in a tool result, so replace it before server use.
3. Supply the real first-event date, exact Kitab Ghar address, named host, end time, capacity, full cost, moderation contact and emergency/exit plan. Confirmed: Ahmedabad, Gujarat; 6 pm; open reading/talking/socialising/exploring.
4. After the owner resumes Axiom token setup, record final monitoring activation, remove disposable infrastructure/private test files, and begin the monitored 100-seat pilot. Keep email and WhatsApp sending separately gated.

## Verification status

Gateway, community, chat-ticket and read-before-profile integrations passed. TypeScript, repository lint, Vinext build and the serial Next Webpack production build passed during this continuation. Final narrow lint of all six changed gateway/probe JavaScript files passed before the push. Earlier local tooling stalls were resolved. Next and Vinext builds must run sequentially because both generate .next files.

On 2026-10-14, the local seat Turnstile integration suite passed. The disposable browser replay result above supersedes its mocked-provider success for activation decisions. Production Turnstile remains off. The later photo activation changed only the production upload flag and redeployed the existing approved application source; no participant account was used for the smoke.

No secret values, challenge tokens, host credentials or participant records belong in this document or Git.
