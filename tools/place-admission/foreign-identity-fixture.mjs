import { withTransaction } from '../../server/_core/databaseAuthority/dataAdapters/common.ts';

/** Called only after the proof has established its exact disposable target. */
export async function buildForeignIdentityFixture(connection, placeCount) {
  if (!Number.isSafeInteger(placeCount) || placeCount < 1) {
    throw new Error('Foreign identity fixture requires a positive integer count');
  }
  // A durable commit for each row would require thousands of fsyncs. One
  // transaction also prevents a failed fixture from replacing earlier evidence.
  await withTransaction(connection, async () => {
    for (const table of [
      'place_external_mapping',
      'place_evidence',
      'place_relationship',
      'place_name',
      'place',
    ]) {
      await connection.query(`DELETE FROM \`${table}\``);
    }
    for (let i = 0; i < placeCount; i++) {
      await connection.query(
        `INSERT INTO \`place\` (place_id, place_type, place_classification, verification_status,
           lifecycle_status, publication_eligible, search_eligible) VALUES (?,?,?,?,?,?,?)`,
        [
          `pl-place-01-${String(i).padStart(24, '0')}`,
          'locality',
          'statutory',
          'verified',
          'active',
          1,
          1,
        ],
      );
    }
  });
}
