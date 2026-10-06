import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Sprite } from "flash/display";
import { AsyncErrorEvent, MouseEvent, NetStatusEvent, SecurityErrorEvent, TimerEvent } from "flash/events";
import { Video } from "flash/media";
import { NetConnection, NetStream } from "flash/net";
import { TextField } from "flash/text";
import { Timer } from "flash/utils";
import { BASE, GLOBAL, ImageCache, KEYS, POPUPS, SIEGEBUILDINGPOPUP_CLIP, ScrollSet, SiegeBuilding, SiegeBuildingPopup_ListItem_CLIP, SiegeWeapon, SiegeWeaponProperty, SiegeWeapons, creatureBarAdv, icon_costs } from "@game";

export class SiegeBuildingPopup extends SIEGEBUILDINGPOPUP_CLIP {
    static {
        as3.fields(this, { _scrollSet: null, _scrollSetContainer: null, _statLabels: null, _statBarTexts: null, _statBars: null, _siegeWeaponRows: null, _resourceCosts: null, _tab: null, _currentWeapon: null, _maxStatBarWidth: NaN, _maxTimeBarWidth: NaN, _currentPreviewUrl: null, _timer: null, _videoStream: null, _currentVideoURL: null, _PREVIEW_WIDTH: 400, _PREVIEW_HEIGHT: 175, _DOES_PLAY_VIDEO: true });
    }

    private _scrollSet: ScrollSet;
    private _scrollSetContainer: Sprite;
    private _statLabels: Vector<TextField>;
    private _statBarTexts: Vector<TextField>;
    private _statBars: Vector<creatureBarAdv>;
    private _siegeWeaponRows: Vector<SiegeBuildingPopup_ListItem_CLIP>;
    private _resourceCosts: Vector<icon_costs>;
    private _tab: string;
    private _currentWeapon: SiegeWeapon;
    private _maxStatBarWidth: number;
    private _maxTimeBarWidth: number;
    private _currentPreviewUrl: string;
    private _timer: Timer;
    private _videoStream: NetStream;
    private _currentVideoURL: string;
    private _PREVIEW_WIDTH: int;
    private _PREVIEW_HEIGHT: int;
    private _DOES_PLAY_VIDEO: boolean;

    public $ctor(param1?: string, param2: string = null): void {
        this._timer = new Timer(1000);
        super.$ctor();
        if (param2) {
            this._currentWeapon = SiegeWeapons.getWeapon(param2);
        }
        this._tab = param1;
        this._siegeWeaponRows = new Vector<SiegeBuildingPopup_ListItem_CLIP>(0, false, SiegeBuildingPopup_ListItem_CLIP);
        this._scrollSet = new ScrollSet();
        this._scrollSet.x = this.scroller.x;
        this._scrollSet.y = this.scroller.y;
        this._scrollSet.width = this.scroller.width;
        this._scrollSet.Init(this.weaponContainer_mc, this.weaponContainer_mask, ScrollSet.BROWN, this.weaponContainer_mask.y, this.weaponContainer_mask.height);
        this._scrollSet.AutoHideEnabled = false;
        this._scrollSet.isHiddenWhileUnnecessary = true;
        this._scrollSetContainer = new Sprite();
        this._scrollSetContainer.addChild(this._scrollSet);
        this.addChild(this._scrollSetContainer);
        this.scroller.visible = false;
        this.mcTime.mcBar2.visible = false;
        this.tab_siegelab.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SwitchToLab));
        this.tab_siegelab.Setup();
        this.title_siegelab.htmlText = KEYS.Get("b_siegeworks_title");
        this.title_siegelab.mouseEnabled = false;
        this.tab_siegefactory.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SwitchToFactory));
        this.tab_siegefactory.Setup();
        this.title_siegefactory.htmlText = KEYS.Get("b_siegefactory_title");
        this.title_siegefactory.mouseEnabled = false;
        this._statLabels = new Vector<TextField>(3, true, TextField);
        as3.vset(this._statLabels, 0, this.stat1_label);
        as3.vset(this._statLabels, 1, this.stat2_label);
        as3.vset(this._statLabels, 2, this.stat3_label);
        this._statBarTexts = new Vector<TextField>(3, true, TextField);
        as3.vset(this._statBarTexts, 0, this.stat1_bartxt);
        as3.vset(this._statBarTexts, 1, this.stat2_bartxt);
        as3.vset(this._statBarTexts, 2, this.stat3_bartxt);
        this._statBars = new Vector<creatureBarAdv>(3, true, creatureBarAdv);
        as3.vset(this._statBars, 0, this.stat1_bar);
        as3.vset(this._statBars, 1, this.stat2_bar);
        as3.vset(this._statBars, 2, this.stat3_bar);
        this._resourceCosts = new Vector<icon_costs>(4, true, icon_costs);
        as3.vset(this._resourceCosts, 0, as3.cast(this.mcResources.mcR1, icon_costs));
        as3.vset(this._resourceCosts, 1, as3.cast(this.mcResources.mcR2, icon_costs));
        as3.vset(this._resourceCosts, 2, as3.cast(this.mcResources.mcR3, icon_costs));
        as3.vset(this._resourceCosts, 3, as3.cast(this.mcResources.mcTime, icon_costs));
        let _loc3_: int = 0;
        while (_loc3_ < this._statBars.length) {
            as3.vget(this._statBars, _loc3_).mcBar2.gotoAndStop(3);
            _loc3_++;
        }
        this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.DoInstant), false, 0, true);
        this.mcInstant.gCoin.mouseEnabled = false;
        this.mcInstant.bAction.Highlight = true;
        this.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.DoResources));
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CancelAction));
        this.bCancel.SetupKey("btn_cancel");
        this.bMap.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OpenMap));
        this.bMap.SetupKey("btn_openmap");
        this._maxStatBarWidth = this.stat1_bar.width / this.stat1_bar.scaleX;
        this._maxTimeBarWidth = this.mcTime.width / this.mcTime.scaleX;
        this._timer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onTick));
        this._timer.start();
        let _loc4_: Video = new Video(this._PREVIEW_WIDTH, this._PREVIEW_HEIGHT);
        this._videoStream = this.LoadVideo(_loc4_);
        this.videoCanvas_mc.container.addChild(_loc4_);
        this.Update();
    }

    private LoadVideo(param1: Video, param2: string = null): NetStream {
        let _loc3_: NetConnection = new NetConnection();
        _loc3_.addEventListener(AsyncErrorEvent.ASYNC_ERROR, as3.bind(this, this.onErrorLoadingVideo));
        _loc3_.addEventListener(SecurityErrorEvent.SECURITY_ERROR, as3.bind(this, this.onErrorLoadingVideo));
        _loc3_.connect(null);
        let _loc4_: NetStream = null;
        (_loc4_ = new NetStream(_loc3_)).addEventListener(AsyncErrorEvent.ASYNC_ERROR, as3.bind(this, this.onErrorLoadingVideo));
        _loc4_.addEventListener(NetStatusEvent.NET_STATUS, as3.bind(this, this.onStreamNetStatus));
        _loc4_.client = { "onMetaData": as3.bind(this, this.onErrorLoadingVideo) };
        if (param2) {
            _loc4_.play(param2);
        }
        param1.attachNetStream(_loc4_);
        return _loc4_;
    }

    protected onErrorLoadingVideo(param1: any): void {
    }

    private onStreamNetStatus(param1: NetStatusEvent): void {
        if (param1.info.code == "NetStream.Play.Stop") {
            this._videoStream.seek(0);
        }
    }

    public Update(): void {
        let i: int = 0;
        let newlen: int = 0;
        let resetCurrentWeapon: boolean = false;
        let weapon: SiegeWeapon = null;
        let allWeapons: Vector<SiegeWeapon> = new Vector<SiegeWeapon>(0, false, SiegeWeapon);
        SiegeWeapons.addCurrentWeapons(allWeapons);
        if (this._tab == "factory") {
            i = 0;
            newlen = allWeapons.length | 0;
            while (i < newlen) {
                if (as3.vget(allWeapons, i).level <= 0) {
                    as3.vset(allWeapons, i, as3.vget(allWeapons, newlen - 1));
                    newlen--;
                } else {
                    i++;
                }
            }
            as3.vsetLength(allWeapons, newlen >>> 0);
        }
        allWeapons.fixed = true;
        as3.sort(allWeapons, (param1: SiegeWeapon, param2: SiegeWeapon): int => {
            return param1.weaponID < param2.weaponID ? -1 : 1;
        });
        this.HideAll();
        this.tab_siegelab.Highlight = this._tab == "lab";
        this.tab_siegefactory.Highlight = this._tab == "factory";
        this.window.gotoAndStop(this._tab == "lab" ? 1 : 2);
        if (this._tab == "lab" && (!GLOBAL._bSiegeLab || GLOBAL._bSiegeLab.isBuilding)) {
            this.tNotice.htmlText = KEYS.Get("msg_siegeworks_notbuilt");
            this.tNotice.visible = true;
        } else if (this._tab == "factory" && (!GLOBAL._bSiegeFactory || GLOBAL._bSiegeFactory.isBuilding)) {
            this.tNotice.htmlText = KEYS.Get("msg_siegefactory_notbuilt");
            this.tNotice.visible = true;
        } else if (this._tab == "lab" && GLOBAL._bSiegeLab.isUpgrading) {
            this.tNotice.htmlText = KEYS.Get("msg_sworks_upgrading");
            this.tNotice.visible = true;
        } else if (this._tab == "factory" && GLOBAL._bSiegeFactory.isUpgrading) {
            this.tNotice.htmlText = KEYS.Get("msg_sfactory_upgrading");
            this.tNotice.visible = true;
        } else if (this._tab == "lab" && (GLOBAL._bSiegeLab && GLOBAL._bSiegeLab.health < GLOBAL._bSiegeLab.maxHealth * 0.5)) {
            this.tNotice.htmlText = KEYS.Get("msg_sworks_damaged", { "v1": GLOBAL._bSiegeLab.name });
            this.tNotice.visible = true;
        } else if (this._tab == "factory" && (GLOBAL._bSiegeFactory && GLOBAL._bSiegeFactory.health < GLOBAL._bSiegeFactory.maxHealth * 0.5)) {
            this.tNotice.htmlText = KEYS.Get("msg_sfactory_damaged", { "v1": GLOBAL._bSiegeFactory.name });
            this.tNotice.visible = true;
        } else if (allWeapons.length <= 0) {
            this.tNotice.htmlText = KEYS.Get("msg_siegefactory_noweapon");
            this.tNotice.visible = true;
        } else {
            resetCurrentWeapon = true;
            for (weapon of (allWeapons ?? [])) {
                if (weapon == this._currentWeapon) {
                    resetCurrentWeapon = false;
                }
            }
            if (!this._currentWeapon || resetCurrentWeapon) {
                this._currentWeapon = as3.vget(allWeapons, 0);
            }
            if (this._DOES_PLAY_VIDEO) {
                if (this._currentVideoURL != this._currentWeapon.video) {
                    this._videoStream.close();
                    this._currentVideoURL = this._currentWeapon.video;

                    // this._videoStream.play(this._currentWeapon.video);
                    // Comment: Added this so the game looks for the video hosted on the server instead of locally
                    this._videoStream.play(GLOBAL._storageURL + this._currentWeapon.video);
                }
            } else if (this._currentPreviewUrl != this._currentWeapon.videopreview) {
                this._currentPreviewUrl = this._currentWeapon.videopreview;
                this.videoCanvas_mc.container.visible = false;
                ImageCache.GetImageWithCallBack(this._currentWeapon.videopreview, as3.bind(this, this.onPreviewImageLoaded), true, 1, "", [this.videoCanvas_mc.container]);
            }
            this.UpdateShowList(allWeapons);
            this.UpdateShowCurrentWeapon();
        }
        if (!this.mcInstant.bAction.mouseEnabled && !BASE._saving) {
            this.mcInstant.bAction.Enabled = true;
            this.mcInstant.bAction.mouseEnabled = true;
        }
    }

    private HideAll(): void {
        let _loc1_: int = 0;
        while (_loc1_ < 3) {
            as3.vget(this._statLabels, _loc1_).visible = false;
            as3.vget(this._statBarTexts, _loc1_).visible = false;
            as3.vget(this._statBars, _loc1_).visible = false;
            _loc1_++;
        }
        this.mcInstant.visible = false;
        this.mcResources.visible = false;
        this.mcTimeTxt.visible = false;
        this.mcTime.visible = false;
        this.bCancel.visible = false;
        this.tTitle.visible = false;
        this.tTitleReady.visible = false;
        this.tDesc.visible = false;
        this.tWarning.visible = false;
        this.tNotice.visible = false;
        this.weaponContainer_mc.visible = false;
        this.weaponContainer_frame.visible = false;
        this.weaponContainer_mask.visible = false;
        this._scrollSetContainer.visible = false;
        this.videoCanvas_mc.visible = false;
        this.bMap.visible = false;
    }

    private UpdateShowList(param1: Vector<SiegeWeapon>): void {
        let _loc2_: int = 0;
        let _loc5_: SiegeBuildingPopup_ListItem_CLIP = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: MovieClip = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        while (_loc3_ < param1.length) {
            if (_loc4_ >= this._siegeWeaponRows.length) {
                this._siegeWeaponRows.push(new SiegeBuildingPopup_ListItem_CLIP());
                this.weaponContainer_mc.addChild(as3.vget(this._siegeWeaponRows, _loc4_));
                as3.vget(this._siegeWeaponRows, _loc4_).y = as3.vget(this._siegeWeaponRows, 0).height * _loc4_;
                as3.vget(this._siegeWeaponRows, _loc4_).addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickListItem));
                as3.vget(this._siegeWeaponRows, _loc4_).mouseChildren = false;
                as3.vget(this._siegeWeaponRows, _loc4_).buttonMode = true;
                as3.vget(this._siegeWeaponRows, _loc4_).enableHandCursor = true;
            }
            (_loc5_ = as3.vget(this._siegeWeaponRows, _loc4_)).tLabel.htmlText = "<b>" + as3.vget(param1, _loc3_).name + "</b>";
            _loc5_.gotoAndStop(this._currentWeapon == as3.vget(param1, _loc3_) ? 2 : 1);
            _loc5_.siegeWeapon = as3.vget(param1, _loc3_);
            ImageCache.GetImageWithCallBack(as3.str(_loc5_.siegeWeapon.icon), as3.bind(this, this.onIconImageLoaded), true, 1, "", [_loc5_.mcImage]);
            if (this._tab == "lab" && GLOBAL._bSiegeLab && GLOBAL._bSiegeLab.IsUpgrading(as3.vget(param1, _loc3_))) {
                if (as3.vget(param1, _loc3_).level <= 0) {
                    _loc5_.tDescription.htmlText = KEYS.Get("msg_unlocking");
                    _loc5_.tDescription.visible = true;
                } else {
                    _loc5_.tDescription.visible = false;
                }
                _loc6_ = GLOBAL._bSiegeLab.UpgradeTimeLeft(as3.vget(param1, _loc3_));
                _loc7_ = GLOBAL._bSiegeLab.UpgradeTimeTotal(as3.vget(param1, _loc3_));
                _loc5_.mcTime.mcBar.width = (1 - _loc6_ / _loc7_) * (_loc5_.mcTime.width / _loc5_.mcTime.scaleX);
                _loc5_.tTime.htmlText = GLOBAL.ToTime(_loc6_);
                _loc5_.mcTime.visible = true;
                _loc5_.tTime.visible = true;
            } else if (this._tab == "factory" && GLOBAL._bSiegeFactory && GLOBAL._bSiegeFactory.IsUpgrading(as3.vget(param1, _loc3_))) {
                _loc5_.tDescription.visible = false;
                _loc6_ = GLOBAL._bSiegeFactory.UpgradeTimeLeft(as3.vget(param1, _loc3_));
                _loc7_ = GLOBAL._bSiegeFactory.UpgradeTimeTotal(as3.vget(param1, _loc3_));
                _loc5_.mcTime.mcBar.width = (1 - _loc6_ / _loc7_) * (_loc5_.mcTime.width / _loc5_.mcTime.scaleX);
                _loc5_.tTime.htmlText = GLOBAL.ToTime(_loc6_);
                _loc5_.mcTime.visible = true;
                _loc5_.tTime.visible = true;
            } else {
                if (this._tab == "lab" && _loc5_.siegeWeapon.level <= 0) {
                    _loc5_.tDescription.htmlText = KEYS.Get("msg_locked");
                    _loc5_.tDescription.visible = true;
                } else {
                    _loc5_.tDescription.visible = false;
                }
                _loc5_.mcTime.visible = false;
                _loc5_.tTime.visible = false;
            }
            if (this._tab == "factory" && _loc5_.siegeWeapon.quantity > 0) {
                _loc5_.tReady.htmlText = KEYS.Get("msg_ready");
                _loc5_.tReady.visible = true;
            } else {
                _loc5_.tReady.visible = false;
            }
            if (this._tab == "lab" && _loc5_.siegeWeapon.level >= SiegeWeapon.MAX_LEVEL) {
                _loc5_.tReady.htmlText = "<b>" + KEYS.Get("msg_fullyupgraded") + "</b>";
                _loc5_.tReady.visible = true;
            }
            if (_loc5_.tDescription.visible) {
                _loc2_ = 0;
                while (_loc2_ < SiegeWeapon.MAX_LEVEL) {
                    (as3.as(_loc5_["star" + (_loc2_ + 1)], MovieClip)).visible = false;
                    _loc2_++;
                }
            } else {
                _loc2_ = 0;
                while (_loc2_ < SiegeWeapon.MAX_LEVEL) {
                    (_loc8_ = as3.cast(_loc5_["star" + (_loc2_ + 1)], MovieClip)).gotoAndStop(_loc2_ < as3.vget(param1, _loc3_).level ? "on" : "off");
                    _loc8_.visible = true;
                    _loc2_++;
                }
            }
            _loc4_++;
            _loc3_++;
        }
        this._scrollSet.ContainerHeight = as3.vget(this._siegeWeaponRows, 0).height * _loc4_;
        while (_loc4_ < this._siegeWeaponRows.length) {
            this.weaponContainer_mc.removeChild(as3.cast(this._siegeWeaponRows.pop(), DisplayObject));
        }
        this.weaponContainer_mc.visible = true;
        this.weaponContainer_frame.visible = true;
        this.weaponContainer_mask.visible = true;
        this._scrollSetContainer.visible = true;
        this._scrollSet.Update();
    }

    private onClickListItem(param1: MouseEvent): void {
        let _loc2_: SiegeBuildingPopup_ListItem_CLIP = as3.as(param1.currentTarget, SiegeBuildingPopup_ListItem_CLIP);
        this._currentWeapon = as3.cast(_loc2_.siegeWeapon, SiegeWeapon);
        this.Update();
    }

    private onPreviewImageLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc5_: Bitmap = null;
        if (param1 != this._currentPreviewUrl) {
            return;
        }
        let _loc4_: MovieClip = null;
        _loc4_ = as3.cast(param3[0], MovieClip);
        if (_loc4_) {
            while (_loc4_.numChildren > 0) {
                _loc4_.removeChildAt(0);
            }
            (_loc5_ = new Bitmap(param2)).width = this._PREVIEW_WIDTH;
            _loc5_.height = this._PREVIEW_HEIGHT;
            _loc4_.addChild(_loc5_);
            _loc4_.visible = true;
        }
    }

    private onIconImageLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc5_: Bitmap = null;
        let _loc4_: MovieClip = null;
        _loc4_ = as3.cast(param3[0], MovieClip);
        if (_loc4_) {
            while (_loc4_.numChildren > 0) {
                _loc4_.removeChildAt(0);
            }
            _loc5_ = new Bitmap(param2);
            _loc5_.width = _loc5_.height = 50;
            _loc4_.addChild(_loc5_);
            _loc4_.visible = true;
        }
    }

    private UpdateShowCurrentWeapon(): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        this.tTitle.htmlText = "<b>" + this._currentWeapon.name + "</b>";
        if (this._currentWeapon.quantity > 0 && this._tab == "factory") {
            this.tTitleReady.htmlText = KEYS.Get("msg_ready");
            this.tTitleReady.visible = true;
        } else {
            this.tTitleReady.visible = false;
        }
        this.tDesc.htmlText = this._currentWeapon.description;
        this.videoCanvas_mc.visible = true;
        this.tTitle.visible = true;
        this.tDesc.visible = true;
        let _loc1_: Vector<SiegeWeaponProperty> = this._currentWeapon.getProperties();
        let _loc2_: int = 0;
        while (_loc2_ < 3 && _loc2_ < _loc1_.length) {
            as3.vget(this._statLabels, _loc2_).htmlText = "<b>" + as3.vget(_loc1_, _loc2_).label + "</b>";
            as3.vget(this._statLabels, _loc2_).visible = true;
            if (this._currentWeapon.level == 0) {
                as3.vget(this._statBarTexts, _loc2_).htmlText = GLOBAL.FormatNumber(Number(as3.vget(_loc1_, _loc2_).getValueForLevel((this._currentWeapon.level + 1) | 0)));
                as3.vget(this._statBars, _loc2_).mcBar.width = 0;
                as3.vget(this._statBars, _loc2_).mcBar2.width = as3.vget(_loc1_, _loc2_).getProgressForLevel((this._currentWeapon.level + 1) | 0) * this._maxStatBarWidth;
            } else if (this._tab == "lab") {
                if (this._currentWeapon.level >= SiegeWeapon.MAX_LEVEL) {
                    as3.vget(this._statBars, _loc2_).mcBar.width = as3.vget(_loc1_, _loc2_).getProgressForLevel(SiegeWeapon.MAX_LEVEL) * this._maxStatBarWidth;
                    as3.vget(this._statBarTexts, _loc2_).htmlText = GLOBAL.FormatNumber(Number(as3.vget(_loc1_, _loc2_).getValueForLevel(SiegeWeapon.MAX_LEVEL)));
                    as3.vget(this._statBars, _loc2_).mcBar2.width = 0;
                } else {
                    as3.vget(this._statBars, _loc2_).mcBar.width = as3.vget(_loc1_, _loc2_).getProgressForLevel(this._currentWeapon.level) * this._maxStatBarWidth;
                    _loc3_ = as3.vget(_loc1_, _loc2_).getValueForLevel(this._currentWeapon.level) | 0;
                    if ((_loc4_ = (as3.vget(_loc1_, _loc2_).getValueForLevel((this._currentWeapon.level + 1) | 0) - _loc3_) | 0) < 0) {
                        as3.vget(this._statBarTexts, _loc2_).htmlText = GLOBAL.FormatNumber(_loc3_) + " (" + GLOBAL.FormatNumber(_loc4_) + ")";
                    } else if (_loc4_ > 0) {
                        as3.vget(this._statBarTexts, _loc2_).htmlText = GLOBAL.FormatNumber(_loc3_) + " (+" + GLOBAL.FormatNumber(_loc4_) + ")";
                    } else {
                        as3.vget(this._statBarTexts, _loc2_).htmlText = GLOBAL.FormatNumber(_loc3_);
                    }
                    as3.vget(this._statBars, _loc2_).mcBar2.width = as3.vget(_loc1_, _loc2_).getProgressForLevel((this._currentWeapon.level + 1) | 0) * this._maxStatBarWidth;
                }
            } else {
                as3.vget(this._statBars, _loc2_).mcBar.width = as3.vget(_loc1_, _loc2_).getProgressForLevel(this._currentWeapon.level) * this._maxStatBarWidth;
                as3.vget(this._statBarTexts, _loc2_).htmlText = GLOBAL.FormatNumber(Number(as3.vget(_loc1_, _loc2_).getValueForLevel(this._currentWeapon.level)));
                as3.vget(this._statBars, _loc2_).mcBar2.width = 0;
            }
            as3.vget(this._statBarTexts, _loc2_).visible = true;
            as3.vget(this._statBars, _loc2_).visible = true;
            _loc2_++;
        }
        if (this._tab == "lab") {
            this.UpdateShowCurrentWeaponLab();
        } else if (this._tab == "factory") {
            this.UpdateShowCurrentWeaponFactory();
        }
    }

    private UpdateShowCurrentWeaponLab(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        if (GLOBAL._bSiegeLab.IsUpgrading(this._currentWeapon)) {
            _loc1_ = GLOBAL._bSiegeLab.UpgradeTimeLeft(this._currentWeapon);
            _loc2_ = GLOBAL._bSiegeLab.UpgradeTimeTotal(this._currentWeapon);
            _loc3_ = 1 - _loc1_ / _loc2_;
            _loc4_ = GLOBAL._bSiegeLab.getInstantUpgradeCost(this._currentWeapon.weaponID);
            this.mcInstant.bAction.Setup(KEYS.Get("btn_finishnow"));
            this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("siege_shiny", { "v1": _loc4_ }) + "</b>";
            this.mcTimeTxt.htmlText = "<b>" + GLOBAL.ToTime(_loc1_, true, false) + "</b>";
            this.mcTime.mcBar.width = this._maxTimeBarWidth * _loc3_;
            this.mcTimeTxt.visible = true;
            this.mcTime.visible = true;
            this.bCancel.visible = true;
            this.mcInstant.visible = true;
        } else if (this._currentWeapon.level < SiegeWeapon.MAX_LEVEL) {
            if (GLOBAL._bSiegeLab.upgradingWeapon) {
                this.tWarning.htmlText = KEYS.Get("msg_oneweaponupgrade", { "v1": GLOBAL._bSiegeLab.upgradingWeapon.name });
                this.tWarning.visible = true;
            } else if (GLOBAL._bSiegeLab._lvl.Get() - 1 < this._currentWeapon.level) {
                this.tWarning.htmlText = KEYS.Get("msg_upgraderequiredlevel", { "v1": GLOBAL._bSiegeLab.name, "v2": this._currentWeapon.level + 1 });
                this.tWarning.visible = true;
            } else {
                this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": this._currentWeapon.instantUpgradeCost }));
                if (this._currentWeapon.level == 0) {
                    this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("msg_unlockinstant") + "</b>";
                    this.mcResources.bAction.SetupKey("btn_startunlocking");
                } else {
                    this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("msg_upgradeinstant") + "</b>";
                    this.mcResources.bAction.SetupKey("btn_startupgrade");
                }
                this.mcInstant.visible = true;
                this.UpdateShowCurrentCosts();
            }
        }
    }

    private UpdateShowCurrentWeaponFactory(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        if (GLOBAL._bSiegeFactory.IsUpgrading(this._currentWeapon)) {
            _loc1_ = GLOBAL._bSiegeFactory.UpgradeTimeLeft(this._currentWeapon);
            _loc2_ = GLOBAL._bSiegeFactory.UpgradeTimeTotal(this._currentWeapon);
            _loc3_ = 1 - _loc1_ / _loc2_;
            _loc4_ = GLOBAL._bSiegeFactory.getInstantUpgradeCost(this._currentWeapon.weaponID);
            this.mcInstant.bAction.Setup("<b>" + KEYS.Get("btn_finishnow") + "</b>");
            this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("siege_shiny", { "v1": _loc4_ }) + "</b>";
            this.mcTimeTxt.htmlText = "<b>" + GLOBAL.ToTime(_loc1_, true, false) + "</b>";
            this.mcTime.mcBar.width = this._maxTimeBarWidth * _loc3_;
            this.mcTimeTxt.visible = true;
            this.mcTime.visible = true;
            this.bCancel.visible = true;
            this.mcInstant.visible = true;
        } else if (this._currentWeapon.quantity > 0) {
            this.bMap.visible = true;
        } else if (GLOBAL._bSiegeFactory.upgradingWeapon) {
            this.tWarning.htmlText = KEYS.Get("msg_oneweapon", { "v1": GLOBAL._bSiegeFactory.upgradingWeapon.name });
            this.tWarning.visible = true;
        } else if (SiegeWeapons.availableWeapon) {
            this.tWarning.htmlText = KEYS.Get("msg_oneweapon", { "v1": SiegeWeapons.availableWeapon.name });
            this.tWarning.visible = true;
        } else {
            this.mcInstant.bAction.Setup("<b>" + KEYS.Get("btn_useshiny", { "v1": this._currentWeapon.instantBuildCost }) + "</b>");
            this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("msg_buildinstant") + "</b>";
            this.mcResources.bAction.SetupKey("btn_startbuilding");
            this.mcInstant.visible = true;
            this.UpdateShowCurrentCosts();
        }
    }

    public UpdateShowCurrentCosts(): void {
        let id: string = null;
        let i: int = 0;
        let j: int = 0;
        let text: string = null;
        let costIds: Vector<string> = new Vector<string>(0, false, String);
        let costs: any = this._tab == "factory" ? this._currentWeapon.buildCosts : this._currentWeapon.upgradeCosts;
        for (id in costs) {
            costIds.push(id);
        }
        as3.sort(costIds, (param1: string, param2: string): number => {
            return param1 == "time" ? 1 : (param2 == "time" ? -1 : (param1 < param2 ? -1 : 1));
        });
        i = 0;
        j = 0;
        while (i < costIds.length && j < this._resourceCosts.length) {
            id = as3.vget(costIds, i);
            if (costs[id] > 0) {
                as3.vget(this._resourceCosts, j).gotoAndStop(GLOBAL.getResourceFrame(id, true));
                as3.vget(this._resourceCosts, j).tTitle.htmlText = "<b>" + GLOBAL.getResourceName(id, true) + "</b>";
                if (id == "time") {
                    text = GLOBAL.ToTime(costs[id] | 0, true, false);
                } else {
                    text = GLOBAL.FormatNumber(Number(costs[id]));
                }
                if (Boolean(BASE._iresources[id]) && BASE._iresources[id].Get() < costs[id]) {
                    text = "<b><font color=\'#FF0000\'>" + text + "</font></b>";
                } else {
                    text = "<b>" + text + "</b>";
                }
                as3.vget(this._resourceCosts, j).tValue.htmlText = text;
                as3.vget(this._resourceCosts, j).visible = true;
                j++;
            }
            i++;
        }
        while (j < this._resourceCosts.length) {
            as3.vget(this._resourceCosts, j).visible = false;
            j++;
        }
        this.mcResources.visible = true;
    }

    public Hide(): void {
        this._timer.stop();
        SiegeBuilding.Hide();
        this._videoStream.close();
    }

    private DoInstant(param1: MouseEvent = null): void {
        let ioCost: int = this._tab == "lab" ? GLOBAL._bSiegeLab.getInstantUpgradeCost(this._currentWeapon.weaponID) : (this._tab == "factory" ? GLOBAL._bSiegeFactory.getInstantUpgradeCost(this._currentWeapon.weaponID) : 0);
        if (!GLOBAL.ioConfirmShiny(ioCost, "to finish this now", (): void => {
            this.DoInstant(param1);
        })) {
            return;
        }
        if (this._tab == "lab") {
            if (GLOBAL._bSiegeLab.HasEnoughShinyToUpgrade(this._currentWeapon)) {
                GLOBAL._bSiegeLab.InstantUpgrade(this._currentWeapon.weaponID);
                this.mcInstant.bAction.Enabled = false;
                this.mcInstant.bAction.mouseEnabled = false;
            } else {
                POPUPS.DisplayGetShiny();
            }
        } else if (this._tab == "factory") {
            if (GLOBAL._bSiegeFactory.HasEnoughShinyToUpgrade(this._currentWeapon)) {
                GLOBAL._bSiegeFactory.InstantUpgrade(this._currentWeapon.weaponID);
                this.mcInstant.bAction.Enabled = false;
                this.mcInstant.bAction.mouseEnabled = false;
            } else {
                POPUPS.DisplayGetShiny();
            }
        }
        this.Update();
    }

    private DoResources(param1: MouseEvent): void {
        if (this._tab == "lab") {
            if (!this._currentWeapon.hasResourcesToUpgrade) {
                if (!this._currentWeapon.hasCapacityToUpgrade) {
                    GLOBAL.Message("<b>" + KEYS.Get("msg_morepodsunlock") + "</b>");
                } else {
                    GLOBAL.Message(KEYS.Get("buildoptions_err_moreresources", { "v1": GLOBAL.FormatNumber(this._currentWeapon.numResourcesToUpgradeNeeded), "v2": GLOBAL.FormatNumber(this._currentWeapon.instantUpgradeResourceCost) }), KEYS.Get("btn_getresources"), as3.bind(this._currentWeapon, this._currentWeapon.buyResourcesAndUpgrade));
                }
            } else {
                GLOBAL._bSiegeLab.StartUpgradingWeapon(this._currentWeapon.weaponID);
            }
        } else if (this._tab == "factory") {
            if (!this._currentWeapon.hasResourcesToBuild) {
                if (!this._currentWeapon.hasCapacityToBuild) {
                    GLOBAL.Message("<b>" + KEYS.Get("msg_morepodsunlock") + "</b>");
                } else {
                    GLOBAL.Message(KEYS.Get("buildoptions_err_moreresources", { "v1": GLOBAL.FormatNumber(this._currentWeapon.numResourcesToBuildNeeded), "v2": GLOBAL.FormatNumber(this._currentWeapon.instantBuildResourceCost) }), KEYS.Get("btn_getresources"), as3.bind(this._currentWeapon, this._currentWeapon.buyResourcesAndBuild));
                }
            } else {
                GLOBAL._bSiegeFactory.StartUpgradingWeapon(this._currentWeapon.weaponID);
            }
        }
        this.Update();
    }

    private CancelAction(param1: MouseEvent): void {
        let ActuallyCancel: Function = null;
        let e: MouseEvent = param1;
        ActuallyCancel = (): void => {
            if (this._tab == "lab") {
                GLOBAL._bSiegeLab.CancelUpgradingWeapon(this._currentWeapon.weaponID);
            } else if (this._tab == "factory") {
                GLOBAL._bSiegeFactory.CancelUpgradingWeapon(this._currentWeapon.weaponID);
            }
            this.Update();
        };
        if (this._tab == "lab") {
            GLOBAL.Message(KEYS.Get("msg_upgrade_confirmcancel", { "v1": this._currentWeapon.name }), KEYS.Get("msg_stopupgrading_btn"), ActuallyCancel);
        } else if (this._tab == "factory") {
            GLOBAL.Message(KEYS.Get("msg_build_confirmcancel", { "v1": this._currentWeapon.name }), KEYS.Get("btn_stopbuilding"), ActuallyCancel);
        }
    }

    private OpenMap(param1: MouseEvent): void {
        GLOBAL.ShowMap();
        this.Hide();
    }

    private SwitchToLab(param1: MouseEvent): void {
        this._tab = "lab";
        this.Update();
    }

    private SwitchToFactory(param1: MouseEvent): void {
        this._tab = "factory";
        this.Update();
    }

    public onTick(param1: TimerEvent): void {
        this.Update();
    }
}
