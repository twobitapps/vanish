import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://hy.gl';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Vanish — encrypted notes that expire',
  description:
    'Write a note, set when it should expire, share a link. End-to-end encrypted in your browser. The server never sees your text or your key.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Vanish',
    title: 'Vanish — encrypted notes that expire',
    description:
      'End-to-end encrypted notes and short links. The server only ever sees ciphertext.',
    images: [
      {
        url: `${SITE_URL}/og.png`,
        secureUrl: `${SITE_URL}/og.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Vanish — end-to-end encrypted notes that expire',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vanish — encrypted notes that expire',
    description:
      'End-to-end encrypted notes and short links. The server only ever sees ciphertext.',
    images: [`${SITE_URL}/og.png`],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c0b0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="top">
            <a href="/" className="brand" aria-label="Home">
              <span className="dot" aria-hidden="true" /> vanish
            </a>
            <nav className="nav" aria-label="Primary">
              <a href="/">note</a>
              <a href="/s">short link</a>
              <a href="/security">security</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="bot">
            <span>end-to-end encrypted · your key never leaves your device</span>
            <span>
              <a href="/security">how it works</a> ·{' '}
              <a href="https://github.com/twobitapps/vanish" target="_blank" rel="noreferrer noopener">
                source
              </a>{' '}
              · <a href="/terms">terms</a>
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
