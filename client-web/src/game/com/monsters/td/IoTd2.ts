import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOWER, EnumYardType, GLOBAL, GRID, IoHfoStepClock, IoTd, IoTd2Fx, IoTd2Ui, IoTdUi, IoTdWaves, KEYS, MonsterBase, PLEASEWAIT, SOUNDS, Targeting } from "@game";

/**
 * Inferno-only (10 October, the user's: "Build out Hellgate Defense 2 ... make sure it is fun and twice as much to it
 * compared to Hellgate Defense 1"): Hellgate Defense 2, a cabinet of its own in the Devil's Arcade. It runs on
 * Hellgate Defense's engine (IoTd: the arena, the maze, the towers' shop and panel, the waves' flow), which calls in
 * here for everything that is new. The server's side is services/td/hellgate2.ts (the maps, the Hellforge, the
 * Daily Challenge, the boards); a run's settings come with its yard (io_td.v2).
 *
 *  - Four maps (the server's): one, two or four ways in; the Hall past a corner or in the middle.
 *  - Four difficulties: lives, gold, the monsters' health, how soon the elites come. Wave 40 brings the Hellgate
 *    Warden; beating it wins the map (skulls on the start screen), and the run goes on, endless.
 *  - Twelve towers: Hellgate Defense's six and six Hellforged ones (CUSTOM: decorations 151 to 156, worked here:
 *    a chilling pulse, stacking venom, a war drum for the towers round it, a shrine that makes gold, a catapult, an
 *    anti-air roost).
 *  - Four upgrade paths: Damage, Fire rate, Range, and each tower's own Special (SPECIALS). Towers rank up with
 *    their kills (RANK_KILLS: +6% damage a rank).
 *  - Four spells (SPELLS), charged while waves are on: Meteor (aimed), Frost Nova, Blood Pact, Moloch's Wrath.
 *  - Elite monsters (TRAITS: Armored, Swift, Regenerating, Splitting, Warded, Mending), and bosses with powers:
 *    Drull's brood, Korath's stone skin, Ashkarr's fire dash; the Warden has all three and calls its guard twice.
 *  - The Daily Challenge (two modifiers, MUTATORS) and the Hellforge's perks (bought between runs: PERKS' effects).
 *
 * Hits: every hit on an arena monster passes through hurt() (MonsterBase.modifyHealth): what dealt it (`source`:
 * the tower, set by FIREBALL, the Quake Tower and the Cinder Coil around their damage; `kind` for this module's own
 * damage) decides armour, crits, burns, slows, stuns and who gets the kill.
 */
export class IoTd2 extends ASObject {
    // ---- towers
    public static readonly OBELISK: int = 151;

    public static readonly VENOM: int = 152;

    public static readonly DRUM: int = 153;

    public static readonly SHRINE: int = 154;

    public static readonly CATAPULT: int = 155;

    public static readonly ROOST: int = 156;

    /**
     * The Hellforged towers: [price, range (grid units), damage, rate (steps between shots, 80 a second), kind,
     * what it does]. For the War Drum "damage" is the share it adds to the damage of the towers near it, and "rate"
     * to their fire rate (in hundredths); for the Tithe Shrine "damage" is its gold a wave and "rate" the share kills
     * near it pay more (hundredths).
     */
    public static readonly CUSTOM: any = {
        "151": [250, 110, 12, 40, "pulse", "Chills everything round it: slows them, and a little damage"],
        "152": [300, 170, 40, 64, "venom", "Venom that stacks five deep; deadly to Armored"],
        "153": [400, 140, 15, 10, "drum", "Towers round it hit harder and faster"],
        "154": [450, 150, 45, 10, "shrine", "Gold every wave; kills near it pay more"],
        "155": [500, 340, 900, 240, "catapult", "Huge range, huge hits, splash; ground only"],
        "156": [380, 230, 45, 16, "roost", "Gargoyles that tear fliers out of the sky"],
    };

    public static readonly ORDER: any[] = [151, 152, 153, 154, 155, 156];

    /**
     * Their animations (IoTd2Tower; the strips by tools/trophy-art/td2towers.py): [frames, kind, frames shown a step
     * of the strip]. "loop" plays round; "drum" beats, twice as fast while a wave is on; "aim" is a direction each
     * (frame k faces k x 11.25 degrees, as BTOWER's turrets); "aim2" half as many directions twice (the catapult: 16, cocked then thrown; a picture may be at most
     * 8,191 pixels wide).
     */
    public static readonly ANIM: any = { "151": [32, "loop", 3], "152": [24, "loop", 2], "153": [16, "drum", 4], "154": [24, "loop", 3], "155": [32, "aim2", 0], "156": [32, "aim", 0] };

    /** Steps the catapult's arm shows thrown, after a throw. */
    private static readonly THROWN_STEPS: int = 36;

    public static readonly PATHS: any[] = ["dmg", "rate", "range", "special"];

    /**
     * The paths' names, where a tower's differ from Damage, Fire rate, Range ("Frostbite", "Pulse rate", "Range";
     * "Fury", "Tempo", "Reach"; "Tithe", "Blessing", "Reach"): their keys (QoL #235: read when shown).
     */
    public static readonly PATH_NAMES: any = { "151": ["io_t3t_td2_path_frostbite", "io_t3t_td2_path_pulse", "io_t3t_tdui_path_range"], "153": ["io_t3t_td2_path_fury", "io_t3t_td2_path_tempo", "io_t3t_td2_path_reach"], "154": ["io_t3t_td2_path_tithe", "io_t3t_td2_path_blessing", "io_t3t_td2_path_reach"] };

    /** Each tower's Special: [name, the four tiers' values, what a tier does ("#" the value)]. */
    public static readonly SPECIALS: any = {
        "130": ["Hellfire Shells", [15, 30, 45, 60], "Hits burn for #% of their damage a second, 3 s"],
        "21": ["Headshot", [8, 14, 20, 26], "#% chance to hit four times as hard"],
        "129": ["Aftershock", [20, 30, 40, 50], "Hits slow by #% for a second"],
        "144": ["Overload", [10, 18, 26, 34], "#% chance a hit stuns, 0.4 s"],
        "145": ["Armor Breaker", [8, 16, 24, 32], "Hits make them take #% more from everything, 3 s"],
        "132": ["Meltdown", [20, 40, 60, 80], "+#% damage to bosses"],
        "151": ["Deep Freeze", [4, 7, 10, 13], "#% chance a pulse freezes each one, 1 s"],
        "152": ["Plague", [1, 2, 3, 4], "A poisoned kill spreads its venom to #"],
        "153": ["War Banner", [5, 10, 15, 20], "Towers round it also reach #% further"],
        "154": ["Indulgence", [5, 4, 3, 2], "A life back every # waves cleared"],
        "155": ["Bone Shrapnel", [25, 50, 75, 100], "Splash #% wider"],
        "156": ["Swoop", [25, 50, 75, 100], "Also hits walkers, for #% damage"],
    };

    /** Kills a tower needs for each rank (1 to 5); each rank adds RANK_BONUS to its damage. */
    public static readonly RANK_KILLS: any[] = [20, 60, 140, 280, 500];

    public static readonly RANK_BONUS: number = 0.06;

    // ---- spells
    /** [id, name, seconds to recharge, the wave it opens at, what it does]. Keys 1 to 4. */
    public static readonly SPELLS: any[] = [["meteor", "Meteor", 40, 1, "Click the ground: a meteor crushes and burns everything there."], ["nova", "Frost Nova", 55, 1, "Every monster freezes for 3 seconds (bosses 1; Warded ones are slowed)."], ["pact", "Blood Pact", 80, 1, "For 15 seconds every kill pays double gold."], ["wrath", "Moloch's Wrath", 100, 10, "Every monster loses a quarter of its health (bosses 8%)."]];

    // ---- monsters
    /** [id, name, colour]: what an elite may be. */
    public static readonly TRAITS: any[] = [["armored", "Armored", 0xB8C4D0], ["swift", "Swift", 0xFFE14A], ["regen", "Regenerating", 0x5CFF6A], ["split", "Splitting", 0xC77DFF], ["warded", "Warded", 0x4AB0FF], ["mending", "Mending", 0xFF7AC8]];

    /**
     * Inferno-only (QoL #235): the words above in the player's language, read when shown (the language file isn't
     * loaded when the class is; the tables keep their English as the data they were). Keys by id:
     * io_t3t_td2_blurb_<tower>, io_t3t_td2_sp_<tower> and io_t3t_td2_spd_<tower> (a Special's name and what it
     * does, "#" its value), io_t3t_td2_spell_<id> and io_t3t_td2_spelld_<id>, io_t3t_td2_trait_<id>.
     */
    public static spellName(s: any[]): string {
        return s ? IoTd2.ioWords("io_t3t_td2_spell_" + s[0], s[1]) : "";
    }

    public static spellText(s: any[]): string {
        return s ? IoTd2.ioWords("io_t3t_td2_spelld_" + s[0], s[4]) : "";
    }

    /**
     * Inferno-only (QoL #235): a key's words, or `fallback` where there is no such key (a map, difficulty, perk or
     * modifier the server sends with its English words: those this client knows are in the player's language).
     */
    public static ioWords(key: string, fallback: any): string {
        let v: string = KEYS.Get(key);
        return v && v != key ? v : String(fallback == null ? "" : fallback);
    }

    /** QoL #235: a map's name (the server's map id and its words). */
    public static mapNameOf(id: string, fallback: any): string {
        return IoTd2.ioWords("io_t3t_td2_map_" + id + "_name", fallback);
    }

    /** QoL #235: a difficulty's name ({id, name}, as the server sends it). */
    public static diffName(d: any): string {
        return d ? IoTd2.ioWords("io_t3t_td2_diff_" + d.id, d.name) : "";
    }

    public static readonly WARDEN: string = "IC24";

    public static readonly VICTORY_WAVE: int = 40;

    /**
     * Health's growth a wave after LATE_FROM, instead of Hellgate Defense's 9% (IoTdWaves.HP_GROWTH_LATE): the
     * elites, the bosses' powers and the Warden make the waves tougher in other ways, and wave 40 must be within
     * reach on Normal. (Bot runs, 10 October: a two-line maze, the towers in its corridors and every coin spent.)
     */
    public static readonly HP_GROWTH_LATE: number = 1.065;

    /** The Warden's health: this many times the third champion's at the wave. */
    public static readonly WARDEN_HP: number = 3.2;

    /** Lives lost if the Warden reaches the Hall (it must be killed for the win). */
    public static readonly WARDEN_LEAK: int = 15;

    /** Health multiplier at wave w (Hellgate Defense 2's curve). */
    public static hpScale(w: int): number {
        // (and from wave 60, as Hellgate Defense's endless waves since 11 October, 4% a wave: the run goes on after
        // the win)
        let mid: int = Math.max(0, Math.min(w, IoTdWaves.SLOW_FROM) - IoTdWaves.LATE_FROM) | 0;
        let slow: int = Math.max(0, w - IoTdWaves.SLOW_FROM) | 0;
        return Math.pow(IoTdWaves.HP_GROWTH, Math.max(0, Math.min(w, IoTdWaves.LATE_FROM) - 1)) * Math.pow(IoTd2.HP_GROWTH_LATE, mid) * Math.pow(IoTdWaves.HP_GROWTH_SLOW, slow);
    }

    // ---- the run
    private static _on: boolean = false;

    private static _cfg: any = null;

    public static diff: any = null;

    private static _mut: any = {};

    private static _perks: any = {};

    private static _list: any[] = null;

    private static _last: int = 0;

    /** What is dealing the hit under way (a tower), and what kind of hit it is (this module's own: "poison", "burn", "meteor", "wrath", "venom"). */
    public static source: any = null;

    public static kind: string = null;

    /** The spells: id -> steps left before it can be cast again. */
    public static charge: any = {};

    private static _pactLeft: int = 0;

    /** The catapults' boulders and meteors on their way: [{at: step, pt: iso Point, dmg, splash, src, kind, air}]. */
    private static _falling: any[] = [];

    /** Waiting on the win's window: the next wave doesn't start by itself. */
    public static holding: boolean = false;

    public static won: boolean = false;

    /** The Warden of this run's 40th wave was killed (the win needs it). */
    public static wardenSlain: boolean = false;

    /** The start screen's settings, to play the same again. */
    public static lastMap: string = "gate";

    public static lastDiff: string = "normal";

    public static lastDaily: boolean = false;

    public static lastResult: any = null;

    public static status: any = null;

    /**
     * Inferno-only (QoL #382): this run's most valuable tower, for the end's summary: the one with the most kills
     * (counted one a kill, the Veterans perk's extra aside): {kills, type}; kills 0 before any.
     */
    public static ioMvp: any = { "kills": 0, "type": 0 };

    private static _busy: boolean = false;

    private static _frame: int = 0;

    /** A Hellgate Defense 2 run is loaded (whether or not the arena is up yet). */
    public static get v2Run(): boolean {
        return Boolean(GLOBAL._ioTd && GLOBAL._ioTd.v2);
    }

    public static get on(): boolean {
        return IoTd2._on && IoTd.on;
    }

    public static get cfg(): any {
        return IoTd2._cfg || {};
    }

    public static has(mutator: string): boolean {
        return Boolean(IoTd2._mut[mutator]);
    }

    public static perk(id: string): int {
        return IoTd2._perks && IoTd2._perks[id] ? IoTd2._perks[id] | 0 : 0;
    }

    // ---- the start screen, and a run opened
    /** The arcade's buttons: the start screen (Campaign: maps, difficulties, the Hellforge; or the Daily Challenge). */
    public static Show(mode: string = "solo"): void {
        if (IoTd2._busy || !GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3t_not_attacked"));
            return;
        }
        IoTd2._busy = true;
        IoTd.call("status2", [], (r: any): void => {
            IoTd2._busy = false;
            IoTd2.status = r;
            IoTd2Ui.Intro(r, mode);
            IoTd.toldRecovered(r);
        }, (message: string): void => {
            IoTd2._busy = false;
            GLOBAL.Message(message);
        });
    }

    /** A new run: the server makes the arena for the map, then it loads. */
    public static open2(map: string, difficulty: string, daily: boolean): void {
        if (IoTd2._busy) {
            return;
        }
        IoTd2._busy = true;
        IoTd2.lastMap = map;
        IoTd2.lastDiff = difficulty;
        IoTd2.lastDaily = daily;
        PLEASEWAIT.Show(KEYS.Get("io_t3t_td_opening"));
        IoTd.call("open2", [["map", map], ["difficulty", difficulty], ["daily", daily ? 1 : 0]], (r: any): void => {
            IoTd2._busy = false;
            PLEASEWAIT.Hide();
            IoTdUi.Hide();
            BASE.LoadBase(null, 0, Number(r.baseid), GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }, (message: string): void => {
            IoTd2._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(message);
        });
    }

    /** Play again: the same map and difficulty (or today's challenge). */
    public static again(): void {
        IoTd2.open2(IoTd2.lastMap, IoTd2.lastDiff, IoTd2.lastDaily);
    }

    /** The run recorded (td2/finish's answer). */
    public static finished(r: any): void {
        IoTd2.lastResult = r;
        if (r && r.profile && IoTd2.status) {
            IoTd2.status.profile = r.profile;
        }
    }

    public static Setup(): void {
        IoTd2._on = false;
        IoTd2.ioMvp = { "kills": 0, "type": 0 };
        if (!IoTd2.v2Run) {
            return;
        }
        IoTd2._on = true;
        IoTd2._cfg = GLOBAL._ioTd.v2;
        IoTd2.diff = IoTd2._cfg.difficulty || { "id": "normal", "name": "Normal", "lives": 20, "gold": 800, "hp": 1, "goldMult": 1, "weight": 1.5, "eliteFrom": 5 };
        IoTd2._mut = {};
        for (let m of as3.values(IoTd2._cfg.mutators || [])) {
            IoTd2._mut[String(m)] = true;
        }
        IoTd2._perks = IoTd2._cfg.perks || {};
        IoTd2.lastMap = String(IoTd2._cfg.map || "gate");
        IoTd2.lastDiff = String(IoTd2.diff.id || "normal");
        IoTd2.lastDaily = Boolean(IoTd2._cfg.daily);
        // the shop: Hellgate Defense's six and the Hellforged six, a little cheaper with Hell's Engineers
        let off: number = 1 - 0.05 * IoTd2.perk("engineers");
        IoTd2._list = [];
        for (let t of as3.values(IoTd.TOWERS)) {
            IoTd2._list.push([t[0] | 0, (Math.round(Number(t[1]) * off / 5) * 5) | 0]);
        }
        for (let id of as3.values(IoTd2.ORDER)) {
            IoTd2._list.push([id | 0, (Math.round(Number(IoTd2.CUSTOM[String(id)][0]) * off / 5) * 5) | 0]);
        }
        IoTd2.charge = {};
        for (let s of as3.values(IoTd2.SPELLS)) {
            IoTd2.charge[s[0]] = 0;
        }
        IoTd2._pactLeft = 0;
        IoTd2._falling = [];
        IoTd2.holding = false;
        IoTd2.won = false;
        IoTd2.wardenSlain = false;
        IoTd2.source = null;
        IoTd2.kind = null;
        IoTd2._last = IoTd.steps;
        IoTd2Fx.Setup();
    }

    public static Cleanup(): void {
        if (!IoTd2._on) {
            return;
        }
        IoTd2._on = false;
        IoTd2.source = null;
        IoTd2.kind = null;
        IoTd2._falling = [];
        IoTd2.holding = false;
        IoTd2Fx.Cleanup();
        IoTd2Ui.Hide();
    }

    public static startGold(): int {
        return ((IoTd2.diff.gold | 0) + 100 * IoTd2.perk("warchest")) | 0;
    }

    public static startLives(): int {
        let n: int = ((IoTd2.diff.lives | 0) + 2 * IoTd2.perk("bastion")) | 0;
        if (IoTd2.has("brittle")) {
            n = Math.max(1, Math.ceil(n / 2)) | 0;
        }
        return n;
    }

    public static startWalls(): int {
        return ((IoTd.arena.walls | 0) + 10 * IoTd2.perk("masonry") + (IoTd2.has("masons") ? 30 : 0)) | 0;
    }

    // ---- towers
    public static towerList(): any[] {
        return IoTd2._list || IoTd.TOWERS;
    }

    public static isCustom(type: int): boolean {
        return IoTd2.CUSTOM[String(type)] != null;
    }

    public static hasPriority(type: int): boolean {
        return type == IoTd2.VENOM || type == IoTd2.CATAPULT || type == IoTd2.ROOST;
    }

    public static nameOf(type: int): string {
        let p: any = GLOBAL._buildingProps[type - 1];
        return p ? KEYS.Get(as3.str(p.name)) : KEYS.Get("io_t3t_td2_tower");
    }

    public static blurbOf(type: int): string {
        let c: any = IoTd2.CUSTOM[String(type)];
        return c ? IoTd2.ioWords("io_t3t_td2_blurb_" + type, c[5]) : "";
    }

    public static pathName(type: int, path: string): string {
        if (path == "special") {
            let s: any = IoTd2.SPECIALS[String(type)];
            return s ? IoTd2.ioWords("io_t3t_td2_sp_" + type, s[0]) : KEYS.Get("io_t3t_td2_special");
        }
        let names: any = IoTd2.PATH_NAMES[String(type)];
        let i: int = IoTd.PATHS.indexOf(path);
        if (names && i >= 0) {
            return KEYS.Get(String(names[i]));
        }
        return KEYS.Get(path == "dmg" ? "io_t3t_tdui_path_dmg" : (path == "rate" ? "io_t3t_tdui_path_rate" : "io_t3t_tdui_path_range"));
    }

    /** A tower's Special at its tier, in words ("" for none bought: the first tier's, with "Next:"). */
    public static specialText(type: int, tier: int): string {
        let s: any = IoTd2.SPECIALS[String(type)];
        if (!s) {
            return "";
        }
        let at: int = Math.max(1, Math.min(4, tier)) | 0;
        return IoTd2.ioWords("io_t3t_td2_spd_" + type, s[2]).replace("#", String(s[1][at - 1]));
    }

    public static specialValue(type: int, tier: int): number {
        let s: any = IoTd2.SPECIALS[String(type)];
        return s && tier > 0 ? Number(s[1][Math.min(4, tier) - 1]) : 0;
    }

    public static towerPlaced(b: BFOUNDATION, info: any): void {
        info.cd = 0;
        info.drumDmg = 0;
        info.drumRate = 0;
        info.drumRange = 0;
        if (IoTd2.isCustom(b._type)) {
            info.priority = IoTd.FIRST;
            IoTd2Fx.ring(IoTd2.centerOf(b), 50, 0xFFC040, 0.5);
        }
        IoTd2.towersChanged();
    }

    /** A tower's middle, in the yard's (isometric) points: where it aims from. */
    public static centerOf(b: BFOUNDATION): Point {
        let at: Point = b._position ? b._position : new Point(b._mc ? b._mc.x : 0, b._mc ? b._mc.y : 0);
        let h: number = b._footprint && b._footprint.length ? Number(b._footprint[0].height) : 64;
        return at.add(new Point(0, h / 2));
    }

    /** A tower's middle on the grid. */
    private static gridCenter(b: BFOUNDATION): Point {
        let c: Point = IoTd2.centerOf(b);
        return GRID.FromISO(c.x, c.y);
    }

    /** The War Drums' gifts worked out again (a tower bought, upgraded, moved or sold), and the game's towers retuned. */
    public static towersChanged(): void {
        if (!IoTd2.on) {
            return;
        }
        let drums: any[] = [];
        for (let k of (IoTd.towers?.keys() ?? [])) {
            let b: BFOUNDATION = as3.as(k, BFOUNDATION);
            let info: any = IoTd.towers.get(k);
            if (b && info && b._type == IoTd2.DRUM) {
                drums.push([IoTd2.gridCenter(b), IoTd2.reach(b, info), 0.15 * IoTd.MULT.dmg[info.dmg | 0], 0.1 * IoTd.MULT.rate[info.rate | 0], IoTd2.specialValue(IoTd2.DRUM, info.special | 0) / 100]);
            }
        }
        for (let k of (IoTd.towers?.keys() ?? [])) {
            let b: BFOUNDATION = as3.as(k, BFOUNDATION);
            let info: any = IoTd.towers.get(k);
            if (!b || !info) {
                continue;
            }
            let dd: number = 0;
            let dr: number = 0;
            let dg: number = 0;
            if (b._type != IoTd2.DRUM && b._type != IoTd2.SHRINE) {
                let at: Point = IoTd2.gridCenter(b);
                for (let d of as3.values(drums)) {
                    if (Point.distance(at, d[0]) <= Number(d[1])) {
                        dd = Math.max(dd, Number(d[2]));
                        dr = Math.max(dr, Number(d[3]));
                        dg = Math.max(dg, Number(d[4]));
                    }
                }
            }
            let changed: boolean = info.drumDmg != dd || info.drumRate != dr || info.drumRange != dg;
            info.drumDmg = dd;
            info.drumRate = dr;
            info.drumRange = dg;
            if (changed && b instanceof BTOWER) {
                as3.cast(b, BTOWER).Props();
            }
        }
    }

    /** BTOWER's numbers in the arena (IoTd.tune, after its tiers'): its rank, the drums round it. */
    public static tuneTower(t: BTOWER, info: any): void {
        let mult: number = (1 + IoTd2.RANK_BONUS * (info.rank | 0)) * (1 + Number(info.drumDmg || 0));
        t.damageProperty.value = t.damageProperty.value * mult;
        t._rate = Math.max(1, Math.round(t._rate / (1 + Number(info.drumRate || 0))) | 0) | 0;
        t._range = (t._range * (1 + Number(info.drumRange || 0))) | 0;
    }

    public static rankOf(kills: number): int {
        let r: int = 0;
        while (r < IoTd2.RANK_KILLS.length && kills >= IoTd2.RANK_KILLS[r]) {
            r++;
        }
        return r;
    }

    /** A Hellforged tower's range, damage and shots' spacing now. */
    public static reach(b: BFOUNDATION, info: any): number {
        let c: any = IoTd2.CUSTOM[String(b._type)];
        return Number(c[1]) * IoTd.MULT.range[info.range | 0] * (1 + Number(info.drumRange || 0));
    }

    public static damageOf(b: BFOUNDATION, info: any): number {
        let c: any = IoTd2.CUSTOM[String(b._type)];
        return Number(c[2]) * IoTd.MULT.dmg[info.dmg | 0] * (1 + IoTd2.RANK_BONUS * (info.rank | 0)) * (1 + Number(info.drumDmg || 0));
    }

    public static rateOf(b: BFOUNDATION, info: any): number {
        let c: any = IoTd2.CUSTOM[String(b._type)];
        return Math.max(4, Number(c[3]) / IoTd.MULT.rate[info.rate | 0] / (1 + Number(info.drumRate || 0)));
    }

    /** The panel's line of numbers for a Hellforged tower. */
    public static statLine(b: BFOUNDATION, info: any): string {
        let t: int = b._type;
        let r: int = Math.round(IoTd2.reach(b, info)) | 0;
        // (QoL #235: in the player's language; IoTdUi.ioPreview reads the numbers out of it)
        if (t == IoTd2.DRUM) {
            return KEYS.Get("io_t3t_td2_stat_drum", { "v1": Math.round(15 * IoTd.MULT.dmg[info.dmg | 0]), "v2": Math.round(10 * IoTd.MULT.rate[info.rate | 0]), "v3": r });
        }
        if (t == IoTd2.SHRINE) {
            return KEYS.Get("io_t3t_td2_stat_shrine", { "v1": Math.round(45 * IoTd.MULT.dmg[info.dmg | 0]), "v2": Math.round(10 * IoTd.MULT.rate[info.rate | 0]), "v3": r });
        }
        let shots: number = IoHfoStepClock.STEPS_A_SECOND / IoTd2.rateOf(b, info);
        return KEYS.Get("io_t3t_tdui_stats", { "v1": GLOBAL.FormatNumber(Math.round(IoTd2.damageOf(b, info))), "v2": Math.round(shots * 10) / 10, "v3": r });
    }

    /** Which frame of its strip a Hellgate Defense 2 tower shows now (IoTd2Tower), or -1. */
    public static frameOf(b: BFOUNDATION): int {
        let a: any[] = as3.as(IoTd2.ANIM[String(b._type)], Array);
        if (!a) {
            return -1;
        }
        let frames: int = a[0] | 0;
        let kind: string = String(a[1]);
        let info: any = IoTd.on ? IoTd.towers.get(b) : null;
        let n: int = IoTd2._frame > 0 ? IoTd2._frame : ((GLOBAL._frameNumber | 0) >>> 0);
        if (kind == "loop") {
            return ((n / Math.max(1, a[2] | 0)) | 0) % frames;
        }
        if (kind == "drum") {
            let every: int = Math.max(1, (IoTd.on && IoTd.waveOn ? (a[2] | 0) / 2 : a[2] | 0)) | 0;
            return ((n / every) | 0) % frames;
        }
        // (facing the viewer until it has aimed at something)
        let deg: number = info && info.aim != null ? Number(info.aim) : 45;
        let dirs: int = (kind == "aim2" ? frames / 2 : frames) | 0;
        let dir: int = (Math.round(((deg % 360) + 360) % 360 / (360 / dirs)) | 0) % dirs;
        if (kind == "aim2" && info && info.firedAt != null && IoTd.steps - (info.firedAt | 0) < IoTd2.THROWN_STEPS) {
            return (dir + dirs) | 0;
        }
        return dir;
    }

    /** A tower turns to face a monster (the grid's angle, BTOWER's turrets' frames). */
    private static aimAt(b: BFOUNDATION, info: any, c: MonsterBase): void {
        if (!c) {
            return;
        }
        let from: Point = IoTd2.gridCenter(b);
        let to: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        info.aim = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    }

    // ---- waves
    public static isBoss(w: int): boolean {
        return w > 0 && (IoTd2.has("bloodmoon") ? w % 5 == 0 : w % 10 == 0);
    }

    public static isWarden(w: int): boolean {
        return w >= IoTd2.VICTORY_WAVE && w % 20 == 0;
    }

    /** The wave's monsters, Hellgate Defense's wave made harder: the difficulty, the modifiers, elites, the Warden. */
    public static makeWave(w: int): any[] {
        let seed: int = 0;
        seed = ((w * 104729 + (IoTd2.cfg.seed | 0) * 31 + 7) >>> 0 & 0x7FFFFFFF) | 0;
        let rnd: Function = (): number => {
            seed = ((seed * 1103515245 + 12345) >>> 0 & 0x7FFFFFFF) | 0;
            return seed / 0x7FFFFFFF;
        };
        let out: any[] = IoTdWaves.make(w);
        // (Hellgate Defense 2's health curve in place of Hellgate Defense's, and the difficulty's)
        let hp: number = Number(IoTd2.diff.hp || 1) * IoTd2.hpScale(w) / IoTdWaves.hpScale(w);
        // (a Blood Moon boss on the 5th waves between: the swarm's turn goes to a boss)
        if (IoTd2.isBoss(w) && !IoTdWaves.isBoss(w)) {
            let boss: any[] = as3.as(IoTdWaves.BOSSES[((w / 5) | 0) % IoTdWaves.BOSSES.length], Array);
            out.push({ "id": String(boss[0]), "gap": 2500, "bounty": Math.round(Number(boss[1]) * IoTdWaves.goldScale(w)) | 0, "leak": boss[2] | 0, "hp": Math.round(Number(boss[3]) * IoTdWaves.hpScale(w)), "boss": true, "index": 0 });
        }
        // the Warden instead of the wave's champions, every 20th wave from the 40th
        if (IoTd2.isWarden(w)) {
            let first: int = -1;
            for (let i: int = out.length - 1; i >= 0; i--) {
                if (out[i].boss) {
                    first = i;
                    out.splice(i, 1);
                }
            }
            let bh: number = Number(IoTdWaves.BOSSES[2][3]) * IoTdWaves.hpScale(w) * IoTd2.WARDEN_HP * (1 + (w - IoTd2.VICTORY_WAVE) / 40);
            out.push({ "id": IoTd2.WARDEN, "gap": 3000, "bounty": 1500, "leak": IoTd2.WARDEN_LEAK, "hp": Math.round(bh), "boss": true, "warden": true, "index": 0 });
        }
        if (IoTd2.has("swarming")) {
            let n: int = out.length;
            for (let i: int = 0; i < n; i++) {
                let e: any = out[i];
                if (!e.boss && rnd() < 0.5) {
                    let copy: any = { "id": e.id, "gap": (e.gap * 0.5) | 0, "bounty": e.bounty, "leak": e.leak, "hp": e.hp, "boss": false, "index": e.index };
                    out.splice(i + 1, 0, copy);
                    i++;
                    n++;
                }
            }
            for (let e of as3.values(out)) {
                if (!e.boss) {
                    e.hp = Math.round(e.hp * 0.7);
                }
            }
        }
        // elites
        let from: int = (IoTd2.diff.eliteFrom | 0) || 5;
        let pool: any[] = [];
        if (w >= from) {
            let kinds: int = w < from + 13 ? 1 : (w < from + 27 ? 2 : 3);
            let all: any[] = IoTd2.TRAITS.concat();
            while (pool.length < kinds && all.length) {
                pool.push(String(all.splice((rnd() * all.length) | 0, 1)[0][0]));
            }
        }
        let p: number = Math.min(0.45, 0.1 + 0.01 * (w - from));
        let ways: int = Math.max(1, IoTd.arena && IoTd.arena.spawns ? IoTd.arena.spawns.length : 1) | 0;
        let i2: int = 0;
        for (let e of as3.values(out)) {
            e.hp = Math.round(e.hp * hp);
            e.traits = [];
            if (!e.boss && pool.length && rnd() < p) {
                e.traits.push(pool[(rnd() * pool.length) | 0]);
                if (w >= 30 && pool.length > 1 && rnd() < p / 3) {
                    let t2: string = String(pool[(rnd() * pool.length) | 0]);
                    if (e.traits.indexOf(t2) < 0) {
                        e.traits.push(t2);
                    }
                }
            }
            if (e.warden) {
                e.traits.push("warded");
            }
            if (IoTd2.has("ironhide") && e.traits.indexOf("armored") < 0) {
                e.traits.push("armored");
            }
            if (IoTd2.has("quicksilver") && e.traits.indexOf("swift") < 0) {
                e.traits.push("swift");
            }
            if (e.traits.indexOf("swift") >= 0) {
                e.hp = Math.round(e.hp * 0.75);
            }
            if (e.traits.indexOf("warded") >= 0 && !e.warden) {
                e.hp = Math.round(e.hp * 1.15);
            }
            if (e.traits.length) {
                e.bounty = Math.round(e.bounty * 1.3) | 0;
            }
            // (the champions have their powers here: a quarter less health than in Hellgate Defense)
            if (e.boss && !e.warden) {
                e.hp = Math.round(e.hp * 0.75);
            }
            // (more than one way in: they take turns)
            e.entry = (i2++ % ways) | 0;
        }
        return out;
    }

    /** The traits a wave's elites may have, in words ("" if none). */
    public static elitesOf(w: int): string {
        let names: any[] = [];
        for (let e of as3.values(IoTd2.makeWave(w))) {
            for (let t of as3.values(e.traits || [])) {
                let n: string = IoTd2.traitName(String(t));
                if (names.indexOf(n) < 0 && !(e.warden && t == "warded")) {
                    names.push(n);
                }
            }
        }
        return names.join(", ");
    }

    public static traitName(id: string): string {
        for (let t of as3.values(IoTd2.TRAITS)) {
            if (t[0] == id) {
                return IoTd2.ioWords("io_t3t_td2_trait_" + id, t[1]);
            }
        }
        return id;
    }

    public static traitColor(id: string): int {
        for (let t of as3.values(IoTd2.TRAITS)) {
            if (t[0] == id) {
                return t[2] | 0;
            }
        }
        return 0xFFFFFF;
    }

    public static title(w: int): string {
        if (IoTd2.isWarden(w)) {
            return KEYS.Get("io_t3t_td2_warden_wave", { "v1": w });
        }
        if (IoTd2.isBoss(w) && !IoTdWaves.isBoss(w)) {
            let boss: any[] = as3.as(IoTdWaves.BOSSES[((w / 5) | 0) % IoTdWaves.BOSSES.length], Array);
            return KEYS.Get("io_t3t_td2_bloodmoon_wave", { "v1": w, "v2": IoTdWaves.name(String(boss[0])) });
        }
        return IoTdWaves.title(w);
    }

    public static subtitle(w: int): string {
        let parts: any[] = [];
        if (IoTd2.isWarden(w) && !IoTd2.won) {
            parts.push(KEYS.Get("io_t3t_td2_warden_sub", { "v1": IoTd2.WARDEN_LEAK }));
        }
        let el: string = IoTd2.elitesOf(w);
        if (el) {
            parts.push(KEYS.Get("io_t3t_td2_elites", { "v1": el }));
        }
        return parts.length ? parts.join("   ·   ") : null;
    }

    public static preview(w: int): string {
        let counts: any = {};
        let order: any[] = [];
        for (let e of as3.values(IoTd2.makeWave(w))) {
            let id: string = e.warden ? "warden" : String(e.id);
            if (!counts[id]) {
                counts[id] = 0;
                order.push(id);
            }
            counts[id]++;
        }
        let parts: any[] = [];
        for (const $v of as3.values(order)) {
            let id: string = as3.str($v);
            parts.push(counts[id] + " " + (id == "warden" ? KEYS.Get("io_t3t_td2_warden") : IoTdWaves.name(id)));
        }
        let el: string = IoTd2.elitesOf(w);
        return parts.join(", ") + (el ? "   <font color=\"#FF9EDB\">" + KEYS.Get("io_t3t_td2_elites_b", { "v1": el }) + "</font>" : "");
    }

    public static clearBonus(w: int): int {
        // (a quarter more than Hellgate Defense's: twelve towers and four paths to pay for)
        return Math.round(IoTdWaves.clearBonus(w) * 1.25 * (IoTd2.has("famine") ? 1.5 : 1)) | 0;
    }

    public static wallsFor(w: int): int {
        return IoTd2.has("masons") ? 0 : IoTdWaves.wallsFor(w);
    }

    public static waveStarted(w: int): void {
        IoTd2Ui.Update();
    }

    /** A wave cleared: the shrines' tithes, Moloch's Interest, Indulgence's lives; wave 40's win. Says what it gave. */
    public static waveCleared(w: int): string {
        let parts: any[] = [];
        let tithe: int = 0;
        let lives: int = 0;
        for (let k of (IoTd.towers?.keys() ?? [])) {
            let b: BFOUNDATION = as3.as(k, BFOUNDATION);
            let info: any = IoTd.towers.get(k);
            if (b && info && b._type == IoTd2.SHRINE) {
                let g: int = Math.round(45 * IoTd.MULT.dmg[info.dmg | 0]) | 0;
                tithe += g;
                IoTdUi.Float("+" + g, IoTd2.centerOf(b), 0xFFD24A);
                let every: int = IoTd2.specialValue(IoTd2.SHRINE, info.special | 0) | 0;
                if (every > 0 && w % every == 0) {
                    lives++;
                }
            }
        }
        if (tithe > 0) {
            IoTd.gold += tithe;
            parts.push(KEYS.Get("io_t3t_td2_tithe", { "v1": tithe }));
        }
        let lvl: int = IoTd2.perk("interest");
        if (lvl > 0) {
            let interest: int = Math.min(150, Math.floor(IoTd.gold * 0.02 * lvl)) | 0;
            if (interest > 0) {
                IoTd.gold += interest;
                parts.push(KEYS.Get("io_t3t_td2_interest", { "v1": interest }));
            }
        }
        if (lives > 0) {
            IoTd.lives += lives;
            parts.push("+" + lives + " ♥");
        }
        if (w >= IoTd2.VICTORY_WAVE && !IoTd2.won && IoTd2.wardenSlain) {
            IoTd2.won = true;
            IoTd2.holding = true;
            IoTd2Ui.Victory();
        }
        return parts.length ? ", " + parts.join(", ") : "";
    }

    // ---- monsters
    /** A monster has come into the arena (IoTd.track): its traits, its own speed, its powers. */
    public static spawned(c: MonsterBase, info: any, e: any): void {
        info.traits = e && e.traits ? e.traits : [];
        for (let t of as3.values(info.traits)) {
            info[String(t)] = true;
        }
        info.warden = Boolean(e && e.warden);
        info.isSplit = Boolean(e && e.isSplit);
        info.burns = [];
        info.poison = [];
        info.slowAmt = 0;
        info.slowLeft = 0;
        info.stunLeft = 0;
        info.vulnAmt = 0;
        info.vulnLeft = 0;
        info.stoneLeft = 0;
        info.dashLeft = 0;
        info.invulnLeft = 0;
        info.phase = 0;
        info.cdBrood = 400;
        info.cdStone = 640;
        info.cdDash = 560;
        info.speedSet = -1;
        if (info.swift) {
            c.moveSpeedProperty.value = c.moveSpeedProperty.value * 1.5;
        }
        // (the Warden is huge: it lumbers)
        if (info.warden) {
            c.moveSpeedProperty.value = c.moveSpeedProperty.value * 0.7;
        }
        info.baseSpeed = c.moveSpeedProperty.value;
        if (info.warden) {
            info.leak = IoTd2.WARDEN_LEAK;
            IoTd2Ui.bossCame(c, KEYS.Get("io_t3t_td2_the_warden"));
        } else if (info.boss) {
            IoTd2Ui.bossCame(c, IoTdWaves.name(String(c._creatureID)));
        }
    }

    /** The gold for a kill: the difficulty, Bounty Hunter, Famine, a Blood Pact, a Tithe Shrine's blessing near it. */
    public static bountyOf(c: MonsterBase, info: any): int {
        let m: number = Number(IoTd2.diff.goldMult || 1) * (1 + 0.06 * IoTd2.perk("bounty")) * (IoTd2.has("famine") ? 0.6 : 1) * (IoTd2._pactLeft > 0 ? 2 : 1);
        let bless: number = 0;
        let at: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        for (let k of (IoTd.towers?.keys() ?? [])) {
            let b: BFOUNDATION = as3.as(k, BFOUNDATION);
            let ti: any = IoTd.towers.get(k);
            if (b && ti && b._type == IoTd2.SHRINE && Point.distance(at, IoTd2.gridCenter(b)) <= IoTd2.reach(b, ti)) {
                bless = Math.max(bless, 0.1 * IoTd.MULT.rate[ti.rate | 0]);
            }
        }
        return Math.max(1, Math.round((info.bounty | 0) * m * (1 + bless))) | 0;
    }

    /** A kill: its killer's rank, a Splitting one's two halves, a poisoned one's plague, a boss's fall. */
    public static killed(c: MonsterBase, info: any): void {
        let by: BFOUNDATION = as3.as(info.lastBy, BFOUNDATION);
        let ti: any = by ? IoTd.towers.get(by) : null;
        if (ti) {
            // (QoL #382: each tower's own kills this run, and the one with the most)
            if (GLOBAL.INFERNO_ONLY) {
                ti.ioKills = (ti.ioKills | 0) + 1;
                if ((ti.ioKills | 0) > (IoTd2.ioMvp.kills | 0)) {
                    IoTd2.ioMvp = { "kills": ti.ioKills | 0, "type": by._type | 0 };
                }
            }
            ti.kills = Number(ti.kills || 0) + 1 + 0.3 * IoTd2.perk("veterans");
            let r: int = IoTd2.rankOf(ti.kills);
            if (r > (ti.rank | 0)) {
                ti.rank = r;
                IoTdUi.Float("★ " + KEYS.Get("io_t3t_tdui_rank", { "v1": r }), IoTd2.centerOf(by), 0xFFE680);
                SOUNDS.Play("upgrade1", 0.5);
                if (by instanceof BTOWER) {
                    as3.cast(by, BTOWER).Props();
                }
            }
        }
        let at: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        if (info.split && !info.isSplit) {
            for (let i: int = 0; i < 2; i++) {
                IoTd.spawnAt({ "id": String(info.id), "bounty": Math.max(1, (info.bounty / 3) | 0), "leak": info.leak | 0, "hp": Math.max(1, Math.round(c.maxHealth * 0.3)), "boss": false, "isSplit": true, "traits": [], "entry": info.entry | 0 }, new Point(at.x + (i ? 8 : -8), at.y + (i ? -8 : 8)));
            }
            IoTd2Fx.ring(c._tmpPoint, 30, 0xC77DFF, 0.4);
        }
        if (info.plague > 0 && info.poison && info.poison.length) {
            let near: any[] = IoTd2.inRange(c._tmpPoint, 70, true, true);
            let n: int = 0;
            for (let o of as3.values(near)) {
                let other: MonsterBase = as3.as(o.creep, MonsterBase);
                let oi: any = IoTd.infoOf(other);
                if (other == c || !oi || n >= (info.plague | 0)) {
                    continue;
                }
                for (let s of as3.values(info.poison)) {
                    IoTd2.addPoison(oi, Number(s.dps), Number(s.left), s.src);
                }
                oi.plague = info.plague;
                IoTd2Fx.bolt(c._tmpPoint, other._tmpPoint, 0x7CFF4A, 2, 0.25);
                n++;
            }
        }
        if (info.warden) {
            IoTd2.wardenSlain = true;
        }
        if (info.boss) {
            IoTd2Ui.bossGone(c);
            IoTdUi.Banner(info.warden ? KEYS.Get("io_t3t_td2_warden_fell") : KEYS.Get("io_t3t_td2_boss_falls", { "v1": IoTdWaves.name(String(c._creatureID)) }), 0xFFD24A);
        }
    }

    private static addPoison(info: any, dps: number, left: number, src: any): void {
        if (!info.poison) {
            info.poison = [];
        }
        info.poison.push({ "dps": dps, "left": left, "src": src });
        while (info.poison.length > 5) {
            info.poison.shift();
        }
    }

    /** Arena monsters within `range` grid units of an isometric point: [{creep, dist}]. */
    public static inRange(iso: Point, range: number, ground: boolean, air: boolean): any[] {
        let flags: int = Targeting.getOldStyleTargets(ground && air ? 1 : (air ? 2 : 0));
        let out: any[] = [];
        let found: any[] = null;
        try {
            found = Targeting.getCreepsInRange(range, iso, flags);
        } catch (err) {
            found = [];
        }
        for (let o of as3.values(found)) {
            let c: MonsterBase = as3.as(o.creep, MonsterBase);
            let info: any = c ? IoTd.infoOf(c) : null;
            if (c && info && !info.leaked && c.health > 0 && !c.dying) {
                out.push(o);
            }
        }
        return out;
    }

    /** This module's own damage: dealt as a hit by `src` (a tower, or none). */
    public static deal(c: MonsterBase, amount: number, src: any, kind: string): void {
        if (!c || amount <= 0 || c.health <= 0) {
            return;
        }
        let ps: any = IoTd2.source;
        let pk: string = IoTd2.kind;
        IoTd2.source = src;
        IoTd2.kind = kind;
        try {
            c.modifyHealth(-amount);
        } finally {
            IoTd2.source = ps;
            IoTd2.kind = pk;
        }
    }

    /**
     * MonsterBase.modifyHealth, a hit (amount below 0) on one of the arena's monsters: armour, weak spots, stone skin,
     * the hitting tower's Special; who hit it last. Returns the hit as it lands.
     */
    public static hurt(c: MonsterBase, amount: number): number {
        let info: any = IoTd.infoOf(c);
        if (!info || info.leaked) {
            return amount;
        }
        let dmg: number = -amount;
        let src: any = IoTd2.source;
        let kind: string = IoTd2.kind;
        let ti: any = src ? IoTd.towers.get(src) : null;
        let type: int = ti ? as3.cast(src, BFOUNDATION)._type : 0;
        let tier: int = ti ? ti.special | 0 : 0;
        if (ti && tier > 0) {
            if (type == 21 && Math.random() * 100 < IoTd2.specialValue(21, tier)) {
                dmg *= 4;
                IoTdUi.Float(KEYS.Get("io_t3t_td2_crit"), c._tmpPoint, 0xFF5544);
            } else if (type == 132 && info.boss) {
                dmg *= 1 + IoTd2.specialValue(132, tier) / 100;
            }
        }
        if (info.armored) {
            if (kind == "venom") {
                dmg *= 2;
            } else if (kind != "poison" && kind != "meteor" && kind != "wrath") {
                dmg *= 0.6;
            }
        }
        if (info.vulnLeft > 0) {
            dmg *= 1 + Number(info.vulnAmt);
        }
        if (info.stoneLeft > 0) {
            dmg *= 0.35;
        }
        if (info.invulnLeft > 0) {
            dmg = 0;
        }
        if (ti) {
            info.lastBy = src;
        }
        // the hitting tower's Special, after the hit
        if (ti && tier > 0 && dmg > 0) {
            let v: number = IoTd2.specialValue(type, tier);
            if (type == 130) {
                info.burns.push({ "dps": dmg * v / 100, "left": 240, "src": src });
                if (info.burns.length > 3) {
                    info.burns.shift();
                }
            } else if (type == 129 && !info.warded) {
                info.slowAmt = Math.max(info.slowLeft > 0 ? Number(info.slowAmt) : 0, v / 100);
                info.slowLeft = Math.max(info.slowLeft | 0, 80) | 0;
            } else if (type == 144 && !info.warded && Math.random() * 100 < v) {
                info.stunLeft = Math.max(info.stunLeft | 0, info.boss ? 16 : 32) | 0;
            } else if (type == 145) {
                info.vulnAmt = Math.max(info.vulnLeft > 0 ? Number(info.vulnAmt) : 0, v / 100);
                info.vulnLeft = 240;
            }
        }
        return -dmg;
    }

    // ---- every frame
    public static tick(): void {
        if (!IoTd2.on) {
            return;
        }
        IoTd2._frame++;
        let now: int = IoTd.steps;
        let d: int = (now - IoTd2._last) | 0;
        IoTd2._last = now;
        if (d > 0) {
            d = Math.min(d, 40) | 0;
            if (IoTd.waveOn) {
                for (let s of as3.values(IoTd2.SPELLS)) {
                    IoTd2.charge[s[0]] = Math.max(0, (IoTd2.charge[s[0]] | 0) - d) | 0;
                }
            }
            if (IoTd2._pactLeft > 0) {
                IoTd2._pactLeft = Math.max(0, IoTd2._pactLeft - d) | 0;
            }
            IoTd2.monsters(d);
            IoTd2.towersFire(d);
            IoTd2.falls(now);
        }
        IoTd2Fx.frame(IoTd2._frame);
        IoTd2Ui.frame(IoTd2._frame);
    }

    /** The monsters' states: venom and burns, healing, slows and stuns run down, the bosses' powers, their speed. */
    private static monsters(d: int): void {
        let list: any[] = [];
        let menders: any[] = [];
        for (let k of (IoTd.creeps?.keys() ?? [])) {
            let c: MonsterBase = as3.as(k, MonsterBase);
            let info: any = IoTd.creeps.get(k);
            if (!c || !info || info.leaked || c.health <= 0 || c.dying || c.dead || info.burns == null) {
                continue;
            }
            list.push(c);
            if (info.mending) {
                menders.push(c);
            }
        }
        let secs: number = d / IoHfoStepClock.STEPS_A_SECOND;
        for (let c of as3.values(list)) {
            let info: any = IoTd.infoOf(c);
            // venom and fire
            let dot: number = 0;
            let dotSrc: any = null;
            for (let i: int = info.poison.length - 1; i >= 0; i--) {
                let p: any = info.poison[i];
                dot += Number(p.dps) * secs;
                dotSrc = dotSrc || p.src;
                p.left -= d;
                if (p.left <= 0) {
                    info.poison.splice(i, 1);
                }
            }
            if (dot > 0) {
                IoTd2.deal(c, dot, dotSrc, "poison");
            }
            let burn: number = 0;
            let burnSrc: any = null;
            for (let i: int = info.burns.length - 1; i >= 0; i--) {
                let b: any = info.burns[i];
                burn += Number(b.dps) * secs;
                burnSrc = burnSrc || b.src;
                b.left -= d;
                if (b.left <= 0) {
                    info.burns.splice(i, 1);
                }
            }
            if (burn > 0 && c.health > 0) {
                IoTd2.deal(c, burn, burnSrc, "burn");
            }
            if (c.health <= 0) {
                continue;
            }
            // healing
            if (info.regen && c.health < c.maxHealth) {
                c.setHealth(Math.min(c.maxHealth, c.health + c.maxHealth * 0.025 * secs));
            }
            for (let m of as3.values(menders)) {
                if (m != c && c.health < c.maxHealth && Point.distance(m._tmpPoint, c._tmpPoint) < 90) {
                    c.setHealth(Math.min(c.maxHealth, c.health + c.maxHealth * 0.02 * secs));
                }
            }
            info.slowLeft = Math.max(0, (info.slowLeft | 0) - d) | 0;
            info.stunLeft = Math.max(0, (info.stunLeft | 0) - d) | 0;
            info.vulnLeft = Math.max(0, (info.vulnLeft | 0) - d) | 0;
            info.stoneLeft = Math.max(0, (info.stoneLeft | 0) - d) | 0;
            info.dashLeft = Math.max(0, (info.dashLeft | 0) - d) | 0;
            info.invulnLeft = Math.max(0, (info.invulnLeft | 0) - d) | 0;
            if (info.boss) {
                IoTd2.bossPowers(c, info, d);
            }
            // its speed
            let f: number = 1;
            if (info.stunLeft > 0 && !info.warded) {
                f = 0.02;
            } else if (info.slowLeft > 0 && !info.warded) {
                f = Math.max(0.2, 1 - Number(info.slowAmt));
            }
            if (info.dashLeft > 0) {
                f *= 2.2;
            }
            // (champions enrage when nearly dead; the Warden calls its guard instead)
            if (info.boss && !info.warden && c.health < c.maxHealth * 0.3) {
                f *= 1.3;
            }
            f = Math.round(f * 100) / 100;
            if (f != info.speedSet) {
                info.speedSet = f;
                c.moveSpeedProperty.value = Number(info.baseSpeed) * f;
            }
        }
    }

    private static bossPowers(c: MonsterBase, info: any, d: int): void {
        let id: string = String(c._creatureID);
        let w: int = IoTd.wave;
        let brood: boolean = id == "IC10" || info.warden;
        let stone: boolean = id == "IC9" || info.warden;
        let dash: boolean = id == "IC24" && !info.warden;
        if (brood) {
            info.cdBrood -= d;
            if (info.cdBrood <= 0) {
                info.cdBrood = info.warden ? 520 : 400;
                let at: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
                let hp: number = Number(IoTdWaves.KINDS[0][3]) * IoTd2.hpScale(w) * Number(IoTd2.diff.hp || 1) * 0.5;
                for (let i: int = 0; i < 2; i++) {
                    IoTd.spawnAt({ "id": "IC1", "bounty": 2, "leak": 1, "hp": Math.round(hp), "boss": false, "traits": [], "isSplit": true, "entry": info.entry | 0 }, new Point(at.x - 10 + i * 20, at.y + 10 - i * 20));
                }
                IoTd2Fx.ring(c._tmpPoint, 40, 0xFF8844, 0.5);
            }
        }
        if (stone) {
            info.cdStone -= d;
            if (info.cdStone <= 0) {
                info.cdStone = 640;
                info.stoneLeft = 200;
                IoTdUi.Float(KEYS.Get("io_t3t_td2_stone_skin"), c._tmpPoint, 0xC8C8D0);
            }
        }
        if (dash) {
            info.cdDash -= d;
            if (info.cdDash <= 0) {
                info.cdDash = info.warden ? 720 : 560;
                info.dashLeft = 120;
                IoTdUi.Float(KEYS.Get("io_t3t_td2_fire_dash"), c._tmpPoint, 0xFF7A2A);
            }
        }
        if (info.warden) {
            let share: number = c.health / Math.max(1, c.maxHealth);
            if ((info.phase == 0 && share < 0.66) || (info.phase == 1 && share < 0.33)) {
                info.phase++;
                info.invulnLeft = 160;
                c.setHealth(Math.min(c.maxHealth, c.health + c.maxHealth * 0.05));
                IoTdUi.Banner(KEYS.Get("io_t3t_td2_guard"), 0xFF5533);
                let at: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
                let kinds: int = IoTdWaves.kindsBy(w);
                for (let i: int = 0; i < 6; i++) {
                    let k: any[] = as3.as(IoTdWaves.KINDS[(i * 3 + info.phase) % kinds], Array);
                    let tr: string = String(IoTd2.TRAITS[(i + info.phase) % IoTd2.TRAITS.length][0]);
                    IoTd.spawnAt({ "id": String(k[0]), "bounty": Math.round(Number(k[1]) * IoTdWaves.goldScale(w)) | 0, "leak": k[2] | 0, "hp": Math.round(Number(k[3]) * IoTd2.hpScale(w) * Number(IoTd2.diff.hp || 1)), "boss": false, "traits": [tr], "entry": info.entry | 0 }, new Point(at.x + Math.cos(i) * 25, at.y + Math.sin(i) * 25));
                }
                IoTd2Fx.ring(c._tmpPoint, 90, 0xFF3322, 0.8);
                SOUNDS.Play("wmbhorn", 0.7);
            }
        }
    }

    /** The Hellforged towers' shots. */
    private static towersFire(d: int): void {
        for (let k of (IoTd.towers?.keys() ?? [])) {
            let b: BFOUNDATION = as3.as(k, BFOUNDATION);
            let info: any = IoTd.towers.get(k);
            if (!b || !info || !IoTd2.isCustom(b._type) || !b._mc) {
                continue;
            }
            let type: int = b._type;
            info.cd = Number(info.cd || 0) - d;
            if (type == IoTd2.SHRINE) {
                continue;
            }
            // (the Roost and the Catapult keep turning to the monster they would shoot)
            if ((type == IoTd2.ROOST || type == IoTd2.CATAPULT) && info.cd > 0 && IoTd2._frame % 6 == 0) {
                let near: any[] = IoTd2.inRange(IoTd2.centerOf(b), IoTd2.reach(b, info), type != IoTd2.ROOST || (info.special | 0) > 0, type != IoTd2.CATAPULT);
                if (near.length) {
                    IoTd2.aimAt(b, info, IoTd2.pick(near, info.priority | 0));
                }
            }
            if (info.cd > 0) {
                continue;
            }
            let at: Point = IoTd2.centerOf(b);
            let range: number = IoTd2.reach(b, info);
            if (type == IoTd2.DRUM) {
                info.cd = 160;
                if (IoTd.waveOn) {
                    IoTd2Fx.ring(at, range, 0xFF9A3A, 0.7, 0.35);
                }
                continue;
            }
            let dmg: number = IoTd2.damageOf(b, info);
            let rate: number = IoTd2.rateOf(b, info);
            if (type == IoTd2.OBELISK) {
                let near: any[] = IoTd2.inRange(at, range, true, true);
                if (!near.length) {
                    info.cd = 8;
                    continue;
                }
                info.cd = rate;
                let freeze: number = IoTd2.specialValue(type, info.special | 0);
                for (let o of as3.values(near)) {
                    let c: MonsterBase = as3.as(o.creep, MonsterBase);
                    let ci: any = IoTd.infoOf(c);
                    IoTd2.deal(c, dmg, b, "frost");
                    if (!ci.warded) {
                        ci.slowAmt = Math.max(ci.slowLeft > 0 ? Number(ci.slowAmt) : 0, 0.3);
                        ci.slowLeft = Math.max(ci.slowLeft | 0, 96) | 0;
                        if (freeze > 0 && Math.random() * 100 < freeze) {
                            ci.stunLeft = Math.max(ci.stunLeft | 0, ci.boss ? 30 : 80) | 0;
                        }
                    }
                }
                IoTd2Fx.ring(at, range, 0x8FE8FF, 0.45);
                continue;
            }
            let air: boolean = type != IoTd2.CATAPULT;
            let ground: boolean = type != IoTd2.ROOST || (info.special | 0) > 0;
            let cands: any[] = IoTd2.inRange(at, range, ground, air);
            if (type == IoTd2.ROOST) {
                // fliers first; walkers only with Swoop
                let fliers: any[] = [];
                for (let o of as3.values(cands)) {
                    if (IoTd.infoOf(as3.as(o.creep, MonsterBase)).flier) {
                        fliers.push(o);
                    }
                }
                if (fliers.length) {
                    cands = fliers;
                }
            }
            if (!cands.length) {
                info.cd = 8;
                continue;
            }
            let target: MonsterBase = IoTd2.pick(cands, info.priority | 0);
            if (!target) {
                info.cd = 8;
                continue;
            }
            info.cd = rate;
            IoTd2.aimAt(b, info, target);
            if (type == IoTd2.CATAPULT) {
                info.firedAt = IoTd.steps;
            }
            let ti: any = IoTd.infoOf(target);
            if (type == IoTd2.VENOM) {
                IoTd2Fx.bolt(at.add(new Point(0, -40)), target._tmpPoint, 0x7CFF4A, 3, 0.18);
                IoTd2.deal(target, dmg, b, "venom");
                IoTd2.addPoison(ti, dmg * 0.5, 320, b);
                let plague: int = IoTd2.specialValue(type, info.special | 0) | 0;
                if (plague > 0) {
                    ti.plague = Math.max(ti.plague | 0, plague);
                }
            } else if (type == IoTd2.ROOST) {
                let k2: number = ti.flier ? 1 : IoTd2.specialValue(type, info.special | 0) / 100;
                IoTd2Fx.bolt(at.add(new Point(0, -46)), target._tmpPoint, 0xD8D0C0, 2, 0.12);
                IoTd2.deal(target, dmg * k2, b, "roost");
            } else if (type == IoTd2.CATAPULT) {
                let splash: number = 45 * (1 + IoTd2.specialValue(type, info.special | 0) / 100);
                let travel: int = 40;
                IoTd2Fx.arc(at.add(new Point(0, -30)), target._tmpPoint.clone(), travel / IoHfoStepClock.STEPS_A_SECOND / Math.max(1, GLOBAL.ioStepScale));
                IoTd2._falling.push({ "at": IoTd.steps + travel, "pt": target._tmpPoint.clone(), "dmg": dmg, "splash": splash, "src": b, "kind": "boulder", "air": false, "burn": 0 });
            }
        }
    }

    private static pick(cands: any[], priority: int): MonsterBase {
        let best: any = null;
        let bestV: number = 0;
        for (let o of as3.values(cands)) {
            let c: MonsterBase = as3.as(o.creep, MonsterBase);
            let v: number = priority == IoTd.STRONG ? c.health : (priority == IoTd.CLOSE ? -Number(o.dist) : -IoTd.left(c));
            if (best == null || v > bestV) {
                best = c;
                bestV = v;
            }
        }
        return as3.as(best, MonsterBase);
    }

    /** Boulders and meteors landing. */
    private static falls(now: int): void {
        for (let i: int = IoTd2._falling.length - 1; i >= 0; i--) {
            let f: any = IoTd2._falling[i];
            if (now < (f.at | 0)) {
                continue;
            }
            IoTd2._falling.splice(i, 1);
            let pt: Point = as3.cast(f.pt, Point);
            let hit: any[] = IoTd2.inRange(pt, Number(f.splash), true, Boolean(f.air));
            for (let o of as3.values(hit)) {
                let c: MonsterBase = as3.as(o.creep, MonsterBase);
                let k: number = 1 - 0.5 * Math.min(1, Number(o.dist) / Math.max(1, Number(f.splash)));
                IoTd2.deal(c, Number(f.dmg) * k, f.src, String(f.kind));
                if (Number(f.burn) > 0) {
                    let ci: any = IoTd.infoOf(c);
                    if (ci && ci.burns) {
                        ci.burns.push({ "dps": Number(f.burn), "left": 240, "src": null });
                    }
                }
            }
            IoTd2Fx.blast(pt, Number(f.splash), f.kind == "meteor" ? 0xFF6A1A : 0xE8DCC0);
            if (f.kind == "meteor") {
                SOUNDS.Play("explosion", 0.7);
            }
        }
    }

    // ---- spells
    /** Steps a spell takes to charge (Arcana and Spellbound shorten it). */
    public static spellSteps(s: any[]): int {
        return Math.round(Number(s[2]) * IoHfoStepClock.STEPS_A_SECOND * (1 - 0.1 * IoTd2.perk("arcana")) * (IoTd2.has("spellbound") ? 0.5 : 1)) | 0;
    }

    public static spellOf(id: string): any[] {
        for (let s of as3.values(IoTd2.SPELLS)) {
            if (s[0] == id) {
                return as3.as(s, Array);
            }
        }
        return null;
    }

    /** Can it be cast now: "" if it can, else why not. */
    public static spellBlocker(id: string): string {
        let s: any[] = IoTd2.spellOf(id);
        // (QoL #235: in the player's language; "" still means it can)
        if (!s || !IoTd2.on) {
            return KEYS.Get("io_t3t_td2_no_spell");
        }
        if (IoTd.cleared + (IoTd.waveOn ? 1 : 0) < (s[3] | 0)) {
            return KEYS.Get("io_t3t_td2_spell_opens", { "v1": IoTd2.spellName(s), "v2": s[3] });
        }
        if (!IoTd.waveOn) {
            return KEYS.Get("io_t3t_td2_spell_wave");
        }
        if ((IoTd2.charge[id] | 0) > 0) {
            return KEYS.Get("io_t3t_td2_spell_charging", { "v1": IoTd2.spellName(s), "v2": Math.ceil((IoTd2.charge[id] | 0) / IoHfoStepClock.STEPS_A_SECOND) });
        }
        return "";
    }

    /** A spell's button (or key 1 to 4). Meteor waits for a click on the ground (IoTd2Ui.aim). */
    public static Cast(id: string): void {
        let why: string = IoTd2.spellBlocker(id);
        if (why) {
            IoTdUi.Toast(why);
            SOUNDS.Play("error1", 0.5);
            return;
        }
        let s: any[] = IoTd2.spellOf(id);
        if (id == "meteor") {
            IoTd2Ui.aim((iso: Point): void => {
                if (IoTd2.spellBlocker("meteor")) {
                    return;
                }
                IoTd2.charge.meteor = IoTd2.spellSteps(s);
                let w: int = Math.max(1, IoTd.wave) | 0;
                let dmg: number = 500 * IoTd2.hpScale(w) * Number(IoTd2.diff.hp || 1);
                IoTd2Fx.meteor(iso, 0.5 / Math.max(1, GLOBAL.ioStepScale));
                IoTd2._falling.push({ "at": IoTd.steps + 40, "pt": iso, "dmg": dmg, "splash": 85, "src": null, "kind": "meteor", "air": true, "burn": dmg * 0.08 });
                IoTd2Ui.Update();
            });
            return;
        }
        IoTd2.charge[id] = IoTd2.spellSteps(s);
        if (id == "nova") {
            for (let k of (IoTd.creeps?.keys() ?? [])) {
                let c: MonsterBase = as3.as(k, MonsterBase);
                let info: any = IoTd.creeps.get(k);
                if (!c || !info || info.leaked || c.health <= 0 || info.burns == null) {
                    continue;
                }
                if (info.warded) {
                    info.slowAmt = 0.3;
                    info.slowLeft = 240;
                } else {
                    info.stunLeft = Math.max(info.stunLeft | 0, info.boss ? 80 : 240) | 0;
                }
            }
            IoTd2Fx.flash(0x8FE8FF);
            SOUNDS.Play("inf_buildingplace", 0.6);
        } else if (id == "pact") {
            IoTd2._pactLeft = 15 * IoHfoStepClock.STEPS_A_SECOND;
            IoTd2Fx.flash(0xC4141E);
            IoTdUi.Toast(KEYS.Get("io_t3t_td2_pact_on"));
        } else if (id == "wrath") {
            for (let k of (IoTd.creeps?.keys() ?? [])) {
                let c: MonsterBase = as3.as(k, MonsterBase);
                let info: any = IoTd.creeps.get(k);
                if (!c || !info || info.leaked || c.health <= 0) {
                    continue;
                }
                IoTd2.deal(c, c.health * (info.boss ? 0.08 : 0.25), null, "wrath");
                IoTd2Fx.ring(c._tmpPoint, 18, 0xFF3322, 0.4);
            }
            IoTd2Fx.flash(0xFF3322);
            SOUNDS.Play("wmbhorn", 0.5);
        }
        IoTd2Ui.Update();
    }

    public static get pactLeft(): int {
        return IoTd2._pactLeft;
    }

    /** The win's window: play on (endless), or leave with the win. */
    public static playOn(): void {
        IoTd2.holding = false;
    }
}
