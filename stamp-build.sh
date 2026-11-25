#!/bin/sh
# Writes the build stamp (date and time) into client-web/src/game/IOBuild.ts; see stamp-build.cmd.
set -e
cd "$(dirname "$0")/client-web"
[ -d node_modules ] || npm install --no-audit --no-fund
npm run --silent stamp
