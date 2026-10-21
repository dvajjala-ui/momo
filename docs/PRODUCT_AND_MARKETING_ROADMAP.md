# Momo product and marketing plan

Updated: 21 October 2026

## The promise

Pick a plan or make a wish. Meet a small gang over food, reading or a game, with the public venue, time and full cost explained before you decide.

Keep the public flow on Home, Adda and Count me in. Make the host notebook easier to operate as the number of requests grows.

## What this batch builds

| Reference pattern | Momo implementation | Verification stage |
| --- | --- | --- |
| Clear host, timing and venue details, as in [Meetup's event setup](https://help.meetup.com/hc/en-us/articles/39790436736525-Creating-an-event) | Guided host composer with finish time, planned group size, named host, meeting point, public contact, access notes and exit/help plan | Local form/helper and API checks; browser checks pending |
| A coherent invitation with the details in one place, as in [Partiful](https://partiful.com/) | Preview before publication; full readable details on the plan page, shorter summaries on Home | Build/types/lint and community regression gates |
| Repeated small activities that can grow into a community, as in [Misfits](https://www.misfits.net.in/) | Launch with one recognizable format and repeat it once real attendance and feedback support it | Marketing plan only; no recurring events or invented attendance |
| One useful link for the selected plan | Host-only promotion drafts for WhatsApp groups, Reddit/local communities and Instagram, generated from public event fields | Local copy/privacy tests; nothing posted or sent |

The composer stores a human-readable description using the existing schema. Its details are validated on the server when a guided payload is submitted. Existing event records, the legacy host API and the free-text editor remain compatible. Planned group size is descriptive: it is not an automatic event RSVP cap or a remaining-seat count. Normalized event fields and per-event capacity enforcement still need a separate implementation.

## Product order from here

1. **Finish the real pilot gate.** Confirm the event details and resume the owner-paused monitoring setup when requested. Follow `PILOT_OPERATIONS.md`; a new host form does not complete these real-world steps.
2. **Normalize event logistics.** Add dedicated fields for host, finish, group size, meeting point and contacts, compatibility for old plans, invitation/calendar coverage and an additive migration plan. Preserve the rule against silently editing plans after delivery or attendance.
3. **Add event-level confirmations and a waiting list.** Keep community membership, wish interest, invitation request and confirmed event attendance distinct. Make capacity changes atomic and show a truthful status to the person.
4. **Collect practical needs after the pilot.** Optional language, spend range, diet/access needs and consent about host visibility. Collect only fields the host can use, with deletion and privacy coverage.
5. **Close the loop after meeting.** Attendance-backed private feedback, a host grouping exclusion preference, and a repeat-plan flow. Explain the scope of chat blocks accurately.
6. **Improve continuity.** Design contact-backed account recovery, session revocation and shared-device handling before promising access across devices.

## Marketing preparation

### Before a campaign

- Complete the existing pilot go/no-go checks and publish one confirmed real plan.
- Open `/host`, select that plan and expand **Prepare a promotion draft**.
- Choose the channel, review the complete copy, check the date/address/cost/contact and copy it.
- Use original or licensed food/venue media. Follow `BRAND_AND_MEDIA_RIGHTS.md` and record permission for identifiable participant photos.
- Ask the relevant community admin or venue for posting permission. Send or post only through the owner's chosen account after review.

No account integration, bulk messages, ads, spend or automated posting is part of this batch.

### One-event launch sequence

| Stage | Action | What to learn |
| --- | --- | --- |
| Preparation | Check the venue, host, full cost, arrival instructions and public plan on a phone | Can a new person explain where to go and what happens next? |
| First announcement | Share the reviewed plan in one relevant Ahmedabad community with permission | Are the questions about the experience or missing information? |
| Venue partnership | Prepare a small venue notice or story with the same plan link | Does the venue reach people interested in this format? |
| Instagram | Share a food/venue visual and the reviewed caption; keep a direct plan link in an appropriate link surface | Do people understand that a request needs host confirmation? |
| Host review | Review requests, confirm places manually and use the actual queue when needed | Can the host manage the planned group without misleading availability? |
| Event day | Follow the host and moderation plan; record actual attendance | Who attended, and which practical details were missing? |
| Afterward | Review reports and consented feedback; prepare a repeat only after checking the outcome | Which format should happen again? |

These are stages, not scheduled dates or automated tasks. Do not run them while the pilot gates are on hold.

### Measure with the tools already present

Keep a small manual campaign log: channel, approved post/link, date, event ID, questions received and requests that explicitly mention that source. Use host records for reviewed requests, confirmations and recorded attendance. Platform-provided aggregate post statistics can supplement this log when available. Momo does not currently attribute every request to a marketing channel, so do not present inferred channel conversions as measured analytics.

Start with one event and one primary format. Use actual attendance and participant feedback to choose the next experiment. Avoid made-up testimonials, urgency, identity assurances or compatibility percentages.

## Remaining verification

Passed locally for this continuation: final Worker build, generated Next route types, TypeScript, repository lint, host-planning tests and the community/invitation suites. The tests use disposable local records and fake providers. Check the exact Vercel commit after pushing. Browser form/preview/copy checks remain pending while local browser access is disabled. No live event or promotion was published for testing.
