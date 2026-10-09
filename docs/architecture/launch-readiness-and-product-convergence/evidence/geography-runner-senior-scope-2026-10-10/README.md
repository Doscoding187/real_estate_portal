# Senior runner preparation acceptance and scope decision

Reviewed candidate: `9004f6c309681f874d00dde3a0c0beac421030c1`.
Senior independently reran all 18 focused tests and verified eight packet checksums. The preparation is accepted; no further junior correction is requested. It is fast-forwarded into the senior task branch locally, not main. Source and schema release bindings remain unchanged.

## Selected provider path

Do not use legacy `serviceCreate`/`serviceInstanceUpdate` or immediate creation/update to resolve their contradictory environment descriptions. Select the Railway MCP **staged** workflow, whose exposed contract explicitly stages a service in one required environment and creates no live instance until commit. This chooses a separately scoped operation; it does not claim the legacy semantics were disproved.

1. Establish acknowledged cleanup custody and the fresh bounded window before any resource creation. Record the actual creation clock; staging must not silently reset lifetime.
2. Stage `create_service` with explicit project `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`, environment `63070d99-357a-40ba-99c3-6d1368f61652`, `staged:true`, unique runner name, no image/source/variables.
3. Stage only the reviewed settings for that returned service ID in that same environment. Do not set a config-file path or touch original services.
4. Inspect `get_staged_changes` and all three environment inventories. Production must contain only the intended new runner changes; Testing's existing patch and Staging must remain unchanged. No volume, existing service, shared variable or private-network alteration is accepted. Do not commit unexpected changes.
5. Commit only the inspected production patch after a final fresh check. Observe completion. With no source/image attached, this step must not start application code. Inspect the resulting empty service configuration and all environments again.
6. Enable fixed outbound networking on the new runner, verify all assigned addresses against unchanged Azure rules, and only then upload the accepted idle-runner bundle. No assumption of shared API addresses is permitted.
7. Continue the accepted connectivity and lifecycle checklist. A tool-contract mismatch, unknown result or unexpected environment effect stops execution; do not switch silently to legacy mutations.

The scope basis is the current MCP `create_service` and `update_service` descriptions for `staged:true`, required environment ID, and the `get_staged_changes` review contract. No create/update/commit was used as an experiment. Actual execution readbacks remain mandatory.

## Baseline and remaining prerequisite

Production has the four original services and no staged changes. Testing has an unrelated existing pending patch `9f607fbe-adf1-4322-b11f-302802fc9bc3`, recorded as one change from March 4; preserve it exactly. Staging has no pending patch and an old failed application deployment. Those nonproduction states are pre-existing, not this task's repair scope.

Edward's latest instruction is to proceed. Acknowledged independent cleanup custody is still absent. The accepted runner preparation explicitly requires that custody before creation to address the prior orphaned runner. No second operator has been invented or inferred from Edward's general approval. Requested the identity and availability of an actual backup operator; Edward need not operate the database.

No new runner, provider configuration, firewall rule, grant, database operation, signal, schema write or deployment was performed in this review. This record is engineering preparation, not a management submission or production acceptance.
