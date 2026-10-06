import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TextFieldAutoSize } from "flash/text";
import { BASE, BUILDINGS, BUY, BuildingAssetContainer, GLOBAL, KEYS, LOGIN, POPUPS, Quad, SALESPECIALSPOPUP_CLIP, SOUNDS, STORE, TUTORIAL, TweenLite, store_icon_CLIP } from "@game";

export class SALESPECIALSPOPUP extends SALESPECIALSPOPUP_CLIP {
    static {
        as3.fields(this, { _numGifts: 5, _giftSpacing: 5, _giftsArray: null, _giftItem: "HOD2", _textProps: null, _giftProps: null, _giftConfirmProps: null, _shinyDiscountProps: null, _shinyBonusProps: null, _sevenElevenBigGulpProps: null, _sevenElevenBigGulpTutorialProps: null });
    }

    public static imageContainer: BuildingAssetContainer = null;

    public static _open: boolean = false;

    public static _do: DisplayObject = null;

    public static _iconsDO: DisplayObject = null;

    public static _saleDuration: number = 60 * 10;

    public static _saleEnd: number = NaN;

    public static _page: string = null;

    public static _alreadyDone: boolean = false;

    public static _popup: SALESPECIALSPOPUP = null;

    private static _props: any = null;
    public _numGifts: int;
    public _giftSpacing: number;
    private _giftsArray: any[];
    private _giftItem: string;
    private _textProps: any;
    private _giftProps: any;
    private _giftConfirmProps: any;
    private _shinyDiscountProps: any;
    private _shinyBonusProps: any;
    private _sevenElevenBigGulpProps: any;
    private _sevenElevenBigGulpTutorialProps: any;

    public $ctor(param1: string = "text"): void {
        this._textProps = { "tTitleX": -150, "tTitleY": -100, "tTitleW": 300, "tTitleH": 70, "tDescX": -150, "tDescY": -50, "tDescW": 300, "tDescH": 100, "bActionX": -75, "bActionY": 50, "bActionW": 150, "bActionH": 30, "bAction2X": -75, "bAction2Y": 50, "bAction2W": 150, "bAction2H": 30, "mcIconsX": 0, "mcIconsY": 0, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -170, "mcFrameY": -130, "mcFrameW": 340, "mcFrameH": 220, "tTitleText": KEYS.Get("special_textprops_title"), "tDescText1": KEYS.Get("special_limitedtime"), "tDescText2": KEYS.Get("special_remaining") + "<br><br>", "tDescText3": KEYS.Get("special_textprops_desc3"), "bActionText": KEYS.Get("special_buyshiny") };
        this._giftProps = { "tTitleX": -150, "tTitleY": -100, "tTitleW": 300, "tTitleH": 70, "tDescX": -150, "tDescY": -70, "tDescW": 300, "tDescH": 100, "bActionX": -75, "bActionY": 110, "bActionW": 150, "bActionH": 30, "bAction2X": -75, "bAction2Y": 50, "bAction2W": 150, "bAction2H": 30, "mcIconsX": -190, "mcIconsY": -25, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -210, "mcFrameY": -130, "mcFrameW": 420, "mcFrameH": 290, "tTitleText": KEYS.Get("special_giftprops_title"), "tDescText1": KEYS.Get("special_limitedtime"), "tDescText2": KEYS.Get("special_remaining") + "<br><br><br><br><br><br><br><br>", "tDescText3": KEYS.Get("special_giftprops_desc3"), "bActionText": KEYS.Get("special_buyshiny") };
        this._giftConfirmProps = { "tTitleX": -150, "tTitleY": -100, "tTitleW": 300, "tTitleH": 70, "tDescX": -150, "tDescY": -60, "tDescW": 300, "tDescH": 100, "bActionX": -75, "bActionY": 110, "bActionW": 150, "bActionH": 30, "bAction2X": -75, "bAction2Y": 50, "bAction2W": 150, "bAction2H": 30, "mcIconsX": -190, "mcIconsY": -55, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -210, "mcFrameY": -130, "mcFrameW": 420, "mcFrameH": 290, "tTitleText": KEYS.Get("special_giftconfirmprops_title"), "tDescText1": "", "tDescText2": "<br><br><br><br><br><br>", "tDescText3": KEYS.Get("special_giftconfirmprops_desc3"), "bActionText": KEYS.Get("special_gotostore") };
        this._shinyDiscountProps = { "tTitleX": -150, "tTitleY": -100, "tTitleW": 300, "tTitleH": 70, "tDescX": -150, "tDescY": -70, "tDescW": 300, "tDescH": 100, "bActionX": -75, "bActionY": 30, "bActionW": 150, "bActionH": 30, "bAction2X": -75, "bAction2Y": 50, "bAction2W": 150, "bAction2H": 30, "mcIconsX": 0, "mcIconsY": 0, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -170, "mcFrameY": -130, "mcFrameW": 340, "mcFrameH": 200, "tTitleText": KEYS.Get("special_shinydiscount_title"), "tDescText1": KEYS.Get("special_limitedtime"), "tDescText2": KEYS.Get("special_remaining") + "<br><br>", "tDescText3": KEYS.Get("special_shinydiscount_desc3"), "bActionText": KEYS.Get("special_buyshiny") };
        this._shinyBonusProps = { "tTitleX": -150, "tTitleY": -100, "tTitleW": 300, "tTitleH": 70, "tDescX": -150, "tDescY": -70, "tDescW": 300, "tDescH": 100, "bActionX": -75, "bActionY": 30, "bActionW": 150, "bActionH": 30, "bAction2X": -75, "bAction2Y": 50, "bAction2W": 150, "bAction2H": 30, "mcIconsX": 0, "mcIconsY": 0, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -170, "mcFrameY": -130, "mcFrameW": 340, "mcFrameH": 200, "tTitleText": KEYS.Get("special_shinybonus_title"), "tDescText1": KEYS.Get("special_limitedtime"), "tDescText2": KEYS.Get("special_remaining") + "<br><br>", "tDescText3": KEYS.Get("special_shinybonus"), "bActionText": KEYS.Get("special_buyshiny") };
        this._sevenElevenBigGulpProps = { "tTitleX": -105, "tTitleY": 108, "tTitleW": 90, "tTitleH": 35, "tDescX": -150, "tDescY": -70, "tDescW": 300, "tDescH": 100, "bActionX": -110, "bActionY": 105, "bActionW": 100, "bActionH": 45, "bAction2X": 25, "bAction2Y": 105, "bAction2W": 100, "bAction2H": 45, "mcIconsX": 0, "mcIconsY": 0, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -180, "mcFrameY": -175, "mcFrameW": 360, "mcFrameH": 350, "tTitleText": KEYS.Get("special_gbg_title"), "tDescText1": KEYS.Get("special_limitedtime"), "tDescText2": KEYS.Get("special_remaining") + "<br><br>", "tDescText3": KEYS.Get("special_shinybonus"), "bActionText": KEYS.Get("special_goldenbiggulp"), "bActionText2": KEYS.Get("special_hatcheryod") };
        this._sevenElevenBigGulpTutorialProps = { "tTitleX": -50, "tTitleY": 108, "tTitleW": 90, "tTitleH": 35, "tDescX": -150, "tDescY": -70, "tDescW": 300, "tDescH": 100, "bActionX": -50, "bActionY": 105, "bActionW": 100, "bActionH": 45, "bAction2X": 25, "bAction2Y": 105, "bAction2W": 100, "bAction2H": 45, "mcIconsX": 0, "mcIconsY": 0, "mcIconsW": 0, "mcIconsH": 0, "mcFrameX": -180, "mcFrameY": -175, "mcFrameW": 360, "mcFrameH": 350, "tTitleText": KEYS.Get("special_gbg_title"), "tDescText1": KEYS.Get("special_limitedtime"), "tDescText2": KEYS.Get("special_remaining") + "<br><br>", "tDescText3": KEYS.Get("special_shinybonus"), "bActionText": KEYS.Get("special_goldenbiggulp"), "bActionText2": KEYS.Get("special_hatcheryod") };
        super.$ctor();
        SALESPECIALSPOPUP._page = param1;
        this.Switch(SALESPECIALSPOPUP._page);
    }

    public static Check(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL._monetized && !SALESPECIALSPOPUP._open && BASE.BaseLevel().level >= 26 && !SALESPECIALSPOPUP._alreadyDone) {
            _loc1_ = 0;
            _loc2_ = LOGIN._digits[LOGIN._digits.length - 1] | 0;
            _loc3_ = LOGIN._digits[LOGIN._digits.length - 2] | 0;
            _loc5_ = (((_loc4_ = LOGIN._digits[LOGIN._digits.length - 3] | 0) + _loc2_) % 10) | 0;
            _loc6_ = ((_loc3_ + _loc2_) % 10) | 0;
            if (_loc5_ <= 7) {
                _loc1_ = 0;
            } else if (_loc5_ == 8) {
                if (_loc6_ <= 4) {
                    _loc1_ = 1;
                } else {
                    _loc1_ = 2;
                }
            } else if (_loc5_ == 9) {
                if (_loc6_ <= 4) {
                    _loc1_ = 3;
                } else {
                    _loc1_ = 4;
                }
            }
            if (_loc1_ != 0) {
                SALESPECIALSPOPUP.CheckPromoTimer();
            }
            SALESPECIALSPOPUP._alreadyDone = true;
        }
    }

    public static Show(param1: string = "text"): void {
        if (!SALESPECIALSPOPUP._open) {
            SOUNDS.Play("click1");
            BASE.BuildingDeselect();
            SALESPECIALSPOPUP._open = true;
            SALESPECIALSPOPUP._page = param1;
            SALESPECIALSPOPUP._popup = new SALESPECIALSPOPUP(param1);
            if (param1 == "biggulp") {
                POPUPS.Push(SALESPECIALSPOPUP._popup, BUY.logFB711RedeemShown, [param1], null, null, false);
            } else {
                SALESPECIALSPOPUP.CheckPromoTimer();
                POPUPS.Push(SALESPECIALSPOPUP._popup, BUY.logPromoShown, [param1], null, null, false);
            }
            TweenLite.to(SALESPECIALSPOPUP._do, 0.2, { "scaleX": 1, "scaleY": 1, "ease": Quad.easeOut });
            if (!SALESPECIALSPOPUP._saleEnd && param1 != "giftconfirm" && param1 != "biggulp") {
                SALESPECIALSPOPUP.StartSale();
            }
            SALESPECIALSPOPUP._popup.Switch(SALESPECIALSPOPUP._page);
            SALESPECIALSPOPUP._popup.addEventListener(Event.ENTER_FRAME, SALESPECIALSPOPUP.Tick);
            if (SALESPECIALSPOPUP._page == "biggulp") {
                SALESPECIALSPOPUP._popup.gotoAndStop("redeem");
                SALESPECIALSPOPUP._popup.bAction3.buttonMode = true;
                SALESPECIALSPOPUP._popup.bAction3.useHandCursor = true;
                SALESPECIALSPOPUP._popup.bAction3.mouseChildren = false;
                SALESPECIALSPOPUP._popup.bAction3.addEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
                SALESPECIALSPOPUP._popup.bAction4.buttonMode = true;
                SALESPECIALSPOPUP._popup.bAction4.useHandCursor = true;
                SALESPECIALSPOPUP._popup.bAction4.mouseChildren = false;
                SALESPECIALSPOPUP._popup.bAction4.addEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
            } else {
                SALESPECIALSPOPUP._popup.gotoAndStop(1);
                SALESPECIALSPOPUP._popup.bAction.addEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
                SALESPECIALSPOPUP._popup.bAction2.addEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
            }
        }
    }

    public static Tick(param1: Event): void {
        if (SALESPECIALSPOPUP._open && Boolean(SALESPECIALSPOPUP._popup)) {
            SALESPECIALSPOPUP._popup.Update(SALESPECIALSPOPUP._page);
        }
        if (SALESPECIALSPOPUP._saleEnd < GLOBAL.Timestamp()) {
            SALESPECIALSPOPUP.EndSale();
        }
    }

    public static CheckPromoTimer(): void {
        GLOBAL.CallJS("cc.startPromoTimer", [{ "callback": "startPromoTimer" }]);
    }

    public static StartSale(param1: int = 0): void {
        if (param1 > 0 && param1 > GLOBAL.Timestamp()) {
            SALESPECIALSPOPUP._saleEnd = param1;
            if (GLOBAL._flags.midgameIncentive == 1) {
                SALESPECIALSPOPUP.Show("text");
            } else if (GLOBAL._flags.midgameIncentive == 2) {
                SALESPECIALSPOPUP.Show("gift");
            } else if (GLOBAL._flags.midgameIncentive == 3) {
                SALESPECIALSPOPUP.Show("shinydiscount");
            } else if (GLOBAL._flags.midgameIncentive == 4) {
                SALESPECIALSPOPUP.Show("shinybonus");
            } else if (GLOBAL._flags.midgameIncentive == 5) {
                SALESPECIALSPOPUP.Show("giftconfirm");
            }
        }
    }

    public static EndSale(): void {
        SALESPECIALSPOPUP._saleEnd = GLOBAL.Timestamp();
    }

    public static OnActionClick(param1: MouseEvent = null): void {
        if (SALESPECIALSPOPUP._page == "giftconfirm") {
            POPUPS.Next();
            if (!BASE.isInfernoMainYardOrOutpost) {
                STORE.ShowB(3, 1, ["HOD", "HOD2", "HOD3"]);
            } else {
                STORE.ShowB(3, 1, ["HODI", "HOD2I", "HOD3I"]);
            }
        } else if (SALESPECIALSPOPUP._page == "biggulp") {
            if (param1.currentTarget == SALESPECIALSPOPUP._popup.bAction4) {
                if (TUTORIAL._stage < 200) {
                    POPUPS.Next();
                } else {
                    POPUPS.Next();
                    if (!BASE.isInfernoMainYardOrOutpost) {
                        STORE.ShowB(3, 1, ["HOD", "HOD2", "HOD3"]);
                    } else {
                        STORE.ShowB(3, 1, ["HODI", "HOD2I", "HOD3I"]);
                    }
                }
            } else if (param1.currentTarget == SALESPECIALSPOPUP._popup.bAction3) {
                if (TUTORIAL._stage < 200) {
                    POPUPS.Next();
                } else {
                    BUILDINGS._buildingID = 120;
                    BUILDINGS.Show();
                    BUILDINGS._mc.SwitchB(4, 4, 0);
                    POPUPS.Next();
                }
            }
        } else {
            BUY.MidGameOffers(SALESPECIALSPOPUP._page);
        }
    }

    public static Hide(): void {
        if (SALESPECIALSPOPUP._open) {
            SOUNDS.Play("close");
            SALESPECIALSPOPUP._open = false;
            SALESPECIALSPOPUP._popup.removeEventListener(Event.ENTER_FRAME, SALESPECIALSPOPUP.Tick);
            if (SALESPECIALSPOPUP._popup.bAction) {
                SALESPECIALSPOPUP._popup.bAction.removeEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
            }
            if (SALESPECIALSPOPUP._popup.bAction2) {
                SALESPECIALSPOPUP._popup.bAction2.removeEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
            }
            if (SALESPECIALSPOPUP._popup.bAction3) {
                SALESPECIALSPOPUP._popup.bAction3.removeEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
            }
            if (SALESPECIALSPOPUP._popup.bAction4) {
                SALESPECIALSPOPUP._popup.bAction4.removeEventListener(MouseEvent.CLICK, SALESPECIALSPOPUP.OnActionClick);
            }
            POPUPS.Next();
        }
    }

    public Switch(param1: string = "text"): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: MovieClip = null;
        let _loc5_: int = 0;
        let _loc6_: store_icon_CLIP = null;
        this.gotoAndStop("redeem");
        switch (param1) {
            case "text":
                SALESPECIALSPOPUP._props = this._textProps;
                break;
            case "gift":
                SALESPECIALSPOPUP._props = this._giftProps;
                break;
            case "giftconfirm":
                SALESPECIALSPOPUP._props = this._giftConfirmProps;
                break;
            case "shinydiscount":
                SALESPECIALSPOPUP._props = this._shinyDiscountProps;
                break;
            case "shinybonus":
                SALESPECIALSPOPUP._props = this._shinyBonusProps;
                break;
            case "biggulp":
                this.gotoAndStop("redeem");
                if (TUTORIAL._stage < 200) {
                    SALESPECIALSPOPUP._props = this._sevenElevenBigGulpTutorialProps;
                } else {
                    SALESPECIALSPOPUP._props = this._sevenElevenBigGulpProps;
                }
        }
        if (param1 == "biggulp") {
            this.gotoAndStop("redeem");
            if (this.bAction) {
                this.bAction.visible = false;
            }
            if (this.bAction2) {
                this.bAction2.visible = false;
            }
            this.bAction3.x = Number(SALESPECIALSPOPUP._props.bActionX);
            this.bAction3.y = Number(SALESPECIALSPOPUP._props.bActionY);
            this.bAction3.width = Number(SALESPECIALSPOPUP._props.bActionW);
            this.bAction3.height = Number(SALESPECIALSPOPUP._props.bActionH);
            this.bAction3.txt.htmlText = SALESPECIALSPOPUP._props.bActionText;
            this.bAction3.visible = true;
            this.bAction4.x = Number(SALESPECIALSPOPUP._props.bAction2X);
            this.bAction4.y = Number(SALESPECIALSPOPUP._props.bAction2Y);
            this.bAction4.width = Number(SALESPECIALSPOPUP._props.bAction2W);
            this.bAction4.height = Number(SALESPECIALSPOPUP._props.bAction2H);
            this.bAction4.txt.htmlText = SALESPECIALSPOPUP._props.bActionText2;
            if (TUTORIAL._stage < 200) {
                if (this.bAction3) {
                    this.bAction3.visible = true;
                    this.bAction3.txt.htmlText = KEYS.Get("tut_continue");
                }
                if (this.bAction4) {
                    this.bAction4.visible = false;
                }
            } else {
                if (this.bAction3) {
                    this.bAction3.visible = true;
                }
                if (this.bAction4) {
                    this.bAction4.visible = true;
                }
            }
        } else {
            this.tTitle.x = Number(SALESPECIALSPOPUP._props.tTitleX);
            this.tTitle.y = Number(SALESPECIALSPOPUP._props.tTitleY);
            this.tTitle.width = Number(SALESPECIALSPOPUP._props.tTitleW);
            this.tTitle.height = Number(SALESPECIALSPOPUP._props.tTitleH);
            this.tTitle.htmlText = as3.str(SALESPECIALSPOPUP._props.tTitleText);
            this.tDesc.x = Number(SALESPECIALSPOPUP._props.tDescX);
            this.tDesc.y = Number(SALESPECIALSPOPUP._props.tDescY);
            this.tDesc.width = Number(SALESPECIALSPOPUP._props.tDescW);
            this.tDesc.height = Number(SALESPECIALSPOPUP._props.tDescH);
            this.tDesc.htmlText = as3.str(SALESPECIALSPOPUP._props.tTitleText);
            this.bAction.x = Number(SALESPECIALSPOPUP._props.bActionX);
            this.bAction.y = Number(SALESPECIALSPOPUP._props.bActionY);
            this.bAction.width = Number(SALESPECIALSPOPUP._props.bActionW);
            this.bAction.height = Number(SALESPECIALSPOPUP._props.bActionH);
            this.bAction.Setup(as3.str(SALESPECIALSPOPUP._props.bActionText));
            this.bAction.visible = true;
            this.bAction2.x = Number(SALESPECIALSPOPUP._props.bAction2X);
            this.bAction2.y = Number(SALESPECIALSPOPUP._props.bAction2Y);
            this.bAction2.width = Number(SALESPECIALSPOPUP._props.bAction2W);
            this.bAction2.height = Number(SALESPECIALSPOPUP._props.bAction2H);
            this.bAction2.Setup(as3.str(SALESPECIALSPOPUP._props.bActionText2));
        }
        if (SALESPECIALSPOPUP._page != "biggulp") {
            this.bAction2.visible = false;
        }
        this.mcFrame.x = Number(SALESPECIALSPOPUP._props.mcFrameX);
        this.mcFrame.y = Number(SALESPECIALSPOPUP._props.mcFrameY);
        this.mcFrame.width = Number(SALESPECIALSPOPUP._props.mcFrameW);
        this.mcFrame.height = Number(SALESPECIALSPOPUP._props.mcFrameH);
        if (SALESPECIALSPOPUP._page == "gift" || SALESPECIALSPOPUP._page == "giftconfirm") {
            if (Boolean(SALESPECIALSPOPUP._iconsDO) && Boolean(SALESPECIALSPOPUP._iconsDO.parent)) {
                SALESPECIALSPOPUP._iconsDO.parent.removeChild(SALESPECIALSPOPUP._iconsDO);
                SALESPECIALSPOPUP._iconsDO = null;
            }
            this._giftsArray = [];
            _loc2_ = Number(SALESPECIALSPOPUP._props.mcIconsX);
            _loc3_ = Number(SALESPECIALSPOPUP._props.mcIconsY);
            _loc4_ = new MovieClip();
            _loc5_ = 0;
            while (_loc5_ < this._numGifts) {
                (_loc6_ = new store_icon_CLIP()).gotoAndStop(this._giftItem);
                _loc6_.x = _loc2_;
                _loc6_.y = _loc3_;
                _loc2_ += this._giftSpacing + _loc6_.width;
                _loc4_.addChild(_loc6_);
                _loc5_++;
            }
            SALESPECIALSPOPUP._iconsDO = this.addChild(_loc4_);
        }
        this.Update(SALESPECIALSPOPUP._page);
    }

    public Update(param1: string = "text"): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        if (SALESPECIALSPOPUP._page != "biggulp") {
            _loc2_ = "";
            _loc4_ = SALESPECIALSPOPUP._saleEnd - GLOBAL.Timestamp();
            _loc3_ = GLOBAL.ToTime(_loc4_ | 0);
            _loc2_ += SALESPECIALSPOPUP._props.tDescText1;
            if (SALESPECIALSPOPUP._page != "giftconfirm") {
                _loc2_ += "<b>" + _loc3_ + "</b>";
            }
            _loc2_ += SALESPECIALSPOPUP._props.tDescText2;
            _loc2_ += SALESPECIALSPOPUP._props.tDescText3;
            this.tDesc.htmlText = _loc2_;
            this.tDesc.autoSize = TextFieldAutoSize.CENTER;
        }
    }

    public Hide(param1: MouseEvent = null): void {
        SALESPECIALSPOPUP.Hide();
    }
}
