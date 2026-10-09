/** Inspect before a storage proof may run any mutation or fault injection. */
export async function inspectStoragePreconditions({
  connection,
  queryRows,
  tableState,
  expectedHead,
}) {
  const history = await queryRows(
    connection,
    'SELECT filename FROM `sql_migration_history` ORDER BY applied_at DESC, filename DESC LIMIT 1',
  );
  const head = String(history[0]?.filename ?? '');
  if (head !== expectedHead) {
    throw new Error(`national storage proof refused: migration head ${head} != ${expectedHead}`);
  }
  const total = await queryRows(connection, 'SELECT COUNT(*) AS n FROM `sql_migration_history`');
  const state = await tableState(connection);
  if (!Object.values(state).every(entry => entry.rows === 0)) {
    throw new Error(
      'national storage proof refused: authority tables must be empty before any mutation',
    );
  }
  return { head, migrationCount: Number(total[0].n), state };
}
