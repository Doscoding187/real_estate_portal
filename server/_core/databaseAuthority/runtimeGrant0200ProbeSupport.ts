import {
  authorizeProbe,
  founderCountSql,
  isAcceptedProbeTarget,
  PROBE_ACCOUNT_SQL,
  PROBE_DATABASE,
  PROBE_GRANTS_SQL,
  PROBE_STEPS,
  probeTableSql,
  readFounderCounts,
  type ProbeStep,
} from './runtimeGrant0197ProbeSupport';

// Target, account, SHOW GRANTS, table-select and founder-count helpers are
// release-independent; only the refusal prefix and error line are 0200-specific.
export {
  authorizeProbe,
  founderCountSql,
  isAcceptedProbeTarget,
  PROBE_ACCOUNT_SQL,
  PROBE_DATABASE,
  PROBE_GRANTS_SQL,
  PROBE_STEPS,
  probeTableSql,
  readFounderCounts,
  type ProbeStep,
};

const SAFE_MESSAGE_PREFIXES = ['Database operation refused:', '0200 probe refused:'];

/** Error class plus message only when it is an authored refusal; never driver text, URLs or env values. */
export function safeProbeErrorLine(error: unknown, step?: ProbeStep): string {
  const name = error instanceof Error && /^[A-Za-z0-9_]{1,64}$/.test(error.name) ? error.name : 'Error';
  const rawCode = (error as { code?: unknown } | null)?.code;
  const code = typeof rawCode === 'string' && /^[A-Z0-9_]{1,64}$/.test(rawCode) ? rawCode : null;
  const message =
    error instanceof Error && SAFE_MESSAGE_PREFIXES.some(p => error.message.startsWith(p))
      ? error.message.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[redacted]').slice(0, 300)
      : null;
  const label = step && (PROBE_STEPS as readonly string[]).includes(step) ? step : null;
  return (
    '0200 probe error: ' +
    (label ? 'step=' + label + ' ' : '') +
    'class=' +
    name +
    (code ? ' code=' + code : '') +
    (message ? ' message=' + message : '')
  );
}
