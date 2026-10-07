// Vercel evaluates this at deployment time. Only the approved production
// target may proxy dynamic sitemap requests to the production API.
const production = process.env.VERCEL_ENV === 'production' &&
  process.env.VITE_DEPLOY_ENV === 'production';

export const config = {
  // Hold the production Git trigger through the Azure/API transition.
  // Restore main only in the separately recorded frontend release step.
  git: { deploymentEnabled: { main: false } },
  buildCommand: 'pnpm build:frontend',
  outputDirectory: 'dist/public',
  framework: null,
  routes: [
    // Explicit routes compile before the top-level headers property. Apply
    // protection before any terminating asset, sitemap or SPA route.
    {
      src: '/(.*)',
      headers: {
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        ...(!production ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
      },
      continue: true,
    },
    ...(production
      ? [
          { src: '/robots.txt', dest: 'https://api.propertylistifysa.co.za/robots.txt' },
          { src: '/sitemap.xml', dest: 'https://api.propertylistifysa.co.za/sitemap.xml' },
          { src: '/sitemap-(.*)\\.xml', dest: 'https://api.propertylistifysa.co.za/sitemap-$1.xml' },
        ]
      : [
          { src: '/robots.txt', dest: '/robots-staging.txt' },
          { src: '/sitemap(.*)\\.xml', dest: '/sitemap-staging.xml' },
        ]),
    { src: '/assets/(.*)', dest: '/assets/$1' },
    { src: '/version.json', dest: '/version.json' },
    { src: '/(.*)', dest: '/index.html' },
  ],
};
