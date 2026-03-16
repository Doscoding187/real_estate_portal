ALTER TABLE properties
  ADD COLUMN sourceListingId INT NULL;

ALTER TABLE properties
  ADD INDEX idx_properties_sourceListingId (sourceListingId);

ALTER TABLE properties
  ADD CONSTRAINT fk_properties_sourceListingId
    FOREIGN KEY (sourceListingId) REFERENCES listings(id)
    ON DELETE SET NULL;

ALTER TABLE showings
  ADD COLUMN propertyId INT NULL;

ALTER TABLE showings
  ADD COLUMN leadId INT NULL;

ALTER TABLE showings
  ADD COLUMN listingId INT NULL;

ALTER TABLE showings
  MODIFY COLUMN propertyId INT NULL;

ALTER TABLE showings
  MODIFY COLUMN leadId INT NULL;

ALTER TABLE showings
  ADD INDEX idx_showings_propertyId (propertyId);

ALTER TABLE showings
  ADD INDEX idx_showings_leadId (leadId);

ALTER TABLE showings
  ADD CONSTRAINT fk_showings_propertyId
    FOREIGN KEY (propertyId) REFERENCES properties(id)
    ON DELETE SET NULL;

ALTER TABLE showings
  ADD CONSTRAINT fk_showings_leadId
    FOREIGN KEY (leadId) REFERENCES leads(id)
    ON DELETE SET NULL;

UPDATE properties p
JOIN (
  SELECT ownerId, title, address, MAX(id) AS listingId
  FROM listings
  GROUP BY ownerId, title, address
) l
  ON l.ownerId = p.ownerId
 AND l.title = p.title
 AND l.address = p.address
SET p.sourceListingId = l.listingId
WHERE p.sourceListingId IS NULL;

UPDATE showings s
JOIN properties p
  ON p.sourceListingId = s.listingId
SET s.propertyId = p.id
WHERE s.propertyId IS NULL;
