import * as as3 from "as3";
import { ASObject } from "as3";

export class BrowserInfo extends ASObject {
    static {
        as3.fields(this, { _platform: "undefined", _browser: "undefined", _version: "undefined" });
    }

    public static readonly WIN_PLATFORM: string = "win";

    public static readonly MAC_PLATFORM: string = "mac";

    public static readonly SAFARI_AGENT: string = "safari";

    public static readonly OPERA_AGENT: string = "opera";

    public static readonly IE_AGENT: string = "msie";

    public static readonly MOZILLA_AGENT: string = "mozilla";

    public static readonly CHROME_AGENT: string = "chrome";
    private _platform: string;
    private _browser: string;
    private _version: string;

    public $ctor(param1?: any, param2?: any, param3?: string): void {
        let _loc4_: string = null;
        let _loc5_: string = null;
        super.$ctor();
        if (!param1 || !param2 || !param3) {
            return;
        }
        this._version = as3.str(param1.version);
        for (_loc4_ in param1) {
            if (_loc4_ != "version") {
                if (param1[_loc4_] == true) {
                    this._browser = _loc4_;
                    break;
                }
            }
        }
        for (_loc5_ in param2) {
            if (param2[_loc5_] == true) {
                this._platform = _loc5_;
            }
        }
    }

    public get platform(): string {
        return this._platform;
    }

    public get browser(): string {
        return this._browser;
    }

    public get version(): string {
        return this._version;
    }
}
