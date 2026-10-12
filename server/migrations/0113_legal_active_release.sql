-- Separate policy pointer; release changes preserve every prior approved bundle.
CREATE TABLE `legal_active_release` (
 `purpose` enum('account_registration') NOT NULL,
 `bundle_id` varchar(100) NOT NULL,
 PRIMARY KEY (`purpose`),
 CONSTRAINT `legal_active_release_bundle_id_legal_releases_bundle_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `legal_releases` (`bundle_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
);
