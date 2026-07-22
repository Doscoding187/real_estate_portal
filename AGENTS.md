# Property Listify Repository Agent Instructions

These instructions apply to the entire repository. Nested `AGENTS.md` files may
add stricter requirements but may not weaken this authority.

## Mandatory database rule

Before changing schemas, migrations, runtime database queries, database
services, seeds, fixtures, or database contract tests, read:

- `docs/architecture/database-authority-policy.md`
- `docs/architecture/database-compatibility-exceptions.md`

Property Listify is pre-launch. Historical migrations, experimental schemas,
test data, stale fixtures, and retired runtime models are not compatibility
requirements.

Agents must:

1. identify the canonical database authority before editing;
2. implement the strongest approved future-state model;
3. stop and audit when runtime code conflicts with canonical authority;
4. remove stale compatibility behavior inside the approved workstream; and
5. protect authority with executable validation.

Agents must not introduce or silently preserve:

- runtime schema guessing;
- catch-and-retry SQL for alternate schema shapes;
- unregistered legacy read or write fallbacks;
- parallel schema or migration authorities;
- fixtures that write retired columns or relationships; or
- compatibility exceptions Edward has not explicitly approved.

An approved exception must be registered, isolated, observable, tested, and
assigned an expiry or objective removal condition.
