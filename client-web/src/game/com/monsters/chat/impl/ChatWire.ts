import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { EventDispatcher } from "flash/events";
import { Dictionary } from "flash/utils";
import { AllianceMessageType, Channel, ChatData, ChatEvent, ChatRoom, ChatUser, LOGGER } from "@game";

/**
 * The chat server's messages turned into ChatEvents, the same for both transports (HttpChatSystem,
 * WSChatSystem): what was written twice is here once. Logging in (auth_ok / auth_fail) stays with the
 * transport, which keeps that state.
 *
 * Inferno-only additions: "alliance_left" (the player was moved out of an alliance channel: a LEAVE
 * event with `server` set), "error" (a SERVER_ERROR event: code, name, minutes) and the ignore list
 * coming back with its names and the action it answers (`ignore_ids`, `ignore_names`, `action`).
 */
export class ChatWire extends ASObject {

    public static dispatch(to: EventDispatcher, msg: any, rooms: Vector<string>): void {
        let params: Dictionary = null;
        let entry: any = null;
        let channelName: string = null;
        let idx: int = 0;
        switch (String(msg.type)) {
            case "joined":
                channelName = String(msg.channel);
                if (rooms.indexOf(channelName) == -1) {
                    rooms.push(channelName);
                }
                params = new Dictionary();
                params.set("channel", new Channel(channelName, "system"));
                to.dispatchEvent(new ChatEvent(ChatEvent.JOIN, true, params));
                if (as3.is(msg.history, Array)) {
                    // (13 October: a line the game can't show is skipped, not the whole history after it)
                    let failed: int = 0;
                    for (entry of as3.values(as3.as(msg.history, Array))) {
                        try {
                            ChatWire.nameMap(to, String(entry.userId | 0), String(entry.displayName));
                            ChatWire.say(to, channelName, entry);
                        } catch (err) {
                            if (failed++ == 0) {
                                LOGGER.Log("err", "Chat: a history line of " + channelName + " not shown: " + err + " | " + JSON.stringify(entry).substr(0, 300));
                            }
                        }
                    }
                }
                break;
            case "message":
                ChatWire.nameMap(to, String(msg.userId | 0), as3.as(msg.displayName, String));
                ChatWire.say(to, String(msg.channel), msg);
                break;
            case "user_enter":
                ChatWire.nameMap(to, String(msg.userId | 0), as3.as(msg.displayName, String));
                params = new Dictionary();
                params.set("user", new ChatUser(msg.userId | 0, as3.as(msg.displayName, String)));
                params.set("room", new ChatRoom(0, as3.as(msg.channel, String)));
                to.dispatchEvent(new ChatEvent(ChatEvent.USER_ENTER, true, params));
                break;
            case "user_exit":
                params = new Dictionary();
                params.set("user", new ChatUser(msg.userId | 0, String(msg.userId | 0)));
                params.set("room", new ChatRoom(0, as3.as(msg.channel, String)));
                to.dispatchEvent(new ChatEvent(ChatEvent.USER_EXIT, true, params));
                break;
            case "alliance_left":
                channelName = String(msg.channel);
                idx = rooms.indexOf(channelName) | 0;
                if (idx != -1) {
                    rooms.splice(idx, 1);
                }
                params = new Dictionary();
                params.set("channel", new Channel(channelName, "system"));
                params.set("server", true);
                to.dispatchEvent(new ChatEvent(ChatEvent.LEAVE, true, params));
                break;
            case "ignore_list":
                to.dispatchEvent(new ChatEvent(ChatEvent.IGNORE, true, ChatWire.ignoreParams(msg)));
                break;
            case "deleted":
                params = new Dictionary();
                params.set("channel", String(msg.channel));
                params.set("id", String(msg.id));
                to.dispatchEvent(new ChatEvent(ChatEvent.DELETED, true, params));
                break;
            case "notice":
                params = new Dictionary();
                params.set("text", String(msg.text));
                // (QoL #152, #153: the game's own words for it, KEYS, with what fills them in)
                params.set("key", msg.key != null ? String(msg.key) : null);
                params.set("v1", msg.v1 != null ? String(msg.v1) : null);
                params.set("v2", msg.v2 != null ? String(msg.v2) : null);
                to.dispatchEvent(new ChatEvent(ChatEvent.NOTICE, true, params));
                break;
            case "error":
                params = new Dictionary();
                params.set("code", String(msg.code));
                params.set("name", msg.name != null ? String(msg.name) : null);
                params.set("minutes", msg.minutes | 0);
                // (QoL #262: a mute's reason)
                params.set("reason", msg.reason != null ? String(msg.reason) : null);
                // (QoL #153: muted just now, not a line refused)
                params.set("fresh", msg.fresh == true);
                to.dispatchEvent(new ChatEvent(ChatEvent.SERVER_ERROR, true, params));
                break;
        }
    }

    /** The ignore list's event: the ids and names, and (for the stock list display) ChatData rows. */
    private static ignoreParams(msg: any): Dictionary {
        let params: Dictionary = new Dictionary();
        let action: string = msg.action ? String(msg.action) : "show";
        let ids: any[] = [];
        let names: any = {};
        let rows: any[] = [];
        for (let item of as3.values(as3.as(msg.list, Array) || [])) {
            let id: string = String(item.target);
            let name: string = item.displayname ? String(item.displayname) : "";
            ids.push(id);
            names[id] = name;
            let cd: ChatData = new ChatData();
            cd.putUtfString("target", id);
            cd.putUtfString("displayname", name);
            rows.push(cd);
        }
        params.set("action", action == "sync" ? "sync" : action);
        params.set("target", msg.target != null ? String(msg.target) : null);
        params.set("displayname", msg.targetName != null ? String(msg.targetName) : null);
        params.set("ignore_ids", ids);
        params.set("ignore_names", names);
        // (the stock handler: ChatData rows to list, plain ids to check against)
        params.set("ignore_list", action == "show" ? rows : ids);
        return params;
    }

    private static nameMap(to: EventDispatcher, userId: string, displayName: string): void {
        let params: Dictionary = new Dictionary();
        params.set("userid", userId);
        params.set("displayname", displayName);
        to.dispatchEvent(new ChatEvent(ChatEvent.UPDATE_NAME, true, params));
    }

    private static say(to: EventDispatcher, channelName: string, m: any): void {
        let params: Dictionary = new Dictionary();
        params.set("channel", new Channel(channelName, "system"));
        params.set("user", String(m.userId | 0));
        params.set("message", m.body != null ? String(m.body) : "");
        params.set("picsquare", as3.as(m.picSquare, String));
        params.set("ts", Number(m.ts));
        params.set("messagetype", m.messageType == null ? AllianceMessageType.MESSAGE : String(m.messageType));
        params.set("allianceimage", m.allianceImage | 0);
        params.set("displayname", m.displayName != null ? String(m.displayName) : null);
        params.set("id", m.id != null ? String(m.id) : null);
        params.set("role", m.role != null ? String(m.role) : null);
        params.set("color", m.color != null ? String(m.color) : null);
        // (13 October: the speaker's alliance tag, and whether they are online)
        params.set("allianceid", m.allianceId != null ? (m.allianceId | 0) : 0);
        params.set("alliancetag", m.allianceTag != null ? String(m.allianceTag) : null);
        params.set("online", m.online == null ? null : (m.online ? "1" : "0"));
        // (QoL #149: "all" / "officers" from the alliance's staff)
        params.set("ping", m.ping != null ? String(m.ping) : null);
        to.dispatchEvent(new ChatEvent(ChatEvent.SAY, true, params));
    }
}
