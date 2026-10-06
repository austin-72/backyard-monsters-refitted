#!/bin/sh
# Starts the dev server in the background unless it is already answering.
cd "$(dirname "$0")/../.."
if ! curl -s -o /dev/null http://localhost:8080/; then
  nohup setsid tsx tools/dev-server.ts > /tmp/devserver.log 2>&1 < /dev/null &
  for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -s -o /dev/null http://localhost:8080/ && break; done
fi
