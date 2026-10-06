import * as as3 from "as3";
import { ASObject, int } from "as3";

/**
 * Neutral room type for chat system abstraction.
 * Replaces direct dependency on SmartFoxServer Room type.
 */
export class ChatRoom extends ASObject {
    static {
        as3.fields(this, { _id: 0, _name: null, _userCount: 0, _maxUsers: 0 });
    }

    private _id: int;
    private _name: string;
    private _userCount: int;
    private _maxUsers: int;

    public $ctor(id?: int, name?: string, userCount: int = 0, maxUsers: int = 0): void {
        super.$ctor();
        this._id = id;
        this._name = name;
        this._userCount = userCount;
        this._maxUsers = maxUsers;
    }

    public get id(): int {
        return this._id;
    }

    public get name(): string {
        return this._name;
    }

    public get userCount(): int {
        return this._userCount;
    }

    public get maxUsers(): int {
        return this._maxUsers;
    }
}
