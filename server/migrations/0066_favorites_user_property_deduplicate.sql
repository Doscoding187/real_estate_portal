DELETE FROM `favorites`
WHERE `id` NOT IN (
  SELECT `id`
  FROM (
    SELECT MIN(`id`) AS `id`
    FROM `favorites`
    GROUP BY `user_id`, `property_id`
  ) AS `retained`
);
