import { promises as fs } from 'node:fs';
import path from 'node:path';

const REGISTRY_PATH = path.resolve('.agent/skills/registry.json');
const ALLOWED_RISK_TIERS = new Set(['instruction-only', 'local-helper-script']);
const REQUIRED_CAPABILITY_KEYS = ['networkAccess', 'mcp', 'hooks', 'persistentState'];

function fail(message) {
  throw new Error(message);
}

function parseFrontmatter(contents, skillPath) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(`${skillPath}: missing YAML frontmatter.`);
  }

  return match[1];
}

function readLine(frontmatter, prefix) {
  const line = frontmatter.split(/\r?\n/).find(candidate => candidate.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

function readFrontmatterValue(frontmatter, key) {
  return readLine(frontmatter, `${key}:`);
}

function readMetadataValue(frontmatter, key) {
  return readLine(frontmatter, `  ${key}:`);
}

function normalizeTools(value) {
  return value
    .split(',')
    .map(tool => tool.trim())
    .filter(Boolean);
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(`${label} must use a valid YYYY-MM-DD date.`);
  }
}

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFiles(entryPath);
      files.push(...nested.map(file => path.join(entry.name, file)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entry.name);
    }
  }

  return files;
}

function assertRegistryPath(relativePath, name) {
  if (
    typeof relativePath !== 'string' ||
    path.isAbsolute(relativePath) ||
    !relativePath.startsWith('.agent/skills/') ||
    relativePath.split('/').includes('..') ||
    path.basename(relativePath) !== 'SKILL.md'
  ) {
    fail(`${name}: registry path must be a project-local .agent/skills/*/SKILL.md path.`);
  }
}

function assertProjectLocalHelperPath(relativePath, name) {
  if (
    typeof relativePath !== 'string' ||
    path.isAbsolute(relativePath) ||
    !relativePath.startsWith('scripts/') ||
    relativePath.split('/').includes('..')
  ) {
    fail(`${name}: local helper must be a project-local scripts/* path.`);
  }
}

async function validateLocalHelper(entry, name) {
  const helper = entry.localHelper;
  if (!helper || typeof helper !== 'object') {
    fail(`${name}: local-helper-script entries require a localHelper record.`);
  }
  assertProjectLocalHelperPath(helper.entryPoint, name);
  if (
    helper.packageScript !== 'agent:skills:check' ||
    helper.networkAccess !== false ||
    helper.mutates !== false
  ) {
    fail(`${name}: local helper must declare the read-only agent:skills:check command.`);
  }
  if (!entry.allowedTools.includes('Bash')) {
    fail(`${name}: local-helper-script entries must declare Bash in allowedTools.`);
  }
  await fs.access(path.resolve(helper.entryPoint));

  const packageJson = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8'));
  if (packageJson.scripts?.[helper.packageScript] !== `node ${helper.entryPoint}`) {
    fail(`${name}: package script must invoke only its registered local helper entry point.`);
  }
}

async function validateEntry(entry, seenNames) {
  const { name, path: relativePath } = entry;
  if (typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name)) {
    fail('Each governed skill must have a lowercase hyphenated name.');
  }
  if (seenNames.has(name)) {
    fail(`${name}: duplicate governed-skill registry entry.`);
  }
  seenNames.add(name);

  assertRegistryPath(relativePath, name);
  if (entry.owner !== 'property-listify' || entry.status !== 'active') {
    fail(`${name}: owner must be property-listify and status must be active.`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(entry.version || '')) {
    fail(`${name}: version must be semantic-version formatted.`);
  }
  if (!ALLOWED_RISK_TIERS.has(entry.riskTier)) {
    fail(`${name}: unsupported risk tier ${entry.riskTier}.`);
  }
  if (!Array.isArray(entry.allowedTools) || entry.allowedTools.length === 0) {
    fail(`${name}: allowedTools must be a non-empty array.`);
  }
  if (!entry.capabilities || typeof entry.capabilities !== 'object') {
    fail(`${name}: missing capabilities object.`);
  }
  for (const key of REQUIRED_CAPABILITY_KEYS) {
    if (entry.capabilities[key] !== false) {
      fail(`${name}: governed skills must set capabilities.${key} to false.`);
    }
  }
  if (
    !entry.provenance ||
    entry.provenance.kind !== 'original' ||
    entry.provenance.copiedThirdPartyTextOrCode !== false
  ) {
    fail(
      `${name}: initial governed skills must be original and declare no copied third-party text or code.`,
    );
  }
  assertDate(entry.reviewedAt, `${name}: reviewedAt`);
  assertDate(entry.nextReview, `${name}: nextReview`);
  if (entry.nextReview < entry.reviewedAt) {
    fail(`${name}: nextReview must not precede reviewedAt.`);
  }

  const absolutePath = path.resolve(relativePath);
  const skillDirectory = path.dirname(absolutePath);
  const files = await listFiles(skillDirectory);
  if (files.length !== 1 || files[0] !== 'SKILL.md') {
    fail(
      `${name}: governed skill folders may contain only SKILL.md; register a separate reviewed helper before adding runtime or reference files.`,
    );
  }

  if (entry.riskTier === 'local-helper-script') {
    await validateLocalHelper(entry, name);
  } else if (entry.localHelper !== undefined) {
    fail(`${name}: instruction-only entries may not declare a local helper.`);
  }

  const contents = await fs.readFile(absolutePath, 'utf8');
  const frontmatter = parseFrontmatter(contents, relativePath);
  const actualName = readFrontmatterValue(frontmatter, 'name');
  const description = readFrontmatterValue(frontmatter, 'description');
  const allowedTools = readFrontmatterValue(frontmatter, 'allowed-tools');
  const metadata = {
    owner: readMetadataValue(frontmatter, 'owner'),
    version: readMetadataValue(frontmatter, 'version'),
    status: readMetadataValue(frontmatter, 'status'),
    riskTier: readMetadataValue(frontmatter, 'risk_tier'),
    provenance: readMetadataValue(frontmatter, 'provenance'),
  };

  if (actualName !== name || !description || !allowedTools) {
    fail(`${name}: SKILL.md must declare matching name, a description, and allowed-tools.`);
  }
  if (JSON.stringify(normalizeTools(allowedTools)) !== JSON.stringify(entry.allowedTools)) {
    fail(`${name}: SKILL.md allowed-tools must match the registry.`);
  }
  if (
    metadata.owner !== entry.owner ||
    metadata.version !== entry.version ||
    metadata.status !== entry.status ||
    metadata.riskTier !== entry.riskTier ||
    metadata.provenance !== entry.provenance.kind
  ) {
    fail(`${name}: SKILL.md metadata must match the registry.`);
  }
}

async function main() {
  const rawRegistry = await fs.readFile(REGISTRY_PATH, 'utf8');
  const registry = JSON.parse(rawRegistry);
  if (
    registry.schemaVersion !== 1 ||
    !Array.isArray(registry.skills) ||
    registry.skills.length === 0
  ) {
    fail('Agent-skill registry must use schemaVersion 1 and contain governed skills.');
  }
  if (typeof registry.governanceDocument !== 'string' || !registry.governanceDocument) {
    fail('Agent-skill registry must identify its governance document.');
  }
  await fs.access(path.resolve(registry.governanceDocument));

  const seenNames = new Set();
  for (const entry of registry.skills) {
    await validateEntry(entry, seenNames);
  }

  const tierCounts = registry.skills.reduce((counts, skill) => {
    counts[skill.riskTier] = (counts[skill.riskTier] || 0) + 1;
    return counts;
  }, {});
  console.log(
    `Agent skill governance check passed: ${tierCounts['instruction-only'] || 0} instruction-only skill(s), ${tierCounts['local-helper-script'] || 0} local-helper-script skill(s).`,
  );
}

main().catch(error => {
  console.error(`Agent skill governance check failed: ${error.message}`);
  process.exitCode = 1;
});
