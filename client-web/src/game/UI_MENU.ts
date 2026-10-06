import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, MovieClip, Sprite } from "flash/display";
import { Rectangle } from "flash/geom";
import { BASE, GLOBAL, ImageCache, MapRoomManager, ScaleBitmap, StoneButton, UI_BOTTOM } from "@game";

export class UI_MENU extends Sprite {
    static {
        as3.fields(this, { woodmargin: 10, wood: null, bBuild: null, bQuests: null, bStore: null, bMap: null, bKits: null, buttonspacing: 3, _loaded: false, _sorted: false, wood_mc: null });
    }

    public woodmargin: int;
    public wood: ScaleBitmap;
    public bBuild: StoneButton;
    public bQuests: StoneButton;
    public bStore: StoneButton;
    public bMap: StoneButton;
    public bKits: StoneButton;
    public buttonspacing: int;
    public _loaded: boolean;
    public _sorted: boolean;
    public wood_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.bBuild = new StoneButton();
        this.bQuests = new StoneButton();
        this.bStore = new StoneButton();
        this.bMap = new StoneButton();
        if (BASE.isOutpostMapRoom2Only) {
            this.bKits = new StoneButton();
        }
    }

    public Setup(): void {
        let cbf1: Function = null;
        cbf1 = (): void => {
            let cbf2: Function = null;
            cbf2 = (param1: string, param2: BitmapData): void => {
                this.wood = new ScaleBitmap(param2.clone());
                this.wood.scale9Grid = new Rectangle(15, 15, 10, 10);
                this.addChild(this.wood);
                this.addChild(this.bBuild);
                if (MapRoomManager.instance.isInMapRoom3 && !BASE.isMainYardOrInfernoMainYard) {
                    this.bBuild.Enabled = false;
                }
                if (GLOBAL._loadmode == GLOBAL.mode) {
                    this.addChild(this.bQuests);
                }
                this.addChild(this.bStore);
                this.addChild(this.bMap);
                if (BASE.isOutpostMapRoom2Only) {
                    this.addChild(this.bKits);
                }
                this.sortAll();
                this._loaded = true;
                UI_BOTTOM.Resize();
                UI_BOTTOM.Update();
            };
            this.bBuild.SetupKey("ui_topbuildings", 12);
            if (GLOBAL._loadmode == GLOBAL.mode) {
                this.bQuests.SetupKey("ui_topquests", 12);
            }
            this.bStore.SetupKey("ui_topstore", 12);
            this.bMap.SetupKey("ui_topmap", 12);
            if (BASE.isOutpostMapRoom2Only) {
                this.bKits.SetupKey("btn_kits", 12);
            }
            if (GLOBAL.InfernoMode()) {
                ImageCache.GetImageWithCallBack("ui/stonemenu2.png", cbf2);
            } else {
                ImageCache.GetImageWithCallBack("ui/wood1.png", cbf2);
            }
        };
        if (GLOBAL.InfernoMode()) {
            ImageCache.GetImageGroupWithCallBack("bottom_ui_inferno", ["ui/lava1.png", "ui/lava2.png", "ui/lava3.png", "ui/stonemenu2.png"], cbf1, true, 1);
        } else {
            ImageCache.GetImageGroupWithCallBack("bottom_ui", ["ui/wood1.png", "ui/stone1.png", "ui/stone2.png", "ui/stone3.png"], cbf1, true, 1);
        }
    }

    public sortAll(): boolean {
        let _loc1_: any[] = null;
        let _loc2_: StoneButton = null;
        let _loc3_: StoneButton = null;
        let _loc4_: number = NaN;
        if (BASE.isOutpostMapRoom2Only) {
            _loc1_ = [this.bKits, this.bBuild, this.bQuests, this.bStore, this.bMap];
        } else if (GLOBAL.mode != GLOBAL._loadmode) {
            _loc1_ = [this.bBuild, this.bStore, this.bMap];
        } else {
            _loc1_ = [this.bBuild, this.bQuests, this.bStore, this.bMap];
        }
        for (_loc3_ of as3.values(_loc1_)) {
            if (_loc3_._bm == null) {
                return false;
            }
            if (!_loc2_) {
                _loc3_.x = this.woodmargin;
            } else {
                _loc3_.x = _loc2_.x + _loc2_.getButtonWidth() + this.buttonspacing;
            }
            _loc3_.y = this.wood.height * 0.5 - _loc3_.getButtonHeight() * 0.5;
            _loc2_ = _loc3_;
        }
        _loc4_ = this.bMap.x + this.bMap.width + this.woodmargin;
        this.wood.setSize(_loc4_, this.wood.height);
        this._sorted = true;
        return true;
    }

    public Resize(): void {
        if (this._loaded) {
            this.x = (GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - (this.wood.width + 10)) | 0;
            this.y = (GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - this.wood.height - 10) | 0;
            if (Boolean(UI_BOTTOM._missions) && Boolean(UI_BOTTOM._missions.frame)) {
                this.y = (UI_BOTTOM._missions.y + UI_BOTTOM._missions.frame.y - this.wood.height) | 0;
            }
        }
    }
}
