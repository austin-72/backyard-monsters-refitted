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

  /** Mushrooms never grew in the Inferno (and its prop table has no complete mushroom entry). */
  mushrooms: false,

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
  referral: {
    shiny: 250,
    /** Where the invite message sends people for the Flash Player: your fork's Releases page. */
    downloadUrl: "https://github.com/austin-72/backyard-monsters-refitted/releases",
  },

  /**
   * Version control. The server reads the build stamp of the client it serves
   * (public/client/bymr-stable.swf) and asks older clients to restart, so normally there is nothing
   * to set. This is the floor for servers that hand out the SWF as a file instead of publishing it:
   * a stamp like 202609211830 (see client/scripts/IOBuild.as), or 0 for no floor.
   */
  minClientBuild: 0,

  /**
   * The Catapult (buildable from Under Hall 3, main yard only). In the Inferno it fires Chaos weapons
   * instead of twigs and pebbles. Three rows, four sizes each; size N needs a level N Catapult, and each
   * row can be fired once per attack. Costs: r1 bone, r2 coal, r3 sulfur, r4 magma.
   *
   *   tw0-tw3  Marilyn Monstroe  damage, radius (lure range), fuse (seconds)
   *   pb0-pb3  Candy Jars        radius (range), durability
   *   pu0-pu3  Sulfur Bomb       radius, speed (x), damageMult (damage taken: 0.2 = 80% armour),
   *                              speedlength (seconds it lasts)
   *
   * Sent to the client with every base load, so changing a number needs a server restart only.
   */
  catapult: {
    tw0: { damage: 500, radius: 300, fuse: 8, costs: { r4: 100_000, r3: 50_000 }, catapultLevel: 1 },
    tw1: { damage: 1_500, radius: 300, fuse: 12, costs: { r4: 500_000, r3: 250_000 }, catapultLevel: 2 },
    tw2: { damage: 4_000, radius: 300, fuse: 16, costs: { r4: 2_500_000, r3: 1_250_000 }, catapultLevel: 3 },
    tw3: { damage: 8_000, radius: 300, fuse: 20, costs: { r4: 5_000_000, r3: 2_500_000 }, catapultLevel: 4 },

    pb0: { radius: 200, durability: 2_000, costs: { r1: 100_000, r2: 100_000 }, catapultLevel: 1 },
    pb1: { radius: 250, durability: 4_000, costs: { r1: 250_000, r2: 250_000 }, catapultLevel: 2 },
    pb2: { radius: 300, durability: 6_000, costs: { r1: 2_000_000, r2: 2_000_000 }, catapultLevel: 3 },
    pb3: { radius: 350, durability: 8_000, costs: { r1: 5_000_000, r2: 5_000_000 }, catapultLevel: 4 },

    pu0: { radius: 150, speed: 1.2, damageMult: 0.2, speedlength: 10, costs: { r3: 100_000 }, catapultLevel: 1 },
    pu1: { radius: 200, speed: 1.4, damageMult: 0.4, speedlength: 15, costs: { r3: 500_000 }, catapultLevel: 2 },
    pu2: { radius: 300, speed: 1.8, damageMult: 0.6, speedlength: 30, costs: { r3: 2_500_000 }, catapultLevel: 3 },
    pu3: { radius: 500, speed: 2, damageMult: 0.8, speedlength: 40, costs: { r3: 5_000_000 }, catapultLevel: 4 },
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
   * Rezghul in the Inferno: available from the start (no locker research), hatched for a flat
   * magma cost. Also used by the server's attack validation, which checks monster stats in
   * production, so the client and server always agree on the cost.
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
   * Let players recycle buildings (and cancel construction) in outposts. The stock game forbids it.
   * Off, as in the stock game. Turn it on while designing outpost kits, so layouts can be reworked.
   * Read by the client on every base load, so changing it needs a server restart but no client rebuild.
   */
  outpostRecycling: false,

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
  startingShiny: { min: 10_000, max: 25_000 },

  /** Bone / coal / sulfur harvester output multiplier. */
  resourceMultiplier: 2,

  /** Magma harvester output multiplier. */
  magmaMultiplier: 4,

  /** Build / upgrade / fortify timers are divided by this. 4 = a quarter of the time. */
  buildTimeDivisor: 4,

  /** Seconds to hatch any monster, in hatcheries and the HCC. */
  hatchSeconds: 1,

  /** Workers in the main yard, unlocked from the start (1-5). Outposts always have 1. */
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
   * Moloch: the rare fifth tribe. A Moloch seat's peak cell becomes a stronghold: above every
   * other tribe's levels and holding far more loot.
   */
  moloch: {
    enabled: true,

    /** How many of every 1000 territory seats Moloch rules. 24 is about 108 strongholds on a 400x400 map at spacing 6. */
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
