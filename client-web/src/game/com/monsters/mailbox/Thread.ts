import * as as3 from "as3";
import { uint } from "as3";
import { Sprite, StageDisplayState } from "flash/display";
import { Event, FocusEvent, FullScreenEvent, IOErrorEvent, KeyboardEvent, MouseEvent, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { ALLIANCES, Contact, GLOBAL, KEYS, LOGGER, LOGIN, MAPROOM, MailBox, MapRoomManager, SOUNDS, ScrollSet, ThreadData, ThreadMember, Thread_CLIP, UI2, URLLoaderApi, com_monsters_mailbox_Message as Message, com_monsters_maproom_advanced_MapRoom as MapRoom, frame, popup_report } from "@game";

export class Thread extends Thread_CLIP {
    static {
        as3.fields(this, { data: null, members: null, shell: null, scroller: null, _wide: false, subject: null, messageState: null, truceState: null, editMode: null, viewMode: null, timer: null, spammy: false, sending: false, firstLoaded: false, _mc: undefined });
    }

    public static readonly NARROW: uint = 473;

    public static readonly WIDE: uint = 487;
    public data: ThreadData;
    public members: any[];
    private shell: Sprite;
    public scroller: ScrollSet;
    public _wide: boolean;
    public subject: string;
    public messageState: any;
    public truceState: any;
    public editMode: any;
    public viewMode: any;
    public timer: Timer;
    private spammy: boolean;
    private sending: boolean;
    private firstLoaded: boolean;
    public _mc: any;

    public $ctor(): void {
        this.messageState = { "boxWidth": 300, "textWidth": 300 };
        this.truceState = { "boxWidth": 230, "textWidth": 230 };
        this.editMode = { "inputBoxHeight": 190, "inputBoxY": 270, "textHeight": 176, "textY": 279, "outlineY": 268, "outlineHeight": 176, "largeOutlineVisible": true, "maskHeight": 168, "smallOutlineVisible": false };
        this.viewMode = { "inputBoxHeight": 60, "inputBoxY": 401, "textHeight": 48, "textY": 410, "outlineY": 410, "outlineHeight": 48, "largeOutlineVisible": false, "maskHeight": 300, "smallOutlineVisible": true };
        super.$ctor();
        this.mask_mc.visible = false;
        this.removeChild(this.sendBtn);
        this.removeChild(this.acceptBtn);
        this.removeChild(this.denyBtn);
        this.removeChild(this.fsWarning);
        this.removeChild(this.viewBtn);
        this.largeOutline_mc.visible = false;
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
        this.scroller = new ScrollSet();
        this.scroller.x = 498;
        this.scroller.y = 81;
        this.addChild(this.scroller);
    }

    public Setup(param1: ThreadData): void {
        this.shell = new Sprite();
        this.shell.mask = this.mask_mc;
        this.shell.x = 86;
        this.shell.y = 106;
        this.addChild(this.shell);
        this.members = [].concat();
        (as3.as(this.mcFrame, frame)).Setup(true, MailBox.ShowInbox);
        if (!param1.threadLoaded) {
            param1.addEventListener(Event.COMPLETE, as3.bind(this, this.threadLoadComplete));
            param1.addEventListener(Event.CHANGE, as3.bind(this, this.onThreadChanged));
            this.spinner.visible = true;
            param1.loadThread();
        }
        this._mc.subject_txt.htmlText = param1.subject.length > 30 ? param1.subject.substr(0, 30) + "..." : param1.subject;
        this.scroller.visible = false;
        this.data = param1;
        this.Display(false);
        if (!param1.reported) {
            this._mc.reportBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.reportThread));
            this._mc.reportBtn.label_txt.htmlText = KEYS.Get("mail_ignoreplayer_btn");
            this._mc.reportBtn.buttonMode = true;
            this._mc.reportBtn.mouseChildren = false;
        } else {
            this.removeChild(this.reportBtn);
        }
    }

    public prepareForKill(): void {
        if (this.stage) {
            this.stage.removeEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.detectFS));
        }
    }

    private onThreadChanged(param1: Event): void {
        this.data.loadThread();
    }

    public Validate(param1: TimerEvent = null): boolean {
        let _loc2_: boolean = true;
        if (Message.getNotWS(this.msg_txt.text).length < 2) {
            _loc2_ = false;
        }
        this.sendBtn.Enabled = _loc2_ && !this.spammy && !this.sending;
        if (_loc2_ && !this.spammy && !this.sending) {
            this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        } else {
            this.sendBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        }
        return _loc2_ && !this.spammy && !this.sending;
    }

    private reportThread(...rest: any[]): void {
        let popup: popup_report = null;
        let reportSendDown: Function = null;
        let reportCloseDown: Function = null;
        let onSuccessfulReport: Function = null;
        popup = null;
        reportSendDown = null;
        reportCloseDown = null;
        onSuccessfulReport = null;
        let args: any[] = rest;
        reportSendDown = (param1: MouseEvent): void => {
            let _loc2_: any[] = [["threadid", this.data.threadid], ["reason", "block"]];
            let _loc3_: URLLoaderApi = new URLLoaderApi();
            _loc3_.load(GLOBAL._apiURL + "player/reportmessagethread", _loc2_, onSuccessfulReport, as3.bind(this, this.onFail));
            popup.sendBtn.removeEventListener(MouseEvent.CLICK, reportSendDown);
            popup.sendBtn.Enabled = false;
        };
        reportCloseDown = (param1: MouseEvent = null): void => {
            SOUNDS.Play("close");
            GLOBAL.BlockerRemove();
            popup.parent.removeChild(popup);
        };
        onSuccessfulReport = (param1: any): void => {
            let _loc2_: string = null;
            if (param1.error != undefined && param1.error != 0) {
                LOGGER.Log("err", "message error in reporting thread- " + param1.error);
            }
            for (_loc2_ in param1) {
            }
            this.data.flagged = true;
            this.data.Changed();
            reportCloseDown();
            MailBox.ShowInbox();
        };
        SOUNDS.Play("click1");
        popup = new popup_report();
        popup.tTitle.htmlText = KEYS.Get("report_title");
        popup.tDesc.htmlText = KEYS.Get("report_desc");
        popup.Resize = (): void => {
            popup.x = this.mcFrame.x + this.mcFrame.width * 0.5 + 100;
            popup.y = this.mcFrame.y + this.mcFrame.height * 0.5;
        };
        popup.sendBtn.SetupKey("btn_send");
        popup.mcFrame.Setup(true, reportCloseDown);
        popup.x = this.mcFrame.x + this.mcFrame.width * 0.5 + 100;
        popup.y = this.mcFrame.y + this.mcFrame.height * 0.5;
        popup.sendBtn.addEventListener(MouseEvent.CLICK, reportSendDown);
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(popup);
    }

    private onAdd(param1: Event): void {
        this.Display();
        this.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onEscapeListener));
        this.stage.addEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.detectFS));
        this.detectFS();
    }

    private detectFS(param1: FullScreenEvent = null): void {
        if (Boolean(this.stage) && this.stage.displayState == StageDisplayState.FULL_SCREEN) {
            this.fsWarning.tBody.htmlText = KEYS.Get("fswarning");
            this.addChild(this.fsWarning);
            this.setChildIndex(this.fsWarning, (this.numChildren - 1) | 0);
        } else if (this.contains(this.fsWarning)) {
            this.removeChild(this.fsWarning);
        }
    }

    private onMsgFocusIn(param1: FocusEvent = null): void {
        let _loc2_: any = null;
        _loc2_ = this.editMode;
        this.outline_mc.visible = Boolean(_loc2_["smallOutlineVisible"]);
        this.largeOutline_mc.visible = Boolean(_loc2_["largeOutlineVisible"]);
        this.msg_txt.height = Number(_loc2_["textHeight"]);
        this.msg_txt.y = Number(_loc2_["textY"]);
        this.inputBox.y = Number(_loc2_["inputBoxY"]);
        this.inputBox.height = Number(_loc2_["inputBoxHeight"]);
        this.mask_mc.height = Number(_loc2_["maskHeight"]);
        this.scroller.ScrollTo(1);
        if (this.contains(this.inputBox)) {
            this.setChildIndex(this.inputBox, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.largeOutline_mc)) {
            this.setChildIndex(this.largeOutline_mc, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.msg_txt)) {
            this.setChildIndex(this.msg_txt, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.sendBtn)) {
            this.setChildIndex(this.sendBtn, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.acceptBtn)) {
            this.setChildIndex(this.acceptBtn, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.denyBtn)) {
            this.setChildIndex(this.denyBtn, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.viewBtn)) {
            this.setChildIndex(this.viewBtn, (this.numChildren - 1) | 0);
        }
        let _loc3_: boolean = this._wide;
        if (this.shell.height > this.mask_mc.height) {
            this._wide = true;
        } else {
            this._wide = false;
        }
        if (_loc3_ != this._wide) {
            this.Display();
        }
    }

    private onMsgFocusOut(param1: FocusEvent = null): void {
        let _loc2_: any = null;
        _loc2_ = this.viewMode;
        this.outline_mc.visible = Boolean(_loc2_["smallOutlineVisible"]);
        this.largeOutline_mc.visible = Boolean(_loc2_["largeOutlineVisible"]);
        this.msg_txt.height = Number(_loc2_["textHeight"]);
        this.msg_txt.y = Number(_loc2_["textY"]);
        this.inputBox.y = Number(_loc2_["inputBoxY"]);
        this.inputBox.height = Number(_loc2_["inputBoxHeight"]);
        this.mask_mc.height = Number(_loc2_["maskHeight"]);
        if (this.contains(this.inputBox)) {
            this.setChildIndex(this.inputBox, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.outline_mc)) {
            this.setChildIndex(this.outline_mc, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.msg_txt)) {
            this.setChildIndex(this.msg_txt, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.sendBtn)) {
            this.setChildIndex(this.sendBtn, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.acceptBtn)) {
            this.setChildIndex(this.acceptBtn, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.denyBtn)) {
            this.setChildIndex(this.denyBtn, (this.numChildren - 1) | 0);
        }
        if (this.contains(this.viewBtn)) {
            this.setChildIndex(this.viewBtn, (this.numChildren - 1) | 0);
        }
        let _loc3_: boolean = this._wide;
        if (this.shell.height > this.mask_mc.height) {
            this._wide = true;
        } else {
            this._wide = false;
        }
        if (_loc3_ != this._wide) {
            this.Display();
        }
        if (!this._wide) {
            this.scroller.visible = false;
            this.scroller.ScrollTo(0, false);
        } else {
            this.scroller.ScrollTo(1);
        }
    }

    private onRemoved(param1: Event): void {
        this.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onEscapeListener));
        this.data.removeEventListener(Event.CHANGE, as3.bind(this, this.onThreadChanged));
        this.data.removeEventListener(Event.COMPLETE, as3.bind(this, this.threadLoadComplete));
        if (this.timer) {
            this.timer.stop();
        }
    }

    private onEscapeListener(param1: KeyboardEvent): void {
        if (param1.charCode == 27) {
        }
    }

    public threadLoadComplete(param1: Event): void {
        let _loc3_: ThreadMember = null;
        let _loc5_: any = null;
        let _loc6_: boolean = false;
        let _loc7_: ThreadMember = null;
        let _loc8_: ThreadMember = null;
        this.sendBtn.SetupKey("btn_send");
        this.outline_mc.width = 300;
        this.largeOutline_mc.width = 300;
        this.msg_txt.width = 300;
        this.addChild(this.sendBtn);
        if (this.data.trucestate == "requested") {
            if (this.data.convo[0].targetid == LOGIN._playerID) {
                this.acceptBtn.SetupKey("btn_truceaccept");
                this.acceptBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.truceAccept));
                this.denyBtn.SetupKey("btn_trucereject");
                this.denyBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.truceReject));
                this.outline_mc.width = 230;
                this.largeOutline_mc.width = 230;
                this.msg_txt.width = 230;
                this.addChild(this.acceptBtn);
                this.addChild(this.denyBtn);
            }
        }
        if (this.data.migratestate == "requested") {
            if (this.data.convo[0].targetid == LOGIN._playerID) {
                this.acceptBtn.SetupKey("btn_truceaccept");
                this.acceptBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.migrateAccept));
                this.denyBtn.SetupKey("invite_decline");
                this.denyBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.migrateReject));
                this.viewBtn.SetupKey("map_view_btn");
                this.viewBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.migrateView));
                this.outline_mc.width = 230;
                this.largeOutline_mc.width = 230;
                this.msg_txt.width = 230;
                this.addChild(this.acceptBtn);
                this.addChild(this.denyBtn);
                this.addChild(this.viewBtn);
            } else if (this.data.convo[0].userid == LOGIN._playerID) {
                this.denyBtn.SetupKey("btn_revoke");
                this.denyBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.migrateRevoke));
                this.addChild(this.denyBtn);
            }
        }
        this.acceptBtn.Enabled = this.denyBtn.Enabled = this.sendBtn.Enabled = this.viewBtn.Enabled = false;
        this.msg_txt.htmlText = "";
        this.timer = new Timer(500);
        this.timer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.Validate));
        this.timer.start();
        this.spinner.visible = false;
        if (this.contains(this.spinner)) {
            this.removeChild(this.spinner);
        }
        this.acceptBtn.Enabled = this.denyBtn.Enabled = true;
        if (this.data.migratestate == "requested") {
            this.viewBtn.Enabled = true;
        }
        let _loc2_: any = false;
        if (this.data.convo.length >= 1) {
            _loc2_ = (_loc5_ = this.data.convo[this.data.convo.length - 1]).userid == LOGIN._playerID;
        }
        if (!_loc2_) {
            this.msg_txt.addEventListener(FocusEvent.FOCUS_IN, as3.bind(this, this.onMsgFocusIn));
            this.msg_txt.addEventListener(FocusEvent.FOCUS_OUT, as3.bind(this, this.onMsgFocusOut));
            this.addChild(this.msg_txt);
            this.msg_txt.visible = true;
        } else {
            this.msg_txt.visible = false;
        }
        this.spammy = Boolean(_loc2_);
        if (this.data.unread) {
            --GLOBAL._unreadMessages;
            UI2._top.Update();
            this.data.unread = false;
            this.data.Changed();
        }
        this.subject = this.data.subject;
        if (this.members.length > 1) {
            _loc3_ = as3.cast(this.members[this.members.length - 1], ThreadMember);
        }
        let _loc4_: uint = 0;
        while (_loc4_ < this.data.convo.length) {
            _loc6_ = false;
            for (_loc7_ of as3.values(this.members)) {
                if (this.data.convo[_loc4_].messageid == _loc7_.data.messageid) {
                    _loc6_ = true;
                    _loc3_ = _loc7_;
                }
            }
            if (!_loc6_) {
                (_loc8_ = new ThreadMember()).Setup(this.data.convo[_loc4_]);
                _loc8_.shouldLoadImage();
                this.shell.addChild(_loc8_);
                if (_loc3_) {
                    _loc8_.y = _loc3_.y + _loc3_.getVisibleHeight() + 6;
                } else {
                    _loc8_.y = 0;
                }
                this.members.push(_loc8_);
                _loc3_ = _loc8_;
                if (this.data.convo[_loc4_].userid != LOGIN._playerID) {
                    _loc8_.setOrientation("right");
                }
            }
            _loc4_++;
        }
        if (this.shell.height > this.mask_mc.height) {
            this._wide = true;
        } else {
            this._wide = false;
        }
        this.Display();
        this.onMsgFocusOut();
        this.detectFS();
        if (!this.firstLoaded) {
            this.firstLoaded = true;
        }
        if (this._wide) {
            this.scroller.ScrollTo(1, false);
        }
    }

    public Display(...rest: any[]): void {
        if (this._wide) {
            this.scroller.Init(this.shell, this.mask_mc, 0, 106, 319);
            this.scroller.BottomPadding = 20;
            this.scroller.visible = true;
            this.scroller.ScrollTo(1);
            this.mcFrame.width = Thread.WIDE;
        } else {
            this.mcFrame.width = Thread.NARROW;
        }
        this.mcFrame.Setup(true, MailBox.ShowInbox);
    }

    private truceAccept(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        let _loc2_: uint = this.data.userid >>> 0;
        let _loc3_: string = KEYS.Get("mail_defaulttruceaccept");
        if (Message.getNotWS(this.msg_txt.text).length > 1) {
            _loc3_ = this.msg_txt.text;
        }
        let _loc4_: any[] = [["threadid", this.data.threadid], ["targetid", _loc2_], ["targetbaseid", 0], ["type", "truceaccept"], ["subject", this.subject], ["message", _loc3_]];
        let _loc5_: URLLoaderApi = null;
        (_loc5_ = new URLLoaderApi()).load(GLOBAL._apiURL + "player/sendmessage", _loc4_, as3.bind(this, this.onTruceAcceptSuccess), as3.bind(this, this.onFail));
        this.acceptBtn.Enabled = this.denyBtn.Enabled = this.sendBtn.Enabled = false;
        this.acceptBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.truceAccept));
        this.denyBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.truceReject));
        this.onMsgFocusOut();
        this.sending = true;
        this.Validate();
    }

    private truceReject(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        let _loc2_: uint = this.data.userid >>> 0;
        let _loc3_: string = KEYS.Get("mail_defaulttrucereject");
        if (Message.getNotWS(this.msg_txt.text).length > 1) {
            _loc3_ = this.msg_txt.text;
        }
        let _loc4_: any[] = [["threadid", this.data.threadid], ["targetid", _loc2_], ["targetbaseid", 0], ["type", "trucereject"], ["subject", this.subject], ["message", _loc3_]];
        let _loc5_: URLLoaderApi = null;
        (_loc5_ = new URLLoaderApi()).load(GLOBAL._apiURL + "player/sendmessage", _loc4_, as3.bind(this, this.onTruceRejectSuccess), as3.bind(this, this.onFail));
        this.sending = true;
        this.Validate();
        this.acceptBtn.Enabled = this.denyBtn.Enabled = this.sendBtn.Enabled = this.viewBtn.Enabled = false;
        this.onMsgFocusOut();
    }

    private migrateAccept(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        if (MapRoomManager.instance.isInMapRoom3) {
            GLOBAL.Message(KEYS.Get("msg_invalid_mr2_invitation_in_mr3"));
            return;
        }
        MapRoom.inviteBaseID = this.data.baseID;
        MapRoom.migrateThread = this;
        MapRoom.PreAcceptInvitation(this.parent);
    }

    private migrateReject(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        if (MapRoomManager.instance.isInMapRoom3) {
            return;
        }
        MapRoom.inviteBaseID = this.data.baseID;
        MapRoom.migrateThread = this;
        MapRoom.RejectInvitation(param1);
    }

    private migrateRevoke(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        let _loc2_: uint = this.data.userid >>> 0;
        let _loc3_: Contact = Contact.contactWithUserId(this.data.convo[0].userid >>> 0, true);
        let _loc4_: string = _loc3_.firstname;
        let _loc5_: string = KEYS.Get("invite_revoke", { "v1": _loc4_ });
        let _loc6_: any[] = [["threadid", this.data.threadid], ["targetid", _loc2_], ["targetbaseid", 0], ["type", "migraterevoke"], ["subject", this.subject], ["message", _loc5_]];
        let _loc7_: URLLoaderApi = null;
        (_loc7_ = new URLLoaderApi()).load(GLOBAL._apiURL + "player/sendmessage", _loc6_, as3.bind(this, this.onMigrateRevokeSuccess), as3.bind(this, this.onFail));
        this.sending = true;
        this.Validate();
        this.acceptBtn.Enabled = this.denyBtn.Enabled = this.sendBtn.Enabled = this.viewBtn.Enabled = false;
        this.onMsgFocusOut();
    }

    private migrateView(param1: MouseEvent): void {
        if (MapRoomManager.instance.isInMapRoom3) {
            GLOBAL.Message(KEYS.Get("msg_invalid_mr2_invitation_in_mr3"));
            return;
        }
        if (ALLIANCES._myAlliance && !GLOBAL.INFERNO_ONLY) {
            GLOBAL.Message(KEYS.Get("msg_mustleavealliance"));
            return;
        }
        SOUNDS.Play("click1");
        GLOBAL._currentCell = null;
        MapRoom._Setup(this.data.coords, this.data.worldID, this.data.baseID, true, this);
        MapRoomManager.instance.Show();
    }

    private onMigrateAcceptSuccess(param1: any): void {
        if (param1.error != undefined && param1.error != 0) {
            LOGGER.Log("err", "error on migrate accept " + param1.error);
            return;
        }
        this.data.migratestate = "accepted";
        this.data.Changed();
        MailBox.ShowInbox();
        let _loc2_: string = Contact.contactWithUserId(this.data.convo[0].userid >>> 0).firstname;
        this.sending = false;
    }

    private onMigrateRejectSuccess(param1: any): void {
        if (param1.error != 0) {
            return;
        }
        this.data.migratestate = "rejected";
        this.data.Changed();
        MailBox.ShowInbox();
        this.sending = false;
    }

    private onMigrateRevokeSuccess(param1: any): void {
        if (param1.error != 0) {
            return;
        }
        this.data.migratestate = "revoked";
        this.data.Changed();
        MailBox.ShowInbox();
        this.sending = false;
    }

    private sendDown(param1: MouseEvent): void {
        if (!this.Validate()) {
            return;
        }
        let _loc2_: uint = this.data.targetid >>> 0;
        this.stage.focus = null;
        let _loc3_: string = this.msg_txt.text;
        let _loc4_: any[] = [["threadid", this.data.threadid], ["targetid", _loc2_], ["targetbaseid", 0], ["type", "message"], ["subject", this.subject], ["message", _loc3_]];
        let _loc5_: URLLoaderApi = null;
        (_loc5_ = new URLLoaderApi()).load(GLOBAL._apiURL + "player/sendmessage", _loc4_, as3.bind(this, this.onSuccess), as3.bind(this, this.onFail));
        this.sending = true;
        this.Validate();
    }

    private onTruceAcceptSuccess(param1: any): void {
        if (param1.error != undefined && param1.error != 0) {
            LOGGER.Log("err", "error on truce accept " + param1.error);
            return;
        }
        this.data.trucestate = "accepted";
        this.data.Changed();
        MailBox.ShowInbox();
        let _loc2_: string = Contact.contactWithUserId(this.data.convo[0].userid >>> 0).firstname;
        MAPROOM.TruceAccepted(_loc2_, "");
        this.sending = false;
    }

    private onTruceRejectSuccess(param1: any): void {
        if (param1.error != 0) {
            return;
        }
        this.data.trucestate = "rejected";
        this.data.Changed();
        MailBox.ShowInbox();
        this.sending = false;
    }

    private onSuccess(param1: any): void {
        if (param1.error != undefined && param1.error != 0) {
            LOGGER.Log("err", "message error - " + param1.error);
        }
        ++this.data.messagecount;
        this.data.Changed();
        this.sending = false;
    }

    private onFail(param1: IOErrorEvent): void {
        this.sending = false;
    }

    public scrollToMember(param1: ThreadMember): void {
    }

    public heightForThread(): number {
        return 100;
    }
}
