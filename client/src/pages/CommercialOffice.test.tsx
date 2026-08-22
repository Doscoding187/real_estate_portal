import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { search } = vi.hoisted(() => ({ search: vi.fn(() => ({ data: [] })) }));
vi.mock('@/lib/trpc', () => ({ trpc: { commercialOffice: { search: { useQuery: search } } } }));
vi.mock('wouter', () => ({ Link: ({ children }: any) => children }));

import CommercialOffice from './CommercialOffice';

describe('CommercialOffice handoff', () => {
  it('consumes the shared location URL parameter on load', () => {
    window.history.replaceState({}, '', '/commercial?location=Sandton');
    render(<CommercialOffice />);
    expect(screen.getByLabelText('Location')).toHaveValue('Sandton');
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ location: 'Sandton' }));
  });
});
