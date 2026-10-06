#!/usr/bin/env python3
"""Restore fresh cached semantic nodes for Graphify zero-AST project files."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_merge
from graphify.cache import check_semantic_cache
from graphify.cluster import (
    cluster,
    community_member_sigs,
    label_communities_by_hub,
    remap_communities_to_previous,
    score_all,
)
from graphify.detect import detect
from graphify.export import to_html, to_json
from graphify.paths import write_json_atomic
from graphify.report import generate


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--graph", required=True, type=Path)
    parser.add_argument("--files", required=True, type=Path)
    parser.add_argument("--prompt", required=True, type=Path)
    parser.add_argument("--check-only", action="store_true")
    return parser.parse_args()


def relative_source(root: Path, value: object) -> str:
    text = str(value or "").replace("\\", "/")
    path = Path(text)
    if path.is_absolute():
        try:
            return path.resolve().relative_to(root).as_posix()
        except ValueError:
            return path.as_posix()
    return text[2:] if text.startswith("./") else text


def load_files(root: Path, list_path: Path) -> tuple[list[Path], set[str]]:
    absolute: list[Path] = []
    relative: set[str] = set()
    for raw in list_path.read_text(encoding="utf-8").splitlines():
        item = raw.strip().replace("\\", "/")
        if not item or item.startswith("#"):
            continue
        path = (root / item).resolve()
        try:
            rel = path.relative_to(root).as_posix()
        except ValueError as error:
            raise ValueError(f"Supplemental path escapes project root: {item}") from error
        if not path.is_file():
            raise FileNotFoundError(f"Supplemental file is missing: {rel}")
        absolute.append(path)
        relative.add(rel)
    if not absolute:
        raise ValueError("Supplemental file list is empty.")
    return absolute, relative


def graph_sources(graph_data: dict, root: Path) -> set[str]:
    return {
        relative_source(root, node.get("source_file"))
        for node in graph_data.get("nodes", [])
        if isinstance(node, dict) and node.get("source_file")
    }


def previous_communities(graph_data: dict) -> dict[str, int]:
    result: dict[str, int] = {}
    for node in graph_data.get("nodes", []):
        if not isinstance(node, dict) or "id" not in node or "community" not in node:
            continue
        try:
            result[str(node["id"])] = int(node["community"])
        except (TypeError, ValueError):
            continue
    return result


def load_int_map(path: Path) -> dict[int, str]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return {int(key): value for key, value in raw.items() if isinstance(value, str)}
    except (OSError, ValueError, TypeError):
        return {}


def restore(args: argparse.Namespace) -> dict:
    root = args.root.resolve()
    graph_path = args.graph.resolve()
    out = graph_path.parent
    files, required = load_files(root, args.files.resolve())
    graph_data = json.loads(graph_path.read_text(encoding="utf-8"))
    missing = sorted(required - graph_sources(graph_data, root))
    if not missing:
        return {"status": "covered", "changed": False, "covered": len(required), "missing": []}
    if args.check_only:
        return {"status": "missing", "changed": False, "covered": len(required) - len(missing), "missing": missing}
    if not args.prompt.is_file():
        raise FileNotFoundError(f"Graphify extraction prompt is missing: {args.prompt}")

    nodes, edges, hyperedges, uncached = check_semantic_cache(
        [str(path) for path in files], root=str(root), prompt_file=str(args.prompt.resolve())
    )
    if uncached:
        return {
            "status": "stale-cache",
            "changed": False,
            "covered": len(required) - len(missing),
            "missing": missing,
            "uncached": [relative_source(root, value) for value in uncached],
        }

    extraction = {"nodes": nodes, "edges": edges, "hyperedges": hyperedges}
    for collection in ("nodes", "edges", "hyperedges"):
        for item in extraction[collection]:
            item["source_file"] = relative_source(root, item.get("source_file"))

    previous = previous_communities(graph_data)
    graph = build_merge(
        [extraction], graph_path=str(graph_path), root=str(root), directed=False
    )
    communities = cluster(graph)
    if previous:
        communities = remap_communities_to_previous(communities, previous)

    labels_path = out / ".graphify_labels.json"
    signature_path = out / ".graphify_labels.json.sig"
    saved_labels = load_int_map(labels_path)
    saved_signatures = load_int_map(signature_path)
    current_signatures = community_member_sigs(communities)
    if saved_signatures:
        labels = {
            cid: label
            for cid, label in saved_labels.items()
            if cid in communities and saved_signatures.get(cid) == current_signatures.get(cid)
        }
    elif len(saved_labels) == len(communities):
        labels = {cid: label for cid, label in saved_labels.items() if cid in communities}
    else:
        labels = {}
    missing_communities = {cid: members for cid, members in communities.items() if cid not in labels}
    labels.update(label_communities_by_hub(graph, missing_communities))

    if not to_json(graph, communities, str(graph_path), community_labels=labels):
        raise RuntimeError("Graphify refused to write the supplemental graph.")
    write_json_atomic(labels_path, {str(key): value for key, value in labels.items()}, ensure_ascii=False)
    write_json_atomic(
        signature_path,
        {str(key): value for key, value in community_member_sigs(communities).items()},
        ensure_ascii=False,
    )

    cohesion = score_all(graph, communities)
    gods = god_nodes(graph)
    surprises = surprising_connections(graph, communities)
    questions = suggest_questions(graph, communities, labels)
    detection = detect(root, cache_root=root)
    report = generate(
        graph,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        {"input": 0, "output": 0},
        str(root),
        suggested_questions=questions,
    )
    (out / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    to_html(graph, communities, str(out / "graph.html"), community_labels=labels)

    final_data = json.loads(graph_path.read_text(encoding="utf-8"))
    final_missing = sorted(required - graph_sources(final_data, root))
    if final_missing:
        raise RuntimeError(f"Supplemental restore left missing sources: {final_missing}")
    return {
        "status": "restored",
        "changed": True,
        "covered": len(required),
        "missing": [],
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "communities": len(communities),
    }


def main() -> int:
    args = parse_args()
    try:
        result = restore(args)
    except Exception as error:  # noqa: BLE001 - biên CLI chỉ báo một lỗi ngắn gọn.
        print(json.dumps({"status": "error", "error": str(error)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["status"] in {"covered", "restored"} else 2


if __name__ == "__main__":
    sys.exit(main())
