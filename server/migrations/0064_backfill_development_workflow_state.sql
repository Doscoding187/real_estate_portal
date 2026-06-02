UPDATE developments d
SET
  d.workflow_id = IF(
    d.workflow_id IS NULL,
    CASE
      WHEN d.transaction_type = 'for_rent' THEN 'residential_rent'
      WHEN d.transaction_type = 'auction' THEN 'residential_auction'
      ELSE 'residential_sale'
    END,
    d.workflow_id
  ),
  d.current_step_id = IF(
    d.current_step_id IS NULL,
    CASE
      WHEN d.isPublished = 1 THEN 'review_publish'
      WHEN d.developmentType IS NULL OR d.transaction_type IS NULL THEN 'configuration'
      WHEN d.name IS NULL OR TRIM(d.name) = '' OR d.status IS NULL THEN 'identity_market'
      WHEN d.city IS NULL OR TRIM(d.city) = '' OR d.province IS NULL OR TRIM(d.province) = '' THEN 'location'
      WHEN d.monthly_levy_from IS NULL AND d.rates_from IS NULL AND COALESCE(d.transfer_costs_included, 0) = 0 THEN 'governance_finances'
      WHEN
        (d.amenities IS NULL OR TRIM(CAST(d.amenities AS CHAR)) IN ('', '[]', 'null')) AND
        (d.features IS NULL OR TRIM(CAST(d.features AS CHAR)) IN ('', '[]', 'null'))
        THEN 'amenities_features'
      WHEN
        (d.description IS NULL OR TRIM(d.description) = '') AND
        (d.highlights IS NULL OR TRIM(CAST(d.highlights AS CHAR)) IN ('', '[]', 'null'))
        THEN 'marketing_summary'
      WHEN
        (d.images IS NULL OR TRIM(CAST(d.images AS CHAR)) IN ('', '[]', 'null')) AND
        (d.videos IS NULL OR TRIM(CAST(d.videos AS CHAR)) IN ('', '[]', 'null')) AND
        (d.floorPlans IS NULL OR TRIM(CAST(d.floorPlans AS CHAR)) IN ('', '[]', 'null')) AND
        (d.brochures IS NULL OR TRIM(CAST(d.brochures AS CHAR)) IN ('', '[]', 'null'))
        THEN 'development_media'
      WHEN NOT EXISTS (
        SELECT 1
        FROM unit_types ut
        WHERE ut.development_id = d.id
        LIMIT 1
      ) THEN 'unit_types'
      ELSE 'review_publish'
    END,
    d.current_step_id
  ),
  d.completed_steps = IF(
    d.completed_steps IS NULL,
    CASE
      WHEN d.isPublished = 1 THEN JSON_ARRAY(
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
      WHEN d.developmentType IS NULL OR d.transaction_type IS NULL THEN JSON_ARRAY()
      WHEN d.name IS NULL OR TRIM(d.name) = '' OR d.status IS NULL THEN JSON_ARRAY('configuration')
      WHEN d.city IS NULL OR TRIM(d.city) = '' OR d.province IS NULL OR TRIM(d.province) = '' THEN JSON_ARRAY(
        'configuration',
        'identity_market'
      )
      WHEN d.monthly_levy_from IS NULL AND d.rates_from IS NULL AND COALESCE(d.transfer_costs_included, 0) = 0 THEN JSON_ARRAY(
        'configuration',
        'identity_market',
        'location'
      )
      WHEN
        (d.amenities IS NULL OR TRIM(CAST(d.amenities AS CHAR)) IN ('', '[]', 'null')) AND
        (d.features IS NULL OR TRIM(CAST(d.features AS CHAR)) IN ('', '[]', 'null'))
        THEN JSON_ARRAY(
          'configuration',
          'identity_market',
          'location',
          'governance_finances'
        )
      WHEN
        (d.description IS NULL OR TRIM(d.description) = '') AND
        (d.highlights IS NULL OR TRIM(CAST(d.highlights AS CHAR)) IN ('', '[]', 'null'))
        THEN JSON_ARRAY(
          'configuration',
          'identity_market',
          'location',
          'governance_finances',
          'amenities_features'
        )
      WHEN
        (d.images IS NULL OR TRIM(CAST(d.images AS CHAR)) IN ('', '[]', 'null')) AND
        (d.videos IS NULL OR TRIM(CAST(d.videos AS CHAR)) IN ('', '[]', 'null')) AND
        (d.floorPlans IS NULL OR TRIM(CAST(d.floorPlans AS CHAR)) IN ('', '[]', 'null')) AND
        (d.brochures IS NULL OR TRIM(CAST(d.brochures AS CHAR)) IN ('', '[]', 'null'))
        THEN JSON_ARRAY(
          'configuration',
          'identity_market',
          'location',
          'governance_finances',
          'amenities_features',
          'marketing_summary'
        )
      WHEN NOT EXISTS (
        SELECT 1
        FROM unit_types ut
        WHERE ut.development_id = d.id
        LIMIT 1
      ) THEN JSON_ARRAY(
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media'
      )
      ELSE JSON_ARRAY(
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media',
        'unit_types'
      )
    END,
    d.completed_steps
  )
WHERE d.workflow_id IS NULL
   OR d.current_step_id IS NULL
   OR d.completed_steps IS NULL;
