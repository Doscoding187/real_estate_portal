-- Script to clean up placeholder Explore content
-- Keeps only the video posted by the agent account (agent@propertylistify.com)

-- Step 1: Find the agent user ID
-- SELECT id, email, full_name FROM users WHERE email = 'agent@propertylistify.com';

-- Step 2: Delete interactions for non-agent videos
DELETE FROM explore_interactions 
WHERE short_id IN (
  SELECT id FROM explore_shorts 
  WHERE user_id != (SELECT id FROM users WHERE email = 'agent@propertylistify.com')
);

-- Step 3: Delete highlight tags for non-agent videos
DELETE FROM explore_highlight_tags 
WHERE short_id IN (
  SELECT id FROM explore_shorts 
  WHERE user_id != (SELECT id FROM users WHERE email = 'agent@propertylistify.com')
);

-- Step 4: Delete non-agent videos
DELETE FROM explore_shorts 
WHERE user_id != (SELECT id FROM users WHERE email = 'agent@propertylistify.com');

-- Step 5: Verify remaining content
SELECT 
  es.id,
  es.title,
  es.description,
  u.email,
  u.full_name,
  es.created_at
FROM explore_shorts es
JOIN users u ON es.user_id = u.id
ORDER BY es.created_at DESC;
