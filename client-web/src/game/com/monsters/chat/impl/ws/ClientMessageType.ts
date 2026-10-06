import { ASObject } from "as3";

export class ClientMessageType extends ASObject {
    public static readonly AUTH: string = "auth";
    public static readonly JOIN: string = "join";
    public static readonly LEAVE: string = "leave";
    public static readonly SAY: string = "say";
    public static readonly UPDATE_NAME: string = "updatename";
    public static readonly GET_IGNORE: string = "getignore";
    public static readonly IGNORE: string = "ignore";
    public static readonly UNIGNORE: string = "unignore";
    public static readonly PING: string = "ping";

    public $ctor(): void {
        super.$ctor();
    }
}
