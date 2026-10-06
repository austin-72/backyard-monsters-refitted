import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { MouseEvent } from "flash/events";
import { ACADEMY, ACADEMYPOPUP_CLIP, BASE, BFOUNDATION, BRESOURCE, BUILDING26, CREATURELOCKER, CREATURES, GLOBAL, ImageCache, InstanceManager, IoLockIcon, KEYS, LOGGER, POPUPS, POPUPSETTINGS, STORE, popup_monster } from "@game";

export class ACADEMYPOPUP extends ACADEMYPOPUP_CLIP {
    static {
        as3.fields(this, { _infernoFrameOffset: 6, _portraitImage: null, _guidePage: 1 });
    }

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
        }
        if (ACADEMY._building._upgrading) {
            ACADEMYPOPUP._page = ACADEMYPOPUP.ioPageOf(String(ACADEMY._building._upgrading));
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
                this.bB.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime(_loc4_[1] | 0) + "</b>";
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
                this.bB.mcTime.tValue.htmlText = "<b>" + GLOBAL.ToTime(_loc4_[1] | 0) + "</b>";
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
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartMonsterUpgrade));
                this.bB.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelMonsterUpgrade));
                this.bB.bAction.visible = false;
            }
            this.bA.bAction.Highlight = false;
            this.bPrevious.visible = this.bNext.visible = true;
        }
        _loc5_ = (_loc5_ = (_loc5_ = "<b>" + KEYS.Get("acad_mon_name") + "</b> " + KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].name)) + "<br>") + ("<b>" + KEYS.Get("acad_mon_status") + "</b> " + _loc3_.status)) + ("<br>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMYPOPUP._monsterID].description)));
        this.tName.htmlText = as3.str(_loc5_);
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
            POPUPS.DisplayGetShiny();
            return;
        }
        if (!GLOBAL.ioConfirmShiny(ACADEMYPOPUP._instantUpgradeCost, "to finish this training now", (): void => {
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
            popupMC.bAction.SetupKey("btn_warnyourfriends");
            popupMC.bAction.addEventListener(MouseEvent.CLICK, Post);
            popupMC.bAction.Highlight = true;
            popupMC.bSpeedup.visible = false;
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

    public Previous(param1: MouseEvent = null): void {
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
        for (const $value of as3.values([CREATURELOCKER.KORATH_ID, CREATURELOCKER.DRULL_ID, CREATURELOCKER.ASHKARR_ID, CREATURELOCKER.RIMEGRAVE_ID])) {
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
