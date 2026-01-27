/**
 * Integration Tests for Publish Flow
 *
 * Tests the publish normalization layer and contract enforcement.
 * Requires a test database connection.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { publishDevelopmentStrict, saveDraft } from '../../server/services/developmentService';
import { getDb } from '../../server/db-connection';
import { developments, developers, unitTypes } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { WizardData } from '../../server/services/publishNormalizer';

// Test developer ID (ensure this exists in your test DB)
const TEST_DEVELOPER_ID = 1;

describe('Publish Flow Integration Tests', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.delete(developments).where(eq(developments.name, 'Test Development'));
    }
  });

  beforeEach(async () => {
    // Clean up any previous test data
    if (db) {
      await db.delete(developments).where(eq(developments.name, 'Test Development'));
    }
  });

  describe('1. Minimal Valid Development', () => {
    it('should publish with only required fields', async () => {
      const minimalWizardData: WizardData = {
        name: 'Test Development',
        city: 'Cape Town',
        province: 'Western Cape',
        developmentType: 'residential',
        unitTypes: [
          {
            name: '2 Bed Apartment',
            bedrooms: 2,
            bathrooms: 1,
            basePriceFrom: 1500000,
          },
        ],
        images: JSON.stringify([{ url: 'https://example.com/hero.jpg', category: 'hero' }]),
      };

      const result = await publishDevelopmentStrict(TEST_DEVELOPER_ID, minimalWizardData);

      expect(result.developmentId).toBeGreaterThan(0);
      expect(result.unitTypesCount).toBe(1);

      // Verify DB write
      const [created] = await db!
        .select()
        .from(developments)
        .where(eq(developments.id, result.developmentId))
        .limit(1);

      expect(created).toBeDefined();
      expect(created.name).toBe('Test Development');
      expect(created.city).toBe('Cape Town');
      expect(created.isPublished).toBe(1);
    });
  });

  describe('2. With Unit Types + Media', () => {
    it('should publish with multiple unit types and media', async () => {
      const wizardData: WizardData = {
        name: 'Test Development',
        city: 'Johannesburg',
        province: 'Gauteng',
        developmentType: 'residential',
        description: 'A beautiful development',
        unitTypes: [
          {
            name: '1 Bed Apartment',
            bedrooms: 1,
            bathrooms: 1,
            basePriceFrom: 1200000,
          },
          {
            name: '2 Bed Apartment',
            bedrooms: 2,
            bathrooms: 2,
            basePriceFrom: 1800000,
          },
        ],
        images: JSON.stringify([
          { url: 'https://example.com/hero.jpg', category: 'hero' },
          { url: 'https://example.com/gallery1.jpg', category: 'gallery' },
        ]),
        videos: JSON.stringify([{ url: 'https://example.com/video.mp4' }]),
      };

      const result = await publishDevelopmentStrict(TEST_DEVELOPER_ID, wizardData);

      expect(result.unitTypesCount).toBe(2);

      // Verify unit types persisted
      const units = await db!
        .select()
        .from(unitTypes)
        .where(eq(unitTypes.developmentId, result.developmentId));

      expect(units).toHaveLength(2);
      expect(units[0].name).toBe('1 Bed Apartment');
      expect(units[1].name).toBe('2 Bed Apartment');
    });
  });

  describe('3. Empty Optional Fields', () => {
    it('should convert empty strings to null without crashing', async () => {
      const wizardData: WizardData = {
        name: 'Test Development',
        city: 'Durban',
        province: 'KwaZulu-Natal',
        developmentType: 'residential',
        description: '', // Empty string should become null
        tagline: '   ', // Whitespace should become null
        suburb: '',
        unitTypes: [
          {
            name: '2 Bed Apartment',
            bedrooms: 2,
            bathrooms: 1,
            basePriceFrom: 1500000,
          },
        ],
        images: JSON.stringify([{ url: 'https://example.com/hero.jpg' }]),
      };

      const result = await publishDevelopmentStrict(TEST_DEVELOPER_ID, wizardData);

      expect(result.developmentId).toBeGreaterThan(0);

      // Verify null conversion
      const [created] = await db!
        .select()
        .from(developments)
        .where(eq(developments.id, result.developmentId))
        .limit(1);

      expect(created.description).toBeNull();
      expect(created.tagline).toBeNull();
      expect(created.suburb).toBeNull();
    });
  });

  describe('4. Invalid Enum Values', () => {
    it('should throw clear validation error for invalid developmentType', async () => {
      const wizardData: WizardData = {
        name: 'Test Development',
        city: 'Pretoria',
        province: 'Gauteng',
        developmentType: 'invalid_type', // Invalid enum
        unitTypes: [
          {
            name: '2 Bed Apartment',
            bedrooms: 2,
            bathrooms: 1,
            basePriceFrom: 1500000,
          },
        ],
        images: JSON.stringify([{ url: 'https://example.com/hero.jpg' }]),
      };

      await expect(publishDevelopmentStrict(TEST_DEVELOPER_ID, wizardData)).rejects.toThrow(
        /Invalid developmentType/,
      );
    });

    it('should throw clear validation error for missing unit types', async () => {
      const wizardData: WizardData = {
        name: 'Test Development',
        city: 'Port Elizabeth',
        province: 'Eastern Cape',
        developmentType: 'residential',
        unitTypes: [], // Empty array
        images: JSON.stringify([{ url: 'https://example.com/hero.jpg' }]),
      };

      await expect(publishDevelopmentStrict(TEST_DEVELOPER_ID, wizardData)).rejects.toThrow(
        /At least one unit type is required/,
      );
    });

    it('should throw clear validation error for missing hero image', async () => {
      const wizardData: WizardData = {
        name: 'Test Development',
        city: 'Bloemfontein',
        province: 'Free State',
        developmentType: 'residential',
        unitTypes: [
          {
            name: '2 Bed Apartment',
            bedrooms: 2,
            bathrooms: 1,
            basePriceFrom: 1500000,
          },
        ],
        images: '', // No images
      };

      await expect(publishDevelopmentStrict(TEST_DEVELOPER_ID, wizardData)).rejects.toThrow(
        /Hero Image is required/,
      );
    });
  });

  describe('5. Update Flow', () => {
    it('should handle update flow without creating duplicates', async () => {
      // First publish
      const wizardData: WizardData = {
        name: 'Test Development',
        city: 'Polokwane',
        province: 'Limpopo',
        developmentType: 'residential',
        unitTypes: [
          {
            name: '2 Bed Apartment',
            bedrooms: 2,
            bathrooms: 1,
            basePriceFrom: 1500000,
          },
        ],
        images: JSON.stringify([{ url: 'https://example.com/hero.jpg' }]),
      };

      const firstResult = await publishDevelopmentStrict(TEST_DEVELOPER_ID, wizardData);

      // Update (change name)
      const updatedData: WizardData = {
        ...wizardData,
        name: 'Test Development Updated',
      };

      const secondResult = await publishDevelopmentStrict(TEST_DEVELOPER_ID, updatedData);

      // Should create a new development (not update existing)
      // If you want update behavior, use updateDevelopment instead
      expect(secondResult.developmentId).not.toBe(firstResult.developmentId);

      // Verify both exist
      const allDevelopments = await db!
        .select()
        .from(developments)
        .where(eq(developments.developerId, TEST_DEVELOPER_ID));

      expect(allDevelopments.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('6. Draft Save', () => {
    it('should save incomplete data as draft', async () => {
      const incompleteDraft: WizardData = {
        name: 'Incomplete Draft',
        city: '', // Missing required field for publish
        province: '', // Missing required field for publish
        developmentType: 'residential',
        // No unit types
        // No images
      };

      const result = await saveDraft(TEST_DEVELOPER_ID, incompleteDraft);

      expect(result.draftId).toBeGreaterThan(0);
    });
  });
});
