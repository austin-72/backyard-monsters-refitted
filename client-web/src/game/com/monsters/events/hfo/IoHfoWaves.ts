import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BMUSHROOM, BTOWER, CREATURELOCKER, CREEPS, GLOBAL, GRID, HOUSINGBUNKER, InstanceManager, IoHfo, IoHfoArt, IoHfoStepClock, IoHfoUi, KEYS, MAP, MonsterBase, PATHING, PLEASEWAIT, SOUNDS, UI2, WMATTACK } from "@game";

/**
 * Hell Freezes Over: the 13 waves of ice cretins, fought in the player's main yard like a wild monster attack
 * (WMATTACK runs the fight: the warning bar, the panic music, the yard's own defences and monsters).
 *
 *  - The server counts the tries (3 a wave, counted when a wave starts: hfo/wavestart) and pays the shiny
 *    (hfo/waveend). A skipped wave can be replayed any time, for no tries and no pay.
 *  - Won: every ice cretin gone (the Hulks' Shivlings too). Lost: 99% or more of the yard destroyed, or the
 *    Surrender button. Wild attacks wait while a wave is on (it is the yard's attack).
 *  - Nothing is repaired for free: damaged buildings start their usual repair afterwards, and monsters lost
 *    defending stay lost.
 *  - The Compound is frozen solid while a wave is on (the user's call, 1 October): an ice block over it, and
 *    none of its monsters comes out to fight (HOUSINGBUNKER asks compoundFrozen). It thaws when the wave ends.
 *    The monsters pacing inside are frozen too (MonsterBase.tick: no moving, no animation) and the ice is drawn
 *    over them (4 October).
 *  - The heat comes back for the stragglers: MELT_AFTER seconds of fighting after the last surge, the ice
 *    cretins still standing start melting (MELT_PER_SECOND of their health a second). A Sleetwing pecking at
 *    a tower out of every anti-air tower's reach kept a wave going for over ten minutes (the balance runs,
 *    1 October); now no wave outlasts its last surge by more than about three minutes.
 *
 * The waves are set for an Inferno Under Hall of level 6 (the user's call, 1 October), not scaled. Each comes
 * in surges a few seconds apart; waves 1-4 come from one side, 5-9 from two and 10-13 from all four.
 */
export class IoHfoWaves extends ASObject {
    public static S: string; // const

    // Shivling
    public static G: string; // const

    // Slushgut
    public static R: string; // const

    // Rimeclaw
    public static W: string; // const

    // Sleetwing
    public static H: string; // const

    // Hailspitter
    public static P: string; // const

    // Permafrost Hulk
    /**
     * Each wave: its surges [seconds after the start, [[monster, how many, side], ...]]. Sides 0-3 are a
     * quarter turn apart, from a direction picked at random for each attempt.
     * (Every count doubled on 1 October, the user's call after the balance runs: a maxed Under Hall 6 yard lost
     * at most 12% of itself to the first table.)
     */
    public static WAVES: any[]; // const

    /** Every group's count is multiplied by this (1: the table as it is; the balance runs try more). */
    public static countScale: number;

    /** Seconds of fighting after the last surge before the stragglers start to melt. */
    public static MELT_AFTER: int; // const

    /** How much of its health a melting ice cretin loses each second (all of it in 50 seconds). */
    public static MELT_PER_SECOND: number; // const

    /** Lost at this much of the yard destroyed. */
    public static LOSE_PERCENT: int; // const

    private static _fight: any;

    private static _surges: any[];

    /** The wave's fighting time, in simulation steps (GLOBAL's fast tickables). */
    private static _clock: IoHfoStepClock;

    private static _dir: number;

    private static _ending: boolean;

    private static _checks: int;

    /** The ice blocks over the Compounds (IoHfoArt.towerIceOn handles). */
    private static _compoundIce: any[];

    /** When the last surge came (fighting seconds), or NaN while surges are still to come. */
    private static _lastSurgeAt: number;

    /** Seconds of melting dealt so far. */
    private static _melted: int;

    static {
        as3.lazyStatics(this, { S: null, G: null, R: null, W: null, H: null, P: null, WAVES: null, countScale: NaN, MELT_AFTER: 0, MELT_PER_SECOND: NaN, LOSE_PERCENT: 0, _fight: null, _surges: null, _clock: null, _dir: NaN, _ending: false, _checks: 0, _compoundIce: null, _lastSurgeAt: NaN, _melted: 0 }, () => {
            IoHfoWaves.S = "IC26";
            IoHfoWaves.G = "IC27";
            IoHfoWaves.R = "IC28";
            IoHfoWaves.W = "IC29";
            IoHfoWaves.H = "IC30";
            IoHfoWaves.P = "IC31";
            IoHfoWaves.WAVES = [[[0, [[IoHfoWaves.S, 32, 0]]]], [[0, [[IoHfoWaves.S, 32, 0], [IoHfoWaves.G, 6, 0]]]], [[0, [[IoHfoWaves.S, 24, 0], [IoHfoWaves.R, 16, 0]]]], [[0, [[IoHfoWaves.G, 8, 0], [IoHfoWaves.R, 20, 0]]]], [[0, [[IoHfoWaves.S, 40, 0], [IoHfoWaves.W, 16, 2]]]], [[0, [[IoHfoWaves.G, 12, 0], [IoHfoWaves.H, 20, 2]]]], [[0, [[IoHfoWaves.R, 24, 0], [IoHfoWaves.W, 20, 2]]], [20, [[IoHfoWaves.H, 16, 0]]]], [[0, [[IoHfoWaves.S, 30, 0], [IoHfoWaves.S, 30, 2]]], [15, [[IoHfoWaves.P, 2, 0]]]], [[0, [[IoHfoWaves.G, 16, 0], [IoHfoWaves.H, 24, 2]]], [20, [[IoHfoWaves.W, 24, 0]]]], [[0, [[IoHfoWaves.R, 14, 0], [IoHfoWaves.R, 14, 2], [IoHfoWaves.H, 20, 1]]], [20, [[IoHfoWaves.P, 2, 1], [IoHfoWaves.P, 2, 3]]]], [[0, [[IoHfoWaves.S, 40, 0], [IoHfoWaves.S, 40, 2], [IoHfoWaves.W, 32, 1]]], [20, [[IoHfoWaves.G, 8, 1], [IoHfoWaves.G, 8, 3]]]], [[0, [[IoHfoWaves.R, 16, 0], [IoHfoWaves.R, 16, 2], [IoHfoWaves.H, 28, 1]]], [20, [[IoHfoWaves.W, 24, 3], [IoHfoWaves.P, 2, 0]]], [40, [[IoHfoWaves.P, 4, 2]]]], [[0, [[IoHfoWaves.S, 50, 0], [IoHfoWaves.S, 50, 2], [IoHfoWaves.R, 16, 1], [IoHfoWaves.R, 16, 3]]], [25, [[IoHfoWaves.G, 10, 0], [IoHfoWaves.G, 10, 2], [IoHfoWaves.H, 16, 1], [IoHfoWaves.H, 16, 3], [IoHfoWaves.W, 16, 0], [IoHfoWaves.W, 16, 2]]], [55, [[IoHfoWaves.P, 4, 1], [IoHfoWaves.P, 4, 3]]]]];
            IoHfoWaves.countScale = 1;
            IoHfoWaves.MELT_AFTER = 120;
            IoHfoWaves.MELT_PER_SECOND = 0.02;
            IoHfoWaves.LOSE_PERCENT = 99;
            IoHfoWaves._fight = null;
            IoHfoWaves._surges = [];
            IoHfoWaves._clock = null;
            IoHfoWaves._dir = 0;
            IoHfoWaves._ending = false;
            IoHfoWaves._checks = 0;
            IoHfoWaves._compoundIce = [];
            IoHfoWaves._lastSurgeAt = NaN;
            IoHfoWaves._melted = 0;
        });
    }

    public static get running(): boolean {
        return IoHfoWaves._fight != null;
    }

    /** The Compound is sealed in ice: its monsters stay in (from the wave's start until it is over). */
    public static get compoundFrozen(): boolean {
        return IoHfoWaves._fight != null;
    }

    private static freezeCompounds(): void {
        IoHfoWaves.thawCompounds(false);
        for (let o of (InstanceManager.getInstancesByClass(HOUSINGBUNKER) ?? [])) {
            let b: HOUSINGBUNKER = as3.as(o, HOUSINGBUNKER);
            if (!b || b.health <= 0) {
                continue;
            }
            let fp: Rectangle = b._footprint && b._footprint.length ? as3.as(b._footprint[0], Rectangle) : null;
            // (the big block is made for a 120-wide bunker: the Compound is 160)
            // (over the monsters pacing inside it too: they are down to 120 below its top, HOUSING.PointInHouse)
            let handle: any = IoHfoArt.towerIceOn(b, Number(fp ? Math.max(1, fp.width / 120) : 1), 135);
            if (handle) {
                IoHfoWaves._compoundIce.push(handle);
            }
        }
    }

    private static thawCompounds(shatter: boolean): void {
        for (let handle of as3.values(IoHfoWaves._compoundIce)) {
            IoHfoArt.towerIceOff(handle, shatter);
        }
        IoHfoWaves._compoundIce = [];
        // and any tower an ice monster left iced: its wait only runs down while there are monsters about, so
        // with the wave over it would stay iced
        for (let o of (InstanceManager.getInstancesByClass(BTOWER) ?? [])) {
            let t: BTOWER = as3.as(o, BTOWER);
            if (t && t.ioIced) {
                t.ioIceBreak(shatter);
            }
        }
    }

    /** Fights `wave` (the current one, or a skipped one again). */
    public static Start(wave: int): void {
        if (IoHfoWaves._fight || IoHfoWaves._ending) {
            return;
        }
        if (!IoHfo.inYard()) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("hfo_err_attack"));
            return;
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        IoHfo.call("wavestart", [["wave", wave]], (r: any): void => {
            PLEASEWAIT.Hide();
            if (!IoHfo.inYard() || WMATTACK._inProgress) {
                return;
            }
            IoHfoWaves.begin(r.fight);
        }, (): void => {
            PLEASEWAIT.Hide();
        });
    }

    private static begin(fight: any): void {
        IoHfoWaves._fight = fight;
        IoHfoWaves._ending = false;
        IoHfoWaves._checks = 0;
        IoHfoWaves._lastSurgeAt = NaN;
        IoHfoWaves._melted = 0;
        IoHfoWaves._surges = (as3.as(IoHfoWaves.WAVES[Math.max(0, Math.min(IoHfoWaves.WAVES.length, fight.wave | 0) - 1)], Array)).concat();
        if (IoHfoWaves._clock) {
            GLOBAL.removeFastTickable(IoHfoWaves._clock);
        }
        IoHfoWaves._clock = new IoHfoStepClock();
        GLOBAL.addFastTickable(IoHfoWaves._clock);
        IoHfoWaves._dir = Math.random() * 360;
        IoHfoUi.CloseWindow();
        WMATTACK.HideWarning();
        if (UI2._wildMonsterBar) {
            UI2.Hide("wmbar");
        }
        PATHING.ResetCosts();
        WMATTACK._isAI = false;
        WMATTACK.AttackB();
        WMATTACK.AttackC();
        SOUNDS.PlayMusic("musicipanic");
        UI2._warning.Update("<font size=\"28\">" + KEYS.Get("hfo_hud_wave", { "v1": fight.wave | 0 }) + "</font>");
        UI2.Show("surrender");
        if (UI2._scareAway) {
            UI2._scareAway.addEventListener("scareAway", IoHfoWaves.surrender);
        }
        WMATTACK.setEnd(IoHfoWaves.allGone);
        WMATTACK._inProgress = true;
        IoHfoWaves.freezeCompounds();
        BASE._blockSave = false;
        IoHfoWaves.surgeDue(true);
    }

    /** Each frame from IoHfo: surges as they come, and the yard's state. */
    public static Tick(): void {
        if (!IoHfoWaves._fight || IoHfoWaves._ending) {
            return;
        }
        IoHfoWaves.surgeDue(false);
        IoHfoWaves.melt();
        if (++IoHfoWaves._checks % 20 == 0) {
            // (watching a wave is playing: the "Anyone home?" stop after 10 minutes without a touch would
            // throw the wave away, and the invite popup at 6 would land on the battle)
            GLOBAL.UpdateAFKTimer();
            if (IoHfoWaves.destroyedPercent() >= IoHfoWaves.LOSE_PERCENT) {
                IoHfoWaves.finish(false);
            }
        }
    }

    private static surgeDue(first: boolean): void {
        let seconds: number = Number(IoHfoWaves._clock ? IoHfoWaves._clock.seconds : 0);
        while (IoHfoWaves._surges.length && (first || Number(IoHfoWaves._surges[0][0]) <= seconds)) {
            IoHfoWaves.spawn(as3.as(IoHfoWaves._surges.shift()[1], Array));
            first = false;
            if (!IoHfoWaves._surges.length) {
                IoHfoWaves._lastSurgeAt = seconds;
            }
        }
    }

    /** The stragglers melt: MELT_AFTER seconds after the last surge, a bite of their health each second. */
    private static melt(): void {
        if (isNaN(IoHfoWaves._lastSurgeAt) || !IoHfoWaves._clock) {
            return;
        }
        let due: int = (IoHfoWaves._clock.seconds - IoHfoWaves._lastSurgeAt - IoHfoWaves.MELT_AFTER) | 0;
        if (due <= IoHfoWaves._melted) {
            return;
        }
        if (IoHfoWaves._melted == 0) {
            UI2._warning.Update("<font size=\"22\">" + KEYS.Get("hfo_hud_melting") + "</font>");
        }
        while (IoHfoWaves._melted < due) {
            IoHfoWaves._melted++;
            for (let c of as3.values(CREEPS._creeps)) {
                let m: MonsterBase = as3.as(c, MonsterBase);
                if (m && m.health > 0 && CREATURELOCKER.HFO_CRETINS.indexOf(m._creatureID) != -1) {
                    m.modifyHealth(-Math.max(1, Math.ceil(m.maxHealth * IoHfoWaves.MELT_PER_SECOND)));
                }
            }
        }
    }

    private static spawn(groups: any[]): void {
        let focus: boolean = true;
        for (let g of as3.values(groups)) {
            let angle: number = (IoHfoWaves._dir + (g[2] | 0) * 90) * 0.0174532925;
            let dist: number = 800 + 125;
            let at: Point = GRID.ToISO(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
            let made: any[] = WMATTACK.SpawnCreep(at, 250, String(g[0]), Math.max(1, Math.round((g[1] | 0) * IoHfoWaves.countScale)) | 0, "bounce", 1);
            if (focus && made.length) {
                focus = false;
                MAP.FocusTo(as3.cast(made[0], MonsterBase).x | 0, as3.cast(made[0], MonsterBase).y | 0, 1);
            }
        }
    }

    /** WMATTACK: no attacker left. The next surge comes now, or the wave is won. */
    private static allGone(): void {
        if (!IoHfoWaves._fight || IoHfoWaves._ending) {
            WMATTACK.CleanUpLite();
            return;
        }
        if (IoHfoWaves._surges.length) {
            // (all gone before the next surge was due: it comes now, and the ones after keep their gaps)
            let surge: any[] = as3.as(IoHfoWaves._surges.shift(), Array);
            IoHfoWaves.spawn(as3.as(surge[1], Array));
            if (IoHfoWaves._clock) {
                IoHfoWaves._clock.steps = (Number(surge[0]) * IoHfoStepClock.STEPS_A_SECOND) | 0;
                if (!IoHfoWaves._surges.length) {
                    IoHfoWaves._lastSurgeAt = IoHfoWaves._clock.seconds;
                }
            }
            return;
        }
        IoHfoWaves.finish(true);
    }

    private static surrender(e: Event = null): void {
        if (UI2._scareAway) {
            UI2._scareAway.removeEventListener("scareAway", IoHfoWaves.surrender);
        }
        IoHfoWaves.finish(false);
    }

    /** How much of the yard is destroyed (walls and traps aside), as a percent. */
    public static destroyedPercent(): int {
        let health: number = 0;
        let max: number = 0;
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || b instanceof BMUSHROOM || b._class == "wall" || b._class == "trap" || b._class == "decoration" || b._class == "enemy" || b._class == "immovable") {
                continue;
            }
            health += Math.max(0, b.health);
            max += b.maxHealth;
        }
        return max > 0 ? (100 - 100 * health / max) | 0 : 0;
    }

    private static finish(won: boolean): void {
        if (!IoHfoWaves._fight || IoHfoWaves._ending) {
            return;
        }
        IoHfoWaves._ending = true;
        IoHfoWaves.stopClock();
        IoHfoWaves.thawCompounds(true);
        let fight: any = IoHfoWaves._fight;
        if (!won) {
            // the ice cretins go back to the frozen wastes
            for (let c of as3.values(CREEPS._creeps)) {
                try {
                    as3.cast(c, MonsterBase).changeModeRetreat();
                } catch (e) {
                }
            }
        }
        WMATTACK.setEnd();
        WMATTACK.CleanUpLite();
        UI2.Hide("surrender");
        IoHfo.call("waveend", [["wave", fight.wave | 0], ["id", fight.id | 0], ["won", won ? "1" : "0"]], (r: any): void => {
            IoHfoWaves._fight = null;
            IoHfoWaves._ending = false;
            if (r.credits != null && Number(r.paid) > 0) {
                BASE._credits.Set(r.credits | 0);
                BASE._hpCredits = r.credits | 0;
                GLOBAL._credits.Set(r.credits | 0);
            }
            IoHfo.TombUpdate();
            IoHfoUi.Hud();
            IoHfoUi.WaveResult(r);
        }, (): void => {
            IoHfoWaves._fight = null;
            IoHfoWaves._ending = false;
        });
    }

    private static stopClock(): void {
        if (IoHfoWaves._clock) {
            GLOBAL.removeFastTickable(IoHfoWaves._clock);
            IoHfoWaves._clock = null;
        }
    }

    /** How long the wave has been fought, in seconds of game time (the simulation's 80 steps a second). */
    public static get fightSeconds(): number {
        return Number(IoHfoWaves._clock ? IoHfoWaves._clock.seconds : 0);
    }

    /** The yard is leaving in the middle of a wave (it counts as lost: the server settles it). */
    public static Abandon(): void {
        IoHfoWaves.stopClock();
        IoHfoWaves.thawCompounds(false);
        IoHfoWaves._fight = null;
        IoHfoWaves._ending = false;
        IoHfoWaves._surges = [];
    }
}
