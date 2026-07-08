This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

This app deploys to a self-hosted VPS via **Coolify**, driven by GitHub Actions.

**Pipeline** (`.github/workflows/ci.yml`): every push to `main` runs the quality gate (lint → typecheck → build), builds the Docker image and pushes it to **GHCR** tagged with the commit SHA (plus `latest`), then triggers a Coolify deploy webhook that pulls the new image and swaps the container with zero downtime. Pull requests run the gate and build the image **without** pushing.

### Required GitHub Actions secrets

| Secret | Where it comes from |
| --- | --- |
| `COOLIFY_WEBHOOK` | Coolify → the app's Webhooks page → Deploy Webhook URL |
| `COOLIFY_TOKEN` | Coolify → Keys & Tokens → API token with Deploy permission |

Pushing to GHCR uses the built-in `GITHUB_TOKEN` — no extra secret needed. The image is private, so Coolify pulls it using a GitHub PAT (`read:packages`) configured as a registry credential on the Docker Image resource.

### Rollback

Every build is tagged `:sha-<short>`. To roll back, point the Coolify app's image tag at a previous `ghcr.io/<owner>/api-keys:sha-xxxxxxx` and redeploy.

### Run the production image locally

```bash
docker build -t api-keys:local .
docker run --rm -p 3000:3000 api-keys:local
curl localhost:3000/api/health   # {"status":"ok"}
```
