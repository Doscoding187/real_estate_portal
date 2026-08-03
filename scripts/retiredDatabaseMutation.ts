const command = process.argv[2] ?? 'legacy database mutation';

console.error(
  `${command} is retired by Database Authority v3 because it can bypass resolved target and worktree ownership. ` +
    'Use db:worktree:create, db:migrate:apply, and a registered operation-specific data command. ' +
    'The current listify_local database remains quarantined.',
);
process.exit(1);
