# Property Listify Repository Agent Instructions

These instructions apply to the entire repository. Nested `AGENTS.md` files may
add stricter requirements but may not weaken this authority.

## Land consumer journey rule

For public Land search or authoring work, read
`docs/architecture/land-consumer-journey-contract.md`. Land geography has one
authority per request: typed city/province, one canonical location, sibling OR
locations, or a governed Search Area. Agents must reject mixed authority
inputs; they must not choose a precedence, merge scopes, widen geography, or
fall back to display-text geography. Public classifications must remain the
central `LAND_PUBLIC_CLASSIFICATIONS` allow-list.

## Mandatory database rule

For database-related agent work, load
`.agent/skills/property-listify-database-authority/SKILL.md`, then read
`docs/database-authority/00-database-authority-agent-entry.md` and run
`pnpm db:authority:status`. The skill is an operating guide only; repository
authority remains canonical.

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
