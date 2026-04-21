'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  base64url,
  combineKeys,
  derivePasswordKey,
  encrypt,
  generateKeyRaw,
  importAesGcmKey,
  randomSalt,
} from '@/lib/crypto';
import { DurationPicker } from '@/app/components/DurationPicker';
import { UNITS_SHORT, formatDurationHuman } from '@/lib/time';

const QUICK_PICKS = [
  { label: '5m', seconds: 300 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
  { label: '6h', seconds: 21600 },
  { label: '1d', seconds: 86400 },
  { label: '1w', seconds: 604800 },
];

const MIN_TTL = 60;
const MAX_TTL = 2592000;
const MAX_PLAINTEXT_BYTES = 360 * 1024;
const MIN_PASSWORD = 4;

type SentProof = {
  ciphertext: string;
  iv: string;
  ttl: number;
  bodyJson: string;
  keyPreview: string;
  passwordUsed: boolean;
};

type CreateResult = {
  url: string;
  expiresAt: number;
  proof: SentProof;
};

export default function CreatePage() {
  const [text, setText] = useState('');
  const [ttl, setTtl] = useState<number>(3600);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  const byteLen = useMemo(() => new TextEncoder().encode(text).length, [text]);
  const pwStrength = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    const handler = () => {
      setText('');
      setPassword('');
    };
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, []);

  const submit = useCallback(async () => {
    setErr(null);
    setCopied(false);
    if (!text) return setErr('nothing to encrypt.');
    if (byteLen > MAX_PLAINTEXT_BYTES) {
      return setErr(
        `too large: ${byteLen.toLocaleString()} bytes (max ${MAX_PLAINTEXT_BYTES.toLocaleString()}).`
      );
    }
    if (ttl < MIN_TTL || ttl > MAX_TTL) {
      return setErr(
        `expiry must be between ${formatDurationHuman(MIN_TTL)} and ${formatDurationHuman(MAX_TTL)}.`
      );
    }
    if (usePassword && password.length < MIN_PASSWORD) {
      return setErr(`password must be at least ${MIN_PASSWORD} characters.`);
    }

    setSubmitting(true);
    try {
      const urlKeyRaw = await generateKeyRaw();
      let aesKey;
      let saltStr: string | undefined;

      if (usePassword) {
        setPhase('deriving key from password…');
        const salt = randomSalt();
        const pwKeyRaw = await derivePasswordKey(password, salt);
        aesKey = await combineKeys(urlKeyRaw, pwKeyRaw, salt);
        saltStr = base64url(salt);
      } else {
        aesKey = await importAesGcmKey(urlKeyRaw, ['encrypt']);
      }

      setPhase('encrypting…');
      const { ciphertext, iv } = await encrypt(text, aesKey);
      const keyStr = base64url(urlKeyRaw);

      const body = JSON.stringify(saltStr ? { ciphertext, iv, ttl, salt: saltStr } : { ciphertext, iv, ttl });

      setPhase('sending ciphertext…');
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorMessage(j.error, res.status));
      }
      const { id, expiresAt } = (await res.json()) as { id: string; expiresAt: number };

      const url = `${window.location.origin}/m/${id}#${keyStr}`;
      setResult({
        url,
        expiresAt,
        proof: {
          ciphertext,
          iv,
          ttl,
          bodyJson: body,
          keyPreview: keyStr.slice(0, 8) + '…',
          passwordUsed: usePassword,
        },
      });
      setText('');
      setPassword('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'something went wrong.');
    } finally {
      setSubmitting(false);
      setPhase('');
    }
  }, [text, ttl, byteLen, usePassword, password]);

  const copy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [result]);

  const reset = useCallback(() => {
    setResult(null);
    setErr(null);
    setCopied(false);
  }, []);

  if (result) {
    return (
      <section className="card stack">
        <div>
          <span className="lock">
            {result.proof.passwordUsed ? 'encrypted · password required' : 'encrypted'}
          </span>
          <h1 style={{ marginTop: 12 }}>Your link is ready</h1>
          <p className="intro">
            The ciphertext on our server will be deleted automatically at{' '}
            <strong>{new Date(result.expiresAt).toLocaleString()}</strong>. After that, this link
            stops working. The plaintext only exists in this browser tab and in the link you
            share.
          </p>
          {result.proof.passwordUsed ? (
            <p className="intro">
              This note is <strong>password-protected</strong>. The link alone is not enough —
              share the password through a different channel (a phone call, a signal message).
              We never received the password.
            </p>
          ) : null}
        </div>
        <div className="url-box">
          <code>{result.url}</code>
          <button onClick={copy} type="button">
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        <div className="hint">
          {result.proof.passwordUsed
            ? 'Anyone with the link AND the password can decrypt. If either is lost, the note is unrecoverable.'
            : 'Anyone with this link can decrypt. If the link is lost, the note is unrecoverable — not even the operator has the key.'}
        </div>

        <ProofPanel proof={result.proof} />

        <div className="row">
          <button className="btn" onClick={reset} type="button">
            new note
          </button>
          <a className="btn btn-secondary" href={result.url} target="_blank" rel="noreferrer noopener">
            open link
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="card stack">
      <div>
        <span className="lock">nothing sent yet</span>
        <h1 style={{ marginTop: 12 }}>Write something that will vanish</h1>
        <p className="intro">
          Your message is encrypted on this device the moment you submit. Only ciphertext leaves
          your browser; we never see the text or the key.{' '}
          <a href="/security">How it works →</a>
        </p>
      </div>

      <div>
        <label htmlFor="msg">message</label>
        <textarea
          id="msg"
          name="msg"
          placeholder="Credentials, a poem, a secret…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
        />
        <div className="hint" style={{ marginTop: 8 }}>
          {byteLen.toLocaleString()} / {MAX_PLAINTEXT_BYTES.toLocaleString()} bytes · spellcheck
          and autocomplete disabled
        </div>
      </div>

      <div>
        <label>expires after</label>
        <DurationPicker
          value={ttl}
          onChange={setTtl}
          units={UNITS_SHORT}
          quickPicks={QUICK_PICKS}
          min={MIN_TTL}
          max={MAX_TTL}
        />
      </div>

      <div>
        <div className="pw-toggle">
          <label
            className="pw-toggle-label"
            htmlFor="use-pw"
            style={{ textTransform: 'none', letterSpacing: 0 }}
          >
            <input
              id="use-pw"
              type="checkbox"
              checked={usePassword}
              onChange={(e) => setUsePassword(e.target.checked)}
            />
            <span>
              Also require a password to open{' '}
              <span className="pw-toggle-tag">extra factor</span>
            </span>
          </label>
        </div>
        {usePassword ? (
          <div className="pw-panel">
            <div className="pw-row">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="choose a password (min 4 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="url-input"
                autoComplete="new-password"
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
            <div className="pw-meta">
              <PasswordStrengthBar strength={pwStrength} />
              <span className="hint">
                The recipient will need both the link and this password. We never receive it;
                it&apos;s run through PBKDF2-600k in your browser to derive part of the key.
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="row">
        <button className="btn" onClick={submit} disabled={submitting || !text} type="button">
          {submitting ? phase || 'encrypting…' : 'encrypt & create link'}
        </button>
        {err ? <span className="status err">{err}</span> : null}
      </div>

      <div className="divider" />
      <div className="hint">
        Until you press the button above, nothing has left this page — no drafts, no autosaves,
        no keystroke telemetry. Verify in <strong>DevTools → Network</strong>.
      </div>
    </section>
  );
}

type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

function scorePassword(pw: string): PasswordStrength {
  if (pw.length === 0) return { score: 0, label: '' };
  if (pw.length < MIN_PASSWORD) return { score: 0, label: 'too short' };
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/[0-9]/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  const lenScore = Math.min(3, Math.floor((pw.length - MIN_PASSWORD) / 4));
  const total = Math.min(4, variety + lenScore) as 0 | 1 | 2 | 3 | 4;
  const labels = ['weak', 'weak', 'fair', 'strong', 'very strong'];
  return { score: total, label: labels[total] };
}

function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
  return (
    <div className="pw-strength" aria-label={`password strength: ${strength.label}`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`pw-bar ${i < strength.score ? 'on' : ''}`} />
      ))}
      {strength.label ? <span className="pw-label">{strength.label}</span> : null}
    </div>
  );
}

function ProofPanel({ proof }: { proof: SentProof }) {
  const short = (s: string, n = 56) => (s.length > n ? s.slice(0, n) + '…' : s);
  return (
    <div className="proof">
      <div className="proof-title">
        <span>what we sent</span>
        <span className="mute">POST /api/create</span>
      </div>
      <div>
        <span className="mute">ciphertext:</span>{' '}
        <span className="kv">{short(proof.ciphertext)}</span>
      </div>
      <div>
        <span className="mute">iv:</span> <span className="kv">{proof.iv}</span>
      </div>
      <div>
        <span className="mute">ttl:</span> <span className="kv">{proof.ttl}s</span>
      </div>
      {proof.passwordUsed ? (
        <div>
          <span className="mute">salt:</span>{' '}
          <span className="kv">(16 random bytes — sent so the recipient can re-derive the password key)</span>
        </div>
      ) : null}
      <div style={{ marginTop: 10 }}>
        <span className="mute">URL key (kept locally, in link only):</span>{' '}
        <span className="kv">{proof.keyPreview}</span>
        {proof.passwordUsed ? (
          <>
            <br />
            <span className="mute">password (held only in your head):</span>{' '}
            <span className="kv">never transmitted</span>
          </>
        ) : null}
      </div>
      <pre>{proof.bodyJson}</pre>
      <div style={{ marginTop: 8 }}>
        No plaintext left your browser. Open <strong>DevTools → Network</strong> to confirm.
      </div>
    </div>
  );
}

function errorMessage(code: unknown, status: number): string {
  switch (code) {
    case 'ciphertext_too_large':
      return 'message is too large.';
    case 'invalid_ttl':
      return 'invalid expiry.';
    case 'invalid_salt':
      return 'invalid salt.';
    case 'storage_not_configured':
      return 'storage is not configured on the server.';
    case 'storage_error':
      return 'storage error — try again.';
    default:
      return `request failed (${status}).`;
  }
}
