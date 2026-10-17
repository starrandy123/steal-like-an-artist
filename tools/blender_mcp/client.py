"""A BATCH OF CALLS TO THE OFFICIAL BLENDER MCP SERVER, over its own stdio protocol (the mcp SDK's client, the same calls an agent's
MCP tools make). Runs inside the server's own environment (mcp_batch.sh starts it with `uvx --from mcp-for-blender@2.1.9 python`).

  python client.py <batch.json> <log.jsonl>

A batch is a list of steps, run in order; the batch stops at the first step whose reply starts with "Error":
  {"tool": "search_assets", "args": {"source": "polyhaven", "query": "street lamp", "asset_type": "models"}}
  {"tool": "execute_blender_code", "file": "scripts/decimate.py", "vars": {"TARGET": 2000}}
A step with "file" sends that script as `code`, with each of "vars" set as a Python constant on top of it.
Every request and every reply is written to the log, one JSON line each.
"""
import asyncio
import json
import os
import sys
import time

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER = StdioServerParameters(
    command='uvx', args=['--python', '3.12', 'mcp-for-blender@2.1.9', '--host', '127.0.0.1', '--port', os.environ.get('BLENDER_PORT', '9876')],
    env={**os.environ, 'DISABLE_TELEMETRY': 'true', 'BLENDER_MCP_SAFE_MODE': os.environ.get('BLENDER_MCP_SAFE_MODE', 'true'),
         'UV_PYTHON_PREFERENCE': 'only-managed'},
)


def code_of(step, base):
    if 'file' not in step:
        return step['args']
    path = step['file'] if os.path.isabs(step['file']) else os.path.join(base, step['file'])
    head = ''.join(f'{k} = {json.dumps(v)}\n' for k, v in (step.get('vars') or {}).items())
    with open(path, encoding='utf-8') as f:
        return {**(step.get('args') or {}), 'code': head + f.read()}


async def main(batch_path, log_path):
    with open(batch_path, encoding='utf-8') as f:
        steps = json.load(f)
    base = os.path.dirname(os.path.abspath(batch_path))
    failed = False
    async with stdio_client(SERVER) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = sorted(t.name for t in (await session.list_tools()).tools)
            with open(log_path, 'a', encoding='utf-8') as log:
                log.write(json.dumps({'at': time.time(), 'tools': tools}) + '\n')
                for i, step in enumerate(steps):
                    args = code_of(step, base)
                    t0 = time.time()
                    res = await session.call_tool(step['tool'], args)
                    text = '\n'.join(c.text for c in res.content if getattr(c, 'type', '') == 'text')
                    shown = {k: (v if k != 'code' else f'<{len(v)} chars of code>') for k, v in args.items()}
                    log.write(json.dumps({'step': i, 'tool': step['tool'], 'args': shown, 'seconds': round(time.time() - t0, 2),
                                          'isError': bool(res.isError), 'reply': text}) + '\n')
                    log.flush()
                    print(f'--- step {i}: {step["tool"]} ({time.time() - t0:.1f} s)\n{text[:4000]}', flush=True)
                    if res.isError or text.lstrip().lower().startswith(('error', 'rejected')):   # a script safe mode refused is a failed step
                        failed = True
                        break
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main(sys.argv[1], sys.argv[2])))
