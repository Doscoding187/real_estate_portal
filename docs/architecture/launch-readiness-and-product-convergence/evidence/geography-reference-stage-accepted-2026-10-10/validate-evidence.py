"""Offline acceptance checks. Does not connect to a database or provider."""

import datetime
import hashlib
import json
import pathlib
import re


ROOT = pathlib.Path(__file__).resolve().parent


def read(name):
    return json.loads((ROOT / name).read_text())


def stamp(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))


checks = 0


def require(condition, description):
    global checks
    if not condition:
        raise AssertionError(description)
    checks += 1


accepted = read("acceptance.json")
approval = read("approval.json")
apply = read("apply-report.json")
initial = read("initial-plan.json")
verify = read("verify-report.json")
plan = read("post-apply-plan.json")
binding = accepted["binding"]

require(approval["approved"] and approval["approvalActor"] == "Edward", "Explicit scope approval")
require(apply["acceptedPlanDigest"] == approval["planDigest"] == initial["planDigest"] == accepted["acceptedPlanDigest"], "Exact approved pre-apply digest")
require(apply["transactionOutcome"] == "committed" and apply["connectionClosed"], "Committed and closed apply")
require(accepted["dispatchAttempts"] == 1, "One dispatch")
require(read("dispatch-marker.json")["correlation"] == read("lifecycle-final.json")["referenceOperation"]["commandCorrelation"], "Exact correlation")
require(apply["writtenRows"] == apply["existingRows"] == 157728 and apply["pendingRows"] == 0, "All authorized assertions applied")
require(initial["pendingRows"] == 157728 and initial["existingRows"] == 0, "Actual initial state")
for key, value in initial.items():
    if key not in ("planDigest", "pendingRows", "existingRows", "operationalCoverageSignals"):
        require(apply[key] == verify[key] == plan[key] == value, "Immutable release field: " + key)
require(apply["planDigest"] == verify["planDigest"] == plan["planDigest"] == accepted["postApplyPlanDigest"], "Observed post-apply digest")
require(verify["pendingRows"] == plan["pendingRows"] == 0 and verify["existingRows"] == plan["existingRows"] == 157728, "Independent zero-pending verification")
require(len(plan["heldPlaceIds"]) == 720 and len(plan["provinceIds"]) == len(plan["packagePins"]) == 9, "Held identities and national pins")
require(plan["operationalCoverageSignals"] == 0, "No coverage signals inserted")
require(sum(apply["desiredRows"].values()) == 157728 and apply["desiredRows"]["place"] == 16944, "Exact desired counts")
require(apply["insertStatements"] == sum(apply["insertStatementsByTable"].values()) == 633, "Bounded statement count")
require(apply["maximumBatchRows"] <= 250 and apply["maximumBatchParameters"] <= 4096 and apply["maximumEstimatedPayloadBytes"] <= 262144, "Batch ceilings")

before = read("initial-inspection.json")
after = read("post-apply-inspection.json")
for key in ("migrationHistory", "incompleteAttempts", "physicalTables", "canonicalReferenceColumns", "checks", "legacyNorthRiding", "legacySuburbNorthRiding"):
    require(after[key] == before[key], "Unchanged schema/legacy evidence: " + key)
require(after["connectionClosed"] and len(after["migrationHistory"]) == 112 and after["incompleteAttempts"] == [], "Complete released ledger")
require(after["migrationHistory"][-1]["filename"] == approval["expectedHead"], "Verified head 0111")
for table, count in plan["desiredRows"].items():
    require(after["placeCounts"][table] == count, "Physical count: " + table)
require(after["placeCounts"]["search_area"] == after["placeCounts"]["search_area_member"] == 0, "No Search Area creation")
schema = read("zero-pending-schema-plan.json")
require(schema["pending"] == schema["applied"] == [] and schema["lock"] is None and schema["acceptedOldHead"] == schema["expectedNewHead"] == approval["expectedHead"], "No migration replay")
physical = read("physical-congruency.json")
require(physical["congruent"] and physical["differences"] == [] and physical["omittedDifferenceCount"] == 0, "Physical congruency")
require(physical["checkConstraintEnforcement"]["physical"] == {"total": 39, "enforced": 39, "allEnforced": True, "unenforced": []}, "Enforced CHECK constraints")

for name in ("apply-provenance.json", "verification-provenance.json", "lock-provenance.json", "sessions-provenance.json"):
    provenance = read(name)
    require(all(provenance[key] == value for key, value in binding.items()), "Exact command binding: " + name)
    require(provenance["completed"] and all(c["exitCode"] == 0 for c in provenance["commands"]), "Command success: " + name)
    require(provenance.get("temporarySourceRemoved") is True or provenance.get("verifiedCarrier") is True, "Ephemeral cleanup or verified carrier: " + name)
require(len(read("verification-provenance.json")["commands"]) == 6, "Independent verification commands")
admission = read("admission.json")
require(admission["approved"] and admission["binding"] == binding and admission["dispatchAttempts"] == 0, "Admission before single dispatch")
require(admission["gate"]["remainingMinutes"] >= admission["gate"]["requiredMinutes"] == 65, "Original time gate")
sessions = read("global-session-inventory.json")
require(sessions["globalProcessPrivilegeVerified"] and sessions["transactions"] == [], "Global session visibility")
require(all(s["user"] == "azure_superuser" or s["id"] == sessions["identity"]["connectionId"] for s in sessions["sessions"]), "No application/operation session")
lock = read("manifest-lock-clear.json")
require(lock["lockOwnerConnectionId"] is None and lock["lockReleased"] and lock["connectionClosed"], "Manifest lock clear and inspector closed")
cleanup = read("cleanup-admission.json")
for observed in (sessions["observedAt"], lock["closedAt"], read("runner-idle.json")["observedAt"]):
    age = (stamp(cleanup["recordedAt"]) - stamp(observed)).total_seconds()
    require(0 <= age < 60, "Fresh evidence at historical cleanup gate")
require(read("runner-idle.json")["noLiveDatabaseSocket"] and read("runner-idle.json")["noOtherApplicationCommands"], "Idle exact runner")

removal = read("runner-removal.json")
require(removal["binding"] == binding and removal["confirmedBeforeExpiry"], "Removed approved runner before expiry")
direct = read("runner-deployment-readback.json")
require(direct["exitCode"] == 0 and direct["response"]["data"]["deployment"] == {"id": binding["deploymentId"], "status": "REMOVED"}, "Direct deployment removal proof")
deletion = read("provider-delete-response.json")["result"]
require(deletion["service"]["id"] == binding["serviceId"] and deletion["environmentId"] == binding["environmentId"] and deletion["detachedVolumes"] == [], "Exact deletion scope")
registry = read("provider-services.json")["result"]
require(not any(s["id"] == binding["serviceId"] for s in registry["services"]), "Runner absent from project")
runtime = read("provider-runtime.json")["result"]
require(runtime["pendingWork"] == [] and not any(s["serviceId"] == binding["serviceId"] for s in runtime["services"]), "No runner runtime or pending operation")
require(all(s["activeDeployments"] == [] and s["state"] == "offline" for s in runtime["services"] if s["serviceName"] != "Redis"), "Application/worker holds")
require(read("provider-pending.json")["result"]["staged"] is None, "No pending production patch")
baseline = read("provider-baseline.json")["baseline"]
production = read("provider-production.json")["result"]
require(sorted(baseline["services"], key=lambda s: s["id"]) == sorted(production["services"], key=lambda s: s["id"]), "Original service metadata unchanged")
require(read("provider-testing.json")["result"]["staged"]["patchId"] == "9f607fbe-adf1-4322-b11f-302802fc9bc3", "Unrelated Testing patch preserved")
require(read("provider-staging.json")["result"]["staged"] is None, "No Staging patch introduced")
require(all(x["status"] == 403 and x["bodySha256"] == "68e63408d6a0906b221b424d528d5ef30f000f969d08efdb97f5d4652427ef63" for x in read("maintenance-readback.json")), "Maintenance retained")
require(read("backup-readback.json")["backup"]["provisioningState"] == "Ready", "Accepted backup remains Ready")
require(read("runner-cost.json")["service"]["totalDollars"] < 1, "Recorded runner estimate below ceiling")
require(not accepted["deploymentApproved"] and not accepted["reopeningApproved"] and not accepted["paymentsApproved"] and not accepted["nationalPublicLaunchCertified"], "Approval boundaries preserved")

for name, evidence in read("evidence-index.json").items():
    if "sha256" in evidence:
        require(hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == evidence["sha256"], "Original evidence copy: " + name)
for line in (ROOT / "SHA256SUMS").read_text().splitlines():
    expected, name = line.split("  ", 1)
    require(hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected, "Packet checksum: " + name)
for path in ROOT.iterdir():
    if path.is_file():
        content = path.read_text()
        require(not re.search(r"mysql(?:s)?://[^\s\"']+@|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", content), "No credential-bearing DSN or private key: " + path.name)
print(json.dumps({"decision": accepted["decision"], "offlineChecksPassed": checks, "databaseConnectionsOpened": 0, "providerActions": 0}))
