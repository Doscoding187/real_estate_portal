import type { AuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';

export class LegalReleaseCommandFailure extends Error {
  readonly unsafeToReplay = true;
  constructor(
    readonly primaryFailure: unknown,
    readonly cleanupFailure: unknown,
    readonly operationResult: unknown,
  ) {
    super(
      'Legal release connection closure failed. Preserve the operation result and primary failure; keep affected intake held and inspect before any further apply.',
    );
    this.name = 'LegalReleaseCommandFailure';
  }
}

/** Return success only after connection closure. A cleanup error must never
 * replace evidence of an already committed or ambiguously committed release. */
export async function completeLegalReleaseCommand<T>(input: {
  connection: AuthoritySqlConnection;
  operation: () => Promise<T>;
}): Promise<T> {
  let result: T | undefined;
  let primaryFailure: unknown;
  let failed = false;
  try {
    result = await input.operation();
  } catch (error) {
    failed = true;
    primaryFailure = error;
  }
  try {
    await input.connection.end();
  } catch (cleanup) {
    throw new LegalReleaseCommandFailure(primaryFailure, cleanup, result);
  }
  if (failed) throw primaryFailure;
  return result as T;
}
