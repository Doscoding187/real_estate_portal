from __future__ import annotations

import argparse
import json
from pathlib import Path

from gauteng_catalogue.promotion import run_promotion


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Simulate Gauteng factual canonical promotion from existing candidate artifacts"
    )
    parser.add_argument(
        "--catalogue-root",
        required=True,
        type=Path,
        help="Catalogue data root containing output/gauteng_* catalogue artifacts",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("data/gauteng-canonical-promotion-v0.2/output"),
        help="Derived promotion output directory",
    )
    parser.add_argument(
        "--baseline-output-root",
        type=Path,
        default=Path("/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output"),
        help="Existing v0.1 promotion output directory used for bounded comparison",
    )
    args = parser.parse_args(argv)
    result = run_promotion(args.catalogue_root, args.output_root, args.baseline_output_root)
    print(
        json.dumps(
            {
                "promotion_classes": result["summary"]["promotion_classes"],
                "promotion_metrics": result["summary"]["promotion_metrics"],
                "output_paths": result["output_paths"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
