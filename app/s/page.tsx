'use client';

import { useCallback, useMemo, useState } from 'react';
import { DurationPicker } from '@/app/components/DurationPicker';
import { UNITS_LONG, formatDurationHuman } from '@/lib/time';

const QUICK_PICKS = [
  { label: '1d', seconds: 86400 },
  { label: '1w', seconds: 604800 },
  { label: '30d', seconds: 2592000 },
  { label: '1y', seconds: 31536000 },
];

const MIN_TTL = 60;
const MAX_TTL = 157680000;
const MAX_URL_LENGTH = 4096;

type SplitUrl = { base: string; fragment: string };

function splitUrl(input: string): SplitUrl {
  const trimmed = input.trim();
  const idx = trimmed.indexOf('#');
  if (idx < 0) return { base: trimmed, fragment: '' };
  return { base: trimmed.slice(0, idx), fragment: trimmed.slice(idx + 1) };
}

function isValidTarget(base: string): { ok: true; normalized: string } | { ok: false; reason: string } {
  if (base.length === 0) return { ok: false, reason: 'Paste a URL to shorten.' };
  if (base.length > MAX_URL_LENGTH) return { ok: false, reason: 'URL is too long.' };
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    return { ok: false, reason: 'That is not a valid URL.' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, reason: 'Only http:// and https:// links can be shortened.' };
  }
  if (typeof window !== 'undefined' && u.host.toLowerCase() === window.location.host.toLowerCase()) {
    if (u.pathname.startsWith('/s/')) {
      return { ok: false, reason: 'Cannot shorten a short link (loop).' };
    }
  }
  return { ok: true, normalized: u.toString() };
}

export default function ShortenerPage() {
  const [input, setInput] = useState('');
  const [ttl, setTtl] = useState<number>(2592000);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; expiresAt: number; fragment: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const hasFragment = useMemo(() => splitUrl(input).fragment.length > 0, [input]);

  const submit = useCallback(async () => {
    setErr(null);
    setCopied(false);

    const { base, fragment } = splitUrl(input);
    const check = isValidTarget(base);
    if (!check.ok) return setErr(check.reason);

    if (ttl < MIN_TTL || ttl > MAX_TTL) {
      return setErr(
        `expiry must be between ${formatDurationHuman(MIN_TTL)} and ${formatDurationHuman(MAX_TTL)}.`
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/short/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: check.normalized, ttl }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorMessage(j.error, res.status));
      }

      const { id, expiresAt } = (await res.json()) as { id: string; expiresAt: number };
      const shortUrl = `${window.location.origin}/s/${id}` + (fragment ? `#${fragment}` : '');
      setResult({ url: shortUrl, expiresAt, fragment });
      setInput('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [input, ttl]);

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
          <span className="lock">short link ready</span>
          <h1 style={{ marginTop: 12 }}>Your short link</h1>
          <p className="intro">
            Expires <strong>{new Date(result.expiresAt).toLocaleString()}</strong>.{' '}
            {result.fragment ? (
              <>
                The <code>#</code>-fragment from your original URL lives only on the short link in
                your browser — our server never received it.
              </>
            ) : null}
          </p>
        </div>
        <div className="url-box">
          <code>{result.url}</code>
          <button onClick={copy} type="button">
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        <div className="row">
          <button className="btn" onClick={reset} type="button">
            shorten another
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
        <h1>Shorten a link</h1>
        <p className="intro">
          Paste a URL, pick how long it should live, and get a short link. If your URL has a{' '}
          <code>#</code>-fragment (like a Vanish note key), your browser splits it off before
          sending — the server never sees what&apos;s after the <code>#</code>.
        </p>
      </div>

      <div>
        <label htmlFor="url">long URL</label>
        <input
          id="url"
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://example.com/very/long/path?…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-lpignore="true"
          data-1p-ignore="true"
          className="url-input"
        />
        {hasFragment ? (
          <div className="hint" style={{ marginTop: 8 }}>
            Detected a <code>#</code>-fragment — it stays on the short link only, never on the
            server.
          </div>
        ) : null}
      </div>

      <div>
        <label>expires after</label>
        <DurationPicker
          value={ttl}
          onChange={setTtl}
          units={UNITS_LONG}
          quickPicks={QUICK_PICKS}
          min={MIN_TTL}
          max={MAX_TTL}
        />
      </div>

      <div className="row">
        <button className="btn" onClick={submit} disabled={submitting || !input} type="button">
          {submitting ? 'shortening…' : 'create short link'}
        </button>
        {err ? <span className="status err">{err}</span> : null}
      </div>
    </section>
  );
}

function errorMessage(code: string | undefined, status: number): string {
  switch (code) {
    case 'invalid_url':
      return 'That URL was rejected by the server.';
    case 'invalid_ttl':
      return 'Invalid expiry.';
    case 'storage_not_configured':
      return 'Storage not configured.';
    case 'storage_error':
      return 'Storage error — try again.';
    default:
      return `Request failed (${status}).`;
  }
}
