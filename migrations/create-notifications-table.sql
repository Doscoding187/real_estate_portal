-- Notifications Table Migration
-- Real-time notifications for agents and users

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type ENUM('lead_assigned', 'offer_received', 'showing_scheduled', 'system_alert') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  data TEXT COMMENT 'JSON data for additional notification context',
  isRead INT DEFAULT 0 NOT NULL COMMENT '0 = unread, 1 = read',
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (userId),
  INDEX idx_type (type),
  INDEX idx_is_read (isRead),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email templates table for branded communications
CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  templateKey VARCHAR(100) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  htmlContent TEXT NOT NULL,
  textContent TEXT,
  agencyId INT,
  isActive INT DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  INDEX idx_template_key (templateKey),
  INDEX idx_agency (agencyId),
  INDEX idx_is_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;