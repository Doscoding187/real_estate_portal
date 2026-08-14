import { config } from 'dotenv';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { databaseAuthorityChildEnvironment } from '../server/_core/databaseAuthority/context';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Slice 1 browser runtime.`);
  return value;
}

const localEnv = config({
  path:
    process.env.PROPERTY_LISTIFY_LOCAL_ENV_PATH ||
    resolve(homedir(), '.config/property-listify/local.env'),
  override: false,
}).parsed ?? {};
// The central env file contains the clean-main database URL. Do not let it
// override the exact Slice 1 worktree resolution below.
delete process.env.DATABASE_URL;
delete process.env.LISTIFY_E2E_DATABASE_URL;

const authority = resolveDatabaseAuthority({
  operation: 'browser-verification',
  credentialClass: 'local-owner',
});
if (authority.context.databaseName !== requiredEnvironment('SLICE1_VERIFY_DATABASE')) {
  throw new Error(`Refusing browser runtime against ${authority.context.databaseName}.`);
}
if (authority.context.targetFingerprintHash !== requiredEnvironment('SLICE1_VERIFY_FINGERPRINT')) {
  throw new Error('Refusing browser runtime because the Slice 1 database fingerprint changed.');
}
authorizeDatabaseOperation(authority, {
  approval: protectedDatabaseApprovalFromEnvironment(authority),
});

Object.assign(process.env, {
  ...databaseAuthorityChildEnvironment(authority),
  JWT_SECRET: localEnv.JWT_SECRET,
  NODE_ENV: 'development',
  APP_ENV: 'development',
  PORT: '5000',
  SKIP_FRONTEND: 'true',
  REDIS_URL: '',
  RESEND_API_KEY: '',
  RESEND_FROM_EMAIL: '',
  EMAIL_FROM: '',
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  WHATSAPP_ACCESS_TOKEN: '',
  WHATSAPP_PHONE_NUMBER_ID: '',
});

await import('../server/_core/start');
