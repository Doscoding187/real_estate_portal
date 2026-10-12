# Private draft authoring — reference read locks and explicit retry custody

Senior technical review: accept this bounded code correction for hosted validation. Merge and follow-up production execution are not claimed here. Base is the released PR #599 merge `f6d2e9c532b8110770777e8b20889d2b8b7f9058`.

The October 12 API/frontend release reached SUCCESS/READY on that source; its unchanged joined runtime probe passed before and after private verification. The actual controlled Agent's draft create then returned HTTP 500: MySQL refused `SELECT ... FOR UPDATE` on `place` with errno 1142 / `ER_TABLEACCESS_DENIED_ERROR`. Runtime deliberately has SELECT-only reference authority. Source inspection proves that resolution happens before the Listing insert. The inherited production QueryClient also replayed the failed create once; that request was rejected with HTTP 401 after logout. Fresh authenticated paginated owned inventory contains no proof marker. Both attempts are terminal, and sessions are logged out. No listing or media was created.

## Correction

- Read-only Place, containment edge/referent and preferred-name validation uses `FOR SHARE` in the same caller transaction. All reference locks remain; assignment/refusal rules, canonical identities, immutable reference permissions and listing-write locks remain unchanged. No reference UPDATE grant, SQL fallback, schema change, migration or reference write is added.
- Create, update and review submission explicitly disable inherited mutation retries. Media reservation/confirmation does likewise. User-controlled reconciliation retains custody after a possibly committed write. The global QueryClient and unrelated features are unchanged.
- The tests execute the real production QueryClient to expose duplicate dispatches and use real Drizzle SQL generation with a modeled SELECT-only permission boundary. Ordinary mocked API tests alone had missed the inherited retry behavior.

[MySQL's locking-read contract](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html) describes SELECT-only shared locks and the extra privileges required for update locks. Shared locks prevent concurrent modification of examined reference rows until transaction completion. Native concurrency and deployed shared-lock acceptance are not claimed by the modeled SQL test.

## Validation

- Seven selected regressions fail on the unchanged parent source with the corrected test adapters; the same seven pass on this correction.
- All 88 focused checks pass: 61 canonical Listing Place contracts, 21 wizard persistence checks, six media orchestration checks.
- Supported application typecheck and explicit touched-test typecheck pass. The latter includes the actual client test matcher declarations.
- Database authority static, canonical schema/inventory and lifecycle checks pass. Touched-file lint: zero errors, 47 warnings (including existing warnings).
- Full local application build passes using explicit production public origins/environment and the parent HEAD's full SHA as pre-commit metadata. This artifact is validation only and is not promoted. Hosted CI must bind the new commit and its own build metadata.
- Initial full build correctly refused a missing hosted SHA input; the corrected build command supplies it. An initial test-adapter failure passed an extra TanStack mutation context directly to the mock; the final adapter matches tRPC's input-only callback and obeys hook ordering. All before/after figures above are from that corrected adapter.

Database-authority status identified only the uninitialized/unreachable task-owned disposable context, fingerprint `c833275c283389c0a0a443ac02e00bef809ba67c9403eb48e7816b7101026f69`. No disposable database was initialized, native connection was added, or protected SQL/grant operation was performed for this consumer correction. Protected runtime evidence used actual requests through the reviewed existing API transport, fingerprint `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`, head `0111`.

## Release boundary

The current healthy deployment remains API `b4e06875-52db-4e64-98fe-68786b2389ec` and frontend `dpl_DAdmNUBDF9Qz436pKwak1jzJEbDb`, source `f6d2e9c5…`. The correction is a follow-up source; its hosted checks and controlled private save/image/server-restoration proof remain separate. No claim of private journey, national launch or public reopening acceptance is made. No unchanged local database suite, completed B12 observation or migration/reference/grant cycle is repeated.

Keep maintenance, email/lead/cron, payment and automatic production deployment holds. Pending runner deletion `398fb997-eeee-4b51-904e-6d4c01fd0aed` remains STAGED and excluded; its stopped service is not provisioned, resumed or deleted. The observed latest runner attempt is FAILED with no instances.

Private exact requests, provider logs, reconciliation, runtime probes and validation logs are retained under `/home/edwardspc/.local/state/property-listify/private-draft-application-release-20261012T054959Z/`. Credentials, sessions, private addresses and signed URLs remain private. Only the senior submits the application release/consumer stop record to Codex Audits.
