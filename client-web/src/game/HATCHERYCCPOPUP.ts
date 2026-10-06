import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BRESOURCE, BUILDING13, CREATURELOCKER, CREATURES, Circ, GLOBAL, HATCHERYCC, HATCHERYCCPOPUP_CLIP, HOUSING, HatcheryCCMonsterIcon_CLIP, ImageCache, InstanceManager, IoLockIcon, KEYS, POPUPS, POPUPSETTINGS, ResourcePackages, SOUNDS, STORE, ScrollSet, SubscriptionHandler, TweenLite, frame } from "@game";

export class HATCHERYCCPOPUP extends HATCHERYCCPOPUP_CLIP {
    static {
        as3.fields(this, { _tick: 0, _monsterID: "", _monsterIndex: 0, _scrollSet: null, _scrollSetContainer: null, _monsterSlots: null, _guidePage: 1, _ioArrows: null });
    }

    /** Inferno-only: the monster list's columns (the art has room for five). */
    private static readonly IO_COLUMNS: int = 4;

    /** One column: an icon (66) and the gap (5). */
    private static readonly IO_COLUMN: int = 71;
    private _tick: int;
    private _monsterID: string;
    private _monsterIndex: int;
    private _scrollSet: ScrollSet;
    private _scrollSetContainer: Sprite;
    public _monsterSlots: any[];
    public _guidePage: int;
    // ---- Inferno-only (3 October): a small left and right arrow under each queued monster moves it one
    // place earlier or later in the queue (the first is made first).
    private _ioArrows: any[];

    public $ctor(): void {
        this._ioArrows = [];
        let _loc1_: string = null;
        let _loc5_: int = 0;
        let _loc7_: any[] = null;
        let _loc9_: int = 0;
        let _loc10_: MovieClip = null;
        let _loc11_: MovieClip = null;
        let _loc12_: MovieClip = null;
        super.$ctor();
        this.setupSubscriptions(HATCHERYCC.queueLimit > HATCHERYCC.DEFAULT_QUEUE_LIMIT);
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
        this.bTopup.tName.htmlText = "<b>" + KEYS.Get("btn_topup2") + "</b>";
        this.bTopup.mouseChildren = false;
        if (!BASE.isInfernoMainYardOrOutpost) {
            this.bTopup.addEventListener(MouseEvent.CLICK, STORE.Show(2, 4, ["BR41", "BR42", "BR43"]));
        } else {
            this.bTopup.addEventListener(MouseEvent.CLICK, STORE.Show(2, 4, ["BR41I", "BR42I", "BR43I"]));
        }
        this.bTopup.buttonMode = true;
        if (GLOBAL.INFERNO_ONLY) {
            this.ioNarrowList();
        }
        this._scrollSet = new ScrollSet();
        this._scrollSet.x = this.scroller.x;
        this._scrollSet.y = this.scroller.y;
        this._scrollSet.width = this.scroller.width;
        this._scrollSet.Init(this.monsterCanvas, this.monsterMask, ScrollSet.BROWN, this.monsterMask.y, this.monsterMask.height, 20, 10);
        this._scrollSet.AutoHideEnabled = false;
        this._scrollSet.isHiddenWhileUnnecessary = true;
        this._scrollSetContainer = new Sprite();
        this._scrollSetContainer.addChild(this._scrollSet);
        this.addChild(this._scrollSetContainer);
        this.scroller.visible = false;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: Point = new Point(10, 14);
        _loc5_ = GLOBAL.INFERNO_ONLY ? HATCHERYCCPOPUP.IO_COLUMNS : 5;
        let _loc6_: int = 5;
        this._monsterSlots = [];
        _loc7_ = CREATURELOCKER.GetSortedCreatures(true);
        let _loc8_: int = !BASE.isInfernoMainYardOrOutpost ? CREATURELOCKER.maxCreatures("above") : CREATURELOCKER.maxCreatures("inferno");
        if (!BASE.isInfernoMainYardOrOutpost && HATCHERYCC.doesShowInfernoCreeps) {
            _loc8_ = CREATURELOCKER.maxCreatures();
        }
        _loc9_ = 0;
        while (_loc9_ < _loc7_.length) {
            _loc1_ = String(_loc7_[_loc9_].id);
            if (CREATURELOCKER._creatures && CREATURELOCKER._creatures[_loc1_] && CREATURELOCKER._creatures[_loc1_].blocked == true) {
                _loc3_++;
            } else {
                (_loc10_ = new HatcheryCCMonsterIcon_CLIP()).id = _loc1_;
                _loc10_.x = _loc4_.x + _loc2_ % _loc5_ * (_loc10_.mcMonster.width + _loc6_);
                _loc10_.y = _loc4_.y + Math.floor(_loc2_ / _loc5_) * (_loc10_.mcMonster.height + _loc6_);
                (_loc11_ = as3.cast(_loc10_.mcMonster, MovieClip)).addEventListener(MouseEvent.MOUSE_OVER, this.MonsterInfo(as3.str(_loc7_[_loc9_].id)));
                this.monsterCanvas.addChild(_loc10_);
                this._monsterSlots.push(_loc10_);
                _loc11_.addEventListener(MouseEvent.MOUSE_OVER, this.MonsterInfo(as3.str(_loc7_[_loc9_].id)));
                _loc11_.addEventListener(MouseEvent.MOUSE_DOWN, this.QueueAdd(as3.str(_loc7_[_loc9_].id)));
                _loc11_.buttonMode = true;
                ImageCache.GetImageWithCallBack("monsters/" + _loc1_ + "-medium.jpg", as3.bind(this, this.MonsterIconLoaded), true, 1, "", [_loc11_]);
                _loc12_ = as3.cast(_loc10_.mcLevel, MovieClip);
                if (Boolean(GLOBAL.player.m_upgrades[_loc1_]) && GLOBAL.player.m_upgrades[_loc1_].level > 1) {
                    _loc12_.visible = true;
                    _loc12_.tLevel.htmlText = "<b>" + GLOBAL.player.m_upgrades[_loc1_].level + "</b>";
                } else {
                    _loc12_.visible = false;
                }
                if (!(Boolean(CREATURELOCKER._lockerData[_loc1_]) && CREATURELOCKER._lockerData[_loc1_].t == 2)) {
                    _loc11_.alpha = 0.75;
                    _loc12_.visible = false;
                    if (GLOBAL.INFERNO_ONLY) {
                        IoLockIcon.mark(_loc11_, true);
                    }
                }
                _loc2_++;
            }
            _loc9_++;
        }
        _loc9_ = 1;
        while (_loc9_ <= 5) {
            this["hatchery" + _loc9_].gotoAndStop("idle");
            this["hatcheryRemove" + _loc9_].visible = false;
            this["hatchery" + _loc9_].addEventListener(MouseEvent.MOUSE_OVER, this.ShowRemove(as3.cast(this["hatcheryRemove" + _loc9_], MovieClip)));
            this["hatchery" + _loc9_].addEventListener(MouseEvent.MOUSE_OUT, this.HideRemove(as3.cast(this["hatcheryRemove" + _loc9_], MovieClip)));
            this["hatchery" + _loc9_].addEventListener(MouseEvent.MOUSE_DOWN, this.StopProduction(_loc9_));
            this["hatchery" + _loc9_].buttonMode = true;
            _loc9_++;
        }
        this.title_txt.htmlText = KEYS.Get("hcc_title");
        this.mcMonsterInfo.speed_txt.htmlText = "<b>" + KEYS.Get("mon_att_speed") + "</b>";
        this.mcMonsterInfo.health_txt.htmlText = "<b>" + KEYS.Get("mon_att_health") + "</b>";
        this.mcMonsterInfo.damage_txt.htmlText = "<b>" + KEYS.Get("mon_att_damage") + "</b>";
        this.mcMonsterInfo.goo_txt.htmlText = "<b>" + KEYS.Get("mon_att_cost", { "v1": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) }) + "</b>";
        this.mcMonsterInfo.housing_txt.htmlText = "<b>" + KEYS.Get("mon_att_housing") + "</b>";
        this.mcMonsterInfo.time_txt.htmlText = "<b>" + KEYS.Get("mon_att_time") + "</b>";
        this.hatlabel1_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", { "v1": 1 }) + "</b>";
        this.hatlabel2_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", { "v1": 2 }) + "</b>";
        this.hatlabel3_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", { "v1": 3 }) + "</b>";
        this.hatlabel4_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", { "v1": 4 }) + "</b>";
        this.hatlabel5_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", { "v1": 5 }) + "</b>";
        this.tHousingLabel.htmlText = "<b>" + KEYS.Get("hcc_housingspace") + "</b>";
        this.tGooLabel.htmlText = "<b>" + KEYS.Get("hcc_goousage") + "</b>";
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ClearEvents));
        (as3.as(this.mcFrame, frame)).Setup(true, null);
    }

    /**
     * Inferno-only (the user's, 29 September): the monster list four across instead of five, and the stats and
     * the description moved left into the room that frees, the description a column wider, so it is no longer
     * cut off. The art's divider between list and stats is painted over and drawn again at the new edge.
     */
    private ioNarrowList(): void {
        let cut: int = ((5 - HATCHERYCCPOPUP.IO_COLUMNS) * HATCHERYCCPOPUP.IO_COLUMN) | 0;
        let oldEdge: number = this.monsterMask.x + this.monsterMask.width;
        this.monsterMask.width -= cut;
        this.scroller.x -= cut;
        let edge: number = oldEdge - cut;
        let paint: Shape = new Shape();
        paint.graphics.beginFill(14931914);
        paint.graphics.drawRect(edge, this.monsterMask.y, cut + 4, this.monsterMask.height + 2);
        paint.graphics.endFill();
        paint.graphics.lineStyle(1, 11643035);
        paint.graphics.moveTo(edge, this.monsterMask.y);
        paint.graphics.lineTo(edge, this.monsterMask.y + this.monsterMask.height + 1);
        this.addChildAt(paint, this.getChildIndex(this.monsterMask));
        this.mcMonsterInfo.x -= cut;
        this.mcMonsterInfo.tDescription.width += cut;
    }

    protected setupSubscriptions(param1: boolean): void {
        if (param1) {
            this.gotoAndStop("v1");
            this.mcSlotsGoldFrame.visible = true;
            this.mcSlotsGoldFrame.mouseEnabled = false;
            if (HATCHERYCC.doesShowInfernoCreeps) {
                this.gotoAndStop("v2");
                this.tMagmaLabel.htmlText = "<b>" + KEYS.Get("hcc_magmausage") + "</b>";
                this.bTopupMagma.tName.htmlText = "<b>" + KEYS.Get("btn_topup2") + "</b>";
                this.bTopupMagma.buttonMode = true;
                this.bTopupMagma.gotoAndStop(1);
                this.bTopupMagma.addEventListener(MouseEvent.CLICK, STORE.Show(2, 4, ["BR41I", "BR42I", "BR43I"]));
            }
        } else {
            this.gotoAndStop("v1");
            this.mcSlotsGoldFrame.visible = false;
        }
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        if (GLOBAL.INFERNO_ONLY) {
            // (Inferno-only: the picture before is taken away; they piled up at every redraw)
            while (this[param3[0] + param3[1]].mcImage.numChildren > 0) {
                this[param3[0] + param3[1]].mcImage.removeChildAt(0);
            }
        }
        this[param3[0] + param3[1]].mcImage.addChild(_loc4_);
        this[param3[0] + param3[1]].mcImage.visible = true;
        this[param3[0] + param3[1]].mcLoading.visible = false;
    }

    public MonsterIconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcImage.visible = true;
        param3[0].mcLoading.visible = false;
    }

    public MonsterInfo(param1: string): Function {
        let n: string = null;
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
     * Added 'v2' variables to display magma/goo depending on monster type
     * Updated speed variable to a Number type to be able to handle floting point values
     *
     * @param {String} creatureID - the current creature's ID passed to MonsterInfoB
     */
    public MonsterInfoB(creatureID: string): void {
        let currentCreature: string = null;
        let damageShown: int = 0;
        let creature: any = CREATURELOCKER._creatures[creatureID];
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
        damageShown = CREATURES.GetProperty(creatureID, "damage") | 0;
        TweenLite.to(this.mcMonsterInfo.bSpeed.mcBar, 0.4, { "width": 100 / speed * CREATURES.GetProperty(creatureID, "speed"), "ease": Circ.easeInOut, "delay": 0 });
        TweenLite.to(this.mcMonsterInfo.bHealth.mcBar, 0.4, { "width": 100 / health * CREATURES.GetProperty(creatureID, "health"), "ease": Circ.easeInOut, "delay": 0.05 });
        TweenLite.to(this.mcMonsterInfo.bDamage.mcBar, 0.4, { "width": 100 / damage * Math.abs(damageShown), "ease": Circ.easeInOut, "delay": 0.1 });
        TweenLite.to(this.mcMonsterInfo.bResource.mcBar, 0.4, { "width": 100 / cResource * CREATURES.GetProperty(creatureID, "cResource"), "ease": Circ.easeInOut, "delay": 0.15 });
        TweenLite.to(this.mcMonsterInfo.bStorage.mcBar, 0.4, { "width": 100 / cStorage * CREATURES.GetProperty(creatureID, "cStorage"), "ease": Circ.easeInOut, "delay": 0.2 });
        TweenLite.to(this.mcMonsterInfo.bTime.mcBar, 0.4, { "width": 100 / cTime * CREATURES.GetProperty(creatureID, "cTime"), "ease": Circ.easeInOut, "delay": 0.25 });
        this.mcMonsterInfo.tSpeed.htmlText = KEYS.Get("mon_statsspeed", { "v1": CREATURES.GetProperty(creatureID, "speed") });
        this.mcMonsterInfo.tHealth.htmlText = GLOBAL.FormatNumber(CREATURES.GetProperty(creatureID, "health"));
        if (damageShown > 0) {
            this.mcMonsterInfo.tDamage.htmlText = damageShown;
        } else {
            this.mcMonsterInfo.tDamage.htmlText = -damageShown + " (" + KEYS.Get("str_heal") + ")";
        }
        let v2: string = (creature.id.charAt(0) == "I") ? KEYS.Get(BRESOURCE.GetResourceNameKey(7)) : KEYS.Get(BRESOURCE.GetResourceNameKey(3));
        this.mcMonsterInfo.tResource.htmlText = KEYS.Get("mon_att_costvalue", { "v1": GLOBAL.FormatNumber(CREATURES.GetProperty(creatureID, "cResource")), "v2": v2 });
        this.mcMonsterInfo.tStorage.htmlText = KEYS.Get("mon_att_housingvalue", { "v1": CREATURES.GetProperty(creatureID, "cStorage") });
        this.mcMonsterInfo.tTime.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(creatureID, "cTime") | 0, true);
        let level: int = 1;
        if (Boolean(GLOBAL.player.m_upgrades[creatureID]) && GLOBAL.player.m_upgrades[creatureID].level > 1) {
            level = GLOBAL.player.m_upgrades[creatureID].level | 0;
        }
        this.mcMonsterInfo.tDescription.htmlText = "<b>" + KEYS.Get("hatcherypopup_level", { "v1": level }) + " " + KEYS.Get(as3.str(creature.name)) + "</b><br>" + KEYS.Get(as3.str(creature.description));
        if (Boolean(CREATURELOCKER._lockerData[creatureID]) && CREATURELOCKER._lockerData[creatureID].t == 2) {
            this.mcMonsterInfo.mcLocked.visible = false;
        } else {
            this.mcMonsterInfo.mcLocked.tText.htmlText = "<b>" + KEYS.Get("hat_unlockinlocker", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[creatureID].name)) }) + "</b>";
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

    public QueueAdd(param1: string): Function {
        let targetID: string = null;
        targetID = param1;
        return (param1: MouseEvent = null): void => {
            if (!SubscriptionHandler.instance.isSubscriptionActive && SubscriptionHandler.isEnabledForAll && BASE.isInfernoCreep(targetID)) {
                SubscriptionHandler.instance.showPromoPopup();
                return;
            }
            this._tick = 0;
            this._monsterID = targetID;
            this.QueueAddTick();
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.QueueAddTick));
        };
    }

    private QueueAddTick(param1: Event = null): void {
        let _loc4_: any[] = null;
        this._tick += 1;
        if (this._tick < HATCHERYCC.queueLimit && this._tick != 1) {
            return;
        }
        let _loc2_: string = this._monsterID;
        let _loc3_: int = 7;
        if (!BASE.Charge(4, CREATURES.GetProperty(_loc2_, "cResource"), true, BASE.isInfernoCreep(_loc2_))) {
            return;
        }
        if (Boolean(CREATURELOCKER._lockerData[_loc2_]) && CREATURELOCKER._lockerData[_loc2_].t == 2) {
            if ((_loc4_ = GLOBAL._bHatcheryCC._monsterQueue).length > 0 && _loc4_[_loc4_.length - 1][0] == _loc2_) {
                if (_loc4_[_loc4_.length - 1][1] < HATCHERYCC.queueLimit) {
                    ++_loc4_[_loc4_.length - 1][1];
                    this.Charge(_loc2_);
                } else if (_loc4_.length < _loc3_) {
                    _loc4_.push([_loc2_, 1]);
                    this.Charge(_loc2_);
                } else {
                    SOUNDS.Play("error1");
                }
            } else if (_loc4_.length < _loc3_) {
                _loc4_.push([_loc2_, 1]);
                this.Charge(_loc2_);
            } else {
                SOUNDS.Play("error1");
            }
            this.Update();
            GLOBAL._bHatcheryCC.Tick(1);
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
        if (Boolean(GLOBAL._bHatcheryCC) && GLOBAL._bHatcheryCC._finishCost.Get() > 0) {
            if (BASE._credits.Get() >= GLOBAL._bHatcheryCC._finishCost.Get()) {
                _loc2_ = [];
                _loc4_ = GLOBAL._bHatcheryCC._finishQueue;
                for (_loc5_ in _loc4_) {
                    if (_loc4_[_loc5_] > 0) {
                        _loc3_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc5_].name));
                        _loc2_.push([_loc4_[_loc5_], _loc3_]);
                    }
                }
                GLOBAL.Array2String(_loc2_);
                if (GLOBAL._bHatcheryCC._finishAll) {
                    GLOBAL.Message(KEYS.Get("msg_finishqueue", { "v1": GLOBAL.Array2String(_loc2_), "v2": GLOBAL._bHatcheryCC._finishCost.Get() }), KEYS.Get("str_finishnow"), as3.bind(this, this.DoFinish));
                } else {
                    GLOBAL.Message(KEYS.Get("msg_fillhousing", { "v1": GLOBAL.Array2String(_loc2_), "v2": GLOBAL._bHatcheryCC._finishCost.Get() }), KEYS.Get("str_finishnow"), as3.bind(this, this.DoFinish));
                }
            } else {
                POPUPS.DisplayGetShiny(param1);
            }
        } else if (GLOBAL._bHatcheryCC._finishCost.Get() <= 0) {
            GLOBAL.Message(KEYS.Get("msg_housingfull"));
        }
    }

    private DoFinish(): void {
        GLOBAL._bHatcheryCC.FinishNow();
    }

    private Charge(param1: string): void {
        let _loc2_: boolean = BASE.isInfernoCreep(param1);
        BASE.Charge(4, CREATURES.GetProperty(param1, "cResource"), false, _loc2_);
        ResourcePackages.Create(_loc2_ ? 8 : 4, GLOBAL._bHatcheryCC, CREATURES.GetProperty(param1, "cResource") | 0, true);
        BASE.Save();
    }

    public QueueRemove(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            this._tick = 0;
            this._monsterIndex = n;
            this.QueueRemoveTick();
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.QueueRemoveTick));
        };
    }

    private QueueRemoveTick(param1: Event = null): void {
        this._tick += 1;
        if (this._tick < HATCHERYCC.queueLimit && this._tick != 1) {
            return;
        }
        let _loc2_: any[] = GLOBAL._bHatcheryCC._monsterQueue;
        if (_loc2_.length >= this._monsterIndex) {
            BASE.Fund(4, CREATURES.GetProperty(as3.str(_loc2_[this._monsterIndex - 1][0]), "cResource"), false, null, BASE.isInfernoCreep(as3.str(_loc2_[this._monsterIndex - 1][0])));
            --_loc2_[this._monsterIndex - 1][1];
            if (_loc2_[this._monsterIndex - 1][1] <= 0) {
                _loc2_.splice(this._monsterIndex - 1, 1);
            }
            BASE.Save();
        } else {
            SOUNDS.Play("error1");
        }
        this.Update();
    }

    private ClearEvents(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.QueueAddTick));
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.QueueRemoveTick));
    }

    public StopProduction(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            let _loc4_: any = undefined;
            let _loc2_: any = 1;
            let _loc3_: any = InstanceManager.getInstancesByClass(BUILDING13);
            for (_loc4_ of as3.values(_loc3_)) {
                if (_loc4_._inProduction != "" && _loc2_ == n) {
                    BASE.Fund(4, CREATURES.GetProperty(as3.str(_loc4_._inProduction), "cResource"), false, null, BASE.isInfernoCreep(as3.str(_loc4_._inProduction)));
                    _loc4_._inProduction = "";
                    _loc4_.ResetProduction();
                }
                _loc2_++;
            }
            this.Update();
        };
    }

    public RenderQueue(): void {
        let _loc9_: BUILDING13 = null;
        let _loc10_: int = 0;
        let _loc1_: int = 7;
        let _loc2_: any[] = GLOBAL._bHatcheryCC._monsterQueue;
        let _loc3_: int = 1;
        while (_loc3_ <= _loc1_) {
            this["slot" + _loc3_].mcImage.visible = false;
            this["slot" + _loc3_].mcLoading.visible = false;
            this["mcCount" + _loc3_].visible = false;
            _loc3_++;
        }
        _loc3_ = 1;
        while (_loc3_ <= _loc2_.length) {
            this["slot" + _loc3_].mcImage.visible = false;
            this["slot" + _loc3_].mcLoading.visible = true;
            ImageCache.GetImageWithCallBack("monsters/" + _loc2_[_loc3_ - 1][0] + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", ["slot", _loc3_]);
            this["mcCount" + _loc3_].visible = true;
            this["mcCount" + _loc3_].tCounter.text = _loc2_[_loc3_ - 1][1];
            _loc3_++;
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioDrawArrows(_loc2_.length);
        }
        HOUSING.HousingSpace();
        let _loc4_: int = 0;
        let _loc5_: int = (100 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get()) | 0;
        this.mcStorage.mcBar.width = 535 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get();
        let _loc6_: any = "<b>" + GLOBAL.FormatNumber(HOUSING._housingUsed.Get()) + " / " + GLOBAL.FormatNumber(HOUSING._housingCapacity.Get()) + "</b>";
        let _loc7_: int = 0;
        let _loc8_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING13);
        for (_loc9_ of (_loc8_ ?? [])) {
            if (_loc9_._inProduction) {
                _loc7_ = (_loc7_ + CREATURES.GetProperty(_loc9_._inProduction, "cStorage")) | 0;
            }
        }
        _loc10_ = 0;
        while (_loc10_ < _loc2_.length) {
            _loc7_ = (_loc7_ + CREATURES.GetProperty(as3.str(_loc2_[_loc10_][0]), "cStorage") * _loc2_[_loc10_][1]) | 0;
            _loc10_++;
        }
        if (_loc7_ > 0) {
            this.bFinish.Enabled = true;
            if (HATCHERYCC.doesShowInfernoCreeps) {
                this.bFinish.gotoAndStop(3);
            } else {
                this.bFinish.gotoAndStop(2);
            }
        } else {
            this.bFinish.Enabled = false;
            this.bFinish.gotoAndStop(1);
        }
        if (HATCHERYCC.doesShowInfernoCreeps) {
            _loc6_ += "   ";
        } else {
            _loc6_ += "<br>";
        }
        if (_loc7_ > 0 && GLOBAL._hatcheryOverdrivePower.Get() < 10) {
            this.bSpeedup.gotoAndStop(2);
            _loc6_ += "<font size=\"9\">" + KEYS.Get("hcc_queuedup", { "v1": GLOBAL.FormatNumber(HOUSING._housingUsed.Get() + _loc7_) });
            if (HOUSING._housingUsed.Get() + _loc7_ == HOUSING._housingCapacity.Get()) {
                _loc6_ += " " + KEYS.Get("hcc_queuedfull");
            }
            if (HOUSING._housingUsed.Get() + _loc7_ > HOUSING._housingCapacity.Get()) {
                _loc6_ += " " + KEYS.Get("hcc_queuedover");
            }
        } else {
            this.bSpeedup.gotoAndStop(1);
            _loc6_ += "<font size=\"9\">" + KEYS.Get("hcc_queuedup", { "v1": GLOBAL.FormatNumber(HOUSING._housingUsed.Get() + _loc7_) });
            if (HOUSING._housingUsed.Get() + _loc7_ == HOUSING._housingCapacity.Get()) {
                _loc6_ += " " + KEYS.Get("hcc_queuedfull");
            }
            if (HOUSING._housingUsed.Get() + _loc7_ > HOUSING._housingCapacity.Get()) {
                _loc6_ += " " + KEYS.Get("hcc_queuedover");
            }
        }
        if ((_loc5_ = (535 / HOUSING._housingCapacity.Get() * (HOUSING._housingUsed.Get() + _loc7_)) | 0) > 535) {
            _loc5_ = 535;
        }
        this.mcStorage.mcBarB.width = _loc5_;
        this.txtStorage.htmlText = as3.str(_loc6_);
        let _loc11_: int = BASE._resources.r4.Get() | 0;
        _loc10_ = 0;
        while (_loc10_ < _loc2_.length) {
            _loc11_ = (_loc11_ - CREATURES.GetProperty(as3.str(_loc2_[_loc10_][0]), "cResource") * _loc2_[_loc10_][1]) | 0;
            _loc10_++;
        }
        this.mcGoo.mcBarB.width = 1;
        if ((_loc5_ = (100 / BASE._resources.r4max * BASE._resources.r4.Get()) | 0) > 100) {
            _loc5_ = 100;
        }
        this.mcGoo.mcBar.width = _loc5_;
        this.txtGoo.htmlText = "<b>" + KEYS.Get("hat_gooremaining", { "v1": GLOBAL.FormatNumber(Number(BASE._resources.r4.Get())) }) + "</b>";
        GLOBAL.ioFitText(this.txtGoo);
        // (Inferno-only: "remaining" wrapped out of sight)
        this.bTopup.gotoAndStop(1);
        if (BASE._resources.r4.Get() < BASE._resources.r4max * 0.1) {
            this.bTopup.gotoAndStop(2);
        }
        if (HATCHERYCC.doesShowInfernoCreeps) {
            _loc11_ = BASE._iresources.r4.Get() | 0;
            _loc10_ = 0;
            while (_loc10_ < _loc2_.length) {
                _loc11_ = (_loc11_ - CREATURES.GetProperty(as3.str(_loc2_[_loc10_][0]), "cResource") * _loc2_[_loc10_][1]) | 0;
                _loc10_++;
            }
            this.mcMagma.mcBarB.width = 1;
            if ((_loc5_ = (100 / BASE._iresources.r4max * BASE._iresources.r4.Get()) | 0) > 100) {
                _loc5_ = 100;
            }
            this.mcMagma.mcBar.width = _loc5_;
            this.txtMagma.htmlText = "<b>" + KEYS.Get("hat_magmaremaining", { "v1": GLOBAL.FormatNumber(Number(BASE._iresources.r4.Get())) }) + "</b>";
            this.bTopupMagma.gotoAndStop(1);
            if (BASE._iresources.r4.Get() < BASE._iresources.r4max * 0.1) {
                this.bTopupMagma.gotoAndStop(2);
            }
        }
    }

    private ioArrow(left: boolean, onClick: Function): Sprite {
        let a: Sprite = new Sprite();
        a.name = left ? "ioQueueLeft" : "ioQueueRight";
        a.buttonMode = true;
        let g: Graphics = a.graphics;
        g.lineStyle(1, 5913104, 1);
        g.beginFill(16765034, 1);
        g.drawRoundRect(-8, -7, 16, 14, 6, 6);
        g.endFill();
        g.lineStyle(0, 0, 0);
        g.beginFill(4860424, 1);
        if (left) {
            g.moveTo(3, -4);
            g.lineTo(3, 4);
            g.lineTo(-4, 0);
        } else {
            g.moveTo(-3, -4);
            g.lineTo(-3, 4);
            g.lineTo(4, 0);
        }
        g.endFill();
        a.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            onClick();
        });
        return a;
    }

    private ioMove(from: int, to: int): Function {
        return (): void => {
            let q: any[] = GLOBAL._bHatcheryCC._monsterQueue;
            if (from < 0 || to < 0 || from >= q.length || to >= q.length) {
                return;
            }
            let t: any[] = as3.cast(q[from], Array);
            q[from] = q[to];
            q[to] = t;
            BASE.Save();
            this.Update();
        };
    }

    private ioDrawArrows(n: int): void {
        for (let old of as3.values(this._ioArrows)) {
            if (old.parent) {
                old.parent.removeChild(old);
            }
        }
        this._ioArrows = [];
        for (let i: int = 1; i <= n; i++) {
            let slot: MovieClip = as3.cast(this["slot" + i], MovieClip);
            if (!slot) {
                continue;
            }
            let cx: number = slot.x + slot.width / 2;
            let by: number = slot.y + slot.height + 7;
            if (i > 1) {
                let l: Sprite = this.ioArrow(true, this.ioMove((i - 1) | 0, (i - 2) | 0));
                l.x = cx - 10;
                l.y = by;
                this.addChild(l);
                this._ioArrows.push(l);
            }
            if (i < n) {
                let r: Sprite = this.ioArrow(false, this.ioMove((i - 1) | 0, i));
                r.x = cx + 10;
                r.y = by;
                this.addChild(r);
                this._ioArrows.push(r);
            }
        }
    }

    public Setup(): void {
        let _loc1_: int = 7;
        let _loc2_: int = 1;
        while (_loc2_ <= _loc1_) {
            this["slot" + _loc2_].addEventListener(MouseEvent.MOUSE_DOWN, this.QueueRemove(_loc2_));
            this["slot" + _loc2_].addEventListener(MouseEvent.MOUSE_OVER, this.ShowRemove(as3.cast(this["mcRemove" + _loc2_], MovieClip)));
            this["slot" + _loc2_].addEventListener(MouseEvent.MOUSE_OUT, this.HideRemove(as3.cast(this["mcRemove" + _loc2_], MovieClip)));
            this["slot" + _loc2_].buttonMode = true;
            if (HATCHERYCC.queueLimit > HATCHERYCC.DEFAULT_QUEUE_LIMIT) {
                this["slot" + _loc2_].gotoAndStop(2);
            } else {
                this["slot" + _loc2_].gotoAndStop(1);
            }
            this["mcRemove" + _loc2_].visible = false;
            this["mcRemove" + _loc2_].mouseEnabled = false;
            this["mcRemove" + _loc2_].mouseChildren = false;
            _loc2_++;
        }
        _loc2_ = 1;
        while (_loc2_ <= 5) {
            this["hatcheryRemove" + _loc2_].visible = false;
            this["hatcheryRemove" + _loc2_].mouseEnabled = false;
            this["hatcheryRemove" + _loc2_].mouseChildren = false;
            _loc2_++;
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
        let _loc4_: MovieClip = null;
        let _loc8_: BUILDING13 = null;
        let _loc9_: int = 0;
        let _loc11_: string = null;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        this.RenderQueue();
        let _loc1_: any[] = GLOBAL._bHatcheryCC._monsterQueue;
        let _loc2_: any[] = [];
        let _loc3_: int = 1;
        let _loc5_: any[] = [];
        let _loc6_: int = 0;
        while (_loc6_ < this._monsterSlots.length) {
            _loc11_ = String(this._monsterSlots[_loc6_].id);
            if (!SubscriptionHandler.instance.isSubscriptionActive && SubscriptionHandler.isEnabledForAll && BASE.isInfernoCreep(_loc11_)) {
                this._monsterSlots[_loc6_].mcMonster.alpha = 0.5;
                this._monsterSlots[_loc6_].mcLevel.alpha = 0.5;
            } else if (!BASE.Charge(4, CREATURES.GetProperty(_loc11_, "cResource"), true, BASE.isInfernoCreep(_loc11_))) {
                this._monsterSlots[_loc6_].mcMonster.alpha = 0.5;
                this._monsterSlots[_loc6_].mcLevel.alpha = 0.5;
            } else {
                this._monsterSlots[_loc6_].mcMonster.alpha = 1;
                this._monsterSlots[_loc6_].mcLevel.alpha = 1;
            }
            _loc6_++;
        }
        let _loc7_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING13);
        for (_loc8_ of (_loc7_ ?? [])) {
            (_loc4_ = as3.cast(this["hatchery" + _loc3_], MovieClip)).mouseEnabled = false;
            _loc4_.tLabel.text = "";
            _loc4_.mcImage.visible = false;
            _loc4_.mcLoading.visible = false;
            this["bProgress" + _loc3_].visible = false;
            this["tProgress" + _loc3_].visible = false;
            this["hatcheryRemove" + _loc3_].visible = false;
            if (_loc8_._countdownBuild.Get() > 0) {
                _loc4_.mcImage.visible = false;
                _loc4_.mcLoading.visible = false;
                _loc4_.tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_construction") + "</font>";
            } else if (_loc8_._countdownUpgrade.Get() > 0) {
                _loc4_.mcImage.visible = false;
                _loc4_.mcLoading.visible = false;
                _loc4_.tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_upgrading") + "</font>";
            } else if (Boolean(_loc8_._inProduction) && _loc8_._inProduction != "") {
                _loc4_.mcLoading.visible = true;
                ImageCache.GetImageWithCallBack("monsters/" + _loc8_._inProduction + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", ["hatchery", _loc3_]);
                // Through GetProperty, not the raw table, so the progress bar follows the real hatch time
                // (academy level, and the 1-second hatching of inferno-only builds).
                _loc12_ = Math.max(1, CREATURES.GetProperty(_loc8_._inProduction, "cTime") | 0) | 0;
                if ((_loc13_ = (100 / _loc12_ * _loc8_._countdownProduce.Get()) | 0) < 0) {
                    _loc13_ = 0;
                }
                this["bProgress" + _loc3_].mcBar.width = 100 - _loc13_;
                if (_loc8_._countdownProduce.Get() > 0 && _loc8_._hasResources) {
                    this["tProgress" + _loc3_].htmlText = "<b>" + GLOBAL.ToTime(_loc8_._countdownProduce.Get() | 0, true) + "</b>";
                } else if (_loc8_._productionStage.Get() == 2 && Boolean(_loc8_._inProduction)) {
                    this["tProgress" + _loc3_].htmlText = "<b>" + KEYS.Get("hat_status_nospace") + "</b>";
                } else if (_loc8_._productionStage.Get() == 3 && _loc8_._taken.Get() == 0) {
                    if (BASE.isInfernoMainYardOrOutpost) {
                        this["tProgress" + _loc3_].htmlText = "<b>No Magma</b>";
                    } else {
                        this["tProgress" + _loc3_].htmlText = "<b>" + KEYS.Get("hat_status_nogoo") + "</b>";
                    }
                } else {
                    this["tProgress" + _loc3_].htmlText = "<b>" + KEYS.Get("hat_status_waiting") + "</b>";
                }
                this["bProgress" + _loc3_].visible = true;
                this["tProgress" + _loc3_].visible = true;
            } else {
                _loc4_.mcImage.visible = false;
                _loc4_.mcLoading.visible = false;
                this["bProgress" + _loc3_].visible = false;
                this["tProgress" + _loc3_].visible = false;
            }
            _loc3_++;
        }
        _loc9_ = 5;
        if (BASE.isOutpost) {
            _loc9_ = 2;
        }
        let _loc10_: int = _loc3_;
        while (_loc10_ <= 5) {
            _loc4_ = as3.cast(this["hatchery" + _loc10_], MovieClip);
            if (_loc10_ <= _loc9_) {
                _loc4_.visible = true;
                _loc4_.tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_buildanother") + "</font>";
                _loc4_.mcLoading.visible = false;
                this["hatcheryBG" + _loc10_].visible = true;
                this["hatlabel" + _loc10_ + "_txt"].visible = true;
                this["bProgress" + _loc10_].visible = false;
                this["tProgress" + _loc10_].visible = false;
                this["hatcheryRemove" + _loc10_].visible = false;
            } else {
                _loc4_.visible = false;
                this["hatlabel" + _loc10_ + "_txt"].visible = false;
                this["hatcheryBG" + _loc10_].visible = false;
                this["hatcheryBG" + _loc10_].visible = false;
                this["bProgress" + _loc10_].visible = false;
                this["tProgress" + _loc10_].visible = false;
                this["hatcheryRemove" + _loc10_].visible = false;
            }
            _loc10_++;
        }
        if (GLOBAL._hatcheryOverdrive > 0) {
            this.mcOverdrive.t.htmlText = "<b>" + KEYS.Get("hat_xoverdrive", { "v1": GLOBAL._hatcheryOverdrivePower.Get(), "v2": GLOBAL.ToTime(GLOBAL._hatcheryOverdrive) }) + "</b>";
            this.mcOverdrive.visible = true;
        } else {
            this.mcOverdrive.visible = false;
        }
        this._scrollSet.Update();
    }

    public Help(param1: MouseEvent = null): void {
        let _loc2_: int = 9;
        this._guidePage += 1;
        if (this._guidePage == 3) {
            this._guidePage = 4;
        }
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

    public Hide(param1: MouseEvent = null): void {
        HATCHERYCC.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
