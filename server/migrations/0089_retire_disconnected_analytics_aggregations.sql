-- P8 analytics authority: remove the disconnected pre-launch aggregate table.
-- No active runtime reader or writer uses this table; current analytics facts
-- are retained in canonical event tables and are rebuildable from those facts.
DROP TABLE `analytics_aggregations`;
