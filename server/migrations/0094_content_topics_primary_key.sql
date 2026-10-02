-- One mapping per content/topic pair; no synthetic identity.
ALTER TABLE `content_topics` ADD PRIMARY KEY (`content_id`, `topic_id`);
