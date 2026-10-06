import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Stage } from "flash/display";
import { TouchEvent } from "flash/events";
import { Point } from "flash/geom";
import { Multitouch, MultitouchInputMode } from "flash/ui";
import { GLOBAL, MAP, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: pinch to zoom on touch screens. Two fingers moving apart zoom in, together zoom out;
 * one step per pinch, between the zoom levels the game already has (the yard's zoom button, the world
 * map's Zoom in / Zoom out), so the camera's scroll limits stay the tested ones.
 * Needs touch events: Flash Player / AIR on touch devices, or a browser build that passes touches on.
 */
export class IoPinchZoom extends ASObject {
    private static readonly ZOOM_IN_RATIO: number = 1.3;

    private static readonly ZOOM_OUT_RATIO: number = 0.77;

    private static _installed: boolean = false;

    private static _points: any = {};

    private static _count: int = 0;

    private static _startDistance: number = 0;

    private static _stepped: boolean = false;

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
    }

    private static onBegin(e: TouchEvent): void {
        if (!IoPinchZoom._points[e.touchPointID]) {
            IoPinchZoom._count++;
        }
        IoPinchZoom._points[e.touchPointID] = new Point(e.stageX, e.stageY);
        if (IoPinchZoom._count == 2) {
            IoPinchZoom._startDistance = IoPinchZoom.spread();
            IoPinchZoom._stepped = false;
            // The first finger started a yard drag; a pinch is not a drag.
            MAP.Release(null);
        }
    }

    private static onMove(e: TouchEvent): void {
        if (!IoPinchZoom._points[e.touchPointID]) {
            return;
        }
        IoPinchZoom._points[e.touchPointID] = new Point(e.stageX, e.stageY);
        if (IoPinchZoom._count != 2 || IoPinchZoom._stepped || IoPinchZoom._startDistance < 20) {
            return;
        }
        let ratio: number = IoPinchZoom.spread() / IoPinchZoom._startDistance;
        if (ratio >= IoPinchZoom.ZOOM_IN_RATIO) {
            IoPinchZoom._stepped = true;
            IoPinchZoom.zoom(true);
        } else if (ratio <= IoPinchZoom.ZOOM_OUT_RATIO) {
            IoPinchZoom._stepped = true;
            IoPinchZoom.zoom(false);
        }
    }

    private static onEnd(e: TouchEvent): void {
        if (IoPinchZoom._points[e.touchPointID]) {
            delete IoPinchZoom._points[e.touchPointID];
            IoPinchZoom._count = Math.max(0, IoPinchZoom._count - 1) | 0;
        }
        if (IoPinchZoom._count < 2) {
            IoPinchZoom._stepped = false;
            IoPinchZoom._startDistance = 0;
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

    private static zoom(zoomIn: boolean): void {
        let at: Point = IoPinchZoom.middle();
        if (MapRoom.ioPinch(zoomIn, at ? at.x : NaN, at ? at.y : NaN)) {
            // The map room: one step per pinch, towards the fingers; pinching on goes on stepping.
            IoPinchZoom._startDistance = IoPinchZoom.spread();
            IoPinchZoom._stepped = false;
            return;
        }
        // The yard: GLOBAL._zoomed is the zoomed-out view.
        if (zoomIn && GLOBAL._zoomed || !zoomIn && !GLOBAL._zoomed) {
            GLOBAL.Zoom();
        }
    }
}
