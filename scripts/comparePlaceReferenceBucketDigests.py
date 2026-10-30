#!/usr/bin/env python3
"""Compare five MySQL table-format Place digest results with the committed baseline."""

import argparse
import csv
import hashlib
import sys
from pathlib import Path


TABLES = (
    "place",
    "place_name",
    "place_relationship",
    "place_evidence",
    "place_external_mapping",
)
HEADERS = (
    "bucket",
    "row_count",
    "digest_sha256",
    "digest_input_bytes",
    "group_concat_limit_bytes",
    "max_allowed_packet_bytes",
    "digest_time_zone",
    "digest_complete",
)
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()


def read_expected(path: Path) -> dict[str, dict[str, tuple[int, str]]]:
    with path.open(encoding="utf-8", newline="") as source:
        records = csv.DictReader(line for line in source if not line.startswith("#"))
        expected = {table: {} for table in TABLES}
        for record in records:
            bucket = record["bucket"]
            for table in TABLES:
                count = int(record[f"{table}_count"])
                digest = record[f"{table}_sha256"].strip().lower() or EMPTY_SHA256
                expected[table][bucket] = (count, digest)
    return expected


def read_mysql_results(text: str) -> list[dict[str, dict[str, str]]]:
    results: list[dict[str, dict[str, str]]] = []
    current: dict[str, dict[str, str]] | None = None
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if tuple(cells) == HEADERS:
            if current is not None:
                results.append(current)
            current = {}
            continue
        if current is None or len(cells) != len(HEADERS):
            continue
        bucket, count, digest, _bytes, group_concat_limit, max_packet, time_zone, complete = cells
        if bucket in current:
            raise ValueError(f"duplicate bucket in MySQL result: {bucket}")
        current[bucket] = {
            "row_count": count,
            "digest_sha256": digest.lower(),
            "group_concat_limit_bytes": group_concat_limit,
            "max_allowed_packet_bytes": max_packet,
            "digest_time_zone": time_zone,
            "digest_complete": complete,
        }
    if current is not None:
        results.append(current)
    if len(results) != len(TABLES):
        raise ValueError(f"expected five result tables in SQL order; found {len(results)}")
    return results


def compare(expected_path: Path, actual_text: str) -> list[list[str]]:
    expected = read_expected(expected_path)
    actual = read_mysql_results(actual_text)
    output: list[list[str]] = []
    utc_values = {"+00:00", "00:00", "UTC", "ETC/UTC", "Z"}
    for table, observed in zip(TABLES, actual, strict=True):
        for bucket, row in observed.items():
            complete = row["digest_complete"].strip().lower()
            if complete not in {"1", "true"}:
                raise ValueError(
                    f"{table} bucket {bucket}: digest_complete={complete or 'missing'}; refusing truncated digest"
                )
            for setting in ("group_concat_limit_bytes", "max_allowed_packet_bytes"):
                try:
                    setting_value = int(row[setting])
                except ValueError as error:
                    raise ValueError(f"{table} bucket {bucket}: invalid {setting}") from error
                if setting_value < 16777216:
                    raise ValueError(
                        f"{table} bucket {bucket}: {setting}={setting_value}; refusing digest below 16777216"
                    )
            time_zone = row["digest_time_zone"].strip()
            if time_zone.upper() not in utc_values:
                raise ValueError(
                    f"{table} bucket {bucket}: non-UTC digest_time_zone={time_zone or 'missing'}; refusing comparison"
                )
        buckets = set(expected[table]) | set(observed)
        for bucket in sorted(buckets):
            expected_count, expected_digest = expected[table].get(
                bucket, (0, EMPTY_SHA256)
            )
            row = observed.get(bucket)
            actual_count = int(row["row_count"]) if row else 0
            actual_digest = row["digest_sha256"] if row else EMPTY_SHA256
            digest_match = "match" if actual_digest == expected_digest else "mismatch"
            if expected_count != actual_count or digest_match == "mismatch":
                output.append(
                    [
                        table,
                        bucket,
                        str(expected_count),
                        str(actual_count),
                        digest_match,
                        "",
                    ]
                )
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "mysql_output",
        nargs="?",
        type=Path,
        default=Path("-"),
        help="file with the five pasted MySQL result tables, or - for stdin",
    )
    parser.add_argument(
        "--expected",
        type=Path,
        default=Path("docs/operations/place-reference-bucket-digests-v0.1-non-osm.csv"),
    )
    args = parser.parse_args()
    try:
        actual_text = (
            sys.stdin.read()
            if str(args.mysql_output) == "-"
            else args.mysql_output.read_text(encoding="utf-8")
        )
        rows = compare(args.expected, actual_text)
    except (OSError, ValueError, KeyError) as error:
        print(f"invalid digest input: {error}", file=sys.stderr)
        return 2
    if rows:
        writer = csv.writer(sys.stdout, lineterminator="\n")
        writer.writerow(
            ["table", "bucket", "expected_rows", "actual_rows", "digest", "flags"]
        )
        writer.writerows(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
