#!/bin/sh
# Publishes the game (client-web) to server/public/web; see publish-web.cmd.
# It gives the release a new build stamp itself (open games are then asked to reload).
set -e
cd "$(dirname "$0")/client-web"
[ -d node_modules ] || npm install --no-audit --no-fund
export SERVER_URL="${SERVER_URL:-https://inferno.maproom2.com/}"
export CDN_URL="${CDN_URL:-$SERVER_URL}"
# RELEASE=1: minified, the art in one file, everything compressed ahead (client-web/tools/build.ts)
npm run --silent stamp
RELEASE=1 npm run build
npm run --silent publish -- --root
# (QoL #645) the players' Shiny page, server/public/docs/shiny.html (/shiny), written again from the server's settings
node_modules/.bin/tsx ../server/scripts/shinyPage.ts || echo "Writing server/public/docs/shiny.html FAILED (the game itself is published)."
stamp=$(sed -n 's/.*IOBUILD:\([0-9]*\):.*/\1/p' src/game/IOBuild.ts)
echo "Published the game, build $stamp, to server/public/web."
echo "Players open the site itself, e.g. https://inferno.maproom2.com/ (and /web/ still works)."
echo "With Docker: live at once (docker-compose.yml binds server/public/web into the container)."
npm run --silent check || true
