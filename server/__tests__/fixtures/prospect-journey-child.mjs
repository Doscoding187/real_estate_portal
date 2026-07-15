import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [mode, pidFile] = process.argv.slice(2);

if (mode === 'success') {
  process.stdout.write('fixture success\n');
  process.exit(0);
}

if (mode === 'failure') {
  process.stderr.write('fixture failure\n');
  process.exit(7);
}

if (mode === 'grandchild') {
  const child = spawn(process.execPath, [process.argv[1], 'sleep'], { stdio: 'ignore' });
  if (pidFile) writeFileSync(pidFile, String(child.pid));
}

setInterval(() => {}, 1_000);
