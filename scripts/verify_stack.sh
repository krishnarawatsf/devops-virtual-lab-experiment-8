#!/usr/bin/env bash
set -euo pipefail

fail=0
check() {
  local name="$1"
  local url="$2"
  if curl -fsS "$url" >/dev/null; then
    echo "OK    $name  $url"
  else
    echo "FAIL  $name  $url"
    fail=1
  fi
}

echo "=== VLE-8 component health ==="
check "dashboard"     "http://127.0.0.1:8080/api/health"
check "switcher"      "http://127.0.0.1:8090/switcher/health"
check "live traffic"  "http://127.0.0.1:8090/api/health"
check "prometheus"    "http://127.0.0.1:9090/-/ready"
check "alertmanager"  "http://127.0.0.1:9093/-/ready"
check "grafana"       "http://127.0.0.1:3000/api/health"

echo
echo "=== Live color (should start as blue/v1) ==="
curl -fsS http://127.0.0.1:8090/api/info
echo

if [[ "$fail" -ne 0 ]]; then
  echo "One or more components failed."
  exit 1
fi
echo "All components are running."
