import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Event, MouseEvent } from "flash/events";
import { ABTest, BASE, BFOUNDATION, BasePlanner, DAVEStatueReward, ExtraTilesReward, FrontPageHandler, FrontPageLibrary, GLOBAL, GoldenDAVEReward, IHandler, ImprovedHCCReward, KEYS, LOGGER, LOGIN, POPUPS, Promo01DaveClub, Promo02DaveClub, Reward, RewardHandler, SubscriptionControlPanelPopup, SubscriptionJoinPopup, SubscriptionResourceIcon, SubscriptionService, SubscriptionStatusEvent, UI2, YardPlannerExtraSlotsReward } from "@game";

export class SubscriptionHandler extends ASObject implements IHandler {
    static {
        as3.implement(this, [IHandler]);
        as3.fields(this, { _rewardIDs: null, _renewalDate: 0, _expirationDate: 0, _icon: null, _service: null, _subscriptionID: NaN });
    }

    public static readonly JOIN: string = "startSubscription";

    public static readonly CANCEL: string = "cancelSubscription";

    public static readonly CANCELCONFIRM: string = "cancelConfirmation";

    public static readonly CLOSECONFIRM: string = "closeConfirmation";

    public static readonly CHANGE: string = "changeSubscription";

    public static readonly REACTIVATE: string = "reactiveSubscription";

    private static _instance: SubscriptionHandler = null;

    public static ignoreAB: boolean = false;
    private _rewardIDs: Vector<string>;
    private _renewalDate: uint;
    private _expirationDate: uint;
    private _icon: SubscriptionResourceIcon;
    private _service: SubscriptionService;
    private _subscriptionID: number;

    public $ctor(): void {
        this._rewardIDs = Vector.from([ImprovedHCCReward.ID, DAVEStatueReward.ID, GoldenDAVEReward.ID, ExtraTilesReward.ID, YardPlannerExtraSlotsReward.ID], String);
        super.$ctor();
    }

    public static get instance(): SubscriptionHandler {
        if (!SubscriptionHandler._instance) {
            SubscriptionHandler._instance = new SubscriptionHandler();
            SubscriptionHandler._instance._service = new SubscriptionService();
        }
        return SubscriptionHandler._instance;
    }

    public static get isEnabledForAll(): boolean {
        return GLOBAL._flags["subscriptions"] > 0 && GLOBAL._flags["subscriptions_ab"] == 0;
    }

    public static setRenewalDateDEBUG(param1: uint): void {
        SubscriptionHandler._instance._renewalDate = param1;
        SubscriptionHandler._instance.updateSubscriptionStatus();
    }

    public static setExpirationDateDEBUG(param1: uint): void {
        SubscriptionHandler._instance._expirationDate = param1;
        SubscriptionHandler._instance.updateSubscriptionStatus();
    }

    public get name(): string {
        return "subscriptions";
    }

    public get isSubscriptionActive(): boolean {
        // return Boolean(this._renewalDate) || Boolean(this._expirationDate);
        return true;
    }

    public get renewalDate(): uint {
        return this._renewalDate;
    }

    public get expirationDate(): uint {
        return this._expirationDate;
    }

    public get service(): SubscriptionService {
        return SubscriptionHandler._instance._service;
    }

    private specialUser(): boolean {
        return SubscriptionHandler.ignoreAB || (LOGIN._playerID == 12467111 || LOGIN._playerID == 3099454);
    }

    public initialize(param1: any = null): void {
        if (!SubscriptionHandler.isEnabledForAll && !ABTest.isInTestGroup("davesclub108", 64) && !this.specialUser() || !GLOBAL.isAtHome() || !GLOBAL._flags["subscriptions"] || GLOBAL.isNoob()) {
            return;
        }
        this.unlockTeaserInformation();
        this.addIcon();
        this._service.addEventListener(SubscriptionStatusEvent.STATUS_EVENT, as3.bind(this, this.recievedSubscriptionData));
        this._service.getSubscriptionData();
    }

    protected recievedSubscriptionData(param1: SubscriptionStatusEvent): void {
        this._subscriptionID = param1.subscriptionID;
        this._renewalDate = param1.renewalDate;
        this._expirationDate = param1.expirationDate;
        this.updateSubscriptionStatus();
    }

    private updateSubscriptionStatus(): void {
        this.updateRewards();
        this._icon.update(this.isSubscriptionActive);
        let _loc1_: Promo01DaveClub = as3.as(FrontPageLibrary.getMessageByName(Promo01DaveClub.NAME), Promo01DaveClub);
        let _loc2_: Promo02DaveClub = as3.as(FrontPageLibrary.getMessageByName(Promo02DaveClub.NAME), Promo02DaveClub);
        if (_loc1_ && !ABTest.isInTestGroup("davesclub108", 64) && !this.isSubscriptionActive) {
            _loc1_.canBeShown = true;
        } else if (_loc2_ && ABTest.isInTestGroup("davesclub108", 64) && SubscriptionHandler.isEnabledForAll) {
            _loc2_.canBeShown = true;
        }
        if (!_loc1_ && !_loc2_) {
            return;
        }
        if (FrontPageHandler.hasBeenSetupThisSession == false) {
            return;
        }
        if (FrontPageHandler.hasBeenSeenThisSession == false || FrontPageHandler.isVisible) {
            FrontPageHandler.showPopup(true);
        } else if (POPUPS.hasPopupsOpen()) {
            FrontPageHandler.refresh();
        }
    }

    private unlockTeaserInformation(): void {
        let _loc1_: DAVEStatueReward = as3.as(RewardHandler.instance.getRewardByID(DAVEStatueReward.ID), DAVEStatueReward);
        if (_loc1_ == null || _loc1_.hasBeenApplied == false) {
            DAVEStatueReward.unlockTeaserInformation(as3.bind(this, this.showPromoPopup));
        }
        if (SubscriptionHandler.isEnabledForAll) {
            BasePlanner.maxNumberOfSlots = 10;
        }
    }

    private addIcon(): void {
        this._icon = new SubscriptionResourceIcon(this.isSubscriptionActive);
        UI2._top.addResourceBar(this._icon);
        this._icon.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedIcon), false, 0, true);
    }

    protected clickedIcon(param1: Event): void {
        if (this.isSubscriptionActive) {
            this.showControlPanel();
        } else {
            GLOBAL.Message(KEYS.Get("disabled_daveclub"));
        }
    }

    private showControlPanel(): void {
        let _loc1_: SubscriptionControlPanelPopup = new SubscriptionControlPanelPopup();
        POPUPS.Push(_loc1_);
        _loc1_.addEventListener(Event.CLOSE, as3.bind(this, this.clickedClosePanel));
        _loc1_.addEventListener(SubscriptionHandler.CHANGE, as3.bind(this, this.clickedChange));
        _loc1_.addEventListener(SubscriptionHandler.CANCEL, as3.bind(this, this.clickedCancel));
        _loc1_.addEventListener(SubscriptionHandler.REACTIVATE, as3.bind(this, this.clickedReactivate));
        _loc1_.addEventListener(SubscriptionControlPanelPopup.PLACE_DAVE_STATUE, as3.bind(this, this.clickedPlace));
        _loc1_.addEventListener(SubscriptionControlPanelPopup.REMOVE_DAVE_STATUE, as3.bind(this, this.clickedRemove));
        _loc1_.addEventListener(SubscriptionControlPanelPopup.SAVE, as3.bind(this, this.clickedSave));
    }

    protected clickedClosePanel(param1: Event): void {
        let _loc2_: SubscriptionControlPanelPopup = as3.as(param1.target, SubscriptionControlPanelPopup);
        _loc2_.removeEventListener(Event.CLOSE, as3.bind(this, this.clickedClosePanel));
        _loc2_.removeEventListener(SubscriptionHandler.CHANGE, as3.bind(this, this.clickedChange));
        _loc2_.removeEventListener(SubscriptionHandler.CANCEL, as3.bind(this, this.clickedCancel));
        _loc2_.removeEventListener(SubscriptionHandler.REACTIVATE, as3.bind(this, this.clickedReactivate));
        _loc2_.removeEventListener(SubscriptionControlPanelPopup.PLACE_DAVE_STATUE, as3.bind(this, this.clickedPlace));
        _loc2_.removeEventListener(SubscriptionControlPanelPopup.REMOVE_DAVE_STATUE, as3.bind(this, this.clickedRemove));
        _loc2_.removeEventListener(SubscriptionControlPanelPopup.SAVE, as3.bind(this, this.clickedSave));
        POPUPS.Next();
    }

    protected clickedReactivate(param1: Event): void {
        this._service.reactivateSubscription(this._subscriptionID);
    }

    protected clickedChange(param1: Event): void {
        this._service.changeSubscription(this._subscriptionID);
    }

    protected clickedCancel(param1: Event): void {
        this._service.cancelSubscription(this._subscriptionID);
    }

    protected clickedPlace(param1: Event): void {
        LOGGER.StatB({ "st1": "daves_club" }, "golden_dave_placed");
        BASE.addBuildingB(DAVEStatueReward.DAVE_STATUE_TYPE_ID, true);
    }

    protected clickedRemove(param1: Event): void {
        let _loc2_: BFOUNDATION = DAVEStatueReward.findStatueRewardInWorld();
        if (_loc2_ != null) {
            _loc2_.RecycleC();
        }
    }

    protected clickedSave(param1: Event): void {
        let _loc2_: SubscriptionControlPanelPopup = as3.as(param1.target, SubscriptionControlPanelPopup);
        let _loc3_: Reward = RewardHandler.instance.getRewardByID(GoldenDAVEReward.ID);
        if (this.updateRewardValue(_loc3_, _loc2_.goldDavesToggle)) {
            if (_loc2_.goldDavesToggle) {
                LOGGER.StatB({ "st1": "daves_club" }, "dave_on");
            } else {
                LOGGER.StatB({ "st1": "daves_club" }, "dave_off");
            }
        }
        _loc3_ = RewardHandler.instance.getRewardByID(ExtraTilesReward.ID);
        this.updateRewardValue(_loc3_, _loc2_.bgTileSelected);
        POPUPS.Next();
        BASE.Save();
    }

    private updateRewardValue(param1: Reward, param2: number): boolean {
        if (param1.value == param2) {
            return false;
        }
        param1.value = param2;
        RewardHandler.instance.applyReward(param1);
        return true;
    }

    public showPromoPopup(): void {
        if (this.isSubscriptionActive) {
            let _loc1_: SubscriptionJoinPopup = new SubscriptionJoinPopup();
            POPUPS.Push(_loc1_);
            _loc1_.addEventListener(SubscriptionHandler.JOIN, as3.bind(this, this.clickedJoin));
            _loc1_.addEventListener(Event.CLOSE, as3.bind(this, this.clickedClose));
        } else {
            GLOBAL.Message(KEYS.Get("disabled_daveclub"));
        }
    }

    protected clickedJoin(param1: Event): void {
        this._service.startSubscription();
        this.clickedClose(param1);
    }

    protected clickedClose(param1: Event): void {
        let _loc2_: SubscriptionJoinPopup = as3.as(param1.target, SubscriptionJoinPopup);
        _loc2_.removeEventListener(SubscriptionHandler.JOIN, as3.bind(this, this.clickedJoin));
        _loc2_.removeEventListener(Event.CLOSE, as3.bind(this, this.clickedClose));
        POPUPS.Next();
    }

    private updateRewards(): void {
        let _loc2_: Reward = null;
        let _loc1_: int = 0;
        while (_loc1_ < this._rewardIDs.length) {
            if (this.isSubscriptionActive) {
                _loc2_ = RewardHandler.instance.updateExistingOrAddNewReward(as3.vget(this._rewardIDs, _loc1_));
                if (!_loc2_.hasBeenApplied) {
                    RewardHandler.instance.applyReward(_loc2_);
                }
            } else {
                RewardHandler.instance.removeRewardByID(as3.vget(this._rewardIDs, _loc1_));
            }
            _loc1_++;
        }
    }

    public importData(param1: any): void {
        this._renewalDate = GLOBAL.StatGet("renewal") >>> 0;
        this._expirationDate = GLOBAL.StatGet("expiration") >>> 0;
        this.updateRewards();
    }

    public exportData(): any {
        GLOBAL.StatSet("renewal", this._renewalDate, false);
        GLOBAL.StatSet("expiration", this._expirationDate, false);
        return null;
    }
}
