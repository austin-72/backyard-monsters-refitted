import * as as3 from "as3";
import { uint } from "as3";
import { Event } from "flash/events";

export class SubscriptionStatusEvent extends Event {
    static {
        as3.fields(this, { renewalDate: 0, expirationDate: 0, subscriptionID: NaN });
    }

    public static readonly STATUS_EVENT: string = "statusEvent";
    public renewalDate: uint;
    public expirationDate: uint;
    public subscriptionID: number;

    public $ctor(param1?: string, param2: any /* uint */ = 0, param3: any /* uint */ = 0, param4: number = 0): void {
        this.renewalDate = param2;
        this.expirationDate = param3;
        this.subscriptionID = param4;
        super.$ctor(param1, this.bubbles, this.cancelable);
    }

    public override toString(): string {
        return "renewalDate:" + this.renewalDate + " expirationDate:" + this.expirationDate + " subscriptionID:" + this.subscriptionID;
    }
}
