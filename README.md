# API Keys — authentication-as-a-service

Drop one `/verify` call in front of any API and get hosted key issuance, custom scopes, rate-limit tiers, and instant revocation. Next.js (App Router, standalone) + Better Auth + Postgres/Drizzle + Redis, deployed to a self-hosted VPS via Coolify.

## Local development

Requires [Bun](https://bun.sh) and Docker.

```bash
bun install
cp .env.example .env.local        # fill in BETTER_AUTH_SECRET + API_KEY_PEPPER
bun run db:up                     # start Postgres 18 + Redis 7.2 (docker compose)
bun run db:migrate                # apply migrations
bun run dev                       # http://localhost:3000
```

Generate local secrets:

```bash
openssl rand -base64 32           # BETTER_AUTH_SECRET
openssl rand -hex 32              # API_KEY_PEPPER
```

Useful scripts: `db:up` / `db:down` (containers), `db:generate` (create migration SQL from the schema), `db:migrate` (apply), `db:studio` (Drizzle Studio), `auth:generate` (regenerate the Better Auth schema), `typecheck`, `check`/`fix` (lint).

## Deployment

Deploys to a self-hosted VPS via **Coolify**, driven by GitHub Actions.

**Pipeline** (`.github/workflows/ci.yml`): every push to `main` runs the quality gate (lint → typecheck → build), builds the Docker image and pushes it to **GHCR** tagged with the commit SHA (plus `latest`), then triggers a Coolify deploy webhook that pulls the new image and swaps the container. Pull requests run the gate and build the image **without** pushing.

**Migrations run at container startup.** The image bundles a self-contained `migrate.mjs` and the `drizzle/` SQL files; `docker-entrypoint.sh` applies pending migrations before starting the server, then `exec node server.js`. This is safe for a single replica — for multiple replicas, move migrations to a one-off pre-deploy job instead.

### Runtime environment (Coolify env vars — never baked into the image)

| Var | Value |
| --- | --- |
| `DATABASE_URL` | Coolify's **internal** Postgres URL |
| `REDIS_URL` | Coolify's internal Redis URL |
| `BETTER_AUTH_SECRET` | 32+ random bytes (unique to prod) |
| `BETTER_AUTH_URL` | `https://keys.bhavik-vps.com` |
| `API_KEY_PEPPER` | 32+ random bytes (unique to prod, never rotate without a re-hash plan) |
| `APP_URL` | `https://keys.bhavik-vps.com` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |

Postgres and Redis are Coolify resources on the internal network (not publicly exposed). **Ports Exposes = 3000.** Liveness probe: `/api/health`; readiness (DB reachable): `/api/ready`.

### Image & secrets

The GHCR package `ghcr.io/bhavik128/api-keys` is **public**, so Coolify pulls it with no registry credentials (Coolify has no registry-credential UI for private images). This is safe because **all secrets are runtime-only** Coolify env vars — never in image layers, never `NEXT_PUBLIC_*`, never build args.

### Required GitHub Actions secrets

| Secret | Where it comes from |
| --- | --- |
| `COOLIFY_WEBHOOK` | Coolify → the app's Webhooks page → Deploy Webhook URL |
| `COOLIFY_TOKEN` | Coolify → Keys & Tokens → API token with Deploy permission |

### Rollback

Every build is tagged `:sha-<short>`. To roll back, point the Coolify app's image tag at a previous `ghcr.io/bhavik128/api-keys:sha-xxxxxxx` and redeploy.

### Run the production image locally

```bash
docker build -t api-keys:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=... -e REDIS_URL=... -e BETTER_AUTH_SECRET=... \
  -e BETTER_AUTH_URL=http://localhost:3000 -e API_KEY_PEPPER=... \
  api-keys:local
```
