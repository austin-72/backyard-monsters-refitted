package com.monsters.display {
    import flash.display.BitmapData;
    import flash.display.Bitmap;
    import flash.display.BlendMode;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.geom.ColorTransform;
    import flash.geom.Point;
    import flash.geom.Rectangle;

    /**
     * Inferno-only: a building drawn live from its yard art (its imageData: shadow, top and anim strips), for the
     * build menu (BUILDINGBUTTON) and the building window (BUILDINGOPTIONSPOPUP). Used where the Inferno has art
     * of its own and the button picture is the overworld's, and for every building that moves (the user's, 29
     * September):
     *  - a tower that turns (its anim strip is its turret's facings) turns to follow the mouse;
     *  - a building that animates plays its strips in a loop, as in the yard; the Quake Tower drops its hammer
     *    once, then waits 4 seconds;
     *  - one scale for everything, so buildings keep their sizes relative to each other (the Cinder Coil and
     *    Obsidian Mortar no longer fill the button), made smaller only where one would not fit.
     * `silhouette` draws it as the grey shape the menu shows for a building not yet unlocked.
     */
    public class IoMenuArt extends Sprite {

        /** The towers whose anim strip is their facings (BTOWER.Rotate: grid angle to frame). */
        public static const TURNING:Object = {20: 1, 21: 1, 23: 1, 25: 1, 115: 1, 118: 1, 130: 1, 132: 1, 144: 1, 145: 1};

        public static const QUAKE:int = 129;

        /** Buildings that have Inferno yard art but only the overworld's button and window pictures. */
        public static const OVERWORLD_PICTURES:Object = {5: 1, 9: 1, 10: 1, 11: 1, 12: 1, 16: 1, 51: 1};

        /** The menu's scale for every building (the yard draws them at 1). */
        public static const SCALE:Number = 0.72;

        /** Quake Tower: the pause after each drop (stage frames, 40 a second). */
        private static const QUAKE_WAIT:int = 160;

        private static const LAYERS:Array = ["shadow", "top", "anim", "anim2", "anim3"];

        private var _id:int;

        private var _art:Object;

        private var _base:String;

        private var _box:Rectangle;

        private var _silhouette:Boolean;

        private var _pending:int = 0;

        private var _images:Object = {};

        private var _holder:Sprite;

        /** name -> {bmd (the strip), frame (BitmapData drawn into), rect, frames, tick} */
        private var _strips:Object = {};

        private var _frame:int = 0;

        private var _wait:int = 0;

        /** Whether this building is drawn live in the Inferno menu (else the button picture is used). */
        public static function wanted(props:Object):Boolean {
            if (!GLOBAL.INFERNO_ONLY || !props || !props.imageData) {
                return false;
            }
            var art:Object = tierOf(props, 1);
            var base:String = String(props.imageData.baseurl || "");
            if (!art || base.indexOf("buildings/i") != 0 || !(art.top || art.anim)) {
                return false;
            }
            var moves:Boolean = Boolean(art.anim || art.anim2 || art.anim3);
            return moves || OVERWORLD_PICTURES[int(props.id)] || !props.buildingbuttons || props.buildingbuttons.length == 0;
        }

        /** The imageData tier a building of this level is drawn with (the highest key at or under it). */
        public static function tierOf(props:Object, level:int):Object {
            var best:int = 0;
            var key:String = null;
            for (key in props.imageData) {
                var n:Number = Number(key);
                if (!isNaN(n) && n <= Math.max(1, level) && n > best) {
                    best = int(n);
                }
            }
            return best ? props.imageData[best] : null;
        }

        /**
         * @param props  the building's props
         * @param level  the level to draw (its art tier)
         * @param box    where it goes (the building is centred in it, and made smaller if it would not fit)
         */
        public function IoMenuArt(props:Object, level:int, box:Rectangle, silhouette:Boolean = false) {
            super();
            mouseEnabled = false;
            mouseChildren = false;
            this._id = int(props.id);
            this._art = tierOf(props, level);
            this._base = String(props.imageData.baseurl);
            this._box = box;
            this._silhouette = silhouette;
            this._holder = addChild(new Sprite()) as Sprite;
            var mask:Shape = addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRect(box.x, box.y, box.width, box.height);
            mask.graphics.endFill();
            this._holder.mask = mask;
            var name:String = null;
            for each (name in LAYERS) {
                if (this._art && this._art[name]) {
                    ++this._pending;
                }
            }
            for each (name in LAYERS) {
                if (this._art && this._art[name]) {
                    ImageCache.GetImageWithCallBack(this._base + this._art[name][0], this.loaded(name));
                }
            }
            addEventListener(Event.REMOVED_FROM_STAGE, this.gone);
        }

        public function get turns():Boolean {
            return Boolean(TURNING[this._id]);
        }

        public function get animates():Boolean {
            for (var n:String in this._strips) {
                if (this._strips[n].frames > 1) {
                    return true;
                }
            }
            return false;
        }

        /** The anim strip's frame on screen now (for the tests). */
        public function get frame():int {
            return this._strips.anim ? int(this._strips.anim.tick) : -1;
        }

        public function get ready():Boolean {
            return this._pending == 0 && this._holder.numChildren > 0;
        }

        private function loaded(name:String):Function {
            return function(key:String, bmd:BitmapData, ... rest):void {
                if (_images[name]) {
                    return;
                }
                _images[name] = bmd;
                if (--_pending == 0) {
                    build();
                }
            };
        }

        private function build():void {
            var bounds:Rectangle = null;
            var name:String = null;
            var spec:Array = null;
            var r:Rectangle = null;
            for each (name in LAYERS) {
                spec = this._art[name];
                if (!spec || !this._images[name]) {
                    continue;
                }
                if (name == "shadow") {
                    continue; // (the shadow may spread wide: it does not size the building)
                }
                if (spec[1] is Rectangle) {
                    r = Rectangle(spec[1]).clone();
                }
                else {
                    r = new Rectangle(spec[1].x, spec[1].y, BitmapData(this._images[name]).width, BitmapData(this._images[name]).height);
                }
                bounds = bounds ? bounds.union(r) : r;
            }
            if (!bounds) {
                return;
            }
            var scale:Number = Math.min(SCALE, (this._box.width - 8) / bounds.width, (this._box.height - 6) / bounds.height);
            this._holder.scaleX = this._holder.scaleY = scale;
            this._holder.x = this._box.x + this._box.width / 2 - (bounds.x + bounds.width / 2) * scale;
            this._holder.y = this._box.y + this._box.height / 2 - (bounds.y + bounds.height / 2) * scale;
            for each (name in LAYERS) {
                spec = this._art[name];
                var bmd:BitmapData = this._images[name];
                if (!spec || !bmd) {
                    continue;
                }
                var shown:Bitmap = null;
                if (spec[1] is Rectangle) {
                    r = Rectangle(spec[1]);
                    var frames:int = Math.max(1, int(spec[2]));
                    var cell:BitmapData = new BitmapData(Math.max(1, int(r.width)), Math.max(1, int(r.height)), true, 0);
                    this._strips[name] = {"bmd": bmd, "frame": cell, "rect": new Rectangle(0, 0, int(r.width), int(r.height)), "frames": frames, "tick": 0};
                    this.draw(name);
                    shown = new Bitmap(cell);
                    shown.x = r.x;
                    shown.y = r.y;
                }
                else {
                    shown = new Bitmap(bmd);
                    shown.x = spec[1].x;
                    shown.y = spec[1].y;
                }
                shown.smoothing = true;
                if (name == "shadow") {
                    shown.blendMode = BlendMode.MULTIPLY;
                }
                else if (this._silhouette) {
                    shown.transform.colorTransform = new ColorTransform(0, 0, 0, 1, 0x77, 0x77, 0x77, 0);
                }
                this._holder.addChild(shown);
            }
            if (this.turns || this.animates) {
                addEventListener(Event.ENTER_FRAME, this.tick);
            }
            if (this.turns) {
                this.face();
            }
        }

        private function draw(name:String):void {
            var s:Object = this._strips[name];
            s.rect.x = s.rect.width * s.tick;
            BitmapData(s.frame).fillRect(BitmapData(s.frame).rect, 0);
            BitmapData(s.frame).copyPixels(s.bmd, s.rect, new Point(0, 0));
        }

        /** Turns the turret to face the mouse: the angle in yard (grid) terms, as BTOWER.Rotate works it out. */
        private function face():void {
            var s:Object = this._strips.anim;
            if (!s || !stage) {
                return;
            }
            var at:Point = this._holder.localToGlobal(new Point(0, 0));
            var dx:Number = stage.mouseX - at.x;
            var dy:Number = stage.mouseY - at.y;
            var gx:Number = dx * 0.5 + dy;
            var gy:Number = dy - dx * 0.5;
            var deg:Number = Math.atan2(gy, gx) * 180 / Math.PI;
            if (deg < 0) {
                deg += 360;
            }
            var f:int = int(deg * s.frames / 360) % s.frames;
            if (f != s.tick) {
                s.tick = f;
                this.draw("anim");
            }
        }

        private function tick(e:Event = null):void {
            ++this._frame;
            if (this.turns) {
                this.face();
                return; // (a turning tower's other strips stay on their first frame, as in the yard at rest)
            }
            var name:String = null;
            var s:Object = null;
            if (this._id == QUAKE) {
                s = this._strips.anim;
                if (!s) {
                    return;
                }
                if (this._wait > 0) {
                    --this._wait;
                    return;
                }
                // the drop: a frame every 2 stage frames, the last four (the hammer landing) every frame
                if (s.tick >= s.frames - 4 || this._frame % 2 == 0) {
                    if (++s.tick >= s.frames) {
                        s.tick = 0;
                        this._wait = QUAKE_WAIT;
                    }
                    this.draw("anim");
                }
                return;
            }
            if (this._frame % 3 != 0) {
                return; // (as in the yard: a frame every 3 stage frames)
            }
            for (name in this._strips) {
                s = this._strips[name];
                if (s.frames > 1) {
                    s.tick = (s.tick + 1) % s.frames;
                    this.draw(name);
                }
            }
        }

        private function gone(e:Event = null):void {
            removeEventListener(Event.ENTER_FRAME, this.tick);
            removeEventListener(Event.REMOVED_FROM_STAGE, this.gone);
        }
    }
}
