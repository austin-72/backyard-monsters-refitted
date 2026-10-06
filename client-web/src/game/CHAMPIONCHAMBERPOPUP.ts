import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { CHAMPIONCAGE, CHAMPIONCAGEPOPUP, CHAMPIONCHAMBER, ChampionChamberFrozen, Circ, GLOBAL, GUARDIANCHAMBERPOPUP_CLIP, ImageCache, KEYS, POPUPSETTINGS, ScrollSetH, TweenLite } from "@game";

export class CHAMPIONCHAMBERPOPUP extends GUARDIANCHAMBERPOPUP_CLIP {
    static {
        as3.fields(this, { _guardChamber: null, _selectGuard: null, _slots: null, _activeSlot: null, _cubeContainer: null });
    }

    private _guardChamber: CHAMPIONCHAMBER;
    private _selectGuard: any;
    private _slots: Vector<ChampionChamberFrozen>;
    private _activeSlot: ChampionChamberFrozen;
    private _cubeContainer: Sprite;

    public $ctor(): void {
        super.$ctor();
        this._guardChamber = as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER);
        this._slots = new Vector<ChampionChamberFrozen>(0, false, ChampionChamberFrozen);
        this.tTitle.htmlText = KEYS.Get("chamber_title");
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
        let _loc3_: int = 0;
        let _loc4_: any = null;
        let _loc5_: ChampionChamberFrozen = null;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc8_: any = null;
        let _loc1_: Sprite = new Sprite();
        _loc1_.x = this.mcMask.x;
        _loc1_.y = this.mcMask.y;
        this.addChild(_loc1_);
        let _loc2_: int = 0;
        for (_loc4_ of as3.values(CHAMPIONCAGE.GetAllGuardianData())) {
            _loc5_ = new ChampionChamberFrozen();
            _loc6_ = _loc4_.l.Get() | 0;
            _loc7_ = "G" + _loc4_.t;
            _loc8_ = CHAMPIONCAGE._guardians[_loc7_];
            _loc5_.name = as3.str(_loc4_.t.toString());
            _loc5_.tName.htmlText = "<b>" + KEYS.Get(as3.str(_loc8_.title)) + "</b><br>" + KEYS.Get("chamber_level", { "v1": _loc6_ });
            ImageCache.GetImageWithCallBack("monsters/" + _loc7_ + "_L" + _loc6_ + "-150.png", as3.bind(this, this.onImageLoad), true, 4, "", [_loc5_.mcImage]);
            _loc5_.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.rollOverChampion));
            _loc5_.x = _loc3_;
            _loc1_.addChild(_loc5_);
            if (_loc3_ == 0) {
                this.SelectGuard(_loc4_.t | 0);
            }
            _loc3_ = (_loc3_ + (_loc5_.width + _loc2_)) | 0;
            this._slots.push(_loc5_);
            this.updateSlot(_loc5_, _loc4_.t | 0);
        }
        return _loc1_;
    }

    private updateSlot(param1: ChampionChamberFrozen, param2: int): void {
        let _loc3_: boolean = CHAMPIONCHAMBER.HasFrozen(param2);
        let _loc4_: string = String(CHAMPIONCAGE._guardians["G" + param2].name);
        if (_loc3_) {
            param1.gotoAndStop("frozen");
            param1.bFreeze.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedFreeze));
            param1.bFreeze.Setup(KEYS.Get("btn_thawname", { "v1": _loc4_ }), false, 0, 0);
            param1.bFreeze.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedThaw));
        } else {
            param1.gotoAndStop("thaw");
            param1.bFreeze.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedThaw));
            param1.bFreeze.Setup(KEYS.Get("btn_freezename", { "v1": _loc4_ }), false, 0, 0);
            param1.bFreeze.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedFreeze));
        }
    }

    private onImageLoad(param1: string, param2: BitmapData, param3: any[] = null): void {
        as3.cast(param3[0], MovieClip).addChild(new Bitmap(param2));
    }

    private clickedFreeze(param1: MouseEvent): void {
        let _loc2_: string = String(param1.currentTarget.parent.name);
        let _loc3_: int = Number(_loc2_.substr(_loc2_.length - 1)) | 0;
        this.FreezeGuard(_loc3_);
    }

    private clickedThaw(param1: MouseEvent): void {
        let _loc2_: string = String(param1.currentTarget.parent.name);
        let _loc3_: int = Number(_loc2_.substr(_loc2_.length - 1)) | 0;
        this.ThawGuard(_loc3_);
    }

    private rollOverChampion(param1: MouseEvent): void {
        let _loc2_: string = String(param1.currentTarget.name);
        let _loc3_: int = Number(_loc2_.substr(_loc2_.length - 1)) | 0;
        this.SelectGuard(_loc3_);
    }

    public FreezeGuard(param1: int = 0): void {
        this._guardChamber.FreezeGuardian();
        this.Hide();
    }

    private ThawGuard(param1: int = 0): void {
        this._guardChamber.ThawGuardian(param1);
        this.Hide();
    }

    public SelectGuard(param1: int = 1): void {
        this.UpdateStats(CHAMPIONCAGE.GetGuardianData(param1));
    }

    private UpdateStats(param1: any = null): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: any = null;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        if (param1) {
            _loc2_ = param1.t | 0;
            _loc3_ = param1.l.Get() | 0;
            _loc4_ = param1.fb.Get() | 0;
            _loc5_ = "G" + _loc2_;
            _loc6_ = "monsters/" + "G" + _loc2_ + "_L" + _loc3_ + "-150.png";
            if (_loc6_) {
                ImageCache.GetImageWithCallBack(as3.str(_loc6_), as3.bind(this, this.UpdateSelectImage));
            }
            this.damage_txt.htmlText = "<b>" + KEYS.Get("gcage_labelDamage") + "</b>";
            this.health_txt.htmlText = "<b>" + KEYS.Get("gcage_labelHealth") + "</b>";
            this.speed_txt.htmlText = "<b>" + KEYS.Get("gcage_labelSpeed") + "</b>";
            this.buff_txt.htmlText = "<b>" + KEYS.Get("gcage_labelBuff") + "</b>";
            this.tEvoStage.htmlText = "<b>" + CHAMPIONCAGE._guardians["G" + _loc2_].name + "</b> " + KEYS.Get("chamber_level", { "v1": _loc3_ });
            this.tEvoDesc.htmlText = KEYS.Get(as3.str(CHAMPIONCAGE._guardians["G" + _loc2_].description));
            _loc7_ = Number(CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc3_, "damage"));
            _loc8_ = Number(CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc3_, "health"));
            _loc9_ = Number(CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc3_, "speed"));
            _loc10_ = CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc3_, "buffs") * 100;
            if (_loc4_ > 0) {
                _loc7_ = Number(_loc7_ + CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc4_, "bonusDamage"));
                _loc8_ = Number(_loc8_ + CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc4_, "bonusHealth"));
                _loc9_ = Number(_loc9_ + CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc4_, "bonusSpeed"));
                _loc10_ += CHAMPIONCAGE.GetGuardianProperty(_loc5_, _loc4_, "bonusBuffs") * 100;
            }
            _loc11_ = ((_loc9_ * 10) | 0) / 10;
            this.tDamage.htmlText = as3.str(_loc7_.toString());
            this.tHealth.htmlText = as3.str(_loc8_.toString());
            this.tSpeed.htmlText = as3.str(_loc11_.toString());
            this.tBuff.htmlText = (_loc10_ | 0) + "%";
            TweenLite.to(this.bDamage.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxDamage * _loc7_, "ease": Circ.easeInOut });
            TweenLite.to(this.bHealth.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxHealth * _loc8_, "ease": Circ.easeInOut });
            TweenLite.to(this.bSpeed.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxSpeed * _loc9_, "ease": Circ.easeInOut });
            TweenLite.to(this.bBuff.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxBuff * _loc10_, "ease": Circ.easeInOut });
        }
    }

    private UpdateSelectImage(param1: string, param2: BitmapData): void {
        let _loc3_: int = this.selectedImage.numChildren;
        while (_loc3_--) {
            this.selectedImage.removeChildAt(_loc3_);
        }
        let _loc4_: Bitmap = new Bitmap(param2);
        this.selectedImage.addChild(_loc4_);
    }

    public Hide(param1: MouseEvent = null): void {
        CHAMPIONCHAMBER.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}

class ChampionSlot extends ASObject {
    static {
        as3.fields(this, { graphic: null, championProperties: null, championObject: null, type: 0 });
    }

    public graphic: ChampionChamberFrozen;
    public championProperties: any;
    public championObject: any;
    public type: int;

    public $ctor(): void {
        super.$ctor();
    }
}
