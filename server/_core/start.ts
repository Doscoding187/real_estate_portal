console.log('----------------------------------------');
console.log('[BOOT] start.ts running, cwd =', process.cwd());
import fs from 'fs';
import path from 'path';

console.log('[BOOT] .env.local exists?', fs.existsSync(path.resolve(process.cwd(), '.env.local')));
console.log('----------------------------------------');

import { loadAppRuntimeEnv } from './runtimeBootstrap';

const envBootstrap = loadAppRuntimeEnv({ cwd: process.cwd() });
console.log('[BOOT] runtime env =', envBootstrap.runtimeEnv);
console.log('[BOOT] loaded env files =', envBootstrap.loadedFiles.join(', ') || '(none)');

// IMPORTANT: only now import the rest of the app
// This ensures no static analysis or imports read process.env before we load it
import('./index');
