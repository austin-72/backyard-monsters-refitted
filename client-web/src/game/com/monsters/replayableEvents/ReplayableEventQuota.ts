import * as as3 from "as3";
import { ASObject, int } from "as3";
import { FrontPageGraphic, GLOBAL, IExportable, POPUPS, RewardHandler, RewardLibrary, com_monsters_frontPage_messages_Message as Message } from "@game";

export class ReplayableEventQuota extends ASObject implements IExportable {
    static {
        as3.implement(this, [IExportable]);
        as3.fields(this, { rewardID: null, imageURL: null, quota: NaN, message: null, _dateAwarded: 0 });
    }

    public rewardID: string;
    public imageURL: string;
    public quota: number;
    public message: Message;
    protected _dateAwarded: int;

    public $ctor(param1?: number, param2: string = null, param3: string = null, param4: Message = null): void {
        super.$ctor();
        this.rewardID = param3;
        this.imageURL = param2;
        this.quota = param1;
        this.message = param4;
    }

    public get hasBeenAwarded(): boolean {
        return this._dateAwarded > 0;
    }

    public metQuota(): void {
        if (this.rewardID) {
            RewardHandler.instance.addAndApplyReward(RewardLibrary.getRewardByID(this.rewardID));
        }
        if (this.message) {
            POPUPS.Push(new FrontPageGraphic(this.message));
        }
        this._dateAwarded = GLOBAL.Timestamp();
    }

    public exportData(): any {
        if (!this._dateAwarded) {
            return null;
        }
        return { "dateAwarded": this._dateAwarded };
    }

    public importData(param1: any): void {
        if (!param1) {
            return;
        }
        this._dateAwarded = param1["dateAwarded"] | 0;
    }
}
