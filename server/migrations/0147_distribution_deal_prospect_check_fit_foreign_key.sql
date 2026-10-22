ALTER TABLE `distribution_deals`
  ADD CONSTRAINT `fk_distribution_deals_prospect_check_fit`
    FOREIGN KEY (`prospect_check_fit_id`)
    REFERENCES `distribution_prospect_check_fits`(`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  ADD KEY `idx_distribution_deals_prospect_check_fit` (`prospect_check_fit_id`);
