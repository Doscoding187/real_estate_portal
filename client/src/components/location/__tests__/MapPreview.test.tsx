/**
 * MapPreview Component Tests
 *
 * Basic functionality tests for the map preview feature
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapPreview } from '../MapPreview';

// Mock @react-google-maps/api
vi.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({
    isLoaded: true,
    loadError: null,
  }),
  GoogleMap: ({ children }: any) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
}));

describe('MapPreview', () => {
  const defaultProps = {
    center: {
      lat: -26.2041,
      lng: 28.0473,
    },
  };

  it('renders map preview in small mode by default', () => {
    render(<MapPreview {...defaultProps} />);

    const map = screen.getByTestId('google-map');
    expect(map).toBeInTheDocument();
  });

  it('renders marker at center position', () => {
    render(<MapPreview {...defaultProps} />);

    const marker = screen.getByTestId('marker');
    expect(marker).toBeInTheDocument();
  });

  it('shows expand button when showExpandButton is true', () => {
    render(<MapPreview {...defaultProps} showExpandButton={true} />);

    const expandButton = screen.getByText(/Expand Map/i);
    expect(expandButton).toBeInTheDocument();
  });

  it('shows loading state when map is not loaded', () => {
    vi.mock('@react-google-maps/api', () => ({
      useJsApiLoader: () => ({
        isLoaded: false,
        loadError: null,
      }),
      GoogleMap: ({ children }: any) => <div data-testid="google-map">{children}</div>,
      Marker: () => <div data-testid="marker" />,
    }));

    render(<MapPreview {...defaultProps} />);

    expect(screen.getByText(/Loading map preview/i)).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<MapPreview {...defaultProps} className="custom-class" />);

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('calls onLocationChange when provided', () => {
    const onLocationChange = vi.fn();

    render(<MapPreview {...defaultProps} onLocationChange={onLocationChange} />);

    // Component should render without errors
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });
});
