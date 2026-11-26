ALTER TABLE `service_provider_profiles`
  ADD COLUMN `business_type` enum('independent_professional','registered_company','partnership','other') NULL,
  ADD COLUMN `website_template` enum('personal_brand','corporate_brand','project_showcase') NOT NULL DEFAULT 'corporate_brand',
  ADD COLUMN `submission_status` enum('draft','submitted','changes_requested','approved','rejected') NOT NULL DEFAULT 'draft',
  ADD COLUMN `submitted_at` timestamp NULL,
  ADD COLUMN `reviewed_at` timestamp NULL,
  ADD COLUMN `review_note` varchar(1000) NULL;
