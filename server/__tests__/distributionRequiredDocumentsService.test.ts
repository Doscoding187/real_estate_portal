import { describe, expect, it } from 'vitest';
import {
  getDevelopmentRequiredDocumentSummary,
  isMissingRequiredDocumentsSchemaError,
  listDevelopmentRequiredDocumentsOrEmpty,
} from '../services/distributionRequiredDocumentsService';

describe('distributionRequiredDocumentsService', () => {
  it('detects legacy required-document schema errors through nested causes', () => {
    expect(
      isMissingRequiredDocumentsSchemaError({
        cause: { code: 'ER_BAD_FIELD_ERROR' },
      }),
    ).toBe(true);
  });

  it('returns zero readiness counts when the active-column schema is missing', async () => {
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

    await expect(getDevelopmentRequiredDocumentSummary(db, 60001)).resolves.toEqual({
      requiredDocsCount: 0,
      requiredRequiredDocsCount: 0,
    });
  });

  it('counts only client-required documents in readiness when categories exist', async () => {
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return [{ requiredDocsCount: 2, requiredRequiredDocsCount: 1 }];
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

  it('returns an empty document list when the required-documents table is missing', async () => {
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

    await expect(listDevelopmentRequiredDocumentsOrEmpty(db, 60001)).resolves.toEqual([]);
  });

  it('falls back to legacy rows as client-required documents when category is unavailable', async () => {
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

    await expect(listDevelopmentRequiredDocumentsOrEmpty(db, 60001)).resolves.toEqual([
      {
        id: 7,
        developmentId: 60001,
        documentCode: 'custom',
        documentLabel: 'Price Structure',
        category: 'client_required_document',
        templateFileUrl: null,
        templateFileName: null,
        templateUploadedAt: null,
        templateUploadedBy: null,
        isRequired: true,
        sortOrder: 0,
        isActive: true,
      },
    ]);
  });
});
