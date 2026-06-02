ALTER TABLE developments
  ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(80) NULL AFTER subtitle;

ALTER TABLE developments
  ADD COLUMN IF NOT EXISTS current_step_id VARCHAR(80) NULL AFTER workflow_id;

ALTER TABLE developments
  ADD COLUMN IF NOT EXISTS completed_steps JSON NULL AFTER current_step_id;
