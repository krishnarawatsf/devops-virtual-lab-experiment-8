#!/usr/bin/env bash
set -euo pipefail
for f in /tmp/vle8-logs/*.pid; do
  [[ -f "$f" ]] || continue
  pid=$(cat "$f")
  kill "$pid" 2>/dev/null || true
  rm -f "$f"
done
echo "stopped local VLE-8 processes"
