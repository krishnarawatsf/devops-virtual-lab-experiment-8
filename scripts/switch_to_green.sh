#!/usr/bin/env bash
set -euo pipefail
echo "Switching Service traffic Blue -> Green"
curl -fsS -X POST http://127.0.0.1:8080/api/switch \
  -H 'Content-Type: application/json' \
  -d '{"color":"green","reason":"script-switch"}'
echo
echo "Live replica:"
curl -fsS http://127.0.0.1:8090/api/info
echo
