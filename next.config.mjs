/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self' data:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const noStore = [
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/m/:path*', headers: noStore },
      { source: '/s/:path*', headers: noStore },
      { source: '/api/:path*', headers: noStore },
    ];
  },
};

export default nextConfig;
