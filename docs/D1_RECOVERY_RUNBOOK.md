# D1 recovery and retention runbook

Last reviewed: 2026-10-13

This runbook is for the `momo-community` production database. It turns the existing disposable Time Travel drill into a repeatable operating procedure. It does **not** automate production restores: a restore overwrites the database in place and must always be an explicit owner action.

Cloudflare D1 Time Travel is automatically enabled. Current Cloudflare documentation says point-in-time recovery is retained for **7 days on Workers Free** and **30 days on Workers Paid**. Time Travel can restore by bookmark or timestamp. A restore response also provides the previous bookmark, which can be used to undo a bad restore. Check the current Cloudflare D1 limits before relying on these windows because platform limits can change.

References:
- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/wrangler-commands/

## Owner and schedule

Operational owner: **Momo site owner/host**.

- Before every production schema migration, bulk data repair, destructive cleanup, or release that changes persistence behavior: record the current Time Travel bookmark and the intended change in the release notes.
- After every production migration: verify the public community read, host read, migration ledger, and one non-destructive authenticated flow before continuing the release.
- Every **7 days** while the public pilot is active: run the disposable recovery drill against a separate D1 database and record the date/result in `docs/PRODUCTION_REQUIREMENTS.md`. This cadence deliberately fits inside the Free-plan recovery window.
- After any incident involving an unexpected `DELETE`, `UPDATE`, broken migration, corrupted state, or deployment writing invalid data: stop writes where practical, record the current bookmark, identify the last known-good timestamp, and follow the restore procedure below.
- Do not retain participant database exports on a personal laptop as a backup routine. If recovery beyond the current Time Travel window becomes required, use an encrypted, access-controlled Cloudflare-supported export path and document retention/deletion separately before enabling it.

## Pre-change bookmark

From an authenticated Wrangler session, run:

```bash
pnpm wrangler d1 time-travel info momo-community --json
```

Store the bookmark in the private release/incident record with:

- UTC timestamp
- Git commit or PR being deployed
- migration files being applied
- operator/owner role
- reason for the change

Never put Cloudflare API tokens, database credentials, participant contact data, or session cookies into the record.

## Normal post-deploy verification

After a migration or persistence change:

1. Confirm the migration set in `drizzle/` is still `0000` through the expected latest migration. The current reviewed set is `0000` through `0010`.
2. Check the production migration ledger using the same read-only method used during the 2026-10-13 release. Do not insert or edit ledger rows manually to make a failed migration look applied.
3. Confirm `GET /api/community` succeeds.
4. Confirm the private host overview loads for the owner.
5. Use only a disposable seat for any mutation smoke. Delete that seat afterward.
6. Check Worker/Vercel logs for new D1, access-control, or runtime errors. Do not paste participant contact fields into incident notes.

If any of these fail, stop the release and decide whether to fix forward or restore. Do not continue applying migrations blindly.

## Restore decision

Prefer a forward fix only when the bad write is narrow, fully understood, and can be corrected without losing valid writes made after the incident began. Use Time Travel when the database state itself is no longer trustworthy or a destructive migration/write affected an unknown set of rows.

Before restoring production:

1. Record the **current** bookmark first so the restore itself can be reversed if needed.
2. Identify the last known-good UTC timestamp from deployment, audit, and monitoring evidence.
3. Retrieve the bookmark at or before that timestamp:

```bash
pnpm wrangler d1 time-travel info momo-community --timestamp="2026-10-13T12:00:00Z" --json
```

4. Review the target timestamp/bookmark twice. A production restore is destructive and overwrites the database in place.
5. Pause avoidable write traffic during the restore window. Keep outbound invitation sending disabled.

## Restore production

Restore only after the owner has explicitly chosen the bookmark/timestamp:

```bash
pnpm wrangler d1 time-travel restore momo-community --bookmark="BOOKMARK_FROM_REVIEW"
```

Do not store a real bookmark in this repository. Do not use `--yes` or wrap this command in unattended automation for production.

Immediately after restore:

1. Record the restore result and the returned previous bookmark.
2. Re-run the post-deploy verification above.
3. Verify the migration ledger matches the restored application state.
4. Confirm queue/suspension controls and chat access still enforce correctly before reopening a broad share.
5. Keep outbound email/WhatsApp and photo uploads gated until their relevant state/config checks pass.
6. If the restore selected the wrong point, use the recorded previous bookmark to recover from the restore operation instead of guessing another timestamp.

## Disposable recovery drill

The weekly drill must never target `momo-community` production participant data.

Minimum drill:

1. Create/use a disposable D1 database with the current `0000` through `0010` migrations.
2. Insert a uniquely named probe record.
3. Record the disposable database bookmark.
4. Deliberately change only that probe record.
5. Restore the disposable database to the bookmark.
6. Verify the original probe value returned and the migration ledger remained intact.
7. Delete the disposable database/probe resources when the drill is complete.
8. Record only pass/fail, timestamps, migration count, and non-sensitive error details in the production checklist.

The 2026-10-13 drill already demonstrated this flow once: a changed disposable record was restored and all 11 migration-ledger entries remained present.

## Retention escalation

The controlled 100-seat pilot can start with Time Travel as the recovery mechanism, provided the actual Cloudflare plan/recovery window is checked before launch. If the product later requires recovery older than the current Time Travel window, define all of the following before exporting production data:

- retention period and deletion date
- encrypted storage location
- least-privilege access list
- export frequency
- restoration test frequency
- treatment of account-deletion requests in retained backups
- incident process for a leaked export

Cloudflare documents an option to export D1 into R2 using Workflows for retention beyond Time Travel. Do not enable long-term exports until those privacy and deletion rules are decided.
