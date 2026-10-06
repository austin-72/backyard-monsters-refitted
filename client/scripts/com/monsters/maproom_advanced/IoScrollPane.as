package com.monsters.maproom_advanced {
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;

    /**
     * Inferno-only: a scrolling area for the map room's lists (bookmarks, alliance, filters, search results).
     * Put rows into `content`, then call refresh(height of the rows). Scrolls with the wheel, the bar on the
     * right (drag the handle, or click above / below it) or by dragging the list itself (for fingers).
     */
    public class IoScrollPane extends Sprite {

        public static const BAR_W:int = 9;

        public var content:Sprite;

        private var _mask:Shape;

        private var _track:Sprite;

        private var _thumb:Sprite;

        private var _w:int;

        private var _h:int;

        private var _contentH:Number = 0;

        private var _offset:Number = 0;

        private var _dragFrom:Number = 0;

        private var _pressY:Number = 0;

        private var _pressOffset:Number = 0;

        private var _pressing:Boolean = false;

        /** Called after every scroll with the pane (the Alliances window's Outposts tab loads more near the end). */
        public var onScroll:Function = null;

        /** True while the last press has moved the list: the click that ends it is not a click on a row. */
        public var dragged:Boolean = false;

        public function IoScrollPane(w:int, h:int) {
            super();
            this.content = new Sprite();
            addChild(this.content);
            this._mask = new Shape();
            addChild(this._mask);
            this.content.mask = this._mask;
            this._track = new Sprite();
            this._track.buttonMode = true;
            addChild(this._track);
            this._thumb = new Sprite();
            this._thumb.buttonMode = true;
            addChild(this._thumb);
            this.setSize(w, h);
            addEventListener(MouseEvent.MOUSE_WHEEL, this.onWheel);
            this._track.addEventListener(MouseEvent.MOUSE_DOWN, this.onTrack);
            this._thumb.addEventListener(MouseEvent.MOUSE_DOWN, this.onThumbDown);
            this.content.addEventListener(MouseEvent.MOUSE_DOWN, this.onPress);
            // Rows' clicks that end a drag of the list are swallowed here, before they reach the rows.
            this.content.addEventListener(MouseEvent.CLICK, this.onContentClick, true);
            addEventListener(Event.REMOVED_FROM_STAGE, this.onRemoved);
        }

        /** The width the rows can use (the bar takes the rest). */
        public function get innerWidth():int {
            return this._w - BAR_W - 2;
        }

        public function get viewHeight():int {
            return this._h;
        }

        public function setSize(w:int, h:int):void {
            this._w = w;
            this._h = h;
            this._mask.graphics.clear();
            this._mask.graphics.beginFill(0xFF0000, 1);
            this._mask.graphics.drawRect(0, 0, w, h);
            this._mask.graphics.endFill();
            graphics.clear();
            IoMapUi.hitArea(graphics, w, h);
            this.refresh(this._contentH);
        }

        /** The rows have changed: they are this tall now. Keeps the scroll position where it can. */
        public function refresh(contentH:Number):void {
            this._contentH = contentH;
            this.scrollTo(this._offset);
        }

        public function scrollTo(offset:Number):void {
            var max:Number = Math.max(0, this._contentH - this._h);
            this._offset = Math.max(0, Math.min(max, offset));
            this.content.y = -Math.round(this._offset);
            this.drawBar();
            if (this.onScroll != null) {
                this.onScroll(this);
            }
        }

        /** How far there is still to scroll before the end of the rows. */
        public function get remaining():Number {
            return Math.max(0, this._contentH - this._h - this._offset);
        }

        /** Scrolls just enough to show the rows from y to y + h. */
        public function reveal(y:Number, h:Number):void {
            if (y < this._offset) {
                this.scrollTo(y);
            }
            else if (y + h > this._offset + this._h) {
                this.scrollTo(y + h - this._h);
            }
        }

        public function get offset():Number {
            return this._offset;
        }

        private function drawBar():void {
            var x:int = this._w - BAR_W;
            var thumbH:Number = 0;
            var room:Number = 0;
            this._track.graphics.clear();
            this._thumb.graphics.clear();
            if (this._contentH <= this._h + 0.5) {
                this._track.visible = this._thumb.visible = false;
                return;
            }
            this._track.visible = this._thumb.visible = true;
            IoMapUi.roundBox(this._track.graphics, x, 0, BAR_W, this._h, 0xD3BD92, 1, -1, 4);
            thumbH = Math.max(24, this._h * this._h / this._contentH);
            room = this._h - thumbH;
            IoMapUi.roundBox(this._thumb.graphics, x + 1, 0, BAR_W - 2, thumbH, IoMapUi.EDGE, 1, -1, 3);
            this._thumb.y = Math.round(room * this._offset / (this._contentH - this._h));
        }

        private function onWheel(e:MouseEvent):void {
            e.stopPropagation();
            if (this._contentH > this._h) {
                this.scrollTo(this._offset + (e.delta > 0 ? -1 : 1) * 60);
            }
        }

        private function onTrack(e:MouseEvent):void {
            e.stopPropagation();
            this.scrollTo(this._offset + (mouseY < this._thumb.y ? -1 : 1) * (this._h - 24));
        }

        private function onThumbDown(e:MouseEvent):void {
            e.stopPropagation();
            this._dragFrom = mouseY - this._thumb.y;
            stage.addEventListener(MouseEvent.MOUSE_MOVE, this.onThumbMove);
            stage.addEventListener(MouseEvent.MOUSE_UP, this.onThumbUp);
        }

        private function onThumbMove(e:MouseEvent):void {
            var thumbH:Number = this._thumb.height;
            var room:Number = this._h - thumbH;
            var y:Number = Math.max(0, Math.min(room, mouseY - this._dragFrom));
            if (room > 0) {
                this.scrollTo(y / room * (this._contentH - this._h));
            }
        }

        private function onThumbUp(e:Event = null):void {
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.onThumbMove);
                stage.removeEventListener(MouseEvent.MOUSE_UP, this.onThumbUp);
            }
        }

        private function onPress(e:MouseEvent):void {
            this.dragged = false;
            if (this._contentH <= this._h || !stage) {
                return;
            }
            this._pressing = true;
            this._pressY = mouseY;
            this._pressOffset = this._offset;
            stage.addEventListener(MouseEvent.MOUSE_MOVE, this.onPressMove);
            stage.addEventListener(MouseEvent.MOUSE_UP, this.onPressUp);
        }

        private function onPressMove(e:MouseEvent):void {
            if (!this._pressing) {
                return;
            }
            if (Math.abs(mouseY - this._pressY) > 6) {
                this.dragged = true;
            }
            if (this.dragged) {
                this.scrollTo(this._pressOffset - (mouseY - this._pressY));
            }
        }

        private function onPressUp(e:Event = null):void {
            this._pressing = false;
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.onPressMove);
                stage.removeEventListener(MouseEvent.MOUSE_UP, this.onPressUp);
            }
        }

        private function onContentClick(e:MouseEvent):void {
            if (this.dragged) {
                this.dragged = false;
                e.stopImmediatePropagation();
            }
        }

        private function onRemoved(e:Event):void {
            this.onThumbUp();
            this.onPressUp();
        }
    }
}
