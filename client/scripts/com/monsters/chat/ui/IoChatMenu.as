package com.monsters.chat.ui {
    import com.monsters.chat.BYMChat;
    import com.monsters.chat.Chat;
    import com.monsters.leaderboards.IoLeaderboards;
    import flash.display.DisplayObject;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.display.Stage;
    import flash.events.Event;
    import flash.events.KeyboardEvent;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.ui.Keyboard;
    import flash.utils.setTimeout;

    /**
     * Inferno-only: the menu a player's name opens in the chat (the user's, 2 October): Send a message,
     * Ignore / Unignore, Jump to their yard (on the player's own world: IoLeaderboards knows where it is),
     * Find on the leaderboards. Closed by a click elsewhere, Escape, or once a choice is made.
     */
    public class IoChatMenu {

        private static const W:int = 190;

        private static const ROW_H:int = 26;

        private static var _mc:Sprite = null;

        public static function get isOpen():Boolean {
            return _mc != null && _mc.parent != null;
        }

        /**
         * `param6`: {staff: "admin" | "mod" | null (the viewer's role), lineId, channel (the clicked line),
         * targetRole}: staff also get Delete line and Mute (the server checks every request).
         */
        public static function Show(param1:String, param2:String, param3:Boolean, param4:Number, param5:Number, param6:Object = null):void {
            Hide();
            var uid:String = param1;
            var name:String = param2 ? param2 : "Player " + param1;
            var me:Boolean = uid == String(LOGIN._playerID);
            var items:Array = [];
            if (!me) {
                items.push(["Send a message", "ioChatMenuMessage", function():void {
                            BYMChat.ioMessagePlayer(uid, name);
                        }]);
                items.push([param3 ? "Unignore" : "Ignore", "ioChatMenuIgnore", function():void {
                            if (Chat._bymChat == null) {
                                return;
                            }
                            if (param3) {
                                Chat._bymChat.unignoreUser(uid);
                            }
                            else {
                                Chat._bymChat.ignoreUser(uid, name);
                            }
                        }]);
                if (!param3) {
                    items.push(["Jump to their yard", "ioChatMenuJump", function():void {
                                IoLeaderboards.JumpToPlayer(int(uid), name);
                            }]);
                }
            }
            items.push(["Find on the leaderboards", "ioChatMenuFind", function():void {
                        IoLeaderboards.ShowPlayer(int(uid), name);
                    }]);
            var opts:Object = param6 || {};
            var staff:String = opts.staff ? String(opts.staff) : null;
            if (staff && !me && Chat._bymChat != null) {
                var mod:Array = [];
                var lineId:String = opts.lineId ? String(opts.lineId) : null;
                var channel:String = opts.channel ? String(opts.channel) : null;
                if (lineId && channel) {
                    mod.push(["Delete this line", "ioChatMenuDelete", function():void {
                                Chat._bymChat.ioDeleteLine(channel, lineId);
                            }]);
                }
                var targetRole:String = opts.targetRole ? String(opts.targetRole) : null;
                if (targetRole != "admin" && (targetRole != "mod" || staff == "admin")) {
                    for each (var m:Array in [["Mute 10 minutes", 10, "ioChatMenuMute10"], ["Mute 1 hour", 60, "ioChatMenuMute60"], ["Mute 1 day", 1440, "ioChatMenuMute1440"], ["Unmute", 0, "ioChatMenuUnmute"]]) {
                        mod.push([m[0], m[2], muteFn(uid, int(m[1]))]);
                    }
                }
                if (mod.length) {
                    items.push(["-"]);
                    items = items.concat(mod);
                }
            }
            var mc:Sprite = new Sprite();
            mc.name = "ioChatMenu";
            var rows:int = 0;
            var seps:int = 0;
            for each (var it:Array in items) {
                if (it[0] == "-") {
                    seps++;
                }
                else {
                    rows++;
                }
            }
            var h:int = 30 + rows * ROW_H + seps * 20 + 6;
            var bg:Shape = new Shape();
            bg.graphics.lineStyle(2, 0xE0702A, 1);
            bg.graphics.beginFill(0x1E1210, 0.97);
            bg.graphics.drawRoundRect(0, 0, W, h, 12, 12);
            bg.graphics.endFill();
            bg.graphics.lineStyle(1, 0x5A3A26, 1);
            bg.graphics.moveTo(8, 29);
            bg.graphics.lineTo(W - 8, 29);
            mc.addChild(bg);
            mc.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
            var title:TextField = label(BYMChat.ioEsc(name), 13, 0xFFD24A, true);
            title.x = 10;
            title.y = 6;
            title.width = W - 20;
            mc.addChild(title);
            var y:int = 33;
            for (var i:int = 0; i < items.length; i++) {
                if (items[i][0] == "-") {
                    // (the moderation part: staff only)
                    var line:Shape = new Shape();
                    line.graphics.lineStyle(1, 0x5A3A26, 1);
                    line.graphics.moveTo(8, y + 4);
                    line.graphics.lineTo(W - 8, y + 4);
                    mc.addChild(line);
                    var head:TextField = label("Moderation", 10, 0xE07060, true);
                    head.x = 10;
                    head.y = y + 4;
                    mc.addChild(head);
                    y += 20;
                    continue;
                }
                mc.addChild(row(items[i][0], items[i][1], items[i][2], y));
                y += ROW_H;
            }
            // Above the click (the chat is at the bottom of the screen), kept on the screen. On the stage itself:
            // the chat sits over the game's top layer, which hid the menu's lower rows behind its lines.
            var stage:Stage = GLOBAL._ROOT.stage;
            mc.x = Math.max(4, Math.min(stage.stageWidth - W - 4, param4 + 6));
            mc.y = Math.max(4, Math.min(stage.stageHeight - h - 4, param5 - h - 6));
            stage.addChild(mc);
            _mc = mc;
            SOUNDS.Play("click1");
            // (after this click has finished: it would close the menu at once)
            setTimeout(function():void {
                    if (_mc == mc && mc.stage) {
                        mc.stage.addEventListener(MouseEvent.MOUSE_DOWN, onStageDown, true);
                        mc.stage.addEventListener(KeyboardEvent.KEY_DOWN, onKey);
                    }
                }, 0);
        }

        private static function muteFn(param1:String, param2:int):Function {
            return function():void {
                if (Chat._bymChat != null) {
                    Chat._bymChat.ioMute(param1, param2);
                }
            };
        }

        public static function Hide():void {
            if (_mc == null) {
                return;
            }
            if (_mc.stage) {
                _mc.stage.removeEventListener(MouseEvent.MOUSE_DOWN, onStageDown, true);
                _mc.stage.removeEventListener(KeyboardEvent.KEY_DOWN, onKey);
            }
            if (_mc.parent) {
                _mc.parent.removeChild(_mc);
            }
            _mc = null;
        }

        private static function onStageDown(param1:MouseEvent):void {
            if (_mc != null && !_mc.contains(param1.target as DisplayObject)) {
                Hide();
            }
        }

        private static function onKey(param1:KeyboardEvent):void {
            if (param1.keyCode == Keyboard.ESCAPE) {
                Hide();
            }
        }

        private static function row(param1:String, param2:String, param3:Function, param4:int):Sprite {
            var b:Sprite = new Sprite();
            b.name = param2;
            b.buttonMode = true;
            b.mouseChildren = false;
            b.x = 4;
            b.y = param4;
            var hover:Shape = new Shape();
            hover.graphics.beginFill(0x6A3A0E, 1);
            hover.graphics.drawRoundRect(0, 0, W - 8, ROW_H - 2, 8, 8);
            hover.graphics.endFill();
            hover.alpha = 0;
            b.addChild(hover);
            var t:TextField = label(param1, 12, 0xF2E6D8, false);
            t.x = 8;
            t.y = 4;
            b.addChild(t);
            b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    hover.alpha = 1;
                });
            b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    hover.alpha = 0;
                });
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    Hide();
                    SOUNDS.Play("click1");
                    param3();
                });
            return b;
        }

        private static function label(param1:String, param2:int, param3:uint, param4:Boolean):TextField {
            var t:TextField = new TextField();
            t.defaultTextFormat = new TextFormat("Verdana", param2, param3, param4);
            t.selectable = false;
            t.mouseEnabled = false;
            t.autoSize = TextFieldAutoSize.LEFT;
            t.htmlText = param1;
            return t;
        }
    }
}
