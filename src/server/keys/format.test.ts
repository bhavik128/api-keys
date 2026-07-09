import { describe, expect, it } from "bun:test";
import { parseKey } from "./format";

describe("parseKey", () => {
  it("parses a well-formed key despite the _ inside the prefix", () => {
    expect(parseKey("sk_live_abc123_XYZ789")).toEqual({
      prefix: "sk_live",
      publicId: "abc123",
      secret: "XYZ789",
    });
  });

  it("parses a test-environment key", () => {
    expect(parseKey("sk_test_pub_secret")?.prefix).toBe("sk_test");
  });

  it("returns null for malformed input", () => {
    expect(parseKey("")).toBeNull();
    expect(parseKey("nope")).toBeNull();
    expect(parseKey("sk_prod_a_b")).toBeNull();
    expect(parseKey("sk_live_a")).toBeNull();
    expect(parseKey("sk_live__b")).toBeNull();
    expect(parseKey("sk_live_a_b_c")).toBeNull();
  });
});
