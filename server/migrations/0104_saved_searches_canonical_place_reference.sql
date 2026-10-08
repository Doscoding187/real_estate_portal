-- P10 Place Authority (Slice 3): one additive persisted canonical reference.
--
-- A saved search is the existing, already-governed home of a versioned geographic
-- query intent (geography contract v0.5 Section 15). It is a consumer of
-- geography, not an authority over it, so holding one canonical Place reference
-- here cannot make it a second geography authority.
--
-- The column is nullable, so no existing row is rewritten and no data migration
-- is required. When it is present it is the *sole* geographic authority for that
-- saved search: the legacy geography fields inside `criteria` are not consulted
-- for geography, and a save that supplies both a canonical Place and competing
-- legacy geography text is rejected by the caller rather than merged. That is the
-- explicit precedence contract, not a silent fallback.
--
-- The width matches the canonical `place.place_id` (40) so a valid Place id can
-- never be truncated on the way in.
--
-- ON DELETE RESTRICT, consistent with Place identity immutability: a Place can
-- never be removed out from under a saved search.
--
-- The column and its foreign key are added as two separate DDL statements. TiDB
-- refuses a single ALTER that both introduces a column and adds a dependent
-- constraint, and the physical column is appended at the end of the table, so
-- the Drizzle model declares `place_id` last to keep the ordinals congruent.

ALTER TABLE `saved_searches`
  ADD COLUMN `place_id` varchar(40) NULL;
