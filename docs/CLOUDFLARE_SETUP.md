# Cloudflare storage for the Vercel app

Created 9 October 2026 in the existing owner account:

- D1: `momo-community`, UUID `57f1a496-03ae-44d5-ad94-db63def06c25`, Asia Pacific.
- R2: `momo-media`, Standard storage, public access disabled.

Both scoped credentials were created with owner approval, all six storage settings saved as Production secrets in Vercel, and all five migrations applied. The owner entered HOST_PASSCODE privately. Real Cloudflare probes and full API checks across two local Next instances passed; all disposable records and files were removed. PR #1 is merged and Vercel production is running the storage integration. Live API checks passed for durable/photo status, wish/gang persistence across independent requests, access denial and private R2 media; QA data was removed. The owner successfully opened the live host notebook; WhatsApp remains unconfigured. Post-deployment verification details are recorded in the deployment-verification pull request.

These are separate from Backline and the existing private ChatGPT Site. No participant data has been copied. Resource creation alone does not connect the deployed site.

## Private runtime settings

In Vercel project `momo`, set the following server-only environment variables. Use separate disposable resources for preview deployments that accept test writes.

| Setting | Value / scope |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | The account owning the resources |
| `CLOUDFLARE_D1_DATABASE_ID` | The UUID above |
| `CLOUDFLARE_D1_API_TOKEN` | D1 Edit/Write permission for only the owner account; Cloudflare scopes D1 access by account |
| `R2_BUCKET_NAME` | `momo-media` |
| `R2_ACCESS_KEY_ID` | R2 S3 key with Object Read & Write permission for only `momo-media` |
| `R2_SECRET_ACCESS_KEY` | Matching R2 S3 secret |
| `HOST_PASSCODE` | Owner-chosen secret of at least 12 characters |

Never use `NEXT_PUBLIC_` for these settings. Keep credential files ignored and out of screenshots, chat, logs and Git. The adapters access Cloudflare only from the server. They never expose public R2 URLs. Incomplete configuration fails closed instead of silently falling back to temporary storage.

## Apply the existing schema once

With the D1 settings loaded privately (this checkout uses ignored `.env.cloudflare.local`), first inspect pending migrations:

```sh
node --env-file=.env.cloudflare.local --experimental-strip-types scripts/cloudflare-migrate.mjs
```

Apply only to the dedicated, newly created Momo database:

```sh
node --env-file=.env.cloudflare.local --experimental-strip-types scripts/cloudflare-migrate.mjs --apply --database-id=57f1a496-03ae-44d5-ad94-db63def06c25
```

The command preserves checked-in Drizzle migrations, tracks names in `_momo_migrations`, and refuses an untracked existing schema. Each migration and its history row are submitted in one D1 batch. Do not run concurrent migration jobs. The deployed D1 adapter never runs schema changes on cold starts. Turso/local SQLite retain their existing automatic migration behavior.

## Verify before collecting real requests

1. Build and run `node --experimental-strip-types tests/storage.integration.mjs` plus the existing local Worker integration suite.
2. Verify actual D1 parameter binding and batch rollback against the new empty database using disposable records, then apply the schema.
3. Deploy a reviewed candidate with private runtime settings. `/api/community?view=me` must report `storage: "durable"` and authenticated responses `photos: true`.
4. A test wish and chat must survive independent requests and redeployment. Test gang access from two different member sessions and an outsider.
5. Upload a consented test photo, verify media permissions, replace/delete it and confirm R2 cleanup. Keep the bucket private.
6. Host access must work only with the private passcode. Keep both WhatsApp readiness flags false.

## Free allowances and limits

Checked 9 October 2026:

- [D1 Workers Free](https://developers.cloudflare.com/d1/platform/pricing/): 5 million rows read/day, 100,000 rows written/day, 5 GB total storage. Exceeding free limits blocks database operations until reset or cleanup. These are account-wide allowances.
- [R2 Standard](https://developers.cloudflare.com/r2/pricing/): 10 GB-month storage, 1 million Class A operations/month, 10 million Class B operations/month, free egress. Usage above the allowance is billed. The existing account's other buckets share these allowances. No paid upgrade was purchased for this setup.

This fixes durability, not a measured speed guarantee. Vercel-to-Cloudflare calls add network time; measure the deployed flows before claiming a performance improvement.

Cloudflare's [management API limit](https://developers.cloudflare.com/fundamentals/api/reference/limits/) is 1,200 calls per five minutes per user/account token. Gang polling now batches access and messages into one call and already pauses in hidden tabs. At a five-second interval, 12 active members consume about 720 read calls per five minutes before writes and other pages. This is suitable for a small pilot; before a broader launch, move database traffic to a private authenticated Worker gateway using a native D1 binding, or change the hosting target. The storage free allowance does not remove this API request limit.
