package com.monsters.pets {
    import com.monsters.configs.BYMConfig;
    import com.monsters.display.CreepSkinManager;
    import com.monsters.monsters.creeps.inferno.hfo.IoIceCreep;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Sprite;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.filters.GlowFilter;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;

    /**
     * Inferno-only: one pet (IoPets), a copy of a monster at 60% of its size wandering the yard: it walks to a spot nearby
     * that nothing stands on (in a straight line clear of buildings), stops a while, and goes on. Just for looks:
     * nothing targets it, it targets nothing, and it isn't saved where it is.
     *
     * It is drawn from the monster's own sprite sheet (SPRITES, as a creep draws itself) at full size on a canvas
     * of the monster's frame, then shrunk to 60% on the one shown. Like a worker, it is a sprite on the map's
     * building layer with a RasterData for the renderer.
     */
    public class IoPet extends Sprite {

        public static const SCALE:Number = 0.6;

        /** Yard units a step while walking. */
        private static const SPEED:Number = 0.55;

        /** How far it looks for its next spot. */
        private static const ROAM:int = 220;

        public var petId:int;

        public var monster:String;

        /** Where it is in the yard (the yard's own units; x and y are the map's). */
        public var gx:Number;

        public var gy:Number;

        private var _tx:Number;

        private var _ty:Number;

        private var _walking:Boolean = false;

        private var _rest:int = 0;

        private var _rotation:Number = 90;

        private var _frame:int = 0;

        private var _fly:Boolean = false;

        private var _ice:Array = null;

        private var _full:BitmapData;

        private var _small:BitmapData;

        private var _feetX:Number;

        private var _feetY:Number;

        private var _bitmap:Bitmap;

        private var _rasterData:RasterData;

        private var _rasterPt:Point;

        private var _lastKey:int = -2;

        private var _scaler:Matrix;

        /** Its name over it (none: no label). */
        private var _name:String = "";

        private var _nameBmd:BitmapData = null;

        private var _nameRaster:RasterData = null;

        private var _namePt:Point = null;

        private var _nameField:TextField = null;

        public function IoPet(id:int, monster:String, at:Point, name:String = "") {
            super();
            this.petId = id;
            this.monster = monster;
            this.name = "ioPet" + id;
            this.mouseEnabled = false;
            this.mouseChildren = false;
            this.gx = at.x;
            this.gy = at.y;
            this._tx = at.x;
            this._ty = at.y;
            this._rest = 20 + int(Math.random() * 120);
            this._rotation = Math.random() * 360;
            this._frame = int(Math.random() * 64);
            var movement:String = CREATURES.GetProperty(monster, "movement", 0, true) as String;
            this._fly = movement == "fly" || movement == "fly_low";
            this._ice = IoIceCreep.SHEETS[monster] as Array;
            var w:int = 52;
            var h:int = 50;
            this._feetX = 26;
            this._feetY = 36;
            if (this._ice) {
                w = this._ice[0];
                h = this._ice[1];
                this._feetX = this._ice[2];
                this._feetY = this._ice[3];
                SPRITES.SetupSprite(monster);
            }
            else {
                if (monster == "IC20") {
                    // (the Emberghoul's sheet is wider than a creep's usual canvas: Emberghoul.useOwnCanvas)
                    w = 66;
                    h = 45;
                    this._feetX = 33;
                    this._feetY = 38;
                }
                CreepSkinManager.instance.SetupSkins(monster);
            }
            this._full = new BitmapData(w, h, true, 0);
            this._small = new BitmapData(Math.ceil(w * SCALE), Math.ceil(h * SCALE), true, 0);
            this._scaler = new Matrix(SCALE, 0, 0, SCALE, 0, 0);
            this._bitmap = new Bitmap(this._small);
            this._bitmap.x = -this._feetX * SCALE;
            this._bitmap.y = -this._feetY * SCALE - (this._fly ? 14 : 0);
            this._rasterPt = new Point();
            if (BYMConfig.instance.RENDERER_ON) {
                this._rasterData = new RasterData(this._small, this._rasterPt, int.MAX_VALUE);
            }
            else {
                addChild(this._bitmap);
            }
            this.setName(name);
            this.place();
            this.draw(true);
        }

        /** Its name, shown small over it (an empty one: none). */
        public function setName(name:String):void {
            name = name ? name : "";
            if (name == this._name && (this._nameBmd || !name)) {
                return;
            }
            this._name = name;
            this.clearName();
            if (!name) {
                return;
            }
            var tf:TextField = new TextField();
            var format:TextFormat = new TextFormat("Verdana", 10, 0xFFFFFF, true);
            tf.defaultTextFormat = format;
            tf.autoSize = TextFieldAutoSize.LEFT;
            tf.text = name;
            var w:int = Math.ceil(tf.textWidth) + 8;
            var h:int = Math.ceil(tf.textHeight) + 6;
            if (BYMConfig.instance.RENDERER_ON) {
                // a dark outline (the text drawn round it in black), then the name in white
                this._nameBmd = new BitmapData(w, h, true, 0);
                var black:TextField = new TextField();
                black.defaultTextFormat = new TextFormat("Verdana", 10, 0x1A0A04, true);
                black.autoSize = TextFieldAutoSize.LEFT;
                black.text = name;
                for (var ox:int = -1; ox <= 1; ox++) {
                    for (var oy:int = -1; oy <= 1; oy++) {
                        if (ox || oy) {
                            this._nameBmd.draw(black, new Matrix(1, 0, 0, 1, 2 + ox, 1 + oy));
                        }
                    }
                }
                this._nameBmd.draw(tf, new Matrix(1, 0, 0, 1, 2, 1));
                this._namePt = new Point();
                this._nameRaster = new RasterData(this._nameBmd, this._namePt, int.MAX_VALUE);
            }
            else {
                tf.filters = [new GlowFilter(0x1A0A04, 1, 3, 3, 6, 1)];
                tf.selectable = false;
                tf.mouseEnabled = false;
                this._nameField = tf;
                addChild(tf);
            }
            this.place();
        }

        private function clearName():void {
            if (this._nameRaster) {
                this._nameRaster.clear();
                this._nameRaster = null;
            }
            if (this._nameBmd) {
                this._nameBmd.dispose();
                this._nameBmd = null;
            }
            if (this._nameField && this._nameField.parent) {
                this._nameField.parent.removeChild(this._nameField);
            }
            this._nameField = null;
        }

        public function get petName():String {
            return this._name;
        }

        /** One game step: walk on, or rest, or pick the next spot. */
        public function tick():void {
            if (this._walking) {
                var dx:Number = this._tx - this.gx;
                var dy:Number = this._ty - this.gy;
                var d:Number = Math.sqrt(dx * dx + dy * dy);
                if (d <= SPEED) {
                    this.gx = this._tx;
                    this.gy = this._ty;
                    this._walking = false;
                    this._rest = 60 + int(Math.random() * 240);
                }
                else {
                    this.gx += dx / d * SPEED;
                    this.gy += dy / d * SPEED;
                    // its facing on screen, as a creep's (0 facing right, turning clockwise)
                    var from:Point = GRID.ToISO(this.gx - dx / d * 10, this.gy - dy / d * 10, 0);
                    var to:Point = GRID.ToISO(this.gx, this.gy, 0);
                    var r:Number = Math.atan2(to.y - from.y, to.x - from.x) * 57.2957795;
                    this._rotation = r < 0 ? r + 360 : r;
                }
                ++this._frame;
            }
            else if (--this._rest <= 0 || this._frame % 40 == 0 && !IoPets.free(this.gx, this.gy)) {
                // (and at once when something now stands where it rests: a wart that grew there, a building placed)
                this.pickSpot();
            }
            if (!this._walking) {
                ++this._frame;
            }
            this.place();
            this.draw(false);
        }

        /** The next spot: somewhere near, in the yard, reached in a straight line nothing stands in. */
        private function pickSpot():void {
            for (var tries:int = 0; tries < 12; tries++) {
                var a:Number = Math.random() * Math.PI * 2;
                var dist:Number = 40 + Math.random() * ROAM;
                var x:Number = this.gx + Math.cos(a) * dist;
                var y:Number = this.gy + Math.sin(a) * dist;
                if (IoPets.clearLine(this.gx, this.gy, x, y)) {
                    this._tx = x;
                    this._ty = y;
                    this._walking = true;
                    return;
                }
            }
            this._rest = 40 + int(Math.random() * 80); // (hemmed in: it waits, and tries again)
        }

        private function place():void {
            var p:Point = GRID.ToISO(this.gx, this.gy, 0);
            this.x = p.x;
            this.y = p.y;
            if (this._rasterData) {
                var offset:Point = MAP.instance.offset;
                this._rasterPt.x = this.x + this._bitmap.x - offset.x;
                this._rasterPt.y = this.y + this._bitmap.y - offset.y;
                this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y - offset.y) * 1000 + this.x - offset.x);
                if (this._nameRaster) {
                    // over its head, centred
                    this._namePt.x = int(this.x - this._nameBmd.width / 2 - offset.x);
                    this._namePt.y = int(this.y + this._bitmap.y - this._nameBmd.height - 1 - offset.y);
                    this._nameRaster.depth = this._rasterData.depth + 1;
                }
            }
            else if (this._nameField) {
                this._nameField.x = -this._nameField.width / 2;
                this._nameField.y = this._bitmap.y - this._nameField.height;
            }
        }

        /** Its frame now: the walk while it walks, standing while it rests (redrawn only when it changes). */
        private function draw(force:Boolean):void {
            if (!GLOBAL._render) {
                return;
            }
            var column:int = int(this._rotation / 12) % 30;
            var step:int = this._walking || this._fly ? int(this._frame / 8) : 0;
            var key:int = column * 1000 + step % 1000;
            if (!force && key == this._lastKey) {
                return;
            }
            var sheet:Object = SPRITES.GetSpriteDescriptor(this.monster);
            if (!sheet || !sheet.image) {
                return; // (its sheet is still loading: drawn once it is there)
            }
            this._full.fillRect(this._full.rect, 0);
            if (this._ice) {
                var walkRows:int = this._ice[4];
                SPRITES.GetFrameById(this._full, this.monster, column, this._walking || this._fly ? step % walkRows + 1 : 0);
            }
            else {
                var action:String = !this._walking && !this._fly && CREEPS_STILL[this.monster] ? "idle" : "walking";
                // (the frame number drives the walk; -1: always drawn, not only when the facing changes)
                if (CreepSkinManager.instance.GetSprite(this._full, this.monster, action, int(this._rotation), this._walking || this._fly ? this._frame : 0, -1) < 0) {
                    return;
                }
            }
            this._lastKey = key;
            this._small.fillRect(this._small.rect, 0);
            this._small.draw(this._full, this._scaler, null, null, null, true);
        }

        /** The new Inferno monsters with a standing frame of their own ("idle": SPRITES' row 0). */
        private static const CREEPS_STILL:Object = {"IC12": true, "IC14": true, "IC15": true, "IC20": true};

        public function clear():void {
            this.clearName();
            if (this._rasterData) {
                this._rasterData.clear();
                this._rasterData = null;
            }
            if (this.parent) {
                this.parent.removeChild(this);
            }
            if (this._full) {
                this._full.dispose();
            }
            if (this._small) {
                this._small.dispose();
            }
            this._full = null;
            this._small = null;
        }
    }
}
