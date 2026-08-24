"""Report pending non-code semantic inputs from Graphify's own manifest."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from graphify.detect import detect_incremental


SEMANTIC_TYPES = ("document", "paper", "image", "video")


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: graphify-semantic-status.py ROOT MANIFEST")

    root = Path(sys.argv[1]).resolve()
    manifest = Path(sys.argv[2]).resolve()
    result = detect_incremental(root, manifest_path=str(manifest), kind="semantic")
    pending = []
    by_type = {}
    for category in SEMANTIC_TYPES:
        files = []
        for raw_path in result.get("new_files", {}).get(category, []):
            path = Path(raw_path)
            try:
                display = path.resolve().relative_to(root).as_posix()
            except ValueError:
                display = path.as_posix()
            files.append(display)
        files.sort()
        by_type[category] = files
        pending.extend(files)

    payload = {
        "available": True,
        "pending_count": len(pending),
        "pending_files": pending,
        "pending_by_type": by_type,
    }
    print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
