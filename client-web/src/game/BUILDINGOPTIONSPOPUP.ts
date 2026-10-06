import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip, Shape } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { TextFieldAutoSize } from "flash/text";
import { BASE, BFOUNDATION, BUILDING14, BUILDINGOPTIONS, BUILDINGOPTIONSPOPUP_CLIP, BUILDINGS, BuildingAssetContainer, Checkbox, GLOBAL, INFERNOQUAKETOWER, ImageCache, InstanceManager, InventoryManager, IoMenuArt, KEYS, POPUPS, POPUPSETTINGS, SOUNDS, STORE, SecNum, TUTORIAL } from "@game";

export class BUILDINGOPTIONSPOPUP extends BUILDINGOPTIONSPOPUP_CLIP {
    static {
        as3.fields(this, { _building: null, _costsMC: null, _tmpIcon: null, streampost_cb: null, _isPosting: false, _doStreamPost: true, imageContainer: null });
    }

    private _building: BFOUNDATION;
    private _costsMC: MovieClip;
    private _tmpIcon: MovieClip;
    public streampost_cb: Checkbox;
    public _isPosting: boolean;
    public _doStreamPost: boolean;
    public imageContainer: BuildingAssetContainer;

    public $ctor(param1: string = "info", param2: int = 0): void {
        super.$ctor();
        this._doStreamPost = false;
        this.mcCBBG.visible = false;
        this.mcInfoCB.visible = false;
        if (param1 == "build") {
            this._building = new BFOUNDATION();
            InstanceManager.removeInstance(this._building);
            this._building._type = param2;
            if (!STORE._storeItems["BUILDING" + this._building._type]) {
                this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionInstantBuild));
                this.mcInstant.bAction.Setup(KEYS.Get("buildoptions_shiny", { "v1": this._building.InstantBuildCost() }));
                this.mcInstant.tDescription.htmlText = KEYS.Get("buildoptions_buildinstant");
                this.mcInstant.gCoin.mouseEnabled = false;
            }
        } else if (param1 == "fortify") {
            this._building = BUILDINGOPTIONS._building;
            this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionInstantFortify));
            this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": this._building.InstantFortifyCost() }));
            this.mcInstant.tDescription.htmlText = KEYS.Get("buildoptions_fortifyinstant");
            this.mcInstant.gCoin.mouseEnabled = false;
        } else {
            this._building = BUILDINGOPTIONS._building;
            this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionInstantUpgrade));
            this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": this._building.InstantUpgradeCost() }));
            this.mcInstant.tDescription.htmlText = KEYS.Get("buildoptions_upgradeinstant");
            this.mcInstant.gCoin.mouseEnabled = false;
        }
        this.toggleCheckbox(false);
        this.tDescription.autoSize = TextFieldAutoSize.LEFT;
        this.tDescription.mouseWheelEnabled = false;
        this.imageContainer = new BuildingAssetContainer();
        this.imageContainer.mouseChildren = false;
        this.imageContainer.mouseEnabled = false;
        this.mcImage.addChild(this.imageContainer);
        this.Render(param1);
        this.Switch(param1);
    }

    private Switch(param1: string): void {
        let _loc6_: any[] = null;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: string = null;
        let _loc10_: BFOUNDATION = null;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: int = 0;
        let _loc15_: MovieClip = null;
        let _loc16_: boolean = false;
        let _loc17_: any = null;
        let _loc18_: any[] = null;
        let _loc2_: any = "";
        let _loc3_: any = {};
        let _loc4_: any = "";
        SOUNDS.Play("click1");
        let _loc5_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        if (param1 == "build") {
            this.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionResourceBuild));
            this.mcResources.bAction.Highlight = true;
            if (InventoryManager.buildingStorageCount(this._building._type) > 0) {
                this.mcResources.bAction.SetupKey("btn_place");
            } else {
                this.mcResources.bAction.SetupKey("btn_build");
            }
            for (_loc6_ of as3.values(GLOBAL._buildingProps[this._building._type - 1].costs[0].re)) {
                _loc7_ = 0;
                _loc8_ = "#CC0000";
                if (_loc6_[0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
                    _loc9_ = "#bi_townhall#";
                    if (GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) >= _loc6_[2] || Boolean(GLOBAL._buildingProps[this._building._type - 1].rewarded)) {
                        _loc7_ = 1;
                    }
                } else {
                    _loc9_ = String(GLOBAL._buildingProps[_loc6_[0] - 1].name);
                    for (_loc10_ of (_loc5_ ?? [])) {
                        if (_loc10_._type == _loc6_[0] && _loc10_._lvl.Get() >= _loc6_[2]) {
                            _loc7_++;
                        }
                    }
                }
                if (_loc7_ >= _loc6_[1]) {
                    _loc8_ = "#333333";
                }
                _loc4_ += "<font color=\"" + _loc8_ + "\">";
                if (_loc6_[1] == 1) {
                    if (_loc6_[2] == 1) {
                        _loc4_ += "• " + KEYS.Get(_loc9_);
                    } else {
                        _loc4_ += "• " + KEYS.Get("bdg_buildingrequirement", { "v1": _loc6_[2], "v2": KEYS.Get(_loc9_) });
                    }
                } else if (_loc6_[2] == 1) {
                    _loc4_ += "• " + KEYS.Get(_loc9_) + " x" + _loc6_[1];
                } else {
                    _loc4_ += "• " + KEYS.Get("bdg_buildingsrequirement", { "v1": _loc6_[2], "v2": KEYS.Get(_loc9_), "v3": _loc6_[1] });
                }
                _loc4_ += "</font><br>";
            }
            if (Boolean(GLOBAL._buildingProps[this._building._type - 1].names) && GLOBAL._buildingProps[this._building._type - 1].names.length > 1) {
                if ((_loc12_ = this._building._lvl.Get() | 0) < 1) {
                    _loc12_ = BASE._buildingsStored["bl" + this._building._type].Get() | 0;
                }
                _loc2_ = "<b>" + KEYS.Get(as3.str(GLOBAL._buildingProps[this._building._type - 1].names[_loc12_ - 1])) + "</b><br>";
            } else {
                _loc2_ = "<b>" + KEYS.Get(as3.str(GLOBAL._buildingProps[this._building._type - 1].name)) + "</b><br>";
            }
            if (Boolean(GLOBAL._buildingProps[this._building._type - 1].descriptions) && GLOBAL._buildingProps[this._building._type - 1].descriptions.length > 1) {
                if ((_loc12_ = this._building._lvl.Get() | 0) < 1) {
                    _loc12_ = BASE._buildingsStored["bl" + this._building._type].Get() | 0;
                }
                _loc2_ += KEYS.Get(as3.str(GLOBAL._buildingProps[this._building._type - 1].descriptions[_loc12_ - 1]));
            } else {
                _loc2_ += KEYS.Get(as3.str(GLOBAL._buildingProps[this._building._type - 1].description));
            }
            if (_loc4_ != "") {
                _loc2_ += "<br><br>" + KEYS.Get("bdg_upgraderequirements", { "v1": _loc4_ });
            }
            _loc3_ = GLOBAL._buildingProps[this._building._type - 1].costs[0];
            if (GLOBAL._buildingProps[this._building._type - 1].rewarded) {
                _loc3_ = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "r5": 0, "time": new SecNum(Number(_loc3_.time.Get())) };
            }
            this.toggleCheckbox(true);
        } else if (param1 == "upgrade") {
            this.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionResourceUpgrade));
            this.mcResources.bAction.Setup(KEYS.Get("buildoptions_resources"));
            if (this._building._lvl.Get() < this._building.getEffectiveLevelMax()) {
                if (this._building._type != 14) {
                    for (_loc6_ of as3.values(this._building._buildingProps.costs[this._building._lvl.Get()].re)) {
                        _loc7_ = 0;
                        _loc8_ = "#CC0000";
                        if (_loc6_[0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
                            _loc9_ = "#bi_townhall#";
                            if (GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) >= _loc6_[2] || Boolean(GLOBAL._buildingProps[this._building._type - 1].rewarded)) {
                                _loc7_ = 1;
                            }
                        } else {
                            _loc9_ = String(GLOBAL._buildingProps[_loc6_[0] - 1].name);
                            for (_loc10_ of (_loc5_ ?? [])) {
                                if (_loc10_._type == _loc6_[0] && _loc10_._lvl.Get() >= _loc6_[2]) {
                                    _loc7_++;
                                }
                            }
                        }
                        if (_loc7_ >= _loc6_[1]) {
                            _loc8_ = "#333333";
                        }
                        _loc4_ += "<font color=\"" + _loc8_ + "\">";
                        if (_loc6_[1] == 1) {
                            if (_loc6_[2] == 1) {
                                _loc4_ += "• " + KEYS.Get(_loc9_);
                            } else {
                                _loc4_ += "• " + KEYS.Get("bdg_buildingrequirement", { "v1": _loc6_[2], "v2": KEYS.Get(_loc9_) });
                            }
                        } else if (_loc6_[2] == 1) {
                            _loc4_ += "• " + KEYS.Get(_loc9_) + " x" + _loc6_[1];
                        } else {
                            _loc4_ += "• " + KEYS.Get("bdg_buildingsrequirement", { "v1": _loc6_[2], "v2": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc6_[0] - 1].name)), "v3": _loc6_[1] });
                        }
                        _loc4_ += "</font><br>";
                    }
                }
                _loc2_ = KEYS.Get("bdg_upgradedesc", { "v1": KEYS.Get(as3.str(this._building._buildingProps.name)), "v2": this._building._lvl.Get() + 1, "v3": this._building._upgradeDescription });
                if (_loc4_ != "") {
                    _loc2_ += KEYS.Get("bdg_upgraderequirements", { "v1": _loc4_ });
                }
                _loc3_ = this._building.UpgradeCost();
                this.toggleCheckbox(true);
            } else {
                _loc2_ = KEYS.Get("bdg_fullyupgraded");
                _loc3_ = null;
                this.toggleCheckbox(false);
            }
        } else if (param1 == "fortify") {
            this.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionResourceFortify));
            this.mcResources.bAction.Setup(KEYS.Get("buildoptions_resources"));
            if (Boolean(this._building._buildingProps.can_fortify) && this._building._fortification.Get() < this._building._buildingProps.fortify_costs.length) {
                for (_loc6_ of as3.values(this._building._buildingProps.fortify_costs[this._building._fortification.Get()].re)) {
                    _loc7_ = 0;
                    _loc8_ = "#CC0000";
                    for (_loc10_ of (_loc5_ ?? [])) {
                        if (_loc10_._type == _loc6_[0] && _loc10_._lvl.Get() >= _loc6_[2]) {
                            _loc7_++;
                        }
                    }
                    if (_loc7_ >= _loc6_[1]) {
                        _loc8_ = "#333333";
                    }
                    _loc4_ += "<font color=\"" + _loc8_ + "\">";
                    if (_loc6_[1] == 1) {
                        if (_loc6_[2] == 1) {
                            _loc4_ += "• " + KEYS.Get(as3.str(GLOBAL._buildingProps[_loc6_[0] - 1].name));
                        } else {
                            _loc4_ += "• " + KEYS.Get("bdg_buildingrequirement", { "v1": _loc6_[2], "v2": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc6_[0] - 1].name)) });
                        }
                    } else if (_loc6_[2] == 1) {
                        _loc4_ += "• " + KEYS.Get(as3.str(GLOBAL._buildingProps[_loc6_[0] - 1].name)) + " x" + _loc6_[1];
                    } else {
                        _loc4_ += "• " + KEYS.Get("bdg_buildingsrequirement", { "v1": _loc6_[2], "v2": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc6_[0] - 1].name)), "v3": _loc6_[1] });
                    }
                    _loc4_ += "</font><br>";
                }
                _loc2_ = "<b>Fortify your " + KEYS.Get(as3.str(this._building._buildingProps.name)) + " to level " + (this._building._fortification.Get() + 1) + "!<br></b>";
                _loc2_ += "Damage protection goes from " + (!(!this._building._fortification.Get()) ? this._building._fortification.Get() * 10 + 10 : 0) + "% to " + (this._building._fortification.Get() * 10 + 20) + "%.<br><br>";
                if (_loc4_ != "") {
                    _loc2_ += KEYS.Get("bdg_upgraderequirements", { "v1": _loc4_ });
                }
                _loc3_ = this._building.FortifyCost();
                this.toggleCheckbox(true);
            } else {
                _loc2_ = KEYS.Get("bdg_fullyfortified");
                _loc3_ = null;
                this.toggleCheckbox(false);
            }
        } else if (param1 == "more") {
            this.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ActionRecycle));
            this.mcResources.bAction.SetupKey("btn_recycle");
            if (this._building._buildingProps.costs.length == 1) {
                _loc2_ = KEYS.Get("bdg_morenolevel", { "v1": KEYS.Get(as3.str(this._building._buildingProps.name)), "v2": KEYS.Get(as3.str(this._building._buildingProps.description)), "v3": this._building._recycleDescription });
            } else if (this._building._buildingProps.names && this._building._buildingProps.names.length > 1 && Boolean(this._building._buildingProps.descriptions) && this._building._buildingProps.descriptions.length > 1) {
                let _effectiveLvl: int = this._building.getEffectiveLevel();
                _loc2_ = KEYS.Get("bdg_morenolevel", { "v1": KEYS.Get(as3.str(this._building._buildingProps.names[_effectiveLvl - 1])), "v2": KEYS.Get(as3.str(this._building._buildingProps.descriptions[_effectiveLvl - 1])), "v3": this._building._recycleDescription });
            } else {
                _loc2_ = KEYS.Get("bdg_more", { "v1": KEYS.Get(as3.str(this._building._buildingProps.name)), "v2": this._building.getEffectiveLevel(), "v3": KEYS.Get(as3.str(this._building._buildingProps.description)), "v4": this._building._recycleDescription });
            }
            if (this._building._class == "decoration") {
                this.mcResources.bAction.SetupKey("btn_addstorage");
            } else {
                this.mcResources.bAction.SetupKey("btn_recycle");
                if (TUTORIAL._stage < 200) {
                    this.mcResources.bAction.Enabled = false;
                }
            }
            _loc3_ = this._building.RecycleCost();
            this.toggleCheckbox();
        }
        this.tDescription.htmlText = as3.str(_loc2_);
        let _loc11_: int = 0;
        if (_loc3_) {
            _loc13_ = _loc3_.time.Get() | 0;
            _loc14_ = 1;
            while (_loc14_ < 5) {
                _loc15_ = as3.cast(this.mcResources["mcR" + _loc14_], MovieClip);
                _loc17_ = (_loc16_ = BASE.isInfernoBuilding(this._building._type >>> 0)) ? BASE._iresources : BASE._resources;
                _loc18_ = _loc16_ ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
                _loc15_.gotoAndStop(_loc16_ || BASE.isInfernoMainYardOrOutpost ? _loc14_ + 6 : _loc14_);
                _loc15_.tTitle.htmlText = "<b>" + KEYS.Get(as3.str(_loc18_[_loc14_ - 1])) + "</b>";
                _loc15_.tValue.htmlText = "<b><font color=\"#" + (_loc3_["r" + _loc14_].Get() > _loc17_["r" + _loc14_].Get() && (param1 == "upgrade" || param1 == "build" || param1 == "fortify") ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(Number(_loc3_["r" + _loc14_].Get())) + "</font></b>";
                if (Boolean(_loc3_["r" + _loc14_].Get()) && _loc3_["r" + _loc14_].Get() > 0) {
                    _loc15_.alpha = 1;
                } else {
                    _loc15_.alpha = 0.25;
                }
                _loc14_++;
            }
            (_loc15_ = as3.cast(this.mcResources.mcTime, MovieClip)).gotoAndStop(BASE.isInfernoBuilding(this._building._type >>> 0) || BASE.isInfernoMainYardOrOutpost ? 12 : 6);
            if (TUTORIAL._stage >= 200 && _loc3_.time.Get() > 0) {
                _loc15_.visible = true;
                _loc15_.tTitle.htmlText = "<b>" + KEYS.Get(as3.str(_loc18_[5])) + "</b>";
                _loc15_.tValue.htmlText = "<b>" + GLOBAL.ToTime(_loc13_, true, false) + "</b>";
            } else {
                _loc15_.visible = false;
            }
            if (this._doStreamPost && BASE.isMainYard) {
                if (_loc3_.time.Get() > 600) {
                    this.streampost_cb.Enabled = true;
                    this.mcCBBG.alpha = 1;
                    this.streampost_cb.alpha = 1;
                } else {
                    this.streampost_cb.Enabled = false;
                    this.mcCBBG.alpha = 0.25;
                    this.streampost_cb.alpha = 0.25;
                }
            }
            if (TUTORIAL._stage < 200 || STORE._storeItems["BUILDING" + this._building._type] || param1 != GLOBAL.e_BASE_MODE.BUILD && param1 != "upgrade" && param1 != "fortify") {
                this.mcInstant.visible = false;
                _loc11_ = (this.tDescription.height + 53) | 0;
            } else {
                _loc11_ = (this.tDescription.height + 93) | 0;
            }
            _loc11_ += 30;
        } else {
            this.mcResources.visible = false;
            this.mcInstant.visible = false;
        }
        if (_loc11_ < 200) {
            _loc11_ = 200;
        }
        this.mcBG.height = _loc11_;
        this.mcBG.Setup();
        if (TUTORIAL._stage < 200 || STORE._storeItems["BUILDING" + this._building._type] || param1 != GLOBAL.e_BASE_MODE.BUILD && param1 != "upgrade" && param1 != "fortify") {
            this.mcResources.y = this.mcBG.y + _loc11_ - 63;
        } else {
            this.mcResources.y = this.mcBG.y + _loc11_ - 63;
            this.mcInstant.y = this.mcBG.y + _loc11_ - 100;
        }
        if (this._doStreamPost && BASE.isMainYard) {
            this.mcCBBG.y = this.mcResources.y + (this.mcResources.height + 2);
            this.streampost_cb.y = this.mcResources.y + (this.mcResources.height + 2);
            this.mcInfoCB.y = this.streampost_cb.y + this.streampost_cb.height / 2;
        }
    }

    private ActionRecycle(param1: MouseEvent): void {
        if (TUTORIAL._stage < 200) {
            GLOBAL.Message(KEYS.Get("tut_recycle_locked"), KEYS.Get("btn_close"));
        } else {
            this._building.Recycle();
        }
    }

    private ActionResourceBuild(param1: MouseEvent = null): void {
        let _loc7_: boolean = false;
        let _loc8_: any = null;
        let _loc9_: int = 0;
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = BASE.CanBuild(this._building._type);
        let _loc6_: any = GLOBAL._buildingProps[this._building._type - 1].costs[0];
        if (GLOBAL._buildingProps[this._building._type - 1].rewarded) {
            _loc6_ = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(Number(_loc6_.time.Get())), "re": _loc6_.re };
        }
        if (Boolean(_loc5_.error) && !_loc5_.needResource) {
            GLOBAL.Message(as3.str(_loc5_.errorMessage));
        } else {
            if (this._doStreamPost && BASE.isMainYard) {
                if (this.streampost_cb.Checked) {
                    GLOBAL.StatSet("post_bu", 1);
                } else {
                    GLOBAL.StatSet("post_bu", 0);
                }
            }
            if (STORE._storeItems["BUILDING" + this._building._type]) {
                if (InventoryManager.buildingStorageCount(this._building._type) > 0) {
                    if (BASE.addBuildingB(this._building._type)) {
                        BUILDINGS.Hide(param1);
                    }
                    return;
                }
                if (STORE._storeItems["BUILDING" + this._building._type].c[0] > BASE._credits.Get()) {
                    POPUPS.DisplayGetShiny();
                    return;
                }
                // Inferno-only: a building bought with shiny (charged when it is placed).
                if (!GLOBAL.ioConfirmShiny(STORE._storeItems["BUILDING" + this._building._type].c[0] | 0, "to build this", (): void => {
                    this.ActionResourceBuild(param1);
                })) {
                    return;
                }
            }
            if (_loc5_.needResource) {
                _loc3_ = 0;
                _loc8_ = (_loc7_ = BASE.isInfernoBuilding(this._building._type >>> 0)) ? BASE._iresources : BASE._resources;
                _loc9_ = 1;
                while (_loc9_ < 5) {
                    if (_loc6_["r" + _loc9_].Get() > 0) {
                        if (_loc6_["r" + _loc9_].Get() > _loc8_["r" + _loc9_ + "max"]) {
                            _loc2_ = true;
                            break;
                        }
                        if (_loc6_["r" + _loc9_].Get() > _loc8_["r" + _loc9_].Get()) {
                            _loc3_ = (_loc3_ + (_loc6_["r" + _loc9_].Get() - _loc8_["r" + _loc9_].Get())) | 0;
                        }
                    }
                    _loc9_++;
                }
                _loc4_ = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
                if (_loc2_) {
                    GLOBAL.Message(_loc7_ ? KEYS.Get("inf_buildoptions_err_moresilos") : KEYS.Get("buildoptions_err_moresilos"));
                } else {
                    GLOBAL.Message(KEYS.Get("buildoptions_err_moreresources", { "v1": GLOBAL.FormatNumber(_loc3_), "v2": GLOBAL.FormatNumber(_loc4_) }), KEYS.Get("btn_getresources"), as3.bind(this, this.TopoffBuild));
                }
            } else if (BASE.addBuildingB(this._building._type)) {
                BUILDINGS.Hide(param1);
            }
        }
    }

    private ActionResourceUpgrade(param1: MouseEvent): void {
        let _loc8_: any = null;
        let _loc9_: int = 0;
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = BASE.CanUpgrade(this._building);
        let _loc6_: boolean = false;
        let _loc7_: any = (_loc6_ = BASE.isInfernoBuilding(this._building._type >>> 0)) ? BASE._iresources : BASE._resources;
        if (Boolean(_loc5_.error) && !_loc5_.needResource) {
            GLOBAL.Message(as3.str(_loc5_.errorMessage));
        } else if (_loc5_.needResource) {
            _loc8_ = this._building._buildingProps.costs[this._building._lvl.Get()];
            _loc3_ = 0;
            _loc9_ = 1;
            while (_loc9_ < 5) {
                if (_loc8_["r" + _loc9_].Get() > 0) {
                    if (_loc8_["r" + _loc9_].Get() > _loc7_["r" + _loc9_ + "max"]) {
                        _loc2_ = true;
                    } else if (_loc8_["r" + _loc9_].Get() > _loc7_["r" + _loc9_].Get()) {
                        _loc3_ = (_loc3_ + (_loc8_["r" + _loc9_].Get() - _loc7_["r" + _loc9_].Get())) | 0;
                    }
                }
                _loc9_++;
            }
            _loc4_ = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
            if (_loc2_) {
                GLOBAL.Message(_loc6_ || BASE.isInfernoMainYardOrOutpost ? KEYS.Get("inf_buildoptions_err_moresilosupgrade") : KEYS.Get("buildoptions_err_moresilosupgrade"));
            } else {
                GLOBAL.Message(KEYS.Get("buildoptions_err_moreresourcesupgrade", { "v1": GLOBAL.FormatNumber(_loc3_), "v2": GLOBAL.FormatNumber(_loc4_) }), KEYS.Get("btn_getresources"), as3.bind(this, this.TopoffUpgrade));
            }
        } else {
            if (this._doStreamPost && BASE.isMainYard) {
                if (this.streampost_cb.Checked) {
                    GLOBAL.StatSet("post_bu", 1);
                } else {
                    GLOBAL.StatSet("post_bu", 0);
                }
            }
            if (this._building.Upgrade()) {
                BUILDINGOPTIONS.Hide();
            }
        }
    }

    private ActionResourceFortify(param1: MouseEvent): void {
        let _loc6_: any = null;
        let _loc7_: int = 0;
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        if (Boolean((_loc5_ = BASE.CanFortify(this._building)).error) && !_loc5_.needResource) {
            GLOBAL.Message(as3.str(_loc5_.errorMessage));
        } else if (_loc5_.needResource) {
            _loc6_ = this._building._buildingProps.fortify_costs[this._building._fortification.Get()];
            _loc3_ = 0;
            _loc7_ = 1;
            while (_loc7_ < 5) {
                if (_loc6_["r" + _loc7_].Get() > 0) {
                    if (_loc6_["r" + _loc7_].Get() > BASE._resources["r" + _loc7_ + "max"]) {
                        _loc2_ = true;
                    } else if (_loc6_["r" + _loc7_].Get() > BASE._resources["r" + _loc7_].Get()) {
                        _loc3_ = (_loc3_ + (_loc6_["r" + _loc7_].Get() - BASE._resources["r" + _loc7_].Get())) | 0;
                    }
                }
                _loc7_++;
            }
            _loc4_ = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
            if (_loc2_) {
                GLOBAL.Message(KEYS.Get("buildoptions_err_moresilosfortify"));
            } else {
                GLOBAL.Message(KEYS.Get("buildoptions_err_moreresourcesfortify", { "v1": GLOBAL.FormatNumber(_loc3_), "v2": GLOBAL.FormatNumber(_loc4_) }), KEYS.Get("btn_getresources"), as3.bind(this, this.TopoffFortify));
            }
        } else if (this._building.Fortify()) {
            BUILDINGOPTIONS.Hide();
        }
    }

    private ActionInstantBuild(param1: MouseEvent): void {
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = BASE.CanBuild(this._building._type, true);
        let _loc6_: any = GLOBAL._buildingProps[this._building._type - 1].costs[0];
        if (_loc5_.error) {
            GLOBAL.Message(as3.str(_loc5_.errorMessage));
        } else {
            if ((_loc7_ = _loc6_.time.Get() | 0) <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 300)) {
                _loc7_ = 0;
            }
            _loc8_ = (_loc6_.r1.Get() + _loc6_.r2.Get() + _loc6_.r3.Get()) | 0;
            _loc9_ = Math.ceil(Math.pow(Math.sqrt(_loc8_ / 2), 0.75)) | 0;
            _loc10_ = STORE.ioBuildingTimeCost(_loc7_);
            _loc11_ = (_loc9_ + _loc10_) | 0;
            if ((_loc11_ = (_loc11_ * 0.95) | 0) <= 5) {
                _loc11_ = 5;
            }
            if (_loc11_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
                return;
            }
            // Inferno-only: asked here, before the building is placed (charged when it is put down).
            if (!GLOBAL.ioConfirmShiny(_loc11_, "to build this instantly", (): void => {
                this.ActionInstantBuild(param1);
            })) {
                return;
            }
            if (BASE.addBuildingB(this._building._type, true)) {
                BUILDINGS.Hide(param1);
                GLOBAL._newBuilding._buildInstant = true;
                GLOBAL._newBuilding._buildInstantCost = new SecNum(_loc11_);
            }
        }
    }

    private ActionInstantUpgrade(param1: MouseEvent): void {
        let _loc2_: any = BASE.CanUpgrade(this._building);
        if (Boolean(_loc2_.error) && !_loc2_.needResource) {
            GLOBAL.Message(as3.str(_loc2_.errorMessage));
        } else if (!GLOBAL.ioConfirmShiny(this._building.InstantUpgradeCost(), "to upgrade this instantly", (): void => {
            this.ActionInstantUpgrade(param1);
        })) {
            return;
        } else if (this._building.DoInstantUpgrade()) {
            BUILDINGOPTIONS.Hide();
        }
    }

    private ActionInstantFortify(param1: MouseEvent): void {
        let _loc2_: any = BASE.CanFortify(this._building);
        if (Boolean(_loc2_.error) && !_loc2_.needResource) {
            GLOBAL.Message(as3.str(_loc2_.errorMessage));
        } else if (!GLOBAL.ioConfirmShiny(this._building.InstantFortifyCost(), "to fortify this instantly", (): void => {
            this.ActionInstantFortify(param1);
        })) {
            return;
        } else if (this._building.DoInstantFortify()) {
            BUILDINGOPTIONS.Hide();
        }
    }

    private TopoffUpgrade(param1: MouseEvent = null): void {
        let _loc4_: int = 0;
        let _loc8_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: boolean = false;
        let _loc5_: boolean = false;
        let _loc6_: any = (_loc5_ = BASE.isInfernoBuilding(this._building._type >>> 0)) ? BASE._iresources : BASE._resources;
        let _loc7_: any = this._building._buildingProps.costs[this._building._lvl.Get()];
        _loc8_ = 1;
        while (_loc8_ < 5) {
            if (_loc7_["r" + _loc8_].Get() > 0) {
                if (_loc7_["r" + _loc8_].Get() > _loc6_["r" + _loc8_ + "max"]) {
                    _loc3_ = true;
                } else if (_loc7_["r" + _loc8_].Get() > _loc6_["r" + _loc8_].Get()) {
                    _loc2_ = (_loc2_ + (_loc7_["r" + _loc8_].Get() - _loc6_["r" + _loc8_].Get())) | 0;
                }
            }
            _loc8_++;
        }
        _loc4_ = Math.ceil(Math.pow(Math.sqrt(_loc2_ / 2), 0.75)) | 0;
        if (_loc3_) {
            GLOBAL.Message(KEYS.Get("msg_overcapacity"));
        } else if (BASE._pendingPurchase.length == 0) {
            if (_loc4_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else if (!GLOBAL.ioConfirmShiny(_loc4_, "to make up the missing resources and upgrade", (): void => {
                this.TopoffUpgrade(param1);
            })) {
                return;
            } else {
                _loc8_ = 1;
                while (_loc8_ < 5) {
                    if (_loc7_["r" + _loc8_].Get() > 0 && _loc7_["r" + _loc8_].Get() > _loc6_["r" + _loc8_].Get()) {
                        BASE.Fund(_loc8_, _loc7_["r" + _loc8_].Get() - _loc6_["r" + _loc8_].Get(), false, null, _loc5_);
                    }
                    _loc8_++;
                }
                if (this._doStreamPost && BASE.isMainYard) {
                    if (this.streampost_cb.Checked) {
                        GLOBAL.StatSet("post_bu", 1);
                    } else {
                        GLOBAL.StatSet("post_bu", 0);
                    }
                }
                this._building.Upgrade();
                this.Hide();
                BASE.Purchase("BRTOPUP", _loc4_, "BUILDINGOPTIONS.TopoffUpgrade");
            }
        }
    }

    public TopoffBuild(param1: MouseEvent = null): void {
        let _loc2_: any = GLOBAL._buildingProps[this._building._type - 1].costs[0];
        let _loc3_: boolean = BASE.isInfernoBuilding(this._building._type >>> 0);
        let _loc4_: any = _loc3_ ? BASE._iresources : BASE._resources;
        let _loc5_: int = 0;
        let _loc6_: boolean = false;
        let _loc7_: int = 1;
        while (_loc7_ < 5) {
            if (_loc2_["r" + _loc7_].Get() > 0) {
                if (_loc2_["r" + _loc7_].Get() > _loc4_["r" + _loc7_ + "max"]) {
                    _loc6_ = true;
                } else if (_loc2_["r" + _loc7_].Get() > _loc4_["r" + _loc7_].Get()) {
                    _loc5_ = (_loc5_ + (_loc2_["r" + _loc7_].Get() - _loc4_["r" + _loc7_].Get())) | 0;
                }
            }
            _loc7_++;
        }
        let _loc8_: int = Math.ceil(Math.pow(Math.sqrt(_loc5_ / 2), 0.75)) | 0;
        if (_loc6_) {
            GLOBAL.Message(KEYS.Get("msg_overcapacity"));
        } else if (_loc8_ > BASE._credits.Get()) {
            POPUPS.DisplayGetShiny();
        } else if (!GLOBAL.ioConfirmShiny(_loc8_, "to make up the missing resources and build", (): void => {
            this.TopoffBuild(param1);
        })) {
            return;
        } else {
            BASE.Purchase("BRTOPUP", _loc8_, "BUILDINGOPTIONS.TopoffBuild");
            _loc7_ = 1;
            while (_loc7_ < 5) {
                if (_loc2_["r" + _loc7_].Get() > 0 && _loc2_["r" + _loc7_].Get() > _loc4_["r" + _loc7_].Get()) {
                    BASE.Fund(_loc7_, _loc2_["r" + _loc7_].Get() - _loc4_["r" + _loc7_].Get(), false, null, _loc3_);
                }
                _loc7_++;
            }
            this.ActionResourceBuild();
        }
    }

    private TopoffFortify(param1: MouseEvent = null): void {
        let _loc4_: int = 0;
        let _loc6_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: boolean = false;
        let _loc5_: any = this._building._buildingProps.fortify_costs[this._building._fortification.Get()];
        _loc6_ = 1;
        while (_loc6_ < 5) {
            if (_loc5_["r" + _loc6_].Get() > 0) {
                if (_loc5_["r" + _loc6_].Get() > BASE._resources["r" + _loc6_ + "max"]) {
                    _loc3_ = true;
                } else if (_loc5_["r" + _loc6_].Get() > BASE._resources["r" + _loc6_].Get()) {
                    _loc2_ = (_loc2_ + (_loc5_["r" + _loc6_].Get() - BASE._resources["r" + _loc6_].Get())) | 0;
                }
            }
            _loc6_++;
        }
        _loc4_ = Math.ceil(Math.pow(Math.sqrt(_loc2_ / 2), 0.75)) | 0;
        if (_loc3_) {
            GLOBAL.Message(KEYS.Get("msg_overcapacity"));
        } else if (BASE._pendingPurchase.length == 0) {
            if (_loc4_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else if (!GLOBAL.ioConfirmShiny(_loc4_, "to make up the missing resources and fortify", (): void => {
                this.TopoffFortify(param1);
            })) {
                return;
            } else {
                _loc6_ = 1;
                while (_loc6_ < 5) {
                    if (_loc5_["r" + _loc6_].Get() > 0 && _loc5_["r" + _loc6_].Get() > BASE._resources["r" + _loc6_].Get()) {
                        BASE.Fund(_loc6_, _loc5_["r" + _loc6_].Get() - BASE._resources["r" + _loc6_].Get());
                    }
                    _loc6_++;
                }
                this._building.Fortify();
                this.Hide();
                BASE.Purchase("BRTOPUP", _loc4_, "BUILDINGOPTIONS.TopoffFortify");
            }
        }
    }

    private Render(param1: string): string {
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
        let buildingProps: any = GLOBAL._buildingProps[this._building._type - 1];
        if (str != "fortify" && GLOBAL.INFERNO_ONLY && IoMenuArt.OVERWORLD_PICTURES[this._building._type] && IoMenuArt.wanted(buildingProps)) {
            // Inferno-only: a building with Inferno yard art and only the overworld's picture is drawn from its
            // yard art, at the level it is (or is being upgraded to)
            let artLevel: int = Math.max(1, this._building._lvl.Get() + (str == "upgrade" ? 1 : 0)) | 0;
            let locked: boolean = Boolean(this._building._lvl.Get() == 0 && buildingProps.costs && buildingProps.costs[0] && !BASE.HasRequirements(buildingProps.costs[0]) && !buildingProps.rewarded);
            this.imageContainer.Clear();
            let paper: Shape = new Shape();
            paper.graphics.beginFill(16777215);
            paper.graphics.drawRect(0, 0, 120, 160);
            paper.graphics.endFill();
            this.imageContainer.addChild(paper);
            this.imageContainer.addChild(new IoMenuArt(buildingProps, artLevel, new Rectangle(0, 10, 120, 145), locked));
            return "";
        }
        if (str == "fortify") {
            FortifyImageLoaded = (param1: string, param2: BitmapData): void => {
                this.imageContainer.Clear();
                this.imageContainer.addChild(new Bitmap(param2));
            };
            nextFortifyLevel = (this._building._fortification.Get() + 1) | 0;
            if (nextFortifyLevel > 4) {
                nextFortifyLevel = 4;
            }
            img = "fortifybuttons/" + "fort" + nextFortifyLevel + ".png";
            ImageCache.GetImageWithCallBack(img, FortifyImageLoaded);
        } else if (buildingProps.upgradeImgData) {
            ImageLoaded = (param1: string, param2: BitmapData): void => {
                this.imageContainer.Clear();
                this.imageContainer.addChild(new Bitmap(param2));
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
                if (lowestLevel != int.MAX_VALUE && buildingProps.upgradeImgData[lowestLevel].silhouette_img && !BASE.HasRequirements(buildingProps.costs[0]) && !buildingProps.rewarded) {
                    img = String(buildingProps.upgradeImgData.baseurl + buildingProps.upgradeImgData[lowestLevel].silhouette_img);
                }
            }
            if (!img) {
                if (this._building._lvl.Get() == 0) {
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
                    if (Boolean(imageDataA[this._building._lvl.Get()]) && imageDataA[this._building._lvl.Get()] >= this._building._buildingProps.hp.length) {
                        imageDataB = imageDataA[this._building._lvl.Get()];
                        imageLevel = this._building._lvl.Get() | 0;
                    } else {
                        i = this._building._lvl.Get() | 0;
                        if (str == "upgrade") {
                            i += 1;
                        }
                        if (Boolean(imageDataA[i]) && i > this._building._lvl.Get()) {
                            imageDataB = imageDataA[i];
                            imageLevel = i;
                        } else {
                            j = this._building._lvl.Get() | 0;
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
                this.imageContainer.Clear();
                this.imageContainer.addChild(new Bitmap(param2));
            };
            if (Boolean(buildingProps.buildingbuttons) && Boolean(BASE._buildingsStored["bl" + this._building._type]) && buildingProps.buildingbuttons.length >= BASE._buildingsStored["bl" + this._building._type].Get()) {
                img = "buildingbuttons/" + buildingProps.buildingbuttons[BASE._buildingsStored["bl" + this._building._type].Get() - 1] + ".jpg";
            } else if (Boolean(buildingProps.buildingbuttons) && buildingProps.buildingbuttons.length >= this._building._lvl.Get()) {
                img = "buildingbuttons/" + buildingProps.buildingbuttons[this._building._lvl.Get() - 1] + ".jpg";
            } else if (Boolean(buildingProps.buildingbuttons) && buildingProps.buildingbuttons.length > 0) {
                img = "buildingbuttons/" + buildingProps.buildingbuttons[0] + ".jpg";
            } else {
                img = "buildingbuttons/" + this._building._type + ".jpg";
                // Inferno-only: the Chaos Factory's and Lab's pictures have names of their own (133.jpg and
                // 134.jpg don't exist: their window showed an empty frame)
                if (GLOBAL.INFERNO_ONLY && this._building._type == 133) {
                    img = "buildingbuttons/seige_factory.jpg";
                } else if (GLOBAL.INFERNO_ONLY && this._building._type == 134) {
                    img = "buildingbuttons/siege_lab.jpg";
                }
            }
            ImageCache.GetImageWithCallBack(img, DefaultImageLoaded);
        }
        return img;
    }

    private onPostRollOver(param1: MouseEvent): void {
        if (this._doStreamPost && BASE.isMainYard) {
            this.mcInfoCB.visible = true;
        }
    }

    private onPostRollOut(param1: MouseEvent): void {
        if (this._doStreamPost && BASE.isMainYard) {
            this.mcInfoCB.visible = false;
        }
    }

    public toggleCheckbox(param1: boolean = false): void {
        if (this._doStreamPost && BASE.isMainYard) {
            this.mcInfoCB.visible = false;
            this.mcCBBG.visible = param1;
            this.streampost_cb.visible = param1;
        }
    }

    public Hide(): void {
        try {
            BUILDINGS._mc.HideInfo();
        } catch (e) {
        }
        try {
            BUILDINGOPTIONS.Hide();
        } catch (e) {
        }
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
