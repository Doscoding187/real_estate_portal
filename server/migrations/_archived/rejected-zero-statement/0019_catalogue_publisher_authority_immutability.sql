DELIMITER $$
CREATE TRIGGER `trg_catalogue_publishers_immutable_authority`
BEFORE UPDATE ON `catalogue_publishers`
FOR EACH ROW
BEGIN
  IF NOT (NEW.`authority_kind` <=> OLD.`authority_kind`)
    OR NOT (NEW.`developer_organisation_id` <=> OLD.`developer_organisation_id`) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'CATALOGUE_PUBLISHER_AUTHORITY_IMMUTABLE';
  END IF;
END$$
DELIMITER ;
