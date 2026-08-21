ALTER TABLE `commercial_space_specifications`
  ADD CONSTRAINT `chk_commercial_space_specifications_value_state`
    CHECK (((`value_state` = 'known') AND ((`numeric_value` IS NOT NULL) + (`text_value` IS NOT NULL) + (`boolean_value` IS NOT NULL) = 1)) OR ((`value_state` IN ('unknown','unavailable','not_applicable')) AND (`numeric_value` IS NULL) AND (`text_value` IS NULL) AND (`boolean_value` IS NULL)));
