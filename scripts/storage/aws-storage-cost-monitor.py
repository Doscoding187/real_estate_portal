#!/usr/bin/env python3
"""Operator cost warning and default CloudFront metrics; no spending enforcement."""
import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess
import tempfile

ACCOUNT = "914683204061"
DISTRIBUTION = "E3JNW2EP3Z3JSP"
BUDGET = "PropertyListify-MVP1-S3-warning-20261001"
RECIPIENT = "finances@propertylistifysa.co.za"


def aws(*args):
    result = subprocess.run(["aws", *args, "--output", "json", "--no-cli-pager",
                             "--cli-connect-timeout", "10", "--cli-read-timeout", "30"],
                            capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise RuntimeError(f"AWS operation failed: {args[0]} {args[1]}; no subsequent step executed.")
    return json.loads(result.stdout) if result.stdout.strip() else {}


def save(directory, name, value):
    p = directory / name
    with open(p, "x") as handle:
        os.chmod(p, 0o600)
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")
    return p


def definition():
    return {"BudgetName": BUDGET, "BudgetType": "COST", "TimeUnit": "MONTHLY",
            "BudgetLimit": {"Amount": "1.00", "Unit": "USD"},
            "CostFilters": {"Service": ["Amazon Simple Storage Service"]},
            "CostTypes": {"IncludeCredit": False, "IncludeRefund": False,
                          "IncludeDiscount": False, "IncludeTax": True}}


def notifications():
    return [{"Notification": {"NotificationType": kind, "ComparisonOperator": "GREATER_THAN",
                               "Threshold": threshold, "ThresholdType": "PERCENTAGE"},
             "Subscribers": [{"SubscriptionType": "EMAIL", "Address": RECIPIENT}]}
            for kind, threshold in [("ACTUAL", 80), ("ACTUAL", 100), ("FORECASTED", 100)]]


def metric_total(value):
    points = value.get("Datapoints", [])
    return sum(float(p.get("Sum", 0)) for p in points), len(points)


def verify_alerts(directory):
    proposed = definition()
    readback = aws("budgets", "describe-budget", "--region", "us-east-1",
                   "--account-id", ACCOUNT, "--budget-name", BUDGET)
    save(directory, "budget-readback.json", readback)
    current = readback["Budget"]
    if (current.get("BudgetName") != BUDGET
        or current.get("BudgetType") != "COST" or current.get("TimeUnit") != "MONTHLY"
        or current.get("CostFilters") != proposed["CostFilters"]
        or float(current["BudgetLimit"]["Amount"]) != 1
        or current["BudgetLimit"]["Unit"] != "USD"
        or any(current.get("CostTypes", {}).get(key) is not value for key, value in
               proposed["CostTypes"].items())):
        raise RuntimeError("Budget readback differs; preserve evidence and do not rerun creation.")
    actual = aws("budgets", "describe-notifications-for-budget", "--region", "us-east-1",
                 "--account-id", ACCOUNT, "--budget-name", BUDGET)
    save(directory, "notifications-readback.json", actual)
    notices = actual.get("Notifications", [])
    # ThresholdType is optional. The existing percentage notifications can be
    # returned without it; explicit null/absolute types must still fail closed.
    if len(notices) != 3 or {(n["NotificationType"], float(n["Threshold"]),
                             n.get("ThresholdType", "PERCENTAGE"), n["ComparisonOperator"])
        for n in notices} != {(n["Notification"]["NotificationType"], n["Notification"]["Threshold"],
                              "PERCENTAGE", "GREATER_THAN") for n in notifications()}:
        raise RuntimeError("Notification readback differs; preserve evidence and do not rerun creation.")
    for index, item in enumerate(notices):
        # Preserve the API's omission when identifying the notification for its
        # subscriber readback. Never send NotificationState or invent a field.
        lookup = {k: item[k] for k in ["NotificationType", "ComparisonOperator", "Threshold"]}
        if "ThresholdType" in item:
            lookup["ThresholdType"] = item["ThresholdType"]
        subscribers = aws("budgets", "describe-subscribers-for-notification", "--region", "us-east-1",
                          "--account-id", ACCOUNT, "--budget-name", BUDGET,
                          "--notification", json.dumps(lookup))
        save(directory, f"subscribers-{index}.json", subscribers)
        if subscribers.get("Subscribers") != [{"SubscriptionType": "EMAIL", "Address": RECIPIENT}]:
            raise RuntimeError("Subscriber readback differs; preserve evidence and do not rerun creation.")
    save(directory, "alert-result.json", {"configurationReadback": "PASS", "recipient": RECIPIENT,
         "warningThresholdUsdMonthly": 1, "scope": "All S3 gross costs in this AWS account, including existing media",
         "aggregateIncrementalBudgetUsdMonthlyUnchanged": 15, "alertDeliveryVerified": False})
    print("PASS: S3 monthly cost warning verified at USD 1, with actual 80%/100% and forecast 100% email notifications.")
    print("Recipient:", RECIPIENT)
    print("The USD 1 warning includes existing S3 usage; it is not extra spending approval or a hard cap.")
    print("Aggregate USD 15 approval unchanged. Railway/Azure and mailbox receipt must still be monitored separately.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply-alerts", action="store_true", help="Create the new warning once; never rerun after creation")
    mode.add_argument("--verify-alerts", action="store_true", help="Read back the existing warning and recipients without mutations")
    args = parser.parse_args()
    os.umask(0o077)
    identity = aws("sts", "get-caller-identity")
    if identity.get("Account") != ACCOUNT:
        raise RuntimeError("Unexpected AWS account; no monitoring configuration changed.")
    if ":user/vercel-s3-uploader" in identity.get("Arn", "") or ":user/listify-paid-proof-runtime-" in identity.get("Arn", ""):
        raise RuntimeError("Use operator access; never give runtime identities billing or monitoring rights.")
    directory = Path(tempfile.mkdtemp(prefix="property-listify-storage-cost-", dir=Path.home()))
    print("Private monitoring evidence:", directory, flush=True)
    if args.verify_alerts:
        verify_alerts(directory)
        print("READ ONLY: existing budget unchanged; no budget creation attempted.")
        return
    now = datetime.datetime.now(datetime.timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    dimensions = json.dumps([{"Name": "DistributionId", "Value": DISTRIBUTION},
                             {"Name": "Region", "Value": "Global"}])
    totals = {}
    for metric in ["Requests", "BytesDownloaded"]:
        data = aws("cloudwatch", "get-metric-statistics", "--region", "us-east-1",
                   "--namespace", "AWS/CloudFront", "--metric-name", metric,
                   "--dimensions", dimensions, "--start-time", start.isoformat(),
                   "--end-time", now.isoformat(), "--period", "86400", "--statistics", "Sum")
        save(directory, metric + ".json", data)
        total, count = metric_total(data)
        totals[metric] = {"sum": total, "datapointCount": count}
    summary = {"monthStartUtc": start.isoformat(), "observedUntilUtc": now.isoformat(),
               "distribution": DISTRIBUTION, "requestsObserved": totals["Requests"]["sum"],
               "bytesDownloadedObserved": totals["BytesDownloaded"]["sum"],
               "requestsAllowance": 1000000, "transferAllowanceDecimalBytes": 100000000000,
               "metricsComplete": all(v["datapointCount"] > 0 for v in totals.values()),
               "metricsMayLag": True, "billingAndPlanDashboardRemainAuthoritative": True,
               "budgetNotASpendingCap": True, "aggregateIncrementalBudgetUsd": 15,
               "alertDeliveryVerified": False}
    save(directory, "cloudfront-allowance-observation.json", summary)
    print("CloudFront observed month-to-date requests:", int(summary["requestsObserved"]), "/ 1,000,000")
    print("CloudFront observed month-to-date download GB:", round(summary["bytesDownloadedObserved"] / 1e9, 4), "/ 100")
    if not summary["metricsComplete"]:
        print("Metric data is missing or delayed; do not interpret absent points as verified zero usage.")
    if not args.apply_alerts:
        print("READ ONLY: no alerts, paid metrics, alarms or provider settings changed.")
        return
    # Create only a new task-owned warning. Never update/delete an existing budget.
    # No budget actions or paid emailed budget reports are configured.
    proposed = definition()
    notice = notifications()
    proposed_path = save(directory, "budget-proposed.json", proposed)
    notices_path = save(directory, "notifications-proposed.json", notice)
    aws("budgets", "create-budget", "--region", "us-east-1", "--account-id", ACCOUNT,
        "--budget", "file://" + str(proposed_path),
        "--notifications-with-subscribers", "file://" + str(notices_path))
    verify_alerts(directory)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error))
