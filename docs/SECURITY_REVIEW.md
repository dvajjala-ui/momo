# Momo to Pizza security review

Last reviewed: 2026-10-13

This document is the security checklist for the community site, D1 gateway and realtime chat. It records controls that exist in source, hosted checks that have passed, and deployment/operating work that still blocks a broad public launch. It does not claim the site is impossible to attack.

## Threat model

The public site accepts pseudonymous device sessions, nicknames, wishes, chat messages, optional profile images, invitation contact details and sidekick applications. A host account can see contact details, moderate members and publish events. The highest-impact failures are:

- a visitor gaining host permissions or reading another member’s private data
- cross-site requests acting with a member or host cookie
- stored script/markup executing through a nickname, wish, message, caption or event
- SQL injection, oversized input or request volume exhausting D1/Workers
- chat flooding, replayed sends, forged WebSocket tickets or access continuing after suspension
- malicious image uploads, public exposure of private profile photos or retained image metadata
- email/WhatsApp abuse, duplicate sending or spoofed delivery callbacks
- leaked deployment secrets, participant contact data or production database contents
- fake accounts and coordinated disruption during a large public share
- monitoring, backup or incident tooling leaking more participant data than the product itself

The OWASP Top 10 is the baseline for access control, injection, authentication, configuration, dependency, logging and SSRF review. Chat-specific controls follow the OWASP WebSocket Security Cheat Sheet.

## Controls implemented in source

### Identity and host authorization

- Every deployment uses a random 256-bit device token in an HttpOnly, SameSite cookie. Browser identity headers and browser-provided roles are ignored.
- The member ID is a one-way hash of the device token. The token is not stored in local storage and is not returned in API JSON.
- Host access requires the server-only `HOST_PASSCODE`. Its proof is bound to the current device token, so a host cookie copied to a different device token is invalid.
- Host passcodes must be at least 12 characters. Comparisons hash both inputs and avoid an early character mismatch.
- Host login attempts are counted per device seat in D1, delayed after a mismatch and blocked after six attempts in ten minutes.
- All host APIs call server-side `isAdmin()`. Member IDs and `admin` values sent in request JSON are never trusted as authorization.
- The public navigation does not expose the host link. The direct owner URL is `/host`.

### Turnstile and seat forgery

- PR #10 merged fail-closed new-seat Turnstile support and `docs/TURNSTILE_SETUP.md`.
- When `TURNSTILE_ENABLED=true`, a new/unsigned seat is accepted only after server-side Siteverify succeeds.
- The verifier checks Cloudflare success, the exact request hostname and the expected `seat` action.
- The browser receives only the public site key. The Turnstile secret and separate `MOMO_SEAT_SIGNING_SECRET` remain server-only.
- Authenticated requests require a signed seat proof while Turnstile is enabled, so a browser cannot invent a `momo_sid` cookie to bypass the challenge.
- Missing enabled settings fail closed. Invalid/expired/replayed tokens do not create a seat.
- Turnstile remains disabled in production until the real production widget/settings and hosted flows are verified. Source readiness is not the same as activation.

### Cross-site requests and browser isolation

- State-changing routes validate `Origin` against the request origin.
- State changes use POST. Public GET routes do not mutate application state.
- Cookies are host-scoped, HttpOnly, SameSite=Lax and Secure on HTTPS.
- Global response headers set a Content Security Policy, deny framing, disable MIME sniffing, restrict browser permissions, use a same-origin opener policy and enable HSTS on HTTPS deployments.
- CSP limits plugins, foreign form actions, base URLs and framing while allowing the specifically required font/image/challenge/connect sources.

### Input, output and database safety

- API bodies are read with hard byte limits before parsing.
- Text, numeric values and identifiers have server-side validation/length bounds.
- SQL values use D1 prepared-statement bindings. User text is not concatenated into SQL.
- React renders user content as text. User-provided HTML is not accepted.
- Nicknames have a normalized durable claim table, so racing clients cannot create duplicate normalized nicknames.
- Wish capacity uses an atomic insert/select check to prevent concurrent overfill.
- One member can have at most three active group joins; wish creation is also limited.
- The 100-seat pilot count is derived from D1. The site does not invent participants or scarcity.

### Chat and realtime service

- Chat tickets are HMAC-signed, expire quickly, are origin-bound and contain a server-derived member/host role.
- WebSocket handshake checks browser origin and ticket. API-to-Worker calls use a separate server secret.
- Room access is checked before history, before sending and for connected recipients.
- Group rooms require a current wish join. Private threads require shared attendance, mutual opt-in and no block.
- Queued or suspended seats cannot use chat. Access changes revoke connected recipients when the server revalidates them.
- Message/client IDs and receipts make retries idempotent and reject reused IDs with conflicting content.
- Per-member send budgets, WebSocket frame/payload/connection limits and Durable Object queue limits bound abuse.
- Persistence is authoritative. Reconnect/history can recover a saved message after a broadcast problem.
- PR #11 (`1f1f227`) separated read and write authorization correctly: active signed-in/joined seats can read/history/fanout before profile setup, while nickname/age/gender are still required before the first send.
- `tests/realtime.integration.mjs` and the focused read-before-profile regression passed before merge.

### Uploads and participant data

- Upload requests are limited to about 3.2 MB and accepted image files to 3 MB.
- PNG/JPEG/WebP signatures are checked instead of trusting filename/MIME alone.
- Gallery uploads require host access. Profile uploads require an existing profile and explicit permission confirmation.
- Published gallery media is public. Profile media requires a valid member session and uses private/no-store caching.
- Replaced/deleted media is removed from R2.
- New uploads are fail-closed unless R2, the reviewed gateway/image settings and `MOMO_IMAGE_UPLOADS_ENABLED=true` are all configured.
- When enabled, the authenticated gateway decodes the image, checks decoded dimensions/pixels, scales it and stores only re-encoded WebP output.
- A disposable hosted gateway using a real Cloudflare Images binding already rejected unauthorized/invalid input, returned WebP and removed a test metadata marker.
- That hosted smoke proves the processor path works, not that production uploads should already be enabled. The intended production Images/private-media path still needs its final smoke before the flag is enabled.

### Invitations and outbound providers

- Email and WhatsApp sending fail closed until provider/readiness variables are present.
- Email ownership verification and send records prevent blind/duplicate sending.
- WhatsApp remains disabled until sender/template/callback/phone verification are deliberately ready.
- WhatsApp callbacks require the configured signature and phone-number identity; delivery state cannot move backward.
- Preview/readiness actions do not send. The host must explicitly send reviewed invitations.
- Server-side outbound destinations are deployment-controlled; browsers cannot provide arbitrary fetch destinations.
- Current production-readiness tests do not contact real email or WhatsApp recipients.

## Abuse and privacy controls

- Wish creators remain anonymous on the public wall; server ownership is retained for deletion/moderation.
- Reports, blocks, waiting queue and host suspension are enforced server-side.
- Device seats are pseudonymous, not verified identity. Clearing storage/using another browser can create another seat.
- IP addresses are not treated as permanent user identity. Shared networks, carrier NAT, VPNs and address changes make IP-as-account both inaccurate and easy to evade.
- Product abuse controls include the truthful 100-seat pilot, queue, three-group limit, chat send budgets, host moderation and optional Turnstile.

## Edge rate limiting

The current public application hostname is `momo-ten-pied.vercel.app`, so requests terminate at Vercel before the application. Therefore the first perimeter WAF/rate-limit rule must be configured in **Vercel Firewall**, not Cloudflare WAF. Cloudflare WAF becomes the perimeter only if a future custom domain is actually proxied through Cloudflare.

PR #14 added `docs/EDGE_RATE_LIMIT_SETUP.md` and `tests/hosted-firewall-probe.mjs`:

- the recommended starting pilot rule is intentionally coarse and IP-based only as a transient firewall counter, never as account identity
- the rule should be observed first, then enforced
- the probe refuses the known production hostname and issues only read-only requests against a disposable preview
- production rate limiting is not marked complete until the actual perimeter rule is active and a controlled over-limit request is observed returning the intended mitigation/429 behavior

## Security observability and privacy

PR #13 (`3bc6600`) added structured `momo-security` events for:

- cross-origin mutation blocks
- failed Turnstile seat verification
- host-login failures
- host-login rate limiting
- unauthorized admin API access

The event schema intentionally omits query strings, IP addresses, cookies, Authorization headers, member IDs, nicknames, contact data, message/wish content, host credentials and Turnstile tokens. `tests/ops-log.test.mjs` explicitly attempts to leak those values and verifies they do not appear.

PR #15 (`2728e44`) added an optional persistent Axiom sink and `docs/SECURITY_MONITORING_SETUP.md`:

- external delivery is **off by default**
- only HTTPS Axiom edge ingest hosts ending in `.edge.axiom.co` are accepted; arbitrary monitoring URLs are rejected
- token/dataset/domain are server-only settings
- noisy anonymous access-denial events are sampled before external delivery to reduce request amplification
- external delivery has a short timeout, no retries, and fails open for the user/auth/moderation flow
- the sink receives only the already-redacted security record, not arbitrary runtime logs
- `tests/hosted-security-sink-probe.mjs` can send exactly one redacted test event without calling the Momo app, D1 or R2

Production persistent monitoring is still pending until a real dataset/ingest-only token/alerts are configured and the one-event probe is observed successfully.

## D1 recovery and retention

A disposable D1 Time Travel drill already restored a deliberately changed test record while preserving all 11 migration-ledger entries.

PR #14 added `docs/D1_RECOVERY_RUNBOOK.md`:

- record a Time Travel bookmark before production schema migrations, bulk repair or destructive data work
- verify public/host reads and the migration ledger after persistence changes
- run a disposable recovery drill every 7 days while the public pilot is active so the routine remains exercised within the Free-plan recovery window
- never automate/unattended production restore; the selected bookmark/timestamp requires an explicit owner decision
- record the current bookmark before restoring so a bad restore can itself be reversed
- do not create routine personal-laptop database exports containing participant data
- define privacy/access/deletion rules before adding long-term exports beyond Time Travel

The source-side operating schedule is now defined. The recurring drill becomes an active operational obligation once the live pilot starts.

## Hosted verification completed

Completed on 2026-10-13 without using real participant content:

- production migrations through `0010` were applied after a restore bookmark and the migration ledger was checked
- production D1 gateway and realtime Worker were deployed with separate secrets and exact app origin
- authenticated gateway read and disposable seat/profile/chat/deletion smoke passed
- real Cloudflare Images binding sanitization smoke passed in a disposable gateway
- 10-client hosted WebSocket delivery/reconnect/history smoke passed
- disposable D1 Time Travel recovery drill passed
- PR #11 read-before-profile regression and full realtime suite passed
- redacted security event privacy test passed
- Turnstile integration suite against the built candidate passed
- community/admin integration suite passed after the optional monitoring sink changes
- production builds/lint and cleaned Vercel previews passed for the relevant source PRs

## Hosted checks still required

These are the material technical blockers before a broad public promotion:

1. **Longer isolated hosted chat/load run:** execute `tests/hosted-chat-probe.mjs` in a disposable environment and record p50/p95, error rate, reconnect behavior and D1/Durable Object overload/quota observations. The existing 10-client smoke is correctness evidence only.
2. **Combined isolated hosted lifecycle:** execute `tests/hosted-lifecycle-probe.mjs` against an isolated preview/database. It must prove one-click join, profile-less gang read, host queue/private note, suspension/restore and deletion cleanup together.
3. **Production Turnstile:** configure the real production widget/site key, secret, seat-signing secret and enable flag; verify the Ghar, one-tap wish, Sidekicks and Host flows from desktop/mobile before activation.
4. **Actual Vercel Firewall enforcement:** add the current-perimeter rule from `docs/EDGE_RATE_LIMIT_SETUP.md`, then use the disposable firewall probe to prove over-limit requests are mitigated without blocking ordinary flows.
5. **Production image activation:** verify the reviewed Images binding/private-profile access on the intended production gateway, then deliberately enable `MOMO_IMAGE_UPLOADS_ENABLED`; otherwise leave uploads paused.
6. **Persistent monitoring activation:** configure the reviewed security sink (or an equivalent privacy-preserving monitored destination), run the one-event probe, create the alerts and verify one controlled failed-host-login event.

## Candidate verification and capacity statement

The current recommendation remains a controlled pilot capped at **100 active seats**. This is an operating/product cap, not a claim that the system fails at 101.

Local Miniflare fanout evidence: 500 clients received one persisted message exactly once; p50 33 ms, p95 42 ms and max 43 ms, zero misses for that tested fanout. A separate hosted 10-client smoke delivered all messages and recovered history after reconnect.

Those results must not be advertised as a production concurrency ceiling. Hosted capacity depends on traffic mix, D1 query duration, Durable Object CPU/memory, network/mobile latency and platform quotas. The longer hosted probe above is required before making a stronger statement.

## Incident checklist

1. Disable invitation sending and, if needed, realtime chat without deleting unrelated data.
2. Preserve redacted logs and note first/last observed times, routes and safe request IDs.
3. Suspend affected seats and rotate only secrets that may be exposed.
4. Check D1 audit/message/delivery/moderation records without exporting unrelated participant data.
5. Record the current D1 Time Travel bookmark before any restore or destructive recovery operation.
6. Fix/test in an isolated environment and deploy the smallest verified change.
7. Tell affected people what happened, what data was involved and what action they should take; avoid unsupported claims.
8. Record root cause, containment, recovery and a concrete prevention task in this document/checklist.

## Launch position

For a controlled pilot, the application source now has the main authorization, privacy, realtime, upload, recovery, monitoring and abuse-control mechanisms plus fail-closed deployment gates. A **large public Reddit-style share is still premature** until the six hosted/activation checks above are recorded as passing and the real first-event details in `docs/PRODUCTION_REQUIREMENTS.md` are confirmed.
