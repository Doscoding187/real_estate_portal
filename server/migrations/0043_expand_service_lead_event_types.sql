-- Expand service lead event taxonomy for client-side funnel instrumentation.
ALTER TABLE `service_lead_events`
  MODIFY COLUMN `event_type` enum(
    'created',
    'assigned',
    'accepted',
    'quoted',
    'won',
    'lost',
    'status_changed',
    'billing_marked',
    'note',
    'recommendations_shown',
    'provider_card_clicked',
    'quote_requested',
    'results_empty_shown',
    'nearby_market_clicked'
  ) NOT NULL;
