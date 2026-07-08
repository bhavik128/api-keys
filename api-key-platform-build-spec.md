# API Key Platform — Build Specification

**Audience:** Claude Code (implementation agent) + Bhavik (owner/reviewer).
**Goal:** A self-hostable **API-key-authentication-as-a-service platform**. Customers register their own protected services, define their own scopes and rate-limit tiers, mint keys, and gate any request with a single `/verify` call. A built-in dashboard, playground, and two example integrations prove it works end to end.
**Deployment target:** Coolify on a Hostinger VPS (already hardened, Postgres + Redis available as Coolify resources).
**Timeline:** 1–2 days of build. Read §2 (scope reality) and §21 (build plan) before writing any code — they define what to build first and where the safe stopping points are.

---

## 0. How Claude Code should use this document

1. **Read §21 (build plan) first.** It defines the order. Build in that order. Each phase has a "demoable checkpoint" — reach it before moving on.
2. **Verify fast-moving library APIs against live docs before scaffolding.** oRPC and Better Auth change quickly and this spec was written at design-time. Before wiring them, check the current setup docs for `@orpc/*` and `better-auth`, pin exact versions in `package.json`, and follow their current server/client init. The *contracts* in this doc are stable; the *boilerplate* may differ — trust the live docs for boilerplate.
3. **Never invent APIs.** If a library's current shape differs from a snippet here, follow the library. Flag the deviation in a code comment.
4. **The crypto in §8 and §9 is exact — do not "improve" it.** Constant-time compare, HMAC with pepper, indexed lookup: implement as written.
5. **Ask Bhavik** (via a note in the PR / commit) whenever a §25 open decision is hit and unresolved. Do not silently assume.
6. **Conventions:** TypeScript strict mode. Zod for every external input. All secrets from env, never hardcoded, never in the image. Prose commit messages, one logical change each.

---

## 1. Product framing (what we are actually selling)

**The product is the key layer, not any demo app.** A customer runs their own API; our platform answers one question for them per request: *"a request arrived with this key — is it valid, what is it allowed to do, and is it within its rate limit?"*

The integration surface a customer touches is essentially one endpoint:

```
POST /api/v1/verify
{ "key": "sk_live_...", "scope": "invoices:write" }
→ 200 { valid, keyId, ownerId, serviceId, scopes, rateLimit{ limit, remaining, reset } }
→ 401 { valid:false, reason:"revoked" | "expired" | "not_found" | "bad_secret" }
→ 403 { valid:false, reason:"insufficient_scope" }
→ 429 { valid:false, reason:"rate_limited", retryAfter }
```

**All-in model (this is what makes it sellable):**
- A **Service** = a customer-defined protected API (e.g. "Invoices API"). Customers create their own.
- A **Scope** = a customer-defined permission on a service (e.g. `invoices:write`). Customers define their own per service.
- A **Tier** = a customer-defined rate-limit plan (e.g. Free = 60/min, Pro = 1000/min). Customers define their own.
- An **API Key** belongs to a service, carries a subset of that service's scopes, and is assigned a tier (which sets its rate limit).

**The demo services (URL shortener + a mock Invoices API) are example integrations**, not the product. They are registered *as services in the platform* and use the same verify logic a real customer would. They exist to prove the platform is generic: two unrelated APIs, different scopes, one key layer.

**One-line pitch:** *"Drop one `/verify` call in front of any API and get hosted key issuance, custom scopes, rate-limit tiers, and instant revocation — bring your own service."*

---

## 2. Scope reality for 1–2 days (read this)

The **schema and design are all-in**. The **build is a vertical slice**. Three tiers of done:

- **BUILT** (must ship, the demo depends on it): auth, full schema, key gen/verify, the `/verify` endpoint, dashboard create/list/revoke keys, one seeded service (URL shortener) working end to end, per-key rate limiting by tier, Dockerfile + compose, Coolify deploy, a minimal CI pipeline, seed data, tests on the crypto.
- **SCAFFOLDED** (basic forms, working but unpolished): customer-defined **services**, **scopes**, and **tiers** management UI; the second demo service (Invoices); the playground; audit log view.
- **NEXT** (documented, not built — talk about in the interview): service root keys for authenticating verify callers, organizations/teams, usage analytics charts, key rotation, webhooks, billing.

If time runs out after BUILT, you still have a complete, honest end-to-end product slice with a full design behind it. That is the win condition. Do not sacrifice a working BUILT slice to half-finish a SCAFFOLDED feature.

---

## 3. Architecture

**Three runtime components:** one Next.js app (contains dashboard, oRPC, Better Auth, REST API, demo services), one Postgres, one Redis.

**Two planes:**
- **Control plane** — humans managing keys/services/scopes/tiers. Next.js dashboard → oRPC → Postgres. Auth: Better Auth **session cookie**.
- **Data plane** — machines using keys. REST `/api/v1/*` → verify → Redis + Postgres. Auth: **API key (bearer)**.

**The `/verify` relationship:** The bundled demo services call a shared internal `verifyKey()` function (no pointless HTTP round-trip to ourselves). An *external* customer instead calls the public `POST /api/v1/verify` HTTP endpoint, which wraps the same `verifyKey()`. The playground calls the HTTP `/verify` directly so the product surface is visible on stage.

---

## 4. Tech stack & versions

| Layer | Choice | Notes |
|-------|--------|-------|
| Package manager | **Bun** | `bun install`, `bun run`. Fast. |
| Runtime (app) | **Node** (Next.js standalone) | Next.js isn't officially supported on Bun runtime — Node runs the server. |
| Framework | Next.js (App Router), `output: 'standalone'` | One app, small image. |
| Control API | oRPC | Typed dashboard↔server. Verify current setup docs. |
| Data API | Next.js Route Handlers (REST) | `/api/v1/*`. |
| DB | Postgres 16 | Coolify resource in prod. |
| ORM | Drizzle + drizzle-kit | Migrations via drizzle-kit. |
| Human auth | Better Auth (email+password) | Passkeys = easy add later (§25). |
| Key auth | Hand-rolled (§8–9) | The point of the project. |
| Rate limit | Redis 7 | Per-key by tier. |
| UI | shadcn/ui + Tailwind | |
| Validation | Zod | Shared schemas. |
| Logging | pino | Structured, requestId. |
| Container | Docker multi-stage (bun build stage → node runner) | |
| CI/CD | GitHub Actions | Gate → build → deploy webhook. |

**Pin exact versions after verifying current releases.** Do not assume the versions in your training data are current.

---

## 5. Repository structure

```
apikey-platform/
├─ src/
│  ├─ app/
│  │  ├─ (dashboard)/                 # authed dashboard pages (control plane)
│  │  │  ├─ keys/                      # list/create/revoke keys
│  │  │  ├─ services/                  # customer-defined services
│  │  │  ├─ scopes/                    # scopes per service
│  │  │  ├─ tiers/                     # rate-limit tiers
│  │  │  ├─ playground/                # live /verify + demo calls
│  │  │  └─ audit/                     # audit log view
│  │  ├─ (auth)/                       # sign-in / sign-up pages
│  │  ├─ api/
│  │  │  ├─ auth/[...all]/route.ts     # Better Auth handler
│  │  │  ├─ rpc/[[...rest]]/route.ts   # oRPC handler (control plane)
│  │  │  └─ v1/                        # DATA PLANE (public REST)
│  │  │     ├─ verify/route.ts         # THE product endpoint
│  │  │     ├─ links/route.ts          # demo service 1: URL shortener
│  │  │     ├─ invoices/route.ts       # demo service 2: mock invoices
│  │  │     └─ me/route.ts             # key introspection
│  │  └─ s/[slug]/route.ts             # public short-link redirect
│  ├─ server/
│  │  ├─ auth.ts                       # Better Auth config
│  │  ├─ rpc/
│  │  │  ├─ router.ts                  # oRPC root router
│  │  │  ├─ context.ts                 # session context
│  │  │  └─ procedures/                # keys, services, scopes, tiers, audit
│  │  ├─ keys/
│  │  │  ├─ generate.ts                # key generation (§8)
│  │  │  ├─ verify.ts                  # verifyKey() (§9) — shared core
│  │  │  └─ format.ts                  # parse/format/regex
│  │  ├─ ratelimit/
│  │  │  └─ limiter.ts                 # Redis limiter (§13)
│  │  ├─ audit/log.ts                  # audit writer
│  │  └─ demo/                         # demo service business logic
│  ├─ db/
│  │  ├─ schema.ts                     # Drizzle schema (§7)
│  │  ├─ index.ts                      # db client
│  │  └─ seed.ts                       # seed data (§22)
│  ├─ lib/                             # shared utils, zod schemas, logger
│  └─ components/                      # shadcn + app components
├─ drizzle/                            # generated migrations
├─ drizzle.config.ts
├─ Dockerfile
├─ docker-compose.yml                  # local: app + postgres + redis
├─ .env.example                        # every var, documented (§6)
├─ .github/workflows/ci.yml
├─ next.config.ts                      # output: 'standalone'
└─ package.json
```

---

## 6. Environment variables (every one)

Put all in `.env.example` with comments. Never commit real values.

```
# --- Database ---
DATABASE_URL=postgres://user:pass@localhost:5432/apikeys

# --- Redis ---
REDIS_URL=redis://localhost:6379

# --- Better Auth ---
BETTER_AUTH_SECRET=            # 32+ random bytes; openssl rand -hex 32
BETTER_AUTH_URL=http://localhost:3000   # prod: https://keys.<domain>

# --- API key crypto ---
API_KEY_PEPPER=                # 32+ random bytes; HMAC pepper for key hashing. NEVER rotate without a re-hash plan.

# --- App ---
NODE_ENV=development
APP_URL=http://localhost:3000  # used to build shortUrl etc. prod: https://keys.<domain>
LOG_LEVEL=info
```

In Coolify these live as env vars on the app resource, injected at runtime. `DATABASE_URL`/`REDIS_URL` use the internal Coolify service hostnames.

---

## 7. Data model (Drizzle — all-in)

Better Auth owns `user`, `session`, `account`, `verification` — generate these with Better Auth's Drizzle schema generator; **do not hand-write them**. Everything below is our domain schema. All FKs reference `user.id` (text) as owner. `ownerId` is deliberately a user id now; when organizations are added (§25/NEXT), it becomes an org id with minimal migration.

```ts
import { pgTable, uuid, text, integer, bigint, timestamp, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema'; // Better Auth generated

// A customer-defined protected API.
export const service = pgTable('service', {
  id:          uuid('id').primaryKey().defaultRandom(),
  ownerId:     text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  slug:        text('slug').notNull(),           // url-safe, unique per owner
  description: text('description'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx:  index('service_owner_idx').on(t.ownerId),
  slugUniq:  uniqueIndex('service_owner_slug_idx').on(t.ownerId, t.slug),
}));

// A customer-defined permission on a service, e.g. "invoices:write".
export const scope = pgTable('scope', {
  id:          uuid('id').primaryKey().defaultRandom(),
  serviceId:   uuid('service_id').notNull().references(() => service.id, { onDelete: 'cascade' }),
  value:       text('value').notNull(),          // e.g. "invoices:write"
  description: text('description'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  valueUniq: uniqueIndex('scope_service_value_idx').on(t.serviceId, t.value),
}));

// A customer-defined rate-limit plan, owner-scoped so it's reusable across services.
export const tier = pgTable('tier', {
  id:              uuid('id').primaryKey().defaultRandom(),
  ownerId:         text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name:            text('name').notNull(),        // e.g. "Free", "Pro"
  rateLimitPerMin: integer('rate_limit_per_min').notNull(),  // requests per 60s window
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index('tier_owner_idx').on(t.ownerId),
}));

export const apiKey = pgTable('api_key', {
  id:            uuid('id').primaryKey().defaultRandom(),
  ownerId:       text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  serviceId:     uuid('service_id').notNull().references(() => service.id, { onDelete: 'cascade' }),
  tierId:        uuid('tier_id').notNull().references(() => tier.id, { onDelete: 'restrict' }),
  keyType:       text('key_type', { enum: ['standard','root'] }).notNull().default('standard'), // root = future verify-caller auth
  name:          text('name').notNull(),
  environment:   text('environment', { enum: ['live','test'] }).notNull().default('test'),

  // lookup + verification (see §8–9)
  publicId:      text('public_id').notNull().unique(),  // plaintext, indexed lookup handle
  keyHash:       text('key_hash').notNull(),            // HMAC-SHA256(secret) hex — never the raw key
  displayPrefix: text('display_prefix').notNull(),      // "sk_live"
  last4:         text('last4').notNull(),

  // authorization — scopes denormalized as text[] for O(1) verify reads;
  // scope table is source of truth, validated at assignment time.
  scopes:        text('scopes').array().notNull().default(sql`ARRAY[]::text[]`),

  // lifecycle
  status:      text('status', { enum: ['active','revoked'] }).notNull().default('active'),
  expiresAt:   timestamp('expires_at',  { withTimezone: true }),
  lastUsedAt:  timestamp('last_used_at', { withTimezone: true }),
  usageCount:  bigint('usage_count', { mode: 'number' }).notNull().default(0),
  createdAt:   timestamp('created_at',  { withTimezone: true }).notNull().defaultNow(),
  revokedAt:   timestamp('revoked_at',  { withTimezone: true }),
}, (t) => ({
  ownerIdx:    index('api_key_owner_idx').on(t.ownerId),
  serviceIdx:  index('api_key_service_idx').on(t.serviceId),
  publicIdIdx: uniqueIndex('api_key_public_id_idx').on(t.publicId),
  statusIdx:   index('api_key_status_idx').on(t.status),
}));

export const auditLog = pgTable('audit_log', {
  id:        uuid('id').primaryKey().defaultRandom(),
  ownerId:   text('owner_id').references(() => user.id, { onDelete: 'set null' }),
  serviceId: uuid('service_id').references(() => service.id, { onDelete: 'set null' }),
  apiKeyId:  uuid('api_key_id').references(() => apiKey.id, { onDelete: 'set null' }),
  action:    text('action').notNull(), // key.created|key.revoked|key.verified|key.auth_failed|ratelimit.exceeded|service.created|scope.created|tier.created
  metadata:  jsonb('metadata'),        // { ip, userAgent, endpoint, scope, statusCode, reason }
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  keyIdx:     index('audit_key_idx').on(t.apiKeyId),
  ownerIdx:   index('audit_owner_idx').on(t.ownerId),
  createdIdx: index('audit_created_idx').on(t.createdAt),
}));

// --- demo service 1: URL shortener ---
export const shortLink = pgTable('short_link', {
  id:        uuid('id').primaryKey().defaultRandom(),
  apiKeyId:  uuid('api_key_id').notNull().references(() => apiKey.id, { onDelete: 'cascade' }),
  slug:      text('slug').notNull().unique(),
  targetUrl: text('target_url').notNull(),
  hits:      bigint('hits', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- demo service 2: mock invoices ---
export const invoice = pgTable('invoice', {
  id:        uuid('id').primaryKey().defaultRandom(),
  apiKeyId:  uuid('api_key_id').notNull().references(() => apiKey.id, { onDelete: 'cascade' }),
  number:    text('number').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency:  text('currency').notNull().default('USD'),
  status:    text('status', { enum: ['draft','sent','paid'] }).notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Add Drizzle `relations()` for ergonomic queries (owner→services→scopes, key→service/tier). Generate migrations with `drizzle-kit generate`; never edit generated SQL by hand.

---

## 8. Key generation (exact)

Format: `sk_<env>_<publicId>_<secret>` — `publicId`/`secret` are base62 (no `_`), so the whole key parses with one regex despite the `_` in the prefix.

```ts
// src/server/keys/generate.ts
import { randomBytes, createHmac } from 'node:crypto';

const PEPPER = () => {
  const p = process.env.API_KEY_PEPPER;
  if (!p || p.length < 32) throw new Error('API_KEY_PEPPER missing or too short');
  return p;
};

// url-safe base62 from random bytes
function base62(bytes: Buffer): string {
  const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '', n = BigInt('0x' + bytes.toString('hex'));
  while (n > 0n) { out = A[Number(n % 62n)] + out; n /= 62n; }
  return out || '0';
}

export function hashSecret(secret: string): string {
  return createHmac('sha256', PEPPER()).update(secret).digest('hex');
}

export function generateApiKey(env: 'live' | 'test') {
  const publicId = base62(randomBytes(9));   // ~12 chars lookup handle
  const secret   = base62(randomBytes(24));  // ~32 chars, ~140+ bits entropy
  const displayPrefix = `sk_${env}`;
  const fullKey = `${displayPrefix}_${publicId}_${secret}`;
  return {
    fullKey,                       // returned to user ONCE, never stored
    publicId,                      // stored plaintext, indexed
    keyHash: hashSecret(secret),   // stored
    displayPrefix,
    last4: secret.slice(-4),
  };
}
```

---

## 9. Key verification (exact — the hot path)

```ts
// src/server/keys/verify.ts
import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { apiKey } from '@/db/schema';
import { hashSecret } from './generate';

const KEY_RE = /^(sk_(?:live|test))_([0-9A-Za-z]+)_([0-9A-Za-z]+)$/;

export type VerifyResult =
  | { ok: true;  key: typeof apiKey.$inferSelect }
  | { ok: false; reason: 'malformed'|'not_found'|'bad_secret'|'revoked'|'expired' };

export async function verifyKey(presented: string): Promise<VerifyResult> {
  const m = KEY_RE.exec(presented);
  if (!m) return { ok: false, reason: 'malformed' };
  const [, , publicId, secret] = m;

  const row = await db.query.apiKey.findFirst({ where: eq(apiKey.publicId, publicId) });
  if (!row) return { ok: false, reason: 'not_found' };

  const a = Buffer.from(hashSecret(secret), 'hex');
  const b = Buffer.from(row.keyHash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_secret' };

  if (row.status === 'revoked')                    return { ok: false, reason: 'revoked' };
  if (row.expiresAt && row.expiresAt < new Date()) return { ok: false, reason: 'expired' };

  return { ok: true, key: row };
}
```

**The four decisions to be ready to defend:** fast HMAC-SHA256 not bcrypt (keys are high-entropy; can't afford slow hashing per request; password hashing solves a different threat model); pepper so a DB leak alone can't verify keys offline; `timingSafeEqual` against timing attacks; indexed `publicId` lookup then one compare, not scanning all hashes.

---

## 10. The `/verify` endpoint (product core)

```
POST /api/v1/verify
Content-Type: application/json
{ "key": "sk_live_...", "scope": "invoices:write" }   // scope optional
```

Server flow:
1. Zod-validate body.
2. `verifyKey(key)`. On `ok:false` → `401` with `{ valid:false, reason }` (use `403`/`reason:insufficient_scope` only for scope failures below). Audit `key.auth_failed`.
3. If `scope` provided and `!key.scopes.includes(scope)` → `403 { valid:false, reason:'insufficient_scope' }`. Audit `key.auth_failed`.
4. Rate limit (§13) on `rl:key:<key.id>` using the key's tier limit. Over → `429 { valid:false, reason:'rate_limited', retryAfter }`. Audit `ratelimit.exceeded`. Emit `X-RateLimit-*` headers.
5. Update `lastUsedAt`, increment `usageCount` (fire-and-forget/async is fine). Audit `key.verified`.
6. `200 { valid:true, keyId, ownerId, serviceId, scopes, environment, rateLimit:{ limit, remaining, reset } }` + `X-RateLimit-*` headers.

Responses always include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`; `Retry-After` only on 429. Auth-failure messages are generic to the caller (`"Invalid or revoked API key"`); the specific `reason` is logged internally, not leaked verbatim beyond a coarse category.

---

## 11. Control-plane API (oRPC procedures)

All require a valid Better Auth session; `ownerId` comes from the session, never from input. All inputs Zod-validated. All mutations ownership-checked (`row.ownerId === session.userId`) and write an audit row.

| Procedure | Input | Output | Notes |
|-----------|-------|--------|-------|
| `services.list` | — | `Service[]` | Owner's services. |
| `services.create` | `{ name, slug, description? }` | `Service` | Slug unique per owner. |
| `services.delete` | `{ id }` | `{ ok }` | Cascades scopes/keys. |
| `scopes.list` | `{ serviceId }` | `Scope[]` | |
| `scopes.create` | `{ serviceId, value, description? }` | `Scope` | Validate `value` shape (e.g. `^[a-z0-9_-]+:[a-z0-9_-]+$`). |
| `scopes.delete` | `{ id }` | `{ ok }` | |
| `tiers.list` | — | `Tier[]` | |
| `tiers.create` | `{ name, rateLimitPerMin }` | `Tier` | |
| `tiers.delete` | `{ id }` | `{ ok }` | Block if keys reference it. |
| `keys.list` | `{ serviceId? }` | `KeyPublic[]` | Never returns hash/plaintext. |
| `keys.create` | `{ serviceId, tierId, name, environment, scopes[], expiresAt? }` | `{ key: KeyPublic, plaintext }` | `scopes` must be subset of service's scopes; `plaintext` returned once. |
| `keys.revoke` | `{ id }` | `{ ok }` | status=revoked, revokedAt=now. |
| `audit.list` | `{ serviceId?, keyId?, limit?, cursor? }` | `AuditRow[]` | Activity feed. |

`KeyPublic` = `{ id, serviceId, tierId, name, environment, displayPrefix, last4, scopes, status, expiresAt, lastUsedAt, usageCount, createdAt }`. Never `keyHash`, never `publicId`-as-secret, never `plaintext` (except the one-time `keys.create` return).

---

## 12. Data-plane API (REST, versioned `/api/v1`)

All demo endpoints require `Authorization: Bearer <key>`, call the shared `verifyKey()` + scope + rate-limit pipeline (same as §10), then run business logic.

| Method / Path | Scope required | Purpose |
|---------------|----------------|---------|
| `POST /api/v1/verify` | — | The product endpoint (§10). |
| `GET  /api/v1/me` | — | Key introspection: identity + scopes + limits. |
| `POST /api/v1/links` | `links:write` | Demo 1: create short link. |
| `GET  /api/v1/links` | `links:read` | Demo 1: list this key's links. |
| `POST /api/v1/invoices` | `invoices:write` | Demo 2: create mock invoice. |
| `GET  /api/v1/invoices` | `invoices:read` | Demo 2: list this key's invoices. |
| `GET  /s/:slug` | none (public) | Short-link redirect; increments hits. |

Factor the auth pipeline into one wrapper, e.g. `withApiKey(scope?)(handler)`, so every data-plane route shares identical verify/scope/ratelimit/audit behavior. Consistent error envelope: `{ error: { code, message, requestId } }`.

---

## 13. Rate limiting (Redis)

**Per-key, by tier.** For 1–2 days use a **fixed-window** counter (simple, correct enough); note the boundary-burst caveat and sliding-window as the upgrade.

```ts
// src/server/ratelimit/limiter.ts  (fixed 60s window)
// returns { allowed, limit, remaining, reset(sec), retryAfter(sec) }
export async function checkRateLimit(keyId: string, limitPerMin: number) {
  const windowSec = 60;
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  const redisKey = `rl:key:${keyId}:${bucket}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSec);
  const reset = (bucket + 1) * windowSec;
  const remaining = Math.max(0, limitPerMin - count);
  return {
    allowed: count <= limitPerMin,
    limit: limitPerMin,
    remaining,
    reset,
    retryAfter: count <= limitPerMin ? 0 : reset - now,
  };
}
```

**Two planes of limiting:**
- **Data plane (headline):** per-key using `key.tier.rateLimitPerMin`. Emit `X-RateLimit-*`.
- **Control plane (abuse prevention):** limit `keys.create` per user (burst cap) AND enforce a max active keys per user (e.g. 50). Prevents unlimited minting.

Talking point: in-memory counters die on restart and aren't shared across replicas, silently doubling limits — Redis is the shared source of truth, which is why it's a deployed resource.

---

## 14. Dashboard UI (shadcn)

Pages (all behind auth):
- **Keys** — table (name, service, tier, prefix+last4, scopes, status, last used, usage count) + "Create key" modal (pick service → tier → scopes-from-that-service → env → optional expiry) → **show-once** reveal modal with copy button and "you won't see it again". Revoke button per row (confirm dialog).
- **Services** — list + create form (name, slug, description). Click a service → manage its **scopes** (list + add `value`/description).
- **Tiers** — list + create form (name, requests/min).
- **Playground** — the demo centerpiece (§ below).
- **Audit** — recent events table from `audit.list`.

**Playground (build even if basic):** pick one of the user's keys from a dropdown; buttons to call `POST /api/v1/verify` (with an optional scope input), `GET /api/v1/me`, and the demo endpoints. Show the raw request (method, headers, body), the response status + body, and live `X-RateLimit-Remaining`. Include a **"Revoke this key"** button that calls `keys.revoke` then re-fires `/verify` so the `401` is visible immediately — the money demo. A "spam 30x" button to trip the `429` is a bonus.

---

## 15. Observability

- **pino** logger, per-request `requestId` (generate in middleware, echo in every error envelope + audit metadata).
- **Audit log** table (§7) written on every create/revoke/verify/auth-fail/ratelimit event.
- **Health:** `GET /api/health` (process up) and `GET /api/ready` (DB + Redis reachable) for Coolify.
- **NEXT:** OpenTelemetry traces on the verify pipeline (verify→scope→ratelimit→handler). Stub only if time; strong talking point given Bhavik's background.

---

## 16. Local development

```yaml
# docker-compose.yml — local only
services:
  app:
    build: .
    env_file: .env.local
    ports: ["3000:3000"]
    depends_on: [postgres, redis]
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_PASSWORD: dev, POSTGRES_DB: apikeys, POSTGRES_USER: dev }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes: { pgdata: {} }
```

Dev loop: `bun install` → `docker compose up postgres redis -d` → `bun run db:migrate` → `bun run db:seed` → `bun run dev`. Provide `package.json` scripts: `dev`, `build`, `start`, `db:generate`, `db:migrate`, `db:seed`, `lint`, `typecheck`, `test`.

---

## 17. Dockerfile + Coolify + migrations

```dockerfile
# ---- deps (Bun) ----
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ---- build (Bun builds, Next emits Node standalone) ----
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- runtime (Node runs the server) ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=build /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY docker-entrypoint.sh ./
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
```

`docker-entrypoint.sh`: run `node`-based drizzle migrate (or `npx drizzle-kit migrate`) then `exec node server.js`. **Single replica for the demo, so entrypoint migration is safe** — state the multi-replica caveat aloud (use a one-off pre-deploy migration job when scaling out).

**Coolify:** three resources — app (from GitHub repo/GHCR), Postgres, Redis, on the internal network. Secrets (§6) as app env vars, never in the image. Deploy behind `keys.<domain>` via the wildcard; auto-TLS. Postgres/Redis not publicly exposed.

---

## 18. CI/CD (GitHub Actions)

```
on: [pull_request, push to main]

jobs:
  quality:
    - setup Bun
    - bun install --frozen-lockfile
    - bun run lint
    - bun run typecheck
    - bun run test        # with postgres + redis service containers
    - bun run build
  deploy:                 # only on push to main, needs: quality
    - build & push image to GHCR (tag = git SHA)
    - curl Coolify deploy webhook (secret in GH Actions secrets)
```

Provide `services: { postgres, redis }` in the test job. Branch-protect `main` on the quality job. Rationale to state: gates run before deploy, build decoupled from deploy, SHA-tagged images = traceable/rollbackable. Simpler alternative (Coolify native build-on-push) exists but skips the CI gate — say why you didn't use it.

---

## 19. Testing (prioritized for the timeline)

**Must (BUILT):** unit tests for key gen (format/entropy/uniqueness) and `verifyKey` (valid, malformed, wrong secret, revoked, expired) including the timing-safe path; unit test the rate limiter (under/over/reset); one integration test of the `/verify` endpoint (200/401/403/429) and an ownership negative test (user A can't revoke user B's key).

**Nice (SCAFFOLDED):** integration tests for demo endpoints; a Playwright e2e of create→verify→revoke.

Use Vitest. The crypto + limiter tests are what you *want* an interviewer to open and find.

---

## 20. Security checklist

- [ ] Raw keys never stored; only HMAC-SHA256(secret) with pepper.
- [ ] Key shown once; unrecoverable after.
- [ ] `timingSafeEqual` on verify.
- [ ] Pepper in env, not DB, not image.
- [ ] Session auth and key auth never cross planes.
- [ ] Every control-plane mutation ownership-checked against session user.
- [ ] Assigned scopes validated as subset of the service's defined scopes at key creation.
- [ ] Scopes enforced server-side per data-plane endpoint.
- [ ] Per-key (by tier) + per-user rate limits; active-key cap.
- [ ] All inputs Zod-validated, both planes.
- [ ] Postgres/Redis internal-only in Coolify.
- [ ] Secrets via Coolify env; `.env` gitignored; no secrets in image layers.
- [ ] Better Auth cookies httpOnly/secure/sameSite.
- [ ] Generic auth-failure responses to callers; specific reason logged internally.
- [ ] Container runs non-root.
- [ ] Consistent error envelope with requestId.

---

## 21. Build plan — Day 1 / Day 2 (BUILD IN THIS ORDER)

Each phase ends at a demoable checkpoint. Do not start a phase before the previous checkpoint passes.

**Day 1 — the working vertical slice (all BUILT):**
1. **Scaffold** — Next.js + TS strict + Tailwind + shadcn; Bun; compose up Postgres+Redis; pino logger; `.env` wired. *Check: app boots.*
2. **Auth** — Better Auth email+password; sign-up/sign-in pages; protected dashboard shell. *Check: log in, see empty dashboard.*
3. **Schema + migrate + seed** — all of §7; `db:migrate`; seed script (§22) creating a demo owner, two services, two tiers, sample scopes. *Check: seed runs, rows exist.*
4. **Key core + tests** — §8, §9 with Vitest suite. *Check: tests green.*
5. **Keys dashboard (oRPC)** — `keys.list/create/revoke`; create modal; show-once reveal. *Check: mint + revoke a key in UI.*
6. **Data plane + /verify** — `withApiKey` wrapper, `POST /api/v1/verify`, `GET /api/v1/me`, demo service 1 (`/links` + `/s/:slug`). *Check: `curl` verify + create a link with a real key.*
7. **Rate limiting** — Redis limiter, per-key by tier, `X-RateLimit-*`, 429. *Check: trip a 429 with curl.*

**End of Day 1 = complete end-to-end product slice.** If Day 2 vanishes, this alone is a strong artifact.

**Day 2 — the platform surface + infra + polish:**
8. **Services/Scopes/Tiers UI** (SCAFFOLDED) — basic CRUD forms so customer-defined model is real, not just seeded.
9. **Demo service 2** (`/invoices`) — proves generic (different scopes).
10. **Playground** — dropdown + verify/me/demo calls + the revoke-→-401 moment.
11. **Dockerfile + entrypoint migration**, deploy to Coolify (app+Postgres+Redis), secrets, `keys.<domain>` live. *Check: it's on the internet over HTTPS.*
12. **GitHub Actions** — quality gate → build → Coolify webhook. *Check: push deploys.*
13. **Polish** — README + architecture diagram + the §23 flows; audit view; verify security checklist. Screenshots.

**Hard rule:** infra (11–12) is BUILT priority. If Day 2 is short, do 11–12 before 8–10 — a deployed slice with CI beats a richer local-only app for this brief. Reorder to protect the code→infra story.

---

## 22. Seed data (makes the demo instantly alive)

`db:seed` creates: one demo owner (`demo@keys.local` / known password), two tiers (`Free` 60/min, `Pro` 1000/min), two services — **URL Shortener** (scopes `links:read`, `links:write`) and **Invoices** (scopes `invoices:read`, `invoices:write`) — and one sample **live** key on the URL Shortener service at the Free tier with both link scopes. Print the sample key's plaintext to console once during seeding so it can be used immediately in curl/playground. Seed is idempotent (safe to re-run).

---

## 23. Reference request/response flows

(Use one example key throughout: `sk_live_a1b2c3d4_9fK2mNp7qRs4tVw8xYz1AbC3dEf6`.)

1. **Login** → `POST /api/auth/sign-in/email` → `200` + session cookie.
2. **Create key** → oRPC `keys.create` (session cookie) → `200 { key, plaintext }` (plaintext once). Row stores hash only.
3. **Customer verifies a key** → `POST /api/v1/verify { key, scope:"links:write" }` → `200 { valid:true, keyId, ownerId, serviceId, scopes, rateLimit }`.
4. **Use demo service** → `POST /api/v1/links { targetUrl }` (Bearer key) → `201 { slug, shortUrl }` + `X-RateLimit-*`.
5. **Follow short link** → `GET /s/:slug` → `302` redirect, hits++.
6. **Rate limited** → 101st call in a minute → `429 { valid:false, reason:"rate_limited" }` + `Retry-After`.
7. **Revoke** → oRPC `keys.revoke` (ownership-checked) → status=revoked. Then `POST /api/v1/verify` same key → `401 { valid:false, reason:"revoked" }`. **The money demo.**
8. **Wrong scope** → read-only key hits `POST /api/v1/invoices` → `403 { valid:false, reason:"insufficient_scope" }`. (401 = who are you; 403 = you can't do this.)

---

## 24. Interview narrative

**Lead with:** "It's authentication-as-a-service for API keys. You bring any API; I handle issuance, custom scopes, rate-limit tiers, and instant revocation behind one `/verify` call. The URL shortener and invoices APIs are just two example customers of the platform."

**Defend, unprompted:** two-plane model; HMAC-not-bcrypt; two auth schemes kept separate; per-key-by-tier rate limiting needs Redis; oRPC internal vs REST public; migration-on-deploy + multi-replica caveat; secrets in Coolify env not image; scopes denormalized on the key for verify speed with the scope table as source of truth.

**Deliberately deferred (say this — it shows scoping judgment):** service **root keys** to authenticate verify callers (the production-correct anti-probing model — schema is already `keyType`-ready); organizations/teams (`ownerId` → org id); usage analytics charts; key rotation with grace windows; webhooks on key events; billing/quota plans. "I built a complete vertical slice of a larger design and I can walk you through exactly how each deferred piece slots in."

---

## 25. Open decisions / questions for Bhavik

Defaults chosen; override any by telling Claude Code:
1. **Auth method** — default email+password. Passkeys (Better Auth supports) = easy swap if preferred. **Confirm.**
2. **Domain** — default `keys.<your-domain>` via Coolify wildcard. **Provide the actual domain/subdomain.**
3. **Second demo service** — default mock Invoices. Swap if you have a more relevant example. **Confirm.**
4. **Verify-caller auth** — default self-identifying key (no root key) for the slice; root-key model documented as NEXT. **Confirm this is acceptable for the demo.**
5. **Tier scoping** — default owner-level tiers (reusable across services). Switch to per-service if you prefer. **Confirm.**
6. **Org model** — default individual users; schema is org-ready. Build orgs only if explicitly wanted (out of scope for 1–2 days). **Confirm deferral.**

---

*Start at §21 phase 1. Reach each checkpoint before advancing. Protect the Day-1 vertical slice and the infra phases above all else — a deployed, working, end-to-end slice with CI is the artifact that wins this interview.*
