import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadPlaceScopeCorrectionPackage,
  PLACE_SCOPE_CORRECTION_DIGEST,
  PLACE_SCOPE_CORRECTION_EXPECTED,
  PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST,
  PLACE_SCOPE_CORRECTION_VERSION,
} from '../dataAdapters/placeScopeCorrection';

const ROOT = process.cwd();
const PACKAGE_DIR = 'data/gauteng-city-scope-correction-v0.1';

describe('Gauteng city-scope correction package', () => {
  it('loads a digest-verified, self-consistent correction and relationship package', () => {
    const pkg = loadPlaceScopeCorrectionPackage(ROOT);
    expect(pkg.manifest.correction_version).toBe(PLACE_SCOPE_CORRECTION_VERSION);
    expect(pkg.manifest.package_digest).toBe(PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST);
    expect(pkg.corrections).toHaveLength(PLACE_SCOPE_CORRECTION_EXPECTED.place_corrections);
    expect(pkg.relationships).toHaveLength(PLACE_SCOPE_CORRECTION_EXPECTED.settlement_within_edges);
    expect(PLACE_SCOPE_CORRECTION_DIGEST).toMatch(/^[a-f0-9]{64}$/);

    expect(pkg.corrections.filter(c => c.target_identity.place_type === 'suburb')).toHaveLength(
      PLACE_SCOPE_CORRECTION_EXPECTED.target_type_suburb,
    );
    expect(pkg.corrections.filter(c => c.target_identity.place_type === 'locality')).toHaveLength(
      PLACE_SCOPE_CORRECTION_EXPECTED.target_type_locality,
    );
    expect(pkg.corrections.filter(c => c.edge_present)).toHaveLength(39);
    expect(pkg.corrections.filter(c => !c.edge_present)).toHaveLength(9);

    const correctionIds = new Set(pkg.corrections.map(c => c.place_id));
    const retainedIds = new Set(pkg.manifest.retained_place_ids);
    const heldIds = new Set(pkg.manifest.held_place_ids);
    const parentIds = new Set(pkg.manifest.parent_place_ids);
    expect(parentIds.size).toBe(PLACE_SCOPE_CORRECTION_EXPECTED.parents);
    expect(retainedIds.size).toBe(PLACE_SCOPE_CORRECTION_EXPECTED.retained_places);
    expect(heldIds.size).toBe(PLACE_SCOPE_CORRECTION_EXPECTED.held_places);
    expect([...parentIds].every(id => retainedIds.has(id))).toBe(true);
    expect([...correctionIds].some(id => retainedIds.has(id) || heldIds.has(id))).toBe(false);

    const edgeKeys = new Set<string>();
    const childIds = new Set<string>();
    for (const edge of pkg.relationships) {
      expect(edge.relationship_type).toBe('settlement_within');
      expect(edge.search_scope_authorized).toBe(0);
      expect(edge.child_place_id).not.toBe(edge.parent_place_id);
      expect(parentIds.has(edge.parent_place_id)).toBe(true);
      expect(childIds.has(edge.child_place_id)).toBe(false);
      childIds.add(edge.child_place_id);
      edgeKeys.add(
        `${edge.child_place_id}\u0000${edge.parent_place_id}\u0000${edge.relationship_type}`,
      );
      if (correctionIds.has(edge.child_place_id)) {
        expect(edge.child_disposition).toBe('demoted_scope');
      } else {
        expect(edge.child_disposition).toBe('existing_locality');
      }
    }
    expect(edgeKeys.size).toBe(PLACE_SCOPE_CORRECTION_EXPECTED.settlement_within_edges);
    expect(pkg.relationships.filter(e => e.child_disposition === 'existing_locality')).toHaveLength(
      PLACE_SCOPE_CORRECTION_EXPECTED.existing_locality_edges,
    );
    expect(pkg.relationships.filter(e => e.child_disposition === 'demoted_scope')).toHaveLength(
      PLACE_SCOPE_CORRECTION_EXPECTED.demoted_scope_edges,
    );
    expect(pkg.relationships.filter(e => e.membership_confidence === 'high')).toHaveLength(
      PLACE_SCOPE_CORRECTION_EXPECTED.high_confidence_edges,
    );
    expect(pkg.relationships.filter(e => e.membership_confidence === 'medium')).toHaveLength(
      PLACE_SCOPE_CORRECTION_EXPECTED.medium_confidence_edges,
    );
  });

  it('refuses artifact digest drift', () => {
    const root = mkdtempSync(join(tmpdir(), 'place-scope-correction-'));
    try {
      cpSync(join(ROOT, PACKAGE_DIR), join(root, PACKAGE_DIR), { recursive: true });
      const artifact = join(root, PACKAGE_DIR, 'place_corrections.jsonl');
      writeFileSync(artifact, `${readFileSync(artifact, 'utf8')}\n`, 'utf8');
      expect(() => loadPlaceScopeCorrectionPackage(root)).toThrow(
        'artifact place_corrections.jsonl digest drift',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses manifest content drift', () => {
    const root = mkdtempSync(join(tmpdir(), 'place-scope-correction-'));
    try {
      cpSync(join(ROOT, PACKAGE_DIR), join(root, PACKAGE_DIR), { recursive: true });
      const manifestPath = join(root, PACKAGE_DIR, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        counts: { place_corrections: number };
      };
      manifest.counts.place_corrections = 47;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      expect(() => loadPlaceScopeCorrectionPackage(root)).toThrow('manifest content digest drift');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
