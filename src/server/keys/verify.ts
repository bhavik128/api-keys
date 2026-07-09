import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKey } from "@/db/schema";
import { parseKey } from "./format";
import { hashSecret } from "./generate";

const DUMMY_HASH_HEX = "0".repeat(64);

export type VerifyResult =
  | { ok: true; key: typeof apiKey.$inferSelect }
  | {
      ok: false;
      reason: "malformed" | "not_found" | "bad_secret" | "revoked" | "expired";
    };

function hashesMatch(secret: string, expectedHash: string): boolean {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyKey(presented: string): Promise<VerifyResult> {
  const parsed = parseKey(presented);
  if (!parsed) {
    return { ok: false, reason: "malformed" };
  }

  const row = await db.query.apiKey.findFirst({
    where: eq(apiKey.publicId, parsed.publicId),
  });

  if (!row) {
    // Constant-time: same work as a real check so a miss and a wrong secret are
    // timing-indistinguishable. Deliberate — the ignored result is not dead code.
    hashesMatch(parsed.secret, DUMMY_HASH_HEX);
    return { ok: false, reason: "not_found" };
  }

  if (!hashesMatch(parsed.secret, row.keyHash)) {
    return { ok: false, reason: "bad_secret" };
  }

  if (row.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }

  if (row.expiresAt && row.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  return { key: row, ok: true };
}
