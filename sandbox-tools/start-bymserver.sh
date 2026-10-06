#!/bin/sh
. /tmp/bymenv.sh
cd /home/claude/bym/server
nohup setsid bun src/server.ts > /tmp/bymserver.log 2>&1 < /dev/null &
