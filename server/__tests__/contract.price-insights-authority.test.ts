import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('price insights authority boundary', () => {
  it('uses canonical column names and does not hide schema errors as empty data', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/priceInsightsRouter.ts'), 'utf8');

    expect(source).toContain('WHERE province_id =');
    expect(source).toContain('WHERE city_id =');
    expect(source).toContain("code: 'PRECONDITION_FAILED'");
    expect(source).not.toContain('WHERE provinceId =');
    expect(source).not.toContain('WHERE cityId =');
    expect(source).not.toContain('Return empty structure on error');
    expect(source).not.toContain("console.error('Error fetching heatmap data:', error);\n        return []");
  });
});
