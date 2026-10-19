import { describe, expect, it, vi } from 'vitest';

const { cityGuideStatus } = vi.hoisted(() => ({
  cityGuideStatus: { value: 'local-review' as 'local-review' | 'published' },
}));

vi.mock('../../shared/cityGuideContent', () => ({
  getCityGuideContent: (provinceSlug: string, citySlug: string) =>
    provinceSlug === 'gauteng' && citySlug === 'johannesburg'
      ? { status: cityGuideStatus.value }
      : undefined,
}));

import { resolveSeoPageData } from '../_core/seoHead';

describe('suburb guide initial metadata', () => {
  it('serves pilot suburb metadata as noindex while the city guide is local-review', () => {
    cityGuideStatus.value = 'local-review';
    const metadata = resolveSeoPageData('/gauteng/johannesburg/sandton');

    expect(metadata.title).toBe(
      'Sandton property guide: homes, rentals & developments | Property Listify',
    );
    expect(metadata.description).toBe(
      'Explore homes for sale, rentals and new developments in Sandton, Johannesburg.',
    );
    expect(metadata.canonicalUrl).toBe(
      'https://www.propertylistifysa.co.za/gauteng/johannesburg/sandton',
    );
    expect(metadata.robots).toBe('noindex, follow');
  });

  it('indexes only the clean pilot path once the city guide is published', () => {
    cityGuideStatus.value = 'published';

    expect(resolveSeoPageData('/gauteng/johannesburg/sandton').robots).toBe('index, follow');
    expect(resolveSeoPageData('/gauteng/johannesburg/sandton?journey=buy').robots).toBe(
      'noindex, follow',
    );
  });

  it('keeps non-pilot suburbs noindex even when the city guide is published', () => {
    cityGuideStatus.value = 'published';

    expect(resolveSeoPageData('/gauteng/johannesburg/rosebank').robots).toBe('noindex, follow');
  });

  it('keeps suburb paths outside the pilot province noindex', () => {
    cityGuideStatus.value = 'published';

    expect(resolveSeoPageData('/western-cape/cape-town/claremont').robots).toBe('noindex, follow');
  });

  it('lowercases suburb canonical paths regardless of request casing', () => {
    cityGuideStatus.value = 'published';
    const metadata = resolveSeoPageData('/Gauteng/Johannesburg/Sandton');

    expect(metadata.canonicalUrl).toBe(
      'https://www.propertylistifysa.co.za/gauteng/johannesburg/sandton',
    );
  });

  it('does not change advertise journey indexability', () => {
    cityGuideStatus.value = 'published';

    expect(resolveSeoPageData('/advertise/sell/agencies').robots).toBe('index, follow');
  });
});
