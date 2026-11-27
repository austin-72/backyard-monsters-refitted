import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BUILDINGINFO, BUILDINGS, Chat, GLOBAL, IoHfoArt, IoWarts, KEYS, MAP, MUSHROOMS, QUEUE, STORE, TUTORIAL, UI2, UI_BOTTOM, bubblepopup, bubblepopupRight, icon_worker, icon_worker_inferno, IoJobs } from "@game";

export class UI_WORKERS extends ASObject {
    private static _do: DisplayObject = null;

    private static _mc: MovieClip = null;

    private static _workers: any[] = null;

    private static _popupdo: DisplayObject = null;

    private static _popupID: int = 0;

    private static _popupmc: bubblepopupRight = null;

    private static _popupmc2: bubblepopup = null;

    private static _maxWorkers: int = 0;

    private static _workerMCOffset: int = 45;

    private static _canUseHorizontal: boolean = false;

    /** Inferno-only: a button kept in the workers' column, under the fifth worker (Moloch's Gauntlet). */
    private static _ioExtra: DisplayObject = null;

    /** The gap between the fifth worker and that button. */
    private static readonly IO_EXTRA_GAP: int = 14;

    /** The Gauntlet button is drawn round this point of its own, its gold ring 25 across the middle. */
    private static readonly IO_EXTRA_MIDDLE: number = 20.75;

    /** Hell Freezes Over's button: under the Gauntlet's (in its place while that one is hidden). */
    private static _ioExtra2: DisplayObject = null;

    /** The Frozen Monster Invasion's button: in the Gauntlet's place (the two are never on at once). */
    private static _ioExtraFmi: DisplayObject = null;

    /** (20 October) Trick or Treat's button (com/monsters/events/tot): right under the Gauntlet's. */
    private static _ioExtraTot: DisplayObject = null;

    /** Hellgate Defense's button (com/monsters/td): first under the workers, above the Gauntlet's. */
    private static _ioExtra0: DisplayObject = null;

    /** QoL #25: "Pick all warts", first under the workers (while there are some), above the event buttons. */
    private static _ioWartsBtn: Sprite = null;

    /** QoL #589: "Break all ice", under it (while the event's Days 1-3 ice is in the yard). */
    private static _ioIceBtn: Sprite = null;

    /** (27 November, admintester's) The job list (IoJobs), left of the first worker in the player's own yards. */
    private static _ioJobsBtn: Sprite = null;

    /** Those two are smaller than the event buttons: their ring, across the middle; the room each takes. */
    private static readonly IO_YARD_R: int = 18;

    private static readonly IO_YARD_STEP: int = 46;

    public $ctor(): void {
        super.$ctor();
    }

    public static ioAddUnderWorkers(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtra && UI_WORKERS._ioExtra != param1 && UI_WORKERS._ioExtra.parent) {
            UI_WORKERS._ioExtra.parent.removeChild(UI_WORKERS._ioExtra);
        }
        UI_WORKERS._ioExtra = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    public static ioAddAboveGauntlet(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtra0 && UI_WORKERS._ioExtra0 != param1 && UI_WORKERS._ioExtra0.parent) {
            UI_WORKERS._ioExtra0.parent.removeChild(UI_WORKERS._ioExtra0);
        }
        UI_WORKERS._ioExtra0 = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    public static ioAddFmi(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtraFmi && UI_WORKERS._ioExtraFmi != param1 && UI_WORKERS._ioExtraFmi.parent) {
            UI_WORKERS._ioExtraFmi.parent.removeChild(UI_WORKERS._ioExtraFmi);
        }
        UI_WORKERS._ioExtraFmi = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    /** (20 October) Trick or Treat's button: right under the Gauntlet's (in its place while that one is hidden). */
    public static ioAddTot(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtraTot && UI_WORKERS._ioExtraTot != param1 && UI_WORKERS._ioExtraTot.parent) {
            UI_WORKERS._ioExtraTot.parent.removeChild(UI_WORKERS._ioExtraTot);
        }
        UI_WORKERS._ioExtraTot = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    public static ioAddUnderGauntlet(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtra2 && UI_WORKERS._ioExtra2 != param1 && UI_WORKERS._ioExtra2.parent) {
            UI_WORKERS._ioExtra2.parent.removeChild(UI_WORKERS._ioExtra2);
        }
        UI_WORKERS._ioExtra2 = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    /** Centred under the fifth worker's button, the gap below it (it moves and hides with the column). */
    public static ioPlaceExtra(): void {
        if (!UI_WORKERS._mc) {
            return;
        }
        UI_WORKERS.ioSpaceWorkers();
        // (26 November: under the last worker shown, a 6th or 7th too, and never above the 5th's place)
        let last: int = 4;
        if (UI_WORKERS._workers) {
            for (let k: int = UI_WORKERS._workers.length - 1; k > 4; k--) {
                if (UI_WORKERS._workers[k].mc.visible) {
                    last = k;
                    break;
                }
            }
        }
        let r: Rectangle = UI_WORKERS._workers && UI_WORKERS._workers.length > last ? as3.cast(UI_WORKERS._workers[last].mc, DisplayObject).getBounds(UI_WORKERS._mc) : new Rectangle(0, 20 + 4 * UI_WORKERS._workerMCOffset, 40, 40);
        // Top to bottom: Hellgate Defense, Moloch's Gauntlet, the Frozen Monster Invasion, Hell Freezes Over; each
        // moves up into the place of one above it that is hidden (the invasion's takes the Gauntlet's: they are
        // a week apart, each hidden until a week before it starts).
        // (QoL #25, #589: first "Pick all warts" and "Break all ice", while shown; the event buttons go under them)
        let top: number = r.y + r.height + UI_WORKERS.IO_EXTRA_GAP;
        // (27 November: Jobs beside the first worker, to its left: the column's height is kept for the workers)
        if (UI_WORKERS._ioJobsBtn) {
            if (UI_WORKERS._ioJobsBtn.parent != UI_WORKERS._mc) {
                UI_WORKERS._mc.addChild(UI_WORKERS._ioJobsBtn);
            }
            let first: Rectangle = UI_WORKERS._workers && UI_WORKERS._workers.length ? as3.cast(UI_WORKERS._workers[0].mc, DisplayObject).getBounds(UI_WORKERS._mc) : new Rectangle(0, 20, 40, 40);
            UI_WORKERS._ioJobsBtn.x = first.x - 2 * UI_WORKERS.IO_EXTRA_MIDDLE - 6;
            UI_WORKERS._ioJobsBtn.y = first.y + first.height / 2 - UI_WORKERS.IO_EXTRA_MIDDLE;
        }
        let off: number = 0;
        for (let y of as3.values([UI_WORKERS._ioWartsBtn, UI_WORKERS._ioIceBtn])) {
            if (!y) {
                continue;
            }
            if (y.parent != UI_WORKERS._mc) {
                UI_WORKERS._mc.addChild(y);
            }
            y.x = r.x + r.width / 2 - UI_WORKERS.IO_EXTRA_MIDDLE;
            y.y = top + off + UI_WORKERS.IO_YARD_R - UI_WORKERS.IO_EXTRA_MIDDLE;
            if (y.visible) {
                off += UI_WORKERS.IO_YARD_STEP;
            }
        }
        let slot: int = 0;
        // (20 October: Trick or Treat's right under the Gauntlet's)
        for (let b of as3.values([UI_WORKERS._ioExtra0, UI_WORKERS._ioExtra, UI_WORKERS._ioExtraTot, UI_WORKERS._ioExtraFmi, UI_WORKERS._ioExtra2])) {
            if (!b) {
                continue;
            }
            if (b.parent != UI_WORKERS._mc) {
                UI_WORKERS._mc.addChild(b);
            }
            b.x = r.x + r.width / 2 - UI_WORKERS.IO_EXTRA_MIDDLE;
            b.y = top + off + 25 - UI_WORKERS.IO_EXTRA_MIDDLE + slot * 66;
            if (b.visible) {
                slot++;
            }
        }
    }

    /**
     * Inferno-only (QoL #25, #589): the workers' column's "Pick all warts (N)" and "Break all ice (N)": each shown
     * while there is something for it (its count on it), in the player's own main yard. The queue's tick (Update)
     * keeps them current.
     */
    public static ioYardButtons(): void {
        if (!UI_WORKERS._mc) {
            return;
        }
        let warts: int = MUSHROOMS.ioCanPickHere() ? MUSHROOMS.ioWartsLeft() : 0;
        let ice: int = MUSHROOMS.ioIceDays() ? MUSHROOMS.ioIceLeft() : 0;
        if (warts > 0 && !UI_WORKERS._ioWartsBtn) {
            UI_WORKERS._ioWartsBtn = UI_WORKERS.ioYardButton("ioYard2PickAll", false);
        }
        if (ice > 0 && !UI_WORKERS._ioIceBtn) {
            UI_WORKERS._ioIceBtn = UI_WORKERS.ioYardButton("ioYard2BreakIce", true);
        }
        // (27 November: Jobs, always there in the player's own yards; its count the jobs queued)
        if (IoJobs.ownYard() && !UI_WORKERS._ioJobsBtn) {
            UI_WORKERS._ioJobsBtn = UI_WORKERS.ioJobsButton();
        }
        let jobsMoved: boolean = false;
        if (UI_WORKERS._ioJobsBtn) {
            let show: boolean = IoJobs.ownYard();
            let n: int = show ? IoJobs.queued : 0;
            let label: TextField = as3.as(UI_WORKERS._ioJobsBtn.getChildByName("ioYard2Count"), TextField);
            let disc: DisplayObject = UI_WORKERS._ioJobsBtn.getChildByName("ioJobsDisc");
            if (label && label.text != (n > 0 ? String(n) : "")) {
                label.text = n > 0 ? String(n) : "";
            }
            if (disc && disc.visible != n > 0) {
                disc.visible = n > 0;
            }
            if (UI_WORKERS._ioJobsBtn.visible != show) {
                UI_WORKERS._ioJobsBtn.visible = show;
                jobsMoved = true;
            }
            jobsMoved = jobsMoved || UI_WORKERS._ioJobsBtn.parent != UI_WORKERS._mc;
        }
        let moved: boolean = UI_WORKERS.ioYardCount(UI_WORKERS._ioWartsBtn, warts) || jobsMoved;
        moved = UI_WORKERS.ioYardCount(UI_WORKERS._ioIceBtn, ice) || moved;
        if (moved) {
            UI_WORKERS.ioPlaceExtra();
        }
    }

    /** A button's count put on it (hidden at none): true when it came, went or isn't in the column yet. */
    private static ioYardCount(b: Sprite, n: int): boolean {
        if (!b) {
            return false;
        }
        let label: TextField = as3.as(b.getChildByName("ioYard2Count"), TextField);
        let text: string = String(n);
        if (label && label.text != text) {
            label.text = text;
        }
        let show: boolean = n > 0;
        if (b.visible != show) {
            b.visible = show;
            if (!show && UI_WORKERS._popupID == -1) {
                UI_WORKERS.PopupHide();
            }
            return true;
        }
        return b.parent != UI_WORKERS._mc;
    }

    /** A round button for the column, smaller than the event buttons: a wart (or a patch of ice) and its count. */
    private static ioYardButton(name: string, ice: boolean): Sprite {
        let C: number = UI_WORKERS.IO_EXTRA_MIDDLE;
        let b: Sprite = new Sprite();
        b.name = name;
        b.buttonMode = true;
        b.mouseChildren = false;
        b.graphics.lineStyle(2, ice ? 0x1A4A7A : 0xE0A040, 1);
        b.graphics.beginFill(ice ? 0x9ADCFF : 0x4A2A08, 1);
        b.graphics.drawCircle(C, C, UI_WORKERS.IO_YARD_R);
        b.graphics.endFill();
        if (ice) {
            let bmd: BitmapData = IoHfoArt.pic("small1");
            if (bmd) {
                let pic: Bitmap = new Bitmap(bmd);
                pic.smoothing = true;
                pic.scaleX = pic.scaleY = 0.6;
                pic.x = C - 15;
                pic.y = C - 10;
                b.addChild(pic);
            }
        } else {
            let wart: MovieClip = IoWarts.sprite(1);
            wart.scaleX = wart.scaleY = 0.55;
            wart.x = C;
            wart.y = C - 1;
            b.addChild(wart);
        }
        let disc: Sprite = new Sprite();
        disc.graphics.lineStyle(1, 0xFFF2C4, 1);
        disc.graphics.beginFill(0x1A0A00, 0.9);
        disc.graphics.drawCircle(0, 0, 8);
        disc.graphics.endFill();
        disc.x = C + 13;
        disc.y = C + 13;
        b.addChild(disc);
        let t: TextField = new TextField();
        t.name = "ioYard2Count";
        let f: TextFormat = new TextFormat("Verdana", 9, 0xFFF2C4, true);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = 22;
        t.height = 14;
        t.x = C + 2;
        t.y = C + 6;
        b.addChild(t);
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
            if (ice) {
                MUSHROOMS.ioBreakAll();
            } else {
                MUSHROOMS.ioPickAll();
            }
        });
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            if (ice) {
                UI_WORKERS.ioShowTip(b, "<b>" + KEYS.Get("io_yard2_ice_btn", { "v1": MUSHROOMS.ioIceLeft() }) + "</b><br>" + KEYS.Get("io_yard2_ice_tip1") + "<br>" + KEYS.Get("io_yard2_ice_tip2"));
            } else {
                UI_WORKERS.ioShowTip(b, "<b>" + KEYS.Get("io_yard2_warts_btn", { "v1": MUSHROOMS.ioWartsLeft() }) + "</b><br>" + KEYS.Get("io_yard2_warts_tip1") + "<br>" + KEYS.Get("io_yard2_warts_tip2"));
            }
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        return b;
    }

    /** (27 November) Jobs: a round button with a list on a scroll, and the queue's count. */
    private static ioJobsButton(): Sprite {
        let C: number = UI_WORKERS.IO_EXTRA_MIDDLE;
        let b: Sprite = new Sprite();
        b.name = "ioJobsBtn";
        b.buttonMode = true;
        b.mouseChildren = false;
        let g: any = b.graphics;
        g.lineStyle(2, 0xE0A040, 1);
        g.beginFill(0x4A2A08, 1);
        g.drawCircle(C, C, UI_WORKERS.IO_YARD_R);
        g.endFill();
        // (a parchment with three lines, each ticked)
        g.lineStyle(1, 0x6A4A20, 1);
        g.beginFill(0xF3E2BE, 1);
        g.drawRoundRect(C - 9, C - 11, 18, 22, 4, 4);
        g.endFill();
        for (let i: int = 0; i < 3; i++) {
            g.lineStyle(1.6, 0x3A2410, 1);
            g.moveTo(C - 2, C - 6 + i * 6);
            g.lineTo(C + 6, C - 6 + i * 6);
            g.lineStyle(1.6, 0xB02000, 1);
            g.moveTo(C - 7, C - 6 + i * 6);
            g.lineTo(C - 5.5, C - 4.5 + i * 6);
            g.lineTo(C - 3.5, C - 8 + i * 6);
        }
        let disc: Sprite = new Sprite();
        disc.name = "ioJobsDisc";
        disc.graphics.lineStyle(1, 0xFFF2C4, 1);
        disc.graphics.beginFill(0x1A0A00, 0.9);
        disc.graphics.drawCircle(0, 0, 8);
        disc.graphics.endFill();
        disc.x = C + 13;
        disc.y = C + 13;
        disc.visible = false;
        b.addChild(disc);
        let t: TextField = new TextField();
        t.name = "ioYard2Count";
        let f: TextFormat = new TextFormat("Verdana", 9, 0xFFF2C4, true);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = 22;
        t.height = 14;
        t.x = C + 2;
        t.y = C + 6;
        b.addChild(t);
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
            IoJobs.Show();
        });
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            let n: int = IoJobs.queued;
            UI_WORKERS.ioShowTip(b, "<b>" + KEYS.Get("io_jobs_title") + "</b><br>" + KEYS.Get(n > 0 ? "io_jobs_tip_queued" : "io_jobs_tip", { "v1": n }));
            // (it stands left of the column: the tip further left, clear of it)
            if (UI_WORKERS._popupmc) {
                UI_WORKERS._popupmc.x -= 2 * C + 6;
            }
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        return b;
    }

    /** A tip for the button, pointing at it from the left like the workers' own. */
    public static ioShowTip(param1: DisplayObject, param2: string): void {
        if (!param1 || !param1.stage) {
            return;
        }
        let p: Point = GLOBAL._layerUI.globalToLocal(param1.localToGlobal(new Point(UI_WORKERS.IO_EXTRA_MIDDLE, UI_WORKERS.IO_EXTRA_MIDDLE)));
        // as PopupShow, but the tip may have several lines (<br>): the bubble is sized for them
        UI_WORKERS.PopupHide();
        UI_WORKERS._popupID = -1;
        UI_WORKERS._popupmc = new bubblepopupRight();
        UI_WORKERS._popupmc.Setup(UI_WORKERS._mc ? (UI_WORKERS._mc.x - 5) | 0 : (p.x - 30) | 0, p.y | 0, "");
        UI_WORKERS._popupmc.Update(param2, param2.split("<br>").length);
        UI_WORKERS._popupmc.Nudge("left");
        UI_WORKERS._popupdo = GLOBAL._layerUI.addChild(UI_WORKERS._popupmc);
    }

    public static Setup(): void {
        let _loc1_: int = 0;
        let _loc2_: MovieClip = null;
        if (Boolean(UI_WORKERS._do) && Boolean(UI_WORKERS._do.parent)) {
            UI_WORKERS._do.parent.removeChild(UI_WORKERS._do);
            UI_WORKERS._do = null;
        }
        UI_WORKERS._mc = new MovieClip();
        UI_WORKERS._workers = [];
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            UI_WORKERS._maxWorkers = 5;
            if (!BASE.isMainYard) {
                UI_WORKERS._maxWorkers = GLOBAL.ioOutpostWorkers();
            }
            _loc1_ = 0;
            while (_loc1_ < UI_WORKERS._maxWorkers) {
                UI_WORKERS.ioAddSlot();
                _loc1_++;
            }
            UI_WORKERS.ioMoreSlots();
            UI_WORKERS._do = GLOBAL._layerUI.addChild(UI_WORKERS._mc);
        }
        UI_WORKERS.ioPlaceExtra();
        UI_WORKERS.Update();
        if (!UI2._showBottom) {
            UI_WORKERS.Hide();
        }
    }

    /**
     * (26 November) With a 6th and 7th worker the column is longer: on a short screen its buttons are moved closer
     * together (down to 36 apart, from 45) so that they and the buttons under them (Pick all warts, the events')
     * stay above the menu at the bottom (Buildings, Quests, Store, Map).
     */
    private static ioSpaceWorkers(): void {
        if (!UI_WORKERS._workers || !UI_WORKERS._mc) {
            return;
        }
        let step: number = UI_WORKERS._workerMCOffset;
        let n: int = UI_WORKERS._workers.length;
        if (GLOBAL.INFERNO_ONLY && n > 5) {
            try {
                let menu: DisplayObject = UI_BOTTOM._mc;
                if (menu && menu.stage && menu.visible && UI_WORKERS._mc.stage) {
                    let top: number = UI_WORKERS._mc.globalToLocal(new Point(0, menu.getBounds(menu.stage).y)).y;
                    let under: number = UI_WORKERS.IO_EXTRA_GAP;
                    for (let y of as3.values([UI_WORKERS._ioWartsBtn, UI_WORKERS._ioIceBtn])) {
                        if (y && y.visible) {
                            under += UI_WORKERS.IO_YARD_STEP;
                        }
                    }
                    for (let b of as3.values([UI_WORKERS._ioExtra0, UI_WORKERS._ioExtra, UI_WORKERS._ioExtraTot, UI_WORKERS._ioExtraFmi, UI_WORKERS._ioExtra2])) {
                        if (b && b.visible) {
                            under += 66;
                        }
                    }
                    let room: number = top - 20 - under - 46;
                    step = Math.max(36, Math.min(UI_WORKERS._workerMCOffset, Math.floor(room / Math.max(1, n - 1))));
                }
            } catch (e) {
            }
        }
        for (let i: int = 0; i < n; i++) {
            let y: number = 20 + i * step;
            if (UI_WORKERS._workers[i].mc.y != y) {
                UI_WORKERS._workers[i].mc.y = y;
            }
        }
    }

    /** One worker's button, under the ones there are. */
    private static ioAddSlot(): void {
        let i: int = UI_WORKERS._workers.length;
        let mc: MovieClip = GLOBAL.InfernoMode() ? new icon_worker_inferno() : new icon_worker();
        mc.y = 20 + i * UI_WORKERS._workerMCOffset;
        mc.mouseChildren = false;
        mc.addEventListener(MouseEvent.CLICK, UI_WORKERS.MouseClicked(i));
        mc.addEventListener(MouseEvent.MOUSE_OVER, UI_WORKERS.MouseOver(i));
        mc.addEventListener(MouseEvent.MOUSE_OUT, UI_WORKERS.MouseOut);
        mc.buttonMode = true;
        UI_WORKERS._mc.addChild(mc);
        UI_WORKERS._workers.push({ "purchased": false, "active": false, "id": 0, "message": "", "mc": mc });
    }

    /**
     * Inferno-only (26 November, 72's report from the right-click menu: "When you have a 6th worker (temporary from
     * store) he doesn't show here. And if you have a 7th (devils contract) he doesn't show either."): the main yard's
     * column had 5 buttons whatever the workers; the Apprentice (the Store's) and the Devil's Second Shift worker are
     * a 6th and a 7th in the queue. A button for each worker the queue has, made when one comes (true when one was).
     */
    private static ioMoreSlots(): boolean {
        if (!GLOBAL.INFERNO_ONLY || !UI_WORKERS._mc || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYard || !QUEUE._stack) {
            return false;
        }
        let added: boolean = false;
        while (UI_WORKERS._workers.length < QUEUE._stack.length) {
            UI_WORKERS.ioAddSlot();
            added = true;
        }
        UI_WORKERS._maxWorkers = UI_WORKERS._workers.length;
        return added;
    }

    private static MouseOver(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent = null): void => {
            let _loc3_: any = undefined;
            let _loc2_: any = UI_WORKERS._workers[i];
            if (_loc2_.purchased) {
                if (_loc2_.active) {
                    _loc3_ = _loc2_.message;
                } else {
                    _loc3_ = KEYS.Get("ui_worker_idle");
                }
            } else {
                _loc3_ = KEYS.Get("ui_worker_hire");
            }
            // (26 November: from the button's own place: the column can be closer together, ioSpaceWorkers)
            UI_WORKERS.PopupShow((UI_WORKERS._mc.x - 5) | 0, (UI_WORKERS._mc.y + _loc2_.mc.y - 20 + UI_WORKERS._workerMCOffset) | 0, as3.str(_loc3_), i);
        };
    }

    private static MouseOut(param1: MouseEvent): void {
        UI_WORKERS.PopupHide();
    }

    private static MouseClicked(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent = null): void => {
            if (UI_WORKERS._workers[i]) {
                if (GLOBAL.INFERNO_ONLY && UI_WORKERS._workers[i].purchased && UI_WORKERS.ioClick(i)) {
                    return;
                }
                if (UI_WORKERS._workers[i].purchased) {
                    QUEUE.JumpToWorker(i);
                } else {
                    STORE.ShowB(1, 0, ["BEW"]);
                }
            }
        };
    }

    public static Update(): void {
        let _loc3_: any = null;
        let _loc4_: any = null;
        let _loc1_: boolean = false;
        let _loc2_: int = 0;
        if (UI_WORKERS._workers && UI_WORKERS.ioMoreSlots()) {
            _loc1_ = true;
        }
        while (_loc2_ < UI_WORKERS._workers.length) {
            _loc3_ = UI_WORKERS._workers[_loc2_];
            if (Boolean(QUEUE._stack) && Boolean(QUEUE._stack[_loc2_])) {
                _loc4_ = QUEUE._stack[_loc2_];
                if (_loc3_.id != _loc4_.id) {
                    _loc3_.id = _loc4_.id;
                }
                _loc3_.message = "<b>" + _loc4_.title + "</b> " + _loc4_.message;
                if (!_loc3_.purchased) {
                    _loc3_.purchased = true;
                    _loc1_ = true;
                }
                if (_loc3_.active != _loc4_.active) {
                    _loc3_.active = _loc4_.active;
                    _loc1_ = true;
                }
                if (Boolean(_loc3_.active) && UI_WORKERS._popupID == _loc2_) {
                    UI_WORKERS.PopupUpdate(as3.str(_loc3_.message));
                }
            }
            _loc2_++;
        }
        if (_loc1_) {
            UI_WORKERS.Render();
        }
        if (GLOBAL.INFERNO_ONLY) {
            UI_WORKERS.ioTimes();
            // (QoL #25, #589: the runs of picks go on as workers come free; their buttons kept current)
            MUSHROOMS.ioYardTick();
            UI_WORKERS.ioYardButtons();
        }
        UI_WORKERS.Resize();
    }

    /** The building a worker's job is on (not a wart), or null. */
    private static ioJobBuilding(i: int): BFOUNDATION {
        let job: any = QUEUE._stack ? QUEUE._stack[i] : null;
        let b: BFOUNDATION = job && job.active ? as3.as(job.building, BFOUNDATION) : null;
        return b && b._type != 7 ? b : null;
    }

    /**
     * Inferno-only (QoL #17): a worker's click goes to the building it works on (the camera there, its panel open:
     * Speed up a click away); an idle worker's opens the build menu. A job with the free time or less left is
     * finished there and then (QoL #15). False: as before (to the worker, as for a wart).
     */
    private static ioClick(i: int): boolean {
        let slot: any = UI_WORKERS._workers[i];
        if (!slot.active) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                BUILDINGS.Show();
                return true;
            }
            return false;
        }
        let b: BFOUNDATION = UI_WORKERS.ioJobBuilding(i);
        if (!b) {
            return false;
        }
        let left: int = BUILDINGINFO.ioJobLeft(b);
        if (left > 0 && left <= GLOBAL.ioCloseEnough) {
            GLOBAL._selectedBuilding = b;
            STORE.CalcCost("SP1");
            STORE.BuyB("SP1");
            return true;
        }
        MAP.FocusTo(b._mc.x | 0, b._mc.y | 0, 0.5);
        BASE.BuildingSelect(b);
        return true;
    }

    /** Inferno-only (QoL #16): the time left under each busy worker ("Free" once it can be finished for nothing). */
    private static ioTimes(): void {
        for (let i: int = 0; i < UI_WORKERS._workers.length; i++) {
            let slot: any = UI_WORKERS._workers[i];
            let mc: MovieClip = slot.mc;
            let label: TextField = as3.as(mc.getChildByName("ioWorkerTime"), TextField);
            let b: BFOUNDATION = slot.purchased ? UI_WORKERS.ioJobBuilding(i) : null;
            let left: int = b ? BUILDINGINFO.ioJobLeft(b) : 0;
            if (left <= 0) {
                if (label) {
                    label.visible = false;
                }
                continue;
            }
            if (!label) {
                label = new TextField();
                label.name = "ioWorkerTime";
                let f: TextFormat = new TextFormat("Verdana", 9, 0xFFF4E0, true);
                f.align = TextFormatAlign.CENTER;
                label.defaultTextFormat = f;
                label.selectable = false;
                label.mouseEnabled = false;
                label.width = 48;
                label.height = 14;
                label.x = -4;
                label.y = 29;
                label.filters = [new GlowFilter(0x000000, 1, 3, 3, 8, 1)];
                mc.addChild(label);
            }
            let free: boolean = left <= GLOBAL.ioCloseEnough;
            let text: string = free ? KEYS.Get("io_worker_free_label") : GLOBAL.ioDuration(left);
            if (label.text != text) {
                label.text = text;
            }
            label.textColor = (free ? 0x9CFF6A : 0xFFF4E0) >>> 0;
            label.visible = true;
        }
    }

    public static Resize(): void {
        let _loc1_: int = 0;
        if (!Chat.flagsShouldChatDisplay() && UI_WORKERS._canUseHorizontal) {
            if (UI_WORKERS._mc) {
                UI_WORKERS._mc.x = GLOBAL._SCREEN.x;
                UI_WORKERS._mc.y = GLOBAL._SCREEN.bottom - 52;
            }
        } else if (UI_WORKERS._mc) {
            UI_WORKERS._mc.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - UI_WORKERS._workerMCOffset;
            _loc1_ = !(!UI2._wildMonsterBar) ? 20 : 0;
            UI_WORKERS._mc.y = GLOBAL._SCREEN.top + 50 + _loc1_ + 30 * UI2.TimersVisible();
        }
        UI_WORKERS.ioPlaceExtra();
    }

    private static Render(): void {
        let _loc2_: any = null;
        let _loc1_: int = 0;
        while (_loc1_ < UI_WORKERS._maxWorkers) {
            _loc2_ = UI_WORKERS._workers[_loc1_];
            if (_loc2_.purchased) {
                if (_loc2_.active) {
                    _loc2_.mc.gotoAndStop(2);
                } else {
                    _loc2_.mc.gotoAndStop(1);
                }
                if (STORE._storeData.BST) {
                    _loc2_.mc.mcIcon.gotoAndStop(2);
                } else {
                    _loc2_.mc.mcIcon.gotoAndStop(1);
                }
            } else {
                _loc2_.mc.gotoAndStop(3);
                _loc2_.mc.label_txt.htmlText = "<b>" + KEYS.Get("ui_worker_hireicon") + "</b>";
            }
            // Inferno-only (10 October): no worker to hire here (every one is there from the start), so a slot
            // left by a sacrificed worker is not shown
            _loc2_.mc.visible = !GLOBAL.INFERNO_ONLY || Boolean(_loc2_.purchased);
            _loc1_++;
        }
    }

    /** Inferno-only: a worker went (IoWorkerFun, sacrificed): the slots shown again from the queue. */
    public static ioRefresh(): void {
        let i: int = 0;
        while (UI_WORKERS._workers && i < UI_WORKERS._workers.length) {
            let slot: any = UI_WORKERS._workers[i];
            let job: any = QUEUE._stack ? QUEUE._stack[i] : null;
            slot.purchased = Boolean(job);
            slot.active = job ? Boolean(job.active) : false;
            i++;
        }
        UI_WORKERS.Render();
        UI_WORKERS.Update();
    }

    public static PopupShow(param1: int, param2: int, param3: string, param4: int): void {
        UI_WORKERS.PopupHide();
        UI_WORKERS._popupID = param4;
        UI_WORKERS._popupmc = new bubblepopupRight();
        UI_WORKERS._popupmc.Setup(param1, param2, param3);
        UI_WORKERS._popupmc.Nudge("left");
        UI_WORKERS._popupdo = GLOBAL._layerUI.addChild(UI_WORKERS._popupmc);
    }

    public static PopupUpdate(param1: string): void {
        if (UI_WORKERS._popupmc) {
            UI_WORKERS._popupmc.Update(param1);
        } else if (UI_WORKERS._popupmc2) {
            UI_WORKERS._popupmc2.Update(param1);
        }
    }

    public static PopupHide(): void {
        if (UI_WORKERS._popupdo) {
            if (UI_WORKERS._popupdo.parent == GLOBAL._layerUI) {
                GLOBAL._layerUI.removeChild(UI_WORKERS._popupdo);
            }
            UI_WORKERS._popupdo = null;
        }
    }

    public static Show(): void {
        if (TUTORIAL._stage < 192) {
            UI_WORKERS._mc.visible = false;
        } else {
            UI_WORKERS._mc.visible = true;
        }
    }

    public static Hide(): void {
        UI_WORKERS._mc.visible = false;
    }
}
