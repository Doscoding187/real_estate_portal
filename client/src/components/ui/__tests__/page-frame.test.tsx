import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SkipToContent } from '@/components/ui/SkipToContent';
import { Button } from '@/components/ui/button';
import { PageFrame, PageHeader } from '@/components/ui/page-frame';

describe('shared page-frame contract', () => {
  it('provides exactly one focusable primary-main target for the global skip link', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <>
        <SkipToContent />
        <PageFrame>
          <PageHeader title="Favorites" />
        </PageFrame>
      </>,
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByRole('main')).toHaveLength(1);

    fireEvent.click(screen.getByRole('link', { name: 'Skip to main content' }));
    expect(main).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('uses a semantic page heading and stacks actions before the small breakpoint', () => {
    render(
      <PageFrame>
        <PageHeader
          title="My favorites"
          description="Saved properties"
          actions={<Button>Browse properties</Button>}
        />
      </PageFrame>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'My favorites' })).toBeInTheDocument();
    const actions = screen.getByTestId('page-actions');
    expect(actions.className).toContain('flex-col');
    expect(actions.className).toContain('sm:flex-row');
    expect(actions.querySelectorAll('button button, button a, a button')).toHaveLength(0);
  });
});
