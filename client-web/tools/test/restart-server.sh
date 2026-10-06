#!/bin/sh
# Restarts the dev server (kills whatever listens on :8080).
cd "$(dirname "$0")/../.."
pid=$(ss -ltnp 2>/dev/null | grep ':8080 ' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
[ -n "$pid" ] && kill "$pid" && sleep 0.5
exec ./tools/test/ensure-server.sh
