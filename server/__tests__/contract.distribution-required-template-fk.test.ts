import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('distribution required-template foreign key authority', () => {
  it('prevents required-template deletion from cascading into deal-document status', () => {
    const migration = readFileSync(
      path.resolve(
        process.cwd(),
        'server/migrations/0141_distribution_deal_required_document_fk_restrict.sql',
      ),
      'utf8',
    );
    const schema = readFileSync(
      path.resolve(process.cwd(), 'drizzle/schema/distribution.ts'),
      'utf8',
    );

    expect(migration).toContain(
      'DROP FOREIGN KEY `fk_distribution_deal_documents_development_required_d_75b0d588`',
    );
    expect(migration).toMatch(
      /ADD CONSTRAINT `fk_distribution_deal_documents_required_document_restrict`[\s\S]*FOREIGN KEY \(`development_required_document_id`\)[\s\S]*REFERENCES `development_required_documents`\(`id`\)[\s\S]*ON DELETE RESTRICT[\s\S]*ON UPDATE NO ACTION;/,
    );
    expect(schema).toMatch(
      /developmentRequiredDocumentId: int\('development_required_document_id'\)\s*\.notNull\(\)\s*\.references\(\(\) => developmentRequiredDocuments\.id, \{ onDelete: 'restrict' \}\)/,
    );
  });
});
