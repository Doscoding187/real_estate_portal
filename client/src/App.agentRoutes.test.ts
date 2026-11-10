import { describe, expect, it } from 'vitest';
import source from './App.tsx?raw';

function routeBlock(path: string) {
  const start = source.indexOf(`<Route path="${path}">`);
  expect(start).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf('</Route>', start));
}

describe('agent authoring routes are behind the plan gate', () => {
  it.each([
    '/listings/create',
    '/agent/land/create',
    '/agent/commercial/create',
    '/agent/commercial',
    '/agent/commercial/office/create',
  ])('%s is wrapped in AgentListingAccessGate', path => {
    expect(routeBlock(path)).toContain('<AgentListingAccessGate>');
  });
});
