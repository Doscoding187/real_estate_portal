import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const skillPath = resolve(
  root,
  '.agent/skills/property-listify-database-authority/SKILL.md',
);

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('Property Listify Database Authority skill contract', () => {
  it('is a thin, correctly activated operating guide', () => {
    expect(existsSync(skillPath)).toBe(true);

    const skill = read('.agent/skills/property-listify-database-authority/SKILL.md');
    expect(skill).toMatch(
      /^---\nname: property-listify-database-authority\ndescription: [^\n]+\n/m,
    );
    expect(skill).toContain('schema and migration work');
    expect(skill).toContain('missing tables or columns');
    expect(skill).toContain('database-backed runtime queries');
    expect(skill).toContain('seeds and fixtures');
    expect(skill).toContain('local database setup');
    expect(skill).toContain('browser validation requiring seeded data');
    expect(skill).toContain('Do not use for frontend-only');

    expect(skill).toContain(
      'docs/database-authority/00-database-authority-agent-entry.md',
    );
    expect(skill).toContain('docs/database-authority/authority-manifest.json');
    expect(skill).toContain('pnpm db:authority:status');
    for (const classification of [
      'Database-independent work',
      'Local-data workflow',
      'Database consumer work',
      'Schema-authority work',
    ]) {
      expect(skill).toContain(classification);
    }

    expect(skill).toContain('Repository-native authority always wins.');
    expect(skill).toContain('Archived migrations are historical evidence only.');
    expect(skill).toContain('Do not read the whole repository');
    expect(skill).toContain('`db:push`');
    expect(skill).toContain('manual DDL');
    expect(skill).toContain('sanitized target classification');
  });

  it('keeps scenario guidance bounded and excludes copied database authority', () => {
    const skill = read('.agent/skills/property-listify-database-authority/SKILL.md');
    expect(skill).toContain('Do not initialize or bootstrap a database.');
    expect(skill).toContain('pnpm db:authority:bootstrap:local');
    expect(skill).toContain('Repair a stale consumer');
    expect(skill).toContain('dedicated database-authority branch/worktree');
    expect(skill).toContain('Railway, or TiDB target');
    expect(skill).toContain('Generic PostgreSQL, Prisma');
    expect(skill).not.toMatch(/(?:mysql|postgres(?:ql)?):\/\//i);
    expect(skill).not.toMatch(/password\s*=/i);
    expect(skill).not.toMatch(/\b(?:CREATE|ALTER|INSERT|DROP)\s+TABLE\b/i);
    expect(skill).not.toMatch(/\b(?:varchar|bigint|tinyint)\s*\(/i);
  });

  it('registers the skill without displacing repository authority', () => {
    const architect = read('.agent/agents/database-architect.md');
    const architecture = read('.agent/ARCHITECTURE.md');
    const agents = read('AGENTS.md');

    expect(architect).toContain('property-listify-database-authority');
    expect(architecture).toContain('property-listify-database-authority');
    expect(architecture).toContain('## 🧠 Skills (41)');
    expect(architecture).toContain('database-design and prisma-expert (generic toolkit skills)');
    expect(agents).toContain('.agent/skills/property-listify-database-authority/SKILL.md');
    expect(agents).toContain('docs/database-authority/00-database-authority-agent-entry.md');
    expect(agents).toContain('pnpm db:authority:status');
    expect(agents).toContain('The skill is an operating guide only; repository');
  });
});
