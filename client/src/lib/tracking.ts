/**
 * Centralized Analytics Tracking Provider wrapper
 * Enables swapping from styled console logs to a provider like PostHog or Segment.
 */

// Define explicit schemas for events to prevent arbitrary/broken data structures
export type EventSchema = {
  // Funnel Entry
  agent_funnel_view: {
    source?: string;
  };

  // Funnel Middle
  estimator_used: {
    priceBand: string;
    listings: number;
    estimatedLeads: number;
  };
  soft_capture_submitted: {
    email: string;
    source: string;
  };

  // Onboarding Wizard
  onboarding_started: {
    email?: string;
  };
  onboarding_step_completed: {
    stepId: string;
    stepIndex: number;
  };
  onboarding_completed: {
    agencyName?: string;
    planSelection: string;
  };

  // Activation
  activation_clicked: {
    actionMethod: 'manual_upload' | 'crm_sync';
  };

  // Agency Funnel — Founding Interest (pause phase passive capture)
  agency_founding_interest: {
    email: string;
    agencyName: string;
  };
};

export type EventName = keyof EventSchema;

export function trackEvent<T extends EventName>(eventName: T, properties?: EventSchema[T]) {
  // In production, this drops the event into PostHog/Segment:
  // posthog.capture(eventName, properties);

  // In development, we use styled structured console groups for deep visibility
  console.group(`%c[Analytics] 📊 ${eventName}`, 'color: #3b82f6; font-weight: bold;');
  if (properties && Object.keys(properties).length > 0) {
    console.table(properties);
  } else {
    console.log('No properties');
  }
  console.groupEnd();
}
