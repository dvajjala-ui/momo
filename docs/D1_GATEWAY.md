# Native D1 gateway candidate

`cloudflare/db-gateway/worker.mjs` is a server-to-server Worker with a native binding to `momo-community`. It was deployed on 2026-10-13 with a separate private credential and enabled for Vercel Production after owner approval.

Production D1 `momo-community` has migrations `0000` through `0010`. The Worker runs at `https://momo-db-gateway.contact-dwarkesh.workers.dev`; Vercel Production has both `MOMO_DB_GATEWAY_URL` and `MOMO_DB_GATEWAY_TOKEN`. The credential is hidden in private settings and absent from Git. The reviewed `d06df2d` Vercel source was redeployed after configuration.

When configured, Vercel's database adapter prefers this gateway over the Cloudflare management API. Momo's authenticated routes still decide member/host permissions. The gateway token permits application-data reads and writes in the bound Momo database, so treat it like a database password. It must exist only in the Worker secret and Vercel server settings. Never expose it with a `NEXT_PUBLIC_` variable or send it to the browser.

The Worker checks a strong bearer credential, accepts bounded parameterized single queries or atomic batches, rejects schema operations/multiple statements, and returns private errors without SQL, parameters or provider messages. There is no browser CORS permission. Database migrations remain a separate explicit operation using the existing migration command. A partial gateway configuration fails closed; a failed request never switches to temporary storage or retries an uncertain write.

## Local checks

```sh
node --experimental-strip-types tests/gateway.integration.mjs
node --experimental-strip-types tests/storage.integration.mjs
```

The disposable Miniflare suite covers unauthorized access, health, input limits, bound values, native batch rollback, private errors, no automatic write retries and 50 simultaneous joins competing for ten seats. This is a correctness smoke check, not production load or latency evidence.

## Activation and verification

1. Completed: reviewed the binding, deployed the Worker and generated a separate 48-byte random bearer credential in ignored local files. The Worker and Vercel Production received the same credential through stdin, without a command argument or Git commit. Temporary local credential files were removed after verification. The initial Wrangler 4.92 deployment failed while creating its public route; a deployment with Wrangler 4.149 succeeded.
2. Completed: saved its HTTPS origin as `MOMO_DB_GATEWAY_URL`, redeployed Vercel and ran the read-only probe while the ignored temporary environment file existed:

```sh
node --env-file=.env.gateway.local --experimental-strip-types scripts/probe-db-gateway.mjs
```

3. The authenticated read passed without reading participant data. Twelve direct health requests measured p50 139 ms and p95 397 ms with no errors; Cloudflare showed 106 gateway invocations and zero execution errors at inspection. A disposable Vercel device seat/profile and deletion passed through the live app. These are brief smoke observations, not a sustained capacity or speed claim.
4. Completed after this initial smoke: the isolated hosted lifecycle verified wish/gang, host, queue/suspension, private-note and deletion flows. The 25/50/100-client hosted sample recorded gateway latency, D1 usage and reconnect behavior, and the disposable Time Travel recovery drill passed. Preserve Cloudflare management credentials privately for explicit migrations and keep monitoring the real pilot workload.

## Messaging relationship

This gateway removes configured Vercel runtime database traffic from the management-API path. It does not replace chat delivery itself. A Durable Object per room with WebSocket delivery, signed room authorization, permission revalidation, idempotent sends and reconnect history is deployed; see `REALTIME_CHAT.md` and `WORK_SUMMARY_2026-10-13.md` for current hosted evidence and its limits.

Cloudflare documents native [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/). Its [D1 free allowances](https://developers.cloudflare.com/d1/platform/pricing/) and [Worker request allowances](https://developers.cloudflare.com/workers/platform/pricing/) still apply; a native binding does not make usage unlimited.
