# Inferno-only server — patch notes

Patch: `inferno-only.patch`
Base commit: `6d706bdde9e6a3f96adac243a265b6a0ab690fff` of bym-refitted/backyard-monsters-refitted

## Applying

The zip already has everything applied; see `RUNNING-INFERNO-ONLY.md`. To apply to your own clone:

```
git checkout 6d706bd
git apply inferno-only.patch
```

Use a **fresh database**:
wild monster yards that players have already attacked are persisted, and old rows would keep
their overworld layouts.

Client and server must agree: `GLOBAL.INFERNO_ONLY` in `client/scripts/GLOBAL.as` and
`infernoOnlyConfig.enabled` in `server/src/config/InfernoOnlyConfig.ts`.

## How it works

The main yard stays a normal Map Room 2 main yard on the server. The client *presents* every
yard as Inferno. Two getters in `BASE.as` carry the split:

- `isInfernoMainYardOrOutpost` — presentation (lava, Inferno props, bone/coal/sulfur/magma,
  IC monsters, stone UI). Always true.
- `usesInfernoBackend` — routing (legacy inferno save, `api/bm/base` endpoints, MR1-style
  inferno map). Always false. Swapped in at ~25 sites.

## Tunables (server, no client rebuild needed)

`server/src/config/InfernoOnlyConfig.ts` — sent to the client as `flags.io_*` on each base load.

| Setting | Default |
|---|---|
| `requireDiscord` | false (no Discord verification at login, no Discord account-age gate, in any ENV) |
| `alliances` | true. `false` hides the menu entry and invite button and refuses `/alliance/*` |
| `moloch.perThousandSeats` | 72: about 310 strongholds on a 400 x 400 world (measured: 307 and 311 on two worlds), split roughly evenly between level 46 and level 50 |
| `moloch.lootCaps` | most one destroyed building pays, per resource: level 46 = 2M per silo / 4M for the hall, level 50 = 3M / 8M (stock wild-monster yards: 500k / 2M). Sent with the yard, so a server restart is enough |
| `moloch.descentBases` | level 46 is descent base 10 or 11, level 50 is descent base 12 or 13 (the final two). Each stronghold's seat picks which, so it never changes |
| `chat` / `chatTransport` | chat on, over `"http"`: the chat protocol rides on ordinary requests to `/chat/poll`, so it works through a web-only tunnel. `"socket"` is the stock WebSocket (needs ports 3010 and 843 open) |
| `catapult` | the Catapult's ammunition (buildable from Under Hall 3, main yard only): Marilyn Monstroe (magma + sulfur), Candy Jars (bone + coal; `seconds` 15 / 25 / 40 / 55 jarred, cost 100k / 500k / 2M / 5M of each), Sulfur Bomb (sulfur; 100k / 500k / 5M / 10M: speed, then invulnerable for `invuln` seconds (0 / 4 / 8 / 12), then `armor`% of damage removed (40 / 55 / 70 / 85) fading to 0 by `speedlength` (15 / 25 / 40 / 55 s in all); the monsters glow red while invulnerable, orange from 99% to 45% armour, yellow below). Four sizes each, size N needs Catapult level N, one shot per row per attack. Every number is here; server restart only |
| `attackViolationBanAfter` | refused attack payloads before the account is banned automatically; 0 (default) never bans by itself, the refusal is logged (`Attack refused for ...`) and kept in `bym.report` for an admin to judge. The stock server banned on the first refusal |
| `prices` | every shiny price in one place: packing, protection, housing expansion, tower overdrive, moving yards, capturing an outpost, alliance power-ups per hour, kit buy-outs, wall upgrades, resource top-ups (flat per size), repair all, the free "close enough" window, reduce by 1h/2h, and the finish-now curve (first hour flat, then per hour pro rata). Server restart only |
| `welcome` | the popup shown once per login (title and body, line breaks kept), in place of the stock unlock/catapult nags; empty body = no popup |
| `outpostCapacity` | storage each captured outpost adds per resource (5,000,000; stock 2,000,000). Server restart only |
| `dailyLogin` | 10 shiny a day; every 7th day of a streak (7, 21, 35, ...) pays 100 and every 14th (14, 28, ...) 200. The streak keeps counting (day 15, 16, ...) for as long as the player collects every (UTC) day; missing one starts again at day 1. Collected from the Daily Reward popup (two rows of seven day tiles: the 14-day stretch the streak is in; art in `public/assets/popups/daily/`; client `com/monsters/daily/IoDailyPopup.as`), opened from the Daily Reward button, which takes the gift button's place in the top bar on the player's own yards: its badge shows the streak day, and while today's reward is waiting the alert ring spins like the notification buttons. Nothing pops up by itself. `shiny: 0` turns it off (and hides the button). Replaces the stock monthly 500-shiny grant (`scripts/monthly-shiny.ts` now grants nothing) |
| `referral` | invite links: the Invite Friends button shows "Join me on maproom 2 in the inferno! - A custom backyard monsters refitted server." and "Play in your browser at `inviteUrl`?ref=<code>" (default `https://inferno.maproom2.com/`; empty = the server's `BASE_URL`), with a Copy button. A friend who starts the game from it and registers earns both players `shiny` (250), paid when the friend's yard is created; nothing between accounts made on the same IP address (registration IP, and the inviter's last login IP); once per account; 0 turns it off |
| `hiddenUi` | gift, earn, daveclub: the Earn Shiny button and the D.A.V.E. Club icon are hidden. The gift button is the Daily Reward button on inferno-only servers, so `gift` no longer hides it. `invite` is also accepted; it is left out so the Invite Friends button (referral link) shows. Server restart only |
| `flipTribeYards` | true: devil tribe yards are turned 180 degrees around their centre (Moloch strongholds are not). Reset stored tribe yards after changing it |
| `rezghul` | enabled, 500,000 magma to hatch. Unlocked in the Strongbox (page 4, after King Wormzer, 1.5 times his unlock cost and time); no longer unlocked from the start. The server's production attack validation uses the same cost |
| `spawn` | where new players (and "relocate anywhere") land: within `nearPlayers` (20) cells of another player's main yard or outpost, more than `awayFromMainYards` (5) cells from any main yard, more than `awayFromMoloch` (15) from any Moloch stronghold. `attempts` (100) random tries near players; after that, any free land. Distances are map cells, wrapping at the edges. `enabled: false` = the stock random cell |
| `mapRoom3` | false: no migration offer in the client, every `/worldmapv3/*` route and `setmapversion 3` refused |
| `mushrooms` | true: mushrooms grow in the main yard and pay shiny when picked. `false` stops them spawning |
| `startingShiny` | 2,000–2,025 random |
| `startingResources` | 60,000 bone / coal / sulfur and 55,000 magma for a new yard (the client caps them at silo capacity) |
| `resourceMultiplier` / `magmaMultiplier` | 2 / 4 |
| `buildTimeDivisor` | 4 (build, upgrade, fortify, repair, locker unlock, academy training) |
| `hatchSeconds` | 1 |
| `workers` | 5 (outposts have 2: the game, `GLOBAL.ioOutpostWorkers`) |
| `tribeSpawns.spacing` / `warp` / `swirl` / `blendWidth` | 6 / 5 / 5 / 1.2 |
| `tribeSpawns.ladders` | the stock per-tribe level sets (see below) |
| `moloch.levels` | 46 and 50 |
| `moloch.loot` | 60M bone/coal/sulfur + 30M magma at 46, 120M + 60M at 50 (richest ordinary tribe yard: 37.5M / 17.5M) |
| `assetVersion` | 9: added to picture requests as `?v=9`; raise it after replacing pictures in `public/assets` so nobody gets an old copy from a cache. Server restart only |
| `wildAttacks` | wild tribe attacks on the player's main yard (not outposts), never in the first minute after logging in: at most one per 23 hours per player, Moloch 5% of the time and the other four tribes evenly, from yard level 3 (`minLevel`); a fixed monster list per tribe and player-level band (1-10, 11-20, 21-30, 31-40, 41+), with the monsters' level. See "Wild tribe attacks". Server restart only |
| `minClientBuild` | 0: the lowest client build stamp accepted when no client is published in `public/client/`. With one published, its own stamp is the minimum |
| `kitPagingTest` | false: when true and no custom kits exist, the three stock kits are spread over two pages to test paging |
| `gauntlet` | Moloch's Gauntlet, the monthly event (see "Moloch's Gauntlet"): `enabled` true, open the first `days` (7) UTC days of each month, `stages` 13, win at `winPercent` (90) % destroyed, `attempts` 3 per stage before the yard heals and that stage's reward is lost, `stageShiny` 5 a stage, `finalShiny` 150 more on the last, `finalResources` 30M bone / coal / sulfur and 15M magma on the last stage (stage N pays N/13 of it). Server restart only |
| `yardShadows` | true: buildings cast shadows in the yard (the browser and the Flash client alike). `false` turns them off everywhere. Server restart only |
| `yardShadowsWhileMoving` | false: the yard's shadows are hidden while a building is held (dragged in move mode, or a new one on the pointer from the build menu) and come back when it is put down or cancelled. They are 200+ shapes drawn one by one with a "multiply" blend, so moving and placing are smoother without them. `true` keeps them while moving. Server restart only |
| `yardPartialRedraw` | true: in the browser, the yard is drawn again only where something changed since the last frame (see "Moving and placing buildings: speed"). `false` goes back to drawing the whole yard every frame, without a new client: the way back if something is ever seen not redrawn. The Flash client always draws the whole yard. Server restart only |
| `redrawSweepMs` | 1000: with the partial redraw on, the yard in view is also drawn again from scratch a strip at a time, all of it once a second, so anything a partial redraw might ever leave behind is gone within that time (see "Safety sweep"). 0 turns it off; a longer time costs less. Server restart only |

World size and player cap: `server/src/enums/MapRoom.ts` (400x400, 625 players per world).

## Tribe spawning

`server/src/services/maproom/v2/tribeTerritories.ts`. Every land cell is a tribe cell. The map is
carved into small territories grown around seats (one per `spacing` bucket, snapped onto land);
borders are bent by two noise fields and lightly blended; level is highest at the seat and steps
down to the border.

- Levels per tribe are the sets the stock MR2 server produces: Hellionnaire 25/29/33/37/41,
  Kozmodeus 30/34/38/42, Abaddonakki 27/31/35/39/43, Beelzenaut 28/32/36/40/44. Each level holds
  an equal share of its tribe's cells. Moloch uses only 46 and 50.
- Moloch rules 2.4% of seats; the seat's single peak cell is the stronghold. New players are
  never placed on one.
- Seeded: the world uuid seeds the noise fields (as the terrain already does) and salts every
  hash. Nothing is stored. Check it yourself with
  `bun src/scripts/verify-tribe-spawns.ts <world-uuid> [forward|reverse]` - the fingerprint must
  never change for a given world and config.
- Changing any `tribeSpawns` / `moloch` value re-rolls every tribe cell. Wipe persisted tribe saves
  (rows of type `tribe`) when you do; they also expire on their own.
- At spacing 6 with warp 5 + swirl 5 territories are heavily fragmented (about 4 pieces each, 37%
  of cells detached from their territory's main body). That was a deliberate choice.

## Map coordinates

Plain numbers (the user's, 4 October): the world map goes from 0, 0 to 399, 399 and the Depths of Hell from
0, 0 to 9, 9. Until then the world's were shown as negatives ("depths below the surface") and the Depths' went 1-10.
- `GLOBAL.ioCoord(n)` is the plain number now (kept as the one place that prints a world coordinate).
- `IoMapUi.coord(x, y)`: "188, 201", or "Depths of Hell 4, 5" for a cell down there (`IoUnderworld.label`, now
  `cell - origin`). Used by the pointer box, bubbles, sidebar, bookmarks, alliance pages, and now also chat's map
  pins (`IoMapShare`) and the attack log's yard line (`IoAttackLogs`), which printed a Depths cell as "-504".
- New `IoMapUi.location(x, y)` for the popups' short Location boxes ("188 x 201", "D4 x D5"): the hover panel and
  the enemy, own-yard, view-only and mine popups.
- The Outposts list numbers Depths outposts D0-D9 (was D1-D10) and the world's plainly.
- The Test tools' (`IoTestMode`) fields and messages are plain too; the pin editor's hint says "e.g. 120, 340" in
  all four languages (`io_alliance_pin_place_hint`).
- Typing still works as before: Jump-to, the pin editor and the Test tools drop anything that isn't a digit, so an
  old habit of typing "-150" still goes to 150.
- AS3: `GLOBAL.as`, `IoMapUi.as`, `IoUnderworld.as`, `IoOutpostsPopup.as`, `MapRoomPopup.as`, `PopupInfoEnemy.as`,
  `PopupInfoViewOnly.as`, `PopupInfoMine.as`, `IoMapShare.as`, `com/monsters/leaderboards/IoAttackLogs.as`,
  `com/monsters/admin/IoTestMode.as`.
- Tests changed with it: map-ui (pointer box, bookmarks, chat pin), outposts (rows, sorting, View/Map), alliance-board
  (pins typed and shown plainly; it now also closes a popup that turns up mid-test, such as the Wild Monster
  Invasion notice), admin-test-mode; depths-test has a check of the numbers (0, 0 / 399, 399 / Depths 0, 0 to
  9, 9 / "D4 x D5").

## Decorations

Buildable in the main yard and in outposts (overworld set). To remove one from the build menu, add its
id to `disabledDecorations` in `server/src/config/InfernoOnlyConfig.ts` and restart the server.
The ones marked *off* are in that list as shipped.
Entries marked *event only* are blocked in the overworld too: they only appear if a player has one in storage.

| # | Decoration | id | Note |
|---|---|---|---|
| 1 | American Flag | 28 |  |
| 2 | British Flag | 29 |  |
| 3 | Australian Flag | 30 |  |
| 4 | Brazilian Flag | 31 |  |
| 5 | European Flag | 32 |  |
| 6 | French Flag | 33 |  |
| 7 | Indonesian Flag | 34 |  |
| 8 | Italian Flag | 35 |  |
| 9 | Malaysian Flag | 36 |  |
| 10 | Dutch Flag | 37 |  |
| 11 | New Zealand Flag | 38 |  |
| 12 | Norwegian Flag | 39 |  |
| 13 | Polish Flag | 40 |  |
| 14 | Swedish Flag | 41 |  |
| 15 | Turkish Flag | 42 |  |
| 16 | Canadian Flag | 43 |  |
| 17 | Danish Flag | 44 |  |
| 18 | German Flag | 45 |  |
| 19 | Filipino Flag | 46 |  |
| 20 | Singaporean Flag | 47 |  |
| 21 | Austrian Flag | 48 |  |
| 22 | Pirate Flag | 49 |  |
| 23 | Peace Flag | 50 |  |
| 24 | Acorn | 55 | off (`disabledDecorations`) |
| 25 | Beehive | 56 | off (`disabledDecorations`) |
| 26 | Bird House | 57 | off (`disabledDecorations`) |
| 27 | Camping Tent | 58 | event only, off (`disabledDecorations`) |
| 28 | Childrens Jax | 59 | event only, off (`disabledDecorations`) |
| 29 | Red Gnome | 60 |  |
| 30 | Blue Gnome | 61 |  |
| 31 | Green Gnome | 62 |  |
| 32 | Hammock | 63 | off (`disabledDecorations`) |
| 33 | Lawn Chair | 64 | off (`disabledDecorations`) |
| 34 | Outhouse | 65 |  |
| 35 | Pinecone | 66 | off (`disabledDecorations`) |
| 36 | Rock | 67 | event only |
| 37 | Toy Raceway | 68 |  |
| 38 | Scarecrow | 69 | event only |
| 39 | Sun Dial | 70 | event only |
| 40 | Tiki Torch | 71 |  |
| 41 | Walnut | 72 | off (`disabledDecorations`) |
| 42 | Tombstone | 73 |  |
| 43 | Dead Pokey | 74 |  |
| 44 | Dead Octo-Ooze | 75 |  |
| 45 | Dead Bolt | 76 |  |
| 46 | Dead Bandito | 77 |  |
| 47 | Dead Brain | 78 |  |
| 48 | Dead Crabatron | 79 |  |
| 49 | Dead D.A.V.E. | 80 |  |
| 50 | Dead Eye-ra | 81 |  |
| 51 | Dead Fang | 82 |  |
| 52 | Dead Fink | 83 |  |
| 53 | Dead Ichi | 84 |  |
| 54 | Dead Project-X | 85 |  |
| 55 | Blackberry Bush | 86 | off (`disabledDecorations`) |
| 56 | Bonsai Tree | 87 | off (`disabledDecorations`) |
| 57 | Cactus | 88 | off (`disabledDecorations`) |
| 58 | Monster Fly Trap | 89 | off (`disabledDecorations`) |
| 59 | Thorns | 90 | off (`disabledDecorations`) |
| 60 | Pink Flowers | 91 | off (`disabledDecorations`) |
| 61 | Purple Flowers | 92 | off (`disabledDecorations`) |
| 62 | Red Flowers | 93 | off (`disabledDecorations`) |
| 63 | White Flowers | 94 | off (`disabledDecorations`) |
| 64 | Yellow Flowers | 95 | off (`disabledDecorations`) |
| 65 | Baseball Trophy | 96 |  |
| 66 | Football Trophy | 97 |  |
| 67 | Soccer Trophy | 98 |  |
| 68 | Statue of Liberty | 99 |  |
| 69 | Eiffel Tower | 100 |  |
| 70 | Big Ben | 101 |  |
| 71 | Swimming Pool | 102 | off (`disabledDecorations`) |
| 72 | Pond | 103 | off (`disabledDecorations`) |
| 73 | Zen Garden | 104 | off (`disabledDecorations`) |
| 74 | Fountain | 105 | off (`disabledDecorations`) |
| 75 | Tea Garden | 106 | off (`disabledDecorations`) |
| 76 | Monster Skull | 107 |  |
| 77 | Puzzle Cube (unsolved) | 108 |  |
| 78 | Puzzle Cube (solved) | 109 |  |
| 79 | D.A.V.E. Pumpkin | 110 | event only |
| 80 | Mini-Pumpkin | 111 | event only |
| 81 | Golden Big Gulp | 120 | event only |
| 82 | Victory Totem Pole | 121 | event only |
| 83 | Victory Totem Pole | 131 | event only |
| 84 | Golden D.A.V.E. Statue | 135 | event only |

## Client-side tables you may want to edit

- Tribe display names: `TRIBES.DEVIL_NAMES` in `client/scripts/com/monsters/ai/TRIBES.as`
  (Hellionnaire, Kozmodeus, Abaddonakki, Beelzenaut, Moloch). The server keeps sending the
  original names because they double as frame labels and asset names.
- Kit prices and building swaps: `client/scripts/com/monsters/kits/InfernoKits.as`
- Map colours: `client/scripts/com/monsters/maproom_advanced/InfernoMapTheme.as`
- Devil outpost build limits: `IO_OUTPOST_QUANTITY` in `GLOBAL.as` (4 of each harvester, 1 flinger, 1 yard planner, 2 hatcheries, 200 blocks, 40 traps, 4 sharpshooters, 4 blast towers, 4 quake, 4 magma, 1 compound, 1 hatchery control center, 1 monster juicer)
- Tribe building swaps (server): `server/src/game-data/tribes/devil/devilify.ts`; the kit copy is
  in `InfernoKits.as`. Keep the two in step. Agreed set: Housing -> Compound, Stone blocks -> Bone
  walls, Cannon -> buildable Inferno cannon (10 levels scaled to 7), Laser -> Quake, Tesla -> Magma,
  Aerial defense -> Magma, Heavy trap -> Booby trap, Railgun -> Quake. Kits drop the HCC and the
  Monster bunker. Fortification is stripped and levels are scaled/clamped to Inferno maximums.
  Art swaps are still to do.

## Verification status

Verified:
- Server passes `tsc --noEmit` (the untouched repo was clean too).
- Client compiles under Apache Royale's AS3 compiler with no new errors. One error exists in
  the untouched repo under this compiler (`CreepType.as`, an `id` getter conflict) and is
  unrelated. Deliberately broken code in the new files was caught, so they are being checked.
- `devilify` run against a real Abunakki template: swaps, level scaling and bunker monsters
  convert; the source template is not mutated.
- Tribe spawning, run from the real server code over two whole worlds: the same world gives an
  identical SHA-256 fingerprint from three separate processes visiting cells forward, reversed
  and shuffled; a different world gives a different one. Per-level shares 19.4-20.5% (24.6-25.4%
  for Kozmodeus), 106 strongholds split about evenly between 46 and 50 (at the earlier `perThousandSeats` of 24), about 10 microseconds per
  cell (a whole world in ~1.1 s). Coordinates round-tripped through base ids the way
  `tribeSaveV2` parses them: 4,640 cells, 0 mismatches between the map listing and the yard.
- The patch applies cleanly to a pristine checkout of the base commit.

- Server run for real in a sandbox (bun 1.4.2, Postgres 16, Redis, `ENV=local`, fresh database) and
  driven over HTTP the way the client does:
  - register + login two accounts; first base load gives the configured starting shiny (then 10-25k: 11,286 and 22,046), 60k
    starting resources, `storedata.BEW.q = 4` (5 workers), `stats.inferno = 0`, tutorial skipped,
    a home cell on a 400x400 MR2 world, and all `io_*` flags.
  - `getarea` lists devil tribes with only their ladder levels; both nearest Moloch strongholds
    (46 and 50) appear on the map exactly where `tribeForCell` says, and the yards that load for
    them and for three devil tribes match the listing (level, wmid, Inferno buildings only, no
    fortification, loot).
  - Attack range: with no flinger even the adjacent tribe is refused; after saving a yard with a
    level 1 flinger the adjacent tribe loads for attack and one 10 cells away is refused.
  - Full raid loop: attack save (destroyed, loot) credits the loot to the home yard, takeover for
    shiny creates an outpost, the outpost loads in build mode, the map cell flips to the player.
  - Refused with 403: every legacy inferno load mode, leaving MR2 (setmapversion 1 and 3), every
    `/alliance/*` route. Yard planner save + get round-trip works.
  - `verify-tribe-spawns.ts` under bun: same fingerprint forward and reversed on the live world.
  - `bun run db:init` first failed here because the MikroORM CLI started through `bun x` did not
    see `.env`. Fixed: `mikro-orm.config.ts` now fills missing variables from `.env` itself.
    Re-tested from a clean shell on an empty database, then the whole flow again on a fresh one.
  - Store: every Inferno store item the client can buy (resource top-ups, walls, overdrives) exists
    in the server's store table; the store's Inferno checks in the client are all presentational.

Not verified (needs the Flash client):
- Anything client-side at runtime: the SWF was never built with the real toolchain or opened.
- All visuals: map tile tints, the Moloch icon tint, the stone UI skin on MR2 popups.
- Monster data shape for Moloch strongholds when loaded through the MR2 attack path.

## Sound

- Music switched off came back each time the song started over: `SOUNDS.replayMusic` restarted it at the
  default volume instead of the music setting. Fixed (it passes `_musicVolume`, 0 while switched off).
- Sound effects stopping for good in the browser client: see `client-web/DEVIATIONS.md` (Sound). The button
  click sound is built into the game (`sound_click1`, `[Embed]`), the browser runtime never loaded it, and each
  click kept one of the 32 sound channels, until no sound effect could play. Fixed in the runtime.

## Shiny confirmation and touch

- **Confirm before spending shiny**: "Spend N Shiny ...? Yes / No" (`GLOBAL.ioConfirmShiny`). No runs
  nothing; Yes runs the same action again, approved, so every action keeps its own checks and effects.
  Covered: store purchases and speed-ups (`STORE.Buy`, `StreamlineBuy`), finishing a worker's job to start
  another (`POPUPS.DisplayWorker`), hatchery / HCC finish now, instant academy training, monster-lab
  power-ups and locker unlocks, the three "use shiny for the missing resources" (build, upgrade, fortify),
  healing with shiny (resource top-up, one monster, all monsters), building a kit outright or topping it
  up, moving an outpost, and accepting a move invite with shiny. Also: building something priced in
  shiny, instant build (asked before the building is placed), instant upgrade and instant fortify,
  champion evolve and feed, Monster Bunker transfer, siege lab / factory finish now and siege weapon
  top-ups, alliance speed-ups, and taking over a cell on the map. Tested: `client-web/tools/test/catapult-test.mjs`
  (instant upgrade asks; No spends nothing).
- **Pinch to zoom** (`IoPinchZoom`): two fingers apart zoom in, together zoom out, one step per pinch
  between the existing zoom levels (the yard's zoom button; in the map room its five zoom steps, towards the
  fingers, and pinching on keeps stepping). Needs touch
  events from the player (Flash / AIR on touch screens, or the browser client in `client-web/`, which
  delivers `TouchEvent`s in `TOUCH_POINT` mode; checked with `client-web/tools/test/pinch-zoom-test.mjs`
  under Android and iPhone emulation, not yet on real phones).

## Map cell data

Each `MapRoomCell` keeps its own copy of its outpost's monster and hatchery data (`Setup` copies the
server's `m`). Several cells are set up from the same map data (the tile on the map, `GLOBAL._currentCell`,
`MapRoom._monsterSource`); they used to share one plain copy while each kept its own protected copy, so
both counted it down, the copies stopped matching, `MapRoomCell.Check` failed ("num monsters producing")
and the outpost's update after an attack launched from it was not saved ("Dirty Cell ... does not check
out"). Bug reports #10 and #11.

## Known rough edges

- The flinger had to be unblocked in the Inferno (main yard and outposts): MR2 attack range
  is derived from flinger level on both client and server. It uses overworld art.
- Kit thumbnails still show overworld art.
- Converted tribe yards can have slightly overlapping footprints where the Inferno building
  is larger than the one it replaced.
- Yard planner: the building is unblocked and the planner reads the active prop table. The
  server side was reviewed and needs no change: templates are a JSON list on the player's main
  save (`savetemplate`), keyed by slot id, with no yard-type or building-id logic, and the main
  save *is* the inferno yard here. Not exercised at runtime.

- Hatcheries and the Hatchery Control Center only hatch in build mode: a yard being viewed or attacked does not refill its Compounds.
- Devil tribe yards carry no Monster Bunkers (the overworld layouts' bunkers are dropped in the conversion). Tribe yards already in the database keep theirs until the tribe yards are reset (RUNNING-INFERNO-ONLY.md).

## Admin panel

Put admin usernames in `admins` in `InfernoOnlyConfig.ts` and restart the server. The default is
`["admintester"]`. Names are **exact, capitals included**: "AdminTester" is not "admintester".
Those players get an **Admin** button next to the shiny counter on their own yards. It opens the panel in
the browser, signed in for 12 hours (a one-time code from the game becomes an HttpOnly session cookie).
Every action is checked on the server and written to the admin log (`admin_log` table).

**Admin names are reserved.** Nobody can register an admin name or rename to one from the game, in any
capitals, so a name in the config that isn't an account yet can't be claimed by a stranger (and a name an
admin renamed away from can't be picked up). To make your account an admin: register it under any name,
then on the server, in the server directory (with the server's database settings, as for migrations):

    bun run admin:claim <your account's username or user id> admintester

It renames the account (its yards and an alliance it leads too); the running server sees it at once. At
startup the log says which admin names are accounts, which are still waiting to be claimed, and which
accounts differ from an admin name only in capitals (those are not admins).

**Panel security (26 September).** Checked on every request: the session (a random 64-character token in
Redis, 12 hours), the account still an admin and not banned, and an `X-Admin` header only the panel's script
sends (with the SameSite=Strict cookie, no other site can make an admin's browser act). Sign-in codes are
one-time and last 2 minutes. The API runs its own tools only: `/admin/api/constructor` used to hand back the
signed-in admin's whole account record, password hash included. The page and the API are never cached or
framed, send no referrer and no type guessing, and the page has a content policy (nothing loaded from
anywhere, requests to this server only). Sign-in is limited to 20 a minute and the API to 300 a minute per IP.
Everything the panel shows is escaped; the invite list's cancel link no longer puts the invite id into script.
Tested: `client-web/tools/test/admin-security-test.mjs`.

| Tab | Tools |
|---|---|
| Status | players online, server version, published/required client build; maintenance mode (only admins can log in, others see your message); announcements (a popup each player sees once, optionally also posted in chat) |
| Players | search by name or id; account card (registered, last seen, world, home, alliance, shiny, outposts, streak, shiny lock, chat mute, refused attacks); ban with a reason the player sees / unban; change shiny or set resources (note required); set or reset the login streak; rename or delete saved kits; lift the shiny lock; mute / unmute in chat; move a main yard to free land in its world |
| Reports | refused attacks per player, with the latest entries; dismiss sets the count back to 0 |
| Invites | pending relocation invites; cancel |
| Map | inspect any cell (terrain, tribe and level, stored base, owner); reset one cell's stored tribe yard, or all of them; worlds with player counts and Moloch strongholds destroyed |
| Bugs | errors the game hit, reported automatically (below); mark fixed, reopen, delete |
| Log | every admin action, searchable |

**Automatic bug reports.** Every error the game logs, including every uncaught error, is sent quietly
to `POST /bugreport` with the game's state (mode, yard, Flash version, screen size, client build) and
its last 15 log lines. Players see nothing. The server groups identical problems by a fingerprint (the
error's first line and first stack frame, numbers taken out, Flash error codes kept) into `bug_report`,
counting times and players. A problem marked fixed that is reported again reopens. Limits per game
session: 3 reports per distinct error, 40 in all, one every 2 seconds; the endpoint is rate limited too.
HTTP 4xx replies (an expired login, a name already taken) are normal answers and are not reported, nor is the
"Load Error" line that follows them (it names the status); 5xx are, except 502/503/504 (a restart during a deploy).
Expected stops (a newer client published, logged out, away too long) are not reported either. The server drops
the same kinds of report from older clients, and leaves the site's address out of the fingerprint, so a bug seen
via inferno-mr2.maproom2.com and inferno.maproom2.com is one row (rows from before this change keep their old
fingerprint). Client: `com/monsters/debug/IoBugReport.as` (hooked into `LOGGER.Log`); server:
`services/admin/bugReports.ts`.

**What a report says (26 September).** Each report now starts with the **account** (name and id) and the
**client**: "Flash Player <version>", or "browser: <its User-Agent>" (the browser client's Flash version was
made up, so it said nothing). Then where the player was: mode, yard (kind, type number, owner), base id, map
cell, whether the map room is open, the popup on screen (class and title), the window size and how long the
game has been running. Then what led up to it:
- **Last clicks**: what the player pressed, e.g. `HOUSINGPOPUP > bAscend "Ascend Monsters"` (the named things
  around the click and the button's text).
- **Last popups, messages and yards**: popups shown, `GLOBAL.Message` texts, yards loaded.
- **Last requests**: path, status and time of the last server requests (`/base/save 200 250 ms x4`;
  "no answer" when none came).
- **Recent log**: the last 15 log lines, as before (the map room's "val of param1" line is gone).

A failed request is one line with everything in it: `HTTP 500 on /api/.../infernomonsters: <what the server
said> (143 ms)`, or `No answer from the server on /base/save after 30012 ms (connection dropped, or the server
was down)`. 4xx answers, 502/503/504 and an outdated client told to update (`/init`, versionMismatch) are
written to the log as ordinary lines, not errors, so they are not reported.

**A server failure is one report.** When the server answers 500 it records its own report (stack, the
request's fields and short values, the account and client) and sends a reference with the answer; the game's
report of the same failure carries it (`[ref 1a2b3c4d]`) and is added to the server's report under "In the
game:", instead of making a second row. The Bugs tab also shows the names of each problem's latest players
(click one to open the player) and when it was first seen.

**Stops that need a reload.** The Oops window's Reload button used to call the old Facebook page
(`reloadPage`), which neither the projector nor the browser has, so it did nothing. It now loads the game again
(`GAME.ioReload`, the same way as Switch account), still logged in: the login is handed to the next start once
(`ioResumeToken` in the local shared object). Stops that are expected show "Please reload" instead of "Oops,
something broke!" and are not bug reports (`ERRORMESSAGE.Show` `ioQuiet`):
- *Away too long* (`GLOBAL.TickFast`): no frame for over 5 minutes, nearly always a locked phone or another
  app (browsers freeze the page). The stop stays, because the yard may have changed on the server meanwhile.
- *Logged out* (`GLOBAL.ioSessionEnded`, from `URLLoaderApi`): during play the server answers 401 "Could not
  authenticate" (the account logged in elsewhere, the login expired, a ban). Reload opens the login page. Other
  401s (the Discord age check) are handled as before. It used to show "Base.Page: Could not authenticate", with a Reload button that did nothing.

**Idle popups and the other stops (26 September).** None of them is a dead end any more:
- *6 idle minutes* (`POPUPS.AFK`): "Having fun?", Invite Friends. Its button opens the same Invite Friends
  popup as the top bar's Invite button (`UI_TOP.ioShowInvite`: the invite link, Copy invite). It used to call
  Facebook's invite dialog, which isn't there. The Send FREE Gifts popup is never shown, even for an account
  with `sendgift` set; every gift or invite path (`POPUPS.Gift`, `Invite`, `DisplayGiftSelect`,
  `DisplayInviteSelect`) opens the invite popup instead. No link (referrals off): no idle popup.
- *10 idle minutes* (`POPUPS.Timeout`, "Anyone home?") and *Connection Lost* (`POPUPS.NoConnection`) stop the
  game. Their one button (Send FREE Gifts / Invite Friends To Play, or none at all) is now Reload, and their
  close button is gone (closing either one left a stopped game). The connection check runs every few seconds,
  so Connection Lost used to pile up one popup per failed check; now it shows once.
- *Errors with only the orange bar* (`ERROR_ORANGE_BOX_ONLY`: purchase and request errors, a login error,
  "We have updated the game") stopped the game with no button. They show in the Oops window with Reload.
- *A new version published* (`GLOBAL.ioCheckBuild`) said "Close this window and start the game again"; it now
  has Reload, which gets the new version (the launcher asks for the current build, the browser reloads the page).
- Every other `reloadPage` call (closing any popup once the game has stopped, `POPUPS.Next`) now reloads too
  (`GLOBAL.CallJS` sends it to `GAME.ioReload`, which runs once however often it is pressed). Loading another
  yard that fails no longer reloads without a word (`_reloadonerror`): the error shows, with Reload.
- The browser client: after a reload, one of the ~350 library bitmaps now and then never answered, and the page
  stayed blank. When none has finished for 20 s, the waiting ones are asked for again
  (`client-web/src/flash/display/library.ts`).

Switches (maintenance, announcement, mutes, sessions) are kept in Redis, so they survive a restart and the
chat process sees them. Resource and shiny changes reach an online player on their next yard load.
Server: `services/admin/`, `controllers/admin/adminApi.ts`; page: `services/admin/panel.html`.

The client also keeps the invite link and the streak when a reply leaves them out (`GLOBAL.SetFlags`),
so the Invite Friends button cannot turn into "invites are disabled" again.

Per-player flags (invite link, login streak, admin button, announcement) are now sent with every
`updatesaved` poll as well as at load (`services/user/playerFlags.ts`): the client replaces its flags with
each reply, so before this the referral link and the streak line disappeared a few seconds after loading.

## Login page

- Inferno look: a dark volcanic background, the form on the game's parchment popup frame, parchment
  input boxes, a gold Login button (deeper orange for Register), orange accents on the title and links.
- Saved accounts: every account that logs in on a computer is remembered there (up to 5, most recent
  first) and shown on the login form under "WHO'S PLAYING?" as a row of portrait tiles, where the monster
  picture otherwise is. Each tile has a round Inferno monster portrait (IC1-IC8, picked from the name, so
  an account always gets the same one), the name, and a small red x that forgets it. Clicking a tile fills
  in its email and moves to the password; the chosen tile is gold with an orange glow and its email shows
  under the row. Tiles narrow a little with 5 accounts to stay inside the frame. Only the email and the
  player name are kept (`com/auth/IoSavedAccounts.as`, local data `bymr_data` key `ioAccounts`), never a
  password. The picture shows again on the register form and when nothing is saved. Every login is
  remembered (typed password or saved token), by the email the server sends back.
- "Custom server: Inferno Maproom 2" under the title.
- **Switch account**: a round gold button left of the save / zoom / full screen / sound / music buttons,
  on the player's own yards (kept on top of the top bar). One click: "Switching account...", the yard is
  saved (a few seconds at most), the stored login token is forgotten and the game SWF is loaded again
  from scratch, opening on the login page and its account list (`GAME.ioSwitchAccount`). The reload is
  done by the launcher (an `io_restart` request on the game's LoaderInfo `sharedEvents`, answered by
  `client/launcher/IOLauncher.as`); else, loaded by any launcher, through the Loader it sits in
  (unloadAndStop, then the same file again); else, opened directly, it halts itself (`GLOBAL.Halt`: no
  ticks, no saves), goes silent, leaves the stage and a fresh copy of the same file is loaded in its
  place. Every reload uses a fresh application domain beside the old one, so no class or remembered state
  of the old session is reused. Failures are sent to the Bugs tab. The launcher in
  `server/public/client/launcher.swf` is rebuilt with this.

## Yard Planner

- Speed (it was slow on phones, worst when moving a selection): the yard behind the planner is no longer
  drawn while the planner is open (`MAP.render` skips it: `PLANNER.ioCoversYard`). The yard's renderer redraws
  the whole yard every frame, which made the browser draw the planner and every building in it again each
  frame. A group move only re-checks when the group moves a snap step, skips checking the selected buildings
  against each other (they move together), and skips far-apart buildings with a footprint distance check
  before the pixel test (`ioValidateInGroup`; same answers as before, tested). Measured with 220 walls, CPU
  slowed to a quarter: open planner 4 fps before, 23 after; dragging 60 walls 1.3 fps before, 11-17 after
  (one move step: about 200 ms before, under 1 ms after, at full speed). Not measured on real phones.
- Range circles: the Inferno prop table had no `attackType` (1 ground, 2 air, 3 both), and the planner
  only draws a range for buildings that have one, so only traps showed. Set in `GLOBAL.ioTuneProps` from
  the towers' own targeting: Sharpshooter 3, Quake 1, Blast 1, Magma 3, Compound 3.
- Layouts are kept per yard: the main yard's on the main save, each outpost's on that outpost's save
  (`controllers/yardplanner/plannerSave.ts`). They record building ids, which differ between yards, so
  before this a layout saved in an outpost overwrote the main yard's slot and loaded the wrong buildings.
- "Clear slot" works: the client always called `bm/yardplanner/deletetemplate`, which did not exist.
- Walls and booby traps have no planner icon (plain squares); that is how the original game drew them.
- The yard edge the planner enforces is the one it draws (the yard size really in use), not the stock
  expansion table.
- Toolbar across the top of the plan (`BasePlannerPopup.ioAddTools`, tiles: `components/IoToolTile`;
  tools in `PlannerDesignView` "Planner tools"). It replaces the old tool icons and the floating
  full-screen button. Icon tiles in the original style (white with a black outline, yellow on hover and
  while active; Move, Store and Expand are the original art, the rest drawn to match, built into the game
  as `io_pt_*`), each with a caption, in this order: Undo, Redo | Move, Store | Select, Clear | Walls |
  Flip L-R, Flip T-B, Rotate, and Expand yard at the right end. Full screen is the frame's own full-screen
  button, beside the close X. There is no status bar: hover a tile for its hint, and what an action did
  shows in the same tooltip for a few seconds. The zoom control sits under the toolbar.
  - **Undo / Redo**: every change to the plan (moves, store, walls, flips, rotate, clear) is a step, up to
    100 back (`ioHistory*`). A new change after undoing drops the redo steps. The buttons are dimmed when
    there is nothing to undo or redo. Loading another slot starts a new history.
  - **Store**: with a selection, asks "Confirm moving selected items to storage?" and stores just those
    (enemy buildings stay); with nothing selected it is the stock "store everything" tool.
  - **Select**: drag a box; the buildings in it glow. Click one of them to pick up the whole selection,
    click again to put it down (put back if any of them would not fit). **Clear** drops the selection.
  - **Walls**: drag across the yard, at any angle. No wall grid: only the start is snapped (5 units, like
    dragging a building); each next wall is one wall further along the line's main direction, so
    neighbours never overlap, diagonals included. Preview: green fits, red blocked, grey more than
    storage holds. Placing uses exactly the preview's test, and a wall already on the plan is never
    taken from storage again.
  - **Flip L-R / Flip T-B / Rotate**: only the selection when there is one, otherwise the whole layout.
  - Tested with `client-web/tools/test/planner-tools-test.mjs` (flip on a selection, store confirm, undo,
    redo, redo dropped by a new change).
- The window is placed by its frame (not by the corner art around it) and is a little shorter than the
  screen, so the close X and the frame's top corners are fully on screen.

## Korath and Drull as monsters

The champions Korath (IC9) and Drull (IC10) are ordinary Inferno monsters here: unlocked in the Strongbox,
hatched with magma, housed in the Compound and flung like the rest. There is no champion cage.

| Level | Korath health / damage / speed / reach | Drull health / damage / speed / reach | Magma | Housing |
|---|---|---|---|---|
| 1 | 32,000 / 2,000 / 1.4 / 35 | 22,000 / 3,000 / 2.0 / 35 | 2.2M | 600 |
| 2 | 38,400 / 2,400 / 1.6 / 45 | 28,000 / 3,600 / 2.2 / 45 | 2.6M | 600 |
| 3 | 44,800 / 3,000 / 1.8 / 55 | 34,000 / 4,200 / 2.5 / 55 | 3.05M | 600 |
| 4 | 51,200 / 3,800 / 2.0 / 60 | 40,000 / 5,500 / 2.8 / 65 | 3.6M | 600 |
| 5 | 57,600 / 5,000 / 2.3 / 65 | 46,000 / 6,500 / 3.2 / 85 | 4.3M | 600 |
| 6 | 64,000 / 6,500 / 2.5 / 65 | 52,000 / 8,000 / 3.6 / 90 | 5.2M | 600 |

The magma to hatch them is Ashkarr's since 28 September (it was 2M, 4M, 7M, 10M, 14M, 20M); healing is 30%
of it (660K to 1.56M; it was 0.6M to 6M). Their health was brought closer to hers the same day, in even
steps (Korath was 28,000, 62,000, 96,000, 120,000, 144,000, 175,000; Drull 12,000, 20,000, 36,000, 42,000,
52,000, 60,000); damage, speed and reach are the champions' still.

- Strongbox (Monster Locker): Rezghul is on page 4 after King Wormzer (Strongbox level 4), unlocked for 1.5
  times King Wormzer's unlock cost and time: 7,372,800 magma and 4.5 days (King Wormzer: 4,915,200 and 3
  days). Korath and Drull are on a new page 5, which needs Strongbox level 5, for 2.5 times: 12,288,000
  magma and 7.5 days each. Times are before `buildTimeDivisor` (4: 1 day 3 h and 1 day 21 h). None of the
  three is unlocked from the start any more, and nobody keeps an unlock from before (see "Korath, Drull
  and Rezghul locked for everyone" below).
- Strongbox level 5 (`INFERNOYARDPROPS`, id 8): 1,843,200 bone, 2,355,200 coal, 3 days (before
  `buildTimeDivisor`), needs Under Hall 5, 128,000 health. That is the same step as from level 3 to 4:
  four times the cost (level 4: 460,800 bone, 588,800 coal) and twice the time (level 4: 1.5 days).
- Damage, speed and reach are the champions' per level. They are drawn with the champion's bigger art
  (`IoChampionCreep.ART_LEVEL`, since 28 September): levels 1-2 with the champion's level 4 art, 3-4 with
  level 5, 5-6 with level 6 (with that art's offsets). Korath's hits still come every 72 steps at levels
  1-2 (80 from 3), so at 1-2 his 10-frame attack swing no longer lines up exactly with his hits. Academy training costs are Rezghul's (16M-28M sulfur).
- Korath's abilities: every hit on a monster burns it (10% of his damage over time); from level 4 he
  throws a magma fireball (a quarter of his damage, and a burn) at a flying enemy near him; from level 5
  every third attack is a stomp that damages everything around him.
- The Infernal Academy has a 5th level (1.6M bone, 1.6M coal, 2 days before `buildTimeDivisor`). It trains
  Korath, Drull and Rezghul to level 6; the other Inferno monsters still stop at 5
  (`CREATURELOCKER.ioReachesLevel6`). The academy now pages through Korath, Drull and Rezghul as well.
- The client table (`CREATURELOCKER.ioAddChampionMonsters`) and the server table
  (`game-data/stats/monsterStats.ts`) must stay identical: attacks are checked against the server's.

## Relocation invites

From the map, on one of your outposts, "Invite Friends to Move" lists your alliance members (without an
alliance you are told to create or join one). The invite arrives as mail with Accept / Decline / View.
Accepting costs the main-yard move price (`prices.moveMainYard`, 150 shiny) or 30M of each resource, moves
the invitee's main yard onto the outpost and takes the outpost out of the inviter's empire. Within the same
world the invitee keeps all their outposts. From another world they give up their old outposts: before the
price popup the client asks the server (`base/migratecheck`), and for a cross-world move it warns how many
outposts will be lost and asks them to confirm first. Both must be in the same alliance when it is sent and when
it is accepted; one pending invite per outpost; the inviter can revoke it from the map or the mailbox.
Server: `services/maproom/v2/relocateInvites.ts`.

## Player kits

Page 3 of the kit popup holds three kit slots of the player's own, seen by nobody else. "Save this outpost
here" asks for a name (up to 24 characters, plain text; blank means "My Kit N"), then first saves the outpost, waits for that save to reach the server, then copies the layout from the
server: every building an outpost can build (harvesters, flinger, juicer, yard planner, hatcheries, HCC,
bone blocks, sharpshooters, booby traps, compound, quake/blast/magma towers), at its current level.
Decorations are not saved. The list is `OUTPOST_BUILDINGS` in `playerKits.ts` and must match
`IO_OUTPOST_QUANTITY` in `GLOBAL.as`.
Price: every building's build and upgrade costs up to its level, times 2.5; the largest of the bone, coal
and sulfur totals is both the bone and the coal price, and sulfur is half of it. Player kits are resources
only: no shiny buy-out, and no shiny to make up a shortfall. Saving draws the kit's thumbnail and preview
with the same renderer as the server's kits (`services/kits/kitPreview.ts`, shared with
`scripts/export-kits.ts`) into `public/assets/kits/player/` under a random name; replacing a kit deletes
its old pictures. Server: `services/maproom/v2/playerKits.ts`.

## Defender health between attacks

Map Room 2 only stored how many defenders a yard had, so every survivor was back at full health for the
next attack (and Monster Bunker defenders that died came back as well). Now:

- While a yard is under attack it is saved with the health of each surviving Compound monster
  (`monsters.housed` becomes a list per monster, the format Map Room 3 already used) and each Monster
  Bunker keeps its losses and its wounded (`m` only ever goes down, `mh` lists the wounded).
- The next attacker meets them as they were left. The wounded leave a bunker first.
- When the owner loads their own yard (main yard or outpost) the survivors are healed: the server turns
  the records back into plain counts. Tribe yards have no owner, so their defenders stay as they are
  until the tribe yards are reset (RUNNING-INFERNO-ONLY.md).
- The world map always gets plain counts, whatever is stored.

## Chat: Global and Alliance

- The chat dock has two tabs in its title bar, **Global** and **Alliance** (`ChatBox.ioSetTabs`, transcripts
  and counts in `BYMChat`, "Inferno-only: Global / Alliance tabs"). Alliance is the same channel as the
  Alliances window's chat (`chat:alliance:<id>`, joined as "alliance" on login). Enter sends to the tab
  that is showing.
- New messages on the tab that is not showing, or on either while the chat is closed, are counted on the
  tab: "Alliance (2)". Opening the chat or the tab clears its count. The history a channel sends when it is
  joined is not counted, nor are your own lines.
- Click a player's name in the chat to write them an in-game message (the mail window, addressed to them).
- Flood limit (`server/src/chat/chatRooms.ts`): one line every half second on average, with bursts of up
  to 3 lines at once. It was a flat half second between lines, which refused lines typed a second apart when
  the browser's HTTP chat link delivered them together (it carries every line typed since its last request
  in one go).
- Tested: `client-web/tools/test/alliance-chat-test.mjs` (two accounts in one alliance).

## Alliances

- Browse -> Actions has a **Members** button: that alliance's members with level and leader / online
  (`IoAllianceMembersPopup`; server `GET|POST /alliance/alliancemembers`, `alliance_id`). Only what the
  Browse table already shows is sent.
- Power-ups (Declare War, Conquest, Armament): the recharge between uses is 4 days on inferno-only servers
  (`config/AllianceConfig.ts`; stock 7 / 5 / 7). A power-up already recharging for longer is cut to 4 days
  from now when the alliance's power-ups are next read.

## Map Room 2

- Cells no longer flash green for a moment when the map first opens: a new cell is tinted as "not loaded
  yet" in the same frame it is created (`MapRoomPopup`, `InfernoMapTheme.applyUnloaded`), instead of
  showing its first (overworld grass) frame until its data arrives.
- Bookmarks are kept when the main yard moves within the same map: moving to one of your outposts, accepting
  a move invite in the same world, and "relocate anywhere" after losing the empire when it lands in the same
  world (server `migrateBase`). They are still cleared when the move is to another world.

### The map room window

The map window was laid out again (`MapRoomPopup`; the pieces are `IoMapZoomControl`, `IoMapFiltersPopup`,
`IoMapSidebar`, `IoMapMinimap`, `IoMapShare`, `IoMapUi`, `IoScrollPane`, `IoMapFilters`). Not when only
viewing an invitation's place, which keeps the old window apart from the zoom buttons.

- **Zoom**: the yard's round - and + buttons (`buttonZoom_CLIP`) on the window's top edge, just left of the
  full screen button. Five steps: **World**, **World 2x**, **World 4x**, **Far** (the zoomed-out map) and
  **Close** (the map as it always was); a button is dimmed at its end. The buttons, the **mouse wheel** over
  the map and a **pinch** move one step; the wheel and a pinch zoom towards the pointer / fingers (the place
  under it stays put). The three World steps are the world map, **dragged** to move around, as far as its
  edges in the middle of the view. The map opens on the step it was left on.
- **Filters**: a round button left of the - button opens them (a red dot on it when yards are hidden). They
  change the world map: whose yards show (you, your alliance, friendly, hostile, other alliances, no
  alliance), main yards and / or outposts, and whether your **flinger range** (every cell your yards'
  flingers reach, with Declare War, as the map highlights it) and your **bookmarks** (pins; named from World
  2x) are drawn. "Show everyone" puts the yards back. Filters last for the session.
- **Layout**: a panel as big as the sidebar sits right of the map, as far from it. In the normal window
  everything moves left by half of that, so the window keeps its middle; on a screen too narrow for it
  (under about 1,000 pixels) the window is made smaller to fit. Full screen, the window takes the whole width
  of the screen (it used to stop at 1,024): the panels at the edges, the map as wide as the rest, the cell
  grid centred in it.
- **Sidebar** (left), under the resources (packed a little closer): **Home** and **Jump** side by side in the
  middle, **Relocate** under them (see "Relocate"), then:
  - **Find a player**: type part of a name; every player with a yard on the world who matches (names that
    start with it first): a dot in the colour of how you stand with them, name (level), alliance, main yard
    and number of outposts. **Go** (or Enter) goes to the main yard; clicking a player lists their outposts,
    each with Go. From the world snapshot: nothing is asked of the server.
  - **Bookmarks**: **no limit** (the old limit was 8), in a list that scrolls (wheel, bar, or drag it). Home
    first. Each is two lines: the name, then where it is with rename and remove on the right. Click one to go
    there; rename is in place (Enter keeps it), remove asks first. They are added as before, from a yard's
    popup (Bookmark), and now also from an empty place (below). Stored as before (`player/savebookmarks`,
    the game's `mbms` / `mbm0` / `mbmn0` form); the server now refuses anything else, or more than 256 KB
    (about 6,000 bookmarks). Changes are saved one after the other, so a quick run of them cannot arrive out
    of order.
  - **Alliance**: your alliance's members on this world (you first, then the leader, then by level): name
    (level), where their main yard is, and Go.
- **Right panel**: the **minimap** at the top (the world, your yards, and a box round what the map shows,
  wrapping round the world's edges and corners like the map; click or drag in it to move there), and under it
  the **cell information**: a picture as wide as the panel (the alliance's badge in its corner), the owner
  with their level ("Name (41)") and under it what the place is (Main Yard, Outpost, Wild Monsters, Lava) and
  the user ID; the alliance and under it how you stand with it; status; location; and a truce or "being
  played or attacked" when there is one. On the world map it shows the yard under the pointer, from the
  snapshot.
- **Coordinates** in the map's bottom left corner: the cell under the pointer ("-200, -200"), only while the
  pointer is over the map.
- **Sharing a place in chat**: clicking an empty place (lava) shows a bubble with **Share in chat** and
  **Bookmark** (the usual bookmark popup, named after the place); a yard's popup gets a **Share this place in
  chat** button under it. Share asks Global or Alliance, then posts `[map:x,y:world]` after whatever is typed
  in the chat box, switches the chat to that tab and says "Posted to ... chat". In the chat the token shows as
  a pin and the coordinates in a pill; clicking it opens the map there (or moves the open map there, the
  place marked). The world tag keeps a place shared on another world from being opened ("shared on another
  world"). Not during an attack.

Tested: `client-web/tools/test/map-ui-test.mjs` (42 checks: layout, the cell information on the map and the
world map, every zoom step by wheel and button and pinch, dragging to the edges, minimap, filters, range,
bookmarks past eight with rename / remove and what the server stores and refuses, search, alliance tab,
sharing to chat and back).

### The whole world at once, and the world map

The map room used to know a cell only once `getarea` had answered for its 10 x 10 zone, so it opened on dark
placeholder tiles that filled in zone by zone. Now:

- **One world snapshot** (server `services/maproom/v2/bulk/worldSnapshot.ts`): every player main yard and
  outpost with its owner, **level**, alliance, damage, protection and "locked" (owner playing or under attack);
  every damaged or destroyed wild monster yard; and the world's alliances with members and relationships. It
  combines what the two API snapshots had (occupancy and alliances), adds levels, and is rebuilt at most
  **once a minute** per world (a few queries, however many players look).
- The game gets it from **`POST /worldmapv2/mapdata`** when the map opens and every minute while it is open.
  The first time for a world it also asks for the world's **fixed layers** (`layers=1`): terrain height and
  the tribe and level of every cell, one character per cell (about 200 KB compressed, once per session; built
  once per world per server start, in the background 15 seconds after startup). With those the game has every
  cell of the world at once (`IoMapSnapshot.CellAt`), in the same shape getarea sends.
- **getarea** still runs, only for the zones on screen (and just off it), now every minute instead of every
  30 seconds: it adds what is per player (truces, your yards' monsters and resources, relocation invites) and
  whatever changed since the snapshot. Its data wins over the snapshot's for its zone. Clicking a yard the map
  only knows from the snapshot waits a moment for its zone (the popups need its monsters); an attack waits
  for your own yards in range the same way.
- **getarea is asked for several zones at once** (`zones=x,y;x,y;...`, up to 16; the reply is
  `areas: [{ x, y, data }, ...]`; without `zones` it is the stock single-zone reply). The game used to send
  one zone per request and wait for each answer before sending the next, so the map filled in one round trip
  per zone (nine or more on opening). Now the zones it wants in the same moment go in one request (up to 12),
  and the server reads them with one query each for the cells, their owners, last-seen times, truces,
  alliances and relocation invites. Replies over 1.5 KB are gzipped for clients that accept it (a zone is
  about 11 KB of JSON, 1.5 KB gzipped). Locally: nine zones in 45 ms instead of 200 ms, before any network
  time; with a real round trip of 100 ms, about 0.15 s instead of 1.1 s.
- A getarea that failed (the connection dropped) used to leave the game's request queue stuck at it: the map
  asked for nothing more until it was closed. Now the failed zones leave the queue and are asked for again on
  the map's next pass.
- **World map** (the three widest zoom steps, see "The map room window" above): the whole
  400 x 400 world in the map window, in low detail: the terrain as a picture, main yards as big dots and
  outposts as small ones, in the name-bar colours (you, your alliance, friendly, hostile, other alliances, no
  alliance). No wild monster yards. Hovering a dot names the player, their level and alliance; clicking goes
  back to the map there (Home, Jump, search and bookmarks too). It asks the server for nothing. The map
  remembers the zoom step it was on when it opens again.
- API consumers: `/worldmapv2/snapshot` is this same snapshot (now also `alliances`, a player's `alliance` and
  `level`, and per cell `level`, `locked` and the stored terrain height; one minute instead of five).
  `/worldmapv2/alliances` still lists every world's alliances at once.

Tested: `client-web/tools/test/map-snapshot-test.mjs` (getarea slowed down to 3 seconds: the map is drawn
from the snapshot at once, and says exactly what getarea says about all 224 cells on screen; the zones on
screen are asked for in one request; a getarea that fails is asked for again).

## Catapult ammunition

- Candy Jars (26 September): by time, not health. Every tower in range is jarred for 15 / 25 / 40 / 55 s
  (Small / Medium / Large / Huge); what the tower shoots at the glass does nothing. The glass cracks at half
  the time left and again at a quarter (the jar sprite's crack frames, with the cracking sound), shakes in
  the last two seconds, then breaks (`BTOWER.ioTickTimedJar`). Medium costs 500k bone + 500k coal. A server
  that still sends only `durability` gets the old jars (until the tower shoots its way out).
- Sulfur Bomb: no longer Putty Rage. `IoSulfurShield` (monster component): speed for the whole time (move
  and attack), invulnerable for the first `invuln` seconds, then `armor`% of the damage removed, falling
  evenly to 0 by the end. Small / Medium / Large / Huge (26 September): invulnerable 0 / 4 / 8 / 12 s, then
  40 / 55 / 70 / 85% fading to 0; 15 / 25 / 40 / 55 s in all. Glow: red while invulnerable, orange from 99%
  to 45%, yellow from 44% to 1%. Costs 100k / 500k / 5M / 10M sulfur. The speed boost is unchanged
  (x1.2 / 1.4 / 1.8 / 2).
- Fixed (26 September): a monster on its last hit points under the Sulfur Bomb could not be killed by a
  Quake tower until the armour had faded below half. Health is kept in whole points (`SecNum` rounds), the
  Quake tower never hits for more than the health left, and the armour shrank that hit below half a point,
  which was rounded away: a Zagnoid on 1 point stayed on 1. Now the parts of a point are added up and
  taken off once they make a whole one (`MonsterBase.modifyHealth`, `_ioHurtCarry`), for every kind of hit.
- The first row's title showed "Marilyn": the title box was sized for "Twigs" and wrapped. The titles are now
  one line, widened to the left when needed (`CATAPULTPOPUP.ioFitTitle`).
- Tested: `client-web/tools/test/catapult-test.mjs` (numbers from the server, the shield's phases and glow on a
  monster with short times, the title) and `sulfur-jars-test.mjs` (a Zagnoid on 3 points under 70% armour
  killed by a Quake tower, small hits adding up, the new shield numbers from the bomb itself, a 3-second jar
  holding under fire, cracking, shaking and breaking).

## Admin panel: players

The Players tab lists every player as soon as it opens (sorted by user id, `players` action, up to 20,000),
with a filter box that narrows the list as you type (name or id), instead of searching.

## Spawn position

New players (and "relocate anywhere") are placed by `services/maproom/v2/findFreeCell.ts` with the `spawn`
rules (config table above). With the default numbers the rules can be hard to meet: about 11% of a world's
land is more than 15 cells from every Moloch stronghold, so in a simulation on a filled test world 62 of
300 new players found no cell meeting all rules in 100 tries and fell back to any free land. Lowering
`awayFromMoloch` to 12 or 10 makes room (23% / 36% of the land).

## Tribe art

New art for the five Map Room 2 tribes (Hellionnaire, Kozmodeus, Abaddonakki, Beelzenaut, Moloch), all
files on the server, so changing a picture needs no client rebuild:

| Where | File (`server/public/assets/`) | Size |
|---|---|---|
| Map cell icon | `monsters/tribe_<tribe>_30.jpg` | 60 x 60, drawn at 30 x 30 |
| Map popups (info, attack) | `monsters/tribe_<tribe>_50.v2.jpg`; Moloch `tribe_moloch_50.jpg` | 50 x 50 |
| Top bar while viewing / attacking the yard | `monsters/tribe_<tribe>_50.jpg`; Moloch `tribe_moloch_50.jpg` | 50 x 50 |
| Tribe attack warning ("Wild Monster Alert") and the defence result when a tribe attacks your yard | `popups/tribe_<tribe>.v2.png`; Moloch `popups/tribe_moloch.png` (was missing) | about 130 x 150, transparent |

`<tribe>` is legionnaire, kozu, abunakki, dreadnaut or moloch (the original names). The map icon used to be
built into the SWF (four portraits, none for Moloch); in the Inferno each tribe's icon is now loaded from
the server and laid over it (`InfernoMapTheme.tribeIcon`, called from `MapRoomCell`). The square pictures
sit on an orange glow with a dark rim and a hint of the tribe's colour right behind the figure (Kozmodeus
#c266ea, Abaddonakki #e6b800, Beelzenaut #2fb59a, Hellionnaire #a8a8a8), and a glow in the same colour around the figure's outline, so the dark figures read at small
sizes; the big pictures are cut out. Moloch's small pictures are his whole big figure (wings and scythe
included), scaled down onto a plain red background with a pink glow around him. (Winning or losing against a tribe yard on Map Room 2 shows a text message, not a picture.) The Beelzenaut's small pictures are scaled from his victory picture.

Replaced pictures and caches: browsers and any CDN keep a picture for an hour or more under its URL, so a
picture replaced under the same name kept showing the old one (the new map icons, being new files, showed
at once). The game now adds `?v=<assetVersion>` (config `assetVersion`, flag `io_assetv`) to every picture it
loads from the server (`GLOBAL.ioVersioned`, used by `ImageCache` and the yard owner's picture in the top
bar). After replacing pictures, raise `assetVersion` and restart the server.

## Wild tribe attacks

Before: Moloch only (the original Inferno planner), every 3 days by default (2 or 4 with the old attack
setting, which nothing in the game opens any more), only after 4 logins since the last one, from yard level 9,
and sized from the number of buildings in the yard, with the player's own academy levels and 40-90% health.
Each yard kept its own count, so outposts were attacked on top of the main yard.

Now (config `wildAttacks`, flag `io_wildattacks`; client `WMATTACK` "Inferno-only wild tribe attacks",
`PROCESS_INFERNO1.ioUsePlan`):
- At most one every `minHours` (23) per player: the server sends the latest start on any of the player's yards
  (`io_wildlast`, `services/user/wildAttacks.ts`), and an attack planned on one yard is dropped if another yard
  was attacked meanwhile. The first check is a minute after a yard opens; the game runs attacks, so they only
  happen while the player is on.
- Main yard only: outposts are never attacked, and an attack waiting in an outpost's save from before is dropped.
- Nothing in the first minute after logging in (or a reload): no planning, no warning and no attack, not even
  one planned in an earlier session and already due (`WMATTACK.ioSettled`).
- From yard level `minLevel` (3).
- The tribe: Moloch with `molochChance` (5%), otherwise Hellionnaire, Kozmodeus, Abaddonakki or Beelzenaut
  evenly. The warning shows that tribe's name and picture, and the monsters come in its formation.
- The monsters: the tribe's list for the player's level band, at the listed level and full health. The planner
  still chooses the side they come from and what they aim at.
- Fixed on the way: a swarm formation (groups of three) sent a full group and then the remainder again, so 8
  Spurtz came as 11.
- The warning ("Wild Monster Alert") has three places for monsters, but Moloch brings four or five kinds from
  level 11 (and others from level 21): the warning stopped with "Raid planning failed ... reading 'Setup'"
  (bug reports). The strongest three kinds are shown (health of one at the attack's level); the third reads
  "x8 +2 more" and its note ends "Also coming: 10 Grokus, 6 Sabnox" (`AIATTACKPOPUP.onAdd`).
- Tested: `client-web/tools/test/wild-attack-test.mjs`.

| Tribe | 1-10 | 11-20 | 21-30 | 31-40 | 41+ |
|---|---|---|---|---|---|
| Hellionnaire | L1: 6 Zagnoid, 4 Spurtz | L2: 12 Zagnoid, 4 Valgos, 6 Spurtz | L3: 16 Zagnoid, 4 Grokus, 3 Sabnox, 4 Valgos | L4: 20 Zagnoid, 10 Grokus, 5 Sabnox, 6 Valgos | L5: 24 Zagnoid, 14 Grokus, 8 Sabnox, 2 King Wormzer |
| Kozmodeus | L1: 8 Spurtz, 4 Malphus | L2: 16 Spurtz, 8 Malphus, 4 Zagnoid | L3: 30 Spurtz, 14 Malphus, 8 Zagnoid | L4: 45 Spurtz, 20 Malphus, 12 Zagnoid, 4 Balthazar | L5: 60 Spurtz, 30 Malphus, 16 Zagnoid, 8 Balthazar |
| Abaddonakki | L1: 6 Malphus, 4 Spurtz | L2: 10 Malphus, 5 Valgos, 6 Spurtz | L3: 8 Balthazar, 8 Valgos, 12 Malphus | L4: 14 Balthazar, 12 Valgos, 16 Malphus, 2 Sabnox | L5: 20 Balthazar, 16 Valgos, 20 Malphus, 4 Sabnox |
| Beelzenaut | L1: 4 Zagnoid, 3 Valgos | L2: 3 Grokus, 5 Valgos, 6 Zagnoid | L3: 6 Grokus, 3 Sabnox, 2 King Wormzer, 6 Zagnoid | L4: 5 King Wormzer, 10 Grokus, 4 Sabnox | L5: 8 King Wormzer, 12 Grokus, 6 Sabnox, 1 Rezghul |
| Moloch | L2: 8 Spurtz, 6 Zagnoid, 3 Valgos | L3: 2 King Wormzer, 4 Grokus, 10 Zagnoid, 10 Spurtz | L4: 1 Rezghul, 4 King Wormzer, 8 Grokus, 4 Sabnox | L5: 1 Drull, 2 Rezghul, 6 King Wormzer, 10 Grokus, 6 Sabnox | L6: 1 Korath, 1 Drull, 3 Rezghul, 8 King Wormzer, 12 Grokus |

## Outposts list

The top bar's outpost arrow (next to "Outposts") on Map Room 2 now opens a list of your outposts instead of
jumping straight to the next one (client `IoOutpostsPopup`, server `POST worldmapv2/myoutposts`,
`controllers/maproom/v2/myOutposts.ts`). "Next outpost ▶" in the list does what the arrow did before.

| Column | What it shows |
|---|---|
| X, Y | map position (shown the map's way, `-156 -275`) |
| Value | the outpost's empire value: `850`, `1.4k`, `10k`, `1.3m`, `10m`, `2.1b` (rounded down) |
| Bone/h, Coal/h, Sulfur/h, Magma/h | what the outpost adds to your main yard per hour: the auto-bank amounts the game recorded the last time that outpost was open (every 10 seconds, so x 360). `?` if it has not been opened since you took it |
| Protected | damage protection left (`2d 5h`, `4h 54m`, `34m`) or `No` |
| Monsters | monsters housed there |
| View / Map | View opens that outpost (the row of the one you are in says `Here`); Map opens the world map on it |

Click any column title to sort by it; click it again to reverse. Numbers sort largest first, X and Y smallest
first. The last sort is kept while the game is open. A totals line sums value, production and monsters.
Scroll with the mouse wheel (three rows a step) or the bar on the right (drag the handle, or click above or
below it for a page). Opened inside an outpost, the list starts scrolled to that outpost's row.

Large empires: only the rows in view exist (about a dozen, reused as you scroll), and the server reads the
list with two plain queries, adding up the housed monsters in the database. Measured with 1,500 outposts on
one account: the server answers in about 25 ms (it was about 100 ms of work that held up the server) and
about 40 lists a second (was about 10); the list opens in about 0.35 s and sorts in about 0.25 s, the same as
with 3 outposts (drawing every row took about 2 s to open, 1.5 s to sort, and made the game stutter while open).
The answer is about 190 KB for 1,500 outposts (about 125 bytes each); the server does not compress it, so a
compressing proxy in front (as most hosts have) makes it much smaller.
Tested: `client-web/tools/test/outposts-test.mjs` (with 3 and with 1,500 outposts).

## Bug reports, 25 September

Fixes for problems the automatic bug reports sent in (admin panel, Bugs tab):

| Report | Cause | Fix |
|---|---|---|
| Raid planning failed: ... reading 'Setup' | see Wild tribe attacks: more than three kinds of monster in the warning | strongest three shown, "+N more" |
| UncaughtError ... reading 'range' (`HOUSINGBUNKER.FindTargets`) | a Compound bunker still being built (level 0) near attacking monsters looked up the stats of level -1: the check was "level 0 and destroyed" instead of "or" (the Monster Bunker had it right) | no targets at level 0 or when destroyed; the level is also kept within the stats table |
| URLLoaderApi HTTP status 500 (no player, before login) | login with an email the game's form accepts but the server does not (`john..doe@x.com`, `john.@x.com`), or a password shorter than the rules for new ones, failed the server's input check: 500 "Something went wrong" | login answers "Your login credentials are incorrect" (409); register and change name answer what is wrong (400, e.g. "Password must be at least 8 characters long") (`schemas/parseInput.ts`) |
| Negative twigs reset: -1450 | the game's own safety net: bone went below zero and it put it back to 0. The game gets its amounts from the server after every save, so the likely source is spending sent by the game landing after the amount went down on the server meanwhile (a second tab or device, a raid) | the server never keeps a negative amount (it keeps 0 and logs "rN would be ..., kept at 0"); the game's line now ends with what the server last sent, e.g. "(server last sent save 1132189/1077297/844344/312822 at 1790344056, now 1790344064)", so a next report shows whether the server sent it |

Also: every "URLLoaderApi HTTP status" line now ends with the request's path (`URLLoaderApi.ioPath`); before,
a 500 report did not say which request failed. Tested: `client-web/tools/test/bug-reports-test.mjs`.

## Bug reports and review, 25 September (second round)

| Report | Cause | Fix |
|---|---|---|
| #27 URLLoaderApi HTTP status 500 `/base/save` (mode wmattack) | a wild monster yard not attacked for 12 hours is rebuilt fresh when someone looks at it (`baseModeView`), and "looking" includes the attacker's own half-minute poll during the attack (`updatesaved` type attack). A yard stored from a tribe template kept the template's old savetime, and loading an attack didn't move it, so the yard being attacked was deleted and rebuilt under the attacker; the attack's next save found no yard: 500 "We encountered an error while saving". Reproduced against the old server | loading an attack moves the yard's savetime to the attack (and rebuilds it first if it is due), new tribe yards start at now (`tribeSaveV2`), and `expireWildSave` is shared by view and attack. A save for a yard that is really gone (the admin reset tool, test mode's Make wild) answers 409 "This yard has been reset since the attack started" instead of 500; the admin reset and Make wild leave a yard alone while someone is attacking it |
| #26 `onLogin() false: 'null'` (chat) | the line read a field the chat server doesn't send; the reason (`invalid_token`, `user_not_found`, `no_chat_token`: a login no longer accepted) was lost | the line gives the reason; those three are expected answers and no longer reported (`BYMChat.onLogin`) |

Found by a review of the server and game code and fixed:

- **Server failures reach the Bugs tab.** Every 500 is recorded as "Server 500 on POST /path: message", with
  the server's stack and the request's field names in its details (`middleware/clientSafeError.ts`). The
  stack is no longer sent to the game (only when `ENV=local`).
- **Out of range** (`validateRange`): was a 500 after the attack had been recorded (the attacker's own
  protection gone); now checked first, 403 "This yard is out of range of your Flingers". The outpost lookup
  used `x`+`y` as one key without a separator (1,23 = 12,3).
- **Saves that failed on odd input** now leave that field out instead of failing with 500: a map cell update
  without a yard id (`monsterupdate`, sent for real since the MapRoomCell fix), a field that isn't JSON
  (the browser build sends a missing value as the text "undefined"), a fraction for damage / destroyed /
  locked / protected / over, an empty building entry.
- **Security.** Admins are the exact accounts named in the config: before, anyone registering "austin" for an
  admin "Austin" became an admin. (Since 26 September the names are exact only and reserved: see Admin panel.) New names
  that differ from an existing one only in capitals are refused (register and rename). A player's yard is
  written by an attack save only from the player whose attack it is (the last attack loaded, within 30
  minutes; also Inferno yards): before, anyone could write to any yard left with an attack id. Spending
  shiny never goes below 0 (a takeover or move with too little shiny said "Something went wrong").
- **Admin test mode.** On/off is the snapshot row in the database (Redis only mirrors it for the
  leaderboards). Two switch-offs at once (a login and the switch) restore once (the row is locked; before,
  the second deleted every outpost), two switch-ons keep the real values. An outpost another player took
  meanwhile stays theirs. A save on its way when test mode ends is refused. While test mode is on, other
  players can't attack the admin's yards (they hold the test shiny and resources). A failure there no longer
  stops the login.
- **Game.** Opening the map takes the yard out of memory; a save asked for then (a purchase, a tool) wrote
  the yard back with no buildings: such saves are skipped now (`BASE.SaveB`). The Outposts list and the test
  tools can't be used during a wild monster or baiter attack (View / Next outpost left the attack unsaved),
  and close when one starts. Windows open when the yard goes (map, another yard) are forgotten, with their
  screen blockers, so they open again; a raid warning left open no longer hides the next one. Monster
  Baiter and portal attacks no longer use the last wild attack's level. The game no longer keeps a copy of
  every request it ever sent (memory grew all session). An answer that isn't JSON runs the caller's
  failure path. An instant unlock with shiny keeps the Academy level (as the timed unlock does). A bunker
  sends every free defender at ground attackers (an index left from the flyer loop skipped some). Next
  outpost from a main yard without a Map Room crashed. Admin test mode: healing, full resources and
  unlocking every monster apply to the admin's own yards only (practice attacks healed the defenders); the
  switch asks the server again when an answer is lost and gives up after 20 seconds.
- **Performance.** The half-minute poll (`updatesaved`) and every save answer only what the game reads
  (6 KB and 0.3 KB in the test, were 14 KB and 1 KB; a big yard is 100 KB+). A map zone is 10 x 10 cells
  (it sent 11 x 11), and pending relocation invites are one query per zone, not one per outpost. Alliance
  power-ups are read without writing on every poll. The announcement is cached for 5 seconds. Chat keeps a
  quiet session 90 seconds (background tabs poll about once a minute). In the game: defenders on their way
  back look for attackers every 10 steps (was 199 of every 200), a bunker lists its free defenders only when
  sending them, the top bar's resource counters only count when the amount changed. (The change that made
  the last acid puddle tick was taken back again: acid puddles had never all ticked, and ticking them changes
  battles.)
- **Found afterwards:** when Rezghul died while his resurrecting shot was in the air, the shot landing threw
  an error on every frame, the battle's frame work stopped there, dead monsters were never cleared and the
  attack never ended (`RezghulResurrectAttack`). And the save answer the game logs after an expected 4xx
  (test mode switched off elsewhere, a yard reset) is no longer sent as a bug report.

Tested: `client-web/tools/test/server-fixes-test.mjs` (server, with psql; also run against the old server,
where the attack save failed with 500), the other tests in `HANDOFF.md` §9, and in the game: a save while
the map is open writes nothing, the Outposts list is refused during an attack and opens again after a yard
change.

## Bug reports, 26 September

- **#36 / #37 "Inferno save not found" (infernomonsters, 500).** The housing window's "Ascend monsters" (and
  the portal's) sends monsters up from a separate Inferno yard, which an inferno-only server doesn't have: the
  main yard is the Inferno yard. The game no longer offers it there (`HOUSINGPOPUP`, `HousingPersistentPopup`,
  `BUILDINGINFO`, `INFERNOPORTAL.AscendMonsters`), and the server answers instead of failing (get: nothing;
  set: a 404 that says so).
- **#35 /init 500.** Not a bug: an outdated client being told a newer one is published (versionMismatch). No
  longer reported, from new clients or old ones.
- **#34 /base/save Load Error.** No answer at all during an attack (the report's own sending failed at the same
  moment): the connection dropped or the server was down. Such lines now say so, with how long the request
  waited (see "What a report says" in the admin panel section).
- **#33 "this.m_children is not iterable" (Balthazar).** A monster cleared twice (its death tween ending after
  it was already cleared). In Flash a `for each` over null runs zero times; the browser build's converted code
  threw. The converter now reads a null Vector, Dictionary or XMLList as empty everywhere
  (`client-web/tools/as3-to-ts/emit.ts`).
- **#32 Tutorial.ImageLoaded (mcImageContainer of null).** The map tutorial's picture arrived after its window
  was closed; also in the Map Room 3 tutorial.
- **#31 "Can't find variable: AudioContext".** Older Safari (before 14.1: older iPhones and iPads) has only
  `webkitAudioContext`, with callback-only decoding and no stereo panner. The browser build uses it there, and
  runs silent in a browser with no Web Audio (`client-web/src/flash/media/index.ts`).

## Korath, Drull and Rezghul locked for everyone

They used to be unlocked for everyone, and when the Strongbox unlock came in, players who had them kept
them. Now everyone unlocks them in the Strongbox (page 4 for Rezghul, page 5 for Korath and Drull):

- Migration `20260925_RelockChampions` (once; with `ENV=prod` run `bun run migration:up`) removes the
  unlock from every player's saves. Unlocks under way in the Strongbox are left to finish. Nothing is
  refunded (paid unlocks cannot be told apart from the old free ones).
- Monsters already hatched stay (in the Compound, outposts, hatcheries) and can be flung until they die;
  no new ones can be hatched until the player unlocks them again. Academy levels are kept, and unlocking
  again no longer puts the level back to 1 (`CREATURELOCKER.Tick`).
- The server refuses a save that marks one of them unlocked when the unlock was never started (a game
  left open from before the relock, or a changed one): it keeps what was stored and logs
  "IC9 unlock refused, never started" (`services/base/lockedMonsters.ts`, used in `baseSave.ts`). Starting
  an unlock, finishing one, and an instant unlock bought with shiny (store item IUN, one per purchase) are
  accepted. A player who had the game open during the deploy still sees them unlocked until they reload.
- Tested: `client-web/tools/test/champion-lock-test.mjs`, and by hand: a game opened before the migration
  saved its old unlocks after it and they stayed removed; housed Korath, Drull and Rezghul and a trained
  Academy level were still there.

## Admin test mode

Admins (config `admins`) get a **Test: OFF / Test: ON** switch next to the Admin button on their own yards.
Switching on asks first, saves the yard, and the server takes a **snapshot** of the admin's account: the main
yard, every outpost and their map cells (shiny and resources live in those saves). Switching off asks first
and puts that snapshot back exactly, so nothing done while testing stays: buildings, upgrades, outposts
taken, unlocks, shiny and resources all go back. Test mode also ends, with the account put back, when the
admin uses **Switch account**, and on the next **login** (closing the game or reloading the page counts:
the next start logs in again). Server: `services/admin/testMode.ts`, `POST admin/testmode`, table
`admin_test_snapshot` (migration `20260925_AddAdminTestMode`); client: `com/monsters/admin/IoTestMode.as`,
`GLOBAL.ioTestMode()` (flag `io_testmode`). Every switch and tool use is in the admin log.

While it is on (a red **TEST MODE** line under the top bar):
- Unlimited resources and shiny: the counters say "Unlimited"; the server gives 999,999,999 of each resource
  and 9,999,999 shiny, and spending takes nothing. Shiny prompts are skipped.
- Everything built, upgraded, fortified and repaired at once; hatching and Academy training at once; a
  worker is always free.
- No building limits: any number of anything, whatever the Town Hall level or requirements.
- Every monster unlocked, Korath, Drull and Rezghul included (the relock check lets admins in test mode
  through); the Compound holds any number; housed monsters stay at full health (except during a wild attack).
- Attacks are **practice**: any yard, whatever its protection, truce, owner online or range; any monster,
  999 of each; no fling limit; a day on the clock; all catapult shots, free. Nothing is written to the yard
  attacked (no damage, loot, attack record, attack log or lost protection) and the admin's own yards lose
  nothing. Taking a yard over still needs the tool below.
- Points, base value and empire value are not written, and the leaderboards leave the admin out, so
  rankings are as they were.

**Test tools** (button next to the switch):

| Tool | What it does |
|---|---|
| Wild attack now | the chosen tribe's wild attack for the chosen level band, at once, on the yard on screen (no one-a-day limit, no first minute, any level) |
| Monsters: Attack me | that many of the chosen monster at the chosen level attack the yard, in the chosen tribe's formation |
| Monsters: Defend | that many go in the Compound at the chosen level (it becomes that monster's Academy level) |
| Repair everything | every damaged building at full health |
| Protection on / off | damage protection on the main yard for 7 days, or none |
| Fast-forward | moves the yard on screen N hours on: production, building countdowns, timers that end at a time (Academy, Strongbox), the next wild attack. Loading the yard again goes back to real time |
| Map: Jump there | opens the map there (X and Y fill in from the last cell clicked) |
| Map: Take as outpost | free land or a tribe becomes an outpost of yours at once |
| Map: Make wild | one of your outposts, or a stored tribe yard, becomes wild again (a fresh tribe grows there) |

Other players' yards are never changed by test mode: taking or making wild refuses them, and practice attacks
write nothing to them. Other players can't attack the admin's yards while it is on. Test mode is on while
the admin has a snapshot row (the database decides, Redis only mirrors it); switching off locks that row,
so two switch-offs at once restore once, and an outpost another player took meanwhile stays theirs. A game still in test mode after it was switched off elsewhere (another device) cannot
save over the account put back: the server refuses its saves ("Admin test mode has been switched off").
Tested: `client-web/tools/test/admin-test-mode-test.mjs`; by hand: switching off gives the account back
byte for byte (every own save and map cell), practice attacks on a protected player and on a tribe leave
them byte for byte unchanged.

## Build menu art, outpost hall, juicer and more (29 September, afternoon)

- **Build menu drawn from the yard art** (`com/monsters/display/IoMenuArt.as`, used by `BUILDINGBUTTON` and
  `BUILDINGOPTIONSPOPUP`). A button is drawn live from the building's level-1 imageData (shadow, top, anim strips)
  when its art is the Inferno's (`buildings/i...`) and it moves, or its button picture was the overworld's. That
  covers the General Store, Incubation Control Station, Flinger, Catapult, Map Room, Yard Planner and Juicer, which
  had the overworld's pictures. Static buildings with an Inferno picture of their own (Silo, Under Hall, Academy,
  Blocks, Compound) keep their pictures.
  - One scale for everything (0.72, smaller only where a building would not fit its button), so the Cinder Coil
    and Obsidian Mortar no longer fill their buttons.
  - Towers that turn (`IoMenuArt.TURNING`: Sharpshooter, Blast Tower, Magma Tower, Cinder Coil, Obsidian Mortar)
    face the mouse, the angle worked out in yard terms as `BTOWER.Rotate` does.
  - Animated buildings loop their strips at the yard's pace (a frame every 3 stage frames). The Quake Tower drops
    its hammer once, then waits 4 s.
  - A building not yet unlocked shows its silhouette picture (since 29 September, evening: every one is there
    now; see "Missing assets filled, Juicer v2").
  - The building window (`BUILDINGOPTIONSPOPUP`) draws the seven that had overworld pictures the same way, at the
    level shown.
- **Outpost hall** (`inferno_outpost.zip`): `buildings/ioutpost/`, imageData on 112 in `INFERNOYARDPROPS` (an
  outpost's table takes it, `GLOBAL.ioBuildOutpostProps`). Its brazier fire and banner play, 24 frames, whole and
  damaged (`BUILDING112.TickFast`).
- **Portraits:** the Emberghoul's and Ashkarr's new pictures (`monsters/IC20-*`, `IC24-*`; `popups/IC20-150.png`,
  `IC24-150.png` for the Strongbox, made from the 150 jpg).
- **Incubation Control Station:** "Hatchery Control Center" renamed in the four languages (the building,
  `hcc_title` and every line that names it). The Incubation Control Station's monster list is four across (it
  was five), and the stats and description move a column left; the description is a column wider, so it is not
  cut off (`HATCHERYCCPOPUP.ioNarrowList`: the art's divider painted over and drawn at the new edge).
- **Monster order:** Rezghul (C19) sorts between King Wormzer (IC8) and the Emberghoul (IC20): index 8.25
  (`CREATURELOCKER.ioApplyRezghul`). This covers the Incubation Control Station, the Compound and the housing lists.
- **Monster Juicer:** juices the Inferno's monsters in the Inferno (`HOUSINGPOPUP`: the "no Inferno monsters"
  refusal stays for the overworld only). The value is magma, 60/80/100% of the hatch cost by the juicer's level,
  as before. The juicer's art is the resized pack (`inferno_juicer_resized.zip`: files replaced, offsets
  updated).
- **Browser build: outlines drawn over pictures** (the upgrade window's resource boxes, the kit table). A SWF shape
  can have several style layers. Flash draws each layer's fills then its strokes, layer by layer, so a later
  layer's fills cover an earlier layer's strokes. The converter kept all fills and all strokes in two lists, and
  the player drew every stroke over every fill. The converter now marks each entry's layer (`L`, only in shapes of
  more than one layer: 172 of 1291, 75 of them drawn wrong before; `client-web/tools/swf-assets/library.ts`). The
  player draws layer by layer (`client-web/src/flash/display/library.ts`). `public/swf/library.json` was made
  again (`npm run assets`).
- **Kit table:** a row for the Cinder Coil and Obsidian Mortar ("Coil/Mortar"); "Hatchery CC" reads "Incubation
  CS". The art's table has ten rows, so the popup draws its own over it, of as many rows as there are, in the same
  space. The text's line spacing is made to match (`popup_prefab.ioTableRows`).
- **Kit pictures with the new art** (`services/kits/kitPreview.ts`, `game-data/kits/previewSprites.ts`, the
  latter now generated from `INFERNOYARDPROPS` by `server/src/scripts/gen-preview-sprites.py` with every level band, the hall's Inferno art, anim2 and anim3). At
  server start, `services/kits/refreshKitPictures.ts` draws every kit's pictures again when their drawing is older
  than `KIT_PICTURES` (2):
  - the server's kits: `inferno-kits.json` `pictures`, and its `version` is renewed so the client fetches them;
  - the players' own kits: marker `kits/player/.pictures`.
  File names do not change.
- **Map room cell box:** a wild tribe's picture is its large one (`popups/tribe_*.png`, 150 high) made 50 high,
  smoothly, on the ember ground (`InfernoMapTheme.tribeCellPicture`). First put in the wrong place (the hover
  popups); moved to the cell information panel, see "Padlocks, Magma wording, designs export".
- **Chat:** the newest line is in view when a line arrives or is sent, when the chat is opened or its tab switched,
  and at the start (`ChatBox.ioScrollToBottom`). The Global / Alliance tabs use the Quests title's font
  (Groboldov, white, black outline); the showing one is yellow.

`client-web/tools/test/menu-art-test.mjs` (21 checks) covers all of these.

## Padlocks, Magma wording, designs export (29 September, evening)

- **Padlocks on locked monsters** (`lock-icon-assets.zip`, the overworld padlock only: `ui/lock_icon.png`,
  `lock_icon@2x.png`; the Inferno variants in the zip are not used). `com/monsters/display/IoLockIcon.as` puts the
  gold padlock over a monster not yet unlocked in the Strongbox (locker entry `t` 2), and greys the tile, wherever
  monsters are listed:
  - Incubator (`HATCHERYPOPUP`) and Incubation Control Station (`HATCHERYCCPOPUP`) monster tiles;
  - Compound and Juicer list (`HOUSINGPOPUP`, the row's `mcIcon`);
  - Academy (`ACADEMYPOPUP`: the portrait, padlock in its corner);
  - Strongbox (`CREATURELOCKERPOPUP`: each locked row, and the big portrait's corner).
  The padlock is a Bitmap in the tile's parent, above the tile (no mouse events, so hovering still works).
- **Pictures stale in production** (the Emberghoul's and Ashkarr's new portraits "not changed everywhere", and the
  juicer's resized art): production serves assets with `Cache-Control: public, max-age`, so pictures replaced under
  the same names stayed in browsers and the CDN. `assetVersion` (InfernoOnlyConfig) goes 7 → 8, so the client asks
  for every asset with `?v=8`. **Whenever pictures are replaced under the same names, raise it by one.**
- **Map room:** the tribe's large picture belongs in the cell information panel to the right of the map
  (`MapRoomPopup.TribePic`, `InfernoMapTheme.tribeCellPicture`). The earlier change to the hover popups
  (`PopupInfoEnemy`, `PopupInfoViewOnly`) is reverted.
- **"Goo" reads "Magma"** in the Incubation Control Station and the Monster Juicer (four languages; 17 keys:
  `hcc_goousage`, `hat_gooremaining`, `hat_needgoo`, `hat_status_nogoo`, `hat_notenoughgoo`, `hcc_msg_recycle`,
  `mh_juicemonsterX_btn`, `mh_juicemonstersX_btn`, `msg_juicegoo`, `pop_juicerbuilt_*`, `pop_juicerupgraded_*`,
  `building_juicer_conversion`, `monsterjuicer_desc`, `fp_juicer`, `fp_juicer_title`).
- **Academy roster order:** Rezghul after King Wormzer (IC8), the champions (Korath, Drull, Ashkarr) last
  (`ACADEMYPOPUP.ioRoster`).
- **Designs export** (`server/src/scripts/export-designs.ts`): everything made in the Designer (wild tribe and
  Moloch layouts with their Compound monsters, table `bym.io_design`, and the outpost kits,
  `public/assets/kits/inferno-kits.json`) as one JSON file, to make them the game's defaults:

      docker compose exec -T web bun src/scripts/export-designs.ts > inferno-designs.json

  JSON on standard output, a one-line count on standard error; read only.

`client-web/tools/test/locks-test.mjs` (12 checks) covers these.

## Missing assets filled, Juicer v2 (29 September, evening)

The user's `inferno-missing-assets.zip` (with `INFERNO_MISSING_ASSETS.md`) and `inferno_juicer_v2.zip`.

- **Monster Locker (8, `buildings/imonsterlab/`):** a shadow at last (`shadow.1.v2.jpg`, and damaged and destroyed
  ones), and new damaged and destroyed art made from the locker's own (the damaged one includes the lid, since the
  animation is not drawn damaged). The offsets are the pack's (`INFERNOYARDPROPS`).
- **Monster Juicer v2 (9, `buildings/imonsterjuiceloosener/`):** restyled (basalt and sandstone tiers, bronze
  trim, blood spill, skulls), the same size and animation box. Files replaced; the top offsets go to y -7 and the
  destroyed shadow to y 5 (the pack's snippet). The kit pictures are drawn again at the next server start
  (`KIT_PICTURES` 3).
- **Build-menu silhouettes** (`buildingbuttons/*.silhouette.jpg`, the pack's twelve: each building's own button
  with the building in flat grey 106, the flames kept). A building not unlocked yet now shows its silhouette
  picture in the build menu, not the live grey drawing (`BUILDINGBUTTON`). Two the pack did not have were made
  here from the yard art, grey on white like the Magma Tower's: `cannon_tower.v2.silhouette.jpg` (Blast Tower) and
  `monster_housing.v2.silhouette.jpg` (Compound); also the Blast Tower's own button `cannon_tower.v2.jpg`, which
  was missing (the building window asked for it). The pack's silhouettes keep the flames, the older ones
  (Magma Tower, Quake Tower, Cinder Coil, Obsidian Mortar) are grey on white: each matches its own button.
- **Under Hall level 1 button** (`townhall_L1.v2.jpg`), already named in the props. As the pack notes, the L2
  button shows the level-1 hall and L3 the level-2 hall; not changed.
- **Monster popups** `popups/IC1-150.png` ... `IC8-150.png` (starting or finishing an unlock, the Academy's
  training done): transparent, with a soft shadow, replacing the square ones.
- **Quest pictures** (`popups/`): the 13 the Inferno quests point at (`building-under_hall1..3`,
  `building_inferno_academy`, `building-magma_tower`, `building-quake_tower`, `inferno_monster2..8`).
- Not taken from the pack's `INFERNOYARDPROPS.diff`: its Bone Harvester and Coal Harvester lines. The repo already
  has the files those lines ask for (copies made 27 September) and newer offsets for them.
- `assetVersion` 9: pictures replaced under the same names (the locker's, the juicer's, five silhouettes, the
  monster popups).
- The pack's list of what was still missing was out of date: the Magma Tower's damaged animations and the Moloch
  splash (`popups/tribe_moloch.png`) were there, and the Portal's shadow was a typo (next section).
- Note: the silhouettes `cannon_tower.v2.silhouette.jpg` and `monster_housing.v2.silhouette.jpg` and the button
  `cannon_tower.v2.jpg` made in this round belong to old entries not used in the Inferno (20 and 15); the Inferno's
  Blast Tower is 130 (`canon_tower.v2`) and its Compound 128. Harmless.

`client-web/tools/test/missing-assets-test.mjs` (9 checks) covers these.

## Every missing Inferno asset made (29 September, late)

A sweep of everything the Inferno asks for (every picture and sound the code names, checked against
`public/assets`, and every asset request that failed during the whole test suite) found these; all made here:

- **Quest-list icons** (`missionicon/`, 40 x 32 PNG; the Quests list on the right asked for 24 that were not
  there, only `icon_mogul.png` was): buildings drawn from their yard art on the ember ground (the Under Halls with
  their level, 1-3), monsters cut from their popup pictures, `icon_wallstreet` (Resource Gatherer) a heap of the four
  resources, `icon_nextlevel` the Magma Pump with a gold arrow.
- **Academy animations** (they play while a monster is being trained, as in the original game):
  - `anim1.1.png` (level 1): the level-2 nozzle's turning drum (`anim1.2.png`, which was there but switched off),
    set onto level 1's nozzle;
  - `anim2.1.png`, `anim2.2.png`: a light sweeping over the golden dome, then resting.
  Level 2's `anim1.2` is switched on.
- **Academy shadows:** level 1's damaged and destroyed shadows made (from level 2's, to level 1's size and tone);
  level 2's were there and are switched on. All placed with the standing shadow.
- **Magma Tower destroyed shadow** (`shadow.1.destroyed.v2.jpg`), from the rubble's shape.
- **Inferno Portal, level 4:** the props asked for `shadow.v2.4.jpg`; the file is `shadow.4.v2.jpg` (typo fixed).
- **Rezghul's projectile** (`monsters/projectiles/rezghul_projectile.png`, 20 x 20, a green soul orb): Rezghul is an
  overworld monster, but he fights in the Inferno and the picture was missing (the game fell back to a fireball).

Not made, because the game never shows them: the Facebook feed pictures (`quests/*.png`, `emergence_streampost01A`,
`tribe-*.v2.png`: this game makes no feed posts) and the gift pictures (`resource-cauldron_*.png`: no gifts are
sent here).

- **Moloch's Gauntlet showed the Brukkarg:** its yards have no tribe id, and a yard with none was taken for the
  Brukkarg event tribe (overworld): the Brukkarg's name, and his picture, which is missing. In the Inferno it is
  Moloch's now (`TRIBES.TribeForBaseID`).

`client-web/tools/test/remade-assets-test.mjs` (10 checks) covers these, and fails if any file the Inferno's
buildings name is missing.

## Bug reports, 29 September

- **#47 "Cannot read properties of null (reading 'x')" at `Scroll` (100×, build 202609281823).** On yard
  switches. Two base loads in flight (a yard opened while another was still loading, by a way in that does
  not go through `LoadBase`, which refuses a second load) both built their yard, one after the other: the
  first yard's map ground was left behind with its `MAP.Scroll` on every frame, and once the map was cleared
  for the next yard, that Scroll read the missing map (`_GROUND.x`) on every frame until the next yard was
  built. The yard on screen could also be the older one. Now: only the answer to the latest load builds a
  yard (`BASE.Load` numbers its loads; an older answer is logged and dropped); a map set up again lets go of
  the ground it replaces (`MAP.ioLetGo`); and Scroll does nothing from any ground but the map's (it lets go
  of it) or with no map.
- **#42 / #43 "can't access property "time", costs[_lvl.Get()] is undefined" in `BuildingOverlay.Update`
  (view mode, build 202609271914).** A building under construction comes back from a save at level 1 (the
  save leaves out level 0 and 1 alike), and the Inferno's Map Room at level 2; the overlay timed its build bar
  by that level's cost. The Map Room has one cost only, so viewing a yard where one was being built threw on
  every frame. A build is timed by the building's first cost (as `BFOUNDATION` builds it), and the bar never
  goes below empty.
- **#44 / #46: no answer from the server** (`updatesaved` after 91 s on an Android phone; `getinfo` after 5 s
  at login on an iPhone). The connection dropped (phone asleep or network gone): not a bug. Delete.
- **#45 HALT "There was a problem with your purchase"** (ClaudeBot, `localhost`, build 202609280127): an
  automated session on someone's own machine, calling `STORE.StreamlineBuy` from a script (`window.__finish`)
  for a building whose General Store was missing. Not a player's; not a bug. Delete.

`client-web/tools/test/designer-recycle-test.mjs` checks all of these and the Designer's recycling (10 checks).

## The Designer (admins; 27 September)

Admins get a **Designer** button in the top bar, next to Admin and Test, on their own yards. It opens
a list with three tabs. Every row has **Edit**. A changed row also has **Reset**, and tribe and Moloch rows
also have **Remake**.

| Tab | Rows | Limits while designing |
|---|---|---|
| Outpost kits | the 6 kits of the kit popup | an outpost's: its buildings, its limits and its yard edge |
| Wild tribes | every level of each tribe's ladder (`tribeSpawns.ladders`, 19 in all) | none: any number of anything, and no yard edge (the yard is 2400 across) |
| Moloch's bases | descent bases 1 to 13 (the Gauntlet's gates; 10 to 13 are also the Moloch strongholds on the map, see `moloch.descentBases`) | none, as for tribes |

**Edit** opens the layout as a yard of its own, called a **draft**, in build mode. A bar under the top bar
says "DESIGNING: ..." and has these buttons:
- **Save** makes the layout the one in use.
- **Reset** asks first, then puts the stock layout back (for a kit, the kit as it was before it was first
  changed) and opens it again.
- **Designer** shows the list.
- **Exit** asks first, deletes the drafts and goes home.

The draft is free and instant: resources and shiny say "Unlimited", everything builds and upgrades at once,
and there are no Town Hall requirements. In a kit draft buildings can be recycled and construction stopped
(29 September): outposts allow that in the Designer only, never in a player's outpost (`GLOBAL.outpostRecycling`
is the Designer; the server switch `outpostRecycling` is gone). The outpost hall can never be recycled. Quests, achievements, wild attacks and the auto-bank are off. The
kit popup is not used in a draft.

When a layout is saved:
- **Kits** are written into `public/assets/kits/inferno-kits.json`, the file the game downloads, and their
  pictures are drawn, the same way `scripts/export-kits.ts` does from a real outpost. The kit's name and
  price are kept, and only outpost buildings are taken. Players get the new kit from then on; outposts
  already built keep what they have. The first save keeps the kit as it was (row `kit-original`), and Reset
  puts that back.
  - **Deploying over a changed kit:** a zip that carries `inferno-kits.json` overwrites the kits changed on
    the server. Back up `public/assets/kits` first, or leave the file out of the zip.
- **Tribe levels and Moloch bases** are stored in table `io_design` (migration `20260930_AddDesigns`). The
  yard generators use them from then on:
  - `tribeSaveV2.fetchTribeData` replaces the stock buildings; the defending monsters stay as they were.
  - `molochStrongholds.descentTemplate` is used by the strongholds and by the Gauntlet's gates.
  - Yards already stored on the map keep the layout they were made with, so a save says how many there are
    and offers **Make again**. **Remake** in the list does the same later. It deletes those stored yards,
    and the next look at their cells makes them again from the design. It leaves out destroyed yards (their
    state is players' progress) and yards being attacked now.
  - Gauntlet ladders made earlier in the month keep their layout. Players get the new layout at the next
    month's ladder.
  - A tribe level's Reset goes back to the stock layout; stored yards stay as they are until they are made
    again.

**How it works**
- A draft is a `bym.save` row with `type = 'design'`, owned by the admin. Its base id is `8` followed by 14
  digits: `800000000000000 + userid x 1000 + n`, where n is 1-6 for kits, 100 + N for Moloch base N, and
  200 + tribe x 100 + level for a tribe level.
- Only its admin can load it, only in build mode. Viewing or attacking it is refused, and so is anyone
  else's load (`baseLoad.ts` and `updateSaved.ts`).
- Its saves write the buildings and nothing else (`baseSave.ts`), so the admin's resources, shiny, quests
  and stats are never touched.
- Opening a layout always starts the draft again from what is saved.
- Before it is stored, a saved layout is cleaned of countdowns, health and anything else that is not
  layout (`cleanBuildings`).

**Files**
- Server:
  - `services/admin/designs.ts` (the Designer)
  - `services/admin/designStore.ts` (`io_design`, kept in memory and read at startup)
  - `controllers/admin/adminDesign.ts` (`POST admin/design`, admins only; actions list, open, save, reset,
    replace, close)
- Client:
  - `com/monsters/admin/IoDesigner.as` (the list and the bar)
  - `GLOBAL.ioDesign()` / `ioFreeBuild()` / `ioNoLimits()`
- Every change is written to the admin log.
- Test mode uses the same switches: `ioFreeBuild()` means test mode or any draft, and `ioNoLimits()` means
  test mode or a tribe or Moloch draft.
  - As part of this, the yard load no longer trims buildings over the limits while test mode is on (before,
    a reload in test mode took the extra buildings away).
- `OUTPOST_BUILDINGS` (the buildings a kit may have) now includes the Cinder Coil (144) and the Obsidian
  Mortar (145).

**Monsters in the Compounds** (28 September, the user's): a tribe or Moloch draft's bar also has
**Monsters**. Its window lists every Inferno monster (IC1-IC8, the Fusebug, Clinkerjaw, Flickerfiend,
Emberghoul, Korath, Drull, Ashkarr, and Rezghul while he is one) with how many live in the yard's Compounds
(-10, -, +, +10; up to 999 of each) and their level (1 to 6, any monster), and the Compounds' room in use.
They must fit the Compounds (build more in the draft for more room: no limits there), since the game keeps
no more than its Compounds hold. **Apply** saves the draft's buildings, puts the monsters on the draft
(`POST admin/design` action `defenders`: its `monsters` as {id: how many}, `academy` as {id: {level}};
Inferno monsters only, levels 1-6) and loads it again, so they walk in its Compounds. **Save** stores them
with the layout (`io_design.monsters` / `.academy`, migration `20261001_AddDesignDefenders`), and the yard
generators use them in place of the stock yard's: `tribeSaveV2.fetchTribeData` and
`molochStrongholds.descentTemplate` (so the Moloch strongholds and the Gauntlet's gates too). They defend
at those levels (a yard's `academy` sets its defenders' levels). Reset puts the stock monsters back with the
stock layout; Remake makes stored yards again with them. A kit has no Monsters (an outpost's monsters are
its player's). The list shows each row's monster count. A draft loads with its own levels, not the admin's
Academy (`baseLoad.ts`); the admin's account is untouched. Before the migration runs, layouts still work
(without their monsters).

Tested: `client-web/tools/test/designer-test.mjs`.

## Moloch's Gauntlet

A monthly event, away from the map room: a ladder of 13 Moloch yards, fought in order, for shiny and
resources, the last one paying the most. Open to every player, personal progress only (no leaderboard).

- **When:** the first 7 days of each month (UTC, days 1 to 7), by itself, every month. Progress belongs
  to the calendar month (UTC): from the 1st the ladder starts again at stage 1 with fresh yards, and every
  reward can be won again. That holds even when an admin opened it early: progress from the last days of
  a month doesn't carry into the next.
- **Where:** a Moloch button in the left column of icons on the player's own main yard (build mode, after
  the tutorial), under Invite Friends, Daily Reward and Mail, drawn round the same middle and the same
  size as they are. A red ring spins round it while the event is open and the ladder not finished. While
  closed it is faded, and clicking it shows only a small popup: "Moloch's Gauntlet starts in 4d 2h."
- **The window ("The Descent"):** obsidian with a molten rim, lava cracks and embers drifting up. The
  title and how long the gates stay open; the result of the last attack once, in a banner; the legend
  ("Once each moon, Moloch throws open the gates of his Gauntlet...") and one small line of numbers (90%
  breaks a gate, 3 attempts, the gates rise anew on the 1st). The 13 stages are **gates** (I to XIII,
  each with a name: The Ashen Gate ... Moloch's Throne) winding down a lava path into a chasm: sealed
  gates dark, the gate to fight burning and pulsing, broken gates cracked with a gold mark (prize
  claimed) or a red one (prize lost), the path lit as far as the player got; XIII is crowned in spikes
  with its 155 shiny beside it. The new Moloch (`popups/tribe_moloch.png`) looms on the right in a red
  glow, breathing. Under him, the chosen gate (the one to fight at first; click any): name, level,
  prize, attempts left as flames, how much of its walls is already broken, and **ENTER THE GATE**. The
  attack's bar and end popup say "Gate III: 45% destroyed, 90% breaks it", "Gate III falls!".
- **The yards:** stage N is a copy of Moloch descent base N at level N x 50 / 13 (4, 8, ... 50), one set
  per player (base ids `9000...`, never on the map). No loot: the reward is the loot.
- **Winning:** 90% of the yard destroyed. A bar at the top of the screen shows the destruction as it
  goes, with a line at 90%. Damage stays between attempts, so the three attempts add up.
- **Attempts:** 3 a stage, counted when the attack starts (leaving an attack early uses one). After the
  third failure the yard heals fully, the attempts start again, and **that stage's reward is gone**: the
  stage must still be beaten to go on, but it pays nothing. Other stages are not affected. The window
  says "last attempt" and asks before the third.
- **Rewards:** 5 shiny a stage, 150 more on stage 13; resources rise evenly to 30M bone, coal and sulfur
  and 15M magma on stage 13 (stage N pays N/13, in steps of 100k: stage 1 is 2.3M / 1.2M). Paid once, to
  the main yard, when the attack ends. The game may not show more than the silos hold.
- **Monsters:** the player's own, from the main yard, flung as in any attack. Losses are real.
- **Paid once, whatever the player does.** Every reward paid is a row of `bym.gauntlet_claim` (player,
  month, stage), written in the same transaction as the shiny and resources; the database refuses a second
  row for the same stage and month, so it can't pay twice. Each player's Gauntlet requests run one at a
  time (their row is locked), and every save to a Gauntlet yard must come from the attack the server
  started last on it (its attack id, this month, at most 30 minutes old, the stage being fought). So:
  the last save sent twice, five times at once, or again later; a second game or tab; a save from an
  older attack; attacking a stage already beaten, or opening its yard in any other mode (view, inferno
  attack): refused, nothing written, nothing paid. An attack that never sent its last save (the game
  closed) ends when the next one starts, or 30 minutes on, by what its last save left (90% or more:
  beaten, paid once).
- **Admin panel:** Status has a "Moloch's Gauntlet" card: **Open now** (for 7 days from now, whatever
  the date), **Close now** (until the 1st at most: the next month always opens), **Calendar** (back to
  days 1 to 7). The player card shows the player's stage, the rewards paid and lost this month, and
  **Start again**, which empties that player's ladder for the month; rewards already paid this month are
  not paid again. Clearing tribe yards ("reset all") leaves the Gauntlet yards alone.
- **Admin test mode:** the Gauntlet has a test ladder of its own there, always open (whatever the date or
  the admin panel says), with the test mode's monsters. It is played for real (attempts, healing, gates
  opening one after the other) so every gate can be tried, but nothing is paid or claimed: the result
  says what it would pay. The admin's real ladder is left as it was, and its yards can't be attacked in
  test mode. The test ladder (and its yards) goes when test mode is switched off, and a fresh one starts
  when it is switched on.

Server: `services/events/gauntlet.ts`, `GET/POST gauntlet/status`, the attack and save hooks in
`controllers/base/load/baseLoad.ts` and `controllers/base/save/baseSave.ts`, flag `io_gauntlet`, column
`user.gauntlet` (migration `20260926_AddGauntlet`; read and written only by gauntlet.ts, not an entity
property), table `gauntlet_claim` (migration `20260926_AddGauntletClaims`, which carries over rewards
already paid). Client: `com/monsters/maproom_advanced/IoGauntlet.as`
(window, attack, bar), the button in `UI_TOP.as`, the end-of-attack popup in `popup_attackend.as`.
Tested: `client-web/tools/test/gauntlet-test.mjs` (57 checks).

Also fixed with it: building health sent by the browser build as the text "undefined" was stored, and the
yard's next attack save a second or more later failed (500) bringing its countdowns forward; it is no
longer stored, and a stored one is ignored. The Inferno Quake Tower (any tower) looking for targets with no
position on the yard stopped the game during an attack (bug report "reading 'add'"); it finds none.

## Relocate

A **Relocate** button in the map room's sidebar, under Home and Jump (as wide as both). It asks first:

> Relocate your yard? Your main yard will be moved to a new place on the map, the way a new player is
> placed. Everything you have out there is lost: your Bone, Coal, Sulfur and Magma go to 0, and all 3 of
> your outposts return to the wild tribes. This can't be undone.

Then the server (`POST base/relocate`, `controllers/maproom/v2/relocateAnywhere.ts`):
- bone, coal, sulfur and magma in the main yard go to 0 (the storage limits stay; shiny is kept);
- every outpost is let go: its yard and map cell are removed, so the place is a wild tribe again, as for
  any empty cell (`leaveWorld`, the same as the stock "empire destroyed" relocation);
- the main yard gets a new home cell the way a new player does (`joinOrCreateWorld`: the spawn rules,
  near other players and clear of their main yards and Moloch). Bookmarks stay when it lands on the same
  world.
The game then says where ("Your yard has been relocated to 57, 327") and starts again from there (it
reloads, still logged in), with nothing in store and no outposts. No cooldown and no shiny: losing
everything out there is the price. Refused while the main yard is being attacked (no escaping an
attack), in admin test mode (its snapshot holds the old place; switch it off first), and twice at once.

Also fixed with it: a relocation took the player off the old world's player count but never counted them
on the new one, so worlds under-counted their players (and could take more than 625). Tested:
`client-web/tools/test/relocate-test.mjs` (22 checks).

## Towers against Sulfur Bombs and Candy Jars (26 September)

- **The Quake tower could not kill a monster under a Sulfur Bomb once it had lost some health.** It cut
  each blow to the monster's health left *before* the shield took its share: a monster on 200 under a 50%
  shield took 100, then 50, 25, ... and never died. The whole blow now meets the shield: a 2,000 blow on a
  monster under 50% takes 1,000, however much health it has left (`INFERNOQUAKETOWER.Quake`). What the
  tower counts as done is what the monster lost. It was the only tower that cut its damage like that.
- **The blast tower (Inferno cannon, 130) fired through a Candy Jar.** It now shoots the glass like
  every other tower (`INFERNO_CANNON_TOWER.Fire`). Every tower was checked: sniper, cannon, laser,
  lightning, railgun, the other overworld towers, quake, magma, blast and the Spurtz Cannon all hit their
  jar instead of a monster; Guard towers can't be jarred.

Tested: `client-web/tools/test/sulfur-jars-test.mjs` (22 checks: a 3,600-health monster under 50% loses
2,880 to a blow of 5,760 and then dies to the next; every kind of tower, jarred, shoots its glass and no
monster, and unjarred shoots).

## Moving and placing buildings: speed

Measured on a yard of 246 buildings (a ring of 220 walls added to a real yard), in the browser, with the
CPU slowed four times like a phone (`client-web/tools/test/move-perf.mjs`):

| | before | after |
|---|---|---|
| Dragging a building in move mode | 3.8 fps, 184 ms of script a frame | 7.2 fps, 50 ms (idle yard: 7.5 fps) |
| The same at full speed | | 36 fps (idle 39; the game runs at 40) |
| Placing a new building | 6.5 fps | 7.0 fps |

What it was:
- **The building held is drawn see-through, and that was the cost.** The yard renderer
  (`com/monsters/rendering/Renderer.as`) copied each half-transparent layer through an alpha mask. In the
  browser that goes through a scratch canvas, which made the browser draw out everything queued for that
  frame, once for every layer of the building (3 to 5): 36 of the renderer's 46 ms a frame. Half-transparent
  layers are now drawn at their opacity directly (the same picture; the redraw check agrees). This also
  helps battles, where fading and stealthy monsters are drawn the same way.
- **Work every frame for nothing.** While a building is held, the overlap check, its layers and its
  footprint were worked out on every frame, moved or not. Now only when it lands on another snap step, or
  the view scrolls or zooms under it (`BFOUNDATION.FollowMouseB`).
- **The footprint was a step behind.** It showed whether the *previous* spot was free (the check ran before
  the building moved). It now shows the spot under the building.

### Second round: no shadows while moving, and the yard drawn again only where it changed

Same yard, same 4x slower CPU, frames a second (`move-perf.mjs`; the `FLAGS` option gives each column):

| | as after the first round | partial redraw, shadows kept | now: partial redraw, no shadows while held |
|---|---|---|---|
| Idle yard (shadows shown) | 7.9 | 22.8 | **~21** |
| Pointer moving over the yard | 7.1 | 16.5 | **16.0** |
| Dragging a building in move mode | 7.2 | 15.2 | **17.2** |
| Placing a new building | 10.0 | 14.7 | **17.7** |

Script time while dragging went from 52 ms to 9 ms a frame, and drawing from 57 ms to 25 ms. At full speed
every case runs at the game's 40 frames a second. (Idle was measured twice at 19.9 and 22.8: the same.)

- **No shadows while a building is held** (`yardShadowsWhileMoving`, server config). The shadows go when a
  building is picked up in move mode or a new one is on the pointer, and come back when it is put down or
  cancelled (`Renderer.render`: `GLOBAL._newBuilding`, or `GLOBAL._selectedBuilding._moving`). Taking them
  away and bringing them back costs one whole-yard draw each time. Shadows are otherwise drawn as before
  (`yardShadows`).
- **The yard is drawn again only where it changed** (`yardPartialRedraw`, browser only). The yard is one
  3994 x 1994 canvas (8 million pixels) that `Renderer.as` used to clear and draw completely every frame,
  even with nothing moving. Each frame the renderer now compares every thing it draws with the last frame
  (where, what picture, which version of it, opacity, blend, filters, depth: `RasterData._rs*`) and draws
  again only the rectangles that changed, clipped, with everything under and over them in the right order.
  Big pictures that change in small parts (the ground, which effects and scorch marks are drawn onto) say
  which part changed: the browser's `BitmapData` keeps a short log of changed rectangles
  (`$trackChanges` / `$dirtySince`). Too many changes (over 70% of the yard) and it simply draws it whole.
  Scrolling and zooming do not redraw the yard (it is the same canvas, moved).
- **The browser's screen repaint** (`client-web/src/flash/display/core.ts`) now also repaints only the part
  of the yard canvas that changed, instead of all of it whenever anything on it changed. Many small changes
  are grouped into a 4 x 4 grid of the screen, so a drag no longer turns into a full-screen repaint (it was
  every frame; now about 1 frame in 120, the safety repaint).

Checked pixel for pixel: `client-web/tools/test/partial-redraw-test.mjs` draws the yard in parts and then
whole in the same frame, after idling, hovering, picking up, dragging over other buildings and putting down,
placing and cancelling a building (shadows hidden and back each time), scrolling, zooming, shadows switched off and on, and a wild attack (monsters
walking, fighting and dying, effects on the ground). No pixel differs in any of them (23 checks, with the sweep's). The screen
may differ in up to 4 pixels from a full repaint: a text field clipped on a half pixel (the level bar) is
smoothed a shade differently when the screen is repainted in parts; the redraw, move and partial-redraw
tests allow for that.

The Flash client (BYMR - Release as a Flash build) keeps drawing the whole yard every frame: Flash has no
changed-rectangle log, and Flash players are not the slow ones. It does get the shadow settings.

### Partial redraw: bugs found and fixed (26 September), and the safety sweep

- **Sulfur Bomb glow smeared across the ground.** The glow is a filter on the monster's picture, and the
  box the renderer redrew around a monster (`Renderer.measure`) was the picture without the glow, so each
  step left the edge of the last frame's glow behind: a red / orange / yellow trail over the ground and the
  buildings it passed, until something else was drawn there. The box now takes in how far every filter
  on the picture (and inside it) reaches (`filterPad` / `displayPad`, the same reach the browser uses to
  draw it). The same applied to every glow drawn in the yard: champions' and Korath's rage, laser beams,
  building highlights. Opening the Catapult menu is how a Sulfur Bomb is dropped, which is most likely
  what was seen there: the menu itself, hovered, picked from and closed at three screen sizes and pixel
  densities, matched a full repaint once the pointer stopped.
- **Pictures rewritten whole without saying so.** In the browser, `BitmapData` methods that rewrite a
  whole picture at once (noise, perlinNoise, paletteMap, threshold, copyChannel, setVector) counted the
  change but did not log it, so a logged picture (the ground) could be rewritten without the yard or the
  screen drawing it again. They log it now; so does `dispose()`.
- **A picture drawn mirrored** (negative scale) would have had an empty box, so never drawn again. The box
  is turned the right way round (nothing in the game does it today).
- **The safety sweep** (`redrawSweepMs`, 1 second). On top of drawing only what changed, the yard in view
  is drawn again from scratch a strip at a time, top to bottom, all of it once a second; the strip each
  frame covers the time since the last one, so a slow device sweeps as often, in bigger strips. Anything
  wrong on the yard is gone within a second, on the yard and on screen, with no whole frame and no stutter.
  The strip is not logged as a change of the yard canvas (`BitmapData.$quiet`) but noted as swept
  (`$noteSwept`): the screen repaints it on its own, outside the merging of its changes. Logged as a
  change, the full-width strips joined the screen's other changes and pushed it into repainting everything
  in a quarter of the frames (4 to 6 frames a second lost). A sweep of the whole screen was tried too and
  dropped: it cost the Yard Planner a fifth of its frames (heavy vector drawing, repainted a band at a
  time); with the planner open the yard is not drawn, so nothing is swept. The screen's whole repaint every
  3 seconds stays, for anything outside the yard.
  Cost, 4x slower CPU, two runs each, averaged (`move-perf.mjs`, `FLAGS=io_sweepms=0` for the first column):

  | | no sweep | sweep (1 s) |
  |---|---|---|
  | Idle yard | 19.5 | 17.6 |
  | Pointer moving over the yard | 15.0 | 14.1 |
  | Dragging a building in move mode | 16.3 | 15.5 |
  | Placing a new building | 14.3 | 14.3 |

  (Runs of the same case differ by 1 to 2 frames a second.) Drawing the whole yard once a second instead,
  as first suggested, cost about as much but stutters once a second (a whole frame is 60-90 ms here).

How it was checked: `client-web/tools/test/redraw-watch.mjs` hooks the yard renderer and, after every frame
it draws in parts, draws the same frame whole and compares the view pixel for pixel, recording what is drawn
wherever they differ; every other frame it also compares the screen with a full repaint.
`partial-redraw-hunt.mjs` plays the game under it: the own yard (hovering, clicking buildings, the building
menu, the store, highlights, moving and placing, a wild attack with monsters under a Sulfur Bomb through all
three glow colours, a jarred tower) and an attack on a tribe yard in admin test mode (the Catapult menu
opened, hovered, closed, then a Sulfur Bomb, Candy Jars and a Twig bomb each picked and dropped, 30 monsters
flung in, 20 seconds of battle). Before the fix: 240 wrong frames, all around glowing monsters. After: none
in 2,365 frames. `partial-redraw-test.mjs` also checks the sweep: a wrong patch put on the yard behind the
renderer's back, and shown on screen, is gone from both within a second without a whole frame.

(The earlier `partial-redraw-test` compared the wrong part of the yard canvas: the view's rectangle is
already in canvas pixels, and the test took the map offset off it again. Fixed, together with drawing the
frame in parts once more before comparing: an animated clip, the blinking building alert, moves on between
frames, and a frame drawn whole would show that while the last frame could not.)

Tested: `client-web/tools/test/move-test.mjs` (16 checks: see-through without the mask copy, nothing redone
while held still, red over a building and back where it was when put down there, green on free ground and
kept there, following a scrolled view, the screen matching a full redraw while moving, shadows hidden while
a building is held or placed and back after).


## The Brimstone Pit: casino, milestone 1 (27 September)

From `brimstone-pit-casino-spec.md`, delivered game by game. (The returns quoted in the milestone
sections were later raised to just under 100%: see "Returns just under 100%" at the end.) Milestone 1: the building buildable in the
Inferno, the lobby, seeds, wallet and ledger, **Magma Drop** and **Brimstone Scratchers**. The rules that
hold for every game: all bets are against the house (no player-against-player wagers); the server draws
every result; nothing adds a way to buy, cash out or trade Shiny; Inferno only.

**Building** (`INFERNOYARDPROPS.as` id 141, class `BRIMSTONEPIT.as`, art in `art/brimstonepit/`): one
from Town Hall 1, 5 levels (levels 2 to 5 use the level 1 art for now). Ids 136 to 140 are blocked stubs
(the props must be dense). The info panel has **Enter the Pit** (`btn_openbrimstonepit`, 4 languages),
in the player's own yard only, which opens `com/monsters/casino/CasinoWindow.as`.

**Server** (`server/src/services/casino/`, `controllers/casino/casino.ts`, config `config/CasinoConfig.ts`,
migration `20260927_CreateCasinoTables`):
- Tables `casino_seed` (a player's current seeds and nonce), `casino_seed_reveal` (seeds changed, now
  shown), `casino_bet` (the ledger: game, stake, payout, multiplier, outcome, seeds and nonce;
  `UNIQUE (user_id, request_id)`), `casino_session`, `casino_round`, `casino_jackpot` (row 1, 500: for
  Magma Slots, later).
- Routes (logged in, `casinoLimiter` 240 a minute): `POST|GET casino/state`, `POST casino/seed/rotate`,
  `POST|GET casino/history`, `POST casino/magmadrop/play`, `POST casino/scratch/buy`. A gate on
  `/casino` answers "closed" when `casinoConfig.enabled` is false (except `state`).
- A bet (`wallet.ts playInstant`) is one transaction: the player's seed row locked, the request id looked
  up (sent twice: the first answer again, not charged twice), the balance locked and checked, the game
  played on the seeds, `credits = credits - stake + payout` (never below 0), the ledger row, the nonce + 1.
- Refused with a message: no Pit, a Pit being built or damaged (timers advanced to now, as the game does),
  a game not open at the Pit's level, Shiny turned off on the account, bets not whole or below the minimum
  (1), more than the balance. No maximum bet and no daily cap (the user's choice; `maxBet`,
  `dailyWagerCap`, `maxPayout` in the config, 0 = none; `maxMultiplier` 1000).
- Provably fair: numbers are HMAC-SHA256(server seed, `client seed:nonce:block`), four bytes to a number
  in [0, 1). The player sees the server seed's SHA-256 before betting; changing seeds shows the old one.
- Magma Drop: 10 fair left/right bounces, the cup is the number of rights (exact binomial); low 96.54%,
  medium 96.04%, high 95.94%. Scratchers: the prize is drawn from the table first (96.0%, 31.95% of
  tickets win), then the card filled to read as it: exactly three of the prize, no other three; a losing
  card has nothing three times; no near misses on purpose. Tickets 5 / 25 / 100 (Magma from Pit level 3).
- `bun scripts/casino-rtp.ts [rounds]` checks the tables' exact returns, a simulation, the prize
  frequencies and the number stream.

**Game** (`client/scripts/com/monsters/casino/`): `CASINO.as` (calls, request ids, Shiny), `CasinoUI.as`
(buttons, panels, chips), `BetSelector.as`, `CasinoWindow.as` (Games / History / Fairness tabs, the 7 tiles,
jackpot line), `games/MagmaDropGame.as` (a Spurtz follows the path the server sent; up to 20 at once (6 before 3 October); the
Shiny shown drops by the bet when sent and rises by the prize when it lands), `games/ScratchersGame.as`
(the coating is a bitmap rubbed off with the mouse; at 70% the rest goes; "Reveal all"; the prize is shown
when the card is). The Shiny shown always ends where the server says.

**Art** (`art/casino/`, `server/public/assets/casino/`): `casino.py` models and renders with Blender
(the lobby cavern, the Magma Drop wall, peg, cup, the three cards, five symbols, the seven tiles);
`assemble.py` scales them, keys the monsters' portraits out of their white backgrounds (Spurtz ball,
Balthazar and Spurtz symbols, the tiles' monsters) and draws the three coatings. See the script's header.

Tested: `client-web/tools/test/casino-server-test.mjs` (26 checks over HTTP: gating, bad input, ledger
against balance, a request sent twice, 20 bets at once on 10 Shiny, seeds changed and every drop
recomputed from them, history, Shiny turned off) and `casino-test.mjs` (23 checks in the browser: the
building and its button, the lobby, three drops, two tickets scratched with the mouse and revealed, the
Shiny shown against the server's and the ledger, History, Fairness, no page errors).

### Milestone 2: Wormzer Roulette and Magma Slots (27 September)

**Wormzer Roulette** (Pit level 2; `services/casino/games/roulette.ts`, `casino/roulette/spin`, client
`games/RouletteGame.as`): 29 segments. 0 is King Wormzer (purple); 1 to 28 go round Spurtz, Zagnoid,
Valgos, Malphus, Balthazar, Grokus and Sabnox four times, Lava on odd segments and Ash on even ones (each
monster on two of each). A slip is up to 10 places (`bets` as JSON: `[{"on": "lava", "amount": 20}, ...]`;
the same place twice is one bet), all paid on one segment drawn evenly: a monster 7x, a colour 2x, King
Wormzer 28x, every one 96.55%. The ledger keeps one row per spin, the slip and the segment in its outcome.
The game: chips placed with a chip value, Clear, Again; the wheel turns clockwise and stops with the
segment under the pointer, Spurtz (the ball) runs the other way and drops into it; King Wormzer bursts
out when he comes up. The wheel's order is sent in `casino/state` (`rules.roulette.wheel`).

**Magma Slots** (Pit level 3; `games/slots.ts`, `casino/slots/spin`, client `games/SlotsGame.as`): three
reels of 32 stops, fixed strips in the config (Wormzer 1, Balthazar 2, Grokus 3, Valgos 4, Zagnoid 5,
Malphus 6, Spurtz 11 on each), one stop drawn per reel. Three of a kind pays 250 / 100 / 50 / 25 / 12 / 7;
exactly two Spurtz give the stake back; 93.25% without the jackpot. The reels show the stops above and
below the line from their own strips, nothing placed.

**The jackpot:** 2% of every spin's stake goes into the pool (`casino_jackpot`, now NUMERIC so a 1 Shiny
spin's 0.02 counts: migration `20260928_CasinoJackpotFraction`), in the spin's own transaction; the pool's
row stays locked to its end, so two winners at the same moment are paid one after the other (the second
finds the reset pool). Three King Wormzer (1 in 32,768) win it; it goes back to 500 (the user's choice).
**Not in the spec:** a spin wins all of the pool from 100 Shiny up (`jackpotFullBet`) and that share of it
below (10 Shiny: a tenth; the rest stays). Paid whole to any spin, the pool would be worth more than a
spin costs once it passed about 2,200 Shiny, and 1 Shiny spins would win Shiny on average. With the share
the pool settles around 65,000 and returns the 2% it takes (simulated in `casino-rtp.ts`). The idol's
brow shows the pool and what share the chosen bet would win.

Chat announcements of jackpots and big wins come with milestone 7 (the spec's plan).

Tested: `casino-m2-server-test.mjs` (21 checks: gating by level, bad slips, slips and spins against the
wheel and the reels, balance and ledger, the pool's 2%, two players hitting the jackpot at the same
moment on seeds found for it, a small bet's share, every spin recomputed from the revealed seed),
`casino-m2-test.mjs` (19 checks in the browser: chips, the wheel stopping on the segment drawn with the
ball in it, Again, King Wormzer's burst, the lever, the reels stopping on the stops drawn, the jackpot
celebrated and paid, the brow back at 500, the Shiny shown against the server's), `casino-rtp.ts` (every
Roulette bet 96.552%, Slots 93.25% and 1 in 32,768 exactly from the strips, a million of each measured).

Art (`art/casino/`): the wheel (`roulette/wheel.png`, the monsters' heads added by `assemble.py`) and its
rim with the pointer, the Moloch idol (`slots/cabinet.png`, the reels' window a hole) and its lever, every
monster's head without its white background (`monsters/<id>.png`).

### Milestone 3: Bone Pile (27 September)

**Bone Pile** (Mines, Pit level 2; `services/casino/games/bonePile.ts`, `services/casino/bonePileSessions.ts`,
`casino/bonepile/start | reveal | cashout`, client `games/BonePileGame.as`): 25 bone piles, 1 to 20 Sabnox
hiding in them (the player's choice). Each safe pile raises the multiplier to 0.96 x C(25, k) / C(25 - m, k)
after k piles with m Sabnox, rounded down to 2 decimals and held to 1000x; cash out any time after one
pile; a Sabnox loses the bet. Every stopping point returns 96% or a little less (95.3% at the worst, for
the rounding); points past 1000x pay less. (The spec's example table rounds to the nearest hundredth,
e.g. 1.94 for 1.9368; its rule, followed here, rounds down, so nothing pays over 96%.)

- A game is a `casino_session` (one open per player) and a `casino_bet` row with status `open` until it
  ends. The bet is taken and the Sabnox placed at the start, from the player's seeds (nonce used then);
  the game is sent the layout's hash, SHA-256 of `server seed:client seed:nonce:piles` (the server seed
  in it, so the few possible layouts cannot be tried against it), and the layout only when the game ends.
- Opening a pile opened already, or cashing out a game already over, answers with the game as it
  stands (10 cash-outs sent at once pay once). Opening every safe pile cashes out at once.
- A game left alone for 24 hours (`bonePile.idleHours`) is settled: cashed out if a pile was opened, the
  bet given back (status `refunded`) if not. The server does it every 10 minutes (`startCasinoJobs()` in
  `server.ts`), and `casino/state` does it for the player asking.
- `casino/state` sends the open game (`bonepile`, never its layout): the lobby shows "Your game is open"
  and opening Bone Pile picks it up, after a reload too. A game once started can be finished even if the
  Pit is damaged meanwhile.

**The Shiny shown while a result is shown:** the yard's own updates (the save and the `updatesaved`
poll every few seconds) used to set the Shiny from the server, which could show a spin's win before the
reels had stopped. While a Pit game is showing a result (`showing` on each game,
`CasinoWindow.showingResult`), `BASE` leaves the Shiny to the game, which sets it to the server's once
shown.

Tested: `casino-m3-server-test.mjs` (23 checks: gating, bad input, the bet taken, the open game shown
without its layout, one game at a time, 10 starts at once, multipliers, a pile opened twice, 10
cash-outs at once, the layout against the seeds and the hash, a Sabnox, all safe piles at 1000x, idle
games cashed out or refunded), `casino-m3-test.mjs` (10 checks in the browser: the Sabnox count, safe
piles, a reload mid-game picked up, cashing out, a Sabnox, the ledger), `casino-rtp.ts` (the spec's table,
every stopping point, even layouts, a million games played).

Art: `bonepile/grid_bg.jpg` (a cave floor with ash drifts), `pile.png` (bones and a skull),
`crystal.png` (the magma crystal under a safe pile); the Sabnox is `monsters/sabnox.png`.

Next milestones: Balthazar's Ascent (shared live rounds), Magma Derby, chat announcements of big wins,
sounds.

### The Brimstone Pit invisible (27 September)

Reported: the Pit built, but not seen in the yard. The game loads a building's pictures (top, shadow,
animations) as one group and drew nothing until every one of them had loaded: a single picture missing
on the server (here the building's art, `server/public/assets/buildings/ibrimstonepit/`, not on the live
server; or only the first art delivery there, without `anim2.1.v2.png`) left the whole building
invisible. Pictures under `public/assets` are copied into the server's image when it is built, so new
ones need `docker compose up --build` (only `kits`, `client`, `web` and `web-dev` are bound folders).

`ImageCache` now gives up on a missing picture after its retries and lets the rest of its group go on
without it: a building missing one picture is drawn with the others (a missing animation just does not
play). Checked in the browser with `anim2.1.v2.png` taken away: the Pit drawn, 5 failed fetches, no errors.

Still invisible after the pictures were put on the server: every file under a static path was sent with
`Cache-Control: public, max-age=3600`, "not found" answers too, so a browser (or the CDN) that had asked
for the Pit's pictures before they were there kept the 404 for an hour, and asked again, and kept it again.
`corsCacheControl` now marks only found files cacheable (a 404 or an error: `no-store`), and
`InfernoOnlyConfig.assetVersion` goes to 7, so every player's next load asks for the pictures afresh.
(The live server was checked: the Pit's pictures are there.)

Bug reports (27 September): #40, opening Wormzer Roulette: "Error #2006: The supplied index is out of
bounds" (its backdrop was put behind a panel that has nothing else in it; the three games now place it
by what is there). #39, the store's Zazzle picture arriving after the store had moved on (a null
`_zazzleMC`): ignored now. The casino browser tests now also fail on errors the game catches and
reports (written to the console), which is how #40 got past them.

### Slots showed three Spurtz on other wins (27 September)

Reported: a win of three Malphus (paid as three Malphus) showed three Spurtz. The browser client's player
keeps a filtered object (the glow on a winning reel cell) as a ready-made picture until something in it
changes; its check of what changed looked at a Bitmap's picture size and edit count, not at which picture
it was. A reel cell given another monster's picture (same size) under the glow kept showing the one of
the win before (two Spurtz). `client-web/src/flash/display/core.ts` (`sigNode`) now counts which bitmap
it is too. `casino-m2-test.mjs` checks it: two Spurtz, then three Malphus, the three cells on the line
compared pixel by pixel on the screen (it fails without the fix).

### Milestone 4: Balthazar's Ascent (27 September)

**Balthazar's Ascent** (crash, Pit level 4; `services/casino/games/ascent.ts`, `services/casino/ascentRounds.ts`,
`casino/ascent/state | bet | cashout`, client `games/AscentGame.as`): one round for every player at once.
10 seconds to bet, then Balthazar takes off and the multiplier climbs, m(t) = floor(100 x e^(0.00006 x t ms))
/ 100 (1.82x at 10 s, 3.32x at 20 s, 36.59x at 60 s), until a Magma Tower shoots him down at the crash
point; 4 seconds of results, then the next round. Crash point from the round's seed: floor(100 x 0.96 /
(1 - u)) / 100, at least 1.00 (4.95% of rounds end at once at 1.00x), at most 1000x; the chance of reaching
x is 0.96 / x, so every cash-out target returns 96%.

- Rounds are rows of `casino_round` (game `ascent`). A loop on the server (`startAscent()` in `server.ts`,
  every 200 ms; `pg_try_advisory_xact_lock` so only one server moves rounds on) opens rounds, starts the
  flight, pays automatic cash-outs as the multiplier passes them, settles the rest as lost at the crash
  and opens the next round. The crash point and the flight's end time are made with the round and never
  leave the server before the crash; the seed's hash is shown from the start, the seed after the crash
  (SHA-256 of it is the hash; HMAC-SHA256(seed, "ascent:0:0") gives the crash point).
- One bet a player a round, only while bets are open, with an automatic cash-out (1.01x to 1000x) or none.
  Cash-out by hand: the server's clock decides (the multiplier at that moment, if under the crash point;
  otherwise lost). 10 cash-outs sent at once pay once.
- `casino/ascent/state` (polled by the game twice a second in flight, once a second otherwise; not in the
  request log): the phase (betting, flying, crashed, waiting), the server's clock, the last 12 crash
  points, the players on the round (name, bet, cash-out) and the player's own bet. New migration
  `20260929_CasinoRounds` (indexes for rounds and their bets).
- The game draws the flight from the server's clock (it keeps the difference), Balthazar climbing with a
  trail over a scrolling lava sea, the tower firing and him spiralling down at the crash.

Tested: `casino-m4-server-test.mjs` (20 checks, two rounds made to crash where the test wants by replacing
their seed while bets are open: gating, bad bets, no crash point before the crash, the seed against its
hash and the crash point, a cash-out by hand sent 10 times, an automatic 1.50x paid in flight, the
players' list, a late cash-out and an automatic 5x lost, the ledger), `casino-m4-test.mjs` (9 checks in
the browser: the countdown, a bet, the climb, cashing out by hand, shot down, the history, an automatic
cash-out), `casino-rtp.ts` (the multiplier's values, flight times, every target 96% over a million rounds,
the rounds ending at once).

Art: `ascent/sky.jpg` (a lava sea and rock spires under a hazy cavern sky, scrolled and mirrored),
`ascent/tower.png` (the Magma Tower); Balthazar is `monsters/balthazar.png`; the shot, the burst and the
smoke are drawn in code.

### Milestone 5: Magma Derby (27 September)

**Magma Derby** (Pit level 5; `services/casino/games/derby.ts`, `services/casino/derbyRounds.ts`,
`casino/derby/state | bet`, client `games/DerbyGame.as`): a race every five minutes for every player: 4
minutes to bet, the race (40 seconds on screen), 20 seconds of results. Six of the eight monsters run,
picked by the round's seed, each with a strength drawn evenly from 1 to 6; a runner wins with the chance of
its strength over all six's. Odds (decimal, the stake included): max(1.05, floor(20 x 0.95 / chance) / 20),
so at most 95% returned on any runner (92.8% to 95%, the rounding for the house). The finishing order is
drawn the same way (the winner, then the next from those left...), and each runner's times at ten
checkpoints are made to end in it (a runner may lead early and fade, or stumble; the finish never changes).

- Rounds are rows of `casino_round` (game `derby`); a loop on the server (`startDerby()`, every 500 ms,
  one server at a time) starts races, pays the winner's bets at the end (floor(amount x odds)) and opens
  the next round. The race is drawn from the seed when the round opens; the runners, strengths and odds
  are shown for betting, the order and times only when the race starts, the seed when it is over (the
  whole race recomputes from it: HMAC-SHA256(seed, "derby:0:<block>") read in turn).
- Bets only while bets are open; a slip is one or more runners (up to 8 lines, the same runner twice is
  one bet); more slips on the same race are allowed.
- The game: the odds board (strength pips, odds, the chips on each), the clock, the race drawn from the
  checkpoint times with the view following the leader, a podium and the player's winnings at the end.

Tested: `casino-m5-server-test.mjs` (13 checks; the race's start brought forward by the test: gating, bad
slips, nothing of the race shown while bets are open, two players' slips, bets refused once it starts, the
order and times, the seed against its hash and the whole race recomputed from it, the winner paid, the
ledger, the history), `casino-m5-test.mjs` (7 checks in the browser: the board, chips on two monsters, the
race moving and followed, the podium and winnings), `casino-rtp.ts` (every runner at most 95%, 300,000
races: winners as often as their chances say, the times in the order drawn).

Art: `derby/track.jpg` (a canyon wall with bone torches over a basalt floor; the game repeats it
mirrored and draws the lanes and the finish line), `derby/finish.png` (a bone arch with a skull and a
flag); the runners are `monsters/<id>.png`.

Every game of the spec is in now. Still to do: chat announcements of jackpots and big wins (milestone 7),
sounds, the building's art for levels 2 to 5.

### Returns just under 100% (27 September)

The user asked for every game to return as close to 100% as possible, but never 100% or more. The
figures in the milestone sections above are the old ones (93% to 96.5%); these replace them
(`config/CasinoConfig.ts`, where every number is):

| Game | Change | Return to player |
|---|---|---|
| Magma Drop | low `9.4, 3, 1.5, 1.1, 1, 0.5`; medium `23.9, 5, 2, 1.5, 0.5, 0.5`; high `60.7, 12, 3, 0.9, 0.3, 0.2` (edge to middle) | 99.98% on every risk (1023.8 / 1024) |
| Scratchers | sulfur 6.5%, coal 9%, bone 12.49% of cards (the rest as before) | 99.99%; 33.94% of cards win |
| Wormzer Roulette | pays monster 7.24, colour 2.07, King Wormzer 28.99 (each under 29 / its segments) | 99.86%, 99.93%, 99.97% |
| Magma Slots | Malphus 13, Spurtz 8; the pool fills at 5% of stakes, up to 66,000; a jackpot pays the pool once per 100 Shiny staked (more than all of it on a bigger bet) | reels 97.97%, the jackpot 0.02% (pool at 500) to 2.01% (full): at most 99.99% on any spin; about 99.6% (bets of 100) to 99.95% (small bets) over time |
| Bone Pile | rtp 0.9999 | 99.99% at every stopping point, 99.2% at the worst (the multiplier rounded down to 2 decimals) |
| Balthazar's Ascent | rtp 0.9999 | 99.99% at every cash-out target; 1.0% of rounds end at once at 1.00x |
| Magma Derby | rtp 0.9999, odds rounded down to 0.01 (was 0.05) | 99.5% to 99.99% a runner, 99.9% on average |

- **Parts of a Shiny paid by chance** (`rng.ts`, `wholeShiny`). Shiny are whole, and wins of stake x
  multiplier often are not (1.5x on 1 Shiny). Rounded down, a 1 Shiny Magma Drop on low returned about
  81%, not the table's figure. Now the whole part is paid, plus one more Shiny with the chance of the part
  left over (1.5 pays 2 half the time). So every bet returns what its table says, however small. The
  number that decides is still provably fair. For an instant game it is the bet's next number after the
  game's own (Magma Drop: the 11th; Roulette: the 2nd; for a slip, the total is rounded once). For Bone
  Pile it is the number after the layout's 24, drawn at the start and kept secret with the layout. For
  Ascent and Derby it is HMAC-SHA256(round seed, "pay:<bet id>:0:0"), checkable once the seed is shown.
  The games show what a cash-out is worth with its part (Bone Pile "NOW 1.24x = 12.4 SHINY", Ascent
  "CASH OUT 37.5"). The fairness panel says how the part is decided.
- **The jackpot never makes a spin worth 100%.** A spin's jackpot is worth pool / (32,768 x 100) of its
  stake. An uncapped pool past about 66,400 would make a spin worth more than it costs, and players can
  see the pool and wait for that. So the pool stops at `jackpotMax` (66,000), where a spin returns
  97.97% + 2.01% = 99.99%. Two changes keep the jackpot's long-run share near that top:
  - The pool fills faster, at 5% of stakes. That only sets how fast the meter climbs; it is not taken
    from what the reels pay.
  - A bet over 100 wins the pool that many times over, and the house pays what the pool lacks. A 250
    Shiny jackpot pays 2.5 pools. Before, it paid one pool, so big bets got less of the jackpot for
    their stake.
- `scripts/casino-rtp.ts` now checks that every table, every Roulette bet, every Bone Pile stopping
  point, every Derby runner, Ascent's rtp and Slots at a full pool are under 100% and at least 99%. It
  also checks that 1 Shiny bets paid in whole Shiny return the table's figure. The server tests check
  each payout against the number that decides its part: Magma Drop, Roulette, Bone Pile, Ascent and
  Derby, from the revealed or stored seeds. They also check a 250 Shiny jackpot (2.5 pools) and the
  pool's cap. `casino/state` sends `jackpot_max`.

## New towers and monsters (27 September)

### Cinder Coil (144) and Obsidian Mortar (145)

From `newtowers.md`, with its art, both from Under Hall 3, 6 levels, group Defenses. `INFERNOYARDPROPS.as`
has their entries as the spec gives them (placeholders 142 and 143 keep the table one entry per id), with
`"cls"` for their classes and the Magma Tower's fortification pictures (the spec gives fortify costs).
Outposts may build two of each (`GLOBAL.IO_OUTPOST_QUANTITY`); the Yard Planner draws their range (they hit
ground and air, not burrowed).

- **Cinder Coil** (`INFERNO_CINDER_COIL.as`). Since 28 September (the user's) each shot is a cycle, in attack
  steps (80 a second):
  - **spin** 0.5 s (40 steps): the coil whirls round through its 32 aim frames, speeding up, while it
    charges (the 12-frame `anim2` overlay's frames 1-8);
  - **aim** 0.25 s (20 steps): it slows evenly to a stop pointing at its target (following it if it moves);
  - **shock**: the flash (overlay frame 9) and the arc, from the orb's prong on the side facing the target;
  - **rest** 0.25 s (20 steps): the afterglow (10, 11); then again at once while it has a target (one shot
    a second), else it waits for the tower's next look.
  Its heading is a smooth angle, not a frame number: at each spin's start the whole move (spin plus the
  aim's even slow-down) is sized to end on the target (the turn needed plus whole turns, most of a turn or
  more), so it never jumps, turns back or speeds up while aiming (at most about 2 frames a step). The
  first version charged 0.4 s with the aim held, on the tower's own timer (60 steps, 0.75 s a shot): one
  shot a second is a quarter slower. On the flash it hits the target it turned to if it is still alive and
  in range, else the closest monster in range, else fizzles. The arc (`EFFECTS.Lightning`, orange) hits it for damage x (0.5 + 0.5 x health / max) (x 1.25
  under Tower Overdrive), then leaps to the closest monster not yet hit within `ext.jumpRadius` (70), 20% less
  each leap, `ext.jumps` times (2 to 6). Destroyed mid-cycle: no shot. Under a Candy Jar it hits the glass.
  The cycle runs on attack ticks (not frames), so it keeps time when frames drop. (The game runs 80
  attack ticks a second, `GLOBAL`'s loop banks 2/25 of a step per ms.)
- **Obsidian Mortar** (`INFERNO_OBSIDIAN_MORTAR.as`). Targets the closest monster between `ext.minRange`
  (100) and its range (its own `FindTargets` / `targetInRange`). A shell (`ObsidianShell`: an obsidian chunk
  and its shadow on the ground) is lobbed to where the target stood when it fired. Since 28 September (the
  user's: it looked unnatural) the flight is a real lob: `ObsidianShell.flightSteps` = (40 + distance / 10)
  x 7 / speed steps, at least 40 (about 0.6 s close in to 1 s at full range; it used to be distance / speed,
  0.3 to 0.6 s), over an arc 40 + 30% of the distance high; even across the ground, a parabola up and down,
  turning over once, a little bigger at the top, its shadow smaller and fainter under it, embers trailing; it
  is placed on every step (skipping undrawn steps made it jump). There there everything within the splash takes damage from 100% at the middle to 50% at the edge, and
  razor shards and a ring show it. Shells fly on attack ticks and still land after the tower falls.
- A building drawn only as an anim strip (no `top`) now keeps its damaged state when it has damaged
  strips: `imageData.noTop` (BFOUNDATION's render took "no damaged top" to mean "no damaged pictures").
- Strings in the four languages (`#bi_cindercoil#`, `bi_cindercoil_desc`, ...).

### Clinkerjaw (IC12) and Flickerfiend (IC14)

The two the user picked from the Strongbox proposals (the "Inferno monsters" chat), with the art from
`inferno-ic12-ic14-assets.zip` (sprite sheets `monsters/clinkerjaw.png`, `flickerfiend.png`: 30 facings 12
degrees apart by rows 0 idle, 1-8 walking, and 9-12 Flickerfiend's blink; portraits, icons; the unlock
picture `popups/IC12-150.png` made from the 150 portrait). The ids keep the proposals' numbers (IC9 and IC10
are Korath and Drull here; nothing walks the Inferno ids by number past IC8).

| | Clinkerjaw (IC12) | Flickerfiend (IC14) |
|---|---|---|
| Strongbox | page 2 after Malphus, 96,000 Sulfur, 1 day | page 3 after Sabnox, 819,200 Sulfur, 30 hours |
| Academy | the unlock x 1, 2, 3, 4, 6 (Sulfur and time) | the same |
| Housing, target | 40, anything | 35, anything |
| Health (L1-6) | 1,500 - 2,700 | 2,200 - 3,700 |
| Damage | 180 - 300 | 420 - 680 |
| Hatch (magma) | 18,000 - 38,000 | 60,000 - 190,000 |
| Ability | on death, 2 small Spurtz (levels 1-3) or 3 (4-6), at the sender's Spurtz level, and a healing pool of magma | every 3rd strike on a building, a blink to another building within 400; does not set traps off |

- `CREATURELOCKER.ioAddNewMonsters` (their entries), the server's `monsterStats.ts` (`infernoNewMonsters`,
  identical props: every attack's are compared) and `monsterKeys.ts`. `index` 4.5 and 7.5 place them in the
  Hatchery after Malphus and Sabnox. The Academy's pages (`ACADEMYPOPUP.ioRoster`), the Monster Bunker, and
  admin test mode's "every monster" include them. Moloch's attacks do not use them (`WMATTACK` unchanged).
- **Clinkerjaw** (`creeps/inferno/Clinkerjaw.as`): `DeathSplit` into IC1, the `splits` prop. Changed 27
  September (second round):
  - The Spurtz that hatch are small ones (`Clinkerjaw.hatchling`, through `DeathSplit`'s new optional
    `onSpawn`): drawn from their own sheet at 3/4 size (`monsters/spurtz_small.png`, sprite "IC1s": the
    Spurtz sheet scaled frame by frame to 18 x 21, feet on the same ground line; `CreepBase.ioSkin`) and
    moving at 3/4 of a Spurtz's speed (a `MultiplicationPropertyModifier(0.75)` on `moveSpeedProperty`).
    Health, damage, attack speed, targets and loot are a Spurtz's. They are still IC1 to everything else,
    and `ioHatchling` marks them.
  - It leaves a pool of magma (`creeps/inferno/MagmaPuddle.as`, `effects/magma_puddle.png`) where it dies.
    For 6 seconds of game time (480 ticks) every monster of its side within 50 ground units (about a trap's
    blast; the picture is about that size, 150 x 80) that is hurt gets 100 health, once: a pool heals each
    monster one time only, never above its full health, and a monster at full health is not counted (it
    can still be healed if it comes back hurt while the pool lasts). The picture lies on the ground under the
    monsters and buildings (a `RasterData` at depth 1.5), pulses a little and fades out over its last
    second. Pools tick in `CREEPS.Tick` and are cleared in `MAP.Clear`. A Clinkerjaw in a Housing (a
    friendly one that never left) drops none, as it hatches none.
- **Flickerfiend** (`creeps/inferno/Flickerfiend.as`): its own blink (the stock `BlinkOnAttack` has never
  been used and could not work: it paths to the new building from where it stands). After its third
  strike on a building it picks another building within 400 (twice the first 200; not a wall, trap,
  decoration or a jarred tower), fades out over 32 ticks (0.4 s) showing the four shimmer rows once from the
  first, a frame every 8 ticks, is gone (not drawn at all) for a full second (80 ticks), reappears just
  outside that building's edge (on the side it came from), shimmers back in over 24 ticks (0.3 s), then goes
  for it. (Its fades were 8 ticks each, a tenth of a second, with the shimmer at a frame every 4: too quick
  to see; slowed 28 September.) It stands still for the whole blink (it used to keep sliding along its old
  path, and could come out on a neighbouring building and go for that instead). While it shimmers it cannot be targeted and takes no damage (shots already fired at it
  miss). It is too nimble to set traps off (`Targeting.ioSkipsTraps`, used by `BTRAP.FindTargets`, as for
  flyers); a trap something else sets off still catches it in the blast unless it is shimmering.

### Inferno art for six buildings (27 September, second round)

The user's `inferno_building_assets.zip`: Inferno remakes of six buildings that used the overworld's art.
Each folder went into `server/public/assets/buildings/` and the building's `imageData` in
`INFERNOYARDPROPS.as` was swapped for the pack's (new `baseurl` and registration points; the building
buttons, thumbnails and fortifications are unchanged). Outposts take the same props (`GLOBAL.ioBuildOutpostProps`
copies them). The overworld folders stay: the overworld yard still uses them.

| Building | Folder | Levels (image keys) |
|---|---|---|
| General Store (12) | `igeneralstore/` | 1 |
| Hatchery Control Center (16) | `ihatcherycontrolcenter/` | 1 |
| Flinger (5) | `iflinger/` | 1-4 (one shared destroyed picture, `top.2.destroyed`) |
| Catapult (51) | `icatapult/` | 1-3 (shared `top.3.destroyed`) |
| Map Room (11) | `imaproom/` | 1 |
| Monster Juicer (9) | `imonsterjuiceloosener/` | 1, with the churning `anim.2.png` (51 frames of 60 x 39) |

The pack's Juicer snippet keyed its pictures as level `2` (as the overworld's props do); the Inferno's Juicer
entry keys them `1`, and `BFOUNDATION.Render` only looks at the building's level and below, so with `2` a
level 1 Juicer would have drawn nothing. It is keyed `1` here. `inferno-building-art-test.mjs` puts all six
in the test yard and shows every level whole, damaged and destroyed (SHOTS/art-<folder>.png).

**Missing damaged and destroyed pictures** (the same day, a second pack): three Inferno buildings asked for
pictures that were not on the server (404s when they were hurt or fell):
- Bone Cruncher from level 3 (`imageData` key 3): `iboneharvester/top.2.damaged.png` and
  `top.2.destroyed.png`. The art was already there as `Bone_Cruncher_2_Damaged.png` and
  `Bone_Cruncher_2_Destroyed.png`; now under the names the props use, and the destroyed picture moved to
  (-47, 2) to sit on the footprint. The old-named copies are no longer used.
- Coal Extractor from level 3: `icoalproducer/shadow.2.destroyed.jpg` (the same picture as the unused
  `shadow.2.destroyed.v2.jpg`).
- Magma Tower, damaged: new `imagmatower/anim.1.damaged.v2.png` (the turret, 31 aim frames of 52 x 43, at
  (-28.6, -43)) and `anim.2.damaged.v2.png` (the base, 31 frames of 38 x 19). The props named the second
  strip `animdamaged2`, which nothing reads (`BFOUNDATION` looks for `anim2` + the state): now
  `anim2damaged`, so a damaged Magma Tower shows both strips.
The pack's own `INFERNOYARDPROPS.as` was an older copy (it would have undone the building art above, the
Strongbox's level 5 and more), so only its three changes were taken.

**Yard Planner** (the same day, a third pack, `inferno_yardplanner.zip`): the Yard Planner (10) has its own
Inferno art, `buildings/iyardplanner/` (whole, damaged, destroyed; level 1 only, as the building has one
level), with the pack's registration points in `INFERNOYARDPROPS.as`. The overworld's `yardplanner/`
stays for the overworld yard. `inferno-building-art-test.mjs` shows it with the others.

**Resource generators by level band** (29 September, `inferno_resource_generators.zip` and
`inferno_magmaextractor.zip`, whose magma folders are the same): the Bone Cruncher (1), Coal Extractor (2),
Sulfur Extractor (3) and Magma Extractor (4) have 10 levels, drawn in four bands, the `imageData` keys 1
(levels 1-2), 3 (3-5), 6 (6-9) and 10 (level 10): a building takes the highest key at or under its level.
Before the pack there were only keys 1 and 3, so levels 6-10 showed the 3-5 art, and the Magma Extractor's
key 3 was a copy of its level 1 art.

| Generator | 1-2 | 3-5 | 6-9 | 10 |
|---|---|---|---|---|
| Bone Cruncher (`iboneharvester`) | as before | as before, shadows added (below) | pack `*.3` | pack `*.4` |
| Coal Extractor (`icoalproducer`) | as before | as before | pack `*.3` | pack `*.4` |
| Sulfur Extractor (`isulpherproducer`) | as before | as before | pack `*.3` | pack `*.4` |
| Magma Extractor (`imagmaproducer`) | as before | pack `*.2.v3` (was the level 1 art) | pack `*.3` | pack `*.4` |

Every band has whole, damaged and destroyed: an anim strip, a top and a shadow each (the anim strips are
one row: frames x frame width, checked against the snippets: Bone 50 frames, Coal and Sulfur 45, Magma 49).
The pack's `imageData` snippets went in as given, except the Bone Cruncher's damaged shadows (below).

**Made to fill the gaps** (29 September, second round): the Bone Cruncher was the one generator with
shadows missing: its 3-5 band never had a damaged or destroyed shadow (commented out in the original; the
pictures were never shipped), and the pack reused the standing shadow for 6-9 and 10 damaged. Four
pictures were made in `buildings/iboneharvester/`:
- `shadow.2.damaged.jpg`, `shadow.3.damaged.jpg`, `shadow.4.damaged.jpg` (at each band's standing-shadow
  point): the band's standing shadow shortened by how much lower the damaged building stands (x0.90, x0.86,
  x0.83, from the damaged top against the whole anim and top), about the corner under the building, with a
  few soft notches on its far edge. The game's and the pack's own damaged shadows are their standing shadow,
  moved a little (Coal, Magma) or reshaped (Sulfur), so these keep the look.
- `shadow.2.destroyed.jpg` (133 x 85 at (-58, -8)): the 3-5 rubble's (`top.2.destroyed.png`) own shadow,
  made the way the pack's 6-9 and 10 rubble shadows are (the rubble's outline, spread and blurred, core
  grey 70): the recipe was fitted to those two and reproduces them.
Same size and greys as the pack (standing and damaged core 110, rubble 70; white where there is none, as
the game multiplies them onto the ground). The scripts that made them are not in the repo.
`inferno-building-art-test.mjs` shows each generator at levels
1, 3, 6 and 10, whole, damaged and destroyed (`SHOTS/art-<folder>.png`), and checks each band draws from
its own strip with all its frames and every picture of the pack is served.

### Ashkarr, the Ember Herald (IC24)

The user's `ASHKARR.md` and `ashkarr-ic24-assets.zip`: Moloch's warlord as a champion-class monster.

- **Where:** Strongbox page 5 after Korath and Drull (Strongbox level 5). Her unlock and Academy cost what
  Korath's and Drull's do (the user's choice over the spec's): 12,288,000 Sulfur and 7.5 days to unlock, the
  Academy's five steps 16M, 19M, 22M, 25M, 28M over 1, 1.5, 2, 2.5, 3 days, to level 6 (times before the
  server's time divisor). Hatched with magma (2.2M to 5.2M, which Korath and Drull now cost too), 4,200 s; healing 30% of that,
  1,260 s.
- **Fixed with her:** Korath and Drull shared one Academy table, and `ioScaleTimes` divides each monster's
  table in place, so their Academy times were divided by the time divisor twice (a third time once Ashkarr
  shared it). Each champion now gets its own copy.
- **Housing: 600**, as Korath and Drull (the user's choice; the spec said 220). Not bunkerable, as the
  champions.
- **Stats per level:** health 20,000, 24,000, 28,000, 32,000, 36,000, 40,000 (the user's, 28 September; the
  spec had 30,000 to 51,000), damage 3,000 to 5,100, speed 2.0 to 2.5 (the spec's).
  Client `CREATURELOCKER.ioAddChampionMonsters`, server `monsterStats.ts` (identical: the server checks
  every attack's). The server guards her unlock as Korath's (`lockedMonsters.ts`: a save can't mark her
  unlocked unless the Strongbox started it or shiny paid for it).
- **War-cry** (`components/abilities/WarCry.as`): while she is in battle she roars at once and then every 10
  seconds (800 game steps; the game runs 80 a second, so the timing is in steps, not the clock). Every
  monster of her side within 300 (not herself) moves faster for 11 seconds (880 steps): x1.20, 1.22, 1.25,
  1.28, 1.31, 1.35 by her level (`WarCryBoost.as`, speed only). The boost outlasts the wait, so a monster
  still in range at the next roar keeps it without a break. Every monster of the other side within 300 is
  rooted for 7 seconds (560 steps; `StunEffect.as`: its speed held at 0.001; its attacks untouched), so the
  other side has 3 seconds free in every 10. Champions and guardians are rooted too. Boosted monsters glow
  pink (0xFF33FF, the rage bomb's colour, softer); rooted ones have a faint white glow; each goes with its
  effect (the user's, 28 September; the spec had no glow).
- **Two or more Ashkarrs never stack.** A monster has one `WarCryBoost` whichever Ashkarr roared. It
  remembers each Ashkarr's roar for its own 11 seconds and applies only the strongest still running, as one
  modifier: two level 6 Ashkarrs give x1.35, a level 1 and a level 6 give x1.35 (not 1.20 x 1.35); when the
  stronger one's time runs out, the weaker one's (if still running) takes over, and with none left the
  monster is back to its own speed. The Ashkarrs boost each other the same way. Roots don't stack either
  (another roar only makes one last longer). The boost is its own modifier, so it multiplies with a rage
  bomb's `Enrage` (x1.5 x1.35).
- **Art:** `monsters/ashkarr.png` (16 facings x 38 rows of 188 x 128: walk 0-9, attack 10-19, war-cry 20-29,
  idle 30-37). She draws herself (`creeps/inferno/Ashkarr.as`: her own 188 x 128 canvas, her feet (94, 102)
  on her spot). The column is her heading / 22.5 (the game's rotation: 0 right, 90 towards the camera, as
  the sheet), with no -45 as Korath's champion sheets need. The war-cry rows play once through (80 steps)
  from their first frame at each roar, with a monster growl. Portraits `IC24-portrait.jpg`, `-150.jpg`,
  `-medium.jpg`, `-small.png`. Strings in the four languages (`#m_ashkarr#`, `mi_Ashkarr_desc`, ...; the
  description shortened to fit the Strongbox).
- Not done (optional in the spec): Moloch's attacks don't send her (`WMATTACK`, `tribeSpawns`).

Tested: `client-web/tools/test/ashkarr-test.mjs` (26 checks).

### Fusebug (IC15) and Emberghoul (IC20) (28 September)

The user's `FUSEBUG_EMBERGHOUL.md` and `fusebug-emberghoul-assets.zip`; numbers as the spec's.

- **The Fusebug is IC15, not the spec's IC19.** The Hatchery passes monsters around as bare numbers and
  turns them back into ids (`HATCHERYPOPUP.ioMonsterId`: the Inferno id when there is one), and 19 is
  Rezghul's (C19, an Inferno monster here): an IC19 would have taken his place in the Hatchery. Its pictures
  are the pack's `IC19-*` renamed `IC15-*`. The Emberghoul keeps IC20 (no C20 in the Inferno).
- **Fusebug** (`creeps/inferno/Fusebug.as`): Strongbox page 1 after Zagnoid (level 1; 19,200 Sulfur, 16 h), housing
  10, targets defences (`targetGroup` 4), health 180-300, damage 500-1,200, speed 2.8. `"explode": [1]`: it
  blows up on its first attack with the game's own `CreepBase.explode()` (Eye-ra's): buildings within about
  60 and defending ground monsters within about 90 take it, falling off with distance, then it dies. The
  attack log says "A Fusebug blew up!" (`attack_log_fusebug`), not Eye-ra's line. Magma 1,500-16,000.
  It gets close first (the user's, 28 September): a creep stops at the edge of a building's footprint, and
  the stock blast is measured from the building's corner (a dropped result in `CreepBase.explode`), so it
  went off 30-45 away and a level 1 blast did about 330 of 500. Now, at a building, it walks on in (walk
  frames) until it is within 12 of the building's middle (at most 1.5 s), and its blast is measured from the
  middle: nearly the full blast (490 in the test). Against a defender that caught it, it goes off at once.
- **Emberghoul** (`creeps/inferno/Emberghoul.as`, `components/abilities/LifestealOnAttack.as`): page 4 after
  King Wormzer and Rezghul (level 4; 5,120,000 Sulfur, 3 days), housing 100, targets anything, health
  4,000-6,500, damage 1,000-2,000, speed 2.4-2.9. Every hit heals it 15% (level 1) to 20% (level 6) of the
  damage the hit actually did, never above its maximum. Its level comes from its health (as Ashkarr's; the
  spec's code took the requested level, which is 0 for a hatched monster). Its sheet is wider than a creep's
  canvas, so it draws on its own 66 x 45 canvas with its feet (33, 38) on its spot. Magma 420,000-1,210,000.
- Both: sheets `monsters/fusebug.png` (30 facings x 9 rows of 52 x 38) and `emberghoul.png` (30 x 17 of
  66 x 45: standing, walk 1-8, attack 9-16); portraits, icons, and `popups/IC15-150.png`, `IC20-150.png` (the
  unlock and Academy pictures; Ashkarr's `IC24-150.png` was missing too and is added). In the Academy after
  Zagnoid and after King Wormzer, allowed in bunkers, in admin test mode. Academy costs the unlock times 1,
  2, 3, 4, 6. Strings in the four languages. Client `CREATURELOCKER.ioAddNewMonsters`, server
  `monsterStats.ts` (identical) and `monsterKeys.ts`. Not in Moloch's attacks (the spec's optional step).

**Standing frames for the new monsters** (the user's, 28 September): stock creeps play their walk all the
time, also while they hit something or stand. The Fusebug, Clinkerjaw, Flickerfiend and Emberghoul now walk
only while they move (`CreepBase.ioAction`, `IO_STILL`): at their target the Emberghoul plays its attack
rows and the others show their standing frame (row 0); held still otherwise (rooted, waiting; no move for 3
drawn frames, `ioStandingStill`) they stand too. The Flickerfiend's shimmer is left as it is. Korath, Drull
and Ashkarr already had attack and standing frames; they now also stand when held still.

**Their words when the language file is old** (the same day): the Strongbox showed the two with no name or
description on the live game, because the language file (`gamestage/assets/<language>.json`) was loaded
under the same name every time, so a browser or proxy could keep serving the copy from before the deploy.
`KEYS.Setup` now asks for it with `?t=<minutes>` (a fresh copy each session), and `KEYS.IO_FALLBACK` holds
the English names, descriptions and stream lines of the Inferno's added monsters (Clinkerjaw, Flickerfiend,
Ashkarr, Fusebug, Emberghoul), used whenever the file lacks one. The JSON files stay the ones to edit (add
the English to `IO_FALLBACK` too for a new monster).

Tested: `client-web/tools/test/fusebug-emberghoul-test.mjs` (18 checks); the Coil and Mortar in
`new-towers-test.mjs`, the Flickerfiend's shimmer in `new-monsters-test.mjs`.

### Smaller fixes

- **Moloch's Gauntlet's button** is in the workers' column on the right, centred under the fifth worker
  with a 14 pixel gap (`UI_WORKERS.ioAddUnderWorkers`; it moves and hides with the column). Its tip points
  left like the workers'. (`bubblepopupRight.Update` looped forever on a tip with more lines than it was told:
  it now stops at 700 pixels wide, and the tip says how many lines it has.)
- **Clicking buildings.** Each building type's hit area was a vector shape drawn for the overworld art, and
  it matched the Inferno pictures badly. The hit clip's `hitArea` is now made from the building's own
  pictures (`BFOUNDATION.ioBuildHit`): every 3 x 3 square where the top or any frame of the animation is
  solid, grown by a square, plus the footprint, worked out once per set of pictures. With the bitmap renderer
  the hit clips were never sorted, so where buildings overlapped the one behind could take the click:
  `MAP.SortDepth` now keeps them in drawing order.
- **Hover glow.** The building under the mouse glows white (`ioShowGlow`): a picture of all its parts as they
  are, with a knocked-out white glow, drawn just under the building, so only its outline shows and buildings in
  front still cover it. Not while attacking, moving or placing.
- **Register form**: "We recommend a fake email and a password you do not use elsewhere!" under the form, in a
  dark red glow that pulses (register form only).
- **Balthazar** no longer sets off traps (a trap's blast set off by something else still hurts him if he is by
  it) and Quake towers neither fire at him nor hurt him (`Targeting.ioAirborne`; his class clears his flying
  and ground flags so every tower hits him, so the ground-only defences leave him out by hand).
- **Sulfur Bombs** reach burrowed monsters (`ResourceBomb.Damage` skipped monsters not drawn).

Tested: `new-towers-test.mjs` (19), `new-monsters-test.mjs` (16), `ui-fixes-test.mjs` (22); Flash compiles.

## Balance pass (30 September)

From the balance report ("Inferno Balance Report"), with the user's changes to it. Targets: the strongest
army of an equal Under Hall destroys about 90 / 70 / 60 / 45 / 40 / 35% of the yard at Under Halls 1-6 (an
army of Zagnoid alone still takes 100% at Under Hall 1). The Rezghul, Quake and Ashkarr changes below are
the user's and were not tested in battles; the rest was.

**Towers** (`INFERNOYARDPROPS.as`). Each level's damage is multiplied by a factor for the Under Hall that
unlocks it (x2.5 at 1, x1.95 at 2, x1.32 at 3, x1.2 at 4, x1.16 at 5, x1.25 at 6), and on top the Magma Tower
by 0.85, the Obsidian Mortar by 0.9 and the Blast Tower by 1.3. Damage per shot by level:

| Tower | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Sharpshooter (21) | 250 | 410 | 422 | 516 | 648 | 754 | 950 |
| Blast Tower (130) | 65 | 101 | 103 | 125 | 156 | 181 | 228 |
| Magma Tower (132) | 202 | 245 | 306 | 355 | 414 | 510 | |
| Quake Tower (129) | 1,452 | 2,016 | 2,664 | 3,341 | 4,222 | 5,500 | |
| Cinder Coil (144) | 198 | 252 | 336 | 406 | 499 | 650 | |
| Obsidian Mortar (145) | 356 | 454 | 605 | 752 | 940 | 1,238 | |

- **Quake Tower** (`INFERNOQUAKETOWER.Quake`): still hits every monster on or under the ground in range, less
  the further out it is, now down to a fifth of the blow at the edge (it never went below a third).
- **Obsidian Mortar**: splash 50-80 -> 35-56 (x0.7). **Blast Tower**: range +20 at every level (160-220 ->
  180-240).

**Yard.** Generators (all four) health at levels 8-10 45,000 / 85,000 / 165,000 -> 34,000 / 52,000 / 80,000;
Resource Pod 55,600 / 105,000 / 190,000 -> 40,000 / 60,000 / 90,000. Compound capacity 200 / 300 / 520 / 780 /
1,140 / 1,820 -> 200 / 300 / 520 / 1,000 / 1,800 / 2,000.

**Monsters** (`CREATURELOCKER.as` and the server's `monsterStats.ts`, which must match: the client sends the
stats with every attack):
- Spurtz, Zagnoid, Fusebug, Malphus, Clinkerjaw and Flickerfiend: levels 4-6 health x1.2 / x1.4 / x1.6 and
  damage x1.15 / x1.3 / x1.4; on top, Fusebug health x1.5, Malphus x1.3, Clinkerjaw x1.2 at every level.
- King Wormzer: health 5,600 / 6,300 / 7,000 / 10,000 / 11,800 / 14,000, damage 1,100 / 1,200 / 1,300 / 1,500 /
  1,800 / 2,000 (was 6,200-16,000 and 1,200-2,500).
- Valgos levels 1-3: health x0.8 / x0.8 / x0.85, damage x0.7 / x0.7 / x0.75. Balthazar levels 1-3: health
  x0.7 / x0.7 / x0.8, damage x0.8 / x0.8 / x0.9. Emberghoul levels 1-3: health and damage x0.92.
- Emberghoul lifesteal 15-20% -> 8-12% of each hit (`Emberghoul.STEAL`).
- Sabnox: housing 80 -> 65, health x1.3.
- Ashkarr: health x1.25 (20,000-40,000 -> 25,000-50,000); damage unchanged.
- Rezghul (Inferno, `CREATURELOCKER.ioApplyRezghul`; the server's table the same in `monsterStats.ts`): housing
  250 -> 200. The monsters he raises come back with 75% of their health (zombie health multiplier 0.75; it was
  x1.0-1.5) and 1.0-1.2 times their damage (was x1.0-1.5); a champion (Korath, Drull, Ashkarr: the
  Strongbox's level-5 page) comes back with 25% of its health (`RezghulResurrectAttack`,
  `Zombiefy.ioCloneWithHealth`). Champions can still be raised.

Checked: Flash compiles (only the usual CreepType error), `npm run convert` 1565/1565, server `tsc`, the game
loads with the new numbers and the client's and server's monster tables agree. Not run: the balance
battles again, and the test scripts whose expected numbers were updated (`fusebug-emberghoul-test.mjs`,
`ashkarr-test.mjs`, `new-towers-test.mjs`, `sulfur-jars-test.mjs`).

## Map Room 2 art (30 September)

The user's `hell-maproom2.zip` (`HELL_MAPROOM2.md`): the map's own art is the Inferno's, instead of the
overworld tiles re-coloured at runtime.

- **`client/scripts/_assets/assets.swf`** replaced by the pack's. Checked tag by tag against the old one:
  only the 19 bitmaps of the map cell (11 ground tiles, 8 player base icons) and the lava surface's shape
  (`mcWater`, now molten orange at about 24% instead of blue) differ; every other tag is identical.
  - Ground: deep lava, lava, shallow lava (below 100), fine bone dust and crushed bone (100-109),
    netherrack getting darker as it rises (110-169), black rock with magma veins (170-174) and a black
    peak with a vent (175+). Cliff sides are black basalt with glowing cracks.
  - Player bases: the main yard is the Under Hall (L3), the outpost the Inferno outpost hall; each whole,
    damaged, destroyed and protected (steel grey under the bubble).
- **Four pictures of every ground tile** (`HellTileVariants.as`, `hellmap/HellTile_*.as`, 33 PNGs in
  `_assets/hellmap/`, 150 x 100): variation 1 is the SWF's, 2-4 are drawn as a Bitmap under the frame's
  ground (which is hidden), so it follows the cell's height and stays under the glow, lava and base icon.
  The variation comes from the cell's coordinates, so a cell always shows the same one and touching cells
  almost never share one. The tiles repeat seamlessly on the hex grid, and the variations differ only
  inside the hex. `MapRoomCell.ApplyGroundVariant` / `ResetGroundVariant` (a cell sent back to its empty
  frame while scrolling: the three places in `MapRoomPopup`).
- **No more tinting:** `InfernoMapTheme.apply` only takes the "not loaded yet" darkening off
  (`applyUnloaded` stays). The lava, ash, scorched and basalt colour transforms are gone.
- **World map and minimap colours** (`IoMapLod.terrainColour`) taken from the new tiles, at about half
  brightness so the dots stand out.
- The pack's own `MapRoomCell.as` and `MapRoomPopup.as` were older copies (they would have undone the
  map-room work of 25-29 September); only their changes were taken.
- Browser client: the 33 PNGs are `[Embed]` pictures (`public/embed/_assets/hellmap/`, 1.1 MB, loaded
  with the game), the SWF's bitmaps come from `npm run assets`.

Checked: Flash compiles; in the browser the map at the close, far and world steps (167 of 224 cells on
screen drew a variation 2-4, as expected for three in four), no page errors;
`map-snapshot-test.mjs` passes.

## Warts (30 September)

The user's `inferno-warts.zip` (`INFERNO_WARTS.md`): the yard's mushrooms are warts (crimson caps with
ember pores on charred, lava-cracked stems). Nothing else about them changes: they grow back every day, a
worker picks them, and one in four is golden and pays 3 or 8 Shiny as before.

- **Art:** `_assets/warts/wart1-6.png` and `wart1-6_shadow.jpg`, one pair per mushroom frame, each the size of
  the bitmap it stands in for. Embedded as `com/monsters/display/warts/IoWartSprite1-6.as` and
  `IoWartShadow1-6.as`; `IoWarts.as` builds each as a MovieClip holding the bitmap at the frame's offset from
  the origin (the offsets stored in the mushroom shapes of `assets.swf`), not smoothed. MovieClips because
  `RasterData` measures a MovieClip's rect. `assets.swf` is untouched, as the pack asks.
- **`BMUSHROOM.PlaceB`:** in the Inferno, `ioPlaceWart()` draws the wart and its shadow (MULTIPLY, at the
  shadow depth) in place of `doodad_mushroom_mc` / `doodad_mushroom_shadow`, with or without the renderer.
- **Six kinds:** `MUSHROOMS` spawns frames 1-6 in the Inferno (the stock game uses 1-5; the sixth, the tall
  one, existed but was never picked). Frames already saved (1-5) draw as before.
- **Words** (four languages; `KEYS.IO_FALLBACK` has the English): `#b_wart#` ("Wart", the name in
  `INFERNOYARDPROPS` id 7), `pop_wart_msg2-4` (the worker's lines: "Mmmm, wart stew.", "These things sprout
  like boils.", "Just an old wart.") and `pop_goldenwart_desc`. The golden popup's title ("Your worker struck
  gold!") and "I found N Shiny!" are shared with the mushrooms. The mushroom keys are unchanged.
- **Pictures:** `buildingthumbs/7_inferno.png` (the pack's 40 x 40, set in `INFERNOYARDPROPS` id 7) and
  `popups/goldwart.png` (140 x 140: the pack's wart with its cap turned gold, on scorched ground, with
  sparkles), shown by the golden wart's popup.
- Browser client: the 12 pictures are `[Embed]` art (`public/embed/_assets/warts/`, 27 KB).

Tested: `client-web/tools/test/warts-test.mjs` (9 checks: art and offsets of all six, names, thumbnail,
worker line, golden popup and picture, the spawn picking the sixth, no page errors). Flash compiles (only the
known `CreepType` error), and a test SWF with the twelve embeds builds.

## Yard grounds by cell height (30 September)

The user's `hell-yard-grounds.zip` (`HELL_YARD_GROUNDS.md`, v2): outposts and wild monster yards on Map Room 2
stand on a ground that matches their map cell's height, the same bands as the map's own tiles. Main yards
(yours, and other players' when attacked or viewed) keep the lava ground.

| Cell | Height | Ground (`MAPBG` texture) |
|---|---|---|
| sand1 | 100-104 | `hell_sand1`: scattered bones on dark volcanic rock |
| sand2 | 105-109 | `hell_sand2`: denser charred bones, the odd skull |
| land1 | 110-119 | `hell_land1`: red-tinted Inferno ground, few lava bits |
| land2 | 120-139 | `hell_land2`: darker, more lava |
| land3 | 140-159 | `hell_land3`: darker still, lava cracks |
| land4 | 160-169 | `hell_land4`: darkest netherrack, most lava |
| land5 | 170-174 | `hell_land5`: black rock chunks, thin magma cracks |
| land6 | 175+ | `hell_land6`: black rock with more magma |

- **`BASE.as`** (where the yard's ground is chosen): in the Inferno, a yard loaded from a map cell as an
  outpost (yours or another player's) or as a wild monster yard (`WMATTACK` / `WMVIEW`) takes
  `MapRoomCell.ioYardGround`; everything else keeps `lava` (main yards, Moloch's descent, the Gauntlet, a yard
  with no cell).
- **`MapRoomCell.ioYardGround`**: the ground for the cell's height (null below 100, where no yard stands).
  Worked out from the height, not the cell's picture, so it is also right for the cell `BASE.LoadNext` builds
  from the map data. The pack's `MapRoomCell.as` and `BASE.as` were older copies, so only their intent was
  taken; the pack's `BASE` change on its own would have been overridden by the Inferno's `lava` line.
- **`MAPBG.as`** (the pack's): the two bone grounds return their seamless 1000 x 500 sheet
  (`hell_sand1_big`, `hell_sand2_big`), so bones don't ghost through each other in the cross-fade; the six
  others blend four 200 x 100 tiles (`hell_land1_1` ... `hell_land6_4`) like the stock grounds.
- **Art:** `_assets/hellyard/` (26 pictures), stored as JPG at quality 95. The pack's PNGs were 3.7 MB; these
  are 1.4 MB and look the same (the stock grounds are JPG too). The browser client loads them with the game
  (`public/embed/_assets/hellyard/`).

Tested: `client-web/tools/test/yard-grounds-test.mjs` (5 checks: main yard lava, an outpost on its cell's
ground, all eight grounds build a 1000 x 500 tile and draw, a wild monster yard on its cell's ground, no page
errors). Flash compiles (only the known `CreepType` error), and a test SWF with the 26 embeds builds.

## Friends invited in the admin panel (30 September)

A player's card in the admin panel (Players, open) has a **Friends invited** card:
- **Accepted:** how many players registered through this player's invite link, and how many of those were
  paid; the player's invite code; who invited this player, if anyone (a link to their card).
- **One row per friend:** name (opens their card), when their yard was made, and the shiny:
  - *paid*: both got the referral shiny (250);
  - *not paid: same connection*: the two accounts share an address (registration, or the inviter's last login);
  - *not paid: inviter gone*: the inviter's account or yard was missing when the friend first loaded;
  - *hasn't loaded the game yet*: registered, nothing decided (pays on the first load);
  - *decided before 1 Oct (not recorded)*: settled before results were kept.

Server: `services/user/referrals.ts` `creditReferral` writes the result to the friend's account
(`user.referral_result`); `controllers/admin/adminApi.ts` `player` returns `invites` (code, accepted, invitedBy);
`services/admin/panel.html` draws the card. Migration `20261002_AddReferralResult` adds the column and an index
on `referred_by`. Read-only: nothing on the card changes anything.

Tested: `client-web/tools/test/invites-admin-test.mjs` (9 checks); server `tsc`.

## Bone fields: new shore art (30 September)

The user's `inferno-maproom2-complete.zip` (one package holding every Map Room 2 hell change). Against what
was already in, only the bone fields (heights 100-109), the worker marker and the tutorial pictures are new:
- **Map tiles:** `assets.swf` replaced by the package's. Tag by tag against the one before, four bitmaps
  differ, nothing else: the sand1 and sand2 cell tiles (#181, #183: dark volcanic rock thick with bones, where
  the earlier ones were pale bone dust) and the two frames of the worker marker beside free outposts (#129,
  #131: the blue worker is now the Inferno worker, with a hard hat in the second frame). Variations 2-4 of
  both shore tiles: `_assets/hellmap/sand1_2-4.png`, `sand2_2-4.png` replaced.
- **Yard grounds:** `_assets/hellyard/hell_sand1_big.jpg` and `hell_sand2_big.jpg` remade from the package's
  new sheets (JPG at quality 95, as before).
- **World map and minimap:** the bone fields' colours (`IoMapLod.terrainColour`) now come from the new tiles,
  at half brightness like the others: 100-104 `0x24211D`, 105-109 `0x2C2923` (one pale `0x5A4F42` before).
- **Tutorial pictures:** `server/public/assets/ui/mr2_tutorial_1-7.png`, the seven first-visit Map Room
  popups, redone on Inferno ground with Inferno buildings and Moloch tribes.
- Not taken from the package: its `BASE.as`, `MapRoomCell.as` and `MapRoomPopup.as` (older copies; the
  changes they carry are already in, done differently: see "Map Room 2 art" and "Yard grounds by cell height").
  Its `MAPBG.as`, `HellTileVariants.as` and other image classes are the same as ours.

Checked in the browser: the map at the close step shows the new bone tiles and the Inferno worker marker; a
wild monster yard at 100 and one at 105 stand on the new sheets; the tutorial shows the new pictures;
`yard-grounds-test.mjs` (5) and `map-snapshot-test.mjs` (16) pass. Flash compiles (only the known `CreepType`
error).

## Strongbox and Academy busy rules (30 September)

The user's report: the Strongbox sometimes didn't animate while unlocking, sometimes unlocked two monsters at
once, and sometimes let itself be upgraded while unlocking. Asked to make the Academy right too.

**Strongbox (monster locker)**
- **The cause:** `CREATURELOCKER.Tick` worked out what the Strongbox was unlocking from the monsters whose id
  starts with "IC". Rezghul (C19) is unlocked in the Strongbox here, so while he unlocked the Strongbox counted
  as idle: no animation (`BUILDING8.TickFast`), a second monster could be unlocked, the Strongbox could be
  upgraded, Speed Up on it failed, and his unlock never finished. Now
  `CREATURELOCKER.ioInfernoLockerMonster` (the IC monsters and Rezghul) decides; an unlock of his that was
  stuck finishes on the next load.
- **Instant unlock** (`CREATURELOCKERPOPUP.InstantUnlock`) cleared the "unlocking" mark even when the monster
  bought was a different one, so for up to a second another unlock could start; now it only clears it for
  the monster it finishes. Clicked twice (or once more after the shiny confirmation), it paid twice; now a
  monster already unlocked or unlocking is refused.
- **Start** asks the locker data (`CREATURELOCKER.ioUnlockingID`), not the copy kept by Tick, and refuses
  while the Strongbox itself is being built or upgraded (`io_cloc_err_upgrading`, four languages).
- **Upgrading** is refused in `BASE.CanUpgrade` (`BASE.ioBusyForUpgrade`), so every way in is covered: the
  Upgrade button, the instant (shiny) upgrade, which skipped `BUILDING8.Upgrade`, and an upgrade that waited
  for a free worker.

**Academy**
- **Upgrading** while training is refused the same way (`acad_err_cantupgrade`): the instant upgrade skipped
  `BUILDING26.Upgrade`.
- **One training per Academy:** each Academy trains one monster at a time, so two Academies (allowed from
  Under Hall 4) train two at once, as in the stock game. What an Academy trains is its mark (`_upgrading`,
  saved with the building) beside the monster's training time: a save that kept the time but lost the mark
  let that Academy start a second training, be upgraded, and stopped its animation. A training no Academy
  claims (`ACADEMY.ioUnclaimedTraining`) now counts as busy for an Academy without a mark, and
  `ACADEMY.Tick` gives it back to such an Academy, clears a mark left after a training ended or held twice,
  once a second (`ioReconcile`), and points Speed Up (`ACADEMY._monsterID`) only at a training that is
  running (a finished one threw an error). (The first version of this, the same evening, counted any
  training as busy for every Academy, which stopped the second Academy from training; fixed at once.)
- **Instant training** is checked again on the click as the training button is, and the window refreshes
  after it: clicked twice it trained two levels (past the Academy's level, or the last level) and paid
  twice.
- **Cancel** of a training that isn't running (answered twice, or finished meanwhile) no longer refunds the
  sulfur again.
- **No training** while the Academy itself is being built or upgraded (`io_acad_err_upgrading`, "Academy
  Upgrading", four languages).

Unchanged on purpose: a damaged Strongbox (or overworld locker) doesn't animate, as in the stock game; its
damaged picture has the lid shut. Repairing it brings the animation back.

Tested: `client-web/tools/test/locker-academy-test.mjs` (24 checks, two Academies included); `champion-lock-test.mjs`
(7) still passes.
Flash compiles (only the known `CreepType` error).

**Bone fields, sand2 again** (30 September, late): the user's `inferno-maproom2-complete_1.zip`. Only the
higher bone field (sand2, heights 105-109) changed: it now has fewer bones than sand1, so more rock shows
(it had more). `assets.swf` replaced (tag by tag, only bitmap #183, the sand2 cell tile, differs),
`_assets/hellmap/sand2_2-4.png`, and `_assets/hellyard/hell_sand2_big.jpg` remade from the new sheet (JPG
95). The world map colour for 105-109 follows the darker tile: `0x1E1B19` (`IoMapLod.terrainColour`).
Checked in the browser (map at the close step, wild monster yards at 100 and 105);
`yard-grounds-test.mjs` passes.

## Bug hunt (1 October, overnight)

The user asked for an unattended bug hunt. Sources: the Bugs table (`bug_report`), the server log, the whole
test suite, a crawler that opens every building's info panel and clicks each button (and one level of
whatever opens), a second one for the UI bars and the windows they open, a scan for text keys the game asks
for that no language file has, and a look at each building's and monster's data tables.

Fixed:
- (Taken back the same morning, the user's call: warts growing just past the yard's edge, up to 200 out, is
  the stock game's and right: they are still on screen and picked like any other. The first version of
  tonight's work refused those spots; the spawn is the stock one again.)
- **Warts on wild monster yards**: those load as a main yard (`isMainYard`) in view and attack modes, so
  warts grew there and were saved into the tribe's yard. Inferno only: they grow only in your own yard
  (build mode); elsewhere the yard's recorded warts are placed as they are, past the edge too
(`MUSHROOMS.ioPlaceRecorded`).
- **A yard that failed to load** (report #58, "reading 'terrain' of null"): BASE read the current map cell's
  terrain with no cell (a yard opened from outside the map). Inferno only: guarded.
- **Error #2025 when the Map Room 2 tutorial closed** (report #62): `Tutorial.HideBigDialog` removed a
  picture that was no longer on the top layer. Inferno only: only removed while it is there.
- **Error #1009 on load** (report #56, null bottom bar in `UI_BOTTOM.Update`): Inferno only: no update
  before the bar exists.
- **Rezghul's juice showed as goo**: `BUILDING9.Blend` (the Juicer) chose magma only for "IC" ids; Rezghul
  (C19) is an Inferno monster here (`BASE.isInfernoCreep`).
- **Raw text keys on screen**: `msg_sfactory_cantupgrade1` / `2` (Siege Factory), `base_uperr_stillfortifying`
  (upgrade while fortifying) and `base_builderr_ownyard1` were in no language file. Added in the four
  languages and in `KEYS.IO_FALLBACK`. (The descent, `wmi_popup` and `pop_cavernwin` keys the scan also
  listed are built with a number on the end and do exist.)
- Server: "Too many requests where sent" in the sign-up limit message ("were").
- **Designed yards lost their buildings out east** (report #57, "GRID.FindSpace 0, 0, 0, -1200"): on
  every load `BASE.Build` took a building past x 1000 for one off the yard and moved it to the first free
  spot, the top corner. The Designer's tribe and Moloch drafts are 2400 across, and the wild yards made from
  them keep that layout, so a building placed out east was moved, in the draft at once (after Apply) and in
  every view or attack of those yards on the map. Inferno only: the limit is the yard's own edge (a draft's
  1200), and 1200 for a yard that is not your own (view, attack); your own yard is unchanged.
  `designer-test` now checks both (the draft after Apply, and the wild yard made from it seen in the game:
  the tower at x 1060 stayed at 1060; it was at -500,-400 before). A wild yard on the map only had them
  moved while drawn (its stored layout is the design's), but a draft saved after it was reloaded (Apply,
  or opened again) saved the moved building: designs made before this may have a building in the top
  corner of the draft (-1200,-1200 in yard units) that was meant to be out east. Left as it is: such a yard's
  drawn edge (the white lines) is the normal yard's, so the far buildings stand outside it.
- **Warts in Designer drafts**: none grow there now (`GLOBAL.ioDesignMode()`); they were in the way of
  placing buildings. (They were never saved into designs: warts are kept apart from the buildings.)
- **Raw text keys for French, Spanish and Portuguese players**: the game has no fallback to English, and
  these were only in `english.json`: the login form's six (`auth_*`), "Connection Lost" and its text
  (`pop_noconnect_*`), "ON SALE" on build menu tiles (`ui_sale_on`), Korath's and Drull's names in Spanish
  (`#m_korath#`, `#m_drull#`: Spanish players saw "#m_korath#"), and `disabled_invites` in Portuguese. All
  four files now have the same keys (4,025). New `client-web/tools/test/languages-test.mjs` (no server
  needed) checks this and that every plain `KEYS.Get("...")` key is in `english.json` or `KEYS.IO_FALLBACK`
  (three overworld-only keys excepted).
- **Broken number places in translations** (the game fills in `#v1#`, `#fname#` ...; a broken one shows as
  typed and the number is missing): French map room attack buttons "Attaquer l'Avant-poste de #v1" / "le
  Terrain de #v1", the building-parts upgrade error (empty), the injured monsters count; Spanish "Súbditos de
  #v1" (a tribe's yard on the map), the 1 / 2 hour training speed-ups, a help request, D.A.V.E.'s and the
  housing feed lines, three quest counters with translated names; Portuguese Hatchery Overdrive (empty), the
  Juicer button without the Magma cost, the repair-all count, the injured count, six quest counters.
  `languages-test` checks these too now. The Bone Cruncher's description was empty in Spanish (filled in).
- **Bold that never ended**: an unclosed `<b>` makes the rest of the text bold. The Strongbox's
  "Production Stats" label (all four languages, English too), and in translations the Hatchery's
  description (French), the Flinger's and the protection text (Spanish), the Juicer's footer, the Strongbox
  level line, the move-yard warning, the "more resources" questions and the error popup (Portuguese).
  `languages-test` checks that bold and font tags are closed.
- **Relocate sent twice at once** (`controllers/maproom/v2/relocateAnywhere.ts`): the second was refused, but
  depending on timing with "Your yard is not on the map yet." (it read the yard half moved by the first),
  as the checks ran before the one-at-a-time lock. The lock is now taken first, so the second is always
  told "Already relocating" (`relocate-test`'s check, which failed on that timing).
- **The attack bar's "Flinger Capacity:" label** (`UI_TOP.setupAttackMode`) was set to the whole text
  "Flinger Capacity: #v1#%", whose number has its own field, so the unfilled "#v1#%" wrapped onto a second
  line peeking out under the label in every attack. Inferno only: the label is the text before `#v1#`.
- **Prompts to buy Shiny** (Shiny is not sold here): "You don't have enough Shiny" said "you're just a few
  clicks away from all the Shiny you could ever want" with a Get More Shiny button that did nothing (it
  called the old Facebook page's shop). Inferno only: the text says where Shiny comes from (Daily Reward,
  golden warts, inviting friends; `io_noshiny_body`, four languages and `KEYS.IO_FALLBACK`) and the button is
  hidden. And the "Want it upgraded NOW? Treat yourself to some shiny" popup after an Under Hall upgrade
  (when the speed-up costs more than the Shiny you have; its picture `purchased.png` is not on the server
  either) is not shown (`POPUPS.DisplayPleaseBuy`).
- **"You successfully defended your yard from an attack by <player>"** showed an empty picture frame
  (`defense2.png` is not on the server). Inferno only: the Magma Tower's picture (`building-magma_tower.png`).
  (A wild tribe's attack shows the tribe's picture, as before.)
- **The welcome popup's picture frame was empty** ("Welcome to hell.", once per login): it now shows the
  two friends (`popups/invite-friends.png`), set by `welcome.image` in `InfernoOnlyConfig.ts` (flag
  `io_welcome_image`; "" for none).

Looked at and left (not bugs in the game): the reports from the tests themselves (#8 negative twigs,
#12 admin test mode off, #15, #50, #54, #63 a purchase the test faked); #55 (Error #2006 in a casino picture's
callback, from a build of 27 September; the casino tests have not hit it since); the Siege Factory / Siege
Lab art asked for by the crawler (siege buildings can't be built in Inferno yards, `BASE.as` ~5709).
Also left as they are (the user agreed, 1 October): Rezghul raises neither flying nor burrowed monsters
(Valgos, Wormzer: his shot's target flags are the stock game's); "Brag to your friends" buttons only close
their popup (the feed post went to the old Facebook page); a designed yard's drawn edge is the normal yard's,
so far-out buildings stand outside the lines; and the Monster Bunker's Rezghul / Inferno monster difference
does not matter, as there is no Monster Bunker in the Inferno. A "No answer from the server" report is made
when a page is closed mid-request (the Bugs tab counts them; all of tonight's were the tests' pages). A defence battle
of every Inferno monster against every tower, and crawls of the UI in English and French, found no
errors and no raw keys. Retried "closing the chat breaks clicks on buildings" (BUG-REPORTS.md): not
reproduced.

AS3 files changed tonight (the user's own files win; each change is Inferno-only): `ATTACK.as`, `BASE.as`,
`BUILDING9.as`, `KEYS.as`, `MUSHROOMS.as`, `POPUPS.as`, `UI_TOP.as`, `com/monsters/maproom_advanced/Tutorial.as`,
`com/monsters/ui/UI_BOTTOM.as`.

Tests brought up to date: `designer-test` (Fusebug level 6 health 720), `new-monsters-test` (Clinkerjaw level
1 health 1800), `warts-test` (two new checks: new warts grow on the yard or up to 200 past its edge, never
further; none on a wild yard),
`remade-assets-test` (the Academy animates with a real training: a bare `_upgrading` with no training behind
it is now dropped by the Academy, on purpose), `casino-m2-test` (waits for the jackpot celebration to end,
200 frames, instead of 5.5 s: headless Chromium draws about 16 frames a second), `planner-tools-test` (the
test yard's Under Hall overlaps the two buildings it flips, so the flip was refused as "does not fit"; it
now moves the Under Hall clear on the plan first), `locks-test` (says what was asked for when the padlock
check fails). Whole suite run twice: everything passes except checks that depend on the machine (planner frame
rate at 1/4 CPU) or that are timing-sensitive and pass when run alone (padlock request, Cinder Coil prong,
the map snapshot's yard value, which is rebuilt once a minute). `admin-test-mode-test` fails if a referral
notice is waiting for the test account (run right after `invites-admin-test`): its message box covers the
Test switch. Run alone it passes.

## Yard Planner: wall line placing walls twice (1 October)

The user's report: even when the Walls tool said it was placing the walls in a straight line, a number of them
ended up placed twice, with gaps in the line.

- **The cause:** the wall line placed each wall through the hand-placing path (`DESIGN_BUILDING_PLACE` ->
  `PlannerExplorer.removeBuilding` -> `PlannerExplorerHeader.removeNode` -> `PlannerExplorerButton.decrement`).
  For a building placed by hand that path takes the last node off the storage list (the one the mouse
  carried) and puts the next one on the mouse, to place several in a row. The line takes its walls in its own
  order, so the list lost the wrong walls, and a wall was left on the mouse each time. A wall the line had
  already placed then came up again (from the list, or as the wall on the mouse) and was placed a second time:
  two walls of the plan were one wall of the data, so when the plan was drawn again or applied, two walls
  stood on one spot and the other spot was empty. (Seen in the browser: 13 walls placed and 14 added, a
  stray wall at the mouse, 15 walls of 60 sharing a spot after five lines.)
- **The fix (Inferno-only):** while the line places its walls (`PlannerDesignView.ioPlacingLine`), the storage
  list takes out exactly the wall placed (`PlannerExplorerButton.ioRemoveExact`) and puts nothing on the mouse.
  Placing by hand is unchanged.
- Test: `client-web/tools/test/planner-walls-test.mjs` (9 checks): five lines (straight, sloped, upright,
  partly blocked, one that runs storage out) each place as many walls as they say and storage gives up
  exactly those; nothing on the mouse; the storage list's count; every wall its own, none on another's spot,
  each drawn where its data says, the same after drawing the plan again; a wall placed by hand afterwards.
  `planner-tools-test`, `planner-test` and `designer-test` still pass.

AS3 files changed: `com/monsters/baseplanner/PlannerDesignView.as`,
`com/monsters/baseplanner/components/PlannerExplorerButton.as`,
`com/monsters/baseplanner/components/PlannerExplorerHeader.as`.

## Invite rewards: barring abusers, and sorting players by invites (1 October)

The user's request: let admins bar players who abused the Invite Friends button from the shiny for invites,
and sort the player list by invites accepted.

- **Barred from invite rewards** (admin panel, the player's Friends invited card, "Invite rewards"): Bar (a
  reason is required; it goes in the admin log as `invite-bar`) and Lift (`invite-unbar`). While a player is
  barred, a friend who joins through their link is kept as `barred` (`user.referral_result`) and nothing is
  paid to either side (`services/user/referrals.ts creditReferral`), so a player inviting their own accounts
  gets nothing for the inviter or the new accounts. Referrals already decided stay as they are: shiny already
  paid is not taken back (the Shiny and resources card can do that by hand). The friends list shows such a
  friend as "not paid: inviter barred from invite rewards". Players are not told.
- **Migration `20261003_AddReferralBarred`**: `user.referral_barred` (boolean, default false) and
  `user.referral_barred_reason`.
- **Player list (Players tab)**: an Invites accepted column (how many joined through the player's link, and how
  many of them were paid; "barred" beside a barred player). Click a heading to sort by it (Id, Username,
  Invites accepted; again to reverse); Invites accepted starts with the most. The list endpoint (`players`)
  counts them in one query.
- Test: `invites-admin-test.mjs` now 16 checks (the list's counts, sorting both ways in the page, barring needs
  a reason, a friend joining while barred is kept as barred with nothing paid, the card shows it, lifting it).
  `admin-security-test` still passes.

## Bug reports #49 to #59 (1 October)

The user's request: the production Bugs tab (#49 to #59), "look into each and fix". Each report's outcome is
also in BUG-REPORTS.md.

- **#49, getarea outside the world** (a 500: x=-320 y=-90 failed the schema's minimum): `getArea.ts` takes any
  whole number and answers a zone outside the world, alone or among `zones`, with no cells (no database
  query). The map does not ask for one (`MapRoom.RequestData`, Inferno-only: a zone point outside
  0.._mapWidth/_mapHeight returns at once).
- **#53, "outpost w TH bdg"** (ClaudeBot): the main yard loaded after a run of outposts, with no yard kind
  given (`LoadBase(..., -1)`), kept the last outpost's kind (`BASE.Load` only sets it for a kind >= 0), and
  `handleBaseLoadSuccessful` stopped on finding a Town Hall in an "outpost". Now, Inferno-only, build mode: the
  player's own yard is the kind its save says (`type` in the load answer: `main` or `outpost`), whatever the
  load asked for.
- **#54, HALT "You do not have permission"** (ClaudeBot, after "Open Map" at the end of a wild monster attack):
  an `ibuild` load of the separate Inferno yard, which Inferno-only does not have; the server refused it.
  Seven stock ways back to it exist (`ATTACK.End`, `popup_attackend.End`, the Descent's capture popup,
  `UI_VISITOR`, `INFERNOPORTAL`, `GLOBAL`'s yard toggle, `handleLoadSuccessful`'s return home). Rather than
  each, `BASE.LoadBase` (Inferno-only) turns any `ibuild` load into the home yard in build mode (an Inferno
  outpost kind into an outpost) and writes a "log" line ("Inferno yard load sent home (base, type, from
  mode)") so the path shows in a later report's log.
- **#56 / #58, `_UI_BOTTOM._mc` null** (Android, both just after logging in or registering): the bottom bar
  guard went out with the overnight bug hunt (both reports are from build 202609302347, before it). The cause:
  the login or register button clicked twice sent two requests; two logins loaded two yards at once (the
  first one's bottom bar was taken down under it), two registrations answered "An account with this username
  already exists" over the first one's success. `LOGIN.AuthenticateUser` and `AuthForm`'s register now send
  one at a time (Inferno-only; a failed or refused one can be tried again).
- **#57, `MAP._EFFECTS` null in `EFFECTS.SplatParticle`**: a monster's death splat after its yard's layers were
  gone (Return Home mid-tween). Inferno-only: nothing is drawn then.
- **#50, #52, #55, #59, no answer from the server** (a phone asleep for 4 minutes, a dropped connection, `/init`
  on a phone): `URLLoaderApi.ioFailure` writes a request with no answer as "log" (not reported, still in the
  next report's recent log). Saves and polls go again by themselves, and five failed saves in a row still stop
  the game ("Base.Save HTTP", reported). `GLOBAL.init` (Inferno-only) tries `/init` three more times, two
  seconds apart, before "Failed to connect to the server."
- **#51, HTTP 524 on `/base/save` after 125 s** (a wild monster attack): Cloudflare's 100-second limit. Nothing in
  the save waits that long (no locks, no outside calls); the server or database stalled. Not fixed: the server
  log for 2026-09-30 10:13-10:15 UTC says more (BUG-REPORTS.md has the command). The game tried the save
  again.
- Test: `bugs-oct1-test.mjs` (10 checks): getarea outside the world (both sides), `/init` with no answer twice
  then starting, one login for two at once, the main yard after an outpost with no kind given, an `ibuild`
  load going home, a splat with no layers, no answer written as "log", the map asking for no zone outside
  the world, no page errors. map-ui, warts, gauntlet, wild-attack, popups, outposts, relocate, bug-context,
  bug-reports, ui-fixes, server-fixes, planner-walls and map-snapshot pass.

AS3 files changed: `BASE.as`, `GLOBAL.as`, `LOGIN.as`, `URLLoaderApi.as`, `EFFECTS.as`, `com/auth/AuthForm.as`,
`com/monsters/maproom_advanced/MapRoom.as`.

## Bone fields: new yard grounds (1 October)

The user's `inferno-maproom2-complete.zip` again, with new yard-ground sheets for the bone fields: `hell_sand1_big`
(heights 100-104) and `hell_sand2_big` (105-109). They are the same size (1000 x 500, seamless), with flatter
dark rock and fewer, smaller bones than the 30 September sheets. Stored as JPG at quality 95 like before
(`client/scripts/_assets/hellyard/` and `client-web/public/embed/_assets/hellyard/`). They are 370 KB and
350 KB, against the pack's 1.1 MB PNGs, with an average difference of 2 out of 255 per colour. Everything
else in the package is the same as what is already in: `assets.swf`, the map tiles, the tutorial pictures
and the image classes, apart from the classes naming `.png` where ours name `.jpg`. Its `BASE.as`,
`MapRoomCell.as` and `MapRoomPopup.as` are the older copies again, so they were not taken.

Checked: Flash compiles; `yard-grounds-test.mjs` (5) passes; a wild monster yard at 105 stands on the new
sand2 sheet.

## Hell Freezes Over (1 October)

The user's design (`hell_freezes_over.md`) with its art (`hfo_props.zip`, `hfo_monsters.zip`): a once-ever,
three-day story event in the Inferno main yard, then 13 waves of ice cretins, and the ice champion Rimegrave
as the reward. The user's request: off until an admin turns it on; it starts for a player who has every
monster unlocked and one page-5 champion at Academy level 2; the stats balanced by eye; the ice cretins are
never a player's; Rimegrave is the player's once the event is won (still unlocked in the Strongbox); admins
can use them all in test mode and the Designer.

**The user's answers (1 October)**
1. Qualifying: every monster on Strongbox pages 1-5 (Rimegrave aside; Rezghul only while he is enabled) and
   any one page-5 champion (Korath, Drull, Ashkarr) at Academy level 2 or more. (Dropped later that night: every monster unlocked is
   enough. See "Hell Freezes Over: no champion level needed".)
2. Rimegrave is `IC25`, with the champions' costs (Strongbox level 5, housing 600, Academy to level 6).
3. An admin "Hell Freezes Over" card, off by default. Turned off, anyone who has started keeps going.
4. Per-player admin tools: Start now, Next day, Reset.
5. The ice cretins and Rimegrave are in admin test mode and the Designer.
6. Day 1 is still 24 hours after qualifying.
7. No free repair: buildings start their usual repair, monsters lost are lost.
8. No wild monster attacks while a wave is on.
9. The event's button goes below the Gauntlet's and shows from Day 3.
10. Rimegrave's ice powers work when he defends too.
11. Texts in French, Spanish and Portuguese as well.
12. `bdg_warlordhead` dropped for now.
13. The waves are one fixed table for an Inferno Town Hall of level 6 (not scaled).

**Server**
- `services/events/hfo.ts`: the rules and the player's progress (`user.hfo`, JSONB). The switch is Redis
  `admin:hfo` ("on"). `hfoFlag` (the `io_hfo` flag of every base load) starts the event for a player who
  qualifies and moves to the next day, both only on a yard load (`atLoad`). Each day needs its time (24 h
  after the last) and its tasks: Day 1, 12 small patches cleared (6 at once, then one every 2 hours) and
  all 6 lines heard; Day 2, all 5 big patches tried and all 5 lines heard; Day 3, every tower freed (the
  towers there when Day 3 began; one recycled since counts as freed) and all 4 lines heard. The lines are
  dealt from a shuffled deck kept in the progress.
- The waves: 3 tries each, counted when a wave starts (`hfo/wavestart`, which also settles a fight left
  open). A win pays 5 shiny (155 for wave 13) once, through `bym.hfo_claim` (primary key userid + wave), and
  only within the tries. Three losses skip the wave. A skipped wave can be replayed (no try, no pay) and its
  win counts for Rimegrave. `done` is set when all 13 are won.
- Routes (POST, the game's login): `hfo/status`, `spawn`, `clear`, `try`, `towers`, `thaw`, `wavestart`,
  `waveend` (answers the shiny through `visibleCredits`), `seen`.
- `lockedMonsters.ts`: `IC25` in a save's lockerdata is put back unless the player has won the event
  (`hfoChampionFree`).
- `monsterStats.ts`: Rimegrave and the six cretins (`hellFreezesOverMonsters`, INFERNO_ONLY).
- Admin: the Status tab's card (on / off, counts), and a player's card shows the progress with Start now,
  Next day (the next load starts the next day whatever the time and tasks) and Reset. The Gauntlet's "Start
  again" confirm had a broken apostrophe (the page's script stopped there); fixed with it.
- Migration `20261004_AddHellFreezesOver`: `user.hfo` and `bym.hfo_claim`.

**Game (AS3)**
- `com/monsters/events/hfo/`: `IoHfo` (the yard: patches, tower ice, workers, the tomb, the reveal, the server
  calls), `IoHfoIce` (the ice as a mushroom, type 7, like the warts: a worker is queued, nothing attacks it,
  it is not saved with the buildings), `IoHfoWaves` (the waves, run like a wild monster attack on the
  player's yard: WMATTACK), `IoHfoUi` (the counter, the popups, the event's window), `IoHfoArt` (the art,
  loaded from `assets/hfo/`).
- `com/monsters/monsters/creeps/inferno/hfo/`: `IoIceCreep` (the six cretins, 30 facings), `IoHailspitter`
  (hailstones, `FIREBALL.TYPE_HAIL`), `IoRimegrave` (a sheet per Academy level, 16 facings), `IoIce` (the ice
  powers) and `IoFreezeEffect` (a monster frozen for a second).
- The ice powers: a tower hit holds the tower's next shot for twice its reload (at least 20 steps) under the
  ice art, then the ice breaks (`BTOWER.ioIceHit / ioIceTick`, called from the tower loops in `BASE` and
  `GLOBAL`); more hits don't add. A monster hit freezes it for 80 steps (one second); a new hit starts the
  second again.
- The frozen ground is `MAPBG`'s "hfo_frozen" (the four lava tiles, iced: `hfo_frozen1-4.as`), from Day 3
  until the reveal.
- Strongbox: Rimegrave on page 5 once the event is won; before that he is in none of the Strongbox, the
  Compound, the Incubators or the Academy (see "Hell Freezes Over: tested end to end"), and
  `CREATURELOCKER.Start` refuses him. The cretins are on no page and always blocked.

**Choices made in building it**
- The cretins are `IC26`-`IC31` (the design's FC1-FC6): Shivling, Slushgut, Rimeclaw, Sleetwing,
  Hailspitter, Permafrost Hulk.
- Day 3's tower ice is drawn in build mode only and is a picture: the towers still fire if the yard is
  attacked (the design's decision 1). Wild monster attacks wait while a wave is on.
- A wave is lost at 99% of the yard destroyed (walls, traps and decorations aside) or by Surrender; leaving
  the yard mid-wave counts as lost. When the cretins of one surge are all gone, the next comes at once.
- The promo art is in the event's window and the Day 3 popup, not on Day 1 (the yard says nothing yet).
- A player with no defence towers on Day 3 goes straight on to the waves.

**Balance (by eye, for Town Hall 6)**: Shivling 500 health / 110 damage / speed 2.4; Slushgut 9,000 / 240 /
1; Rimeclaw 2,600 / 480 / 2.2 (defences first); Sleetwing 1,800 / 280 / 3 (flies); Hailspitter 1,400 / 400 /
1.4, range 200 (defences first); Permafrost Hulk 30,000 / 1,500 / 0.9 (splits into 4 Shivlings). Rimegrave
level 1-6: 26,000-52,000 health, 2,600-4,600 damage. The waves (`IoHfoWaves.WAVES`, every count doubled
later that day: see "Hell Freezes Over: waves doubled"): 32 Shivlings at first, two Hulks from wave 8, all four
sides from wave 10, and wave 13 with 100 Shivlings, 32 Rimeclaws, 20 Slushguts, 32 Hailspitters, 32 Sleetwings
and 8 Hulks in three surges.

Test: `hfo-test.mjs` (36 checks): off by default, qualifying (not with a champion at level 1), the card;
Day 1's patches kept and a worker's line; Day 2's try counted once; Day 3's towers, frozen ground, counter
and button; the last tower's popup; wave 1 won and paid once; wave 2 skipped after three surrenders and
replayed for nothing; every cretin drawn; the ice powers; the Hulk's split; the window's 13 waves;
Rimegrave refused by the game and the server, then the reveal once and his unlock; drawn at levels 1 and 6;
admin Reset, Start now and Next day; off keeps a started player going; admin test mode offers Rimegrave and the cretins (blocked again when it goes off); no page errors. map-ui, wild-attack, popups, planner-walls, warts, gauntlet, locks, champion-lock, locker-academy, designer, admin-test-mode, languages and bug-context pass.

AS3 files changed: `ACADEMYPOPUP.as`, `BASE.as`, `BMUSHROOM.as`, `BTOWER.as`, `BUILDINGINFO.as`,
`CREATURELOCKER.as`, `CREATURELOCKERPOPUP.as`, `FIREBALL.as`, `GLOBAL.as`, `MAPBG.as`, `MUSHROOMS.as`,
`SPRITES.as`, `UI_TOP.as`, `UI_WORKERS.as`. New: `hfo_frozen1-4.as`, `com/monsters/events/hfo/*` (5),
`com/monsters/monsters/creeps/inferno/hfo/*` (5).

## Hell Freezes Over: tested end to end (1 October, evening)

The user's request: test that the event starts when it should, that the days go as planned, that the waves can be
survived with maximum-level towers (and how close it is), that Rimegrave is in the Strongbox and works once the
event is won, and that neither he (before it is won) nor the ice monsters (ever) are in the Strongbox, the
Compound or the Academy.

**Fixed**
- **Started or moved on from the wrong yard**: any load of one of the player's own yards in build mode counted
  (an outpost, an admin's Designer draft). Now only the main yard (`baseLoad.ts`: the save loaded is
  `user.save`).
- **Started by admin test mode**: test mode unlocks every monster, so an admin who switched it on qualified on
  the next load. Test mode never starts the event now (`hfoFlag(user, atLoad, testMode)`).
- **A yard with no defence towers stuck on Day 3**: nothing to free, so the waves never opened. Now they open
  at once (`hfoTowers` answers `frozen`, and the game shows "Hell has frozen over!"), and a load moves a yard
  already stuck there on.
- **`wavestart` took any wave number** (14 made a wave "14"). Only 1-13.
- **Rimegrave showed, locked, in the Strongbox, the Compound, the Incubators and the Academy** before the event
  was won (the design's "hidden or shown locked"; the user wants hidden). He is "blocked" until it is won
  (`CREATURELOCKER.ioHfoRefresh`, called when the locker is set up, on every yard load and whenever the event's
  progress changes); then he is in all of them like any other locked monster. Admin test mode shows him (it
  unlocks everything).
- **The ice cretins showed in those windows in admin test mode** (they were unblocked for test mode and the
  Designer). They are always blocked now; the Designer and test mode's attacks take them from
  `ioTestMonsterIds` instead (`IoDesigner.monsterIds` lets Hell Freezes Over's monsters through).
- **"Anyone home?" in the middle of a wave**: the game stops after 10 minutes without a touch (and shows the
  invite popup at 6), which threw the wave away as lost. A wave counts as activity now.
- **Waves that wouldn't end**: one Sleetwing pecking at a cannon outside every anti-air tower's reach kept a
  wave going for over ten minutes (the balance runs below). Two minutes after a wave's last surge the
  stragglers start to melt, 2% of their health a second (`MELT_AFTER`, `MELT_PER_SECOND` in `IoHfoWaves`), and
  the bar says "The heat is back: the last ice cretins are melting!" (new key `hfo_hud_melting`, in the four
  languages). No wave now lasts more than about four minutes.
- **The surges came on the clock**: a phone running the battle in slow motion (GLOBAL.TickFast's step budget)
  got each surge sooner in the fight. They come after so many simulation steps now (`IoHfoStepClock`).
- **A destroyed Radio Tower's picture was missing** (404 on `buildings/radiotower/top.destroyed.png` and
  `shadow.destroyed.jpg`; the stock building data names them without the level). Copies of the level-1 files
  under those names (no code change).

**How close the waves are** (`tools/hfo-balance/sim.mjs`: the waves fought in the browser against a maxed Under
Hall 6 yard, every building TH6 allows at its top level and its 24 towers spread among them: 6 snipers and 6
cannons at level 7, 4 quake, 3 magma, 3 cinder coil and 2 obsidian mortar towers at level 6; no walls, traps or
defending monsters, so the towers alone). Lost at 99% destroyed.

| Wave | Won in (game seconds) | Yard destroyed at worst | Towers standing at worst |
|---|---|---|---|
| 1 | 13 | 0% | 24 / 24 |
| 2 | 35 | 0% | 24 |
| 3 | 30 | 1% | 24 |
| 4 | 27 | 0% | 24 |
| 5 | 23 | 0% | 24 |
| 6 | 35 | 1% | 23 |
| 7 | 42 | 2% | 24 |
| 8 | 45 | 0% | 24 |
| 9 | 155 | 9% | 18 |
| 10 | 63 | 2% | 23 |
| 11 | 74 | 0% | 24 |
| 12 | 77 | 2% | 23 |
| 13 | 224 | 12% | 19 |

(The same yard spread out to the map's edges: wave 13 at 22% worst, the others 13% or less.) Wave 13 with more
monsters, same yard: twice as many 23%, three times 59%, four times 79% (won), six times lost. The same wave with
every tower at level 3: 39%; at level 1: 95% (won with 4% to spare). So with maximum towers the waves are far from
lost: wave 13 takes four to five times its monsters to come close. A player with towers around level 3 is
pushed on the last waves, and one with level-1 towers barely survives wave 13.

**Tests**: `hfo-flow-test.mjs` (54 checks then, 53 now, the server's rules without a browser: who qualifies, each of the 16
monsters and the 3 champions, the switch, outposts, the poll and test mode; each day's time and tasks, one day a
load, the patches' pacing, the lines, the towers; the waves' tries, pay, skips, replays, stale and abandoned
fights; Rimegrave refused then kept). `hfo-lists-test.mjs` (18: the Strongbox's five pages, the Compound, the
Incubator, the Incubation Control Station and the Academy, before / during / in test mode / after; his unlock,
Academy training and Incubator). `hfo-test.mjs` now 37 (the melting).

AS3 files changed: `CREATURELOCKER.as`, `com/monsters/admin/IoDesigner.as`, `com/monsters/events/hfo/IoHfo.as`,
`com/monsters/events/hfo/IoHfoWaves.as`. New: `com/monsters/events/hfo/IoHfoStepClock.as`.

## Hell Freezes Over: waves doubled (1 October, night)

The user's call after the balance runs above: "Double the monsters per wave - no other changes and no tests".
Every count in `IoHfoWaves.WAVES` is twice what it was (the surges' timing, sides and monsters unchanged; wave 1
is 32 Shivlings, wave 13 is 100 Shivlings, 32 Rimeclaws, 20 Slushguts, 32 Hailspitters, 32 Sleetwings and 8
Hulks). Not run again: from the runs above, the doubled wave 13 cost the maxed Under Hall 6 yard 23% at worst
(the 2x run), and the doubled table is harder still for lower towers (wave 13 at level 1 lost 95% before
doubling, so it will likely be lost now). `hfo-test.mjs` expects 32 Shivlings in wave 1 now (not run).

AS3 file changed: `com/monsters/events/hfo/IoHfoWaves.as`.

## Strongbox unlock with no time left (1 October, night)

The user's report: a player's Sabnox unlock, started the night before, showed in the Strongbox as unlocking with
no time left under its name (the row's progress bar ran off its edge), and never finished.

- **The cause:** the unlock's entry in the save had lost its end time (`{t: 1}` with no `e`). The game sets
  `s` and `e` when an unlock starts and only removes them once it is done, so `CREATURELOCKER.Tick` compares
  `e` with the clock: with no `e` that is never true, the unlock can't finish, the row's time is blank
  (`ToTime(NaN)`), Speed Up does nothing and no other monster can be unlocked. Reproduced on the test server
  by giving a save `{"IC7": {"t": 1}}`: exactly the screenshot. (An `e` of `null` finishes at once; only a
  missing one sticks.) How this player's `e` went missing isn't known: nothing in the game or the server
  writes an unlock without it. A bug report from the player would carry the log line below.
- **The fix** (`CREATURELOCKER.ioRepairUnlock`, Inferno-only, from `Tick`): an unlock with no usable end time
  gets one again, its start plus the monster's unlock time; with no start either it finishes now (it was paid
  for when it started). The game saves at once and writes a "log" line ("Strongbox unlock of IC7 had no end
  time (...)"). The stuck player's unlock finishes, or carries on with its time shown, on their next load.
- Checked in the browser: `{t: 1}` finishes on load and shows "Unlocked"; `{t: 1, s}` gets its end back and
  shows the time left.

AS3 file changed: `CREATURELOCKER.as`.

## Hell Freezes Over: smaller Rimegrave, fighting frames, the Compound frozen (1 October, night)

The user's `hfo_monsters_1.zip` and two requests: check whether any of the event's monsters stand still while
attacking (attack animations are fine), and freeze the Compound during the waves so its monsters can't fight
them.

- **Rimegrave smaller**: the pack's six `rimegrave_1-6.png` sheets are about a fifth smaller (level 1 86 x 96,
  level 6 164 x 182; same layout: 16 facings, rows 0 idle, 1-8 walk, 9-14 attack). Copied over the old ones
  (`server/public/assets/monsters/`); the frame sizes and feet in `SPRITES.as` (IC25_1-6) and
  `IoRimegrave.SHEETS` follow the pack's `code_snippets.as.txt`, and the reveal's picture
  (`IoHfoUi.ShowRimegrave`) takes them from there. Nothing else in the pack changed.
- **Standing still while attacking**: checked in the browser by watching each monster's drawn frame while it
  fought. The cretins step through their walk rows (they have no attack frames) and Rimegrave plays his attack
  rows, so none froze on one frame while hitting. One gap: a monster at its target between blows (`_atTarget`
  without `_attacking`), or one that had stopped against something, was drawn on its standing frame. Now a
  monster at its target always animates (walk rows for the cretins, attack rows for Rimegrave); only one held
  by an ice hit (IoFreezeEffect) stands still (`IoIceCreep` / `IoRimegrave.getNextSprite`).
- **The Compound frozen during the waves**: from a wave's start to its end every Compound has a block of ice
  over it (the pack's `ice_large`, enlarged to the Compound's 160 footprint) and none of its monsters comes out:
  `HOUSINGBUNKER.TickAttack` and `EjectCreeps` do nothing while `IoHfoWaves.compoundFrozen`. When the wave
  ends the block shatters and the Compound defends again (wild attacks as before). Checked in the browser: 3
  housed monsters, none out during a wave beside the Compound; after it, all 3 came out for an attack.
- **Fixed with it: the ice never showed.** The ice drawn over a tower hit by an ice monster was added as the
  building's child picture, which isn't drawn, so the tower-icing in battle had no picture at all. It is drawn
  on the map just above the building now (`IoHfoArt.towerIceOn`). And a tower still iced when a wave ended
  stayed iced (its wait only runs while monsters are about): the end of a wave breaks it.

`hfo-test.mjs` (37) passes, with Rimegrave's new sizes.

AS3 files changed: `SPRITES.as`, `HOUSINGBUNKER.as`, `com/monsters/events/hfo/IoHfoArt.as`, `IoHfoUi.as`,
`IoHfoWaves.as`, `com/monsters/monsters/creeps/inferno/hfo/IoIceCreep.as`, `IoRimegrave.as`.

## Hell Freezes Over: no champion level needed (1 October, night)

The user's call: the event starts once every monster is unlocked; a page-5 champion no longer has to be at
Academy level 2. `services/events/hfo.ts` `qualifies` only asks the Strongbox now: every monster on pages 1-5
unlocked (Rezghul while he is enabled; Rimegrave aside). The admin panel's Hell Freezes Over card says so.
`hfo-flow-test.mjs` (53: the three "a champion at level 2" checks are one "level 1 is enough" now) passes;
`hfo-test.mjs` checks the start with the champions at level 1 (not run again).

Server only; no AS3 file changed.

## Leaderboards, and the map snapshots on a fixed 5-minute clock (2 October)

The user asked for a leaderboards button right of the Shiny counter, with three tabs, built on the map
snapshot the game already loads for Map Room 2, and for no player to fetch a snapshot more often than every 5
minutes. Their answers to the plan's questions: a second snapshot made only for the leaderboards from every
world's map snapshot; every world, each row showing its world, with a filter to one world; a world is named
after the owner of its cell 0x0; every row listed (no top-N cut); admins left out; new art made from the
game's own; ties on outposts go to the higher empire value; a Jump button when the player is on the viewer's
world; a fixed 5-minute clock whose rebuilds are spread over the five minutes so there are no load spikes.

**The 5-minute clock** (`services/maproom/v2/bulk/worldSnapshot.ts`, started in `server.ts`):
- Cycles start on the 5-minute marks (epoch multiples of 300 s). Each world with players has its own moment in
  the cycle, spread evenly: world i of n is rebuilt at `(i + 0.5) * 300 / n` seconds into every cycle, so with
  one world it is rebuilt 150 s after each mark, and with ten worlds one rebuild runs every 30 s.
- The old snapshot is served until the new one is ready. There is no TTL any more: a world without a snapshot
  (after a restart, or a new world) is built when it is first asked for, then kept up by the clock.
- Every snapshot carries `nextAt`, the time its world's next one is out. `/worldmapv2/mapdata` and
  `/worldmapv2/snapshot` both send it. The API's `Cache-Control` max-age runs until then.
- **The game** (`IoMapSnapshot.as`) never asks again sooner than 5 minutes after its last answer (`MIN_GAP`),
  and otherwise asks 3 to 20 seconds after the server's `nextAt` (random, so players don't all ask in the same
  second). The snapshot stays usable until 5 minutes past that. This replaces the old one-minute refresh.

**The leaderboards' snapshot** (`services/leaderboards/gameLeaderboards.ts`, route `/leaderboards/game`, POST
and GET, signed-in players; `{error}` when the server isn't inferno-only):
- It is made at the start of every cycle from every world's current map snapshot and the Brimstone Pit's
  ledger. That is a few queries every 5 minutes, whoever looks. One payload, compressed on demand.
- `worlds`: `[id, name]`. The name is the owner of cell (0,0), else the world's own name, else "World n".
- `players`: `[uid, name, world, alliance, outposts, empire value, home x, home y]`. Every player with a yard
  on a map. The empire value is the main yard's and every outpost's together, from the snapshot's cells.
- `alliances`: `[id, name, image, world, [member uids]]`. An alliance with members on two worlds is listed
  once per world.
- `gamblers`: `[uid, name, world, total gambled, lifetime net, bets]`. Settled bets only: `SUM(stake)` and
  `SUM(payout - stake)`. Refunded and open bets don't count. World -1 means the player has no yard on a map.
- Admins (InfernoOnlyConfig.admins) are on none of the lists.
- The `io_leaderboards` flag (inferno-only) shows the button.

**The window** (`com/monsters/leaderboards/IoLeaderboards.as`; button `UI_TOP.ioLeaderboardsButton`):
- **The button** is a gold trophy on an ember-ringed disc, just right of the Shiny counter's box (left of its
  hidden "+"). It shows on the player's own yards in build mode once the tutorial is done, and not in the
  Designer. The Admin, Test and Designer buttons now start right of it.
- **Tabs:** Outposts (most outposts first, ties to the higher empire value, then name), Alliances (highest
  total empire value first, with members and total outposts), Gamblers (most gambled first, with bets and the
  lifetime net, signed and coloured).
- **Alliance members:** clicking an alliance row (the ▸ arrow) opens its members, the highest empire value
  first, each with their outposts.
- **World:** a dropdown with All worlds and each world by name, 12 to a column, up to 36 worlds.
- **Find me** scrolls to the player's own row and lights it for 2 seconds. On Alliances it opens their
  alliance first. A player not listed (an admin, someone with no yard) is told so.
- **Jump** shows on rows whose player is on the viewer's own world. It closes the window and opens the map
  centred on that main yard (`IoMapShare.OpenOwnWorld`). Without a Map Room (or an outpost) the game says to
  build one, as the Map button does. The viewer's world comes from their own row, or for an admin from the map
  they last opened.
- **The list** is virtualized (only the rows in view exist), so thousands of rows scroll as fast as ten.
  Scroll with the wheel, the track or the thumb.
- **The footer** says how old the board is and when the next is due, with the row count on the right.
- **Fetching:** the window asks when it opens if it has nothing yet. After that it asks again only once 5
  minutes have passed since its last answer and the server's next board is out (3 to 20 seconds after
  `nextAt`). Opening and closing the window doesn't ask. A failed request is tried again 15 s later at the
  soonest.
- The window closes when the yard changes (`BASE`) and when an attack starts (`WMATTACK`).
- **Art:** new, made from the game's own pictures in `server/public/assets/leaderboards/`:
  - `bg.jpg` is the Inferno map's lava plains, darkened.
  - `banner.jpg` is the lava cavern at the bottom of the Descent map.
  - `button.png` is a drawn gold trophy on a stone disc made from the lava yard tile.
- Text keys `lb_*` are in English, French, Spanish and Portuguese.

Tested:
- `client-web/tools/test/leaderboards-test.mjs` (36 checks) passes. It covers:
  - the button's place, and the Admin buttons right of it;
  - one request on opening, none on reopening within 5 minutes, and one once the next board is due;
  - every sort and tie, against the server's data;
  - outposts and empire value against the database;
  - gambler totals against the casino ledger, and admins absent from every list;
  - expanding and collapsing an alliance, Find me on both tabs, the world filter, scrolling and the footer;
  - Jump, both the game's Map Room message and the map opening centred on the yard;
  - `nextAt` on the map snapshot, and no second map request within 5 minutes.
- `map-snapshot-test.mjs` was updated for the new cadence:
  - no second request before the server's next snapshot, then one without the layers;
  - a snapshot up to 5 minutes old may show an empire value up to 2% below getarea's.
- On the test server the clock was seen rebuilding the board on the 5-minute marks and the world's map
  snapshot 150 s after each mark.

Note: the admin panel's yard values that come from the map snapshot (see "Bug hunt (1 October, overnight)")
now refresh every 5 minutes, not every minute.

AS3 files changed: `UI_TOP.as`, `BASE.as`, `WMATTACK.as`,
`com/monsters/maproom_advanced/IoMapSnapshot.as`, `IoMapShare.as`, `MapRoom.as` (a comment), and new
`com/monsters/leaderboards/IoLeaderboards.as`.

## Chat: bugs fixed, and what it was missing (2 October)

The user asked what the Global / Alliance chat was missing and to find its bugs. Their answers to the
list: fix every bug, with tests, and make it buttery smooth; times as "how long ago"; a name menu;
mentions (no sound); commands; announcements, big wins and milestones in chat; 200 characters with the
whole message in view while typing; the cleanups, with each kind of alliance entry in its own colour. Not
wanted: online counts, and recalling sent lines with the Up arrow. Two tabs on one account doesn't matter
(one session per player).

**Bugs fixed**
- **The previous line came back in front of the next.** After a line was sent with Enter, the next key
  brought the old text back ("first linesecond"). The browser client's hidden `<textarea>` (the keyboard
  bridge) never heard that the game had emptied the box. Fixed in the browser runtime: whenever the game
  sets a focused input's text, the textarea follows (`client-web/src/flash/text/index.ts`,
  `inputBridge.syncText`). This also fixes the same thing in every other text box.
- **Markup in messages was drawn.** Lines are HTML, and a player's words went in as they were, so
  `<font size="40">` showed giant red text, and links and pictures worked. A player's words and names are
  now shown as text (`BYMChat.ioEsc`), as are alliance entries. The server also drops control characters.
- **Alliance chat died after any lost link** (a server restart or deploy, a background tab, a sleeping
  computer). The transport rejoined the alliance room by its real name, which the server refuses, and lines
  sent into the forgotten session were lost.
  - It now rejoins as "alliance" (`HttpChatSystem.onPollReply`) and sends those lines again.
  - The game doesn't join a second time on top of that.
  - What is being typed while it reconnects is left alone (a rejoin used to empty the box: `ChatBox.EnableInput`).
- **Joins showed history twice.** A rejoin, or opening the Alliances window (it joins the channel too),
  sent the history again and it was added again. Each tab now keeps the time of its newest line, and
  history sent again only adds what is newer (`_ioLastTs`).
- **Ignoring didn't survive a reload.** The list was fetched at login but not applied. It is applied now,
  quietly, and before the history arrives so ignored players' old lines stay hidden too. (It used to print
  "You are not ignoring any users." at every login.)
- **Refused lines vanished.** Too fast, not connected, or not in the room: nothing was said and the box was
  cleared.
  - The game now keeps the server's flood limit itself: a line that would be refused stays in the box with
    a "Slow down" note.
  - Every server refusal is said in the chat (`ioOnServerError`), and a refused line goes back in the box.
  - The mute notice is a server error now (`muted`, with minutes).
- **Alliance changes while playing.**
  - Leaving or being kicked left the tab "sending" into nothing.
  - A new alliance's tab never connected until a reload.
  - Fix: the server now checks after every join or leave (`chatGateway.reconcileAlliance`): out of the old
    room (the game is told: `alliance_left`) and into the new one, with its history. The tab follows.
- **Ignore display.**
  - The list showed "'undefined' (id: 1003)" for players not seen this session; it now comes with names
    from the server.
  - Ignoring from an Alliance line confirmed with an empty name.
  - Server and announcement lines could be ignored.
- **Server.**
  - Ignore and unignore check the player exists, that it isn't yourself, and allow at most 100, by id or by
    name.
  - Times are all milliseconds.
  - The chat token's 24 hours start again on every load, so a long session can still reconnect.

**New**
- **How long ago** each line was said, at its right: now, 33s, 2m, 4h, 3d. The times move on while the
  chat is open.
- **The name menu.** Click a player's name for Send a message, Ignore / Unignore, Jump to their yard, and
  Find on the leaderboards (`com/monsters/chat/ui/IoChatMenu.as`).
  - Jump uses the leaderboards' home cells (`IoLeaderboards.JumpToPlayer`). It only goes to yards on your
    own world; otherwise it says so.
  - Find on the leaderboards opens them on that player's row, lit (`IoLeaderboards.ShowPlayer`).
- **Mentions.** A line naming you ("Name" or "@Name", as a word, any capitals) is drawn in gold with your
  name picked out. The tab counts it with an "@": "Global (3) @".
- **Commands:** `/ignore Name`, `/unignore Name`, `/list` (who you ignore; click a name to unignore),
  `/clear`, `/help`.
- **Announcements, big wins, milestones** (`server/src/chat/chatBroadcasts.ts`). They are written into
  every Global room's history, so later players still see them, and shown as banners. Banners also appear on
  the Alliance tab when they arrive.
  - Admin announcements are gold.
  - Big wins are purple. Every Slots jackpot is announced, and any win of at least 2,500 Shiny over the
    stake, or 25x the stake and at least 500 Shiny (`casinoConfig.announce`). At most one per player a
    minute.
  - Milestones are ice blue: beating Hell Freezes Over, and conquering the month's Moloch's Gauntlet.
  - Admins' wins and milestones aren't announced.
- **The typing box** takes 200 characters (the server's limit; it was 100). It grows upwards to up to six
  lines so the whole message is always in view. A count shows from 150.
- **Cleanups.**
  - The internal room name ("Joined channel chat:mr2-global.") is gone; a welcome line shows once instead.
  - Alliance lines carry the yard level like Global's ("[12] Name"); the Alliances window still shows just
    the name.
  - The level in your name follows a level-up (the server now answers the game's `updatename`).
- **Alliance entries in their colours:** joined green, left grey, kicked red, promoted blue, created
  orange, relationship purple, power-up activated gold, power-up bought teal.
- **Smooth.**
  - Lines are added as they come instead of every line being rebuilt on each message.
  - The mouse wheel scrolls the chat and no longer zooms the map behind it.
  - Someone reading back up isn't pulled down by new lines.
  - At most 60 lines a tab.

**Tested**
- `client-web/tools/test/chat-test.mjs` passes all 39 checks: two players, every item above, against the
  database and Redis.
- A big win was announced on the test server with the threshold lowered for the probe. The 60-second gap
  was seen holding back the second win.
- Regressions pass:
  - alliance-chat (updated: a name opens its menu, then "Send a message"), leaderboards, keyboard, languages
  - casino, casino-server, casino-m5-server, hfo, gauntlet
  - admin-test-mode, admin-security, ui-fixes, popups, map-snapshot, bug-reports, touch-modes
- Not seen live: a milestone banner. It goes through the same broadcast as the big wins, which were seen.

**Files changed**
- AS3:
  - `com/monsters/chat/BYMChat.as`, `ChatEvent.as`, `ui/ChatBox.as`
  - `impl/http/HttpChatSystem.as`, `impl/ws/WSChatSystem.as`
  - `com/monsters/leaderboards/IoLeaderboards.as`, `com/monsters/alliances/tabs/MyAllianceTab.as`
  - new: `com/monsters/chat/impl/ChatWire.as`, `com/monsters/chat/ui/IoChatMenu.as`
- Browser runtime: `client-web/src/flash/text/index.ts`.
- Server:
  - `chat/` (chatBroadcasts.ts new, chatGateway, chatIdentity, chatIgnoreList, chatProtocol, chatRooms,
    chatChannels)
  - `enums/Chat.ts`, `config/CasinoConfig.ts`
  - the casino payouts (wallet, ascentRounds, derbyRounds, bonePileSessions)
  - `services/events/hfo.ts`, `gauntlet.ts`, `services/alliance/membership.ts`, `services/admin/admin.ts`
- Language keys: `lb_not_listed_other`, `lb_no_yard`, `lb_other_world`.

## Chat moderation: badges, Delete line, Mute (2 October)

The user picked item 2 of the chat ideas: admin and moderator tools in the chat, with a moderator role.
The Alliances redesign that came with it is still at the recommendation stage. Nothing in the alliances
changed yet.

- **Badges.** Admins (InfernoOnlyConfig.admins) show `[Admin]` in red and chat moderators `[Mod]` in blue
  before their name, in Global and Alliance alike. The server decides who is staff. The badge is kept in
  the history with each line, and nobody can register an admin's name.
- **Delete this line.** Staff get it in the name menu, under "Moderation".
  - The line goes from everyone's screen at once and from the room's history: Redis for Global, the
    alliance's feed in Postgres.
  - Every line now carries an id: `g…` for Global, `a<row id>` for alliance lines.
  - The deleted text goes into the admin log (`chat-delete`).
- **Mute.**
  - From the name menu: Mute 10 minutes, 1 hour, 1 day, or Unmute.
  - Or by typing `/mute Name minutes` and `/unmute Name`.
  - It uses the same mute as the admin panel, and the muted player is told when they next speak.
  - Moderators can mute for at most a day, and never an admin or another moderator. Admins can mute anyone
    but themselves, for up to 30 days.
  - The server checks every request (`chat/chatModeration.ts`), and every action goes into the admin log.
- **Moderators** are set in the admin panel, on the player's card: Chat → Make moderator / Remove moderator.
  The card also lists the current moderators. The player's game learns its new role at once, without a
  reload. Stored in `user.chat_mod`: migration `20261005_AddChatModerators`.
- **Fixed with it:** the name menu now opens above the chat itself. Its lower rows used to sit behind the
  chat's lines, so clicks there only closed the menu.

Tested: `client-web/tools/test/chat-mod-test.mjs` (17 checks) passes. It covers:
- the badges, and the staff menu;
- a line deleted on both screens and from the history, and in the log;
- a mute from the menu, the muted player told, and `/unmute`;
- the panel switch taking effect live, with the `[Mod]` badge;
- a moderator unable to mute an admin, and `/mute` refused for players.

`chat-test` (39), `alliance-chat`, `languages` and `admin-security` still pass.

AS3 files changed: `com/monsters/chat/BYMChat.as`, `ChatEvent.as`, `IChatSystem.as`, `impl/ChatWire.as`,
`impl/http/HttpChatSystem.as`, `impl/ws/WSChatSystem.as`, `ui/ChatBox.as`, `ui/IoChatMenu.as`.

## Alliances window redesigned: header, Overview, Board, Outposts, officers (2 October)

The user's answers to the layout proposal: 1–4 yes, 5 yes without a Holdings view, 6 the chat only in the
dock's Alliance tab, 7 yes; A a leader plus officers (who can also invite and kick); B at most 50 pins, each
kept 30 days; C the same beige look; D player and tribe captures, filterable, no raids; E no chat lines for
outposts gained or lost; F 90 days of history.

**The window (Inferno only; the stock layout is unchanged).**
- A strip above the tabs: the emblem, name, rank, level, leader, the player's role, and three boxes:
  members online / total, outposts, empire value (the members' yards and outposts on the map).
- A member's tabs: Overview · Board · Outposts · Members · Power-Ups · Recruit (leader and officers) ·
  Invites · Browse. Browse stays for members: relationships with other alliances are set there.
- A player with no alliance: Browse · Invites · Create (the old create prompt).
- No chat in the window: the dock's Alliance tab is the alliance chat.
- The tab ids carry on from the old ones, so `SelectTab(1)` still means the alliance's own page
  (Overview, or Create).

**Overview.** The description with Edit (leader) and Leave; the two newest pins (Jump when they have a
place); this week's outposts gained, lost and net ("See the history" opens Outposts); the power-ups
running, with their time left (ticking).

**Board.**
- Pins: a title (80), words (600), and a place if wanted (x, y as the map shows them; the minus is optional).
- The leader and officers pin, change, reorder (Up / Down) and remove. At most 50; each is kept 30 days
  from when it was put up, then dropped as the board is read.
- Jump opens the map there, on the player's own world only. A pin's world is the author's, or the map's
  when it was pinned from the map.
- A new pin is said in Alliance chat ("X pinned to the board: title" with the place as a clickable map
  token, its own colour).
- The tab counts pins put up by others since the player last opened it ("Board (2)"). Server-side, per
  player, in Redis (`alliance-pins-seen:<userid>`). A pin said in chat refreshes the count if the window
  is open.
- From the map: the Share bubble has "Pin to alliance board" for the leader and officers. It opens the
  editor with the place filled in.

**Outposts.**
- Every outpost the members gained or lost in the last 90 days, newest first: when, gained / lost, the
  member, from / to whom (player and their alliance, or the tribe), where, and Jump.
- Filters: All / Gained / Lost, Both / Players / Tribes, a member, a world.
- Gained, lost and net for 7 and 30 days at the top. 50 rows a page; more load as the list is scrolled
  down.
- Written by the server at every takeover (`controllers/maproom/v2/takeoverCell.ts` →
  `services/alliance/allianceOutposts.ts recordTakeover`): a "gained" row for the taker's alliance and a
  "lost" row for the previous owner's. A tribe's yard has no previous owner; its tribe name is kept.
  Rows older than 90 days are pruned. Raids that don't take the outpost are not kept, and nothing is said
  in chat (E).
- The migration starts the history from the outposts members hold now, using their takeover dates. These
  rows say "held when the history began": where they came from isn't known.

**Members.**
- Role, name, level, outposts, empire, online / last seen, Actions.
- Sort by any heading; click again to reverse it. The choice is remembered while the game runs.
- Actions:
  - everyone: Send a message, Jump to their yard;
  - the leader and officers: Kick (an officer can't kick the leader or another officer);
  - the leader: Make officer / Remove officer, Make leader.

**Officers** (`user.alliance_role = 'officer'`). They can:
- pin;
- invite, and use Recruit;
- see and answer join requests;
- kick members.

Naming one says it in Alliance chat ("X is now an officer.").

**Server**
- Migration: `20261006_AddAllianceBoard`. It adds `bym.alliance_pin` and `bym.alliance_outpost_event`
  (with the backfill), and adds 'pinned' and 'officer' to the alliance chat line kinds.
- Routes (`controllers/alliance/ioAllianceBoard.ts`, Inferno only):
  - `GET|POST /alliance/pins` (`seen=1` clears the count);
  - `POST /alliance/savepin`, `/alliance/deletepin`, `/alliance/movepin`;
  - `GET|POST /alliance/outposts`;
  - `POST /alliance/setofficer`.
- `/alliance/myalliance` also returns, when Inferno: `outposts`, `empire`, `my_role`, `my_world`,
  `world_tag`, `pins_top`, `pin_count`, `unread_pins` and `week`.
- The own-alliance member list also returns each member's `role`, `outposts`, `empire` and `last_seen`.
- Language keys: `io_alliance_*`, in English, French, Spanish and Portuguese.

**Tests**
- `client-web/tools/test/alliance-board-test.mjs` (38 checks) passes. It covers:
  - the header and the tabs: leader, member, officer, no alliance;
  - no chat in the window;
  - sorting the members;
  - Make officer from Actions;
  - a pin typed in, its chat line and count, Edit / Down / Remove, and Jump;
  - the map's Pin button;
  - the Outposts filters, the member picker, and loading more on scrolling;
  - Leave, and rejoining by invite.
- Takeovers were checked against the server: a player's outpost (a gained row and a lost row, each with
  the other side's alliance) and a tribe's yard (gained, with the tribe's name).
- Still passing: `alliance-chat`, `chat` (39), `chat-mod`, `map-snapshot`, `map-ui`, `languages`,
  `leaderboards` and `popups`.

**AS3 files changed**
- Changed: `ALLIANCEPOPUP.as`, `com/monsters/alliances/ALLIANCES.as`, `AllianceConstants.as`,
  `tabs/SuggestedTab.as`, `com/monsters/maproom_advanced/IoMapShare.as`, `IoScrollPane.as`,
  `com/monsters/chat/BYMChat.as`, `ui/ChatBox.as`.
- New: `com/monsters/alliances/IoAllianceUi.as`, and in `tabs/`: `IoOverviewTab.as`, `IoBoardTab.as`,
  `IoOutpostsTab.as`, `IoMembersTab.as`, `IoPinEditorPopup.as`.

## Alliances rank by empire value, not empire points (2 October)

The user asked for the alliances to use empire value (as the leaderboards do) instead of empire points.
In Inferno, all of the following now count empire value:
- Browse: the order, the rank, and the column ("Empire Value", thousands marked);
- the window header's rank and its Empire value box (the same total Browse ranks by);
- the Members and Recruit lists, and Browse → Members (their order and the Empire column).

What counts:
- A player's empire value is `save.empirevalue` of every live cell they own on the alliance's map: the
  main yard and each outpost. This is what the leaderboards and `holdingsOf` add up.
- An alliance's empire value is that total over its members.

The server:
- Migration `20261007_AllianceEmpireValue` adds three columns to the end of the `bym.alliance_stats` view:
  `empire_value`, `value_world_rank` and `value_global_rank`. The stock game still reads `empire_points`
  and its ranks. `alliancestats.view.ts` matches it.
- `searchAlliances`, `myAlliance`, `allianceMembers` and `suggestedMembers` read the value when Inferno.
  The members' and candidates' `points` field carries the value then.
- Language key `io_alliance_col_ev` in all four languages.

AS3 files changed: `com/monsters/alliances/tabs/BrowseTab.as`, `tabs/MembersTab.as` (the column's heading
and number format; Recruit inherits it).

`alliance-board-test` (38) now switches wild monster attacks off: one popping up over the window had
broken a run. It passes, as do `alliance-chat` and `languages`.

## Login page: "What's different?" (2 October)

The user asked for a button on the login page that opens the overview of every change to the base game (the
"Inferno Maproom 2: every change to the base game" document) as a PDF in a new page.

- **The button** (`AuthForm.ioWhatsDifferent`, Inferno only) sits at the top right, across from the language
  picker. It is drawn like the picker, with an orange edge, and lights up under the mouse. The label is
  `io_whats_different` (four languages, and `KEYS.IO_FALLBACK`). A click opens
  `<server>/whats-different` in a new page (`GLOBAL.gotoURL`, `_blank`).
- **`GET /whats-different`** (`server/src/controllers/whatsDifferent.ts`, Inferno only) redirects to
  `/docs/Inferno-Maproom-2-changes.pdf?v=<the file's modified time>` with `no-store`. The button's link never
  changes, and a new copy of the PDF is never served from the browser's or the CDN's cache.
- **To publish a new version:** replace `server/public/docs/Inferno-Maproom-2-changes.pdf`. A server restart
  is needed only the first time the `docs/` folder is added, because `public/`'s top-level folders are read
  at start.
- The document was updated the same day to cover everything up to 2 October (49 pages).

Tested: `client-web/tools/test/whats-different-test.mjs` (5 checks) passes. It covers the button and its
place, the new page landing on the PDF, the PDF served, the game staying on the login page, and no page
errors. `languages` still passes.

AS3 files changed: `com/auth/AuthForm.as`, `KEYS.as`.

**Rewritten for players** (2 October, afternoon): the user asked for the document to speak to players, not
developers, and to redact Hell Freezes Over.
- Titled "Inferno Maproom 2: what's different" (39 pages, 16 categories). Anything only an admin or
  developer would care about is gone: settings files, code names, the admin panel, the Designer, test mode,
  server internals. Fixes are described as a player would have met them ("Fixes you might notice").
- **Hell Freezes Over** shows only its title, a picture of the event's window painted black except the title
  and a few slivers, and paragraphs of black bars with a few words left showing ("Something is wrong in the
  Inferno.", "the fires", "three days", "something waits"). The bars are black pictures with nothing under
  them, so no hidden text is in the PDF, DOC or DOCX. The rest of the document doesn't mention the event,
  Rimegrave or the ice monsters.
- `server/public/docs/Inferno-Maproom-2-changes.pdf` was replaced with this version (the login button
  serves it).

## Quest book: the quests redone as a tree (2 October)

The user asked for the quests' whole UI to be reworked, with new quests and fitting rewards (alliances, map
room, outposts, monsters, chatting and more), proposed first as a numbered list. Their answers: item 2 "I'm
envisioning something like a tree of quests", no badges (88), no chat titles (89), everything else as
proposed.

**What a player sees**
- **The Quests button** opens the Quest Book (`IoQuestBook`) instead of the old list. Its badge shows how
  many quests are ready to collect.
- **The window** has the Leaderboards' look.
  - Left: the categories with how many are collected, and a badge for the ready ones. They are Daily,
    Start, Yard, Monsters, Battles, Map Room, Outposts, Alliances, Social, Events and The Pit.
  - Middle: the category's quests as a tree. A quest opens once the one above it is collected. Drag or use
    the wheel to move round it; "Hide finished" folds away branches that are all collected.
  - Under the tree: the category's chest. It opens when every quest in the category is collected, except the
    optional ones.
  - Right: the quest picked, with what to do, a progress bar, the reward, Collect and Go there. A locked
    quest says which quest opens it.
  - Top: quests and chests collected, the whole book's chest, and Collect all. Collect all keeps going down
    a tree, so quests and chests that open on the way are collected too.
  - "Old quest list" (bottom left) still opens the old window.
- **Daily quests:** three a day from a pool of eight, different for every player, changing at midnight UTC.
  Each pays resources and 1 shiny; finishing all three pays a bonus of 500K resources and 2 shiny.
- **The quest dock** (bottom right) shows the book's rows instead of the old missions: every quest ready to
  collect (glowing, with its own Collect button), then the three closest to done. The pinned row is the
  book and today's dailies. A row opens the book at that quest.
- **A notice** slides in at the top when a quest becomes ready (no sound). Clicking it opens the book at the
  quest. It only shows in the player's own yard; notices that come during an attack wait until then.
- **Go there** goes to where the quest is done:
  - a building's menu, or its upgrade for a level quest; the build menu at the building if the yard
    hasn't got one;
  - the map, the chat (Global or Alliance tab), the Leaderboards, the daily reward, the Gauntlet, the
    Brimstone Pit, the Outposts list, Invite a friend, or the Alliances window at the right tab.

**The book** (`server/src/services/quests/questBook.ts`, tune it there) has 140 quests: Start 10, Yard 39,
Monsters 24, Battles 16, Map Room 8, Outposts 11, Alliances 9, Social 5, Events 9 and the Pit 9. There are
nine chests and the book's own.
- Shiny in all: 585 from quests and 585 from chests (1,170, near the ~1,200 proposed), plus 5 a day from the
  dailies. Resources in all: about 1.24 billion.
- The Pit's quests pay resources only and have no chest, so playing for a quest never makes shiny.
- Optional quests (not needed for a chest): pinning a note and setting an alliance relationship (leaders and
  officers only), and bringing in friends.
- Events has three trees side by side: the login streak, warts and the Gauntlet.

**How it is counted (server)**
- The server keeps every count and pays every reward. Table `bym.quest_progress` (migration
  `20261008_AddQuestBook`), one row per player:
  - `counters`;
  - `claimed`: quest and chest ids, with when;
  - `daily`: today's date, counters and the dailies collected;
  - `forced`: quests an admin marked done.
- Some values are read when the book is asked for, so what a player already did counts at once:
  - building levels, the Strongbox's pages and the Academy's levels, from the main yard's save;
  - outposts held; the alliance, its outposts gained in 7 days and its world rank by empire value;
  - friends brought in, bookmarks, Brimstone Pit bets and jackpots, the login streak and the Gauntlet.
- Counters run from the deploy. These are counted by the server itself:
  - chat: Global lines at most one a minute and not the same line twice; Alliance lines; a mention of a
    player who exists; a shared place;
  - a letter (plain messages only), a new board pin, the board read;
  - kits saved and built, the daily reward and the streak, the Gauntlet's furthest gate;
  - an invite accepted (credited to whoever sent it, kept in Redis for 35 days) or a request let in;
  - alliance power-ups funded or started, a relationship set;
  - outposts taken (and taken from a player), a golden wart.
- **The game reports** what only it sees through `POST /quests/event`, gathered and sent every 2.5 s. The
  server takes only the kinds in `CLIENT_EVENTS`, each held to a most per report and to how often it may come:
  - hatching (count, housing space, Korath/Drull/Ashkarr) and juicing — in the player's own yard only;
  - an attack's first fling, a win and on whom (a tribe, Moloch level 46+/50, a player; not the Gauntlet or
    test mode);
  - a wild monster attack held off, Marilyn, the Candy Jars or a Sulfur Bomb catapulted, a wart picked;
  - map opened, whole world in view, a jump, a search, the filters, a shared link opened; Find me on the
    Leaderboards;
  - the biggest one-click bank and the outposts' hourly total (best so far).
- **Collecting** (`POST /quests/claim`) runs in one transaction with the row locked. Something is paid once
  even when asked for twice at the same moment. It goes into the main yard as the Gauntlet pays (shiny and
  resources by SQL), and the answer carries the new totals and the book. The game adds the same resources to
  the yard shown and to what it last saved, so the next save's change stays right. Away from the main yard,
  only the shiny is shown at once; the main yard has the rest when it loads.
- **Admin panel:** a player's card has a "Quest book" card. It shows collected and ready by category, Mark
  done (for something that happened before the book counted it), Not collected, Start again (counts kept)
  and the counters. Each is in the admin log.

**Endpoints:** `GET|POST /quests/status`, `POST /quests/claim {ids}` (ids are quest or chest ids,
`daily:<id>`, `daily:bonus` or `all`) and `POST /quests/event {e, n}` or `{events: JSON}`. All are
Inferno-only.

**Choices made** (the user said "Build it"):
- no sound for the notice;
- counters start at the deploy, not when a quest opens;
- quests only staff can do, and the friend quests, are optional;
- the tree is drawn per category tab.

**Files**
- Server, new: `services/quests/questBook.ts`, `services/quests/questProgress.ts`,
  `controllers/quests/ioQuests.ts`, `database/migrations/20261008_AddQuestBook.ts`.
- Server, changed: `app.routes.ts`, `chat/chatRooms.ts`, `controllers/mail/sendMessage.ts`,
  `controllers/maproom/v2/playerKits.ts`, `applyKit.ts`, `takeoverCell.ts`,
  `controllers/user/collectDaily.ts`, `controllers/alliance/inviteUser.ts`, `changeInviteStatus.ts`,
  `changeRelationship.ts`, `activatePowerup.ts`, `purchasePowerup.ts`, `ioAllianceBoard.ts`,
  `services/base/updateCredits.ts`, `services/events/gauntlet.ts`, `controllers/admin/adminApi.ts`,
  `services/admin/panel.html`.
- Language keys `io_quest_*`, `io_qt_*` and `io_qd_*` (191) in all four languages.

AS3 files changed:
- New: `com/monsters/quests/IoQuests.as`, `IoQuestBook.as`, `IoQuestTracker.as`, `IoQuestArt.as`.
- Changed: `QUESTS.as`, `com/monsters/ui/UI_BOTTOM.as`, `com/monsters/missions/UI_MISSIONMENU.as`,
  `BUILDING13.as`, `BUILDING16.as`, `BUILDING9.as`, `ATTACK.as`, `WMATTACK.as`, `MUSHROOMS.as`,
  `BRESOURCE.as`, `com/monsters/effects/ResourceBombs.as`.
- Changed, map and chat: `com/monsters/maproom_advanced/MapRoom.as`, `MapRoomPopup.as`, `MapRoomCell.as`,
  `IoMapSidebar.as`, `IoMapFiltersPopup.as`, `IoMapShare.as`, `IoOutpostsPopup.as`,
  `com/monsters/leaderboards/IoLeaderboards.as`, `com/monsters/chat/ui/ChatBox.as`.

**Tested**
- `client-web/tools/test/quest-server-test.mjs` (22 checks): the book's shape; locked can't be collected;
  four claims at once pay once; reports held to their most, their rate and best-so-far; a letter, a pin and the
  board read counted; daily quests and the bonus.
- `client-web/tools/test/quest-book-test.mjs` (24 checks): the dock and badge; the window, categories and a
  tree; Collect paying the yard shown at once and opening the next quests; once only; daily quests;
  dragging; Collect all down a tree and its chest; Hide finished; a reported event counted once and an
  unknown one left out; a real wart pick counted; the notice and clicking it; the old list; Go there opening
  the build menu at the building.
- Two older tests were fixed while running the regressions:
  - `chat-mod` signs the admin in with the game's own token. Logging in again had logged the game out, and
    the quest book's requests then showed "Please reload" over the chat.
  - `map-ui` waits a full turn of the 5-minute snapshot clock for the flinger ranges.
- Passing: alliance-board, alliance-chat, chat, chat-mod, map-snapshot, map-ui, languages, leaderboards,
  popups, gauntlet, outposts, catapult, casino, warts, wild-attack, designer, admin-test-mode and
  locker-academy.

## The Designer's tribe and Moloch layouts made the default (2 October, night)

The user exported `bym.io_design` from the live server and asked for it to be made the default. That is
all 19 tribe levels and all 13 Moloch descent bases, as designed up to 29 September, with their defending
monsters and levels.

- **`server/src/game-data/designs/defaultDesigns.ts`** holds the 32 layouts. It is generated from the
  export; to change it, design in the game, export again and replace the file.
- **Where the stock comes from now:**
  - a tribe level: the template with its default on top (`tribeTemplate`, via `designStore.withStockDesign`);
  - a Moloch base: `molochStock(n)` in `molochStrongholds.ts`, used by the Gauntlet, the strongholds and
    the Designer.
  - The defaults apply only where designs applied before. The stock game's own descent (`infernoModeView` /
    `infernoModeAttack`) still uses the native yards. A default yard starts at full health.
- **Order:** a layout designed later in the Designer (a row in `io_design`) still comes first. Reset deletes
  the row, so the layout goes back to the default rather than the old template.
- **Migration `20261009_DesignsAsDefaults`** deletes the rows that are exactly the default (layout, monsters
  and levels). The Designer then lists those layouts as stock, with nothing for Reset to undo. A row changed
  since the export stays. The kits' `kit-original` rows are untouched.
- **The outpost kits** were already the default: they live in `public/assets/kits/inferno-kits.json`, the
  file the Designer writes. The repo just needs that file as it is on the server.

Tested on the test database with the export loaded:
- the migration took out all 32 rows (each was the default) and left the 4 kit rows;
- the Designer list then showed all 32 layouts as stock, with the same building and monster counts as the
  export;
- `designer` (37), `designer-recycle` (10) and `gauntlet` (57) pass.

No AS3 changes.

## "What's different?" document: corrections and new pictures (3 October)

The user's corrections to the players' document (`server/public/docs/Inferno-Maproom-2-changes.pdf`, also
made as .doc / .docx):
- Pictures retaken from the current game, from a full yard of a player account (no admin buttons): the yard,
  warts and a golden wart, the build menu's tabs, the Strongbox, the Incubation Control Station, the shiny
  confirmation, the Yard Planner, the Daily Reward, Invite a friend, Moloch's Gauntlet, the map room, the map,
  the world map, Relocate, the Outposts list, the Wild Monster Alert, a stop with Reload and the browser
  page. New: four for the Quest Book. Pictures of things that haven't changed since they were taken were
  kept: the tribe and monster art, the balance chart, battle scenes, the casino sheets, and the chat,
  alliance, leaderboard and login pictures already taken on 2 October.
- The "Starting shiny 10,000-25,000 / about 2,000" row is gone.
- Moloch's loot is now what a player really carries off. The Under Hall pays 8% of what is left and each
  Resource Pod 4%, both capped per building, and magma pays half. A full clear pays about 12-14M of bone,
  coal and sulfur and 3.5-4M magma at level 46, and about 23M and 8M at level 50.
- A new category, 10. The Quest Book.
- The site is https://inferno.maproom2.com/ (the old address still works).
- "Fixes you might notice" (was 16) is gone. The document is 16 categories, 42 pages.

## Every quest reachable: the quest book audited (3 October)

Every one of the 140 quests and 8 daily quests was checked against the game: that what it counts is
really reported (by the game or the server), that its target is within the game's limits, and that its
tree can be reached.

**Checked against the game's own numbers.** Hall 6, harvesters 10 (a level-10 harvester holds 775,000, so
the 500,000 one-click bank is possible), Flinger 4, Strongbox 5 (its pages as in the client, page 5
without Rimegrave), Academy 5, Pit 5, towers 6/7, Juicer 3. The login streak has no end; tribe map ids
1/11/21/31 and Moloch 51; the casino's game names and the jackpot; bookmarks; the `[map:` chat link;
usernames as the @mention rule reads them; outposts have no cap. A static pass over the book found no
key without a source, no target above its most, no tree crossing a category or looping, and no needed
quest behind an optional one.

**Played through.** In the browser: a hatch, a Juicer prep, a bank, Find me, opening a shared link, a map
jump, search and the filters, an attack on every tribe, Moloch 46 and 50, a player, and a wild attack held
off. Over the API: the daily reward and its streak, a relationship, a request let in and an invite
accepted (counted for the one who invited).

**Changed.**
- Optional (they don't count against the book's last chest): `a_invite` (staff), `a_relation` (leader
  only; the game only lets a leader change one), `a_powerup` (a power-up can only be bought while it
  recharges), `a_top3`, `x_jackpot`, with `a_pin`, `c_friend1`, `c_friend3` as before. `QuestDef.leader`
  shows "Alliance leaders only" in the book (`io_quest_leader`).
- Daily quests have needs (`DailyDef.needs`): wins and captures need a Flinger, hatching an Incubator,
  the Juicer a Juicer, the Pit a Pit and shiny switched on, wild attacks a yard of level 3. The day's pick
  is chosen only from those the yard can do (so a new yard may get fewer than three) and kept in
  `quest_progress.daily.picked`, so building something during the day doesn't change it.
- `map_open` is reported only when the map really opens (`MapRoom.as`), and "Open the map"'s Go there
  opens the build menu at the Map Room when the main yard has none (`IoQuests.as`).
- A board pin counts as new only when it has no id yet (`ioAllianceBoard.ts`).
- `questProgress.ts`'s SQL runs inside the claim's transaction: four claims at the same moment pay once.

**Still long, but possible.** 100 outposts, 10M an hour, the gate at 13, Moloch 50. A player who switched
shiny off can't play the Pit, so it is never their daily quest; its book quests stay in its tree.

AS3 changed: `IoQuests.as`, `IoQuestBook.as`, `MapRoom.as`. Tests: `quest-server-test.mjs` 24 checks,
`quest-book-test.mjs` 24. No migration.

## Bug reports #60 and #61 (3 October)

- **#60, Error #1056 (Flash Player only)**: the Quest Book marked a ready quest or chest by putting `ioReady`
  on its `Sprite` by name. Flash Player refuses a made-up property on a sealed class (a Sprite is one: Error
  #1056 writing it, #1069 reading it), so drawing the book stopped there; the browser runtime allows it, so
  no browser player saw it. Those two are drawn on a `MovieClip` now, which is dynamic (`IoQuestBook.node`,
  `chestButton`). Every other read or write by name in the AS3 was checked for the same thing: the only
  others are CasinoUI's buttons, which are MovieClips already.
- **#61, Error #1009 in `HOUSINGBUNKER.RangeIndicator`**: the mouse over a bunker in your yard asks for its
  range ring a quarter second later. Going into an attack inside that quarter second (here The Descent's
  Enter Gate, clicked straight after coming home) cleared the yard first, and the ring was drawn onto no
  footprint layer. Inferno only: no ring unless the yard is still there and in build mode. The same in
  `BTOWER` and `BUILDING22`, which have the same delayed ring.
- **Bug report times from Flash Player** read "9 2026 U": they were cut out of `toUTCString`, whose form
  differs (Flash "Sat Oct 3 07:47:59 2026 UTC", the browser "Sat, 03 Oct 2026 07:47:59 GMT"). They are built
  from the hours, minutes and seconds now (`IoBugReport.stamp`).
- (Seen, not changed: #60's report had no clicks from a Flash Player who had dismissed several popups. The
  click trail is a capture listener on the stage; it records clicks in the browser, and nothing in the code
  says why it wouldn't in Flash Player. Worth a look at the next Flash report.)

New `client-web/tools/test/bugs-oct3-test.mjs` (7 checks): the sealed-class scan over the AS3, the report's
times with Flash Player's date form, a bunker's and a tower's ring drawn in the yard and nothing (no error)
when the yard goes first, a ready quest drawn on a MovieClip with `ioReady`. AS3 changed: `IoQuestBook.as`,
`HOUSINGBUNKER.as`, `BTOWER.as`, `BUILDING22.as`, `IoBugReport.as`.

## The UI sweep: every window looked at (3 October)

Every window the game opens was opened and looked at, in English, French, Spanish and Portuguese, and on a
1024 x 640 screen:
- the top and bottom bars and everything they open;
- every building's info panel and each of its buttons' windows;
- the Quest Book (every category), the Brimstone Pit (lobby, every game, History, Fairness);
- the alliance window (every tab), the leaderboards, Moloch's Gauntlet, the outposts list, the mailbox;
- the Daily Reward, Invite a friend, the Compound, the Strongbox, the Yard Planner and its dialogs;
- the map room (its tutorial, its buttons, the world map), an attack (HUD, catapult, end popup);
- the login and register page.

Each view was screenshotted, and every text on it was measured: one-line text wider than its field, wrapped
text taller than its field, raw keys, "undefined"/"NaN", text or windows off screen. About 900 views in all.
The screenshots were then read by hand.

Fixed (all Inferno only unless said):
- **Top bar counters** from 50,000,000: the last digit wrapped under the field ("50,000,00"). A counter is now
  drawn a size smaller when it doesn't fit (`UI_TOP.ioSetText`). The same in the map room's resource panel
  ("131,533,29") and its outposts count, and in the Incubation Control Station's "Magma remaining". This uses
  a new shared helper, `GLOBAL.ioFitText(field, smallest, scale)`: a one-line field's text is drawn smaller
  until it fits.
- **Button labels** (`Button`, `ButtonBrown`, stock): a label longer than its button was cut at both edges
  ("Sauvegarder les paramètres", "Aucun monstre sélectionné", "Create Alliance"). It is now drawn smaller.
  The button's stretch is counted.
- **Invite a friend**: only the first lines showed. The invite itself and the note were cut off. The popup
  now grows to its text (`UI_TOP.ioShowInvite`).
- **Compound with no room** (0 / 0): its red bar was NaN wide and ran out of the window to the screen's edge
  (`HOUSINGPOPUP`).
- **Mailbox**: its column headings were empty boxes. They now say From / Subject / Date (`Inbox.ioHeading`).
- **Alliance window on a short screen**: its top and close button were above the screen. It was centred by a
  height that counts the whole member list behind its scroll mask; it is now centred by its frame
  (`ALLIANCEPOPUP.Center`).
- **Brimstone Pit**:
  - Ascent's auto cash-out field covered the "AT" of its label;
  - History showed "null" for Derby and Ascent bets and kept the last game's result line over the table;
  - Roulette's monster pictures, loaded after the names, were drawn over them ("ALTHAZAR").
- **Chat**: a shared place's pill broke after a coordinate's minus sign ("(-" / "150, -260)"). Coordinates are
  drawn with a real minus sign now (`IoMapShare.RenderChat`).
- **Quest Book**: an opened chest's reward line was cut ("... 25 sh"). The daily quests' descriptions are
  drawn smaller when long (French). The title fits.
- **Leaderboards and alliance Members**: column headings drawn smaller when long ("Valeur de l'empire",
  "Avant-postes").
- **Daily Reward**: the line after collecting ran past the window.
- **Login page**: the register form's two error lines were in the player's default serif font and the
  email one sat half under the password field. Both are now under the password field, in the form's font
  (`AuthForm.showErrorMessage`).
- **Chaos Factory / Chaos Lab** "More" window: empty picture frame (it asked for 133.jpg/134.jpg; their
  pictures are seige_factory.jpg / siege_lab.jpg) (`BUILDINGOPTIONSPOPUP`).
- **Lists** in building descriptions joined with English " and " and an English plural "s" in every language
  ("Concasseur d'oss ... and Tour Explosive"). Now `io_word_and` and `io_plural_suffix` from the language
  file (`GLOBAL.Array2String`/`Array2StringB`, `BUILDING14`).
- **Yard Planner**: its checkbox labels (French, Spanish, Portuguese) wrapped to a hidden second line; now
  drawn smaller. Stock old-quest reward titles ("Charbo") the same (`QUESTSPOPUP`).
- **Language files** (no code):
  - French building names were wrapped in their own keys and showed as "#bi_Enclos#", "#bi_Fabrique d'Os#",
    "#b_Cheval de Troie#", "#bi_Pompe à Magma#" ... (in the build menu, Quest Book, windows). They are now
    plain names.
  - Accented letters the planner's font can't draw ("Dfense", "Btiments") are written without the accent in
    those seven category names.
  - Portuguese building info for buildings without levels showed "#v4#" and no line breaks
    (`bdg_morenolevel` had the levelled form). The unlock-for-free line had a stray "#v2#".
  - "Recycle your #v1#" lines took a name the English never gave.
  - 488 strings that were still English were translated, mostly the alliance window, power-ups and Inferno
    windows. Many labels were shortened to fit their buttons, columns and fields: the planner, academy,
    radio, Chaos Lab title, speed-up cards, Compound, power-up texts, "Finish now", "Unlock in the
    Strongbox", "Not enough room". Spanish typos ("gratino", "FACTORIA DE CHAOS", "hexes") were fixed.

Not changed, for the record:
- Several Inferno windows are written in English in the code, so they show English in every language: the
  Brimstone Pit, the outposts list, the Daily Reward, Moloch's Gauntlet, Invite a friend, the chat name menu,
  the planner's tool names and the map room sidebar. Translating them means moving their texts into the
  language files.
- On a 1024 x 640 screen the map room's bottom edge sits behind the chat and the quest dock.
- The old quest list (stock) truncates long quest names.

Tests:
- New `client-web/tools/test/ui-visual-test.mjs` (41 checks). In the four languages it opens the Quest Book,
  leaderboards, alliance Members, Compound, Yard Planner and mailbox, and checks every text with the sweep's
  measure. It also checks the mailbox headings, the Compound at 0 / 0, the top bar's counters, Invite a
  friend, the Pit's Ascent label, and the alliance window on a small screen.
- `map-ui-test` expects the minus sign; `bugs-oct3-test` allows AscentGame by file.
- `alliance-board-test` and `planner-tools-test` now clear every queued popup first: the once-per-login
  welcome and the repairman covered the window they click.

These tests still fail, exactly the same, on the build from before this sweep, and are left as they are:
- menu-art: the chat's newest line, and a juice at the magma cap;
- remade-assets: the old quest dock's icons, since the Quest Book replaced that dock;
- stops #15, hfo's last-tower popup, fusebug's heal and alliance-chat's name click;
- map-ui "Hostile": the test world has no hostile players.

## Attack logs, walls and traps, incubators, layouts, tribe resets (3 October, afternoon)

**Attack logs** (the top bar's crossed swords, right of the leaderboards; `com/monsters/leaderboards/IoAttackLogs.as`):
- Two tabs: My attacks and Attacks on me, the newest first (60 of each).
- Each row shows when, the other side (a tribe yard shows its tribe's name: Kozmodeus, Moloch ...), the yard
  (main yard, outpost, a tribe's level), the damage (or "In progress") and the loot.
- Report opens the details: when, the yard and where it is, damage, buildings knocked down, loot taken or
  lost, and the battle log the attacking game wrote. Jump opens the map on the yard.
- Server:
  - `createAttackLog` is called when an attack starts. Tribe and Moloch yards are logged too (defender_userid
    0), with the yard's baseid and level.
  - Each attack save calls `updateAttackLog` (baseSave, infernoSave). It adds the damage, the buildings at 0
    health (walls and traps not counted, nor those already down when the attack started), the loot (the
    attack's `lootreport`, the game's own "Resources Looted" total) and the report html. The last save
    (`over`) ends the log.
  - Practice (admin test mode) is not logged. Moloch's Gauntlet is not logged (its own window has the ladder).
  - Route `/attacklogs/game` (own logs only; `id` gives one report), with its own rate limit (40 a minute).
  - Migration `20261010_AttackLogDetails`: creates `bym.attack_logs` where it is missing, and adds baseid,
    level, damage, destroyed, ended, endtime and the indexes.

**Upgrade All (Resources)** on a wall's panel (`com/monsters/walls/IoWallUpgrade.as`):
- It lists each level the walls can still go to (Level 2, Level 3) with the exact cost: for every wall
  below that level, the sum of the steps it still has to take.
- A level whose Under Hall requirement isn't met, or that the yard can't pay, says so and has no button.
- Paid, every wall is upgraded at once (walls being built or upgraded are finished first). The shiny Upgrade
  All stays as it was.

**Traps that went off stay** (`BTRAP`, `BHEAVYTRAP`, `com/monsters/walls/IoTrapRearm.as`):
- A trap set off in an attack, or by a wild monster attack at home, stays in the yard, drawn faded and
  disarmed. It does not go off again, and it is saved with `"fd": 1`.
- On the server, an attack save keeps the traps it set off (`buildingDataHandler`), where it used to drop
  them.
- A disarmed trap's panel has **Re-arm All**: every disarmed trap at once, for their build costs added up.

**The Incubator: hold a monster down** to keep adding it, as the Control Station does:
- One is added at once, then one every other frame after about a third of a second.
- It stops when the queue is full or the magma runs out.
- The yard is saved once when the button is let go (`HATCHERYPOPUP.ioHold*`).

**The Incubation Control Station: small arrows** under the queue move a monster one place left or right
(`HATCHERYCCPOPUP.ioDrawArrows`).

**Yard Planner: Export and Import** (two new tiles in the toolbar):
- Export copies the plan as text: `BYML1:` and base64 of `[[type, x, y], ...]`. Building types only (no
  levels) and no decorations. The text is also shown to copy by hand.
- Import puts each of your buildings where the layout has one of its type. Buildings the layout has no place
  for go to storage. Decorations stay, unless they are now in the way; then they go to storage too.
- It is one step in Undo, and it still has to be Applied.
- (`Base64.decode` reads nothing back from text that ends in "=", so the bytes are read directly.)

**Decorations build in 0 s** (their props' times are 0, and placing one finishes it at once).

**The Under Hall is 130 x 130**, as the overworld's Town Hall (client `BUILDING14`, server kit previews and
devilified yards).

**Every Inferno monster trains to level 6** in a level 5 Academy: those with five training steps
(`CREATURELOCKER.ioReachesLevel6`).

**The worker icon shows in an outpost** (its one worker; `UI2.Setup`).

**Tribe yards go back to fresh 12 hours after their last attack, by themselves**
(`services/maproom/v2/tribeReset.ts`, every 5 minutes):
- The Save and world_map_cell rows of a tribe yard whose savetime (moved by every attack) is more than 12
  hours old are deleted.
- The next look at the cell builds the yard fresh. Before this, a yard was only made fresh when somebody next
  opened it, so the map kept showing it damaged.
- Moloch's Gauntlet yards are left alone.

## The bug reports of 3 October: the automatic ones and the AI tester's list

Automatic:
- **#62**: Invalid BitmapData in `ScratchersGame.cover`. A card's coating picture arrived after the card had
  been closed (switching tabs). It is now ignored.
- **#61**: null `attackTime` in `WMATTACK.PreemptQueue`. "Send now" was pressed again once the attack had
  started. Nothing queued now does nothing.

The AI tester's list (from the previous version). Fixed:
- **B1**: the tribe dialogs used the overworld names ("Attack the Abunakki tribe", "You destroyed a
  Legionnaire base", "Wild Monsters can't read"). They now use the Inferno's names (`TRIBES.DisplayName`).
- **B4 Close Enough**:
  - Its texts said 5 minutes, and Buy refused it over 5 minutes, while the store offered it under 10 (the
    server's `closeEnoughMinutes`).
  - The texts now say the server's minutes (`#cm#` in the language files, filled in by `KEYS.Get`).
  - The check uses them, and it finishes the job.
- **B6**: a failed attack now says how much of the yard is destroyed and that a yard falls at 90% (the Under
  Hall alone isn't enough).
- **B11**: a greyed-out Attack button's tip says the yard is out of the Flinger's range.
- **B12**: the takeover window says how its price is worked out: by the yard's level (or the outpost's value),
  and half price next to the main yard.
- **B14**: the idle "Having fun? Invite a friend" never comes during an attack (it stacked on the attack's end
  popups); it waits until the player is home. B25: that popup after 6 idle minutes, and the welcome at
  login, are by design.
- **B15**: on a screen narrower than the Alliances window (800 wide), the window is shown smaller, so its
  close button is on screen.
- **B16**: the home popup's location no longer runs into its Bookmark button.
- **B23**: an idle harvester's button says Overdrive (it opens Production Overdrive), not Speed Up.
- **B24**: in an outpost, the busy-worker message no longer suggests a General Store.
- **B26**: a yard's load with no answer (the server restarting) is tried again up to six times. The game says
  "Can't reach the server (it may be restarting)" instead of "Oops, something broke!".
- **A2**: an alliance or global chat line that never comes back from the server goes back in the box after 6
  seconds, and the chat says so. It used to be lost silently right after a reconnect.
- **A4**: the bookmark coordinates are drawn smaller when they don't fit (Flash cut the Y off).
- **A10**: a long building name (Infernal Academy) is drawn smaller and centred on its menu.

Already fixed in this version, or not bugs:
- B2 (raw `#m_fusebug#`), B7 (counters), B17 (chat scroll), B18 (200 characters) and B19 (the stray ignore
  line) are already fixed.
- B3 is not a bug: production times are scaled in this world, so 01s is right.
- B27 is by design.

Not done (see HANDOFF open items):
- A1 bold text in the browser: Flash's rule for bold embedded Verdana isn't known; a guess would change every
  text in the game.
- A3, A5 to A9.
- B5 (the Gauntlet has one rate, from the server), B8, B9 (not reproduced), B10, B13, B20 to B22.

## Bug hunt (3 October, evening)

Played for real, with the yard saved:
- Walls upgraded for resources through the panel and the message's button.
- Traps re-armed.
- Two tribe attacks and a player-against-player attack sent through the attack popup. One trap went off
  and the server kept it disarmed; the defender saw the attack under Attacks on me.
- The crawl of every building's buttons.

Found and fixed:
- **Attack end popup** (B6 text): the added line ran out of its box. It is now one sentence in place of the
  stock one, drawn smaller if needed (new helper `GLOBAL.ioFitHeight` for wrapped fields). The takeover
  popup's price note uses it too, on the same line as its description.
- **Attack logs**:
  - A big yard's battle report (every wall knocked down is a line) was cut at 20,000 characters, in the
    middle of a tag, losing the "Resources Looted" end.
  - It is now kept to 40,000: its first lines whole, "...", and the end (`capReport`).
  - The report also scrolls with the wheel over its panel's empty part (the browser client doesn't hit an
    empty sprite).
- **Planner Import**:
  - A layout with fewer of a building type than your yard sent the rest to storage. A plan with buildings in
    storage can't be applied, so Import was useless then.
  - Buildings the layout doesn't place now stay where they are. What overlaps goes to storage, one at a
    time (of two that overlap, one goes). What already overlapped before stays as it was.
  - The message says when stored buildings must be placed first (`PlannerDesignView.ioInvalidNodes`:
    overlaps only, since a yard's own buildings can stand past the edge the planner knows).
- **Browser text selection**: selected text was drawn black on its black highlight; it is now white, as in
  Flash (`client-web/src/flash/text`). The Export prompt's code was unreadable because of this.
- **Upgrade All (Resources)**: the two level buttons read Level 3 / Level 2 left to right; now Level 2 is on
  the left.
- **Crash: `MapRoomCell.Setup`** read the home cell before one was known (a yard opened before its map
  data). It is now guarded.
- Spanish and Portuguese wording of the new button matches the shiny one ("Mejorar Todo", "Aprimorar Tudo").

Checked, not bugs:
- Traps that go off after the yard is destroyed are not saved, because the attack is already over.
- Battle reports are in the attacker's language (the attacking game writes them).

## A building's name centred; attacking from an off-screen main yard (3 October, night)

- **Building menu name** (`BUILDINGINFO.Show`): the name is now centred over the menu's buttons (x 6, 110
  wide), measured by its drawn box (`getBounds`).
  - The earlier fix centred the field's `x` on the frame. But the library's text box is drawn 29 px right of
    the field's `x`, so the name sat about 30 px right of centre. It was worst on a harvester, whose frame is
    twice as wide (its info box sits beside the buttons).
  - A long name ("Infernal Academy") is still made smaller to fit.
- **Attacking from your main yard when it is off the map's screen**: the map only has tiles for what is in view.
  - An off-screen main yard was stood in for by one cell, `_fallbackHomeCell`. That cell is made once, and
    can be made from the world snapshot (no monsters, no Flinger range) if the map drew before the home's
    zone arrived. Attack then stayed greyed out, or offered none of the home yard's monsters.
  - Now any of your own yards beyond the screen is made from its zone's data (`MapRoomPopup.ioOffscreenCell`,
    via `MapRoom.ioZoneCell`; zones not yet loaded are asked for).
  - The Attack popup waits up to 5 seconds for zones still loading (`PopupAttackA.Update`).
  - The monsters flung come out of that yard, as from an on-screen one (`BASE` reads
    `GLOBAL._attackerCellsInRange`).
- Tests:
  - `tools/test/offscreen-attack-test.mjs` (with `FULL=1` it makes the attack and checks the monsters come
    out of the home yard).
  - `bugs-oct3b-test.mjs` A10 now checks the drawn name is centred on six building types.
  - `map-ui-test.mjs` finds the chat's place link by its minus sign.

## Import refuses layouts that overlap or leave the yard (3 October, night)

- **The Yard Planner's Import** (`BasePlannerPopup.ioCheckLayout`) now checks the whole code before it changes anything. A code is refused, and the plan isn't touched, when:
  - any of its buildings stands past the edge of the importing player's yard. The yard is the size it is now (`GLOBAL._mapWidth` x `_mapHeight`, with the expansions bought, as the planner draws it).
  - or any two of its buildings overlap.
- The message says how many, names a few, and gives the yard's size.
- Sizes are the planner's footprints for the types the player has. A type they have none of won't be placed: it is sized 20 for the edge and left out of the overlaps.
- Before this, Import never checked the yard's edge. A code from a fully expanded yard (1620 x 1300) could put buildings outside a 1000 x 800 one.
  - The code in that report is refused on a 1000 x 800 yard: 89 buildings past the edge.
  - The same code imports into a fully expanded yard.
- **Apply** refuses a plan with buildings past the edge or overlapping, with the same check. That covers a plan saved from an import made before this change.
- The check is in the client only. The server doesn't check where a save puts buildings, as before.
- Test yard: show@example.com's yard had 37 buildings past its 1000 x 800 edge, which was test data. It now has its five expansions and an Incubator moved inside.
- Tests: `oct3-features-test.mjs` now checks that a code with a building past the edge, or with two that overlap, is refused (the plan unchanged), and that such a plan isn't applied. Its Export / Import round trip shifts the layout only as far as the yard allows, and leaves off the plan the test's own buildings placed past the edge.

## Magma Drop 20 at once, outpost Previous / Home, the Wart Bloom (3 October, night)

- **Magma Drop**: up to 20 Spurtz in the air at once (`MagmaDropGame.MAX_IN_FLIGHT`; was 6).
  - The Pit's rate limit (`casinoLimiter`) is now 720 requests a minute per player (was 240). 20 Spurtz of about 2 seconds each is 10 drops a second at full speed.
- **The Outposts list** (the top bar's >> button) has `[◀ Previous] [Home] [Next outpost ▶]`:
  - Outposts go in the order they were taken (the server appends each takeover to `outposts`).
  - Both ways go round: Next from the last outpost goes to the first; Previous from the first goes to the last.
  - From the main yard, Next opens the first outpost and Previous the last. Home is greyed out there.
  - Code: `BASE.ioLoadPrevious` / `ioLoadNextOutpost` / `ioGoHome`; `BASE._ioStepDir` tells `LoadNext` which way. It stays set while LoadNext waits for a save, then goes back to 1.
- **The Wart Bloom**: every weekend, Friday 6 pm until Sunday midnight, US Central time (daylight saving included), warts grow 3 times as fast in the main yard, never in outposts.
  - Server, `services/events/wartBloomTimes.ts`: the windows. It sends the flag `io_wartbloom` with every load and poll (`playerFlags.ts`): `{rate: 3, w: [[start, end] x 3]}` for last week, this week and next week.
  - Server, `services/events/wartBloom.ts`: checks every minute and announces the start and the end in Global chat, as a new broadcast kind "event" (shown as "Event: ..." on a green line). Redis keys `wartbloom:start:<t>` and `wartbloom:end:<t>` make sure each is announced once.
  - Game, `MUSHROOMS.ioGrowth`: one wart per 17,280 seconds of growth, at most 10 in the yard. Each second inside a bloom counts 3 times, offline time too, so a weekend's warts come every 1.6 hours.
  - In a bloom, warts also grow while the main yard is open: `MUSHROOMS.ioTick`, every 30 seconds. Outside a bloom they only grow when the yard loads, as before.
- Test: `tools/test/oct3-night-test.mjs`.

## Pets (3 October, night)

- **What they are:** copies of the Inferno's monsters at 60% size that wander the main yard. They are just for looks.
  - Every Inferno monster can be a pet except the champions (Korath, Drull, Ashkarr) and the Rimegrave: 18 in all, Hell Freezes Over's ice monsters included.
  - Price: 500 Shiny each.
  - At most 2 are out in the yard at once; the rest wait in storage.
  - Storing one gives no Shiny back.
  - Never in outposts.
- **Buying:** Buildings menu → Decorations → the new 6th tab, **Pets** (`IoPetsPanel`). It shows ten cards a page, two pages.
  - Each card has the monster's picture, how many you have out and stored, **Buy** (asks first), **Out** and **Store**.
  - A pet bought while 2 are out goes to storage, and the game says so.
- **Server:**
  - Table `bym.pet` (id, user_id, monster, out): migration `20261011_AddPets`.
  - `config/PetsConfig.ts`: price, maxOut 2, maxOwned 60, the monsters.
  - `services/pets/pets.ts`: buying is one transaction. The save row is locked, the balance checked and taken, the pet added. Shiny lock is respected.
  - Routes `pets/list`, `pets/buy`, `pets/place` (`controllers/pets/pets.ts`, `petsLimiter`: 60 a minute).
  - The server refuses a third pet out, a monster that can't be a pet, and someone else's pet.
  - Any main yard's load sends `io_pets` (`[[id, monster, out]]`): all of them for the owner, only the ones out for an attacker or a visitor.
- **Game:**
  - `com/monsters/pets/IoPets.as` holds the data, puts the pets in the yard once it is built (after the warts) and ticks them with the workers. `BASE.Cleanup` clears them.
  - `IoPet.as` is one pet: a sprite on the building layer with a RasterData, like a worker.
  - **Drawing:** each pet draws from the monster's own sheet: `SPRITES` / `CreepSkinManager` for most, `IoIceCreep.SHEETS` for the ice monsters, the Emberghoul's wider canvas. The frame is drawn at full size, then shrunk to 60%.
  - **Wandering:** a pet walks in a straight line to a spot within about 260 units, then rests 1.5 to 7.5 seconds. Its path never crosses a building and stays inside the yard (`IoPets.clearLine` on the grid).
  - Pets are not creeps: nothing targets them in an attack. They aren't in the Yard Planner or its Export, and they won't be in replays.
- Test: `tools/test/pets-test.mjs` (EMAIL3 needs 1,600 Shiny; EMAIL2 views the yard).

## Attack replays (3 October, night)

- **Which attacks:** player against player only, on a main yard or an outpost. Not tribes, Moloch, the Gauntlet or admin practice attacks.
  - When the attack's load is answered, the server makes the replay row (`startReplay`, in `baseLoad`). It snapshots the yard (buildings, health, warts) and sends the key as `io_replay: {key, rec: 1}`.
- **Recording:** `com/monsters/replays/IoReplayRecorder.as`.
  - Four samples a second of game time (every 20 of the 80 steps a second).
  - It records every monster on the field (`CREEPS`, `CREATURES`, both champion lists) with position, health %, height and a "held still" flag. It records every building whose health changes, and the damage %.
  - Only changes are kept. A monster is described once (its id, side, level, or a cage champion's sprite).
  - The recording goes to the server in 30-second parts (`replays/chunk`). When the attack ends (`ATTACK.End`) or the yard is left (`BASE.Cleanup`), the last part is sent and the replay is finished: gzipped into `bym.replay.data` (migration `20261012_AddReplays`).
  - Example size: 35 monsters for 36 seconds came to 22 KB of parts and 7 KB gzipped.
  - Recording stops after 20 minutes. A recording whose parts stopped coming is finished after 30 minutes with what it has.
- **Keeping:**
  - Replays are kept 7 days, except that each defender keeps at least their 10 newest, however old.
  - Imported files are kept a day, for the player who opened them.
  - The clean-up runs every 10 minutes (`cleanupReplays`, `config/ReplayConfig.ts`).
- **Watching:**
  - **Attack Logs** rows with a replay (both tabs: the row's 13th field is the key) have a **Replay** button with four choices: Watch the replay, Share in Global chat, Share in Alliance chat, Download (to watch later).
  - **Open a replay file** opens a downloaded file. It goes up to `replays/import`, then plays.
  - Watch (`IoReplays.Watch`) gets the recording (`replays/get`), then loads the yard in view mode with `["replay", key]`. `baseLoad` answers with the snapshot (buildings, health, warts, no monsters or champion) and `io_replay_view`.
  - `IoReplayPlayer` plays it over that yard:
    - Monsters are puppets of their own classes (`MonsterBase.ioPuppet`): their own art, facing, walk and health bar, never ticked. Cage champions are drawn from their sprite (`IoReplaySprite`).
    - Buildings take the recorded health; at 0 they are wrecked.
    - The bar shows Pause/Play, ¼x ½x 1x 2x 4x, the time and damage, Restart, Share, Save (download) and Close (home). The visitor panel (Open Map / Attack) is hidden.
    - Projectiles and effects aren't recorded: it is the monsters, buildings and damage.
- **Chat:** a shared replay is `[replay:key]`, drawn as an "▶ Attack replay" pill (`IoMapShare.RenderChat`, with places). Anyone who clicks it can watch.
- **Download:** `GET replays/file?key=...` needs no session (it opens in the browser); having the key is what lets you watch anyway.
- **Browser runtime:** `flash.net.FileReference` (`browse`, `load`, `save`) and `FileFilter` are now implemented (`client-web/src/flash/net`), for opening the file.
- **Texts:** `al_replay*` and a new `al_hint`, in all four languages.
- Test: `tools/test/replays-test.mjs` (EMAIL3 attacks TARGET, a player's yard in range; it makes a real attack).

## The Underworld (4 October)

- **What it is:** a 10 x 10 layer of the map below the Inferno, mostly for fast travel across the map. One per world, shared by its players.
  - Its cells are stored in the **same world** as the overworld's, at x and y **500-509** (`config/UnderworldConfig.ts`: `origin`, `size`). So takeovers, outposts, attacks, baseids (`…500500`), the Outposts list, empire value and the leaderboards work there as anywhere, with no new tables and no migration.
  - All its cells are flat land (height 130); it doesn't wrap. Its own look is for later.
- **Portals** (`services/maproom/v2/underworld.ts`, `portalsFor`), fixed for each world:
  - They're at the centres of the world's 10 biggest lava pools. Ties for 10th place all count, up to 12 (the test world has 11). Pools are hex-connected lava cells over the wrapped 400 x 400 map. The centre is the pool's lava cell nearest its middle.
  - A portal at X, Y comes out at X / 40, Y / 40 below (rounded down), or at the nearest free cell if another portal is already there.
  - Both ends are lava cells, so nobody can attack or take a portal. The server refuses an attack on one (as out of range).
  - getarea marks both ends `io_portal: [number, x, y, under x, under y]` and sends `io_under` (origin, size, ranges, the cost multiplier, every portal) with every reply.
- **Strongholds:** every underworld cell is Moloch's until a player takes it (`tribeForCell` → `underworldStronghold` in `molochStrongholds.ts`).
  - Levels 38 / 42 / 46 / 50 are descent bases 6-7 / 8-9 / 10-11 / 12-13. A cell's fixed number picks one of its level's two bases.
  - Levels are given out a quarter each: the cells nearest a portal are the easiest (`underLevel`).
  - Loot by level is in `underworldConfig.loot`. Silo and hall caps: `lootCaps` for 38 and 42, Moloch's own for 46 and 50.
  - A stronghold resets 12 hours after its last attack, like every tribe yard. Nothing else resets.
  - A taken cell goes back to Moloch only when its owner loses all their outposts (leaving the world, as anywhere). Otherwise another player can take it, like any outpost.
- **Range** (server `validateRangeV2` → `underworldReaches`; game `IoUnderworld.withReach`):
  - **In:** one of your overworld yards with a portal in its Flinger range (Declare War included) reaches the underworld cells next to (within 1 of) that portal's lower end.
  - **In the underworld:** an outpost there has **no Flinger** and always reaches the cells next to it (range 1, never more with Declare War). It flings as many monsters as your main yard's Flinger can.
    - The Flinger can't be built there (`BASE.CanBuild`). An outpost kit's Flinger is left out when the kit is applied there (`applyKit`).
  - **Out:** an underworld outpost of yours next to a portal reaches the overworld cells within **5** of the portal's upper end.
  - No cost, no cooldown.
  - The square check could never cover an underworld cell: wrapped by 400, 505 would have been 105, so any yard near 105 could have attacked it. The underworld is checked first and on its own.
  - `worldmapv2/ioreach` (POST or GET) tells the game which of your yards open which portal (`entry`: yards that may have it in range, with distances; the game checks the exact range) and which hold one from below (`exit`). It sends those yards as getarea would (their monsters), because they are always on the other layer, never on screen.
    - The attack popup adds them to the yards in range, at distances its checks and the attack's save count right. It waits for them a moment, as it does for your yards off screen.
- **The map** (`com/monsters/maproom_advanced/IoUnderworld.as`):
  - The map shows one layer at a time, and follows where it goes (`MapRoomPopup.GenerateCells` → `IoUnderworld.modeFor`). These take you to the underworld: a portal's **Enter the Underworld**, an outpost there from the Outposts list, or a link in chat. Home, a portal's **Go up**, a bookmark or Jump take you back up.
  - While it shows the underworld:
    - The map is 1000 wide and nothing wraps.
    - Only the underworld's zone is asked for. Around the island is deep lava (never asked for).
    - The minimap is hidden, the world map (zoom levels below Far) is off, and a banner says where you are.
  - Range is drawn as on the overworld: around your underworld outposts, next to portals you have open from above (below), and within 5 of portals you hold from below (up here).
  - Portal art (made here): `assets/worldmap/icons/io_portal_down.png` (overworld, violet swirl, arrow down) and `io_portal_up.png` (underworld, golden, arrow up). Clicking a portal opens its bubble (`MapRoomPopup.ioShowPortal`).
    - **Enter** works if one of your yards has that portal in range, or you already have an outpost below.
    - **Go up** always works.
  - Underworld places are called "Underworld 1-10, 1-10" (`IoMapUi.coord`). The Outposts list shows U1-U10.
- **Takeovers there cost twice as much**, both resources and Shiny (`PopupTakeover`; `underworldConfig.takeoverCostMultiplier`). Kits cost the same as anywhere. The takeover price is still the one the game sends, as everywhere.
- **Not allowed there:**
  - Moving a main yard there (`base/migrate` refuses; Relocate isn't offered on those outposts).
  - Inviting anyone to move to an outpost there (`relocateInvites` refuses; no Invite button).
  - New players' spawn rules ignore underworld outposts (`findFreeCell`).
- Also: a base id that isn't one (no coordinates) is now a 400 in `tribeSaveV2`, not a crash in the territory maths.
- Test: `tools/test/underworld-test.mjs` (26 checks; EMAIL3 needs a portal in its main yard's range; `bymio-underworld-ready.dump` in the sandbox moves show@example.com next to one). It takes an underworld cell over.

## Hell Freezes Over fixes, pets, replays' catapults and glows (4 October)

**Hell Freezes Over** (the user's list)
- **Day 3's "Towers thawed" counter is in its bar.** The text was an auto-sized field that kept its left edge, so it ran out of the bar. It is now centred by its own width (`IoHfoUi.Hud`).
- **The event window's "Heat restored: 13 / 13" isn't cut off.** It is on two lines under the thermometer, split after the first colon in every language.
- **The event's button goes once Rimegrave is unlocked in the Strongbox** (`IoHfo.buttonShown`: his locker entry at `t: 2`).
- **The Slushgut leaves no ice behind.** Its slush trail is gone (`IoIceCreep`).
- **The Compound's monsters freeze during a wave.** The monsters pacing in it stand still, with no walking and no animation (`MonsterBase.tick` returns at once for pen and housing monsters while `IoHfoWaves.compoundFrozen`). The Compound's ice block is drawn over all of them (`IoHfoArt.towerIceOn(…, depthBelow)`: down to 135 below the building's top, where the pen ends). They move again when the wave ends.
- **Rimegrave and the Sleetwing throw ice orbs.** Their strikes are thrown as an ice orb that flies to the target, like the Hailspitter's hailstone (`IoIce.orb`, `FIREBALL.TYPE_ICEORB`, new art `assets/hfo/extras/iceorb.png`: 4 frames of 22 x 22). The orb is only the strike's picture (`FIREBALL.ioNoDamage`): the hit is dealt as before, and its ice power lands with the orb.
  - The Hailspitter keeps its hailstone (its own ranged attack). No other ice monster attacks from range.
- **Four monsters stand still while they strike:** the Shivling, Slushgut, Rimeclaw and Permafrost Hulk show their standing frame instead of walking on the spot (`IoIceCreep.NO_WALK_STRIKE`). The Sleetwing still flaps and Rimegrave plays his attack rows.
- Test: `tools/test/hfo-fixes-test.mjs` (11 checks). `hfo-test` (36), `hfo-flow-test` (53) and `hfo-lists-test` (18) pass.

**Pets**
- **Up to 5 out** in the yard at once (`petsConfig.maxOut`), and **at most 5 of one monster** (`maxPerKind`). The card's Buy says "You have 5" and is off then.
- **Hell Freezes Over's monsters (IC26-IC31) are pets only once the player has won the event** (`petsConfig.eventMonsters`, `petMonstersFor`: `hfoChampionFree`). Before that they aren't in the Pets tab and the server refuses them.
  - The tab's list, the price and the limits now come with the yard's load (`io_petinfo`) as well as with every answer.
- **Names (optional):** each card has a **Name** button, which opens a box for each of that monster's pets; Save sends only the names that changed (`pets/name`). An empty name takes the name away.
  - A name has at most 16 letters (`nameLength`): letters in any language, digits, spaces and `. ' ! ? & -`. The server refuses anything else.
  - The name is shown small over the pet in the yard (a RasterData label), for visitors and attackers too.
  - Migration `20261013_AddPetNames`: `bym.pet.name`.
- A pet resting where something now stands (a wart that grew there in a Wart Bloom, say) walks off at once.
- `pets-test.mjs` was rewritten for all of this (20 checks).

**Replays**
- **The catapult's shots are recorded and thrown in the replay**, as pictures only: what they did is already in the recorded health.
  - `ResourceBombs.BombDrop` tells `IoReplayRecorder.shot`. A sample's new extras (`[t, monsters, buildings, damage or null, {e, g}]`) carry the shots: bombs (the Sulfur Bomb, its particles and the stain it leaves), Candy Jars (the jars drop on the towers in range and burst after their seconds) and Marilyn (she drops in, her wave plays for her fuse, then she explodes).
  - `IoReplayPlayer` throws them at their time. Restart clears them (`ResourceBomb.ioRemove`), and a replay bomb never hurts anything (`ResourceBomb.ioPicture`).
- **Monsters' glows show on their puppets.** Every GlowFilter on a monster (Enrage, War Cry, the Sulfur Shield, looting, champions' glows…) is recorded when it changes (`[uid, [[colour, alpha %, blur, strength], …] or 0]`). It is put on the puppet (`MonsterBase.ioPuppetGlow`) or drawn on a cage champion's frames (`IoReplaySprite.glow`).
- Older recordings play as before.
- `replays-test.mjs` checks both (19).

**Regression (all on the test server):** map-ui 41 (its one failure, "unticking Hostile", happened before these changes too), offscreen-attack 4, oct3-features 46, oct3-night 14, outposts 14, languages 14, bugs-oct3b 17, ui-fixes 22, planner 8, casino 23, chat 39, pets 20, underworld 26, replays 19, the HFO tests above.

AS3 files changed: `BASE.as`, `FIREBALL.as`, `SPRITES.as`, `com/monsters/effects/ResourceBomb.as`, `ResourceBombs.as`, `com/monsters/events/hfo/IoHfo.as`, `IoHfoArt.as`, `IoHfoUi.as`, `IoHfoWaves.as`, `com/monsters/monsters/MonsterBase.as`, `com/monsters/monsters/creeps/inferno/hfo/IoIce.as`, `IoIceCreep.as`, `IoRimegrave.as`, `com/monsters/pets/IoPet.as`, `IoPets.as`, `IoPetsPanel.as`, `com/monsters/replays/IoReplayPlayer.as`, `IoReplayRecorder.as`, `IoReplaySprite.as`.

## "What's different?" document: 3 and 4 October added (4 October)

The players' document (`server/public/docs/Inferno-Maproom-2-changes.pdf`, also made as .docx and .doc) now covers
everything up to 4 October. It has 19 categories and 50 pages (it had 16 and 42).
- **New categories:**
  - 4. The Underworld: portals, Moloch's strongholds, range down / in / back up, the rules.
  - 7. Pets: the tab, 5 out and 5 of a kind, names.
  - 11. Attack Logs and replays: the two tabs, reports, replays to watch, share and download.
- **Added to the others:**
  - the Wart Bloom (Events, and a line in Welcome);
  - the Outposts list's Previous / Home / Next and the outpost worker icon (The world map);
  - tribe yards healing after 12 hours, and Moloch in the Underworld (Tribes);
  - Upgrade All (Resources), traps that stay with Re-arm All, instant decorations, the 130 x 130 Under Hall, the Incubator's hold and the Control Station's arrows (Buildings);
  - every Inferno monster to level 6 (Monsters);
  - Magma Drop's 20 Spurtz (The Brimstone Pit);
  - the Yard Planner's Export / Import (Interface).
- **Pictures:** ten new ones, from a player account: the Underworld, a portal, the Pets tab, naming pets, pets in a yard, the Attack Logs with a replay's menu, a report, a replay, the Outposts list and an exported layout.
- **Hell Freezes Over stays classified**, and its fixes aren't mentioned. Pets only say "a few more are unlocked by an event".
- Source: the sandbox's `cdoc/content.js` and `build.js` (run `pass.sh` twice for the index's page numbers).

## Missing assets check (4 October)

Every picture and sound the game names was checked against `server/public/assets`, including those added since
September (the Underworld, pets, replays, Hell Freezes Over, the new monsters and towers):
- **Static scan:** every literal path in the AS3, and every path the Io classes build (`hfo/ui/...`, `thermo_00`-`13`,
  `worldmap/icons/io_portal_*`, `monsters/<id>-small.png` / `-medium.jpg`, `alliances/<id>_large|_medium.png`).
  Every sound in `SOUNDS.as` is there.
- **Live run:** 33 browser tests with every `/assets/` reply of 400 or more logged (underworld, pets, replays, the four
  HFO tests, catapult, sulfur jars, new monsters and towers, warts, gauntlet, sound, menu art, missing assets, wild attack,
  map UI, outposts, popups, the quest book, locker and Academy, Ashkarr, champion lock, building art, yard grounds, planner…).

**Added:**
- `popups/IC25-150.png`: Rimegrave's unlock and Academy picture (asked for by the Strongbox and the Incubator once the
  event is won; it was the only 404 in the live run). Made from `monsters/IC25-150.jpg`, like Ashkarr's.
- `popups/IC26-150.png` … `IC31-150.png`: the same for the six ice monsters (not asked for today, as they can't be
  unlocked, but every other Inferno monster has one).
- `effects/heart_icon.v2.png` (12 x 12): the heart over a defender drawn to the Decoy (`SPRITES.heart`, `DecoyEffect`).
  The siege Decoy is blocked in the Inferno, so this is only for completeness.

**Missing but never shown in the Inferno (left out):** `effects/venomBal_icon.png` (the overworld Project X's acid),
`buildingbuttons/135locked.png` (Dave's trophy, hidden from the Inferno's build menu), `bufficons/*`, the overworld
quest dock's `quests/*` pictures (the Inferno's are in `popups/`), event store / special event / wild monster
invasion popups, Map Room 1 pushpins, the Brukkarg's pictures, the vacuum siege art and Map Room 3's test tile.

## FPS pass and frame interpolation (4 October)

The user asked for the frame rate to be tested everywhere demanding, the weak spots fixed, and frame interpolation
added. Interpolation can be turned off in the settings, and the player chooses how many frames are made up
between each real one. The game still runs at 40 fps.

**How it was measured:** `tools/test/fps-survey.mjs`.
- It is one browser run through every place listed. For each it records:
  - frames a second;
  - game code and drawing time per frame;
  - the slowest frame;
  - frames over budget;
  - how much of the screen and the yard was drawn;
  - optionally, canvas calls and a CPU profile (self time, inclusive game functions, canvas calls by caller).
- The places:
  - the yard filled to its limits: 353 buildings; idle, pointer, dragging, 40 warts;
  - the Yard Planner: idle, dragging, moving 80 walls;
  - the ICS, the quest book, global and alliance chat (150 lines), the alliance window;
  - the Brimstone Pit: lobby, Magma Drop, slots, derby, ascent, bone pile;
  - Hell Freezes Over wave 13;
  - a replay at 1x and 4x;
  - the Map Room: idle, dragging, clicking;
  - attacks with 160 and with 500 monsters plus catapult shots;
  - a filled outpost: 271 buildings.
- The CPU profiler itself slows frames, so the numbers come from `PROFILE=0` runs and the profiles from separate
  runs.
- These are sandbox figures (2 cores, headless). Compare them with each other, not with a real PC. Runs vary
  by about ±15%. The pointer and drag cases are also slowed by the test sending pointer events
  faster than a real browser does.

| Case | Before | After |
|---|---|---|
| maxed yard, idle | 38 fps, 20 ms, worst 36 ms | 41 fps, 15 ms, worst 24 ms |
| maxed yard, pointer moving | 33 fps, 21 ms | 40 fps, 16 ms |
| maxed yard, dragging the view | 39 fps, 19 ms, worst 42 ms | 40 fps, 15 ms, worst 26 ms |
| maxed yard with 40 warts | 37 fps, 21 ms | 40 fps, 13 ms |
| Yard Planner, dragging the view | 21 fps, 20 ms | 40 fps, 14 ms |
| Yard Planner, moving 80 walls | 20 fps, 25 ms | 32 fps, 20 ms |
| Incubation Control Station | 28 fps, 22 ms, worst 74 ms | 40 fps, 14 ms, worst 34 ms |
| Quest book | 26 fps, 23 ms | 37 fps, 14 ms |
| Global chat (150 lines, scrolling) | 24 fps, 26 ms | 38 fps, 14 ms |
| Alliance chat | 22 fps, 29 ms | 39 fps, 14 ms |
| Alliance window | 17 fps, 34 ms | 31 fps, 16 ms |
| Brimstone Pit lobby | 25 fps, 24 ms | 35 fps, 16 ms (each game 39-40 fps) |
| Hell Freezes Over wave 13 | 34 fps, 24 ms | 40 fps, 11 ms |
| Attack replay (1x / 4x) | 40 fps, 8 ms | 40 fps, 3-5 ms |
| Map Room, dragging | 28 fps, 23 ms, worst 217 ms | 38 fps, 16 ms, worst 92 ms |
| Attacking, 160 monsters | 24 fps, 35 ms, worst 276 ms | 28-37 fps, 22-30 ms, worst 89 ms |
| Attacking, 500 monsters + catapult | 7 fps, 137 ms, worst 328 ms | 13-15 fps, 60-71 ms, worst 176 ms |
| maxed outpost (idle / dragging) | not measured | 40 fps, 8 / 14 ms |

**What was slow, and the fixes:**
1. **Pathfinding in battles** (`PATHING.as`, `PATHINGfloodobject.as`):
   - Every pending flood got at least 15 ms of every simulation step, and there are two steps a frame. Ten new
     targets meant 300 ms a frame: the big battle stutters (worst frames of 250-330 ms).
   - Each flood step also made an object for every cell it reached and listed every key of its edge again.
   - Now the floods are flat lists (`depth` per cell, the edge as cell indexes; costs in `_costGrid`, a copy of
     `_costs[].cost` kept by `Cost()` and `Tick()`).
   - They share 5 ms a step, at least 1 ms each, taking turns.
   - Same algorithm and same paths.
   - A flood that runs out of cells answers anyone still waiting with a straight path. It used to spin forever.
2. **The yard's own renderer** (`Renderer.as`, `RasterData.as`):
   - Hundreds of dirty rectangles were merged pairwise, starting again after every merge. Past 24, everything
     became one box. Now they become 32-px tiles (`tileDirty`).
   - When changes cover more than 35% of the view (server flag `io_viewall`), the view is drawn once. Only the
     parts of rectangles outside it are kept.
   - Entries inside a rectangle are drawn without a clip.
   - Clips (shadows, flags) were counted as changed every frame. The browser build now compares a content
     signature (`$contentSig`).
   - Filtered entries (glowing monsters) each get their own Bitmap, so their filtered picture is kept while
     unchanged.
3. **Monsters drawn twice a frame** (`MonsterBase.render`): the game takes two steps a frame and only the
   last is drawn. The health bar, the ice monsters' frames and the raster update are now left for that step.
   Position and rotation still update every step.
4. **Yard Planner** (`PlannerDesignView.as`):
   - Dragging the view measured every building in the plan on every pointer move. It now measures once per drag,
     and the plan is cached as a bitmap while dragged.
   - Moving a group used a pixel hit test for each nearby pair. The plan's pictures are solid squares, so the box
     test gives the same answer, and that is now used.
5. **The browser runtime** (`client-web/src/flash`):
   - Screen damage: many boxes become 32-px tile runs. They used to be one box per 4 x 4 screen cell, which
     covered most of the screen in a busy yard: every other frame was drawn whole.
   - Big upright bitmaps (the 4000 x 2000 yard) are drawn only where they can show.
   - Filter and effect layers reuse their canvases. A new canvas and context per filtered draw was most of the
     cost of glowing monsters.
   - Text fields not being typed in are drawn from their own cached canvas, placed on whole pixels like Flash's
     text, and their redraw box is padded by 2 px. Every glyph used to be laid out and filled again whenever
     anything behind it was redrawn.
   - Tools: `__player.debug.damageLog = []` lists what was drawn again and why. `__player.textCache.off = true`
     turns the text cache off.

**Not changed:** most of what is left in a 500-monster battle is drawing on a CPU canvas: each monster's frame,
shadow and the copies into the yard. Going further needs a GPU renderer (a large change, the earlier Canvas GPU
trial was slower).

**Frame interpolation:**
- **Where to set it:** the page's settings (gear), Display, **Frame interpolation**. Choices are Off (default),
  or 1, 2, 3 or 4 frames between real ones (80/120/160/200 fps shown). It is saved with the page's settings.
  `?interp=N` sets it for tests.
- **What it does:**
  - The game still runs at 40 fps.
  - Between two of its frames the player shows N made-up ones, evenly spaced. Everything the game moved, scaled,
    turned or faded in its last frame is drawn part of the way from where it was to where it is now.
  - What the game draws into the yard (monsters, shots, shadows: `Renderer.ioInterpolate`) is moved the same
    way.
  - The real frame is drawn 1/(N+1) of the way, the made-up ones further, the last exactly where the game put
    it. So what you see is up to one game frame (25 ms) behind.
  - Objects new on screen appear where they are. Jumps (over 400 px, or 200 in the yard) are not slid across.
  - Timeline animations and sprite frames still change 40 times a second. Only movement is smoothed.
  - The game never sees an in-between value: positions are put back right after each drawing.
- **When frames don't fit:**
  - Made-up frames that would not be done before the game's next frame are left out.
  - If under a tenth of them fit (a slow device, a big battle), interpolation pauses for 3 s.
  - The game's own frames always come first.
- **Frame rate readout:** with "Show frame rate" on, it reads "40 fps · 120 shown".
- **How it works:**
  - `interp` in `display/core.ts`: the transform setters note an object's values before its first change in a
    game frame; `apply`/`restore`.
  - The loop in `Player.ts`.
  - `Renderer.ioRecord`/`ioLerp`/`ioUnlerp` in the AS3. The renderer finds the player's interpolation object
    on the stage (`$ioInterp`), which never exists in Flash.
- **Test:** `tools/test/interp-test.mjs` (11 checks).

**Regression:** all passing as before.
- Tests with known failures that already failed before:
  - map-ui: "Hostile".
  - menu-art: 2 checks: the test account's Magma is over its cap, and the chat's newest line.
  - remade-assets: the quest list's icons check.
- background-test needs a display (xvfb) the sandbox run did not give it.
- Tests that time out loading a second page now and then:
  - chat-test and oct3-night-test each did once on a busy sandbox and pass when run again.
  - oct3-night's "bloom start in chat" depends on the real time.

**AS3 files changed:**
- `com/monsters/rendering/Renderer.as`, `com/monsters/rendering/RasterData.as`
- `com/monsters/pathing/PATHING.as`, `com/monsters/pathing/PATHINGfloodobject.as`
- `com/monsters/monsters/MonsterBase.as`
- `com/monsters/baseplanner/PlannerDesignView.as`

**Browser files changed:**
- `client-web/src/flash/display/core.ts`, `client-web/src/flash/filters/index.ts`, `client-web/src/flash/text/index.ts`
- `client-web/src/player/Player.ts`, `client-web/src/player/Shell.ts`
- the regenerated `client-web/src/game`

**Tests:** `tools/test/fps-survey.mjs`, `tools/test/interp-test.mjs`.

No server change and no migration.

## The Depths of Hell (4 October, afternoon)

The user asked for three things, then (mid-way) for a new look. The code still says "underworld"
(IoUnderworld, underworld.ts, UnderworldConfig); the game says "Depths of Hell".

**Renamed:**
- `IoUnderworld.NAME` = "Depths of Hell". It is used in:
  - the portal bubble: "Portal to the Depths of Hell", "Enter the Depths of Hell";
  - the map banner: "THE DEPTHS OF HELL";
  - coordinates: "Depths of Hell 5, 6";
  - the takeover price note.
- The Outposts list shows D1-D10, not U1-U10.
- The no-Flinger message: "Outposts in the Depths of Hell have no Flinger".
- The server's messages (`errors.ts`, `relocateInvites.ts`).
- The players' doc: category 4 is "The Depths of Hell", with three new pictures.
- Not renamed: the stock language file's lore that says "underworld" (Moloch, the Inferno's monsters).

**Portals on the zoomed-out maps:**
- Light purple dots (`IoMapLod.PORTAL_COLOUR` 0xD7B8FF, a dark purple ring) on:
  - the world map (the three widest zooms), with a "Portal to the Depths of Hell" legend entry;
  - the minimap, drawn on top of yards.
- Hovering a dot on the world map names it ("Click to go down"). A click goes straight down to the portal's end.
- The portals come with the world snapshot's fixed layers (`static.portals` in `worldSnapshot.ts`), so the world
  map has them before any getarea. `IoUnderworld.setPortals` redraws the maps when they arrive.

**Any portal can be entered:**
- The bubble's "Enter the Depths of Hell" always works, to go down and look.
- If none of the player's yards reaches the portal, the bubble says "To attack down there, one of your yards
  needs this portal in its Flinger range". Range and the server's checks are unchanged: looking is not attacking.

**The new look (the user's):**
- Still 10 x 10, an island in lava.
- Every cell is drawn as a stone platform in a lava gap, with a small bridge to each neighbour on the island
  (`IoUnderworld.depthsGround`, used by `MapRoomCell.ApplyGroundVariant` while the map shows the Depths).
  Layers (`hellmap/DepthsTile_*`, `client/scripts/_assets/hellmap/depths_*.png`, 150 x 100 like every map tile):
  1. the lava (the void's lava art with its black crust softened to dark molten red and its dark outline
     grown over, so cells join without a seam; scorched black-red walls);
  2. a half-bridge of wooden planks towards each neighbour that is on the island (N, NE, SE, S, SW, NW);
  3. one of 4 red-and-black fire-and-brimstone platforms (cracked crust over molten rock, red-hot brimstone
     cobbles, a burning seal on black obsidian, black rock with fire vents), picked per cell as the overworld's
     variants are. Unlike any overworld tile.
  The composite is kept per variant and set of neighbours.
- Around the island the lava is at the island's own height (125) and drawn with the same lava picture
  (`depthsGround` returns the lava layer alone for a cell off the island; `drawsDepths` is every cell while
  the map shows the Depths). So the lava sea and the lava between the platforms are one level surface.
- Darker lava (4 October, evening, the user's): the lava picture dimmed to a deep, smouldering red-orange
  (`LAVA_DIM` in `depths-tiles.py`, 1 by default; 0 gives the bright version back). The hottest streaks keep some
  glow. Only `depths_lava.png` changed.
- Second look (4 October, evening, the user's): the art above (it was purple-grey stone with grey bridges) and
  the level lava sea (it was at height 99, lower than the island). AS3: `IoUnderworld.as` only (VOID,
  `depthsGround`, `drawsDepths`); the 11 PNGs; depths-test has a 10th check (the edge: one height and tile
  offset, the sea drawn with the lava picture).
- **Neutral cells:** `underworldConfig.height` is 125, the game's average altitude (`GLOBAL._averageAltitude`), so
  every cell is +0% resources and +0% defence. It was 130.
- **Portals in the Depths stand on a platform** like the other cells: the server sends them as empty land at
  the island's height (`{ i: 125, u: 1, io_portal }`), no longer lava. Their swirl is drawn at 3/4 size over the
  platform. Overworld portals stay on lava.
- The art is made by `sandbox-tools/depths-tiles.py` (numpy, Pillow).
- The browser build needs `npm run assets` to copy the new embedded pictures into `client-web/public/embed`.
  They are in this delivery.

**Tests:**
- New `tools/test/depths-test.mjs` (11 checks): the snapshot's portals; the purple dots on the minimap and the
  world map, by their pixels; the legend; hover; click-to-go-down; the names; an out-of-range portal entered
  to look, its cells out of range.
- `underworld-test.mjs` was updated for the names, the height (125) and the portals on land (26 checks).
- Also passing: map-ui (its old "Hostile" failure), outposts, offscreen-attack (with EMAIL3: the main test
  account has no Map Room).
- redraw-test showed a one-pixel row of difference near the top of the screen (176 px at y 38) in 3 of about 10
  runs. I couldn't find which object it is. It also appeared once during the fps work.

**AS3 files changed:**
- `com/monsters/maproom_advanced/IoUnderworld.as`, `IoMapLod.as`, `IoMapMinimap.as`, `IoMapSnapshot.as`,
  `MapRoomCell.as`, `MapRoomPopup.as`, `HellTileVariants.as`, `IoOutpostsPopup.as`, `PopupTakeover.as`
- `BASE.as`
- new `com/monsters/maproom_advanced/hellmap/DepthsTile_*.as` (11)

**Also changed:** `client/scripts/_assets/hellmap/depths_*.png`. The browser runtime: core.ts (the big-bitmap
margin now scales with zoom).

**Server:** `UnderworldConfig.ts` (height), `getArea.ts` (portal cells), `worldSnapshot.ts` (portals in the
layers), `errors.ts`, `relocateInvites.ts`. No migration. Restart the server: the snapshot's layers are kept per
process.

## Speed-ups, the Gauntlet's catapults, no truces, more walls, the Depths' lava, the Changelog (4 October, evening)

All the user's. Everything in the game is gated on `GLOBAL.INFERNO_ONLY`.

**Speed-ups for a building** (build, upgrade, fortify, repair):
- New `STORE.ioBuildingTimeCost(seconds)`.
  - 10 minutes or less left (`GLOBAL.ioCloseEnough`, the server's `closeEnoughMinutes`): free, the way the original
    game's last 5 minutes are. Close Enough (SP1) is FREE and finishes it with no purchase; Finish now (SP4) and the
    Reduce items (SP2/SP3) are "not needed" (those checks were still at 5 minutes).
  - Under an hour: 1 Shiny at 11 minutes left, one more every 6 minutes, 9 at 59 (it was 10 flat).
  - An hour or more: `GetTimeCost` as before (10 for the first hour, 7.5 per further hour).
- Used by the Store's Finish now price for the selected building, the worker-busy popup (`QUEUE.GetFinishCost`),
  and the time part of instant build / upgrade / fortify (`BFOUNDATION.Instant*Cost`,
  `BUILDINGOPTIONSPOPUP.ActionInstantBuild`, which also drop the time with 10 minutes or less, not 5).
- Other timers (hatching, healing, Academy, Strongbox, labs) keep `GetTimeCost`.
- `StreamlineBuy` takes the free path at exactly 10 minutes too (it was `<` while the price was `<=`).
- `streamspd_close_desc` says `#cm#` minutes in all four languages (it said 5).
- The server takes the price the game sends (as before); `InfernoOnlyConfig.prices` notes it.

**Moloch's Gauntlet: catapult shots cost resources.** `baseSave.ts` dropped a Gauntlet save's whole `attackloot`
(no loot there), but that field also carries what the catapults spent (negative). It now keeps the negative part of
r1-r4 (`gauntletSpending`). gauntlet-test has 2 more checks (59).

**No truces.**
- Server: `requesttruce` and its controller, the truce services (`handleTruceRequest`, `handleTruceResponse`,
  `isTruceActive`, `getTruces`), the `Truce` entity and `TruceStatus` are deleted (delete those 7 files); the truce
  message types are gone, so `sendmessage` refuses them; the attack check, getarea's `t`, the v1/v3 neighbour and cell
  data, `truceActiveErr` and `AttackPermission.TRUCE_ACTIVE` are out.
- Migration `20261014_RemoveTruces`: deletes truce mail (an empty thread with it; the others get their count and last
  message back), recounts those players' unread mail, drops `bym.truce` and the truce columns of thread and message.
- Game: `MapRoomCell._truce` is 0, the map icon never shows, `PopupInfoEnemy`'s Request Truce button is hidden, the
  info panel's Truce line is gone. The alliance texts no longer mention truces (four languages).

**Bone blocks on the main yard** (`INFERNOYARDPROPS` id 17): 0 / 10 / 50 / 90 / 160 / 260 / 300 by Under Hall level
(+10 / +20 / +30 / +40 / +60 / +80; it was 0 / 30 / 60 / 120 / 200 / 220), from Under Hall 1 (was 2). Outposts keep 200.

**The Depths' lava**: nine lava pictures, one per lava texture of the map (`DepthsTile_lava`, `_lava_2` .. `_lava_9`,
from water3_2, 3_3, 3_4, 2_2 ... 1_4), picked per cell by `IoUnderworld.lavaIndex` (unsigned before `%`: the browser
build's `^` is signed). The composite's key includes it. Bridges twice the size (`BW = 2` in `depths-tiles.py`).

**The Changelog**: a top bar button (a page, right of the attack logs; `UI_TOP.ioChangelogButton`) opens
`com/monsters/leaderboards/IoChangelog.as`: the days on the left, each day's changes on the right (area tag, title,
text), the count on top. Data: `GET/POST /changelog` (`controllers/changelog.ts`) serves
`server/public/docs/changelog.json`, read again when the file changes: publish a new version by replacing the file.
220 changes over 13 days (22 September - 4 October), backdated from these notes, HANDOFF, the deliveries and the
early migrations. Hell Freezes Over is only "[ CLASSIFIED ]" there. `IoAttackLogs` lends its frame, close button
and scroll view (`internal` now). Texts `cl_*` in four languages; the changes themselves are in English.

**Tests:** new `speedups-walls-test.mjs` (11: prices, Close Enough free and finishing with no purchase, 30 minutes
at 4, hatching unchanged, wall limits, no truces) and `changelog-test.mjs` (10); gauntlet-test 59;
depths-test 12 (all 9 lavas used at the island's edge).

**AS3 files changed:** `STORE.as`, `QUEUE.as`, `BFOUNDATION.as`, `BUILDINGOPTIONSPOPUP.as`, `INFERNOYARDPROPS.as`,
`UI_TOP.as`, `BASE.as`, `WMATTACK.as`; `com/monsters/maproom_advanced/` `MapRoomCell.as`, `MapRoomPopup.as`,
`PopupInfoEnemy.as`, `IoMapSnapshot.as` (a comment), `IoUnderworld.as`; `com/monsters/leaderboards/IoAttackLogs.as`;
new `com/monsters/leaderboards/IoChangelog.as` and `com/monsters/maproom_advanced/hellmap/DepthsTile_lava_2..9.as`.

**Regression** (the whole set, on a new sandbox with 2 CPUs): passing as before, apart from the known failures
(map-ui "Hostile"; menu-art's Magma cap and chat line; remade-assets' quest list icons; oct3-night's bloom start in
chat, by the real time; background/touch/mobile/pinch need a display) and the intermittent redraw differences.
planner-test's "60 walls at 1/4 CPU" came out at 7-8 fps (needs 10): this sandbox is about half as fast as the one of
the fps work (the Map Room, untouched today, also halves), and the yard measures the same with 220 or 300 walls.

**Deploy:** server, then migrations (`20261014_RemoveTruces`), then BYMR - Release.

## The top bar's shortcuts (4 October, late evening)

The user's: the leaderboard, attack log and changelog buttons spell out their names and look like the Shiny counter,
with an Alliances shortcut added; the order is Alliances, Attack Log, Leaderboard, Change Log.

- `UI_TOP.ioTopBars` (it replaces `ioLeaderboardsButton`, `ioAttackLogsButton` and `ioChangelogButton`) makes the
  four bars right of the Shiny counter. Each is the counter's own stone bar (`mcR5.mcBG`'s art drawn once, its ends
  kept and the middle stretched to fit), a picture on the left over the bar's end (a shield, the crossed swords, the
  trophy picture, the page), and the name over the bar in the counter's lettering (`mcR5.tR`'s font, size, colour and
  outline). The names are `tb_*` in four languages.
- Alliances opens `ALLIANCEWINDOW.Show`. The Leaderboard bar still shows only with the `io_leaderboards` flag.
- A screen too narrow for the names (they would reach the buttons on the right; an admin's Admin, Test and Designer
  buttons counted too) shows just the pictures, 40 px each.
- The bars keep their names (`ioAlliances`, `ioAttackLogs`, `ioLeaderboards`, `ioChangelog`); they are MovieClips
  (they keep their sizes as properties). `ioAfterShiny` is right of the last one showing.
- Tests: changelog-test has 2 more checks (12: the order, names, bars, pictures; Alliances opens its window);
  oct3-features' button check follows the new order.
- AS3: `UI_TOP.as` only.

**On phones** (later that evening, the user's): when the names don't fit, the shortcuts are badges (the picture on a
dark square with a molten rim, 38 px) with no names; the Shiny counter keeps its number.
- The page tells the game it is on a phone: client-web `Shell.ts`'s phone layout adds the FlashVar `iomobile=1`,
  read in `GAME.as` as `GLOBAL.ioOnPhone`. There the page's menu button sits at the top centre, over the game, so
  the names must stop short of the screen's centre.
- The room is worked out in the screen's terms (`GLOBAL._SCREEN`: on a phone or a wide window the stage reaches past
  its 760 both ways, so the stage's own width was the wrong measure).
- changelog-test checks it on an emulated iPhone 13 landscape (13 checks); mobile-test still passes.
- AS3: `UI_TOP.as`, `GLOBAL.as` (`ioOnPhone`), `GAME.as` (reads it). Web: `client-web/src/player/Shell.ts`.

**Gold pictures** (later still, the user's): the four pictures are remade to match the level star and the Shiny coins:
bright gold, an orange-brown outline, a bevel and a shine (a shield with a chevron and a star; two crossed swords with
red pommels; a trophy with a red star; a parchment page with a red seal). They are pictures now,
`server/public/assets/topbar/{alliances,attacklog,leaderboard,changelog}.png` (128 px, shown at 38), drawn by
`sandbox-tools/topbar-icons.py`; `UI_TOP.ioPictureIcon` loads them. The phone badges are the same pictures alone (the
dark square behind them is gone). AS3: `UI_TOP.as`.

**Steel shield and swords** (the user's: they don't need to be golden): Alliances is now a steel shield quartered green
and white (the Alliances window's emblem) with a steel cross; Attack Log is two steel swords with a fuller, dark iron
guards, leather grips and red pommels, both with a dark outline. The trophy and the page stay gold and parchment.
Only the two PNGs and `topbar-icons.py` changed.

## A fourth Magma Tower, the Alliances window's first tab, the trailer pack (5 October)

**Magma Towers** (the user's): the main yard builds 4 at Under Hall 6 (it was 3). `INFERNOYARDPROPS` id 132's
quantity is 0 / 0 / 0 / 1 / 2 / 2 / 4 by Under Hall level. Outposts keep theirs (`GLOBAL.IO_OUTPOST_QUANTITY[132]`, 4).
The players' document says so (Core: "A fourth Magma Tower"), and the Change Log has a 5 October day.

**The Alliances window's first tab** (the user's: it never loaded in). Opened a second time (or any time the player's
alliance was already in the store), the Overview stayed empty until another tab was clicked. `ALLIANCEPOPUP`'s
constructor opened its first tab before `ALLIANCEWINDOW.Show` had put the window on the stage; the tab asks
`ALLIANCES.LoadMyAlliance`, which answers at once from the store, and a tab draws nothing off the stage
(`if (stage == null) return`), so it never drew. In the Inferno the first tab now opens on `ADDED_TO_STAGE`
(`_ioFirstTab`, `_ioOnStage`); the first open, a player without an alliance (Browse) and the classic game are as
before. AS3: `ALLIANCEPOPUP.as`.

**Tests:** new `magma-alliance-test.mjs` (9: the quantities, an Under Hall 6 yard's count, the window opened 4 times
by the top bar for a member, twice for a player without an alliance); changelog-test expects 5 October first.

**AS3 files changed:** `INFERNOYARDPROPS.as`, `ALLIANCEPOPUP.as`.

**The trailer pack** (the user's, delivered on its own, not in the repo): a 60 s narrated trailer's material for an
AI video tool or agent. Built in the sandbox (`trailer/`): frame-exact gameplay capture (Playwright's clock stepped
1/30 s a frame, 1080p30) of the show account's yard laid out in the user's own base layout (its `BYML1:` export put
into the save), the map, the Depths, a 500-monster battle, the Gauntlet, the Brimstone Pit, a replay and the windows;
title cards, captions, logo and lava plate; a narration script with an offline scratch read (Kokoro-82M); the game's
music and sounds; `edit/shots.json` and `cut.py`, which render the reference cut. Hell Freezes Over is only a
"[ CLASSIFIED ]" tease there.

## Two workers in every outpost, and the bug reports of 5 October (5 October, later)

**Two workers in an outpost** (the user's). `GLOBAL.ioOutpostWorkers()` is 2 in the Inferno (1 in the stock game):
- `QUEUE.Spawn` gives an outpost that many (it gave 1), `UI_WORKERS.Setup` shows that many icons, and
  `QUEUE.GetBuilding` (the worker-busy popup's Speed Up) picks the one finishing first, as in the main yard.
- The outpost's save says when each worker is free again: `monsters.finishtimes` (0: idle now), next to the stock
  `finishtime` (the first worker's), from `BASE.getHousingSaveData`. The server passes it to the map as it is.
- **The Map Room** (`MapRoomCell.ioIdleWorkers`, `ioShowWorkers`): the idle worker marker by an outpost shows when
  one is idle, and a second, stacked behind it (9 px right, 6 up, under it), when both are. A save from before
  (only `finishtime`) counts as 2 workers, the first busy or not. The second marker is the marker of a fresh
  `MapRoomCell_CLIP` (it has no class of its own), made the first time it is needed.
- The players' document and the Change Log say so; the server comments too (`InfernoOnlyConfig.workers`,
  `getDefaultBaseData`).

**Bug reports** (the admin panel's Bugs tab):
- **#68, Error #2007 in `MapRoomPopup.ShowInfo`** (20 times, 6 players): pointing at the open cells round the
  Depths of Hell (outside its 10 x 10, no owner's name) set a null text. The owner, alliance and location texts
  are `""` when missing. Reproduced by showing the panel for every cell in view (world and Depths).
- **#66, "This base is currently under damage protection" as an Oops window**: attacking a yard again straight
  after the attack that protected it (the map's copy was older) stopped the game. The server's refusals of an
  attack carry `data.io_refused` (`protected`, `underattack`, `online` in `errors.ts`, `range` in `validateRange`),
  sent as `errorDetails.data`; the game (`BASE.handleBaseLoadSuccessful`, `ioRefusal`, `ioSayAtHome`) shows the
  message once the player's own yard has loaded, and loads it. Any other refused attack load is taken the same way.
- **#65, `STORE.BuyB` on a null building**: a speed-up bought after its building was finished or deselected
  (the store was opened from the worker-busy popup). Nothing is bought, any Shiny taken comes back, the store
  closes and says so (`io_speedup_nobuilding`, four languages).
- **#63, #64, #67, HTTP 524 / 502 on casino and save requests**: one player's fast Magma Drop (up to 20 balls in
  the air, 8 bets a second in the report) ran up to 20 bet transactions at once; each locked the player's seed
  row, so 19 waited inside the database holding pool connections (the pool was 10): the whole server waited
  behind them, past the proxy's 100 seconds. Now `middleware/casinoQueue.ts` (`casinoOneAtATime`, on every
  `/casino/*` route) runs one player's casino requests one at a time, the rest waiting in memory; past 40 waiting
  the player is told to slow down. The database pool is 20 (`DB_POOL_MAX` changes it). The 502s are the proxy
  not reaching the server at all; nothing in these reports says why (a restart at the time would explain them).

**Tests:** new `outpost-workers-test.mjs` (14: the two workers and their save, the map's markers 2 / 1 / 0 and an
older save, the info panel on every cell of the world and the Depths, the speed-up, a refused attack through the
game, 30 and 60 Magma Drop bets at once with another player's request answered meanwhile); oct3-features expects
2 workers in an outpost; changelog-test is unchanged (5 October first).

**AS3 files changed:** `GLOBAL.as`, `QUEUE.as`, `UI_WORKERS.as`, `BASE.as`, `STORE.as`;
`com/monsters/maproom_advanced/MapRoomCell.as`, `MapRoomPopup.as`.

## The Brimstone Pit: Korath's Fortune, live bets, the Favor, faster slots (5 October, night)

All the user's. Every game still returns under 100% (`bun scripts/casino-rtp.ts`, all ok).

**Korath's Fortune** (Pit level 6; first called Moloch's Fortune; `games/slots.ts` `playFortune`, `casino/fortune/spin`, client `games/SlotsGame.as`
in mode `"fortune"`):
- The Magma Slots' strips and pays through a 3 x 3 window: the middle row is the stop drawn, the top `stop + 1`,
  the bottom `stop - 1` (as the Slots' reels already showed them). Five lines (`FORTUNE_LINES`, also sent in
  `casino/state` `rules.fortune.lines`): the three rows and the two diagonals, each bet a fifth of the stake.
- Each line on its own is three stops each as likely as any, so it returns what the Slots' line does (97.97%);
  so do the five together. A line pays on 85% of spins (mostly two Spurtz: a fifth back), and 25.9% of spins pay
  more than their stake (Slots: 5.4%).
- **The shared jackpot:** the whole stake feeds the same pool at 5%; three King Wormzer on a line win
  `pool x (stake / 5) / jackpotFullBet` (`settleJackpot`'s new `lineStake`), so a Shiny on either machine is worth
  the same part of the pool: 99.99% at its most, as the Slots. Each reel has one Wormzer, so only one line can.
- The client draws the five lines (numbered at their ends, coloured) and lights the ones that pay; the message
  says what came back when it is less than the bet ("2 lines: 2 of your 5 Shiny back") rather than calling it a
  win.
- **Korath is its face** (the user's): Korath (`G4_L6` art at twice its size, `casino/fortune/korath.png`) looms
  over the cabinet, which is the Slots' with the horns and dome taken off and the brown made Korath's charcoal
  (`casino/fortune/cabinet.png`), drawn at 0.9 and 40 px lower to leave him room. The reels show the champions,
  each standing for a Slots symbol so the server's draw and pays are untouched (`SlotsGame.FORTUNE_NAMES`,
  `casino/fortune/<symbol>.png`): Korath (King Wormzer: three are the jackpot), Krallen (Balthazar, 250x), Fomor
  (Grokus, 100x), Drull (Valgos, 50x), Gorgo (Zagnoid, 25x), Young Korath (Malphus, 13x), Baby Korath (Spurtz, 8x;
  two pay 1x). The art is the champions' own portraits (`monsters/G*_L*-250.png`), cropped. `tile_fortune.png`
  is the machine with champions on its reels and Korath beside it.
- **Pit level 6**: `INFERNOYARDPROPS` id 141 has a sixth cost (5M / 5M / 2.5M / 1M, 4 days, Under Hall 6), hp
  256,000, repair 61,440 (level 1's art, as 2-5). `access.pitState` reads up to level 6.

**Both slots** (`SlotsGame.as`):
- **Close calls**: when the first two reels show a pair on a line (any line on Fortune), the pair is framed and
  pulses (`_teaseFx`), the last reel's cell is framed too, and the last reel spins 46 frames longer (80 for two
  King Wormzer) and creeps in over more stops. Presentation only: the answer is in before the reels stop, the
  strips are not changed, and nothing is shown that did not land.
- **Stop**: SPIN reads STOP while the reels turn; it, the lever or a click on the reels sets them on the result
  at once (or as soon as it comes).
- **AUTO**: 10 / 25 / 50 / 100 (the toggles under it, `casinoAuto:N`); stops on AUTO, a manual SPIN, a jackpot, a
  win of 10x or more, an error, or too little Shiny for the next spin.
- **Moloch's Favor** (`casino/favor/spin`, config `favor`): one free Slots spin a UTC day wherever the Slots are
  open (Pit level 3; a rule of level 5 only was asked for and dropped), always a 10 Shiny spin (`favor.bet`; the
  user's: never more, whatever the Pit's level), played and paid like a spin (the jackpot share too) with nothing taken and nothing put into the pool.
  `playInstant` takes `free` (writes the bet with stake 0, its bet in `outcome.free_bet`); the day is claimed in
  the spin's transaction (`casino_player.favor_day`), so it cannot be had twice; a request sent again is answered
  from the ledger. The lobby's FREE SPIN (`casinoFavor`) opens the Slots and spins it; once used it counts down to
  midnight UTC and asks again then. The Slots have their own FREE SPIN button while it is there.

**Big wins** (`CasinoWindow.bigWin(payout, bet)`): a win of `BIG_WIN` (10) x the bet or more: BIG WIN, MEGA WIN
(50x), EPIC WIN (200x) over the window, the Shiny counting up, gems, rays. Clicks go through it (it never stands
in the way); the first one anywhere in the window shows the whole amount and fades it out. Called by every game as its result shows (Magma Drop, Scratchers, Roulette, both slots, Bone Pile,
Ascent by hand, the Derby once a race); the Slots' jackpot keeps its own banner.
**Every BIG, MEGA and EPIC WIN is announced in Global chat** (the user's; `noteCasinoWin`, config `announce.bigWin`,
`megaWin`, `epicWin` = 10 / 50 / 200, the game's own thresholds): "MEGA WIN! name won 1,250 Shiny on Korath's
Fortune (x125)!". The old rule (2,500 over the stake, or 25x and 500 Shiny) still announces the rest. The minute
between one player's announcements is gone; a BIG WIN (or one of the old rule) waits only `announce.gapSeconds`
(10) after that player's last one, so 20 Magma Drops in the air cannot fill the chat; jackpots, MEGA and EPIC
WINs always go. Admins are never announced.
Then (the user's): **only a win paying more than 500 Shiny** (`announce.minPayout`) is announced, BIG, MEGA, EPIC
or the old rule's alike (that rule is now 2,500 over the stake or 25x); jackpots always are.

**The Live tab** (`LiveTab.as`; tabs now Games, Live, History, Fairness; `casino/live`, `wallet.liveBets`): the
last 30 bets of everyone (name, game, bet or FREE, x, paid or "in play"), new ones glowing; the day's 10 biggest
wins (most over the stake, last 24 hours); the last 5 jackpots. Asked every 2 seconds while the tab is open.
**The admins' bets are never on it** (`infernoOnlyConfig.admins`, by name, as `isAdmin`).

**Magma Derby** (`derbyRounds.derbyState`): `bettors` (a line per player and runner, biggest first, up to
`derby.listed` 30, admins left out) and `totals` (Shiny on each runner, everyone's). While bets are open the
track shows the bettors in a panel (`casinoDerbyBettors`) and each runner's board row "1,250 bet".

**Balthazar's Ascent**: the sky scrolled up to 1,920 px but was 1,920 px wide, so past 1,440 the scene's right had
nothing behind it; a third tile at 1,920 fills it to the wrap. The tower is the yard's Sharpshooter Tower
(`buildings/isnipertower` top and its 30-heading turret, `aimAt`), turning to follow Balthazar; it fires a tracer
with the Sharpshooter's sound (`isniper`). `casino/ascent/tower.png` is no longer used.

**Server:** migration `20261015_CasinoFun` (casino_bet's game check takes `fortune` and `favor`, a Favor's stake
may be 0; `casino_player`; indexes for the Live tab). Routes `casino/fortune/spin`, `casino/favor/spin`,
`casino/live`. Chat names a Favor win "Moloch's Favor"; the quests count Fortune and Favor jackpots.
`scripts/casino-rtp.ts` checks Fortune (the exact return, the jackpot line 1 in 6,553.6, at most 99.988%, a
million spins measured, never two jackpot lines).

**Tests:** new `casino-oct5-server-test.mjs` (17: Fortune refused below level 6, 120 spins checked line by line
against the strips, the shared pool, the ledger; the Favor once a day, sent again, the next day; the Live feed
with no admin on it, the biggest wins and jackpots; the Derby's bettors and totals) and `casino-oct5-test.mjs`
(20 in the browser: the 8 tiles, FREE SPIN, the countdown, the Live tab updating, Fortune's STOP and lines, AUTO,
the close calls, a big win, the Ascent's sky and turret, the Derby's bettors). `casino-test` expects 8 tiles.
The sandbox's `reg5.sh` now drops the schema before restoring (the new table held the old ones in place).

**AS3 files changed:** `INFERNOYARDPROPS.as`; `com/monsters/casino/CASINO.as`, `CasinoUI.as`, `CasinoWindow.as`,
`LiveTab.as` (new); `com/monsters/casino/games/SlotsGame.as`, `AscentGame.as`, `DerbyGame.as`, `MagmaDropGame.as`,
`ScratchersGame.as`, `RouletteGame.as`, `BonePileGame.as`.

## Deleting an account from the admin panel; kits built at once with resources (6 October)

**Delete account** (the user's; admin panel, a player's card, last: `deleteAccount` in `controllers/admin/adminApi.ts`,
`services/admin/deleteAccount.ts`, `services/admin/panel.html` `doDelete`):
- Refused unless the username is typed again exactly and a reason is given; never an admin (`isAdmin`), never the
  admin's own account. The page asks once more before it goes.
- One transaction (any failure and nothing is deleted), as `delete-player.sql` did by hand: the world's player
  count down by one; an alliance they lead passes to its officer (else member) who has been in it longest, made
  leader, or is deleted when nobody else is in it; their map cells (main yard, outposts, the Depths) and every save
  of theirs; their mail both ways; pets, Map Room data, the attack-violation report, an admin test snapshot; the
  players they invited lose their "invited by" (what was paid stays); the jackpot's last winner if it was them;
  then the account, which takes its casino seeds / bets / games / Favor day, quest book, Gauntlet and event
  claims, alliance invites and alliance chat with it (ON DELETE CASCADE). Other players' attack logs and replays
  are kept (they carry the names), and so is the admin log.
- Their sign-ins end at once (`user-token:game|launcher:<email>` in Redis), and the chat drops them.
- The admin log: `delete-account`, the name, the reason and what went ("3 yard(s), 3 map cell(s), 0 message(s);
  alliance X led by Y now").

**Kits bought with resources are built at once** (the user's): `popup_prefab.BuildKit` sends every kit building at
its kit level (`l`), as a shiny buy-out always did, so the outpost is finished when it loads; nothing is left as
`prefab` to build up. Your own kits too. The popup's notice says so in the Inferno ("Kits are built instantly,
whether you pay with resources or shiny!"). The prices are unchanged. `applyKit.ts` still takes `prefab` from any
client that sends it.

**Tests:** new `admin-delete-test.mjs` (11: the refusals; an alliance leader deleted with every yard, map cell,
message, bet and quest row, the alliance passed on, the world's count, the sign-in ended, the log; a lone member's
alliance deleted; the card in the page) and `kit-instant-test.mjs` (5: the notice, the resources taken, the save
and the yard: every kit building at its level, none building or upgrading). `changelog-test` expects 6 October
first.

**AS3 file changed:** `popup_prefab.as`.
