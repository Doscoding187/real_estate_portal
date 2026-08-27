import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfessionalEntrySection } from './ProfessionalEntrySection';

describe('ProfessionalEntrySection', () => {
  it('offers each supported professional audience its canonical entry point', () => {
    render(<ProfessionalEntrySection />);

    expect(screen.getByRole('link', { name: /explore agent tools/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getByRole('link', { name: /explore agency tools/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(screen.getByRole('link', { name: /explore developer tools/i })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(screen.getByRole('link', { name: /explore service solutions/i })).toHaveAttribute(
      'href',
      '/advertise/services',
    );
    expect(screen.getByRole('link', { name: /explore all professional solutions/i })).toHaveAttribute(
      'href',
      '/advertise',
    );
  });
});
