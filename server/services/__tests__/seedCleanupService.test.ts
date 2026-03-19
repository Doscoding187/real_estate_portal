import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';
import { seedCleanupService } from '../seedCleanupService';
import { brandCleanupService } from '../brandCleanupService';
import { db } from '../../db';

// Mock dependencies
vi.mock('../brandCleanupService', () => ({
  brandCleanupService: {
    executeCleanup: vi.fn(),
  },
}));

const createMockQuery = (data: any[] = []) => {
  const p = Promise.resolve(data);
  (p as any).from = vi.fn(() => p);
  (p as any).innerJoin = vi.fn(() => p);
  (p as any).where = vi.fn(() => p);
  (p as any).limit = vi.fn(() => Promise.resolve(data));
  return p;
};

vi.mock('../../db', () => ({
  db: {
    select: vi.fn(() => createMockQuery([])),
  },
}));

vi.mock('../../_core/auditLog', () => ({
  logAudit: vi.fn(),
}));

/**
 * Seed Cleanup Service Tests
 *
 * Tests the deterministic matching logic and fail-fast behavior
 * for cleaning up seeded brand profiles during registration.
 */
describe('Seed Cleanup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('normalizeBrandName', () => {
    it('should normalize brand names consistently', () => {
      expect(seedCleanupService.normalizeBrandName('Test Brand')).toBe('testbrand');
      expect(seedCleanupService.normalizeBrandName('TEST BRAND')).toBe('testbrand');
      expect(seedCleanupService.normalizeBrandName('Test-Brand')).toBe('testbrand');
      expect(seedCleanupService.normalizeBrandName('Test_Brand')).toBe('testbrand');
      expect(seedCleanupService.normalizeBrandName('  Test  Brand  ')).toBe('testbrand');
      expect(seedCleanupService.normalizeBrandName('Test & Brand Co.')).toBe('testbrandco');
    });

    it('should handle edge cases', () => {
      expect(seedCleanupService.normalizeBrandName('')).toBe('');
      expect(seedCleanupService.normalizeBrandName('   ')).toBe('');
      expect(seedCleanupService.normalizeBrandName('123')).toBe('123');
    });
  });

  describe('generateSlug', () => {
    it('should generate URL-friendly slugs', () => {
      expect(seedCleanupService.generateSlug('Test Brand')).toBe('test-brand');
      expect(seedCleanupService.generateSlug('Test & Brand Co.')).toBe('test-brand-co');
      expect(seedCleanupService.generateSlug('TEST BRAND')).toBe('test-brand');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(seedCleanupService.generateSlug('-Test-')).toBe('test');
      expect(seedCleanupService.generateSlug('---Test Brand---')).toBe('test-brand');
    });

    it('should truncate long slugs', () => {
      const longName = 'A'.repeat(300);
      expect(seedCleanupService.generateSlug(longName).length).toBeLessThanOrEqual(200);
    });
  });

  describe('findSeedCandidate', () => {
    it('should return null when no matching seed exists', async () => {
      // Mock empty results for all queries
      (db as any).select = vi.fn(() => createMockQuery([]));

      const result = await seedCleanupService.findSeedCandidate('New Brand', 'new-brand');
      expect(result).toBeNull();
    });

    it('should return exact slug match when found', async () => {
      const mockSeed = {
        id: 1,
        brandName: 'Test Brand',
        slug: 'test-brand',
        seedBatchId: 'batch-123',
        ownerType: 'platform' as const,
      };

      // Mock query returns mockSeed for slug match
      (db as any).select = vi.fn(() => createMockQuery([mockSeed]));

      const result = await seedCleanupService.findSeedCandidate('Test Brand', 'test-brand');
      expect(result).toEqual(mockSeed);
    });

    it('should throw on ambiguous slug match', async () => {
      const mockSeeds = [
        {
          id: 1,
          brandName: 'Test Brand 1',
          slug: 'test-brand',
          seedBatchId: 'batch-1',
          ownerType: 'platform',
        },
        {
          id: 2,
          brandName: 'Test Brand 2',
          slug: 'test-brand',
          seedBatchId: 'batch-2',
          ownerType: 'platform',
        },
      ];



      (db as any).select = vi.fn(() => createMockQuery(mockSeeds));

      await expect(
        seedCleanupService.findSeedCandidate('Test Brand', 'test-brand'),
      ).rejects.toThrow('Ambiguous seed match');
    });

    it('should prioritize seedBatchId + slug match', async () => {
      const exactMatch = {
        id: 1,
        brandName: 'Test Brand',
        slug: 'test-brand',
        seedBatchId: 'batch-123',
        ownerType: 'platform' as const,
      };

      // First call (step 1) returns valid match via createMockQuery
      // Subsequent calls return empty arrays via createMockQuery([])
      const mockQueryWithMatch = createMockQuery([exactMatch]);
      const mockQueryEmpty = createMockQuery([]);

      (db as any).select = vi
        .fn()
        .mockReturnValueOnce(mockQueryWithMatch)
        .mockReturnValue(mockQueryEmpty);

      const result = await seedCleanupService.findSeedCandidate(
        'Test Brand',
        'test-brand',
        'batch-123',
      );
      expect(result).toEqual(exactMatch);
    });
  });

  describe('handleSeedDeletionOnRegistration', () => {
    beforeEach(() => {
      // Reset mocks
      vi.clearAllMocks();
    });

    it('should return no_match when no seed candidate exists', async () => {
      // Mock empty results
      (db as any).select = vi.fn(() => createMockQuery([]));

      const result = await seedCleanupService.handleSeedDeletionOnRegistration(
        1, // triggerUserId
        'Brand New Developer',
        'brand-new-developer',
      );

      expect(result.deleted).toBe(false);
      expect(result.reason).toBe('no_match');
      expect(brandCleanupService.executeCleanup).not.toHaveBeenCalled();
    });

    it('should skip deletion when seed has no seedBatchId', async () => {
      const seedWithoutBatchId = {
        id: 1,
        brandName: 'Test Brand',
        slug: 'test-brand',
        seedBatchId: null, // No batch ID
        ownerType: 'platform' as const,
      };

      (db as any).select = vi.fn(() => createMockQuery([seedWithoutBatchId]));

      const result = await seedCleanupService.handleSeedDeletionOnRegistration(
        1,
        'Test Brand',
        'test-brand',
      );

      expect(result.deleted).toBe(false);
      expect(result.reason).toBe('missing_seed_batch_id');
      expect(brandCleanupService.executeCleanup).not.toHaveBeenCalled();
    });

    it('should delete seed and return success when candidate found', async () => {
      const seedCandidate = {
        id: 1,
        brandName: 'Test Brand',
        slug: 'test-brand',
        seedBatchId: 'batch-123',
        ownerType: 'platform' as const,
      };

      // Mock findSeedCandidate to return seed
      const mockQueryFind = createMockQuery([seedCandidate]);

      // Mock for getCountsForAudit
      const mockQueryCounts = createMockQuery([{ count: 0 }]);

      // Sequence the mock
      (db as any).select = vi
        .fn()
        .mockReturnValueOnce(mockQueryFind)
        .mockReturnValue(mockQueryCounts);

      // Mock successful cleanup
      (brandCleanupService.executeCleanup as Mock).mockResolvedValue({
        success: true,
        mode: 'hard',
        deletedItems: {
          developments: 0,
          properties: 0,
          leads: 0,
          mediaFiles: 0,
        },
      });

      const result = await seedCleanupService.handleSeedDeletionOnRegistration(
        1,
        'Test Brand',
        'test-brand',
      );

      expect(result.deleted).toBe(true);
      expect(result.reason).toBe('deleted_on_registration');
      expect(result.deletedCounts?.brandProfileId).toBe(1);
      expect(brandCleanupService.executeCleanup).toHaveBeenCalledWith(1, true);
    });

    it('should throw and block registration when deletion fails', async () => {
      const seedCandidate = {
        id: 1,
        brandName: 'Test Brand',
        slug: 'test-brand',
        seedBatchId: 'batch-123',
        ownerType: 'platform' as const,
      };

      // Mock findSeedCandidate to return seed
      const mockQueryFind = createMockQuery([seedCandidate]);

      // Mock for getCountsForAudit
      const mockQueryCounts = createMockQuery([{ count: 0 }]);

      // Sequence the mock
      (db as any).select = vi
        .fn()
        .mockReturnValueOnce(mockQueryFind)
        .mockReturnValue(mockQueryCounts);

      // Mock cleanup failure
      (brandCleanupService.executeCleanup as Mock).mockRejectedValue(
        new Error('Database transaction failed'),
      );

      await expect(
        seedCleanupService.handleSeedDeletionOnRegistration(1, 'Test Brand', 'test-brand'),
      ).rejects.toThrow('Failed to clean up seeded profile');
    });

    it('should throw when ambiguous match detected', async () => {
      const multipleSeeds = [
        {
          id: 1,
          brandName: 'Test Brand 1',
          slug: 'test-brand',
          seedBatchId: 'batch-1',
          ownerType: 'platform',
        },
        {
          id: 2,
          brandName: 'Test Brand 2',
          slug: 'test-brand',
          seedBatchId: 'batch-2',
          ownerType: 'platform',
        },
      ];

      (db as any).select = vi.fn(() => createMockQuery(multipleSeeds));

      await expect(
        seedCleanupService.handleSeedDeletionOnRegistration(1, 'Test Brand', 'test-brand'),
      ).rejects.toThrow('Ambiguous seed match');
    });
  });
});
