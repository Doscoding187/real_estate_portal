GRANT ALL PRIVILEGES ON listify_test.* TO 'root'@'%';
FLUSH PRIVILEGES;
SELECT user, host FROM mysql.user WHERE user='root';
