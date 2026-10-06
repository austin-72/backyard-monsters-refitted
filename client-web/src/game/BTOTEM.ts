import * as as3 from "as3";
import { Vector, int } from "as3";
import { BASE, BDECORATION, BFOUNDATION, BUILDINGS, EnumInvasionType, GLOBAL, InstanceManager, InventoryManager, SecNum } from "@game";

export class BTOTEM extends BDECORATION {
    public static readonly BTOTEM_WMI1: int = 121;

    public static readonly BTOTEM_WMI2: int = 131;

    public $ctor(param1?: int): void {
        super.$ctor(param1);
        if (Boolean(BASE._buildingsStored["b" + this._type]) && Boolean(BASE._buildingsStored["bl" + this._type])) {
            this._lvl = new SecNum(Number(BASE._buildingsStored["bl" + this._type].Get()));
            this._hpLvl = this._lvl.Get() | 0;
        }
    }

    public static HasTotemPlaced(param1: boolean = false, param2: boolean = false): boolean {
        let _loc4_: BFOUNDATION = null;
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BDECORATION);
        for (_loc4_ of (_loc3_ ?? [])) {
            if (param1 && _loc4_._type == BTOTEM.BTOTEM_WMI1) {
                return true;
            }
            if (param2 && _loc4_._type === BTOTEM.BTOTEM_WMI2) {
                return true;
            }
        }
        return false;
    }

    public static TotemReward(): void {
        if (GLOBAL._flags.activeInvasion == EnumInvasionType.WMI1) {
            if (BTOTEM.HasTotemPlaced(true, false)) {
                return;
            }

            BTOTEM.RemoveAllFromStorage(true, false);
            BTOTEM.RemoveAllFromYard(true, false);
            InventoryManager.buildingStorageAdd(BTOTEM.BTOTEM_WMI1, 1);
        } else {
            if (BTOTEM.HasTotemPlaced(false, true)) {
                return;
            }

            BTOTEM.RemoveAllFromStorage(false, true);
            BTOTEM.RemoveAllFromYard(false, true);
            InventoryManager.buildingStorageAdd(BTOTEM.BTOTEM_WMI2, 1);
        }
    }

    public static TotemPlace(): void {
        let totemType: int = 0;
        if (GLOBAL._flags.activeInvasion == EnumInvasionType.WMI1) {
            totemType = BTOTEM.BTOTEM_WMI1;
        } else {
            totemType = BTOTEM.BTOTEM_WMI2;
        }

        // Check if there's actually a totem in storage to place
        if (!BASE._buildingsStored["b" + totemType] || BASE._buildingsStored["b" + totemType].Get() <= 0) {
            return;
        }

        BUILDINGS._buildingID = totemType;
        BUILDINGS.Show();
        BUILDINGS._mc.SwitchB(4, 4, 0);
    }

    public static UpgradeTotem(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BDECORATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_._type === BTOTEM.BTOTEM_WMI1 || _loc2_._type === BTOTEM.BTOTEM_WMI2) {
                _loc2_.Upgraded();
            }
        }

        if (GLOBAL._flags.activeInvasion == EnumInvasionType.WMI1) {
            if (BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI1]) {
                BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI1].Set(BTOTEM.EarnedTotemLevel());
            }
        } else {
            if (BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI2]) {
                BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI2].Set(BTOTEM.EarnedTotemLevel2());
            }
        }
    }

    public static RemoveAllFromStorage(param1: boolean = false, param2: boolean = false): void {
        if (param1) {
            if (BASE._buildingsStored["b" + BTOTEM.BTOTEM_WMI1]) {
                delete BASE._buildingsStored["b" + BTOTEM.BTOTEM_WMI1];
            }
            if (BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI1]) {
                delete BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI1];
            }
        }
        if (param2) {
            if (BASE._buildingsStored["b" + BTOTEM.BTOTEM_WMI2]) {
                delete BASE._buildingsStored["b" + BTOTEM.BTOTEM_WMI2];
            }
            if (BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI2]) {
                delete BASE._buildingsStored["bl" + BTOTEM.BTOTEM_WMI2];
            }
        }
    }

    public static RemoveAllFromYard(param1: boolean = false, param2: boolean = false): void {
        let _loc4_: BFOUNDATION = null;
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BDECORATION);
        for (_loc4_ of (_loc3_ ?? [])) {
            if (param1) {
                if (_loc4_._type == BTOTEM.BTOTEM_WMI1) {
                    _loc4_.GridCost(false);
                    _loc4_.clear();
                }
            }
            if (param2) {
                if (_loc4_._type === BTOTEM.BTOTEM_WMI2) {
                    _loc4_.GridCost(false);
                    _loc4_.clear();
                }
            }
        }
    }

    public static EarnedTotemLevel(): int {
        let currentLevel: int = 0;
        let wmi_wave: int = GLOBAL.StatGet("wmi_wave");
        let storedLevel: int = GLOBAL.StatGet("wmi1_totem_level");

        switch (wmi_wave) {
            case 0:
                currentLevel = 0;
                break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
                currentLevel = 1;
                break;
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
                currentLevel = 2;
                break;
            case 20:
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
                currentLevel = 3;
                break;
            case 30:
                currentLevel = 4;
                break;
            case 31:
                currentLevel = 5;
                break;
            case 32:
                currentLevel = 6;
                break;
            default:
                currentLevel = 6;
                break;
        }

        if (currentLevel > storedLevel) {
            GLOBAL.StatSet("wmi1_totem_level", currentLevel);
            return currentLevel;
        }

        return storedLevel;
    }

    private static EarnedTotemLevel2(): int {
        let currentLevel: int = 0;
        let wmi2_wave: int = GLOBAL.StatGet("wmi2_wave");
        let storedLevel: int = GLOBAL.StatGet("wmi2_totem_level");

        switch (wmi2_wave) {
            case 100:
                currentLevel = 0;
                break;
            case 101:
            case 102:
            case 103:
            case 104:
            case 105:
            case 106:
            case 107:
            case 108:
            case 109:
                currentLevel = 1;
                break;
            case 110:
            case 111:
            case 112:
            case 113:
            case 114:
            case 115:
            case 116:
            case 117:
            case 118:
            case 119:
                currentLevel = 2;
                break;
            case 120:
            case 121:
            case 122:
            case 123:
            case 124:
            case 125:
            case 126:
            case 127:
            case 128:
            case 129:
                currentLevel = 3;
                break;
            case 130:
                currentLevel = 4;
                break;
            case 131:
                currentLevel = 5;
                break;
            case 132:
                currentLevel = 6;
                break;
            default:
                currentLevel = 6;
                break;
        }

        if (currentLevel > storedLevel) {
            GLOBAL.StatSet("wmi2_totem_level", currentLevel);
            return currentLevel;
        }

        return storedLevel;
    }

    public static IsTotem(param1: int): boolean {
        return param1 == BTOTEM.BTOTEM_WMI1;
    }

    public static IsTotem2(param1: int): boolean {
        return param1 == BTOTEM.BTOTEM_WMI2;
    }

    public override Tick(param1: int): void {
        super.Tick(param1);

        let earnedLevel: int = 0;
        if (this._type == BTOTEM.BTOTEM_WMI1) {
            earnedLevel = BTOTEM.EarnedTotemLevel();
        } else if (this._type == BTOTEM.BTOTEM_WMI2) {
            earnedLevel = BTOTEM.EarnedTotemLevel2();
        } else {
            return;
        }

        if (this._lvl.Get() != earnedLevel) {
            this._lvl.Set(earnedLevel);
            this._hpLvl = earnedLevel;
        }
    }
}
