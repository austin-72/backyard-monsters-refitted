package com.monsters.maproom_advanced {
    import com.monsters.replays.IoReplays;
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.tabs.IoPinEditorPopup;
    import com.monsters.chat.BYMChat;
    import com.monsters.chat.Chat;
    import flash.display.DisplayObject;
    import flash.display.DisplayObjectContainer;
    import flash.display.Graphics;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.text.TextField;
    import flash.utils.Dictionary;
    import gs.TweenLite;
    import com.monsters.quests.IoQuests;

    /**
     * Inferno-only: sharing a place on the map in chat.
     *
     * The map room's Share button asks which tab (Global or Alliance) and sends a short token for the place,
     * [map:x,y:world], after whatever the player has typed into the chat box. The chat shows the token as a
     * pill with the coordinates; clicking it opens the map there (or moves the open map there). The world tag
     * keeps a place shared on one world from being opened on another.
     */
    public class IoMapShare {

        /** [map:263,95] or [map:263,95:ab12cd] */
        private static const TOKEN:RegExp = /\[map:(\d{1,3}),(\d{1,3})(?::([0-9a-zA-Z]{1,12}))?\]/g;

        /** A place, or an attack replay ([replay:key]: the fourth group). */
        private static const ANY_TOKEN:RegExp = /\[map:(\d{1,3}),(\d{1,3})(?::([0-9a-zA-Z]{1,12}))?\]|\[replay:([0-9a-zA-Z]{6,24})\]/g;

        private static const NBSP:String = " ";

        private static var _chooser:Sprite = null;

        /** Chat lines with places: line -> { text, links, pills, width } (to draw the pills again on a resize). */
        private static var _decorated:Dictionary = new Dictionary(true);

        /** The world a place opened from chat was shared on, until the map knows which world it shows. */
        private static var _pendingTag:String = null;

        public function IoMapShare() {
            super();
        }

        public static function Token(cellX:int, cellY:int):String {
            var tag:String = IoMapSnapshot.worldTag;
            return "[map:" + cellX + "," + cellY + (tag ? ":" + tag : "") + "]";
        }

        // ---- sharing from the map

        /**
         * Asks where to share a place: a small bubble at (x, y) of the host, kept inside `area` (the host's
         * map area).
         */
        public static function ShowChooser(host:DisplayObjectContainer, x:Number, y:Number, area:Rectangle, cellX:int, cellY:int):void {
            var bubble:Sprite = new Sprite();
            var title:TextField = null;
            var close:Sprite = null;
            var global:MovieClip = null;
            var alliance:MovieClip = null;
            var inAlliance:Boolean = ALLIANCES._allianceID > 0;
            // The leader and officers can also pin the place to the alliance board (2 October). Before the
            // player's role has loaded the button shows for any member: the server says who may.
            var canPin:Boolean = inAlliance && (ALLIANCES.ioIsStaff() || ALLIANCES.ioRole() == "");
            if (inAlliance && ALLIANCES.ioRole() == "") {
                ALLIANCES.LoadMyAlliance(null);
            }
            var w:int = 236;
            var h:int = canPin ? 100 : 68;
            HideChooser();
            IoMapUi.glass(bubble.graphics, w, h, 9);
            title = IoMapUi.label("", 12, IoMapUi.LIGHT, false, w - 34);
            title.htmlText = "Share <b>" + IoMapUi.coord(cellX, cellY) + "</b> in";
            title.x = 10;
            title.y = 7;
            bubble.addChild(title);
            close = new Sprite();
            IoMapUi.hitArea(close.graphics, 20, 20);
            IoMapUi.cross(close.graphics, 5, 5, 9, IoMapUi.LIGHT);
            close.x = w - 26;
            close.y = 6;
            close.buttonMode = true;
            close.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    HideChooser();
                });
            bubble.addChild(close);
            global = IoMapUi.button("Global", 104, 26, function(e:MouseEvent):void {
                    share(host, area, BYMChat.IO_GLOBAL, cellX, cellY);
                }, "gold");
            global.x = 10;
            global.y = 32;
            bubble.addChild(global);
            alliance = IoMapUi.button("Alliance", 104, 26, function(e:MouseEvent):void {
                    share(host, area, BYMChat.IO_ALLIANCE, cellX, cellY);
                }, "grey");
            alliance.x = 122;
            alliance.y = 32;
            Object(alliance).setEnabled(inAlliance);
            bubble.addChild(alliance);
            if (canPin) {
                var pin:MovieClip = IoMapUi.button("Pin to alliance board", w - 20, 26, function(e:MouseEvent):void {
                        HideChooser();
                        IoPinEditorPopup.Show({"x": cellX, "y": cellY, "world_id": IoMapSnapshot.world, "title": "", "body": ""});
                    }, "grey");
                pin.x = 10;
                pin.y = 64;
                pin.name = "ioSharePin";
                bubble.addChild(pin);
            }
            bubble.x = Math.round(Math.max(area.x + 4, Math.min(area.right - w - 4, x - w * 0.5)));
            bubble.y = Math.round(Math.max(area.y + 4, Math.min(area.bottom - h - 4, y - h - 10)));
            bubble.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation();
                });
            bubble.name = "ioShareChooser";
            host.addChild(bubble);
            _chooser = bubble;
            if (bubble.stage) {
                // Closes when the mouse goes down anywhere else (next frame: not on this very click).
                TweenLite.delayedCall(0.05, function():void {
                        if (_chooser == bubble && bubble.stage) {
                            bubble.stage.addEventListener(MouseEvent.MOUSE_DOWN, onStageDown);
                        }
                    });
            }
        }

        private static function onStageDown(e:MouseEvent):void {
            if (_chooser && _chooser.stage && e.target is DisplayObject && _chooser.contains(DisplayObject(e.target))) {
                return;
            }
            HideChooser();
        }

        public static function HideChooser():void {
            if (_chooser) {
                if (_chooser.stage) {
                    _chooser.stage.removeEventListener(MouseEvent.MOUSE_DOWN, onStageDown);
                }
                if (_chooser.parent) {
                    _chooser.parent.removeChild(_chooser);
                }
                _chooser = null;
            }
        }

        private static function share(host:DisplayObjectContainer, area:Rectangle, mode:String, cellX:int, cellY:int):void {
            var error:String = Chat._bymChat ? Chat._bymChat.ioShareLocation(mode, Token(cellX, cellY)) : "The chat is not connected right now.";
            HideChooser();
            if (error) {
                GLOBAL.Message(error);
                return;
            }
            Toast(host, "Posted to " + (mode == BYMChat.IO_ALLIANCE ? "Alliance" : "Global") + " chat", area.x + area.width * 0.5, area.bottom - 60);
        }

        /** A short note over the map that fades away. */
        public static function Toast(host:DisplayObjectContainer, text:String, centreX:Number, y:Number):void {
            var toast:Sprite = new Sprite();
            var label:TextField = IoMapUi.label(text, 12, IoMapUi.LIGHT, true, 300);
            label.width = label.textWidth + 8;
            label.x = 14;
            label.y = 6;
            IoMapUi.glass(toast.graphics, label.width + 28, 30, 15);
            toast.addChild(label);
            toast.mouseEnabled = false;
            toast.mouseChildren = false;
            toast.x = Math.round(centreX - toast.width * 0.5);
            toast.y = Math.round(y);
            host.addChild(toast);
            TweenLite.to(toast, 0.6, {
                        "alpha": 0,
                        "delay": 2.2,
                        "onComplete": function():void {
                            if (toast.parent) {
                                toast.parent.removeChild(toast);
                            }
                        }
                    });
        }

        // ---- the chat

        /**
         * A chat line's html with its place tokens made into coordinates. Returns { html, links }, links being
         * { x, y, tag, label } in the order they appear; null when the line has none.
         */
        public static function RenderChat(html:String):Object {
            var links:Array = [];
            if (!html || (html.indexOf("[map:") < 0 && html.indexOf(IoReplays.TOKEN_START) < 0)) {
                return null;
            }
            // (3 October: attack replays shared from the attack logs or a replay, [replay:key], show as a pill too,
            // with a play mark; clicking one watches it: IoReplays.Watch)
            ANY_TOKEN.lastIndex = 0;
            var out:String = html.replace(ANY_TOKEN, function(... match):String {
                    if (match[4]) {
                        var replayLabel:String = NBSP + NBSP + NBSP + NBSP + "Attack replay" + NBSP;
                        links.push({"replay": String(match[4]), "label": replayLabel});
                        return "<font color=\"#6A3F00\"><b>" + replayLabel + "</b></font>";
                    }
                    var cellX:int = int(match[1]);
                    var cellY:int = int(match[2]);
                    // (non-breaking spaces: the pin and its numbers stay on one line; the Depths' cells their own numbers)
                    var label:String = NBSP + NBSP + NBSP + NBSP + IoMapUi.coord(cellX, cellY).split(" ").join(NBSP) + NBSP;
                    links.push({"x": cellX, "y": cellY, "tag": match[3] ? String(match[3]) : "", "label": label});
                    return "<font color=\"#6A3F00\"><b>" + label + "</b></font>";
                });
            return links.length > 0 ? {"html": out, "links": links} : null;
        }

        /**
         * Draws the pills behind a chat line's places and makes them clickable. `line` is the line's clip,
         * `text` its text field (already laid out).
         */
        public static function DecorateChat(line:MovieClip, text:TextField, links:Array):void {
            var plain:String = text.text;
            var from:int = 0;
            var link:Object = null;
            var start:int = 0;
            var pills:Shape = new Shape();
            for each (link in links) {
                start = plain.indexOf(String(link.label), from);
                if (start < 0) {
                    continue;
                }
                link.start = start;
                link.end = start + String(link.label).length;
                from = link.end;
            }
            pills.x = text.x;
            pills.y = text.y;
            line.addChildAt(pills, Math.max(0, line.getChildIndex(text)));
            _decorated[line] = {"text": text, "links": links, "pills": pills, "width": -1};
            RelayoutChat(line);
            line.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    var hit:Object = linkAt(text, links);
                    if (hit) {
                        e.stopPropagation();
                        SOUNDS.Play("click1");
                        if (hit.replay) {
                            IoReplays.Watch(String(hit.replay));
                        }
                        else {
                            Open(int(hit.x), int(hit.y), String(hit.tag));
                        }
                    }
                });
            line.addEventListener(MouseEvent.MOUSE_MOVE, function(e:MouseEvent):void {
                    var over:Boolean = linkAt(text, links) != null;
                    if (line.buttonMode != over) {
                        line.buttonMode = over;
                        line.useHandCursor = over;
                    }
                });
        }

        /** The chat has laid its line out again (a new width): the pills follow the text. */
        public static function RelayoutChat(line:DisplayObject):void {
            var entry:Object = _decorated[line];
            var link:Object = null;
            var g:Graphics = null;
            if (!entry || entry.width == TextField(entry.text).width) {
                return;
            }
            entry.width = TextField(entry.text).width;
            g = Shape(entry.pills).graphics;
            g.clear();
            for each (link in entry.links) {
                if (int(link.end) > 0) {
                    drawPill(g, TextField(entry.text), int(link.start), int(link.end), Boolean(link.replay));
                }
            }
        }

        private static function linkAt(text:TextField, links:Array):Object {
            var index:int = text.getCharIndexAtPoint(text.mouseX, text.mouseY);
            if (index < 0) {
                return null;
            }
            for each (var link:Object in links) {
                if (link.end > 0 && index >= int(link.start) && index < int(link.end)) {
                    return link;
                }
            }
            return null;
        }

        /** A rounded pill behind characters start to end (one per line they are on), a pin at its start. */
        private static function drawPill(g:Graphics, text:TextField, start:int, end:int, replay:Boolean = false):void {
            var box:Rectangle = null;
            var line:int = -1;
            var lineBox:Rectangle = null;
            var first:Boolean = true;
            var i:int = start;
            var boxes:Array = [];
            while (i < end) {
                box = text.getCharBoundaries(i);
                if (box) {
                    if (text.getLineIndexOfChar(i) != line || !lineBox) {
                        line = text.getLineIndexOfChar(i);
                        lineBox = box.clone();
                        boxes.push(lineBox);
                    }
                    else {
                        lineBox.width = Math.max(lineBox.right, box.right) - lineBox.x;
                        lineBox.height = Math.max(lineBox.height, box.height);
                    }
                }
                i++;
            }
            for each (box in boxes) {
                IoMapUi.roundBox(g, box.x, box.y + 1, box.width, box.height - 1, 0xF7E3A3, 1, 0xB8860B, Math.min(8, box.height / 2), 1);
                if (first) {
                    if (replay) {
                        // (a play mark, for a replay)
                        var h:Number = Math.min(10, box.height - 5);
                        var cy:Number = box.y + box.height * 0.5 + 0.5;
                        g.lineStyle();
                        g.beginFill(0x6A3F00, 1);
                        g.moveTo(box.x + 4, cy - h * 0.5);
                        g.lineTo(box.x + 4 + h * 0.85, cy);
                        g.lineTo(box.x + 4, cy + h * 0.5);
                        g.lineTo(box.x + 4, cy - h * 0.5);
                        g.endFill();
                    }
                    else {
                        IoMapUi.pin(g, box.x + 7, box.y + box.height - 2, 0xB8860B, Math.min(12, box.height - 3), 0x6A3F00);
                    }
                    first = false;
                }
            }
        }

        // ---- opening a shared place

        /** Opens the map at a place from chat (or moves the open map there). */
        public static function Open(cellX:int, cellY:int, tag:String):void {
            var where:Point = new Point(cellX, cellY);
            if (tag && IoMapSnapshot.world && tag != IoMapSnapshot.worldTag) {
                GLOBAL.Message("This place was shared on another world, so it is not on your map.");
                return;
            }
            IoQuests.once("map_openlink"); // (the quest book)
            if ((cellX < 0 || cellY < 0 || cellX >= MapRoom._mapWidth || cellY >= MapRoom._mapHeight) && !IoUnderworld.isUnder(cellX, cellY)) {
                return;
            }
            if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
                MapRoom.JumpTo(where);
                MapRoom._mc.ioMarkSpot(cellX, cellY);
                return;
            }
            if (BASE.ioAttackRunning() || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                GLOBAL.Message("Not during an attack. Open it again when you are back in your yard.");
                return;
            }
            _pendingTag = tag && !IoMapSnapshot.world ? tag : null;
            MapRoom.ioFocus = where;
            MapRoom.ioMark = where;
            GLOBAL.ShowMap();
            if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
                MapRoom.ioFocus = null; // the map didn't open: don't jump there the next time it does
                MapRoom.ioMark = null;
                _pendingTag = null;
            }
        }

        /**
         * Opens the map on a cell of the player's own world (or moves the open map there), marked: the
         * leaderboards' Jump (com/monsters/leaderboards/IoLeaderboards). Its caller has made sure it is the
         * player's world.
         */
        public static function OpenOwnWorld(cellX:int, cellY:int):void {
            var where:Point = new Point(cellX, cellY);
            if (cellX < 0 || cellY < 0) {
                return;
            }
            if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
                MapRoom.JumpTo(where);
                MapRoom._mc.ioMarkSpot(cellX, cellY);
                return;
            }
            if (BASE.ioAttackRunning() || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                GLOBAL.Message("Not during an attack. Open it again when you are back in your yard.");
                return;
            }
            MapRoom.ioFocus = where;
            MapRoom.ioMark = where;
            GLOBAL.ShowMap();
            if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
                MapRoom.ioFocus = null; // the map didn't open: don't jump there the next time it does
                MapRoom.ioMark = null;
            }
        }

        /** The map now knows its world: a place opened from another world's chat is said to be so. */
        internal static function CheckPendingWorld():void {
            if (_pendingTag && IoMapSnapshot.world) {
                if (_pendingTag != IoMapSnapshot.worldTag) {
                    GLOBAL.Message("That place was shared on another world, so it is not on your map.");
                }
                _pendingTag = null;
            }
        }
    }
}
