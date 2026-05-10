# Security & Scaling Posture — RBLI Result System

This document records the controls already in place against the OWASP Top 10
and how the project is configured to handle high read traffic on
`/result`. It also makes explicit which protections rely on the underlying
Lovable Cloud / Supabase platform rather than application code.

## OWASP Top 10 — current coverage

| Risk                              | Where it is mitigated                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A01 — Broken Access Control       | Postgres Row-Level Security on every table + `is_admin()` security-definer + `enforce_class_lock_on_marks` trigger |
| A02 — Cryptographic Failures      | All traffic over HTTPS (managed by Supabase + the lovable.app domain). Passwords hashed by Supabase Auth (bcrypt). |
| A03 — Injection                   | Supabase JS client uses parameterised queries; **no `rpc("execute_sql")`** anywhere; edge fns use the typed client |
| A04 — Insecure Design             | Strict single-admin model, draft → final deployment workflow, post-deploy tab lock, class-wise marks lock          |
| A05 — Security Misconfiguration   | `verify_jwt = false` only on intentionally public endpoints (`lookup-result`, `delete-user`, `ai-chat`)            |
| A06 — Vulnerable Components       | Pinned versions in `package.json`; `code--dependency_scan` available for audit                                     |
| A07 — Identification / Auth Fail. | Supabase Auth + reCAPTCHA v2 on Admin Login, Admin Register, and Result Lookup; server-verified                    |
| A08 — Software & Data Integrity   | Edge functions deployed by platform; secrets stored in Supabase Vault (never in client code)                       |
| A09 — Logging & Monitoring        | `activity_logs` table for admin actions; `lookup_attempts` table for public lookups                                |
| A10 — Server-Side Request Forgery | No user-controlled URLs are fetched server-side                                                                    |

## Application-level controls in this codebase

- **Input validation** — `src/lib/sanitize.ts` defines max lengths and
  character whitelists for student IDs, emails, names, classes and DOBs.
  The same constraints are re-validated server-side inside
  `supabase/functions/lookup-result/index.ts` before any DB query.
- **Rate limiting** — public result lookup capped at **20/day per IP**
  inside the edge function, using the `lookup_attempts` table.
- **CSRF** — the app is a SPA that talks to Supabase via the JS client
  with bearer JWTs in the `Authorization` header (never cookies), so
  CSRF is not applicable to the API surface.
- **XSS** — React escapes interpolated values by default. We never use
  `dangerouslySetInnerHTML` with user-supplied content.
- **Secrets** — all third-party keys live in Supabase secrets
  (`RECAPTCHA_SECRET_KEY`, `LOVABLE_API_KEY`, etc). The `.env` file ships
  only the publishable anon key, which is safe to expose.
- **File uploads** — only PDFs / signature images via the `pdf-assets`
  bucket, restricted to admins by RLS; bucket is read-public but
  write-admin-only.
- **Role-based access** — handled by the `admin_roles` table and the
  `is_admin()` security-definer function; never stored on the user
  profile to prevent privilege escalation.
- **Post-deployment lock** — `DeploymentOverlay` + `pointer-events-none`
  wrapper makes Students / Subjects / Marks / Ranks / Settings tabs
  read-only once the current academic year is deployed. The DB-level
  `enforce_class_lock_on_marks` trigger remains the source of truth.

## Scaling notes — handling 1M result-view requests

Most heavy reads hit `marks`, `ranks`, `students`, `subjects`, `exams`.
All of these have permissive `SELECT` RLS policies for deployed exams
only, so PostgREST can serve them with prepared statements.

To handle very high concurrent traffic in production:

1. **Upgrade the Lovable Cloud instance** under
   *Cloud → Overview → Advanced settings*. Larger instances raise both
   connection limits and CPU headroom.
2. **CDN / edge caching** — the published `lovable.app` domain already
   sits behind a CDN; static assets are cached automatically.
3. **Connection pooling** — Supabase handles this via PgBouncer; no app
   change required.
4. **DDoS protection** — provided by Supabase + the lovable.app edge
   network. The application enforces an additional 20/day per-IP cap on
   the `lookup-result` edge function.
5. **Backups** — Supabase takes daily managed backups; admins can also
   trigger a JSON snapshot from *Settings → Backup & Export*.

## Known limitations

- We do **not** implement custom WAF rules — that is delegated to the
  platform.
- Admin-side rate limiting is intentionally **not** added in code per
  project policy; the backend does not have rate-limiting primitives
  yet.
- HIBP password check is opt-in via Supabase Auth settings; turn it on
  from *Cloud → Users → Auth Settings* if not already enabled.
