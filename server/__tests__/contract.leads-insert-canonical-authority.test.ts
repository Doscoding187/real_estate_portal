import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { leads } from '../../drizzle/schema';

const CANONICAL_LEAD_COLUMNS = new Set(Object.keys(leads));

const INSERT_LITERAL_SITES: Array<{ file: string; label: string }> = [
  { file: 'server/services/demandEngineService.ts', label: 'demand engine campaign capture' },
  { file: 'server/services/leadService.ts', label: 'development lead service' },
];

const RETIRED_GOVERNANCE_KEYS = [
  'ownerType',
  'ownerId',
  'assignedAgentId',
  'visibilityScope',
  'governanceMode',
];

function extractTopLevelKeys(block: string): string[] {
  const keys: string[] = [];
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('...')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function collectInsertLiteralKeys(relativePath: string): Map<string, string[]> {
  const source = readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
  const found = new Map<string, string[]>();
  const pattern = /insert\(leads\)\s*\.values\(\{([\s\S]*?)\n\s*\}\)/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(source)) !== null) {
    index += 1;
    found.set(`${path.basename(relativePath)}#${index}`, extractTopLevelKeys(match[1]));
  }
  return found;
}

describe('canonical leads insert authority', () => {
  it('exposes the canonical leads columns used for insert validation', () => {
    expect(CANONICAL_LEAD_COLUMNS.has('agentId')).toBe(true);
    expect(CANONICAL_LEAD_COLUMNS.has('assignedTo')).toBe(true);
    expect(CANONICAL_LEAD_COLUMNS.has('ownerType')).toBe(false);
    expect(CANONICAL_LEAD_COLUMNS.has('visibilityScope')).toBe(false);
    expect(CANONICAL_LEAD_COLUMNS.has('governanceMode')).toBe(false);
  });

  it('only writes canonical columns in every leads insert literal', () => {
    for (const site of INSERT_LITERAL_SITES) {
      const literals = collectInsertLiteralKeys(site.file);
      expect(literals.size, `${site.label} should contain insert literals`).toBeGreaterThan(0);
      for (const [siteId, keys] of literals) {
        const phantom = keys.filter(key => !CANONICAL_LEAD_COLUMNS.has(key));
        expect(phantom, `${siteId} writes non-canonical lead columns`).toEqual([]);
      }
    }
  });

  it('keeps retired governance keys out of every leads insert literal', () => {
    for (const site of INSERT_LITERAL_SITES) {
      for (const [, keys] of collectInsertLiteralKeys(site.file)) {
        for (const retiredKey of RETIRED_GOVERNANCE_KEYS) {
          expect(keys, `${site.file} must not write ${retiredKey}`).not.toContain(retiredKey);
        }
      }
    }
  });
});
