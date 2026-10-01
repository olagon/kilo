const enc = new TextEncoder();

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hmacSeed(secret: string, label: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(label)));
}

// ponytail: per-isolate in-memory buckets. Good enough to stop a loop; move to the Workers rate limit binding if abuse shows up.
const buckets = new Map<string, { minute: number; n: number }>();

/** Returns true when the caller is over its per-minute budget. */
export function overLimit(key: string, perMinute: number, now = Date.now()): boolean {
  const minute = Math.floor(now / 60000);
  const b = buckets.get(key);
  if (!b || b.minute !== minute) {
    if (buckets.size > 10000) buckets.clear();
    buckets.set(key, { minute, n: 1 });
    return false;
  }
  b.n++;
  return b.n > perMinute;
}
