import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DevelopmentOpportunityCard from './DevelopmentOpportunityCard';

const { mockOnToggleSelected, mockOnDownloadBrochure, mockOnViewDetails } = vi.hoisted(() => ({
  mockOnToggleSelected: vi.fn(),
  mockOnDownloadBrochure: vi.fn(),
  mockOnViewDetails: vi.fn(),
}));

function buildItem(overrides: Record<string, unknown> = {}) {
  return {
    developmentId: 42,
    developmentName: 'Sky City',
    imageUrl: 'https://cdn.example/sky-city.jpg',
    city: 'Soweto',
    province: 'Gauteng',
    campaign: { developmentType: 'residential', images: ['a', 'b'], description: 'Homes' },
    inventory: {
      modes: {
        sale: { availableCount: 4, priceFrom: 1200000, priceTo: 1450000, priceBasis: 'purchase_price' },
      },
    },
    program: { currencyCode: 'ZAR' },
    opportunity: { openForReferral: true, friendlyMessage: 'Open' },
    unitTypes: [],
    affordability: {
      available: true,
      annualInterestRate: 10.5,
      termMonths: 240,
      repaymentAllowanceRatio: 0.3,
    },
    ...overrides,
  };
}

describe('DevelopmentOpportunityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the catalogue card with details and a brochure action', () => {
    render(
      <DevelopmentOpportunityCard
        item={buildItem()}
        marketMode="sale"
        onViewDetails={mockOnViewDetails}
        onDownloadBrochure={mockOnDownloadBrochure}
      />,
    );

    expect(screen.getByText('Sky City')).toBeInTheDocument();
    expect(screen.getByText('Soweto, Gauteng')).toBeInTheDocument();
    expect(screen.getByAltText('Sky City')).toHaveAttribute(
      'src',
      'https://cdn.example/sky-city.jpg',
    );
    expect(screen.getByRole('button', { name: /View details/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Brochure/ })).toBeInTheDocument();
  });

  it('offers a selection checkbox in the select variant', () => {
    render(
      <DevelopmentOpportunityCard
        item={buildItem()}
        marketMode="sale"
        variant="select"
        selected={false}
        onToggleSelected={mockOnToggleSelected}
        onDownloadBrochure={mockOnDownloadBrochure}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Select Sky City' });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(mockOnToggleSelected).toHaveBeenCalled();

    expect(screen.queryByRole('button', { name: /View details/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download brochure/ })).toBeInTheDocument();
  });

  it('shows a selected card as selected', () => {
    render(
      <DevelopmentOpportunityCard
        item={buildItem()}
        marketMode="sale"
        variant="select"
        selected
        onToggleSelected={mockOnToggleSelected}
        onDownloadBrochure={mockOnDownloadBrochure}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Select Sky City' })).toBeChecked();
  });
});
