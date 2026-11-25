/**
 * Inferno-only (7 October, the user's): the Devil's Arcade, building 142. Fifteen games (seven at first, eight more
 * the same day), each played alone or against other players; for fun and the arcade's own leaderboards only
 * (nothing is won or lost).
 *
 *  - Hellgate Defense (services/td/hellgate.ts): Solo, Versus (monsters sent to the rival's arena), Co-op
 *    (two linked arenas, shared lives).
 *  - Siege: the Daily (one yard and one army for everyone each day) and Duel (two players, the same yard and
 *    army; the better attack wins).
 *  - Wormzer: a snake arena, against bots (Solo) or live (up to 8 players, bots filling in).
 *  - Fusebug Blast: a bomb maze, against bots or live with 2 to 4 players.
 *  - Balthazar's Flight: an endless flyer; Solo races the best runs' ghosts, Race flies against another
 *    player live (or a ghost when nobody comes).
 *  - Spurtz Smash and Magma Breakout: Solo for a score, Versus head to head (a bot when nobody comes).
 *  - Lava Floor, Bone Brawl, Ember Hockey and Soul Snatch (services/arcade/arena.ts and its games): run on the
 *    server like Fusebug Blast, against bots or live (bots filling the empty places).
 *  - Magma Stack, Spurtz Swarm, Rezghul Runner: Solo for a score, Versus (Race) head to head or a bot.
 *  - Valgos Golf: the Daily (the same nine holes for everyone each day, a board for the day) and Versus.
 *
 * The live games run through the arcade's socket (services/arcade/hub.ts, /arcade/ws on the game's own port, so
 * it works through the web tunnel). Scores of solo runs are sent by the game and checked against the run's
 * time (`maxPerSecond`), as Hellgate's are.
 */
export const arcadeConfig = {
  enabled: true,

  /** The building (INFERNOYARDPROPS 142, DEVILSARCADE.ts). */
  buildingType: 142,

  /**
   * The games: id, name, modes (the first is the solo one), and for scores sent by the game, the most a
   * second of play can earn and the most a run can (anything above is refused as impossible).
   * `score2` (18 October, SUSPECTED-BUGS.md: the second number had no check, so its quests could be faked): the
   * second number's most per second, what it may have at once, and its most in a run. Flight: embers; Smash: the
   * best chain; Breakout: the level; Stack: rows; Swarm: the wave; Runner: metres (at most 40 a second); Golf: aces.
   */
  games: [
    { id: "hellgate", name: "Hellgate Defense", modes: ["solo", "versus", "coop"], maxPerSecond: 0, maxScore: 0 },
    // (10 October: Hellgate Defense 2, services/td/hellgate2.ts; Campaign ranks by points, the Daily by waves)
    { id: "hellgate2", name: "Hellgate Defense 2", modes: ["solo", "daily"], maxPerSecond: 0, maxScore: 0, daily: ["daily"] },
    { id: "siege", name: "Siege", modes: ["daily", "duel"], maxPerSecond: 0, maxScore: 0 },
    { id: "wormzer", name: "Wormzer", modes: ["solo", "live"], maxPerSecond: 0, maxScore: 0 },
    { id: "fusebug", name: "Fusebug Blast", modes: ["solo", "live"], maxPerSecond: 0, maxScore: 0 },
    { id: "flight", name: "Balthazar's Flight", modes: ["solo", "race"], maxPerSecond: 60, maxScore: 1_000_000, score2: [5, 10, 100_000] },
    { id: "smash", name: "Spurtz Smash", modes: ["solo", "versus"], maxPerSecond: 600, maxScore: 100_000, score2: [12, 5, 2_000] },
    { id: "breakout", name: "Magma Breakout", modes: ["solo", "versus"], maxPerSecond: 400, maxScore: 1_000_000, score2: [0.3, 2, 500] },
    // (7 October, later: the user's picks of twenty ideas)
    { id: "lavafloor", name: "Lava Floor", modes: ["solo", "live"], maxPerSecond: 0, maxScore: 0 },
    { id: "bonebrawl", name: "Bone Brawl", modes: ["solo", "live"], maxPerSecond: 0, maxScore: 0 },
    { id: "hockey", name: "Ember Hockey", modes: ["solo", "versus", "team"], maxPerSecond: 0, maxScore: 0 },
    { id: "soulsnatch", name: "Soul Snatch", modes: ["solo", "live"], maxPerSecond: 0, maxScore: 0 },
    { id: "stack", name: "Magma Stack", modes: ["solo", "versus"], maxPerSecond: 1500, maxScore: 50_000_000, score2: [3, 4, 100_000] },
    { id: "swarm", name: "Spurtz Swarm", modes: ["solo", "versus"], maxPerSecond: 800, maxScore: 10_000_000, score2: [0.5, 2, 10_000] },
    { id: "runner", name: "Rezghul Runner", modes: ["solo", "race"], maxPerSecond: 250, maxScore: 10_000_000, score2: [45, 60, 10_000_000] },
    // (Valgos Golf keeps 999 less the strokes, so fewer strokes rank higher; nine holes take nine strokes at best)
    // (minSeconds: nine holes take at least that long, the ball's drop into each cup alone 80 steps, 1.33 s: a
    // quicker run is not a played one; 9 October)
    { id: "golf", name: "Valgos Golf", modes: ["daily", "versus"], maxPerSecond: 100, maxScore: 990, daily: ["daily"], minSeconds: 12, score2: [0.75, 1, 9] },
  ] as { id: string; name: string; modes: string[]; maxPerSecond: number; maxScore: number; daily?: string[]; minSeconds?: number; score2?: [number, number, number] }[],

  /** How long a run started may take before its score is no longer taken (seconds). */
  runTimeout: 3 * 60 * 60,

  /** Rows on a leaderboard. */
  boardSize: 20,

  /** A live match: seconds to wait for an opponent before a bot (or a ghost) takes the place, where a game has one. */
  botAfterSeconds: 20,

  /** Wormzer's live arena: players at most; bots fill it up to `wormzerBots`. */
  wormzerPlayers: 8,
  wormzerBots: 5,

  /** Fusebug Blast: players at most; a match starts this many seconds after the second player joins. */
  fusebugPlayers: 4,
  fusebugLobbySeconds: 12,

  /** The arena games (Lava Floor, Bone Brawl, Ember Hockey's 2 v 2, Soul Snatch): seats in a match, and how long a
   * live lobby waits after its second player before starting (bots fill the empty seats). */
  arenaLobbySeconds: 12,

  /** Flight ghosts kept: each player's best run (its path), the best few shown. */
  ghostMaxBytes: 60_000,
};

export type ArcadeGame = (typeof arcadeConfig.games)[number];

export const arcadeGame = (id: string): ArcadeGame | undefined => arcadeConfig.games.find((g) => g.id === id);
