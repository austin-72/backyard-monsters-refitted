import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BUILDING15, CREATURELOCKER, CREATURES, GLOBAL, GRID, HOUSINGBUNKER, HOUSINGPOPUP, HousingPersistentPopup, InstanceManager, LOGGER, MAP, MAPROOM_DESCENT, MapRoomManager, MonsterBase, MonsterData, SOUNDS, SecNum, TRIBES } from "@game";

export class HOUSING extends ASObject {
    public static _housingPopup: MovieClip = null;

    public static _open: boolean = false;

    public static _housingCapacity: SecNum = null;

    public static _housingUsed: SecNum = null;

    public static _housingSpace: SecNum = null;

    public static _housingBuildingUpgrading: boolean = false;

    public static readonly IO_TEST_CAPACITY: int = 9999999;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: MouseEvent = null): void {
        HOUSING._open = true;
        GLOBAL.BlockerAdd();
        if (MapRoomManager.instance.isInMapRoom3) {
            HOUSING._housingPopup = new HousingPersistentPopup();
        } else {
            HOUSING._housingPopup = new HOUSINGPOPUP();
        }
        GLOBAL._layerWindows.addChild(HOUSING._housingPopup);
        HOUSING._housingPopup.Center();
        HOUSING._housingPopup.ScaleUp();
    }

    public static Hide(param1: MouseEvent = null): void {
        if (HOUSING._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(HOUSING._housingPopup);
            HOUSING._open = false;
            HOUSING._housingPopup = null;
        }
    }

    public static HousingSpace(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        HOUSING._housingCapacity = new SecNum(0);
        HOUSING._housingUsed = new SecNum(0);
        HOUSING._housingSpace = new SecNum(0);
        HOUSING._housingBuildingUpgrading = false;
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._countdownBuild.Get() <= 0 && (_loc3_.health > 10 || MapRoomManager.instance.isInMapRoom3)) {
                _loc6_ = _loc3_._buildingProps.capacity[_loc3_.getEffectiveLevel() - 1] | 0;
                if (GLOBAL._extraHousing >= GLOBAL.Timestamp() && GLOBAL._extraHousingPower.Get() > 0) {
                    _loc6_ = HOUSING.addHousingCapacityMultiplier(_loc6_);
                }
                HOUSING._housingCapacity.Add(_loc6_);
                _loc1_++;
            }
            if (_loc3_._countdownBuild.Get() + _loc3_._countdownUpgrade.Get() > 0) {
                HOUSING._housingBuildingUpgrading = true;
            }
        }
        // Admin test mode: the Compound holds any number of monsters.
        if (GLOBAL.ioTestMode()) {
            HOUSING._housingCapacity.Set(HOUSING.IO_TEST_CAPACITY);
        }
        _loc4_ = GLOBAL.player.monsterList.length | 0;
        _loc5_ = 0;
        while (_loc5_ < _loc4_) {
            HOUSING._housingUsed.Add(CREATURES.GetProperty(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, "cStorage", 0, true) * as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps);
            _loc5_++;
        }
        HOUSING._housingSpace.Set(HOUSING._housingCapacity.Get() - HOUSING._housingUsed.Get());
    }

    private static addHousingCapacityMultiplier(param1: int): int {
        return (param1 * GLOBAL._extraHousingPower.Get()) | 0;
    }

    public static HousingStore(param1: string, param2: Point, param3: boolean = false, param4: int = 0): boolean {
        let _loc7_: MonsterBase = null;
        let _loc8_: MonsterBase = null;
        if (param4 > 0) {
            LOGGER.Log("hak", "Instant monster hack");
            GLOBAL.ErrorMessage("HOUSING insta monster hack");
            return false;
        }
        if (param1 == "C100") {
            param1 = "C12";
        }
        let _loc5_: int = CREATURES.GetProperty(param1, "cStorage", 0, true) | 0;
        let _loc6_: boolean = (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW) && TRIBES.TribeForBaseID(BASE._wmID).behaviour == "juice";
        HOUSING.HousingSpace();
        if (HOUSING._housingSpace.Get() < _loc5_ && !_loc6_) {
            return false;
        }
        if (!param3) {
            if (_loc6_) {
                _loc7_ = CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "juice", param2, 0);
                if (_loc7_) {
                    _loc7_.changeModeJuice();
                }
            } else {
                _loc8_ = HOUSING.createAndHouseCreep(param1, param2);
                if (!_loc8_) {
                    return false;
                }
                GLOBAL.player.addMonster(param1, _loc8_);
            }
        }
        return true;
    }

    public static createAndHouseCreep(param1: string, param2: Point): MonsterBase {
        let _loc3_: BFOUNDATION = HOUSING.getClosestHouseToPoint(param2);
        let _loc4_: MonsterBase = null;
        if (_loc3_) {
            _loc4_ = CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "housing", param2, 0, GRID.FromISO(_loc3_._mc.x, _loc3_._mc.y), _loc3_);
        }
        return _loc4_;
    }

    public static getClosestHouseToPoint(param1: Point): BFOUNDATION {
        let _loc4_: BFOUNDATION = null;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: int = 0;
        let _loc2_: any[] = [];
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc4_ of (_loc3_ ?? [])) {
            if (_loc4_._countdownBuild.Get() <= 0 && (_loc4_.health > 0 || MapRoomManager.instance.isInMapRoom3)) {
                _loc5_ = _loc4_._mc.x - param1.x;
                _loc6_ = _loc4_._mc.y - param1.y;
                _loc7_ = _loc4_._creatures.length | 0;
                _loc2_.push({ "mc": _loc4_, "dist": _loc7_ });
            }
        }
        if (_loc2_.length == 0) {
            return null;
        }
        as3.sortOn(_loc2_, ["dist"], Array.NUMERIC);
        return as3.cast(_loc2_[0].mc, BFOUNDATION);
    }

    public static Cull(param1: boolean = false): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        HOUSING._housingCapacity = new SecNum(0);
        HOUSING._housingUsed = new SecNum(0);
        HOUSING._housingSpace = new SecNum(0);
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._countdownBuild.Get() <= 0 && (_loc3_.health > 0 || MapRoomManager.instance.isInMapRoom3)) {
                _loc6_ = _loc3_._buildingProps.capacity[_loc3_.getEffectiveLevel() - 1] | 0;
                if (GLOBAL._extraHousing >= GLOBAL.Timestamp() && GLOBAL._extraHousingPower.Get() > 0) {
                    _loc6_ = HOUSING.addHousingCapacityMultiplier(_loc6_);
                }
                HOUSING._housingCapacity.Add(_loc6_);
            }
        }
        // Admin test mode: the Compound holds any number of monsters.
        if (GLOBAL.ioTestMode()) {
            HOUSING._housingCapacity.Set(HOUSING.IO_TEST_CAPACITY);
        }
        _loc4_ = GLOBAL.player.monsterList.length | 0;
        _loc5_ = 0;
        while (_loc5_ < _loc4_) {
            if (as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps) {
                HOUSING._housingUsed.Add(CREATURES.GetProperty(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, "cStorage", 0, true) * as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps);
            }
            _loc5_++;
        }
        while (HOUSING._housingUsed.Get() > HOUSING._housingCapacity.Get()) {
            HOUSING._housingUsed.Set(0);
            _loc5_ = 0;
            while (_loc5_ < _loc4_) {
                if (as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps > 0) {
                    as3.vget(GLOBAL.player.monsterList, _loc5_).add(-1, null, true);
                    HOUSING._housingUsed.Add(CREATURES.GetProperty(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, "cStorage", 0, true) * as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps);
                }
                _loc5_++;
            }
        }
        HOUSING.HousingSpace();
    }

    public static Populate(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: BFOUNDATION = null;
        let _loc10_: Point = null;
        let _loc1_: any[] = [];
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_.health > 0 || MapRoomManager.instance.isInMapRoom3) {
                _loc1_.push(_loc3_);
            }
        }
        if (_loc1_.length > 0) {
            _loc4_ = GLOBAL.player.monsterList.length | 0;
            _loc5_ = 0;
            while (_loc5_ < _loc4_) {
                _loc6_ = as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps;
                _loc7_ = 0;
                while (_loc7_ < _loc6_) {
                    if (!as3.vget(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creeps, _loc7_).ownerID) {
                        _loc8_ = (Math.random() * _loc1_.length) | 0;
                        _loc9_ = as3.cast(_loc1_[_loc8_], BFOUNDATION);
                        _loc10_ = GRID.FromISO(_loc9_.x, _loc9_.y);
                        as3.vget(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creeps, _loc7_).self = CREATURES.Spawn(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, MAP._BUILDINGTOPS, MonsterBase.k_sBHVR_PEN, HOUSING.PointInHouse(_loc10_), Math.random() * 360, _loc10_, _loc9_, as3.vget(GLOBAL.player.monsterList, _loc5_).level, as3.vget(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creeps, _loc7_).health | 0);
                    }
                    _loc7_++;
                }
                _loc5_++;
            }
        }
    }

    public static PointInHouse(param1: Point): Point {
        let _loc2_: Rectangle = new Rectangle(40, 40, 80, 80);
        return GRID.ToISO(param1.x + (_loc2_.x + Math.random() * _loc2_.width), param1.y + (_loc2_.y + Math.random() * _loc2_.height), 0);
    }

    public static Update(): void {
        if (HOUSING._open) {
            HOUSING._housingPopup.Update();
        }
    }

    public static catchupTick(param1: int): void {
        GLOBAL.player.tickHeal(param1);
    }

    public static isHousingBuilding(param1: int): boolean {
        return param1 == 15 || param1 == 128;
    }

    public static AddHouse(param1: BFOUNDATION): void {
        HOUSING.HousingSpace();
        GLOBAL._bHousing = param1;
    }

    public static RemoveHouse(param1: BFOUNDATION): void {
        GLOBAL._bHousing = null;
        HOUSING.HousingSpace();
    }

    public static GetHousingCreatures(): any[] {
        let _loc10_: string = null;
        let _loc11_: any = null;
        let _loc12_: string = null;
        let _loc13_: any = null;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: MonsterData = null;
        let _loc17_: any = null;
        let _loc1_: any[] = [];
        let _loc2_: any[] = [];
        let _loc3_: any[] = [];
        let _loc4_: any = CREATURELOCKER.GetCreatures("above");
        let _loc5_: any = undefined;
        _loc5_ = !BASE.isInfernoMainYardOrOutpost;
        if (_loc5_) {
            for (_loc10_ in _loc4_) {
                if (!(_loc11_ = CREATURELOCKER._creatures[_loc10_]).blocked) {
                    _loc11_.id = _loc10_;
                    _loc1_.push(_loc11_);
                }
            }
            as3.sortOn(_loc1_, ["index"], Array.NUMERIC);
        }
        let _loc6_: any = CREATURELOCKER.GetCreatures("inferno");
        let _loc7_: boolean = false;
        _loc7_ = MAPROOM_DESCENT.DescentPassed;
        if (_loc7_) {
            for (_loc12_ in _loc6_) {
                if (!(_loc13_ = CREATURELOCKER._creatures[_loc12_]).blocked) {
                    _loc13_.id = _loc12_;
                    _loc2_.push(_loc13_);
                }
            }
            as3.sortOn(_loc2_, ["index"], Array.NUMERIC);
        }
        if (_loc1_.length > 0) {
            _loc3_ = _loc3_.concat(_loc1_);
        }
        if (_loc2_.length > 0) {
            _loc3_ = _loc3_.concat(_loc2_);
        }
        let _loc8_: any[] = [];
        let _loc9_: int = 0;
        while (_loc9_ < _loc3_.length) {
            _loc14_ = GLOBAL.player.monsterList.length | 0;
            _loc15_ = 0;
            while (_loc15_ < _loc14_) {
                if ((_loc16_ = as3.vget(GLOBAL.player.monsterList, _loc15_)).m_creatureID == _loc3_[_loc9_].id) {
                    if (_loc16_.numCreeps > 0) {
                        (_loc17_ = _loc3_[_loc9_]).quantity = _loc16_.numHousedCreeps;
                        _loc8_.push(_loc17_);
                    }
                }
                _loc15_++;
            }
            _loc9_++;
        }
        return _loc8_;
    }
}
