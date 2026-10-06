import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { BASE, BFOUNDATION, BUILDINGOPTIONS, BYMDevConfig, FACEBOOK_NCP_CLIP, GLOBAL, ImageCache, InventoryManager, LOGGER, LOGIN, POPUPS, SALESPECIALSPOPUP, STORE, TUTORIAL, TweenLite, print } from "@game";

export class BUY extends ASObject {
    public static forceNCP: boolean = false;

    public static cacheNCPAvailable: string = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: MouseEvent = null): void {
        LOGGER.Stat([22]);
        GLOBAL.CallJS("cc.showTopup", [{ "type": "fbc", "callback": "fbcAdd" }]);
    }

    public static Offers(param1: string): void {
        switch (param1) {
            case "daily":
                GLOBAL.CallJS("cc.showTopup", [{ "type": "daily", "callback": "fbcOfferDaily" }]);
                break;
            case "earn":
                GLOBAL.CallJS("cc.showTopup", [{ "type": "offers", "callback": "fbcOfferEarn" }]);
        }
    }

    public static FBCAdd(param1: string): void {
        let _loc2_: any = JSON.parse(param1);
        if (!_loc2_.status) {
            LOGGER.Log("err", "FBCAdd " + param1);
        }
    }

    public static FBCOfferEarn(param1: string): void {
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.status) {
            if (_loc2_.status != "settled") {
                if (_loc2_.status != "failed") {
                    if (_loc2_.status == "canceled") {
                    }
                }
            }
        } else {
            LOGGER.Log("err", "FBCDailyEarn " + param1);
        }
    }

    public static FBCOfferDaily(param1: string): void {
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.status) {
            if (_loc2_.status != "settled") {
                if (_loc2_.status != "failed") {
                    if (_loc2_.status == "canceled") {
                    }
                }
            }
        } else {
            LOGGER.Log("err", "FBCDailyEarn " + param1);
        }
    }

    public static FBCNcpCheckEligibility(): boolean {
        if (GLOBAL._fbcncp > 0 && (GLOBAL._flags && GLOBAL._flags.fbcncpshow != -1)) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && TUTORIAL._stage > 200 && GLOBAL._sessionCount >= 5) {
                if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate && ExternalInterface.available) {
                    if (BUY.cacheNCPAvailable) {
                        BUY.FBCNcp(BUY.cacheNCPAvailable);
                    } else {
                        if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
                            GLOBAL.CallJSWithClient("cc.ncp", "fbcNcp", ["checkEligibility"]);
                        } else {
                            GLOBAL.CallJS("cc.ncp", ["checkEligibility", "fbcNcp"]);
                        }
                        BUY.FBCNcpUpgradeTimeout();
                    }
                    return true;
                }
            }
        }
        return false;
    }

    public static FBCNcpUpgradeTimeout(): void {
        TweenLite.killDelayedCallsTo(BUY.FBCNcpCancelled);
        TweenLite.delayedCall(5, BUY.FBCNcpCancelled, ["timeout", false]);
    }

    public static FBCNcp(param1: string): void {
        let _loc2_: MovieClip = null;
        print("|BUY| - FBCNCP CallBack");
        TweenLite.killDelayedCallsTo(BUY.FBCNcpCancelled);
        if (param1 == "1" || param1 == "2") {
            BUY.cacheNCPAvailable = param1;
            _loc2_ = new FACEBOOK_NCP_CLIP();
            _loc2_.bYes.buttonMode = true;
            _loc2_.bYes.useHandCursor = true;
            _loc2_.bYes.mouseChildren = false;
            _loc2_.bYes.alpha = 0;
            _loc2_.bYes.addEventListener(MouseEvent.CLICK, BUY.FBCNcp_Click);
            _loc2_.bNo.buttonMode = true;
            _loc2_.bNo.useHandCursor = true;
            _loc2_.bNo.mouseChildren = false;
            _loc2_.bNo.alpha = 0;
            _loc2_.bNo.addEventListener(MouseEvent.CLICK, BUY.FBCNcpCancelled);
            BUY.FBCNcpRender("upgrade", as3.cast(_loc2_.imageHolder, MovieClip));
            POPUPS.Push(_loc2_, null, null, null, null, false);
        } else {
            if (param1 == "0") {
                BUY.cacheNCPAvailable = param1;
            }
            LOGGER.Log("log", "FBCNcp Not Elligible" + param1);
            BUY.FBCNcpUpgradeCB();
        }
    }

    public static FBCNcp_Click(param1: MouseEvent): void {
        if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
            GLOBAL.CallJSWithClient("cc.ncp", "fbcNcpConfirm", ["showPaymentDialog"]);
        } else {
            GLOBAL.CallJS("cc.ncp", ["showPaymentDialog", "fbcNcpConfirm"]);
        }
        POPUPS.Next();
    }

    public static FBCNcpConfirm(param1: string): void {
        let _loc3_: any = null;
        let _loc4_: int = 0;
        let _loc2_: BFOUNDATION = GLOBAL.townHall;
        if (param1 == "1") {
            _loc3_ = BASE.CanUpgrade(_loc2_);
            if (Boolean(_loc3_.error) && !_loc3_.needResource) {
                GLOBAL.Message(as3.str(_loc3_.errorMessage));
            } else {
                _loc4_ = _loc2_.InstantUpgradeCost();
                _loc2_.Upgraded();
                BASE.Purchase("NCP", 1, "upgrade");
                BUY.cacheNCPAvailable = null;
            }
        }
    }

    public static FBCNcpCancelled(param1: string = "", param2: boolean = true): void {
        if (param2) {
            if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
                GLOBAL.CallJSWithClient("cc.ncp", "fbcNcpConfirm", ["showPaymentDialog"]);
            } else {
                GLOBAL.CallJS("cc.ncp", ["userCancelled"]);
            }
        }
        POPUPS.Next();
        BUY.FBCNcpUpgradeCB();
    }

    public static FBCNcpUpgradeCB(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.isMapOpen()) {
            GLOBAL._selectedBuilding = GLOBAL.townHall;
            BUILDINGOPTIONS.Show(GLOBAL.townHall, "upgrade");
        }
    }

    private static FBCNcpRender(param1: string, param2: MovieClip): string {
        let imageContainer: MovieClip = null;
        let FortifyImageLoaded: Function = null;
        let ImageLoaded: Function = null;
        let numImageElements: Function = null;
        let DefaultImageLoaded: Function = null;
        let img: string = null;
        let nextFortifyLevel: int = 0;
        let imageDataA: any = null;
        let imageDataB: any = null;
        let imageLevel: int = 0;
        let thlvl: int = 0;
        let lowestLevel: int = 0;
        let n: string = null;
        let upgradeImgLen: int = 0;
        let i: int = 0;
        let j: int = 0;
        let str: string = param1;
        imageContainer = param2;
        let _building: BFOUNDATION = GLOBAL.townHall;
        let buildingProps: any = GLOBAL._buildingProps[_building._type - 1];
        if (str == "fortify") {
            FortifyImageLoaded = (param1: string, param2: BitmapData): void => {
                imageContainer.addChild(new Bitmap(param2));
            };
            nextFortifyLevel = (_building._fortification.Get() + 1) | 0;
            if (nextFortifyLevel > 4) {
                nextFortifyLevel = 4;
            }
            img = "fortifybuttons/" + "fort" + nextFortifyLevel + ".png";
            ImageCache.GetImageWithCallBack(img, FortifyImageLoaded);
        } else if (buildingProps.upgradeImgData) {
            ImageLoaded = (param1: string, param2: BitmapData): void => {
                imageContainer.addChild(new Bitmap(param2));
            };
            imageDataA = buildingProps.upgradeImgData;
            thlvl = GLOBAL.GetBuildingTownHallLevel(buildingProps);
            if (buildingProps.upgradeImgData) {
                lowestLevel = int.MAX_VALUE;
                for (n in buildingProps.upgradeImgData) {
                    if (!isNaN(Number(n))) {
                        lowestLevel = Math.min(lowestLevel, Number(n)) | 0;
                    }
                }
                if (lowestLevel != int.MAX_VALUE && buildingProps.upgradeImgData[lowestLevel].silhouette_img && !BASE.HasRequirements(buildingProps.costs[0])) {
                    img = String(buildingProps.upgradeImgData.baseurl + buildingProps.upgradeImgData[lowestLevel].silhouette_img);
                }
            }
            if (!img) {
                if (_building._lvl.Get() == 0) {
                    imageDataB = imageDataA[1];
                    imageLevel = 1;
                } else {
                    numImageElements = (param1: any): int => {
                        let _loc3_: string = null;
                        let _loc2_: int = 0;
                        for (_loc3_ in param1) {
                            _loc2_++;
                        }
                        return _loc2_;
                    };
                    upgradeImgLen = numImageElements(imageDataA) | 0;
                    if (Boolean(imageDataA[_building._lvl.Get()]) && imageDataA[_building._lvl.Get()] >= _building._buildingProps.hp.length) {
                        imageDataB = imageDataA[_building._lvl.Get()];
                        imageLevel = _building._lvl.Get() | 0;
                    } else {
                        i = _building._lvl.Get() | 0;
                        if (str == "upgrade") {
                            i += 1;
                        }
                        if (Boolean(imageDataA[i]) && i > _building._lvl.Get()) {
                            imageDataB = imageDataA[i];
                            imageLevel = i;
                        } else {
                            j = _building._lvl.Get() | 0;
                            while (j > 0) {
                                if (imageDataA[j]) {
                                    imageDataB = imageDataA[j];
                                    imageLevel = j;
                                    break;
                                }
                                if (j == 1) {
                                    imageDataB = imageDataB[1];
                                    imageLevel = 1;
                                    break;
                                }
                                j--;
                            }
                        }
                    }
                }
                img = String(buildingProps.upgradeImgData.baseurl + buildingProps.upgradeImgData[imageLevel].img);
            }
            ImageCache.GetImageWithCallBack(img, ImageLoaded);
        } else {
            DefaultImageLoaded = (param1: string, param2: BitmapData): void => {
                imageContainer.addChild(new Bitmap(param2));
            };
            if (Boolean(buildingProps.buildingbuttons) && Boolean(BASE._buildingsStored["bl" + _building._type]) && buildingProps.buildingbuttons.length >= BASE._buildingsStored["bl" + _building._type].Get()) {
                img = "buildingbuttons/" + buildingProps.buildingbuttons[BASE._buildingsStored["bl" + _building._type].Get() - 1] + ".jpg";
            } else if (Boolean(buildingProps.buildingbuttons) && buildingProps.buildingbuttons.length >= _building._lvl.Get()) {
                img = "buildingbuttons/" + buildingProps.buildingbuttons[_building._lvl.Get() - 1] + ".jpg";
            } else if (Boolean(buildingProps.buildingbuttons) && buildingProps.buildingbuttons.length > 0) {
                img = "buildingbuttons/" + buildingProps.buildingbuttons[0] + ".jpg";
            } else {
                img = "buildingbuttons/" + _building._type + ".jpg";
            }
            ImageCache.GetImageWithCallBack(img, DefaultImageLoaded);
        }
        return img;
    }

    public static MidGameOffers(param1: string): void {
        switch (param1) {
            case "text":
                GLOBAL.CallJS("cc.showTopup", [{ "type": "fbc", "callback": "fbcAdd" }]);
                break;
            case "gift":
                GLOBAL.CallJS("cc.showTopup", [{ "special": "gift", "callback": "fbcAdd" }]);
                break;
            case "shinydiscount":
                GLOBAL.CallJS("cc.showTopup", [{ "special": "discount", "callback": "fbcAdd" }]);
                break;
            case "shinybonus":
                GLOBAL.CallJS("cc.showTopup", [{ "special": "bonus", "callback": "fbcAdd" }]);
        }
    }

    public static purchaseReceive(param1: string): void {
        POPUPS.Next();
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.error == 0) {
            if (LOGIN.checkHash(param1)) {
                BUY.purchaseProcess(as3.cast(_loc2_.items, Array));
                BUY.purchaseComplete(param1);
                BASE._pendingPromo = 1;
                BASE.Save();
            } else {
                LOGGER.Log("err", "BUY.purchaseReceive " + param1);
            }
        }
    }

    public static purchaseComplete(param1: string): void {
        if (param1 == "biggulp") {
            SALESPECIALSPOPUP.Show("biggulp");
        } else {
            SALESPECIALSPOPUP.EndSale();
            SALESPECIALSPOPUP.Show("giftconfirm");
        }
        BASE.Save();
    }

    public static startPromo(param1: string): void {
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.endtime) {
            SALESPECIALSPOPUP.StartSale(_loc2_.endtime | 0);
        } else {
            LOGGER.Log("err", "startPromo " + _loc2_.endtime);
        }
    }

    public static purchaseProcess(param1: any[]): void {
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        let _loc2_: int = 0;
        while (_loc2_ < param1.length) {
            _loc3_ = String(param1[_loc2_][0]);
            _loc4_ = Number(param1[_loc2_][1]);
            _loc5_ = 0;
            while (_loc5_ < _loc4_) {
                if (_loc3_ == "BIGGULP") {
                    InventoryManager.buildingStorageAdd(120);
                } else {
                    STORE.AddInventory(_loc3_);
                }
                _loc5_++;
            }
            _loc2_++;
        }
    }

    public static logPromoShown(param1: string = null): void {
        LOGGER.Log("pro", "POPUPS.CallbackShiny " + param1);
    }

    public static logFB711PromoShown(param1: string = null): void {
        LOGGER.Stat([74, "popupshow"]);
    }

    public static logFB711RedeemShown(param1: string = null): void {
        if (TUTORIAL._stage < 200) {
            LOGGER.Stat([77, TUTORIAL._stage]);
        } else {
            LOGGER.Stat([78, "claimed"]);
        }
    }
}
