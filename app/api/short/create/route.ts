import { NextRequest, NextResponse } from 'next/server';
import { getRedis, hasRedis } from '@/lib/redis';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const MAX_URL_LENGTH = 4096;
const ID_BYTES = 6;
const MIN_TTL = 60;
const MAX_TTL = 157680000;

function generateId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function validateUrl(input: unknown, requestHost: string | null): string | null {
  if (typeof input !== 'string') return null;
  if (input.length === 0 || input.length > MAX_URL_LENGTH) return null;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.hash.length > 0) return null;
  if (requestHost && u.host.toLowerCase() === requestHost.toLowerCase()) {
    if (u.pathname.startsWith('/s/')) return null;
  }
  return u.toString();
}

export async function POST(req: NextRequest) {
  if (!hasRedis()) {
    return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { url, ttl } = (body ?? {}) as { url?: unknown; ttl?: unknown };
  const host = req.headers.get('host');
  const safeUrl = validateUrl(url, host);
  if (!safeUrl) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }
  if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < MIN_TTL || ttl > MAX_TTL) {
    return NextResponse.json({ error: 'invalid_ttl' }, { status: 400 });
  }

  const id = generateId();
  const expiresAt = Date.now() + ttl * 1000;
  const record = { url: safeUrl, expiresAt };

  try {
    const redis = getRedis();
    await redis.set(`short:${id}`, JSON.stringify(record), { ex: ttl, nx: true });
  } catch {
    return NextResponse.json({ error: 'storage_error' }, { status: 500 });
  }

  return NextResponse.json({ id, expiresAt });
}
