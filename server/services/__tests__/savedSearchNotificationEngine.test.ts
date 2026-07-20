import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockDbSelect,
  mockSavedSearchFrom,
  mockUsersFrom,
  mockDeliveryHistoryFrom,
  mockDbOrderBy,
  mockDbWhere,
  mockUsersWhere,
  mockDeliveryHistoryWhere,
  mockInsertValues,
  mockUpdateSet,
  mockUpdateWhere,
  mockSearchProperties,
  mockSearchDevelopmentListings,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockDbSelect: vi.fn(),
  mockSavedSearchFrom: vi.fn(),
  mockUsersFrom: vi.fn(),
  mockDeliveryHistoryFrom: vi.fn(),
  mockDbOrderBy: vi.fn(),
  mockDbWhere: vi.fn(),
  mockUsersWhere: vi.fn(),
  mockDeliveryHistoryWhere: vi.fn(),
  mockInsertValues: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchDevelopmentListings: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock('../../db-connection', () => ({
  getDb: mockGetDb,
}));

vi.mock('../propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../developmentDerivedListingService', () => ({
  developmentDerivedListingService: {
    searchListings: mockSearchDevelopmentListings,
  },
}));

vi.mock('../../_core/emailService', () => ({
  EmailService: {
    sendEmail: mockSendEmail,
  },
}));

import { savedSearchNotificationEngine } from '../savedSearchNotificationEngine';

const publicOriginEnvKeys = [
  'APP_URL',
  'FRONTEND_URL',
  'BASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'VITE_APP_URL',
  'API_URL',
  'VITE_API_URL',
  'VITE_API_BASE_URL',
  'PORT',
] as const;

type PublicOriginEnvKey = (typeof publicOriginEnvKeys)[number];

function savePublicOriginEnv(): Record<PublicOriginEnvKey, string | undefined> {
  return Object.fromEntries(publicOriginEnvKeys.map(key => [key, process.env[key]])) as Record<
    PublicOriginEnvKey,
    string | undefined
  >;
}

function restorePublicOriginEnv(originalEnv: Record<PublicOriginEnvKey, string | undefined>): void {
  for (const key of publicOriginEnvKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function loadNotificationEngineWithPublicOrigin(values: Record<PublicOriginEnvKey, string>) {
  const originalEnv = savePublicOriginEnv();

  for (const key of publicOriginEnvKeys) {
    process.env[key] = values[key];
  }

  vi.resetModules();
  const { ENV } = await import('../../_core/env');
  const { savedSearchNotificationEngine: notificationEngine } =
    await import('../savedSearchNotificationEngine');

  return {
    ENV,
    notificationEngine,
    restore: () => {
      restorePublicOriginEnv(originalEnv);
      vi.resetModules();
    },
  };
}

function getTextUrl(text: string, label: string): URL {
  const prefix = `${label}: `;
  const url = text
    .split('\n')
    .find(line => line.startsWith(prefix))
    ?.slice(prefix.length);
  expect(url).toBeDefined();
  return new URL(url!);
}

describe('savedSearchNotificationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDbSelect
      .mockReturnValueOnce({ from: mockSavedSearchFrom })
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockDeliveryHistoryFrom });
    mockSavedSearchFrom.mockReturnValue({ orderBy: mockDbOrderBy });
    mockUsersFrom.mockReturnValue({ where: mockUsersWhere });
    mockDeliveryHistoryFrom.mockReturnValue({ where: mockDeliveryHistoryWhere });
    mockDbOrderBy.mockReturnValue([{ id: 11 }]);
    mockDbWhere.mockResolvedValue([
      {
        id: 11,
        userId: 7,
        name: 'Johannesburg Apartments',
        criteria: {
          city: 'Johannesburg',
          listingType: 'sale',
          propertyType: 'apartment',
        },
        notificationFrequency: 'daily',
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T08:00:00.000Z',
        lastNotifiedAt: '2026-03-19T08:00:00.000Z',
      },
    ]);
    mockUsersWhere.mockResolvedValue([
      {
        id: 7,
        email: 'buyer@example.com',
        firstName: 'Ava',
        name: 'Ava Buyer',
      },
    ]);
    mockDeliveryHistoryWhere.mockResolvedValue([]);

    mockInsertValues.mockResolvedValue([{ insertId: 101 }]);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockSendEmail.mockResolvedValue(true);

    mockGetDb.mockResolvedValue({
      select: mockDbSelect,
      insert: vi.fn(() => ({ values: mockInsertValues })),
      update: vi.fn(() => ({ set: mockUpdateSet })),
    });

    mockSearchProperties.mockResolvedValue({
      total: 2,
      properties: [
        {
          id: '55',
          title: '2 Bedroom Apartment for Sale in Rosebank',
          price: 1450000,
          city: 'Johannesburg',
          suburb: 'Rosebank',
          listingType: 'sale',
          listedDate: new Date('2026-03-21T09:00:00.000Z'),
          images: [{ url: 'https://example.com/property.jpg' }],
        },
        {
          id: '56',
          title: '1 Bedroom Apartment for Sale in Sandton',
          price: 995000,
          city: 'Johannesburg',
          suburb: 'Sandton',
          listingType: 'sale',
          listedDate: new Date('2026-03-20T06:00:00.000Z'),
          images: [],
        },
      ],
    });
    mockSearchDevelopmentListings.mockResolvedValue({
      total: 0,
      items: [],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });
  });

  it('emits notifications for due manual saved searches and updates lastNotifiedAt', async () => {
    const { ENV, notificationEngine, restore } = await loadNotificationEngineWithPublicOrigin({
      APP_URL: 'https://saved-search-notifications.example.test/app/',
      FRONTEND_URL: 'https://frontend-conflict.example.test',
      BASE_URL: 'https://base-conflict.example.test',
      NEXT_PUBLIC_APP_URL: 'https://next-conflict.example.test',
      VITE_APP_URL: 'http://vite-conflict.example.test:3009',
      API_URL: 'http://api-conflict.example.test:5001',
      VITE_API_URL: 'http://vite-api-conflict.example.test:5001',
      VITE_API_BASE_URL: 'http://vite-api-base-conflict.example.test:5001',
      PORT: '5001',
    });

    try {
      expect(ENV.appUrl).toBe('https://saved-search-notifications.example.test');
      mockDbOrderBy.mockReturnValue({ where: mockDbWhere });

      const result = await notificationEngine.processDueNotifications({
        userId: 7,
        now: new Date('2026-03-21T10:00:00.000Z'),
      });

      expect(mockSearchProperties).toHaveBeenCalledWith(
        {
          city: 'Johannesburg',
          propertyType: ['apartment'],
          listingType: 'sale',
        },
        'date_desc',
        1,
        100,
      );
      expect(mockInsertValues).toHaveBeenCalledTimes(2);
      expect(mockInsertValues).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          savedSearchId: 11,
          userId: 7,
          searchName: 'Johannesburg Apartments',
          status: 'delivered',
          inAppRequested: 1,
          emailRequested: 1,
          inAppDelivered: 1,
          emailDelivered: 1,
          newMatchCount: 2,
          totalMatches: 2,
        }),
      );
      expect(mockUpdateWhere).toHaveBeenCalledOnce();
      expect(mockSendEmail).toHaveBeenCalledOnce();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'buyer@example.com',
          subject: '2 new matches for Johannesburg Apartments',
          text: expect.stringContaining('Top result: 2 Bedroom Apartment for Sale in Rosebank.'),
          html: expect.stringContaining('Saved search digest'),
        }),
      );

      const [{ text: emailText, html: emailHtml }] = mockSendEmail.mock.calls[0];
      const pauseUrl = getTextUrl(emailText, 'Pause alerts');
      const unsubscribeUrl = getTextUrl(emailText, 'Turn off email alerts');
      const openSearchUrl = getTextUrl(emailText, 'Open saved search');
      const textUrls = [...emailText.matchAll(/https?:\/\/\S+/g)].map(match => new URL(match[0]));
      const htmlUrls = [...emailHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(
        match => new URL(match[1]),
      );

      for (const url of [...textUrls, ...htmlUrls]) {
        expect(url.protocol).toBe('https:');
        expect(url.hostname).toBe('saved-search-notifications.example.test');
        expect(url.href).not.toContain('.test//');
      }
      expect(textUrls.map(url => url.pathname)).toEqual(
        expect.arrayContaining(['/property/55', '/property/56', '/saved-search/manage']),
      );
      expect(htmlUrls.map(url => url.pathname)).toEqual(
        expect.arrayContaining(['/property/55', '/property/56', '/saved-search/manage']),
      );
      expect(openSearchUrl.pathname).toBe('/property/55');
      expect(pauseUrl.pathname).toBe('/saved-search/manage');
      expect(unsubscribeUrl.pathname).toBe('/saved-search/manage');
      expect(pauseUrl.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      expect(unsubscribeUrl.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      expect(pauseUrl.searchParams.get('token')).not.toBe(unsubscribeUrl.searchParams.get('token'));
      expect(emailText).not.toContain('localhost:5173');
      expect(emailText).not.toContain('localhost:3009');
      expect(emailText).not.toContain('api-conflict.example.test');
      expect(emailText).not.toContain('vite-conflict.example.test');
      expect(emailHtml).not.toContain('localhost:5173');
      expect(emailHtml).not.toContain('localhost:3009');
      expect(emailHtml).not.toContain('api-conflict.example.test');
      expect(emailHtml).not.toContain('vite-conflict.example.test');
      expect(result).toMatchObject({
        scannedSearches: 1,
        dueSearches: 1,
        emittedNotifications: 1,
        emailedNotifications: 1,
        dryRun: false,
      });
      expect(result.notifications[0]).toMatchObject({
        savedSearchId: 11,
        userId: 7,
        listingSource: 'all',
        title: '2 new matches for Johannesburg Apartments',
        content:
          'Johannesburg: 2 new matches across listings and developments. Top result: 2 Bedroom Apartment for Sale in Rosebank. 2 total active.',
        totalMatches: 2,
        newMatchCount: 2,
        actionUrl: '/property/55',
      });
    } finally {
      restore();
    }
  });

  it('prefers and normalizes the explicit public origin for saved-search management links', async () => {
    const { notificationEngine: reloadedNotificationEngine, restore } =
      await loadNotificationEngineWithPublicOrigin({
        APP_URL: 'https://portal.example.test/property-listify/',
        FRONTEND_URL: 'https://frontend.example.test',
        BASE_URL: 'https://base.example.test',
        NEXT_PUBLIC_APP_URL: 'https://next.example.test',
        VITE_APP_URL: 'http://localhost:3009',
        API_URL: 'http://api.example.test:5001',
        VITE_API_URL: 'http://vite-api.example.test:5001',
        VITE_API_BASE_URL: 'http://vite-api-base.example.test:5001',
        PORT: '5001',
      });

    try {
      mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
      await reloadedNotificationEngine.processDueNotifications({
        userId: 7,
        now: new Date('2026-03-21T10:00:00.000Z'),
      });

      const [{ text: emailText }] = mockSendEmail.mock.calls[0];
      const pauseUrlMatch = emailText.match(/Pause alerts: (https?:\/\/\S+)/);
      expect(pauseUrlMatch?.[1]).toBeDefined();

      const pauseUrl = new URL(pauseUrlMatch![1]);
      expect(pauseUrl.protocol).toBe('https:');
      expect(pauseUrl.hostname).toBe('portal.example.test');
      expect(pauseUrl.pathname).toBe('/saved-search/manage');
      expect(pauseUrl.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      expect(pauseUrl.href).not.toContain('property-listify//saved-search');
      expect(pauseUrl.href).not.toContain('localhost:3009');
      expect(pauseUrl.href).not.toContain(':5001');
    } finally {
      restore();
    }
  });

  it('skips notification emission when no new matches exist since lastNotifiedAt', async () => {
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockSearchProperties.mockResolvedValue({
      total: 1,
      properties: [
        {
          id: '55',
          title: '2 Bedroom Apartment for Sale in Rosebank',
          price: 1450000,
          city: 'Johannesburg',
          suburb: 'Rosebank',
          listingType: 'sale',
          listedDate: new Date('2026-03-18T09:00:00.000Z'),
          images: [{ url: 'https://example.com/property.jpg' }],
        },
      ],
    });

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 7,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(result.emittedNotifications).toBe(0);
    expect(result.emailedNotifications).toBe(0);
  });

  it('supports development-only dry runs without writing notifications', async () => {
    mockDbWhere.mockResolvedValue([
      {
        id: 12,
        userId: 9,
        name: 'Off-plan Sandton',
        criteria: {
          city: 'Johannesburg',
          suburb: 'Sandton',
          listingSource: 'development',
        },
        notificationFrequency: 'instant',
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T08:00:00.000Z',
        lastNotifiedAt: null,
      },
    ]);
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockSearchProperties.mockResolvedValue({
      total: 0,
      properties: [],
    });
    mockSearchDevelopmentListings.mockResolvedValue({
      total: 2,
      items: [
        {
          id: 'dev-42-unit-a',
          title: '2 Bedroom Apartment for Sale in Sandton',
          price: 2500000,
          city: 'Johannesburg',
          suburb: 'Sandton',
          listingType: 'sale',
          listingSource: 'development',
          listedDate: new Date('2026-03-21T09:30:00.000Z'),
          development: { id: 42, slug: 'sandton-rise' },
          image: 'https://example.com/dev.jpg',
          images: [],
        },
      ],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 9,
      dryRun: true,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockSearchDevelopmentListings).toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(result.notifications[0]).toMatchObject({
      listingSource: 'development',
      title: '2 new development matches for Off-plan Sandton',
      content:
        'Sandton, Johannesburg: 2 new development matches. Top result: 2 Bedroom Apartment for Sale in Sandton. 2 total active.',
      totalMatches: 2,
      newMatchCount: 2,
      actionUrl: '/development/sandton-rise',
    });
  });

  it('skips email delivery when the saved-search user has no email address', async () => {
    mockDbSelect
      .mockReturnValueOnce({ from: mockSavedSearchFrom })
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockDeliveryHistoryFrom });
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockDeliveryHistoryWhere.mockResolvedValue([]);
    mockUsersWhere.mockResolvedValue([
      {
        id: 7,
        email: null,
        firstName: 'Ava',
        name: 'Ava Buyer',
      },
    ]);

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 7,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'partial',
        inAppRequested: 1,
        emailRequested: 1,
        inAppDelivered: 1,
        emailDelivered: 0,
        retryState: 'abandoned',
      }),
    );
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(result.emailedNotifications).toBe(0);
  });

  it('respects email-only delivery preferences without writing in-app notifications', async () => {
    mockDbSelect
      .mockReturnValueOnce({ from: mockSavedSearchFrom })
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockDeliveryHistoryFrom });
    mockDbWhere.mockResolvedValue([
      {
        id: 15,
        userId: 7,
        name: 'Johannesburg Apartments',
        criteria: {
          city: 'Johannesburg',
          listingType: 'sale',
          propertyType: 'apartment',
          __deliveryPreferences: {
            emailEnabled: true,
            inAppEnabled: false,
          },
        },
        notificationFrequency: 'daily',
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T08:00:00.000Z',
        lastNotifiedAt: '2026-03-19T08:00:00.000Z',
      },
    ]);
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockDeliveryHistoryWhere.mockResolvedValue([]);

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 7,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockInsertValues).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        savedSearchId: 15,
        status: 'delivered',
        inAppRequested: 0,
        emailRequested: 1,
        inAppDelivered: 0,
        emailDelivered: 1,
        retryState: 'not_needed',
      }),
    );
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      emittedNotifications: 1,
      emailedNotifications: 1,
    });
  });

  it('schedules a retry when email delivery fails without aborting the batch', async () => {
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockDeliveryHistoryWhere.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue(false);

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 7,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'partial',
        retryState: 'pending',
        retryCount: 0,
        maxRetryCount: 3,
        emailDelivered: 0,
        error: 'Email delivery returned false',
        nextRetryAt: expect.any(String),
      }),
    );
    expect(result).toMatchObject({
      emittedNotifications: 1,
      emailedNotifications: 0,
      retriedEmailDeliveries: 0,
      failedEmailRetries: 0,
      abandonedEmailRetries: 0,
    });
  });

  it('retries pending email deliveries from history before processing fresh matches', async () => {
    mockDbSelect
      .mockReset()
      .mockReturnValueOnce({ from: mockSavedSearchFrom })
      .mockReturnValueOnce({ from: mockDeliveryHistoryFrom })
      .mockReturnValueOnce({ from: mockUsersFrom });
    mockSavedSearchFrom.mockReturnValue({ orderBy: mockDbOrderBy });
    mockDbOrderBy.mockReturnValue([]);
    mockDeliveryHistoryFrom.mockReturnValue({ where: mockDeliveryHistoryWhere });
    mockUsersFrom.mockReturnValue({ where: mockUsersWhere });
    mockDeliveryHistoryWhere.mockResolvedValue([
      {
        id: 301,
        savedSearchId: 11,
        userId: 7,
        searchName: 'Johannesburg Apartments',
        title: '2 new matches for Johannesburg Apartments',
        content: 'Johannesburg: 2 new matches.',
        listingSource: 'all',
        notificationFrequency: 'daily',
        totalMatches: 2,
        newMatchCount: 2,
        inAppRequested: 1,
        emailRequested: 1,
        inAppDelivered: 1,
        emailDelivered: 0,
        status: 'partial',
        retryState: 'pending',
        retryCount: 0,
        maxRetryCount: 3,
        nextRetryAt: '2026-03-21T09:30:00.000Z',
        lastRetryAt: null,
        actionUrl: '/property/55',
        previewMatches: [
          {
            id: '55',
            title: '2 Bedroom Apartment for Sale in Rosebank',
            price: 1450000,
            city: 'Johannesburg',
            suburb: 'Rosebank',
            listingType: 'sale',
            listingSource: 'manual',
            href: '/property/55',
            image: 'https://example.com/property.jpg',
            listedDate: '2026-03-21T09:00:00.000Z',
          },
        ],
      },
    ]);
    mockUsersWhere.mockResolvedValue([
      {
        id: 7,
        email: 'buyer@example.com',
        firstName: 'Ava',
        name: 'Ava Buyer',
      },
    ]);

    const result = await savedSearchNotificationEngine.processDueNotifications({
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        retryState: 'retrying',
        retryCount: 0,
      }),
    );
    expect(mockUpdateSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        retryState: 'succeeded',
        retryCount: 1,
        emailDelivered: 1,
        error: null,
      }),
    );
    expect(result).toMatchObject({
      scannedSearches: 0,
      dueSearches: 0,
      emittedNotifications: 0,
      emailedNotifications: 0,
      retriedEmailDeliveries: 1,
      failedEmailRetries: 0,
      abandonedEmailRetries: 0,
    });
  });
});
