package com.monsters.maproom_advanced {
    import flash.display.Bitmap;
    import flash.display.Graphics;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.ColorTransform;
    import flash.geom.Point;

    /**
     * Inferno-only: the minimap, at the top of the panel right of the map. The whole world small (the world
     * map's terrain), your yards and the portals to the Depths of Hell (light purple) on it, and a box round
     * the part the map shows. Click or drag in it to move the map there.
     */
    public class IoMapMinimap extends Sprite {

        private var _size:int;

        private var _body:Sprite;

        private var _terrain:Bitmap;

        private var _yards:Shape;

        private var _view:Shape;

        private var _onPick:Function;

        private var _drawnVersion:int = -1;

        private var _drawnPortals:int = -1;

        private var _dragging:Boolean = false;

        /** The view box, in cells: middle and size. */
        private var _vx:Number = 0;

        private var _vy:Number = 0;

        private var _vw:Number = 0;

        private var _vh:Number = 0;

        /**
         * onPick(cellX, cellY, done): the map is to move so that cell is in the middle; done is false while
         * the mouse is still dragging.
         */
        public function IoMapMinimap(size:int, onPick:Function) {
            super();
            this._size = size;
            this._onPick = onPick;
            IoMapUi.roundBox(graphics, -3, -3, size + 6, size + 6, 0x0C0605, 1, 0x3B2819, 4, 2);
            this._body = new Sprite();
            this._body.buttonMode = true;
            this._body.mouseChildren = false;
            addChild(this._body);
            var inner:Sprite = new Sprite();
            this._body.addChild(inner);
            this._terrain = new Bitmap();
            inner.addChild(this._terrain);
            this._yards = new Shape();
            inner.addChild(this._yards);
            this._view = new Shape();
            inner.addChild(this._view);
            var clip:Shape = new Shape();
            clip.graphics.beginFill(0xFF0000, 1);
            clip.graphics.drawRect(0, 0, size, size);
            clip.graphics.endFill();
            this._body.addChild(clip);
            inner.mask = clip;
            IoMapUi.hitArea(this._body.graphics, size, size);
            this._body.addEventListener(MouseEvent.MOUSE_DOWN, this.onDown);
            addEventListener(MouseEvent.MOUSE_WHEEL, function(e:MouseEvent):void {
                    e.stopPropagation();
                });
            addEventListener(Event.REMOVED_FROM_STAGE, this.onRemoved);
            this.Redraw();
        }

        public function get size():int {
            return this._size;
        }

        /** Draws the world again when a new snapshot has come. */
        public function Redraw():void {
            var scale:Number = NaN;
            var cell:Array = null;
            var g:Graphics = this._yards.graphics;
            if (!IoMapSnapshot.ready || this._drawnVersion == IoMapSnapshot.version && this._drawnPortals == IoUnderworld.portals.length) {
                return;
            }
            this._drawnVersion = IoMapSnapshot.version;
            this._drawnPortals = IoUnderworld.portals.length;
            this._terrain.bitmapData = IoMapLod.terrain();
            this._terrain.smoothing = true;
            // Small, the world map's dim colours run together: brighter here, so the lava shows.
            this._terrain.transform.colorTransform = new ColorTransform(1.7, 1.5, 1.4);
            scale = this._size / Math.max(IoMapSnapshot.width, IoMapSnapshot.height);
            this._terrain.scaleX = this._terrain.scaleY = scale;
            g.clear();
            g.lineStyle(1, 0x000000, 0.6);
            for each (cell in IoMapSnapshot.cells) {
                if (int(cell[2]) >= 2 && int(cell[3]) == LOGIN._playerID) {
                    g.beginFill(IoMapUi.relationColour(IoMapUi.YOU), 1);
                    g.drawCircle((int(cell[0]) + 0.5) * scale, (int(cell[1]) + 0.5) * scale, int(cell[2]) == 2 ? 2.5 : 1.6);
                    g.endFill();
                }
            }
            // (the portals on top: they are small here, and a yard can be next to one)
            if (GLOBAL.INFERNO_ONLY) {
                g.lineStyle(1, IoMapLod.PORTAL_RING, 0.9);
                for each (var portal:Array in IoUnderworld.portals) {
                    if (portal && !IoUnderworld.isUnder(int(portal[0]), int(portal[1]))) {
                        g.beginFill(IoMapLod.PORTAL_COLOUR, 1);
                        g.drawCircle((int(portal[0]) + 0.5) * scale, (int(portal[1]) + 0.5) * scale, 2.2);
                        g.endFill();
                    }
                }
            }
            this.drawView();
        }

        /** The part of the world the map shows: its middle and size, in cells. */
        public function setView(centreX:Number, centreY:Number, spanX:Number, spanY:Number):void {
            if (this._dragging) {
                return; // the box follows the mouse until it is let go
            }
            this._vx = centreX;
            this._vy = centreY;
            this._vw = spanX;
            this._vh = spanY;
            this.drawView();
        }

        private function drawView():void {
            var g:Graphics = this._view.graphics;
            var w:int = IoMapSnapshot.width;
            var h:int = IoMapSnapshot.height;
            var scale:Number = this._size / Math.max(w, h);
            var bw:Number = Math.max(4, Math.min(this._size, this._vw * scale));
            var bh:Number = Math.max(4, Math.min(this._size, this._vh * scale));
            var left:Number = (this._vx - this._vw * 0.5) * scale;
            var top:Number = (this._vy - this._vh * 0.5) * scale;
            var dx:int = 0;
            var dy:int = 0;
            var bx:Number = NaN;
            var by:Number = NaN;
            g.clear();
            g.lineStyle(1.5, 0xFFF0D0, 1);
            // The map wraps round the world's edges: so does the box, in a corner into all four corners.
            for (dx = -1; dx <= 1; dx++) {
                for (dy = -1; dy <= 1; dy++) {
                    bx = left + dx * w * scale;
                    by = top + dy * h * scale;
                    if (bx < this._size && bx + bw > 0 && by < this._size && by + bh > 0) {
                        g.drawRect(bx, by, bw, bh);
                    }
                }
            }
        }

        private function cellUnderMouse():Point {
            var scale:Number = this._size / Math.max(IoMapSnapshot.width, IoMapSnapshot.height);
            var x:int = Math.max(0, Math.min(IoMapSnapshot.width - 1, Math.floor(this._body.mouseX / scale)));
            var y:int = Math.max(0, Math.min(IoMapSnapshot.height - 1, Math.floor(this._body.mouseY / scale)));
            return new Point(x, y);
        }

        private function onDown(e:MouseEvent):void {
            e.stopPropagation();
            if (!IoMapSnapshot.ready || !stage) {
                return;
            }
            this._dragging = true;
            stage.addEventListener(MouseEvent.MOUSE_MOVE, this.onMove);
            stage.addEventListener(MouseEvent.MOUSE_UP, this.onUp);
            stage.addEventListener(Event.MOUSE_LEAVE, this.onUp);
            this.onMove(null);
        }

        private function onMove(e:MouseEvent):void {
            var at:Point = this.cellUnderMouse();
            this._vx = at.x + 0.5;
            this._vy = at.y + 0.5;
            this.drawView();
            if (this._onPick != null) {
                this._onPick(at.x, at.y, false);
            }
        }

        private function onUp(e:Event):void {
            var at:Point = this.cellUnderMouse();
            this.stopDragging();
            if (this._onPick != null) {
                this._onPick(at.x, at.y, true);
            }
        }

        private function stopDragging():void {
            this._dragging = false;
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.onMove);
                stage.removeEventListener(MouseEvent.MOUSE_UP, this.onUp);
                stage.removeEventListener(Event.MOUSE_LEAVE, this.onUp);
            }
        }

        private function onRemoved(e:Event):void {
            this.stopDragging();
        }

        public function Cleanup():void {
            this.stopDragging();
            this._onPick = null;
            if (parent) {
                parent.removeChild(this);
            }
        }
    }
}
