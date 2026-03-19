export async function getAffordabilityConfigSnapshot() {
  return {
    config: {
      maxDebtToIncomeRatio: 0.35,
      minResidualIncomeRatio: 0.2,
      defaultDepositRatio: 0.1,
    },
    checkedAt: new Date().toISOString(),
  };
}
