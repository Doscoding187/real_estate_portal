import { COMMERCIAL_ACTIVATION_STATE } from '../../shared/commercialActivation';
import { COUNTRY_DISCOVERY_PATH } from '../../shared/countryDiscovery';
import { isPlaceIndexAllowlistedPath } from '../../shared/placeIndexAllowlist';
import { placePageDescription, placePageTitle } from '../../shared/placePageSeo';
import { landingPages, NAV_LANDING_ALIASES } from '../../client/src/lib/navLandingPages';
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from '../../client/src/lib/seo/structuredData';
import { publishedCanonicalPlaceUrls } from '../services/canonicalPlaceUrlService';
import { placeStructuredData } from './seoHead';

/**
 * Build-time HTML for pages whose content is known without the API.
 *
 * Every page here mirrors what the React page sets or shows after it boots (same title,
 * description, canonical and visible text), so the prerendered document and the live page
 * never disagree. The React app replaces #root on boot and updates the managed head tags in
 * place (client/src/lib/seo.ts), so nothing is duplicated.
 */
export const PRERENDER_ORIGIN = 'https://www.propertylistifysa.co.za';
export const SITE_NAME = 'Property Listify';
/** An image that exists on main. The homepage work will switch this to a branded share image. */
export const PRERENDER_SHARE_IMAGE = '/og-image.png';

export type PrerenderPlaceFamily = 'province' | 'city' | 'locality';
export type PrerenderFamily = 'home' | 'static' | 'advertise' | PrerenderPlaceFamily;

export type PrerenderPage = {
  /** Public path, e.g. /gauteng/sandton. "/" is the homepage. */
  path: string;
  family: PrerenderFamily;
  title: string;
  description: string;
  /** Path (not URL) of the canonical page. */
  canonicalPath: string;
  robots: string;
  structuredData: Record<string, unknown>[];
  /** Trusted, already-escaped HTML placed inside #root. Empty leaves #root untouched. */
  bodyHtml: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absolute(path: string): string {
  return new URL(path, PRERENDER_ORIGIN).toString();
}

function bodyBlock(parts: {
  breadcrumb?: string;
  h1: string;
  paragraphs?: string[];
  links?: { href: string; label: string }[];
}): string {
  return [
    '<main data-prerendered="true">',
    parts.breadcrumb ?? '',
    `<h1>${escapeHtml(parts.h1)}</h1>`,
    ...(parts.paragraphs ?? []).map(text => `<p>${escapeHtml(text)}</p>`),
    parts.links?.length
      ? `<ul>${parts.links
          .map(link => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
          .join('')}</ul>`
      : '',
    '</main>',
  ].join('');
}

// ---- Homepage ----------------------------------------------------------------------------

const HOME_TITLE = 'Property Listify | South African Property Search and New Developments';
const HOME_DESCRIPTION =
  'Search South African property listings, explore new developments, compare areas, and connect with agents and developers on Property Listify.';

function homePage(): PrerenderPage {
  return {
    path: '/',
    family: 'home',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    canonicalPath: '/',
    robots: 'index, follow',
    structuredData: [
      buildOrganizationStructuredData({
        name: SITE_NAME,
        url: absolute('/'),
        logoUrl: absolute('/logo.png'), // same value the live homepage passes (VITE_APP_LOGO default)
        description: HOME_DESCRIPTION,
      }),
      buildWebsiteStructuredData({
        name: SITE_NAME,
        url: absolute('/'),
        description: HOME_DESCRIPTION,
      }),
    ],
    // Mirrors the default hero (client/src/components/EnhancedHero.tsx).
    bodyHtml: bodyBlock({
      h1: "South Africa's smarter property platform",
      paragraphs: [
        'Search homes, discover new developments, explore local insights, and connect with trusted property professionals.',
      ],
    }),
  };
}

// ---- Place pages -------------------------------------------------------------------------

type PlaceEntry = ReturnType<typeof publishedCanonicalPlaceUrls>[number];

function placeFamily(entry: PlaceEntry): PrerenderPlaceFamily {
  if (entry.search_scope === 'province') return 'province';
  if (entry.search_scope === 'metro_city') return 'city';
  return 'locality';
}

/** Mirrors client/src/pages/CanonicalPlacePage.tsx for a published, indexable place. */
function placePage(entry: PlaceEntry): PrerenderPage {
  const label = entry.preferred_public_name;
  const broad = entry.search_scope === 'province' || entry.search_scope === 'metro_city';
  const context = entry.path_context
    ? entry.path_context.relationship_type === 'settlement_within'
      ? `Settlement within ${entry.path_context.name}`
      : `Administrative context: ${entry.path_context.name}`
    : entry.province_name;
  const typeLine = context
    ? `${entry.place_type.replace(/_/g, ' ')} · ${context}`
    : entry.place_type;
  const breadcrumb =
    '<nav aria-label="Breadcrumb">' +
    `<a href="${COUNTRY_DISCOVERY_PATH}">South Africa</a> / ` +
    `<span>${escapeHtml(entry.province_name)}</span> / ` +
    `<span aria-current="page">${escapeHtml(label)}</span></nav>`;
  const links = broad
    ? [
        { href: `${entry.path}?mode=sale`, label: 'Explore homes for sale' },
        { href: `${entry.path}?mode=rent`, label: 'Explore rentals' },
      ]
    : [
        {
          href: `/property-for-sale?${new URLSearchParams({ canonicalPlaceId: entry.place_id })}`,
          label: 'Search homes for sale',
        },
        {
          href: `/property-to-rent?${new URLSearchParams({ canonicalPlaceId: entry.place_id })}`,
          label: 'Search rentals',
        },
      ];
  return {
    path: entry.path,
    family: placeFamily(entry),
    title: placePageTitle(label),
    description: placePageDescription(label, entry.province_name),
    canonicalPath: entry.path,
    robots: 'index, follow',
    structuredData: placeStructuredData(entry.path),
    bodyHtml: bodyBlock({
      breadcrumb,
      h1: label,
      paragraphs: [
        typeLine,
        broad
          ? 'Choose Sale or Rent to browse published listings in exact localities within this area.'
          : 'Search listings using this canonical place. Its location scope comes from the admitted Place Authority.',
      ],
      links,
    }),
  };
}

// ---- Static pages ------------------------------------------------------------------------

function landingStaticPage(path: string): PrerenderPage {
  const config = landingPages[NAV_LANDING_ALIASES[path] ?? path];
  if (!config) throw new Error(`No landing page config for ${path}`);
  return {
    path,
    family: 'static',
    title: `${config.title} | ${SITE_NAME}`,
    description: config.description,
    canonicalPath: config.canonicalPath,
    robots: 'index, follow',
    structuredData: [],
    // Mirrors GenericNavLandingPage: eyebrow, h1, description and the primary call to action.
    bodyHtml: bodyBlock({
      h1: config.title,
      paragraphs: [config.description],
      // The page hides these two links behind journey flags; never show what the page may hide.
      links: [config.primaryCta, ...(config.secondaryCta ? [config.secondaryCta] : [])].filter(
        link =>
          !link.href.startsWith('/property-to-rent') && !link.href.startsWith('/new-developments'),
      ),
    }),
  };
}

/** Mirrors client/src/pages/LegalDocumentPage.tsx: it sets its own title as the description. */
function legalPage(path: string, kind: 'terms' | 'privacy'): PrerenderPage {
  const title = kind === 'terms' ? 'Terms of Service' : 'Privacy Notice';
  return {
    path,
    family: 'static',
    title: `${title} | ${SITE_NAME}`,
    description: title,
    canonicalPath: `/legal/${kind}`,
    robots: 'index, follow',
    structuredData: [],
    // The document text is loaded from the API in the browser, so only the heading is shared.
    bodyHtml: bodyBlock({ h1: title }),
  };
}

const TERMS_PATHS = [
  '/terms',
  '/legal/terms',
  '/legal/consumer-rights',
  '/legal/dispute-resolution',
];
const PRIVACY_PATHS = [
  '/privacy',
  '/legal/privacy',
  '/cookies',
  '/legal/cookies',
  '/compliance',
  '/legal/compliance',
];

function contactPage(): PrerenderPage {
  return {
    path: '/contact',
    family: 'static',
    title: 'Assisted onboarding request | Property Listify',
    description:
      'Request controlled onboarding assistance for your Property Listify account, workspace, or team access.',
    canonicalPath: '/contact',
    robots: 'index, follow',
    structuredData: [],
    bodyHtml: bodyBlock({
      h1: 'Request assisted onboarding support',
      paragraphs: [
        'Use this form if you need help completing your Property Listify account, professional presence, private listing preparation, or controlled team access.',
      ],
    }),
  };
}

/**
 * The advertise pages set their head with SEOHead in the "preparation" variants that render
 * while COMMERCIAL_ACTIVATION_STATE.enabled is false. They are only prerendered in that state.
 */
function advertisePages(): PrerenderPage[] {
  if (COMMERCIAL_ACTIVATION_STATE.enabled) return [];
  const page = (
    path: string,
    title: string,
    description: string,
    h1: string,
    paragraph: string,
  ): PrerenderPage => ({
    path,
    family: 'advertise',
    title,
    description,
    canonicalPath: path,
    robots: 'index, follow',
    structuredData: [],
    bodyHtml: bodyBlock({ h1, paragraphs: [paragraph] }),
  });
  return [
    page(
      '/advertise',
      'Prepare your Property Listify workspace | Property Listify',
      'Choose an available Property Listify preparation path, establish your role-specific presence, and prepare private inventory before commercial activation.',
      'Prepare your Property Listify workspace before commercial activation.',
      'Start with the role that fits your business. You can establish the available account and organisation details, then prepare private inventory while publication and paid participation remain protected.',
    ),
    page(
      '/advertise/sell/agents',
      'Prepare your Agent presence | Property Listify',
      'Create your Property Listify Agent account, complete your professional presence and prepare private listing drafts before commercial activation.',
      'Establish your Agent presence and prepare private inventory.',
      'Create and verify your account, complete your professional profile and coverage, then create, save and return to private listing drafts while commercial activation remains protected.',
    ),
    page(
      '/advertise/sell/agencies',
      'Prepare your Agency workspace | Property Listify',
      'Create your Property Listify Agency owner account, establish your agency identity and prepare private inventory before commercial activation.',
      'Establish your Agency workspace and prepare private inventory.',
      'Create and verify an Agency owner account, establish your Agency identity and branding, then prepare private inventory while commercial activation remains protected.',
    ),
    page(
      '/advertise/sell/developers',
      'Prepare your Developer organisation | Property Listify',
      'Create your Property Listify Developer account, establish your organisation for review, and prepare private development drafts before commercial activation.',
      'Establish your Developer organisation and prepare private projects.',
      'Create a Developer account, establish your organisation for review, then prepare private development drafts while commercial activation remains protected.',
    ),
  ];
}

export const STATIC_LANDING_PATHS = ['/about', '/company/about', '/faq', '/support/faq'];

export type PrerenderOptions = {
  /** Suburbs and localities. Off when the build budget would be exceeded. */
  includeLocalities: boolean;
};

/** Every page that gets build-time HTML. Deterministic order: home, static, places by path. */
export function listPrerenderPages(
  options: PrerenderOptions = { includeLocalities: true },
): PrerenderPage[] {
  const pages: PrerenderPage[] = [homePage()];
  pages.push(...STATIC_LANDING_PATHS.map(landingStaticPage));
  pages.push(...TERMS_PATHS.map(path => legalPage(path, 'terms')));
  pages.push(...PRIVACY_PATHS.map(path => legalPage(path, 'privacy')));
  pages.push(contactPage());
  pages.push(...advertisePages());

  const reserved = new Set(pages.map(page => page.path));
  // Build time has no listing data, so only hand-approved places get raw 'index' HTML. Every
  // other place falls back to the app shell and the client decides robots after boot.
  const places = publishedCanonicalPlaceUrls()
    .filter(entry => isPlaceIndexAllowlistedPath(entry.path))
    .filter(entry => options.includeLocalities || entry.search_scope !== 'locality')
    .sort((a, b) => a.path.localeCompare(b.path));
  for (const entry of places) {
    if (reserved.has(entry.path) || entry.path === COUNTRY_DISCOVERY_PATH) {
      throw new Error(`Place path ${entry.path} collides with a static prerendered page.`);
    }
    pages.push(placePage(entry));
  }
  return pages;
}

// ---- HTML assembly -----------------------------------------------------------------------

function jsonLdScript(value: Record<string, unknown>): string {
  const json = JSON.stringify(value).replace(/</g, '\\u003c');
  return `<script type="application/ld+json" data-seo-managed="true">${json}</script>`;
}

/** Replace a tag matched by pattern or, when the template lacks it, insert before </head>. */
function upsert(html: string, pattern: RegExp, tag: string): string {
  return pattern.test(html)
    ? html.replace(pattern, () => tag)
    : html.replace(/<\/head>/i, () => `${tag}</head>`);
}

function metaByName(name: string, content: string): [RegExp, string] {
  return [
    new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*\\/?>`, 'i'),
    `<meta name="${name}" content="${escapeHtml(content)}" data-seo-managed="true" />`,
  ];
}

function metaByProperty(property: string, content: string): [RegExp, string] {
  return [
    new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*"\\s*\\/?>`, 'i'),
    `<meta property="${property}" content="${escapeHtml(content)}" data-seo-managed="true" />`,
  ];
}

/**
 * Produce the complete document for one page from the built application shell. The scripts and
 * styles of the shell are untouched so the React app boots exactly as before.
 */
export function renderPrerenderedHtml(template: string, page: PrerenderPage): string {
  const canonicalUrl = absolute(page.canonicalPath);
  const image = absolute(PRERENDER_SHARE_IMAGE);
  // Comments in the shell can hold commented-out tags that would otherwise match below.
  let html = template.replace(/<!--[\s\S]*?-->/g, '');

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    () => `<title>${escapeHtml(page.title)}</title>`,
  );
  const tags: [RegExp, string][] = [
    metaByName('description', page.description),
    metaByName('robots', page.robots),
    metaByProperty('og:type', 'website'),
    metaByProperty('og:site_name', SITE_NAME),
    metaByProperty('og:title', page.title),
    metaByProperty('og:description', page.description),
    metaByProperty('og:url', canonicalUrl),
    metaByProperty('og:image', image),
    metaByName('twitter:card', 'summary_large_image'),
    metaByName('twitter:title', page.title),
    metaByName('twitter:description', page.description),
    metaByName('twitter:url', canonicalUrl),
    metaByName('twitter:image', image),
  ];
  for (const [pattern, tag] of tags) html = upsert(html, pattern, tag);

  // The marker lets the client remove this canonical on routes that set none (see MetaControl).
  html = upsert(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"[^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" data-seo-managed="true" data-route-meta="canonical" />`,
  );

  // Managed JSON-LD is replaced, never appended to, by applySeo on boot.
  html = html.replace(
    /<script\s+type="application\/ld\+json"\s+data-seo-managed="true">[\s\S]*?<\/script>/gi,
    '',
  );
  const scripts = page.structuredData.map(jsonLdScript).join('');
  if (scripts) html = html.replace(/<\/head>/i, () => `${scripts}</head>`);

  if (page.bodyHtml) {
    if (!/<div id="root"><\/div>/.test(html)) {
      throw new Error('The application shell has no empty #root to prerender into.');
    }
    html = html.replace('<div id="root"></div>', () => `<div id="root">${page.bodyHtml}</div>`);
  }
  return html;
}

export function prerenderFileName(page: PrerenderPage): string {
  return page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`;
}
