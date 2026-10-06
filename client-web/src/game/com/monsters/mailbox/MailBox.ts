import * as as3 from "as3";
import { Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { Contact, GLOBAL, Inbox, LOGIN, MAILBOX, SOUNDS, Thread, URLLoaderApi, system_message } from "@game";

export class MailBox extends Sprite {
    static {
        as3.fields(this, { inbox: null });
    }

    public static contacts: any[] = null;

    private static instance: MailBox = null;

    public static currentThread: Thread = null;
    public inbox: Inbox;

    public $ctor(): void {
        super.$ctor();
        MailBox.instance = this;
    }

    public static Hide(param1: MouseEvent = null): void {
        if (MailBox.currentThread) {
            MailBox.currentThread.prepareForKill();
        }
        MailBox.currentThread = null;
        MAILBOX.Hide();
    }

    public static ShowInbox(...rest: any[]): void {
        if (MailBox.currentThread) {
            SOUNDS.Play("close");
            MailBox.currentThread.prepareForKill();
            GLOBAL.BlockerRemove();
            if (MailBox.currentThread.parent) {
                MailBox.currentThread.parent.removeChild(MailBox.currentThread);
            }
            MailBox.currentThread = null;
        }
        MailBox.instance.addChild(MailBox.instance.inbox);
    }

    public static ShowThread(param1: Thread): void {
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(param1);
        param1.x = 100;
        param1.y = -15;
        MailBox.currentThread = param1;
    }

    public Setup(): void {
        MailBox.contacts = [];
        let _loc1_: Contact = new Contact(String(LOGIN._playerID), { "first_name": "Me", "last_name": "", "pic_square": LOGIN._playerPic }, true);
        let _loc2_: Contact = new Contact("0", { "first_name": "D.A.V.E.", "last_name": "", "pic_square": "" }, true);
        _loc2_.picClass = system_message;
        let _loc3_: URLLoaderApi = new URLLoaderApi();
        _loc3_.load(GLOBAL._apiURL + "player/getmessagetargets", null, as3.bind(this, this.onTargetsSuccess), as3.bind(this, this.onTargetsFail));
    }

    public Tick(): void {
        if (this.inbox) {
            this.inbox.Tick();
        }
    }

    private onTargetsSuccess(param1: any): void {
        let _loc3_: string = null;
        let _loc4_: Contact = null;
        let _loc2_: boolean = false;
        for (_loc3_ in param1.targets) {
            _loc4_ = new Contact(_loc3_, param1.targets[_loc3_]);
            MailBox.contacts.push(_loc4_);
        }
        this.inbox = new Inbox();
        this.inbox.addEventListener(Event.COMPLETE, as3.bind(this, this.onInboxInit));
        this.inbox.Setup();
        MailBox.ShowInbox();
    }

    private onInboxInit(param1: Event): void {
    }

    private onTargetsFail(param1: IOErrorEvent): void {
        MailBox.Hide();
    }

    public Resize(): void {
        this.x = 0;
        this.y = 0;
    }
}
