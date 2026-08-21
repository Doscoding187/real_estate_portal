ALTER TABLE `commercial_spaces`
  ADD CONSTRAINT `chk_commercial_spaces_positive_areas`
    CHECK (((`rentable_area_m2` IS NULL) OR (`rentable_area_m2` > 0)) AND ((`usable_area_m2` IS NULL) OR (`usable_area_m2` > 0)));
