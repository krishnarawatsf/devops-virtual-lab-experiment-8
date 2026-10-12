#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p /tmp/vle8-logs

export SWITCHER_URL=http://127.0.0.1:8090
export BLUE_UPSTREAMS=http://127.0.0.1:8081,http://127.0.0.1:8082
export GREEN_UPSTREAMS=http://127.0.0.1:8083,http://127.0.0.1:8084

start() {
  local name="$1"
  shift
  echo "starting $name"
  nohup env "$@" >/tmp/vle8-logs/$name.log 2>&1 &
  echo $! >/tmp/vle8-logs/$name.pid
}

start blue-1   PORT=8081 APP_COLOR=blue  APP_VERSION=v1 REPLICA_ID=blue-1  node src/app.js
start blue-2   PORT=8082 APP_COLOR=blue  APP_VERSION=v1 REPLICA_ID=blue-2  node src/app.js
start green-1  PORT=8083 APP_COLOR=green APP_VERSION=v2 REPLICA_ID=green-1 node src/app.js
start green-2  PORT=8084 APP_COLOR=green APP_VERSION=v2 REPLICA_ID=green-2 node src/app.js
start switcher PORT=8090 ACTIVE_COLOR=blue node src/switcher.js
start dashboard PORT=8080 node server.js

sleep 1
echo "PIDs:"
cat /tmp/vle8-logs/*.pid
echo "Logs in /tmp/vle8-logs"
