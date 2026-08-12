# Deployment — Hostinger VPS (Docker)

This guide walks you through moving the app from Vercel onto your Hostinger VPS.
Total time from a fresh VPS to first HTTPS response: **~15 minutes**.

Prerequisites you already have (external services stay put):

- **Supabase** — Postgres + Auth + Storage
- **Upstash** — Redis for cache + rate limits
- **Resend** — transactional email
- **A domain** — pointed at your VPS IP (see step 3)

The VPS runs:

- Docker Engine + Docker Compose
- Two containers: **app** (Next.js) and **traefik** (HTTPS reverse proxy)
- Let's Encrypt certificates managed by Traefik automatically

---

## 1. Provision the VPS

1. Buy the VPS on Hostinger — the KVM 2 tier (2 vCPU / 8 GB RAM) is comfortable for early traffic.
2. Pick **Ubuntu 24.04 LTS** as the OS.
3. Under Hostinger's control panel, note your **public IPv4**.
4. Add an SSH key so you don't need password auth. Hostinger has a UI for this.

---

## 2. Point the domain

In your DNS provider (usually the registrar):

| Type | Name | Value |
|---|---|---|
| A | `@` | your VPS IPv4 |
| A | `www` | your VPS IPv4 |

TTL 300 for fast propagation. Wait 2–5 minutes then verify:

```bash
dig +short mokshbooking.app
dig +short www.mokshbooking.app
```

Both should return your VPS IP.

---

## 3. Log into the VPS and prep it

SSH in as root:

```bash
ssh root@YOUR_VPS_IP
```

Install Docker + Compose (Ubuntu 24 has both packaged), harden the firewall, create a non-root deploy user:

```bash
# System up to date
apt update && apt upgrade -y

# Docker Engine + Compose plugin
apt install -y docker.io docker-compose-v2 git ufw

# Non-root deploy user (avoid running app deployments as root)
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Firewall — allow SSH + web only
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Enable Docker on boot
systemctl enable --now docker
```

Log out and back in as **deploy** for the rest:

```bash
ssh deploy@YOUR_VPS_IP
```

---

## 4. Clone the repository

```bash
cd ~
git clone https://github.com/YOUR-ORG/voyana.git
cd voyana
```

If the repo is private, either add a deploy key or use a Personal Access Token.

---

## 5. Fill in production environment

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in every value — `DATABASE_URL`, Supabase keys, Upstash keys, Resend key, etc. The template lists them all with comments.

At minimum you MUST set:

- `APP_DOMAIN` — the domain you pointed in step 2
- `LETSENCRYPT_EMAIL` — a real address (Let's Encrypt uses it for cert expiry warnings)
- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (otherwise 2FA / password-reset / invite emails silently fail — see the `IntegrationLog` diagnostic in `/admin/integrations/logs`)

Save (Ctrl-O, Enter, Ctrl-X).

Lock the file down — it contains secrets:

```bash
chmod 600 .env.production
```

---

## 6. First build + start

```bash
docker compose build
docker compose up -d
```

Watch it come up:

```bash
docker compose logs -f
```

You should see:

1. **Traefik** starting on `:80` and `:443`.
2. **app** starting the Next.js server on `:3100` inside the compose network.
3. On your first HTTPS request, Traefik requesting a Let's Encrypt cert (look for lines with `acme`).

Once you see `certificate obtained` for your domain, you're live. Visit `https://mokshbooking.app` in a browser — the landing page should render.

---

## 7. Updating after a code push

From the VPS, in `~/voyana`:

```bash
git pull
docker compose build
docker compose up -d
```

Compose will replace only the containers whose images actually changed. Downtime per deploy: usually under 5 seconds. If you want zero downtime, add a second `app` replica behind Traefik in a follow-up.

---

## 8. Database migrations

When your `prisma/schema.prisma` changes, migrations must run against Supabase Postgres. **You do NOT run them from the VPS by default** — they're a repo-level concern:

```bash
# From your local machine, with .env pointing at production:
npx prisma migrate deploy
```

If you'd rather run them from the VPS (e.g. in a CI job), one option:

```bash
docker compose run --rm --entrypoint "npx prisma migrate deploy" app
```

That one-off container reads the same `.env.production` and applies pending migrations.

---

## 9. Health, logs, monitoring

**Container health**

```bash
docker compose ps
```

Both should be `running (healthy)` after a minute or two.

**App logs (last hour)**

```bash
docker compose logs --since 1h app
```

**Traefik logs (certificate + routing errors)**

```bash
docker compose logs --since 1h traefik
```

**Diagnostic panel inside the app**

Once signed in as a SUPER_ADMIN, `/admin/integrations/logs` shows email delivery failures, webhook errors, and rate-limit incidents. This is where you'd notice, for example, that `RESEND_API_KEY` is missing (the mailer writes `IntegrationLog(status=FAILED, message="SKIPPED — RESEND_API_KEY not set…")` in production).

---

## 10. Backups

Because Postgres, Auth, and Storage all live on Supabase, **you don't need VPS backups for user data**. Supabase Point-in-Time-Recovery covers the DB.

The only VPS-local state that matters is the ACME certificate store — kept at `./letsencrypt/acme.json`. Losing it forces Traefik to re-request certificates and Let's Encrypt has aggressive rate limits (50/week/domain). Snapshot the VPS weekly:

- Hostinger has a one-click snapshot feature in the panel.
- Or copy `./letsencrypt/acme.json` off-box:

```bash
rsync -av deploy@YOUR_VPS_IP:~/voyana/letsencrypt ~/backups/voyana-letsencrypt-$(date +%F)
```

---

## 11. Troubleshooting

**"Traefik: unable to obtain certificate"**
- DNS didn't propagate yet, OR
- Ports 80/443 are blocked by Hostinger's default firewall (double-check the Hostinger panel, not just `ufw`), OR
- `LETSENCRYPT_EMAIL` in `.env.production` is missing.

**"App container restarts constantly"**
- `docker compose logs app` will show the crash reason.
- Most common: `DATABASE_URL` unreachable from the VPS. Check that Supabase's IP allow-list (if you enabled one) includes the VPS IP.

**"2FA / password-reset / invite emails don't arrive"**
- Sign in as SUPER_ADMIN and check `/admin/integrations/logs`.
- If it shows "SKIPPED — RESEND_API_KEY not set" you know to fix `.env.production` and `docker compose up -d`.
- If it shows a real Resend error message (403, unverified sender, etc.) verify your Resend domain and API key.

**"Site loads but images 502"**
- The Supabase Storage host isn't in `next.config.ts` `images.remotePatterns`. Add it and redeploy.

**"Sudden 429 on `/api/leads` or `/api/auth/login`"**
- That's the new rate limiter kicking in. Expected behavior for actual abuse; if you're getting it from your own team, tune `lib/rate-limit.ts` limits or `lib/auth/lockout.ts` thresholds.

---

## 12. Rollback

If a deploy goes bad:

```bash
git reset --hard PREVIOUS_COMMIT_SHA
docker compose build
docker compose up -d
```

Supabase migrations are the exception — those aren't automatically reverted. Keep migrations additive/reversible for this reason.

---

## 13. Uninstall / move away

```bash
docker compose down
docker system prune -a --volumes -f     # nukes images + volumes; ACME certs are in ./letsencrypt (compose-level), safe
```

`docker compose down` stops and removes containers but leaves your `.env.production`, `letsencrypt/`, and repo intact so you can spin back up with `docker compose up -d`.
