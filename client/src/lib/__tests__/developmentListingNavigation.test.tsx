// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DevelopmentSearchAdRail } from '@/components/developments/DevelopmentSearchAdRail';
import { hasInSiteHistory, isInternalHref } from '../developmentListingNavigation';
import { SAVED_DEVELOPMENTS_KEY, writeSavedDevelopments } from '../savedDevelopments';

describe('DevelopmentSearchAdRail', () => {
  it('renders nothing without a sponsor', () => {
    expect(renderToStaticMarkup(<DevelopmentSearchAdRail />)).toBe('');
  });

  it('renders the sponsor image and label when supplied', () => {
    const html = renderToStaticMarkup(
      <DevelopmentSearchAdRail
        sponsor={{ imageUrl: 'https://cdn.example/a.png', href: 'https://x.example', alt: 'Ad' }}
      />,
    );
    expect(html).toContain('Sponsored');
    expect(html).toContain('alt="Ad"');
  });
});

describe('isInternalHref', () => {
  it('accepts only same-site paths', () => {
    expect(isInternalHref('/new-developments/x')).toBe(true);
    expect(isInternalHref('https://evil.example')).toBe(false);
    expect(isInternalHref('//evil.example')).toBe(false);
    expect(isInternalHref('/\\evil.example')).toBe(false);
    expect(isInternalHref('javascript:alert(1)')).toBe(false);
    expect(isInternalHref(undefined)).toBe(false);
  });
});

describe('hasInSiteHistory', () => {
  const win = (length: number) =>
    ({ history: { length }, location: { origin: 'https://site.example' } }) as unknown as Window;
  it('requires history and a same-origin referrer', () => {
    expect(hasInSiteHistory(win(3), 'https://site.example/a')).toBe(true);
    expect(hasInSiteHistory(win(1), 'https://site.example/a')).toBe(false);
    expect(hasInSiteHistory(win(3), '')).toBe(false);
    expect(hasInSiteHistory(win(3), 'https://other.example/')).toBe(false);
  });
});

describe('writeSavedDevelopments', () => {
  it('reports failure when storage throws', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(writeSavedDevelopments([])).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(writeSavedDevelopments([])).toBe(true);
    expect(window.localStorage.getItem(SAVED_DEVELOPMENTS_KEY)).toBe('[]');
  });
});
