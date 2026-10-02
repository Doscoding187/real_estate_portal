/** Exact read-only recovery proof authorized by retained upgrade packet 35954afc. */
export const RECOVERY_VALIDATION_TARGET = Object.freeze({
  subscriptionId: '384dc69e-9e22-419f-9e3d-83fbac4f58d0',
  resourceGroup: 'rg-property-listify',
  serverName: 'pl-pre84-recovery-20260929-0815',
  hostname: 'pl-pre84-recovery-20260929-0815.mysql.database.azure.com',
  database: 'propertylistify_database',
  purpose: 'RETAINED AZURE 8.4 PRE-UPGRADE RECOVERY VALIDATION',
  sourceServerName: 'propertylistify-mysql',
  approvedPacket: '35954afc649f24027ec33cac9aa2de3c580ebcae',
});

export const RECOVERY_VALIDATION_FINGERPRINT = `mysql://${RECOVERY_VALIDATION_TARGET.hostname}:3306/${RECOVERY_VALIDATION_TARGET.database}`;
