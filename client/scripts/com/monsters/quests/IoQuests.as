package com.monsters.quests {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
    import com.monsters.chat.BYMChat;
    import com.monsters.chat.Chat;
    import com.monsters.leaderboards.IoLeaderboards;
    import com.monsters.maproom_advanced.IoGauntlet;
    import com.monsters.maproom_advanced.IoOutpostsPopup;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;
    import flash.utils.getTimer;
    import flash.utils.setTimeout;
    import com.monsters.maproom_advanced.MapRoomCell;

    /**
     * Inferno-only: the quest book's data (the user's design of 2 October). The server keeps every count and
     * pays every reward (server/src/services/quests/); this keeps the book as it last said, reports what only
     * the game sees (a hatch, a win, a wart picked: event/once/best, sent together every few seconds), and
     * collects. IoQuestBook draws the book, IoQuestTracker the dock's rows, IoQuestArt the pictures.
     *
     * A quest from the server: {id, cat, parent, tmpl, vars, icon, go, target, value, state, reward, optional,
     * staff}; state is "locked", "progress", "ready" or "claimed". Text: KEYS "io_qt_<tmpl>" (its name) and
     * "io_qd_<tmpl>" (what to do), #v1#... from vars ("#key#" vars are language keys themselves).
     */
    public class IoQuests {

        /** The book is asked for again after this long (seconds), when something shows it. */
        private static const STATUS_GAP:int = 120;

        /** Reports are gathered this long (ms) and sent together. */
        private static const FLUSH_MS:int = 2500;

        /** The most one report may add (the server's CLIENT_EVENTS): more is sent as several. */
        private static const CHUNK:Object = {"hatch": 100, "hatch_housing": 3000, "juice": 100, "juice_housing": 3000, "wart_pick": 3};

        private static const MOLOCH_FIRST:int = 51;

        private static const MOLOCH_LAST:int = 60;

        public static var book:Object = null;

        /** Goes up each time the book changes (the tracker and the window redraw on it). */
        public static var version:int = 0;

        private static var _byId:Object = {};

        private static var _fetchedAt:int = 0;

        /** When the book shown was sent (the daily quests' countdown counts from it). */
        public static function get fetchedAt():int {
            return _fetchedAt;
        }

        private static var _loading:Boolean = false;

        private static var _pending:Object = {};

        private static var _pendingBest:Object = {};

        private static var _flushQueued:Boolean = false;

        private static var _sentOnce:Object = {};

        private static var _best:Object = {};

        private static var _toasts:Array = [];

        private static var _toast:Sprite = null;

        private static var _toastUntil:int = 0;

        private static var _claiming:Boolean = false;

        public function IoQuests() {
            super();
        }

        public static function get on():Boolean {
            return GLOBAL.INFERNO_ONLY;
        }

        public static function get ready():int {
            return book ? int(book.ready) : 0;
        }

        public static function quest(id:String):Object {
            return _byId[id];
        }

        // ---- the book from the server

        /** Asks for the book if it is older than STATUS_GAP (or now, `force`). */
        public static function refresh(force:Boolean = false):void {
            if (!on || _loading || !LOGIN.token) {
                return;
            }
            var now:int = GLOBAL.Timestamp();
            if (!force && book && now - _fetchedAt < STATUS_GAP) {
                return;
            }
            if (!force && !book && _fetchedAt > 0 && now - _fetchedAt < 30) {
                return; // (it failed a moment ago)
            }
            _loading = true;
            _fetchedAt = now;
            new URLLoaderApi().load(GLOBAL.serverUrl + "quests/status", [["v", 1]], function(r:Object):void {
                    _loading = false;
                    if (r && !r.error && r.quests) {
                        update(r);
                    }
                }, function(e:IOErrorEvent):void {
                    _loading = false;
                });
        }

        /** The book as the server said it is now; newly ready quests are told about (the toast). */
        public static function update(r:Object):void {
            var before:Object = book ? _byId : null;
            book = r;
            _byId = {};
            _fetchedAt = GLOBAL.Timestamp();
            var fresh:Array = [];
            for each (var q:Object in r.quests) {
                _byId[q.id] = q;
                if (before && q.state == "ready" && (!before[q.id] || before[q.id].state != "ready")) {
                    fresh.push(q);
                }
            }
            if (r.daily && r.daily.quests) {
                for each (var d:Object in r.daily.quests) {
                    var did:String = "daily:" + d.id;
                    _byId[did] = d;
                    if (before && d.state == "ready" && (!before[did] || before[did].state != "ready")) {
                        fresh.push(d);
                    }
                }
            }
            if (fresh.length == 1) {
                _toasts.push([title(fresh[0]), String(fresh[0].id)]);
            }
            else if (fresh.length > 1) {
                _toasts.push([KEYS.Get("io_quest_toast_many", {"v1": fresh.length}), ""]);
            }
            version++;
            tick();
        }

        // ---- what the game saw

        /** Something only the game sees (a kind the server's CLIENT_EVENTS knows), `n` of it. */
        public static function event(type:String, n:int = 1):void {
            if (!on || n <= 0 || GLOBAL.ioDesignMode()) {
                return;
            }
            _pending[type] = int(_pending[type] || 0) + n;
            queueFlush();
        }

        /** Once each time the game is started (the quests that count it need it once). */
        public static function once(type:String):void {
            if (!on || _sentOnce[type]) {
                return;
            }
            _sentOnce[type] = true;
            event(type, 1);
        }

        /** A best so far (the biggest bank, the outposts' hourly total): sent when it is bigger. */
        public static function best(type:String, value:Number):void {
            if (!on || !(value > 0) || value <= Number(_best[type] || 0)) {
                return;
            }
            _best[type] = value;
            _pendingBest[type] = Math.floor(value);
            queueFlush();
        }

        /** A monster hatched (the incubators and the Incubator Control Center). */
        public static function hatched(id:String):void {
            // (only the player's own yard: another's hatcheries catch up when it is looked at or attacked)
            if (!on || !id || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            event("hatch", 1);
            event("hatch_housing", Math.max(1, int(CREATURES.GetProperty(id, "cStorage"))));
            if (id == "IC9" || id == "IC10" || id == "IC24") {
                event("hatch_" + id, 1);
            }
        }

        /** A monster went into the juicer. */
        public static function juiced(id:String):void {
            if (!on || !id || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            event("juice", 1);
            event("juice_housing", Math.max(1, int(CREATURES.GetProperty(id, "cStorage"))));
        }

        /**
         * An attack ended (ATTACK.EndB). Won: a win, and which tribe (or Moloch, by his level) or a player it
         * was on. Moloch's Gauntlet and the admin's test attacks don't count.
         */
        public static function attackEnded(won:Boolean):void {
            if (!on || !won || IoGauntlet.inAttack() || GLOBAL.ioTestMode()) {
                return;
            }
            var wmattack:Boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK;
            var attack:Boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IATTACK;
            if (!wmattack && !attack) {
                return;
            }
            event("attack_win", 1);
            if (attack) {
                event("attack_player", 1);
                return;
            }
            var wm:int = int(BASE._wmID);
            if (wm >= MOLOCH_FIRST && wm <= MOLOCH_LAST) {
                var level:int = currentCellLevel();
                if (level >= 46) {
                    event("win_M46", 1);
                }
                if (level >= 50) {
                    event("win_M50", 1);
                }
                return;
            }
            var tribe:String = tribeOf(wm);
            if (tribe) {
                event("win_" + tribe, 1);
            }
        }

        /** The four tribes by the yard's wild monster id (TRIBES): L, K, A, D. */
        public static function tribeOf(wm:int):String {
            if (wm >= 1 && wm <= 10 || wm == 41 || wm == 42) {
                return "L";
            }
            if (wm >= 11 && wm <= 20 || wm == 43 || wm == 44) {
                return "K";
            }
            if (wm >= 21 && wm <= 30 || wm == 45 || wm == 46) {
                return "A";
            }
            if (wm >= 31 && wm <= 40 || wm == 47 || wm == 48 || wm >= 101 && wm <= 110) {
                return "D";
            }
            return "";
        }

        private static function currentCellLevel():int {
            try {
                var cell:MapRoomCell = GLOBAL._currentCell as MapRoomCell;
                return cell ? cell.ioLevel : 0;
            }
            catch (e:Error) {
            }
            return 0;
        }

        private static function queueFlush():void {
            if (_flushQueued) {
                return;
            }
            _flushQueued = true;
            setTimeout(flush, FLUSH_MS);
        }

        private static function flush():void {
            _flushQueued = false;
            var list:Array = [];
            var type:String;
            for (type in _pending) {
                var left:int = int(_pending[type]);
                var chunk:int = CHUNK[type] ? int(CHUNK[type]) : 1;
                while (left > 0 && list.length < 20) {
                    var n:int = Math.min(left, chunk);
                    list.push({"e": type, "n": n});
                    left -= n;
                }
            }
            for (type in _pendingBest) {
                if (list.length < 20) {
                    list.push({"e": type, "n": _pendingBest[type]});
                }
            }
            _pending = {};
            _pendingBest = {};
            if (!list.length || !LOGIN.token) {
                return;
            }
            new URLLoaderApi().load(GLOBAL.serverUrl + "quests/event", [["events", JSON.stringify(list)]], function(r:Object):void {
                    if (r && !r.error && r.book && r.book.quests) {
                        update(r.book);
                    }
                }, function(e:IOErrorEvent):void {
                });
        }

        // ---- collecting

        public static function get claiming():Boolean {
            return _claiming;
        }

        /**
         * Collects quests ("id,id", "daily:<id>", "daily:bonus") or everything ready ("all"). The server pays
         * the main yard; the yard shown here gets the same at once. onDone(reward or null, message).
         */
        public static function claim(ids:String, onDone:Function = null):void {
            if (!on || _claiming) {
                return;
            }
            _claiming = true;
            new URLLoaderApi().load(GLOBAL.serverUrl + "quests/claim", [["ids", ids]], function(r:Object):void {
                    _claiming = false;
                    if (!r || r.error) {
                        if (onDone != null) {
                            onDone(null, r && r.error ? String(r.error) : KEYS.Get("io_quest_err"));
                        }
                        return;
                    }
                    pay(r);
                    if (r.book && r.book.quests) {
                        update(r.book);
                    }
                    if (onDone != null) {
                        onDone(r.reward, "");
                    }
                }, function(e:IOErrorEvent):void {
                    _claiming = false;
                    if (onDone != null) {
                        onDone(null, KEYS.Get("io_quest_err"));
                    }
                });
        }

        /**
         * What the server paid, on the yard shown here: the Shiny as the server has it now, and the resources
         * added to what is shown and to what was last saved together (so the next save's change stays the
         * same). Away from the main yard only the Shiny: the main yard has the rest when it loads.
         */
        private static function pay(r:Object):void {
            if (r.credits != null && !CASINO.holdsCredits()) {
                CASINO.setCredits(int(r.credits));
            }
            var reward:Object = r.reward;
            if (!reward || !BASE.isMainYardOrInfernoMainYard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            for (var i:int = 1; i <= 4; i++) {
                var add:Number = Number(reward["r" + i] || 0);
                if (add <= 0) {
                    continue;
                }
                if (BASE._resources && BASE._resources["r" + i]) {
                    BASE._resources["r" + i].Add(add);
                    if (BASE._hpResources) {
                        BASE._hpResources["r" + i] = Number(BASE._hpResources["r" + i] || 0) + add;
                    }
                }
                if (GLOBAL._resources && GLOBAL._resources["r" + i]) {
                    GLOBAL._resources["r" + i].Add(add);
                    if (GLOBAL._hpResources) {
                        GLOBAL._hpResources["r" + i] = Number(GLOBAL._hpResources["r" + i] || 0) + add;
                    }
                }
            }
            try {
                UI2.Update();
            }
            catch (e:Error) {
            }
        }

        // ---- text

        /** A quest's (or daily quest's) name. */
        public static function title(q:Object):String {
            return say("io_qt_", q);
        }

        /** What to do for it. */
        public static function describe(q:Object):String {
            return say("io_qd_", q);
        }

        private static function say(prefix:String, q:Object):String {
            var v:Object = {};
            var vars:Array = q.vars as Array || [];
            for (var i:int = 0; i < vars.length; i++) {
                var s:String = String(vars[i]);
                if (s.length > 2 && s.charAt(0) == "#" && s.charAt(s.length - 1) == "#") {
                    s = KEYS.Get(s);
                }
                v["v" + (i + 1)] = s;
            }
            var go:String = String(q.go || "");
            if ((q.tmpl == "build" || q.tmpl == "level") && go.indexOf("build:") == 0) {
                var name:String = buildingName(int(go.substr(6)));
                if (name) {
                    v.v1 = name;
                }
            }
            return KEYS.Get(prefix + q.tmpl, v);
        }

        /** A building's name as the yard calls it (an Inferno yard's own names). */
        public static function buildingName(type:int):String {
            try {
                var props:Object = GLOBAL._buildingProps[type - 1];
                if (props && props.name) {
                    var name:String = KEYS.Get(String(props.name));
                    if (name && name.charAt(0) != "#") {
                        return name;
                    }
                }
            }
            catch (e:Error) {
            }
            return null;
        }

        /** "500K bone, coal and sulfur, 250K magma, 10 shiny" */
        public static function rewardText(r:Object):String {
            if (!r) {
                return "";
            }
            var parts:Array = [];
            var r1:Number = Number(r.r1 || 0);
            var r2:Number = Number(r.r2 || 0);
            var r3:Number = Number(r.r3 || 0);
            var r4:Number = Number(r.r4 || 0);
            if (r1 > 0 && r1 == r2 && r2 == r3) {
                parts.push(KEYS.Get("io_quest_r_bcs", {"v1": short(r1)}));
            }
            else {
                if (r1 > 0) {
                    parts.push(KEYS.Get("io_quest_r_1", {"v1": short(r1)}));
                }
                if (r2 > 0) {
                    parts.push(KEYS.Get("io_quest_r_2", {"v1": short(r2)}));
                }
                if (r3 > 0) {
                    parts.push(KEYS.Get("io_quest_r_3", {"v1": short(r3)}));
                }
            }
            if (r4 > 0) {
                parts.push(KEYS.Get("io_quest_r_4", {"v1": short(r4)}));
            }
            if (int(r.shiny) > 0) {
                parts.push(KEYS.Get("io_quest_r_shiny", {"v1": int(r.shiny)}));
            }
            return parts.join(", ");
        }

        /** 1.5M, 250K, 900 */
        public static function short(n:Number):String {
            if (n >= 1000000) {
                var m:Number = Math.round(n / 100000) / 10;
                return m + "M";
            }
            if (n >= 10000) {
                return Math.round(n / 1000) + "K";
            }
            return GLOBAL.FormatNumber(n);
        }

        // ---- "Go there"

        /** Takes the player to where a quest is done (the book is closed first). */
        public static function go(target:String, q:Object = null):void {
            if (!target) {
                return;
            }
            var parts:Array = target.split(":");
            var what:String = parts[0];
            var arg:String = parts.length > 1 ? String(parts[1]) : "";
            try {
                switch (what) {
                    case "build":
                        goBuilding(int(arg), q && q.tmpl == "level");
                        break;
                    case "map":
                        // (the map opens from a Map Room: without one, the build menu at it)
                        if (BASE.isMainYardOrInfernoMainYard && !GLOBAL._bMap) {
                            goBuilding(11, false);
                        }
                        else {
                            GLOBAL.ShowMap();
                        }
                        break;
                    case "chat":
                        openChat(arg == "alliance" ? BYMChat.IO_ALLIANCE : BYMChat.IO_GLOBAL);
                        break;
                    case "leaderboards":
                        IoLeaderboards.Show();
                        break;
                    case "daily":
                        BASE.ioOpenDaily();
                        break;
                    case "gauntlet":
                        IoGauntlet.Show();
                        break;
                    case "pit":
                        CasinoWindow.Show();
                        break;
                    case "outposts":
                        IoOutpostsPopup.Show();
                        break;
                    case "invite":
                        UI_TOP.ioShowInvite();
                        break;
                    case "alliances":
                        ALLIANCEWINDOW.Show();
                        if (arg != "" && ALLIANCEWINDOW._mc) {
                            var tab:int = int(arg);
                            setTimeout(function():void {
                                    if (ALLIANCEWINDOW._open && ALLIANCEWINDOW._mc) {
                                        ALLIANCEWINDOW._mc.SelectTab(tab);
                                    }
                                }, 50);
                        }
                        break;
                }
            }
            catch (e:Error) {
                LOGGER.Log("log", "IoQuests.go " + target + ": " + e.message);
            }
        }

        /** The building, if the yard has it (its upgrade, for a level quest); otherwise the build menu at it. */
        private static function goBuilding(type:int, upgrade:Boolean):void {
            var found:BFOUNDATION = null;
            for each (var b:BFOUNDATION in BASE._buildingsAll) {
                if (b && b._type == type && (!found || b._lvl.Get() > found._lvl.Get())) {
                    found = b;
                }
            }
            if (found) {
                if (found._mc) {
                    MAP.FocusTo(found._mc.x, found._mc.y, 0.5);
                }
                if (upgrade) {
                    BUILDINGOPTIONS.Show(found, "upgrade");
                }
                else {
                    BASE.BuildingSelect(found);
                }
                return;
            }
            try {
                var props:Object = GLOBAL._buildingProps[type - 1];
                if (props && props.group) {
                    BUILDINGS._menuA = int(props.group);
                    BUILDINGS._menuB = props.subgroup != null ? int(props.subgroup) : 1;
                    BUILDINGS._page = 0;
                }
            }
            catch (e:Error) {
            }
            BUILDINGS._buildingID = type;
            BUILDINGS.Show();
        }

        private static function openChat(mode:String):void {
            if (!Chat._bymChat || !Chat._bymChat.chatBox) {
                return;
            }
            Chat._bymChat.chatBox.ioOpen();
            Chat._bymChat.ioSwitch(mode);
        }

        // ---- the toast: a quest is ready (no sound: the user's book isn't a slot machine)

        /** Shows the next toast when the yard is being built in (called by the dock as it updates). */
        public static function tick():void {
            if (!on) {
                return;
            }
            if (_toast && getTimer() > _toastUntil) {
                hideToast();
            }
            if (_toast || !_toasts.length || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !GLOBAL._layerTop) {
                return;
            }
            var next:Array = _toasts.shift();
            if (_toasts.length > 3) {
                _toasts = _toasts.slice(_toasts.length - 3);
            }
            showToast(String(next[0]), String(next[1]));
        }

        private static function showToast(text:String, id:String):void {
            var w:int = 300;
            var t:Sprite = new Sprite();
            t.name = "ioQuestToast";
            t.buttonMode = true;
            t.mouseChildren = false;
            var bg:Sprite = t.addChild(CasinoUI.panel(w, 50, 0.95)) as Sprite;
            bg.filters = [new GlowFilter(0xFFB040, 0.8, 12, 12, 2, 2)];
            var icon:Sprite = t.addChild(IoQuestArt.glyph("star", 30)) as Sprite;
            icon.x = 26;
            icon.y = 25;
            var head:TextField = t.addChild(CasinoUI.label(KEYS.Get("io_quest_toast_head"), 11, CasinoUI.EMBER, true, w - 60, TextFormatAlign.LEFT)) as TextField;
            head.x = 48;
            head.y = 6;
            var line:TextField = t.addChild(CasinoUI.label(text, 13, CasinoUI.GOLD, true, w - 60, TextFormatAlign.LEFT)) as TextField;
            line.x = 48;
            line.y = 22;
            t.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    hideToast();
                    IoQuestBook.Show(null, id);
                });
            GLOBAL.RefreshScreen();
            t.x = int(GLOBAL._SCREEN.x + (GLOBAL._SCREEN.width - w) / 2);
            t.y = int(GLOBAL._SCREEN.y + 86);
            t.alpha = 0;
            var fade:Function = function(e:Event):void {
                if (_toast != t) {
                    t.removeEventListener(Event.ENTER_FRAME, fade);
                    return;
                }
                if (getTimer() < _toastUntil - 400) {
                    t.alpha = Math.min(1, t.alpha + 0.12);
                }
                else {
                    t.alpha = Math.max(0, t.alpha - 0.08);
                }
                if (getTimer() > _toastUntil) {
                    t.removeEventListener(Event.ENTER_FRAME, fade);
                    hideToast();
                }
            };
            t.addEventListener(Event.ENTER_FRAME, fade);
            GLOBAL._layerTop.addChild(t);
            _toast = t;
            _toastUntil = getTimer() + 4500;
        }

        private static function hideToast():void {
            if (_toast) {
                if (_toast.parent) {
                    _toast.parent.removeChild(_toast);
                }
                _toast = null;
            }
        }
    }
}
