import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ChatData, IAuthenticationSystem, UserRecord, md5 } from "@game";

/**
 * Authentication system for chat login.
 * Uses ChatData for platform-neutral parameter passing.
 */
export class AS_Login extends ASObject implements IAuthenticationSystem {
    static {
        as3.implement(this, [IAuthenticationSystem]);
        as3.fields(this, { user: null, password: null, params: null, SALT_SEED: "073c187f8a02f626210bbcb7f55a4cee" });
    }

    private user: UserRecord;
    private password: string;
    private params: ChatData;
    private SALT_SEED: string;

    public $ctor(param1?: UserRecord): void {
        super.$ctor();
        this.user = param1;
    }

    public authenticate(): boolean {
        let _loc1_: int = (Math.random() * 9999999) | 0;
        this.password = md5(this.SALT_SEED + this.user.Name + _loc1_ * (_loc1_ % 11));
        this.params = new ChatData();
        this.params.putLong("hnumber", _loc1_);
        this.params.putUtfString("pass", this.password);
        return true;
    }

    public get User(): UserRecord {
        return this.user;
    }

    public get Password(): string {
        return this.password;
    }

    public get Params(): ChatData {
        return this.params;
    }
}
