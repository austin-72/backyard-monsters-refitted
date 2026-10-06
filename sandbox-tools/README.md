# Sandbox helper scripts (Linux test environment used during development)

Copy them to /tmp and adjust the paths inside to where the projects live in your sandbox.

- `ioenv.sh`  environment for the Inferno MR2 server (DB `bymio`, Redis db 1, port 3001, ENV=local; local test secrets only)
- `io-up.sh`  starts PostgreSQL, Redis and the fork server if they are not running (path: `/home/claude/io/server`)
- `killport.sh <pattern>`  kills processes whose command line contains the pattern (never itself)
- `backend-up.sh`, `bymenv.sh`, `start-bymserver.sh`  the same for the upstream BYMR server (DB `bym`)

Background processes may be gone between turns: run `io-up.sh` before each test.
See HANDOFF.md §9 for the full test recipe.
- `depths-tiles.py`: makes the Depths of Hell map art (`client/scripts/_assets/hellmap/depths_*.png`).
- `topbar-icons.py`: makes the top bar's shortcut pictures (`server/public/assets/topbar/*.png`).
