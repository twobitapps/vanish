// Log-stripping edge proxy for hy.gl.
// Deletes every identifying request header (CF-*, X-Forwarded-For, User-Agent,
// Accept-Language, Referer, etc.) and replaces them with constants before the
// request is forwarded to Vercel. Vercel's logs see 0.0.0.0 + a constant UA.
// The key has never touched the HTTP body (URL fragment only), so this merely
// removes the last bits of identifying metadata from the origin's view.

const STRIP_HEADERS = [
  // Cloudflare identity/geo leakage
  'cf-connecting-ip',
  'cf-connecting-ipv6',
  'cf-ipcountry',
  'cf-ipcity',
  'cf-ipcontinent',
  'cf-iplatitude',
  'cf-iplongitude',
  'cf-region',
  'cf-region-code',
  'cf-timezone',
  'cf-postal-code',
  'cf-metro-code',
  'cf-visitor',
  'cf-ew-via',
  'cf-worker',
  // Generic proxy/identity headers
  'x-forwarded-for',
  'x-real-ip',
  'true-client-ip',
  'fastly-client-ip',
  'x-client-ip',
  'forwarded',
  // User-agent + locale + referer
  'user-agent',
  'accept-language',
  'accept-encoding',
  'referer',
  'referrer',
  'dnt',
  'save-data',
  // Sec-CH-* client hints fingerprinting
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-ch-ua-platform-version',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-arch',
  'sec-ch-ua-bitness',
  'sec-ch-ua-model',
  'sec-ch-ua-wow64',
  'sec-ch-prefers-color-scheme',
  'sec-ch-prefers-reduced-motion',
  'device-memory',
  'viewport-width',
  'width',
];

const ORIGIN = 'https://vanish-hyperdev-1.vercel.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const originUrl = ORIGIN + url.pathname + url.search;

    const headers = new Headers(request.headers);
    for (const h of STRIP_HEADERS) headers.delete(h);
    headers.set('x-forwarded-for', '0.0.0.0');
    headers.set('user-agent', 'vanish-edge');
    headers.set('x-vanish-proxy', '1');

    const response = await fetch(originUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });

    const out = new Response(response.body, response);
    out.headers.set('x-vanish-proxy', '1');
    return out;
  },
};
