-- Verify complete setup
USE real_estate_portal;

-- Check properties count
SELECT 'Properties Count:' as info, COUNT(*) as count FROM properties;

-- Check if properties have images
SELECT 
    p.id, 
    p.title, 
    p.province,
    p.status,
    p.featured,
    COUNT(pi.id) as image_count
FROM properties p
LEFT JOIN propertyImages pi ON p.id = pi.propertyId
GROUP BY p.id, p.title, p.province, p.status, p.featured
ORDER BY p.id;

-- Check main image URLs
SELECT id, title, province, mainImage 
FROM properties 
LIMIT 10;

-- Check propertyImages table
SELECT 'Property Images Count:' as info, COUNT(*) as count FROM propertyImages;

-- Sample property images
SELECT * FROM propertyImages LIMIT 10;
