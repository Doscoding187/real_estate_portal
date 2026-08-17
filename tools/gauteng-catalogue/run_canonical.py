from __future__ import annotations

import argparse
import json
from pathlib import Path

from gauteng_catalogue.canonical import run_canonical


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Materialize non-production Gauteng factual canonical geography from accepted v0.2 evidence"
    )
    parser.add_argument(
        "--candidate-root",
        required=True,
        type=Path,
        help="Read-only candidate catalogue data root containing output/gauteng_* artifacts",
    )
    parser.add_argument(
        "--promotion-output-root",
        required=True,
        type=Path,
        help="Read-only v0.2 promotion output directory containing the full simulation JSONL",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("data/gauteng-factual-canonical-v0.1/output"),
        help="Derived factual canonical output directory",
    )
    args = parser.parse_args(argv)
    result = run_canonical(
        args.candidate_root,
        args.promotion_output_root,
        args.output_root,
    )
    print(
        json.dumps(
            {
                "canonical_result": result["summary"]["canonical_result"],
                "licensing_distribution": result["summary"]["licensing_distribution"],
                "kyalami_decision": result["summary"]["kyalami_khayalami"]["machine_canonical_decision"],
                "output_paths": result["output_paths"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
