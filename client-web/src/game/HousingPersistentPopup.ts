import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BFOUNDATION, BUILDING15, CREATURELOCKER, CREATURES, CreepInfo, GLOBAL, HOUSING, HOUSINGBUNKER, HousingPersistentMonsterBar, HousingPersistentPopup_CLIP, INFERNOPORTAL, ImageCache, InstanceManager, KEYS, MAPROOM_DESCENT, MESSAGE, MonsterBase, MonsterData, POPUPS, POPUPSETTINGS, PersistantJuiceAllPopup, Player, SOUNDS, ScrollSet } from "@game";

export class HousingPersistentPopup extends HousingPersistentPopup_CLIP {
    static {
        as3.fields(this, { _juiceList: null, m_monsterBarList: null, m_bunkerIDList: null, _scroller: null, m_strLastSelectedJuiced: "", m_nJuiceAmount: 0, m_bShownPopup: false, m_JuiceAllPopup: null, k_juiceAllPopupLimit: 5, k_offsetY: 51, k_offsetTextY: 25, k_titlesX: 15, k_aBit: 8 });
    }

    public _juiceList: any;
    public m_monsterBarList: any;
    private m_bunkerIDList: any[];
    public _scroller: ScrollSet;
    private m_strLastSelectedJuiced: string;
    private m_nJuiceAmount: int;
    private m_bShownPopup: boolean;
    private m_JuiceAllPopup: PersistantJuiceAllPopup;
    private k_juiceAllPopupLimit: int;
    private k_offsetY: int;
    private k_offsetTextY: int;
    private k_titlesX: int;
    private k_aBit: int;

    public $ctor(): void {
        let _loc1_: int = 0;
        let _loc10_: string = null;
        let _loc11_: HousingPersistentMonsterBar = null;
        let _loc12_: int = 0;
        this._juiceList = {};
        this.m_monsterBarList = {};
        this.m_bunkerIDList = [];
        super.$ctor();
        if (!BASE.isInfernoMainYardOrOutpost && !GLOBAL.INFERNO_ONLY) {
            this.bTransfer.SetupKey("btn_ascendmonsters");
            this.bTransfer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ascend));
        } else {
            this.bTransfer.visible = false;
        }
        this.bJuice.SetupKey("mh_nomonsters_btn");
        this.bJuice.addEventListener(MouseEvent.CLICK, as3.bind(this, this.juiceCheck));
        this.bClear.SetupKey("btn_clear");
        this.bClear.addEventListener(MouseEvent.CLICK, as3.bind(this, this.selectNone));
        this.bHealAll.SetupKey("btn_housing_heal_all");
        this.bHealAll.Highlight = true;
        this.bHealAll.addEventListener(MouseEvent.CLICK, as3.bind(this, this.healInstantAllShinyCheck));
        this.tHealthText.htmlText = "<b>" + KEYS.Get("mh_health_column_label") + "</b>";
        this.tCapacityText.htmlText = "<b>" + KEYS.Get("mh_capacity_column_label") + "</b>";
        if (GLOBAL._bJuicer) {
            this.tJuicingText.htmlText = KEYS.Get("mh_juicing_txt");
        } else {
            this.tJuicingText.htmlText = "";
            this.bJuice.visible = false;
            this.bClear.visible = false;
        }
        this.tTitleHealing.htmlText = KEYS.Get("mh_healing_section_label");
        this.tTitleHealing.visible = false;
        this.tTitleHousing.htmlText = KEYS.Get("mh_housing_section_label");
        this.tTitleBunkers.htmlText = KEYS.Get("mh_bunkers_section_label");
        this.tTitleBunkers.visible = false;
        this.m_bgWhite.x = this.m_bgWhite.y = 0;
        this.m_bgWhite.height = 0;
        this.monsterContainer.addChild(this.m_bgWhite);
        this.gotoAndStop(1);
        this._juiceList = {};
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 215;
        let _loc5_: int = 6;
        let _loc6_: int = 3;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: any[] = [];
        _loc9_ = this.getHousableCreatures();
        _loc1_ = 0;
        while (_loc1_ < _loc9_.length) {
            _loc10_ = String(_loc9_[_loc1_].id);
            (_loc11_ = new HousingPersistentMonsterBar(_loc10_)).x = 0;
            _loc3_ = _loc1_;
            _loc11_.y = _loc3_ * this.k_offsetY;
            _loc11_.mouseChildren = true;
            this.monsterContainer.addChild(_loc11_);
            this.m_monsterBarList[_loc10_] = _loc11_;
            _loc12_ = 0;
            if (_loc10_.substr(0, 1) != "B") {
                _loc12_ = GLOBAL.player.monsterListByID(_loc10_).numHousedCreeps;
                ImageCache.GetImageWithCallBack("monsters/" + _loc10_ + "-medium.jpg", as3.bind(this, this.iconLoaded), true, 1, "", [_loc11_.mcIcon]);
                _loc11_.tName.htmlText = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc10_].name)) + "</b> x" + _loc12_;
            } else {
                ImageCache.GetImageWithCallBack("monsters/bunker-medium.jpg", as3.bind(this, this.iconLoaded), true, 1, "", [_loc11_.mcIcon]);
                _loc11_.tName.htmlText = "<b>" + KEYS.Get("#b_monsterbunker#") + "</b>";
            }
            _loc11_.m_healthBar.mcBar.width = HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth * GLOBAL.player.curHealthByID(_loc10_) / GLOBAL.player.totalHealthByID(_loc10_);
            _loc11_.m_capacityBar.mcBar.width = HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth * GLOBAL.player.getStorageByID(_loc10_) / HOUSING._housingCapacity.Get();
            _loc11_.m_capacityBar.mcBarGrey.width = _loc11_.m_capacityBar.mcBar.width;
            _loc11_.tCapacityText.htmlText = "<b>" + GLOBAL.player.getStorageByID(_loc10_) + "</b>";
            _loc11_.tHealStatusText.htmlText = "";
            if (GLOBAL.player.checkQueued(_loc10_)) {
                this.setHealMode(_loc11_);
            } else {
                this.setNormalMode(_loc11_);
            }
            _loc11_.buttonMode = false;
            _loc1_++;
        }
        this.tCapacityText.x = 320;
        this.tHealthText.x = 145;
        this.tCapacityText.y = this.tHealthText.y = this.k_aBit;
        this.monsterContainer.addChild(this.tHealthText);
        this.monsterContainer.addChild(this.tCapacityText);
        this.tTitleBunkers.x = this.tTitleHousing.x = this.tTitleHealing.x = this.k_titlesX;
        this.tTitleBunkers.y = this.tTitleHousing.y = this.tTitleHealing.y = this.k_aBit;
        this.monsterContainer.addChild(this.tTitleHealing);
        this.monsterContainer.addChild(this.tTitleHousing);
        this.monsterContainer.addChild(this.tTitleBunkers);
        this.m_line.visible = false;
        this.monsterContainer.addChild(this.m_line);
        this.mcStorage.mcBarB.width = 535 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get();
        this._scroller = new ScrollSet();
        this._scroller.x = 310;
        this._scroller.y = -145;
        this._scroller.width = 21;
        this._scroller.AutoHideEnabled = false;
        this._scroller.isHiddenWhileUnnecessary = true;
        this.addChild(this._scroller);
        this.monsterContainer.mask = this.monsterContainerMask;
        this._scroller.Init(as3.as(this.monsterContainer, Sprite), as3.as(this.monsterContainerMask, MovieClip), 0, -145, 240, 30);
        if (BASE.isInfernoMainYardOrOutpost) {
            this.title_txt.htmlText = KEYS.Get("mhi_title");
            this.capacity_desc_txt.htmlText = "<b>" + KEYS.Get("compound_capacity_desc") + "</b>";
            this.tAscendText.htmlText = "";
        } else {
            this.title_txt.htmlText = KEYS.Get("mh_title");
            this.capacity_desc_txt.htmlText = "<b>" + KEYS.Get("mh_capacity_desc") + "</b>";
            this.tAscendText.htmlText = "";
        }
        this.Update();
        this.reorganize();
    }

    private numHurtCreeps(param1: string): number {
        let _loc2_: int = GLOBAL.player.monsterListByID(param1).numHousedCreeps;
        return _loc2_ - _loc2_ * (GLOBAL.player.curHealthByID(param1) / GLOBAL.player.totalHealthByID(param1));
    }

    private refundResourcesEvent(param1: MouseEvent = null): void {
        let _loc2_: string = (as3.as(param1.target.parent, HousingPersistentMonsterBar)).m_creatureID;
        GLOBAL.player.refundResources(_loc2_, true);
        this.healQueueRemove(as3.as(param1.target.parent, HousingPersistentMonsterBar));
    }

    private attemptHeal(param1: MouseEvent = null): void {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: MESSAGE = null;
        let _loc2_: string = (as3.as(param1.target.parent, HousingPersistentMonsterBar)).m_creatureID;
        let _loc3_: int = GLOBAL.player.getResourceCostByID(_loc2_) | 0;
        let _loc4_: boolean = _loc2_.substr(0, 1) == "I" && !BASE.isInfernoMainYardOrOutpost;
        this.selectNone();
        if (BASE.Charge(4, _loc3_, true, _loc4_)) {
            BASE.Charge(4, _loc3_, false, _loc4_);
            this.healQueueAdd(as3.as(param1.target.parent, HousingPersistentMonsterBar));
        } else {
            _loc5_ = _loc4_ ? BASE._iresources.r4.Get() | 0 : BASE._resources.r4.Get() | 0;
            _loc3_ -= _loc5_;
            _loc6_ = GLOBAL.getShinyCostFromResourceAmt(_loc3_);
            _loc7_ = GLOBAL.player.getNumToHealByResourceCost(_loc2_, _loc5_).num | 0;
            _loc8_ = _loc2_.substr(0, 1) == "B" ? "msg_moreresourcesheal" : (_loc2_.substr(0, 1) == "I" ? "msg_moremagmaheal2" : "msg_moreresourcesheal2");
            if (_loc7_) {
                if ((as3.as(param1.target.parent, HousingPersistentMonsterBar)).m_creatureID.substr(0, 1) == "B") {
                    _loc9_ = GLOBAL.Message(KEYS.Get(_loc8_, { "v1": GLOBAL.FormatNumber(_loc3_), "v2": GLOBAL.FormatNumber(_loc6_) }), KEYS.Get("buildoptions_shiny", { "v1": _loc6_ }), as3.bind(this, this.startHealWithShiny), [as3.as(param1.target.parent, HousingPersistentMonsterBar)]);
                } else {
                    _loc9_ = GLOBAL.Message(KEYS.Get(_loc8_, { "v1": _loc7_, "v2": GLOBAL.FormatNumber(_loc3_), "v3": GLOBAL.FormatNumber(_loc6_) }), KEYS.Get("buildoptions_shiny", { "v1": _loc6_ }), as3.bind(this, this.startHealWithShiny), [as3.as(param1.target.parent, HousingPersistentMonsterBar)], KEYS.Get("btn_healmon", { "v1": _loc7_ }), as3.bind(this, this.healPartialWithGoo), [as3.as(param1.target.parent, HousingPersistentMonsterBar)]);
                }
            } else {
                _loc9_ = GLOBAL.Message(KEYS.Get(_loc8_, { "v1": _loc7_, "v2": GLOBAL.FormatNumber(_loc3_), "v3": GLOBAL.FormatNumber(_loc6_) }), KEYS.Get("buildoptions_shiny", { "v1": _loc6_ }), as3.bind(this, this.startHealWithShiny), [as3.as(param1.target.parent, HousingPersistentMonsterBar)]);
            }
            _loc9_.bAction.Highlight = true;
        }
    }

    private healPartialWithGoo(param1: HousingPersistentMonsterBar): void {
        let _loc2_: string = param1.m_creatureID;
        let _loc3_: boolean = _loc2_.substr(0, 1) == "I" && !BASE.isInfernoMainYardOrOutpost;
        let _loc4_: number = _loc3_ ? Number(BASE._iresources.r4.Get()) : Number(BASE._resources.r4.Get());
        let _loc5_: number = 0;
        let _loc6_: any = null;
        if (!(_loc6_ = GLOBAL.player.getNumToHealByResourceCost(_loc2_, _loc4_)).num) {
            return;
        }
        GLOBAL.player.queuePartialHeal(_loc2_, _loc6_.num | 0);
        BASE.Charge(4, _loc4_ - _loc6_.resoLeft, false, _loc3_);
        this.setHealMode(param1);
        this.updateHealAllButton();
        BASE.SaveB();
    }

    private startHealWithShiny(param1: HousingPersistentMonsterBar): void {
        let _loc2_: int = param1.getResourceCostInShiny();
        let _loc3_: boolean = param1.m_creatureID.substr(0, 1) == "I" && !BASE.isInfernoMainYardOrOutpost;
        let _loc4_: int = GLOBAL.player.getResourceCostByID(param1.m_creatureID) | 0;
        if (BASE._pendingPurchase.length == 0) {
            if (_loc2_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else if (!GLOBAL.ioConfirmShiny(_loc2_, "to make up the missing resources and heal", (): void => {
                this.startHealWithShiny(param1);
            })) {
                return;
            } else {
                BASE.Charge(4, _loc4_, false, _loc3_);
                this.healQueueAdd(param1);
                if (_loc2_ > 0) {
                    BASE.Purchase("MHTOPUP", _loc2_, "HousingPersistentPopup.startHealWithShiny");
                }
            }
        }
    }

    private healInstantAllShinyCheck(param1: MouseEvent = null): void {
        let _loc2_: int = this.getAllShinyCost();
        if (BASE._pendingPurchase.length == 0) {
            if (_loc2_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else if (!GLOBAL.ioConfirmShiny(_loc2_, "to heal all your monsters now", (): void => {
                this.healInstantAllShinyCheck(param1);
            })) {
                return;
            } else {
                this.healAll();
                if (_loc2_ > 0) {
                    BASE.Purchase("HAM", _loc2_, "HousingPersistentPopup.healInstantAllShinyCheck");
                }
            }
        }
    }

    private healInstantShinyCheck(param1: MouseEvent = null): void {
        let _loc2_: HousingPersistentMonsterBar = as3.as(param1.target.parent, HousingPersistentMonsterBar);
        let _loc3_: int = _loc2_.getTimeCost();
        if (BASE._pendingPurchase.length == 0) {
            if (_loc3_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else if (!GLOBAL.ioConfirmShiny(_loc3_, "to heal this monster now", (): void => {
                this.healInstantShinyCheck(param1);
            })) {
                return;
            } else {
                this.healInstant(_loc2_);
                if (_loc3_ > 0) {
                    BASE.Purchase("HSM", _loc3_, "HousingPersistentPopup.healInstantShinyCheck");
                }
            }
        }
    }

    private healQueueRemove(param1: HousingPersistentMonsterBar): void {
        GLOBAL.player.queueRemove(param1.m_creatureID);
        this.setNormalMode(param1);
        this.updateHealAllButton();
    }

    private healQueueAdd(param1: HousingPersistentMonsterBar): void {
        GLOBAL.player.queueHeal(param1.m_creatureID);
        this.setHealMode(param1);
        this.updateHealAllButton();
        BASE.SaveB();
    }

    private setHealMode(param1: HousingPersistentMonsterBar): void {
        param1.gotoAndStop(HousingPersistentMonsterBar.k_HealFrame);
        param1.bFinish.Setup(KEYS.Get("btn_housing_finish", { "v1": param1.getTimeCost() }));
        param1.bFinish.buttonMode = true;
        param1.bFinish.Highlight = true;
        param1.bFinish.addEventListener(MouseEvent.CLICK, as3.bind(this, this.healInstantShinyCheck));
        param1.bCancel.SetupKey("btn_cancel");
        param1.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.refundResourcesEvent));
        param1.bCancel.buttonMode = true;
        param1.m_shine.visible = false;
        this.reorganize();
    }

    private setNormalMode(param1: HousingPersistentMonsterBar): void {
        param1.gotoAndStop(HousingPersistentMonsterBar.k_NormalFrame);
        param1.bHeal.SetupKey("btn_mh_heal");
        if (param1.m_healthBar.mcBar.width == HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth) {
            param1.bHeal.buttonMode = false;
            param1.bHeal.Enabled = false;
        } else {
            param1.bHeal.Enabled = true;
            param1.bHeal.buttonMode = true;
            param1.bHeal.addEventListener(MouseEvent.CLICK, as3.bind(this, this.attemptHeal));
        }
        if (param1.m_creatureID.substr(0, 1) != "B") {
            param1.bJuice.SetupKey("bunker_btn_juice");
            param1.bJuice.buttonMode = param1.bJuice.Enabled = GLOBAL._bJuicer != null;
            param1.bJuice.addEventListener(MouseEvent.CLICK, as3.bind(this, this.juicerAdd));
        } else {
            param1.bJuice.visible = false;
        }
        param1.tHealStatusText.htmlText = "";
        param1.m_shine.visible = false;
        this.reorganize();
    }

    private reorganize(): void {
        let _loc5_: Vector<string> = null;
        let _loc7_: string = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: any[] = [];
        let _loc4_: boolean = false;
        let _loc6_: int = (_loc5_ = GLOBAL.player.healQueue).length | 0;
        for (_loc7_ in this.m_monsterBarList) {
            this.m_monsterBarList[_loc7_].y = -1;
            if (!GLOBAL.player.numCreepsByID(_loc7_)) {
                this.monsterContainer.removeChild(as3.cast(this.m_monsterBarList[_loc7_], DisplayObject));
                delete this.m_monsterBarList[_loc7_];
            }
            if (_loc7_.substr(0, 1) == "B") {
                _loc3_[_loc7_] = this.m_monsterBarList[_loc7_];
            }
        }
        _loc8_ = 0;
        _loc9_ = 0;
        _loc10_ = 0;
        while (_loc10_ < _loc6_) {
            if (this.m_monsterBarList[as3.vget(_loc5_, _loc10_)]) {
                _loc4_ = true;
                this.m_monsterBarList[as3.vget(_loc5_, _loc10_)].tHealStatusText.htmlText = KEYS.Get("btn_housing_waiting");
                if (!_loc2_) {
                    _loc2_ += this.k_offsetTextY;
                }
                this.m_monsterBarList[as3.vget(_loc5_, _loc10_)].y = _loc2_;
                _loc2_ += this.k_offsetY;
                if (_loc10_ == 0) {
                    this.m_monsterBarList[as3.vget(_loc5_, _loc10_)].updateTimer();
                    this.m_monsterBarList[as3.vget(_loc5_, _loc10_)].m_shine.play();
                    this.m_monsterBarList[as3.vget(_loc5_, _loc10_)].m_shine.visible = true;
                }
            }
            _loc10_++;
        }
        if (_loc4_) {
            if (this.m_monsterBarList[as3.vget(_loc5_, _loc10_ - 1)]) {
                this.m_bgWhite.height = Number(this.m_monsterBarList[as3.vget(_loc5_, _loc10_ - 1)].y + this.k_offsetY + this.k_aBit);
            }
        } else {
            this.m_bgWhite.height = 0;
        }
        this.tTitleBunkers.visible = false;
        this.tTitleHealing.visible = _loc4_;
        this.tTitleHousing.y = _loc2_ + this.k_aBit;
        _loc2_ += this.k_offsetTextY;
        for (_loc7_ in this.m_monsterBarList) {
            if (this.m_monsterBarList[_loc7_].y < 0 && _loc7_.substr(0, 1) != "B") {
                this.m_monsterBarList[_loc7_].y = _loc2_;
                _loc2_ += this.k_offsetY;
            }
        }
        this.tTitleBunkers.y = _loc2_ + this.k_aBit;
        _loc2_ += this.k_offsetTextY;
        for (_loc7_ in _loc3_) {
            if (this.m_monsterBarList[_loc7_].y < 0) {
                this.tTitleBunkers.visible = true;
                this.m_monsterBarList[_loc7_].y = _loc2_;
                _loc2_ += this.k_offsetY;
            }
        }
        if (this.monsterContainer.y < this.monsterContainerMask.height / 2 - this.monsterContainer.height) {
            this.monsterContainer.y = this.monsterContainerMask.height / 2 - this.monsterContainer.height;
        }
    }

    public tickVisualHeal(): void {
        let _loc2_: string = null;
        let _loc1_: string = !(!GLOBAL.player.healQueue.length) ? as3.vget(GLOBAL.player.healQueue, 0) : "";
        for (_loc2_ in this.m_monsterBarList) {
            this.m_monsterBarList[_loc2_].m_healthBar.mcBar.width = HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth * GLOBAL.player.curHealthByID(_loc2_) / GLOBAL.player.totalHealthByID(_loc2_);
            if (_loc2_ == _loc1_) {
                this.m_monsterBarList[_loc2_].updateTimer();
            }
            if (this.m_monsterBarList[_loc2_].currentFrame == HousingPersistentMonsterBar.k_HealFrame && !GLOBAL.player.checkQueued(_loc2_)) {
                this.setNormalMode(as3.cast(this.m_monsterBarList[_loc2_], HousingPersistentMonsterBar));
            }
        }
    }

    private getAllShinyCost(): int {
        let _loc2_: string = null;
        let _loc1_: int = 0;
        for (_loc2_ in this.m_monsterBarList) {
            _loc1_ = (_loc1_ + this.m_monsterBarList[_loc2_].getTimeCost(true)) | 0;
            _loc1_ = (_loc1_ + this.m_monsterBarList[_loc2_].getResourceCostInShiny()) | 0;
        }
        return _loc1_;
    }

    private updateHealAllButton(): void {
        let _loc1_: int = this.getAllShinyCost();
        this.bHealAll.Setup(KEYS.Get("btn_housing_heal_all", { "v1": _loc1_ }));
        if (_loc1_) {
            this.bHealAll.Enabled = true;
            this.bHealAll.enabled = true;
            this.bHealAll.Highlight = true;
        } else {
            this.bHealAll.Enabled = false;
            this.bHealAll.enabled = false;
            this.bHealAll.Highlight = false;
        }
    }

    public Update(): void {
        let _loc1_: string = null;
        let _loc2_: string = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        this.getHousableCreatures();
        this.tickVisualHeal();
        this.updateHealAllButton();
        HOUSING.HousingSpace();
        _loc3_ = 0;
        for (_loc2_ in this._juiceList) {
            _loc3_ = (_loc3_ + CREATURES.GetProperty(_loc2_, "cStorage") * this._juiceList[_loc2_]) | 0;
        }
        HOUSING._housingUsed.Add(-_loc3_);
        _loc6_ = Math.round(100 / Number(HOUSING._housingCapacity.Get()) * Number(HOUSING._housingUsed.Get())) | 0;
        this.mcStorage.mcBar.width = 535 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get();
        this.tStorage.htmlText = "<b>" + GLOBAL.FormatNumber(HOUSING._housingUsed.Get()) + " / " + GLOBAL.FormatNumber(HOUSING._housingCapacity.Get()) + " (" + _loc6_ + "%)</b>";
        if (GLOBAL._bJuicer) {
            _loc3_ = 0;
            _loc4_ = 0;
            for (_loc2_ in this._juiceList) {
                _loc3_ = (_loc3_ + this._juiceList[_loc2_]) | 0;
                _loc7_ = 0.6;
                if (GLOBAL._bJuicer._lvl.Get() == 2) {
                    _loc7_ = 0.8;
                }
                if (GLOBAL._bJuicer._lvl.Get() == 3) {
                    _loc7_ = 1;
                }
                _loc4_ = (_loc4_ + Math.ceil(CREATURES.GetProperty(_loc2_, "cResource") * _loc7_) * this._juiceList[_loc2_]) | 0;
            }
            if (_loc3_ > 0) {
                this.bJuice.Enabled = true;
                this.bJuice.Highlight = true;
                if (_loc3_ == 1) {
                    this.bJuice.Setup(KEYS.Get("mh_juicemonsterX_btn", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc4_) }));
                } else {
                    this.bJuice.Setup(KEYS.Get("mh_juicemonstersX_btn", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc4_) }));
                }
            } else {
                this.bJuice.Enabled = false;
                this.bJuice.Highlight = false;
                this.bJuice.SetupKey("mh_nomonsters_btn");
            }
        }
        this._scroller.Update();
    }

    public healInstant(param1: HousingPersistentMonsterBar): void {
        GLOBAL.player.healInstantSingleByID(param1.m_creatureID);
    }

    private healAll(): void {
        let _loc1_: HousingPersistentMonsterBar = null;
        let _loc2_: string = null;
        GLOBAL.player.healInstantAll();
        for (_loc2_ in this.m_monsterBarList) {
            _loc1_ = as3.cast(this.m_monsterBarList[_loc2_], HousingPersistentMonsterBar);
            if (_loc1_.bHeal) {
                _loc1_.bHeal.buttonMode = false;
                _loc1_.bHeal.Enabled = false;
                _loc1_.bHeal.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.attemptHeal));
            }
        }
    }

    public juicerAdd(param1: MouseEvent = null): void {
        let _loc4_: int = 0;
        let _loc2_: HousingPersistentMonsterBar = as3.as(param1.target.parent, HousingPersistentMonsterBar);
        let _loc3_: string = _loc2_.m_creatureID;
        if (!GLOBAL._bJuicer) {
            GLOBAL.Message(KEYS.Get("msg_nojuicer"));
            return;
        }
        if (GLOBAL._bJuicer._countdownUpgrade.Get() == 0) {
            if (GLOBAL._bJuicer.health > GLOBAL._bJuicer.maxHealth * 0.5) {
                if (Boolean(GLOBAL.player.monsterListByID(_loc3_)) && GLOBAL.player.monsterListByID(_loc3_).numHousedCreeps - (this._juiceList[_loc3_] | 0) > 0) {
                    this._juiceList[_loc3_] = (this._juiceList[_loc3_] | 0) + 1;
                    if (_loc3_ != this.m_strLastSelectedJuiced) {
                        this.m_strLastSelectedJuiced = _loc3_;
                        this.m_nJuiceAmount = 0;
                        this.m_bShownPopup = false;
                    }
                    ++this.m_nJuiceAmount;
                    if (!this.m_bShownPopup && this.m_nJuiceAmount >= this.k_juiceAllPopupLimit) {
                        this.m_JuiceAllPopup = new PersistantJuiceAllPopup();
                        this.m_JuiceAllPopup.setup(this.m_strLastSelectedJuiced, as3.bind(this, this.juiceAllByType), as3.bind(this, this.closeJuiceAll));
                        POPUPS.Add(this.m_JuiceAllPopup, POPUPS.k_CENTER);
                        this.m_bShownPopup = true;
                    }
                }
                _loc4_ = (GLOBAL.player.monsterListByID(_loc3_).numHousedCreeps - this._juiceList[_loc3_]) | 0;
                _loc2_.m_capacityBar.mcBar.width = HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth * (_loc4_ * CREATURES.GetProperty(_loc3_, "cStorage")) / HOUSING._housingCapacity.Get();
                if (!_loc4_) {
                    _loc2_.bJuice.Enabled = false;
                    _loc2_.bJuice.buttonMode = false;
                }
                this.Update();
            } else {
                GLOBAL.Message(KEYS.Get("msg_juicerdamaged"));
            }
        } else {
            GLOBAL.Message(KEYS.Get("msg_juicerupgrading"));
        }
    }

    public juiceCheck(param1: MouseEvent = null): void {
        let _loc9_: Vector<CreepInfo> = null;
        let _loc10_: string = null;
        let _loc11_: number = NaN;
        let _loc13_: int = 0;
        if (!this.bJuice.Enabled) {
            return;
        }
        let _loc2_: string = "";
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: number = 0;
        let _loc6_: number = 0;
        let _loc7_: Player = GLOBAL.player;
        let _loc8_: int = 0;
        for (_loc10_ in this._juiceList) {
            _loc4_ = this._juiceList[_loc10_] | 0;
            _loc3_ += _loc4_;
            _loc8_ = (_loc9_ = _loc7_.monsterListByID(_loc10_).m_creeps).length | 0;
            _loc13_ = 0;
            while (_loc13_ < _loc8_ && Boolean(_loc4_)) {
                if (!as3.vget(_loc9_, _loc13_).ownerID) {
                    if (as3.vget(_loc9_, _loc13_).self) {
                        _loc4_--;
                        if (_loc10_.substr(0, 1) == "I") {
                            _loc6_ += CREATURES.GetProperty(_loc10_, "cResource") * (as3.vget(_loc9_, _loc13_).health / CREATURES.GetProperty(_loc10_, "health"));
                        } else {
                            _loc5_ += CREATURES.GetProperty(_loc10_, "cResource") * (as3.vget(_loc9_, _loc13_).health / CREATURES.GetProperty(_loc10_, "health"));
                        }
                    }
                }
                _loc13_++;
            }
        }
        _loc11_ = 0.6;
        if (GLOBAL._bJuicer._lvl.Get() == 2) {
            _loc11_ = 0.8;
        } else if (GLOBAL._bJuicer._lvl.Get() == 3) {
            _loc11_ = 1;
        }
        _loc6_ = Math.floor(_loc11_ * _loc6_);
        if ((Boolean(_loc5_ = Math.floor(_loc11_ * _loc5_))) && Boolean(_loc6_)) {
            _loc2_ = KEYS.Get("msg_juiceboth", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc5_), "v3": GLOBAL.FormatNumber(_loc6_) });
        } else if (_loc5_) {
            _loc2_ = KEYS.Get("msg_juicegoo", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc5_) });
        } else if (_loc6_) {
            _loc2_ = KEYS.Get("msg_juicemagma", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc6_) });
        }
        let _loc12_: MESSAGE = null;
        (_loc12_ = GLOBAL.Message(_loc2_, KEYS.Get("btn_juicemonsters"), as3.bind(this, this.juice), null)).bAction.Highlight = true;
    }

    public juice(param1: MouseEvent = null): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: BFOUNDATION = null;
        let _loc5_: MonsterBase = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc6_: any[] = [];
        let _loc7_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc4_ of (_loc7_ ?? [])) {
            _loc6_.push(_loc4_);
        }
        for (_loc2_ in this._juiceList) {
            _loc8_ = this._juiceList[_loc2_] | 0;
            _loc9_ = 0;
            while (_loc9_ < _loc8_) {
                GLOBAL.player.monsterListByID(_loc2_).juiceCreep();
                let leftToJuice: int = this._juiceList[_loc2_] | 0;
                this._juiceList[_loc2_] = --leftToJuice;
                _loc9_++;
            }
        }
        this.mcStorage.mcBarB.width = this.mcStorage.mcBar.width;
        this.updateCapacityBars();
        this.tickVisualHeal();
        this.reorganize();
        this._juiceList = {};
        HOUSING.HousingSpace();
        BASE.Save();
    }

    private updateCapacityBars(): void {
        let _loc2_: HousingPersistentMonsterBar = null;
        let _loc3_: string = null;
        let _loc1_: int = 0;
        for (_loc3_ in this.m_monsterBarList) {
            _loc2_ = as3.cast(this.m_monsterBarList[_loc3_], HousingPersistentMonsterBar);
            if (_loc3_.substr(0, 1) != "B") {
                _loc1_ = GLOBAL.player.monsterListByID(_loc3_).numHousedCreeps;
                _loc2_.tName.htmlText = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc3_].name)) + "</b> x" + _loc1_;
            } else {
                _loc2_.tName.htmlText = "<b>" + KEYS.Get("#b_monsterbunker#") + "</b>";
            }
            if (_loc2_.currentFrame == HousingPersistentMonsterBar.k_NormalFrame) {
                _loc2_.bJuice.Enabled = true;
                _loc2_.bJuice.buttonMode = true;
            }
            _loc2_.m_capacityBar.mcBar.width = HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth * GLOBAL.player.getStorageByID(_loc3_) / HOUSING._housingCapacity.Get();
            _loc2_.m_capacityBar.mcBarGrey.width = _loc2_.m_capacityBar.mcBar.width;
            _loc2_.tCapacityText.htmlText = "<b>" + GLOBAL.player.getStorageByID(_loc3_) + "</b>";
        }
    }

    public getHousableCreatures(): any[] {
        let _loc7_: any = null;
        let _loc8_: int = 0;
        let _loc1_: int = 0;
        let _loc2_: any[] = [];
        let _loc3_: any[] = [];
        let _loc4_: Vector<MonsterData> = null;
        let _loc5_: int = (_loc4_ = GLOBAL.player.monsterList).length | 0;
        let _loc6_: int = 0;
        while (_loc6_ < _loc5_) {
            if (!(_loc7_ = CREATURELOCKER._creatures[as3.vget(_loc4_, _loc6_).m_creatureID]).blocked && Boolean(as3.vget(_loc4_, _loc6_).numHousedCreeps)) {
                _loc7_.id = as3.vget(_loc4_, _loc6_).m_creatureID;
                _loc2_.push(_loc7_);
            }
            if (as3.vget(_loc4_, _loc6_).numBunkeredCreeps) {
                _loc1_ = as3.vget(_loc4_, _loc6_).m_creeps.length | 0;
                _loc8_ = 0;
                while (_loc8_ < _loc1_) {
                    if (as3.vget(as3.vget(_loc4_, _loc6_).m_creeps, _loc8_).ownerID) {
                        if (!this.m_bunkerIDList[as3.vget(as3.vget(_loc4_, _loc6_).m_creeps, _loc8_).ownerID]) {
                            this.m_bunkerIDList[as3.vget(as3.vget(_loc4_, _loc6_).m_creeps, _loc8_).ownerID] = 1;
                            (_loc7_ = new Object()).id = "B" + as3.vget(as3.vget(_loc4_, _loc6_).m_creeps, _loc8_).ownerID;
                            _loc7_.index = 300;
                            _loc2_.push(_loc7_);
                        }
                    }
                    _loc8_++;
                }
            }
            _loc6_++;
        }
        as3.sortOn(_loc2_, ["index"], Array.NUMERIC);
        if (_loc2_.length > 0) {
            _loc3_ = _loc3_.concat(_loc2_);
        }
        return _loc3_;
    }

    public selectNone(param1: MouseEvent = null): void {
        this._juiceList = {};
        this.bJuice.SetupKey("mh_nomonsters_btn");
        this.bJuice.Enabled = false;
        this.bJuice.Highlight = false;
        this.updateCapacityBars();
        this.Update();
        this.m_bShownPopup = false;
        this.m_nJuiceAmount = 0;
        this.m_strLastSelectedJuiced = "";
        if (this.m_JuiceAllPopup) {
            POPUPS.Remove(this.m_JuiceAllPopup);
        }
        this.m_JuiceAllPopup = null;
    }

    public closeJuiceAll(param1: MouseEvent): void {
        if (this.m_JuiceAllPopup) {
            POPUPS.Remove(this.m_JuiceAllPopup);
        }
        this.m_JuiceAllPopup = null;
    }

    public iconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcImage.visible = true;
        param3[0].mcLoading.visible = false;
    }

    public ascend(param1: MouseEvent = null): void {
        if (!MAPROOM_DESCENT.DescentPassed) {
            GLOBAL.Message(KEYS.Get("mh_ascension_noinf"));
        } else {
            SOUNDS.Play("click1");
            this.Hide();
            INFERNOPORTAL.AscendMonsters();
        }
    }

    protected juiceAllByType(param1: string): void {
        this._juiceList[param1] = GLOBAL.player.monsterListByID(param1).numHousedCreeps;
        this.m_strLastSelectedJuiced = "";
        this.m_nJuiceAmount = 0;
        this.m_bShownPopup = false;
        let _loc2_: int = (GLOBAL.player.monsterListByID(param1).numHousedCreeps - this._juiceList[param1]) | 0;
        this.m_monsterBarList[param1].m_capacityBar.mcBar.width = HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth * (_loc2_ * CREATURES.GetProperty(param1, "cStorage")) / HOUSING._housingCapacity.Get();
        this.m_monsterBarList[param1].bJuice.Enabled = false;
        this.m_monsterBarList[param1].bJuice.buttonMode = false;
    }

    public Hide(): void {
        HOUSING.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
