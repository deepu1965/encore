/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Lint is run explicitly in CI via `npm run lint`; don't fail the build twice.
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      // Event posters / media come from the backend object store; widened per-env later.
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/v1/:path*',
          destination: 'http://localhost:8000/api/v1/:path*',
        },
        {
          source: '/health',
          destination: 'http://localhost:8000/health',
        },
      ],
    };
  },
  async redirects() {
    return [
      { source: '/app', destination: '/', permanent: false },
      { source: '/app/home', destination: '/', permanent: false },
      { source: '/app/discover', destination: '/explore', permanent: false },
      { source: '/app/events', destination: '/explore', permanent: false },
      { source: '/app/events/:eventId', destination: '/events/:eventId', permanent: false },
      { source: '/app/events/:eventId/seats', destination: '/events/:eventId/select-seats', permanent: false },
      { source: '/app/events/:eventId/waiting-room', destination: '/events/:eventId/waiting-room', permanent: false },
      { source: '/app/checkout', destination: '/checkout', permanent: false },
      { source: '/app/orders', destination: '/orders', permanent: false },
      { source: '/app/orders/:orderId', destination: '/orders/:orderId', permanent: false },
      { source: '/app/tickets', destination: '/tickets', permanent: false },
      { source: '/app/tickets/:ticketId', destination: '/tickets/:ticketId', permanent: false },
      { source: '/app/wallet', destination: '/wallet', permanent: false },
      { source: '/app/resale', destination: '/resale', permanent: false },
      { source: '/app/resale/listings', destination: '/resale', permanent: false },
      { source: '/app/resale/listings/:listingId', destination: '/resale/listings/:listingId', permanent: false },
      { source: '/app/notifications', destination: '/notifications', permanent: false },
      { source: '/app/profile', destination: '/profile', permanent: false },
      { source: '/app/settings', destination: '/settings', permanent: false },
      { source: '/discover', destination: '/explore', permanent: false },
      { source: '/events', destination: '/explore', permanent: false },
      { source: '/about', destination: '/help', permanent: false },
      { source: '/ops/dashboard', destination: '/ops', permanent: false },
      { source: '/ops/health', destination: '/ops', permanent: false },
      { source: '/ops/flash-sales', destination: '/ops/flash-sale', permanent: false },
      { source: '/ops/audit', destination: '/ops/audit-log', permanent: false },
    ];
  },
};

export default nextConfig;
