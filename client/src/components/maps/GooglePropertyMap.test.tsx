import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchCardIdentity } from '@shared/types';
import { GooglePropertyMap } from './GooglePropertyMap';

const mapHarness = vi.hoisted(() => {
  const bounds = { id: 'current-map-bounds' };
  return {
    bounds,
    loaderResult: {
      isLoaded: true,
      loadError: undefined as Error | undefined,
    },
    mapProps: {} as Record<string, unknown>,
    map: {
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      fitBounds: vi.fn(),
      getBounds: vi.fn(() => bounds),
    },
  };
});

interface MockGoogleMapProps {
  children?: ReactNode;
  onLoad?: (map: typeof mapHarness.map) => void;
  onUnmount?: () => void;
  [key: string]: unknown;
}

vi.mock('@react-google-maps/api', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');

  return {
    useJsApiLoader: () => mapHarness.loaderResult,
    GoogleMap: ({ children, ...props }: MockGoogleMapProps) => {
      mapHarness.mapProps = props;
      ReactModule.useEffect(() => {
        props.onLoad?.(mapHarness.map);
        return () => props.onUnmount?.();
      }, []);
      return <div data-testid="google-property-map">{children}</div>;
    },
    MarkerClusterer: ({ children }: { children: (clusterer: unknown) => ReactNode }) =>
      children({}),
    Marker: ({ onClick }: { onClick?: () => void }) => (
      <button type="button" data-testid="property-marker" onClick={onClick}>
        Property marker
      </button>
    ),
    InfoWindow: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  };
});

const property = {
  id: 501,
  title: 'Parkhurst family home',
  price: 4_250_000,
  propertyType: 'house',
  listingType: 'sale',
  listingSource: 'manual' as const,
  identity: {
    role: 'agency',
    provenance: 'agency',
    name: 'Parkhurst Property Partners',
    agencyId: 91,
  } satisfies SearchCardIdentity,
  latitude: -26.14,
  longitude: 28.02,
  address: 'Parkhurst',
  city: 'Johannesburg',
  bedrooms: 4,
  bathrooms: 3,
  area: 285,
};

describe('GooglePropertyMap deliberate search interaction', () => {
  beforeEach(() => {
    mapHarness.loaderResult.isLoaded = true;
    mapHarness.loaderResult.loadError = undefined;
    mapHarness.mapProps = {};
    mapHarness.map.getBounds.mockClear();
  });

  it('opens a marker preview without navigating until View Details is chosen', () => {
    const onPropertySelect = vi.fn();
    render(<GooglePropertyMap properties={[property]} onPropertySelect={onPropertySelect} />);

    fireEvent.click(screen.getByTestId('property-marker'));

    expect(onPropertySelect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(property.title);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(onPropertySelect).toHaveBeenCalledWith(property.id);
  });

  it('does not submit map movement and applies bounds only through the explicit action', () => {
    const onBoundsChange = vi.fn();
    render(<GooglePropertyMap properties={[property]} onBoundsChange={onBoundsChange} />);

    expect(mapHarness.mapProps.onDragEnd).toBeUndefined();
    expect(mapHarness.mapProps.onZoomChanged).toBeUndefined();
    expect(onBoundsChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Search in this area' }));
    expect(onBoundsChange).toHaveBeenCalledWith(mapHarness.bounds);
  });

  it.each([
    {
      roleLabel: 'Agent',
      identity: {
        role: 'agent',
        provenance: 'agent',
        name: 'Nandi Mokoena',
        organizationName: 'Urban Nest Realty',
        agentId: 17,
        agencyId: 91,
      } satisfies SearchCardIdentity,
    },
    {
      roleLabel: 'Agency',
      identity: {
        role: 'agency',
        provenance: 'agency',
        name: 'Urban Nest Realty',
        agencyId: 91,
      } satisfies SearchCardIdentity,
    },
    {
      roleLabel: 'Developer',
      identity: {
        role: 'developer',
        provenance: 'developer',
        name: 'Westpoint Developments',
        cataloguePublisherId: 52,
      } satisfies SearchCardIdentity,
    },
    {
      roleLabel: 'Property Listify managed',
      identity: {
        role: 'platform',
        provenance: 'platform_curated',
        name: 'Property Listify',
        cataloguePublisherId: 1,
      } satisfies SearchCardIdentity,
    },
  ])('renders the canonical $roleLabel identity in a marker preview', ({ roleLabel, identity }) => {
    render(<GooglePropertyMap properties={[{ ...property, identity }]} />);

    fireEvent.click(screen.getByTestId('property-marker'));

    const preview = within(screen.getByRole('dialog'));
    expect(preview.getByText(roleLabel)).toBeInTheDocument();
    expect(preview.getByText(identity.name)).toBeInTheDocument();
    if (identity.organizationName && identity.organizationName !== identity.name) {
      expect(preview.getByText(identity.organizationName)).toBeInTheDocument();
    }
  });

  it('omits unavailable facts and does not invent a supply identity from missing data', () => {
    const {
      identity: _identity,
      bedrooms: _bedrooms,
      bathrooms: _bathrooms,
      area: _area,
      ...bare
    } = property;
    render(<GooglePropertyMap properties={[bare]} />);

    fireEvent.click(screen.getByTestId('property-marker'));

    const preview = screen.getByRole('dialog');
    expect(preview).not.toHaveTextContent(/\bBed\b|\bBath\b|m²/);
    expect(preview).not.toHaveTextContent(
      /Private seller|Property Listify managed|\bAgent\b|\bAgency\b|\bDeveloper\b/,
    );
  });

  it('offers explicit List and Grid recovery when the map provider fails to load', () => {
    mapHarness.loaderResult.isLoaded = false;
    mapHarness.loaderResult.loadError = new Error('Google Maps failed');
    const onRecoveryViewChange = vi.fn();

    render(
      <GooglePropertyMap properties={[property]} onRecoveryViewChange={onRecoveryViewChange} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Map temporarily unavailable');
    expect(screen.getByRole('alert')).toHaveTextContent('results are still available');

    fireEvent.click(screen.getByRole('button', { name: 'View List' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Grid' }));

    expect(onRecoveryViewChange).toHaveBeenNthCalledWith(1, 'list');
    expect(onRecoveryViewChange).toHaveBeenNthCalledWith(2, 'grid');
  });
});
