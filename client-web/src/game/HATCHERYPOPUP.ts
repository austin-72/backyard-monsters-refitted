import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BRESOURCE, BUILDING13, CREATURELOCKER, CREATURES, Circ, GLOBAL, HATCHERY, HATCHERYPOPUP_CLIP, HOUSING, HatcheryMonsterIcon_CLIP, ImageCache, IoLockIcon, KEYS, POPUPS, POPUPSETTINGS, ResourcePackages, SOUNDS, STORE, ScrollSet, TUTORIAL, TweenLite } from "@game";

export class HATCHERYPOPUP extends HATCHERYPOPUP_CLIP {
    static {
        as3.fields(this, { _hatchery: null, _monsterSlots: null, MONSTERSLOTSIZE: null, _scrollSet: null, _scrollSetContainer: null, _guidePage: 1, _ioHolding: false, _ioHoldN: 0, _ioHoldTick: 0 });
    }

    public _hatchery: BUILDING13;
    public _monsterSlots: any[];
    private MONSTERSLOTSIZE: Rectangle;
    private _scrollSet: ScrollSet;
    private _scrollSetContainer: Sprite;
    public _guidePage: int;
    // ---- Inferno-only (3 October): hold a monster down to keep adding it, as the Incubation Control
    // Station does. The first press adds one; held for about a third of a second, one more every other
    // frame, until it is let go, the queue is full or the magma runs out.
    private _ioHolding: boolean;
    private _ioHoldN: int;
    private _ioHoldTick: int;

    public $ctor(): void {
        let _loc5_: any[] = null;
        let _loc7_: int = 0;
        let _loc8_: boolean = false;
        let _loc9_: int = 0;
        let _loc10_: MovieClip = null;
        this.MONSTERSLOTSIZE = new Rectangle(0, 0, 65, 50);
        super.$ctor();
        this.title_txt.htmlText = KEYS.Get(as3.str(GLOBAL._bHatchery._buildingProps.name));
        this.bSpeedup.tName.htmlText = "<b>" + KEYS.Get("btn_speedup") + "</b>";
        this.bSpeedup.mouseChildren = false;
        if (!BASE.isInfernoMainYardOrOutpost) {
            this.bSpeedup.addEventListener(MouseEvent.CLICK, STORE.Show(3, 2, ["HOD", "HOD2", "HOD3"]));
        } else {
            this.bSpeedup.addEventListener(MouseEvent.CLICK, STORE.Show(3, 2, ["HODI", "HOD2I", "HOD3I"]));
        }
        this.bSpeedup.buttonMode = true;
        this.bFinish.tName.htmlText = "<b>" + KEYS.Get("str_finishnow") + "</b>";
        this.bFinish.mouseChildren = false;
        this.bFinish.addEventListener(MouseEvent.CLICK, as3.bind(this, this.FinishNow));
        this.bFinish.buttonMode = true;
        this._scrollSet = new ScrollSet();
        this._scrollSet.x = this.scroller.x;
        this._scrollSet.y = this.scroller.y;
        this._scrollSet.width = this.scroller.width;
        this._scrollSet.Init(this.monsterCanvas, this.monsterMask, ScrollSet.BROWN, this.monsterMask.y, this.monsterMask.height);
        this._scrollSet.AutoHideEnabled = false;
        this._scrollSet.isHiddenWhileUnnecessary = true;
        this._scrollSetContainer = new Sprite();
        this._scrollSetContainer.addChild(this._scrollSet);
        this.addChild(this._scrollSetContainer);
        this.scroller.visible = false;
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 9;
        let _loc4_: int = 5;
        this._monsterSlots = [];
        _loc5_ = CREATURELOCKER.GetSortedCreatures(true);
        let _loc6_: int = !BASE.isInfernoMainYardOrOutpost ? CREATURELOCKER.maxCreatures("above") : CREATURELOCKER.maxCreatures("inferno");
        _loc7_ = 0;
        while (_loc7_ < _loc6_) {
            _loc8_ = false;
            if (Boolean(_loc5_[_loc7_]) && _loc5_[_loc7_].blocked == true) {
                _loc2_++;
            } else {
                _loc9_ = _loc5_[_loc7_].id.substr(_loc5_[_loc7_].id.indexOf("C") + 1) | 0;
                (_loc10_ = new HatcheryMonsterIcon_CLIP()).width = this.MONSTERSLOTSIZE.width;
                _loc10_.height = this.MONSTERSLOTSIZE.height;
                _loc10_.addEventListener(MouseEvent.MOUSE_OVER, this.MonsterInfo(_loc9_));
                _loc10_.x = _loc1_ % _loc3_ * (_loc10_.width + _loc4_);
                _loc10_.y = Math.floor(_loc1_ / _loc3_) * (_loc10_.height + _loc4_);
                this.monsterCanvas.addChild(_loc10_);
                this._monsterSlots.push(_loc10_);
                ImageCache.GetImageWithCallBack("monsters/" + _loc5_[_loc7_].id + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [_loc10_]);
                if (Boolean(CREATURELOCKER._lockerData[_loc5_[_loc7_].id]) && CREATURELOCKER._lockerData[_loc5_[_loc7_].id].t == 2) {
                    _loc10_.addEventListener(MouseEvent.MOUSE_DOWN, GLOBAL.INFERNO_ONLY ? this.ioHoldStart(_loc9_) : this.QueueAdd(_loc9_));
                    _loc10_.alpha = 1;
                    _loc10_.buttonMode = true;
                } else {
                    _loc10_.alpha = 0.5;
                    _loc10_.buttonMode = false;
                    if (GLOBAL.INFERNO_ONLY) {
                        IoLockIcon.mark(_loc10_, true);
                    }
                }
                _loc1_++;
            }
            _loc7_++;
        }
        this.mcMonsterInfo.speed_txt.htmlText = "<b>" + KEYS.Get("mon_att_speed") + "</b>";
        this.mcMonsterInfo.health_txt.htmlText = "<b>" + KEYS.Get("mon_att_health") + "</b>";
        this.mcMonsterInfo.damage_txt.htmlText = "<b>" + KEYS.Get("mon_att_damage") + "</b>";
        this.mcMonsterInfo.goo_txt.htmlText = "<b>" + KEYS.Get("mon_att_cost", { "v1": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) }) + "</b>";
        this.mcMonsterInfo.housing_txt.htmlText = "<b>" + KEYS.Get("mon_att_housing") + "</b>";
        this.mcMonsterInfo.time_txt.htmlText = "<b>" + KEYS.Get("mon_att_time") + "</b>";
        this.MonsterInfoB(1);
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.removeChildAt(0);
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcImage.visible = true;
    }

    public MonsterInfo(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            this.MonsterInfoB(n);
        };
    }

    /*
     * This function has been rewritten.
     *
     * @autor: matiasbais
     *
     * @changes: Renamed local registers to readable names and removed unused logic
     *
     * @param {String} creatureID - the current creature's ID passed to MonsterInfoB
     */
    /**
     * The popup passes monsters around as bare numbers and used to rebuild the id as "IC" + number
     * in an Inferno yard. That is wrong for an overworld monster that has been let into the Inferno:
     * Rezghul is C19, and "IC19" does not exist, so hovering over him crashed and he could not be
     * queued. Use the Inferno id when there is one, the overworld id otherwise.
     */
    private static ioMonsterId(param1: int): string {
        if (BASE.isInfernoMainYardOrOutpost && CREATURELOCKER._creatures["IC" + param1]) {
            return "IC" + param1;
        }
        return "C" + param1;
    }

    public MonsterInfoB(creatureID: int): void {
        let currentCreature: string = null;
        let damageShown: int = 0;
        let creatureStringID: string = HATCHERYPOPUP.ioMonsterId(creatureID);
        let creature: any = CREATURELOCKER._creatures[creatureStringID];
        ImageCache.GetImageWithCallBack("monsters/" + creatureStringID + "-portrait.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this.portrait1]);
        let speed: number = 0;
        let health: int = 0;
        let damage: int = 0;
        let cTime: int = 0;
        let cResource: int = 0;
        let cStorage: int = 0;
        for (currentCreature in CREATURELOCKER._creatures) {
            if (CREATURES.GetProperty(currentCreature, "speed") > speed) {
                speed = CREATURES.GetProperty(currentCreature, "speed");
            }
            if (CREATURES.GetProperty(currentCreature, "health") > health) {
                health = CREATURES.GetProperty(currentCreature, "health") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "damage") > damage) {
                damage = CREATURES.GetProperty(currentCreature, "damage") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "cTime") > cTime) {
                cTime = CREATURES.GetProperty(currentCreature, "cTime") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "cResource") > cResource) {
                cResource = CREATURES.GetProperty(currentCreature, "cResource") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "cStorage") > cStorage) {
                cStorage = CREATURES.GetProperty(currentCreature, "cStorage") | 0;
            }
        }
        damageShown = CREATURES.GetProperty(creatureStringID, "damage") | 0;
        TweenLite.to(this.mcMonsterInfo.bSpeed.mcBar, 0.4, { "width": 100 / speed * CREATURES.GetProperty(creatureStringID, "speed"), "ease": Circ.easeInOut, "delay": 0 });
        TweenLite.to(this.mcMonsterInfo.bHealth.mcBar, 0.4, { "width": 100 / health * CREATURES.GetProperty(creatureStringID, "health"), "ease": Circ.easeInOut, "delay": 0.05 });
        TweenLite.to(this.mcMonsterInfo.bDamage.mcBar, 0.4, { "width": 100 / damage * Math.abs(damageShown), "ease": Circ.easeInOut, "delay": 0.1 });
        TweenLite.to(this.mcMonsterInfo.bTime.mcBar, 0.4, { "width": 100 / cTime * CREATURES.GetProperty(creatureStringID, "cTime"), "ease": Circ.easeInOut, "delay": 0.15 });
        TweenLite.to(this.mcMonsterInfo.bResource.mcBar, 0.4, { "width": 100 / cResource * CREATURES.GetProperty(creatureStringID, "cResource"), "ease": Circ.easeInOut, "delay": 0.2 });
        TweenLite.to(this.mcMonsterInfo.bStorage.mcBar, 0.4, { "width": 100 / cStorage * CREATURES.GetProperty(creatureStringID, "cStorage"), "ease": Circ.easeInOut, "delay": 0.25 });
        this.mcMonsterInfo.tSpeed.htmlText = KEYS.Get("mon_statsspeed", { "v1": CREATURES.GetProperty(creatureStringID, "speed") });
        this.mcMonsterInfo.tHealth.htmlText = GLOBAL.FormatNumber(CREATURES.GetProperty(creatureStringID, "health"));
        if (damageShown > 0) {
            this.mcMonsterInfo.tDamage.htmlText = damageShown;
        } else {
            this.mcMonsterInfo.tDamage.htmlText = -damageShown + " (" + KEYS.Get("str_heal") + ")";
        }
        this.mcMonsterInfo.tResource.htmlText = KEYS.Get("mon_att_costvalue", { "v1": GLOBAL.FormatNumber(CREATURES.GetProperty(creatureStringID, "cResource")), "v2": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) });
        this.mcMonsterInfo.tStorage.htmlText = KEYS.Get("mon_att_housingvalue", { "v1": CREATURES.GetProperty(creatureStringID, "cStorage") });
        this.mcMonsterInfo.tTime.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(creatureStringID, "cTime") | 0, true);
        let level: int = 1;
        if (Boolean(GLOBAL.player.m_upgrades[creatureStringID]) && GLOBAL.player.m_upgrades[creatureStringID].level > 1) {
            level = GLOBAL.player.m_upgrades[creatureStringID].level | 0;
        }
        this.mcMonsterInfo.tDescription.htmlText = "<b>" + KEYS.Get("hatcherypopup_level", { "v1": level }) + " " + KEYS.Get(as3.str(creature.name)) + "</b><br>" + KEYS.Get(as3.str(creature.description));
        if (Boolean(CREATURELOCKER._lockerData[creatureStringID]) && CREATURELOCKER._lockerData[creatureStringID].t == 2) {
            this.mcMonsterInfo.mcLocked.visible = false;
        } else {
            this.mcMonsterInfo.mcLocked.tText.htmlText = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "incubator_unlockinlocker" : "hat_unlockinlocker", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[creatureStringID].name)), "v2": KEYS.Get(as3.str(GLOBAL._bHatchery._buildingProps.name)) });
            this.mcMonsterInfo.mcLocked.visible = true;
        }
        this.MonsterInfoShow();
    }

    public MonsterInfoShow(): void {
        this.mcMonsterInfo.visible = true;
    }

    public MonsterInfoHide(param1: MouseEvent = null): void {
        this.mcMonsterInfo.visible = false;
    }

    public QueueAdd(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            let _loc4_: any = undefined;
            let _loc5_: any = undefined;
            let _loc2_: any = HATCHERYPOPUP.ioMonsterId(n);
            let _loc3_: any = 1 + this._hatchery._lvl.Get();
            if (!BASE.Charge(4, CREATURES.GetProperty(as3.str(_loc2_), "cResource"), true)) {
                if (BASE.isInfernoMainYardOrOutpost) {
                    GLOBAL.Message("Not enough Magma.");
                } else {
                    GLOBAL.Message(KEYS.Get("hat_notenoughgoo"));
                }
                return;
            }
            if (Boolean(CREATURELOCKER._lockerData[_loc2_]) && CREATURELOCKER._lockerData[_loc2_].t == 2) {
                _loc4_ = this._hatchery._monsterQueue;
                _loc5_ = 0;
                while (_loc5_ < _loc4_.length) {
                    if (_loc4_[_loc5_][0] == _loc2_ && _loc4_[_loc5_][1] < 20) {
                        ++_loc4_[_loc5_][1];
                        this.Charge(as3.str(_loc2_));
                        this.RenderQueue();
                        return;
                    }
                    _loc5_++;
                }
                if (_loc4_.length > 0 && _loc4_[_loc4_.length - 1][0] == _loc2_) {
                    if (_loc4_[_loc4_.length - 1][1] < 20) {
                        ++_loc4_[_loc4_.length - 1][1];
                        this.Charge(as3.str(_loc2_));
                    } else if (_loc4_.length < _loc3_) {
                        _loc4_.push([_loc2_, 1]);
                        this.Charge(as3.str(_loc2_));
                    } else {
                        SOUNDS.Play("error1");
                    }
                } else {
                    if (_loc4_.length < _loc3_) {
                        _loc4_.push([_loc2_, 1]);
                        this.Charge(as3.str(_loc2_));
                    } else {
                        SOUNDS.Play("error1");
                    }
                    if (!this._hatchery._inProduction) {
                        this._hatchery.StartProduction();
                    }
                    if (!this._ioHolding) {
                        BASE.Save();
                    }
                }
                this.RenderQueue();
            }
        };
    }

    private Charge(param1: string): void {
        BASE.Charge(4, CREATURES.GetProperty(param1, "cResource"));
        ResourcePackages.Create(BASE.isInfernoMainYardOrOutpost ? 8 : 4, this._hatchery, CREATURES.GetProperty(param1, "cResource") | 0, true);
        if (!this._ioHolding) {
            BASE.Save();
        }
    }

    private ioHoldStart(n: int): Function {
        return (e: MouseEvent = null): void => {
            this.ioHoldStop();
            this._ioHoldN = n;
            this._ioHoldTick = 0;
            this._ioHolding = true;
            this.QueueAdd(n)();
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
            this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioHoldStop));
            if (this.stage) {
                this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioHoldStop));
            }
        };
    }

    /** Room for one more of this monster: an entry of it under 20, or a free entry. */
    private ioHasRoom(id: string): boolean {
        let q: any[] = this._hatchery._monsterQueue;
        for (let entry of as3.values(q)) {
            if (entry[0] == id && entry[1] < 20) {
                return true;
            }
        }
        return q.length < 1 + this._hatchery._lvl.Get();
    }

    private ioHoldTick(e: Event = null): void {
        this._ioHoldTick++;
        if (this._ioHoldTick < 12 || this._ioHoldTick % 2 != 0) {
            return;
        }
        let id: string = HATCHERYPOPUP.ioMonsterId(this._ioHoldN);
        if (!this.ioHasRoom(id) || !BASE.Charge(4, CREATURES.GetProperty(id, "cResource"), true)) {
            this.ioHoldStop();
            return;
        }
        this.QueueAdd(this._ioHoldN)();
    }

    private ioHoldStop(e: Event = null): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioHoldStop));
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioHoldStop));
        }
        if (this._ioHolding) {
            this._ioHolding = false;
            BASE.Save();
        }
    }

    public QueueRemove(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = undefined;
            let _loc3_: any = undefined;
            if (n > 0) {
                _loc3_ = this._hatchery._monsterQueue;
                if (_loc3_.length >= n) {
                    _loc2_ = _loc3_[n - 1][0];
                    --_loc3_[n - 1][1];
                    if (_loc3_[n - 1][1] <= 0) {
                        _loc3_.splice(n - 1, 1);
                    }
                    BASE.Fund(4, CREATURES.GetProperty(as3.str(_loc2_), "cResource"));
                    BASE.Save();
                } else {
                    SOUNDS.Play("error1");
                }
            } else if (this._hatchery._inProduction != "") {
                BASE.Fund(4, CREATURES.GetProperty(this._hatchery._inProduction, "cResource"));
                this._hatchery.StartProduction();
            }
            this.RenderQueue();
        };
    }

    public RenderQueue(): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc1_: int = (2 + this._hatchery._lvl.Get()) | 0;
        let _loc2_: any[] = this._hatchery._monsterQueue;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            ImageCache.GetImageWithCallBack("monsters/" + _loc2_[_loc3_][0] + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this["slot" + (_loc3_ + 1)]]);
            this["mcCount" + (_loc3_ + 1)].visible = true;
            this["mcCount" + (_loc3_ + 1)].tCounter.text = _loc2_[_loc3_][1];
            _loc3_++;
        }
        _loc3_ = _loc2_.length | 0;
        while (_loc3_ < _loc1_ - 1) {
            this["slot" + (_loc3_ + 1)].mcImage.visible = false;
            this["slot" + (_loc3_ + 1)].mcLoading.visible = false;
            this["mcCount" + (_loc3_ + 1)].visible = false;
            _loc3_++;
        }
        _loc3_ = (_loc1_ - 1) | 0;
        while (_loc3_ < 4) {
            this["slot" + (_loc3_ + 1)].tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_upgrade", { "v1": KEYS.Get(as3.str(GLOBAL._bHatchery._buildingProps.name)) }) + "</font>";
            this["slot" + (_loc3_ + 1)].mcImage.visible = false;
            this["slot" + (_loc3_ + 1)].mcLoading.visible = false;
            this["mcCount" + (_loc3_ + 1)].visible = false;
            _loc3_++;
        }
        if (this._hatchery._inProduction) {
            this.bFinish.gotoAndStop(2);
            this.bFinish.Enabled = true;
            ImageCache.GetImageWithCallBack("monsters/" + this._hatchery._inProduction + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this.slot0]);
            _loc4_ = CREATURES.GetProperty(this._hatchery._inProduction, "cTime") | 0;
            if ((_loc5_ = (100 / _loc4_ * this._hatchery._countdownProduce.Get()) | 0) < 0) {
                _loc5_ = 0;
            }
            this.bProgress.mcBar.width = 100 - _loc5_;
            if (this._hatchery._countdownProduce.Get() > 0) {
                this.tProgress.htmlText = "<b>" + GLOBAL.ToTime(this._hatchery._countdownProduce.Get() | 0, true) + "</b>";
            } else {
                this.tProgress.htmlText = "<b>" + KEYS.Get("hat_status_waiting") + "</b>";
            }
            this.bProgress.visible = true;
            this.tProgress.visible = true;
            if (TUTORIAL._currentStage < 200 || GLOBAL._hatcheryOverdrivePower.Get() == 10) {
                this.bSpeedup.gotoAndStop(1);
            } else {
                this.bSpeedup.gotoAndStop(2);
            }
        } else {
            this.bFinish.gotoAndStop(1);
            this.bFinish.Enabled = false;
            this.slot0.mcImage.visible = false;
            this.slot0.mcLoading.visible = false;
            this.bProgress.visible = false;
            this.tProgress.visible = false;
            this.bSpeedup.gotoAndStop(1);
        }
    }

    public Setup(param1: BUILDING13): void {
        this._hatchery = param1;
        let _loc2_: int = (2 + this._hatchery._lvl.Get()) | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            this["slot" + _loc3_].addEventListener(MouseEvent.MOUSE_DOWN, this.QueueRemove(_loc3_));
            this["slot" + _loc3_].addEventListener(MouseEvent.MOUSE_OVER, this.ShowRemove(as3.cast(this["mcRemove" + _loc3_], MovieClip)));
            this["slot" + _loc3_].addEventListener(MouseEvent.MOUSE_OUT, this.HideRemove(as3.cast(this["mcRemove" + _loc3_], MovieClip)));
            this["slot" + _loc3_].buttonMode = true;
            _loc3_++;
        }
        _loc3_ = _loc2_;
        while (_loc3_ < 5) {
            this["slot" + _loc3_].gotoAndStop(1);
            _loc3_++;
        }
        _loc3_ = 0;
        while (_loc3_ < 5) {
            this["mcRemove" + _loc3_].visible = false;
            this["mcRemove" + _loc3_].mouseEnabled = false;
            _loc3_++;
        }
        this.MonsterInfoHide();
        this.Update();
    }

    public ShowRemove(param1: MovieClip): Function {
        let n: MovieClip = null;
        n = param1;
        return (param1: MouseEvent): void => {
            n.visible = true;
        };
    }

    public HideRemove(param1: MovieClip): Function {
        let n: MovieClip = null;
        n = param1;
        return (param1: MouseEvent): void => {
            n.visible = false;
        };
    }

    public Update(): void {
        let _loc4_: boolean = false;
        let _loc5_: any[] = null;
        this.RenderQueue();
        let _loc1_: any[] = this._hatchery._monsterQueue;
        let _loc2_: any[] = [];
        let _loc3_: int = (1 + this._hatchery._lvl.Get()) | 0;
        if (_loc1_.length == 0 && !this._hatchery._inProduction) {
            _loc2_ = [1, "<font color=\"#CC0000\"><b>" + KEYS.Get("hat_nothinginproduction") + "</b></font> " + KEYS.Get("hat_producing_message")];
        } else if (this._hatchery._canFunction) {
            if (this._hatchery._productionStage.Get() == 2 && this._hatchery._inProduction && !HOUSING.HousingStore(this._hatchery._inProduction, new Point(this._hatchery._mc.x, this._hatchery._mc.y), true)) {
                _loc2_ = [2, KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "incubator_needhousing" : "hat_needhousing")];
            } else {
                _loc2_ = [1, "<b>" + KEYS.Get("hat_producing_monsters", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[this._hatchery._inProduction].name)) }) + "</b>"];
                _loc4_ = true;
                if (_loc1_.length < _loc3_) {
                    _loc4_ = false;
                } else {
                    for (_loc5_ of as3.values(_loc1_)) {
                        if (_loc5_[1] < 20) {
                            _loc4_ = false;
                        }
                    }
                }
                if (!_loc4_) {
                    _loc2_[1] += " " + KEYS.Get("hat_producing_message");
                } else {
                    _loc2_[1] += " " + KEYS.Get("hat_queuefull");
                }
            }
        } else {
            _loc2_ = [2, KEYS.Get("hat_damaged")];
        }
        if (_loc2_[0] == 1) {
            this.mcMessage.gotoAndStop(1);
        } else {
            this.mcMessage.gotoAndStop(2);
        }
        this.mcMessage.tA.htmlText = _loc2_[1];
        if (GLOBAL._hatcheryOverdrive > 0) {
            this.mcOverdrive.t.htmlText = "<b>" + KEYS.Get("hat_xoverdrive", { "v1": GLOBAL._hatcheryOverdrivePower.Get(), "v2": GLOBAL.ToTime(GLOBAL._hatcheryOverdrive) }) + "</b>";
            this.mcOverdrive.visible = true;
        } else {
            this.mcOverdrive.visible = false;
        }
        this._scrollSet.Update();
    }

    public Help(param1: MouseEvent = null): void {
        let _loc2_: int = 4;
        this._guidePage += 1;
        if (this._guidePage > _loc2_) {
            this._guidePage = 1;
        }
        this.gotoAndStop(this._guidePage);
        if (this._guidePage > 1) {
            this.txtGuide.htmlText = KEYS.Get("hcc_tut_" + (this._guidePage - 1));
            if (this._guidePage == 2) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        }
    }

    private FinishNow(param1: MouseEvent): void {
        let _loc2_: any[] = null;
        let _loc3_: string = null;
        let _loc4_: any = null;
        let _loc5_: string = null;
        if (!this.bFinish.Enabled) {
            return;
        }
        if (Boolean(this._hatchery) && this._hatchery._finishCost.Get() > 0) {
            if (BASE._credits.Get() >= this._hatchery._finishCost.Get()) {
                _loc2_ = [];
                _loc4_ = this._hatchery._finishQueue;
                for (_loc5_ in _loc4_) {
                    if (_loc4_[_loc5_] > 0) {
                        _loc3_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc5_].name));
                        _loc2_.push([_loc4_[_loc5_], _loc3_]);
                    }
                }
                GLOBAL.Array2String(_loc2_);
                if (this._hatchery._finishAll) {
                    GLOBAL.Message(KEYS.Get("msg_finishqueue", { "v1": GLOBAL.Array2String(_loc2_), "v2": this._hatchery._finishCost.Get() }), KEYS.Get("str_finishnow"), as3.bind(this, this.DoFinish));
                } else {
                    GLOBAL.Message(KEYS.Get("msg_fillhousing", { "v1": GLOBAL.Array2String(_loc2_), "v2": this._hatchery._finishCost.Get() }), KEYS.Get("str_finishnow"), as3.bind(this, this.DoFinish));
                }
            } else {
                POPUPS.DisplayGetShiny(param1);
            }
        } else if (this._hatchery._finishCost.Get() <= 0) {
            GLOBAL.Message(KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "msg_compoundfull" : "msg_housingfull"));
        }
    }

    private DoFinish(): void {
        this._hatchery.FinishNow();
    }

    public Hide(param1: MouseEvent = null): void {
        HATCHERY.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
