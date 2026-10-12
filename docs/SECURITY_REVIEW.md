# Momo to Pizza security review

Last reviewed: 2026-10-13

This document is the security checklist for the community site, D1 gateway and realtime chat. It records controls that exist in source, checks that must pass before production, and operating work that still needs an owner or deployed Cloudflare account. It does not claim the site is impossible to attack.

## Threat model

The public site accepts pseudonymous device sessions, nicknames, wishes, chat messages, optional profile images, invitation contact details and sidekick applications. A host account can see contact details, moderate members and publish events. The highest impact failures are:

- a visitor gaining host permissions or reading another member’s private data
- cross-site requests acting with a member or host cookie
- stored script or markup executing through a nickname, wish, message, caption or event
- SQL injection, oversized input or high request volume exhausting D1 or a Worker
- chat flooding, replayed sends, forged WebSocket tickets or access continuing after suspension
- malicious image uploads, public exposure of private profile photos or retained location metadata
- email/WhatsApp abuse, duplicate sending or spoofed delivery callbacks
- leaked deployment secrets, participant contact data or production database contents
- fake accounts and coordinated disruption during a public Reddit launch

The [OWASP Top 10](https://top10.owasp.org/2021/) is the baseline for access control, injection, authentication, configuration, dependency, logging and SSRF review. Chat-specific controls follow the [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).

## Controls implemented in source

### Identity and host authorization

- Every deployment uses a random 256-bit device token in an HttpOnly, SameSite cookie. Browser identity headers and browser-provided roles are ignored.
- The member ID is a one-way hash of the device token. The token is not stored in local storage and is not returned in API JSON.
- Host access requires the server-only `HOST_PASSCODE`. Its proof is bound to the current device token, so a host cookie copied to another device token is invalid.
- Host passcodes must be at least 12 characters. Comparisons hash both inputs and avoid an early character mismatch.
- Host login attempts are counted per device seat in D1, delayed after a mismatch and blocked after six attempts in ten minutes. Cloudflare edge rate limiting is still recommended before a broad public launch.
- All host APIs call `isAdmin()` on the server. Member IDs and `admin` values sent in request JSON are ignored.
- The public navigation does not expose the host link. The direct owner URL is `/host`.

This follows OWASP’s guidance that session identifiers be random and protected with Secure, HttpOnly and SameSite attributes. See the [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### Cross-site requests and browser isolation

- Every state-changing route checks that `Origin` exactly matches the request URL origin.
- State changes use POST. Public GET routes do not mutate state.
- Cookies are host scoped, HttpOnly, SameSite=Lax, and Secure on HTTPS.
- Global response headers set a Content Security Policy, deny framing, disable MIME sniffing, restrict browser permissions, use a same-origin opener policy and enable HSTS on HTTPS deployments.
- The CSP blocks plugins, foreign form actions, foreign base URLs and framing. It allows the external font and Wikimedia image hosts used by the current UI and HTTPS/WSS connections required by deployments.

Origin checking matches the defense described in the [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). Header choices are based on the [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) and [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet).

### Input, output and database safety

- API bodies are read with hard byte limits before JSON parsing.
- Text fields have server-side minimum and maximum lengths. Numbers and identifiers are validated before use.
- SQL values use D1 prepared-statement bindings. User text is never concatenated into SQL.
- React renders user content as text. User HTML is not accepted. The one `dangerouslySetInnerHTML` use renders application-owned food SVG strings.
- Nicknames have a normalized, durable claim table. A duplicate cannot be created by racing two browsers; alternatives are returned while the typed value stays in the form.
- Group capacity uses an atomic `INSERT ... SELECT` check, which prevents concurrent joins from overfilling a wish.
- One member can have at most three active group joins. The API enforces this for both creating and joining a wish.
- The 100-seat count is derived from D1. Waiting status and counts are real; the product does not invent members or scarcity.

### Chat and realtime service

- Chat tickets are HMAC signed, expire after 30 seconds, are restricted to the configured app origin and include a server-derived member and host role.
- The WebSocket handshake checks the browser origin and ticket. API-to-Worker calls use a separate secret in an Authorization header.
- Room access is checked before history, before sending, after history reads and again for connected recipients.
- Group rooms require a current wish join. Private threads require shared confirmed attendance, mutual opt-in and no block.
- Queued or suspended seats cannot enter chat. Revocation closes a realtime connection on the next authorization check.
- Message IDs are derived from member and client IDs. Receipts make retries idempotent and reject a reused ID with different content.
- Durable per-member send budgets allow ten saved messages per ten seconds. WebSocket frame budgets, payload limits, connection limits and internal queue limits stop unbounded fanout.
- Persistence is authoritative. A broadcast failure does not turn a saved message into a failed write; reconnect history recovers it.

The realtime Worker uses Cloudflare’s hibernation API. Cloudflare documents a platform maximum of 32,768 hibernating WebSockets per Durable Object, while practical limits depend on CPU and memory. The application intentionally caps one room at 1,000 sockets and two sockets per member. See [Cloudflare Durable Object WebSocket state](https://developers.cloudflare.com/durable-objects/api/state/) and [Durable Object FAQs](https://developers.cloudflare.com/durable-objects/reference/faq/).

### Uploads and participant data

- Upload requests are limited to 3.2 MB and accepted files to 3 MB.
- The server checks PNG, JPEG and WebP magic bytes instead of trusting the filename or browser MIME type.
- Gallery uploads require host access. Profile uploads require an existing profile and explicit permission confirmation.
- Published gallery media is public. Profile media requires a valid member session and uses `private, no-store` caching.
- Replaced and deleted media is removed from R2.
- The UI tells uploaders to remove location metadata. Server-side metadata stripping is not yet implemented, so this remains a launch risk for profile and gallery uploads.

Before opening uploads to a broad audience, add server-side decode/re-encode and pixel-dimension limits. The [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) is the reference.

### Invitations and outbound services

- Email and WhatsApp sending fail closed until all readiness variables are present.
- Email ownership must be confirmed. Send records prevent duplicate sends for the same address and event.
- WhatsApp sending remains disabled until the sender, approved template, public callback and phone verification are genuinely ready.
- WhatsApp callbacks require a valid Meta signature and matching phone-number ID. Delivery states cannot move backward.
- Preview and readiness actions do not send. The host must explicitly send a reviewed invitation.
- Server-side outbound destinations come from deployment configuration and are validated. The browser cannot supply an arbitrary fetch URL. If new URL-fetch features are added, use a destination allowlist as described in the [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## Abuse controls and privacy limits

- Wishes and their creators are anonymous on the public wall. The server keeps the creator ID for deletion and moderation.
- Reports, blocks, host suspension and waiting-queue controls are enforced on the server.
- A device seat is pseudonymous, not verified identity. Clearing storage or using another browser creates another seat. IP addresses are not treated as permanent identity because shared networks, carrier NAT, VPNs and changing addresses would block real people and still not stop a determined attacker.
- The 100-seat pilot, queue, three-group limit, chat rate limit and host moderation reduce casual fake-account abuse. Stronger controls for a public Reddit launch should use Cloudflare Turnstile on seat creation and edge rate limits on session, profile, wish, join, upload and host-login endpoints.
- The site must never infer gender from a face or collect Aadhaar for this community flow. Both create disproportionate privacy and discrimination risk and do not reliably prove a person’s gender.

## Production checks still required

These block a broad public launch until they are completed and recorded:

- Apply migrations `0005` through `0009` to the production D1 database and verify the migration ledger.
- Deploy the reviewed D1 gateway and realtime Worker to the intended Cloudflare account.
- Configure exact production origins and 32-byte-or-longer gateway/chat secrets in private settings.
- Run the gateway, realtime, chat-ticket, community and invitation integration suites against the built candidate without contacting real recipients.
- Run the local fanout/load probes, then a small production smoke test using test seats. Record p50, p95, error rate, D1 reads/writes and Durable Object overload responses.
- Add Cloudflare edge rate-limit rules and Turnstile before posting to a large public community.
- Add server-side image re-encoding or keep uploads unavailable for the public pilot.
- Add a monitored error/log destination with contact data redaction. Alert on host login failures, access denials, moderation spikes, D1 overload/quota errors and outbound invitation failures.
- Establish a D1 backup/restore drill and retention schedule. Free D1 currently provides a seven-day Time Travel window and has daily usage limits. Check current [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) before launch.
- Rotate a secret immediately if it appears in a command, screenshot, Git history, chat transcript or client response.

## Candidate verification recorded

The 2026-10-13 production candidate passed TypeScript, repository lint, the Next production build and the Vinext/Cloudflare build. Disposable integration runs passed for community/member controls, invitation providers, chat tickets, the native D1 gateway, live chat, polling fallback, realtime reconnect and storage. Provider tests use reserved addresses and intercepted transports; they sent no real email or WhatsApp message.

A local browser run of the built Worker verified signed-out seat creation, one-click wish join, direct gang chat, deferred nickname setup, seat exit, sidekick application, private host login and administration of both named and unnamed seats. A fresh page recorded no console errors after internal link prefetch was disabled for the Vinext runtime.

The 500-client local realtime fanout delivered one persisted message exactly once to every client. Measured local network latency was p50 33 ms, p95 42 ms and max 43 ms. This was one fanout on Windows/Miniflare with disposable data. It is useful regression evidence and does not predict sustained hosted capacity, mobile latency or Cloudflare quota usage.

Production inspection found migrations `0000` through `0004` applied in D1. Migrations `0005` through `0009`, the two Workers, their secrets and the five Vercel gateway/chat variables are not active yet. Those are deployment tasks, so the controls that depend on them are source-complete but not production-active.

## Incident checklist

1. Disable invitation sending and, if needed, realtime chat without deleting data.
2. Preserve logs and note the first/last observed times, affected routes and request IDs.
3. Suspend affected seats and rotate only the secrets that may be exposed.
4. Check D1 audit, message, delivery and moderation records. Do not export unrelated participant data.
5. Fix and test in an isolated environment, then deploy the smallest verified change.
6. Tell affected people what happened, what data was involved and what action they should take. Avoid claims that cannot be supported by evidence.
7. Record the cause, containment, recovery and a concrete prevention task in this document.

## Capacity statement

The product limit is 100 active pilot seats. It is a deliberate operating cap, not a claim that the platform fails at 101. Cloudflare states that each D1 database processes queries serially, so throughput depends on query duration; their example gives about 1,000 queries per second at 1 ms per query and 10 per second at 100 ms. Overload is queued and may eventually return an error. This means a local load result is evidence for the tested workload only, not a universal user count. See [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

The current recommendation is a controlled pilot capped at 100 active seats after the production migrations, Workers and smoke checks pass. Do not advertise a concurrency figure from the local fanout. Keep uploads away from a broad public campaign until server-side image re-encoding is added, and add Turnstile plus edge rate limits before posting to a large public community.
