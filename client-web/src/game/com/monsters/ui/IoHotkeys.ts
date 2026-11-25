import * as as3 from "as3";
import { int } from "as3";
import { KeyboardEvent } from "flash/events";
import { TextField, TextFieldType } from "flash/text";
import { ArcadeWindow, ATTACK, BUILDINGS, CasinoWindow, com_monsters_maproom_advanced_MapRoom as MapRoom, CREATUREBUTTON, GLOBAL, IoTd, IoTdUi, KEYS, MAP, MapRoomManager, MESSAGE, PLANNER, QUESTS, IoTilt, UI2, UI_BOTTOM, WMATTACK } from "@game";

/**
 * Inferno-only (15 October, QoL #35 and #38): keys in the player's own yard.
 *
 *  - the arrows or W A S D move the view, + and - zoom in and out, H goes to the Under Hall (#35);
 *  - B the build menu, P the Yard Planner, T the Store, M the map, Q the Quest Book, F full screen, and ? the list of
 *    keys (#38). (C banks every harvester, R reloads the last fling in an attack, Enter and Esc close: IoEscape.)
 *
 * On the map (#41): the arrows or W A S D move, + and - zoom, H home, B bookmarks the place in the middle, F Find
 * (MapRoomPopup.ioKey). In an attack (#80): 1 to 9 put one of that row's monsters in the Flinger (Shift: as many as
 * fit), Space flings where the pointer is, and Esc with nothing to close empties the Flinger.
 *
 * Only with no window open, not while typing, not in the Pit, the Arcade or Hellgate (they have keys of their own),
 * and never with Ctrl, Alt or Cmd (the browser's), nor Shift with the arrows (the photo mode's).
 * In Hellgate (#378): IoTdUi.ioKey (Space, F, P, Q W E R, S, Tab). In the Pit (#386): CasinoWindow.ioKey.
 */
export class IoHotkeys {
    private static _on: boolean = false;

    /** How far an arrow press moves the view, in the yard's pixels. */
    public static readonly STEP: int = 90;

    public static Setup(stage: any): void {
        if (IoHotkeys._on || !GLOBAL.INFERNO_ONLY || !stage) {
            return;
        }
        IoHotkeys._on = true;
        stage.addEventListener(KeyboardEvent.KEY_DOWN, (e: KeyboardEvent): void => {
            try {
                IoHotkeys.onKey(e, stage);
            } catch (err) {
            }
        });
    }

    /** Whether the keys are the yard's now. */
    public static get free(): boolean {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD) {
            return false;
        }
        if (MapRoomManager.instance.isOpen || GLOBAL._newBuilding) {
            return false;
        }
        return IoHotkeys.nothingOpen();
    }

    /** No window, message, game or the Pit open over the yard (or the map). */
    public static nothingOpen(): boolean {
        if (CasinoWindow.isOpen || ArcadeWindow.isOpen || IoTd.on || WMATTACK.ioQuiet() || GLOBAL.isHalted) {
            return false;
        }
        // (a window's dark backdrop: GLOBAL.BlockerAdd)
        if (GLOBAL.ioBlocked) {
            return false;
        }
        let win: any = GLOBAL._layerWindows;
        if (win) {
            for (let i: int = 0; i < win.numChildren; i++) {
                let d: any = win.getChildAt(i);
                if (d && d.visible) {
                    return false;
                }
            }
        }
        return !IoHotkeys.messageUp();
    }

    /** A message showing on top. */
    public static messageUp(): boolean {
        let top: any = GLOBAL._layerTop;
        if (top) {
            for (let i: int = 0; i < top.numChildren; i++) {
                let d: any = top.getChildAt(i);
                if (d instanceof MESSAGE && d.visible) {
                    return true;
                }
            }
        }
        return false;
    }

    private static onKey(e: KeyboardEvent, stage: any): void {
        if (e.ctrlKey || e.altKey || (e as any).metaKey) {
            return;
        }
        let focus: any = stage.focus;
        if (focus instanceof TextField && (focus as TextField).type == TextFieldType.INPUT) {
            return;
        }
        let k: int = e.keyCode | 0;
        // "?" (Shift and / on most keyboards), before the Shift test below
        if (k == 191 && e.shiftKey && IoHotkeys.free) {
            IoHotkeys.showList();
            return;
        }
        if (CasinoWindow.isOpen && GLOBAL.INFERNO_ONLY) {
            // (QoL #386: the Pit's keys)
            if (!e.shiftKey && !IoHotkeys.messageUp()) {
                CasinoWindow.ioKey(k);
            }
            return;
        }
        if (IoTd.on && GLOBAL.INFERNO_ONLY) {
            // (QoL #378: Hellgate's own keys, with no message or window over it)
            if (!e.shiftKey && !GLOBAL.ioBlocked && !IoHotkeys.messageUp()) {
                IoTdUi.ioKey(k);
            }
            return;
        }
        if (IoHotkeys.attacking) {
            IoHotkeys.attackKey(k, e.shiftKey);
            return;
        }
        if (!e.shiftKey && GLOBAL.INFERNO_ONLY && MapRoomManager.instance.isOpen && MapRoom._mc && MapRoom._mc.parent && IoHotkeys.nothingOpen()) {
            MapRoom._mc.ioKey(k);
            return;
        }
        if (e.shiftKey || !IoHotkeys.free) {
            return;
        }
        switch (k) {
            case 37:
            case 65:
                IoHotkeys.pan(-1, 0);
                break;
            case 39:
            case 68:
                IoHotkeys.pan(1, 0);
                break;
            case 38:
            case 87:
                IoHotkeys.pan(0, -1);
                break;
            case 40:
            case 83:
                IoHotkeys.pan(0, 1);
                break;
            case 187:
            case 107:
            case 61:
                if (GLOBAL._zoomed) {
                    GLOBAL.Zoom();
                }
                break;
            case 189:
            case 109:
            case 173:
                if (!GLOBAL._zoomed) {
                    GLOBAL.Zoom();
                }
                break;
            case 72:
                if (GLOBAL.townHall && (GLOBAL.townHall as any)._mc) {
                    MAP.FocusTo((GLOBAL.townHall as any)._mc.x | 0, (GLOBAL.townHall as any)._mc.y | 0, 0.4);
                }
                break;
            case 66:
                BUILDINGS.Show();
                break;
            case 80:
                PLANNER.Show();
                break;
            case 84:
                UI_BOTTOM.clickedStore(null);
                break;
            case 77:
                GLOBAL.ShowMap();
                break;
            case 81:
                QUESTS.Show();
                break;
            case 70:
                GLOBAL.goFullScreen(null);
                break;
        }
    }

    /** In an attack with monsters to fling (a map attack, the arcade's Siege). */
    public static get attacking(): boolean {
        let m: string = GLOBAL.mode;
        let b: any = GLOBAL.e_BASE_MODE;
        if (m != b.ATTACK && m != b.IATTACK && m != b.WMATTACK && m != b.IWMATTACK) {
            return false;
        }
        return !MapRoomManager.instance.isOpen && !!UI2._top && !!UI2._top._creatureButtons && UI2._top._creatureButtons.length > 0;
    }

    /** The monster rows of the attack bar, top to bottom (the champion's row isn't numbered). */
    public static monsterRows(): CREATUREBUTTON[] {
        let rows: CREATUREBUTTON[] = [];
        for (let b of UI2._top && UI2._top._creatureButtons ? UI2._top._creatureButtons : []) {
            if (b instanceof CREATUREBUTTON) {
                rows.push(b as CREATUREBUTTON);
            }
        }
        rows.sort((a: CREATUREBUTTON, b: CREATUREBUTTON): number => (a as any).m_index - (b as any).m_index || a.y - b.y);
        return rows;
    }

    private static attackKey(k: int, shift: boolean): void {
        if (!IoHotkeys.nothingOpen()) {
            return;
        }
        let n: int = k >= 49 && k <= 57 ? (k - 49) | 0 : (k >= 97 && k <= 105 ? (k - 97) | 0 : -1);
        if (n >= 0) {
            let rows: CREATUREBUTTON[] = IoHotkeys.monsterRows();
            if (n < rows.length) {
                let row: CREATUREBUTTON = rows[n];
                if (UI2._top.BombDeselect) {
                    UI2._top.BombDeselect();
                }
                if (shift) {
                    ATTACK.ioFill(row._creatureID);
                } else {
                    ATTACK.BucketAdd(row._creatureID);
                }
                row.Update();
                ATTACK.BucketUpdate();
            }
            return;
        }
        if (k == 32 && !shift) {
            IoHotkeys.fling();
        }
    }

    /** Space in an attack: the Flinger's load dropped where the pointer is (as a click there does). */
    public static fling(): boolean {
        let zone: any = ATTACK._dropZone;
        if (!zone || !zone.parent || ATTACK._countdown < 0) {
            return false;
        }
        zone.Follow();
        zone.Drop();
        return true;
    }

    /** Esc in an attack with nothing to close (IoEscape): the Flinger emptied. */
    public static escNothing(): void {
        if (!IoHotkeys.attacking) {
            return;
        }
        let any: boolean = false;
        for (let id in ATTACK._flingerBucket) {
            if (ATTACK.ioEmpty(id) > 0) {
                any = true;
            }
        }
        if (any) {
            for (let row of IoHotkeys.monsterRows()) {
                row.Update();
            }
            ATTACK.BucketUpdate();
        }
    }

    /** The view moved by one step (MAP.FocusTo's own terms: the ground at 380 - x, 340 - y). */
    public static pan(dx: int, dy: int): void {
        let g: any = MAP._GROUND;
        if (!g) {
            return;
        }
        let k: number = IoTilt.canvasK > 0 ? IoTilt.canvasK : 1;
        // (from where a glide already started is heading, so a held key keeps going)
        let gx: number = MAP._autoScroll ? MAP.tx : g.x;
        let gy: number = MAP._autoScroll ? MAP.ty : g.y;
        MAP.FocusTo((380 - gx + dx * IoHotkeys.STEP) | 0, ((340 - gy) / k + dy * IoHotkeys.STEP) | 0, 0.15);
    }

    private static showList(): void {
        GLOBAL.Message(KEYS.Get("io_keys_list"));
    }
}
