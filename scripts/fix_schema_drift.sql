-- CANONICAL FIX FOR SCHEMA DRIFT
-- Run these statements ONE BY ONE in your TiDB client.
-- Do not batch them.

USE listify_property_sa;

-- STEP 1: SAFELY ADD legacy_status (NO DATA LOSS)
ALTER TABLE developments
ADD COLUMN legacy_status ENUM(
  'planning',
  'under_construction',
  'completed',
  'coming_soon',
  'now-selling',
  'launching-soon',
  'ready-to-move',
  'sold-out',
  'phase-completed',
  'new-phase-launching',
  'pre_launch',
  'ready'
) NULL
AFTER status;

-- STEP 2: BACKFILL legacy_status FROM CURRENT status
UPDATE developments
SET legacy_status = status
WHERE legacy_status IS NULL;

-- STEP 3: ENFORCE THE NEW CLEAN STATUS ENUM
ALTER TABLE developments
MODIFY COLUMN status ENUM(
  'launching-soon',
  'selling',
  'sold-out'
) NOT NULL DEFAULT 'launching-soon';

-- STEP 4: ENSURE construction_phase EXISTS (INTERNAL TRACKING)
-- Note: TiDB might not support IF NOT EXISTS in ALTER TABLE, so if this fails, check if column exists.
ALTER TABLE developments
ADD COLUMN construction_phase ENUM(
  'planning',
  'under_construction',
  'completed',
  'phase-completed'
) NULL;

-- STEP 5: MAP LEGACY VALUES (ONE-TIME DATA NORMALIZATION)
UPDATE developments
SET status = 'launching-soon'
WHERE legacy_status IN (
  'planning',
  'coming_soon',
  'pre_launch',
  'launching-soon',
  'new-phase-launching'
);

UPDATE developments
SET status = 'selling'
WHERE legacy_status IN (
  'now-selling',
  'under_construction',
  'ready-to-move',
  'phase-completed'
);

UPDATE developments
SET status = 'sold-out'
WHERE legacy_status IN (
  'sold-out',
  'completed'
);

-- STEP 6: FINAL VERIFICATION
SELECT
  id,
  name,
  status,
  legacy_status,
  construction_phase
FROM developments
LIMIT 10;
