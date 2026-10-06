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
 * - `go` is where "Go there" takes the player.
 */

export type QuestCategory = "start" | "yard" | "monsters" | "battles" | "map" | "outposts" | "alliances" | "social" | "events" | "pit";

export const QUEST_CATEGORIES: QuestCategory[] = ["start", "yard", "monsters", "battles", "map", "outposts", "alliances", "social", "events", "pit"];

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
  blast: 130, magmatower: 132, pit: 141, coil: 144, mortar: 145,
} as const;

/** The building's name in the game's language (the game's own keys; the Pit has none). */
const NAME: Record<number, string> = {
  1: "#bi_boneharvester#", 2: "#bi_coalharvester#", 3: "#bi_sulfurharvester#", 4: "#bi_magmaharverster#",
  5: "#b_flinger#", 8: "#bi_monsterlocker#", 9: "#b_monsterjuicer#", 10: "#b_yardplanner#", 11: "#b_maproom#",
  13: "#bi_hatchery#", 14: "#bi_townhall#", 16: "#b_hcc#", 21: "#bi_snipertower#", 26: "#bi_academy#", 51: "#b_catapult#",
  128: "#bi_housing#", 129: "#bi_quaketower#", 130: "#bi_cannontower#", 132: "#bi_magmatower#", 141: "Brimstone Pit",
  144: "#bi_cindercoil#", 145: "#bi_obsidianmortar#",
};

const build = (id: string, cat: QuestCategory, parent: string | null, type: number, icon: string, r: Reward, shiny = 0): QuestDef =>
  ({ id, cat, parent, key: `b${type}`, target: 1, tmpl: "build", vars: [NAME[type]], icon, go: `build:${type}`, r, shiny });

const level = (id: string, cat: QuestCategory, parent: string | null, type: number, lvl: number, icon: string, r: Reward, shiny = 0): QuestDef =>
  ({ id, cat, parent, key: `b${type}`, target: lvl, tmpl: "level", vars: [NAME[type], lvl], icon, go: `build:${type}`, r, shiny });

const q = (d: QuestDef): QuestDef => d;

export const QUESTS: QuestDef[] = [
  // ---- Getting Started (the first hour)
  build("s_sharp", "start", null, B.sharpshooter, "tower", res(50_000)),
  build("s_compound", "start", "s_sharp", B.compound, "compound", res(50_000)),
  build("s_incubator", "start", "s_compound", B.incubator, "egg", res(50_000)),
  q({ id: "s_hatch", cat: "start", parent: "s_incubator", key: "hatch", target: 1, tmpl: "hatch_first", icon: "egg", go: "build:13", r: res(25_000) }),
  q({ id: "s_fling", cat: "start", parent: "s_hatch", key: "fling", target: 1, tmpl: "fling", icon: "sword", go: "map", r: res(50_000), shiny: 5 }),
  q({ id: "s_wart", cat: "start", parent: "s_sharp", key: "wart_pick", target: 1, tmpl: "wart", icon: "wart", r: res(50_000) }),
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
  q({ id: "y_tower4", cat: "yard", parent: "y_blast", key: "tower_max", target: 4, tmpl: "tower_level", vars: [4], icon: "tower", r: res(1_000_000) }),
  q({ id: "y_tower6", cat: "yard", parent: "y_tower4", key: "tower_max", target: 6, tmpl: "tower_level", vars: [6], icon: "tower", r: res(5_000_000) }),
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
  q({ id: "y_bank1", cat: "yard", parent: "y_uh2", key: "bank", target: 1_000, tmpl: "bank", vars: ["1,000"], icon: "coin", r: res(20_000) }),
  q({ id: "y_bank2", cat: "yard", parent: "y_bank1", key: "bank", target: 20_000, tmpl: "bank", vars: ["20,000"], icon: "coin", r: res(200_000) }),
  q({ id: "y_bank3", cat: "yard", parent: "y_bank2", key: "bank", target: 100_000, tmpl: "bank", vars: ["100,000"], icon: "coin", r: res(1_000_000) }),
  q({ id: "y_bank4", cat: "yard", parent: "y_bank3", key: "bank", target: 500_000, tmpl: "bank", vars: ["500,000"], icon: "coin", r: res(3_000_000) }),

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
  q({ id: "o_kitsave", cat: "outposts", parent: "o_first", key: "kit_saved", target: 1, tmpl: "kit_save", icon: "scroll", r: res(100_000) }),
  q({ id: "o_kitbuild", cat: "outposts", parent: "o_kitsave", key: "kit_built", target: 1, tmpl: "kit_build", icon: "scroll", r: res(500_000) }),
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
  q({ id: "c_mail", cat: "social", parent: "c_global10", key: "mail_sent", target: 1, tmpl: "mail", icon: "mail", r: res(50_000) }),
  q({ id: "c_friend1", cat: "social", parent: "c_global10", key: "referrals", target: 1, tmpl: "friend", icon: "gift", go: "invite", r: res(1_000_000), optional: true }),
  q({ id: "c_friend3", cat: "social", parent: "c_friend1", key: "referrals", target: 3, tmpl: "friends", vars: [3], icon: "gift", go: "invite", r: res(3_000_000), shiny: 25, optional: true }),

  // ---- Events and daily play
  q({ id: "e_streak7", cat: "events", parent: null, key: "streak", target: 7, tmpl: "streak", vars: [7], icon: "star", go: "daily", r: res(500_000) }),
  q({ id: "e_streak14", cat: "events", parent: "e_streak7", key: "streak", target: 14, tmpl: "streak", vars: [14], icon: "star", go: "daily", r: res(2_000_000) }),
  q({ id: "e_streak28", cat: "events", parent: "e_streak14", key: "streak", target: 28, tmpl: "streak", vars: [28], icon: "star", go: "daily", r: res(6_000_000) }),
  q({ id: "e_wart50", cat: "events", parent: null, key: "wart_pick", target: 50, tmpl: "warts", vars: [50], icon: "wart", r: res(200_000) }),
  q({ id: "e_wart500", cat: "events", parent: "e_wart50", key: "wart_pick", target: 500, tmpl: "warts", vars: [500], icon: "wart", r: res(2_000_000) }),
  q({ id: "e_golden", cat: "events", parent: "e_wart50", key: "golden_wart", target: 1, tmpl: "golden", icon: "wart", r: res(100_000) }),
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
 * "shiny" shiny not switched off). The day's pick is kept, so it doesn't change when the yard does.
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
  { id: "d_warts", key: "wart_pick", target: 5, tmpl: "d_warts", icon: "wart", r: res(100_000), shiny: 1 },
  { id: "d_hatch", needs: ["b13"], key: "hatch_housing", target: 200, tmpl: "d_hatch", icon: "egg", go: "build:13", r: res(200_000), shiny: 1 },
  { id: "d_wild", needs: ["level3"], key: "wild_defended", target: 1, tmpl: "d_wild", icon: "shield", r: res(300_000), shiny: 1 },
  { id: "d_chat", key: "chat_global", target: 3, tmpl: "d_chat", icon: "chat", go: "chat", r: res(100_000), shiny: 1 },
  { id: "d_pit", needs: ["b141", "shiny"], key: "pit_rounds", target: 5, tmpl: "d_pit", icon: "dice", go: "pit", r: res(100_000), shiny: 1 },
  { id: "d_juice", needs: ["b9"], key: "juice_housing", target: 100, tmpl: "d_juice", icon: "flask", go: "build:128", r: res(200_000), shiny: 1 },
  { id: "d_capture", needs: ["b5"], key: "captures", target: 1, tmpl: "d_capture", icon: "outpost", go: "map", r: res(500_000), shiny: 1 },
];

export const DAILY_COUNT = 3;

export const DAILY_BONUS = { r: res(500_000), shiny: 2 };

/** Counters the game itself reports (POST /quests/event): the most one report may add, and how often. */
export const CLIENT_EVENTS: Record<string, { max: number; everyMs: number; mode?: "max" }> = {
  hatch: { max: 100, everyMs: 0 },
  hatch_housing: { max: 3_000, everyMs: 0 },
  hatch_IC9: { max: 5, everyMs: 0 },
  hatch_IC10: { max: 5, everyMs: 0 },
  hatch_IC24: { max: 5, everyMs: 0 },
  juice: { max: 100, everyMs: 0 },
  juice_housing: { max: 3_000, everyMs: 0 },
  fling: { max: 1, everyMs: 5_000 },
  attack_win: { max: 1, everyMs: 15_000 },
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
  wart_pick: { max: 3, everyMs: 1_000 },
  map_open: { max: 1, everyMs: 2_000 },
  map_world: { max: 1, everyMs: 2_000 },
  map_jump: { max: 1, everyMs: 2_000 },
  map_search: { max: 1, everyMs: 2_000 },
  map_filters: { max: 1, everyMs: 2_000 },
  map_openlink: { max: 1, everyMs: 2_000 },
  lb_findme: { max: 1, everyMs: 2_000 },
  bank: { max: 100_000_000, everyMs: 0, mode: "max" },
  outpost_rate: { max: 1_000_000_000, everyMs: 0, mode: "max" },
};

export const questById = new Map(QUESTS.map((x) => [x.id, x]));
