import { resolve } from 'node:path';
import { runEnvironmentAuthorityDiagnostic } from './localEnvironmentAuthorityContract';

function parseArgs(args: string[]) {
  let worktree = process.cwd();
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--json') json = true;
    else if (argument === '--worktree') {
      const value = args[index + 1];
      if (!value) throw new Error('--worktree requires a path.');
      worktree = resolve(value);
      index += 1;
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  return { worktree, json };
}

function main() {
  const { worktree, json } = parseArgs(process.argv.slice(2));
  const result = runEnvironmentAuthorityDiagnostic(worktree);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Contract version: ${result.contractVersion}`);
    console.log(`Repository root: ${result.repositoryRoot}`);
    console.log(`Requested target: ${result.requestedTarget}`);
    console.log(`Worktree environment: ${result.environmentPath.state}`);
    console.log(
      `Central authority: ${result.centralAuthority.inspection.state} (${result.centralAuthority.inspection.permissions})`,
    );
    console.log(
      `Database target: ${result.databaseTarget.classification} (${result.databaseTarget.approved ? 'approved' : 'not approved'})`,
    );
    console.log(
      `Complete application compliance: ${result.completeApplicationCompliance ? 'yes' : 'no'}`,
    );
    console.log(`Stage 3 eligibility: ${result.stage3Eligibility ? 'yes' : 'no'}`);
    console.log(
      `Missing required names: ${result.centralAuthority.missingRequiredNames.join(', ') || 'none'}`,
    );
    console.log(`Unknown names: ${result.centralAuthority.unknownNames.join(', ') || 'none'}`);
    console.log(
      `Deprecated names: ${result.centralAuthority.deprecatedNames.join(', ') || 'none'}`,
    );
    console.log(
      `Prohibited local names: ${result.centralAuthority.prohibitedLocalNames.join(', ') || 'none'}`,
    );
    console.log(`Blockers: ${result.blockers.join(' | ') || 'none'}`);
    console.log(`Warnings: ${result.warnings.join(' | ') || 'none'}`);
    console.log(
      'Boundary: values are never printed; no files, links, permissions, services, databases, or providers were modified or connected.',
    );
  }
  process.exitCode = result.exitCode;
}

main();
