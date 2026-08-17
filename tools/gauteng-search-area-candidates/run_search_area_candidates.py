#!/usr/bin/env python3
"""CLI entry point for the non-production Search Area candidate pack."""

from pathlib import Path
import sys

PACKAGE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PACKAGE_ROOT))

from gauteng_search_area_candidates.build import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
