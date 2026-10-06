import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BFOUNDATION, BUILDINGBUTTON, BUILDINGBUTTONSOON, BUILDINGOPTIONSPOPUP, BUILDINGS, BUILDINGSPOPUP_CLIP, Button, Button_CLIP, GLOBAL, InstanceManager, InventoryManager, IoPetsPanel, KEYS, POPUPSETTINGS, SOUNDS, TUTORIAL } from "@game";

export class BUILDINGSPOPUP extends BUILDINGSPOPUP_CLIP {
    static {
        as3.fields(this, { _subButtonsMC: null, _thumbnailsMC: null, _buildingInfoMC: null, _pageCount: 0, _excluded: null, _subButtons: null });
    }

    /** Inferno-only: the Decorations' Pets tab (its sub-menu index). */
    public static readonly IO_PETS_TAB: int = 5;
    public _subButtonsMC: MovieClip;
    public _thumbnailsMC: MovieClip;
    public _buildingInfoMC: BUILDINGOPTIONSPOPUP;
    public _pageCount: int;
    public _excluded: any[];
    public _subButtons: any[];

    public $ctor(): void {
        super.$ctor();
        this._subButtonsMC = null;
        this._thumbnailsMC = null;
        this._buildingInfoMC = null;
        this._pageCount = 0;
        this.mcNew.visible = GLOBAL._newThings;
        this.b1.SetupKey("btn_resources");
        this.b2.SetupKey("btn_buildings");
        this.b3.SetupKey("btn_defensive");
        this.b4.SetupKey("btn_decorations");
        this.b1.addEventListener(MouseEvent.CLICK, this.Switch(1, 1, 0));
        this.b2.addEventListener(MouseEvent.CLICK, this.Switch(2, 1, 0));
        this.b3.addEventListener(MouseEvent.CLICK, this.Switch(3, 1, 0));
        this.b4.addEventListener(MouseEvent.CLICK, this.Switch(4, 0, 0));
        this.bPrevious.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Previous));
        this.bPrevious.buttonMode = true;
        this.bNext.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Next));
        this.bNext.buttonMode = true;
        if (!GLOBAL.townHall) {
            this.SwitchB(2, 1, 0);
        } else {
            this.SwitchB(BUILDINGS._menuA, BUILDINGS._menuB, BUILDINGS._page);
        }
        if (BASE.isMainYard) {
            if (!GLOBAL._flags.radio) {
                GLOBAL._buildingProps[112].block = true;
                GLOBAL._buildingProps[11].order = 2;
            }
        }
    }

    public Switch(param1: int, param2: int, param3: int): Function {
        let a: int = 0;
        let b: int = 0;
        let p: int = 0;
        a = param1;
        b = param2;
        p = param3;
        return (param1: MouseEvent): void => {
            if (param1.target.Enabled) {
                SOUNDS.Play("click1");
                this.SwitchB(a, b, p);
            }
        };
    }

    public Exclude(param1: any[]): void {
        let _loc3_: int = 0;
        let _loc2_: int = 0;
        while (_loc2_ < param1.length) {
            if (as3.is(param1[_loc2_], Array)) {
                if (this._subButtons) {
                    if (param1[_loc2_].length == this._subButtons.length) {
                        _loc3_ = 0;
                        while (_loc3_ < param1[_loc2_].length) {
                            this._subButtons[param1[_loc2_][_loc3_]].Enabled = false;
                            _loc2_++;
                        }
                    }
                }
            } else {
                this["b" + param1[_loc2_]].Enabled = false;
            }
            _loc2_++;
        }
        this._excluded = param1;
    }

    public SwitchB(param1: int, param2: int, param3: int): void {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc8_: int = 0;
        let _loc10_: any = null;
        let _loc11_: BUILDINGBUTTON = null;
        BUILDINGS._menuA = param1;
        BUILDINGS._menuB = param2;
        BUILDINGS._page = param3;
        let _loc4_: int = 1;
        while (_loc4_ < 5) {
            this["b" + _loc4_].Highlight = false;
            _loc4_++;
        }
        this["b" + param1].Highlight = true;
        if (param1 == 4) {
            // Inferno-only: a sixth tab, Pets (IoPetsPanel)
            this.SubMenu(GLOBAL.INFERNO_ONLY ? [KEYS.Get("btn_evil"), KEYS.Get("btn_plants"), KEYS.Get("btn_good"), KEYS.Get("btn_flags"), KEYS.Get("btn_premium"), "Pets"] : [KEYS.Get("btn_evil"), KEYS.Get("btn_plants"), KEYS.Get("btn_good"), KEYS.Get("btn_flags"), KEYS.Get("btn_premium")]);
        } else {
            this.SubMenu([]);
        }
        if (this._thumbnailsMC) {
            this.removeChild(this._thumbnailsMC);
        }
        this._thumbnailsMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._thumbnailsMC.x = 60;
        this._thumbnailsMC.y = 115 + 25;
        if (GLOBAL.INFERNO_ONLY && param1 == 4 && BUILDINGS._menuB == BUILDINGSPOPUP.IO_PETS_TAB) {
            this._pageCount = IoPetsPanel.fill(this._thumbnailsMC, BUILDINGS._page, as3.bind(this, this.ioRefreshPets));
            this.bPrevious.Trigger(BUILDINGS._page > 0);
            this.bNext.Trigger(BUILDINGS._page < this._pageCount - 1);
            return;
        }
        let _loc7_: any[] = GLOBAL._buildingProps.concat();
        if (TUTORIAL.hasFinished) {
            this.SortBuildings(_loc7_);
        } else {
            as3.sortOn(_loc7_, "order", Array.NUMERIC);
        }
        param2 = 0;
        while (param2 < _loc7_.length) {
            _loc10_ = _loc7_[param2];

            if (BASE.isInfernoMainYardOrOutpost && (_loc10_.id | 0) == 135) {
                param2++;
                continue;
            }

            if ((_loc10_.group | 0) == param1 && (_loc10_.subgroup == null || (_loc10_.subgroup | 0) == BUILDINGS._menuB) && (!_loc10_.block || InventoryManager.buildingStorageCount(_loc10_.id | 0))) {
                if (_loc8_ >= 10 * BUILDINGS._page && _loc8_ < 10 + 10 * BUILDINGS._page) {
                    (_loc11_ = as3.as(this._thumbnailsMC.addChild(new BUILDINGBUTTON()), BUILDINGBUTTON)).x = _loc5_ * 130;
                    _loc11_.y = _loc6_ * 170;
                    _loc11_.Setup(_loc10_.id | 0);
                    _loc5_++;
                    if (_loc5_ == 5) {
                        _loc5_ = 0;
                        _loc6_++;
                    }
                    if (_loc6_ == 2) {
                        _loc6_ = 0;
                    }
                }
                _loc8_++;
            }
            param2++;
        }
        let _loc9_: BUILDINGBUTTONSOON = null;
        (_loc9_ = new BUILDINGBUTTONSOON()).t.htmlText = KEYS.Get("building_coming_soon");
        if (_loc8_ == 0) {
            this._thumbnailsMC.addChild(_loc9_);
        }
        this._pageCount = Math.ceil(_loc8_ / 10) | 0;
        if (BUILDINGS._page > 0) {
            this.bPrevious.Trigger(true);
        } else {
            this.bPrevious.Trigger(false);
        }
        if (BUILDINGS._page < this._pageCount - 1 && TUTORIAL._stage >= 200) {
            this.bNext.Trigger(true);
        } else {
            this.bNext.Trigger(false);
        }
    }

    /** Inferno-only: the Pets tab drawn again (after a pet is bought, brought out or put away). */
    public ioRefreshPets(): void {
        if (BUILDINGS._mc == this && BUILDINGS._menuA == 4 && BUILDINGS._menuB == BUILDINGSPOPUP.IO_PETS_TAB) {
            this.SwitchB(4, BUILDINGSPOPUP.IO_PETS_TAB, BUILDINGS._page);
        }
    }

    public SortBuildings(param1: any[]): void {
        let _loc3_: any = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: BFOUNDATION = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: string = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc4_: int = 0;
        while (_loc4_ < param1.length) {
            if ((_loc5_ = param1[_loc4_]).group == BUILDINGS._menuA && (_loc5_.subgroup == null || _loc5_.subgroup == BUILDINGS._menuB) && (!_loc5_.block || InventoryManager.buildingStorageCount(_loc5_.id | 0))) {
                _loc3_ = GLOBAL._buildingProps[_loc5_.id - 1];
                if (_loc3_.type != "decoration") {
                    _loc7_ = (_loc6_ = GLOBAL.GetBuildingTownHallLevel(_loc3_)) < _loc3_.quantity.length ? _loc3_.quantity[_loc6_] | 0 : _loc3_.quantity[_loc3_.quantity.length - 1] | 0;
                    _loc8_ = 0;
                    _loc3_.buildStatus = 1;
                    for (_loc9_ of (_loc2_ ?? [])) {
                        if (_loc9_._type == _loc5_.id) {
                            _loc8_++;
                        }
                    }
                    if (_loc8_ <= 0 && Boolean(_loc3_.upgradeImgData)) {
                        _loc11_ = int.MAX_VALUE;
                        for (_loc12_ in _loc3_.upgradeImgData) {
                            if (!isNaN(Number(_loc12_))) {
                                _loc11_ = Math.min(_loc11_, Number(_loc12_)) | 0;
                            }
                        }
                        if (_loc11_ != int.MAX_VALUE && _loc3_.upgradeImgData[_loc11_].silhouette_img && !BASE.HasRequirements(_loc3_.costs[0]) && !_loc3_.rewarded) {
                            _loc3_.buildStatus = 2;
                        }
                    } else if (_loc8_ >= _loc7_) {
                        _loc3_.buildStatus = 3;
                    }
                    _loc10_ = Math.max.apply(Math, _loc3_.quantity) | 0;
                    if (_loc8_ >= _loc10_ && _loc10_ > 0) {
                        _loc3_.buildStatus = 4;
                    }
                }
            }
            _loc4_++;
        }
        as3.sortOn(param1, ["buildStatus", "order"], Array.NUMERIC);
    }

    public SubMenu(param1: any[]): void {
        let _loc4_: Button = null;
        if (this._subButtonsMC) {
            this.removeChild(this._subButtonsMC);
        }
        this._subButtonsMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        let _loc2_: any[] = [];
        let _loc3_: int = 0;
        // (six tabs, the Inferno's Decorations with Pets: a little narrower, to fit)
        let ioStep: int = param1.length > 5 ? 102 : 110;
        while (_loc3_ < param1.length) {
            (_loc4_ = as3.as(this._subButtonsMC.addChild(new Button_CLIP()), Button_CLIP)).x = _loc3_ * ioStep;
            _loc4_.width = ioStep - 5;
            _loc4_.Setup(as3.str(param1[_loc3_]));
            _loc2_.push(_loc4_);
            _loc4_.addEventListener(MouseEvent.CLICK, this.Switch(BUILDINGS._menuA, _loc3_, 0));
            if (_loc3_ == BUILDINGS._menuB) {
                _loc4_.Highlight = true;
            }
            _loc3_++;
        }
        this._subButtonsMC.x = 380 - this._subButtonsMC.width / 2;
        this._subButtonsMC.y = 75 + 25;
    }

    public ShowInfo(param1: int): void {
        BUILDINGS._buildingID = param1;
        if (this._buildingInfoMC) {
            this._buildingInfoMC.parent.removeChild(this._buildingInfoMC);
        }
        GLOBAL.BlockerAdd();
        this._buildingInfoMC = as3.as(GLOBAL._layerWindows.addChild(new BUILDINGOPTIONSPOPUP("build", param1)), BUILDINGOPTIONSPOPUP);
        this._buildingInfoMC.x = GLOBAL._SCREENCENTER.x;
        this._buildingInfoMC.y = GLOBAL._SCREENCENTER.y;
    }

    public HideInfo(): void {
        if (this._buildingInfoMC) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            this._buildingInfoMC.parent.removeChild(this._buildingInfoMC);
            this._buildingInfoMC = null;
        }
    }

    public Hide(param1: MouseEvent = null): void {
        BUILDINGS.Hide();
    }

    public Previous(param1: MouseEvent = null): void {
        if (BUILDINGS._page > 0) {
            --BUILDINGS._page;
            this.SwitchB(BUILDINGS._menuA, BUILDINGS._menuB, BUILDINGS._page);
            SOUNDS.Play("click1");
        }
    }

    public Next(param1: MouseEvent = null): void {
        if (BUILDINGS._page < this._pageCount - 1) {
            ++BUILDINGS._page;
            this.SwitchB(BUILDINGS._menuA, BUILDINGS._menuB, BUILDINGS._page);
            SOUNDS.Play("click1");
        }
    }

    public Center(): void {
        POPUPSETTINGS.AlignToUpperLeft(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
