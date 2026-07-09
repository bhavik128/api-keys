<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Before you create files

**Consult [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before creating any file or folder.** It is
the canonical folder map + a "where does X go" table. Place code where it says; if you truly need a
new location, add its row there in the same change. Don't scatter files.

- **`src/lib/` is client-safe; `src/server/` is server-only.** A file that imports `server-only`,
  `pg`, `@/db`, `@/server/*`, `next/headers`, or a Node built-in belongs in `src/server/`, never `lib/`.
- **Route files under `src/app/` stay thin** — parse input, check auth, delegate to `src/server/`,
  render. Business logic lives in `src/server/`.
- **Never hand-edit `src/db/auth-schema.ts`** (regenerate: `bun run auth:generate`).

# Orientation

- **Current state / what's built:** [`docs/PROGRESS.md`](docs/PROGRESS.md).
- **Full design & build plan:** [`docs/api-key-platform-build-spec.md`](docs/api-key-platform-build-spec.md) — build in §21 order.
- **Settled decisions (don't re-litigate; supersede with a new ADR if wrong):** [`docs/adr/`](docs/adr/).
