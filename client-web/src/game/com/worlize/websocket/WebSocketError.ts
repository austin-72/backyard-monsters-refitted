import { ASError } from "as3";

export class WebSocketError extends ASError {
    public $ctor(message: any = "", id: any = 0): void {
        super.$ctor(message, id);
    }
}
