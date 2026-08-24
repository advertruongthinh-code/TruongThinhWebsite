from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pathspec import PathSpec
from ruamel.yaml import YAML
try:
    from solidlsp.ls_config import LanguageServerId as SerenaLanguage
except ImportError:  # Serena <= 1.6.1
    from solidlsp.ls_config import Language as SerenaLanguage

from serena.config.serena_config import ProjectConfig


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def gitignore_spec(root: Path) -> PathSpec:
    path = root / ".gitignore"
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    return PathSpec.from_lines("gitwildmatch", lines)


def scan_languages(root: Path, policy: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    extension_map = {key.lower(): value for key, value in policy["extensions"].items()}
    supported_ids = {item.value for item in SerenaLanguage}
    invalid = sorted(set(extension_map.values()) - supported_ids)
    if invalid:
        raise RuntimeError(f"Language map contains unsupported Serena IDs: {', '.join(invalid)}")

    excluded_dirs = set(policy["excluded_directories"])
    excluded_prefixes = tuple(policy["excluded_prefixes"])
    unsupported_extensions = set(policy["unsupported"])
    ignored_extensions = set(policy.get("ignored_extensions", []))
    ignored = gitignore_spec(root)
    detected: set[str] = set()
    unsupported: set[str] = set()
    unknown: set[str] = set()

    for current, directories, files in os.walk(root):
        current_path = Path(current)
        directories[:] = [
            directory
            for directory in directories
            if directory not in excluded_dirs
            and not ignored.match_file((current_path / directory).relative_to(root).as_posix() + "/")
        ]
        for filename in files:
            path = current_path / filename
            relative = path.relative_to(root).as_posix()
            if relative.startswith(excluded_prefixes) or ignored.match_file(relative):
                continue
            suffix = path.suffix.lower()
            language = extension_map.get(suffix)
            if language:
                detected.add(language)
            elif suffix in unsupported_extensions:
                unsupported.add(suffix)
            elif suffix and suffix not in ignored_extensions:
                unknown.add(suffix)

    priority = policy["priority"]
    ordered = [language for language in priority if language in detected]
    ordered.extend(sorted(detected - set(ordered)))
    return ordered, sorted(unsupported), sorted(unknown)


def synchronize(root: Path, apply: bool) -> dict[str, Any]:
    config_path = root / ".serena" / "project.yml"
    policy_path = root / "scripts" / "tooling" / "serena-language-map.json"
    state_dir = root / ".tooling" / "state" / "serena"
    policy = load_json(policy_path)
    desired, unsupported, unknown = scan_languages(root, policy)

    yaml = YAML(typ="rt")
    yaml.preserve_quotes = True
    with config_path.open("r", encoding="utf-8") as handle:
        config = yaml.load(handle)

    project_fields = getattr(ProjectConfig, "__dataclass_fields__", {})
    canonical_key = "language_servers" if "language_servers" in project_fields else "languages"
    legacy_key = "languages" if canonical_key == "language_servers" else "language_servers"
    existing = list(config.get(canonical_key) or config.get(legacy_key) or [])
    legacy_present = legacy_key in config
    changed = existing != desired or legacy_present

    if apply and changed:
        state_dir.mkdir(parents=True, exist_ok=True)
        backup_dir = state_dir / "project-yml-backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        shutil.copy2(config_path, backup_dir / f"project.{stamp}.yml")

        config[canonical_key] = desired
        if legacy_key in config:
            del config[legacy_key]
        temporary = config_path.with_suffix(".yml.tmp")
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            yaml.dump(config, handle)
        os.replace(temporary, config_path)

        restart = {
            "changed_at": datetime.now(timezone.utc).isoformat(),
            "before": existing,
            "after": desired,
            "action": "Reactivate the Serena project; reconnect the Serena MCP server if config does not refresh.",
        }
        (state_dir / "restart-required.json").write_text(
            json.dumps(restart, indent=2) + "\n", encoding="utf-8"
        )

    result = {
        "changed": changed,
        "applied": bool(apply and changed),
        "languages": desired,
        "previous": existing,
        "unsupported_present": unsupported,
        "unknown_present": unknown,
        "config": str(config_path),
        "schema_key": canonical_key,
    }
    if apply:
        state_dir.mkdir(parents=True, exist_ok=True)
        (state_dir / "languages.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def run_health_check(root: Path) -> int:
    serena = Path(
        os.environ.get(
            "SERENA_EXE",
            str(Path.home() / ".codex" / "tooling" / "python" / "Scripts" / "serena.exe"),
        )
    )
    if not serena.is_file():
        raise FileNotFoundError(f"Global Serena executable is missing: {serena}")
    log = root / ".tooling" / "logs" / "serena-health-check.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a", encoding="utf-8") as handle:
        completed = subprocess.run(
            [str(serena), "project", "health-check", str(root)],
            cwd=root,
            stdout=handle,
            stderr=subprocess.STDOUT,
            timeout=240,
            check=False,
            text=True,
        )
    return completed.returncode


def watch(root: Path, debounce: float) -> None:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers import Observer

    class Handler(FileSystemEventHandler):
        last_run = 0.0

        def on_any_event(self, event: Any) -> None:
            if event.event_type not in {"created", "deleted", "moved"}:
                return
            now = time.monotonic()
            if now - self.last_run < debounce:
                return
            self.last_run = now
            try:
                result = synchronize(root, apply=True)
                if result["applied"]:
                    run_health_check(root)
            except Exception as exc:  # watcher must survive individual failures
                log = root / ".tooling" / "logs" / "serena-language-watch.log"
                log.parent.mkdir(parents=True, exist_ok=True)
                with log.open("a", encoding="utf-8") as handle:
                    handle.write(f"{datetime.now(timezone.utc).isoformat()} {exc}\n")

    synchronize(root, apply=True)
    observer = Observer()
    observer.schedule(Handler(), str(root), recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--health-check", action="store_true")
    parser.add_argument("--debounce", type=float, default=1.0)
    args = parser.parse_args()
    root = args.root.resolve()

    if args.watch:
        watch(root, args.debounce)
        return 0

    result = synchronize(root, apply=args.apply)
    if args.health_check and result["applied"]:
        result["health_check_exit"] = run_health_check(root)
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
