ALTER TABLE `commercial_availability_economics`
  ADD CONSTRAINT `chk_commercial_availability_economics_value_state`
    CHECK (((`value_state` IN ('supplied','estimated')) AND (`amount_minor` IS NOT NULL) AND (`charge_basis` IS NOT NULL)) OR ((`value_state` IN ('unknown','not_applicable')) AND (`amount_minor` IS NULL) AND (`range_maximum_minor` IS NULL) AND (`charge_basis` IS NULL) AND (`annual_escalation_percent` IS NULL)));
