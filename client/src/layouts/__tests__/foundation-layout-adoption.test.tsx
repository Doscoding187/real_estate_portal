import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('FPE-S1A bounded adoption', () => {
  it('adopts the main-landmark contract only in the approved public, prospect, and fallback consumers', () => {
    for (const relativePath of [
      'client/src/pages/Home.tsx',
      'client/src/pages/Favorites.tsx',
      'client/src/pages/NotFound.tsx',
    ]) {
      expect(readRepoFile(relativePath)).toContain('PageFrame');
    }

    expect(readRepoFile('client/src/layouts/HomeLayout.tsx')).not.toContain('PageFrame');
    expect(readRepoFile('client/src/components/ProspectLayout.tsx')).not.toContain('PageFrame');
  });
});
