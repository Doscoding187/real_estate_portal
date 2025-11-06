-- Run these commands in MySQL Workbench

-- Create a new user specifically for the app
CREATE USER 'app_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'AppPassword123';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON propertifi_sa_database.* TO 'app_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Test the new user
SELECT user, host, plugin FROM mysql.user WHERE user = 'app_user';
