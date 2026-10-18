# B17 window and load-driver admission package

18 October 2026. Records Edward's three B17 window decisions from this session
(write mix, rate plan, operational card), admits the packet-48 hosted load
driver under the packet-45 runbook's "separate reviewed record" requirement,
and drafts the window admission record that becomes effective only when
hosting resumes and the remaining entry criteria are met. Documentation only:
no window is open, no hosted target, credential or spend is touched, and
B08–B18, LRC-SUPPORT-001 and the paid-opening NO-GO are unchanged.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `B17-WINDOW-ADMISSION-2026-10-18` (launch-readiness packet 53) |
| Base | `main` at `7706e93bc` (contains packet 52 via PR #645) |
| Worktree / branch | `property-listify-b17-admission-20261018` / `docs/b17-admission-20261018` |
| Governing text | Packet 45 runbook entry criteria and driver admission bullets ([45](45-b17-hosted-window-runbook-2026-10-17.md)); packet 48 candidate and open items ([48](48-b17-hosted-load-driver-candidate-2026-10-17.md)); packet 49 D4/D5 ([49](49-founder-decisions-recorded-2026-10-17.md)) |
| Boundary | Repository documentation only. No hosted environment, provider, payment, credential, restore, deployment or protected action was accessed or changed. The driver suite was re-run locally. |
| Reviewer action | Check the three decisions against the recorded session answers, verify the pinned module hashes and re-run the driver suite; confirm the window admission record is explicitly ineffective until hosting resumes. |

## Session decisions (W1–W3)

Recorded in session; D1–D7 are not re-asked (packet 49).

| Decision | Recorded answer | Consequence |
| --- | --- | --- |
| W1 — write mix | **Read-only plus the smoke write.** The window runs public reads at the admitted rates; the existing view-counter smoke write is enabled explicitly for the window (`--enable-smoke-write`). This is the explicit alternative permitted by packet 48 open item 1. | No hosted write-volume claim is made; write-path latency remains covered by the local calibration of packets 43–44 only. The write is irreversible on the candidate target and must never be pointed at customer production. |
| W2 — rate plan | **Provisional plan accepted as the accepted plan**: 5 req/s sustained, two 15-minute 20 req/s peaks at T0+6h and T0+18h, one 30-minute 40 req/s double peak at T0+12h (522,000 scheduled requests over 24h). | The driver's `PROVISIONAL_RATE_PLAN` stands unchanged. Any replacement must be a reviewed amendment written before the test and loaded via `--rate-plan` (hard cap 40 rps). |
| W3 — operational card | **Drafted defaults accepted** (incident log, abort channel, escalation, coverage) — see the operational card below. | Packet 45 entry criterion 6 is prepared; the log is opened at T-2 in the window execution. |

## Hosted load driver admission record

Status: **ADMITTED** for the B17 window by this reviewed record, subject to this
packet's merge. The admitted candidate is the packet-48 driver at base
`7706e93bc`, pinned by module hash:

| Module | SHA-256 |
| --- | --- |
| `scripts/hostedLoadDriver/schedule.ts` | `2339234110f04baf41f37f6e5268aab50f05ff82fc02df65b8fb5f2498b3bfa6` |
| `scripts/hostedLoadDriver/config.ts` | `2f2dc286714087c69344b5a4f028de41460b8d070cdd185dddbf0603229f946c` |
| `scripts/hostedLoadDriver/scenarios.ts` | `107303592a51bd60a728feedc82ad1ee1791491f7dc5ab5ce1835f5705b48ef7` |
| `scripts/hostedLoadDriver/driver.ts` | `7b5bfc4d7ebdaa607b7c671f02bd9ae0a3460627e6619fcbdbe11895b891a7fc` |
| `scripts/hostedLoadDriver/run.mts` | `5339e40445224c09a632f85f671086cdf08c91467104d5fb157a45f54a51e431` |

Any driver change after this record is a new candidate and requires a new
reviewed admission before it may run against a hosted target.

### Runbook admission-bullet mapping

| Packet-45 admission bullet | Admitted state |
| --- | --- |
| Open-model scheduling, no closed-loop self-throttling | Satisfied: wall-clock due times from the rate plan; the in-flight cap is a hard safety valve and its drops are recorded and fail the run. |
| Profile parity incl. approved representative write mix | Satisfied for the four calibrated read shapes. Per W1 the write mix is the smoke write only; the no-write-volume claim is recorded, not waived silently. |
| Provisional rates unless an accepted forecast replaces them | Satisfied by W2; the encoded plan stands and cannot exceed 40 rps from any replacement file. |
| Single abort switch and hard stop at T0+24h | Satisfied: `--abort-file` plus SIGINT/SIGTERM stops dispatch immediately (exit 3); duration is hard-capped at 86,400 seconds. |
| No credential, payment or protected-action capability | Satisfied: public read procedures and the one admitted smoke write; cookies/credentials omitted. |

Driver evidence JSON stays 0600 and keeps its
`hosted-load-driver-run-not-an-admitted-window` self-label, which remains
accurate: a driver run is not itself the admitted window. The window admission
below is the separate record.

## Window admission record (drafted — NOT EFFECTIVE)

This record becomes effective only when hosting resumes and the founder
schedules the window. Until then it grants nothing.

| Packet-45 entry criterion | State at 18 October 2026 |
| --- | --- |
| 1. Exact accepted candidate (B16 SHAs + Database Authority fingerprint) | Open; B16 hosted execution is a hosting-resume item. The exact tuple is fixed at scheduling. |
| 2. Plan 24 §B17 prerequisites: B08 admitted target, B09 data treatment, B11–B14 readiness, forecast and objectives | Forecast floor, objectives and backup destination accepted (D4). B08/B09/B11–B14 remain with the hosting resume. |
| 3. Founder approvals F4/F7: alert recipient bound, objectives in writing, restore costs, quota | Objectives in writing (D4). Alert recipient is Edward (D5) but the continuous provider binding is a hosting-resume execution. Temporary restore cost waits on a verified quote readback; any Railway Redis backup charge stays a `FOUNDER SPEND GATE`. |
| 4. Named operators | Recorded (D5): Edward is release/data operator (F1), database operator for Phase C and senior reviewer; availability is confirmed at scheduling. |
| 5. Tooling admitted | `pnpm launch:probe` exists; the hosted load driver is admitted by this packet. Satisfied. |
| 6. Operational readiness | Operational card below accepted (W3). The incident log is opened at T-2. |

At scheduling the execution record must fix the exact target, the B16 tuple,
the command line (`--target`, confirmation host, `--enable-smoke-write`) and
the alert binding readback.

## Operational card (entry criterion 6, accepted as W3)

- **Incident log**: UTC-timeline markdown at
  `evidence/b17-hosted-window-<YYYY-MM-DD>/incident-log.md`, opened at T-2 and
  carried through the window; entries for T0, every abort/escalation/decision,
  alert receipts and operator responses. A working copy may live on the
  operator host and is reconciled into that file at close.
- **Abort channel**: the driver's `--abort-file` path plus SIGINT/SIGTERM on
  the driving terminal are the single agreed switch; abort stops dispatch
  immediately, records the reason in evidence and exits 3.
- **Escalation**: Edward is the operator and alert recipient (D5); escalation
  is Edward → senior review at any abort, protective stop, or Phase A close.
- **Coverage**: Edward on call; weekend unattended load is acceptable only with
  the bound continuous alert coverage of the monitoring contract — a laptop or
  local script is not continuous monitoring.
- **Phase D response**: alert receipt time and the operator action taken are
  recorded in the incident log.

## Retained gaps and explicit non-claims

| Item | State |
| --- | --- |
| Window opened / executed | No; drafted admission is ineffective until hosting resume and scheduling |
| Hosted write volume | Not claimed (W1); writes remain local calibration |
| Monitoring binding, B08/B09/B11–B14, B16 tuple | With the hosting resume |
| RPO/RTO measurement, restore drills | Phase C, protected actions, separately authorized at execution |
| Spend | None authorized here; spend gates unchanged |
| Register | No disposition change; B17 stays OPEN — RECOVERY / CAPACITY |

## Validation

- Driver suite re-run on base `7706e93bc`:
  `pnpm exec vitest run --no-cache --config vitest.server.config.ts scripts/hostedLoadDriver/__tests__/schedule.test.ts scripts/hostedLoadDriver/__tests__/config.test.ts`
  — 2 files, 30 tests passed.
- Module hashes pinned above; the loopback smoke evidence of packet 48 stands
  as the last behavioural smoke (stub not committed).
- Documentation-only change; no executable contract added.

## Register effect

The launch register records this packet's three decisions and the driver
admission as a B17 preparation stanza; the B17 row itself stays
OPEN — RECOVERY / CAPACITY. No window, hosted action, spend or acceptance
change is implied.
