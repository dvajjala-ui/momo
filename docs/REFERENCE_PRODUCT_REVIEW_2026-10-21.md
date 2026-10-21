# Reference product review and next improvements

Reviewed: 21 October 2026. This compares Momo source with official public product material, not an authenticated walkthrough of competitors. Source implementation, local verification and deployed behavior are separate evidence levels.

## What the references do well

- Timeleft offers optional in-app prompts around the shared meal and lets people decide afterwards whether to stay in touch. Momo can make the first conversation easier while retaining its existing mutual, attendance-gated private notes. [Timeleft's dinner flow](https://timeleft.com/blog/dinner-with-strangers/)
- Meetup separates date, duration, description, venue directions, hosts and attendee limits in its event setup. Momo currently keeps several of these in free-text descriptions, which leaves more work to the host and participant. [Meetup event setup](https://help.meetup.com/hc/en-us/articles/39790436736525-Creating-an-event)

## Gaps, decisions and implementation order

| Priority | Momo gap | Action and current stage |
| --- | --- | --- |
| Now | Starting a group conversation relies on a blank message box | Added a collapsed collection of 12 original prompts across food, play and the city. Profile-less seats may read them. Complete profiles can put one into an empty draft, then edit and explicitly send. Prompt selection makes no API request and preserves an existing typed draft. |
| Now | Published venue text has no map action or calendar export | Added a Google Maps search link and a downloadable start-time reminder on the selected plan. The calendar contains public details, a tentative status and a 15-minute display reminder. It does not book a seat or invent an end time. Downloaded files are snapshots, so the UI asks people to check the current plan before travel. |
| Now | The group composer used one draft across all rooms | Drafts are now scoped to the selected room in page memory. Switching rooms shows that room's draft; a successful send clears the submitted room. A signed-out member refresh clears all drafts. No browser storage or draft upload is added. Sending is disabled while the table loads or another action is running. |
| Before opening the pilot | The real event and persistent monitoring gates remain open | Confirm the date, exact address, host, end time, capacity, cost and operational contacts. Resume the paused Axiom replacement-token and alert setup only when the owner requests it. Use `PILOT_OPERATIONS.md` for the go/no-go checks. |
| Guided composer delivered; normalized model next | Host name, end time, meetup capacity, meeting point and accessibility are mostly free text | The guided composer now collects and validates these planning inputs and previews a readable description in the existing event record. Normalized event fields, end-time calendar export and automatic per-event capacity remain separate work. Do not populate real event details with guesses. |
| After a real pilot | Practical needs are not captured as structured host inputs | Add optional language, diet/access needs and spend range only once the host can use them. Explain who sees each field and keep them out of chat/public profiles. |
| After a real pilot | Existing blocks close private contact, but there is no separate host grouping exclusion or post-event feedback flow | Add attendance-backed private feedback and a host-only exclusion preference, with withdrawal/deletion coverage. A chat block must not be advertised as a promise about future physical seating. |
| Later | Device seats do not provide cross-device account recovery | Design contact-backed recovery with explicit ownership proof, shared-device handling and session revocation before offering continuity claims. |

## Momo choices to preserve

The follow-up [product and marketing plan](PRODUCT_AND_MARKETING_ROADMAP.md) adds the guided host composer, public promotion drafts and an ordered launch sequence. Promotion drafts use a selected future published plan and create no external posts or messages.

- Keep one-tap interest separate from social participation and host-confirmed attendance.
- Keep age/gender self-provided and trust marks tied to verified contact or recorded attendance.
- Keep the three-page public flow, both food editions and the scrapbook visual language. New conversation tools stay in a disclosure; arrival actions appear on the selected plan.
- Keep the real 100-seat cap and current sending gates. No fabricated demand, personalized matching score or identity-verification claim is introduced by this continuation.
- Promote one real event per campaign, with the public plan link, full cost and rights-cleared media. The existing brand/media and pilot documents still govern promotion.

## Verification and limits

- Calendar tests cover UTC conversion, started/invalid dates, escaped text, Unicode line folding, calendar-property injection, public-only links and encoded map search.
- The disposable community suite checks calendar download headers, anonymous access without seat creation, missing/started plans and exclusion of URL tokens. Existing membership, profile and chat rules remain covered there.
- Passed on the final local source: Worker build, generated Next route types, TypeScript, repository lint, calendar and plan-discovery unit tests, and the full disposable community integration suite.
- Browser visual/click-through testing and actual import into calendar applications remain unverified while local browser access is disabled. Do not call these checks complete based on file-format tests alone.

Implementation references: [iCalendar specification](https://www.rfc-editor.org/rfc/rfc5545.html), [Google Maps search URLs](https://developers.google.com/maps/documentation/urls/get-started).
