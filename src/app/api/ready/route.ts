import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

// Readiness: process is up AND the database is reachable. Liveness lives at /api/health.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ db: false, status: "unavailable" }, { status: 503 });
  }
}
