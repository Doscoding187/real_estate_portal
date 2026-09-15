import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const fixtureAgentEmail = 'agent@listify.local';

type Row = Record<string, unknown>;

let connection: AuthoritySqlConnection | undefined;
let published: { propertyId: number; title: string; agencyId: number; agentId: number } | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection)
    throw new Error('PLE public-enquiry verification connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

function fixturePassword(): string {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) {
    throw new Error(
      'PLE public-enquiry verification requires the governed local fixture credential.',
    );
  }
  return password;
}

async function signInAsFixtureAgent(page: Page, leadId: number) {
  const destination = `/agent/leads?leadId=${leadId}`;
  await page.goto(`/login?mode=signin&next=${encodeURIComponent(destination)}`);
  const signIn = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(signIn).toBeVisible();
  await signIn.getByPlaceholder('you@example.com').fill(fixtureAgentEmail);
  await signIn.getByPlaceholder('Enter your password').fill(fixturePassword());
  const response = page.waitForResponse(
    candidate =>
      candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
  );
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/agent/leads\\?leadId=${leadId}$`));
}

test.describe('PLE agency public enquiry and CRM browser acceptance', () => {
  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'browser-verification' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);

    const [publishedRow] = await query(
      `SELECT property.id AS propertyId,
              listing.title AS title,
              listing.agencyId AS agencyId,
              listing.agentId AS agentId
         FROM listings listing
         INNER JOIN properties property ON property.sourceListingId = listing.id
        WHERE listing.status = 'published'
          AND listing.approvalStatus = 'approved'
          AND property.status = 'available'
          AND listing.title LIKE 'PLE agency browser listing %'
        ORDER BY property.id DESC
        LIMIT 1`,
    );
    expect(Number(publishedRow?.propertyId)).toBeGreaterThan(0);
    expect(Number(publishedRow?.agencyId)).toBeGreaterThan(0);
    expect(Number(publishedRow?.agentId)).toBeGreaterThan(0);
    published = {
      propertyId: Number(publishedRow.propertyId),
      title: String(publishedRow.title),
      agencyId: Number(publishedRow.agencyId),
      agentId: Number(publishedRow.agentId),
    };

    const [membership] = await query(
      `SELECT agent.id AS agentId,
              membership.agency_id AS agencyId,
              (
                SELECT COUNT(*)
                  FROM subscriptions individualSubscription
                 WHERE individualSubscription.owner_type = 'agent'
                   AND individualSubscription.owner_id = agent.id
              ) AS individualSubscriptionCount
         FROM users user
         INNER JOIN agents agent ON agent.userId = user.id
         INNER JOIN agency_agent_memberships membership ON membership.agent_id = agent.id
        WHERE user.email = ?
          AND membership.status = 'active'
        ORDER BY membership.id DESC
        LIMIT 1`,
      [fixtureAgentEmail],
    );
    expect(membership).toMatchObject({
      agentId: published.agentId,
      agencyId: published.agencyId,
      individualSubscriptionCount: 0,
    });
  });

  test.afterAll(async () => {
    await connection?.end();
  });

  test('captures a public enquiry into canonical agency custody and lets the assigned agent record follow-up', async ({
    page,
  }) => {
    expect(published).toBeDefined();
    const publicListing = published!;
    const suffix = randomUUID().slice(0, 12);
    const prospectName = `PLE Browser Prospect ${suffix}`;
    const prospectEmail = `ple-browser-prospect-${suffix}@example.test`;
    const prospectMessage = `Please arrange a viewing and share the next steps for ${suffix}.`;
    const contactOutcome = `Called ${prospectName}; confirmed viewing interest and agreed next steps.`;
    const followUpNote = `Confirm availability with ${prospectName} after the viewing request.`;

    // This begins anonymously at the public property detail. The client supplies
    // only property and prospect information; recipient custody is derived by
    // the server from the approved projection.
    await page.context().clearCookies();
    await page.goto(`/property/${publicListing.propertyId}`);
    await expect(
      page.getByRole('heading', { name: publicListing.title, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Send enquiry', exact: true }).first().click();

    const enquiry = page.getByRole('dialog', { name: 'Send an enquiry' });
    await expect(enquiry).toBeVisible();
    await enquiry.getByLabel('Your Name').fill(prospectName);
    await enquiry.getByLabel('Email Address').fill(prospectEmail);
    await enquiry.getByLabel('Phone Number').fill('+27825550199');
    await enquiry.getByLabel('Message').fill(prospectMessage);
    await enquiry.getByLabel(/I agree to be contacted about this enquiry/).check();
    await enquiry.getByRole('button', { name: 'Send enquiry', exact: true }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Enquiry received' })
        .getByRole('heading', { name: 'Enquiry received' }),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const [lead] = await query(
          `SELECT id,
                  propertyId,
                  agencyId,
                  agentId,
                  message,
                  consent_captured_at AS consentCapturedAt,
                  consent_version AS consentVersion,
                  consent_source AS consentSource,
                  delivery_status AS deliveryStatus,
                  lead_delivery_method AS leadDeliveryMethod
             FROM leads
            WHERE propertyId = ?
              AND email = ?
            ORDER BY id DESC
            LIMIT 1`,
          [publicListing.propertyId, prospectEmail],
        );
        return lead;
      })
      .toMatchObject({
        propertyId: publicListing.propertyId,
        agencyId: publicListing.agencyId,
        agentId: publicListing.agentId,
        message: `[GENERAL ENQUIRY] ${prospectMessage}`,
        consentVersion: '2026-08-02',
        consentSource: 'property_contact_modal',
        deliveryStatus: 'delivered',
        leadDeliveryMethod: 'crm_export',
      });

    const [lead] = await query(
      `SELECT id, consent_captured_at AS consentCapturedAt
         FROM leads
        WHERE propertyId = ?
          AND email = ?
        ORDER BY id DESC
        LIMIT 1`,
      [publicListing.propertyId, prospectEmail],
    );
    expect(Number(lead?.id)).toBeGreaterThan(0);
    expect(lead?.consentCapturedAt).toBeTruthy();
    const leadId = Number(lead.id);

    const [custody] = await query(
      `SELECT purpose,
              state,
              channel,
              recipient_type AS recipientType,
              recipient_agent_id AS recipientAgentId,
              recipient_agency_id AS recipientAgencyId
         FROM lead_deliveries
        WHERE lead_id = ?
          AND purpose = 'primary_custody'
        ORDER BY routing_revision DESC
        LIMIT 1`,
      [leadId],
    );
    expect(custody).toMatchObject({
      purpose: 'primary_custody',
      state: 'completed',
      channel: 'crm_export',
      recipientType: 'agent',
      recipientAgentId: publicListing.agentId,
    });
    expect(custody?.recipientAgencyId).toBeNull();

    await signInAsFixtureAgent(page, leadId);
    const leadWorkspace = page.getByRole('dialog', { name: prospectName });
    await expect(leadWorkspace).toBeVisible();
    await expect(leadWorkspace.getByText(publicListing.title, { exact: true })).toBeVisible();
    await expect(leadWorkspace.getByText(prospectMessage, { exact: false }).first()).toBeVisible();

    await leadWorkspace.locator(`#lead-note-${leadId}`).fill(contactOutcome);
    await leadWorkspace.getByRole('button', { name: 'Record contact', exact: true }).click();
    await expect(leadWorkspace.getByText(contactOutcome, { exact: true })).toBeVisible();

    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    await leadWorkspace.locator(`#lead-follow-up-${leadId}`).fill(followUpAt);
    await leadWorkspace.getByPlaceholder('What should happen next?').fill(followUpNote);
    await leadWorkspace.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
    await expect(
      leadWorkspace.getByRole('button', { name: 'Complete follow-up', exact: true }),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const [stored] = await query(
          `SELECT firstRespondedAt, lastContactedAt, nextFollowUp
           FROM leads
          WHERE id = ?`,
          [leadId],
        );
        return Boolean(stored?.firstRespondedAt && stored.lastContactedAt && stored.nextFollowUp);
      })
      .toBe(true);
    const [storedLead] = await query(
      `SELECT firstRespondedAt, lastContactedAt, nextFollowUp
         FROM leads
        WHERE id = ?`,
      [leadId],
    );
    expect(storedLead?.firstRespondedAt).toBeTruthy();
    expect(storedLead?.lastContactedAt).toBeTruthy();
    expect(storedLead?.nextFollowUp).toBeTruthy();

    const [recordedContact] = await query(
      `SELECT type, description
         FROM lead_activities
        WHERE leadId = ?
          AND description = ?
        ORDER BY id DESC
        LIMIT 1`,
      [leadId, contactOutcome],
    );
    expect(recordedContact).toMatchObject({ type: 'call', description: contactOutcome });

    const [scheduledFollowUp] = await query(
      `SELECT type, description
         FROM lead_activities
        WHERE leadId = ?
          AND description LIKE ?
        ORDER BY id DESC
        LIMIT 1`,
      [leadId, `%${followUpNote}%`],
    );
    expect(scheduledFollowUp).toMatchObject({ type: 'note' });
  });
});
