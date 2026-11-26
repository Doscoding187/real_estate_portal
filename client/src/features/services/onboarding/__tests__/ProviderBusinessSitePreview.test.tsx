import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/pages/services/ServiceProviderProfilePage', () => ({
  default: () => <main data-testid="shared-provider-site-renderer" />,
}));

import { ProviderBusinessSitePreview } from '../ProviderBusinessSitePreview';
import { initialOnboardingState } from '../useOnboardingReducer';

describe('ProviderBusinessSitePreview viewport modes', () => {
  it('uses a real responsive document and switches between desktop and mobile viewports', () => {
    render(<ProviderBusinessSitePreview profile={null} state={initialOnboardingState} />);

    const desktopFrame = screen.getByTitle('Business website desktop preview');
    expect(desktopFrame).toHaveAttribute('srcdoc');
    expect(desktopFrame.getAttribute('srcdoc')).toContain('name=\'viewport\'');
    expect(desktopFrame.parentElement).toHaveClass('w-full');
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Preview mobile website' })));

    const mobileFrame = screen.getByTitle('Business website mobile preview');
    expect(mobileFrame.parentElement).toHaveClass('w-[392px]');
    expect(mobileFrame).toHaveAttribute('title', 'Business website mobile preview');
    expect(screen.getByRole('button', { name: 'Preview mobile website' })).toHaveAttribute('aria-pressed', 'true');
  });
});
