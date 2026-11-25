import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, DisplayObjectContainer, IBitmapDrawable, Loader, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { SharedObject, URLRequest, navigateToURL } from "flash/net";
import { System } from "flash/system";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { Dictionary, getTimer } from "flash/utils";
import { IoBaiter, ALLIANCES, ALLIANCEWINDOW, IoWatch, BRESOURCE, LOGIN, UI2, SOUNDS, ATTACK, AutoBankBaseBuff, BASE, IoTerrainPopup, SubscriptionResourceIcon, BUY, BYMConfig, BaseBuff, BaseBuffHandler, Button_CLIP, CATAPULTPOPUP, CHAMPIONBUTTON, CHAMPIONCAGE, CREATUREBUTTON, CREATURELOCKER, CREATURES, ChampionBase, DealSpot, DescentDebuffPopup, Elastic, EnumYardType, GAME, GLOBAL, ImageCache, InstanceManager, IoAttackLogs, IoChangelog, IoDesigner, IoFmi, IoGauntlet, IoHfo, IoHfoUi, IoKit, IoLeaderboards, IoOutpostsPopup, IoTd, IoTestMode, IoWin, KEYS, KOTHHUDGraphic, LOGGER, Linear, MAILBOX, MAPROOM_DESCENT, MapRoom3Cell, MapRoomManager, POPUPS, POWERUPS, ResourceOutpost, SIEGEWEAPONPOPUP, STORE, ScrollSetV, SiegeWeapons, SubscriptionHandler, TUTORIAL, TweenLite, UI_TOP_CLIP, UI_WORKERS, URLLoaderApi, YARD_PROPS, bubblepopup3, bubblepopup4, bubblepopupBuff, flingerLevel, io_invite_friends, io_switch_account, popup_generic, ui_buffIcon_CLIP, IoTilt, IoFormat, IoTot } from "@game";

export class UI_TOP extends UI_TOP_CLIP {
    static {
        as3.fields(this, { _popupWarning: null, _popupBuff: null, _creatureButtons: null, _creatureButtonsMC: null, _bubbleDo: null, _catapult: null, _siegeweapon: null, _buttonIcons: null, _descentDebuff: null, extraResourceRows: 0, _dealspot: null, _resourceUI: null, _resourceR1: 0, _resourceR2: 0, _resourceR3: 0, _resourceR4: 0, _kothIcon: null, _daveClub: null, _RESOURCEBAR_HEIGHT: 37, m_creatureContainer: null, m_scrollBar: null, _ioTexts: null, _ioSwitch: null, _ioGauntlet: null, _ioTd: null, _ioHfo: null, _ioFmi: null, _ioTot: null, _ioLeaderboards: null, _ioAttackLogs: null, _ioWatch: null, _ioChangelog: null, _ioAlliances: null, _ioBars: null, _ioBarsCompact: -1, _ioAdmin: null, _ioDesigner: null, _ioTilt: null, _ioDesignBar: null, _ioDesignBarFor: null, _ioTest: null, _ioTestShown: -1, _ioTools: null, _ioTestBanner: null, _ioGear: null });
    }

    public static readonly CREATUREBUTTONOVER: string = "creatureButtonOver";

    /** The counter's bar at its own size (drawn once), cut in three to stretch the middle only. */
    private static _ioBarArt: BitmapData = null;
    /** QoL #178: when the Alliances counter last asked the server (getTimer), 0 not yet. */
    private static _ioAllyAskedAt: number = 0;
    /** Inferno-only (26 October): when the Watch bar's count (what is live now) was last asked for, and an asking out. */
    private static _ioLiveAskedAt: number = 0;
    private static _ioLiveAsking: boolean = false;
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
    /** (20 October) Trick or Treat's button (com/monsters/events/tot/IoTot.ts). */
    private _ioTot: MovieClip;
    private _ioFmi: MovieClip;
    private _ioTd: MovieClip;
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

    /** (18 October) Watch: anyone's attacks and games, live (IoWatch). */
    private _ioWatch: Sprite;
    private _ioChangelog: Sprite;
    private _ioAlliances: Sprite;
    /** The bars, in their order. */
    private _ioBars: any[];
    private _ioBarsCompact: int;
    private _ioAdmin: Button_CLIP;
    private _ioDesigner: Button_CLIP;
    private _ioTilt: Button_CLIP;
    private _ioDesignBar: Sprite;
    private _ioDesignBarFor: string;
    private _ioTest: Button_CLIP;
    private _ioTestShown: int;
    private _ioTools: Button_CLIP;
    private _ioTestBanner: TextField;
    /** Inferno-only (QoL #312): the page's menu button, on a phone, in the right-hand row of icons (ioPageGear). */
    private _ioGear: Sprite;

    public $ctor(): void {
        this._ioTexts = new Dictionary(true);
        let _loc1_: int = 0;
        let _loc3_: boolean = false;
        super.$ctor();
        // (the UI kit's pictures: small, loading while the yard does; com/monsters/display/IoKit)
        IoKit.preload();
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
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #21: a click on a resource's bar banks it from every harvester)
                let ioR: int = _loc1_;
                this.mc["mcR" + _loc1_].mcHit.buttonMode = true;
                this.mc["mcR" + _loc1_].mcHit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    // (20 October: not on an outpost, whose harvesters can't be banked)
                    if (!BASE.isOutpostOrInfernoOutpost) {
                        BRESOURCE.ioBankAll(ioR);
                    }
                });
            }
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
            this.ioMakeTdButton();
            this.ioMakeGauntletButton();
            this.ioMakeFmiButton();
            this.ioMakeTotButton();
            this.ioMakeHfoButton();
            this.ioDaveClub();
            // (QoL #472: on a touch screen, holding a button shows its tip)
            for (let ioB of as3.values([this.mc.bInvite, this.mc.bGift, this.mc.bInbox, this.mc.bAlert, this._ioFmi, this._ioHfo])) {
                IoWin.longPress(ioB);
            }
            // (QoL #467: a yard opened from a window (the Outposts list's View): "◀ Outposts" on a toast)
            IoWin.yardArrived();
            // (22 November: a practice baiter raid's report, once the yard is back)
            IoBaiter.yardArrived();
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
        if (this._ioFmi && this._ioFmi.mcSpinner && this._ioFmi.mcSpinner.visible) {
            this._ioFmi.mcSpinner.rotation += 4;
        }
        if (this._ioTot && this._ioTot.mcSpinner && this._ioTot.mcSpinner.visible) {
            this._ioTot.mcSpinner.rotation += 4;
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
        if (GLOBAL.INFERNO_ONLY) {
            UI_TOP.ioLightText(this._creatureButtonsMC._mc._txtContainer.flinger_txt);
            UI_TOP.ioLightText(this._creatureButtonsMC._mc._txtContainer.tA);
        }
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

    /**
     * Inferno-only (16 October): a field on the dark wood of the Flinger bar in cream with a dark edge: its grey words
     * ("Flinger 0 / 2,500", "0%") were hard to read on it.
     */
    private static ioLightText(t: TextField): void {
        if (!t) {
            return;
        }
        let f: TextFormat = t.defaultTextFormat;
        f.color = 0xF6E7C1;
        t.defaultTextFormat = f;
        t.textColor = 0xF6E7C1;
        t.filters = [new GlowFilter(0x1A0D04, 0.95, 3, 3, 5)];
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
                    _loc8_.y = CREATUREBUTTON.ioRowY(param2, this._creatureButtons); // (QoL #548: a phone's compact rows)
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
        this.ioPageGear();
        if (this.m_creatureContainer) {
            _loc2_ = this._creatureButtons.length;
            if (_loc2_) {
                while (_loc3_ < _loc2_) {
                    this._creatureButtons[_loc3_].x = 14;
                    this._creatureButtons[_loc3_].y = CREATUREBUTTON.ioRowY(_loc3_, this._creatureButtons);
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
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #608, 14 October: the sound and music buttons showed "on" after every yard switch, muted or not:
            // the bar is made afresh and only a click set their picture)
            let attackFrames: int = (mode == GLOBAL.e_BASE_MODE.ATTACK || mode == GLOBAL.e_BASE_MODE.WMATTACK ? 2 : 0) | 0;
            this.mcSound.gotoAndStop((SOUNDS._muted ? 2 : 1) + attackFrames);
            this.mcMusic.gotoAndStop((SOUNDS._mutedMusic ? 2 : 1) + attackFrames);
        }
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
            // Inferno-only (16 October): a long name ("ABADDONAKKI'S YARD") drawn smaller to fit its plate; it ran
            // under the owner's picture and the first resource's icon. Its field began under the picture (x 36) and
            // ran past the plate (217): it is the plate between the two now.
            if (GLOBAL.INFERNO_ONLY) {
                let nameField: TextField = this.mc.mcPoints.tName;
                nameField.x = 48;
                nameField.width = 165;
                GLOBAL.ioFitText(nameField, 9);
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
                    if (GLOBAL.INFERNO_ONLY && this.mc["mcR" + n].mcHit) {
                        // (20 October: no hand over the bar on an outpost, where a click banks nothing)
                        this.mc["mcR" + n].mcHit.buttonMode = !BASE.isOutpostOrInfernoOutpost;
                    }
                    if (GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                        // (QoL #22: what the harvesters hold, and when the storage is full)
                        // (QoL #576: the exact amount, when the bar shows it short)
                        let have: number = Number(BASE._resources["r" + n].Get());
                        if (have >= 1e9) {
                            _loc2_ += "<br>" + KEYS.Get("io_res_have", { "v1": GLOBAL.FormatNumber(have) });
                            _loc3_ += 1;
                        }
                        let extra: string = UI_TOP.ioResourceLines(n, Number(_loc8_) + Number(_loc6_));
                        if (extra) {
                            _loc2_ += extra;
                            _loc3_ += extra.split("<br>").length - 1;
                        }
                    }
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

    /**
     * Inferno-only (QoL #22): for resource `n`, "In harvesters: X" (waiting to be banked; a click on the bar banks
     * it) and when the storage fills at `perHour`, or that it is full. "" when there's nothing to say.
     */
    public static ioResourceLines(n: int, perHour: number): string {
        let held: number = 0;
        for (let b of (InstanceManager.getInstancesByClass(BRESOURCE) ?? [])) {
            let r: BRESOURCE = b as BRESOURCE;
            if (r._class === "resource" && r._type == n && r._stored) {
                held += Number(r._stored.Get());
            }
        }
        let have: number = Number(BASE._resources["r" + n].Get());
        let max: number = Number(BASE._resources["r" + n + "max"]);
        let out: string = "";
        // (20 October: not on an outpost, whose harvesters can't be banked: no "In harvesters ... (click to bank)")
        if (held > 0 && !BASE.isOutpostOrInfernoOutpost) {
            out += "<br>" + KEYS.Get("io_res_in_harvesters", { "v1": GLOBAL.FormatNumber(Math.floor(held)) });
        }
        if (max > 0 && have >= max) {
            out += "<br><font color=\"#FF6A4A\"><b>" + KEYS.Get("io_res_full") + "</b></font>";
        } else if (max > 0 && perHour > 0) {
            out += "<br>" + KEYS.Get("io_res_full_in", { "v1": GLOBAL.ioDuration(Math.ceil((max - have) / perHour * 3600)) });
        }
        return out;
    }

    /** Inferno-only (QoL #23): "FULL" on a resource's bar while its storage is full. */
    private ioFullTags(): void {
        for (let n: int = 1; n <= 4; n++) {
            let bar: any = this.mc["mcR" + n];
            if (!bar) {
                continue;
            }
            let tag: TextField = as3.as(bar.getChildByName("ioFull"), TextField);
            let max: number = Number(BASE._resources["r" + n + "max"]);
            let full: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && max > 0 && Number(BASE._resources["r" + n].Get()) >= max && !GLOBAL.ioFreeBuild();
            if (!full) {
                if (tag) {
                    tag.visible = false;
                }
                continue;
            }
            if (!tag) {
                tag = new TextField();
                tag.name = "ioFull";
                tag.defaultTextFormat = new TextFormat("Verdana", 8, 0xFFFFFF, true);
                tag.autoSize = TextFieldAutoSize.LEFT;
                tag.selectable = false;
                tag.mouseEnabled = false;
                tag.background = true;
                tag.backgroundColor = 0xB0201A;
                tag.text = KEYS.Get("io_res_full_tag");
                tag.x = 104;
                tag.y = 1;
                bar.addChild(tag);
            }
            tag.visible = true;
        }
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
        // (Inferno-only, QoL #576: a billion or more, short ("1.23B"), rather than squeezed small; the exact amount is
        // in the bar's tip)
        this.ioSetText(as3.cast(_loc4_.tR, TextField), GLOBAL.ioFreeBuild() ? "<b>Unlimited</b>" : "<b>" + (GLOBAL.INFERNO_ONLY && _loc5_ >= 1e9 ? GLOBAL.ioShort(_loc5_) : GLOBAL.FormatNumber(_loc5_)) + "</b>");
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
        // (QoL #472's caption under it, "Daily", taken off on 20 October)
        this.mc.bGift.mcSpinner.visible = waiting;
        this.mc.bGift.mcCounter.visible = true;
        UI_TOP.ioCounterText(this.mc.bGift.mcCounter, String(waiting ? status.offerDay | 0 : status.day | 0));
    }

    /**
     * Inferno-only (20 October): a button's round counter showing `text` whole. Its field wrapped a second digit onto
     * a line it has no room for, so 12 read "1": now on one line, the badge widened to a pill round 2 digits or more
     * (centred where the circle was), the font a little smaller from 3.
     */
    public static ioCounterText(counter: any, text: string): void {
        if (!counter || !counter.t) {
            return;
        }
        let t: TextField = as3.as(counter.t, TextField);
        let bg: DisplayObject = null;
        for (let i: int = 0; i < counter.numChildren; i++) {
            let c: DisplayObject = counter.getChildAt(i);
            if (c != t) {
                bg = c;
                break;
            }
        }
        if (counter.$ioCx == null) {
            counter.$ioCx = bg ? bg.x + bg.width / 2 : t.x + t.width / 2;
            counter.$ioBgW = bg ? bg.width / (bg.scaleX || 1) : 16;
            counter.$ioBgX = bg ? bg.x : 0;
            counter.$ioTx = t.x;
            counter.$ioTw = t.width;
        }
        t.wordWrap = false;
        t.htmlText = text.length >= 3 ? "<b><font size=\"9\">" + text + "</font></b>" : "<b>" + text + "</b>";
        let need: number = text.length >= 2 ? Math.ceil(t.textWidth + 8) : 0;
        let w: number = Math.max(counter.$ioBgW, need);
        if (bg) {
            bg.scaleX = w / counter.$ioBgW;
            bg.x = Math.round(counter.$ioCx - w / 2);
        }
        t.width = Math.max(counter.$ioTw, w - 1);
        t.x = Math.round(counter.$ioCx - t.width / 2);
    }

    /**
     * Inferno-only: Moloch's Gauntlet's button (com/monsters/maproom_advanced/IoGauntlet.ts), with the
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
        UI_TOP.ioRingArt(b, C, false);
        if (GLOBAL.INFERNO_ONLY) {
            // (held on a touch screen, its tip; QoL #472's caption under it, "Gauntlet 3/13", taken off on 20 October)
            IoWin.longPress(b);
        }
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

    /**
     * Inferno-only (10 October): the D.A.V.E. Club's button back, under the resources, on the player's own main
     * yard: it opens the ground choice (IoTerrainPopup), all that is left of the club here.
     */
    private ioDaveClub(): void {
        let own: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
        if (!own || TUTORIAL._stage < 200 || GLOBAL._flags.subscriptions == 1) {
            return;
        }
        let icon: SubscriptionResourceIcon = new SubscriptionResourceIcon(true);
        icon.name = "ioDaveClub";
        icon.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            UI_TOP.ioTipHide();
            IoTerrainPopup.Show(e);
        });
        icon.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            // (QoL #235: in the player's language)
            UI_TOP.ioTip(icon, KEYS.Get("io_tr_top_club_tip"), "right");
        });
        icon.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_TOP.ioTipHide();
        });
        // (QoL #472: held on a touch screen, its tip. 16 October, the user's: no "Club" caption under the picture, which
        // already says D.A.V.E. CLUB)
        IoWin.longPress(icon);
        this.addResourceBar(icon);
    }

    /**
     * Hellgate Defense's button (com/monsters/td/IoTd.ts): a tower in a red ring, first under the workers,
     * above Moloch's Gauntlet's. On the player's own main yard.
     */
    private ioMakeTdButton(): MovieClip {
        let C: number = NaN;
        let b: MovieClip = null;
        let picture: Sprite = null;
        C = 20.75;
        b = new MovieClip();
        b.name = "ioTd";
        b.buttonMode = true;
        b.mouseChildren = false;
        let hit: Shape = new Shape();
        hit.graphics.beginFill(16777215, 0);
        hit.graphics.drawCircle(C, C, 31);
        hit.graphics.endFill();
        b.addChild(hit);
        b.graphics.lineStyle(3, 4854280, 1);
        b.graphics.beginFill(13780522, 1);
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
        let props: any = GLOBAL._buildingProps[130 - 1];
        ImageCache.GetImageWithCallBack("buildingbuttons/" + (props && props.buildingbuttons ? props.buildingbuttons[0] : "130") + ".jpg", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let image: Bitmap = new Bitmap(bmd);
            image.smoothing = true;
            image.width = image.height = 50;
            image.x = image.y = C - 25;
            picture.addChild(image);
        });
        UI_TOP.ioRingArt(b, C, false);
        // (QoL #472: its name under the picture; held on a touch screen, its tip)
        IoWin.caption(b, KEYS.Get("io_win_cap_hellgate"), C, C + 17);
        IoWin.longPress(b);
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, IoTd.Show);
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            // (QoL #235: in the player's language)
            UI_WORKERS.ioShowTip(b, KEYS.Get("io_tr_top_hellgate_tip"));
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        UI_WORKERS.ioAddAboveGauntlet(b);
        this._ioTd = b;
        return b;
    }

    private static ioGauntletTip(): string {
        let ioG: any = IoGauntlet.flag();
        // (QoL #570: "Opens in" / "Closes in", as FMI's tip says, and when, on the player's clock)
        let now: number = GLOBAL.Timestamp();
        // (QoL #235: in the player's language, the date it opens too)
        let closes: string = ioG && ioG.closesAt ? " " + KEYS.Get("io_tr_top_gt_closes", { "v1": IoGauntlet.ioLeft((Number(ioG.closesAt) - now) | 0) }) : "";
        let opens: string = ioG && ioG.opensAt && Number(ioG.opensAt) > now ? KEYS.Get("io_tr_top_gt_opens", { "v1": IoGauntlet.ioLeft((Number(ioG.opensAt) - now) | 0), "v2": UI_TOP.ioGauntletNext() }) : KEYS.Get("io_tr_top_gt_closed", { "v1": UI_TOP.ioGauntletNext() });
        return "<b>" + KEYS.Get("io_tr_top_gt_title") + "</b><br>" + (!ioG ? KEYS.Get("io_tr_top_gt_monthly") : !ioG.open ? opens : (ioG.stage | 0) > (ioG.stages | 0) ? KEYS.Get("io_tr_top_gt_beaten") + closes : KEYS.Get("io_tr_top_gt_open", { "v1": ioG.stage | 0, "v2": ioG.stages | 0 }) + closes);
    }

    /** (QoL #235) IoGauntlet.ioNextFirst in the player's language: "on 1 Nov, 01:00 (your time)". */
    private static ioGauntletNext(): string {
        let now: Date = new Date();
        let next: Date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        return KEYS.Get("io_tr_top_gt_on", { "v1": IoFormat.dateTime(next.getTime() / 1000) });
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
        UI_TOP.ioRingArt(b, C, true);
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, IoHfoUi.ShowWindow);
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            UI_WORKERS.ioShowTip(b, GLOBAL.INFERNO_ONLY ? IoHfoUi.tip() : "<b>" + KEYS.Get("hfo_event_title") + "</b>"); // (QoL #593: progress, as the invasion's tip)
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        UI_WORKERS.ioAddUnderGauntlet(b);
        this._ioHfo = b;
        return b;
    }

    /**
     * Inferno-only (10 October): the Frozen Monster Invasion's button (com/monsters/events/fmi/IoFmi.ts): a
     * Permafrost Hulk in a frosted ring, in Moloch's Gauntlet's place in the workers' column. Shown while the
     * invasion is on and from a week before it (for players who have won Hell Freezes Over); its ring turns while
     * a wave waits to be fought.
     */
    private ioMakeFmiButton(): MovieClip {
        let C: number = 20.75;
        let b: MovieClip = new MovieClip();
        b.name = "ioFmi";
        b.buttonMode = true;
        b.mouseChildren = false;
        let hit: Shape = new Shape();
        hit.graphics.beginFill(16777215, 0);
        hit.graphics.drawCircle(C, C, 31);
        hit.graphics.endFill();
        b.addChild(hit);
        b.graphics.lineStyle(3, 0x1E5A8C, 1);
        b.graphics.beginFill(0xCFF2FF, 1);
        b.graphics.drawCircle(C, C, 25);
        b.graphics.endFill();
        let picture: Sprite = new Sprite();
        let round: Shape = new Shape();
        round.graphics.beginFill(16711680, 1);
        round.graphics.drawCircle(C, C, 21);
        round.graphics.endFill();
        let back: Shape = new Shape();
        back.graphics.beginFill(0x2A6FA8, 1);
        back.graphics.drawCircle(C, C, 21);
        back.graphics.endFill();
        picture.addChild(back);
        b.addChild(picture);
        b.addChild(round);
        picture.mask = round;
        ImageCache.GetImageWithCallBack("monsters/IC31-small.png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let image: Bitmap = new Bitmap(bmd);
            image.smoothing = true;
            let k: number = 44 / Math.max(1, bmd.width, bmd.height);
            image.width = bmd.width * k;
            image.height = bmd.height * k;
            image.x = C - image.width / 2;
            image.y = C - image.height / 2 + 2;
            picture.addChild(image);
        });
        let spinner: Shape = new Shape();
        spinner.graphics.lineStyle(3, 0x7FE8FF, 1);
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
        UI_TOP.ioRingArt(b, C, true);
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, IoFmi.ShowWindow);
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            UI_WORKERS.ioShowTip(b, IoFmi.tip());
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        UI_WORKERS.ioAddFmi(b);
        this._ioFmi = b;
        return b;
    }

    /**
     * Inferno-only (20 October): Trick or Treat's button (com/monsters/events/tot/IoTot.ts): a jack-o'-lantern in an
     * orange ring, right under Moloch's Gauntlet's. Shown from a few days before it opens till it's over (and while a
     * trick waits to be faced); its ring turns while a door waits to be knocked on, or a trick to be faced.
     */
    private ioMakeTotButton(): MovieClip {
        let C: number = 20.75;
        let b: MovieClip = new MovieClip();
        b.name = "ioTot";
        b.buttonMode = true;
        b.mouseChildren = false;
        let hit: Shape = new Shape();
        hit.graphics.beginFill(16777215, 0);
        hit.graphics.drawCircle(C, C, 31);
        hit.graphics.endFill();
        b.addChild(hit);
        b.graphics.lineStyle(3, 0x6A2A08, 1);
        b.graphics.beginFill(0xFF8A1E, 1);
        b.graphics.drawCircle(C, C, 25);
        b.graphics.endFill();
        // the night inside the ring, and the lantern
        let face: Shape = new Shape();
        face.graphics.beginFill(0x2A0E2E, 1);
        face.graphics.drawCircle(C, C, 21);
        face.graphics.endFill();
        let g: any = face.graphics;
        g.beginFill(0xE8641A, 1);
        g.drawEllipse(C - 15, C - 10, 30, 24);
        g.endFill();
        g.beginFill(0xF07A24, 1);
        g.drawEllipse(C - 8, C - 10, 16, 24);
        g.endFill();
        g.beginFill(0x3A6A1A, 1);
        g.drawRect(C - 2, C - 15, 4, 6);
        g.endFill();
        g.beginFill(0xFFE040, 1);
        g.moveTo(C - 10, C - 1);
        g.lineTo(C - 4, C - 1);
        g.lineTo(C - 7, C - 6);
        g.lineTo(C - 10, C - 1);
        g.moveTo(C + 4, C - 1);
        g.lineTo(C + 10, C - 1);
        g.lineTo(C + 7, C - 6);
        g.lineTo(C + 4, C - 1);
        g.moveTo(C - 10, C + 4);
        g.lineTo(C + 10, C + 4);
        g.lineTo(C + 6, C + 9);
        g.lineTo(C + 2, C + 6);
        g.lineTo(C - 2, C + 9);
        g.lineTo(C - 6, C + 6);
        g.lineTo(C - 10, C + 4);
        g.endFill();
        b.addChild(face);
        let spinner: Shape = new Shape();
        spinner.graphics.lineStyle(3, 0xFFB040, 1);
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
        UI_TOP.ioRingArt(b, C, false);
        // (no caption under it: 20 October)
        IoWin.longPress(b);
        b.visible = false;
        b.addEventListener(MouseEvent.CLICK, IoTot.Show);
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            UI_WORKERS.ioShowTip(b, IoTot.tip());
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            UI_WORKERS.PopupHide();
        });
        UI_WORKERS.ioAddTot(b);
        this._ioTot = b;
        return b;
    }

    private ioTotButton(): void {
        if (!this._ioTot) {
            return;
        }
        let was: boolean = this._ioTot.visible;
        this._ioTot.visible = IoTot.buttonShown();
        this._ioTot.mcSpinner.visible = this._ioTot.visible && IoTot.waiting();
        if (was != this._ioTot.visible) {
            UI_WORKERS.ioPlaceExtra();
        }
    }

    private ioFmiButton(): void {
        if (!this._ioFmi) {
            return;
        }
        let f: any = IoFmi.flag();
        this._ioFmi.visible = IoFmi.buttonShown() && TUTORIAL._stage >= 200;
        this._ioFmi.alpha = Number(f && f.open ? 1 : 0.6);
        this._ioFmi.mcSpinner.visible = this._ioFmi.visible && IoFmi.waveWaiting();
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
        this.ioFmiButton();
        this.ioTotButton();
        if (!this._ioGauntlet) {
            return;
        }
        let status: any = IoGauntlet.flag();
        let own: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost;
        // (Hellgate Defense's button is gone: the game moved into the Devil's Arcade, building 142, 7 October)
        if (this._ioTd) {
            this._ioTd.visible = false;
        }
        // (10 October: while closed, only shown from a week before it opens)
        let soon: boolean = Boolean(status) && !status.open && Number(status.opensAt) > 0 && Number(status.opensAt) - GLOBAL.Timestamp() <= (status.showDaysBefore != null ? Number(status.showDaysBefore) : 7) * 86400;
        this._ioGauntlet.visible = Boolean(status) && (status.open || soon) && own && TUTORIAL._stage >= 200;
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
                // (QoL #528: asked first; it's a small button among the sound toggles, and a slip signed you out)
                GLOBAL.Message(KEYS.Get("io_switch_ask"), KEYS.Get("io_switch_yes"), (): void => {
                    try {
                        GAME.ioSwitchAccount();
                    } catch (err) {
                        LOGGER.Log("err", "Switch account: " + err.message);
                    }
                }, null, KEYS.Get("io_switch_stay"), null);
            });
            this._ioSwitch.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
                // (QoL #235: in the player's language)
                UI_TOP.ioTip(this._ioSwitch, KEYS.Get("io_tr_top_switch_tip"), "below");
            });
            this._ioSwitch.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
                UI_TOP.ioTipHide();
            });
            IoWin.longPress(this._ioSwitch); // (QoL #472)
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

    /**
     * Inferno-only (QoL #312): on a phone, the page's menu (its settings) opens from a gear here, left of Switch
     * account in the right-hand row of icons, in the player's own yards; the page's own button at the top centre
     * (over the shortcut bars, the Designer and Tilt, the map's toolbar) is hidden while this one is up
     * (player/Shell.ts, window.__bwShell: gameGear says it is up, menu opens the menu). Elsewhere the page's shows.
     */
    private ioPageGear(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        let page: any = null;
        try {
            page = typeof window != "undefined" ? (window as any).__bwShell : null;
        } catch (e) {
            page = null;
        }
        let own: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
        let want: boolean = GLOBAL.ioOnPhone && own && Boolean(page) && typeof page.gameGear == "function" && Boolean(this.mcSave);
        if (!want || !page.gameGear(true)) {
            if (this._ioGear) {
                this._ioGear.visible = false;
            }
            return;
        }
        if (!this._ioGear) {
            let g: Sprite = new Sprite();
            g.name = "ioPageGear";
            g.buttonMode = true;
            g.mouseChildren = false;
            g.graphics.lineStyle(1.5, 14708778, 1);
            g.graphics.beginFill(0x1E1210, 0.92);
            g.graphics.drawCircle(12, 12, 12);
            g.graphics.endFill();
            g.graphics.lineStyle(2.5, 0xFFC870, 1);
            g.graphics.drawCircle(12, 12, 4.5);
            for (let i: int = 0; i < 8; i++) {
                let a: number = i * Math.PI / 4;
                g.graphics.moveTo(12 + Math.cos(a) * 6.5, 12 + Math.sin(a) * 6.5);
                g.graphics.lineTo(12 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 9.5);
            }
            g.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                SOUNDS.Play("click1");
                try {
                    (window as any).__bwShell.menu();
                } catch (err) {
                }
            });
            g.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
                UI_TOP.ioTip(g, "<b>" + KEYS.Get("io_win_gear") + "</b>", "below");
            });
            g.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
                UI_TOP.ioTipHide();
            });
            this.addChild(g);
            this._ioGear = g;
        }
        let left: number = this._ioSwitch && this._ioSwitch.visible ? this._ioSwitch.x : this.mcSave.x;
        this._ioGear.visible = true;
        this._ioGear.x = left - 30;
        this._ioGear.y = this.mcSave.y;
        if (this.getChildIndex(this._ioGear) != this.numChildren - 1) {
            this.setChildIndex(this._ioGear, (this.numChildren - 1) | 0);
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
        // (QoL #675: a visit's top bar has no Shiny counter: the bars start where it would end)
        if (!r5) {
            return 330;
        }
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

    /**
     * The round buttons' forged ring (the UI kit, 11 October): over the picture, lit while pointed at; ice for the
     * frozen events. Until it has loaded the button keeps its drawn coloured ring.
     */
    private static ioRingArt(b: MovieClip, C: number, ice: boolean): void {
        let ring: Shape = new Shape();
        ring.name = "ioRing";
        // (under the spinner, which turns just outside it while the event waits for the player)
        let spinner: any = b.mcSpinner;
        if (spinner && spinner.parent == b) {
            b.addChildAt(ring, b.getChildIndex(spinner));
        } else {
            b.addChild(ring);
        }
        let hot: boolean = false;
        let piece: string = ice ? "ring_ice" : "ring";
        let draw: Function = (): void => {
            ring.graphics.clear();
            IoKit.stamp(ring.graphics, piece + (hot ? "_h" : ""), C, C, 60, 60);
        };
        draw();
        IoKit.whenLoaded([piece, piece + "_h"], draw);
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hot = true;
            draw();
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hot = false;
            draw();
        });
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
            UI_TOP.ioTipHide();
            onClick(e);
        });
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            b.filters = [new GlowFilter(0xFFC94A, 0.8, 8, 8, 2)];
            UI_TOP.ioTip(b, "<b>" + tipTitle + "</b><br>" + tipText, "below");
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            b.filters = [];
            UI_TOP.ioTipHide();
        });
        this.mc.addChild(b);
        return b;
    }

    /**
     * Inferno-only (QoL #178): a red count on the Alliances bar's picture: the invites and join requests waiting on
     * the player (the inbox's pending rows) and the pins not read yet. From the alliance caches (no request here).
     */
    public static ioAllianceBadge(param1: any = null): void {
        let top: UI_TOP = UI2._top;
        UI_TOP.ioBadge(top ? top._ioAlliances : null, (ALLIANCES.PendingInviteCount() + ALLIANCES.ioUnreadPins()) | 0, "ioAllyBadge");
    }

    // ---- QoL #90 and #141: what is new on the Attack Log and the Change Log since the player last looked
    /** Attacks on the player newer than the last one seen in the Attack Log. */
    public static _ioAttacksNew: int = 0;
    /** Change Log days newer than the newest seen there. */
    public static _ioChangesNew: int = 0;

    /** A per-player mark kept in this browser ("ioAlSeen", "ioClSeen"; the Change Log's choices, IoChangelog). */
    public static ioMark(key: string, value: string = null): string {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let name: string = key + LOGIN._playerID;
            if (value != null) {
                so.data[name] = value;
                so.flush();
                return value;
            }
            return so.data[name] != null ? String(so.data[name]) : "";
        } catch (e) {
        }
        return "";
    }

    private static ioAskNew(): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["v", 1]], (r: any): void => {
            if (!r || r.error) {
                return;
            }
            UI_TOP.ioAttacksSeen(r, false);
        }, (e: IOErrorEvent): void => {});
        new URLLoaderApi().load(GLOBAL.serverUrl + "changelog", null, (r: any): void => {
            if (!r || r.error || !(as3.is(r.entries, Array))) {
                return;
            }
            UI_TOP.ioChangesSeen(as3.as(r.entries, Array), false);
        }, (e: IOErrorEvent): void => {});
    }

    /** The attack logs as the server sent them (`onme` rows: [id, at, ...]); `seen`: the player is looking now. */
    public static ioAttacksSeen(r: any, seen: boolean): void {
        let newest: int = 0;
        let mark: int = Number(UI_TOP.ioMark("ioAlSeen")) | 0;
        let n: int = 0;
        for (let row of as3.values(as3.as(r.onme, Array) || [])) {
            let at: int = row[1] | 0;
            newest = Math.max(newest, at) | 0;
            if (at > mark) {
                n++;
            }
        }
        if (seen || UI_TOP.ioMark("ioAlSeen") == "") {
            // (looked at now; or the first time in this browser: what was there before isn't new)
            UI_TOP.ioMark("ioAlSeen", String(Math.max(newest, mark)));
            n = 0;
        }
        UI_TOP._ioAttacksNew = n;
        let top: UI_TOP = UI2._top;
        UI_TOP.ioBadge(top ? top._ioAttackLogs : null, n, "ioAttacksBadge");
    }

    /**
     * Inferno-only (22 October): a change's short name, its area and title hashed (the Change Log's "seen" list and
     * its "new for you"; the changelog page, public/docs/changelog.html, works it out the same way).
     */
    public static ioClId(item: any): string {
        let s: string = String(item && item.area || "") + "|" + String(item && item.title || "");
        let h: number = 5381;
        for (let i: int = 0; i < s.length; i++) {
            h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
        }
        return h.toString(36);
    }

    /**
     * Inferno-only (22 October): the changes the player hasn't seen ({ ids: { "date:id": true }, n }): every change
     * of a day newer than the newest one seen ("ioClSeen"), and on that day the ones not in its seen list
     * ("ioClSeenT", "date=" and ioClId's, comma-separated: a day gets more changes as it goes). Seen before the list was kept,
     * that day counts as seen. Never looked here: nothing is new. A day without its changes (a test's) counts one.
     */
    public static ioChangesFresh(entries: any[]): any {
        let out: any = {};
        let n: int = 0;
        let mark: string = UI_TOP.ioMark("ioClSeen");
        if (mark == "") {
            return { "ids": out, "n": 0 };
        }
        // (the list is kept with its day, "2026-10-22=id,id,...": a list of another day is no list)
        let list: string = UI_TOP.ioMark("ioClSeenT");
        list = list.indexOf(mark + "=") == 0 ? list.substr(mark.length + 1) : "";
        let seenIds: any = {};
        for (let t of as3.values(list.split(","))) {
            if (t) {
                seenIds[t] = true;
            }
        }
        for (let e of as3.values(entries)) {
            let d: string = String(e.date);
            if (d < mark || (d == mark && list == "")) {
                continue;
            }
            let items: any[] = as3.as(e.items, Array);
            if (!items) {
                if (d > mark) {
                    n++;
                }
                continue;
            }
            for (let it of as3.values(items)) {
                let id: string = UI_TOP.ioClId(it);
                if (d > mark || !seenIds[id]) {
                    out[d + ":" + id] = true;
                    n++;
                }
            }
        }
        return { "ids": out, "n": n };
    }

    /** The Change Log's days (newest first, each with its `date`); `seen`: the player is looking now. */
    public static ioChangesSeen(entries: any[], seen: boolean): void {
        let newest: string = entries.length ? String(entries[0].date) : "";
        let mark: string = UI_TOP.ioMark("ioClSeen");
        // (22 October: the changes not seen, not the days: a day gets more as it goes)
        let n: int = UI_TOP.ioChangesFresh(entries).n | 0;
        if (seen || mark == "") {
            if (newest && newest >= mark) {
                let ids: any[] = [];
                for (let it of as3.values(as3.as(entries[0].items, Array) || [])) {
                    ids.push(UI_TOP.ioClId(it));
                }
                UI_TOP.ioMark("ioClSeen", newest);
                UI_TOP.ioMark("ioClSeenT", newest + "=" + ids.join(","));
            }
            n = 0;
        }
        UI_TOP._ioChangesNew = n;
        let top: UI_TOP = UI2._top;
        UI_TOP.ioBadge(top ? top._ioChangelog : null, n, "ioChangesBadge");
    }

    /**
     * Inferno-only (26 October, the user's: "the watch tab should have a red circle with a number of how many things are
     * currently live"): the Watch bar's red count, what is live now (live/list's items, as the Watch window lists them:
     * not the player's own). Asked every 15 seconds while the bar shows; the Watch window's and the watching's own asks
     * set it too.
     */
    public static ioLiveBadge(n: int): void {
        UI_TOP._ioLiveAskedAt = getTimer();
        let top: UI_TOP = UI2._top;
        UI_TOP.ioBadge(top ? top._ioWatch : null, n, "ioLiveBadge");
    }

    private static ioAskLive(): void {
        if (UI_TOP._ioLiveAsking) {
            return;
        }
        UI_TOP._ioLiveAsking = true;
        UI_TOP._ioLiveAskedAt = getTimer();
        new URLLoaderApi().load(GLOBAL.serverUrl + "live/list", [["t", GLOBAL.Timestamp()]], (r: any): void => {
            UI_TOP._ioLiveAsking = false;
            if (r && (r.error === 0 || r.error === "0")) {
                UI_TOP.ioLiveBadge((as3.as(r.items, Array) || []).length | 0);
            }
        }, (e: IOErrorEvent): void => {
            UI_TOP._ioLiveAsking = false;
        });
    }

    /** A red count on a shortcut bar's picture (`n` 0: none). */
    private static ioBadge(bar: Sprite, n: int, name: string): void {
        if (!bar) {
            return;
        }
        let badge: Sprite = as3.as(bar.getChildByName(name), Sprite);
        if (n <= 0) {
            if (badge) {
                badge.visible = false;
            }
            return;
        }
        if (!badge) {
            badge = new Sprite();
            badge.name = name;
            badge.mouseEnabled = false;
            badge.mouseChildren = false;
            let t: TextField = new TextField();
            t.name = "n";
            t.defaultTextFormat = new TextFormat("Verdana", 9, 0xFFFFFF, true);
            t.autoSize = TextFieldAutoSize.LEFT;
            t.selectable = false;
            badge.addChild(t);
            badge.filters = [new DropShadowFilter(1, 60, 0, 0.6, 2, 2, 1, 1)];
            bar.addChild(badge);
        }
        let text: TextField = as3.as(badge.getChildByName("n"), TextField);
        text.text = n > 99 ? "99+" : String(n);
        let w: number = Math.max(15, Math.ceil(text.textWidth) + 8);
        badge.graphics.clear();
        badge.graphics.lineStyle(1, 0xFFE6A0, 1);
        badge.graphics.beginFill(0xC0201A, 1);
        badge.graphics.drawRoundRect(0, 0, w, 15, 15);
        badge.graphics.endFill();
        text.x = (w - text.textWidth) / 2 - 2;
        text.y = -1;
        badge.x = 20;
        badge.y = 1;
        badge.visible = true;
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
        // (QoL #675: and while visiting a yard, so Alliances, the logs, the boards and the Change Log are still there)
        let viewing: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.IVIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMVIEW;
        let mine: boolean = GLOBAL.INFERNO_ONLY && TUTORIAL._stage >= 200 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD || viewing) && !GLOBAL.ioDesignMode();
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
            this._ioWatch = this.ioMakeBar("ioWatch", KEYS.Get("tb_watch"), UI_TOP.ioPictureIcon("watch"), (e: MouseEvent): void => {
                IoWatch.Show(e);
            }, KEYS.Get("io_watch_title"), KEYS.Get("io_watch_tip"));
            this._ioLeaderboards = this.ioMakeBar("ioLeaderboards", KEYS.Get("tb_leaderboard"), UI_TOP.ioPictureIcon("leaderboard"), (e: MouseEvent): void => {
                IoLeaderboards.Show(e);
            }, KEYS.Get("lb_title"), KEYS.Get("lb_tip"));
            this._ioChangelog = this.ioMakeBar("ioChangelog", KEYS.Get("tb_changelog"), UI_TOP.ioPictureIcon("changelog"), (e: MouseEvent): void => {
                IoChangelog.Show(e);
            }, KEYS.Get("cl_title"), KEYS.Get("cl_tip"));
            this._ioBars = [this._ioAlliances, this._ioAttackLogs, this._ioWatch, this._ioLeaderboards, this._ioChangelog];
        }
        this._ioAlliances.visible = true;
        if (UI_TOP._ioAllyAskedAt == 0 || getTimer() - UI_TOP._ioAllyAskedAt > 180000) {
            // (QoL #178: the invites, join requests and new pins waiting, asked at the start and every 3 minutes)
            UI_TOP._ioAllyAskedAt = getTimer();
            if (!ALLIANCEWINDOW._open) {
                ALLIANCES.LoadMessages(UI_TOP.ioAllianceBadge, true);
                ALLIANCES.LoadMyAlliance(UI_TOP.ioAllianceBadge, true);
            }
            // (QoL #90 and #141: new attacks on the player, and new Change Log days, since they were last looked at)
            UI_TOP.ioAskNew();
        }
        this._ioAttackLogs.visible = true;
        this._ioWatch.visible = IoWatch.on;
        if (IoWatch.on && (UI_TOP._ioLiveAskedAt == 0 || getTimer() - UI_TOP._ioLiveAskedAt > 15000)) {
            UI_TOP.ioAskLive();
        }
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
            room -= GLOBAL.INFERNO_ONLY ? 80 : 250; // (QoL #410: one Admin button now)
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
            b.y = Number((this.mc.mcR5 ? this.mc.mcR5.y : 6) + (h - 38) / 2 + 1);
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
        // (QoL #410: one "Admin ▾" button with a menu (com/monsters/admin/IoTestMode.ts) in place of the row of Admin,
        // Test, Test tools, Designer and Tilt buttons)
        if (GLOBAL.INFERNO_ONLY) {
            IoTestMode.ioAdminMenu(this.mc, show, show ? this.ioAfterShiny() : 0, show ? Number(this.mc.mcR5.y) : 0);
            return;
        }
        if (!show) {
            if (this._ioAdmin) {
                this._ioAdmin.visible = false;
            }
            if (this._ioTilt) {
                this._ioTilt.visible = false;
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
        // Admin test mode switch, and the test tools while it is on (com/monsters/admin/IoTestMode.ts).
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
        // The Designer (com/monsters/admin/IoDesigner.ts): kits, wild tribe and Moloch layouts.
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
        // (14 October) the yard's view tilt (com/monsters/rendering/IoTilt.ts), admins only for now
        if (!this._ioTilt) {
            this._ioTilt = new Button_CLIP();
            this._ioTilt.Setup("Tilt");
            this._ioTilt.name = "ioTiltButton";
            this._ioTilt.addEventListener(MouseEvent.CLICK, IoTilt.Toggle);
            this.mc.addChild(this._ioTilt);
        }
        this._ioTilt.visible = true;
        this._ioTilt.x = this._ioDesigner.x + this._ioDesigner.width + 6;
        this._ioTilt.y = Number(this.mc.mcR5.y);
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
        let on: boolean = GLOBAL.ioTestMode() || IoTestMode.realOn(); // (QoL #396: the real-costs profile too)
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
            } else if (GLOBAL.INFERNO_ONLY && /view/i.test(String(GLOBAL._loadmode))) {
                // (QoL #675: visiting, the shortcut bars stay)
                this.ioTopBars();
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
        if (GLOBAL.INFERNO_ONLY) {
            this.ioFullTags();
        }
        this.ioSetText(as3.cast(this.mc["mcR" + 5].tR, TextField), GLOBAL.ioFreeBuild() ? "<b>Unlimited</b>" : "<b>" + GLOBAL.FormatNumber(BASE._credits.Get()) + "</b>");
        this.ioTopBars();
        this.ioShowAdminButton();
        this.ioSwitchButton();
        this.ioPageGear();
        if (MapRoomManager.instance.isInMapRoom2) {
            this.mc.mcOutposts.visible = true;
            this.mc.mcOutposts.tR.htmlText = GLOBAL._mapOutpost.length;
            if (GLOBAL.INFERNO_ONLY) {
                this.ioOutpostArrows();
            }
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
                if (GLOBAL.INFERNO_ONLY) {
                    // (20 October: 10 and over read whole, as the Daily Reward's)
                    UI_TOP.ioCounterText(this.mc.bInbox.mcCounter, String(GLOBAL._unreadMessages | 0));
                } else {
                    this.mc.bInbox.mcCounter.t.htmlText = "<b>" + GLOBAL._unreadMessages + "</b>";
                }
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
                if (GLOBAL.INFERNO_ONLY) {
                    // (QoL #81: the numbers too, "Flinger 1,240 / 1,600")
                    let ioLabel: TextField = this._creatureButtonsMC._mc._txtContainer.flinger_txt;
                    ioLabel.htmlText = KEYS.Get("io_flinger_load", { "v1": GLOBAL.FormatNumber(Math.max(0, _loc4_ - _loc5_)), "v2": GLOBAL.FormatNumber(_loc4_) });
                    GLOBAL.ioFitText(ioLabel);
                }
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
        this.ioFitClock();
    }

    /**
     * Inferno-only (16 October): the attack's clock and its label on their line: a long lock ("23h 59m 58s") wrapped,
     * its seconds showing as a cut-off second line under the bar. Drawn smaller instead (only when it doesn't fit).
     */
    private ioFitClock(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        // (the clock's field wraps: measured on one line)
        let t: TextField = this.mc.tTime;
        if (t) {
            t.wordWrap = false;
            if (t.textWidth > t.width - 4) {
                GLOBAL.ioFitText(t, 9);
            }
        }
        let m: TextField = this.mc.tMessage;
        if (m && m.textWidth > m.width - 4) {
            GLOBAL.ioFitText(m, 8);
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
        this.ioFitClock();
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

    /**
     * Inferno-only (QoL #317, 14 October): "12 / 40" on the outposts counter while in an outpost. (Its small < >
     * arrows, to the previous and next outpost at once, were taken off on 20 October.)
     */
    private ioOutpostArrows(): void {
        let box: MovieClip = as3.as(this.mc.mcOutposts, MovieClip);
        let ids: any = GLOBAL._mapOutpostIDs;
        let count: int = ids ? ids.length | 0 : 0;
        if (!BASE.isMainYardOrInfernoMainYard && count > 0) {
            for (let i: int = 0; i < count; i++) {
                if (ids[i] == BASE._loadedBaseID) {
                    box.tR.htmlText = (i + 1) + "/" + count;
                    break;
                }
            }
        }
        // (20 October: no < > arrows any more; the counter's >> opens the Outposts list, which has Previous and Next)
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
        message = KEYS.Get("io_t3k_invite_msg1") + "\n" + KEYS.Get("io_t3k_invite_msg2", { "v1": link });
        popupMC = new popup_generic();
        let CopyMessage: Function = (param1: MouseEvent): void => {
            System.setClipboard(message);
            popupMC.bAction.Setup(KEYS.Get("io_t3k_invite_copied"));
        };
        popupMC.tA.htmlText = KEYS.Get("io_t3k_invite_title");
        // (the invite itself, the text that gets copied, smaller under the explanation)
        popupMC.tB.htmlText = KEYS.Get("io_t3k_invite_how", { "v1": shiny }) + "<br><br>" + "<font color=\"#FFFFFF\" size=\"10\">" + message.split("\n").join("<br>") + "</font>";
        // (QoL #192: and how your invites are doing so far)
        let counts: any = null;
        try {
            counts = GLOBAL._flags.io_invite_counts ? JSON.parse(String(GLOBAL._flags.io_invite_counts)) : null;
        } catch (e) {
            counts = null;
        }
        if (counts && (counts.joined | 0) > 0) {
            popupMC.tB.htmlText += "<br><br>" + KEYS.Get("io_invite_progress", { "v1": counts.joined | 0, "v2": counts.paid | 0 }) + ((counts.waiting | 0) > 0 ? " " + KEYS.Get("io_invite_waiting", { "v1": counts.waiting | 0 }) : "");
        } else if (counts) {
            popupMC.tB.htmlText += "<br><br>" + KEYS.Get("io_invite_none");
        }
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
        popupMC.bAction.Setup(KEYS.Get("io_t3k_invite_copy"));
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
                if (GLOBAL.INFERNO_ONLY) {
                    // (QoL #471: one list of what the bell holds, each with View, rather than every card in turn)
                    this.BubbleHide();
                    POPUPS.ioAlertsList();
                } else {
                    POPUPS.Show("alerts");
                }
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
                _loc13_ = POWERUPS.ioBuffIcon(_loc12_);
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
                // (Inferno-only, QoL #304: what the button does here, not the old Facebook friend picker's words)
                _loc4_ = GLOBAL.INFERNO_ONLY && GLOBAL._flags && Number(GLOBAL._flags.io_invite_shiny) > 0 ? KEYS.Get("io_invite_tip", { "v1": GLOBAL.FormatNumber(Number(GLOBAL._flags.io_invite_shiny)) }) : KEYS.Get("pop_invite");
                break;
            case "ioSwitch":
                _loc4_ = "<b>" + KEYS.Get("io_t3k_switch_account") + "</b>";
                break;
            case "bGift":
                if (GLOBAL.INFERNO_ONLY) {
                    let ioStatus: any = UI_TOP.ioStreak();
                    if (!ioStatus) {
                        _loc4_ = KEYS.Get("io_t3k_daily_title");
                    } else if ((ioStatus.collected | 0) != 1) {
                        _loc4_ = KEYS.Get("io_t3k_daily_offer", { "v1": ioStatus.offerDay | 0, "v2": ioStatus.offerShiny | 0 });
                    } else {
                        _loc4_ = KEYS.Get("io_t3k_daily_done", { "v1": ioStatus.day | 0 });
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
                if (GLOBAL.INFERNO_ONLY && POPUPS.QueueCount("alerts") > 0) {
                    // (QoL #471: what it holds, "2 attacks · 1 battle report")
                    _loc4_ = KEYS.Get("io_win_al_tip", { "v1": POPUPS.ioAlertsSummary() });
                }
                break;
            case "mcHit":
                _loc4_ = KEYS.Get("pop_outposts");
                if (GLOBAL.INFERNO_ONLY) {
                    _loc4_ = KEYS.Get("io_t3k_outposts_tip");
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

    private static _ioTip: Sprite = null;

    /**
     * Inferno-only (10 October): a tip for the top bar's own buttons (the shortcut bars, Switch account, the D.A.V.E.
     * Club), drawn next to the button wherever it is ("below" it, or to its "right"), kept on the screen. (They
     * used the workers' column's tip, which always sits by the column on the right.)
     */
    public static ioTip(target: DisplayObject, html: string, side: string = "below"): void {
        UI_TOP.ioTipHide();
        UI_WORKERS.PopupHide();
        if (!target || !target.stage || !GLOBAL._layerTop) {
            return;
        }
        let tip: Sprite = new Sprite();
        tip.name = "ioTopTip";
        tip.mouseEnabled = false;
        tip.mouseChildren = false;
        let text: TextField = new TextField();
        text.selectable = false;
        text.multiline = true;
        text.wordWrap = true;
        text.width = 240;
        text.defaultTextFormat = new TextFormat("Verdana", 11, 0x2A1A08);
        text.htmlText = html;
        text.autoSize = TextFieldAutoSize.LEFT;
        // (a short tip: as wide as its longest line)
        if (text.textWidth + 8 < 240) {
            text.wordWrap = false;
            text.width = text.textWidth + 6;
        }
        let w: number = text.width + 14;
        let h: number = text.height + 10;
        let r: Rectangle = target.getBounds(GLOBAL._layerTop);
        let sw: number = Number(GLOBAL._ROOT.stage.stageWidth);
        let x: number;
        let y: number;
        let g: any = tip.graphics;
        g.lineStyle(1, 0x7A5A1E, 1);
        g.beginFill(0xFFF7C4, 1);
        if (side == "right") {
            x = r.x + r.width + 10;
            y = Math.max(4, r.y + r.height / 2 - h / 2);
            g.drawRoundRect(0, 0, w, h, 8, 8);
            g.endFill();
            g.beginFill(0xFFF7C4, 1);
            let my: number = Math.max(6, Math.min(h - 6, r.y + r.height / 2 - y));
            g.moveTo(0.5, my - 6);
            g.lineTo(-7, my);
            g.lineTo(0.5, my + 6);
        } else {
            x = Math.max(4, Math.min(sw - w - 4, r.x + r.width / 2 - w / 2));
            y = r.y + r.height + 9;
            g.drawRoundRect(0, 0, w, h, 8, 8);
            g.endFill();
            g.beginFill(0xFFF7C4, 1);
            let mx: number = Math.max(8, Math.min(w - 8, r.x + r.width / 2 - x));
            g.moveTo(mx - 6, 0.5);
            g.lineTo(mx, -7);
            g.lineTo(mx + 6, 0.5);
        }
        g.endFill();
        text.x = 7;
        text.y = 5;
        tip.addChild(text);
        tip.x = Math.round(x);
        tip.y = Math.round(y);
        tip.filters = [new DropShadowFilter(1, 45, 0, 0.6, 3, 3, 1, 2)];
        GLOBAL._layerTop.addChild(tip);
        UI_TOP._ioTip = tip;
    }

    public static ioTipHide(): void {
        if (UI_TOP._ioTip && UI_TOP._ioTip.parent) {
            UI_TOP._ioTip.parent.removeChild(UI_TOP._ioTip);
        }
        UI_TOP._ioTip = null;
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
