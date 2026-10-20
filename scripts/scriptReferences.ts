const EXECUTABLES = new Set(['tsx', 'node', 'bash', 'sh']);

const TARGET_EXTENSIONS = /\.(?:ts|mts|cts|js|mjs|cjs|sh)$/;

const EXTENSION_FALLBACKS: Record<string, string> = {
  '.js': '.ts',
  '.mjs': '.mts',
  '.cjs': '.cts',
};

const PNPM_BINARIES = new Set([
  'vitest',
  'tsx',
  'tsc',
  'eslint',
  'prettier',
  'playwright',
  'drizzle-kit',
  'cross-env',
  'concurrently',
  'vite',
  'npm',
  'npx',
  'rimraf',
]);

const PNPM_INTERNAL = new Set([
  'install',
  'exec',
  'dlx',
  'store',
  'add',
  'remove',
  'why',
  'list',
  'publish',
  'config',
  'patch',
  'init',
  'update',
  'link',
  'prune',
  'rebuild',
  'dedupe',
  'import',
  'unlink',
  'licenses',
  'audit',
  'outdated',
  'root',
  'bin',
  'doctor',
  'fund',
  'help',
  'deploy',
  'recursive',
]);

function tokenize(command: string): string[] {
  return (command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(token =>
    token.replace(/^['"]|['"]$/g, ''),
  );
}

function isFileTarget(token: string, requirePath: boolean): boolean {
  if (!TARGET_EXTENSIONS.test(token)) return false;
  if (requirePath && !token.includes('/')) return false;
  return true;
}

export function extractLocalFileTargets(command: string): string[] {
  const tokens = tokenize(command);
  const targets = new Set<string>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--config') {
      const candidate = tokens[index + 1];
      if (candidate && isFileTarget(candidate, false)) targets.add(candidate);
      index += 1;
      continue;
    }
    if (!EXECUTABLES.has(token)) continue;
    for (let next = index + 1; next < tokens.length; next += 1) {
      const candidate = tokens[next];
      if (candidate.startsWith('-')) continue;
      if (isFileTarget(candidate, true)) {
        targets.add(candidate);
        continue;
      }
      break;
    }
  }
  return [...targets];
}

export function extractPnpmScriptNames(text: string): string[] {
  const names = new Set<string>();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+#.*$/, '');
    if (/^\s*#/.test(line)) continue;
    const tokens = tokenize(line);
    for (let index = 0; index < tokens.length; index += 1) {
      if (tokens[index] !== 'pnpm') continue;
      for (let next = index + 1; next < tokens.length; next += 1) {
        const token = tokens[next];
        if (token === 'run' || token.startsWith('-')) continue;
        if (PNPM_INTERNAL.has(token) || PNPM_BINARIES.has(token)) break;
        names.add(token);
        break;
      }
    }
  }
  return [...names];
}

export function unresolvedFileTargets(
  targets: string[],
  exists: (path: string) => boolean,
): string[] {
  return targets.filter(target => {
    if (exists(target)) return false;
    const extension = target.slice(target.lastIndexOf('.'));
    const fallback = EXTENSION_FALLBACKS[extension];
    if (!fallback) return true;
    return !exists(`${target.slice(0, -extension.length)}${fallback}`);
  });
}
