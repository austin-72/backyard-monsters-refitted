import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { ChampionBase, CREATURELOCKER, CREATURES, CREEPS, GLOBAL, HOUSINGPOPUP, IoChampionStatue, IoFmiWaves, IoHfoWaves, IoReplayPlayer, IoSynergyBoost, IoTd, IoTd2, KEYS, MonsterBase, PATHING, Targeting } from "@game";

/**
 * Inferno-only (11 November, the user's "monsters in battle boost each other"): monster synergies. Two kinds of
 * monster that fight side by side give each other a small boost: more damage, or some armour. The pairings and
 * every number are the server's (InfernoOnlyConfig.synergy, sent as the flag io_synergy), so they are retuned
 * with a server restart and no new build.
 *
 * The rule, for a monster M of kind A whose pairing is (A, B):
 *   O = the housing of the A's within `radius` of M (M among them), P = the housing of the B's within it
 *   strength = min(1, P / (ratio x O)), rounded down to a quarter
 *   M gets its pairing's amount x strength.
 * Housing, not heads: one cheap partner cannot switch a whole army on. Only monsters of M's own side that are
 * alive and fighting count. A monster has one synergy at a time, its strongest (a tie: the pairing listed first).
 * Once its partner is gone or out of reach the boost is kept `linger` more game steps, so it does not flicker at
 * the edge of the radius.
 *
 * NO BOOSTS FOR CHAMPIONS (the user's rule): Korath, Drull, Ashkarr, the Rimegrave, the Basilisk and every cage or
 * guardian champion never get a synergy, never give one and are never counted, in attack or defence; a pairing in
 * the config that names one is dropped here. Rezghul's raised dead, a Clinkerjaw's hatchlings and a Spurtz
 * Cannon's Spurtz are left out too (they cost no housing: a death would feed the synergy).
 *
 * It is a modifier on the living monster (IoSynergyBoost), as Ashkarr's war-cry is: the monsters' tables, which
 * the server checks with every attack (validateAttack), are never touched, and nothing new is saved. Nothing is
 * drawn on a boosted monster (no glow), so a replay has nothing to show for it; its puppets are never boosted.
 */
export class IoSynergy {
    /** What the code allows whatever the config says: +15% damage, 15% armour. */
    public static readonly MAX_DAMAGE: number = 0.15;
    public static readonly MAX_ARMOR: number = 0.15;

    private static _raw: string = null;
    private static _cfg: any = null;
    /** Monster id -> its pairings: [{pair, partner, kind, amount, radius, order}]. */
    private static _byMonster: any = null;
    private static _steps: int = 0;
    /** The monsters that hold a boost now (so it can be taken off when they stop counting). */
    private static _boosted: MonsterBase[] = [];

    /** The server's settings (null when synergies are off). Parsed again only when the flag changes. */
    public static get config(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_synergy ? String(GLOBAL._flags.io_synergy) : "";
        if (raw === IoSynergy._raw) {
            return IoSynergy._cfg;
        }
        IoSynergy._raw = raw;
        IoSynergy._cfg = null;
        IoSynergy._byMonster = null;
        if (raw == "") {
            return null;
        }
        let sent: any = null;
        try {
            sent = JSON.parse(raw);
        } catch (e) {
            return null;
        }
        if (!sent || !sent.enabled || !as3.is(sent.pairs, Array)) {
            return null;
        }
        let num: Function = (v: any, fallback: number, low: number, high: number): number => {
            let n: number = Number(v);
            return isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback;
        };
        let caps: any = sent.caps || {};
        let maxDamage: number = Math.min(IoSynergy.MAX_DAMAGE, num(caps.damage, IoSynergy.MAX_DAMAGE, 0, 1));
        let maxArmor: number = Math.min(IoSynergy.MAX_ARMOR, num(caps.armor, IoSynergy.MAX_ARMOR, 0, 1));
        let cfg: any = {
            "radius": num(sent.radius, 250, 50, 1000),
            "ratio": num(sent.ratio, 0.5, 0.05, 10),
            "stepEvery": num(sent.stepEvery, 40, 10, 400) | 0,
            "linger": num(sent.linger, 80, 0, 800) | 0,
            "quantize": num(sent.quantize, 4, 1, 100) | 0,
            "sides": sent.sides || {},
            "pairs": []
        };
        let byMonster: any = {};
        let order: int = 0;
        let add: Function = (pair: any, me: string, partner: string, damage: any, armor: any): void => {
            let d: number = num(damage, 0, 0, maxDamage);
            let a: number = num(armor, 0, 0, maxArmor);
            if (d <= 0 && a <= 0) {
                return;
            }
            if (!byMonster[me]) {
                byMonster[me] = [];
            }
            // (one effect each way: damage if both were given)
            byMonster[me].push({ "pair": String(pair.id), "partner": partner, "kind": d > 0 ? IoSynergyBoost.DAMAGE : IoSynergyBoost.ARMOR, "amount": d > 0 ? d : a, "radius": num(pair.radius, cfg.radius, 50, 1000), "order": order++ });
        };
        let pair: any = null;
        for (pair of as3.values(sent.pairs)) {
            if (!pair || !pair.a || !pair.b || pair.a == pair.b) {
                continue;
            }
            let a: string = String(pair.a);
            let b: string = String(pair.b);
            // the user's rule: no champion in any pairing, whatever the config says
            if (IoSynergy.isChampionId(a) || IoSynergy.isChampionId(b)) {
                continue;
            }
            if (!CREATURELOCKER._creatures || !CREATURELOCKER._creatures[a] || !CREATURELOCKER._creatures[b]) {
                continue;
            }
            add(pair, a, b, pair.aDamage, pair.aArmor);
            add(pair, b, a, pair.bDamage, pair.bArmor);
            cfg.pairs.push({ "id": String(pair.id), "a": a, "b": b, "aDamage": num(pair.aDamage, 0, 0, maxDamage), "aArmor": num(pair.aArmor, 0, 0, maxArmor), "bDamage": num(pair.bDamage, 0, 0, maxDamage), "bArmor": num(pair.bArmor, 0, 0, maxArmor) });
        }
        if (cfg.pairs.length == 0) {
            return null;
        }
        IoSynergy._cfg = cfg;
        IoSynergy._byMonster = byMonster;
        return cfg;
    }

    /** A champion by any of the game's tests (the Strongbox's fifth page, the skins' list, the statue's). */
    public static isChampionId(id: string): boolean {
        if (!id) {
            return false;
        }
        if (id.substr(0, 1) == "G" || HOUSINGPOPUP.ioIsChampion(id) || IoChampionStatue.CHAMPIONS.indexOf(id) >= 0) {
            return true;
        }
        let entry: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[id] : null;
        return Boolean(entry) && Number(entry.page) == 5;
    }

    /** Can this monster give, get and be counted? (Its side is asked separately: sideOn.) */
    public static eligible(m: MonsterBase): boolean {
        if (!m || m._ioPuppetOnly || m.isDisposable || m.ioHatchling || m.dying || !(m.health > 0) || !m.inBattleState) {
            return false;
        }
        if (as3.is(m, ChampionBase) || IoSynergy.isChampionId(m._creatureID)) {
            return false;
        }
        return Boolean(IoSynergy._byMonster) && Boolean(IoSynergy._byMonster[m._creatureID]);
    }

    /**
     * Are synergies on for this side in this battle? `friendly`: the yard's own monsters (the defenders).
     *  - the player attacking another player: `attacker` for theirs, `playerDefender` for the yard's
     *  - the player attacking a tribe or Moloch (the Gauntlet and the Depths too): `pveAttacker`, and `ai` for the
     *    tribe's own monsters
     *  - a wild raid on the player's yard: `ai` for the raiders, `playerDefender` for the player's
     */
    public static sideOn(friendly: boolean): boolean {
        let cfg: any = IoSynergy.config;
        if (!cfg) {
            return false;
        }
        let sides: any = cfg.sides;
        let on: Function = (key: string, fallback: boolean): boolean => (sides.hasOwnProperty(key) ? Boolean(sides[key]) : fallback);
        let mode: string = GLOBAL.mode;
        let wild: boolean = mode == GLOBAL.e_BASE_MODE.WMATTACK || mode == GLOBAL.e_BASE_MODE.IWMATTACK;
        let attacking: boolean = wild || mode == GLOBAL.e_BASE_MODE.ATTACK || mode == GLOBAL.e_BASE_MODE.IATTACK;
        if (friendly) {
            return attacking && wild ? on("ai", false) : on("playerDefender", true);
        }
        if (!attacking) {
            return on("ai", false);
        }
        return wild ? on("pveAttacker", true) : on("attacker", true);
    }

    /** No synergies in a replay (puppets), nor in the events' and the arcade's fights unless the config says so. */
    private static battleOff(cfg: any): boolean {
        if (IoReplayPlayer.playing) {
            return true;
        }
        if (cfg.sides && cfg.sides.events) {
            return false;
        }
        return IoHfoWaves.running || IoFmiWaves.running || IoTd.on || IoTd2.on;
    }

    /** Once a game step, after the monsters moved (GLOBAL's and BASE's loops); works every `stepEvery` steps. */
    public static tick(): void {
        let cfg: any = IoSynergy.config;
        if (!cfg) {
            if (IoSynergy._boosted.length) {
                IoSynergy.clearAll();
            }
            return;
        }
        if (++IoSynergy._steps < cfg.stepEvery) {
            return;
        }
        IoSynergy._steps = 0;
        if (IoSynergy.battleOff(cfg)) {
            if (IoSynergy._boosted.length) {
                IoSynergy.clearAll();
            }
            return;
        }
        // nothing to do in a quiet yard: no attackers out, nobody boosted
        if (CREEPS._creepCount <= 0 && IoSynergy._boosted.length == 0) {
            return;
        }
        IoSynergy.update(cfg);
    }

    /** Every monster on the field once (attackers, the yard's, a bunker's), from Targeting's cells. */
    private static everyone(): MonsterBase[] {
        let out: MonsterBase[] = [];
        let cells: any = Targeting._creepCells;
        let node: string = null;
        let id: string = null;
        for (node in cells) {
            let cell: any = cells[node];
            for (id in cell) {
                let m: MonsterBase = as3.as(cell[id], MonsterBase);
                if (m) {
                    out.push(m);
                }
            }
        }
        return out;
    }

    private static update(cfg: any): void {
        // [side][monster id] -> [{m, x, y, size}]
        let groups: any[] = [{}, {}];
        let sideIsOn: boolean[] = [IoSynergy.sideOn(false), IoSynergy.sideOn(true)];
        let all: MonsterBase[] = sideIsOn[0] || sideIsOn[1] ? IoSynergy.everyone() : [];
        let m: MonsterBase = null;
        for (m of all) {
            let side: int = m._friendly ? 1 : 0;
            if (!sideIsOn[side] || !IoSynergy.eligible(m)) {
                continue;
            }
            let at: Point = PATHING.FromISO(m._tmpPoint ? m._tmpPoint : new Point(m.x, m.y));
            if (!at) {
                continue;
            }
            let list: any[] = groups[side][m._creatureID];
            if (!list) {
                list = groups[side][m._creatureID] = [];
            }
            list.push({ "m": m, "x": at.x, "y": at.y, "size": Math.max(1, Number(CREATURES.GetProperty(m._creatureID, "cStorage", 0, true)) || 1) });
        }
        let kept: MonsterBase[] = [];
        let side: int = 0;
        while (side < 2) {
            let kind: string = null;
            for (kind in groups[side]) {
                let mine: any[] = groups[side][kind];
                let options: any[] = IoSynergy._byMonster[kind];
                let me: any = null;
                for (me of mine) {
                    let best: any = null;
                    let bestStrength: number = 0;
                    let option: any = null;
                    for (option of options) {
                        let partners: any[] = groups[side][option.partner];
                        if (!partners || partners.length == 0) {
                            continue;
                        }
                        let r2: number = option.radius * option.radius;
                        let own: number = IoSynergy.housingNear(mine, me, r2);
                        let theirs: number = IoSynergy.housingNear(partners, me, r2);
                        if (theirs <= 0 || own <= 0) {
                            continue;
                        }
                        let strength: number = Math.floor(Math.min(1, theirs / (cfg.ratio * own)) * cfg.quantize + 1e-9) / cfg.quantize;
                        if (strength > bestStrength) {
                            bestStrength = strength;
                            best = option;
                        }
                    }
                    let boost: IoSynergyBoost = as3.as(me.m.getComponentByName(IoSynergyBoost.NAME), IoSynergyBoost);
                    if (best) {
                        if (!boost) {
                            boost = new IoSynergyBoost();
                            me.m.addComponent(boost, IoSynergyBoost.NAME);
                        }
                        boost.set(best.kind, best.amount * bestStrength, best.pair);
                        boost.left = cfg.linger;
                        kept.push(me.m);
                    } else if (boost) {
                        // its partner is gone or out of reach: kept a little longer, then taken off
                        boost.left -= cfg.stepEvery;
                        if (boost.left > 0) {
                            kept.push(me.m);
                        } else {
                            me.m.removeComponent(boost);
                        }
                    }
                }
            }
            side++;
        }
        // whoever held a boost and no longer counts at all (dead, a side switched off, back in its housing)
        let old: MonsterBase = null;
        for (old of IoSynergy._boosted) {
            if (kept.indexOf(old) < 0) {
                IoSynergy.strip(old);
            }
        }
        IoSynergy._boosted = kept;
    }

    private static housingNear(list: any[], me: any, r2: number): number {
        let total: number = 0;
        let other: any = null;
        for (other of list) {
            let dx: number = other.x - me.x;
            let dy: number = other.y - me.y;
            if (dx * dx + dy * dy <= r2) {
                total += other.size;
            }
        }
        return total;
    }

    private static strip(m: MonsterBase): void {
        if (!m) {
            return;
        }
        let boost: IoSynergyBoost = as3.as(m.getComponentByName(IoSynergyBoost.NAME), IoSynergyBoost);
        if (boost) {
            m.removeComponent(boost);
        }
    }

    private static clearAll(): void {
        let m: MonsterBase = null;
        for (m of IoSynergy._boosted) {
            IoSynergy.strip(m);
        }
        IoSynergy._boosted = [];
    }

    /**
     * What a monster's info says about its synergies (the Strongbox, the Hatchery, the Academy): one line a
     * pairing, "With Zagnoid fighting beside it: +12% damage"; for a champion, that it has none. "" when
     * synergies are off or the monster has no pairing.
     */
    public static describe(id: string): string {
        let cfg: any = IoSynergy.config;
        if (!cfg || !id) {
            return "";
        }
        if (IoSynergy.isChampionId(id)) {
            return KEYS.Get("io_syn_champion");
        }
        let options: any[] = IoSynergy._byMonster ? IoSynergy._byMonster[id] : null;
        if (!options) {
            return "";
        }
        let lines: string[] = [];
        let option: any = null;
        for (option of options) {
            let partner: any = CREATURELOCKER._creatures[option.partner];
            let name: string = partner ? KEYS.Get(String(partner.name)) : String(option.partner);
            let percent: string = String(Math.round(option.amount * 100));
            lines.push(KEYS.Get(option.kind == IoSynergyBoost.ARMOR ? "io_syn_line_armor" : "io_syn_line_damage", { "v1": name, "v2": percent }));
        }
        return lines.join("<br>");
    }

    /** The pairings as the server sent them, checked ([{id, a, b, aDamage, aArmor, bDamage, bArmor}]). */
    public static get pairs(): any[] {
        let cfg: any = IoSynergy.config;
        return cfg ? cfg.pairs : [];
    }
}
