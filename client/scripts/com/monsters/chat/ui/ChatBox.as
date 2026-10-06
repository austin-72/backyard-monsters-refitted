package com.monsters.chat.ui {
    import com.monsters.chat.Chat;
    import com.monsters.chat.BYMChat;
    import com.monsters.display.ScrollSet;
    import com.monsters.maproom3.MapRoom3;
    import com.monsters.maproom_advanced.IoMapShare;
    import flash.display.*;
    import flash.events.*;
    import flash.filters.GlowFilter;
    import flash.text.*;
    import flash.utils.Timer;
    import gs.TweenLite;
    import gs.easing.*;

    public class ChatBox extends AbstractChatBox implements IChatDisplay {

        private static var _popupignore:bubblepopupRight;

        private static var _popupignoredo:DisplayObject;

        private var _shell:Sprite;

        private var _maximized:Boolean = false;

        private var _open:Boolean = true;

        public var _animating:Boolean = false;

        private var _useAlerts:Boolean = false;

        private var _mask:Sprite;

        private var _thumb:Sprite;

        private var _display:Sprite;

        private var _panel:Sprite;

        private var _thumbWidth:int = 15;

        private var _thumbHeight:int = 15;

        private var _scrollbar:ScrollSet;

        private var _sendBtn:Button;

        public var _headerBar:MovieClip;

        public var _alertsCounter:int;

        public var _chatWidth:int = 0;

        private var _chatHistory:Array;

        private var _chatMessages:MovieClip;

        private var _skinnedElements:Array;

        private var _skinTag:int = 1;

        private var fmt_nameOffset:TextFormat;

        private var _enabled:Boolean = true;

        private var _runOnce:Number = 0;

        private var _originProps:Object;

        private var _maxProps:Object;

        private var _openProps:Object;

        private var _closeProps:Object;

        private var _chatWidthDefault:Object;

        private var _chatWidthShort:Object;

        public function ChatBox() {
            this._skinnedElements = [];
            this._originProps = {
                    "screenHeight": 240,
                    "screenWidth": 380
                };
            this._maxProps = {
                    "screenHeight": 470,
                    "maskHeight": 470 - 12,
                    "y": -(470 + 30),
                    "scrollerY": -470,
                    "scrollHeight": 470 - 16,
                    "inputY": -12
                };
            this._openProps = {
                    "screenHeight": 240,
                    "maskHeight": 136,
                    "y": -178,
                    "scrollerY": -148,
                    "scrollHeight": 120,
                    "inputY": -12
                };
            this._closeProps = {
                    "screenHeight": 114,
                    "maskHeight": 105,
                    "y": 0,
                    "scrollerY": 30,
                    "scrollHeight": 105,
                    "inputY": 27
                };
            this._chatWidthDefault = {
                    "sizeW": 380,
                    "headerW": 380,
                    "headerX": -5,
                    "titleTxtX": 70,
                    "alertX": 220,
                    "arrowUpX": 343,
                    "arrowUpY": 16,
                    "arrowDownX": 325,
                    "arrowDownY": 13,
                    "borderW": 380,
                    "mcMaskW": 348,
                    "tOutputW": 330,
                    "mcScreenW": 350,
                    "inputWoodBgW": 380,
                    "inputTxtBgW": 310,
                    "inputTxtW": 310,
                    "sendBtnX": 331,
                    "scrollerX": 347,
                    "ignoreBtnX": 315
                };
            this._chatWidthShort = {
                    "sizeW": 390,
                    "headerW": 390,
                    "headerX": -5,
                    "titleTxtX": 80,
                    "alertX": 230,
                    "arrowUpX": 343,
                    "arrowUpY": 16,
                    "arrowDownX": 325,
                    "arrowDownY": 13,
                    "borderW": 380,
                    "mcMaskW": 350,
                    "tOutputW": 320,
                    "mcScreenW": 360,
                    "inputWoodBgW": 390,
                    "inputTxtBgW": 310,
                    "inputTxtW": 305,
                    "sendBtnX": 333,
                    "scrollerX": 350,
                    "ignoreBtnX": 315
                };
            super(new ChatBox_CLIP());
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
            this._chatMessages.x = this.background.mcScreen.x;
            this._chatMessages.y = this.background.mcScreen.y;
            this._shell.addChild(this._chatMessages);
            this._shell.mask = this.background.mcMask;
            this._scrollbar = new ScrollSet();
            this.background.addChild(this._scrollbar);
            this._scrollbar.Init(this._shell, this.background.mcMask, 0, 0, 35);
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
            this._sendBtn.addEventListener(MouseEvent.MOUSE_DOWN, this.handleSendClick);
            this.inputbar.addChild(this._sendBtn);
            this.input.addEventListener(MouseEvent.MOUSE_UP, this.onInputFocus);
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

        public static function PopupShow(param1:int, param2:int, param3:String, param4:MovieClip):void {
            PopupHide();
            _popupignore = new bubblepopupRight();
            _popupignore.Setup(param1, param2, param3);
            _popupignore.Nudge("left");
            _popupignoredo = param4.addChild(_popupignore);
        }

        public static function PopupUpdate(param1:String):void {
            if (_popupignore) {
                _popupignore.Update(param1);
            }
        }

        public static function PopupHide():void {
            if (Boolean(_popupignore) && Boolean(_popupignore.parent)) {
                _popupignore.parent.removeChild(_popupignore);
                _popupignore = null;
            }
        }

        private function handleSendClick(param1:MouseEvent):void {
            if (Chat._bymChat == null) {
                return;
            }
            Chat._bymChat.SendMessage();
            this.forceFocus();
        }

        public function get Scrollbar():* {
            return this._scrollbar;
        }

        private function onInputFocus(param1:Event):void {
            if (stage.displayState == StageDisplayState.FULL_SCREEN) {
                GLOBAL.goFullScreen(null);
            }
            this.forceFocus();
        }

        private function forceFocus():void {
            stage.focus = this.input;
            MAP.Release(null);
        }

        override public function init():void {
            this.background.arrowUp.addEventListener(MouseEvent.CLICK, this.toggleHide);
            this.background.arrowUp.addEventListener(MouseEvent.MOUSE_OVER, onHideOver);
            this.background.arrowUp.addEventListener(MouseEvent.MOUSE_OUT, onHideOut);
            this.background.arrowUp.mouseChildren = false;
            this.background.arrowUp.buttonMode = true;
            this.background.arrowUp.useHandCursor = true;
            this.background.arrowUp.gotoAndStop("on" + this._skinTag);
            this.background.arrowDown.mouseChildren = false;
            this.background.arrowDown.buttonMode = true;
            this.background.arrowDown.useHandCursor = true;
            this.background.arrowDown.gotoAndStop("on" + this._skinTag);
            this.background.arrowDown.enabled = false;
            this.background.arrowDown.visible = false;
            this.background.mcToggle.addEventListener(MouseEvent.CLICK, this.OnChatDisableClick);
            this.background.mcToggle.mouseChildren = false;
            this.background.mcToggle.buttonMode = true;
            this.background.mcToggle.useHandCursor = true;
            this.background.mcToggle.gotoAndStop(this._enabled ? "close" + this._skinTag : "on" + this._skinTag);
            this.input.addEventListener(FocusEvent.FOCUS_IN, this.onInputFocus);
            this.input.maxChars = 100;
            this.ClearAlert();
            this.UpdateAlert();
            this.background.alert.visible = false;
            if (GLOBAL.StatGet("chatmin") == 1) {
                this._enabled = false;
                this._maximized = false;
                this._open = false;
            }
            else {
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
                this.input.maxChars = IO_MAX_CHARS; // (init runs again on every yard: it set 100 above)
            }
        }

        private function showHelp(...rest):void {
        }

        private function hideHelp(...rest):void {
        }

        private function toggleHide(param1:MouseEvent = null):void {
            var _loc4_:Object = null;
            var _loc2_:Boolean = false;
            var _loc3_:Boolean = false;
            var chatOpen:Boolean = this._open;
            if (param1 != null) {
                if (param1.currentTarget == this.background.arrowUp) {
                    if (this._maximized) {
                        _loc2_ = false;
                    }
                    else {
                        _loc2_ = true;
                    }
                }
                if (param1.currentTarget == this.background.mcToggle) {
                    if (this._enabled) {
                        _loc2_ = true;
                        this._maximized = false;
                    }
                    else {
                        _loc2_ = false;
                        this._maximized = false;
                    }
                }
            }
            if (this._animating) {
                return;
            }
            var _loc5_:Number = 0.5;
            if (param1 == null) {
                if (chatOpen) {
                    _loc4_ = this._openProps;
                }
                else {
                    _loc4_ = this._closeProps;
                }
                this._maximized = false;
                this.background.arrowUp.gotoAndStop("on" + this._skinTag);
                this.background.arrowDown.gotoAndStop("on" + this._skinTag);
                this.background.arrowUp.buttonMode = true;
                this.background.arrowDown.buttonMode = false;
            }
            else if (this._maximized && chatOpen) {
                if (!(!_loc2_ && !_loc3_)) {
                    return;
                }
                _loc4_ = this._openProps;
                this._maximized = false;
                this.background.arrowUp.gotoAndStop("on" + this._skinTag);
                this.background.arrowDown.gotoAndStop("on" + this._skinTag);
                this.background.arrowUp.buttonMode = true;
                this.background.arrowDown.buttonMode = true;
            }
            else if (chatOpen && !_loc3_) {
                this.ClearAlert();
                if (!_loc2_) {
                    this._open = false;
                    if (Chat._bymChat != null)
                        Chat._bymChat._open = false;
                    _loc4_ = this._closeProps;
                    this._maximized = false;
                    this.background.arrowUp.gotoAndStop("on" + this._skinTag);
                    this.background.arrowDown.gotoAndStop("off" + this._skinTag);
                    this.background.arrowUp.buttonMode = true;
                    this.background.arrowDown.buttonMode = false;
                    GLOBAL.StatSet("chatmin", 1);
                }
                else if (_loc2_) {
                    _loc4_ = this._maxProps;
                    this._maximized = true;
                    this.background.arrowUp.gotoAndStop("on" + this._skinTag);
                    this.background.arrowDown.gotoAndStop("on" + this._skinTag);
                    this.background.arrowUp.buttonMode = true;
                    this.background.arrowDown.buttonMode = false;
                    GLOBAL.StatSet("chatmin", 0);
                }
                else if (_loc3_) {
                    return;
                }
            }
            else if (!chatOpen) {
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
            TweenLite.to(this.background, _loc5_, {
                        "y": _loc4_.y,
                        "onUpdate": this.toggleOnUpdate,
                        "onComplete": this.toggleVisibleB
                    });
            TweenLite.to(this.background.mcScreen, _loc5_, {"height": _loc4_.screenHeight});
            TweenLite.to(this.background.mcMask, _loc5_, {"height": _loc4_.maskHeight});
            TweenLite.to(this._scrollbar, _loc5_, {"y": _loc4_.scrollerY});
            if (this._open) {
                TweenLite.to(this.inputbar, _loc5_, {
                            "y": _loc4_.inputY,
                            "autoAlpha": 1,
                            "ease": Expo.easeOut
                        });
                TweenLite.to(this.background.alert, _loc5_, {
                            "autoAlpha": 0,
                            "ease": Expo.easeOut
                        });
            }
            else {
                TweenLite.to(this.inputbar, _loc5_, {
                            "y": _loc4_.inputY,
                            "autoAlpha": 0,
                            "ease": Quad.easeIn
                        });
            }
            this._animating = true;
            var _loc6_:int = _loc4_ == this._closeProps ? 0 : 1;
            if (TUTORIAL.hasFinished) {
                if (this._maximized) {
                    TweenLite.to(this.background.arrowUp, _loc5_, {
                                "rotation": 180,
                                "autoAlpha": _loc6_,
                                "y": this._chatWidthDefault.arrowDownY,
                                "ease": Expo.easeOut
                            });
                }
                else {
                    TweenLite.to(this.background.arrowUp, _loc5_, {
                                "rotation": 0,
                                "autoAlpha": _loc6_,
                                "y": this._chatWidthDefault.arrowUpY,
                                "ease": Expo.easeOut
                            });
                }
            }
        }

        private function toggleOnUpdate():void {
            if (MapRoom3.mapRoom3Window) {
                MapRoom3.mapRoom3WindowHUD.PositionLeftMenuButtonsBar();
            }
        }

        private function toggleVisibleB():void {
            this._animating = false;
            var _loc1_:Object = this._maximized ? this._maxProps : this._openProps;
            this._scrollbar.Update();
            this._scrollbar.visible = this._shell.height > this.background.mcMask.height;
            if (!this._open) {
                if (Chat._bymChat != null)
                    Chat._bymChat.toggleMinimizedStat(true);
                this._scrollbar.visible = false;
            }
            else if (GLOBAL.StatGet("chatmin") != 0) {
                if (Chat._bymChat != null)
                    Chat._bymChat.toggleMinimizedStat(false);
            }
            this.update();
            if (GLOBAL.INFERNO_ONLY) {
                this.ioApplyExtra();
                this.ioScrollToBottom(); // (opened: the newest lines)
                this.ioTickTimes();
            }
            else {
                this._scrollbar.ScrollTo(1, false);
            }
        }

        /**
         * Inferno-only: the newest line in view (the user's, 29 September): when a line arrives or is sent, when the
         * chat is opened or its tab switched, and at the start, when the history comes in. At once, not eased.
         */
        /** Inferno-only: opens the chat if it is folded away (the quest book's "Go there"). */
        public function ioOpen():void {
            if (!this._open && !this._animating) {
                this.background.arrowUp.dispatchEvent(new MouseEvent(MouseEvent.CLICK));
            }
        }

        public function ioScrollToBottom():void {
            if (!this._scrollbar || !this.background || !this.background.mcMask) {
                return;
            }
            this._scrollbar.Update();
            this._scrollbar.ScrollTo(this._shell.height > this.background.mcMask.height ? 1 : 0, true);
        }

        public function ResizeWindow():void {
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
                this.input.width = this._chatWidthDefault.inputTxtW;
                this.inputbar.inputTxtBG.width = this._chatWidthDefault.inputTxtBgW;
                this._sendBtn.x = this._chatWidthDefault.sendBtnX;
                this._scrollbar.x = this._chatWidthDefault.scrollerX;
                this._chatWidth = this._chatWidthDefault.sizeW;
            }
        }

        public function ResizeMessages():void {
            var _loc1_:Number = 0;
            var _loc2_:Number = 0;
            if (GLOBAL.INFERNO_ONLY) {
                // (the lines are laid out as they come, ioAppend: nothing to rebuild here)
                if (this._chatMessages) {
                    this._chatMessages.x = this.background.mcMask.x;
                    this._chatMessages.y = this.background.mcMask.y;
                }
                if (this._scrollbar.parent != this) {
                    addChild(this._scrollbar);
                }
                this.ioAfterLayout(this.ioAtBottom());
                return;
            }
            if (Boolean(this._chatMessages) && Boolean(this._chatMessages.parent)) {
                this._chatMessages.parent.removeChild(this._chatMessages);
                this._chatMessages = null;
            }
            this._chatMessages = new MovieClip();
            this._shell.addChild(this._chatMessages);
            this._chatMessages.x = this.background.mcMask.x;
            this._chatMessages.y = this.background.mcMask.y;
            var _loc3_:Number = 1;
            var _loc4_:int = 0;
            while (_loc4_ < this._chatHistory.length) {
                if (this._chatHistory[_loc4_].isOwnMessage) {
                    this._chatHistory[_loc4_].bg.gotoAndStop(3);
                }
                else {
                    this._chatHistory[_loc4_].bg.gotoAndStop(_loc4_ % 2 + 1);
                }
                this._chatHistory[_loc4_].y = _loc1_;
                this._chatHistory[_loc4_].scaleY = _loc3_;
                this._chatHistory[_loc4_].txt.width = this._chatWidthDefault.tOutputW;
                this._chatHistory[_loc4_].ignoreBtn.x = this._chatWidthDefault.ignoreBtnX;
                if (GLOBAL.INFERNO_ONLY) {
                    IoMapShare.RelayoutChat(this._chatHistory[_loc4_]); // shared places' pills, at the new width
                }
                this._chatMessages.addChild(this._chatHistory[_loc4_]);
                _loc1_ += this._chatHistory[_loc4_].height;
                _loc4_++;
            }
            if (!this._scrollbar.visible && Chat._bymChat != null && Chat._bymChat._open) {
                this._scrollbar.visible = this._shell.height > this.background.mcMask.height;
            }
            addChild(this._scrollbar);
            this._scrollbar.Update();
            this._scrollbar.Resync();
            if (GLOBAL.INFERNO_ONLY) {
                this.ioScrollToBottom();
            }
        }

        public function UpdateAlert(param1:int = 0):void {
            var _loc2_:String = null;
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
                TweenLite.to(this.background.alert, 0.5, {
                            "autoAlpha": 1,
                            "ease": Circ.easeIn
                        });
            }
            else if (Chat._bymChat._open && this.background.alert.alpha != 0) {
                TweenLite.to(this.background.alert, 0.5, {
                            "autoAlpha": 0,
                            "ease": Expo.easeOut
                        });
            }
        }

        public function ClearAlert():void {
            if (this._open) {
                this._alertsCounter = 0;
                this.UpdateAlert();
            }
        }

        override public function push(param1:String, param2:String = null, param3:String = null, param4:String = null, param5:Boolean = false):void {
            var _loc9_:ChatBox_msg_name_CLIP = null;
            var _loc6_:String;
            if ((_loc6_ = param2) != null) {
                if ((_loc6_ = _loc6_.substr(_loc6_.indexOf("["))) != null) {
                    _loc6_ = _loc6_.substring(0, _loc6_.indexOf("<") - 1);
                }
            }
            var _loc7_:Object = {
                    "msg": param1,
                    "username": _loc6_,
                    "userid": param3,
                    "msgtype": param4
                };
            var _loc8_:ChatBox_msg_CLIP;
            // Inferno-only: places shared from the map room ([map:x,y]) show as clickable coordinates.
            var ioPlaces:Object = GLOBAL.INFERNO_ONLY ? IoMapShare.RenderChat(param1) : null;
            (_loc8_ = new ChatBox_msg_CLIP()).txt.htmlText = ioPlaces ? String(ioPlaces.html) : param1;
            _loc8_.txt.autoSize = TextFieldAutoSize.LEFT;
            _loc8_.bg.height = _loc8_.txt.height;
            if (ioPlaces) {
                IoMapShare.DecorateChat(_loc8_, _loc8_.txt, ioPlaces.links as Array);
            }
            _loc8_.addEventListener(MouseEvent.ROLL_OVER, this.OnMsgMouseOver);
            _loc8_.addEventListener(MouseEvent.ROLL_OUT, this.OnMsgMouseOut);
            _loc8_.ignoreBtn.visible = false;
            _loc8_.ignoreBtn.buttonMode = true;
            _loc8_.msgData = _loc7_;
            _loc8_.isOwnMessage = param3 == LOGIN._playerID.toString();
            if (param2 != null) {
                _loc8_.ignoreBtn.addEventListener(MouseEvent.MOUSE_DOWN, this.OnMsgIgnoreMouseDown);
                _loc8_.ignoreBtn.addEventListener(MouseEvent.ROLL_OVER, this.OnMsgIgnoreRollOver);
                _loc8_.ignoreBtn.addEventListener(MouseEvent.ROLL_OUT, this.OnMsgIgnoreRollOut);
                (_loc9_ = new ChatBox_msg_name_CLIP()).label.htmlText = param2;
                _loc9_.label.autoSize = TextFieldAutoSize.LEFT;
                _loc9_.bg.width = _loc9_.label.textWidth;
                _loc9_.label.visible = false;
                _loc9_.x = 0;
                _loc9_.y = 0;
                _loc9_.addEventListener(MouseEvent.MOUSE_DOWN, this.OnMsgNameMouseDown);
                _loc9_.addEventListener(MouseEvent.ROLL_OVER, this.OnMsgNameRollOver);
                _loc9_.addEventListener(MouseEvent.ROLL_OUT, this.OnMsgNameRollOut);
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
                while (_chats.length > 40) {
                    _chats.shift();
                }
            }
            this.ResizeMessages();
        }

        // ---- Inferno-only: the lines, drawn as they come (BYMChat keeps the transcripts)

        /** Each kind of line's background and text colour: [background, text]; players' lines use the clip's. */
        private static const IO_STYLE:Object = {
                "mention": [0xFFE3A0, null],
                "announce": [0xF4C14B, "#3A2200"],
                "casino": [0xE7CCFA, "#4A1470"],
                "milestone": [0xC4E6FA, "#0D3D5C"],
                "event": [0xD4EDB4, "#2C4A0C"],
                "system": [0xEDE7DA, "#5A5246"],
                "ignorelist": [0xF1E9DA, "#333333"],
                "shout_joined": [0xCDEFC4, "#1F5A17"],
                "shout_left": [0xE1E1E1, "#555555"],
                "shout_kicked": [0xF6C9C2, "#7A1A10"],
                "shout_promoted": [0xCFDFFF, "#1B3F7A"],
                "shout_created": [0xFFE0B5, "#7A4A00"],
                "shout_relationship": [0xE5D4F4, "#4E2A6E"],
                "shout_powerup_activated": [0xFFF0A8, "#6A5200"],
                "shout_powerup_purchase": [0xD5F1EC, "#145A50"],
                "shout_pinned": [0xFBE2C8, "#7A3300"],
                "shout_officer": [0xD9E4F7, "#24406E"]
            };

        /** The text's width: the time ("2m") takes the last 30 pixels of the line. */
        private static const IO_TEXT_W:int = 300;

        private static const IO_TIME_W:int = 30;

        private static const IO_MAX_LINES:int = 60;

        private var _ioY:Number = 0;

        private var _ioParity:int = 0;

        private var _ioClock:Timer = null;

        private var _ioInited:Boolean = false;

        private function ioInit():void {
            if (this._ioInited) {
                return;
            }
            this._ioInited = true;
            this._chatMessages.x = this.background.mcMask.x;
            this._chatMessages.y = this.background.mcMask.y;
            addEventListener(MouseEvent.MOUSE_WHEEL, this.ioWheel);
            this._ioClock = new Timer(5000);
            this._ioClock.addEventListener(TimerEvent.TIMER, function(e:TimerEvent):void {
                    ioTickTimes();
                });
            this._ioClock.start();
            this.ioInputInit();
        }

        /** Adds a line at the bottom. The view stays where the player scrolled to, unless it was at the newest. */
        public function ioAppend(param1:Object, param2:Boolean = false):void {
            var stick:Boolean = param2 || this.ioAtBottom();
            var line:ChatBox_msg_CLIP = this.ioMakeLine(param1);
            line.y = this._ioY;
            this._chatMessages.addChild(line);
            this._chatHistory.push(line);
            this._ioY += line.ioH;
            var shifted:Number = 0;
            while (this._chatHistory.length > IO_MAX_LINES) {
                var gone:ChatBox_msg_CLIP = this._chatHistory.shift() as ChatBox_msg_CLIP;
                if (gone.parent) {
                    gone.parent.removeChild(gone);
                }
                shifted += gone.ioH;
            }
            if (shifted > 0) {
                for each (var kept:ChatBox_msg_CLIP in this._chatHistory) {
                    kept.y -= shifted;
                }
                this._ioY -= shifted;
                if (!stick) {
                    this._shell.y += shifted; // (the lines being read stay put)
                }
            }
            if (!param2) {
                this.ioAfterLayout(stick || param1.kind == "own");
            }
        }

        /** The transcript of the tab now showing, all at once. */
        public function ioSetLines(param1:Array):void {
            if (!this._chatMessages) {
                return;
            }
            while (this._chatMessages.numChildren > 0) {
                this._chatMessages.removeChildAt(0);
            }
            this._chatHistory = [];
            this._ioY = 0;
            this._ioParity = 0;
            this._chatMessages.x = this.background.mcMask.x;
            this._chatMessages.y = this.background.mcMask.y;
            var from:int = Math.max(0, param1.length - IO_MAX_LINES);
            for (var i:int = from; i < param1.length; i++) {
                this.ioAppend(param1[i], true);
            }
            this.ioAfterLayout(true);
        }

        private function ioMakeLine(param1:Object):ChatBox_msg_CLIP {
            var line:ChatBox_msg_CLIP = new ChatBox_msg_CLIP();
            var kind:String = String(param1.kind);
            var style:Array = IO_STYLE[kind] as Array;
            var html:String = String(param1.html);
            if (style && style[1]) {
                html = "<font color=\"" + style[1] + "\">" + html + "</font>";
            }
            var places:Object = IoMapShare.RenderChat(html);
            line.txt.width = IO_TEXT_W;
            line.txt.htmlText = places ? String(places.html) : html;
            line.txt.autoSize = TextFieldAutoSize.LEFT;
            var h:Number = Math.ceil(line.txt.height);
            var fullW:Number = line.bg.width;
            line.bg.height = h;
            if (kind == "own") {
                line.bg.gotoAndStop(3);
            }
            else if (style) {
                line.bg.visible = false;
                var paint:Shape = new Shape();
                paint.graphics.beginFill(uint(style[0]), 1);
                paint.graphics.drawRect(line.bg.x, line.bg.y, fullW, h);
                paint.graphics.endFill();
                if (kind == "mention" || kind == "announce") {
                    paint.graphics.beginFill(kind == "mention" ? 0xE07A1F : 0xB8860B, 1);
                    paint.graphics.drawRect(line.bg.x, line.bg.y, 3, h);
                    paint.graphics.endFill();
                }
                line.addChildAt(paint, 0);
            }
            else {
                line.bg.gotoAndStop(this._ioParity % 2 + 1);
            }
            this._ioParity++;
            line.ignoreBtn.visible = false;
            line.ioH = h;
            line.ioTs = Number(param1.ts);
            line.isOwnMessage = kind == "own";
            line.msgData = {"msg": html, "username": param1.name, "userid": param1.user, "msgtype": kind == "ignorelist" ? "IgnoreList" : "Default", "lineId": param1.id, "channel": param1.channel, "role": param1.role};
            if (line.ioTs > 0) {
                var time:TextField = new TextField();
                var tf:TextFormat = new TextFormat(line.txt.defaultTextFormat.font, 10, 0x8A8070);
                tf.align = TextFormatAlign.RIGHT;
                time.defaultTextFormat = tf;
                time.selectable = false;
                time.mouseEnabled = false;
                time.width = IO_TIME_W;
                time.height = 16;
                time.x = line.txt.x + IO_TEXT_W;
                time.y = line.txt.y + 1;
                time.text = ioAgo(line.ioTs);
                line.addChild(time);
                line.ioTime = time;
            }
            if (param1.label && param1.user) {
                var hit:ChatBox_msg_name_CLIP = new ChatBox_msg_name_CLIP();
                hit.label.htmlText = String(param1.label);
                hit.label.autoSize = TextFieldAutoSize.LEFT;
                hit.bg.width = hit.label.textWidth;
                hit.label.visible = false;
                hit.x = 0;
                hit.y = 0;
                hit.buttonMode = true;
                hit.addEventListener(MouseEvent.MOUSE_DOWN, this.OnMsgNameMouseDown);
                line.addChild(hit);
            }
            if (places) {
                IoMapShare.DecorateChat(line, line.txt, places.links as Array);
            }
            return line;
        }

        /** "now", "33s", "2m", "4h", "3d": how long ago a line was said. */
        public static function ioAgo(param1:Number):String {
            var sec:int = Math.max(0, int((BYMChat.ioNow() - param1) / 1000));
            if (sec < 5) {
                return "now";
            }
            if (sec < 60) {
                return sec + "s";
            }
            if (sec < 3600) {
                return int(sec / 60) + "m";
            }
            if (sec < 86400) {
                return int(sec / 3600) + "h";
            }
            return int(sec / 86400) + "d";
        }

        /** The times move on (every 5 seconds, while the chat is open). */
        private function ioTickTimes():void {
            if (!this._open || !stage) {
                return;
            }
            for each (var line:ChatBox_msg_CLIP in this._chatHistory) {
                if (line.ioTime) {
                    var said:String = ioAgo(line.ioTs);
                    if (line.ioTime.text != said) {
                        line.ioTime.text = said;
                    }
                }
            }
        }

        private function ioAtBottom():Boolean {
            var range:Number = this._shell.height - this.background.mcMask.height;
            return range <= 2 || this._shell.y <= -range + 8;
        }

        private function ioAfterLayout(param1:Boolean):void {
            this._scrollbar.Update();
            var range:Number = this._shell.height - this.background.mcMask.height;
            if (!this._animating) {
                this._scrollbar.visible = this._open && range > 0;
            }
            if (param1 || range <= 0) {
                this.ioScrollToBottom();
            }
            else {
                this.ioScrollToY(this._shell.y);
            }
        }

        /**
         * The lines at a scroll position, the bar's thumb with them. (ScrollSet.ScrollTo snaps to the ends
         * when near them, which pulled a reader a few lines up back to the bottom.)
         */
        private function ioScrollToY(param1:Number):void {
            var range:Number = this._shell.height - this.background.mcMask.height;
            if (range <= 0) {
                this._shell.y = 0;
                return;
            }
            var y:Number = Math.round(Math.max(-range, Math.min(0, param1)));
            this._shell.y = y;
            var bar:MovieClip = this._scrollbar as MovieClip;
            if (bar && bar.mcScroller && bar.mcBG) {
                bar.mcScroller.y = Math.max(0, bar.mcBG.height - bar.mcScroller.height) * (-y / range);
            }
        }

        /** The mouse wheel scrolls the lines (not the map behind). */
        private function ioWheel(param1:MouseEvent):void {
            param1.stopPropagation();
            var range:Number = this._shell.height - this.background.mcMask.height;
            if (range <= 0 || !this._open) {
                return;
            }
            this.ioScrollToY(this._shell.y + (param1.delta > 0 ? 1 : -1) * 48);
        }

        // ---- Inferno-only: the box typed in: 200 characters, growing (up to six lines) so all of it shows

        private static const IO_MAX_CHARS:int = 200;

        private static const IO_COUNT_FROM:int = 150;

        /** 200 characters of narrow letters fit in five lines; six for wide ones and long words. */
        private static const IO_INPUT_LINES:int = 6;

        private var _ioBase:Object = null;

        private var _ioExtra:int = 0;

        private var _ioLineH:Number = 15;

        private var _ioCounter:TextField = null;

        private function ioInputInit():void {
            this.input.maxChars = IO_MAX_CHARS;
            this.input.multiline = false; // (Enter sends: it never starts a new line)
            this.input.wordWrap = true;
            this._ioBase = {
                    "wood": this.inputbar.inputWoodBg.height,
                    "txtBg": this.inputbar.inputTxtBG.height,
                    "input": this.input.height,
                    "send": this._sendBtn.y
                };
            var probe:TextField = new TextField();
            probe.defaultTextFormat = this.input.defaultTextFormat;
            probe.autoSize = TextFieldAutoSize.LEFT;
            probe.text = "Wg";
            if (probe.textHeight > 4) {
                this._ioLineH = Math.ceil(probe.textHeight);
            }
            this._ioCounter = new TextField();
            var tf:TextFormat = new TextFormat("Verdana", 10, 0xFFE6A0, true);
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
            this.input.addEventListener(Event.CHANGE, function(e:Event):void {
                    ioInputLayout();
                });
        }

        /** The box grows (upwards) with what is typed, and the count shows near the end of the 200. */
        public function ioInputLayout():void {
            if (!GLOBAL.INFERNO_ONLY || !this._ioBase) {
                return;
            }
            var len:int = this.input.text.length;
            this._ioCounter.visible = len >= IO_COUNT_FROM;
            if (this._ioCounter.visible) {
                this._ioCounter.textColor = len >= IO_MAX_CHARS ? 0xFF6A4A : 0xFFE6A0;
                this._ioCounter.text = len + "/" + IO_MAX_CHARS;
            }
            var lines:int = len > 0 ? Math.max(1, Math.min(IO_INPUT_LINES, Math.round(this.input.textHeight / this._ioLineH))) : 1;
            var extra:int = int((lines - 1) * this._ioLineH);
            if (extra != this._ioExtra) {
                this._ioExtra = extra;
                this.ioApplyExtra();
            }
        }

        private function ioApplyExtra():void {
            if (!GLOBAL.INFERNO_ONLY || !this._ioBase || this._animating) {
                return;
            }
            var extra:int = this._open ? this._ioExtra : 0;
            var props:Object = !this._open ? this._closeProps : (this._maximized ? this._maxProps : this._openProps);
            this.inputbar.y = props.inputY - extra;
            this.inputbar.inputWoodBg.height = this._ioBase.wood + extra;
            this.inputbar.inputTxtBG.height = this._ioBase.txtBg + extra;
            this.input.height = this._ioBase.input + extra;
            this._sendBtn.y = this._ioBase.send + extra;
            this.background.y = props.y - extra;
            this._scrollbar.y = props.scrollerY - extra;
        }

        /** Puts words back in the box (a line the server refused), the cursor at the end. */
        public function ioSetInput(param1:String):void {
            this.input.text = param1;
            this.input.setSelection(param1.length, param1.length);
            this.ioInputLayout();
        }

        // ---- Inferno-only: Global / Alliance tabs in the header (BYMChat keeps the transcripts)

        private var _ioTabs:Sprite = null;

        private var _ioTabGlobal:TextField = null;

        private var _ioTabAlliance:TextField = null;

        private function ioMakeTab(param1:String):TextField {
            var tab:TextField = new TextField();
            tab.selectable = false;
            tab.autoSize = TextFieldAutoSize.LEFT;
            // (the Quests panel's title font, 29 September: Groboldov, white, a black outline)
            tab.embedFonts = true;
            tab.defaultTextFormat = new TextFormat("Groboldov", 14, 0xFFFFFF, true);
            tab.filters = [new GlowFilter(0x000000, 1, 3, 3, 10, 1)];
            tab.text = param1;
            var holder:Sprite = new Sprite();
            holder.buttonMode = true;
            holder.mouseChildren = false;
            holder.name = param1;
            holder.addChild(tab);
            holder.addEventListener(MouseEvent.CLICK, this.ioTabClick);
            this._ioTabs.addChild(holder);
            return tab;
        }

        private function ioTabClick(param1:MouseEvent):void {
            if (Chat._bymChat != null) {
                SOUNDS.Play("click1");
                Chat._bymChat.ioSwitch((param1.currentTarget as Sprite).name == "global" ? BYMChat.IO_GLOBAL : BYMChat.IO_ALLIANCE);
            }
        }

        /** Tab labels with the unread counts, the showing tab highlighted. */
        public function ioSetTabs(param1:String, param2:int, param3:int, param4:int = 0, param5:int = 0):void {
            if (!GLOBAL.INFERNO_ONLY || !this.background) {
                return;
            }
            if (!this._ioTabs) {
                this._ioTabs = new Sprite();
                this._ioTabGlobal = this.ioMakeTab("global");
                this._ioTabAlliance = this.ioMakeTab("alliance");
            }
            if (this._ioTabs.parent != this.background) {
                this.background.addChild(this._ioTabs);
            }
            this.background.tTitle.visible = false;
            this.ioTabText(this._ioTabGlobal, "Global", param2, param1 == BYMChat.IO_GLOBAL, param4);
            this.ioTabText(this._ioTabAlliance, "Alliance", param3, param1 == BYMChat.IO_ALLIANCE, param5);
            // Centred where the title was, a divider between the two.
            var gap:int = 14;
            var total:Number = this._ioTabGlobal.width + gap + this._ioTabAlliance.width;
            var left:Number = this.background.tTitle.x + this.background.tTitle.width / 2 - total / 2;
            this._ioTabGlobal.parent.x = int(left);
            this._ioTabAlliance.parent.x = int(left + this._ioTabGlobal.width + gap);
            this._ioTabGlobal.parent.y = this._ioTabAlliance.parent.y = int(this.background.tTitle.y + (this.background.tTitle.height - this._ioTabGlobal.height) / 2);
            this._ioTabs.graphics.clear();
            this._ioTabs.graphics.lineStyle(1, 0x999999, 0.8);
            var dividerX:int = int(left + this._ioTabGlobal.width + gap / 2);
            this._ioTabs.graphics.moveTo(dividerX, this._ioTabGlobal.parent.y + 3);
            this._ioTabs.graphics.lineTo(dividerX, this._ioTabGlobal.parent.y + this._ioTabGlobal.height - 3);
        }

        private function ioTabText(param1:TextField, param2:String, param3:int, param4:Boolean, param5:int = 0):void {
            var count:String = param3 > 0 ? " <font color=\"#FF6A3D\">(" + (param3 < 100 ? String(param3) : "99+") + ")</font>" : "";
            if (param5 > 0) {
                // lines that mention the player, among those not seen yet
                count += " <font color=\"#FFD24A\">@" + (param5 > 1 ? String(Math.min(param5, 99)) : "") + "</font>";
            }
            param1.htmlText = "<font color=\"" + (param4 ? "#FFD24A" : "#CCCCCC") + "\">" + param2 + "</font>" + count;
        }

        public function Skin():void {
            var _loc1_:int = 1;
            if (GLOBAL.InfernoMode()) {
                _loc1_ = 2;
            }
            this._skinTag = _loc1_;
            var _loc2_:int = 0;
            while (_loc2_ < this._skinnedElements.length) {
                this._skinnedElements[_loc2_].gotoAndStop(_loc1_);
                _loc2_++;
            }
            this.background.mcToggle.gotoAndStop(this._enabled ? "on" + this._skinTag : "close" + this._skinTag);
            this.background.arrowUp.gotoAndStop("on" + this._skinTag);
            this.background.arrowDown.gotoAndStop("on" + this._skinTag);
        }

        override public function update():void {
            super.update();
            this.ResizeWindow();
            this.ResizeMessages();
            if (!TUTORIAL.hasFinished) {
                this.background.arrowUp.visible = TUTORIAL.hasFinished;
                this.background.mcToggle.visible = TUTORIAL.hasFinished;
            }
            else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                this.background.arrowUp.visible = TUTORIAL.hasFinished;
                this.background.mcToggle.visible = TUTORIAL.hasFinished;
            }
            this.Skin();
            this.UpdateChatStatus();
        }

        public function UpdateChatStatus():void {
            this.background.mcToggle.gotoAndStop(this._enabled ? "close" + this._skinTag : "on" + this._skinTag);
            if (Chat._bymChat != null && Chat._bymChat.isLoggingOut) {
                this.background.mcToggle.gotoAndStop("wait" + this._skinTag);
            }
        }

        override public function clearChat():void {
            super.clearChat();
            if (GLOBAL.INFERNO_ONLY) {
                this.ioSetLines([]);
                return;
            }
            this._chatHistory = [];
        }

        override public function clearInputText():void {
            super.clearInputText();
            if (GLOBAL.INFERNO_ONLY) {
                this.ioInputLayout();
            }
        }

        override public function get background():MovieClip {
            return this._displayAssets.frame;
        }

        override public function get input():TextField {
            return this._displayAssets.input._input;
        }

        override public function get output():TextField {
            return this.background._output;
        }

        public function get inputbar():MovieClip {
            return this._displayAssets.input;
        }

        public function OnMsgMouseOver(param1:MouseEvent):void {
            var _loc2_:ChatBox_msg_CLIP = null;
            if (param1.currentTarget && param1.currentTarget.msgData && !param1.currentTarget.isOwnMessage) {
                if (param1.currentTarget.msgData.userid) {
                    _loc2_ = param1.currentTarget as ChatBox_msg_CLIP;
                    if (_loc2_.msgData.msgtype == "IgnoreList") {
                        if (Chat._bymChat.userIsIgnored(_loc2_.msgData.userid)) {
                            _loc2_.ignoreBtn.gotoAndStop(2);
                            _loc2_.ignoreBtn.visible = true;
                        }
                    }
                    else if (!Chat._bymChat.userIsIgnored(_loc2_.msgData.userid)) {
                        _loc2_.ignoreBtn.gotoAndStop(1);
                        _loc2_.ignoreBtn.visible = true;
                    }
                }
            }
        }

        public function OnMsgMouseOut(param1:MouseEvent):void {
            var _loc2_:ChatBox_msg_CLIP = param1.currentTarget as ChatBox_msg_CLIP;
            _loc2_.ignoreBtn.visible = false;
        }

        public function OnMsgIgnoreMouseDown(param1:MouseEvent):void {
            if (Boolean(param1.currentTarget.parent) && Boolean(param1.currentTarget.parent.msgData)) {
                if (param1.currentTarget.parent.msgData.msgtype == "IgnoreList") {
                    Chat._bymChat.unignoreUser(param1.currentTarget.parent.msgData.userid);
                }
                else {
                    Chat._bymChat.ignoreUser(param1.currentTarget.parent.msgData.userid, param1.currentTarget.parent.msgData.username);
                }
            }
        }

        public function OnMsgIgnoreRollOver(param1:MouseEvent):void {
            var _loc2_:String = param1.currentTarget.parent.msgData.msgtype == "IgnoreList" ? "Click to unignore user" : "Click to ignore user";
            var _loc3_:Number = param1.currentTarget.y + param1.currentTarget.height / 2;
            PopupShow(param1.currentTarget.x - 10, _loc3_, _loc2_, param1.currentTarget.parent as MovieClip);
        }

        public function OnMsgIgnoreRollOut(param1:MouseEvent):void {
            PopupHide();
        }

        /** Inferno-only: a player's name opens an in-game message to them (BYMChat.ioMessagePlayer). */
        public function OnMsgNameMouseDown(param1:MouseEvent):void {
            if (!GLOBAL.INFERNO_ONLY) {
                return;
            }
            var nameClip:Object = param1.currentTarget;
            var data:Object = nameClip.parent ? nameClip.parent.msgData : null;
            if (!data || !data.userid) {
                return;
            }
            if (Chat._bymChat != null) {
                Chat._bymChat.ioNameClicked(String(data.userid), String(data.username), param1.stageX, param1.stageY, data);
            }
        }

        public function OnMsgNameRollOver(param1:MouseEvent):void {
        }

        public function OnMsgNameRollOut(param1:MouseEvent):void {
        }

        private function OnChatDisableClick(param1:MouseEvent = null):void {
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
                    }
                    else if (Chat.flagsShouldChatExist()) {
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

        public function EnableInput(param1:Boolean):void {
            if (param1 && GLOBAL.INFERNO_ONLY && this.input.visible) {
                return; // (on already: a rejoin after a lost link must not wipe what is being typed)
            }
            if (param1) {
                this.input.text = "";
                this.input.visible = true;
            }
            else {
                this.input.text = "";
                this.input.visible = false;
            }
        }

        public function ClearInputText():void {
            this.input.text = "";
        }

        public function get chatEnabled():Boolean {
            return this._enabled;
        }

        public function inputHasFocus():Boolean {
            return stage != null && stage.focus == this.input;
        }

        public function disableChatBoxForAB():void {
            this._sendBtn.removeEventListener(MouseEvent.MOUSE_DOWN, this.handleSendClick);
            this.input.removeEventListener(MouseEvent.MOUSE_UP, this.onInputFocus);
            this._sendBtn.enabled = false;
            this._sendBtn.removeEventListener(MouseEvent.MOUSE_DOWN, this.handleSendClick);
            this.EnableInput(false);
        }
    }
}
