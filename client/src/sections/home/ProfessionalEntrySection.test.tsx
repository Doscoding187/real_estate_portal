import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfessionalEntrySection } from './ProfessionalEntrySection';

describe('ProfessionalEntrySection', () => {
  it('offers only the agent entry point at launch', () => {
    render(<ProfessionalEntrySection />);

    expect(screen.getByRole('link', { name: /explore agent preparation/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText(/agenc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/developer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/service/i)).not.toBeInTheDocument();
    expect(screen.getByText('Establish your Property Listify presence.')).toBeInTheDocument();
    expect(screen.queryByText(/commercial offering behind it/i)).not.toBeInTheDocument();
  });
});
