-- MANUAL MIGRATION SCRIPT: Development Identity & Status Refactor (TiDB Safe)
-- Run these statements ONE BY ONE in your TiDB client.

USE listify_property_sa;

-- ==========================================
-- PART 1: IDENTITY FIELDS (Safe to Add)
-- ==========================================

-- 1. Add 'nature' Enum
-- If exists, skip.
ALTER TABLE developments 
ADD COLUMN nature ENUM('new','phase','extension','redevelopment') NOT NULL DEFAULT 'new';

-- 2. Add 'total_development_area'
ALTER TABLE developments 
ADD COLUMN total_development_area INT NULL;

-- 3. Add 'property_types' (JSON)
ALTER TABLE developments 
ADD COLUMN property_types JSON NULL;

-- 4. Add 'custom_classification'
ALTER TABLE developments 
ADD COLUMN custom_classification VARCHAR(255) NULL;


-- ==========================================
-- PART 2: STATUS MIGRATION (Rename & Replace)
-- ==========================================

-- 5. Rename existing 'status' to 'legacy_status' to preserve data
-- We include all previous enum values to ensure no data is truncated.
ALTER TABLE developments
CHANGE COLUMN status legacy_status
ENUM('now-selling','launching-soon','under-construction','ready-to-move','sold-out','phase-completed','new-phase-launching','planning','completed','coming_soon', 'pre_launch', 'ready')
NULL;

-- 6. Add the NEW clean 'status' column
-- Only 'launching-soon', 'selling', 'sold-out'.
ALTER TABLE developments
ADD COLUMN status ENUM('launching-soon', 'selling', 'sold-out') NOT NULL DEFAULT 'launching-soon';

-- 7. (Optional) Add 'construction_phase' for internal tracking (Option A)
ALTER TABLE developments
ADD COLUMN construction_phase ENUM('planning', 'under_construction', 'completed', 'phase-completed') NULL;


-- ==========================================
-- PART 3: DATA MAPPING (Legacy -> New)
-- ==========================================

-- 8. Map 'legacy_status' to new 'status' values

-- Map 'planning', 'coming_soon', 'pre_launch', 'launching-soon' -> 'launching-soon'
UPDATE developments
SET status = 'launching-soon'
WHERE legacy_status IN ('planning', 'coming_soon', 'pre_launch', 'launching-soon', 'new-phase-launching');

-- Map 'now-selling', 'under-construction', 'phase-completed' -> 'selling'
UPDATE developments
SET status = 'selling'
WHERE legacy_status IN ('now-selling', 'under-construction', 'ready-to-move', 'phase-completed');

-- Map 'sold-out', 'completed' -> 'sold-out'
UPDATE developments
SET status = 'sold-out'
WHERE legacy_status IN ('sold-out', 'completed');

-- 9. (Optional) Map 'legacy_status' to 'construction_phase'
UPDATE developments SET construction_phase = 'planning' WHERE legacy_status IN ('planning', 'coming_soon', 'pre_launch');
UPDATE developments SET construction_phase = 'under_construction' WHERE legacy_status IN ('under-construction', 'new-phase-launching');
UPDATE developments SET construction_phase = 'completed' WHERE legacy_status IN ('ready-to-move', 'completed', 'sold-out');


-- ==========================================
-- PART 4: VERIFICATION
-- ==========================================

SELECT id, name, status, legacy_status, nature, total_development_area FROM developments LIMIT 10;
