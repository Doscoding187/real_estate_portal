-- Create invitations table
CREATE TABLE IF NOT EXISTS `invitations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agencyId` INT NOT NULL,
  `invitedBy` INT NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'agent',
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `status` ENUM('pending', 'accepted', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  `expiresAt` TIMESTAMP NOT NULL,
  `acceptedAt` TIMESTAMP NULL,
  `acceptedBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`acceptedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  INDEX idx_invitations_token (`token`),
  INDEX idx_invitations_email (`email`),
  INDEX idx_invitations_agency (`agencyId`),
  INDEX idx_invitations_status (`status`)
);

SELECT 'Invitations table created successfully!' AS message;
