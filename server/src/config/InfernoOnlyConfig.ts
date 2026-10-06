/**
 * Inferno-only custom server configuration.
 *
 * When `enabled`, the server runs as a single-realm Inferno world:
 *  - every account's main yard is an Inferno yard living on a Map Room 2 world map
 *  - the overworld, the descent and the legacy Inferno map room are unreachable
 *  - wild monster tribes on the map are "devil" conversions of the overworld tribes
 *
 * The numeric tunables are sent to the client through `flags` on every base load
 * (see game-data/flags.ts), so they can be changed here without rebuilding the SWF.
 * The client must be built with `GLOBAL.INFERNO_ONLY = true`.
 */
export const infernoOnlyConfig = {
  enabled: true,

  /**
   * Discord. The stock server only involves Discord when ENV is "prod": login then demands a
   * verified Discord link, and accounts whose Discord is missing or under 7 days old cannot open
   * the map room or attack. With ENV "local" none of that exists. `false` switches both checks
   * off in every environment, so a hosted copy of this server behaves like a local one.
   */
  requireDiscord: false,

  /**
   * Mushrooms grow in the main yard and pay shiny when picked, as in the overworld (the stock Inferno
   * never had them). `false` stops them spawning.
   */
  mushrooms: true,

  /**
   * What happens when the server refuses an attack payload (validateAttack: a monster the server does
   * not know, or stats that differ from its table). The attack is always refused and written to the
   * report table and the server log. The stock server also banned the account on the first refusal;
   * that is this value at 1. 0 never bans automatically (an admin decides from the report).
   */
  attackViolationBanAfter: 0,

  /**
   * Referrals: the Invite Friends button shows the player's link, https://<server>/play.swf?ref=<code>.
   * A friend who starts the game from it and registers earns both players this much shiny, paid when
   * the friend's yard is created. Nothing is paid between accounts made on the same IP address.
   * 0 turns the feature off (and hides the button again if "invite" is in hiddenUi).
   */
  /**
   * Usernames that get the Admin button in the game and can use the admin panel (services/admin).
   * Exact, capitals included: "AdminTester" is not "admintester". The names are reserved: nobody can
   * register one or rename to one from the game, in any capitals. To make an existing account an
   * admin, give it the name with `bun run admin:claim <account> <name>` (scripts/admin-claim.ts).
   * Every admin action is checked on the server and written to the admin log. Server restart only.
   */
  admins: ["admintester"] as string[],

  /**
   * Daily login reward, collected from a popup on the main yard (services/user/dailyLogin.ts).
   * The streak counts on for as long as the player keeps collecting every day (UTC). Every
   * `streakDays`-th day (14, 28, ...) pays `streakShiny`, every other `weekDays`-th day (7, 21, ...)
   * pays `weekShiny`, every other day `shiny`. The popup shows the `streakDays`-day stretch the
   * streak is in. Missing a day starts again at day 1. `shiny: 0` turns it off.
   * This replaces the stock monthly grant (scripts/monthly-shiny.ts no longer pays anything).
   */
  dailyLogin: {
    shiny: 10,
    weekDays: 7,
    weekShiny: 100,
    streakDays: 14,
    streakShiny: 200,
  },

  referral: {
    shiny: 250,
    /** The Flash Player download (your fork's Releases page). Sent as io_invite_download; the invite text no longer uses it. */
    downloadUrl: "https://github.com/austin-72/backyard-monsters-refitted/releases",
    /** Invite links: this address plus ?ref=<code>. The browser client reads ref like the launcher does. */
    inviteUrl: "https://inferno.maproom2.com/",
  },

  /**
   * The popup shown once per login, in place of the stock game's "unlock a monster / build a
   * catapult" nags. Line breaks are kept. An empty body shows nothing.
   */
  welcome: {
    title: "Welcome to hell.",
    body: "What's hell without your friends?\n\nHit <b>Invite Friends</b> and send them your link. When they join, you both get 250 shiny.",
    /** The picture beside the text, from public/assets/popups (the popup has a frame for one). */
    image: "invite-friends.png",
  },

  /**
   * Version control. The server reads the build stamp of the client it serves
   * (public/client/bymr-stable.swf) and asks older clients to restart, so normally there is nothing
   * to set. This is the floor for servers that hand out the SWF as a file instead of publishing it:
   * a stamp like 202609211830 (see client/scripts/IOBuild.as), or 0 for no floor.
   */
  minClientBuild: 0,

  /**
   * Pictures the game loads from public/assets are cached by browsers and by any CDN in front of the
   * server (an hour or more), so a replaced picture can keep showing the old one. The game adds
   * ?v=<assetVersion> to every such request: raise this number after replacing pictures and every
   * player gets the new ones on their next load. Server restart only. 0 = no version.
   */
  assetVersion: 9,

  /**
   * Shadows under buildings in the yard. Players pick it up at their next load.
   */
  yardShadows: true,

  /**
   * Shadows while a building is held: dragged in move mode, or a new one being placed. Off by default: the
   * yard's shadows are hidden until it is put down (or cancelled). Each shadow is drawn with a "multiply"
   * blend and a big yard has 200+ of them, so moving and placing are smoother without them.
   */
  yardShadowsWhileMoving: false,

  /**
   * The yard is drawn again only where something changed (moved, animated, appeared), not whole every
   * frame (client Renderer.as; the browser build only, Flash always draws whole). false = the old way,
   * whole every frame: a way back without a new client, should it ever draw something wrong.
   */
  yardPartialRedraw: true,

  /**
   * With the partial redraw on: the yard in view is also drawn again from scratch a strip at a time, all
   * of it once every this many milliseconds, so anything a partial redraw might ever leave behind is gone
   * within that time (a strip each frame, so no frame costs much more). 0 turns it off.
   */
  redrawSweepMs: 1000,

  /**
   * Wild tribe attacks on the player's main yard (never outposts; the game plans and runs them while the
   * player is on, and never in the first minute after logging in). At most one per `minHours` per player:
   * the next one can come `minHours` after the last started. `molochChance` of them are Moloch's, the rest split
   * evenly between the four other tribes. Only from yard level `minLevel` (the stock rule was 9).
   *
   * Each tribe has one attack per player-level band: levels 1-10, 11-20, 21-30, 31-40, 41 and up.
   * `level` is the monsters' level (their stats at that level, whatever the player's own academy
   * says); `monsters` is how many of each. Ids: IC1 Spurtz, IC2 Zagnoid, IC3 Malphus, IC4 Valgos,
   * IC5 Balthazar, IC6 Grokus, IC7 Sabnox, IC8 King Wormzer, IC9 Korath, IC10 Drull, C19 Rezghul.
   * Tribe names in the game: legionnaire Hellionnaire, kozu Kozmodeus, abunakki Abaddonakki,
   * dreadnaut Beelzenaut. Sent to the client on every base load: a server restart is enough.
   * `enabled: false` = the stock behaviour (Moloch only, every 2-4 days, size from the yard).
   */
  wildAttacks: {
    enabled: true,
    minHours: 23,
    minLevel: 3,
    molochChance: 0.05,
    bands: [10, 20, 30, 40],
    tribes: {
      // Tanks and artillery: breaks through defences.
      legionnaire: [
        { level: 1, monsters: { IC2: 6, IC1: 4 } },
        { level: 2, monsters: { IC2: 12, IC4: 4, IC1: 6 } },
        { level: 3, monsters: { IC2: 16, IC6: 4, IC7: 3, IC4: 4 } },
        { level: 4, monsters: { IC2: 20, IC6: 10, IC7: 5, IC4: 6 } },
        { level: 5, monsters: { IC2: 24, IC6: 14, IC7: 8, IC8: 2 } },
      ],
      // A swarm of small, cheap monsters.
      kozu: [
        { level: 1, monsters: { IC1: 8, IC3: 4 } },
        { level: 2, monsters: { IC1: 16, IC3: 8, IC2: 4 } },
        { level: 3, monsters: { IC1: 30, IC3: 14, IC2: 8 } },
        { level: 4, monsters: { IC1: 45, IC3: 20, IC2: 12, IC5: 4 } },
        { level: 5, monsters: { IC1: 60, IC3: 30, IC2: 16, IC5: 8 } },
      ],
      // Fast raiders.
      abunakki: [
        { level: 1, monsters: { IC3: 6, IC1: 4 } },
        { level: 2, monsters: { IC3: 10, IC4: 5, IC1: 6 } },
        { level: 3, monsters: { IC5: 8, IC4: 8, IC3: 12 } },
        { level: 4, monsters: { IC5: 14, IC4: 12, IC3: 16, IC7: 2 } },
        { level: 5, monsters: { IC5: 20, IC4: 16, IC3: 20, IC7: 4 } },
      ],
      // Few, heavy monsters.
      dreadnaut: [
        { level: 1, monsters: { IC2: 4, IC4: 3 } },
        { level: 2, monsters: { IC6: 3, IC4: 5, IC2: 6 } },
        { level: 3, monsters: { IC6: 6, IC7: 3, IC8: 2, IC2: 6 } },
        { level: 4, monsters: { IC8: 5, IC6: 10, IC7: 4 } },
        { level: 5, monsters: { IC8: 8, IC6: 12, IC7: 6, C19: 1 } },
      ],
      // The strongest: a band's worth of the others, a level higher, and champions at the top.
      moloch: [
        { level: 2, monsters: { IC1: 8, IC2: 6, IC4: 3 } },
        { level: 3, monsters: { IC8: 2, IC6: 4, IC2: 10, IC1: 10 } },
        { level: 4, monsters: { C19: 1, IC8: 4, IC6: 8, IC7: 4 } },
        { level: 5, monsters: { IC10: 1, C19: 2, IC8: 6, IC6: 10, IC7: 6 } },
        { level: 6, monsters: { IC9: 1, IC10: 1, C19: 3, IC8: 8, IC6: 12 } },
      ],
    } as Record<string, { level: number; monsters: Record<string, number> }[]>,
  },

  /**
   * The Catapult (buildable from Under Hall 3, main yard only). In the Inferno it fires Chaos weapons
   * instead of twigs and pebbles. Three rows, four sizes each; size N needs a level N Catapult, and each
   * row can be fired once per attack. Costs: r1 bone, r2 coal, r3 sulfur, r4 magma.
   *
   *   tw0-tw3  Marilyn Monstroe  damage, radius (lure range), fuse (seconds)
   *   pb0-pb3  Candy Jars        radius (range), seconds (how long every tower in range stays jarred; the
   *                              glass cracks at half and a quarter left, then breaks)
   *   pu0-pu3  Sulfur Bomb       radius, speed (x), invuln (seconds of full armour), armor (% of damage
   *                              removed once invuln ends, fading to 0), speedlength (total seconds)
   *
   * Sent to the client with every base load, so changing a number needs a server restart only.
   */
  catapult: {
    tw0: { damage: 500, radius: 300, fuse: 8, costs: { r4: 100_000, r3: 50_000 }, catapultLevel: 1 },
    tw1: { damage: 1_500, radius: 300, fuse: 12, costs: { r4: 500_000, r3: 250_000 }, catapultLevel: 2 },
    tw2: { damage: 4_000, radius: 300, fuse: 16, costs: { r4: 2_500_000, r3: 1_250_000 }, catapultLevel: 3 },
    tw3: { damage: 8_000, radius: 300, fuse: 20, costs: { r4: 5_000_000, r3: 2_500_000 }, catapultLevel: 4 },

    pb0: { radius: 200, seconds: 15, costs: { r1: 100_000, r2: 100_000 }, catapultLevel: 1 },
    pb1: { radius: 250, seconds: 25, costs: { r1: 500_000, r2: 500_000 }, catapultLevel: 2 },
    pb2: { radius: 300, seconds: 40, costs: { r1: 2_000_000, r2: 2_000_000 }, catapultLevel: 3 },
    pb3: { radius: 350, seconds: 55, costs: { r1: 5_000_000, r2: 5_000_000 }, catapultLevel: 4 },

    pu0: { radius: 150, speed: 1.2, invuln: 0, armor: 40, speedlength: 15, costs: { r3: 100_000 }, catapultLevel: 1 },
    pu1: { radius: 200, speed: 1.4, invuln: 4, armor: 55, speedlength: 25, costs: { r3: 500_000 }, catapultLevel: 2 },
    pu2: { radius: 300, speed: 1.8, invuln: 8, armor: 70, speedlength: 40, costs: { r3: 5_000_000 }, catapultLevel: 3 },
    pu3: { radius: 500, speed: 2, invuln: 12, armor: 85, speedlength: 55, costs: { r3: 10_000_000 }, catapultLevel: 4 },
  },

  /**
   * Pieces of the stock UI this server has no use for. They all led to Facebook-era features
   * that do nothing on a private server.
   *   invite  - the Invite Friends button          gift     - the Send Gifts button
   *   earn    - the Earn Shiny button              daveclub - the D.A.V.E. Club icon (subscriptions)
   * Read by the client on every base load: changing this needs a server restart, not a client rebuild.
   */
  hiddenUi: ["gift", "earn", "daveclub"],

  /**
   * Turn every devil tribe yard half a turn (180 degrees) around its centre, so the familiar
   * overworld layouts are approached from the opposite side. Moloch strongholds are native Inferno
   * layouts and are not touched. Yards players have already attacked are stored in the database:
   * changing this needs the tribe yards reset (see RUNNING-INFERNO-ONLY.md).
   */
  flipTribeYards: true,

  /**
   * Rezghul in the Inferno: unlocked in the Strongbox (page 4, after King Wormzer, for 1.5 times his
   * unlock cost and time; set in the client, CREATURELOCKER.as), hatched for a flat magma cost.
   * Also used by the server's attack validation, which checks monster stats in production, so the
   * client and server always agree on the cost.
   */
  rezghul: { enabled: true, magmaCost: 500_000 },

  /**
   * Decorations are buildable in the main yard and in outposts, using the overworld set.
   * List building ids here to take single decorations out of the build menu again
   * (ids are in INFERNO-ONLY-NOTES.md). Pieces a player already placed stay where they are.
   */
  disabledDecorations: [
    55, 56, 57, 58, 59,                     // Acorn, Beehive, Bird House, Camping Tent, Childrens Jax
    63, 64,                                 // Hammock, Lawn Chair
    66, 72,                                 // Pinecone, Walnut
    86, 87, 88, 89, 90, 91, 92, 93, 94, 95, // bushes, bonsai, cactus, fly trap, thorns, all flowers
    102, 103, 104, 105, 106,                // Swimming Pool, Pond, Zen Garden, Fountain, Tea Garden
  ] as number[],

  /**
   * Test switch: while no custom kits have been exported, show the three stock kits on two pages of
   * the kit popup, just to confirm paging works. Has no effect once inferno-kits.json holds kits.
   */
  kitPagingTest: false,

  /**
   * The chat box, and how the client reaches the chat server.
   *   "http"   - chat rides on ordinary web requests (the client polls /chat/poll). Works through
   *              anything that carries the game itself, including a web-only tunnel (cloudflared).
   *   "socket" - the stock transport: a WebSocket to CHAT_WS_HOST. Flash first asks port 843 on that
   *              host for permission, so ports 3010 and 843 must both be reachable directly.
   * Both can be in use at once; players on either share the same channels.
   */
  chat: true,
  chatTransport: "http" as "http" | "socket",

  /** Alliances. `false` hides the menu entry and invite button and makes the API refuse. */
  alliances: true,

  /** Map Room 3 does not exist on this server: no migration offer, and every /worldmapv3 route refuses. */
  mapRoom3: false,

  /** New accounts start with a random amount of shiny in this inclusive range. */
  startingShiny: { min: 2_000, max: 2_025 },

  /** Bone / coal / sulfur harvester output multiplier. */
  resourceMultiplier: 2,

  /** Magma harvester output multiplier. */
  magmaMultiplier: 4,

  /** Build / upgrade / fortify timers are divided by this. 4 = a quarter of the time. */
  buildTimeDivisor: 4,

  /** Seconds to hatch any monster, in hatcheries and the HCC. */
  hatchSeconds: 1,

  /** Workers in the main yard, unlocked from the start (1-5). Outposts have 2 (the game: GLOBAL.ioOutpostWorkers). */
  workers: 5,

  /**
   * How wild monster tribes are laid out on the world map. See services/maproom/v2/tribeTerritories.ts.
   * Everything is derived from the world uuid, so a world always regenerates identically.
   * Changing any value re-rolls every tribe cell: wipe persisted tribe saves when you do.
   */
  tribeSpawns: {
    enabled: true,

    /** Distance between territory seats, in cells. Need not divide the map size. */
    spacing: 6,

    /** Slow border bending: how far (cells) and over what distance (cells). */
    warp: 5,
    warpScale: 18,

    /** Fine border bending on top of `warp`. At this strength territories fragment heavily - by choice. */
    swirl: 5,
    swirlScale: 6.9,

    /** Within this many cells of a border, pockets of the neighbouring tribe spill across. 0 = hard borders. */
    blendWidth: 1.2,

    /** Land cells sampled (once per world, seeded) to make every level hold an equal share of cells. */
    cdfSamples: 20_000,

    /**
     * Levels each tribe may use, lowest to highest, indexed like enums/Tribes.ts `Tribes`.
     * These are exactly the sets the stock MR2 server produces for the overworld tribes.
     */
    ladders: [
      [25, 29, 33, 37, 41], // Legionnaire -> Hellionnaire
      [30, 34, 38, 42],     // Kozu        -> Kozmodeus
      [27, 31, 35, 39, 43], // Abunakki    -> Abaddonakki
      [28, 32, 36, 40, 44], // Dreadnaut   -> Beelzenaut
    ],
  },

  /**
   * Where a new player's main yard goes on the Map Room 2 world (services/maproom/v2/findFreeCell.ts).
   * Distances in cells, measured like attack range. A spot is rerolled until it is within
   * `nearPlayers` of some player's main yard or outpost, more than `awayFromMainYards` from every
   * main yard and more than `awayFromMoloch` from every Moloch stronghold; after `attempts` rolls
   * (or in a world with no players yet) any free land cell will do.
   */
  spawn: {
    enabled: true,
    nearPlayers: 20,
    awayFromMainYards: 5,
    awayFromMoloch: 15,
    attempts: 100,
  },

  /**
   * Moloch's Gauntlet (services/events/gauntlet.ts): a monthly event, played from the main yard, not the map.
   * Open for the first `days` days of each month (UTC; the admin panel can open or close it early). A ladder of
   * `stages` Moloch yards (the Inferno's descent yards, weakest first), the same for every player; each one is
   * beaten by destroying `winPercent`% of it. A yard keeps its damage between attempts, but after
   * `attempts` attempts without beating it, it is fully healed and its reward is lost for good this month
   * (it can still be beaten, to go on). Rewards for each yard beaten: `stageShiny` shiny, and resources
   * growing evenly to `finalResources` at the last stage, which also pays `finalShiny`. No loot from the yards.
   * Progress starts again each month. Server restart only.
   */
  gauntlet: {
    enabled: true,
    days: 7,
    stages: 13,
    winPercent: 90,
    attempts: 3,
    stageShiny: 5,
    finalShiny: 150,
    finalResources: { r1: 30_000_000, r2: 30_000_000, r3: 30_000_000, r4: 15_000_000 },
  },

  /**
   * Moloch: the rare fifth tribe. A Moloch seat's peak cell becomes a stronghold: above every
   * other tribe's levels and holding far more loot.
   */
  moloch: {
    enabled: true,

    /** How many of every 1000 territory seats Moloch rules. 72 is about 310 strongholds on a 400x400 map at spacing 6 (24 would be about 105). */
    perThousandSeats: 72,

    /** The only levels Moloch uses. A stronghold's level is fixed by its seat. */
    levels: [46, 50],

    /**
     * Which yards a stronghold of each level can be: the numbered bases of the original descent
     * into the Inferno (1-13, easiest to hardest). Each stronghold picks one of its level's bases
     * from its seat, so the same stronghold is always the same yard.
     *   descent 10 and 11 -> level 46     descent 12 and 13 (the final two bases) -> level 50
     */
    descentBases: { 46: [10, 11], 50: [12, 13] } as Record<number, number[]>,

    /**
     * The most one destroyed building pays out, per resource, in a stronghold of each level.
     * The stock game caps every wild-monster yard at 500,000 per silo and 2,000,000 per town hall,
     * which would make a 120M stronghold pay like any other tribe. (A building still only pays a
     * share of what is left in the yard: 4% per silo, 10% for the hall, and magma pays half.)
     */
    lootCaps: {
      46: { silo: 2_000_000, hall: 4_000_000 },
      50: { silo: 3_000_000, hall: 8_000_000 },
    } as Record<number, { silo: number; hall: number }>,

    /**
     * Lootable resources at the lowest and highest Moloch level. For scale: the richest ordinary
     * tribe yard (the top Kozu layout) holds 37.5M of r1-r3 and 17.5M of r4; most hold 8-13M.
     */
    loot: {
      min: { r1: 60_000_000, r2: 60_000_000, r3: 60_000_000, r4: 30_000_000 },
      max: { r1: 120_000_000, r2: 120_000_000, r3: 120_000_000, r4: 60_000_000 },
    },
  },

  /**
   * Shiny prices. Everything in the game that costs shiny, in one place. Sent to the client with
   * every base load (flags io_price_*), so a change needs a server restart and no client rebuild.
   * Building upgrades and speed-ups are here too (the last five lines).
   */
  prices: {
    /** Improved Packing Skills, each of the 10 steps. */
    packing: 25,
    /** Damage protection: 24 hours / 3 days / 7 days. */
    protection: { day: 48, threeDays: 108, week: 168 },
    /** Housing Expansion and Tower Overdrive (24 hours each). */
    housingExpansion: 125,
    towerOverdrive: 125,
    /** Relocating on the map. */
    moveMainYard: 150,
    moveOutpost: 1_500,
    /** Capturing an outpost with shiny instead of resources (flat, whatever the yard). */
    takeoverOutpost: 100,
    /** Alliance power-ups, per hour bought. */
    powerupHour: 5,
    /** Buying an outpost kit outright, kit 1 to 6 (Ember to Apocalypse). */
    kits: [50, 100, 200, 400, 700, 1000],
    /** Upgrade all walls: per wall, wood to stone; stone to iron. A wall still on wood pays both to reach iron. */
    wallToStone: 1,
    wallStoneToIron: 4,
    /** Resource top-ups: fill 10% / 50% / 100% of storage, whatever the storage. */
    topup: [25, 100, 200],
    /** Repair all buildings now (flat). */
    repairAll: 25,
    /** Anything with this many minutes or less left finishes for free ("Close enough"). */
    closeEnoughMinutes: 10,
    /** Reduce by 1 hour / by 2 hours. */
    reduce1h: 10,
    reduce2h: 15,
    /**
     * Finish now: this for the first hour left, then this much for every further hour (pro rata). A building's build,
     * upgrade, fortify or repair is cheaper under an hour: 1 Shiny at 11 minutes left up to 9 at 59 (the game's
     * STORE.ioBuildingTimeCost; the user's, 4 October). The server takes the price the game sends.
     */
    finishNowFirstHour: 10,
    finishNowPerHour: 7.5,
  },

  /** Storage each captured outpost adds to the main yard, per resource (the stock game: 2,000,000). */
  outpostCapacity: 5_000_000,

  /** Resources a brand new yard starts with. The client caps these at silo capacity. */
  startingResources: { r1: 60_000, r2: 60_000, r3: 60_000, r4: 55_000 },
};

/** Whether Discord verification and the Discord account-age gate apply. */
export const discordRequired = () => !infernoOnlyConfig.enabled || infernoOnlyConfig.requireDiscord;

/** Whether Map Room 3 exists on this server. */
export const mapRoom3Enabled = () => !infernoOnlyConfig.enabled || infernoOnlyConfig.mapRoom3;

/** Whether the alliance feature is available. */
export const alliancesEnabled = () => !infernoOnlyConfig.enabled || infernoOnlyConfig.alliances;

/** Random integer in the configured starting shiny range. */
export const rollStartingShiny = () => {
  const { min, max } = infernoOnlyConfig.startingShiny;
  return Math.floor(min + Math.random() * (max - min + 1));
};
