"""Offline integrity contracts against the real frozen acquisition bundle."""
import contextlib
import gzip
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import snapshot


BUNDLE = Path(__file__).resolve().parents[2] / "data/za-wc-source-acquisition-v0.1/snapshot-20261001"


class SnapshotIntegrity(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix="listify-evidence-contract-")
        self.bundle = Path(self.scratch.name) / "bundle"
        shutil.copytree(BUNDLE, self.bundle)
        self.addCleanup(self.scratch.cleanup)

    def verify(self):
        with contextlib.redirect_stdout(io.StringIO()):
            snapshot.verify(self.bundle)

    def repin_index(self, transform, adjust_count=False):
        path = self.bundle / "source-records.jsonl.gz"
        records = [json.loads(line) for line in gzip.decompress(path.read_bytes()).decode().splitlines()]
        transform(records)
        data = gzip.compress(snapshot.jsonl(records), mtime=0)
        path.write_bytes(data)
        manifest_path = self.bundle / "manifest.json"
        manifest = json.loads(manifest_path.read_bytes())
        for entry in manifest["outputs"]:
            if entry["path"] == path.name:
                entry.update(sha256=snapshot.digest(data), size_bytes=len(data))
        if adjust_count:
            manifest["counts"]["all_source_records"] = len(records)
        data = snapshot.encode(manifest)
        manifest_path.write_bytes(data)
        (self.bundle / "manifest.sha256").write_text(snapshot.digest(data) + "\n")

    def test_original_bundle_and_independent_source_accounting(self):
        self.verify()

    def test_tampered_original_source_fails(self):
        with (self.bundle / "raw/geonames/ZA.zip").open("ab") as source:
            source.write(b"tampered")
        with self.assertRaisesRegex(ValueError, "checksum/size mismatch"):
            self.verify()

    def test_undeclared_file_fails(self):
        (self.bundle / "unexpected.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "undeclared or missing"):
            self.verify()

    def test_false_source_observation_fails_even_after_repinning(self):
        def change(records):
            row = next(record for record in records if record["source"] == "geonames")
            row["source_native_row"] = "fabricated"
        self.repin_index(change)
        with self.assertRaisesRegex(ValueError, "disagrees with downloaded row"):
            self.verify()

    def test_canonical_admission_in_acquisition_bundle_fails(self):
        self.repin_index(lambda records: records[0].update(place_id="forbidden-admission"))
        with self.assertRaisesRegex(ValueError, "must not assert canonical admission"):
            self.verify()

    def test_missing_observation_fails_even_after_repinning_and_recounting(self):
        self.repin_index(lambda records: records.pop(), adjust_count=True)
        with self.assertRaisesRegex(ValueError, "complete declared source universe"):
            self.verify()

    def test_existing_bundle_cannot_be_overwritten(self):
        with self.assertRaises(FileExistsError):
            snapshot.acquire(BUNDLE / "acquisition-plan.json", self.bundle)


if __name__ == "__main__":
    unittest.main()
