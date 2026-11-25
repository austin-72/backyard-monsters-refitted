import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Sprite } from "flash/display";
import { IOErrorEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout } from "flash/utils";
import { ArcadeWindow, BASE, BFOUNDATION, CasinoUI, CasinoWindow, CREEPS, GLOBAL, GRID, InventoryManager, IoQuestBook, IoTd, IoTilt, IoToast, IoTotWindow, KEYS, MAP, MonsterBase, PLEASEWAIT, SOUNDS, TRIBES, TUTORIAL, UI2, URLLoaderApi, WMATTACK, IoFormat } from "@game";

/**
 * Inferno-only (20 October, the user's): Trick or Treat, the Inferno's Halloween (the server's
 * services/events/trickOrTreat.ts, sent as the flag io_tot and with each answer).
 *
 * From 30 October to 2 November, the button under Moloch's Gauntlet's (UI_TOP.ioMakeTotButton) opens a window with one
 * door for each wild tribe (IoTotWindow). A door is knocked on once: a treat (25 Shiny, at once) or a trick:
 *
 *  - TRICK! A banner counts down (startTrick), then the tribe's 1,000 level-6 Zagnoids stand all round the yard, on a
 *    ring outside its border, and attack at once: a real raid (WMATTACK's: the yard's resources taken, its buildings
 *    mended after as after any raid, the raid recorded for its replay and the Attack Log), the Zagnoids fighting to the
 *    last (no retreat after so many hits).
 *  - Every one killed: a treat after all (the 25 Shiny). The server checks the fight was started and wasn't too quick.
 *  - A trick has to be faced before the next door. One left waiting (the game closed during the countdown) comes when
 *    the player is home again (afterLoad); a fight left by reloading is lost.
 *  - Once it's over, everyone who knocked finds 6 Mini-Pumpkins in storage (the server puts them there: io_tot_gift).
 */
export class IoTot extends ASObject {
    /** The doors, in order: [key (the server's), canonical name (TRIBES), tribe base id (the raid's attacker), raid type, portrait]. */
    public static readonly TRIBES_INFO: any[] = [
        ["legionnaire", "Legionnaire", 1, 3, "monsters/tribe_legionnaire_50.jpg"],
        ["kozu", "Kozu", 11, 4, "monsters/tribe_kozu_50.jpg"],
        ["abunakki", "Abunakki", 21, 5, "monsters/tribe_abunakki_50.jpg"],
        ["dreadnaut", "Dreadnaut", 31, 7, "monsters/tribe_dreadnaut_50.jpg"],
        ["moloch", "Moloch", 51, 7, "monsters/tribe_moloch_50.jpg"]];

    /** The Mini-Pumpkin (a decoration). */
    public static readonly PUMPKIN: int = 111;

    private static _raw: string = null;

    private static _flag: any = null;

    /** The trick being fought: {tribe, id, horde (its monsters), total, started (getTimer)}; null when none. */
    private static _fight: any = null;

    /** The countdown's banner, while it shows. */
    private static _banner: Sprite = null;

    /** A trick's countdown or fight is under way (a second can't start). */
    private static _busy: boolean = false;

    /** The last fight's result (tests): {tribe, killed, total, cleared, won, paid}. */
    public static last: any = null;

    /** Seconds the banner counts down before the Zagnoids come. */
    public static COUNTDOWN: int = 8;

    public $ctor(): void {
        super.$ctor();
    }

    /** The flag io_tot: {open, soon, startsAt, endsAt, now, shiny, horde, level, monster, pumpkins, doors, test} or null. */
    public static flag(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_tot ? String(GLOBAL._flags.io_tot) : "";
        if (raw != IoTot._raw) {
            IoTot._raw = raw;
            IoTot._flag = null;
            if (raw != "") {
                try {
                    IoTot._flag = JSON.parse(raw);
                } catch (e) {
                    IoTot._flag = null;
                }
            }
        }
        return IoTot._flag;
    }

    /** An answer's state, kept as the flag until the next poll brings it. */
    public static take(tot: any): void {
        if (!tot || !GLOBAL._flags) {
            return;
        }
        GLOBAL._flags.io_tot = JSON.stringify(tot);
        IoTot.flag();
    }

    public static info(key: string): any[] {
        for (let t of IoTot.TRIBES_INFO) {
            if (t[0] == key) {
                return t;
            }
        }
        return null;
    }

    /** The tribe's name as the player reads it ("the Kozmodeus"). */
    public static tribeName(key: string): string {
        return KEYS.Get("io_tot_tribe_" + key);
    }

    public static door(key: string): any {
        let f: any = IoTot.flag();
        return f && f.doors ? f.doors[key] : null;
    }

    /** Doors knocked on, of the five. */
    public static knocked(): int {
        let n: int = 0;
        for (let t of IoTot.TRIBES_INFO) {
            if (IoTot.door(String(t[0]))) {
                n++;
            }
        }
        return n;
    }

    /** The trick waiting to be faced ("pending") or being fought ("fighting"): its tribe's key, or null. */
    public static waitingTrick(): string {
        for (let t of IoTot.TRIBES_INFO) {
            let d: any = IoTot.door(String(t[0]));
            if (d && d.r == "trick" && (d.s == "pending" || d.s == "fighting")) {
                return String(t[0]);
            }
        }
        return null;
    }

    /** The player's own main yard, to build in. */
    public static own(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && !GLOBAL.ioDesignMode() && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
    }

    public static buttonShown(): boolean {
        let f: any = IoTot.flag();
        return Boolean(f) && (f.open || f.soon || f.test || IoTot.waitingTrick() != null) && IoTot.own() && TUTORIAL._stage >= 200;
    }

    /** Something waits on the button: a door to knock on, or a trick to face. */
    public static waiting(): boolean {
        let f: any = IoTot.flag();
        return Boolean(f) && (IoTot.waitingTrick() != null || ((f.open || f.test) && IoTot.knocked() < IoTot.TRIBES_INFO.length));
    }

    /** The button's caption: "Trick or Treat" (or 3/5 while it's on). */
    public static caption(): string {
        let f: any = IoTot.flag();
        if (f && (f.open || f.test)) {
            return KEYS.Get("io_tot_cap_n", { "v1": IoTot.knocked(), "v2": IoTot.TRIBES_INFO.length });
        }
        return KEYS.Get("io_tot_cap");
    }

    /** The button's tip. */
    public static tip(): string {
        let f: any = IoTot.flag();
        if (!f) {
            return KEYS.Get("io_tot_title");
        }
        let now: number = GLOBAL.Timestamp();
        let lines: string[] = ["<b>" + KEYS.Get("io_tot_title") + "</b>"];
        let w: string = IoTot.waitingTrick();
        if (w) {
            lines.push(KEYS.Get("io_tot_tip_trick", { "v1": IoTot.tribeName(w) }));
        } else if (f.open || f.test) {
            lines.push(KEYS.Get("io_tot_tip_open", { "v1": IoTot.TRIBES_INFO.length - IoTot.knocked(), "v2": GLOBAL.ioDuration(Number(f.endsAt) - now) }));
        } else if (f.soon) {
            lines.push(KEYS.Get("io_tot_tip_soon", { "v1": GLOBAL.ioDuration(Number(f.startsAt) - now) }));
        }
        return lines.join("<br>");
    }

    /** Why a door can't be knocked on now (a raid, a window over the yard...), or null. */
    public static busy(): string {
        if (!IoTot.own()) {
            return KEYS.Get("io_tot_home_only");
        }
        if (WMATTACK._inProgress || IoTot._busy || BASE._loading || BASE.ioAttackRunning()) {
            return KEYS.Get("io_tot_busy");
        }
        return null;
    }

    // ---------------------------------------------------------------------------------------- the window
    public static Show(e: any = null): void {
        if (IoTotWindow.isOpen) {
            return;
        }
        if (e) {
            SOUNDS.Play("click1");
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "tot/status", [["v", "1"]], (r: any): void => {
            PLEASEWAIT.Hide();
            if (!r || (r.error !== 0 && r.error !== "0")) {
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_tot_load_fail"));
                return;
            }
            if (!r.enabled || !r.tot) {
                // (24 October: before the doors open, when they do, not "over for this year")
                let opens: number = Number(r.opens) || 0;
                let now: number = GLOBAL.Timestamp();
                GLOBAL.Message(r.enabled && opens > now ? KEYS.Get("io_tot_tip_soon", { "v1": GLOBAL.ioDuration(opens - now) }) : KEYS.Get("io_tot_over"));
                return;
            }
            IoTot.take(r.tot);
            if (!IoTot.own() || IoTotWindow.isOpen) {
                return;
            }
            IoTotWindow.Open();
        }, (err: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_tot_load_fail"));
        });
    }

    /**
     * A knock on a door: the server rolls it (once). done(answer) with {tribe, door, credits, paid, tot}, or done(null,
     * message) when it was refused. Test mode may force the result (tests: force "treat" or "trick").
     */
    public static knock(key: string, done: Function, force: string = null): void {
        let why: string = IoTot.busy();
        if (why) {
            done(null, why);
            return;
        }
        let pairs: any[] = [["tribe", key]];
        if (force) {
            pairs.push(["force", force]);
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "tot/knock", pairs, (r: any): void => {
            if (!r || (r.error !== 0 && r.error !== "0") || !r.door) {
                done(null, r && r.error ? String(r.error) : KEYS.Get("io_tot_load_fail"));
                return;
            }
            IoTot.take(r.tot);
            if (r.credits != null) {
                IoTot.setCredits(Number(r.credits));
            }
            done(r);
        }, (err: IOErrorEvent): void => {
            done(null, KEYS.Get("io_tot_load_fail"));
        });
    }

    /** The server's balance, as the daily reward takes it (IoDailyPopup). */
    private static setCredits(credits: number): void {
        if (isNaN(credits) || !BASE._credits) {
            return;
        }
        BASE._credits.Set(credits | 0);
        BASE._hpCredits = credits | 0;
        GLOBAL._credits.Set(credits | 0);
        try {
            UI2.Update();
        } catch (e) {
        }
    }

    // ---------------------------------------------------------------------------------------- the trick
    /**
     * TRICK! The banner over the yard counts down (COUNTDOWN seconds, a tick each), then the raid. Left before it ends
     * (another yard), nothing happens: the trick still waits, and comes the next time the player is home.
     */
    public static startTrick(key: string): void {
        let d: any = IoTot.door(key);
        if (!d || d.r != "trick" || IoTot._busy || WMATTACK._inProgress || !IoTot.own()) {
            return;
        }
        if (d.s == "fighting") {
            // (a fight left by reloading the game: lost)
            IoTot.abandon(key, d);
            return;
        }
        if (d.s != "pending") {
            return;
        }
        let f: any = IoTot.flag();
        IoTot._busy = true;
        let baseid: string = String(BASE._loadedBaseID);
        let left: int = IoTot.COUNTDOWN;
        IoTot.showBanner(key, f ? f.horde | 0 : 1000, left);
        SOUNDS.Play("wmbhorn", 0.8);
        let step: Function = null;
        step = (): void => {
            if (!IoTot.own() || String(BASE._loadedBaseID) != baseid || BASE._loading) {
                IoTot.hideBanner();
                IoTot._busy = false;
                return;
            }
            left--;
            if (left > 0) {
                SOUNDS.Play("clock1", 0.5);
                IoTot.showBanner(key, f ? f.horde | 0 : 1000, left);
                setTimeout(step, 1000);
                return;
            }
            IoTot.hideBanner();
            IoTot.launch(key, d);
        };
        setTimeout(step, 1000);
    }

    /** The banner: TRICK!, who sends what, and the seconds left. */
    private static showBanner(key: string, horde: int, left: int): void {
        if (!GLOBAL._layerTop) {
            return;
        }
        let b: Sprite = IoTot._banner;
        if (!b) {
            b = new Sprite();
            b.name = "ioTotBanner";
            b.mouseEnabled = false;
            b.mouseChildren = false;
            IoTot._banner = b;
            GLOBAL._layerTop.addChild(b);
        }
        while (b.numChildren > 0) {
            b.removeChildAt(0);
        }
        let w: int = 620;
        b.graphics.clear();
        b.graphics.lineStyle(2, 0xFF7A1A, 1);
        b.graphics.beginFill(0x120604, 0.9);
        b.graphics.drawRoundRect(-w / 2, 0, w, 116, 18);
        b.graphics.endFill();
        let title: TextField = CasinoUI.label(KEYS.Get("io_tot_trick_banner"), 40, 0xFF8A1E, true, w, TextFormatAlign.CENTER, "Groboldov");
        title.x = -w / 2;
        title.y = 6;
        title.filters = [new GlowFilter(0xFF3A00, 0.9, 10, 10, 2)];
        b.addChild(title);
        let line: TextField = CasinoUI.label(KEYS.Get("io_tot_trick_coming", { "v1": IoTot.tribeName(key), "v2": IoFormat.number(horde), "v3": left }), 14, 0xFFE8C8, true, w - 30, TextFormatAlign.CENTER);
        line.x = -w / 2 + 15;
        line.y = 62;
        b.addChild(line);
        let goal: TextField = CasinoUI.label(KEYS.Get("io_tot_trick_goal", { "v1": IoFormat.number(horde), "v2": IoTot.flag() ? IoTot.flag().shiny | 0 : 25 }), 12, 0xC8F0A0, false, w - 30, TextFormatAlign.CENTER);
        goal.x = -w / 2 + 15;
        goal.y = 86;
        b.addChild(goal);
        b.x = GLOBAL._SCREENCENTER.x;
        b.y = GLOBAL._SCREEN.y + 90;
        b.scaleX = b.scaleY = left % 2 == 0 ? 1.03 : 1;
    }

    private static hideBanner(): void {
        if (IoTot._banner && IoTot._banner.parent) {
            IoTot._banner.parent.removeChild(IoTot._banner);
        }
        IoTot._banner = null;
    }

    /** The server is told the fight begins; then the Zagnoids, all round the yard. */
    private static launch(key: string, d: any): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "tot/trickstart", [["tribe", key], ["id", d.id | 0]], (r: any): void => {
            if (!r || (r.error !== 0 && r.error !== "0")) {
                IoTot._busy = false;
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_tot_load_fail"));
                return;
            }
            IoTot.take(r.tot);
            if (!IoTot.own() || WMATTACK._inProgress || BASE._loading) {
                // (gone from the yard meanwhile: lost, as a reload is)
                IoTot._busy = false;
                IoTot.abandon(key, r.door);
                return;
            }
            IoTot.raid(key, r.door);
        }, (err: IOErrorEvent): void => {
            IoTot._busy = false;
            GLOBAL.Message(KEYS.Get("io_tot_load_fail"));
        });
    }

    /**
     * The raid: WMATTACK's (the windows closed, the bar, saves held till it's over, the end when no Zagnoid fights on:
     * WMATTACK.Tick), with its own end (over) and its monsters: the horde on a ring round everything in the yard.
     */
    public static raid(key: string, d: any): void {
        let f: any = IoTot.flag() || {};
        let t: any[] = IoTot.info(key);
        let total: int = Math.max(1, f.horde | 0 || 1000) | 0;
        let level: int = Math.max(1, f.level | 0 || 6) | 0;
        let monster: string = f.monster ? String(f.monster) : "IC2";
        WMATTACK._isAI = false;
        WMATTACK._attackersBaseID = t ? t[2] | 0 : 1;
        WMATTACK._type = t ? t[3] | 0 : WMATTACK.TYPE_SWARM;
        WMATTACK._ioPlan = { "tribe": key, "level": level, "monsters": {} };
        WMATTACK._ioPlan.monsters[monster] = total;
        WMATTACK.AttackB();
        WMATTACK.setEnd(IoTot.over);
        UI2._warning.Update("<font size=\"15\">" + KEYS.Get("io_tot_bar", { "v1": IoFormat.number(total), "v2": f.shiny | 0 || 25 }) + "</font>");
        SOUNDS.PlayMusic("musicipanic");
        SOUNDS.Play("warcry1", 0.9);
        IoTilt.nod(IoTilt.MEDIUM, NaN, NaN, false, 200);
        let horde: any[] = IoTot.spawnRing(monster, total, level);
        IoTot._fight = { "tribe": key, "id": d.id | 0, "horde": horde, "total": total, "started": getTimer() };
        // (recorded for its replay and the Attack Log, as a raid is)
        WMATTACK.ioRecordRaid();
    }

    /**
     * The horde on a ring round the yard: outside everything built (a little past the farthest building, in the
     * yard's own ground terms), evenly all the way round, three deep, each facing the middle.
     */
    public static spawnRing(monster: string, total: int, level: int): any[] {
        let far: number = 0;
        for (let b of (BASE._buildingsAll ? as3.values(BASE._buildingsAll) : [])) {
            let f: BFOUNDATION = as3.as(b, BFOUNDATION);
            if (!f || !f._mc || !f._footprint || !f._footprint[0]) {
                continue;
            }
            let g: Point = GRID.FromISO(f._mc.x, f._mc.y);
            let cx: number = g.x + f._footprint[0].width / 2;
            let cy: number = g.y + f._footprint[0].height / 2;
            far = Math.max(far, Math.sqrt(cx * cx + cy * cy) + Math.max(f._footprint[0].width, f._footprint[0].height) / 2);
        }
        let r0: number = Math.min(1180, Math.max(320, far + 110));
        let out: any[] = [];
        for (let i: int = 0; i < total; i++) {
            let a: number = (i / total) * Math.PI * 2;
            let r: number = r0 + (i % 3) * 16;
            let p: Point = GRID.ToISO(Math.cos(a) * r, Math.sin(a) * r, 0);
            let facing: number = ((a * 57.2957795 + 180) % 360);
            let m: MonsterBase = CREEPS.Spawn(monster, MAP._BUILDINGTOPS, "bounce", p, facing, 1, true, false, level);
            if (m) {
                m._hitLimit = int.MAX_VALUE;
                // (killed, not just gone: one that gets home is cleared from the map with no health left too)
                let mm: any = m;
                mm.addEventListener(MonsterBase.k_DEATH_EVENT, (): void => { mm.$ioTotKilled = true; });
                out.push(m);
            }
        }
        return out;
    }

    /** The fight is over (WMATTACK.Tick: no Zagnoid left fighting): how many were killed, the raid's end, then the server. */
    public static over(): void {
        let fight: any = IoTot._fight;
        IoTot._fight = null;
        let killed: int = 0;
        let alive: int = 0;
        for (let m of as3.values(fight ? fight.horde : [])) {
            let mb: MonsterBase = as3.as(m, MonsterBase);
            // (killed: its death seen, or falling now; one that got home is gone with no health too, but wasn't)
            if (!mb || (m as any).$ioTotKilled || (!mb.dead && mb.health <= 0)) {
                killed++;
            } else {
                alive++;
            }
        }
        if (alive > 0) {
            // (what's left of them goes home with what it took)
            CREEPS.Retreat();
        }
        WMATTACK.CleanUp();
        WMATTACK._ioPlan = null;
        WMATTACK._isAI = true;
        if (!fight) {
            IoTot._busy = false;
            return;
        }
        let total: int = fight.total | 0;
        let cleared: boolean = killed >= total;
        IoTot.last = { "tribe": fight.tribe, "killed": killed, "total": total, "cleared": cleared };
        new URLLoaderApi().load(GLOBAL.serverUrl + "tot/trickend", [["tribe", fight.tribe], ["id", fight.id], ["cleared", cleared ? 1 : 0], ["killed", killed]], (r: any): void => {
            IoTot._busy = false;
            if (!r || (r.error !== 0 && r.error !== "0")) {
                return;
            }
            IoTot.take(r.tot);
            if (r.credits != null) {
                IoTot.setCredits(Number(r.credits));
            }
            IoTot.last.won = Boolean(r.won);
            IoTot.last.paid = r.paid | 0;
            IoTot.result(fight.tribe, killed, total, Boolean(r.won), r.paid | 0);
        }, (err: IOErrorEvent): void => {
            IoTot._busy = false;
        });
    }

    /** What the fight came to, said over the yard after the raid's own report. */
    private static result(key: string, killed: int, total: int, won: boolean, paid: int): void {
        setTimeout((): void => {
            if (won) {
                SOUNDS.Play("pumpkintreat", 0.8);
                SOUNDS.Play("chaching", 0.6);
                GLOBAL.Message(KEYS.Get("io_tot_result_won", { "v1": IoFormat.number(total), "v2": IoTot.tribeName(key), "v3": paid }));
            } else {
                GLOBAL.Message(KEYS.Get("io_tot_result_lost", { "v1": IoFormat.number(killed), "v2": IoFormat.number(total), "v3": IoTot.tribeName(key) }));
            }
        }, 900);
    }

    /** A fight that was left (the game reloaded during it): the server is told it was lost. */
    private static abandon(key: string, d: any): void {
        if (!d) {
            return;
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "tot/trickend", [["tribe", key], ["id", d.id | 0], ["cleared", 0], ["killed", 0]], (r: any): void => {
            if (r && (r.error === 0 || r.error === "0")) {
                IoTot.take(r.tot);
                if (!r.stale) {
                    IoToast.Show(KEYS.Get("io_tot_left", { "v1": IoTot.tribeName(key) }), 8000);
                }
            }
        }, (err: IOErrorEvent): void => {});
    }

    // ---------------------------------------------------------------------------------------- the yard loaded
    /**
     * The player's own main yard is up (BASE): a trick still waiting comes now (after a moment, with its countdown), a
     * fight left by reloading is lost; and once the event is over, its Mini-Pumpkins are said (the server put them in
     * storage: io_tot_gift).
     */
    public static afterLoad(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoTot.hideBanner();
        IoTot._busy = false;
        IoTot._fight = null;
        IoTotWindow.CloseOpen();
        if (!IoTot.own()) {
            return;
        }
        let gift: int = GLOBAL._flags ? GLOBAL._flags.io_tot_gift | 0 : 0;
        if (gift > 0) {
            GLOBAL._flags.io_tot_gift = 0;
            setTimeout((): void => {
                SOUNDS.Play("pumpkintreat", 0.7);
                GLOBAL.Message(KEYS.Get("io_tot_gift", { "v1": gift }), KEYS.Get("io_place_now"), (): void => {
                    IoTot.placePumpkin();
                });
            }, 2500);
        }
        let w: string = IoTot.waitingTrick();
        if (w) {
            let baseid: string = String(BASE._loadedBaseID);
            setTimeout((): void => {
                if (!IoTot.own() || String(BASE._loadedBaseID) != baseid || WMATTACK._inProgress || IoTot._busy) {
                    return;
                }
                let d: any = IoTot.door(w);
                if (d && d.s == "pending") {
                    IoToast.Show(KEYS.Get("io_tot_still_coming", { "v1": IoTot.tribeName(w) }), 6000);
                }
                IoTot.startTrick(w);
            }, 6000);
        }
    }

    /** A Mini-Pumpkin from storage taken in hand, to put down (as Buildings, Decorations does). */
    public static placePumpkin(): boolean {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || InventoryManager.buildingStorageCount(IoTot.PUMPKIN) <= 0 || GLOBAL._newBuilding) {
            return false;
        }
        return BASE.addBuildingB(IoTot.PUMPKIN) != null;
    }

    /** No knocking while the Pit, the Arcade, the Quest Book or a Hellgate run is open over the yard (as raids wait for them). */
    public static quiet(): boolean {
        return CasinoWindow.isOpen || ArcadeWindow.isOpen || IoQuestBook.isOpen || IoTd.on;
    }

    public static canonical(key: string): string {
        let t: any[] = IoTot.info(key);
        return t ? TRIBES.DisplayName(String(t[1])) : key;
    }
}
