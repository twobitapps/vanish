import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Vanish keeps your notes private',
  description:
    'The end-to-end encryption model behind Vanish, spelled out — what we see, what we don’t, and how to verify it yourself.',
};

export default function SecurityPage() {
  return (
    <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="card stack">
        <div>
          <span className="lock">end-to-end encrypted</span>
          <h1 style={{ marginTop: 12 }}>How Vanish keeps your notes private</h1>
          <p className="intro">
            Vanish never sees your notes. Your browser encrypts every message before it leaves
            this tab, and the decryption key lives only in the link you share. Below is exactly
            what happens — and exactly how to verify it yourself.
          </p>
        </div>
      </section>

      <section className="card security-sections">
        <h3>What happens when you create a note</h3>
        <ol>
          <li>
            <strong>You type.</strong> Nothing is sent anywhere. There is no autosave, no
            keystroke telemetry, no analytics script running on this page. Browser spellcheck,
            autofill, and password managers are explicitly disabled on the message field.
          </li>
          <li>
            <strong>Your browser generates a fresh 256-bit URL key.</strong> Using{' '}
            <code>crypto.getRandomValues</code>. The randomness comes from your operating
            system&apos;s secure RNG.
          </li>
          <li>
            <strong>
              If you set a password, your browser derives a second key from it.
            </strong>{' '}
            PBKDF2-SHA256 with 600,000 iterations over a random 128-bit salt. The password is
            never transmitted. The two keys are combined via HKDF-SHA256 into the final
            encryption key. Both are then required to decrypt — link <em>and</em> password. If
            you skip the password, only the URL key is used.
          </li>
          <li>
            <strong>Your browser encrypts the message locally.</strong> Using AES-GCM — an
            authenticated cipher, so any attempt to modify the ciphertext is detected on decrypt.
            A new 96-bit initialization vector is generated for each note and never reused.
          </li>
          <li>
            <strong>Only the ciphertext is sent to our server.</strong> The HTTP request body is{' '}
            <code>{`{ ciphertext, iv, ttl }`}</code> (plus <code>salt</code> if you used a
            password). Neither key is in the body, the URL, or any header. Both are still in
            memory, in this browser tab.
          </li>
          <li>
            <strong>The URL key is placed after the <code>#</code> in the link.</strong> The URL
            fragment — the part after <code>#</code> — is{' '}
            <strong>not transmitted by browsers to servers</strong> (by specification). It lives
            only in your URL bar and the recipient&apos;s. The password, if you set one, lives
            only in your head.
          </li>
          <li>
            <strong>The server stores the ciphertext with a TTL.</strong> Upstash Redis deletes
            the ciphertext atomically when the TTL elapses. No cleanup job, no chance of a stale
            blob lingering — the encrypted blob disappears from the database.
          </li>
          <li>
            <strong>The recipient opens the link.</strong> Their browser reads the URL key from
            the <code>#</code> fragment, fetches the ciphertext by ID, prompts for the password
            if one is required, re-derives the key, and decrypts in their tab. Our server never
            learns who opened it.
          </li>
        </ol>
      </section>

      <section className="card security-sections">
        <h3>What we can and cannot see</h3>
        <div className="truth-table" style={{ marginTop: 10 }}>
          <span className="row-label">Ciphertext (useless without the key)</span>
          <span className="yes">yes</span>
          <span className="row-label">IV (random, not secret)</span>
          <span className="yes">yes</span>
          <span className="row-label">
            Salt (random, not secret) — only when a password is used
          </span>
          <span className="yes">yes</span>
          <span className="row-label">Ciphertext size and time of creation</span>
          <span className="yes">yes</span>
          <span className="row-label">Your TTL choice</span>
          <span className="yes">yes</span>
          <span className="row-label">Whether a password is required (presence of the salt field)</span>
          <span className="yes">yes</span>
          <span className="row-label">Your IP address (standard web request logs, ~1h retention)</span>
          <span className="yes">yes</span>
          <span className="row-label">Your plaintext message</span>
          <span className="no">no</span>
          <span className="row-label">Your URL key</span>
          <span className="no">no</span>
          <span className="row-label">Your password</span>
          <span className="no">no</span>
          <span className="row-label">Who opens the link, or when</span>
          <span className="no">no</span>
          <span className="row-label">Your identity (we never ask)</span>
          <span className="no">no</span>
        </div>
      </section>

      <section className="card security-sections">
        <h3>Verify it yourself</h3>
        <p>
          Open your browser&apos;s developer tools (<code>Cmd+Option+I</code> on macOS,{' '}
          <code>Ctrl+Shift+I</code> elsewhere) and switch to the <strong>Network</strong> tab
          before you create a note.
        </p>
        <ul>
          <li>
            Filter by <code>Fetch/XHR</code> and watch the <code>POST /api/create</code>. The
            request body is strictly <code>{`{ ciphertext, iv, ttl }`}</code>, plus{' '}
            <code>salt</code> if you set a password. Your plaintext is not in it, anywhere. Your
            password is not in it, anywhere.
          </li>
          <li>
            The response is <code>{`{ id, expiresAt }`}</code>. The server returns an ID and a
            timestamp. Nothing else.
          </li>
          <li>
            When the recipient opens the link, the <code>GET /api/get/:id</code> response
            contains only <code>{`{ ciphertext, iv, expiresAt }`}</code> (plus <code>salt</code>{' '}
            for password-protected notes — needed by the recipient&apos;s browser to re-derive
            the key). The server still doesn&apos;t have either key — decryption happens
            client-side.
          </li>
        </ul>
        <p>
          You can also read the files responsible for encryption: <code>lib/crypto.ts</code>{' '}
          (AES-GCM, PBKDF2, HKDF helpers) and <code>app/page.tsx</code> (the create flow).
          Nothing else touches the plaintext or the password.
        </p>
      </section>

      <section className="card security-sections" id="password">
        <h3>Optional password layer</h3>
        <p>
          When creating a note you can require a password in addition to the link. Two factors,
          both necessary to decrypt:
        </p>
        <ul>
          <li>
            <strong>The URL key</strong> (in the <code>#</code> fragment, 256 random bits).
          </li>
          <li>
            <strong>A password you choose</strong>, run through PBKDF2-SHA256 at 600,000
            iterations in your browser. The random 128-bit salt is stored alongside the
            ciphertext so the recipient can re-derive the key; the password itself is never
            transmitted.
          </li>
        </ul>
        <p>
          The two outputs are combined via HKDF-SHA256 into the actual AES-GCM encryption key.
          Even if the URL leaks (history sync, clipboard, screenshot), a note without the
          password stays sealed. Share the password out-of-band — a phone call, a Signal
          message, anything that doesn&apos;t travel alongside the link.
        </p>
        <p>
          Strength note: a good password is worth more than a long one. A memorable 4-word
          diceware phrase beats a complicated short string. Avoid anything you&apos;ve reused
          from elsewhere.
        </p>
      </section>

      <section className="card security-sections">
        <h3>URL shortener, same principle</h3>
        <p>
          When you shorten a URL, your browser splits the URL at the first <code>#</code> and
          sends <em>only</em> the part before the <code>#</code>. If you shorten a Vanish link
          like <code>hy.gl/m/abc#KEY</code>, the server stores <code>hy.gl/m/abc</code>; the key
          stays in your browser. When someone visits the short link, their browser re-attaches
          the fragment automatically during the redirect — a standard browser behaviour that
          preserves zero-knowledge for shortened notes.
        </p>
      </section>

      <section className="card security-sections">
        <h3>The honest caveats</h3>
        <ul>
          <li>
            <strong>If the link is lost, the note is unrecoverable.</strong> The operator cannot
            recover it; we don&apos;t have the key. This is by design.
          </li>
          <li>
            <strong>If you set a password and forget it, the note is unrecoverable.</strong> We
            can&apos;t reset it, bypass it, or brute-force it for you — we never saw it.
          </li>
          <li>
            <strong>Anyone with the link can read it</strong> until it expires (or, if you added
            a password, anyone with both the link and the password).
          </li>
          <li>
            <strong>The safety depends on the JavaScript this site serves.</strong> If the
            hosting provider or the site operator is compromised and serves modified code, the
            encryption guarantee could be subverted silently. This is the inherent limitation of
            browser-based crypto. For a hard threat model, use a native tool with signed
            binaries.
          </li>
          <li>
            <strong>Your browser history keeps the link.</strong> The URL (including the key
            after <code>#</code>) stays in history, in bookmarks, and in the clipboard when you
            copy it. Use private browsing for sensitive notes.
          </li>
          <li>
            <strong>Browser extensions can read the page.</strong> Extensions that have
            permission to read or modify pages can see the textarea. Disable extensions you
            don&apos;t trust before pasting a secret.
          </li>
          <li>
            <strong>We log standard web request metadata.</strong> IP, user-agent, timing — the
            typical stuff kept by any Vercel-hosted site, for roughly an hour. Plaintext never
            appears in those logs because the server never receives plaintext. For stronger
            anonymity, reach the site via Tor or a VPN.
          </li>
        </ul>
      </section>

      <section className="card security-sections">
        <h3>Cryptographic details</h3>
        <ul>
          <li>
            <strong>Cipher:</strong> AES-256 in GCM mode (authenticated encryption). 96-bit IV,
            128-bit auth tag. Browser implementation (<code>SubtleCrypto</code>).
          </li>
          <li>
            <strong>URL key:</strong> 256 bits from <code>crypto.getRandomValues</code>, fresh
            per note. Encoded as base64url (~43 chars) and placed in the URL fragment.
          </li>
          <li>
            <strong>Password derivation (optional):</strong> PBKDF2-SHA256, 600,000 iterations,
            128-bit random salt. The derived bits are combined with the URL key via HKDF-SHA256
            (<code>info = &quot;vanish-v1-password&quot;</code>) to produce the AES-GCM key.
          </li>
          <li>
            <strong>Paste ID:</strong> 96 bits of random from <code>crypto.getRandomValues</code>
            . Unguessable.
          </li>
          <li>
            <strong>Storage:</strong> Upstash Redis with server-set TTL and <code>NX</code> (so
            the same ID can never collide).
          </li>
          <li>
            <strong>Transport:</strong> HTTPS with HSTS preload header. Server refuses to run
            without TLS.
          </li>
        </ul>
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <a className="btn" href="/">create an encrypted note</a>
          <a className="btn btn-secondary" href="/s">shorten a link</a>
        </div>
      </section>
    </div>
  );
}
