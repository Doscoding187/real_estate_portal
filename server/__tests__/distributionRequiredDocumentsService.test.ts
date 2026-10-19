import { describe, expect, it } from 'vitest';
import {
  getDevelopmentRequiredDocumentSummary,
  isMissingRequiredDocumentsSchemaError,
  listDevelopmentRequiredDocumentsOrEmpty,
  sanitizeDevelopmentDocumentUrl,
} from '../services/distributionRequiredDocumentsService';

describe('distributionRequiredDocumentsService', () => {
  it('detects legacy required-document schema errors through nested causes', () => {
    expect(
      isMissingRequiredDocumentsSchemaError({
        cause: { code: 'ER_BAD_FIELD_ERROR' },
      }),
    ).toBe(true);
  });

  it('propagates an unavailable required-document schema', async () => {
    let callCount = 0;
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                callCount += 1;
                if (callCount === 1) {
                  throw { code: 'ER_BAD_FIELD_ERROR' };
                }
                return [{ requiredDocsCount: 0, requiredRequiredDocsCount: 0 }];
              },
            };
          },
        };
      },
    };

    await expect(getDevelopmentRequiredDocumentSummary(db, 60001)).rejects.toMatchObject({
      code: 'ER_BAD_FIELD_ERROR',
    });
  });

  it('counts active required application documents in readiness when categories exist', async () => {
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return [
                  { isActive: 1, isRequired: 1 },
                  { isActive: 1, isRequired: 0 },
                  { isActive: 0, isRequired: 1 },
                ];
              },
            };
          },
        };
      },
    };

    await expect(getDevelopmentRequiredDocumentSummary(db, 60001)).resolves.toEqual({
      requiredDocsCount: 2,
      requiredRequiredDocsCount: 1,
    });
  });

  it('propagates a missing required-documents table', async () => {
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  orderBy() {
                    throw { errno: 1146 };
                  },
                };
              },
            };
          },
        };
      },
    };

    await expect(listDevelopmentRequiredDocumentsOrEmpty(db, 60001)).rejects.toMatchObject({
      errno: 1146,
    });
  });

  it('does not fall back to legacy rows when category is unavailable', async () => {
    let callCount = 0;
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                callCount += 1;
                if (callCount === 1) {
                  return {
                    orderBy() {
                      throw { code: 'ER_BAD_FIELD_ERROR' };
                    },
                  };
                }

                return {
                  orderBy() {
                    return [
                      {
                        id: 7,
                        developmentId: 60001,
                        documentCode: 'custom',
                        documentLabel: 'Price Structure',
                        isRequired: 1,
                        sortOrder: 0,
                        isActive: 1,
                      },
                    ];
                  },
                };
              },
            };
          },
        };
      },
    };

    await expect(listDevelopmentRequiredDocumentsOrEmpty(db, 60001)).rejects.toMatchObject({
      code: 'ER_BAD_FIELD_ERROR',
    });
  });

  it('maps both document categories with sanitized template files', async () => {
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  orderBy() {
                    return [
                      {
                        id: 1,
                        developmentId: 60001,
                        documentCode: 'id_document',
                        documentLabel: 'ID Document',
                        category: 'client_required_document',
                        templateFileUrl: null,
                        templateFileName: null,
                        templateUploadedAt: null,
                        templateUploadedBy: null,
                        isRequired: 1,
                        sortOrder: 0,
                        isActive: 1,
                        createdAt: null,
                      },
                      {
                        id: 2,
                        developmentId: 60001,
                        documentCode: 'custom',
                        documentLabel: 'Sample price list',
                        category: 'developer_document',
                        templateFileUrl: 'https://cdn.example.test/price-list.pdf',
                        templateFileName: 'price-list.pdf',
                        templateUploadedAt: '2026-10-19 08:00:00',
                        templateUploadedBy: 42,
                        isRequired: 0,
                        sortOrder: 1,
                        isActive: 1,
                        createdAt: null,
                      },
                    ];
                  },
                };
              },
            };
          },
        };
      },
    };

    await expect(listDevelopmentRequiredDocumentsOrEmpty(db, 60001)).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        category: 'client_required_document',
        templateFileUrl: null,
      }),
      expect.objectContaining({
        id: 2,
        category: 'developer_document',
        templateFileUrl: 'https://cdn.example.test/price-list.pdf',
        templateFileName: 'price-list.pdf',
        templateUploadedBy: 42,
        isRequired: false,
      }),
    ]);
  });

  it('accepts only safe same-origin or https document URLs', () => {
    expect(sanitizeDevelopmentDocumentUrl('/properties/site-plan.pdf')).toBe(
      '/properties/site-plan.pdf',
    );
    expect(sanitizeDevelopmentDocumentUrl('https://cdn.example.test/plan.pdf')).toBe(
      'https://cdn.example.test/plan.pdf',
    );
    expect(sanitizeDevelopmentDocumentUrl('//evil.example.test/plan.pdf')).toBeNull();
    expect(sanitizeDevelopmentDocumentUrl('http://cdn.example.test/plan.pdf')).toBeNull();
    expect(sanitizeDevelopmentDocumentUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeDevelopmentDocumentUrl('https://user:pass@cdn.example.test/plan.pdf')).toBeNull();
    expect(sanitizeDevelopmentDocumentUrl('https://cdn.example.test/plan\u0000.pdf')).toBeNull();
    expect(sanitizeDevelopmentDocumentUrl('')).toBeNull();
  });
});
