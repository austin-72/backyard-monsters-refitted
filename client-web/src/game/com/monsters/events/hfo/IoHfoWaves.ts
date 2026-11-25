import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { setTimeout } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, BTOWER, CREATURELOCKER, CREEPS, GLOBAL, GRID, HOUSINGBUNKER, InstanceManager, IoHfo, IoHfoArt, IoHfoStepClock, IoHfoUi, KEYS, MAP, MESSAGE, MonsterBase, PATHING, PLEASEWAIT, SOUNDS, UI2, WMATTACK } from "@game";

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
        // (Inferno-only, 14 October, QoL #426: one start at a time. A second click while the first was on its way
        // started the wave twice: the server settled the first fight as lost (a try gone) and the wave on
        // screen reported with the stale fight, so even a win wasn't recorded.)
        if (IoHfoWaves._fight || IoHfoWaves._ending || IoHfoWaves._starting) {
            return;
        }
        if (!IoHfo.inYard()) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("hfo_err_attack"));
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #600: not while a raid is counting down: it landed right after the wave, on a yard the wave
            // had just broken)
            let raid: string = IoHfoWaves.raidNote();
            if (raid) {
                GLOBAL.Message(raid);
                return;
            }
            // (QoL #111 and #595: a yard still repairing, and a wave's last try, are said before the try is used)
            let warn: any[] = [];
            let last: string = IoHfoWaves.lastTryNote(wave);
            if (last) {
                warn.push(last);
            }
            let repairs: string = IoHfoWaves.repairNote();
            if (repairs) {
                warn.push(repairs);
            }
            if (warn.length) {
                GLOBAL.Message(warn.join("<br><br>"), KEYS.Get(last ? "hfo_wave_start_btn" : "io_hfo2_start_anyway"), (): void => {
                    IoHfoWaves.go(wave);
                });
                return;
            }
        }
        IoHfoWaves.go(wave);
    }

    /** The wave starts (the server counts the try). */
    private static go(wave: int): void {
        if (IoHfoWaves._fight || IoHfoWaves._ending || IoHfoWaves._starting || !IoHfo.inYard()) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("hfo_err_attack"));
            return;
        }
        // (QoL #600: a raid's countdown may have begun while the warning was open)
        let raid: string = GLOBAL.INFERNO_ONLY ? IoHfoWaves.raidNote() : null;
        if (raid) {
            GLOBAL.Message(raid);
            return;
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        IoHfoWaves._starting = true;
        IoHfo.call("wavestart", [["wave", wave]], (r: any): void => {
            IoHfoWaves._starting = false;
            PLEASEWAIT.Hide();
            if (!IoHfo.inYard() || WMATTACK._inProgress) {
                return;
            }
            IoHfoWaves.begin(r.fight);
        }, (): void => {
            IoHfoWaves._starting = false;
            PLEASEWAIT.Hide();
        });
    }

    /** Inferno-only (QoL #426): a wave start is on its way to the server. */
    private static _starting: boolean = false;

    /**
     * Inferno-only (QoL #600): a raid counting down (its warning or its bar showing), as a message, or null. Its
     * launch waits for nothing once the time is up, so it came right after a wave. (The invasions ask it too.)
     */
    public static raidNote(): string {
        if (!WMATTACK._queued || (!WMATTACK.warningPopup && !UI2._wildMonsterBar)) {
            return null;
        }
        let left: int = (Number(WMATTACK._queued.attackTime) - GLOBAL.Timestamp()) | 0;
        return left > 0 ? KEYS.Get("io_hfo2_raid_wait", { "v1": GLOBAL.ioDuration(left) }) : KEYS.Get("io_hfo2_raid_now");
    }

    /**
     * Inferno-only (QoL #111): buildings still repairing (and when the last is ready) or damaged and not repairing,
     * as a message, or null. Nothing is repaired for a wave: they face it as they are. (The invasions ask it too.)
     */
    public static repairNote(): string {
        let repairing: int = 0;
        let damaged: int = 0;
        let longest: int = 0;
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || b instanceof BMUSHROOM || b._class == "trap" || b._class == "decoration" || b._class == "enemy" || b._class == "immovable" || b.health >= b.maxHealth) {
                continue;
            }
            if (b._repairing) {
                repairing++;
                let left: int = b._repairTime | 0;
                if (left <= 0) {
                    try {
                        left = b.getEstimatedRepairTimeRemaining() | 0;
                    } catch (e) {
                        left = 0;
                    }
                }
                longest = Math.max(longest, left) | 0;
            } else {
                damaged++;
            }
        }
        let out: any[] = [];
        if (repairing > 0) {
            out.push(KEYS.Get("io_hfo2_repairing", { "v1": repairing, "v2": GLOBAL.ioDuration(Math.max(1, longest)) }));
        }
        if (damaged > 0) {
            out.push(KEYS.Get("io_hfo2_damaged", { "v1": damaged }));
        }
        return out.length ? out.join(" ") + " " + KEYS.Get("io_hfo2_as_they_are") : null;
    }

    /** Inferno-only (QoL #595): the current wave's last try, as a message (what failing it costs), or null. */
    private static lastTryNote(wave: int): string {
        let f: any = IoHfo.flag();
        if (!f || wave != (f.current | 0)) {
            return null;
        }
        let w: any[] = as3.as(as3.as(f.waves, Array) ? f.waves[wave - 1] : null, Array);
        if ((f.tries | 0) - (w ? w[0] | 0 : 0) != 1) {
            return null;
        }
        let prize: int = IoHfoUi.prize(f, wave);
        return prize > 0 ? KEYS.Get("io_hfo2_last_try", { "v1": wave, "v2": prize }) : KEYS.Get("io_hfo2_last_try_noprize", { "v1": wave });
    }

    /** Inferno-only (QoL #113): attackers still in the yard. (The invasions count theirs with it.) */
    public static attackersLeft(): int {
        let n: int = 0;
        for (let c of as3.values(CREEPS._creeps)) {
            let m: MonsterBase = as3.as(c, MonsterBase);
            if (m && m.health > 0 && !m._friendly) {
                n++;
            }
        }
        return n;
    }

    /** How many surges the wave being fought has. */
    private static _surgeTotal: int = 0;

    /** Inferno-only (QoL #113): the bar under the top bar: the surge, the ice cretins left, the yard destroyed against the losing line. */
    private static updateBar(destroyed: int): void {
        if (!GLOBAL.INFERNO_ONLY || !IoHfoWaves._fight || IoHfoWaves._ending) {
            return;
        }
        let parts: any[] = [];
        if (IoHfoWaves._surgeTotal > 1) {
            parts.push(KEYS.Get("io_hfo2_bar_surge", { "v1": Math.max(1, IoHfoWaves._surgeTotal - IoHfoWaves._surges.length), "v2": IoHfoWaves._surgeTotal }));
        }
        parts.push(KEYS.Get("io_hfo2_bar_left", { "v1": IoHfoWaves.attackersLeft() }));
        parts.push(KEYS.Get("io_hfo2_bar_destroyed", { "v1": destroyed, "v2": IoHfoWaves.LOSE_PERCENT }));
        IoHfoUi.WaveBar("ioHfoWaveBar", parts.join("  ·  "), destroyed, IoHfoWaves.LOSE_PERCENT);
    }

    // ---- leaving the page mid-wave (QoL #598)
    private static _unloadWatched: boolean = false;

    /** The browser asks before a reload or a closed tab throws a wave away (the server settles it as lost). */
    private static watchUnload(): void {
        if (IoHfoWaves._unloadWatched || typeof window == "undefined") {
            return;
        }
        IoHfoWaves._unloadWatched = true;
        window.addEventListener("beforeunload", (e: BeforeUnloadEvent): void => {
            if (GLOBAL.INFERNO_ONLY && IoHfoWaves._fight) {
                e.preventDefault();
                e.returnValue = "";
            }
        });
    }

    private static begin(fight: any): void {
        IoHfoWaves._fight = fight;
        IoHfoWaves._ending = false;
        IoHfoWaves._checks = 0;
        IoHfoWaves._lastSurgeAt = NaN;
        IoHfoWaves._melted = 0;
        IoHfoWaves._surges = (as3.as(IoHfoWaves.WAVES[Math.max(0, Math.min(IoHfoWaves.WAVES.length, fight.wave | 0) - 1)], Array)).concat();
        IoHfoWaves._surgeTotal = IoHfoWaves._surges.length;
        if (GLOBAL.INFERNO_ONLY) {
            IoHfoWaves.watchUnload();
            // (QoL #113: the wave's bar takes the line under the top bar; it comes back after the wave)
            IoHfoUi.HudOff();
        }
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
        // (QoL #114: at the speed the player picked, 1x or 2x: the button at the right of the wave's bar)
        IoHfoUi.ioSpeedStart();
        IoHfoWaves.surgeDue(true);
        IoHfoWaves.updateBar(IoHfoWaves.destroyedPercent());
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
            let destroyed: int = IoHfoWaves.destroyedPercent();
            if (destroyed >= IoHfoWaves.LOSE_PERCENT) {
                IoHfoWaves.finish(false);
            } else {
                IoHfoWaves.updateBar(destroyed);
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

    /** Inferno-only (QoL #596): Surrender's question, while it is open. */
    private static _surrenderAsk: MESSAGE = null;

    private static surrender(e: Event = null): void {
        // (Inferno-only, QoL #596: it asks first: a loss, and what it leaves on the wave. One click gave the try away.)
        if (GLOBAL.INFERNO_ONLY && IoHfoWaves._fight && !IoHfoWaves._ending) {
            if (IoHfoWaves._surrenderAsk && IoHfoWaves._surrenderAsk._mc) {
                return;
            }
            let fight: any = IoHfoWaves._fight;
            IoHfoWaves._surrenderAsk = GLOBAL.ioDanger(IoHfoWaves.surrenderText(fight), KEYS.Get("wmi_surrenderbtn"), (): void => {
                IoHfoWaves._surrenderAsk = null;
                if (IoHfoWaves._fight == fight && !IoHfoWaves._ending) {
                    IoHfoWaves.giveUp();
                }
            }, null, KEYS.Get("io_hfo2_keep_fighting"));
            return;
        }
        IoHfoWaves.giveUp();
    }

    private static giveUp(): void {
        if (UI2._scareAway) {
            UI2._scareAway.removeEventListener("scareAway", IoHfoWaves.surrender);
        }
        IoHfoWaves.finish(false);
    }

    /** QoL #596: what surrendering this fight means: a loss, and the tries it leaves on the wave. */
    private static surrenderText(fight: any): string {
        let wave: int = fight.wave | 0;
        if (fight.replay) {
            return KEYS.Get("io_hfo2_surrender_replay", { "v1": wave });
        }
        let f: any = IoHfo.flag();
        let w: any[] = f && as3.as(f.waves, Array) ? as3.as(f.waves[wave - 1], Array) : null;
        // (the try being fought is already counted: the server counts it when the wave starts)
        let left: int = Math.max(0, (f ? f.tries | 0 : 3) - (w ? w[0] | 0 : 0)) | 0;
        return left > 0 ? KEYS.Get("io_hfo2_surrender_tries", { "v1": wave, "v2": left }) : KEYS.Get("io_hfo2_surrender_last", { "v1": wave });
    }

    /** The question is gone with the fight (won, lost, or the yard left). */
    private static closeSurrenderAsk(): void {
        if (IoHfoWaves._surrenderAsk && IoHfoWaves._surrenderAsk._mc) {
            IoHfoWaves._surrenderAsk.Hide();
        }
        IoHfoWaves._surrenderAsk = null;
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
        // (QoL #114: the result at the usual speed)
        IoHfoUi.ioSpeedStop();
        IoHfoWaves.stopClock();
        IoHfoWaves.thawCompounds(true);
        // (QoL #113, #596: the wave's bar and Surrender's question go with it)
        IoHfoUi.WaveBarOff();
        IoHfoWaves.closeSurrenderAsk();
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
        // (QoL #597, 14 October: a won wave whose report didn't get through was settled as lost later. Sent again with
        // the same fight id, quietly, behind "Saving result..." (a repeat the server already has answers with its
        // result), then a Try again; the server takes the report until the fight's time is up.)
        let send = (tries: int): void => {
            PLEASEWAIT.Show(KEYS.Get("io_saving_result"));
            IoHfo.call("waveend", [["wave", fight.wave | 0], ["id", fight.id | 0], ["won", won ? "1" : "0"]], (r: any): void => {
                PLEASEWAIT.Hide();
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
            }, (network: boolean = false): void => {
                PLEASEWAIT.Hide();
                if (network && tries < 2) {
                    setTimeout((): void => {
                        send((tries + 1) | 0);
                    }, 2000 * (tries + 1));
                    return;
                }
                if (network && won) {
                    GLOBAL.Message(KEYS.Get("io_result_not_saved"), KEYS.Get("io_kit_retry"), (): void => {
                        send(0);
                    });
                    return;
                }
                IoHfoWaves._fight = null;
                IoHfoWaves._ending = false;
                if (GLOBAL.INFERNO_ONLY) {
                    // (QoL #113: the line under the top bar back, as after a result)
                    IoHfoUi.Hud();
                }
            }, true);
        };
        send(0);
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
        // (QoL #114)
        IoHfoUi.ioSpeedStop();
        IoHfoWaves.stopClock();
        IoHfoWaves.thawCompounds(false);
        if (IoHfoWaves._fight) {
            IoHfoUi.WaveBarOff();
            IoHfoWaves.closeSurrenderAsk();
        }
        IoHfoWaves._fight = null;
        IoHfoWaves._ending = false;
        IoHfoWaves._surges = [];
    }
}
