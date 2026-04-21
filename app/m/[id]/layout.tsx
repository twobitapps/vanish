import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Someone shared an encrypted note — Vanish',
  description:
    'A Vanish note is waiting for you. Open the link to decrypt it locally in your browser. The server cannot read it.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Someone shared an encrypted note',
    description:
      'A Vanish note is waiting. Decryption happens in your browser — the server cannot read it.',
    images: [
      {
        url: 'https://hy.gl/og.png',
        secureUrl: 'https://hy.gl/og.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'An encrypted Vanish note, pending decryption in your browser',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Someone shared an encrypted note',
    description: 'Open the link to decrypt locally. The server cannot read it.',
    images: ['https://hy.gl/og.png'],
  },
};

export default function MLayout({ children }: { children: React.ReactNode }) {
  return children;
}
