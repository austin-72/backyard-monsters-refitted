import * as as3 from "as3";
import { uint } from "as3";
import { CHAMPIONCAGE, GLOBAL, KeywordMessage, MarketingRecapture, POPUPS } from "@game";

export class Promo06RecapturedKorath extends KeywordMessage {
    static {
        as3.fields(this, { m_CanBeShown: false });
    }

    private static readonly TIME_UNTIL_RESET: uint = 604800;

    public static readonly NAME: string = "recapturekorath";
    private m_CanBeShown: boolean;

    public $ctor(): void {
        super.$ctor("recapturekorath", "btn_opencage", "bym_pop_korath.png");
    }

    public get canBeShown(): boolean {
        return this.m_CanBeShown;
    }

    public set canBeShown(param1: boolean) {
        this.m_CanBeShown = param1;
    }

    public override setup(param1: any): void {
        super.setup(param1);
        this.markAsUnseenIfOlderThan(Promo06RecapturedKorath.TIME_UNTIL_RESET);
    }

    public override get areRequirementsMet(): boolean {
        return MarketingRecapture.instance.champPopup === MarketingRecapture.k_POPUP_KORATH;
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        if (GLOBAL._bCage) {
            CHAMPIONCAGE.Show();
        }
    }
}
