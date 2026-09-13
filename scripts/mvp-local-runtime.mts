import {
  resolveDatabaseAuthority,
  databaseAuthorityChildEnvironment,
} from '../server/_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import dotenv from 'dotenv';
import { homedir } from 'node:os';

const authority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
if (
  authority.context.targetClass !== 'disposable-worktree' ||
  authority.context.targetFingerprintHash !==
    'a560e9f2971e7676be194015ed933f1964e0948c5fd44d5844a74dcbf494e321'
) {
  throw new Error('MVP verification requires the exact task-owned target.');
}
authorizeDatabaseOperation(authority);
const central = dotenv.config({
  path: `${homedir()}/.config/property-listify/local.env`,
  quiet: true,
}).parsed;
Object.assign(process.env, databaseAuthorityChildEnvironment(authority), {
  JWT_SECRET: central?.JWT_SECRET,
  PORT: '5000',
  SKIP_FRONTEND: 'true',
  APP_URL: 'http://localhost:5177',
  FRONTEND_URL: 'http://localhost:5177',
  VITE_API_URL: 'http://localhost:5000',
  RESEND_API_KEY: '',
  REDIS_URL: '',
  SAVED_SEARCH_SCHEDULER_ENABLED: 'false',
});
// Local email transport capture only: retain real auth/token/session logic.
// Run with stdout redirected to the private mode-0600 task log.
const { EmailService } = await import('../server/_core/emailService');
EmailService.sendEmail = async options => {
  const token = options.text?.match(/reset-password\?token=([a-f0-9]+)/)?.[1];
  if (token)
    console.log(`[MVP Local Sink] Reset URL: http://localhost:5177/reset-password?token=${token}`);
  return true;
};
await import('../server/_core/start');
