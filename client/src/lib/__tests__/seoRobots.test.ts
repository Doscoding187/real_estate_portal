import { beforeEach, describe, expect, it } from 'vitest';

import { applySeo } from '@/lib/seo';

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');

describe('applySeo robots', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('defaults to index, follow', () => {
    applySeo({ title: 'Page' });
    expect(robots()).toBe('index, follow');
  });

  it('keeps noindex as noindex, nofollow', () => {
    applySeo({ title: 'Page', noindex: true });
    expect(robots()).toBe('noindex, nofollow');
  });

  it('writes noindex, follow when asked, and noindex still wins', () => {
    applySeo({ title: 'Page', noindexFollow: true });
    expect(robots()).toBe('noindex, follow');
    applySeo({ title: 'Page', noindex: true, noindexFollow: true });
    expect(robots()).toBe('noindex, nofollow');
  });
});
