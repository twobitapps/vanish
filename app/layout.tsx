import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vanish — encrypted notes that expire',
  description:
    'Write a note, set when it should expire, share a link. End-to-end encrypted in your browser. The server never sees your text or your key.',
  robots: { index: false, follow: false },
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
              <a href="/security">how it works</a> · <a href="/terms">terms</a>
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
