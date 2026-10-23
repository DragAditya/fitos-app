# Security policy

## Supported versions

Security fixes are applied to the latest `main` branch. Older commits and forks are not supported.

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability. Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include the affected route or component, reproduction steps, impact, and any suggested remediation.

If private reporting is unavailable, contact the maintainer through the GitHub profile linked to this repository. Do not include production secrets, member data, or live access tokens in the report.

This is a personal project, so response times are best-effort. Please allow reasonable time for a fix before public disclosure.

## Deployment responsibilities

FitOS is a self-hosted application. Operators are responsible for:

- Setting a unique, random `QR_TOKEN_SECRET` of at least 32 characters.
- Keeping `FITOS_SEED_DEMO=false` and `FITOS_DEMO_MODE=false` on databases with real data.
- Keeping `FITOS_SHOW_RESET_LINK=false` until a real email provider is connected.
- Enforcing HTTPS and restricting database and host access.
- Using the pooled PostgreSQL endpoint on serverless platforms.
- Taking and testing backups.
- Replacing the in-memory rate limiter with a shared store before running multiple untrusted instances at scale.
- Rotating credentials immediately if a secret is exposed.

Never enable `FITOS_ALLOW_DEV_SECRETS` in a real deployment.

## Security model summary

- Passwords are hashed with scrypt and per-password salts.
- Sessions are random 32-byte tokens; only SHA-256 hashes are stored. Cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Every page and server action re-checks the session and role.
- Queries are scoped by `gym_id`; member-facing reads are additionally scoped by `member_id`.
- QR tokens are HMAC-signed and revocable; scans are validated against the database, member status, and membership.
- CSV exports and receipts are authorization-checked server-side.
- Settings changes are audited.

For the full deployment checklist, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
