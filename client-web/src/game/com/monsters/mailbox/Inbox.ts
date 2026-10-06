import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { TextField, TextFormat } from "flash/text";
import { GLOBAL, InboxMessage, Inbox_CLIP, KEYS, LOGIN, MAILBOX, MailBox, SOUNDS, Thread, ThreadData, TweenLite, URLLoaderApi, com_monsters_mailbox_Message as Message, frame } from "@game";

export class Inbox extends Inbox_CLIP {
    static {
        as3.fields(this, { config: null, currentConfig: -1, activeBox: null, rowsPerPage: 6, shell: null, currentPage: 0, pageLimit: 0, currentSorter: null, currentSort: null, reversed: false, _sorters: null, firstLoaded: false });
    }

    public static sent: any[] = null;

    public static recd: any[] = null;

    public static all: any[] = null;

    public static _instance: Inbox = null;
    public config: any[];
    private currentConfig: int;
    public activeBox: any[];
    private rowsPerPage: uint;
    private shell: Sprite;
    public currentPage: uint;
    public pageLimit: uint;
    private currentSorter: MovieClip;
    private currentSort: string;
    private reversed: boolean;
    public _sorters: Sprite;
    private firstLoaded: boolean;

    public $ctor(): void {
        let _loc2_: MovieClip = null;
        super.$ctor();
        (as3.as(this.mcFrame, frame)).Setup(true, MailBox.Hide);
        this.newBtn.SetupKey("btn_compose");
        this.newBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onNewDown));
        this._sorters = new Sprite();
        this.addChild(this._sorters);
        this.bPrevious.Trigger();
        this.bNext.Trigger();
        this.bNext.visible = this.bPrevious.visible = false;
        this.bPrevious.buttonMode = this.bNext.buttonMode = true;
        let _loc1_: any[] = [this.fromBtn, this.subjectBtn, this.dateBtn, this.unreadBtn];
        for (_loc2_ of as3.values(_loc1_)) {
            _loc2_.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.sortHandler));
            _loc2_.mouseChildren = false;
            _loc2_.buttonMode = true;
            _loc2_.useHandCursor = true;
            _loc2_.sorter_mc.gotoAndStop(1);
            this.removeChild(_loc2_);
        }
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only: the column headings had no words (the art only has their boxes)
            Inbox.ioHeading(this.fromBtn, "alliance_col_from");
            Inbox.ioHeading(this.subjectBtn, "alliance_col_subject");
            Inbox.ioHeading(this.dateBtn, "alliance_col_date");
        }
        this.noMessages_btn.visible = false;
        this.noMessages_btn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onNewDown));
        this.noMessages_btn.useHandCursor = true;
        this.noMessages_btn.buttonMode = true;
        this.noMessages_btn.mouseChildren = false;
        this.config = [{ "controls": [this.fromBtn, this.subjectBtn, this.dateBtn, this.unreadBtn], "button": this.inBtn, "itemMode": "inbox", "defaultSorter": this.dateBtn }, { "controls": [this.subjectBtn, this.dateBtn], "button": this.outBtn, "itemMode": "outbox", "defaultSorter": this.dateBtn }, { "controls": [this.fromBtn, this.subjectBtn, this.dateBtn, this.unreadBtn], "button": this.outBtn, "itemMode": "all", "defaultSorter": this.dateBtn }];
        this.inBtn.SetupKey("btn_inbox");
        this.outBtn.SetupKey("btn_outbox");
        this.removeChild(this.inBtn);
        this.removeChild(this.outBtn);
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.title_txt.htmlText = KEYS.Get("mail_title");
        this.noMessages_btn.label_txt.htmlText = "<b>" + KEYS.Get("mail_nomessages") + "</b>";
        Inbox._instance = this;
    }

    public static openThread(param1: ThreadData): void {
        let _loc2_: Thread = new Thread();
        _loc2_._mc = _loc2_;
        _loc2_.Setup(param1);
        MailBox.ShowThread(_loc2_);
    }

    private static onThreadOpen(param1: Event): void {
        let _loc2_: ThreadData = as3.cast(param1.target, InboxMessage).data;
        Inbox.openThread(_loc2_);
    }

    public static pushNewMessage(param1: ThreadData): void {
        let _loc2_: InboxMessage = new InboxMessage();
        _loc2_.Setup(param1);
        _loc2_.addEventListener("open", Inbox.onThreadOpen);
        if (param1.targetid == LOGIN._playerID || param1.messagecount > 1) {
            Inbox.recd.push(_loc2_);
        } else {
            Inbox.sent.push(_loc2_);
        }
        Inbox.all.push(_loc2_);
    }

    private onAdd(param1: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
    }

    public showIn(...rest: any[]): void {
        this.inBtn.Highlight = true;
        this.outBtn.Highlight = false;
        this.activeBox = Inbox.all;
        this.configureForObjectIndex(2);
    }

    public showOut(...rest: any[]): void {
        this.inBtn.Highlight = false;
        this.outBtn.Highlight = true;
        this.configureForObjectIndex(2);
    }

    public configureForObjectIndex(param1: uint = 0): void {
        let _loc3_: MovieClip = null;
        let _loc4_: MovieClip = null;
        let _loc2_: any = this.config[param1];
        if (this.currentConfig >= 0) {
            for (_loc4_ of as3.values(this.config[this.currentConfig].controls)) {
                if (this._sorters.contains(_loc4_)) {
                    this._sorters.removeChild(_loc4_);
                }
            }
        }
        for (_loc3_ of as3.values(_loc2_.controls)) {
            this._sorters.addChild(_loc3_);
        }
        this.currentConfig = param1;
        this.currentSort = "";
        this.reversed = true;
        _loc2_.defaultSorter.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DOWN));
    }

    public Setup(): void {
        this.shell = new Sprite();
        this.addChild(this.shell);
        this.shell.mask = this.mask_mc;
        Inbox.sent = new Array();
        Inbox.recd = new Array();
        Inbox.all = new Array();
        this.Tick();
    }

    public Tick(...rest: any[]): void {
        let _loc2_: URLLoaderApi = new URLLoaderApi();
        _loc2_.load(GLOBAL._apiURL + "player/getmessagethreads", [], as3.bind(this, this.handleLoadSuccessful), as3.bind(this, this.handleLoadError));
    }

    private handleLoadSuccessful(param1: any): void {
        let _loc3_: string = null;
        let _loc4_: boolean = false;
        let _loc5_: uint = 0;
        let _loc6_: ThreadData = null;
        let _loc7_: number = NaN;
        let _loc8_: ThreadData = null;
        let _loc2_: boolean = false;
        for (_loc3_ in param1.threads) {
            _loc4_ = false;
            _loc5_ = 0;
            while (_loc5_ < Inbox.all.length) {
                if (Inbox.all[_loc5_].data.threadid == param1.threads[_loc3_].threadid) {
                    _loc4_ = true;
                    _loc7_ = (_loc6_ = as3.cast(Inbox.all[_loc5_].data, ThreadData)).sendtime;
                    _loc6_.Setup(param1.threads[_loc3_]);
                    if (_loc7_ != _loc6_.sendtime) {
                        _loc6_.Changed();
                    }
                }
                _loc5_++;
            }
            if (!_loc4_) {
                (_loc8_ = new ThreadData(param1.threads[_loc3_])).addEventListener(Event.CHANGE, as3.bind(this, this.listenForFlagging));
                Inbox.pushNewMessage(_loc8_);
                _loc2_ = true;
            }
        }
        if (!this.firstLoaded) {
            this.firstLoaded = true;
            this.inBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.showIn));
            this.outBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.showOut));
            this.dispatchEvent(new Event(Event.COMPLETE));
            this.showIn();
            this.showInB();
        } else if (_loc2_) {
            this.showIn();
        }
    }

    public showInB(): void {
        let _loc1_: int = 0;
        if (MAILBOX._threadidToOpen != -1) {
            _loc1_ = 0;
            while (_loc1_ < Inbox.all.length) {
                if (Inbox.all[_loc1_].data.threadid == MAILBOX._threadidToOpen) {
                    Inbox.openThread(as3.cast(Inbox.all[_loc1_].data, ThreadData));
                    break;
                }
                _loc1_++;
            }
        }
        MAILBOX._threadidToOpen = -1;
    }

    public listenForFlagging(param1: Event): void {
        let _loc2_: ThreadData = as3.as(param1.target, ThreadData);
        if (_loc2_.flagged) {
            this.displayArray(Inbox.all);
            this.scrollToPage(0);
        }
    }

    public displayArray(param1: any[]): void {
        let _loc6_: InboxMessage = null;
        let _loc2_: any[] = [];
        let _loc3_: uint = 0;
        while (_loc3_ < param1.length) {
            if (!param1[_loc3_].data.flagged) {
                _loc2_.push(param1[_loc3_]);
            }
            _loc3_++;
        }
        this.cleanup();
        if (_loc2_.length == 0) {
            this.noMessages_btn.visible = true;
            this._sorters.visible = false;
            this.shell.visible = false;
        } else {
            this.shell.visible = true;
            this.noMessages_btn.visible = false;
            this._sorters.visible = true;
        }
        if (_loc2_.length > this.rowsPerPage) {
            this.bNext.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.nextDown));
            this.bPrevious.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.prevDown));
            this.pageLimit = Math.floor((_loc2_.length - 1) / this.rowsPerPage) >>> 0;
            this.bNext.visible = true;
            this.bPrevious.visible = true;
        } else {
            this.bNext.visible = false;
            this.bPrevious.visible = false;
        }
        let _loc4_: uint = 50;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc2_.length) {
            _loc6_ = as3.cast(_loc2_[_loc5_], InboxMessage);
            this.shell.addChild(_loc6_);
            _loc6_.x = 76 + this.mask_mc.width * Math.floor(_loc5_ / this.rowsPerPage);
            _loc6_.y = 126 + _loc5_ * _loc4_ - this.rowsPerPage * _loc4_ * Math.floor(_loc5_ / this.rowsPerPage);
            _loc5_++;
        }
    }

    private nextDown(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this.currentPage < this.pageLimit) {
            this.scrollToPage((this.currentPage + 1) >>> 0);
        }
    }

    private prevDown(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this.currentPage > 0) {
            this.scrollToPage((this.currentPage - 1) >>> 0);
        }
    }

    public scrollToPage(param1: uint = 0): void {
        this.currentPage = param1;
        TweenLite.to(this.shell, 0.3, { "x": -param1 * this.mask_mc.width });
        let _loc2_: uint = (param1 + 1) * this.rowsPerPage > this.activeBox.length ? this.activeBox.length : ((param1 + 1) * this.rowsPerPage) >>> 0;
        let _loc3_: uint = (param1 * this.rowsPerPage) >>> 0;
        while (_loc3_ < _loc2_) {
            this.activeBox[_loc3_].shouldLoadImage();
            _loc3_++;
        }
        if (this.currentPage > 0) {
            this.bPrevious.Trigger(true);
        } else {
            this.bPrevious.Trigger(false);
        }
        if (this.currentPage < this.pageLimit) {
            this.bNext.Trigger(true);
        } else {
            this.bNext.Trigger(false);
        }
    }

    private cleanup(): void {
        let _loc1_: any[] = [];
        let _loc2_: uint = 0;
        while (_loc2_ < this.shell.numChildren) {
            _loc1_.push(this.shell.getChildAt(_loc2_));
            _loc2_++;
        }
        _loc2_ = 0;
        while (_loc2_ < _loc1_.length) {
            _loc1_[_loc2_].parent.removeChild(_loc1_[_loc2_]);
            _loc2_++;
        }
    }

    private handleLoadError(param1: IOErrorEvent): void {
    }

    private onNewDown(param1: MouseEvent): void {
        let mess: Message = null;
        mess = null;
        let e: MouseEvent = param1;
        SOUNDS.Play("click1");
        mess = new Message();
        mess.addEventListener(Event.COMPLETE, as3.bind(this, this.showOut));
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(mess);
        mess.init();
        mess.successHandler = (param1: any): void => {
            let _loc2_: ThreadData = new ThreadData({ "sendtime": GLOBAL.Timestamp(), "threadid": param1.threadid, "userid": LOGIN._playerID, "targetid": mess.picker.getCurrentData().userid, "messagetype": "message", "unread": 0, "messageid": param1.messageid, "truceid": 0, "subject": mess.subject_txt.text, "messagecount": 1 });
            Inbox.pushNewMessage(_loc2_);
            this.reversed = false;
            this.currentSorter = null;
            this.currentSort = null;
            this.dateBtn.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DOWN));
        };
    }

    private static ioHeading(cell: MovieClip, key: string): void {
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        t.defaultTextFormat = new TextFormat("Verdana", 10, 0x333333, true);
        t.text = KEYS.Get(key);
        t.x = 4;
        t.width = Math.max(10, cell.width - (cell.sorter_mc ? cell.sorter_mc.width + 10 : 8));
        t.height = t.textHeight + 4;
        t.y = Math.round((cell.height - t.height) / 2);
        GLOBAL.ioFitText(t, 8);
        cell.addChildAt(t, Math.min(1, cell.numChildren) | 0);
    }

    private sortHandler(param1: MouseEvent): void {
        let _loc2_: string = null;
        if (this.currentSorter) {
            this.currentSorter.sorter_mc.gotoAndStop(1);
            this.currentSorter.gotoAndStop(1);
        }
        switch (param1.target) {
            case this.fromBtn:
                _loc2_ = "firstname";
                break;
            case this.subjectBtn:
                _loc2_ = "subject";
                break;
            case this.dateBtn:
                _loc2_ = "sendtime";
                break;
            case this.unreadBtn:
                _loc2_ = "unread";
        }
        let _loc3_: boolean = _loc2_ == "firstname" || _loc2_ == "subject" ? true : false;
        let _loc4_: uint = _loc3_ ? Array.CASEINSENSITIVE : Array.NUMERIC;
        if (this.currentSort == _loc2_) {
            this.reversed = !this.reversed;
            if (this.reversed == _loc3_) {
                _loc4_ = (_loc4_ | Array.DESCENDING) >>> 0;
            }
        } else {
            if (!_loc3_) {
                _loc4_ = (_loc4_ | Array.DESCENDING) >>> 0;
            }
            this.reversed = false;
        }
        if (this.reversed) {
            param1.target.sorter_mc.gotoAndStop(3);
        } else {
            param1.target.sorter_mc.gotoAndStop(2);
        }
        let _loc5_: any[] = as3.sortOn(this.activeBox, _loc2_, _loc4_);
        this.currentSort = _loc2_;
        this.currentSorter = as3.as(param1.target, MovieClip);
        this.currentSorter.gotoAndStop(2);
        this.displayArray(_loc5_);
        this.scrollToPage(0);
    }

    public Resize(): void {
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y;
    }
}
