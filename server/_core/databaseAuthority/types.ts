export const DATABASE_OPERATIONS = [
  'runtime-connect',
  'read-only-connect',
  'migration-plan',
  'migration-apply',
  'reference-seed',
  'foundation-seed',
  'demo-seed',
  'scenario-seed',
  'test-fixture',
  'verification',
  'browser-verification',
  'readiness',
  'diagnostics',
  'reset',
  'rebuild',
  'database-create',
  'database-dispose',
  'lifecycle-admin',
  'release-plan',
  'release-apply',
  'release-reference-plan',
  'release-reference-apply',
  'release-reference-verify',
] as const;

export type DatabaseOperation = (typeof DATABASE_OPERATIONS)[number];

export const DATABASE_TARGET_CLASSES = [
  'clean-main-local',
  'disposable-worktree',
  'disposable-test',
  'staging',
  'production',
  'shared-remote',
  'unknown',
] as const;

export type DatabaseTargetClass = (typeof DATABASE_TARGET_CLASSES)[number];

export const DATABASE_CREDENTIAL_CLASSES = [
  'runtime',
  'read-only',
  'migration',
  'lifecycle-admin',
  'local-owner',
  'test-owner',
  'unknown',
] as const;

export type DatabaseCredentialClass = (typeof DATABASE_CREDENTIAL_CLASSES)[number];

export type DatabaseEnvironmentSource =
  | 'explicit-caller'
  | 'explicit-process'
  | 'worktree-environment'
  | 'worktree-profile'
  | 'central-local-fallback'
  | 'central-local-derived-worktree'
  | 'repository-environment'
  | 'unset';

export type DatabaseRuntimeMode = 'development' | 'test' | 'staging' | 'production';

export type GitWorktreeIdentity = {
  repositoryRoot: string;
  gitCommonDirectory: string;
  gitCommonDirectoryFingerprint: string;
  worktreePath: string;
  branch: string;
  head: string;
  upstream: string | null;
  originMainHead: string | null;
  registered: boolean;
  clean: boolean;
  ownershipKey: string;
  expectedWorktreeDatabase: string;
};

export type ResolvedDatabaseContext = {
  contextVersion: 1;
  contextId: string;
  correlationId: string;
  resolvedAt: string;
  operation: DatabaseOperation;
  runtimeMode: DatabaseRuntimeMode;
  environmentSource: DatabaseEnvironmentSource;
  environmentFiles: readonly string[];
  targetFingerprint: string;
  targetFingerprintHash: string;
  targetClass: DatabaseTargetClass;
  databaseName: string;
  host: string;
  port: string;
  provider: 'mysql' | 'tidb' | 'unknown';
  dialect: 'mysql' | 'unknown';
  local: boolean;
  tls: {
    required: boolean;
    certificateVerificationRequired: boolean;
  };
  credentialClass: DatabaseCredentialClass;
  repository: {
    root: string;
    gitCommonDirectoryFingerprint: string;
    head: string;
  };
  worktree: {
    path: string;
    branch: string;
    upstream: string | null;
    registered: boolean;
    clean: boolean;
    ownershipKey: string;
    expectedDatabase: string;
    ownershipMatches: boolean;
    cleanMainOwnershipMatches: boolean;
  };
};

export type DatabaseCredentialHandle = {
  readonly handleId: string;
};

export type ResolvedDatabaseAuthority = {
  context: ResolvedDatabaseContext;
  credential: DatabaseCredentialHandle;
};
