import { describe, expect, it } from 'vitest';
import { getMediaPhaseDocumentCopy } from './MediaPhase';

describe('MediaPhase transaction document copy', () => {
  it('keeps Sale document copy generic while naming Rental and Auction packs', () => {
    expect(getMediaPhaseDocumentCopy('for_sale')).toMatchObject({
      progressLabel: 'Brochure/Documents (Required)',
      tabLabel: 'Documents',
      uploadTitle: 'Brochures & Floor Plans',
    });

    expect(getMediaPhaseDocumentCopy('for_rent')).toMatchObject({
      progressLabel: 'Rental pack document (Required)',
      tabLabel: 'Rental Pack',
      uploadTitle: 'Rental Pack Documents',
      uploadDescription: expect.stringContaining('lease terms'),
      guidance: expect.stringContaining('lease expectations'),
    });

    expect(getMediaPhaseDocumentCopy('auction')).toMatchObject({
      progressLabel: 'Auction legal pack (Required)',
      tabLabel: 'Auction Pack',
      uploadTitle: 'Auction Legal & Bidder Pack',
      uploadDescription: expect.stringContaining('FICA'),
      guidance: expect.stringContaining('proof-of-funds'),
    });
  });
});
