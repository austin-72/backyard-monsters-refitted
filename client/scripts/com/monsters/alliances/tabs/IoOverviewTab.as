package com.monsters.alliances.tabs {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllianceConstants;
    import com.monsters.alliances.AllianceTabBase;
    import com.monsters.alliances.IoAllianceUi;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.events.TimerEvent;
    import flash.text.TextField;
    import flash.utils.Timer;

    /**
     * Inferno-only: the Overview tab (the user's design of 2 October). The alliance's description with Edit
     * (the leader) and Leave; the two newest pins on the board; the outposts gained and lost this week; the
     * power-ups running, with the time they have left.
     */
    public class IoOverviewTab extends AllianceTabBase {

        private static const PAD:int = 12;

        private static const LEFT_W:int = 372;

        private static const RIGHT_X:int = PAD + LEFT_W + 14;

        private static const RIGHT_W:int = AllianceConstants.CONTENT_W - RIGHT_X - PAD;

        private static const BTN_H:int = 36;

        private var _data:Object;

        private var _powerBox:Sprite;

        private var _powerups:Array;

        private var _clock:Timer;

        public function IoOverviewTab() {
            super();
        }

        override public function build():void {
            addEventListener(Event.REMOVED_FROM_STAGE, _onRemoved);
            ALLIANCES.LoadMyAlliance(_onData);
        }

        private function _onData(data:Object):void {
            if (stage == null) {
                return;
            }
            while (numChildren > 0) {
                removeChildAt(0);
            }
            _data = data;
            if (data == null) {
                IoAllianceUi.addText(this, KEYS.Get("alliance_err_generic"), PAD, PAD, 13, AllianceConstants.IO_INK, false, CONTENT_W - PAD * 2);
                return;
            }
            _buildAbout();
            _buildPins();
            _buildWeek();
            _buildPowerups();
        }

        // ---- the left: the description, Edit and Leave

        private function _buildAbout():void {
            IoAllianceUi.band(this, PAD, PAD, LEFT_W, KEYS.Get("io_alliance_about"));
            const top:int = PAD + 32;
            const bottom:int = CONTENT_H - PAD - BTN_H - 14;
            var box:Sprite = new Sprite();
            box.x = PAD;
            box.y = top;
            box.graphics.lineStyle(1, 0x333333, 1);
            box.graphics.beginFill(0xFFFFFF, 1);
            box.graphics.drawRoundRect(0, 0, LEFT_W, bottom - top, 8, 8);
            box.graphics.endFill();
            addChild(box);
            var desc:String = _data.description ? String(_data.description) : "";
            var t:TextField = IoAllianceUi.addText(box, desc ? desc : KEYS.Get("io_alliance_no_desc"), 10, 8, 13, desc ? 0x333333 : AllianceConstants.IO_MUTED, false, LEFT_W - 20, "left", false, true);
            t.height = bottom - top - 16;

            const gap:int = 16;
            const btnW:int = int((LEFT_W - gap) / 2);
            if (ALLIANCES._isLeader) {
                var edit:Button_CLIP = addChild(new Button_CLIP()) as Button_CLIP;
                edit.Setup(KEYS.Get("alliance_btn_edit"), false, btnW, BTN_H);
                edit.x = PAD;
                edit.y = CONTENT_H - PAD - BTN_H;
                edit.addEventListener(MouseEvent.CLICK, _onEdit);
            }
            var leave:Button_CLIP = addChild(new Button_CLIP()) as Button_CLIP;
            leave.Setup(KEYS.Get("alliance_btn_leave"), false, btnW, BTN_H);
            leave.x = ALLIANCES._isLeader ? PAD + btnW + gap : PAD;
            leave.y = CONTENT_H - PAD - BTN_H;
            leave.name = "ioLeave";
            leave.addEventListener(MouseEvent.CLICK, _onLeave);
        }

        // ---- the right: the newest pins, this week's outposts, the power-ups

        private function _sectionLink(y:int, label:String, tab:int):void {
            var l:Sprite = IoAllianceUi.link(label, 11, function():void {
                    if (ALLIANCEWINDOW._mc != null) {
                        ALLIANCEWINDOW._mc.SelectTab(tab);
                    }
                });
            l.x = RIGHT_X + RIGHT_W - l.width - 8;
            l.y = y + 3;
            l.name = "ioLink" + tab;
            addChild(l);
        }

        private function _buildPins():void {
            const y0:int = PAD;
            IoAllianceUi.band(this, RIGHT_X, y0, RIGHT_W, KEYS.Get("io_alliance_latest_pins"));
            _sectionLink(y0, KEYS.Get("io_alliance_open_board"), AllianceConstants.IO_TAB_BOARD);
            var pins:Array = _data.pins_top as Array || [];
            var y:int = y0 + 32;
            const cardH:int = 76;
            if (pins.length == 0) {
                var empty:Sprite = new Sprite();
                IoAllianceUi.card(empty.graphics, 0, 0, RIGHT_W, cardH * 2 + 6, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
                IoAllianceUi.addText(empty, KEYS.Get(ALLIANCES.ioIsStaff() ? "io_alliance_no_pins_staff" : "io_alliance_no_pins"), 12, 12, 12, AllianceConstants.IO_MUTED, false, RIGHT_W - 24, "left", false, true);
                empty.x = RIGHT_X;
                empty.y = y;
                addChild(empty);
                return;
            }
            for (var i:int = 0; i < 2; i++) {
                if (i < pins.length) {
                    addChild(_pinCard(pins[i], RIGHT_X, y + i * (cardH + 6), RIGHT_W, cardH));
                }
            }
        }

        /** A short pin: title, two lines of it, who and when, and Jump when it has a place. */
        private function _pinCard(pin:Object, x:int, y:int, w:int, h:int):Sprite {
            var c:Sprite = new Sprite();
            c.x = x;
            c.y = y;
            IoAllianceUi.card(c.graphics, 0, 0, w, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            var hasPlace:Boolean = pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined;
            var textW:int = w - 20 - (hasPlace ? 96 : 0);
            IoAllianceUi.addText(c, String(pin.title), 10, 6, 12, AllianceConstants.IO_INK, true, textW);
            var body:TextField = IoAllianceUi.addText(c, String(pin.body || ""), 10, 24, 11, 0x333333, false, textW, "left", false, true);
            body.height = 30;
            IoAllianceUi.addText(c, KEYS.Get("io_alliance_pin_by", {"v1": String(pin.author), "v2": IoAllianceUi.ago(Number(pin.created))}), 10, h - 20, 10, AllianceConstants.IO_MUTED, false, textW);
            if (hasPlace) {
                var px:int = int(pin.x);
                var py:int = int(pin.y);
                var world:String = pin.world_id ? String(pin.world_id) : "";
                IoAllianceUi.addText(c, IoAllianceUi.coord(px, py), w - 96, 10, 11, AllianceConstants.IO_INK, true, 86, IoAllianceUi.CENTER);
                var jump:MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), 76, 24, function(e:MouseEvent):void {
                        IoAllianceUi.jump(px, py, world);
                    }, "gold");
                jump.x = w - 86;
                jump.y = 32;
                jump.name = "ioPinJump";
                c.addChild(jump);
            }
            return c;
        }

        private function _buildWeek():void {
            const y0:int = PAD + 32 + 76 * 2 + 6 + 14;
            IoAllianceUi.band(this, RIGHT_X, y0, RIGHT_W, KEYS.Get("io_alliance_week"));
            _sectionLink(y0, KEYS.Get("io_alliance_see_history"), AllianceConstants.IO_TAB_OUTPOSTS);
            var week:Object = _data.week || {"gained": 0, "lost": 0, "net": 0};
            var figures:Array = [
                    [KEYS.Get("io_alliance_gained"), "+" + int(week.gained), AllianceConstants.IO_GAINED],
                    [KEYS.Get("io_alliance_lost"), (int(week.lost) > 0 ? "-" : "") + int(week.lost), AllianceConstants.IO_LOST],
                    [KEYS.Get("io_alliance_net"), IoAllianceUi.signed(int(week.net)), int(week.net) > 0 ? AllianceConstants.IO_GAINED : (int(week.net) < 0 ? AllianceConstants.IO_LOST : AllianceConstants.IO_INK)]
                ];
            const gap:int = 8;
            const boxW:int = int((RIGHT_W - gap * 2) / 3);
            for (var i:int = 0; i < figures.length; i++) {
                var b:Sprite = new Sprite();
                b.x = RIGHT_X + i * (boxW + gap);
                b.y = y0 + 32;
                IoAllianceUi.card(b.graphics, 0, 0, boxW, 50, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
                IoAllianceUi.addText(b, String(figures[i][0]), 0, 4, 10, AllianceConstants.IO_MUTED, false, boxW, IoAllianceUi.CENTER);
                IoAllianceUi.addText(b, String(figures[i][1]), 0, 20, 17, uint(figures[i][2]), true, boxW, IoAllianceUi.CENTER);
                addChild(b);
            }
        }

        private function _buildPowerups():void {
            const y0:int = PAD + 32 + 76 * 2 + 6 + 14 + 32 + 50 + 14;
            IoAllianceUi.band(this, RIGHT_X, y0, RIGHT_W, KEYS.Get("io_alliance_powerups_running"));
            _sectionLink(y0, KEYS.Get("alliance_tab_powerups"), AllianceConstants.IO_TAB_POWERUPS);
            _powerBox = new Sprite();
            _powerBox.x = RIGHT_X;
            _powerBox.y = y0 + 32;
            addChild(_powerBox);
            IoAllianceUi.addText(_powerBox, KEYS.Get("msg_loading"), 10, 4, 11, AllianceConstants.IO_MUTED, false, RIGHT_W - 20);
            ALLIANCES.LoadPowerups(function(rows:Array):void {
                    if (stage == null) {
                        return;
                    }
                    _powerups = rows || [];
                    _drawPowerups();
                    if (_clock == null) {
                        _clock = new Timer(1000);
                        _clock.addEventListener(TimerEvent.TIMER, function(e:TimerEvent):void {
                                _drawPowerups();
                            });
                        _clock.start();
                    }
                });
        }

        /** The power-ups running, each with the time it has left (every second). */
        private function _drawPowerups():void {
            if (_powerBox == null || stage == null) {
                return;
            }
            while (_powerBox.numChildren > 0) {
                _powerBox.removeChildAt(0);
            }
            var running:Array = [];
            for each (var p:Object in _powerups) {
                var left:int = int(p.endTime) - GLOBAL.Timestamp();
                if (p.active && left > 0) {
                    running.push([KEYS.Get(String(p.type) + "_name"), left]);
                }
            }
            var h:int = Math.max(30, running.length * 22 + 10);
            _powerBox.graphics.clear();
            IoAllianceUi.card(_powerBox.graphics, 0, 0, RIGHT_W, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            if (running.length == 0) {
                IoAllianceUi.addText(_powerBox, KEYS.Get("io_alliance_powerups_none"), 10, 6, 11, AllianceConstants.IO_MUTED, false, RIGHT_W - 20);
                return;
            }
            for (var i:int = 0; i < running.length; i++) {
                IoAllianceUi.addText(_powerBox, String(running[i][0]), 10, 5 + i * 22, 12, AllianceConstants.IO_INK, true, RIGHT_W - 150);
                IoAllianceUi.addText(_powerBox, KEYS.Get("io_alliance_left", {"v1": GLOBAL.ToTime(int(running[i][1]), true, true, true, false)}), RIGHT_W - 150, 5 + i * 22, 12, AllianceConstants.IO_GAINED, true, 140, IoAllianceUi.RIGHT);
            }
        }

        private function _onRemoved(e:Event):void {
            removeEventListener(Event.REMOVED_FROM_STAGE, _onRemoved);
            if (_clock != null) {
                _clock.stop();
                _clock = null;
            }
        }

        // ---- Edit and Leave (as the stock My Alliance tab has them)

        private function _onEdit(e:MouseEvent):void {
            SOUNDS.Play("click1");
            if (_data == null) {
                return;
            }
            new AllianceFormPopup().Show(AllianceFormPopup.MODE_EDIT, String(_data.name), int(_data.image), String(_data.description));
        }

        private function _onLeave(e:MouseEvent):void {
            SOUNDS.Play("click1");
            if (_data == null) {
                return;
            }
            var members:int = int(_data.number_of_members);
            if (ALLIANCES._isLeader && members > 1) {
                GLOBAL.Message(KEYS.Get("alliance_err_leader_cannot_leave", {"alliance": String(_data.name)}));
                return;
            }
            var confirmKey:String = (ALLIANCES._isLeader && members <= 1) ? "alliance_disband_confirm" : "alliance_leave_confirm";
            GLOBAL.Message(KEYS.Get(confirmKey, {"alliance": String(_data.name)}), KEYS.Get("btn_yes"), _confirmLeave, null, KEYS.Get("btn_no"), null, null);
        }

        private function _confirmLeave():void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "leavealliance", [["confirm", "1"]], _onLeaveComplete, function(e:IOErrorEvent):void {
                    GLOBAL.Message(KEYS.Get("alliance_err_generic"));
                });
        }

        private function _onLeaveComplete(response:Object):void {
            if (response && response.error) {
                GLOBAL.Message(String(response.error));
                return;
            }
            ALLIANCES.Clear();
            ALLIANCES._allianceID = 0;
            ALLIANCES.InvalidateMyAlliance();
            if (ALLIANCEWINDOW._mc != null) {
                ALLIANCEWINDOW._mc.SelectTab(AllianceConstants.IO_TAB_OVERVIEW);
            }
        }
    }
}
