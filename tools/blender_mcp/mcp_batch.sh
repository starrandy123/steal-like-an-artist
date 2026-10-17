#!/bin/bash
# ONE BATCH THROUGH THE BLENDER MCP, NO WINDOW: a background Blender serving the official addon (headless.py), the official MCP
# server (uvx mcp-for-blender@2.1.9, telemetry off, safe mode on) driven by client.py, then Blender is stopped.
# Wrap it in the machine's heavy lock (three sessions share this 8 GB laptop):
#   bash ~/.mosa/heavy.sh run map2-blender -- bash tools/blender_mcp/mcp_batch.sh <batch.json> <out dir>
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
BATCH="$1"; OUT="$2"; mkdir -p "$OUT"
BL="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
PORT="${BLENDER_PORT:-9876}"; STOP="$OUT/.stop"; rm -f "$STOP"
if nc -z 127.0.0.1 "$PORT" 2>/dev/null; then echo "[batch] port $PORT is taken: another Blender MCP is serving" >&2; exit 3; fi
export DISABLE_TELEMETRY=true BLENDER_MCP_SAFE_MODE="${BLENDER_MCP_SAFE_MODE:-true}" UV_PYTHON_PREFERENCE=only-managed BLENDER_PORT="$PORT"
"$BL" -b --factory-startup --disable-autoexec --python "$HERE/headless.py" -- --addon "$HERE/addon.py" --port "$PORT" --stop "$STOP" --idle 600 \
  > "$OUT/blender.log" 2>&1 &
BPID=$!
trap 'touch "$STOP"; sleep 1; kill $BPID 2>/dev/null' EXIT INT TERM
for i in $(seq 1 120); do nc -z 127.0.0.1 "$PORT" 2>/dev/null && break; kill -0 $BPID 2>/dev/null || { echo "[batch] Blender ended before serving:" >&2; tail -20 "$OUT/blender.log" >&2; exit 4; }; sleep 0.5; done
nc -z 127.0.0.1 "$PORT" 2>/dev/null || { echo "[batch] Blender never served the port" >&2; exit 5; }
uvx --python 3.12 --from mcp-for-blender@2.1.9 python "$HERE/client.py" "$BATCH" "$OUT/mcp.jsonl"
RC=$?
touch "$STOP"; for i in $(seq 1 20); do kill -0 $BPID 2>/dev/null || break; sleep 0.5; done; kill $BPID 2>/dev/null
echo "[batch] done: exit $RC · log $OUT/mcp.jsonl · Blender's own log $OUT/blender.log"
exit $RC
