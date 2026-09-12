-- P8 services integrity: make service-lead retries durable and atomic.
ALTER TABLE `service_leads`
  ADD COLUMN `request_id` varchar(96) NULL AFTER `id`;

ALTER TABLE `service_leads`
  ADD UNIQUE KEY `ux_service_leads_request_id` (`request_id`);
