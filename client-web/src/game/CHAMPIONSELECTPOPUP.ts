import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, Button, CHAMPIONCAGE, CHAMPIONCHAMBER, ChampionBase, GLOBAL, GUARDIANSELECTPOPUP_CLIP, ImageCache, KEYS, LOGGER, POPUPSETTINGS, ScrollSetH, guardianselect_selectportrait_CLIP } from "@game";

export class CHAMPIONSELECTPOPUP extends GUARDIANSELECTPOPUP_CLIP {
    static {
        as3.fields(this, { _guardCage: null });
    }

    private _guardCage: CHAMPIONCAGE;

    public $ctor(): void {
        super.$ctor();
        this._guardCage = as3.as(GLOBAL._bCage, CHAMPIONCAGE);
        this.tTitle.htmlText = KEYS.Get("popup_championselecttitle");
        this.createScrollBar(this.createSlots());
    }

    private createScrollBar(param1: Sprite): void {
        let _loc2_: ScrollSetH = null;
        param1.mask = this.mcMask;
        _loc2_ = new ScrollSetH(param1, this.mcMask);
        _loc2_.x = param1.x;
        _loc2_.y = param1.y + param1.height;
        this.addChild(_loc2_);
    }

    private createSlots(): Sprite {
        let _loc1_: Sprite = null;
        let _loc3_: int = 0;
        let _loc5_: guardianselect_selectportrait_CLIP = null;
        let _loc6_: any = null;
        let _loc7_: Button = null;
        _loc1_ = new Sprite();
        _loc1_.x = this.mcMask.x;
        _loc1_.y = this.mcMask.y;
        this.addChild(_loc1_);
        let _loc2_: int = 10;
        let _loc4_: int = CHAMPIONCAGE._guardians.length | 0;
        while (_loc4_ > 0) {
            if (CHAMPIONCAGE.CanTrainGuardian(_loc4_)) {
                _loc5_ = new guardianselect_selectportrait_CLIP();
                _loc6_ = CHAMPIONCAGE._guardians["G" + _loc4_];
                _loc5_.tGuard_label.htmlText = "<b>" + KEYS.Get(as3.str(_loc6_.title)) + "<b>";
                _loc5_.tGuard_desc.htmlText = "<b>" + KEYS.Get(as3.str(_loc6_.description)) + "<b>";
                _loc5_.name = as3.str(_loc4_.toString());
                (_loc7_ = _loc5_.bAction).Setup(KEYS.Get("btn_raisechampion", { "v1": _loc6_.name }), false, 0, 0);
                ImageCache.GetImageWithCallBack(as3.str(_loc6_.selectGraphic), as3.bind(this, this.onImageLoad), true, 4, "", [_loc5_.mcImage]);
                _loc7_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedRaise));
                _loc5_.x = _loc3_;
                _loc1_.addChild(_loc5_);
                _loc3_ = (_loc3_ + (_loc5_.width + _loc2_)) | 0;
            }
            _loc4_--;
        }
        return _loc1_;
    }

    private onImageLoad(param1: string, param2: BitmapData, param3: any[] = null): void {
        as3.cast(param3[0], MovieClip).addChild(new Bitmap(param2));
    }

    private clickedRaise(param1: MouseEvent): void {
        let _loc2_: string = String(param1.currentTarget.parent.name);
        let _loc3_: int = Number(_loc2_.substr(_loc2_.length - 1)) | 0;
        this.RaiseGuard(_loc3_);
    }

    private RaiseGuard(param1: int): void {
        let _loc2_: string = null;
        let _loc3_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            _loc2_ = "G" + param1;
            if (CHAMPIONCHAMBER.HasFrozen(param1)) {
                GLOBAL.Message(KEYS.Get("championchamber_alreadyfrozen", { "v1": CHAMPIONCAGE._guardians[_loc2_].name }));
                return;
            }
            _loc3_ = BASE.getGuardianIndex(param1);
            if (_loc3_ >= 0) {
                as3.vget(BASE._guardianData, _loc3_).status = ChampionBase.k_CHAMPION_STATUS_NORMAL;
            }
            this._guardCage.SpawnGuardian(1, 0, 0, param1, CHAMPIONCAGE.GetGuardianProperty(_loc2_, 1, "health") | 0, "", 0, CHAMPIONCAGE._guardians[_loc2_].props.powerLevel | 0);
            LOGGER.Stat([52, _loc2_, 2]);
            BASE.Save(0, false, true);
            this.Hide();
        }
    }

    public Hide(param1: MouseEvent = null): void {
        CHAMPIONCAGE.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
