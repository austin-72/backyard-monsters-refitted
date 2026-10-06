import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData, BlendMode, IBitmapDrawable, MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent } from "flash/events";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, BTOWER, BTRAP, BYMConfig, CREATURELOCKER, GLOBAL, GRID, InstanceManager, IoHfoArt, IoHfoIce, IoHfoUi, IoHfoWaves, KEYS, MAP, MAPBG, POPUPS, QUEUE, RasterData, SOUNDS, URLLoaderApi, WORKERS } from "@game";

/**
 * Hell Freezes Over (the user's hell_freezes_over.md, 1 October): a one-time story event in the player's main
 * yard. The server decides who it is for, when each day starts and what is paid (services/events/hfo.ts); it
 * sends the player's progress as the flag io_hfo and with every answer below. The game does the yard:
 *
 *  - Day 1 "Something's not right": small ice patches (IoHfoIce SMALL): 6, then one more every 2 hours, 12 in
 *    all, each on a free 30 x 30 spot. A worker clears each one and says a line (dealt by the server).
 *  - Day 2 "It's the curse": 5 big patches (60 x 60) that won't break: a worker chips at each, it cracks and
 *    holds. They stay until the curse breaks.
 *  - Day 3 "Hell has frozen over": the ground freezes (MAPBG "hfo_frozen"), every defence tower is sealed in
 *    ice (IoHfoIce TOWER, build mode only: towers fire as usual whatever happens) and a counter shows how many
 *    are freed. A large block of ice (the tomb) stands just off the yard's right-hand corner from now on.
 *    The last tower freed: "Hell has frozen over!" and the waves begin.
 *  - The waves (IoHfoWaves): 13, from the event's window (IoHfoUi) or the popups.
 *  - All 13 won: the reveal. The ground thaws, the big patches melt, the tomb bursts and Rimegrave stands
 *    there; he can now be unlocked in the Strongbox.
 *
 * Only on the player's own main yard in build mode (not outposts, attacks, visits or Designer drafts).
 */
export class IoHfo extends ASObject {
    // ---- the player's progress (flag io_hfo)
    private static _raw: string = null;

    private static _flag: any = null;

    // ---- the yard
    private static _ticker: Sprite = null;

    private static _tomb: any = null;

    private static _busy: any = {};

    private static _lastSpawnCheck: int = 0;

    private static _setupAt: int = 0;

    // ---- the reveal: all 13 won
    private static _revealing: boolean = false;

    /** The progress as the server last said, or null (not started, or not on an own yard). */
    public static flag(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_hfo ? String(GLOBAL._flags.io_hfo) : "";
        if (raw != IoHfo._raw) {
            IoHfo._raw = raw;
            IoHfo._flag = null;
            if (raw != "") {
                try {
                    IoHfo._flag = JSON.parse(raw);
                } catch (e) {
                    IoHfo._flag = null;
                }
            }
        }
        return IoHfo._flag;
    }

    /** An answer's progress becomes the flag (until the next one the server sends). */
    public static apply(view: any): void {
        if (!view || !GLOBAL._flags) {
            return;
        }
        GLOBAL._flags.io_hfo = JSON.stringify(view);
        IoHfo.flag();
        CREATURELOCKER.ioHfoRefresh();
    }

    /** Rimegrave may be unlocked: the curse is broken (or an admin is testing). */
    public static championFree(): boolean {
        if (GLOBAL.ioTestMode()) {
            return true;
        }
        let f: any = IoHfo.flag();
        return f != null && Number(f.done) > 0;
    }

    /** The event is shown here: the player's own main yard, build mode. */
    public static inYard(): boolean {
        return GLOBAL.INFERNO_ONLY && IoHfo.flag() != null && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && !GLOBAL.ioDesignMode();
    }

    /** The ground is frozen: Day 3 until the reveal has played. */
    public static frozenGround(): boolean {
        let f: any = IoHfo.flag();
        return IoHfo.inYard() && (f.day | 0) >= 3 && !(Number(f.done) > 0 && f.seen && Number(f.seen.reveal) > 0);
    }

    /** The waves are open (the event's button shows from Day 3). */
    public static buttonShown(): boolean {
        let f: any = IoHfo.flag();
        // (gone once Rimegrave, the event's champion, is unlocked in the Strongbox: the user's, 4 October)
        let locker: any = CREATURELOCKER._lockerData ? CREATURELOCKER._lockerData[CREATURELOCKER.RIMEGRAVE_ID] : null;
        if (locker && (locker.t | 0) == 2) {
            return false;
        }
        return IoHfo.inYard() && (f.day | 0) >= 3;
    }

    /** The yard has loaded (BASE, after the warts): the event's ice, the tomb, popups. */
    public static Setup(): void {
        IoHfo.Cleanup();
        // (Rimegrave in the Strongbox, the Compound and the Academy only once the curse is broken)
        CREATURELOCKER.ioHfoRefresh();
        if (!IoHfo.inYard()) {
            return;
        }
        IoHfo._setupAt = getTimer();
        let f: any = IoHfo.flag();
        let day: int = f.day | 0;
        let revealed: boolean = Boolean(Number(f.done) > 0 && f.seen && Number(f.seen.reveal) > 0);
        let p: any[] = null;
        for (p of as3.values(as3.as(f.small.patches, Array))) {
            IoHfoIce.patch(IoHfoIce.SMALL, p[0] | 0, p[1] | 0, p[2] | 0, p[3] | 0);
        }
        if (!revealed) {
            for (p of as3.values(as3.as(f.big.patches, Array))) {
                IoHfoIce.patch(IoHfoIce.BIG, p[0] | 0, p[1] | 0, p[2] | 0, p[3] | 0);
            }
        }
        if (day == 3) {
            IoHfo.setupTowers();
        }
        if (day >= 3 && !revealed) {
            IoHfo.drawTomb();
        }
        IoHfo.spawnPatches();
        IoHfoUi.Hud();
        if (!IoHfo._ticker) {
            IoHfo._ticker = new Sprite();
        }
        IoHfo._ticker.addEventListener(Event.ENTER_FRAME, IoHfo.tick);
        if (day >= 4 && !(f.seen && Number(f.seen.frozen) > 0)) {
            IoHfoUi.FrozenPopup();
        } else if (Number(f.done) > 0 && !revealed) {
            // won the last wave and left before the reveal: it plays now
            IoHfo.Reveal();
        }
    }

    /** The yard is leaving (BASE.Cleanup). */
    public static Cleanup(): void {
        if (IoHfo._ticker) {
            IoHfo._ticker.removeEventListener(Event.ENTER_FRAME, IoHfo.tick);
        }
        IoHfo.clearTomb();
        IoHfoArt.clearFx();
        IoHfoArt.clearBattleIce();
        IoHfoUi.HudOff();
        IoHfo._busy = {};
    }

    private static tick(e: Event): void {
        if (!IoHfo.inYard()) {
            return;
        }
        let now: int = getTimer();
        if (now - IoHfo._lastSpawnCheck > 60000) {
            IoHfo._lastSpawnCheck = now;
            IoHfo.spawnPatches();
        }
        IoHfo.tombLines(now);
        IoHfoWaves.Tick();
    }

    // ---- patches: placed by the game on free ground, kept by the server
    /** Patches the player may have by now that aren't placed yet: found a spot and told to the server. */
    private static spawnPatches(): void {
        let f: any = IoHfo.flag();
        if (!f || IoHfo._busy.spawn) {
            return;
        }
        let day: int = f.day | 0;
        let revealed: boolean = Number(f.done) > 0;
        if (day >= 1) {
            let allowed: int = Math.min(f.small.total | 0, 6 + Math.floor(Math.max(0, GLOBAL.Timestamp() - Number(f.dayAt[1])) / Math.max(1, f.small.every | 0))) | 0;
            if ((f.small.spawned | 0) < allowed) {
                IoHfo.send("small", (allowed - (f.small.spawned | 0)) | 0, 30, 5);
                return;
            }
        }
        if (day >= 2 && !revealed && (f.big.spawned | 0) < (f.big.total | 0)) {
            IoHfo.send("big", ((f.big.total | 0) - (f.big.spawned | 0)) | 0, 60, 3);
        }
    }

    private static send(kind: string, count: int, size: int, frames: int): void {
        let spots: any[] = [];
        let taken: any[] = [];
        for (let n: int = 0; n < count; n++) {
            let spot: Point = IoHfo.freeSpot(size, taken);
            if (!spot) {
                break;
            }
            taken.push(new Rectangle(spot.x - 10, spot.y - 10, size + 20, size + 20));
            spots.push([spot.x, spot.y, 1 + ((Math.random() * frames) | 0)]);
        }
        if (!spots.length) {
            return;
        }
        IoHfo._busy.spawn = true;
        IoHfo.call("spawn", [["kind", kind], ["patches", JSON.stringify(spots)]], (r: any): void => {
            IoHfo._busy.spawn = false;
            let placed: any = {};
            for (let ice of as3.values(IoHfo.ices())) {
                placed[ice.kind + ice.ioServerId] = true;
            }
            let list: any[] = as3.cast(kind == "small" ? r.hfo.small.patches : r.hfo.big.patches, Array);
            for (let p of as3.values(list)) {
                if (!placed[kind + p[0]] && IoHfo.inYard()) {
                    IoHfoIce.patch(kind == "small" ? IoHfoIce.SMALL : IoHfoIce.BIG, p[0] | 0, p[1] | 0, p[2] | 0, p[3] | 0);
                }
            }
            BASE.Save();
        }, (): void => {
            IoHfo._busy.spawn = false;
        });
    }

    /** A free grid spot of size x size inside the yard (with room round it), or null. */
    private static freeSpot(size: int, taken: any[]): Point {
        let halfW: number = GLOBAL._mapWidth * 0.5 - size - 40;
        let halfH: number = GLOBAL._mapHeight * 0.5 - size - 40;
        for (let tries: int = 0; tries < 3000; tries++) {
            let x: int = ((((Math.random() * 2 - 1) * halfW / 10) | 0) * 10) | 0;
            let y: int = ((((Math.random() * 2 - 1) * halfH / 10) | 0) * 10) | 0;
            let clash: boolean = false;
            for (let r of as3.values(taken)) {
                if (r.intersects(new Rectangle(x, y, size, size))) {
                    clash = true;
                    break;
                }
            }
            // (with a margin, so a worker can reach it and it doesn't wall anything in)
            if (!clash && !GRID.FootprintBlocked([new Rectangle(-10, -10, size + 20, size + 20)], GRID.ToISO(x, y, 0), true)) {
                return new Point(x, y);
            }
        }
        return null;
    }

    /** Every piece of the event's ice in the yard. */
    public static ices(): any[] {
        let out: any[] = [];
        for (let o of (InstanceManager.getInstancesByClass(BMUSHROOM) ?? [])) {
            if (o instanceof IoHfoIce) {
                out.push(o);
            }
        }
        return out;
    }

    // ---- Day 3: the towers
    /** Every defence tower (not traps, the Compound or a bunker). */
    public static defenceTowers(): any[] {
        let out: any[] = [];
        for (let o of (InstanceManager.getInstancesByClass(BTOWER) ?? [])) {
            let t: BTOWER = as3.as(o, BTOWER);
            if (t && t._class == "tower" && !(t instanceof BTRAP)) {
                out.push(t);
            }
        }
        return out;
    }

    private static setupTowers(): void {
        let f: any = IoHfo.flag();
        let iced: any[] = as3.as(f.towers.iced, Array);
        if (!iced) {
            // Day 3 begins: every tower there is now, sealed
            let ids: any[] = [];
            for (let t of as3.values(IoHfo.defenceTowers())) {
                ids.push(t._id);
            }
            IoHfo._busy.towers = true;
            IoHfo.call("towers", [["ids", JSON.stringify(ids)]], (r: any): void => {
                IoHfo._busy.towers = false;
                if (IoHfo.inYard()) {
                    IoHfo.placeTowerIce();
                    IoHfoUi.Hud();
                    if (r.frozen) {
                        // (no defence towers to free: the waves open at once)
                        IoHfoUi.FrozenPopup();
                    }
                }
            }, (): void => {
                IoHfo._busy.towers = false;
            });
            return;
        }
        IoHfo.placeTowerIce();
    }

    private static placeTowerIce(): void {
        let f: any = IoHfo.flag();
        let iced: any[] = as3.as(f.towers.iced, Array) || [];
        let thawed: any[] = as3.as(f.towers.thawed, Array) || [];
        let here: any = {};
        for (let t of as3.values(IoHfo.defenceTowers())) {
            here[t._id] = t;
        }
        let placed: any = {};
        for (let ice of as3.values(IoHfo.ices())) {
            if (ice.kind == IoHfoIce.TOWER) {
                placed[ice.ioServerId] = true;
            }
        }
        for (const $value of as3.values(iced)) {
            let id: int = $value | 0;
            if (thawed.indexOf(id) != -1 || placed[id]) {
                continue;
            }
            if (here[id]) {
                IoHfoIce.onTower(as3.as(here[id], BFOUNDATION));
            } else {
                // recycled since: counts as freed (no worker, no line)
                IoHfo.call("thaw", [["id", id], ["gone", "1"]], (r: any): void => {
                    IoHfoUi.Hud();
                    if (r.frozen) {
                        IoHfoUi.FrozenPopup();
                    }
                });
            }
        }
    }

    // ---- workers
    public static sendWorker(ice: IoHfoIce): void {
        if (!ice || ice._picking || !IoHfo.inYard()) {
            return;
        }
        if (ice.kind == IoHfoIce.TOWER && ice.tower && (ice.tower._countdownBuild.Get() + ice.tower._countdownUpgrade.Get() + ice.tower._countdownFortify.Get() > 0)) {
            GLOBAL.Message(KEYS.Get("hfo_tower_busy"));
            return;
        }
        if (QUEUE.Add("hfoice" + ice._id, ice)) {
            ice._mc.alpha = 0.6;
            ice._picking = true;
        } else {
            POPUPS.DisplayWorker(2, ice);
        }
    }

    /** The worker has done what can be done: the server settles it and deals the worker's line. */
    public static workerDone(ice: IoHfoIce): void {
        let prefix: string = null;
        let action: string = ice.kind == IoHfoIce.SMALL ? "clear" : (ice.kind == IoHfoIce.BIG ? "try" : "thaw");
        prefix = ice.kind == IoHfoIce.SMALL ? "hfo_ice_small_msg" : (ice.kind == IoHfoIce.BIG ? "hfo_ice_big_msg" : "hfo_ice_tower_msg");
        IoHfo.call(action, [["id", ice.ioServerId]], (r: any): void => {
            let worker: MovieClip = QUEUE.Remove("hfoice" + ice._id, true);
            let line: int = r.line | 0;
            if (line > 0) {
                WORKERS.Say(KEYS.Get(prefix + line), worker, 3500);
            }
            let x: number = ice._mc.x;
            let y: number = ice._mc.y;
            if (ice.kind == IoHfoIce.SMALL) {
                ice.ioRemove();
                IoHfoArt.play(ice.picture + "_shatter", x, y, IoHfoArt.mapDepth(x, y + 20), 4);
                SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
            } else if (ice.kind == IoHfoIce.BIG) {
                // it cracks... and snaps back
                IoHfoArt.play(ice.picture + "_crack", x, y, IoHfoArt.depthOf(ice) + 20, 6, (): void => {
                    ice.ioReset();
                });
                SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
            } else {
                let tower: BFOUNDATION = ice.tower;
                let size: string = IoHfoArt.towerSize(tower);
                ice.ioRemove();
                IoHfoArt.play("ice_" + size + "_shatter", x, y, tower ? IoHfoArt.depthOf(tower) + 50 : IoHfoArt.mapDepth(x, y + 40), 3);
                SOUNDS.Play("quake", 0.25);
                IoHfoUi.Hud();
                if (r.frozen) {
                    IoHfoUi.FrozenPopup();
                }
            }
            BASE.Save();
        }, (): void => {
            QUEUE.Remove("hfoice" + ice._id, false);
            ice.ioReset();
        });
    }

    // ---- the tomb: Rimegrave's ice, just off the yard's right-hand corner
    /** Its anchor on the map (the corner of its footprint diamond). */
    public static tombPoint(): Point {
        return GRID.ToISO(GLOBAL._mapWidth * 0.5 + 70, -GLOBAL._mapHeight * 0.5 - 70, 0);
    }

    /** Cracks at 4, 8 and 12 waves won. */
    public static tombStage(): int {
        let f: any = IoHfo.flag();
        let won: int = 0;
        for (let w of as3.values(as3.as(f.waves, Array))) {
            if (w[1]) {
                won++;
            }
        }
        return won >= 12 ? 3 : (won >= 8 ? 2 : (won >= 4 ? 1 : 0));
    }

    private static drawTomb(): void {
        if (!BYMConfig.instance.RENDERER_ON || !MAP.instance) {
            return;
        }
        IoHfo.clearTomb();
        let at: Point = IoHfo.tombPoint();
        let off: Point = MAP.instance.offset;
        let stage: int = IoHfo.tombStage();
        let top: BitmapData = IoHfoArt.pic("block" + stage);
        let topAt: Point = IoHfoArt.picAt("block" + stage);
        let shadow: BitmapData = IoHfoArt.pic("block_shadow");
        let shadowAt: Point = IoHfoArt.picAt("block_shadow");
        let topPt: Point = new Point(at.x + topAt.x - off.x, at.y + topAt.y - off.y);
        let shadowPt: Point = new Point(at.x + shadowAt.x - off.x, at.y + shadowAt.y - off.y);
        IoHfo._tomb = { "at": at, "stage": stage, "top": new RasterData(as3.cast(top, IBitmapDrawable), topPt, IoHfoArt.mapDepth(at.x, at.y + 50)), "shadow": new RasterData(as3.cast(shadow, IBitmapDrawable), shadowPt, MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true), "said": 0 };
    }

    private static clearTomb(): void {
        if (IoHfo._tomb) {
            as3.cast(IoHfo._tomb.top, RasterData).clear();
            as3.cast(IoHfo._tomb.shadow, RasterData).clear();
        }
        IoHfo._tomb = null;
    }

    /** The tomb drawn again (more cracks after a win). */
    public static TombUpdate(): void {
        if (IoHfo._tomb && IoHfo._tomb.stage != IoHfo.tombStage()) {
            IoHfo.drawTomb();
        }
    }

    /** A worker who comes near it sometimes says so. */
    private static tombLines(now: int): void {
        if (!IoHfo._tomb || now - Number(IoHfo._tomb.said) < 90000 || now % 50 != 0) {
            return;
        }
        let at: Point = as3.cast(IoHfo._tomb.at, Point);
        for (let w of as3.values(WORKERS._workers)) {
            if (w && w.mc && !w.task && Point.distance(new Point(w.mc.x, w.mc.y), at) < 180 && Math.random() < 0.3) {
                IoHfo._tomb.said = now;
                WORKERS.Say(KEYS.Get("hfo_tomb_msg"), as3.cast(w.mc, MovieClip), 3000);
                return;
            }
        }
    }

    public static Reveal(): void {
        let at: Point = null;
        let steps: any[] = null;
        let next: Function = null;
        if (IoHfo._revealing || !IoHfo.inYard()) {
            return;
        }
        IoHfo._revealing = true;
        if (!IoHfo._tomb) {
            IoHfo.drawTomb();
        }
        at = IoHfo.tombPoint();
        MAP.FocusTo(at.x | 0, (at.y - 40) | 0, 1.5);
        // the heat comes back: the ground thaws and the big patches melt
        IoHfo.fadeGround();
        for (let ice of as3.values(IoHfo.ices())) {
            if (ice.kind == IoHfoIce.BIG) {
                let x: number = ice._mc.x;
                let y: number = ice._mc.y;
                let pic: string = ice.picture;
                ice.ioRemove();
                IoHfoArt.play(pic + "_melt", x, y, MAP.DEPTH_SHADOW + 0.5, 10);
            }
        }
        // the block splits apart (its cracks first), then bursts
        steps = [1, 2, 3];
        next = (): void => {
            if (!IoHfo._tomb) {
                IoHfo._revealing = false;
                return;
            }
            if (steps.length) {
                let stage: int = steps.shift() | 0;
                as3.cast(IoHfo._tomb.top, RasterData).data = as3.cast(IoHfoArt.pic("block" + stage), IBitmapDrawable);
                SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.8);
                IoHfoArt.wait(45, next);
                // (a pause between the cracks)
                return;
            }
            as3.cast(IoHfo._tomb.shadow, RasterData).clear();
            as3.cast(IoHfo._tomb.top, RasterData).clear();
            SOUNDS.Play("quake", 0.6);
            IoHfoArt.play("block_reveal", at.x, at.y, IoHfoArt.mapDepth(at.x, at.y + 60), 4, (): void => {
                IoHfo._tomb = null;
                IoHfoUi.ShowRimegrave(at);
                IoHfo._revealing = false;
                IoHfo.call("seen", [["what", "reveal"]], (r: any): void => {
                    IoHfoUi.Hud();
                });
                IoHfoUi.ChampionPopup();
            });
        };
        next();
    }

    /** The frozen ground fades back into the lava ground. */
    private static fadeGround(): void {
        let lava: BitmapData = null;
        let step: int = 0;
        let fader: Sprite = null;
        let ct: ColorTransform = null;
        let fade: Function = null;
        if (!BYMConfig.instance.RENDERER_ON || !MAP.effectsBMD) {
            MAP.swapBG("lava");
            return;
        }
        lava = MAPBG.MakeTile("lava");
        step = 0;
        fader = new Sprite();
        ct = new ColorTransform(1, 1, 1, 0.12);
        fade = (e: Event): void => {
            step++;
            if (step % 3 == 0 && MAP.effectsBMD) {
                for (let i: int = 0; i < 4; i++) {
                    for (let j: int = 0; j < 4; j++) {
                        MAP.effectsBMD.draw(as3.cast(lava, IBitmapDrawable), new Matrix(1, 0, 0, 1, i * 1000, j * 500), ct);
                    }
                }
            }
            if (step >= 75) {
                fader.removeEventListener(Event.ENTER_FRAME, fade);
                lava.dispose();
                MAP.swapBG("lava");
            }
        };
        fader.addEventListener(Event.ENTER_FRAME, fade);
    }

    // ---- the server
    /** POST hfo/<action>; `ok` gets the answer (its progress is applied first), `failed` an error. */
    public static call(action: string, vars: any[], ok: Function = null, failed: Function = null): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "hfo/" + action, vars || [["v", "1"]], (r: any): void => {
            if (!r || r.error) {
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("hfo_err_server"));
                if (failed != null) {
                    failed();
                }
                return;
            }
            if (r.hfo) {
                IoHfo.apply(r.hfo);
            }
            if (ok != null) {
                ok(r);
            }
        }, (e: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("hfo_err_server"));
            if (failed != null) {
                failed();
            }
        });
    }
}
