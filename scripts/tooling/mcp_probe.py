from __future__ import annotations

import argparse
import asyncio
import json
import os
import shutil
from pathlib import Path

import anyio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def server_parameters(root: Path, service: str) -> StdioServerParameters:
    environment = os.environ.copy()
    environment["PYTHONUTF8"] = "1"
    tooling = Path(environment.get("CODEX_GLOBAL_TOOLING_ROOT", Path.home() / ".codex" / "tooling"))
    pwsh = shutil.which("pwsh")
    if not pwsh:
        raise FileNotFoundError("pwsh is required to launch the global MCP wrapper")
    return StdioServerParameters(
        command=pwsh,
        args=[
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(tooling / "bin" / "mcp.ps1"),
            service,
        ],
        cwd=str(root),
        env=environment,
    )


async def probe(root: Path, service: str, timeout: float) -> dict[str, object]:
    parameters = server_parameters(root, service)
    log_path = root / ".tooling" / "logs" / f"mcp-probe-{service}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as errlog:
        with anyio.fail_after(timeout):
            async with stdio_client(parameters, errlog=errlog) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    result = await session.initialize()
                    tools = await session.list_tools()
                    payload: dict[str, object] = {
                        "service": service,
                        "server": result.serverInfo.name,
                        "version": result.serverInfo.version,
                        "tools": len(tools.tools),
                        "tool_names": [tool.name for tool in tools.tools],
                    }
                    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("service", choices=("graphify",))
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--timeout", type=float, default=90)
    args = parser.parse_args()
    result = asyncio.run(probe(args.root.resolve(), args.service, args.timeout))
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
