import { parseHostedLoadConfig } from './config';
import { HOSTED_LOAD_EXIT, runHostedLoad } from './driver';
import { RehearsalRefusal } from '../loadRehearsal/config';

async function main(): Promise<void> {
  const config = parseHostedLoadConfig(process.argv.slice(2), process.env);
  const { exitCode } = await runHostedLoad(config);
  process.exit(exitCode);
}

main().catch(error => {
  if (error instanceof RehearsalRefusal) {
    console.error(`[hosted-load] ${error.message}`);
    process.exit(error.exitCode);
  }
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(HOSTED_LOAD_EXIT.refusal);
});
