import { NextRequest, NextResponse } from 'next/server';
import { getRedis, hasRedis } from '@/lib/redis';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const ID_RE = /^[A-Za-z0-9_-]{4,32}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  if (!hasRedis()) {
    return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 });
  }

  try {
    const redis = getRedis();
    const raw = await redis.get<string | object>(`paste:${id}`);
    if (raw == null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return NextResponse.json(parsed, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return NextResponse.json({ error: 'storage_error' }, { status: 500 });
  }
}
