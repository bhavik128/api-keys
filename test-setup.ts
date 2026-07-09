// bun test sets NODE_ENV=test, so Bun skips .env.local (and CI has none); a real env value still wins.
process.env.API_KEY_PEPPER ??= "test-pepper-do-not-use-in-production-0000";
