#!/usr/bin/env python3
"""Operator-only media hardening and isolated runtime identity; no app bindings."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request
import uuid

ACCOUNT = "914683204061"
BUCKET = "listify-properties-sa"
REGION = "eu-north-1"
DOMAIN = "d3fz99u3go2cmn.cloudfront.net"
PROOF_BUCKET = "listify-paid-proofs-914683204061-eun1-290496c0"
SOURCE_ARN = f"arn:aws:cloudfront::{ACCOUNT}:distribution/E3JNW2EP3Z3JSP"
PUBLIC_KEY_HASH = "5f27118e24bc7cc78ec4b0e49d6102e85815c006fd9fb64eeab7138dc9eb6066"
BEFORE_POLICY_HASH = "b537cdf44d7ad58e8840ecc0f58f77121c9c6d78eceabb5de116ba6aebd3a508"
BEFORE_CORS_HASH = "a4fa612732d10cc3c40ae748f51ce83115da6ab71be34a32d3dbb75b852ba01b"
AZURE_INVENTORY_HASH = "33fd4d40e3ba35d51300089fbed6fa00324dc2b631ad8d6336b48a8979b9eab7"
ORIGINS = ["https://www.propertylistifysa.co.za", "https://propertylistifysa.co.za"]


class AwsFailure(RuntimeError):
    def __init__(self, service, operation, code):
        self.code = code
        super().__init__(f"AWS operation failed: {service} {operation} ({code}); preserve state, do not rerun.")


def desired():
    policy = {"Version": "2012-10-17", "Statement": [
        {"Sid": "CloudFrontReadOnly", "Effect": "Allow",
         "Principal": {"Service": "cloudfront.amazonaws.com"}, "Action": "s3:GetObject",
         "Resource": f"arn:aws:s3:::{BUCKET}/*",
         "Condition": {"StringEquals": {"AWS:SourceArn": SOURCE_ARN}}},
        {"Sid": "RequireTLS", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
         "Resource": [f"arn:aws:s3:::{BUCKET}", f"arn:aws:s3:::{BUCKET}/*"],
         "Condition": {"Bool": {"aws:SecureTransport": "false"}}}]}
    block = {key: True for key in ["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"]}
    cors = {"CORSRules": [{"AllowedOrigins": ORIGINS.copy(), "AllowedMethods": ["PUT"],
                          "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 300}]}
    runtime = {"Version": "2012-10-17", "Statement": [{"Sid": "ListingMediaObjectsOnly", "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
        "Resource": f"arn:aws:s3:::{BUCKET}/properties/*"}]}
    return policy, block, cors, runtime


def aws(*args, credentials=None, denied=False):
    env = os.environ.copy()
    if credentials:
        for key in ["AWS_SESSION_TOKEN", "AWS_SECURITY_TOKEN", "AWS_PROFILE", "AWS_DEFAULT_PROFILE"]:
            env.pop(key, None)
        env.update(AWS_ACCESS_KEY_ID=credentials["AccessKeyId"],
                   AWS_SECRET_ACCESS_KEY=credentials["SecretAccessKey"], AWS_EC2_METADATA_DISABLED="true")
    guard = ["--expected-bucket-owner", ACCOUNT] if args[0] == "s3api" else []
    done = subprocess.run(["aws", *args, *guard, "--output", "json", "--no-cli-pager",
                           "--cli-connect-timeout", "10", "--cli-read-timeout", "30"],
                          env=env, capture_output=True, text=True, timeout=90)
    if denied:
        if done.returncode and re.search(r"\(AccessDenied\)", done.stderr):
            return {"operation": args[1], "outcome": "AccessDenied"}
        raise RuntimeError(f"Expected actual AccessDenied: {args[0]} {args[1]}; stop, do not rerun.")
    if done.returncode:
        match = re.search(r"An error occurred \(([A-Za-z0-9_.-]+)\)", done.stderr)
        raise AwsFailure(args[0], args[1], match.group(1) if match else "UnclassifiedFailure")
    return json.loads(done.stdout) if done.stdout.strip() else {}


def runtime_ready(*args, credentials):
    # IAM replication can lag. Retry only explicit rejected positive requests;
    # never replay user/key creation, ambiguous writes or negative acceptance.
    if args[:2] not in [("sts", "get-caller-identity"), ("s3api", "put-object"), ("s3api", "get-object")]:
        raise RuntimeError("Readiness retries are limited to dedicated runtime positive checks.")
    deadline = time.monotonic() + 45
    while True:
        try:
            return aws(*args, credentials=credentials)
        except AwsFailure as error:
            if error.code not in {"InvalidClientTokenId", "InvalidAccessKeyId", "AccessDenied"} or time.monotonic() >= deadline:
                raise
            time.sleep(5)


def save(directory, name, value):
    path = directory / name
    with path.open("x") as handle:
        os.fchmod(handle.fileno(), 0o600)
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")
    return path


def digest(value, pretty=False):
    raw = json.dumps(value, sort_keys=True, indent=2) + "\n" if pretty else json.dumps(value, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def configuration():
    result = {name: aws("s3api", name, "--bucket", BUCKET, "--region", REGION) for name in [
        "get-bucket-policy", "get-public-access-block", "get-bucket-cors", "get-bucket-encryption",
        "get-bucket-ownership-controls", "get-bucket-versioning"]}
    result["get-bucket-policy"] = json.loads(result["get-bucket-policy"]["Policy"])
    return result


def validate_baseline(before):
    if (digest(before["get-bucket-policy"], pretty=True) != BEFORE_POLICY_HASH
            or digest(before["get-bucket-cors"]) != BEFORE_CORS_HASH
            or before["get-public-access-block"]["PublicAccessBlockConfiguration"] != {k: False for k in desired()[1]}
            or before["get-bucket-versioning"] != {}
            or before["get-bucket-ownership-controls"]["OwnershipControls"] != {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}
            or before["get-bucket-encryption"]["ServerSideEncryptionConfiguration"]["Rules"][0]["ApplyServerSideEncryptionByDefault"]["SSEAlgorithm"] != "AES256"):
        raise RuntimeError("Media baseline differs from the fresh reviewed snapshot; no writes allowed.")


def inventory():
    objects = []
    token = None
    while True:
        args = ["s3api", "list-objects-v2", "--bucket", BUCKET, "--region", REGION,
                "--max-keys", "1000", "--no-paginate"]
        if token:
            args.extend(["--continuation-token", token])
        page = aws(*args)
        objects.extend({k: item[k] for k in ["Key", "Size", "ETag"]} for item in page.get("Contents", []))
        if len(objects) > 100000:
            raise RuntimeError("Inventory exceeded reviewed bound.")
        if not page.get("IsTruncated"):
            return sorted(objects, key=lambda item: item["Key"])
        token = page.get("NextContinuationToken")
        if not token:
            raise RuntimeError("Inventory pagination incomplete.")


def unsigned(url, method="GET", headers=None, body=None):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, hdrs, newurl):
            return None
    request = urllib.request.Request(url, data=body, method=method,
                                     headers={"Accept-Encoding": "identity", **(headers or {})})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
            return response.status, response.headers, response.read(4097)
    except urllib.error.HTTPError as error:
        return error.code, error.headers, b""


def transfer(public_key, envelope):
    raw = json.dumps(envelope, separators=(",", ":")).encode()
    if len(raw) > 446:
        raise RuntimeError("Credential envelope exceeds transfer-key bound.")
    # Plaintext stays in memory and stdin; never write a credential source file.
    done = subprocess.run(["openssl", "pkeyutl", "-encrypt", "-pubin", "-inkey", str(public_key),
                           "-pkeyopt", "rsa_padding_mode:oaep", "-pkeyopt", "rsa_oaep_md:sha256",
                           "-pkeyopt", "rsa_mgf1_md:sha256"], input=raw, capture_output=True, timeout=30)
    if done.returncode or len(done.stdout) != 512:
        raise RuntimeError("Encrypted export failed; no plaintext is emitted.")
    return done.stdout


def harden(directory, before):
    policy, block, cors, _ = desired()
    validate_baseline(before)
    if configuration() != before:
        raise RuntimeError("Configuration changed since backup; no writes allowed.")
    for operation, flag, value, filename in [
        ("put-bucket-policy", "--policy", policy, "policy-proposed.json"),
        ("put-public-access-block", "--public-access-block-configuration", block, "block-proposed.json"),
        ("put-bucket-cors", "--cors-configuration", cors, "cors-proposed.json")]:
        path = save(directory, filename, value)
        aws("s3api", operation, "--bucket", BUCKET, "--region", REGION, flag, "file://" + str(path))
    after = configuration()
    save(directory, "configuration-after.json", after)
    if (after["get-bucket-policy"] != policy or after["get-public-access-block"]["PublicAccessBlockConfiguration"] != block
            or after["get-bucket-cors"] != cors
            or any(after[name] != before[name] for name in ["get-bucket-encryption", "get-bucket-ownership-controls", "get-bucket-versioning"])):
        raise RuntimeError("Hardening readback differs; hold release, do not restore public grants or rerun.")


def check_delivery(directory, key, payload):
    url = f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"
    direct, _, _ = unsigned(url)
    cdn, headers, content = unsigned(f"https://{DOMAIN}/{key}")
    if direct != 403 or cdn != 200 or headers.get("X-Cache", "").lower() != "miss from cloudfront" or content != payload:
        raise RuntimeError("Fresh origin/anonymous-read acceptance failed; preserve hardened settings and inspect.")
    for origin in ORIGINS:
        status, response, _ = unsigned(url, "OPTIONS", {"Origin": origin,
            "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type"})
        if (status != 200 or response.get("Access-Control-Allow-Origin") != origin
                or {m.strip() for m in response.get("Access-Control-Allow-Methods", "").split(",")} != {"PUT"}
                or {h.strip().lower() for h in response.get("Access-Control-Allow-Headers", "").split(",")} != {"content-type"}):
            raise RuntimeError("Production PUT preflight failed; hold hosted acceptance.")
    for origin, method in [("https://storage-verification.invalid", "PUT"), (ORIGINS[0], "DELETE")]:
        status, response, _ = unsigned(url, "OPTIONS", {"Origin": origin, "Access-Control-Request-Method": method})
        if status != 403 or response.get("Access-Control-Allow-Origin"):
            raise RuntimeError("Unexpected CORS origin/method permitted.")
    denial_key = "properties/storage-hardening-denial-" + uuid.uuid4().hex + ".txt"
    status, _, _ = unsigned(f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{denial_key}", "PUT",
                            {"Content-Type": "text/plain"}, payload)
    if status != 403:
        raise RuntimeError("Anonymous upload was not denied; stop.")
    save(directory, "origin-cors-verification.json", {"directS3Status": direct, "freshCloudFrontStatus": cdn,
        "freshCloudFrontMissAndPayloadVerified": True, "productionPutPreflightsPassed": 2,
        "foreignOriginAndDeletePreflightsDenied": True, "anonymousPutStatus": status,
        "actualHostedBrowserJourneyVerified": False})


def provision_runtime(directory, public_key, payload_path):
    _, _, _, policy = desired()
    user = "listify-media-runtime-" + uuid.uuid4().hex[:8]
    arn = f"arn:aws:iam::{ACCOUNT}:user/{user}"
    save(directory, "runtime-plan.json", {"user": user, "arn": arn, "existingIamUsersModified": False})
    aws("iam", "create-user", "--user-name", user, "--tags", json.dumps([{"Key": "Purpose", "Value": "MVP1-scoped-media"}]))
    policy_path = save(directory, "runtime-policy.json", policy)
    aws("iam", "put-user-policy", "--user-name", user, "--policy-name", "ListingMediaObjectsOnly",
        "--policy-document", "file://" + str(policy_path))
    readback = aws("iam", "get-user-policy", "--user-name", user, "--policy-name", "ListingMediaObjectsOnly")
    details = aws("iam", "get-user", "--user-name", user)["User"]
    if (readback["PolicyDocument"] != policy or details["Arn"] != arn or details.get("PermissionsBoundary")
            or aws("iam", "list-attached-user-policies", "--user-name", user)["AttachedPolicies"]
            or aws("iam", "list-groups-for-user", "--user-name", user)["Groups"]
            or aws("iam", "list-user-policies", "--user-name", user)["PolicyNames"] != ["ListingMediaObjectsOnly"]):
        raise RuntimeError("New runtime identity has unexpected grants; no live key created.")
    access = aws("iam", "create-access-key", "--user-name", user)["AccessKey"]
    try:
        encrypted = transfer(public_key, {"AWS_REGION": REGION, "S3_BUCKET_NAME": BUCKET,
            "CLOUDFRONT_URL": f"https://{DOMAIN}", "runtimeUser": user,
            "AWS_ACCESS_KEY_ID": access["AccessKeyId"], "AWS_SECRET_ACCESS_KEY": access["SecretAccessKey"]})
        export_path = directory / "media-runtime.encrypted"
        with export_path.open("xb") as handle:
            os.fchmod(handle.fileno(), 0o600)
            handle.write(encrypted)
    except Exception:
        aws("iam", "update-access-key", "--user-name", user, "--access-key-id", access["AccessKeyId"], "--status", "Inactive")
        raise
    save(directory, "encrypted-runtime-export.json", {"user": user,
        "encryptedCredentialsSha256": hashlib.sha256(encrypted).hexdigest()})
    if runtime_ready("sts", "get-caller-identity", credentials=access).get("Arn") != arn:
        raise RuntimeError("Dedicated runtime identity differs; stop before runtime object writes.")
    key = "properties/storage-hardening-runtime-" + uuid.uuid4().hex + ".txt"
    runtime_ready("s3api", "put-object", "--bucket", BUCKET, "--region", REGION, "--key", key,
        "--body", str(payload_path), "--if-none-match", "*", "--server-side-encryption", "AES256", credentials=access)
    downloaded = directory / "runtime-task-object.txt"
    runtime_ready("s3api", "get-object", "--bucket", BUCKET, "--region", REGION, "--key", key, str(downloaded), credentials=access)
    if downloaded.read_bytes() != payload_path.read_bytes():
        raise RuntimeError("Runtime task-object payload differs.")
    negatives = [
        ("s3api", "list-objects-v2", "--bucket", BUCKET, "--region", REGION, "--max-keys", "1"),
        ("s3api", "get-bucket-cors", "--bucket", BUCKET, "--region", REGION),
        ("s3api", "get-bucket-encryption", "--bucket", BUCKET, "--region", REGION),
        ("s3api", "put-object", "--bucket", BUCKET, "--region", REGION, "--key", "videos/storage-denial-" + uuid.uuid4().hex,
         "--body", str(payload_path), "--if-none-match", "*"),
        ("s3api", "get-object", "--bucket", PROOF_BUCKET, "--region", REGION,
         "--key", "billing-proofs/storage-denial-" + uuid.uuid4().hex, str(directory / "unexpected-proof.txt"))]
    results = [aws(*operation, credentials=access, denied=True) for operation in negatives]
    aws("s3api", "delete-object", "--bucket", BUCKET, "--region", REGION, "--key", key, credentials=access)
    return {"runtimeUser": user, "runtimeArn": arn, "encryptedCredentialsSha256": hashlib.sha256(encrypted).hexdigest(),
            "runtimePutGetPayloadAndDeletePassed": True, "runtimeNegativeChecks": results,
            "historicalVersionReadOrInfrastructureWritesExercised": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--public-key", type=Path, required=True)
    args = parser.parse_args()
    os.umask(0o077)
    if hashlib.sha256(args.public_key.read_bytes()).hexdigest() != PUBLIC_KEY_HASH:
        raise RuntimeError("Transfer public key differs; no changes made.")
    identity = aws("sts", "get-caller-identity")
    if identity.get("Account") != ACCOUNT or any(part in identity.get("Arn", "") for part in [
            ":user/vercel-s3-uploader", ":user/listify-paid-proof-runtime-", ":user/listify-media-runtime-"]):
        raise RuntimeError("Use the existing AWS operator account, not application credentials.")
    before = configuration()
    validate_baseline(before)
    transfer(args.public_key, {"test": "No live credentials"})
    if not args.apply:
        print("PREPARED ONLY: operator, transfer key and reviewed media baseline verified; no changes made.")
        return
    directory = Path.home() / "property-listify-media-hardening-20261002"
    directory.mkdir(mode=0o700, exist_ok=False)
    print("Private hardening state:", directory, flush=True)
    save(directory, "configuration-before.json", before)
    retained = inventory()
    save(directory, "object-inventory-before.private.json", retained)
    payload = b"Property Listify final media hardening probe; no customer content.\n"
    payload_path = directory / "task-object.txt"
    with payload_path.open("xb") as handle:
        os.fchmod(handle.fileno(), 0o600)
        handle.write(payload)
    harden(directory, before)
    key = "properties/storage-hardening-origin-" + uuid.uuid4().hex + ".txt"
    save(directory, "retained-task-object.private.json", {"key": key, "sha256": hashlib.sha256(payload).hexdigest()})
    aws("s3api", "put-object", "--bucket", BUCKET, "--region", REGION, "--key", key,
        "--body", str(payload_path), "--if-none-match", "*", "--server-side-encryption", "AES256",
        "--content-type", "text/plain", "--cache-control", "no-store")
    check_delivery(directory, key, payload)
    runtime = provision_runtime(directory, args.public_key, payload_path)
    current = inventory()
    if [item for item in current if item["Key"] != key] != retained:
        raise RuntimeError("Retained media inventory differs; hold cutover and preserve evidence.")
    final = configuration()
    expected = desired()
    if (final["get-bucket-policy"] != expected[0]
            or final["get-public-access-block"]["PublicAccessBlockConfiguration"] != expected[1]
            or final["get-bucket-cors"] != expected[2]
            or any(final[name] != before[name] for name in ["get-bucket-encryption", "get-bucket-ownership-controls", "get-bucket-versioning"])):
        raise RuntimeError("Final configuration changed during verification; hold cutover.")
    save(directory, "configuration-final.json", final)
    result = {"configurationAndOperatorStorageChecks": "PASS", **runtime,
              "existingObjectsPreserved": True, "retainedObjectCountBefore": len(retained),
              "existingIamUsersModified": False, "productionBindingsChanged": False,
              "azureDependencyInventorySha256": AZURE_INVENTORY_HASH,
              "hostedUploadDisplayAndOwnerIsolationVerified": False}
    save(directory, "result.json", result)
    print("PASS: media policy/public-access blocks/CORS read back; fresh CloudFront miss/hash and anonymous read/write denial passed.")
    print("PASS: both production PUT preflights passed; foreign origin and DELETE preflights denied.")
    print("PASS: dedicated media runtime PUT/GET/DELETE and bounded negative checks passed; retained media inventory unchanged.")
    print("Dedicated media runtime user:", runtime["runtimeUser"])
    print("Encrypted credential download:", directory / "media-runtime.encrypted")
    print("Encrypted credential SHA256:", runtime["encryptedCredentialsSha256"])
    print("Existing IAM users and production bindings unchanged. Do not rerun. Hosted acceptance remains pending.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error))
