// Vercel evaluates this at deployment time. Only the approved production
// target may proxy dynamic sitemap requests to the production API.
const production = process.env.VERCEL_ENV === 'production' &&
  process.env.VITE_DEPLOY_ENV === 'production';

export const config = {
  buildCommand: 'pnpm build:frontend',
  outputDirectory: 'dist/public',
  framework: null,
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        ...(!production ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
      ],
    },
  ],
  routes: [
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
