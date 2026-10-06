import { ASObject, int } from "as3";
import { InstanceEnforcer } from "@game";

export class BYMConfig extends ASObject {
    public static readonly k_sLOCAL_MODE_TRUNK: int = 1;

    public static readonly k_sLOCAL_MODE_KONG: int = 2;

    public static readonly k_sLOCAL_MODE_VIXTEST: int = 3;

    public static readonly k_sLOCAL_MODE_VIXSTAGE: int = 4;

    public static readonly k_sLOCAL_MODE_INF_TRUNK: int = 5;

    public static readonly k_sLOCAL_MODE_LIVE: int = 6;

    public static readonly k_sLOCAL_MODE_VIXLIVE: int = 7;

    public static readonly k_sLOCAL_MODE_ALEX: int = 8;

    public static readonly k_sLOCAL_MODE_NICK: int = 9;

    public static readonly k_sLOCAL_MODE_KONGDEV: int = 10;

    public static readonly k_sLOCAL_MODE_KONGSTAGE: int = 11;

    public static readonly k_sLOCAL_MODE_PREVIEW: int = 12;

    public static readonly k_sLOCAL_MODE_STAGE: int = 13;

    public static readonly k_sVICTORY_THRESHOLD: number = 90;

    public static readonly k_sMAX_FORTIFICATION_LEVEL: int = 4;

    protected static _instance: BYMConfig = null;

    public $ctor(param1?: InstanceEnforcer): void {
        super.$ctor();
    }

    public static get instance(): BYMConfig {
        BYMConfig._instance ||= new BYMConfig(new InstanceEnforcer());
        return BYMConfig._instance;
    }

    public get RENDERER_ON(): boolean {
        // Originally set to false
        // Apparently, it is more performant to have this enabled
        // RENDERER_ON true = graphics are rendered using a bitmap approach
        // RENDERER_ON false = graphics are rendered using a vector approach / display list approach
        return true;
    }

    public get OPTIMIZED_SHADOWS(): boolean {
        return false;
    }

    public get AUTOBANK_FIX(): boolean {
        return true;
    }

    public get USE_CLIENT_WITH_CALLBACK(): boolean {
        return false;
    }

    public get BRUKKARG_WAR_ON(): boolean {
        return true;
    }

    public get INVITE_BUTTON(): boolean {
        return true;
    }

    public get LOCAL_MODE(): int {
        return BYMConfig.k_sLOCAL_MODE_TRUNK;
    }

    protected get enforcerInstance(): InstanceEnforcer {
        return new InstanceEnforcer();
    }

    public get fbData(): any {
        return null;
    }
}
