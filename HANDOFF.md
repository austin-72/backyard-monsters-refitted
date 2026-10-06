# HANDOFF: Backyard Monsters Refitted "Inferno Maproom 2" (server, Flash client, browser client)

Read this first. It replaces the two earlier handoffs (the server/game one and the browser-client one):
since 2026-09-24 both live in this one project. Details are in the docs listed in §3.

---

## 1. The project

- A fork of Backyard Monsters Refitted (https://github.com/bym-refitted/backyard-monsters-refitted),
  base commit `6d706bdde9e6a3f96adac243a265b6a0ab690fff`, turned into an **Inferno-only** server:
  players start in the Inferno, Map Room 2 is an Inferno world (devil tribes, Moloch strongholds), etc.
- **Live site:** https://inferno-mr2.maproom2.com (the game at `/`, admin panel at `/admin/`).
- Everything the fork adds is gated on `GLOBAL.INFERNO_ONLY` (client) / `infernoOnlyConfig.enabled`
  (server, `server/src/config/InfernoOnlyConfig.ts`). New client code, flags and classes are prefixed
  `io` / `Io` / `io_`.

Four parts, one tree (`D:\@bymr-inferno-mr2` on the user's PC):

| Part | Where | What |
|---|---|---|
| Server | `server/` | TypeScript on Bun, Koa, MikroORM (Postgres), Redis. Runs from `src/` directly. Serves `public/` statically. |
| Game (AS3) | `client/scripts/` | The Flash client. **The source of truth for the game** (also for the browser client). |
| Launcher | `client/launcher/IOLauncher.as` | Built to `server/public/client/launcher.swf`, served as `play.swf`. |
| Browser client | `client-web/` | Converts `client/scripts` to TypeScript and runs it in a browser without Flash. **Most players use this** (bug-report stack traces show `/web/game.<hash>.js`, `src/game/...`, `src/flash/...`). |

The browser client in more detail:
1. **Converter** (`client-web/tools/as3-to-ts/`): every `.as` file of `client/scripts` → TypeScript in
   `client-web/src/game/` (generated, 1,519 files).
2. **Runtime** (`client-web/src/as3/`, `client-web/src/flash/`): AS3 language semantics and the Flash
   Player APIs the game uses, on Canvas 2D, Web Audio, fetch, localStorage.
3. **Asset converter** (`client-web/tools/swf-assets/`): `assets.swf` → JSON shapes/timelines/fonts +
   bitmaps (`client-web/public/swf`), `[Embed]` files → `public/embed`.
4. **Player + page** (`client-web/src/player/`): boots the game class like Flash Player, 40 fps loop,
   input, rendering; `Shell.ts` is the page around it (desktop window, settings, phone layout).

**Guiding principles**
- The browser client **behaves exactly like the Flash client**, bugs included (`client-web/bugreport.md`),
  unless the user asks otherwise. When they differ, the Flash build is the reference.
- `client-web/src/game` is regenerated on every publish: **never hand-edit it**. Fix the converter, the
  runtime, or (it is the user's code, so say so) the AS3.
- The browser runtime was stricter than Flash Player in places, and the AS3 got workarounds (Yard
  Planner `addChildAt`, huge sound loop counts). Keep them. The runtime now also accepts
  `addChildAt(existingChild, numChildren)`, so that fix exists on both sides without conflict.

A separate **upstream copy** of `client-web` (for the public bym-refitted repo, converted from upstream's
1,477 AS3 files) is **not** part of this project. It is in the older `bymr-web-handoff.zip`
(`upstream/client-web/`). Shared files (runtime, converter, tools, docs) should be kept in sync with it
when the upstream contribution is picked up again; ask the user first.

## 2. The user and how they like to work

- Windows, Docker Desktop, PowerShell; project folder `D:\@bymr-inferno-mr2`. Admin of the live server,
  testing with real players.
- **Develops the AS3 themselves**; their copy may be newer than the one you have. Their files win.
  They report build errors by pasting console output.
- **Deliverables (the user's standing instruction):** a zip of **only the files changed or added since the
  previous delivery**, paths preserved, top folder `@bymr-inferno-mr2` (extracting into `D:\` overwrites in
  place), verified file by file. Full-project zip only when asked (and over 30 MB it can't be sent: offer
  split parts). Baselines so far: the combined project (2026-09-24), then each delivery after it.
- **Don't overwrite their own files blindly** (earlier `tasks.json`/`docker-compose.yml` overwrites were
  a complaint): edit surgically, say which of their files changed and why.
- Likes **visual previews to choose from** for UI work (mock-ups with the game's real art and fonts;
  JPEXS FFDec can export sprites/fonts from `client/scripts/_assets/assets.swf`). Chose design "D"
  (portrait tiles) for the login account picker. Wants things **on theme** (parchment frames, gold
  buttons, Groboldov font).
- Answers feature lists with numbered yes/no. Declined: alliance-screen changes; many earlier ideas.
- Be direct and brief, explain causes plainly, and state what was and wasn't tested (real iPhones, the
  real game). Trust their Flash observations (see the spinner lesson, §7).
- Dislikes visible quality loss (browser dynamic resolution is **off by default**).

## 3. Documentation in the tree

| File | Content |
|---|---|
| `INFERNO-ONLY-NOTES.md` | Every server/game feature and setting, file by file (source of truth for behaviour) |
| `RUNNING-INFERNO-ONLY.md` | Install, run, publish, migrate, reset tribe yards |
| `RELEASE-CHECKLIST.md` | Release steps |
| `BUG-REPORTS.md` | Status of every automatic bug report (admin panel Bugs tab), what to mark fixed/delete |
| `WEB-CLIENT.md` | Browser client, user-facing: playing, settings, phones, publishing, watch mode, troubleshooting |
| `client-web/README.md` | Browser client build/run, URL parameters, dev tools and test scripts |
| `client-web/DEVIATIONS.md` | Every known difference from Flash (keep current) |
| `client-web/bugreport.md` | 11 bugs of the original client, preserved on purpose, with file:line |
| `client-web/DESIGN.md` | Browser client architecture, decisions D1–D11 (early phase) |
| `server/src/config/InfernoOnlyConfig.ts` | All tunables (prices, rewards, admins, tribes, Moloch, ...) |

## 4. Build, publish, deploy (the user's side, Windows)

- **Release:** VS Code **BYMR - Release** = `io-stamp-build` (`stamp-build.cmd` writes
  `IOBUILD:<stamp>:` into `client/scripts/IOBuild.as`) → `compile-stable` → `io-publish-client`
  (`publish-client.cmd`: SWF to `server/public/client`) → `io-publish-web` (`publish-web.cmd`).
  The server refuses clients (SWF or browser) whose stamp is older than the published SWF (`/init`,
  "New Update Available!").
- **`publish-web.cmd`**: `npm install` (first run) → `npm run convert` → `npm run assets` → `npm run build`
  → `npm run publish -- --root` (copies `dist/` to `server/public/web` and writes
  `server/public/index.html` = loader page with `<base href="/web/">`, so the game is at `/` and `/web/`
  keeps working) → `npm run check` (compares build stamps). Needs Node 22+.
- **`watch-web.cmd`**: rebuilds on every save to `client/scripts`, publishes to `server/public/web-dev`
  (`/web-dev/?watch=1` reloads itself). Never touches `/web/` unless `--target web`.
- **Docker:** `server/docker-compose.yml` binds `public/client`, `public/web`, `public/web-dev` and
  `public/assets/kits`, so publishing is a file copy. The server lists top-level `public/` folders **at
  boot**: a *new* top-level folder needs one restart. Production caches static files 1 h, hence the
  cache-proof loader (`version.json?t=…` → `game.<hash>.js`).
- **Server deploy:** `docker compose up --build -d` in `server/`. Migrations run on startup unless
  `ENV=prod`; with prod: `docker compose exec web bun run migration:up`. Migrations added by this fork:
  `20260923_AddDailyLogin`, `20260923_AddPlayerKits`, `20260924_AddAdminPanel`, `20260925_AddBugReports`,
  `20260925_RelockChampions` (data only: takes every player's Korath, Drull and Rezghul unlock away, once),
  `20260925_AddAdminTestMode` (table `admin_test_snapshot`), `20260926_AddGauntlet` (column `user.gauntlet`), `20260926_AddGauntletClaims` (table `gauntlet_claim`: every Gauntlet reward paid, one per player, month and stage). `20260927_CreateCasinoTables` (the Brimstone Pit: `casino_seed`, `casino_seed_reveal`, `casino_bet`, `casino_session`, `casino_round`, `casino_jackpot`). `20260928_CasinoJackpotFraction` (the jackpot pool keeps fractions). `20260929_CasinoRounds` (indexes for the shared rounds). `20260930_AddDesigns` (table `io_design`: the Designer's tribe and Moloch layouts and the kits as they were). `20261001_AddDesignDefenders` (columns `io_design.monsters` and `.academy`: the monsters a designed yard's Compounds hold, and their levels). `20261002_AddReferralResult` (column `user.referral_result`: what came of each invite, paid / same-ip / no-inviter; index on `user.referred_by`). Later ones: `20261005`-`20261009` (chat moderators, alliance board, alliance empire value, quest book, designs as defaults), `20261010_AttackLogDetails` (creates `attack_logs` where missing; adds baseid, level, damage, destroyed, ended, endtime). `20261015_CasinoFun` (casino_bet takes `fortune` and `favor`, a Favor bet has stake 0; table `casino_player`, the day Moloch's Favor was used; indexes for the Live tab).
- **Launcher:** `server/public/client/launcher.swf` is committed (bind-mounted folder; copy it over).
- If Docker Desktop breaks ("read-only file system"): quit Docker, `wsl --shutdown`, restart; back up
  the DB first (`server\backup-db.cmd`; the `backup` service also does it daily into `server\backups`, and
  `restore-db.cmd` puts one back); never `down -v` or `system prune --volumes`.

## 5. What was built

**Server** (new files mostly under `server/src/services/...`; details in INFERNO-ONLY-NOTES.md):
- Daily login reward (`services/user/dailyLogin.ts`, `collectDaily.ts`): 10 shiny a day, 100 every 7th day,
  200 every 14th; the streak keeps counting past 14; UTC days. Client: Daily Reward button replaces the
  gift button, popup `com/monsters/daily/IoDailyPopup.as` (two rows of seven days).
- Relocation invites between alliance members (`services/maproom/v2/relocateInvites.ts`).
- Player kits: 3 per player on kit page 3, pictures drawn by `services/kits/kitPreview.ts`.
- Korath (IC9) and Drull (IC10) as monsters (`IoChampionCreep.as`; client CREATURELOCKER and server
  `monsterStats.ts` must match).
- Admin panel `/admin/` (`services/admin/panel.html`, `controllers/admin/adminApi.ts`), incl. **Bugs** tab.
- Automatic bug reports: client `com/monsters/debug/IoBugReport.as` (hooked into `LOGGER.Log` "err") →
  `/bugreport` → `services/admin/bugReports.ts` (grouped by fingerprint; 4xx skipped).
- Per-player flags (`services/user/playerFlags.ts`) on load and every `updatesaved` poll.
- Yard Planner layouts per yard (`controllers/yardplanner/plannerSave.ts`), `deletetemplate` route.
- Ownership check in `migrateBase.ts`; bookmarks kept when "relocate anywhere" lands in the same world.
- Spawn rules for new players (`services/maproom/v2/findFreeCell.ts`, config `spawn`): near other
  players, away from main yards and Moloch strongholds.
- Alliances: members of any alliance (`/alliance/alliancemembers`), power-up recharge 4 days.
- Admin panel Players tab lists everyone (`players` action) with a filter.
- **The Brimstone Pit** (casino, building 141): `services/casino/`, `controllers/casino/`,
  `config/CasinoConfig.ts`; client `com/monsters/casino/`; art `art/brimstonepit/`, `art/casino/`. Milestone 1
  (lobby, seeds/ledger, Magma Drop, Scratchers), 2 (Wormzer Roulette, Magma Slots with the jackpot), 3 (Bone Pile, with a job settling idle games), 4 (Balthazar's Ascent) and 5 (Magma Derby; both shared rounds run by the server) done; then (5 October) Korath's Fortune at Pit level 6 (five lines, the Slots' jackpot shared), the Live tab (no admins on it), Moloch's Favor (a free daily Slots spin), STOP / AUTO and close calls on both slots, big-win celebrations, the Derby's bettors, the Ascent's sky loop and Sharpshooter Tower. Every game returns just under 100% (99.5% to 99.99%; parts of a Shiny paid by chance; the Slots pool capped at 66,000 so no spin is ever worth 100%). See INFERNO-ONLY-NOTES "The Brimstone Pit" and "Returns just under 100%".
- **Inferno art for six buildings** (27 September): the General Store, Hatchery Control Center, Flinger,
  Catapult, Map Room and Monster Juicer no longer use the overworld's art (`buildings/i...` folders, the
  user's pack; see INFERNO-ONLY-NOTES "Inferno art for six buildings"). The missing damaged / destroyed
  pictures of the Bone Cruncher, Coal Extractor and Magma Tower were added the same day.
- **New towers and monsters** (27 September): the Cinder Coil (144, `INFERNO_CINDER_COIL.as`: a charged arc
  that leaps between monsters) and the Obsidian Mortar (145, `INFERNO_OBSIDIAN_MORTAR.as`: slow splash shells,
  a dead zone inside 100), from `newtowers.md`; Clinkerjaw (IC12, splits into small Spurtz at 3/4 size and
  speed, and leaves a pool of magma that heals nearby monsters 100, once each) and Flickerfiend (IC14, every
  third strike vanishes for a second and reappears beside another building up to 400 away; does not set
  traps off), `com/monsters/monsters/creeps/inferno/`, stats in
  `CREATURELOCKER.ioAddNewMonsters` and the server's `monsterStats.ts` (identical). With them: buildings are
  clicked by their pictures (hit areas made from the art) and glow white under the mouse; the Gauntlet
  button sits under the fifth worker; the register form's warning; Balthazar no longer sets off traps or
  Quake towers; Sulfur Bombs reach burrowed monsters. See INFERNO-ONLY-NOTES "New towers and monsters".
- **Ashkarr, the Ember Herald** (IC24, 27 September): a champion-class monster on Strongbox page 5, 600
  housing, unlocked and trained for what Korath and Drull cost, level 6 in the Academy; every 10 s in battle
  her war-cry speeds up her side within 300 (x1.20-1.35) for 11 s (so it runs on without a break) and roots
  the other side for 7 s. Several Ashkarrs never stack (the strongest counts). `Ashkarr.as`,
  `WarCry.as`, `WarCryBoost.as`, `StunEffect.as`; server `monsterStats.ts`, `lockedMonsters.ts`. Also the
  Yard Planner's Inferno art (`buildings/iyardplanner/`). See INFERNO-ONLY-NOTES "Ashkarr".
- **Build menu drawn from the yard art and more** (29 September, afternoon): `IoMenuArt` draws menu buttons
  (and the building window of the seven with overworld pictures) from the Inferno yard art; turning towers follow
  the mouse, animations play (Quake: a drop, 4 s rest), one scale for all. Also:
  - the animated outpost hall (`buildings/ioutpost/`);
  - new Emberghoul and Ashkarr portraits;
  - "Incubation Control Station" (renamed; its list four across, description wider);
  - Rezghul between King Wormzer and the Emberghoul;
  - the Juicer juices Inferno monsters (resized art);
  - SWF shapes drawn layer by layer in the browser build (the black outlines over resource boxes and the kit table);
  - a Coil/Mortar row in the kit table;
  - kit pictures drawn again with the new art at server start (`refreshKitPictures.ts`);
  - the tribes' large pictures in the map cell box;
  - the chat scrolled to its newest line, its tabs in Groboldov.
  See INFERNO-ONLY-NOTES "Build menu art, outpost hall, juicer and more".
- **Padlocks, Magma wording, designs export** (29 September, evening): the overworld padlock on locked monsters
  (Incubator, Incubation Control Station, Compound, Academy, Strongbox; `IoLockIcon.as`); `assetVersion` 8 (the
  replaced portraits were cached in production); the tribe picture moved to the map room's cell panel
  (`MapRoomPopup.TribePic`, hover popups reverted); "Goo" → "Magma" in the ICS and Juicer; Rezghul's Academy
  place; `server/src/scripts/export-designs.ts` exports the Designer's layouts and kits. See INFERNO-ONLY-NOTES
  "Padlocks, Magma wording, designs export".
- **Missing assets filled, Juicer v2** (29 September, evening): the Monster Locker's shadow, damaged and
  destroyed art; the Juicer restyled (v2); the build-menu silhouettes (locked buildings show them, not the live
  drawing; the Blast Tower's and Compound's made here, and the Blast Tower's missing button); the Under Hall L1
  button; the monster popups IC1-8; the Inferno quest pictures; `assetVersion` 9, `KIT_PICTURES` 3. See
  INFERNO-ONLY-NOTES "Missing assets filled, Juicer v2".
- **Every missing Inferno asset made** (29 September, late): the 24 quest-list icons, the Academy's animations
  (while training) and shadows, the Magma Tower's destroyed shadow, Rezghul's projectile; the Portal's shadow typo; Moloch's Gauntlet yards shown as Moloch's, not the Brukkarg's.
  See INFERNO-ONLY-NOTES "Every missing Inferno asset made".
- **Recycling in outposts: the Designer only; bug reports #42-#47** (29 September): a kit draft can recycle
  and stop construction, a player's outpost never (`GLOBAL.outpostRecycling` = the Designer; the server switch
  `outpostRecycling` is gone). #47 (`MAP.Scroll` on a null map, yard switches): only the latest base load
  builds (`BASE.Load`), a replaced map ground lets go (`MAP.ioLetGo`). #42/#43 (`BuildingOverlay`, a Map Room
  being built): the build bar uses the first cost. See INFERNO-ONLY-NOTES "Bug reports, 29 September".
- **Resource generator art by level band** (29 September): the Bone Cruncher, Coal, Sulfur and Magma
  Extractors each draw levels 1-2, 3-5, 6-9 and 10 from their own art (`imageData` keys 1, 3, 6, 10 in
  `INFERNOYARDPROPS.as`; the pictures in `buildings/iboneharvester|icoalproducer|isulpherproducer|imagmaproducer/`).
  The Magma Extractor's 3-5 had been its level 1 art; the Bone Cruncher's missing shadows were made
  (damaged 3-5, 6-9, 10; destroyed 3-5). See INFERNO-ONLY-NOTES "Resource generators by level band".
- **Fusebug and Emberghoul** (28 September): the Fusebug (IC15, not the spec's IC19: the Hatchery's numbers
  would have clashed with Rezghul's C19), a bomber on Strongbox page 1 that explodes on its first attack
  (the game's own `explode`), and the Emberghoul (IC20), a page-4 bruiser healing 15-20% of every hit
  (`Emberghoul.as`, `LifestealOnAttack.as`). The new monsters stand (or play attack rows) instead of walking
  on the spot (`CreepBase.ioAction`); the Flickerfiend's shimmer slowed to be seen; the Cinder Coil's
  spin-aim-shock-rest cycle; the Obsidian Mortar's shells lobbed. See INFERNO-ONLY-NOTES "Fusebug".
- **The Designer** (27 September, admins): a Designer button in the top bar lists the 6 outpost kits, every
  wild tribe level (19) and Moloch's 13 descent bases, each with Edit. Edit opens the layout as a draft yard,
  free and instant. Tribes and Moloch have no limits and no yard edge; kits have an outpost's limits. Save
  writes kits to `inferno-kits.json` (with pictures); tribe and Moloch layouts go to table `io_design`,
  which the yard generators use. Reset puts the stock layout back, and Remake makes the stored yards on the
  map again. Tribe and Moloch designs also set the monsters in the Compounds and their levels (Monsters,
  28 September). Files: `services/admin/designs.ts`, `designStore.ts`, `controllers/admin/adminDesign.ts`,
  client `com/monsters/admin/IoDesigner.as`. See INFERNO-ONLY-NOTES "The Designer".

- **Map Room 2 art** (30 September): the user's `hell-maproom2` pack. `assets.swf` replaced (only the map
  cell's 19 bitmaps and the lava surface differ), four pictures of every ground tile (`HellTileVariants.as`),
  the Inferno's player base icons, no more runtime tinting (`InfernoMapTheme`), world map colours from the new
  tiles. See INFERNO-ONLY-NOTES "Map Room 2 art".

- **Warts** (30 September): the user's `inferno-warts` pack. The yard's mushrooms are drawn as warts
  (`IoWarts.as`, `BMUSHROOM.ioPlaceWart`), six kinds instead of five, named "Wart" with their own worker lines,
  thumbnail and golden popup picture (`popups/goldwart.png`); `assets.swf` untouched. See INFERNO-ONLY-NOTES
  "Warts".

- **Yard grounds by cell height** (30 September): the user's `hell-yard-grounds` pack. Outposts and wild
  monster yards stand on bones, netherrack or black rock by their map cell's height (`MapRoomCell.ioYardGround`,
  `BASE`, `MAPBG`, 26 JPGs in `_assets/hellyard/`); main yards keep lava. See INFERNO-ONLY-NOTES "Yard grounds
  by cell height".

- **Friends invited, in the admin panel** (30 September): a player's card has a "Friends invited" card: how
  many players joined through their invite link, how many of those paid, and each one (name, joined, paid or
  why not), plus who invited this player. Each invite's result is now kept (`user.referral_result`, migration
  `20261002_AddReferralResult`). See INFERNO-ONLY-NOTES "Friends invited in the admin panel".

- **Bone fields** (30 September): the user's `inferno-maproom2-complete` pack. New sand1/sand2 map tiles
  (bones on dark rock) in `assets.swf` and `_assets/hellmap/`, new bone yard grounds, the Inferno worker
  marker beside free outposts, world map colours for the bone fields, and the seven Map Room tutorial
  pictures redone. See INFERNO-ONLY-NOTES "Bone fields: new shore art". Later the same night sand2 was
  redone with fewer bones than sand1 (map tile, its versions, the yard ground, the world map colour).

- **Strongbox and Academy busy rules** (30 September): Rezghul's unlock now counts as the Strongbox's unlock
  (it didn't: no animation, a second unlock and the upgrade were allowed, and his unlock never finished); no
  upgrade of the Strongbox while it unlocks or of the Academy while it trains by any route, the instant one
  included; no unlock or training while the building itself upgrades; instant unlock and instant training
  can't be paid twice; each Academy's busy mark kept in line with the training times (two Academies still
  train two monsters). See INFERNO-ONLY-NOTES
  "Strongbox and Academy busy rules".
- Overnight bug hunt (1 October): warts on wild yards, a yard load crash, two tutorial / bottom
  bar errors, Rezghul's juice, four missing texts, designed yards' far buildings moved on load, the welcome
  popup's empty picture, untranslated and broken texts in French / Spanish / Portuguese, the attack bar's
  label, Relocate's double-send message, the prompts to buy Shiny, tests brought up to date (new `languages-test.mjs`). See INFERNO-ONLY-NOTES
  "Bug hunt (1 October, overnight)".
- Invite rewards (1 October): admins can bar a player from invite rewards (migration `20261003_AddReferralBarred`),
  and the Players tab sorts by invites accepted. See INFERNO-ONLY-NOTES "Invite rewards: barring abusers".
- Yard Planner wall line placing walls twice with gaps (1 October): the line now takes exactly the walls it
  places off the storage list and leaves nothing on the mouse. See INFERNO-ONLY-NOTES "Yard Planner: wall
  line placing walls twice".
- Bug reports #49-#59 (1 October): getarea outside the world, the main yard taken for an outpost ("outpost w
  TH"), `ibuild` loads sent home, login / register sent once, a splat with no layers, no-answer requests not
  reported and `/init` tried again. #51 (a 524 on a save) needs the server log. See INFERNO-ONLY-NOTES "Bug
  reports #49 to #59" and BUG-REPORTS.md.
- Bone fields: new yard grounds (1 October): the user's flatter `hell_sand1_big` / `hell_sand2_big`. See
  INFERNO-ONLY-NOTES "Bone fields: new yard grounds".
- Hell Freezes Over (1 October): the three-day ice event in the Inferno main yard, 13 waves of ice cretins
  (`IC26`-`IC31`) for up to 215 shiny, and the ice champion Rimegrave (`IC25`) unlocked by winning all 13.
  Off until an admin turns it on (Status tab); per-player Start now / Next day / Reset. Migration
  `20261004_AddHellFreezesOver`. See INFERNO-ONLY-NOTES "Hell Freezes Over".
- Hell Freezes Over tested end to end (1 October, evening): starts only from the main yard (not outposts,
  designs or test mode), a no-tower Day 3 no longer sticks, Rimegrave hidden until won and the cretins never in
  the Strongbox / Compound / Academy, no AFK stop mid-wave, stragglers melt, surges by game steps; balance runs
  (`tools/hfo-balance/`) against a maxed Under Hall 6. See INFERNO-ONLY-NOTES "Hell Freezes Over: tested end to end".
- Hell Freezes Over's waves doubled (1 October, night): every monster count in `IoHfoWaves.WAVES` x2, nothing
  else. See INFERNO-ONLY-NOTES "Hell Freezes Over: waves doubled".
- Strongbox unlock with no time left (1 October, night): an unlock whose save had lost its end time could never
  finish; it gets one back (or finishes) on the next load. See INFERNO-ONLY-NOTES "Strongbox unlock with no
  time left".
- Hell Freezes Over (1 October, night): Rimegrave's smaller sheets, no still frame while a monster fights, the
  Compound frozen solid during the waves (its monsters stay in), and the battle ice now drawn. See
  INFERNO-ONLY-NOTES "Hell Freezes Over: smaller Rimegrave, fighting frames, the Compound frozen".
- Hell Freezes Over starts once every monster is unlocked (1 October, night): no champion level needed. See
  INFERNO-ONLY-NOTES "Hell Freezes Over: no champion level needed".
- Leaderboards (2 October): a trophy button right of the Shiny opens Outposts / Alliances / Gamblers tabs
  for every world (filter by world, Find me, Jump, alliance members). The board is made on a new fixed
  5-minute clock that also rebuilds each world's map snapshot at its own moment in the cycle; the game asks
  for either one no sooner than 5 minutes apart, a few seconds after the server's `nextAt`. See
  INFERNO-ONLY-NOTES "Leaderboards, and the map snapshots on a fixed 5-minute clock".
- Chat (2 October): bugs fixed and the missing pieces added.
  - Bugs: the old line back in front of the next, markup drawn, Alliance dead after a lost link, history
    doubled, ignores lost on reload, refused lines vanishing, alliance changes not followed.
  - New: times ("2m"), a name menu (message, ignore, jump, leaderboards), mentions, `/ignore` and the other
    commands, announcement / big win / milestone banners, a 200-character box that grows, alliance entry
    colours, smooth scrolling.
  - See INFERNO-ONLY-NOTES "Chat: bugs fixed, and what it was missing".
- Chat moderation (2 October): [Admin] / [Mod] badges, Delete line and Mute from the name menu (and
  /mute, /unmute), and chat moderators set in the admin panel (`user.chat_mod`, migration 20261005). See
  INFERNO-ONLY-NOTES "Chat moderation: badges, Delete line, Mute".
- Alliances window redesigned (2 October): a header strip (emblem, standing, online, outposts, empire);
  tabs Overview, Board, Outposts, Members, Power-Ups, Recruit, Invites, Browse (Browse, Invites, Create
  without an alliance); no chat in the window (the dock is the chat).
  - The board: pins with an optional place, at most 50, each kept 30 days, a count of new ones.
  - The outposts gained and lost: 90 days, from players and tribes, filterable, Jump.
  - An officer role: pin, invite, recruit, kick.
  - Migration 20261006. See INFERNO-ONLY-NOTES "Alliances window redesigned".
- Alliances rank by empire value instead of empire points (2 October): Browse (order, rank, column), the
  header, Members, Recruit. Migration 20261007 (`alliance_stats` gains `empire_value` and its ranks). See
  INFERNO-ONLY-NOTES "Alliances rank by empire value".
- Login page "What's different?" button (2 October): opens the overview of every change as a PDF in a new
  page. The server's `/whats-different` points to `server/public/docs/Inferno-Maproom-2-changes.pdf`;
  replace that file to publish a new version. See INFERNO-ONLY-NOTES "Login page: What's different?".
- Quest book (2 October): the Quests button opens a tree of 140 quests in 10 categories, with chests,
  three daily quests, Collect all and Go there. The quest dock shows the ready and closest quests, and a
  notice appears when one is ready. The server counts and pays everything (`services/quests/`, table
  `bym.quest_progress`, migration 20261008); the game reports what only it sees through `/quests/event`. The
  admin panel's player card can mark quests done or start the book again. See INFERNO-ONLY-NOTES "Quest
  book".
- The Designer's tribe and Moloch layouts are the default (2 October): `game-data/designs/defaultDesigns.ts`
  (from the live export), applied to the stock templates. Migration 20261009 deletes the `io_design` rows
  that equal them, and Reset goes back to them. See INFERNO-ONLY-NOTES "The Designer's tribe and Moloch
  layouts made the default".
- The UI sweep (3 October): every window, in the four languages and on a small screen, looked at and its
  texts measured. Fixed: counters, buttons and headings drawn smaller when they don't fit (`GLOBAL.ioFitText`),
  Invite a friend, the Compound's bar, mailbox headings, the alliance window on short screens, Pit details, chat
  place pills, the register form's errors, Chaos pictures, lists joined in the player's language, French
  building names showing as keys, 488 strings translated and many shortened. See INFERNO-ONLY-NOTES "The UI
  sweep".
- Every quest checked to be reachable (3 October): quests only some players can do are optional (recruiting
  and pins for staff, relationships for leaders, buying a power-up, the top three, friends, the jackpot);
  daily quests are picked only from what the yard can do and kept for the day; "Open the map" counts only
  when the map really opens, and its Go there opens the build menu at the Map Room when there is none. A
  claim's money is paid inside its transaction (four at once pay once). See INFERNO-ONLY-NOTES "Every quest
  reachable".
- Attack logs and more (3 October, afternoon):
  - Attack logs: the top bar's crossed swords open My attacks / Attacks on me, with Report and Jump
    (`IoAttackLogs.as`). The server logs tribe attacks too and fills each log from the attack's saves
    (`createAttackLog.ts`, route `/attacklogs/game`, migration 20261010).
  - Walls: Upgrade All (Resources).
  - Traps that went off stay, disarmed, until Re-arm All.
  - The Incubator: hold to add. The Control Station: arrows to reorder.
  - The Yard Planner: Export / Import (BYML1 text).
  - Decorations build in 0 s; the Under Hall is 130 square; every monster trains to level 6; the worker icon
    shows in outposts.
  - Tribe yards go back to fresh 12 hours after their last attack (`tribeReset.ts`).
  - Bug reports #61, #62 and most of the AI tester's list are fixed.
  - See INFERNO-ONLY-NOTES "Attack logs, walls and traps ..." and "The bug reports of 3 October".
- Missing assets (4 October): a scan and a 404-logged run of 33 tests found Rimegrave's `popups/IC25-150.png`
  missing; it, the ice monsters' `popups/IC26-150.png` to `IC31-150.png` and `effects/heart_icon.v2.png` were
  added. See INFERNO-ONLY-NOTES "Missing assets check" for what is missing on purpose (overworld-only).
- FPS pass and frame interpolation (4 October): `tools/test/fps-survey.mjs` measures every demanding place.
  - Fixed: pathfinding's time budget and data, the yard renderer's dirty tiles and whole-view drawing, monsters
    drawn twice a frame, the Yard Planner's drag and group check, and the runtime's screen damage, big bitmaps,
    filter canvases and text caching.
  - New: frame interpolation (page setting, 1-4 made-up frames, off by default).
  - See INFERNO-ONLY-NOTES "FPS pass and frame interpolation".
- The Depths of Hell (4 October, afternoon): the underworld renamed in the game (the code keeps "underworld").
  - Portals are light purple dots on the world map and the minimap; a click on one goes down.
  - Any portal can be entered to look.
  - New look: red-and-black brimstone platforms in lava with wooden bridges, 4 art variants, the lava sea level with the island (`IoUnderworld.depthsGround`).
  - Cells are neutral (height 125), and portals below stand on a platform.
  - See INFERNO-ONLY-NOTES "The Depths of Hell".
- Coordinates are plain numbers (4 October): the world 0-399, the Depths of Hell 0-9 ("Depths of Hell 4, 5"; "D4 x D5" in Location boxes). See INFERNO-ONLY-NOTES "Map coordinates".
- 4 October, evening: building speed-ups free with 10 minutes or less and 1-9 Shiny under an hour (`STORE.ioBuildingTimeCost`); the Gauntlet's catapult shots cost resources; truces removed (migration 20261014_RemoveTruces); main yard walls 10-300 by Under Hall; the Depths' lava in 9 textures, bridges twice the size; the Changelog button (`IoChangelog`, `/changelog`, `server/public/docs/changelog.json`). Later that evening the top bar's shortcuts became labelled bars like the Shiny counter, with Alliances added: Alliances, Attack Log, Leaderboard, Change Log (`UI_TOP.ioTopBars`). See INFERNO-ONLY-NOTES "Speed-ups, the Gauntlet's catapults, no truces...".
- 5 October: the main yard builds 4 Magma Towers at Under Hall 6 (`INFERNOYARDPROPS` 132; outposts keep 4); the Alliances window's first tab draws every time it is opened (`ALLIANCEPOPUP` opens it on `ADDED_TO_STAGE`: it was empty from the second open on). See INFERNO-ONLY-NOTES "A fourth Magma Tower...".
- 5 October, later: outposts have 2 workers (`GLOBAL.ioOutpostWorkers`; the map shows a second idle worker stacked behind the first, from `monsters.finishtimes`); bug reports #68 (Depths edge cells stopped the info panel), #66 (refused attacks: a message and home, `errorDetails.data.io_refused`), #65 (speed-up with no building), #63/#64/#67 (one player's casino requests one at a time, `middleware/casinoQueue.ts`; DB pool 20, `DB_POOL_MAX`). See INFERNO-ONLY-NOTES "Two workers in every outpost...".
- 6 October: the admin panel deletes accounts (`deleteAccount`, `services/admin/deleteAccount.ts`; the name typed again, a reason, never admins); kits bought with resources are built at once, at their levels (`popup_prefab.BuildKit`). See INFERNO-ONLY-NOTES "Deleting an account...".
- 5 October, night: the Brimstone Pit's Korath's Fortune (Pit level 6), Live tab, Moloch's Favor, STOP / AUTO / close calls on the slots, big wins, the Derby's bettors, the Ascent's sky and Sharpshooter Tower. Migration `20261015_CasinoFun`. See INFERNO-ONLY-NOTES "The Brimstone Pit: Korath's Fortune, live bets...".

**Game (AS3):** restyled login with saved accounts ("WHO'S PLAYING?" tiles, `IoSavedAccounts.as`),
Switch account (`GAME.ioSwitchAccount`: launcher `io_restart`, which the browser client turns into a page
reload without `token`), Yard Planner toolbar (`IoToolTile.as`, select area, wall line, flip/rotate),
confirm before spending shiny (`GLOBAL.ioConfirmShiny`), pinch to zoom (`IoPinchZoom.as`), new art built
into the SWF (`io_*.as` BitmapData + PNGs in `client/scripts/_assets/`), many fixes. Later: planner
Undo / Redo and Store-selection, Global / Alliance chat tabs with unread counts and name clicks
(`BYMChat`, `ChatBox`), alliance Members popup (`IoAllianceMembersPopup.as`), Strongbox page 5 and level 5
(Korath, Drull; Rezghul locked again), Catapult Sulfur shield (`IoSulfurShield.as`).

**Browser client:** login/register (incl. `?ref=`), Inferno yard, daily reward, HTTP-poll chat, Map Room 2,
attacks, yard planner, switch account, version check, watch mode, site root, phone/tablet layout (safe
areas, menu pill, keyboard bridge, Android full screen, iPhone home-screen hint, manifest + icons).

## 6. Architecture notes (browser client)

**Converter** (`tools/as3-to-ts`: lexer, parser, model (+`abc.ts` reads `../playerglobal.swc`), analyze,
emit-core, emit, cli):
- Construction: `$alloc()` → `$afterAlloc()` → `$ctor(...)`; `super(...)` → `super.$ctor(...)`; field
  defaults on the prototype (`as3.fields`), `useDefineForClassFields: false`, no TS field initialisers.
- Explicit coercions (`|0`, `>>>0`, `as3.str`, `as3.cast`), memoised method closures (`as3.bind`), lazy
  statics (`as3.lazyStatics`), `super.field` → `this.field`.
- Vector element access → `as3.vget/vset/vinc/vsetLength` (bounds-checked, no Proxy: 100× slower).
- **Flash-style linking**: `registry.ts` lists only classes reachable from `GAME` (what mxmlc compiles).
  The 55 unreferenced symbol classes (`tools/as3-to-ts/last-run-unlinked.txt`) stay plain MovieClips, as
  in the SWF. `--link-all` disables this; `--main` sets the root class.
- Also emits `src/game/index.ts` (load-ordered barrel); `overrides/` has the hand-written WebSocket.

**Runtime/player** (most-touched: `src/flash/display/core.ts`, `display/library.ts`, `display/BitmapData.ts`,
`text/index.ts`, `events/index.ts`, `ui/index.ts`, `media/index.ts`, `src/player/Player.ts`,
`src/player/Shell.ts`, `src/as3/index.ts`):
- All canvases CPU-rasterized (`willReadFrequently`); GPU Canvas2D gave ~7 fps. `?gpu=1` to compare.
- **Redraw regions** (`redrawRegions`/`visitRedraw` in core.ts): only damaged rects redrawn; full redraw on
  first frame, resize, colour change, every 3 s; `?redraw=full`. `__player.verifyRedraw()`.
- **cacheAsBitmap** via the effects cache; layers reused at whole-pixel-snapped positions.
- **Timelines**: only playing clips on stage are stepped (`activeClips`).
- **Text**: embedded SWF fonts; device fonts in non-uniformly scaled fields drawn unstretched.
- **9-slice**: only the container's own shapes are sliced.
- **Stage**: NO_SCALE, minimum stage 760×670 (smaller screens scale down); align `""` (centred).
  `__player.stageToClient(x, y)` for tests.
- **Input**: pointer events. Touch follows `Multitouch.inputMode` like Flash: NONE = first finger is the
  mouse, two-finger pinch → MOUSE_WHEEL steps; TOUCH_POINT = `TouchEvent`s for every finger + mouse events
  for the primary; GESTURE = `TransformGestureEvent`. **The game's `IoPinchZoom` switches to TOUCH_POINT
  when the map starts**, so in practice pinches reach the game as TouchEvents and it zooms one step per
  pinch (verified: no wheel events, no double zoom). Hidden `<textarea>` bridge for typing.
- New Flash API needs (the user keeps adding touch/mobile AS3): constants in `src/flash/_constants.ts`,
  register classes with `flashClass(Class, "flash.pkg.Name")`.
- **Adaptive resolution** only if enabled in settings.
- **Fps pass (4 October)**, see INFERNO-ONLY-NOTES "FPS pass and frame interpolation":
  - many damage boxes become 32-px tile runs (`tileRects`), not 4 x 4 screen cells;
  - big upright bitmaps (the yard) are drawn only where they can show;
  - filters and effect layers reuse their canvases;
  - a text field not being typed in is drawn from its own cached canvas, placed on whole pixels
    (`__player.textCache.off = true` turns it off);
  - `DisplayObject.$contentSig()` lets the yard renderer tell a still clip;
  - `__player.debug.damageLog = []` logs what is drawn again and why.
- **Frame interpolation** (`interp` in core.ts, the loop in Player.ts, `Renderer.ioInterpolate` in the AS3):
  - The page setting is "Frame interpolation" (`?interp=N` for tests).
  - Made-up frames are drawn between game frames: transform setters note the starting values, then
    `apply`/`restore` move objects part of the way; the yard renderer does the same for its points.
  - Off by default. It pauses itself when made-up frames don't fit.
  - `__player.interp.stats` gives `{real, shown, invented, skipped}`.

URL parameters: `serverUrl`, `token`, `language`, `ref` (FlashVars); `shell=0`, `mobile=1/0`, `hidpi=1`,
`quality=auto`, `maxpixels=N`, `redraw=full`, `gpu=1`, `watch=1`.

## 7. Hard-won lessons

- **Finding what repaints every frame:** temporarily log objects in `visitRedraw` (core.ts) where damage is
  pushed ("look"/"moved"), in a test build only. That found the yard renderer's 3994×1994 canvas under the
  Yard Planner. Pointer-event handlers (e.g. drag code) run outside `__player.stats` frame times: time them
  directly.
- **Test yards:** the server keeps loaded saves in its database layer's memory, so editing `bym.save` with SQL
  while it runs is overwritten; restart it first, or build test content in the page (`BASE.addBuildingC(t)`
  then `.Setup({...})`, with `BASE._blockSave = true`). Extra buildings can raise the yard's level: close the
  "Congratulations" popups (`POPUPS.Next()`), or they swallow the mouse.

- **Spinner too fast on web only**: the spinner symbol's class isn't linked by mxmlc, so in Flash it's a
  plain clip; registering every class doubled its speed → Flash-style linking. The user corrected the
  first diagnosis: trust their Flash observations.
- Measure in *real* browsers: the user's machine showed per-frame canvas commit costs headless didn't.
- Cached layers must be drawn at the same snapped position when created and reused (else 1-px slivers).
- `addChildAt(existingChild, numChildren)` must be allowed; `$phase` is Event's field (use `$gphase`).
- Flash sends a POST with no fields as a GET (server routes for no-field calls accept both).
- Base ids are larger than `int` (use `Number`).
- Tool output escapes backslashes (check raw bytes before "fixing" a regex); `zip -x "@..."` treats `@`
  as a list file; `sed` ranges on `;` endings.
- **The browser runtime and the language files are their own copies in the test tree**: a change to
  `client-web/src/flash/*` or `server/public/gamestage/assets/*.json` must be copied there too (the sandbox's
  rebuild script does now), or the build fails on a missing runtime class.
- **A library text field's box can start right of its `x`** (the DefineEditText bounds; `$bx` in the port, 29 px
  for the building menu's name). Centre or align a field by `getBounds(parent)`, not by `x` and `width`.
- **A map request with no fields arrives as a GET** (see above): `URLLoaderApi().load(url, [])` to a POST-only
  route is a 405. Send a field (`[["v", 1]]`) or accept both, as `worldmapv2/ioreach` does.
- **The Underworld is cells 500-509 of the same world** (IoUnderworld / services/maproom/v2/underworld.ts):
  anything that wraps coordinates by 400 or checks `x < 400` must leave them alone (MapRoom.RequestData lets the
  underworld's zone through even with the map closed, so its outposts can load).
- **Tests and wild monster attacks:** `WMATTACK.Setup` turns wild attacks back on with every yard load, and its
  warning popup swallows clicks. A test that reloads a yard turns them off again and hides the warning
  (`WMATTACK._enabled = false; WMATTACK.HideWarning()`). In a Wart Bloom (Friday 6 pm to Sunday midnight Central),
  warts grow in the open yard every 30 s: expect them in screenshots and on pets' spots.
- **Watching a replay waits for the yard's save** (`IoReplays.busy`): a test clicks Watch only once
  `BASE._saving` is false and the save counters match.
- In the sandbox, **background processes die between commands/turns**: start the server in the same
  command as the test (or run `sandbox-tools/io-up.sh` first).

## 8. Open items

1. **Real phones**: layout, keyboard, pinch zoom verified only under Chromium emulation (Pixel 7, iPhone 13).
   iOS canvas memory limits unknown. Ask for reports.
2. **Not yet verified in the real game** (compiled/emulated only): Yard Planner toolbar and tools, login
   account tiles, Switch account in the browser, shiny confirmation flows, Korath/Drull art alignment.
3. **Bug reports:** see `BUG-REPORTS.md`. #3 (HTTP 500 at login, 21×) needs the server log from
   2026-09-24 18:30–18:40 UTC and the migration check there; asked the user.
4. **Level-based tribe tower swaps**: current table in `server/src/game-data/tribes/devil/devilify.ts`;
   the user never gave the rules. Ask.
5. **Invite links**: done. `${referral.inviteUrl}/?ref=<code>` (default `https://inferno.maproom2.com/`) and
   the text the user gave ("Join me on maproom 2 in the inferno! ...").
6. **Map terrain colour** vs Flash: asked the user to compare; no answer yet.
7. **Battle performance** beyond ~30 fps @160 monsters needs changes to the game's sprite composition
   (AS3) — only with consent.
8. Other text size/placement problems in the browser: asked for specific screens.
9. Missing mission icons in `server/public/assets/missionicon` (e.g. `icon-sharpshooter.png`,
   `icon-compound.png`, `icon-incubator.png`): 404 in both clients. Pre-existing.
10. ~109 TypeScript type errors in the browser client (AS3 patterns; build uses esbuild, no type check);
    two in `src/as3/index.ts` (Vector typing) are old. Check with
    `npx tsc --noEmit -p . | grep -E "src/(player|flash|as3)"`.
11. Pre-existing AS3 compile error `CreepType.as(55)` (upstream) — ignore; see §9.
12. **Not yet played in a real attack**: the Sulfur shield and the timed Candy Jars (tested on a wild
    monster, a Quake tower off the map and a jar driven by the test, and by the numbers). Marilyn's title fixed in the popup only.
13. **Spawn rules** are often not all met with the default numbers (about 1 in 5 new players falls back to
    any free land, mostly because of the 15-cell Moloch distance). Told the user; `spawn.awayFromMoloch`.
14. **Closing the chat breaks clicks on buildings** (player report): not reproduced; asked which device,
    which button, and what happens.
15. **Attack loot is what the attacking game says** (`attackLootHandler`, no cap): an attacker's own changed
    game could claim any loot. Capping it needs the server to work out loot itself. Pre-existing; not done.
16. **Performance not done yet** (review of 25 September): the map's getarea polling could share a
    per-zone cache; chat could long-poll; `getFlags()` rebuilds its static part on every poll; the auth
    middleware loads the whole user row; the bug-report upsert takes three queries. See
    INFERNO-ONLY-NOTES "Bug reports and review, 25 September (second round)" for what was done.
17. **Brimstone Pit, still to do**: chat
    announcements, sounds; levels 2-5 of the building still use the level 1 art.
18. **Balance pass (30 September, INFERNO-ONLY-NOTES "Balance pass")**: the user's Rezghul (200 housing,
    raised at 75% / champions 25%), Quake (down to a fifth at the edge) and Ashkarr (no damage change) choices
    were not played in battles; an army of Zagnoid alone still clears an Under Hall 1 yard. The wild tribes,
    Moloch's descent and the Gauntlet use the same towers: their Under Hall 1-3 yards are now harder, so check
    them. The test scripts with updated numbers have been run since (1 October): they pass.

19. **AI tester's list (3 October), not done:**
    - A1, browser bold: Flash renders some `<b>` embedded-Verdana text regular. The rule is unknown; it needs
      a Flash side-by-side of one window.
    - A3 DM Send twice; A5/A6 fullscreen and zoom-out band (Flash); A7 login elsewhere (browser); A8 number
      spacing; A9 tooltip placement.
    - B5 the Gauntlet's single rate; B8 magma over capacity; B9 the first Attack click (not reproduced).
    - B10 the stale popup; B13 Jump; B20 the mail badge; B21 the level-up twice; B22 the shiny count.
20. **Attack logs**: Moloch's Gauntlet and admin practice attacks are not logged. Logs from before the
    migration have no baseid, damage or report.

## 9. Testing (sandbox recipe)

Linux sandbox with PostgreSQL 16 + Redis (apt), Bun, Playwright + Chromium
(`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), `tsx`. Helpers in `sandbox-tools/` (edit the
paths inside): `ioenv.sh` (DB `bymio`, Redis db 1, port 3001, `ENV=local`), `io-up.sh` (starts Postgres,
Redis and the server if down), `killport.sh <pattern>` (never `pkill -f`: it kills your own shell).

- **Server typecheck:** in `server/`, `npm install --ignore-scripts` then `npx tsc --noEmit` (must pass).
- **Server run:** `cd server && bun install && . ioenv.sh && bun run db:init` (schema + all migrations),
  then `bun src/server.ts`. Test account: `POST /api/v1.7.3-beta/player/register` with `IoTester` /
  `io@example.com` / `Hunter22!x` (usernames ≤ 12 chars).
- **AS3 compile check:** Apache Royale via npm (`@apache-royale/royale-js`):
  `java -jar <royale>/royale-asjs/lib/compiler-mxmlc.jar -load-config=<empty royale-config xml>
  -external-library-path+=playerglobal.swc -source-path+=client/scripts
  -define=CONFIG::SERVER_URL,"'x'" -define=CONFIG::CDN_URL,"'x'" -target-player=11.0 -swf-version=13
  -strict=true -warnings=false -output=/tmp/mod.swf client/scripts/GAME.as`.
  The one expected error is `CreepType.as(55): A conflict exists with inherited definition id`; any other
  is new. Because of it no SWF is written; to check `[Embed]` art, compile a tiny test SWF. The launcher
  compiles on its own with `asconfig.launcher.json`. (The browser converter is a second, faster check:
  `cd client-web && npm run convert` must report 0 failures.)
- **Browser client for local testing:** `cd client-web && npm install && npm run convert && npm run assets
  && SERVER_URL=http://localhost:3001/ CDN_URL=http://localhost:3001/ npx tsx tools/build.ts && npm run
  publish -- --root`, then restart the server once (new `public/web`).
- Test env: `PLAYWRIGHT_PATH=…/node_modules/playwright CHROMIUM_PATH=…/chrome EMAIL=io@example.com
  PASSWORD='Hunter22!x'`; add `PAGE=http://localhost:3001/ SHELL=1` to go through the site root.

| Script (`client-web/tools/test/`) | Checks |
|---|---|
| `base.mjs [secs] [w] [h]` | token login; env `PAGE`, `STEPS` ("c:x,y w:ms s:name k:Key m:x,y"), `CLICKS`, `PRE_EVAL`, `EVAL`, `OUT`, `DPR`, `CHROME_ARGS`, `INIT_SCRIPT`; adds `shell=0` unless `SHELL=1` |
| `move-test.mjs` | moving a building in the yard (16 checks): shadows drawn, hidden while a building is held or placed and back after; drawn see-through without the alpha-mask copy, nothing worked out again while held still, the footprint red over a building / green on free ground where it is now, put down on a building goes back, on free ground stays, follows a scrolled view, the screen matches a full redraw while moving; puts the building back, nothing saved |
| `move-perf.mjs [secs]` | frame rate and CPU profile of an idle yard, the pointer moving, dragging a building in move mode and placing a new one, on a yard with 220 extra walls; env `CPU_SLOWDOWN` (4), `WALLS`, `ONLY`, `TOP`, `INCLUSIVE` (time inside each game function), `MIN_FPS` (prints checks), `FLAGS` (override server flags, e.g. `io_moveshadows=1,io_fullredraw=1` for the old drawing: whole yard every frame, shadows while moving); places whichever building type the yard can still build; puts the dragged building back |
| `partial-redraw-test.mjs` | the yard drawn again only where it changed, compared pixel for pixel with drawing it whole in the same frame (21 checks): idle, hovering, a building dragged over others and put down, placing and cancelling, scrolling, zooming, shadows switched off and on, a wild attack; plus the screen against a full repaint. Run it after any change to `Renderer.as`, `BitmapData.ts` or `core.ts` |
| `partial-redraw-hunt.mjs` | plays the game under `redraw-watch.mjs` (every frame drawn in parts compared with the same frame drawn whole, and the screen with a full repaint; what is drawn where they differ is printed): the own yard (menus, moving, placing, a wild attack under a Sulfur Bomb, a jarred tower) and an attack on a tribe yard in admin test mode (turned on and off by the test; the account must be an admin) with the Catapult menu, three shots and a battle. `ONLY=yard` or `attack`. Screen differences seen on one check only are "passing" (the pointer changed something between frames) |
| `redraw-watch.mjs` | not a test: the per-frame watch, to import into any test (`installWatch`, `watchLabel`, `watchTake`, `summarize`) |
| `redraw-test.mjs` | 16-step scenario, each compared with a full redraw (all must be `ok`; up to 4 differing pixels count as the same, from a text field clipped on a half pixel; `PAGE=http://localhost:3001/` to use the game server instead of the dev server on 8080) |
| `attack-perf.mjs <monsters> [secs]` | tribe-yard attack, spawns monsters, fps + CPU profile |
| `fps-survey.mjs [secs]` | not pass/fail: the frame rate everywhere demanding, one table (EMAIL3 a big yard with a Pit and replays, EMAIL4 a player with an outpost; `REPLAY=key`). Covers: the yard filled to its limits (idle, pointer, drag, 40 warts), the Yard Planner (idle, drag, moving 80 walls), the ICS, the quest book, global and alliance chat, the alliance window, the Pit (lobby, Magma Drop, slots, derby, ascent, bone pile), an HFO wave 13, a replay (1x, 4x), the Map Room (idle, drag, clicks), attacks with 160 and 500 monsters plus catapult shots, and a filled outpost. Env: `ONLY`, `CPU_SLOWDOWN` (4; use 1 in the sandbox), `PROFILE=0` (the profiler slows frames: measure with 0, profile with 1), `COUNT=1` (canvas calls a frame), `FILL=0`, `QUERY` (e.g. `&interp=2`), `TOP`/`INCL`/`NATIVE` (profile lines: self, game inclusive, canvas calls by caller), `SURVEY_OUT` |
| `depths-test.mjs` | the Depths of Hell (12 checks; EMAIL3 a player on the map, with a portal out of its range): the snapshot's portals; purple dots on the minimap and world map (pixels); legend, hover, a click going down; the names; an out-of-range portal entered to look; the island's edge (the lava sea at the island's level); the coordinates (0-399 above, 0-9 below) |
| `speedups-walls-test.mjs` | building speed-up prices (free with 10 minutes or less, 1-9 Shiny under an hour), Close Enough finishing with no purchase, hatching unchanged, main yard wall limits by Under Hall, truces gone (11 checks) |
| `changelog-test.mjs` | the Changelog: the server's file (days, items, Hell Freezes Over only classified, 4 and 5 October's changes), the top bar button and tip, the shortcut bars (order, names, bars like the Shiny counter; Alliances opens its window; badges on a phone), the window (days, headings, count), a day button, the wheel, Close (14 checks) |
| `magma-alliance-test.mjs` | EMAIL3 (or EMAIL) an alliance member with an Under Hall 6 yard (show@example.com), TARGET without an alliance: Magma Towers 0/0/0/1/2/2/4 on the main yard and 4 on outposts, the yard's count; the Alliances window opened by the top bar 4 times (Overview drawn and lit each time, also after another tab) and twice without an alliance (Browse) (9 checks) |
| `casino-oct5-server-test.mjs` | TARGET a player (named `admintester`, an admin, for the test), EMAIL2 another: Korath's Fortune checked line by line, the shared pool, the Favor once a day, the Live feed without admins, the Derby's bettors and totals (17 checks) |
| `casino-oct5-test.mjs` | EMAIL2 a player: the 8 tiles, FREE SPIN and its countdown, the Live tab, Fortune's STOP and lines, AUTO, close calls, a big win, the Ascent's sky and turret, the Derby's bettors (20 checks) |
| `admin-delete-test.mjs` | EMAIL an admin (ADMIN_NAME): deleting accounts from the panel: refusals, an alliance leader and everything of theirs, a lone member's alliance, the card in the page (11 checks; deletes 3 test players) |
| `kit-instant-test.mjs` | EMAIL a player with an outpost (underworld DB): a kit bought with resources is built at once at its levels (5 checks) |
| `outpost-workers-test.mjs` | EMAIL a player with an outpost (underworld DB), EMAIL3 one with a Brimstone Pit: an outpost's 2 workers and their save, the map's idle markers (2 stacked / 1 / 0, an older save), the info panel on every cell of the world and the Depths (#68), a speed-up with no building (#65), a refused attack through the game (#66), 30 and 60 Magma Drop bets at once (#63) (14 checks) |
| `interp-test.mjs` | frame interpolation (11 checks): off by default; interp=2 gives three drawings a game frame at 40 fps; in-between positions of a moved square (10 px steps for 30) while the game sees only its own; no slide across a 600 px jump; a yard monster drawn part of the way and back after; under 6x CPU load made-up frames left out and the game not slowed; the page setting |
| `profile.mjs` | CPU profile of any screen |
| `mobile-test.mjs "<device>"` | phone layout, tap OK, text focus (pinch → wheel is 0 once IoPinchZoom is active) |
| `sound-test.mjs` | embedded click sound loads; a missing sound doesn't use up the 32 channels; switched-off music stays off when it loops |
| `planner-test.mjs` | Yard Planner with 220 walls added in the page: yard not drawn behind it, group moves, quick overlap check = full check, drag fps at 1/4 CPU (the fps depends on the machine: compare with the previous build on the same machine before calling it a regression) |
| `planner-tools-test.mjs` | (the test yard's Under Hall overlaps the two buildings it flips, which made the flip "not fit": since 1 October it moves the Under Hall clear on the plan first) Yard Planner toolbar: flip only the selection, Store asks first and stores the selection, undo / redo, a new change drops redo |
| `catapult-test.mjs` | instant upgrade asks before spending shiny (No spends nothing), Strongbox pages 4-5 and level 5, Catapult ammunition from the server (jars in seconds, the Sulfur Bomb's armour), the Sulfur shield's red / orange / yellow phases on a wild monster, the Marilyn title on one line |
| `fusebug-emberghoul-test.mjs` | the Fusebug (IC15) and the Emberghoul (IC20), and the new monsters' standing frames (18 checks; `psql`, `bun`, `SERVER_DIR`; a Magma Tower added to the test yard in the database and the Under Hall made level 6, both put back; a wild attack, the yard not saved): Strongbox pages 1 and 4, costs, housing, targets; words, the Fusebug's attack-log line; the words also from an old language file without them, and the file fetched fresh; the Academy and test mode; the Hatchery's numbers (15 the Fusebug, 19 still Rezghul); pictures (and Ashkarr's unlock picture); the server's stats; Emberghouls at levels 1 and 6 (health, 15% / 20% heal, their own canvas); heal per hit, capped; a real fight healing about 20% of what the Under Hall loses, its attack rows; a Fusebug from the edge of the tower's footprint creeping in (walking) to within 12 of its middle and blowing up for nearly its whole blast; standing frames (attack rows / row 0 at the target, walking only when moving, standing when held; the shimmer left alone); Korath and Ashkarr standing when held |
| `new-towers-test.mjs` | the Cinder Coil and the Obsidian Mortar (22 checks; the test yard's Under Hall made level 6 and the two towers added in the database, both put back after; a wild attack, the yard not saved): classes, art, stats, build menu; a Coil shot's cycle (0.5 s spin speeding up with the charge frames, 0.25 s smooth aim ending on the target, the shock from the prong facing it, 0.25 s rest, again every 80 steps; never a jump, a turn back or a speed-up) and its arc (520 then 20% less for each of 6 leaps down a line of Spurtz); the Mortar's dead zone, its shell (not homing; lobbed 0.6 to 1 s, even across the ground, a parabola, the shadow shrinking, turning once) and the splash falling from 1,100 to half at the edge; a shell lands after the Mortar falls; damaged strips |
| `new-monsters-test.mjs` | Clinkerjaw and Flickerfiend (28 checks; `SERVER_DIR` for the server's table, run with bun; a wild attack, the yard not saved): the Strongbox pages, names, costs, housing, the Academy's pages, the pictures served; the server's stats the client's; their sprites drawn; a Clinkerjaw splitting into 2 small Spurtz (their 3/4 sheet, 3/4 speed, a Spurtz's other stats) and its pool of magma (100 to a hurt monster beside it, once; none to one further off; gone after 6 s); a Flickerfiend does not set a trap off, the blast still catches it; its blink on its third strike (untargetable, unhurt, 0.4 s fading out through its four shimmer frames, gone for a full second = 80 steps, 0.3 s back, beside another building up to 400 away, then on to it) |
| `inferno-building-art-test.mjs` | the Inferno art of the General Store, Hatchery Control Center, Flinger, Catapult, Map Room, Monster Juicer and Yard Planner, and the damaged / destroyed pictures that were missing (Bone Cruncher and Coal Extractor from level 3, the Magma Tower's damaged turret and base strips), and the four resource generators at levels 1, 3, 6 and 10 (each band from its own strip, every picture of the generator pack served, the Bone Cruncher's made shadows) (14 checks; the twelve added to the test yard in the database and the Under Hall made level 6, all put back after; the yard not saved): each draws from its `buildings/i...` folder at every level, whole, damaged and destroyed; every picture served, none of the overworld's asked for; the Juicer's 51-frame strip; writes SHOTS/art-<folder>.png to look at |
| `designer-recycle-test.mjs` | recycling in outposts is the Designer's only, and bug reports #42/#43/#47 (10 checks; `EMAIL` an admin with an outpost, `EMAIL2` another player whose yard gets a Map Room under construction for the test, taken out after; the kit draft reset): of two loads in flight only the latest builds; a replaced map ground and a stray Scroll let go, nothing throws; viewing a yard with a Map Room being built; a player's outpost refuses Recycle, a kit draft asks and recycles, stops construction, the hall still refuses |
| `menu-art-test.mjs` | the changes of 29 September, afternoon (21 checks; `SERVER_DIR`; a General Store, Incubation Control Station and Juicer added to the test yard at Under Hall 6 and taken out after, the yard's monsters and resources put back): new portraits served; the rename; the chat at its newest line and its tabs' font; Rezghul's place; the Incubation Control Station four across; juicing an Inferno monster (it goes, magma comes) and the juicer's art; the build menu's live art (overworld pictures gone, turning towers follow the mouse, the Quake's drop and rest, one scale, generators animate, the building window); the tribes' large pictures; the outpost hall's animation; the kit table's eleven rows; layered shapes; the kit pictures drawn again |
| `locks-test.mjs` | the changes of 29 September, evening (12 checks; `SERVER_DIR`; an Incubator, Compound, Academy, Strongbox, Incubation Control Station and Map Room added to the test yard and taken out after): padlocks in the Incubator, Incubation Control Station, Compound, Academy and Strongbox; the gold padlock served with the asset version; Magma wording in the ICS and Juicer; Rezghul's Academy place; the new portraits asked for with `v=8`; the map cell panel's tribe picture from the 150-high picture; no page errors |
| `missing-assets-test.mjs` | the missing-assets and Juicer v2 packs (9 checks; `SERVER_DIR`, optional `PACK` = the unzipped missing-assets pack to compare files; a Monster Locker and Juicer added to the test yard and taken out after, the Under Hall made level 1 in the game only for the build menu): every pack file served; every Inferno quest picture there; the kit pictures drawn again; `v=9`; the locker and juicer drawn whole, damaged and destroyed (screenshots `missing-locker-*`, `missing-juicer-*`); locked buildings show their silhouette pictures; no missing picture; no page errors |
| `remade-assets-test.mjs` | the missing assets made (10 checks; `SERVER_DIR`; two Academies, levels 1 and 2, and a Magma Tower added to the test yard and taken out after): every quest-list icon there at 40 x 32; every file the Inferno's buildings name there; Rezghul's projectile; the quest list's icons load; the Academy animates while training and has its damaged and destroyed shadows at both levels (screenshots `remade-*`); the Magma Tower's destroyed shadow; a yard with no tribe id is Moloch's; no missing picture; no page errors |
| `ui-fixes-test.mjs` | the fixes of 27 September (22 checks; a wild attack, the yard not saved): the register warning and its pulsing glow; the Gauntlet button under the fifth worker and its tip; the Under Hall's hit area from its art (its roof clicks, the ground above it does not), its white glow under the mouse only, the hit clips in drawing order; Balthazar and traps, Quake towers; a Sulfur Bomb on a burrowed Valgos |
| `sulfur-jars-test.mjs` | the Sulfur Bomb and Candy Jars (22 checks; a Quake blow under a 50% shield takes half of the whole blow and kills a monster that has lost health; every kind of tower, jarred, shoots its glass and no monster (the blast tower fired through), unjarred shoots; launches a wild attack of Zagnoids, the yard not saved): a Zagnoid on its last hit points under the shield dies to a Quake tower (it used to stay on 1), hits below a point add up, 0/4/8/12 s invulnerable then 40/55/70/85% fading, the Medium bomb's shield, a timed jar that holds under fire, cracks at half and a quarter left, shakes, breaks on time |
| `alliance-chat-test.mjs` | two players (`EMAIL`, `EMAIL2`, same `PASSWORD`) in one alliance (`ALLIANCE_ID`, `ALLIANCE_NAME`): chat tabs and counts, name click opens a message, Browse -> Actions -> Members, daily popup rows, invite text. Setup: register the second account, create the alliance with the first (`/alliance/createalliance`), set the second's `alliance_id` in `bym.user` and restart the server (the server caches users) |
| `background-test.mjs [secs]` | the game keeps full speed in a hidden tab (clock, 40 fps, nothing drawn), no catch-up rush when it comes back. Drives Chromium directly over DevTools under `xvfb-run -a` with intensive throttling after 10 s (Playwright keeps pages visible and turns throttling off) |
| `wild-attack-test.mjs` | (clicks through the popups at login first: the damaged-buildings popup blocked the planner) wild tribe attacks: settings and last-attack flag, tribe roll (Moloch ~5%), level bands, a forced attack brings the configured monsters (its warning opens with four or five kinds: strongest three, "+N more") at the configured level and full health, 23 hours until the next, an attack on another yard drops a planned one, swarm formation sends exact numbers, nothing in the first minute after login, main yard only |
| `bug-context-test.mjs` | bug reports of 26 September and what a report says (19 checks; needs `psql` and `PGPASSWORD`; removes the reports it makes): "Ascend monsters" not offered on an inferno-only yard and `infernomonsters` answering (no 500), an outdated client's `/init` answer not a report, a monster cleared twice, the map tutorial's late picture, clicks / popups / messages / yards / requests noted, a server 500's report with the account, client and request values and the game's side added (one report), a game error's report, the game in a browser with only webkitAudioContext and with no Web Audio |
| `bug-reports-test.mjs` | fixes from the Bugs tab: login with a mistyped email or short password says the credentials are wrong (not 500), register says what is wrong, a bunker being built looks for targets safely, HTTP status lines carry the path, the negative-resources line says what the server sent, the server keeps 0 instead of a negative amount (puts the bone back) |
| `gauntlet-test.mjs` | Moloch's Gauntlet (59 checks, catapult spending included; `psql`, `PGPASSWORD`, `ADMIN_NAME`; opens and closes the event from the admin panel and leaves it on the calendar, gives the account's credits, resources and monsters back): closed refuses, the 13 stages and their rewards, only the current stage, a win at 90% pays once, three failures heal the yard and lose that reward for good, an attack left early counts, another player's stage refused, paid once (the last save five times at once, sent again, a beaten stage attacked or opened in another mode, a save from another attack, an attack left at 95% settled by several requests at once, an admin's Start again), "Close now" ends on the 1st, clearing tribe yards leaves them, the new month's ladder (paying again); admin test mode's test ladder (always open, played for real, pays nothing, the real ladder untouched and not playable, gone when test mode goes off); in the browser the button (shown on the main yard, and while closed only "starts in ..."), The Descent window (the legend, the gates beaten / lost / sealed, the gate to fight with its prize and attempts), an attack with the destruction bar, the end popup and the result at home |
| `relocate-test.mjs` | Relocate in the map room (22 checks; `psql`, `PGPASSWORD`; `EMAIL` an admin with an outpost, not relocated; registers one account, gives it outposts in the database, relocates it twice, removes it): refused while attacked, in test mode, twice at once; a new place by the spawn rules, one home cell, resources 0 with storage kept, every outpost gone and its place wild again, the world's player count kept; in the browser the button under Home and Jump, its warning (resources and the number of outposts), closing it changes nothing, relocating from the game says where and starts again there with nothing in store |
| `champion-lock-test.mjs` | Korath, Drull and Rezghul: marking one unlocked without the Strongbox is refused, an unlock started and finished is kept with its Academy level, an instant unlock bought with shiny is kept (spends 5 shiny; needs two of the three still locked; takes its unlocks back) |
| `admin-test-mode-test.mjs` | admin test mode (needs an admin with a Compound and an outpost; `ADMIN_NAME` = its username): the switch and banner, unlimited resources and shiny, building limits, instant build and upgrade, every monster, the test tools (defenders, wild attack now, attackers, repair, protection, fast-forward, take a cell, make it wild), practice attacks write nothing, leaderboards leave the admin out, switching off puts everything back, a stale game cannot save over it, Switch account and a new login switch it off |
| `ashkarr-test.mjs` | Ashkarr (26 checks; `bun`, `SERVER_DIR`; a wild attack on the yard, not saved; one Ashkarr put in the Compound, not saved): Strongbox page 5, unlock and Academy as Korath's and Drull's (each champion's Academy table divided once), Korath and Drull hatched and healed for her magma, 600 housing; the three's health per level and Korath's and Drull's art (levels 4, 4, 5, 5, 6, 6), Academy to level 6, words and pictures; the server's stats and unlock guard; 600 of the Compound's room; two Ashkarrs (levels 1 and 6) drawn from her sheet with the right column and row; a roar boosts her side within 300 (not herself or further off), two never stack (x1.35, not 1.20 x 1.35), the weaker takes over when the stronger runs out, then nothing; back to back (10 s after a roar still on, renewed for 11 s); roots the other side 7 s (attacks untouched); the pink boost glow and faint white root glow, each gone with its effect; multiplies with Enrage; left to the game they roar every 10 s and nothing ever goes over x1.35 |
| `warts-test.mjs` | the warts (11 checks; saving blocked; one golden pick paid): all six drawn from the embedded art at their frame's size and offset, shadows MULTIPLY; the art loads; named "Wart" with the `7_inferno.png` thumbnail (served); a worker says a wart line; a golden wart's popup, words and `goldwart.png`; the spawn picks the sixth; new warts grow on the yard or up to 200 past its edge (the stock game's), never further; a wild monster yard grows none; no page errors |
| `hfo-flow-test.mjs` | Hell Freezes Over's server rules without a browser (53 checks; `psql`, `PGPASSWORD`, `ADMIN_NAME`; puts the account's locker, academy, credits and progress back): the switch; each of the 16 Strongbox monsters needed, one unlocking isn't enough; champions at Academy level 1 are fine; not from an outpost, the poll or test mode; once; each day's time (1, 2, 3 days) and tasks, one day a load however long away; 6 / +1 per 2 h / 12 small patches, 5 big; a line per clear / try / tower, every line heard; a try counted once; towers registered once, the last opening the waves, none at all opening them at once; only the current or a skipped wave; tries, pay once (5, 155), skips, replays for nothing, stale ends, an abandoned fight lost; Rimegrave refused until all 13 are won, kept after |
| `hfo-lists-test.mjs` | where Rimegrave and the ice cretins show (18 checks; adds a Strongbox, Academy, Incubator and Incubation Control Station to the test yard and takes them out): the cretins never in the Strongbox (5 pages), Compound, Incubator, ICS or Academy, also in test mode; Rimegrave in none before or during the event and his unlock refused; after: on page 5 after Ashkarr and in every window, unlock started and finished (kept by the server), Academy training, the Incubator making him |
| `hfo-test.mjs` | Hell Freezes Over (37 checks; `psql`, `PGPASSWORD`, `ADMIN_NAME`; adds cannons for Day 3 (the test yard has none) and puts the account's locker, academy, credits, buildings and event progress back): off by default; qualifying (every monster and a page-5 champion at Academy level 2); Day 1's patches kept by the server and a worker's line; Day 2's try counted once; Day 3's towers sealed, frozen ground, counter and button, the last tower's popup; wave 1 won and paid once; wave 2 skipped after three surrenders and replayed for nothing; every cretin drawn; the ice powers; the Hulk's split; the window's 13 waves; Rimegrave refused by the game and the server, the reveal once, then his unlock; drawn at levels 1 and 6; admin Reset, Start now, Next day; off keeps a started player going; admin test mode offers Rimegrave and the cretins; no page errors |
| `yard-grounds-test.mjs` | yard grounds by cell height (5 checks; needs an outpost; nothing saved): main yard lava; an outpost on its cell's ground; all eight grounds build a 1000 x 500 tile and draw; a wild monster yard (viewed from the map) on its cell's ground; no page errors |
| `invites-admin-test.mjs` | the admin panel's Friends invited card (16 checks; `psql`, `PGPASSWORD`, `ADMIN_NAME`; registers two accounts, which stay; the inviter's 250 shiny is taken back): friends who register through the link are listed at once as not loaded yet; after their first load one connection is kept as same-ip and another as paid (+250 to the inviter); joined dates; the friend's card names the inviter; the card in the page; the player list's invites accepted and paid, sorted both ways in the page; barring from invite rewards needs a reason, a friend joining while barred is kept as barred with nothing paid to either side, the card shows it, lifting it clears it; no page errors |
| `locker-academy-test.mjs` | Strongbox and Academy busy rules (24 checks; saving blocked, purchases only counted; puts a Strongbox and an Academy in the yard if it has none): Rezghul's unlock counts (animation, second unlock refused, no upgrade, not even instant, it finishes); an instant unlock leaves a running unlock running and is paid once if clicked twice; no unlock while the Strongbox upgrades; one training at a time; the Academy animates and can't be upgraded while training; a lost busy mark comes back; a cancel answered twice refunds once; Speed Up never on a finished training; instant training clicked twice trains one level, paid once; no training while the Academy upgrades; two Academies train two monsters, a third refused in either, each refuses its upgrade only while it trains, a lost mark returns to its own Academy; no page errors |
| `languages-test.mjs` | the game's texts (no server, no browser; run from client-web): French, Spanish and Portuguese have every key `english.json` has, keep its `#v1#`-style places, leave nothing empty; bold and font tags closed in all four; every plain `KEYS.Get("...")` key is in `english.json` or `KEYS.IO_FALLBACK` (three overworld-only keys excepted) |
| `planner-walls-test.mjs` | the Yard Planner's wall line (9 checks; saving blocked; puts 60 walls in the test yard in the game only and stores them in the planner): lines straight, sloped, upright, partly blocked and running storage out each place as many walls as they say, storage gives up exactly those, nothing left on the mouse, the storage list's count; every wall its own, none on another's spot, drawn where its data says and the same when drawn again; a wall placed by hand afterwards; no page errors |
| `bugs-oct1-test.mjs` | bug reports #49-#59 (10 checks; the account needs an outpost; saving blocked until the last step): getarea outside the world answered with no cells (both sides), `/init` with no answer twice then tried again, one login for two at once, the main yard after an outpost with no yard kind given is a main yard (no "outpost w TH" stop), an `ibuild` load goes home, a splat with the yard's layers gone, a request with no answer written as "log", the map (opened from an outpost) asks for no zone outside the world, no page errors |
| `designer-test.mjs` | the Designer (37 checks; `psql`, `PGPASSWORD`, `bun`, `SERVER_DIR`; `EMAIL` an admin, `EMAIL2` not; backs up the kit files and puts them back, and resets the layouts it changed): the list (6 kits, 19 tribe levels, 13 Moloch bases), refused to others, the button and window, a tribe level opened as a draft (2400 across, 8 Magma Towers past any limit and outside the normal edge, built and upgraded at once), the Monsters window (every Inferno monster, count, level, room; ten level 6 Fusebugs applied to the draft's Compounds, stored with the layout, in a fresh yard; the server takes Inferno monsters at levels 1-6 only; none for a kit; Reset puts the stock monsters back), Save and Make again on a stored yard, the stored layout clean, fresh cells made from it (another level not), a Moloch base and a stronghold made from it, a kit as an outpost (edge and limits hold), kit Save writes the file and pictures (name and price kept), kit Reset, drafts refused to others and in view or attack, Exit home with the drafts gone, the admin's account untouched, a tribe Reset back to stock |
| `admin-security-test.mjs` | server only (no browser; `psql`, `bun`, the server's database settings in the environment; `ADMIN_NAME` with a capital in it, and "admintester" in the config's admins but not registered): admin names can't be registered or renamed to in any capitals, the admin's name in other capitals is not an admin, `admin:claim` (exact name only, not over another account) makes an account an admin, one-time sign-in codes, the session cookie's flags, the panel's headers and content policy, the API's X-Admin header and session, "constructor" and friends are not tools (24 checks; registers one account and removes it) |
| `server-fixes-test.mjs` | server only (no browser; uses `psql`, so a local test database; `ADMIN_NAME`, `PGPASSWORD`): an attack on a wild monster yard last attacked long ago survives the attacker's own poll and saves (bug #27), small poll and save replies, odd save fields (building health sent as the text "undefined" not stored, the next save a second on still works), a reset yard answers 409, out of range answers 403 and writes nothing, another player's yard refuses a stranger's attack save, a 500 lands in the Bugs tab, an admin's name in other capitals can't be registered, two test-mode switch-ons / switch-offs at once |
| `leaderboards-test.mjs` | The leaderboards (EMAIL an admin, EMAIL2 a player in an alliance with Pit bets; the admin needs an outpost): button spot and the Admin buttons after it, one request per 5 minutes, sorts and ties, outposts and empire value against the database, gamblers against the ledger, no admins, alliance members, world filter, Find me, Jump (Map Room message; map centred on the yard), map snapshot `nextAt` |
| `whats-different-test.mjs` | The login page's "What's different?" button opens the overview PDF in a new page (no account needed) |
| `quest-server-test.mjs` | The quest book's server rules (EMAIL in an alliance it leads, EMAIL2 another player; `PGPASSWORD`, starts EMAIL's book again): the book's shape, locked quests, four claims at once paid once, reports held to their most / rate / best so far, letters, pins and the board counted, daily quests (only ones the yard can do, the same all day) and the bonus, the optional list |
| `ui-visual-test.mjs` | The UI sweep's fixes (EMAIL in an alliance): in English, French, Spanish and Portuguese the Quest Book, leaderboards, alliance Members, Compound, Yard Planner and mailbox with every text fitting and no raw keys; mailbox headings; the Compound at 0 / 0; the top bar's counters; Invite a friend; the Pit's Ascent label; the alliance window on a 1024 x 640 screen |
| `bugs-oct3-test.mjs` | Bug reports #60/#61 (EMAIL with a bunker or tower, best a full yard; `PGPASSWORD`; marks one quest done for a moment and puts it back): no made-up property by name on a sealed class anywhere in the AS3 (Flash Player's Error #1056), the bug report's times with Flash Player's date form, range rings drawn in the yard and nothing when the yard has gone, a ready quest drawn on a MovieClip |
| `quest-book-test.mjs` | The quest book in the game (EMAIL as above; `PGPASSWORD`): the dock and badge, the window and a tree, Collect paying the yard shown, daily quests, dragging, Collect all down a tree and its chest, Hide finished, reported events and a real wart pick counted, the notice, the old list, Go there |
| `alliance-board-test.mjs` | The redesigned Alliances window (EMAIL leads the alliance, EMAIL2 a member of it; migration 20261006): header and tabs per role, Members sort and Make officer, Board (pin typed in, chat line, count, Edit / Down / Remove, Jump), the map's Pin button, Outposts filters and loading more, Leave and rejoin by invite. Run it after another test (e.g. outposts-test) on a fresh restore: straight after the server starts, members' empire values are not filled in yet and the Members sort check fails |
| `chat-mod-test.mjs` | Chat moderation (EMAIL an admin, EMAIL2 a player; the `chat_mod` column migrated): badges, the staff menu, Delete line (screens, history, admin log), Mute / Unmute, the panel's moderator switch live, what a moderator may not do |
| `chat-test.mjs` | The chat dock with two players in one alliance (EMAIL an admin: it announces from the panel). Covers: the box emptied after a line, markup shown as text, how long ago, mentions and the @ count, the name menu (find, jump), commands, ignoring kept after a reload and undone from /list, the flood limit, mute, a lost session (Alliance rejoined, lines resent, typing kept), joins not doubling history, alliance leave / join while playing, announcements, the 200-character growing box, wheel and reading back |
| `map-snapshot-test.mjs` | Map Room 2 world snapshot and world map (needs an outpost to open the map from, and other players on the world): the map is drawn from the snapshot before getarea answers (getarea slowed to 3 s) and the snapshot says what getarea says about every cell on screen, a click on a snapshot-only yard waits for its zone, getarea only for the zones on screen and all of them in one request, the world map's dots, hover and click, pinch in and out through the zoom steps, no second request before the server's next snapshot (5-minute clock), then one without the layers, a failed getarea (connection dropped) asked for again |
| `map-ui-test.mjs` | the map room window (needs an outpost, other players on the world, the chat server, `PGPASSWORD` for the database and `redis-cli` (its chat lines are taken out of the global history again); leaves the account's bookmarks empty and its flinger levels as they were): the layout (the Filters and zoom buttons left of full screen with the yard's -/+ art, the right panel as big as the sidebar with the minimap and the cell information, Home and Jump in the middle above the search), the cell information on the map and on the world map, the pointer's coordinates, the wheel through all five steps towards the pointer, the + button, dragging the world map (to its edges), the minimap, the Hostile filter, your flinger range, bookmarks past eight (one added from an empty place's Bookmark with the usual popup, two-line rows, scrolling, renamed, removed) and what the server stores and refuses, Find a player (list, Enter goes there, nothing found, Escape), the Alliance tab (no outposts), sharing a lava cell to Global chat after typed text and opening it again from the chat's pill, a yard popup's Share button, pinch |
| `outposts-test.mjs` | the Outposts list (needs an account with at least two Map Room 2 outposts): one row per outpost, short numbers, protection time, sorting by each column and reversing, with more than ten outposts the wheel and the scroll bar, View opens that outpost, the list inside it says Here, Map opens the map on another row |
| `popups-test.mjs` | the idle and stop popups (22 checks, reloads the game five times): the 6-minute Invite Friends popup and its button opening the top bar's invite popup (link, Copy invite, close), no Send FREE Gifts popup even with gifting on, "Anyone home?" and Connection Lost once each with a working Reload, an orange-bar error and a new version with Reload, closing a popup on a stopped game reloads |
| `stops-test.mjs "<device>"` | full screen without the API, message window in full screen, away-too-long and logged-out stops and their Reload buttons (13 checks) |
| `pinch-zoom-test.mjs "<device>"` | the game's pinch zoom: TOUCH_POINT, one zoom step per pinch, no wheel events |
| `touch-modes-test.mjs` | NONE / TOUCH_POINT / GESTURE modes |
| `keyboard-test.mjs` | on-screen keyboard focus, typing, Done-blur |

Coordinates at 1280×800 with `shell=0` (yard): welcome popup close ≈ (857,242); Map (1232,565); map intro
close (832,127); map zoom (494,103); tribe cell (737,207) → View (733,408), Attack (733,448); daily reward
(38,313). Bundled class names are mangled: don't match `constructor.name`; use `__game.<ClassName>`.

Browser console diagnostics: `__player.stats`, `__player.debug` (`noFilters`, `noText`, `noBitmaps`,
`noCache`), `__player.verifyRedraw()`, `__player.applySettings({...})`, `__game.<ClassName>`,
`__classByName("flash.display::MovieClip")`. FPS snippet for the user:
```
s=__player.stats;s.frames=s.scriptMs=s.renderMs=0;await new Promise(r=>setTimeout(r,5000));c=document.querySelector("canvas");`${(s.frames/5).toFixed(1)} fps, script ${(s.scriptMs/s.frames).toFixed(1)} ms, render ${(s.renderMs/s.frames).toFixed(1)} ms, window ${innerWidth}x${innerHeight}, canvas ${c.width}x${c.height}, scale ${__player.adaptive.scale.toFixed(2)}`
```

## 10. Working procedure

1. Reproduce (test script, measurement, or bug report in the admin Bugs tab) → root cause.
2. Fix in the right layer: server, AS3 (the user's code: say so), converter or runtime.
3. Check: server `tsc`, AS3 compile, `npm run convert` (0 failures) + build, run the server, relevant
   Playwright tests (`redraw-test` and `partial-redraw-test` after rendering changes, phone tests after input/shell changes).
4. Update the docs in §3.
5. Deliver a zip (top folder `@bymr-inferno-mr2`) of files changed since the baseline, excluding
   `node_modules`, `dist`, `server/public/web*`; include regenerated `client-web/src/game` and
   `client-web/public` when they changed.

## 11. How this project was combined (2026-09-24)

From `bymr-inferno-mr2-full-project.zip` (server/game) and `bymr-web-handoff.zip` (browser client add-on):
the add-on's files were added (no path overlapped); `web-client.patch` was applied to
`.vscode/tasks.json` and removed; the `docker-compose.web.yml` overlay was folded into
`server/docker-compose.yml` and removed; `.gitignore` ignores `server/public/web*`; `client-web/src/game`
was regenerated from the current AS3 (it had been converted before `IoPinchZoom`, `ioConfirmShiny` and
the latest map changes: 24 files updated, 1 added); browser docs updated for the combined layout;
`sandbox-tools/` added. Verified: convert 1518/1518, build OK, fresh DB with all migrations, game loads
from `/` on this server, pinch zoom under Android/iPhone emulation.
