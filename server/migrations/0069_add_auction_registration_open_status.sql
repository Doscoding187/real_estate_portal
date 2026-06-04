ALTER TABLE unit_types
  MODIFY COLUMN auction_status
  ENUM('scheduled', 'registration_open', 'active', 'sold', 'passed_in', 'withdrawn')
  DEFAULT 'scheduled';
