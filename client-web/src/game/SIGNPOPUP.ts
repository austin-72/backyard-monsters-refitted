import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, SimpleButton, Sprite, StageDisplayState } from "flash/display";
import { Event, FullScreenEvent, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { TextField } from "flash/text";
import { Timer } from "flash/utils";
import { BASE, BFOUNDATION, Button, Contact, FriendPicker, GLOBAL, KEYS, LOGGER, POPUPSETTINGS, SIGNS, URLLoaderApi, com_monsters_mailbox_Message as Message } from "@game";

export class SIGNPOPUP extends Sprite {
    static {
        as3.fields(this, { picker: null, sendBtn: null, subject_txt: null, status_txt: null, closeBtn: null, bg_mc: null, requestType: "subject", timer: null, fsWarning: null, _sign: null, _senderName: null, _senderPic: null, _senderid: 0, _subject: null, _mode: null });
    }

    public static readonly GRAY: uint = 6710886;

    public static readonly BLACK: uint = 0;
    public picker: FriendPicker;
    public sendBtn: Button;
    public subject_txt: TextField;
    public status_txt: TextField;
    public closeBtn: SimpleButton;
    public bg_mc: MovieClip;
    public requestType: string;
    private timer: Timer;
    public fsWarning: MovieClip;
    public _sign: BFOUNDATION;
    public _senderName: string;
    public _senderPic: string;
    public _senderid: int;
    public _subject: string;
    public _mode: string;

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
        this.timer = new Timer(100);
        this.timer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.Validate));
        this.timer.start();
        this.closeBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.closeDown));
        let _loc1_: Contact = new Contact(String(BASE._userID), { "first_name": BASE._ownerName, "last_name": "", "pic_square": BASE._ownerPic });
        this.picker.preloadSelection(_loc1_);
    }

    private closeDown(param1: MouseEvent): void {
        let _loc2_: string = !(!this.subject_txt.text) ? this.subject_txt.text : "No Message";
        this._sign.SetGiftingProps(0, _loc2_, this._senderid, this._senderName, this._senderPic);
        SIGNS.Hide();
    }

    private sendDown(param1: MouseEvent): void {
        let _loc3_: any[] = null;
        this._sign._subject = this.subject_txt.text;
        this._subject = this.subject_txt.text;
        let _loc2_: number = this.picker.getCurrentData().userid;
        let _loc4_: URLLoaderApi = new URLLoaderApi();
        if (this._mode == "create") {
            _loc3_ = [["threadid", 0], ["targetid", _loc2_], ["targetbaseid", 0], ["type", this.requestType], ["subject", this._subject]];
            _loc4_.load(GLOBAL._apiURL + "player/sendmessage", _loc3_, as3.bind(this, this.onSuccess), as3.bind(this, this.onFail));
            this.sendBtn.Enabled = false;
            this.sendBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        } else if (this._mode == "edit") {
            _loc3_ = [["threadid", this._sign._threadid], ["subject", this._subject]];
            _loc4_.load(GLOBAL._apiURL + "player/editthread", _loc3_, as3.bind(this, this.onSuccess), as3.bind(this, this.onFail));
            this.sendBtn.Enabled = false;
            this.sendBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        }
    }

    public Setup(): void {
        if (this._mode == "create") {
            this.sendBtn.SetupKey("btn_send");
        } else if (this._mode == "edit") {
            this.sendBtn.SetupKey("btn_save");
            this.subject_txt.text = this._subject;
        }
        this.status_txt.text = "";
    }

    private onSuccess(param1: any): void {
        if (param1.error != undefined && param1.error != 0) {
            try {
                LOGGER.Log("err", "mailbox-" + param1.error);
            } catch (e) {
            }
            this.displayError();
        } else {
            this._sign.SetGiftingProps(param1.threadid | 0, this._subject, this._senderid, this._senderName, this._senderPic);
            SIGNS.Hide();
        }
    }

    private onFail(param1: IOErrorEvent): void {
        this.displayError();
    }

    public displayError(): void {
        this.status_txt.text = "Message failed";
        this.sendBtn.Enabled = true;
        this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
    }

    private onAdd(param1: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.Center();
        this.stage.addEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.detectFS));
        this.detectFS();
    }

    private detectFS(param1: FullScreenEvent = null): void {
        if (Boolean(this.stage) && this.stage.displayState == StageDisplayState.FULL_SCREEN) {
            this.fsWarning.tBody.htmlText = KEYS.Get("fswarning");
            this.addChild(this.fsWarning);
        } else if (this.contains(this.fsWarning)) {
            this.removeChild(this.fsWarning);
        }
    }

    private onRemoved(param1: Event): void {
        this.stage.removeEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.detectFS));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
        this.timer.stop();
    }

    private Validate(param1: TimerEvent): void {
        let _loc2_: boolean = true;
        if (!this.picker.currentSelection) {
            _loc2_ = false;
        }
        if (Message.getNotWS(this.subject_txt.text).length == 0 || this.subject_txt.text == "Subject") {
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

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
