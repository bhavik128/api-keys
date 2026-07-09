const KEY_RE = /^(sk_(?:live|test))_([0-9A-Za-z]+)_([0-9A-Za-z]+)$/;

export interface ParsedKey {
  prefix: string;
  publicId: string;
  secret: string;
}

export function parseKey(presented: string): ParsedKey | null {
  const match = KEY_RE.exec(presented);
  if (!match) {
    return null;
  }
  return { prefix: match[1], publicId: match[2], secret: match[3] };
}
