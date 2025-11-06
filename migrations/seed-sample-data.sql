-- =====================================================
-- SAMPLE DATA SEED SCRIPT
-- Run AFTER full-database-setup.sql completes
-- Creates realistic test data for development
-- =====================================================

USE real_estate_portal;

-- =====================================================
-- STEP 1: Sample Agencies
-- =====================================================

INSERT INTO agencies (name, slug, description, logo, website, email, phone, city, province, subscriptionPlan, subscriptionStatus, isVerified) VALUES
('Prime Properties SA', 'prime-properties-sa', 'Leading real estate agency specializing in luxury homes and commercial properties across South Africa', NULL, 'https://primeproperties.co.za', 'info@primeproperties.co.za', '+27 11 123 4567', 'Johannesburg', 'Gauteng', 'professional', 'active', 1),
('Cape Coast Realty', 'cape-coast-realty', 'Coastal property specialists serving the Western Cape region', NULL, 'https://capecoastrealty.co.za', 'hello@capecoastrealty.co.za', '+27 21 555 8888', 'Cape Town', 'Western Cape', 'premium', 'active', 1),
('Durban Bay Estates', 'durban-bay-estates', 'Your trusted partner for KZN property investments', NULL, NULL, 'contact@durbanbay.co.za', '+27 31 444 9999', 'Durban', 'KwaZulu-Natal', 'basic', 'trial', 1);

-- =====================================================
-- STEP 2: Sample Users (Agents & Visitors)
-- =====================================================

-- Agent users (passwords: agent123 - bcrypt hash shown)
-- Hash for 'agent123': $2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW

INSERT INTO users (email, passwordHash, name, firstName, lastName, phone, role, agencyId, emailVerified, loginMethod) VALUES
('john.smith@primeproperties.co.za', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'John Smith', 'John', 'Smith', '+27 82 111 2222', 'agent', 1, 1, 'email'),
('sarah.jones@primeproperties.co.za', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'Sarah Jones', 'Sarah', 'Jones', '+27 83 222 3333', 'agent', 1, 1, 'email'),
('mike.wilson@capecoastrealty.co.za', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'Mike Wilson', 'Mike', 'Wilson', '+27 84 333 4444', 'agent', 2, 1, 'email'),
('visitor@test.com', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'Test Visitor', 'Test', 'Visitor', '+27 85 444 5555', 'visitor', NULL, 1, 'email');

-- =====================================================
-- STEP 3: Sample Agent Profiles
-- =====================================================

INSERT INTO agents (userId, agencyId, firstName, lastName, displayName, bio, phone, email, specialization, role, licenseNumber, yearsExperience, areasServed, languages, isVerified, isFeatured) VALUES
(1, 1, 'John', 'Smith', 'John Smith - Property Expert', 'Experienced agent with 10+ years in luxury residential properties. Specializing in Sandton, Waterfall, and Hyde Park areas.', '+27 82 111 2222', 'john.smith@primeproperties.co.za', '["Luxury Homes", "Residential", "Investment Properties"]', 'principal_agent', 'FFC1234567', 10, '["Sandton", "Waterfall", "Hyde Park", "Rosebank"]', '["English", "Afrikaans"]', 1, 1),
(2, 1, 'Sarah', 'Jones', 'Sarah Jones - First-Time Buyer Specialist', 'Helping first-time buyers navigate the property market with confidence. Expert in affordable housing and bond origination.', '+27 83 222 3333', 'sarah.jones@primeproperties.co.za', '["First Time Buyers", "Affordable Housing", "Bond Assistance"]', 'agent', 'FFC2345678', 5, '["Johannesburg", "Randburg", "Roodepoort"]', '["English", "Zulu"]', 1, 0),
(3, 2, 'Mike', 'Wilson', 'Mike Wilson - Coastal Living Expert', 'Your guide to coastal properties. Specializing in Atlantic Seaboard, Camps Bay, and Clifton luxury apartments.', '+27 84 333 4444', 'mike.wilson@capecoastrealty.co.za', '["Coastal Properties", "Luxury Apartments", "Penthouses"]', 'broker', 'FFC3456789', 15, '["Camps Bay", "Clifton", "Sea Point", "Bantry Bay"]', '["English", "French"]', 1, 1);

-- =====================================================
-- STEP 4: Sample Properties
-- =====================================================

INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, zipCode, amenities, yearBuilt, status, featured, agentId, ownerId) VALUES
-- Luxury properties
('Stunning Waterfall Estate Home', 'Magnificent 4-bedroom family home in prestigious Waterfall Estate. Open-plan living areas, gourmet kitchen, landscaped garden with pool, and staff quarters.', 'house', 'sale', 'sale', 485000000, 4, 3, 450, '123 Waterfall Drive, Waterfall Estate', 'Johannesburg', 'Gauteng', '2090', '["Pool", "Garden", "Security Estate", "Staff Quarters", "Double Garage"]', 2020, 'available', 1, 1, 1),

('Modern Sandton Apartment', 'Sleek 2-bedroom apartment in the heart of Sandton CBD. Floor-to-ceiling windows, premium finishes, and access to world-class amenities.', 'apartment', 'sale', 'sale', 295000000, 2, 2, 120, 'Unit 1505, Sandton Central', 'Johannesburg', 'Gauteng', '2196', '["Gym", "Pool", "24h Security", "Parking Bay", "Balcony"]', 2021, 'available', 1, 1, 1),

('Camps Bay Sea-Facing Villa', 'Exclusive 5-bedroom villa with breathtaking ocean views. Infinity pool, wine cellar, home cinema, and direct beach access.', 'villa', 'sale', 'sale', 1850000000, 5, 4, 600, '456 Victoria Road, Camps Bay', 'Cape Town', 'Western Cape', '8005', '["Ocean Views", "Infinity Pool", "Wine Cellar", "Cinema Room", "Beach Access", "Triple Garage"]', 2019, 'available', 1, 3, 3),

-- Mid-range properties
('Family Home in Randburg', 'Spacious 3-bedroom home perfect for growing families. Large garden, covered patio, and excellent security features.', 'house', 'sale', 'sale', 225000000, 3, 2, 280, '789 Oak Street, Ferndale', 'Johannesburg', 'Gauteng', '2194', '["Garden", "Patio", "Alarm System", "Double Garage"]', 2015, 'available', 0, 2, 2),

('Secure Townhouse Complex', 'Beautiful 2-bedroom townhouse in 24-hour security estate. Modern finishes, pet-friendly, and close to schools.', 'townhouse', 'sale', 'sale', 165000000, 2, 1, 150, 'Unit 45, Greenside Estate', 'Johannesburg', 'Gauteng', '2193', '["Security Estate", "Pet Friendly", "Garden", "Single Garage"]', 2018, 'available', 0, 2, 2),

-- Rental properties
('Student Accommodation - Observatory', 'Fully furnished 1-bedroom apartment perfect for students. Walking distance to UCT and Groote Schuur Hospital.', 'apartment', 'rent', 'rent', 750000, 1, 1, 45, '12 Main Road, Observatory', 'Cape Town', 'Western Cape', '7925', '["Furnished", "WiFi", "Security", "Parking"]', 2016, 'available', 0, 3, 3),

('Executive Rental - Umhlanga', 'Luxury 3-bedroom apartment with sea views. Short-term and long-term leases available. Prime location near Gateway.', 'apartment', 'rent', 'rent', 2500000, 3, 2, 180, 'The Pearls, Umhlanga', 'Durban', 'KwaZulu-Natal', '4319', '["Sea Views", "Pool", "Gym", "24h Security", "2 Parking Bays"]', 2020, 'available', 1, 1, 1),

-- Commercial property
('Prime Retail Space - Rosebank', 'Ground floor retail unit in high-traffic shopping center. Excellent visibility and foot traffic.', 'commercial', 'rent', 'rent', 8500000, NULL, 2, 200, 'Shop 12, Rosebank Mall', 'Johannesburg', 'Gauteng', '2196', '["High Foot Traffic", "Air Conditioned", "Parking", "Loading Bay"]', 2012, 'available', 0, 1, 1);

-- =====================================================
-- STEP 5: Sample Leads
-- =====================================================

INSERT INTO leads (propertyId, agencyId, agentId, name, email, phone, message, status, source) VALUES
(1, 1, 1, 'David Brown', 'david.brown@example.com', '+27 82 555 6666', 'Very interested in viewing this property. Available weekends.', 'new', 'website'),
(3, 2, 3, 'Emma Davis', 'emma.davis@example.com', '+27 83 666 7777', 'Looking for a sea-facing property. Is the price negotiable?', 'contacted', 'phone'),
(2, 1, 1, 'James Taylor', 'james.taylor@example.com', '+27 84 777 8888', 'First-time buyer, need assistance with bond application.', 'qualified', 'referral'),
(4, 1, 2, 'Lisa Anderson', 'lisa.anderson@example.com', '+27 85 888 9999', 'Looking for a family home in good school district.', 'new', 'website');

-- =====================================================
-- STEP 6: Sample Prospects (Anonymous Users)
-- =====================================================

INSERT INTO prospects (sessionId, email, income, incomeRange, employmentStatus, monthlyExpenses, monthlyDebts, dependents, savingsDeposit, buyabilityScore, affordabilityMin, affordabilityMax, monthlyPaymentCapacity, profileProgress, badges, preferredPropertyType, preferredLocation) VALUES
('sess_demo_001', 'prospect1@example.com', 4500000, '25k_50k', 'employed', 1200000, 500000, 2, 15000000, 'medium', 150000000, 280000000, 1800000, 75, '["Home Seeker", "Budget Builder"]', 'house', 'Johannesburg'),
('sess_demo_002', NULL, 7500000, '50k_100k', 'self_employed', 2000000, 300000, 1, 35000000, 'high', 300000000, 550000000, 3500000, 60, '["Target Buyer"]', 'apartment', 'Cape Town'),
('sess_demo_003', 'prospect3@example.com', 2800000, '15k_25k', 'employed', 1000000, 800000, 0, 5000000, 'low', 80000000, 150000000, 1000000, 45, '["First Time Buyer"]', 'townhouse', 'Pretoria');

-- =====================================================
-- STEP 7: Sample Scheduled Viewings
-- =====================================================

INSERT INTO scheduled_viewings (prospectId, propertyId, agentId, scheduledAt, status, notes, prospectName, prospectEmail, prospectPhone) VALUES
(1, 4, 2, DATE_ADD(NOW(), INTERVAL 2 DAY), 'confirmed', 'Interested in school locations nearby', 'John Prospect', 'prospect1@example.com', '+27 82 123 4567'),
(2, 3, 3, DATE_ADD(NOW(), INTERVAL 5 DAY), 'scheduled', 'Looking for investment property', 'Jane Buyer', 'prospect2@example.com', '+27 83 234 5678');

-- =====================================================
-- STEP 8: Sample Prospect Favorites
-- =====================================================

INSERT INTO prospect_favorites (prospectId, propertyId) VALUES
(1, 1), (1, 4), (1, 5),
(2, 2), (2, 3),
(3, 4), (3, 6);

-- =====================================================
-- STEP 9: Sample Recently Viewed
-- =====================================================

INSERT INTO recently_viewed (prospectId, propertyId, viewedAt) VALUES
(1, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 4, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 3, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 2, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(3, 6, DATE_SUB(NOW(), INTERVAL 30 MINUTE));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '✅ Sample data inserted successfully!' AS status;

SELECT 'Data Summary:' AS info;
SELECT 'Agencies' as table_name, COUNT(*) as records FROM agencies
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Agents', COUNT(*) FROM agents
UNION ALL SELECT 'Properties', COUNT(*) FROM properties
UNION ALL SELECT 'Leads', COUNT(*) FROM leads
UNION ALL SELECT 'Prospects', COUNT(*) FROM prospects
UNION ALL SELECT 'Scheduled Viewings', COUNT(*) FROM scheduled_viewings
UNION ALL SELECT 'Prospect Favorites', COUNT(*) FROM prospect_favorites
UNION ALL SELECT 'Recently Viewed', COUNT(*) FROM recently_viewed;

-- Show sample data
SELECT '🏢 Sample Agencies:' AS info;
SELECT id, name, city, subscriptionPlan FROM agencies;

SELECT '👥 Sample Agents:' AS info;
SELECT id, displayName, email, yearsExperience, isVerified FROM agents;

SELECT '🏠 Sample Properties:' AS info;
SELECT id, title, propertyType, CONCAT('R', FORMAT(price/100, 0)) as price, city, status FROM properties;

SELECT '📋 Sample Leads:' AS info;
SELECT id, name, email, status, source FROM leads;

SELECT '🎮 Sample Prospects:' AS info;
SELECT id, email, buyabilityScore, CONCAT('R', FORMAT(affordabilityMax/100, 0)) as max_budget, profileProgress FROM prospects;

SELECT '
🎉 Sample Data Seeding Complete!
📊 You can now test the application with realistic data
🔐 Test login: agent@test.com / password: agent123
' AS summary;
-- =====================================================
-- SAMPLE DATA SEED SCRIPT
-- Run AFTER full-database-setup.sql completes
-- Creates realistic test data for development
-- =====================================================

USE real_estate_portal;

-- =====================================================
-- STEP 1: Sample Agencies
-- =====================================================

INSERT INTO agencies (name, slug, description, logo, website, email, phone, city, province, subscriptionPlan, subscriptionStatus, isVerified) VALUES
('Prime Properties SA', 'prime-properties-sa', 'Leading real estate agency specializing in luxury homes and commercial properties across South Africa', NULL, 'https://primeproperties.co.za', 'info@primeproperties.co.za', '+27 11 123 4567', 'Johannesburg', 'Gauteng', 'professional', 'active', 1),
('Cape Coast Realty', 'cape-coast-realty', 'Coastal property specialists serving the Western Cape region', NULL, 'https://capecoastrealty.co.za', 'hello@capecoastrealty.co.za', '+27 21 555 8888', 'Cape Town', 'Western Cape', 'premium', 'active', 1),
('Durban Bay Estates', 'durban-bay-estates', 'Your trusted partner for KZN property investments', NULL, NULL, 'contact@durbanbay.co.za', '+27 31 444 9999', 'Durban', 'KwaZulu-Natal', 'basic', 'trial', 1);

-- =====================================================
-- STEP 2: Sample Users (Agents & Visitors)
-- =====================================================

-- Agent users (passwords: agent123 - bcrypt hash shown)
-- Hash for 'agent123': $2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW

INSERT INTO users (email, passwordHash, name, firstName, lastName, phone, role, agencyId, emailVerified, loginMethod) VALUES
('john.smith@primeproperties.co.za', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'John Smith', 'John', 'Smith', '+27 82 111 2222', 'agent', 1, 1, 'email'),
('sarah.jones@primeproperties.co.za', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'Sarah Jones', 'Sarah', 'Jones', '+27 83 222 3333', 'agent', 1, 1, 'email'),
('mike.wilson@capecoastrealty.co.za', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'Mike Wilson', 'Mike', 'Wilson', '+27 84 333 4444', 'agent', 2, 1, 'email'),
('visitor@test.com', '$2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW', 'Test Visitor', 'Test', 'Visitor', '+27 85 444 5555', 'visitor', NULL, 1, 'email');

-- =====================================================
-- STEP 3: Sample Agent Profiles
-- =====================================================

INSERT INTO agents (userId, agencyId, firstName, lastName, displayName, bio, phone, email, specialization, role, licenseNumber, yearsExperience, areasServed, languages, isVerified, isFeatured) VALUES
(1, 1, 'John', 'Smith', 'John Smith - Property Expert', 'Experienced agent with 10+ years in luxury residential properties. Specializing in Sandton, Waterfall, and Hyde Park areas.', '+27 82 111 2222', 'john.smith@primeproperties.co.za', '["Luxury Homes", "Residential", "Investment Properties"]', 'principal_agent', 'FFC1234567', 10, '["Sandton", "Waterfall", "Hyde Park", "Rosebank"]', '["English", "Afrikaans"]', 1, 1),
(2, 1, 'Sarah', 'Jones', 'Sarah Jones - First-Time Buyer Specialist', 'Helping first-time buyers navigate the property market with confidence. Expert in affordable housing and bond origination.', '+27 83 222 3333', 'sarah.jones@primeproperties.co.za', '["First Time Buyers", "Affordable Housing", "Bond Assistance"]', 'agent', 'FFC2345678', 5, '["Johannesburg", "Randburg", "Roodepoort"]', '["English", "Zulu"]', 1, 0),
(3, 2, 'Mike', 'Wilson', 'Mike Wilson - Coastal Living Expert', 'Your guide to coastal properties. Specializing in Atlantic Seaboard, Camps Bay, and Clifton luxury apartments.', '+27 84 333 4444', 'mike.wilson@capecoastrealty.co.za', '["Coastal Properties", "Luxury Apartments", "Penthouses"]', 'broker', 'FFC3456789', 15, '["Camps Bay", "Clifton", "Sea Point", "Bantry Bay"]', '["English", "French"]', 1, 1);

-- =====================================================
-- STEP 4: Sample Properties
-- =====================================================

INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, zipCode, amenities, yearBuilt, status, featured, agentId, ownerId) VALUES
-- Luxury properties
('Stunning Waterfall Estate Home', 'Magnificent 4-bedroom family home in prestigious Waterfall Estate. Open-plan living areas, gourmet kitchen, landscaped garden with pool, and staff quarters.', 'house', 'sale', 'sale', 485000000, 4, 3, 450, '123 Waterfall Drive, Waterfall Estate', 'Johannesburg', 'Gauteng', '2090', '["Pool", "Garden", "Security Estate", "Staff Quarters", "Double Garage"]', 2020, 'available', 1, 1, 1),

('Modern Sandton Apartment', 'Sleek 2-bedroom apartment in the heart of Sandton CBD. Floor-to-ceiling windows, premium finishes, and access to world-class amenities.', 'apartment', 'sale', 'sale', 295000000, 2, 2, 120, 'Unit 1505, Sandton Central', 'Johannesburg', 'Gauteng', '2196', '["Gym", "Pool", "24h Security", "Parking Bay", "Balcony"]', 2021, 'available', 1, 1, 1),

('Camps Bay Sea-Facing Villa', 'Exclusive 5-bedroom villa with breathtaking ocean views. Infinity pool, wine cellar, home cinema, and direct beach access.', 'villa', 'sale', 'sale', 1850000000, 5, 4, 600, '456 Victoria Road, Camps Bay', 'Cape Town', 'Western Cape', '8005', '["Ocean Views", "Infinity Pool", "Wine Cellar", "Cinema Room", "Beach Access", "Triple Garage"]', 2019, 'available', 1, 3, 3),

-- Mid-range properties
('Family Home in Randburg', 'Spacious 3-bedroom home perfect for growing families. Large garden, covered patio, and excellent security features.', 'house', 'sale', 'sale', 225000000, 3, 2, 280, '789 Oak Street, Ferndale', 'Johannesburg', 'Gauteng', '2194', '["Garden", "Patio", "Alarm System", "Double Garage"]', 2015, 'available', 0, 2, 2),

('Secure Townhouse Complex', 'Beautiful 2-bedroom townhouse in 24-hour security estate. Modern finishes, pet-friendly, and close to schools.', 'townhouse', 'sale', 'sale', 165000000, 2, 1, 150, 'Unit 45, Greenside Estate', 'Johannesburg', 'Gauteng', '2193', '["Security Estate", "Pet Friendly", "Garden", "Single Garage"]', 2018, 'available', 0, 2, 2),

-- Rental properties
('Student Accommodation - Observatory', 'Fully furnished 1-bedroom apartment perfect for students. Walking distance to UCT and Groote Schuur Hospital.', 'apartment', 'rent', 'rent', 750000, 1, 1, 45, '12 Main Road, Observatory', 'Cape Town', 'Western Cape', '7925', '["Furnished", "WiFi", "Security", "Parking"]', 2016, 'available', 0, 3, 3),

('Executive Rental - Umhlanga', 'Luxury 3-bedroom apartment with sea views. Short-term and long-term leases available. Prime location near Gateway.', 'apartment', 'rent', 'rent', 2500000, 3, 2, 180, 'The Pearls, Umhlanga', 'Durban', 'KwaZulu-Natal', '4319', '["Sea Views", "Pool", "Gym", "24h Security", "2 Parking Bays"]', 2020, 'available', 1, 1, 1),

-- Commercial property
('Prime Retail Space - Rosebank', 'Ground floor retail unit in high-traffic shopping center. Excellent visibility and foot traffic.', 'commercial', 'rent', 'rent', 8500000, NULL, 2, 200, 'Shop 12, Rosebank Mall', 'Johannesburg', 'Gauteng', '2196', '["High Foot Traffic", "Air Conditioned", "Parking", "Loading Bay"]', 2012, 'available', 0, 1, 1);

-- =====================================================
-- STEP 5: Sample Leads
-- =====================================================

INSERT INTO leads (propertyId, agencyId, agentId, name, email, phone, message, status, source) VALUES
(1, 1, 1, 'David Brown', 'david.brown@example.com', '+27 82 555 6666', 'Very interested in viewing this property. Available weekends.', 'new', 'website'),
(3, 2, 3, 'Emma Davis', 'emma.davis@example.com', '+27 83 666 7777', 'Looking for a sea-facing property. Is the price negotiable?', 'contacted', 'phone'),
(2, 1, 1, 'James Taylor', 'james.taylor@example.com', '+27 84 777 8888', 'First-time buyer, need assistance with bond application.', 'qualified', 'referral'),
(4, 1, 2, 'Lisa Anderson', 'lisa.anderson@example.com', '+27 85 888 9999', 'Looking for a family home in good school district.', 'new', 'website');

-- =====================================================
-- STEP 6: Sample Prospects (Anonymous Users)
-- =====================================================

INSERT INTO prospects (sessionId, email, income, incomeRange, employmentStatus, monthlyExpenses, monthlyDebts, dependents, savingsDeposit, buyabilityScore, affordabilityMin, affordabilityMax, monthlyPaymentCapacity, profileProgress, badges, preferredPropertyType, preferredLocation) VALUES
('sess_demo_001', 'prospect1@example.com', 4500000, '25k_50k', 'employed', 1200000, 500000, 2, 15000000, 'medium', 150000000, 280000000, 1800000, 75, '["Home Seeker", "Budget Builder"]', 'house', 'Johannesburg'),
('sess_demo_002', NULL, 7500000, '50k_100k', 'self_employed', 2000000, 300000, 1, 35000000, 'high', 300000000, 550000000, 3500000, 60, '["Target Buyer"]', 'apartment', 'Cape Town'),
('sess_demo_003', 'prospect3@example.com', 2800000, '15k_25k', 'employed', 1000000, 800000, 0, 5000000, 'low', 80000000, 150000000, 1000000, 45, '["First Time Buyer"]', 'townhouse', 'Pretoria');

-- =====================================================
-- STEP 7: Sample Scheduled Viewings
-- =====================================================

INSERT INTO scheduled_viewings (prospectId, propertyId, agentId, scheduledAt, status, notes, prospectName, prospectEmail, prospectPhone) VALUES
(1, 4, 2, DATE_ADD(NOW(), INTERVAL 2 DAY), 'confirmed', 'Interested in school locations nearby', 'John Prospect', 'prospect1@example.com', '+27 82 123 4567'),
(2, 3, 3, DATE_ADD(NOW(), INTERVAL 5 DAY), 'scheduled', 'Looking for investment property', 'Jane Buyer', 'prospect2@example.com', '+27 83 234 5678');

-- =====================================================
-- STEP 8: Sample Prospect Favorites
-- =====================================================

INSERT INTO prospect_favorites (prospectId, propertyId) VALUES
(1, 1), (1, 4), (1, 5),
(2, 2), (2, 3),
(3, 4), (3, 6);

-- =====================================================
-- STEP 9: Sample Recently Viewed
-- =====================================================

INSERT INTO recently_viewed (prospectId, propertyId, viewedAt) VALUES
(1, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 4, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 3, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 2, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(3, 6, DATE_SUB(NOW(), INTERVAL 30 MINUTE));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '✅ Sample data inserted successfully!' AS status;

SELECT 'Data Summary:' AS info;
SELECT 'Agencies' as table_name, COUNT(*) as records FROM agencies
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Agents', COUNT(*) FROM agents
UNION ALL SELECT 'Properties', COUNT(*) FROM properties
UNION ALL SELECT 'Leads', COUNT(*) FROM leads
UNION ALL SELECT 'Prospects', COUNT(*) FROM prospects
UNION ALL SELECT 'Scheduled Viewings', COUNT(*) FROM scheduled_viewings
UNION ALL SELECT 'Prospect Favorites', COUNT(*) FROM prospect_favorites
UNION ALL SELECT 'Recently Viewed', COUNT(*) FROM recently_viewed;

-- Show sample data
SELECT '🏢 Sample Agencies:' AS info;
SELECT id, name, city, subscriptionPlan FROM agencies;

SELECT '👥 Sample Agents:' AS info;
SELECT id, displayName, email, yearsExperience, isVerified FROM agents;

SELECT '🏠 Sample Properties:' AS info;
SELECT id, title, propertyType, CONCAT('R', FORMAT(price/100, 0)) as price, city, status FROM properties;

SELECT '📋 Sample Leads:' AS info;
SELECT id, name, email, status, source FROM leads;

SELECT '🎮 Sample Prospects:' AS info;
SELECT id, email, buyabilityScore, CONCAT('R', FORMAT(affordabilityMax/100, 0)) as max_budget, profileProgress FROM prospects;

SELECT '
🎉 Sample Data Seeding Complete!
📊 You can now test the application with realistic data
🔐 Test login: agent@test.com / password: agent123
' AS summary;
