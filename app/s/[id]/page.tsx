import { redirect } from 'next/navigation';
import { getRedis, hasRedis } from '@/lib/redis';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const ID_RE = /^[A-Za-z0-9_-]{4,16}$/;

export default async function ShortRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!ID_RE.test(id)) return <Gone reason="invalid" />;
  if (!hasRedis()) return <Gone reason="storage" />;

  let target: string | null = null;
  try {
    const redis = getRedis();
    const raw = await redis.get<string | object>(`short:${id}`);
    if (raw != null) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as { url: string });
      if (typeof parsed.url === 'string') target = parsed.url;
    }
  } catch {
    return <Gone reason="storage" />;
  }

  if (!target) return <Gone reason="missing" />;

  redirect(target);
}

function Gone({ reason }: { reason: 'invalid' | 'storage' | 'missing' }) {
  const message =
    reason === 'invalid'
      ? 'This link is malformed.'
      : reason === 'storage'
        ? 'The link store is unavailable.'
        : 'This short link has expired or never existed.';
  return (
    <section className="card stack">
      <h1>Link not available</h1>
      <p className="intro">{message}</p>
      <a className="btn" href="/s">
        shorten a new link
      </a>
    </section>
  );
}
