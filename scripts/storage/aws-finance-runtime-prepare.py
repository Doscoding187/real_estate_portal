#!/usr/bin/env python3
"""South African finance storage runtime preparation.

Attended operator program with two bounded modes: a synthetic
restore-from-backup recovery exercise (packet 50 sequence step 2) and encrypted
runtime credential issuance for the recorded proof runtime user (step 1). The
default mode is a read-only configuration preflight. No mode binds the
application, migrates records, creates temporary paid infrastructure or
touches the eu-north-1 leaf bucket, media identity or media configuration.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ACCOUNT = "914683204061"
REGION = "af-south-1"
STACK_NAME = "listify-finance-af-south-1"
PRIMARY_BUCKET = "listify-finance-914683204061-af-south-1"
BACKUP_BUCKET = "listify-finance-af-south-1-financebackup-kce1wayc2h2e"
RUNTIME_USER = "listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx"
RUNTIME_ARN = f"arn:aws:iam::{ACCOUNT}:user/{RUNTIME_USER}"
REPLICATION_ROLE_NAME = "listify-finance-af-south-1-ReplicationRole-jRMcboiYzXcD"
REPLICATION_ROLE_ARN = f"arn:aws:iam::{ACCOUNT}:role/{REPLICATION_ROLE_NAME}"
OPERATOR_ARN = f"arn:aws:iam::{ACCOUNT}:user/listify-finance-operator"
ROOT_ARN = f"arn:aws:iam::{ACCOUNT}:root"
PRIMARY_ARN = f"arn:aws:s3:::{PRIMARY_BUCKET}"
BACKUP_ARN = f"arn:aws:s3:::{BACKUP_BUCKET}"
PREFIX = "billing-proofs"
PRIMARY_PRINCIPALS = [OPERATOR_ARN, ROOT_ARN, RUNTIME_ARN, REPLICATION_ROLE_ARN]
BACKUP_PRINCIPALS = [OPERATOR_ARN, ROOT_ARN, REPLICATION_ROLE_ARN]
PUBLIC_ACCESS_BLOCK = {"BlockPublicAcls": True, "IgnorePublicAcls": True,
                       "BlockPublicPolicy": True, "RestrictPublicBuckets": True}
OWNERSHIP_CONTROLS = {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}
EXPECTED_STACK_RESOURCES = {
    "FinanceBackup": BACKUP_BUCKET,
    "FinanceBackupPolicy": None,
    "FinancePrimary": PRIMARY_BUCKET,
    "FinancePrimaryPolicy": None,
    "ProofRuntimeUser": RUNTIME_USER,
    "ReplicationRole": REPLICATION_ROLE_NAME,
}
EXPECTED_STACK_OUTPUTS = {
    "FinancePrimaryBucket": PRIMARY_BUCKET,
    "FinanceBackupBucket": BACKUP_BUCKET,
    "ProofRuntimeUser": RUNTIME_USER,
    "Region": REGION,
}
CREDENTIAL_VALUES = {
    "BILLING_PROOF_STORAGE_ADAPTER": "s3",
    "BILLING_PROOF_S3_BUCKET": PRIMARY_BUCKET,
    "BILLING_PROOF_S3_REGION": REGION,
    "BILLING_PROOF_S3_PREFIX": PREFIX,
}
MAX_ENVELOPE_BYTES = 446
REPLICATION_POLL_SECONDS = 900
REPLICATION_POLL_INTERVAL_SECONDS = 10
RECOVERY_PAYLOAD = b"Property Listify finance backup recovery probe; no customer record.\n"
RECOVERY_DIRECTORY = Path.home() / "property-listify-finance-recovery"
ISSUE_DIRECTORY = Path.home() / "property-listify-finance-runtime-issue"


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def _run_aws(args):
    return subprocess.run(
        ["aws", *args, "--output", "json", "--no-cli-pager",
         "--cli-connect-timeout", "10", "--cli-read-timeout", "30"],
        capture_output=True, text=True, timeout=90)


def aws(*args):
    guard = []
    if args[0] == "s3api":
        guard += ["--expected-bucket-owner", ACCOUNT]
    if args[0] in ("s3api", "cloudformation"):
        guard += ["--region", REGION]
    done = _run_aws([*args, *guard])
    if done.returncode:
        raise RuntimeError(f"AWS operation failed: {args[0]} {args[1]}. Preserve state; do not rerun.")
    return json.loads(done.stdout) if done.stdout.strip() else {}


def save(directory, name, data):
    file = directory / name
    raw = (json.dumps(data, indent=2, sort_keys=True) + "\n").encode()
    with open(file, "xb") as handle:
        os.chmod(file, 0o600)
        handle.write(raw)
    return file


def principal_arn(identity):
    arn = identity["Arn"]
    if arn == ROOT_ARN or arn.startswith(f"arn:aws:iam::{ACCOUNT}:user/"):
        return arn
    prefix = f"arn:aws:sts::{ACCOUNT}:assumed-role/"
    if arn.startswith(prefix):
        role = arn[len(prefix):].split("/")[0]
        return aws("iam", "get-role", "--role-name", role)["Role"]["Arn"]
    raise RuntimeError("Unsupported operator identity; no resources created.")


def expected_bucket_policy(bucket, principals):
    resources = [f"arn:aws:s3:::{bucket}", f"arn:aws:s3:::{bucket}/*"]
    return {"Version": "2012-10-17", "Statement": [
        {"Sid": "RequireTLS", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
         "Resource": resources,
         "Condition": {"Bool": {"aws:SecureTransport": "false"}}},
        {"Sid": "DenyOtherPrincipals", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
         "Resource": resources,
         "Condition": {"ArnNotEquals": {"aws:PrincipalArn": list(principals)}}},
    ]}


def expected_runtime_policy():
    return {"Version": "2012-10-17", "Statement": [
        {"Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": f"{PRIMARY_ARN}/{PREFIX}/*"},
        {"Effect": "Deny", "Action": ["s3:DeleteObject", "s3:DeleteObjectVersion"],
         "Resource": f"{PRIMARY_ARN}/*"},
        {"Effect": "Deny", "Action": "s3:*", "Resource": [BACKUP_ARN, f"{BACKUP_ARN}/*"]},
    ]}


def verify_replication(configuration):
    rules = configuration.get("Rules") or []
    rule = rules[0] if len(rules) == 1 else {}
    if (configuration.get("Role") != REPLICATION_ROLE_ARN
            or len(rules) != 1
            or rule.get("Id") != "DomesticBackup"
            or rule.get("Status") != "Enabled"
            or rule.get("Priority") != 1
            or rule.get("Filter") != {"Prefix": ""}
            or rule.get("DeleteMarkerReplication") != {"Status": "Disabled"}
            or rule.get("Destination", {}).get("Bucket") != BACKUP_ARN):
        raise RuntimeError("Domestic backup replication differs from the prepared arrangement.")


def resolve_stack():
    stacks = aws("cloudformation", "describe-stacks", "--stack-name", STACK_NAME).get("Stacks") or []
    if len(stacks) != 1 or stacks[0].get("StackStatus") != "CREATE_COMPLETE":
        raise RuntimeError("Recorded finance storage stack is missing or not CREATE_COMPLETE.")
    stack = stacks[0]
    outputs = {item["OutputKey"]: item["OutputValue"] for item in stack.get("Outputs") or []}
    if outputs != EXPECTED_STACK_OUTPUTS:
        raise RuntimeError("Stack outputs differ from the recorded D6 target.")
    parameters = {item["ParameterKey"]: item["ParameterValue"] for item in stack.get("Parameters") or []}
    if parameters != {"OperatorArn": OPERATOR_ARN}:
        raise RuntimeError("Stack operator parameter differs from the recorded D6 operator.")
    resources = aws("cloudformation", "describe-stack-resources", "--stack-name", STACK_NAME).get(
        "StackResources") or []
    physical = {item["LogicalResourceId"]: item.get("PhysicalResourceId") for item in resources}
    if set(physical) != set(EXPECTED_STACK_RESOURCES):
        raise RuntimeError("Stack resource set differs from the recorded D6 target.")
    for name, expected in EXPECTED_STACK_RESOURCES.items():
        if expected is not None and physical.get(name) != expected:
            raise RuntimeError("Stack resource differs from the recorded D6 target.")
    return {"stackId": stack["StackId"], "outputs": outputs}


def preflight(require_no_access_keys):
    identity = aws("sts", "get-caller-identity")
    if identity.get("Account") != ACCOUNT:
        raise RuntimeError("Unexpected AWS account; no resources changed.")
    caller = principal_arn(identity)
    if caller == RUNTIME_ARN:
        raise RuntimeError("Use the named operator or account root, not the finance runtime identity.")
    stack = resolve_stack()
    for bucket, principals in ((PRIMARY_BUCKET, PRIMARY_PRINCIPALS),
                               (BACKUP_BUCKET, BACKUP_PRINCIPALS)):
        location = aws("s3api", "get-bucket-location", "--bucket", bucket)
        if location.get("LocationConstraint") != REGION:
            raise RuntimeError("Finance bucket location is not South Africa.")
        if aws("s3api", "get-bucket-versioning", "--bucket", bucket).get("Status") != "Enabled":
            raise RuntimeError("Finance bucket versioning is not enabled.")
        encryption = aws("s3api", "get-bucket-encryption", "--bucket", bucket)
        rules = encryption.get("ServerSideEncryptionConfiguration", {}).get("Rules") or []
        if (len(rules) != 1
                or rules[0].get("ApplyServerSideEncryptionByDefault", {}).get("SSEAlgorithm") != "AES256"):
            raise RuntimeError("Finance bucket encryption differs from AES256.")
        block = aws("s3api", "get-public-access-block", "--bucket", bucket).get(
            "PublicAccessBlockConfiguration")
        if block != PUBLIC_ACCESS_BLOCK:
            raise RuntimeError("Finance bucket public-access blocks differ.")
        ownership = aws("s3api", "get-bucket-ownership-controls", "--bucket", bucket).get(
            "OwnershipControls")
        if ownership != OWNERSHIP_CONTROLS:
            raise RuntimeError("Finance bucket object ownership differs.")
        policy = json.loads(aws("s3api", "get-bucket-policy", "--bucket", bucket)["Policy"])
        if policy != expected_bucket_policy(bucket, principals):
            raise RuntimeError("Finance bucket policy differs from the prepared arrangement.")
        lifecycle = _run_aws(["s3api", "get-bucket-lifecycle-configuration", "--bucket", bucket,
                              "--expected-bucket-owner", ACCOUNT, "--region", REGION])
        if lifecycle.returncode == 0 or "NoSuchLifecycleConfiguration" not in lifecycle.stderr:
            raise RuntimeError("Finance bucket lifecycle state prevents the retention review.")
    verify_replication(aws("s3api", "get-bucket-replication", "--bucket", PRIMARY_BUCKET).get(
        "ReplicationConfiguration") or {})
    runtime = aws("iam", "get-user-policy", "--user-name", RUNTIME_USER,
                  "--policy-name", "DedicatedProofObjectsOnly")
    if runtime.get("PolicyDocument") != expected_runtime_policy():
        raise RuntimeError("Finance runtime policy differs from the prepared arrangement.")
    keys = aws("iam", "list-access-keys", "--user-name", RUNTIME_USER).get("AccessKeyMetadata") or []
    if require_no_access_keys and keys:
        raise RuntimeError(
            "The finance runtime user already has an access key; reissuance needs a reviewed decision.")
    return {"callerArn": caller, "stackId": stack["stackId"], "existingAccessKeys": len(keys)}


def parse_quote(path):
    raw = Path(path).read_bytes()
    value = json.loads(raw)
    total = value.get("Total") if isinstance(value, dict) else None
    if isinstance(total, dict) and "Amount" in total:
        unit = total.get("Unit", "USD")
        try:
            amount = float(total["Amount"])
        except (TypeError, ValueError):
            raise RuntimeError("Quote readback amount is not numeric.")
    elif (isinstance(value, dict) and isinstance(value.get("amountUsd"), (int, float))
          and not isinstance(value.get("amountUsd"), bool)):
        unit = value.get("unit", "USD")
        amount = float(value["amountUsd"])
    else:
        raise RuntimeError("Quote readback must be a Cost Explorer forecast or contain a numeric amountUsd.")
    if unit != "USD":
        raise RuntimeError("Quote readback must be in USD.")
    if amount < 0:
        raise RuntimeError("Quote readback amount is negative.")
    return raw, amount


def verify_quote(amount, budget):
    if budget <= 0:
        raise RuntimeError("Provide a positive USD budget from the verified quote readback.")
    if amount > budget:
        raise RuntimeError("Quote exceeds the D4 minimal budget; this is a FOUNDER SPEND GATE.")


def run_recovery(quote_path, budget):
    quote_raw, amount = parse_quote(quote_path)
    verify_quote(amount, budget)
    claims = preflight(require_no_access_keys=False)
    if RECOVERY_DIRECTORY.exists():
        raise RuntimeError(
            "Recovery has already been attempted; reconcile the preserved directory; do not rerun.")
    RECOVERY_DIRECTORY.mkdir(mode=0o700, exist_ok=False)
    directory = RECOVERY_DIRECTORY
    quote_hash = sha256(quote_raw)
    save(directory, "quote-readback.json",
         {"sha256": quote_hash, "amountUsd": amount, "budgetUsd": budget})
    key = f"{PREFIX}/recovery-verification-{uuid.uuid4().hex}.txt"
    content = directory / "recovery-object.txt"
    with open(content, "xb") as handle:
        os.chmod(content, 0o600)
        handle.write(RECOVERY_PAYLOAD)
    save(directory, "plan.private.json", {
        "key": key, "bucket": PRIMARY_BUCKET, "backupBucket": BACKUP_BUCKET,
        "operatorArn": claims["callerArn"], "quoteReadbackSha256": quote_hash,
        "budgetUsd": budget,
        "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    put = aws("s3api", "put-object", "--bucket", PRIMARY_BUCKET, "--key", key,
              "--body", str(content), "--if-none-match", "*", "--server-side-encryption", "AES256")
    if not put.get("VersionId") or put["VersionId"] == "null":
        raise RuntimeError("Missing first version; recovery not verified.")
    save(directory, "source-version.private.json", put)
    deadline = time.monotonic() + REPLICATION_POLL_SECONDS
    while True:
        head = aws("s3api", "head-object", "--bucket", PRIMARY_BUCKET, "--key", key)
        status = head.get("ReplicationStatus")
        if status == "COMPLETED":
            break
        if status in ("FAILED", "REPLICA"):
            raise RuntimeError("Replication did not complete; recovery not exercised.")
        if time.monotonic() >= deadline:
            raise RuntimeError(
                "Replication did not complete within the bounded wait; recovery not exercised.")
        time.sleep(REPLICATION_POLL_INTERVAL_SECONDS)
    save(directory, "replication-completed.private.json", {
        "key": key, "sourceVersionId": put["VersionId"], "replicationStatus": status})
    versions = aws("s3api", "list-object-versions", "--bucket", BACKUP_BUCKET,
                   "--prefix", key).get("Versions") or []
    if not versions:
        raise RuntimeError("No replica version found in the domestic backup; recovery not exercised.")
    replica = max(versions, key=lambda item: item["LastModified"])
    replica_head = aws("s3api", "head-object", "--bucket", BACKUP_BUCKET, "--key", key,
                       "--version-id", replica["VersionId"])
    if replica_head.get("ServerSideEncryption") != "AES256":
        raise RuntimeError("Replica encryption differs from AES256.")
    if replica_head.get("ContentLength") != len(RECOVERY_PAYLOAD):
        raise RuntimeError("Replica length differs from the probe object.")
    retrieved = directory / "replica-readback.txt"
    aws("s3api", "get-object", "--bucket", BACKUP_BUCKET, "--key", key,
        "--version-id", replica["VersionId"], str(retrieved))
    if sha256(retrieved.read_bytes()) != sha256(RECOVERY_PAYLOAD):
        raise RuntimeError("Replica content checksum differs.")
    marker = aws("s3api", "delete-object", "--bucket", PRIMARY_BUCKET, "--key", key)
    if marker.get("DeleteMarker") is not True:
        raise RuntimeError("Task-object delete marker not verified.")
    missing = _run_aws(["s3api", "head-object", "--bucket", PRIMARY_BUCKET, "--key", key,
                        "--expected-bucket-owner", ACCOUNT, "--region", REGION])
    if missing.returncode == 0 or "404" not in missing.stderr:
        raise RuntimeError(
            "Current object still readable after the simulated loss; recovery not exercised.")
    retained = aws("s3api", "head-object", "--bucket", BACKUP_BUCKET, "--key", key,
                   "--version-id", replica["VersionId"])
    if retained.get("ContentLength") != len(RECOVERY_PAYLOAD):
        raise RuntimeError("Replica changed after the simulated loss.")
    source = f"{BACKUP_BUCKET}/{key}?versionId={urllib.parse.quote(replica['VersionId'], safe='')}"
    restored = aws("s3api", "copy-object", "--bucket", PRIMARY_BUCKET, "--key", key,
                   "--copy-source", source, "--metadata-directive", "COPY",
                   "--server-side-encryption", "AES256")
    current = directory / "restored-current.txt"
    aws("s3api", "get-object", "--bucket", PRIMARY_BUCKET, "--key", key, str(current))
    if sha256(current.read_bytes()) != sha256(RECOVERY_PAYLOAD):
        raise RuntimeError("Restored current object differs from the backup version.")
    if aws("s3api", "head-object", "--bucket", PRIMARY_BUCKET, "--key", key).get(
            "ServerSideEncryption") != "AES256":
        raise RuntimeError("Restored object encryption differs from AES256.")
    url = f"https://{PRIMARY_BUCKET}.s3.{REGION}.amazonaws.com/{key}"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            anonymous_status = response.status
    except urllib.error.HTTPError as error:
        anonymous_status = error.code
    if anonymous_status != 403:
        raise RuntimeError("Anonymous finance read was not denied; stop.")
    evidence = {
        "key": key, "sourceVersionId": put["VersionId"], "replicaVersionId": replica["VersionId"],
        "replicaVersionCount": len(versions), "deleteMarker": marker, "restoreCopy": restored,
        "sha256": sha256(RECOVERY_PAYLOAD), "anonymousStatus": anonymous_status,
        "historicalAndCurrentReadback": "PASS", "existingObjectModified": False,
        "temporaryPaidResourceCreated": False, "quoteReadbackSha256": quote_hash,
        "quoteAmountUsd": amount, "budgetUsd": budget, "recoveryExercised": True,
        "runtimePermissionsExercised": False, "migrationCompleted": False,
        "productionBindingsChanged": False,
    }
    save(directory, "recovery.private.json", evidence)
    print("PASS: replica hash/version verified, simulated loss marker confirmed, "
          "restored-current hash verified, anonymous read denied (403).")
    print("Recovery evidence:", directory / "recovery.private.json")
    print("No temporary paid resource was created; preserve this directory. Do not rerun.")
    return evidence


def public_key_bits(public_key):
    done = subprocess.run(["openssl", "pkey", "-pubin", "-in", str(public_key), "-text", "-noout"],
                          capture_output=True, timeout=30)
    if done.returncode:
        raise RuntimeError("Public transfer key is not a readable public key.")
    text = done.stdout.decode()
    if "Public-Key: (" not in text:
        raise RuntimeError("Public transfer key is not an RSA public key.")
    bits = int(text.split("Public-Key: (", 1)[1].split(" bit", 1)[0])
    if bits < 4096:
        raise RuntimeError("Public transfer key must be RSA-4096 for the encrypted-envelope bound.")
    return bits


def encrypt_credentials(directory, public_key, credentials):
    raw = json.dumps(credentials, separators=(",", ":")).encode()
    source = directory / "credential-transfer.private.json"
    encrypted = directory / "finance-runtime.encrypted"
    try:
        with open(source, "xb") as handle:
            os.chmod(source, 0o600)
            handle.write(raw)
        done = subprocess.run(["openssl", "pkeyutl", "-encrypt", "-pubin", "-inkey", str(public_key),
                               "-pkeyopt", "rsa_padding_mode:oaep",
                               "-pkeyopt", "rsa_oaep_md:sha256",
                               "-pkeyopt", "rsa_mgf1_md:sha256",
                               "-in", str(source), "-out", str(encrypted)],
                              capture_output=True, timeout=30)
        if done.returncode:
            raise RuntimeError("Credential encryption failed; no plaintext retained.")
        os.chmod(encrypted, 0o600)
    finally:
        if source.exists():
            source.unlink()
    return encrypted


def run_issue(public_key, expected_key_hash, recovery_evidence):
    if not re.fullmatch(r"[a-f0-9]{64}", expected_key_hash or ""):
        raise RuntimeError("Provide the recorded public transfer key SHA256.")
    public_key = Path(public_key)
    if not public_key.is_file():
        raise RuntimeError("Public transfer key file is missing.")
    if sha256(public_key.read_bytes()) != expected_key_hash:
        raise RuntimeError("Public transfer key differs from the recorded SHA256.")
    bits = public_key_bits(public_key)
    recovery_raw = Path(recovery_evidence).read_bytes()
    recovery = json.loads(recovery_raw)
    if (recovery.get("recoveryExercised") is not True
            or recovery.get("historicalAndCurrentReadback") != "PASS"
            or recovery.get("anonymousStatus") != 403
            or recovery.get("temporaryPaidResourceCreated") is not False
            or recovery.get("productionBindingsChanged") is not False
            or not str(recovery.get("key", "")).startswith(PREFIX + "/recovery-verification-")
            or not re.fullmatch(r"[a-f0-9]{64}", str(recovery.get("sha256", "")))):
        raise RuntimeError(
            "Recovery evidence is missing, unrelated, or claims unprotected state; "
            "no access key created.")
    claims = preflight(require_no_access_keys=True)
    if ISSUE_DIRECTORY.exists():
        raise RuntimeError(
            "Credential issuance has already been attempted; reconcile the preserved directory; "
            "do not rerun.")
    ISSUE_DIRECTORY.mkdir(mode=0o700, exist_ok=False)
    directory = ISSUE_DIRECTORY
    dummy = {**CREDENTIAL_VALUES, "BILLING_PROOF_AWS_ACCESS_KEY_ID": "AKIA" + "A" * 16,
             "BILLING_PROOF_AWS_SECRET_ACCESS_KEY": "A" * 40}
    if len(json.dumps(dummy, separators=(",", ":")).encode()) > MAX_ENVELOPE_BYTES:
        raise RuntimeError("Credential envelope exceeds the RSA-OAEP bound; stop and preserve state.")
    encrypt_credentials(directory, public_key, {"test": "no live credentials"}).rename(
        directory / "transfer-preflight.encrypted")
    access = aws("iam", "create-access-key", "--user-name", RUNTIME_USER).get("AccessKey") or {}
    if (not re.fullmatch(r"AKIA[A-Z0-9]{16}", access.get("AccessKeyId", ""))
            or not re.fullmatch(r"[A-Za-z0-9/+=]{40}", access.get("SecretAccessKey", ""))):
        raise RuntimeError("Access key response is incomplete; do not attempt another key.")
    credentials = {**CREDENTIAL_VALUES,
                   "BILLING_PROOF_AWS_ACCESS_KEY_ID": access["AccessKeyId"],
                   "BILLING_PROOF_AWS_SECRET_ACCESS_KEY": access["SecretAccessKey"]}
    if len(json.dumps(credentials, separators=(",", ":")).encode()) > MAX_ENVELOPE_BYTES:
        raise RuntimeError(
            "Credential envelope exceeds the RSA-OAEP bound; preserve the created key and reconcile "
            "before any retry.")
    encrypted = encrypt_credentials(directory, public_key, credentials)
    encrypted_hash = sha256(encrypted.read_bytes())
    save(directory, "result.json", {
        "packet": "ZA-FINANCE-RUNTIME-CREDENTIALS-2026-10-18",
        "account": ACCOUNT, "region": REGION, "bucket": PRIMARY_BUCKET,
        "backupBucket": BACKUP_BUCKET, "runtimeUser": RUNTIME_USER, "runtimeUserArn": RUNTIME_ARN,
        "operatorArn": claims["callerArn"], "stackId": claims["stackId"],
        "publicKeySha256": expected_key_hash, "publicKeyBits": bits,
        "configurationReadback": "PASS", "recoveryReadback": "PASS",
        "recoveryEvidenceSha256": sha256(recovery_raw),
        "existingAccessKeysBefore": 0, "accessKeysCreated": 1,
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "encryptedCredentialsSha256": encrypted_hash,
        "encryptedCredentialsFile": encrypted.name,
        "existingResourcesChanged": False, "runtimePermissionsExercised": False,
        "migrationCompleted": False, "productionBindingsChanged": False,
    })
    print("PASS: configuration read back, recovery evidence accepted, one dedicated access key "
          "created and exported encrypted only.")
    print("Encrypted credential export:", encrypted)
    print("Encrypted credential SHA256:", encrypted_hash)
    print("Do not bind the application, migrate records or rerun this program. "
          "Verify locally with aws-finance-runtime-verify.cjs before any later binding decision.")
    return encrypted_hash


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--recovery", action="store_true",
                       help="Run the synthetic restore-from-backup exercise with operator credentials.")
    modes.add_argument("--issue", action="store_true",
                       help="Issue the one dedicated runtime access key and encrypted credential envelope.")
    parser.add_argument("--quote-readback", type=Path)
    parser.add_argument("--budget-usd", type=float)
    parser.add_argument("--public-key", type=Path)
    parser.add_argument("--expected-public-key-sha256")
    parser.add_argument("--recovery-evidence", type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    if args.recovery:
        if not args.quote_readback or args.budget_usd is None:
            raise SystemExit("--recovery requires --quote-readback and --budget-usd.")
        run_recovery(args.quote_readback, args.budget_usd)
        return
    if args.issue:
        if not args.public_key or not args.expected_public_key_sha256 or not args.recovery_evidence:
            raise SystemExit(
                "--issue requires --public-key, --expected-public-key-sha256 and --recovery-evidence.")
        run_issue(args.public_key, args.expected_public_key_sha256, args.recovery_evidence)
        return
    claims = preflight(require_no_access_keys=False)
    print("PREPARED ONLY: configuration readback PASS; no recovery, access key, migration or "
          "binding performed.")
    print(json.dumps(claims, indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.SubprocessError,
            urllib.error.URLError) as error:
        raise SystemExit(str(error))
