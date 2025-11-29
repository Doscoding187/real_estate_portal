-- Add detailed project metrics to developers table
ALTER TABLE developers
ADD COLUMN completedProjects INT DEFAULT 0,
ADD COLUMN currentProjects INT DEFAULT 0,
ADD COLUMN upcomingProjects INT DEFAULT 0;
