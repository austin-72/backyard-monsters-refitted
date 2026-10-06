import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, DisplayObjectContainer, IBitmapDrawable, Loader, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { URLRequest, navigateToURL } from "flash/net";
import { System } from "flash/system";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { Dictionary } from "flash/utils";
import { ALLIANCEWINDOW, ATTACK, AutoBankBaseBuff, BASE, BUY, BYMConfig, BaseBuff, BaseBuffHandler, Button_CLIP, CATAPULTPOPUP, CHAMPIONBUTTON, CHAMPIONCAGE, CREATUREBUTTON, CREATURELOCKER, CREATURES, ChampionBase, DealSpot, DescentDebuffPopup, Elastic, EnumYardType, GAME, GLOBAL, ImageCache, InstanceManager, IoAttackLogs, IoChangelog, IoDesigner, IoGauntlet, IoHfo, IoHfoUi, IoLeaderboards, IoOutpostsPopup, IoTestMode, KEYS, KOTHHUDGraphic, LOGGER, Linear, MAILBOX, MAPROOM_DESCENT, MapRoom3Cell, MapRoomManager, POPUPS, POWERUPS, ResourceOutpost, SIEGEWEAPONPOPUP, STORE, ScrollSetV, SiegeWeapons, SubscriptionHandler, TUTORIAL, TweenLite, UI_TOP_CLIP, UI_WORKERS, URLLoaderApi, YARD_PROPS, bubblepopup3, bubblepopup4, bubblepopupBuff, flingerLevel, io_invite_friends, io_switch_account, popup_generic, ui_buffIcon_CLIP } from "@game";

export class UI_TOP extends UI_TOP_CLIP {
    static {
        as3.fields(this, { _popupWarning: null, _popupBuff: null, _creatureButtons: null, _creatureButtonsMC: null, _bubbleDo: null, _catapult: null, _siegeweapon: null, _buttonIcons: null, _descentDebuff: null, extraResourceRows: 0, _dealspot: null, _resourceUI: null, _resourceR1: 0, _resourceR2: 0, _resourceR3: 0, _resourceR4: 0, _kothIcon: null, _daveClub: null, _RESOURCEBAR_HEIGHT: 37, m_creatureContainer: null, m_scrollBar: null, _ioTexts: null, _ioSwitch: null, _ioGauntlet: null, _ioHfo: null, _ioLeaderboards: null, _ioAttackLogs: null, _ioChangelog: null, _ioAlliances: null, _ioBars: null, _ioBarsCompact: -1, _ioAdmin: null, _ioDesigner: null, _ioDesignBar: null, _ioDesignBarFor: null, _ioTest: null, _ioTestShown: -1, _ioTools: null, _ioTestBanner: null });
    }

    public static readonly CREATUREBUTTONOVER: string = "creatureButtonOver";

    /** The counter's bar at its own size (drawn once), cut in three to stretch the middle only. */
    private static _ioBarArt: BitmapData = null;
    public _popupWarning: bubblepopup4;
    public _popupBuff: bubblepopupBuff;
    public _creatureButtons: any[];
    public _creatureButtonsMC: flingerLevel;
    public _bubbleDo: DisplayObject;
    public _catapult: CATAPULTPOPUP;
    public _siegeweapon: SIEGEWEAPONPOPUP;
    public _buttonIcons: any[];
    public _descentDebuff: DescentDebuffPopup;
    public extraResourceRows: int;
    public _dealspot: DealSpot;
    public _resourceUI: any;
    public _resourceR1: int;
    public _resourceR2: int;
    public _resourceR3: int;
    public _resourceR4: int;
    public _kothIcon: DisplayObject;
    public _daveClub: DisplayObject;
    private _RESOURCEBAR_HEIGHT: int;
    private m_creatureContainer: Sprite;
    private m_scrollBar: ScrollSetV;
    /** The text last set on each field (ioSetText). */
    private _ioTexts: Dictionary;
    private _ioSwitch: Sprite;
    private _ioGauntlet: MovieClip;
    private _ioHfo: MovieClip;
    // ---- Inferno-only: the top bar's shortcuts (the user's, 4 October, evening)
    //
    // Alliances, Attack Log, Leaderboard, Change Log, right of the Shiny counter, each drawn like that counter:
    // its stone bar behind (the counter's own art, stretched to fit), a picture on the left over the bar's end,
    // the name over the bar in the counter's lettering. On the player's own yards in build mode. A screen too
    // narrow for the names (on a phone: one reaching the page's menu button at the top centre) shows them as
    // badges, just their gold pictures with no names; the Shiny counter keeps its own. (They were small square badges until then, with no names;
    // there was no Alliances one.)
    private _ioLeaderboards: Sprite;
    private _ioAttackLogs: Sprite;
    private _ioChangelog: Sprite;
    private _ioAlliances: Sprite;
    /** The bars, in their order. */
    private _ioBars: any[];
    private _ioBarsCompact: int;
    private _ioAdmin: Button_CLIP;
    private _ioDesigner: Button_CLIP;
    private _ioDesignBar: Sprite;
    private _ioDesignBarFor: string;
    private _ioTest: Button_CLIP;
    private _ioTestShown: int;
    private _ioTools: Button_CLIP;
    private _ioTestBanner: TextField;

    public $ctor(): void {
        this._ioTexts = new Dictionary(true);
        let _loc1_: int = 0;
        let _loc3_: boolean = false;
        super.$ctor();
        let _loc2_: string = GLOBAL.mode;
        switch (GLOBAL.mode) {
            case GLOBAL.e_BASE_MODE.BUILD:
            case GLOBAL.e_BASE_MODE.IBUILD:
                _loc2_ = GLOBAL.e_BASE_MODE.BUILD;
                break;
            case GLOBAL.e_BASE_MODE.ATTACK:
            case GLOBAL.e_BASE_MODE.IATTACK:
                _loc2_ = GLOBAL.e_BASE_MODE.ATTACK;
                break;
            case GLOBAL.e_BASE_MODE.WMATTACK:
            case GLOBAL.e_BASE_MODE.IWMATTACK:
                _loc2_ = GLOBAL.e_BASE_MODE.WMATTACK;
                break;
            case GLOBAL.e_BASE_MODE.VIEW:
            case GLOBAL.e_BASE_MODE.IVIEW:
                _loc2_ = GLOBAL.e_BASE_MODE.VIEW;
                break;
            case GLOBAL.e_BASE_MODE.HELP:
            case GLOBAL.e_BASE_MODE.IHELP:
                _loc2_ = GLOBAL.e_BASE_MODE.HELP;
                break;
            case GLOBAL.e_BASE_MODE.WMVIEW:
            case GLOBAL.e_BASE_MODE.IWMVIEW:
                _loc2_ = MapRoomManager.instance.isInMapRoom3 ? (_loc2_ = GLOBAL.e_BASE_MODE.ATTACK) : GLOBAL.e_BASE_MODE.WMVIEW;
        }
        if (MapRoomManager.instance.isInMapRoom3 && (GLOBAL.mode === GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode === GLOBAL.e_BASE_MODE.WMVIEW)) {
            this.gotoAndStop(GLOBAL.e_BASE_MODE.ATTACK);
        } else if (GLOBAL.INFERNO_ONLY) {
            // The top bar art has one frame per load mode, and the Inferno ones ("ibuild", "iattack"...)
            // carry the bone / coal / sulfur / magma icons. They hold the same named parts as the
            // overworld frames, so only the artwork changes.
            this.gotoAndStop("i" + GLOBAL._loadmode);
        } else {
            this.gotoAndStop(GLOBAL._loadmode);
        }
        if (this.mc && this.mc.mcPoints) {
            this.mc.mcPoints.stop();
        }
        if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IBUILD) {
            this.setupBuildMode();
        } else if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK) {
            this.setupAttackMode();
        } else if (MapRoomManager.instance.isInMapRoom3 && (GLOBAL.mode === GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode === GLOBAL.e_BASE_MODE.WMVIEW)) {
            this.setupScoutMode();
        } else {
            this.DescentDebuffHide();
        }
        this.Update();
    }

    private setupBuildMode(): void {
        let _loc1_: int = 0;
        this.mc.mcPoints.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.InfoShow));
        this.mc.mcPoints.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.InfoHide));
        _loc1_ = 1;
        while (_loc1_ < 5) {
            this.mc["mcR" + _loc1_].mcHit.addEventListener(MouseEvent.MOUSE_OVER, this.StatsShow(_loc1_, false));
            this.mc["mcR" + _loc1_].mcHit.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.StatsHide));
            this.mc["mcR" + _loc1_].bAdd.addEventListener(MouseEvent.CLICK, this.Topup(_loc1_));
            this.mc["mcR" + _loc1_].bAdd.buttonMode = true;
            this.mc["mcR" + _loc1_].bAdd.mouseEnabled = true;
            this.mc["mcR" + _loc1_].bAdd.mouseChildren = false;
            _loc1_++;
        }
        this._resourceUI = {};
        this._resourceUI.r1 = BASE._resources["r" + 1].Get();
        this._resourceUI.r2 = BASE._resources["r" + 2].Get();
        this._resourceUI.r3 = BASE._resources["r" + 3].Get();
        this._resourceUI.r4 = BASE._resources["r" + 4].Get();
        this.mc["mcR" + 1]._resource = BASE._resources["r" + 1].Get();
        this.mc["mcR" + 2]._resource = BASE._resources["r" + 2].Get();
        this.mc["mcR" + 3]._resource = BASE._resources["r" + 3].Get();
        this.mc["mcR" + 4]._resource = BASE._resources["r" + 4].Get();
        this.mc.mcR5.bAdd.txtAdd.autoSize = TextFieldAutoSize.LEFT;
        this.mc.mcR5.bAdd.txtAdd.htmlText = KEYS.Get("ui_topaddshiny");
        this.mc.mcR5.bAdd.mcBG.width = this.mc.mcR5.bAdd.txtAdd.width + 11;
        this.mc.mcR5.mcBG.width = 82 + this.mc.mcR5.bAdd.width;
        // mc.mcR5.bAdd.addEventListener(MouseEvent.CLICK,BUY.Show);
        this.mc.mcR5.bAdd.addEventListener(MouseEvent.CLICK, (event: MouseEvent): void => {
            GLOBAL.Message(KEYS.Get("disabled_addshiny"));
        });
        this.mc.mcR5.bAdd.buttonMode = true;
        this.mc.mcR5.bAdd.mouseChildren = false;
        if (GLOBAL.INFERNO_ONLY) {
            // Shiny cannot be bought here, and the button only said so: hide it and fit the counter.
            this.mc.mcR5.bAdd.visible = false;
            this.mc.mcR5.mcBG.width = 82;
        }
        this.mc.mcOutposts.mcHit.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
        this.mc.mcOutposts.mcHit.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
        this.mc.mcOutposts.bNext.addEventListener(MouseEvent.CLICK, UI_TOP.ioNextClick);
        this.mc.mcOutposts.bNext.buttonMode = true;
        this.mc.mcOutposts.bNext.mouseEnabled = true;
        this.mc.mcOutposts.bNext.mouseChildren = false;
        this.mc.bInvite.buttonMode = true;
        this.mc.bInvite.mouseChildren = false;
        this.mc.bInvite.addEventListener(MouseEvent.CLICK, this.ButtonClick("invite"));
        this.mc.bInvite.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
        this.mc.bInvite.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
        this.mc.bGift.buttonMode = true;
        this.mc.bGift.mouseChildren = false;
        this.mc.bGift.addEventListener(MouseEvent.CLICK, this.ButtonClick("gift"));
        this.mc.bGift.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
        this.mc.bGift.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
        this.mc.bInbox.buttonMode = true;
        this.mc.bInbox.mouseChildren = false;
        this.mc.bInbox.addEventListener(MouseEvent.CLICK, this.ButtonClick("inbox"));
        this.mc.bInbox.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
        this.mc.bInbox.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
        this.mc.bAlert.buttonMode = true;
        this.mc.bAlert.mouseChildren = false;
        this.mc.bAlert.addEventListener(MouseEvent.CLICK, this.ButtonClick("alert"));
        this.mc.bAlert.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
        this.mc.bAlert.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
        this._buttonIcons = [];
        this._buttonIcons = [this.mc.bInvite, this.mc.bGift, this.mc.bInbox, this.mc.bAlert];
        if (GLOBAL.INFERNO_ONLY) {
            // (not in the icon row: it sits in the workers' column, under the fifth, UI_WORKERS)
            this.ioMakeGauntletButton();
            this.ioMakeHfoButton();
        }
        // Server flag io_hideui: a comma separated list of top-bar buttons this server has no use
        // for ("invite", "gift"). The icon row lays itself out from whichever buttons are visible.
        if (GLOBAL.ioUiHidden("invite")) {
            this.mc.bInvite.visible = false;
        }
        if (GLOBAL.ioUiHidden("gift") && !GLOBAL.INFERNO_ONLY) {
            // On inferno-only servers the gift button is the Daily Reward button (ioDailyButton).
            this.mc.bGift.visible = false;
        }
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onSpinnerTick));
        this.mc.bEarn.bAction.tLabel.htmlText = KEYS.Get("btn_earn");
        if (GLOBAL._flags.showFBCEarn == 1) {
            this.mc.bEarn.buttonMode = true;
            this.mc.bEarn.mouseChildren = false;
            this.mc.bEarn.addEventListener(MouseEvent.CLICK, this.ButtonClick("earn"));
            this.mc.bEarn.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
            this.mc.bEarn.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
        } else {
            this.mc.bEarn.mouseChildren = false;
            this.mc.bEarn.mouseEnabled = false;
            this.mc.bEarn.visible = false;
        }
        this.mc.bDailyDeal.tLabel.htmlText = KEYS.Get("btn_dailydeal");
        if (GLOBAL._flags.showFBCDaily == 1) {
            this.mc.bDailyDeal.buttonMode = true;
            this.mc.bDailyDeal.mouseChildren = false;
            this.mc.bDailyDeal.addEventListener(MouseEvent.CLICK, this.ButtonClick("daily"));
            this.mc.bDailyDeal.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
            this.mc.bDailyDeal.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            if (GLOBAL._flags.showFBCEarn == 0) {
                this.mc.bDailyDeal.x = this.mc.bEarn.x;
            }
        } else {
            this.mc.bDailyDeal.mouseChildren = false;
            this.mc.bDailyDeal.mouseEnabled = false;
            this.mc.bDailyDeal.visible = false;
        }
    }

    private onSpinnerTick(e: Event): void {
        for (let btn of as3.values(this._buttonIcons)) {
            if (btn && btn.mcSpinner && btn.mcSpinner.visible) {
                btn.mcSpinner.rotation += 4;
            }
        }
        if (this._ioGauntlet && this._ioGauntlet.mcSpinner && this._ioGauntlet.mcSpinner.visible) {
            this._ioGauntlet.mcSpinner.rotation += 4;
        }
    }

    private setupScoutMode(): void {
        let _loc1_: MovieClip = null;
        let _loc2_: int = 0;
        this.setupAttackMode();
        if (!GLOBAL._attackersFlinger) {
            this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_flinger");
        } else {
            this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("monster_limit") : KEYS.Get("attack_flingerbar");
        }
        this._creatureButtonsMC._mc._txtContainer.mcBar.visible = false;
        this._creatureButtonsMC._mc._txtContainer.tA.htmlText = "";
        _loc2_ = 1;
        while (_loc2_ < 5) {
            _loc1_ = as3.cast(this.mc["mcR" + _loc2_], MovieClip);
            _loc1_.visible = false;
            _loc2_++;
        }
    }

    private setupAttackMode(): void {
        let _loc1_: any[] = null;
        let _loc2_: Sprite = null;
        this._creatureButtonsMC = as3.as(this.mc.addChild(new flingerLevel()), flingerLevel);
        this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("txt_flinger_capacity");
        // Inferno-only: the text is "Flinger Capacity: #v1#%" and the number has its own field (tA), so the
        // unfilled "#v1#%" wrapped onto a second line showing under the label in every attack
        if (GLOBAL.INFERNO_ONLY) {
            this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("txt_flinger_capacity").split("#v1#")[0].replace(/\s+$/, "");
        }
        this._creatureButtonsMC._mc._txtContainer.mcBar.visible = true;
        this._creatureButtonsMC._mc._txtContainer.tA.htmlText = "0%";
        this._creatureButtonsMC.y = 180;
        this._creatureButtonsMC._mc.x = 2;
        this._creatureButtonsMC._mc.y = -6;
        this._creatureButtons = [];
        if (!GLOBAL._attackersFlinger) {
            this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_flinger");
            this._creatureButtonsMC._mc._txtContainer.tA.htmlText = "";
            this._creatureButtonsMC._mc._bottomBar.visible = false;
        } else {
            this.m_creatureContainer = new Sprite();
            this._creatureButtonsMC.addChild(this.m_creatureContainer);
            _loc1_ = this.setupChampionButtons(this.m_creatureContainer);
            this.setupCreatureButtons(this.m_creatureContainer, _loc1_[0] | 0, _loc1_[1] | 0);
            if (this.m_creatureContainer.numChildren == 0) {
                this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_monsters");
                this._creatureButtonsMC._mc._bottomBar.visible = false;
            }
            _loc2_ = new Sprite();
            _loc2_.graphics.beginFill(16777215, 1);
            _loc2_.graphics.drawRect(0, 22, 200, GLOBAL._SCREEN.height - 476);
            _loc2_.graphics.endFill();
            _loc2_.mouseEnabled = false;
            _loc2_.mouseChildren = false;
            this._creatureButtonsMC.addChild(_loc2_);
            this.m_creatureContainer.mask = _loc2_;
            this.m_scrollBar = new ScrollSetV(this.m_creatureContainer, _loc2_, true);
            this.m_scrollBar.x = 202 - this.m_scrollBar.width;
            this.m_scrollBar.y = 22;
            this._creatureButtonsMC.addChild(this.m_scrollBar);
        }
        if (SiegeWeapons.availableWeapon != null && !BASE.isInfernoMainYardOrOutpost) {
            this._siegeweapon = new SIEGEWEAPONPOPUP();
            this.mc.addChild(this._siegeweapon);
            this._siegeweapon.x = 442;
            this._siegeweapon.y = 20;
            this._siegeweapon.Setup(!GLOBAL.isInAttackMode);
        }
        if (GLOBAL._attackersCatapult > 0 && (GLOBAL.INFERNO_ONLY || !BASE.isInfernoMainYardOrOutpost)) {
            this._catapult = new CATAPULTPOPUP();
            this.mc.addChild(this._catapult);
            this._catapult.x = 350;
            this._catapult.y = 20;
            this._catapult.Setup(!GLOBAL.isInAttackMode);
        }
    }

    private setupScrollMenu(): void {
        this.m_creatureContainer = new Sprite();
        this._creatureButtonsMC.addChild(this.m_creatureContainer);
        let _loc1_: any[] = this.setupChampionButtons(this.m_creatureContainer);
        this.setupCreatureButtons(this.m_creatureContainer, _loc1_[0] | 0, _loc1_[1] | 0);
        if (this.m_creatureContainer.numChildren == 0) {
            this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_monsters");
            this._creatureButtonsMC._mc._bottomBar.visible = false;
        }
        let _loc2_: Sprite = new Sprite();
        _loc2_.graphics.beginFill(16777215, 1);
        _loc2_.graphics.drawRect(0, 22, 200, GLOBAL._SCREEN.height - 476);
        _loc2_.graphics.endFill();
        _loc2_.mouseEnabled = false;
        _loc2_.mouseChildren = false;
        this._creatureButtonsMC.addChild(_loc2_);
        this.m_creatureContainer.mask = _loc2_;
        let _loc3_: ScrollSetV = new ScrollSetV(this.m_creatureContainer, _loc2_, true);
        _loc3_.x = 202 - _loc3_.width;
        _loc3_.y = 22;
        this._creatureButtonsMC.addChild(_loc3_);
    }

    private setupChampionButtons(param1: DisplayObjectContainer): any[] {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: boolean = false;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: MovieClip = null;
        let _loc2_: int = GLOBAL._playerGuardianData.length | 0;
        while (_loc7_ < _loc2_) {
            if (Boolean(as3.vget(GLOBAL._playerGuardianData, _loc7_)) && as3.vget(GLOBAL._playerGuardianData, _loc7_).hp.Get() > 0) {
                if ((_loc6_ = !(!as3.vget(GLOBAL._playerGuardianData, _loc7_).status) ? as3.vget(GLOBAL._playerGuardianData, _loc7_).status | 0 : ChampionBase.k_CHAMPION_STATUS_NORMAL) == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                    if (_loc5_ && as3.vget(GLOBAL._playerGuardianData, _loc7_).t != 5) {
                        LOGGER.Log("log", "User is initializing combat with more than one normal champ.");
                    } else if (GLOBAL._loadmode == GLOBAL.mode || GLOBAL._loadmode != GLOBAL.mode && !MAPROOM_DESCENT.DescentPassed) {
                        if (as3.vget(GLOBAL._playerGuardianData, _loc7_).t != 5) {
                            _loc5_ = true;
                        }
                        (_loc8_ = as3.as(param1.addChild(new CHAMPIONBUTTON("G" + as3.vget(GLOBAL._playerGuardianData, _loc7_).t, as3.vget(GLOBAL._playerGuardianData, _loc7_).l.Get() | 0, _loc7_, _loc3_, this._creatureButtonsMC)), CHAMPIONBUTTON)).x = 14;
                        _loc8_.y = 34 + _loc3_ * 53;
                        _loc8_.addEventListener(UI_TOP.CREATUREBUTTONOVER, as3.bind(this, this.sortCreatureButtons));
                        this._creatureButtons.push(_loc8_);
                        _loc3_++;
                        _loc4_++;
                    }
                }
            }
            _loc7_++;
        }
        if (_loc8_) {
            this._creatureButtonsMC._mc._bottomBar.y = Math.min(GLOBAL._SCREEN.height - 450, _loc8_.y + _loc8_.height - this._creatureButtonsMC._mc._bottomBar.height * 0.8);
        }
        return [_loc3_, _loc4_];
    }

    private setupCreatureButtons(param1: DisplayObjectContainer, param2: int, param3: int): void {
        let _loc6_: string = null;
        let _loc7_: int = 0;
        let _loc8_: MovieClip = null;
        let _loc9_: any[] = null;
        let _loc10_: string = null;
        let _loc4_: any = CREATURELOCKER._creatures;
        let _loc5_: boolean = MapRoomManager.instance.isInMapRoom3;
        for (_loc6_ in _loc4_) {
            _loc7_ = Number(_loc6_.substr(_loc6_.length - 1)) | 0;
            _loc9_ = ATTACK._curCreaturesAvailable;
            if (ATTACK._curCreaturesAvailable[_loc6_]) {
                _loc10_ = _loc6_;
                if (ATTACK._curCreaturesAvailable[_loc10_] > 0) {
                    (_loc8_ = as3.as(param1.addChild(new CREATUREBUTTON(_loc10_, param2, this._creatureButtonsMC)), CREATUREBUTTON)).x = 14;
                    _loc8_.y = 34 + param2 * 53;
                    if (MapRoomManager.instance.isInMapRoom2or3) {
                        _loc8_.addEventListener(UI_TOP.CREATUREBUTTONOVER, as3.bind(this, this.sortCreatureButtons));
                    }
                    this._creatureButtons.push(_loc8_);
                    param2++;
                }
            }
        }
        if (_loc8_) {
            this._creatureButtonsMC._mc._bottomBar.y = Math.min(GLOBAL._SCREEN.height - 450, _loc8_.y + _loc8_.height - this._creatureButtonsMC._mc._bottomBar.height * 0.8);
        }
    }

    private sortCreatureButtons(param1: Event = null): void {
        this._creatureButtonsMC.addChild(as3.as(param1.target, DisplayObject));
    }

    private InfoShow(param1: MouseEvent): void {
        this.mc.mcPoints.gotoAndStop(2);
        let _loc2_: any = BASE.BaseLevel();
        this.mc.mcPoints.tInfo.htmlText = KEYS.Get("pop_experiencebar", { "v1": GLOBAL.FormatNumber(Number(_loc2_.points)), "v2": GLOBAL.FormatNumber(Number(_loc2_.needed)), "v3": _loc2_.level + 1 });
    }

    private InfoHide(param1: MouseEvent): void {
        this.mc.mcPoints.gotoAndStop(1);
    }

    public resize(param1: Rectangle): void {
        let _loc2_: uint = 0;
        let _loc3_: uint = 0;
        this.x = param1.x + 10;
        this.y = param1.y + 4;
        this.mcProtected.x = param1.width - 125;
        this.mcReinforcements.x = param1.width - 125;
        this.mcSpecialEvent.x = param1.width - 125;
        this.mcBuffHolder.x = param1.width - 200;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            this.mcZoom.x = param1.width - 38 - 24;
            this.mcFullscreen.x = param1.width - 38;
            this.mcSound.x = param1.width - 38 - 24;
            this.mcMusic.x = param1.width - 38;
            this.mcSave.x = param1.width - 38 - 24;
        } else {
            this.mcZoom.x = param1.width - 130;
            this.mcFullscreen.x = param1.width - 100;
            this.mcSound.x = param1.width - 70;
            this.mcMusic.x = param1.width - 40;
            this.mcSave.x = param1.width - 160;
        }
        if (this._descentDebuff) {
            this._descentDebuff.x = param1.width - 160;
        }
        this.ioSwitchButton();
        if (this.m_creatureContainer) {
            _loc2_ = this._creatureButtons.length;
            if (_loc2_) {
                while (_loc3_ < _loc2_) {
                    this._creatureButtons[_loc3_].x = 14;
                    this._creatureButtons[_loc3_].y = 34 + _loc3_ * 53;
                    _loc3_++;
                }
                this._creatureButtonsMC._mc._bottomBar.y = Math.min(GLOBAL._SCREEN.height - 450, this._creatureButtons[_loc2_ - 1].y + this._creatureButtons[_loc2_ - 1].height - this._creatureButtonsMC._mc._bottomBar.height * 0.8);
            }
            (as3.as(this.m_creatureContainer.mask, Sprite)).graphics.clear();
            (as3.as(this.m_creatureContainer.mask, Sprite)).graphics.beginFill(16777215, 1);
            (as3.as(this.m_creatureContainer.mask, Sprite)).graphics.drawRect(0, 22, 200, GLOBAL._SCREEN.height - 476);
            (as3.as(this.m_creatureContainer.mask, Sprite)).graphics.endFill();
            this.m_creatureContainer.mask = this.m_creatureContainer.mask;
            this.m_scrollBar.checkResize();
        }
    }

    public Clear(): void {
        let _loc1_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (this.mc.mcPoints) {
                this.mc.mcPoints.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.InfoShow));
                this.mc.mcPoints.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.InfoHide));
            }
            _loc1_ = 1;
            while (_loc1_ < 5) {
                if (this.mc["mcR" + _loc1_]) {
                    if (this.mc["mcR" + _loc1_].mcHit) {
                        this.mc["mcR" + _loc1_].mcHit.removeEventListener(MouseEvent.MOUSE_OVER, this.StatsShow(_loc1_, false));
                        this.mc["mcR" + _loc1_].mcHit.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.StatsHide));
                    }
                    if (this.mc["mcR" + _loc1_].bAdd) {
                        this.mc["mcR" + _loc1_].bAdd.removeEventListener(MouseEvent.CLICK, this.Topup(_loc1_));
                    }
                }
                _loc1_++;
            }
            if (Boolean(this.mc.mcR5) && Boolean(this.mc.mcR5.bAdd)) {
                this.mc.mcR5.bAdd.removeEventListener(MouseEvent.CLICK, BUY.Show);
            }
            if (Boolean(this.mc.mcOutposts) && Boolean(this.mc.mcOutposts.mcHit) && Boolean(this.mc.mcOutposts.bNext)) {
                this.mc.mcOutposts.mcHit.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.mcOutposts.mcHit.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
                this.mc.mcOutposts.bNext.removeEventListener(MouseEvent.CLICK, UI_TOP.ioNextClick);
            }
            if (this.mc.bInvite) {
                this.mc.bInvite.removeEventListener(MouseEvent.CLICK, this.ButtonClick("invite"));
                this.mc.bInvite.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.bInvite.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            }
            if (this.mc.bGift) {
                this.mc.bGift.removeEventListener(MouseEvent.CLICK, this.ButtonClick("gift"));
                this.mc.bGift.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.bGift.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            }
            if (this.mc.bInbox) {
                this.mc.bInbox.removeEventListener(MouseEvent.CLICK, this.ButtonClick("inbox"));
                this.mc.bInbox.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.bInbox.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            }
            if (this.mc.bAlert) {
                this.mc.bAlert.removeEventListener(MouseEvent.CLICK, this.ButtonClick("alert"));
                this.mc.bAlert.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.bAlert.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            }
            if (this.mc.bEarn) {
                this.mc.bEarn.removeEventListener(MouseEvent.CLICK, this.ButtonClick("earn"));
                this.mc.bEarn.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.bEarn.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            }
            if (Boolean(this.mc.bDailyDeal) && GLOBAL._flags.showFBCDaily == 1) {
                this.mc.bDailyDeal.removeEventListener(MouseEvent.CLICK, this.ButtonClick("daily"));
                this.mc.bDailyDeal.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
                this.mc.bDailyDeal.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            }
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onSpinnerTick));
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
        }
    }

    public ClearSiegeWeapon(): void {
        if (Boolean(this._siegeweapon) && Boolean(this._siegeweapon.parent)) {
            this._siegeweapon.parent.removeChild(this._siegeweapon);
            this._siegeweapon = null;
        }
    }

    public Topup(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = Math.min((n - 1) * 0.4, 1);
            if (BASE.isInfernoMainYardOrOutpost) {
                STORE.ShowB(2, Number(_loc2_), ["BR" + n + "1I", "BR" + n + "2I", "BR" + n + "3I"]);
            } else {
                STORE.ShowB(2, Number(_loc2_), ["BR" + n + "1", "BR" + n + "2", "BR" + n + "3"]);
            }
        };
    }

    public Setup(): void {
        let loader: Loader = null;
        let onImageLoad: Function = null;
        let LoadImageError: Function = null;
        loader = null;
        let mode: string = GLOBAL.mode;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD) {
            onImageLoad = (param1: Event): void => {
                loader.width = loader.height = 50;
                this.mc.mcPic.mcBG.addChild(loader);
            };
            LoadImageError = (param1: IOErrorEvent): void => {
            };
            if (BASE._ownerName) {
                if (BASE._ownerName.toLowerCase().charAt(BASE._ownerName.length - 1) == "s") {
                    this.mc.mcPoints.tName.htmlText = KEYS.Get("uitop_yardownershort", { "v1": BASE._ownerName.toUpperCase() });
                } else {
                    this.mc.mcPoints.tName.htmlText = KEYS.Get("uitop_yardownerlong", { "v1": BASE._ownerName.toUpperCase() });
                }
            } else if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                this.mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonsters");
            } else {
                this.mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonstersinferno");
            }
            loader = new Loader();
            loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
            loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
            if (GLOBAL._loadmode == "wmattack" || GLOBAL._loadmode == "wmview" || GLOBAL._loadmode == "iwmattack" || GLOBAL._loadmode == "iwmview") {
                loader.load(new URLRequest(GLOBAL.ioVersioned(GLOBAL._storageURL + BASE._ownerPic)));
            } else if (Boolean(!GLOBAL._flags.viximo) || Boolean(!GLOBAL._flags.kongregate)) {
                loader.load(new URLRequest(BASE._ownerPic));
            } else {
                loader.load(new URLRequest("http://graph.facebook.com/" + BASE._loadedFBID + "/picture"));
            }
        } else if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
            this.mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonsters");
        } else {
            this.mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonstersinferno");
        }
        if ((GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IATTACK) && !MAPROOM_DESCENT.DescentPassed) {
            if (BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT.DescentPassed) {
                this.DescentDebuffShow();
            } else {
                this.DescentDebuffHide();
            }
        }
    }

    public addIcon(param1: DisplayObject): void {
        // The only caller is the King of the Hill (Krallen) HUD icon: an overworld feature.
        if (Boolean(this.mc) && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.INFERNO_ONLY) {
            param1.x = 222;
            param1.y = 0;
            this._kothIcon = this.mc.addChild(param1);
            this.mc.mcR5.x = 284;
            this.mc.bEarn.x = 415;
            this.mc.bDealSpot.x = 502;
            this.mc.bDailyDeal.x = 493;
        }
    }

    public removeIcon(param1: DisplayObject): void {
        if (Boolean(this.mc) && this.mc.contains(param1)) {
            this.mc.removeChild(param1);
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                this.mc.mcR5.x = 227;
                this.mc.bEarn.x = 358;
                this.mc.bDailyDeal.x = 436;
                this.mc.bDealSpot.x = 445;
            }
        }
        if (this._kothIcon) {
            if (this._kothIcon.parent) {
                this._kothIcon.parent.removeChild(this._kothIcon);
            }
            this._kothIcon = null;
        }
    }

    public addResourceBar(param1: DisplayObject): void {
        let _loc2_: MovieClip = null;
        if (Boolean(this.mc) && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE.usesInfernoBackend) {
            if (MapRoomManager.instance.isInMapRoom2) {
                _loc2_ = as3.cast(this.mc.mcOutposts, MovieClip);
            } else {
                _loc2_ = as3.cast(this.mc.mcR4, MovieClip);
            }
            param1.x = -4;
            param1.y = _loc2_.y + 37;
            this._daveClub = this.mc.addChild(param1);
            ++this.extraResourceRows;
            this.Update();
        }
    }

    public removeResourceBar(param1: DisplayObject): void {
        if (Boolean(this.mc) && this.mc.contains(param1)) {
            this.mc.removeChild(param1);
            if (this.extraResourceRows > 0) {
                --this.extraResourceRows;
            }
        }
        if (this._daveClub) {
            if (this._daveClub.parent) {
                this._daveClub.parent.removeChild(this._daveClub);
            }
            this._daveClub = null;
        }
        this.Update();
    }

    public BombSelect(param1: int): Function {
        let n: int = param1;
        return (param1: MouseEvent = null): void => {
            this.MonsterDeselect();
            this.BombDeselect();
        };
    }

    public BombDeselect(): void {
    }

    public MonsterDeselect(): void {
        let _loc1_: string = null;
        let _loc2_: int = 0;
        for (_loc1_ in ATTACK._flingerBucket) {
            if (Boolean(ATTACK._flingerBucket[_loc1_]) && ATTACK._flingerBucket[_loc1_].Get() > 0) {
                ATTACK._curCreaturesAvailable[_loc1_].Add(ATTACK._flingerBucket[_loc1_].Get());
                ATTACK._flingerBucket[_loc1_].Set(0);
            }
        }
        ATTACK.BucketUpdate();
        _loc2_ = 0;
        while (_loc2_ < this._creatureButtons.length) {
            this._creatureButtons[_loc2_].Update();
            _loc2_++;
        }
    }

    public StatsShow(param1: int, param2: boolean): Function {
        let n: int = 0;
        let topup: boolean = false;
        n = param1;
        topup = param2;
        return (param1: MouseEvent): void => {
            let _loc2_: any = undefined;
            let _loc3_: any = undefined;
            let _loc5_: any = undefined;
            let _loc6_: any = undefined;
            let _loc7_: any = undefined;
            let _loc8_: any = undefined;
            if (n < 5) {
                if (topup) {
                    _loc2_ = "<b><font size=\"12\">" + KEYS.Get(as3.str(GLOBAL._resourceNames[n - 1])) + "</font></b><br><b>" + KEYS.Get("bubble_topup") + "</b>";
                    _loc3_ = 2;
                } else if (MapRoomManager.instance.isInMapRoom2or3) {
                    _loc5_ = as3.as(BaseBuffHandler.instance.getBuffByName(AutoBankBaseBuff.k_NAME), AutoBankBaseBuff);
                    _loc6_ = MapRoomManager.instance.isInMapRoom3 && _loc5_ ? _loc5_.value * 3600 : BASE.getEmpireResources(n);
                    if (BASE.yardType === EnumYardType.RESOURCE) {
                        _loc7_ = as3.as(as3.vget(InstanceManager.getInstancesByClass(ResourceOutpost), 0), ResourceOutpost);
                    }
                    _loc8_ = MapRoomManager.instance.isInMapRoom3 && _loc7_ ? _loc7_.resourcesPerSecond * 3600 : BASE._resources["r" + n + "Rate"];
                    _loc2_ = KEYS.Get("pop_resource2", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[n - 1])), "v2": GLOBAL.FormatNumber(Number(BASE._resources["r" + n + "max"])), "v3": GLOBAL.FormatNumber(Number(_loc8_)), "v4": GLOBAL.FormatNumber(Number(_loc6_)) });
                    _loc3_ = 4;
                } else {
                    _loc2_ = "<b><font size=\"12\">" + KEYS.Get(as3.str(GLOBAL._resourceNames[n - 1])) + "</font></b><br>" + KEYS.Get("pop_resource", { "v1": GLOBAL.FormatNumber(Number(BASE._resources["r" + n + "max"])), "v2": GLOBAL.FormatNumber(Number(BASE._resources["r" + n + "Rate"])) });
                    _loc3_ = 3;
                }
            } else {
                _loc2_ = "<b>" + KEYS.Get("bubble_getshiny") + "</b>";
                _loc3_ = 2;
            }
            let _loc4_: any = this.mc["mcR" + n];
            this.BubbleShow((_loc4_.x + 135) | 0, (_loc4_.y + ((_loc4_.height * 0.5) | 0)) | 0, as3.str(_loc2_), _loc3_ | 0);
        };
    }

    public StatsHide(param1: MouseEvent): void {
        this.BubbleHide();
    }

    public OverchargeShow(param1: int): void {
        if (!this._popupWarning) {
            this._popupWarning = as3.as(this.addChild(new bubblepopup4()), bubblepopup4);
        }
        this._popupWarning.tA.htmlText = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("inf_ui_needmoreroom") : KEYS.Get("ui_needmoreroom");
        this._popupWarning.x = 150;
        this._popupWarning.y = 20 + 41 * param1;
        this._popupWarning.Wobble();
    }

    public OverchargeHide(): void {
        if (this._popupWarning) {
            this.removeChild(this._popupWarning);
            this._popupWarning = null;
        }
    }

    public UpdateTweenResourceText(param1: number): void {
        let _loc3_: int = 0;
        let _loc4_: MovieClip = null;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc2_: int = param1 | 0;
        _loc5_ = Number((_loc4_ = as3.cast(this.mc["mcR" + _loc2_], MovieClip))._resource);
        this.ioSetText(as3.cast(_loc4_.tR, TextField), GLOBAL.ioFreeBuild() ? "<b>Unlimited</b>" : "<b>" + GLOBAL.FormatNumber(_loc5_) + "</b>");
        _loc3_ = (90 / BASE._resources["r" + _loc2_ + "max"] * _loc5_) | 0;
        if (_loc3_ > 90) {
            _loc3_ = 90;
        }
        if (_loc4_.mcBar.width != _loc3_) {
            _loc4_.mcBar.width = _loc3_;
        }
    }

    /**
     * Counts a resource up or down to its new amount (half a second). This ran every second for all four
     * even when nothing had changed, laying the text out again on every frame of it.
     */
    private ioTweenResource(index: int, amount: number): void {
        let clip: MovieClip = as3.cast(this.mc["mcR" + index], MovieClip);
        if (Number(clip._resource) == amount) {
            this.UpdateTweenResourceText(index);
            // the bar still follows a new storage size
            return;
        }
        TweenLite.to(clip, 0.5, { "_resource": amount, "onUpdate": as3.bind(this, this.UpdateTweenResourceText), "onUpdateParams": [index], "ease": Linear.easeNone, "overwrite": 1 });
    }

    /** Sets a text only when it changes (every set lays the text out again). */
    private ioSetText(field: TextField, html: string): void {
        if (field && this._ioTexts.get(field) !== html) {
            field.htmlText = html;
            this._ioTexts.set(field, html);
            UI_TOP.ioFit(field);
        }
    }

    /**
     * Inferno-only: a counter's number kept on its one line. From 50,000,000 the bar's field is too narrow
     * and its last digit wrapped under it ("50,000,00"); such a number is drawn a little smaller instead.
     */
    private static ioFit(field: TextField): void {
        GLOBAL.ioFitText(field);
    }

    /** The login streak as the server last sent it (flag io_streak), or null. */
    private static ioStreak(): any {
        let raw: string = GLOBAL._flags && GLOBAL._flags.io_streak ? String(GLOBAL._flags.io_streak) : "";
        if (raw == "") {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
        }
        return null;
    }

    /**
     * Inferno-only: the gift button is the Daily Reward button. Its badge shows the streak day; while
     * today's reward is waiting the badge shows the day to collect and the alert ring spins, like the
     * notification buttons. Clicking opens the reward (BASE.ioOpenDaily).
     */
    private ioDailyButton(): void {
        let status: any = UI_TOP.ioStreak();
        let own: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
        if (!status || !own || TUTORIAL._stage < 200) {
            this.mc.bGift.visible = false;
            return;
        }
        let waiting: boolean = (status.collected | 0) != 1;
        this.mc.bGift.visible = true;
        this.mc.bGift.mcSpinner.visible = waiting;
        this.mc.bGift.mcCounter.visible = true;
        this.mc.bGift.mcCounter.t.htmlText = "<b>" + (waiting ? status.offerDay | 0 : status.day | 0) + "</b>";
    }

    /**
     * Inferno-only: Moloch's Gauntlet's button (com/monsters/maproom_advanced/IoGauntlet.as), with the
     * top bar's icons: Moloch in a gold ring, which turns (like the other buttons' alert ring) while the
     * event is open and not beaten yet.
     */
    private ioMakeGauntletButton(): MovieClip {
        let C: number = NaN;
        let b: MovieClip = null;
        let picture: Sprite = null;
        // Drawn round the same middle as the column's other buttons (Invite, Daily Reward, Mail: their
        // hit area is 62 pixels from -10, so the middle is at 20.75), the same size.
        C = 20.75;
        b = new MovieClip();
        b.name = "ioGauntlet";
        b.buttonMode = true;
        b.mouseChildren = false;
        let hit: Shape = new Shape();
        hit.graphics.beginFill(16777215, 0);
        hit.graphics.drawCircle(C, C, 31);
        hit.graphics.endFill();
        b.addChild(hit);
        b.graphics.lineStyle(3, 7031314, 1);
        b.graphics.beginFill(14856743, 1);
        b.graphics.drawCircle(C, C, 25);
        b.graphics.endFill();
        picture = new Sprite();
        let round: Shape = new Shape();
        round.graphics.beginFill(16711680, 1);
        round.graphics.drawCircle(C, C, 21);
        round.graphics.endFill();
        b.addChild(picture);
        b.addChild(round);
        picture.mask = round;
        ImageCache.GetImageWithCallBack("monsters/tribe_moloch_50.jpg", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let image: Bitmap = new Bitmap(bmd);
            image.smoothing = true;
            image.width = image.height = 46;
            image.x = image.y = C - 23;
            picture.addChild(image);
        });
        let spinner: Shape = new Shape();
        spinner.graphics.lineStyle(3, 16726554, 1);
        for (let i: int = 0; i < 8; i++) {
            let from: number = i * Math.PI / 4;
            spinner.graphics.moveTo(Math.cos(from) * 30, Math.sin(from) * 30);
            for (let s: int = 1; s <= 4; s++) {
                spinner.graphics.lineTo(Math.cos(from + s * Math.PI / 20) * 30, Math.sin(from + s * Math.PI / 20) * 30);
            }
        }
        spinner.x = spinner.y = C;
        spinner.visible = false;
        b.addChild(spinner);
        b.mcSpinner = spinner;
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, IoGauntlet.Show);
        // its tip points left from the right-hand column, like the workers' own
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            UI_WORKERS.ioShowTip(b, UI_TOP.ioGauntletTip());
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        // In the workers' column on the right, under the fifth worker with a gap (it used to be the last
        // of the icon row on the left, under Mail).
        UI_WORKERS.ioAddUnderWorkers(b);
        this._ioGauntlet = b;
        return b;
    }

    private static ioGauntletTip(): string {
        let ioG: any = IoGauntlet.flag();
        return "<b>Moloch's Gauntlet</b><br>" + (!ioG ? "The monthly event." : !ioG.open ? "Closed. It opens on the 1st of the month." : (ioG.stage | 0) > (ioG.stages | 0) ? "You beat it this month!" : "Open now! Stage " + (ioG.stage | 0) + " of " + (ioG.stages | 0) + ".");
    }

    /**
     * Hell Freezes Over's button (com/monsters/events/hfo): the frozen flame in an ice ring, under Moloch's
     * Gauntlet's, from Day 3 of the event (hidden before: the ice is still a mystery). It opens the event's
     * window; its ring turns while a wave waits to be fought.
     */
    private ioMakeHfoButton(): MovieClip {
        let C: number = NaN;
        let b: MovieClip = null;
        let picture: Sprite = null;
        C = 20.75;
        b = new MovieClip();
        b.name = "ioHfo";
        b.buttonMode = true;
        b.mouseChildren = false;
        let hit: Shape = new Shape();
        hit.graphics.beginFill(16777215, 0);
        hit.graphics.drawCircle(C, C, 31);
        hit.graphics.endFill();
        b.addChild(hit);
        b.graphics.lineStyle(3, 1723002, 1);
        b.graphics.beginFill(10149119, 1);
        b.graphics.drawCircle(C, C, 25);
        b.graphics.endFill();
        picture = new Sprite();
        b.addChild(picture);
        ImageCache.GetImageWithCallBack("hfo/extras/event_icon_80.png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let image: Bitmap = new Bitmap(bmd);
            image.smoothing = true;
            image.width = image.height = 46;
            image.x = image.y = C - 23;
            picture.addChild(image);
        });
        let spinner: Shape = new Shape();
        spinner.graphics.lineStyle(3, 8380671, 1);
        for (let i: int = 0; i < 8; i++) {
            let from: number = i * Math.PI / 4;
            spinner.graphics.moveTo(Math.cos(from) * 30, Math.sin(from) * 30);
            for (let s: int = 1; s <= 4; s++) {
                spinner.graphics.lineTo(Math.cos(from + s * Math.PI / 20) * 30, Math.sin(from + s * Math.PI / 20) * 30);
            }
        }
        spinner.x = spinner.y = C;
        spinner.visible = false;
        b.addChild(spinner);
        b.mcSpinner = spinner;
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, IoHfoUi.ShowWindow);
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            UI_WORKERS.ioShowTip(b, "<b>" + KEYS.Get("hfo_event_title") + "</b>");
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        UI_WORKERS.ioAddUnderGauntlet(b);
        this._ioHfo = b;
        return b;
    }

    private ioHfoButton(): void {
        if (!this._ioHfo) {
            return;
        }
        let f: any = IoHfo.flag();
        this._ioHfo.visible = IoHfo.buttonShown() && TUTORIAL._stage >= 200;
        this._ioHfo.mcSpinner.visible = this._ioHfo.visible && (f.day | 0) >= 4 && !(Number(f.done) > 0) && (f.current | 0) <= 13;
        UI_WORKERS.ioPlaceExtra();
    }

    /** Shown on the main yard (not outposts, not while attacking or visiting) when the server runs the event. */
    private ioGauntletButton(): void {
        this.ioHfoButton();
        if (!this._ioGauntlet) {
            return;
        }
        let status: any = IoGauntlet.flag();
        let own: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost;
        this._ioGauntlet.visible = Boolean(status) && own && TUTORIAL._stage >= 200;
        this._ioGauntlet.alpha = Number(status && status.open ? 1 : 0.6);
        this._ioGauntlet.mcSpinner.visible = this._ioGauntlet.visible && status && status.open && (status.stage | 0) <= (status.stages | 0);
        // (Hell Freezes Over's button moves up into the Gauntlet's place while that one is hidden)
        UI_WORKERS.ioPlaceExtra();
    }

    /**
     * Inferno-only: the Switch account button, a round gold button left of save / zoom / full screen /
     * sound / music, on the player's own yards (not during attacks). GAME.ioSwitchAccount does the rest.
     */
    private ioSwitchButton(): void {
        let own: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (!this._ioSwitch) {
            this._ioSwitch = new Sprite();
            this._ioSwitch.name = "ioSwitch";
            this._ioSwitch.addChild(new Bitmap(new io_switch_account(0, 0)));
            this._ioSwitch.buttonMode = true;
            this._ioSwitch.mouseChildren = false;
            this._ioSwitch.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                try {
                    GAME.ioSwitchAccount();
                } catch (err) {
                    LOGGER.Log("err", "Switch account: " + err.message);
                }
            });
            this._ioSwitch.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfoShow));
            this._ioSwitch.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ButtonInfoHide));
            this.addChild(this._ioSwitch);
        }
        this._ioSwitch.visible = own;
        this._ioSwitch.x = this.mcSave.x - 30;
        this._ioSwitch.y = this.mcSave.y;
        // Kept on top: clips added to the top bar later (buff and status holders) must not cover it.
        if (this._ioSwitch.parent == this && this.getChildIndex(this._ioSwitch) != this.numChildren - 1) {
            this.setChildIndex(this._ioSwitch, (this.numChildren - 1) | 0);
        }
    }

    /** Where the top bar's next button goes: right of the last shortcut bar showing, or of the Shiny counter. */
    private ioAfterShiny(): number {
        let right: number = this.ioShinyRight();
        for (let b of as3.values(this._ioBars || [])) {
            if (b && b.visible) {
                right = Math.max(right, b.x + this.ioBarWidth(b));
            }
        }
        return right + 8;
    }

    private ioShinyRight(): number {
        let r5: MovieClip = as3.cast(this.mc.mcR5, MovieClip);
        // (right of the counter's box: its hidden "+" would leave a gap)
        return Number(r5.mcBG && r5.bAdd && !r5.bAdd.visible ? r5.x + r5.mcBG.x + r5.mcBG.width : r5.x + r5.width);
    }

    private ioBarWidth(b: Sprite): number {
        return Number(b["ioW"]) || b.width;
    }

    /** Hides every shortcut bar (not in build mode). */
    private ioHideBars(): void {
        for (let b of as3.values(this._ioBars || [])) {
            if (b) {
                b.visible = false;
            }
        }
    }

    private ioBarArt(): BitmapData {
        if (UI_TOP._ioBarArt) {
            return UI_TOP._ioBarArt;
        }
        let bg: MovieClip = as3.cast(this.mc.mcR5 ? this.mc.mcR5.mcBG : null, MovieClip);
        let art: DisplayObject = as3.cast(bg && bg.numChildren ? bg.getChildAt(0) : bg, DisplayObject);
        if (!art || art.width < 4 || art.height < 4) {
            return null;
        }
        let r: Rectangle = art.getBounds(art);
        UI_TOP._ioBarArt = new BitmapData(Math.ceil(r.width), Math.ceil(r.height), true, 0);
        UI_TOP._ioBarArt.draw(as3.cast(art, IBitmapDrawable), new Matrix(1, 0, 0, 1, -r.x, -r.y), null, null, null, true);
        return UI_TOP._ioBarArt;
    }

    /** The counter's bar `w` wide (its ends kept, the middle stretched), as high as the counter's. */
    private ioDrawBar(holder: Sprite, w: number): void {
        while (holder.numChildren) {
            holder.removeChildAt(0);
        }
        let art: BitmapData = this.ioBarArt();
        let h: number = Number(this.mc.mcR5 && this.mc.mcR5.mcBG ? this.mc.mcR5.mcBG.height : 33);
        if (!art) {
            // (no art to copy: a dark rounded bar)
            let s: Shape = new Shape();
            s.graphics.lineStyle(1.5, 6974058, 1);
            s.graphics.beginFill(3026478, 0.95);
            s.graphics.drawRoundRect(0, 0, w, h, 10, 10);
            s.graphics.endFill();
            holder.addChild(s);
            return;
        }
        let scale: number = h / art.height;
        let cap: int = Math.min((art.width / 3) | 0, Math.ceil(18 / Math.max(0.1, scale))) | 0;
        let parts: any[] = [[0, cap], [cap, art.width - 2 * cap], [art.width - cap, cap]];
        let capW: number = cap * scale;
        let x: number = 0;
        for (let i: int = 0; i < 3; i++) {
            let piece: BitmapData = new BitmapData(parts[i][1] | 0, art.height, true, 0);
            piece.copyPixels(art, new Rectangle(parts[i][0] | 0, 0, parts[i][1] | 0, art.height), new Point(0, 0));
            let bm: Bitmap = new Bitmap(piece);
            bm.smoothing = true;
            bm.height = h;
            bm.width = i == 1 ? Math.max(1, w - 2 * capW) : capW;
            bm.x = x;
            x += bm.width;
            holder.addChild(bm);
        }
    }

    /** The counter's lettering (font, size, colour, outline) for a bar's name. */
    private ioBarLabel(text: string): TextField {
        let t: TextField = new TextField();
        let src: TextField = as3.cast(this.mc.mcR5 ? this.mc.mcR5.tR : null, TextField);
        let format: TextFormat = src ? src.defaultTextFormat : new TextFormat("Verdana", 12, 0xFFFFFF, true);
        format.align = "left";
        t.selectable = false;
        t.mouseEnabled = false;
        t.embedFonts = src ? src.embedFonts : false;
        t.defaultTextFormat = format;
        t.autoSize = TextFieldAutoSize.LEFT;
        t.text = text;
        if (src && src.filters) {
            t.filters = src.filters;
        }
        return t;
    }

    /**
     * A shortcut bar: `icon` (a Sprite to draw or load the picture into, about 38 x 38) on the left, `label` on
     * the bar; `onClick`; a tip of `tipTitle` / `tipText`.
     */
    private ioMakeBar(name: string, label: string, icon: Sprite, onClick: Function, tipTitle: string, tipText: string): Sprite {
        let b: MovieClip = null;
        b = new MovieClip();
        // (a MovieClip: it keeps its sizes as properties)
        b.name = name;
        b.buttonMode = true;
        b.mouseChildren = false;
        let bar: Sprite = new Sprite();
        bar.name = "bar";
        b.addChild(bar);
        let text: TextField = this.ioBarLabel(label);
        text.name = "label";
        b.addChild(text);
        icon.name = "icon";
        b.addChild(icon);
        b["ioLabelW"] = text.width;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            UI_WORKERS.PopupHide();
            onClick(e);
        });
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            b.filters = [new GlowFilter(0xFFC94A, 0.8, 8, 8, 2)];
            UI_WORKERS.ioShowTip(b, "<b>" + tipTitle + "</b><br>" + tipText);
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            b.filters = [];
            UI_WORKERS.PopupHide();
        });
        this.mc.addChild(b);
        return b;
    }

    /** Lays a bar out: with its name (`compact` false) or as just its picture. */
    private ioShapeBar(b: Sprite, compact: boolean): void {
        let h: number = Number(this.mc.mcR5 && this.mc.mcR5.mcBG ? this.mc.mcR5.mcBG.height : 33);
        let text: TextField = as3.as(b.getChildByName("label"), TextField);
        let bar: Sprite = as3.as(b.getChildByName("bar"), Sprite);
        let w: number = Number(compact ? 38 : Math.ceil(30 + Number(b["ioLabelW"]) + 10));
        if (b["ioShaped"] != w) {
            b["ioShaped"] = w;
            bar.visible = !compact;
            if (!compact) {
                this.ioDrawBar(bar, w - 8);
                bar.x = 8;
            }
            // (the empty parts take the clicks too)
            b.graphics.clear();
            b.graphics.beginFill(0, 0);
            b.graphics.drawRect(0, 0, w, Math.max(h, 38));
            b.graphics.endFill();
        }
        b["ioW"] = w;
        text.visible = !compact;
        text.x = 36;
        text.y = (((h - text.height) / 2) | 0) + 1;
    }

    /**
     * The picture of a bar: topbar/<name>.png (server/public/assets/topbar, made by sandbox-tools/topbar-icons.py),
     * gold like the level star and the Shiny coins, 128 px shown at 38.
     */
    private static ioPictureIcon(name: string): Sprite {
        let icon: Sprite = null;
        icon = new Sprite();
        ImageCache.GetImageWithCallBack("topbar/" + name + ".png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let image: Bitmap = new Bitmap(bmd);
            image.smoothing = true;
            image.width = image.height = 38;
            icon.addChild(image);
        });
        icon.filters = [new DropShadowFilter(2, 60, 0, 0.55, 3, 3, 1, 2)];
        return icon;
    }

    /** Makes, shows or hides, and lays out the shortcut bars. */
    private ioTopBars(): void {
        let b: Sprite = null;
        let mine: boolean = GLOBAL.INFERNO_ONLY && TUTORIAL._stage >= 200 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) && !GLOBAL.ioDesignMode();
        if (!mine) {
            this.ioHideBars();
            return;
        }
        if (!this._ioBars) {
            this._ioAlliances = this.ioMakeBar("ioAlliances", KEYS.Get("tb_alliances"), UI_TOP.ioPictureIcon("alliances"), (e: MouseEvent): void => {
                ALLIANCEWINDOW.Show(e);
            }, KEYS.Get("tb_alliances"), KEYS.Get("tb_alliances_tip"));
            this._ioAttackLogs = this.ioMakeBar("ioAttackLogs", KEYS.Get("tb_attacklog"), UI_TOP.ioPictureIcon("attacklog"), (e: MouseEvent): void => {
                IoAttackLogs.Show(e);
            }, KEYS.Get("al_title"), KEYS.Get("al_tip"));
            this._ioLeaderboards = this.ioMakeBar("ioLeaderboards", KEYS.Get("tb_leaderboard"), UI_TOP.ioPictureIcon("leaderboard"), (e: MouseEvent): void => {
                IoLeaderboards.Show(e);
            }, KEYS.Get("lb_title"), KEYS.Get("lb_tip"));
            this._ioChangelog = this.ioMakeBar("ioChangelog", KEYS.Get("tb_changelog"), UI_TOP.ioPictureIcon("changelog"), (e: MouseEvent): void => {
                IoChangelog.Show(e);
            }, KEYS.Get("cl_title"), KEYS.Get("cl_tip"));
            this._ioBars = [this._ioAlliances, this._ioAttackLogs, this._ioLeaderboards, this._ioChangelog];
        }
        this._ioAlliances.visible = true;
        this._ioAttackLogs.visible = true;
        this._ioLeaderboards.visible = Boolean(GLOBAL._flags && (GLOBAL._flags.io_leaderboards | 0) == 1);
        this._ioChangelog.visible = true;
        // with their names when they fit before the buttons on the right of the screen, else just the pictures
        let shown: any[] = [];
        let full: number = 0;
        for (b of as3.values(this._ioBars)) {
            if (b.visible) {
                shown.push(b);
                full += Math.ceil(30 + Number(b["ioLabelW"]) + 10) + 6;
            }
        }
        // (the screen in the stage's terms: on a wide or a phone screen the stage reaches past its 760 both ways)
        let screen: Rectangle = GLOBAL._SCREEN ? GLOBAL._SCREEN : (GLOBAL._ROOT && GLOBAL._ROOT.stage ? new Rectangle(0, 0, GLOBAL._ROOT.stage.stageWidth, 0) : null);
        let room: number = Number(screen ? this.mc.globalToLocal(new Point(screen.x + screen.width - 200, 0)).x - this.ioShinyRight() - 8 : 9999);
        if (GLOBAL._flags && (GLOBAL._flags.io_admin | 0) == 1) {
            room -= 250;
        }
        if (GLOBAL.ioOnPhone && screen) {
            // a phone: the page's menu button is at the top centre, over the game; the names stop short of it
            room = Math.min(room, this.mc.globalToLocal(new Point(screen.x + screen.width / 2 - Math.max(70, screen.width * 0.08), 0)).x - this.ioShinyRight() - 8);
        }
        let compact: boolean = full > room;
        let x: number = this.ioShinyRight() + 8;
        let h: number = Number(this.mc.mcR5 && this.mc.mcR5.mcBG ? this.mc.mcR5.mcBG.height : 33);
        for (b of as3.values(shown)) {
            this.ioShapeBar(b, compact);
            b.x = x;
            b.y = Number(this.mc.mcR5.y + (h - 38) / 2 + 1);
            x += this.ioBarWidth(b) + 6;
        }
        this._ioBarsCompact = compact ? 1 : 0;
    }

    /**
     * Inferno-only: the Admin button, for accounts in InfernoOnlyConfig.admins (flag io_admin). It gets
     * a one-time sign-in code from the server and opens the admin panel in the browser with it.
     */
    public ioShowAdminButton(): void {
        let show: boolean = Boolean(GLOBAL.INFERNO_ONLY && GLOBAL._flags && (GLOBAL._flags.io_admin | 0) == 1);
        if (!show) {
            if (this._ioAdmin) {
                this._ioAdmin.visible = false;
            }
            return;
        }
        if (!this._ioAdmin) {
            this._ioAdmin = new Button_CLIP();
            this._ioAdmin.Setup("Admin");
            this._ioAdmin.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioOpenAdmin));
            this.mc.addChild(this._ioAdmin);
        }
        this._ioAdmin.visible = true;
        this._ioAdmin.x = this.ioAfterShiny();
        this._ioAdmin.y = Number(this.mc.mcR5.y);
        // Admin test mode switch, and the test tools while it is on (com/monsters/admin/IoTestMode.as).
        let testOn: boolean = GLOBAL.ioTestMode();
        if (!this._ioTest) {
            this._ioTest = new Button_CLIP();
            this._ioTest.addEventListener(MouseEvent.CLICK, IoTestMode.ToggleClick);
            this.mc.addChild(this._ioTest);
        }
        if (this._ioTestShown != (testOn ? 1 : 0)) {
            this._ioTestShown = testOn ? 1 : 0;
            this._ioTest.Setup(testOn ? "Test: ON" : "Test: OFF");
        }
        this._ioTest.x = this._ioAdmin.x + this._ioAdmin.width + 6;
        this._ioTest.y = Number(this.mc.mcR5.y);
        if (testOn && !this._ioTools) {
            this._ioTools = new Button_CLIP();
            this._ioTools.Setup("Test tools");
            this._ioTools.addEventListener(MouseEvent.CLICK, IoTestMode.ShowTools);
            this.mc.addChild(this._ioTools);
        }
        if (this._ioTools) {
            this._ioTools.visible = testOn;
            this._ioTools.x = this._ioTest.x + this._ioTest.width + 6;
            this._ioTools.y = Number(this.mc.mcR5.y);
        }
        // The Designer (com/monsters/admin/IoDesigner.as): kits, wild tribe and Moloch layouts.
        if (!this._ioDesigner) {
            this._ioDesigner = new Button_CLIP();
            this._ioDesigner.Setup("Designer");
            this._ioDesigner.name = "ioDesignerButton";
            this._ioDesigner.addEventListener(MouseEvent.CLICK, IoDesigner.Show);
            this.mc.addChild(this._ioDesigner);
        }
        this._ioDesigner.visible = true;
        this._ioDesigner.x = (testOn && this._ioTools ? this._ioTools.x + this._ioTools.width : this._ioTest.x + this._ioTest.width) + 6;
        this._ioDesigner.y = Number(this.mc.mcR5.y);
    }

    /** The design bar under the top bar while a Designer draft is on screen (GLOBAL.ioDesign). */
    private ioDesignBar(): void {
        let design: any = GLOBAL.ioDesign();
        let id: string = design ? String(design.kind) + ":" + String(design.key) + ":" + BASE._loadedBaseID : null;
        if (this._ioDesignBar && this._ioDesignBarFor != id) {
            if (this._ioDesignBar.parent) {
                this._ioDesignBar.parent.removeChild(this._ioDesignBar);
            }
            this._ioDesignBar = null;
        }
        if (!design || GLOBAL._loadmode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        if (!this._ioDesignBar) {
            this._ioDesignBar = IoDesigner.makeBar();
            this._ioDesignBar.name = "ioDesignBar";
            this._ioDesignBarFor = id;
            this.addChild(this._ioDesignBar);
        }
        this._ioDesignBar.x = (GLOBAL._SCREENCENTER.x - this._ioDesignBar.width / 2 - this.x) | 0;
        this._ioDesignBar.y = this._ioTestBanner && this._ioTestBanner.visible ? 86 : 64;
    }

    /** "TEST MODE" under the top bar while admin test mode is on, on every screen of the yard. */
    private ioTestBanner(): void {
        let on: boolean = GLOBAL.ioTestMode();
        if (!on) {
            if (this._ioTestBanner) {
                this._ioTestBanner.visible = false;
            }
            return;
        }
        if (!this._ioTestBanner) {
            this._ioTestBanner = IoTestMode.makeBanner();
            this.addChild(this._ioTestBanner);
        }
        this._ioTestBanner.visible = true;
        this._ioTestBanner.x = (GLOBAL._SCREENCENTER.x - this._ioTestBanner.width / 2 - this.x) | 0;
        this._ioTestBanner.y = 64;
    }

    private ioOpenAdmin(e: MouseEvent): void {
        // A field is sent so Flash keeps this a POST (it turns an empty POST into a GET).
        new URLLoaderApi().load(GLOBAL.serverUrl + "admin/session", [["open", 1]], (serverData: any): void => {
            if (serverData && serverData.error == 0 && serverData.code) {
                navigateToURL(new URLRequest(GLOBAL.serverUrl + "admin/signin?code=" + String(serverData.code)), "_blank");
            } else {
                GLOBAL.Message(serverData && serverData.error ? String(serverData.error) : "The admin panel could not be opened.");
            }
        }, (e: Event): void => {
            GLOBAL.Message("The admin panel could not be opened. Please try again.");
        });
    }

    public Update(): void {
        let _loc1_: any = null;
        if (!GLOBAL._catchup) {
            if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IBUILD) {
                this.updateBuildMode();
            } else if (this._ioBars) {
                this.ioHideBars();
            } else if (MapRoomManager.instance.isInMapRoom3 && (GLOBAL._loadmode === GLOBAL.e_BASE_MODE.VIEW || GLOBAL._loadmode === GLOBAL.e_BASE_MODE.WMVIEW)) {
                this.updateScoutMode();
            } else if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK || MapRoomManager.instance.isInMapRoom3 && (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK)) {
                this.updateAttackMode();
            }
            _loc1_ = BASE.BaseLevel();
            this.SetPoints(Number(_loc1_.lower), Number(_loc1_.upper), Number(_loc1_.needed), Number(_loc1_.points), _loc1_.level >>> 0, false);
            this.ioTestBanner();
            this.ioDesignBar();
        }
    }

    private updateBuildMode(): void {
        let _loc1_: int = 0;
        let _loc2_: MovieClip = null;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: boolean = false;
        let _loc10_: int = 0;
        let _loc11_: boolean = false;
        let _loc12_: MovieClip = null;
        let _loc3_: number = Number(BASE._resources["r" + 1].Get());
        let _loc4_: number = Number(BASE._resources["r" + 2].Get());
        let _loc5_: number = Number(BASE._resources["r" + 3].Get());
        let _loc6_: number = Number(BASE._resources["r" + 4].Get());
        this.ioTweenResource(1, _loc3_);
        this.ioTweenResource(2, _loc4_);
        this.ioTweenResource(3, _loc5_);
        this.ioTweenResource(4, _loc6_);
        this.ioSetText(as3.cast(this.mc["mcR" + 5].tR, TextField), GLOBAL.ioFreeBuild() ? "<b>Unlimited</b>" : "<b>" + GLOBAL.FormatNumber(BASE._credits.Get()) + "</b>");
        this.ioTopBars();
        this.ioShowAdminButton();
        this.ioSwitchButton();
        if (MapRoomManager.instance.isInMapRoom2) {
            this.mc.mcOutposts.visible = true;
            this.mc.mcOutposts.tR.htmlText = GLOBAL._mapOutpost.length;
        } else {
            this.mc.mcOutposts.visible = false;
        }
        if (TUTORIAL._stage < 200) {
            this.mc.bInvite.visible = false;
            this.mc.bGift.visible = false;
            this.mc.bInbox.visible = false;
            this.mc.bAlert.visible = false;
            this.mc.mcR5.bAdd.visible = false;
            this.mc.bEarn.visible = false;
            this.mc.bDailyDeal.visible = false;
            _loc1_ = 1;
            while (_loc1_ < 6) {
                this.mc["mcR" + _loc1_].bAdd.visible = false;
                _loc1_++;
            }
            this.ioGauntletButton();
            this.SortButtonIcons();
        } else {
            // Inferno-only: no shiny to buy, so the shiny "+" stays hidden (see Setup).
            this.mc.mcR5.bAdd.visible = !GLOBAL.INFERNO_ONLY;
            this.mc.bEarn.visible = GLOBAL._flags.showFBCEarn == 1;
            this.mc.bDailyDeal.visible = GLOBAL._flags.showFBCDaily == 1;
            _loc1_ = 1;
            while (_loc1_ < 6) {
                // Inferno-only: the shiny counter (mcR5) keeps its "+" hidden; this loop used to show it again.
                if (!this.mc["mcR" + _loc1_].bAdd.visible && !(GLOBAL.INFERNO_ONLY && _loc1_ == 5)) {
                    this.mc["mcR" + _loc1_].bAdd.visible = true;
                }
                _loc1_++;
            }
            _loc7_ = 0;
            if (GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_invite) {
                // Inferno-only referrals: the button is always there, and it wears the alert ring
                // (the same spinner the notification button uses) until the player has opened it
                // this session. Every login starts with the ring on.
                this.mc.bInvite.visible = !GLOBAL.ioUiHidden("invite");
                this.mc.bInvite.mcSpinner.visible = this.mc.bInvite.visible && !GLOBAL._ioInviteSeen;
            } else if (GLOBAL._canInvite && !GLOBAL._flags.kongregate) {
                if (GLOBAL._sessionCount >= 2 && !GLOBAL._canGift && GLOBAL.Timestamp() - GLOBAL.StatGet("pi") > 60 * 60 * 36) {
                    this.mc.bInvite.mcSpinner.visible = true;
                } else {
                    this.mc.bInvite.mcSpinner.visible = false;
                }
                this.mc.bInvite.visible = true;
            } else {
                this.mc.bInvite.visible = false;
            }
            if (this.mc.bInvite.visible && !(GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_invite)) {
                this.mc.bInvite.visible = BYMConfig.instance.INVITE_BUTTON;
            }
            _loc8_ = (this.extraResourceRows * this._RESOURCEBAR_HEIGHT) | 0;
            this.ioGauntletButton();
            this.SortButtonIcons(2, 4, _loc8_);
            if (GLOBAL.INFERNO_ONLY) {
                this.ioDailyButton();
            } else {
                this.mc.bGift.visible = true;
                if ((_loc7_ = POPUPS.QueueCount("gifts")) > 0) {
                    this.mc.bGift.mcSpinner.visible = true;
                    this.mc.bGift.mcCounter.visible = true;
                    if (_loc7_ < 10) {
                        this.mc.bGift.mcCounter.t.htmlText = "<b>" + _loc7_ + "</b>";
                    } else {
                        this.mc.bGift.mcCounter.t.htmlText = "<b>+</b>";
                    }
                } else {
                    this.mc.bGift.mcSpinner.visible = false;
                    this.mc.bGift.mcCounter.visible = false;
                }
            }
            this.mc.bInbox.visible = true;
            if (GLOBAL._unreadMessages > 0) {
                this.mc.bInbox.mcCounter.t.htmlText = "<b>" + GLOBAL._unreadMessages + "</b>";
                this.mc.bInbox.mcCounter.visible = true;
                this.mc.bInbox.mcSpinner.visible = true;
            } else {
                this.mc.bInbox.mcCounter.visible = false;
                this.mc.bInbox.mcSpinner.visible = false;
            }
            if ((_loc7_ = POPUPS.QueueCount("alerts")) > 0) {
                this.mc.bAlert.visible = true;
                this.mc.bAlert.mcSpinner.visible = true;
                this.mc.bAlert.mcCounter.visible = true;
                if (_loc7_ < 10) {
                    this.mc.bAlert.mcCounter.t.htmlText = "<b>" + _loc7_ + "</b>";
                } else {
                    this.mc.bAlert.mcCounter.t.htmlText = "<b>+</b>";
                }
            } else {
                this.mc.bAlert.visible = false;
            }
            this.DisplayBuffs();
            if (this._kothIcon) {
                _loc9_ = Boolean(CREATURES._krallen);
                _loc10_ = 0;
                if (_loc9_) {
                    _loc10_ = CREATURES._krallen._level.Get() | 0;
                }
                (as3.as(this._kothIcon, KOTHHUDGraphic)).update(_loc9_, _loc10_ >>> 0);
            }
            if (this._daveClub) {
                _loc11_ = SubscriptionHandler.instance.isSubscriptionActive;
                (as3.as(this._daveClub, MovieClip)).gotoAndStop(_loc11_ ? "on" : "off");
                if (MapRoomManager.instance.isInMapRoom2) {
                    _loc12_ = as3.cast(this.mc.mcOutposts, MovieClip);
                } else {
                    _loc12_ = as3.cast(this.mc.mcR4, MovieClip);
                }
                this._daveClub.x = -4;
                this._daveClub.y = _loc12_.y + 37;
            }
        }
    }

    private updateAttackMode(): void {
        let _loc2_: int = 0;
        let _loc3_: MovieClip = null;
        let _loc6_: string = null;
        let _loc7_: any = false;
        let _loc1_: int = this._creatureButtons.length | 0;
        _loc2_ = 1;
        while (_loc2_ < 5) {
            _loc3_ = as3.cast(this.mc["mcR" + _loc2_], MovieClip);
            _loc3_.tR.htmlText = "<b>" + GLOBAL.FormatNumber(Number(ATTACK._loot["r" + _loc2_].Get())) + "</b>";
            _loc3_.mcBar.visible = false;
            _loc2_++;
        }
        _loc2_ = 0;
        while (_loc2_ < _loc1_) {
            this._creatureButtons[_loc2_].Update();
            _loc2_++;
        }
        let _loc4_: int = GLOBAL._buildingProps[4].capacity[GLOBAL._attackersFlinger - 1] | 0;
        if (MAPROOM_DESCENT.InDescent) {
            _loc4_ = YARD_PROPS._yardProps[4].capacity[GLOBAL._attackersFlinger - 1] | 0;
        }
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "OFFENSE")) {
            _loc4_ = (_loc4_ + _loc4_ * 0.25) | 0;
        }
        let _loc5_: int = _loc4_;
        if (MapRoomManager.instance.isInMapRoom3 && ATTACK.USE_CUMULATIVE_FLINGER_CAPACITY) {
            _loc5_ = (_loc5_ - ATTACK._flungSpace.Get()) | 0;
        }
        for (_loc6_ in ATTACK._flingerBucket) {
            _loc7_ = _loc6_.substr(0, 1) === "G";
            if (!MapRoomManager.instance.isInMapRoom3 && _loc7_) {
                _loc5_ = (_loc5_ - CHAMPIONCAGE.GetGuardianProperty(_loc6_.substr(0, 2), 1, "bucket")) | 0;
            } else if (!_loc7_) {
                _loc5_ = (_loc5_ - CREATURES.GetProperty(_loc6_, "bucket") * ATTACK._flingerBucket[_loc6_].Get()) | 0;
            }
        }
        this._creatureButtonsMC._mc._txtContainer.mcBar.width = 115 - 115 / _loc4_ * _loc5_;
        if (MapRoomManager.instance.isInMapRoom3) {
            this._creatureButtonsMC._mc._txtContainer.mcBar.scaleX = (1 - _loc5_ / _loc4_) * 1.2;
        } else {
            this._creatureButtonsMC._mc._txtContainer.mcBar.scaleX = (100 - 100 / _loc4_ * _loc5_) / 100;
        }
        if (GLOBAL._attackersFlinger) {
            if (MapRoomManager.instance.isInMapRoom3) {
                this._creatureButtonsMC._mc._txtContainer.tA.width = 60;
                this._creatureButtonsMC._mc._txtContainer.tA.htmlText = (_loc4_ - _loc5_).toString() + "/" + _loc4_.toString();
            } else {
                this._creatureButtonsMC._mc._txtContainer.tA.width = 56;
                this._creatureButtonsMC._mc._txtContainer.tA.htmlText = Math.min(100, ((1 - _loc5_ / _loc4_) * 100) | 0).toString() + "%";
            }
        }
        if (GLOBAL.mode != GLOBAL._loadmode) {
            if (ATTACK._countdown > 0) {
                this.mc.tMessage.htmlText = KEYS.Get("attack_ui_attacklock");
            } else {
                this.mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
            }
        } else if (ATTACK._countdown > 0) {
            this.mc.tMessage.htmlText = KEYS.Get("attack_ui_flingerlock");
        } else {
            this.mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
        }
        if (ATTACK._countdown > 30) {
            this.mc.tTime.htmlText = GLOBAL.ToTime(ATTACK._countdown, true);
        } else if (ATTACK._countdown > 0) {
            this.mc.tTime.htmlText = "<font color=\"#FF0000\">" + GLOBAL.ToTime(ATTACK._countdown, true) + "</font>";
        } else if (ATTACK._countdown > -120) {
            this.mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + GLOBAL.ToTime((120 + ATTACK._countdown) | 0, true) + "</font>";
        } else {
            this.mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + KEYS.Get("attack_ui_over") + "</font>";
        }
    }

    private updateScoutMode(): void {
        let _loc2_: int = 0;
        let _loc3_: MovieClip = null;
        let _loc1_: int = this._creatureButtons.length | 0;
        let scoutedCell: MapRoom3Cell = as3.as(GLOBAL._currentCell, MapRoom3Cell);

        _loc2_ = 1;
        while (_loc2_ < 5) {
            _loc3_ = as3.cast(this.mc["mcR" + _loc2_], MovieClip);
            _loc3_.tR.htmlText = !scoutedCell ? "" : "<b>" + GLOBAL.FormatNumber(Number(scoutedCell.attackCost[_loc2_ - 1])) + "</b>";
            _loc3_.mcBar.visible = false;
            _loc2_++;
        }
        _loc2_ = 0;
        while (_loc2_ < _loc1_) {
            this._creatureButtons[_loc2_].Update();
            _loc2_++;
        }
        if (GLOBAL.mode != GLOBAL._loadmode) {
            if (ATTACK._countdown > 0) {
                this.mc.tMessage.htmlText = KEYS.Get("attack_ui_attacklock");
            } else {
                this.mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
            }
        } else if (ATTACK._countdown > 0) {
            this.mc.tMessage.htmlText = KEYS.Get("attack_ui_flingerlock");
        } else {
            this.mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
        }
        if (ATTACK._countdown > 30) {
            this.mc.tTime.htmlText = GLOBAL.ToTime(ATTACK._countdown, true);
        } else if (ATTACK._countdown > 0) {
            this.mc.tTime.htmlText = "<font color=\"#FF0000\">" + GLOBAL.ToTime(ATTACK._countdown, true) + "</font>";
        } else if (ATTACK._countdown > -120) {
            this.mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + GLOBAL.ToTime((120 + ATTACK._countdown) | 0, true) + "</font>";
        } else {
            this.mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + KEYS.Get("attack_ui_over") + "</font>";
        }
    }

    public SortButtonIcons(param1: int = 2, param2: int = 4, param3: int = 0): void {
        let _loc4_: int = 9;
        let _loc5_: int = 195;
        let _loc6_: int = param1;
        let _loc7_: int = param2;
        let _loc8_: int = 67;
        let _loc9_: int = 55;
        let _loc10_: int = param3;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        if (MapRoomManager.instance.isInMapRoom2) {
            _loc10_ += 35;
        }
        let _loc14_: int = 0;
        while (_loc14_ < this._buttonIcons.length) {
            if (this._buttonIcons[_loc14_].visible) {
                this._buttonIcons[_loc14_].x = _loc4_ + _loc11_;
                this._buttonIcons[_loc14_].y = _loc5_ + _loc10_;
                _loc13_++;
                _loc10_ += _loc9_;
                if (_loc13_ >= _loc7_) {
                    _loc13_ = 0;
                    _loc12_++;
                    _loc10_ = 0;
                    _loc11_ += _loc8_;
                }
            }
            _loc14_++;
        }
    }

    public InitDealspot(): void {
        if (this.mc.bDealSpot) {
            this.mc.bDealSpot.visible = true;
            this.mc.bDealSpot.buttonMode = true;
            this.mc.bDealSpot.mouseChildren = true;
            while (this.mc.bDealSpot.numChildren) {
                this.mc.bDealSpot.removeChildAt(0);
            }
            this._dealspot = new DealSpot(this);
            this._dealspot.x = -5;
            this._dealspot.y = -5;
            this.mc.bDealSpot.addChild(this._dealspot);
        } else if (this.mc.bDealSpot) {
            this.mc.bDealSpot.visible = false;
            this.mc.bDealSpot.mouseChildren = false;
            this._dealspot = null;
        }
    }

    /** The outposts counter's button: the Outposts list in the Inferno (it has Next in it), else the next outpost. */
    private static ioNextClick(param1: MouseEvent = null): void {
        if (GLOBAL.INFERNO_ONLY && MapRoomManager.instance.isInMapRoom2) {
            IoOutpostsPopup.Show();
        } else {
            BASE.LoadNext(param1);
        }
    }

    /**
     * Inferno-only Invite Friends: the player's own invite link and a Copy button. A friend who
     * starts the game from the link and registers earns both players shiny (server: referrals.ts).
     * The Invite button on the top bar opens it, and so does the button on the "still there?" popup
     * (POPUPS.AFK) and the Invite Friends button anywhere else.
     */
    public static ioShowInvite(): void {
        let message: string = null;
        let popupMC: popup_generic = null;
        GLOBAL._ioInviteSeen = true;
        let link: string = String(GLOBAL._flags.io_invite);
        let shiny: string = GLOBAL.FormatNumber(Number(GLOBAL._flags.io_invite_shiny));
        message = "Join me on maproom 2 in the inferno! - A custom backyard monsters refitted server.\n" + "Play in your browser at " + link;
        popupMC = new popup_generic();
        let CopyMessage: Function = (param1: MouseEvent): void => {
            System.setClipboard(message);
            popupMC.bAction.Setup("Copied!");
        };
        popupMC.tA.htmlText = "Invite a friend";
        popupMC.tB.htmlText = "Copy the invite below and send it to a friend. When they start the game from your link and register, you <b>both</b> get <b>" + shiny + " shiny</b>.<br><br>" + "<font color=\"#FFFFFF\">" + message.split("\n").join("<br>") + "</font><br><br>" + "The shiny arrives when your friend's yard is created. Two accounts on the same connection do not count.";
        // The popup grows to its text: at its stock size only the first lines showed, and the invite itself
        // and the note under it were cut off. Everything moves up by half of what it grew, to stay centred.
        let ioRoom: int = Math.ceil(popupMC.tB.textHeight + 6 - popupMC.tB.height) | 0;
        if (ioRoom > 0) {
            let ioI: int = 0;
            while (ioI < popupMC.numChildren) {
                popupMC.getChildAt(ioI).y -= (ioRoom / 2) | 0;
                ioI++;
            }
            popupMC.tB.height += ioRoom;
            popupMC.bAction.y += ioRoom;
            popupMC.mcBG.height += ioRoom;
            popupMC.mcBG.Setup(true);
        }
        popupMC.bAction.Setup("Copy invite");
        popupMC.bAction.addEventListener(MouseEvent.CLICK, CopyMessage);
        // The two friendly monsters from the original Invite Friends popup, built into the game
        // (io_invite_friends) so the picture never depends on a file being on the server.
        let ioPicture: Bitmap = new Bitmap(new io_invite_friends(0, 0));
        ioPicture.smoothing = true;
        popupMC.mcImage.addChild(ioPicture);
        popupMC.mcImage.mouseEnabled = false;
        popupMC.mcImage.mouseChildren = false;
        if (popupMC.mcImageFrame) {
            popupMC.mcImage.x = popupMC.mcImageFrame.x + (popupMC.mcImageFrame.width - popupMC.mcImage.width) * 0.5;
            popupMC.mcImage.y = popupMC.mcImageFrame.y + (popupMC.mcImageFrame.height - popupMC.mcImage.height) * 0.5;
        }
        POPUPS.Push(popupMC, null, null, null, null, true, "now");
    }

    public ButtonClick(param1: string): Function {
        let label: string = null;
        label = param1;
        return (param1: MouseEvent): void => {
            if (label == "gift" && GLOBAL.INFERNO_ONLY) {
                // The gift button is the Daily Reward button here.
                BASE.ioOpenDaily();
            } else if (label == "gift") {
                if (POPUPS.QueueCount("gifts") > 0 && GLOBAL._flags.gifts == 1) {
                    POPUPS.Show("gifts");
                } else {
                    // POPUPS.Gift();
                    GLOBAL.Message(KEYS.Get("disabled_gifts"));
                }
            } else if (label == "alert") {
                if (BASE._currentAttacks && BASE._currentAttacks.length > 0) {
                    for (let attack of as3.values(BASE._currentAttacks)) {
                        attack.seen = true;
                    }
                    BASE._attacksModified = true;
                    BASE.Save();
                }
                POPUPS.Show("alerts");
            } else if (label == "invite") {
                if (GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_invite) {
                    GLOBAL._ioInviteSeen = true;
                    this.mc.bInvite.mcSpinner.visible = false;
                    UI_TOP.ioShowInvite();
                } else if (GLOBAL._flags.invites == 1) {
                    POPUPS.Invite();
                } else {
                    GLOBAL.Message(KEYS.Get("disabled_invites"));
                }
            } else if (label == "inbox") {
                if (GLOBAL._flags.messaging == 1) {
                    MAILBOX.Show();
                } else {
                    GLOBAL.Message(KEYS.Get("disabled_mail"));
                }
            } else if (label == "daily") {
                BUY.Offers("daily");
            } else if (label == "earn") {
                GLOBAL.Message(KEYS.Get("discord_earn"));
            }
        };
    }

    public DescentDebuffShow(): void {
        let _loc1_: boolean = (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) && BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT.DescentPassed && (MAPROOM_DESCENT.DescentLevel > 6 && MAPROOM_DESCENT.DescentLevel < MAPROOM_DESCENT._descentLvlMax);
        if (this._descentDebuff) {
            this.DescentDebuffHide();
        }
        if (_loc1_) {
            this._descentDebuff = new DescentDebuffPopup();
            this._descentDebuff.Show(MAPROOM_DESCENT.DescentLevel);
        }
    }

    public DescentDebuffHide(): void {
        if (this._descentDebuff) {
            this._descentDebuff.Hide();
        }
    }

    public DisplayBuffs(): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: any = null;
        let _loc12_: string = null;
        let _loc13_: MovieClip = null;
        // Alliance powerup icons. Hidden in the legacy Inferno, which had no alliances.
        if (BASE.usesInfernoBackend) {
            this.BuffHide(null);
            return;
        }
        let _loc1_: number = POWERUPS.CheckPowers(null, "NORMAL");
        let _loc2_: int = this.mcBuffHolder.numChildren;
        while (_loc2_--) {
            this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.BuffShow));
            this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.BuffHide));
            this.mcBuffHolder.removeChildAt(_loc2_);
        }
        if (_loc1_ > 0) {
            _loc3_ = 3;
            _loc4_ = 2;
            _loc5_ = (-1 * (32 + 4)) | 0;
            _loc6_ = (32 + 4) | 0;
            _loc7_ = 0;
            _loc8_ = 0;
            _loc9_ = 0;
            _loc10_ = 0;
            _loc11_ = POWERUPS.GetPowerups();
            for (_loc12_ in _loc11_) {
                if (POWERUPS._expireRealTime) {
                    if (_loc11_[_loc12_].endtime.Get() < GLOBAL.Timestamp()) {
                        this.BuffHide(null);
                        continue;
                    }
                }
                (_loc13_ = new ui_buffIcon_CLIP()).gotoAndStop(_loc12_);
                _loc13_.name = _loc12_;
                _loc13_.x = _loc9_ * _loc5_;
                _loc13_.y = _loc10_ * _loc6_;
                _loc9_++;
                if (_loc9_ >= _loc3_) {
                    _loc9_ = 0;
                    _loc10_++;
                }
                _loc13_.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.BuffShow));
                _loc13_.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.BuffHide));
                this.mcBuffHolder.addChild(_loc13_);
            }
        } else {
            this.BuffHide(null);
        }
    }

    public BuffShow(param1: MouseEvent): void {
        let _loc8_: bubblepopupBuff = null;
        let _loc2_: MovieClip = as3.as(param1.currentTarget, MovieClip);
        let _loc3_: string = "";
        let _loc4_: any = "";
        let _loc5_: BaseBuff = null;
        _loc5_ = as3.cast(BaseBuffHandler.instance.getBuffByName(_loc2_.name), BaseBuff);
        if (!_loc5_) {
            return;
        }
        let _loc6_: string = _loc5_.description;
        let _loc7_: string = "buff_duration";
        _loc3_ = _loc6_;
        _loc4_ = "<b>" + KEYS.Get(_loc7_) + "</b>";
        if (POWERUPS._expireRealTime) {
            if (POWERUPS.Timeleft(_loc2_.name) > 0) {
                _loc4_ += GLOBAL.ToTime(POWERUPS.Timeleft(_loc2_.name) | 0, true);
            } else {
                _loc4_ = "";
            }
        } else if (POWERUPS.Timeleft(_loc2_.name) > 0) {
            _loc4_ += GLOBAL.ToTime(POWERUPS.Timeleft(_loc2_.name) | 0, true);
        } else {
            _loc4_ = "";
        }
        if (!this._popupBuff) {
            _loc8_ = new bubblepopupBuff();
            this._popupBuff = as3.as(this.addChild(_loc8_), bubblepopupBuff);
            _loc8_.Setup((_loc2_.x + _loc2_.width / 2) | 0, (_loc2_.y + _loc2_.height + 4) | 0, _loc3_, as3.str(_loc4_));
            _loc8_.x = this.mcBuffHolder.x + (_loc2_.x + _loc2_.width / 2);
            _loc8_.y = this.mcBuffHolder.y + (_loc2_.y + _loc2_.height + 4);
        } else {
            as3.cast(this._popupBuff, bubblepopupBuff).Update(_loc3_, as3.str(_loc4_));
        }
    }

    public BuffHide(param1: MouseEvent): void {
        if (this._popupBuff) {
            this.removeChild(this._popupBuff);
            this._popupBuff = null;
        }
    }

    public BuffOff(param1: MouseEvent): void {
        POWERUPS._testToggleOffPowers = true;
        let _loc2_: MovieClip = as3.as(param1.currentTarget, MovieClip);
        POWERUPS.Remove(_loc2_.name);
        this.BuffHide(null);
    }

    public ButtonInfoShow(param1: MouseEvent): void {
        let _loc4_: string = null;
        let _loc2_: int = (param1.target.x + 50) | 0;
        let _loc3_: int = (param1.target.y + 25) | 0;
        let _loc5_: boolean = true;
        switch (param1.target.name) {
            case "bInvite":
                _loc4_ = KEYS.Get("pop_invite");
                break;
            case "ioSwitch":
                _loc4_ = "<b>Switch account</b>";
                break;
            case "bGift":
                if (GLOBAL.INFERNO_ONLY) {
                    let ioStatus: any = UI_TOP.ioStreak();
                    if (!ioStatus) {
                        _loc4_ = "Daily Reward";
                    } else if ((ioStatus.collected | 0) != 1) {
                        _loc4_ = "<b>Daily Reward</b><br>Day " + (ioStatus.offerDay | 0) + ": collect " + (ioStatus.offerShiny | 0) + " Shiny!";
                    } else {
                        _loc4_ = "<b>Daily Reward</b><br>Day " + (ioStatus.day | 0) + " collected. Come back tomorrow!";
                    }
                } else if (POPUPS.QueueCount("gifts") > 0) {
                    _loc4_ = KEYS.Get("pop_acceptgifts", { "v1": POPUPS.QueueCount("gifts") });
                } else {
                    _loc4_ = KEYS.Get("pop_sendgifts");
                }
                break;
            case "bInbox":
                _loc4_ = KEYS.Get("pop_mailbox");
                break;
            case "ioGauntlet":
                _loc4_ = UI_TOP.ioGauntletTip();
                break;
            case "bAlert":
                _loc4_ = KEYS.Get("pop_alerts");
                break;
            case "mcHit":
                _loc4_ = KEYS.Get("pop_outposts");
                if (GLOBAL.INFERNO_ONLY) {
                    _loc4_ = "<b>Outposts</b><br>The number of Outposts under your control. Click the arrow for the list of your Outposts.";
                }
                _loc2_ = (param1.target.parent.x + 140) | 0;
                _loc3_ = (param1.target.parent.y + 20) | 0;
                break;
            case "bDealSpot":
            case "_dealspot":
                _loc4_ = "<b>DealSpot Offers</b><br>Check DealSpot to earn Shiny.";
                _loc2_ = (param1.target.parent.x + 40) | 0;
                _loc3_ = (param1.target.parent.y + 20) | 0;
                if (Boolean(this._dealspot) && this._dealspot._hasOffers) {
                    _loc4_ = "<b>DealSpot Offers</b><br>Check DealSpot to earn Shiny.";
                    _loc3_ = (param1.target.parent.y + 25) | 0;
                    break;
                }
                _loc4_ = " ";
                this.mc.bDealSpot.mouseChildren = false;
                this.BubbleHide();
                this.mc.bDealSpot.visible = false;
                this.mc.bDealSpot.enabled = false;
                if (Boolean(this._dealspot) && Boolean(this._dealspot.parent)) {
                    this._dealspot.parent.removeChild(this._dealspot);
                }
                _loc5_ = false;
                return;
        }
        if (_loc5_ && _loc4_ != null) {
            this.BubbleShow(_loc2_, _loc3_, _loc4_);
        } else if (_loc4_ == null) {
        }
    }

    public ButtonInfoHide(param1: MouseEvent): void {
        this.BubbleHide();
    }

    private SetPoints(param1: number, param2: number, param3: number, param4: number, param5: uint, param6: boolean): void {
        let _loc7_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            this.mc.mcPoints.mcLevel.text = param5.toString();
            _loc7_ = (200 / (param2 - param1) * (param4 - param1)) | 0;
            TweenLite.to(this.mc.mcPoints.mcBar, 0.6, { "width": _loc7_, "ease": Elastic.easeInOut });
            if (param6) {
                this.mc.mcPoints.mcStar.scaleX = this.mc.mcPoints.mcStar.scaleY = 0.8;
                this.mc.mcPoints.mcStar.rotation = 180;
                TweenLite.to(this.mc.mcPoints.mcStar, 1, { "scaleX": 1, "scaleY": 1, "rotation": 0, "ease": Elastic.easeOut });
            }
        }
    }

    public BubbleShow(param1: int, param2: int, param3: string, param4: int = 3): void {
        let _loc5_: bubblepopup3 = null;
        (_loc5_ = new bubblepopup3()).Setup(param1, param2, param3, param4);
        _loc5_.Wobble();
        this._bubbleDo = this.addChild(_loc5_);
    }

    public BubbleHide(): void {
        if (Boolean(this._bubbleDo) && Boolean(this._bubbleDo.parent)) {
            this.removeChild(this._bubbleDo);
        }
    }

    public validateSiegeWeapon(): boolean {
        if (this._siegeweapon == null) {
            return false;
        }
        let _loc1_: boolean = this._siegeweapon.validate();
        if (!_loc1_) {
            this.ClearSiegeWeapon();
        }
        return _loc1_;
    }
}
