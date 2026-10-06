import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, StageDisplayState } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextFieldAutoSize } from "flash/text";
import { Timer, getQualifiedClassName } from "flash/utils";
import { ACADEMY, BASE, BFOUNDATION, BUILDINGINFO, BUILDINGOPTIONS, BUILDINGS, BUY, BYMDevConfig, CREATURELOCKER, FrontPageGraphic, GAME, GLOBAL, ImageCache, IoBugReport, KEYS, LOGGER, MUSHROOMS, NewPopupSystem, POPUPSETTINGS, QUEUE, SOUNDS, STORE, TUTORIAL, TweenLite, UI_TOP, UPDATES, frame, popup_afk_gift, popup_bg, popup_bg2, popup_dialogue, popup_generic, popup_invite_friends, popup_noshiny, popup_noworker, popup_pleasebuy, popup_pleaserate, popup_timeout, popup_welcome, print } from "@game";

export class POPUPS extends ASObject {
    public static readonly k_TOP_LEFT: int = 1;

    public static readonly k_CENTER: int = 2;

    private static _popups: any = null;

    private static _mc: MovieClip = null;

    private static _mcBG: MovieClip = null;

    private static _lastGroup: string = "alerts";

    public static _open: boolean = false;

    public static _timer: Timer = null;

    /** Inferno-only: the Connection Lost popup on screen (the connection check runs every few seconds). */
    private static _ioNoConnection: MovieClip = null;

    /** Inferno-only: the "Anyone home?" popup on screen. */
    private static _ioTimeout: MovieClip = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        POPUPS._popups = { "now": [], "alerts": [], "gifts": [], "wait": [], "tip": [] };
        POPUPS._open = false;
    }

    public static Push(param1: any, param2: Function = null, param3: any[] = null, param4: string = "", param5: string = "", param6: boolean = false, param7: string = "now"): void {
        if (param5) {
            ImageCache.GetImageWithCallBack("popups/" + param5, null, true, 0);
        }
        if (GLOBAL._catchup && param7 == "now" && !param6) {
            param7 = "alerts";
        }
        if (param7 == "now" && POPUPS._lastGroup != "now") {
            POPUPS._lastGroup = "now";
        }
        POPUPS._popups[param7].push([param1, param2, param3, param4, param5]);
        if (param6) {
            POPUPS.Next();
        } else if (!POPUPS._open && !NewPopupSystem.dialogShowing) {
            POPUPS.Show();
        }
    }

    public static Next(param1: MouseEvent = null): void {
        if (GLOBAL.isHalted) {
            GLOBAL.CallJS("reloadPage");
        }
        if (!GLOBAL._catchup || POPUPS._lastGroup == "tip") {
            POPUPS.Hide();
        }
    }

    private static Hide(): void {
        if (POPUPS._mc) {
            POPUPS.HideB();
        } else {
            POPUPS.Show("now");
        }
    }

    private static HideB(): void {
        POPUPS._open = false;
        POPUPS.RemoveBG();
        if (Boolean(POPUPS._mc) && Boolean(POPUPS._mc.parent)) {
            POPUPS._mc.parent.removeChild(POPUPS._mc);
        }
        POPUPS._mc = null;
        if (POPUPS._lastGroup == "alerts" || POPUPS._lastGroup == "wait" || POPUPS._lastGroup == "tip") {
            if (POPUPS._lastGroup == "tip") {
                POPUPS._lastGroup = "now";
            }
            POPUPS.NextDelayed();
        } else {
            POPUPS.Show(POPUPS._lastGroup);
        }
    }

    /** The popup on screen, for bug reports: its class, and its title when it has one ("popup_generic "Invite a friend""). */
    public static ioShowing(): string {
        let cls: string = null;
        let title: string = "";
        if (!POPUPS._mc) {
            return "";
        }
        cls = getQualifiedClassName(POPUPS._mc);
        cls = cls.substr(cls.lastIndexOf(":") + 1);
        try {
            if (POPUPS._mc.tA && POPUPS._mc.tA.text) {
                title = " \"" + String(POPUPS._mc.tA.text).replace(/\s+/g, " ").substr(0, 50) + "\"";
            }
        } catch (e) {
        }
        return cls + title;
    }

    public static hasPopupsOpen(): boolean {
        let _loc1_: boolean = Boolean(GLOBAL._newBuilding) && (as3.as(GLOBAL._newBuilding, BFOUNDATION))._placing == true;
        return BUILDINGS._open || STORE._open || BUILDINGOPTIONS._open || ACADEMY._open || CREATURELOCKER._open || _loc1_ || Boolean(POPUPS._mc) || POPUPS._open;
    }

    private static NextDelayed(param1: int = 200): void {
        POPUPS._timer = new Timer(param1, 1);
        POPUPS._timer.addEventListener(TimerEvent.TIMER, POPUPS.TimerDone);
        POPUPS._timer.start();
    }

    private static TimerDone(param1: TimerEvent): void {
        if (POPUPS._timer) {
            POPUPS._timer.removeEventListener(TimerEvent.TIMER, POPUPS.TimerDone);
            POPUPS._timer.stop();
            POPUPS._timer = null;
            if (POPUPS.hasPopupsOpen()) {
                POPUPS.NextDelayed(100);
            } else {
                POPUPS.Show(POPUPS._lastGroup);
            }
        }
    }

    public static Add(param1: DisplayObject, param2: int = 0): void {
        GLOBAL._layerTop.addChild(param1);
        switch (param2) {
            case 0:
                break;
            case 1:
                POPUPS.assignAlignToUpperLeft(param1);
                break;
            case 2:
                POPUPS.assignAlignToCenter(param1);
        }
    }

    public static Remove(param1: DisplayObject = null): void {
        if (Boolean(param1) && Boolean(param1.parent)) {
            param1.removeEventListener(Event.ENTER_FRAME, POPUPS.onResize);
            param1.removeEventListener(Event.ENTER_FRAME, POPUPS.onResizeCenter);
            param1.parent.removeChild(param1);
        }
    }

    public static assignAlignToUpperLeft(param1: DisplayObject = null): void {
        POPUPSETTINGS.AlignToUpperLeft(param1, true);
        param1.addEventListener(Event.ENTER_FRAME, POPUPS.onResize, false, 0, true);
    }

    public static assignAlignToCenter(param1: DisplayObject = null): void {
        POPUPSETTINGS.AlignToCenter(param1);
        param1.addEventListener(Event.ENTER_FRAME, POPUPS.onResizeCenter, false, 0, true);
    }

    protected static onResize(param1: Event): void {
        let _loc2_: DisplayObject = as3.as(param1.currentTarget, DisplayObject);
        POPUPSETTINGS.AlignToUpperLeft(_loc2_, true);
    }

    protected static onResizeCenter(param1: Event): void {
        let _loc2_: DisplayObject = as3.as(param1.currentTarget, DisplayObject);
        POPUPSETTINGS.AlignToCenter(_loc2_);
    }

    public static Show(param1: string = "now"): void {
        let ImageLoaded: Function = null;
        let message: any[] = null;
        let group: string = param1;
        if (!GLOBAL._catchup || group == "tip") {
            POPUPS._lastGroup = group;
            message = as3.cast(POPUPS._popups[group].shift(), Array);
            if (Boolean(message) && !POPUPS._open) {
                POPUPS._open = true;
                POPUPS.AddBG();
                POPUPS._mc = as3.as(GLOBAL._layerTop.addChild(as3.cast(message[0], DisplayObject)), MovieClip);
                IoBugReport.Screen("popup: " + POPUPS.ioShowing());
                POPUPSETTINGS.AlignToCenter(POPUPS._mc);
                POPUPSETTINGS.ScaleUp(POPUPS._mc);
                try {
                    if (POPUPS._mc.bMessage) {
                        POPUPS._mc.bMessage.selectable = true;
                        POPUPS._mc.bMessage.stage.focus = POPUPS._mc.bMessage;
                        POPUPS._mc.bMessage.setSelection(0, POPUPS._mc.bMessage.text.length);
                    }
                } catch (e) {
                }
                if (message[3]) {
                    SOUNDS.Play(as3.str(message[3]));
                }
                if (message[1]) {
                    if (message[2]) {
                        if (message[2].length == 1) {
                            message[1](message[2][0]);
                        }
                        if (message[2].length == 2) {
                            message[1](message[2][0], message[2][1]);
                        }
                        if (message[2].length == 3) {
                            message[1](message[2][0], message[2][1], message[2][2]);
                        }
                        if (message[2].length == 4) {
                            message[1](message[2][0], message[2][1], message[2][2], message[2][3]);
                        }
                    } else {
                        message[1]();
                    }
                }
                if (message[4]) {
                    ImageLoaded = (param1: string, param2: BitmapData): void => {
                        try {
                            if (Boolean(POPUPS._mc) && Boolean(POPUPS._mc.mcImage)) {
                                while (POPUPS._mc.mcImage.numChildren) {
                                    POPUPS._mc.mcImage.removeChildAt(0);
                                }
                                POPUPS._mc.mcImage.addChild(new Bitmap(param2));
                                POPUPS._mc.mcImage.mouseEnabled = false;
                                POPUPS._mc.mcImage.mouseChildren = false;
                                if (POPUPS._mc.mcImageFrame) {
                                    POPUPS._mc.mcImage.x = POPUPS._mc.mcImageFrame.x + (POPUPS._mc.mcImageFrame.width - POPUPS._mc.mcImage.width) * 0.5;
                                    POPUPS._mc.mcImage.y = POPUPS._mc.mcImageFrame.y + (POPUPS._mc.mcImageFrame.height - POPUPS._mc.mcImage.height) * 0.5;
                                }
                            }
                        } catch (e) {
                        }
                    };
                    ImageCache.GetImageWithCallBack("popups/" + message[4], ImageLoaded, true, 0);
                }
            } else if (POPUPS._lastGroup == "now" && POPUPS.QueueCount("now") == 0 && POPUPS.QueueCount("wait") > 0) {
                POPUPS._lastGroup = "wait";
                if (POPUPS._popups["wait"][0] instanceof FrontPageGraphic) {
                    POPUPS.NextDelayed(100);
                } else {
                    POPUPS.NextDelayed(500);
                }
            } else {
                if (POPUPS._timer) {
                    POPUPS._timer.removeEventListener(TimerEvent.TIMER, POPUPS.TimerDone);
                    POPUPS._timer.stop();
                    POPUPS._timer = null;
                }
                if (POPUPS.QueueCount("wait") > 0) {
                    POPUPS._lastGroup = "wait";
                    if (POPUPS._popups["wait"][0] instanceof FrontPageGraphic) {
                        POPUPS.NextDelayed(100);
                    } else {
                        POPUPS.NextDelayed(500);
                    }
                }
            }
        } else if (POPUPS.QueueCount("wait") > 0) {
            POPUPS._lastGroup = "wait";
            if (POPUPS._popups["wait"][0] instanceof FrontPageGraphic) {
                POPUPS.NextDelayed(100);
            } else {
                POPUPS.NextDelayed(500);
            }
        }
    }

    public static QueueCount(param1: string = "now"): int {
        return POPUPS._popups[param1].length | 0;
    }

    public static AddBG(): void {
        POPUPS.RemoveBG();
        GLOBAL.RefreshScreen();
        POPUPS._mcBG = as3.as(GLOBAL._layerTop.addChild(new popup_bg()), popup_bg);
        POPUPS._mcBG.width = GLOBAL._SCREEN.width;
        POPUPS._mcBG.height = GLOBAL._SCREEN.height;
        POPUPS._mcBG.x = GLOBAL._SCREEN.x;
        POPUPS._mcBG.y = GLOBAL._SCREEN.y;
    }

    public static RemoveBG(param1: MovieClip = null): void {
        if (Boolean(POPUPS._mcBG) && Boolean(POPUPS._mcBG.parent)) {
            POPUPS._mcBG.parent.removeChild(POPUPS._mcBG);
        }
        POPUPS._mcBG = null;
    }

    public static Resize(): void {
        let _loc2_: int = 0;
        let _loc1_: int = 0;
        while (_loc1_ < POPUPS._popups.length) {
            _loc2_ = 0;
            while (_loc2_ < POPUPS._popups[_loc1_].length) {
                POPUPS._popups[_loc1_][_loc2_].x = GLOBAL._SCREENCENTER.x;
                POPUPS._popups[_loc1_][_loc2_].x = GLOBAL._SCREENCENTER.y;
                _loc2_++;
            }
            _loc1_++;
        }
    }

    /** Inferno-only: whether the player has an invite link to hand out (the Invite Friends popup). */
    private static ioCanInvite(): boolean {
        return Boolean(GLOBAL._flags && Boolean(GLOBAL._flags.io_invite));
    }

    /**
     * Inferno-only Invite Friends, from anywhere: the popup the Invite button on the top bar opens
     * (UI_TOP.ioShowInvite), never Facebook's invite dialog, which isn't there.
     */
    private static ioShowInvite(): void {
        if (POPUPS.ioCanInvite()) {
            UI_TOP.ioShowInvite();
        } else {
            GLOBAL.Message(KEYS.Get("disabled_invites"));
        }
    }

    /**
     * Inferno-only: Connection Lost and "Anyone home?" stop the game, and their one button reloads it
     * (logged in still). Their frame loses its close button: closing either one would leave a stopped game.
     */
    private static ioReloadOnly(movie: MovieClip): void {
        (as3.as(movie.mcFrame, frame)).Setup(false);
        movie.bGift.visible = true;
        movie.bGift.Setup("Reload");
        movie.bGift.Highlight = true;
        movie.bGift.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            GAME.ioReload(true);
        });
    }

    public static NoConnection(): void {
        let movie: MovieClip = null;
        if (GLOBAL.INFERNO_ONLY && POPUPS._ioNoConnection && POPUPS._ioNoConnection.parent) {
            return;
        }
        SOUNDS.StopAll();
        POPUPS._mcBG = as3.as(GLOBAL._layerTop.addChild(new popup_bg2()), popup_bg2);
        POPUPS._mcBG.x = GLOBAL._SCREEN.x;
        POPUPS._mcBG.y = GLOBAL._SCREEN.y;
        POPUPS._mcBG.width = GLOBAL._SCREEN.width;
        POPUPS._mcBG.height = GLOBAL._SCREEN.height;
        POPUPS._mcBG.cacheAsBitmap = true;
        movie = new popup_timeout();
        movie.tA.htmlText = "<b>" + KEYS.Get("pop_noconnect_title") + "</b>";
        movie.tB.htmlText = KEYS.Get("pop_noconnect_body");
        if (GLOBAL.INFERNO_ONLY) {
            movie.tB.htmlText = KEYS.Get("pop_noconnect_body") + " Then press Reload.";
            POPUPS.ioReloadOnly(movie);
            POPUPS._ioNoConnection = movie;
        } else {
            movie.bGift.visible = false;
        }
        movie.x = GLOBAL._SCREENCENTER.x;
        movie.y = GLOBAL._SCREENCENTER.y;
        GLOBAL._layerTop.addChild(movie);
        GLOBAL.Halt();
    }

    public static Timeout(): void {
        let _loc1_: MovieClip = null;
        if (GLOBAL.INFERNO_ONLY && POPUPS._ioTimeout && POPUPS._ioTimeout.parent) {
            return;
        }
        SOUNDS.StopAll();
        if (GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN) {
            print("game timed out, kicking the client out of fullscreen");
            GLOBAL._ROOT.stage.displayState = StageDisplayState.NORMAL;
        }
        POPUPS._mcBG = as3.as(GLOBAL._layerTop.addChild(new popup_bg2()), popup_bg2);
        POPUPS._mcBG.x = GLOBAL._SCREEN.x;
        POPUPS._mcBG.y = GLOBAL._SCREEN.y;
        POPUPS._mcBG.width = GLOBAL._SCREEN.width;
        POPUPS._mcBG.height = GLOBAL._SCREEN.height;
        POPUPS._mcBG.cacheAsBitmap = true;
        _loc1_ = new popup_timeout();
        _loc1_.tA.htmlText = "<b>" + KEYS.Get("pop_timeout_title") + "</b>";
        _loc1_.tB.htmlText = KEYS.Get("pop_timeout_body");
        if (GLOBAL.INFERNO_ONLY) {
            // Its button was Send FREE Gifts or Invite Friends To Play (Facebook dialogs, not here), on a
            // stopped game with nothing to go on with: Reload instead.
            _loc1_.tB.htmlText = "You've been inactive for a while, so the game stopped. Press Reload to carry on playing.";
            POPUPS.ioReloadOnly(_loc1_);
            POPUPS._ioTimeout = _loc1_;
        } else if (!GLOBAL._flags.kongregate) {
            if (GLOBAL._canGift) {
                _loc1_.bGift.SetupKey("btn_sendfreegifts");
                _loc1_.bGift.addEventListener(MouseEvent.CLICK, POPUPS.DisplayGiftSelect);
            } else {
                _loc1_.bGift.SetupKey("btn_invitefriendstoplay");
                _loc1_.bGift.addEventListener(MouseEvent.CLICK, POPUPS.DisplayInviteSelect);
            }
            _loc1_.bGift.Highlight = true;
        } else {
            _loc1_.bGift.visible = false;
        }
        _loc1_.x = GLOBAL._SCREENCENTER.x;
        _loc1_.y = GLOBAL._SCREENCENTER.y;
        GLOBAL._layerTop.addChild(_loc1_);
        GLOBAL.Halt();
    }

    public static AFK(): void {
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only: never the Send FREE Gifts popup (no gifts here). Invite Friends, when the player
            // has an invite link.
            // (bug report B14: not in an attack, where it stacked on the attack's end popups; asked again
            // once back home)
            let home: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
            if (!home) {
                return;
            }
            if (!GLOBAL._promptedAFK && TUTORIAL._stage > 200 && POPUPS.ioCanInvite()) {
                POPUPS.Invite(true);
            }
            GLOBAL._promptedAFK = true;
            return;
        }
        if (!GLOBAL._promptedAFK && TUTORIAL._stage > 200) {
            if (GLOBAL._canGift || Boolean(GLOBAL._flags.kongregate)) {
                POPUPS.Gift(true);
            } else {
                POPUPS.Invite(true);
            }
        }
        GLOBAL._promptedAFK = true;
    }

    public static Gift(param1: boolean = false): void {
        let SendGift: Function = null;
        let GetFriends: Function = null;
        let popupMC: MovieClip = null;
        let showingamepopup: boolean = param1;
        if (GLOBAL.INFERNO_ONLY) {
            POPUPS.Invite(showingamepopup);
            // no gifts here
            return;
        }
        if (GLOBAL._canGift || Boolean(GLOBAL._flags.kongregate)) {
            if (showingamepopup) {
                SendGift = (param1: MouseEvent): void => {
                    POPUPS.Next(param1);
                    POPUPS.DisplayGiftSelect();
                };
                popupMC = new popup_afk_gift();
                popupMC.tA.htmlText = "<b>" + KEYS.Get("pop_afk_title") + "</b>";
                popupMC.tB.htmlText = KEYS.Get("pop_afk_body");
                if (GLOBAL._canGift) {
                    popupMC.bAction.SetupKey("btn_sendfreegifts");
                    popupMC.bAction.addEventListener(MouseEvent.CLICK, SendGift);
                    popupMC.bAction.Highlight = true;
                } else {
                    popupMC.bAction.visible = false;
                }
                POPUPS.Push(popupMC, null, null, "", "resourcetwigs.png");
            } else {
                POPUPS.DisplayGiftSelect();
            }
        } else {
            GetFriends = (param1: MouseEvent): void => {
                POPUPS.Next(param1);
                POPUPS.Invite();
            };
            popupMC = new popup_invite_friends();
            if (GLOBAL._friendCount > 0) {
                popupMC.tA.htmlText = "<b>" + KEYS.Get("pop_invitefriends_title") + "</b>";
                popupMC.tB.htmlText = KEYS.Get("pop_invitefriends_body");
            } else {
                popupMC.tA.htmlText = "<b>" + KEYS.Get("pop_invitenofriends_title") + "</b>";
                popupMC.tB.htmlText = KEYS.Get("pop_invitenofriends_body");
            }
            popupMC.bAction.SetupKey("btn_invitefriends");
            popupMC.bAction.addEventListener(MouseEvent.CLICK, GetFriends);
            popupMC.bAction.Highlight = true;
            POPUPS.Push(popupMC);
        }
        GLOBAL.StatSet("pg", GLOBAL.Timestamp());
    }

    public static Invite(param1: boolean = false): void {
        let GetFriends: Function = null;
        let popupMC: popup_invite_friends = null;
        let showingamepopup: boolean = param1;
        if (GLOBAL.INFERNO_ONLY && showingamepopup) {
            // Its button opens the top bar's Invite Friends popup in its place (pushed to show now, so this
            // one closes first).
            popupMC = new popup_invite_friends();
            popupMC.tA.htmlText = "<b>Having fun?</b>";
            popupMC.tB.htmlText = "Invite a friend to the inferno. When they register from your link, you both get <b>" + GLOBAL.FormatNumber(Number(GLOBAL._flags.io_invite_shiny)) + " shiny</b>.";
            popupMC.bAction.SetupKey("btn_invitefriends");
            popupMC.bAction.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                POPUPS.ioShowInvite();
            });
            popupMC.bAction.Highlight = true;
            POPUPS.Push(popupMC);
            GLOBAL.StatSet("pi", GLOBAL.Timestamp());
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            POPUPS.ioShowInvite();
            return;
        }
        if (showingamepopup) {
            GetFriends = (param1: MouseEvent): void => {
                POPUPS.Next(param1);
                POPUPS.DisplayInviteSelect();
            };
            popupMC = new popup_invite_friends();
            popupMC.tA.htmlText = KEYS.Get("pop_invitefriends_title");
            popupMC.tB.htmlText = KEYS.Get("pop_invitefriends_body");
            popupMC.bAction.SetupKey("btn_invitefriends");
            popupMC.bAction.addEventListener(MouseEvent.CLICK, GetFriends);
            popupMC.bAction.Highlight = true;
            POPUPS.Push(popupMC);
        } else {
            POPUPS.DisplayInviteSelect();
        }
        GLOBAL.StatSet("pi", GLOBAL.Timestamp());
    }

    public static Done(): boolean {
        return POPUPS._open == false;
    }

    public static DisplaySR(param1: MouseEvent = null): void {
        POPUPS.AddBG();
        GLOBAL.CallJS("cc.showSrOverlay", ["callbackshiny"]);
        LOGGER.Stat([20, 1]);
    }

    public static DisplayGiftSelect(param1: MouseEvent = null): void {
        if (GLOBAL.INFERNO_ONLY) {
            POPUPS.ioShowInvite();
            // Facebook's gift dialog isn't here
            return;
        }
        POPUPS.AddBG();
        if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
            GLOBAL.CallJSWithClient("cc.showFeedDialog", "callbackgift", ["gift"]);
        } else {
            GLOBAL.CallJS("cc.showFeedDialog", ["gift", "callbackgift"]);
        }
        LOGGER.Stat([20, 1]);
    }

    public static DisplayInviteSelect(param1: MouseEvent = null): void {
        if (GLOBAL.INFERNO_ONLY) {
            POPUPS.ioShowInvite();
            // Facebook's invite dialog isn't here
            return;
        }
        POPUPS.AddBG();
        if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
            GLOBAL.CallJSWithClient("cc.showFeedDialog", "callbackgift", ["invite"]);
        } else {
            GLOBAL.CallJS("cc.showFeedDialog", ["invite", "callbackgift"]);
        }
        LOGGER.Stat([21, 1]);
    }

    public static DisplayWelcome(param1: MouseEvent = null): void {
        let Share: Function = null;
        let popupMC: MovieClip = null;
        let e: MouseEvent = param1;
        if (GLOBAL._flags.fanfriendbookmarkquests) {
            Share = (): void => {
                LOGGER.Stat([23, 1]);
                GLOBAL.CallJS("sendFeed", ["started-aggressive", KEYS.Get("pop_displaywelcome_streamtitle"), KEYS.Get("pop_displaywelcome_streambody"), "aggressive.png", 0, null, "aggressive.v3.swf"]);
                POPUPS.Next();
            };
            LOGGER.Stat([23]);
            popupMC = new popup_welcome();
            popupMC.bAction.SetupKey("btn_share");
            popupMC.tA.htmlText = KEYS.Get("pop_displaywelcome_title");
            popupMC.tB.htmlText = KEYS.Get("pop_displaywelcome_body");
            popupMC.bAction.addEventListener(MouseEvent.CLICK, Share);
            popupMC.bAction.Highlight = true;
            POPUPS.Push(popupMC);
        }
    }

    public static DisplayGetShiny(param1: MouseEvent = null): void {
        POPUPS.Push(POPUPS.GetShinyPopup(), null, null, "error1", "aintgotnoshiny.png");
    }

    public static GetShinyPopup(): MovieClip {
        let _loc1_: MovieClip = new popup_noshiny();
        _loc1_.tA.htmlText = "<b>" + KEYS.Get("pop_noshiny_title") + "</b>";
        _loc1_.tB.htmlText = KEYS.Get("pop_noshiny_body");
        _loc1_.bGet.SetupKey("str_getmore_btn");
        _loc1_.bGet.addEventListener(MouseEvent.CLICK, BUY.Show);
        _loc1_.bGet.Highlight = true;
        // Inferno-only: Shiny is not sold here, so "a few clicks away from all the Shiny you could ever want"
        // and its Get More Shiny button (a call to the old Facebook page's shop, which does nothing) are
        // replaced by where Shiny comes from
        if (GLOBAL.INFERNO_ONLY) {
            _loc1_.tB.htmlText = KEYS.Get("io_noshiny_body");
            _loc1_.bGet.visible = false;
        }
        return _loc1_;
    }

    public static DisplayWorker(param1: int, param2: any): void {
        let n: int = 0;
        let b: any = undefined;
        let DisplayWorkerNext: Function = null;
        let getWorker: Function = null;
        n = param1;
        b = param2;
        getWorker = (param1: MouseEvent): void => {
            STORE.ShowB(1, 0, ["BEW"]);
            POPUPS.Next();
        };
        DisplayWorkerNext = (param1: int, param2: any): void => {
            let _loc4_: BFOUNDATION = null;
            let _loc3_: int = QUEUE.GetFinishCost();
            GLOBAL._selectedBuilding = QUEUE.GetBuilding();
            if (_loc3_ > BASE._credits.Get()) {
                POPUPS.Next();
                POPUPS.DisplayGetShiny();
                return;
            }
            if (GLOBAL._selectedBuilding && !GLOBAL.ioConfirmShiny(_loc3_, "to finish your worker's current job now", (): void => {
                DisplayWorkerNext(param1, param2);
            })) {
                return;
            }
            if (GLOBAL._selectedBuilding) {
                STORE._storeItems.SP4.c = [_loc3_];
                STORE.BuyB("SP4");
                POPUPS.Next();
            }
            if (param1 == 0) {
                BUILDINGS.Hide();
                BASE.addBuildingB(as3.as(param2, int));
            } else {
                _loc4_ = as3.as(param2, BFOUNDATION);
                if (param1 == 1 && Boolean(_loc4_)) {
                    if (((_loc4_._buildingProps.costs[_loc4_._lvl.Get()].time.Get() * GLOBAL._buildTime) | 0) > 3600) {
                        UPDATES.Create(["BU", _loc4_._id]);
                    }
                    BUILDINGOPTIONS.Hide();
                    _loc4_.UpgradeB();
                    BASE.Save();
                } else if (param1 == 2 && Boolean(_loc4_)) {
                    BUILDINGINFO.Hide();
                    MUSHROOMS.PickWorker(_loc4_);
                } else if (param1 == 3 && Boolean(_loc4_)) {
                    if (((_loc4_._buildingProps.fortify_costs[_loc4_._fortification.Get()].time.Get() * GLOBAL._buildTime) | 0) > 3600) {
                        UPDATES.Create(["BF", _loc4_._id]);
                    }
                    BUILDINGOPTIONS.Hide();
                    _loc4_.FortifyB();
                    BASE.Save();
                }
            }
            POPUPS.Next();
        };
        let workerImage: string = BASE.isInfernoMainYardOrOutpost ? "BYM_WorkerGuy2.png" : "helpinghand.png";
        let mc: MovieClip = new popup_noworker();
        if (!BASE.isMainYard) {
            mc.tA.htmlText = KEYS.Get("worker_busy");
            mc.tB.htmlText = KEYS.Get("worker_speedupoutpost", { "v1": QUEUE.GetFinishCost() });
            mc.bGet.SetupKey("btn_speedup");
            mc.bGet.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
                DisplayWorkerNext(n, b);
            });
            mc.bGet.Highlight = true;
        } else {
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_hireanother_title") + "</b>";
            if (QUEUE.GetBuilding()) {
                mc.tB.htmlText = KEYS.Get("worker_speedup", { "v1": QUEUE.GetFinishCost() });
                mc.bGet.SetupKey("btn_speedup");
                mc.bGet.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
                    DisplayWorkerNext(n, b);
                });
            } else {
                mc.bGet.SetupKey("btn_hireanother");
                mc.tB.htmlText = KEYS.Get("pop_hireanother_body");
                mc.bGet.addEventListener(MouseEvent.CLICK, getWorker);
            }
            mc.bGet.Highlight = true;
        }
        POPUPS.Push(mc, null, null, null, workerImage);
    }

    public static DisplayPleaseBuy(param1: string): void {
        let popupMC: popup_pleasebuy = null;
        let Action: Function = null;
        popupMC = null;
        Action = null;
        let key: string = param1;
        // Inferno-only: no "Want it upgraded NOW? Treat yourself to some shiny" after an Under Hall upgrade:
        // Shiny is not sold here (its button did nothing, and its picture, purchased.png, is not on the server)
        if (GLOBAL.INFERNO_ONLY) {
            return;
        }
        Action = (): void => {
            popupMC.bAction.Enabled = false;
            popupMC.bAction.removeEventListener(MouseEvent.CLICK, Action);
            BUY.Show();
        };
        popupMC = new popup_pleasebuy();
        popupMC.bAction.SetupKey("str_getmore_btn");
        popupMC.bAction.addEventListener(MouseEvent.CLICK, Action);
        popupMC.tMessage.htmlText = KEYS.Get("pop_marketing_getshiny");
        POPUPS.Push(popupMC, null, null, null, "purchased.png");
    }

    public static DisplayGeneric(param1: string, param2: string, param3: string, param4: string, param5: Function): void {
        let _loc6_: popup_generic = null;
        (_loc6_ = new popup_generic()).tA.autoSize = TextFieldAutoSize.LEFT;
        _loc6_.tB.autoSize = TextFieldAutoSize.LEFT;
        _loc6_.tA.htmlText = "<b>" + param1 + "</b>";
        _loc6_.tB.htmlText = param2;
        _loc6_.bAction.Setup(param3);
        _loc6_.bAction.addEventListener(MouseEvent.CLICK, param5);
        _loc6_.bAction.Highlight = true;
        _loc6_.tB.y = _loc6_.tA.y + _loc6_.tA.height + 5;
        _loc6_.mcBG.height = 0 - _loc6_.mcBG.y + _loc6_.tB.y + _loc6_.tB.height + 50;
        if (_loc6_.mcBG.height < 190) {
            _loc6_.mcBG.height = 190;
        }
        _loc6_.bAction.y = _loc6_.mcBG.y + _loc6_.mcBG.height - 45;
        _loc6_.mcBG.Setup();
        POPUPS.Push(_loc6_, null, null, "", param4);
    }

    public static DisplayDialogue(param1: string, param2: string, param3: string, param4: string, param5: Point, param6: Function): MovieClip {
        let dialogueMC: popup_dialogue = null;
        let imageOffset: Point = null;
        dialogueMC = null;
        let imageCompleteDialogue: Function = null;
        let title: string = param1;
        let message: string = param2;
        let button: string = param3;
        let image: string = param4;
        imageOffset = param5;
        let action: Function = param6;
        imageCompleteDialogue = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = null;
            _loc3_ = new Bitmap(param2);
            _loc3_.x = imageOffset.x;
            _loc3_.y = -_loc3_.height + imageOffset.y;
            dialogueMC.mcImage.addChild(_loc3_);
        };
        dialogueMC = new popup_dialogue();
        dialogueMC.tTitle.htmlText = "<b>" + title + "</b>";
        dialogueMC.tBody.htmlText = message;
        dialogueMC.bAction.Setup(button);
        if (Boolean(action)) {
            dialogueMC.bAction.addEventListener(MouseEvent.CLICK, action);
            dialogueMC.bAction.Highlight = true;
        }
        dialogueMC.tBody.y = dialogueMC.tTitle.y + dialogueMC.tTitle.height + 5;
        dialogueMC.mcBG.height = 0 - dialogueMC.mcBG.y + dialogueMC.tTitle.y + dialogueMC.tTitle.height + 50;
        if (dialogueMC.mcBG.height < 190) {
            dialogueMC.mcBG.height = 190;
        }
        dialogueMC.bAction.y = dialogueMC.mcBG.y + dialogueMC.mcBG.height - 35;
        dialogueMC.mcBG.Setup();
        if (image) {
            ImageCache.GetImageWithCallBack("popups/" + image, imageCompleteDialogue);
        }
        POPUPS.Push(dialogueMC, null, null, "");
        return dialogueMC;
    }

    public static DisplayRate(): void {
        let popupMCrate: popup_pleaserate = null;
        let ActionB: Function = null;
        let ActionC: Function = null;
        popupMCrate = null;
        ActionB = null;
        ActionC = null;
        ActionB = (): void => {
            popupMCrate.bAction.Enabled = false;
            popupMCrate.bAction.removeEventListener(MouseEvent.CLICK, ActionB);
            TweenLite.to(popupMCrate, 1, { "onComplete": ActionC });
        };
        ActionC = (): void => {
            GLOBAL.CallJS("cc.showRating");
        };
        popupMCrate = new popup_pleaserate();
        popupMCrate.tA.htmlText = KEYS.Get("pop_pleaserate");
        popupMCrate.bAction.SetupKey("pop_rategame_btn");
        popupMCrate.bAction.addEventListener(MouseEvent.CLICK, ActionB);
        POPUPS.Push(popupMCrate, null, null, null, "fivestarbob.png");
    }

    public static CallbackGift(param1: string): void {
        POPUPS.RemoveBG();
        if (GLOBAL.isHalted) {
            GLOBAL.CallJS("reloadPage");
        }
    }

    public static CallbackShiny(param1: string): void {
        let obj: any = null;
        let o: string = param1;
        POPUPS.RemoveBG();
        POPUPS.Next();
        try {
            if (o) {
                obj = JSON.parse(o);
                BASE._credits.Set(obj.credits | 0);
                BASE._hpCredits = obj.credits | 0;
                GLOBAL._credits.Set(obj.credits | 0);
            }
        } catch (e) {
            LOGGER.Log("err", "POPUPS.CallbackShiny " + o + " | " + e.message);
        }
        if (GLOBAL.isHalted) {
            GLOBAL.CallJS("reloadPage");
        }
    }
}
