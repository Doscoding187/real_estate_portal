import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PartnerProfile from '../PartnerProfile';

describe('PartnerProfile', () => {
  it('renders the placeholder heading', () => {
    render(<PartnerProfile />);
    expect(screen.getByRole('heading', { name: 'Partner Profile' })).toBeInTheDocument();
  });

  it('renders the coming soon placeholder body', () => {
    render(<PartnerProfile />);
    expect(screen.getByText('Coming soon...')).toBeInTheDocument();
  });
});
