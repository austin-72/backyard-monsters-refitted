import { ASObject } from "as3";

/**
 * What a row in the alliance feed represents, mirroring the server's
 * AllianceMessageType enum.
 *
 * Anything other than MESSAGE is a shout: a server-composed sentence about a
 * membership change, drawn as a centred system row with no name line. The
 * server sends the finished text, as the original did - none of its shout
 * strings ever lived in the client.
 */
export class AllianceMessageType extends ASObject {
    public static readonly MESSAGE: string = "message";
    public static readonly JOINED: string = "joined";
    public static readonly LEFT: string = "left";
    public static readonly KICKED: string = "kicked";
    public static readonly PROMOTED: string = "promoted";
    public static readonly CREATED: string = "created";
    public static readonly RELATIONSHIP: string = "relationship";

    public $ctor(): void {
        super.$ctor();
    }
}
