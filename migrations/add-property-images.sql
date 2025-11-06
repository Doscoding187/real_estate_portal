-- Add images to all sample properties
USE real_estate_portal;

-- Add images for each property
-- Property 1: Waterfall Estate Home
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(1, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 1, 0),
(1, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 0, 1),
(1, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 0, 2);

-- Property 2: Sandton Apartment
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(2, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 1, 0),
(2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 0, 1);

-- Property 3: Camps Bay Villa
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(3, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 1, 0),
(3, 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800', 0, 1),
(3, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 0, 2);

-- Property 4: Randburg Family Home
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(4, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 1, 0),
(4, 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 0, 1);

-- Property 5: Townhouse Complex
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(5, 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800', 1, 0),
(5, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 0, 1);

-- Property 6: Student Accommodation
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(6, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 1, 0);

-- Property 7: Umhlanga Executive
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(7, 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800', 1, 0),
(7, 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800', 0, 1);

-- Property 8: Retail Space
INSERT INTO propertyImages (propertyId, imageUrl, isPrimary, displayOrder) VALUES
(8, 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800', 1, 0);

-- Verify images were added
SELECT 'Images added successfully!' AS status;
SELECT p.id, p.title, COUNT(pi.id) as image_count
FROM properties p
LEFT JOIN propertyImages pi ON p.id = pi.propertyId
GROUP BY p.id, p.title
ORDER BY p.id;

SELECT '✅ All properties now have images!' AS result;
