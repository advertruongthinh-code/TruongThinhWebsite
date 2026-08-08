from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from ruamel.yaml import YAML


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "serena_sync", PROJECT_ROOT / "scripts" / "tooling" / "serena_sync.py"
)
assert SPEC and SPEC.loader
SERENA_SYNC = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SERENA_SYNC)


class SerenaSyncTests(unittest.TestCase):
    def make_project(self) -> Path:
        root = Path(tempfile.mkdtemp(prefix="serena-sync-"))
        (root / ".serena").mkdir()
        (root / "scripts" / "tooling").mkdir(parents=True)
        (root / ".gitignore").write_text("graphify-out/\nassets/\n", encoding="utf-8")
        policy = json.loads(
            (PROJECT_ROOT / "scripts" / "tooling" / "serena-language-map.json").read_text(encoding="utf-8")
        )
        (root / "scripts" / "tooling" / "serena-language-map.json").write_text(
            json.dumps(policy), encoding="utf-8"
        )
        (root / ".serena" / "project.yml").write_text(
            "project_name: fixture\nlanguages:\n  - typescript\nread_only: false\n",
            encoding="utf-8",
        )
        return root

    def test_aliases_ignored_generated_and_unsupported(self) -> None:
        root = self.make_project()
        (root / "app.js").write_text("export const x = 1;", encoding="utf-8")
        (root / "app.ts").write_text("export const y = 2;", encoding="utf-8")
        (root / "query.sql").write_text("select 1;", encoding="utf-8")
        (root / "unknown.foo").write_text("unknown", encoding="utf-8")
        (root / "graphify-out").mkdir()
        (root / "graphify-out" / "generated.py").write_text("x = 1", encoding="utf-8")

        languages, unsupported, unknown = SERENA_SYNC.scan_languages(
            root,
            json.loads((root / "scripts" / "tooling" / "serena-language-map.json").read_text(encoding="utf-8")),
        )
        self.assertEqual(languages, ["typescript", "json"])
        self.assertNotIn("python", languages)
        self.assertEqual(unsupported, [".sql"])
        self.assertIn(".foo", unknown)

    def test_last_file_removal_and_legacy_schema_migration(self) -> None:
        root = self.make_project()
        (root / "README.md").write_text("# fixture", encoding="utf-8")
        config = root / ".serena" / "project.yml"
        config.write_text(
            "project_name: fixture\nlanguage_servers:\n  - typescript\nread_only: false\n",
            encoding="utf-8",
        )

        result = SERENA_SYNC.synchronize(root, apply=True)
        self.assertTrue(result["applied"])
        self.assertEqual(result["languages"], ["markdown", "json"])
        parsed = YAML(typ="safe").load(config.read_text(encoding="utf-8"))
        self.assertEqual(parsed[result["schema_key"]], ["markdown", "json"])
        legacy = "language_servers" if result["schema_key"] == "languages" else "languages"
        self.assertNotIn(legacy, parsed)
        self.assertFalse(parsed["read_only"])
        self.assertTrue((root / ".tooling" / "state" / "serena" / "restart-required.json").exists())


if __name__ == "__main__":
    unittest.main()
