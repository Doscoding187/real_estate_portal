"""Final media operator safety boundaries; no provider calls or customer data."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("media", ROOT / "aws-media-hardening.py")
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


class MediaHardening(unittest.TestCase):
    def baseline(self):
        original = json.loads((ROOT / "tests/fixtures/media-policy-before.insecure.json").read_text())
        original["Statement"] = [s for s in original["Statement"] if s["Action"] != "s3:PutObject"]
        return {"get-bucket-policy": original,
                "get-public-access-block": {"PublicAccessBlockConfiguration": {k: False for k in media.desired()[1]}},
                "get-bucket-cors": {"CORSRules": [{"AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": ["http://localhost:3000", "http://localhost:3009", "http://localhost:5173",
                        "https://real-estate-portal-xi.vercel.app", "https://*.vercel.app", *media.ORIGINS],
                    "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"],
                    "MaxAgeSeconds": 3000}]},
                "get-bucket-versioning": {},
                "get-bucket-ownership-controls": {"OwnershipControls": {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}},
                "get-bucket-encryption": {"ServerSideEncryptionConfiguration": {"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}}}

    def test_desired_configs_are_exact_reviewed_files(self):
        for value, name in zip(media.desired(), ["media-bucket-policy.json", "block-public-access.json", "media-cors.json", "media-runtime-policy.json"]):
            self.assertEqual(value, json.loads((ROOT / name).read_text()))

    def test_changed_baseline_stops_before_writes(self):
        before = self.baseline()
        media.validate_baseline(before)
        for name in ["policy", "cors", "block", "versioning", "ownership"]:
            with self.subTest(name=name):
                changed = copy.deepcopy(before)
                if name == "policy": changed["get-bucket-policy"]["Statement"].append({"Sid": "OtherChange"})
                elif name == "cors": changed["get-bucket-cors"]["CORSRules"][0]["AllowedOrigins"].append("https://other.invalid")
                elif name == "block": changed["get-public-access-block"]["PublicAccessBlockConfiguration"]["BlockPublicAcls"] = True
                elif name == "versioning": changed["get-bucket-versioning"] = {"Status": "Enabled"}
                else: changed["get-bucket-ownership-controls"] = {"OwnershipControls": {"Rules": [{"ObjectOwnership": "ObjectWriter"}]}}
                with tempfile.TemporaryDirectory() as directory, patch.object(media, "aws") as aws:
                    with self.assertRaisesRegex(RuntimeError, "baseline differs"):
                        media.harden(Path(directory), changed)
                    aws.assert_not_called()

    def test_concurrent_change_after_backup_stops_before_writes(self):
        changed = self.baseline()
        changed["get-bucket-cors"]["CORSRules"][0]["MaxAgeSeconds"] = 100
        with tempfile.TemporaryDirectory() as directory, patch.object(media, "configuration", return_value=changed), patch.object(media, "aws") as aws:
            with self.assertRaisesRegex(RuntimeError, "changed since backup"):
                media.harden(Path(directory), self.baseline())
            aws.assert_not_called()

    def test_wrong_readback_never_restores_public_read(self):
        before = self.baseline()
        after = copy.deepcopy(before)
        after["get-bucket-policy"] = media.desired()[0]
        after["get-public-access-block"]["PublicAccessBlockConfiguration"] = media.desired()[1]
        after["get-bucket-cors"] = media.desired()[2]
        after["get-bucket-encryption"] = {}
        with tempfile.TemporaryDirectory() as directory, patch.object(media, "configuration", side_effect=[before, after]), patch.object(media, "aws") as aws:
            with self.assertRaisesRegex(RuntimeError, "Hardening readback differs"):
                media.harden(Path(directory), before)
            self.assertEqual([c.args[1] for c in aws.call_args_list], ["put-bucket-policy", "put-public-access-block", "put-bucket-cors"])

    def test_negative_permissions_require_actual_access_denied_and_clean_runtime_env(self):
        for error, passes in [("AccessDenied", True), ("NoSuchKey", False), ("ExpiredToken", False)]:
            with self.subTest(error=error), patch.dict(media.os.environ, {"AWS_SESSION_TOKEN": "operator-token", "AWS_PROFILE": "operator"}), \
                    patch.object(media.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", f"An error occurred ({error})")) as run:
                call = lambda: media.aws("s3api", "get-bucket-cors", "--bucket", media.BUCKET,
                    credentials={"AccessKeyId": "fake-key", "SecretAccessKey": "fake-secret"}, denied=True)
                if passes: self.assertEqual(call()["outcome"], "AccessDenied")
                else:
                    with self.assertRaisesRegex(RuntimeError, "actual AccessDenied"): call()
                self.assertNotIn("AWS_SESSION_TOKEN", run.call_args.kwargs["env"])
                self.assertNotIn("AWS_PROFILE", run.call_args.kwargs["env"])
                self.assertNotIn("fake-secret", run.call_args.args[0])

    def test_export_uses_stdin_and_returns_only_ciphertext(self):
        envelope = {"AWS_SECRET_ACCESS_KEY": "fake-secret"}
        with patch.object(media.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, b"x" * 512, b"")) as run:
            self.assertEqual(media.transfer(Path("public.pem"), envelope), b"x" * 512)
            self.assertEqual(json.loads(run.call_args.kwargs["input"]), envelope)
            self.assertNotIn("fake-secret", run.call_args.args[0])

    def test_runtime_readiness_retries_only_explicit_rejection_and_is_bounded(self):
        denied = media.AwsFailure("s3api", "put-object", "AccessDenied")
        with patch.object(media, "aws", side_effect=[denied, {"ETag": "task-object"}]) as aws, \
                patch.object(media.time, "sleep") as sleep:
            self.assertEqual(media.runtime_ready("s3api", "put-object", credentials={"fake": True}), {"ETag": "task-object"})
            self.assertEqual(aws.call_count, 2)
            sleep.assert_called_once_with(5)
        with patch.object(media, "aws", side_effect=denied) as aws, \
                patch.object(media.time, "monotonic", side_effect=[0, 46]), patch.object(media.time, "sleep") as sleep:
            with self.assertRaises(media.AwsFailure):
                media.runtime_ready("s3api", "put-object", credentials={"fake": True})
            self.assertEqual(aws.call_count, 1)
            sleep.assert_not_called()

    def test_runtime_readiness_never_retries_ambiguous_conflicts_or_creation(self):
        for code in ["PreconditionFailed", "ConditionalRequestConflict", "UnclassifiedFailure"]:
            with self.subTest(code=code), patch.object(media, "aws", side_effect=media.AwsFailure("s3api", "put-object", code)) as aws:
                with self.assertRaises(media.AwsFailure):
                    media.runtime_ready("s3api", "put-object", credentials={"fake": True})
                self.assertEqual(aws.call_count, 1)
        with patch.object(media, "aws") as aws:
            with self.assertRaisesRegex(RuntimeError, "limited"):
                media.runtime_ready("iam", "create-access-key", credentials={"fake": True})
            aws.assert_not_called()

    def test_extra_runtime_grants_stop_before_key_creation(self):
        calls = []
        def fake(*args, **kwargs):
            calls.append(args)
            user = args[args.index("--user-name") + 1]
            if args[1] == "get-user-policy": return {"PolicyDocument": media.desired()[3]}
            if args[1] == "get-user": return {"User": {"Arn": f"arn:aws:iam::{media.ACCOUNT}:user/{user}"}}
            if args[1] == "list-attached-user-policies": return {"AttachedPolicies": [{"PolicyArn": "broad"}]}
            return {}
        with tempfile.TemporaryDirectory() as directory, patch.object(media, "aws", fake):
            with self.assertRaisesRegex(RuntimeError, "unexpected grants"):
                media.provision_runtime(Path(directory), Path("public.pem"), Path("harmless.txt"))
        self.assertNotIn("create-access-key", [c[1] for c in calls])

    def test_failed_export_disables_only_its_new_key_without_plaintext_file(self):
        calls = []
        def fake(*args, **kwargs):
            calls.append(args)
            user = args[args.index("--user-name") + 1]
            if args[1] == "get-user-policy": return {"PolicyDocument": media.desired()[3]}
            if args[1] == "get-user": return {"User": {"Arn": f"arn:aws:iam::{media.ACCOUNT}:user/{user}"}}
            if args[1] == "list-attached-user-policies": return {"AttachedPolicies": []}
            if args[1] == "list-groups-for-user": return {"Groups": []}
            if args[1] == "list-user-policies": return {"PolicyNames": ["ListingMediaObjectsOnly"]}
            if args[1] == "create-access-key": return {"AccessKey": {"AccessKeyId": "fake-key", "SecretAccessKey": "fake-secret"}}
            return {}
        with tempfile.TemporaryDirectory() as directory, patch.object(media, "aws", fake), \
                patch.object(media, "transfer", side_effect=RuntimeError("Failed encrypted export")):
            with self.assertRaisesRegex(RuntimeError, "Failed encrypted export"):
                media.provision_runtime(Path(directory), Path("public.pem"), Path("harmless.txt"))
            self.assertTrue(all("fake-secret" not in p.read_text() for p in Path(directory).iterdir()))
        self.assertEqual(calls[-1][:2], ("iam", "update-access-key"))
        self.assertEqual(calls[-1][-4:], ("--access-key-id", "fake-key", "--status", "Inactive"))
        self.assertEqual(calls[-1][calls[-1].index("--user-name") + 1], calls[0][calls[0].index("--user-name") + 1])

    def test_prepared_only_mode_never_calls_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory) / "public.pem"
            key.write_bytes(b"test public key")
            with patch.object(media, "PUBLIC_KEY_HASH", media.hashlib.sha256(key.read_bytes()).hexdigest()), \
                    patch.object(media, "aws", return_value={"Account": media.ACCOUNT, "Arn": f"arn:aws:iam::{media.ACCOUNT}:user/operator"}) as aws, \
                    patch.object(media, "configuration", return_value=self.baseline()), \
                    patch.object(media, "transfer", return_value=b"x" * 512), \
                    patch("sys.argv", ["media", "--public-key", str(key)]), patch("builtins.print"):
                media.main()
                self.assertEqual([c.args[:2] for c in aws.call_args_list], [("sts", "get-caller-identity")])


if __name__ == "__main__":
    unittest.main()
