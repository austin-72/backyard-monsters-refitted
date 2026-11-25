/**
 * Inferno-only: the quest book (the user's design of 2 October). Every quest, its place in its category's
 * tree, what it counts and what it pays. Tune here; the game draws whatever this says.
 *
 * - A quest's `parent` must be claimed before it opens (each category is a tree; a root has no parent).
 * - `key` names the value it counts (see questProgress.ts: building levels and other things read from the
 *   player's yard and the database, or counters the server and the game add to) and `target` how much.
 * - `r` is the reward in bone, coal, sulfur and magma; `shiny` on top. `res(n)` = n of each, magma half.
 * - `optional` quests aren't needed for their category's chest (only some players can do them, or luck decides).
 *   `staff`: only an alliance's leader and officers can; `leader`: only its leader.
 * - `tmpl` / `vars` are the text: the game shows KEYS "io_qt_<tmpl>" (name) and "io_qd_<tmpl>" (what to
 *   do) with #v1#, #v2# filled from `vars` ("#...#" values are language keys themselves).
 * - `icon` is the picture: "m:<monster id>" a monster's portrait, otherwise a drawn symbol (IoQuestArt).
 * - `go` is where "Go there" takes the player (IoQuests.go). (QoL #120, 15 October: also "wart" a wart in the yard,
 *   "tower" the highest tower's upgrade, "bank" the fullest harvester, "mail" the mailbox, "decorations" the build
 *   menu's Decorations tab.)
 * - `reveal` (8 October, the user's: "some quests can appear classified so that the player can't see them until
 *   something has happened"): the quest shows only as "Classified" (no name, no task, no reward) until the value
 *   `reveal.key` reaches `reveal.at`. Classified quests are optional: whether they ever show is up to chance.
 */

export type QuestCategory = "start" | "yard" | "monsters" | "battles" | "map" | "outposts" | "alliances" | "social" | "events" | "arcade" | "pit";

export const QUEST_CATEGORIES: QuestCategory[] = ["start", "yard", "monsters", "battles", "map", "outposts", "alliances", "social", "events", "arcade", "pit"];

export type Reward = [number, number, number, number];

export interface QuestDef {
  id: string;
  cat: QuestCategory;
  parent: string | null;
  key: string;
  target: number;
  tmpl: string;
  vars?: (string | number)[];
  icon: string;
  go?: string;
  r: Reward;
  shiny?: number;
  optional?: boolean;
  /** Only the alliance's leader and officers can do it (shown as such). */
  staff?: boolean;
  /** Only the alliance's leader can do it. */
  leader?: boolean;
  /** Classified until the value `key` reaches `at` (then shown as any quest). */
  reveal?: { key: string; at: number };
}

export interface ChestDef {
  id: string;
  cat: QuestCategory | "book";
  r: Reward;
  shiny: number;
}

const res = (n: number): Reward => [n, n, n, Math.round(n / 2)];
const only = (resource: 1 | 2 | 3 | 4, n: number): Reward => [resource === 1 ? n : 0, resource === 2 ? n : 0, resource === 3 ? n : 0, resource === 4 ? n : 0];

const B = {
  bone: 1, coal: 2, sulfur: 3, magma: 4, flinger: 5, silo: 6, strongbox: 8, juicer: 9, planner: 10, maproom: 11,
  incubator: 13, hall: 14, ics: 16, sharpshooter: 21, academy: 26, catapult: 51, compound: 128, quake: 129,
  blast: 130, magmatower: 132, pit: 141, arcade: 142, coil: 144, mortar: 145, sign: 150,
} as const;

/** The Inferno towers' highest levels (client INFERNOYARDPROPS: their costs), for "a tower at its highest". */
export const TOWER_TOP: Record<number, number> = { 21: 7, 129: 6, 130: 7, 132: 6, 144: 6, 145: 6 };

/** The Inferno yard's decorations (INFERNOYARDPROPS group 4). */
export const DECORATION = (t: number) => (t >= 28 && t <= 50) || (t >= 55 && t <= 111) || (t >= 121 && t <= 126) || t === 131 || t === 135 || (t >= 146 && t <= 149);

/** The building's name in the game's language (the game's own keys; the Pit has none). */
const NAME: Record<number, string> = {
  1: "#bi_boneharvester#", 2: "#bi_coalharvester#", 3: "#bi_sulfurharvester#", 4: "#bi_magmaharverster#",
  5: "#b_flinger#", 8: "#bi_monsterlocker#", 9: "#b_monsterjuicer#", 10: "#b_yardplanner#", 11: "#b_maproom#",
  13: "#bi_hatchery#", 14: "#bi_townhall#", 16: "#b_hcc#", 21: "#bi_snipertower#", 26: "#bi_academy#", 51: "#b_catapult#",
  128: "#bi_housing#", 129: "#bi_quaketower#", 130: "#bi_cannontower#", 132: "#bi_magmatower#", 141: "Brimstone Pit",
  142: "Devil's Arcade", 144: "#bi_cindercoil#", 145: "#bi_obsidianmortar#",
  // (QoL #482: the D.A.V.E. Club's Sign; the game shows the building's own name)
  150: "Sign",
};

const build = (id: string, cat: QuestCategory, parent: string | null, type: number, icon: string, r: Reward, shiny = 0): QuestDef =>
  ({ id, cat, parent, key: `b${type}`, target: 1, tmpl: "build", vars: [NAME[type]], icon, go: `build:${type}`, r, shiny });

const level = (id: string, cat: QuestCategory, parent: string | null, type: number, lvl: number, icon: string, r: Reward, shiny = 0): QuestDef =>
  ({ id, cat, parent, key: `b${type}`, target: lvl, tmpl: "level", vars: [NAME[type], lvl], icon, go: `build:${type}`, r, shiny });

const q = (d: QuestDef): QuestDef => d;

/** The new quests' rewards (8 October), in steps like the first ones'. */
const T1 = res(200_000);
const T2 = res(500_000);
const T3 = res(1_500_000);
const T4 = res(3_000_000);
const T5 = res(6_000_000);
const T6 = res(10_000_000);

export const QUESTS: QuestDef[] = [
  // ---- Getting Started (the first hour)
  build("s_sharp", "start", null, B.sharpshooter, "tower", res(50_000)),
  build("s_compound", "start", "s_sharp", B.compound, "compound", res(50_000)),
  build("s_incubator", "start", "s_compound", B.incubator, "egg", res(50_000)),
  q({ id: "s_hatch", cat: "start", parent: "s_incubator", key: "hatch", target: 1, tmpl: "hatch_first", icon: "egg", go: "build:13", r: res(25_000) }),
  // (14 October, QoL #121: the Flinger first; "Fling your first monster" came with nothing to fling with)
  build("s_flinger", "start", "s_hatch", B.flinger, "sword", res(25_000)),
  q({ id: "s_fling", cat: "start", parent: "s_flinger", key: "fling", target: 1, tmpl: "fling", icon: "sword", go: "map", r: res(50_000), shiny: 5 }),
  // (QoL #120, 15 October: "Go there" for the quests that had none: see `go` above)
  q({ id: "s_wart", cat: "start", parent: "s_sharp", key: "wart_pick", target: 1, tmpl: "wart", icon: "wart", go: "wart", r: res(50_000) }),
  q({ id: "s_daily", cat: "start", parent: "s_wart", key: "daily_collect", target: 1, tmpl: "daily_first", icon: "gift", go: "daily", r: res(25_000) }),
  q({ id: "s_map", cat: "start", parent: "s_sharp", key: "map_open", target: 1, tmpl: "map_open", icon: "map", go: "map", r: res(25_000) }),
  q({ id: "s_chat", cat: "start", parent: "s_map", key: "chat_global", target: 1, tmpl: "chat_hello", icon: "chat", go: "chat", r: res(10_000) }),
  q({ id: "s_lb", cat: "start", parent: "s_chat", key: "lb_findme", target: 1, tmpl: "leaderboards", icon: "trophy", go: "leaderboards", r: res(10_000) }),

  // ---- Yard
  level("y_uh2", "yard", null, B.hall, 2, "hall", res(100_000)),
  level("y_uh3", "yard", "y_uh2", B.hall, 3, "hall", res(300_000)),
  level("y_uh4", "yard", "y_uh3", B.hall, 4, "hall", res(1_000_000), 10),
  level("y_uh5", "yard", "y_uh4", B.hall, 5, "hall", res(3_000_000), 10),
  level("y_uh6", "yard", "y_uh5", B.hall, 6, "hall", res(8_000_000), 10),
  build("y_blast", "yard", "y_uh3", B.blast, "tower", res(100_000)),
  build("y_quake", "yard", "y_blast", B.quake, "tower", res(200_000)),
  build("y_magmat", "yard", "y_quake", B.magmatower, "tower", res(300_000)),
  build("y_coil", "yard", "y_uh3", B.coil, "bolt", res(500_000)),
  build("y_mortar", "yard", "y_coil", B.mortar, "tower", res(500_000)),
  q({ id: "y_tower4", cat: "yard", parent: "y_blast", key: "tower_max", target: 4, tmpl: "tower_level", vars: [4], icon: "tower", go: "tower", r: res(1_000_000) }),
  q({ id: "y_tower6", cat: "yard", parent: "y_tower4", key: "tower_max", target: 6, tmpl: "tower_level", vars: [6], icon: "tower", go: "tower", r: res(5_000_000) }),
  build("y_ics", "yard", "y_uh4", B.ics, "egg", res(500_000)),
  build("y_catapult", "yard", "y_uh4", B.catapult, "catapult", res(1_000_000)),
  level("y_bone4", "yard", "y_uh2", B.bone, 4, "bone", only(1, 50_000)),
  level("y_bone7", "yard", "y_bone4", B.bone, 7, "bone", only(1, 500_000)),
  level("y_bone10", "yard", "y_bone7", B.bone, 10, "bone", only(1, 3_000_000)),
  level("y_coal4", "yard", "y_bone4", B.coal, 4, "coal", only(2, 50_000)),
  level("y_coal7", "yard", "y_coal4", B.coal, 7, "coal", only(2, 500_000)),
  level("y_coal10", "yard", "y_coal7", B.coal, 10, "coal", only(2, 3_000_000)),
  level("y_sulfur4", "yard", "y_coal4", B.sulfur, 4, "sulfur", only(3, 50_000)),
  level("y_sulfur7", "yard", "y_sulfur4", B.sulfur, 7, "sulfur", only(3, 500_000)),
  level("y_sulfur10", "yard", "y_sulfur7", B.sulfur, 10, "sulfur", only(3, 3_000_000)),
  level("y_magma4", "yard", "y_sulfur4", B.magma, 4, "magma", only(4, 50_000)),
  level("y_magma7", "yard", "y_magma4", B.magma, 7, "magma", only(4, 500_000)),
  level("y_magma10", "yard", "y_magma7", B.magma, 10, "magma", only(4, 3_000_000)),
  level("y_fl1", "yard", "y_uh2", B.flinger, 1, "catapult", res(100_000)),
  level("y_fl2", "yard", "y_fl1", B.flinger, 2, "catapult", res(500_000)),
  level("y_fl3", "yard", "y_fl2", B.flinger, 3, "catapult", res(2_000_000)),
  level("y_fl4", "yard", "y_fl3", B.flinger, 4, "catapult", res(5_000_000)),
  build("y_maproom", "yard", "y_uh2", B.maproom, "map", res(100_000)),
  build("y_planner", "yard", "y_maproom", B.planner, "scroll", res(100_000)),
  build("y_juicer", "yard", "y_planner", B.juicer, "flask", res(250_000)),
  build("y_pit", "yard", "y_uh2", B.pit, "dice", res(200_000)),
  level("y_pit5", "yard", "y_pit", B.pit, 5, "dice", res(3_000_000)),
  q({ id: "y_bank1", cat: "yard", parent: "y_uh2", key: "bank", target: 1_000, tmpl: "bank", vars: ["1,000"], icon: "coin", go: "bank", r: res(20_000) }),
  q({ id: "y_bank2", cat: "yard", parent: "y_bank1", key: "bank", target: 20_000, tmpl: "bank", vars: ["20,000"], icon: "coin", go: "bank", r: res(200_000) }),
  q({ id: "y_bank3", cat: "yard", parent: "y_bank2", key: "bank", target: 100_000, tmpl: "bank", vars: ["100,000"], icon: "coin", go: "bank", r: res(1_000_000) }),
  q({ id: "y_bank4", cat: "yard", parent: "y_bank3", key: "bank", target: 500_000, tmpl: "bank", vars: ["500,000"], icon: "coin", go: "bank", r: res(3_000_000) }),

  // ---- Monsters
  q({ id: "m_page1", cat: "monsters", parent: null, key: "page1", target: 0, tmpl: "page", vars: [1], icon: "lock", go: "build:8", r: res(100_000) }),
  q({ id: "m_page2", cat: "monsters", parent: "m_page1", key: "page2", target: 0, tmpl: "page", vars: [2], icon: "lock", go: "build:8", r: res(500_000) }),
  q({ id: "m_page3", cat: "monsters", parent: "m_page2", key: "page3", target: 0, tmpl: "page", vars: [3], icon: "lock", go: "build:8", r: res(1_500_000) }),
  q({ id: "m_page4", cat: "monsters", parent: "m_page3", key: "page4", target: 0, tmpl: "page", vars: [4], icon: "lock", go: "build:8", r: res(4_000_000), shiny: 10 }),
  q({ id: "m_page5", cat: "monsters", parent: "m_page4", key: "page5", target: 0, tmpl: "page", vars: [5], icon: "lock", go: "build:8", r: res(8_000_000), shiny: 10 }),
  q({ id: "m_korath", cat: "monsters", parent: "m_page5", key: "hatch_IC9", target: 1, tmpl: "hatch_one", vars: ["#m_korath#"], icon: "m:IC9", go: "build:13", r: res(3_000_000), shiny: 15 }),
  q({ id: "m_drull", cat: "monsters", parent: "m_page5", key: "hatch_IC10", target: 1, tmpl: "hatch_one", vars: ["#m_drull#"], icon: "m:IC10", go: "build:13", r: res(3_000_000), shiny: 15 }),
  q({ id: "m_ashkarr", cat: "monsters", parent: "m_page5", key: "hatch_IC24", target: 1, tmpl: "hatch_one", vars: ["#m_ashkarr#"], icon: "m:IC24", go: "build:13", r: res(3_000_000), shiny: 15 }),
  level("m_sb2", "monsters", "m_page1", B.strongbox, 2, "lock", res(200_000)),
  level("m_sb3", "monsters", "m_sb2", B.strongbox, 3, "lock", res(1_000_000)),
  level("m_sb4", "monsters", "m_sb3", B.strongbox, 4, "lock", res(3_000_000)),
  level("m_sb5", "monsters", "m_sb4", B.strongbox, 5, "lock", res(6_000_000)),
  level("m_ac1", "monsters", "m_page1", B.academy, 1, "book", res(100_000)),
  level("m_ac2", "monsters", "m_ac1", B.academy, 2, "book", res(500_000)),
  level("m_ac3", "monsters", "m_ac2", B.academy, 3, "book", res(1_500_000)),
  level("m_ac4", "monsters", "m_ac3", B.academy, 4, "book", res(3_000_000)),
  level("m_ac5", "monsters", "m_ac4", B.academy, 5, "book", res(6_000_000)),
  q({ id: "m_train3", cat: "monsters", parent: "m_ac1", key: "academy_max", target: 3, tmpl: "train", vars: [3], icon: "book", go: "build:26", r: res(500_000) }),
  q({ id: "m_train6", cat: "monsters", parent: "m_train3", key: "academy_max", target: 6, tmpl: "train", vars: [6], icon: "book", go: "build:26", r: res(4_000_000) }),
  q({ id: "m_hatch100", cat: "monsters", parent: "m_page1", key: "hatch_housing", target: 100, tmpl: "hatch_housing", vars: ["100"], icon: "egg", go: "build:13", r: res(100_000) }),
  q({ id: "m_hatch1k", cat: "monsters", parent: "m_hatch100", key: "hatch_housing", target: 1_000, tmpl: "hatch_housing", vars: ["1,000"], icon: "egg", go: "build:13", r: res(1_000_000) }),
  q({ id: "m_hatch10k", cat: "monsters", parent: "m_hatch1k", key: "hatch_housing", target: 10_000, tmpl: "hatch_housing", vars: ["10,000"], icon: "egg", go: "build:13", r: res(6_000_000) }),
  q({ id: "m_juice", cat: "monsters", parent: "m_hatch100", key: "juice", target: 1, tmpl: "juice_first", icon: "flask", go: "build:128", r: res(50_000) }),
  q({ id: "m_juice5k", cat: "monsters", parent: "m_juice", key: "juice_housing", target: 5_000, tmpl: "juice_housing", vars: ["5,000"], icon: "flask", go: "build:128", r: only(4, 1_000_000) }),

  // ---- Battles
  q({ id: "b_win1", cat: "battles", parent: null, key: "attack_win", target: 1, tmpl: "win_first", icon: "sword", go: "map", r: res(50_000) }),
  q({ id: "b_win10", cat: "battles", parent: "b_win1", key: "attack_win", target: 10, tmpl: "wins", vars: [10], icon: "sword", go: "map", r: res(500_000) }),
  q({ id: "b_win50", cat: "battles", parent: "b_win10", key: "attack_win", target: 50, tmpl: "wins", vars: [50], icon: "sword", go: "map", r: res(3_000_000), shiny: 10 }),
  q({ id: "b_win200", cat: "battles", parent: "b_win50", key: "attack_win", target: 200, tmpl: "wins", vars: [200], icon: "sword", go: "map", r: res(10_000_000), shiny: 25 }),
  // (13 October, the user's) the Basilisk's quest, told vaguely: at 200 battles won he joins the player's side (shown
  // in the Strongbox from then: services/events/basilisk.ts)
  q({ id: "m_basilisk", cat: "battles", parent: "b_win50", key: "attack_win", target: 200, tmpl: "basilisk", icon: "eye", go: "map", r: T5 }),
  q({ id: "b_hell", cat: "battles", parent: "b_win1", key: "win_L", target: 1, tmpl: "tribe", vars: ["Hellionnaire"], icon: "skull", go: "map", r: res(500_000) }),
  q({ id: "b_koz", cat: "battles", parent: "b_win1", key: "win_K", target: 1, tmpl: "tribe", vars: ["Kozmodeus"], icon: "skull", go: "map", r: res(500_000) }),
  q({ id: "b_aba", cat: "battles", parent: "b_win1", key: "win_A", target: 1, tmpl: "tribe", vars: ["Abaddonakki"], icon: "skull", go: "map", r: res(500_000) }),
  q({ id: "b_bee", cat: "battles", parent: "b_win1", key: "win_D", target: 1, tmpl: "tribe", vars: ["Beelzenaut"], icon: "skull", go: "map", r: res(500_000) }),
  q({ id: "b_mol46", cat: "battles", parent: "b_win10", key: "win_M46", target: 1, tmpl: "moloch", vars: [46], icon: "skull", go: "map", r: res(5_000_000), shiny: 20 }),
  q({ id: "b_mol50", cat: "battles", parent: "b_mol46", key: "win_M50", target: 1, tmpl: "moloch", vars: [50], icon: "skull", go: "map", r: res(10_000_000), shiny: 40 }),
  q({ id: "b_player", cat: "battles", parent: "b_win10", key: "attack_player", target: 1, tmpl: "attack_player", icon: "sword", go: "map", r: res(500_000) }),
  q({ id: "b_wild1", cat: "battles", parent: "b_win1", key: "wild_defended", target: 1, tmpl: "wild_first", icon: "shield", r: res(200_000) }),
  q({ id: "b_wild10", cat: "battles", parent: "b_wild1", key: "wild_defended", target: 10, tmpl: "wilds", vars: [10], icon: "shield", r: res(2_000_000) }),
  q({ id: "b_marilyn", cat: "battles", parent: "b_win10", key: "ammo_decoy", target: 1, tmpl: "ammo", vars: ["Marilyn Monstroe"], icon: "catapult", go: "build:51", r: res(300_000) }),
  q({ id: "b_jars", cat: "battles", parent: "b_marilyn", key: "ammo_jars", target: 1, tmpl: "ammo", vars: ["Candy Jars"], icon: "catapult", go: "build:51", r: res(300_000) }),
  q({ id: "b_sulfur", cat: "battles", parent: "b_jars", key: "ammo_sulfur", target: 1, tmpl: "ammo", vars: ["Sulfur Bomb"], icon: "catapult", go: "build:51", r: res(300_000) }),

  // ---- Map Room
  q({ id: "p_world", cat: "map", parent: null, key: "map_world", target: 1, tmpl: "map_world", icon: "globe", go: "map", r: res(25_000) }),
  q({ id: "p_bookmark", cat: "map", parent: "p_world", key: "bookmarks", target: 1, tmpl: "bookmark", icon: "flag", go: "map", r: res(25_000) }),
  q({ id: "p_bookmark10", cat: "map", parent: "p_bookmark", key: "bookmarks", target: 10, tmpl: "bookmarks", vars: [10], icon: "flag", go: "map", r: res(100_000) }),
  q({ id: "p_jump", cat: "map", parent: "p_world", key: "map_jump", target: 1, tmpl: "jump", icon: "map", go: "map", r: res(25_000) }),
  q({ id: "p_search", cat: "map", parent: "p_world", key: "map_search", target: 1, tmpl: "search", icon: "eye", go: "map", r: res(25_000) }),
  q({ id: "p_filters", cat: "map", parent: "p_world", key: "map_filters", target: 1, tmpl: "filters", icon: "eye", go: "map", r: res(25_000) }),
  q({ id: "p_share", cat: "map", parent: "p_world", key: "chat_share", target: 1, tmpl: "share", icon: "chat", go: "map", r: res(50_000) }),
  q({ id: "p_openlink", cat: "map", parent: "p_share", key: "map_openlink", target: 1, tmpl: "openlink", icon: "map", go: "chat", r: res(50_000) }),

  // ---- Outposts
  q({ id: "o_first", cat: "outposts", parent: null, key: "captures", target: 1, tmpl: "capture_first", icon: "outpost", go: "map", r: res(500_000), shiny: 10 }),
  q({ id: "o_hold5", cat: "outposts", parent: "o_first", key: "outposts", target: 5, tmpl: "hold", vars: [5], icon: "outpost", go: "outposts", r: res(1_000_000), shiny: 10 }),
  q({ id: "o_hold10", cat: "outposts", parent: "o_hold5", key: "outposts", target: 10, tmpl: "hold", vars: [10], icon: "outpost", go: "outposts", r: res(3_000_000), shiny: 20 }),
  q({ id: "o_hold25", cat: "outposts", parent: "o_hold10", key: "outposts", target: 25, tmpl: "hold", vars: [25], icon: "outpost", go: "outposts", r: res(8_000_000), shiny: 40 }),
  q({ id: "o_hold50", cat: "outposts", parent: "o_hold25", key: "outposts", target: 50, tmpl: "hold", vars: [50], icon: "outpost", go: "outposts", r: res(15_000_000), shiny: 60 }),
  q({ id: "o_hold100", cat: "outposts", parent: "o_hold50", key: "outposts", target: 100, tmpl: "hold", vars: [100], icon: "outpost", go: "outposts", r: res(30_000_000), shiny: 100 }),
  q({ id: "o_player", cat: "outposts", parent: "o_first", key: "captures_player", target: 1, tmpl: "capture_player", icon: "sword", go: "map", r: res(2_000_000), shiny: 15 }),
  q({ id: "o_kitsave", cat: "outposts", parent: "o_first", key: "kit_saved", target: 1, tmpl: "kit_save", icon: "scroll", go: "outposts", r: res(100_000) }),
  q({ id: "o_kitbuild", cat: "outposts", parent: "o_kitsave", key: "kit_built", target: 1, tmpl: "kit_build", icon: "scroll", go: "outposts", r: res(500_000) }),
  q({ id: "o_rate1m", cat: "outposts", parent: "o_hold5", key: "outpost_rate", target: 1_000_000, tmpl: "rate", vars: ["1,000,000"], icon: "coin", go: "outposts", r: res(2_000_000) }),
  q({ id: "o_rate10m", cat: "outposts", parent: "o_rate1m", key: "outpost_rate", target: 10_000_000, tmpl: "rate", vars: ["10,000,000"], icon: "coin", go: "outposts", r: res(10_000_000) }),

  // ---- Alliances
  q({ id: "a_join", cat: "alliances", parent: null, key: "alliance", target: 1, tmpl: "a_join", icon: "banner", go: "alliances", r: res(250_000), shiny: 10 }),
  q({ id: "a_chat", cat: "alliances", parent: "a_join", key: "chat_alliance", target: 1, tmpl: "a_chat", icon: "chat", go: "chat:alliance", r: res(50_000) }),
  q({ id: "a_board", cat: "alliances", parent: "a_chat", key: "board_read", target: 1, tmpl: "a_board", icon: "scroll", go: "alliances:6", r: res(25_000) }),
  q({ id: "a_pin", cat: "alliances", parent: "a_board", key: "pin", target: 1, tmpl: "a_pin", icon: "flag", go: "alliances:6", r: res(100_000), optional: true, staff: true }),
  q({ id: "a_invite", cat: "alliances", parent: "a_join", key: "invite_accepted", target: 1, tmpl: "a_invite", icon: "banner", go: "alliances:4", r: res(500_000), optional: true, staff: true }),
  q({ id: "a_powerup", cat: "alliances", parent: "a_join", key: "powerup", target: 1, tmpl: "a_powerup", icon: "bolt", go: "alliances:2", r: res(1_000_000), optional: true }),
  q({ id: "a_relation", cat: "alliances", parent: "a_join", key: "relation", target: 1, tmpl: "a_relation", icon: "shield", go: "alliances:0", r: res(250_000), optional: true, leader: true }),
  q({ id: "a_gain10", cat: "alliances", parent: "a_join", key: "alliance_gain7", target: 10, tmpl: "a_gain", vars: [10], icon: "outpost", go: "alliances:7", r: res(2_000_000) }),
  q({ id: "a_top3", cat: "alliances", parent: "a_gain10", key: "alliance_top3", target: 1, tmpl: "a_top3", icon: "trophy", go: "leaderboards", r: res(10_000_000), shiny: 50, optional: true }),

  // ---- Social
  q({ id: "c_global10", cat: "social", parent: null, key: "chat_global", target: 10, tmpl: "chat_times", vars: [10], icon: "chat", go: "chat", r: res(100_000) }),
  q({ id: "c_mention", cat: "social", parent: "c_global10", key: "chat_mention", target: 1, tmpl: "mention", icon: "chat", go: "chat", r: res(50_000) }),
  q({ id: "c_mail", cat: "social", parent: "c_global10", key: "mail_sent", target: 1, tmpl: "mail", icon: "mail", go: "mail", r: res(50_000) }),
  q({ id: "c_friend1", cat: "social", parent: "c_global10", key: "referrals", target: 1, tmpl: "friend", icon: "gift", go: "invite", r: res(1_000_000), optional: true }),
  q({ id: "c_friend3", cat: "social", parent: "c_friend1", key: "referrals", target: 3, tmpl: "friends", vars: [3], icon: "gift", go: "invite", r: res(3_000_000), shiny: 25, optional: true }),

  // ---- Events and daily play
  q({ id: "e_streak7", cat: "events", parent: null, key: "streak", target: 7, tmpl: "streak", vars: [7], icon: "star", go: "daily", r: res(500_000) }),
  q({ id: "e_streak14", cat: "events", parent: "e_streak7", key: "streak", target: 14, tmpl: "streak", vars: [14], icon: "star", go: "daily", r: res(2_000_000) }),
  q({ id: "e_streak28", cat: "events", parent: "e_streak14", key: "streak", target: 28, tmpl: "streak", vars: [28], icon: "star", go: "daily", r: res(6_000_000) }),
  q({ id: "e_wart50", cat: "events", parent: null, key: "wart_pick", target: 50, tmpl: "warts", vars: [50], icon: "wart", go: "wart", r: res(200_000) }),
  q({ id: "e_wart500", cat: "events", parent: "e_wart50", key: "wart_pick", target: 500, tmpl: "warts", vars: [500], icon: "wart", go: "wart", r: res(2_000_000) }),
  q({ id: "e_golden", cat: "events", parent: "e_wart50", key: "golden_wart", target: 1, tmpl: "golden", icon: "wart", go: "wart", r: res(100_000) }),
  q({ id: "e_gate1", cat: "events", parent: null, key: "gauntlet_best", target: 1, tmpl: "gate", vars: [1], icon: "skull", go: "gauntlet", r: res(1_000_000) }),
  q({ id: "e_gate7", cat: "events", parent: "e_gate1", key: "gauntlet_best", target: 7, tmpl: "gate", vars: [7], icon: "skull", go: "gauntlet", r: res(5_000_000) }),
  q({ id: "e_gate13", cat: "events", parent: "e_gate7", key: "gauntlet_best", target: 13, tmpl: "gate13", icon: "skull", go: "gauntlet", r: res(15_000_000), shiny: 50 }),

  // ---- Brimstone Pit (resources only: playing for a quest never makes money)
  q({ id: "x_drop", cat: "pit", parent: null, key: "pit_magmadrop", target: 1, tmpl: "pit_game", vars: ["Magma Drop"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_scratch", cat: "pit", parent: "x_drop", key: "pit_scratch", target: 1, tmpl: "pit_game", vars: ["Brimstone Scratchers"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_roulette", cat: "pit", parent: "x_scratch", key: "pit_roulette", target: 1, tmpl: "pit_game", vars: ["Wormzer Roulette"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_bonepile", cat: "pit", parent: "x_roulette", key: "pit_bonepile", target: 1, tmpl: "pit_game", vars: ["Bone Pile"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_slots", cat: "pit", parent: "x_bonepile", key: "pit_slots", target: 1, tmpl: "pit_game", vars: ["Magma Slots"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_ascent", cat: "pit", parent: "x_slots", key: "pit_ascent", target: 1, tmpl: "pit_game", vars: ["Balthazar's Ascent"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_derby", cat: "pit", parent: "x_ascent", key: "pit_derby", target: 1, tmpl: "pit_game", vars: ["Magma Derby"], icon: "dice", go: "pit", r: res(100_000) }),
  q({ id: "x_rounds", cat: "pit", parent: "x_drop", key: "pit_rounds", target: 100, tmpl: "pit_rounds", vars: [100], icon: "dice", go: "pit", r: res(1_000_000) }),
  q({ id: "x_jackpot", cat: "pit", parent: "x_slots", key: "pit_jackpot", target: 1, tmpl: "pit_jackpot", icon: "coin", go: "pit", r: res(2_000_000), optional: true }),
  // =====================================================================================================
  // 8 October: the book roughly doubled (the user's picks of 180 ideas, with their changes). Classified
  // quests (`reveal`) show as "Classified" until something has happened; they are optional.

  // ---- Yard
  q({ id: "y_tower_top", cat: "yard", parent: "y_tower6", key: "tower_maxed", target: 1, tmpl: "tower_maxed", icon: "tower", go: "tower", r: T4, shiny: 10 }),
  level("y_coil5", "yard", "y_coil", B.coil, 5, "bolt", T3),
  level("y_mortar5", "yard", "y_mortar", B.mortar, 5, "tower", T3),
  level("y_quake5", "yard", "y_quake", B.quake, 5, "tower", T3),
  level("y_magmat5", "yard", "y_magmat", B.magmatower, 5, "tower", T3),
  q({ id: "y_blocks50", cat: "yard", parent: "y_uh2", key: "count_b17", target: 50, tmpl: "blocks", vars: [50], icon: "outpost", go: "build:17", r: T1 }),
  q({ id: "y_blocks250", cat: "yard", parent: "y_blocks50", key: "count_b17", target: 250, tmpl: "blocks", vars: [250], icon: "outpost", go: "build:17", r: T3 }),
  q({ id: "y_traps10", cat: "yard", parent: "y_uh2", key: "count_b24", target: 10, tmpl: "traps", vars: [10], icon: "skull", go: "build:24", r: T1 }),
  q({ id: "y_traps30", cat: "yard", parent: "y_traps10", key: "count_b24", target: 30, tmpl: "traps", vars: [30], icon: "skull", go: "build:24", r: T2 }),
  q({ id: "y_layout", cat: "yard", parent: "y_planner", key: "planner_apply", target: 1, tmpl: "planner_apply", icon: "scroll", go: "planner", r: T1 }),
  q({ id: "y_blueprint", cat: "yard", parent: "y_layout", key: "planner_save", target: 1, tmpl: "planner_save", icon: "scroll", go: "planner", r: T1 }),
  q({ id: "y_deco10", cat: "yard", parent: "y_uh2", key: "count_deco", target: 10, tmpl: "decorations", vars: [10], icon: "star", go: "decorations", r: T1 }),
  // (QoL #482, 15 October: the D.A.V.E. Club's Sign, a free decoration anyone can put up; optional, so no chest waits on
  // it. Counted from the yard's save as any building: b150.)
  { ...build("y_sign", "yard", "y_uh2", B.sign, "scroll", res(50_000)), optional: true },
  q({ id: "y_recycle", cat: "yard", parent: "y_uh2", key: "recycle", target: 1, tmpl: "recycle", icon: "coin", r: res(50_000) }),
  q({ id: "y_capped", cat: "yard", parent: "y_bank1", key: "capped", target: 1, tmpl: "capped", icon: "bone", go: "bank", r: T1 }),
  level("y_catapult4", "yard", "y_catapult", B.catapult, 4, "catapult", T4),
  level("y_inc3", "yard", "y_uh3", B.incubator, 3, "egg", T2),
  build("y_arcade", "yard", "y_uh2", B.arcade, "joystick", T1),
  level("y_pit6", "yard", "y_pit5", B.pit, 6, "dice", T5, 10),
  q({ id: "y_workers", cat: "yard", parent: "y_uh3", key: "workers_all", target: 1, tmpl: "workers_all", icon: "hall", r: T1 }),
  q({ id: "y_spend", cat: "yard", parent: "y_bank4", key: "spend_day", target: 50_000_000, tmpl: "spend_day", vars: ["50,000,000"], icon: "coin", r: T5, optional: true, reveal: { key: "res_peak", at: 50_000_000 } }),
  q({ id: "y_hoard", cat: "yard", parent: "y_capped", key: "allcap_hours", target: 24, tmpl: "hoarder", vars: [24], icon: "magma", go: "bank", r: T5, optional: true, reveal: { key: "allcap_seen", at: 1 } }),

  // ---- Monsters
  q({ id: "m_spurtz", cat: "monsters", parent: "m_page1", key: "hatch_IC1", target: 1, tmpl: "hatch_one", vars: ["#m_spurtz#"], icon: "m:IC1", go: "build:13", r: T1 }),
  q({ id: "m_zagnoid", cat: "monsters", parent: "m_page1", key: "hatch_IC2", target: 1, tmpl: "hatch_one", vars: ["#m_zagnoid#"], icon: "m:IC2", go: "build:13", r: T1 }),
  q({ id: "m_valgos", cat: "monsters", parent: "m_page2", key: "hatch_IC4", target: 1, tmpl: "hatch_one", vars: ["#m_valgos#"], icon: "m:IC4", go: "build:13", r: T2 }),
  q({ id: "m_balthazar", cat: "monsters", parent: "m_page3", key: "hatch_IC5", target: 1, tmpl: "hatch_one", vars: ["#m_balthazar#"], icon: "m:IC5", go: "build:13", r: T2 }),
  q({ id: "m_sabnox", cat: "monsters", parent: "m_page3", key: "hatch_IC7", target: 1, tmpl: "hatch_one", vars: ["#m_sabnox#"], icon: "m:IC7", go: "build:13", r: T3 }),
  q({ id: "m_rezghul", cat: "monsters", parent: "m_page4", key: "hatch_C19", target: 1, tmpl: "hatch_one", vars: ["#m_rezghul#"], icon: "m:C19", go: "build:13", r: T3, optional: true }),
  q({ id: "m_fullhouse", cat: "monsters", parent: "m_hatch100", key: "housing_full", target: 1, tmpl: "housing_full", icon: "compound", go: "build:128", r: T2 }),
  q({ id: "m_army200", cat: "monsters", parent: "m_fullhouse", key: "housed", target: 200, tmpl: "housed", vars: [200], icon: "compound", go: "build:128", r: T3 }),
  q({ id: "m_hatch50k", cat: "monsters", parent: "m_hatch10k", key: "hatch_housing", target: 50_000, tmpl: "hatch_housing", vars: ["50,000"], icon: "egg", go: "build:13", r: T5, shiny: 10 }),
  q({ id: "m_juice50k", cat: "monsters", parent: "m_juice5k", key: "juice_housing", target: 50_000, tmpl: "juice_housing", vars: ["50,000"], icon: "flask", go: "build:128", r: T5 }),
  q({ id: "m_ics", cat: "monsters", parent: "m_hatch100", key: "ics_queue", target: 1, tmpl: "ics_queue", vars: ["#b_hcc#"], icon: "egg", go: "build:16", r: T1 }),
  q({ id: "m_rounded", cat: "monsters", parent: "m_train3", key: "academy_3", target: 5, tmpl: "academy_n", vars: [5, 3], icon: "book", go: "build:26", r: T3 }),
  q({ id: "m_collector", cat: "monsters", parent: "m_page5", key: "hatch_kinds", target: 0, tmpl: "collector", icon: "egg", go: "build:13", r: T6, shiny: 25, optional: true, reveal: { key: "page5_done", at: 1 } }),
  q({ id: "m_bigthree", cat: "monsters", parent: "m_page5", key: "big_three", target: 1, tmpl: "big_three", vars: ["#m_korath#", "#m_drull#", "#m_ashkarr#"], icon: "m:IC9", go: "build:128", r: T5, optional: true, reveal: { key: "hatch_big", at: 1 } }),

  // ---- Battles
  q({ id: "b_total", cat: "battles", parent: "b_win10", key: "attack_total", target: 1, tmpl: "total", icon: "skull", go: "map", r: T3 }),
  q({ id: "b_flawless", cat: "battles", parent: "b_win10", key: "attack_flawless", target: 1, tmpl: "flawless", icon: "shield", go: "map", r: T3 }),
  q({ id: "b_hell10", cat: "battles", parent: "b_hell", key: "win_L", target: 10, tmpl: "tribe_n", vars: ["Hellionnaire", 10], icon: "skull", go: "map", r: T3 }),
  q({ id: "b_koz10", cat: "battles", parent: "b_koz", key: "win_K", target: 10, tmpl: "tribe_n", vars: ["Kozmodeus", 10], icon: "skull", go: "map", r: T3 }),
  q({ id: "b_aba10", cat: "battles", parent: "b_aba", key: "win_A", target: 10, tmpl: "tribe_n", vars: ["Abaddonakki", 10], icon: "skull", go: "map", r: T3 }),
  q({ id: "b_bee10", cat: "battles", parent: "b_bee", key: "win_D", target: 10, tmpl: "tribe_n", vars: ["Beelzenaut", 10], icon: "skull", go: "map", r: T3 }),
  q({ id: "b_tribetop", cat: "battles", parent: "b_win50", key: "tribe_top_kinds", target: 4, tmpl: "tribe_max", icon: "trophy", go: "map", r: T5, shiny: 10 }),
  q({ id: "b_revenge", cat: "battles", parent: "b_player", key: "revenge", target: 1, tmpl: "revenge", icon: "sword", go: "map", r: T3, optional: true, reveal: { key: "attacked_by_player", at: 1 } }),
  q({ id: "b_standfirm", cat: "battles", parent: "b_wild1", key: "defended_player", target: 1, tmpl: "stand_firm", icon: "shield", r: T2, optional: true }),
  q({ id: "b_wild50", cat: "battles", parent: "b_wild10", key: "wild_defended", target: 50, tmpl: "wilds", vars: [50], icon: "shield", r: T4 }),
  q({ id: "b_arsenal", cat: "battles", parent: "b_sulfur", key: "ammo_kinds", target: 3, tmpl: "arsenal", icon: "catapult", go: "build:51", r: T3 }),
  q({ id: "b_fling1k", cat: "battles", parent: "b_win10", key: "fling_monsters", target: 1_000, tmpl: "fling_n", vars: ["1,000"], icon: "catapult", go: "map", r: T3 }),
  q({ id: "b_loot10m", cat: "battles", parent: "b_win50", key: "loot", target: 10_000_000, tmpl: "loot_n", vars: ["10,000,000"], icon: "coin", go: "map", r: T5 }),
  q({ id: "b_towers100", cat: "battles", parent: "b_win50", key: "towers_destroyed", target: 100, tmpl: "towers_n", vars: [100], icon: "tower", go: "map", r: T4 }),
  q({ id: "b_hall", cat: "battles", parent: "b_player", key: "player_hall", target: 1, tmpl: "player_hall", icon: "hall", go: "map", r: T3, optional: true }),
  q({ id: "b_replay", cat: "battles", parent: "b_win1", key: "replay", target: 1, tmpl: "replay", icon: "eye", go: "attacklog", r: res(50_000) }),
  q({ id: "b_bane", cat: "battles", parent: "b_mol50", key: "win_M50_flawless", target: 1, tmpl: "moloch_bane", icon: "skull", go: "map", r: T6, shiny: 25, optional: true, reveal: { key: "win_M50", at: 1 } }),
  q({ id: "b_exterminator", cat: "battles", parent: "b_towers100", key: "buildings_destroyed", target: 10_000, tmpl: "buildings_n", vars: ["10,000"], icon: "skull", go: "map", r: T6, shiny: 25, optional: true, reveal: { key: "buildings_destroyed", at: 1_000 } }),

  // ---- Map Room
  q({ id: "p_views50", cat: "map", parent: "p_world", key: "map_views", target: 50, tmpl: "map_views", vars: [50], icon: "eye", go: "map", r: T1 }),
  q({ id: "p_bookmark25", cat: "map", parent: "p_bookmark10", key: "bookmarks", target: 25, tmpl: "bookmarks", vars: [25], icon: "flag", go: "map", r: T1 }),
  q({ id: "p_depths", cat: "map", parent: "p_world", key: "depths", target: 1, tmpl: "depths", icon: "skull", go: "map", r: T1 }),
  q({ id: "p_reach", cat: "map", parent: "p_jump", key: "long_reach", target: 1, tmpl: "long_reach", vars: [20], icon: "catapult", go: "map", r: T1 }),
  q({ id: "p_depths_op", cat: "map", parent: "p_depths", key: "capture_depths", target: 1, tmpl: "depths_outpost", icon: "outpost", go: "map", r: T4, optional: true, reveal: { key: "depths", at: 1 } }),

  // ---- Outposts
  q({ id: "o_hold150", cat: "outposts", parent: "o_hold100", key: "outposts", target: 150, tmpl: "hold", vars: [150], icon: "outpost", go: "outposts", r: T5, shiny: 10 }),
  q({ id: "o_hold250", cat: "outposts", parent: "o_hold150", key: "outposts", target: 250, tmpl: "hold", vars: [250], icon: "outpost", go: "outposts", r: T6, shiny: 25 }),
  q({ id: "o_kitbuild5", cat: "outposts", parent: "o_kitbuild", key: "kit_built", target: 5, tmpl: "kits_build_n", vars: [5], icon: "scroll", go: "outposts", r: T3 }),
  q({ id: "o_defend", cat: "outposts", parent: "o_hold5", key: "outpost_defended", target: 1, tmpl: "outpost_defend", icon: "shield", go: "outposts", r: T3, optional: true }),
  q({ id: "o_retake", cat: "outposts", parent: "o_player", key: "outpost_retaken", target: 1, tmpl: "retake", icon: "flag", go: "map", r: T3, optional: true, reveal: { key: "outpost_lost", at: 1 } }),
  q({ id: "o_rate50m", cat: "outposts", parent: "o_rate10m", key: "outpost_rate", target: 50_000_000, tmpl: "rate", vars: ["50,000,000"], icon: "coin", go: "outposts", r: T6, shiny: 10 }),
  q({ id: "o_tribe40", cat: "outposts", parent: "o_hold10", key: "capture_tribe40", target: 1, tmpl: "tribe40", vars: [40], icon: "skull", go: "map", r: T4 }),
  q({ id: "o_kitsave3", cat: "outposts", parent: "o_kitsave", key: "kit_saved", target: 3, tmpl: "kits_save_n", vars: [3], icon: "scroll", go: "outposts", r: T2 }),

  // ---- Alliances
  q({ id: "a_officer", cat: "alliances", parent: "a_join", key: "promote_any", target: 1, tmpl: "promote", icon: "banner", go: "alliances", r: T1, optional: true }),
  q({ id: "a_posts10", cat: "alliances", parent: "a_pin", key: "pin", target: 10, tmpl: "posts", vars: [10], icon: "scroll", go: "alliances:6", r: T2 }),
  q({ id: "a_powerup5", cat: "alliances", parent: "a_powerup", key: "powerup", target: 5, tmpl: "powerups", vars: [5], icon: "bolt", go: "alliances:2", r: T3, optional: true, staff: true }),
  q({ id: "a_gain50", cat: "alliances", parent: "a_gain10", key: "alliance_gain7", target: 50, tmpl: "a_gain", vars: [50], icon: "outpost", go: "alliances:7", r: T4 }),
  q({ id: "a_feud", cat: "alliances", parent: "a_relation", key: "feud", target: 1, tmpl: "feud", icon: "sword", go: "map", r: T3, optional: true }),
  q({ id: "a_diplomat", cat: "alliances", parent: "a_relation", key: "relations", target: 3, tmpl: "relations_n", vars: [3], icon: "shield", go: "alliances:0", r: T2, optional: true, staff: true }),
  q({ id: "a_loyal", cat: "alliances", parent: "a_join", key: "alliance_days", target: 90, tmpl: "loyal", vars: [90], icon: "banner", go: "alliances", r: T4, optional: true, reveal: { key: "alliance_days", at: 30 } }),

  // ---- Social
  q({ id: "c_global100", cat: "social", parent: "c_global10", key: "chat_global", target: 100, tmpl: "chat_times", vars: [100], icon: "chat", go: "chat", r: T1 }),
  q({ id: "c_global1k", cat: "social", parent: "c_global100", key: "chat_global", target: 1_000, tmpl: "chat_times", vars: ["1,000"], icon: "chat", go: "chat", r: T3 }),
  q({ id: "c_mail10", cat: "social", parent: "c_mail", key: "mail_sent", target: 10, tmpl: "mails", vars: [10], icon: "mail", go: "mail", r: T1 }),
  q({ id: "c_friend5", cat: "social", parent: "c_friend3", key: "referrals", target: 5, tmpl: "friends", vars: [5], icon: "gift", go: "invite", r: T4, shiny: 10 }),
  q({ id: "c_friend10", cat: "social", parent: "c_friend5", key: "referrals", target: 10, tmpl: "friends", vars: [10], icon: "gift", go: "invite", r: T5, shiny: 25 }),
  q({ id: "c_popular", cat: "social", parent: "c_mention", key: "mentioned", target: 1, tmpl: "popular", icon: "chat", go: "chat", r: T1 }),
  q({ id: "c_changelog", cat: "social", parent: null, key: "changelog", target: 1, tmpl: "changelog", icon: "scroll", go: "changelog", r: res(50_000) }),

  // ---- Events and daily play
  q({ id: "e_streak100", cat: "events", parent: "e_streak28", key: "streak", target: 100, tmpl: "streak", vars: [100], icon: "star", go: "daily", r: T6, shiny: 25, optional: true, reveal: { key: "streak", at: 28 } }),
  q({ id: "e_golden5", cat: "events", parent: "e_golden", key: "golden_wart", target: 5, tmpl: "golden_n", vars: [5], icon: "wart", go: "wart", r: T4, optional: true, reveal: { key: "golden_wart", at: 1 } }),
  q({ id: "e_gate3", cat: "events", parent: "e_gate1", key: "gauntlet_best", target: 3, tmpl: "gate", vars: [3], icon: "skull", go: "gauntlet", r: T2 }),
  q({ id: "e_gate10", cat: "events", parent: "e_gate7", key: "gauntlet_best", target: 10, tmpl: "gate", vars: [10], icon: "skull", go: "gauntlet", r: T5 }),
  q({ id: "e_gate13x", cat: "events", parent: "e_gate13", key: "gate13_nocat", target: 1, tmpl: "gate13_nocat", icon: "catapult", go: "gauntlet", r: T6, shiny: 25, optional: true, reveal: { key: "gauntlet_best", at: 13 } }),
  q({ id: "e_daily10", cat: "events", parent: null, key: "daily_done", target: 10, tmpl: "daily_n", vars: [10], icon: "star", go: "daily_quests", r: T1 }),
  q({ id: "e_daily50", cat: "events", parent: "e_daily10", key: "daily_done", target: 50, tmpl: "daily_n", vars: [50], icon: "star", go: "daily_quests", r: T3 }),
  q({ id: "e_daily200", cat: "events", parent: "e_daily50", key: "daily_done", target: 200, tmpl: "daily_n", vars: [200], icon: "star", go: "daily_quests", r: T5, shiny: 10 }),
  q({ id: "e_wildnight", cat: "events", parent: null, key: "wild_flawless", target: 1, tmpl: "wild_flawless", icon: "shield", r: T2 }),
  q({ id: "e_nightowl", cat: "events", parent: null, key: "night_owl", target: 1, tmpl: "night_owl", icon: "moon", r: T2, optional: true, reveal: { key: "night_reveal", at: 1 } }),
  q({ id: "e_master", cat: "events", parent: null, key: "book_all", target: 0, tmpl: "master", icon: "trophy", r: res(25_000_000), shiny: 100, optional: true, reveal: { key: "chests_all", at: 1 } }),

  // ---- Devil's Arcade (resources only, as the Pit's)
  q({ id: "r_play5", cat: "arcade", parent: null, key: "ar_games", target: 5, tmpl: "arcade_played", vars: [5], icon: "joystick", go: "arcade", r: T1 }),
  q({ id: "r_playall", cat: "arcade", parent: "r_play5", key: "ar_games", target: 15, tmpl: "arcade_all", icon: "joystick", go: "arcade", r: T3 }),
  q({ id: "r_hg10", cat: "arcade", parent: null, key: "hg_wave", target: 10, tmpl: "hg_wave", vars: [10], icon: "tower", go: "arcade:hellgate", r: T1 }),
  q({ id: "r_hg25", cat: "arcade", parent: "r_hg10", key: "hg_wave", target: 25, tmpl: "hg_wave", vars: [25], icon: "tower", go: "arcade:hellgate", r: T2 }),
  q({ id: "r_hg50", cat: "arcade", parent: "r_hg25", key: "hg_wave", target: 50, tmpl: "hg_wave", vars: [50], icon: "tower", go: "arcade:hellgate", r: T4 }),
  q({ id: "r_hg60", cat: "arcade", parent: "r_hg50", key: "hg_wave", target: 60, tmpl: "hg_wave", vars: [60], icon: "tower", go: "arcade:hellgate", r: T5 }),
  q({ id: "r_hgvs", cat: "arcade", parent: "r_hg10", key: "ar_hellgate_versus_wins", target: 1, tmpl: "hg_versus", icon: "sword", go: "arcade:hellgate", r: T2 }),
  q({ id: "r_hgcoop", cat: "arcade", parent: "r_hg25", key: "ar_hellgate_coop_best", target: 30, tmpl: "hg_coop", vars: [30], icon: "banner", go: "arcade:hellgate", r: T3 }),
  q({ id: "r_siege", cat: "arcade", parent: null, key: "ar_siege_daily_runs", target: 1, tmpl: "siege_daily", icon: "catapult", go: "arcade:siege", r: T1 }),
  q({ id: "r_duel", cat: "arcade", parent: "r_siege", key: "ar_siege_duel_wins", target: 1, tmpl: "siege_duel", icon: "sword", go: "arcade:siege", r: T2 }),
  q({ id: "r_wreck", cat: "arcade", parent: "r_siege", key: "siege_wreck", target: 1_000, tmpl: "siege_wreck", icon: "skull", go: "arcade:siege", r: T3 }),
  q({ id: "r_worm500", cat: "arcade", parent: "r_play5", key: "ar_wormzer_len", target: 500, tmpl: "worm_len", vars: [500], icon: "m:IC8", go: "arcade:wormzer", r: T2 }),
  q({ id: "r_wormkills", cat: "arcade", parent: "r_worm500", key: "ar_wormzer_kills", target: 5, tmpl: "worm_kills", vars: [5], icon: "m:IC8", go: "arcade:wormzer", r: T2 }),
  q({ id: "r_fusebug", cat: "arcade", parent: "r_play5", key: "ar_fusebug_wins", target: 1, tmpl: "arcade_win", vars: ["Fusebug Blast"], icon: "m:IC15", go: "arcade:fusebug", r: T2 }),
  q({ id: "r_flight", cat: "arcade", parent: "r_play5", key: "ar_flight_score", target: 2_000, tmpl: "arcade_score", vars: ["Balthazar's Flight", "2,000"], icon: "m:IC5", go: "arcade:flight", r: T2 }),
  q({ id: "r_smash", cat: "arcade", parent: "r_play5", key: "ar_smash_chain", target: 20, tmpl: "smash_chain", vars: [20], icon: "m:IC1", go: "arcade:smash", r: T2 }),
  q({ id: "r_breakout", cat: "arcade", parent: "r_play5", key: "ar_breakout_level", target: 5, tmpl: "breakout_level", vars: [5], icon: "outpost", go: "arcade:breakout", r: T2 }),
  q({ id: "r_lava", cat: "arcade", parent: "r_play5", key: "ar_lavafloor_wins", target: 1, tmpl: "arcade_win", vars: ["Lava Floor"], icon: "magma", go: "arcade:lavafloor", r: T2 }),
  q({ id: "r_lava10", cat: "arcade", parent: "r_lava", key: "ar_lavafloor_wins", target: 10, tmpl: "arcade_wins", vars: ["Lava Floor", 10], icon: "magma", go: "arcade:lavafloor", r: T4, optional: true, reveal: { key: "ar_lavafloor_wins", at: 1 } }),
  q({ id: "r_brawl", cat: "arcade", parent: "r_play5", key: "ar_bonebrawl_wins", target: 1, tmpl: "arcade_win", vars: ["Bone Brawl"], icon: "bone", go: "arcade:bonebrawl", r: T2 }),
  q({ id: "r_shutout", cat: "arcade", parent: "r_play5", key: "hockey_shutout", target: 1, tmpl: "hockey_shutout", icon: "trophy", go: "arcade:hockey", r: T3 }),
  q({ id: "r_soul", cat: "arcade", parent: "r_play5", key: "soul_caps", target: 3, tmpl: "soul_caps", vars: [3], icon: "flag", go: "arcade:soulsnatch", r: T3 }),
  q({ id: "r_quad", cat: "arcade", parent: "r_play5", key: "stack_quad", target: 1, tmpl: "stack_quad", icon: "bone", go: "arcade:stack", r: T2 }),
  q({ id: "r_rows", cat: "arcade", parent: "r_quad", key: "ar_stack_rows", target: 100, tmpl: "stack_rows", vars: [100], icon: "bone", go: "arcade:stack", r: T3 }),
  q({ id: "r_swarm", cat: "arcade", parent: "r_play5", key: "ar_swarm_wave", target: 20, tmpl: "swarm_wave", vars: [20], icon: "m:IC1", go: "arcade:swarm", r: T3 }),
  q({ id: "r_runner", cat: "arcade", parent: "r_play5", key: "ar_runner_metres", target: 2_000, tmpl: "runner_m", vars: ["2,000"], icon: "m:C19", go: "arcade:runner", r: T3 }),
  q({ id: "r_ace", cat: "arcade", parent: "r_play5", key: "ar_golf_aces", target: 1, tmpl: "golf_ace", icon: "flag", go: "arcade:golf", r: T2 }),
  q({ id: "r_par", cat: "arcade", parent: "r_ace", key: "golf_daily_par", target: 1, tmpl: "golf_par", vars: [18], icon: "flag", go: "arcade:golf", r: T3 }),
  q({ id: "r_pvp", cat: "arcade", parent: "r_play5", key: "arcade_pvp_win", target: 1, tmpl: "pvp_win", icon: "sword", go: "arcade", r: T2, optional: true }),
  q({ id: "r_top10", cat: "arcade", parent: "r_playall", key: "arcade_top10", target: 1, tmpl: "top10", icon: "trophy", go: "arcade", r: T4 }),
  q({ id: "r_legend", cat: "arcade", parent: "r_top10", key: "arcade_top1_days", target: 7, tmpl: "legend", vars: [7], icon: "trophy", go: "arcade", r: T6, optional: true, reveal: { key: "arcade_top1", at: 1 } }),

  // ---- Brimstone Pit (resources only)
  q({ id: "x_fortune", cat: "pit", parent: "x_slots", key: "pit_fortune", target: 1, tmpl: "pit_game", vars: ["Korath's Fortune"], icon: "dice", go: "pit", r: T1 }),
  q({ id: "x_dice", cat: "pit", parent: "x_slots", key: "pit_dice", target: 1, tmpl: "pit_game", vars: ["Devil's Dice"], icon: "dice", go: "pit", r: T1 }),
  q({ id: "x_hilo", cat: "pit", parent: "x_drop", key: "pit_hilo", target: 1, tmpl: "pit_game", vars: ["Higher or Lower"], icon: "dice", go: "pit", r: T1 }),
  q({ id: "x_cinder", cat: "pit", parent: "x_roulette", key: "pit_blackjack", target: 1, tmpl: "pit_game", vars: ["Cinderjack"], icon: "dice", go: "pit", r: T1 }),
  q({ id: "x_deal", cat: "pit", parent: "x_slots", key: "pit_deal", target: 1, tmpl: "pit_game", vars: ["The Undertaker's Offer"], icon: "dice", go: "pit", r: T1 }),
  q({ id: "x_favor", cat: "pit", parent: "x_drop", key: "pit_favor", target: 1, tmpl: "favor", icon: "gift", go: "pit", r: T1 }),
  q({ id: "x_favor7", cat: "pit", parent: "x_favor", key: "favor_streak", target: 7, tmpl: "favor_streak", vars: [7], icon: "gift", go: "pit", r: T3 }),
  q({ id: "x_natural", cat: "pit", parent: "x_cinder", key: "bj_natural", target: 1, tmpl: "bj_natural", icon: "dice", go: "pit", r: T1 }),
  q({ id: "x_split", cat: "pit", parent: "x_natural", key: "bj_split2", target: 1, tmpl: "bj_split", icon: "dice", go: "pit", r: T2 }),
  q({ id: "x_hilo5", cat: "pit", parent: "x_hilo", key: "hilo_best", target: 5, tmpl: "hilo_row", vars: [5], icon: "dice", go: "pit", r: T2 }),
  q({ id: "x_hilo10", cat: "pit", parent: "x_hilo5", key: "hilo_best", target: 10, tmpl: "hilo_row", vars: [10], icon: "eye", go: "pit", r: T4, optional: true, reveal: { key: "hilo_best", at: 5 } }),
  q({ id: "x_grave", cat: "pit", parent: "x_deal", key: "deal_keep", target: 1, tmpl: "to_grave", icon: "skull", go: "pit", r: T1 }),
  q({ id: "x_takedeal", cat: "pit", parent: "x_deal", key: "deal_deal", target: 1, tmpl: "deal", icon: "coin", go: "pit", r: T1 }),
  q({ id: "x_lastlaugh", cat: "pit", parent: "x_takedeal", key: "deal_top", target: 1, tmpl: "last_laugh", icon: "skull", go: "pit", r: T4, optional: true, reveal: { key: "deal_under", at: 1 } }),
  q({ id: "x_brave", cat: "pit", parent: "x_dice", key: "dice_brave", target: 1, tmpl: "dice_brave", vars: [5], icon: "dice", go: "pit", r: T2 }),
  q({ id: "x_high", cat: "pit", parent: "x_ascent", key: "ascent_10", target: 1, tmpl: "ascent_10", vars: [10], icon: "bolt", go: "pit", r: T2 }),
  q({ id: "x_long", cat: "pit", parent: "x_derby", key: "derby_long", target: 1, tmpl: "derby_long", icon: "trophy", go: "pit", r: T3 }),
  q({ id: "x_king", cat: "pit", parent: "x_roulette", key: "roulette_king", target: 1, tmpl: "roulette_king", icon: "m:IC8", go: "pit", r: T2 }),
  q({ id: "x_rounds1k", cat: "pit", parent: "x_rounds", key: "pit_rounds", target: 1_000, tmpl: "pit_rounds", vars: ["1,000"], icon: "dice", go: "pit", r: T3 }),
  q({ id: "x_headline", cat: "pit", parent: "x_rounds", key: "pit_headline", target: 1, tmpl: "headline", icon: "chat", go: "pit", r: T2 }),
  q({ id: "x_comeback", cat: "pit", parent: "x_rounds", key: "pit_comeback", target: 1, tmpl: "lucky_streak", vars: [10], icon: "star", go: "pit", r: T2, optional: true, reveal: { key: "pit_lose10", at: 1 } }),
  q({ id: "x_jackpot2", cat: "pit", parent: "x_jackpot", key: "pit_jackpot", target: 2, tmpl: "jackpot_n", vars: [2], icon: "coin", go: "pit", r: T4, optional: true, reveal: { key: "pit_jackpot", at: 1 } }),
];

/** Finishing every (non-optional) quest of a category opens its chest; finishing every chest, the book's. */
export const CHESTS: ChestDef[] = [
  { id: "chest_start", cat: "start", r: res(250_000), shiny: 25 },
  { id: "chest_yard", cat: "yard", r: res(10_000_000), shiny: 50 },
  { id: "chest_monsters", cat: "monsters", r: res(10_000_000), shiny: 50 },
  { id: "chest_battles", cat: "battles", r: res(15_000_000), shiny: 75 },
  { id: "chest_map", cat: "map", r: res(500_000), shiny: 15 },
  { id: "chest_outposts", cat: "outposts", r: res(20_000_000), shiny: 100 },
  { id: "chest_alliances", cat: "alliances", r: res(5_000_000), shiny: 50 },
  { id: "chest_social", cat: "social", r: res(1_000_000), shiny: 20 },
  { id: "chest_events", cat: "events", r: res(10_000_000), shiny: 50 },
  // (the arcade's: resources only, as its quests)
  { id: "chest_arcade", cat: "arcade", r: res(8_000_000), shiny: 0 },
  { id: "chest_book", cat: "book", r: res(25_000_000), shiny: 150 },
];

/** Strongbox pages (Inferno): the monsters a page's quest needs unlocked. Rezghul only while he is enabled. */
export const STRONGBOX_PAGES: Record<number, string[]> = {
  1: ["IC1", "IC2", "IC15"],
  2: ["IC3", "IC4", "IC12"],
  3: ["IC5", "IC6", "IC7", "IC14"],
  4: ["IC8", "IC20", "C19"],
  5: ["IC9", "IC10", "IC24"],
};

/**
 * Daily quests: three a day from this pool, picked per player and UTC day, from the ones the player can do
 * (`needs`: "b<type>" a building in the main yard, "level3" yard level 3 or more for wild monster attacks,
 * "shiny" shiny not switched off; QoL #119: "wildtoday" the next wild monster attack can come before midnight UTC).
 * The day's pick is kept, so it doesn't change when the yard does (one free reroll a day swaps one: questReroll).
 */
export interface DailyDef {
  id: string;
  needs?: string[];
  key: string;
  target: number;
  tmpl: string;
  icon: string;
  go?: string;
  r: Reward;
  shiny: number;
}

export const DAILY_POOL: DailyDef[] = [
  { id: "d_wins", needs: ["b5"], key: "attack_win", target: 3, tmpl: "d_wins", icon: "sword", go: "map", r: res(300_000), shiny: 1 },
  // (QoL #120: Go there, a wart in the yard)
  { id: "d_warts", key: "wart_pick", target: 5, tmpl: "d_warts", icon: "wart", go: "wart", r: res(100_000), shiny: 1 },
  { id: "d_hatch", needs: ["b13"], key: "hatch_housing", target: 200, tmpl: "d_hatch", icon: "egg", go: "build:13", r: res(200_000), shiny: 1 },
  // (QoL #119: "wildtoday", left out when the next wild attack can't come before midnight UTC: questProgress canDo)
  { id: "d_wild", needs: ["level3", "wildtoday"], key: "wild_defended", target: 1, tmpl: "d_wild", icon: "shield", r: res(300_000), shiny: 1 },
  { id: "d_chat", key: "chat_global", target: 3, tmpl: "d_chat", icon: "chat", go: "chat", r: res(100_000), shiny: 1 },
  { id: "d_pit", needs: ["b141", "shiny"], key: "pit_rounds", target: 5, tmpl: "d_pit", icon: "dice", go: "pit", r: res(100_000), shiny: 1 },
  { id: "d_juice", needs: ["b9"], key: "juice_housing", target: 100, tmpl: "d_juice", icon: "flask", go: "build:128", r: res(200_000), shiny: 1 },
  { id: "d_capture", needs: ["b5"], key: "captures", target: 1, tmpl: "d_capture", icon: "outpost", go: "map", r: res(500_000), shiny: 1 },
];

export const DAILY_COUNT = 3;

export const DAILY_BONUS = { r: res(500_000), shiny: 2 };

/**
 * Counters the game itself reports (POST /quests/event): the most one report may add, and how often. (18 October:
 * attack_win, loot and buildings_destroyed are counted by the server from each attack's log: questHooks.ts
 * questAttackEnded.)
 */
export const CLIENT_EVENTS: Record<string, { max: number; everyMs: number; mode?: "max" }> = {
  hatch: { max: 100, everyMs: 0 },
  hatch_housing: { max: 3_000, everyMs: 0 },
  hatch_IC9: { max: 5, everyMs: 0 },
  hatch_IC10: { max: 5, everyMs: 0 },
  hatch_IC24: { max: 5, everyMs: 0 },
  juice: { max: 100, everyMs: 0 },
  juice_housing: { max: 3_000, everyMs: 0 },
  fling: { max: 1, everyMs: 5_000 },
  win_L: { max: 1, everyMs: 15_000 },
  win_K: { max: 1, everyMs: 15_000 },
  win_A: { max: 1, everyMs: 15_000 },
  win_D: { max: 1, everyMs: 15_000 },
  win_M46: { max: 1, everyMs: 15_000 },
  win_M50: { max: 1, everyMs: 15_000 },
  attack_player: { max: 1, everyMs: 15_000 },
  wild_defended: { max: 1, everyMs: 30_000 },
  ammo_decoy: { max: 1, everyMs: 2_000 },
  ammo_jars: { max: 1, everyMs: 2_000 },
  ammo_sulfur: { max: 1, everyMs: 2_000 },
  // (QoL #535, 14 October: the game sends what was picked since its last report, every 2.5 s; with five workers in a
  // Wart Bloom that was more than 3, and the rest was lost)
  wart_pick: { max: 12, everyMs: 1_000 },
  map_open: { max: 1, everyMs: 2_000 },
  map_world: { max: 1, everyMs: 2_000 },
  map_jump: { max: 1, everyMs: 2_000 },
  map_search: { max: 1, everyMs: 2_000 },
  map_filters: { max: 1, everyMs: 2_000 },
  map_openlink: { max: 1, everyMs: 2_000 },
  lb_findme: { max: 1, everyMs: 2_000 },
  bank: { max: 100_000_000, everyMs: 0, mode: "max" },
  outpost_rate: { max: 1_000_000_000, everyMs: 0, mode: "max" },
  // 8 October (the book doubled): the yard
  recycle: { max: 1, everyMs: 1_000 },
  capped: { max: 1, everyMs: 10_000 },
  workers_all: { max: 1, everyMs: 10_000 },
  planner_apply: { max: 1, everyMs: 2_000 },
  planner_save: { max: 1, everyMs: 2_000 },
  res_peak: { max: 1_000_000_000_000, everyMs: 0, mode: "max" },
  // monsters (a hatch of each kind: questClientEvent takes hatch_<any monster id>)
  housing_full: { max: 1, everyMs: 10_000 },
  housed: { max: 100_000, everyMs: 0, mode: "max" },
  big_three: { max: 1, everyMs: 10_000 },
  ics_queue: { max: 100, everyMs: 0 },
  // battles
  attack_total: { max: 1, everyMs: 15_000 },
  attack_flawless: { max: 1, everyMs: 15_000 },
  win_L_top: { max: 1, everyMs: 15_000 },
  win_K_top: { max: 1, everyMs: 15_000 },
  win_A_top: { max: 1, everyMs: 15_000 },
  win_D_top: { max: 1, everyMs: 15_000 },
  win_M50_flawless: { max: 1, everyMs: 15_000 },
  fling_monsters: { max: 2_000, everyMs: 0 },
  towers_destroyed: { max: 500, everyMs: 0 },
  player_hall: { max: 1, everyMs: 15_000 },
  replay: { max: 1, everyMs: 2_000 },
  // the map
  depths: { max: 1, everyMs: 2_000 },
  long_reach: { max: 1, everyMs: 15_000 },
  // social, events
  changelog: { max: 1, everyMs: 2_000 },
  gate13_nocat: { max: 1, everyMs: 15_000 },
  wild_flawless: { max: 1, everyMs: 30_000 },
  night_reveal: { max: 1, everyMs: 60_000 },
  night_owl: { max: 1, everyMs: 60_000 },
  // the arcade
  hockey_shutout: { max: 1, everyMs: 15_000 },
  soul_caps: { max: 20, everyMs: 0, mode: "max" },
  stack_quad: { max: 1, everyMs: 2_000 },
};

/**
 * Reports handled on their own (questProgress.questClientEvent): "map_view" (n: the cell, x * 1000 + y: counted
 * once a cell, as "map_views"), "spent" (resources spent: today's total kept as the best day, "spend_day"),
 * "allcap" (every resource at its limit now: how long in a row, "allcap_hours"; sent every few minutes), "allcap_off" (one below it again: the run ends).
 */
export const SPECIAL_EVENTS = new Set(["map_view", "spent", "allcap", "allcap_off"]);

export const questById = new Map(QUESTS.map((x) => [x.id, x]));
