import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BASE, GLOBAL, ImageCache, KEYS, MapRoomPopup_Migrate_CLIP, POPUPSETTINGS, icon_costs } from "@game";

export class PopupMigrate extends MapRoomPopup_Migrate_CLIP {
    static {
        as3.fields(this, { _closeHandler: null });
    }

    private static instance: PopupMigrate = null;
    private _closeHandler: Function;

    public $ctor(param1: Function = null): void {
        let _loc5_: icon_costs = null;
        super.$ctor();
        this._closeHandler = param1;
        let _loc2_: int = GLOBAL._bMap.InstantUpgradeCost();
        let _loc3_: any = GLOBAL._bMap.UpgradeCost();
        this.tTitle.htmlText = KEYS.Get("msg_mr2pop_title");
        this.tDescription.htmlText = KEYS.Get("msg_mr2pop_desc");
        ImageCache.GetImageWithCallBack("popups/outpost-takeover.png", as3.bind(this, this.onAssetLoaded));
        this.mcInstant.tDescription.htmlText = KEYS.Get("buildoptions_upgradeinstant");
        this.mcInstant.bAction.Setup("<b>" + KEYS.Get("btn_useshiny", { "v1": _loc2_ }) + "</b>");
        this.mcInstant.bAction.Highlight = true;
        this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantUpgrade), false, 0, true);
        this.mcInstant.gCoin.mouseEnabled = false;
        this.mcInstant.gCoin.mouseChildren = false;
        this.mcResources.bAction.SetupKey("buildoptions_resources");
        this.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Upgrade), false, 0, true);
        let _loc4_: any[] = GLOBAL._resourceNames;
        let _loc6_: int = 1;
        while (_loc6_ < 5) {
            (_loc5_ = as3.as(this.mcResources["mcR" + _loc6_], icon_costs)).tTitle.htmlText = "<b>" + KEYS.Get(as3.str(_loc4_[_loc6_ - 1])) + "</b>";
            _loc5_.tValue.htmlText = "<b>" + GLOBAL.FormatNumber(Number(_loc3_["r" + _loc6_])) + "</b>";
            if (Boolean(BASE._resources["r" + _loc6_]) && BASE._resources["r" + _loc6_].Get() < _loc3_["r" + _loc6_]) {
                _loc5_.tValue.htmlText = "<font color=\"#FF0000\">" + _loc5_.tValue.htmlText + "</font>";
            }
            _loc5_.gotoAndStop(_loc6_);
            _loc6_++;
        }
        _loc5_ = as3.cast(this.mcResources.mcTime, icon_costs);
        this.mcResources.mcTime.tTitle.htmlText = "<b>" + KEYS.Get(as3.str(_loc4_[5])) + "</b>";
        this.mcResources.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime(_loc3_.time | 0, true, false) + "</b>";
        this.mcResources.mcTime.gotoAndStop(_loc6_);
    }

    public static Show(param1: Function = null): void {
        if (PopupMigrate.instance) {
            PopupMigrate.Hide();
        }
        PopupMigrate.instance = new PopupMigrate(param1);
        GLOBAL._layerWindows.addChild(PopupMigrate.instance);
        POPUPSETTINGS.AlignToCenter(PopupMigrate.instance);
        POPUPSETTINGS.ScaleUp(PopupMigrate.instance);
    }

    public static Hide(): void {
        if (!PopupMigrate.instance) {
            return;
        }
        GLOBAL._layerWindows.removeChild(PopupMigrate.instance);
        PopupMigrate.instance = null;
    }

    public Hide(): void {
        if (Boolean(this._closeHandler)) {
            this._closeHandler();
        }
        PopupMigrate.Hide();
    }

    private onAssetLoaded(param1: string, param2: BitmapData): void {
        this.mcImage.addChild(new Bitmap(param2));
    }

    private InstantUpgrade(param1: Event): void {
        this.Hide();
        GLOBAL._bMap.DoInstantUpgrade();
    }

    private Upgrade(param1: Event): void {
        this.Hide();
        GLOBAL._bMap.Upgrade();
    }
}
