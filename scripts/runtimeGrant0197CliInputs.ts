export const RUNTIME_0197_PLAN_DIGEST_ENV = 'RUNTIME_GRANT_0197_PLAN_DIGEST';
export const RUNTIME_0197_ACK_ENV = 'RUNTIME_GRANT_0197_ACK';

const REJECTED_LITERALS = new Set(['undefined', 'null']);

function cleanValue(raw: string | undefined, label: string): string | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (!value || REJECTED_LITERALS.has(value)) {
    throw new Error(`Invalid empty or placeholder value for ${label}.`);
  }
  return value;
}

function optionalFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (args.indexOf(name, index + 1) >= 0) throw new Error(`Flag ${name} was given more than once.`);
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing required flag ${name}.`);
  return cleanValue(value, name);
}

function resolveInput(
  args: string[],
  env: Record<string, string | undefined>,
  flagName: string,
  envName: string,
): string {
  const fromFlag = optionalFlag(args, flagName);
  const fromEnv = env[envName] ? cleanValue(env[envName], envName) : undefined;
  if (fromFlag !== undefined && fromEnv !== undefined && fromFlag !== fromEnv) {
    throw new Error(`Conflicting ${flagName} flag and ${envName} environment input.`);
  }
  const value = fromFlag ?? fromEnv;
  if (!value) throw new Error(`Missing required flag ${flagName} or ${envName} environment input.`);
  return value;
}

export function resolveRuntimeGrant0197CliInputs(
  args: string[],
  env: Record<string, string | undefined>,
): { planDigest: string; acknowledgement: string } {
  return {
    planDigest: resolveInput(args, env, '--plan-digest', RUNTIME_0197_PLAN_DIGEST_ENV),
    acknowledgement: resolveInput(args, env, '--ack', RUNTIME_0197_ACK_ENV),
  };
}
