# Edge rate-limit setup

Last reviewed: 2026-10-13

The current public application hostname is `momo-ten-pied.vercel.app`. Requests to that hostname terminate at Vercel, so the first perimeter rate limit must be configured in **Vercel Firewall**. A Cloudflare WAF rule does not protect the `vercel.app` hostname merely because the application also uses Cloudflare D1/Workers. Cloudflare edge rules become relevant if Momo later moves to a custom domain whose traffic is actually proxied through Cloudflare.

Current references:
- Vercel pricing/firewall: https://vercel.com/pricing
- Vercel firewall CLI: https://vercel.com/changelog/manage-vercel-firewall-in-the-cli
- Vercel firewall rule guidance: https://domains.vercel.com/academy/optimize-your-vercel-account/firewall-rules
- Cloudflare rate limiting (for a future Cloudflare-proxied domain): https://developers.cloudflare.com/waf/rate-limiting-rules/

Vercel currently provides platform DDoS mitigation and WAF capabilities on Hobby. Current Vercel material describes one rate-limit rule on Hobby, with more rules on paid tiers. Confirm the actual project plan and dashboard limits immediately before activation because plan features can change.

## Launch rule for the current Vercel hostname

For the 100-seat pilot, start with one broad fixed-window rule rather than pretending that many route-specific edge rules are available on every plan.

Recommended initial rule:

- match: requests whose path starts with `/api/`
- exclude: `/api/whatsapp/webhook` before WhatsApp delivery is ever enabled, because a provider callback must not share a visitor IP budget
- counting key: client IP for the first pilot rule
- threshold: **120 requests per 60 seconds per IP**
- mitigation: rate limit/block excess requests for **5 minutes**
- rollout: log/observe first, then enforce after checking that normal Join/Adda/Host traffic stays comfortably below the threshold

Why 120/minute: normal Momo browser use is far below two API requests per second, while the value is high enough to reduce accidental harm to people sharing a NAT or mobile carrier address. It is intentionally a coarse perimeter control, not identity. The application must continue to use device sessions, Turnstile, chat send budgets, group limits and host moderation for product-level abuse controls.

Do **not** store an IP address as a member identifier or add it to D1 participant records. The firewall may use an IP transiently for a rate counter; that is different from treating an IP as account identity.

## Existing application limits that remain authoritative

The edge rule supplements, rather than replaces, the controls already in source:

- new device seats: Turnstile when production activation is enabled
- host login: six attempts in ten minutes per device-seat-derived limiter plus delay
- chat persistence: ten saved messages per ten seconds per member
- WebSocket frames, payload size, connections and Durable Object queue are bounded
- wishes: three new wishes per week and at most three active group joins per member
- upload body/file size and image decode dimensions are bounded; uploads remain fail-closed until the production image path is explicitly enabled
- host queue/suspension/block/report controls remain server-authoritative

## Safer rollout procedure

1. Confirm the Vercel project/plan and available firewall rule quota.
2. Keep production Turnstile disabled until its real widget/site key, secret, seat-signing secret and hosted flow pass their separate verification.
3. Add the API rule in observation/log mode first if the dashboard supports that workflow.
4. Exercise Ghar, one-click wish join, Adda/reconnect, Sidekicks and Host from normal desktop/mobile sessions.
5. Verify no normal flow approaches the selected threshold.
6. Enable enforcement.
7. From a controlled test client, intentionally exceed the rate window and confirm requests are mitigated while an ordinary browser remains usable.
8. Check that application logs contain only the redacted `momo-security` event shape; never copy cookies, auth headers, contact fields or full query strings into incident notes.
9. If the rule causes legitimate shared-network users to be blocked, raise the threshold before weakening server-side authentication or moderation controls.

## If the project has multiple rate-limit rules

On a plan that permits several rules, split the broad rule so expensive/authentication endpoints have tighter budgets while public reads remain forgiving. Starting points for a small pilot:

| Surface | Suggested starting budget | Notes |
| --- | --- | --- |
| `POST /api/session` | 20 / 5 min / IP | Turnstile still owns new-seat human verification; host login has its own D1 limiter |
| `POST /api/upload` | 10 / 10 min / IP | Protects image decode/processing/storage cost |
| mutation `POST /api/community` and `/api/admin` | 60 / min / IP | Server-side member/host authorization still applies |
| API GET/read paths | 120 / min / IP | Keeps normal page refresh and chat recovery usable |

Treat these as initial pilot values, not universal capacity numbers. Tune using actual firewall/observability data.

## Future Cloudflare custom domain

If Momo later uses a custom domain proxied through Cloudflare, move or duplicate the perimeter policy there only after verifying which provider is actually first in the request path. Avoid stacking two aggressive rate limiters with unrelated counters during migration; roll out the new edge in log mode, compare behavior, then retire the obsolete rule.

The production checklist should not mark edge rate limiting complete until a rule is active on the provider that actually fronts the public hostname and a controlled over-limit request has been observed being mitigated.
