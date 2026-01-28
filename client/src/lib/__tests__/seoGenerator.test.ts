import { describe, it, expect } from 'vitest';
import { generateSEOContent } from '../seoGenerator';

describe('seoGenerator', () => {
  const mockStats = {
    totalListings: 150,
    avgPrice: 2500000,
    rentalCount: 50,
    saleCount: 100,
    minPrice: 500000,
    maxPrice: 15000000,
    avgRentalPrice: 15000,
  };

  it('generates content for a province', () => {
    const content = generateSEOContent({
      type: 'province',
      name: 'Gauteng',
      stats: mockStats,
    });

    const expectedPrice = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(2500000);

    expect(content).toContain('Gauteng');
    expect(content).toContain('150 properties');
    expect(content).toContain(expectedPrice); // Check formatting dynamically
    expect(content).toContain('Real Estate Market Overview');
  });

  it('generates content for a city', () => {
    const content = generateSEOContent({
      type: 'city',
      name: 'Cape Town',
      parentName: 'Western Cape',
      stats: mockStats,
    });

    expect(content).toContain('Cape Town');
    expect(content).toContain('Western Cape');
    expect(content).toContain('Living in Cape Town');
  });

  it('generates content for a suburb', () => {
    const content = generateSEOContent({
      type: 'suburb',
      name: 'Sandton',
      parentName: 'Johannesburg',
      stats: mockStats,
    });

    expect(content).toContain('Sandton');
    expect(content).toContain('Johannesburg');
    expect(content).toContain('Buying Property in Sandton');
  });

  it('handles missing optional stats gracefully', () => {
    const minimalStats = {
      totalListings: 10,
      avgPrice: 1000000,
    };

    const content = generateSEOContent({
      type: 'province',
      name: 'Test Province',
      stats: minimalStats,
    });

    expect(content).toContain('Test Province');
    expect(content).toContain('10 properties');
    // Should not contain "undefined" or crash
    expect(content).not.toContain('undefined');
  });
});
