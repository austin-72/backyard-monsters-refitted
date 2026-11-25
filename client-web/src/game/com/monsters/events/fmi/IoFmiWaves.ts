import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { setTimeout } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, BTOWER, CREEPS, Enrage, GLOBAL, GRID, HOUSINGBUNKER, InstanceManager, IoFmi, IoFmiTables, IoHfoArt, IoHfoStepClock, IoHfoUi, IoHfoWaves, KEYS, MAP, MESSAGE, MonsterBase, PATHING, PLEASEWAIT, SOUNDS, TemporaryComponent, UI2, WMATTACK } from "@game";

/**
 * Inferno-only (10 October): the Frozen Monster Invasions' waves (the server: services/events/fmi.ts), fought in the
 * player's main yard like Hell Freezes Over's (IoHfoWaves, whose way this follows): WMATTACK runs the fight (the
 * warning bar, the panic music, the yard's own towers), the Compound is frozen shut (an ice block over it; none of
 * its monsters comes out, HOUSINGBUNKER asks compoundFrozen), the surges come after so much fighting (the game's
 * simulation steps: IoHfoStepClock).
 *
 *  - 32 waves for each invasion (IoFmiTables), fought in order, as often as it takes (nothing is repaired for
 *    free: damaged buildings start their usual repair afterwards).
 *  - Won: every attacker gone (the Permafrost Hulks' Shivlings too) with at least one building of the yard still
 *    standing. Lost: every building destroyed (walls, traps and decorations not counted), or the Surrender button.
 *    (16 October, the user's: no longer lost at 99% destroyed.)
 *  - A big group comes as a stream, BATCH at a time every BATCH_GAP seconds, not as one crowd.
 *  - The blizzard wears the stragglers down: MELT_AFTER seconds of fighting after the last surge, every attacker
 *    still standing (champions too) loses MELT_PER_SECOND of its health a second, so no wave drags on.
 *  - Practice (admin tools, the balance runs): a wave fought with no server and no progress.
 */
export class IoFmiWaves extends ASObject {
    /** The monsters of the tables' letters. */
    public static readonly IDS: any = { "S": "IC26", "G": "IC27", "R": "IC28", "W": "IC29", "H": "IC30", "P": "IC31", "K": "IC9", "D": "IC10", "A": "IC24", "M": "IC25" };

    private static readonly CHAMPIONS: any = { "K": true, "D": true, "A": true, "M": true };

    /** Every group's count is multiplied by this (1: the tables as they are; the balance runs try more and less). */
    public static countScale: number = 1;

    /** Seconds of fighting after the last surge before the stragglers wear down (Hell Freezes Over's: 120). */
    public static MELT_AFTER: int = 30;

    /** How much of its health a straggler loses each second (all of it in 20 seconds). The invasions' end is the
     *  blizzard's: half a minute after the last surge it finishes off whoever is left, so how much of the yard a
     *  wave destroys is what it does before then (the balance runs' numbers depend on these two). */
    public static MELT_PER_SECOND: number = 0.05;

    /** Lost at this much of the yard destroyed: 100, as every building down (16 October, the user's: "at least 1
     *  building still standing" wins; before, 99% lost). The loss itself is buildingsStanding() == 0. */
    public static readonly LOSE_PERCENT: int = 100;

    private static _fight: any = null;

    private static _kind: int = 1;

    private static _practice: boolean = false;

    private static _surges: any[] = [];

    private static _clock: IoHfoStepClock = null;

    private static _dir: number = 0;

    private static _ending: boolean = false;

    private static _checks: int = 0;

    private static _compoundIce: any[] = [];

    private static _lastSurgeAt: number = NaN;

    /** A big group comes in a stream, a batch at a time: [seconds due, point, spread, monster, count, level, rage]. */
    private static _stream: any[] = [];

    /** The most of a group that comes at once, and the seconds between its batches (a crowd all at once would only
     *  feed the towers' splash: a stream keeps coming). */
    public static readonly BATCH: int = 12;

    public static readonly BATCH_GAP: number = 1;

    private static _melted: int = 0;

    /** Each group (of at least this many) comes split this many ways round the yard, a quarter turn apart from its
     *  side: the frozen hordes close in from every side, so a wave is as hard whichever way it is turned (the
     *  champions come from their own side). 1: each group from its side only. */
    public static sideSplit: int = 4;

    /** The balance runs: the quarter turn to use (0-3; -1: at random, as in the game). */
    public static forceTurn: int = -1;

    /** The last wave's result ({kind, wave, won, destroyed, worst, practice}; the balance runs read it). */
    public static lastResult: any = null;

    /** The worst the yard was destroyed during the fight (for the result). */
    private static _worst: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    /** An invasion's waves. */
    public static waves(kind: int): any[] {
        return kind == 2 ? IoFmiTables.FMI2 : IoFmiTables.FMI1;
    }

    public static get running(): boolean {
        return IoFmiWaves._fight != null;
    }

    /** The Compound is sealed in ice: its monsters stay in (from the wave's start until it is over). */
    public static get compoundFrozen(): boolean {
        return IoFmiWaves._fight != null;
    }

    /** The wave being fought (0: none). */
    public static get wave(): int {
        return IoFmiWaves._fight ? IoFmiWaves._fight.wave | 0 : 0;
    }

    private static freezeCompounds(): void {
        IoFmiWaves.thawCompounds(false);
        for (let o of (InstanceManager.getInstancesByClass(HOUSINGBUNKER) ?? [])) {
            let b: HOUSINGBUNKER = as3.as(o, HOUSINGBUNKER);
            if (!b || b.health <= 0) {
                continue;
            }
            let fp: Rectangle = b._footprint && b._footprint.length ? as3.as(b._footprint[0], Rectangle) : null;
            let handle: any = IoHfoArt.towerIceOn(b, Number(fp ? Math.max(1, fp.width / 120) : 1), 135);
            if (handle) {
                IoFmiWaves._compoundIce.push(handle);
            }
        }
    }

    private static thawCompounds(shatter: boolean): void {
        for (let handle of as3.values(IoFmiWaves._compoundIce)) {
            IoHfoArt.towerIceOff(handle, shatter);
        }
        IoFmiWaves._compoundIce = [];
        // (any tower an ice monster left iced: its wait only runs down while there are monsters about)
        for (let o of (InstanceManager.getInstancesByClass(BTOWER) ?? [])) {
            let t: BTOWER = as3.as(o, BTOWER);
            if (t && t.ioIced) {
                t.ioIceBreak(shatter);
            }
        }
    }

    /** Fights the next wave of the invasion on now (the server counts it first). */
    public static Start(wave: int): void {
        // (Inferno-only, QoL #426: one start at a time; a second click started the wave twice)
        if (IoFmiWaves._fight || IoFmiWaves._ending || IoFmiWaves._starting || !IoFmi.inYard()) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3m_fmi_under_attack"));
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #600: not while a raid is counting down: it landed right after the wave, as in Hell Freezes Over's)
            let raid: string = IoHfoWaves.raidNote();
            if (raid) {
                GLOBAL.Message(raid);
                return;
            }
            // (QoL #111: a yard still repairing is said first: nothing is repaired for a wave)
            let repairs: string = IoHfoWaves.repairNote();
            if (repairs) {
                GLOBAL.Message(repairs, KEYS.Get("io_hfo2_start_anyway"), (): void => {
                    IoFmiWaves.go(wave);
                });
                return;
            }
        }
        IoFmiWaves.go(wave);
    }

    /** The wave starts (the server counts it first). */
    private static go(wave: int): void {
        if (IoFmiWaves._fight || IoFmiWaves._ending || IoFmiWaves._starting || !IoFmi.inYard()) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3m_fmi_under_attack"));
            return;
        }
        // (QoL #600: a raid's countdown may have begun while the warning was open)
        let raid: string = GLOBAL.INFERNO_ONLY ? IoHfoWaves.raidNote() : null;
        if (raid) {
            GLOBAL.Message(raid);
            return;
        }
        let kind: int = IoFmi.kind();
        PLEASEWAIT.Show(KEYS.Get("io_t3m_fmi_cold_coming"));
        IoFmiWaves._starting = true;
        IoFmi.call("wavestart", [["wave", wave]], (r: any): void => {
            IoFmiWaves._starting = false;
            PLEASEWAIT.Hide();
            if (!IoFmi.inYard() || WMATTACK._inProgress || !r.fight) {
                return;
            }
            IoFmiWaves.begin(r.fight, kind, false);
        }, (): void => {
            IoFmiWaves._starting = false;
            PLEASEWAIT.Hide();
        });
    }

    /** Inferno-only (QoL #426): a wave start is on its way to the server. */
    private static _starting: boolean = false;

    /** A wave fought with no server and no progress (admin tools, the balance runs). */
    public static Practice(kind: int, wave: int): void {
        if (IoFmiWaves._fight || IoFmiWaves._ending || WMATTACK._inProgress) {
            return;
        }
        IoFmiWaves.begin({ "wave": wave, "id": 0 }, kind, true);
    }

    private static begin(fight: any, kind: int, practice: boolean): void {
        IoFmiWaves._fight = fight;
        IoFmiWaves._kind = kind;
        IoFmiWaves._practice = practice;
        IoFmiWaves._ending = false;
        IoFmiWaves._checks = 0;
        IoFmiWaves._lastSurgeAt = NaN;
        IoFmiWaves._stream = [];
        IoFmiWaves._melted = 0;
        IoFmiWaves._worst = 0;
        let table: any[] = IoFmiWaves.waves(kind);
        IoFmiWaves._surges = (as3.as(table[Math.max(0, Math.min(table.length, fight.wave | 0) - 1)], Array)).concat();
        IoFmiWaves._surgeTotal = IoFmiWaves._surges.length;
        if (GLOBAL.INFERNO_ONLY) {
            IoFmiWaves.watchUnload();
            // (QoL #113: the wave's bar takes the line under the top bar, Hell Freezes Over's line too; it comes back after)
            IoHfoUi.HudOff();
        }
        IoFmiWaves.stopClock();
        IoFmiWaves._clock = new IoHfoStepClock();
        GLOBAL.addFastTickable(IoFmiWaves._clock);
        // (as the original invasions: the whole wave turned a random quarter, 0, 90, 180 or 270 degrees)
        IoFmiWaves._dir = IoFmiWaves.forceTurn >= 0 ? (IoFmiWaves.forceTurn % 4) * 90 : Math.floor(Math.random() * 4) * 90;
        IoFmi.CloseWindow();
        WMATTACK.HideWarning();
        if (UI2._wildMonsterBar) {
            UI2.Hide("wmbar");
        }
        PATHING.ResetCosts();
        WMATTACK._isAI = false;
        WMATTACK.AttackB();
        WMATTACK.AttackC();
        SOUNDS.PlayMusic("musicipanic");
        UI2._warning.Update("<font size=\"28\">" + KEYS.Get("io_t3m_fmi_wave_of", { "v1": fight.wave | 0, "v2": IoFmiWaves.waves(kind).length }) + "</font>");
        UI2.Show("surrender");
        if (UI2._scareAway) {
            UI2._scareAway.addEventListener("scareAway", IoFmiWaves.surrender);
        }
        WMATTACK.setEnd(IoFmiWaves.allGone);
        WMATTACK._inProgress = true;
        IoFmiWaves.freezeCompounds();
        BASE._blockSave = false;
        // (QoL #114: at the speed the player picked, 1x or 2x: the button at the right of the wave's bar)
        IoHfoUi.ioSpeedStart();
        IoFmiWaves.surgeDue(true);
        IoFmiWaves.updateBar(IoFmiWaves.destroyedPercent());
    }

    /** Each frame (IoFmi): surges as they come, the stragglers, the yard's state. */
    public static Tick(): void {
        if (!IoFmiWaves._fight || IoFmiWaves._ending) {
            return;
        }
        IoFmiWaves.surgeDue(false);
        IoFmiWaves.streamDue();
        IoFmiWaves.melt();
        if (++IoFmiWaves._checks % 20 == 0) {
            // (watching a wave is playing: the "Anyone home?" stop would throw the wave away)
            GLOBAL.UpdateAFKTimer();
            let d: int = IoFmiWaves.destroyedPercent();
            IoFmiWaves._worst = Math.max(IoFmiWaves._worst, d) | 0;
            // (16 October, the user's: lost only once no building is standing, walls, traps and decorations aside)
            if (IoFmiWaves.buildingsStanding() == 0) {
                IoFmiWaves.finish(false);
            } else {
                IoFmiWaves.updateBar(d);
            }
        }
    }

    private static surgeDue(first: boolean): void {
        let seconds: number = Number(IoFmiWaves._clock ? IoFmiWaves._clock.seconds : 0);
        while (IoFmiWaves._surges.length && (first || Number(IoFmiWaves._surges[0][0]) <= seconds)) {
            IoFmiWaves.spawn(as3.as(IoFmiWaves._surges.shift()[1], Array));
            first = false;
        }
        IoFmiWaves.noteLast();
    }

    /** The streams' next batches, as they fall due. */
    private static streamDue(): void {
        let seconds: number = Number(IoFmiWaves._clock ? IoFmiWaves._clock.seconds : 0);
        while (IoFmiWaves._stream.length && Number(IoFmiWaves._stream[0][0]) <= seconds) {
            IoFmiWaves.spawnBatch(as3.as(IoFmiWaves._stream.shift(), Array));
        }
        IoFmiWaves.noteLast();
    }

    private static spawnBatch(b: any[]): any[] {
        return IoFmiWaves.spawnGroup(as3.as(b[1], Point), b[2] | 0, String(b[3]), b[4] | 0, b[5] | 0, b[6] | 0);
    }

    /** Everything has come (the last surge and its streams): the blizzard's countdown starts. */
    private static noteLast(): void {
        if (isNaN(IoFmiWaves._lastSurgeAt) && !IoFmiWaves._surges.length && !IoFmiWaves._stream.length && IoFmiWaves._clock) {
            IoFmiWaves._lastSurgeAt = IoFmiWaves._clock.seconds;
        }
    }

    /** The stragglers wear down: MELT_AFTER seconds after the last surge, a bite of their health each second. */
    private static melt(): void {
        if (isNaN(IoFmiWaves._lastSurgeAt) || !IoFmiWaves._clock) {
            return;
        }
        let due: int = (IoFmiWaves._clock.seconds - IoFmiWaves._lastSurgeAt - IoFmiWaves.MELT_AFTER) | 0;
        if (due <= IoFmiWaves._melted) {
            return;
        }
        if (IoFmiWaves._melted == 0) {
            UI2._warning.Update("<font size=\"22\">" + KEYS.Get("io_t3m_fmi_blizzard") + "</font>");
        }
        while (IoFmiWaves._melted < due) {
            IoFmiWaves._melted++;
            for (let c of as3.values(CREEPS._creeps)) {
                let m: MonsterBase = as3.as(c, MonsterBase);
                if (m && m.health > 0 && !m._friendly) {
                    m.modifyHealth(-Math.max(1, Math.ceil(m.maxHealth * IoFmiWaves.MELT_PER_SECOND)));
                }
            }
        }
    }

    private static spawn(groups: any[]): void {
        let focus: boolean = true;
        for (let g of as3.values(groups)) {
            let letter: string = String(g[0]);
            let id: string = String(IoFmiWaves.IDS[letter] || letter);
            let champion: boolean = Boolean(IoFmiWaves.CHAMPIONS[letter]);
            let count: int = champion ? 1 : Math.max(1, Math.round((g[1] | 0) * IoFmiWaves.countScale)) | 0;
            let made: any[] = [];
            let ways: int = !champion && IoFmiWaves.sideSplit > 1 && count >= IoFmiWaves.sideSplit ? IoFmiWaves.sideSplit : 1;
            for (let w: int = 0; w < ways; w++) {
                let part: int = ((count * (w + 1)) / ways | 0) - ((count * w) / ways | 0);
                let angle: number = (IoFmiWaves._dir + ((g[2] | 0) + w * 4 / ways) * 90) * 0.0174532925;
                let at: Point = GRID.ToISO(Math.cos(angle) * 925, Math.sin(angle) * 925, 0);
                // the first batch now, the rest streaming in after it
                let now: number = Number(IoFmiWaves._clock ? IoFmiWaves._clock.seconds : 0);
                let level: int = Math.max(1, Math.min(6, g[3] | 0)) | 0;
                for (let b: int = 0; b * IoFmiWaves.BATCH < part; b++) {
                    let batch: any[] = [now + b * IoFmiWaves.BATCH_GAP, at, champion ? 60 : 250, id, Math.min(IoFmiWaves.BATCH, part - b * IoFmiWaves.BATCH), level, g[4] | 0];
                    if (b == 0) {
                        made = made.concat(IoFmiWaves.spawnBatch(batch));
                    } else {
                        IoFmiWaves._stream.push(batch);
                    }
                }
            }
            if (focus && made.length) {
                focus = false;
                MAP.FocusTo(as3.cast(made[0], MonsterBase).x | 0, as3.cast(made[0], MonsterBase).y | 0, 1);
            }
        }
        IoFmiWaves.sortStream();
    }

    private static sortStream(): void {
        IoFmiWaves._stream.sort((a: any, b: any): number => Number(a[0]) - Number(b[0]));
    }

    /** As WMATTACK.SpawnCreep (round a point, bouncing about the yard), at the table's level (1-6, as the original invasions: not the player's own Academy levels), enraged a while. */
    private static spawnGroup(at: Point, spread: int, id: string, count: int, level: int, rage: int): any[] {
        let made: any[] = [];
        let centre: Point = GRID.FromISO(at.x, at.y);
        for (let i: int = 0; i < count; i++) {
            let a: number = Math.random() * Math.PI * 2;
            let d: number = Math.random() * spread / 2;
            let p: Point = centre.add(new Point(Math.cos(a) * d, Math.sin(a) * d));
            let m: MonsterBase = CREEPS.Spawn(id, MAP._BUILDINGTOPS, "bounce", GRID.ToISO(p.x, p.y, 0), Math.random() * 360, 1, true, false, level);
            m._hitLimit = int.MAX_VALUE;
            if (rage > 0) {
                m.addComponent(new TemporaryComponent(new Enrage(2, 0), rage));
            }
            made.push(m);
        }
        return made;
    }

    /** WMATTACK: no attacker left. The next surge comes now, or the wave is won. */
    private static allGone(): void {
        if (!IoFmiWaves._fight || IoFmiWaves._ending) {
            WMATTACK.CleanUpLite();
            return;
        }
        if (IoFmiWaves._stream.length) {
            // (a stream's batch already gone before the next was due: the next comes now)
            let gap: number = Number(IoFmiWaves._stream[0][0]) - Number(IoFmiWaves._clock ? IoFmiWaves._clock.seconds : 0);
            for (let b of as3.values(IoFmiWaves._stream)) {
                b[0] = Number(b[0]) - Math.max(0, gap);
            }
            IoFmiWaves.streamDue();
            return;
        }
        if (IoFmiWaves._surges.length) {
            // (all gone before the next surge was due: it comes now, and the ones after keep their gaps)
            let surge: any[] = as3.as(IoFmiWaves._surges.shift(), Array);
            if (IoFmiWaves._clock) {
                IoFmiWaves._clock.steps = (Number(surge[0]) * IoHfoStepClock.STEPS_A_SECOND) | 0;
            }
            IoFmiWaves.spawn(as3.as(surge[1], Array));
            IoFmiWaves.noteLast();
            return;
        }
        // (16 October: won only with a building still standing)
        IoFmiWaves.finish(IoFmiWaves.buildingsStanding() > 0);
    }

    /** Inferno-only (QoL #596): Surrender's question, while it is open. */
    private static _surrenderAsk: MESSAGE = null;

    private static surrender(e: Event = null): void {
        // (Inferno-only, QoL #596: it asks first: a loss, and the wave waits)
        if (GLOBAL.INFERNO_ONLY && IoFmiWaves._fight && !IoFmiWaves._ending) {
            if (IoFmiWaves._surrenderAsk && IoFmiWaves._surrenderAsk._mc) {
                return;
            }
            let fight: any = IoFmiWaves._fight;
            IoFmiWaves._surrenderAsk = GLOBAL.ioDanger(KEYS.Get("io_fmi2_surrender", { "v1": fight.wave | 0 }), KEYS.Get("wmi_surrenderbtn"), (): void => {
                IoFmiWaves._surrenderAsk = null;
                if (IoFmiWaves._fight == fight && !IoFmiWaves._ending) {
                    IoFmiWaves.giveUp();
                }
            }, null, KEYS.Get("io_hfo2_keep_fighting"));
            return;
        }
        IoFmiWaves.giveUp();
    }

    private static giveUp(): void {
        if (UI2._scareAway) {
            UI2._scareAway.removeEventListener("scareAway", IoFmiWaves.surrender);
        }
        IoFmiWaves.finish(false);
    }

    /** The question is gone with the fight (won, lost, or the yard left). */
    private static closeSurrenderAsk(): void {
        if (IoFmiWaves._surrenderAsk && IoFmiWaves._surrenderAsk._mc) {
            IoFmiWaves._surrenderAsk.Hide();
        }
        IoFmiWaves._surrenderAsk = null;
    }

    /** How many surges the wave being fought has. */
    private static _surgeTotal: int = 0;

    /** Inferno-only (QoL #113): the bar under the top bar (IoHfoUi.WaveBar): the surge, the attackers left (in the yard and still streaming in), the yard destroyed against the losing line. */
    private static updateBar(destroyed: int): void {
        if (!GLOBAL.INFERNO_ONLY || !IoFmiWaves._fight || IoFmiWaves._ending) {
            return;
        }
        let coming: int = 0;
        for (let b of as3.values(IoFmiWaves._stream)) {
            coming += b[4] | 0;
        }
        let parts: any[] = [];
        if (IoFmiWaves._surgeTotal > 1) {
            parts.push(KEYS.Get("io_hfo2_bar_surge", { "v1": Math.max(1, IoFmiWaves._surgeTotal - IoFmiWaves._surges.length), "v2": IoFmiWaves._surgeTotal }));
        }
        parts.push(KEYS.Get("io_fmi2_bar_left", { "v1": IoHfoWaves.attackersLeft() + coming }));
        // (16 October: the losing line is the last building, not a percent)
        parts.push(KEYS.Get("io_fmi3_bar_standing", { "v1": destroyed, "v2": IoFmiWaves.buildingsStanding() }));
        IoHfoUi.WaveBar("ioFmiWaveBar", parts.join("  ·  "), destroyed, IoFmiWaves.LOSE_PERCENT);
    }

    // ---- leaving the page mid-wave (QoL #598)
    private static _unloadWatched: boolean = false;

    /** The browser asks before a reload or a closed tab throws a wave away (the server settles it as lost). */
    private static watchUnload(): void {
        if (IoFmiWaves._unloadWatched || typeof window == "undefined") {
            return;
        }
        IoFmiWaves._unloadWatched = true;
        window.addEventListener("beforeunload", (e: BeforeUnloadEvent): void => {
            if (GLOBAL.INFERNO_ONLY && IoFmiWaves._fight && !IoFmiWaves._practice) {
                e.preventDefault();
                e.returnValue = "";
            }
        });
    }

    /** How much of the yard is destroyed (walls, traps and decorations aside), as a percent. */
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

    /** How many buildings still stand (walls, traps and decorations aside, as destroyedPercent): none loses the wave. */
    public static buildingsStanding(): int {
        let n: int = 0;
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || b instanceof BMUSHROOM || b._class == "wall" || b._class == "trap" || b._class == "decoration" || b._class == "enemy" || b._class == "immovable") {
                continue;
            }
            if (b.health > 0) {
                n++;
            }
        }
        return n;
    }

    /** The worst the yard was destroyed in the wave being fought (or the last one). */
    public static get worstDestroyed(): int {
        return IoFmiWaves._worst;
    }

    private static finish(won: boolean): void {
        if (!IoFmiWaves._fight || IoFmiWaves._ending) {
            return;
        }
        IoFmiWaves._ending = true;
        // (QoL #114: the result at the usual speed)
        IoHfoUi.ioSpeedStop();
        IoFmiWaves._worst = Math.max(IoFmiWaves._worst, IoFmiWaves.destroyedPercent()) | 0;
        IoFmiWaves.stopClock();
        IoFmiWaves.thawCompounds(true);
        // (QoL #113, #596: the wave's bar and Surrender's question go with it)
        IoHfoUi.WaveBarOff();
        IoFmiWaves.closeSurrenderAsk();
        let fight: any = IoFmiWaves._fight;
        let destroyed: int = IoFmiWaves.destroyedPercent();
        if (!won) {
            // the invaders go back to the frozen wastes
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
        if (GLOBAL.INFERNO_ONLY) {
            IoHfoUi.Hud();
        }
        let result: any = { "kind": IoFmiWaves._kind, "wave": fight.wave | 0, "won": won, "destroyed": destroyed, "worst": IoFmiWaves._worst, "practice": IoFmiWaves._practice };
        IoFmiWaves.lastResult = result;
        if (IoFmiWaves._practice) {
            IoFmiWaves._fight = null;
            IoFmiWaves._ending = false;
            IoFmi.WaveResult(result, null);
            return;
        }
        // (QoL #597: sent again with the same fight id behind "Saving result...", then a Try again; IoHfoWaves.finish)
        let send = (tries: int): void => {
            PLEASEWAIT.Show(KEYS.Get("io_saving_result"));
            IoFmi.call("waveend", [["wave", fight.wave | 0], ["id", fight.id | 0], ["won", won ? "1" : "0"], ["destroyed", destroyed]], (r: any): void => {
                PLEASEWAIT.Hide();
                IoFmiWaves._fight = null;
                IoFmiWaves._ending = false;
                IoFmi.WaveResult(result, r);
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
                IoFmiWaves._fight = null;
                IoFmiWaves._ending = false;
            }, true);
        };
        send(0);
    }

    private static stopClock(): void {
        if (IoFmiWaves._clock) {
            GLOBAL.removeFastTickable(IoFmiWaves._clock);
            IoFmiWaves._clock = null;
        }
    }

    /** How long the wave has been fought, in seconds of game time. */
    public static get fightSeconds(): number {
        return Number(IoFmiWaves._clock ? IoFmiWaves._clock.seconds : 0);
    }

    /** The yard is leaving in the middle of a wave (the server settles it as lost). */
    public static Abandon(): void {
        // (QoL #114)
        IoHfoUi.ioSpeedStop();
        IoFmiWaves.stopClock();
        IoFmiWaves.thawCompounds(false);
        if (IoFmiWaves._fight) {
            IoHfoUi.WaveBarOff();
            IoFmiWaves.closeSurrenderAsk();
        }
        IoFmiWaves._fight = null;
        IoFmiWaves._ending = false;
        IoFmiWaves._surges = [];
        IoFmiWaves._stream = [];
    }
}
