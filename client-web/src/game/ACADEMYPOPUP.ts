import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFormat } from "flash/text";
import { ACADEMY, ACADEMYPOPUP_CLIP, BASE, BFOUNDATION, BRESOURCE, BUILDING26, Button_CLIP, CREATURELOCKER, CREATURES, GLOBAL, ImageCache, InstanceManager, IoLockIcon, KEYS, LOGGER, POPUPS, POPUPSETTINGS, SOUNDS, STORE, popup_monster, IoSocial, IoShop } from "@game";

export class ACADEMYPOPUP extends ACADEMYPOPUP_CLIP {
    static {
        as3.fields(this, { _infernoFrameOffset: 6, _portraitImage: null, _guidePage: 1, _ioGridBtn: null, _ioGrid: null, _ioGridRows: null, _ioGridOn: false });
    }

    /** Inferno-only (QoL #351): the most damage per second of any monster, at its top level (the bars' full width). */
    public static _ioMaxDps: number = 0;

    /** Inferno-only (QoL #139): the button that shows the overview of every monster's training. */
    private _ioGridBtn: Button_CLIP;

    /** Inferno-only (QoL #139): that overview, over the stats and the training buttons while it is shown. */
    private _ioGrid: Sprite;

    /** Inferno-only (QoL #139): the overview's rows, by monster: {"lv": level, "st": can train, "tm": time}. */
    private _ioGridRows: any;

    private _ioGridOn: boolean;

    public static _page: int = 1;

    public static _monsterID: string = null;

    public static _maxSpeed: number = 0;

    public static _maxHealth: number = 0;

    public static _maxDamage: number = 0;

    public static _maxTime: number = 0;

    public static _maxResource: number = 0;

    public static _maxStorage: number = 0;

    private static _monsterString: string = "C";

    private static _maxMonsters: int = 19;

    private static lastAction: int = 0;

    public static _instantUpgradeCost: int = 0;
    private _infernoFrameOffset: int;
    private _portraitImage: DisplayObject;
    private _guidePage: int;

    public $ctor(): void {
        let _loc2_: string = null;
        super.$ctor();
        if (BASE.isInfernoMainYardOrOutpost) {
            ACADEMYPOPUP._monsterString = "IC";
            ACADEMYPOPUP._maxMonsters = (GLOBAL.INFERNO_ONLY ? ACADEMYPOPUP.ioRoster().length : CREATURELOCKER.NUM_ICREEP_TYPE) | 0;
            if (ACADEMYPOPUP._page > ACADEMYPOPUP._maxMonsters) {
                ACADEMYPOPUP._page = 1;
            }
        } else {
            ACADEMYPOPUP._monsterString = "C";
            ACADEMYPOPUP._maxMonsters = (CREATURELOCKER.NUM_CREEP_TYPE + 1) | 0;
        }
        this.bPrevious.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Previous));
        this.bPrevious.mcArrow.gotoAndStop(2);
        this.bNext.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Next));
        this.bNext.mcArrow.gotoAndStop(2);
        let _loc1_: int = 1;
        while (_loc1_ < 5) {
            this.bB["mcR" + _loc1_].visible = false;
            this.bB["mcR" + _loc1_].gotoAndStop(_loc1_ + (BASE.isInfernoMainYardOrOutpost ? this._infernoFrameOffset : 0));
            if (_loc1_ != 3) {
                this.bB["mcR" + _loc1_].alpha = 0.25;
            }
            this.bB["mcR" + _loc1_].tTitle.htmlText = "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[_loc1_ - 1])) + "</b>";
            this.bB["mcR" + _loc1_].tValue.htmlText = "<b>0</b>";
            _loc1_++;
        }
        this.bB.mcTime.visible = false;
        this.bB.mcTime.gotoAndStop((BASE.isInfernoMainYardOrOutpost ? this._infernoFrameOffset : 0) + 6);
        this.bB.mcTime.tTitle.htmlText = "<b>" + KEYS.Get("#r_time#") + "</b>";
        for (_loc2_ in CREATURELOCKER._creatures) {
            if (CREATURES.GetProperty(_loc2_, "speed", 10) > ACADEMYPOPUP._maxSpeed) {
                ACADEMYPOPUP._maxSpeed = CREATURES.GetProperty(_loc2_, "speed", 10);
            }
            if (CREATURES.GetProperty(_loc2_, "health", 10) > ACADEMYPOPUP._maxHealth) {
                ACADEMYPOPUP._maxHealth = CREATURES.GetProperty(_loc2_, "health", 10);
            }
            if (CREATURES.GetProperty(_loc2_, "damage", 10) > ACADEMYPOPUP._maxDamage) {
                ACADEMYPOPUP._maxDamage = CREATURES.GetProperty(_loc2_, "damage", 10);
            }
            if (CREATURES.GetProperty(_loc2_, "cTime", 10) > ACADEMYPOPUP._maxTime) {
                ACADEMYPOPUP._maxTime = CREATURES.GetProperty(_loc2_, "cTime", 10);
            }
            if (CREATURES.GetProperty(_loc2_, "cResource", 10) > ACADEMYPOPUP._maxResource) {
                ACADEMYPOPUP._maxResource = CREATURES.GetProperty(_loc2_, "cResource", 10);
            }
            if (CREATURES.GetProperty(_loc2_, "cStorage", 10) > ACADEMYPOPUP._maxStorage) {
                ACADEMYPOPUP._maxStorage = CREATURES.GetProperty(_loc2_, "cStorage", 10);
            }
            if (GLOBAL.INFERNO_ONLY) {
                ACADEMYPOPUP._ioMaxDps = Math.max(ACADEMYPOPUP._ioMaxDps, Math.abs(CREATURELOCKER.ioDps(_loc2_, 10)));
            }
        }
        if (ACADEMY._building._upgrading) {
            ACADEMYPOPUP._page = ACADEMYPOPUP.ioPageOf(String(ACADEMY._building._upgrading));
        }
        if (GLOBAL.INFERNO_ONLY && BASE.isInfernoMainYardOrOutpost) {
            // (QoL #139: an overview of every monster's training, at the right of the stats' header row)
            this._ioGridBtn = new Button_CLIP();
            this._ioGridBtn.name = "ioMonAcadOverviewBtn";
            this.addChild(this._ioGridBtn);
            this._ioGridBtn.Setup(KEYS.Get("io_mon2_overview_btn"), false, 72, 22);
            this._ioGridBtn.x = 240;
            this._ioGridBtn.y = -50;
            this._ioGridBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioToggleGrid));
        }
        this.Setup(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page));
        this.speed_txt.htmlText = "<b>" + KEYS.Get("acad_att_speed") + "</b>";
        this.health_txt.htmlText = "<b>" + KEYS.Get("acad_att_health") + "</b>";
        this.damage_txt.htmlText = "<b>" + KEYS.Get("acad_att_damage") + "</b>";
        this.cost_txt.htmlText = "<b>" + KEYS.Get("acad_att_cost") + "</b>";
        if (BASE.isInfernoMainYardOrOutpost) {
            this.cost_txt.htmlText = "<b>" + KEYS.Get("infacad_att_cost") + "</b>";
        }
        this.housing_txt.htmlText = "<b>" + KEYS.Get("acad_att_housing") + "</b>";
        this.time_txt.htmlText = "<b>" + KEYS.Get("acad_att_time") + "</b>";
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #351: damage per second where the hatching time was; every monster hatches in the same second here)
            this.time_txt.htmlText = "<b>" + KEYS.Get("io_mon2_dps_long") + "</b>";
            GLOBAL.ioFitText(this.time_txt, 8);
        }
        this.before_txt.htmlText = "<b>" + KEYS.Get("acad_att_before") + "</b>";
        this.after_txt.htmlText = "<b>" + KEYS.Get("acad_att_after") + "</b>";
    }

    public Setup(param1: string): void {
        ACADEMYPOPUP._monsterID = param1;
        if (!GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID]) {
            GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID] = { "level": 1 };
        }
        this.Update(true);
        ACADEMYPOPUP.lastAction = 0;
    }

    private UpdatePortrait(param1: string, param2: BitmapData, param3: any[]): void {
        if (Boolean(this._portraitImage) && Boolean(this._portraitImage.parent)) {
            IoLockIcon.unmark(this._portraitImage);
            this._portraitImage.parent.removeChild(this._portraitImage);
            this._portraitImage = null;
        }
        if (param3[0] == ACADEMYPOPUP._monsterID) {
            this._portraitImage = this.mcImage.addChild(new Bitmap(param2));
            if (GLOBAL.INFERNO_ONLY) {
                // a monster not unlocked yet in the Strongbox: the padlock in the portrait's corner
                IoLockIcon.mark(this._portraitImage, IoLockIcon.lockedMonster(ACADEMYPOPUP._monsterID), true, "corner", false);
            }
        }
    }

    private CalculateInstantCost(): void {
        let _loc1_: any[] = as3.cast(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].trainingCosts[GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level - 1], Array);
        let _loc2_: string = KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].name));
        let _loc3_: int = _loc1_[0] | 0;
        let _loc4_: int = _loc1_[1] | 0;
        let _loc5_: int = STORE.GetTimeCost(_loc4_);
        let _loc6_: int = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
        ACADEMYPOPUP._instantUpgradeCost = (_loc5_ + _loc6_) | 0;
    }

    public Update(param1: boolean = false): void {
        let _loc5_: any = undefined;
        let _loc7_: boolean = false;
        let _loc11_: any = null;
        let _loc2_: any = GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID];
        let _loc3_: any = ACADEMY.StartMonsterUpgrade(ACADEMYPOPUP._monsterID, true);
        let _loc4_: any[] = as3.cast(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].trainingCosts[GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level - 1], Array);
        if (Boolean(this._portraitImage) && Boolean(this._portraitImage.parent)) {
            this._portraitImage.parent.removeChild(this._portraitImage);
            this._portraitImage = null;
        }
        ImageCache.GetImageWithCallBack("monsters/" + ACADEMYPOPUP._monsterID + "-portrait.jpg", as3.bind(this, this.UpdatePortrait), true, 1, "", [ACADEMYPOPUP._monsterID]);
        if (_loc2_.time) {
            this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
            this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterUpgrade));
            this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterUpgrade));
            this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterUpgrade));
            this.bA.gArrow.visible = false;
            this.bA.tDescription.visible = false;
            this.bA.gCoin.visible = false;
            this.bA.bAction.SetupKey("btn_speedup");
            this.bA.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
            this.bA.bAction.Highlight = true;
            this.bA.bAction.Enabled = true;
            this.bB.bAction.SetupKey("btn_cancel");
            this.bB.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterUpgrade));
            this.bB.bAction.visible = true;
            this.bB.mcR1.visible = false;
            this.bB.mcR2.visible = false;
            this.bB.mcR3.visible = false;
            this.bB.mcR4.visible = false;
            this.bB.mcTime.visible = false;
            if (ACADEMYPOPUP._monsterID == ACADEMY._building._upgrading) {
                this.bPrevious.visible = this.bNext.visible = false;
            }
        } else {
            if (!_loc3_.error) {
                this.bA.tDescription.htmlText = KEYS.Get("academy_traininstantly");
                this.CalculateInstantCost();
                this.bA.gArrow.visible = true;
                this.bA.tDescription.visible = true;
                this.bA.gCoin.visible = true;
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
                this.bA.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": ACADEMYPOPUP._instantUpgradeCost }));
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
                this.bA.bAction.Enabled = true;
                this.bA.bAction.Highlight = true;
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterUpgrade));
                this.bA.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterUpgrade));
                this.bB.bAction.SetupKey("acad_starttraining_btn");
                this.bB.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterUpgrade));
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterUpgrade));
                this.bB.bAction.visible = true;
                this.bB.bAction.Enabled = true;
                this.bB.mcR1.visible = true;
                this.bB.mcR2.visible = true;
                this.bB.mcR3.visible = true;
                this.bB.mcR3.tValue.htmlText = "<b><font color=\"#" + (_loc4_[0] > GLOBAL._resources.r3.Get() ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(Number(_loc4_[0])) + "</font></b>";
                this.bB.mcR4.visible = true;
                this.bB.mcTime.visible = true;
                this.bB.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime((GLOBAL.INFERNO_ONLY ? IoShop.trainTime(Number(_loc4_[1])) : _loc4_[1]) | 0) + "</b>";
            } else if (_loc3_.status == KEYS.Get("acad_err_putty") || _loc3_.status == KEYS.Get("acad_err_sulfur")) {
                this.bA.tDescription.visible = true;
                this.bA.gArrow.visible = true;
                this.bA.gCoin.visible = true;
                this.bA.tDescription.htmlText = KEYS.Get("academy_traininstantly");
                this.bB.mcR1.visible = true;
                this.bB.mcR2.visible = true;
                this.bB.mcR3.visible = true;
                this.bB.mcR3.tValue.htmlText = "<b><font color=\"#" + (_loc4_[0] > GLOBAL._resources.r3.Get() ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(Number(_loc4_[0])) + "</font></b>";
                this.bB.mcR4.visible = true;
                this.bB.mcTime.visible = true;
                this.bB.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime((GLOBAL.INFERNO_ONLY ? IoShop.trainTime(Number(_loc4_[1])) : _loc4_[1]) | 0) + "</b>";
                this.CalculateInstantCost();
                this.bA.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": ACADEMYPOPUP._instantUpgradeCost }));
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterUpgrade));
                this.bA.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterUpgrade));
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
                this.bA.bAction.Enabled = true;
                this.bA.bAction.Highlight = true;
                this.bB.bAction.Setup(_loc3_.errorMessage);
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterUpgrade));
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterUpgrade));
                this.bB.bAction.Enabled = false;
                this.bB.bAction.visible = true;
            } else if (this.bA.label != _loc3_.errorMessage) {
                this.bA.gArrow.visible = false;
                this.bA.tDescription.visible = false;
                this.bA.gCoin.visible = false;
                this.bB.mcR1.visible = false;
                this.bB.mcR2.visible = false;
                this.bB.mcR3.visible = false;
                this.bB.mcR4.visible = false;
                this.bB.mcTime.visible = false;
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantMonsterUpgrade));
                this.bA.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SpeedUp));
                this.bA.bAction.Setup(_loc3_.errorMessage);
                this.bA.bAction.Enabled = false;
                this.bA.bAction.Highlight = false;
                // (Inferno-only, QoL #354: the next training's cost and time, also when it can't start yet)
                if (GLOBAL.INFERNO_ONLY && _loc4_ && _loc3_.ioCostShown) {
                    this.bB.mcR1.visible = true;
                    this.bB.mcR2.visible = true;
                    this.bB.mcR3.visible = true;
                    this.bB.mcR3.tValue.htmlText = "<b><font color=\"#" + (_loc4_[0] > GLOBAL._resources.r3.Get() ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(Number(_loc4_[0])) + "</font></b>";
                    this.bB.mcR4.visible = true;
                    this.bB.mcTime.visible = true;
                    this.bB.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime((GLOBAL.INFERNO_ONLY ? IoShop.trainTime(Number(_loc4_[1])) : _loc4_[1]) | 0) + "</b>";
                }
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterUpgrade));
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterUpgrade));
                this.bB.bAction.visible = false;
            }
            this.bA.bAction.Highlight = false;
            this.bPrevious.visible = this.bNext.visible = true;
        }
        _loc5_ = (_loc5_ = (_loc5_ = "<b>" + KEYS.Get("acad_mon_name") + "</b> " + KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].name)) + "<br>") + ("<b>" + KEYS.Get("acad_mon_status") + "</b> " + _loc3_.status)) + ("<br>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].description)));
        this.tName.htmlText = as3.str(_loc5_);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #352: what it goes for, how it moves and its reach; QoL #356: the levels its abilities come at.
            // Under the status, before the description; all of it drawn smaller when it runs long)
            // (27 November: the same layout as the Strongbox and the Incubators: CREATURELOCKER.ioInfoHtml, the status by the name)
            this.tName.htmlText = CREATURELOCKER.ioInfoHtml(ACADEMYPOPUP._monsterID, as3.str(_loc3_.status));
            // (27 November, 72's bug reports: a long one was cut off at 9 px: its arrow and the wheel, GLOBAL.ioScrollMore)
            GLOBAL.ioScrollMore(this.tName, 9);
        }
        let _loc6_: int = 0;
        if ((_loc6_ = CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "damage") | 0) > 0) {
            _loc7_ = false;
        } else {
            _loc7_ = true;
        }
        this.bSpeedA.mcBar.width = 100 / ACADEMYPOPUP._maxSpeed * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "speed");
        this.bHealthA.mcBar.width = 100 / ACADEMYPOPUP._maxHealth * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "health");
        if (!_loc7_) {
            this.bDamageA.mcBar.width = 100 / ACADEMYPOPUP._maxDamage * _loc6_;
        } else {
            this.bDamageA.mcBar.width = 100 / ACADEMYPOPUP._maxDamage * -_loc6_;
        }
        this.bResourceA.mcBar.width = 100 / ACADEMYPOPUP._maxResource * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cResource");
        this.bStorageA.mcBar.width = 100 / ACADEMYPOPUP._maxStorage * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cStorage");
        this.bTimeA.mcBar.width = 100 / ACADEMYPOPUP._maxTime * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cTime");
        this.tSpeedA.htmlText = KEYS.Get("mon_att_speedvalue", { "v1": CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "speed") });
        this.tHealthA.htmlText = as3.str(CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "health").toString());
        if (!_loc7_) {
            this.tDamageA.htmlText = as3.str(_loc6_.toString());
        } else {
            this.tDamageA.htmlText = -_loc6_ + " (" + KEYS.Get("str_heal") + ")";
        }
        this.tResourceA.htmlText = KEYS.Get("mon_att_costvalue", { "v1": CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cResource"), "v2": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) });
        this.tStorageA.htmlText = KEYS.Get("mon_att_housingvalue", { "v1": CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cStorage") });
        this.tTimeA.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cTime") | 0, true);
        let _loc8_: int = GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level | 0;
        let _loc9_: any = false;
        let _loc10_: int = 1;
        for (_loc11_ of as3.values(GLOBAL._buildingProps)) {
            if (_loc11_.id == 26) {
                if (Boolean(_loc11_.costs) && _loc11_.costs.length > _loc10_) {
                    _loc10_ = _loc11_.costs.length | 0;
                }
            }
        }
        _loc9_ = GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level <= _loc10_;
        if (_loc9_) {
            _loc8_ = (GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level + 1) | 0;
        } else {
            _loc8_ = GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level | 0;
        }
        _loc6_ = CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "damage", _loc8_) | 0;
        if (_loc7_) {
            _loc6_ = (-_loc6_) | 0;
        }
        this.bSpeedB.mcBar.width = 100 / ACADEMYPOPUP._maxSpeed * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "speed", _loc8_);
        this.bHealthB.mcBar.width = 100 / ACADEMYPOPUP._maxHealth * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "health", _loc8_);
        this.bDamageB.mcBar.width = 100 / ACADEMYPOPUP._maxDamage * _loc6_;
        this.bResourceB.mcBar.width = 100 / ACADEMYPOPUP._maxResource * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cResource", _loc8_);
        this.bStorageB.mcBar.width = 100 / ACADEMYPOPUP._maxStorage * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cStorage", _loc8_);
        this.bTimeB.mcBar.width = 100 / ACADEMYPOPUP._maxTime * CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cTime", _loc8_);
        this.tSpeedB.htmlText = KEYS.Get("mon_att_speedvalue", { "v1": CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "speed", _loc8_) });
        this.tHealthB.htmlText = as3.str(CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "health", _loc8_).toString());
        if (!_loc7_) {
            this.tDamageB.htmlText = as3.str(_loc6_.toString());
        } else {
            this.tDamageB.htmlText = _loc6_ + " (" + KEYS.Get("str_heal") + ")";
        }
        this.tResourceB.htmlText = KEYS.Get("mon_att_costvalue", { "v1": CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cResource", _loc8_), "v2": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) });
        this.tStorageB.htmlText = KEYS.Get("mon_att_housingvalue", { "v1": CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cStorage", _loc8_) });
        this.tTimeB.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cTime", _loc8_) | 0, true);
        if (CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "speed") != CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "speed", _loc8_)) {
            this.bSpeedB.mcBar.gotoAndStop(2);
        } else {
            this.bSpeedB.mcBar.gotoAndStop(1);
        }
        if (CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "health") != CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "health", _loc8_)) {
            this.bHealthB.mcBar.gotoAndStop(2);
        } else {
            this.bHealthB.mcBar.gotoAndStop(1);
        }
        if (CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "damage") != CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "damage", _loc8_)) {
            this.bDamageB.mcBar.gotoAndStop(2);
        } else {
            this.bDamageB.mcBar.gotoAndStop(1);
        }
        if (CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cResource") != CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cResource", _loc8_)) {
            this.bResourceB.mcBar.gotoAndStop(2);
        } else {
            this.bResourceB.mcBar.gotoAndStop(1);
        }
        if (CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cStorage") != CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cStorage", _loc8_)) {
            this.bStorageB.mcBar.gotoAndStop(2);
        } else {
            this.bStorageB.mcBar.gotoAndStop(1);
        }
        if (CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cTime") != CREATURES.GetProperty(ACADEMYPOPUP._monsterID, "cTime", _loc8_)) {
            this.bTimeB.mcBar.gotoAndStop(2);
        } else {
            this.bTimeB.mcBar.gotoAndStop(1);
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #351: damage per second, before and after this training, where the hatching time was)
            let dpsA: number = Math.abs(CREATURELOCKER.ioDps(ACADEMYPOPUP._monsterID));
            let dpsB: number = Math.abs(CREATURELOCKER.ioDps(ACADEMYPOPUP._monsterID, _loc8_));
            let most: number = Math.max(ACADEMYPOPUP._ioMaxDps, dpsA, dpsB);
            this.bTimeA.mcBar.width = most > 0 ? 100 / most * dpsA : 0;
            this.bTimeB.mcBar.width = most > 0 ? 100 / most * dpsB : 0;
            this.tTimeA.htmlText = CREATURELOCKER.ioDpsText(ACADEMYPOPUP._monsterID);
            this.tTimeB.htmlText = CREATURELOCKER.ioDpsText(ACADEMYPOPUP._monsterID, _loc8_);
            this.bTimeB.mcBar.gotoAndStop(Math.round(dpsA) != Math.round(dpsB) ? 2 : 1);
        }
        if (this._ioGridOn) {
            this.ioDrawGrid();
        }
    }

    /** Inferno-only (QoL #139): the highest level this monster can be trained to (as ioSkip counts it). */
    private static ioTopLevel(param1: string): int {
        let top: int = (CREATURELOCKER._creatures[param1].trainingCosts.length + 1) | 0;
        if (BASE.isInfernoMainYardOrOutpost && !CREATURELOCKER.ioReachesLevel6(param1)) {
            top = Math.min(top, 5) | 0;
        }
        return top;
    }

    /** Inferno-only (QoL #139): the overview shown or hidden (the button says which way it goes). */
    private ioToggleGrid(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        this.ioShowGrid(!this._ioGridOn);
    }

    private ioShowGrid(param1: boolean): void {
        this._ioGridOn = param1;
        if (this._ioGridBtn) {
            this._ioGridBtn.Setup(KEYS.Get(param1 ? "io_mon2_overview_back" : "io_mon2_overview_btn"));
        }
        if (param1) {
            this.ioDrawGrid();
        }
        if (this._ioGrid) {
            this._ioGrid.visible = param1;
        }
        if (this._ioGridBtn) {
            // the button above the overview
            this.setChildIndex(this._ioGridBtn, this.numChildren - 1);
        }
    }

    private ioGridField(param1: Sprite, param2: number, param3: number, param4: number, param5: boolean = false): TextField {
        let t: TextField = new TextField();
        t.defaultTextFormat = new TextFormat("Verdana", 10, 3355443, param5);
        t.selectable = false;
        t.mouseEnabled = false;
        t.x = param2;
        t.y = param3;
        t.width = param4;
        t.height = 17;
        param1.addChild(t);
        return t;
    }

    /**
     * Inferno-only (QoL #139): every monster the Academy trains, in two columns over the stats and the buttons
     * below them: its level of its last, whether a training can start now (or why not: short of sulfur, the
     * Academy's level, the Academy busy, locked, trained all the way) and how long its next level takes (the time
     * left while it trains). A row opens that monster's page. Made once, its texts set again on each Update.
     */
    private ioDrawGrid(): void {
        let roster: any[] = ACADEMYPOPUP.ioRoster();
        let perColumn: int = Math.max(1, Math.ceil(roster.length / 2)) | 0;
        let top: number = -50;
        let rowH: number = Math.min(22, Math.floor((236 - 22) / perColumn));
        if (!this._ioGrid) {
            this._ioGrid = new Sprite();
            this._ioGrid.name = "ioMonAcadOverview";
            this._ioGrid.graphics.lineStyle(1, 6710886);
            this._ioGrid.graphics.beginFill(16777215, 1);
            this._ioGrid.graphics.drawRoundRect(-205, top - 2, 525, 240, 8, 8);
            this._ioGrid.graphics.endFill();
            this._ioGridRows = {};
            for (let column: int = 0; column < 2; column++) {
                let x: number = -200 + column * 262;
                this.ioGridField(this._ioGrid, x, top + 2, 104, true).text = KEYS.Get("io_mon2_grid_monster");
                this.ioGridField(this._ioGrid, x + 104, top + 2, 40, true).text = KEYS.Get("io_mon2_grid_level");
                this.ioGridField(this._ioGrid, x + 144, top + 2, 66, true).text = KEYS.Get("io_mon2_grid_train");
                this.ioGridField(this._ioGrid, x + 210, top + 2, 52, true).text = KEYS.Get("io_mon2_grid_time");
            }
            for (let i: int = 0; i < roster.length; i++) {
                let id: string = as3.str(roster[i]);
                let row: Sprite = new Sprite();
                row.name = "ioMonAcadRow_" + id;
                row.x = -200 + ((i / perColumn) | 0) * 262;
                row.y = top + 22 + (i % perColumn) * rowH;
                row.graphics.beginFill(i % 2 == 0 ? 15329769 : 16777215, 1);
                row.graphics.drawRect(-3, 0, 260, rowH - 1);
                row.graphics.endFill();
                row.buttonMode = true;
                row.mouseChildren = false;
                this.ioGridField(row, 0, 1, 104).text = KEYS.Get(CREATURELOCKER.getShortCreatureName(id));
                this._ioGridRows[id] = { "lv": this.ioGridField(row, 104, 1, 40), "st": this.ioGridField(row, 144, 1, 66), "tm": this.ioGridField(row, 210, 1, 52) };
                row.addEventListener(MouseEvent.CLICK, this.ioGridOpen(id));
                this._ioGrid.addChild(row);
            }
            this.addChild(this._ioGrid);
        }
        let now: int = GLOBAL.Timestamp();
        for (const $value of as3.values(roster)) {
            let id: string = as3.str($value);
            let fields: any = this._ioGridRows[id];
            if (!fields || !CREATURELOCKER._creatures[id]) {
                continue;
            }
            let up: any = GLOBAL.player.m_upgrades[id];
            let level: int = up ? up.level | 0 : 1;
            let most: int = ACADEMYPOPUP.ioTopLevel(id);
            let unlocked: boolean = Boolean(CREATURELOCKER._lockerData[id]) && CREATURELOCKER._lockerData[id].t == 2;
            let status: string = null;
            let color: string = "#333333";
            let time: string = "-";
            if (up && up.time) {
                status = KEYS.Get("io_mon2_grid_training");
                color = "#B05A00";
                time = GLOBAL.ioDuration(up.time.Get() - now);
            } else if (!unlocked) {
                status = KEYS.Get("io_mon2_grid_locked");
                color = "#888888";
            } else if (level >= most) {
                status = KEYS.Get("io_mon2_grid_max");
                color = "#888888";
            } else {
                let check: any = ACADEMY.StartMonsterUpgrade(id, true);
                let costs: any[] = as3.as(CREATURELOCKER._creatures[id].trainingCosts[level - 1], Array);
                // (22 October: a fifth less with an Academy Scholarship running: IoShop)
                time = costs ? GLOBAL.ioDuration(IoShop.trainTime(Number(costs[1]))) : "-";
                if (!check.error) {
                    status = KEYS.Get("io_mon2_grid_ready");
                    color = "#1E7A12";
                } else if (check.status == KEYS.Get("acad_err_sulfur") || check.status == KEYS.Get("acad_err_putty")) {
                    status = KEYS.Get("io_mon2_grid_sulfur");
                    color = "#CC0000";
                } else if (ACADEMY._building && level > ACADEMY._building._lvl.Get()) {
                    status = KEYS.Get("io_mon2_grid_academy", { "v1": level });
                    color = "#CC0000";
                } else {
                    status = KEYS.Get("io_mon2_grid_busy");
                    color = "#B05A00";
                }
            }
            (fields.lv as TextField).text = level + "/" + most;
            (fields.st as TextField).htmlText = "<font color=\"" + color + "\"><b>" + status + "</b></font>";
            (fields.tm as TextField).text = time;
            GLOBAL.ioFitText(fields.st as TextField, 7);
        }
    }

    /** Inferno-only (QoL #139): a row of the overview opens that monster's page. */
    private ioGridOpen(param1: string): Function {
        return (param1b: MouseEvent = null): void => {
            SOUNDS.Play("click1");
            ACADEMYPOPUP._page = ACADEMYPOPUP.ioPageOf(param1);
            this.ioShowGrid(false);
            this.Setup(param1);
        };
    }

    public StartMonsterUpgrade(param1: MouseEvent): void {
        ACADEMY.StartMonsterUpgrade(ACADEMYPOPUP._monsterID);
        this.Setup(ACADEMYPOPUP._monsterID);
    }

    public InstantMonsterUpgrade(param1: MouseEvent): void {
        let bragImage: string = null;
        let monsterName: string = null;
        let e: MouseEvent = null;
        let buildingInstances: Vector<any> = null;
        let Post: Function = null;
        let building: BFOUNDATION = null;
        bragImage = null;
        monsterName = null;
        let popupMC: popup_monster = null;
        e = param1;
        // Inferno-only: checked again on the click, as the training button is (a second click, or one after
        // the shiny confirmation, trained past the level the Academy allows, or past the last level)
        if (GLOBAL.INFERNO_ONLY && !this.ioCanTrainNow()) {
            this.Setup(ACADEMYPOPUP._monsterID);
            return;
        }
        if (BASE._credits.Get() < ACADEMYPOPUP._instantUpgradeCost) {
            POPUPS.ioShinyNeed(ACADEMYPOPUP._instantUpgradeCost);
            return;
        }
        if (!GLOBAL.ioConfirmShiny(ACADEMYPOPUP._instantUpgradeCost, KEYS.Get("io_t3k_for_train_now"), (): void => {
            this.InstantMonsterUpgrade(e);
        })) {
            return;
        }
        if (GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].time) {
            delete GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].time;
        }
        if (GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].duration) {
            delete GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].duration;
        }
        ++GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level;
        GLOBAL.player.upgradeHealthData(ACADEMYPOPUP._monsterID);
        buildingInstances = InstanceManager.getInstancesByClass(BUILDING26);
        for (building of (buildingInstances ?? [])) {
            if (building._upgrading == ACADEMYPOPUP._monsterID) {
                building._upgrading = null;
                break;
            }
        }
        LOGGER.Stat([47, ACADEMYPOPUP._monsterID, GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level]);
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            Post = (): void => {
                if (BASE.isInfernoMainYardOrOutpost) {
                    GLOBAL.CallJS("sendFeed", ["academy-training", KEYS.Get("acad_stream_title_inf", { "v1": monsterName, "v2": GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level }), KEYS.Get("acad_stream_description"), bragImage, 0]);
                } else {
                    GLOBAL.CallJS("sendFeed", ["academy-training", KEYS.Get("acad_stream_title", { "v1": monsterName, "v2": GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level }), KEYS.Get("acad_stream_description"), bragImage, 0]);
                }
                POPUPS.Next();
            };
            if (CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].stream[2]) {
                bragImage = String(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].stream[2]);
            }
            monsterName = String(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].name);
            if (monsterName.substring(0, 1) == "#") {
                monsterName = KEYS.Get(monsterName);
            }
            popupMC = new popup_monster();
            popupMC.tText.htmlText = KEYS.Get("acad_pop_complete", { "v1": monsterName });
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #140: Train next level and Share in chat; "Warn your friends" posted to a page there isn't)
                IoSocial.ioWarnTrained(popupMC, ACADEMYPOPUP._monsterID, monsterName, GLOBAL.player.m_upgrades[ACADEMYPOPUP._monsterID].level | 0);
            } else {
                popupMC.bAction.SetupKey("btn_warnyourfriends");
                popupMC.bAction.addEventListener(MouseEvent.CLICK, Post);
                popupMC.bAction.Highlight = true;
                popupMC.bSpeedup.visible = false;
            }
            POPUPS.Push(popupMC, null, null, null, "" + ACADEMYPOPUP._monsterID + "-150.png");
        }
        BASE.Purchase("ITR", ACADEMYPOPUP._instantUpgradeCost, "academy");
        if (GLOBAL.INFERNO_ONLY) {
            this.Setup(ACADEMYPOPUP._monsterID);
        }
    }

    /* Inferno-only: may this monster be trained a level now (with sulfur or shiny)? What the training button
     * asks: unlocked, below its last level and the Academy's, not training, the Academy free. Short of
     * sulfur is fine here: shiny pays for it all. */
    private ioCanTrainNow(): boolean {
        let check: any = ACADEMY.StartMonsterUpgrade(ACADEMYPOPUP._monsterID, true);
        return !check.error || check.status == KEYS.Get("acad_err_putty") || check.status == KEYS.Get("acad_err_sulfur");
    }

    public CancelMonsterUpgrade(param1: MouseEvent): void {
        GLOBAL.Message(KEYS.Get("acad_confirmcancel", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].name)) }), KEYS.Get("acad_confirmcancel_btn"), as3.bind(this, this.CancelMonsterUpgradeB));
    }

    public CancelMonsterUpgradeB(): void {
        ACADEMY.CancelMonsterUpgrade(ACADEMYPOPUP._monsterID);
        this.Setup(ACADEMYPOPUP._monsterID);
    }

    public SpeedUp(param1: MouseEvent): void {
        ACADEMY._monsterID = ACADEMYPOPUP._monsterID;
        STORE.SpeedUp("SP4");
    }

    /**
     * Inferno-only (QoL #357): a monster the arrows pass over: not unlocked yet, or trained as far as it goes
     * (the Academy's level aside). When every one is, the arrows go through them all as before.
     */
    private ioSkip(id: string): boolean {
        if (this.CheckMonsterLock(id)) {
            return true;
        }
        let data: any = CREATURELOCKER._lockerData[id];
        if (!data || data.t != 2) {
            return true;
        }
        let up: any = GLOBAL.player.m_upgrades[id];
        let level: int = up ? up.level | 0 : 1;
        let top: int = (CREATURELOCKER._creatures[id].trainingCosts.length + 1) | 0;
        if (BASE.isInfernoMainYardOrOutpost && !CREATURELOCKER.ioReachesLevel6(id)) {
            top = Math.min(top, 5) | 0;
        }
        return level >= top && !(up && up.time);
    }

    /** Inferno-only (QoL #357): the next monster that can be trained, `step` 1 or -1; false when there is none. */
    private ioStep(step: int): boolean {
        let page: int = ACADEMYPOPUP._page;
        for (let n: int = 0; n < ACADEMYPOPUP._maxMonsters; n++) {
            page = (page + step) | 0;
            if (page == 0) {
                page = ACADEMYPOPUP._maxMonsters;
            }
            if (page > ACADEMYPOPUP._maxMonsters) {
                page = 1;
            }
            let id: string = ACADEMYPOPUP.pageID(page);
            if (id && CREATURELOCKER._creatures[id] && !this.ioSkip(id)) {
                ACADEMYPOPUP._page = page;
                this.Setup(id);
                return true;
            }
        }
        return false;
    }

    public Previous(param1: MouseEvent = null): void {
        if (GLOBAL.INFERNO_ONLY && this.ioStep(-1)) {
            ACADEMYPOPUP.lastAction = -1;
            return;
        }
        ACADEMYPOPUP.lastAction = -1;
        do {
            --ACADEMYPOPUP._page;
            if (ACADEMYPOPUP._page == 0) {
                ACADEMYPOPUP._page = ACADEMYPOPUP._maxMonsters;
            }
        } while (this.CheckMonsterLock(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page)) == true);

        if (this.CheckMonsterLock(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page))) {
            if (ACADEMYPOPUP.lastAction > 0) {
                this.Next();
            } else {
                this.Previous();
            }
        } else {
            this.Setup(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page));
        }
    }

    public Next(param1: MouseEvent = null): void {
        if (GLOBAL.INFERNO_ONLY && this.ioStep(1)) {
            ACADEMYPOPUP.lastAction = 1;
            return;
        }
        ACADEMYPOPUP.lastAction = 1;
        do {
            ++ACADEMYPOPUP._page;
            if (ACADEMYPOPUP._page > ACADEMYPOPUP._maxMonsters) {
                ACADEMYPOPUP._page = 1;
            }
        } while (this.CheckMonsterLock(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page)) == true);

        if (this.CheckMonsterLock(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page))) {
            if (ACADEMYPOPUP.lastAction > 0) {
                this.Next();
            } else {
                this.Previous();
            }
        } else {
            this.Setup(ACADEMYPOPUP.pageID(ACADEMYPOPUP._page));
        }
    }

    /**
     * Inferno-only: the academy's pages. The stock Inferno academy paged through IC1-IC8 by number,
     * which left out Rezghul (C19) and has no room for Korath, Drull and Ashkarr (IC9, IC10, IC24).
     */
    private static ioRoster(): any[] {
        let roster: any[] = ["IC1", "IC2", "IC15", "IC3", "IC4", "IC12", "IC5", "IC6", "IC7", "IC14", "IC8", "IC20"];
        let id: string = null;
        // Rezghul between King Wormzer and the Emberghoul, as in every other list (29 September)
        if (CREATURELOCKER._creatures[CREATURELOCKER.REZGHUL_ID] && !CREATURELOCKER._creatures[CREATURELOCKER.REZGHUL_ID].blocked) {
            roster.splice(roster.indexOf("IC8") + 1, 0, CREATURELOCKER.REZGHUL_ID);
        }
        for (const $value of as3.values([CREATURELOCKER.KORATH_ID, CREATURELOCKER.DRULL_ID, CREATURELOCKER.ASHKARR_ID, CREATURELOCKER.RIMEGRAVE_ID, CREATURELOCKER.BASILISK_ID])) {
            id = as3.str($value);
            if (CREATURELOCKER._creatures[id] && !CREATURELOCKER._creatures[id].blocked) {
                roster.push(id);
            }
        }
        return roster;
    }

    private static pageID(param1: int): string {
        if (GLOBAL.INFERNO_ONLY && BASE.isInfernoMainYardOrOutpost) {
            let roster: any[] = ACADEMYPOPUP.ioRoster();
            return as3.str(roster[Math.max(0, Math.min(param1, roster.length) - 1)]);
        }
        return ACADEMYPOPUP._monsterString + param1;
    }

    private static ioPageOf(param1: string): int {
        if (GLOBAL.INFERNO_ONLY && BASE.isInfernoMainYardOrOutpost) {
            return Math.max(1, ACADEMYPOPUP.ioRoster().indexOf(param1) + 1) | 0;
        }
        return Number(param1.substr(param1.indexOf("C") + 1)) | 0;
    }

    public CheckMonsterLock(param1: string): boolean {
        let _loc2_: boolean = Boolean(CREATURELOCKER._creatures[param1].blocked);
        if (_loc2_) {
            return true;
        }
        return false;
    }

    public Help(param1: MouseEvent = null): void {
        let _loc2_: int = 5;
        this._guidePage += 1;
        if (this._guidePage > _loc2_) {
            this._guidePage = 1;
        }
        this.gotoAndStop(this._guidePage);
        if (this._ioGridBtn) {
            // (QoL #139: the overview and its button belong to the stats page, not the guide's)
            if (this._guidePage > 1) {
                this.ioShowGrid(false);
            }
            this._ioGridBtn.visible = this._guidePage == 1;
        }
        if (this._guidePage > 1) {
            this.txtGuide.htmlText = KEYS.Get("acad_tut_" + (this._guidePage - 1));
            if (this._guidePage == 2) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        }
    }

    public Hide(param1: MouseEvent = null): void {
        ACADEMY.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
