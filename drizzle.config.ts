import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local: load .env.local. Prod (Coolify): file is absent and DATABASE_URL is injected.
config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  dbCredentials: { url },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/db/schema.ts",
});
