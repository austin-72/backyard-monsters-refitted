import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { KEYS } from "@game";

export class Contact extends ASObject {
    static {
        as3.fields(this, { firstname: null, lastname: null, pic: null, userid: 0, friend: false, picClass: null });
    }

    public static contacts: any[] = [];

    public static unlisted: any[] = [];
    public firstname: string;
    public lastname: string;
    public pic: string;
    public userid: int;
    public friend: boolean;
    public picClass: any;

    public $ctor(param1?: string, param2?: any, param3: boolean = false): void {
        super.$ctor();
        this.userid = Number(param1) | 0;
        this.firstname = as3.str(param2.first_name);
        this.lastname = as3.str(param2.last_name);
        this.pic = as3.str(param2.pic_square);
        if (!param3 && !Contact.contactWithUserId(this.userid >>> 0)) {
            Contact.contacts.push(this);
        } else if (param3 && !Contact.contactWithUserId(this.userid >>> 0)) {
            Contact.unlisted.push(this);
        }
        this.friend = param2.friend == 1;
    }

    public static contactWithUserId(param1: uint, param2: boolean = false): Contact {
        let _loc4_: Contact = null;
        let _loc5_: Contact = null;
        let _loc3_: any[] = param2 ? Contact.contacts.concat(Contact.unlisted) : Contact.contacts;
        for (_loc5_ of as3.values(_loc3_)) {
            if (_loc5_.userid == param1) {
                _loc4_ = _loc5_;
                break;
            }
        }
        return _loc4_;
    }

    public toString(): string {
        return KEYS.Get("contact_tostring", { "v1": this.lastname, "v2": this.firstname, "v3": this.userid });
    }
}
