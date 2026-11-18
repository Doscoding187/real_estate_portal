import { describe, expect, it } from 'vitest';
import { placeGuideHeroImage } from './placeGuideImage';

describe('placeGuideHeroImage', () => {
  it('prefers the place own hero', () => {
    expect(
      placeGuideHeroImage({
        placePath: '/gauteng/sandton',
        cityPath: '/gauteng/johannesburg',
        provincePath: '/gauteng',
      })?.hero,
    ).toBe('/images/city-guides-v1/sandton-hero.webp');
  });

  it('falls back to the parent city hero', () => {
    expect(
      placeGuideHeroImage({
        placePath: '/gauteng/johannesburg/linden',
        cityPath: '/gauteng/johannesburg',
        provincePath: '/gauteng',
      })?.hero,
    ).toBe('/images/city-guides-v1/johannesburg-hero.webp');
  });

  it('falls back to the province hero, then to nothing', () => {
    expect(
      placeGuideHeroImage({
        placePath: '/limpopo/x',
        cityPath: '/limpopo/y',
        provincePath: '/limpopo',
      })?.hero,
    ).toBe('/images/province-guides-v1/limpopo-desktop.webp');
    expect(
      placeGuideHeroImage({ placePath: '/x/y', cityPath: null, provincePath: '/x' }),
    ).toBeUndefined();
  });
});
