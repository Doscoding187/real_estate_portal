-- Grant permissions to app_user for real_estate_portal database
GRANT ALL PRIVILEGES ON real_estate_portal.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Permissions granted successfully!' AS status;
