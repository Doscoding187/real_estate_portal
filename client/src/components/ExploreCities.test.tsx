import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { ExploreCities } from './ExploreCities';

describe('ExploreCities', () => {
  it('routes homepage city discovery to its canonical SEO page', () => {
    render(
      <ExploreCities
        basePath=""
        customLocations={[
          {
            name: 'Johannesburg',
            province: 'Gauteng',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
            propertyCount: '24 Properties',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /johannesburg/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    expect(screen.queryByRole('link', { name: /johannesburg/i })).not.toHaveAttribute(
      'href',
      expect.stringContaining('/property-for-sale'),
    );
  });

  it('preserves configurable search links outside the homepage discovery surface', () => {
    render(
      <ExploreCities
        basePath="/property-for-sale"
        customLocations={[
          {
            name: 'Johannesburg',
            province: 'Gauteng',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /johannesburg/i })).toHaveAttribute(
      'href',
      '/property-for-sale?province=gauteng&city=johannesburg',
    );
  });

  it('uses the shared homepage rail without nesting another container', () => {
    render(
      <ExploreCities
        withinContentRail
        basePath=""
        customLocations={[
          {
            name: 'Johannesburg',
            province: 'Gauteng',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
          },
        ]}
      />,
    );

    expect(
      screen
        .getByRole('heading', { name: 'Explore property by city' })
        .closest('.home-section-content'),
    ).toBeInTheDocument();
  });
});

const guide = {
  name: 'Johannesburg',
  province: 'Gauteng',
  slug: 'johannesburg',
  provinceSlug: 'gauteng',
  propertyCount: '24 Properties',
};
describe('Guide discovery presentation', () => {
  it('keeps explicit empty collections empty, including a city’s suburb list', () => {
    render(
      <ExploreCities basePath="" customLocations={[]} title="Explore suburbs in Johannesburg" />,
    );
    expect(screen.getByText('No locations to explore here yet')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Cape Town|Johannesburg|Durban/ }),
    ).not.toBeInTheDocument();
  });
  it('opens an existing city guide with responsive imagery and no stock claim', () => {
    render(<ExploreCities basePath="" customLocations={[guide]} guideCards />);
    expect(screen.getByRole('link', { name: /Johannesburg.*Explore guide/ })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    const image = screen.getByRole('img', { name: 'AI-generated city scene of Johannesburg' });
    expect(image).toHaveAttribute('srcset', expect.stringContaining('960.webp 960w'));
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(
      screen.getByText(/Cities without their own cover use a province scene/),
    ).toBeInTheDocument();
    expect(screen.queryByText('24 Properties')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View All Locations' })).not.toBeInTheDocument();
  });
  it('reveals more guides without changing to listing search', () => {
    render(
      <ExploreCities
        basePath=""
        guideCards
        initialLimit={1}
        customLocations={[guide, { ...guide, name: 'Pretoria', slug: 'pretoria' }]}
      />,
    );
    expect(screen.queryByRole('link', { name: /Pretoria/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more city guides' }));
    expect(screen.getByRole('link', { name: /Pretoria/ })).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
  });
  it('keeps the province choices visible and filters guides without a dropdown or navigation', () => {
    function ProvinceExample() {
      const [province, setProvince] = useState('Gauteng');
      return (
        <ExploreCities
          basePath=""
          guideCards
          selectedGuideProvince={province}
          onGuideProvinceChange={setProvince}
          provinceSlug={province === 'Gauteng' ? 'gauteng' : 'western-cape'}
          customLocations={[
            guide,
            {
              ...guide,
              name: 'Cape Town',
              slug: 'cape-town',
              province: 'Western Cape',
              provinceSlug: 'western-cape',
            },
          ]}
        />
      );
    }
    render(<ProvinceExample />);
    const choices = screen.getByRole('group', { name: 'City guide province' });
    expect(within(choices).getAllByRole('button')).toHaveLength(9);
    expect(within(choices).getByRole('button', { name: 'Gauteng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('link', { name: /Cape Town/ })).not.toBeInTheDocument();
    fireEvent.click(within(choices).getByRole('button', { name: 'Western Cape' }));
    expect(within(choices).getByRole('button', { name: 'Western Cape' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('link', { name: /Cape Town/ })).toHaveAttribute(
      'href',
      '/western-cape/cape-town',
    );
    expect(screen.queryByRole('link', { name: /Johannesburg/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browse by province' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('shows loading and failure distinctly from empty guides and retries', () => {
    const retry = vi.fn();
    const view = render(
      <ExploreCities
        guideCards
        basePath=""
        customLocations={[]}
        requestState={{ isLoading: true, isError: false, onRetry: retry }}
      />,
    );
    expect(screen.getByRole('status', { name: 'Loading city guides' })).toBeInTheDocument();
    expect(screen.queryByText('No city guides to show yet')).not.toBeInTheDocument();
    view.rerender(
      <ExploreCities
        guideCards
        basePath=""
        customLocations={[]}
        requestState={{ isLoading: false, isError: true, onRetry: retry }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('City guides could not be loaded');
    expect(screen.queryByText('No city guides to show yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('uses an explicit province scene when a city image fails, and a neutral illustration if that also fails', () => {
    render(
      <ExploreCities
        guideCards
        basePath=""
        customLocations={[{ ...guide, name: 'Pretoria', slug: 'pretoria' }]}
      />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'AI-generated city scene of Pretoria' }));
    const fallback = screen.getByRole('img', { name: 'AI-generated provincial scene of Gauteng' });
    expect(fallback).toHaveAttribute('src', expect.stringContaining('johannesburg-480.webp'));
    fireEvent.error(fallback);
    expect(screen.getByRole('img', { name: 'City guide illustration' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pretoria.*Explore guide/ })).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
    expect(
      screen.getByText(/Cities without their own cover use a province scene/),
    ).toBeInTheDocument();
  });
  it('uses the matching province image for cities without a generated cover', () => {
    render(
      <ExploreCities
        guideCards
        basePath=""
        customLocations={[
          {
            ...guide,
            name: 'Bellville',
            slug: 'bellville',
            province: 'Western Cape',
            provinceSlug: 'western-cape',
          },
        ]}
      />,
    );
    const image = screen.getByRole('img', {
      name: 'AI-generated provincial scene of Western Cape',
    });
    expect(image).toHaveAttribute('src', expect.stringContaining('cape-town-480.webp'));
    expect(image).toHaveAttribute('data-image-scope', 'province');
    expect(screen.getByRole('link', { name: /Bellville.*Explore guide/ })).toHaveAttribute(
      'href',
      '/western-cape/bellville',
    );
  });
});
