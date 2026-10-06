import { ASObject, int } from "as3";

export class WebSocketCloseStatus extends ASObject {
    // http://tools.ietf.org/html/rfc6455#section-7.4
    public static readonly NORMAL: int = 1000;
    public static readonly GOING_AWAY: int = 1001;
    public static readonly PROTOCOL_ERROR: int = 1002;
    public static readonly UNPROCESSABLE_INPUT: int = 1003;
    public static readonly UNDEFINED: int = 1004;
    public static readonly NO_CODE: int = 1005;
    public static readonly NO_CLOSE: int = 1006;
    public static readonly BAD_PAYLOAD: int = 1007;
    public static readonly POLICY_VIOLATION: int = 1008;
    public static readonly MESSAGE_TOO_LARGE: int = 1009;
    public static readonly REQUIRED_EXTENSION: int = 1010;
    public static readonly SERVER_ERROR: int = 1011;
    public static readonly FAILED_TLS_HANDSHAKE: int = 1015;
}
