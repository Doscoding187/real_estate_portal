import { describe, expect, it } from 'vitest';
import { pickAreaIllustrations } from './areaIllustration';

const SANDTON = [
  { slug: 'sandton-central', typeLabel: 'Business' },
  { slug: 'morningside', typeLabel: 'Residential' },
  { slug: 'bryanston', typeLabel: 'Residential' },
  { slug: 'wynberg', typeLabel: 'Residential' },
  { slug: 'rivonia', typeLabel: 'Residential' },
];

describe('pickAreaIllustrations', () => {
  it('is deterministic', () => {
    expect(pickAreaIllustrations(SANDTON)).toEqual(pickAreaIllustrations(SANDTON));
  });

  it('never repeats an illustration on adjacent cards', () => {
    const picks = pickAreaIllustrations(SANDTON);
    for (let i = 1; i < picks.length; i += 1) expect(picks[i]).not.toBe(picks[i - 1]);
  });

  it('maps business and estate types', () => {
    const picks = pickAreaIllustrations([
      { slug: 'a', typeLabel: 'Business' },
      { slug: 'b', typeLabel: 'Estate' },
    ]);
    expect(picks).toEqual(['business-towers', 'security-estate']);
  });

  it('avoids adjacent duplicates for identical slugs', () => {
    const picks = pickAreaIllustrations(
      Array.from({ length: 6 }, () => ({ slug: 'same', typeLabel: 'Residential' })),
    );
    for (let i = 1; i < picks.length; i += 1) expect(picks[i]).not.toBe(picks[i - 1]);
  });
});
