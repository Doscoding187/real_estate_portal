-- Minimum append-only acceptance evidence; account erasure unlinks identity.
CREATE TABLE `user_legal_acceptances` (
 `id` varchar(36) NOT NULL,
 `user_id` int NULL,
 `bundle_id` varchar(100) NOT NULL,
 `terms_sha256` varchar(64) NOT NULL,
 `privacy_notice_sha256` varchar(64) NOT NULL,
 `release_content_sha256` varchar(64) NOT NULL,
 `accepted_at` datetime(3) NOT NULL,
 `source` enum('account_registration') NOT NULL,
 PRIMARY KEY (`id`),
 KEY `idx_user_legal_acceptances_user` (`user_id`),
 KEY `idx_user_legal_acceptances_due` (`accepted_at`),
 CONSTRAINT `user_legal_acceptances_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT `user_legal_acceptances_bundle_id_legal_releases_bundle_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `legal_releases` (`bundle_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
);
