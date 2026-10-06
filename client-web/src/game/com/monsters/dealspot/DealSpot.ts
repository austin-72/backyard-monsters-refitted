import * as as3 from "as3";
import { int } from "as3";
import { Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { URLRequest } from "flash/net";
import { LoaderContext, Security } from "flash/system";
import { GLOBAL, KEYS, UI_TOP } from "@game";

export class DealSpot extends MovieClip {
    static {
        as3.fields(this, { _loader: null, _icon: null, _req: null, _reqURL: "http://assets.tp-cdn.com/static3/swf/dealspot.swf?", _reqAppID: "app_id=", _reqSID: "&mode=fbpayments&sid=", _reqCurrID: "&currency_url=", _tp2: "&touchpoint=2", _appIDVal: null, _sidVal: null, _currIDVal: null, _hasOffers: true, _isClick: false, _top: null });
    }

    public _loader: Loader;
    public _icon: MovieClip;
    public _req: URLRequest;
    public _reqURL: string;
    public _reqAppID: string;
    public _reqSID: string;
    public _reqCurrID: string;
    public _tp2: string;
    public _appIDVal: string;
    public _sidVal: string;
    public _currIDVal: string;
    public _hasOffers: boolean;
    public _isClick: boolean;
    public _top: UI_TOP;

    public $ctor(param1?: UI_TOP): void {
        super.$ctor();
        let _loc2_: LoaderContext = new LoaderContext();
        _loc2_.checkPolicyFile = true;
        Security.allowDomain("*");
        this._appIDVal = GLOBAL._appid;
        this._sidVal = GLOBAL._tpid;
        this._currIDVal = GLOBAL._currencyURL;
        this._top = param1;
        this._loader = new Loader();
        this._req = new URLRequest("" + this._reqURL + this._reqAppID + this._appIDVal + this._reqSID + this._sidVal + this._reqCurrID + this._currIDVal + this._tp2);
        this._loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, GLOBAL.handleLoadError);
        this._loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onLoaderFinish));
        this._loader.addEventListener("trialpayClick", as3.bind(this, this.trialpayClick));
        this._loader.addEventListener("onOfferUnavailable", as3.bind(this, this.trialpayOfferUnavailable));
        if (ExternalInterface.available) {
            this._loader.load(this._req);
            this.addEventListener("trialpayClick", as3.bind(this, this.trialpayClick));
            this.addEventListener("trialpayOfferUnavailable", as3.bind(this, this.trialpayOfferUnavailable));
        }
    }

    public onLoaderFinish(param1: Event): void {
        this.addChild(this._loader.content);
        this._loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, as3.bind(this, this.onLoaderFinish));
        this._loader.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, GLOBAL.handleLoadError);
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onRollOver));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onRollOut));
        this._loader.removeEventListener("trialpayClick", as3.bind(this, this.trialpayClick));
        this._loader.removeEventListener("onOfferUnavailable", as3.bind(this, this.trialpayOfferUnavailable));
    }

    public onRollOver(param1: MouseEvent): void {
        if (this._top._bubbleDo) {
            this._top.BubbleHide();
        }
        let _loc2_: string = KEYS.Get("popup_earnshiny");
        let _loc3_: int = (this.parent.x + 80) | 0;
        let _loc4_: int = (this.parent.y + 50) | 0;
        this._top.BubbleShow(_loc3_, _loc4_, _loc2_);
    }

    public onRollOut(param1: MouseEvent): void {
        this._top.BubbleHide();
    }

    public trialpayClick(param1: Event): void {
        this._isClick = true;
    }

    public trialpayOfferUnavailable(param1: Event): void {
        this.visible = false;
        this.enabled = false;
        this.removeEventListener("trialpayClick", as3.bind(this, this.trialpayClick));
        this.removeEventListener("trialpayOfferUnavailable", as3.bind(this, this.trialpayOfferUnavailable));
        this.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onRollOver));
        this.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onRollOut));
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
