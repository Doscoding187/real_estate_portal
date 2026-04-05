console.log('----------------------------------------');
console.log('[BOOT] start.ts running, cwd =', process.cwd());
import fs from 'fs';
import path from 'path';
import { loadAppRuntimeEnv } from './runtimeBootstrap';

const bootInfo = loadAppRuntimeEnv();
console.log('[BOOT] runtime env =', bootInfo.runtimeEnv);
console.log('[BOOT] .env.local exists?', fs.existsSync(path.resolve(process.cwd(), '.env.local')));
console.log('[BOOT] loaded env files =', bootInfo.loadedFiles.join(', ') || '(none)');
console.log('----------------------------------------');

// IMPORTANT: only now import the rest of the app
// This ensures no static analysis or imports read process.env before we load it
import('./index');
