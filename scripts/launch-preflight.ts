#!/usr/bin/env tsx
import { formatLaunchPreflight, runLaunchPreflight } from '../server/_core/launchPreflight';
import { loadAppRuntimeEnv } from '../server/_core/runtimeBootstrap';

function main() {
  const { runtimeEnv, loadedFiles } = loadAppRuntimeEnv({ cwd: process.cwd() });
  const result = runLaunchPreflight({ runtimeEnv });

  console.log(
    `[LaunchPreflight] Runtime env=${runtimeEnv}; env files=${loadedFiles.join(', ') || '(none)'}`,
  );
  console.log(formatLaunchPreflight(result));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main();
