import * as as3 from "as3";
import { uint } from "as3";
import { StageDisplayState } from "flash/display";
import { Event, FullScreenEvent, IOErrorEvent, KeyboardEvent, MouseEvent, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { FriendPicker, GLOBAL, KEYS, LOGGER, MapRoomManager, Message_CLIPB, SOUNDS, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom, frame } from "@game";

export class Message extends Message_CLIPB {
    static {
        as3.fields(this, { requestType: "message", sendHandler: null, successHandler: null, truceShareHandler: null, timer: null, picker: null, baseID: 0 });
    }

    public static readonly GRAY: uint = 6710886;

    public static readonly BLACK: uint = 0;
    public requestType: string;
    public sendHandler: Function;
    public successHandler: Function;
    public truceShareHandler: Function;
    private timer: Timer;
    public picker: FriendPicker;
    // Base ids are larger than an int holds; an int wrapped them to another base's id.
    public baseID: number;

    public $ctor(param1: string = "all"): void {
        super.$ctor();
        (as3.as(this.mcFrame, frame)).Setup(true, as3.bind(this, this.closeDown));
        this.picker = new FriendPicker(param1);
        this.picker.x = 238;
        this.picker.y = 65;
        this.baseID = 0;
        this.addChild(this.picker);
        this.sendBtn.SetupKey("btn_send");
        this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        this.status_txt.htmlText = "";
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
        this.timer = new Timer(100);
        this.timer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.Validate));
        this.timer.start();
        this.tolabel_txt.htmlText = KEYS.Get("mail_new_to");
        this.subjectlabel_txt.htmlText = KEYS.Get("mail_new_subject");
        this.messagelabel_txt.htmlText = KEYS.Get("mail_new_message");
    }

    public static getNotWS(param1: string): string {
        param1 = param1.split("\r").join("");
        param1 = param1.split("\t").join("");
        param1 = param1.split("\n").join("");
        return param1.split(" ").join("");
    }

    public static cleanText(param1: string): string {
        let _loc3_: string = null;
        let _loc4_: uint = 0;
        let _loc2_: any[] = param1.split("\r");
        if (_loc2_.length > 1) {
            _loc3_ = String(_loc2_[0]);
            _loc4_ = 1;
            while (_loc4_ < _loc2_.length) {
                _loc3_ += " " + _loc2_[_loc4_];
                _loc4_++;
            }
            return _loc3_;
        }
        return param1;
    }

    private onAdd(param1: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.y = -15;
        this.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onEscapeListener));
        this.stage.addEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.detectFS));
        this.detectFS();
    }

    private detectFS(param1: FullScreenEvent = null): void {
        if (Boolean(this.stage) && this.stage.displayState == StageDisplayState.FULL_SCREEN) {
            // Inferno-only fix: this window's warning clip (Message_CLIPB.fsWarning) holds a static text,
            // not a "tBody" field like Thread's and the sign's, so setting it threw #1010 in Flash too.
            if (this.fsWarning.tBody) {
                this.fsWarning.tBody.htmlText = KEYS.Get("fswarning");
            }
            this.addChild(this.fsWarning);
        } else if (this.contains(this.fsWarning)) {
            this.removeChild(this.fsWarning);
        }
    }

    private onEscapeListener(param1: KeyboardEvent): void {
        if (param1.charCode == 27) {
            this.closeDown();
        }
    }

    public init(): void {
        this.body_txt.htmlText = "";
        this.subject_txt.textColor = Message.GRAY;
        this.subject_txt.htmlText = "<b>";
        this.subject_txt.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.subjectDown));
    }

    private subjectDown(param1: MouseEvent): void {
        this.subject_txt.textColor = Message.BLACK;
        this.subject_txt.text = "";
        this.subject_txt.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.subjectDown));
        this.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKey));
    }

    private onKey(param1: KeyboardEvent): void {
        if (param1.keyCode == 13) {
            if (this.stage.focus == this.subject_txt) {
                this.stage.focus = this.body_txt;
                this.body_txt.text = "";
            }
        }
    }

    public Validate(...rest: any[]): void {
        let _loc2_: boolean = true;
        if (!this.picker.currentSelection) {
            _loc2_ = false;
        }
        if (Message.getNotWS(this.subject_txt.text).length == 0 || this.subject_txt.text == "Subject") {
            _loc2_ = false;
        }
        if (Message.getNotWS(this.body_txt.text).length < 2) {
            _loc2_ = false;
        }
        if (_loc2_) {
            this.sendBtn.Enabled = true;
            this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        } else {
            this.sendBtn.Enabled = false;
            this.sendBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        }
    }

    private sendDown(param1: MouseEvent): void {
        let _loc2_: string = this.body_txt.text;
        let _loc3_: number = this.picker.getCurrentData().userid;
        let _loc4_: any[] = [["threadid", 0], ["targetid", _loc3_], ["targetbaseid", 0], ["type", this.requestType], ["subject", this.subject_txt.text], ["message", _loc2_]];
        let _loc5_: URLLoaderApi = new URLLoaderApi();
        if (this.requestType == "migraterequest" && this.baseID != 0) {
            _loc4_.push(["baseid", this.baseID]);
        }
        _loc5_.load(GLOBAL._apiURL + "player/sendmessage", _loc4_, as3.bind(this, this.onSuccess), as3.bind(this, this.onFail));
        this.sendBtn.Enabled = false;
        this.sendBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
    }

    private onSuccess(param1: any): void {
        if (param1.error != undefined && param1.error != 0) {
            try {
                LOGGER.Log("err", "mailbox-" + param1.error);
            } catch (e) {
            }
            this.displayError(as3.is(param1.error, String) ? String(param1.error) : null);
        } else {
            if (this.requestType == "trucerequest") {
                try {
                    this.truceShareHandler(this.picker.getCurrentData().firstname, "");
                } catch (e) {
                }
            }
            this.closeDown();
            this.dispatchEvent(new Event(Event.COMPLETE));
            if (this.requestType == "migraterequest" && MapRoomManager.instance.isInMapRoom2) {
                MapRoom.SetPendingInvitation();
                MapRoom.HideInfoMine();
            }
            try {
                this.successHandler(param1);
            } catch (e) {
            }
        }
    }

    private onFail(param1: IOErrorEvent): void {
        this.displayError();
    }

    public displayError(param1: string = null): void {
        if (param1) {
            this.status_txt.htmlText = param1;
        } else if (this.requestType == "migraterequest") {
            this.status_txt.htmlText = KEYS.Get("mailbox_invitepending");
        } else {
            this.status_txt.htmlText = KEYS.Get("mail_messagefailed");
        }
        this.sendBtn.Enabled = true;
        this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
    }

    private closeDown(param1: MouseEvent = null): void {
        this.stage.removeEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.detectFS));
        this.parent.removeChild(this);
        SOUNDS.Play("close");
    }

    public Resize(): void {
    }

    private onRemoved(param1: Event): void {
        GLOBAL.BlockerRemove();
        this.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onEscapeListener));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
        this.timer.stop();
    }
}
