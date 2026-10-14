# Monitored 100-seat pilot operations

Last updated: 14 October 2026

## Current stage

**Pilot preparation started. Enrollment is not open and no real event is published.**

The application, isolated lifecycle, Vercel API perimeter, private-photo path, recovery drill and 25/50/100-client hosted sample passed for the recorded workload. The pilot cannot truthfully be called monitored while the Axiom token setup remains paused, and no real meetup can be published until the remaining event details are confirmed.

## Go/no-go gate

All boxes must be complete before opening the pilot:

- [x] Production D1 migrations `0000` through `0010`
- [x] D1 gateway and realtime Worker deployed with private credentials
- [x] Combined isolated lifecycle passed
- [x] 25/50/100-client hosted sample passed
- [x] Vercel API perimeter rule enforced and probed
- [x] Private photo conversion/access/replacement/deletion passed in production
- [x] Disposable D1 Time Travel recovery drill passed
- [ ] Replace the paused Axiom token with a dataset-scoped ingest-only token
- [ ] Observe one redacted `security_sink_probe` and one controlled `host_login_failed` event
- [ ] Configure the owner alert rules from `SECURITY_MONITORING_SETUP.md`
- [ ] Confirm date, exact Kitab Ghar address, named host, end time, capacity, full cost, moderation contact and emergency/exit plan
- [ ] Confirm venue agreement, accessibility, cancellation/photo policy and organizer/privacy contact
- [ ] Complete the physical mobile and screen-reader checklist or explicitly keep the audience closed while issues are fixed

## Opening sequence

1. Record the exact production SHA, deployment URL and operator on duty.
2. Confirm Axiom ingestion and alerts using redacted test events only.
3. Publish one real plan with truthful details and a capacity no greater than 100 active seats.
4. Open enrollment gradually. Check the first 10 seats, then 25, 50 and 100 rather than advertising all capacity at once.
5. Keep Gmail and WhatsApp sending disabled unless their independent provider gates pass.
6. Use the host queue instead of inventing scarcity or participant counts.

## Live watch

During each opening stage, record:

- application 4xx/5xx changes and Vercel Firewall mitigations;
- `host_login_failed`, `host_login_rate_limited`, `admin_access_denied` and sampled cross-origin events;
- D1 query failures, rows read/written and quota pressure;
- Durable Object exceptions, CPU/memory limits, reconnects and abnormal socket closes;
- photo upload/processing failures and unexpected retained R2 objects;
- participant reports, moderation response time and any safety escalation.

Pause new seats if authenticated APIs repeatedly fail, messages are lost/duplicated, private media becomes public, host authorization is bypassed, D1/Worker limits interrupt normal use, or the operator cannot respond to reports. Preserve redacted evidence, record a D1 bookmark before destructive recovery and follow `D1_RECOVERY_RUNBOOK.md`.

## End-of-day check

- Reconcile active, queued and suspended seat counts with D1.
- Review security alerts and provider errors without exporting participant content.
- Confirm deleted profiles/photos are absent from active storage.
- Review reports and unresolved host notes.
- Record whether the next opening stage is go, hold or rollback.

## Current hold reason

The owner previously paused Axiom replacement-token setup. Resume that explicit credential step and provide the remaining real-event details before changing this document from **preparation** to **open monitored pilot**.
