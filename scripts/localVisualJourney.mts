import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import {
  databaseAuthorityChildEnvironment,
  resolveDatabaseAuthority,
} from '../server/_core/databaseAuthority/context';
import { assertLocalJourneyTarget } from '../server/_core/databaseAuthority/dataAdapters/localJourneyPreview';
import {
  assertCentralEnvironmentReady,
  inspectCentralLocalEnvironment,
  resolveCentralLocalEnvironment,
} from './localEnvironmentAuthority';

if (
  Object.entries(process.env).some(([key, value]) => /^(RAILWAY|VERCEL)_/.test(key) && value) ||
  ['staging', 'production'].includes(process.env.APP_ENV || '') ||
  process.env.NODE_ENV === 'production'
) {
  throw new Error('Local journeys cannot run in a deployed environment.');
}
const authority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
assertLocalJourneyTarget(authority);
authorizeDatabaseOperation(authority);
const central = inspectCentralLocalEnvironment(resolveCentralLocalEnvironment());
assertCentralEnvironmentReady(central);
const environment = databaseAuthorityChildEnvironment(authority, {
  ...process.env,
  JWT_SECRET: central.values.JWT_SECRET,
});
// Do not inherit integrations or real bank details into this demo process.
for (const key of Object.keys(environment)) {
  if (
    /(?:RESEND|REDIS|SMTP|AWS|S3|GOOGLE|OPENAI|OAUTH|BILLING_EFT|COMMERCIAL_ACTIVATION)/i.test(key)
  )
    delete environment[key];
}
Object.assign(environment, {
  NODE_ENV: 'test',
  APP_ENV: 'test',
  PROPERTY_LISTIFY_LOCAL_VISUAL_JOURNEY: 'true',
  PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
  PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS:
    'agent_launch_access,agency_launch_access,developer_launch_access',
  PORT: '5000',
  SKIP_FRONTEND: 'true',
  MEDIA_STORAGE_ADAPTER: 'local',
  APP_URL: 'http://localhost:3009',
  FRONTEND_URL: 'http://localhost:3009',
  VITE_API_URL: 'http://localhost:5000',
  VITE_API_BASE_URL: 'http://localhost:5000',
  VITE_DEPLOY_ENV: 'development',
  VITE_GOOGLE_MAPS_API_KEY: '',
  RESEND_API_KEY: '',
  REDIS_URL: '',
  SAVED_SEARCH_SCHEDULER_ENABLED: 'false',
  BILLING_EFT_ACCOUNT_NAME: 'LOCAL DEMO — DO NOT PAY',
  BILLING_EFT_BANK_NAME: 'Fictitious local bank',
  BILLING_EFT_ACCOUNT_NUMBER: '0000000000',
  BILLING_EFT_BRANCH_CODE: '000000',
  BILLING_EFT_ACCOUNT_TYPE: 'Demo account',
});
const directory = resolve('.private/local-journey');
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
const mail = resolve(directory, 'mail.jsonl');
if (!existsSync(mail)) writeFileSync(mail, '', { mode: 0o600 });
chmodSync(mail, 0o600);
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
const localLinks = (message: { html: string; text?: string }) =>
  [
    ...new Set(
      (message.html + '\n' + (message.text || '')).match(/http:\/\/localhost:3009\/[^\s"'<>]+/g) ||
        [],
    ),
  ]
    .map(
      url =>
        `<p><a href="${escape(url)}" target="_blank" rel="noreferrer">Open local email link</a></p>`,
    )
    .join('');
const inbox = createServer((request, response) => {
  // Email contents can include account tokens: loopback listener, no CORS,
  // exact Host, and no ability for another website to read the inbox.
  if (
    !['localhost:5180', '127.0.0.1:5180'].includes(request.headers.host || '') ||
    (request.headers['sec-fetch-site'] &&
      !['none', 'same-origin'].includes(String(request.headers['sec-fetch-site'])) &&
      !(
        request.headers['sec-fetch-site'] === 'same-site' &&
        request.headers['sec-fetch-mode'] === 'navigate'
      ))
  ) {
    response.writeHead(403);
    response.end();
    return;
  }
  const screenshot = request.url?.match(/^\/screenshots\/([a-z0-9-]+\.png)$/);
  if (request.method === 'GET' && screenshot) {
    const path = resolve(directory, screenshot[1]);
    if (!existsSync(path)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    response.end(readFileSync(path));
    return;
  }
  if (request.method !== 'GET' || request.url !== '/') {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; frame-src 'self' about:; frame-ancestors 'none'",
  });
  const messages = readFileSync(mail, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
  response.end(
    `<!doctype html><title>Local demo inbox</title><style>body{max-width:1000px;margin:40px auto;font:16px system-ui;background:#f1f5f9;color:#0f172a}article{background:white;border-radius:12px;padding:24px;margin:20px 0}iframe{width:100%;height:500px;border:0}small{color:#475569}a{color:#0369a1}</style><h1>Property Listify local journey lab</h1><p>Fictitious customers and properties. Review the actual product using these accounts. Keep fresh-agent and finance sessions in separate browser profiles or use a private window.</p><article><h2>Start a journey</h2><ul><li><a href="http://localhost:3009">Public property search and detail</a></li><li><a href="http://localhost:3009/login?mode=signin">Sign in</a> as <b>local-agent@listify.local</b> for a fresh profile → invoice → payment notice.</li><li><b>referrer@listify.local</b>: local Distribution Network partner. Open <a href="http://localhost:3009/distribution/partner/overview">the partner workspace</a> to review its empty and paused states; this fixture includes no buyer records or active programs.</li><li><b>payment-agent@listify.local</b>: invoice and payment notice under review after the recorded local rehearsal; access remains locked.</li><li><b>journey-agent@listify.local</b>: the account used in the recorded walkthrough; its progress is retained.</li><li><b>home-preview-agent@listify.local</b>: active sample agent with existing listings.</li><li><b>home-preview-agency@listify.local</b> and <b>home-preview-developer@listify.local</b>: populated organisation workspaces.</li><li><b>ple-reviewer@listify.local</b>: operator. Open <a href="http://localhost:3009/admin/subscriptions">finance and payment verification</a>.</li></ul><details><summary>Show local demo passwords</summary><p>Agent / agency / developer demo accounts: <code>${escape(central.values.LOCAL_DEMO_AGENCY_PASSWORD)}</code></p><p>Operator: <code>${escape(central.values.LOCAL_PLE_REVIEWER_PASSWORD || '')}</code></p><p>These are machine-local demo credentials. Do not share or use them on a hosted site.</p></details></article><article><h2>Recorded screens</h2><p>Snapshots of this local demo. Use the app links above to interact.</p>${[
      '01-home',
      '02-agent-before-payment',
      '03-invoice',
      '04-notice-pending',
      '05-finance-queue',
      '06-agent-profile',
      '07-agent-pending-dashboard',
      '08-finance-approval',
      '09-agent-active',
      '10-property-detail',
      '11-property-authoring',
      '12-subscription-summary',
      '13-enquiry-form',
      '14-lead-workspace',
    ]
      .filter(name => existsSync(resolve(directory, name + '.png')))
      .map(name => `<p><a href="/screenshots/${name}.png">${name.replace(/-/g, ' ')}</a></p>`)
      .join(
        '',
      )}</article><h2>Captured email</h2><p>Captured locally. No email was sent to a real recipient. <a href="/">Refresh</a> · <a href="http://localhost:3009">Open Property Listify</a></p>${
      messages
        .reverse()
        .map(
          message =>
            `<article><h2>${escape(message.subject)}</h2><small>To ${escape(message.to)} · ${escape(message.capturedAt)}</small><iframe sandbox="allow-popups" srcdoc="${escape(message.html)}"></iframe>${localLinks(message)}</article>`,
        )
        .join('') || '<p>No messages yet. Request an invoice or register an account.</p>'
    }`,
  );
});
await new Promise<void>((resolveReady, reject) => {
  inbox.once('error', reject);
  inbox.listen(5180, '127.0.0.1', resolveReady);
});
for (const key of Object.keys(process.env)) {
  if (
    /(?:RESEND|REDIS|SMTP|AWS|S3|GOOGLE|OPENAI|OAUTH|BILLING_EFT|COMMERCIAL_ACTIVATION)/i.test(key)
  )
    delete process.env[key];
}
Object.assign(process.env, environment);
const frontend = await createViteServer({
  server: { host: '127.0.0.1', port: 3009, strictPort: true },
  plugins: [
    {
      name: 'local-visual-demo-marker',
      transformIndexHtml: () => [
        {
          tag: 'div',
          attrs: {
            style:
              'position:fixed;bottom:8px;left:8px;z-index:99999;background:#0f172a;color:white;padding:8px 12px;border-radius:8px;font:12px system-ui',
          },
          children:
            'LOCAL DEMO · Sample data · <a style="color:#7dd3fc" href="http://localhost:5180" target="_blank" rel="noreferrer">Local email inbox</a>',
          injectTo: 'body',
        },
      ],
    },
  ],
});
await frontend.listen();
const backend = spawn('tsx', ['scripts/localVisualJourneyServer.mts'], {
  env: environment,
  stdio: 'inherit',
});
backend.on('error', error => {
  console.error(error.message);
  void stop(1);
});
backend.on('exit', code => {
  void stop(code ?? 1);
});
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  backend.kill('SIGTERM');
  await frontend.close();
  inbox.close();
  process.exitCode = code;
}
process.on('SIGINT', () => {
  void stop();
});
process.on('SIGTERM', () => {
  void stop();
});
console.log(
  'Local Property Listify: http://localhost:3009 | Captured email: http://localhost:5180',
);
console.log(
  'Sample banking instructions only. No real payment, hosted database, or outbound email.',
);
