# Momo product flow, trust and market position

Last updated: 2026-10-21

## Product promise

Momo helps a small group in Ahmedabad move from “we should do something” to a real, public meetup with the time, place and full cost stated before anyone commits.

The useful marketing sentence is:

> Pick a plan or make a wish. Momo gets a small gang and the real details ready.

This should remain a friendship-first product. Do not use dating language, matching claims that have not been measured, fake activity counts or invented testimonials.

## One canonical participant flow

| Stage | What the person can do | Information required | What Momo may claim |
| --- | --- | --- | --- |
| Explore | Read plans, rules and the wish wall | Nothing | Anonymous visitor |
| Save a seat | Join an existing wish in one tap | Device seat | Interested seat; identity is not verified |
| Participate | Create a wish or send a group message | Nickname, age, self-described gender, rules acceptance | Complete social profile; age and gender remain self-provided |
| Request an invitation | Save a request for a hosted plan or the interest list | Email, city, consent; inbox confirmation before sending | Contact checked only after inbox confirmation |
| Attend | Join the published event | Host records attendance after the meetup starts | Met at Momo |
| Continue | Opt into private notes with someone from the same event | Shared confirmed attendance and both people opt in | Mutual post-event contact only |

The apparent two-path problem came from mixing a reversible one-tap expression of interest with participation. Joining stays fast. Creating, speaking and real invitations require progressively stronger information. The interface must say which stage the person is entering.

## Trust model

### Signals shown in the product

- **Contact checked:** the person confirmed control of an email address or phone number.
- **Met at Momo:** a host recorded the person at a published Momo meetup.
- **Self-provided:** nickname, age and gender were entered by the person and are not presented as government-ID facts.

### Why Momo does not “verify gender”

A face does not establish gender. Aadhaar collection would add highly sensitive identity data without making a social table meaningfully safer. Momo should verify actions it can prove: contact control, rule acceptance, host-reviewed invitation status, attendance, blocks and reports. If legal age assurance becomes necessary later, use a specialist age-check provider and retain only the pass/fail result; do not store ID images.

## Patterns taken from Timeleft

Timeleft’s official public material consistently uses a few strong product patterns:

- a short, predictable path from profile to small-group event;
- groups of roughly four to six people in public venues;
- practical matching inputs such as age band, language, dietary needs, location and budget;
- venue and logistics handled by the organizer;
- group chat around the event, with private contact limited until after meeting;
- reporting and preventing an unwanted future rematch;
- clear separation between the platform fee and food/drink cost.

Sources reviewed:

- [How Timeleft works](https://www.timeleft.com/blog/how-does-timeleft-work/)
- [How Timeleft matches a group](https://help.timeleft.com/hc/en-150/articles/28530361837212-How-Does-Timeleft-Match-Me-With-a-Group)
- [Timeleft safety guidelines](https://timeleft.com/safety-guidelines/)
- [Timeleft community guidelines](https://www.timeleft.com/community-guidelines/)

Momo should adopt the clarity and structural safety, not copy Timeleft’s scale claims, subscription model, hidden-venue mechanic or unverified safety statistics.

## Marketing structure

### Homepage

1. State the problem: plans die in group chats.
2. State the outcome: a small gang plus confirmed public details.
3. Show the four-step flow.
4. Show only live counts from D1.
5. Explain the trust marks in plain language.
6. Use one primary action: **Count me in** for hosted plans; keep **Make a wish** secondary.

### Launch channels

- Ahmedabad Reddit and neighbourhood communities: post a specific public plan, capacity, cost and end time; link directly to that plan rather than the generic homepage.
- Instagram: short clips of the venue, table setup or food illustration; publish identifiable attendees only with permission recorded for that image and channel.
- WhatsApp groups: one concise invitation with the public venue area, start/end time, capacity and full cost. Do not add people to broadcast lists without consent.
- Venue partnership: ask the venue to share the plan after the date, table size and booking are confirmed.

Every campaign should use a unique event link so Momo can compare invite requests and attended seats without adding third-party trackers.

## Implementation status

Implemented on 2026-10-21:

- the homepage now explains Explore → Save a seat → Introduce yourself → Meet in public;
- the invitation form explains Save → Check → Review;
- creating a wish and sending a message use the same complete-profile rule on the server;
- chat labels age and gender as self-provided;
- chat can show **contact checked** and **met at Momo** using existing verified-contact and host-attendance records;
- the existing one-tap join remains available and is explicitly described as an unverified expression of interest.

The invitation continuation also removes the separate device-seat button from Count me in: the explicit request submission opens the seat and saves the request. No confirmation email is sent automatically. Returning visitors see the saved receipt, confirmation status and next action before an optional edit form. Opening a link to another plan warns that submitting replaces the one existing request. A plain visit to `/join` retains the requested plan. Full published plan details appear before submission; missing or started plans close the form, and the API also rejects stale plan requests without changing saved data.

## Next product iteration

After the first monitored pilot, add only the inputs that the host can act on:

1. event language;
2. dietary needs and allergies warning;
3. accessibility needs;
4. comfortable spend range;
5. social energy preference (quiet, balanced or lively);
6. post-event feedback and “do not place me with this person again”.

Do not build a complex personality score until Momo has enough real attendance and feedback to evaluate whether it improves groups. For the first pilot, host-assisted grouping with explicit practical preferences is more honest.
