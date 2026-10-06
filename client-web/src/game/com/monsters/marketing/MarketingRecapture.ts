import * as as3 from "as3";
import { ASObject, uint } from "as3";

export class MarketingRecapture extends ASObject {
    static {
        as3.fields(this, { m_champPopup: 0 });
    }

    public static readonly k_POPUP_GORGO: uint = 1;

    public static readonly k_POPUP_DRULL: uint = 2;

    public static readonly k_POPUP_FOMOR: uint = 3;

    public static readonly k_POPUP_KORATH: uint = 4;

    protected static s_instance: MarketingRecapture = null;
    protected m_champPopup: uint;

    public $ctor(param1?: InstanceEnforcer): void {
        super.$ctor();
        if (!param1) {
            throw new Error("MarketingRecapture is a Singleton, use instance.");
        }
    }

    public static get instance(): MarketingRecapture {
        MarketingRecapture.s_instance = MarketingRecapture.s_instance || new MarketingRecapture(new InstanceEnforcer());
        return MarketingRecapture.s_instance;
    }

    public get champPopup(): uint {
        return this.m_champPopup;
    }

    public importData(param1: string): void {
        if (!param1) {
            return;
        }
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.champpopup) {
            this.m_champPopup = _loc2_.champpopup >>> 0;
        }
    }
}

class InstanceEnforcer extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }
}
