#!/usr/bin/env python3
"""Operator probe: one fresh object, exact-key restriction, guarded restoration."""
import argparse
import copy
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.error
import urllib.request
import uuid

module_path = Path(__file__).with_name("aws-media-remove-public-write.py")
spec = importlib.util.spec_from_file_location("media_operator", module_path)
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)
SOURCE_ARN = "arn:aws:cloudfront::914683204061:distribution/E3JNW2EP3Z3JSP"
DOMAIN = "d3fz99u3go2cmn.cloudfront.net"
EXPECTED_POLICY_HASH = "b537cdf44d7ad58e8840ecc0f58f77121c9c6d78eceabb5de116ba6aebd3a508"


def policy_hash(policy):
    return hashlib.sha256((json.dumps(policy, indent=2, sort_keys=True) + "\n").encode()).hexdigest()


def probe_policy(before, key):
    if policy_hash(before) != EXPECTED_POLICY_HASH:
        raise ValueError("Policy differs from verified post-containment baseline; no changes made.")
    if not re.fullmatch(r"properties/storage-verification-[a-f0-9]{32}\.txt", key):
        raise ValueError("Only one task-owned test key is allowed.")
    result = copy.deepcopy(before)
    result["Statement"].append({
        "Sid": "TemporaryExactObjectOriginProbe",
        "Effect": "Deny", "Principal": "*", "Action": "s3:GetObject",
        "Resource": f"arn:aws:s3:::{operator.BUCKET}/{key}",
        "Condition": {"StringNotEquals": {"AWS:SourceArn": SOURCE_ARN}},
    })
    return result


def get_policy():
    return json.loads(operator.aws("s3api", "get-bucket-policy", "--bucket", operator.BUCKET,
                                   "--region", operator.REGION)["Policy"])


def read_http(url):
    request = urllib.request.Request(url, headers={"Accept-Encoding": "identity"})
    # Do not follow redirects to unrelated hosts, and never sign these requests.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(request, timeout=30) as response:
            data = response.read(4097)
            return response.status, response.headers, data
    except urllib.error.HTTPError as error:
        return error.code, error.headers, b""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not args.apply:
        print("No AWS operation performed. Use --apply for the task-owned origin test.")
        return
    os.umask(0o077)
    identity = operator.aws("sts", "get-caller-identity")
    if identity.get("Account") != operator.ACCOUNT:
        raise RuntimeError("Wrong operator account; no changes made.")
    if identity.get("Arn") == f"arn:aws:iam::{operator.ACCOUNT}:user/{operator.UPLOADER}":
        raise RuntimeError("Use the operator identity, not the application credential.")
    before = get_policy()
    key = "properties/storage-verification-" + uuid.uuid4().hex + ".txt"
    temporary = probe_policy(before, key)
    directory = Path(tempfile.mkdtemp(prefix="property-listify-origin-probe-", dir=Path.home()))
    print("Private evidence:", directory, flush=True)
    operator.save(directory, "policy-before.json", before)
    operator.save(directory, "policy-temporary.json", temporary)
    payload = b"Property Listify controlled release origin probe. No customer content.\n"
    with open(directory / "test-object.txt", "xb") as file:
        os.chmod(directory / "test-object.txt", 0o600)
        file.write(payload)
    expected = hashlib.sha256(payload).hexdigest()
    operator.save(directory, "task-object.private.json", {
        "bucket": operator.BUCKET, "key": key, "sha256": expected,
        "bytes": len(payload), "existingObjectModified": False,
    })
    # Conditional creation prevents replacing even an unexpectedly colliding key.
    created = operator.aws("s3api", "put-object", "--bucket", operator.BUCKET,
                           "--region", operator.REGION, "--key", key,
                           "--body", str(directory / "test-object.txt"),
                           "--if-none-match", "*", "--server-side-encryption", "AES256",
                           "--content-type", "text/plain", "--cache-control", "no-store")
    operator.save(directory, "object-created.json", created)
    if get_policy() != before:
        raise RuntimeError("Policy changed after test-object creation; no policy mutation attempted.")
    applied = False
    result = {"testPassed": False, "existingObjectsModified": False,
              "testObjectRetained": True, "temporaryPolicyRestored": False}
    try:
        # Mark the attempt before submitting so ambiguous network failure still
        # enters the guarded reconciliation below.
        applied = True
        operator.aws("s3api", "put-bucket-policy", "--bucket", operator.BUCKET,
                     "--region", operator.REGION,
                     "--policy", "file://" + str(directory / "policy-temporary.json"))
        if get_policy() != temporary:
            raise RuntimeError("Temporary policy readback differs; stop and reconcile.")
        direct_status = None
        for attempt in range(4):
            direct_status, _, _ = read_http(
                f"https://{operator.BUCKET}.s3.{operator.REGION}.amazonaws.com/{key}")
            if direct_status == 403:
                break
            if direct_status != 200:
                raise RuntimeError("Unexpected unsigned S3 status; test failed.")
            if attempt < 3:
                time.sleep(3)
        result["unsignedS3Status"] = direct_status
        if direct_status != 403:
            raise RuntimeError("Unsigned S3 read was not denied; authenticated-origin proof failed.")
        status, headers, data = read_http(f"https://{DOMAIN}/{key}")
        result.update({
            "cloudFrontStatus": status, "cloudFrontCache": headers.get("X-Cache"),
            "cloudFrontRequestId": headers.get("X-Amz-Cf-Id"),
            "payloadHashMatches": hashlib.sha256(data).hexdigest() == expected,
            "verifiedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        if (status != 200 or headers.get("X-Cache", "").lower() != "miss from cloudfront"
            or not result["payloadHashMatches"]):
            raise RuntimeError("Fresh CloudFront miss/hash verification failed; see private result.")
        result["testPassed"] = True
    finally:
        if applied:
            operator.save(directory, "probe-result-before-restoration.json", result)
            try:
                current = get_policy()
                if current == temporary:
                    operator.aws("s3api", "put-bucket-policy", "--bucket", operator.BUCKET,
                                 "--region", operator.REGION,
                                 "--policy", "file://" + str(directory / "policy-before.json"))
                    result["temporaryPolicyRestored"] = get_policy() == before
                elif current == before:
                    result["temporaryPolicyRestored"] = True
                else:
                    result["unrelatedPolicyChangeDetected"] = True
            except (RuntimeError, ValueError, KeyError, operator.subprocess.TimeoutExpired):
                result["restorationInspectionFailed"] = True
            operator.save(directory, "result.json", result)
            if not result["temporaryPolicyRestored"]:
                raise RuntimeError("STOP: policy restoration not verified. Preserve evidence; do not rerun.")
    print("PASS: unsigned S3 GET denied (403); fresh CloudFront miss returned 200 with matching hash.")
    print("PASS: temporary exact-object restriction removed; post-containment policy restored.")
    print("One harmless task-owned test object retained. Existing media and all other settings preserved.")
    print("This proves authenticated origin retrieval; browser uploads/private proofs remain unverified.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, urllib.error.URLError,
            operator.subprocess.TimeoutExpired) as error:
        raise SystemExit(str(error))
