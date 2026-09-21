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
| `outpostRecycling` | false (release). Turn on while designing kits. `false` restores the stock rule (no recycling in outposts). Server restart only, no client rebuild |
| `moloch.perThousandSeats` | 72 (tripled): about 316 strongholds on a 400 x 400 world, split roughly evenly between level 46 and level 50 |
| `moloch.lootCaps` | most one destroyed building pays, per resource: level 46 = 2M per silo / 4M for the hall, level 50 = 3M / 8M (stock wild-monster yards: 500k / 2M). Sent with the yard, so a server restart is enough |
| `moloch.descentBases` | level 46 is descent base 10 or 11, level 50 is descent base 12 or 13 (the final two). Each stronghold's seat picks which, so it never changes |
| `chat` / `chatTransport` | chat on, over `"http"`: the chat protocol rides on ordinary requests to `/chat/poll`, so it works through a web-only tunnel. `"socket"` is the stock WebSocket (needs ports 3010 and 843 open) |
| `catapult` | the Catapult's ammunition (buildable from Under Hall 3, main yard only): Marilyn Monstroe (magma + sulfur), Candy Jars (bone + coal), Sulfur Bomb (sulfur); four sizes each, size N needs Catapult level N, one shot per row per attack. Every number is here; server restart only |
| `hiddenUi` | invite, gift, earn, daveclub: the Invite Friends, Send Gifts and Earn Shiny buttons and the D.A.V.E. Club icon are hidden. Server restart only |
| `flipTribeYards` | true: devil tribe yards are turned 180 degrees around their centre (Moloch strongholds are not). Reset stored tribe yards after changing it |
| `rezghul` | enabled, 500,000 magma to hatch, unlocked from the start. The server's production attack validation uses the same cost |
| `mapRoom3` | false: no migration offer in the client, every `/worldmapv3/*` route and `setmapversion 3` refused |
| `mushrooms` | false (the Inferno prop table has no complete mushroom entry) |
| `startingShiny` | 10,000–25,000 random |
| `resourceMultiplier` / `magmaMultiplier` | 2 / 4 |
| `buildTimeDivisor` | 4 (build, upgrade, fortify, repair, locker unlock, academy training) |
| `hatchSeconds` | 1 |
| `workers` | 5 (outposts always 1) |
| `tribeSpawns.spacing` / `warp` / `swirl` / `blendWidth` | 6 / 5 / 5 / 1.2 |
| `tribeSpawns.ladders` | the stock per-tribe level sets (see below) |
| `moloch.perThousandSeats` | 24 (about 106 strongholds per 400x400 world) |
| `moloch.levels` | 46 and 50 |
| `moloch.loot` | 60M bone/coal/sulfur + 30M magma at 46, 120M + 60M at 50 (richest ordinary tribe yard: 37.5M / 17.5M) |

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

Shown as negatives (0 stays 0) through `GLOBAL.ioCoord` in the four places the MR2 map prints a
location: the hover panel and the enemy, own-yard and view-only popups. Display only - cells,
bookmarks, requests and the server keep the real values. Jump-to accepts a leading minus and
ignores the sign, so typing what you see works.

## Decorations

Buildable in the main yard and in outposts (overworld set). To remove one from the build menu, add its
id to `disabledDecorations` in `server/src/config/InfernoOnlyConfig.ts` and restart the server.
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
| 24 | Acorn | 55 |  |
| 25 | Beehive | 56 |  |
| 26 | Bird House | 57 |  |
| 27 | Camping Tent | 58 | event only |
| 28 | Childrens Jax | 59 | event only |
| 29 | Red Gnome | 60 |  |
| 30 | Blue Gnome | 61 |  |
| 31 | Green Gnome | 62 |  |
| 32 | Hammock | 63 |  |
| 33 | Lawn Chair | 64 |  |
| 34 | Outhouse | 65 |  |
| 35 | Pinecone | 66 |  |
| 36 | Rock | 67 | event only |
| 37 | Toy Raceway | 68 |  |
| 38 | Scarecrow | 69 | event only |
| 39 | Sun Dial | 70 | event only |
| 40 | Tiki Torch | 71 |  |
| 41 | Walnut | 72 |  |
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
| 55 | Blackberry Bush | 86 |  |
| 56 | Bonsai Tree | 87 |  |
| 57 | Cactus | 88 |  |
| 58 | Monster Fly Trap | 89 |  |
| 59 | Thorns | 90 |  |
| 60 | Pink Flowers | 91 |  |
| 61 | Purple Flowers | 92 |  |
| 62 | Red Flowers | 93 |  |
| 63 | White Flowers | 94 |  |
| 64 | Yellow Flowers | 95 |  |
| 65 | Baseball Trophy | 96 |  |
| 66 | Football Trophy | 97 |  |
| 67 | Soccer Trophy | 98 |  |
| 68 | Statue of Liberty | 99 |  |
| 69 | Eiffel Tower | 100 |  |
| 70 | Big Ben | 101 |  |
| 71 | Swimming Pool | 102 |  |
| 72 | Pond | 103 |  |
| 73 | Zen Garden | 104 |  |
| 74 | Fountain | 105 |  |
| 75 | Tea Garden | 106 |  |
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
- Devil outpost build limits: `IO_OUTPOST_QUANTITY` in `GLOBAL.as` (200 blocks, 40 traps, 4 sharpshooters, 4 blast towers, 4 quake, 4 magma, 1 compound, 1 hatchery control center, 1 monster juicer)
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
  for Kozmodeus), 106 strongholds split about evenly between 46 and 50, about 10 microseconds per
  cell (a whole world in ~1.1 s). Coordinates round-tripped through base ids the way
  `tribeSaveV2` parses them: 4,640 cells, 0 mismatches between the map listing and the yard.
- The patch applies cleanly to a pristine checkout of the base commit.

- Server run for real in a sandbox (bun 1.4.2, Postgres 16, Redis, `ENV=local`, fresh database) and
  driven over HTTP the way the client does:
  - register + login two accounts; first base load gives 10-25k shiny (11,286 and 22,046), 60k
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

## Known rough edges

- The flinger had to be unblocked in the Inferno (main yard and outposts): MR2 attack range
  is derived from flinger level on both client and server. It uses overworld art.
- Moloch has no map icon of its own; it borrows the Dreadnaut frame with a crimson tint.
- Kit thumbnails still show overworld art.
- Converted tribe yards can have slightly overlapping footprints where the Inferno building
  is larger than the one it replaced.
- Yard planner: the building is unblocked and the planner reads the active prop table. The
  server side was reviewed and needs no change: templates are a JSON list on the player's main
  save (`savetemplate`), keyed by slot id, with no yard-type or building-id logic, and the main
  save *is* the inferno yard here. Not exercised at runtime.

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
