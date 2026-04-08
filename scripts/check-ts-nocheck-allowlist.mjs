import { promises as fs } from 'node:fs';
import path from 'node:path';

const TARGET_DIRS = ['client', 'server', 'shared'];
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ALLOWLIST_PATH = path.resolve('scripts/config/ts-nocheck-allowlist.txt');

async function walkDirectory(dirPath, collector) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, collector);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!TARGET_EXTENSIONS.has(extension)) {
      continue;
    }

    const fileContents = await fs.readFile(fullPath, 'utf8');
    if (fileContents.includes('@ts-nocheck')) {
      const relativePath = path.relative(process.cwd(), fullPath).split(path.sep).join('/');
      collector.add(relativePath);
    }
  }
}

async function loadAllowlist() {
  const contents = await fs.readFile(ALLOWLIST_PATH, 'utf8');
  return new Set(
    contents
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#')),
  );
}

function printSection(title, lines) {
  console.error(`\n${title}`);
  for (const line of lines) {
    console.error(`- ${line}`);
  }
}

async function main() {
  const allowlist = await loadAllowlist();
  const actual = new Set();

  for (const targetDir of TARGET_DIRS) {
    const absoluteDir = path.resolve(targetDir);
    await walkDirectory(absoluteDir, actual);
  }

  const unexpected = [...actual].filter(file => !allowlist.has(file)).sort();
  const stale = [...allowlist].filter(file => !actual.has(file)).sort();

  if (unexpected.length === 0 && stale.length === 0) {
    console.log(
      `ts-nocheck baseline check passed: ${actual.size} allowlisted file(s), no unexpected drift.`,
    );
    return;
  }

  if (unexpected.length > 0) {
    printSection(
      'Found @ts-nocheck in files not present in scripts/config/ts-nocheck-allowlist.txt:',
      unexpected,
    );
  }

  if (stale.length > 0) {
    printSection(
      'Allowlist entries without @ts-nocheck in source (remove these stale lines from allowlist):',
      stale,
    );
  }

  process.exitCode = 1;
}

main().catch(error => {
  console.error('Failed to validate @ts-nocheck allowlist:', error);
  process.exitCode = 1;
});
