package com.monsters.alliances.tabs {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllianceConstants;
    import com.monsters.alliances.AllianceTabBase;
    import com.monsters.alliances.IoAllianceUi;
    import com.monsters.chat.BYMChat;
    import com.monsters.leaderboards.IoLeaderboards;
    import com.monsters.maproom_advanced.IoScrollPane;
    import flash.display.DisplayObject;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;

    /**
     * Inferno-only: the Members tab (the user's design of 2 October). Each member's role, level, outposts,
     * empire value and whether they are online (or when they were last seen), sorted by any column (click
     * its heading; again for the other way). Actions: send them a message, jump to their yard, and for the
     * leader and officers kick; the leader also names officers and hands over the lead. An officer can't
     * kick the leader or another officer.
     */
    public class IoMembersTab extends AllianceTabBase {

        private static const PAD:int = 12;

        private static const HEAD_Y:int = 12;

        private static const HEAD_H:int = 26;

        private static const ROW_H:int = 34;

        // role, name, level, outposts, empire, status, actions
        private static const COLS:Array = [[0, 84], [84, 196], [280, 58], [338, 80], [418, 130], [548, 116], [664, 108]];

        private static const SORTS:Array = ["role", "name", "level", "outposts", "empire", "status", ""];

        private static var _sort:String = "role";

        private static var _desc:Boolean = false;

        private var _members:Array = [];

        private var _pane:IoScrollPane;

        private var _head:Sprite;

        private var _popup:MemberActionPopup;

        public function IoMembersTab() {
            super();
        }

        override public function build():void {
            _head = new Sprite();
            _head.x = PAD;
            _head.y = HEAD_Y;
            addChild(_head);
            _pane = new IoScrollPane(CONTENT_W - PAD * 2, CONTENT_H - HEAD_Y - HEAD_H - PAD);
            _pane.x = PAD;
            _pane.y = HEAD_Y + HEAD_H;
            addChild(_pane);
            addEventListener(Event.REMOVED_FROM_STAGE, function(e:Event):void {
                    _dismiss();
                });
            _drawHead();
            _load();
        }

        private function _load():void {
            ALLIANCES.LoadMembers(function(rows:Array):void {
                    if (stage == null) {
                        return;
                    }
                    _members = rows || [];
                    _drawRows();
                });
        }

        // ---- the headings (click to sort)

        private function _drawHead():void {
            while (_head.numChildren > 0) {
                _head.removeChildAt(0);
            }
            var w:int = CONTENT_W - PAD * 2 - IoScrollPane.BAR_W - 2;
            _head.graphics.clear();
            _head.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
            _head.graphics.beginFill(AllianceConstants.HEADER_BG, 1);
            _head.graphics.drawRect(0, 0, w, HEAD_H);
            _head.graphics.endFill();
            var labels:Array = ["io_alliance_col_role", "alliance_col_name", "alliance_col_level", "io_alliance_col_outposts", "io_alliance_col_empire", "alliance_col_status", "alliance_col_actions"];
            for (var i:int = 0; i < labels.length; i++) {
                var cell:Sprite = new Sprite();
                cell.x = int(COLS[i][0]);
                var key:String = String(SORTS[i]);
                cell.graphics.beginFill(0, 0);
                cell.graphics.drawRect(0, 0, int(COLS[i][1]), HEAD_H);
                cell.graphics.endFill();
                // (smaller when it doesn't fit: "Avant-postes" was cut off)
                GLOBAL.ioFitText(IoAllianceUi.addText(cell, KEYS.Get(String(labels[i])), 6, 4, 11, 0x000000, true, int(COLS[i][1]) - 22));
                if (key) {
                    cell.buttonMode = true;
                    cell.mouseChildren = false;
                    cell.name = "ioSort_" + key;
                    cell.addEventListener(MouseEvent.CLICK, _sorter(key));
                    if (key == _sort) {
                        // a small triangle: which way it is sorted
                        var ax:int = int(COLS[i][1]) - 13;
                        cell.graphics.beginFill(0x3A2A1A, 1);
                        if (_desc) {
                            cell.graphics.moveTo(ax, 10);
                            cell.graphics.lineTo(ax + 8, 10);
                            cell.graphics.lineTo(ax + 4, 16);
                        }
                        else {
                            cell.graphics.moveTo(ax, 16);
                            cell.graphics.lineTo(ax + 8, 16);
                            cell.graphics.lineTo(ax + 4, 10);
                        }
                        cell.graphics.endFill();
                    }
                }
                if (i > 0) {
                    _head.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 0.5);
                    _head.graphics.moveTo(int(COLS[i][0]), 0);
                    _head.graphics.lineTo(int(COLS[i][0]), HEAD_H);
                }
                _head.addChild(cell);
            }
        }

        private function _sorter(key:String):Function {
            return function(e:MouseEvent):void {
                SOUNDS.Play("click1");
                if (_sort == key) {
                    _desc = !_desc;
                }
                else {
                    _sort = key;
                    // (numbers biggest first; names and roles from the top)
                    _desc = key == "level" || key == "outposts" || key == "empire" || key == "status";
                }
                _drawHead();
                _drawRows();
            };
        }

        private static function roleRank(m:Object):int {
            var r:String = String(m.role || (m.is_leader ? "leader" : "member"));
            return r == "leader" ? 0 : (r == "officer" ? 1 : 2);
        }

        private static function seen(m:Object):Number {
            return (m.status && m.status.online) ? 1e12 : Number(m.last_seen || 0);
        }

        private function _sorted():Array {
            var list:Array = _members.concat();
            var key:String = _sort;
            var dir:int = _desc ? -1 : 1;
            list.sort(function(a:Object, b:Object):int {
                    var d:Number = 0;
                    switch (key) {
                        case "role":
                            d = roleRank(a) - roleRank(b);
                            break;
                        case "name":
                            d = String(a.display_name).toLowerCase() < String(b.display_name).toLowerCase() ? -1 : (String(a.display_name).toLowerCase() > String(b.display_name).toLowerCase() ? 1 : 0);
                            break;
                        case "level":
                            d = Number(a.level) - Number(b.level);
                            break;
                        case "outposts":
                            d = Number(a.outposts) - Number(b.outposts);
                            break;
                        case "empire":
                            d = Number(a.empire) - Number(b.empire);
                            break;
                        case "status":
                            d = seen(a) - seen(b);
                            break;
                    }
                    if (d == 0 && key != "empire") {
                        // ties: the bigger empire first
                        return Number(b.empire) - Number(a.empire) > 0 ? 1 : (Number(b.empire) - Number(a.empire) < 0 ? -1 : 0);
                    }
                    return d * dir > 0 ? 1 : (d * dir < 0 ? -1 : 0);
                });
            return list;
        }

        // ---- the rows

        private function _drawRows():void {
            _dismiss();
            var c:Sprite = _pane.content;
            while (c.numChildren > 0) {
                c.removeChildAt(0);
            }
            var w:int = _pane.innerWidth;
            var list:Array = _sorted();
            for (var i:int = 0; i < list.length; i++) {
                c.addChild(_row(list[i], i, w));
            }
            _pane.refresh(list.length * ROW_H);
        }

        private function _row(m:Object, i:int, w:int):Sprite {
            var r:Sprite = new Sprite();
            r.y = i * ROW_H;
            r.name = "ioMember" + int(m.user_id);
            var self:Boolean = int(m.user_id) == LOGIN._playerID;
            r.graphics.beginFill(self ? AllianceConstants.ROW_ME : (i % 2 == 0 ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1), 1);
            r.graphics.drawRect(0, 0, w, ROW_H);
            r.graphics.endFill();
            r.graphics.lineStyle(1, 0xD8C3A6, 1);
            r.graphics.moveTo(0, ROW_H - 0.5);
            r.graphics.lineTo(w, ROW_H - 0.5);
            var ty:int = int((ROW_H - 18) / 2);
            var role:String = String(m.role || (m.is_leader ? "leader" : "member"));
            var roleColor:uint = role == "leader" ? 0x8A5A00 : (role == "officer" ? 0x24406E : AllianceConstants.IO_MUTED);
            IoAllianceUi.addText(r, KEYS.Get("io_alliance_role_" + role), int(COLS[0][0]) + 6, ty, 11, roleColor, role != "member", int(COLS[0][1]) - 8);
            IoAllianceUi.addText(r, String(m.display_name), int(COLS[1][0]) + 6, ty, 12, AllianceConstants.IO_INK, true, int(COLS[1][1]) - 8);
            IoAllianceUi.addText(r, String(int(m.level)), int(COLS[2][0]), ty, 12, AllianceConstants.IO_INK, false, int(COLS[2][1]), IoAllianceUi.CENTER);
            IoAllianceUi.addText(r, String(int(m.outposts)), int(COLS[3][0]), ty, 12, AllianceConstants.IO_INK, false, int(COLS[3][1]), IoAllianceUi.CENTER);
            IoAllianceUi.addText(r, IoAllianceUi.num(Number(m.empire)), int(COLS[4][0]), ty, 12, AllianceConstants.IO_INK, false, int(COLS[4][1]) - 10, IoAllianceUi.RIGHT);
            var online:Boolean = m.status && m.status.online == true;
            var dot:Sprite = new Sprite();
            dot.graphics.lineStyle(1, online ? 0x1E6E14 : 0x8A8A8A, 1);
            dot.graphics.beginFill(online ? 0x3FD12A : 0xC8C8C8, 1);
            dot.graphics.drawCircle(0, 0, 5);
            dot.graphics.endFill();
            dot.x = int(COLS[5][0]) + 12;
            dot.y = int(ROW_H / 2);
            r.addChild(dot);
            var status:String = online ? KEYS.Get("io_alliance_online") : (Number(m.last_seen) > 0 ? IoAllianceUi.ago(Number(m.last_seen)) : "-");
            IoAllianceUi.addText(r, status, int(COLS[5][0]) + 22, ty, 11, online ? AllianceConstants.IO_GAINED : AllianceConstants.IO_MUTED, online, int(COLS[5][1]) - 24);
            if (!self) {
                var act:Button_CLIP = new Button_CLIP();
                act.Setup(KEYS.Get("alliance_col_actions"), false, 96, ROW_H - 6);
                act._txt.htmlText = "<b><font color=\"#000000\">" + KEYS.Get("alliance_col_actions") + "</font></b>";
                act.x = int(COLS[6][0]) + int((int(COLS[6][1]) - 96) / 2);
                act.y = 3;
                act.name = "ioActions";
                act.addEventListener(MouseEvent.CLICK, _actionsHandler(m));
                r.addChild(act);
            }
            return r;
        }

        // ---- actions

        private function _actionsFor(m:Object):Array {
            var actions:Array = [{labelKey: "io_alliance_act_message", handler: _onMessage}, {labelKey: "io_alliance_act_jump", handler: _onJump}];
            var targetRole:String = String(m.role || (m.is_leader ? "leader" : "member"));
            if (ALLIANCES._isLeader && targetRole != "leader") {
                actions.push({labelKey: targetRole == "officer" ? "io_alliance_act_unofficer" : "io_alliance_act_officer", handler: _onOfficer});
            }
            if (ALLIANCES.ioIsStaff() && targetRole != "leader" && (ALLIANCES._isLeader || targetRole == "member")) {
                actions.push({labelKey: "alliance_btn_kick", handler: _onKick});
            }
            if (ALLIANCES._isLeader && targetRole != "leader") {
                actions.push({labelKey: "io_alliance_act_leader", handler: _onPromote});
            }
            return actions;
        }

        private function _actionsHandler(m:Object):Function {
            return function(e:MouseEvent):void {
                SOUNDS.Play("click1");
                _dismiss();
                var actions:Array = _actionsFor(m);
                var b:DisplayObject = e.currentTarget as DisplayObject;
                var at:Point = globalToLocal(b.localToGlobal(new Point(0, 0)));
                var h:int = MemberActionPopup.heightFor(actions.length);
                _popup = new MemberActionPopup(m, _dismiss, actions);
                _popup.name = "ioMemberActions";
                _popup.x = int(at.x) - MemberActionPopup.POPUP_W - 6;
                _popup.y = Math.max(4, Math.min(CONTENT_H - h - 4, int(at.y) - 4));
                addChild(_popup);
                if (stage) {
                    stage.addEventListener(MouseEvent.MOUSE_DOWN, _onStageDown);
                }
            };
        }

        private function _onStageDown(e:MouseEvent):void {
            if (_popup && e.target is DisplayObject && _popup.contains(DisplayObject(e.target))) {
                return;
            }
            _dismiss();
        }

        private function _dismiss():void {
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_DOWN, _onStageDown);
            }
            if (_popup && _popup.parent) {
                _popup.parent.removeChild(_popup);
            }
            _popup = null;
        }

        private function _onMessage(m:Object):void {
            BYMChat.ioMessagePlayer(String(m.user_id), String(m.display_name));
        }

        private function _onJump(m:Object):void {
            ALLIANCEWINDOW.Hide();
            IoLeaderboards.JumpToPlayer(int(m.user_id), String(m.display_name));
        }

        private function _onOfficer(m:Object):void {
            var on:Boolean = String(m.role) != "officer";
            ALLIANCES.ioSetOfficer(int(m.user_id), on, function(response:Object):void {
                    if (IoAllianceUi.failed(response)) {
                        return;
                    }
                    GLOBAL.Message(KEYS.Get(on ? "io_alliance_officer_done" : "io_alliance_unofficer_done", {"v1": String(m.display_name)}));
                    if (stage != null) {
                        _load();
                    }
                });
        }

        private function _onKick(m:Object):void {
            GLOBAL.Message(KEYS.Get("alliance_kick_confirm", {"name": String(m.display_name)}), KEYS.Get("alliance_btn_kick_user"), function():void {
                    var allianceName:String = ALLIANCES.AllianceName();
                    ALLIANCES.KickMember(int(m.user_id), function(response:Object):void {
                            _done(response, "alliance_kick_response", String(m.display_name), allianceName);
                        });
                }, null);
        }

        private function _onPromote(m:Object):void {
            GLOBAL.Message(KEYS.Get("alliance_promote_confirm", {"name": String(m.display_name)}), KEYS.Get("alliance_btn_promote_user"), function():void {
                    var allianceName:String = ALLIANCES.AllianceName();
                    ALLIANCES.PromoteMember(int(m.user_id), function(response:Object):void {
                            _done(response, "alliance_promote_response", String(m.display_name), allianceName);
                        });
                }, null);
        }

        private function _done(response:Object, key:String, name:String, allianceName:String):void {
            if (IoAllianceUi.failed(response)) {
                return;
            }
            GLOBAL.Message(KEYS.Get(key, {"name": name, "alliance": allianceName}));
            if (stage != null) {
                _load();
            }
            ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
        }
    }
}
