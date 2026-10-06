import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, CREATURELOCKER, CREATURELOCKERPOPUP_CLIP, CREATURES, Circ, CreatureLockerItem, GLOBAL, ImageCache, IoHfo, IoLockIcon, KEYS, LOGGER, POPUPS, POPUPSETTINGS, QUESTS, STORE, TweenLite, popup_monster } from "@game";

export class CREATURELOCKERPOPUP extends CREATURELOCKERPOPUP_CLIP {
    static {
        as3.fields(this, { _minPages: 1, _maxPages: 4, _mcList: null, _tempCreatureList: null, _creatureID: null, _portraitImage: null, _instantUnlockCost: 0, _guidePage: 1 });
    }

    private static readonly _CREATURES_PER_PAGE: int = 4;
    private _minPages: int;
    private _maxPages: int;
    public _mcList: MovieClip;
    public _tempCreatureList: any[];
    public _creatureID: string;
    public _portraitImage: DisplayObject;
    public _instantUnlockCost: int;
    private _guidePage: int;

    public $ctor(): void {
        let _loc1_: int = 0;
        let _loc2_: any = undefined;
        let _loc3_: any = false;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        super.$ctor();
        this.bPrevious.SetupKey("btn_previous");
        this.bPrevious.addEventListener(MouseEvent.CLICK, as3.bind(this, this.PagePrevious));
        this.bNext.SetupKey("btn_next");
        this.bNext.addEventListener(MouseEvent.CLICK, as3.bind(this, this.PageNext));
        this.bInstant.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantUnlock));
        for (_loc2_ in CREATURELOCKER._creatures) {
            _loc1_++;
        }
        // Inferno-only: page 5 holds Korath and Drull (Strongbox level 5).
        this._maxPages = GLOBAL.INFERNO_ONLY && BASE.isInfernoMainYardOrOutpost ? 5 : 4;
        this.List();
        _loc3_ = false;
        if (CREATURELOCKER._unlocking != null) {
            _loc3_ = CREATURELOCKER._unlocking.substring(0, 2) == "IC";
        }
        if (CREATURELOCKER._unlocking != null) {
            CREATURELOCKER._page = CREATURELOCKER._creatures[CREATURELOCKER._unlocking].page | 0;
            this.ShowB(CREATURELOCKER._unlocking);
        } else {
            _loc4_ = CREATURELOCKER._popupCreatureID;
            _loc5_ = CREATURELOCKER._page;
            CREATURELOCKER._page = CREATURELOCKER._creatures[CREATURELOCKER._popupCreatureID].page | 0;
            this.ShowB(CREATURELOCKER._popupCreatureID);
        }
        this.title_txt.htmlText = KEYS.Get(as3.str(GLOBAL._bLocker._buildingProps.name));
        this.prod_label_txt.htmlText = KEYS.Get("cloc_prodstats_label");
        this.speed_txt.htmlText = "<b>" + KEYS.Get("mon_att_speed") + "</b>";
        this.health_txt.htmlText = "<b>" + KEYS.Get("mon_att_health") + "</b>";
        this.damage_txt.htmlText = "<b>" + KEYS.Get("mon_att_damage") + "</b>";
        this.goo_txt.htmlText = "<b>" + KEYS.Get("moni_att_cost") + "</b>";
        this.housing_txt.htmlText = "<b>" + KEYS.Get("mon_att_housing") + "</b>";
        this.time_txt.htmlText = "<b>" + KEYS.Get("mon_att_time") + "</b>";
    }

    public PagePrevious(param1: MouseEvent): void {
        if (CREATURELOCKER._page > this._minPages) {
            --CREATURELOCKER._page;
        }
        this.List();
    }

    public PageNext(param1: MouseEvent): void {
        if (CREATURELOCKER._page < this._maxPages) {
            ++CREATURELOCKER._page;
        }
        this.List();
    }

    private disableButton(param1: MovieClip): void {
        param1.Enabled = false;
        param1.Highlight = false;
    }

    private enableButton(param1: MovieClip): void {
        param1.Enabled = true;
    }

    public List(): void {
        let _loc1_: string = null;
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: CreatureLockerItem = null;
        let _loc7_: any = null;
        if (CREATURELOCKER._page > this._minPages) {
            this.enableButton(this.bPrevious);
        } else {
            this.disableButton(this.bPrevious);
        }
        if (CREATURELOCKER._page < this._maxPages) {
            this.enableButton(this.bNext);
        } else {
            this.disableButton(this.bNext);
        }
        this._tempCreatureList = [];
        for (_loc1_ in CREATURELOCKER.GetAppropriateCreatures()) {
            if (!(_loc4_ = CREATURELOCKER._creatures[_loc1_]).blocked && _loc4_.page == CREATURELOCKER._page) {
                _loc4_.id = _loc1_;
                this._tempCreatureList.push(_loc4_);
            }
        }
        as3.sortOn(this._tempCreatureList, ["order"], Array.NUMERIC);
        if (this._mcList) {
            this.mcList.removeChild(this._mcList);
        }
        this._mcList = as3.as(this.mcList.addChild(new MovieClip()), MovieClip);
        this._mcList.x = 10;
        this._mcList.y = 10;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        while (_loc3_ < this._tempCreatureList.length) {
            _loc1_ = String((_loc4_ = this._tempCreatureList[_loc3_]).id);
            _loc5_ = CREATURELOCKER._lockerData[_loc1_];
            (_loc6_ = as3.as(this._mcList.addChild(new CreatureLockerItem()), CreatureLockerItem)).y = _loc2_;
            _loc2_ += 40;
            _loc7_ = "<b>" + KEYS.Get(as3.str(_loc4_.name)) + "</b>";
            if (_loc5_) {
                if (_loc5_.t == 1) {
                    _loc7_ += "<br>" + GLOBAL.ToTime((_loc5_.e - GLOBAL.Timestamp()) | 0);
                } else {
                    _loc7_ += "<br><font color=\"#333333\">" + KEYS.Get("mon_unlocked") + "</font>";
                }
            } else {
                _loc7_ += "<br><font color=\"#CC0000\">" + KEYS.Get("mon_locked") + "</font>";
            }
            _loc6_.tLabel.htmlText = as3.str(_loc7_);
            _loc6_.addEventListener(MouseEvent.MOUSE_DOWN, this.Show(_loc1_));
            _loc6_.buttonMode = true;
            _loc6_.mouseChildren = false;
            _loc6_.mouseEnabled = true;
            if (CREATURELOCKER._unlocking == _loc1_) {
                _loc6_.gotoAndStop(2);
            } else {
                _loc6_.gotoAndStop(1);
            }
            _loc6_.mcTick.visible = false;
            if (_loc5_) {
                if (_loc5_.t == 1) {
                    _loc6_.mcBar.width = 156 / (_loc5_.e - _loc5_.s) * (GLOBAL.Timestamp() - _loc5_.s);
                } else if (_loc5_.t == 2) {
                    _loc6_.mcTick.visible = true;
                    _loc6_.mcBar.visible = false;
                }
            } else {
                _loc6_.mcBar.width = 0;
            }
            if (GLOBAL.INFERNO_ONLY) {
                // locked: the padlock where the tick of an unlocked one goes
                IoLockIcon.mark(_loc6_.mcTick, !_loc5_, false, "middle", false);
            }
            _loc3_++;
        }
    }

    public Show(param1: string): Function {
        let creatureID: string = null;
        creatureID = param1;
        return (param1: MouseEvent = null): void => {
            this.ShowB(creatureID);
        };
    }

    public ShowB(param1: string): void {
        let data: any = null;
        let str: string = null;
        let maxSpeed: number = NaN;
        let maxHealth: int = 0;
        let maxDamage: int = 0;
        let maxTime: int = 0;
        let maxResource: int = 0;
        let maxStorage: int = 0;
        let c: string = null;
        let dam: int = 0;
        let UpdatePortrait: Function = null;
        let putty: int = 0;
        let time: int = 0;
        let timeCost: int = 0;
        let resourcesCost: int = 0;
        let creatureID: string = param1;
        UpdatePortrait = (param1: string, param2: BitmapData): void => {
            this._portraitImage = this.mcImage.addChild(new Bitmap(param2));
            if (GLOBAL.INFERNO_ONLY) {
                IoLockIcon.mark(this._portraitImage, IoLockIcon.lockedMonster(this._creatureID), true, "corner", false);
            }
        };
        this._creatureID = creatureID;
        if (!creatureID) {
            creatureID = CREATURELOCKER.getFirstCreatureID();
        }
        CREATURELOCKER._popupCreatureID = this._creatureID;
        this.List();
        data = CREATURELOCKER._creatures[this._creatureID];
        this.tDescription.htmlText = "<b>" + KEYS.Get(as3.str(data.name)) + "</b><br>" + KEYS.Get(as3.str(data.description));
        str = "";
        if (CREATURELOCKER._unlocking != null) {
            str = KEYS.Get("mon_infounlocking");
        } else if (Boolean(CREATURELOCKER._lockerData[this._creatureID]) && CREATURELOCKER._lockerData[this._creatureID].t == 2) {
            str = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "inf_mon_infounlocked" : "mon_infounlocked");
        } else {
            str = KEYS.Get("mon_infotounlock", { "v1": GLOBAL.ToTime(data.time | 0) });
            if (BASE._resources.r3.Get() < data.resource) {
                str += "<font color=\"#CC0000\">";
            }
            str += "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[2])) + "</b>: " + GLOBAL.FormatNumber(Number(data.resource)) + "<br>";
            if (BASE._resources.r3.Get() < data.resource) {
                str += "</font>";
            }
            if (GLOBAL._bLocker._lvl.Get() < data.level) {
                str += "<font color=\"#CC0000\">";
            }
            str += KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "mon_strongboxlevelrequired" : "mon_infolockerlevelrequired", { "v1": data.level });
            if (GLOBAL._bLocker._lvl.Get() < data.level) {
                str += "</font>";
            }
        }
        this.tCosts.htmlText = str;
        maxSpeed = 0;
        maxHealth = 0;
        maxDamage = 0;
        maxTime = 0;
        maxResource = 0;
        maxStorage = 0;
        for (c in CREATURELOCKER.GetAppropriateCreatures()) {
            if (CREATURES.GetProperty(c, "speed") > maxSpeed) {
                maxSpeed = CREATURES.GetProperty(c, "speed");
            }
            if (CREATURES.GetProperty(c, "health") > maxHealth) {
                maxHealth = CREATURES.GetProperty(c, "health") | 0;
            }
            if (CREATURES.GetProperty(c, "damage") > maxDamage) {
                maxDamage = CREATURES.GetProperty(c, "damage") | 0;
            }
            if (CREATURES.GetProperty(c, "cTime") > maxTime) {
                maxTime = CREATURES.GetProperty(c, "cTime") | 0;
            }
            if (CREATURES.GetProperty(c, "cResource") > maxResource) {
                maxResource = CREATURES.GetProperty(c, "cResource") | 0;
            }
            if (CREATURES.GetProperty(c, "cStorage") > maxStorage) {
                maxStorage = CREATURES.GetProperty(c, "cStorage") | 0;
            }
        }
        TweenLite.to(this.bSpeed.mcBar, 0.4, { "width": 100 / maxSpeed * CREATURES.GetProperty(this._creatureID, "speed"), "ease": Circ.easeInOut, "delay": 0 });
        TweenLite.to(this.bHealth.mcBar, 0.4, { "width": 100 / maxHealth * CREATURES.GetProperty(this._creatureID, "health"), "ease": Circ.easeInOut, "delay": 0.05 });
        TweenLite.to(this.bDamage.mcBar, 0.4, { "width": 100 / maxDamage * CREATURES.GetProperty(this._creatureID, "damage"), "ease": Circ.easeInOut, "delay": 0.1 });
        TweenLite.to(this.bResource.mcBar, 0.4, { "width": 100 / maxResource * CREATURES.GetProperty(this._creatureID, "cResource"), "ease": Circ.easeInOut, "delay": 0.15 });
        TweenLite.to(this.bStorage.mcBar, 0.4, { "width": 100 / maxStorage * CREATURES.GetProperty(this._creatureID, "cStorage"), "ease": Circ.easeInOut, "delay": 0.2 });
        TweenLite.to(this.bTime.mcBar, 0.4, { "width": 100 / maxTime * CREATURES.GetProperty(this._creatureID, "cTime"), "ease": Circ.easeInOut, "delay": 0.25 });
        this.tSpeed.htmlText = KEYS.Get("mon_statsspeed", { "v1": CREATURES.GetProperty(this._creatureID, "speed") });
        this.tHealth.htmlText = as3.str(CREATURES.GetProperty(this._creatureID, "health").toString());
        dam = CREATURES.GetProperty(this._creatureID, "damage") | 0;
        if (dam > 0) {
            this.tDamage.htmlText = as3.str(dam.toString());
        } else {
            this.tDamage.htmlText = -dam + " (" + KEYS.Get("str_heal") + ")";
        }
        this.tResource.htmlText = CREATURES.GetProperty(this._creatureID, "cResource") + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[3]));
        this.tStorage.htmlText = KEYS.Get("mon_statsstorage", { "v1": CREATURES.GetProperty(this._creatureID, "cStorage") });
        this.tTime.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(this._creatureID, "cTime") | 0, true);
        if (CREATURELOCKER._lockerData[this._creatureID]) {
            if (CREATURELOCKER._lockerData[this._creatureID].t == 2) {
                this.mcButtons.gotoAndStop(1);
                this.mcButtons.bStart.SetupKey("mon_unlocked");
                this.mcButtons.bStart.Enabled = false;
                this.mcButtons.bStart.Highlight = false;
                this.bInstant.visible = false;
            } else {
                this.mcButtons.gotoAndStop(2);
                this.mcButtons.bStop.SetupKey("btn_cancel");
                this.mcButtons.bStop.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Stop));
                this.mcButtons.bSpeedup.SetupKey("btn_speedup");
                this.mcButtons.bSpeedup.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Speedup));
                this.mcButtons.bSpeedup.Highlight = true;
                this.bInstant.visible = false;
            }
        } else if (this._creatureID == CREATURELOCKER.RIMEGRAVE_ID && !IoHfo.championFree()) {
            // Hell Freezes Over: sealed in the ice until the player breaks the curse
            this.mcButtons.gotoAndStop(1);
            this.mcButtons.bStart.SetupKey("mon_locked");
            this.mcButtons.bStart.Enabled = false;
            this.mcButtons.bStart.Highlight = false;
            this.bInstant.visible = false;
            this.tCosts.htmlText = "<font color=\"#1A5A9A\"><b>" + KEYS.Get("mon_strongbox_hfo_locked") + "</b></font>";
        } else {
            this.mcButtons.gotoAndStop(1);
            this.mcButtons.bStart.SetupKey("btn_startunlocking");
            this.mcButtons.bStart.Enabled = true;
            this.mcButtons.bStart.Highlight = true;
            this.mcButtons.bStart.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Start));
            putty = CREATURELOCKER._creatures[this._creatureID].resource | 0;
            time = CREATURELOCKER._creatures[this._creatureID].time | 0;
            timeCost = STORE.GetTimeCost(time);
            resourcesCost = Math.ceil(Math.pow(Math.sqrt(putty / 2), 0.75)) | 0;
            this._instantUnlockCost = (timeCost + resourcesCost) | 0;
            this.bInstant.Setup(KEYS.Get("btn_unlockinstantly", { "v1": this._instantUnlockCost }));
            this.bInstant.visible = true;
            this.bInstant.Enabled = true;
            this.bInstant.Highlight = true;
        }
        if (Boolean(this._portraitImage) && Boolean(this._portraitImage.parent)) {
            IoLockIcon.unmark(this._portraitImage);
            this._portraitImage.parent.removeChild(this._portraitImage);
        }
        ImageCache.GetImageWithCallBack("monsters/" + this._creatureID + "-portrait.jpg", UpdatePortrait, true, 1);
    }

    public Start(param1: MouseEvent): void {
        if (CREATURELOCKER.Start(this._creatureID)) {
            this.Update();
        }
    }

    public Stop(param1: MouseEvent): void {
        GLOBAL.Message(KEYS.Get("mon_confirmcancel", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name)) }), KEYS.Get("btn_yes"), CREATURELOCKER.Cancel);
    }

    public Speedup(param1: MouseEvent): void {
        STORE.SpeedUp("SP4");
    }

    public Update(): void {
        this.ShowB(this._creatureID);
        this.Tick();
    }

    public Tick(): void {
        this.List();
    }

    public InstantUnlock(param1: MouseEvent): void {
        let e: MouseEvent = null;
        let creature: any = null;
        let StreamPost: Function = null;
        let img: string = null;
        let mc: popup_monster = null;
        let _body: string = null;
        let image: string = null;
        let hatcheryName: string = null;
        e = param1;
        // Inferno-only: only a monster not yet unlocked or unlocking (a second click, or one after the shiny
        // confirmation, paid for an unlock that was already done)
        if (GLOBAL.INFERNO_ONLY && CREATURELOCKER._lockerData[this._creatureID]) {
            this.Update();
            return;
        }
        if (BASE._credits.Get() < this._instantUnlockCost) {
            POPUPS.DisplayGetShiny();
            return;
        }
        if (!GLOBAL.ioConfirmShiny(this._instantUnlockCost, "to unlock this monster now", (): void => {
            this.InstantUnlock(e);
        })) {
            return;
        }
        if (GLOBAL._bLocker._lvl.Get() < CREATURELOCKER._creatures[this._creatureID].level) {
            GLOBAL.Message(KEYS.Get("mon_upgradelocker", { "v1": KEYS.Get(as3.str(GLOBAL._bLocker._buildingProps.name)), "v2": CREATURELOCKER._creatures[this._creatureID].level }));
            return;
        }
        if (CREATURELOCKER._unlocking && CREATURELOCKER._lockerData[CREATURELOCKER._unlocking] && CREATURELOCKER._lockerData[CREATURELOCKER._unlocking] == this._creatureID) {
            delete CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].s;
            delete CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e;
        }
        creature = CREATURELOCKER._creatures[this._creatureID];
        if (!BASE.isInfernoMainYardOrOutpost) {
            img = "quests/monster" + this._creatureID.substr(1) + ".v2.png";
        } else {
            img = "quests/monsterinferno" + this._creatureID.substr(2) + ".png";
        }
        if (creature.stream.length > 1) {
            img = String(creature.stream[2]);
        }
        CREATURELOCKER._lockerData[this._creatureID] = { "t": 2 };
        // Inferno-only: a monster unlocked again keeps the Academy level it was trained to (as a timed unlock does).
        if (!(GLOBAL.INFERNO_ONLY && GLOBAL.player.m_upgrades[this._creatureID] && (GLOBAL.player.m_upgrades[this._creatureID].level | 0) > 1)) {
            GLOBAL.player.m_upgrades[this._creatureID] = { "level": 1 };
        }
        if (!BASE.isInfernoMainYardOrOutpost) {
            LOGGER.Stat([46, Number(this._creatureID.substr(1)) | 0]);
        } else {
            LOGGER.Stat([46, Number(this._creatureID.substr(2)) | 0]);
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            StreamPost = (param1: string, param2: string, param3: string): Function => {
                let st: string = null;
                let sd: string = null;
                let im: string = null;
                st = param1;
                sd = param2;
                im = param3;
                return (param1: MouseEvent = null): void => {
                    GLOBAL.CallJS("sendFeed", ["unlock-end", st, sd, im, 0]);
                    POPUPS.Next();
                };
            };
            mc = new popup_monster();
            mc.bSpeedup.SetupKey("btn_warnyourfriends");
            if (!creature.stream[0]) {
                mc.bSpeedup.visible = false;
            }
            _body = "";
            if (creature.stream[1]) {
                _body = KEYS.Get(as3.str(creature.stream[1]));
            }
            mc.bSpeedup.addEventListener(MouseEvent.CLICK, StreamPost(KEYS.Get(as3.str(creature.stream[0])), _body, img));
            mc.bSpeedup.Highlight = true;
            mc.bAction.visible = false;
            if (CREATURELOCKER._creatures) {
                hatcheryName = !(!GLOBAL._bHatchery) ? String(GLOBAL._bHatchery._buildingProps.name) : String(GLOBAL._buildingProps[12].name);
                mc.tText.htmlText = KEYS.Get("pop_unlock_complete", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[this._creatureID].name)), "v2": KEYS.Get(hatcheryName) });
            }
            image = this._creatureID + "-150.png";
            POPUPS.Push(mc, null, null, null, image);
        }
        // Inferno-only: a monster unlocked instantly while another one unlocks leaves that unlock running
        // (clearing it let a second unlock start before the next tick)
        if (!GLOBAL.INFERNO_ONLY || CREATURELOCKER._unlocking == this._creatureID) {
            CREATURELOCKER._unlocking = null;
        }
        QUESTS.Check();
        BASE.Purchase("IUN", this._instantUnlockCost, "creaturelocker");
        this.Update();
    }

    public Help(param1: MouseEvent = null): void {
        let _loc2_: int = 2;
        this._guidePage += 1;
        if (this._guidePage > _loc2_) {
            this._guidePage = 1;
        }
        this.gotoAndStop(this._guidePage);
        if (this._guidePage > 1) {
            this.txtGuide.htmlText = KEYS.Get("loc_tut_" + (this._guidePage - 1));
            if (this._guidePage == 2) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        }
    }

    public Hide(param1: MouseEvent = null): void {
        CREATURELOCKER.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
