import { createHmac, randomBytes } from "node:crypto";

const BASE62_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(62);
const ZERO = BigInt(0);
const PUBLIC_ID_BYTES = 9;
const SECRET_BYTES = 24;
const MIN_PEPPER_LENGTH = 32;
const LAST4 = 4;

function getPepper(): string {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper || pepper.length < MIN_PEPPER_LENGTH) {
    throw new Error("API_KEY_PEPPER missing or too short");
  }
  return pepper;
}

function base62(bytes: Buffer): string {
  let out = "";
  let n = BigInt(`0x${bytes.toString("hex")}`);
  while (n > ZERO) {
    out = BASE62_ALPHABET[Number(n % BASE)] + out;
    n /= BASE;
  }
  return out || "0";
}

export function hashSecret(secret: string): string {
  return createHmac("sha256", getPepper()).update(secret).digest("hex");
}

export interface GeneratedKey {
  displayPrefix: string;
  fullKey: string;
  keyHash: string;
  last4: string;
  publicId: string;
}

export function generateApiKey(env: "live" | "test"): GeneratedKey {
  const publicId = base62(randomBytes(PUBLIC_ID_BYTES));
  const secret = base62(randomBytes(SECRET_BYTES));
  const displayPrefix = `sk_${env}`;
  return {
    displayPrefix,
    fullKey: `${displayPrefix}_${publicId}_${secret}`,
    keyHash: hashSecret(secret),
    last4: secret.slice(-LAST4),
    publicId,
  };
}
