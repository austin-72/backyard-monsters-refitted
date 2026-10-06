import * as as3 from "as3";
import { int } from "as3";
import { Event, EventDispatcher, IOErrorEvent } from "flash/events";
import { Point } from "flash/geom";
import { GLOBAL, LOGGER, MailBox, URLLoaderApi } from "@game";

export class ThreadData extends EventDispatcher {
    static {
        as3.fields(this, { convo: null, sendtime: NaN, userid: NaN, targetid: NaN, threadid: NaN, messagetype: null, unread: false, messageid: NaN, truceid: NaN, subject: null, messagecount: 0, reported: false, threadLoaded: false, trucestate: null, flagged: false, migratestate: null, coords: null, worldID: 0, baseID: 0 });
    }

    public convo: any[];
    public sendtime: number;
    public userid: number;
    public targetid: number;
    public threadid: number;
    public messagetype: string;
    public unread: boolean;
    public messageid: number;
    public truceid: number;
    public subject: string;
    public messagecount: int;
    public reported: boolean;
    public threadLoaded: boolean;
    public trucestate: string;
    public flagged: boolean;
    public migratestate: string;
    public coords: Point;
    public worldID: int;
    // Base ids are larger than an int holds; an int wrapped them to another base's id.
    public baseID: number;

    public $ctor(param1?: any /* any */): void {
        super.$ctor();
        this.Setup(param1);
    }

    public Setup(param1: any): void {
        this.sendtime = Number(param1.updatetime);
        this.userid = Number(param1.userid);
        this.targetid = Number(param1.targetid);
        this.threadid = Number(param1.threadid);
        this.messagetype = as3.str(param1.messagetype);
        this.flagged = false;
        if (param1.trucestate != undefined) {
            this.trucestate = as3.str(param1.trucestate);
        }
        if (param1.migratestate != undefined) {
            this.migratestate = as3.str(param1.migratestate);
            if (Boolean(param1.coords) && param1.coords.length > 1) {
                this.coords = new Point(param1.coords[0], param1.coords[1]);
            }
            if (param1.worldid) {
                this.worldID = param1.worldid | 0;
            }
            if (param1.baseid) {
                this.baseID = Number(param1.baseid);
            }
        }
        this.unread = param1.unread == 1;
        this.reported = param1.reportid > 0;
        this.messageid = Number(param1.messageid);
        this.truceid = Number(param1.truceid);
        this.subject = as3.str(param1.subject);
        this.messagecount = param1.messagecount | 0;
        this.convo = [];
    }

    public loadThread(): void {
        let _loc1_: URLLoaderApi = new URLLoaderApi();
        let _loc2_: any[] = [["threadid", this.threadid]];
        _loc1_.load(GLOBAL._apiURL + "player/getmessagethread", _loc2_, as3.bind(this, this.handleLoadSuccessful), as3.bind(this, this.handleLoadError));
    }

    private handleLoadSuccessful(param1: any): void {
        let _loc2_: string = null;
        let _loc3_: any = null;
        if (param1.error != 0) {
            MailBox.ShowInbox();
        } else {
            this.convo = [];
            for (_loc2_ in param1.thread) {
                if (param1.thread[_loc2_].message) {
                    _loc3_ = param1.thread[_loc2_];
                    this.convo.push(_loc3_);
                }
            }
            this.dispatchEvent(new Event(Event.COMPLETE));
        }
    }

    public Changed(): void {
        this.dispatchEvent(new Event(Event.CHANGE));
    }

    private handleLoadError(param1: IOErrorEvent): void {
        LOGGER.Log("err", "IOError opening threadid " + this.threadid);
    }

    public override toString(): string {
        return "[object ThreadData subject: " + this.subject + " threadLoaded: " + this.threadLoaded + " userid: " + this.userid + " targetid: " + this.targetid + " ]";
    }
}
