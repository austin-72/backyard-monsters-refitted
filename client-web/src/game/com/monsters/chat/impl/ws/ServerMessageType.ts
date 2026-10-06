import { ASObject } from "as3";

export class ServerMessageType extends ASObject {
    public static readonly AUTH_OK: string = "auth_ok";
    public static readonly AUTH_FAIL: string = "auth_fail";
    public static readonly JOINED: string = "joined";
    public static readonly MESSAGE: string = "message";
    public static readonly USER_ENTER: string = "user_enter";
    public static readonly USER_EXIT: string = "user_exit";
    public static readonly IGNORE_LIST: string = "ignore_list";

    public $ctor(): void {
        super.$ctor();
    }
}
