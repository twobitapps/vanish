import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

type Variant = 'default' | 'github' | 'security' | 'terms';

const SIZES: Record<Variant, { width: number; height: number }> = {
  default: { width: 1200, height: 630 },
  github: { width: 1280, height: 640 },
  security: { width: 1200, height: 630 },
  terms: { width: 1200, height: 630 },
};

const BG_FOR_VARIANT: Record<Variant, string | null> = {
  default: '/art/01-wisps.jpg',
  github: '/art/02-paper.jpg',
  security: '/art/03-waves.jpg',
  terms: null,
};

function textFor(variant: Variant): { title: string; sub: string; foot: string } {
  switch (variant) {
    case 'github':
      return {
        title: 'vanish',
        sub: 'end-to-end encrypted notes that expire',
        foot: 'github.com/twobitapps/vanish',
      };
    case 'security':
      return {
        title: 'how it works',
        sub: 'the full end-to-end encryption model, spelled out',
        foot: 'hy.gl/security',
      };
    case 'terms':
      return {
        title: 'terms',
        sub: 'experimental software · use at your own risk',
        foot: 'hy.gl/terms',
      };
    default:
      return {
        title: 'vanish',
        sub: 'encrypted notes that expire · URL shortener',
        foot: 'hy.gl',
      };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('v') ?? 'default';
  const variant: Variant = (['default', 'github', 'security', 'terms'] as const).includes(
    raw as Variant
  )
    ? (raw as Variant)
    : 'default';

  const { width, height } = SIZES[variant];
  const { title, sub, foot } = textFor(variant);
  const bgPath = BG_FOR_VARIANT[variant];
  const bgUrl = bgPath ? new URL(bgPath, url.origin).toString() : null;

  const bg = '#0c0b0a';
  const text = '#efece3';
  const muted = '#8d897c';
  const border = '#26241e';
  const ok = '#9cc08c';
  const serif =
    "'Iowan Old Style', 'Charter', 'Apple Garamond', 'Baskerville', Georgia, serif";
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  const titleSize = variant === 'default' || variant === 'github' ? 220 : 148;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          backgroundColor: bg,
          color: text,
          fontFamily: serif,
        }}
      >
        {bgUrl ? (
          <img
            src={bgUrl}
            width={width}
            height={height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.78,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage:
              'linear-gradient(180deg, rgba(12,11,10,0.28) 0%, rgba(12,11,10,0.72) 55%, rgba(12,11,10,0.92) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: 72,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              color: muted,
              fontFamily: mono,
              fontSize: 24,
              letterSpacing: 0.8,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                backgroundColor: ok,
                boxShadow: `0 0 0 6px rgba(156,192,140,0.12)`,
              }}
            />
            <span>end-to-end encrypted · ephemeral · zero-knowledge</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                fontFamily: serif,
                fontSize: titleSize,
                lineHeight: 1,
                letterSpacing: -4,
                color: text,
                textShadow: '0 4px 40px rgba(0,0,0,0.6)',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: serif,
                fontSize: 44,
                color: muted,
                lineHeight: 1.2,
                maxWidth: width - 144,
                textShadow: '0 2px 20px rgba(0,0,0,0.6)',
              }}
            >
              {sub}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontFamily: mono,
              fontSize: 22,
              color: muted,
              letterSpacing: 0.6,
              borderTop: `1px solid ${border}`,
              paddingTop: 24,
            }}
          >
            <span>{foot}</span>
            <span>AES-GCM-256 · PBKDF2-HKDF · TTL delete</span>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: { 'Cache-Control': 'public, s-maxage=3600, max-age=3600' },
    }
  );
}
