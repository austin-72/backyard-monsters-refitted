import { ASObject, int } from "as3";

export class WebSocketState extends ASObject {
    public static readonly CONNECTING: int = 0;
    public static readonly OPEN: int = 1;
    public static readonly CLOSED: int = 2;
    public static readonly INIT: int = 3;
}
