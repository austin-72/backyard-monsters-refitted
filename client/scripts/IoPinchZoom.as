package {
    import com.monsters.maproom_advanced.MapRoom;
    import flash.display.Stage;
    import flash.events.TouchEvent;
    import flash.geom.Point;
    import flash.ui.Multitouch;
    import flash.ui.MultitouchInputMode;

    /**
     * Inferno-only: pinch to zoom on touch screens. Two fingers moving apart zoom in, together zoom out;
     * one step per pinch, between the zoom levels the game already has (the yard's zoom button, the world
     * map's Zoom in / Zoom out), so the camera's scroll limits stay the tested ones.
     * Needs touch events: Flash Player / AIR on touch devices, or a browser build that passes touches on.
     */
    public class IoPinchZoom {

        private static const ZOOM_IN_RATIO:Number = 1.3;

        private static const ZOOM_OUT_RATIO:Number = 0.77;

        private static var _installed:Boolean = false;

        private static var _points:Object = {};

        private static var _count:int = 0;

        private static var _startDistance:Number = 0;

        private static var _stepped:Boolean = false;

        public static function Install(param1:Stage):void {
            if (_installed || !param1 || !GLOBAL.INFERNO_ONLY) {
                return;
            }
            _installed = true;
            try {
                // Touch points, not gestures: every touch arrives, and Flash still turns the first finger into
                // the mouse, so tapping and dragging keep working.
                Multitouch.inputMode = MultitouchInputMode.TOUCH_POINT;
            }
            catch (e:Error) {
            }
            param1.addEventListener(TouchEvent.TOUCH_BEGIN, onBegin, true, int.MAX_VALUE);
            param1.addEventListener(TouchEvent.TOUCH_MOVE, onMove, true, int.MAX_VALUE);
            param1.addEventListener(TouchEvent.TOUCH_END, onEnd, true, int.MAX_VALUE);
        }

        private static function onBegin(e:TouchEvent):void {
            if (!_points[e.touchPointID]) {
                _count++;
            }
            _points[e.touchPointID] = new Point(e.stageX, e.stageY);
            if (_count == 2) {
                _startDistance = spread();
                _stepped = false;
                // The first finger started a yard drag; a pinch is not a drag.
                MAP.Release(null);
            }
        }

        private static function onMove(e:TouchEvent):void {
            if (!_points[e.touchPointID]) {
                return;
            }
            _points[e.touchPointID] = new Point(e.stageX, e.stageY);
            if (_count != 2 || _stepped || _startDistance < 20) {
                return;
            }
            var ratio:Number = spread() / _startDistance;
            if (ratio >= ZOOM_IN_RATIO) {
                _stepped = true;
                zoom(true);
            }
            else if (ratio <= ZOOM_OUT_RATIO) {
                _stepped = true;
                zoom(false);
            }
        }

        private static function onEnd(e:TouchEvent):void {
            if (_points[e.touchPointID]) {
                delete _points[e.touchPointID];
                _count = Math.max(0, _count - 1);
            }
            if (_count < 2) {
                _stepped = false;
                _startDistance = 0;
            }
        }

        /** Distance between the first two fingers down. */
        private static function spread():Number {
            var a:Point = null;
            var b:Point = null;
            for each (var p:Point in _points) {
                if (!a) {
                    a = p;
                }
                else if (!b) {
                    b = p;
                }
            }
            return a && b ? Point.distance(a, b) : 0;
        }

        /** Halfway between the first two fingers down (stage coordinates), or null. */
        private static function middle():Point {
            var a:Point = null;
            var b:Point = null;
            for each (var p:Point in _points) {
                if (!a) {
                    a = p;
                }
                else if (!b) {
                    b = p;
                }
            }
            return a && b ? new Point((a.x + b.x) * 0.5, (a.y + b.y) * 0.5) : null;
        }

        private static function zoom(zoomIn:Boolean):void {
            var at:Point = middle();
            if (MapRoom.ioPinch(zoomIn, at ? at.x : NaN, at ? at.y : NaN)) {
                // The map room: one step per pinch, towards the fingers; pinching on goes on stepping.
                _startDistance = spread();
                _stepped = false;
                return;
            }
            // The yard: GLOBAL._zoomed is the zoomed-out view.
            if (zoomIn && GLOBAL._zoomed || !zoomIn && !GLOBAL._zoomed) {
                GLOBAL.Zoom();
            }
        }
    }
}
