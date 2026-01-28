CREATE DATABASE IF NOT EXISTS propertylistify_dev;
USE propertylistify_dev;

-- Baseline settings for MySQL 8 compatibility with TiDB
SET sql_mode = 'STRICT_TRANS_TABLES';

-- Grant permissions if needed
GRANT ALL PRIVILEGES ON propertylistify_dev.* TO 'propertylistify'@'%';
FLUSH PRIVILEGES;
