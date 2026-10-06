import * as as3 from "as3";
import { EventDispatcher } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Console, GLOBAL, LOGGER, SubscriptionStatusEvent } from "@game";

export class SubscriptionService extends EventDispatcher {
    static {
        as3.fields(this, { _callbacks: null });
    }

    private _callbacks: any[];

    public $ctor(): void {
        this._callbacks = [];
        super.$ctor();
    }

    private callJS(param1: string, param2: Function = null, param3: number = 2, param4: boolean = true): void {
        let _loc5_: string = param1.replace("cc.", "");
        if (param2 && ExternalInterface.available && this._callbacks.indexOf(_loc5_) < 0) {
            ExternalInterface.addCallback(_loc5_, param2);
            this._callbacks[_loc5_] = _loc5_;
        }
        GLOBAL.CallJS(param1, [param3], param4);
    }

    public getSubscriptionData(): void {
        this.callJS("cc.getUserSubscriptions", as3.bind(this, this.getUserSubscriptions), 2, false);
    }

    public getUserSubscriptions(param1: string): void {
        let _loc2_: SubscriptionStatusEvent = new SubscriptionStatusEvent(SubscriptionStatusEvent.STATUS_EVENT);
        if (!param1) {
            Console.warning("did not recieve json back from the server");
            this.dispatchEvent(_loc2_);
            return;
        }
        let _loc3_: any = JSON.parse(param1)[0];
        if (_loc3_.length == 0) {
            Console.warning("got subscription data but it\'s emtpy, not going to try to parse it");
            this.dispatchEvent(_loc2_);
            return;
        }
        _loc2_ = new SubscriptionStatusEvent(SubscriptionStatusEvent.STATUS_EVENT);
        _loc2_.subscriptionID = Number(_loc3_["fb_subscriptionid"]);
        let _loc4_: string = String(_loc3_["status"]);
        let _loc5_: number = Number(_loc3_["nextbilltime"]);
        if (_loc4_ == "active") {
            _loc2_.renewalDate = _loc5_ >>> 0;
        } else if (_loc4_ == "pending_cancel") {
            _loc2_.expirationDate = _loc5_ >>> 0;
        }
        this.dispatchEvent(_loc2_);
    }

    public startSubscription(): void {
        LOGGER.StatB({ "st1": "daves_club" }, "subscribe");
        this.callJS("cc.showSubscriptionDialog", as3.bind(this, this.showSubscriptionDialog));
    }

    public reactivateSubscription(param1: number): void {
        this.callJS("cc.showSubscriptionDialog", as3.bind(this, this.showSubscriptionDialog));
    }

    private showSubscriptionDialog(param1: string = null): void {
        if (!param1) {
            Console.warning("got a calback @ \'showSubscriptionDialog\' but theres no JSON data!");
        }
        this.getUserSubscriptions(param1);
    }

    public changeSubscription(param1: number): void {
        this.callJS("cc.changeSubscriptionPayType", null, param1);
    }

    private changeSubscriptionCallback(param1: string): void {
        this.getUserSubscriptions(param1);
    }

    public cancelSubscription(param1: number): void {
        LOGGER.StatB({ "st1": "daves_club" }, "unsubscribe");
        this.callJS("cc.showSubscriptionDialog", as3.bind(this, this.showSubscriptionDialog));
    }

    private cancelSubscriptionCallback(param1: string): void {
        this.getUserSubscriptions(param1);
    }
}
