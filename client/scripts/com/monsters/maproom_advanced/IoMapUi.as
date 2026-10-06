package com.monsters.maproom_advanced {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllyInfo;
    import flash.display.Graphics;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the small pieces the map room's own panels are drawn with (the sidebar, the zoom control,
     * the minimap, the coordinates, sharing): colours, text, buttons, check boxes and map pins. The colours
     * are the map window's: parchment for the sidebar, dark glass over the map.
     */
    public class IoMapUi {

        public static const INK:uint = 0x2B1A0C;

        public static const MUTED:uint = 0x6B4A26;

        public static const PAPER:uint = 0xE9D7B0;

        public static const PAPER_LIGHT:uint = 0xF6E9CA;

        public static const PAPER_ROW:uint = 0xFFF5DC;

        public static const RULE:uint = 0xCDB487;

        public static const EDGE:uint = 0x7A5530;

        public static const TAB_OFF:uint = 0xB18751;

        public static const GOLD:uint = 0xE2B227;

        public static const GOLD_HOVER:uint = 0xF0C84A;

        public static const GOLD_EDGE:uint = 0x7A5A12;

        public static const GREY:uint = 0xECEBE7;

        public static const GREY_HOVER:uint = 0xFFFFFF;

        public static const GREY_EDGE:uint = 0x9A9A96;

        public static const DARK:uint = 0x180E08;

        public static const DARK_EDGE:uint = 0xCBB58A;

        public static const LIGHT:uint = 0xF4E6C4;

        public static const LIGHT_MUTED:uint = 0xBFA983;

        public static const MATCH:uint = 0xA86A00;

        /** Relations, in the order the filters and the legend list them. */
        public static const YOU:int = 0;

        public static const ALLY:int = 1;

        public static const FRIENDLY:int = 2;

        public static const HOSTILE:int = 3;

        public static const OTHER:int = 4;

        public static const NONE:int = 5;

        public static const RELATION_NAMES:Array = ["You", "Your alliance", "Friendly", "Hostile", "Other alliances", "No alliance"];

        public function IoMapUi() {
            super();
        }

        /** How the player stands with a yard's owner (one of YOU ... NONE). */
        public static function relation(uid:int, allianceID:int):int {
            if (uid == LOGIN._playerID) {
                return YOU;
            }
            switch (ALLIANCES.ioRelation(allianceID)) {
                case 4:
                    return ALLY;
                case 1:
                    return FRIENDLY;
                case -1:
                    return HOSTILE;
                case 0:
                    return OTHER;
            }
            return NONE;
        }

        /** The colour of the name bar the map gives a relation (AllyInfo._picURLs). */
        public static function relationColour(key:int):uint {
            switch (key) {
                case YOU:
                    return uint(AllyInfo._picURLs.playerHex);
                case ALLY:
                    return uint(AllyInfo._picURLs.allyHex);
                case FRIENDLY:
                    return uint(AllyInfo._picURLs.friendlyHex);
                case HOSTILE:
                    return uint(AllyInfo._picURLs.hostileHex);
                case OTHER:
                    return uint(AllyInfo._picURLs.neutralHex);
            }
            return uint(AllyInfo._picURLs.noneHex);
        }

        /** "-263, -95" */
        public static function coord(cellX:int, cellY:int):String {
            if (GLOBAL.INFERNO_ONLY && IoUnderworld.isUnder(cellX, cellY)) {
                return IoUnderworld.label(cellX, cellY);
            }
            return GLOBAL.ioCoord(cellX) + ", " + GLOBAL.ioCoord(cellY);
        }

        /**
         * A place in the popups' short "Location" boxes: "188 x 201" in the world above (0-399), "D4 x D5" in the
         * Depths of Hell (0-9, as the outposts list numbers them).
         */
        public static function location(cellX:int, cellY:int):String {
            if (GLOBAL.INFERNO_ONLY && IoUnderworld.isUnder(cellX, cellY)) {
                return "D" + (cellX - IoUnderworld.origin) + " x D" + (cellY - IoUnderworld.origin);
            }
            return GLOBAL.ioCoord(cellX) + " x " + GLOBAL.ioCoord(cellY);
        }

        public static function escape(text:String):String {
            return String(text).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
        }

        public static function label(text:String, size:int, color:uint, bold:Boolean = false, width:int = 200, align:String = "left"):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = width;
            field.height = size + 8;
            var format:TextFormat = new TextFormat("Verdana", size, color, bold);
            format.align = align;
            field.defaultTextFormat = format;
            field.text = text;
            return field;
        }

        /** A text box to type in. */
        public static function input(size:int, color:uint, width:int, maxChars:int = 0):TextField {
            var field:TextField = new TextField();
            field.type = "input";
            field.selectable = true;
            field.width = width;
            field.height = size + 8;
            field.maxChars = maxChars;
            field.defaultTextFormat = new TextFormat("Verdana", size, color, false);
            field.text = "";
            return field;
        }

        public static function roundBox(g:Graphics, x:Number, y:Number, w:Number, h:Number, fill:uint, fillAlpha:Number, edge:int, radius:Number, edgeThickness:Number = 1):void {
            if (edge >= 0) {
                g.lineStyle(edgeThickness, uint(edge), 1, true);
            }
            else {
                g.lineStyle();
            }
            g.beginFill(fill, fillAlpha);
            g.drawRoundRect(x, y, w, h, radius * 2, radius * 2);
            g.endFill();
            g.lineStyle();
        }

        /** Dark glass over the map (the coordinates, the minimap, bubbles). */
        public static function glass(g:Graphics, w:Number, h:Number, radius:Number = 8):void {
            roundBox(g, 0, 0, w, h, DARK, 0.9, DARK_EDGE, radius, 1.5);
        }

        /**
         * A button: gold for the main action, grey otherwise, or dark on the map. A MovieClip, so it can carry
         * setEnabled / setText as properties.
         */
        public static function button(text:String, w:int, h:int, onClick:Function, style:String = "grey", size:int = 11):MovieClip {
            var b:MovieClip = new MovieClip();
            var fill:uint = style == "gold" ? GOLD : (style == "dark" ? 0x3B2819 : GREY);
            var hover:uint = style == "gold" ? GOLD_HOVER : (style == "dark" ? 0x54391F : GREY_HOVER);
            var edge:uint = style == "gold" ? GOLD_EDGE : (style == "dark" ? DARK_EDGE : GREY_EDGE);
            var color:uint = style == "dark" ? LIGHT : (style == "gold" ? INK : 0x333333);
            var enabled:Boolean = true;
            var t:TextField = label(text, size, color, true, w, TextFormatAlign.CENTER);
            var draw:Function = function(over:Boolean):void {
                b.graphics.clear();
                roundBox(b.graphics, 0, 0, w, h, over && enabled ? hover : fill, 1, edge, 6, 1.5);
            };
            b.buttonMode = true;
            b.mouseChildren = false;
            draw(false);
            t.y = int((h - size - 7) / 2);
            b.addChild(t);
            b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    draw(true);
                });
            b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    draw(false);
                });
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    if (enabled) {
                        SOUNDS.Play("click1");
                        onClick(e);
                    }
                });
            // Pressing a button is not the start of a map drag.
            b.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation();
                });
            b.setEnabled = function(on:Boolean):void {
                enabled = on;
                b.alpha = on ? 1 : 0.45;
                b.buttonMode = on;
                draw(false);
            };
            b.setText = function(value:String):void {
                t.text = value;
            };
            return b;
        }

        /**
         * A check box with its label, and a coloured dot before the label when dotColour is given. Clicking
         * anywhere on it flips it and calls onChange(checked).
         */
        public static function checkbox(text:String, checked:Boolean, onChange:Function, width:int, dotColour:int = -1):MovieClip {
            var c:MovieClip = new MovieClip();
            var t:TextField = label(text, 11, INK, false, width - (dotColour >= 0 ? 34 : 20));
            var draw:Function = function():void {
                var g:Graphics = c.graphics;
                g.clear();
                g.beginFill(0x000000, 0);
                g.drawRect(0, 0, width, 20);
                g.endFill();
                roundBox(g, 0, 3, 14, 14, checked ? GOLD : 0xFFF8E6, 1, EDGE, 3, 1.5);
                if (checked) {
                    g.lineStyle(2.2, INK, 1, true);
                    g.moveTo(3, 10);
                    g.lineTo(6, 13.5);
                    g.lineTo(11.5, 6);
                    g.lineStyle();
                }
                if (dotColour >= 0) {
                    g.lineStyle(1, 0x000000, 0.9);
                    g.beginFill(uint(dotColour), 1);
                    g.drawCircle(25, 10, 5);
                    g.endFill();
                    g.lineStyle();
                }
            };
            t.x = dotColour >= 0 ? 34 : 20;
            t.y = 1;
            c.addChild(t);
            c.buttonMode = true;
            c.mouseChildren = false;
            draw();
            c.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    SOUNDS.Play("click1");
                    checked = !checked;
                    draw();
                    onChange(checked);
                });
            c.setChecked = function(on:Boolean):void {
                checked = on;
                draw();
            };
            return c;
        }

        /** A map pin with its point at (x, y). */
        public static function pin(g:Graphics, x:Number, y:Number, colour:uint, size:Number = 14, edge:uint = 0x3A2A10):void {
            var r:Number = size * 0.32;
            var cy:Number = y - size + r;
            g.lineStyle(1, edge, 1, true);
            g.beginFill(colour, 1);
            g.moveTo(x, y);
            g.curveTo(x - r * 1.05, cy + r * 1.3, x - r, cy);
            g.curveTo(x - r, cy - r, x, cy - r);
            g.curveTo(x + r, cy - r, x + r, cy);
            g.curveTo(x + r * 1.05, cy + r * 1.3, x, y);
            g.endFill();
            g.lineStyle();
            g.beginFill(0xFFF3D6, 1);
            g.drawCircle(x, cy, r * 0.4);
            g.endFill();
        }

        /** A small magnifying glass. */
        public static function magnifier(g:Graphics, x:Number, y:Number, colour:uint):void {
            g.lineStyle(2, colour, 1, true);
            g.drawCircle(x + 5.5, y + 5.5, 4.5);
            g.moveTo(x + 9, y + 9);
            g.lineTo(x + 13, y + 13);
            g.lineStyle();
        }

        /** A chevron pointing down (or up). */
        public static function chevron(g:Graphics, x:Number, y:Number, colour:uint, up:Boolean = false):void {
            g.lineStyle(2, colour, 1, true);
            if (up) {
                g.moveTo(x, y + 5);
                g.lineTo(x + 5, y);
                g.lineTo(x + 10, y + 5);
            }
            else {
                g.moveTo(x, y);
                g.lineTo(x + 5, y + 5);
                g.lineTo(x + 10, y);
            }
            g.lineStyle();
        }

        /** An x (delete). */
        public static function cross(g:Graphics, x:Number, y:Number, size:Number, colour:uint):void {
            g.lineStyle(2, colour, 1, true);
            g.moveTo(x, y);
            g.lineTo(x + size, y + size);
            g.moveTo(x + size, y);
            g.lineTo(x, y + size);
            g.lineStyle();
        }

        /** A pencil (rename). */
        public static function pencil(g:Graphics, x:Number, y:Number, colour:uint):void {
            g.lineStyle(1.6, colour, 1, true);
            g.moveTo(x, y + 10);
            g.lineTo(x + 3, y + 10);
            g.lineTo(x + 10, y + 3);
            g.lineTo(x + 7, y);
            g.lineTo(x, y + 7);
            g.lineTo(x, y + 10);
            g.lineStyle();
        }

        /** An invisible hit area of a size, so a Sprite answers the mouse all over. */
        public static function hitArea(g:Graphics, w:Number, h:Number):void {
            g.beginFill(0x000000, 0);
            g.drawRect(0, 0, w, h);
            g.endFill();
        }
    }
}
