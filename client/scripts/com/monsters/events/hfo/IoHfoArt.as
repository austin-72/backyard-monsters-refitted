package com.monsters.events.hfo {
    import com.monsters.configs.BYMConfig;
    import com.monsters.display.ImageCache;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.BlendMode;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.geom.Rectangle;

    /**
     * Hell Freezes Over: the event's pictures (server/public/assets/hfo/, the user's hfo_props.zip) and a small
     * player for its one-shot animations (a patch shattering, a tower's ice breaking, the tomb bursting).
     *
     * Pictures load once (ImageCache) and are copied into a BitmapData of their own, made at once at the
     * picture's size: whatever shows it can be built before the picture arrives and fills in when it does.
     * Offsets are the pack's (offsets.json): from a building's anchor, the top corner of its footprint diamond.
     */
    public class IoHfoArt {

        public static const ROOT:String = "hfo/";

        /** [file, x, y, w, h] for each still picture (offsets.json "top" and "shadow"). */
        public static const PICS:Object = {
                "small1": ["icepatch/small1.png", -25, -3, 50, 31], "small1_shadow": ["icepatch/small1_shadow.jpg", -31, -5, 66, 40],
                "small2": ["icepatch/small2.png", -25, -12, 50, 40], "small2_shadow": ["icepatch/small2_shadow.jpg", -31, -5, 61, 40],
                "small3": ["icepatch/small3.png", -25, -8, 50, 36], "small3_shadow": ["icepatch/small3_shadow.jpg", -31, -5, 66, 40],
                "small4": ["icepatch/small4.png", -25, -8, 50, 36], "small4_shadow": ["icepatch/small4_shadow.jpg", -31, -5, 63, 40],
                "small5": ["icepatch/small5.png", -25, -6, 50, 34], "small5_shadow": ["icepatch/small5_shadow.jpg", -31, -5, 66, 40],
                "big1": ["icepatch/big1.png", -39, -9, 79, 60], "big1_shadow": ["icepatch/big1_shadow.jpg", -45, 3, 111, 54],
                "big2": ["icepatch/big2.png", -39, -9, 79, 60], "big2_shadow": ["icepatch/big2_shadow.jpg", -45, 3, 100, 54],
                "big3": ["icepatch/big3.png", -39, -9, 79, 60], "big3_shadow": ["icepatch/big3_shadow.jpg", -45, 3, 101, 54],
                "ice_short": ["towerice/ice_short.png", -50, -59, 100, 117], "ice_short_shadow": ["towerice/ice_short_shadow.jpg", -53, -10, 183, 73],
                "ice_tall": ["towerice/ice_tall.png", -51, -91, 102, 148], "ice_tall_shadow": ["towerice/ice_tall_shadow.jpg", -53, -17, 203, 79],
                "ice_large": ["towerice/ice_large.png", -81, -25, 163, 127], "ice_large_shadow": ["towerice/ice_large_shadow.jpg", -84, 10, 218, 97],
                "block0": ["champblock/block_stage0.png", -65, -82, 129, 164], "block1": ["champblock/block_stage1.png", -65, -82, 129, 164],
                "block2": ["champblock/block_stage2.png", -65, -82, 129, 165], "block3": ["champblock/block_stage3.png", -65, -82, 129, 165],
                "block_shadow": ["champblock/block_shadow.jpg", -66, -1, 232, 89]
            };

        /** [file, x, y, frame w, frame h, frames] for each strip (offsets.json animations). */
        public static const STRIPS:Object = {
                "small1_shatter": ["icepatch/small1_shatter.png", -31, -10, 63, 46, 7], "small2_shatter": ["icepatch/small2_shatter.png", -32, -15, 74, 51, 7],
                "small3_shatter": ["icepatch/small3_shatter.png", -27, -8, 61, 44, 7], "small4_shatter": ["icepatch/small4_shatter.png", -40, -11, 69, 49, 7],
                "small5_shatter": ["icepatch/small5_shatter.png", -35, -7, 68, 41, 7],
                "big1_crack": ["icepatch/big1_crack.png", -39, -9, 79, 60, 5], "big2_crack": ["icepatch/big2_crack.png", -39, -9, 79, 60, 5], "big3_crack": ["icepatch/big3_crack.png", -39, -9, 79, 60, 5],
                "big1_melt": ["icepatch/big1_melt.png", -50, -9, 104, 66, 6], "big2_melt": ["icepatch/big2_melt.png", -50, -9, 104, 66, 6], "big3_melt": ["icepatch/big3_melt.png", -50, -9, 104, 66, 6],
                "ice_short_shatter": ["towerice/ice_short_shatter.png", -81, -66, 162, 147, 8], "ice_tall_shatter": ["towerice/ice_tall_shatter.png", -84, -103, 166, 190, 8],
                "ice_large_shatter": ["towerice/ice_large_shatter.png", -119, -35, 252, 174, 8],
                "block_reveal": ["champblock/block_reveal.png", -163, -137, 294, 271, 8]
            };

        private static var _bmd:Object = {};

        private static var _loading:Object = {};

        private static var _waiting:Object = {};

        /** The picture's BitmapData (filled in when it has loaded). */
        public static function pic(name:String):BitmapData {
            var p:Array = PICS[name] as Array;
            return p ? image(p[0], p[3], p[4]) : null;
        }

        public static function picAt(name:String):Point {
            var p:Array = PICS[name] as Array;
            return p ? new Point(p[1], p[2]) : new Point();
        }

        /** A file's (under hfo/, or "@path" from the assets folder) BitmapData of size w x h, filled in when it has loaded; `then` is told when it has. */
        public static function image(file:String, w:int, h:int, then:Function = null):BitmapData {
            var bmd:BitmapData = _bmd[file] as BitmapData;
            if (!bmd) {
                bmd = new BitmapData(Math.max(1, w), Math.max(1, h), true, 0);
                _bmd[file] = bmd;
            }
            if (!_loading[file]) {
                _loading[file] = true;
                _waiting[file] = [];
                // ("@effects/x.png": from the assets folder itself, not hfo/)
                ImageCache.GetImageWithCallBack(file.charAt(0) == "@" ? file.substr(1) : ROOT + file, function(key:String, loaded:BitmapData, args:Array = null):void {
                        var target:BitmapData = _bmd[file] as BitmapData;
                        if (loaded && target) {
                            target.copyPixels(loaded, new Rectangle(0, 0, Math.min(loaded.width, target.width), Math.min(loaded.height, target.height)), new Point(), null, null, true);
                        }
                        _loading[file] = "done";
                        for each (var f:Function in _waiting[file] as Array) {
                            try {
                                f();
                            }
                            catch (e:Error) {
                            }
                        }
                        _waiting[file] = [];
                    });
            }
            if (then != null) {
                if (_loading[file] == "done") {
                    then();
                }
                else {
                    (_waiting[file] as Array).push(then);
                }
            }
            return bmd;
        }

        public static function loaded(file:String):Boolean {
            return _loading[file] == "done";
        }

        // ---- the ice block a tower wears: "short" (64 footprint, up to about 115 tall), "tall", "large" (120)

        /** Sniper, Lightning (Tesla) and the Quake tower are tall; the Monster Bunker (120) large; the rest short. */
        public static function towerSize(tower:BFOUNDATION):String {
            if (!tower) {
                return "short";
            }
            var t:int = tower._type;
            if (t == 22 || tower._footprint && tower._footprint.length && Rectangle(tower._footprint[0]).width >= 100) {
                return "large";
            }
            if (t == 21 || t == 25 || t == 129) {
                return "tall";
            }
            return "short";
        }

        // ---- one-shot animations (a strip played once where it is put, then gone)

        private static var _fx:Array = [];

        private static var _ticker:Sprite = null;

        /**
         * Plays strip `name` once at map position (x, y) (the anchor its offsets are from), drawn at `depth`
         * (MAP.DEPTH_SHADOW + 0.5: on the ground; a building's depth: with it), `step` frames apart.
         */
        public static function play(name:String, x:Number, y:Number, depth:Number, step:int = 4, then:Function = null):void {
            var s:Array = STRIPS[name] as Array;
            if (!s) {
                if (then != null) {
                    then();
                }
                return;
            }
            playRow(s[0], s[3], s[4], s[5], 0, x + s[1], y + s[2], depth, step, then, 1);
        }

        /**
         * Plays row `row` of a strip of `frames` frames of w x h (`rows` rows in the file) once, its top left at
         * map point (x, y).
         */
        public static function playRow(file:String, w:int, h:int, frames:int, row:int, x:Number, y:Number, depth:Number, step:int = 4, then:Function = null, rows:int = 3):void {
            if (!BYMConfig.instance.RENDERER_ON || !MAP.instance || !GLOBAL._render) {
                if (then != null) {
                    then();
                }
                return;
            }
            var strip:BitmapData = image(file, w * frames, h * Math.max(1, rows));
            var frame:BitmapData = new BitmapData(w, h, true, 0);
            var off:Point = MAP.instance.offset;
            var pt:Point = new Point(x - off.x, y - off.y);
            var fx:Object = {"strip": strip, "frame": frame, "pt": pt, "w": w, "h": h, "row": row, "frames": frames, "at": 0, "step": Math.max(1, step), "tick": 0, "then": then, "raster": new RasterData(frame, pt, depth)};
            draw(fx);
            _fx.push(fx);
            if (!_ticker) {
                _ticker = new Sprite();
                _ticker.addEventListener(Event.ENTER_FRAME, tick);
            }
        }

        /** Calls `then` after `frames` frames (a pause in a sequence). */
        public static function wait(frames:int, then:Function):void {
            _fx.push({"strip": null, "frame": null, "raster": null, "frames": 1, "at": 0, "step": Math.max(1, frames), "tick": 0, "then": then});
            if (!_ticker) {
                _ticker = new Sprite();
                _ticker.addEventListener(Event.ENTER_FRAME, tick);
            }
        }

        /** The drawing depth of something standing at map point (x, y). */
        public static function mapDepth(x:Number, y:Number):Number {
            if (!MAP.instance) {
                return MAP.DEPTH_SHADOW + 1;
            }
            var off:Point = MAP.instance.offset;
            return (y - off.y) * 1000 + (x - off.x);
        }

        private static function draw(fx:Object):void {
            var frame:BitmapData = fx.frame;
            frame.fillRect(frame.rect, 0);
            frame.copyPixels(fx.strip, new Rectangle(fx.at * fx.w, fx.row * fx.h, fx.w, fx.h), new Point());
        }

        private static function tick(e:Event):void {
            var i:int = _fx.length - 1;
            while (i >= 0) {
                var fx:Object = _fx[i];
                if (++fx.tick >= fx.step) {
                    fx.tick = 0;
                    fx.at += 1;
                    if (fx.at >= fx.frames) {
                        if (fx.raster) {
                            RasterData(fx.raster).clear();
                        }
                        _fx.splice(i, 1);
                        if (fx.then != null) {
                            try {
                                fx.then();
                            }
                            catch (err:Error) {
                            }
                        }
                    }
                    else {
                        draw(fx);
                    }
                }
                i--;
            }
        }

        /** Every animation gone (a yard leaving). */
        public static function clearFx():void {
            for each (var fx:Object in _fx) {
                if (fx.raster) {
                    RasterData(fx.raster).clear();
                }
            }
            _fx = [];
        }

        // ---- an ice block on a tower in battle (IoIce: an ice monster's hit): the picture over it, its
        // shadow under it, and the frost icon above

        private static var _battle:Array = [];

        /**
         * Puts the ice on `tower` (BTOWER) for a battle hit; returns a handle for towerIceOff. `scale` enlarges the
         * block for a bigger building (the Compound sealed during the waves: IoHfoWaves), drawn then without its
         * ground shadow (the building's own is there). Drawn straight onto the map just above the building (a
         * building's own children were not drawn: the Compound's block never showed).
         */
        public static function towerIceOn(tower:BFOUNDATION, scale:Number = 1, depthBelow:Number = NaN):Object {
            if (!tower || !tower._mc || !BYMConfig.instance.RENDERER_ON || !MAP.instance) {
                return null;
            }
            var size:String = towerSize(tower);
            var name:String = "ice_" + size;
            var at:Point = picAt(name);
            var bmd:BitmapData = pic(name);
            if (scale != 1) {
                var p:Array = PICS[name] as Array;
                var src:BitmapData = bmd;
                var big:BitmapData = new BitmapData(Math.ceil(int(p[3]) * scale), Math.ceil(int(p[4]) * scale), true, 0);
                // (made again once the picture has loaded: told at once when it already has)
                image(p[0], p[3], p[4], function():void {
                        big.fillRect(big.rect, 0);
                        big.draw(src, new Matrix(scale, 0, 0, scale), null, null, null, true);
                    });
                bmd = big;
            }
            var off:Point = MAP.instance.offset;
            // (`depthBelow`: drawn over everything down to that many pixels below the building's top: the Compound's
            // monsters inside it)
            var depth:Number = isNaN(depthBelow) ? depthOf(tower) + 5 : (tower._mc.y + depthBelow - off.y) * 1000 + (tower._mc.x - off.x) + 15;
            var top:RasterData = new RasterData(bmd, new Point(tower._mc.x + at.x * scale - off.x, tower._mc.y + at.y * scale - off.y), depth);
            var icon:RasterData = new RasterData(image("@effects/frost_icon.png", 16, 20), new Point(tower._mc.x - 8 - off.x, tower._mc.y + at.y * scale - 24 - off.y), depth + 1);
            var shadow:RasterData = null;
            if (scale == 1) {
                var shadowAt:Point = picAt(name + "_shadow");
                shadow = new RasterData(pic(name + "_shadow"), new Point(tower._mc.x + shadowAt.x - off.x, tower._mc.y + shadowAt.y - off.y), MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true);
            }
            var handle:Object = {"tower": tower, "top": top, "icon": icon, "shadow": shadow, "size": size};
            _battle.push(handle);
            return handle;
        }

        /** Takes the ice off (`shatter`: it breaks with the shatter animation). */
        public static function towerIceOff(handle:Object, shatter:Boolean = true):void {
            if (!handle) {
                return;
            }
            var tower:BFOUNDATION = handle.tower as BFOUNDATION;
            if (handle.top) {
                RasterData(handle.top).clear();
            }
            if (handle.icon) {
                RasterData(handle.icon).clear();
            }
            if (handle.shadow) {
                RasterData(handle.shadow).clear();
            }
            var i:int = _battle.indexOf(handle);
            if (i >= 0) {
                _battle.splice(i, 1);
            }
            if (shatter && tower && tower._mc && tower.health > 0) {
                play("ice_" + handle.size + "_shatter", tower._mc.x, tower._mc.y, depthOf(tower) + 50, 3);
                SOUNDS.Play("ihit" + int(1 + Math.random() * 7), 0.5);
            }
        }

        /** Every battle ice gone at once (the yard is leaving). */
        public static function clearBattleIce():void {
            for each (var handle:Object in _battle.concat()) {
                towerIceOff(handle, false);
            }
            _battle = [];
        }

        /** A building's drawing depth (as BFOUNDATION.updateRasterData works it out), for things drawn with it. */
        public static function depthOf(b:BFOUNDATION):Number {
            if (!b || !b._mc || !MAP.instance) {
                return MAP.DEPTH_SHADOW + 1;
            }
            var off:Point = MAP.instance.offset;
            return (b._mc.y - off.y + (b._middle ? b._middle : b._mc.height * 0.5)) * 1000 + (b._mc.x - off.x) + 10;
        }
    }
}
