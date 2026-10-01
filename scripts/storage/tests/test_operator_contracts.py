"""Security contracts for operator preparation. No AWS calls or customer data."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), ROOT / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


containment = load("aws-media-remove-public-write")
origin = load("aws-media-origin-probe")
proof = load("aws-private-proof-provision")
monitor = load("aws-storage-cost-monitor")


class OperatorContracts(unittest.TestCase):
    def setUp(self):
        # Historical insecure policy is test input only; never apply it.
        self.before = json.loads((ROOT / "tests/fixtures/media-policy-before.insecure.json").read_text())
        self.after = containment.remove_unconditional_public_write(self.before)

    def test_containment_preserves_all_other_statements_and_original_input(self):
        original = copy.deepcopy(self.before)
        removed = [s for s in self.before["Statement"] if s not in self.after["Statement"]]
        self.assertEqual(len(removed), 1)
        self.assertEqual(removed[0]["Action"], "s3:PutObject")
        self.assertEqual(removed[0]["Resource"], "arn:aws:s3:::listify-properties-sa/videos/*")
        self.assertEqual(self.before, original)
        self.assertTrue(all(s in original["Statement"] for s in self.after["Statement"]))

    def test_ambiguous_or_changed_baselines_refuse_removal(self):
        grant = next(s for s in self.before["Statement"] if s["Action"] == "s3:PutObject")
        for mutation in ["missing", "duplicate", "conditional", "other-prefix"]:
            with self.subTest(mutation=mutation):
                p = copy.deepcopy(self.before)
                item = next(s for s in p["Statement"] if s["Action"] == "s3:PutObject")
                if mutation == "missing":
                    p["Statement"].remove(item)
                elif mutation == "duplicate":
                    p["Statement"].append(copy.deepcopy(grant))
                elif mutation == "conditional":
                    item["Condition"] = {"Bool": {"aws:SecureTransport": "true"}}
                else:
                    item["Resource"] = "arn:aws:s3:::listify-properties-sa/properties/*"
                with self.assertRaises(ValueError):
                    containment.remove_unconditional_public_write(p)

    def test_origin_probe_baseline_matches_actual_recorded_readback(self):
        self.assertEqual(origin.policy_hash(self.after), origin.EXPECTED_POLICY_HASH)

    def test_origin_probe_can_restrict_only_a_single_generated_object(self):
        key = "properties/storage-verification-" + "a" * 32 + ".txt"
        policy = origin.probe_policy(self.after, key)
        self.assertEqual(policy["Statement"][:-1], self.after["Statement"])
        restriction = policy["Statement"][-1]
        self.assertEqual(restriction["Resource"], "arn:aws:s3:::listify-properties-sa/" + key)
        self.assertEqual(restriction["Condition"], {"StringNotEquals": {"AWS:SourceArn": origin.SOURCE_ARN}})
        for unsafe in ["properties/*", "properties/storage-verification-*",
                       "properties/storage-verification-../../foo", "videos/test.txt"]:
            with self.subTest(key=unsafe), self.assertRaises(ValueError):
                origin.probe_policy(self.after, unsafe)

    def test_origin_probe_refuses_concurrent_policy_changes(self):
        changed = copy.deepcopy(self.after)
        changed["Statement"].append({"Sid": "OtherWorkstreamChange"})
        with self.assertRaises(ValueError):
            origin.probe_policy(changed, "properties/storage-verification-" + "a" * 32 + ".txt")

    def test_proof_runtime_has_only_object_put_get_in_private_prefix(self):
        p = proof.runtime_policy("task-owned-proof-bucket")
        self.assertEqual(p["Statement"], [{"Sid": "PrivateProofObjectsOnly", "Effect": "Allow",
            "Action": ["s3:PutObject", "s3:GetObject"],
            "Resource": "arn:aws:s3:::task-owned-proof-bucket/billing-proofs/*"}])

    def test_proof_bucket_denies_other_principals_including_broad_media_user(self):
        runtime = "arn:aws:iam::914683204061:user/task-proof-runtime"
        operator = "arn:aws:iam::914683204061:user/task-operator"
        p = proof.bucket_policy("task-proof-bucket", runtime, operator)
        deny = p["Statement"][1]
        self.assertEqual(deny["Effect"], "Deny")
        self.assertEqual(deny["Action"], "s3:*")
        allowed = deny["Condition"]["ArnNotEquals"]["aws:PrincipalArn"]
        self.assertEqual(set(allowed), {runtime, operator, "arn:aws:iam::914683204061:root"})
        self.assertNotIn("arn:aws:iam::914683204061:user/vercel-s3-uploader", allowed)
        self.assertEqual(deny["Resource"], ["arn:aws:s3:::task-proof-bucket", "arn:aws:s3:::task-proof-bucket/*"])

    def test_cost_warning_is_conservative_and_has_only_email_notifications(self):
        p = monitor.definition()
        self.assertEqual(p["BudgetLimit"], {"Amount": "1.00", "Unit": "USD"})
        self.assertEqual(p["CostFilters"], {"Service": ["Amazon Simple Storage Service"]})
        self.assertFalse(p["CostTypes"]["IncludeCredit"])
        self.assertFalse(p["CostTypes"]["IncludeDiscount"])
        notices = monitor.notifications()
        self.assertEqual(len(notices), 3)
        self.assertTrue(all(n["Subscribers"] == [{"SubscriptionType": "EMAIL", "Address": monitor.RECIPIENT}]
                            for n in notices))
        self.assertFalse(any("Action" in key for key in p))

    def test_missing_metric_points_are_distinct_from_observed_zero(self):
        self.assertEqual(monitor.metric_total({}), (0, 0))
        self.assertEqual(monitor.metric_total({"Datapoints": [{"Sum": 0}]}), (0, 1))
        self.assertEqual(monitor.metric_total({"Datapoints": [{"Sum": 3}, {"Sum": 7}]}), (10, 2))


if __name__ == "__main__":
    unittest.main()
