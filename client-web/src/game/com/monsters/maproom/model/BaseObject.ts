import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Loader } from "flash/display";
import { Event, EventDispatcher, IOErrorEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { SecNum } from "@game";

export class BaseObject extends ASObject {
    static {
        as3.fields(this, { baseid: null, attackpermitted: null, seentime: null, friend: null, attacker: null, helpsto: null, baseseed: null, attacksto: null, helpsfrom: null, basename: null, attacksfrom: null, saved: null, online: false, pic: null, ownerName: null, trucestate: "", truceexpire: 0, userid: null, level: null, wm: null, description: null, type: 0, retaliatecount: 0, dsp: null, loader: null, loaded: 0 });
    }

    public baseid: SecNum;
    public attackpermitted: SecNum;
    public seentime: SecNum;
    public friend: SecNum;
    public attacker: string;
    public helpsto: SecNum;
    public baseseed: SecNum;
    public attacksto: SecNum;
    public helpsfrom: SecNum;
    public basename: string;
    public attacksfrom: SecNum;
    public saved: SecNum;
    public online: boolean;
    public pic: string;
    public ownerName: string;
    public trucestate: string;
    public truceexpire: int;
    public userid: SecNum;
    public level: SecNum;
    public wm: SecNum;
    public description: string;
    public type: int;
    public retaliatecount: int;
    private dsp: EventDispatcher;
    public loader: Loader;
    public loaded: uint;

    public $ctor(param1?: any): void {
        super.$ctor();
        this.level = new SecNum(Number(param1.level));
        this.baseid = new SecNum(Number(param1.baseid));
        this.basename = as3.str(param1.basename);
        this.ownerName = as3.str(this.basename.split("\'s")[0]);
        this.pic = as3.str(param1.pic);
        this.dsp = new EventDispatcher();
        if (param1.wm != undefined && param1.wm == 1) {
            this.wm = new SecNum(param1.wm | 0);
            this.attackpermitted = new SecNum(1);
            this.saved = new SecNum(0);
            this.seentime = new SecNum(0);
            this.friend = new SecNum(0);
            this.trucestate = "";
            this.truceexpire = 0;
            this.description = as3.str(param1.description);
            this.type = param1.type | 0;
        } else {
            this.wm = new SecNum(0);
            this.userid = new SecNum(param1.userid | 0);
            this.attackpermitted = new SecNum(param1.attackpermitted | 0);
            this.friend = new SecNum(param1.friend | 0);
            this.attacker = as3.str(param1.attacker);
            this.helpsto = new SecNum(param1.helpsto | 0);
            this.helpsfrom = new SecNum(param1.helpsfrom | 0);
            this.baseseed = new SecNum(param1.baseseed | 0);
            this.attacksto = new SecNum(param1.attacksto | 0);
            this.attacksfrom = new SecNum(param1.attacksfrom | 0);
            this.saved = new SecNum(param1.saved | 0);
            this.retaliatecount = param1.retaliatecount | 0;
            this.seentime = new SecNum(param1.saved | 0);
            this.truceexpire = param1.truceexpire | 0;
            this.trucestate = as3.str(param1.trucestate);
        }
    }

    public Clear(): void {
        this.baseid = null;
        this.attackpermitted = null;
        this.seentime = null;
        this.friend = null;
        this.attacker = null;
        this.helpsto = null;
        this.baseseed = null;
        this.attacksto = null;
        this.helpsfrom = null;
        this.basename = null;
        this.attacksfrom = null;
        this.saved = null;
        this.pic = null;
        this.userid = null;
        this.level = null;
        this.wm = null;
        this.dsp = null;
        this.loader = null;
    }

    public Update(param1: any): void {
        if (this.wm.Get() == 0) {
            this.seentime.Set(Number(param1.saved));
            this.saved.Set(Number(param1.saved));
            this.truceexpire = param1.truceexpire | 0;
            this.trucestate = as3.str(param1.trucestate);
            this.attacksfrom.Set(Number(param1.attacksfrom));
            this.attacker = as3.str(param1.attacker);
            this.attackpermitted.Set(param1.attackpermitted | 0);
            this.friend.Set(param1.friend | 0);
            this.dsp.dispatchEvent(new Event(Event.CHANGE));
        }
    }

    public addEventListener(param1: string, param2: Function): void {
        this.dsp.addEventListener(param1, param2);
    }

    public removeEventListener(param1: string, param2: Function): void {
        this.dsp.removeEventListener(param1, param2);
    }

    public loadImage(): void {
        let LoadImageError: Function = null;
        if (!this.loader && this.loaded == 0 && this.pic.length > 5) {
            try {
                LoadImageError = (param1: IOErrorEvent): void => {
                };
                this.loader = new Loader();
                this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.imgComplete));
                this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                this.loader.load(new URLRequest(this.pic), new LoaderContext(true));
                this.loaded = 1;
            } catch (e) {
            }
        } else {
            this.dsp.dispatchEvent(new Event(Event.COMPLETE));
        }
    }

    private imgComplete(param1: Event): void {
        this.loaded = 2;
        this.dsp.dispatchEvent(param1.clone());
    }

    public toString(): string {
        return "[BaseObject name:" + this.basename + " trucestate:" + this.trucestate + "]";
    }
}
