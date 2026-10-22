# Momo continuation: host request workflow

Updated: 22 October 2026

## What changed

- The email notebook separates requests for the selected plan, the general interest list and all loaded requests. Search covers nickname, email, city and plan. Stage filters show counts for the current view.
- Attempts needing a check appear first, followed by the oldest requests waiting for review. Each card shows its requested plan, contact-check state, timestamps, host decision and email attempt separately.
- A request for another plan offers a **Select requested plan** action. General interest cannot be marked as a confirmed place; the person must request a published upcoming plan first.
- Refresh, no-requests and no-matches states are explicit. The existing 200-request read window is disclosed when more records exist. Search/counts are for loaded records, not whole-database analytics. Cursor pagination remains future work.
- Host decisions require the current request snapshot. Concurrent decisions and changed/withdrawn requests return HTTP 409 instead of silently overwriting the latest state.
- Email sending requires the current request and letter snapshots from preview. Editing a request, its nickname or the public plan invalidates an older preview. The send path rechecks the request before calling the provider.
- Provider acceptance preserves a host-confirmed place. A result from an in-flight send cannot mark a newer request as invited. Existing consent, ownership verification, sender gates, deduplication and daily limits remain in the send path.
- The member receipt, progress labels and email content distinguish a host-confirmed place from email ownership and provider acceptance. Legacy confirmed general-interest records do not imply a booking.

## Basic flow

1. A person saves one request for an upcoming plan or the general interest list.
2. The host selects the plan/list, searches or filters, and reviews the current card.
3. The host records a decision. Confirmation requires a concrete upcoming requested plan and does not manufacture email proof or send a message.
4. To send a letter, the host previews the current content, then explicitly sends it through the configured sender. A changed snapshot requires another review/preview.
5. Provider acceptance records an email attempt. The member's confirmed-place decision remains separate.

No live messages, provider configuration, production migrations, monitoring credentials or pilot activation are part of this continuation.

## Verification

Passed on the final source candidate:

- `pnpm build` (Vinext Worker production build).
- Next route type generation and `tsc --noEmit` after the build.
- Repository lint and a final lint of every changed code/test file.
- `node tests/request-inbox.test.mjs` for scopes, Unicode/case/space search, stage counts, triage order, unrelated-plan attempts and confirmation/letter wording.
- `node tests/invitations.integration.mjs` with both fake Resend and fake Gmail providers: stale/missing snapshots, concurrent host decisions, changed plan details, same-address edits, in-flight edits/withdrawals, confirmation preservation, ownership, deduplication, budgets, overflow disclosure and private host reads.
- `node tests/community.integration.mjs` on disposable local Worker/D1/R2 bindings.
- Browser checks against the final local Worker with synthetic records: host login, selected-plan and general-interest views, filtering, no results, requested-plan switching, review/save, letter preview and disabled sending, guided plan preview without publication, and public-only promotion copy feedback. At 390 px, the inbox had no overflowing controls and its scroll/client widths matched. A screenshot is saved at `outputs/host-inbox-mobile-2026-10-22.jpg` (ignored local artifact).
- Live read-only navigation to the production invitation form. No production participant record was created or changed.

The previous commit `023da47` has a successful Vercel deployment check. Check this continuation's exact commit after pushing. Local UI/integration results do not establish live host sending or clear the existing launch gates.

Host clients must refresh after deployment: `emailRequestStatus` requires `requestVersion`; `sendEmail` requires both `requestVersion` and `letterVersion` from the current preview. Missing or stale snapshots return HTTP 409. These are concurrency/content checks in addition to existing host authorization, not new member credentials.

## Next work

1. Add full host-inbox pagination before treating the 200-record window as complete history.
2. Continue the normalized logistics and per-event confirmation/waitlist design in `PRODUCT_AND_MARKETING_ROADMAP.md`; automatic event capacity is not implemented by this batch.
3. Obtain the missing real-event details. Resume replacement Axiom monitoring only when the owner requests it. Follow `PILOT_OPERATIONS.md` before opening the monitored pilot.
