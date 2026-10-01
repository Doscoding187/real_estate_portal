#!/usr/bin/env python3
"""New private proof storage only; never changes existing media or app bindings."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import uuid

ACCOUNT = "914683204061"
REGION = "eu-north-1"
PUBLIC_KEY_HASH = "5f27118e24bc7cc78ec4b0e49d6102e85815c006fd9fb64eeab7138dc9eb6066"


def aws(*args):
    guard = ["--expected-bucket-owner", ACCOUNT] if args[0] == "s3api" and args[1] != "create-bucket" else []
    done = subprocess.run(["aws", *args, *guard, "--output", "json", "--no-cli-pager",
                           "--cli-connect-timeout", "10", "--cli-read-timeout", "30"],
                          capture_output=True, text=True, timeout=90)
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
    if arn == f"arn:aws:iam::{ACCOUNT}:root" or arn.startswith(f"arn:aws:iam::{ACCOUNT}:user/"):
        return arn
    prefix = f"arn:aws:sts::{ACCOUNT}:assumed-role/"
    if arn.startswith(prefix):
        role = arn[len(prefix):].split("/")[0]
        return aws("iam", "get-role", "--role-name", role)["Role"]["Arn"]
    raise RuntimeError("Unsupported operator identity; no resources created.")


def runtime_policy(bucket):
    return {"Version": "2012-10-17", "Statement": [{
        "Sid": "PrivateProofObjectsOnly", "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject"],
        "Resource": f"arn:aws:s3:::{bucket}/billing-proofs/*",
    }]}


def bucket_policy(bucket, user_arn, admin_arn):
    resources = [f"arn:aws:s3:::{bucket}", f"arn:aws:s3:::{bucket}/*"]
    return {"Version": "2012-10-17", "Statement": [
        {"Sid": "RequireTLS", "Effect": "Deny", "Principal": "*",
         "Action": "s3:*", "Resource": resources,
         "Condition": {"Bool": {"aws:SecureTransport": "false"}}},
        {"Sid": "DenyOtherPrincipals", "Effect": "Deny", "Principal": "*",
         "Action": "s3:*", "Resource": resources,
         "Condition": {"ArnNotEquals": {"aws:PrincipalArn": sorted(set([
             user_arn, admin_arn, f"arn:aws:iam::{ACCOUNT}:root",
         ]))}}},
    ]}


def encrypt_credentials(directory, public_key, credentials):
    raw = json.dumps(credentials, separators=(",", ":")).encode()
    if len(raw) > 446:
        raise RuntimeError("Credential envelope exceeds RSA-OAEP bound; stop and preserve state.")
    source = directory / "credential-transfer.private.json"
    encrypted = directory / "private-proof-runtime.encrypted"
    try:
        with open(source, "xb") as handle:
            os.chmod(source, 0o600)
            handle.write(raw)
        subprocess.run(["openssl", "pkeyutl", "-encrypt", "-pubin", "-inkey", str(public_key),
                        "-pkeyopt", "rsa_padding_mode:oaep", "-pkeyopt", "rsa_oaep_md:sha256",
                        "-pkeyopt", "rsa_mgf1_md:sha256", "-in", str(source), "-out", str(encrypted)],
                       check=True, capture_output=True, timeout=30)
        os.chmod(encrypted, 0o600)
    finally:
        if source.exists():
            source.unlink()
    return encrypted


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--apply", action="store_true")
    modes.add_argument("--verify", action="store_true")
    parser.add_argument("--public-key", type=Path, required=True)
    args = parser.parse_args()
    os.umask(0o077)
    if hashlib.sha256(args.public_key.read_bytes()).hexdigest() != PUBLIC_KEY_HASH:
        raise RuntimeError("Public transfer key differs; no resources created.")
    identity = aws("sts", "get-caller-identity")
    if identity.get("Account") != ACCOUNT:
        raise RuntimeError("Unexpected AWS account; no resources created.")
    admin = principal_arn(identity)
    if admin == f"arn:aws:iam::{ACCOUNT}:user/vercel-s3-uploader":
        raise RuntimeError("Use an operator identity, not media runtime credentials.")
    directory = Path.home() / "property-listify-private-proof-provision-20261001"
    if args.verify:
        finish(directory, args.public_key, admin)
        return
    if not args.apply:
        print("PREPARED ONLY: operator and public transfer key verified; no resources created.")
        return
    directory.mkdir(mode=0o700, exist_ok=False)
    print("Private state:", directory, flush=True)
    suffix = uuid.uuid4().hex[:8]
    bucket = f"listify-paid-proofs-{ACCOUNT}-eun1-{suffix}"
    user = f"listify-paid-proof-runtime-{suffix}"
    state = {"bucket": bucket, "region": REGION, "runtimeUser": user,
             "existingResourcesChanged": False, "retention": "indefinite; no lifecycle expiry",
             "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    save(directory, "plan.json", state)
    # Test cryptographic export before creating a bucket, user, or live key.
    test_export = encrypt_credentials(directory, args.public_key, {"test": "no live credentials"})
    test_export.rename(directory / "transfer-preflight.encrypted")
    created_user = aws("iam", "create-user", "--user-name", user,
                       "--tags", json.dumps([{"Key": "Purpose", "Value": "PaidMVP-private-proofs"}]))
    user_arn = created_user["User"]["Arn"]
    save(directory, "user-created.json", created_user)
    iam = runtime_policy(bucket)
    iam_path = save(directory, "runtime-policy.json", iam)
    aws("iam", "put-user-policy", "--user-name", user, "--policy-name", "PrivateProofObjectsOnly",
        "--policy-document", "file://" + str(iam_path))
    aws("s3api", "create-bucket", "--bucket", bucket, "--region", REGION,
        "--create-bucket-configuration", json.dumps({"LocationConstraint": REGION}))
    save(directory, "bucket-created.json", {"bucket": bucket})
    public_block = {"BlockPublicAcls": True, "IgnorePublicAcls": True,
                    "BlockPublicPolicy": True, "RestrictPublicBuckets": True}
    encryption = {"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}
    ownership = {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}
    aws("s3api", "put-public-access-block", "--bucket", bucket, "--region", REGION,
        "--public-access-block-configuration", json.dumps(public_block))
    aws("s3api", "put-bucket-ownership-controls", "--bucket", bucket, "--region", REGION,
        "--ownership-controls", json.dumps(ownership))
    aws("s3api", "put-bucket-encryption", "--bucket", bucket, "--region", REGION,
        "--server-side-encryption-configuration", json.dumps(encryption))
    aws("s3api", "put-bucket-versioning", "--bucket", bucket, "--region", REGION,
        "--versioning-configuration", '{"Status":"Enabled"}')
    state["versioningEnabledAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save(directory, "versioning-enabled.json", {"enabledAt": state["versioningEnabledAt"]})
    policy = bucket_policy(bucket, user_arn, admin)
    policy_path = save(directory, "bucket-policy.json", policy)
    aws("s3api", "put-bucket-policy", "--bucket", bucket, "--region", REGION,
        "--policy", "file://" + str(policy_path))
    aws("s3api", "put-bucket-tagging", "--bucket", bucket, "--region", REGION,
        "--tagging", json.dumps({"TagSet": [
            {"Key": "Purpose", "Value": "PaidMVP-private-proofs"},
            {"Key": "Environment", "Value": "production"},
        ]}))
    snapshots = {}
    for operation in ["get-public-access-block", "get-bucket-ownership-controls",
                      "get-bucket-encryption", "get-bucket-versioning", "get-bucket-policy"]:
        snapshots[operation] = aws("s3api", operation, "--bucket", bucket, "--region", REGION)
        save(directory, operation + ".json", snapshots[operation])
    if snapshots["get-public-access-block"]["PublicAccessBlockConfiguration"] != public_block:
        raise RuntimeError("Public-access blocks differ; do not continue.")
    if snapshots["get-bucket-versioning"].get("Status") != "Enabled":
        raise RuntimeError("Versioning not enabled; do not continue.")
    if snapshots["get-bucket-ownership-controls"]["OwnershipControls"] != ownership:
        raise RuntimeError("Object ownership differs; do not continue.")
    if snapshots["get-bucket-encryption"]["ServerSideEncryptionConfiguration"]["Rules"][0]["ApplyServerSideEncryptionByDefault"]["SSEAlgorithm"] != "AES256":
        raise RuntimeError("Encryption differs; do not continue.")
    if json.loads(snapshots["get-bucket-policy"]["Policy"]) != policy:
        raise RuntimeError("Private policy differs; do not continue.")
    policy_readback = aws("iam", "get-user-policy", "--user-name", user, "--policy-name", "PrivateProofObjectsOnly")
    save(directory, "runtime-policy-readback.json", policy_readback)
    if policy_readback["PolicyDocument"] != iam:
        raise RuntimeError("Runtime policy differs; do not continue.")
    save(directory, "prepared.json", {**state, "operatorArn": admin,
         "dedicatedRuntimeUserArn": user_arn, "configurationReadback": "PASS"})
    print("PASS: private proof bucket encrypted, public access blocked, versioning enabled; no expiry configured.")
    print("Dedicated runtime user:", user)
    print("Private proof bucket:", bucket)
    print("No runtime keys generated yet. Existing media and production bindings unchanged.")
    print("Wait 15 minutes after this completion before recovery writes (AWS versioning propagation).")
    print("Then run: python3 aws-private-proof-provision.py --verify --public-key runtime-transfer.public.pem")


def finish(directory, public_key, admin):
    state = json.loads((directory / "prepared.json").read_text())
    if state["operatorArn"] != admin:
        raise RuntimeError("Use the same operator for verification; no writes performed.")
    if (directory / "verification-started.json").exists():
        raise RuntimeError("Verification has already been attempted; reconcile private state, do not rerun.")
    enabled = datetime.datetime.fromisoformat(state["versioningEnabledAt"])
    elapsed = (datetime.datetime.now(datetime.timezone.utc) - enabled).total_seconds()
    if elapsed < 900:
        print("Versioning propagation: wait another", int(900 - elapsed) + 1, "seconds, then run --verify. No writes performed.")
        return
    bucket, user = state["bucket"], state["runtimeUser"]
    user_arn = state["dedicatedRuntimeUserArn"]
    block = aws("s3api", "get-public-access-block", "--bucket", bucket, "--region", REGION)
    versioning = aws("s3api", "get-bucket-versioning", "--bucket", bucket, "--region", REGION)
    current = json.loads(aws("s3api", "get-bucket-policy", "--bucket", bucket, "--region", REGION)["Policy"])
    if (versioning.get("Status") != "Enabled"
        or block.get("PublicAccessBlockConfiguration") != {"BlockPublicAcls": True, "IgnorePublicAcls": True,
            "BlockPublicPolicy": True, "RestrictPublicBuckets": True}
        or current != bucket_policy(bucket, user_arn, admin)):
        raise RuntimeError("Private storage configuration changed; no recovery writes performed.")
    iam = aws("iam", "get-user-policy", "--user-name", user, "--policy-name", "PrivateProofObjectsOnly")
    if iam["PolicyDocument"] != runtime_policy(bucket):
        raise RuntimeError("Runtime permissions differ; no recovery writes performed.")
    save(directory, "verification-started.json", {"startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    print("Private recovery state:", directory, flush=True)
    # Recovery touches only a unique task-owned key and retains all versions.
    key = "billing-proofs/storage-verification-" + uuid.uuid4().hex + ".txt"
    payload = b"Property Listify private proof recovery probe; no customer document.\n"
    content = directory / "recovery-object.txt"
    with open(content, "xb") as handle:
        os.chmod(content, 0o600)
        handle.write(payload)
    v1 = aws("s3api", "put-object", "--bucket", bucket, "--region", REGION, "--key", key,
             "--body", str(content), "--if-none-match", "*", "--server-side-encryption", "AES256")
    if not v1.get("VersionId") or v1["VersionId"] == "null":
        raise RuntimeError("Missing first version; recovery not verified.")
    marker = aws("s3api", "delete-object", "--bucket", bucket, "--region", REGION, "--key", key)
    if marker.get("DeleteMarker") is not True:
        raise RuntimeError("Task-object delete marker not verified.")
    retrieved = directory / "recovery-readback.txt"
    aws("s3api", "get-object", "--bucket", bucket, "--region", REGION, "--key", key,
        "--version-id", v1["VersionId"], str(retrieved))
    if hashlib.sha256(retrieved.read_bytes()).digest() != hashlib.sha256(payload).digest():
        raise RuntimeError("Historical version checksum differs.")
    restored = aws("s3api", "copy-object", "--bucket", bucket, "--region", REGION, "--key", key,
                   "--copy-source", bucket + "/" + key + "?versionId=" + urllib.parse.quote(v1["VersionId"], safe=""),
                   "--server-side-encryption", "AES256")
    current_path = directory / "recovery-current.txt"
    aws("s3api", "get-object", "--bucket", bucket, "--region", REGION, "--key", key, str(current_path))
    if current_path.read_bytes() != payload:
        raise RuntimeError("Restored current object differs.")
    url = f"https://{bucket}.s3.{REGION}.amazonaws.com/{key}"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        status = error.code
    if status != 403:
        raise RuntimeError("Anonymous proof read was not denied; stop.")
    save(directory, "recovery.private.json", {
        "key": key, "version1": v1["VersionId"], "deleteMarker": marker,
        "restored": restored, "sha256": hashlib.sha256(payload).hexdigest(),
        "anonymousStatus": status, "historicalAndCurrentReadback": "PASS",
        "existingObjectModified": False,
    })
    # Generate the dedicated runtime key only after protected configuration
    # and task-object recovery pass. Never save or print its plaintext.
    access = aws("iam", "create-access-key", "--user-name", user)["AccessKey"]
    credentials = {"BILLING_PROOF_STORAGE_ADAPTER": "s3", "BILLING_PROOF_S3_BUCKET": bucket,
                   "BILLING_PROOF_S3_REGION": REGION, "BILLING_PROOF_S3_PREFIX": "billing-proofs",
                   "BILLING_PROOF_AWS_ACCESS_KEY_ID": access["AccessKeyId"],
                   "BILLING_PROOF_AWS_SECRET_ACCESS_KEY": access["SecretAccessKey"]}
    encrypted = encrypt_credentials(directory, public_key, credentials)
    encrypted_hash = hashlib.sha256(encrypted.read_bytes()).hexdigest()
    save(directory, "result.json", {**state, "configurationReadback": "PASS", "recoveryReadback": "PASS",
         "anonymousReadDenied": True, "encryptedCredentialsSha256": encrypted_hash,
         "dedicatedRuntimeUserArn": user_arn, "hostedOwnerIsolationVerified": False,
         "runtimeCredentialAccessVerified": False, "costAlertsConfigured": False})
    print("PASS: private proof bucket encrypted, public access blocked, versioning enabled; no expiry configured.")
    print("PASS: task-object historical/current recovery hash verified; anonymous read denied (403).")
    print("Dedicated runtime user:", user)
    print("Private proof bucket:", bucket)
    print("Encrypted credential download:", encrypted)
    print("Encrypted credential SHA256:", encrypted_hash)
    print("Existing media, existing IAM users and production bindings unchanged. Do not rerun.")
    print("Runtime credential/owner-isolation and hosted tests remain outstanding.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.SubprocessError,
            urllib.error.URLError) as error:
        raise SystemExit(str(error))
