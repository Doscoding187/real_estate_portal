-- Canonical agency/agent membership baseline.
--
-- The CREATE statement covers fresh databases. The reconciliation statements
-- below deliberately operate only on compatible partial tables: nullable
-- metadata columns and defaulted lifecycle columns can be added without
-- changing existing membership meaning; incompatible identity columns, enums,
-- primary keys, or named indexes fail rather than being silently rewritten.

CREATE TABLE IF NOT EXISTS `agency_agent_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agency_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `status` enum('invited','active','suspended','left') NOT NULL DEFAULT 'invited',
  `governance_mode` enum('affiliated','managed') NOT NULL DEFAULT 'affiliated',
  `role` enum('agent','team_lead','manager') NOT NULL DEFAULT 'agent',
  `permissions_overrides` json NULL,
  `effective_from` timestamp NULL,
  `effective_to` timestamp NULL,
  `created_by` int NULL,
  `updated_by` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agency_agent_memberships_pair` (`agency_id`,`agent_id`),
  KEY `idx_agency_agent_memberships_agency` (`agency_id`,`status`),
  KEY `idx_agency_agent_memberships_agent` (`agent_id`,`status`),
  CONSTRAINT `agency_agent_memberships_agency_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_agent_memberships_agent_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_agent_memberships_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_agent_memberships_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- Safe compatible-column reconciliation. Each addition uses the repository's
-- information_schema/prepared-statement pattern because the supported MySQL
-- baseline does not accept ADD COLUMN IF NOT EXISTS.
SET @membership_has_status=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='status'); SET @membership_add_status_sql=IF(@membership_has_status=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `status` enum(''invited'',''active'',''suspended'',''left'') NOT NULL DEFAULT ''invited''','SELECT 1'); PREPARE membership_add_status_stmt FROM @membership_add_status_sql; EXECUTE membership_add_status_stmt; DEALLOCATE PREPARE membership_add_status_stmt;
SET @membership_has_governance_mode=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='governance_mode'); SET @membership_add_governance_mode_sql=IF(@membership_has_governance_mode=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `governance_mode` enum(''affiliated'',''managed'') NOT NULL DEFAULT ''affiliated''','SELECT 1'); PREPARE membership_add_governance_mode_stmt FROM @membership_add_governance_mode_sql; EXECUTE membership_add_governance_mode_stmt; DEALLOCATE PREPARE membership_add_governance_mode_stmt;
SET @membership_has_role=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='role'); SET @membership_add_role_sql=IF(@membership_has_role=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `role` enum(''agent'',''team_lead'',''manager'') NOT NULL DEFAULT ''agent''','SELECT 1'); PREPARE membership_add_role_stmt FROM @membership_add_role_sql; EXECUTE membership_add_role_stmt; DEALLOCATE PREPARE membership_add_role_stmt;
SET @membership_has_permissions_overrides=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='permissions_overrides'); SET @membership_add_permissions_overrides_sql=IF(@membership_has_permissions_overrides=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `permissions_overrides` json NULL','SELECT 1'); PREPARE membership_add_permissions_overrides_stmt FROM @membership_add_permissions_overrides_sql; EXECUTE membership_add_permissions_overrides_stmt; DEALLOCATE PREPARE membership_add_permissions_overrides_stmt;
SET @membership_has_effective_from=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='effective_from'); SET @membership_add_effective_from_sql=IF(@membership_has_effective_from=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `effective_from` timestamp NULL','SELECT 1'); PREPARE membership_add_effective_from_stmt FROM @membership_add_effective_from_sql; EXECUTE membership_add_effective_from_stmt; DEALLOCATE PREPARE membership_add_effective_from_stmt;
SET @membership_has_effective_to=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='effective_to'); SET @membership_add_effective_to_sql=IF(@membership_has_effective_to=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `effective_to` timestamp NULL','SELECT 1'); PREPARE membership_add_effective_to_stmt FROM @membership_add_effective_to_sql; EXECUTE membership_add_effective_to_stmt; DEALLOCATE PREPARE membership_add_effective_to_stmt;
SET @membership_has_created_by=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='created_by'); SET @membership_add_created_by_sql=IF(@membership_has_created_by=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `created_by` int NULL','SELECT 1'); PREPARE membership_add_created_by_stmt FROM @membership_add_created_by_sql; EXECUTE membership_add_created_by_stmt; DEALLOCATE PREPARE membership_add_created_by_stmt;
SET @membership_has_updated_by=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='updated_by'); SET @membership_add_updated_by_sql=IF(@membership_has_updated_by=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `updated_by` int NULL','SELECT 1'); PREPARE membership_add_updated_by_stmt FROM @membership_add_updated_by_sql; EXECUTE membership_add_updated_by_stmt; DEALLOCATE PREPARE membership_add_updated_by_stmt;
SET @membership_has_created_at=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='created_at'); SET @membership_add_created_at_sql=IF(@membership_has_created_at=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP','SELECT 1'); PREPARE membership_add_created_at_stmt FROM @membership_add_created_at_sql; EXECUTE membership_add_created_at_stmt; DEALLOCATE PREPARE membership_add_created_at_stmt;
SET @membership_has_updated_at=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='updated_at'); SET @membership_add_updated_at_sql=IF(@membership_has_updated_at=0,'ALTER TABLE `agency_agent_memberships` ADD COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP','SELECT 1'); PREPARE membership_add_updated_at_stmt FROM @membership_add_updated_at_sql; EXECUTE membership_add_updated_at_stmt; DEALLOCATE PREPARE membership_add_updated_at_stmt;

-- The identity columns must already be compatible. Adding agency_id or agent_id
-- to a populated table would invent ownership, so this is intentionally a hard
-- failure instead of a coercion or data rewrite.
SET @membership_incompatible_columns=(SELECT COUNT(*) FROM information_schema.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME='agency_agent_memberships' AND ((c.COLUMN_NAME='id' AND (c.DATA_TYPE<>'int' OR c.IS_NULLABLE<>'NO' OR c.EXTRA NOT LIKE '%auto_increment%')) OR (c.COLUMN_NAME IN ('agency_id','agent_id') AND (c.DATA_TYPE<>'int' OR c.IS_NULLABLE<>'NO')) OR (c.COLUMN_NAME='status' AND (c.COLUMN_TYPE<>"enum('invited','active','suspended','left')" OR c.IS_NULLABLE<>'NO' OR c.COLUMN_DEFAULT<>'invited')) OR (c.COLUMN_NAME='governance_mode' AND (c.COLUMN_TYPE<>"enum('affiliated','managed')" OR c.IS_NULLABLE<>'NO' OR c.COLUMN_DEFAULT<>'affiliated')) OR (c.COLUMN_NAME='role' AND (c.COLUMN_TYPE<>"enum('agent','team_lead','manager')" OR c.IS_NULLABLE<>'NO' OR c.COLUMN_DEFAULT<>'agent')) OR (c.COLUMN_NAME IN ('permissions_overrides','effective_from','effective_to','created_by','updated_by') AND c.IS_NULLABLE<>'YES') OR (c.COLUMN_NAME='created_at' AND (c.DATA_TYPE<>'timestamp' OR c.IS_NULLABLE<>'NO')) OR (c.COLUMN_NAME='updated_at' AND (c.DATA_TYPE<>'timestamp' OR c.IS_NULLABLE<>'NO' OR c.EXTRA NOT LIKE '%on update CURRENT_TIMESTAMP%'))));
SET @membership_required_column_count=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME IN ('id','agency_id','agent_id','status','governance_mode','role','permissions_overrides','effective_from','effective_to','created_by','updated_by','created_at','updated_at'));
SET @membership_column_check_sql=IF(@membership_incompatible_columns=0 AND @membership_required_column_count=13,'SELECT 1','SELECT * FROM `__sbi_0075_incompatible_agency_agent_memberships_columns`');
PREPARE membership_column_check_stmt FROM @membership_column_check_sql; EXECUTE membership_column_check_stmt; DEALLOCATE PREPARE membership_column_check_stmt;

-- Add a missing primary key when the existing id column is otherwise canonical.
-- Existing duplicate ids fail through MySQL; the migration never rewrites them.
SET @membership_primary_key_ok=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND INDEX_NAME='PRIMARY' AND COLUMN_NAME='id' AND SEQ_IN_INDEX=1);
SET @membership_primary_key_exists=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND INDEX_NAME='PRIMARY');
SET @membership_primary_key_sql=IF(@membership_primary_key_ok>0,'SELECT 1',IF(@membership_primary_key_exists=0,'ALTER TABLE `agency_agent_memberships` ADD PRIMARY KEY (`id`)','SELECT * FROM `__sbi_0075_incompatible_agency_agent_memberships_primary_key`'));
PREPARE membership_primary_key_stmt FROM @membership_primary_key_sql; EXECUTE membership_primary_key_stmt; DEALLOCATE PREPARE membership_primary_key_stmt;

-- Reconcile the unique agency/agent pair. MySQL itself rejects duplicate valid
-- records with a clear duplicate-key error; this migration never deduplicates.
SET @membership_pair_index_ok=(SELECT COUNT(*) FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' GROUP BY INDEX_NAME HAVING MIN(NON_UNIQUE)=0 AND GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='agency_id,agent_id') membership_pair_indexes);
SET @membership_named_pair_index_exists=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND INDEX_NAME='uq_agency_agent_memberships_pair');
SET @membership_pair_index_sql=IF(@membership_pair_index_ok>0,'SELECT 1',IF(@membership_named_pair_index_exists=0,'ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `uq_agency_agent_memberships_pair` UNIQUE (`agency_id`,`agent_id`)','SELECT * FROM `__sbi_0075_incompatible_agency_agent_memberships_unique_index`'));
PREPARE membership_pair_index_stmt FROM @membership_pair_index_sql; EXECUTE membership_pair_index_stmt; DEALLOCATE PREPARE membership_pair_index_stmt;

-- Reconcile the two required composite indexes. An existing index using a
-- canonical column order satisfies the contract even if it has a legacy name.
SET @membership_agency_status_index_ok=(SELECT COUNT(*) FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='agency_id,status') membership_agency_status_indexes);
SET @membership_named_agency_status_index_exists=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND INDEX_NAME='idx_agency_agent_memberships_agency');
SET @membership_agency_status_index_sql=IF(@membership_agency_status_index_ok>0,'SELECT 1',IF(@membership_named_agency_status_index_exists=0,'ALTER TABLE `agency_agent_memberships` ADD INDEX `idx_agency_agent_memberships_agency` (`agency_id`,`status`)','SELECT * FROM `__sbi_0075_incompatible_agency_agent_memberships_agency_status_index`'));
PREPARE membership_agency_status_index_stmt FROM @membership_agency_status_index_sql; EXECUTE membership_agency_status_index_stmt; DEALLOCATE PREPARE membership_agency_status_index_stmt;

SET @membership_agent_status_index_ok=(SELECT COUNT(*) FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='agent_id,status') membership_agent_status_indexes);
SET @membership_named_agent_status_index_exists=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND INDEX_NAME='idx_agency_agent_memberships_agent');
SET @membership_agent_status_index_sql=IF(@membership_agent_status_index_ok>0,'SELECT 1',IF(@membership_named_agent_status_index_exists=0,'ALTER TABLE `agency_agent_memberships` ADD INDEX `idx_agency_agent_memberships_agent` (`agent_id`,`status`)','SELECT * FROM `__sbi_0075_incompatible_agency_agent_memberships_agent_status_index`'));
PREPARE membership_agent_status_index_stmt FROM @membership_agent_status_index_sql; EXECUTE membership_agent_status_index_stmt; DEALLOCATE PREPARE membership_agent_status_index_stmt;

-- Reconcile each foreign key by replacing only an incompatible relationship on
-- the same column. The ALTER fails rather than changing data when existing rows
-- cannot satisfy the canonical relationship.
SET @membership_agency_fk_ok=(SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE kcu JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA=kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME AND rc.TABLE_NAME=kcu.TABLE_NAME WHERE kcu.CONSTRAINT_SCHEMA=DATABASE() AND kcu.TABLE_NAME='agency_agent_memberships' AND kcu.COLUMN_NAME='agency_id' AND kcu.REFERENCED_TABLE_NAME='agencies' AND kcu.REFERENCED_COLUMN_NAME='id' AND rc.DELETE_RULE='CASCADE');
SET @membership_agency_fk_name=(SELECT MIN(CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='agency_id' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @membership_drop_agency_fk_sql=IF(@membership_agency_fk_ok>0 OR @membership_agency_fk_name IS NULL,'SELECT 1',CONCAT('ALTER TABLE `agency_agent_memberships` DROP FOREIGN KEY `',REPLACE(@membership_agency_fk_name,'`','``'),'`'));
PREPARE membership_drop_agency_fk_stmt FROM @membership_drop_agency_fk_sql; EXECUTE membership_drop_agency_fk_stmt; DEALLOCATE PREPARE membership_drop_agency_fk_stmt;
SET @membership_add_agency_fk_sql=IF(@membership_agency_fk_ok>0,'SELECT 1','ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_agency_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE');
PREPARE membership_add_agency_fk_stmt FROM @membership_add_agency_fk_sql; EXECUTE membership_add_agency_fk_stmt; DEALLOCATE PREPARE membership_add_agency_fk_stmt;

SET @membership_agent_fk_ok=(SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE kcu JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA=kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME AND rc.TABLE_NAME=kcu.TABLE_NAME WHERE kcu.CONSTRAINT_SCHEMA=DATABASE() AND kcu.TABLE_NAME='agency_agent_memberships' AND kcu.COLUMN_NAME='agent_id' AND kcu.REFERENCED_TABLE_NAME='agents' AND kcu.REFERENCED_COLUMN_NAME='id' AND rc.DELETE_RULE='CASCADE');
SET @membership_agent_fk_name=(SELECT MIN(CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='agent_id' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @membership_drop_agent_fk_sql=IF(@membership_agent_fk_ok>0 OR @membership_agent_fk_name IS NULL,'SELECT 1',CONCAT('ALTER TABLE `agency_agent_memberships` DROP FOREIGN KEY `',REPLACE(@membership_agent_fk_name,'`','``'),'`'));
PREPARE membership_drop_agent_fk_stmt FROM @membership_drop_agent_fk_sql; EXECUTE membership_drop_agent_fk_stmt; DEALLOCATE PREPARE membership_drop_agent_fk_stmt;
SET @membership_add_agent_fk_sql=IF(@membership_agent_fk_ok>0,'SELECT 1','ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_agent_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE');
PREPARE membership_add_agent_fk_stmt FROM @membership_add_agent_fk_sql; EXECUTE membership_add_agent_fk_stmt; DEALLOCATE PREPARE membership_add_agent_fk_stmt;

SET @membership_created_by_fk_ok=(SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE kcu JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA=kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME AND rc.TABLE_NAME=kcu.TABLE_NAME WHERE kcu.CONSTRAINT_SCHEMA=DATABASE() AND kcu.TABLE_NAME='agency_agent_memberships' AND kcu.COLUMN_NAME='created_by' AND kcu.REFERENCED_TABLE_NAME='users' AND kcu.REFERENCED_COLUMN_NAME='id' AND rc.DELETE_RULE='SET NULL');
SET @membership_created_by_fk_name=(SELECT MIN(CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='created_by' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @membership_drop_created_by_fk_sql=IF(@membership_created_by_fk_ok>0 OR @membership_created_by_fk_name IS NULL,'SELECT 1',CONCAT('ALTER TABLE `agency_agent_memberships` DROP FOREIGN KEY `',REPLACE(@membership_created_by_fk_name,'`','``'),'`'));
PREPARE membership_drop_created_by_fk_stmt FROM @membership_drop_created_by_fk_sql; EXECUTE membership_drop_created_by_fk_stmt; DEALLOCATE PREPARE membership_drop_created_by_fk_stmt;
SET @membership_add_created_by_fk_sql=IF(@membership_created_by_fk_ok>0,'SELECT 1','ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL');
PREPARE membership_add_created_by_fk_stmt FROM @membership_add_created_by_fk_sql; EXECUTE membership_add_created_by_fk_stmt; DEALLOCATE PREPARE membership_add_created_by_fk_stmt;

SET @membership_updated_by_fk_ok=(SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE kcu JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA=kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME AND rc.TABLE_NAME=kcu.TABLE_NAME WHERE kcu.CONSTRAINT_SCHEMA=DATABASE() AND kcu.TABLE_NAME='agency_agent_memberships' AND kcu.COLUMN_NAME='updated_by' AND kcu.REFERENCED_TABLE_NAME='users' AND kcu.REFERENCED_COLUMN_NAME='id' AND rc.DELETE_RULE='SET NULL');
SET @membership_updated_by_fk_name=(SELECT MIN(CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='agency_agent_memberships' AND COLUMN_NAME='updated_by' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @membership_drop_updated_by_fk_sql=IF(@membership_updated_by_fk_ok>0 OR @membership_updated_by_fk_name IS NULL,'SELECT 1',CONCAT('ALTER TABLE `agency_agent_memberships` DROP FOREIGN KEY `',REPLACE(@membership_updated_by_fk_name,'`','``'),'`'));
PREPARE membership_drop_updated_by_fk_stmt FROM @membership_drop_updated_by_fk_sql; EXECUTE membership_drop_updated_by_fk_stmt; DEALLOCATE PREPARE membership_drop_updated_by_fk_stmt;
SET @membership_add_updated_by_fk_sql=IF(@membership_updated_by_fk_ok>0,'SELECT 1','ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL');
PREPARE membership_add_updated_by_fk_stmt FROM @membership_add_updated_by_fk_sql; EXECUTE membership_add_updated_by_fk_stmt; DEALLOCATE PREPARE membership_add_updated_by_fk_stmt;
