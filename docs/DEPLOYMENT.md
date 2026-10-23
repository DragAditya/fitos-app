# Deploying FitOS

FitOS supports two deployment shapes:

1. **Vercel + managed PostgreSQL (Neon)** — the recommended path for personal use. Serverless, no disk, no Supabase.
2. **Self-hosted Node process + PGlite** — one instance, one persistent disk.

The application code is identical. The only switch is the `DATABASE_URL` environment variable: when it is set, FitOS uses the `pg` adapter; when it is absent, it uses PGlite.

---

## 1. Vercel + Neon (recommended)

Vercel Hobby is fine for a **personal, non-commercial** deployment. Vercel functions do not have a persistent writable disk, so PGlite cannot be used there. Neon provides a free managed PostgreSQL tier that works with the app's standard SQL.

### 1.1 Create the database

1. Create a free project at [neon.tech](https://neon.tech).
2. Choose the region closest to your users and your Vercel function region. For India, Singapore is usually the closest Neon region.
3. Copy the **pooled** connection string. It contains `-pooler` in the host and looks like:
   ```
   postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep `sslmode=require`. Neon's free tier scales to zero, so the first query after an idle period may take a second.

You can also provision Neon through the Vercel Marketplace; either way, the app only needs `DATABASE_URL`.

### 1.2 Import the project into Vercel

1. Push the repository to GitHub/GitLab and import it in Vercel.
2. Framework preset: **Next.js**. Build command: `npm run build`. Install command: `npm ci`.
3. Add these environment variables to Production (and Preview if you use previews):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `QR_TOKEN_SECRET` | 32+ random characters |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
   | `FITOS_SEED_DEMO` | `false` for real personal data; `true` for a demo |
   | `FITOS_DEMO_MODE` | `false` for real data; `true` for a demo |
   | `FITOS_SHOW_RESET_LINK` | `false` |
   | `FITOS_ALLOW_DEV_SECRETS` | `false` |
   | `DATABASE_POOL_MAX` | `3` (optional) |
   | `FITOS_AUTO_MIGRATE` | `true` (optional; see 1.3) |

4. Deploy.
5. Open `https://your-app.vercel.app/api/health`. A healthy response includes:
   ```json
   { "ok": true, "database": "postgres", "counts": { "profiles": 0, "gyms": 0 } }
   ```
   The counts are `0` on a clean database with demo seeding disabled.
6. Create the owner account at `/register`.

`NEXT_PUBLIC_APP_URL` is compiled into the client bundle. If you change the production domain later, update it and redeploy so invite links use the new host.

### 1.3 First boot and schema creation

On the first request with an empty managed database, FitOS runs:

1. `BEGIN`
2. `pg_advisory_xact_lock(20261021)` — serializes concurrent cold starts
3. The idempotent schema from `src/server/db/schema.ts` (mirrored in `db/migrations/0001_init.sql`)
4. The demo seed, **only** when `profiles` is empty and `FITOS_SEED_DEMO` is not `false`
5. `COMMIT`

If the seed is enabled, the first request can take a few seconds while the demo history is inserted. Subsequent requests are normal.

To manage DDL yourself:

1. Apply the SQL to the database, for example:
   ```bash
   psql "$DATABASE_URL" -f db/migrations/0001_init.sql
   ```
2. Set `FITOS_AUTO_MIGRATE=false`.
3. Deploy or restart.

With `FITOS_AUTO_MIGRATE=false`, FitOS will not create tables or seed. If the schema is missing, `/api/health` returns `503`.

> `FITOS_AUTO_MIGRATE` only handles the initial schema. Future schema changes should be added as new files in `db/migrations/` and applied before deploying the code that needs them.

### 1.4 Demo data vs real data

- **Demo:** `FITOS_SEED_DEMO=true`, `FITOS_DEMO_MODE=true`. The sign-in page shows one-click demo buttons and the public demo credentials.
- **Real personal use:** `FITOS_SEED_DEMO=false`, `FITOS_DEMO_MODE=false`. Start empty and register your own owner account.

The demo credentials (`owner@fitos.app` / `member@fitos.app`, password `FitOS2026!`) are public. Never leave demo seeding enabled on a database that holds real member data. If you already seeded a database, create a fresh Neon branch/database (or drop the schema) and redeploy with `FITOS_SEED_DEMO=false`.

### 1.5 Backups, pooling, and TLS

- **Backups:** use Neon's built-in point-in-time restore or branches. There is no local data directory to back up in this topology.
- **Pooling:** use the Neon pooled endpoint. `DATABASE_POOL_MAX` defaults to `3` per serverless instance; keep it small.
- **TLS:** the app enables TLS automatically for non-local database hosts. Set `DATABASE_SSL=false` for a remote server without TLS, and `DATABASE_SSL_REJECT_UNAUTHORIZED=true` if you want certificate verification.
- **Region:** for the lowest latency, keep the Vercel function region and the Neon region close. If your Vercel plan lets you choose a function region, pick the one nearest the database.

### 1.6 Vercel-specific limitations

- **Hobby is non-commercial.** This matches personal use. Commercial use requires a paid Vercel plan.
- **Rate limits are in-memory.** Each serverless instance keeps its own counters; they reset on cold starts and are not shared. This is acceptable for a small personal deployment but is not a distributed rate limiter.
- **No background jobs.** Expiry and payment reminders are triggered by the owner, not cron.
- **No email provider.** Password reset and invite links are created but not emailed; copy them from the UI. Keep `FITOS_SHOW_RESET_LINK=false` in production.
- **No payment gateway.** Payments are recorded manually and labelled as such.
- **QR camera requires HTTPS.** Vercel provides HTTPS automatically.
- **Function duration.** The first request after a cold start, especially with a scale-to-zero Neon database and demo seeding, is the slowest. If you see a timeout on the very first request, request `/api/health` once to warm it, or pre-create the schema and disable auto-migration.

---

## 2. Self-hosted PGlite (single instance)

### 2.1 Topology

```
Internet ── TLS ── reverse proxy (Caddy / Nginx / platform edge)
                          │
                          ▼
                 FitOS Node process (next start)
                          │
                          ▼
                 FITOS_DATA_DIR (persistent disk)
```

- Run **exactly one** FitOS process per data directory. PGlite is embedded, not a client/server database.
- Use a local, persistent block volume. Do not place it on NFS, SMB, or an object-store mount.
- The process needs write access to the volume and to `.next` for build output.
- Terminate TLS at the proxy or platform edge.

### 2.2 Requirements

- Node.js **20.9+** (22 LTS recommended)
- npm 10+
- A persistent volume with room for the database, WAL, and backups
- A 32+ character random `QR_TOKEN_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 2.3 Build and start

```bash
git clone <repository> fitos
cd fitos
npm ci
cp .env.example .env.production
# edit .env.production
npm run build
npm start
```

Use a process manager (systemd, PM2, or your platform's runner). Example systemd unit:

```ini
[Unit]
Description=FitOS
After=network.target

[Service]
Type=simple
User=fitos
WorkingDirectory=/srv/fitos
EnvironmentFile=/srv/fitos/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

Production environment for this topology:

```dotenv
NODE_ENV=production
FITOS_DATA_DIR=/var/lib/fitos/data
QR_TOKEN_SECRET=<64-char random value>
NEXT_PUBLIC_APP_URL=https://gym.example.com
FITOS_SEED_DEMO=false
FITOS_DEMO_MODE=false
FITOS_SHOW_RESET_LINK=false
FITOS_ALLOW_DEV_SECRETS=false
```

Do not set `DATABASE_URL` in this topology.

### 2.4 Persistent data and backups

The database lives under `FITOS_DATA_DIR` (default `.data/fitos`). Back it up as a directory:

1. Stop the FitOS process (or take a filesystem snapshot of the volume).
2. Copy the entire `FITOS_DATA_DIR`.
3. Restart the process.
4. Verify `GET /api/health` and sign in.

To restore, stop FitOS, replace the directory with the backup, start FitOS, and check `/api/health`. Never copy a live data directory between two running instances.

### 2.5 Reverse proxy notes

Forward `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`. The app uses them to build invite links and falls back to `NEXT_PUBLIC_APP_URL`.

Example Caddyfile:

```
gym.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

Example Nginx location:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

## 3. Security checklist

- [ ] `QR_TOKEN_SECRET` is 32+ random characters and unique to this deployment.
- [ ] `FITOS_SEED_DEMO=false` and `FITOS_DEMO_MODE=false` for real data.
- [ ] `FITOS_SHOW_RESET_LINK=false` until email delivery exists.
- [ ] HTTPS is enforced.
- [ ] `DATABASE_URL` uses TLS and a pooled endpoint on serverless.
- [ ] The database is backed up and restore has been tested.
- [ ] Logs are collected and `/api/health` is monitored.
- [ ] Session cookies remain HttpOnly and SameSite=Lax; do not add wildcard CORS.
- [ ] Access to the host/volume or Neon project is restricted to the service account.

### Authentication notes

- Passwords are hashed with scrypt and per-password salts.
- Sessions are 32-byte random tokens; only SHA-256 hashes are stored. Cookies are HttpOnly, SameSite=Lax, and `Secure` in production.
- Login, registration, password reset, invite acceptance, and QR scans are rate-limited in memory. This is sufficient for a single instance; serverless instances do not share counters.
- Ownership is only granted by the trusted owner-registration action. Invited users and demo users become members.

---

## 4. Upgrades and rollbacks

### Vercel + managed PostgreSQL

1. Back up the Neon database (branch or PITR).
2. Apply new migrations before deploying code that depends on them.
3. Deploy. Vercel keeps the previous deployment available for rollback.
4. Verify `/api/health`, sign in, and open one receipt and one report.
5. Roll back the code only if its schema is compatible with the data. Prefer additive migrations.

### Self-hosted PGlite

1. Take a volume snapshot or stop-and-copy backup.
2. Deploy the new build.
3. Run any new migrations.
4. Verify `/api/health`, sign in, and open one receipt and one report.
5. Roll back only within the schema-compatibility window.

---

## 5. Known operational limitations

- **Two persistence modes.** PGlite is single-node and disk-bound. Managed PostgreSQL is required for serverless or multi-instance deployments.
- **No production email provider.** Reset and invite links are copied manually.
- **No payment gateway.** Payments are recorded manually and labelled as such.
- **No background scheduler.** Expiry/payment reminders are owner-triggered batches.
- **In-memory rate limiting.** Resets on restart and is not shared across instances.
- **No file upload pipeline** for avatars.
- **No staff role, self-purchase, 2FA, or audit-log UI.**
- **No gym deletion or ownership transfer.**

For product-level limitations, see the README.
