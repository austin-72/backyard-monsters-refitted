import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip, StageDisplayState } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { ABTest, BASE, BUILDINGINFO, Back, Chat, Elastic, GLOBAL, KEYS, SPECIALEVENT, SPECIALEVENT_WM1, TUTORIAL, TweenLite, UI_BAITERSCAREAWAY, UI_BOTTOM, UI_TOP, UI_VISITOR, UI_WARNING, UI_WILDMONSTERBAR, UI_WORKERS } from "@game";

export class UI2 extends ASObject {
    public static _top: UI_TOP = null;

    public static _visitor: UI_VISITOR = null;

    public static _warning: UI_WARNING = null;

    public static _tutorial: MovieClip = null;

    public static _bottomName: string = null;

    public static _scareAway: UI_BAITERSCAREAWAY = null;

    public static _showTop: boolean = false;

    public static _showBottom: boolean = false;

    public static _showWarning: boolean = false;

    public static _scrollMap: boolean = false;

    public static _showProtected: boolean = false;

    public static _wildMonsterBar: UI_WILDMONSTERBAR = null;

    private static _timers: any[] = new Array();

    public static _debugWarningTxt: TextField = null;

    public static _debugWarningTxtVal: string = "DEBUG MODE";

    public static activeEvent: any = undefined;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        UI2.activeEvent = SPECIALEVENT.getActiveSpecialEvent();

        UI2._tutorial = as3.as(GLOBAL._layerUI.addChild(new MovieClip()), MovieClip);
        UI2._top = as3.as(GLOBAL._layerUI.addChild(new UI_TOP()), UI_TOP);
        UI2._warning = as3.as(GLOBAL._layerUI.addChild(new UI_WARNING()), UI_WARNING);
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD) {
            UI2._visitor = as3.as(GLOBAL._layerUI.addChild(new UI_VISITOR()), UI_VISITOR);
        } else {
            UI2._visitor = null;
        }
        UI2._top.mc.x = 0;
        UI2._top.mc.y = 4;
        UI2._showTop = true;
        UI2._showBottom = false;
        UI2._showProtected = false;
        UI2._showWarning = false;
        UI_BOTTOM.Setup();
        // (Inferno-only: an outpost's one worker is shown too, 3 October)
        if (BASE.isMainYardOrInfernoMainYard || GLOBAL.INFERNO_ONLY && BASE.isOutpostOrInfernoOutpost) {
            UI_WORKERS.Setup();
        }
        UI2._top.Setup();
        if (Chat.flagsShouldChatExist() && Chat._bymChat._open) {
            Chat.initChat();
        }
        if (Chat.flagsShouldChatDisplay()) {
            Chat.setChatPosition(GLOBAL._layerUI, 10, 300);
        }
        UI2._timers = new Array();
        UI2._timers.push(UI2._top.mcProtected);
        UI2._timers.push(UI2._top.mcReinforcements);
        if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate) {
            UI2._timers.push(UI2._top.mcSpecialEvent);
            if (GLOBAL._countryCode != "ph") {
                UI2._top.mcSpecialEvent.buttonMode = true;
                UI2._top.mcSpecialEvent.mouseChildren = false;
                UI2._top.mcSpecialEvent.addEventListener(MouseEvent.CLICK, UI2.activeEvent.TimerClicked);
            }
        }
        if (GLOBAL._aiDesignMode) {
            UI2.DebugWarning();
        }
    }

    public static SetupHUD(): void {
        UI2._tutorial = as3.as(GLOBAL._layerUI.addChild(new MovieClip()), MovieClip);
        UI_BOTTOM.Setup();
        UI_BOTTOM.Hide();
        if (Chat.flagsShouldChatExist() && Chat._bymChat._open) {
            Chat.initChat();
        }
        if (Chat.flagsShouldChatDisplay()) {
            Chat.setChatPosition(GLOBAL._layerUI, 10, 300);
        }
    }

    public static Show(param1: string): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (param1 == "top" && !UI2._showTop) {
            UI2._showTop = true;
            UI2._top.mc.visible = true;
        } else if (param1 == "bottom" && !UI2._showBottom) {
            UI2._showBottom = true;
            UI_BOTTOM.Show();
            if (TUTORIAL._stage >= 200) {
                UI_WORKERS.Show();
            }
        } else if (param1 == "warning" && !UI2._showWarning) {
            UI2._showWarning = true;
            if (GLOBAL._render) {
                TweenLite.to(UI2._warning.mc, 1, { "y": 0, "ease": Elastic.easeOut });
            } else {
                UI2._warning.mc.y = 0;
            }
        } else if (param1 == "scareAway" || param1 == "surrender") {
            if (GLOBAL._render && !UI2._scareAway) {
                UI2._scareAway = as3.as(GLOBAL._layerUI.addChild(new UI_BAITERSCAREAWAY(param1 == "scareAway")), UI_BAITERSCAREAWAY);
                UI2.ResizeHandler();
            }
        } else if (param1 == "wmbar") {
            if (GLOBAL._render) {
                UI2._wildMonsterBar = new UI_WILDMONSTERBAR();
                GLOBAL._layerUI.addChild(UI2._wildMonsterBar);
                UI2._wildMonsterBar.y = 0;
                UI2.ResizeHandler();
            }
        }
    }

    public static Clear(): void {
        if (UI2._top) {
            UI2._top.Clear();
            if (UI2._top.parent) {
                UI2._top.parent.removeChild(UI2._top);
            }
            UI2._top = null;
        }
        UI_BOTTOM.Clear();
        if (UI2._warning) {
            if (UI2._warning.parent) {
                UI2._warning.parent.removeChild(UI2._warning);
            }
            UI2._warning = null;
        }
        if (UI2._scareAway) {
            if (UI2._scareAway.parent) {
                UI2._scareAway.parent.removeChild(UI2._scareAway);
            }
            UI2._scareAway = null;
        }
        if (Boolean(UI2._wildMonsterBar) && Boolean(UI2._wildMonsterBar.parent)) {
            UI2._wildMonsterBar.parent.removeChild(UI2._wildMonsterBar);
            UI2._wildMonsterBar = null;
        }
        if (Boolean(UI2._debugWarningTxt) && Boolean(UI2._debugWarningTxt.parent)) {
            UI2._debugWarningTxt.parent.removeChild(UI2._debugWarningTxt);
            UI2._debugWarningTxt = null;
        }
    }

    public static Hide(param1: string): void {
        let what: string = param1;
        if (what == "top" && UI2._showTop) {
            UI2._showTop = false;
            UI2._top.mc.visible = false;
        } else if (what == "bottom" && UI2._showBottom) {
            UI2._showBottom = false;
            UI_BOTTOM.Hide();
            UI_WORKERS.Hide();
        } else if (what == "warning" && UI2._showWarning) {
            UI2._showWarning = false;
            if (Chat._bymChat) {
                Chat._bymChat.show();
            }
            if (GLOBAL._render) {
                TweenLite.to(UI2._warning.mc, 0.5, { "y": -100, "ease": Back.easeIn });
            } else {
                UI2._warning.mc.y = -100;
            }
        } else if (what == "scareAway" && Boolean(UI2._scareAway)) {
            if (GLOBAL._layerUI.contains(UI2._scareAway)) {
                GLOBAL._layerUI.removeChild(UI2._scareAway);
                if (Chat._bymChat) {
                    Chat._bymChat.show();
                }
                UI2._scareAway = null;
            }
        } else if (what == "wmbar") {
            if (UI2._wildMonsterBar != null) {
                if (GLOBAL._render) {
                    TweenLite.to(UI2._wildMonsterBar, 0.5, { "y": UI2._wildMonsterBar.y - 22, "onComplete": (): void => {
                        UI2._wildMonsterBar.parent.removeChild(UI2._wildMonsterBar);
                        UI2._wildMonsterBar = null;
                        UI2.ResizeHandler();
                    } });
                } else {
                    try {
                        UI2._wildMonsterBar.parent.removeChild(UI2._wildMonsterBar);
                    } catch (e) {
                    }
                    UI2._wildMonsterBar.y -= 20;
                    UI2._wildMonsterBar = null;
                }
            }
        }
        if (GLOBAL._render) {
            UI2.ResizeHandler();
        }
    }

    public static Disable(): void {
    }

    public static Enable(): void {
    }

    public static Update(): void {
        let _loc1_: number = NaN;
        let _loc2_: MovieClip = null;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        if (!GLOBAL._catchup) {
            if (UI2._top) {
                UI2._top.Update();
                if (TUTORIAL._stage < TUTORIAL.k_STAGE_DAMAGE_PROTECT) {
                    if (UI2._top.mcProtected.visible) {
                        UI2._top.mcProtected.visible = false;
                    }
                    if (UI2._top.mcReinforcements.visible) {
                        UI2._top.mcReinforcements.visible = false;
                    }
                    if (Boolean(UI2._top.mcSpecialEvent) && UI2._top.mcSpecialEvent.visible) {
                        UI2._top.mcSpecialEvent.visible = false;
                    }
                    if (UI2._top.mcSave.visible) {
                        UI2._top.mcSave.visible = false;
                    }
                    if (UI2._top.mcZoom.visible) {
                        UI2._top.mcZoom.visible = false;
                    }
                    if (UI2._top.mcFullscreen.visible) {
                        UI2._top.mcFullscreen.visible = ABTest.isInTestGroup("fst", 128);
                    }
                    if (UI2._top.mcBuffHolder.visible) {
                        UI2._top.mcBuffHolder.visible = false;
                    }
                } else {
                    if (BASE._isProtected - GLOBAL.Timestamp() > 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD)) {
                        if (!UI2._top.mcProtected.visible) {
                            UI2._top.mcProtected.visible = true;
                        }
                        if (BASE._isProtected - GLOBAL.Timestamp() > 86400) {
                            UI2._top.mcProtected.tCountdown.htmlText = GLOBAL.ToTime((BASE._isProtected - GLOBAL.Timestamp()) | 0, true, false);
                        } else {
                            UI2._top.mcProtected.tCountdown.htmlText = GLOBAL.ToTime((BASE._isProtected - GLOBAL.Timestamp()) | 0, true);
                        }
                    } else if (UI2._top.mcProtected.visible) {
                        UI2._top.mcProtected.visible = false;
                    }
                    if (BASE._isReinforcements - GLOBAL.Timestamp() > 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD)) {
                        if (!UI2._top.mcReinforcements.visible) {
                            UI2._top.mcReinforcements.visible = true;
                        }
                        if (BASE._isReinforcements - GLOBAL.Timestamp() > 86400) {
                            UI2._top.mcReinforcements.tCountdown.htmlText = GLOBAL.ToTime((BASE._isReinforcements - GLOBAL.Timestamp()) | 0, true, false);
                        } else {
                            UI2._top.mcReinforcements.tCountdown.htmlText = GLOBAL.ToTime((BASE._isReinforcements - GLOBAL.Timestamp()) | 0, true);
                        }
                    } else if (UI2._top.mcReinforcements.visible) {
                        UI2._top.mcReinforcements.visible = false;
                    }
                    let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
                    let isBuildMode: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD;
                    let isMainYard: boolean = !BASE.isOutpost && !BASE.isInfernoMainYardOrOutpost;
                    let isAllowedPlatform: boolean = !GLOBAL._flags.viximo && !GLOBAL._flags.kongregate;
                    let isWMI1Active: boolean = activeEvent == SPECIALEVENT_WM1 && (SPECIALEVENT_WM1.invasionpop == 4 || SPECIALEVENT_WM1.invasionpop == 5);
                    let isWMI2Active: boolean = activeEvent == SPECIALEVENT && SPECIALEVENT.invasionpop == 4;
                    let isEventActive: boolean = isWMI1Active || isWMI2Active;

                    if (!activeEvent || (activeEvent == SPECIALEVENT && SPECIALEVENT.GetTimeUntilEnd() < 0) || (activeEvent == SPECIALEVENT_WM1 && (SPECIALEVENT_WM1.GetTimeUntilEnd() < 0 || SPECIALEVENT_WM1.wave > SPECIALEVENT_WM1.numWaves || SPECIALEVENT_WM1.invasionpop == 4 && SPECIALEVENT_WM1.wave > SPECIALEVENT_WM1.BONUSWAVE2))) {
                        if (Boolean(UI2._top.mcSpecialEvent) && UI2._top.mcSpecialEvent.visible) {
                            UI2._top.mcSpecialEvent.visible = false;
                        }
                        SPECIALEVENT.updateNextWaveUI();
                        // This will hide all nextwave UIs
                        if (activeEvent == SPECIALEVENT_WM1 && SPECIALEVENT_WM1.GetTimeUntilEnd() < 0 && SPECIALEVENT_WM1.GetTimeUntilEnd() > -86400 && GLOBAL.StatGet("wmi_end") == 0) {
                            SPECIALEVENT_WM1.ShowEventEndPopup();
                        }
                    } else if (activeEvent && isBuildMode && isAllowedPlatform && isEventActive) {
                        if (!UI2._top.mcSpecialEvent.visible) {
                            UI2._top.mcSpecialEvent.visible = true;
                        }
                        SPECIALEVENT.updateNextWaveUI();
                        // This will show the appropriate nextwave UI
                        if (activeEvent == SPECIALEVENT_WM1) {
                            _loc3_ = SPECIALEVENT_WM1.GetTimeUntilExtension();
                            if (_loc3_ < 0 || SPECIALEVENT_WM1.invasionpop == 5) {
                                _loc3_ = SPECIALEVENT_WM1.GetTimeUntilEnd();
                                if (_loc3_ > 0) {
                                    if (SPECIALEVENT_WM1.invasionpop == 4) {
                                        if (Boolean(UI2._top.mcSpecialEvent) && UI2._top.mcSpecialEvent.visible) {
                                            UI2._top.mcSpecialEvent.visible = false;
                                        }
                                        SPECIALEVENT.updateNextWaveUI();
                                    }
                                }
                            }
                            if (_loc3_ > 86400) {
                                UI2._top.mcSpecialEvent.tCountdown.htmlText = GLOBAL.ToTime(_loc3_ | 0, true, false);
                            } else {
                                UI2._top.mcSpecialEvent.tCountdown.htmlText = GLOBAL.ToTime(_loc3_ | 0, true);
                            }
                        } else if (activeEvent == SPECIALEVENT) {
                            _loc3_ = SPECIALEVENT.GetTimeUntilEnd();
                            if (_loc3_ > 86400) {
                                UI2._top.mcSpecialEvent.tCountdown.htmlText = GLOBAL.ToTime(_loc3_ | 0, true, false);
                            } else {
                                UI2._top.mcSpecialEvent.tCountdown.htmlText = GLOBAL.ToTime(_loc3_ | 0, true);
                            }
                        }
                    } else if (isBuildMode && isMainYard && isAllowedPlatform) {
                        // This section handles pre-event timing for both WM1 and WM2
                        if (activeEvent == SPECIALEVENT_WM1) {
                            if (SPECIALEVENT_WM1.invasionpop != 1) {
                                if (!UI2._top.mcSpecialEvent.visible) {
                                    UI2._top.mcSpecialEvent.visible = true;
                                }
                            } else {
                                if (UI2._top.mcSpecialEvent.visible) {
                                    UI2._top.mcSpecialEvent.visible = false;
                                }
                            }
                            SPECIALEVENT.updateNextWaveUI();
                            _loc4_ = SPECIALEVENT_WM1.GetTimeUntilStart();
                            _loc5_ = Math.ceil(_loc4_ / 86400);
                            if (_loc5_ > 1) {
                                UI2._top.mcSpecialEvent.tCountdown.htmlText = _loc5_ + " " + KEYS.Get("global_days");
                            } else {
                                _loc6_ = Math.ceil(_loc4_ / 3600);
                                if (_loc6_ > 1) {
                                    UI2._top.mcSpecialEvent.tCountdown.htmlText = _loc6_ + " " + KEYS.Get("global_hours");
                                } else {
                                    UI2._top.mcSpecialEvent.tCountdown.htmlText = "&lt; 1 " + KEYS.Get("global_hour");
                                }
                            }
                        } else if (activeEvent == SPECIALEVENT) {
                            if (SPECIALEVENT.invasionpop >= 0 && SPECIALEVENT.invasionpop <= 3) {
                                if (!UI2._top.mcSpecialEvent.visible) {
                                    UI2._top.mcSpecialEvent.visible = true;
                                }
                            } else {
                                if (UI2._top.mcSpecialEvent.visible) {
                                    UI2._top.mcSpecialEvent.visible = false;
                                }
                            }
                            SPECIALEVENT.updateNextWaveUI();
                            _loc4_ = SPECIALEVENT.GetTimeUntilStart();
                            _loc5_ = Math.ceil(_loc4_ / 86400);
                            if (_loc5_ > 1) {
                                UI2._top.mcSpecialEvent.tCountdown.htmlText = _loc5_ + " " + KEYS.Get("global_days");
                            } else {
                                _loc6_ = Math.ceil(_loc4_ / 3600);
                                if (_loc6_ > 1) {
                                    UI2._top.mcSpecialEvent.tCountdown.htmlText = _loc6_ + " " + KEYS.Get("global_hours");
                                } else {
                                    UI2._top.mcSpecialEvent.tCountdown.htmlText = "&lt; 1 " + KEYS.Get("global_hour");
                                }
                            }
                        }
                    } else {
                        if (Boolean(UI2._top.mcSpecialEvent) && UI2._top.mcSpecialEvent.visible) {
                            UI2._top.mcSpecialEvent.visible = false;
                        }
                        SPECIALEVENT.updateNextWaveUI();
                    }
                    if (!UI2._top.mcSave.visible) {
                        UI2._top.mcSave.visible = true;
                    }
                    if (!UI2._top.mcZoom.visible) {
                        UI2._top.mcZoom.visible = true;
                    }
                    if (!UI2._top.mcFullscreen.visible) {
                        UI2._top.mcFullscreen.visible = true;
                    }
                    if (UI2._top.mcBuffHolder.visible) {
                        UI2._top.mcBuffHolder.visible = true;
                    }
                    if (!Chat._chatInited || !Chat._bymChat.IsConnected) {
                        Chat.initChat();
                    }
                    if (Chat._bymChat && Chat._chatInited && Chat._bymChat.IsConnected) {
                        Chat._bymChat.toggleVisibleB();
                    }
                }
                if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD || !GLOBAL._flags.saveicon) {
                    UI2._top.mcSave.visible = false;
                }
                _loc1_ = 35;
                for (_loc2_ of as3.values(UI2._timers)) {
                    if (_loc2_.visible) {
                        _loc2_.y = _loc1_;
                        _loc1_ += 30;
                    }
                }
                UI2.updateZoom();
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) {
                UI_BOTTOM.Update();
                UI_BOTTOM.Resize();
                if (UI2._scareAway) {
                    GLOBAL.RefreshScreen();
                    UI2._scareAway.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - UI2._scareAway.mcBG.width - 10;
                    UI2._scareAway.y = GLOBAL._SCREENHUD.y - (UI2._scareAway.mcBG.height + 10);
                }
            } else {
                UI_BOTTOM.Resize();
                if (UI2._visitor) {
                    UI2._visitor.Update();
                }
                if (UI_BOTTOM._missions) {
                    UI_BOTTOM._missions.Update();
                }
            }
            BUILDINGINFO.Update();
        }
    }

    public static updateZoom(): void {
        let _loc1_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            _loc1_ = 6;
            UI2._top.mcZoom.y = _loc1_;
            UI2._top.mcFullscreen.y = _loc1_;
            UI2._top.mcSound.y = _loc1_ + 24;
            UI2._top.mcMusic.y = _loc1_ + 24;
            UI2._top.mcSave.y = _loc1_ + 24 + 24;
            UI2._top.mcFullscreen.gotoAndStop(1 + 2);
            if (GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
                UI2._top.mcZoom.gotoAndStop(1 + 3);
            } else {
                UI2._top.mcZoom.gotoAndStop(3 + 3);
            }
            if (GLOBAL._ROOT.stage.displayState != StageDisplayState.FULL_SCREEN) {
                if (GLOBAL._zoomed) {
                    UI2._top.mcZoom.gotoAndStop(2 + 3);
                }
            }
        } else {
            UI2._top.mcZoom.y = _loc1_;
            UI2._top.mcFullscreen.y = _loc1_;
            UI2._top.mcSound.y = _loc1_;
            UI2._top.mcMusic.y = _loc1_;
            UI2._top.mcSave.y = _loc1_;
            UI2._top.mcFullscreen.gotoAndStop(1);
            if (GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
                UI2._top.mcZoom.gotoAndStop(1);
            } else {
                UI2._top.mcZoom.gotoAndStop(3);
            }
            if (GLOBAL._ROOT.stage.displayState != StageDisplayState.FULL_SCREEN) {
                if (GLOBAL._zoomed) {
                    UI2._top.mcZoom.gotoAndStop(2);
                }
            }
        }
    }

    public static ResizeHandler(param1: Event = null): void {
        let _loc4_: Rectangle = null;
        let _loc2_: int = GLOBAL._ROOT.stage.stageWidth;
        let _loc3_: int = GLOBAL.GetGameHeight();
        let _loc5_: int = UI2._wildMonsterBar != null ? 40 : 0;
        _loc4_ = new Rectangle(0 - (_loc2_ - GLOBAL._SCREENINIT.width) / 2, 0 - (_loc3_ - (GLOBAL._SCREENINIT.height + _loc5_)) / 2, _loc2_, _loc3_);
        if (UI2._wildMonsterBar) {
            UI2._wildMonsterBar.back.width = _loc4_.width;
            UI2._wildMonsterBar.x = _loc4_.x;
            UI2._wildMonsterBar.y = _loc4_.y - 20;
            UI2._wildMonsterBar.info.x = _loc4_.width - 79;
            UI2._wildMonsterBar.eta_txt.x = _loc4_.width - 190;
        }
        if (UI2._top) {
            UI2._top.resize(_loc4_);
        }
        if (UI2._warning) {
            UI2._warning.x = _loc4_.x + _loc4_.width / 2 - UI2._warning.width / 2 + 50;
            UI2._warning.y = _loc4_.y + 10;
        }
        if (UI2._visitor) {
            UI2._visitor.Update();
            UI2._visitor.mc.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - UI2._visitor.mc.mcBG.width - 10;
            UI2._visitor.mc.y = GLOBAL._SCREENHUD.y - (UI2._visitor.mc.height + 10);
        }
        if (UI2._scareAway) {
            GLOBAL.RefreshScreen();
            UI2._scareAway.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - UI2._scareAway.mcBG.width - 10;
            UI2._scareAway.y = GLOBAL._SCREENHUD.y - (UI2._scareAway.mcBG.height + 10);
        }
        if (Chat._bymChat) {
            Chat._bymChat.position();
        }
        if (UI2._debugWarningTxt) {
            UI2.DebugWarning();
        }
        UI_BOTTOM.Resize();
        UI_WORKERS.Resize();
    }

    public static TimersVisible(): int {
        let _loc2_: MovieClip = null;
        let _loc1_: int = 0;
        for (_loc2_ of as3.values(UI2._timers)) {
            if (_loc2_.visible) {
                _loc1_++;
            }
        }
        return _loc1_;
    }

    public static DebugWarning(): void {
        let _loc1_: string = "DEBUG MODE";
        let _loc2_: TextFormat = new TextFormat();
        _loc2_.font = "Verdana";
        _loc2_.bold = true;
        _loc2_.size = 72;
        _loc2_.align = TextFormatAlign.CENTER;
        _loc2_.color = 16711680;
        _loc2_.letterSpacing = -11;
        if (!UI2._debugWarningTxt) {
            UI2._debugWarningTxt = new TextField();
        }
        UI2._debugWarningTxt.mouseEnabled = false;
        UI2._debugWarningTxt.alpha = 0.8;
        UI2._debugWarningTxt.width = 400;
        UI2._debugWarningTxt.height = 100;
        UI2._debugWarningTxt.autoSize = TextFieldAutoSize.LEFT;
        UI2._debugWarningTxt.text = _loc1_;
        UI2._debugWarningTxt.setTextFormat(_loc2_);
        UI2._debugWarningTxt.x = GLOBAL._SCREEN.x + 15;
        UI2._debugWarningTxt.y = GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - UI2._debugWarningTxt.height * 0.75;
        GLOBAL._layerUI.addChild(UI2._debugWarningTxt);
    }

    public static DebugWarningEdit(param1: string = null): void {
        let _loc2_: string = "DEBUG MODE";
        if (param1) {
            _loc2_ = param1;
        }
        let _loc3_: TextFormat = new TextFormat();
        _loc3_.font = "Verdana";
        _loc3_.bold = true;
        _loc3_.size = 36;
        _loc3_.align = TextFormatAlign.CENTER;
        _loc3_.color = 16711680;
        _loc3_.letterSpacing = -2;
        if (UI2._debugWarningTxt) {
            UI2._debugWarningTxt.mouseEnabled = false;
            UI2._debugWarningTxt.alpha = 0.8;
            UI2._debugWarningTxt.width = 400;
            UI2._debugWarningTxt.height = 100;
            UI2._debugWarningTxt.autoSize = TextFieldAutoSize.LEFT;
            UI2._debugWarningTxt.text = _loc2_;
            UI2._debugWarningTxt.setTextFormat(_loc3_);
            UI2._debugWarningTxt.x = GLOBAL._SCREEN.x + 15;
            UI2._debugWarningTxt.y = GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - UI2._debugWarningTxt.height * 0.75;
        }
    }
}
