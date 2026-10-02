-- P10 Place Authority (Slice 3): the foreign key for the saved-search Place
-- reference, sequenced after 0098.
--
-- TiDB refuses a single ALTER that both introduces a column and adds a dependent
-- constraint, and the canonical migration manifest requires exactly one statement
-- per incremental DDL migration, so the column and its key are two migrations.
-- Splitting them keeps each migration single-statement and reversible in
-- isolation, and keeps the physical column appended at the end of the table, which
-- is why the Drizzle model declares `place_id` last.
--
-- ON DELETE RESTRICT, consistent with Place identity immutability: a Place can
-- never be removed out from under a saved search.
ALTER TABLE `saved_searches`
  ADD CONSTRAINT `saved_searches_place_id_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place` (`place_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
