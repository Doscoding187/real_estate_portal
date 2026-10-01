import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('admin review route', () => {
  it('keeps the direct review URL behind the super-admin boundary', () => {
    const app = readRepoFile('client/src/App.tsx');

    expect(app).toContain('<Route path="/admin/review/:id">');
    expect(app).toContain('<RequireRole role="super_admin" unauthenticatedAuthEntry="signin">');
    expect(app).toContain('<AdminPropertyReview />');
    expect(app).not.toContain('<Route path="/admin/review/:id" component={AdminPropertyReview} />');
  });
});
