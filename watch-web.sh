#!/bin/sh
# Watches the game's sources (client-web/src, public) and publishes the browser client to server/public/web-dev on every change;
# see watch-web.cmd. Ctrl+C stops it.
set -e
cd "$(dirname "$0")/client-web"
[ -d node_modules ] || npm install --no-audit --no-fund
export SERVER_URL="${SERVER_URL:-https://inferno.maproom2.com/}"
export CDN_URL="${CDN_URL:-$SERVER_URL}"
exec npm run --silent watch -- "$@"
