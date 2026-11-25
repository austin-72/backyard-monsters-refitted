import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent, SecurityErrorEvent, TimerEvent } from "flash/events";
import { URLLoader, URLRequest } from "flash/net";
import { Timer } from "flash/utils";
import { BASE, GLOBAL, InfernoKitData, IoMapUi, IoTextPrompt, KEYS, LOGGER, PLEASEWAIT, SecNum, URLLoaderApi, IoDevil } from "@game";

/**
 * Devil outpost kits (inferno-only builds).
 *
 * The three Map Room 2 starter kits are hand-placed overworld layouts. Rather than
 * re-authoring ~450 building positions, each kit is converted when it is used: overworld
 * defences become their Inferno counterparts, levels are clamped to what the Inferno prop
 * table supports, and buildings a devil outpost cannot own are left out. The mapping
 * mirrors server/src/game-data/tribes/devil/devilify.ts so kits and devil tribes match.
 *
 * Prices are in bone / coal / sulfur (r1-r3) plus the shiny buy-out, per kit 1-3.
 */
export class InfernoKits extends ASObject {
    /** Overworld building id -> Inferno building id. 0 removes the building from the kit. */
    private static readonly DEVIL_BUILDING: any = { 15: 128, 16: 0, 18: 17, 20: 130, 22: 0, 23: 129, 25: 132, 115: 132, 117: 24, 118: 129 };

    /** [bone, coal, sulfur, shiny] for the Regular, Mega and Ultra kits. Tune freely. */
    private static readonly PRICES: any[] = [[3000000, 3000000, 1500000, 300], [12000000, 12000000, 6000000, 600], [50000000, 50000000, 25000000, 1200]];

    /** Kits per page of the popup (its art has three columns) and how many slots exist. */
    public static readonly PER_PAGE: int = 3;

    public static readonly MAX_KITS: int = 6;

    /**
     * Inferno-only: the player's own kits, slots 7-12 on pages 3 and 4, seen by nobody else. Saved from one of
     * their outposts on the server (worldmapv2/saveplayerkit) and priced by customCosts().
     * (QoL #337, 15 October: six of them, was three (7-9); each can be renamed or deleted: ioSlotTools.)
     */
    public static readonly PLAYER_FIRST: int = 7;

    public static readonly PLAYER_SLOTS: int = 6;

    /** Index 0 is slot 7. null = empty slot. */
    private static _player: any[] = [null, null, null, null, null, null];

    /** (QoL #337) Rename and Delete over each column of the kit window, by column (1-3): reused while it is open. */
    private static _ioTools: any[] = [null, null, null, null];

    /**
     * Custom kits made from real outposts with the server's export-kits command, downloaded
     * from <assets>/kits/inferno-kits.json. Index 0 is kit 1. A slot may be null (not made yet).
     * While this is null the three converted stock kits are used instead.
     */
    private static _custom: any[] = null;

    private static _version: string = "0";

    private static _loading: boolean = false;

    private static _waiting: any[] = [];

    /** The rows of the comparison table under the kits: label (its key, QoL #235), then the building ids counted in it. */
    private static readonly ROWS: any[] = [["io_t3m_kit_r_sniper", [21, 130]], ["io_t3m_kit_r_quake", [129, 132]], ["io_t3m_kit_r_coil", [144, 145]], ["io_t3m_kit_r_blocks", [17]], ["io_t3m_kit_r_traps", [24]], ["io_t3m_kit_r_compound", [128]], ["io_t3m_kit_r_incubators", [13]], ["io_t3m_kit_r_hcc", [16]], ["io_t3m_kit_r_juicer", [9]], ["io_t3m_kit_r_harvesters", [1, 2, 3, 4]], ["io_t3m_kit_r_flinger", [5]]];

    public $ctor(): void {
        super.$ctor();
    }

    public static isPlayerSlot(kitID: int): boolean {
        return kitID >= InfernoKits.PLAYER_FIRST && kitID < InfernoKits.PLAYER_FIRST + InfernoKits.PLAYER_SLOTS;
    }

    public static playerKit(kitID: int): any {
        return InfernoKits.isPlayerSlot(kitID) ? InfernoKits._player[kitID - InfernoKits.PLAYER_FIRST] : null;
    }

    private static takePlayerKits(param1: any): void {
        let i: int = 0;
        if (param1 && as3.is(param1.kits, Array)) {
            while (i < InfernoKits.PLAYER_SLOTS) {
                InfernoKits._player[i] = param1.kits[i] && param1.kits[i].buildings ? param1.kits[i] : null;
                i++;
            }
        }
    }

    /**
     * Saves the outpost that is open into player slot 7-12, then calls back with an error text or null.
     * The server copies the outpost as it has it stored, and the game uploads changes on a delay, so the
     * outpost is saved first and the copy is only asked for once that upload has finished. Otherwise
     * buildings placed or upgraded just before would be missing or at their old level.
     */
    public static savePlayerKit(kitID: int, name: string, onDone: Function): void {
        let deadline: int = 0;
        let wait: Timer = null;
        deadline = (GLOBAL.Timestamp() + 30) | 0;
        wait = new Timer(250);
        BASE.Save();
        wait.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving && !BASE._loading) {
                wait.stop();
                InfernoKits.requestPlayerKitSave(kitID, name, onDone);
            } else if (GLOBAL.Timestamp() > deadline) {
                wait.stop();
                onDone(KEYS.Get("io_t3m_kit_outpost_unsaved"));
            }
        });
        wait.start();
    }

    private static requestPlayerKitSave(kitID: int, name: string, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._mapURL + "saveplayerkit", [["baseid", BASE._loadedBaseID], ["slot", kitID - InfernoKits.PLAYER_FIRST + 1], ["name", name]], (serverData: any): void => {
            if (serverData && serverData.error == 0) {
                InfernoKits.takePlayerKits(serverData);
                onDone(null);
            } else {
                onDone(serverData && serverData.error ? String(serverData.error) : KEYS.Get("io_t3m_kit_unsaved"));
            }
        }, (e: Event): void => {
            onDone(KEYS.Get("io_t3m_kit_unsaved_retry"));
        });
    }

    /** (QoL #337) A player kit's slot as the server numbers it (1-6). */
    public static ioSlotOf(kitID: int): int {
        return (kitID - InfernoKits.PLAYER_FIRST + 1) | 0;
    }

    /** (QoL #337) Renames player kit 7-12 on the server, then calls back with an error text or null. */
    public static renamePlayerKit(kitID: int, name: string, onDone: Function): void {
        InfernoKits.ioKitRequest("renameplayerkit", [["slot", InfernoKits.ioSlotOf(kitID)], ["name", name]], onDone);
    }

    /** (QoL #337) Deletes player kit 7-12 on the server (its slot is empty again), then calls back as above. */
    public static deletePlayerKit(kitID: int, onDone: Function): void {
        InfernoKits.ioKitRequest("deleteplayerkit", [["slot", InfernoKits.ioSlotOf(kitID)]], onDone);
    }

    private static ioKitRequest(path: string, vars: any[], onDone: Function): void {
        if (!GLOBAL.INFERNO_ONLY) {
            onDone(KEYS.Get("io_op2_kit_failed"));
            return;
        }
        new URLLoaderApi().load(GLOBAL._mapURL + path, vars, (serverData: any): void => {
            if (serverData && serverData.error == 0) {
                InfernoKits.takePlayerKits(serverData);
                onDone(null);
            } else {
                onDone(serverData && serverData.error ? String(serverData.error) : KEYS.Get("io_op2_kit_failed"));
            }
        }, (e: Event): void => {
            onDone(KEYS.Get("io_op2_kit_failed"));
        });
    }

    /**
     * Inferno-only (QoL #337): Rename and Delete for a player kit in the kit window (popup_prefab, its column 1-3): two
     * small buttons under the kit's name, at the right of its column (over the picture's corner), shown for a saved
     * player kit only (kitID 0, an empty slot or another kit: hidden). onChanged draws the page again after a change.
     */
    public static ioSlotTools(popup: MovieClip, column: int, kitID: int, onChanged: Function): void {
        let tools: MovieClip = as3.as(InfernoKits._ioTools[column], MovieClip);
        if (tools && tools.parent != popup) {
            if (tools.parent) {
                tools.parent.removeChild(tools);
            }
            tools = null;
            InfernoKits._ioTools[column] = null;
        }
        let show: boolean = GLOBAL.INFERNO_ONLY && popup != null && kitID > 0 && InfernoKits.isPlayerSlot(kitID) && InfernoKits.playerKit(kitID) != null && !InfernoKits.playerKitsFailed;
        if (!show) {
            if (tools) {
                tools.visible = false;
            }
            return;
        }
        if (!tools) {
            tools = new MovieClip();
            tools.addChild(InfernoKits.ioToolButton(false, tools));
            let remove: MovieClip = InfernoKits.ioToolButton(true, tools);
            remove.x = 22;
            tools.addChild(remove);
            popup.addChild(tools);
            InfernoKits._ioTools[column] = tools;
        }
        let slot: int = InfernoKits.ioSlotOf(kitID);
        tools.name = "ioOp2KitTools" + column;
        tools.getChildAt(0).name = "ioOp2KitRename" + slot;
        tools.getChildAt(1).name = "ioOp2KitDelete" + slot;
        tools.ioKitID = kitID;
        tools.ioChanged = onChanged;
        // under the kit's name, at the right of the column (the Use Resources button is centred in it, 140 wide)
        let resources: any = popup["b" + column];
        let title: any = popup["t" + column];
        let middle: number = resources ? resources.x + resources.width * 0.5 : 0;
        tools.x = Math.round(middle + 70 - 6 - 40);
        tools.y = Math.round(title ? title.y + title.height + 2 : (resources ? resources.y - 60 : 0));
        popup.setChildIndex(tools, (popup.numChildren - 1) | 0);
        tools.visible = true;
    }

    /** (QoL #337) One of the two: a pencil (rename) or a red cross (delete) on a small paper square. */
    private static ioToolButton(remove: boolean, tools: MovieClip): MovieClip {
        let b: MovieClip = new MovieClip();
        IoMapUi.roundBox(b.graphics, 0, 0, 18, 18, IoMapUi.PAPER_LIGHT, 0.95, IoMapUi.EDGE, 4, 1.2);
        if (remove) {
            IoMapUi.cross(b.graphics, 5, 5, 8, 9054740);
        } else {
            IoMapUi.pencil(b.graphics, 4, 3, IoMapUi.INK);
        }
        b.buttonMode = true;
        b.mouseChildren = false;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            let kitID: int = tools.ioKitID | 0;
            if (remove) {
                InfernoKits.ioAskDelete(kitID, tools.ioChanged);
            } else {
                InfernoKits.ioAskRename(kitID, tools.ioChanged);
            }
        });
        return b;
    }

    private static ioAskRename(kitID: int, onChanged: Function): void {
        if (!InfernoKits.playerKit(kitID)) {
            return;
        }
        IoTextPrompt.Show(KEYS.Get("io_op2_kit_rename_title"), KEYS.Get("io_op2_kit_rename_body"), InfernoKits.kitName(kitID), 24, KEYS.Get("io_op2_kit_rename_ok"), (name: string): void => {
            if (String(name).replace(/^\s+|\s+$/g, "") == "") {
                return;
            }
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            InfernoKits.renamePlayerKit(kitID, name, (error: string): void => {
                PLEASEWAIT.Hide();
                if (error) {
                    GLOBAL.Message(error);
                    return;
                }
                if (onChanged != null) {
                    onChanged();
                }
            });
        });
    }

    private static ioAskDelete(kitID: int, onChanged: Function): void {
        if (!InfernoKits.playerKit(kitID)) {
            return;
        }
        GLOBAL.ioDanger(KEYS.Get("io_op2_kit_delete_ask", { "v1": IoMapUi.escape(InfernoKits.kitName(kitID)) }), KEYS.Get("io_op2_kit_delete"), (): void => {
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            InfernoKits.deletePlayerKit(kitID, (error: string): void => {
                PLEASEWAIT.Hide();
                if (error) {
                    GLOBAL.Message(error);
                    return;
                }
                if (onChanged != null) {
                    onChanged();
                }
            });
        });
    }

    /**
     * The kits built into the client (InfernoKitData) are the starting point, so the popup is right
     * from its first frame and keeps working when a server serves no kit file at all.
     */
    private static useBuiltIn(): void {
        let data: any = null;
        if (InfernoKits._custom) {
            return;
        }
        try {
            data = JSON.parse(InfernoKitData.JSON_TEXT);
            if (data && as3.is(data.kits, Array) && InfernoKits.hasAny(as3.as(data.kits, Array))) {
                InfernoKits._custom = as3.as(data.kits, Array);
                InfernoKits._version = "b" + InfernoKitData.VERSION;
            }
        } catch (err) {
            LOGGER.Log("err", "InfernoKits: built-in kits could not be read: " + err.message);
        }
    }

    /** Downloads the server's kits (every time, they can change while the server runs), then calls back. */
    /** Inferno-only (QoL #432): the player's own kits couldn't be read this time. */
    public static playerKitsFailed: boolean = false;

    public static load(onDone: Function): void {
        let loader: URLLoader = null;
        let outstanding: int = 0;
        let done: Function = null;
        loader = null;
        let finish: Function = null;
        InfernoKits.useBuiltIn();
        InfernoKits._waiting.push(onDone);
        if (InfernoKits._loading) {
            return;
        }
        InfernoKits._loading = true;
        outstanding = 2;
        done = (): void => {
            let callback: Function = null;
            let pending: any[] = null;
            if (--outstanding > 0) {
                return;
            }
            pending = InfernoKits._waiting;
            InfernoKits._waiting = [];
            InfernoKits._loading = false;
            for (callback of as3.values(pending)) {
                callback();
            }
        };
        // (Inferno-only, 14 October, QoL #432: whether the player's kits could be read: when not, their slots
        // looked empty and offered "Save outpost here", which wrote over a kit the player had)
        new URLLoaderApi().load(GLOBAL._mapURL + "playerkits", [], (serverData: any): void => {
            InfernoKits.playerKitsFailed = !serverData || Boolean(serverData.error);
            InfernoKits.takePlayerKits(serverData);
            done();
        }, (e: Event): void => {
            InfernoKits.playerKitsFailed = true;
            done();
        });
        finish = (e: Event): void => {
            let data: any = null;
            if (e.type == Event.COMPLETE) {
                try {
                    data = JSON.parse(String(loader.data));
                    if (data && as3.is(data.kits, Array) && InfernoKits.hasAny(as3.as(data.kits, Array))) {
                        InfernoKits._custom = as3.as(data.kits, Array);
                        InfernoKits._version = String(data.version);
                    }
                } catch (err) {
                    LOGGER.Log("err", "InfernoKits: inferno-kits.json could not be read: " + err.message);
                }
            }
            done();
        };
        loader = new URLLoader();
        loader.addEventListener(Event.COMPLETE, finish);
        loader.addEventListener(IOErrorEvent.IO_ERROR, finish);
        loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, finish);
        loader.load(new URLRequest(GLOBAL._storageURL + "kits/inferno-kits.json?t=" + new Date().getTime()));
    }

    private static hasAny(kits: any[]): boolean {
        let kit: any = null;
        for (kit of as3.values(kits)) {
            if (kit && kit.buildings) {
                return true;
            }
        }
        return false;
    }

    public static get usingCustom(): boolean {
        InfernoKits.useBuiltIn();
        return InfernoKits._custom != null;
    }

    /** Number of pages the popup needs: the page of the highest filled slot. */
    public static get pageCount(): int {
        let last: int = 0;
        let i: int = 0;
        InfernoKits.useBuiltIn();
        if (GLOBAL.INFERNO_ONLY) {
            // Pages 1-2: the server's kits. Then the player's own slots, always there to save into (QoL #337: six
            // of them, pages 3 and 4; was three, page 3).
            return ((((InfernoKits.PLAYER_FIRST - 1) / InfernoKits.PER_PAGE) | 0) + Math.ceil(InfernoKits.PLAYER_SLOTS / InfernoKits.PER_PAGE)) | 0;
        }
        if (!InfernoKits._custom) {
            return GLOBAL.kitPagingTest ? 2 : 1;
        }
        while (i < InfernoKits._custom.length && i < InfernoKits.MAX_KITS) {
            if (InfernoKits._custom[i] && InfernoKits._custom[i].buildings) {
                last = i;
            }
            i++;
        }
        return (((last / InfernoKits.PER_PAGE) | 0) + 1) | 0;
    }

    /** kitID is 1-based. */
    public static hasKit(kitID: int): boolean {
        if (InfernoKits.isPlayerSlot(kitID)) {
            return true;
        }
        InfernoKits.useBuiltIn();
        if (!InfernoKits._custom) {
            return kitID >= 1 && kitID <= (GLOBAL.kitPagingTest ? InfernoKits.MAX_KITS : 3);
        }
        return Boolean(kitID >= 1 && kitID <= InfernoKits._custom.length && InfernoKits._custom[kitID - 1] && InfernoKits._custom[kitID - 1].buildings);
    }

    /** Which of the three stock kits a slot shows while there are no custom kits (4-6 repeat 1-3). */
    public static stockId(kitID: int): int {
        return (((Math.max(1, kitID) - 1) % 3) + 1) | 0;
    }

    public static kitName(kitID: int): string {
        if (InfernoKits.isPlayerSlot(kitID)) {
            return InfernoKits.playerKit(kitID) ? String(InfernoKits.playerKit(kitID).name) : KEYS.Get("io_t3m_kit_empty", { "v1": kitID - InfernoKits.PLAYER_FIRST + 1 });
        }
        if (InfernoKits._custom && InfernoKits.hasKit(kitID) && InfernoKits._custom[kitID - 1].name) {
            return String(InfernoKits._custom[kitID - 1].name);
        }
        return KEYS.Get(as3.str(["str_regularkit", "str_megakit", "str_ultrakit"][InfernoKits.stockId(kitID) - 1])) + (kitID > 3 ? " (page 2 test)" : "");
    }

    public static thumbPath(kitID: int): string {
        if (InfernoKits.isPlayerSlot(kitID)) {
            if (!InfernoKits.playerKit(kitID)) {
                return null;
            }
            return InfernoKits.playerKit(kitID).image ? "kits/player/" + InfernoKits.playerKit(kitID).image + ".png" : null;
        }
        return InfernoKits._custom ? "kits/kit-" + kitID + ".png?v=" + InfernoKits._version : "ui/prefab-" + (InfernoKits.stockId(kitID) + 1) + ".v5.jpg";
    }

    public static largePath(kitID: int): string {
        if (InfernoKits.isPlayerSlot(kitID)) {
            return InfernoKits.playerKit(kitID) && InfernoKits.playerKit(kitID).image ? "kits/player/" + InfernoKits.playerKit(kitID).image + "-large.png" : null;
        }
        return InfernoKits._custom ? "kits/kit-" + kitID + "-large.png?v=" + InfernoKits._version : "ui/prefab-large-" + (InfernoKits.stockId(kitID) + 1) + ".v5.jpg";
    }

    /** How many rows the comparison table has (popup_prefab draws that many). */
    public static get rowCount(): int {
        return InfernoKits.ROWS.length;
    }

    /** Left column of the comparison table. One line per row, to line up with contentsText(). */
    public static rowLabels(): string {
        let row: any[] = null;
        let lines: any[] = [];
        for (row of as3.values(InfernoKits.ROWS)) {
            lines.push(KEYS.Get(as3.str(row[0])));
        }
        return "<b>" + lines.join("<br>") + "</b>";
    }

    /** [count, highest level] of a row's buildings in a list ({t, l} or {t, prefab}). */
    private static rowOf(row: any[], buildings: any): any[] {
        let count: int = 0;
        let low: int = int.MAX_VALUE;
        let high: int = 0;
        for (let building of as3.values(buildings)) {
            if (!building || (as3.as(row[1], Array)).indexOf(building.t | 0) == -1) {
                continue;
            }
            let level: int = Math.max(1, (building.prefab ? building.prefab : building.l) | 0) | 0;
            low = Math.min(low, level) | 0;
            high = Math.max(high, level) | 0;
            count++;
        }
        return [count, count ? low : 0, high];
    }

    /**
     * Inferno-only (QoL #335): the buildings of the yard showing (the outpost the kits are for), as {t, l}, built ones
     * (not still being built).
     */
    public static builtHere(): any[] {
        let out: any[] = [];
        for (let b of as3.values(BASE._buildingsAll || {})) {
            if (b && b._type && b._lvl && (!b._countdownBuild || b._countdownBuild.Get() <= 0)) {
                out.push({ "t": b._type | 0, "l": b._lvl.Get() | 0 });
            }
        }
        return out;
    }

    /**
     * What a kit really contains, counted from its building list: "4x Level 5", "6x Level 3-5",
     * "Level 2" for a single building, "Yes" for one that has no levels worth showing, a red x for none.
     * With `here` (QoL #335, the outpost's own buildings): green where the kit has more or higher than what is
     * built, red where it has fewer or lower (what is built is better), as it was where they are the same.
     */
    public static contentsText(buildings: any, here: any[] = null): string {
        let lines: any[] = [];
        for (let row of as3.values(InfernoKits.ROWS)) {
            let kit: any[] = InfernoKits.rowOf(row, buildings);
            let count: int = kit[0] | 0;
            let line: string = null;
            if (count == 0) {
                line = "<font color=\"#FF0000\">x</font>";
            } else if ((as3.as(row[1], Array))[0] == 16) {
                line = KEYS.Get("btn_yes");
            } else {
                line = (count > 1 ? count + "x " : "") + KEYS.Get("io_t3m_kit_level", { "v1": kit[1] + (kit[2] > kit[1] ? "-" + kit[2] : "") });
            }
            if (here && count > 0) {
                let built: any[] = InfernoKits.rowOf(row, here);
                let more: boolean = count > (built[0] | 0) || (kit[2] | 0) > (built[2] | 0);
                let less: boolean = count < (built[0] | 0) || (kit[2] | 0) < (built[2] | 0);
                if (more && !less) {
                    line = "<font color=\"#2E7D32\">" + line + "</font>";
                } else if (less && !more) {
                    line = "<font color=\"#B71C1C\">" + line + "</font>";
                }
            }
            lines.push(line);
        }
        return "<b>" + lines.join("<br>") + "</b>";
    }

    /** A fresh copy of a custom kit's buildings (placing a kit edits the objects it is given). */
    public static customBuildings(kitID: int): any {
        let key: string = null;
        let field: string = null;
        let copy: any = null;
        let result: any = {};
        let source: any = InfernoKits.isPlayerSlot(kitID) ? (InfernoKits.playerKit(kitID) ? InfernoKits.playerKit(kitID).buildings : {}) : InfernoKits._custom[kitID - 1].buildings;
        for (key in source) {
            if (InfernoKits.isPlayerSlot(kitID) && (source[key].t | 0) != 112 && !GLOBAL.ioOutpostBuildable(source[key].t | 0)) {
                // Decorations and anything an outpost cannot build are not part of a player kit.
                continue;
            }
            copy = {};
            for (field in source[key]) {
                copy[field] = source[key][field];
            }
            result[key] = copy;
        }
        return result;
    }

    /**
     * (12 November) how far a kit's building is calcified (its `fort`): 0 when its kind can't be in an outpost, no
     * higher than its table's last level. (13 November: the hall's too; the outpost's hall then has the kit's, or its
     * own when that is more: addHallFort)
     */
    public static fortOf(building: any, props: any): int {
        if (!building || !props || !props.can_fortify || !props.fortify_costs) {
            return 0;
        }
        return Math.max(0, Math.min(building.fort | 0, props.fortify_costs.length | 0)) | 0;
    }

    /**
     * Adds to `total` ([bone, coal, sulfur]) what one kit building is worth: its build and upgrade costs up to its
     * level and, since 12 November, its calcification's up to its `fort` (the user's: "make sure it includes the price
     * of any calcifications"; kits dropped calcification until then). The server counts the same (kitPay.kitWorth).
     */
    private static addWorth(total: any[], building: any, props: any): void {
        let cost: any = null;
        let level: int = 0;
        if (!props) {
            return;
        }
        if (props.costs) {
            let top: int = Math.max(1, (building.prefab | 0) || (building.l | 0) || 1) | 0;
            while (level < top && level < props.costs.length) {
                cost = props.costs[level];
                total[0] += cost.r1.Get();
                total[1] += cost.r2.Get();
                total[2] += cost.r3.Get();
                level++;
            }
        }
        let fort: int = InfernoKits.fortOf(building, props);
        level = 0;
        while (level < fort) {
            cost = props.fortify_costs[level];
            total[0] += cost.r1.Get();
            total[1] += cost.r2.Get();
            total[2] += cost.r3.Get();
            level++;
        }
    }

    /**
     * (13 November) how far the hall standing is calcified, where the kit window is building over the outpost that is
     * open (popup_prefab sets it); 0 anywhere else (a takeover, several outposts at once), which prices the kit's hall
     * calcification in full. The server counts it from the hall standing (applyKit.kitPriced), never more than this.
     */
    public static ioStandingHallFort: int = 0;

    /**
     * (13 November, the user's: "saved kits are not saving with the calcification") a kit's hall calcification: the
     * outpost's hall is standing already, so not its building costs, only the calcification levels it hasn't yet.
     */
    private static addHallFort(total: any[], building: any): void {
        let props: any = InfernoKits.props()[111];
        let fort: int = InfernoKits.fortOf(building, props);
        let level: int = Math.max(0, InfernoKits.ioStandingHallFort) | 0;
        while (level < fort) {
            let cost: any = props.fortify_costs[level];
            total[0] += cost.r1.Get();
            total[1] += cost.r2.Get();
            total[2] += cost.r3.Get();
            level++;
        }
    }

    /** (12 November, the user's) a player's own kit costs twice what its buildings are worth; a pre-made kit 1.8 times. */
    public static readonly PLAYER_KIT_TIMES: number = 2;

    public static readonly PREMADE_KIT_TIMES: number = 1.8;

    /**
     * (12 November, the user's: "make both function the same (rounded)") the price of a kit worth `total` ([bone, coal,
     * sulfur], addWorth) at `times` its worth: bone and coal each times `times`, rounded down to a whole million (under
     * a million it is left as it is, so nothing is free), both then the higher of the two; sulfur half of that.
     * [bone, coal, sulfur] as numbers. No ceiling: a 32-bit cap (int.MAX_VALUE / 3, 715,827,882) held a player's kit
     * down until then, so its calcification, and anything else past that, was never charged.
     */
    /** (13 November) the Devil's Contract on a kit's price: Merchant's Due and Kitbinder (IoDevil.kitMul). */
    public static ioDevilMul(): number {
        return GLOBAL.INFERNO_ONLY ? IoDevil.kitMul() : 1;
    }

    public static priceOf(total: any[], times: number): number[] {
        let main: number = 0;
        for (let k: int = 0; k < 2; k++) {
            let raw: number = Math.floor(Number(total[k]) * times);
            let millions: number = Math.floor(raw / 1000000) * 1000000;
            main = Math.max(main, millions > 0 ? millions : raw);
        }
        return [main, main, Math.floor(main / 2)];
    }

    /**
     * Player kits: every building's build and upgrade costs up to its level, and its calcification's, priced by
     * priceOf at PLAYER_KIT_TIMES. Player kits have no shiny buy-out; the fourth entry is kept only because every
     * kit's cost list has one.
     */
    private static playerKitCosts(kitID: int, buildings: any = null): any[] {
        let building: any = null;
        let props: any = null;
        let cost: any = null;
        let level: int = 0;
        let total: any[] = [0, 0, 0];
        let kit: any = InfernoKits.playerKit(kitID);
        if (kit) {
            for (building of as3.values(buildings || kit.buildings)) {
                // Every building an outpost can build, at every level up to its own; the hall is
                // already standing and decorations are not part of a player kit.
                props = (building.t | 0) == 112 || !GLOBAL.ioOutpostBuildable(building.t | 0) ? null : InfernoKits.props()[(building.t | 0) - 1];
                InfernoKits.addWorth(total, building, props);
                if ((building.t | 0) == 112) {
                    InfernoKits.addHallFort(total, building);
                }
            }
        }
        let price: number[] = InfernoKits.priceOf(total, InfernoKits.PLAYER_KIT_TIMES * InfernoKits.ioDevilMul());
        let shiny: number = Math.max(1, Math.ceil(Math.sqrt((price[0] + price[1] + price[2]) / 2) * 0.75));
        return [new SecNum(price[0]), new SecNum(price[1]), new SecNum(price[2]), new SecNum(shiny)];
    }

    /**
     * [bone, coal, sulfur, shiny] for a kit: a player's own (playerKitCosts) or one of the server's pre-made ones.
     *
     * Pre-made kits (12 November, the user's): priced by priceOf at PREMADE_KIT_TIMES (1.8) from what the kit's
     * buildings are worth (addWorth: build, upgrades and calcification), as a player's own kit is at 2. Until then
     * the price was the one written in the kit file (the admin's Designer), fixed whatever the buildings came to;
     * that price is no longer read. The Shiny buy-out is still the server's
     * (InfernoOnlyConfig.prices.kits), else the file's, else the stock formula on the new price.
     * `buildings`: priced for these in place of the kit's own (an outpost in the Depths, without its Flinger).
     */
    public static customCosts(kitID: int, buildings: any = null): any[] {
        if (InfernoKits.isPlayerSlot(kitID)) {
            return InfernoKits.playerKitCosts(kitID, buildings);
        }
        let building: any = null;
        let total: any[] = [0, 0, 0];
        let filePrice: any = InfernoKits._custom[kitID - 1].price;
        let shinyList: any[] = GLOBAL.ioPriceList("kits");
        for (building of as3.values(buildings || InfernoKits._custom[kitID - 1].buildings)) {
            // The outpost hall is already standing when a kit is bought.
            InfernoKits.addWorth(total, building, (building.t | 0) == 112 ? null : InfernoKits.props()[(building.t | 0) - 1]);
            if ((building.t | 0) == 112) {
                InfernoKits.addHallFort(total, building);
            }
        }
        let price: number[] = InfernoKits.priceOf(total, InfernoKits.PREMADE_KIT_TIMES * InfernoKits.ioDevilMul());
        let shiny: number = 0;
        if (shinyList && shinyList.length >= kitID) {
            shiny = shinyList[kitID - 1] | 0;
        } else if (filePrice && !(as3.is(filePrice, String)) && (filePrice.shiny | 0) > 0) {
            shiny = filePrice.shiny | 0;
        } else {
            shiny = Math.max(1, Math.ceil(Math.sqrt((price[0] + price[1] + price[2]) / 2) * 0.75));
        }
        return [new SecNum(price[0]), new SecNum(price[1]), new SecNum(price[2]), new SecNum(shiny)];
    }

    /**
     * (Inferno-only, 17 October) the building table kits are priced and checked with: the outposts' own, wherever the
     * kit window is opened from. From the main yard (the Outposts list's Choose kit... for several outposts) it was the
     * main yard's, which hasn't every kit building at every level: the window failed to open and the list just closed.
     */
    public static props(): any[] {
        return GLOBAL.INFERNO_ONLY ? GLOBAL.outpostPropsTable : GLOBAL._buildingProps;
    }

    private static clampLevel(type: int, level: int): int {
        let props: any = InfernoKits.props()[type - 1];
        let max: int = props && props.hp ? props.hp.length | 0 : 0;
        if (max <= 0) {
            return level;
        }
        return Math.max(1, Math.min(level, max)) | 0;
    }

    /** Returns a converted copy of a kit's building list. */
    public static convert(build: any): any {
        let key: string = null;
        let field: string = null;
        let source: any = null;
        let building: any = null;
        let type: int = 0;
        let result: any = {};
        for (key in build) {
            source = build[key];
            type = source.t | 0;
            if (InfernoKits.DEVIL_BUILDING.hasOwnProperty(type)) {
                type = InfernoKits.DEVIL_BUILDING[type] | 0;
            }
            if (type == 0) {
                continue;
            }
            building = {};
            for (field in source) {
                building[field] = source[field];
            }
            building.t = type;
            // (12 November: a kit's calcification is kept where its kind can have it; it was always dropped)
            let fort: int = InfernoKits.fortOf(building, InfernoKits.props()[type - 1]);
            if (fort > 0) {
                building.fort = fort;
            } else {
                delete building.fort;
            }
            if (building.hasOwnProperty("prefab")) {
                building.prefab = InfernoKits.clampLevel(type, building.prefab | 0);
            }
            if (building.hasOwnProperty("l")) {
                building.l = InfernoKits.clampLevel(type, building.l | 0);
            }
            result[key] = building;
        }
        return result;
    }

    /** Costs array in the shape popup_prefab expects: [r1, r2, r3, shiny] as SecNums. */
    public static costs(kitID: int): any[] {
        let price: any[] = as3.cast(InfernoKits.PRICES[Math.max(0, Math.min(kitID - 1, InfernoKits.PRICES.length - 1))], Array);
        return [new SecNum(Number(price[0])), new SecNum(Number(price[1])), new SecNum(Number(price[2])), new SecNum(Number(price[3]))];
    }
}
