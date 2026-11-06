# Runtime grant plan bound to migration 0197

**Status: review plan only. No database connection, grant, or revoke is performed.**

This plan covers the 15 application tables absent from the established 0094
provisioner, the seven-table canonical Place extension, and the three-table
legal extension. The generated plan is bound to the 198-entry migration
manifest ending at `0197_drop_seller_prospects_province.sql`, manifest digest
`4995e36715e60856bb87d925dd0eff03bcdccfcc50e1180648684c3bd2787e41`, and the
225-table canonical model digest
`869f441f3131b0f1bf4b56d416d049292bb48204918f8172d3699625c3208da7`.

## Operation matrix

All 15 tables below were added after 0111. Privileges are the minimum observed
from current runtime call sites, except `development_inventory_items`: Edward
requested SELECT, and no runtime read call site was found in this source tree.

| Table | Runtime privileges | Evidence in source |
| --- | --- | --- |
| `development_inventory_items` | SELECT | `drizzle/schema/developments.ts:850` declares the table; no runtime call site found. SELECT is explicitly requested by Edward. |
| `development_place_assignments` | SELECT, INSERT, UPDATE | `server/services/developmentPlaceAssignmentService.ts:126,171,185`; `server/services/developmentSalesProjectionService.ts:435-443` |
| `development_team_contacts` | SELECT | `server/services/developmentSalesProjectionService.ts:435-443` |
| `distribution_deal_document_deliveries` | SELECT, INSERT, UPDATE | `server/services/distributionDealDocumentsService.ts:1207,1231,1502` |
| `distribution_listing_lead_queue` | SELECT, INSERT, UPDATE | `server/services/distributionListingLeadQueueService.ts:16-22`; `server/distributionRouter.ts:4824,4966,5043,5103` |
| `distribution_listing_lead_queue_events` | SELECT, INSERT | `server/services/distributionListingLeadQueueService.ts:30`; `server/distributionRouter.ts:4864,4974,5052,5115` |
| `distribution_prospect_check_fit_matches` | SELECT, INSERT, DELETE | `server/services/distributionProspectCheckFitService.ts:289-296,360-365` |
| `distribution_prospect_check_fits` | SELECT, INSERT, UPDATE | `server/services/distributionProspectCheckFitService.ts:243-296,514-521` |
| `distribution_referral_intake_events` | SELECT, INSERT | `server/services/distributionReferralIntakeWorkflowService.ts:220,356,633`; `server/services/distributionReferralEvidenceRetentionService.ts:121,251,295` |
| `distribution_referral_intake_evidence` | SELECT, INSERT, UPDATE | `server/services/distributionReferralIntakeWorkflowService.ts:336,630`; `server/services/distributionReferralEvidenceRetentionService.ts:201,227,277` |
| `distribution_referral_intake_policy_releases` | SELECT, INSERT, UPDATE | `server/services/distributionReferralIntakePolicy.ts:84,167,193,256`; `server/services/distributionReferralIntakeWorkflowService.ts:129` |
| `distribution_referral_intake_sessions` | SELECT, INSERT, UPDATE | `server/services/distributionReferralIntakeWorkflowService.ts:205,215,621,771`; `server/services/distributionReferralEvidenceRetentionService.ts:106` |
| `distribution_referrer_search_assessments` | SELECT, INSERT, UPDATE | `server/services/distributionReferrerSearchAssessmentService.ts:178,198,263,297` |
| `distribution_selected_practitioners` | SELECT, INSERT, UPDATE | `server/distributionRouter.ts:1697,1764-1779`; UPDATE is required by the upsert `onDuplicateKeyUpdate` path. |
| `service_provider_review_reports` | SELECT, INSERT, UPDATE | `server/services/servicesEngineService.ts:1548,1579,1752` |

No table requires a database-wide grant, DDL privilege, or `GRANT OPTION`.

## SQL shape

The offline generator emits one explicit table-scoped grant for each matrix row
and the matching table-scoped revoke for each grant. The revoke is the exact
inverse for a grant that this plan successfully applied. Before any future
apply, the read-only probe must establish the baseline; if a requested direct
table privilege already exists, derive a delta plan and its inverse from that
baseline. Do not use a blanket cleanup or revoke any database, global, role,
column, or unrelated table privilege from this plan. The MySQL `REVOKE`
grammar treats `REVOKE ALL PRIVILEGES, GRANT OPTION` as an account-wide form,
so this plan does not combine it with a table `ON` clause.

**Re-derive this plan if the live probe shows database-wide, global,
role-derived, or other broad grants.** Table-level revokes cannot remove those
broader paths, and this plan must not be applied until a live read-only probe
establishes the complete grant shape.

## Partial-failure reconciliation

The separate read-only checker first prints `CURRENT_USER()` and `SHOW GRANTS`,
then issues `SELECT * FROM propertylistify_database.<table> LIMIT 0` for each
of the 225 tables in the pinned canonical inventory. It records a table as
denied only for MySQL's table-access-denied error; connection, inventory, and
other SQL errors stop the run. It reads no table rows and makes no database
changes.

After any future authorized attempt, do not retry or infer success from the
number of acknowledged statements. A separate read-only inspection must:

1. query `SHOW GRANTS FOR 'propertylistify_app_runtime'@'%'`;
2. compare every result against the approved 0197 plan and the previous 0094,
   canonical Place, and legal grant sets;
3. reject global/database-wide privileges, role grants, column grants,
   `GRANT OPTION`, unknown table names, and any privilege outside the reviewed
   matrix; and
4. report per-table `SELECT`, `INSERT`, `UPDATE`, and `DELETE` state for all
   225 canonical application tables without performing writes.

If any result is partial or broader than the reviewed direct table grants,
stop, preserve output, and re-derive the plan before another operation. The
plan module itself intentionally contains no connection or apply function.
