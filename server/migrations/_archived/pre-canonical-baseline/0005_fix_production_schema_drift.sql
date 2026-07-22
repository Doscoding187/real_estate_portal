-- Migration: Fix Production Schema Drift
-- Task: Align production DB with codebase expectations
-- Missing columns identified: identity_type, owner_type
-- Date: 2026-02-01

-- 1. Add identity_type (ENUM)
ALTER TABLE developer_brand_profiles
ADD COLUMN identity_type ENUM('developer', 'marketing_agency', 'hybrid') NOT NULL DEFAULT 'developer'
COMMENT 'Type of entity represented by this brand';

-- 2. Add owner_type (ENUM)
ALTER TABLE developer_brand_profiles
ADD COLUMN owner_type ENUM('platform', 'developer') NOT NULL DEFAULT 'platform'
COMMENT 'Ownership model: platform (unclaimed/seeded) vs developer (claimed/managed)';

-- 3. Ensure JSON columns are correct (idempotent check not easily possible in pure SQL without procedure, assuming missing or TEXT)
-- We will trust the Drizzle schema for these, but strict mode requires them to be JSON.
-- Checking if we need to CAST or MODIFY. For now, the critical blockers are the missing ENUMs.
