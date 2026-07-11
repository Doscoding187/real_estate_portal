CREATE TABLE IF NOT EXISTS `seller_prospects` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `assigned_agent_id` int NULL,
  `created_by_user_id` int NULL,
  `owner_name` varchar(200) NULL,
  `email` varchar(320) NULL,
  `phone` varchar(50) NULL,
  `property_address` varchar(500) NULL,
  `suburb` varchar(120) NULL,
  `city` varchar(120) NULL,
  `province` varchar(120) NULL,
  `property_type` enum('apartment','house','farm','land','commercial','shared_living') NULL,
  `source` varchar(100) NULL,
  `canvassing_method` enum('door_knocking','phone','referral','sphere','signboard','open_house','digital','walk_in','other') NOT NULL DEFAULT 'other',
  `stage` enum('new','contact_attempted','contacted','follow_up_required','appointment_scheduled','qualified','mandate_won','converted_to_listing','not_interested','lost','archived') NOT NULL DEFAULT 'new',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `next_follow_up` timestamp NULL,
  `last_contacted_at` timestamp NULL,
  `outcome` text NULL,
  `converted_listing_id` int NULL,
  `converted_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seller_prospects_agency_stage` (`agency_id`, `stage`),
  KEY `idx_seller_prospects_agency_follow_up` (`agency_id`, `next_follow_up`),
  KEY `idx_seller_prospects_agent_follow_up` (`assigned_agent_id`, `next_follow_up`),
  KEY `idx_seller_prospects_agency_area` (`agency_id`, `city`, `suburb`),
  KEY `idx_seller_prospects_converted_listing` (`converted_listing_id`),
  CONSTRAINT `seller_prospects_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seller_prospects_assigned_agent_id_fk`
    FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `seller_prospects_created_by_user_id_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `seller_prospects_converted_listing_id_fk`
    FOREIGN KEY (`converted_listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `seller_prospect_activities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `seller_prospect_id` int NOT NULL,
  `actor_user_id` int NULL,
  `activity_type` enum('created','note','call','email','meeting','status_change','assignment','follow_up_scheduled','follow_up_completed','conversion') NOT NULL,
  `description` text NOT NULL,
  `metadata` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seller_prospect_activities_prospect` (`seller_prospect_id`, `created_at`),
  KEY `idx_seller_prospect_activities_agency_created` (`agency_id`, `created_at`),
  CONSTRAINT `seller_prospect_activities_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seller_prospect_activities_prospect_id_fk`
    FOREIGN KEY (`seller_prospect_id`) REFERENCES `seller_prospects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seller_prospect_activities_actor_user_id_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
