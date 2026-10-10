# Geography runtime access and API startup correction

Senior decision: accept this bounded code correction for publication and hosted CI. Production application is not authorized by this review. Actual runtime grants and the resulting hosted behavior still require native verification.

The application deployment `04359c62-714d-4478-ba6d-48991879893b` failed its readiness gate at source `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`. It reached the accepted protected database, but runtime assessments reported `schema-not-congruent` and `required-schema-missing`. The frontend was not deployed. Schema and reference installation previously passed their separate inspector verification; they must not be repeated to repair this application failure.

The reviewed pre-geography runtime grant plan covers 214 application tables and SELECT on two ledger tables. The accepted schema has 221 application tables. Its seven new Place/Search Area tables are absent from that earlier grant plan. This supports a permissions hypothesis, not a claim that current production `SHOW GRANTS` has been retrieved. MySQL limits metadata visibility by object privileges, so insufficient access can make existing tables appear missing to the runtime verifier. [MySQL metadata privilege reference](https://dev.mysql.com/doc/refman/8.4/en/information-schema-introduction.html#information-schema-privileges).

A separate startup error is established by the deployment logs. Although the dashboard was staged with a direct Node command and a null configuration-file path, the deployment ran `pnpm start:hosted:api`. The root `railway.json` remained authoritative. The earlier preflight therefore did not prove the intended process startup; this packet corrects that conclusion. [Railway configuration precedence](https://docs.railway.com/config-as-code).

The correction makes two bounded changes:

- Root Railway configuration starts `node --import tsx server/_core/start.ts` and declares 30 seconds for drainage. The readiness endpoint, healthcheck budget, restart policy and migration-free startup contract remain enforced. The next hosted deployment must prove its effective command and process binding.
- A named `db:runtime-place:plan` / `db:runtime-place:apply` operation extends only `propertylistify_app_runtime` on the exact protected target. Six authority tables receive SELECT; `place_evidence` receives SELECT, INSERT and UPDATE for existing unresolved/ambiguous coverage signals. It grants no canonical Place creation, DELETE, DDL, wildcard access, worker rights, ledger writes or grant option.

The operation uses canonical authorization and connection creation. It requires the exact reviewed prior grant set, head 0111, all 112 migration checksums, no incomplete attempt, the accepted physical model and the canonical migration lock. Its execution uses a private fixed plan even if a callback mutates the caller's input. It records uncertainty before dispatch, never retries, preserves primary and cleanup failures, and returns success only after exact resulting grants, lock release and connection closure are verified. Seven acknowledged statements alone do not establish completed verification.

| Binding | Value |
| --- | --- |
| Integration base | `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b` |
| Protected target | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Grant plan | `8a99133a0e23a21e1a38aee5f6d5507779628c0b7b0a5434b9e64bf8c5f9dead` |
| Prior grant statement digest | `90c9d4aca03ac0820ebfe0fdbbbfef0617859bc6959e610be3b949ec27457fd9` |
| Resulting grant statement digest | `cc6956ba9ba51dad7ceb3678f70658d46623adf66eedcc70a951aae602ae181d` |
| Accepted physical/desired model | `a3567c76721b8c3526c83287478ce51284aa102b365435c3daf28dc6bac99b97` |
| Preserved reference release | 16,944 Places; 157,728 assertions; 720 exclusions |

[grant-plan.json](grant-plan.json) contains the exact SQL. [failure-summary.json](failure-summary.json) projects only allowlisted provider evidence. [validation.json](validation.json) and [source-hashes.json](source-hashes.json) bind the local checks to reviewed files. Native grant application and hosted verification are absent from those proofs. The pure plan reads repository authority; it is not a fresh protected database inspection.

Local validation covers the grant boundary, failed/ambiguous outcomes, cleanup, authorization and startup contracts. Full application and scoped test type checks, the database authority gate and changed-file lint are recorded separately. The initial authority run identified two stale expectations for the old startup literal; both existing tests were updated while retaining their other safety assertions. An initial scoped test type check found a duplicate assertion key; it was corrected and rerun. Neither failure established a production defect. An interrupted validation left incomplete local evidence; the completed receipts supersede it. No disposable database was initialized.

The senior owns execution and the management submission. Edward's previous application approval explicitly excluded new grants and a runner, and its incident window has ended. The amendment in [EXECUTION.md](EXECUTION.md) requires that separate scope and a fresh attended window before production actions. A PR, merge or green CI is not that authorization. The Vercel preview remains a separate unresolved check; this correction does not extend an earlier exception.

No protected database connection, permission application, schema/reference replay, further deployment, frontend change or public reopening occurred while preparing this correction. The earlier API configuration changes and failed deployment remain part of the release record. Workers, cron, publication, organisation approval, payments and automatic deployment remain held. This packet does not close national public-search performance or launch acceptance.
