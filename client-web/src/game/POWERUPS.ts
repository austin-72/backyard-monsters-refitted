import { ASObject, int } from "as3";
import { ALLIANCES, AllianceArmamentBuff, AllianceConquestBuff, AllianceDeclareWarBuff, BASE, BaseBuffHandler, Console, GLOBAL, LOGIN, SecNum } from "@game";

export class POWERUPS extends ASObject {
    public static _powerups: any = null;

    public static _attpowerups: any = null;

    public static _powerupProps: any = null;

    public static _mypowerups: any = null;

    public static OFFENSE: boolean = false;

    public static DEFENSE: boolean = false;

    public static NORMAL: boolean = false;

    public static readonly ALLIANCE_TYPE_DEFENSE: string = "DEFENSE";

    public static readonly ALLIANCE_ARMAMENT: string = "ap_armament";

    public static readonly ALLIANCE_CONQUEST: string = "ap_conquest";

    public static readonly ALLIANCE_DECLAREWAR: string = "ap_declarewar";

    public static readonly _expireRealTime: boolean = false;

    public static readonly _updateOnPage: boolean = true;

    public static _testToggleOffPowers: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: any[] = null, param2: any[] = null, param3: boolean = false): void {
        let _loc4_: int = 0;
        let _loc5_: SecNum = null;
        if (!POWERUPS._powerupProps) {
            POWERUPS._powerupProps = new Object();
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_ARMAMENT] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowArmament };
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_CONQUEST] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowConquest };
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_DECLAREWAR] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowDeclareWar };
            if (!POWERUPS._powerups) {
                POWERUPS._powerups = new Object();
            }
            if (!POWERUPS._attpowerups) {
                POWERUPS._attpowerups = new Object();
            }
            if (!POWERUPS._mypowerups) {
                POWERUPS._mypowerups = new Object();
            }
        }
        POWERUPS.GetMode();
        POWERUPS.Clear(param3);
        if (POWERUPS._testToggleOffPowers || !POWERUPS._updateOnPage) {
            return;
        }
        if (param1) {
            _loc4_ = 0;
            while (_loc4_ < param1.length) {
                if (Boolean(param1[_loc4_].id) && Boolean(param1[_loc4_].endtime)) {
                    (_loc5_ = new SecNum(0)).Set(Number(param1[_loc4_].endtime));
                    POWERUPS._powerups[param1[_loc4_].id] = { "name": param1[_loc4_].id, "endtime": _loc5_ };
                    if (POWERUPS.DEFENSE) {
                        POWERUPS._mypowerups[param1[_loc4_].id] = { "name": param1[_loc4_].id, "endtime": _loc5_ };
                    }
                }
                _loc4_++;
            }
        }
        if (param2) {
            _loc4_ = 0;
            while (_loc4_ < param2.length) {
                if (Boolean(param2[_loc4_].id) && Boolean(param2[_loc4_].endtime)) {
                    (_loc5_ = new SecNum(0)).Set(Number(param2[_loc4_].endtime));
                    POWERUPS._attpowerups[param2[_loc4_].id] = { "name": param2[_loc4_].id, "endtime": _loc5_ };
                    if (POWERUPS.OFFENSE) {
                        POWERUPS._mypowerups[param2[_loc4_].id] = { "name": param2[_loc4_].id, "endtime": _loc5_ };
                    } else if (POWERUPS.NORMAL) {
                        POWERUPS._mypowerups[param2[_loc4_].id] = { "name": param2[_loc4_].id, "endtime": _loc5_ };
                    }
                }
                _loc4_++;
            }
        }
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_ARMAMENT) && POWERUPS.DEFENSE && !BaseBuffHandler.instance.getBuffByID(AllianceArmamentBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceArmamentBuff.ID);
        }
        if (Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_CONQUEST)) && !BaseBuffHandler.instance.getBuffByID(AllianceConquestBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceConquestBuff.ID);
        }
        if (Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR)) && !BaseBuffHandler.instance.getBuffByID(AllianceDeclareWarBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceDeclareWarBuff.ID);
        }
    }

    public static Apply(param1: string, param2: any[]): number {
        let _loc4_: Function = null;
        POWERUPS.GetMode();
        let _loc3_: number = 0;
        if (POWERUPS.NORMAL) {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._mypowerups && Boolean(POWERUPS._mypowerups[param1])) {
                _loc4_ = POWERUPS._powerupProps[param1].mod;
                if (POWERUPS._expireRealTime && POWERUPS._mypowerups[param1].endtime.Get() < GLOBAL.Timestamp()) {
                    _loc3_ = Number(param2[0]);
                } else {
                    _loc3_ = Number(_loc4_.apply(null, param2));
                }
            } else {
                _loc3_ = Number(param2[0]);
            }
        }
        if (POWERUPS.DEFENSE) {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._powerups && Boolean(POWERUPS._powerups[param1])) {
                _loc4_ = POWERUPS._powerupProps[param1].mod;
                if (POWERUPS._expireRealTime && POWERUPS._powerups[param1].endtime.Get() < GLOBAL.Timestamp()) {
                    _loc3_ = Number(param2[0]);
                } else {
                    _loc3_ = Number(_loc4_.apply(null, param2));
                }
            } else {
                _loc3_ = Number(param2[0]);
            }
        }
        if (POWERUPS.OFFENSE) {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._attpowerups && Boolean(POWERUPS._attpowerups[param1])) {
                _loc4_ = POWERUPS._powerupProps[param1].mod;
                if (POWERUPS._expireRealTime && POWERUPS._attpowerups[param1].endtime.Get() < GLOBAL.Timestamp()) {
                    _loc3_ = Number(param2[0]);
                } else {
                    _loc3_ = Number(_loc4_.apply(null, param2));
                }
            } else {
                _loc3_ = Number(param2[0]);
            }
        }
        return _loc3_;
    }

    public static CheckPowers(param1: string = null, param2: string = null): int {
        let _loc3_: any = null;
        let _loc4_: number = NaN;
        let _loc5_: string = null;
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL) {
            _loc3_ = POWERUPS._mypowerups;
        }
        if (POWERUPS.DEFENSE) {
            _loc3_ = POWERUPS._powerups;
        }
        if (POWERUPS.OFFENSE) {
            _loc3_ = POWERUPS._attpowerups;
        }
        if (param2) {
            if (param2 == "NORMAL") {
                _loc3_ = POWERUPS._mypowerups;
            }
            if (param2 == "DEFENSE") {
                _loc3_ = POWERUPS._powerups;
            }
            if (param2 == "OFFENSE") {
                _loc3_ = POWERUPS._attpowerups;
            }
        }
        if (param1) {
            if (Boolean(_loc3_) && Boolean(_loc3_[param1])) {
                if (POWERUPS._expireRealTime) {
                    if (_loc3_[param1].endtime.Get() < GLOBAL.Timestamp()) {
                        return 0;
                    }
                }
                return 1;
            }
            return 0;
        }
        _loc4_ = 0;
        for (_loc5_ in _loc3_) {
            if (POWERUPS._expireRealTime) {
                if (_loc3_[_loc5_].endtime.Get() > GLOBAL.Timestamp()) {
                    _loc4_++;
                }
            } else {
                _loc4_++;
            }
        }
        return _loc4_ | 0;
    }

    public static Timeleft(param1: string, param2: string = null): number {
        let _loc3_: any = null;
        let _loc4_: number = NaN;
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL) {
            _loc3_ = POWERUPS._mypowerups;
        }
        if (POWERUPS.DEFENSE) {
            _loc3_ = POWERUPS._powerups;
        }
        if (POWERUPS.OFFENSE) {
            _loc3_ = POWERUPS._attpowerups;
        }
        if (param2) {
            if (param2 == "NORMAL") {
                _loc3_ = POWERUPS._mypowerups;
            }
            if (param2 == "DEFENSE") {
                _loc3_ = POWERUPS._powerups;
            }
            if (param2 == "OFFENSE") {
                _loc3_ = POWERUPS._attpowerups;
            }
        }
        if (Boolean(_loc3_) && Boolean(_loc3_[param1])) {
            return _loc3_[param1].endtime.Get() - GLOBAL.Timestamp();
        }
        return 0;
    }

    public static Remove(param1: string, param2: string = null): void {
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL || param2 == "NORMAL") {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._mypowerups && Boolean(POWERUPS._mypowerups[param1])) {
                POWERUPS._mypowerups[param1].endtime.Set(GLOBAL.Timestamp());
            }
        }
        if (POWERUPS.DEFENSE || param2 == "DEFENSE") {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._powerups && Boolean(POWERUPS._powerups[param1])) {
                POWERUPS._powerups[param1].endtime.Set(GLOBAL.Timestamp());
            }
        }
        if (POWERUPS.OFFENSE || param2 == "OFFENSE") {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._attpowerups && Boolean(POWERUPS._attpowerups[param1])) {
                POWERUPS._attpowerups[param1].endtime.Set(GLOBAL.Timestamp());
            }
        }
    }

    public static GetMode(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            POWERUPS.OFFENSE = true;
            POWERUPS.DEFENSE = false;
            POWERUPS.NORMAL = false;
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            POWERUPS.OFFENSE = false;
            POWERUPS.DEFENSE = true;
            POWERUPS.NORMAL = false;
        } else {
            POWERUPS.OFFENSE = false;
            POWERUPS.DEFENSE = false;
            POWERUPS.NORMAL = true;
        }
    }

    public static GetPowerups(param1: string = null): any {
        let _loc2_: any = null;
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL) {
            _loc2_ = POWERUPS._mypowerups;
        }
        if (POWERUPS.DEFENSE) {
            _loc2_ = POWERUPS._powerups;
        }
        if (POWERUPS.OFFENSE) {
            _loc2_ = POWERUPS._attpowerups;
        }
        if (param1) {
            if (param1 == "NORMAL") {
                _loc2_ = POWERUPS._mypowerups;
            }
            if (param1 == "DEFENSE") {
                _loc2_ = POWERUPS._powerups;
            }
            if (param1 == "OFFENSE") {
                _loc2_ = POWERUPS._attpowerups;
            }
        }
        return _loc2_;
    }

    private static PowArmament(...rest: any[]): number {
        Console.warning("Alliance Armament shouldnt be called this way, it should be a base buff");
        return 0;
    }

    private static PowConquest(...rest: any[]): number {
        return Math.ceil(rest[0] * 0.75);
    }

    private static PowDeclareWar(...rest: any[]): number {
        let _loc2_: number = Number(rest[0]);
        return Number(rest[0] + 2);
    }

    public static Clear(param1: boolean = false): void {
        if (POWERUPS._updateOnPage || param1) {
            if (POWERUPS._powerups) {
                POWERUPS._powerups = null;
            }
            POWERUPS._powerups = new Object();
            if (POWERUPS._attpowerups) {
                POWERUPS._attpowerups = null;
            }
            POWERUPS._attpowerups = new Object();
            if (POWERUPS._mypowerups) {
                POWERUPS._mypowerups = null;
            }
            POWERUPS._mypowerups = new Object();
        }
    }

    public static Validate(): void {
        POWERUPS.GetMode();
        if (!ALLIANCES._myAlliance) {
            if (POWERUPS._mypowerups) {
                POWERUPS._mypowerups = null;
            }
            POWERUPS._mypowerups = new Object();
        }
        if (POWERUPS.DEFENSE && !ALLIANCES._allianceID && BASE._userID == LOGIN._playerID) {
            if (POWERUPS._powerups) {
                POWERUPS._powerups = null;
            }
            POWERUPS._powerups = new Object();
        }
        if (POWERUPS.OFFENSE && !ALLIANCES._allianceID && BASE._userID != LOGIN._playerID) {
            if (POWERUPS._attpowerups) {
                POWERUPS._attpowerups = null;
            }
            POWERUPS._attpowerups = new Object();
        }
    }
}
