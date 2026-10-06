import { ASObject, int } from "as3";

export class WebSocketOpcode extends ASObject {
    // non-control opcodes
    public static readonly CONTINUATION: int = 0x00;
    public static readonly TEXT_FRAME: int = 0x01;
    public static readonly BINARY_FRAME: int = 0x02;
    public static readonly EXT_DATA: int = 0x03;

    // 0x04 - 0x07 = Reserved for further control frames
    // Control opcodes
    public static readonly CONNECTION_CLOSE: int = 0x08;
    public static readonly PING: int = 0x09;
    public static readonly PONG: int = 0x0A;
    public static readonly EXT_CONTROL: int = 0x0B;
}
