import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiValue } from '../KpiValue';

describe('KpiValue', () => {
  it('renders real values when status is real', () => {
    render(<KpiValue value="42" status="real" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders coming soon label when status is coming_soon', () => {
    render(<KpiValue value="999" status="coming_soon" />);
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('renders fallback label when status is unavailable', () => {
    render(<KpiValue status="unavailable" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
