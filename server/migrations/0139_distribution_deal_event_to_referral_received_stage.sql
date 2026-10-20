-- Event history can record the truthful initial referral state.
ALTER TABLE `distribution_deal_events`
  MODIFY COLUMN `to_stage` enum('referral_received','viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NULL;
