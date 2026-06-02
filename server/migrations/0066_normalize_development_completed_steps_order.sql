-- Normalize persisted canonical workflow completed_steps to the shared workflow order.
-- Sparse progress remains sparse; this only removes duplicate/unknown values and orders known steps.
UPDATE developments
SET completed_steps = CAST(
  CONCAT(
    '[',
    CONCAT_WS(
      ',',
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('configuration'), '$'), JSON_QUOTE('configuration'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('identity_market'), '$'), JSON_QUOTE('identity_market'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('location'), '$'), JSON_QUOTE('location'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('governance_finances'), '$'), JSON_QUOTE('governance_finances'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('amenities_features'), '$'), JSON_QUOTE('amenities_features'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('marketing_summary'), '$'), JSON_QUOTE('marketing_summary'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('development_media'), '$'), JSON_QUOTE('development_media'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('unit_types'), '$'), JSON_QUOTE('unit_types'), NULL),
      IF(JSON_CONTAINS(completed_steps, JSON_QUOTE('review_publish'), '$'), JSON_QUOTE('review_publish'), NULL)
    ),
    ']'
  ) AS JSON
)
WHERE completed_steps IS NOT NULL
  AND JSON_TYPE(completed_steps) = 'ARRAY';

