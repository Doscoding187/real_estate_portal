from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator


USER_AGENT = "PropertyListify-Gauteng-Catalogue/0.1 (+zero-cost-research-pipeline)"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def stable_digest(value: Any, length: int = 16) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()[:length]


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                return digest.hexdigest()
            digest.update(chunk)


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def atomic_write_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", delete=False) as handle:
            temporary_name = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
        temporary_name = None
    finally:
        if temporary_name:
            try:
                os.unlink(temporary_name)
            except FileNotFoundError:
                pass


def atomic_write_text(path: Path, content: str) -> None:
    atomic_write_bytes(path, content.encode("utf-8"))


def write_json(path: Path, value: Any) -> None:
    atomic_write_text(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]], sort_key: str | None = None) -> int:
    materialized = list(rows)
    if sort_key:
        materialized.sort(key=lambda row: str(row.get(sort_key, "")))
    content = "".join(
        json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
        for row in materialized
    )
    atomic_write_text(path, content)
    return len(materialized)


def read_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected object at {path}:{line_number}")
            yield value


def write_csv(path: Path, rows: Iterable[dict[str, Any]], fieldnames: list[str]) -> int:
    materialized = list(rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=path.parent,
            prefix=f".{path.name}.",
            mode="w",
            encoding="utf-8",
            newline="",
            delete=False,
        ) as handle:
            temporary_name = handle.name
            writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for row in materialized:
                normalized = {
                    key: value
                    if isinstance(value, (str, int, float)) or value is None
                    else json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                    for key, value in row.items()
                }
                writer.writerow(normalized)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
        temporary_name = None
    finally:
        if temporary_name:
            try:
                os.unlink(temporary_name)
            except FileNotFoundError:
                pass
    return len(materialized)


def normalize_lookup(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(character for character in text if not unicodedata.combining(character))
    text = text.casefold().replace("&", " and ")
    text = text.replace("’", "'").replace("`", "'")
    text = re.sub(r"['\"]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result else None


def as_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def haversine_km(lat_a: float | None, lon_a: float | None, lat_b: float | None, lon_b: float | None) -> float | None:
    if None in (lat_a, lon_a, lat_b, lon_b):
        return None
    from math import asin, cos, radians, sin, sqrt

    latitude_a, longitude_a, latitude_b, longitude_b = map(
        radians, (float(lat_a), float(lon_a), float(lat_b), float(lon_b))
    )
    delta_latitude = latitude_b - latitude_a
    delta_longitude = longitude_b - longitude_a
    value = sin(delta_latitude / 2) ** 2 + cos(latitude_a) * cos(latitude_b) * sin(delta_longitude / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(min(1.0, value)))


def source_record_id(source: str, native_id: str) -> str:
    return f"sr:{source}:{native_id}"


def assertion_id(source_record: str, assertion_type: str, value: Any) -> str:
    return f"asrt:{stable_digest([source_record, assertion_type, value], 20)}"


def candidate_id(canonical_key: str) -> str:
    return f"pl-gp-v01-{hashlib.sha256(canonical_key.encode('utf-8')).hexdigest()[:20]}"


def http_request(
    url: str,
    *,
    method: str = "GET",
    data: bytes | None = None,
    accept: str | None = None,
    timeout: int = 90,
) -> tuple[bytes, str, dict[str, str]]:
    headers = {"User-Agent": USER_AGENT}
    if accept:
        headers["Accept"] = accept
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read()
        return body, response.geturl(), {key.lower(): value for key, value in response.headers.items()}


def inspect_url(url: str, timeout: int = 60) -> tuple[str, dict[str, str]]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.geturl(), {key.lower(): value for key, value in response.headers.items()}
    except (urllib.error.HTTPError, urllib.error.URLError):
        body, final_url, headers = http_request(url, timeout=timeout)
        del body
        return final_url, headers


def download_artifact(
    url: str,
    destination: Path,
    *,
    existing_record: dict[str, Any] | None = None,
    expected_sha256: str | None = None,
    timeout: int = 180,
) -> dict[str, Any]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        actual_sha = sha256_file(destination)
        recorded_sha = expected_sha256 or (existing_record or {}).get("sha256")
        if recorded_sha and actual_sha == recorded_sha:
            final_url = (existing_record or {}).get("resolved_url") or url
            return {
                "path": destination,
                "downloaded": False,
                "resolved_url": final_url,
                "headers": (existing_record or {}).get("response_headers", {}),
                "sha256": actual_sha,
                "size_bytes": destination.stat().st_size,
            }
        if not recorded_sha:
            # A process may have completed the raw file before its manifest
            # was flushed. Confirm the current upstream size before reusing
            # that file; the next manifest write will record its checksum.
            try:
                final_url, headers = inspect_url(url, timeout=min(timeout, 90))
                expected_size = as_int(headers.get("content-length"))
                if expected_size is None or expected_size == destination.stat().st_size:
                    return {
                        "path": destination,
                        "downloaded": False,
                        "resolved_url": final_url,
                        "headers": headers,
                        "sha256": actual_sha,
                        "size_bytes": destination.stat().st_size,
                    }
            except (OSError, urllib.error.URLError, urllib.error.HTTPError):
                pass

    part_path = destination.with_name(destination.name + ".part")
    final_url, headers = inspect_url(url, timeout=min(timeout, 90))
    expected_size = as_int(headers.get("content-length"))
    start_at = part_path.stat().st_size if part_path.exists() else 0
    if part_path.exists() and expected_size and start_at == expected_size:
        # A previous transfer may have completed before the process was
        # interrupted. Promote the complete part without downloading it again.
        os.replace(part_path, destination)
        actual_sha = sha256_file(destination)
        if expected_sha256 and actual_sha != expected_sha256:
            raise ValueError(f"SHA-256 mismatch for {destination}: expected {expected_sha256}, got {actual_sha}")
        return {
            "path": destination,
            "downloaded": True,
            "resolved_url": final_url,
            "headers": headers,
            "sha256": actual_sha,
            "size_bytes": destination.stat().st_size,
        }
    request_headers = {"User-Agent": USER_AGENT}
    if start_at and expected_size and start_at < expected_size:
        request_headers["Range"] = f"bytes={start_at}-"
    elif start_at and expected_size and start_at >= expected_size:
        start_at = 0

    request = urllib.request.Request(final_url, headers=request_headers, method="GET")
    try:
        response = urllib.request.urlopen(request, timeout=timeout)
    except urllib.error.HTTPError as exc:
        if start_at and exc.code in (416, 501):
            start_at = 0
            request = urllib.request.Request(final_url, headers={"User-Agent": USER_AGENT}, method="GET")
            response = urllib.request.urlopen(request, timeout=timeout)
        else:
            raise

    mode = "ab" if start_at and response.headers.get("content-range") else "wb"
    with response, part_path.open(mode) as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output.write(chunk)
        output.flush()
        os.fsync(output.fileno())
    os.replace(part_path, destination)

    actual_sha = sha256_file(destination)
    if expected_sha256 and actual_sha != expected_sha256:
        raise ValueError(f"SHA-256 mismatch for {destination}: expected {expected_sha256}, got {actual_sha}")
    return {
        "path": destination,
        "downloaded": True,
        "resolved_url": final_url,
        "headers": {key.lower(): value for key, value in response.headers.items()},
        "sha256": actual_sha,
        "size_bytes": destination.stat().st_size,
    }


def request_json(url: str, timeout: int = 90) -> tuple[Any, str, dict[str, str]]:
    body, final_url, headers = http_request(url, accept="application/json", timeout=timeout)
    return json.loads(body.decode("utf-8-sig")), final_url, headers


def request_text(url: str, timeout: int = 90) -> tuple[str, str, dict[str, str]]:
    body, final_url, headers = http_request(url, accept="text/plain,text/html,*/*", timeout=timeout)
    encoding = "utf-8"
    content_type = headers.get("content-type", "")
    match = re.search(r"charset=([\w-]+)", content_type, re.I)
    if match:
        encoding = match.group(1)
    return body.decode(encoding, errors="replace"), final_url, headers


def parse_urlencoded_query(url: str, query: str) -> tuple[bytes, str, dict[str, str]]:
    payload = urllib.parse.urlencode({"query": query, "format": "json"}).encode("utf-8")
    return http_request(
        url,
        method="POST",
        data=payload,
        accept="application/sparql-results+json,application/json",
        timeout=180,
    )
