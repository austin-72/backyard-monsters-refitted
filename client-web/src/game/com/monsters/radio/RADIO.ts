import * as as3 from "as3";
import { ASObject } from "as3";
import { StageDisplayState } from "flash/display";
import { GLOBAL, KEYS, LOGGER, LOGIN, MAP, QUESTS, RADIOSETTINGSPOPUP, UI2, URLLoaderApi } from "@game";

export class RADIO extends ASObject {
    public static _init: boolean = false;

    public static _open: boolean = false;

    public static _twitterAccount: string = null;

    private static _requestedName: boolean = false;

    private static _mc: RADIOSETTINGSPOPUP = null;

    public static _proxymode: boolean = false;

    public static _settings: any = null;

    public static _isSaving: boolean = false;

    public static readonly ATTACK_KEY: string = "att";

    public static readonly NEWS_KEY: string = "news";

    public static readonly ADDRESS_KEY: string = "address";

    public static readonly PROXY_KEY: string = "proxy";

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: any = null): void {
        if (param1) {
            RADIO._settings = param1;
        } else if (LOGIN._settings) {
            RADIO._settings = LOGIN._settings;
        } else {
            RADIO._settings = {};
        }
    }

    public static SubmitEmail(): void {
    }

    public static getProp(param1: string): any {
        if (Boolean(RADIO._settings) && RADIO._settings.hasOwnProperty(param1)) {
            return RADIO._settings[param1];
        }
        return null;
    }

    public static setProp(param1: string, param2: any): void {
        RADIO._settings[param1] = param2;
        let _loc3_: string = JSON.stringify(RADIO._settings);
        new URLLoaderApi().load(GLOBAL._apiURL + "player/updateemail", [["settings", _loc3_]], RADIO.handleSettingsSaveSucc, RADIO.handleSettingsSaveFail);
        RADIO._isSaving = true;
        RADIO._mc.bSaveToggle();
    }

    private static handleSettingsSaveSucc(param1: any): void {
        RADIO._isSaving = false;
        RADIO._mc.bSaveToggle();
        if (param1.error == 0) {
            GLOBAL.Message(KEYS.Get("radio_saveSucc"), null, null, null);
            RADIO.Hide();
        } else {
            LOGGER.Log("err", "|RADIO| - handleSettingsSaveSucc - Fail" + JSON.stringify(param1));
            GLOBAL.Message(KEYS.Get("radio_saveFail"), null, null, null);
        }
    }

    private static handleSettingsSaveFail(param1: any): void {
        RADIO._isSaving = false;
        GLOBAL.Message(KEYS.Get("radio_saveFail"), null, null, null);
    }

    public static TwitterCallback(param1: string): void {
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.error) {
            if (_loc2_.error != "noname") {
                LOGGER.Log("err", "radio: " + _loc2_.error);
                GLOBAL.Message(KEYS.Get("msg_err_radio") + _loc2_.error + "<br><br>" + KEYS.Get("msg_tryagain"));
            }
        } else if (_loc2_.name) {
            RADIO._twitterAccount = as3.str(_loc2_.name);
        }
    }

    public static TwitterSetName(param1: string): void {
        GLOBAL.CallJS("twitterInterface.setName", ["" + param1, "twitteraccount"], false);
        RADIO._twitterAccount = param1;
    }

    public static TwitterRemoveName(): void {
        GLOBAL.CallJS("twitterInterface.deleteName", ["twitteraccount"], false);
    }

    public static RemoveName(): void {
        let handleRemoveSucc: Function = null;
        let handleRemoveFail: Function = null;
        handleRemoveSucc = null;
        handleRemoveFail = null;
        let removeEmail: Function = (param1: string, param2: any): void => {
            RADIO._settings[param1] = param2;
            let _loc3_: string = JSON.stringify(RADIO._settings);
            new URLLoaderApi().load(GLOBAL._apiURL + "player/updateemail", [["settings", _loc3_]], handleRemoveSucc, handleRemoveFail);
            RADIO._isSaving = true;
        };
        handleRemoveSucc = (param1: any): void => {
            RADIO._isSaving = false;
            if (param1.error == 0) {
                GLOBAL.Message(KEYS.Get("radio_recycleConfirm"), null, null, null);
                RADIO.Hide();
            } else {
                LOGGER.Log("err", "|RADIO| - handleSettingsSaveSucc - Fail" + JSON.stringify(param1));
                GLOBAL.Message(KEYS.Get("radio_recycleConfirm"), null, null, null);
            }
        };
        handleRemoveFail = (param1: any): void => {
            RADIO._isSaving = false;
            GLOBAL.Message(KEYS.Get("radio_saveFail"), null, null, null);
        };
        let obj: any = {};
        obj[RADIO.ATTACK_KEY] = 0;
        if (obj[RADIO.ATTACK_KEY] == 1) {
            QUESTS._global.email_att = 1;
        }
        obj[RADIO.NEWS_KEY] = 0;
        if (obj[RADIO.NEWS_KEY] == 1) {
            QUESTS._global.email_news = 1;
        }
        obj[RADIO.ADDRESS_KEY] = LOGIN._email;
        removeEmail("o1", obj);
    }

    public static TwitterFollow(): void {
        GLOBAL.CallJS("openUrl", ["http://twitter.com/#!/BackyardMonster"], true);
    }

    public static TwitterBrag(): void {
        GLOBAL.CallJS("sendFeed", ["build-radio", KEYS.Get("radiobuilt_streamtitle"), KEYS.Get("radiobuilt_streambody"), "build-radio.v2.png"]);
    }

    public static Export(): any {
        return RADIO._settings;
    }

    public static Show(): void {
        if (!RADIO._open) {
            if (GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcZoom.gotoAndStop(1 + 3);
                } else {
                    UI2._top.mcZoom.gotoAndStop(1);
                }
                GLOBAL._ROOT.stage.displayState = StageDisplayState.NORMAL;
                GLOBAL._zoomed = false;
                MAP._GROUND.scaleX = MAP._GROUND.scaleY = 1;
                MAP.Focus(0, 0);
            }
            GLOBAL.BlockerAdd();
            RADIO._mc = new RADIOSETTINGSPOPUP();
            RADIO._mc.Center();
            RADIO._mc.ScaleUp();
            GLOBAL._layerWindows.addChild(RADIO._mc);
            RADIO._open = true;
        }
    }

    public static Hide(): void {
        if (RADIO._open) {
            GLOBAL.BlockerRemove();
            if (Boolean(RADIO._mc) && Boolean(RADIO._mc.parent)) {
                RADIO._mc.parent.removeChild(RADIO._mc);
            }
            RADIO._open = false;
        }
    }
}
