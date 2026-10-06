import * as as3 from "as3";
import { ASObject, int } from "as3";
import { TimerEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { Timer, getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, GLOBAL, GRID, InstanceManager, IoHfo, IoHfoIce, IoQuests, KEYS, LOGGER, POPUPS, QUESTS, QUEUE, Rndm, WORKERS, popup_mushroomshiny } from "@game";

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
    }

    /** The warts in the yard now. */
    private static ioWartCount(): int {
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

        if (isGolden) {
            let mushroomVariant: int = (Math.random() * 3 + 1) | 0;

            if (mushroomVariant == 3) {
                mushroomVariant = 1;
            }

            shinyAwarded = mushroomVariant == 2 ? 8 : 3;
            workerMessage = KEYS.Get("pop_mushroom_msg1", { "v1": shinyAwarded });

            BASE.Purchase("MUSHROOM" + mushroomVariant, 1, "MUSHROOMS");

            let shinyPopup: popup_mushroomshiny = new popup_mushroomshiny();
            shinyPopup.tTitle.htmlText = "<b>" + KEYS.Get("pop_goldenmushroom_title") + "</b>";
            shinyPopup.tMessage.htmlText = KEYS.Get(GLOBAL.INFERNO_ONLY ? "pop_goldenwart_desc" : "pop_goldenmushroom_desc", { "v1": shinyAwarded });

            POPUPS.Push(shinyPopup, null, null, "chaching", GLOBAL.INFERNO_ONLY ? "goldwart.png" : "goldmushroom.png");
        } else {
            // Inferno-only: the warts have their own lines (pop_wart_msg2-4).
            let flavourKeys: any[] = GLOBAL.INFERNO_ONLY ? ["pop_wart_msg2", "pop_wart_msg3", "pop_wart_msg4"] : ["pop_mushroom_msg2", "pop_mushroom_msg3", "pop_mushroom_msg4"];
            workerMessage = KEYS.Get(as3.str(flavourKeys[(Math.random() * flavourKeys.length) | 0]));
            BASE.Save();
        }

        LOGGER.Stat([34, shinyAwarded]);
        QUESTS.Check();
        WORKERS.Say(workerMessage, QUEUE.Remove("mushroom" + mushroomId, true), 3000);
        return true;
    }
}
