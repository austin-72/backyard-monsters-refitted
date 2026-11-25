import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { System } from "flash/system";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { ByteArray } from "flash/utils";
import { ALLIANCES, BASE, Base64, BasePlannerPopup, BasePlannerTransferRow, BaseTemplate, BYMChat, Chat, GLOBAL, GRID, IoMapUi, IoTd, IoTextPrompt, KEYS, PLANNER, PlannerTemplate, POPUPSETTINGS, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom, frame_CLIP } from "@game";

/**
 * Inferno-only (15 October): Yard Planner layouts in and out of the planner.
 *
 * - QoL #673: "Copy this layout" from a visited yard (CopyVisitedLayout, for IoVisitUi's panel): its buildings as the
 *   planner's Import code (Export's "BYML1:" and base64 of [[type, x, y], ...]), without traps or decorations, put on
 *   the clipboard and kept for the next Import.
 * - QoL #686: Import from the player's own layouts (ShowChooser): this yard's slots, the other yards' slots (the main
 *   yard and every outpost: bm/yardplanner/layoutsources), the player kits (worldmapv2/playerkits), layouts copied or
 *   opened from chat this session, and the slots' earlier versions.
 * - QoL #688: Export's "Share" puts a layout in chat as [layout:KEY|Name|N] (the code kept on the server under KEY:
 *   bm/yardplanner/sharelayout); the pill (IoMapShare) opens the planner's Import with it (OpenShared).
 * - QoL #693: the same chooser picks a plan to Compare with (BasePlannerPopup.ioStartCompare).
 * - QoL #685: which buildings can be planned ahead (GhostTypes), and their sizes (GhostSize).
 * - QoL #492: Restore a slot's or a kit's earlier version (kept 7 days on the server).
 */
export class IoPlanShare extends ASObject {
    public static readonly PREFIX: string = "BYML1:";

    /** A shared layout in chat: [layout:KEY|Name|212]. */
    public static readonly TOKEN_START: string = "[layout:";

    public static readonly TOKEN: RegExp = /\[layout:([0-9a-zA-Z]{6,16})\|([0-9A-Za-z_. -]{1,16})\|(\d{1,4})\]/g;

    /** A copied or opened layout waits this long for the next Import (ms). */
    private static readonly PENDING_MS: number = 30 * 60 * 1000;

    /** Footprint edges (yard units) of a kind with none in the yard to measure: each building class's _footprint. */
    private static readonly SIZES: any = { 1: 70, 2: 70, 3: 70, 4: 70, 5: 90, 6: 80, 8: 100, 9: 80, 10: 100, 11: 90, 12: 70, 13: 100, 14: 130, 15: 160, 16: 100, 17: 20, 21: 70, 24: 20, 26: 80, 51: 90, 112: 130, 128: 160, 129: 70, 130: 70, 132: 70, 144: 70, 145: 70 };

    private static readonly ROWS_PER_PAGE: int = 8;

    /** Layouts copied from visits or opened from chat this session: { label, code, count }. */
    private static _recent: any[] = [];

    /** The last copied or opened code, for the next Import: { code, at }. */
    private static _pending: any = null;

    /** The chooser (or the planning chooser) while it is up. */
    private static _win: Sprite = null;

    private static _winClose: Function = null;

    public $ctor(): void {
        super.$ctor();
    }

    // ---- the code
    /** The Import code of rows [type, x, y, ...]. */
    public static Encode(rows: any[]): string {
        let out: any[] = [];
        for (let row of as3.values(rows)) {
            out.push([row[0] | 0, row[1] | 0, row[2] | 0]);
        }
        return IoPlanShare.PREFIX + Base64.encode(JSON.stringify(out));
    }

    /** The rows of an Import code, or null when it isn't one. */
    public static Decode(text: string): any[] {
        try {
            text = String(text || "").replace(/\s+/g, "");
            if (text.indexOf(IoPlanShare.PREFIX) != 0) {
                return null;
            }
            let bytes: ByteArray = Base64.decodeToByteArray(text.substr(IoPlanShare.PREFIX.length));
            bytes.position = 0;
            let rows: any[] = as3.as(JSON.parse(bytes.readUTFBytes(bytes.length)), Array);
            return rows && rows.length ? rows : null;
        } catch (e) {
        }
        return null;
    }

    /** A saved layout's places: [type, x, y, id] (the planned ones, QoL #685, left out). */
    public static TemplateRows(param1: BaseTemplate): any[] {
        let out: any[] = [];
        for (let n of (param1 && param1.nodes ? param1.nodes : [])) {
            if (n && n.type > 0 && n.id != PlannerTemplate.IO_GHOST_ID) {
                out.push([n.type | 0, n.x | 0, n.y | 0, n.id >>> 0]);
            }
        }
        return out;
    }

    /** A player kit's places: [type, x, y] (its buildings' X and Y are the planner's units). */
    public static KitRows(param1: any): any[] {
        let out: any[] = [];
        if (param1 && param1.buildings) {
            for (let key in param1.buildings) {
                let b: any = param1.buildings[key];
                if (b && (b.t | 0) > 0 && isFinite(Number(b.X)) && isFinite(Number(b.Y))) {
                    out.push([b.t | 0, Number(b.X) | 0, Number(b.Y) | 0]);
                }
            }
        }
        return out;
    }

    /**
     * The yard on screen as rows [type, x, y]: every building the planner would show, but not decorations, the tribe's
     * own, the misc row, nor (unless withTraps) traps.
     */
    public static YardRows(withTraps: boolean): any[] {
        let out: any[] = [];
        for (let b of (BASE.getYardPlannerBuildings() ?? [])) {
            if (!b || b === GLOBAL._newBuilding || BASE.isBuildingIgnoredInYardPlannerSave(b)) {
                continue;
            }
            let props: any = GLOBAL._buildingProps[b._type - 1];
            if (!props) {
                continue;
            }
            let group: int = props.group | 0;
            if (group < 1 || group > 3 || props.type == "decoration") {
                continue;
            }
            if (!withTraps && props.type == "trap") {
                continue;
            }
            let at: Point = GRID.FromISO(b.x, b.y);
            out.push([b._type | 0, at.x | 0, at.y | 0]);
        }
        return out;
    }

    private static clipboard(code: string): void {
        try {
            System.setClipboard(code);
        } catch (e) {
        }
    }

    /** Kept for the chooser's "Copied and shared" tab and the next Import. */
    public static Remember(code: string, label: string, count: int): void {
        let kept: any[] = [{ "label": label, "code": code, "count": count }];
        for (let r of IoPlanShare._recent) {
            if (r.code != code && kept.length < 8) {
                kept.push(r);
            }
        }
        IoPlanShare._recent = kept;
        IoPlanShare._pending = { "code": code, "at": new Date().getTime() };
    }

    /** The code copied or opened in the last half hour, once (Import's box starts with it). */
    public static TakePending(): string {
        let p: any = IoPlanShare._pending;
        IoPlanShare._pending = null;
        if (p && new Date().getTime() - Number(p.at) < IoPlanShare.PENDING_MS) {
            return String(p.code);
        }
        return "";
    }

    // ---- QoL #673: Copy this layout (a visited yard's panel)
    /** The visited yard's layout, without its traps, as an Import code: on the clipboard and kept for Import. */
    public static CopyVisitedLayout(e: MouseEvent = null): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        let rows: any[] = IoPlanShare.YardRows(false);
        if (!rows.length) {
            GLOBAL.Message(KEYS.Get("io_plan3_copy_none"));
            return;
        }
        let code: string = IoPlanShare.Encode(rows);
        IoPlanShare.clipboard(code);
        let owner: string = String(BASE._ownerName || KEYS.Get("io_plan3_someone"));
        IoPlanShare.Remember(code, KEYS.Get("io_plan3_from_visit", { "v1": owner }), rows.length);
        GLOBAL.Message(KEYS.Get("io_plan3_copied", { "v1": rows.length, "v2": IoPlanShare.html(owner) }));
    }

    private static html(param1: string): string {
        return String(param1 || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ---- QoL #688: a layout in chat
    /** A name as a chat token carries it: letters, digits, space . _ - (16 at most). */
    public static CleanName(param1: string): string {
        let s: string = String(param1 || "").replace(/[^0-9A-Za-z_. -]/g, "").replace(/ {2,}/g, " ").replace(/^\s+|\s+$/g, "").substr(0, 16);
        return s || "Layout";
    }

    public static Token(key: string, name: string, count: int): string {
        return IoPlanShare.TOKEN_START + key + "|" + IoPlanShare.CleanName(name) + "|" + Math.max(0, Math.min(9999, count | 0)) + "]";
    }

    /** The pill's words: "Layout: Name · 212" (non-breaking spaces: one line). */
    public static PillLabel(name: any, count: any): string {
        return KEYS.Get("io_plan3_pill", { "v1": String(name || "Layout"), "v2": String(Number(count) | 0) }).split(" ").join(" ");
    }

    /** Export's "Share": the code kept on the server under a short key, then [layout:KEY|Name|N] posted in chat. */
    public static ShareInChat(code: string, name: string, count: int, mode: string, onDone: Function = null): void {
        new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/sharelayout", [["code", code], ["name", IoPlanShare.CleanName(name)]], (r: any): void => {
            if (!r || r.error || !r.key) {
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_plan3_share_failed"));
                return;
            }
            let token: string = IoPlanShare.Token(String(r.key), name, (Number(r.count) || count) | 0);
            let error: string = Chat._bymChat ? Chat._bymChat.ioShareLocation(mode, token) : KEYS.Get("io_plan3_chat_off");
            if (error) {
                GLOBAL.Message(error);
                return;
            }
            if (onDone != null) {
                onDone();
            }
            GLOBAL.Message(KEYS.Get(mode == BYMChat.IO_ALLIANCE ? "io_plan3_shared_alliance" : "io_plan3_shared_global"));
        }, (e: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("io_plan3_share_failed"));
        });
    }

    /** A [layout:...] pill clicked: the layout read from the server, then the planner's Import opened with it. */
    public static OpenShared(key: string): void {
        new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/sharedlayout", [["key", key]], (r: any): void => {
            if (!r || r.error || !r.code) {
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_plan3_shared_gone"));
                return;
            }
            let code: string = String(r.code);
            let rows: any[] = IoPlanShare.Decode(code);
            if (!rows) {
                GLOBAL.Message(KEYS.Get("io_plan3_shared_gone"));
                return;
            }
            IoPlanShare.Remember(code, KEYS.Get("io_plan3_from_chat", { "v1": String(r.name || "Layout") }), rows.length);
            IoPlanShare.OpenImport(code);
        }, (e: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("io_plan3_shared_gone"));
        });
    }

    /** Whether the planner can be opened here and now (one's own yard, nothing else going on). */
    public static CanOpenPlanner(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE._loading && !BASE.ioAttackRunning() && !IoTd.on && !MapRoom._open;
    }

    /** The planner's Import with this code in its box (the planner opened first when it can be); else said to wait. */
    public static OpenImport(code: string): void {
        let popup: BasePlannerPopup = IoPlanShare.popup();
        if (!popup && !PLANNER._open && IoPlanShare.CanOpenPlanner()) {
            PLANNER.Show();
            popup = IoPlanShare.popup();
        }
        if (popup) {
            IoPlanShare._pending = null;
            popup.ioShowImport(code);
            return;
        }
        GLOBAL.Message(KEYS.Get("io_plan3_open_later"));
    }

    private static popup(): BasePlannerPopup {
        return PLANNER._open && PLANNER.basePlanner && PLANNER.basePlanner.popup && PLANNER.basePlanner.popup.designView ? PLANNER.basePlanner.popup : null;
    }

    // ---- the Import and Export windows' extra buttons
    /** (QoL #686) Import's "My layouts...", left of its Import button: the chooser instead. */
    public static AddImportChooser(prompt: IoTextPrompt): void {
        if (!prompt) {
            return;
        }
        let b: MovieClip = IoMapUi.button(KEYS.Get("io_plan3_my_layouts"), 120, 34, (e: MouseEvent): void => {
            IoPlanShare.closePrompt(prompt);
            IoPlanShare.ShowChooser("import");
        }, "grey", 11);
        b.name = "ioPlan3ImportFrom";
        b.x = -200;
        b.y = 53;
        GLOBAL.ioFitText(as3.as(b.getChildAt(b.numChildren - 1), TextField), 8);
        prompt.addChild(b);
    }

    /** (QoL #688) Export's "Share: Global" and "Share: Alliance", either side of its OK. */
    public static AddExportShare(prompt: IoTextPrompt, code: string, name: string, count: int): void {
        if (!prompt) {
            return;
        }
        let specs: any[] = [["io_plan3_share_global", "ioPlan3ShareGlobal", BYMChat.IO_GLOBAL, -200], ["io_plan3_share_alliance", "ioPlan3ShareAlliance", BYMChat.IO_ALLIANCE, 80]];
        for (let spec of specs) {
            let mode: string = String(spec[2]);
            let b: any = IoMapUi.button(KEYS.Get(String(spec[0])), 120, 34, (e: MouseEvent): void => {
                IoPlanShare.ShareInChat(code, name, count, mode, (): void => {
                    IoPlanShare.closePrompt(prompt);
                });
            }, "grey", 11);
            b.name = String(spec[1]);
            b.x = Number(spec[3]);
            b.y = 53;
            GLOBAL.ioFitText(b.getChildAt(b.numChildren - 1), 8);
            if (mode == BYMChat.IO_ALLIANCE && !(ALLIANCES._allianceID > 0)) {
                b.setEnabled(false);
            }
            prompt.addChild(b);
        }
    }

    /** An IoTextPrompt closed as its own Cancel does. */
    private static closePrompt(prompt: IoTextPrompt): void {
        let p: any = prompt;
        if (p && typeof p.onCancel == "function") {
            p.onCancel(null);
        } else if (prompt && prompt.parent) {
            prompt.parent.removeChild(prompt);
            GLOBAL.BlockerRemove();
        }
    }

    // ---- QoL #685: planning buildings not built yet
    /** A kind's footprint (yard units): one of them in the yard, or the class's size. */
    public static GhostSize(type: int): Point {
        for (let b of (BASE.getYardPlannerBuildings() ?? [])) {
            if (b && b._type == type && b._footprint && b._footprint[0] && b._footprint[0].width > 0) {
                return new Point(Number(b._footprint[0].width), Number(b._footprint[0].height));
            }
        }
        let s: number = Number(IoPlanShare.SIZES[type] || 70);
        return new Point(s, s);
    }

    /** The most of a kind this yard can ever have (its largest quantity, at any hall level), 0: none. */
    private static mostOf(props: any): int {
        let q: any = props ? props.quantity : null;
        if (as3.is(q, Array) && q.length) {
            return Math.max.apply(Math, q) | 0;
        }
        return Number(q) | 0;
    }

    /** How many more of a kind can be planned: the most the yard can have, less those on the plan, in its storage or planned. */
    public static GhostRoom(type: int, template: PlannerTemplate): int {
        let props: any = GLOBAL._buildingProps[type - 1];
        if (!IoPlanShare.ghostable(type, props) || !template) {
            return 0;
        }
        let have: int = 0;
        for (let n of (template.displayData ?? [])) {
            if (n && n.type == type) {
                have++;
            }
        }
        for (let n of (template.inventoryData ?? [])) {
            if (n && n.type == type) {
                have++;
            }
        }
        for (let g of (template.ioGhosts ?? [])) {
            if (g && g.type == type) {
                have++;
            }
        }
        return Math.max(0, IoPlanShare.mostOf(props) - have) | 0;
    }

    /** A kind that can be planned: a building, tower, wall or trap the yard can build (not its hall, not a decoration). */
    private static ghostable(type: int, props: any): boolean {
        if (!props || props.cls == null || type == 7 || type == 14 || type == 112) {
            return false;
        }
        let group: int = props.group | 0;
        if (group < 1 || group > 3 || props.type == "decoration" || props.type == "enemy" || props.block) {
            return false;
        }
        if (BASE.isOutpost && !GLOBAL.ioOutpostBuildable(type)) {
            return false;
        }
        return IoPlanShare.mostOf(props) > 0;
    }

    /** The kinds that can be planned now: [type, name, room]. */
    public static GhostTypes(template: PlannerTemplate): any[] {
        let out: any[] = [];
        let props: any[] = GLOBAL._buildingProps || [];
        for (let i: int = 0; i < props.length; i++) {
            let type: int = (i + 1) | 0;
            let room: int = IoPlanShare.GhostRoom(type, template);
            if (room > 0) {
                out.push([type, KEYS.Get(String(props[i].name)), room]);
            }
        }
        return out;
    }

    /** The planning chooser: which kind to plan (Plan, then a click on the plan puts it there). */
    public static ShowGhostChooser(): void {
        let popup: BasePlannerPopup = IoPlanShare.popup();
        if (!popup) {
            return;
        }
        IoPlanShare.openList(KEYS.Get("io_plan3_ghost_title"), [], "", (tab: string, done: Function): void => {
            let rows: any[] = [];
            for (let t of IoPlanShare.GhostTypes(popup.ioTemplate)) {
                let type: int = t[0] | 0;
                rows.push({ "title": String(t[1]), "sub": KEYS.Get("io_plan3_ghost_room", { "v1": t[2] }), "buttons": [[KEYS.Get("io_plan3_ghost_plan"), "ioPlan3GhostPick_" + type, (): void => {
                    IoPlanShare.HideChooser();
                    let p: BasePlannerPopup = IoPlanShare.popup();
                    if (p) {
                        p.ioStartGhost(type);
                    }
                }, "gold"]] });
            }
            done(rows, rows.length ? KEYS.Get("io_plan3_ghost_note") : KEYS.Get("io_plan3_ghost_none"));
        });
    }

    // ---- QoL #686, #693, #492: the chooser
    /**
     * The player's layouts, by tab: "here" (this yard's slots), "yards" (the other yards' slots), "kits", "shared" (copied
     * and opened this session), "previous" (the slots' and kits' earlier versions, with Restore). mode "import": a pick goes
     * into the plan as Import does; "compare": it is shown over the plan.
     */
    public static ShowChooser(mode: string, tab: string = "here"): void {
        if (!IoPlanShare.popup()) {
            return;
        }
        let compare: boolean = mode == "compare";
        let tabs: any[] = [["here", KEYS.Get("io_plan3_tab_here")], ["yards", KEYS.Get("io_plan3_tab_yards")], ["kits", KEYS.Get("io_plan3_tab_kits")], ["shared", KEYS.Get("io_plan3_tab_shared")], ["previous", KEYS.Get("io_plan3_tab_previous")]];
        IoPlanShare.openList(KEYS.Get(compare ? "io_plan3_compare_title" : "io_plan3_import_title"), tabs, tab, (which: string, done: Function): void => {
            IoPlanShare.loadTab(which, compare, done);
        });
    }

    public static HideChooser(): void {
        if (IoPlanShare._winClose != null) {
            IoPlanShare._winClose();
        }
    }

    /** Is the chooser up (the planner's arrow keys wait). */
    public static get ChooserUp(): boolean {
        return IoPlanShare._win != null && IoPlanShare._win.parent != null;
    }

    /** A pick: Import's or Compare's. */
    private static pick(compare: boolean, rows: any[], label: string): void {
        IoPlanShare.HideChooser();
        let popup: BasePlannerPopup = IoPlanShare.popup();
        if (!popup || !rows || !rows.length) {
            return;
        }
        if (PLANNER.basePlanner) {
            PLANNER.basePlanner.ioCloseTransfer();
        }
        if (compare) {
            popup.ioStartCompare(rows, label);
        } else {
            popup.ioImportCode(IoPlanShare.Encode(rows));
        }
    }

    private static pickLabel(compare: boolean): string {
        return KEYS.Get(compare ? "io_plan3_compare" : "io_plan3_import");
    }

    private static slotTitle(slot: int, name: string): string {
        return KEYS.Get("io_plan3_slot", { "v1": slot + 1 }) + (name ? " · " + name : "");
    }

    private static when(seconds: number): string {
        return seconds > 0 ? BasePlannerTransferRow.ioDay(seconds) : "";
    }

    /** A yard's slots from the server (gettemplates for that yard): BaseTemplate by slot, or null on a failure. */
    private static fetchSlots(baseid: string, done: Function): void {
        new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/gettemplates", [["baseid", baseid]], (r: any): void => {
            if (!r || r.error) {
                done(null);
                return;
            }
            let out: any = {};
            for (let t of as3.values(r)) {
                if (as3.is(t, Number) || !t || t.data == null) {
                    continue;
                }
                try {
                    let bt: BaseTemplate = new BaseTemplate(as3.str(t.name));
                    bt.slot = t.slotid >>> 0;
                    bt.savedAt = Number(t.saved) || 0;
                    bt.ioFrom = t.from != null ? String(t.from) : "";
                    bt.importData(JSON.parse(as3.str(t.data)));
                    out[String(bt.slot)] = bt;
                } catch (e) {
                }
            }
            done(out);
        }, (e: IOErrorEvent): void => {
            done(null);
        });
    }

    private static loadTab(which: string, compare: boolean, done: Function): void {
        let here: string = String(BASE._loadedBaseID);
        let action: string = IoPlanShare.pickLabel(compare);
        if (which == "here") {
            let list: any = PLANNER.basePlanner ? PLANNER.basePlanner.ioTemplates : null;
            let fill: Function = (byslot: any): void => {
                let rows: any[] = [];
                for (let slot: int = 0; slot < 10; slot++) {
                    let t: BaseTemplate = byslot ? as3.as(byslot[String(slot)], BaseTemplate) : null;
                    if (!t || BasePlannerTransferRow.ioIsEmpty(t)) {
                        continue;
                    }
                    let rowsOf: any[] = IoPlanShare.TemplateRows(t);
                    // (12 November: a shared outpost slot saved in another outpost: its ids are that outpost's, so by kind and place only)
                    if (t.ioFromElsewhere) {
                        rowsOf = rowsOf.map((r: any[]): any[] => [r[0], r[1], r[2]]);
                    }
                    let label: string = IoPlanShare.slotTitle(slot, t.name);
                    rows.push({ "title": label, "sub": KEYS.Get("io_plan3_count", { "v1": rowsOf.length }) + (t.savedAt > 0 ? " · " + IoPlanShare.when(t.savedAt) : ""), "buttons": [[action, "ioPlan3Pick_here_" + slot, (): void => {
                        IoPlanShare.pick(compare, rowsOf, label);
                    }, "gold"]] });
                }
                done(rows, rows.length ? "" : KEYS.Get("io_plan3_none_here"));
            };
            if (list) {
                let byslot: any = {};
                for (let i: int = 0; i < list.length; i++) {
                    byslot[String(i)] = as3.vget(list, i);
                }
                fill(byslot);
            } else {
                IoPlanShare.fetchSlots(here, (byslot: any): void => {
                    if (!byslot) {
                        done([], KEYS.Get("io_plan3_load_failed"));
                        return;
                    }
                    fill(byslot);
                });
            }
            return;
        }
        if (which == "yards") {
            new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/layoutsources", [["v", "1"]], (r: any): void => {
                if (!r || r.error || !as3.is(r.yards, Array)) {
                    done([], r && r.error ? String(r.error) : KEYS.Get("io_plan3_load_failed"));
                    return;
                }
                let rows: any[] = [];
                for (let y of as3.values(r.yards)) {
                    if (!y || String(y.baseid) == here || !as3.is(y.slots, Array)) {
                        continue;
                    }
                    // (12 November: the outposts share their slots: in an outpost they are this yard's, under "here")
                    if (y.kind == "outposts" && BASE.isOutpost) {
                        continue;
                    }
                    let yard: string = y.kind == "outposts" ? KEYS.Get("io_plan4_outposts") : y.kind == "main" ? KEYS.Get("io_plan3_main_yard") : KEYS.Get("io_plan3_outpost", { "v1": y.x != null ? IoMapUi.coord(y.x | 0, y.y | 0) : "" }) + (y.name ? " (" + String(y.name) + ")" : "");
                    let baseid: string = String(y.baseid);
                    for (let s of as3.values(y.slots)) {
                        let slot: int = s.slotid | 0;
                        let label: string = yard + " · " + IoPlanShare.slotTitle(slot, String(s.name || ""));
                        rows.push({ "title": label, "sub": KEYS.Get("io_plan3_count", { "v1": s.count | 0 }) + (s.saved > 0 ? " · " + IoPlanShare.when(Number(s.saved)) : ""), "buttons": [[action, "ioPlan3Pick_" + baseid + "_" + slot, (): void => {
                            IoPlanShare.status(KEYS.Get("msg_loading"));
                            IoPlanShare.fetchSlots(baseid, (byslot: any): void => {
                                let t: BaseTemplate = byslot ? as3.as(byslot[String(slot)], BaseTemplate) : null;
                                if (!t) {
                                    IoPlanShare.status(KEYS.Get("io_plan3_load_failed"));
                                    return;
                                }
                                // (another yard's building ids aren't this yard's: by kind and place only)
                                let plain: any[] = [];
                                for (let row of IoPlanShare.TemplateRows(t)) {
                                    plain.push([row[0], row[1], row[2]]);
                                }
                                IoPlanShare.pick(compare, plain, label);
                            });
                        }, "gold"]] });
                    }
                }
                done(rows, rows.length ? "" : KEYS.Get("io_plan3_none_yards"));
            }, (e: IOErrorEvent): void => {
                done([], KEYS.Get("io_plan3_load_failed"));
            });
            return;
        }
        if (which == "kits") {
            new URLLoaderApi().load(GLOBAL._mapURL + "playerkits", [], (r: any): void => {
                if (!r || r.error || !as3.is(r.kits, Array)) {
                    done([], r && r.error ? String(r.error) : KEYS.Get("io_plan3_load_failed"));
                    return;
                }
                let rows: any[] = [];
                for (let i: int = 0; i < r.kits.length; i++) {
                    let kit: any = r.kits[i];
                    if (!kit || !kit.buildings) {
                        continue;
                    }
                    let rowsOf: any[] = IoPlanShare.KitRows(kit);
                    let label: string = KEYS.Get("io_plan3_kit", { "v1": i + 1 }) + (kit.name ? " · " + String(kit.name) : "");
                    rows.push({ "title": label, "sub": KEYS.Get("io_plan3_count", { "v1": rowsOf.length }) + (kit.savedAt > 0 ? " · " + IoPlanShare.when(Number(kit.savedAt)) : ""), "buttons": [[action, "ioPlan3Pick_kit_" + (i + 1), (): void => {
                        IoPlanShare.pick(compare, rowsOf, label);
                    }, "gold"]] });
                }
                done(rows, rows.length ? "" : KEYS.Get("io_plan3_none_kits"));
            }, (e: IOErrorEvent): void => {
                done([], KEYS.Get("io_plan3_load_failed"));
            });
            return;
        }
        if (which == "shared") {
            let rows: any[] = [];
            let i: int = 0;
            for (let r of IoPlanShare._recent) {
                let code: string = String(r.code);
                let label: string = String(r.label);
                rows.push({ "title": label, "sub": KEYS.Get("io_plan3_count", { "v1": r.count | 0 }), "buttons": [[action, "ioPlan3Pick_shared_" + i, (): void => {
                    IoPlanShare.pick(compare, IoPlanShare.Decode(code), label);
                }, "gold"]] });
                i++;
            }
            done(rows, rows.length ? "" : KEYS.Get("io_plan3_none_shared"));
            return;
        }
        // (QoL #492) the earlier versions, kept 7 days
        new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/previous", [["baseid", BASE._loadedBaseID]], (r: any): void => {
            if (!r || r.error) {
                done([], r && r.error ? String(r.error) : KEYS.Get("io_plan3_load_failed"));
                return;
            }
            let rows: any[] = [];
            let canSave: boolean = BasePlannerTransferRow.ioSlotButtons;
            for (let s of as3.values(as3.as(r.slots, Array) || [])) {
                let slot: int = s.slotid | 0;
                let rowsOf: any[] = [];
                try {
                    let bt: BaseTemplate = new BaseTemplate();
                    bt.importData(JSON.parse(as3.str(s.data)));
                    rowsOf = IoPlanShare.TemplateRows(bt);
                } catch (e) {
                }
                let label: string = IoPlanShare.slotTitle(slot, String(s.name || "")) + " " + KEYS.Get("io_plan3_earlier");
                let buttons: any[] = [];
                if (rowsOf.length) {
                    buttons.push([action, "ioPlan3Pick_prev_" + slot, (): void => {
                        IoPlanShare.pick(compare, rowsOf, label);
                    }, "gold"]);
                }
                if (canSave) {
                    buttons.push([KEYS.Get("io_plan3_restore"), "ioPlan3Restore_" + slot, (): void => {
                        IoPlanShare.RestoreSlot(slot);
                    }, "grey"]);
                }
                rows.push({ "title": label, "sub": KEYS.Get("io_plan3_replaced", { "v1": IoPlanShare.when(Number(s.at)), "v2": IoPlanShare.when(Number(s.until)) }) + (rowsOf.length ? " · " + KEYS.Get("io_plan3_count", { "v1": rowsOf.length }) : ""), "buttons": buttons });
            }
            for (let k of as3.values(as3.as(r.kits, Array) || [])) {
                let kslot: int = k.slot | 0;
                rows.push({ "title": KEYS.Get("io_plan3_kit", { "v1": kslot }) + (k.name ? " · " + String(k.name) : "") + " " + KEYS.Get("io_plan3_earlier"), "sub": KEYS.Get("io_plan3_replaced", { "v1": IoPlanShare.when(Number(k.at)), "v2": IoPlanShare.when(Number(k.until)) }) + " · " + KEYS.Get("io_plan3_count", { "v1": k.count | 0 }), "buttons": [[KEYS.Get("io_plan3_restore"), "ioPlan3RestoreKit_" + kslot, (): void => {
                    IoPlanShare.RestoreKit(kslot);
                }, "grey"]] });
            }
            done(rows, rows.length ? KEYS.Get("io_plan3_prev_note", { "v1": r.days || 7 }) : KEYS.Get("io_plan3_none_prev", { "v1": r.days || 7 }));
        }, (e: IOErrorEvent): void => {
            done([], KEYS.Get("io_plan3_load_failed"));
        });
    }

    // ---- QoL #492: Restore
    /** This yard's slot gets its earlier version back (what it had is kept as its earlier version). */
    public static RestoreSlot(slot: int, onDone: Function = null): void {
        if (!PLANNER.basePlanner || !PLANNER.basePlanner.service) {
            return;
        }
        PLANNER.basePlanner.service.ioRestoreTemplate(slot, (ok: boolean, why: string): void => {
            IoPlanShare.status(ok ? KEYS.Get("io_plan3_restored", { "v1": slot + 1 }) : (why || KEYS.Get("io_plan3_restore_failed")));
            if (ok) {
                IoPlanShare.reload();
            }
            if (onDone != null) {
                onDone(ok, why);
            }
        });
    }

    /** Player kit 1-6 gets its earlier version back. */
    public static RestoreKit(slot: int, onDone: Function = null): void {
        new URLLoaderApi().load(GLOBAL._mapURL + "restoreplayerkit", [["slot", slot]], (r: any): void => {
            let ok: boolean = r && (r.error === 0 || r.error === "0");
            let why: string = !ok && r && r.error ? String(r.error) : "";
            IoPlanShare.status(ok ? KEYS.Get("io_plan3_kit_restored", { "v1": slot }) : (why || KEYS.Get("io_plan3_restore_failed")));
            if (ok) {
                IoPlanShare.reload();
            }
            if (onDone != null) {
                onDone(ok, why);
            }
        }, (e: IOErrorEvent): void => {
            IoPlanShare.status(KEYS.Get("io_plan3_restore_failed"));
            if (onDone != null) {
                onDone(false, "");
            }
        });
    }

    // ---- the list window
    private static _status: TextField = null;

    private static _reload: Function = null;

    private static status(text: string): void {
        if (IoPlanShare._status) {
            IoPlanShare._status.text = String(text || "");
        }
    }

    /** The chooser's line under its list (what happened, or why a tab is empty). */
    public static get StatusText(): string {
        return IoPlanShare._status ? IoPlanShare._status.text : "";
    }

    private static reload(): void {
        if (IoPlanShare._reload != null) {
            IoPlanShare._reload();
        }
    }

    /**
     * A window (the game's frame, like IoTextPrompt's) with tabs ([id, label]; none: one list), a list of rows ({ title, sub,
     * buttons: [label, name, onClick, style] }) 8 to a page, and a line for what happened. load(tab, done(rows, note)).
     */
    private static openList(title: string, tabs: any[], first: string, load: Function): void {
        IoPlanShare.HideChooser();
        let W: int = 620;
        let H: int = 450;
        let L: int = (-(W / 2)) | 0;
        let T: int = (-(H / 2)) | 0;
        let win: Sprite = new Sprite();
        win.name = "ioPlan3Window";
        let close: Function = (): void => {
            if (IoPlanShare._win == win) {
                IoPlanShare._win = null;
                IoPlanShare._winClose = null;
                IoPlanShare._status = null;
                IoPlanShare._reload = null;
            }
            if (win.parent) {
                win.parent.removeChild(win);
                GLOBAL.BlockerRemove();
            }
        };
        let frame: frame_CLIP = as3.as(win.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = W;
        frame.height = H;
        frame.x = L;
        frame.y = T;
        frame.Setup(true, (e: any = null): void => {
            close();
        });
        let heading: TextField = new TextField();
        heading.selectable = false;
        heading.mouseEnabled = false;
        heading.embedFonts = true;
        heading.antiAliasType = AntiAliasType.NORMAL;
        let hf: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        hf.align = TextFormatAlign.CENTER;
        heading.defaultTextFormat = hf;
        heading.width = W - 40;
        heading.height = 32;
        heading.x = L + 20;
        heading.y = T + 18;
        heading.text = title.toUpperCase();
        heading.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        win.addChild(heading);

        let inner: int = (W - 56) | 0;
        let x0: int = (L + 28) | 0;
        let listY: int = (T + (tabs.length ? 96 : 62)) | 0;
        let rowH: int = 34;
        let tabButtons: any = {};
        let state: any = { "tab": first || (tabs.length ? String(tabs[0][0]) : ""), "page": 0, "rows": [], "note": "", "sticky": "", "seq": 0 };
        let list: Sprite = new Sprite();
        list.name = "ioPlan3List";
        win.addChild(list);
        let note: TextField = IoMapUi.label("", 11, 0x46321E, false, inner, TextFormatAlign.CENTER);
        note.name = "ioPlan3Status";
        note.wordWrap = true;
        note.multiline = true;
        note.height = 34;
        note.x = x0;
        note.y = T + H - 62;
        win.addChild(note);
        let pageText: TextField = IoMapUi.label("", 11, 0x46321E, true, 80, TextFormatAlign.CENTER);
        pageText.x = x0 + inner / 2 - 40;
        pageText.y = listY + IoPlanShare.ROWS_PER_PAGE * rowH + 6;
        win.addChild(pageText);
        let render: Function = null;
        let prev: any = IoMapUi.button("◀", 34, 22, (e: MouseEvent): void => {
            if (state.page > 0) {
                state.page--;
                render();
            }
        }, "grey", 11);
        prev.name = "ioPlan3PagePrev";
        prev.x = pageText.x - 40;
        prev.y = pageText.y - 2;
        win.addChild(prev);
        let next: any = IoMapUi.button("▶", 34, 22, (e: MouseEvent): void => {
            if ((state.page + 1) * IoPlanShare.ROWS_PER_PAGE < state.rows.length) {
                state.page++;
                render();
            }
        }, "grey", 11);
        next.name = "ioPlan3PageNext";
        next.x = pageText.x + 86;
        next.y = pageText.y - 2;
        win.addChild(next);

        render = (): void => {
            while (list.numChildren) {
                list.removeChildAt(0);
            }
            list.graphics.clear();
            let rows: any[] = state.rows;
            let pages: int = Math.max(1, Math.ceil(rows.length / IoPlanShare.ROWS_PER_PAGE)) | 0;
            state.page = Math.max(0, Math.min(pages - 1, state.page)) | 0;
            let from: int = (state.page * IoPlanShare.ROWS_PER_PAGE) | 0;
            for (let i: int = from; i < Math.min(rows.length, from + IoPlanShare.ROWS_PER_PAGE); i++) {
                let r: any = rows[i];
                let y: number = listY + (i - from) * rowH;
                IoMapUi.roundBox(list.graphics, x0, y, inner, rowH - 4, IoMapUi.PAPER_ROW, 1, IoMapUi.RULE, 5);
                let buttons: any[] = as3.as(r.buttons, Array) || [];
                let bx: number = x0 + inner - 6;
                for (let bi: int = (buttons.length - 1) | 0; bi >= 0; bi--) {
                    let spec: any[] = buttons[bi];
                    let bw: int = 88;
                    bx -= bw;
                    let b: any = IoMapUi.button(String(spec[0]), bw, 24, spec[2], String(spec[3] || "grey"), 10);
                    b.name = String(spec[1]);
                    b.x = Math.round(bx);
                    b.y = Math.round(y + 3);
                    GLOBAL.ioFitText(b.getChildAt(b.numChildren - 1), 7);
                    list.addChild(b);
                    bx -= 6;
                }
                let textW: int = Math.max(80, bx - x0 - 14) | 0;
                let t: TextField = IoMapUi.label(String(r.title), 11, IoMapUi.INK, true, textW);
                t.x = x0 + 8;
                t.y = y + 1;
                GLOBAL.ioFitText(t, 8);
                list.addChild(t);
                let s: TextField = IoMapUi.label(String(r.sub || ""), 9, IoMapUi.MUTED, false, textW);
                s.x = x0 + 8;
                s.y = y + 16;
                list.addChild(s);
            }
            pageText.text = rows.length > IoPlanShare.ROWS_PER_PAGE ? (state.page + 1) + " / " + pages : "";
            prev.visible = next.visible = rows.length > IoPlanShare.ROWS_PER_PAGE;
            note.text = String(state.sticky || state.note || "");
            for (let tab of tabs) {
                let tb: any = tabButtons[tab[0]];
                if (tb) {
                    tb.alpha = Number(tab[0] == state.tab ? 1 : 0.7);
                }
            }
        };
        let show: Function = (tab: string, sticky: string = ""): void => {
            state.tab = tab;
            state.page = 0;
            state.rows = [];
            state.sticky = sticky;
            state.note = KEYS.Get("msg_loading");
            state.seq++;
            let seq: int = state.seq | 0;
            render();
            load(tab, (rows: any[], text: string): void => {
                if (seq != state.seq || IoPlanShare._win != win) {
                    return;
                }
                state.rows = rows || [];
                state.note = text || "";
                render();
            });
        };
        // the tabs, across the top
        if (tabs.length) {
            let gap: int = 6;
            let tw: int = Math.floor((inner - gap * (tabs.length - 1)) / tabs.length) | 0;
            for (let i: int = 0; i < tabs.length; i++) {
                let id: string = String(tabs[i][0]);
                let tb: any = IoMapUi.button(String(tabs[i][1]), tw, 26, (e: MouseEvent): void => {
                    show(id);
                }, "gold", 10);
                tb.name = "ioPlan3Tab_" + id;
                tb.x = x0 + i * (tw + gap);
                tb.y = T + 60;
                GLOBAL.ioFitText(tb.getChildAt(tb.numChildren - 1), 7);
                win.addChild(tb);
                tabButtons[id] = tb;
            }
        }
        IoPlanShare._win = win;
        IoPlanShare._winClose = close;
        IoPlanShare._status = note;
        // (after a Restore: the list again, what happened still said)
        IoPlanShare._reload = (): void => {
            show(state.tab, note.text);
        };
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(win);
        POPUPSETTINGS.AlignToCenter(win);
        show(state.tab);
    }
}
