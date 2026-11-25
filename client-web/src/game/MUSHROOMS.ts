import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Rectangle } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Timer, getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, GLOBAL, GRID, InstanceManager, IoHfo, IoHfoIce, IoQuests, KEYS, LOGGER, POPUPS, QUESTS, QUEUE, Rndm, SOUNDS, TUTORIAL, UI_WORKERS, WORKERS, popup_mushroomshiny, IoFormat } from "@game";

export class MUSHROOMS extends ASObject {
    public static _mushroom: BFOUNDATION = null;

    public static _mushroomID: int = 0;

    // ---- Inferno-only: the Wart Bloom (server: services/events/wartBloom.ts). Every weekend, Friday 6 pm to
    // Sunday midnight Central, warts grow 3 times as fast in the main yard: each second in a bloom counts 3
    // times towards the next wart (one per WART_SECONDS, at most 10 in the yard), offline time too. In a
    // bloom they also grow while the yard is open (ioTick), not only when it loads.
    /** One wart per this many seconds of growth (the stock rate: 4.8 hours). */
    public static readonly WART_SECONDS: int = 17280;

    /** At most this many warts in a yard. */
    public static readonly WART_MAX: int = 10;

    private static _ioTimer: Timer = null;

    public $ctor(): void {
        super.$ctor();
    }

    /** The flag io_wartbloom: {rate, w: [[start, end], ...]} (Unix seconds), or null. */
    private static ioBloom(): any {
        let raw: any = GLOBAL._flags ? GLOBAL._flags.io_wartbloom : null;
        if (!raw) {
            return null;
        }
        try {
            let bloom: any = as3.is(raw, String) ? JSON.parse(String(raw)) : raw;
            return bloom && as3.is(bloom.w, Array) ? bloom : null;
        } catch (e) {
        }
        return null;
    }

    /** The bloom on at a moment (Unix seconds): [start, end], or null. */
    public static ioBloomAt(time: number): any[] {
        let bloom: any = MUSHROOMS.ioBloom();
        if (!bloom) {
            return null;
        }
        for (let w of as3.values(bloom.w)) {
            if (w && w.length >= 2 && Number(w[0]) <= time && time < Number(w[1])) {
                return w;
            }
        }
        return null;
    }

    /** Seconds of wart growth from one moment to another: the bloom's seconds count `rate` times. */
    public static ioGrowth(from: number, to: number): number {
        if (to <= from) {
            return 0;
        }
        let growth: number = to - from;
        let bloom: any = MUSHROOMS.ioBloom();
        if (bloom) {
            let extra: number = Math.max(1, Number(Number(bloom.rate) || 1)) - 1;
            for (let w of as3.values(bloom.w)) {
                if (w && w.length >= 2) {
                    let overlap: number = Math.min(to, Number(w[1])) - Math.max(from, Number(w[0]));
                    if (overlap > 0) {
                        growth += overlap * extra;
                    }
                }
            }
        }
        return growth;
    }

    private static ioStartTicking(): void {
        if (!MUSHROOMS._ioTimer) {
            MUSHROOMS._ioTimer = new Timer(30000);
            MUSHROOMS._ioTimer.addEventListener(TimerEvent.TIMER, MUSHROOMS.ioTick);
            MUSHROOMS._ioTimer.start();
        }
        MUSHROOMS.ioChip();
    }

    /** QoL #565: the chip under the top bar while a bloom is on. */
    private static _ioChip: Sprite = null;

    /**
     * Inferno-only (QoL #565): while a Wart Bloom is on, in the main yard, "Wart Bloom ×3 · 1d 4h" under the top
     * bar (under Hell Freezes Over's line when that shows); a click says when it ends, in the player's own time.
     * (Before, a line in Global chat said "until Sunday midnight (Central time)", which runs into Monday in Europe.)
     */
    public static ioChip(): void {
        if (MUSHROOMS._ioChip && MUSHROOMS._ioChip.parent) {
            MUSHROOMS._ioChip.parent.removeChild(MUSHROOMS._ioChip);
        }
        MUSHROOMS._ioChip = null;
        let now: number = GLOBAL.Timestamp();
        let on: any[] = GLOBAL.INFERNO_ONLY ? MUSHROOMS.ioBloomAt(now) : null;
        if (!on || !BASE.isMainYard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode() || BASE.ioAttackRunning()) {
            return;
        }
        let bloom: any = MUSHROOMS.ioBloom();
        let rate: int = Math.max(1, Number(bloom && bloom.rate) || 3) | 0;
        let end: number = Number(on[1]);
        let chip: Sprite = new Sprite();
        chip.name = "ioBloomChip";
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        let f: TextFormat = new TextFormat("Verdana", 12, 0xFFF2C4, true);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.text = KEYS.Get("io_bloom_chip", { "v1": rate, "v2": GLOBAL.ioDuration(end - now) });
        // (QoL #606: how many warts, and when the yard is full, that it is: a full yard wastes the bloom's growth)
        let warts: int = MUSHROOMS.ioWartCount();
        t.text += "  \u00B7  " + KEYS.Get(warts >= MUSHROOMS.WART_MAX ? "io_bloom_full" : "io_bloom_warts", { "v1": warts, "v2": Math.max(warts, MUSHROOMS.WART_MAX) });
        if (warts >= MUSHROOMS.WART_MAX) {
            t.textColor = 0xFFB070;
        }
        let w: number = Math.max(150, t.textWidth + 30);
        t.width = w - 10;
        t.height = 20;
        t.x = -t.width / 2;
        t.y = 3;
        t.filters = [new GlowFilter(0x3A1A00, 1, 3, 3, 6, 1)];
        chip.graphics.lineStyle(2, 0xE0A040, 1);
        chip.graphics.beginFill(0x4A2A08, 0.9);
        chip.graphics.drawRoundRect(-w / 2, 0, w, 24, 12, 12);
        chip.graphics.endFill();
        chip.addChild(t);
        chip.buttonMode = true;
        chip.mouseChildren = false;
        chip.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            // (16 October: "Monday 00:00", the game's clock as the events calendar has it; the browser's said "12:00 AM")
            let d: Date = new Date(end * 1000);
            let at: string = IoFormat.weekdayName(d.getDay()) + " " + IoFormat.time(end);
            GLOBAL.Message(KEYS.Get("io_bloom_about", { "v1": rate, "v2": at, "v3": GLOBAL.ioDuration(end - GLOBAL.Timestamp()) }));
        });
        GLOBAL.RefreshScreen();
        let hfo: any = GLOBAL._layerUI.getChildByName("ioHfoHud");
        chip.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width / 2;
        chip.y = GLOBAL._SCREEN.y + (hfo ? 120 : 84);
        GLOBAL._layerUI.addChild(chip);
        MUSHROOMS._ioChip = chip;
    }

    /** The warts in the yard now. */
    public static ioWartCount(): int {
        let n: int = 0;
        for (let b of (InstanceManager.getInstancesByClass(BMUSHROOM) ?? [])) {
            if (!(b instanceof IoHfoIce)) {
                n++;
            }
        }
        return n;
    }

    /** In a bloom, warts grow while the main yard is open too (every half minute: one when one is due). */
    private static ioTick(e: TimerEvent = null): void {
        let now: number = GLOBAL.Timestamp();
        MUSHROOMS.ioChip();
        if (!GLOBAL.INFERNO_ONLY || !MUSHROOMS.ioBloomAt(now) || !GLOBAL._flags || !GLOBAL._flags.mushrooms) {
            return;
        }
        if (!BASE.isMainYard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode() || BASE._loading || BASE.ioAttackRunning()) {
            return;
        }
        if (MUSHROOMS.ioGrowth(BASE._lastSpawnedMushroom, now) < MUSHROOMS.WART_SECONDS) {
            return;
        }
        if (MUSHROOMS.ioWartCount() >= MUSHROOMS.WART_MAX) {
            BASE._lastSpawnedMushroom = now | 0;
            // (as at a load with the yard full: growth starts again)
            return;
        }
        MUSHROOMS.Spawn(1);
        BASE.Save();
    }

    public static Setup(): void {
        let mushroomCount: int = 0;
        let count: int = 0;
        let t: int = 0;
        let num: number = NaN;
        let twist: int = 0;
        let i: int = 0;
        let dist: int = 0;
        let angle: int = 0;
        let spawn: int = 0;
        let X: number = NaN;
        let Y: number = NaN;
        let a: int = 0;
        let b: int = 0;
        let s: int = 0;
        let n: int = 0;
        let X2: number = NaN;
        let Y2: number = NaN;
        let shroom: any = null;
        let replace: boolean = false;
        let spawnCount: int = 0;
        // (QoL #25, #589: a run of "Pick all warts" or "Break all ice" belongs to the yard it was started in)
        MUSHROOMS._ioAll = null;
        MUSHROOMS._ioIce = null;
        if (!GLOBAL._flags.mushrooms && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        if (!BASE.isMainYard) {
            return;
        }
        // Inferno-only: new warts grow only in your own yard. A wild monster yard is loaded as a main yard
        // with no warts on record, so every visit or attack sprouted a fresh random patch on it (and they
        // block paths); another player's yard shows the warts it has.
        if (GLOBAL.INFERNO_ONLY && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            MUSHROOMS.ioPlaceRecorded();
            return;
        }
        // Inferno-only: a Designer draft (a tribe's, Moloch's or a kit's layout) grows none: they got in the
        // way of placing buildings there.
        if (GLOBAL.ioDesignMode()) {
            return;
        }
        mushroomCount = 0;
        try {
            if (BASE._lastSpawnedMushroom == 0) {
                BASE._mushroomList = [];
                count = 0;
                t = getTimer();
                num = Math.random();
                twist = (Math.random() * 360) | 0;
                i = 1;
                while (i < 6) {
                    dist = (i * 100 + 300) | 0;
                    angle = (i * 60 + twist) | 0;
                    spawn = 4;
                    X = Math.sin(angle * 0.0174532925) * dist;
                    Y = Math.cos(angle * 0.0174532925) * dist;
                    a = (100 + Math.random() * 80) | 0;
                    b = (100 + Math.random() * 80) | 0;
                    s = 0;
                    while (s < spawn) {
                        n = (((Math.random() * (GLOBAL.INFERNO_ONLY ? 6 : 5)) | 0) + 1) | 0;
                        X2 = X + Math.sin(((Math.random() * 360) | 0) * 0.0174532925) * a;
                        Y2 = Y + Math.cos(((Math.random() * 360) | 0) * 0.0174532925) * b;
                        X2 = ((X2 / 10) | 0) * 10;
                        Y2 = ((Y2 / 10) | 0) * 10;
                        MUSHROOMS._mushroom = BASE.addBuildingC(7);
                        MUSHROOMS._mushroom.Setup({ "X": X2, "Y": Y2, "id": mushroomCount, "t": 7, "frame": n });
                        mushroomCount++;
                        s++;
                    }
                    i++;
                }
                BASE._lastSpawnedMushroom = GLOBAL.Timestamp();
            } else {
                i = 0;
                while (i < Math.min(BASE._mushroomList.length, 20)) {
                    shroom = { "frame": BASE._mushroomList[i][0], "X": BASE._mushroomList[i][1], "Y": BASE._mushroomList[i][2], "id": mushroomCount, "t": 7 };
                    replace = false;
                    if (shroom.X > GLOBAL._mapWidth * 0.5) {
                        replace = true;
                    } else if (shroom.X < 0 - GLOBAL._mapWidth * 0.5) {
                        replace = true;
                    } else if (shroom.Y > GLOBAL._mapHeight * 0.5) {
                        replace = true;
                    } else if (shroom.Y < 0 - GLOBAL._mapHeight * 0.5) {
                        replace = true;
                    }
                    if (!replace) {
                        MUSHROOMS._mushroom = BASE.addBuildingC(7);
                        MUSHROOMS._mushroom.Setup(shroom);
                    } else {
                        MUSHROOMS.Spawn(1);
                    }
                    mushroomCount++;
                    i++;
                }
                if (BASE._mushroomList.length > 20) {
                    i = (BASE._mushroomList.length - 1) | 0;
                    while (i > 19) {
                        delete BASE._mushroomList[i];
                        i--;
                    }
                }
            }
        } catch (e) {
            LOGGER.Log("err", "MUSHROOMS.SetupA: " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("");
        }
        try {
            spawnCount = (Math.floor(GLOBAL.Timestamp() - BASE._lastSpawnedMushroom) / 17280) | 0;
            if (GLOBAL.INFERNO_ONLY) {
                // the Wart Bloom's hours count 3 times (offline too)
                spawnCount = (MUSHROOMS.ioGrowth(BASE._lastSpawnedMushroom, GLOBAL.Timestamp()) / MUSHROOMS.WART_SECONDS) | 0;
                MUSHROOMS.ioStartTicking();
            }
            if (spawnCount > 0) {
                BASE._lastSpawnedMushroom = GLOBAL.Timestamp();
                if (spawnCount > 10) {
                    spawnCount = 10;
                }
                if (mushroomCount + spawnCount > 10) {
                    spawnCount = (10 - mushroomCount) | 0;
                }
                if (spawnCount > 0) {
                    MUSHROOMS.Spawn(spawnCount);
                }
            }
        } catch (e) {
            LOGGER.Log("err", "MUSHROOMS.SetupB: " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("");
        }
    }

    /* Inferno-only: the yard's recorded warts, put where they were, none added (see Setup). */
    private static ioPlaceRecorded(): void {
        let list: any[] = as3.as(BASE._mushroomList, Array);
        let i: int = 0;
        let e: any[] = null;
        let wart: BFOUNDATION = null;
        if (!list) {
            return;
        }
        while (i < Math.min(list.length, 20)) {
            e = as3.as(list[i], Array);
            if (e) {
                wart = BASE.addBuildingC(7);
                wart.Setup({ "frame": e[0], "X": e[1], "Y": e[2], "id": i, "t": 7 });
            }
            i++;
        }
    }

    public static Spawn(param1: int): void {
        let _loc2_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: boolean = false;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        if (!GLOBAL._flags.mushrooms && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        if (!BASE.isMainYard || GLOBAL.INFERNO_ONLY && (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode())) {
            return;
        }
        BASE._lastSpawnedMushroom = GLOBAL.Timestamp();
        LOGGER.Stat([35, param1]);
        let _loc3_: int = 0;
        while (_loc3_ < param1) {
            _loc4_ = (((Math.random() * (GLOBAL.INFERNO_ONLY ? 6 : 5)) | 0) + 1) | 0;
            _loc5_ = false;
            _loc6_ = 0;
            _loc7_ = 0;
            _loc8_ = 0;
            while (!_loc5_ && _loc8_ < 5000) {
                _loc8_++;
                _loc6_ = (200 + GLOBAL._mapWidth * 0.5 - Math.random() * (GLOBAL._mapWidth + 400)) | 0;
                _loc7_ = (200 + GLOBAL._mapHeight * 0.5 - Math.random() * (GLOBAL._mapHeight + 400)) | 0;
                if (_loc6_ > GLOBAL._mapWidth * 0.5 || _loc6_ < 0 - GLOBAL._mapWidth * 0.5 || _loc7_ > GLOBAL._mapHeight * 0.5 || _loc7_ < 0 - GLOBAL._mapHeight * 0.5) {
                    _loc5_ = true;
                }
                if (!_loc5_ && !GRID.FootprintBlocked([new Rectangle(0, 0, 30, 30)], GRID.ToISO(_loc6_, _loc7_, 0), true)) {
                    _loc5_ = true;
                }
            }
            if (_loc5_) {
                MUSHROOMS._mushroom = BASE.addBuildingC(7);
                ++BASE._buildingCount;
                MUSHROOMS._mushroom.Setup({ "X": _loc6_, "Y": _loc7_, "id": BASE._buildingCount, "t": 7, "frame": _loc4_ });
            }
            _loc3_++;
        }
    }

    public static PickWorker(param1: BFOUNDATION): void {
        // Hell Freezes Over: its ice has workers of its own (IoHfo)
        if (param1 instanceof IoHfoIce) {
            IoHfo.sendWorker(as3.cast(param1, IoHfoIce));
            return;
        }
        if (!param1._picking) {
            if (QUEUE.Add("mushroom" + param1._id, param1)) {
                param1._mc.alpha = 0.5;
                param1._picking = true;
            } else {
                POPUPS.DisplayWorker(2, param1);
            }
        }
    }

    /**
     * Resolves a mushroom pick, awarding shiny if the mushroom is golden.
     *
     * @param mushroom The mushroom being picked.
     * @return True once the pick has been resolved, false if a purchase is already in flight.
     */
    public static Pick(mushroom: BFOUNDATION): boolean {
        if (BASE._pendingPurchase.length > 0) {
            return false;
        }

        let mushroomId: int = mushroom._id;
        let workerMessage: string = "";
        let shinyAwarded: int = 0;

        let positionRng: Rndm = new Rndm(((mushroom.x * mushroom.y) | 0) >>> 0);
        let isGolden: boolean = ((positionRng.random() * 4) | 0) == 0;

        ++QUESTS._global.mushroomspicked;
        if (GLOBAL.INFERNO_ONLY) {
            IoQuests.event("wart_pick");
        }

        if (isGolden) {
            ++QUESTS._global.goldmushroomspicked;
            GLOBAL.ValidateMushroomPick(mushroom);
        }

        mushroom.RecycleC();

        // (QoL #25: one of a "Pick all warts" run: its golden finds are added up for one summary at the end)
        let ioRun: any = GLOBAL.INFERNO_ONLY && MUSHROOMS._ioAll && MUSHROOMS._ioAll.sent[mushroomId] ? MUSHROOMS._ioAll : null;
        if (ioRun) {
            delete ioRun.sent[mushroomId];
            ioRun.picked = (ioRun.picked | 0) + 1;
        }

        if (isGolden) {
            let mushroomVariant: int = (Math.random() * 3 + 1) | 0;

            if (mushroomVariant == 3) {
                mushroomVariant = 1;
            }

            shinyAwarded = mushroomVariant == 2 ? 8 : 3;
            workerMessage = KEYS.Get("pop_mushroom_msg1", { "v1": shinyAwarded });

            BASE.Purchase("MUSHROOM" + mushroomVariant, 1, "MUSHROOMS");

            if (ioRun) {
                ioRun.golden = (ioRun.golden | 0) + 1;
                ioRun.shiny = (ioRun.shiny | 0) + shinyAwarded;
                SOUNDS.Play("splat1", 0.35);
            } else {
                let shinyPopup: popup_mushroomshiny = new popup_mushroomshiny();
                shinyPopup.tTitle.htmlText = "<b>" + KEYS.Get("pop_goldenmushroom_title") + "</b>";
                shinyPopup.tMessage.htmlText = KEYS.Get(GLOBAL.INFERNO_ONLY ? "pop_goldenwart_desc" : "pop_goldenmushroom_desc", { "v1": shinyAwarded });

                POPUPS.Push(shinyPopup, null, null, "chaching", GLOBAL.INFERNO_ONLY ? "goldwart.png" : "goldmushroom.png");
            }
        } else {
            // Inferno-only: the warts have their own lines (pop_wart_msg2-4).
            let flavourKeys: any[] = GLOBAL.INFERNO_ONLY ? ["pop_wart_msg2", "pop_wart_msg3", "pop_wart_msg4"] : ["pop_mushroom_msg2", "pop_mushroom_msg3", "pop_mushroom_msg4"];
            workerMessage = KEYS.Get(as3.str(flavourKeys[(Math.random() * flavourKeys.length) | 0]));
            // (QoL #629: an ordinary pick makes a sound too; a golden one already plays cha-ching)
            if (GLOBAL.INFERNO_ONLY) {
                SOUNDS.Play("splat1", 0.35);
            }
            BASE.Save();
        }

        LOGGER.Stat([34, shinyAwarded]);
        QUESTS.Check();
        let worker: MovieClip = QUEUE.Remove("mushroom" + mushroomId, true);
        WORKERS.Say(workerMessage, worker, 3000);
        if (ioRun && ioRun === MUSHROOMS._ioAll) {
            // (the worker, free again, goes on to the next wart of the run)
            if (worker) {
                ioRun.last = worker;
            }
            MUSHROOMS.ioPickNext();
        }
        return true;
    }

    // ---- Inferno-only (QoL #25): "Pick all warts" (its button: the workers' column, UI_WORKERS.ioYardButtons)
    /**
     * The run it started: {sent: {wart id: wart} with a worker on it, todo: [warts still waiting for one],
     * picked, golden, shiny (golden finds added up), last: the worker who picked the last one}, or null.
     */
    private static _ioAll: any = null;

    /** QoL #589: the run "Break all ice" started: {todo: [ice still waiting for a worker], sent: [ice with one]}, or null. */
    private static _ioIce: any = null;

    /** (no run is sent on while one is being sent: QUEUE.Add ticks the queue, and the queue's tick sends runs on) */
    private static _ioSending: boolean = false;

    /** Can workers be sent to the yard's warts from here: the player's own main yard, built, nothing else going on. */
    public static ioCanPickHere(): boolean {
        return GLOBAL.INFERNO_ONLY && BASE.isMainYard && !BASE.isOutpost && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.ioDesignMode() && !BASE.ioAttackRunning() && !BASE._loading && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID) && TUTORIAL._stage >= 200;
    }

    /** The yard's warts and the event's ice now (a copy). */
    private static ioYardShrooms(): any[] {
        let out: any[] = [];
        for (let b of (InstanceManager.getInstancesByClass(BMUSHROOM) ?? [])) {
            out.push(b);
        }
        return out;
    }

    /** The warts no worker is on yet (never the event's ice). */
    public static ioPickable(): any[] {
        let out: any[] = [];
        for (let b of as3.values(MUSHROOMS.ioYardShrooms())) {
            if (!(b instanceof IoHfoIce) && !b._picking && b._mc) {
                out.push(b);
            }
        }
        return out;
    }

    /** The warts the button would send workers to: those no worker is on and the run isn't waiting to do already. */
    public static ioWartsLeft(): int {
        let n: int = 0;
        let todo: any[] = MUSHROOMS._ioAll ? as3.cast(MUSHROOMS._ioAll.todo, Array) : [];
        for (let b of as3.values(MUSHROOMS.ioPickable())) {
            if (todo.indexOf(b) < 0) {
                n++;
            }
        }
        return n;
    }

    /** A worker with no job, or null. */
    public static ioIdleWorker(): any {
        for (let w of as3.values(WORKERS._workers || [])) {
            if (w && w.mc && !w.task) {
                return w;
            }
        }
        return null;
    }

    /** Is a worker on this job (QUEUE.Add said yes, but found no worker near enough, as can happen in test mode)? */
    private static ioHasWorker(b: BFOUNDATION): boolean {
        for (let w of as3.values(WORKERS._workers || [])) {
            if (w && w.task === b) {
                return true;
            }
        }
        return false;
    }

    /** "Pick all warts": idle workers to every wart in the yard, one after another; golden finds told once at the end. */
    public static ioPickAll(): void {
        if (!MUSHROOMS.ioCanPickHere()) {
            return;
        }
        let warts: any[] = MUSHROOMS.ioPickable();
        if (!warts.length) {
            return;
        }
        if (!MUSHROOMS.ioIdleWorker()) {
            GLOBAL.Message(QUEUE.ioBusyText());
            return;
        }
        let run: any = MUSHROOMS._ioAll;
        if (!run) {
            run = MUSHROOMS._ioAll = { "sent": {}, "todo": [], "picked": 0, "golden": 0, "shiny": 0, "last": null };
        }
        for (let w of as3.values(warts)) {
            if (run.todo.indexOf(w) < 0) {
                run.todo.push(w);
            }
        }
        SOUNDS.Play("click1");
        MUSHROOMS.ioPickNext();
        UI_WORKERS.ioYardButtons();
    }

    /**
     * The run's next warts, one to each idle worker. It goes on only while a worker of its own is still at it
     * (the workers it took carry on from wart to wart): once none is, it ends, and the summary is told.
     */
    public static ioPickNext(): void {
        let run: any = MUSHROOMS._ioAll;
        if (!run || MUSHROOMS._ioSending) {
            return;
        }
        MUSHROOMS._ioSending = true;
        try {
            let here: any[] = MUSHROOMS.ioYardShrooms();
            for (let id in run.sent) {
                if (here.indexOf(run.sent[id]) < 0) {
                    delete run.sent[id];
                }
            }
            while (run.todo.length > 0 && MUSHROOMS.ioCanPickHere()) {
                let w: BFOUNDATION = as3.as(run.todo[0], BFOUNDATION);
                if (!w || here.indexOf(w) < 0 || w._picking) {
                    run.todo.shift();
                    continue;
                }
                if (!MUSHROOMS.ioIdleWorker()) {
                    break;
                }
                if (!QUEUE.Add("mushroom" + w._id, w)) {
                    break;
                }
                if (!MUSHROOMS.ioHasWorker(w)) {
                    QUEUE.Remove("mushroom" + w._id, false);
                    break;
                }
                w._mc.alpha = 0.5;
                w._picking = true;
                run.sent[w._id] = w;
                run.todo.shift();
            }
            let busy: boolean = false;
            for (let id in run.sent) {
                busy = true;
                break;
            }
            if (!busy) {
                MUSHROOMS.ioPickDone();
            }
        } finally {
            MUSHROOMS._ioSending = false;
        }
    }

    /** The run is over: one summary (a popup when golden ones were found, else the last worker says so). */
    private static ioPickDone(): void {
        let run: any = MUSHROOMS._ioAll;
        MUSHROOMS._ioAll = null;
        if (!run || (run.picked | 0) <= 0) {
            return;
        }
        if ((run.golden | 0) > 0) {
            let p: popup_mushroomshiny = new popup_mushroomshiny();
            p.name = "ioYard2WartSummary";
            p.tTitle.htmlText = "<b>" + KEYS.Get("pop_goldenmushroom_title") + "</b>";
            p.tMessage.htmlText = KEYS.Get((run.golden | 0) == 1 ? "io_yard2_warts_golden1" : "io_yard2_warts_golden", { "v1": run.picked | 0, "v2": run.golden | 0, "v3": run.shiny | 0 });
            POPUPS.Push(p, null, null, "chaching", "goldwart.png");
        } else if (run.last && (run.picked | 0) > 1) {
            WORKERS.Say(KEYS.Get("io_yard2_warts_none", { "v1": run.picked | 0 }), as3.cast(run.last, MovieClip), 3500);
        }
    }

    // ---- Inferno-only (QoL #589): "Break all ice" while the event's Days 1-3 ice is in the yard (IoHfo sends each worker)
    /** The event's Days 1 to 3, in the player's own yard (before the curse breaks). */
    public static ioIceDays(): boolean {
        if (!MUSHROOMS.ioCanPickHere() || !IoHfo.inYard()) {
            return false;
        }
        let f: any = IoHfo.flag();
        let day: int = f ? f.day | 0 : 0;
        return day >= 1 && day <= 3 && !(Number(f.done) > 0);
    }

    /**
     * The ice a worker can do something with now: every small patch, each big patch not tried yet (only the
     * first try counts), and each sealed tower that isn't being built or upgraded; none with a worker on it.
     */
    public static ioWorkableIce(): any[] {
        let out: any[] = [];
        if (!MUSHROOMS.ioIceDays()) {
            return out;
        }
        for (let o of as3.values(IoHfo.ices())) {
            let ice: IoHfoIce = as3.as(o, IoHfoIce);
            if (!ice || ice._picking || !ice._mc) {
                continue;
            }
            if (ice.kind == IoHfoIce.BIG && IoHfoIce.ioTried(ice.ioServerId)) {
                continue;
            }
            if (ice.kind == IoHfoIce.TOWER && (!ice.tower || ice.tower._countdownBuild.Get() + ice.tower._countdownUpgrade.Get() + ice.tower._countdownFortify.Get() > 0)) {
                continue;
            }
            out.push(ice);
        }
        return out;
    }

    /** The ice the button would send workers to (not what its run is waiting to do already). */
    public static ioIceLeft(): int {
        let n: int = 0;
        let todo: any[] = MUSHROOMS._ioIce ? as3.cast(MUSHROOMS._ioIce.todo, Array) : [];
        for (let ice of as3.values(MUSHROOMS.ioWorkableIce())) {
            if (todo.indexOf(ice) < 0) {
                n++;
            }
        }
        return n;
    }

    /** "Break all ice": idle workers to all of it, one after another (IoHfo.sendWorker, as a click on each). */
    public static ioBreakAll(): void {
        let ice: any[] = MUSHROOMS.ioWorkableIce();
        if (!ice.length) {
            return;
        }
        if (!MUSHROOMS.ioIdleWorker()) {
            GLOBAL.Message(QUEUE.ioBusyText());
            return;
        }
        let run: any = MUSHROOMS._ioIce;
        if (!run) {
            run = MUSHROOMS._ioIce = { "todo": [], "sent": [] };
        }
        for (let i of as3.values(ice)) {
            if (run.todo.indexOf(i) < 0) {
                run.todo.push(i);
            }
        }
        SOUNDS.Play("click1");
        MUSHROOMS.ioIceNext();
        UI_WORKERS.ioYardButtons();
    }

    /** The ice run's next pieces, one to each idle worker; it ends when none of its workers is still at it. */
    private static ioIceNext(): void {
        let run: any = MUSHROOMS._ioIce;
        if (!run || MUSHROOMS._ioSending) {
            return;
        }
        if (!MUSHROOMS.ioIceDays()) {
            MUSHROOMS._ioIce = null;
            return;
        }
        MUSHROOMS._ioSending = true;
        try {
            let ices: any[] = IoHfo.ices();
            let sent: any[] = [];
            for (let s of as3.values(run.sent)) {
                if (s._picking && ices.indexOf(s) >= 0) {
                    sent.push(s);
                }
            }
            run.sent = sent;
            let workable: any[] = MUSHROOMS.ioWorkableIce();
            while (run.todo.length > 0) {
                let ice: IoHfoIce = as3.as(run.todo[0], IoHfoIce);
                if (!ice || workable.indexOf(ice) < 0) {
                    run.todo.shift();
                    continue;
                }
                if (!MUSHROOMS.ioIdleWorker()) {
                    break;
                }
                IoHfo.sendWorker(ice);
                run.todo.shift();
                if (!ice._picking) {
                    break;
                }
                if (!MUSHROOMS.ioHasWorker(ice)) {
                    QUEUE.Remove("hfoice" + ice._id, false);
                    ice.ioReset();
                    break;
                }
                run.sent.push(ice);
            }
            if (!run.sent.length) {
                MUSHROOMS._ioIce = null;
            }
        } finally {
            MUSHROOMS._ioSending = false;
        }
    }

    /** The queue's tick (UI_WORKERS.Update): the runs go on as workers come free. */
    public static ioYardTick(): void {
        if (!MUSHROOMS.ioCanPickHere()) {
            return;
        }
        if (MUSHROOMS._ioAll) {
            MUSHROOMS.ioPickNext();
        }
        if (MUSHROOMS._ioIce) {
            MUSHROOMS.ioIceNext();
        }
    }
}
