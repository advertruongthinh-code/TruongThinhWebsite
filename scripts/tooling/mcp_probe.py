from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

import anyio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def server_parameters(root: Path, service: str) -> StdioServerParameters:
    launchers = {
        "serena": "start-serena-mcp.ps1",
        "graphify": "start-graphify-mcp.ps1",
        "chrome-devtools": "start-chrome-devtools-mcp.ps1",
    }
    environment = os.environ.copy()
    environment["PYTHONUTF8"] = "1"
    pwsh = root / ".tooling" / "runtimes" / "powershell-7.6.4" / "pwsh.exe"
    return StdioServerParameters(
        command=str(pwsh),
        args=[
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(root / "scripts" / "tooling" / launchers[service]),
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
                    if service == "serena":
                        current = await session.call_tool("get_current_config", {})
                        payload["current_config"] = "\n".join(
                            block.text for block in current.content if hasattr(block, "text")
                        )[:4000]
                    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("service", choices=("serena", "graphify", "chrome-devtools"))
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--timeout", type=float, default=90)
    args = parser.parse_args()
    result = asyncio.run(probe(args.root.resolve(), args.service, args.timeout))
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
