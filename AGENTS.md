# Momo project guidance

Read `CODEX_HANDOFF.md` before implementing changes. It contains product decisions, completed work and launch blockers. Continue the existing project.

- Keep the playful crayon/scrapbook brand and both food editions. Avoid personality labels, pressure, fake events/users and unsupported safety claims.
- Use the existing React/Vinext/Cloudflare architecture and pnpm lockfile. Run relevant TypeScript/build/integration checks after functional changes.
- Use `node tests/community.integration.mjs` after a build for disposable local Worker/D1 checks. Tests must not contact real WhatsApp recipients.
- Keep secrets and production participant data out of Git. `ADMIN_EMAILS` is a server-side allowlist. Never trust browser-provided roles or untrusted identity headers.
- Preserve applied Drizzle migrations and the Site project ID in `.openai/hosting.json`. Keep the current Site audience unless the user requests a change.
- WhatsApp readiness flags are gates, not implementations. Do not enable sending until the sender/template, public callback and phone verification are genuinely ready.
- Refer to the two film briefs as briefs, not finished movies. User-supplied reference-image rights remain unverified.
- GitHub and Sites source have separate ancestry; reconcile carefully. GitHub pushes currently do not deploy the Site.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
