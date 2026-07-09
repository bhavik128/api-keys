import { describe, expect, it } from "bun:test";
import { parseKey } from "./format";
import { generateApiKey, hashSecret } from "./generate";

const UNIQUE_SAMPLE = 1000;
const SHA256_HEX = /^[0-9a-f]{64}$/;

function secretOf(fullKey: string): string {
  const parsed = parseKey(fullKey);
  if (!parsed) {
    throw new Error(`generated key did not parse: ${fullKey}`);
  }
  return parsed.secret;
}

describe("generateApiKey", () => {
  it("produces a parseable sk_<env>_<publicId>_<secret> key", () => {
    const key = generateApiKey("live");
    expect(key.displayPrefix).toBe("sk_live");
    expect(key.fullKey.startsWith("sk_live_")).toBe(true);
    const parsed = parseKey(key.fullKey);
    expect(parsed).not.toBeNull();
    expect(parsed?.publicId).toBe(key.publicId);
  });

  it("uses the test prefix for the test environment", () => {
    expect(generateApiKey("test").displayPrefix).toBe("sk_test");
  });

  it("sets last4 to the final 4 chars of the secret", () => {
    const key = generateApiKey("test");
    expect(key.last4).toBe(secretOf(key.fullKey).slice(-4));
  });

  it("stores an HMAC of the secret, never the raw secret", () => {
    const key = generateApiKey("live");
    expect(key.keyHash).toBe(hashSecret(secretOf(key.fullKey)));
    expect(key.fullKey).not.toContain(key.keyHash);
  });

  it("generates unique public ids and secrets across many calls", () => {
    const publicIds = new Set<string>();
    const secrets = new Set<string>();
    for (let i = 0; i < UNIQUE_SAMPLE; i += 1) {
      const key = generateApiKey("live");
      publicIds.add(key.publicId);
      secrets.add(secretOf(key.fullKey));
    }
    expect(publicIds.size).toBe(UNIQUE_SAMPLE);
    expect(secrets.size).toBe(UNIQUE_SAMPLE);
  });
});

describe("hashSecret", () => {
  it("is deterministic for the same secret", () => {
    expect(hashSecret("abc")).toBe(hashSecret("abc"));
  });

  it("differs for different secrets", () => {
    expect(hashSecret("abc")).not.toBe(hashSecret("abd"));
  });

  it("returns a 64-char sha256 hex digest", () => {
    expect(hashSecret("abc")).toMatch(SHA256_HEX);
  });
});
