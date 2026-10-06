package {
    import flash.geom.Rectangle;
    import gs.easing.Quad;
    import gs.TweenLite;
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllianceConstants;
    import com.monsters.alliances.AllianceTabBase;
    import com.monsters.alliances.IoAllianceUi;
    import com.monsters.alliances.tabs.IoBoardTab;
    import com.monsters.alliances.tabs.IoMembersTab;
    import com.monsters.alliances.tabs.IoOutpostsTab;
    import com.monsters.alliances.tabs.IoOverviewTab;
    import com.monsters.alliances.tabs.BrowseTab;
    import com.monsters.alliances.tabs.InvitesTab;
    import com.monsters.alliances.tabs.MembersTab;
    import com.monsters.alliances.tabs.MyAllianceTab;
    import com.monsters.alliances.tabs.PowerUpsTab;
    import com.monsters.alliances.tabs.SuggestedTab;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;

    public class ALLIANCEPOPUP extends MovieClip {
        private static const W:int = 860;
        private static const H:int = 580;
        private static const CONTENT_X:int = 26;
        private static const CONTENT_Y:int = 63;
        // TAB_LABELS indices of the two tabs whose labels carry a count.
        private static const MEMBERS_TAB:int = 3;
        private static const INVITES_TAB:int = 5;

        private static const TAB_Y:int = 26;
        private static const TAB_H:int = 38;
        private static const TAB_GAP:int = 5;

        private var _tabs:Array;
        private var _contentMC:MovieClip;
        private var _innerBg:MovieClip;
        private var _activeTab:int = 0;

        /**
         * Inferno-only: the redesigned window (the user's design of 2 October). A strip above the tabs shows
         * the alliance (emblem, name, rank, level, members online, outposts, empire value); the tabs are
         * Overview, Board, Outposts, Members, Power-Ups, Recruit (the leader and officers), Invites and Browse
         * for a member, and Browse, Invites and Create for a player without an alliance. The alliance's chat
         * is the chat dock's Alliance tab only.
         */
        private var _io:Boolean = false;

        private var _h:int = H;

        private var _tabY:int = TAB_Y;

        private var _contentY:int = CONTENT_Y;

        private var _header:Sprite = null;

        private static const IO_HEADER_Y:int = 22;

        public function ALLIANCEPOPUP() {
            super();
            _io = GLOBAL.INFERNO_ONLY;
            if (_io) {
                _tabY = IO_HEADER_Y + AllianceConstants.IO_HEADER_H + 8;
                _contentY = _tabY + TAB_H - 1;
                _h = _contentY + AllianceConstants.CONTENT_H + 26;
            }
            _buildFrame();
            if (_io) {
                _header = addChild(new Sprite()) as Sprite;
                _header.x = CONTENT_X;
                _header.y = IO_HEADER_Y;
                _ioDrawHeader();
            }
            _buildTabs();
            _buildInnerBackground();
            _contentMC = addChild(new MovieClip()) as MovieClip;
            _contentMC.x = CONTENT_X;
            _contentMC.y = _contentY;
            if (_io) {
                // Inferno: the first tab opens once the window is on the stage. A tab's data can come back at
                // once from the store (the window opened a second time), before ALLIANCEWINDOW has added the
                // window, and a tab draws nothing off the stage: the first tab stayed empty.
                _ioFirstTab = _ioInAlliance() ? AllianceConstants.IO_TAB_OVERVIEW : 0;
                _activeTab = _ioFirstTab;
                addEventListener(Event.ADDED_TO_STAGE, _ioOnStage);
                return;
            }
            _switchTab(0);
        }

        private var _ioFirstTab:int = 0;

        private function _ioOnStage(e:Event):void {
            removeEventListener(Event.ADDED_TO_STAGE, _ioOnStage);
            _switchTab(_ioFirstTab);
        }

        /** Inferno: in an alliance (as far as the game knows yet). */
        private function _ioInAlliance():Boolean {
            return ALLIANCES._myAlliance != null || ALLIANCES._allianceID > 0 || ALLIANCES.ioData() != null;
        }

        private function _tabWidth(idx:int):int {
            return int((_io ? AllianceConstants.IO_TAB_WIDTHS : AllianceConstants.TAB_WIDTHS)[idx]);
        }

        /**
         * Inferno: the strip above the tabs. Drawn again whenever the alliance has loaded (RefreshTabLabels).
         */
        private function _ioDrawHeader():void {
            while (_header.numChildren > 0) {
                _header.removeChildAt(0);
            }
            const w:int = AllianceConstants.CONTENT_W;
            const h:int = AllianceConstants.IO_HEADER_H;
            _header.graphics.clear();
            IoAllianceUi.card(_header.graphics, 0, 0, w, h, AllianceConstants.INNER_BG, AllianceConstants.BORDER_COLOR);
            var data:Object = ALLIANCES.ioData();
            if (data == null) {
                var title:String = _ioInAlliance() ? KEYS.Get("msg_loading") : KEYS.Get("io_alliance_header_none");
                IoAllianceUi.addText(_header, title, 16, 8, 18, AllianceConstants.IO_INK, true, w - 32);
                if (!_ioInAlliance()) {
                    IoAllianceUi.addText(_header, KEYS.Get("io_alliance_header_none_desc"), 16, 36, 12, AllianceConstants.IO_MUTED, false, w - 32);
                }
                return;
            }
            var shield:Sprite = new Sprite();
            shield.x = 8;
            shield.y = 6;
            _header.addChild(shield);
            IoAllianceUi.emblem(shield, int(data.image), 52);
            IoAllianceUi.addText(_header, String(data.name), 70, 6, 18, AllianceConstants.IO_INK, true, 330);
            var role:String = ALLIANCES.ioRole();
            var line:String = KEYS.Get("io_alliance_header_line", {"v1": String(data.rank || "-"), "v2": String(data.avg_level), "v3": String(data.leader_name)});
            if (role) {
                line += "   " + KEYS.Get("io_alliance_header_role", {"v1": KEYS.Get("io_alliance_role_" + role)});
            }
            IoAllianceUi.addText(_header, line, 71, 36, 11, AllianceConstants.IO_MUTED, false, 330);
            var stats:Array = [
                    [KEYS.Get("io_alliance_stat_online"), int(data.online_members) + " / " + int(data.number_of_members)],
                    [KEYS.Get("io_alliance_stat_outposts"), IoAllianceUi.num(Number(data.outposts))],
                    [KEYS.Get("io_alliance_stat_empire"), IoAllianceUi.num(Number(data.empire))]
                ];
            const boxW:int = 124;
            const gap:int = 8;
            var x:int = w - 10 - stats.length * boxW - (stats.length - 1) * gap;
            for each (var st:Array in stats) {
                var box:Sprite = new Sprite();
                box.x = x;
                box.y = 9;
                IoAllianceUi.card(box.graphics, 0, 0, boxW, h - 18, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
                IoAllianceUi.addText(box, String(st[0]), 0, 3, 10, AllianceConstants.IO_MUTED, false, boxW, IoAllianceUi.CENTER);
                IoAllianceUi.addText(box, String(st[1]), 0, 20, 14, AllianceConstants.IO_INK, true, boxW, IoAllianceUi.CENTER);
                _header.addChild(box);
                x += boxW + gap;
            }
        }

        private function _buildFrame():void {
            var mcFrame:frame_CLIP = addChild(new frame_CLIP()) as frame_CLIP;
            mcFrame.graphics.beginFill(0, 0);
            mcFrame.graphics.drawRect(0, 0, W, _h);
            mcFrame.graphics.endFill();
            mcFrame.Setup();
        }

        private function _buildInnerBackground():void {
            _innerBg = addChild(new MovieClip()) as MovieClip;
            _innerBg.mouseEnabled = false;
            _innerBg.x = CONTENT_X;
            _innerBg.y = _contentY;
        }

        /**
         * Redraws the beige inner background at the given height. Called per tab
         * switch so each tab can size its own content area. The panel's top border
         * is split around the active tab so the active tab visually merges into the
         * content area (no line drawn beneath it), while inactive tabs keep the line.
         * @param {int} contentHeight - The active tab's desired background height.
         */
        private function _drawInnerBackground(contentHeight:int):void {
            const w:int = AllianceConstants.CONTENT_W;

            _innerBg.graphics.clear();

            _innerBg.graphics.lineStyle();
            _innerBg.graphics.beginFill(AllianceConstants.INNER_BG, 1);
            _innerBg.graphics.drawRect(0, 0, w, contentHeight);
            _innerBg.graphics.endFill();

            var gapStart:int = -1;
            var gapEnd:int = -1;
            var active:Object = _activeTabDescriptor();
            if (active != null) {
                gapStart = int(active.btn.x) - CONTENT_X;
                gapEnd = gapStart + _tabWidth(int(active.index));
            }

            _innerBg.graphics.lineStyle(1, AllianceConstants.BORDER_COLOR, 1);
            _innerBg.graphics.moveTo(0, 0);
            _innerBg.graphics.lineTo(0, contentHeight);
            _innerBg.graphics.lineTo(w, contentHeight);
            _innerBg.graphics.lineTo(w, 0);
            if (gapStart < 0) {
                _innerBg.graphics.moveTo(0, 0);
                _innerBg.graphics.lineTo(w, 0);
            }
            else {
                _innerBg.graphics.moveTo(0, 0);
                _innerBg.graphics.lineTo(gapStart, 0);
                _innerBg.graphics.moveTo(gapEnd, 0);
                _innerBg.graphics.lineTo(w, 0);
            }
        }

        /**
         * Tears down the current tab buttons and rebuilds them from the live
         * alliance state. The button row is otherwise built once at construction
         * from a snapshot of membership/leader state, so a membership change
         * (create / leave / promote) leaves newly un/locked tabs missing until the
         * popup is reopened. Called by SelectTab, which fires on exactly those
         * transitions.
         */
        private function _rebuildTabs():void {
            if (_tabs != null) {
                var i:int = 0;
                while (i < _tabs.length) {
                    var btn:MovieClip = _tabs[i].btn as MovieClip;
                    if (btn != null && contains(btn)) {
                        removeChild(btn);
                    }
                    i++;
                }
            }
            if (_header != null) {
                _ioDrawHeader();
            }
            _buildTabs();
            if (_innerBg != null) {
                addChild(_innerBg);
            }
            if (_contentMC != null) {
                addChild(_contentMC);
            }
        }

        private function _buildTabs():void {
            var currentX:int = CONTENT_X;
            _tabs = [];
            var visible:Array = _visibleTabIndices();
            var n:int = 0;
            while (n < visible.length) {
                var i:int = int(visible[n]);
                var btn:ButtonBrown_CLIP = addChild(new ButtonBrown_CLIP()) as ButtonBrown_CLIP;
                var tabLabel:String;
                if (_io) {
                    tabLabel = _ioTabLabel(i);
                }
                // Both counts read the stores warmed by ALLIANCEWINDOW.Show, so the
                // labels cost no request of their own and are as fresh as the last load.
                else if (i == MEMBERS_TAB)
                    tabLabel = KEYS.Get(String(AllianceConstants.TAB_LABELS[i]),
                            {"v1": String(ALLIANCES.OnlineCount()), "v2": String(ALLIANCES.MemberCount())});
                else if (i == INVITES_TAB)
                    tabLabel = KEYS.Get(String(AllianceConstants.TAB_LABELS[i]),
                            {"v1": String(ALLIANCES.PendingInviteCount())});
                else
                    tabLabel = KEYS.Get(String(AllianceConstants.TAB_LABELS[i]));
                btn.Setup(tabLabel, false, _tabWidth(i), TAB_H, "#ECBF88");
                btn.focusRect = false;
                btn.x = currentX;
                btn.y = _tabY;
                btn.addEventListener(MouseEvent.CLICK, _onTabClick(i));
                // Store the button alongside its original TAB_LABELS index so layout
                // position stays decoupled from the index used by _createTab and the
                // inner-background gap.
                _tabs.push({btn: btn, index: i});
                currentX += _tabWidth(i) + TAB_GAP;
                n++;
            }
        }

        /**
         * Indices into TAB_LABELS for the tabs that should be shown, in order.
         * Mirrors the original visibility rules (alliances.min.v343.js w()):
         * Power-Ups and Members require alliance membership; Suggested also
         * requires the player to be the alliance leader. Browse, My Alliance and
         * Invites are always shown.
         * @returns {Array} Visible tab indices.
         */
        private function _visibleTabIndices():Array {
            if (_io) {
                if (!_ioInAlliance()) {
                    return AllianceConstants.IO_TABS_NONE.concat();
                }
                var mine:Array = [];
                for each (var t:int in AllianceConstants.IO_TABS_MEMBER) {
                    if (t != AllianceConstants.IO_TAB_RECRUIT || ALLIANCES.ioIsStaff()) {
                        mine.push(t);
                    }
                }
                return mine;
            }
            var inAlliance:Boolean = (ALLIANCES._myAlliance != null);
            var isLeader:Boolean = ALLIANCES._isLeader;
            var out:Array = [];
            var i:int = 0;
            while (i < AllianceConstants.TAB_LABELS.length) {
                if (_isTabVisible(i, inAlliance, isLeader)) {
                    out.push(i);
                }
                i++;
            }
            return out;
        }

        /**
         * @param {int} idx - TAB_LABELS index
         * @param {Boolean} inAlliance - Whether the player is in an alliance
         * @param {Boolean} isLeader - Whether the player leads their alliance
         * @returns {Boolean} Whether the tab should be shown
         */
        private function _isTabVisible(idx:int, inAlliance:Boolean, isLeader:Boolean):Boolean {
            switch (idx) {
                case 2: // Power-Ups
                case 3: // Members
                    return inAlliance;
                case 4: // Suggested — leader only
                    return inAlliance && isLeader;
                default: // Browse, My Alliance, Invites
                    return true;
            }
        }

        /**
         * @returns {Object} The visible-tab descriptor ({btn, index}) for the
         * active tab, or null if none matches.
         */
        private function _activeTabDescriptor():Object {
            if (_tabs == null) {
                return null;
            }
            var i:int = 0;
            while (i < _tabs.length) {
                if (int(_tabs[i].index) == _activeTab) {
                    return _tabs[i];
                }
                i++;
            }
            return null;
        }

        private function _onTabClick(idx:int):Function {
            return function(e:MouseEvent):void {
                SOUNDS.Play("click1");
                _switchTab(idx);
            };
        }

        private function _switchTab(idx:int):void {
            var i:int = 0;
            while (i < _tabs.length) {
                _tabs[i].btn.Highlight = (int(_tabs[i].index) == idx);
                i++;
            }
            _activeTab = idx;
            while (_contentMC.numChildren > 0) {
                _contentMC.removeChildAt(0);
            }
            var tab:AllianceTabBase = _createTab(idx);
            _drawInnerBackground(tab.contentHeight);
            _contentMC.addChild(tab);
            tab.build();
        }

        /** Inferno: a tab's label (the Board, Members and Invites tabs carry a count). */
        private function _ioTabLabel(i:int):String {
            switch (i) {
                case AllianceConstants.IO_TAB_OVERVIEW:
                    return KEYS.Get(_ioInAlliance() ? "io_alliance_tab_overview" : "io_alliance_tab_create");
                case AllianceConstants.IO_TAB_BOARD:
                    var unread:int = ALLIANCES.ioUnreadPins();
                    return unread > 0 ? KEYS.Get("io_alliance_tab_board_n", {"v1": String(unread)}) : KEYS.Get("io_alliance_tab_board");
                case AllianceConstants.IO_TAB_MEMBERS:
                    return KEYS.Get("alliance_tab_members", {"v1": String(ALLIANCES.OnlineCount()), "v2": String(ALLIANCES.MemberCount())});
                case AllianceConstants.IO_TAB_INVITES:
                    return KEYS.Get("alliance_tab_invites", {"v1": String(ALLIANCES.PendingInviteCount())});
                default:
                    return KEYS.Get(String(AllianceConstants.IO_TAB_LABELS[i]));
            }
        }

        private function _createTab(idx:int):AllianceTabBase {
            if (_io) {
                switch (idx) {
                    case AllianceConstants.IO_TAB_OVERVIEW:
                        // (a player without an alliance: MyAllianceTab's Create prompt)
                        return _ioInAlliance() ? new IoOverviewTab() : new MyAllianceTab();
                    case AllianceConstants.IO_TAB_MEMBERS:
                        return new IoMembersTab();
                    case AllianceConstants.IO_TAB_BOARD:
                        return new IoBoardTab();
                    case AllianceConstants.IO_TAB_OUTPOSTS:
                        return new IoOutpostsTab();
                }
            }
            switch (idx) {
                case 0:
                    return new BrowseTab();
                case 1:
                    return new MyAllianceTab();
                case 2:
                    return new PowerUpsTab();
                case 3:
                    return new MembersTab();
                case 4:
                    return new SuggestedTab();
                case 5:
                    return new InvitesTab();
                default:
                    return new BrowseTab();
            }
        }

        /**
         * Switches to the given tab (TAB_LABELS index) and renders it. Used after
         * the player's alliance membership changes (e.g. jumping to My Alliance
         * once an alliance is created), so it first rebuilds the tab row to reflect
         * tabs that were just un/locked by that change.
         * @param {int} idx - TAB_LABELS index to switch to.
         */
        public function SelectTab(idx:int):void {
            _rebuildTabs();
            _switchTab(idx);
        }

        /**
         * Redraws the tab strip so labels pick up counts that arrived after the
         * popup was built. The stores are fetched when the window opens, which is
         * after the first draw, so without this the Members and Invites counts are
         * always one open behind.
         */
        public function RefreshTabLabels():void {
            _rebuildTabs();

            var i:int = 0;
            while (i < _tabs.length) {
                _tabs[i].btn.Highlight = (int(_tabs[i].index) == _activeTab);
                i++;
            }
        }

        public function Hide(param1:MouseEvent = null):void {
            ALLIANCEWINDOW.Hide();
        }

        /** Inferno-only: the scale it is shown at, under 1 on a screen narrower than the window (bug report B15). */
        private var _ioFit:Number = 1;

        public function Center():void {
            POPUPSETTINGS.AlignToUpperLeft(this);
            y += 70;
            if (GLOBAL.INFERNO_ONLY) {
                // Inferno-only: centred by its frame (W x _h). Its height counts the whole member list behind the
                // scroll mask, so on a short screen its top (and the close button) were above the screen. On a
                // screen narrower than the window (800 wide), it is shown smaller, so its close button is on it.
                // (by what it covers, which is wider than its frame W: the tabs, the close button)
                var sx:Number = scaleX;
                scaleX = scaleY = 1;
                var lb:Rectangle = getBounds(this);
                var left:Number = Math.min(0, lb.x);
                var wide:Number = Math.max(W, lb.x + lb.width) - left;
                _ioFit = Math.min(1, (GLOBAL._SCREEN.width - 16) / wide);
                scaleX = scaleY = sx;
                x = int(GLOBAL._SCREENCENTER.x - (left + wide * 0.5) * _ioFit);
                y = int(Math.max(GLOBAL._SCREEN.y + 16, GLOBAL._SCREENCENTER.y - _h * _ioFit * 0.5 - 20));
            }
        }

        public function ScaleUp():void {
            if (GLOBAL.INFERNO_ONLY && _ioFit < 1) {
                scaleX = scaleY = _ioFit * 0.9;
                TweenLite.to(this, 0.2, {"scaleX": _ioFit, "scaleY": _ioFit, "ease": Quad.easeOut});
                return;
            }
            POPUPSETTINGS.ScaleUp(this);
        }
    }
}
