-- Read-only Azure checks. Results contain IDs, counts, types, scopes and hashes; no names, note text or personal data.
-- 0. Confirm the production data shape and Place classification counts.
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM listings) AS listings,
  (SELECT COUNT(*) FROM developments) AS developments,
  (SELECT COUNT(*) FROM leads) AS leads,
  (SELECT COUNT(*) FROM service_provider_locations) AS service_provider_locations,
  (SELECT COUNT(*) FROM place) AS places_total,
  (SELECT COUNT(*) FROM place
    WHERE licensing_classification IN ('mixed_odbl_supported', 'permissive_supported')) AS places_non_osm,
  (SELECT COUNT(*) FROM place
    WHERE licensing_classification = 'osm_only_odbl_provisional') AS places_osm_only,
  (SELECT COUNT(*) FROM place
    WHERE licensing_classification IS NULL) AS places_unclassified,
  (SELECT MIN(created_at) FROM place) AS places_first_created_at,
  (SELECT MAX(created_at) FROM place) AS places_last_created_at;

-- 0a. Show the applied migration checksums at the production baseline.
-- Compare every full checksum with the committed SQL file and manifest entry.
SELECT filename, checksum
FROM sql_migration_history
WHERE numeric_version BETWEEN 107 AND 111
ORDER BY numeric_version, filename;

-- 0b. Any row means a failed, blocked, running, or unfinished attempt: stop.
SELECT attempt_id, migration_filename, state, failure_class, started_at, finished_at
FROM sql_migration_attempts
WHERE state IN ('running', 'failed', 'blocked') OR finished_at IS NULL
ORDER BY started_at, attempt_id;

-- 1. Identify which Place the current listing(s) reference.
SELECT id AS listing_id, canonical_place_id AS place_id
FROM listings
ORDER BY id;

-- 2. Count corrected Place rows and evidence notes still at their exact 0111 values.
-- The reviewed set contains 48 IDs; old Place values are town / metro_city.
WITH reviewed(place_id, old_note_sha256) AS (
  SELECT 'pl-place-01-00dbe14e9aefa6f6a0425875', 'ad52fec21100ea486fd0e6c495f97354e518fafeebb4290ac03acbe934d666c5' UNION ALL
  SELECT 'pl-place-01-06c93731d76b7235e2749b4b', '4e029285ef3e60624c787dcecc9d8bb2b05ea6c102d116baa731b7c9f9b33994' UNION ALL
  SELECT 'pl-place-01-0898feda27cd7236586afb1e', '6b2345cbc2db23940cbe686228f5637bc56b8e7abd9495c42431cabbcc33451e' UNION ALL
  SELECT 'pl-place-01-08f7c8f981bafadbb6d28cf7', 'eb20b7f932ef9f40bbf78159e7fec90121ce1b649a188bfbfc05b9c8ca50c1a4' UNION ALL
  SELECT 'pl-place-01-1361273d2094c6a4cb8e3636', '3cf6402fb7cae43f5ffbc5ded3e3ebfcd7b524c79845f949e4db7ff0519bd2bc' UNION ALL
  SELECT 'pl-place-01-184b60c72070d81595d10cf5', 'f7959cac1d3fb09388370edd3661cb799d79afb03b5da0f58c52966176856392' UNION ALL
  SELECT 'pl-place-01-1dbb2de0670edd2d18b29dfd', '0da7c57aa9203497c85aae23ff29a471c5fc6b33e83df91bb7d6004c09c74060' UNION ALL
  SELECT 'pl-place-01-1e02ba837328c79fe9e890c3', 'ddf3bd7f194058757cf170f957164da6a41ebb29215aaab3314467e23066d1d7' UNION ALL
  SELECT 'pl-place-01-21606f4125d51d49ee761d41', 'c4b999b6691a903407ac7f5ff3424634f3beb3ccd7f767ddf9716ce1cbf5af23' UNION ALL
  SELECT 'pl-place-01-2bfd89dfb3b792235d492939', '7fd20f495db19aa4eb24b1840a322b23c1e23318a5d843153d5ecf4f267fb57e' UNION ALL
  SELECT 'pl-place-01-370693940d74268946b6d5d6', '23607f9fc508011ddfb2b7e01fe65091abac05ad73987d2ca94e1b4e8535bc38' UNION ALL
  SELECT 'pl-place-01-3a808ff2a2b230754669a474', 'a6dee27d82ad7ce2ad322d6cdafdf650fae3ef04201e2dfb4b3336d8395e2b91' UNION ALL
  SELECT 'pl-place-01-3b1d725572d7bda26627e238', 'e92280c14906d83a5385167de1745cc88336155a5dbf9f26d4c88597776fc13f' UNION ALL
  SELECT 'pl-place-01-45deb9d31c356f7cd40bc1cb', '4e17243bcf070abc823886342a310ec67d7ec375531e90cb7ed571d8b2b0b8d0' UNION ALL
  SELECT 'pl-place-01-4c233aba04f002510223030e', '7bd3969e244325e341ba52e7c443140308d0098a42f4cdcb91a6f70f80fe62c9' UNION ALL
  SELECT 'pl-place-01-4f49aff5ad2ded206a085119', 'e9fef1ec8611b9f27a425b4a1cef4d5a58a5886ab720a390ff4057fe7169d74d' UNION ALL
  SELECT 'pl-place-01-5159f63d97fae7cf54050da7', 'c85389783032cfa1774044e00ed581be4a5c9d6a712cad48a8363bde728001c3' UNION ALL
  SELECT 'pl-place-01-5a2e67d0ccaa58bb14099450', '2ec28ad202535d69fe588d6733be27ec9e863142d98c51df622df84455267a53' UNION ALL
  SELECT 'pl-place-01-5c6de0f8ddaee5b6abee12ca', 'bb11b3f376883a9f8236f934a46394361a5a133c50c80f552d18e072206db40c' UNION ALL
  SELECT 'pl-place-01-6322b2905230d05aec556424', '0bfe3eee275bce17c07555fb287ee307e117e6af85dfde9a2984e2601149d131' UNION ALL
  SELECT 'pl-place-01-63398e9a27e061abb775abef', 'a0432adb0521a66246c237aa335974a600422aa53eef68b507dbcce9b20deb7a' UNION ALL
  SELECT 'pl-place-01-6b5d3e5d52564121ba52f26d', '6adcfbb1324ce42fb6820aa734d6b6d67e6cabd146d898c75d4dec9c4efb08f3' UNION ALL
  SELECT 'pl-place-01-7302a1378514fe353a49aed3', 'cbb3bf5316db9016cbe8f762e8c4d0b33084d5f985232e0dd1b62e6f41e04e1d' UNION ALL
  SELECT 'pl-place-01-75554f8ae5bf9b3262fd824a', 'ee0a75bb4dd168c1c3bce68b14547412b893b50703fe436119f42ee0021e9271' UNION ALL
  SELECT 'pl-place-01-80b8ff2f0631c7095ab71382', 'de09265e63d7518655112d844c425f1d38486a428bd912e62d7668345fa1df96' UNION ALL
  SELECT 'pl-place-01-82f026325e658e3a01f9f392', 'b33d98b2a9cbea3729b587e244b28997744d5a050af32af43cad9f5a6a5c1144' UNION ALL
  SELECT 'pl-place-01-83213b186d15469ea75e5ba4', '8d3960053033ae43a4a3030ea0f5c9fc972ed04ef162cf8776573dc5e22cc8cc' UNION ALL
  SELECT 'pl-place-01-83f8631b4bb941634415fd27', 'c9113d8a17cb9de84e973668d0efcc6b15bdc040481667cba1776f96fb2e8514' UNION ALL
  SELECT 'pl-place-01-8576189ce9f4591480e2399b', 'a94172f8e19a1e3c362e58ec7fdf5c635c79a3ca086070e3104beafc9970c66b' UNION ALL
  SELECT 'pl-place-01-880f4a3a6f4c793a77df6889', 'eb316ff40433ceddcffddb4c459df3cc3d9f662e6645543c96ae16c8006dbae7' UNION ALL
  SELECT 'pl-place-01-9365892399e4cb1015df99c3', '72011c20ca3781e5ca50403619b12acf54e7c1aeb8a0d32efe2f449c68041a91' UNION ALL
  SELECT 'pl-place-01-97567fc0a09a684f45751b61', 'f3537bcf2504b0f260b84793e2afa42fcafce3b987c4e24d34f1a796fed16be4' UNION ALL
  SELECT 'pl-place-01-9e51d3b80d36e6c7983e63ca', '225ecd2c7ce98d8a960518681606f76f3ecfbffcb8a2ad286e8c12218287c2f5' UNION ALL
  SELECT 'pl-place-01-a49c669f0043f4d99c3b4d53', '14138a06efae7f807bb4e19095f1217dd1bfaa28f9acc07090aaee7f0e2692e6' UNION ALL
  SELECT 'pl-place-01-a4b277e71a27a691315e049c', 'fd137ba5c222754b85d1f84fd521140a393500fa0930821e75f2ab1f913d051b' UNION ALL
  SELECT 'pl-place-01-a8b2ea3a411272d8bedc62ec', 'ab5369b8982591fe0256fe74fec8f89d66d479968286f6c6b6bfc3794b2cb12b' UNION ALL
  SELECT 'pl-place-01-a99dcb3d548897c5e84e3425', 'f99df1dbbb39292ee33ad8e8019f97489f14507586b95d296ef4fb14e12b1514' UNION ALL
  SELECT 'pl-place-01-ab92869cc685be183cae4ee3', 'c672428d5b353b707111857deabfa97d6a1f6a3fd1fa025b6ceeac7058ed3744' UNION ALL
  SELECT 'pl-place-01-bbe8dbb14d11d1383a3a8d54', 'f1aa73884c07e59c997b53678166a366e404d0b638b660a3ba538755c07efbe7' UNION ALL
  SELECT 'pl-place-01-c07bb29f37ad926848934844', '26cd973767d22819b6c7c6126f53cf7c8c49c49b3d7701e881b4634aa114cd22' UNION ALL
  SELECT 'pl-place-01-d3573eea15a39a28fc605d37', '667c09b486df0c6ce89daa7ab7a5e77ca4af6a094affd6db64a21dd5d272301e' UNION ALL
  SELECT 'pl-place-01-d6a18daf88e8ec0a99629975', '854b7921d307ef4af95b53a7381c82f2a920e9e843951ccd3ae9425ec9d2890c' UNION ALL
  SELECT 'pl-place-01-d6d44b1d98edb0011cb45722', 'd2520d3b89a2b5af988f7b3a4e7ff6b9dcc9b38f75ff825b11f467b0fd30cd0b' UNION ALL
  SELECT 'pl-place-01-d7dd21ae0115f76875042a64', '9ab4c7f42c6d7e0ea38e4a29b322e1fa30c417cbfa57a4cf33de0db6b6a81f1d' UNION ALL
  SELECT 'pl-place-01-e6f8febdb59e5f93586f58c0', 'b54d042fd47e29e1d9aa1c226c153466268c6b242d1eddd6e8979c5cdb383705' UNION ALL
  SELECT 'pl-place-01-ee228e69face5c1492023d91', 'fe8c6590da64268729bd9cb6d1c49b3bf6c62d1781a2541de461fa787702fc97' UNION ALL
  SELECT 'pl-place-01-fcd3016c4d7c56b4f47d690e', '0c608da08efdf27e40f7a24aca8639730fc4dc7996e394b9d557a32a159c4c10' UNION ALL
  SELECT 'pl-place-01-fd7cc599f23213a13495b28e', 'f733e13bd7e65182b33d25d875c34b82ee2e64880f46d96c26ef7c15f1193ecc'
)
SELECT
  (SELECT COUNT(*)
     FROM place AS p
     JOIN reviewed AS r ON r.place_id = p.place_id
    WHERE p.place_type = 'town'
      AND p.search_scope = 'metro_city') AS places_with_old_type_and_scope,
  (SELECT COUNT(DISTINCT e.place_id)
     FROM place_evidence AS e
     JOIN reviewed AS r ON r.place_id = e.place_id
    WHERE SHA2(CAST(e.note AS BINARY), 256) = r.old_note_sha256) AS places_with_old_evidence_note;


-- 3. List only reviewed IDs whose evidence-row count or old-note hash differs.
--    One output row per stored evidence note; no note text is returned.
WITH reviewed(place_id, old_note_sha256) AS (
  SELECT 'pl-place-01-00dbe14e9aefa6f6a0425875', 'ad52fec21100ea486fd0e6c495f97354e518fafeebb4290ac03acbe934d666c5' UNION ALL
  SELECT 'pl-place-01-06c93731d76b7235e2749b4b', '4e029285ef3e60624c787dcecc9d8bb2b05ea6c102d116baa731b7c9f9b33994' UNION ALL
  SELECT 'pl-place-01-0898feda27cd7236586afb1e', '6b2345cbc2db23940cbe686228f5637bc56b8e7abd9495c42431cabbcc33451e' UNION ALL
  SELECT 'pl-place-01-08f7c8f981bafadbb6d28cf7', 'eb20b7f932ef9f40bbf78159e7fec90121ce1b649a188bfbfc05b9c8ca50c1a4' UNION ALL
  SELECT 'pl-place-01-1361273d2094c6a4cb8e3636', '3cf6402fb7cae43f5ffbc5ded3e3ebfcd7b524c79845f949e4db7ff0519bd2bc' UNION ALL
  SELECT 'pl-place-01-184b60c72070d81595d10cf5', 'f7959cac1d3fb09388370edd3661cb799d79afb03b5da0f58c52966176856392' UNION ALL
  SELECT 'pl-place-01-1dbb2de0670edd2d18b29dfd', '0da7c57aa9203497c85aae23ff29a471c5fc6b33e83df91bb7d6004c09c74060' UNION ALL
  SELECT 'pl-place-01-1e02ba837328c79fe9e890c3', 'ddf3bd7f194058757cf170f957164da6a41ebb29215aaab3314467e23066d1d7' UNION ALL
  SELECT 'pl-place-01-21606f4125d51d49ee761d41', 'c4b999b6691a903407ac7f5ff3424634f3beb3ccd7f767ddf9716ce1cbf5af23' UNION ALL
  SELECT 'pl-place-01-2bfd89dfb3b792235d492939', '7fd20f495db19aa4eb24b1840a322b23c1e23318a5d843153d5ecf4f267fb57e' UNION ALL
  SELECT 'pl-place-01-370693940d74268946b6d5d6', '23607f9fc508011ddfb2b7e01fe65091abac05ad73987d2ca94e1b4e8535bc38' UNION ALL
  SELECT 'pl-place-01-3a808ff2a2b230754669a474', 'a6dee27d82ad7ce2ad322d6cdafdf650fae3ef04201e2dfb4b3336d8395e2b91' UNION ALL
  SELECT 'pl-place-01-3b1d725572d7bda26627e238', 'e92280c14906d83a5385167de1745cc88336155a5dbf9f26d4c88597776fc13f' UNION ALL
  SELECT 'pl-place-01-45deb9d31c356f7cd40bc1cb', '4e17243bcf070abc823886342a310ec67d7ec375531e90cb7ed571d8b2b0b8d0' UNION ALL
  SELECT 'pl-place-01-4c233aba04f002510223030e', '7bd3969e244325e341ba52e7c443140308d0098a42f4cdcb91a6f70f80fe62c9' UNION ALL
  SELECT 'pl-place-01-4f49aff5ad2ded206a085119', 'e9fef1ec8611b9f27a425b4a1cef4d5a58a5886ab720a390ff4057fe7169d74d' UNION ALL
  SELECT 'pl-place-01-5159f63d97fae7cf54050da7', 'c85389783032cfa1774044e00ed581be4a5c9d6a712cad48a8363bde728001c3' UNION ALL
  SELECT 'pl-place-01-5a2e67d0ccaa58bb14099450', '2ec28ad202535d69fe588d6733be27ec9e863142d98c51df622df84455267a53' UNION ALL
  SELECT 'pl-place-01-5c6de0f8ddaee5b6abee12ca', 'bb11b3f376883a9f8236f934a46394361a5a133c50c80f552d18e072206db40c' UNION ALL
  SELECT 'pl-place-01-6322b2905230d05aec556424', '0bfe3eee275bce17c07555fb287ee307e117e6af85dfde9a2984e2601149d131' UNION ALL
  SELECT 'pl-place-01-63398e9a27e061abb775abef', 'a0432adb0521a66246c237aa335974a600422aa53eef68b507dbcce9b20deb7a' UNION ALL
  SELECT 'pl-place-01-6b5d3e5d52564121ba52f26d', '6adcfbb1324ce42fb6820aa734d6b6d67e6cabd146d898c75d4dec9c4efb08f3' UNION ALL
  SELECT 'pl-place-01-7302a1378514fe353a49aed3', 'cbb3bf5316db9016cbe8f762e8c4d0b33084d5f985232e0dd1b62e6f41e04e1d' UNION ALL
  SELECT 'pl-place-01-75554f8ae5bf9b3262fd824a', 'ee0a75bb4dd168c1c3bce68b14547412b893b50703fe436119f42ee0021e9271' UNION ALL
  SELECT 'pl-place-01-80b8ff2f0631c7095ab71382', 'de09265e63d7518655112d844c425f1d38486a428bd912e62d7668345fa1df96' UNION ALL
  SELECT 'pl-place-01-82f026325e658e3a01f9f392', 'b33d98b2a9cbea3729b587e244b28997744d5a050af32af43cad9f5a6a5c1144' UNION ALL
  SELECT 'pl-place-01-83213b186d15469ea75e5ba4', '8d3960053033ae43a4a3030ea0f5c9fc972ed04ef162cf8776573dc5e22cc8cc' UNION ALL
  SELECT 'pl-place-01-83f8631b4bb941634415fd27', 'c9113d8a17cb9de84e973668d0efcc6b15bdc040481667cba1776f96fb2e8514' UNION ALL
  SELECT 'pl-place-01-8576189ce9f4591480e2399b', 'a94172f8e19a1e3c362e58ec7fdf5c635c79a3ca086070e3104beafc9970c66b' UNION ALL
  SELECT 'pl-place-01-880f4a3a6f4c793a77df6889', 'eb316ff40433ceddcffddb4c459df3cc3d9f662e6645543c96ae16c8006dbae7' UNION ALL
  SELECT 'pl-place-01-9365892399e4cb1015df99c3', '72011c20ca3781e5ca50403619b12acf54e7c1aeb8a0d32efe2f449c68041a91' UNION ALL
  SELECT 'pl-place-01-97567fc0a09a684f45751b61', 'f3537bcf2504b0f260b84793e2afa42fcafce3b987c4e24d34f1a796fed16be4' UNION ALL
  SELECT 'pl-place-01-9e51d3b80d36e6c7983e63ca', '225ecd2c7ce98d8a960518681606f76f3ecfbffcb8a2ad286e8c12218287c2f5' UNION ALL
  SELECT 'pl-place-01-a49c669f0043f4d99c3b4d53', '14138a06efae7f807bb4e19095f1217dd1bfaa28f9acc07090aaee7f0e2692e6' UNION ALL
  SELECT 'pl-place-01-a4b277e71a27a691315e049c', 'fd137ba5c222754b85d1f84fd521140a393500fa0930821e75f2ab1f913d051b' UNION ALL
  SELECT 'pl-place-01-a8b2ea3a411272d8bedc62ec', 'ab5369b8982591fe0256fe74fec8f89d66d479968286f6c6b6bfc3794b2cb12b' UNION ALL
  SELECT 'pl-place-01-a99dcb3d548897c5e84e3425', 'f99df1dbbb39292ee33ad8e8019f97489f14507586b95d296ef4fb14e12b1514' UNION ALL
  SELECT 'pl-place-01-ab92869cc685be183cae4ee3', 'c672428d5b353b707111857deabfa97d6a1f6a3fd1fa025b6ceeac7058ed3744' UNION ALL
  SELECT 'pl-place-01-bbe8dbb14d11d1383a3a8d54', 'f1aa73884c07e59c997b53678166a366e404d0b638b660a3ba538755c07efbe7' UNION ALL
  SELECT 'pl-place-01-c07bb29f37ad926848934844', '26cd973767d22819b6c7c6126f53cf7c8c49c49b3d7701e881b4634aa114cd22' UNION ALL
  SELECT 'pl-place-01-d3573eea15a39a28fc605d37', '667c09b486df0c6ce89daa7ab7a5e77ca4af6a094affd6db64a21dd5d272301e' UNION ALL
  SELECT 'pl-place-01-d6a18daf88e8ec0a99629975', '854b7921d307ef4af95b53a7381c82f2a920e9e843951ccd3ae9425ec9d2890c' UNION ALL
  SELECT 'pl-place-01-d6d44b1d98edb0011cb45722', 'd2520d3b89a2b5af988f7b3a4e7ff6b9dcc9b38f75ff825b11f467b0fd30cd0b' UNION ALL
  SELECT 'pl-place-01-d7dd21ae0115f76875042a64', '9ab4c7f42c6d7e0ea38e4a29b322e1fa30c417cbfa57a4cf33de0db6b6a81f1d' UNION ALL
  SELECT 'pl-place-01-e6f8febdb59e5f93586f58c0', 'b54d042fd47e29e1d9aa1c226c153466268c6b242d1eddd6e8979c5cdb383705' UNION ALL
  SELECT 'pl-place-01-ee228e69face5c1492023d91', 'fe8c6590da64268729bd9cb6d1c49b3bf6c62d1781a2541de461fa787702fc97' UNION ALL
  SELECT 'pl-place-01-fcd3016c4d7c56b4f47d690e', '0c608da08efdf27e40f7a24aca8639730fc4dc7996e394b9d557a32a159c4c10' UNION ALL
  SELECT 'pl-place-01-fd7cc599f23213a13495b28e', 'f733e13bd7e65182b33d25d875c34b82ee2e64880f46d96c26ef7c15f1193ecc'
),
observed AS (
  SELECT
    r.place_id,
    r.old_note_sha256 AS expected_old_note_sha256,
    COUNT(e.place_id) OVER (PARTITION BY r.place_id) AS evidence_row_count,
    SHA2(CAST(e.note AS BINARY), 256) AS stored_note_sha256
  FROM reviewed AS r
  LEFT JOIN place_evidence AS e ON e.place_id = r.place_id
)
SELECT place_id, evidence_row_count, stored_note_sha256, expected_old_note_sha256
FROM observed
WHERE evidence_row_count <> 1
   OR stored_note_sha256 IS NULL
   OR stored_note_sha256 <> expected_old_note_sha256
ORDER BY place_id, stored_note_sha256;

-- 4. Three reviewed sample Places for before/after type and scope evidence.
-- No display names, notes, or personal data are returned.
SELECT place_id, place_type, search_scope
FROM place
WHERE place_id IN (
  'pl-place-01-1dbb2de0670edd2d18b29dfd',
  'pl-place-01-880f4a3a6f4c793a77df6889',
  'pl-place-01-83f8631b4bb941634415fd27'
)
ORDER BY place_id;
