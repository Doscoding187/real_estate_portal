/**
 * Unit tests for listing wizard Zod validation schemas
 *
 * Tests every step schema + cross-step validation helpers.
 * Target: 20+ tests covering valid/invalid data for each step.
 */

import { describe, it, expect } from 'vitest';
import {
  actionSchema,
  propertyTypeSchema,
  basicInformationSchema,
  additionalInformationSchema,
  sellPricingSchema,
  rentPricingSchema,
  auctionPricingSchema,
  locationSchema,
  mediaSchema,
  validatePricingConsistency,
  validateLocationCompleteness,
  validateMediaCompleteness,
  validateStepByAction,
} from '../listingWizardSchemas';

// ─── Action Schema ───────────────────────────────────────────────────

describe('actionSchema', () => {
  it('accepts valid action: sell', () => {
    expect(actionSchema.safeParse({ action: 'sell' }).success).toBe(true);
  });
  it('accepts valid action: rent', () => {
    expect(actionSchema.safeParse({ action: 'rent' }).success).toBe(true);
  });
  it('accepts valid action: auction', () => {
    expect(actionSchema.safeParse({ action: 'auction' }).success).toBe(true);
  });
  it('rejects empty action', () => {
    const r = actionSchema.safeParse({});
    expect(r.success).toBe(false);
  });
  it('rejects invalid action', () => {
    const r = actionSchema.safeParse({ action: 'invalid' });
    expect(r.success).toBe(false);
  });
});

// ─── Property Type Schema ────────────────────────────────────────────

describe('propertyTypeSchema', () => {
  it('accepts all 6 property types', () => {
    for (const t of ['apartment', 'house', 'farm', 'land', 'commercial', 'shared_living']) {
      expect(propertyTypeSchema.safeParse({ propertyType: t }).success).toBe(true);
    }
  });
  it('rejects missing property type', () => {
    expect(propertyTypeSchema.safeParse({}).success).toBe(false);
  });
  it('rejects invalid property type', () => {
    expect(propertyTypeSchema.safeParse({ propertyType: 'castle' }).success).toBe(false);
  });
});

// ─── Basic Information Schema ────────────────────────────────────────

describe('basicInformationSchema', () => {
  it('accepts valid title and description', () => {
    const r = basicInformationSchema.safeParse({
      title: 'Modern 3-Bedroom Apartment in Sandton',
      description: 'A beautiful modern apartment with stunning views and premium finishes.',
    });
    expect(r.success).toBe(true);
  });
  it('rejects title shorter than 10 chars', () => {
    const r = basicInformationSchema.safeParse({ title: 'Short', description: 'Valid long enough description text here for testing purposes' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain('title');
  });
  it('rejects description shorter than 50 chars', () => {
    const r = basicInformationSchema.safeParse({ title: 'A Valid Title Here', description: 'Too short' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain('description');
  });
  it('rejects title exceeding 255 chars', () => {
    const r = basicInformationSchema.safeParse({
      title: 'A'.repeat(256),
      description: 'Valid long enough description text here for testing purposes that meets fifty characters',
    });
    expect(r.success).toBe(false);
  });
});

// ─── Pricing Schemas ─────────────────────────────────────────────────

describe('sellPricingSchema', () => {
  it('accepts valid sell pricing', () => {
    const r = sellPricingSchema.safeParse({ askingPrice: 1500000, negotiable: true });
    expect(r.success).toBe(true);
  });
  it('rejects asking price below 1000', () => {
    const r = sellPricingSchema.safeParse({ askingPrice: 500 });
    expect(r.success).toBe(false);
  });
  it('rejects missing asking price', () => {
    expect(sellPricingSchema.safeParse({}).success).toBe(false);
  });
});

describe('rentPricingSchema', () => {
  it('accepts valid rent pricing', () => {
    const r = rentPricingSchema.safeParse({ monthlyRent: 15000, deposit: 30000 });
    expect(r.success).toBe(true);
  });
  it('rejects monthly rent below 1000', () => {
    const r = rentPricingSchema.safeParse({ monthlyRent: 500, deposit: 1000 });
    expect(r.success).toBe(false);
  });
  it('rejects negative deposit', () => {
    const r = rentPricingSchema.safeParse({ monthlyRent: 15000, deposit: -100 });
    expect(r.success).toBe(false);
  });
});

describe('auctionPricingSchema', () => {
  it('accepts valid auction pricing', () => {
    const r = auctionPricingSchema.safeParse({ startingBid: 500000, auctionDateTime: '2026-07-15T14:00:00Z' });
    expect(r.success).toBe(true);
  });
  it('rejects starting bid below 1000', () => {
    const r = auctionPricingSchema.safeParse({ startingBid: 500, auctionDateTime: '2026-07-15T14:00:00Z' });
    expect(r.success).toBe(false);
  });
  it('rejects missing auction date', () => {
    const r = auctionPricingSchema.safeParse({ startingBid: 500000 });
    expect(r.success).toBe(false);
  });
});

// ─── Location Schema ─────────────────────────────────────────────────

describe('locationSchema', () => {
  it('accepts valid location', () => {
    const r = locationSchema.safeParse({
      address: '123 Main St',
      latitude: -26.204,
      longitude: 28.045,
      city: 'Johannesburg',
      province: 'Gauteng',
    });
    expect(r.success).toBe(true);
  });
  it('rejects missing address', () => {
    const r = locationSchema.safeParse({ latitude: -26.2, longitude: 28.04, city: 'JHB', province: 'GP' });
    expect(r.success).toBe(false);
  });
  it('rejects missing coordinates', () => {
    const r = locationSchema.safeParse({ address: '123 Main St', city: 'JHB', province: 'GP' });
    expect(r.success).toBe(false);
  });
  it('rejects invalid latitude', () => {
    const r = locationSchema.safeParse({
      address: '123 Main St', latitude: 100, longitude: 28.04, city: 'JHB', province: 'GP',
    });
    expect(r.success).toBe(false);
  });
  it('accepts location with optional suburb', () => {
    const r = locationSchema.safeParse({
      address: '123 Main St', latitude: -26.2, longitude: 28.04, city: 'JHB', province: 'GP', suburb: 'Sandton',
    });
    expect(r.success).toBe(true);
  });
});

// ─── Media Schema ────────────────────────────────────────────────────

describe('mediaSchema', () => {
  it('accepts media with at least 1 item', () => {
    const r = mediaSchema.safeParse({ media: ['photo1.jpg'] });
    expect(r.success).toBe(true);
  });
  it('rejects empty media array', () => {
    const r = mediaSchema.safeParse({ media: [] });
    expect(r.success).toBe(false);
  });
  it('rejects missing media', () => {
    const r = mediaSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ─── Cross-Step: Pricing Consistency ─────────────────────────────────

describe('validatePricingConsistency', () => {
  it('returns valid for sell with asking price', () => {
    const r = validatePricingConsistency('sell', { askingPrice: 1500000 });
    expect(r.valid).toBe(true);
  });
  it('returns invalid for sell without asking price', () => {
    const r = validatePricingConsistency('sell', {});
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it('returns valid for rent with monthly rent', () => {
    const r = validatePricingConsistency('rent', { monthlyRent: 15000 });
    expect(r.valid).toBe(true);
  });
  it('returns invalid for rent without monthly rent', () => {
    const r = validatePricingConsistency('rent', {});
    expect(r.valid).toBe(false);
  });
  it('returns valid for auction with starting bid', () => {
    const r = validatePricingConsistency('auction', { startingBid: 500000 });
    expect(r.valid).toBe(true);
  });
  it('returns invalid for auction without starting bid', () => {
    const r = validatePricingConsistency('auction', {});
    expect(r.valid).toBe(false);
  });
});

// ─── Cross-Step: Location Completeness ────────────────────────────────

describe('validateLocationCompleteness', () => {
  it('returns valid for complete location', () => {
    const r = validateLocationCompleteness({ address: '123 Main St', latitude: -26.2, longitude: 28.04 });
    expect(r.valid).toBe(true);
  });
  it('returns invalid for missing location', () => {
    const r = validateLocationCompleteness(null);
    expect(r.valid).toBe(false);
  });
  it('returns invalid for missing address', () => {
    const r = validateLocationCompleteness({ latitude: -26.2, longitude: 28.04 });
    expect(r.valid).toBe(false);
  });
  it('returns invalid for missing coordinates', () => {
    const r = validateLocationCompleteness({ address: '123 Main St' });
    expect(r.valid).toBe(false);
  });
  it('returns warnings for missing suburb', () => {
    const r = validateLocationCompleteness({ address: '123 Main St', latitude: -26.2, longitude: 28.04 });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain('suburb');
  });
});

// ─── Cross-Step: Media Completeness ──────────────────────────────────

describe('validateMediaCompleteness', () => {
  it('returns valid with sufficient media', () => {
    const r = validateMediaCompleteness(['a', 'b', 'c']);
    expect(r.valid).toBe(true);
  });
  it('returns invalid for empty media', () => {
    const r = validateMediaCompleteness([]);
    expect(r.valid).toBe(false);
  });
  it('returns invalid for null media', () => {
    const r = validateMediaCompleteness(null as any);
    expect(r.valid).toBe(false);
  });
  it('returns warnings for only 1 photo', () => {
    const r = validateMediaCompleteness(['a']);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

// ─── validateStepByAction ────────────────────────────────────────────

describe('validateStepByAction', () => {
  it('validates action step', () => {
    const r = validateStepByAction('action', { action: 'sell' });
    expect(r.valid).toBe(true);
  });
  it('validates property_type step', () => {
    const r = validateStepByAction('property_type', { propertyType: 'house' });
    expect(r.valid).toBe(true);
  });
  it('validates basic_information step', () => {
    const r = validateStepByAction('basic_information', {
      title: 'A Valid Title Here',
      description: 'A valid description that has enough characters to pass the 50 character minimum test requirement.',
    });
    expect(r.valid).toBe(true);
  });
  it('validates pricing step - sell', () => {
    const r = validateStepByAction('pricing', { pricing: { askingPrice: 1500000 } }, 'sell');
    expect(r.valid).toBe(true);
  });
  it('validates pricing step - rent', () => {
    const r = validateStepByAction('pricing', { pricing: { monthlyRent: 15000, deposit: 30000 } }, 'rent');
    expect(r.valid).toBe(true);
  });
  it('validates pricing step - auction', () => {
    const r = validateStepByAction('pricing', { pricing: { startingBid: 500000, auctionDateTime: '2026-07-15T14:00:00Z' } }, 'auction');
    expect(r.valid).toBe(true);
  });
  it('rejects pricing step with missing pricing', () => {
    const r = validateStepByAction('pricing', {});
    expect(r.valid).toBe(false);
  });
  it('validates location step', () => {
    const r = validateStepByAction('location', {
      address: '123 Main St', latitude: -26.2, longitude: 28.04, city: 'JHB', province: 'GP',
    });
    expect(r.valid).toBe(true);
  });
  it('validates media_upload step', () => {
    const r = validateStepByAction('media_upload', { media: ['photo1.jpg'] });
    expect(r.valid).toBe(true);
  });
  it('rejects media_upload step with no media', () => {
    const r = validateStepByAction('media_upload', { media: [] });
    expect(r.valid).toBe(false);
  });
  it('validates preview_publish step (always valid)', () => {
    const r = validateStepByAction('preview_publish', {});
    expect(r.valid).toBe(true);
  });
  it('validates additional_information step (all optional)', () => {
    const r = validateStepByAction('additional_information', {});
    expect(r.valid).toBe(true);
  });
});