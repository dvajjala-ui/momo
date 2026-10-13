# Device-seat Turnstile setup

This source candidate verifies a Cloudflare Turnstile token when a browser opens a **new** device seat. Verified seats are not challenged again. The verification step is shared by the normal Join button, one-tap wish join, Sidekicks and the direct Host flow. The server validates the token before setting a session cookie and checks the returned action and exact site hostname. While enabled, it also requires a server-signed proof cookie on every authenticated request, so a browser cannot invent a session token to bypass the challenge.

Turnstile is disabled until the deployment owner configures all four server-side settings:

| Setting | Purpose |
| --- | --- |
| `TURNSTILE_ENABLED=true` | Explicitly enable verification for new seats |
| `TURNSTILE_SITE_KEY` | Public widget key, returned to the browser when verification is needed |
| `TURNSTILE_SECRET_KEY` | Private Siteverify key; never expose it to the browser or Git |
| `MOMO_SEAT_SIGNING_SECRET` | Separate random secret of at least 32 characters for signing device-seat cookies |

Create a widget in the intended Cloudflare account and allow only the exact deployed hostnames that should issue seats. Use a separate widget for a disposable preview. If the enable flag is true but any required setting is missing, new seats return 503 without a cookie. If verification fails, the server returns 403 without a cookie. Seats created before the flag was enabled need to pass the challenge once; their existing device token is then signed, preserving their profile and joins. Rotating `MOMO_SEAT_SIGNING_SECRET` invalidates signed seats and requires a migration plan.

Before enabling this in production:

1. Deploy the reviewed source to a disposable preview with a separate widget and the four settings above. Do not use production participant records.
2. Confirm a new seat receives a challenge, a valid result opens exactly one seat, and invalid, expired and replayed tokens do not set cookies. Confirm a forged or unsigned `momo_sid` cookie cannot reach member APIs, and a pre-existing real seat can complete the challenge without losing its profile.
3. Confirm the widget works from Ghar, one-tap wish join, Sidekicks and direct Host login on desktop and a physical mobile device. Confirm cancel and network errors leave the visitor signed out.
4. Confirm the Turnstile dashboard records server-side Siteverify calls, then enable the flag on the intended production deployment.
5. Add Cloudflare edge rate limits for session, profile, wish, join, upload and host-login routes before a large public share. Turnstile is one abuse control, not a substitute for rate limits or moderation.

The challenge token is single-use and expires after five minutes, according to [Cloudflare's server validation guide](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). The widget uses [explicit rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) and the CSP admits only Cloudflare's challenge script and frame origin. The browser never receives the secret key.
