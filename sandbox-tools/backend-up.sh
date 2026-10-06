#!/bin/sh
# Starts PostgreSQL, Redis and the BYMR server if they are not running.
if ! pg_isready -q -h localhost -p 5432 2>/dev/null; then
  su postgres -c "setsid nohup /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main -o '-c config_file=/etc/postgresql/16/main/postgresql.conf' -l /tmp/pg.log start" > /dev/null 2>&1 < /dev/null
  for i in 1 2 3 4 5 6 7 8 9 10; do pg_isready -q -h localhost -p 5432 && break; sleep 0.5; done
fi
if ! redis-cli ping > /dev/null 2>&1; then
  setsid nohup redis-server --daemonize yes > /dev/null 2>&1 < /dev/null
  sleep 0.5
fi
if ! curl -s -m 2 -o /dev/null localhost:3001/connection; then
  . /tmp/bymenv.sh
  cd /home/claude/bym/server && setsid nohup bun src/server.ts > /tmp/bymserver.log 2>&1 < /dev/null &
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16; do curl -s -m 1 -o /dev/null localhost:3001/connection && break; sleep 0.5; done
fi
