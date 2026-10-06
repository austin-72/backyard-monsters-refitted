import * as as3 from "as3";
import { Event } from "flash/events";
import { Dictionary } from "flash/utils";

export class ChatEvent extends Event {
    static {
        as3.fields(this, { map: null });
    }

    public static readonly CONNECT: string = "connect";

    public static readonly LOGIN: string = "login";

    public static readonly LOGOUT: string = "logout";

    public static readonly JOIN: string = "join";

    public static readonly LEAVE: string = "leave";

    public static readonly SAY: string = "say";

    public static readonly LIST: string = "list";

    public static readonly MEMBERS: string = "members";

    public static readonly IGNORE: string = "ignore";

    public static readonly IGNOREERROR: string = "ignoreerror";

    public static readonly UPDATE_NAME: string = "update_name";

    public static readonly USER_ENTER: string = "user_enter";

    public static readonly USER_EXIT: string = "user_exit";

    /** Inferno-only: the server refused something (params: code, name, minutes). */
    public static readonly SERVER_ERROR: string = "server_error";

    /** Inferno-only: a line deleted by a moderator (params: channel, id). */
    public static readonly DELETED: string = "chat_deleted";

    /** Inferno-only: a line for this player only from the server (params: text). */
    public static readonly NOTICE: string = "chat_notice";
    private map: Dictionary;

    public $ctor(param1?: string, param2: boolean = true, param3: any /* Dictionary */ = null, param4: boolean = false, param5: boolean = false): void {
        super.$ctor(param1, param4, param5);
        if (param3 == null) {
            this.map = new Dictionary();
        } else {
            this.map = param3;
        }
        this.map.set("success", param2);
    }

    public get Success(): boolean {
        if (this.map == null) {
            return false;
        }
        if (this.map.has("success")) {
            return Boolean(this.map.get("success"));
        }
        return false;
    }

    public Get(param1: string): any {
        if (this.map == null) {
            return null;
        }
        if (this.map.has(param1)) {
            return this.map.get(param1);
        }
        return null;
    }
}
