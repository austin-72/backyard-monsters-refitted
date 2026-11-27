import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Graphics, Shape, Sprite } from "flash/display";
import { IOErrorEvent } from "flash/events";
import { getTimer, setTimeout } from "flash/utils";
import { BASE, BDECORATION, BFOUNDATION, GLOBAL, InstanceManager, InventoryManager, KEYS, LOGIN, SecNum, URLLoaderApi } from "@game";

/**
 * Inferno-only (10 October): the event trophies, won for good (the server's: services/events/trophies.ts, sent as
 * the flag io_trophies and with the events' answers):
 *
 *   146  fmi1            the Frozen Monster Invasion I totem, levels 1 to 6 (waves 1, 10, 20, 30, 31, 32)
 *   147  fmi2            the Frozen Monster Invasion II totem, the same
 *   148  gauntlet        Moloch's Gauntlet trophy: all 13 stages beaten
 *   149  gauntlet_nocat  Moloch's Gauntlet "no catapults" trophy: all 13 stages beaten without firing one
 *
 * Sync (at load and when an answer brings trophies): a trophy won that is neither in the yard nor in storage is
 * put in storage (Buildings, Decorations), and the player is told; one already there takes its level. The
 * trophies are decorations (IoTrophy) placed, moved and stored as any other.
 *
 * (QoL #133) The D.A.V.E. Club's Trophies tab (IoTerrainPopup) shows them all, won or not, with Place in yard.
 * (QoL #607) iconsFor: a player's trophies as small icons, for next to their name (the chat's name menu, the
 * alliance's Members list); other players' come from the server (trophies/of), asked for together and kept a while.
 */
export class IoTrophies extends ASObject {
    /** [key, building, name key]. */
    public static readonly LIST: any[] = [
        ["fmi1", 146, "bdg_fmitotem1"],
        ["fmi2", 147, "bdg_fmitotem2"],
        ["gauntlet", 148, "bdg_gauntlet_trophy"],
        ["gauntlet_nocat", 149, "bdg_gauntlet_nocat"]];

    private static _raw: string = null;

    private static _won: any = {};

    /** What was told this session (not again). */
    private static _told: any = {};

    /** (QoL #607) Other players' trophies as trophies/of answered: { userid: { fmi1: 3, ... } }, and when (getTimer). */
    private static _of: any = {};

    private static _ofAt: any = {};

    /** (QoL #607) Icons waiting for an answer: { userid: [[sprite, size, alignRight], ...] }. */
    private static _waiting: any = {};

    /** (QoL #607) Asked for now, not answered yet. */
    private static _asking: any = {};

    /** (QoL #607) To ask for together, in a moment (all the rows of a list drawn at once go in one request). */
    private static _batch: any[] = null;

    /** (QoL #607) Answers kept this long (ms); then asked again. */
    private static readonly OF_KEEP_MS: int = 10 * 60 * 1000;

    /** (QoL #607) The most ids one request asks about (the server's TROPHIES_OF_MAX). */
    private static readonly OF_MAX: int = 60;

    public $ctor(): void {
        super.$ctor();
    }

    public static IsTrophy(type: int): boolean {
        return GLOBAL.INFERNO_ONLY && type >= 146 && type <= 149;
    }

    /** The trophies won, as the server last said ({ fmi1: 3, gauntlet: 1, ... }). */
    public static won(): any {
        let raw: string = GLOBAL._flags && GLOBAL._flags.io_trophies ? String(GLOBAL._flags.io_trophies) : "";
        if (raw != IoTrophies._raw) {
            IoTrophies._raw = raw;
            IoTrophies._won = {};
            if (raw != "") {
                try {
                    let v: any = JSON.parse(raw);
                    if (v && typeof v == "object") {
                        IoTrophies._won = v;
                    }
                } catch (e) {
                }
            }
        }
        return IoTrophies._won;
    }

    private static keyOf(type: int): string {
        for (let t of IoTrophies.LIST) {
            if (t[1] == type) {
                return String(t[0]);
            }
        }
        return null;
    }

    /** QoL #134: a trophy in storage taken in hand, to be put down (as Buildings, Decorations does). */
    public static placeNow(type: int): boolean {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || InventoryManager.buildingStorageCount(type) <= 0 || GLOBAL._newBuilding) {
            return false;
        }
        return BASE.addBuildingB(type) != null;
    }

    /** A trophy building's level as won (0: not won). */
    public static level(type: int): int {
        let k: string = IoTrophies.keyOf(type);
        if (!k) {
            return 0;
        }
        let n: number = Number(IoTrophies.won()[k]);
        return isNaN(n) || n <= 0 ? 0 : Math.min(type <= 147 ? 6 : 1, Math.floor(n)) | 0;
    }

    /** The player's own main yard, to build in (the trophies are theirs). */
    public static own(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && !GLOBAL.ioDesignMode() && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
    }

    private static placed(type: int): any[] {
        let out: any[] = [];
        let all: Vector<any> = InstanceManager.getInstancesByClass(BDECORATION);
        for (let b of (all ?? [])) {
            let f: BFOUNDATION = as3.as(b, BFOUNDATION);
            if (f && f._type == type && !f._destroyed) {
                out.push(f);
            }
        }
        return out;
    }

    /** QoL #133: how many of this trophy stand in the yard now. */
    public static inYard(type: int): int {
        return IoTrophies.placed(type).length | 0;
    }

    /** QoL #133: the highest level a trophy has (the totems 6, the Gauntlet's 1). */
    public static maxLevel(type: int): int {
        return (type <= 147 ? 6 : 1) | 0;
    }

    /** QoL #133: a trophy's picture in the build menu (the totems one for each level). */
    public static picture(type: int, lvl: int): string {
        return type <= 147 ? "buildingbuttons/" + type + ".bb" + Math.max(1, Math.min(6, lvl)) + ".jpg" : "buildingbuttons/" + type + ".jpg";
    }

    // ---- QoL #607: trophy icons next to a name
    /**
     * A player's trophies as small icons, `size` high, side by side (left to right; or, `alignRight`, ending at the
     * sprite's 0, for the end of a column). Empty at first for another player: filled once the server has said (asked
     * for with any others wanted in the same moment, kept for 10 minutes). The player's own: from io_trophies.
     */
    public static iconsFor(userid: int, size: int = 14, alignRight: boolean = false): Sprite {
        let s: Sprite = new Sprite();
        s.name = "ioTrophyIcons";
        s.mouseEnabled = false;
        s.mouseChildren = false;
        if (!GLOBAL.INFERNO_ONLY || userid <= 0) {
            return s;
        }
        if (userid == (LOGIN._playerID | 0)) {
            IoTrophies.drawIcons(s, IoTrophies.won(), size, alignRight);
            return s;
        }
        let key: string = String(userid);
        if (IoTrophies._of[key] && getTimer() - (IoTrophies._ofAt[key] | 0) < IoTrophies.OF_KEEP_MS) {
            IoTrophies.drawIcons(s, IoTrophies._of[key], size, alignRight);
            return s;
        }
        if (!IoTrophies._waiting[key]) {
            IoTrophies._waiting[key] = [];
        }
        IoTrophies._waiting[key].push([s, size, alignRight]);
        if (!IoTrophies._asking[key]) {
            if (IoTrophies._batch == null) {
                IoTrophies._batch = [];
                setTimeout(IoTrophies.sendBatch, 30);
            }
            if (IoTrophies._batch.indexOf(userid) < 0) {
                IoTrophies._batch.push(userid);
            }
        }
        return s;
    }

    /** A player's trophies as the server last said ({ fmi1: 3, ... }), or null if not asked yet (tests). */
    public static trophiesOf(userid: int): any {
        if (userid == (LOGIN._playerID | 0)) {
            return IoTrophies.won();
        }
        return IoTrophies._of[String(userid)] || null;
    }

    private static sendBatch(): void {
        let ids: any[] = IoTrophies._batch || [];
        IoTrophies._batch = null;
        while (ids.length > 0) {
            let part: any[] = ids.splice(0, IoTrophies.OF_MAX);
            for (let id of part) {
                IoTrophies._asking[String(id)] = true;
            }
            new URLLoaderApi().load(GLOBAL.serverUrl + "trophies/of", [["ids", part.join(",")]], (r: any): void => {
                let got: any = r && (r.error === 0 || r.error === "0") && r.trophies && typeof r.trophies == "object" ? r.trophies : {};
                for (let id of part) {
                    let key: string = String(id);
                    delete IoTrophies._asking[key];
                    let t: any = got[key] && typeof got[key] == "object" ? got[key] : {};
                    IoTrophies._of[key] = t;
                    IoTrophies._ofAt[key] = getTimer();
                    IoTrophies.fill(key, t);
                }
            }, (e: IOErrorEvent): void => {
                // (no answer: no icons this time; asked again next time a name is drawn)
                for (let id of part) {
                    delete IoTrophies._asking[String(id)];
                    delete IoTrophies._waiting[String(id)];
                }
            });
        }
    }

    private static fill(key: string, t: any): void {
        let list: any[] = IoTrophies._waiting[key];
        delete IoTrophies._waiting[key];
        for (let w of as3.values(list || [])) {
            IoTrophies.drawIcons(as3.as(w[0], Sprite), t, w[1] | 0, Boolean(w[2]));
        }
    }

    /** The icons of the trophies in `t` drawn into `s` (what was there first taken away). */
    private static drawIcons(s: Sprite, t: any, size: int, alignRight: boolean): void {
        while (s.numChildren > 0) {
            s.removeChildAt(0);
        }
        let shown: any[] = [];
        for (let row of IoTrophies.LIST) {
            let n: number = t ? Number(t[row[0]]) : 0;
            if (n > 0) {
                shown.push([String(row[0]), Math.floor(n) | 0]);
            }
        }
        let step: int = (size + 2) | 0;
        let x: int = (alignRight ? -shown.length * step + 2 : 0) | 0;
        for (let one of shown) {
            let icon: Shape = new Shape();
            icon.name = "ioTrophyIcon:" + one[0];
            IoTrophies.drawIcon(icon.graphics, String(one[0]), one[1] | 0);
            icon.scaleX = icon.scaleY = size / 14;
            icon.x = x;
            s.addChild(icon);
            x += step;
        }
    }

    /** One trophy's icon, 14 x 14: a cup for the Gauntlet's (gold; the Purist's silver), a totem for the invasions'. */
    private static drawIcon(g: Graphics, key: string, lvl: int): void {
        if (key == "gauntlet" || key == "gauntlet_nocat") {
            let fill: uint = (key == "gauntlet" ? 0xE8B828 : 0xD6DCE2) >>> 0;
            let edge: uint = (key == "gauntlet" ? 0x5E400C : 0x43474D) >>> 0;
            g.lineStyle(1, edge, 1, true);
            // the handles
            g.drawCircle(2.5, 4, 1.8);
            g.drawCircle(11.5, 4, 1.8);
            g.beginFill(fill, 1);
            g.moveTo(2.5, 1);
            g.lineTo(11.5, 1);
            g.curveTo(11.5, 8.5, 7, 8.5);
            g.curveTo(2.5, 8.5, 2.5, 1);
            g.endFill();
            g.beginFill(fill, 1);
            g.drawRect(6, 8.5, 2, 2.5);
            g.drawRect(3.5, 11, 7, 2);
            g.endFill();
            if (key == "gauntlet_nocat") {
                // (the Purist's: a green mark on the cup)
                g.lineStyle(0, 0, 0);
                g.beginFill(0x3FA82A, 1);
                g.drawCircle(7, 4.2, 1.6);
                g.endFill();
            }
            return;
        }
        // the totem: a pole, its head, a notch for each of its levels up the side
        let ice: uint = (key == "fmi1" ? 0x5AB4E8 : 0x8A7AE8) >>> 0;
        g.lineStyle(1, 0x123048, 1, true);
        g.beginFill(ice, 1);
        g.drawRect(5, 4, 4, 9.5);
        g.endFill();
        g.beginFill(0xE6F4FF, 1);
        g.drawRoundRect(2.5, 0.5, 9, 4.5, 3, 3);
        g.endFill();
        g.lineStyle(0, 0, 0);
        g.beginFill(0x123048, 1);
        g.drawRect(4.5, 2, 1.5, 1.5);
        g.drawRect(8, 2, 1.5, 1.5);
        g.endFill();
        g.beginFill(0xFFD24A, 1);
        for (let i: int = 0; i < Math.min(6, Math.max(1, lvl)); i++) {
            g.drawRect(10, 12 - i * 1.6, 1.6, 1);
        }
        g.endFill();
    }

    /** A second trophy of a kind was taken away on this load (saved then). */
    private static _fixed: boolean = false;

    public static Sync(atLoad: boolean = false): void {
        if (!IoTrophies.own() || !BASE._buildingsStored) {
            return;
        }
        // (27 November, Goldair1's bug report: his four trophies two of each. One was put in storage while the yard's
        // buildings weren't all there (a poll's answer while it loaded, or one in hand being placed or moved): none
        // placed, none stored, so one more was given. Not then; and on the yard's load, any second one taken away.)
        if (!atLoad && (BASE._loading || (BASE._buildingCount | 0) <= 0 || GLOBAL._newBuilding)) {
            return;
        }
        let added: any[] = [];
        for (let t of IoTrophies.LIST) {
            let type: int = t[1] | 0;
            let lvl: int = IoTrophies.level(type);
            if (lvl <= 0) {
                continue;
            }
            let here: any[] = IoTrophies.placed(type);
            if (atLoad && here.length + InventoryManager.buildingStorageCount(type) > 1) {
                // (one of each: a stored one goes first, then any placed after the first)
                while (InventoryManager.buildingStorageCount(type) > 0 && here.length + InventoryManager.buildingStorageCount(type) > 1) {
                    InventoryManager.buildingStorageRemove(type);
                    if (InventoryManager.buildingStorageCount(type) > 0) {
                        BASE._buildingsStored["bl" + type] = new SecNum(lvl);
                    }
                }
                while (here.length > 1) {
                    let extra: any = here.pop();
                    extra.RecycleC();
                    // (RecycleC puts a decoration in storage: taken out again)
                    InventoryManager.buildingStorageRemove(type);
                }
                IoTrophies._fixed = true;
            }
            for (let b of here) {
                if (b._lvl.Get() != lvl) {
                    b._lvl.Set(lvl);
                    b._hpLvl = lvl;
                }
            }
            let stored: int = InventoryManager.buildingStorageCount(type);
            if (here.length == 0 && stored == 0) {
                InventoryManager.buildingStorageAdd(type, lvl);
                stored = 1;
                if (!IoTrophies._told[type + ":" + lvl]) {
                    added.push(t);
                }
            } else if (stored > 0) {
                let was: int = BASE._buildingsStored["bl" + type] ? BASE._buildingsStored["bl" + type].Get() | 0 : 0;
                if (was < lvl && !IoTrophies._told[type + ":" + lvl] && was > 0) {
                    added.push(t);
                }
            }
            if (stored > 0) {
                BASE._buildingsStored["bl" + type] = new SecNum(lvl);
            }
            IoTrophies._told[type + ":" + lvl] = true;
        }
        if (IoTrophies._fixed) {
            IoTrophies._fixed = false;
            if (!added.length) {
                BASE.Save();
            }
        }
        if (added.length) {
            let names: any[] = [];
            for (let a of added) {
                names.push("<b>" + KEYS.Get(String(a[2])) + "</b>");
            }
            // (QoL #134: "Place it now" puts the first in hand, in the player's own yard)
            let first: int = added[0][1] | 0;
            let canPlace: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard;
            GLOBAL.Message(KEYS.Get(added.length == 1 ? "io_t3m_tr_won_one" : "io_t3m_tr_won_n", { "v1": names.join(", ") }), canPlace ? KEYS.Get("io_place_now") : null, canPlace ? (): void => {
                IoTrophies.placeNow(first);
            } : null);
            BASE.Save();
        }
    }
}
