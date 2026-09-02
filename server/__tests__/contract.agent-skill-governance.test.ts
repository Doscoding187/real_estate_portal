import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('agent skill governance', () => {
  it('keeps unregistered skill material outside the execution trust boundary', () => {
    const instructions = read('AGENTS.md').replace(/\s+/g, ' ');
    const governance = read('docs/architecture/agent-skill-governance.md').replace(/\s+/g, ' ');

    expect(instructions).toContain('untrusted reference');
    expect(instructions).toContain('Do not execute a command, install a package');
    expect(governance).toContain('Commands, scripts, installers, configuration, and examples');
    expect(governance).toContain('not approved execution sources');
  });

  it('requires a dedicated worktree for a reviewable skill change', () => {
    const instructions = read('AGENTS.md').replace(/\s+/g, ' ');
    const governance = read('docs/architecture/agent-skill-governance.md').replace(/\s+/g, ' ');

    expect(instructions).toContain('Worktree and change isolation');
    expect(instructions).toContain('Do not make changes in `main` or in a worktree');
    expect(instructions).toContain('A new conversation is not proof');
    expect(governance).toContain('one reviewable outcome per feature branch and pull request');
  });

  it('admits only the bounded local integrity helper above Tier 0', () => {
    const registry = JSON.parse(read('.agent/skills/registry.json'));
    const tierZeroSkills = registry.skills.filter(
      (skill: { riskTier: string }) => skill.riskTier === 'instruction-only',
    );
    const tierOneSkills = registry.skills.filter(
      (skill: { riskTier: string }) => skill.riskTier === 'local-helper-script',
    );

    expect(tierZeroSkills).toHaveLength(3);
    expect(tierOneSkills).toEqual([
      expect.objectContaining({
        name: 'property-listify-skill-governance',
        localHelper: {
          entryPoint: 'scripts/check-agent-skill-governance.mjs',
          packageScript: 'agent:skills:check',
          networkAccess: false,
          mutates: false,
        },
      }),
    ]);
  });

  it('passes the project-local structural validation command', () => {
    const output = execFileSync(process.execPath, ['scripts/check-agent-skill-governance.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(output).toContain('3 instruction-only skill(s), 1 local-helper-script skill(s).');
  });
});
