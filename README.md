# Vanish

End-to-end encrypted notes that expire, plus a fragment-preserving URL shortener. Live at **[hy.gl](https://hy.gl)**.

- Write a note → pick any expiry (1 min → 30 days) → share a link.
- Optional password (PBKDF2-600k + HKDF) adds a second factor.
- The server only ever sees ciphertext; the key lives in the URL fragment, which browsers never transmit.
- When the TTL elapses, the ciphertext is atomically deleted in Redis and the open tab drops the plaintext from memory.

A full plain-English walkthrough of the model — including what we can and cannot see, and how to verify it in DevTools — is at `/security` on the live site (see `app/security/page.tsx`).

## Architecture

```
app/
├── layout.tsx               chrome + nav
├── page.tsx                 create a note (client-side encrypt)
├── m/[id]/page.tsx          view a note (client-side decrypt + auto-vanish)
├── s/page.tsx               URL shortener form
├── s/[id]/page.tsx          server-side 307 redirect
├── security/page.tsx        full explainer
├── terms/page.tsx           terms of service
├── components/DurationPicker.tsx
└── api/
    ├── create/route.ts      store ciphertext with TTL
    ├── get/[id]/route.ts    return ciphertext by id
    └── short/create/route.ts store short-link mapping

lib/
├── crypto.ts                AES-GCM, PBKDF2, HKDF helpers
├── redis.ts                 Upstash Redis client (lazy)
└── time.ts                  duration helpers
```

Everything interesting sits in two files:

- `lib/crypto.ts` — the cryptographic primitives. Keep it small so it stays auditable.
- `app/page.tsx` / `app/m/[id]/page.tsx` — where plaintext briefly exists, on create and view respectively. Nothing else touches plaintext.

## Cryptography

- **Cipher:** AES-256-GCM (authenticated). 96-bit IV, 128-bit auth tag.
- **URL key:** 256 random bits from `crypto.getRandomValues`, placed in the URL `#fragment`.
- **Optional password:** PBKDF2-SHA256 @ 600,000 iterations over a random 128-bit salt → combined with the URL key via HKDF-SHA256 (`info = "vanish-v1-password"`) to produce the AES-GCM key. The password is never transmitted.
- **Paste ID:** 96 random bits. Unguessable.
- **Storage:** Upstash Redis with server-set TTL and `NX` (so an ID can never collide).
- **Transport:** HTTPS with HSTS.

## URL shortener

- Paste any URL → pick expiry (1 min → 5 years) → get `hy.gl/s/XXXXXXXX`.
- Fragments are split off **client-side** before the URL hits the server, so shortening a Vanish link (`hy.gl/m/abc#KEY`) preserves zero-knowledge. The server stores only `hy.gl/m/abc`; the browser re-attaches the fragment on redirect.
- Rejects `javascript:`/`data:` schemes and self-referential short-links.

## Deploy

Stack: Next.js 16 (App Router, edge runtime), React 19, Upstash Redis, Vercel.

```bash
pnpm install
pnpm build
```

Required env vars (from a Vercel-KV / Upstash integration, either pair works):

```
KV_REST_API_URL=
KV_REST_API_TOKEN=
# or
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Local dev (after exporting one of the above pairs):

```bash
pnpm dev
```

## Contributing

This is experimental software (see `app/terms/page.tsx`). Small, focused PRs are welcome, especially around:

- Hardening the client-JS trust boundary (CSP nonces + service-worker tripwire).
- Anonymous rate-limiting (PrivacyPass / hashcash) in `/api/create` and `/api/short/create`.
- An onion-service alternative path for zero-IP submission.

Please read `SECURITY.md` before reporting anything security-related.

## License

MIT — see `LICENSE`. No warranty. Use at your own risk.
