CREATE DATABASE IF NOT EXISTS listify_local;
CREATE DATABASE IF NOT EXISTS listify_test;

CREATE USER IF NOT EXISTS 'listify_app'@'%' IDENTIFIED BY 'listify_app_password';
CREATE USER IF NOT EXISTS 'listify_test'@'%' IDENTIFIED BY 'listify_test_password';

ALTER USER 'listify_app'@'%' IDENTIFIED BY 'listify_app_password';
ALTER USER 'listify_test'@'%' IDENTIFIED BY 'listify_test_password';

GRANT ALL PRIVILEGES ON listify_local.* TO 'listify_app'@'%';
GRANT ALL PRIVILEGES ON listify_test.* TO 'listify_test'@'%';
FLUSH PRIVILEGES;
