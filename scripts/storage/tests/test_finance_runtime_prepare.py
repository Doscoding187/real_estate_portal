"""Finance runtime preparation security contracts. No AWS calls or customer data."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "finance_runtime_prepare", ROOT / "aws-finance-runtime-prepare.py")
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)

WRITE_OPERATIONS = ["iam create-access-key", "s3api put-object", "s3api delete-object",
                    "s3api copy-object", "iam put-user-policy"]


def make_aws(overrides=None):
    overrides = overrides or {}
    calls = []

    def fake(*args):
        calls.append(list(args))
        op = args[1] if len(args) > 1 else args[0]
        if op in overrides:
            value = overrides[op]
            return copy.deepcopy(value) if not callable(value) else value()
        if op == "get-caller-identity":
            return {"Account": prepare.ACCOUNT, "Arn": prepare.ROOT_ARN}
        if op == "describe-stacks":
            return {"Stacks": [{
                "StackStatus": "CREATE_COMPLETE",
                "StackId": "arn:aws:cloudformation:af-south-1:914683204061:stack/listify-finance",
                "Outputs": [{"OutputKey": key, "OutputValue": value}
                            for key, value in prepare.EXPECTED_STACK_OUTPUTS.items()],
                "Parameters": [{"ParameterKey": "OperatorArn", "ParameterValue": prepare.OPERATOR_ARN}],
            }]}
        if op == "describe-stack-resources":
            return {"StackResources": [
                {"LogicalResourceId": name,
                 "PhysicalResourceId": expected if expected is not None else name + "-generated"}
                for name, expected in prepare.EXPECTED_STACK_RESOURCES.items()]}
        if op == "get-bucket-location":
            return {"LocationConstraint": prepare.REGION}
        if op == "get-bucket-versioning":
            return {"Status": "Enabled"}
        if op == "get-bucket-encryption":
            return {"ServerSideEncryptionConfiguration": {"Rules": [
                {"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}}
        if op == "get-public-access-block":
            return {"PublicAccessBlockConfiguration": copy.deepcopy(prepare.PUBLIC_ACCESS_BLOCK)}
        if op == "get-bucket-ownership-controls":
            return {"OwnershipControls": copy.deepcopy(prepare.OWNERSHIP_CONTROLS)}
        if op == "get-bucket-policy":
            bucket = args[args.index("--bucket") + 1]
            principals = (prepare.PRIMARY_PRINCIPALS if bucket == prepare.PRIMARY_BUCKET
                          else prepare.BACKUP_PRINCIPALS)
            return {"Policy": json.dumps(prepare.expected_bucket_policy(bucket, principals))}
        if op == "get-bucket-replication":
            return {"ReplicationConfiguration": {"Role": prepare.REPLICATION_ROLE_ARN, "Rules": [{
                "ID": "DomesticBackup", "Status": "Enabled", "Priority": 1,
                "Filter": {"Prefix": ""}, "DeleteMarkerReplication": {"Status": "Disabled"},
                "Destination": {"Bucket": prepare.BACKUP_ARN}}]}}
        if op == "get-user-policy":
            return {"PolicyDocument": copy.deepcopy(prepare.expected_runtime_policy())}
        if op == "list-access-keys":
            return {"AccessKeyMetadata": []}
        if op == "put-object":
            return {"VersionId": "source-version", "ETag": '"' + "e" * 32 + '"'}
        if op == "head-object":
            return {"ReplicationStatus": "COMPLETED", "ServerSideEncryption": "AES256",
                    "ContentLength": len(prepare.RECOVERY_PAYLOAD)}
        if op == "list-object-versions":
            return {"Versions": [{"Key": "replica-key", "VersionId": "replica-version",
                                  "LastModified": "2026-10-18T00:00:00.000Z"}]}
        if op == "get-object":
            target = next(Path(value) for value in args
                          if isinstance(value, str) and value.startswith("/") and value.endswith(".txt"))
            target.write_bytes(prepare.RECOVERY_PAYLOAD)
            return {"ContentLength": len(prepare.RECOVERY_PAYLOAD)}
        if op == "delete-object":
            return {"DeleteMarker": True, "VersionId": "delete-marker-version"}
        if op == "copy-object":
            return {"CopyObjectResult": {"ETag": '"' + "e" * 32 + '"'}}
        if op == "create-access-key":
            return {"AccessKey": {"AccessKeyId": "AKIA" + "B" * 16, "SecretAccessKey": "C" * 40,
                                  "Status": "Active"}}
        raise AssertionError(f"unexpected AWS call: {args}")

    return calls, fake


def make_raw(head_missing=False):
    def raw(args):
        if "get-bucket-lifecycle-configuration" in args:
            return subprocess.CompletedProcess(
                args, 1, stdout="", stderr="An error occurred (NoSuchLifecycleConfiguration)")
        if head_missing and "head-object" in args:
            return subprocess.CompletedProcess(
                args, 1, stdout="",
                stderr="An error occurred (404) when calling the HeadObject operation: Not Found")
        raise AssertionError(f"unexpected raw AWS call: {args}")
    return raw


def operations(calls):
    return [" ".join(call[:2]) for call in calls]


def assert_no_maintenance(self, calls):
    for forbidden in WRITE_OPERATIONS:
        self.assertNotIn(forbidden, operations(calls))


def recovery_evidence(directory):
    path = Path(directory) / "recovery.private.json"
    path.write_text(json.dumps({
        "key": prepare.PREFIX + "/recovery-verification-" + "a" * 32 + ".txt",
        "recoveryExercised": True,
        "historicalAndCurrentReadback": "PASS",
        "anonymousStatus": 403,
        "temporaryPaidResourceCreated": False,
        "productionBindingsChanged": False,
        "sha256": "b" * 64,
    }))
    return path


class ConfigurationContracts(unittest.TestCase):
    def test_runtime_policy_is_put_get_only_with_backup_denial_open(self):
        allow, deny_delete, deny_backup = prepare.expected_runtime_policy()["Statement"]
        self.assertEqual(allow["Action"], ["s3:GetObject", "s3:PutObject"])
        self.assertEqual(allow["Resource"], prepare.PRIMARY_ARN + "/billing-proofs/*")
        self.assertEqual(set(deny_delete["Action"]), {"s3:DeleteObject", "s3:DeleteObjectVersion"})
        self.assertEqual(deny_delete["Resource"], prepare.PRIMARY_ARN + "/*")
        self.assertEqual(deny_backup["Resource"], [prepare.BACKUP_ARN, prepare.BACKUP_ARN + "/*"])

    def test_bucket_policies_keep_runtime_out_of_backup(self):
        primary = prepare.expected_bucket_policy(prepare.PRIMARY_BUCKET, prepare.PRIMARY_PRINCIPALS)
        backup = prepare.expected_bucket_policy(prepare.BACKUP_BUCKET, prepare.BACKUP_PRINCIPALS)
        primary_principals = primary["Statement"][1]["Condition"]["ArnNotEquals"]["aws:PrincipalArn"]
        backup_principals = backup["Statement"][1]["Condition"]["ArnNotEquals"]["aws:PrincipalArn"]
        self.assertIn(prepare.RUNTIME_ARN, primary_principals)
        self.assertNotIn(prepare.RUNTIME_ARN, backup_principals)
        self.assertIn(prepare.REPLICATION_ROLE_ARN, backup_principals)
        self.assertEqual(primary["Statement"][0]["Condition"], {"Bool": {"aws:SecureTransport": "false"}})

    def test_preflight_accepts_recorded_target_without_maintenance_actions(self):
        calls, fake = make_aws()
        with patch.object(prepare, "aws", side_effect=fake), \
                patch.object(prepare, "_run_aws", side_effect=make_raw()):
            claims = prepare.preflight(require_no_access_keys=True)
        self.assertEqual(claims["callerArn"], prepare.ROOT_ARN)
        self.assertEqual(claims["existingAccessKeys"], 0)
        assert_no_maintenance(self, calls)

    def test_preflight_drift_stops_before_any_maintenance(self):
        calls, fake = make_aws(overrides={"get-bucket-versioning": {"Status": "Suspended"}})
        with patch.object(prepare, "aws", side_effect=fake), \
                patch.object(prepare, "_run_aws", side_effect=make_raw()):
            with self.assertRaisesRegex(RuntimeError, "versioning"):
                prepare.preflight(require_no_access_keys=True)
        assert_no_maintenance(self, calls)

    def test_preflight_replication_drift_stops_before_any_maintenance(self):
        calls, fake = make_aws(overrides={"get-bucket-replication": {
            "ReplicationConfiguration": {"Role": prepare.REPLICATION_ROLE_ARN, "Rules": [{
                "ID": "OtherRule", "Status": "Enabled", "Priority": 1, "Filter": {"Prefix": ""},
                "DeleteMarkerReplication": {"Status": "Disabled"},
                "Destination": {"Bucket": prepare.BACKUP_ARN}}]}}})
        with patch.object(prepare, "aws", side_effect=fake), \
                patch.object(prepare, "_run_aws", side_effect=make_raw()):
            with self.assertRaisesRegex(RuntimeError, "replication"):
                prepare.preflight(require_no_access_keys=False)
        assert_no_maintenance(self, calls)

    def test_preflight_refuses_runtime_credentials_as_operator(self):
        calls, fake = make_aws(overrides={"get-caller-identity": {
            "Account": prepare.ACCOUNT, "Arn": prepare.RUNTIME_ARN}})
        with patch.object(prepare, "aws", side_effect=fake), \
                patch.object(prepare, "_run_aws", side_effect=make_raw()):
            with self.assertRaisesRegex(RuntimeError, "runtime identity"):
                prepare.preflight(require_no_access_keys=False)
        self.assertEqual(len(calls), 1)


class QuoteContracts(unittest.TestCase):
    def quote_path(self, payload):
        directory = Path(tempfile.mkdtemp())
        path = directory / "quote.json"
        path.write_text(json.dumps(payload))
        return path

    def test_cost_forecast_shape_is_accepted_and_budget_is_enforced(self):
        raw, amount = prepare.parse_quote(
            self.quote_path({"Total": {"Amount": "0.42", "Unit": "USD"}}))
        self.assertEqual(amount, 0.42)
        self.assertEqual(raw, b'{"Total": {"Amount": "0.42", "Unit": "USD"}}')
        prepare.verify_quote(amount, 1.0)
        with self.assertRaisesRegex(RuntimeError, "FOUNDER SPEND GATE"):
            prepare.verify_quote(amount, 0.25)

    def test_invalid_quotes_are_refused(self):
        for payload in [{"Total": {"Amount": "0.42", "Unit": "ZAR"}},
                        {"amountUsd": -1}, {"note": "no numbers"}, ["list"]]:
            with self.subTest(payload=payload), self.assertRaises(RuntimeError):
                prepare.parse_quote(self.quote_path(payload))
        with self.assertRaisesRegex(RuntimeError, "positive USD budget"):
            prepare.verify_quote(0.1, 0)


class RecoveryContracts(unittest.TestCase):
    def test_recovery_sequence_restores_from_backup_and_records_honest_flags(self):
        calls, fake = make_aws()
        with tempfile.TemporaryDirectory() as quote_dir, \
                tempfile.TemporaryDirectory() as recovery_parent, \
                patch.object(prepare, "aws", side_effect=fake), \
                patch.object(prepare, "_run_aws", side_effect=make_raw(head_missing=True)), \
                patch.object(prepare, "RECOVERY_DIRECTORY", Path(recovery_parent) / "run"), \
                patch.object(prepare.urllib.request, "urlopen",
                             side_effect=urllib.error.HTTPError("url", 403, "Forbidden", {}, None)):
            quote = Path(quote_dir) / "quote.json"
            quote.write_text(json.dumps({"Total": {"Amount": "0.10", "Unit": "USD"}}))
            evidence = prepare.run_recovery(quote, 1.0)
            stored = json.loads((Path(recovery_parent) / "run" / "recovery.private.json").read_text())
        self.assertTrue(evidence["key"].startswith(prepare.PREFIX + "/recovery-verification-"))
        self.assertEqual(evidence["anonymousStatus"], 403)
        self.assertIs(evidence["recoveryExercised"], True)
        self.assertIs(evidence["temporaryPaidResourceCreated"], False)
        self.assertIs(evidence["productionBindingsChanged"], False)
        self.assertIs(evidence["runtimePermissionsExercised"], False)
        self.assertEqual(evidence["replicaVersionId"], "replica-version")
        recorded = operations(calls)
        self.assertLess(recorded.index("s3api put-object"), recorded.index("s3api delete-object"))
        self.assertLess(recorded.index("s3api delete-object"), recorded.index("s3api copy-object"))
        copy_call = next(call for call in calls if call[:2] == ["s3api", "copy-object"])
        source = copy_call[copy_call.index("--copy-source") + 1]
        self.assertTrue(source.startswith(prepare.BACKUP_BUCKET + "/" + evidence["key"]))
        self.assertIn("versionId=replica-version", source)
        self.assertIs(stored["recoveryExercised"], True)
        self.assertEqual(stored["quoteAmountUsd"], 0.10)


class IssueContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.private_key = Path(cls.tmp.name) / "transfer.private.pem"
        cls.public_key = Path(cls.tmp.name) / "transfer.public.pem"
        subprocess.run(["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:4096",
                        "-out", str(cls.private_key)], check=True, capture_output=True)
        subprocess.run(["openssl", "pkey", "-in", str(cls.private_key), "-pubout",
                        "-out", str(cls.public_key)], check=True, capture_output=True)
        cls.public_hash = prepare.sha256(cls.public_key.read_bytes())

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_public_key_must_be_rsa4096(self):
        self.assertEqual(prepare.public_key_bits(self.public_key), 4096)
        small = Path(self.tmp.name) / "small.pem"
        subprocess.run(["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048",
                        "-out", str(small)], check=True, capture_output=True)
        small_pub = Path(self.tmp.name) / "small.pub.pem"
        subprocess.run(["openssl", "pkey", "-in", str(small), "-pubout", "-out", str(small_pub)],
                       check=True, capture_output=True)
        with self.assertRaisesRegex(RuntimeError, "RSA-4096"):
            prepare.public_key_bits(small_pub)

    def test_issue_refuses_without_valid_recovery_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            evidence = Path(directory) / "recovery.private.json"
            evidence.write_text(json.dumps({"recoveryExercised": False}))
            with patch.object(prepare, "preflight") as preflight:
                with self.assertRaisesRegex(RuntimeError, "Recovery evidence"):
                    prepare.run_issue(self.public_key, self.public_hash, evidence)
                preflight.assert_not_called()

    def test_issue_refuses_when_access_key_already_exists(self):
        calls, fake = make_aws(overrides={"list-access-keys": {"AccessKeyMetadata": [
            {"AccessKeyId": "AKIA" + "D" * 16}]}})
        with tempfile.TemporaryDirectory() as evidence_dir, \
                tempfile.TemporaryDirectory() as issue_parent:
            evidence = recovery_evidence(evidence_dir)
            issue_dir = Path(issue_parent) / "issue"
            with patch.object(prepare, "aws", side_effect=fake), \
                    patch.object(prepare, "_run_aws", side_effect=make_raw()), \
                    patch.object(prepare, "ISSUE_DIRECTORY", issue_dir):
                with self.assertRaisesRegex(RuntimeError, "already has an access key"):
                    prepare.run_issue(self.public_key, self.public_hash, evidence)
            self.assertNotIn("iam create-access-key", operations(calls))
            self.assertFalse(issue_dir.exists())

    def test_envelope_bound_checked_before_key_creation(self):
        calls, fake = make_aws()
        with tempfile.TemporaryDirectory() as evidence_dir, \
                tempfile.TemporaryDirectory() as issue_parent:
            evidence = recovery_evidence(evidence_dir)
            with patch.object(prepare, "aws", side_effect=fake), \
                    patch.object(prepare, "_run_aws", side_effect=make_raw()), \
                    patch.object(prepare, "ISSUE_DIRECTORY", Path(issue_parent) / "issue"), \
                    patch.object(prepare, "MAX_ENVELOPE_BYTES", 10):
                with self.assertRaisesRegex(RuntimeError, "RSA-OAEP bound"):
                    prepare.run_issue(self.public_key, self.public_hash, evidence)
            self.assertNotIn("iam create-access-key", operations(calls))

    def test_encryption_preflight_failure_creates_no_access_key(self):
        calls, fake = make_aws()
        with tempfile.TemporaryDirectory() as evidence_dir, \
                tempfile.TemporaryDirectory() as issue_parent:
            evidence = recovery_evidence(evidence_dir)
            with patch.object(prepare, "aws", side_effect=fake), \
                    patch.object(prepare, "_run_aws", side_effect=make_raw()), \
                    patch.object(prepare, "ISSUE_DIRECTORY", Path(issue_parent) / "issue"), \
                    patch.object(prepare, "encrypt_credentials",
                                 side_effect=RuntimeError("openssl unavailable")):
                with self.assertRaisesRegex(RuntimeError, "openssl unavailable"):
                    prepare.run_issue(self.public_key, self.public_hash, evidence)
            self.assertNotIn("iam create-access-key", operations(calls))

    def test_issue_records_contract_and_removes_plaintext(self):
        calls, fake = make_aws()
        with tempfile.TemporaryDirectory() as evidence_dir, \
                tempfile.TemporaryDirectory() as issue_parent:
            evidence = recovery_evidence(evidence_dir)
            issue_dir = Path(issue_parent) / "issue"
            with patch.object(prepare, "aws", side_effect=fake), \
                    patch.object(prepare, "_run_aws", side_effect=make_raw()), \
                    patch.object(prepare, "ISSUE_DIRECTORY", issue_dir):
                encrypted_hash = prepare.run_issue(self.public_key, self.public_hash, evidence)
            result = json.loads((issue_dir / "result.json").read_text())
            self.assertEqual(result["configurationReadback"], "PASS")
            self.assertEqual(result["recoveryReadback"], "PASS")
            self.assertEqual(result["recoveryEvidenceSha256"], prepare.sha256(evidence.read_bytes()))
            self.assertEqual(result["existingAccessKeysBefore"], 0)
            self.assertEqual(result["accessKeysCreated"], 1)
            self.assertIs(result["existingResourcesChanged"], False)
            self.assertIs(result["runtimePermissionsExercised"], False)
            self.assertIs(result["migrationCompleted"], False)
            self.assertIs(result["productionBindingsChanged"], False)
            self.assertEqual(result["encryptedCredentialsSha256"], encrypted_hash)
            self.assertTrue((issue_dir / "finance-runtime.encrypted").exists())
            self.assertTrue((issue_dir / "transfer-preflight.encrypted").exists())
            self.assertFalse((issue_dir / "credential-transfer.private.json").exists())
            self.assertEqual(os.stat(issue_dir / "finance-runtime.encrypted").st_mode & 0o777, 0o600)
            decrypted = subprocess.run(
                ["openssl", "pkeyutl", "-decrypt", "-inkey", str(self.private_key),
                 "-pkeyopt", "rsa_padding_mode:oaep", "-pkeyopt", "rsa_oaep_md:sha256",
                 "-pkeyopt", "rsa_mgf1_md:sha256",
                 "-in", str(issue_dir / "finance-runtime.encrypted")],
                check=True, capture_output=True)
            envelope = json.loads(decrypted.stdout)
            self.assertEqual(envelope["BILLING_PROOF_S3_BUCKET"], prepare.PRIMARY_BUCKET)
            self.assertEqual(envelope["BILLING_PROOF_S3_REGION"], prepare.REGION)
            self.assertEqual(envelope["BILLING_PROOF_AWS_ACCESS_KEY_ID"], "AKIA" + "B" * 16)
            self.assertEqual(set(envelope), set(prepare.CREDENTIAL_VALUES) | {
                "BILLING_PROOF_AWS_ACCESS_KEY_ID", "BILLING_PROOF_AWS_SECRET_ACCESS_KEY"})
            self.assertEqual(operations(calls).count("iam create-access-key"), 1)


if __name__ == "__main__":
    unittest.main()
