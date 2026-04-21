import { NextRequest, NextResponse } from 'next/server';
import { getRedis, hasRedis } from '@/lib/redis';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const MAX_CIPHERTEXT = 512 * 1024;
const MIN_TTL = 60;
const MAX_TTL = 2592000;
const ID_BYTES = 12;

function generateId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(req: NextRequest) {
  if (!hasRedis()) {
    return NextResponse.json(
      { error: 'storage_not_configured' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { ciphertext, iv, ttl, salt } = (body ?? {}) as {
    ciphertext?: unknown;
    iv?: unknown;
    ttl?: unknown;
    salt?: unknown;
  };

  if (typeof ciphertext !== 'string' || typeof iv !== 'string') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (ciphertext.length === 0 || ciphertext.length > MAX_CIPHERTEXT) {
    return NextResponse.json({ error: 'ciphertext_too_large' }, { status: 413 });
  }
  if (iv.length < 8 || iv.length > 64) {
    return NextResponse.json({ error: 'invalid_iv' }, { status: 400 });
  }
  if (salt !== undefined && (typeof salt !== 'string' || salt.length < 8 || salt.length > 64)) {
    return NextResponse.json({ error: 'invalid_salt' }, { status: 400 });
  }
  if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < MIN_TTL || ttl > MAX_TTL) {
    return NextResponse.json({ error: 'invalid_ttl' }, { status: 400 });
  }

  const id = generateId();
  const expiresAt = Date.now() + ttl * 1000;
  const record: Record<string, unknown> = { ciphertext, iv, expiresAt };
  if (typeof salt === 'string') record.salt = salt;

  try {
    const redis = getRedis();
    await redis.set(`paste:${id}`, JSON.stringify(record), { ex: ttl, nx: true });
  } catch (err) {
    return NextResponse.json({ error: 'storage_error' }, { status: 500 });
  }

  return NextResponse.json({ id, expiresAt });
}
