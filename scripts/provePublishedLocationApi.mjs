/**
 * Proves the published location API answers for a published suburb.
 *
 * The geography journey needs the published geography to be present, not just
 * the schema. This asks the location API for a published suburb after the
 * fixtures exist but before a browser is started, so a missing fixture reads as
 * a data failure rather than a page failure.
 */
import { spawn } from 'node:child_process';

// The browser journey owns the application port. The proof uses its own port so
// a slow shutdown here can never stop Playwright from binding the real one.
const PORT = process.env.PROOF_SERVER_PORT || '5055';
const BASE = `http://127.0.0.1:${PORT}`;
const HEALTH_TIMEOUT_MS = Number(process.env.PROOF_HEALTH_TIMEOUT_MS || 120_000);
const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = spawn('pnpm', ['exec', 'tsx', 'server/_core/start.ts'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'inherit', 'inherit'],
  detached: true,
  env: {
    ...process.env,
    NODE_ENV: process.env.PLAYWRIGHT_SERVER_NODE_ENV || 'test',
    APP_ENV: process.env.PLAYWRIGHT_SERVER_APP_ENV || 'test',
    PORT,
    // The proof only needs the API. Serving the built client would make this
    // slower and compete with the browser journey's own runtime.
    SKIP_FRONTEND: 'true',
  },
});

async function waitForHealth() {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`the application exited before becoming healthy (code ${server.exitCode})`);
    }
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      // The server is not listening yet.
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`the application did not become healthy within ${HEALTH_TIMEOUT_MS}ms`);
}

async function readSuburb() {
  const input = {
    json: {
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      suburbSlug: 'sandton',
    },
  };
  const response = await fetch(
    `${BASE}/api/trpc/locationPages.getSuburbData?input=${encodeURIComponent(JSON.stringify(input))}`,
  );
  const body = await response.json();
  return { status: response.status, body };
}

function stopServer() {
  const pid = server.pid;
  if (!pid) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        // The process group already exited.
      }
      finish();
    }, SHUTDOWN_TIMEOUT_MS);
    server.once('exit', finish);
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      // The process group already exited.
      finish();
    }
  });
}

try {
  await waitForHealth();
  const { status, body } = await readSuburb();
  const suburb = body?.result?.data?.json?.suburb;
  console.log(`getSuburbData status ${status}`);
  console.log(`body: ${JSON.stringify(body).slice(0, 2000)}`);
  console.log(`suburb: ${suburb ? JSON.stringify(suburb) : 'none'}`);
  if (!suburb) {
    console.error('The published location API did not return the published suburb.');
    process.exitCode = 1;
  }
} finally {
  await stopServer();
}
