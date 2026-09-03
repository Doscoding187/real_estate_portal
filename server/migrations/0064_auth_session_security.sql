ALTER TABLE users
  ADD COLUMN sessionVersion INT NOT NULL DEFAULT 1 AFTER lastSignedIn,
  ADD COLUMN emailVerificationTokenExpiresAt TIMESTAMP NULL AFTER emailVerificationToken;
