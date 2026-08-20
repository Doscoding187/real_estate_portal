import { describe, expect, it } from 'vitest';
import {
  createLandEvidenceDeliveryToken,
  createLandEvidenceUploadReservation,
  verifyLandEvidenceDeliveryToken,
  verifyLandEvidenceUploadReservation,
} from '../landEvidenceStorage';

describe('private Land evidence storage authority', () => {
  it('creates a server-controlled private Land key', () => {
    const result = createLandEvidenceUploadReservation({ landAssetId: 41, userId: 7, fileName: 'title deed.pdf', contentType: 'application/pdf' });
    expect(result.payload.key).toMatch(/^private\/land\/41\//);
    expect(result.payload.key).not.toContain('..');
    expect(verifyLandEvidenceUploadReservation(result.token, { landAssetId: 41, userId: 7 }).key).toBe(result.payload.key);
  });

  it('refuses upload reservation reuse by a different author or asset', () => {
    const result = createLandEvidenceUploadReservation({ landAssetId: 41, userId: 7, fileName: 'mandate.pdf', contentType: 'application/pdf' });
    expect(() => verifyLandEvidenceUploadReservation(result.token, { userId: 8 })).toThrow(/not owned/);
    expect(() => verifyLandEvidenceUploadReservation(result.token, { landAssetId: 42 })).toThrow(/different Land Asset/);
  });

  it('only permits supported private document formats', () => {
    expect(() => createLandEvidenceUploadReservation({ landAssetId: 41, userId: 7, fileName: 'script.exe', contentType: 'application/octet-stream' })).toThrow(/PDF/);
  });

  it('creates short-lived delivery authority without exposing a durable object path in a DTO', () => {
    const token = createLandEvidenceDeliveryToken({ evidenceDocumentId: 9, actorUserId: 7, key: 'private/land/41/a.pdf' });
    const result = verifyLandEvidenceDeliveryToken(token);
    expect(result.evidenceDocumentId).toBe(9);
    expect(result.exp - result.iat).toBe(300);
  });
});
