import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, EventDispatcher, IOErrorEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { getTimer } from "flash/utils";
import { BASE, GLOBAL, KEYS, LOGGER, MAPROOM_DESCENT, PLEASEWAIT, SecNum, URLLoaderApi, WMBASE } from "@game";

export class INFERNOAPI extends EventDispatcher {
    public static _baseID: int = 0;

    public static _wmID: int = 0;

    public static _saving: boolean = false;

    public static _loading: boolean = false;

    public static _initialized: boolean = false;

    private static _loadedSomething: boolean = false;

    private static _loadType: string = null;

    private static _prevMode: string = null;

    public static _infernoLoadData: any = {};

    public static _descentLoadData: any = {};

    public static _wmBasesDescent: any[] = null;

    public static _wmBasesInferno: any[] = null;

    public static _wmBases: any[] = null;

    public static _descentLootData: any = null;

    private static _infernoapi: INFERNOAPI = null;

    private static eventDispatcher: EventDispatcher = null;

    public static readonly EVENT_DESCENTLOADED: string = "descentDataProcessed";

    public $ctor(param1?: any /* InternalClass */): void {
        super.$ctor();
        INFERNOAPI._infernoapi = this;
    }

    public static getInstance(): INFERNOAPI {
        if (INFERNOAPI._infernoapi == null) {
            INFERNOAPI._infernoapi = new INFERNOAPI(new InternalClass());
        }
        return INFERNOAPI._infernoapi;
    }

    public static Cleanup(): void {
        INFERNOAPI._infernoLoadData = {};
        INFERNOAPI._descentLoadData = {};
    }

    public static LoadInfernoData(param1: string = null, param2: int = 0, param3: int = 0, param4: string = "idescent", param5: boolean = false): void {
        let tmpMode: string = null;
        let loadVars: any[] = null;
        let handleLoadSuccessful: Function = null;
        let handleLoadError: Function = null;
        let url: string = param1;
        let userid: int = param2;
        let baseid: int = param3;
        let mode: string = param4;
        let createinfernobase: boolean = param5;
        handleLoadSuccessful = (param1: any): void => {
            if (param1.error == 0) {
                if (!INFERNOAPI._loadedSomething && ExternalInterface.available) {
                    ExternalInterface.call("cc.recordStats", "baseend");
                    INFERNOAPI._loadedSomething = true;
                }
                if (INFERNOAPI._loadType == "idescent") {
                    INFERNOAPI._descentLoadData = param1;
                    if (param1.wmstatus) {
                        INFERNOAPI._wmBasesDescent = as3.cast(param1.wmstatus, Array);
                        INFERNOAPI.ProcessWmBases(INFERNOAPI._wmBasesDescent);
                        INFERNOAPI.DescentDataReady();
                    }
                    if (param1.resources) {
                        INFERNOAPI._descentLootData = param1.resources;
                        if (INFERNOAPI._descentLootData.r1) {
                            MAPROOM_DESCENT._loot.r1 = new SecNum(INFERNOAPI._descentLootData.r1 | 0);
                        } else {
                            MAPROOM_DESCENT._loot.r1 = new SecNum(0);
                        }
                        if (INFERNOAPI._descentLootData.r2) {
                            MAPROOM_DESCENT._loot.r2 = new SecNum(INFERNOAPI._descentLootData.r2 | 0);
                        } else {
                            MAPROOM_DESCENT._loot.r2 = new SecNum(0);
                        }
                        if (INFERNOAPI._descentLootData.r3) {
                            MAPROOM_DESCENT._loot.r3 = new SecNum(INFERNOAPI._descentLootData.r3 | 0);
                        } else {
                            MAPROOM_DESCENT._loot.r3 = new SecNum(0);
                        }
                        if (INFERNOAPI._descentLootData.r4) {
                            MAPROOM_DESCENT._loot.r4 = new SecNum(INFERNOAPI._descentLootData.r4 | 0);
                        } else {
                            MAPROOM_DESCENT._loot.r4 = new SecNum(0);
                        }
                    } else {
                        INFERNOAPI._descentLootData = {};
                        MAPROOM_DESCENT._loot.r1 = new SecNum(0);
                        MAPROOM_DESCENT._loot.r2 = new SecNum(0);
                        MAPROOM_DESCENT._loot.r3 = new SecNum(0);
                        MAPROOM_DESCENT._loot.r4 = new SecNum(0);
                    }
                } else if (BASE.isInfernoMainYardOrOutpost) {
                    INFERNOAPI._infernoLoadData = param1;
                }
                GLOBAL.WaitHide();
            }
            INFERNOAPI._loading = false;
        };
        handleLoadError = (param1: IOErrorEvent): void => {
            if (GLOBAL._reloadonerror && !GLOBAL.INFERNO_ONLY) {
                GLOBAL.CallJS("reloadPage");
            } else {
                LOGGER.Log("err", "INFERNOAPI.Load HTTP");
                PLEASEWAIT.Hide();
                GLOBAL.ErrorMessage("INFERNO.Load HTTP");
            }
            INFERNOAPI._loading = false;
        };
        let t: int = getTimer();
        INFERNOAPI._loading = true;
        INFERNOAPI._baseID = baseid;
        PLEASEWAIT.Hide();
        INFERNOAPI.Cleanup();
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        tmpMode = GLOBAL.mode;
        INFERNOAPI._loadType = mode;
        loadVars = [["userid", userid > 0 ? userid : ""], ["baseid", INFERNOAPI._baseID], ["type", INFERNOAPI._loadType]];
        if (url) {
            new URLLoaderApi().load(url + "load", loadVars, handleLoadSuccessful, handleLoadError);
        } else if (BASE.isInfernoMainYardOrOutpost) {
            new URLLoaderApi().load(GLOBAL._infBaseURL + "load", loadVars, handleLoadSuccessful, handleLoadError);
        } else {
            new URLLoaderApi().load(GLOBAL._baseURL + "load", loadVars, handleLoadSuccessful, handleLoadError);
        }
    }

    public static ProcessWmBases(param1: any[]): void {
        if (WMBASE._bases) {
            INFERNOAPI._wmBases = WMBASE._bases;
        }
        WMBASE.DescentData(param1);
    }

    public static RevertWmBases(): boolean {
        if (INFERNOAPI._wmBases) {
            WMBASE._bases = INFERNOAPI._wmBases;
            return true;
        }
        return false;
    }

    public static DescentDataReady(): void {
        INFERNOAPI.dispatchEvent(new Event(INFERNOAPI.EVENT_DESCENTLOADED));
    }

    public static addEventListener(param1: string, param2: Function, param3: boolean = false, param4: int = 0, param5: boolean = false): void {
        INFERNOAPI.getInstance().addEventListener(param1, param2, param3, param4, param5);
    }

    public static dispatchEvent(param1: Event): boolean {
        return INFERNOAPI.getInstance().dispatchEvent(param1);
    }

    public static removeEventListener(param1: string, param2: Function, param3: boolean = false): void {
        INFERNOAPI.getInstance().removeEventListener(param1, param2, param3);
    }

    public static hasEventListener(param1: string): boolean {
        return INFERNOAPI.getInstance().hasEventListener(param1);
    }

    public static willTrigger(param1: string): boolean {
        return INFERNOAPI.getInstance().willTrigger(param1);
    }
}

class InternalClass extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }
}
