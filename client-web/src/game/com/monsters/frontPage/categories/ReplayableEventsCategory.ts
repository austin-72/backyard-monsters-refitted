import * as as3 from "as3";
import { int } from "as3";
import { Category, com_monsters_frontPage_messages_Message as Message } from "@game";

export class ReplayableEventsCategory extends Category {
    static {
        as3.fields(this, { m_importedData: null });
    }

    private m_importedData: any;

    public $ctor(): void {
        this.m_importedData = {};
        super.$ctor();
        this.priority = 6;
        this.name = "Replayable Events";
        this._doesViewRepeatedly = false;
    }

    public override export(): any {
        let _loc4_: Message = null;
        let _loc5_: any = null;
        let _loc1_: boolean = true;
        let _loc2_: any = this.m_importedData;
        _loc2_.name = this.name;
        if (this.lastMessageSeen) {
            _loc2_.lastMessage = this.lastMessageSeen.name;
            _loc1_ = true;
        }
        let _loc3_: int = 0;
        while (_loc3_ < this._messages.length) {
            _loc4_ = as3.vget(this._messages, _loc3_);
            _loc5_ = _loc4_.export();
            if (_loc5_) {
                _loc2_[_loc4_.name] = _loc5_;
                _loc1_ = true;
            }
            _loc3_++;
        }
        if (!_loc1_) {
            return null;
        }
        return _loc2_;
    }

    public override setup(param1: any): void {
        this.m_importedData = param1;
        super.setup(param1);
    }
}
