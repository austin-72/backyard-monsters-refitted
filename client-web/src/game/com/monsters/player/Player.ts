import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BASE, BaseBuffHandler, CREATURES, CreepInfo, GLOBAL, IHandler, IPlayerHandler, ITickable, KOTHHandler, MAPROOM_DESCENT, MapRoomManager, MonsterBase, MonsterData, ReplayableEventHandler, RewardHandler, SecNum, SubscriptionHandler, print } from "@game";

export class Player extends ASObject {
    static {
        as3.fields(this, { ID: 0, name: null, lastName: null, picture: null, timePlayed: 0, level: 0, townHallLevel: 0, email: null, proxyMail: null, isAttacking: false, _handlers: null, m_upgrades: null, m_monsterList: null, m_iMonsterList: null, m_monsterIndexList: null, m_healQueue: null, m_iHealQueue: null });
    }

    private static readonly HANDLER_REWARD: int = 0;

    private static readonly HANDLER_KOTH: int = 1;

    private static readonly HANDLER_SUBSCRIPTIONS: int = 2;
    public ID: int;
    public name: string;
    public lastName: string;
    public picture: string;
    public timePlayed: int;
    public level: int;
    public townHallLevel: int;
    public email: string;
    public proxyMail: string;
    public isAttacking: boolean;
    private _handlers: Vector<IHandler>;
    public m_upgrades: any;
    private m_monsterList: Vector<MonsterData>;
    private m_iMonsterList: Vector<MonsterData>;
    private m_monsterIndexList: any[];
    private m_healQueue: Vector<string>;
    private m_iHealQueue: Vector<string>;

    public $ctor(): void {
        this._handlers = Vector.from([RewardHandler.instance, KOTHHandler.instance, SubscriptionHandler.instance, BaseBuffHandler.instance], IHandler);
        this.m_upgrades = {};
        super.$ctor();
        this.m_monsterList = new Vector<MonsterData>(0, false, MonsterData);
        this.m_monsterIndexList = new Array();
        this.m_iMonsterList = new Vector<MonsterData>(0, false, MonsterData);
        this.m_healQueue = new Vector<string>(0, false, String);
        this.m_iHealQueue = new Vector<string>(0, false, String);
    }

    public initialize(): void {
    }

    public clear(): void {
        let _loc1_: Vector<MonsterData> = this.monsterList;
        let _loc2_: int = _loc1_.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            as3.vget(_loc1_, _loc3_).clear();
            _loc3_++;
        }
    }

    public set monsterList(param1: Vector<MonsterData>) {
        if (BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT._inDescent) {
            this.m_iMonsterList = param1;
        } else {
            this.m_monsterList = param1;
        }
    }

    public get monsterList(): Vector<MonsterData> {
        if (BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT._inDescent) {
            return this.m_iMonsterList;
        }
        return this.m_monsterList;
    }

    public get healQueue(): Vector<string> {
        if (BASE.isInfernoMainYardOrOutpost) {
            return this.m_iHealQueue;
        }
        return this.m_healQueue;
    }

    public monsterListByID(param1: string): MonsterData {
        if (param1.substr(0, 1) == "B") {
            print("ERROR. ERROR. tried to get monsterListByID of a bunker.");
        }
        let _loc2_: Vector<MonsterData> = this.monsterList;
        if (this.m_monsterIndexList[param1]) {
            return as3.vget(_loc2_, this.m_monsterIndexList[param1] - 1);
        }
        return null;
    }

    public numCreepsByID(param1: string): int {
        if (param1.substr(0, 1) == "B") {
            return this.numCreepsInBunker(Number(param1.substr(1)) | 0);
        }
        return this.monsterListByID(param1).numHousedCreeps;
    }

    public totalHealthByID(param1: string): int {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        if (param1.substr(0, 1) == "B") {
            _loc3_ = _loc2_.length | 0;
            _loc4_ = 0;
            _loc5_ = 0;
            while (_loc5_ < _loc3_) {
                _loc4_ += as3.vget(_loc2_, _loc5_).totalOwnedHealth(Number(param1.substr(1)) | 0);
                _loc5_++;
            }
            return _loc4_;
        }
        return this.monsterListByID(param1).totalHealth;
    }

    public curHealthByID(param1: string): int {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        if (param1.substr(0, 1) == "B") {
            _loc3_ = _loc2_.length | 0;
            _loc4_ = 0;
            _loc5_ = 0;
            while (_loc5_ < _loc3_) {
                _loc4_ += as3.vget(_loc2_, _loc5_).curHealth(Number(param1.substr(1)) | 0);
                _loc5_++;
            }
            return _loc4_;
        }
        return this.monsterListByID(param1).curHealth();
    }

    public getStorageByID(param1: string): int {
        if (param1.substr(0, 1) == "B") {
            return this.getBunkerStorage(Number(param1.substr(1)) | 0);
        }
        return (this.numCreepsByID(param1) * CREATURES.GetProperty(param1, "cStorage")) | 0;
    }

    public importAcademyData(param1: any): void {
        let _loc2_: string = null;
        this.m_upgrades = {};
        for (_loc2_ in param1) {
            if ((_loc2_.substr(0, 1) == "C" || _loc2_.substr(0, 2) == "IC") && Boolean(param1[_loc2_])) {
                this.m_upgrades[_loc2_] = {};
                if (param1[_loc2_].time) {
                    if (param1[_loc2_].time <= 60 * 60 * 162) {
                        this.m_upgrades[_loc2_].time = new SecNum(Number(param1[_loc2_].time + GLOBAL.Timestamp()));
                    } else {
                        this.m_upgrades[_loc2_].time = new SecNum(Number(param1[_loc2_].time));
                    }
                }
                if (param1[_loc2_].duration) {
                    this.m_upgrades[_loc2_].duration = param1[_loc2_].duration;
                }
                if (param1[_loc2_].powerup) {
                    this.m_upgrades[_loc2_].powerup = param1[_loc2_].powerup;
                }
                this.m_upgrades[_loc2_].level = param1[_loc2_].level;
            }
        }
        if (this.m_upgrades.C100) {
            this.m_upgrades.C12 = this.m_upgrades.C100;
            delete this.m_upgrades.C100;
        }
    }

    public exportAcademyData(): any {
        let _loc2_: string = null;
        let _loc1_: any = {};
        for (_loc2_ in this.m_upgrades) {
            if (this.m_upgrades[_loc2_]) {
                _loc1_[_loc2_] = {};
                _loc1_[_loc2_].level = this.m_upgrades[_loc2_].level;
                if (this.m_upgrades[_loc2_].time) {
                    _loc1_[_loc2_].time = this.m_upgrades[_loc2_].time.Get();
                }
                if (this.m_upgrades[_loc2_].duration) {
                    _loc1_[_loc2_].duration = this.m_upgrades[_loc2_].duration;
                }
                if (this.m_upgrades[_loc2_].powerup) {
                    _loc1_[_loc2_].powerup = this.m_upgrades[_loc2_].powerup;
                }
            }
        }
        return _loc1_;
    }

    public upgradeHealthData(param1: string): void {
        if (!this.monsterListByID(param1)) {
            return;
        }
        let _loc2_: Vector<CreepInfo> = this.monsterListByID(param1).m_creeps;
        let _loc3_: int = _loc2_.length | 0;
        let _loc4_: int = (CREATURES.GetProperty(param1, "health", this.m_upgrades[param1].level | 0) - this.monsterListByID(param1).maxHealth) | 0;
        this.monsterListByID(param1).level = this.m_upgrades[param1].level | 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc3_) {
            as3.vget(_loc2_, _loc5_).health += _loc4_;
            if (as3.vget(_loc2_, _loc5_).self) {
                as3.vget(_loc2_, _loc5_).self.setHealth(as3.vget(_loc2_, _loc5_).self.health + _loc4_);
            }
            _loc5_++;
        }
    }

    public addMonster(param1: string, param2: MonsterBase = null): void {
        let _loc3_: Vector<MonsterData> = this.monsterList;
        let _loc4_: MonsterData = null;
        _loc4_ = this.monsterListByID(param1);
        if (_loc4_) {
            _loc4_.add(1, param2);
        } else {
            (_loc4_ = new MonsterData()).m_creatureID = param1;
            _loc4_.add(1, param2);
            if (this.m_upgrades[param1] != null) {
                _loc4_.level = this.m_upgrades[param1].level | 0;
            }
            _loc3_.push(_loc4_);
            this.m_monsterIndexList[param1] = _loc3_.length;
        }
    }

    public fillMonsterData(param1: any): void {
        let creatureID: string = null;
        let _loc6_: int = 0;
        let _loc7_: MonsterData = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        let _loc3_: Vector<string> = this.healQueue;
        as3.vsetLength(_loc2_, 0);
        this.m_monsterIndexList = [];
        let _loc4_: boolean = false;
        for (creatureID in param1) {
            if (creatureID.substr(0, 1) == "C" || creatureID.substr(0, 2) == "IC") {
                if (!_loc4_ && !(as3.is(param1[creatureID], Number))) {
                    _loc4_ = true;
                }
                if (_loc4_) {
                    if (param1[creatureID] == null) {
                        continue;
                    }
                    _loc6_ = param1[creatureID].length | 0;
                } else {
                    _loc6_ = param1[creatureID] | 0;
                }
                if (_loc6_) {
                    _loc7_ = new MonsterData();
                    if (creatureID == "C100") {
                        creatureID = "C12";
                    }
                    _loc7_.m_creatureID = creatureID;
                    _loc7_.add(_loc6_);
                    _loc8_ = 0;
                    while (_loc8_ < _loc6_) {
                        if (_loc4_ && GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                            // The owner is home: whoever survived the raids is nursed back to full health.
                            as3.vget(_loc7_.m_creeps, _loc8_).health = int.MAX_VALUE;
                        } else if (_loc4_) {
                            as3.vget(_loc7_.m_creeps, _loc8_).health = Number(param1[creatureID][_loc8_].health > 0 ? Number(param1[creatureID][_loc8_].health) : 1);
                            as3.vget(_loc7_.m_creeps, _loc8_).ownerID = param1[creatureID][_loc8_].ownerID >>> 0;
                            as3.vget(_loc7_.m_creeps, _loc8_).queued = (!(!param1[creatureID][_loc8_].q) ? param1[creatureID][_loc8_].q >>> 0 : 0) >>> 0;
                        } else {
                            as3.vget(_loc7_.m_creeps, _loc8_).health = int.MAX_VALUE;
                        }
                        if (this.m_upgrades[creatureID] != null) {
                            _loc7_.level = this.m_upgrades[creatureID].level | 0;
                        }
                        _loc8_++;
                    }
                    _loc2_.push(_loc7_);
                    if (!this.m_monsterIndexList[creatureID]) {
                        this.m_monsterIndexList[creatureID] = _loc2_.length;
                    }
                }
            }
        }
        if (param1["Q"]) {
            _loc6_ = param1["Q"].length | 0;
            _loc9_ = 0;
            while (_loc9_ < _loc6_) {
                as3.vset(_loc3_, _loc9_, as3.str(param1["Q"][_loc9_]));
                _loc10_ = 0;
                if (as3.vget(_loc3_, _loc9_).substr(0, 1) == "B") {
                    _loc10_ = Number(as3.vget(_loc3_, _loc9_).substr(1)) | 0;
                }
                _loc9_++;
            }
        }
    }

    /**
     * Inferno-only. A yard under attack is saved with the health of every defender that is still
     * alive, so monsters wounded in one attack are still wounded in the next. Map Room 2 only kept
     * how many there were, which sent every survivor back to full health the moment the attack ended.
     *
     * The format is the one Map Room 3 already uses and fillMonsterData() already reads: a list per
     * monster, one { health } per survivor. An unhurt monster is written as the largest int, which
     * spawning clamps to whatever its full health is by then.
     * This is only ever the defender's list: GLOBAL.player is the owner of the yard on screen.
     */
    private ioExportDefenders(param1: Vector<MonsterData>): any {
        let list: MonsterData = null;
        let info: CreepInfo = null;
        let survivors: any[] = null;
        let health: number = NaN;
        let out: any = {};
        for (list of (param1 ?? [])) {
            survivors = [];
            for (info of (list.m_creeps ?? [])) {
                health = info.self ? info.self.health : info.health;
                if (info.self && health <= 0) {
                    continue;
                }
                if (info.self && health >= info.self.maxHealth) {
                    health = int.MAX_VALUE;
                }
                survivors.push({ "health": Math.max(1, Math.ceil(health)), "ownerID": info.ownerID, "q": 0 });
            }
            if (survivors.length > 0) {
                out[list.m_creatureID] = survivors;
            }
        }
        return out;
    }

    public exportMonsters(): any {
        let _loc8_: any[] = null;
        let _loc9_: int = 0;
        let _loc1_: Vector<MonsterData> = this.monsterList;
        let _loc2_: Vector<string> = this.healQueue;
        let _loc3_: any = new Object();
        let _loc4_: int = _loc1_.length | 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        if (GLOBAL.INFERNO_ONLY && GLOBAL.isInAttackMode) {
            return this.ioExportDefenders(_loc1_);
        }
        if (MapRoomManager.instance.isInMapRoom3) {
            _loc6_ = 0;
            while (_loc6_ < _loc4_) {
                _loc5_ = as3.vget(_loc1_, _loc6_).numCreeps;
                _loc8_ = new Array(_loc5_);
                _loc7_ = 0;
                while (_loc7_ < _loc5_) {
                    if (as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).self) {
                        if (as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).self.health < Math.floor(as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).health)) {
                            as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).queued = 0;
                        }
                        as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).health = Number(!(!as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).self.health) ? as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).self.health : 1);
                    }
                    _loc8_[_loc7_] = { "health": as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).health, "ownerID": as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).ownerID, "q": as3.vget(as3.vget(_loc1_, _loc6_).m_creeps, _loc7_).queued };
                    _loc7_++;
                }
                _loc3_[as3.vget(_loc1_, _loc6_).m_creatureID] = _loc8_;
                _loc6_++;
            }
            if (_loc2_.length) {
                _loc4_ = _loc2_.length | 0;
                _loc8_ = new Array(_loc4_);
                _loc9_ = 0;
                while (_loc9_ < _loc4_) {
                    _loc8_[_loc9_] = as3.vget(_loc2_, _loc9_);
                    _loc9_++;
                }
                _loc3_["Q"] = _loc8_;
            }
        } else {
            _loc6_ = 0;
            while (_loc6_ < _loc4_) {
                _loc3_[as3.vget(_loc1_, _loc6_).m_creatureID] = as3.vget(_loc1_, _loc6_).numCreeps;
                _loc6_++;
            }
        }
        return _loc3_;
    }

    public get monsterHealQueue(): Vector<string> {
        return this.healQueue;
    }

    public queueHeal(param1: string, param2: boolean = false): void {
        let _loc3_: Vector<string> = null;
        _loc3_ = this.healQueue;
        let _loc4_: int = _loc3_.length | 0;
        let _loc5_: boolean = true;
        let _loc6_: int = 0;
        while (_loc6_ < _loc4_) {
            if (as3.vget(_loc3_, _loc6_) == param1) {
                if (!param2) {
                    return;
                }
                _loc5_ = false;
                break;
            }
            _loc6_++;
        }
        this.setQueueByID(param1, true);
        if (_loc5_) {
            _loc3_.push(param1);
        }
    }

    public queuePartialHeal(param1: string, param2: int): void {
        let _loc3_: Vector<string> = null;
        _loc3_ = this.healQueue;
        let _loc4_: int = _loc3_.length | 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc4_) {
            if (as3.vget(_loc3_, _loc5_) == param1) {
                return;
            }
            _loc5_++;
        }
        this.setQueueByID(param1, true, param2);
        _loc3_.push(param1);
    }

    public queueRemove(param1: string): void {
        let _loc3_: Vector<string> = null;
        let _loc2_: int = 0;
        _loc3_ = this.healQueue;
        let _loc4_: int = _loc3_.length | 0;
        while (_loc2_ < _loc4_ && as3.vget(_loc3_, _loc2_) != param1) {
            _loc2_++;
        }
        if (_loc2_ == _loc4_) {
            return;
        }
        this.setQueueByID(param1, false);
        _loc3_.splice(_loc2_, 1);
        BASE.SaveB();
    }

    private setQueueByID(param1: string, param2: boolean, param3: int = 0): void {
        let _loc5_: Vector<MonsterData> = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc4_: int = 0;
        if (param1.substr(0, 1) == "B") {
            _loc4_ = Number(param1.substr(1)) | 0;
            _loc6_ = (_loc5_ = this.monsterList).length | 0;
            _loc7_ = 0;
            while (_loc7_ < _loc6_) {
                as3.vget(_loc5_, _loc7_).setQueued(param2, _loc4_, param3);
                _loc7_++;
            }
        } else {
            this.monsterListByID(param1).setQueued(param2, _loc4_, param3);
        }
    }

    public checkQueued(param1: string): boolean {
        let _loc2_: Vector<string> = null;
        _loc2_ = this.healQueue;
        let _loc3_: int = _loc2_.length | 0;
        let _loc4_: int = (_loc3_ - 1) | 0;
        while (_loc4_ >= 0) {
            if (as3.vget(_loc2_, _loc4_) == param1) {
                return true;
            }
            _loc4_--;
        }
        return false;
    }

    public checkForNonQueuedCreepsByID(param1: string): boolean {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        if (param1.substr(0, 1) != "B") {
            return this.monsterListByID(param1).checkForNonQueuedCreeps();
        }
        _loc3_ = _loc2_.length | 0;
        _loc4_ = Number(param1.substr(1)) | 0;
        _loc5_ = 0;
        while (_loc5_ < _loc3_) {
            if (as3.vget(_loc2_, _loc5_).checkForNonQueuedCreeps(_loc4_)) {
                return true;
            }
            _loc5_++;
        }
        return false;
    }

    public getHighestTimeHealingUsingNumberOfHousing(param1: string): int {
        let _loc4_: Vector<MonsterData> = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (param1.substr(0, 1) == "B") {
            _loc2_ = Number(param1.substr(1)) | 0;
            _loc5_ = (_loc4_ = this.monsterList).length | 0;
            _loc6_ = 0;
            while (_loc6_ < _loc5_) {
                _loc3_ += as3.vget(_loc4_, _loc6_).getHighestTimeWithHousingSplit(_loc2_);
                _loc6_++;
            }
        } else {
            _loc3_ = this.monsterListByID(param1).getHighestTimeWithHousingSplit();
        }
        return _loc3_;
    }

    public refundResources(param1: string, param2: boolean = false): void {
        let _loc3_: int = GLOBAL.player.getResourceCostByID(param1, param2) | 0;
        let _loc4_: any = param1.substr(0, 1) == "I";
        BASE.Fund(4, _loc3_, true, null, Boolean(_loc4_), true);
    }

    public tickHeal(param1: int): void {
        let _loc2_: Vector<string> = this.healQueue;
        while (param1) {
            if (_loc2_.length) {
                if (this.healByID(as3.vget(_loc2_, 0))) {
                    _loc2_.shift();
                }
            }
            param1--;
        }
    }

    private healByID(param1: string): boolean {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        let _loc3_: boolean = true;
        if (param1.substr(0, 1) == "B") {
            _loc4_ = _loc2_.length | 0;
            _loc5_ = Number(param1.substr(1)) | 0;
            _loc6_ = 0;
            while (_loc6_ < _loc4_) {
                if (!as3.vget(_loc2_, _loc6_).heal(_loc5_)) {
                    _loc3_ = false;
                }
                _loc6_++;
            }
        } else if (this.monsterListByID(param1)) {
            return this.monsterListByID(param1).heal();
        }
        return _loc3_;
    }

    public healInstantSingleByID(param1: string): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        if (param1.substr(0, 1) == "B") {
            _loc3_ = _loc2_.length | 0;
            _loc4_ = Number(param1.substr(1)) | 0;
            _loc5_ = 0;
            while (_loc5_ < _loc3_) {
                as3.vget(_loc2_, _loc5_).healInstant(_loc4_);
                _loc5_++;
            }
        } else {
            this.monsterListByID(param1).healInstant();
        }
        this.queueRemove(param1);
    }

    public healInstantAll(): void {
        let _loc1_: Vector<MonsterData> = null;
        _loc1_ = this.monsterList;
        let _loc2_: int = _loc1_.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            as3.vget(_loc1_, _loc3_).healInstant(0, true);
            this.queueRemove(as3.vget(_loc1_, _loc3_).m_creatureID);
            _loc3_++;
        }
    }

    public getSecsTillDoneByID(param1: string, param2: boolean = false): int {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        let _loc8_: string = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc3_: Vector<MonsterData> = this.monsterList;
        let _loc4_: int = 0;
        if (param1.substr(0, 1) == "B") {
            _loc6_ = _loc3_.length | 0;
            _loc7_ = 0;
            _loc9_ = 0;
            _loc10_ = 0;
            while (_loc10_ < _loc6_) {
                _loc7_ = as3.vget(_loc3_, _loc10_).numCreepsByHouse(Number(param1.substr(1)) | 0, !param2);
                if (_loc7_) {
                    _loc8_ = as3.vget(_loc3_, _loc10_).m_creatureID;
                    _loc9_ = CREATURES.GetProperty(_loc8_, "hTime") | 0;
                    _loc5_ = CREATURES.GetProperty(_loc8_, "health") | 0;
                    _loc4_ = (_loc4_ + (_loc7_ * _loc5_ - as3.vget(_loc3_, _loc10_).curHealth(Number(param1.substr(1)) | 0)) / (_loc5_ / _loc9_)) | 0;
                }
                _loc10_++;
            }
        } else {
            _loc4_ = CREATURES.GetProperty(param1, "hTime") | 0;
            _loc5_ = CREATURES.GetProperty(param1, "health") | 0;
            _loc4_ = (((_loc7_ = GLOBAL.player.monsterListByID(param1).numCreepsByHouse(0, !param2)) * _loc5_ - GLOBAL.player.monsterListByID(param1).curHealth(0, !param2)) / (_loc5_ / _loc4_)) | 0;
        }
        return _loc4_;
    }

    public getNumDamagedCreeps(): int {
        let _loc1_: Vector<MonsterData> = null;
        _loc1_ = this.monsterList;
        let _loc2_: int = _loc1_.length | 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_) {
            _loc3_ = (_loc3_ + (as3.vget(_loc1_, _loc4_).numCreeps - as3.vget(_loc1_, _loc4_).numTotalHealthyCreeps)) | 0;
            _loc4_++;
        }
        return _loc3_;
    }

    public getNumQueuedCreepsByID(param1: string): int {
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc2_: Vector<MonsterData> = this.monsterList;
        let _loc3_: int = 0;
        if (param1.substr(0, 1) == "B") {
            _loc4_ = _loc2_.length | 0;
            _loc6_ = Number(param1.substr(1)) | 0;
            _loc7_ = 0;
            while (_loc7_ < _loc4_) {
                _loc5_ = as3.vget(_loc2_, _loc7_).m_creatureID;
                _loc3_ += as3.vget(_loc2_, _loc7_).numHealingCreeps(_loc6_);
                _loc7_++;
            }
        } else {
            _loc3_ += this.monsterListByID(param1).numHealingCreeps();
        }
        return _loc3_;
    }

    public getNumToHealByResourceCost(param1: string, param2: number): any {
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc3_: Vector<MonsterData> = this.monsterList;
        _loc4_ = { "num": 0, "resoLeft": param2 };
        if (param1.substr(0, 1) == "B") {
            _loc6_ = _loc3_.length | 0;
            _loc8_ = Number(param1.substr(1)) | 0;
            _loc9_ = 0;
            while (_loc9_ < _loc6_ && Boolean(_loc4_.resoLeft)) {
                _loc5_ = as3.vget(_loc3_, _loc9_).getNumCreepsCanHealWithSpecificResourceAmount(Number(_loc4_.resoLeft), _loc8_);
                _loc4_.num += _loc5_.num;
                _loc4_.resoLeft = _loc5_.resoLeft;
                _loc9_++;
            }
        } else {
            _loc4_ = GLOBAL.player.monsterListByID(param1).getNumCreepsCanHealWithSpecificResourceAmount(param2);
        }
        return _loc4_;
    }

    public getResourceCostByID(param1: string, param2: boolean = false): number {
        let _loc4_: int = 0;
        let _loc5_: number = NaN;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc3_: Vector<MonsterData> = this.monsterList;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        if (param1.substr(0, 1) == "B") {
            _loc8_ = _loc3_.length | 0;
            _loc10_ = Number(param1.substr(1)) | 0;
            _loc11_ = 0;
            while (_loc11_ < _loc8_) {
                _loc9_ = as3.vget(_loc3_, _loc11_).m_creatureID;
                _loc4_ = as3.vget(_loc3_, _loc11_).numCreepsByHouse(_loc10_, param2);
                if (_loc4_) {
                    _loc7_ = CREATURES.GetProperty(_loc9_, "health") | 0;
                    _loc5_ = _loc4_ - _loc4_ * (as3.vget(_loc3_, _loc11_).curHealth(_loc10_, param2) / (_loc7_ * _loc4_));
                    _loc6_ = (_loc6_ + CREATURES.GetProperty(_loc9_, "hResource") * _loc5_) | 0;
                }
                _loc11_++;
            }
        } else {
            _loc7_ = CREATURES.GetProperty(param1, "health") | 0;
            _loc4_ = GLOBAL.player.monsterListByID(param1).numCreepsByHouse(0, param2);
            _loc5_ = _loc4_ - _loc4_ * (GLOBAL.player.monsterListByID(param1).curHealth(0, param2) / (_loc7_ * _loc4_));
            _loc6_ = (CREATURES.GetProperty(param1, "hResource") * _loc5_) | 0;
        }
        return _loc6_;
    }

    public getResourceCostInShinyByID(param1: string): int {
        let _loc2_: int = 0;
        let _loc3_: int = this.getResourceCostByID(param1) | 0;
        return GLOBAL.getShinyCostFromResourceAmt(_loc3_);
    }

    public numCreepsInBunker(param1: int): int {
        let _loc2_: Vector<MonsterData> = null;
        _loc2_ = this.monsterList;
        let _loc3_: int = _loc2_.length | 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc3_) {
            _loc4_ += as3.vget(_loc2_, _loc5_).numCreepsByHouse(param1);
            _loc5_++;
        }
        return _loc4_;
    }

    public getBunkerStorage(param1: int): int {
        let _loc2_: Vector<MonsterData> = null;
        _loc2_ = this.monsterList;
        let _loc3_: int = _loc2_.length | 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc3_) {
            _loc4_ = (_loc4_ + as3.vget(_loc2_, _loc5_).numCreepsByHouse(param1) * CREATURES.GetProperty(as3.vget(_loc2_, _loc5_).m_creatureID, "cStorage")) | 0;
            _loc5_++;
        }
        return _loc4_;
    }

    public initializeHandlers(param1: any): void {
        let _loc3_: IHandler = null;
        let _loc2_: int = 0;
        while (_loc2_ < this.handlers.length) {
            _loc3_ = as3.vget(this.handlers, _loc2_);
            _loc3_.initialize(param1[_loc3_.name]);
            if (_loc2_ == 0) {
                ReplayableEventHandler.initialize(param1["events"]);
            }
            _loc2_++;
        }
    }

    private getPlayerDataFromLoadObject(param1: any): any {
        let _loc2_: any = null;
        if (!this.isAttacking) {
            _loc2_ = param1["defendingplayer"];
            if (_loc2_) {
                return _loc2_;
            }
            _loc2_ = param1["player"];
            if (_loc2_) {
                return _loc2_;
            }
        } else {
            _loc2_ = param1["attackingplayer"];
            if (_loc2_) {
                return _loc2_;
            }
        }
        return null;
    }

    public importPlayerSpecificHandlers(param1: any): void {
        let _loc4_: IHandler = null;
        let _loc2_: any = this.getPlayerDataFromLoadObject(param1);
        if (!_loc2_) {
            return;
        }
        let _loc3_: int = 0;
        while (_loc3_ < this.handlers.length) {
            if (as3.is((_loc4_ = as3.vget(this.handlers, _loc3_)), IPlayerHandler)) {
                as3.cast(_loc4_, IPlayerHandler).player = this;
                if (_loc2_.hasOwnProperty(_loc4_.name)) {
                    _loc4_.importData(_loc2_[_loc4_.name]);
                }
            }
            _loc3_++;
        }
    }

    public get rewards(): RewardHandler {
        return as3.as(as3.vget(this._handlers, Player.HANDLER_REWARD), RewardHandler);
    }

    public get handlers(): Vector<IHandler> {
        return this._handlers;
    }

    public set handlers(param1: Vector<IHandler>) {
        this._handlers = param1;
    }

    public tick(): void {
        let _loc3_: IHandler = null;
        let _loc1_: int = this.handlers.length | 0;
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_) {
            _loc3_ = as3.vget(this.handlers, _loc2_);
            if (as3.is(_loc3_, ITickable)) {
                as3.cast(_loc3_, ITickable).tick();
            }
            _loc2_++;
        }
    }
}
