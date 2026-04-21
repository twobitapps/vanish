# Edge log-stripping Worker

Runs on Cloudflare Workers, bound to `hy.gl` and `www.hy.gl` as a Custom Domain.
Sits in front of the Vercel deployment and removes every identifying request
header before the request reaches origin.

## What gets stripped

- `CF-Connecting-IP`, `CF-Connecting-IPv6`, `CF-IPCountry`, `CF-IPCity`,
  `CF-IPContinent`, `CF-IPLatitude`, `CF-IPLongitude`, `CF-Region`,
  `CF-Region-Code`, `CF-Timezone`, `CF-Postal-Code`, `CF-Metro-Code`,
  `CF-Visitor`, `CF-EW-Via`, `CF-Worker`
- `X-Forwarded-For`, `X-Real-IP`, `True-Client-IP`, `Fastly-Client-IP`,
  `X-Client-IP`, `Forwarded`
- `User-Agent`, `Accept-Language`, `Accept-Encoding`, `Referer`, `Referrer`,
  `DNT`, `Save-Data`
- `Sec-CH-UA-*` client-hint fingerprinting headers
- `Device-Memory`, `Viewport-Width`, `Width`

## What origin sees

After stripping, the Worker sets:
- `X-Forwarded-For: 0.0.0.0`
- `User-Agent: vanish-edge`
- `X-Vanish-Proxy: 1`

So Vercel's request logs record `0.0.0.0` + a constant UA. No geo signal, no
client hints, no language fingerprint. The hosting edge cannot distinguish
users beyond timing and request size (both of which are inherent).

## Trust boundary

- Cloudflare's edge still sees the real client IP (CF terminates TLS, reads
  the incoming request). CF retains this for ~24h in edge logs.
- Vercel sees only what the Worker forwards.
- Upstash Redis never sees user-identifying headers — it only gets the
  ciphertext that Vercel's edge function writes.

Net effect: we traded "Vercel sees IP ~1h" for "Cloudflare sees IP ~24h" while
our application logs (Vercel + Upstash) become opaque. CF has a stronger track
record around log suppression and offers log-drain-to-nothing options that we
can tighten further later.

## Deploy

Not automated. Pushed manually via the Cloudflare API as a Module Worker and
bound via `PUT /accounts/:account/workers/domains` to both `hy.gl` and
`www.hy.gl`. Reproduce with:

```bash
curl -X PUT \
  -H "Authorization: Bearer $CF_TOKEN" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2026-04-21"};type=application/json' \
  -F 'worker.js=@edge/worker.js;filename=worker.js;type=application/javascript+module' \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/workers/scripts/vanish-proxy"
```
