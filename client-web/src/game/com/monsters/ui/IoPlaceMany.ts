import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, KeyboardEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout } from "flash/utils";
import { BASE, BFOUNDATION, BUILDING14, GLOBAL, INFERNOQUAKETOWER, InstanceManager, KEYS, MAP, POPUPS, SecNum } from "@game";

/**
 * Inferno-only (7 October, the user's: "when buying a wall from the buildings menu add a quantity selector to how
 * many get bought (up to the limit), these walls are instantly built - each is placed with a click on the
 * yard"). The buildings menu's Block has a quantity (BUILDINGOPTIONSPOPUP.ioQuantityRow); after the first is
 * put down the next is in the hand at once, until all are placed. Each is paid for as it is put down (bone, or
 * shiny with the instant option), so stopping part way (Esc, or clicking off the yard) costs only those placed.
 * A block is built the moment it is placed (BFOUNDATION.ioPlaceInner: a wall needs no worker).
 * Later the same evening (the user's: "buy multiple traps at the same time like blocks"): traps too, the same
 * way (bought several at a time, each built the moment it is placed).
 */
export class IoPlaceMany extends ASObject {
    /** What is being placed: {type, left (after the one in hand), instant, cost (shiny each)}, or null. */
    public static active: any = null;

    private static _label: TextField = null;

    /** Is this a building bought several at a time (a block or a trap)? */
    public static many(type: int): boolean {
        let props: any = GLOBAL._buildingProps[type - 1];
        return props != null && (props.type == "wall" || props.type == "trap");
    }

    /** The most of a building that can still be put in this yard (its limit at this Hall level, less those up). */
    public static room(type: int): int {
        if (GLOBAL.ioNoLimits()) {
            return 99;
        }
        let props: any = GLOBAL._buildingProps[type - 1];
        if (!props || !props.quantity) {
            return 0;
        }
        let q: any[] = as3.as(props.quantity, Array);
        let lvl: int = GLOBAL.townHall ? GLOBAL.townHall._lvl.Get() | 0 : 0;
        let re: any[] = as3.as(props.costs[0].re, Array);
        if (re && re[0] && re[0][0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
            lvl = GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL);
        }
        let limit: int = q[lvl < q.length ? lvl : q.length - 1] | 0;
        let have: int = 0;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b._type == type && b !== GLOBAL._newBuilding) {
                have++;
            }
        }
        return Math.max(0, limit - have) | 0;
    }

    /** Starts placing n of a building: the first is already in the hand (BASE.addBuildingB). */
    public static start(type: int, n: int, instant: boolean, cost: int): void {
        IoPlaceMany.active = n > 1 ? { "type": type, "left": n - 1, "instant": instant, "cost": cost } : null;
        IoPlaceMany.hint();
        if (IoPlaceMany.active && GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoPlaceMany.onKey);
        }
    }

    public static stop(): void {
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoPlaceMany.onKey);
        }
        if (IoPlaceMany.active) {
            IoPlaceMany.active = null;
            IoPlaceMany.hint();
        }
    }

    /** Esc: the one in hand put back, the rest not bought. */
    private static onKey(e: KeyboardEvent): void {
        if (e.keyCode != 27 || !IoPlaceMany.active) {
            return;
        }
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        IoPlaceMany.stop();
    }

    /** Is one of a run being placed (a click on a taken spot then keeps it in the hand, not cancelled)? */
    public static holding(type: int): boolean {
        return IoPlaceMany.active != null && (IoPlaceMany.active.type | 0) == type;
    }

    /** One was put down (BFOUNDATION.Place): the next into the hand, a moment later (after this click). */
    public static placed(b: BFOUNDATION): void {
        let m: any = null;
        m = IoPlaceMany.active;
        if (!m) {
            return;
        }
        if (b._type != (m.type | 0) || (m.left | 0) <= 0) {
            IoPlaceMany.stop();
            return;
        }
        // (QoL #47: while a line of walls is dragged, the next is in the hand at once: the line goes on this frame)
        if (GLOBAL.INFERNO_ONLY && IoPlaceMany._line && IoPlaceMany._line.on) {
            IoPlaceMany.takeNext(m);
            return;
        }
        setTimeout((): void => {
            IoPlaceMany.takeNext(m);
        }, 40);
    }

    /** The next of the run into the hand (or the run stopped: no room, no resources, or no shiny for it). */
    private static takeNext(m: any): void {
        if (IoPlaceMany.active !== m || GLOBAL._newBuilding) {
            return;
        }
        let can: any = BASE.CanBuild(m.type | 0, Boolean(m.instant));
        if (can.error) {
            IoPlaceMany.stop();
            GLOBAL.Message(String(can.errorMessage));
            return;
        }
        if (m.instant && BASE._credits.Get() < (m.cost | 0)) {
            IoPlaceMany.stop();
            POPUPS.DisplayGetShiny();
            return;
        }
        m.left = (m.left | 0) - 1;
        let next: BFOUNDATION = BASE.addBuildingB(m.type | 0, Boolean(m.instant));
        if (!next) {
            IoPlaceMany.stop();
            return;
        }
        if (m.instant) {
            next._buildInstant = true;
            next._buildInstantCost = new SecNum(m.cost | 0);
        }
        IoPlaceMany.active = m;
        if (!m.implicit) {
            IoPlaceMany.hint();
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Inferno-only (QoL #47): a straight line of walls, dragged in the yard (as the planner's wall tool lays them)
    // ---------------------------------------------------------------------------------------------
    /**
     * With a wall in the hand, a mouse's press on a free spot and a drag lays walls one after another along the
     * yard's grid, on the axis the drag first goes (a wall's width a step), each put down as a click does (paid and
     * built at once: BFOUNDATION.ioLinePut, Place) as the pointer reaches it; spots taken are skipped. It goes on
     * while there are walls left of the run (IoPlaceMany.start), or, for a single wall bought, as many as the yard
     * still has room for, and stops when the resources run out (the run's own check, said). Let go: the line ends;
     * the rest of a run stays in the hand, a single wall's line was all of it. A press with Shift, or on a spot that
     * is taken, drags the yard as before; a click without a drag puts one down as before. A finger has its own way
     * (BFOUNDATION, QoL #547).
     */
    private static _line: any = null;

    /** A wall's size along the yard's grid; one step of the line on the screen (the yard's iso view). */
    private static readonly LINE_CELL: int = 20;

    /** The lift that ended a line (and when): Place does nothing for it (BFOUNDATION.Place). */
    private static _swallowEvent: any = null;

    private static _swallowAt: int = -100000;

    /** A mouse press on the yard with `b` in the hand (BFOUNDATION.ioPlacePress). */
    public static linePress(b: BFOUNDATION, e: MouseEvent): void {
        if (!GLOBAL.INFERNO_ONLY || !b || GLOBAL._newBuilding !== b || !b._mc || !b._buildingProps || b._buildingProps.type != "wall" || !MAP._GROUND || !MAP._GROUND.stage) {
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioTdMode() || (e && e.shiftKey) || IoPlaceMany._line) {
            return;
        }
        if (BASE.BuildBlockers(b, false) != "") {
            return;
        }
        let st: any = MAP._GROUND.stage;
        IoPlaceMany._line = { "type": b._type, "sx": b._mc.x, "sy": b._mc.y, "mx": MAP._GROUND.mouseX, "my": MAP._GROUND.mouseY, "gx": MAP._GROUND.x, "gy": MAP._GROUND.y, "done": -1, "axis": 0, "sign": 1, "on": false, "implicit": false, "stage": st };
        st.addEventListener(Event.ENTER_FRAME, IoPlaceMany.lineFrame);
        st.addEventListener(MouseEvent.MOUSE_UP, IoPlaceMany.lineUp, true, int.MAX_VALUE - 2);
    }

    /** Is a line of walls being dragged? */
    public static get lining(): boolean {
        return IoPlaceMany._line != null && Boolean(IoPlaceMany._line.on);
    }

    private static lineFrame(param1: Event = null): void {
        let L: any = IoPlaceMany._line;
        if (!L) {
            return;
        }
        // (the press started a drag of the yard: it stays where it was, the walls follow the pointer)
        if (MAP._dragging) {
            MAP.Release(null);
            MAP._dragged = false;
            MAP.tx = Number(L.gx);
            MAP.ty = Number(L.gy);
        }
        IoPlaceMany.lineUpdate(false);
    }

    /** Walls put down up to the pointer. */
    private static lineUpdate(final: boolean): void {
        let L: any = IoPlaceMany._line;
        let held: BFOUNDATION = GLOBAL._newBuilding;
        if (!L || !MAP._GROUND) {
            return;
        }
        if (!held || held._type != (L.type | 0)) {
            // (the run is over: no more walls, Esc, or no more resources)
            IoPlaceMany.lineEnd();
            return;
        }
        let dx: number = MAP._GROUND.mouseX - Number(L.mx);
        let dy: number = MAP._GROUND.mouseY - Number(L.my);
        // (along the yard's grid, GRID.FromISO's axes)
        let ga: number = dx * 0.5 + dy;
        let gb: number = dy - dx * 0.5;
        let cell: int = IoPlaceMany.LINE_CELL;
        if (!L.on) {
            if (Math.max(Math.abs(ga), Math.abs(gb)) < cell * 0.5) {
                // (not a wall's width yet: still a click)
                return;
            }
            L.on = true;
            L.axis = Math.abs(ga) >= Math.abs(gb) ? 1 : 2;
            if (!IoPlaceMany.active) {
                // (a single wall bought: the line goes on as far as the yard has room for walls)
                IoPlaceMany.active = { "type": held._type, "left": Math.max(0, IoPlaceMany.room(held._type) - 1), "instant": Boolean(held._buildInstant), "cost": held._buildInstantCost ? held._buildInstantCost.Get() | 0 : 0, "implicit": true };
                L.implicit = true;
                if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
                    GLOBAL._ROOT.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoPlaceMany.onKey);
                }
            }
        }
        let along: number = L.axis == 1 ? ga : gb;
        let n: int = Math.round(along / cell) | 0;
        let count: int = Math.min(500, Math.abs(n)) | 0;
        let sign: int = n < 0 ? -1 : 1;
        if (L.done >= 0 && sign != (L.sign | 0) && count > 0) {
            // (back past the start: the line goes on the other way from it)
            L.done = 0;
        }
        L.sign = sign;
        // (one wall along the grid's first axis is (20, 10) on the screen; along the second, (-20, 10))
        let stepX: number = (L.axis == 1 ? cell : -cell) * sign;
        let stepY: number = cell * 0.5 * sign;
        let i: int = (L.done + 1) | 0;
        while (i <= count) {
            held = GLOBAL._newBuilding;
            if (!held || held._type != (L.type | 0)) {
                IoPlaceMany.lineEnd();
                return;
            }
            held.ioLinePut(Number(L.sx) + stepX * i, Number(L.sy) + stepY * i);
            L.done = i;
            i++;
        }
    }

    /** The lift: the line up to there, then no more (and a single wall's leftover put back). */
    private static lineUp(param1: MouseEvent = null): void {
        let L: any = IoPlaceMany._line;
        if (!L) {
            return;
        }
        IoPlaceMany.lineUpdate(true);
        IoPlaceMany.lineEnd();
        if (!L.on) {
            return;
        }
        IoPlaceMany._swallowEvent = param1;
        IoPlaceMany._swallowAt = getTimer();
        MAP._dragged = false;
        if (L.implicit && IoPlaceMany.active && IoPlaceMany.active.implicit) {
            let held: BFOUNDATION = GLOBAL._newBuilding;
            if (held && held._type == (L.type | 0)) {
                held.Cancel();
            }
            IoPlaceMany.stop();
        }
    }

    private static lineEnd(): void {
        let L: any = IoPlaceMany._line;
        IoPlaceMany._line = null;
        if (L && L.stage) {
            L.stage.removeEventListener(Event.ENTER_FRAME, IoPlaceMany.lineFrame);
            L.stage.removeEventListener(MouseEvent.MOUSE_UP, IoPlaceMany.lineUp, true);
        }
    }

    /** Is this lift the one that ended a line (BFOUNDATION.Place then puts nothing down)? */
    public static lineSwallows(e: MouseEvent): boolean {
        if (!e) {
            return false;
        }
        return e === IoPlaceMany._swallowEvent || getTimer() - IoPlaceMany._swallowAt < 40;
    }

    /** "Placing blocks: 4 to go..." (or traps) over the yard while a run is being placed. */
    private static hint(): void {
        if (!IoPlaceMany.active) {
            if (IoPlaceMany._label && IoPlaceMany._label.parent) {
                IoPlaceMany._label.parent.removeChild(IoPlaceMany._label);
            }
            return;
        }
        if (!IoPlaceMany._label) {
            IoPlaceMany._label = new TextField();
            let f: TextFormat = new TextFormat("Verdana", 14, 0xFFFFFF, true);
            f.align = TextFormatAlign.CENTER;
            IoPlaceMany._label.defaultTextFormat = f;
            IoPlaceMany._label.selectable = false;
            IoPlaceMany._label.mouseEnabled = false;
            IoPlaceMany._label.width = 560;
            IoPlaceMany._label.height = 24;
            IoPlaceMany._label.filters = [new GlowFilter(0, 1, 4, 4, 6, 2)];
        }
        let props: any = GLOBAL._buildingProps[(IoPlaceMany.active.type | 0) - 1];
        let name: string = props ? KEYS.Get(String(props.name)) : "";
        let togo: int = ((IoPlaceMany.active.left | 0) + 1) | 0;
        IoPlaceMany._label.text = KEYS.Get("io_t3m_pm_placing", { "v1": name ? name.toLowerCase() : KEYS.Get("io_t3m_pm_them"), "v2": togo });
        // (QoL #47: blocks can be dragged in a line)
        if (GLOBAL.INFERNO_ONLY && props && props.type == "wall") {
            IoPlaceMany._label.text += " " + KEYS.Get("io_yin_line_hint");
        }
        let s: any = GLOBAL._SCREEN;
        IoPlaceMany._label.x = Number(s.x) + (Number(s.width) - IoPlaceMany._label.width) / 2;
        IoPlaceMany._label.y = Number(s.y) + 64;
        if (!IoPlaceMany._label.parent && GLOBAL._layerTop) {
            GLOBAL._layerTop.addChild(IoPlaceMany._label);
        }
    }
}
