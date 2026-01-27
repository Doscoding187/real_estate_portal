/**
 * ARIA Helpers
 *
 * Utility functions for generating consistent ARIA attributes
 * across the Advertise With Us landing page components.
 *
 * Requirements: 10.5
 */

/**
 * Generate a unique ID for ARIA relationships
 */
export function generateAriaId(prefix: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return suffix ? `${prefix}-${suffix}-${random}` : `${prefix}-${timestamp}-${random}`;
}

/**
 * Create ARIA label for interactive cards
 */
export function createCardAriaLabel(
  title: string,
  description: string,
  actionText: string = 'Learn more',
): string {
  return `${title}. ${description}. ${actionText}`;
}

/**
 * Create ARIA label for CTA buttons with context
 */
export function createCTAAriaLabel(label: string, context?: string): string {
  return context ? `${label} - ${context}` : label;
}

/**
 * Create ARIA description for sections
 */
export function createSectionAriaDescription(sectionName: string, itemCount?: number): string {
  if (itemCount !== undefined) {
    return `${sectionName} section with ${itemCount} items`;
  }
  return `${sectionName} section`;
}

/**
 * Get ARIA live region politeness level based on urgency
 */
export function getAriaLiveLevel(
  urgency: 'low' | 'medium' | 'high',
): 'off' | 'polite' | 'assertive' {
  switch (urgency) {
    case 'high':
      return 'assertive';
    case 'medium':
      return 'polite';
    case 'low':
    default:
      return 'off';
  }
}

/**
 * Create ARIA label for navigation landmarks
 */
export function createLandmarkLabel(
  landmarkType: 'navigation' | 'main' | 'complementary' | 'contentinfo',
  specificLabel?: string,
): string {
  const baseLabels = {
    navigation: 'Main navigation',
    main: 'Main content',
    complementary: 'Complementary content',
    contentinfo: 'Footer information',
  };

  return specificLabel || baseLabels[landmarkType];
}

/**
 * Create ARIA attributes for accordion items
 */
export interface AccordionAriaAttributes {
  button: {
    'aria-expanded': boolean;
    'aria-controls': string;
    id: string;
  };
  panel: {
    'aria-labelledby': string;
    id: string;
    role: string;
  };
}

export function createAccordionAriaAttributes(
  itemId: string,
  isExpanded: boolean,
): AccordionAriaAttributes {
  const buttonId = `accordion-button-${itemId}`;
  const panelId = `accordion-panel-${itemId}`;

  return {
    button: {
      'aria-expanded': isExpanded,
      'aria-controls': panelId,
      id: buttonId,
    },
    panel: {
      'aria-labelledby': buttonId,
      id: panelId,
      role: 'region',
    },
  };
}

/**
 * Create ARIA attributes for tabs
 */
export interface TabAriaAttributes {
  tablist: {
    role: string;
    'aria-label': string;
  };
  tab: {
    role: string;
    'aria-selected': boolean;
    'aria-controls': string;
    id: string;
    tabIndex: number;
  };
  tabpanel: {
    role: string;
    'aria-labelledby': string;
    id: string;
    tabIndex: number;
  };
}

export function createTabAriaAttributes(
  tabId: string,
  label: string,
  isSelected: boolean,
): Omit<TabAriaAttributes, 'tablist'> {
  const tabElementId = `tab-${tabId}`;
  const panelId = `tabpanel-${tabId}`;

  return {
    tab: {
      role: 'tab',
      'aria-selected': isSelected,
      'aria-controls': panelId,
      id: tabElementId,
      tabIndex: isSelected ? 0 : -1,
    },
    tabpanel: {
      role: 'tabpanel',
      'aria-labelledby': tabElementId,
      id: panelId,
      tabIndex: 0,
    },
  };
}

/**
 * Create ARIA label for metric/statistic displays
 */
export function createMetricAriaLabel(
  value: string | number,
  label: string,
  context?: string,
): string {
  const baseLabel = `${value} ${label}`;
  return context ? `${baseLabel} - ${context}` : baseLabel;
}

/**
 * Create ARIA attributes for loading states
 */
export interface LoadingAriaAttributes {
  'aria-busy': boolean;
  'aria-live': 'polite' | 'assertive';
  'aria-label': string;
}

export function createLoadingAriaAttributes(
  isLoading: boolean,
  loadingText: string = 'Loading content',
): LoadingAriaAttributes {
  return {
    'aria-busy': isLoading,
    'aria-live': 'polite',
    'aria-label': isLoading ? loadingText : 'Content loaded',
  };
}

/**
 * Create ARIA attributes for error states
 */
export interface ErrorAriaAttributes {
  role: 'alert';
  'aria-live': 'assertive';
  'aria-atomic': boolean;
}

export function createErrorAriaAttributes(): ErrorAriaAttributes {
  return {
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true,
  };
}
