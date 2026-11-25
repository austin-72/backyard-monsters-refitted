import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, DisplayObjectContainer, InteractiveObject, Sprite, Stage } from "flash/display";
import { Event, MouseEvent, TouchEvent } from "flash/events";
import { Point } from "flash/geom";
import { Multitouch, MultitouchInputMode } from "flash/ui";
import { ArcadeGame, BASE, GLOBAL, MAP, MapRoomManager, TUTORIAL, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";
import { getTimer } from "flash/utils";

/**
 * Inferno-only: pinch to zoom on touch screens.
 *
 * The yard (8 October, as the base game's Android app does it, GAME.onZoom on its android branch): two fingers
 * moving apart magnify the yard smoothly, towards the point between them, up to `LENS_MAX` times; together,
 * back down to normal size. The lens scales the yard's layer (GLOBAL._layerMap) around the middle of the
 * screen and moves the camera so the point between the fingers stays under them; the HUD and windows are not
 * scaled. The camera's limits widen by the part of the screen the lens leaves out (MAP.Scroll, lensMarginX /
 * lensMarginY), so every corner of the yard can still be reached. Pinching in at normal size steps out to the
 * game's own zoomed-out view (its zoom button); pinching out of that view comes back to normal first.
 *
 * The world map: one step per pinch between its Zoom in / Zoom out levels (MapRoom.ioPinch).
 *
 * QoL #218: two fingers dragged together at normal size move the yard (a pinch within PAN_ZONE of its start
 * spread is a pan, not a zoom). QoL #219: a double tap on the yard magnifies it to DOUBLE_TAP_LENS there, and back
 * to normal size (from the zoomed-out view: back to normal size). QoL #221: `touched` once a finger has touched
 * the screen (the arcade's touch controls then show on any device). QoL #549: asks the web player for touch slop
 * (stage.$ioTouch, see Install). QoL #34: on a trackpad, two fingers scrolled move the yard and a pinch (or Ctrl
 * with the wheel) zooms it smoothly; a mouse's wheel zooms as before (onWheel, from the browser's own wheel event).
 *
 * Needs touch events: Flash Player / AIR on touch devices, or a browser build that passes touches on.
 */
export class IoPinchZoom extends ASObject {
    private static readonly ZOOM_IN_RATIO: number = 1.3;

    private static readonly ZOOM_OUT_RATIO: number = 0.77;

    /** The most the yard is magnified. */
    public static readonly LENS_MAX: number = 3;

    private static _installed: boolean = false;

    /** Not while an arcade game's touch controls are up (a stick and a button held are two fingers, not a pinch). */
    public static paused: boolean = false;

    /** How much the yard is magnified now (1: not at all). */
    public static lens: number = 1;

    private static _points: any = {};

    private static _count: int = 0;

    private static _startDistance: number = 0;

    private static _startLens: number = 1;

    private static _stepped: boolean = false;

    /** The yard's point (ground coordinates) between the fingers when the pinch began: it stays under them. */
    private static _anchor: Point = null;

    /** QoL #218: a pinch this close to its start spread (either way, from normal size) moves the yard, not the lens. */
    private static readonly PAN_ZONE: number = 1.08;

    /** QoL #218: where the fingers' middle was when the pinch began (the yard layer's parent's coordinates)... */
    private static _panFrom: Point = null;

    /** ...and where the ground was then. */
    private static _panGround: Point = null;

    /** QoL #221: a finger has touched the screen in this visit (a touch screen, whatever the device says it is). */
    public static touched: boolean = false;

    /** QoL #219: how much a double tap magnifies the yard. */
    public static readonly DOUBLE_TAP_LENS: number = 2;

    /** QoL #219: frames a double tap's zoom takes (40 a second). */
    private static readonly ANIM_FRAMES: int = 8;

    /** QoL #219: the finger of the gesture under way: where and when it went down, if it moved or had company. */
    private static _downId: int = -1;

    private static _downAt: int = -100000;

    private static _downX: number = 0;

    private static _downY: number = 0;

    private static _gestureMoved: boolean = false;

    private static _gestureMulti: boolean = false;

    /** QoL #219: the last tap on the yard (getTimer, stage coordinates). */
    private static _tapAt: int = -100000;

    private static _tapX: number = 0;

    private static _tapY: number = 0;

    /** QoL #219: the double tap's zoom under way: {from, to, at, anchor, frame}, or null. */
    private static _anim: any = null;

    private static _animStage: Stage = null;

    public static Install(param1: Stage): void {
        if (IoPinchZoom._installed || !param1 || !GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoPinchZoom._installed = true;
        try {
            // Touch points, not gestures: every touch arrives, and Flash still turns the first finger into
            // the mouse, so tapping and dragging keep working.
            Multitouch.inputMode = MultitouchInputMode.TOUCH_POINT;
        } catch (e) {
        }
        param1.addEventListener(TouchEvent.TOUCH_BEGIN, IoPinchZoom.onBegin, true, int.MAX_VALUE);
        param1.addEventListener(TouchEvent.TOUCH_MOVE, IoPinchZoom.onMove, true, int.MAX_VALUE);
        param1.addEventListener(TouchEvent.TOUCH_END, IoPinchZoom.onEnd, true, int.MAX_VALUE);
        param1.addEventListener(MouseEvent.MOUSE_WHEEL, IoPinchZoom.onWheel);
        // (QoL #34: the browser's own wheel event, seen just before the web player turns it into a turn of the wheel,
        // so onWheel knows a trackpad's two-finger scroll and a pinch from a mouse's wheel)
        try {
            let w: any = globalThis as any;
            if (w && w.addEventListener) {
                w.addEventListener("wheel", IoPinchZoom.onRawWheel, { "capture": true, "passive": true });
            }
        } catch (e) {
        }
        // (QoL #549 / #550: the web player's touch slop: a finger's tap just beside a small button presses it. Which
        // buttons may be found so, for what was tapped: not the yard's own (a tap beside a building is a tap on the
        // ground), and none from an arcade game's area (its taps are moves))
        (param1 as any).$ioTouch = { "slop": IoPinchZoom.slopAllowed };
    }

    /** QoL #545: a finger is on the screen (a mouse press now is that finger's: the lists' swipe to scroll). */
    public static get fingerDown(): boolean {
        return IoPinchZoom._count > 0;
    }

    /**
     * QoL #545: swipe to scroll, for a list that scrolls itself (the stock ScrollSet, ScrollSetV and ScrollSetH lists
     * and IoScrollPane do it already): a finger dragging `target` up or down (`horizontal`: sideways) calls by(d)
     * with how far it moved since the last call (target's parent's pixels; up or left negative), once it has moved
     * 8 pixels; the tap that ends a swipe is no click on a row. A mouse is left alone (its drags may mean more).
     */
    public static swipe(target: InteractiveObject, by: Function, horizontal: boolean = false): void {
        if (!GLOBAL.INFERNO_ONLY || !target || by == null) {
            return;
        }
        let stage: Stage = null;
        let last: number = 0;
        let swiped: boolean = false;
        let pos = (): number => {
            return Number(!target.parent ? last : horizontal ? target.parent.mouseX : target.parent.mouseY);
        };
        let move: Function = null;
        let end: Function = null;
        move = (e: MouseEvent): void => {
            if (!target.parent) {
                end(null);
                return;
            }
            let p: number = pos();
            if (!swiped && Math.abs(p - last) <= 8) {
                return;
            }
            swiped = true;
            let d: number = p - last;
            last = p;
            if (d != 0) {
                by(d);
            }
        };
        end = (e: Event): void => {
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_MOVE, move);
                stage.removeEventListener(MouseEvent.MOUSE_UP, end);
                stage = null;
            }
        };
        target.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            swiped = false;
            if (!IoPinchZoom.fingerDown || !target.stage || !target.parent) {
                return;
            }
            end(null);
            last = pos();
            stage = target.stage;
            stage.addEventListener(MouseEvent.MOUSE_MOVE, move);
            stage.addEventListener(MouseEvent.MOUSE_UP, end);
        });
        target.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (swiped) {
                swiped = false;
                e.stopImmediatePropagation();
            }
        }, true);
        target.addEventListener(Event.REMOVED_FROM_STAGE, (e: Event): void => {
            end(null);
        });
    }

    /** Is d inside the yard's layer? */
    private static onYard(d: DisplayObject): boolean {
        if (!GLOBAL._layerMap) {
            return false;
        }
        for (let o: DisplayObject = d; o; o = o.parent) {
            if (o === GLOBAL._layerMap) {
                return true;
            }
        }
        return false;
    }

    private static inArcadeGame(d: DisplayObject): boolean {
        for (let o: DisplayObject = d; o; o = o.parent) {
            if (o instanceof ArcadeGame) {
                return true;
            }
        }
        return false;
    }

    /** QoL #549: may a finger's tap on `tapped` press `button`, a button just beside it? */
    private static slopAllowed(button: DisplayObject, tapped: DisplayObject): boolean {
        if (!GLOBAL.INFERNO_ONLY || !button) {
            return false;
        }
        if (tapped && IoPinchZoom.inArcadeGame(tapped)) {
            return false;
        }
        return !IoPinchZoom.onYard(button);
    }

    /** When the wheel last turned over the yard (getTimer). */
    private static _wheelAt: int = -100000;

    /**
     * QoL #31: the mouse wheel over the yard zooms it, towards the pointer, from 1x to LENS_MAX (the pinch's lens).
     * A new turn of the wheel (after a pause) at 1x steps out to the zoomed-out view, and in from there back to 1x;
     * the turn that brought the lens back to 1x stops there. Only over the yard itself: a window, a list or the chat
     * over it keeps its wheel (they scroll), and so does the map room.
     */
    private static onWheel(e: MouseEvent): void {
        // (QoL #34: a sideways-only scroll comes with no turn of the wheel: it is let through to the trackpad's pan)
        let raw: any = IoPinchZoom.freshRaw();
        if (!GLOBAL.INFERNO_ONLY || !e || (e.delta == 0 && !raw) || MapRoom._open || !GLOBAL._layerMap || BASE._loading) {
            return;
        }
        let over: boolean = false;
        for (let o: DisplayObject = as3.as(e.target, DisplayObject); o; o = o.parent) {
            if (o === GLOBAL._layerMap) {
                over = true;
                break;
            }
        }
        // (a window's backdrop is over the yard while one is open: the wheel lands on it, not here)
        if (!over) {
            return;
        }
        let stage: Stage = GLOBAL._layerMap.stage;
        let at: Point = stage ? new Point(stage.mouseX, stage.mouseY) : null;
        // (QoL #34: a pinch on a trackpad (the browser sends it as the wheel with Ctrl), or Ctrl with the wheel,
        // zooms smoothly; a trackpad's two-finger scroll moves the yard; a mouse's wheel zooms as below)
        if (raw) {
            if (raw.ctrl || e.ctrlKey) {
                IoPinchZoom.pinchWheel(Number(raw.dy), at);
                return;
            }
            if (IoPinchZoom.isTrackpad(raw)) {
                IoPinchZoom.panBy(Number(raw.dx), Number(raw.dy));
                return;
            }
        }
        if (e.delta == 0) {
            return;
        }
        let now: int = getTimer();
        let fresh: boolean = now - IoPinchZoom._wheelAt > 300;
        IoPinchZoom._wheelAt = now;
        if (e.delta > 0) {
            if (GLOBAL._zoomed) {
                if (fresh) {
                    GLOBAL.Zoom();
                }
            } else if (IoPinchZoom.lensAllowed()) {
                IoPinchZoom.setLens(IoPinchZoom.lens * 1.2, at);
            }
        } else if (IoPinchZoom.lens > 1) {
            IoPinchZoom.setLens(IoPinchZoom.lens / 1.2 < 1.05 ? 1 : IoPinchZoom.lens / 1.2, at);
        } else if (!GLOBAL._zoomed && fresh) {
            GLOBAL.Zoom();
        }
    }

    // ---- Inferno-only (QoL #34): trackpads. Every scroll of a trackpad came to the game as turns of the wheel, so
    // two fingers moved over it zoomed the yard. The browser's own event says more: a pinch on a trackpad comes with
    // Ctrl (as Ctrl with the wheel does), and a trackpad scrolls by pixels, sideways too, in small steps, where a
    // mouse's wheel turns in notches (lines, or 100-odd pixels with the old wheelDelta of 120 a notch).
    /** The browser's last wheel event: {dx, dy (pixels), ctrl, wdy (wheelDeltaY or NaN), mode, at (getTimer)}. */
    private static _raw: any = null;

    /** The kind of the scroll under way (true: a trackpad's), kept while its events keep coming (a gesture is one kind). */
    private static _rawKind: boolean = false;

    private static _rawKindAt: int = -100000;

    /** The pinch under way: when it last moved, how far it went (ln of the zoom), whether it stepped the zoom view. */
    private static _pinchAt: int = -100000;

    private static _pinchSum: number = 0;

    private static _pinchStepped: boolean = false;

    private static _pinchFromLens: boolean = false;

    /** The browser's wheel event, before the web player's own listener (window, capture phase). */
    private static onRawWheel(ev: any): void {
        if (!ev) {
            return;
        }
        let k: number = ev.deltaMode == 1 ? 16 : ev.deltaMode == 2 ? 400 : 1;
        IoPinchZoom._raw = {
            "dx": (Number(ev.deltaX) || 0) * k,
            "dy": (Number(ev.deltaY) || 0) * k,
            "ctrl": Boolean(ev.ctrlKey),
            "wdy": typeof ev.wheelDeltaY == "number" ? Number(ev.wheelDeltaY) : NaN,
            "mode": ev.deltaMode | 0,
            "at": getTimer(),
            "used": false
        };
    }

    /** The browser's event behind the wheel event being handled (the same moment), taken once; null without one. */
    private static freshRaw(): any {
        let r: any = IoPinchZoom._raw;
        if (!r || r.used || getTimer() - (r.at | 0) > 60) {
            return null;
        }
        r.used = true;
        return r;
    }

    /** Is this scroll a trackpad's? Decided on a gesture's first event, kept while it goes on. */
    private static isTrackpad(r: any): boolean {
        let now: int = getTimer();
        if (now - IoPinchZoom._rawKindAt < 150) {
            IoPinchZoom._rawKindAt = now;
            return IoPinchZoom._rawKind;
        }
        let dx: number = Number(r.dx);
        let dy: number = Number(r.dy);
        let wdy: number = Number(r.wdy);
        let pad: boolean = false;
        if ((r.mode | 0) != 0) {
            // (lines or pages: a mouse's wheel)
            pad = false;
        } else if (dx != 0) {
            // (sideways as well: two fingers)
            pad = true;
        } else if (!isNaN(wdy) && wdy != 0) {
            // (a trackpad's old wheelDelta is three times its pixels; a wheel's is 120 a notch)
            pad = Math.abs(wdy + 3 * dy) < 2;
        } else {
            // (no wheelDelta: small or uneven steps are a trackpad's)
            pad = Math.abs(dy) < 40 || Math.abs(dy - Math.round(dy)) > 0.01;
        }
        IoPinchZoom._rawKind = pad;
        IoPinchZoom._rawKindAt = now;
        return pad;
    }

    /** The trackpad's two-finger scroll: the yard moves with it (MAP.Scroll eases the ground there, inside its limits). */
    private static panBy(dx: number, dy: number): void {
        let layer: Sprite = GLOBAL._layerMap;
        if (!layer || !MAP._GROUND || !IoPinchZoom.lensAllowed() || MAP._autoScroll || MAP._following || MAP._dragging || BASE._loading) {
            return;
        }
        let k: number = layer.scaleX > 0 ? layer.scaleX : 1;
        MAP.tx = Math.round(MAP.tx - dx / k);
        MAP.ty = Math.round(MAP.ty - dy / k);
    }

    /**
     * A pinch on the trackpad (or Ctrl with the wheel; `dy`: its pixels, out negative): the lens follows it smoothly,
     * towards the pointer, as two fingers on a touch screen do. At normal size a pinch in steps out to the zoomed-out
     * view once it has gone as far as a touch pinch must (ZOOM_OUT_RATIO), and from there a pinch out comes back
     * (ZOOM_IN_RATIO); one step a pinch. A pinch that began magnified stops at normal size.
     */
    private static pinchWheel(dy: number, at: Point): void {
        let now: int = getTimer();
        if (now - IoPinchZoom._pinchAt > 250) {
            IoPinchZoom._pinchSum = 0;
            IoPinchZoom._pinchStepped = false;
            IoPinchZoom._pinchFromLens = IoPinchZoom.lens > 1.001;
        }
        IoPinchZoom._pinchAt = now;
        IoPinchZoom._wheelAt = now;
        if (IoPinchZoom._pinchStepped || dy == 0) {
            return;
        }
        // (one notch of a mouse's wheel with Ctrl is one wheel step, as without)
        let step: number = Math.max(-Math.log(1.2), Math.min(Math.log(1.2), -dy * 0.01));
        if (GLOBAL._zoomed) {
            IoPinchZoom._pinchSum += step;
            if (IoPinchZoom._pinchSum >= Math.log(IoPinchZoom.ZOOM_IN_RATIO)) {
                IoPinchZoom._pinchStepped = true;
                GLOBAL.Zoom();
            }
            return;
        }
        if (IoPinchZoom.lens <= 1 && step < 0) {
            if (!IoPinchZoom._pinchFromLens) {
                IoPinchZoom._pinchSum += step;
                if (IoPinchZoom._pinchSum <= Math.log(IoPinchZoom.ZOOM_OUT_RATIO)) {
                    IoPinchZoom._pinchStepped = true;
                    GLOBAL.Zoom();
                }
            }
            return;
        }
        if (!IoPinchZoom.lensAllowed()) {
            return;
        }
        let to: number = IoPinchZoom.lens * Math.exp(step);
        IoPinchZoom.setLens(step < 0 && to < 1.02 ? 1 : to, at);
    }

    private static onBegin(e: TouchEvent): void {
        IoPinchZoom.touched = true;
        IoPinchZoom.stopAnim();
        if (!IoPinchZoom._points[e.touchPointID]) {
            IoPinchZoom._count++;
        }
        IoPinchZoom._points[e.touchPointID] = new Point(e.stageX, e.stageY);
        // (QoL #219: a gesture starts with its first finger; a second makes it no tap)
        if (IoPinchZoom._count == 1) {
            IoPinchZoom._downId = e.touchPointID;
            IoPinchZoom._downAt = getTimer();
            IoPinchZoom._downX = e.stageX;
            IoPinchZoom._downY = e.stageY;
            IoPinchZoom._gestureMoved = false;
            IoPinchZoom._gestureMulti = false;
        } else {
            IoPinchZoom._gestureMulti = true;
            IoPinchZoom._tapAt = -100000;
        }
        if (IoPinchZoom._count == 2 && !IoPinchZoom.paused) {
            IoPinchZoom.restart();
            // The first finger started a yard drag; a pinch is not a drag.
            MAP.Release(null);
        }
    }

    private static onMove(e: TouchEvent): void {
        if (!IoPinchZoom._points[e.touchPointID]) {
            return;
        }
        IoPinchZoom._points[e.touchPointID] = new Point(e.stageX, e.stageY);
        if (e.touchPointID == IoPinchZoom._downId && !IoPinchZoom._gestureMoved && Point.distance(new Point(e.stageX, e.stageY), new Point(IoPinchZoom._downX, IoPinchZoom._downY)) > 12) {
            IoPinchZoom._gestureMoved = true;
        }
        if (IoPinchZoom._count != 2 || IoPinchZoom._startDistance < 20 || IoPinchZoom.paused) {
            return;
        }
        // (the first finger's mouse-down can arrive after the second finger: no yard drag during a pinch)
        if (MAP._dragging) {
            MAP.Release(null);
        }
        let ratio: number = IoPinchZoom.spread() / IoPinchZoom._startDistance;
        if (MapRoomManager.instance.isOpen) {
            if (!IoPinchZoom._stepped && ratio >= IoPinchZoom.ZOOM_IN_RATIO) {
                IoPinchZoom._stepped = true;
                IoPinchZoom.mapStep(true);
            } else if (!IoPinchZoom._stepped && ratio <= IoPinchZoom.ZOOM_OUT_RATIO) {
                IoPinchZoom._stepped = true;
                IoPinchZoom.mapStep(false);
            }
            return;
        }
        IoPinchZoom.yardPinch(ratio);
    }

    private static onEnd(e: TouchEvent): void {
        let known: boolean = !!IoPinchZoom._points[e.touchPointID];
        if (known) {
            delete IoPinchZoom._points[e.touchPointID];
            IoPinchZoom._count = Math.max(0, IoPinchZoom._count - 1) | 0;
        }
        if (IoPinchZoom._count < 2) {
            IoPinchZoom._stepped = false;
            IoPinchZoom._startDistance = 0;
        }
        if (known && IoPinchZoom._count == 0 && e.touchPointID == IoPinchZoom._downId) {
            IoPinchZoom._downId = -1;
            IoPinchZoom.onTapEnd(e);
        }
    }

    /**
     * QoL #219: the last finger lifted. A quick tap without moving, on the yard, a second time within 350 ms and 40
     * pixels of the last: the double tap's zoom.
     */
    private static onTapEnd(e: TouchEvent): void {
        let now: int = getTimer();
        let tap: boolean = !IoPinchZoom._gestureMulti && !IoPinchZoom._gestureMoved && now - IoPinchZoom._downAt < 300 && IoPinchZoom.onYard(as3.as(e.target, DisplayObject));
        if (!tap) {
            IoPinchZoom._tapAt = -100000;
            return;
        }
        let near: boolean = Math.abs(e.stageX - IoPinchZoom._tapX) < 40 && Math.abs(e.stageY - IoPinchZoom._tapY) < 40;
        if (now - IoPinchZoom._tapAt < 350 && near) {
            IoPinchZoom._tapAt = -100000;
            IoPinchZoom.doubleTap(new Point(IoPinchZoom._tapX, IoPinchZoom._tapY));
            return;
        }
        IoPinchZoom._tapAt = now;
        IoPinchZoom._tapX = e.stageX;
        IoPinchZoom._tapY = e.stageY;
    }

    /** QoL #219: a double tap at `at` (stage): magnified to DOUBLE_TAP_LENS there, or back to normal size. */
    private static doubleTap(at: Point): void {
        if (!GLOBAL.INFERNO_ONLY || IoPinchZoom.paused || MapRoom._open || MapRoomManager.instance.isOpen || BASE._loading || !IoPinchZoom.lensAllowed()) {
            return;
        }
        if (GLOBAL._zoomed) {
            // (the game's zoomed-out view: back to normal size, as its zoom button)
            GLOBAL.Zoom();
            return;
        }
        IoPinchZoom.animateLens(IoPinchZoom.lens > 1.05 ? 1 : IoPinchZoom.DOUBLE_TAP_LENS, at);
    }

    /** QoL #219: the lens to `to` in ANIM_FRAMES frames, the yard at `at` staying there (at once with Reduce motion). */
    private static animateLens(to: number, at: Point): void {
        IoPinchZoom.stopAnim();
        let stage: Stage = GLOBAL._layerMap ? GLOBAL._layerMap.stage : null;
        let anchor: Point = MAP._GROUND && MAP._GROUND.stage ? MAP._GROUND.globalToLocal(at) : null;
        if (!stage || GLOBAL.ioReduceMotion) {
            IoPinchZoom.setLens(to, at, anchor);
            return;
        }
        IoPinchZoom._anim = { "from": IoPinchZoom.lens, "to": to, "at": at, "anchor": anchor, "frame": 0 };
        IoPinchZoom._animStage = stage;
        stage.addEventListener(Event.ENTER_FRAME, IoPinchZoom.animFrame);
    }

    private static animFrame(e: Event): void {
        let a: any = IoPinchZoom._anim;
        if (!a || !GLOBAL._layerMap || !GLOBAL._layerMap.stage) {
            IoPinchZoom.stopAnim();
            return;
        }
        a.frame = (a.frame | 0) + 1;
        let k: number = Math.min(1, a.frame / IoPinchZoom.ANIM_FRAMES);
        let eased: number = 1 - (1 - k) * (1 - k);
        IoPinchZoom.setLens(Number(a.from) + (Number(a.to) - Number(a.from)) * eased, as3.as(a.at, Point), as3.as(a.anchor, Point));
        if (k >= 1) {
            IoPinchZoom.stopAnim();
        }
    }

    private static stopAnim(): void {
        IoPinchZoom._anim = null;
        if (IoPinchZoom._animStage) {
            IoPinchZoom._animStage.removeEventListener(Event.ENTER_FRAME, IoPinchZoom.animFrame);
            IoPinchZoom._animStage = null;
        }
    }

    /** The pinch measured from here (its spread and the lens now). */
    private static restart(): void {
        IoPinchZoom._startDistance = IoPinchZoom.spread();
        IoPinchZoom._startLens = IoPinchZoom.lens;
        IoPinchZoom._stepped = false;
        IoPinchZoom._anchor = null;
        IoPinchZoom._panFrom = null;
        IoPinchZoom._panGround = null;
        let at: Point = IoPinchZoom.middle();
        if (at && MAP._GROUND && MAP._GROUND.stage) {
            IoPinchZoom._anchor = MAP._GROUND.globalToLocal(at);
            if (GLOBAL._layerMap && GLOBAL._layerMap.parent) {
                IoPinchZoom._panFrom = GLOBAL._layerMap.parent.globalToLocal(at);
                IoPinchZoom._panGround = new Point(MAP._GROUND.x, MAP._GROUND.y);
            }
        }
    }

    /** Distance between the first two fingers down. */
    private static spread(): number {
        let a: Point = null;
        let b: Point = null;
        for (let p of as3.values(IoPinchZoom._points)) {
            if (!a) {
                a = p;
            } else if (!b) {
                b = p;
            }
        }
        return Number(a && b ? Point.distance(a, b) : 0);
    }

    /** Halfway between the first two fingers down (stage coordinates), or null. */
    private static middle(): Point {
        let a: Point = null;
        let b: Point = null;
        for (let p of as3.values(IoPinchZoom._points)) {
            if (!a) {
                a = p;
            } else if (!b) {
                b = p;
            }
        }
        return a && b ? new Point((a.x + b.x) * 0.5, (a.y + b.y) * 0.5) : null;
    }

    private static mapStep(zoomIn: boolean): void {
        let at: Point = IoPinchZoom.middle();
        if (MapRoom.ioPinch(zoomIn, at ? at.x : NaN, at ? at.y : NaN)) {
            // One step per pinch, towards the fingers; pinching on goes on stepping.
            IoPinchZoom.restart();
        }
    }

    /** The yard: the lens follows the fingers; at its smallest, a pinch in steps out to the game's zoomed-out view. */
    private static yardPinch(ratio: number): void {
        if (GLOBAL._zoomed) {
            // (the game's zoomed-out view: a pinch out comes back to normal size, then the lens takes over)
            if (!IoPinchZoom._stepped && ratio >= IoPinchZoom.ZOOM_IN_RATIO) {
                GLOBAL.Zoom();
                IoPinchZoom.restart();
            }
            return;
        }
        let want: number = IoPinchZoom._startLens * ratio;
        // (QoL #218: from normal size, fingers kept about as far apart move the yard: the lens starts past PAN_ZONE)
        if (GLOBAL.INFERNO_ONLY && IoPinchZoom._startLens <= 1) {
            want = ratio < IoPinchZoom.PAN_ZONE ? 1 : ratio / IoPinchZoom.PAN_ZONE;
        }
        if (want <= 1) {
            if (IoPinchZoom.lens > 1) {
                IoPinchZoom.setLens(1, IoPinchZoom.middle(), IoPinchZoom._anchor);
            } else if (GLOBAL.INFERNO_ONLY && !IoPinchZoom._stepped && IoPinchZoom._startLens <= 1) {
                IoPinchZoom.pan(IoPinchZoom.middle());
            }
            // (already at normal size when the pinch began: one step out, as the zoom button)
            if (IoPinchZoom._startLens <= 1 && !IoPinchZoom._stepped && ratio <= IoPinchZoom.ZOOM_OUT_RATIO) {
                IoPinchZoom._stepped = true;
                GLOBAL.Zoom();
            }
            return;
        }
        if (!IoPinchZoom.lensAllowed()) {
            return;
        }
        IoPinchZoom.setLens(want, IoPinchZoom.middle(), IoPinchZoom._anchor);
    }

    /**
     * QoL #218: two fingers at normal size: the camera follows their middle (as one finger's drag does: MAP.Scroll
     * eases the ground there and keeps it inside the yard's limits).
     */
    private static pan(at: Point): void {
        let layer: Sprite = GLOBAL._layerMap;
        if (!at || !layer || !layer.parent || !MAP._GROUND || !IoPinchZoom._panFrom || !IoPinchZoom._panGround || !IoPinchZoom.lensAllowed() || MAP._autoScroll || MAP._following || BASE._loading) {
            return;
        }
        let p: Point = layer.parent.globalToLocal(at);
        MAP.tx = Math.round(IoPinchZoom._panGround.x + (p.x - IoPinchZoom._panFrom.x) / layer.scaleX);
        MAP.ty = Math.round(IoPinchZoom._panGround.y + (p.y - IoPinchZoom._panFrom.y) / layer.scaleY);
    }

    /** Not during the tutorial (its arrows are placed by the yard's own position on screen). */
    private static lensAllowed(): boolean {
        return GLOBAL.INFERNO_ONLY && MAP._GROUND != null && GLOBAL._layerMap != null && TUTORIAL._stage >= 200;
    }

    /**
     * Magnifies the yard `s` times (1 to LENS_MAX) around the middle of the screen. With `at` (a point on the
     * stage), the camera moves so the part of the yard there (or `anchor`, a point of the yard in the ground's
     * coordinates, taken once when a pinch begins so rounding never adds up) stays there.
     */
    public static setLens(s: number, at: Point = null, anchor: Point = null): void {
        let layer: Sprite = GLOBAL._layerMap;
        let ground: Sprite = MAP._GROUND;
        s = Math.max(1, Math.min(IoPinchZoom.LENS_MAX, s));
        if (!layer || !layer.stage) {
            IoPinchZoom.lens = 1;
            return;
        }
        let parent: DisplayObjectContainer = layer.parent;
        let pin: Point = at && parent ? parent.globalToLocal(at) : null;
        let qx: number = 0;
        let qy: number = 0;
        if (pin && ground) {
            // (the yard's point under the fingers, in the ground's own coordinates)
            qx = anchor ? anchor.x : (pin.x - layer.x) / layer.scaleX - ground.x;
            qy = anchor ? anchor.y : (pin.y - layer.y) / layer.scaleY - ground.y;
        }
        IoPinchZoom.lens = s;
        layer.scaleX = layer.scaleY = s;
        layer.x = IoPinchZoom.centreX() * (1 - s);
        layer.y = IoPinchZoom.centreY() * (1 - s);
        if (pin && ground) {
            ground.x = Math.round((pin.x - layer.x) / s - qx);
            ground.y = Math.round((pin.y - layer.y) / s - qy);
            MAP.tx = ground.x;
            MAP.ty = ground.y;
            if (MAP.instance) {
                MAP.instance.resizeViewRect();
            }
        }
    }

    /** Back to normal size (a new yard, the game's zoom button). */
    public static resetLens(): void {
        IoPinchZoom.stopAnim();
        if (IoPinchZoom.lens != 1 || GLOBAL._layerMap && (GLOBAL._layerMap.scaleX != 1 || GLOBAL._layerMap.x != 0 || GLOBAL._layerMap.y != 0)) {
            IoPinchZoom.lens = 1;
            if (GLOBAL._layerMap) {
                GLOBAL._layerMap.scaleX = GLOBAL._layerMap.scaleY = 1;
                GLOBAL._layerMap.x = GLOBAL._layerMap.y = 0;
            }
        }
    }

    private static centreX(): number {
        return Number(GLOBAL._ROOT && GLOBAL._ROOT.stage ? GLOBAL._ROOT.stage.stageWidth * 0.5 : 380);
    }

    private static centreY(): number {
        return Number(GLOBAL._ROOT && GLOBAL._ROOT.stage ? GLOBAL._ROOT.stage.stageHeight * 0.5 : 335);
    }

    /** How much further the camera may go left and right with the lens on (the part of the screen it leaves out). */
    public static get lensMarginX(): number {
        return Number(IoPinchZoom.lens > 1 ? IoPinchZoom.centreX() * (1 - 1 / IoPinchZoom.lens) : 0);
    }

    public static get lensMarginY(): number {
        return Number(IoPinchZoom.lens > 1 ? IoPinchZoom.centreY() * (1 - 1 / IoPinchZoom.lens) : 0);
    }

    /** The mouse in the yard layer's coordinates (the stage's when there is no lens): for dragging the camera. */
    public static mouseX(stage: Stage): number {
        return IoPinchZoom.lens != 1 && GLOBAL._layerMap ? GLOBAL._layerMap.mouseX : stage.mouseX;
    }

    public static mouseY(stage: Stage): number {
        return IoPinchZoom.lens != 1 && GLOBAL._layerMap ? GLOBAL._layerMap.mouseY : stage.mouseY;
    }
}
