-- Quick check to see if sample data was loaded
USE real_estate_portal;

SELECT 'Properties Count:' as info, COUNT(*) as count FROM properties
UNION ALL
SELECT 'Agents Count:', COUNT(*) FROM agents
UNION ALL
SELECT 'Users Count:', COUNT(*) FROM users
UNION ALL
SELECT 'Prospects Count:', COUNT(*) FROM prospects
UNION ALL
SELECT 'Agencies Count:', COUNT(*) FROM agencies;

-- Show properties if they exist
SELECT id, title, city, price, status FROM properties LIMIT 10;
