UPDATE `sl_spaces`
SET
  `availability_status` = CASE
    WHEN `status` = 'available' THEN 'available'
    WHEN `status` = 'occupied' THEN 'occupied'
    ELSE 'unavailable'
  END,
  `publication_status` = 'draft';
