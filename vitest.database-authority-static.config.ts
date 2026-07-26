export default {
  envDir: false,
  test: {
    name: 'database-authority-static',
    environment: 'node',
    include: ['server/__tests__/contract.database-production-seed-security.test.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
};
