import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { com_monsters_frontPage_messages_Message as Message } from "@game";

export class Category extends ASObject {
    static {
        as3.fields(this, { priority: 0, name: null, lastMessageSeen: null, _messages: null, _doesViewRepeatedly: true });
    }

    public priority: uint;
    public name: string;
    public lastMessageSeen: Message;
    protected _messages: Vector<Message>;
    protected _doesViewRepeatedly: boolean;

    public $ctor(): void {
        this._messages = new Vector<Message>(0, false, Message);
        super.$ctor();
    }

    public getNextQualifiedMessage(): Message {
        let _loc1_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: Message = null;
        if (this.lastMessageSeen) {
            if ((_loc4_ = this._messages.indexOf(this.lastMessageSeen) | 0) >= 0) {
                _loc1_ = (_loc4_ + 1) | 0;
                if (_loc1_ >= this._messages.length) {
                    _loc1_ = 0;
                }
            }
        }
        let _loc2_: boolean = false;
        let _loc3_: int = _loc1_;
        _loc3_ = _loc1_;
        while (_loc3_ < this._messages.length) {
            if ((!(_loc5_ = as3.vget(this._messages, _loc3_)).hasBeenSeen || this._doesViewRepeatedly) && _loc5_.areRequirementsMet) {
                return _loc5_;
            }
            if (_loc3_ == this._messages.length - 1) {
                _loc3_ = -1;
                _loc2_ = true;
            }
            if (_loc2_ && _loc3_ == _loc1_ - 1) {
                break;
            }
            _loc3_++;
        }
        return null;
    }

    public addMessage(param1: Message): void {
        this._messages.push(param1);
        param1.category = this;
    }

    public setup(param1: any): void {
        let _loc2_: string = null;
        let _loc3_: Message = null;
        this.lastMessageSeen = this.getMessageByName(as3.str(param1.lastMessage));
        for (_loc2_ in param1) {
            _loc3_ = this.getMessageByName(_loc2_);
            if (_loc3_) {
                _loc3_.setup(param1[_loc2_]);
            }
        }
    }

    public export(): any {
        let _loc4_: Message = null;
        let _loc5_: any = null;
        let _loc1_: boolean = false;
        let _loc2_: any = {};
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

    public getMessageByName(param1: string): Message {
        let _loc3_: Message = null;
        let _loc2_: int = 0;
        while (_loc2_ < this._messages.length) {
            _loc3_ = as3.vget(this._messages, _loc2_);
            if (_loc3_.name == param1) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }
}
