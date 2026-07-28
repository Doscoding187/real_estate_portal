export default {
  envDir: false,
  test: {
    name: 'database-authority-static',
    environment: 'node',
    include: [
      'server/__tests__/contract.database-production-seed-security.test.ts',
      'server/__tests__/contract.database-final-closure-authority.test.ts',
      'server/__tests__/contract.database-agent-authority.test.ts',
      'scripts/__tests__/localEnvironmentAuthority.test.ts',
    ],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
};
