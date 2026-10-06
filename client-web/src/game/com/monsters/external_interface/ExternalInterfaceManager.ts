import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ExternalInterface } from "flash/external";
import { ALLIANCES, BASE, BUY, EnumYardType, GLOBAL, MapRoomManager, POPUPS, RADIO, STORE } from "@game";

export class ExternalInterfaceManager extends ASObject {
    private static _init: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Sets up the external interface callbacks if ExternalInterface is available.
     * This method should only be called once. Muptiple calls will have no effect after the first setup.
     */
    public static Initialize(): void {
        if (!ExternalInterface.available || ExternalInterfaceManager._init) {
            return;
        }
        ExternalInterfaceManager._init = true;

        ExternalInterface.addCallback("openbase", (baseLoadParamsStr: string): void => {
            let baseLoadParams: any = null;
            let yardType: int = 0;
            if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving && !BASE._loading) {
                GLOBAL._currentCell = null;
                baseLoadParams = JSON.parse(baseLoadParamsStr);
                yardType = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
                if (baseLoadParams.viewleader) {
                    BASE.LoadBase(as3.str(baseLoadParams.url), Number(baseLoadParams.userid), Number(baseLoadParams.baseid), GLOBAL.e_BASE_MODE.VIEW, true, yardType);
                } else if (Boolean(baseLoadParams.infurl) && BASE.isInfernoMainYardOrOutpost) {
                    BASE.LoadBase(as3.str(baseLoadParams.infurl), 0, Number(baseLoadParams.infbaseid), GLOBAL.e_BASE_MODE.IVIEW, true, EnumYardType.INFERNO_YARD);
                } else {
                    BASE.LoadBase(as3.str(baseLoadParams.url), Number(baseLoadParams.userid), Number(baseLoadParams.baseid), GLOBAL.e_BASE_MODE.HELP, true, yardType);
                }
            }
        });
        ExternalInterface.addCallback("fbcBuyItem", (param1: string): void => {
            STORE.FacebookCreditPurchaseB(param1);
        });
        ExternalInterface.addCallback("callbackgift", (param1: string): void => {
            POPUPS.CallbackGift(param1);
        });
        ExternalInterface.addCallback("callbackshiny", (param1: string): void => {
            POPUPS.CallbackShiny(param1);
        });
        ExternalInterface.addCallback("twitteraccount", (param1: string): void => {
            RADIO.TwitterCallback(param1);
        });
        ExternalInterface.addCallback("updateCredits", (param1: string): void => {
            STORE.updateCredits(param1);
        });
        ExternalInterface.addCallback("fbcAdd", (param1: string): void => {
            BUY.FBCAdd(param1);
        });
        ExternalInterface.addCallback("fbcOfferDaily", (param1: string): void => {
            BUY.FBCOfferDaily(param1);
        });
        ExternalInterface.addCallback("fbcOfferEarn", (param1: string): void => {
            BUY.FBCOfferEarn(param1);
        });
        ExternalInterface.addCallback("fbcNcp", (param1: string): void => {
            BUY.FBCNcp(param1);
        });
        ExternalInterface.addCallback("fbcNcpConfirm", (param1: string): void => {
            BUY.FBCNcpConfirm(param1);
        });
        ExternalInterface.addCallback("purchaseReceive", (param1: string): void => {
            BUY.purchaseReceive(param1);
        });
        ExternalInterface.addCallback("purchaseComplete", (param1: string): void => {
            BUY.purchaseComplete(param1);
        });
        ExternalInterface.addCallback("receivePurchase", (param1: string): void => {
            BUY.purchaseReceive(param1);
        });
        ExternalInterface.addCallback("startPromoTimer", (param1: string): void => {
            BUY.startPromo(param1);
        });
        ExternalInterface.addCallback("alliancesupdate", (param1: string): void => {
            ALLIANCES.AlliancesServerUpdate(param1);
        });
        ExternalInterface.addCallback("alliancesViewLeader", (param1: string): void => {
            ALLIANCES.AlliancesViewLeader(param1);
        });
        ExternalInterface.addCallback("openmap", (param1: string): void => {
            GLOBAL.ShowMap();
        });
    }
}
