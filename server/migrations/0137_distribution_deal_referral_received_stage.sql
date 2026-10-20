-- A referral starts as received until a real viewing booking exists.
ALTER TABLE `distribution_deals`
  MODIFY COLUMN `current_stage` enum('referral_received','viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NOT NULL DEFAULT 'referral_received';
