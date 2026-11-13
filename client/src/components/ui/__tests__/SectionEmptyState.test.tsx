import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Building2 } from 'lucide-react';

import { SectionEmptyState } from '../SectionEmptyState';

describe('SectionEmptyState', () => {
  it('renders the message and a link action', () => {
    render(
      <SectionEmptyState
        message="New developments are launching soon."
        action={{ label: 'List your development', href: '/advertise/sell/developers' }}
        icon={Building2}
      />,
    );

    expect(screen.getByText('New developments are launching soon.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /list your development/i })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
  });

  it('renders a button action and uses the heading level given by the caller', () => {
    const onClick = vi.fn();
    render(
      <SectionEmptyState
        title="Nothing here yet"
        titleAs="h4"
        message="Check back soon."
        action={{ label: 'Do it', onClick }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Nothing here yet', level: 4 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /do it/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without a title or an action', () => {
    render(<SectionEmptyState message="Quiet for now." />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
