import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProvinceGuideContent } from '@shared/provinceGuideContent';
import { ProvinceLifestyleDiscovery, ProvinceRegionDiscovery } from './ProvinceGuideDiscovery';
const guide = getProvinceGuideContent('gauteng')!;
const verifiedPlaces = [
  {
    name: 'Johannesburg',
    slug: 'johannesburg',
    canonicalLocationId: 'city:1',
    level: 'city' as const,
  },
  { name: 'Pretoria', slug: 'pretoria', canonicalLocationId: 'city:2', level: 'city' as const },
  {
    name: 'Sandton',
    slug: 'sandton',
    canonicalLocationId: 'suburb:91',
    level: 'suburb' as const,
    parentCitySlug: 'johannesburg',
  },
];
function renderDiscovery() {
  return render(
    <>
      <ProvinceLifestyleDiscovery guide={guide} verifiedPlaces={verifiedPlaces} />
      <ProvinceRegionDiscovery guide={guide} verifiedPlaces={verifiedPlaces} />
    </>,
  );
}
describe('Province guide place links', () => {
  it('links a suburb scope to its own route under its city', () => {
    renderDiscovery();
    const link = screen.getByRole('link', { name: /Sandton/i });
    expect(link.getAttribute('href')).toBe('/gauteng/johannesburg/sandton');
  });

  it('links a city scope to its own route', () => {
    renderDiscovery();
    const links = screen.getAllByRole('link', { name: /Johannesburg/i });
    const city = links.find(link => link.getAttribute('href') === '/gauteng/johannesburg');
    expect(city).toBeDefined();
  });
});

describe('Province discovery with retained regional depth', () => {
  it('changes lifestyle collections independently of the selected region', () => {
    renderDiscovery();
    fireEvent.click(screen.getByRole('tab', { name: 'Green spaces' }));
    const lifestyle = screen.getByRole('tablist', { name: 'Explore by lifestyle' });
    expect(within(lifestyle).getByRole('tab', { name: 'Green spaces' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const greenPanel = screen.getByRole('tabpanel', { name: 'Green spaces' });
    expect(within(greenPanel).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(screen.getByRole('tab', { name: 'Ekurhuleni' }));
    expect(screen.getByRole('article', { name: 'Ekurhuleni' })).toHaveTextContent(
      guide.regions[2].paragraphs[1],
    );
    expect(screen.getByRole('tab', { name: 'Green spaces' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(within(greenPanel).getByText('Why explore these places?'));
    expect(greenPanel).toHaveTextContent('Emmarentia Dam');
    expect(within(greenPanel).getAllByRole('link', { name: /SANBI/ })).toHaveLength(2);
  });
  it('retains every original regional paragraph, consideration and source in the document', () => {
    const { container } = renderDiscovery();
    for (const region of guide.regions) {
      fireEvent.click(screen.getByRole('tab', { name: region.name, exact: true }));
      const article = screen.getByRole('article', { name: region.name });
      for (const paragraph of region.paragraphs) expect(article).toHaveTextContent(paragraph);
      expect(article).toHaveTextContent(region.consider);
      expect(
        within(article)
          .getAllByRole('link')
          .some(link => link.getAttribute('href')?.startsWith('https://')),
      ).toBe(true);
    }
    expect(container.querySelectorAll('.guide-chapter')).toHaveLength(5);
    expect(container.querySelectorAll('#regions [role=tabpanel]:not([hidden])')).toHaveLength(1);
  });
  it('supports keyboard tab navigation and exposes matching labelled panels', () => {
    renderDiscovery();
    const first = within(screen.getByRole('tablist', { name: 'Explore by lifestyle' })).getByRole(
      'tab',
      { name: 'City living' },
    );
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const green = screen.getByRole('tab', { name: 'Green spaces' });
    expect(green).toHaveFocus();
    expect(green).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel', { name: 'Green spaces' }).id).toBe(
      green.getAttribute('aria-controls'),
    );
    fireEvent.keyDown(green, { key: 'End' });
    const last = screen.getByRole('tab', { name: 'Around the Vaal' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
  });
  it('routes unresolved places to real regional context instead of inventing city URLs', () => {
    renderDiscovery();
    fireEvent.click(screen.getByRole('tab', { name: 'Town & country' }));
    const panel = screen.getByRole('tabpanel', { name: 'Town & country' });
    expect(
      within(panel).getByRole('link', { name: 'Read West Rand guide for Krugersdorp' }),
    ).toHaveAttribute('href', '#region-west-rand');
    expect(
      screen.queryByRole('link', { name: 'Explore Krugersdorp city guide' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'West Rand', exact: true }));
    expect(
      within(screen.getByRole('article', { name: 'West Rand' })).queryByRole('link', {
        name: /Krugersdorp/,
      }),
    ).not.toBeInTheDocument();
  });
  it('opens a deep-linked district while keeping the lifestyle collection unchanged', async () => {
    renderDiscovery();
    fireEvent.click(screen.getByRole('tab', { name: 'Green spaces' }));
    window.history.replaceState({}, '', '#region-sedibeng');
    fireEvent(window, new HashChangeEvent('hashchange'));
    await waitFor(() =>
      expect(screen.getByRole('article', { name: 'Sedibeng & the Vaal' })).toBeVisible(),
    );
    expect(screen.getByRole('tab', { name: 'Green spaces' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    window.history.replaceState({}, '', '/');
  });
  it('reopens a linked district after browsing another tab at the same fragment', async () => {
    window.history.replaceState({}, '', '#region-west-rand');
    renderDiscovery();
    fireEvent.click(screen.getByRole('tab', { name: 'Sedibeng & the Vaal' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Town & country' }));
    fireEvent.click(screen.getByRole('link', { name: 'Read West Rand guide for Krugersdorp' }));
    await waitFor(() => expect(screen.getByRole('article', { name: 'West Rand' })).toBeVisible());
    expect(window.location.hash).toBe('#region-west-rand');
    window.history.replaceState({}, '', '/');
  });
});
