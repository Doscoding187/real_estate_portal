import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const GOVERNANCE_CHECK = resolve(ROOT, 'scripts/check-agent-skill-governance.mjs');

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function createFixture(reviewedAt = '2026-09-02'): string {
  const root = mkdtempSync(join(tmpdir(), 'property-listify-agent-skill-governance-'));
  const skillDirectory = join(root, '.agent', 'skills', 'fixture-skill');
  mkdirSync(skillDirectory, { recursive: true });
  mkdirSync(join(root, 'docs', 'architecture'), { recursive: true });
  writeFileSync(join(root, 'docs', 'architecture', 'agent-skill-governance.md'), '# Fixture\n');
  writeFileSync(
    join(skillDirectory, 'SKILL.md'),
    `---\nname: fixture-skill\ndescription: Fixture governed skill.\nallowed-tools: Read\nmetadata:\n  owner: property-listify\n  version: 0.1.0\n  status: active\n  risk_tier: instruction-only\n  provenance: original\n---\n\n# Fixture\n`,
  );
  writeFileSync(
    join(root, '.agent', 'skills', 'registry.json'),
    JSON.stringify({
      schemaVersion: 1,
      governanceDocument: 'docs/architecture/agent-skill-governance.md',
      skills: [
        {
          name: 'fixture-skill',
          path: '.agent/skills/fixture-skill/SKILL.md',
          owner: 'property-listify',
          version: '0.1.0',
          status: 'active',
          riskTier: 'instruction-only',
          allowedTools: ['Read'],
          capabilities: {
            networkAccess: false,
            mcp: false,
            hooks: false,
            persistentState: false,
          },
          provenance: {
            kind: 'original',
            copiedThirdPartyTextOrCode: false,
          },
          reviewedAt,
          nextReview: '2026-12-01',
        },
      ],
    }),
  );

  return root;
}

function runGovernanceCheck(cwd: string) {
  return spawnSync(process.execPath, [GOVERNANCE_CHECK], {
    cwd,
    encoding: 'utf8',
  });
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

  it('rejects non-calendar registry dates instead of normalizing them', () => {
    const fixture = createFixture('2026-09-31');

    try {
      const result = runGovernanceCheck(fixture);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('reviewedAt must use a valid YYYY-MM-DD date.');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('rejects a governed skill path that traverses a symbolic link', () => {
    const fixture = createFixture();
    const externalSkillDirectory = mkdtempSync(join(tmpdir(), 'property-listify-external-skill-'));
    const linkedSkillDirectory = join(fixture, '.agent', 'skills', 'fixture-skill');

    try {
      writeFileSync(
        join(externalSkillDirectory, 'SKILL.md'),
        readFileSync(join(linkedSkillDirectory, 'SKILL.md')),
      );
      rmSync(linkedSkillDirectory, { recursive: true, force: true });
      symlinkSync(externalSkillDirectory, linkedSkillDirectory, 'dir');

      const result = runGovernanceCheck(fixture);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('governed skill path may not traverse a symbolic link.');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
      rmSync(externalSkillDirectory, { recursive: true, force: true });
    }
  });
});
