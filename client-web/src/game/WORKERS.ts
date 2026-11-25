import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { SharedObject } from "flash/net";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Mouse, MouseCursor } from "flash/ui";
import { Timer, getTimer } from "flash/utils";
import { BASE, BFOUNDATION, CASINO, GLOBAL, GRID, IoMapUi, IoPets, IoWorkerFun, IoYardPick, KEYS, LOGIN, MAP, QUESTS, QUEUE, STORE, TUTORIAL, UI_WORKERS, URLLoaderApi, WORKER, IoFormat } from "@game";

export class WORKERS extends ASObject {
    public static _workers: any[] = null;

    public static _sayings: any = null;

    // ---- Inferno-only (QoL #475): workers and pets can be clicked (IoYardPick): the hand over them, and "Click me!"
    // over a worker for a player's first IO_HINT_SESSIONS sessions (the count kept in the browser, per account)
    public static readonly IO_HINT_SESSIONS: int = 3;

    /** How long the hint stays over its worker (ms). */
    private static readonly IO_HINT_MS: int = 20000;

    /** The yard's ground the pointer is watched on (a new one each yard). */
    private static _ioGround: Sprite = null;

    private static _ioOverGround: boolean = false;

    /** The hand is shown (by this: put back when the pointer leaves them). */
    private static _ioHand: boolean = false;

    private static _ioFrame: int = 0;

    /** This session's count is taken (once), and whether the hint is shown in it. */
    private static _ioSessionCounted: boolean = false;

    private static _ioHintSession: boolean = false;

    private static _ioHintShown: boolean = false;

    private static _ioHint: Sprite = null;

    private static _ioHintOn: WORKER = null;

    private static _ioHintUntil: int = 0;

    // ---- Inferno-only (QoL #497): worker sacrifices (IoWorkerFun) logged here, the last IO_SAC_LOG in the browser
    // per account; and for the server's few minutes (workers/unsacrifice) Moloch gives the last one back
    public static readonly IO_SAC_LOG: int = 10;

    private static _ioUndo: Sprite = null;

    private static _ioUndoTimer: Timer = null;

    /** Until when (Unix seconds) the last sacrifice can be taken back. */
    private static _ioUndoUntil: number = 0;

    private static _ioUndoBusy: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        WORKERS._workers = [];
        if (GLOBAL.INFERNO_ONLY) {
            // (a new yard: the hand and the hint start again; a sacrifice can still be taken back from the main yard)
            WORKERS.ioSetHand(false);
            WORKERS.ioHintOff();
            WORKERS._ioOverGround = false;
            WORKERS._ioHintShown = false;
            WORKERS.ioUndoBar();
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            WORKERS._sayings = { "assign": [KEYS.Get("ai_worker_comment1"), KEYS.Get("ai_worker_comment2"), KEYS.Get("ai_worker_comment3"), KEYS.Get("ai_worker_comment5"), KEYS.Get("ai_worker_comment6"), KEYS.Get("ai_worker_comment7")], "remove": [KEYS.Get("ai_worker_cancel1"), KEYS.Get("ai_worker_cancel2"), KEYS.Get("ai_worker_cancel3"), KEYS.Get("ai_worker_cancel4")], "doneConstruct": [KEYS.Get("ai_worker_doneconstruct1"), KEYS.Get("ai_worker_doneconstruct2"), KEYS.Get("ai_worker_doneconstruct3"), KEYS.Get("ai_worker_doneconstruct4")], "doneRepair": [KEYS.Get("ai_worker_donerepair1"), KEYS.Get("ai_worker_donerepair2"), KEYS.Get("ai_worker_donerepair3"), KEYS.Get("ai_worker_donerepair4")], "doneUpgrade": [KEYS.Get("ai_worker_doneupgrade1"), KEYS.Get("ai_worker_doneupgrade2"), KEYS.Get("ai_worker_doneupgrade3"), KEYS.Get("ai_worker_doneupgrade4")] };
        } else {
            WORKERS._sayings = { "assign": [KEYS.Get("ui_worker_assign1"), KEYS.Get("ui_worker_assign2"), KEYS.Get("ui_worker_assign3"), KEYS.Get("ui_worker_assign4"), KEYS.Get("ui_worker_assign5"), KEYS.Get("ui_worker_assign6")], "remove": [KEYS.Get("ui_worker_remove1"), KEYS.Get("ui_worker_remove2"), KEYS.Get("ui_worker_remove3"), KEYS.Get("ui_worker_remove4")], "doneConstruct": [KEYS.Get("ui_worker_doneconstruct1"), KEYS.Get("ui_worker_doneconstruct2"), KEYS.Get("ui_worker_doneconstruct3"), KEYS.Get("ui_worker_doneconstruct4"), KEYS.Get("ui_worker_doneconstruct5"), KEYS.Get("ui_worker_doneconstruct6"), KEYS.Get("ui_worker_doneconstruct7"), KEYS.Get("ui_worker_doneconstruct8")], "doneRepair": [KEYS.Get("ui_worker_donerepair1"), KEYS.Get("ui_worker_donerepair2")], "doneUpgrade": [KEYS.Get("ui_worker_doneupgrade1"), KEYS.Get("ui_worker_doneupgrade2"), KEYS.Get("ui_worker_doneupgrade3"), KEYS.Get("ui_worker_doneupgrade4"), KEYS.Get("ui_worker_doneupgrade5")] };
        }
    }

    public static Spawn(): any {
        let _loc2_: Point = null;
        if (TUTORIAL._stage < 10) {
            _loc2_ = new Point(0, 0);
        } else {
            _loc2_ = new Point(GLOBAL._mapWidth / 2 - Math.random() * GLOBAL._mapWidth, GLOBAL._mapHeight / 2 - Math.random() * GLOBAL._mapHeight);
            if (GLOBAL.INFERNO_ONLY) {
                // Inferno-only (10 October): somewhere free in the yard, where it can be seen (the point above is
                // in the yard's own units but was used as the map's: often off the yard, or under a building)
                let ioAt: Point = IoPets.freeSpot();
                if (ioAt) {
                    _loc2_ = GRID.ToISO(ioAt.x, ioAt.y, 0);
                }
            }
        }
        let _loc1_: WORKER = as3.as(MAP._BUILDINGTOPS.addChild(new WORKER(MAP._BUILDINGTOPS, _loc2_, Math.random() * 360)), WORKER);
        WORKERS._workers.push({ "mc": _loc1_, "task": null });
        QUESTS._global.worder_count = WORKERS._workers.length;
        return { "mc": _loc1_ };
    }

    public static Tick(): void {
        let _loc1_: any = null;
        let _loc2_: any = null;
        if (GLOBAL._render) {
            for (_loc1_ in WORKERS._workers) {
                _loc2_ = WORKERS._workers[_loc1_];
                _loc2_.mc.Tick();
            }
            if (GLOBAL.INFERNO_ONLY) {
                WORKERS.ioTick();
            }
        }
    }

    /** QoL #475: each frame: the pointer watched on this yard's ground, the hand kept right, the hint moved along. */
    private static ioTick(): void {
        if (MAP._GROUND !== WORKERS._ioGround) {
            WORKERS.ioWatchGround();
        }
        WORKERS._ioFrame++;
        if (WORKERS._ioOverGround && WORKERS._ioFrame % 6 == 0) {
            // (they walk: one may come under a pointer that isn't moving, or leave it)
            WORKERS.ioCursor();
        }
        WORKERS.ioHintTick();
    }

    private static ioWatchGround(): void {
        if (WORKERS._ioGround) {
            WORKERS._ioGround.removeEventListener(MouseEvent.MOUSE_MOVE, WORKERS.ioOnMove);
            WORKERS._ioGround.removeEventListener(MouseEvent.ROLL_OUT, WORKERS.ioOnOut);
            WORKERS._ioGround.removeEventListener(MouseEvent.MOUSE_DOWN, WORKERS.ioOnDown);
        }
        WORKERS._ioGround = MAP._GROUND;
        WORKERS._ioOverGround = false;
        WORKERS.ioSetHand(false);
        if (WORKERS._ioGround) {
            WORKERS._ioGround.addEventListener(MouseEvent.MOUSE_MOVE, WORKERS.ioOnMove);
            WORKERS._ioGround.addEventListener(MouseEvent.ROLL_OUT, WORKERS.ioOnOut);
            WORKERS._ioGround.addEventListener(MouseEvent.MOUSE_DOWN, WORKERS.ioOnDown);
        }
    }

    private static ioOnMove(e: MouseEvent): void {
        WORKERS._ioOverGround = true;
        WORKERS.ioCursor();
    }

    private static ioOnOut(e: MouseEvent): void {
        WORKERS._ioOverGround = false;
        WORKERS.ioSetHand(false);
    }

    /** A press on a worker: the player has found they can be clicked (the hint stops for good). */
    private static ioOnDown(e: MouseEvent): void {
        let it: any = IoYardPick.under();
        if (it && it.kind == "worker") {
            WORKERS.ioHintOff();
            WORKERS.ioHintCount(WORKERS.IO_HINT_SESSIONS);
        }
    }

    /** The hand while a worker or a pet is under the pointer (IoYardPick: only where a click opens its menu). */
    private static ioCursor(): void {
        WORKERS.ioSetHand(WORKERS._ioOverGround && !MAP._dragging && IoYardPick.under() != null);
    }

    private static ioSetHand(on: boolean): void {
        if (on == WORKERS._ioHand) {
            return;
        }
        WORKERS._ioHand = on;
        Mouse.cursor = on ? MouseCursor.BUTTON : MouseCursor.AUTO;
    }

    private static ioHintKey(): string {
        return "ioYard2ClickMe_" + LOGIN._playerID;
    }

    /** The sessions the hint has been shown in (or, at IO_HINT_SESSIONS, that it's done with). */
    private static ioHintCount(set: int = -1): int {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            if (set >= 0) {
                so.data[WORKERS.ioHintKey()] = set;
                so.flush();
                return set;
            }
            return so.data[WORKERS.ioHintKey()] | 0;
        } catch (e) {
        }
        return WORKERS.IO_HINT_SESSIONS;
    }

    /** "Click me!" over a worker: once a session, in the player's first few, the first time their yard is up. */
    private static ioHintTick(): void {
        if (WORKERS._ioHint) {
            let mc: WORKER = WORKERS._ioHintOn;
            let gone: boolean = !mc || !mc.parent || WORKERS.ioEntry(mc) == null || WORKERS._ioHint.parent !== MAP._PROJECTILES;
            if (gone || getTimer() > WORKERS._ioHintUntil || GLOBAL._newBuilding) {
                WORKERS.ioHintOff();
                return;
            }
            WORKERS._ioHint.x = mc.x;
            WORKERS._ioHint.y = mc.y - 54 - Math.abs(Math.sin(WORKERS._ioFrame / 9)) * 4;
            // (not over what the worker is saying)
            WORKERS._ioHint.visible = !(mc._messageMC && mc._messageMC.visible);
            // (16 October: kept on the screen, a worker at its edge had it cut in half, "Click m")
            WORKERS.ioHintOnScreen();
            return;
        }
        if (WORKERS._ioHintShown || !MAP._PROJECTILES || IoWorkerFun.workers().length == 0) {
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode() || BASE._loading || String(BASE._loadedBaseID) != String(GLOBAL._homeBaseID) || TUTORIAL._stage < 200) {
            return;
        }
        WORKERS._ioHintShown = true;
        if (!WORKERS._ioSessionCounted) {
            WORKERS._ioSessionCounted = true;
            let n: int = WORKERS.ioHintCount();
            if (n < WORKERS.IO_HINT_SESSIONS) {
                WORKERS.ioHintCount((n + 1) | 0);
                WORKERS._ioHintSession = true;
            }
        }
        if (!WORKERS._ioHintSession) {
            return;
        }
        // (once a session)
        WORKERS._ioHintSession = false;
        let on: WORKER = null;
        for (let w of as3.values(WORKERS._workers)) {
            if (w && w.mc && (!on || !w.task)) {
                on = as3.as(w.mc, WORKER);
                if (!w.task) {
                    break;
                }
            }
        }
        if (!on) {
            return;
        }
        let hint: Sprite = new Sprite();
        hint.name = "ioYard2ClickMe";
        hint.mouseEnabled = false;
        hint.mouseChildren = false;
        let t: TextField = new TextField();
        let f: TextFormat = new TextFormat("Verdana", 11, 0xFFF2C4, true);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.selectable = false;
        t.mouseEnabled = false;
        t.text = KEYS.Get("io_yard2_clickme");
        let w2: number = Math.max(60, t.textWidth + 16);
        t.width = w2;
        t.height = 18;
        t.x = -w2 / 2;
        t.y = -16;
        t.filters = [new GlowFilter(0x1A0A00, 1, 3, 3, 6, 1)];
        hint.graphics.lineStyle(1, 0xE0A040, 1);
        hint.graphics.beginFill(0x4A2A08, 0.92);
        hint.graphics.drawRoundRect(-w2 / 2, -18, w2, 20, 10, 10);
        hint.graphics.endFill();
        // (a little point down at the worker)
        hint.graphics.beginFill(0x4A2A08, 0.92);
        hint.graphics.moveTo(-5, 2);
        hint.graphics.lineTo(5, 2);
        hint.graphics.lineTo(0, 8);
        hint.graphics.endFill();
        hint.addChild(t);
        MAP._PROJECTILES.addChild(hint);
        WORKERS._ioHint = hint;
        WORKERS._ioHintOn = on;
        WORKERS._ioHintUntil = (getTimer() + WORKERS.IO_HINT_MS) | 0;
        WORKERS.ioHintTick();
    }

    /** The "Click me!" bubble moved sideways into the screen when the worker stands at its edge. */
    private static ioHintOnScreen(): void {
        let h: Sprite = WORKERS._ioHint;
        if (!h || !h.stage || !GLOBAL._SCREEN) {
            return;
        }
        let b: Rectangle = h.getBounds(h.stage);
        let k: number = b.width / Math.max(1, h.width);
        let left: number = Number(GLOBAL._SCREEN.x) + 4;
        let right: number = Number(GLOBAL._SCREEN.x) + Number(GLOBAL._SCREEN.width) - 4;
        let dx: number = b.x < left ? left - b.x : b.x + b.width > right ? right - (b.x + b.width) : 0;
        if (dx != 0 && k > 0) {
            h.x += dx / k;
        }
    }

    private static ioHintOff(): void {
        if (WORKERS._ioHint && WORKERS._ioHint.parent) {
            WORKERS._ioHint.parent.removeChild(WORKERS._ioHint);
        }
        WORKERS._ioHint = null;
        WORKERS._ioHintOn = null;
    }

    private static ioEntry(mc: any): any {
        for (let w of as3.values(WORKERS._workers || [])) {
            if (w && w.mc == mc) {
                return w;
            }
        }
        return null;
    }

    // ---- QoL #497: sacrifices
    private static ioSacKey(): string {
        return "ioYard2Sacrifices_" + LOGIN._playerID;
    }

    /** The last sacrifices, newest first: [{at (Unix seconds), shiny, left (workers after), back (taken back)}]. */
    public static ioSacrificeLog(): any[] {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let kept: any = so.data[WORKERS.ioSacKey()];
            if (as3.is(kept, Array)) {
                return (as3.as(kept, Array)).slice(0, WORKERS.IO_SAC_LOG);
            }
        } catch (e) {
        }
        return [];
    }

    private static ioSacSave(list: any[]): void {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            so.data[WORKERS.ioSacKey()] = list.slice(0, WORKERS.IO_SAC_LOG);
            so.flush();
        } catch (e) {
        }
    }

    /** "Sacrificed 3 workers (2 taken back); the last on Tuesday 14:02." for the worker's menu, or "". */
    public static ioSacrificeLine(): string {
        let list: any[] = WORKERS.ioSacrificeLog();
        if (!list.length) {
            return "";
        }
        let back: int = 0;
        for (let e of as3.values(list)) {
            if (e && e.back) {
                back++;
            }
        }
        // (16 October: the game's one way to say when, "15 Oct 2026, 14:32"; the browser's said "Monday, 12:00 AM")
        let at: string = IoFormat.dateTime(Number(list[0].at));
        return KEYS.Get(back > 0 ? "io_yard2_sac_log_back" : "io_yard2_sac_log", { "v1": list.length, "v2": back, "v3": at });
    }

    /**
     * IoWorkerFun (one line there): the server took the worker. It is logged, and when the server says it can
     * be taken back for a while (its answer's `undo`, seconds), a bar under the top bar offers to, with the time left.
     */
    public static ioSacrificed(response: any): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        let list: any[] = WORKERS.ioSacrificeLog();
        list.unshift({ "at": GLOBAL.Timestamp(), "shiny": IoWorkerFun.shiny, "left": WORKERS._workers ? WORKERS._workers.length : 0, "back": false });
        WORKERS.ioSacSave(list);
        let undo: int = response && response.undo != null ? response.undo | 0 : 0;
        WORKERS._ioUndoUntil = undo > 0 ? GLOBAL.Timestamp() + undo : 0;
        WORKERS.ioUndoBar();
    }

    /** The bar while the last sacrifice can still be taken back (the player's own main yard, built), else none. */
    private static ioUndoBar(e: TimerEvent = null): void {
        let left: number = WORKERS._ioUndoUntil - GLOBAL.Timestamp();
        let here: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && !BASE.isOutpost && !GLOBAL.ioDesignMode() && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
        if (left <= 0) {
            WORKERS._ioUndoUntil = 0;
        }
        if (left <= 0 || !here || !GLOBAL._layerTop) {
            if (WORKERS._ioUndo && WORKERS._ioUndo.parent) {
                WORKERS._ioUndo.parent.removeChild(WORKERS._ioUndo);
            }
            WORKERS._ioUndo = null;
            if (left <= 0 && WORKERS._ioUndoTimer) {
                WORKERS._ioUndoTimer.stop();
            }
            return;
        }
        if (!WORKERS._ioUndoTimer) {
            WORKERS._ioUndoTimer = new Timer(1000);
            WORKERS._ioUndoTimer.addEventListener(TimerEvent.TIMER, WORKERS.ioUndoBar);
        }
        if (!WORKERS._ioUndoTimer.running) {
            WORKERS._ioUndoTimer.start();
        }
        let bar: Sprite = WORKERS._ioUndo;
        if (!bar) {
            bar = new Sprite();
            bar.name = "ioYard2UndoSacrifice";
            let label: TextField = new TextField();
            label.name = "ioYard2UndoText";
            label.defaultTextFormat = new TextFormat("Verdana", 12, 0xFFF4E0, true);
            label.selectable = false;
            label.mouseEnabled = false;
            label.width = 330;
            label.height = 20;
            label.x = 14;
            label.y = 8;
            bar.addChild(label);
            let b: any = IoMapUi.button(KEYS.Get("io_yard2_sac_undo_btn"), 130, 24, (ev: any): void => {
                WORKERS.ioUndo();
            }, "gold", 11);
            b.name = "ioYard2UndoButton";
            b.x = 350;
            b.y = 5;
            bar.addChild(b);
            bar.graphics.lineStyle(1, 0xFFB35A, 0.9);
            bar.graphics.beginFill(0x2A0E04, 0.92);
            bar.graphics.drawRoundRect(0, 0, 490, 34, 14);
            bar.graphics.endFill();
            bar.filters = [new GlowFilter(0, 0.6, 8, 8, 2)];
            WORKERS._ioUndo = bar;
        }
        let text: TextField = as3.as(bar.getChildByName("ioYard2UndoText"), TextField);
        if (text) {
            text.text = KEYS.Get("io_yard2_sac_undo", { "v1": GLOBAL.ioDuration(left) });
        }
        // (under the line a toast shows: IoToast)
        bar.x = Math.round(GLOBAL._SCREENCENTER.x - 245);
        bar.y = Math.round(GLOBAL._SCREEN.y + 152);
        if (bar.parent != GLOBAL._layerTop) {
            GLOBAL._layerTop.addChild(bar);
        }
    }

    /** "Take it back": the server gives the worker back (and takes its Shiny back); the worker comes back to the yard. */
    private static ioUndo(): void {
        if (WORKERS._ioUndoBusy || WORKERS._ioUndoUntil <= GLOBAL.Timestamp()) {
            return;
        }
        WORKERS._ioUndoBusy = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "workers/unsacrifice", [["v", "1"]], (response: any): void => {
            WORKERS._ioUndoBusy = false;
            if (!response || response.error !== 0 && response.error !== "0") {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_yard2_sac_noanswer"));
                return;
            }
            WORKERS._ioUndoUntil = 0;
            WORKERS.ioUndoBar();
            let list: any[] = WORKERS.ioSacrificeLog();
            if (list.length && list[0]) {
                list[0].back = true;
                WORKERS.ioSacSave(list);
            }
            if (response.credits != null) {
                CASINO.setCredits(response.credits | 0);
            }
            if (STORE._storeData) {
                if (!STORE._storeData.BEW) {
                    STORE._storeData.BEW = { "q": 0 };
                }
                STORE._storeData.BEW.q = response.extra != null ? response.extra | 0 : (STORE._storeData.BEW.q | 0) + 1;
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && !BASE.isOutpost) {
                QUEUE.Spawn(1);
                try {
                    UI_WORKERS.ioRefresh();
                } catch (e) {
                }
                let w: any = WORKERS._workers.length ? WORKERS._workers[WORKERS._workers.length - 1] : null;
                if (w && w.mc) {
                    WORKERS.Say(KEYS.Get("io_yard2_sac_back"), as3.cast(w.mc, MovieClip), 3500);
                }
            }
            BASE.Save();
        }, (e: IOErrorEvent): void => {
            WORKERS._ioUndoBusy = false;
            GLOBAL.Message(KEYS.Get("io_yard2_sac_noanswer"));
        });
    }

    public static Assign(param1: BFOUNDATION): any {
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc2_: int = 3000;
        let _loc3_: any = null;
        for (_loc4_ in WORKERS._workers) {
            if (!(_loc5_ = WORKERS._workers[_loc4_]).task) {
                if ((_loc6_ = Point.distance(new Point(_loc5_.mc.x, _loc5_.mc.y), new Point(param1._mc.x, param1._mc.y)) | 0) < _loc2_) {
                    _loc2_ = _loc6_;
                    _loc3_ = _loc5_;
                }
            }
        }
        if (_loc3_) {
            _loc3_.task = param1;
            _loc3_.mc.Target(new Point(param1._mc.x, param1._mc.y + param1._mcFootprint.height / 2), param1);
            _loc3_.mc._targetTask = param1;
            _loc7_ = "";
            if (!GLOBAL._catchup) {
                _loc7_ = String(WORKERS._sayings.assign[(Math.random() * WORKERS._sayings.assign.length) | 0]);
                WORKERS.Say(_loc7_, as3.cast(_loc3_.mc, MovieClip));
            } else {
                _loc3_.mc.x = param1._mc.x;
                _loc3_.mc.y = param1._mc.y;
                if (GLOBAL.INFERNO_ONLY && param1._footprint && param1._footprint[0]) {
                    // Inferno-only: at the building's front, where it is seen (its own point is its back corner,
                    // under the building's picture)
                    _loc3_.mc.x = param1._mc.x + Number(param1._footprint[0].width) * 0.5 + 8;
                    _loc3_.mc.y = param1._mc.y + Number(param1._footprint[0].width) * 0.75 + 8;
                }
                _loc3_.mc._targetPosition = new Point(param1._mc.x, param1._mc.y + param1._mcFootprint.height / 2 - 5);
                _loc3_.mc._waypoints = [new Point(param1._mc.x, param1._mc.y + param1._mcFootprint.height / 2 - 5)];
                param1._hasWorker = true;
            }
            return { "mc": _loc3_.mc, "say": _loc7_ };
        }
        return null;
    }

    public static Remove(param1: BFOUNDATION, param2: boolean = true, param3: string = "Construct"): MovieClip {
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: any[] = null;
        let _loc7_: Point = null;
        for (_loc4_ in WORKERS._workers) {
            if ((_loc5_ = WORKERS._workers[_loc4_]).task == param1) {
                _loc5_.task = null;
                _loc5_.mc._targetTask = null;
                param1._hasWorker = false;
                if (GLOBAL._render) {
                    _loc5_.mc.Wander();
                    if (param2) {
                        _loc6_ = as3.cast(WORKERS._sayings["done" + param3], Array);
                        WORKERS.Say(as3.str(_loc6_[(Math.random() * _loc6_.length) | 0]), as3.cast(_loc5_.mc, MovieClip));
                    } else {
                        WORKERS.Say(as3.str(WORKERS._sayings.remove[(Math.random() * WORKERS._sayings.remove.length) | 0]), as3.cast(_loc5_.mc, MovieClip));
                    }
                } else {
                    _loc7_ = new Point(param1._mc.x + 20, param1._mc.y + 80);
                    _loc5_.mc._targetPosition = _loc7_;
                    _loc5_.mc._waypoints = [];
                    _loc5_.mc.x = _loc7_.x;
                    _loc5_.mc.y = _loc7_.y;
                }
                return as3.cast(_loc5_.mc, MovieClip);
            }
        }
        return null;
    }

    public static Say(param1: string, param2: MovieClip = null, param3: int = 2000): void {
        if (!param2) {
            param2 = as3.cast(WORKERS._workers[0].mc, MovieClip);
            param2.Target(new Point(param2.x + 20, param2.y + 150));
            param2.Move();
            param2.Update();
        }
        param2.Say(param1, param3);
    }
}
