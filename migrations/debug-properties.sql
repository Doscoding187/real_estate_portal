-- Debug: Check what's in the database
USE real_estate_portal;

-- Check properties with their provinces
SELECT id, title, city, province, price, status, featured
FROM properties
ORDER BY id;

-- Check if properties have images
SELECT p.id, p.title, COUNT(pi.id) as image_count
FROM properties p
LEFT JOIN propertyImages pi ON p.id = pi.propertyId
GROUP BY p.id, p.title
ORDER BY p.id;

-- Check the exact province values
SELECT DISTINCT province
FROM properties
ORDER BY province;
