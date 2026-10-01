#!/usr/bin/env python3
"""Build a territory's v0.2 canonical source authority from acquired evidence.

Usage:
    python3 tools/gauteng-catalogue/run_source_authority.py --territory za-wc

The territory is configuration. No province is named here.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gauteng_catalogue.config import REPO_ROOT, territory_config
from gauteng_catalogue.territory_source_authority import build_source_authority


DEFAULT_BUNDLES = {
    "za-wc": "data/za-wc-source-acquisition-v0.1/snapshot-20261001",
}
DEFAULT_OUTPUTS = {
    "za-wc": "data/za-wc-source-authority-v0.2",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--territory", required=True, help="territory id, e.g. za-wc")
    parser.add_argument("--bundle", help="acquisition bundle directory")
    parser.add_argument("--output", help="source authority output directory")
    args = parser.parse_args()

    territory = territory_config(args.territory)
    bundle = args.bundle or DEFAULT_BUNDLES.get(territory.territory_id)
    output = args.output or DEFAULT_OUTPUTS.get(territory.territory_id)
    if not bundle or not output:
        raise SystemExit(
            f"No acquisition bundle or output directory is configured for {territory.territory_id}. "
            "Pass --bundle and --output."
        )

    result = build_source_authority(
        bundle_dir=REPO_ROOT / bundle,
        territory=territory,
        output_dir=REPO_ROOT / output,
    )
    summary = result["summary"]
    counts = summary["counts"]
    print(f"source-authority:built territory={territory.territory_id}")
    print(f"  authority_version   {result['authority_version']}")
    print(f"  manifest            {result['manifest_path'].relative_to(REPO_ROOT)}")
    print(f"  source_universe     {counts['source_universe_records']}")
    print(f"  admitted_identities {counts['admitted_identities']}")
    print(f"  name_assertions     {counts['name_assertions']}")
    print(f"  source_links        {counts['source_links']}")
    print(f"  dispositions        {counts['candidate_dispositions']}")
    print(f"  by type             {counts['identities_by_type']}")
    print(f"  boundary year       {summary['boundary_evidence']['boundary_year_represented']}")
    print(
        f"  context queue       {summary['context_resolution']['records_queued_for_multiple_context_matches']}"
        f" multiple-match, {summary['context_resolution']['code_geometry_disagreements']} code/geometry"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
