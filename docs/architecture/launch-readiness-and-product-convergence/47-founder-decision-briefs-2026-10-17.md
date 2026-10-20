# Founder decision briefs — one-screen owner asks

17 October 2026. Preparation only; **no register change, no hosted action, no
spend**. This packet consolidates every currently open founder decision or
owner-supplied fact into one-screen briefs so an unblock is immediate and does
not require re-reading packets 24–45. It also records the items Edward has
already decided, so nothing closed is requested again. Register records are not
rewritten here; each brief names the gate it would release and the evidence
already prepared.

Sources: [register](03-launch-register.md) rows B08–B18 and LRC-SUPPORT-001;
[plan 24](24-paid-mvp-launch-closure-execution-plan.md) F1–F9;
[packets 27](27-controlled-production-release-2026-09-30.md) /
[28](28-controlled-owner-admission-and-execution-2026-09-30.md) /
[29](29-mvp1-aws-storage-hardening.md) /
[30](30-shared-hosted-closure-packet-2026-10-12.md) /
[31](31-held-worker-admission-procedure-2026-10-12.md) /
[34](34-b15-legal-acceptance-authority-2026-10-12.md)–[40](40-b15-controlled-installation-and-hosted-verification-2026-10-13.md) /
[42](42-hosted-parity-rehearsal-pack-2026-10-17.md) /
[45](45-b17-hosted-window-runbook-2026-10-17.md);
[packet 41](41-launch-register-integration-reconciliation-2026-10-17.md) remains
the current integration reconciliation.

## Already decided — do not re-ask

| Item | Recorded decision |
| --- | --- |
| Customer copy | Bundle `property-listify-legal-2026-10-13.1` (Terms/Privacy `2026-10-13.1`) approved under Edward’s “just approve the one thats there and proceed”; repeat approval and certificate replacement are unnecessary (packets 36, 38, 39). |
| Finance-record location | Founder-selected domestic arrangement: required finance records and proofs in dedicated South African storage; Azure rows already SA North; new private object target AWS Cape Town (`af-south-1`) with a separate same-region backup bucket; billing emails are neutral notifications (packet 39:63-80). |
| Incremental usage | US$15/month aggregate incremental usage approved; existing USB destination recorded; do not request again (packet 28:25). It is an aggregate target, not a per-service cap or enforced limit (packets 27, 29). |
| Fresh accounts / no import | Fresh Azure accounts; TiDB retained read-only as encrypted archive; no legacy-account import (register B09; packet 28:28 archive/USB custody; [fresh-account transition](../../database-authority/azure-fresh-account-transition-2026-09-29.md)). |
| Payment terms | Manual-EFT owner/product and 90-day offer accepted (register B01, closed). |
| AWS cost alerts | Budget created and all three recipient readbacks passed; `finances@propertylistifysa.co.za` is the notification recipient; do not recreate (packet 29:143,224-234,274). |
| Private-proof bucket (existing) | `listify-paid-proofs-914683204061-eun1-290496c0` (eu-north-1) provisioned, tested and bound; retain it and its canary; the “do not provision another bucket/user” instruction applied to that eu-north-1 design and is superseded only by the domestic arrangement below (packets 29:185-197, 39:15). |
| Vercel/frontend settings | Existing Vercel dashboard operator confirmed/saved the Production media setting; no Vercel upgrade or new staging app required for the controlled release (packets 27:3, 28:25, 29:144-153). |
| Shared-closure worker fix | PR #601 (`feat/launch-shared-closure-20261012`) merged 2026-10-12; B16 remains open only for hosted execution under packet 30 H0–H10. |

## Decision briefs

Answer format and consequences are stated per brief. A copy-paste answer sheet
is at the end.

### D1 — Support and privacy channel confirmation (LRC-SUPPORT-001, F4)

| Field | Detail |
| --- | --- |
| Ask | Confirm `support@propertylistifysa.co.za` (support/privacy cases) and `info@propertylistifysa.co.za` (general enquiries) are the operating monitored channels — live mailboxes, owner-held access, reviewed cadence — or name replacements. |
| Why it is open | Register LRC-SUPPORT-001 remains `in progress`, blocked on “owner-supplied support channel and final legal authority” (register:797-819; packet 41:76,108). Copy approval is now complete (packets 38-39), so the remaining substantive item is the monitored channel. |
| Prepared already | B14 operating card assigns the two mailboxes and the review procedure ([packet 37:54-75](37-b14-offline-operating-card-2026-10-13.md)); durable `/contact` queue and runbook exist (register:808-810; [packet 18](18-assisted-onboarding-queue-runbook.md)). |
| Answer format | “D1: support@ and info@ are live and monitored — yes/replace with ___” plus one inbound-access demonstration during the D2/B10 hosted email work. |
| If deferred | LRC-SUPPORT-001 stays open; public onboarding cannot claim a monitored support route; intake remains contained. |
| Spend | None. |

### D2 — B10 email real-delivery accounts and supervised window (F4)

| Field | Detail |
| --- | --- |
| Ask | Approve the exact sender identity(ies) on the verified Resend domain and supply consented recipient accounts (Edward-owned mailboxes/aliases; one mailbox with tested aliases suffices), then schedule the supervised worker window for real receipt, reply, bounce and restart proof. |
| Why it is open | Register B10: “provision existing-project supervisor and prove real receipt, retry/bounce and restart” (register:78); hosted items confirmed outstanding in packet 42:72 and packet 31:139-145. |
| Prepared already | Transactional outbox, invitation/account mail implementation and worker supervisor with machine-readable attention flags ([packet 42:55-57](42-hosted-parity-rehearsal-pack-2026-10-17.md)); held email service row with admission command and restart NEVER ([packet 31:76](31-held-worker-admission-procedure-2026-10-12.md)); verified sending domain. |
| Answer format | “D2: sender = ___; test recipients = ___; window = ___” (attended, per packet 27:101 no after-hours inference). |
| If deferred | B10/B13 hosted delivery stays open; agency invitations and account mail cannot claim real delivery (register:97). |
| Spend | None expected; Resend allowance/overage is inside the aggregate approval and must be reconciled (packet 28:69). |

### D3 — Provider contract execution and account coverage (F1/F5 residue)

| Field | Detail |
| --- | --- |
| Ask | (a) Retrieve the executed Railway DPA through the existing account or complete its standard DocuSign path; (b) confirm which company/subscription agreement covers the Azure MySQL account; (c) retrieve the Resend account DPA copy; (d) read back the actual Vercel plan — if Hobby, choose a permitted commercial plan or a reviewed hosting change. |
| Why it is open | Packet 39 classifies the Railway written agreement as not yet evidenced and the Vercel plan as unverified; both are “conditionally launchable” once recorded (packet 39:14,18,91-92). Personal-data admission under the controlled release depends on this. |
| Prepared already | Provider inventory with exact links and assessments (packet 39:7-36); AWS service terms already incorporate the AWS DPA (packet 39:15); no countersignature needed for Resend (packet 39:17). |
| Answer format | Four short statuses: “D3a executed/exists/start form; D3b account=___; D3c retrieved/available; D3d plan=___ → decision=___”. |
| If deferred | Affected personal-data flows stay contained under the controlled release; no hosted intake switch is claimed. |
| Spend | Only if Vercel must move off Hobby — that would be a separate spend decision; no upgrade is performed by this brief. |

### D4 — B17 F7 package: forecast, objectives, restore budget, backup destination

| Field | Detail |
| --- | --- |
| Ask | (a) Accept the provisional workload floor or supply the first-cohort/90-day forecast before the 24-hour exercise; (b) accept the measured recovery objectives (application recovery ≤30 min; in-region RPO ≤15 min / RTO ≤4 h; regional ≤24 h with off-region custody); (c) approve the temporary recovery resource after quote readback and set the maximum temporary spend; (d) confirm the independent backup destination and that restore-region quota/capacity can actually be provisioned. |
| Why it is open | Register B17 requires the representative 24-hour workload and independent application recovery (register:85); packet 45 entry criteria F4/F7: monitored alert recipient bound, explicit objectives, temporary restored-server and independent-backup costs approved (packet 45:46-55,231-232). |
| Prepared already | Hosted-window runbook with phases A–D and abort rules ([packet 45](45-b17-hosted-window-runbook-2026-10-17.md)); recovery resource proposal `pl-paid-mvp-recovery-20261001` — PREPARED, NOT CREATED, NOT APPROVED, 4-hour attended lifetime, 20 GiB, no public bindings, quote **not verified** ([recovery-resource.proposed.json](evidence/controlled-production-release-2026-09-30/recovery-resource.proposed.json)); local load calibration across read/write/lease latencies (packets 43-44, [rehearsal-60s-5rps.json](evidence/b17-load-rehearsal-metrics-2026-10-17/rehearsal-60s-5rps.json)); existing USB custody already recorded — do not re-ask (packet 28:25). |
| Answer format | “D4: forecast=provisional floor/accepted values; objectives=accepted/revised; restore budget cap=R___; backup destination=___; quota confirmed=yes/no”. |
| If deferred | B17 stays open; no 24-hour, backup or restore claim is made; hosted window cannot start (packet 45 entry gate). |
| Spend | Only after the verified quote: bounded temporary Azure restore resource (~4 h) plus independent backup copy; unapproved additions remain `FOUNDER SPEND GATE`. |

### D5 — Hosted execution admission package (F1/F2/F8)

| Field | Detail |
| --- | --- |
| Ask | (a) Resolve the recorded September static-egress gate: withdraw it, or approve Railway Pro / static outbound IPs (published $20/month including $20 usage; Hobby baseline $5) before B08 worker admission; (b) name the release/data operator, the database operator for Phase C, and the senior reviewer available for Phase A close; (c) approve the staffing calendar/absence plan and choose the staffed cutover window for when hosting resumes. |
| Why it is open | Register records “next B08 dependency is FOUNDER SPEND GATE: Railway Pro / Static Outbound IPs” (register:112-115); packet 30 requires current per-service egress/firewall evidence to be mapped (packet 30:66); packet 45 entry criteria require named operators and a founder-held alert path (packet 45:50-56,89-91). Current controlled-release packets reuse existing Railway with no upgrade, so the gate needs an explicit founder disposition either way. |
| Prepared already | Held API/email/lead service rows with admission commands and reviewed network scope (packets 30-31); capacity/pricing record for the static-egress design (plan 24:642); runbook roles table and protected-action list (packet 45). |
| Answer format | “D5: egress=withdrawn/approve Pro/defer; release-data operator=___; database operator=___; reviewer=___; window + calendar=___”. |
| If deferred | B08/B12/B16 hosted admission and the packet-45 window stay held; no connectivity claim is made from local evidence. |
| Spend | Only if Pro/static egress is approved: ~US$20/month, inside the recorded aggregate approval but currently unapproved as a specific line; the device/account readback still applies. |

### D6 — Authorize `af-south-1` private proof and backup provisioning (B11/B15)

| Field | Detail |
| --- | --- |
| Ask | Authorize provisioning of the domestic private proof bucket (AWS Cape Town) plus a separate same-region backup bucket with a scoped runtime identity and encryption/versioning/blocks per packet 29 pattern, under the existing aggregate usage approval; retain the eu-north-1 bucket and its canary unchanged. Operator (Edward) attendance via existing CloudShell access is required for the run. |
| Why it is open | Packet 39 records the domestic arrangement as “intended/prepared, not a completed migration” with hosted overseas proof writes/retrieval blocked until the domestic target exists (packet 39:63-73); packet 42 holds “production-equivalent domestic bucket (af-south-1) provisioning and real credentials” as a B15/hosting item (packet 42:71). |
| Prepared already | Provisioning/verification programs and readback pattern from the eu-north-1 run ([packet 29:185-223](29-mvp1-aws-storage-hardening.md)); local S3 rehearsal and durability tests ([packet 42:45-46,59-63](42-hosted-parity-rehearsal-pack-2026-10-17.md)); private retention rules (current + noncurrent versions retained; no automatic deletion). |
| Answer format | “D6: approved/defer — primary bucket name preferred=___; backup same-region=yes(default)/other=___”. |
| If deferred | New paid proof intake stays contained; B11 isolation/restart/independent-recovery proof cannot run; B15 finance-flow condition stays open (packet 39:90). |
| Spend | Small S3 storage/requests inside the aggregate approval; af-south-1 unit rates to be recorded in the provisioning readback; no enforced cap — alerts notify only. |

### D7 — Finance operator facts and SARS residual (B15)

| Field | Detail |
| --- | --- |
| Ask | Supply the real financial year-end and return state (needed to compute disposal dates; no date is guessed), and confirm that no necessary tax-record flow remains foreign once billing emails are neutral and proofs move domestic — otherwise authorize the prepared EFR001 application facts (private taxpayer/representative/access declarations) for the specific remaining flow. |
| Why it is open | Packet 39 states the actual year end/return state are “operator records still needed”; the foreign-storage condition is a launch blocker for the affected finance flow until the domestic arrangement is verified or an authorisation exists (packet 39:46,53,57-82,90). |
| Prepared already | Finance retention selector fails closed and needs only the facts; domestic arrangement implemented behind guards; neutral billing emails implemented locally; SARS application notes with only private declarations missing ([packet 39:82](39-b15-provisional-policy-and-material-launch-conditions-2026-10-13.md)). |
| Answer format | “D7: year-end=___; returns current=yes/no; residual foreign flow=none/define; EFR001=not needed/authorize”. |
| If deferred | Paid proof intake remains contained; disposal dates cannot be computed; the finance send/retain path stays a B15 blocker. |
| Spend | None; EFR001 is an administrative process, not a purchase. |

## Standing items that need no new decision now

| Item | State |
| --- | --- |
| B16 / shared closure | Fix merged (PR #601); remaining work is the packet 30 H0–H10 hosted execution, gated on D5. |
| B13 lead custody | Local drain/backoff rehearsed; hosted cron, correct-recipient delivery and operator follow-up await D1/D2/D5. |
| B09 transition | Archive, USB custody and freeze evidence complete; old-session invalidation and writer freeze execute during the controlled transition — no owner decision outstanding. |
| B18 / paid opening | Still NO-GO; separate founder GO after upstream gates (register:86, packet 41:109). |
| Formal F5 copy fields | Closed by the approved `2026-10-13.1` bundle; only D7 operational facts and D3 provider coverage remain. |

## Answer sheet (copy-paste)

```
D1 support channel: support@/info@ live & monitored = yes / replace: ___
D2 sender + test recipients + supervised window: ___
D3a Railway DPA: executed / exists / start form
D3b Azure account/agreement coverage: ___
D3c Resend account DPA copy: retrieved / available
D3d Vercel plan: hobby / pro / enterprise -> decision: ___
D4 forecast: provisional floor / values: ___
D4 objectives: accepted / revised: ___
D4 restore budget cap + backup destination + quota: ___
D5 egress: withdrawn / approve Pro / defer
D5 operators: release-data=___ database=___ reviewer=___
D5 window + staffing calendar: ___
D6 af-south-1 provisioning: approved / defer; names: ___
D7 year-end / returns / residual foreign flow / EFR001: ___
```

## Boundaries and register effect

No deployment, protected connection, purchase, provider mutation or paid
activation is performed or authorized by this packet. It changes no register
record: B08–B18 remain OPEN, LRC-SUPPORT-001 stays `in progress`, and paid
opening stays NO-GO. Answers recorded against these briefs become founder
decisions for the next reconciliation; each affected gate still requires its
own execution and evidence.
