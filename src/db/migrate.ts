import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Standalone migration runner. Bundled to migrate.mjs and executed by the container
// entrypoint before the server starts. Fails fast (non-zero exit) so a bad migration
// aborts the deploy instead of booting against a half-migrated database.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("migration failed:", error);
  process.exit(1);
});
