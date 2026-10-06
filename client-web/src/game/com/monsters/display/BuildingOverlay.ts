import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFormat } from "flash/text";
import { getTimer } from "flash/utils";
import { BFOUNDATION, BYMConfig, GLOBAL, ImageText, KEYS, MAP, bmp_healthbarlarge, bmp_healthbarsmall, bmp_overlaytext, bmp_progressbarlarge } from "@game";

export class BuildingOverlay extends ASObject {
    private static k_SHOW_DEBUG_HEALTH: boolean; // const

    private static debugHealth: TextField;

    private static _buildings: any;

    private static _bmdHPbarLarge: BitmapData;

    private static _bmdHPbarSmall: BitmapData;

    private static _bmpProgressBarLarge: BitmapData;

    private static _bmpOverlayText: BitmapData;

    private static _isSetup: boolean;

    private static u_bmd: BitmapData;

    private static r_bmd: BitmapData;

    private static b_bmd: BitmapData;

    private static f_bmd: BitmapData;

    private static labelWidth: int;

    private static _textDO: DisplayObject;

    static {
        as3.lazyStatics(this, { k_SHOW_DEBUG_HEALTH: false, debugHealth: null, _buildings: null, _bmdHPbarLarge: null, _bmdHPbarSmall: null, _bmpProgressBarLarge: null, _bmpOverlayText: null, _isSetup: false, u_bmd: null, r_bmd: null, b_bmd: null, f_bmd: null, labelWidth: 0, _textDO: null }, () => {
            BuildingOverlay.k_SHOW_DEBUG_HEALTH = false;
            BuildingOverlay._buildings = {};
            BuildingOverlay._bmdHPbarLarge = new bmp_healthbarlarge(0, 0);
            BuildingOverlay._bmdHPbarSmall = new bmp_healthbarsmall(0, 0);
            BuildingOverlay._bmpProgressBarLarge = new bmp_progressbarlarge(0, 0);
            BuildingOverlay._bmpOverlayText = new bmp_overlaytext(0, 0);
            BuildingOverlay._isSetup = false;
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: BFOUNDATION): void {
        let _loc2_: DisplayObject = null;
        let _loc3_: Sprite = null;
        let _loc4_: Point = null;
        let _loc5_: any[] = null;
        let _loc6_: any[] = null;
        let _loc7_: BitmapData = null;
        _loc4_ = param1._overlayOffset;
        if (!BuildingOverlay._isSetup) {
            BuildingOverlay._isSetup = true;
            BuildingOverlay.labelWidth = 0;
            _loc5_ = [new GlowFilter(0, 1, 2, 2, 4, 1)];
            BuildingOverlay.u_bmd = ImageText.Get(KEYS.Get("bdg_state_upgrading"), 9, 0, _loc5_);
            BuildingOverlay.r_bmd = ImageText.Get(KEYS.Get("bdg_state_repairing"), 9, 0, _loc5_);
            BuildingOverlay.b_bmd = ImageText.Get(KEYS.Get("bdg_state_building"), 9, 0, _loc5_);
            BuildingOverlay.f_bmd = ImageText.Get(KEYS.Get("bdg_state_fortifying"), 9, 0, _loc5_);
            _loc6_ = [BuildingOverlay.u_bmd, BuildingOverlay.r_bmd, BuildingOverlay.b_bmd, BuildingOverlay.f_bmd];
            for (_loc7_ of as3.values(_loc6_)) {
                BuildingOverlay.labelWidth = BuildingOverlay.labelWidth > _loc7_.width ? BuildingOverlay.labelWidth : _loc7_.width;
            }
        }
        BuildingOverlay._buildings[param1._id] = { "container": new Sprite(), "bmdtext": new BitmapData(BuildingOverlay.labelWidth, 21, true, 16777215), "bmdprogress": new BitmapData(51, 6, true, 16777215), "bmdhp": new BitmapData(51, 6, true, 16777215), "indextext": "", "indexprogress": -1, "indexhp": -1 };
        _loc3_ = as3.cast(BuildingOverlay._buildings[param1._id].container, Sprite);
        _loc3_.mouseEnabled = false;
        _loc3_.mouseChildren = false;
        _loc2_ = _loc3_.addChild(new Bitmap(BuildingOverlay._buildings[param1._id].bmdtext));
        _loc2_.x = -26 + _loc4_.x + (51 - BuildingOverlay.labelWidth) * 0.5;
        _loc2_.y = -32 + _loc4_.y;
        _loc2_ = _loc3_.addChild(new Bitmap(BuildingOverlay._buildings[param1._id].bmdprogress));
        _loc2_.x = -26 + _loc4_.x;
        _loc2_.y = -20 + _loc4_.y;
        _loc2_ = _loc3_.addChild(new Bitmap(BuildingOverlay._buildings[param1._id].bmdhp));
        _loc2_.x = -26 + _loc4_.x;
        _loc2_.y = -14 + _loc4_.y;
        if (!BYMConfig.instance.RENDERER_ON) {
            param1._mc.addChild(_loc3_);
        } else {
            _loc3_.x = param1._mc.x;
            _loc3_.y = param1._mc.y;
            MAP._BUILDINGTOPS.addChild(_loc3_);
        }
        if (GLOBAL._aiDesignMode && BuildingOverlay.k_SHOW_DEBUG_HEALTH) {
            BuildingOverlay.debugHealth = new TextField();
            BuildingOverlay.debugHealth.defaultTextFormat = new TextFormat("Arial", 10, 16777215, true);
        }
        BuildingOverlay.Update(param1);
    }

    public static Update(param1: BFOUNDATION, param2: boolean = false): void {
        let _loc5_: BitmapData = null;
        let _loc6_: int = 0;
        let _loc8_: any = null;
        let _loc9_: Sprite = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc3_: int = -1;
        let _loc4_: string = "";
        let _loc7_: int = getTimer();
        if (!BuildingOverlay._buildings[param1._id]) {
            BuildingOverlay.Setup(param1);
        }
        _loc8_ = BuildingOverlay._buildings[param1._id];
        if (GLOBAL._render) {
            if (BYMConfig.instance.RENDERER_ON) {
                (_loc9_ = as3.cast(BuildingOverlay._buildings[param1._id].container, Sprite)).x = param1._mc.x;
                _loc9_.y = param1._mc.y;
            }
            if (param1._repairing) {
                _loc3_ = (49 / param1.maxHealth * param1.health) | 0;
                _loc4_ = "repairing";
            } else if (param1._countdownBuild.Get() > 0) {
                if (param1._prefab) {
                    _loc10_ = 0;
                    _loc11_ = 0;
                    while (_loc11_ < param1._prefab) {
                        _loc10_ = (_loc10_ + GLOBAL._buildingProps[param1._type - 1].costs[_loc11_].time.Get()) | 0;
                        _loc11_++;
                    }
                    _loc6_ = _loc10_;
                } else {
                    // Inferno-only: a building is built from its first cost (BFOUNDATION: costs[0]), whatever
                    // its level says: one under construction comes back from a save at level 1 (a save holds
                    // no level 0), and a Map Room has one cost only, so costs[1] threw on every frame when a
                    // yard with one being built was viewed (bug reports #42, #43)
                    _loc6_ = param1._buildingProps.costs && param1._buildingProps.costs[0] ? param1._buildingProps.costs[0].time.Get() | 0 : 0;
                }
                _loc6_ = Math.max(_loc6_, param1._countdownBuild.Get(), 1) | 0;
                _loc3_ = (49 / _loc6_ * (_loc6_ - param1._countdownBuild.Get())) | 0;
                _loc4_ = "building";
            } else if (param1._countdownUpgrade.Get() > 0) {
                if (param1._buildingProps.costs[param1._lvl.Get()]) {
                    _loc6_ = param1._buildingProps.costs[param1._lvl.Get()].time.Get() | 0;
                    _loc3_ = (49 / _loc6_ * (_loc6_ - param1._countdownUpgrade.Get())) | 0;
                    _loc4_ = "upgrading";
                }
            } else if (param1._countdownFortify.Get() > 0) {
                if (param1._buildingProps.fortify_costs[param1._fortification.Get()]) {
                    _loc6_ = param1._buildingProps.fortify_costs[param1._fortification.Get()].time.Get() | 0;
                    _loc3_ = (49 / _loc6_ * (_loc6_ - param1._countdownFortify.Get())) | 0;
                    _loc4_ = "fortifying";
                }
            }
            if (_loc4_ != _loc8_.indextext || param2) {
                _loc8_.indextext = _loc4_;
                _loc5_ = as3.cast(_loc8_.bmdtext, BitmapData);
                if (_loc4_ == "repairing") {
                    _loc5_.copyPixels(BuildingOverlay.r_bmd, new Rectangle(0, 0, BuildingOverlay.r_bmd.width, BuildingOverlay.r_bmd.height), new Point((BuildingOverlay.labelWidth - BuildingOverlay.r_bmd.width) * 0.5, -1));
                }
                if (_loc4_ == "building") {
                    _loc5_.copyPixels(BuildingOverlay.b_bmd, new Rectangle(0, 0, BuildingOverlay.b_bmd.width, BuildingOverlay.b_bmd.height), new Point((BuildingOverlay.labelWidth - BuildingOverlay.b_bmd.width) * 0.5, -1));
                }
                if (_loc4_ == "upgrading") {
                    _loc5_.copyPixels(BuildingOverlay.u_bmd, new Rectangle(0, 0, BuildingOverlay.u_bmd.width, BuildingOverlay.u_bmd.height), new Point((BuildingOverlay.labelWidth - BuildingOverlay.u_bmd.width) * 0.5, -1));
                }
                if (_loc4_ == "fortifying") {
                    _loc5_.copyPixels(BuildingOverlay.f_bmd, new Rectangle(0, 0, BuildingOverlay.f_bmd.width, BuildingOverlay.f_bmd.height), new Point((BuildingOverlay.labelWidth - BuildingOverlay.f_bmd.width) * 0.5, -1));
                }
            }
            if (_loc3_ == -1) {
                if (_loc8_.indexprogress != -1) {
                    _loc8_.indexprogress = -1;
                    _loc5_ = as3.cast(_loc8_.bmdtext, BitmapData);
                    _loc5_.fillRect(_loc5_.rect, 0);
                    _loc5_ = as3.cast(_loc8_.bmdprogress, BitmapData);
                    _loc5_.fillRect(_loc5_.rect, 0);
                }
            } else if (_loc3_ != _loc8_.indexprogress) {
                _loc8_.indexprogress = _loc3_;
                _loc5_ = as3.cast(_loc8_.bmdprogress, BitmapData);
                if (param1._repairing) {
                    _loc5_.fillRect(_loc5_.rect, 0);
                } else {
                    _loc5_.copyPixels(BuildingOverlay._bmpProgressBarLarge, new Rectangle(0, 6 * _loc3_, 51, 6), new Point(0, 0));
                }
            }
            if (BuildingOverlay.debugHealth) {
                BuildingOverlay.debugHealth.text = param1.health + "/" + param1.maxHealth;
                BuildingOverlay.debugHealth.visible = param1.isDamaged;
                param1.graphic.addChild(BuildingOverlay.debugHealth);
            }
            if (param1.health <= 0) {
                _loc8_.indexhp = -1;
                _loc5_ = as3.cast(_loc8_.bmdhp, BitmapData);
                _loc5_.fillRect(_loc5_.rect, 0);
            } else if (param1.health < param1.maxHealth) {
                _loc3_ = (19 - ((19 / param1.maxHealth * param1.health) | 0)) | 0;
                if (_loc3_ != _loc8_.indexhp) {
                    _loc8_.indexhp = _loc3_;
                    (_loc5_ = as3.cast(_loc8_.bmdhp, BitmapData)).copyPixels(BuildingOverlay._bmdHPbarLarge, new Rectangle(0, 6 * _loc3_, 51, 6), new Point(0, 0));
                }
            } else if (_loc8_.indexhp != -1) {
                _loc8_.indexhp = -1;
                _loc5_ = as3.cast(_loc8_.bmdhp, BitmapData);
                _loc5_.fillRect(_loc5_.rect, 0);
            }
        }
    }

    public static clearBuilding(param1: BFOUNDATION): void {
        let _loc2_: any = BuildingOverlay._buildings[param1._id];
        if (!_loc2_) {
            return;
        }
        BuildingOverlay.clearOverlay(_loc2_);
        delete BuildingOverlay._buildings[param1._id];
    }

    protected static clearOverlay(param1: any): void {
        if (Boolean(param1.container) && MAP._BUILDINGTOPS && param1.container.parent == MAP._BUILDINGTOPS) {
            MAP._BUILDINGTOPS.removeChild(as3.cast(param1.container, DisplayObject));
        }
        if (param1.bmdtext instanceof BitmapData) {
            param1.bmdtext.dispose();
        }
        if (param1.bmdprogress instanceof BitmapData) {
            param1.bmdprogress.dispose();
        }
        if (param1.bmdhp instanceof BitmapData) {
            param1.bmdhp.dispose();
        }
        param1.container = null;
        param1.indextext = null;
    }

    public static Clear(): void {
        let _loc1_: any = null;
        for (_loc1_ of as3.values(BuildingOverlay._buildings)) {
            BuildingOverlay.clearOverlay(_loc1_);
        }
        BuildingOverlay._buildings = {};
    }
}
