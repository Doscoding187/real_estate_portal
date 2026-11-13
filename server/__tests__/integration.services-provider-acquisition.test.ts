import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import superjson from 'superjson';
import { and, eq, inArray, like, or } from 'drizzle-orm';

const { deliveredVerificationEmails } = vi.hoisted(() => ({
  deliveredVerificationEmails: [] as Array<{ to: string; verificationToken: string }>,
}));
const priorJwtSecret = vi.hoisted(() => {
  const prior = process.env.JWT_SECRET;
  if (!prior) process.env.JWT_SECRET = 'services-provider-acquisition-test-secret';
  return prior;
});

vi.mock('../_core/email', () => ({
  sendVerificationEmail: vi.fn(async (input: { to: string; verificationToken: string }) => {
    deliveredVerificationEmails.push({
      to: input.to,
      verificationToken: input.verificationToken,
    });
    return { success: true, messageId: 'services-provider-test-verification' };
  }),
}));

import { COOKIE_NAME } from '../../shared/const';
import type { AppRouter } from '../routers';
import { users, partners, auditLogs, userLegalAcceptances } from '../../drizzle/schema';
import { authService } from '../_core/auth';
import { registerAuthRoutes } from '../_core/authRoutes';
import { createContext } from '../_core/context';
import { appRouter } from '../routers';
import { db } from '../db';
import { installSyntheticLegalRelease } from '../test-utils/legalReleaseFixture';
import {
  acquireDevelopmentIntegrationMutex,
  DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS,
  releaseDevelopmentIntegrationMutex,
} from '../test-utils/developmentIntegrationMutex';
import { CANONICAL_SANDTON_PLACE_ID } from './helpers/canonicalPlaceFixture';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

let server: Server | null = null;
let baseUrl = '';
let legalFixture: Awaited<ReturnType<typeof installSyntheticLegalRelease>> | undefined;
const createdUserIds: number[] = [];
const createdProviderIds: number[] = [];

async function cleanupFixtures() {
  const staleUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        like(users.email, 'services-owner-%@invalid.example'),
        like(users.email, 'services-other-%@invalid.example'),
        like(users.email, 'services-reviewer-%@invalid.example'),
      ),
    );
  const userIds = [...new Set([...createdUserIds, ...staleUsers.map(row => Number(row.id))])];
  const providerRows = userIds.length
    ? await db.select({ id: partners.id }).from(partners).where(inArray(partners.userId, userIds))
    : [];
  const providerIds = [
    ...new Set([...createdProviderIds, ...providerRows.map(row => Number(row.id))]),
  ];
  if (providerIds.length) {
    await db
      .delete(auditLogs)
      .where(
        and(eq(auditLogs.targetType, 'service_provider'), inArray(auditLogs.targetId, providerIds)),
      );
    await db.delete(partners).where(inArray(partners.id, providerIds));
  }
  if (userIds.length) {
    await db.delete(userLegalAcceptances).where(inArray(userLegalAcceptances.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  createdUserIds.length = 0;
  createdProviderIds.length = 0;
}

function trpcClient(cookie?: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
        headers: () => (cookie ? { cookie } : {}),
      }),
    ],
  });
}

async function registerAndVerify(email: string, name: string) {
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'StrongPassword1!',
      name,
      role: 'service_provider',
      legalAcceptance: legalFixture!.registrationChoice,
    }),
  });
  expect(registration.status).toBe(201);
  expect(await registration.json()).toMatchObject({
    success: true,
    verificationEmailSent: true,
    message: expect.stringContaining('stay private until it is reviewed and approved'),
  });

  const emailMessage = [...deliveredVerificationEmails].reverse().find(row => row.to === email);
  expect(emailMessage).toBeDefined();
  const verification = await fetch(
    `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(emailMessage!.verificationToken)}`,
    { redirect: 'manual' },
  );
  expect(verification.status).toBe(302);
  expect(verification.headers.get('location')).toMatch(/\/service\/profile\?verified=true$/);
  const cookie = (verification.headers.get('set-cookie') || '').split(';')[0] || '';
  expect(cookie).toContain(`${COOKIE_NAME}=`);
  return { cookie, email };
}

describeWithDb('Services provider acquisition and editable descriptions', () => {
  beforeAll(async () => {
    await acquireDevelopmentIntegrationMutex();
    legalFixture = await installSyntheticLegalRelease();
    await cleanupFixtures();
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);
    app.use(
      '/api/trpc',
      (await import('@trpc/server/adapters/express')).createExpressMiddleware({
        router: appRouter,
        createContext,
      }),
    );
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Services test server did not start.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await cleanupFixtures();
    await legalFixture?.cleanup();
    deliveredVerificationEmails.length = 0;
    await releaseDevelopmentIntegrationMutex();
    if (priorJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = priorJwtSecret;
  });

  it('registers and verifies providers, preserves private review, and saves owned service descriptions', async () => {
    const suffix = randomUUID();
    const owner = await registerAndVerify(
      `services-owner-${suffix}@invalid.example`,
      'Service Owner',
    );
    const ownerRows = await db.select().from(users).where(eq(users.email, owner.email)).limit(1);
    expect(ownerRows[0]).toMatchObject({ role: 'service_provider', emailVerified: 1 });
    createdUserIds.push(Number(ownerRows[0]!.id));

    const ownerClient = trpcClient(owner.cookie);
    const identity = await ownerClient.servicesEngine.registerProviderIdentity.mutate({
      companyName: `Local Services Provider ${suffix.slice(0, 8)}`,
      description: 'A local-only provider used to verify the Services application journey.',
    });
    const providerId = Number(identity.id);
    createdProviderIds.push(providerId);
    await ownerClient.servicesEngine.upsertProviderProfile.mutate({
      headline: 'Property maintenance and plumbing',
      bio: 'Local-only factual description for verification.',
      contactEmail: owner.email,
    });
    const [service] = await ownerClient.servicesEngine.replaceProviderServices.mutate({
      services: [
        {
          category: 'home_improvement',
          code: 'plumbing',
          displayName: 'Plumbing',
          description: 'Initial description for persistence verification.',
        },
      ],
    });
    expect(service).toBeDefined();
    await ownerClient.servicesEngine.replaceProviderLocations.mutate({
      locations: [{ canonicalPlaceId: CANONICAL_SANDTON_PLACE_ID, isPrimary: true }],
    });

    const privateProfile = await ownerClient.servicesEngine.myProviderProfile.query();
    expect(privateProfile).toMatchObject({
      providerId,
      isPublished: false,
      verificationStatus: 'pending',
      services: [{ description: 'Initial description for persistence verification.' }],
    });
    expect(
      await trpcClient().servicesEngine.getProviderPublicProfile.query({ providerId }),
    ).toBeNull();

    await ownerClient.servicesEngine.replaceProviderServices.mutate({
      services: [
        {
          id: Number(service!.id),
          category: 'home_improvement',
          code: 'plumbing',
          displayName: 'Plumbing',
          description: '',
        },
      ],
    });
    expect(
      (await ownerClient.servicesEngine.myProviderProfile.query())?.services[0]?.description,
    ).toBeNull();

    const savedDescription = 'Emergency plumbing and leak repairs for homes in Sandton.';
    await ownerClient.servicesEngine.replaceProviderServices.mutate({
      services: [
        {
          id: Number(service!.id),
          category: 'home_improvement',
          code: 'plumbing',
          displayName: 'Plumbing',
          description: savedDescription,
        },
      ],
    });
    await expect(
      ownerClient.servicesEngine.replaceProviderServices.mutate({
        services: [
          {
            id: Number(service!.id),
            category: 'home_improvement',
            code: 'plumbing',
            displayName: 'Plumbing',
            description: 'x'.repeat(2001),
          },
        ],
      }),
    ).rejects.toThrow();
    expect(
      (await ownerClient.servicesEngine.myProviderProfile.query())?.services[0]?.description,
    ).toBe(savedDescription);

    const other = await registerAndVerify(
      `services-other-${suffix}@invalid.example`,
      'Other Provider',
    );
    const otherRows = await db.select().from(users).where(eq(users.email, other.email)).limit(1);
    createdUserIds.push(Number(otherRows[0]!.id));
    const otherClient = trpcClient(other.cookie);
    const otherIdentity = await otherClient.servicesEngine.registerProviderIdentity.mutate({
      companyName: `Other Local Provider ${suffix.slice(0, 8)}`,
    });
    createdProviderIds.push(Number(otherIdentity.id));
    await expect(
      otherClient.servicesEngine.replaceProviderServices.mutate({
        services: [
          {
            id: Number(service!.id),
            category: 'home_improvement',
            code: 'plumbing',
            displayName: 'Plumbing',
            description: 'Unauthorized edit attempt.',
          },
        ],
      }),
    ).rejects.toThrow();

    const reviewerInsert = await db.insert(users).values({
      email: `services-reviewer-${suffix}@invalid.example`,
      name: 'Local Services Reviewer',
      role: 'super_admin',
      emailVerified: 1,
    } as any);
    const reviewerId = Number(reviewerInsert[0].insertId);
    createdUserIds.push(reviewerId);
    const reviewerSession = await authService.createSessionToken(
      reviewerId,
      `services-reviewer-${suffix}@invalid.example`,
      'Local Services Reviewer',
      1,
    );
    const reviewerClient = trpcClient(`${COOKIE_NAME}=${reviewerSession}`);
    await reviewerClient.servicesEngine.reviewProviderPublication.mutate({
      providerId,
      decision: 'publish',
      notes: 'Local integration fixture only.',
    });
    const publicProfile = await trpcClient().servicesEngine.getProviderPublicProfile.query({
      providerId,
    });
    expect(publicProfile?.services).toEqual(
      expect.arrayContaining([expect.objectContaining({ description: savedDescription })]),
    );

    const publishedEdit = 'Updated published description shown immediately after save.';
    await ownerClient.servicesEngine.replaceProviderServices.mutate({
      services: [
        {
          id: Number(service!.id),
          category: 'home_improvement',
          code: 'plumbing',
          displayName: 'Plumbing',
          description: publishedEdit,
        },
      ],
    });
    const updatedPublicProfile = await trpcClient().servicesEngine.getProviderPublicProfile.query({
      providerId,
    });
    expect(updatedPublicProfile?.services).toEqual(
      expect.arrayContaining([expect.objectContaining({ description: publishedEdit })]),
    );

    await reviewerClient.servicesEngine.reviewProviderPublication.mutate({
      providerId,
      decision: 'unpublish',
      notes: 'Local integration fixture cleanup.',
    });
    expect(
      await trpcClient().servicesEngine.getProviderPublicProfile.query({ providerId }),
    ).toBeNull();
  }, 30_000);
});
