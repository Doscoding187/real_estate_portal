import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as schema from '../../drizzle/schema';
import { normalizedDesiredSchema } from '../_core/databaseAuthority/schemaCongruency';

const approved = {
  '0091_transactional_email_deliveries.sql':
    'f449f6485d7bc3bdbf53b83988cc9d92b1fa844a7f3079cc12dee5bdabcef813',
  '0092_transactional_email_attempts.sql':
    '74217052481a7ad26dfddf4ac0f66e9b0c93e4c9dfdf9e20818b2ce45b2cc927',
  '0093_user_onboarding_state_primary_key.sql':
    'fec12311f637e143f36d540e1faf07155c2035fdfeaa159466b14817dc990882',
  '0094_content_topics_primary_key.sql':
    '0645a178f556e24fa170d41b07a8ac73cff4e9404beedf1660a2bf54e72b4124',
};

describe('B08 integration preserves established objects without extending historical approval', () => {
  it('keeps the historical approval revoked and distinct from the current model', () => {
    const registration = JSON.parse(
      readFileSync('docs/database-authority/disposable-rehearsal-authorization.json', 'utf8'),
    );
    const manifest = JSON.parse(readFileSync('server/migrations/manifest.json', 'utf8'));
    expect(registration.status).toBe('revoked');
    expect(registration.expectedHead).toBe('0094_content_topics_primary_key.sql');
    expect(registration.manifestDigest).toBe(
      '93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc',
    );
    expect(registration.modelDigest).toBe(
      'a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9',
    );
    expect(manifest.expectedHead).not.toBe(registration.expectedHead);
    expect(normalizedDesiredSchema(schema).digest).not.toBe(registration.modelDigest);
  });
  it('preserves the four established migration byte identities and lineage', () => {
    const manifest = JSON.parse(readFileSync('server/migrations/manifest.json', 'utf8'));
    let parent = '0090_retire_disconnected_boost_campaigns.sql';
    for (const [filename, checksum] of Object.entries(approved)) {
      expect(
        createHash('sha256')
          .update(readFileSync(`server/migrations/${filename}`))
          .digest('hex'),
      ).toBe(checksum);
      const entry = manifest.migrations.find(
        (item: { filename: string }) => item.filename === filename,
      );
      expect(entry).toMatchObject({ checksum, parent });
      expect(entry.parentChecksum).toBe(
        manifest.migrations.find((item: { filename: string }) => item.filename === parent).checksum,
      );
      parent = filename;
    }
  });

  it('integrates email identity, lease indexes and restrictive relationships without sending', () => {
    const desired = normalizedDesiredSchema(schema);
    const deliveries = desired.tables.find(t => t.name === 'transactional_email_deliveries')!;
    const attempts = desired.tables.find(t => t.name === 'transactional_email_attempts')!;
    expect(deliveries.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unique: true, columns: ['delivery_key'] }),
        expect.objectContaining({ columns: ['state', 'next_attempt_at'] }),
        expect.objectContaining({ columns: ['state', 'claim_expires_at'] }),
      ]),
    );
    expect(attempts.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unique: true, columns: ['delivery_id', 'attempt_number'] }),
        expect.objectContaining({ unique: true, columns: ['claim_token'] }),
      ]),
    );
    expect(attempts.foreignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referencedTable: 'transactional_email_deliveries',
          onDelete: 'restrict',
        }),
      ]),
    );
    expect(deliveries.foreignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ referencedTable: 'users', onDelete: 'restrict' }),
      ]),
    );
    for (const table of [deliveries, attempts]) {
      expect(
        table.columns.find(c => c.name === (table === deliveries ? 'created_at' : 'claimed_at'))
          ?.type,
      ).toBe('timestamp(6)');
    }
    expect(desired.tables.find(t => t.name === 'user_onboarding_state')?.indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'PRIMARY', columns: ['user_id'] })]),
    );
    expect(desired.tables.find(t => t.name === 'content_topics')?.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'PRIMARY', columns: ['content_id', 'topic_id'] }),
      ]),
    );
  });
});
