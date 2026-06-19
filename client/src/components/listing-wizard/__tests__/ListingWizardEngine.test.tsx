import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ListingWizardEngine } from '../ListingWizardEngine';
import type { ListingWorkflowId, ListingStepId } from '@shared/listing-workflow-types';
import type { ListingWizardContextValue } from '../contexts/ListingWizardContext';

const mockContextValue = (overrides: Record<string, any> = {}): ListingWizardContextValue => ({
  workflow: { id: 'listing_sell' as ListingWorkflowId, title: 'Sell Your Property', steps: [] },
  workflowId: 'listing_sell' as ListingWorkflowId,
  visibleSteps: [],
  currentStep: null as any,
  currentStepIndex: 0,
  progress: 0,
  data: {},
  goNext: vi.fn(),
  goBack: vi.fn(),
  goToStep: vi.fn(),
  stepErrors: [],
  allErrors: [],
  isStepValid: true,
  validateCurrentStep: vi.fn(() => true),
  isValidating: false,
  saveStatus: 'idle' as const,
  lastSavedAt: null,
  setSaveStatus: vi.fn(),
  setLastSavedAt: vi.fn(),
  initWorkflow: vi.fn(),
  isPreWorkflow: false,
  totalSteps: 0,
  completedStepIds: [] as ListingStepId[],
  ...overrides,
} as ListingWizardContextValue);

vi.mock('../contexts/ListingWizardContext', () => ({
  useListingWizardContext: vi.fn(),
}));

import { useListingWizardContext } from '../contexts/ListingWizardContext';

describe('ListingWizardEngine component registry', () => {
  it('renders pre-workflow / ActionStep when isPreWorkflow is true', () => {
    vi.mocked(useListingWizardContext).mockReturnValue(
      mockContextValue({ isPreWorkflow: true, workflow: null }),
    );
    render(<ListingWizardEngine />);
    expect(screen.getByText('Create New Listing')).toBeTruthy();
  });

  it('renders spinner when currentStep is null and not pre-workflow', () => {
    vi.mocked(useListingWizardContext).mockReturnValue(
      mockContextValue({ currentStep: null, isPreWorkflow: false, visibleSteps: [] }),
    );
    const { container } = render(<ListingWizardEngine />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders fallback error panel for an unknown componentKey', () => {
    vi.mocked(useListingWizardContext).mockReturnValue(
      mockContextValue({
        isPreWorkflow: false,
        currentStep: {
          id: 'unknown_step',
          title: 'Mystery Step',
          componentKey: 'NonExistentStep',
          required: false,
        },
        currentStepIndex: 0,
        visibleSteps: [
          { id: 'unknown_step', title: 'Mystery Step', componentKey: 'NonExistentStep', required: false },
        ],
        workflow: { id: 'listing_sell', title: 'Sell', steps: [] },
        progress: 12,
      }),
    );
    render(<ListingWizardEngine />);
    expect(screen.getByText(/Unknown step/i)).toBeTruthy();
    expect(screen.getByText(/NonExistentStep/i)).toBeTruthy();
  });

  it('renders known step keys through the registry', () => {
    vi.mocked(useListingWizardContext).mockReturnValue(
      mockContextValue({
        isPreWorkflow: false,
        currentStep: {
          id: 'action',
          title: 'Listing Action',
          description: 'Choose an action',
          componentKey: 'ActionStep',
          required: true,
        },
        currentStepIndex: 0,
        visibleSteps: [
          { id: 'action', title: 'Listing Action', componentKey: 'ActionStep', required: true },
        ],
        workflow: { id: 'listing_sell', title: 'Sell', steps: [] },
        progress: 12,
      }),
    );
    render(<ListingWizardEngine />);
    expect(screen.getAllByText('Listing Action').length).toBeGreaterThanOrEqual(1);
    // The lazy-loaded ActionStep should be wrapped in Suspense fallback (spinner)
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThanOrEqual(1);
  });
});
