UPDATE developments
SET
  workflow_id = CASE
    WHEN transaction_type = 'for_rent' THEN 'residential_rent'
    WHEN transaction_type = 'auction' THEN 'residential_auction'
    ELSE 'residential_sale'
  END,
  current_step_id = 'review_publish',
  completed_steps = JSON_ARRAY(
    'configuration',
    'identity_market',
    'location',
    'governance_finances',
    'amenities_features',
    'marketing_summary',
    'development_media',
    'unit_types',
    'review_publish'
  )
WHERE isPublished = 1
  AND (
    current_step_id IS NULL
    OR current_step_id <> 'review_publish'
    OR completed_steps IS NULL
    OR JSON_TYPE(completed_steps) <> 'ARRAY'
    OR JSON_LENGTH(completed_steps) <> 9
    OR JSON_EXTRACT(completed_steps, '$[0]') <> JSON_QUOTE('configuration')
    OR JSON_EXTRACT(completed_steps, '$[1]') <> JSON_QUOTE('identity_market')
    OR JSON_EXTRACT(completed_steps, '$[2]') <> JSON_QUOTE('location')
    OR JSON_EXTRACT(completed_steps, '$[3]') <> JSON_QUOTE('governance_finances')
    OR JSON_EXTRACT(completed_steps, '$[4]') <> JSON_QUOTE('amenities_features')
    OR JSON_EXTRACT(completed_steps, '$[5]') <> JSON_QUOTE('marketing_summary')
    OR JSON_EXTRACT(completed_steps, '$[6]') <> JSON_QUOTE('development_media')
    OR JSON_EXTRACT(completed_steps, '$[7]') <> JSON_QUOTE('unit_types')
    OR JSON_EXTRACT(completed_steps, '$[8]') <> JSON_QUOTE('review_publish')
  );
