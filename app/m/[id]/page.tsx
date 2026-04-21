'use client';

import { use, useCallback, useEffect, useState } from 'react';
import {
  combineKeys,
  decrypt,
  derivePasswordKey,
  fromBase64url,
  importAesGcmKey,
} from '@/lib/crypto';

type Fetched = {
  ciphertext: string;
  iv: string;
  expiresAt: number;
  salt?: string;
};

type State =
  | { kind: 'loading' }
  | { kind: 'needs_key' }
  | { kind: 'need_password'; data: Fetched; urlKey: string; error?: string }
  | { kind: 'decrypting' }
  | { kind: 'ok'; plaintext: string; expiresAt: number }
  | { kind: 'vanished' }
  | { kind: 'error'; message: string };

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [now, setNow] = useState(() => Date.now());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.kind !== 'ok') return;
    const expiresAt = state.expiresAt;

    const check = () => {
      const t = Date.now();
      if (t >= expiresAt) {
        setState({ kind: 'vanished' });
      } else {
        setNow(t);
      }
    };

    check();
    const timer = setInterval(check, 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onFocus = () => check();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const keyStr = window.location.hash.replace(/^#/, '');
      if (!keyStr) {
        setState({ kind: 'needs_key' });
        return;
      }

      try {
        const res = await fetch(`/api/get/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (res.status === 404) {
          if (!cancelled)
            setState({ kind: 'error', message: 'This note has expired or never existed.' });
          return;
        }
        if (!res.ok) {
          if (!cancelled) setState({ kind: 'error', message: `Server returned ${res.status}.` });
          return;
        }

        const data = (await res.json()) as Fetched;
        if (cancelled) return;

        if (data.salt) {
          setState({ kind: 'need_password', data, urlKey: keyStr });
          return;
        }

        setState({ kind: 'decrypting' });
        const urlKey = await importAesGcmKey(fromBase64url(keyStr), ['decrypt']);
        const plaintext = await decrypt(data.ciphertext, data.iv, urlKey);

        if (cancelled) return;
        setState({ kind: 'ok', plaintext, expiresAt: data.expiresAt });
      } catch (e: unknown) {
        if (cancelled) return;
        setState({ kind: 'error', message: decryptErrorMessage(e) });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tryPassword = useCallback(async () => {
    if (state.kind !== 'need_password') return;
    if (!password) {
      setState({ ...state, error: 'Enter the password you received out-of-band.' });
      return;
    }
    const { data, urlKey } = state;
    setState({ kind: 'decrypting' });
    try {
      const salt = fromBase64url(data.salt!);
      const urlKeyRaw = fromBase64url(urlKey);
      const pwKeyRaw = await derivePasswordKey(password, salt);
      const combined = await combineKeys(urlKeyRaw, pwKeyRaw, salt);
      const plaintext = await decrypt(data.ciphertext, data.iv, combined);
      setPassword('');
      setState({ kind: 'ok', plaintext, expiresAt: data.expiresAt });
    } catch (e: unknown) {
      setPassword('');
      setState({
        kind: 'need_password',
        data,
        urlKey,
        error: 'Decryption failed. Wrong password, or the note was tampered with.',
      });
    }
  }, [state, password]);

  if (state.kind === 'loading') {
    return (
      <section className="card stack">
        <h2>fetching ciphertext…</h2>
        <div className="hint">
          The server returns only an encrypted blob. Decryption happens in your browser.
        </div>
      </section>
    );
  }

  if (state.kind === 'decrypting') {
    return (
      <section className="card stack">
        <h2>decrypting…</h2>
        <div className="hint">
          Deriving the key and decrypting locally. The password (if any) never leaves your device.
        </div>
      </section>
    );
  }

  if (state.kind === 'need_password') {
    return (
      <section className="card stack">
        <span className="lock">password required</span>
        <h1 style={{ marginTop: 12 }}>This note is password-protected</h1>
        <p className="intro">
          The sender encrypted this note with both a link key and a password. The link alone is
          not enough. Enter the password they shared with you out-of-band.
        </p>
        <div className="pw-row">
          <input
            type={showPassword ? 'text' : 'password'}
            className="url-input"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryPassword();
            }}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
          />
          <button
            type="button"
            className="btn btn-secondary pw-show"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? 'hide' : 'show'}
          </button>
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={tryPassword}>
            unlock
          </button>
          {state.error ? <span className="status err">{state.error}</span> : null}
        </div>
        <div className="hint">
          Wrong password? The sender is the only one who knows it — we never received it and
          cannot recover it.
        </div>
      </section>
    );
  }

  if (state.kind === 'needs_key') {
    return (
      <section className="card stack">
        <h1>No decryption key in this URL</h1>
        <p className="intro">
          The part of the link after <code>#</code> is missing. Without it, the ciphertext on our
          server cannot be decrypted — we don&apos;t have the key. Ask the sender to share the
          full link.
        </p>
        <a className="btn btn-secondary" href="/">create a new note</a>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="card stack">
        <h1>Cannot open this note</h1>
        <p className="intro">{state.message}</p>
        <a className="btn" href="/">create a new note</a>
      </section>
    );
  }

  if (state.kind === 'vanished') {
    return (
      <section className="card stack">
        <span className="lock lock-danger">vanished</span>
        <h1 style={{ marginTop: 12 }}>This note has vanished</h1>
        <p className="intro">
          The TTL elapsed. The ciphertext has been dropped from the server and the plaintext has
          been cleared from this tab. Nothing further can be recovered — not even by us.
        </p>
        <div className="row">
          <a className="btn" href="/">create a new note</a>
        </div>
      </section>
    );
  }

  const remainingMs = Math.max(0, state.expiresAt - now);
  const remaining = formatRemaining(remainingMs);
  const expired = remainingMs <= 0;

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="lock">decrypted locally</span>
        <span className="countdown">
          {expired ? (
            <strong>expired</strong>
          ) : (
            <>
              expires in <strong>{remaining}</strong>
            </>
          )}
        </span>
      </div>
      <div className="view-text">{state.plaintext}</div>
      <div className="row">
        <CopyButton text={state.plaintext} />
        <a className="btn btn-secondary" href="/">new note</a>
      </div>
      <div className="divider" />
      <div className="hint">
        The server only ever held a ciphertext blob, not this text. The blob is scheduled for
        deletion at{' '}
        <strong style={{ color: 'var(--text)' }}>
          {new Date(state.expiresAt).toLocaleString()}
        </strong>
        ; after that this link stops working. The plaintext you are reading exists only in this
        browser tab — close the tab to clear it from memory. <a href="/security">How it works →</a>
      </div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? 'copied' : 'copy text'}
    </button>
  );
}

function decryptErrorMessage(e: unknown): string {
  if (e instanceof Error && e.name === 'OperationError') {
    return 'Decryption failed — the link is incorrect or the note has been tampered with.';
  }
  if (e instanceof Error) return e.message;
  return 'Unknown error.';
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
