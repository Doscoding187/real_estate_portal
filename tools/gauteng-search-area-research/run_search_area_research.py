#!/usr/bin/env python3
"""Run the standalone Gauteng Search Area research projection."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


TOOL_ROOT = Path(__file__).resolve().parent
if str(TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(TOOL_ROOT))

from gauteng_search_area_research.build import build_all  # noqa: E402


REPOSITORY_ROOT = TOOL_ROOT.parents[1]
DEFAULT_SEED = REPOSITORY_ROOT / "data/gauteng-search-area-research-v0.1/input/gauteng_search_area_research_seed_v0.1.json"
DEFAULT_SUPPLEMENT = REPOSITORY_ROOT / "data/gauteng-search-area-research-v0.1/input/gauteng_search_area_research_supplement_v0.1.json"
DEFAULT_OUTPUT = REPOSITORY_ROOT / "data/gauteng-search-area-research-v0.1/output"
DEFAULT_CANONICAL = Path(
    "/home/edwardspc/Desktop/Dev/listify-gauteng-factual-canonical-v0-1/data/"
    "gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_geography_v0.1.jsonl"
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED)
    parser.add_argument("--supplement", type=Path, default=DEFAULT_SUPPLEMENT)
    parser.add_argument(
        "--canonical-geography",
        "--canonical",
        dest="canonical",
        type=Path,
        default=DEFAULT_CANONICAL,
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    run = build_all(args.seed, args.canonical, args.output_dir, args.supplement)
    print(json.dumps(run, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
