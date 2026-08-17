import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const EVIDENCE_DIR = process.env.BUY_EVIDENCE_DIR || '/tmp/property-listify-ultra-buy-evidence';

const imageUrls = [
  '/properties/OSNX9i1Pc92d.jpg',
  '/properties/cb6IeI4pBCAG.jpg',
  '/properties/XP05F7nbEz5Z.jpg',
  '/properties/ZcWGSahwTdDK.jpg',
];

const agentIdentity = {
  role: 'agent' as const,
  provenance: 'agent' as const,
  name: 'Naledi Mokoena',
  organizationName: 'North & Stone Property',
  avatarUrl: null,
  organizationLogoUrl: null,
  phone: '+27 11 555 0142',
  whatsapp: '+27 82 555 0142',
  email: 'naledi@example.test',
  agentId: 33,
  agencyId: 44,
};

const searchCards = [
  {
    kind: 'property' as const,
    id: '501',
    propertyId: 501,
    href: '/property/501',
    title: 'Light-filled family home with a private garden',
    location: 'Parkhurst, Johannesburg, Gauteng',
    address: '17 Fourth Avenue',
    city: 'Johannesburg',
    suburb: 'Parkhurst',
    province: 'Gauteng',
    price: 4_950_000,
    image: imageUrls[0],
    images: imageUrls.map(url => ({ url, thumbnailUrl: url })),
    description:
      'A calm, considered family home with generous living spaces, a north-facing garden and practical energy backup.',
    bedrooms: 4,
    bathrooms: 3,
    area: 268,
    yardSize: 540,
    propertyType: 'house' as const,
    listingType: 'sale' as const,
    listingSource: 'manual' as const,
    listerType: 'agent' as const,
    contactRole: 'agent' as const,
    identity: agentIdentity,
    highlights: ['Solar backup', 'Private garden', 'Dedicated study'],
    badges: [],
    imageCount: 4,
    videoCount: 0,
    listedDate: '2026-08-12T09:00:00.000Z',
    latitude: -26.1382,
    longitude: 28.0162,
  },
  {
    kind: 'property' as const,
    id: '502',
    propertyId: 502,
    href: '/property/502',
    title: 'Contemporary apartment close to Rosebank',
    location: 'Melrose, Johannesburg, Gauteng',
    city: 'Johannesburg',
    suburb: 'Melrose',
    province: 'Gauteng',
    price: 2_850_000,
    image: imageUrls[1],
    images: [{ url: imageUrls[1], thumbnailUrl: imageUrls[1] }],
    description: 'A well-planned apartment with secure parking and easy access to Rosebank.',
    bedrooms: 2,
    bathrooms: 2,
    area: 112,
    propertyType: 'apartment' as const,
    listingType: 'sale' as const,
    listingSource: 'manual' as const,
    listerType: 'agency' as const,
    contactRole: 'agency' as const,
    identity: {
      role: 'agency' as const,
      provenance: 'agency' as const,
      name: 'Urban Key Realty',
      organizationName: 'Urban Key Realty',
      organizationLogoUrl: null,
      avatarUrl: null,
      phone: '+27 11 555 0198',
      whatsapp: null,
      email: 'enquiries@example.test',
      agencyId: 45,
    },
    highlights: ['Secure parking', 'Balcony'],
    badges: [],
    imageCount: 1,
    videoCount: 0,
    listedDate: '2026-08-10T09:00:00.000Z',
    latitude: -26.1324,
    longitude: 28.0687,
  },
  {
    kind: 'development' as const,
    id: 'development-unit-77',
    developmentId: 77,
    unitTypeId: 'unit-type-a',
    href: '/development/riverstone-residences/unit/unit-type-a',
    title: 'Two-bedroom residence at Riverstone',
    location: 'Bryanston, Johannesburg, Gauteng',
    city: 'Johannesburg',
    suburb: 'Bryanston',
    province: 'Gauteng',
    price: 3_250_000,
    image: imageUrls[2],
    images: [{ url: imageUrls[2], thumbnailUrl: imageUrls[2] }],
    description: 'A new development residence with shared gardens and concierge access.',
    bedrooms: 2,
    bathrooms: 2,
    area: 118,
    propertyType: 'apartment' as const,
    listingType: 'sale' as const,
    listingSource: 'development' as const,
    contactRole: 'developer' as const,
    identity: {
      role: 'developer' as const,
      provenance: 'developer' as const,
      name: 'Riverstone Developments',
      organizationName: 'Riverstone Developments',
      organizationLogoUrl: null,
      avatarUrl: null,
      phone: '+27 10 555 0120',
      whatsapp: '+27 72 555 0120',
      email: 'sales@example.test',
      cataloguePublisherId: 71,
    },
    development: { id: 77, name: 'Riverstone Residences', slug: 'riverstone-residences' },
    developerBrand: {
      id: 71,
      brandName: 'Riverstone Developments',
      slug: 'riverstone-developments',
      logoUrl: null,
      publicContactEmail: 'sales@example.test',
      publicContactPhone: '+27 10 555 0120',
    },
    highlights: ['New development', 'Shared gardens'],
    badges: [],
    imageCount: 1,
    videoCount: 0,
    listedDate: '2026-08-08T09:00:00.000Z',
    latitude: -26.0527,
    longitude: 28.0286,
  },
];

const searchResult = {
  cards: searchCards,
  total: searchCards.length,
  page: 0,
  pageSize: 12,
  hasMore: false,
  locationContext: {
    type: 'city',
    name: 'Johannesburg',
    slug: 'johannesburg',
    confidence: 'exact',
    fallbackLevel: 'none',
    originalIntent: 'Johannesburg',
    hierarchy: { province: 'Gauteng', city: 'Johannesburg' },
    ids: { provinceId: 1, cityId: 12 },
  },
  locationState: 'resolved',
  sourceCounts: { manual: 2, development: 1 },
};

const propertyDetails = {
  version: 1,
  ownershipType: 'freehold',
  corePropertyInformation: {
    version: 1,
    bedrooms: { status: 'known', value: 4 },
    bathrooms: { status: 'known', value: 3 },
    internalArea: { status: 'known', valueM2: 268 },
    erfArea: { status: 'known', valueM2: 540 },
  },
  featuresContext: {
    version: 1,
    spaces: ['garden', 'study', 'covered_patio'],
    context: { setting: 'suburban' },
    utilities: {
      electricitySupply: 'municipal',
      backupPower: 'solar_and_battery',
      internetAccess: 'fibre',
    },
    security: { status: 'known', features: ['alarm', 'electric_fence'] },
    highlights: ['natural_light', 'north_facing_garden'],
    customFeatures: ['Wood-burning fireplace'],
    customHighlights: ['Walkable neighbourhood'],
  },
  pricingContract: {
    version: 1,
    intent: 'sale',
    askingPrice: 4_950_000,
    negotiability: 'negotiable',
    recurringCosts: {
      ratesAndTaxes: {
        status: 'known',
        amount: 2_850,
        cadence: 'monthly',
        provenance: 'advertiser',
      },
    },
  },
};

const detailResult = {
  property: {
    id: 501,
    title: searchCards[0].title,
    description:
      'Designed for relaxed everyday living, this north-facing home brings natural light into generous open-plan spaces. The kitchen connects easily to the dining area and covered patio, while the private garden gives children and pets room to move. Four comfortable bedrooms, a dedicated study and solar-backed power make the home practical as well as welcoming.',
    listingType: 'sale',
    transactionType: 'sale',
    propertyType: 'house',
    price: 4_950_000,
    bedrooms: 4,
    bathrooms: 3,
    area: 268,
    internalAreaM2: 268,
    erfSizeM2: 540,
    address: '17 Fourth Avenue',
    suburb: 'Parkhurst',
    city: 'Johannesburg',
    province: 'Gauteng',
    zipCode: '2193',
    // Keep the fixture deterministic when the optional Maps script is not
    // available; the detail page should show its truthful location fallback.
    latitude: 0,
    longitude: 0,
    amenities: ['Garden', 'Parking', 'Fibre'],
    features: ['Solar backup', 'Private garden', 'Dedicated study'],
    propertyDetails,
    pricingContract: propertyDetails.pricingContract,
    publicIdentity: agentIdentity,
    images: imageUrls.map((url, index) => ({
      id: index + 1,
      imageUrl: url,
      url,
      isPrimary: index === 0 ? 1 : 0,
      displayOrder: index,
      mediaType: 'image',
    })),
    media: imageUrls.map((url, index) => ({
      id: index + 1,
      url,
      mediaType: 'image',
      isPrimary: index === 0 ? 1 : 0,
      displayOrder: index,
    })),
  },
  images: imageUrls.map((url, index) => ({
    id: index + 1,
    imageUrl: url,
    url,
    isPrimary: index === 0 ? 1 : 0,
    displayOrder: index,
    mediaType: 'image',
  })),
  media: imageUrls.map((url, index) => ({
    id: index + 1,
    url,
    mediaType: 'image',
    isPrimary: index === 0 ? 1 : 0,
    displayOrder: index,
  })),
};

const locationSuggestion = {
  kind: 'canonical_location' as const,
  canonicalLocationId: 'city:12',
  factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
  label: 'Johannesburg',
  factualLevel: 'city' as const,
  factualType: 'metropolitan_municipality',
  searchScopeKind: 'metro_city',
  display: { typeLabel: 'Metro city', contextLabel: 'Gauteng' },
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  canonicalPath: '/gauteng/johannesburg',
  source: 'canonical_geography' as const,
  listingCount: 3,
};

function trpcResult(data: unknown) {
  return { result: { data: { json: data } } };
}

async function installBuyFixture(page: Page, onLeadCapture?: () => void) {
  await page.route('**/api/trpc/**', async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    const procedures = pathname.split('/api/trpc/')[1]?.split(',') || [];
    const results = procedures.map(procedure => {
      switch (procedure) {
        case 'auth.me':
          return trpcResult(null);
        case 'developer.getHomeTrendingFeed':
          return trpcResult({
            items: [
              {
                id: '501',
                kind: 'listing',
                title: searchCards[0].title,
                city: 'Johannesburg',
                suburb: 'Parkhurst',
                priceFrom: 4_950_000,
                priceTo: 4_950_000,
                image: imageUrls[0],
                href: '/property/501',
                listingType: 'sale',
                bedrooms: 4,
                bathrooms: 3,
                area: 268,
                propertyType: 'house',
                badges: [],
              },
            ],
          });
        case 'cataloguePublisher.listPublishers':
          return trpcResult([
            {
              id: 71,
              brandName: 'Riverstone Developments',
              slug: 'riverstone-developments',
              headOfficeLocation: 'Johannesburg',
              logoUrl: null,
              stats: { totalProjects: 3, experience: 12 },
            },
          ]);
        case 'locationPages.getPopularCities':
          return trpcResult([
            {
              id: 12,
              name: 'Johannesburg',
              slug: 'johannesburg',
              provinceName: 'Gauteng',
              provinceSlug: 'gauteng',
              listingCount: 3,
            },
            {
              id: 13,
              name: 'Cape Town',
              slug: 'cape-town',
              provinceName: 'Western Cape',
              provinceSlug: 'western-cape',
              listingCount: 2,
            },
          ]);
        case 'location.searchDiscoverySuggestions':
          return trpcResult([locationSuggestion]);
        case 'location.searchLocations':
          return trpcResult([]);
        case 'properties.searchPublicInventory':
          return trpcResult(searchResult);
        case 'properties.getById':
          return trpcResult(detailResult);
        case 'properties.getRelatedPublicInventory':
          return trpcResult(searchCards.slice(1));
        case 'properties.getFavorites':
          return trpcResult([]);
        case 'location.getNearbyAmenities':
          return trpcResult([
            { id: 'poi-1', name: 'Parkhurst Primary School', type: 'school', distance: '1.2 km' },
            { id: 'poi-2', name: 'Rosebank Clinic', type: 'hospital', distance: '2.8 km' },
          ]);
        case 'leads.create':
          onLeadCapture?.();
          return trpcResult({
            success: true,
            leadId: 9001,
            route: 'direct',
            delivered: true,
            deliveryStatus: 'delivered',
            deliveryMethod: 'manual',
            deliveryAttemptId: 8001,
            supplyOrigin: 'customer_managed',
            leadCustody: 'verified_customer_recipient',
            recipientType: 'agent',
            recipientId: 33,
            message: 'The authorized listing recipient received this enquiry.',
          });
        default:
          return trpcResult(null);
      }
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(results),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.beforeAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('desktop buyer moves from canonical discovery to detail and one durable enquiry', async ({
  page,
}) => {
  let leadCaptureCount = 0;
  await installBuyFixture(page, () => {
    leadCaptureCount += 1;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Buy', exact: true }).first().click();
  const locationInput = page.getByRole('combobox', {
    name: 'Search by city, suburb, or area',
  });
  await locationInput.fill('Joh');
  await expect(page.getByRole('option', { name: /Johannesburg/ })).toBeVisible();
  await expect(page.getByText('No locations found')).toHaveCount(0);
  await page.getByRole('option', { name: /Johannesburg/ }).click();
  const heroSearchButton = page
    .locator('form')
    .getByRole('button', { name: 'Search', exact: true });
  await expect(heroSearchButton).toBeEnabled();
  await heroSearchButton.click();

  await expect(page).toHaveURL(/\/property-for-sale\?.*locationId=city%3A12/);
  await expect(page.getByRole('status').filter({ hasText: '3 properties' })).toBeVisible();
  await expect(page.getByRole('heading', { name: searchCards[0].title })).toBeVisible();
  await expect(page.getByText('Naledi Mokoena').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(EVIDENCE_DIR, 'desktop-results.png'),
    fullPage: true,
  });

  await page.getByRole('link', { name: `View ${searchCards[0].title}` }).click();
  await expect(page).toHaveURL(/\/property\/501/);
  await expect(page.getByRole('heading', { name: searchCards[0].title })).toBeVisible();
  await expect(page.getByText('Asking price')).toBeVisible();
  await expect(page.getByText('North & Stone Property').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(EVIDENCE_DIR, 'desktop-detail.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'View all photos' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Next photo' }).click();
  await expect(
    page.getByRole('dialog').getByAltText(`${searchCards[0].title} - Image 2`),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Send enquiry' }).first().click();
  await page.getByLabel('Your Name *').fill('Thandi Khumalo');
  await page.getByLabel('Email Address *').fill('thandi@example.test');
  await page.getByLabel('Phone Number').fill('+27 82 555 0101');
  await page
    .getByLabel('Message *')
    .fill('Please share the disclosure documents and suitable viewing times.');
  await page.getByLabel(/I agree to be contacted/).click();
  await page.getByRole('button', { name: 'Send enquiry' }).last().click();

  await expect(page.getByRole('heading', { name: 'Enquiry received' })).toBeVisible();
  await expect(
    page
      .getByRole('dialog', { name: 'Enquiry received' })
      .getByText(/saved and delivered to Naledi Mokoena/),
  ).toBeVisible();
  expect(leadCaptureCount).toBe(1);
});

test('mobile results, filters, detail, and enquiry remain usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installBuyFixture(page);

  await page.goto('/property-for-sale?locationId=city%3A12', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: searchCards[0].title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(EVIDENCE_DIR, 'mobile-results.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Filters' }).click();
  await expect(page.getByRole('dialog', { name: 'Filter property results' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Filter property results' })).toHaveCount(0);

  await page.goto('/property/501', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: searchCards[0].title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send enquiry' }).last()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(EVIDENCE_DIR, 'mobile-detail.png'),
    fullPage: true,
  });

  const accessibility = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(accessibility.violations).toEqual([]);
});
