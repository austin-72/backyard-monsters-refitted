package com.monsters.alliances.tabs {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllianceConstants;
    import com.monsters.alliances.AllianceTabBase;
    import com.monsters.alliances.IoAllianceUi;
    import com.monsters.maproom_advanced.IoScrollPane;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFormat;

    /**
     * Inferno-only: the Board tab (the user's design of 2 October). The leader and officers pin messages,
     * each with a title, words and (if they like) a place on the map; Jump opens the map there when it is on
     * the player's own world. At most 50 pins, each kept 30 days; the leader and officers can change, remove
     * and reorder them. Opening the tab clears its count.
     */
    public class IoBoardTab extends AllianceTabBase {

        private static const PAD:int = 12;

        private static const LIST_Y:int = 54;

        private var _pane:IoScrollPane;

        private var _pins:Array;

        private var _canEdit:Boolean = false;

        private var _max:int = 50;

        private var _days:int = 30;

        private var _myWorld:String = "";

        private var _count:TextField;

        public function IoBoardTab() {
            super();
        }

        override public function build():void {
            var title:TextField = addChild(new TextField()) as TextField;
            title.selectable = false;
            title.mouseEnabled = false;
            title.embedFonts = true;
            title.antiAliasType = AntiAliasType.NORMAL;
            title.width = 300;
            title.height = 32;
            title.defaultTextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
            title.text = KEYS.Get("io_alliance_board_title");
            title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            title.x = PAD;
            title.y = 12;
            _count = IoAllianceUi.addText(this, "", PAD + 4, 0, 11, AllianceConstants.IO_MUTED, false, 400);
            _count.y = 20;
            _pane = new IoScrollPane(CONTENT_W - PAD * 2, CONTENT_H - LIST_Y - PAD);
            _pane.x = PAD;
            _pane.y = LIST_Y;
            addChild(_pane);
            load();
        }

        /** (also after a pin is put up, changed, moved or removed) */
        public function load():void {
            ALLIANCES.ioLoadPins(true, function(response:Object):void {
                    if (stage == null) {
                        return;
                    }
                    if (response == null || response.error) {
                        _pins = [];
                        _draw(response && response.error ? String(response.error) : KEYS.Get("alliance_err_generic"));
                        return;
                    }
                    _pins = response.pins as Array || [];
                    _canEdit = response.can_edit == true;
                    _max = int(response.max) || 50;
                    _days = int(response.days) || 30;
                    _myWorld = response.my_world ? String(response.my_world) : "";
                    _draw(null);
                    if (ALLIANCES.ioUnreadPins() > 0) {
                        ALLIANCES.ioClearUnreadPins();
                        ALLIANCEWINDOW.RefreshTabLabels();
                    }
                });
        }

        private function _draw(error:String):void {
            var c:Sprite = _pane.content;
            while (c.numChildren > 0) {
                c.removeChildAt(0);
            }
            c.graphics.clear();
            var old:Sprite = getChildByName("ioNewPin") as Sprite;
            if (old) {
                removeChild(old);
            }
            _count.x = PAD + 4 + 260;
            _count.text = KEYS.Get("io_alliance_board_count", {"v1": String(_pins.length), "v2": String(_max), "v3": String(_days)});
            if (_canEdit) {
                var add:Button_CLIP = new Button_CLIP();
                add.Setup(KEYS.Get("io_alliance_new_pin"), false, 170, 34);
                add.x = CONTENT_W - PAD - 170;
                add.y = 10;
                add.name = "ioNewPin";
                add.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                        SOUNDS.Play("click1");
                        if (_pins.length >= _max) {
                            GLOBAL.Message(KEYS.Get("io_alliance_board_full", {"v1": String(_max)}));
                            return;
                        }
                        IoPinEditorPopup.Show(null, load);
                    });
                addChild(add);
            }
            var w:int = _pane.innerWidth;
            if (error || _pins.length == 0) {
                var empty:Sprite = new Sprite();
                IoAllianceUi.card(empty.graphics, 0, 0, w, 90, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
                var msg:String = error ? error : KEYS.Get(_canEdit ? "io_alliance_no_pins_staff" : "io_alliance_no_pins");
                IoAllianceUi.addText(empty, msg, 16, 16, 13, AllianceConstants.IO_MUTED, false, w - 32, "left", false, true);
                c.addChild(empty);
                _pane.refresh(90);
                return;
            }
            var y:int = 0;
            for (var i:int = 0; i < _pins.length; i++) {
                var card:Sprite = _card(_pins[i], i, w);
                card.y = y;
                c.addChild(card);
                y += int(card.height) + 8;
            }
            _pane.refresh(y);
        }

        /** One pin: its title, who put it up and when, its words, its place with Jump, and the staff's buttons. */
        private function _card(pin:Object, index:int, w:int):Sprite {
            var c:Sprite = new Sprite();
            c.name = "ioPin" + int(pin.id);
            var hasPlace:Boolean = pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined;
            var controlsW:int = _canEdit ? 4 * 58 + 6 : 0;
            IoAllianceUi.addText(c, String(pin.title), 14, 10, 14, AllianceConstants.IO_INK, true, w - 28 - controlsW);
            var meta:String = KEYS.Get("io_alliance_pin_by", {"v1": String(pin.author), "v2": IoAllianceUi.ago(Number(pin.created))});
            if (Number(pin.updated) > Number(pin.created) + 30) {
                meta += "  ·  " + KEYS.Get("io_alliance_pin_edited", {"v1": IoAllianceUi.ago(Number(pin.updated))});
            }
            meta += "  ·  " + KEYS.Get("io_alliance_pin_expires", {"v1": IoAllianceUi.span(Math.max(0, int(pin.expires) - GLOBAL.Timestamp()))});
            IoAllianceUi.addText(c, meta, 14, 32, 10, AllianceConstants.IO_MUTED, false, w - 28 - controlsW);
            var y:int = 52;
            if (pin.body) {
                var body:TextField = IoAllianceUi.addText(c, String(pin.body), 14, y, 12, 0x333333, false, w - 28, "left", false, true);
                y += int(body.height) + 4;
            }
            if (hasPlace) {
                var px:int = int(pin.x);
                var py:int = int(pin.y);
                var world:String = pin.world_id ? String(pin.world_id) : "";
                var elsewhere:Boolean = world && _myWorld && world != _myWorld;
                var place:String = KEYS.Get("io_alliance_pin_place", {"v1": IoAllianceUi.coord(px, py)});
                if (pin.world_name) {
                    place += " (" + String(pin.world_name) + ")";
                }
                IoAllianceUi.addText(c, place, 14, y + 5, 12, AllianceConstants.IO_INK, true, w - 160);
                var jump:MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), 110, 26, function(e:MouseEvent):void {
                        IoAllianceUi.jump(px, py, world);
                    }, "gold");
                jump.x = w - 124;
                jump.y = y;
                jump.name = "ioJump";
                if (elsewhere) {
                    Object(jump).setEnabled(false);
                    IoAllianceUi.addText(c, KEYS.Get("io_alliance_other_world_short"), w - 290, y + 6, 10, AllianceConstants.IO_MUTED, false, 160, IoAllianceUi.RIGHT);
                }
                c.addChild(jump);
                y += 32;
            }
            var h:int = y + 8;
            c.graphics.clear();
            IoAllianceUi.card(c.graphics, 0, 0, w, h, index == 0 ? 0xFFF6DC : AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            if (_canEdit) {
                var bx:int = w - controlsW;
                var buttons:Array = [
                        ["io_alliance_up", "ioUp", function(e:MouseEvent):void {
                            _move(pin, "up");
                        }, index > 0],
                        ["io_alliance_down", "ioDown", function(e:MouseEvent):void {
                            _move(pin, "down");
                        }, index < _pins.length - 1],
                        ["io_alliance_edit", "ioEdit", function(e:MouseEvent):void {
                            IoPinEditorPopup.Show(pin, load);
                        }, true],
                        ["io_alliance_remove", "ioRemove", function(e:MouseEvent):void {
                            _remove(pin);
                        }, true]
                    ];
                for each (var b:Array in buttons) {
                    var btn:MovieClip = IoAllianceUi.button(KEYS.Get(String(b[0])), 54, 22, b[2] as Function, "grey", 10);
                    btn.x = bx;
                    btn.y = 9;
                    btn.name = String(b[1]);
                    if (!b[3]) {
                        Object(btn).setEnabled(false);
                    }
                    c.addChild(btn);
                    bx += 58;
                }
            }
            return c;
        }

        private function _move(pin:Object, dir:String):void {
            ALLIANCES.ioMovePin(int(pin.id), dir, function(response:Object):void {
                    if (!IoAllianceUi.failed(response) && stage != null) {
                        load();
                    }
                });
        }

        private function _remove(pin:Object):void {
            GLOBAL.Message(KEYS.Get("io_alliance_remove_confirm", {"v1": String(pin.title)}), KEYS.Get("btn_yes"), function():void {
                    ALLIANCES.ioDeletePin(int(pin.id), function(response:Object):void {
                            if (!IoAllianceUi.failed(response) && stage != null) {
                                load();
                            }
                        });
                }, null, KEYS.Get("btn_no"), null, null);
        }
    }
}
