UPDATE users
SET emailVerificationToken = NULL,
    emailVerificationTokenExpiresAt = NULL
WHERE emailVerificationToken IS NOT NULL
  AND emailVerificationTokenExpiresAt IS NULL;
