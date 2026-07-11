import { describe, expect, it } from 'vitest';
import { isPublicDeveloperProfilePath } from '@/lib/developerRouteBoundary';

describe('isPublicDeveloperProfilePath', () => {
  it('keeps one-segment developer brand URLs public', () => {
    expect(isPublicDeveloperProfilePath('/developer/acme-homes')).toBe(true);
    expect(isPublicDeveloperProfilePath('/developer/acme-homes/')).toBe(true);
  });

  it('reserves developer operating-system routes for authenticated users', () => {
    expect(isPublicDeveloperProfilePath('/developer/dashboard')).toBe(false);
    expect(isPublicDeveloperProfilePath('/developer/leads')).toBe(false);
    expect(isPublicDeveloperProfilePath('/developer/create-development')).toBe(false);
    expect(isPublicDeveloperProfilePath('/developer/acme-homes/edit')).toBe(false);
  });
});
