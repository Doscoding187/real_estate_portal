-- P5 billing authority: remove empty, unreachable pre-launch provider families.
-- The canonical billing foundation is billing_* plus subscriptions. These
-- historical tables have zero rows on the owned target and no active runtime
-- readers or writers.
DROP TABLE `invoices`;
DROP TABLE `billing_transactions`;
DROP TABLE `agency_subscriptions`;
