ALTER TABLE unit_types
  ADD COLUMN sold_units int NOT NULL DEFAULT 0;

ALTER TABLE unit_types
  ADD COLUMN let_units int NOT NULL DEFAULT 0;

UPDATE unit_types ut
JOIN developments d ON d.id = ut.development_id
SET ut.sold_units = GREATEST(
  COALESCE(ut.total_units, 0) - COALESCE(ut.available_units, 0) - COALESCE(ut.reserved_units, 0),
  0
)
WHERE d.transaction_type = 'for_sale'
  AND COALESCE(ut.sold_units, 0) = 0;

UPDATE unit_types ut
JOIN developments d ON d.id = ut.development_id
SET ut.let_units = GREATEST(
  COALESCE(ut.total_units, 0) - COALESCE(ut.available_units, 0) - COALESCE(ut.reserved_units, 0),
  0
)
WHERE d.transaction_type = 'for_rent'
  AND COALESCE(ut.let_units, 0) = 0;
