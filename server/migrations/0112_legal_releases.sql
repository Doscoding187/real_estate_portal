-- Immutable approved Terms/Privacy bundles. No customer copy is installed here.
CREATE TABLE `legal_releases` (
 `bundle_id` varchar(100) NOT NULL,
 `format_version` int NOT NULL,
 `effective_at` varchar(40) NOT NULL,
 `terms_version` varchar(100) NOT NULL,
 `terms_content` text NOT NULL,
 `privacy_version` varchar(100) NOT NULL,
 `privacy_content` text NOT NULL,
 `approval_reference` varchar(200) NOT NULL,
 `approval_actor` varchar(200) NOT NULL,
 `approved_at` varchar(40) NOT NULL,
 `content_sha256` varchar(64) NOT NULL,
 PRIMARY KEY (`bundle_id`)
);
