import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeveloperOverview } from './DeveloperOverview';

describe('DeveloperOverview authority presentation', () => {
  it('presents platform-reference developments neutrally with provenance', () => {
    render(
      <DeveloperOverview
        developerName="ABC Developments"
        developerDescription="Useful factual project information."
        developerSlug="abc-developments"
        authorityKind="platform_reference"
        sourceAttribution="Official ABC Developments website"
        lastVerifiedAt="2026-08-15T00:00:00.000Z"
        isVerified
      />,
    );

    expect(screen.getByRole('heading', { name: 'About this development' })).toBeInTheDocument();
    expect(screen.getByTestId('curated-provenance')).toHaveTextContent(
      'Marketplace information maintained by Property Listify',
    );
    expect(screen.getByTestId('curated-provenance')).toHaveTextContent(
      'Source: Official ABC Developments website',
    );
    expect(screen.getByTestId('curated-provenance')).toHaveTextContent('Last reviewed:');
    expect(screen.queryByRole('heading', { name: 'Developer Overview' })).not.toBeInTheDocument();
    expect(screen.queryByText('VERIFIED DEVELOPER')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view developer profile/i })).not.toBeInTheDocument();
  });

  it('retains first-party developer presentation', () => {
    render(
      <DeveloperOverview
        developerName="ABC Developments"
        developerDescription="Verified developer information."
        developerSlug="abc-developments"
        authorityKind="developer_first_party"
        isVerified
      />,
    );

    expect(screen.getByRole('heading', { name: 'Developer Overview' })).toBeInTheDocument();
    expect(screen.getByText('VERIFIED DEVELOPER')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view developer profile/i })).toHaveAttribute(
      'href',
      '/developer/abc-developments',
    );
    expect(screen.queryByTestId('curated-provenance')).not.toBeInTheDocument();
  });
});
