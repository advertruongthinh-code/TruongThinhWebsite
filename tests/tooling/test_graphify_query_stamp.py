import time
import unittest
from pathlib import Path
from unittest.mock import ANY, patch

from graphify.cli import _touch_query_stamp


class QueryStampTests(unittest.TestCase):
    def test_query_stamp_avoids_atomic_temp_write(self) -> None:
        graph_path = Path("C:/synthetic/graph.json")

        def slow_atomic_write(*_args: object, **_kwargs: object) -> None:
            time.sleep(0.25)

        with (
            patch.object(Path, "mkdir"),
            patch.object(Path, "write_text") as direct_write,
            patch("graphify.paths.write_text_atomic", side_effect=slow_atomic_write),
        ):
            started = time.perf_counter()
            _touch_query_stamp(graph_path)
            elapsed = time.perf_counter() - started

            self.assertLess(elapsed, 0.1)
            direct_write.assert_called_once_with(ANY, encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
