"""Regression coverage for existing-budget verification; no AWS access."""
import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "monitor", Path(__file__).resolve().parents[1] / "aws-storage-cost-monitor.py")
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class CostReadbacks(unittest.TestCase):
    def setUp(self):
        self.notices = [copy.deepcopy(n["Notification"]) for n in monitor.notifications()]
        self.recipient = monitor.RECIPIENT
        self.calls = []

    def aws_read_only(self, *args):
        self.calls.append(args)
        operation = args[:2]
        if operation == ("sts", "get-caller-identity"):
            return {"Account": monitor.ACCOUNT, "Arn": "arn:aws:iam::914683204061:user/operator"}
        if operation == ("budgets", "describe-budget"):
            return {"Budget": monitor.definition()}
        if operation == ("budgets", "describe-notifications-for-budget"):
            return {"Notifications": self.notices}
        if operation == ("budgets", "describe-subscribers-for-notification"):
            lookup = json.loads(args[args.index("--notification") + 1])
            self.assertNotIn("NotificationState", lookup)
            matching = next(n for n in self.notices if n["NotificationType"] == lookup["NotificationType"]
                            and n["Threshold"] == lookup["Threshold"])
            self.assertEqual("ThresholdType" in lookup, "ThresholdType" in matching)
            return {"Subscribers": [{"SubscriptionType": "EMAIL", "Address": self.recipient}]}
        self.fail(f"Unexpected operation in read-only verification: {operation}")

    def verify(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(monitor, "aws", self.aws_read_only), \
                contextlib.redirect_stdout(io.StringIO()):
            monitor.verify_alerts(Path(directory))
            result = json.loads((Path(directory) / "alert-result.json").read_text())
            self.assertEqual(result["configurationReadback"], "PASS")
            self.assertFalse(result["alertDeliveryVerified"])

    def test_omitted_threshold_type_verifies_all_three_subscribers(self):
        for notice in self.notices:
            notice.pop("ThresholdType")
            notice["NotificationState"] = "OK"
        self.verify()
        self.assertEqual(sum(c[:2] == ("budgets", "describe-subscribers-for-notification")
                             for c in self.calls), 3)

    def test_explicit_percentage_is_preserved_in_subscriber_lookup(self):
        self.verify()

    def test_wrong_explicit_type_threshold_or_duplicate_fails_before_subscriber_reads(self):
        for mutation in ["absolute", "null", "threshold", "duplicate"]:
            with self.subTest(mutation=mutation):
                self.setUp()
                if mutation == "absolute":
                    self.notices[0]["ThresholdType"] = "ABSOLUTE_VALUE"
                elif mutation == "null":
                    self.notices[0]["ThresholdType"] = None
                elif mutation == "threshold":
                    self.notices[0]["Threshold"] = 50
                else:
                    self.notices.append(copy.deepcopy(self.notices[0]))
                with self.assertRaisesRegex(RuntimeError, "Notification readback differs"):
                    self.verify()
                self.assertFalse(any(c[:2] == ("budgets", "describe-subscribers-for-notification")
                                     for c in self.calls))

    def test_wrong_recipient_does_not_record_pass(self):
        self.recipient = "wrong@example.invalid"
        with self.assertRaisesRegex(RuntimeError, "Subscriber readback differs"):
            self.verify()

    def test_verify_cli_never_calls_create_or_cloudwatch(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(monitor, "aws", self.aws_read_only), \
                patch.object(monitor.Path, "home", return_value=Path(directory)), \
                patch("sys.argv", ["monitor", "--verify-alerts"]), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            monitor.main()
            self.assertIn("no budget creation attempted", output.getvalue())
        self.assertEqual(len(self.calls), 6)


if __name__ == "__main__":
    unittest.main()
