-- Extend canonical showings lifecycle for Agency Operating Core viewings.
-- Existing requested/confirmed/completed/cancelled/no_show records remain valid.

ALTER TABLE `showings`
MODIFY COLUMN `status` ENUM(
  'requested',
  'awaiting_confirmation',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
) NOT NULL DEFAULT 'requested';
