type MysqlSslOptions = Record<string, any> & {
  rejectUnauthorized?: boolean;
  minVersion?: string;
};

export type MysqlConnectionSecurityConfig = {
  uri: string;
  ssl?: MysqlSslOptions;
};

function parseBoolean(value: string | null): boolean | undefined {
  if (value == null) return undefined;

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  return undefined;
}

function parseSslObject(value: string): MysqlSslOptions {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      'DATABASE_URL contains an invalid JSON ssl parameter.',
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      'DATABASE_URL ssl parameter must be a JSON object.',
    );
  }

  return parsed as MysqlSslOptions;
}

function isLocalDatabaseHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  const unwrapped =
    normalized.startsWith('[') && normalized.endsWith(']')
      ? normalized.slice(1, -1)
      : normalized;

  return (
    unwrapped === 'localhost' ||
    unwrapped === '127.0.0.1' ||
    unwrapped === '::1'
  );
}

function isProtectedRuntime(runtimeEnv: string): boolean {
  return runtimeEnv === 'production' || runtimeEnv === 'staging';
}

/**
 * Canonical MySQL TLS policy.
 *
 * Production and staging always verify the database certificate.
 * Remote development and test connections are strict by default.
 * Local development and test databases may run without TLS.
 */
export function buildMysqlConnectionSecurityConfig(
  databaseUrl: string,
  runtimeEnv: string,
): MysqlConnectionSecurityConfig {
  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.protocol !== 'mysql:') {
    throw new Error(
      `Expected a mysql DATABASE_URL, received ${
        parsedUrl.protocol || '(missing protocol)'
      }.`,
    );
  }

  const protectedRuntime = isProtectedRuntime(runtimeEnv);
  const localTarget = isLocalDatabaseHost(parsedUrl.hostname);

  const sslParam = parsedUrl.searchParams.get('ssl');
  const rejectUnauthorizedParam =
    parsedUrl.searchParams.get('rejectUnauthorized');
  const sslAcceptParam =
    parsedUrl.searchParams.get('sslaccept')?.trim().toLowerCase();

  let tlsRequested: boolean | undefined;
  let rejectUnauthorizedRequested =
    parseBoolean(rejectUnauthorizedParam);
  let sslObject: MysqlSslOptions = {};

  if (sslParam != null) {
    const booleanSsl = parseBoolean(sslParam);

    if (typeof booleanSsl === 'boolean') {
      tlsRequested = booleanSsl;
    } else {
      sslObject = parseSslObject(sslParam);
      tlsRequested = true;

      if (typeof sslObject.rejectUnauthorized === 'boolean') {
        rejectUnauthorizedRequested =
          sslObject.rejectUnauthorized;
      }
    }
  }

  if (sslAcceptParam === 'strict' || sslAcceptParam === 'required') {
    tlsRequested = true;
    rejectUnauthorizedRequested = true;
  }

  if (
    sslAcceptParam === 'insecure' ||
    sslAcceptParam === 'no-verify' ||
    sslAcceptParam === 'accept-invalid-certs'
  ) {
    tlsRequested = true;
    rejectUnauthorizedRequested = false;
  }

  if (protectedRuntime && tlsRequested === false) {
    throw new Error(
      `TLS cannot be disabled for ${runtimeEnv} database connections.`,
    );
  }

  if (
    protectedRuntime &&
    rejectUnauthorizedRequested === false
  ) {
    throw new Error(
      `Certificate verification cannot be disabled for ${runtimeEnv} database connections.`,
    );
  }

  parsedUrl.searchParams.delete('ssl');
  parsedUrl.searchParams.delete('rejectUnauthorized');
  parsedUrl.searchParams.delete('sslaccept');

  if (!protectedRuntime && tlsRequested === false) {
    return {
      uri: parsedUrl.toString(),
      ssl: undefined,
    };
  }

  if (
    !protectedRuntime &&
    localTarget &&
    tlsRequested !== true &&
    rejectUnauthorizedRequested === undefined &&
    Object.keys(sslObject).length === 0
  ) {
    return {
      uri: parsedUrl.toString(),
      ssl: undefined,
    };
  }

  const rejectUnauthorized = protectedRuntime
    ? true
    : rejectUnauthorizedRequested ?? true;

  const ssl: MysqlSslOptions = {
    ...sslObject,
    rejectUnauthorized,
  };

  if (rejectUnauthorized && ssl.minVersion == null) {
    ssl.minVersion = 'TLSv1.2';
  }

  return {
    uri: parsedUrl.toString(),
    ssl,
  };
}
