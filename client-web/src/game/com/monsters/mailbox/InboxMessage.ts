import * as as3 from "as3";
import { uint } from "as3";
import { DisplayObject, Loader } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { Contact, InboxMessage_CLIP, KEYS, LOGIN, SOUNDS, ThreadData, TimeUtils } from "@game";

export class InboxMessage extends InboxMessage_CLIP {
    static {
        as3.fields(this, { firstname: null, sendtime: NaN, subject: null, unread: 0, image: undefined, data: null, isAdmin: false });
    }

    public firstname: string;
    public sendtime: number;
    public subject: string;
    public unread: uint;
    public image: any;
    public data: ThreadData;
    public isAdmin: boolean;

    public $ctor(): void {
        super.$ctor();
        this.b1.SetupKey("mail_open_btn");
        this.b1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.openDown));
    }

    private openDown(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        this.dispatchEvent(new Event("open"));
    }

    public Setup(param1: ThreadData): void {
        this.data = param1;
        this.isAdmin = param1.userid == 0;
        this.data.addEventListener(Event.CHANGE, as3.bind(this, this.displayData));
        this.displayData();
    }

    public displayData(...rest: any[]): void {
        let _loc2_: Contact = null;
        let _loc3_: string = null;
        if (this.data.userid == LOGIN._playerID) {
            _loc2_ = Contact.contactWithUserId(this.data.targetid >>> 0);
        } else {
            _loc2_ = Contact.contactWithUserId(this.data.userid >>> 0);
        }
        if (this.isAdmin) {
            _loc2_ = Contact.contactWithUserId(this.data.userid >>> 0, true);
        }
        if (_loc2_) {
            this.firstname = _loc2_.firstname;
            _loc3_ = _loc2_.lastname.length > 1 ? " " + _loc2_.lastname.charAt(0).toUpperCase() + "." : "";
            this.sender_txt.htmlText += _loc2_.firstname + _loc3_;
        } else {
            this.firstname = "";
        }
        this.bg_mc.gotoAndStop("white");
        if (this.isAdmin) {
            this.bg_mc.gotoAndStop("admin");
        } else if (this.data.trucestate) {
            if (this.data.trucestate == "requested") {
                this.subjectType_txt.htmlText = "<b>" + KEYS.Get("inbox_trucerequested");
                this.bg_mc.gotoAndStop("blue");
            } else if (this.data.trucestate == "rejected") {
                this.subjectType_txt.htmlText = "<b>" + KEYS.Get("inbox_trucerejected");
                this.bg_mc.gotoAndStop("red");
            } else if (this.data.trucestate == "accepted") {
                this.subjectType_txt.htmlText = "<b>" + KEYS.Get("inbox_truceaccepted");
                this.bg_mc.gotoAndStop("green");
            }
        }
        if (this.data.unread) {
            this.subject_txt.htmlText = "<b>" + this.data.subject;
            this.sender_txt.htmlText = "<b>" + this.firstname + _loc3_;
            this.sent_txt.htmlText = "<b>" + this.getTimeDistanceString(this.data.sendtime);
            this.unread = 1;
            this.dot_mc.visible = true;
        } else {
            this.subject_txt.htmlText = this.data.subject;
            this.sender_txt.htmlText = this.firstname + _loc3_;
            this.sent_txt.htmlText = this.getTimeDistanceString(this.data.sendtime);
            this.unread = 0;
            this.dot_mc.visible = false;
        }
        this.sendtime = this.data.sendtime;
        this.subject = this.data.subject;
        this.userid_txt.htmlText = KEYS.Get("label_userid", { "v1": this.data.userid });
        this.replies_txt.htmlText = KEYS.Get("mail_numreplies", { "v1": this.data.messagecount - 1 });
    }

    public shouldLoadImage(): void {
        let _loc1_: Contact = null;
        let _loc2_: any = null;
        if (!this.image && !this.isAdmin) {
            this.image = new Loader();
            this.image.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onImgComplete));
            this.image.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.onErr));
            if (this.data.userid == LOGIN._playerID) {
                _loc1_ = Contact.contactWithUserId(this.data.targetid >>> 0, true);
            } else {
                _loc1_ = Contact.contactWithUserId(this.data.userid >>> 0, true);
            }
            if (_loc1_) {
                try {
                    this.image.load(new URLRequest(_loc1_.pic), new LoaderContext(true));
                } catch (e) {
                }
            }
        } else if (this.isAdmin && !this.image) {
            _loc2_ = Contact.contactWithUserId(this.data.userid >>> 0, true).picClass;
            this.image = new _loc2_();
            this.onImgComplete();
        }
    }

    private onErr(param1: IOErrorEvent): void {
    }

    private onImgComplete(param1: Event = null): void {
        this.addChildAt(as3.cast(this.image, DisplayObject), 0);
        this.image.x = this.placeholder.x;
        this.image.y = this.placeholder.y;
        this.image.width = this.image.height = 50;
        if (this.contains(this.placeholder)) {
            this.removeChild(this.placeholder);
        }
    }

    public getTimeDistanceString(param1: number): string {
        return TimeUtils.TimeDistance(param1);
    }
}
