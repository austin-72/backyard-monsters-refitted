import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { SharedObject } from "flash/net";
import { BASE, Expo, GLOBAL, IoQuestTracker, IoQuests, KEYS, MISSIONS_ITEM, MapRoomManager, QUESTS, Quad, SOUNDS, ScrollSet, TUTORIAL, TweenLite, UI_BOTTOM, UI_MISSIONMENU_CLIP } from "@game";

export class UI_MISSIONMENU extends UI_MISSIONMENU_CLIP {
    static {
        as3.fields(this, { _counter: 0, _prioritycounter: 0, _CollectedMissions: null, _CompletedMissions: null, _PriorityMissions: null, _ActiveMissions: null, _Container: null, _Missions: null, _PriorityContainer: null, _Priority: null, _PriorityMask: null, _ScrollBar: null, _numDisplayItems: 10, _numDisplaySlots: 4, _numPinnedItems: 1, _UI_OffsetY: 10, _ItemPaddingY: 2, _Width: 380, _Height: 208, _seperatePriorities: true, _animating: false, _windowState: 1, _alertsCounter: 0, _disableMissions: false, _skinTag: 1, _enabled: false, _maximized: false, _open: true, _skinnedElements: null, _originProps: null, _maxProps: null, _openProps: null, _closeProps: null, _chatWidthDefault: null, _ioVersion: -1, _ioSummary: false, _ioSumProps: null, _ioFold: null });
    }

    private _counter: int;
    private _prioritycounter: int;
    private _CollectedMissions: any;
    private _CompletedMissions: any;
    private _PriorityMissions: any;
    private _ActiveMissions: any[];
    private _Container: Sprite;
    private _Missions: MovieClip;
    private _PriorityContainer: Sprite;
    private _Priority: MovieClip;
    private _PriorityMask: Shape;
    private _ScrollBar: ScrollSet;
    private _numDisplayItems: int;
    private _numDisplaySlots: int;
    private _numPinnedItems: int;
    private _UI_OffsetY: number;
    private _ItemPaddingY: number;
    public _Width: number;
    public _Height: number;
    private _seperatePriorities: boolean;
    private _animating: boolean;
    private _windowState: int;
    public _alertsCounter: int;
    public _disableMissions: boolean;
    private _skinTag: int;
    public _enabled: boolean;
    public _maximized: boolean;
    public _open: boolean;
    private _skinnedElements: any[];
    private _originProps: any;
    private _maxProps: any;
    private _openProps: any;
    private _closeProps: any;
    private _chatWidthDefault: any;
    /** Inferno-only: the quest book's version the rows were drawn from (IoQuestTracker). */
    private _ioVersion: int;
    /** Inferno-only (QoL #316): folded to its one-line summary (the book's pinned row) under the title bar. */
    private _ioSummary: boolean;
    private _ioSumProps: any;
    /** Inferno-only (QoL #316): the title bar's fold button, left of the X. */
    private _ioFold: Sprite;

    public $ctor(): void {
        this._skinnedElements = [];
        this._originProps = { "screenHeight": 240, "screenWidth": 400 };
        this._maxProps = { "screenHeight": 470, "maskHeight": 470 - 12, "y": -(470 + 30), "scrollerY": -470, "scrollHeight": 470 - 16, "footerY": -12 };
        this._openProps = { "screenHeight": 240, "maskHeight": 136, "y": -178, "scrollerY": -148, "scrollHeight": 120, "footerY": -12 };
        this._closeProps = { "screenHeight": 114, "maskHeight": 105, "y": 0, "scrollerY": 30, "scrollHeight": 105, "footerY": 27 };
        // (Inferno-only, QoL #316: the title bar right on the pinned row, the list folded away under it)
        this._ioSumProps = { "screenHeight": 240, "maskHeight": 1, "y": -42, "scrollerY": -12, "scrollHeight": 1, "footerY": -12 };
        this._chatWidthDefault = { "sizeW": 380, "headerW": 380, "headerX": -5, "titleTxtX": 70, "alertX": 220, "arrowUpX": 343, "arrowUpY": 16, "arrowDownX": 325, "arrowDownY": 13, "borderW": 380, "mcMaskW": 348, "tOutputW": 330, "mcScreenW": 350, "inputWoodBgW": 380, "inputTxtBgW": 310, "inputTxtW": 310, "sendBtnX": 331, "scrollerX": 347, "ignoreBtnX": 315 };
        super.$ctor();
        this.frame.tTitle.htmlText = KEYS.Get("quests_title");
        this._CollectedMissions = {};
        this._CompletedMissions = {};
        this._PriorityMissions = {};
        this._ActiveMissions = [];
        this._skinnedElements = [this.frame.border, this.frame.header, this.frame.mcScreen.canvas, this.footer];
        if (GLOBAL.StatGet("missionmin") == 1) {
            this._open = false;
            this._maximized = false;
            this._enabled = true;
        } else {
            this._open = true;
            this._maximized = false;
        }
        this.frame.mcMask.height = this._numDisplaySlots * (32 + this._ItemPaddingY);
        this._Container = new Sprite();
        this._Container.x = Number(this.frame.mcScreen.x);
        this._Container.y = Number(this.frame.mcScreen.y);
        this._Container.mask = as3.cast(this.frame.mcMask, DisplayObject);
        this.frame.addChild(this._Container);
        this._Missions = new MovieClip();
        this._Container.addChild(this._Missions);
        this._ScrollBar = new ScrollSet();
        this.frame.addChild(this._ScrollBar);
        this._ScrollBar.Init(this._Container, as3.cast(this.frame.mcMask, MovieClip), 0, 30, Number(this.frame.mcMask.height));
        this._ScrollBar.x = 380 - 16 - 16;
        this._ScrollBar.y = 30;
        this._ScrollBar.AutoHideEnabled = false;
        this._PriorityMask = new Shape();
        this._PriorityMask.graphics.lineStyle();
        this._PriorityMask.graphics.beginFill(16777215, 1);
        this._PriorityMask.graphics.drawRect(0, 0, 380 - 16 - 16, this._numPinnedItems * (32 + this._ItemPaddingY * (this._numPinnedItems - 1)));
        this._PriorityMask.graphics.endFill();
        this._PriorityMask.x = this.footer.x + 16;
        this._PriorityMask.y = this.footer.y + 5;
        this.addChild(this._PriorityMask);
        this._PriorityContainer = new Sprite();
        this._PriorityContainer.x = this._PriorityMask.x;
        this._PriorityContainer.y = this._PriorityMask.y;
        this._PriorityContainer.mask = this._PriorityMask;
        this.addChild(this._PriorityContainer);
        this._Priority = new MovieClip();
        this._PriorityContainer.addChild(this._Priority);
        this.CheckMissionsStatus();
        this.frame.arrowUp.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.toggleHide));
        this.frame.arrowUp.mouseChildren = false;
        this.frame.arrowUp.buttonMode = true;
        this.frame.arrowUp.useHandCursor = true;
        this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
        this.frame.arrowUp.visible = false;
        this.frame.arrowDown.mouseChildren = false;
        this.frame.arrowDown.buttonMode = true;
        this.frame.arrowDown.useHandCursor = true;
        this.frame.arrowDown.gotoAndStop("on" + this._skinTag);
        this.frame.arrowDown.enabled = false;
        this.frame.arrowDown.visible = false;
        this.frame.mcToggle.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.OnDisableClick));
        this.frame.mcToggle.mouseChildren = false;
        this.frame.mcToggle.buttonMode = true;
        this.frame.mcToggle.useHandCursor = true;
        this.frame.mcToggle.gotoAndStop(this._enabled ? "on" + this._skinTag : "close" + this._skinTag);
        this.frame.mcToggle.visible = TUTORIAL.hasFinished;
        if (GLOBAL.INFERNO_ONLY && this.frame.header) {
            // (QoL #546: the title bar folds and opens the dock, as the X does; the X alone was 19 pixels)
            this.frame.header.buttonMode = true;
            this.frame.header.useHandCursor = true;
            if (this.frame.tTitle) {
                this.frame.tTitle.mouseEnabled = false;
            }
            this.frame.header.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (this.frame.mcToggle.visible) {
                    this.frame.mcToggle.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DOWN));
                }
            });
        }
        if (GLOBAL.INFERNO_ONLY) {
            this._ioSummary = UI_MISSIONMENU.ioSummarySaved();
            this.ioMakeFold();
        }
        this.toggleHide();
    }

    // ---- Inferno-only (QoL #316): the dock folds to its one-line summary, with a toggle on its title bar
    /** The open dock's shape: the summary's when folded to it. */
    private ioOpenProps(): any {
        return GLOBAL.INFERNO_ONLY && this._ioSummary ? this._ioSumProps : this._openProps;
    }

    private static ioSummarySaved(): boolean {
        try {
            return SharedObject.getLocal("bymr_data", "/").data.ioDockSummary == 1;
        } catch (e) {
        }
        return false;
    }

    private ioMakeFold(): void {
        let b: Sprite = new Sprite();
        b.name = "ioDockFold";
        b.buttonMode = true;
        b.mouseChildren = false;
        b.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            this.ioSetSummary(!this._ioSummary);
        });
        this._ioFold = b;
        this.frame.addChild(b);
        this.ioDrawFold();
    }

    /** The fold button: a chevron down (fold to one line) or up (the whole list again), left of the X. */
    private ioDrawFold(): void {
        let b: Sprite = this._ioFold;
        if (!b) {
            return;
        }
        b.graphics.clear();
        b.graphics.lineStyle(1.5, 14708778, 1);
        b.graphics.beginFill(0x2A1006, 0.9);
        b.graphics.drawRoundRect(0, 0, 20, 18, 6, 6);
        b.graphics.endFill();
        b.graphics.lineStyle(0, 0, 0);
        b.graphics.beginFill(0xFFC870, 1);
        if (this._ioSummary) {
            b.graphics.moveTo(5, 12);
            b.graphics.lineTo(10, 6);
            b.graphics.lineTo(15, 12);
        } else {
            b.graphics.moveTo(5, 6);
            b.graphics.lineTo(10, 12);
            b.graphics.lineTo(15, 6);
        }
        b.graphics.endFill();
        let x: any = this.frame.mcToggle;
        if (x) {
            let r: any = x.getBounds(this.frame);
            b.x = Math.round(r.x - 26);
            b.y = Math.round(r.y + (r.height - 18) / 2);
        }
        b.visible = Boolean(x && x.visible) && this._open;
    }

    /** Folds the open dock to its summary (on) or opens its list again, and keeps the choice on this computer. */
    private ioSetSummary(on: boolean): void {
        if (this._animating) {
            return;
        }
        this._ioSummary = on;
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            so.data.ioDockSummary = on ? 1 : 0;
            so.flush();
        } catch (e) {
        }
        SOUNDS.Play("click1");
        this.ioDrawFold();
        if (!this._open || this._maximized) {
            return;
        }
        let p: any = this.ioOpenProps();
        if (!on) {
            this._Container.visible = true;
        }
        this._ScrollBar.visible = false;
        this._animating = true;
        TweenLite.to(this.frame, 0.35, { "y": p.y, "onUpdate": as3.bind(this, this.toggleOnUpdate), "onComplete": as3.bind(this, this.toggleVisibleB) });
        TweenLite.to(this.frame.mcMask, 0.35, { "height": p.maskHeight });
        TweenLite.to(this._ScrollBar, 0.35, { "y": p.scrollerY });
    }

    public Skin(): void {
        let _loc1_: int = 1;
        if (GLOBAL.InfernoMode()) {
            _loc1_ = 2;
        }
        this._skinTag = _loc1_;
        let _loc2_: int = 0;
        while (_loc2_ < this._skinnedElements.length) {
            this._skinnedElements[_loc2_].gotoAndStop(_loc1_);
            _loc2_++;
        }
        this.frame.mcToggle.gotoAndStop(this._enabled ? "on" + this._skinTag : "close" + this._skinTag);
        this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
        this.frame.arrowDown.gotoAndStop("on" + this._skinTag);
    }

    public Update(): void {
        this.Skin();
        if (!this.frame.mcToggle.visible && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            this.frame.mcToggle.visible = TUTORIAL.hasFinished;
        }
        if (GLOBAL._catchup) {
            return;
        }
        if (!this._open) {
            return;
        }
        this.CheckMissionsStatus();
    }

    public AddItem(param1: string, param2: boolean = false): int {
        let _loc4_: MISSIONS_ITEM = null;
        let _loc3_: any = QUESTS._quests[param1];
        if (!_loc3_.block) {
            _loc4_ = new MISSIONS_ITEM(param1);
            if (param2) {
                this._Priority.addChild(_loc4_);
                _loc4_.y = (_loc4_._Height + this._ItemPaddingY) * this._prioritycounter;
                _loc4_.bg.gotoAndStop("shiny" + this._skinTag);
            } else {
                this._Missions.addChild(_loc4_);
                _loc4_.y = (_loc4_._Height + this._ItemPaddingY) * this._counter;
            }
            if (this._counter % 2 == 0) {
                _loc4_.bg.gotoAndStop("off" + this._skinTag);
            } else {
                _loc4_.bg.gotoAndStop("on" + this._skinTag);
            }
            if (param2) {
                _loc4_.bg.gotoAndStop("shiny" + this._skinTag);
                _loc4_.bg.height = _loc4_._Height;
            }
            this._ActiveMissions.push(_loc4_);
            return 1;
        }
        return 0;
    }

    public CheckMissionsStatus(): void {
        let _loc1_: string = null;
        let _loc3_: string = null;
        if (!GLOBAL.isAtHome()) {
            this._disableMissions = true;
        } else if (MapRoomManager.instance.isInMapRoom2or3 && MapRoomManager.instance.isOpen) {
            this._disableMissions = true;
        } else {
            this._disableMissions = false;
        }
        if (this._disableMissions) {
            this.RefreshMissions(this._disableMissions);
            return;
        }
        if (!this._open) {
            return;
        }
        // Inferno-only: the rows are the quest book's (redrawn when it changes)
        if (GLOBAL.INFERNO_ONLY) {
            if (this._ioVersion != IoQuests.version) {
                this.RebuildContainer();
            }
            this.ioDrawFold();
            return;
        }
        let _loc2_: boolean = false;
        if (QUESTS._completed) {
            for (_loc1_ in QUESTS._quests) {
                _loc3_ = String(QUESTS._quests[_loc1_].id);
                if (QUESTS._completed[_loc3_]) {
                    if (QUESTS._completed[_loc3_] == 1) {
                        if (_loc1_ in this._CompletedMissions == false && !this._CompletedMissions[_loc3_]) {
                            this._CompletedMissions[_loc3_] = true;
                            _loc2_ = true;
                        }
                    } else if (QUESTS._completed[_loc3_] == 2) {
                        if (_loc1_ in this._CollectedMissions == false && !this._CollectedMissions[_loc3_]) {
                            this._CollectedMissions[_loc3_] = true;
                            _loc2_ = true;
                        }
                    }
                }
            }
            if (_loc2_ && this._open) {
                this.RebuildContainer();
            }
        }
    }

    public Clear(): void {
        if (Boolean(this._Container) && Boolean(this._Missions)) {
            this._Container.removeChild(this._Missions);
            this._Missions = new MovieClip();
            this._Container.addChild(this._Missions);
        }
        if (Boolean(this._PriorityContainer) && Boolean(this._Priority)) {
            this._PriorityContainer.removeChild(this._Priority);
            this._Priority = new MovieClip();
            this._PriorityContainer.addChild(this._Priority);
        }
        this._ActiveMissions = [];
        this._counter = 0;
        this._prioritycounter = 0;
    }

    private RebuildContainer(): void {
        let _loc1_: string = null;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc10_: int = 0;
        let _loc2_: any[] = new Array();
        let _loc3_: any[] = new Array();
        let _loc4_: any[] = new Array();
        this.Clear();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioRebuild();
            return;
        }
        if (QUESTS._completed) {
            for (_loc1_ in QUESTS._quests) {
                _loc5_ = String(QUESTS._quests[_loc1_].id);
                if (QUESTS._completed[_loc5_] && QUESTS._completed[_loc5_] == 1 && (!QUESTS._quests[_loc1_].prereq || QUESTS._completed[QUESTS._quests[_loc1_].prereq] == 2)) {
                    _loc2_.push({ "missionID": _loc1_, "order": QUESTS._quests[_loc1_].order });
                }
            }
            as3.sortOn(_loc2_, "order", Array.NUMERIC);
        }
        for (_loc1_ in QUESTS._quests) {
            _loc5_ = String(QUESTS._quests[_loc1_].id);
            if (!QUESTS._completed[_loc5_] && (!QUESTS._quests[_loc1_].prereq || QUESTS._completed[QUESTS._quests[_loc1_].prereq] == 2)) {
                _loc3_.push({ "missionID": _loc1_, "order": QUESTS._quests[_loc1_].order });
                if (QUESTS._quests[_loc1_].priority == 1) {
                    _loc4_.push({ "missionID": _loc1_, "order": QUESTS._quests[_loc1_].order });
                }
            }
            as3.sortOn(_loc3_, "order", Array.NUMERIC);
            if (_loc4_.length > 1) {
                as3.sortOn(_loc4_, "order", Array.NUMERIC);
            }
        }
        if (_loc4_.length < 1 && GLOBAL.mode == GLOBAL._loadmode) {
            this.frame.mcMask.height = (this._numDisplaySlots + 1) * (32 + this._ItemPaddingY);
        } else {
            this.frame.mcMask.height = this._numDisplaySlots * (32 + this._ItemPaddingY);
        }
        this._ScrollBar.Update();
        this.frame.y = Number(this._openProps.y);
        this.footer.y = Number(this._openProps.footerY);
        let _loc7_: int = _loc2_.length | 0;
        _loc6_ = 0;
        while (_loc6_ < _loc7_) {
            this._counter += this.AddItem(as3.str(_loc2_[_loc6_].missionID));
            _loc6_++;
        }
        _loc7_ = _loc4_.length | 0;
        _loc6_ = 0;
        while (_loc6_ < _loc7_) {
            if (!(this._seperatePriorities && this._prioritycounter >= this._numPinnedItems)) {
                this._prioritycounter += this.AddItem(as3.str(_loc4_[_loc6_].missionID), true);
            }
            _loc6_++;
        }
        let _loc8_: int = this._counter;
        let _loc9_: boolean = true;
        _loc7_ = _loc3_.length | 0;
        _loc6_ = 0;
        while (_loc6_ < _loc7_) {
            _loc9_ = true;
            if (this._numDisplayItems == 0 || this._counter - _loc8_ < this._numDisplayItems) {
                if (this._seperatePriorities) {
                    _loc10_ = 0;
                    while (_loc10_ < this._prioritycounter) {
                        if (_loc4_[_loc10_].missionID == _loc3_[_loc6_].missionID) {
                            _loc9_ = false;
                        }
                        _loc10_++;
                    }
                }
                if (_loc9_) {
                    this._counter += this.AddItem(as3.str(_loc3_[_loc6_].missionID));
                }
            }
            _loc6_++;
        }
        this.addChild(this._ScrollBar);
        this._ScrollBar.Update();
    }

    /** Inferno-only: the quest book's rows (IoQuestTracker), in the dock's place for them. */
    private ioRebuild(): void {
        this._ioVersion = IoQuests.version;
        this._counter = IoQuestTracker.fill(this._Missions, this._Priority);
        this._prioritycounter = 1;
        this.frame.mcMask.height = this._numDisplaySlots * (32 + this._ItemPaddingY);
        this._ScrollBar.Update();
        // (QoL #316: or the summary's place)
        this.frame.y = Number(this._maximized ? this._maxProps.y : this.ioOpenProps().y);
        this.footer.y = Number(this._openProps.footerY);
        if (this._ioSummary && !this._maximized) {
            this.frame.mcMask.height = Number(this._ioSumProps.maskHeight);
        }
        this.addChild(this._ScrollBar);
        this._ScrollBar.Update();
    }

    public RefreshMissions(param1: boolean = false): void {
        let _loc2_: number = 0;
        while (_loc2_ < this._ActiveMissions.length) {
            (as3.as(this._ActiveMissions[_loc2_], MISSIONS_ITEM)).Init(param1);
            _loc2_++;
        }
    }

    private toggleHide(param1: MouseEvent = null): void {
        let _loc4_: any = null;
        this.CheckMissionsStatus();
        let _loc2_: boolean = false;
        let _loc3_: boolean = false;
        if (param1 != null) {
            if (param1.currentTarget == this.frame.arrowUp) {
                if (this._maximized) {
                    _loc2_ = false;
                } else {
                    _loc2_ = true;
                }
            }
            if (param1.currentTarget == this.frame.mcToggle) {
                if (this._open) {
                    _loc2_ = false;
                    this._maximized = false;
                } else {
                    _loc2_ = true;
                    this._maximized = false;
                }
            }
        }
        if (this._animating) {
            return;
        }
        if (!this._open) {
            if (BASE.isInfernoMainYardOrOutpost) {
                SOUNDS.Play("iquestshow", 1); // (QoL #619: louder; the file is quiet)
            } else {
                SOUNDS.Play("click1");
            }
        } else if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.Play("iquesthide");
        } else {
            SOUNDS.Play("close");
        }
        let _loc5_: number = 0.5;
        if (param1 == null) {
            if (this._open) {
                _loc4_ = this.ioOpenProps();
            } else {
                _loc4_ = this._closeProps;
            }
            this._maximized = false;
            this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
            this.frame.arrowDown.gotoAndStop("off" + this._skinTag);
            this.frame.arrowUp.buttonMode = true;
            this.frame.arrowDown.buttonMode = false;
        } else if (this._maximized && this._open) {
            if (!(!_loc2_ && !_loc3_)) {
                return;
            }
            _loc4_ = this.ioOpenProps();
            this._maximized = false;
            this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
            this.frame.arrowDown.gotoAndStop("on" + this._skinTag);
            this.frame.arrowUp.buttonMode = true;
            this.frame.arrowDown.buttonMode = true;
            GLOBAL.StatSet("missionmin", 0);
        } else if (this._open) {
            if (!_loc2_) {
                _loc4_ = this._closeProps;
                this._maximized = false;
                this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
                this.frame.arrowDown.gotoAndStop("off" + this._skinTag);
                this.frame.arrowUp.buttonMode = true;
                this.frame.arrowDown.buttonMode = false;
                GLOBAL.StatSet("missionmin", 1);
            } else if (_loc2_) {
                _loc4_ = this._maxProps;
                this._maximized = true;
                this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
                this.frame.arrowDown.gotoAndStop("on" + this._skinTag);
                this.frame.arrowUp.buttonMode = true;
                this.frame.arrowDown.buttonMode = false;
                GLOBAL.StatSet("missionmin", 0);
            } else if (_loc3_) {
                return;
            }
        } else if (!this._open) {
            if (!(_loc2_ || _loc3_)) {
                return;
            }
            _loc4_ = this.ioOpenProps();
            this._maximized = false;
            this.frame.arrowUp.gotoAndStop("on" + this._skinTag);
            this.frame.arrowDown.gotoAndStop("on" + this._skinTag);
            this.frame.arrowUp.buttonMode = true;
            this.frame.arrowDown.buttonMode = true;
            GLOBAL.StatSet("missionmin", 0);
        }
        if (_loc4_ == null) {
            return;
        }
        this._ScrollBar.visible = false;
        TweenLite.to(this.frame, _loc5_, { "y": _loc4_.y, "onUpdate": as3.bind(this, this.toggleOnUpdate), "onComplete": as3.bind(this, this.toggleVisibleB) });
        TweenLite.to(this.frame.mcScreen, _loc5_, { "height": _loc4_.screenHeight });
        TweenLite.to(this.frame.mcMask, _loc5_, { "height": _loc4_.maskHeight });
        TweenLite.to(this._ScrollBar, _loc5_, { "y": _loc4_.scrollerY });
        this._animating = true;
        this._open = _loc4_ != this._closeProps;
        let _loc6_: int = this._open ? 1 : 0;
        if (this._open) {
            if (!this._counter) {
                this.RebuildContainer();
                this.CheckMissionsStatus();
            }
            this.RefreshMissions(this._disableMissions);
            TweenLite.to(this.footer, _loc5_, { "y": _loc4_.footerY, "autoAlpha": 1, "ease": Expo.easeOut });
            TweenLite.to(this._PriorityMask, _loc5_, { "autoAlpha": 1, "ease": Expo.easeOut });
            TweenLite.to(this._PriorityContainer, _loc5_, { "autoAlpha": 1, "ease": Expo.easeOut });
        } else {
            TweenLite.to(this.footer, _loc5_, { "y": _loc4_.footerY, "autoAlpha": 0, "ease": Quad.easeIn });
            TweenLite.to(this._PriorityMask, _loc5_, { "autoAlpha": 0, "ease": Expo.easeOut });
            TweenLite.to(this._PriorityContainer, _loc5_, { "autoAlpha": 0, "ease": Expo.easeOut });
        }
    }

    private toggleOnUpdate(): void {
        UI_BOTTOM.Resize();
    }

    private toggleVisibleB(): void {
        this._animating = false;
        let _loc1_: any = this._maximized ? this._maxProps : this._openProps;
        this._ScrollBar.Update();
        this._ScrollBar.visible = this._Container.height > this.frame.mcMask.height;
        this._PriorityMask.x = this.footer.x + 16;
        this._PriorityMask.y = this.footer.y + 5;
        this._PriorityContainer.x = this._PriorityMask.x;
        this._PriorityContainer.y = this._PriorityMask.y;
        if (!this._open) {
            this._ScrollBar.visible = false;
        } else {
            this._ScrollBar.visible = true;
            this._ScrollBar.ScrollTo(0, true);
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #316: folded to the summary: no list, no bar)
            let folded: boolean = this._open && this._ioSummary && !this._maximized;
            this._Container.visible = !folded;
            if (folded) {
                this._ScrollBar.visible = false;
            }
            this.ioDrawFold();
        }
        UI_BOTTOM.Resize();
    }

    private OnDisableClick(param1: MouseEvent = null): void {
        if (param1 && param1.currentTarget == this.frame.mcToggle && TUTORIAL.hasFinished) {
            this._enabled = !this._enabled;
        }
        if (TUTORIAL.hasFinished) {
            if (!this._enabled) {
                this._open = false;
            } else {
                this._open = true;
            }
            this.frame.mcToggle.gotoAndStop(this._enabled ? "on" + this._skinTag : "close" + this._skinTag);
            this.toggleHide(param1);
        }
    }

    public Resize(): void {
        this.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - this._Width;
        this.y = GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 30;
        if (this._open) {
            this.CheckMissionsStatus();
            this.RefreshMissions(this._disableMissions);
        }
    }
}
