import type { NormalizedSchema } from './schemaCongruency';

/** Metadata actions cannot distinguish omitted NO ACTION from explicitly authored
 * NO ACTION. Therefore an overlap is a review requirement, never proof of admission.
 * TiDB 8.5 pkg/table/constraint.go rejects explicit FK actions on CHECK columns.
 */
export function auditTidbStructuralAdmission(schema: NormalizedSchema) {
  const checks = schema.tables.flatMap(table =>
    table.checks.map(check => {
      // Remove SQL strings before matching identifiers: a literal containing a
      // column name must not create a foreign-key dependency. Preserve backticks.
      const expression = check.expression.replace(
        /'(?:''|\\.|[^'\\])*'|"(?:""|\\.|[^"\\])*"/g,
        ' ',
      );
      const identifiers = new Set(
        [...expression.matchAll(/`((?:``|[^`])+)`|\b([a-zA-Z_][a-zA-Z0-9_$]*)\b/g)].map(match =>
          (match[1]?.replace(/``/g, '`') ?? match[2]).toLowerCase(),
        ),
      );
      const dependencies = table.foreignKeys
        .filter(key => key.columns.some(column => identifiers.has(column.toLowerCase())))
        .map(key => ({
          ...key,
          review: [key.onDelete, key.onUpdate].some(
            action => !['no action', 'restrict'].includes(action.toLowerCase()),
          )
            ? ('domain-lifecycle-decision-required' as const)
            : ('ddl-action-provenance-required' as const),
        }));
      return {
        tableName: table.name,
        constraintName: check.name,
        dependencies,
        status: dependencies.length ? ('blocked-for-review' as const) : ('no-fk-overlap' as const),
      };
    }),
  );
  // One FK may participate in several predicates. Review and plan it once,
  // retaining every predicate that depends on its referential behavior.
  const foreignKeyImpacts = checks
    .flatMap(check =>
      check.dependencies.map(dependency => ({
        tableName: check.tableName,
        ...dependency,
        requiredByChecks: checks
          .filter(
            candidate =>
              candidate.tableName === check.tableName &&
              candidate.dependencies.some(key => key.name === dependency.name),
          )
          .map(candidate => candidate.constraintName)
          .sort(),
      })),
    )
    .filter(
      (impact, index, all) =>
        all.findIndex(
          candidate => candidate.tableName === impact.tableName && candidate.name === impact.name,
        ) === index,
    )
    .sort((a, b) => `${a.tableName}.${a.name}`.localeCompare(`${b.tableName}.${b.name}`));
  return {
    provider: 'tidb' as const,
    desiredDigest: schema.digest,
    scope: 'check-foreign-key-interactions' as const,
    // This audit does not establish complete SQL dialect compatibility.
    admitted: checks.every(check => check.status === 'no-fk-overlap'),
    foreignKeyImpacts,
    checks,
  };
}

export function assertTidbStructuralAdmission(schema: NormalizedSchema): void {
  const report = auditTidbStructuralAdmission(schema);
  const blocked = report.checks.filter(check => check.status === 'blocked-for-review');
  if (blocked.length) {
    throw new Error(
      `TiDB structural admission refused: ${blocked.length} CHECK/FK interactions require reviewed provider proof before mutation: ${blocked.map(check => `${check.tableName}.${check.constraintName}`).join(', ')}.`,
    );
  }
}
