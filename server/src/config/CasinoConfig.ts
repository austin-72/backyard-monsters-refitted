/**
 * The Brimstone Pit: the Inferno casino (building 141). Players wager Shiny against the house; every
 * outcome is decided here, on the server, from a seeded draw (services/casino/rng.ts), and the client only shows
 * it. Since 8 October a player who is down overall gets luck (below), which can redraw a losing result: a bet is
 * provably fair only at luck 0, as the Fairness tab says (QoL #640, 14 October: this said "provably fair" without
 * that). Nothing here moves Shiny between players, and nothing buys or sells Shiny.
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
   * Luck (8 October, the user's): a silent stat, never sent to the game. A player whose whole Pit history is
   * down (everything paid to them less everything they staked, every settled bet in every game, all time) gets
   * luck from `table` (the user's: Shiny down -> luck): 10 down 1%, 100 down 5%, 500 down 10%, 1,000 down 20%,
   * 1,500 down 25%, 2,000 down 30%, 2,500 or more down 35% (the most). Between two rows it goes up in a straight
   * line (750 down: 15%); under 10 down, from 0 to 1%. Every bet gets it whole, however big (the user's).
   * Luck 0 at even or ahead: those bets are drawn
   * exactly as the Fairness tab says. services/casino/luck.ts has where it acts: a losing result of an instant
   * game drawn again (once, with the bet's next numbers) with that chance; a card game dealt twice and the better
   * deal kept; a Sabnox found in Bone Pile moved to another pile. Ascent, the Derby and Devil's Dice have one
   * result for the whole table: luck leaves them alone. Each bet keeps the luck it had (casino_bet.luck) and
   * whether it changed the result (casino_bet.lucky), for the admins.
   */
  luck: {
    enabled: true,
    /** [Shiny down, luck] from least to most down; the last row's luck is the most, for that and anything further down. */
    table: [
      [0, 0],
      [10, 0.01],
      [100, 0.05],
      [500, 0.1],
      [1000, 0.2],
      [1500, 0.25],
      [2000, 0.3],
      [2500, 0.35],
    ] as [number, number][],
  },

  /**
   * The Pit level each game opens at. A game not listed here is not open yet (coming in a later
   * update); the lobby shows it as coming soon.
   */
  unlockLevel: {
    magmadrop: 1,
    scratch: 1,
    hilo: 1,
    roulette: 2,
    bonepile: 2,
    blackjack: 2,
    slots: 3,
    dice: 3,
    deal: 3,
    ascent: 4,
    derby: 5,
    fortune: 6,
  } as Record<string, number>,

  /**
   * Wins announced to everyone in Global chat (chat/chatBroadcasts.ts noteCasinoWin). 26 October, the user's: only a
   * win paying at least `minPayout` Shiny at `minMultiplier` times its stake or more, and only when it is that
   * player's best of the last `recordHours` hours, by its multiplier or by the Shiny it paid, among all their wins of
   * those hours (a jackpot too). The words over it stay as the game celebrates it (CasinoWindow.bigWin): BIG WIN
   * at `bigWin` times the stake, MEGA WIN at `megaWin`, EPIC WIN at `epicWin`. The admins' wins are never announced.
   */
  announce: {
    enabled: true,
    bigWin: 10,
    megaWin: 50,
    epicWin: 200,
    minPayout: 500,
    minMultiplier: 10,
    recordHours: 24,
  },

  /** Games shown in the lobby, in order, with the level they will open at once they are in. */
  lobby: [
    { id: "magmadrop", name: "Magma Drop", level: 1 },
    { id: "scratch", name: "Brimstone Scratchers", level: 1 },
    { id: "hilo", name: "Higher or Lower", level: 1 },
    { id: "roulette", name: "Wormzer Roulette", level: 2 },
    { id: "bonepile", name: "Bone Pile", level: 2 },
    { id: "blackjack", name: "Cinderjack", level: 2 },
    { id: "slots", name: "Magma Slots", level: 3 },
    { id: "dice", name: "Devil's Dice", level: 3 },
    { id: "deal", name: "The Undertaker's Offer", level: 3 },
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
   * Cinderjack (blackjack; 7 October, the user's pick): the player against the dealer, Moloch. A shoe of
   * `decks` decks shuffled afresh for every hand (services/casino/games/blackjack.ts). The dealer stands on every
   * 17 (`hitSoft17` false) and looks at the hole card under an Ace or a ten (a dealer's blackjack ends the hand
   * at once: only the first bet is lost). A blackjack pays 3 to 2 (`blackjackPays`); a win 1 to 1; a tie
   * pushes. Double on any two cards (after a split too: `doubleAfterSplit`); split a pair once (`maxHands` 2),
   * split Aces one card each (a 21 after a split is not a blackjack); no insurance, no surrender. Played by the
   * book (basic strategy) the game returns about 99.6% (scripts/casino-rtp.ts simulates it); played worse,
   * less. A hand left alone for `idleHours` stands and is settled.
   */
  blackjack: {
    decks: 6,
    hitSoft17: false,
    blackjackPays: 1.5,
    maxHands: 2,
    doubleAfterSplit: true,
    idleHours: 24,
  },

  /**
   * Higher or Lower (7 October, the user's pick): cards from an endless deck (each any of the 52, as likely);
   * guess whether the next is the same or higher, or the same or lower, than the one showing (Ace low). The
   * chance of a guess on rank r (1 Ace to 13 King) is (14 - r) / 13 or r / 13; after right guesses with chances
   * p1 ... pk the multiplier is rtp / (p1 x ... x pk), rounded down to 2 decimals, held to `maxMultiplier`:
   * 99.99% returned wherever the player stops, a little less for the rounding (99.2% at the worst: 1.29x
   * for 1.2999x after one guess at 10 in 13). A wrong
   * guess loses the bet. Skip a card (up to `maxSkips` a game) to see another without a guess. `cards` are
   * drawn for a game at the start (its secret; the hash is shown): used up, the game is cashed out. Left alone
   * for `idleHours`: cashed out (the bet given back if nothing was guessed).
   */
  hilo: {
    rtp: 0.9999,
    cards: 120,
    maxSkips: 20,
    idleHours: 24,
  },

  /**
   * The Undertaker's Offer (Deal or No Deal; 7 October, the user's pick, Pit level 3): twelve sealed coffins hold these
   * twelve prizes (multipliers of the bet), shuffled from the player's seeds. The player keeps one and opens the
   * others, `rounds` at a time (3, 3, 2, 2: ten opened); after each round the Undertaker offers to buy the kept coffin
   * for `offers[round]` times the average of the prizes still sealed (75%, 85%, 92%, 97%), rounded down. With two
   * coffins left the player keeps theirs or swaps it. Going to the end returns the prizes' average: 11.99 / 12 =
   * 99.92%; a deal returns less (the Undertaker's price for certainty: 97% to 75% of what going on is worth). Left
   * alone for `idleHours`: the kept coffin is opened and paid.
   */
  deal: {
    prizes: [0, 0.01, 0.05, 0.1, 0.25, 0.33, 0.5, 0.75, 1, 1.5, 2.5, 5],
    rounds: [3, 3, 2, 2],
    offers: [0.75, 0.85, 0.92, 0.97],
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
   * Devil's Dice (7 October, the user's pick: at Pit level 3): tables of up to `seats` players, each round the
   * same bones thrown for the whole table, every bet against the house (nothing moves between players). For
   * `bettingSeconds` the seated players bet; then the Devil throws two bones every `rollMs` (the first
   * `firstRollMs` after bets close). Each bone shows 1 to 5 pips, or the Devil (one face in six). A throw with
   * no Devil is safe: the chance of k safe throws is (25/36)^k, and the multiplier after k is
   * floor(100 x rtp / (25/36)^k) / 100: 1.43x, 2.07x, 2.98x, 4.29x, 6.19x, 8.91x, 12.83x, 18.48x, 26.62x,
   * 38.33x, 55.20x, 79.48x. Bank between throws (by hand: the server's clock decides which throws are done)
   * or set a bank after N throws; the Devil takes whatever is still on the table. After `maxRolls` safe throws
   * what is left is banked at the last. Every point to stop returns rtp less its rounding: 99.31% at the worst
   * (bank after one throw), 99.77% to 99.83% after two to four, 99.93% to 99.99% after five or more
   * (scripts/casino-rtp.ts). The bones come from the round's seed (its hash
   * shown first, the seed once the round is over). A seat not heard from for `seatSeconds` is given up.
   */
  dice: {
    seats: 4,
    bettingSeconds: 12,
    firstRollMs: 1500,
    rollMs: 2600,
    resultSeconds: 5,
    maxRolls: 12,
    rtp: 0.9999,
    seatSeconds: 25,
    history: 10,
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
