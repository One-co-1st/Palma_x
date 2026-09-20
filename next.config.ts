import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
  },
  {
    // PALMA renders no third-party embeds. Keep the policy tight and explicit.
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Next.js injects inline bootstrap scripts and style tags.
      "script-src 'self' 'unsafe-inline'" +
        (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'" + (process.env.NODE_ENV === 'development' ? ' ws: wss:' : ''),
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    /**
     * No remote patterns, deliberately.
     *
     * Every image PALMA renders is served from PALMA: portraits are re-encoded
     * and stored in the database, and the marks and engravings are in the
     * bundle. An optimizer that will fetch any HTTPS host on request is an open
     * proxy — anybody can point it at an internal address or use PALMA's
     * bandwidth to serve their own images — and there is nothing here that
     * needs one.
     *
     * If a sponsor logo or a Journal hero ever has to come from elsewhere, add
     * that host here explicitly rather than reopening the wildcard.
     */
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        // The well-known documents are small, stable and read by machines.
        source: '/.well-known/:path*',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/humans.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },

  async redirects() {
    return [
      {
        // RFC 8615. Password managers follow this when offering to change a
        // stored credential, so it has to land on the page that changes one —
        // it used to point at /portal, which is now the moderation desk.
        source: '/.well-known/change-password',
        destination: '/account',
        permanent: false,
      },
      {
        // The other half of the same convention: somebody who cannot sign in
        // needs the reset, not the change form.
        source: '/.well-known/reset-password',
        destination: '/forgot',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
