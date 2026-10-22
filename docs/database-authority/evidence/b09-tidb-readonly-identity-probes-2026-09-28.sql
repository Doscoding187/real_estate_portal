-- B09/TiDB read-only identity and schema-metadata probes
-- Request artifact only. Do not execute without exact-target Database Authority approval.
-- No application rows, data census, DDL, writes, migration, repair, or cutover is in scope.
-- Confirm the effective Railway binding and exact target fingerprint before any connection.

-- Probe 1: selected database, server identity, authenticated principal.
SELECT DATABASE() AS selected_database,
       VERSION() AS server_version,
       CURRENT_USER() AS effective_account;

-- Probe 2: presence of the two expected migration-control table names only.
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('sql_migration_history', 'sql_migration_attempts')
ORDER BY TABLE_NAME
LIMIT 2;

-- Probe 3: bounded column metadata for those exact control tables only.
-- 129 rows is the overflow sentinel; stop if 129 rows are returned.
SELECT TABLE_NAME,
       COLUMN_NAME,
       ORDINAL_POSITION,
       COLUMN_TYPE,
       IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('sql_migration_history', 'sql_migration_attempts')
ORDER BY TABLE_NAME, ORDINAL_POSITION
LIMIT 129;
