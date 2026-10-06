package com.monsters.maproom_advanced {
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.geom.Rectangle;

    /**
     * Inferno-only: the map room's zoom buttons, on the window's top edge left of the full screen button: the
     * yard's own zoom buttons (buttonZoom_CLIP: frame 1 is -, frame 2 is +), side by side. The steps are
     * 0 = the whole world ... 4 = close (MapRoomPopup); a button is dimmed at its end of them. The buttons are
     * only pictures here: the yard clip zooms the yard when clicked, so it sits inside a holder that takes
     * the clicks instead.
     */
    public class IoMapZoomControl extends Sprite {

        public static const NAMES:Array = ["World", "World 2×", "World 4×", "Far", "Close"];

        private static const BUTTON:int = 26;

        private static const GAP:int = 4;

        private var _minus:Sprite;

        private var _plus:Sprite;

        private var _level:int = 4;

        private var _minLevel:int = 0;

        private var _onStep:Function;

        public function IoMapZoomControl(onStep:Function, minLevel:int) {
            super();
            this._onStep = onStep;
            this._minLevel = minLevel;
            this._minus = this.makeButton(1);
            addChild(this._minus);
            this._plus = this.makeButton(2);
            this._plus.x = BUTTON + GAP;
            addChild(this._plus);
            // A press on the buttons is not a drag of the map, nor a click on the window frame below.
            addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation();
                });
            this.setLevel(4);
        }

        private function makeButton(frame:int):Sprite {
            var holder:Sprite = new Sprite();
            var art:MovieClip = new buttonZoom_CLIP();
            var hit:Shape = new Shape();
            art.gotoAndStop(frame);
            // The art is drawn around its own origin; fit it into the button's box.
            var box:Number = Math.max(art.width, art.height);
            if (box > 0) {
                art.scaleX = art.scaleY = BUTTON / box;
            }
            holder.addChild(art);
            var bounds:Rectangle = art.getBounds(holder);
            art.x -= bounds.x;
            art.y -= bounds.y;
            IoMapUi.hitArea(hit.graphics, BUTTON, BUTTON);
            holder.addChild(hit);
            holder.mouseChildren = false;
            holder.buttonMode = true;
            holder.addEventListener(MouseEvent.CLICK, frame == 1 ? this.onMinus : this.onPlus);
            holder.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    if (holder.mouseEnabled) {
                        art.alpha = 0.8;
                    }
                });
            holder.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    art.alpha = 1;
                });
            return holder;
        }

        public function get level():int {
            return this._level;
        }

        /** The zoom step showing (0 = the whole world ... 4 = close): - and + are dimmed at the ends. */
        public function setLevel(level:int):void {
            this._level = level;
            this.enable(this._minus, level > this._minLevel);
            this.enable(this._plus, level < NAMES.length - 1);
        }

        private function enable(button:Sprite, on:Boolean):void {
            button.mouseEnabled = on;
            button.buttonMode = on;
            button.alpha = on ? 1 : 0.4;
        }

        private function onMinus(e:MouseEvent):void {
            e.stopPropagation();
            if (this._level > this._minLevel && this._onStep != null) {
                SOUNDS.Play("click1");
                this._onStep(-1);
            }
        }

        private function onPlus(e:MouseEvent):void {
            e.stopPropagation();
            if (this._level < NAMES.length - 1 && this._onStep != null) {
                SOUNDS.Play("click1");
                this._onStep(1);
            }
        }

        public function Cleanup():void {
            this._onStep = null;
            if (parent) {
                parent.removeChild(this);
            }
        }
    }
}
