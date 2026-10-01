#!/usr/bin/env python3
"""Operator-only narrow containment. Keeps objects and public reads unchanged."""
import argparse
import copy
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ACCOUNT = "914683204061"
BUCKET = "listify-properties-sa"
REGION = "eu-north-1"
UPLOADER = "vercel-s3-uploader"
FULL_ACCESS = "arn:aws:iam::aws:policy/AmazonS3FullAccess"


def remove_unconditional_public_write(policy):
    result = copy.deepcopy(policy)
    statements = result.get("Statement")
    if not isinstance(statements, list):
        raise ValueError("Expected a statement list; no changes made.")
    candidates = [
        i for i, s in enumerate(statements)
        if s.get("Effect") == "Allow"
        and s.get("Principal") == "*"
        and s.get("Action") == "s3:PutObject"
        and s.get("Resource") == f"arn:aws:s3:::{BUCKET}/videos/*"
        and not s.get("Condition")
        and not any(k in s for k in ("NotAction", "NotResource", "NotPrincipal"))
    ]
    if len(candidates) != 1:
        raise ValueError("Expected exactly one known anonymous-write grant; no changes made.")
    del statements[candidates[0]]
    if not any(s.get("Effect") == "Allow" and s.get("Principal") == "*"
               and s.get("Action") == "s3:GetObject"
               and s.get("Resource") == f"arn:aws:s3:::{BUCKET}/*"
               for s in statements):
        raise ValueError("Public-read baseline differs; no changes made.")
    return result


def aws(*args):
    owner_guard = ["--expected-bucket-owner", ACCOUNT] if args[0] == "s3api" else []
    command = ["aws", *args, *owner_guard, "--output", "json", "--no-cli-pager",
               "--cli-connect-timeout", "10", "--cli-read-timeout", "30"]
    completed = subprocess.run(command, capture_output=True, text=True, timeout=90)
    if completed.returncode:
        # AWS control-plane errors contain no credential material, but keep raw
        # provider output out of shared results and expose only the operation.
        raise RuntimeError(f"AWS operation failed: {args[0]} {args[1]}; no subsequent step executed.")
    return json.loads(completed.stdout) if completed.stdout.strip() else {}


def save(directory, name, value):
    data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
    with open(directory / name, "xb") as f:
        os.chmod(directory / name, 0o600)
        f.write(data)
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Remove only the known anonymous PUT grant after private backups.")
    args = parser.parse_args()
    os.umask(0o077)
    identity = aws("sts", "get-caller-identity")
    if identity.get("Account") != ACCOUNT:
        raise RuntimeError("Unexpected AWS account; no changes made.")
    if identity.get("Arn") == f"arn:aws:iam::{ACCOUNT}:user/{UPLOADER}":
        raise RuntimeError("Use the operator identity, not the application credential.")
    directory = Path(tempfile.mkdtemp(prefix="property-listify-storage-before-", dir=Path.home()))
    print("Private backups:", directory, flush=True)
    hashes = {}
    snapshots = {}
    def capture(name, *command):
        value = aws(*command)
        hashes[name] = save(directory, name + ".json", value)
        snapshots[name] = value
        return value
    capture("operator-identity", "sts", "get-caller-identity")
    for operation in (
        "get-bucket-policy", "get-public-access-block", "get-bucket-cors",
        "get-bucket-encryption", "get-bucket-versioning",
        "get-bucket-ownership-controls", "get-bucket-acl",
    ):
        capture(operation, "s3api", operation, "--bucket", BUCKET, "--region", REGION)
    # No lifecycle was found in the earlier agent snapshot. A lifecycle read
    # must now distinguish absence from a permission or network error.
    command = ["aws", "s3api", "get-bucket-lifecycle-configuration", "--bucket", BUCKET,
               "--region", REGION, "--expected-bucket-owner", ACCOUNT,
               "--output", "json", "--no-cli-pager",
               "--cli-connect-timeout", "10", "--cli-read-timeout", "30"]
    lifecycle = subprocess.run(command, capture_output=True, text=True, timeout=90)
    if lifecycle.returncode:
        if "(NoSuchLifecycleConfiguration)" not in lifecycle.stderr:
            raise RuntimeError("Lifecycle inspection failed; no changes made.")
        lifecycle_value = {"absent": True, "code": "NoSuchLifecycleConfiguration"}
    else:
        lifecycle_value = json.loads(lifecycle.stdout)
    hashes["lifecycle"] = save(directory, "lifecycle.json", lifecycle_value)
    capture("cloudfront", "cloudfront", "get-distribution-config", "--id", "E3JNW2EP3Z3JSP")
    capture("origin-access-control", "cloudfront", "get-origin-access-control", "--id", "E2XEB397I9DXGN")
    capture("iam-user", "iam", "get-user", "--user-name", UPLOADER)
    attached = capture("iam-attached", "iam", "list-attached-user-policies", "--user-name", UPLOADER)
    inline = capture("iam-inline", "iam", "list-user-policies", "--user-name", UPLOADER)
    groups = capture("iam-groups", "iam", "list-groups-for-user", "--user-name", UPLOADER)
    if (groups.get("Groups") != [] or inline.get("PolicyNames") != []
        or snapshots["iam-user"].get("User", {}).get("PermissionsBoundary")
        or {p["PolicyArn"] for p in attached.get("AttachedPolicies", [])} != {FULL_ACCESS}):
        raise RuntimeError("IAM baseline changed; reconcile permissions before changes.")
    managed = capture("iam-managed-policy", "iam", "get-policy", "--policy-arn", FULL_ACCESS)
    capture("iam-managed-version", "iam", "get-policy-version", "--policy-arn", FULL_ACCESS,
            "--version-id", managed["Policy"]["DefaultVersionId"])
    before = json.loads(snapshots["get-bucket-policy"]["Policy"])
    after = remove_unconditional_public_write(before)
    before_hash = save(directory, "media-policy-before.json", before)
    after_hash = save(directory, "media-policy-proposed.json", after)
    print("Before policy SHA256:", before_hash)
    print("Proposed policy SHA256:", after_hash)
    if not args.apply:
        print("PREPARED ONLY: no settings changed. Use --apply for this narrow change.")
        return
    latest = json.loads(aws("s3api", "get-bucket-policy", "--bucket", BUCKET,
                            "--region", REGION)["Policy"])
    if latest != before:
        raise RuntimeError("Bucket policy changed during capture; no changes made.")
    aws("s3api", "put-bucket-policy", "--bucket", BUCKET, "--region", REGION,
        "--policy", "file://" + str(directory / "media-policy-proposed.json"))
    readback = json.loads(aws("s3api", "get-bucket-policy", "--bucket", BUCKET,
                              "--region", REGION)["Policy"])
    save(directory, "media-policy-after.json", readback)
    if readback != after:
        raise RuntimeError("Mutation attempted but readback differs; stop and reconcile backups.")
    save(directory, "result.json", {
        "verifiedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "operation": "remove-known-unconditional-public-put-grant",
        "configurationReadback": "PASS", "beforeHash": before_hash, "afterHash": after_hash,
        "snapshotHashes": hashes, "publicReadPreserved": True,
        "objectsModified": False, "hostedUploadTestsPassed": False,
    })
    print("PASS: anonymous-write grant removed; public reads and all objects preserved.")
    print("No IAM, CloudFront, CORS, encryption, versioning or public-access-block setting changed.")
    print("This is configuration containment; hosted behavior tests remain outstanding.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        raise SystemExit(str(error))
