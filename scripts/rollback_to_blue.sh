#!/usr/bin/env bash
set -euo pipefail
echo "Rolling back Service traffic Green -> Blue"
curl -fsS -X POST http://127.0.0.1:8080/api/switch \
  -H 'Content-Type: application/json' \
  -d '{"color":"blue","reason":"rollback"}'
echo
echo "Live replica:"
curl -fsS http://127.0.0.1:8090/api/info
echo
