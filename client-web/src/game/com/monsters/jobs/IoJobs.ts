import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent, TimerEvent } from "flash/events";
import { TextField, TextFormatAlign } from "flash/text";
import { Timer, getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, CasinoUI, GLOBAL, InstanceManager, IoHfoIce, IoToast, IoWin, KEYS, LOGIN, MUSHROOMS, QUEUE, SOUNDS } from "@game";

/**
 * Inferno-only (27 November, admintester's: "Show a button for a list of upgrades/calcifications that you can make on
 * the yard. The list should have start and queue options with an additional option for pick warts before starting
 * next on queue."):
 *
 *  - The workers' column has Jobs (UI_WORKERS) in the player's own yards. It opens a list of every building that can
 *    be upgraded or calcified next (not walls: their Upgrade All), what it costs and how long it takes, with Start
 *    (at once, as the building's own Upgrade or Calcify does) and Queue.
 *  - The queue: jobs started in turn, by themselves, as workers come free and the resources are there (the first in
 *    line that can start, then the next). Kept in this browser for each yard; it runs while the game has the yard
 *    open. "Pick warts first": before the next job, the yard's warts are picked (MUSHROOMS.ioPickAll), then it starts.
 *  - A queued job that can't be any more (the building gone, or upgraded past it by hand) is dropped.
 */
export class IoJobs extends ASObject {
    private static readonly KEY: string = "bymr-jobq-";
    private static readonly ROWS: int = 7;
    private static readonly QROWS: int = 4;
    /** How long the warts are waited for before the next job starts anyway. */
    private static readonly WART_WAIT_MS: int = 180000;

    private static _queue: any[] = [];
    private static _base: string = null;
    private static _wartsFirst: boolean = false;
    private static _ticker: Timer = null;
    private static _wartsSince: int = 0;
    private static _win: any = null;
    private static _page: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    /** The player's own yard (main or outpost), being built. */
    public static ownYard(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.ioDesignMode() && String(BASE._userID) == String(LOGIN._playerID) && !!BASE._loadedBaseID;
    }

    // ---- the queue, kept in the browser for each yard
    private static load(): void {
        let base: string = String(BASE._loadedBaseID);
        if (IoJobs._base == base) {
            return;
        }
        IoJobs._base = base;
        IoJobs._queue = [];
        IoJobs._wartsFirst = false;
        try {
            let raw: string = window.localStorage.getItem(IoJobs.KEY + base);
            let o: any = raw ? JSON.parse(raw) : null;
            if (o && Array.isArray(o.q)) {
                for (let e of o.q) {
                    if (e && (e.kind == "upgrade" || e.kind == "fortify") && Number(e.id) >= 0 && Number(e.lvl) > 0) {
                        IoJobs._queue.push({ "id": Number(e.id) | 0, "kind": String(e.kind), "lvl": Number(e.lvl) | 0 });
                    }
                }
            }
            IoJobs._wartsFirst = !!(o && o.w);
        } catch (err) {
        }
    }

    private static keep(): void {
        if (!IoJobs._base) {
            return;
        }
        try {
            window.localStorage.setItem(IoJobs.KEY + IoJobs._base, JSON.stringify({ "q": IoJobs._queue, "w": IoJobs._wartsFirst ? 1 : 0 }));
        } catch (err) {
        }
    }

    /** The yard is up (BASE): its queue read, and the runner started. */
    public static afterLoad(): void {
        if (!IoJobs.ownYard()) {
            return;
        }
        IoJobs._base = null;
        IoJobs.load();
        IoJobs._wartsSince = 0;
        if (!IoJobs._ticker) {
            IoJobs._ticker = new Timer(1000);
            IoJobs._ticker.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
                try {
                    IoJobs.tick();
                } catch (err) {
                }
            });
            IoJobs._ticker.start();
        }
    }

    /** How many jobs wait in this yard's queue. */
    public static get queued(): int {
        if (!IoJobs.ownYard()) {
            return 0;
        }
        IoJobs.load();
        return IoJobs._queue.length | 0;
    }

    // ---- the jobs
    private static building(id: int): BFOUNDATION {
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b && b._id == id && !b._destroyed) {
                return b;
            }
        }
        return null;
    }

    private static busy(b: BFOUNDATION): boolean {
        return b._countdownBuild.Get() + b._countdownUpgrade.Get() + b._countdownFortify.Get() > 0;
    }

    /** A building that has upgrades or calcifications at all (not walls, decorations, warts, gifts, signs). */
    private static listed(b: BFOUNDATION): boolean {
        let p: any = b ? b._buildingProps : null;
        if (!p || b._destroyed || p.type == "wall" || p.type == "decoration" || p.type == "mushroom" || p.type == "taunt" || p.type == "gift" || b._class == "decoration" || b._class == "mushroom") {
            return false;
        }
        return true;
    }

    /** The next job of a kind on a building: the level it leads to, or 0 when there is none. */
    private static nextLevel(b: BFOUNDATION, kind: string): int {
        let p: any = b._buildingProps;
        if (kind == "upgrade") {
            let lvl: int = b._lvl.Get() | 0;
            return (lvl > 0 && p.costs && p.costs.length > lvl ? lvl + 1 : 0) | 0;
        }
        let f: int = b._fortification.Get() | 0;
        return (p.can_fortify && p.fortify_costs && p.fortify_costs.length > f ? f + 1 : 0) | 0;
    }

    /** Can it start now: null, or why not. */
    private static whyNot(b: BFOUNDATION, kind: string): string {
        if (IoJobs.busy(b)) {
            return KEYS.Get("io_jobs_busy");
        }
        let c: any = kind == "upgrade" ? BASE.CanUpgrade(b) : BASE.CanFortify(b);
        if (c && c.error) {
            return String(c.errorMessage || KEYS.Get("io_jobs_cant"));
        }
        let q: any = QUEUE.CanDo();
        if (q && q.error) {
            return KEYS.Get("io_jobs_noworker");
        }
        return null;
    }

    private static cost(b: BFOUNDATION, kind: string): any {
        return kind == "upgrade" ? b.UpgradeCost() : b.FortifyCost();
    }

    private static costText(c: any): string {
        let parts: any[] = [];
        let names: any[] = BASE.isInfernoMainYardOrOutpost ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
        for (let i: int = 1; i <= 4; i++) {
            let v: number = c && c["r" + i] ? Number(c["r" + i].Get()) : 0;
            if (v > 0) {
                let s: string = GLOBAL.ioShort(v) + " " + KEYS.Get(as3.str(names[i - 1]));
                parts.push(c["r" + i + "over"] ? "<font color=\"#FF6A4A\">" + s + "</font>" : s);
            }
        }
        let t: int = c && c.time ? (Number(c.time.Get()) * GLOBAL.ioBuildTime()) | 0 : 0;
        return (parts.length ? parts.join(", ") : KEYS.Get("io_walls_free")) + (t > 0 ? "  ·  " + GLOBAL.ioDuration(t) : "");
    }

    private static jobName(b: BFOUNDATION, kind: string, lvl: int): string {
        let name: string = KEYS.Get(as3.str(b._buildingProps.name));
        return KEYS.Get(kind == "upgrade" ? "io_jobs_upgrade" : "io_jobs_calcify", { "v1": name, "v2": lvl - 1, "v3": lvl });
    }

    /** Every job that can be done next in the yard: [building, kind, level], the ones that can start now first. */
    private static jobs(): any[] {
        let out: any[] = [];
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (!IoJobs.listed(b)) {
                continue;
            }
            for (let kind of ["upgrade", "fortify"]) {
                let lvl: int = IoJobs.nextLevel(b, kind);
                if (lvl > 0) {
                    out.push([b, kind, lvl, IoJobs.whyNot(b, kind)]);
                }
            }
        }
        out.sort((a: any[], c: any[]): number => {
            let ra: number = a[3] == null ? 0 : (IoJobs.busy(a[0]) ? 2 : 1);
            let rc: number = c[3] == null ? 0 : (IoJobs.busy(c[0]) ? 2 : 1);
            if (ra != rc) {
                return ra - rc;
            }
            let ta: number = Number(IoJobs.cost(a[0], a[1]).time ? IoJobs.cost(a[0], a[1]).time.Get() : 0);
            let tc: number = Number(IoJobs.cost(c[0], c[1]).time ? IoJobs.cost(c[0], c[1]).time.Get() : 0);
            return ta - tc;
        });
        return out;
    }

    /** Starts a job now (the building's own Upgrade or Calcify, with its messages). */
    private static start(b: BFOUNDATION, kind: string): boolean {
        if (!b || IoJobs.busy(b)) {
            return false;
        }
        let ok: boolean = kind == "upgrade" ? b.Upgrade() : b.Fortify();
        if (ok) {
            SOUNDS.Play("click1");
        }
        return ok;
    }

    /** Queues a job: the next level of that kind after any already queued for the building. */
    public static enqueue(b: BFOUNDATION, kind: string): void {
        IoJobs.load();
        let lvl: int = IoJobs.nextLevel(b, kind);
        if (lvl <= 0) {
            return;
        }
        let max: int = (kind == "upgrade" ? b._buildingProps.costs.length : b._buildingProps.fortify_costs.length) | 0;
        for (let e of IoJobs._queue) {
            if (e.id == b._id && e.kind == kind && e.lvl >= lvl) {
                lvl = (e.lvl + 1) | 0;
            }
        }
        if (lvl > max || IoJobs._queue.length >= 40) {
            IoToast.Show(KEYS.Get("io_jobs_queue_full"), 3000);
            return;
        }
        IoJobs._queue.push({ "id": b._id, "kind": kind, "lvl": lvl });
        IoJobs.keep();
        SOUNDS.Play("click1");
        IoToast.Show(KEYS.Get("io_jobs_queued", { "v1": IoJobs.jobName(b, kind, lvl) }), 2500);
    }

    /** The runner, every second: the first queued job that can start, once a worker is free (the warts first, if asked). */
    private static tick(): void {
        if (!IoJobs.ownYard() || BASE._loading) {
            return;
        }
        IoJobs.load();
        if (!IoJobs._queue.length) {
            IoJobs._wartsSince = 0;
            return;
        }
        // (dropped: the building gone, or past that level)
        let changed: boolean = false;
        for (let i: int = IoJobs._queue.length - 1; i >= 0; i--) {
            let e: any = IoJobs._queue[i];
            let b: BFOUNDATION = IoJobs.building(e.id);
            let now: int = b ? (e.kind == "upgrade" ? b._lvl.Get() | 0 : b._fortification.Get() | 0) : 999;
            if (!b || now >= e.lvl) {
                IoJobs._queue.splice(i, 1);
                changed = true;
            }
        }
        if (changed) {
            IoJobs.keep();
            IoJobs.refresh();
        }
        if (!IoJobs._queue.length || QUEUE.CanDo().error) {
            return;
        }
        // (pick warts first: sent out, and the next job waits until they are picked, or 3 minutes)
        if (IoJobs._wartsFirst && MUSHROOMS.ioCanPickHere()) {
            let warts: int = 0;
            for (let m of (InstanceManager.getInstancesByClass(BMUSHROOM) ?? [])) {
                if (m && !(m instanceof IoHfoIce)) {
                    warts++;
                }
            }
            if (warts > 0) {
                if (IoJobs._wartsSince == 0) {
                    IoJobs._wartsSince = getTimer();
                }
                if (getTimer() - IoJobs._wartsSince < IoJobs.WART_WAIT_MS) {
                    if (MUSHROOMS.ioPickable().length > 0 && MUSHROOMS.ioWartsLeft() > 0 && MUSHROOMS.ioIdleWorker()) {
                        MUSHROOMS.ioPickAll();
                    }
                    return;
                }
            }
        }
        IoJobs._wartsSince = 0;
        for (let i: int = 0; i < IoJobs._queue.length; i++) {
            let e: any = IoJobs._queue[i];
            let b: BFOUNDATION = IoJobs.building(e.id);
            if (!b || IoJobs.busy(b) || IoJobs.nextLevel(b, e.kind) != e.lvl || IoJobs.whyNot(b, e.kind) != null) {
                continue;
            }
            if (IoJobs.start(b, e.kind)) {
                IoJobs._queue.splice(i, 1);
                IoJobs.keep();
                IoToast.Show(KEYS.Get("io_jobs_started", { "v1": IoJobs.jobName(b, e.kind, e.lvl) }), 3500);
                IoJobs.refresh();
            }
            return;
        }
    }

    // ---- the window
    public static Show(): void {
        if (!IoJobs.ownYard()) {
            return;
        }
        IoJobs.load();
        IoJobs._page = 0;
        IoJobs.draw();
    }

    private static refresh(): void {
        if (IoJobs._win && !IoJobs._win.closed) {
            IoJobs.draw();
        }
    }

    private static draw(): void {
        if (IoJobs._win && !IoJobs._win.closed) {
            IoJobs._win.close();
        }
        const W: int = 640;
        const H: int = 560;
        let win: any = IoWin.openPanel("ioJobs", W, H, KEYS.Get("io_jobs_title"));
        IoJobs._win = win;
        let mc: MovieClip = win.mc;
        let left: int = win.left;
        let top: int = win.top;
        let y: int = (top + 50) | 0;
        let sub: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_jobs_intro"), 11, CasinoUI.ASH, false, W - 44, TextFormatAlign.LEFT)), TextField);
        sub.name = "ioJobsIntro";
        GLOBAL.ioFitText(sub, 8);
        sub.x = left + 22;
        sub.y = y;
        y = (y + 24) | 0;
        // the queue
        let qt: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_jobs_queue", { "v1": IoJobs._queue.length }), 13, CasinoUI.GOLD, true, 300, TextFormatAlign.LEFT)), TextField);
        qt.x = left + 22;
        qt.y = y;
        let box: Sprite = IoJobs.checkbox(KEYS.Get("io_jobs_warts_first"), IoJobs._wartsFirst, (on: boolean): void => {
            IoJobs._wartsFirst = on;
            IoJobs.keep();
        });
        box.name = "ioJobsWartsFirst";
        box.x = left + W - 22 - 290;
        box.y = y + 1;
        mc.addChild(box);
        y = (y + 24) | 0;
        if (!IoJobs._queue.length) {
            let none: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_jobs_queue_none"), 11, CasinoUI.ASH, false, W - 44, TextFormatAlign.LEFT)), TextField);
            none.x = left + 22;
            none.y = y;
            y = (y + 22) | 0;
        }
        for (let i: int = 0; i < Math.min(IoJobs._queue.length, IoJobs.QROWS); i++) {
            let e: any = IoJobs._queue[i];
            let b: BFOUNDATION = IoJobs.building(e.id);
            let row: Sprite = as3.as(mc.addChild(CasinoUI.panel(W - 40, 26, 0.9)), Sprite);
            row.name = "ioJobsQueued:" + i;
            row.x = left + 20;
            row.y = y;
            let t: TextField = as3.as(row.addChild(CasinoUI.label((i + 1) + ". " + (b ? IoJobs.jobName(b, e.kind, e.lvl) : "?"), 11, CasinoUI.GOLD, false, W - 40 - 50, TextFormatAlign.LEFT)), TextField);
            GLOBAL.ioFitText(t, 8);
            t.x = 10;
            t.y = 5;
            let at: int = i;
            let x: Sprite = as3.as(row.addChild(CasinoUI.button("X", 30, 20, (ev: MouseEvent): void => {
                IoJobs._queue.splice(at, 1);
                IoJobs.keep();
                IoJobs.refresh();
            }, true, 11)), Sprite);
            x.name = "ioJobsUnqueue:" + i;
            x.x = W - 40 - 36;
            x.y = 3;
            y = (y + 29) | 0;
        }
        if (IoJobs._queue.length > IoJobs.QROWS) {
            let more: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_jobs_queue_more", { "v1": IoJobs._queue.length - IoJobs.QROWS }), 10, CasinoUI.ASH, false, W - 44, TextFormatAlign.LEFT)), TextField);
            more.x = left + 24;
            more.y = y - 2;
            y = (y + 14) | 0;
        }
        // the jobs, a page at a time
        y = (y + 8) | 0;
        let all: any[] = IoJobs.jobs();
        let pages: int = Math.max(1, Math.ceil(all.length / IoJobs.ROWS)) | 0;
        IoJobs._page = Math.max(0, Math.min(IoJobs._page, pages - 1)) | 0;
        let jt: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_jobs_list", { "v1": all.length }), 13, CasinoUI.GOLD, true, 300, TextFormatAlign.LEFT)), TextField);
        jt.x = left + 22;
        jt.y = y;
        y = (y + 22) | 0;
        if (!all.length) {
            let none: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_jobs_none"), 11, CasinoUI.ASH, false, W - 44, TextFormatAlign.LEFT)), TextField);
            none.x = left + 22;
            none.y = y;
        }
        let rowH: int = 40;
        for (let k: int = 0; k < IoJobs.ROWS; k++) {
            let n: int = (IoJobs._page * IoJobs.ROWS + k) | 0;
            if (n >= all.length) {
                break;
            }
            let job: any[] = all[n];
            let b: BFOUNDATION = job[0];
            let kind: string = job[1];
            let why: string = job[3];
            let row: Sprite = as3.as(mc.addChild(CasinoUI.panel(W - 40, rowH - 4, 0.9)), Sprite);
            row.name = "ioJobsRow:" + k;
            row.x = left + 20;
            row.y = y;
            let t: TextField = as3.as(row.addChild(CasinoUI.label(IoJobs.jobName(b, kind, job[2]), 11, why == null ? CasinoUI.GOLD : 0xC8B8A0, true, W - 40 - 200, TextFormatAlign.LEFT)), TextField);
            GLOBAL.ioFitText(t, 8);
            t.x = 10;
            t.y = 2;
            let c: TextField = as3.as(row.addChild(CasinoUI.label("", 10, CasinoUI.ASH, false, W - 40 - 200, TextFormatAlign.LEFT)), TextField);
            c.htmlText = why != null && IoJobs.busy(b) ? KEYS.Get("io_jobs_busy") : IoJobs.costText(IoJobs.cost(b, kind));
            GLOBAL.ioFitText(c, 7);
            c.x = 10;
            c.y = 18;
            let go: Sprite = as3.as(row.addChild(CasinoUI.button(KEYS.Get("io_jobs_start"), 84, 26, (ev: MouseEvent): void => {
                let w: string = IoJobs.whyNot(b, kind);
                if (w != null) {
                    GLOBAL.Message(w);
                    return;
                }
                if (IoJobs.start(b, kind)) {
                    IoJobs.refresh();
                }
            }, why == null, 12)), Sprite);
            go.name = "ioJobsStart:" + k;
            go.x = W - 40 - 182;
            go.y = 5;
            let qb: Sprite = as3.as(row.addChild(CasinoUI.button(KEYS.Get("io_jobs_queue_btn"), 84, 26, (ev: MouseEvent): void => {
                IoJobs.enqueue(b, kind);
                IoJobs.refresh();
            }, true, 12)), Sprite);
            qb.name = "ioJobsQueue:" + k;
            qb.x = W - 40 - 92;
            qb.y = 5;
            y = (y + rowH) | 0;
        }
        if (pages > 1) {
            let py: int = (-top - 42) | 0;
            let prev: Sprite = as3.as(mc.addChild(CasinoUI.button("◀", 40, 28, (ev: MouseEvent): void => {
                IoJobs._page = Math.max(0, IoJobs._page - 1) | 0;
                IoJobs.refresh();
            }, IoJobs._page > 0, 13)), Sprite);
            prev.name = "ioJobsPrev";
            prev.x = -90;
            prev.y = py;
            let pt: TextField = as3.as(mc.addChild(CasinoUI.label((IoJobs._page + 1) + " / " + pages, 12, CasinoUI.ASH, true, 80, TextFormatAlign.CENTER)), TextField);
            pt.x = -40;
            pt.y = py + 5;
            let next: Sprite = as3.as(mc.addChild(CasinoUI.button("▶", 40, 28, (ev: MouseEvent): void => {
                IoJobs._page = Math.min(pages - 1, IoJobs._page + 1) | 0;
                IoJobs.refresh();
            }, IoJobs._page < pages - 1, 13)), Sprite);
            next.name = "ioJobsNext";
            next.x = 50;
            next.y = py;
        }
    }

    /** A checkbox with its label: `onChange(on)`. */
    private static checkbox(label: string, on: boolean, onChange: Function): Sprite {
        let s: Sprite = new Sprite();
        let state: boolean = on;
        let mark: Sprite = new Sprite();
        let draw = (): void => {
            mark.graphics.clear();
            mark.graphics.lineStyle(1.5, 0xE0A040, 1);
            mark.graphics.beginFill(0x1A0A00, 1);
            mark.graphics.drawRoundRect(0, 0, 16, 16, 4, 4);
            mark.graphics.endFill();
            if (state) {
                mark.graphics.lineStyle(2.5, 0xFFD24A, 1);
                mark.graphics.moveTo(3, 8);
                mark.graphics.lineTo(7, 12);
                mark.graphics.lineTo(13, 3);
            }
        };
        draw();
        s.addChild(mark);
        let t: TextField = CasinoUI.label(label, 11, CasinoUI.GOLD, false, 270, TextFormatAlign.LEFT);
        GLOBAL.ioFitText(t, 8);
        t.x = 22;
        t.y = -1;
        s.addChild(t);
        s.buttonMode = true;
        s.mouseChildren = false;
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            state = !state;
            draw();
            SOUNDS.Play("click1");
            onChange(state);
        });
        return s;
    }
}
