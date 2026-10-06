import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, IOErrorEvent, SecurityErrorEvent, TimerEvent } from "flash/events";
import { URLLoader, URLRequest } from "flash/net";
import { Timer } from "flash/utils";
import { BASE, GLOBAL, InfernoKitData, KEYS, LOGGER, SecNum, URLLoaderApi } from "@game";

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
     * Inferno-only: the player's own kits, slots 7-9 on page 3, seen by nobody else. Saved from one of
     * their outposts on the server (worldmapv2/saveplayerkit) and priced by customCosts().
     */
    public static readonly PLAYER_FIRST: int = 7;

    public static readonly PLAYER_SLOTS: int = 3;

    /** Index 0 is slot 7. null = empty slot. */
    private static _player: any[] = [null, null, null];

    /**
     * Custom kits made from real outposts with the server's export-kits command, downloaded
     * from <assets>/kits/inferno-kits.json. Index 0 is kit 1. A slot may be null (not made yet).
     * While this is null the three converted stock kits are used instead.
     */
    private static _custom: any[] = null;

    private static _version: string = "0";

    private static _loading: boolean = false;

    private static _waiting: any[] = [];

    /** The rows of the comparison table under the kits: label, then the building ids counted in it. */
    private static readonly ROWS: any[] = [["Sharpshooter/Blast", [21, 130]], ["Quake/Magma Tower", [129, 132]], ["Coil/Mortar", [144, 145]], ["Blocks", [17]], ["Booby Traps", [24]], ["Compound", [128]], ["Incubators", [13]], ["Incubation CS", [16]], ["Monster Juicer", [9]], ["Harvesters", [1, 2, 3, 4]], ["Flinger", [5]]];

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
     * Saves the outpost that is open into player slot 7-9, then calls back with an error text or null.
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
                onDone("Your outpost could not be saved just now, so the kit was not saved. Please try again.");
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
                onDone(serverData && serverData.error ? String(serverData.error) : "The kit could not be saved.");
            }
        }, (e: Event): void => {
            onDone("The kit could not be saved. Please try again.");
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
        new URLLoaderApi().load(GLOBAL._mapURL + "playerkits", [], (serverData: any): void => {
            InfernoKits.takePlayerKits(serverData);
            done();
        }, (e: Event): void => {
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
            // Pages 1-2: the server's kits. Page 3: the player's own three slots, always there to save into.
            return ((((InfernoKits.PLAYER_FIRST - 1) / InfernoKits.PER_PAGE) | 0) + 1) | 0;
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
            return InfernoKits.playerKit(kitID) ? String(InfernoKits.playerKit(kitID).name) : "Your Kit " + (kitID - InfernoKits.PLAYER_FIRST + 1) + " (empty)";
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
            lines.push(row[0]);
        }
        return "<b>" + lines.join("<br>") + "</b>";
    }

    /**
     * What a kit really contains, counted from its building list: "4x Level 5", "6x Level 3-5",
     * "Level 2" for a single building, "Yes" for one that has no levels worth showing, a red x for none.
     */
    public static contentsText(buildings: any): string {
        let row: any[] = null;
        let building: any = null;
        let count: int = 0;
        let low: int = 0;
        let high: int = 0;
        let level: int = 0;
        let lines: any[] = [];
        for (row of as3.values(InfernoKits.ROWS)) {
            count = 0;
            low = int.MAX_VALUE;
            high = 0;
            for (building of as3.values(buildings)) {
                if ((as3.as(row[1], Array)).indexOf(building.t | 0) == -1) {
                    continue;
                }
                level = Math.max(1, (building.prefab ? building.prefab : building.l) | 0) | 0;
                low = Math.min(low, level) | 0;
                high = Math.max(high, level) | 0;
                count++;
            }
            if (count == 0) {
                lines.push("<font color=\"#FF0000\">x</font>");
            } else if ((as3.as(row[1], Array))[0] == 16) {
                lines.push("Yes");
            } else {
                lines.push((count > 1 ? count + "x " : "") + "Level " + low + (high > low ? "-" + high : ""));
            }
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
     * [r1, r2, r3, shiny] for a custom kit. A price object in the file wins; "auto" adds up what
     * every building costs to build and upgrade to its kit level (magma is left out, like the
     * stock kits) and prices the shiny buy-out with the stock kit formula.
     */
    /**
     * Player kits: every building's build and upgrade costs up to its level, times 2.5. The largest of
     * the bone, coal and sulfur totals is the bone price and the coal price; sulfur is half of it.
     * Player kits have no shiny buy-out; the fourth entry is kept only because every kit's cost list has one.
     */
    private static playerKitCosts(kitID: int): any[] {
        let building: any = null;
        let props: any = null;
        let cost: any = null;
        let level: int = 0;
        let total: any[] = [0, 0, 0];
        let kit: any = InfernoKits.playerKit(kitID);
        if (kit) {
            for (building of as3.values(kit.buildings)) {
                // Every building an outpost can build, at every level up to its own; the hall is
                // already standing and decorations are not part of a player kit.
                props = (building.t | 0) == 112 || !GLOBAL.ioOutpostBuildable(building.t | 0) ? null : GLOBAL._buildingProps[(building.t | 0) - 1];
                if (!props || !props.costs) {
                    continue;
                }
                level = 0;
                while (level < Math.max(1, building.prefab | 0) && level < props.costs.length) {
                    cost = props.costs[level];
                    total[0] += cost.r1.Get();
                    total[1] += cost.r2.Get();
                    total[2] += cost.r3.Get();
                    level++;
                }
            }
        }
        let main: int = Math.min(int.MAX_VALUE / 3, Math.ceil(Math.max(Number(total[0]), Number(total[1]), total[2]) * 2.5)) | 0;
        let sulfur: int = Math.ceil(main / 2) | 0;
        let shiny: int = Math.max(1, Math.ceil(Math.sqrt((main + main + sulfur) / 2) * 0.75)) | 0;
        return [new SecNum(main), new SecNum(main), new SecNum(sulfur), new SecNum(shiny)];
    }

    public static customCosts(kitID: int): any[] {
        if (InfernoKits.isPlayerSlot(kitID)) {
            return InfernoKits.playerKitCosts(kitID);
        }
        let building: any = null;
        let props: any = null;
        let cost: any = null;
        let level: int = 0;
        let total: any[] = [0, 0, 0];
        let price: any = InfernoKits._custom[kitID - 1].price;
        // The shiny buy-out set on the server (InfernoOnlyConfig.prices.kits) wins over the kit file.
        let shinyList: any[] = GLOBAL.ioPriceList("kits");
        if (price && !(as3.is(price, String))) {
            return [new SecNum(price.r1 | 0), new SecNum(price.r2 | 0), new SecNum(price.r3 | 0), new SecNum(shinyList && shinyList.length >= kitID ? shinyList[kitID - 1] | 0 : price.shiny | 0)];
        }
        for (building of as3.values(InfernoKits._custom[kitID - 1].buildings)) {
            // The outpost hall is already standing when a kit is bought.
            props = (building.t | 0) == 112 ? null : GLOBAL._buildingProps[(building.t | 0) - 1];
            if (!props || !props.costs) {
                continue;
            }
            level = 0;
            while (level < Math.max(1, building.prefab | 0) && level < props.costs.length) {
                cost = props.costs[level];
                total[0] += cost.r1.Get();
                total[1] += cost.r2.Get();
                total[2] += cost.r3.Get();
                level++;
            }
        }
        if (shinyList && shinyList.length >= kitID) {
            return [new SecNum(Number(total[0])), new SecNum(Number(total[1])), new SecNum(Number(total[2])), new SecNum(shinyList[kitID - 1] | 0)];
        }
        return [new SecNum(Number(total[0])), new SecNum(Number(total[1])), new SecNum(Number(total[2])), new SecNum(Math.max(1, Math.ceil(Math.sqrt((total[0] + total[1] + total[2]) / 2) * 0.75)))];
    }

    private static clampLevel(type: int, level: int): int {
        let props: any = GLOBAL._buildingProps[type - 1];
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
            delete building.fort;
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
