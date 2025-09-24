import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (best-effort; resets on cold start)
type Bucket = { count: number; resetAt: number };
type Store = Map<string, Bucket>;

declare global {
  // eslint-disable-next-line no-var
  var __rate_limit_store: Store | undefined;
}

function getStore(): Store {
  if (!global.__rate_limit_store) {
    global.__rate_limit_store = new Map();
  }
  return global.__rate_limit_store;
}

export function getClientKey(req: Request): string {
  const xfwd = req.headers.get('x-forwarded-for') || '';
  const ip = xfwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; reset: number } {
  const store = getStore();
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (bucket.count < limit) {
    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count, reset: bucket.resetAt };
  }
  return { allowed: false, remaining: 0, reset: bucket.resetAt };
}

// CSRF best-effort: allow if no Origin header (SSR/fetch),
// otherwise require same-origin
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const selfOrigin = new URL(req.url).origin;
  return origin === selfOrigin;
}

export function tooManyRequests(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new NextResponse(
    JSON.stringify({ error: 'Too many requests' }),
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
