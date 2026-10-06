/**
 * Inferno-only: pets (services/pets/pets.ts). Little copies of the Inferno's monsters that wander the main yard,
 * just for looks: bought with Shiny in the Buildings menu (Decorations, the Pets tab), at most `maxOut` in the
 * yard at once; the others wait in storage (no refund for one put away). Never in outposts. Server restart only.
 */
export const petsConfig = {
  enabled: true,
  /** Shiny for one pet. */
  price: 500,
  /** Pets in the main yard at once (the rest in storage). */
  maxOut: 5,
  /** Pets of one monster a player can own. */
  maxPerKind: 5,
  /** The longest name a pet can have (names are optional). */
  nameLength: 16,
  /** Pets a player can own in all (in the yard and in storage). */
  maxOwned: 60,
  /**
   * The monsters that can be pets: every Inferno monster but the champions (Korath IC9, Drull IC10, Ashkarr IC24
   * and the Rimegrave IC25). Hell Freezes Over's ice monsters are among them.
   */
  monsters: ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC12", "IC14", "IC15", "IC20", "IC26", "IC27", "IC28", "IC29", "IC30", "IC31"],
  /** Hell Freezes Over's monsters: on sale (and shown) only to a player who has won the event. */
  eventMonsters: ["IC26", "IC27", "IC28", "IC29", "IC30", "IC31"],
};
