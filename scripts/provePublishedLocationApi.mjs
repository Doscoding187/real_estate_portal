/**
 * Proves the published location API answers for a published suburb.
 *
 * The geography journey needs the published geography to be present, not just
 * the schema. This asks the location API for a published suburb before a browser
 * is started, so a missing fixture reads as a data failure rather than a page
 * failure.
 */
import { spawn } from 'node:child_process';

const PORT = process.env.PLAYWRIGHT_SERVER_PORT || '5000';
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('npx', ['tsx', 'server/_core/start.ts'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  env: {
    ...process.env,
    NODE_ENV: process.env.PLAYWRIGHT_SERVER_NODE_ENV || 'test',
    APP_ENV: process.env.PLAYWRIGHT_SERVER_APP_ENV || 'test',
    PORT,
    SKIP_FRONTEND: 'false',
  },
});

async function waitForHealth(attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      // The server is not listening yet.
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

async function readSuburb() {
  const input = {
    json: {
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      suburbSlug: 'sandton',
    },
  };
  const response = await fetch(`${BASE}/api/trpc/locationPages.getSuburbData?input=${encodeURIComponent(JSON.stringify(input))}`);
  const body = await response.json();
  return { status: response.status, body };
}

try {
  if (!(await waitForHealth())) throw new Error('the application did not become healthy');
  const { status, body } = await readSuburb();
  const suburb = body?.result?.data?.json?.suburb;
  console.log(`getSuburbData status ${status}`);
  console.log(`suburb: ${suburb ? JSON.stringify(suburb) : 'none'}`);
  if (!suburb) {
    console.error('The published location API did not return the published suburb.');
    process.exitCode = 1;
  }
} finally {
  server.kill('SIGTERM');
}
