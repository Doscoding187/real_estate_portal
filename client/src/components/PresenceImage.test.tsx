import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PresenceImage } from './PresenceImage';
import { AREA_IMAGE_FALLBACK, selectPresenceImages } from '@/lib/presenceImages';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';

afterEach(cleanup);

describe('shared presence image selection and fallback', () => {
  it('uses a real primary photo and prefers a different listing for the closing image', () => {
    const images = selectPresenceImages([
      {
        primary: '/primary.jpg',
        images: [{ url: '/first-gallery.jpg' }, { url: '/primary.jpg', isPrimary: 1 }],
      },
      { primary: '/second-property.jpg', images: [] },
    ]);
    expect(images).toEqual({
      hero: '/primary.jpg',
      contact: '/second-property.jpg',
      hasListingPhoto: true,
    });
  });

  it('uses another photo of a sole listing and ignores signed variants of the same photo', () => {
    const primary = 'https://cdn.example.com/property.jpg?signature=one';
    expect(
      selectPresenceImages([
        {
          primary,
          images: [
            { url: 'https://cdn.example.com/property.jpg?signature=two', displayOrder: 0 },
            { url: '/garden.jpg', displayOrder: 2 },
            { url: '/living-room.jpg', displayOrder: 1 },
          ],
        },
      ]),
    ).toEqual({ hero: primary, contact: '/living-room.jpg', hasListingPhoto: true });
  });

  it('uses different bundled defaults when no distinct listing photograph exists', () => {
    expect(selectPresenceImages([])).toEqual({
      hero: PROPERTY_IMAGE_FALLBACK,
      contact: AREA_IMAGE_FALLBACK,
      hasListingPhoto: false,
    });
    expect(
      selectPresenceImages([{ primary: '/only.jpg', images: [{ url: '/only.jpg' }] }]).contact,
    ).toBe(AREA_IMAGE_FALLBACK);
  });

  it('recovers from broken media, stops after the bundled fallback and recovers when a new source arrives', () => {
    const view = render(
      <PresenceImage
        src="/missing.jpg"
        alt="Actual locality"
        fallbackAlt="Neighbourhood illustration"
      />,
    );
    fireEvent.error(screen.getByAltText('Actual locality'));
    const fallback = screen.getByAltText('Neighbourhood illustration');
    expect(fallback.getAttribute('src')).toBe(AREA_IMAGE_FALLBACK);
    fireEvent.error(fallback);
    expect(view.container.querySelector('img')?.getAttribute('src')).toBeNull();
    expect(view.container.querySelector('img')?.style.visibility).toBe('hidden');
    view.rerender(<PresenceImage src="/valid.jpg" alt="Actual locality" />);
    expect(screen.getByAltText('Actual locality').getAttribute('src')).toBe('/valid.jpg');
    expect(screen.getByAltText('Actual locality').style.visibility).not.toBe('hidden');
  });
});
