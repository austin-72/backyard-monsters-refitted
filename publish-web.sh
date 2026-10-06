#!/bin/sh
# Publishes the browser version of the game (client-web) to server/public/web; see publish-web.cmd.
# Run it after stamp-build, so the browser build carries the same stamp as the published SWF.
set -e
cd "$(dirname "$0")/client-web"
[ -d node_modules ] || npm install --no-audit --no-fund
export SERVER_URL="${SERVER_URL:-https://inferno-mr2.maproom2.com/}"
export CDN_URL="${CDN_URL:-$SERVER_URL}"
npm run convert
npm run assets
npm run build
npm run --silent publish -- --root
stamp=$(sed -n 's/.*IOBUILD:\([0-9]*\):.*/\1/p' ../client/scripts/IOBuild.as)
echo "Published the browser client, build $stamp, to server/public/web."
echo "Players open the site itself, e.g. https://inferno-mr2.maproom2.com/ (and /web/ still works)."
echo "With Docker: live at once (docker-compose.yml binds server/public/web into the container)."
npm run --silent check || true
