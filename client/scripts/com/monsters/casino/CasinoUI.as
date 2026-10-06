package com.monsters.casino {
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObject;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.TextField;
    import flash.text.TextFieldType;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * The Brimstone Pit's drawing helpers: its text, molten buttons, obsidian panels and chips, in the
     * look of the Descent (IoGauntlet). Art comes from server/public/assets/casino (art/brimstonepit).
     */
    public class CasinoUI {

        public static const GOLD:uint = 0xFFD58A;

        public static const EMBER:uint = 0xFF8A2A;

        public static const ASH:uint = 0xB8A898;

        public static const WIN:uint = 0x9CFF6A;

        public static const LOSS:uint = 0xFF6A5A;

        /** A text field; font "Groboldov" is the game's embedded title font. */
        public static function label(text:String, size:int, color:uint, bold:Boolean = false, width:int = 200, align:String = "left", font:String = "Verdana"):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = width;
            field.height = size + 10;
            if (font == "Groboldov") {
                field.embedFonts = true;
            }
            var format:TextFormat = new TextFormat(font, size, color, font == "Groboldov" ? false : bold);
            format.align = align;
            field.defaultTextFormat = format;
            field.text = text;
            return field;
        }

        /** A title in the game's font, glowing like embers. */
        public static function title(text:String, size:int, width:int, align:String = "center"):TextField {
            var t:TextField = label(text, size, 0xFFFFFF, false, width, align, "Groboldov");
            t.height = size + 14;
            t.filters = [new GlowFilter(0x6A1404, 1, 4, 4, 6, 2), new DropShadowFilter(2, 45, 0, 0.6, 3, 3, 1, 2)];
            return t;
        }

        /** A button of molten gold (the Descent's), or ash grey when it cannot be used. */
        public static function button(text:String, width:int, height:int, onClick:Function, enabled:Boolean = true, size:int = 15):Sprite {
            var b:MovieClip = new MovieClip(); // (dynamic: keeps its state on itself)
            b.name = "casinoButton:" + text;
            var t:TextField = label(text, size, 0xFFFFFF, false, width, TextFormatAlign.CENTER, "Groboldov");
            t.height = size + 12;
            t.y = int((height - size - 8) / 2);
            t.filters = [new GlowFilter(0x4A0A02, 1, 3, 3, 5, 1)];
            b.addChild(t);
            b.mouseChildren = false;
            var hot:Boolean = false;
            var draw:Function = function():void {
                var on:Boolean = Boolean(b["casinoEnabled"]);
                var m:Matrix = new Matrix();
                m.createGradientBox(width, height, Math.PI / 2, 0, 0);
                b.graphics.clear();
                b.graphics.lineStyle(2, on ? 0xFFE0A0 : 0x6A5A50, 1);
                b.graphics.beginGradientFill(GradientType.LINEAR, on ? (hot ? [0xFFC060, 0xE0501C, 0x9A2008] : [0xF0A040, 0xC8401A, 0x7A1806]) : [0x5A4A44, 0x3A2E2A, 0x2A2220], [1, 1, 1], [0, 140, 255], m);
                b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
                b.graphics.endFill();
                t.textColor = on ? 0xFFFFFF : 0xA09088;
                b.filters = on ? [new GlowFilter(0xFF6A00, 0.6, 8, 8, 2, 2)] : [];
                b.buttonMode = on;
            };
            b["casinoEnabled"] = enabled;
            b["casinoRedraw"] = draw;
            b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    hot = true;
                    draw();
                });
            b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    hot = false;
                    draw();
                });
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    if (b["casinoEnabled"]) {
                        SOUNDS.Play("click1");
                        onClick(e);
                    }
                });
            draw();
            return b;
        }

        /** Turns a button() on or off. */
        public static function enable(b:Sprite, on:Boolean):void {
            if (b && b["casinoEnabled"] != on) {
                b["casinoEnabled"] = on;
                b["casinoRedraw"]();
            }
        }

        /** A button()'s text changed (its name, which tests look for, stays). */
        public static function relabel(b:Sprite, text:String):void {
            var t:TextField = b ? b.getChildAt(0) as TextField : null;
            if (t && t.text != text) {
                t.text = text;
            }
        }

        /** A small toggle (a risk, a ticket, a tab): gold when chosen. */
        public static function toggle(text:String, width:int, height:int, onClick:Function):Sprite {
            var b:MovieClip = new MovieClip();
            b.name = "casinoToggle:" + text;
            var t:TextField = label(text, 12, 0xFFFFFF, true, width, TextFormatAlign.CENTER);
            t.y = int((height - 17) / 2);
            b.addChild(t);
            b.mouseChildren = false;
            b.buttonMode = true;
            var draw:Function = function():void {
                var on:Boolean = Boolean(b["casinoChosen"]);
                var m:Matrix = new Matrix();
                m.createGradientBox(width, height, Math.PI / 2, 0, 0);
                b.graphics.clear();
                b.graphics.lineStyle(1, on ? 0xFFE0A0 : 0x7A5A48, 1);
                b.graphics.beginGradientFill(GradientType.LINEAR, on ? [0xE08A30, 0x9A3010] : [0x3A2A26, 0x1E1614], [1, 1], [0, 255], m);
                b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
                b.graphics.endFill();
                t.textColor = on ? 0xFFFFFF : ASH;
            };
            b["casinoChosen"] = false;
            b["casinoRedraw"] = draw;
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    onClick(e);
                });
            draw();
            return b;
        }

        public static function choose(b:Sprite, on:Boolean):void {
            if (b) {
                b["casinoChosen"] = on;
                b["casinoRedraw"]();
            }
        }

        /** An obsidian panel with a thin molten rim. */
        public static function panel(width:int, height:int, alpha:Number = 0.88):Sprite {
            var p:Sprite = new Sprite();
            var m:Matrix = new Matrix();
            m.createGradientBox(width, height, Math.PI / 2, 0, 0);
            p.graphics.lineStyle(1.5, 0x9A3A14, 1);
            p.graphics.beginGradientFill(GradientType.LINEAR, [0x241816, 0x120C0B], [alpha, alpha], [0, 255], m);
            p.graphics.drawRoundRect(0, 0, width, height, 14, 14);
            p.graphics.endFill();
            return p;
        }

        /** A bone chip with its value (the bet selector's). */
        public static function chip(value:int, onClick:Function):Sprite {
            var c:MovieClip = new MovieClip();
            c.name = "casinoChip:" + value;
            c.buttonMode = true;
            c.mouseChildren = false;
            var colors:Object = {"1": 0xD8CFC0, "5": 0xC04A2A, "10": 0x3A6AB0, "25": 0x3A9A4A, "50": 0xE08A20, "100": 0x2A2226, "250": 0x8A3AB0, "500": 0xD8B040};
            var col:uint = colors[String(value)] != null ? uint(colors[String(value)]) : 0x9A6A4A;
            var draw:Function = function():void {
                var on:Boolean = Boolean(c["casinoChosen"]);
                c.graphics.clear();
                c.graphics.lineStyle(2, on ? 0xFFF0B0 : 0xE8DCC8, 1);
                c.graphics.beginFill(col, 1);
                c.graphics.drawCircle(0, 0, 17);
                c.graphics.endFill();
                c.graphics.lineStyle(3, 0xF4ECDC, 0.9);
                var i:int = 0;
                while (i < 8) {
                    var a:Number = i / 8 * Math.PI * 2;
                    c.graphics.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
                    c.graphics.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
                    i++;
                }
                c.graphics.lineStyle(1, 0x000000, 0.35);
                c.graphics.beginFill(0x000000, 0.18);
                c.graphics.drawCircle(0, 0, 10.5);
                c.graphics.endFill();
                c.filters = on ? [new GlowFilter(0xFFB040, 1, 10, 10, 3, 2)] : [new DropShadowFilter(2, 60, 0, 0.5, 3, 3, 1, 1)];
            };
            var t:TextField = label(value >= 1000 ? int(value / 1000) + "k" : String(value), value >= 100 ? 10 : 12, value == 1 || value == 500 ? 0x201410 : 0xFFFFFF, true, 34, TextFormatAlign.CENTER);
            t.x = -17;
            t.y = -9;
            c.addChild(t);
            c["casinoChosen"] = false;
            c["casinoRedraw"] = draw;
            draw();
            c.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    onClick(e);
                });
            return c;
        }

        /** A number field the player types in (digits only). */
        public static function input(width:int, height:int, text:String, maxChars:int = 9, restrict:String = "0-9"):TextField {
            var f:TextField = new TextField();
            f.type = TextFieldType.INPUT;
            f.selectable = true;
            f.mouseEnabled = true;
            f.restrict = restrict;
            f.maxChars = maxChars;
            f.width = width;
            f.height = height;
            f.border = true;
            f.borderColor = 0x9A3A14;
            f.background = true;
            f.backgroundColor = 0x120C0B;
            var format:TextFormat = new TextFormat("Verdana", 13, GOLD, true);
            format.align = TextFormatAlign.CENTER;
            f.defaultTextFormat = format;
            f.text = text;
            return f;
        }

        /**
         * A picture from the server's assets (casino/...), added to holder when it has loaded, at (x, y),
         * scaled to (w, h) when they are given.
         */
        public static function picture(holder:Sprite, key:String, x:Number = 0, y:Number = 0, w:Number = 0, h:Number = 0, onLoaded:Function = null):void {
            ImageCache.GetImageWithCallBack(key, function(k:String, bmd:BitmapData, args:Array = null):void {
                    if (!bmd) {
                        return;
                    }
                    var b:Bitmap = new Bitmap(bmd);
                    b.smoothing = true;
                    b.x = x;
                    b.y = y;
                    if (w > 0) {
                        b.width = w;
                    }
                    if (h > 0) {
                        b.height = h;
                    }
                    holder.addChild(b);
                    if (onLoaded != null) {
                        onLoaded(b);
                    }
                });
        }

        /** 12,345 */
        public static function number(n:Number):String {
            return GLOBAL.FormatNumber(n);
        }

        /**
         * An amount of Shiny that may have a part (a win of 1.5x on 1 Shiny): 1.5, 1,204.25, 12. A part is
         * paid as one more Shiny with its chance (the server decides), so this is what the win is worth.
         */
        public static function shiny(n:Number):String {
            var cents:Number = Math.floor(n * 100 + 0.000001);
            var whole:Number = Math.floor(cents / 100);
            var part:int = int(cents - whole * 100);
            return GLOBAL.FormatNumber(whole) + (part == 0 ? "" : "." + (part < 10 ? "0" + part : (part % 10 == 0 ? String(part / 10) : String(part))));
        }

        /** 1.4x, 0.45x, 60x */
        public static function mult(m:Number):String {
            var s:String = String(Math.round(m * 100) / 100);
            return s + "x";
        }

        public static function removeAll(s:Sprite):void {
            while (s.numChildren > 0) {
                s.removeChildAt(0);
            }
        }

        /** The top-left of `o` placed at (x, y). */
        public static function at(o:DisplayObject, x:Number, y:Number):DisplayObject {
            o.x = x;
            o.y = y;
            return o;
        }
    }
}
