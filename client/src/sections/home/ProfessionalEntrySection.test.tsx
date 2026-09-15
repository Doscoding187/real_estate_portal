import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfessionalEntrySection } from './ProfessionalEntrySection';

describe('ProfessionalEntrySection', () => {
  it('offers each professional audience its canonical preparation entry point while activation is disabled', () => {
    render(<ProfessionalEntrySection />);

    expect(screen.getByRole('link', { name: /explore agent preparation/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getByRole('link', { name: /explore agency preparation/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(screen.getByRole('link', { name: /explore developer preparation/i })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(screen.getByRole('link', { name: /explore service solutions/i })).toHaveAttribute(
      'href',
      '/advertise/services',
    );
    expect(
      screen.getByRole('link', { name: /explore all professional solutions/i }),
    ).toHaveAttribute('href', '/advertise');
    expect(screen.getByText('Establish your Property Listify presence.')).toBeInTheDocument();
    expect(screen.queryByText(/commercial offering behind it/i)).not.toBeInTheDocument();
  });
});
