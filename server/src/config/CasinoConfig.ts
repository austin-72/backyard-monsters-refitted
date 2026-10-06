/**
 * The Brimstone Pit: the Inferno casino (building 141). Players wager Shiny against the house; every
 * outcome is decided here, on the server, from a provably fair seed (services/casino/rng.ts), and the
 * client only shows it. Nothing here moves Shiny between players, and nothing buys or sells Shiny.
 *
 * Every number the games pay is in this file. Changing it needs a server restart only (the client asks
 * for the rules with casino/state and shows what it is sent).
 *
 * Every game is set to return just under 100% of what is bet (the user's choice: 99.2% to 99.99%, see
 * each game). A win that comes to part of a Shiny (1.5x on 1 Shiny) pays the whole Shiny with the chance
 * of that part, drawn from the bet's own numbers (rng.ts, wholeShiny), so small bets return the same as
 * big ones. `bun scripts/casino-rtp.ts` checks that nothing returns 100% or more.
 */
export const casinoConfig = {
  /** false closes the Pit: every casino endpoint refuses, the building stays. */
  enabled: true,

  /** The building's type number in the yard. */
  buildingType: 141,

  /** Smallest bet, in Shiny. Bets are whole Shiny. */
  minBet: 1,

  /** Largest bet, in Shiny; 0 = no limit (the player's balance is the only one). */
  maxBet: 0,

  /** Most Shiny a player may wager in a UTC day, all games together; 0 = no limit. */
  dailyWagerCap: 0,

  /** No bet pays more than this many times its stake (every game's own table stays under it). */
  maxMultiplier: 1000,

  /** No bet pays more than this much Shiny; 0 = no limit. */
  maxPayout: 0,

  /**
   * The Pit level each game opens at. A game not listed here is not open yet (coming in a later
   * update); the lobby shows it as coming soon.
   */
  unlockLevel: {
    magmadrop: 1,
    scratch: 1,
    roulette: 2,
    bonepile: 2,
    slots: 3,
    ascent: 4,
    derby: 5,
    fortune: 6,
  } as Record<string, number>,

  /**
   * Wins announced to everyone in Global chat (chat/chatBroadcasts.ts noteCasinoWin), as the game
   * celebrates them (CasinoWindow.bigWin): every jackpot; every BIG WIN (`bigWin` times the stake or more),
   * MEGA WIN (`megaWin`) and EPIC WIN (`epicWin`); and any other win that makes at least `minProfit`
   * Shiny over its stake, or pays `minMultiplier` times its stake. Apart from jackpots, only a win paying
   * more than `minPayout` Shiny is announced (the user's: a BIG WIN of 120 Shiny on 10 is not). So one
   * player's quick Magma Drops cannot fill the chat, a BIG WIN or one of the others waits `gapSeconds`
   * after that player's last announcement (jackpots, MEGA and EPIC WINs never wait). The admins' wins
   * are never announced.
   */
  announce: {
    enabled: true,
    bigWin: 10,
    megaWin: 50,
    epicWin: 200,
    gapSeconds: 10,
    minProfit: 2500,
    minMultiplier: 25,
    minPayout: 500,
  },

  /** Games shown in the lobby, in order, with the level they will open at once they are in. */
  lobby: [
    { id: "magmadrop", name: "Magma Drop", level: 1 },
    { id: "scratch", name: "Brimstone Scratchers", level: 1 },
    { id: "roulette", name: "Wormzer Roulette", level: 2 },
    { id: "bonepile", name: "Bone Pile", level: 2 },
    { id: "slots", name: "Magma Slots", level: 3 },
    { id: "ascent", name: "Balthazar's Ascent", level: 4 },
    { id: "derby", name: "Magma Derby", level: 5 },
    { id: "fortune", name: "Korath's Fortune", level: 6 },
  ],

  /**
   * Magma Drop (Plinko): 10 rows, 11 cups. Each row is one fair coin (left / right), so cup k is reached
   * with the chance C(10, k) / 1024. Multipliers are the total paid back (a 2 pays twice the stake).
   * Returns to player: 99.98% on every risk (1023.8 / 1024).
   */
  magmaDrop: {
    rows: 10,
    risks: {
      low: [9.4, 3, 1.5, 1.1, 1, 0.5, 1, 1.1, 1.5, 3, 9.4],
      medium: [23.9, 5, 2, 1.5, 0.5, 0.5, 0.5, 1.5, 2, 5, 23.9],
      high: [60.7, 12, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 12, 60.7],
    } as Record<string, number[]>,
  },

  /**
   * Brimstone Scratchers: a 3 x 3 card; three of one prize symbol win that prize (times the ticket's
   * price). The chances are the whole card's: 99.99% returned, 33.94% of tickets win.
   */
  scratch: {
    tiers: {
      bone: { price: 5, level: 1 },
      obsidian: { price: 25, level: 1 },
      magma: { price: 100, level: 3 },
    } as Record<string, { price: number; level: number }>,
    prizes: [
      { symbol: "crown", pays: 100, chance: 0.0005 },
      { symbol: "balthazar", pays: 25, chance: 0.004 },
      { symbol: "spurtz", pays: 10, chance: 0.015 },
      { symbol: "magma", pays: 5, chance: 0.04 },
      { symbol: "sulfur", pays: 3, chance: 0.065 },
      { symbol: "coal", pays: 2, chance: 0.09 },
      { symbol: "bone", pays: 1, chance: 0.1249 },
    ],
  },

  /**
   * Wormzer Roulette: a wheel of 29 segments. Segment 0 is King Wormzer (the house's); segments 1 to 28
   * go round the seven monsters in this order four times, Lava on odd segments and Ash on even ones, so
   * every monster has two of each. One segment is drawn, each as likely. Pays (total, stake included):
   * a monster 7.24 (4 in 29: 99.86%), a colour 2.07 (14 in 29: 99.93%), King Wormzer 28.99 (1 in 29:
   * 99.97%). Each must stay under 29 / its segments (7.25, 2.0714..., 29), or that bet returns 100% or
   * more. Several bets on one spin, up to `maxBets` places; the slip's total paid in whole Shiny.
   */
  roulette: {
    segments: 29,
    monsters: ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox"],
    pays: { monster: 7.24, color: 2.07, wormzer: 28.99 },
    maxBets: 10,
  },

  /**
   * Bone Pile (Mines): 25 bone piles, `sabnox` of them hiding a Sabnox (the player picks how many). Each
   * safe pile raises the multiplier to rtp x C(25, k) / C(25 - m, k) after k safe piles with m Sabnox,
   * rounded down to 2 decimals (and held to `maxMultiplier`): 99.99% at every point the player may stop,
   * a little less for the rounding (99.2% at the worst: 1.24x for 1.2499x with 5 Sabnox after 1 pile).
   * A Sabnox loses the bet. A game left alone for `idleHours` is settled: cashed out if a pile was
   * opened, the bet given back if not.
   */
  bonePile: {
    piles: 25,
    minSabnox: 1,
    maxSabnox: 20,
    rtp: 0.9999,
    idleHours: 24,
  },

  /**
   * Balthazar's Ascent (crash), one round for every player at once: `bettingSeconds` to bet, then
   * Balthazar flies and the multiplier climbs, m(t) = floor(100 x e^(growth x t ms)) / 100 (1.82x at 10 s,
   * 3.32x at 20 s), until a Sharpshooter Tower shoots him down at the round's crash point, drawn from the round's
   * seed: floor(100 x rtp / (1 - u)) / 100, at least 1.00 (a crash at once) and at most `maxCrash`. The
   * chance of reaching x is rtp / x, so every cash-out target returns 99.99% (and 1.0% of rounds end at
   * once, at 1.00x). Cash out by hand (the server's
   * clock decides) or set an automatic target (settled exactly). `resultSeconds` of results, then the next.
   */
  ascent: {
    bettingSeconds: 10,
    resultSeconds: 4,
    growth: 0.00006,
    rtp: 0.9999,
    maxCrash: 1000,
    minAuto: 1.01,
    /** Players listed in a round (the biggest bets first). */
    listed: 30,
    /** Past crash points shown. */
    history: 12,
  },

  /**
   * Magma Derby: a race every 5 minutes for every player (`bettingSeconds` to bet, the race, then
   * `resultSeconds` of results). Six of the eight monsters run, picked by the round's seed, each with a
   * strength drawn evenly from 1 to 6; a racer wins with the chance of its strength over all six's. Odds
   * (decimal, the stake included) are max(minOdds, floor(100 x rtp / chance) / 100): at most 99.99%
   * returned on any racer, a little less for the rounding (99.5% at the worst; 99.9% on average).
   * (minOdds only matters for a racer more than 95% sure to win, which these strengths never make.)
   * The finishing order is drawn the same way (the winner, then the
   * next from those left, and so on) and the race's times are made to match it.
   */
  derby: {
    monsters: ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox", "wormzer"],
    runners: 6,
    minStrength: 1,
    maxStrength: 6,
    rtp: 0.9999,
    minOdds: 1.05,
    bettingSeconds: 240,
    /** How long the race is on screen (the runners finish in the last part of it). */
    raceSeconds: 40,
    resultSeconds: 20,
    /** Checkpoints each runner passes (its times sent when the race starts). */
    checkpoints: 10,
    history: 10,
    /** Bettors listed on a race (the biggest bets first, one line per player and runner). */
    listed: 30,
  },

  /**
   * Magma Slots: 3 reels, each a strip of 32 stops, one drawn per reel (each as likely). Three of a kind
   * on the line pays that symbol (total, stake included); exactly two Spurtz pay the stake back; three
   * King Wormzer win the jackpot. The weights are how many of a reel's stops show the symbol:
   * Wormzer 1, Balthazar 2, Grokus 3, Valgos 4, Zagnoid 5, Malphus 6, Spurtz 11. Without the jackpot the
   * machine returns 97.97% (74.71% three of a kind, 23.26% two Spurtz; 32,104 / 32,768); `jackpotRate` of
   * every spin goes into the pool, up to `jackpotMax`. The jackpot is worth pool / (32,768 x
   * jackpotFullBet) of any spin's stake: 0.02% with the pool at 500, 2.01% at its most (66,000), where a
   * spin returns 99.99%. Never 100%, however big the pool shows (an uncapped pool would make a spin worth
   * more than it costs past about 66,400, and a player could wait for that). The pool fills quickly (5%
   * of stakes) so it spends most of its time near the top: over time about 99.6% (full bets; a full
   * pool is won and starts again at 500) to 99.95% (small bets, which only take their share of it).
   * The strips are fixed (a reel shows the stops above and below the line from its own strip): nothing
   * is placed to look like a near win.
   */
  slots: {
    strips: [
      ["spurtz", "malphus", "zagnoid", "spurtz", "valgos", "spurtz", "grokus", "malphus", "spurtz", "balthazar", "zagnoid", "spurtz", "malphus", "valgos", "spurtz", "wormzer",
       "zagnoid", "spurtz", "malphus", "grokus", "spurtz", "valgos", "zagnoid", "spurtz", "malphus", "balthazar", "spurtz", "valgos", "zagnoid", "grokus", "malphus", "spurtz"],
      ["malphus", "spurtz", "valgos", "zagnoid", "spurtz", "grokus", "spurtz", "malphus", "balthazar", "spurtz", "zagnoid", "valgos", "spurtz", "malphus", "wormzer", "spurtz",
       "zagnoid", "grokus", "spurtz", "malphus", "valgos", "spurtz", "zagnoid", "balthazar", "spurtz", "malphus", "spurtz", "grokus", "valgos", "zagnoid", "spurtz", "malphus"],
      ["zagnoid", "spurtz", "malphus", "grokus", "spurtz", "valgos", "spurtz", "zagnoid", "malphus", "spurtz", "balthazar", "valgos", "spurtz", "wormzer", "malphus", "spurtz",
       "zagnoid", "spurtz", "grokus", "malphus", "valgos", "spurtz", "zagnoid", "spurtz", "balthazar", "malphus", "grokus", "spurtz", "valgos", "zagnoid", "spurtz", "malphus"],
    ],
    /** Three of a kind pays (King Wormzer: the jackpot). */
    pays: { balthazar: 250, grokus: 100, valgos: 50, zagnoid: 25, malphus: 13, spurtz: 8 } as Record<string, number>,
    /** Exactly two Spurtz anywhere on the line. */
    twoSpurtz: 1,
    /**
     * The share of every spin's stake added to the jackpot pool (the house's, not the player's: it is
     * not taken from what the reels pay; it only sets how fast the pool fills).
     */
    jackpotRate: 0.05,
    /**
     * A jackpot pays the pool once for every this much staked: all of it on a bet of this much, a tenth
     * on 10 Shiny (the rest stays in the pool), twice it on 200 (the house pays what the pool lacks; the
     * pool starts again). So the jackpot is worth the same share of every stake, big or small. (Paid whole
     * to a 1 Shiny spin, the pool would be worth more than it costs to spin past about 660 Shiny.)
     */
    jackpotFullBet: 100,
  },

  /**
   * Moloch's Favor: one free Magma Slots spin a day (UTC) for every player whose Pit has the Slots open,
   * always a `bet` Shiny spin, whatever the Pit's level (a real spin, played and paid as a bet of that
   * much, the jackpot share included; the house pays it, nothing goes into the pool). Worth about 99%
   * of its bet.
   */
  favor: {
    enabled: true,
    bet: 10,
  },

  /**
   * Korath's Fortune (Brimstone Pit level 6): the Magma Slots' strips and pays in a 3 x 3 window, paid on
   * five lines (the three rows and the two diagonals; games/slots.ts FORTUNE_LINES), each bet a fifth of
   * the stake. Each line returns what the Magma Slots line does, so the machine returns 97.97% without the
   * jackpot; three King Wormzer on a line win that line's share of the same jackpot pool (its fifth of the
   * stake over `jackpotFullBet`; 5 lines x 1 in 32,768), 2.01% more at the pool's most: 99.99%, never 100%.
   * A line pays on 85% of spins (mostly two Spurtz, a fifth of the stake back), and a spin pays more than its
   * stake about one time in 4 (the Magma Slots: one in 18), less each time.
   */
  fortune: {
    lines: 5,
  },

  /**
   * Magma Slots' jackpot: what the pool starts at and goes back to when it is won (or falls below after a
   * part is won). This much Shiny is made new each time (the user's choice).
   */
  jackpotSeed: 500,

  /**
   * The most the pool holds. Past about 66,400 a spin would be worth more than it costs (see `slots`);
   * checked by scripts/casino-rtp.ts. Changing the pays or `jackpotFullBet` means working it out again.
   */
  jackpotMax: 66000,

  /** History kept per player for the History tab (the ledger itself keeps everything). */
  historyLimit: 50,
};

export const casinoEnabled = () => casinoConfig.enabled;
