package com.monsters.quests {
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Graphics;
    import flash.display.Shape;
    import flash.display.Sprite;

    /**
     * Inferno-only: the quest book's pictures. "m:<monster id>" is the monster's own small portrait
     * (assets/monsters/<id>-small.png); every other name is a symbol drawn here on a 24-unit grid round the
     * middle, so the book needs no new art: tower, compound, egg, sword, wart, gift, map, chat, trophy, hall,
     * bolt, catapult, bone, coal, sulfur, magma, scroll, flask, dice, coin, lock, book, skull, shield, globe,
     * flag, eye, outpost, banner, mail, star, chest. An unknown name draws a star.
     */
    public class IoQuestArt {

        public static const GOLD:uint = 0xFFD58A;

        public static const EMBER:uint = 0xFF8A2A;

        public static const BONE:uint = 0xE8DCC8;

        public static const DARK:uint = 0x2A1A16;

        public function IoQuestArt() {
            super();
        }

        /** The picture for `icon`, `size` across, its middle at (0, 0). */
        public static function glyph(icon:String, size:int, dim:Boolean = false):Sprite {
            var s:Sprite = new Sprite();
            s.mouseEnabled = false;
            s.mouseChildren = false;
            if (icon && icon.indexOf("m:") == 0) {
                var id:String = icon.substr(2);
                ImageCache.GetImageWithCallBack("monsters/" + id + "-small.png", function(k:String, bmd:BitmapData, args:Array = null):void {
                        if (!bmd) {
                            return;
                        }
                        var b:Bitmap = new Bitmap(bmd);
                        b.smoothing = true;
                        var scale:Number = Math.min(size / bmd.width, size / bmd.height);
                        b.scaleX = b.scaleY = scale;
                        b.x = -bmd.width * scale / 2;
                        b.y = -bmd.height * scale / 2;
                        s.addChild(b);
                    });
                if (dim) {
                    s.alpha = 0.45;
                }
                return s;
            }
            var shape:Shape = new Shape();
            draw(shape.graphics, icon, size / 24);
            s.addChild(shape);
            if (dim) {
                s.alpha = 0.4;
            }
            return s;
        }

        private static function draw(g:Graphics, icon:String, u:Number):void {
            var i:int;
            var a:Number;
            switch (icon) {
                case "tower":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x9A8A80, 1);
                    g.drawRect(-5 * u, -6 * u, 10 * u, 16 * u);
                    g.endFill();
                    g.beginFill(0xB8A898, 1);
                    g.drawRect(-8 * u, -11 * u, 16 * u, 6 * u);
                    g.endFill();
                    g.beginFill(EMBER, 1);
                    g.drawRect(-2 * u, -2 * u, 4 * u, 5 * u);
                    g.endFill();
                    break;
                case "hall":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x8A3A1A, 1);
                    g.moveTo(-11 * u, -2 * u);
                    g.lineTo(0, -11 * u);
                    g.lineTo(11 * u, -2 * u);
                    g.lineTo(-11 * u, -2 * u);
                    g.endFill();
                    g.beginFill(0xB8A898, 1);
                    g.drawRect(-8 * u, -2 * u, 16 * u, 12 * u);
                    g.endFill();
                    g.beginFill(DARK, 1);
                    g.drawRect(-2.5 * u, 3 * u, 5 * u, 7 * u);
                    g.endFill();
                    break;
                case "compound":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x7A5A48, 1);
                    g.drawRoundRect(-11 * u, -6 * u, 22 * u, 16 * u, 6 * u, 6 * u);
                    g.endFill();
                    g.beginFill(DARK, 1);
                    g.drawEllipse(-4 * u, -1 * u, 8 * u, 11 * u);
                    g.endFill();
                    g.beginFill(EMBER, 1);
                    g.drawCircle(-6 * u, -9 * u, 2 * u);
                    g.drawCircle(6 * u, -9 * u, 2 * u);
                    g.endFill();
                    break;
                case "egg":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.drawEllipse(-8 * u, -11 * u, 16 * u, 21 * u);
                    g.endFill();
                    g.lineStyle(1.5 * u, EMBER, 1);
                    g.moveTo(-6 * u, 0);
                    g.lineTo(-2 * u, -3 * u);
                    g.lineTo(1 * u, 1 * u);
                    g.lineTo(5 * u, -2 * u);
                    break;
                case "sword":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xD8D0C8, 1);
                    g.moveTo(-9 * u, 9 * u);
                    g.lineTo(6 * u, -6 * u);
                    g.lineTo(10 * u, -10 * u);
                    g.lineTo(6 * u, -9 * u);
                    g.lineTo(-9 * u, 6 * u);
                    g.lineTo(-9 * u, 9 * u);
                    g.endFill();
                    g.lineStyle(3 * u, EMBER, 1);
                    g.moveTo(-8 * u, 2 * u);
                    g.lineTo(-2 * u, 8 * u);
                    break;
                case "wart":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xC8401A, 1);
                    g.drawEllipse(-10 * u, -9 * u, 20 * u, 12 * u);
                    g.endFill();
                    g.beginFill(BONE, 1);
                    g.drawRect(-3 * u, 2 * u, 6 * u, 8 * u);
                    g.endFill();
                    g.lineStyle(0, 0, 0);
                    g.beginFill(GOLD, 1);
                    g.drawCircle(-4 * u, -5 * u, 1.6 * u);
                    g.drawCircle(3 * u, -6 * u, 1.3 * u);
                    g.drawCircle(5 * u, -2 * u, 1.1 * u);
                    g.endFill();
                    break;
                case "gift":
                case "chest":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(icon == "chest" ? 0x8A4A1A : 0xC8401A, 1);
                    g.drawRect(-10 * u, -4 * u, 20 * u, 14 * u);
                    g.endFill();
                    g.beginFill(icon == "chest" ? 0xA85A22 : 0xE0602A, 1);
                    if (icon == "chest") {
                        g.drawRoundRect(-10 * u, -10 * u, 20 * u, 7 * u, 8 * u, 8 * u);
                    }
                    else {
                        g.drawRect(-11 * u, -8 * u, 22 * u, 5 * u);
                    }
                    g.endFill();
                    g.lineStyle(2.5 * u, GOLD, 1);
                    g.moveTo(0, -10 * u);
                    g.lineTo(0, 10 * u);
                    if (icon == "chest") {
                        g.lineStyle(1.5 * u, DARK, 1);
                        g.beginFill(GOLD, 1);
                        g.drawRect(-2.5 * u, -5 * u, 5 * u, 5 * u);
                        g.endFill();
                    }
                    break;
                case "map":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xD8C098, 1);
                    g.moveTo(-11 * u, -8 * u);
                    g.lineTo(-4 * u, -10 * u);
                    g.lineTo(4 * u, -8 * u);
                    g.lineTo(11 * u, -10 * u);
                    g.lineTo(11 * u, 8 * u);
                    g.lineTo(4 * u, 10 * u);
                    g.lineTo(-4 * u, 8 * u);
                    g.lineTo(-11 * u, 10 * u);
                    g.lineTo(-11 * u, -8 * u);
                    g.endFill();
                    g.lineStyle(2 * u, 0xC8401A, 1);
                    g.moveTo(-6 * u, -2 * u);
                    g.lineTo(0, 3 * u);
                    g.lineTo(6 * u, -3 * u);
                    break;
                case "globe":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x3A6A8A, 1);
                    g.drawCircle(0, 0, 10 * u);
                    g.endFill();
                    g.lineStyle(1.2 * u, BONE, 0.8);
                    g.drawEllipse(-4 * u, -10 * u, 8 * u, 20 * u);
                    g.moveTo(-10 * u, 0);
                    g.lineTo(10 * u, 0);
                    g.moveTo(-8 * u, -5 * u);
                    g.lineTo(8 * u, -5 * u);
                    g.moveTo(-8 * u, 5 * u);
                    g.lineTo(8 * u, 5 * u);
                    break;
                case "chat":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.drawRoundRect(-11 * u, -9 * u, 22 * u, 14 * u, 8 * u, 8 * u);
                    g.endFill();
                    g.beginFill(BONE, 1);
                    g.moveTo(-5 * u, 4 * u);
                    g.lineTo(-7 * u, 10 * u);
                    g.lineTo(1 * u, 4 * u);
                    g.endFill();
                    g.lineStyle(0, 0, 0);
                    g.beginFill(DARK, 1);
                    g.drawCircle(-5 * u, -2 * u, 1.5 * u);
                    g.drawCircle(0, -2 * u, 1.5 * u);
                    g.drawCircle(5 * u, -2 * u, 1.5 * u);
                    g.endFill();
                    break;
                case "mail":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.drawRect(-11 * u, -7 * u, 22 * u, 15 * u);
                    g.endFill();
                    g.moveTo(-11 * u, -7 * u);
                    g.lineTo(0, 2 * u);
                    g.lineTo(11 * u, -7 * u);
                    break;
                case "trophy":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(GOLD, 1);
                    g.moveTo(-8 * u, -10 * u);
                    g.lineTo(8 * u, -10 * u);
                    g.curveTo(8 * u, 3 * u, 0, 3 * u);
                    g.curveTo(-8 * u, 3 * u, -8 * u, -10 * u);
                    g.endFill();
                    g.beginFill(0xC89A4A, 1);
                    g.drawRect(-2 * u, 3 * u, 4 * u, 4 * u);
                    g.drawRect(-6 * u, 7 * u, 12 * u, 3 * u);
                    g.endFill();
                    break;
                case "bolt":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(GOLD, 1);
                    g.moveTo(3 * u, -11 * u);
                    g.lineTo(-7 * u, 2 * u);
                    g.lineTo(-1 * u, 2 * u);
                    g.lineTo(-4 * u, 11 * u);
                    g.lineTo(7 * u, -3 * u);
                    g.lineTo(1 * u, -3 * u);
                    g.lineTo(3 * u, -11 * u);
                    g.endFill();
                    break;
                case "catapult":
                    g.lineStyle(2 * u, 0x7A4A28, 1);
                    g.moveTo(-10 * u, 8 * u);
                    g.lineTo(10 * u, 8 * u);
                    g.moveTo(-4 * u, 8 * u);
                    g.lineTo(6 * u, -8 * u);
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(EMBER, 1);
                    g.drawCircle(7 * u, -9 * u, 3 * u);
                    g.endFill();
                    g.beginFill(0x5A3A20, 1);
                    g.drawCircle(-7 * u, 8 * u, 2.5 * u);
                    g.drawCircle(7 * u, 8 * u, 2.5 * u);
                    g.endFill();
                    break;
                case "bone":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.drawRect(-7 * u, -2 * u, 14 * u, 4 * u);
                    g.drawCircle(-8 * u, -3 * u, 3 * u);
                    g.drawCircle(-8 * u, 3 * u, 3 * u);
                    g.drawCircle(8 * u, -3 * u, 3 * u);
                    g.drawCircle(8 * u, 3 * u, 3 * u);
                    g.endFill();
                    break;
                case "coal":
                    g.lineStyle(1.5 * u, 0x5A5A5A, 1);
                    g.beginFill(0x2A2A2E, 1);
                    g.moveTo(-9 * u, 4 * u);
                    g.lineTo(-6 * u, -6 * u);
                    g.lineTo(2 * u, -9 * u);
                    g.lineTo(9 * u, -3 * u);
                    g.lineTo(8 * u, 6 * u);
                    g.lineTo(-1 * u, 9 * u);
                    g.lineTo(-9 * u, 4 * u);
                    g.endFill();
                    break;
                case "sulfur":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xE8D040, 1);
                    g.moveTo(0, -10 * u);
                    g.lineTo(9 * u, -2 * u);
                    g.lineTo(5 * u, 9 * u);
                    g.lineTo(-5 * u, 9 * u);
                    g.lineTo(-9 * u, -2 * u);
                    g.lineTo(0, -10 * u);
                    g.endFill();
                    break;
                case "magma":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xE0501C, 1);
                    g.moveTo(0, -11 * u);
                    g.curveTo(9 * u, 0, 7 * u, 5 * u);
                    g.curveTo(4 * u, 11 * u, 0, 11 * u);
                    g.curveTo(-4 * u, 11 * u, -7 * u, 5 * u);
                    g.curveTo(-9 * u, 0, 0, -11 * u);
                    g.endFill();
                    g.lineStyle(0, 0, 0);
                    g.beginFill(GOLD, 1);
                    g.drawCircle(-2 * u, 4 * u, 3 * u);
                    g.endFill();
                    break;
                case "scroll":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xE8D8B0, 1);
                    g.drawRect(-8 * u, -9 * u, 16 * u, 18 * u);
                    g.endFill();
                    g.beginFill(0xC8B088, 1);
                    g.drawRoundRect(-10 * u, -11 * u, 20 * u, 4 * u, 4 * u, 4 * u);
                    g.drawRoundRect(-10 * u, 7 * u, 20 * u, 4 * u, 4 * u, 4 * u);
                    g.endFill();
                    g.lineStyle(1 * u, 0x7A5A48, 1);
                    for (i = 0; i < 3; i++) {
                        g.moveTo(-5 * u, (-4 + i * 4) * u);
                        g.lineTo(5 * u, (-4 + i * 4) * u);
                    }
                    break;
                case "flask":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xB8E0E8, 0.6);
                    g.moveTo(-3 * u, -11 * u);
                    g.lineTo(3 * u, -11 * u);
                    g.lineTo(3 * u, -4 * u);
                    g.lineTo(10 * u, 9 * u);
                    g.lineTo(-10 * u, 9 * u);
                    g.lineTo(-3 * u, -4 * u);
                    g.lineTo(-3 * u, -11 * u);
                    g.endFill();
                    g.lineStyle(0, 0, 0);
                    g.beginFill(EMBER, 1);
                    g.moveTo(-6 * u, 3 * u);
                    g.lineTo(6 * u, 3 * u);
                    g.lineTo(9 * u, 8 * u);
                    g.lineTo(-9 * u, 8 * u);
                    g.endFill();
                    break;
                case "dice":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.drawRoundRect(-9 * u, -9 * u, 18 * u, 18 * u, 6 * u, 6 * u);
                    g.endFill();
                    g.lineStyle(0, 0, 0);
                    g.beginFill(0xC8401A, 1);
                    g.drawCircle(-4 * u, -4 * u, 1.8 * u);
                    g.drawCircle(0, 0, 1.8 * u);
                    g.drawCircle(4 * u, 4 * u, 1.8 * u);
                    g.endFill();
                    break;
                case "coin":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(GOLD, 1);
                    g.drawCircle(0, 0, 10 * u);
                    g.endFill();
                    g.lineStyle(1.5 * u, 0xC89A4A, 1);
                    g.drawCircle(0, 0, 6.5 * u);
                    break;
                case "lock":
                    g.lineStyle(2.5 * u, 0x9A8A80, 1);
                    g.moveTo(-5 * u, -2 * u);
                    g.lineTo(-5 * u, -6 * u);
                    g.curveTo(-5 * u, -11 * u, 0, -11 * u);
                    g.curveTo(5 * u, -11 * u, 5 * u, -6 * u);
                    g.lineTo(5 * u, -2 * u);
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0xC89A4A, 1);
                    g.drawRoundRect(-9 * u, -3 * u, 18 * u, 13 * u, 4 * u, 4 * u);
                    g.endFill();
                    g.beginFill(DARK, 1);
                    g.drawCircle(0, 3 * u, 2 * u);
                    g.endFill();
                    break;
                case "book":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x7A2A14, 1);
                    g.drawRect(-9 * u, -10 * u, 18 * u, 20 * u);
                    g.endFill();
                    g.beginFill(0xE8D8B0, 1);
                    g.drawRect(-6 * u, -10 * u, 15 * u, 3 * u);
                    g.endFill();
                    g.lineStyle(2 * u, GOLD, 1);
                    g.moveTo(-3 * u, -2 * u);
                    g.lineTo(5 * u, -2 * u);
                    g.moveTo(-3 * u, 2 * u);
                    g.lineTo(5 * u, 2 * u);
                    break;
                case "skull":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.drawCircle(0, -2 * u, 9 * u);
                    g.drawRect(-5 * u, 4 * u, 10 * u, 6 * u);
                    g.endFill();
                    g.lineStyle(0, 0, 0);
                    g.beginFill(DARK, 1);
                    g.drawCircle(-3.5 * u, -2 * u, 2.5 * u);
                    g.drawCircle(3.5 * u, -2 * u, 2.5 * u);
                    g.drawRect(-1 * u, 6 * u, 2 * u, 4 * u);
                    g.endFill();
                    break;
                case "shield":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x8A3A1A, 1);
                    g.moveTo(0, -11 * u);
                    g.lineTo(9 * u, -7 * u);
                    g.curveTo(9 * u, 7 * u, 0, 11 * u);
                    g.curveTo(-9 * u, 7 * u, -9 * u, -7 * u);
                    g.lineTo(0, -11 * u);
                    g.endFill();
                    g.lineStyle(2 * u, GOLD, 1);
                    g.moveTo(0, -7 * u);
                    g.lineTo(0, 7 * u);
                    g.moveTo(-5 * u, -2 * u);
                    g.lineTo(5 * u, -2 * u);
                    break;
                case "flag":
                case "banner":
                    g.lineStyle(2 * u, 0x5A3A20, 1);
                    g.moveTo(-7 * u, -11 * u);
                    g.lineTo(-7 * u, 11 * u);
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(icon == "banner" ? 0x3A6AB0 : 0xC8401A, 1);
                    if (icon == "banner") {
                        g.moveTo(-6 * u, -10 * u);
                        g.lineTo(9 * u, -10 * u);
                        g.lineTo(9 * u, 4 * u);
                        g.lineTo(1.5 * u, 0);
                        g.lineTo(-6 * u, 4 * u);
                        g.lineTo(-6 * u, -10 * u);
                    }
                    else {
                        g.moveTo(-6 * u, -10 * u);
                        g.lineTo(9 * u, -6 * u);
                        g.lineTo(-6 * u, -1 * u);
                        g.lineTo(-6 * u, -10 * u);
                    }
                    g.endFill();
                    break;
                case "eye":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(BONE, 1);
                    g.moveTo(-11 * u, 0);
                    g.curveTo(0, -11 * u, 11 * u, 0);
                    g.curveTo(0, 11 * u, -11 * u, 0);
                    g.endFill();
                    g.beginFill(EMBER, 1);
                    g.drawCircle(0, 0, 4.5 * u);
                    g.endFill();
                    g.beginFill(DARK, 1);
                    g.drawCircle(0, 0, 2 * u);
                    g.endFill();
                    break;
                case "outpost":
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(0x6A5A50, 1);
                    g.drawRect(-10 * u, -2 * u, 20 * u, 11 * u);
                    g.endFill();
                    g.beginFill(0x8A7A70, 1);
                    for (i = 0; i < 3; i++) {
                        g.drawRect((-10 + i * 7.5) * u, -6 * u, 5 * u, 4 * u);
                    }
                    g.endFill();
                    g.lineStyle(1.5 * u, 0x5A3A20, 1);
                    g.moveTo(0, -6 * u);
                    g.lineTo(0, -12 * u);
                    g.lineStyle(0, 0, 0);
                    g.beginFill(EMBER, 1);
                    g.moveTo(0, -12 * u);
                    g.lineTo(7 * u, -10 * u);
                    g.lineTo(0, -8 * u);
                    g.endFill();
                    break;
                default:
                    // a star (also "star")
                    g.lineStyle(1.5 * u, DARK, 1);
                    g.beginFill(GOLD, 1);
                    for (i = 0; i <= 10; i++) {
                        a = -Math.PI / 2 + i * Math.PI / 5;
                        var r:Number = (i % 2 == 0 ? 11 : 4.6) * u;
                        if (i == 0) {
                            g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                        }
                        else {
                            g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                        }
                    }
                    g.endFill();
                    break;
            }
        }

        /** A tick, for a collected quest's badge. */
        public static function tick(size:int):Shape {
            var s:Shape = new Shape();
            var u:Number = size / 24;
            s.graphics.lineStyle(0, 0, 0);
            s.graphics.beginFill(0x3A9A4A, 1);
            s.graphics.drawCircle(0, 0, 11 * u);
            s.graphics.endFill();
            s.graphics.lineStyle(3 * u, 0xFFFFFF, 1);
            s.graphics.moveTo(-5 * u, 0);
            s.graphics.lineTo(-1 * u, 5 * u);
            s.graphics.lineTo(6 * u, -5 * u);
            return s;
        }

        /** A small padlock, for a quest not open yet. */
        public static function padlock(size:int):Sprite {
            return glyph("lock", size);
        }
    }
}
