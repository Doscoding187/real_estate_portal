import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoleWorkspaceHeroPreview } from './RoleWorkspaceHeroPreview';

describe('RoleWorkspaceHeroPreview', () => {
  it('starts with the Agent workspace and lets a visitor preview each role', async () => {
    render(<RoleWorkspaceHeroPreview />);

    expect(screen.getByRole('tab', { name: 'Agent' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('agent-workspace-preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Agency' }));
    expect(screen.getByRole('tab', { name: 'Agency' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('agency-workspace-preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Developer' }));
    expect(screen.getByRole('tab', { name: 'Developer' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('developer-workspace-preview')).toBeInTheDocument();
  });
});
