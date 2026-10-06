package com.monsters.alliances.tabs {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllianceConstants;
    import com.monsters.alliances.IoAllianceUi;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFieldType;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: putting up a pin on the alliance board, or changing one (the Board tab's New pin and Edit,
     * and the map's Share bubble: "Pin to alliance board", which fills the place in). A title, the words, and
     * a place on the map if the pin points somewhere: x and y as the map shows them (the minus is optional).
     */
    public class IoPinEditorPopup {

        private static const W:int = 520;

        private static const H:int = 426;

        private static const PAD:int = 26;

        private static var _mc:MovieClip = null;

        public function IoPinEditorPopup() {
            super();
        }

        public static function get isOpen():Boolean {
            return _mc != null;
        }

        /**
         * `pin`: the pin to change ({ id, title, body, x, y, world_id }), or the place a new one points at
         * ({ x, y, world_id } with no id), or null. `onSaved()` once it is on the board.
         */
        public static function Show(pin:Object, onSaved:Function = null):void {
            Close(false);
            var editing:Boolean = pin != null && int(pin.id) > 0;
            var mc:MovieClip = new MovieClip();
            mc.name = "ioPinEditor";
            var frame:frame_CLIP = mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = W;
            frame.height = H;
            frame.x = -int(W / 2);
            frame.y = -int(H / 2);
            frame.Setup(true, function(e:MouseEvent = null):void {
                    Close(true);
                });
            var left:int = frame.x + PAD;
            var top:int = frame.y + 22;
            var innerW:int = W - PAD * 2;

            var title:TextField = new TextField();
            title.selectable = false;
            title.mouseEnabled = false;
            title.embedFonts = true;
            title.antiAliasType = AntiAliasType.NORMAL;
            title.width = innerW;
            title.height = 32;
            var tf:TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
            tf.align = TextFormatAlign.CENTER;
            title.defaultTextFormat = tf;
            title.text = KEYS.Get(editing ? "io_alliance_pin_edit_title" : "io_alliance_pin_new_title");
            title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            title.x = left;
            title.y = top;
            mc.addChild(title);

            var y:int = top + 44;
            // (the fields on the window's beige, as the alliance forms have them)
            var panel:Sprite = new Sprite();
            panel.graphics.lineStyle(1, AllianceConstants.BORDER_COLOR, 1);
            panel.graphics.beginFill(AllianceConstants.INNER_BG, 1);
            panel.graphics.drawRect(0, 0, innerW + 20, 284);
            panel.graphics.endFill();
            panel.x = left - 10;
            panel.y = y - 8;
            mc.addChild(panel);
            IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_field_title"), left, y, 12, AllianceConstants.IO_INK, true, innerW);
            var titleIn:TextField = field(mc, left, y + 20, innerW, 30, 80, false);
            titleIn.name = "ioPinTitle";
            y += 58;
            IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_field_body"), left, y, 12, AllianceConstants.IO_INK, true, innerW);
            var bodyIn:TextField = field(mc, left, y + 20, innerW, 118, 600, true);
            bodyIn.name = "ioPinBody";
            y += 146;
            IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_field_place"), left, y, 12, AllianceConstants.IO_INK, true, innerW);
            IoAllianceUi.addText(mc, "X", left, y + 26, 12, AllianceConstants.IO_INK, true, 16);
            var xIn:TextField = field(mc, left + 18, y + 20, 70, 30, 4, false);
            xIn.restrict = "0-9\\-";
            xIn.name = "ioPinX";
            IoAllianceUi.addText(mc, "Y", left + 104, y + 26, 12, AllianceConstants.IO_INK, true, 16);
            var yIn:TextField = field(mc, left + 122, y + 20, 70, 30, 4, false);
            yIn.restrict = "0-9\\-";
            yIn.name = "ioPinY";
            IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_place_hint"), left + 206, y + 20, 10, AllianceConstants.IO_MUTED, false, innerW - 206, "left", false, true);

            var world:String = "";
            if (pin) {
                titleIn.text = pin.title ? String(pin.title) : "";
                bodyIn.text = pin.body ? String(pin.body) : "";
                if (pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined) {
                    xIn.text = GLOBAL.ioCoord(int(pin.x));
                    yIn.text = GLOBAL.ioCoord(int(pin.y));
                    world = pin.world_id ? String(pin.world_id) : "";
                }
            }

            var save:MovieClip = null;
            var cancel:MovieClip = null;
            var busy:Boolean = false;
            save = IoAllianceUi.button(KEYS.Get(editing ? "io_alliance_pin_save" : "io_alliance_pin_post"), 150, 34, function(e:MouseEvent):void {
                    if (busy) {
                        return;
                    }
                    var t:String = trim(titleIn.text);
                    if (!t) {
                        GLOBAL.Message(KEYS.Get("io_alliance_pin_need_title"));
                        return;
                    }
                    var xs:String = trim(xIn.text).replace(/-/g, "");
                    var ys:String = trim(yIn.text).replace(/-/g, "");
                    if ((xs == "") != (ys == "")) {
                        GLOBAL.Message(KEYS.Get("io_alliance_pin_need_both"));
                        return;
                    }
                    var data:Object = {"title": t, "body": trim(bodyIn.text)};
                    if (editing) {
                        data.id = int(pin.id);
                    }
                    if (xs != "") {
                        data.x = int(xs);
                        data.y = int(ys);
                        // (a place typed in is on the player's world; one from the map keeps the map's)
                        if (world && int(xs) == int(pin.x) && int(ys) == int(pin.y)) {
                            data.world = world;
                        }
                    }
                    busy = true;
                    Object(save).setEnabled(false);
                    ALLIANCES.ioSavePin(data, function(response:Object):void {
                            busy = false;
                            if (_mc == mc) {
                                Object(save).setEnabled(true);
                            }
                            if (IoAllianceUi.failed(response)) {
                                return;
                            }
                            Close(false);
                            if (onSaved != null) {
                                onSaved();
                            }
                            else {
                                GLOBAL.Message(KEYS.Get("io_alliance_pin_done"));
                            }
                        });
                }, "gold", 12);
            save.name = "ioPinSave";
            cancel = IoAllianceUi.button(KEYS.Get("btn_cancel"), 120, 34, function(e:MouseEvent):void {
                    Close(true);
                }, "grey", 12);
            save.x = frame.x + W - PAD - 150;
            cancel.x = save.x - 132;
            save.y = cancel.y = frame.y + H - PAD - 34;
            mc.addChild(cancel);
            mc.addChild(save);

            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(mc);
            POPUPSETTINGS.AlignToCenter(mc);
            POPUPSETTINGS.ScaleUp(mc);
            _mc = mc;
            if (mc.stage) {
                mc.stage.focus = titleIn;
            }
        }

        public static function Close(sound:Boolean = true):void {
            if (_mc == null) {
                return;
            }
            if (sound) {
                SOUNDS.Play("close");
            }
            GLOBAL.BlockerRemove();
            if (_mc.parent) {
                _mc.parent.removeChild(_mc);
            }
            _mc = null;
        }

        private static function trim(s:String):String {
            return s ? s.replace(/^\s+|\s+$/g, "") : "";
        }

        /** A white box with a text field to type in. */
        private static function field(parent:MovieClip, x:int, y:int, w:int, h:int, maxChars:int, multiline:Boolean):TextField {
            var bg:Sprite = new Sprite();
            bg.graphics.lineStyle(1, 0x888888, 1);
            bg.graphics.beginFill(0xFFFFFF, 1);
            bg.graphics.drawRoundRect(0, 0, w, h, 4, 4);
            bg.graphics.endFill();
            bg.x = x;
            bg.y = y;
            parent.addChild(bg);
            var t:TextField = new TextField();
            t.type = TextFieldType.INPUT;
            t.selectable = true;
            t.maxChars = maxChars;
            t.defaultTextFormat = new TextFormat("Verdana", 13, 0x222222);
            t.x = x + 6;
            t.width = w - 12;
            if (multiline) {
                t.multiline = true;
                t.wordWrap = true;
                t.y = y + 5;
                t.height = h - 10;
            }
            else {
                t.y = y + int((h - 20) / 2);
                t.height = 20;
            }
            parent.addChild(t);
            // (clicking the box's edge still types in it)
            bg.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    if (t.stage) {
                        t.stage.focus = t;
                    }
                });
            return t;
        }
    }
}
