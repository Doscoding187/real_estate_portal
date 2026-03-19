ALTER TABLE `agents`
  ADD COLUMN `slug` varchar(200),
  ADD COLUMN `focus` enum('sales','rentals','both'),
  ADD COLUMN `propertyTypes` text,
  ADD COLUMN `socialLinks` text,
  ADD COLUMN `profileCompletionScore` int NOT NULL DEFAULT 0,
  ADD COLUMN `profileCompletionFlags` text;
