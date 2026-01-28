console.log('----------------------------------------');
console.log('[BOOT] start.ts running, cwd =', process.cwd());
import fs from 'fs';
import path from 'path';

console.log('[BOOT] .env.local exists?', fs.existsSync(path.resolve(process.cwd(), '.env.local')));
console.log('----------------------------------------');

import dotenv from 'dotenv';

// Load .env then .env.local (override)
// Robustly resolving paths relative to process.cwd() to verify we find them
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// IMPORTANT: only now import the rest of the app
// This ensures no static analysis or imports read process.env before we load it
import('./index');
