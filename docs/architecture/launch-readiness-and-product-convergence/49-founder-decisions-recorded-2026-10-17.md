# Founder decisions recorded — 17 October 2026

17 October 2026. Records Edward's answers to the [packet 47 decision briefs](47-founder-decision-briefs-2026-10-17.md)
against the gates they release, with the provider-document evidence retrieved
during the session. Documentation only: no deployment, protected connection,
purchase, provider mutation or paid activation is performed or authorized here,
and the register's acceptance statuses and paid-opening NO-GO are unchanged.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `FOUNDER-DECISIONS-RECORDED-2026-10-17` (launch-readiness packet 49) |
| Base | `main` at `bc0df389d` (contains packet 48 via PR #641) |
| Worktree / branch | `property-listify-founder-decisions-20261017` / `docs/founder-decisions-20261017` |
| Boundary | Repository documentation and the launch register only. The session read founder-held provider documents (Railway/Resend DPAs, Azure billing readback) outside the repository; no hosted target, database, provider configuration or payment was touched. |
| Reviewer action | Check each decision against the evidence folder [founder-decisions-2026-10-17](evidence/founder-decisions-2026-10-17/answers.md) and the register section added by this packet. |

## Recorded decisions

| Brief | Founder decision | Recorded evidence |
| --- | --- | --- |
| D1 — support channels | `support@propertylistifysa.co.za` (support/privacy) and `info@propertylistifysa.co.za` (general) remain the designated channels, but the mailboxes are **not available yet** and return together with the hosted runtime. Inbound/reply demonstration moves into the D2 email window. | Answers ledger; packet 37 operating card unchanged |
| D2 — B10 email accounts | Consented test recipient: `enetechsa@gmail.com`. Proposed sender default `Property Listify <mail@propertylistifysa.co.za>` (hosted configuration precedent); supervised receipt/reply/bounce/restart window scheduled when hosting resumes, attended. | Answers ledger; `hostedRuntimeConfiguration.test.ts` sender precedent |
| D3 — provider contracts | **a)** Railway DPA **executed 2026-10-17** (DocuSign envelope `FE99225B-762F-81FE-83C9-12D3C3B5A116`). **b)** Azure account is the upgraded individual account under billing name Lehlohonolo Banda, directory ENETECHS, Microsoft Customer Agreement — Microsoft's Data Protection Addendum applies. **c)** Resend DPA retrieved (Plus Five Five, Inc.; binds on acceptance; no countersignature required). **d)** Vercel stays on Hobby for the controlled release; upgrade decision deferred to after launch — revisit before paid/commercial opening. | [provider-documents.md](evidence/founder-decisions-2026-10-17/provider-documents.md) (envelope IDs and hashes; PDFs held outside the repository) |
| D4 — B17 F7 package | Provisional forecast floor **accepted** (10,000 listings, 2,000 users, 100 developments, 50,000 leads, 250,000 events with skew); recovery objectives **accepted** (application recovery ≤30 min; in-region RPO ≤15 min / RTO ≤4 h; regional ≤24 h with off-region custody); restore budget **minimal** — bounded temporary resource only after verified quote readback, any excess remains a `FOUNDER SPEND GATE`; backup destination = separate same-region (Cape Town) bucket. | Answers ledger; packet 45 runbook; local calibration packets 43–44 |
| D5 — hosted admission | Static-egress gate **withdrawn**: no static outbound IP is required, so no Railway Pro upgrade is authorized or needed for B08 admission. Operators: **Edward only** (release/data, database, reviewer) with the alert recipient on the same person. Window: runs when hosting resumes, supervised by Edward. | Answers ledger; supersedes the September dependency at [register:112](#b08-protected-database-disposition--2026-09-24) |
| D6 — af-south-1 provisioning | **Approved**: domestic private proof bucket plus separate same-region backup bucket under the existing aggregate usage approval, packet-29 pattern; leaf eu-north-1 bucket and canary retained. Execution remains an attended CloudShell run with names proposed at the run. | Answers ledger; packet 39 domestic arrangement; packet 29 provisioning pattern |
| D7 — finance facts | Financial year-end = **last day of February** (28 February; 29 February in leap years). No necessary tax-record flow remains foreign once proofs are domestic; **EFR001 is not needed**. Per-record return state (filed/outstanding/not required) is captured by the retention selector from each record's actual state. | Answers ledger; `financeRetentionPolicy.test.ts` leap-day and fail-closed coverage |

## Evidence and custody

- Provider PDFs are **not committed** to the repository. They contain the
  founder's address, phone number and signatures; the repository records the
  DocuSign envelope IDs and SHA-256 hashes instead, and the originals stay in
  the founder's document custody.
- The Azure billing readback (invoice `G189602221`, period 9/11–9/30/2026,
  $0.00 Paid) was reviewed from a founder screenshot; the screenshot is not
  committed.
- Recorded provider fact used by the privacy record: Railway stores
  runtime/HTTP/deploy/build logs for 90 days in US West, including client IP
  addresses, non-configurable and non-deletable early (Railway staff
  confirmation, October 2026). The executed Railway DPA with EU SCCs and the UK
  addendum covers those transfers.

## Effective changes and remaining work

| Gate | Effect of these decisions | Remaining execution |
| --- | --- | --- |
| B08 hosted admission | September static-egress dependency removed; no Pro spend line | Protected apply/verify and API/worker admission under the controlled release; window when hosting resumes |
| B10 / B13 delivery | Recipient and sender default fixed; real-delivery proof still outstanding | Supervised window real receipt/reply/bounce/restart |
| B11 / B15 storage | af-south-1 provisioning authorized | Attended provisioning + readback run, runtime denial/positive probes, synthetic recovery |
| B15 finance | Storage-condition facts supplied; EFR001 closed as not needed | Hosted acceptance per packet 40 remains |
| B17 capacity/recovery | Forecast, objectives, budget posture and backup destination recorded | Admitted hosted window (driver candidate merged in packet 48); recovery resource only after quote readback |
| LRC-SUPPORT-001 | Channel designation confirmed; availability deferred with the hosted runtime | Mailbox availability and one inbound/reply demonstration in the D2 window |
| Vercel | Hobby retained for the controlled release | Revisit plan before paid/commercial opening (B18 re-check) |

## Boundaries and register effect

This packet records founder decisions and adds their visibility to the launch
register. It changes no acceptance scope, grants no hosted or paid execution,
and leaves B08–B18 execution dispositions, LRC-SUPPORT-001 status and the paid
opening NO-GO in place. Each affected gate still requires its own execution and
evidence. Future packets must not re-ask D1–D7; the small residuals are the D2
sender confirmation, the D6 attended run, and the Vercel plan check before
commercial opening.
