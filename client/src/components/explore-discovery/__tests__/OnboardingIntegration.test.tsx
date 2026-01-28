/**
 * Onboarding Integration Tests
 *
 * Tests the integration of welcome overlay and tooltips.
 * Validates Requirements 16.7, 16.8, 16.10, 16.11
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WelcomeOverlay } from '../WelcomeOverlay';
import { OnboardingTooltip } from '../OnboardingTooltip';

// Mock topics data
const mockTopics = [
  {
    id: '1',
    slug: 'find-your-home',
    name: 'Find Your Home',
    description: 'Discover your perfect property',
    icon: '🏠',
  },
  {
    id: '2',
    slug: 'home-security',
    name: 'Home Security',
    description: 'Keep your home safe',
    icon: '🔒',
  },
  {
    id: '3',
    slug: 'renovations',
    name: 'Renovations & Upgrades',
    description: 'Transform your space',
    icon: '🔨',
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('WelcomeOverlay', () => {
  it('renders welcome overlay with suggested topics', () => {
    const mockOnTopicSelect = jest.fn();
    const mockOnDismiss = jest.fn();

    render(
      <TestWrapper>
        <WelcomeOverlay
          isOpen={true}
          suggestedTopics={mockTopics}
          onTopicSelect={mockOnTopicSelect}
          onDismiss={mockOnDismiss}
        />
      </TestWrapper>,
    );

    // Check welcome message
    expect(screen.getByText('Welcome to Explore')).toBeInTheDocument();
    expect(
      screen.getByText('Discover properties, ideas, and insights—all in one place'),
    ).toBeInTheDocument();

    // Check suggested topics
    expect(screen.getByText('Find Your Home')).toBeInTheDocument();
    expect(screen.getByText('Home Security')).toBeInTheDocument();
    expect(screen.getByText('Renovations & Upgrades')).toBeInTheDocument();
  });

  it('handles topic selection', async () => {
    const mockOnTopicSelect = jest.fn();
    const mockOnDismiss = jest.fn();

    render(
      <TestWrapper>
        <WelcomeOverlay
          isOpen={true}
          suggestedTopics={mockTopics}
          onTopicSelect={mockOnTopicSelect}
          onDismiss={mockOnDismiss}
        />
      </TestWrapper>,
    );

    // Click on a topic
    fireEvent.click(screen.getByText('Find Your Home'));

    // Click continue button
    const continueButton = screen.getByText('Continue');
    expect(continueButton).not.toBeDisabled();

    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockOnTopicSelect).toHaveBeenCalledWith('find-your-home');
    });
  });

  it('handles dismiss action', async () => {
    const mockOnTopicSelect = jest.fn();
    const mockOnDismiss = jest.fn();

    render(
      <TestWrapper>
        <WelcomeOverlay
          isOpen={true}
          suggestedTopics={mockTopics}
          onTopicSelect={mockOnTopicSelect}
          onDismiss={mockOnDismiss}
        />
      </TestWrapper>,
    );

    // Click skip button
    fireEvent.click(screen.getByText('Skip for now'));

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('does not render when closed', () => {
    const mockOnTopicSelect = jest.fn();
    const mockOnDismiss = jest.fn();

    render(
      <TestWrapper>
        <WelcomeOverlay
          isOpen={false}
          suggestedTopics={mockTopics}
          onTopicSelect={mockOnTopicSelect}
          onDismiss={mockOnDismiss}
        />
      </TestWrapper>,
    );

    expect(screen.queryByText('Welcome to Explore')).not.toBeInTheDocument();
  });
});

describe('OnboardingTooltip', () => {
  it('renders topic navigation tooltip', () => {
    const mockOnDismiss = jest.fn();

    render(
      <OnboardingTooltip tooltipId="topic_navigation" isVisible={true} onDismiss={mockOnDismiss} />,
    );

    expect(screen.getByText('Explore Topics')).toBeInTheDocument();
    expect(screen.getByText('Tap any Topic above to change your view')).toBeInTheDocument();
  });

  it('renders partner content tooltip', () => {
    const mockOnDismiss = jest.fn();

    render(
      <OnboardingTooltip tooltipId="partner_content" isVisible={true} onDismiss={mockOnDismiss} />,
    );

    expect(screen.getByText('Partner Content')).toBeInTheDocument();
    expect(
      screen.getByText('This is educational content from a verified partner'),
    ).toBeInTheDocument();
  });

  it('handles dismiss action', async () => {
    const mockOnDismiss = jest.fn();

    render(
      <OnboardingTooltip tooltipId="topic_navigation" isVisible={true} onDismiss={mockOnDismiss} />,
    );

    // Click Got it button
    fireEvent.click(screen.getByText('Got it'));

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('does not render when not visible', () => {
    const mockOnDismiss = jest.fn();

    render(
      <OnboardingTooltip
        tooltipId="topic_navigation"
        isVisible={false}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.queryByText('Explore Topics')).not.toBeInTheDocument();
  });
});

describe('Onboarding Integration', () => {
  it('shows welcome overlay first, then tooltips', async () => {
    const mockOnTopicSelect = jest.fn();
    const mockOnWelcomeDismiss = jest.fn();
    const mockOnTooltipDismiss = jest.fn();

    const { rerender } = render(
      <TestWrapper>
        <WelcomeOverlay
          isOpen={true}
          suggestedTopics={mockTopics}
          onTopicSelect={mockOnTopicSelect}
          onDismiss={mockOnWelcomeDismiss}
        />
        <OnboardingTooltip
          tooltipId="topic_navigation"
          isVisible={false}
          onDismiss={mockOnTooltipDismiss}
        />
      </TestWrapper>,
    );

    // Welcome overlay should be visible
    expect(screen.getByText('Welcome to Explore')).toBeInTheDocument();
    expect(screen.queryByText('Explore Topics')).not.toBeInTheDocument();

    // Dismiss welcome overlay
    fireEvent.click(screen.getByText('Skip for now'));

    // Rerender with tooltip visible
    rerender(
      <TestWrapper>
        <WelcomeOverlay
          isOpen={false}
          suggestedTopics={mockTopics}
          onTopicSelect={mockOnTopicSelect}
          onDismiss={mockOnWelcomeDismiss}
        />
        <OnboardingTooltip
          tooltipId="topic_navigation"
          isVisible={true}
          onDismiss={mockOnTooltipDismiss}
        />
      </TestWrapper>,
    );

    // Tooltip should now be visible
    expect(screen.queryByText('Welcome to Explore')).not.toBeInTheDocument();
    expect(screen.getByText('Explore Topics')).toBeInTheDocument();
  });
});
