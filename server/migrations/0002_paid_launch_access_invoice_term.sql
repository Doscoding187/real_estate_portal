ALTER TABLE `billing_invoices`
  ADD COLUMN `commercial_term_kind` varchar(40) NOT NULL DEFAULT 'recurring_subscription' AFTER `billing_cycle`;
