/** Place-only command cleanup boundary. Raw causes remain internal, never part of output. */
import type { AuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { PlaceReleaseFailure } from '../server/_core/databaseAuthority/dataAdapters/placeRelease';

export type PlaceReleaseCommand =
  | 'release-reference:plan'
  | 'release-reference:apply'
  | 'release-reference:verify'
  | 'release-reference:inspect'
  | 'places:release-preview:prepare'
  | 'places:release-preview:verify';
type TransactionOutcome =
  | PlaceReleaseFailure['outcome']
  | 'committed'
  | 'not-applicable'
  | 'not-started';

export class PlaceReleaseCommandFailure extends Error {
  constructor(
    public readonly record: {
      reportVersion: 1;
      status: 'failure';
      adapter: 'places';
      command: PlaceReleaseCommand;
      transactionOutcome: TransactionOutcome;
      primaryFailure: 'operation' | 'lock-cleanup' | 'connection-close';
      failures: {
        operation: boolean;
        rollback: boolean;
        lockCleanup: boolean;
        connectionClose: boolean;
      };
      nextAction: 'stop-and-inspect';
      automaticRetryAllowed: false;
    },
    public readonly cause: unknown,
    public readonly connectionCloseError?: unknown,
  ) {
    super('Place command failed. Stop and inspect; do not retry automatically.');
    this.name = 'PlaceReleaseCommandFailure';
  }
}

export function placeCommandFailure(
  command: PlaceReleaseCommand,
  cause: unknown,
  closeFailed = false,
  connectionCloseError?: unknown,
  successfulOutcome?: TransactionOutcome,
) {
  const release = cause instanceof PlaceReleaseFailure ? cause : undefined;
  const operationFailed =
    successfulOutcome === undefined && release?.outcome !== 'committed-cleanup-failed';
  return new PlaceReleaseCommandFailure(
    {
      reportVersion: 1,
      status: 'failure',
      adapter: 'places',
      command,
      transactionOutcome: release?.outcome ?? successfulOutcome ?? 'not-started',
      primaryFailure: operationFailed ? 'operation' : release ? 'lock-cleanup' : 'connection-close',
      failures: {
        operation: operationFailed,
        rollback: release?.outcome === 'rollback-uncertain',
        lockCleanup:
          release?.cleanupError !== undefined || release?.outcome === 'committed-cleanup-failed',
        connectionClose: closeFailed,
      },
      nextAction: 'stop-and-inspect',
      automaticRetryAllowed: false,
    },
    cause,
    connectionCloseError,
  );
}

/** Success is returned only after close acknowledgement. Never retry an operation or close. */
export async function completePlaceReleaseCommand<T extends object>(input: {
  command: PlaceReleaseCommand;
  open: () => Promise<AuthoritySqlConnection>;
  operation: (connection: AuthoritySqlConnection) => Promise<T>;
}): Promise<T & { connectionClosed: true }> {
  let connection: AuthoritySqlConnection | undefined;
  let result: T | undefined;
  let operationFailed = false,
    closeFailed = false;
  let operationError: unknown, closeError: unknown;
  try {
    connection = await input.open();
    result = await input.operation(connection);
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  if (connection) {
    try {
      await connection.end();
    } catch (error) {
      closeFailed = true;
      closeError = error;
    }
  }
  if (operationFailed || closeFailed)
    throw placeCommandFailure(
      input.command,
      operationFailed ? operationError : closeError,
      closeFailed,
      closeError,
      operationFailed
        ? undefined
        : result && 'transactionOutcome' in result && result.transactionOutcome === 'committed'
          ? 'committed'
          : 'not-applicable',
    );
  return { ...result!, connectionClosed: true };
}
