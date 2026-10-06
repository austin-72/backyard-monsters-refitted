import * as as3 from "as3";
import { ASObject, uint } from "as3";

export class WebSocketConfig extends ASObject {
    static {
        as3.fields(this, { maxReceivedFrameSize: 1048576, maxMessageSize: 8388608, fragmentOutgoingMessages: true, fragmentationThreshold: 16384, assembleFragments: true, closeTimeout: 5000 });
    }

    // 1 MiB max frame size
    public maxReceivedFrameSize: uint;
    // 8 MiB max message size, only applicable if
    // assembleFragments is true
    public maxMessageSize: uint;
    // 8 MiB
    // Outgoing messages larger than fragmentationThreshold will be
    // split into multiple fragments.
    public fragmentOutgoingMessages: boolean;
    // Outgoing frames are fragmented if they exceed this threshold.
    // Default is 16KiB
    public fragmentationThreshold: uint;
    // If true, fragmented messages will be automatically assembled
    // and the full message will be emitted via a 'message' event.
    // If false, each frame will be emitted via a 'frame' event and
    // the application will be responsible for aggregating multiple
    // fragmented frames.  Single-frame messages will emit a 'message'
    // event in addition to the 'frame' event.
    // Most users will want to leave this set to 'true'
    public assembleFragments: boolean;
    // The number of milliseconds to wait after sending a close frame
    // for an acknowledgement to come back before giving up and just
    // closing the socket.
    public closeTimeout: uint;

}
