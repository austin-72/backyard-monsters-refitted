import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DAVEStatueReward, ExtraTilesReward, GoldenDAVEReward, KEYS, MembershipPopup, POPUPS, POPUPSETTINGS, RewardHandler, SubscriptionHandler, subscriptions_controlPanel_popup } from "@game";

export class SubscriptionControlPanelPopup extends subscriptions_controlPanel_popup {
    static {
        as3.fields(this, { bgTileSelected: 0, goldDavesToggle: 0, _tiles: null, _memberPopup: null });
    }

    public static readonly SAVE: string = "saveChanges";

    public static readonly PLACE_DAVE_STATUE: string = "placeDAVEStatue";

    public static readonly REMOVE_DAVE_STATUE: string = "removeDAVEStatue";
    public bgTileSelected: int;
    public goldDavesToggle: int;
    private _tiles: Vector<MovieClip>;
    private _memberPopup: MembershipPopup;

    public $ctor(): void {
        super.$ctor();
        this.setup();
        this.tDavesGold_title.htmlText = KEYS.Get("dc_panel_golddave");
        this.mcDave1.gotoAndStop(1);
        this.mcDave2.gotoAndStop(2);
        this.mcDavesGoldToggle.gotoAndStop(this.goldDavesToggle + 1);
        this.mcDavesGoldToggle.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedGoldDaveToggle));
        this.mcDavesGoldToggle.buttonMode = true;
        this.mcDave3.gotoAndStop(3);
        if (DAVEStatueReward.doesStatueRewardExistsInInventory()) {
            this.bPlaceDave.buttonMode = true;
            this.bPlaceDave.Setup(KEYS.Get("btn_placedave"));
            this.bPlaceDave.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedPlaceDaveStatue));
        } else {
            this.bPlaceDave.buttonMode = true;
            this.bPlaceDave.Setup(KEYS.Get("btn_removedave"));
            this.bPlaceDave.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedRemoveDaveStatue));
        }
        this.bSave.buttonMode = true;
        this.bSave.Highlight = true;
        this.bSave.Setup(KEYS.Get("btn_save"));
        this.bSave.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedSave));
        this.bMembership.Setup(KEYS.Get("btn_membership"));
        this.bMembership.buttonMode = true;
        this.bMembership.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedMembership));
        this._memberPopup = null;
        this.tMembers_title.htmlText = KEYS.Get("dc_panel_benefits");
        this.tMembers_desc.htmlText = KEYS.Get("dc_panel_benefitsdesc");
        this.tTerrainSelect.htmlText = KEYS.Get("dc_panel_terrain");
        this._tiles = Vector.from([this.mcTile1, this.mcTile2, this.mcTile3, this.mcTile4], MovieClip);
        let _loc1_: int = 0;
        while (_loc1_ < this._tiles.length) {
            as3.vget(this._tiles, _loc1_).buttonMode = true;
            as3.vget(this._tiles, _loc1_).mcSelect.visible = false;
            as3.vget(this._tiles, _loc1_).addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedBGTileSelect));
            switch (_loc1_) {
                case 0:
                    as3.vget(this._tiles, _loc1_).mcTerrain.gotoAndStop("isograss1");
                    break;
                case 1:
                    as3.vget(this._tiles, _loc1_).mcTerrain.gotoAndStop("rockgrass");
                    break;
                case 2:
                    as3.vget(this._tiles, _loc1_).mcTerrain.gotoAndStop("isosand3");
                    break;
                case 3:
                    as3.vget(this._tiles, _loc1_).mcTerrain.gotoAndStop("isocrater1");
                    break;
            }
            _loc1_++;
        }
        as3.vget(this._tiles, this.bgTileSelected).mcSelect.visible = true;
    }

    private setup(): void {
        this.bgTileSelected = RewardHandler.instance.getRewardByID(ExtraTilesReward.ID).value | 0;
        this.goldDavesToggle = RewardHandler.instance.getRewardByID(GoldenDAVEReward.ID).value | 0;
    }

    private clickedGoldDaveToggle(param1: MouseEvent = null): void {
        this.goldDavesToggle = ((this.goldDavesToggle + 1) % 2) | 0;
        this.mcDavesGoldToggle.gotoAndStop(this.goldDavesToggle + 1);
    }

    private clickedPlaceDaveStatue(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionControlPanelPopup.PLACE_DAVE_STATUE));
        this.Hide();
    }

    private clickedRemoveDaveStatue(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionControlPanelPopup.REMOVE_DAVE_STATUE));
        this.Hide();
    }

    private clickedSave(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionControlPanelPopup.SAVE));
    }

    private clickedMembership(param1: MouseEvent = null): void {
        this._memberPopup = new MembershipPopup();
        this._memberPopup.addEventListener(SubscriptionHandler.REACTIVATE, as3.bind(this, this.membershipReactivated));
        this._memberPopup.addEventListener(SubscriptionHandler.CHANGE, as3.bind(this, this.membershipChanged));
        this._memberPopup.addEventListener(SubscriptionHandler.CANCEL, as3.bind(this, this.membershipCancel));
        this._memberPopup.addEventListener(Event.CLOSE, as3.bind(this, this.clickedCloseMembership));
        POPUPS.Add(this._memberPopup);
        POPUPSETTINGS.AlignToCenter(this._memberPopup);
    }

    protected membershipReactivated(param1: Event): void {
        this.dispatchEvent(new Event(SubscriptionHandler.REACTIVATE));
    }

    private membershipChanged(param1: Event): void {
        this.dispatchEvent(new Event(SubscriptionHandler.CHANGE));
    }

    private membershipCancel(param1: Event): void {
        this.dispatchEvent(new Event(SubscriptionHandler.CANCEL));
    }

    private clickedCloseMembership(param1: Event): void {
        if (this._memberPopup) {
            this._memberPopup.removeEventListener(SubscriptionHandler.REACTIVATE, as3.bind(this, this.membershipReactivated));
            this._memberPopup.removeEventListener(SubscriptionHandler.CHANGE, as3.bind(this, this.membershipChanged));
            this._memberPopup.removeEventListener(SubscriptionHandler.CANCEL, as3.bind(this, this.membershipCancel));
            this._memberPopup.removeEventListener(Event.CLOSE, as3.bind(this, this.clickedCloseMembership));
        }
        POPUPS.Remove(this._memberPopup);
    }

    private clickedBGTileSelect(param1: MouseEvent = null): void {
        let _loc2_: int = 0;
        while (_loc2_ < this._tiles.length) {
            as3.vget(this._tiles, _loc2_).mcSelect.visible = false;
            if (param1.currentTarget == as3.vget(this._tiles, _loc2_)) {
                this.bgTileSelected = _loc2_;
            }
            _loc2_++;
        }
        param1.currentTarget.mcSelect.visible = true;
    }

    public Hide(param1: MouseEvent = null): void {
        this.mcDavesGoldToggle.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedGoldDaveToggle));
        this.bPlaceDave.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedPlaceDaveStatue));
        this.bSave.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedSave));
        this.bMembership.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedMembership));
        this.dispatchEvent(new Event(Event.CLOSE));
    }
}
