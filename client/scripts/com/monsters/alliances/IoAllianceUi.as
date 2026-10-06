package com.monsters.alliances {
    import com.monsters.display.ImageCache;
    import com.monsters.maproom_advanced.IoMapShare;
    import com.monsters.maproom_advanced.IoMapUi;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObjectContainer;
    import flash.display.Graphics;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the pieces the redesigned Alliances window is drawn with (the user's design of 2 October),
     * in the window's own beige: text, section bands, cards, buttons, times, and jumping to a place.
     */
    public class IoAllianceUi {

        public function IoAllianceUi() {
            super();
        }

        /** A text field (not clickable). `width` 0: as wide as its text. */
        public static function text(value:String, size:int, color:uint, bold:Boolean = false, width:int = 0, align:String = "left", html:Boolean = false, wrap:Boolean = false):TextField {
            var t:TextField = new TextField();
            t.selectable = false;
            t.mouseEnabled = false;
            var f:TextFormat = new TextFormat("Verdana", size, color, bold);
            f.align = align;
            t.defaultTextFormat = f;
            if (wrap) {
                t.wordWrap = true;
                t.multiline = true;
            }
            if (width > 0) {
                t.width = width;
            }
            if (html) {
                t.htmlText = value;
            }
            else {
                t.text = value;
            }
            if (width <= 0) {
                t.autoSize = TextFieldAutoSize.LEFT;
            }
            else {
                t.height = Math.max(size + 8, int(t.textHeight) + 6);
            }
            return t;
        }

        /** Adds a text field at (x, y) and returns it. */
        public static function addText(parent:DisplayObjectContainer, value:String, x:int, y:int, size:int, color:uint, bold:Boolean = false, width:int = 0, align:String = "left", html:Boolean = false, wrap:Boolean = false):TextField {
            var t:TextField = text(value, size, color, bold, width, align, html, wrap);
            t.x = x;
            t.y = y;
            parent.addChild(t);
            return t;
        }

        /** A section's heading: the tables' header colour, its words in bold. */
        public static function band(parent:DisplayObjectContainer, x:int, y:int, w:int, label:String, h:int = 24):Sprite {
            var s:Sprite = new Sprite();
            s.mouseEnabled = false;
            s.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
            s.graphics.beginFill(AllianceConstants.HEADER_BG, 1);
            s.graphics.drawRect(0, 0, w, h);
            s.graphics.endFill();
            var t:TextField = text(label, 12, 0x000000, true, w - 16);
            t.x = 8;
            t.y = int((h - 18) / 2);
            s.addChild(t);
            s.x = x;
            s.y = y;
            parent.addChild(s);
            return s;
        }

        /** A light card with a soft edge (a pin, a section's body). */
        public static function card(g:Graphics, x:Number, y:Number, w:Number, h:Number, fill:uint = 0xFBF3E8, edge:uint = 0xC9AE8C):void {
            g.lineStyle(1, edge, 1, true);
            g.beginFill(fill, 1);
            g.drawRoundRect(x, y, w, h, 10, 10);
            g.endFill();
            g.lineStyle();
        }

        /** A button: "gold" for the main action, "grey" otherwise. Carries setEnabled / setText. */
        public static function button(label:String, w:int, h:int, onClick:Function, style:String = "grey", size:int = 11):MovieClip {
            return IoMapUi.button(label, w, h, onClick, style, size);
        }

        /** A word that can be clicked (the window's links: "Open the board", "See all"). */
        public static function link(label:String, size:int, onClick:Function):Sprite {
            var s:Sprite = new Sprite();
            var t:TextField = text(label + "  >", size, 0x6A3F00, true, 0, "left", false);
            s.addChild(t);
            s.buttonMode = true;
            s.mouseChildren = false;
            s.graphics.beginFill(0, 0);
            s.graphics.drawRect(0, 0, t.width, t.height);
            s.graphics.endFill();
            s.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    SOUNDS.Play("click1");
                    onClick();
                });
            return s;
        }

        public static function num(value:Number):String {
            return GLOBAL.FormatNumber(Math.round(value));
        }

        /** "now", "33s", "2m", "4h", "3d" since a time (seconds). */
        public static function ago(ts:Number):String {
            var sec:int = Math.max(0, GLOBAL.Timestamp() - int(ts));
            if (sec < 5) {
                return KEYS.Get("io_alliance_now");
            }
            return KEYS.Get("io_alliance_ago", {"v1": span(sec)});
        }

        /** "33s", "2m", "4h", "3d". */
        public static function span(sec:int):String {
            if (sec < 60) {
                return sec + "s";
            }
            if (sec < 3600) {
                return int(sec / 60) + "m";
            }
            if (sec < 86400) {
                return int(sec / 3600) + "h";
            }
            return int(sec / 86400) + "d";
        }

        public static function coord(x:int, y:int):String {
            return IoMapUi.coord(x, y);
        }

        /** "+3", "-2", "0". */
        public static function signed(n:int):String {
            return n > 0 ? "+" + n : String(n);
        }

        /**
         * Opens the map at a place (the window closes): only on the player's own world, which is the only map
         * they can open.
         */
        public static function jump(x:int, y:int, world:String):void {
            var mine:String = ALLIANCES.ioMyWorld();
            if (world && mine && world != mine) {
                GLOBAL.Message(KEYS.Get("io_alliance_other_world"));
                return;
            }
            ALLIANCEWINDOW.Hide();
            IoMapShare.OpenOwnWorld(x, y);
        }

        /** The alliance's emblem, fitted into a square of `size`. */
        public static function emblem(container:DisplayObjectContainer, id:int, size:int):void {
            if (id <= 0) {
                return;
            }
            var suffix:String = id <= 20 ? "_large" : "_medium";
            ImageCache.GetImageWithCallBack("alliances/" + id + suffix + ".png", function(k:String, bmd:BitmapData, args:Array):void {
                    var bmp:Bitmap = new Bitmap(bmd);
                    bmp.smoothing = true;
                    if (bmd.width > 0 && bmd.height > 0) {
                        var scale:Number = Math.min(size / bmd.width, size / bmd.height);
                        bmp.scaleX = bmp.scaleY = scale;
                        bmp.x = int((size - bmd.width * scale) / 2);
                        bmp.y = int((size - bmd.height * scale) / 2);
                    }
                    DisplayObjectContainer(args[0]).addChild(bmp);
                }, true, 4, "", [container]);
        }

        /** The server's answer as a message, when it is an error (true when it was). */
        public static function failed(response:Object):Boolean {
            if (response == null) {
                GLOBAL.Message(KEYS.Get("alliance_err_generic"));
                return true;
            }
            if (response.error) {
                GLOBAL.Message(String(response.error));
                return true;
            }
            return false;
        }

        /** A light rule across a card. */
        public static function rule(g:Graphics, x:Number, y:Number, w:Number):void {
            g.lineStyle(1, 0xD8C3A6, 1);
            g.moveTo(x, y);
            g.lineTo(x + w, y);
            g.lineStyle();
        }

        public static const CENTER:String = TextFormatAlign.CENTER;

        public static const RIGHT:String = TextFormatAlign.RIGHT;
    }
}
