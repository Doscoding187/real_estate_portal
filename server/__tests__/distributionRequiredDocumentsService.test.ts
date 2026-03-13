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
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                throw { code: 'ER_BAD_FIELD_ERROR' };
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
});
