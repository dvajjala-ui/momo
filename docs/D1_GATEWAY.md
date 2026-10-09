# Native D1 gateway candidate

`cloudflare/db-gateway/worker.mjs` is a server-to-server Worker with a native binding to `momo-community`. The candidate is implemented and locally tested; no Worker, new credential or production runtime setting has been created for it yet.

When configured, Vercel's database adapter prefers this gateway over the Cloudflare management API. Momo's authenticated routes still decide member/host permissions. The gateway token permits application-data reads and writes in the bound Momo database, so treat it like a database password. It must exist only in the Worker secret and Vercel server settings. Never expose it with a `NEXT_PUBLIC_` variable or send it to the browser.

The Worker checks a strong bearer credential, accepts bounded parameterized single queries or atomic batches, rejects schema operations/multiple statements, and returns private errors without SQL, parameters or provider messages. There is no browser CORS permission. Database migrations remain a separate explicit operation using the existing migration command. A partial gateway configuration fails closed; a failed request never switches to temporary storage or retries an uncertain write.

## Local checks

```sh
node --experimental-strip-types tests/gateway.integration.mjs
node --experimental-strip-types tests/storage.integration.mjs
```

The disposable Miniflare suite covers unauthorized access, health, input limits, bound values, native batch rollback, private errors, no automatic write retries and 50 simultaneous joins competing for ten seats. This is a correctness smoke check, not production load or latency evidence.

## Activation after candidate review

1. Review the Worker configuration. Its D1 binding points to the existing production `momo-community` database. Use disposable resources for any hosted preview that accepts test writes.
2. Create a cryptographically random secret with at least 32 bytes and configure `MOMO_DB_GATEWAY_TOKEN` privately in the Worker and Vercel. Do not put its value in a command argument, screenshot, chat or Git. An owner-operated `wrangler secret put MOMO_DB_GATEWAY_TOKEN --config cloudflare/db-gateway/wrangler.jsonc` prompt keeps entry private.
3. Deploy the reviewed Worker with `wrangler deploy --config cloudflare/db-gateway/wrangler.jsonc`. This is a production infrastructure step; it has not been run by the candidate tests.
4. Save its HTTPS origin as `MOMO_DB_GATEWAY_URL` in an ignored local environment file along with the token, then run the read-only probe:

```sh
node --env-file=.env.gateway.local --experimental-strip-types scripts/probe-db-gateway.mjs
```

5. Add both settings to the intended Vercel environment. Preserve the Cloudflare credentials privately for explicit migrations; the runtime prefers the gateway while its settings are present. Apply the reviewed pending schema migrations before deploying routes that need them.
6. Verify the deployed member, host, private-message and deletion flows with disposable data. Record the release SHA and remove test records through the app. Measure real request latency before making a speed claim.

## Remaining messaging work

This gateway removes runtime database traffic from the management-API path once activated. It does not replace chat polling itself. An optional Durable Object per room with WebSocket delivery, signed room authorization, permission revalidation, idempotent sends and reconnect history is now built and locally tested. It remains disabled until reviewed deployment and private settings. See `REALTIME_CHAT.md` for its 500-client local probe and the remaining hosted capacity checks.

Cloudflare documents native [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/). Its [D1 free allowances](https://developers.cloudflare.com/d1/platform/pricing/) and [Worker request allowances](https://developers.cloudflare.com/workers/platform/pricing/) still apply; a native binding does not make usage unlimited.
