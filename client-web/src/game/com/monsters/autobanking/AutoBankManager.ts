import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { AutoBankBaseBuff, BASE, BFOUNDATION, BRESOURCE, BYMConfig, BaseBuffHandler, GLOBAL, InstanceManager, LOGGER, MapRoomManager, SecNum } from "@game";

export class AutoBankManager extends ASObject {
    private static k_OPKEY_TIME: string; // const

    private static k_OPKEY_BASE: string; // const

    private static k_OPKEY_TWIGS: string; // const

    private static k_OPKEY_PEBBLES: string; // const

    private static k_OPKEY_PUTTY: string; // const

    private static k_OPKEY_GOO: string; // const

    private static k_MAX_RESOURCES: uint; // const

    private static s_logCounter: int;

    static {
        as3.lazyStatics(this, { k_OPKEY_TIME: null, k_OPKEY_BASE: null, k_OPKEY_TWIGS: null, k_OPKEY_PEBBLES: null, k_OPKEY_PUTTY: null, k_OPKEY_GOO: null, k_MAX_RESOURCES: 0, s_logCounter: 0 }, () => {
            AutoBankManager.k_OPKEY_TIME = "t";
            AutoBankManager.k_OPKEY_BASE = "b";
            AutoBankManager.k_OPKEY_TWIGS = "r" + BRESOURCE.RESOURCE_TWIGS;
            AutoBankManager.k_OPKEY_PEBBLES = "r" + BRESOURCE.RESOURCE_PEBBLES;
            AutoBankManager.k_OPKEY_PUTTY = "r" + BRESOURCE.RESOURCE_PUTTY;
            AutoBankManager.k_OPKEY_GOO = "r" + BRESOURCE.RESOURCE_GOO;
            AutoBankManager.k_MAX_RESOURCES = 5;
            AutoBankManager.s_logCounter = 10;
        });
    }

    public $ctor(param1?: InstanceEnforcer): void {
        super.$ctor();
        if (!param1) {
            throw new Error("AutoBankManager is a static class not to be instantiated");
        }
    }

    public static get lastMapRoom3Time(): int {
        let _loc1_: int = 0;
        let _loc2_: string = null;
        for (_loc2_ in BASE.resourceCells) {
            if ((Number(_loc2_) | 0) > _loc1_) {
                _loc1_ = Number(_loc2_) | 0;
            }
        }
        return _loc1_;
    }

    public static updateSaveData(): any {
        let _loc1_: any = {};
        // Inferno-only: a Designer draft produces nothing for anyone (and a kit's draft, an outpost, has no
        // map cell to work its production out from).
        if (GLOBAL.ioDesignMode()) {
            return null;
        }
        AutoBankManager.setLocalGIP(_loc1_);
        if (MapRoomManager.instance.isInMapRoom2) {
            return AutoBankManager.updateBuildingResources(_loc1_);
        }
        if (MapRoomManager.instance.isInMapRoom3) {
            return BASE.resourceCells;
        }
        return null;
    }

    public static updateLoadData(param1: any, param2: any, param3: any, param4: int, param5: number): number {
        let _loc6_: string = null;
        let _loc7_: any = null;
        let _loc8_: int = 0;
        let _loc9_: any = null;
        let _loc10_: int = 0;
        AutoBankManager.s_logCounter = 10;
        if (param1) {
            if (param1[AutoBankManager.k_OPKEY_BASE + GLOBAL._homeBaseID]) {
                delete param1[AutoBankManager.k_OPKEY_BASE + GLOBAL._homeBaseID];
            }
            if (Boolean(param1[AutoBankManager.k_OPKEY_TIME]) && (GLOBAL.mode !== GLOBAL.e_BASE_MODE.ATTACK || BYMConfig.instance.AUTOBANK_FIX)) {
                param5 = Number(param1[AutoBankManager.k_OPKEY_TIME]);
                delete param1[AutoBankManager.k_OPKEY_TIME];
            } else {
                param5 = param4;
            }
            if (GLOBAL.Timestamp() - param5 > 3600 * 24 * 2) {
                param5 = GLOBAL.Timestamp() - 3600 * 24 * 2;
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                for (_loc6_ in param1) {
                    _loc7_ = param1[_loc6_];
                    if (_loc6_ == AutoBankManager.k_OPKEY_TIME) {
                        param5 = Number(param1[_loc6_]);
                    } else {
                        if (as3.is(_loc7_, String)) {
                            break;
                        }
                        if (_loc7_[AutoBankManager.k_OPKEY_TWIGS] != undefined) {
                            param3[_loc6_] = { "r1": new SecNum(Number(_loc7_[AutoBankManager.k_OPKEY_TWIGS])), "r2": new SecNum(Number(_loc7_[AutoBankManager.k_OPKEY_PEBBLES])), "r3": new SecNum(Number(_loc7_[AutoBankManager.k_OPKEY_PUTTY])), "r4": new SecNum(Number(_loc7_[AutoBankManager.k_OPKEY_GOO])) };
                        } else {
                            _loc8_ = param1[_loc6_]["height"] | 0;
                            if (_loc8_) {
                                delete _loc7_["height"];
                            } else {
                                _loc8_ = 100;
                            }
                            param3[_loc6_] = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
                            for (_loc9_ of as3.values(_loc7_)) {
                                if (_loc9_.t >= 1 && _loc9_.t < AutoBankManager.k_MAX_RESOURCES) {
                                    if (_loc9_.l) {
                                        _loc10_ = GLOBAL.outpostPropsTable[_loc9_.t - 1].produce[_loc9_.l - 1] | 0;
                                    } else {
                                        _loc10_ = GLOBAL.outpostPropsTable[_loc9_.t - 1].produce[0] | 0;
                                    }
                                    _loc10_ = Math.max((_loc10_ * GLOBAL._averageAltitude.Get() / _loc8_) | 0, 1) | 0;
                                    param3[_loc6_]["r" + _loc9_.t].Add(_loc10_);
                                }
                            }
                            param1[_loc6_] = { "r1": param3[_loc6_].r1.Get(), "r2": param3[_loc6_].r2.Get(), "r3": param3[_loc6_].r3.Get(), "r4": param3[_loc6_].r4.Get() };
                        }
                        param2[AutoBankManager.k_OPKEY_TWIGS].Add(param3[_loc6_][AutoBankManager.k_OPKEY_TWIGS].Get());
                        param2[AutoBankManager.k_OPKEY_PEBBLES].Add(param3[_loc6_][AutoBankManager.k_OPKEY_PEBBLES].Get());
                        param2[AutoBankManager.k_OPKEY_PUTTY].Add(param3[_loc6_][AutoBankManager.k_OPKEY_PUTTY].Get());
                        param2[AutoBankManager.k_OPKEY_GOO].Add(param3[_loc6_][AutoBankManager.k_OPKEY_GOO].Get());
                    }
                }
                param3[AutoBankManager.k_OPKEY_TIME] = param5;
            }
        }
        return param5;
    }

    public static setLocalGIP(param1: any): void {
        let _loc3_: string = null;
        let _loc2_: any = BASE._processedGIP;
        if (!MapRoomManager.instance.isInMapRoom3) {
            for (_loc3_ in _loc2_) {
                if (_loc3_ === AutoBankManager.k_OPKEY_TIME) {
                    if (BYMConfig.instance.AUTOBANK_FIX && GLOBAL.mode === GLOBAL.e_BASE_MODE.ATTACK && BASE.isOutpost) {
                        param1[_loc3_] = BASE._lastProcessedGIP;
                    } else if (!BASE.isMainYardInfernoOnly) {
                        param1[_loc3_] = GLOBAL.Timestamp();
                    } else {
                        param1[_loc3_] = BASE._lastProcessedGIP;
                    }
                } else {
                    param1[_loc3_] = { "r1": BASE._processedGIP[_loc3_][AutoBankManager.k_OPKEY_TWIGS].Get(), "r2": BASE._processedGIP[_loc3_][AutoBankManager.k_OPKEY_PEBBLES].Get(), "r3": BASE._processedGIP[_loc3_][AutoBankManager.k_OPKEY_PUTTY].Get(), "r4": BASE._processedGIP[_loc3_][AutoBankManager.k_OPKEY_GOO].Get() };
                }
            }
        } else {
            for (_loc3_ in _loc2_) {
                if (_loc3_ === AutoBankManager.k_OPKEY_TIME) {
                    param1[_loc3_] = GLOBAL.Timestamp();
                }
            }
        }
    }

    public static updateBuildingResources(param1: any): any {
        let _loc2_: uint = 0;
        let _loc3_: any = null;
        let _loc4_: Vector<any> = null;
        let _loc5_: BFOUNDATION = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        if (BASE.isOutpost) {
            _loc3_ = { "r1": 0, "r2": 0, "r3": 0, "r4": 0 };
            _loc4_ = InstanceManager.getInstancesByClass(BRESOURCE);
            for (_loc5_ of (_loc4_ ?? [])) {
                if (_loc5_._type >= 1 && _loc5_._type <= 4) {
                    if (_loc5_.health > 0) {
                        _loc6_ = _loc5_._lvl.Get() | 0;
                        _loc7_ = 0;
                        if (_loc5_._countdownUpgrade.Get() > 0) {
                            _loc6_++;
                        }
                        _loc7_ = _loc5_._buildingProps.produce[_loc6_ - 1] | 0;
                        _loc7_ = Math.max((_loc7_ * GLOBAL._averageAltitude.Get() / GLOBAL._currentCell.cellHeight) | 0, 1) | 0;
                        _loc3_["r" + _loc5_._type] += _loc7_;
                    }
                }
            }
            if (BASE._processedGIP[AutoBankManager.k_OPKEY_BASE + BASE._baseID]) {
                _loc2_ = 1;
                while (_loc2_ < AutoBankManager.k_MAX_RESOURCES) {
                    BASE._GIP["r" + _loc2_].Add(-BASE._processedGIP[AutoBankManager.k_OPKEY_BASE + BASE._baseID]["r" + _loc2_].Get());
                    BASE._processedGIP[AutoBankManager.k_OPKEY_BASE + BASE._baseID]["r" + _loc2_].Set(_loc3_["r" + _loc2_]);
                    BASE._rawGIP[AutoBankManager.k_OPKEY_BASE + BASE._baseID]["r" + _loc2_] = _loc3_["r" + _loc2_];
                    _loc2_++;
                }
            } else {
                BASE._processedGIP[AutoBankManager.k_OPKEY_BASE + BASE._baseID] = { "r1": new SecNum(Number(_loc3_[AutoBankManager.k_OPKEY_TWIGS])), "r2": new SecNum(Number(_loc3_[AutoBankManager.k_OPKEY_PEBBLES])), "r3": new SecNum(Number(_loc3_[AutoBankManager.k_OPKEY_PUTTY])), "r4": new SecNum(Number(_loc3_[AutoBankManager.k_OPKEY_GOO])) };
                BASE._rawGIP[AutoBankManager.k_OPKEY_BASE + BASE._baseID] = { "r1": _loc3_[AutoBankManager.k_OPKEY_TWIGS], "r2": _loc3_[AutoBankManager.k_OPKEY_PEBBLES], "r3": _loc3_[AutoBankManager.k_OPKEY_PUTTY], "r4": _loc3_[AutoBankManager.k_OPKEY_GOO] };
            }
            _loc2_ = 1;
            while (_loc2_ < AutoBankManager.k_MAX_RESOURCES) {
                BASE._GIP["r" + _loc2_].Add(_loc3_["r" + _loc2_]);
                _loc2_++;
            }
            param1[AutoBankManager.k_OPKEY_BASE + BASE._baseID] = _loc3_;
        }
        return param1;
    }

    public static autobank(param1: int = 10, param2: boolean = false): void {
        let _loc3_: any = null;
        let _loc4_: int = 0;
        let _loc5_: SecNum = null;
        let _loc6_: any[] = null;
        let _loc7_: SecNum = null;
        let _loc8_: Vector<string> = null;
        let _loc9_: int = 0;
        let _loc10_: string = null;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc13_: number = NaN;
        let _loc14_: AutoBankBaseBuff = null;
        if (MapRoomManager.instance.isInMapRoom2) {
            _loc3_ = BASE._GIP;
            if (!_loc3_) {
                return;
            }
            _loc5_ = new SecNum(0);
            _loc6_ = [new SecNum(0), new SecNum(0), new SecNum(0), new SecNum(0)];
            if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && Boolean(GLOBAL._harvesterOverdrivePower.Get())) {
                _loc7_ = GLOBAL._harvesterOverdrivePower;
            } else {
                _loc7_ = new SecNum(1);
            }
            _loc4_ = 1;
            while (_loc4_ < AutoBankManager.k_MAX_RESOURCES) {
                if (Boolean(_loc3_["r" + _loc4_]) && Boolean(_loc3_["r" + _loc4_].Get())) {
                    _loc6_[_loc4_ - 1].Set(BASE.Fund(_loc4_, _loc3_["r" + _loc4_].Get() * _loc7_.Get() * param1 / 10, false, null, false, false));
                    _loc5_.Add(Number(_loc6_[_loc4_ - 1].Get()));
                }
                if (param1 > 10 || AutoBankManager.s_logCounter == 0) {
                    if (_loc6_[_loc4_ - 1].Get() > 0) {
                        LOGGER.Stat([96, _loc4_, _loc6_[_loc4_ - 1].Get() * (param1 > 10 ? 1 : 10)]);
                    }
                    AutoBankManager.s_logCounter = 10;
                }
                _loc4_++;
            }
            BASE.PointsAdd(Math.ceil(_loc5_.Get() * 0.375) >>> 0);
        } else if (MapRoomManager.instance.isInMapRoom3) {
            _loc8_ = new Vector<string>(0, false, String);
            _loc13_ = 0;
            _loc14_ = as3.as(BaseBuffHandler.instance.getBuffByName(AutoBankBaseBuff.k_NAME), AutoBankBaseBuff);
            if (_loc14_) {
                AutoBankManager.fundAllResources(_loc14_.value * Math.max(0, param1), param2 || AutoBankManager.s_logCounter == 0);
            }
        }
        --AutoBankManager.s_logCounter;
    }

    private static sortKeys(param1: string, param2: string): int {
        return ((Number(param1) | 0) - (Number(param2) | 0)) | 0;
    }

    private static fundAllResources(param1: number, param2: boolean): void {
        let _loc3_: uint = 0;
        _loc3_ = 1;
        while (_loc3_ < AutoBankManager.k_MAX_RESOURCES) {
            BASE.Fund(_loc3_, param1, false, null, false, false);
            if (param2 && Boolean(param1)) {
                LOGGER.Stat([96, _loc3_, param1]);
            }
            _loc3_++;
        }
        if (param2) {
            AutoBankManager.s_logCounter = 10;
        }
    }
}

class InstanceEnforcer extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }
}
