import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PropertyLocationOverview } from './PropertyLocationOverview';

describe('PropertyLocationOverview', () => {
  it('makes an approximate public area explicit and offers a truthful map handoff', () => {
    render(
      <PropertyLocationOverview
        propertyTitle="Garden home"
        location={{
          label: 'Fourways, Johannesburg, Gauteng',
          precision: 'approximate',
          precisionLabel: 'Approximate area location',
          description: "The marker represents the public area, not the property's exact position.",
          coordinates: { latitude: -26.01, longitude: 28.01 },
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=-26.01%2C28.01',
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Location overview' })).toBeInTheDocument();
    expect(screen.getAllByText('Approximate area location')).toHaveLength(2);
    expect(
      screen.getByText("The marker represents the public area, not the property's exact position."),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open public area in Google Maps' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-26.01%2C28.01',
    );
  });

  it('keeps the location context visible without inventing a map or an external handoff', () => {
    render(
      <PropertyLocationOverview
        propertyTitle="Garden home"
        location={{
          label: 'Johannesburg, Gauteng',
          precision: 'exact',
          precisionLabel: 'Publicly listed location',
          description: 'This is the public location supplied with the approved listing.',
          coordinates: null,
          mapsUrl: null,
        }}
      />,
    );

    expect(screen.getByText('Johannesburg, Gauteng')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Map location unavailable');
    expect(screen.queryByRole('link', { name: /Google Maps/i })).not.toBeInTheDocument();
  });
});
