package com.monsters.pets {
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFieldType;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the Pets tab of the Buildings menu's Decorations (BUILDINGSPOPUP.SwitchB): a card for each
     * monster that can be a pet, ten to a page like the decorations: its picture, how many of it you have out in
     * the yard and in storage, Buy (for Shiny, after a yes; at most IoPets.perKind of one monster), Out / Store (bring
     * one out into the yard, at most IoPets.maxOut out at once, or put one away; one put away isn't refunded) and
     * Name (each of them can have a name, shown over it in the yard). Only in your own main yard.
     */
    public class IoPetsPanel {

        public static const PER_PAGE:int = 10;

        private static const CARD_W:int = 120;

        private static const CARD_H:int = 160;

        /** Fills the menu's thumbnail area with a page of pet cards; returns how many pages there are. */
        public static function fill(holder:MovieClip, page:int, refresh:Function):int {
            if (!IoPets.ownYard()) {
                var away:TextField = holder.addChild(label("Pets live in your main yard: buy them and bring them out there.", 13, 0x333333, true, 640, TextFormatAlign.CENTER)) as TextField;
                away.y = 140;
                return 1;
            }
            var list:Array = IoPets.monsters;
            var pages:int = Math.max(1, Math.ceil(list.length / PER_PAGE));
            page = Math.max(0, Math.min(pages - 1, page));
            var col:int = 0;
            var row:int = 0;
            for (var i:int = page * PER_PAGE; i < list.length && i < (page + 1) * PER_PAGE; i++) {
                var made:Sprite = holder.addChild(card(String(list[i]), refresh)) as Sprite;
                made.x = col * 130;
                made.y = row * 170;
                if (++col == 5) {
                    col = 0;
                    row++;
                }
            }
            return pages;
        }

        /** The player's pets of one monster: [ids out], [ids in storage]. */
        private static function mine(monster:String):Array {
            var out:Array = [];
            var stored:Array = [];
            for each (var p:Array in IoPets.pets) {
                if (String(p[1]) == monster) {
                    (int(p[2]) ? out : stored).push(int(p[0]));
                }
            }
            return [out, stored];
        }

        public static function monsterName(monster:String):String {
            var c:Object = CREATURELOCKER._creatures[monster];
            return c ? KEYS.Get(c.name) : monster;
        }

        private static function card(monster:String, refresh:Function):Sprite {
            var c:Sprite = new Sprite();
            c.name = "ioPetCard_" + monster;
            c.graphics.lineStyle(1, 0x000000, 1);
            c.graphics.beginFill(0xFFFFFF, 1);
            c.graphics.drawRect(0, 0, CARD_W, CARD_H);
            c.graphics.endFill();
            c.graphics.moveTo(0, 22);
            c.graphics.lineTo(CARD_W, 22);
            var title:TextField = c.addChild(label(monsterName(monster), 11, 0x000000, true, CARD_W, TextFormatAlign.CENTER)) as TextField;
            title.y = 3;
            GLOBAL.ioFitText(title, 8);

            var picture:Sprite = c.addChild(new Sprite()) as Sprite;
            picture.x = int((CARD_W - 86) / 2);
            picture.y = 26;
            ImageCache.GetImageWithCallBack("monsters/" + monster + "-medium.jpg", function(key:String, bmd:BitmapData):void {
                    if (bmd) {
                        picture.addChild(new Bitmap(bmd));
                    }
                });

            var have:Array = mine(monster);
            var out:Array = have[0];
            var stored:Array = have[1];
            var owned:Boolean = out.length + stored.length > 0;
            var status:TextField = c.addChild(label(owned ? "Out " + out.length + " · Stored " + stored.length : "A pet for your yard", 10, owned ? 0x2C4A0C : 0x666666, owned, CARD_W, TextFormatAlign.CENTER)) as TextField;
            status.y = 92;
            var full:Boolean = out.length + stored.length >= IoPets.perKind;

            var buy:Sprite = c.addChild(button(full ? "You have " + IoPets.perKind : "Buy · " + IoPets.price + " Shiny", CARD_W - 8, 20, function(e:MouseEvent):void {
                    if (full) {
                        return;
                    }
                    if (BASE._credits.Get() < IoPets.price) {
                        POPUPS.DisplayGetShiny();
                        return;
                    }
                    GLOBAL.Message("<b>Buy a " + monsterName(monster) + " pet</b> for " + IoPets.price + " Shiny?<br><br>It wanders your main yard, just for looks. " + IoPets.maxOut + " pets can be out at once; the others wait in storage. You can give it a name (Name).", "Buy", function():void {
                            IoPets.buy(monster, function(error:String):void {
                                    if (error) {
                                        GLOBAL.Message(error);
                                        return;
                                    }
                                    SOUNDS.Play("purchasepopup");
                                    var nowHave:Array = mine(monster);
                                    if (IoPets.outCount() >= IoPets.maxOut && nowHave[1].length > stored.length) {
                                        GLOBAL.Message("Your new " + monsterName(monster) + " is in storage: " + IoPets.maxOut + " pets are out in your yard already. Store one of them to bring it out.");
                                    }
                                    refresh();
                                });
                        }, null, "No", function():void {
                        });
                })) as Sprite;
            buy.x = 4;
            buy.y = 110;
            buy.name = "ioPetBuy";
            enable(buy, !full);

            var bringOut:Sprite = c.addChild(button("Out", 36, 20, function(e:MouseEvent):void {
                    if (!stored.length) {
                        return;
                    }
                    if (IoPets.outCount() >= IoPets.maxOut) {
                        GLOBAL.Message("Only " + IoPets.maxOut + " pets can be out in your yard at once: store one of them first.");
                        return;
                    }
                    IoPets.place(stored[0], true, done(refresh));
                })) as Sprite;
            bringOut.x = 4;
            bringOut.y = 134;
            bringOut.name = "ioPetOut";
            enable(bringOut, stored.length > 0);

            var putAway:Sprite = c.addChild(button("Store", 36, 20, function(e:MouseEvent):void {
                    if (!out.length) {
                        return;
                    }
                    GLOBAL.Message("Put your " + monsterName(monster) + " in storage?<br><br>It leaves the yard; bring it out again whenever you like. (No Shiny back.)", "Store", function():void {
                            IoPets.place(out[out.length - 1], false, done(refresh));
                        }, null, "No", function():void {
                        });
                })) as Sprite;
            putAway.x = 42;
            putAway.y = 134;
            putAway.name = "ioPetStore";
            enable(putAway, out.length > 0);

            var naming:Sprite = c.addChild(button("Name", 36, 20, function(e:MouseEvent):void {
                    if (owned) {
                        names(monster, refresh);
                    }
                })) as Sprite;
            naming.x = 80;
            naming.y = 134;
            naming.name = "ioPetName";
            enable(naming, owned);
            return c;
        }

        /** The open names window (one at a time). */
        private static var _names:Sprite = null;

        /**
         * The names of the player's pets of one monster: a box for each (empty: no name), Save (only the names that
         * changed go to the server, one after the other) and Close.
         */
        public static function names(monster:String, refresh:Function):void {
            closeNames();
            var list:Array = [];
            for each (var p:Array in IoPets.pets) {
                if (String(p[1]) == monster) {
                    list.push(p);
                }
            }
            if (!list.length) {
                return;
            }
            var W:int = 300;
            var rowH:int = 30;
            var Hh:int = 86 + list.length * rowH;
            var box:Sprite = new Sprite();
            box.name = "ioPetNames";
            box.graphics.lineStyle(2, 0x7A5530, 1);
            box.graphics.beginFill(0xF6E9CA, 1);
            box.graphics.drawRoundRect(-W / 2, -Hh / 2, W, Hh, 14, 14);
            box.graphics.endFill();
            var title:TextField = box.addChild(label("Name your " + monsterName(monster) + (list.length > 1 ? " pets" : " pet"), 13, 0x2B1A0C, true, W - 20, TextFormatAlign.CENTER)) as TextField;
            title.x = -W / 2 + 10;
            title.y = -Hh / 2 + 10;
            var fields:Array = [];
            for (var i:int = 0; i < list.length; i++) {
                var tag:TextField = box.addChild(label((i + 1) + (int(list[i][2]) ? " (out)" : " (stored)"), 11, 0x6B4A26, true, 80, TextFormatAlign.LEFT)) as TextField;
                tag.x = -W / 2 + 16;
                tag.y = -Hh / 2 + 44 + i * rowH;
                var f:TextField = new TextField();
                f.name = "ioPetNameField" + i;
                f.type = TextFieldType.INPUT;
                f.border = true;
                f.borderColor = 0x8A6A45;
                f.background = true;
                f.backgroundColor = 0xFFFFFF;
                f.width = 180;
                f.height = 22;
                f.maxChars = IoPets.nameLength;
                var format:TextFormat = new TextFormat("Verdana", 12, 0x000000, true);
                f.defaultTextFormat = format;
                f.text = list[i].length > 3 && list[i][3] ? String(list[i][3]) : "";
                f.x = -W / 2 + 100;
                f.y = -Hh / 2 + 40 + i * rowH;
                box.addChild(f);
                fields.push(f);
            }
            var save:Sprite = box.addChild(button("Save", 90, 24, function(e:MouseEvent):void {
                    var todo:Array = [];
                    for (var j:int = 0; j < list.length; j++) {
                        var wanted:String = TextField(fields[j]).text.replace(/^\s+|\s+$/g, "");
                        var had:String = list[j].length > 3 && list[j][3] ? String(list[j][3]) : "";
                        if (wanted != had) {
                            todo.push([int(list[j][0]), wanted]);
                        }
                    }
                    var next:Function = function():void {
                        if (!todo.length) {
                            closeNames();
                            refresh();
                            return;
                        }
                        var one:Array = todo.shift();
                        IoPets.name(int(one[0]), String(one[1]), function(error:String):void {
                                if (error) {
                                    GLOBAL.Message(error);
                                    refresh();
                                    return;
                                }
                                next();
                            });
                    };
                    next();
                })) as Sprite;
            save.name = "ioPetNamesSave";
            save.x = -100;
            save.y = Hh / 2 - 36;
            var close:Sprite = box.addChild(button("Close", 90, 24, function(e:MouseEvent):void {
                    closeNames();
                })) as Sprite;
            close.x = 10;
            close.y = Hh / 2 - 36;
            _names = box;
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(box);
            POPUPSETTINGS.AlignToCenter(box);
        }

        public static function closeNames():void {
            if (_names) {
                if (_names.parent) {
                    _names.parent.removeChild(_names);
                }
                GLOBAL.BlockerRemove();
                _names = null;
            }
        }

        private static function done(refresh:Function):Function {
            return function(error:String):void {
                if (error) {
                    GLOBAL.Message(error);
                    return;
                }
                SOUNDS.Play("click1");
                refresh();
            };
        }

        private static function enable(b:Sprite, on:Boolean):void {
            b.alpha = on ? 1 : 0.4;
            b.mouseEnabled = on;
            b.buttonMode = on;
        }

        private static function label(text:String, size:int, color:uint, bold:Boolean, width:int, align:String):TextField {
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

        /** A small button in the menu's colours (yellow, as its tabs). */
        private static function button(text:String, width:int, height:int, onClick:Function):Sprite {
            var b:Sprite = new Sprite();
            b.buttonMode = true;
            b.mouseChildren = false;
            var draw:Function = function(fill:uint):void {
                b.graphics.clear();
                b.graphics.lineStyle(1, 0x7A6A2A, 1);
                b.graphics.beginFill(fill, 1);
                b.graphics.drawRoundRect(0, 0, width, height, 6, 6);
                b.graphics.endFill();
            };
            draw(0xFFE94D);
            var t:TextField = b.addChild(label(text, 10, 0x222222, true, width, TextFormatAlign.CENTER)) as TextField;
            t.y = int((height - 17) / 2);
            b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    draw(0xFFF59A);
                });
            b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    draw(0xFFE94D);
                });
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    onClick(e);
                });
            return b;
        }
    }
}
