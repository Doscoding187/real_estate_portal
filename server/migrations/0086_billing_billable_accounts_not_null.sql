-- P5 billing authority: enforce typed ownership after the staged cutover.
-- The preceding migration populated every active foundation row on the
-- disposable target; all admitted writers now supply this foreign key.
ALTER TABLE `subscriptions` MODIFY COLUMN `billable_account_id` int NOT NULL;
ALTER TABLE `billing_invoices` MODIFY COLUMN `billable_account_id` int NOT NULL;
ALTER TABLE `billing_payments` MODIFY COLUMN `billable_account_id` int NOT NULL;
ALTER TABLE `billing_payment_documents` MODIFY COLUMN `billable_account_id` int NOT NULL;
ALTER TABLE `billing_audit_events` MODIFY COLUMN `billable_account_id` int NOT NULL;
