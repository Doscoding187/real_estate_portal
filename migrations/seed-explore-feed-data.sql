-- ================================================
-- Phase 7: Explore Feed - Seed Data
-- ================================================
-- Populates sample video data for testing the Explore Feed
-- Run this after create-explore-feed-tables.sql

USE real_estate_portal;

-- ================================================
-- 1. Seed South African Provinces
-- ================================================
INSERT INTO provinces (name, code, latitude, longitude) VALUES
('Gauteng', 'GP', '-26.2708', '28.1123'),
('Western Cape', 'WC', '-33.9249', '18.4241'),
('KwaZulu-Natal', 'KZN', '-29.8587', '31.0218'),
('Eastern Cape', 'EC', '-32.2968', '26.4194'),
('Free State', 'FS', '-29.1212', '26.2148'),
('Limpopo', 'LP', '-23.4013', '29.4179'),
('Mpumalanga', 'MP', '-25.5653', '30.5279'),
('North West', 'NW', '-26.6709', '25.4228'),
('Northern Cape', 'NC', '-29.0467', '21.8569')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ================================================
-- 2. Seed Major Cities
-- ================================================
-- Gauteng Cities
INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Johannesburg', '-26.2041', '28.0473', 1 FROM provinces p WHERE p.code = 'GP'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Pretoria', '-25.7479', '28.2293', 1 FROM provinces p WHERE p.code = 'GP'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Sandton', '-26.1076', '28.0567', 0 FROM provinces p WHERE p.code = 'GP'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Western Cape Cities
INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Cape Town', '-33.9249', '18.4241', 1 FROM provinces p WHERE p.code = 'WC'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Stellenbosch', '-33.9321', '18.8602', 0 FROM provinces p WHERE p.code = 'WC'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- KwaZulu-Natal Cities
INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Durban', '-29.8587', '31.0218', 1 FROM provinces p WHERE p.code = 'KZN'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) 
SELECT p.id, 'Umhlanga', '-29.7272', '31.0822', 0 FROM provinces p WHERE p.code = 'KZN'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ================================================
-- 3. Seed Sample Suburbs
-- ================================================
-- Johannesburg Suburbs
INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode)
SELECT c.id, 'Sandton', '-26.1076', '28.0567', '2196' FROM cities c WHERE c.name = 'Johannesburg'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode)
SELECT c.id, 'Rosebank', '-26.1447', '28.0406', '2196' FROM cities c WHERE c.name = 'Johannesburg'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode)
SELECT c.id, 'Fourways', '-26.0167', '28.0086', '2055' FROM cities c WHERE c.name = 'Johannesburg'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Cape Town Suburbs
INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode)
SELECT c.id, 'Camps Bay', '-33.9537', '18.3772', '8005' FROM cities c WHERE c.name = 'Cape Town'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode)
SELECT c.id, 'Sea Point', '-33.9249', '18.3897', '8005' FROM cities c WHERE c.name = 'Cape Town'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Durban Suburbs
INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode)
SELECT c.id, 'Umhlanga Rocks', '-29.7272', '31.0822', '4320' FROM cities c WHERE c.name = 'Durban'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ================================================
-- 4. Seed Sample Videos (requires existing agents and properties)
-- ================================================
-- Get first agent and property IDs for testing
SET @agentId = (SELECT id FROM agents LIMIT 1);
SET @propertyId1 = (SELECT id FROM properties WHERE listingType = 'sale' LIMIT 1);
SET @propertyId2 = (SELECT id FROM properties WHERE listingType = 'rent' LIMIT 1 OFFSET 1);

-- Only insert if agent exists
INSERT INTO videos (agentId, propertyId, videoUrl, caption, type, duration, views, likes, shares, isPublished, isFeatured)
SELECT 
  @agentId,
  @propertyId1,
  'https://sample-videos.com/property-tour-1.mp4',
  '🏡 Stunning 3-bedroom home in Sandton! This modern property features an open-plan kitchen, spacious living areas, and a beautiful garden. Perfect for families! #SandtonHomes #LuxuryLiving',
  'listing',
  45,
  234,
  42,
  8,
  1,
  1
FROM dual
WHERE @agentId IS NOT NULL AND @propertyId1 IS NOT NULL;

INSERT INTO videos (agentId, propertyId, videoUrl, caption, type, duration, views, likes, shares, isPublished, isFeatured)
SELECT 
  @agentId,
  @propertyId2,
  'https://sample-videos.com/apartment-tour.mp4',
  '✨ Modern apartment in Cape Town with ocean views! 2 bedrooms, 2 bathrooms, secure parking. Available for rent now! #CapeTeownApartments #RentalProperty',
  'listing',
  38,
  189,
  35,
  5,
  1,
  0
FROM dual
WHERE @agentId IS NOT NULL AND @propertyId2 IS NOT NULL;

-- Content videos (not linked to specific properties)
INSERT INTO videos (agentId, videoUrl, caption, type, duration, views, likes, shares, isPublished, isFeatured)
SELECT 
  @agentId,
  'https://sample-videos.com/market-update.mp4',
  '📊 South African Real Estate Market Update 2025! Here are the top trends you need to know about... #RealEstate #MarketTrends #PropertyInvestment',
  'content',
  52,
  512,
  89,
  23,
  1,
  1
FROM dual
WHERE @agentId IS NOT NULL;

INSERT INTO videos (agentId, videoUrl, caption, type, duration, views, likes, shares, isPublished, isFeatured)
SELECT 
  @agentId,
  'https://sample-videos.com/buying-tips.mp4',
  '💡 5 Tips for First-Time Home Buyers in South Africa! Make your property journey smoother with these expert tips. #HomeBuying #PropertyTips #RealEstateAdvice',
  'content',
  41,
  387,
  67,
  15,
  1,
  0
FROM dual
WHERE @agentId IS NOT NULL;

INSERT INTO videos (agentId, videoUrl, caption, type, duration, views, likes, shares, isPublished, isFeatured)
SELECT 
  @agentId,
  'https://sample-videos.com/investment-guide.mp4',
  '🏢 Property Investment Guide: High-Growth Areas in Gauteng! Discover where to invest for maximum returns. #PropertyInvestment #Gauteng #WealthBuilding',
  'content',
  55,
  456,
  78,
  19,
  1,
  1
FROM dual
WHERE @agentId IS NOT NULL;

-- ================================================
-- Verification Queries
-- ================================================
SELECT 
  '✅ Provinces Seeded' AS Status,
  COUNT(*) AS Count
FROM provinces;

SELECT 
  '✅ Cities Seeded' AS Status,
  COUNT(*) AS Count
FROM cities;

SELECT 
  '✅ Suburbs Seeded' AS Status,
  COUNT(*) AS Count
FROM suburbs;

SELECT 
  '✅ Videos Seeded' AS Status,
  COUNT(*) AS Count
FROM videos;

-- Display sample data
SELECT 
  v.id,
  v.type,
  v.caption,
  v.views,
  v.likes,
  a.name AS agentName,
  p.title AS propertyTitle
FROM videos v
JOIN agents a ON v.agentId = a.id
LEFT JOIN properties p ON v.propertyId = p.id
ORDER BY v.createdAt DESC
LIMIT 10;

SELECT '✅ Phase 7 Explore Feed data seeded successfully!' AS FinalStatus;
