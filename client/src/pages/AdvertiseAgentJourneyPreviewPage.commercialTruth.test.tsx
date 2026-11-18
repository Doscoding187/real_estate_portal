import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: vi.fn(),
}));

vi.mock('@/components/EnhancedNavbar', () => ({
  EnhancedNavbar: () => <nav aria-label="Mock navigation" />,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <footer>Mock footer</footer>,
}));

vi.mock('@/hooks/usePreviewSeo', () => ({
  usePreviewSeo: () => undefined,
}));

vi.mock('@/pages/advertise/AgentWorkspacePreview', () => ({
  AgentWorkspacePreview: () => <div>Mock workspace preview</div>,
}));

import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';
import AdvertiseAgentJourneyPreviewPage from './AdvertiseAgentJourneyPreviewPage';

const useCatalogMock = vi.mocked(useCommercialCatalog);

describe('AdvertiseAgentJourneyPreviewPage commercial truth', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders no rand price when the catalog is unavailable', () => {
    useCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommercialCatalog>);

    const { container } = render(<AdvertiseAgentJourneyPreviewPage />);
    const text = container.textContent ?? '';

    expect(text).not.toMatch(/\bR\s?\d/);
    expect(text).toContain('Assisted access');
  });
});
