# Security monitoring setup

Last reviewed: 2026-10-13

Momo emits small structured `momo-security` records for high-signal abuse events. Console logging always works. The optional external sink lets a Hobby deployment retain and alert on those events without requiring Vercel Pro Log Drains.

The reviewed optional sink is **Axiom** because its current Personal plan is $0, provides 30-day retention and alerting, and supports direct HTTP ingestion with a least-privilege ingest-only API token. This is an optional operational provider, not an authentication dependency. If another monitored destination is chosen later, preserve the same redaction and least-privilege requirements rather than adding arbitrary outbound URLs.

References:
- Axiom pricing: https://axiom.co/pricing
- Axiom ingest API: https://axiom.co/docs/restapi/ingest
- Axiom API tokens: https://axiom.co/docs/reference/tokens
- Axiom monitors: https://axiom.co/docs/monitor-data/monitors
- Vercel runtime-log limits: https://vercel.com/docs/logs/runtime
- Vercel Drains plan availability: https://vercel.com/docs/drains

## What is logged

Allowed security event names:

- `cross_origin_mutation_block`
- `seat_challenge_failed`
- `host_login_rate_limited`
- `host_login_failed`
- `admin_access_denied`

Each record contains only:

- `scope: "momo-security"`
- event name
- HTTP status
- request pathname only
- a bounded Cloudflare/Vercel request trace identifier when it contains only safe characters
- event timestamp

The code intentionally does **not** include query strings, IP addresses, cookies, Authorization headers, device/member IDs, nicknames, age/gender, email/phone, message or wish text, host usernames/passcodes, Turnstile tokens, or the monitoring token.

Anonymous `cross_origin_mutation_block` and `admin_access_denied` deliveries are capped to one event per event/path/minute per running application instance. Console logs still record each invocation. This makes an external sink useful without letting a request flood create one outbound monitoring request for every blocked request.

## Create the Axiom destination

1. Create a Personal Axiom account/dataset dedicated to security events, for example `momo-security`.
2. Create a **basic ingest API token** restricted to that dataset only. Do not use a personal/full-access token.
3. Record the edge ingest domain Axiom assigns, such as `us-east-1.aws.edge.axiom.co`. The application accepts only HTTPS Axiom edge hostnames ending in `.edge.axiom.co`.
4. Never paste the ingest token into Git, screenshots, issue/PR text or a browser-exposed variable.

## Server-only deployment variables

Configure these only in the intended server environment:

| Variable | Example | Purpose |
| --- | --- | --- |
| `MOMO_SECURITY_AXIOM_ENABLED` | `true` | Explicit opt-in; omit/false keeps external delivery off |
| `MOMO_SECURITY_AXIOM_DOMAIN` | `us-east-1.aws.edge.axiom.co` | Axiom edge ingest host; arbitrary hosts are rejected |
| `MOMO_SECURITY_AXIOM_DATASET` | `momo-security` | Destination dataset |
| `MOMO_SECURITY_AXIOM_TOKEN` | secret | Ingest-only dataset token |

If enabled settings are incomplete/invalid, application security behavior continues normally and a redacted local `configuration_invalid` log is emitted. A sink outage also does not fail authentication/moderation; delivery uses a short timeout, no retries, and records only a redacted `delivery_failed` local message.

## Verification before production enablement

1. Configure the four variables on an isolated preview first.
2. Run the repository privacy test `node tests/ops-log.test.mjs`.
3. Run the one-event sink probe described in `tests/hosted-security-sink-probe.mjs`; it refuses to run without its explicit disposable flag.
4. Confirm the Axiom dataset receives exactly the redacted probe event and no token/query/cookie/contact information.
5. Trigger one controlled failed host login in the disposable preview and confirm a `host_login_failed` event appears.
6. Confirm a successful host login produces no security-failure event.
7. Configure monitors before enabling the sink in production.

## Suggested pilot alerts

Start with conservative thresholds and tune using real traffic:

- any `host_login_rate_limited` event: alert immediately
- `host_login_failed`: 3 or more events in 5 minutes
- `seat_challenge_failed`: 20 or more events in 5 minutes
- recurring `admin_access_denied` or `cross_origin_mutation_block` samples for 5 minutes: investigate alongside Vercel Firewall data

Also monitor platform-level 5xx/D1 quota errors and outbound invitation failures using the provider/platform telemetry available to the deployment. The Axiom sink intentionally receives only the redacted security-event schema, not arbitrary application logs containing user data.

## Retention and access

- Use the shortest useful retention. The current Axiom Personal default is 30 days; do not extend security-event retention just because storage is available.
- Keep access to the monitoring dataset limited to the site owner/operators who handle incidents.
- Do not enrich this dataset with participant contact data or IP identity.
- Rotate the ingest token immediately if it appears in a screenshot, command output, repository history or client response.
- Delete the dataset/integration if Momo stops using this provider.

## Vercel plan note

Vercel Hobby currently has short built-in runtime-log retention and does not support configurable Vercel Drains; Pro/Enterprise can use Drains. The direct optional sink above is why Momo can have persistent redacted security-event alerting without making a Vercel plan upgrade a code requirement. If the project later moves to Pro and uses a Vercel Drain instead, do not start forwarding all runtime logs blindly: keep filters/redaction so contact data and credentials are not exported.
