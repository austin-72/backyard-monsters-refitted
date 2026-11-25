import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, MovieClip, Shape, Sprite, StageDisplayState } from "flash/display";
import { Event, FocusEvent, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer, Timer } from "flash/utils";
import { Point } from "flash/geom";
import { AbstractChatBox, BYMChat, Button, Button_CLIP, Chat, ChatBox_CLIP, ChatBox_msg_CLIP, ChatBox_msg_name_CLIP, Circ, Expo, GLOBAL, IChatDisplay, IoDave, IoEmotePicker, IoEmotes, IoMapShare, IoWhosOnline, KEYS, LOGGER, LOGIN, MAP, MapRoom3, Quad, SOUNDS, ScrollSet, TUTORIAL, TweenLite, bubblepopupRight } from "@game";

export class ChatBox extends AbstractChatBox implements IChatDisplay {
    static {
        as3.implement(this, [IChatDisplay]);
        as3.fields(this, { _ioLayoutDue: false, _ioLayoutStick: false, _shell: null, _maximized: false, _open: true, _animating: false, _useAlerts: false, _mask: null, _thumb: null, _display: null, _panel: null, _thumbWidth: 15, _thumbHeight: 15, _scrollbar: null, _sendBtn: null, _headerBar: null, _alertsCounter: 0, _chatWidth: 0, _chatHistory: null, _chatMessages: null, _skinnedElements: null, _skinTag: 1, fmt_nameOffset: null, _enabled: true, _runOnce: 0, _originProps: null, _maxProps: null, _openProps: null, _closeProps: null, _chatWidthDefault: null, _chatWidthShort: null, _ioY: 0, _ioParity: 0, _ioClock: null, _ioInited: false, _ioBase: null, _ioExtra: 0, _ioLineH: 15, _ioCounter: null, _ioTabs: null, _ioTabGlobal: null, _ioTabAlliance: null, _ioWho: null, _ioFxOn: false, _ioFxAt: 0, _ioPill: null, _ioUnseen: 0, _ioUnseenMention: false, _ioChat2Hidden: false, _ioChat2Online: -1, _ioChat2Chip: null, _ioChat2TabArgs: null });
    }

    private static _popupignore: bubblepopupRight = null;

    private static _popupignoredo: DisplayObject = null;

    // ---- Inferno-only: the lines, drawn as they come (BYMChat keeps the transcripts)
    /** Each kind of line's background and text colour: [background, text]; players' lines use the clip's. */
    private static readonly IO_STYLE: any = { "mention": [0xFFE3A0, null], "announce": [0xF4C14B, "#3A2200"], "casino": [0xE7CCFA, "#4A1470"], "milestone": [0xC4E6FA, "#0D3D5C"], "event": [0xD4EDB4, "#2C4A0C"], "system": [0xEDE7DA, "#5A5246"], "ignorelist": [0xF1E9DA, "#333333"], "shout_joined": [0xCDEFC4, "#1F5A17"], "shout_left": [0xE1E1E1, "#555555"], "shout_kicked": [0xF6C9C2, "#7A1A10"], "shout_promoted": [0xCFDFFF, "#1B3F7A"], "shout_created": [0xFFE0B5, "#7A4A00"], "shout_relationship": [0xE5D4F4, "#4E2A6E"], "shout_powerup_activated": [0xFFF0A8, "#6A5200"], "shout_powerup_purchase": [0xD5F1EC, "#145A50"], "shout_powerup_state": [0xFFF0A8, "#6A5200"], "shout_pinned": [0xFBE2C8, "#7A3300"], "shout_officer": [0xD9E4F7, "#24406E"] };

    /**
     * The text's width; the time ("2m") takes the next 30 pixels, ending just short of the scroll bar (13 October: the
     * box 40 pixels wider; the time was under the scroll bar, and 12 more pixels to the right on a line with a dot).
     */
    private static readonly IO_TEXT_W: int = 336;
    /** Inferno-only (13 October): room for the online dot before a player's line. */
    public static readonly IO_DOT_W: number = 12;

    private static readonly IO_TIME_W: int = 30;

    /** An emote's size in a chat line (14 October). */
    public static readonly IO_EMOTE: int = 36;

    // (QoL #147: 120; the alliance keeps 200 lines and 50 notices now)
    private static readonly IO_MAX_LINES: int = 120;

    // ---- Inferno-only: the box typed in: 200 characters, growing (up to six lines) so all of it shows
    private static readonly IO_MAX_CHARS: int = 200;

    private static readonly IO_COUNT_FROM: int = 150;

    /** 200 characters of narrow letters fit in five lines; six for wide ones and long words. */
    private static readonly IO_INPUT_LINES: int = 6;
    private _shell: Sprite;
    private _maximized: boolean;
    private _open: boolean;
    public _animating: boolean;
    private _useAlerts: boolean;
    private _mask: Sprite;
    private _thumb: Sprite;
    private _display: Sprite;
    private _panel: Sprite;
    private _thumbWidth: int;
    private _thumbHeight: int;
    private _scrollbar: ScrollSet;
    private _sendBtn: Button;
    public _headerBar: MovieClip;
    public _alertsCounter: int;
    public _chatWidth: int;
    private _chatHistory: any[];
    private _chatMessages: MovieClip;
    private _skinnedElements: any[];
    private _skinTag: int;
    private fmt_nameOffset: TextFormat;
    private _enabled: boolean;
    private _runOnce: number;
    private _originProps: any;
    private _maxProps: any;
    private _openProps: any;
    private _closeProps: any;
    private _chatWidthDefault: any;
    private _chatWidthShort: any;
    private _ioY: number;
    private _ioParity: int;
    private _ioClock: Timer;
    private _ioInited: boolean;
    private _ioBase: any;
    private _ioExtra: int;
    private _ioLineH: number;
    private _ioCounter: TextField;
    // ---- Inferno-only: Global / Alliance tabs in the header (BYMChat keeps the transcripts)
    private _ioTabs: Sprite;
    private _ioTabGlobal: TextField;
    private _ioTabAlliance: TextField;

    /** Inferno-only (13 October): the bar's Who's Online? button. */
    private _ioWho: Sprite;

    /** Inferno-only (QoL #477): whether the player appears offline, and how many are online (-1: not known yet). */
    private _ioChat2Hidden: boolean;
    private _ioChat2Online: int;
    /** QoL #477: the "Offline" chip after the tabs, while the player appears offline. */
    private _ioChat2Chip: Sprite;
    /** The tabs' last state (ioSetTabs), to draw them again when the presence changes. */
    private _ioChat2TabArgs: any[];

    public $ctor(): void {
        this._skinnedElements = [];
        this._originProps = { "screenHeight": 240, "screenWidth": 380 };
        this._maxProps = { "screenHeight": 470, "maskHeight": 470 - 12, "y": -(470 + 30), "scrollerY": -470, "scrollHeight": 470 - 16, "inputY": -12 };
        this._openProps = { "screenHeight": 240, "maskHeight": 136, "y": -178, "scrollerY": -148, "scrollHeight": 120, "inputY": -12 };
        this._closeProps = { "screenHeight": 114, "maskHeight": 105, "y": 0, "scrollerY": 30, "scrollHeight": 105, "inputY": 27 };
        // Inferno-only (13 October, the user's): 40 pixels wider (it was 380)
        this._chatWidthDefault = GLOBAL.INFERNO_ONLY ? { "sizeW": 420, "headerW": 420, "headerX": -5, "titleTxtX": 90, "alertX": 260, "arrowUpX": 368, "arrowUpY": 16, "arrowDownX": 350, "arrowDownY": 13, "borderW": 420, "mcMaskW": 388, "tOutputW": 370, "mcScreenW": 390, "inputWoodBgW": 420, "inputTxtBgW": 310, "inputTxtW": 310, "sendBtnX": 371, "scrollerX": 387, "ignoreBtnX": 355 } : { "sizeW": 380, "headerW": 380, "headerX": -5, "titleTxtX": 70, "alertX": 220, "arrowUpX": 343, "arrowUpY": 16, "arrowDownX": 325, "arrowDownY": 13, "borderW": 380, "mcMaskW": 348, "tOutputW": 330, "mcScreenW": 350, "inputWoodBgW": 380, "inputTxtBgW": 310, "inputTxtW": 310, "sendBtnX": 331, "scrollerX": 347, "ignoreBtnX": 315 };
        this._chatWidthShort = { "sizeW": 390, "headerW": 390, "headerX": -5, "titleTxtX": 80, "alertX": 230, "arrowUpX": 343, "arrowUpY": 16, "arrowDownX": 325, "arrowDownY": 13, "borderW": 380, "mcMaskW": 350, "tOutputW": 320, "mcScreenW": 360, "inputWoodBgW": 390, "inputTxtBgW": 310, "inputTxtW": 305, "sendBtnX": 333, "scrollerX": 350, "ignoreBtnX": 315 };
        super.$ctor(new ChatBox_CLIP());
        if (!this._useAlerts) {
            this.background.alert.visible = false;
        }
        this._shell = new Sprite();
        this.background.addChild(this._shell);
        if (Boolean(this._chatMessages) && Boolean(this._chatMessages.parent)) {
            this._chatMessages.parent.removeChild(this._chatMessages);
            this._chatMessages = null;
        }
        this._chatMessages = new MovieClip();
        this._shell.addChild(this._chatMessages);
        this._chatMessages.x = Number(this.background.mcScreen.x);
        this._chatMessages.y = Number(this.background.mcScreen.y);
        this._shell.addChild(this._chatMessages);
        this._shell.mask = as3.cast(this.background.mcMask, DisplayObject);
        this._scrollbar = new ScrollSet();
        this.background.addChild(this._scrollbar);
        this._scrollbar.Init(this._shell, as3.cast(this.background.mcMask, MovieClip), 0, 0, 35);
        this._scrollbar.x = 400;
        this._scrollbar.y = 30;
        this._scrollbar.AutoHideEnabled = false;
        this._scrollbar.visible = false;
        this._sendBtn = new Button_CLIP();
        this._sendBtn.SetupKey("btn_say");
        this._sendBtn.x = 383;
        this._sendBtn.y = 8;
        this._sendBtn.width = 40;
        this._sendBtn.height = 26;
        this._sendBtn.Highlight = false;
        this._sendBtn.Enabled = true;
        this._sendBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.handleSendClick));
        this.inputbar.addChild(this._sendBtn);
        this.input.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onInputFocus));
        this.background.alert.alert_txt.autoSize = TextFieldAutoSize.LEFT;
        this.background.alert.alert_txt.multiline = false;
        this.background.alert.alert_txt.wordWrap = false;
        this.background.alert.alert_txt.selectable = false;
        this.background.alert.alert_txt.mouseEnabled = false;
        this.background.alert.alert_txt.type = TextFieldType.DYNAMIC;
        this._chatHistory = [];
        this._originProps.screenWidth = this.background.mcScreen.width;
        this._originProps.screenHeight = this.background.mcScreen.height;
        this._skinnedElements = [this.background.border, this.background.header, this.background.mcScreen.canvas, this.inputbar.inputWoodBg, this.inputbar.inputTxtBG.canvas];
    }

    public static PopupShow(param1: int, param2: int, param3: string, param4: MovieClip): void {
        ChatBox.PopupHide();
        ChatBox._popupignore = new bubblepopupRight();
        ChatBox._popupignore.Setup(param1, param2, param3);
        ChatBox._popupignore.Nudge("left");
        ChatBox._popupignoredo = param4.addChild(ChatBox._popupignore);
    }

    public static PopupUpdate(param1: string): void {
        if (ChatBox._popupignore) {
            ChatBox._popupignore.Update(param1);
        }
    }

    public static PopupHide(): void {
        if (Boolean(ChatBox._popupignore) && Boolean(ChatBox._popupignore.parent)) {
            ChatBox._popupignore.parent.removeChild(ChatBox._popupignore);
            ChatBox._popupignore = null;
        }
    }

    private handleSendClick(param1: MouseEvent): void {
        if (Chat._bymChat == null) {
            return;
        }
        Chat._bymChat.SendMessage();
        this.forceFocus();
    }

    public get Scrollbar(): any {
        return this._scrollbar;
    }

    private onInputFocus(param1: Event): void {
        // (Inferno-only, QoL #161: typing works in full screen in a browser; only Flash needed to leave it)
        if (!GLOBAL.INFERNO_ONLY && this.stage.displayState == StageDisplayState.FULL_SCREEN) {
            GLOBAL.goFullScreen(null);
        }
        this.forceFocus();
    }

    private forceFocus(): void {
        this.stage.focus = this.input;
        MAP.Release(null);
    }

    public override init(): void {
        this.background.arrowUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.toggleHide));
        this.background.arrowUp.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onHideOver));
        this.background.arrowUp.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onHideOut));
        this.background.arrowUp.mouseChildren = false;
        this.background.arrowUp.buttonMode = true;
        this.background.arrowUp.useHandCursor = true;
        this.background.arrowUp.gotoAndStop("on" + this._skinTag);
        if (GLOBAL.INFERNO_ONLY && this.background.header) {
            // (QoL #546, 14 October: the whole header opens and closes the chat, not only its 12 px arrow)
            this.background.header.buttonMode = true;
            this.background.header.useHandCursor = true;
            this.background.header.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (e.target == this.background.header || (e.target && e.target.parent == this.background.header)) {
                    this.background.arrowUp.dispatchEvent(new MouseEvent(MouseEvent.CLICK, false, false));
                }
            });
        }
        this.background.arrowDown.mouseChildren = false;
        this.background.arrowDown.buttonMode = true;
        this.background.arrowDown.useHandCursor = true;
        this.background.arrowDown.gotoAndStop("on" + this._skinTag);
        this.background.arrowDown.enabled = false;
        this.background.arrowDown.visible = false;
        this.background.mcToggle.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnChatDisableClick));
        this.background.mcToggle.mouseChildren = false;
        this.background.mcToggle.buttonMode = true;
        this.background.mcToggle.useHandCursor = true;
        this.background.mcToggle.gotoAndStop(this._enabled ? "close" + this._skinTag : "on" + this._skinTag);
        this.input.addEventListener(FocusEvent.FOCUS_IN, as3.bind(this, this.onInputFocus));
        this.input.maxChars = 100;
        // (QoL #204: a phone's keyboard says Send)
        this.input.ioEnterKey = "send";
        this.ClearAlert();
        this.UpdateAlert();
        this.background.alert.visible = false;
        if (GLOBAL.StatGet("chatmin") == 1) {
            this._enabled = false;
            this._maximized = false;
            this._open = false;
        } else {
            this._enabled = true;
            this._maximized = false;
        }
        if (Chat._bymChat != null && !Chat._bymChat.initialized) {
            this.OnChatDisableClick();
        }
        this.toggleHide();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioSetTabs(Chat._bymChat != null ? Chat._bymChat.ioMode : BYMChat.IO_GLOBAL, 0, 0);
            this.ioInit();
            this.input.maxChars = ChatBox.IO_MAX_CHARS;
        }
    }

    private showHelp(...rest: any[]): void {
    }

    private hideHelp(...rest: any[]): void {
    }

    private toggleHide(param1: MouseEvent = null): void {
        let _loc4_: any = null;
        let _loc2_: boolean = false;
        let _loc3_: boolean = false;
        let chatOpen: boolean = this._open;
        if (param1 != null) {
            if (param1.currentTarget == this.background.arrowUp) {
                if (this._maximized) {
                    _loc2_ = false;
                } else {
                    _loc2_ = true;
                }
            }
            if (param1.currentTarget == this.background.mcToggle) {
                if (this._enabled) {
                    _loc2_ = true;
                    this._maximized = false;
                } else {
                    _loc2_ = false;
                    this._maximized = false;
                }
            }
        }
        if (this._animating) {
            return;
        }
        let _loc5_: number = 0.5;
        if (param1 == null) {
            if (chatOpen) {
                _loc4_ = this._openProps;
            } else {
                _loc4_ = this._closeProps;
            }
            this._maximized = false;
            this.background.arrowUp.gotoAndStop("on" + this._skinTag);
            this.background.arrowDown.gotoAndStop("on" + this._skinTag);
            this.background.arrowUp.buttonMode = true;
            this.background.arrowDown.buttonMode = false;
        } else if (this._maximized && chatOpen) {
            if (!(!_loc2_ && !_loc3_)) {
                return;
            }
            _loc4_ = this._openProps;
            this._maximized = false;
            this.background.arrowUp.gotoAndStop("on" + this._skinTag);
            this.background.arrowDown.gotoAndStop("on" + this._skinTag);
            this.background.arrowUp.buttonMode = true;
            this.background.arrowDown.buttonMode = true;
        } else if (chatOpen && !_loc3_) {
            this.ClearAlert();
            if (!_loc2_) {
                this._open = false;
                if (Chat._bymChat != null) {
                    Chat._bymChat._open = false;
                }
                _loc4_ = this._closeProps;
                this._maximized = false;
                this.background.arrowUp.gotoAndStop("on" + this._skinTag);
                this.background.arrowDown.gotoAndStop("off" + this._skinTag);
                this.background.arrowUp.buttonMode = true;
                this.background.arrowDown.buttonMode = false;
                GLOBAL.StatSet("chatmin", 1);
            } else if (_loc2_) {
                _loc4_ = this._maxProps;
                this._maximized = true;
                this.background.arrowUp.gotoAndStop("on" + this._skinTag);
                this.background.arrowDown.gotoAndStop("on" + this._skinTag);
                this.background.arrowUp.buttonMode = true;
                this.background.arrowDown.buttonMode = false;
                GLOBAL.StatSet("chatmin", 0);
            } else if (_loc3_) {
                return;
            }
        } else if (!chatOpen) {
            if (!(_loc2_ || _loc3_)) {
                return;
            }
            this._open = true;
            if (Chat._bymChat != null) {
                Chat._bymChat._open = true;
                if (GLOBAL.INFERNO_ONLY) {
                    Chat._bymChat.ioSeen();
                }
            }
            _loc4_ = this._openProps;
            this._maximized = false;
            this.background.arrowUp.gotoAndStop("on" + this._skinTag);
            this.background.arrowDown.gotoAndStop("on" + this._skinTag);
            this.background.arrowUp.buttonMode = true;
            this.background.arrowDown.buttonMode = true;
            GLOBAL.StatSet("chatmin", 0);
        }
        if (_loc4_ == null) {
            return;
        }
        this._scrollbar.visible = false;
        TweenLite.to(this.background, _loc5_, { "y": _loc4_.y, "onUpdate": as3.bind(this, this.toggleOnUpdate), "onComplete": as3.bind(this, this.toggleVisibleB) });
        TweenLite.to(this.background.mcScreen, _loc5_, { "height": _loc4_.screenHeight });
        TweenLite.to(this.background.mcMask, _loc5_, { "height": _loc4_.maskHeight });
        TweenLite.to(this._scrollbar, _loc5_, { "y": _loc4_.scrollerY });
        if (this._open) {
            TweenLite.to(this.inputbar, _loc5_, { "y": _loc4_.inputY, "autoAlpha": 1, "ease": Expo.easeOut });
            TweenLite.to(this.background.alert, _loc5_, { "autoAlpha": 0, "ease": Expo.easeOut });
        } else {
            TweenLite.to(this.inputbar, _loc5_, { "y": _loc4_.inputY, "autoAlpha": 0, "ease": Quad.easeIn });
        }
        this._animating = true;
        let _loc6_: int = _loc4_ == this._closeProps ? 0 : 1;
        if (TUTORIAL.hasFinished) {
            if (this._maximized) {
                TweenLite.to(this.background.arrowUp, _loc5_, { "rotation": 180, "autoAlpha": _loc6_, "y": this._chatWidthDefault.arrowDownY, "ease": Expo.easeOut });
            } else {
                TweenLite.to(this.background.arrowUp, _loc5_, { "rotation": 0, "autoAlpha": _loc6_, "y": this._chatWidthDefault.arrowUpY, "ease": Expo.easeOut });
            }
        }
    }

    private toggleOnUpdate(): void {
        if (MapRoom3.mapRoom3Window) {
            MapRoom3.mapRoom3WindowHUD.PositionLeftMenuButtonsBar();
        }
    }

    private toggleVisibleB(): void {
        this._animating = false;
        let _loc1_: any = this._maximized ? this._maxProps : this._openProps;
        this._scrollbar.Update();
        this._scrollbar.visible = this._shell.height > this.background.mcMask.height;
        if (!this._open) {
            if (Chat._bymChat != null) {
                Chat._bymChat.toggleMinimizedStat(true);
            }
            this._scrollbar.visible = false;
        } else if (GLOBAL.StatGet("chatmin") != 0) {
            if (Chat._bymChat != null) {
                Chat._bymChat.toggleMinimizedStat(false);
            }
        }
        this.update();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioApplyExtra();
            this.ioScrollToBottom();
            // (opened: the newest lines)
            this.ioTickTimes();
            // (QoL #477: folded, the bar says how many are online)
            this.ioChat2Redraw();
        } else {
            this._scrollbar.ScrollTo(1, false);
        }
    }

    /**
     * Inferno-only: the newest line in view (the user's, 29 September): when a line arrives or is sent, when the
     * chat is opened or its tab switched, and at the start, when the history comes in. At once, not eased.
     */
    /** Inferno-only: opens the chat if it is folded away (the quest book's "Go there"). */
    public ioOpen(): void {
        if (!this._open && !this._animating) {
            this.background.arrowUp.dispatchEvent(new MouseEvent(MouseEvent.CLICK));
        }
    }

    public ioScrollToBottom(): void {
        if (!this._scrollbar || !this.background || !this.background.mcMask) {
            return;
        }
        this._scrollbar.Update();
        this._scrollbar.ScrollTo(this._shell.height > this.background.mcMask.height ? 1 : 0, true);
    }

    public ResizeWindow(): void {
        if (this._chatWidth != this._chatWidthDefault.sizeW) {
            this.background.header.width = this._chatWidthDefault.headerW;
            this.background.tTitle.x = this._chatWidthDefault.titleTxtX;
            this.background.alert.x = this._chatWidthDefault.alertX;
            this.background.arrowUp.x = this._chatWidthDefault.arrowUpX;
            this.background.arrowDown.x = this._chatWidthDefault.arrowDownX;
            this.background.arrowUp.y = this._chatWidthDefault.arrowUpY;
            this.background.arrowDown.y = this._chatWidthDefault.arrowDownY;
            this.background.border.width = this._chatWidthDefault.borderW;
            this.background.mcMask.width = this._chatWidthDefault.mcMaskW;
            this.background.mcScreen.width = this._chatWidthDefault.mcScreenW;
            this.background._output.width = this._chatWidthDefault.tOutputW;
            this.inputbar.inputWoodBg.width = this._chatWidthDefault.inputWoodBgW;
            this.input.width = Number(this._chatWidthDefault.inputTxtW);
            this.inputbar.inputTxtBG.width = this._chatWidthDefault.inputTxtBgW;
            this._sendBtn.x = Number(this._chatWidthDefault.sendBtnX);
            this._scrollbar.x = Number(this._chatWidthDefault.scrollerX);
            this._chatWidth = this._chatWidthDefault.sizeW | 0;
            // (Inferno-only: the box 40 wider; its on/off button moves with the arrows, once)
            if (GLOBAL.INFERNO_ONLY && this.background.mcToggle && !(this as any)._ioToggleMoved) {
                this.background.mcToggle.x += 40;
                (this as any)._ioToggleMoved = true;
            }
            this.ioPlaceEmoteButton();
        }
    }

    /**
     * Inferno-only (14 October, the user's): the emote button, between the box typed in and Say (the box 32 narrower
     * for it); it opens the emote picker above the chat.
     */
    private _ioEmoteBtn: Sprite;

    private ioPlaceEmoteButton(): void {
        if (!GLOBAL.INFERNO_ONLY || !this.inputbar || !this._sendBtn) {
            return;
        }
        if (!this._ioEmoteBtn) {
            let b: Sprite = new Sprite();
            b.name = "ioEmoteButton";
            b.buttonMode = true;
            let bg: Shape = new Shape();
            bg.graphics.lineStyle(1, 0x3A2412, 1);
            bg.graphics.beginFill(0xE8C98A, 1);
            bg.graphics.drawRoundRect(0, 0, 28, 26, 8, 8);
            bg.graphics.endFill();
            b.addChild(bg);
            let face: Sprite = IoEmotes.make("grin", 22);
            face.x = 3;
            face.y = 2;
            b.addChild(face);
            b.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
                e.stopPropagation();
                let at: any = b.localToGlobal(new Point(0, 0));
                let chatLeft: any = this.background.localToGlobal(new Point(0, 0));
                IoEmotePicker.ignoreDownOn = b;
                IoEmotePicker.Toggle(chatLeft.x + 4, at.y);
            });
            this.inputbar.addChild(b);
            this._ioEmoteBtn = b;
        }
        // (QoL #563: the box 8 px shorter, so the emote button has room either side and a miss doesn't press Say)
        this._ioEmoteBtn.x = this.inputbar.inputTxtBG.x + this.inputbar.inputTxtBG.width + 4;
        this._ioEmoteBtn.y = this._sendBtn.y;
        if (this._ioCounter) {
            this._ioCounter.x = this.inputbar.inputTxtBG.x + this.inputbar.inputTxtBG.width - 62;
        }
    }

    public ResizeMessages(): void {
        let _loc1_: number = 0;
        let _loc2_: number = 0;
        if (GLOBAL.INFERNO_ONLY) {
            // (the lines are laid out as they come, ioAppend: nothing to rebuild here)
            if (this._chatMessages) {
                this._chatMessages.x = Number(this.background.mcMask.x);
                this._chatMessages.y = Number(this.background.mcMask.y);
            }
            if (this._scrollbar.parent != this) {
                this.addChild(this._scrollbar);
            }
            // (nothing laid out since last time: the bar and the scroll stay as they are. The game asks for this once a
            // second (UI2.Update); measuring 60 lines' height five times over was a 3-6 ms hitch every second.)
            let last: any = this._chatHistory.length ? this._chatHistory[this._chatHistory.length - 1] : null;
            // (the last line's place and height too: a line laid out again later, its font arrived, moves the bottom)
            let key: string = this._chatHistory.length + "|" + (last ? last.$uid + ":" + last.y + ":" + last.height : 0) + "|" + this._shell.y + "|" + this._open + "|" + this._chatWidth + "|" + (this._chatMessages ? (this._chatMessages as any).$uid + ":" + this._chatMessages.numChildren : -1) + "|" + this._shell.numChildren + "|" + (this.background.mcMask ? this.background.mcMask.scaleY + ":" + this.background.mcMask.y : "");
            if (!this._animating && key === (this as any)._ioLayoutKey) {
                return;
            }
            (this as any)._ioLayoutKey = this._animating ? null : key;
            this.ioAfterLayout(this.ioAtBottom());
            return;
        }
        if (Boolean(this._chatMessages) && Boolean(this._chatMessages.parent)) {
            this._chatMessages.parent.removeChild(this._chatMessages);
            this._chatMessages = null;
        }
        this._chatMessages = new MovieClip();
        this._shell.addChild(this._chatMessages);
        this._chatMessages.x = Number(this.background.mcMask.x);
        this._chatMessages.y = Number(this.background.mcMask.y);
        let _loc3_: number = 1;
        let _loc4_: int = 0;
        while (_loc4_ < this._chatHistory.length) {
            if (this._chatHistory[_loc4_].isOwnMessage) {
                this._chatHistory[_loc4_].bg.gotoAndStop(3);
            } else {
                this._chatHistory[_loc4_].bg.gotoAndStop(_loc4_ % 2 + 1);
            }
            this._chatHistory[_loc4_].y = _loc1_;
            this._chatHistory[_loc4_].scaleY = _loc3_;
            this._chatHistory[_loc4_].txt.width = this._chatWidthDefault.tOutputW;
            this._chatHistory[_loc4_].ignoreBtn.x = this._chatWidthDefault.ignoreBtnX;
            if (GLOBAL.INFERNO_ONLY) {
                IoMapShare.RelayoutChat(as3.cast(this._chatHistory[_loc4_], DisplayObject));
            }
            this._chatMessages.addChild(as3.cast(this._chatHistory[_loc4_], DisplayObject));
            _loc1_ = Number(_loc1_ + this._chatHistory[_loc4_].height);
            _loc4_++;
        }
        if (!this._scrollbar.visible && Chat._bymChat != null && Chat._bymChat._open) {
            this._scrollbar.visible = this._shell.height > this.background.mcMask.height;
        }
        this.addChild(this._scrollbar);
        this._scrollbar.Update();
        this._scrollbar.Resync();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioScrollToBottom();
        }
    }

    public UpdateAlert(param1: int = 0): void {
        let _loc2_: string = null;
        if (!this._useAlerts) {
            this.background.alert.visible = false;
            return;
        }
        if (!Chat._bymChat._open) {
            this._alertsCounter += param1;
            _loc2_ = this._alertsCounter < 100 ? String(this._alertsCounter) : "99+";
            this.background.alert.alert_txt.htmlText = "<b>" + _loc2_ + "</b>";
            this.background.alert.alert_txt.x = 2;
            this.background.alert.bg.width = this.background.alert.alert_txt.width + 6;
        }
        if (this._alertsCounter > 0 && !Chat._bymChat._open && this._useAlerts) {
            TweenLite.to(this.background.alert, 0.5, { "autoAlpha": 1, "ease": Circ.easeIn });
        } else if (Chat._bymChat._open && this.background.alert.alpha != 0) {
            TweenLite.to(this.background.alert, 0.5, { "autoAlpha": 0, "ease": Expo.easeOut });
        }
    }

    public ClearAlert(): void {
        if (this._open) {
            this._alertsCounter = 0;
            this.UpdateAlert();
        }
    }

    public override push(param1: string, param2: string = null, param3: string = null, param4: string = null, param5: boolean = false): void {
        if (GLOBAL.INFERNO_ONLY) {
            // (24 October: the Inferno lays its lines out as they come (ioAppend); a line given the old way went into the
            // history without being drawn, and pushed the drawn ones out of step. Shown as the game's own line now.)
            this.ioAppend({ "html": "<i>" + param1 + "</i>", "kind": "system", "ts": BYMChat.ioNow() });
            return;
        }
        let _loc9_: ChatBox_msg_name_CLIP = null;
        let _loc6_: string = null;
        if ((_loc6_ = param2) != null) {
            if ((_loc6_ = _loc6_.substr(_loc6_.indexOf("["))) != null) {
                _loc6_ = _loc6_.substring(0, _loc6_.indexOf("<") - 1);
            }
        }
        let _loc7_: any = { "msg": param1, "username": _loc6_, "userid": param3, "msgtype": param4 };
        let _loc8_: ChatBox_msg_CLIP = null;
        // Inferno-only: places shared from the map room ([map:x,y]) show as clickable coordinates.
        let ioPlaces: any = GLOBAL.INFERNO_ONLY ? IoMapShare.RenderChat(param1) : null;
        (_loc8_ = new ChatBox_msg_CLIP()).txt.htmlText = ioPlaces ? String(ioPlaces.html) : param1;
        _loc8_.txt.autoSize = TextFieldAutoSize.LEFT;
        _loc8_.bg.height = _loc8_.txt.height;
        if (ioPlaces) {
            IoMapShare.DecorateChat(_loc8_, _loc8_.txt, as3.as(ioPlaces.links, Array));
        }
        _loc8_.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.OnMsgMouseOver));
        _loc8_.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.OnMsgMouseOut));
        _loc8_.ignoreBtn.visible = false;
        _loc8_.ignoreBtn.buttonMode = true;
        _loc8_.msgData = _loc7_;
        _loc8_.isOwnMessage = param3 == LOGIN._playerID.toString();
        if (param2 != null) {
            _loc8_.ignoreBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.OnMsgIgnoreMouseDown));
            _loc8_.ignoreBtn.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.OnMsgIgnoreRollOver));
            _loc8_.ignoreBtn.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.OnMsgIgnoreRollOut));
            (_loc9_ = new ChatBox_msg_name_CLIP()).label.htmlText = param2;
            _loc9_.label.autoSize = TextFieldAutoSize.LEFT;
            _loc9_.bg.width = _loc9_.label.textWidth;
            _loc9_.label.visible = false;
            _loc9_.x = 0;
            _loc9_.y = 0;
            _loc9_.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.OnMsgNameMouseDown));
            _loc9_.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.OnMsgNameRollOver));
            _loc9_.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.OnMsgNameRollOut));
            _loc8_.addChild(_loc9_);
        }
        this._chatHistory.push(_loc8_);
        if (GLOBAL.INFERNO_ONLY) {
            // The history was never trimmed, and every new line lays out all of it again.
            while (this._chatHistory.length > 60) {
                this._chatHistory.shift();
            }
        }
        if (!param5) {
            while (this._chats.length > 40) {
                this._chats.shift();
            }
        }
        this.ResizeMessages();
    }

    private ioInit(): void {
        if (this._ioInited) {
            return;
        }
        this._ioInited = true;
        this._chatMessages.x = Number(this.background.mcMask.x);
        this._chatMessages.y = Number(this.background.mcMask.y);
        this.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.ioWheel));
        this._ioClock = new Timer(5000);
        this._ioClock.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            this.ioTickTimes();
        });
        this._ioClock.start();
        this.ioInputInit();
    }

    /** Adds a line at the bottom. The view stays where the player scrolled to, unless it was at the newest. */
    public ioAppend(param1: any, param2: boolean = false): void {
        // (21 October: lines arriving together (a channel's history when the game starts: dozens at once) are laid out
        // once, after the last: each laid all of them out again (the lines' height measured, the bar, the scroll), a
        // half-second freeze at the start. Whether the view follows them is told by the first.)
        let stick: boolean = param2 || (this._ioLayoutDue ? this._ioLayoutStick : this.ioAtBottom());
        let line: ChatBox_msg_CLIP = this.ioMakeLine(param1);
        line.y = this._ioY;
        this._chatMessages.addChild(line);
        this._chatHistory.push(line);
        this._ioY = Number(this._ioY + line.ioH);
        let shifted: number = 0;
        while (this._chatHistory.length > ChatBox.IO_MAX_LINES) {
            let gone: ChatBox_msg_CLIP = as3.as(this._chatHistory.shift(), ChatBox_msg_CLIP);
            if (gone.parent) {
                gone.parent.removeChild(gone);
            }
            shifted = Number(shifted + gone.ioH);
        }
        if (shifted > 0) {
            for (let kept of as3.values(this._chatHistory)) {
                kept.y -= shifted;
            }
            this._ioY -= shifted;
            if (!stick) {
                this._shell.y += shifted;
            }
        }
        if (!param2) {
            let follow: boolean = stick || param1.kind == "own";
            if (this._ioLayoutDue) {
                this._ioLayoutStick = this._ioLayoutStick || follow;
            } else {
                this._ioLayoutDue = true;
                this._ioLayoutStick = follow;
                setTimeout((): void => {
                    if (!this._ioLayoutDue) {
                        return;
                    }
                    this._ioLayoutDue = false;
                    if (this._chatMessages && this._scrollbar && this.background && this.background.mcMask) {
                        this.ioAfterLayout(this._ioLayoutStick);
                    }
                }, 0);
            }
            if (!stick && param1.kind != "own") {
                this.ioCountUnseen(param1.kind == "mention");
            }
        }
    }

    /** A line came in below the view (QoL #144): the pill counts it, gold when one mentions the player. */
    private ioCountUnseen(param1: boolean): void {
        if (!GLOBAL.INFERNO_ONLY || !this.background || !this.background.mcMask) {
            return;
        }
        this._ioUnseen++;
        this._ioUnseenMention = this._ioUnseenMention || param1;
        if (!this._ioPill) {
            this._ioPill = new Sprite();
            this._ioPill.name = "ioChatNewPill";
            this._ioPill.buttonMode = true;
            this._ioPill.useHandCursor = true;
            this._ioPill.mouseChildren = false;
            let label: TextField = new TextField();
            label.name = "ioChatNewPillText";
            label.defaultTextFormat = new TextFormat("Verdana", 11, 0xFFF4E0, true);
            label.autoSize = TextFieldAutoSize.LEFT;
            label.selectable = false;
            label.mouseEnabled = false;
            this._ioPill.addChild(label);
            this._ioPill.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                this.ioScrollToBottom();
                this.ioHidePill();
            });
            this._ioPill.addEventListener(Event.ENTER_FRAME, (e: Event): void => {
                if (this._ioPill.visible && (!this._open || this.ioAtBottom())) {
                    this.ioHidePill();
                }
            });
        }
        let text: TextField = as3.as(this._ioPill.getChildAt(0), TextField);
        text.text = KEYS.Get("io_chat_new_lines", { "v1": this._ioUnseen });
        let w: number = Math.ceil(text.textWidth) + 22;
        let h: number = 20;
        text.x = 11;
        text.y = (h - text.textHeight) / 2 - 2;
        text.textColor = (this._ioUnseenMention ? 0x3A2200 : 0xFFF4E0) >>> 0;
        let g: any = this._ioPill.graphics;
        g.clear();
        g.lineStyle(1, (this._ioUnseenMention ? 0x8A5A00 : 0xFFB35A) >>> 0, 1);
        g.beginFill((this._ioUnseenMention ? 0xFFD24A : 0x5A1E08) >>> 0, 0.95);
        g.drawRoundRect(0, 0, w, h, h);
        g.endFill();
        let mask: any = this.background.mcMask;
        this._ioPill.x = Math.round(mask.x + (mask.width - w) / 2);
        this._ioPill.y = Math.round(mask.y + mask.height - h - 6);
        this.background.addChild(this._ioPill);
        this._ioPill.visible = this._open;
    }

    private ioHidePill(): void {
        this._ioUnseen = 0;
        this._ioUnseenMention = false;
        if (this._ioPill) {
            this._ioPill.visible = false;
        }
    }

    /** Inferno-only (21 October): lines appended this moment, laid out once after the last (ioAppend), and whether to follow them. */
    private _ioLayoutDue: boolean;
    private _ioLayoutStick: boolean;

    /** The transcript of the tab now showing, all at once. */
    public ioSetLines(param1: any[]): void {
        if (!this._chatMessages) {
            return;
        }
        this._ioLayoutDue = false;
        while (this._chatMessages.numChildren > 0) {
            this._chatMessages.removeChildAt(0);
        }
        this._chatHistory = [];
        this._ioY = 0;
        this._ioParity = 0;
        this.ioHidePill();
        this._chatMessages.x = Number(this.background.mcMask.x);
        this._chatMessages.y = Number(this.background.mcMask.y);
        let from: int = Math.max(0, param1.length - ChatBox.IO_MAX_LINES) | 0;
        for (let i: int = from; i < param1.length; i++) {
            this.ioAppend(param1[i], true);
        }
        this.ioAfterLayout(true);
    }

    private ioMakeLine(param1: any): ChatBox_msg_CLIP {
        let line: ChatBox_msg_CLIP = new ChatBox_msg_CLIP();
        let kind: string = String(param1.kind);
        let style: any[] = as3.as(ChatBox.IO_STYLE[kind], Array);
        let html: string = String(param1.html);
        if (style && style[1]) {
            html = "<font color=\"" + style[1] + "\">" + html + "</font>";
        }
        // (14 October: emotes, [e:id], out of the text: drawn as pictures below)
        let emotes: string[] = IoEmotes.idsIn(html);
        let emoteOnly: boolean = false;
        if (emotes.length) {
            html = IoEmotes.strip(html);
            let label: string = param1.label ? String(param1.label) : "";
            let rest: string = html.indexOf(label) >= 0 ? html.substr(html.indexOf(label) + label.length) : html;
            emoteOnly = rest.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, "") == "";
        }
        let places: any = IoMapShare.RenderChat(html);
        // (13 October: a player's line starts with a dot, green online, grey not: the text moves over for it)
        let dotW: number = param1.dot ? ChatBox.IO_DOT_W : 0;
        line.txt.x += dotW;
        line.txt.width = ChatBox.IO_TEXT_W - dotW;
        line.txt.htmlText = places ? String(places.html) : html;
        line.txt.autoSize = TextFieldAutoSize.LEFT;
        let h: number = Math.ceil(line.txt.height);
        if (emotes.length) {
            // after the name when the line is only emotes; else a row under the text
            let size: int = ChatBox.IO_EMOTE;
            let ex: number;
            let ey: number;
            if (emoteOnly && param1.label) {
                // (just after the name's last letter, its ":", as the field drew it)
                let shown: string = line.txt.text.replace(/\s+$/, "");
                let end: any = shown.length > 0 ? line.txt.getCharBoundaries(shown.length - 1) : null;
                if (end) {
                    ex = line.txt.x + end.x + end.width + 6;
                } else {
                    let probe: TextField = new TextField();
                    probe.defaultTextFormat = line.txt.defaultTextFormat;
                    probe.autoSize = TextFieldAutoSize.LEFT;
                    probe.htmlText = String(param1.label);
                    ex = line.txt.x + probe.textWidth + 8;
                }
                ey = line.txt.y + 1;
                h = Math.max(h, size + 4);
            } else {
                ex = line.txt.x + 2;
                ey = line.txt.y + Math.ceil(line.txt.textHeight) + 3;
                h = Math.ceil(ey + size + 3);
            }
            for (let k: int = 0; k < emotes.length; k++) {
                let pic: Sprite = IoEmotes.make(emotes[k], size);
                pic.x = ex + k * (size + 4);
                pic.y = ey;
                line.addChild(pic);
            }
        }
        let fullW: number = line.bg.width;
        line.bg.height = h;
        if (kind == "own") {
            line.bg.gotoAndStop(3);
        } else if (style) {
            line.bg.visible = false;
            let paint: Shape = new Shape();
            paint.graphics.beginFill(style[0] >>> 0, 1);
            paint.graphics.drawRect(line.bg.x, line.bg.y, fullW, h);
            paint.graphics.endFill();
            if (kind == "mention" || kind == "announce") {
                paint.graphics.beginFill((kind == "mention" ? 0xE07A1F : 0xB8860B) >>> 0, 1);
                paint.graphics.drawRect(line.bg.x, line.bg.y, 3, h);
                paint.graphics.endFill();
            }
            line.addChildAt(paint, 0);
        } else {
            line.bg.gotoAndStop(this._ioParity % 2 + 1);
        }
        this._ioParity++;
        line.ignoreBtn.visible = false;
        line.ioH = h;
        line.ioTs = Number(param1.ts);
        line.isOwnMessage = kind == "own";
        line.msgData = { "msg": html, "username": param1.name, "userid": param1.user, "msgtype": kind == "ignorelist" ? "IgnoreList" : "Default", "lineId": param1.id, "channel": param1.channel, "role": param1.role, "tag": param1.tag, "aid": param1.aid, "dot": param1.dot, "body": param1.body };
        if (line.ioTs > 0) {
            let time: TextField = new TextField();
            let tf: TextFormat = new TextFormat(line.txt.defaultTextFormat.font, 10, 0x8A8070);
            tf.align = TextFormatAlign.RIGHT;
            time.defaultTextFormat = tf;
            time.selectable = false;
            time.mouseEnabled = false;
            time.width = ChatBox.IO_TIME_W;
            time.height = 16;
            time.x = line.txt.x - dotW + ChatBox.IO_TEXT_W;
            time.y = line.txt.y + 1;
            time.text = ChatBox.ioAgo(Number(line.ioTs));
            line.addChild(time);
            line.ioTime = time;
        }
        if (dotW > 0) {
            let dot: Shape = new Shape();
            dot.name = "ioDot";
            let on: boolean = param1.dot == "on";
            dot.graphics.lineStyle(1, (on ? 0x1E7A12 : 0x6E6E6E) >>> 0, 1);
            dot.graphics.beginFill((on ? 0x35C21F : 0xA8A8A8) >>> 0, 1);
            dot.graphics.drawCircle(0, 0, 3.5);
            dot.graphics.endFill();
            dot.x = line.txt.x - dotW + 6;
            dot.y = line.txt.y + 9;
            line.addChild(dot);
        }
        if (param1.label && param1.user) {
            let hit: ChatBox_msg_name_CLIP = new ChatBox_msg_name_CLIP();
            hit.label.htmlText = String(param1.label);
            hit.label.autoSize = TextFieldAutoSize.LEFT;
            hit.bg.width = hit.label.textWidth;
            hit.label.visible = false;
            hit.x = dotW;
            hit.y = 0;
            hit.buttonMode = true;
            hit.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.OnMsgNameMouseDown));
            line.addChild(hit);
        }
        if (places) {
            IoMapShare.DecorateChat(line, line.txt, as3.as(places.links, Array));
        }
        if (param1.fx && param1.fxHtml) {
            // (the html as given, not as the field reads it back: that is rewritten, and the name would not be found in it)
            line.ioFx = { "look": String(param1.fx), "text": String(param1.fxText), "now": String(param1.fxHtml), "html": places ? String(places.html) : html };
            this.ioFxWatch();
        }
        return line;
    }

    private _ioFxOn: boolean;

    private _ioFxAt: int;
    /** QoL #144: "3 new ↓" over the bottom of the lines while the player reads further up. */
    private _ioPill: Sprite;
    private _ioUnseen: int;
    private _ioUnseenMention: boolean;

    /** Starts drawing the moving name effects (12 October: opened by inviting friends) again as time goes. */
    private ioFxWatch(): void {
        if (this._ioFxOn) {
            return;
        }
        this._ioFxOn = true;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioFxTick));
    }

    private ioFxTick(e: Event = null): void {
        let now: int = getTimer();
        if (now - this._ioFxAt < 80) {
            return;
        }
        this._ioFxAt = now;
        let any: boolean = false;
        let mask: any = this.background ? this.background.mcMask : null;
        let shown: boolean = this.visible && this.stage != null && this._chatMessages != null;
        for (let o of as3.values(this._chatHistory)) {
            let line: ChatBox_msg_CLIP = as3.as(o, ChatBox_msg_CLIP);
            let fx: any = line ? line.ioFx : null;
            if (!fx || !line.parent) {
                continue;
            }
            any = true;
            if (!shown) {
                continue;
            }
            // only the lines in view (the list scrolls inside the mask)
            if (mask && mask.parent) {
                let r: any = line.getBounds(mask.parent);
                if (r.y + r.height < mask.y || r.y > mask.y + mask.height) {
                    continue;
                }
            }
            let next: string = IoDave.fxHtml(String(fx.look), String(fx.text), now);
            let at: int = String(fx.html).indexOf(String(fx.now)) | 0;
            if (at < 0) {
                continue;
            }
            fx.html = String(fx.html).substr(0, at) + next + String(fx.html).substr(at + String(fx.now).length);
            fx.now = next;
            line.txt.htmlText = String(fx.html);
        }
        if (!any) {
            this._ioFxOn = false;
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioFxTick));
        }
    }

    /** "now", "33s", "2m", "4h", "3d": how long ago a line was said. */
    public static ioAgo(param1: number): string {
        let sec: int = Math.max(0, ((BYMChat.ioNow() - param1) / 1000) | 0) | 0;
        if (sec < 5) {
            return "now";
        }
        if (sec < 60) {
            return sec + "s";
        }
        if (sec < 3600) {
            return ((sec / 60) | 0) + "m";
        }
        if (sec < 86400) {
            return ((sec / 3600) | 0) + "h";
        }
        return ((sec / 86400) | 0) + "d";
    }

    /** The times move on (every 5 seconds, while the chat is open). */
    private ioTickTimes(): void {
        if (!this._open || !this.stage) {
            return;
        }
        for (let line of as3.values(this._chatHistory)) {
            if (line.ioTime) {
                let said: string = ChatBox.ioAgo(Number(line.ioTs));
                if (line.ioTime.text != said) {
                    line.ioTime.text = said;
                }
            }
        }
    }

    private ioAtBottom(): boolean {
        let range: number = this._shell.height - this.background.mcMask.height;
        return range <= 2 || this._shell.y <= -range + 8;
    }

    private ioAfterLayout(param1: boolean): void {
        this._scrollbar.Update();
        let range: number = this._shell.height - this.background.mcMask.height;
        if (!this._animating) {
            this._scrollbar.visible = this._open && range > 0;
        }
        if (param1 || range <= 0) {
            this.ioScrollToBottom();
        } else {
            this.ioScrollToY(this._shell.y);
        }
    }

    /**
     * The lines at a scroll position, the bar's thumb with them. (ScrollSet.ScrollTo snaps to the ends
     * when near them, which pulled a reader a few lines up back to the bottom.)
     */
    private ioScrollToY(param1: number): void {
        let range: number = this._shell.height - this.background.mcMask.height;
        if (range <= 0) {
            this._shell.y = 0;
            return;
        }
        let y: number = Math.round(Math.max(-range, Math.min(0, param1)));
        this._shell.y = y;
        let bar: MovieClip = as3.as(this._scrollbar, MovieClip);
        if (bar && bar.mcScroller && bar.mcBG) {
            bar.mcScroller.y = Math.max(0, bar.mcBG.height - bar.mcScroller.height) * (-y / range);
        }
    }

    /** The mouse wheel scrolls the lines (not the map behind). */
    private ioWheel(param1: MouseEvent): void {
        param1.stopPropagation();
        let range: number = this._shell.height - this.background.mcMask.height;
        if (range <= 0 || !this._open) {
            return;
        }
        this.ioScrollToY(this._shell.y + (param1.delta > 0 ? 1 : -1) * 48);
    }

    private ioInputInit(): void {
        this.input.maxChars = ChatBox.IO_MAX_CHARS;
        this.input.multiline = false;
        // (Enter sends: it never starts a new line)
        this.input.wordWrap = true;
        this._ioBase = { "wood": this.inputbar.inputWoodBg.height, "txtBg": this.inputbar.inputTxtBG.height, "input": this.input.height, "send": this._sendBtn.y };
        let probe: TextField = new TextField();
        probe.defaultTextFormat = this.input.defaultTextFormat;
        probe.autoSize = TextFieldAutoSize.LEFT;
        probe.text = "Wg";
        if (probe.textHeight > 4) {
            this._ioLineH = Math.ceil(probe.textHeight);
        }
        this._ioCounter = new TextField();
        let tf: TextFormat = new TextFormat("Verdana", 10, 0xFFE6A0, true);
        tf.align = TextFormatAlign.RIGHT;
        this._ioCounter.defaultTextFormat = tf;
        this._ioCounter.selectable = false;
        this._ioCounter.mouseEnabled = false;
        this._ioCounter.width = 60;
        this._ioCounter.height = 16;
        this._ioCounter.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 1)];
        this._ioCounter.x = this.inputbar.inputTxtBG.x + this.inputbar.inputTxtBG.width - 62;
        this._ioCounter.y = -4;
        this._ioCounter.visible = false;
        this.inputbar.addChild(this._ioCounter);
        this.input.addEventListener(Event.CHANGE, (e: Event): void => {
            this.ioInputLayout();
        });
    }

    /** The box grows (upwards) with what is typed, and the count shows near the end of the 200. */
    public ioInputLayout(): void {
        if (!GLOBAL.INFERNO_ONLY || !this._ioBase) {
            return;
        }
        let len: int = this.input.text.length;
        this._ioCounter.visible = len >= ChatBox.IO_COUNT_FROM;
        if (this._ioCounter.visible) {
            this._ioCounter.textColor = (len >= ChatBox.IO_MAX_CHARS ? 0xFF6A4A : 0xFFE6A0) >>> 0;
            this._ioCounter.text = len + "/" + ChatBox.IO_MAX_CHARS;
        }
        let lines: int = (len > 0 ? Math.max(1, Math.min(ChatBox.IO_INPUT_LINES, Math.round(this.input.textHeight / this._ioLineH))) : 1) | 0;
        let extra: int = ((lines - 1) * this._ioLineH) | 0;
        if (extra != this._ioExtra) {
            this._ioExtra = extra;
            this.ioApplyExtra();
        }
    }

    private ioApplyExtra(): void {
        if (!GLOBAL.INFERNO_ONLY || !this._ioBase || this._animating) {
            return;
        }
        let extra: int = this._open ? this._ioExtra : 0;
        let props: any = !this._open ? this._closeProps : (this._maximized ? this._maxProps : this._openProps);
        this.inputbar.y = props.inputY - extra;
        this.inputbar.inputWoodBg.height = this._ioBase.wood + extra;
        this.inputbar.inputTxtBG.height = this._ioBase.txtBg + extra;
        this.input.height = Number(this._ioBase.input + extra);
        this._sendBtn.y = Number(this._ioBase.send + extra);
        if (this._ioEmoteBtn) {
            this._ioEmoteBtn.y = this._sendBtn.y;
        }
        this.background.y = props.y - extra;
        this._scrollbar.y = props.scrollerY - extra;
    }

    /** Puts words back in the box (a line the server refused), the cursor at the end. */
    public ioSetInput(param1: string): void {
        this.input.text = param1;
        this.input.setSelection(param1.length, param1.length);
        this.ioInputLayout();
    }

    private ioMakeTab(param1: string): TextField {
        let tab: TextField = new TextField();
        tab.selectable = false;
        tab.autoSize = TextFieldAutoSize.LEFT;
        // (the Quests panel's title font, 29 September: Groboldov, white, a black outline)
        tab.embedFonts = true;
        tab.defaultTextFormat = new TextFormat("Groboldov", 14, 0xFFFFFF, true);
        tab.filters = [new GlowFilter(0x000000, 1, 3, 3, 10, 1)];
        tab.text = param1;
        let holder: Sprite = new Sprite();
        holder.buttonMode = true;
        holder.mouseChildren = false;
        holder.name = param1;
        holder.addChild(tab);
        holder.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioTabClick));
        this._ioTabs.addChild(holder);
        return tab;
    }

    /** Inferno-only (13 October): the bar's Who's Online? button (IoWhosOnline), made once. */
    private ioWhoButton(): Sprite {
        if (this._ioWho) {
            if (this._ioWho.parent != this.background) {
                this.background.addChild(this._ioWho);
            }
            return this._ioWho;
        }
        let b: Sprite = new Sprite();
        b.name = "ioWhosOnline";
        b.buttonMode = true;
        b.mouseChildren = false;
        let t: TextField = new TextField();
        t.selectable = false;
        t.autoSize = TextFieldAutoSize.LEFT;
        t.embedFonts = true;
        // (13 October, the user's: smaller)
        t.defaultTextFormat = new TextFormat("Groboldov", 10, 0xFFFFFF, true);
        t.filters = [new GlowFilter(0x000000, 1, 2, 2, 8, 1)];
        t.text = KEYS.Get("io_tr_who_title");
        t.x = 8;
        t.y = 0;
        b.addChild(t);
        let draw: Function = (over: boolean): void => {
            b.graphics.clear();
            if (GLOBAL.INFERNO_ONLY && this._ioChat2Hidden) {
                // (QoL #477: appearing offline: a hollow grey dot, as on the list)
                b.graphics.lineStyle(1.5, 0x9A9A9A >>> 0, 1);
                b.graphics.beginFill(0x8A8A8A >>> 0, 0);
            } else {
                b.graphics.beginFill(0x35C21F >>> 0, 1);
                b.graphics.lineStyle(1, 0x0E4A08 >>> 0, 1);
            }
            b.graphics.drawCircle(3, 7.5, 2.5);
            b.graphics.endFill();
            t.textColor = over ? 0xFFD24A : 0xFFFFFF;
        };
        (b as any).ioDraw = draw;
        draw(false);
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoWhosOnline.Show();
        });
        this._ioWho = b;
        this.background.addChild(b);
        return b;
    }

    private ioTabClick(param1: MouseEvent): void {
        if (Chat._bymChat != null) {
            SOUNDS.Play("click1");
            Chat._bymChat.ioSwitch((as3.as(param1.currentTarget, Sprite)).name == "global" ? BYMChat.IO_GLOBAL : BYMChat.IO_ALLIANCE);
        }
    }

    /** Tab labels with the unread counts, the showing tab highlighted. */
    public ioSetTabs(param1: string, param2: int, param3: int, param4: int = 0, param5: int = 0): void {
        if (!GLOBAL.INFERNO_ONLY || !this.background) {
            return;
        }
        this._ioChat2TabArgs = [param1, param2, param3, param4, param5];
        if (!this._ioTabs) {
            this._ioTabs = new Sprite();
            this._ioTabGlobal = this.ioMakeTab("global");
            this._ioTabAlliance = this.ioMakeTab("alliance");
        }
        if (this._ioTabs.parent != this.background) {
            this.background.addChild(this._ioTabs);
        }
        this.background.tTitle.visible = false;
        this.ioTabText(this._ioTabGlobal, KEYS.Get("io_t3m_ch_tab_global"), param2, param1 == BYMChat.IO_GLOBAL, param4);
        this.ioTabText(this._ioTabAlliance, KEYS.Get("io_t3m_ch_tab_alliance"), param3, param1 == BYMChat.IO_ALLIANCE, param5);
        // (13 October: Who's Online? on the bar's left)
        let who: Sprite = this.ioWhoButton();
        this.ioChat2WhoLabel(who);
        who.x = 8;
        who.y = (this.background.tTitle.y + (this.background.tTitle.height - 15) / 2) | 0;
        // Centred where the title was (clear of Who's Online?), a divider between the two.
        let gap: int = 14;
        let total: number = this._ioTabGlobal.width + gap + this._ioTabAlliance.width;
        let left: number = Math.max(this.background.tTitle.x + this.background.tTitle.width / 2 - total / 2, who.x + who.width + 12);
        this._ioTabGlobal.parent.x = left | 0;
        this._ioTabAlliance.parent.x = (left + this._ioTabGlobal.width + gap) | 0;
        this._ioTabGlobal.parent.y = this._ioTabAlliance.parent.y = (this.background.tTitle.y + (this.background.tTitle.height - this._ioTabGlobal.height) / 2) | 0;
        // (QoL #561: each takes a click over the bar's full height and up to the divider; the words alone were
        // 9 to 10 px tall to hit)
        let top: number = this.background.tTitle.y - 3;
        let tall: number = this.background.tTitle.height + 6;
        for (let h of [this._ioTabGlobal.parent, this._ioTabAlliance.parent, who]) {
            let hs: Sprite = as3.as(h, Sprite);
            let tf: TextField = null;
            for (let k: int = 0; k < hs.numChildren && !tf; k++) {
                tf = as3.as(hs.getChildAt(k), TextField);
            }
            let tw: number = tf ? tf.x + tf.width : hs.width;
            let g: any = hs.graphics;
            if (h == who) {
                // (its own graphics are its green dot, redrawn on hover: the hit area is a layer under it)
                let layer: Shape = as3.as(who.getChildByName("ioWhoHit"), Shape);
                if (!layer) {
                    layer = new Shape();
                    layer.name = "ioWhoHit";
                    who.addChildAt(layer, 0);
                }
                g = layer.graphics;
            }
            g.clear();
            g.beginFill(0, 0);
            g.drawRect(-gap / 2, top - hs.y, tw + gap, tall);
            g.endFill();
        }
        this._ioTabs.graphics.clear();
        this._ioTabs.graphics.lineStyle(1, 10066329, 0.8);
        let dividerX: int = (left + this._ioTabGlobal.width + gap / 2) | 0;
        this._ioTabs.graphics.moveTo(dividerX, this._ioTabGlobal.parent.y + 3);
        this._ioTabs.graphics.lineTo(dividerX, this._ioTabGlobal.parent.y + this._ioTabGlobal.height - 3);
        this.ioChat2PlaceChip();
    }

    /**
     * Inferno-only (QoL #477): whether the player appears offline (Who's Online's button) and how many players are
     * online now, from BYMChat (every minute) and Who's Online. The chip and the folded bar's count follow.
     */
    public ioChat2Presence(param1: boolean, param2: int): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (param1 == this._ioChat2Hidden && param2 == this._ioChat2Online) {
            return;
        }
        this._ioChat2Hidden = param1;
        this._ioChat2Online = param2;
        this.ioChat2Redraw();
    }

    /** The bar drawn again with the presence as it is now. */
    private ioChat2Redraw(): void {
        if (!GLOBAL.INFERNO_ONLY || !this._ioChat2TabArgs) {
            return;
        }
        let a: any[] = this._ioChat2TabArgs;
        this.ioSetTabs(as3.str(a[0]), a[1] | 0, a[2] | 0, a[3] | 0, a[4] | 0);
    }

    /** QoL #477: Who's Online? on the bar, or "12 online" while the chat is folded (once the count is known). */
    private ioChat2WhoLabel(param1: Sprite): void {
        let t: TextField = null;
        for (let k: int = 0; k < param1.numChildren && !t; k++) {
            t = as3.as(param1.getChildAt(k), TextField);
        }
        if (!t) {
            return;
        }
        let want: string = !this._open && this._ioChat2Online >= 0 ? KEYS.Get("io_chat2_online_n", { "v1": this._ioChat2Online }) : KEYS.Get("io_tr_who_title");
        if (t.text != want) {
            t.text = want;
        }
        let draw: any = (param1 as any).ioDraw;
        if (draw != null) {
            draw(false);
        }
    }

    /**
     * QoL #477: "Offline" after the tabs while the player appears offline (a click opens Who's Online, where its button
     * turns it off). Kept clear of the bar's arrows and on/off button; with no room there, the Who's Online dot (hollow
     * grey) says it alone.
     */
    private ioChat2PlaceChip(): void {
        let want: boolean = this._ioChat2Hidden && this._ioTabAlliance != null;
        if (want && !this._ioChat2Chip) {
            let chip: Sprite = new Sprite();
            chip.name = "ioChat2OfflineChip";
            chip.buttonMode = true;
            chip.mouseChildren = false;
            let t: TextField = new TextField();
            t.name = "ioChat2OfflineChipText";
            t.defaultTextFormat = new TextFormat("Verdana", 9, 0xE8E0D8, true);
            t.autoSize = TextFieldAutoSize.LEFT;
            t.selectable = false;
            t.mouseEnabled = false;
            t.text = KEYS.Get("io_chat2_offline_chip");
            t.x = 13;
            t.y = 0;
            chip.addChild(t);
            let w: number = Math.ceil(t.width) + 17;
            let h: number = Math.max(14, Math.ceil(t.height));
            chip.graphics.lineStyle(1, 0x9A9A9A, 1);
            chip.graphics.beginFill(0x3A3A3A, 0.95);
            chip.graphics.drawRoundRect(0, 0, w, h, h, h);
            chip.graphics.endFill();
            chip.graphics.lineStyle(1.5, 0xB8B8B8, 1);
            chip.graphics.beginFill(0, 0);
            chip.graphics.drawCircle(7, h / 2, 2.5);
            chip.graphics.endFill();
            chip.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                IoWhosOnline.Show();
            });
            this._ioChat2Chip = chip;
        }
        if (!this._ioChat2Chip) {
            return;
        }
        let place: boolean = want;
        if (want) {
            let tab: DisplayObject = this._ioTabAlliance.parent;
            let x: number = tab.x + this._ioTabAlliance.width + 10;
            // (left of whatever is next on the bar: the arrows and the on/off button)
            let limit: number = this.background.header ? this.background.header.x + this.background.header.width - 4 : x + this._ioChat2Chip.width;
            for (let o of [this.background.arrowUp, this.background.arrowDown, this.background.mcToggle]) {
                let d: DisplayObject = as3.as(o, DisplayObject);
                if (d && d.visible && d.parent) {
                    let r: any = d.getBounds(this.background);
                    if (r.width > 0 && r.x > tab.x) {
                        limit = Math.min(limit, r.x - 6);
                    }
                }
            }
            place = x + this._ioChat2Chip.width <= limit;
            this._ioChat2Chip.x = Math.round(x);
            this._ioChat2Chip.y = Math.round(tab.y + (this._ioTabAlliance.height - this._ioChat2Chip.height) / 2);
        }
        if (place) {
            if (this._ioChat2Chip.parent != this.background) {
                this.background.addChild(this._ioChat2Chip);
            }
        } else if (this._ioChat2Chip.parent) {
            this._ioChat2Chip.parent.removeChild(this._ioChat2Chip);
        }
    }

    private ioTabText(param1: TextField, param2: string, param3: int, param4: boolean, param5: int = 0): void {
        let count: string = param3 > 0 ? " <font color=\"#FF6A3D\">(" + (param3 < 100 ? String(param3) : "99+") + ")</font>" : "";
        if (param5 > 0) {
            // lines that mention the player, among those not seen yet
            count += " <font color=\"#FFD24A\">@" + (param5 > 1 ? String(Math.min(param5, 99)) : "") + "</font>";
        }
        param1.htmlText = "<font color=\"" + (param4 ? "#FFD24A" : "#CCCCCC") + "\">" + param2 + "</font>" + count;
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
        this.background.mcToggle.gotoAndStop(this._enabled ? "on" + this._skinTag : "close" + this._skinTag);
        this.background.arrowUp.gotoAndStop("on" + this._skinTag);
        this.background.arrowDown.gotoAndStop("on" + this._skinTag);
    }

    public override update(): void {
        super.update();
        this.ResizeWindow();
        this.ResizeMessages();
        if (!TUTORIAL.hasFinished) {
            this.background.arrowUp.visible = TUTORIAL.hasFinished;
            this.background.mcToggle.visible = TUTORIAL.hasFinished;
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            this.background.arrowUp.visible = TUTORIAL.hasFinished;
            this.background.mcToggle.visible = TUTORIAL.hasFinished;
        }
        this.Skin();
        this.UpdateChatStatus();
    }

    public UpdateChatStatus(): void {
        this.background.mcToggle.gotoAndStop(this._enabled ? "close" + this._skinTag : "on" + this._skinTag);
        if (Chat._bymChat != null && Chat._bymChat.isLoggingOut) {
            this.background.mcToggle.gotoAndStop("wait" + this._skinTag);
        }
    }

    public override clearChat(): void {
        super.clearChat();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioSetLines([]);
            return;
        }
        this._chatHistory = [];
    }

    public override clearInputText(): void {
        super.clearInputText();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioInputLayout();
        }
    }

    public override get background(): MovieClip {
        return as3.cast(this._displayAssets.frame, MovieClip);
    }

    public override get input(): TextField {
        return as3.cast(this._displayAssets.input._input, TextField);
    }

    public override get output(): TextField {
        return as3.cast(this.background._output, TextField);
    }

    public get inputbar(): MovieClip {
        return as3.cast(this._displayAssets.input, MovieClip);
    }

    public OnMsgMouseOver(param1: MouseEvent): void {
        let _loc2_: ChatBox_msg_CLIP = null;
        if (param1.currentTarget && param1.currentTarget.msgData && !param1.currentTarget.isOwnMessage) {
            if (param1.currentTarget.msgData.userid) {
                _loc2_ = as3.as(param1.currentTarget, ChatBox_msg_CLIP);
                if (_loc2_.msgData.msgtype == "IgnoreList") {
                    if (Chat._bymChat.userIsIgnored(as3.str(_loc2_.msgData.userid))) {
                        _loc2_.ignoreBtn.gotoAndStop(2);
                        _loc2_.ignoreBtn.visible = true;
                    }
                } else if (!Chat._bymChat.userIsIgnored(as3.str(_loc2_.msgData.userid))) {
                    _loc2_.ignoreBtn.gotoAndStop(1);
                    _loc2_.ignoreBtn.visible = true;
                }
            }
        }
    }

    public OnMsgMouseOut(param1: MouseEvent): void {
        let _loc2_: ChatBox_msg_CLIP = as3.as(param1.currentTarget, ChatBox_msg_CLIP);
        _loc2_.ignoreBtn.visible = false;
    }

    public OnMsgIgnoreMouseDown(param1: MouseEvent): void {
        if (Boolean(param1.currentTarget.parent) && Boolean(param1.currentTarget.parent.msgData)) {
            if (param1.currentTarget.parent.msgData.msgtype == "IgnoreList") {
                Chat._bymChat.unignoreUser(as3.str(param1.currentTarget.parent.msgData.userid));
            } else {
                Chat._bymChat.ignoreUser(as3.str(param1.currentTarget.parent.msgData.userid), as3.str(param1.currentTarget.parent.msgData.username));
            }
        }
    }

    public OnMsgIgnoreRollOver(param1: MouseEvent): void {
        let _loc2_: string = param1.currentTarget.parent.msgData.msgtype == "IgnoreList" ? KEYS.Get("io_t3m_ch_click_unignore") : KEYS.Get("io_t3m_ch_click_ignore");
        let _loc3_: number = Number(param1.currentTarget.y + param1.currentTarget.height / 2);
        ChatBox.PopupShow((param1.currentTarget.x - 10) | 0, _loc3_ | 0, _loc2_, as3.as(param1.currentTarget.parent, MovieClip));
    }

    public OnMsgIgnoreRollOut(param1: MouseEvent): void {
        ChatBox.PopupHide();
    }

    /** Inferno-only: a player's name opens an in-game message to them (BYMChat.ioMessagePlayer). */
    public OnMsgNameMouseDown(param1: MouseEvent): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        let nameClip: any = param1.currentTarget;
        let data: any = nameClip.parent ? nameClip.parent.msgData : null;
        if (!data || !data.userid) {
            return;
        }
        if (Chat._bymChat != null) {
            Chat._bymChat.ioNameClicked(String(data.userid), String(data.username), param1.stageX, param1.stageY, data);
        }
    }

    public OnMsgNameRollOver(param1: MouseEvent): void {
    }

    public OnMsgNameRollOut(param1: MouseEvent): void {
    }

    private OnChatDisableClick(param1: MouseEvent = null): void {
        if (this._animating) {
            return;
        }
        if (param1 && param1.currentTarget == this.background.mcToggle && TUTORIAL.hasFinished) {
            this._enabled = !this._enabled;
        }
        if (TUTORIAL.hasFinished) {
            this.EnableInput(this._enabled);
            if (Chat._bymChat != null && !Chat._bymChat.isLoggingOut) {
                if (!this._enabled && Chat._bymChat.IsJoined) {
                    Chat._bymChat.disableChat();
                    LOGGER.Stat([68, "hide"]);
                } else if (Chat.flagsShouldChatExist()) {
                    if (!Chat._bymChat.IsConnected) {
                        Chat.connectAndLogin();
                        LOGGER.Stat([68, "unhide"]);
                    }
                }
            }
            this.UpdateChatStatus();
            this.toggleHide(param1);
        }
    }

    public EnableInput(param1: boolean): void {
        if (param1 && GLOBAL.INFERNO_ONLY && this.input.visible) {
            return;
        }
        if (param1) {
            this.input.text = "";
            this.input.visible = true;
        } else {
            this.input.text = "";
            this.input.visible = false;
        }
    }

    public ClearInputText(): void {
        this.input.text = "";
    }

    public get chatEnabled(): boolean {
        return this._enabled;
    }

    public inputHasFocus(): boolean {
        return this.stage != null && this.stage.focus == this.input;
    }

    public disableChatBoxForAB(): void {
        this._sendBtn.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.handleSendClick));
        this.input.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onInputFocus));
        this._sendBtn.enabled = false;
        this._sendBtn.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.handleSendClick));
        this.EnableInput(false);
    }
}
