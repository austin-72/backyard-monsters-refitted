import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { CREATURELOCKER, CREATURES, GLOBAL, ImageCache, KEYS, MONSTERLAB, MONSTERLABITEM_CLIP, MONSTERLABPOPUP_CLIP, POPUPSETTINGS, STORE, ScrollSet } from "@game";

export class MONSTERLABPOPUP extends MONSTERLABPOPUP_CLIP {
    static {
        as3.fields(this, { _portraitImage: null, _statusImage: null, tf_title: null, tf_statusTitle: null, tf_statusDesc: null, tf_statusIdle: null, icon_status: null, pBar_status: null, tf_statusPBarLabel: null, btn_action: null, tf_stats: null, tf_statsPBar: null, tf_statsPBarLabel: null, tf_statsWarning: null, pBar_stats: null, btn_resource: null, btn_instant: null, _scrollbar: null, _shell: null, list_mc: null, _listContainer: null, _abilityUpgradesList: null });
    }

    public static _page: int = 1;

    public static _maxSpeed: int = 0;

    public static _maxHealth: int = 0;

    public static _maxDamage: int = 0;

    public static _maxTime: int = 0;

    public static _maxResource: int = 0;

    public static _maxStorage: int = 0;

    public static _maxAbility: int = 0;

    public static _instantUpgradeCost: int = 0;

    public static _STATE: string = "IDLE";

    public static _creatureID: string = null;

    public static _labItems: any = {};

    public static _bMonsterLab: MONSTERLAB = null;

    public static _instantUnlockCost: int = 0;

    public static _unlockLevel: int = 0;

    public static _maxLevel: int = 3;
    private _portraitImage: MovieClip;
    private _statusImage: MovieClip;
    private tf_title: TextField;
    private tf_statusTitle: TextField;
    private tf_statusDesc: TextField;
    private tf_statusIdle: TextField;
    private icon_status: MovieClip;
    private pBar_status: MovieClip;
    private tf_statusPBarLabel: TextField;
    private btn_action: MovieClip;
    private tf_stats: TextField;
    private tf_statsPBar: TextField;
    private tf_statsPBarLabel: TextField;
    private tf_statsWarning: TextField;
    private pBar_stats: MovieClip;
    private btn_resource: MovieClip;
    private btn_instant: MovieClip;
    private _scrollbar: ScrollSet;
    private _shell: Sprite;
    private list_mc: MovieClip;
    private _listContainer: Sprite;
    public _abilityUpgradesList: any[];

    public $ctor(): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        super.$ctor();
        this.tf_title = this.title_txt;
        this.tf_statusTitle = this.tStatusTitle;
        this.tf_statusDesc = this.tStatusDesc;
        this.tf_statusIdle = this.tIdle;
        this.icon_status = this.mcStatusIcon;
        this.pBar_status = this.mcPBarStatus;
        this.tf_statusPBarLabel = this.tProgress;
        this.btn_action = this.bAction;
        this.tf_stats = this.tStatsTitle;
        this.tf_statsPBar = this.tStatsPBar;
        this.tf_statsPBarLabel = this.tStatsPBarLabel;
        this.tf_statsWarning = this.tStatsWarning;
        this.pBar_stats = this.mcPBarStats;
        this.btn_resource = this.mcResources;
        this.btn_instant = this.mcInstant;
        this.list_mc = this.mcList;
        this._scrollbar = new ScrollSet();
        MONSTERLABPOPUP._bMonsterLab = as3.as(GLOBAL._bLab, MONSTERLAB);
        let _loc1_: int = 3;
        while (_loc1_ < 5) {
            this.btn_resource["mcR" + _loc1_].visible = false;
            this.btn_resource["mcR" + _loc1_].tTitle.htmlText = "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[_loc1_ - 1])) + "</b>";
            this.btn_resource["mcR" + _loc1_].tValue.htmlText = "<b>0</b>";
            this.btn_resource["mcR" + _loc1_].gotoAndStop(_loc1_);
            _loc1_++;
        }
        this.btn_resource.mcTime.visible = false;
        this.btn_resource.mcTime.tTitle.htmlText = "<b>" + KEYS.Get("#r_time#") + "</b>";
        this.btn_resource.mcTime.gotoAndStop(6);
        this.btn_instant.tDescription.htmlText = "<b>" + KEYS.Get("lab_upgradeinstant") + "</b>";
        this.tf_title.htmlText = "<b>" + KEYS.Get("monsterlab_title") + "</b>";
        this.tf_statusIdle.htmlText = "<b>" + KEYS.Get("lab_selectability") + "</b>";
        if (MONSTERLABPOPUP._bMonsterLab._upgrading) {
            this.tf_statusTitle.htmlText = KEYS.Get("monsterlab_currentlyresearching", { "v1": KEYS.Get(as3.str(MONSTERLAB._powerupProps[MONSTERLABPOPUP._bMonsterLab._upgrading].name)) });
            this.tf_statusDesc.htmlText = "<b>" + KEYS.Get("lab_level", { "v1": MONSTERLABPOPUP._bMonsterLab._upgradeLevel }) + "</b>";
            _loc2_ = (MONSTERLABPOPUP._bMonsterLab._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
            this.tf_statusPBarLabel.htmlText = "<b>" + GLOBAL.ToTime(_loc2_, true) + "</b>";
            _loc3_ = MONSTERLAB.GetTimeCost(MONSTERLABPOPUP._bMonsterLab._upgrading, MONSTERLABPOPUP._bMonsterLab._upgradeLevel);
            _loc4_ = (100 - 100 / _loc3_ * _loc2_) | 0;
            this.mcPBarStatus.mcBar.width = _loc4_;
            this.mcPBarStatus.mcBar2.width = _loc4_;
        }
        this.tf_stats.htmlText = "<b>" + KEYS.Get("lab_rocketslevel", { "v1": 0 }) + "</b>" + "<br>" + KEYS.Get("lab_rockets_desc");
        this.tf_statsPBar.htmlText = "<b>" + KEYS.Get("lab_ability") + "</b>";
        this.tf_statsPBarLabel.htmlText = "<b>" + KEYS.Get("lab_davename") + "</b>";
        this.tf_statsWarning.htmlText = "<b>" + KEYS.Get("lab_locked", { "v1": 2 }) + "</b>";
        if (MONSTERLABPOPUP._bMonsterLab._upgrading) {
            this.Setup(MONSTERLABPOPUP._bMonsterLab._upgrading);
        } else {
            this.Setup("C3");
        }
    }

    public Setup(param1: string): void {
        MONSTERLABPOPUP._creatureID = param1;
        this.List();
        this.Update(MONSTERLABPOPUP._creatureID, true);
    }

    private UpdatePortrait(param1: string): void {
        let UpdatePortraitIcon: Function = null;
        let UpdateStatusIcon: Function = null;
        let key: string = param1;
        UpdatePortraitIcon = (param1: string, param2: BitmapData): void => {
            this.mcPortraitIcon.mcImage.addChild(new Bitmap(param2));
            this.mcPortraitIcon.loading.visible = false;
        };
        UpdateStatusIcon = (param1: string, param2: BitmapData): void => {
            this.icon_status.mcImage.addChild(new Bitmap(param2));
            this.icon_status.loading.visible = false;
        };
        this._portraitImage = as3.cast(this.mcPortraitIcon.mcImage, MovieClip);
        this._statusImage = as3.cast(this.icon_status.mcImage, MovieClip);
        if (this.mcPortraitIcon.mcImage) {
            while (this._portraitImage.numChildren) {
                this._portraitImage.removeChildAt(0);
            }
        }
        if (this.icon_status.mcImage) {
            while (this._statusImage.numChildren) {
                this._statusImage.removeChildAt(0);
            }
        }
        ImageCache.GetImageWithCallBack("popups/" + MONSTERLABPOPUP._creatureID + "-LAB-150.png", UpdatePortraitIcon);
        ImageCache.GetImageWithCallBack("popups/" + MONSTERLABPOPUP._creatureID + "-LAB-75.jpg", UpdateStatusIcon);
    }

    public Update(param1: string, param2: boolean = false): void {
        let _loc14_: any = undefined;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc16_: boolean = false;
        MONSTERLABPOPUP._creatureID = param1;
        if (!param1) {
            MONSTERLABPOPUP._creatureID = "C3";
        }
        if (MONSTERLABPOPUP._bMonsterLab._upgrading) {
            MONSTERLABPOPUP._creatureID = MONSTERLABPOPUP._bMonsterLab._upgrading;
        }
        let _loc3_: any = MONSTERLAB._powerupProps[MONSTERLABPOPUP._creatureID];
        let _loc4_: int = 0;
        if (Boolean(GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID]) && Boolean(GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID].powerup)) {
            _loc4_ = GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID].powerup | 0;
        } else {
            _loc4_ = 0;
        }
        MONSTERLABPOPUP._unlockLevel = (_loc4_ + 1) | 0;
        let _loc5_: any = MONSTERLABPOPUP._bMonsterLab.CanPowerup(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
        let _loc6_: any[] = as3.cast(MONSTERLAB._powerupProps[MONSTERLABPOPUP._creatureID].costs[MONSTERLABPOPUP._unlockLevel - 1], Array);
        let _loc7_: any = CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID];
        let _loc8_: any = MONSTERLAB._powerupProps[MONSTERLABPOPUP._creatureID];
        if (MONSTERLABPOPUP._unlockLevel == 1) {
            this.tf_stats.htmlText = "<b>" + KEYS.Get(as3.str(_loc8_.name)) + "</b><br>" + KEYS.Get(as3.str(_loc8_.description));
        } else {
            this.tf_stats.htmlText = "<b>" + KEYS.Get(as3.str(_loc8_.name)) + "</b><br>" + KEYS.Get(as3.str(_loc8_.upgrade_description));
        }
        this.tf_statsPBar.htmlText = "<b>" + KEYS.Get(as3.str(_loc8_.name)) + "</b>";
        let _loc9_: string = "";
        if (MONSTERLABPOPUP._bMonsterLab.CanPowerup(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel).errorString == "Fully Powered Up") {
            MONSTERLABPOPUP._unlockLevel = 3;
        }
        switch (MONSTERLABPOPUP._creatureID) {
            case "C2":
                _loc9_ = _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C3":
                _loc9_ = _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C4":
                _loc9_ = _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C5":
                _loc9_ = _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] * 100 + "% " + _loc8_.ability;
                break;
            case "C7":
                _loc9_ = _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + "x speed " + _loc8_.ability;
                break;
            case "C8":
                _loc9_ = CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].props.damage[MONSTERLABPOPUP._unlockLevel - 1] * _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C9":
                _loc9_ = String(_loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + _loc8_.ability);
                break;
            case "C11":
                _loc9_ = CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].props.damage[MONSTERLABPOPUP._unlockLevel - 1] * _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C12":
                _loc9_ = _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C13":
                _loc9_ = CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].props.damage[MONSTERLABPOPUP._unlockLevel - 1] * _loc8_.effect[MONSTERLABPOPUP._unlockLevel - 1] + " " + _loc8_.ability;
                break;
            case "C14":
                _loc9_ = MONSTERLABPOPUP._unlockLevel + " " + _loc8_.ability;
        }
        if (MONSTERLABPOPUP._bMonsterLab.CanPowerup(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel).errorString == "Fully Powered Up") {
            MONSTERLABPOPUP._unlockLevel = 4;
        }
        this.tf_statsPBarLabel.htmlText = _loc9_;
        let _loc10_: number = 100 / MONSTERLABPOPUP._maxLevel * Math.min(MONSTERLABPOPUP._unlockLevel - 1, MONSTERLABPOPUP._maxLevel);
        let _loc11_: number = 100 / MONSTERLABPOPUP._maxLevel * Math.min(MONSTERLABPOPUP._unlockLevel, MONSTERLABPOPUP._maxLevel) - 1;
        this.pBar_stats.mcBar.width = Math.max(_loc10_, 1);
        this.pBar_stats.mcBar2.width = Math.max(_loc11_, 1);
        this.pBar_stats.mcBar2.gotoAndStop(3);
        this.tf_statsWarning.visible = false;
        this.UpdatePortrait(MONSTERLABPOPUP._creatureID);
        if (Boolean(MONSTERLABPOPUP._bMonsterLab._upgrading) && GLOBAL.Timestamp() < MONSTERLABPOPUP._bMonsterLab._upgradeFinishTime.Get()) {
            this.StatusChange("WORKING");
            this.btn_action.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
            this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterPowerup));
            this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
            this.btn_instant.gArrow.visible = false;
            this.btn_instant.tDescription.visible = false;
            this.btn_instant.gCoin.visible = false;
            this.btn_instant.bAction.SetupKey("btn_cancel");
            this.btn_instant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterPowerup));
            this.btn_instant.bAction.Highlight = false;
            this.btn_action.SetupKey("btn_speedup");
            this.btn_action.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
            this.btn_action.Highlight = true;
            this.btn_action.Enabled = true;
            this.btn_resource.mcR3.visible = false;
            this.btn_resource.mcR4.visible = false;
            this.btn_resource.mcTime.visible = false;
            this.btn_resource.visible = false;
        } else {
            this.StatusChange("IDLE");
            if (!_loc5_.error) {
                _loc12_ = MONSTERLAB.GetPuttyCost(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
                _loc13_ = MONSTERLAB.GetTimeCost(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
                MONSTERLABPOPUP._instantUnlockCost = MONSTERLAB.GetShinyCost(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
                this.btn_instant.tDescription.htmlText = "<b>" + KEYS.Get("buildoptions_upgradeinstant") + "</b>";
                this.btn_instant.gArrow.visible = true;
                this.btn_instant.tDescription.visible = true;
                this.btn_instant.gCoin.visible = true;
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterPowerup));
                this.btn_instant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": MONSTERLABPOPUP._instantUnlockCost }));
                this.btn_instant.bAction.Enabled = true;
                this.btn_instant.bAction.Highlight = true;
                this.btn_instant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
                this.btn_resource.bAction.SetupKey("btn_startunlocking");
                this.btn_resource.bAction.Enabled = true;
                this.btn_resource.bAction.Highlight = true;
                this.btn_resource.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterPowerup));
                this.btn_resource.bAction.visible = true;
                this.btn_resource.mcR3.visible = true;
                this.btn_resource.mcR3.tValue.htmlText = "<b><font color=\"#" + (_loc6_[0] > GLOBAL._resources.r3.Get() ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(_loc12_) + "</font></b>";
                this.btn_resource.mcR4.visible = true;
                this.btn_resource.mcTime.visible = true;
                this.btn_resource.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime(_loc13_) + "</b>";
                this.btn_instant.visible = true;
                this.btn_resource.visible = true;
            } else if (_loc5_.errorString == KEYS.Get("acad_err_putty")) {
                this.StatusChange("IDLE");
                _loc12_ = MONSTERLAB.GetPuttyCost(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
                _loc13_ = MONSTERLAB.GetTimeCost(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
                MONSTERLABPOPUP._instantUnlockCost = MONSTERLAB.GetShinyCost(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
                this.btn_instant.tDescription.htmlText = KEYS.Get("academy_traininstantly");
                this.btn_instant.tDescription.visible = true;
                this.btn_instant.gArrow.visible = true;
                this.btn_instant.gCoin.visible = true;
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterPowerup));
                this.btn_instant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": MONSTERLABPOPUP._instantUnlockCost }));
                this.btn_instant.bAction.Enabled = true;
                this.btn_instant.bAction.Highlight = true;
                this.btn_instant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
                this.btn_resource.mcR3.visible = true;
                this.btn_resource.mcR3.tValue.htmlText = "<b><font color=\"#" + (_loc6_[0] > GLOBAL._resources.r3.Get() ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(Number(_loc6_[0])) + "</font></b>";
                this.btn_resource.mcR4.visible = true;
                this.btn_resource.mcTime.visible = true;
                this.btn_resource.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime(_loc6_[1] | 0, true) + "</b>";
                this.btn_resource.bAction.Setup(_loc5_.errorString);
                this.btn_resource.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterPowerup));
                this.btn_resource.bAction.Enabled = false;
                this.btn_resource.bAction.Highlight = false;
                this.btn_resource.bAction.visible = true;
                this.btn_instant.visible = true;
                this.btn_resource.visible = true;
            } else if (Boolean(GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID]) && GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID].powerup == MONSTERLABPOPUP._maxLevel) {
                this.btn_instant.bAction.SetupKey("acad_err_fullytrained");
                this.btn_instant.bAction.Enabled = false;
                this.btn_instant.bAction.Highlight = false;
                this.btn_instant.gCoin.visible = false;
                this.btn_instant.gArrow.visible = false;
                this.btn_instant.tDescription.visible = false;
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterPowerup));
                this.btn_resource.visible = false;
            } else if ((as3.as(MONSTERLABPOPUP._bMonsterLab.CanPowerup(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel), Object)).error) {
                this.btn_instant.bAction.SetupKey("mon_locked");
                this.btn_instant.bAction.Enabled = false;
                this.btn_instant.bAction.Highlight = false;
                this.btn_instant.gCoin.visible = false;
                this.btn_instant.gArrow.visible = false;
                this.btn_instant.tDescription.visible = false;
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterPowerup));
                this.btn_instant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterPowerup));
                this.btn_resource.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterPowerup));
                this.btn_resource.visible = false;
                if (MONSTERLABPOPUP._bMonsterLab._lvl.Get() < MONSTERLABPOPUP._unlockLevel) {
                    this.tf_statsWarning.htmlText = KEYS.Get("monsterlab_requiredlevel", { "v1": MONSTERLABPOPUP._unlockLevel });
                    this.tf_statsWarning.visible = true;
                } else if (CREATURELOCKER._lockerData[MONSTERLABPOPUP._creatureID] == null || CREATURELOCKER._lockerData[MONSTERLABPOPUP._creatureID].t < 2 || GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID] == null || GLOBAL.player.m_upgrades[MONSTERLABPOPUP._creatureID].level <= MONSTERLABPOPUP._unlockLevel) {
                    if (MONSTERLABPOPUP._bMonsterLab._lvl.Get() < MONSTERLABPOPUP._unlockLevel) {
                        this.tf_statsWarning.htmlText += "<br>" + KEYS.Get("monsterlab_requiredlevel2", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].name)), "v2": MONSTERLABPOPUP._unlockLevel + 1 });
                    } else {
                        this.tf_statsWarning.htmlText = KEYS.Get("monsterlab_requiredlevel2", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].name)), "v2": MONSTERLABPOPUP._unlockLevel + 1 });
                    }
                    this.tf_statsWarning.visible = true;
                }
            }
        }
        _loc14_ = (_loc14_ = (_loc14_ = "<b>" + KEYS.Get("acad_mon_name") + "</b> " + KEYS.Get(as3.str(CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].name)) + "<br>") + ("<b>" + KEYS.Get("acad_mon_status") + "</b> " + _loc5_.status)) + ("<br>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[MONSTERLABPOPUP._creatureID].description)));
        let _loc15_: int = 0;
        if ((_loc15_ = CREATURES.GetProperty(MONSTERLABPOPUP._creatureID, "damage", 0, true) | 0) > 0) {
            _loc16_ = false;
        } else {
            _loc16_ = true;
        }
    }

    public Tick(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (MONSTERLABPOPUP._bMonsterLab._upgrading) {
            this.tf_statusTitle.htmlText = KEYS.Get("monsterlab_currentlyresearching", { "v1": KEYS.Get(as3.str(MONSTERLAB._powerupProps[MONSTERLABPOPUP._bMonsterLab._upgrading].name)) });
            this.tf_statusDesc.htmlText = "<b>" + KEYS.Get("lab_level", { "v1": MONSTERLABPOPUP._bMonsterLab._upgradeLevel }) + "</b>";
            _loc1_ = (MONSTERLABPOPUP._bMonsterLab._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
            this.tf_statusPBarLabel.htmlText = "<b>" + GLOBAL.ToTime(_loc1_, true) + "</b>";
            _loc2_ = MONSTERLAB.GetTimeCost(MONSTERLABPOPUP._bMonsterLab._upgrading, MONSTERLABPOPUP._bMonsterLab._upgradeLevel);
            _loc3_ = (100 - 100 / _loc2_ * _loc1_) | 0;
            this.mcPBarStatus.mcBar.width = _loc3_;
            this.mcPBarStatus.mcBar2.width = _loc3_;
        }
        if (this._scrollbar) {
            if (!this._scrollbar.visible) {
                this._scrollbar.visible = true;
                this.list_mc.addChild(this._scrollbar);
            }
            this._scrollbar.Update();
        }
    }

    public StartMonsterPowerup(param1: MouseEvent): void {
        MONSTERLABPOPUP._bMonsterLab.StartMonsterPowerup(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
        this.Setup(MONSTERLABPOPUP._creatureID);
    }

    public InstantMonsterPowerup(param1: MouseEvent): void {
        MONSTERLABPOPUP._bMonsterLab.InstantMonsterPowerup(MONSTERLABPOPUP._creatureID, MONSTERLABPOPUP._unlockLevel);
        this.Setup(MONSTERLABPOPUP._creatureID);
    }

    public CancelMonsterPowerup(param1: MouseEvent): void {
        MONSTERLABPOPUP._bMonsterLab.CancelMonsterPowerup(param1);
    }

    public SpeedUp(param1: MouseEvent): void {
        GLOBAL._selectedBuilding = MONSTERLABPOPUP._bMonsterLab;
        STORE.SpeedUp("SP4");
    }

    public List(): void {
        let offset: int = 0;
        let i: int = 0;
        let UpdateItemIcon: Function = null;
        let cr: string = null;
        let abilityUpgrade: any = null;
        let data: any = null;
        let item: MONSTERLABITEM_CLIP = null;
        let str: string = null;
        let itemIconImage: MovieClip = null;
        this._abilityUpgradesList = [];
        for (cr in MONSTERLAB._powerupProps) {
            abilityUpgrade = MONSTERLAB._powerupProps[cr];
            if (!abilityUpgrade.blocked && !(Boolean(CREATURELOCKER._creatures[cr]) && Boolean(CREATURELOCKER._creatures[cr].blocked))) {
                abilityUpgrade.id = cr;
                this._abilityUpgradesList.push(abilityUpgrade);
            }
        }
        as3.sortOn(this._abilityUpgradesList, ["order"], Array.NUMERIC);
        if (this._listContainer) {
            this.list_mc.mcContainer.removeChild(this._listContainer);
        }
        this._listContainer = as3.cast(this.list_mc.mcContainer.addChild(new Sprite()), Sprite);
        this._listContainer.x = 0;
        this._listContainer.y = 0;
        this._listContainer.mask = as3.cast(this.list_mc.mcMask, DisplayObject);
        this._scrollbar.x = 190;
        this._scrollbar.y = 0;
        this.list_mc.addChild(this._scrollbar);
        this._scrollbar.Init(this._listContainer, as3.cast(this.list_mc.mcMask, MovieClip), 0, 0, this.list_mc.height, 20);
        this._scrollbar.AutoHideEnabled = false;
        this._scrollbar.visible = false;
        offset = 0;
        i = 0;
        while (i < this._abilityUpgradesList.length) {
            UpdateItemIcon = (param1: string, param2: BitmapData): void => {
                let _loc3_: MONSTERLABITEM_CLIP = as3.cast(MONSTERLABPOPUP._labItems[param1], MONSTERLABITEM_CLIP);
                _loc3_.mcIcon.mcImage.addChild(new Bitmap(param2));
                _loc3_.mcIcon.loading.visible = false;
            };
            abilityUpgrade = this._abilityUpgradesList[i];
            cr = String(abilityUpgrade.id);
            data = MONSTERLAB._powerupProps[cr];
            item = as3.as(this._listContainer.addChild(new MONSTERLABITEM_CLIP()), MONSTERLABITEM_CLIP);
            MONSTERLABPOPUP._labItems["popups/" + cr + "-LAB-50.jpg"] = item;
            item.y = offset;
            offset += 60;
            str = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[cr].name)) + "</b><br>" + KEYS.Get(as3.str(abilityUpgrade.name));
            item.tLabel.htmlText = str;
            item.addEventListener(MouseEvent.MOUSE_DOWN, this.Show(cr));
            item.buttonMode = true;
            item.mouseChildren = false;
            item.mouseEnabled = true;
            if (Boolean(GLOBAL.player.m_upgrades[cr]) && Boolean(GLOBAL.player.m_upgrades[cr].powerup)) {
                item.mcLevel.tLevel.htmlText = "" + GLOBAL.player.m_upgrades[cr].powerup + "";
            } else {
                item.mcLevel.visible = false;
            }
            itemIconImage = as3.cast(item.mcIcon.mcImage, MovieClip);
            if (itemIconImage) {
                while (itemIconImage.numChildren) {
                    itemIconImage.removeChildAt(0);
                }
            }
            ImageCache.GetImageWithCallBack("popups/" + cr + "-LAB-50.jpg", UpdateItemIcon);
            if (data) {
                if (data.t != 1) {
                    if (data.t == 2) {
                    }
                }
            }
            i++;
        }
    }

    public get Scrollbar(): any {
        return this._scrollbar;
    }

    public Show(param1: string): Function {
        let creatureID: string = null;
        creatureID = param1;
        return (param1: MouseEvent = null): void => {
            this.Update(creatureID, true);
        };
    }

    public StatusChange(param1: string): void {
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        let _loc2_: any = MONSTERLAB._powerupProps[MONSTERLABPOPUP._creatureID];
        _loc3_ = as3.cast(MONSTERLAB._powerupProps[MONSTERLABPOPUP._creatureID].costs[MONSTERLABPOPUP._unlockLevel - 1], Array);
        switch (param1) {
            case "IDLE":
                this.tf_statusIdle.visible = true;
                this.tf_statusTitle.visible = false;
                this.tf_statusDesc.visible = false;
                this.icon_status.visible = false;
                this.pBar_status.visible = false;
                this.tf_statusPBarLabel.visible = false;
                this.btn_action.visible = false;
                break;
            case "WORKING":
                this.tf_statusIdle.visible = false;
                this.tf_statusTitle.visible = true;
                this.tf_statusDesc.visible = true;
                this.icon_status.visible = true;
                this.pBar_status.visible = true;
                this.tf_statusPBarLabel.visible = true;
                this.btn_action.visible = true;
                _loc4_ = (MONSTERLABPOPUP._bMonsterLab._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
                _loc5_ = GLOBAL.ToTime(_loc4_, true);
                this.tf_statusPBarLabel.htmlText = "<b>" + _loc5_ + "</b>";
                _loc6_ = _loc3_[1] | 0;
                _loc7_ = 100 / _loc6_ * (_loc6_ - _loc4_);
                this.pBar_status.mcBar.width = Math.max(_loc7_, 1);
                this.pBar_status.mcBar2.width = Math.max(_loc7_, 1);
        }
    }

    public Hide(param1: MouseEvent = null): void {
        MONSTERLAB.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
