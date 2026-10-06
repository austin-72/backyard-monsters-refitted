import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BASE, CREATURES, CreepInfo, MonsterBase, print } from "@game";

export class MonsterData extends ASObject {
    static {
        as3.fields(this, { m_creeps: null, m_creatureID: null, m_level: 0, m_maxHealth: 0 });
    }

    public static readonly kHealID: int = 1;
    public m_creeps: Vector<CreepInfo>;
    public m_creatureID: string;
    private m_level: int;
    private m_maxHealth: int;

    public $ctor(): void {
        super.$ctor();
        this.m_creatureID = "";
        this.m_creeps = new Vector<CreepInfo>(0, false, CreepInfo);
        this.m_level = 0;
        this.m_maxHealth = 0;
    }

    public get maxHealth(): int {
        return this.m_maxHealth;
    }

    public get level(): int {
        return this.m_level;
    }

    public set level(param1: int) {
        this.m_level = param1;
        this.m_maxHealth = CREATURES.GetProperty(this.m_creatureID, "health", this.m_level) | 0;
    }

    public get numCreeps(): int {
        return this.m_creeps.length | 0;
    }

    public get numBunkeredCreeps(): int {
        let _loc1_: int = this.m_creeps.length | 0;
        let _loc2_: int = _loc1_;
        let _loc3_: int = 0;
        while (_loc3_ < _loc1_) {
            if (as3.vget(this.m_creeps, _loc3_).ownerID == 0) {
                _loc2_--;
            }
            _loc3_++;
        }
        return _loc2_;
    }

    public get numHousedCreeps(): int {
        return (this.numCreeps - this.numBunkeredCreeps) | 0;
    }

    public numCreepsByHouse(param1: int = 0, param2: boolean = false): int {
        let _loc3_: int = this.m_creeps.length | 0;
        let _loc4_: int = (_loc3_ - 1) | 0;
        while (_loc4_ >= 0) {
            if (as3.vget(this.m_creeps, _loc4_).ownerID != param1 || param2 && !as3.vget(this.m_creeps, _loc4_).queued) {
                _loc3_--;
            }
            _loc4_--;
        }
        return _loc3_;
    }

    public get numHealthyHousedCreeps(): int {
        let _loc3_: CreepInfo = null;
        let _loc1_: int = this.m_creeps.length | 0;
        let _loc2_: int = _loc1_;
        let _loc4_: int = 0;
        while (_loc4_ < _loc1_) {
            _loc3_ = as3.vget(this.m_creeps, _loc4_);
            if (_loc3_.health < this.m_maxHealth || _loc3_.ownerID != 0) {
                _loc2_--;
            }
            _loc4_++;
        }
        return _loc2_;
    }

    public get numTotalHealthyCreeps(): int {
        let _loc3_: CreepInfo = null;
        let _loc1_: int = this.m_creeps.length | 0;
        let _loc2_: int = _loc1_;
        let _loc4_: int = 0;
        while (_loc4_ < _loc1_) {
            _loc3_ = as3.vget(this.m_creeps, _loc4_);
            if (_loc3_.health < this.m_maxHealth) {
                _loc2_--;
            }
            _loc4_++;
        }
        return _loc2_;
    }

    public numHealingCreeps(param1: int = 0): int {
        let _loc3_: CreepInfo = null;
        let _loc2_: int = this.m_creeps.length | 0;
        let _loc4_: int = (_loc2_ - 1) | 0;
        while (_loc4_ >= 0) {
            _loc3_ = as3.vget(this.m_creeps, _loc4_);
            if (_loc3_.ownerID != param1 || !_loc3_.queued || _loc3_.health >= this.m_maxHealth) {
                _loc2_--;
            }
            _loc4_--;
        }
        return _loc2_;
    }

    public getNumCreepsCanHealWithSpecificResourceAmount(param1: number, param2: int = 0): any {
        let _loc3_: number = CREATURES.GetProperty(this.m_creatureID, "hTime", this.m_level);
        let _loc4_: int = CREATURES.GetProperty(this.m_creatureID, "hResource", this.m_level) | 0;
        let _loc5_: int = Math.ceil(this.m_maxHealth / _loc3_) | 0;
        CREATURES.GetProperty(this.m_creatureID, "health", this.m_level);
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        as3.sort(this.m_creeps, as3.bind(this, this.healthSort));
        let _loc8_: int = this.m_creeps.length | 0;
        let _loc9_: int = 0;
        while (_loc9_ < _loc8_) {
            if (!((_loc6_ = ((1 - as3.vget(this.m_creeps, _loc9_).health / this.m_maxHealth) * _loc4_) | 0) <= param1 && as3.vget(this.m_creeps, _loc9_).ownerID == param2)) {
                break;
            }
            param1 -= _loc6_;
            _loc7_++;
            _loc9_++;
        }
        return { "num": _loc7_, "resoLeft": param1 };
    }

    public getHighestTimeWithHousingSplit(param1: int = 0): int {
        let _loc6_: CreepInfo = null;
        let _loc2_: int = BASE.getNumHousingHealsPerTick();
        let _loc3_: int = this.numCreepsByHouse(param1, true);
        let _loc4_: int = this.m_creeps.length | 0;
        let _loc5_: Vector<int> = new Vector<int>(_loc2_, false, int);
        let _loc7_: int = 0;
        as3.sort(this.m_creeps, as3.bind(this, this.healthSort));
        let _loc8_: int = 0;
        while (_loc8_ < _loc4_) {
            if ((_loc6_ = as3.vget(this.m_creeps, _loc8_)).health < this.m_maxHealth && _loc6_.ownerID == param1 && Boolean(_loc6_.queued)) {
                as3.vset(_loc5_, _loc7_, (as3.vget(_loc5_, _loc7_) + this.timeLeftToHealCreep(_loc6_)) | 0);
                _loc7_ = ((_loc7_ + 1) % _loc2_) | 0;
            }
            _loc8_++;
        }
        _loc7_ = 0;
        _loc8_ = 1;
        while (_loc8_ < _loc2_) {
            if (as3.vget(_loc5_, _loc8_) > as3.vget(_loc5_, _loc7_)) {
                _loc7_ = _loc8_;
            }
            _loc8_++;
        }
        return as3.vget(_loc5_, _loc7_);
    }

    private timeLeftToHealCreep(param1: CreepInfo): int {
        let _loc2_: number = CREATURES.GetProperty(this.m_creatureID, "hTime", this.m_level);
        return ((this.m_maxHealth - param1.health) / (this.m_maxHealth / _loc2_)) | 0;
    }

    private healthSort(param1: CreepInfo, param2: CreepInfo): number {
        if (param1.health == param2.health) {
            return 0;
        }
        if (param1.health >= this.m_maxHealth) {
            return 1;
        }
        if (param2.health >= this.m_maxHealth) {
            return -1;
        }
        if (param1.health < param2.health) {
            return 1;
        }
        if (param1.health > param2.health) {
            return -1;
        }
        return 0;
    }

    public get totalHealth(): int {
        return (this.numHousedCreeps * this.m_maxHealth) | 0;
    }

    public totalOwnedHealth(param1: int = 0, param2: boolean = false): int {
        return (this.numCreepsByHouse(param1, param2) * this.m_maxHealth) | 0;
    }

    public curHealth(param1: int = 0, param2: boolean = false): int {
        let _loc3_: int = 0;
        let _loc4_: int = this.m_creeps.length | 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc4_) {
            if (as3.vget(this.m_creeps, _loc5_).ownerID == param1 && (!param2 || param2 && as3.vget(this.m_creeps, _loc5_).queued)) {
                if (as3.vget(this.m_creeps, _loc5_).health > this.m_maxHealth) {
                    _loc3_ += this.m_maxHealth;
                } else {
                    _loc3_ = (_loc3_ + as3.vget(this.m_creeps, _loc5_).health) | 0;
                }
            }
            _loc5_++;
        }
        return _loc3_;
    }

    public needsHeals(): boolean {
        let _loc1_: int = this.m_creeps.length | 0;
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_) {
            if (as3.vget(this.m_creeps, _loc2_).health < this.m_maxHealth && !as3.vget(this.m_creeps, _loc2_).queued) {
                return true;
            }
            _loc2_++;
        }
        return false;
    }

    public heal(param1: int = 0): boolean {
        let _loc6_: CreepInfo = null;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: int = 0;
        let _loc2_: number = CREATURES.GetProperty(this.m_creatureID, "hTime", this.m_level);
        let _loc3_: number = this.m_maxHealth / _loc2_;
        let _loc4_: int = this.m_creeps.length | 0;
        let _loc5_: boolean = true;
        let _loc7_: CreepInfo = null;
        let _loc8_: int = -1;
        let _loc9_: int = BASE.getNumHousingHealsPerTick();
        let _loc10_: Vector<CreepInfo> = new Vector<CreepInfo>(0, false, CreepInfo);
        let _loc11_: int = 0;
        while (_loc11_ < _loc9_) {
            _loc8_ = -1;
            _loc7_ = null;
            _loc13_ = 0;
            while (_loc13_ < _loc4_) {
                if ((_loc6_ = as3.vget(this.m_creeps, _loc13_)).ownerID == param1 && Boolean(_loc6_.queued)) {
                    if (_loc6_.health < this.m_maxHealth) {
                        if (!this.checkAlreadyInList(_loc6_, _loc10_)) {
                            if (_loc6_.health > _loc8_) {
                                _loc8_ = _loc6_.health | 0;
                                _loc7_ = _loc6_;
                            }
                        }
                    }
                    if (_loc6_.health > this.m_maxHealth) {
                        _loc6_.health = this.m_maxHealth;
                        _loc6_.queued = 0;
                    }
                }
                _loc13_++;
            }
            if (_loc7_) {
                _loc10_.push(_loc7_);
            }
            _loc11_++;
        }
        _loc4_ = _loc10_.length | 0;
        if (_loc4_) {
            _loc14_ = 0;
            while (_loc14_ < _loc4_) {
                as3.vget(_loc10_, _loc14_).health += _loc3_;
                if (as3.vget(_loc10_, _loc14_).self) {
                    _loc12_ = (as3.vget(_loc10_, _loc14_).health - as3.vget(_loc10_, _loc14_).self.health) | 0;
                    as3.vget(_loc10_, _loc14_).self.modifyHealth(_loc12_);
                }
                _loc14_++;
            }
        }
        return !_loc10_.length;
    }

    private checkAlreadyInList(param1: CreepInfo, param2: Vector<CreepInfo>): boolean {
        let _loc3_: int = param2.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_) {
            if (param1 == as3.vget(param2, _loc4_)) {
                return true;
            }
            _loc4_++;
        }
        return false;
    }

    public healInstant(param1: int = 0, param2: boolean = false): void {
        let _loc3_: int = this.m_creeps.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_) {
            if (as3.vget(this.m_creeps, _loc4_).ownerID == param1 || param2) {
                as3.vget(this.m_creeps, _loc4_).health = this.m_maxHealth;
                as3.vget(this.m_creeps, _loc4_).queued = 0;
                if (as3.vget(this.m_creeps, _loc4_).self) {
                    as3.vget(this.m_creeps, _loc4_).self.modifyHealth(this.m_maxHealth);
                }
            }
            _loc4_++;
        }
    }

    public setQueued(param1: boolean, param2: int = 0, param3: int = 0): void {
        let _loc4_: int = param1 ? 1 : 0;
        let _loc5_: int = !(!param3) ? param3 : this.m_creeps.length | 0;
        let _loc6_: int = 0;
        while (_loc6_ < _loc5_) {
            if (as3.vget(this.m_creeps, _loc6_).ownerID == param2) {
                if (!_loc4_ || as3.vget(this.m_creeps, _loc6_).health < this.m_maxHealth) {
                    as3.vget(this.m_creeps, _loc6_).queued = _loc4_ >>> 0;
                }
            }
            _loc6_++;
        }
    }

    public checkForNonQueuedCreeps(param1: int = 0): boolean {
        let _loc2_: int = this.m_creeps.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            if (as3.vget(this.m_creeps, _loc3_).ownerID == param1 && !as3.vget(this.m_creeps, _loc3_).queued) {
                return true;
            }
            _loc3_++;
        }
        return false;
    }

    public add(param1: int, param2: MonsterBase = null, param3: boolean = false): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: CreepInfo = null;
        if (param1 > 0) {
            _loc4_ = 0;
            while (_loc4_ < param1) {
                this.m_creeps.push(new CreepInfo(0, int.MAX_VALUE, param2));
                _loc4_++;
            }
        } else {
            _loc5_ = this.m_creeps.length | 0;
            param1 = (param1 * -1) | 0;
            _loc4_ = (_loc5_ - 1) | 0;
            while (_loc4_ >= 0 && Boolean(param1)) {
                _loc6_ = as3.vget(this.m_creeps, _loc4_);
                if (param3 || !_loc6_.ownerID) {
                    this.m_creeps.splice(_loc4_, 1);
                    param1--;
                }
                _loc4_--;
            }
        }
    }

    public juiceCreep(): void {
        let _loc1_: int = this.m_creeps.length | 0;
        let _loc2_: int = 0;
        let _loc3_: int = -1;
        let _loc4_: int = 0;
        while (_loc4_ < _loc1_) {
            if (!as3.vget(this.m_creeps, _loc4_).ownerID) {
                if (as3.vget(this.m_creeps, _loc4_).health > _loc2_) {
                    _loc2_ = as3.vget(this.m_creeps, _loc4_).health | 0;
                    _loc3_ = _loc4_;
                }
            }
            _loc4_++;
        }
        if (_loc3_ >= 0) {
            if (as3.vget(this.m_creeps, _loc3_).self) {
                as3.vget(this.m_creeps, _loc3_).self.changeModeJuice();
            }
            this.m_creeps.splice(_loc3_, 1);
        }
    }

    public setNum(param1: int): void {
        if (param1 >= 0) {
        }
    }

    public getOwnedCreeps(param1: int = 0): Vector<CreepInfo> {
        if (param1 == 0) {
            print("lol, you silly person. You can\'t do this with housing... for no good reason");
        }
        let _loc2_: Vector<CreepInfo> = new Vector<CreepInfo>(0, false, CreepInfo);
        let _loc3_: int = this.m_creeps.length | 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc3_) {
            if (as3.vget(this.m_creeps, _loc5_).ownerID == param1) {
                _loc2_.push(as3.vget(this.m_creeps, _loc5_));
                _loc4_++;
            }
            _loc5_++;
        }
        return _loc2_;
    }

    /**
     * Removes the record of this very creep. add(-1) drops the last record in the list, whoever it
     * belongs to, which was fine while records were only counted; now that each carries a health it
     * would leave the dead monster's record behind and delete a living one's.
     */
    public ioRemoveCreep(param1: MonsterBase): boolean {
        let i: int = ((this.m_creeps.length | 0) - 1) | 0;
        while (i >= 0) {
            if (as3.vget(this.m_creeps, i).self == param1) {
                this.m_creeps.splice(i, 1);
                return true;
            }
            i--;
        }
        return false;
    }

    public linkCreepToData(param1: MonsterBase, param2: int = 0): void {
        let _loc3_: int = this.m_creeps.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_ && (as3.vget(this.m_creeps, _loc4_).self || !as3.vget(this.m_creeps, _loc4_).ownerID && as3.vget(this.m_creeps, _loc4_).health < this.m_maxHealth || as3.vget(this.m_creeps, _loc4_).ownerID != param2)) {
            _loc4_++;
        }
        if (_loc4_ < _loc3_) {
            as3.vget(this.m_creeps, _loc4_).self = param1;
        } else {
            print("what the fuck??? linkCreepToData, you somehow tried to assign a creep past the number of creeps you have???");
        }
    }

    public unlinkCreepFromData(param1: MonsterBase): void {
        let _loc2_: int = this.m_creeps.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            if (as3.vget(this.m_creeps, _loc3_).self == param1) {
                as3.vget(this.m_creeps, _loc3_).health = param1.health;
                as3.vget(this.m_creeps, _loc3_).self = null;
            }
            _loc3_++;
        }
    }

    public clear(): void {
        let _loc1_: int = this.m_creeps.length | 0;
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_) {
            as3.vget(this.m_creeps, _loc2_).self = null;
            _loc2_++;
        }
    }

    public reserve(param1: uint): CreepInfo {
        let _loc2_: int = this.m_creeps.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            if (!(as3.vget(this.m_creeps, _loc3_).ownerID != 0 || as3.vget(this.m_creeps, _loc3_).health < this.m_maxHealth)) {
                as3.vget(this.m_creeps, _loc3_).ownerID = param1;
                break;
            }
            _loc3_++;
        }
        if (_loc3_ < _loc2_) {
            return as3.vget(this.m_creeps, _loc3_);
        }
        return null;
    }

    public release(param1: uint): CreepInfo {
        let _loc2_: int = this.m_creeps.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            if (as3.vget(this.m_creeps, _loc3_).ownerID == param1 && as3.vget(this.m_creeps, _loc3_).health >= this.m_maxHealth) {
                as3.vget(this.m_creeps, _loc3_).ownerID = 0;
                return as3.vget(this.m_creeps, _loc3_);
            }
            _loc3_++;
        }
        return null;
    }
}
