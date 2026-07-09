import { beforeEach, describe, expect, it, mock } from "bun:test";
import { hashSecret } from "./generate";

const VALID_SECRET = "testsecret";
const KEY = "sk_live_pub123_testsecret";
const ONE_MINUTE_MS = 60_000;

interface MockRow {
  expiresAt: Date | null;
  id: string;
  keyHash: string;
  publicId: string;
  scopes: string[];
  status: "active" | "revoked";
}

let mockRow: MockRow | undefined;

mock.module("@/db", () => ({
  db: {
    query: {
      apiKey: {
        findFirst: () => Promise.resolve(mockRow),
      },
    },
  },
}));

// Import after mock.module — Bun's mock.module is not hoisted like vitest's vi.mock.
const { verifyKey } = await import("./verify");

function buildRow(overrides: Partial<MockRow> = {}): MockRow {
  return {
    expiresAt: null,
    id: "row-1",
    keyHash: hashSecret(VALID_SECRET),
    publicId: "pub123",
    scopes: [],
    status: "active",
    ...overrides,
  };
}

describe("verifyKey", () => {
  beforeEach(() => {
    mockRow = undefined;
  });

  it("returns malformed for bad format without hitting the db", async () => {
    expect(await verifyKey("not-a-key")).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("returns not_found when no row matches", async () => {
    mockRow = undefined;
    expect(await verifyKey(KEY)).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns bad_secret when the secret does not match", async () => {
    mockRow = buildRow({ keyHash: hashSecret("wrong") });
    expect(await verifyKey(KEY)).toEqual({ ok: false, reason: "bad_secret" });
  });

  it("returns revoked for a revoked key with a valid secret", async () => {
    mockRow = buildRow({ status: "revoked" });
    expect(await verifyKey(KEY)).toEqual({ ok: false, reason: "revoked" });
  });

  it("returns expired for an expired key with a valid secret", async () => {
    mockRow = buildRow({ expiresAt: new Date(Date.now() - ONE_MINUTE_MS) });
    expect(await verifyKey(KEY)).toEqual({ ok: false, reason: "expired" });
  });

  it("returns ok with the row for a valid active key", async () => {
    mockRow = buildRow();
    const res = await verifyKey(KEY);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.key.publicId).toBe("pub123");
    }
  });
});
