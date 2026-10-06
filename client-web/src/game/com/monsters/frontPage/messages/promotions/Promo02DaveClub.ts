import * as as3 from "as3";
import { uint } from "as3";
import { Button, KeywordMessage, POPUPS, SubscriptionHandler } from "@game";

export class Promo02DaveClub extends KeywordMessage {
    static {
        as3.fields(this, { m_CanBeShown: false });
    }

    private static readonly TIME_UNTIL_RESET: uint = 604800;

    public static readonly NAME: string = "promodaveclub2";
    private m_CanBeShown: boolean;

    public $ctor(): void {
        super.$ctor("promodaveclub2", "btn_tellmore", "fp_daveclubyp2.jpg");
    }

    public get canBeShown(): boolean {
        return this.m_CanBeShown;
    }

    public set canBeShown(param1: boolean) {
        this.m_CanBeShown = param1;
    }

    public override setup(param1: any): void {
        super.setup(param1);
        this.markAsUnseenIfOlderThan(Promo02DaveClub.TIME_UNTIL_RESET);
    }

    public override setupButton(param1: Button): Button {
        if (SubscriptionHandler.instance.isSubscriptionActive) {
            param1.visible = false;
            return param1;
        }
        return super.setupButton(param1);
    }

    public override get areRequirementsMet(): boolean {
        return this.m_CanBeShown;
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        SubscriptionHandler.instance.showPromoPopup();
    }
}
