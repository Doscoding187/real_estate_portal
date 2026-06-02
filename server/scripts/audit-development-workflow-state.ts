import { getDevelopmentWorkflowStateReadiness } from '../lib/developmentWorkflowStateAudit';

async function main() {
  const readiness = await getDevelopmentWorkflowStateReadiness();
  console.log(JSON.stringify(readiness, null, 2));
  process.exit(readiness.ready ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
