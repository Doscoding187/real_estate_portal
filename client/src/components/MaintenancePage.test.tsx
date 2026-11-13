import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it } from 'vitest';
import { MaintenancePage } from './MaintenancePage';

describe('MaintenancePage', () => {
  it('never tells search engines to drop the page', async () => {
    render(
      <HelmetProvider>
        <MaintenancePage />
      </HelmetProvider>,
    );
    await waitFor(() => expect(document.title).toBe('We’re upgrading Property Listify'));
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
