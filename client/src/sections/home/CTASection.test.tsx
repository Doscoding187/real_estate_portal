import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CTASection } from './CTASection';

describe('CTASection', () => {
  it('keeps the browse action and adds a List with us link to /advertise', () => {
    const onBrowse = vi.fn();
    render(<CTASection onBrowse={onBrowse} />);

    expect(screen.getByRole('link', { name: 'List with us' })).toHaveAttribute(
      'href',
      '/advertise',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Browse homes for sale' }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });
});
