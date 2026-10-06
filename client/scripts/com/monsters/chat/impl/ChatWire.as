package com.monsters.chat.impl {
    import com.monsters.chat.Channel;
    import com.monsters.chat.ChatData;
    import com.monsters.chat.ChatEvent;
    import com.monsters.chat.ChatRoom;
    import com.monsters.chat.ChatUser;
    import com.monsters.chat.impl.ws.AllianceMessageType;
    import flash.events.EventDispatcher;
    import flash.utils.Dictionary;

    /**
     * The chat server's messages turned into ChatEvents, the same for both transports (HttpChatSystem,
     * WSChatSystem): what was written twice is here once. Logging in (auth_ok / auth_fail) stays with the
     * transport, which keeps that state.
     *
     * Inferno-only additions: "alliance_left" (the player was moved out of an alliance channel: a LEAVE
     * event with `server` set), "error" (a SERVER_ERROR event: code, name, minutes) and the ignore list
     * coming back with its names and the action it answers (`ignore_ids`, `ignore_names`, `action`).
     */
    public class ChatWire {

        public static function dispatch(to:EventDispatcher, msg:Object, rooms:Vector.<String>):void {
            var params:Dictionary = null;
            var entry:Object = null;
            var channelName:String = null;
            var idx:int = 0;
            switch (String(msg.type)) {
                case "joined":
                    channelName = String(msg.channel);
                    if (rooms.indexOf(channelName) == -1) {
                        rooms.push(channelName);
                    }
                    params = new Dictionary();
                    params["channel"] = new Channel(channelName, "system");
                    to.dispatchEvent(new ChatEvent(ChatEvent.JOIN, true, params));
                    if (msg.history is Array) {
                        for each (entry in msg.history as Array) {
                            nameMap(to, String(int(entry.userId)), String(entry.displayName));
                            say(to, channelName, entry);
                        }
                    }
                    break;
                case "message":
                    nameMap(to, String(int(msg.userId)), msg.displayName as String);
                    say(to, String(msg.channel), msg);
                    break;
                case "user_enter":
                    nameMap(to, String(int(msg.userId)), msg.displayName as String);
                    params = new Dictionary();
                    params["user"] = new ChatUser(int(msg.userId), msg.displayName as String);
                    params["room"] = new ChatRoom(0, msg.channel as String);
                    to.dispatchEvent(new ChatEvent(ChatEvent.USER_ENTER, true, params));
                    break;
                case "user_exit":
                    params = new Dictionary();
                    params["user"] = new ChatUser(int(msg.userId), String(int(msg.userId)));
                    params["room"] = new ChatRoom(0, msg.channel as String);
                    to.dispatchEvent(new ChatEvent(ChatEvent.USER_EXIT, true, params));
                    break;
                case "alliance_left":
                    channelName = String(msg.channel);
                    idx = rooms.indexOf(channelName);
                    if (idx != -1) {
                        rooms.splice(idx, 1);
                    }
                    params = new Dictionary();
                    params["channel"] = new Channel(channelName, "system");
                    params["server"] = true;
                    to.dispatchEvent(new ChatEvent(ChatEvent.LEAVE, true, params));
                    break;
                case "ignore_list":
                    to.dispatchEvent(new ChatEvent(ChatEvent.IGNORE, true, ignoreParams(msg)));
                    break;
                case "deleted":
                    params = new Dictionary();
                    params["channel"] = String(msg.channel);
                    params["id"] = String(msg.id);
                    to.dispatchEvent(new ChatEvent(ChatEvent.DELETED, true, params));
                    break;
                case "notice":
                    params = new Dictionary();
                    params["text"] = String(msg.text);
                    to.dispatchEvent(new ChatEvent(ChatEvent.NOTICE, true, params));
                    break;
                case "error":
                    params = new Dictionary();
                    params["code"] = String(msg.code);
                    params["name"] = msg.name != null ? String(msg.name) : null;
                    params["minutes"] = int(msg.minutes);
                    to.dispatchEvent(new ChatEvent(ChatEvent.SERVER_ERROR, true, params));
                    break;
            }
        }

        /** The ignore list's event: the ids and names, and (for the stock list display) ChatData rows. */
        private static function ignoreParams(msg:Object):Dictionary {
            var params:Dictionary = new Dictionary();
            var action:String = msg.action ? String(msg.action) : "show";
            var ids:Array = [];
            var names:Object = {};
            var rows:Array = [];
            for each (var item:Object in msg.list as Array || []) {
                var id:String = String(item.target);
                var name:String = item.displayname ? String(item.displayname) : "";
                ids.push(id);
                names[id] = name;
                var cd:ChatData = new ChatData();
                cd.putUtfString("target", id);
                cd.putUtfString("displayname", name);
                rows.push(cd);
            }
            params["action"] = action == "sync" ? "sync" : action;
            params["target"] = msg.target != null ? String(msg.target) : null;
            params["displayname"] = msg.targetName != null ? String(msg.targetName) : null;
            params["ignore_ids"] = ids;
            params["ignore_names"] = names;
            // (the stock handler: ChatData rows to list, plain ids to check against)
            params["ignore_list"] = action == "show" ? rows : ids;
            return params;
        }

        private static function nameMap(to:EventDispatcher, userId:String, displayName:String):void {
            var params:Dictionary = new Dictionary();
            params["userid"] = userId;
            params["displayname"] = displayName;
            to.dispatchEvent(new ChatEvent(ChatEvent.UPDATE_NAME, true, params));
        }

        private static function say(to:EventDispatcher, channelName:String, m:Object):void {
            var params:Dictionary = new Dictionary();
            params["channel"] = new Channel(channelName, "system");
            params["user"] = String(int(m.userId));
            params["message"] = m.body != null ? String(m.body) : "";
            params["picsquare"] = m.picSquare as String;
            params["ts"] = Number(m.ts);
            params["messagetype"] = m.messageType == null ? AllianceMessageType.MESSAGE : String(m.messageType);
            params["allianceimage"] = int(m.allianceImage);
            params["displayname"] = m.displayName != null ? String(m.displayName) : null;
            params["id"] = m.id != null ? String(m.id) : null;
            params["role"] = m.role != null ? String(m.role) : null;
            to.dispatchEvent(new ChatEvent(ChatEvent.SAY, true, params));
        }
    }
}
