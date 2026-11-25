import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { BASE, BFOUNDATION, CASINO, GLOBAL, IoCritterMenu, IoShop, IoYardFx, KEYS, QUEUE, STORE, UI_WORKERS, URLLoaderApi, WORKER, WORKERS, IoDevil } from "@game";

/**
 * Inferno-only (10 October): a worker clicked in the main yard (IoYardPick) opens a menu of things to tell it
 * (dance, a joke, a stroll, follow the pointer, a cheer) and Sacrifice: the worker is given to Moloch for good,
 * for `workers_sacrifice` Shiny (the server: workers/sacrifice, services/workers/sacrifice.ts). Only an idle
 * worker, and never the last one. The yard then has one worker less, now and on every load (the store data's
 * extra workers, BEW, one less; the server keeps it so).
 */
export class IoWorkerFun extends ASObject {
    /** What a sacrifice pays (the server's; with the flags). */
    public static get shiny(): int {
        let v: number = GLOBAL._flags ? Number(GLOBAL._flags.io_worker_sacrifice) : NaN;
        return isNaN(v) ? 500 : v | 0;
    }

    /** Is sacrificing workers on (the server's flag)? */
    public static get canSacrifice(): boolean {
        return GLOBAL._flags != null && Number(GLOBAL._flags.io_worker_sacrifice) > 0;
    }

    private static _busy: boolean = false;

    /**
     * The jokes, cheers and greetings: their keys (QoL #235: in the player's language, read when said; the language
     * file isn't loaded when the class is). io_t3t_joke_01 to _40, io_t3t_cheer_1 to _5, io_t3t_hello_1 to _5.
     */
    private static readonly JOKES: any[] = ["io_t3t_joke_01", "io_t3t_joke_02", "io_t3t_joke_03", "io_t3t_joke_04", "io_t3t_joke_05", "io_t3t_joke_06", "io_t3t_joke_07", "io_t3t_joke_08", "io_t3t_joke_09", "io_t3t_joke_10", "io_t3t_joke_11", "io_t3t_joke_12", "io_t3t_joke_13", "io_t3t_joke_14", "io_t3t_joke_15", "io_t3t_joke_16", "io_t3t_joke_17", "io_t3t_joke_18", "io_t3t_joke_19", "io_t3t_joke_20", "io_t3t_joke_21", "io_t3t_joke_22", "io_t3t_joke_23", "io_t3t_joke_24", "io_t3t_joke_25", "io_t3t_joke_26", "io_t3t_joke_27", "io_t3t_joke_28", "io_t3t_joke_29", "io_t3t_joke_30", "io_t3t_joke_31", "io_t3t_joke_32", "io_t3t_joke_33", "io_t3t_joke_34", "io_t3t_joke_35", "io_t3t_joke_36", "io_t3t_joke_37", "io_t3t_joke_38", "io_t3t_joke_39", "io_t3t_joke_40"];

    private static readonly CHEERS: any[] = ["io_t3t_cheer_1", "io_t3t_cheer_2", "io_t3t_cheer_3", "io_t3t_cheer_4", "io_t3t_cheer_5"];

    private static readonly WAVES: any[] = ["io_t3t_hello_1", "io_t3t_hello_2", "io_t3t_hello_3", "io_t3t_hello_4", "io_t3t_hello_5"];

    public $ctor(): void {
        super.$ctor();
    }

    /** The main yard's workers (none elsewhere). */
    public static workers(): any[] {
        if (!WORKERS._workers || !BASE.isMainYard || BASE.isOutpost) {
            return [];
        }
        let out: any[] = [];
        for (let w of as3.values(WORKERS._workers)) {
            if (w && w.mc) {
                out.push(w.mc);
            }
        }
        return out;
    }

    /** Where a worker is drawn on the map's building layer (its body: the picture has room round it). */
    public static box(mc: any): any {
        if (!mc) {
            return null;
        }
        return { "x": mc.x - 15, "y": mc.y - 36, "w": 30, "h": 40 };
    }

    private static entry(mc: any): any {
        for (let w of as3.values(WORKERS._workers || [])) {
            if (w && w.mc == mc) {
                return w;
            }
        }
        return null;
    }

    /** One of a list of keys, at random, in the player's language. */
    private static pick(list: any[]): string {
        return KEYS.Get(String(list[(Math.random() * list.length) | 0]));
    }

    /** A worker's menu. */
    public static menu(mc: WORKER): void {
        let w: any = IoWorkerFun.entry(mc);
        if (!w) {
            return;
        }
        let task: BFOUNDATION = as3.as(w.task, BFOUNDATION);
        // (QoL #235: in the player's language)
        let line: string = task ? KEYS.Get("io_t3t_worker_on", { "v1": IoWorkerFun.buildingName(task) }) : KEYS.Get("io_t3t_worker_idle");
        let items: any[] = [];
        items.push({ "label": KEYS.Get("io_t3t_worker_dance"), "onClick": (): void => {
            mc.ioDance = 72;
            mc.Say(IoWorkerFun.pick(IoWorkerFun.CHEERS), 1600);
        } });
        items.push({ "label": KEYS.Get("io_t3t_worker_joke"), "onClick": (): void => {
            mc.Say(IoWorkerFun.pick(IoWorkerFun.JOKES), 4500);
        } });
        items.push({ "label": KEYS.Get("io_t3t_worker_wave"), "onClick": (): void => {
            mc.Say(IoWorkerFun.pick(IoWorkerFun.WAVES), 2200);
            IoYardFx.word("o/", mc.x + 10, mc.y - 40, mc.y, 40, 0xFFD24A);
        } });
        if (!task) {
            if (mc.ioFollow > 0) {
                items.push({ "label": KEYS.Get("io_t3t_pet_stop"), "onClick": (): void => {
                    mc.ioFollow = 0;
                } });
            } else {
                items.push({ "label": KEYS.Get("io_t3t_pet_follow"), "onClick": (): void => {
                    mc.ioFollow = 40 * 30;
                    mc.Say(KEYS.Get("io_t3t_worker_behind"), 1600);
                } });
            }
            items.push({ "label": KEYS.Get("io_t3t_worker_stroll"), "onClick": (): void => {
                mc.ioFollow = 0;
                mc.Wander();
                mc.Say(KEYS.Get("io_t3t_worker_stretch"), 1600);
            } });
        }
        if (IoWorkerFun.canSacrifice) {
            let many: boolean = WORKERS._workers.length > 1;
            items.push({ "label": KEYS.Get("io_t3t_worker_sac", { "v1": IoWorkerFun.shiny }), "style": "red", "enabled": many && !task, "onClick": (): void => {
                IoWorkerFun.askSacrifice(mc);
            } });
            if (!many) {
                line = KEYS.Get("io_t3t_worker_last", { "v1": line });
            } else if (task) {
                line = KEYS.Get("io_t3t_worker_busy", { "v1": line });
            }
        }
        IoCritterMenu.Show(KEYS.Get("io_t3t_worker"), line, items);
    }

    private static buildingName(b: BFOUNDATION): string {
        let n: string = b._buildingProps && b._buildingProps.name ? KEYS.Get(String(b._buildingProps.name)) : "";
        return n ? n : KEYS.Get("io_t3t_worker_building");
    }

    /** Sacrifice: the warning first. */
    private static askSacrifice(mc: WORKER): void {
        let w: any = IoWorkerFun.entry(mc);
        if (!w || w.task || WORKERS._workers.length <= 1) {
            return;
        }
        let left: int = (WORKERS._workers.length - 1) | 0;
        GLOBAL.ioDanger(KEYS.Get(left == 1 ? "io_t3t_worker_sac_ask_one" : "io_t3t_worker_sac_ask_n", { "v1": IoWorkerFun.shiny, "v2": left }), KEYS.Get("io_t3t_worker_sac_btn"), (): void => {
            IoWorkerFun.sacrifice(mc);
        });
    }

    /** Asks the server; on its answer the worker goes (and the Shiny comes). */
    private static sacrifice(mc: WORKER): void {
        if (IoWorkerFun._busy) {
            return;
        }
        // (22 October: the Apprentice is only on loan)
        if (IoShop.isApprentice(mc)) {
            GLOBAL.Message(KEYS.Get("io_shop_apprentice_loan"));
            return;
        }
        // (13 November: nor the Devil's, from Second Shift)
        if (IoDevil.isLent(mc)) {
            GLOBAL.Message(KEYS.Get("io_dv_worker_loan"));
            return;
        }
        let w: any = IoWorkerFun.entry(mc);
        if (!w || w.task) {
            GLOBAL.Message(KEYS.Get("io_t3t_worker_has_job"));
            return;
        }
        IoWorkerFun._busy = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "workers/sacrifice", [["workers", WORKERS._workers.length]], (response: any): void => {
            IoWorkerFun._busy = false;
            if (!response || response.error !== 0 && response.error !== "0") {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_t3t_srv_try"));
                return;
            }
            IoWorkerFun.remove(mc);
            if (STORE._storeData && STORE._storeData.BEW) {
                STORE._storeData.BEW.q = response.extra != null ? response.extra | 0 : Math.max(0, (STORE._storeData.BEW.q | 0) - 1);
            }
            if (response.credits != null) {
                CASINO.setCredits(response.credits | 0);
            }
            WORKERS.ioSacrificed(response); // (QoL #497: logged; Moloch may give it back for a little while)
        }, (e: IOErrorEvent): void => {
            IoWorkerFun._busy = false;
            GLOBAL.Message(KEYS.Get("io_t3t_srv_conn"));
        });
    }

    /** The worker goes: in a puff of fire and sparkles, from the yard and the queue. */
    private static remove(mc: WORKER): void {
        let i: int = 0;
        while (i < WORKERS._workers.length) {
            if (WORKERS._workers[i].mc == mc) {
                WORKERS._workers.splice(i, 1);
                break;
            }
            i++;
        }
        i = 0;
        while (i < QUEUE._stack.length) {
            if (QUEUE._stack[i].workermc == mc) {
                QUEUE._stack.splice(i, 1);
                break;
            }
            i++;
        }
        QUEUE._workerCount = WORKERS._workers.length;
        for (let k: int = 0; k < 6; k++) {
            IoYardFx.sparkle(mc.x, mc.y - 20, mc.y);
        }
        IoYardFx.word("+" + IoWorkerFun.shiny + " Shiny", mc.x, mc.y - 44, mc.y, 70, 0xFFD24A);
        mc.Clear();
        if (mc.parent) {
            mc.parent.removeChild(mc);
        }
        try {
            UI_WORKERS.ioRefresh();
        } catch (e) {
        }
    }
}
