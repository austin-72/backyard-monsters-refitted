import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BASE, GLOBAL, IHandler, Reward, RewardLibrary, UPDATES } from "@game";

export class RewardHandler extends ASObject implements IHandler {
    static {
        as3.implement(this, [IHandler]);
        as3.fields(this, { rewards: null });
    }

    public static readonly k_UPDATE_ADD: string = "RA";

    public static readonly k_UPDATE_REMOVE: string = "RR";

    public static readonly k_UPDATE_VALUE: string = "RV";

    private static _instance: RewardHandler = null;
    public rewards: Vector<Reward>;

    public $ctor(): void {
        this.rewards = new Vector<Reward>(0, false, Reward);
        super.$ctor();
    }

    public static get instance(): RewardHandler {
        if (!RewardHandler._instance) {
            RewardHandler._instance = new RewardHandler();
        }
        return RewardHandler._instance;
    }

    public get name(): string {
        return "rewards";
    }

    public addReward(param1: Reward): boolean {
        if (this.getRewardByID(param1.id)) {
            return false;
        }
        this.rewards.push(param1);
        return true;
    }

    public addAndApplyReward(param1: Reward, param2: boolean = false): void {
        if (this.addReward(param1) || param2) {
            this.applyReward(param1);
        }
    }

    public applyReward(param1: Reward): void {
        param1.applyReward();
    }

    private applyRewards(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this.rewards.length) {
            this.applyReward(as3.vget(this.rewards, _loc1_));
            _loc1_++;
        }
    }

    public getRewardByID(param1: string): Reward {
        let _loc3_: Reward = null;
        let _loc2_: int = 0;
        while (_loc2_ < this.rewards.length) {
            _loc3_ = as3.vget(this.rewards, _loc2_);
            if (_loc3_.id == param1) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }

    public removeRewardByID(param1: string): void {
        let _loc2_: Reward = this.getRewardByID(param1);
        if (_loc2_) {
            this.removeReward(_loc2_);
        }
    }

    public removeReward(param1: Reward): void {
        let _loc2_: int = this.rewards.indexOf(param1) | 0;
        if (_loc2_ >= 0) {
            param1.removed();
            this.rewards.splice(_loc2_, 1);
        }
    }

    public clear(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this.rewards.length) {
            as3.vget(this.rewards, _loc1_).reset();
            _loc1_++;
        }
        as3.vsetLength(this.rewards, 0);
    }

    public initialize(param1: any = null): void {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        UPDATES.addAction(as3.bind(this, this.processUpdate), this.name);
        if (!RewardLibrary.rewardTypes) {
            RewardLibrary.initialize();
        }
        if (param1) {
            this.importData(param1);
        }
        this.applyRewards();
    }

    public exportData(): any {
        let _loc3_: Reward = null;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE.isInfernoMainYardOrOutpost) {
            return null;
        }
        let _loc1_: any = {};
        let _loc2_: int = 0;
        while (_loc2_ < this.rewards.length) {
            _loc3_ = as3.vget(this.rewards, _loc2_);
            _loc1_[_loc3_.id] = _loc3_.exportData();
            _loc2_++;
        }
        return _loc1_;
    }

    public importData(param1: any): void {
        let _loc2_: string = null;
        let _loc3_: Reward = null;
        for (_loc2_ in param1) {
            _loc3_ = RewardLibrary.getRewardByID(_loc2_);
            if (Boolean(_loc3_) && Boolean(param1[_loc2_])) {
                _loc3_.importData(param1[_loc2_]);
                this.addReward(_loc3_);
            }
        }
    }

    public updateExistingOrAddNewReward(param1: string, param2: any = null): Reward {
        let _loc3_: Reward = this.getRewardByID(param1);
        if (!_loc3_) {
            _loc3_ = RewardLibrary.getRewardByID(param1);
        }
        if (_loc3_) {
            this.addReward(_loc3_);
            if (param2) {
                _loc3_.value = param2;
            }
        }
        return _loc3_;
    }

    public processUpdate(param1: any): boolean {
        let _loc2_: Reward = null;
        switch (param1.data[1]) {
            case RewardHandler.k_UPDATE_ADD:
                _loc2_ = RewardLibrary.getRewardByID(as3.str(param1.data[2]));
                if (_loc2_) {
                    RewardHandler.instance.addAndApplyReward(_loc2_);
                }
                break;
            case RewardHandler.k_UPDATE_REMOVE:
                RewardHandler.instance.removeRewardByID(as3.str(param1.data[2]));
                break;
            case RewardHandler.k_UPDATE_VALUE:
                _loc2_ = RewardHandler.instance.getRewardByID(as3.str(param1.data[2]));
                if (_loc2_) {
                    _loc2_.value = param1.data[3];
                    RewardHandler.instance.addAndApplyReward(_loc2_, true);
                }
                BASE.Save(0, false, true);
                break;
            case RewardHandler.k_UPDATE_VALUE:
                _loc2_ = RewardHandler.instance.getRewardByID(as3.str(param1.data[2]));
                if (_loc2_) {
                    _loc2_.value = param1.data[3];
                    RewardHandler.instance.addAndApplyReward(_loc2_, true);
                }
                BASE.Save(0, false, true);
        }
        return true;
    }
}
