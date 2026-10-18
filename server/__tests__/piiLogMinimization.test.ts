import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead, mockCheckRateLimit, mockGetClientIp, mockGetDb, mockInsertValues } =
  vi.hoisted(() => ({
    mockCapturePublicLead: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockGetClientIp: vi.fn(),
    mockGetDb: vi.fn(),
    mockInsertValues: vi.fn(),
  }));

vi.mock('../services/publicLeadCaptureService', () => ({
  capturePublicLead: mockCapturePublicLead,
}));

vi.mock('../services/publicLeadRateLimitService', () => ({
  checkPublicLeadRateLimit: mockCheckRateLimit,
  getPublicLeadClientIp: mockGetClientIp,
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  db: { insert: () => ({ values: mockInsertValues }) },
}));

vi.mock('../services/publisherLeadService', () => ({
  publisherLeadService: {
    retryPublisherLeadDelivery: vi.fn(),
  },
}));

import { safeErrorSummary } from '../_core/safeError';
import { leadsRouter } from '../leadsRouter';
import { ExploreInteractionService } from '../services/exploreInteractionService';

const SENSITIVE_IP = '198.51.100.20';
const SENSITIVE_PROBE =
  /198\.51\.100\.20|bot@example\.test|buyer@example\.test|0821234567|Bot Prospect|Buyer Prospect/;

const consent = { accepted: true as const, version: '2026-08-02', source: 'pii-log-test' };

describe('lead capture log minimization', () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReturnValue(true);
    mockGetClientIp.mockReturnValue(SENSITIVE_IP);
    mockCapturePublicLead.mockResolvedValue({ success: true, leadId: 7, route: 'direct' });
  });

  it('logs a honeypot trigger without the client IP or submitted contact fields', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const caller = leadsRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
      requestId: 'pii-log-honeypot',
    } as any);

    await caller.create({
      name: 'Bot Prospect',
      email: 'bot@example.test',
      phone: '0821234567',
      website: 'https://bot.example.test',
      propertyId: 501,
      captureRequestId: 'pii-log-honeypot-001',
      consent,
    });

    expect(info).toHaveBeenCalledTimes(1);
    const [message] = info.mock.calls[0] as [string];
    expect(message.startsWith('[LeadCapture] ')).toBe(true);
    const payload = message.slice('[LeadCapture] '.length);
    expect(payload).toContain('"event":"honeypot_trigger"');
    expect(payload).toContain('"requestId":"pii-log-honeypot"');
    expect(payload).not.toContain('"ip"');
    expect(JSON.stringify(info.mock.calls)).not.toMatch(SENSITIVE_PROBE);
  });

  it('logs an accepted lead with identifiers only, never the client IP', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const caller = leadsRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
      requestId: 'pii-log-accepted',
    } as any);

    const result = await caller.create({
      name: 'Buyer Prospect',
      email: 'buyer@example.test',
      phone: '0821234567',
      propertyId: 501,
      captureRequestId: 'pii-log-accepted-001',
      consent,
    });

    expect(result.leadId).toBe(7);
    const [message] = info.mock.calls[0] as [string];
    expect(message.startsWith('[LeadCapture] ')).toBe(true);
    const payload = message.slice('[LeadCapture] '.length);
    expect(payload).toContain('"event":"lead_accepted"');
    expect(payload).toContain('"leadId":7');
    expect(payload).not.toContain('"ip"');
    expect(JSON.stringify(info.mock.calls)).not.toMatch(SENSITIVE_PROBE);
  });
});

describe('explore engagement log minimization', () => {
  beforeEach(() => {
    mockInsertValues.mockResolvedValue(undefined);
  });

  it('reports only non-identifying interaction facts before the insert', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const service = new ExploreInteractionService();

    await service.recordInteraction({
      contentId: 12,
      userId: 4242,
      sessionId: 'private-session-token',
      interactionType: 'view',
      feedType: 'recommended',
      deviceType: 'mobile',
      userAgent: 'SecretAgent/9.9',
      ipAddress: SENSITIVE_IP,
    });

    expect(log).toHaveBeenCalledWith('[ENG_INSERT_ATTEMPT]', {
      contentId: 12,
      interactionType: 'view',
      feedType: 'recommended',
      deviceType: 'mobile',
    });
    expect(log).toHaveBeenCalledWith('[ENG_INSERT_OK]', {
      contentId: 12,
      interactionType: 'view',
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /4242|private-session-token|SecretAgent|198\.51\.100\.20|userId|sessionId/,
    );
  });
});

describe('safe error summaries', () => {
  it('redacts quoted segments and email-like tokens from mysql-style errors', () => {
    const error = Object.assign(
      new Error("Duplicate entry 'buyer@example.test' for key 'users.email'"),
      {
        code: 'ER_DUP_ENTRY',
        errno: 1062,
        sqlState: '23000',
        sql: "INSERT INTO users (email) VALUES ('buyer@example.test')",
        sqlMessage: "Duplicate entry 'buyer@example.test' for key 'users.email'",
      },
    );

    const summary = safeErrorSummary(error);

    expect(summary).toEqual({
      name: 'Error',
      message: "Duplicate entry '<redacted>' for key '<redacted>'",
      code: 'ER_DUP_ENTRY',
      errno: 1062,
      sqlState: '23000',
    });
    expect(JSON.stringify(summary)).not.toMatch(/buyer@example\.test|INSERT INTO|sqlMessage/);
  });

  it('redacts unquoted email-like tokens in the message', () => {
    const summary = safeErrorSummary(new Error('failed to reach buyer@example.test'));
    expect(summary.message).toBe('failed to reach <redacted>');
  });

  it('bounds the message and reduces non-Error failures to a stable shape', () => {
    expect(safeErrorSummary(new Error('x'.repeat(1000))).message).toHaveLength(300);
    expect(safeErrorSummary('plain failure')).toEqual({ name: 'Error', message: 'plain failure' });
    expect(safeErrorSummary({ weird: true })).toEqual({
      name: 'Error',
      message: 'Non-Error failure',
    });
    expect(safeErrorSummary(null)).toEqual({ name: 'Error', message: 'Non-Error failure' });
  });
});
