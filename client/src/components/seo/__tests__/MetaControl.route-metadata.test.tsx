import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const routeState = vi.hoisted(() => ({ value: '/' }));

vi.mock('wouter', () => ({
  useLocation: () => [routeState.value, vi.fn()],
}));

import { LocationSchema } from '@/components/location/LocationSchema';
import { MetaControl } from '../MetaControl';

const HOME_TITLE = 'Property Listify | South African Property Search and New Developments';
const HOME_DESCRIPTION =
  'Search South African property listings, explore new developments, compare areas, and connect with agents and developers on Property Listify.';

function seedStaticShellMetadata() {
  document.head.innerHTML = `
    <meta name="description" content="homepage default" />
    <meta property="og:url" content="https://www.propertylistifysa.co.za/" />
    <meta property="og:title" content="homepage default" />
    <meta property="og:description" content="homepage default" />
    <meta name="twitter:url" content="https://www.propertylistifysa.co.za/" />
    <meta name="twitter:title" content="homepage default" />
    <meta name="twitter:description" content="homepage default" />
    <link rel="canonical" href="https://www.propertylistifysa.co.za/" />
    <title>homepage default</title>
  `;
}

function routeMetadata(path: string) {
  routeState.value = path;

  if (path === '/') {
    return (
      <MetaControl
        canonicalUrl="https://www.propertylistifysa.co.za/"
        title={HOME_TITLE}
        description={HOME_DESCRIPTION}
      />
    );
  }

  if (path === '/gauteng') {
    return (
      <LocationSchema
        type="Province"
        name="Gauteng"
        description="Explore Gauteng."
        url="/gauteng"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Gauteng', url: '/gauteng' },
        ]}
        neutralMode
      />
    );
  }

  if (path === '/gauteng/johannesburg') {
    return (
      <LocationSchema
        type="City"
        name="Johannesburg"
        description="Explore Johannesburg."
        url="/gauteng/johannesburg"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Gauteng', url: '/gauteng' },
          { name: 'Johannesburg', url: '/gauteng/johannesburg' },
        ]}
        neutralMode
      />
    );
  }

  if (path === '/gauteng/johannesburg/sandton') {
    return (
      <LocationSchema
        type="Suburb"
        name="Sandton"
        description="Explore Sandton."
        url="/gauteng/johannesburg/sandton"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Gauteng', url: '/gauteng' },
          { name: 'Johannesburg', url: '/gauteng/johannesburg' },
          { name: 'Sandton', url: '/gauteng/johannesburg/sandton' },
        ]}
        neutralMode
      />
    );
  }

  return (
    <MetaControl
      canonicalUrl="/property-for-sale"
      title="Properties for Sale | Property Listify"
      description="Find properties for sale on Property Listify."
    />
  );
}

function metadataSnapshot() {
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    canonicalCount: document.querySelectorAll('link[rel="canonical"]').length,
    descriptionCount: document.querySelectorAll('meta[name="description"]').length,
    ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    twitterUrl: document.querySelector('meta[name="twitter:url"]')?.getAttribute('content'),
    twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
  };
}

describe('route metadata composition', () => {
  beforeEach(() => {
    seedStaticShellMetadata();
  });

  it.each([
    ['/', HOME_TITLE, HOME_DESCRIPTION, '/'],
    [
      '/gauteng',
      'Explore Gauteng | Property Listify',
      'Discover properties, developments, local insights, suburbs, and agents in Gauteng.',
      '/gauteng',
    ],
    [
      '/gauteng/johannesburg',
      'Explore Johannesburg | Property Listify',
      'Discover properties, developments, local insights, suburbs, and agents in Johannesburg.',
      '/gauteng/johannesburg',
    ],
    [
      '/gauteng/johannesburg/sandton',
      'Explore Sandton | Property Listify',
      'Discover properties, developments, local insights, suburbs, and agents in Sandton.',
      '/gauteng/johannesburg/sandton',
    ],
    [
      '/property-for-sale',
      'Properties for Sale | Property Listify',
      'Find properties for sale on Property Listify.',
      '/property-for-sale',
    ],
  ])('owns one coherent metadata set for %s', async (path, title, description, canonicalPath) => {
    render(routeMetadata(path));

    await waitFor(() => {
      const snapshot = metadataSnapshot();
      expect(snapshot.title).toBe(title);
      expect(snapshot.description).toBe(description);
      expect(snapshot.canonical).toContain(canonicalPath);
      expect(snapshot.canonicalCount).toBe(1);
      expect(snapshot.descriptionCount).toBe(1);
      expect(snapshot.ogUrl).toContain(canonicalPath);
      expect(snapshot.ogTitle).toBe(title);
      expect(snapshot.twitterUrl).toContain(canonicalPath);
      expect(snapshot.twitterTitle).toBe(title);
    });
  });

  it('replaces homepage metadata across geography navigation and restores it on return', async () => {
    const view = render(routeMetadata('/'));

    await waitFor(() => expect(document.title).toBe(HOME_TITLE));

    view.rerender(routeMetadata('/gauteng/johannesburg'));
    await waitFor(() => {
      expect(document.title).toBe('Explore Johannesburg | Property Listify');
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
        'href',
        expect.stringContaining('/gauteng/johannesburg'),
      );
    });

    view.rerender(routeMetadata('/gauteng/johannesburg/sandton'));
    await waitFor(() => expect(document.title).toBe('Explore Sandton | Property Listify'));

    view.rerender(routeMetadata('/'));
    await waitFor(() => {
      expect(document.title).toBe(HOME_TITLE);
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
        'href',
        expect.stringMatching(/\/$/),
      );
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    });
  });
});
