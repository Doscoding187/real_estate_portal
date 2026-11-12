import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfessionalEntrySection } from './ProfessionalEntrySection';

describe('ProfessionalEntrySection', () => {
  it('offers agents, agencies and developers a plain entry at launch', () => {
    render(<ProfessionalEntrySection />);

    expect(screen.getByRole('link', { name: /set up your agent profile/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getByRole('link', { name: /see agency details/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(screen.getByRole('link', { name: /see developer details/i })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Agents' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agencies' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Developers' })).toBeInTheDocument();
    expect(screen.getByText('List and grow with Property Listify.')).toBeInTheDocument();
    expect(screen.getAllByText(/publishing opens soon|accounts open soon/i).length).toBeGreaterThan(
      0,
    );
  });

  it('avoids internal wording', () => {
    const { container } = render(<ProfessionalEntrySection />);

    expect(container.textContent).not.toMatch(
      /preparation path|commercial activation|presence|canonical|governed/i,
    );
  });
});
