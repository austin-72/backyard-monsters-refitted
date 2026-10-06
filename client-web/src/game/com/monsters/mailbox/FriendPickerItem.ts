import * as as3 from "as3";
import { Loader } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { Contact, FriendPickerItem_CLIP, KEYS } from "@game";

export class FriendPickerItem extends FriendPickerItem_CLIP {
    static {
        as3.fields(this, { data: null, name_str: null, idleFrameLabel: null, loader: null });
    }

    public data: Contact;
    public name_str: string;
    private idleFrameLabel: string;
    private loader: Loader;

    public $ctor(param1?: Contact): void {
        super.$ctor();
        this.data = param1;
        let _loc2_: string = param1.lastname.length > 2 ? " " + param1.lastname.charAt(0).toUpperCase() + "." : "";
        this.name_str = param1.firstname.toUpperCase() + _loc2_;
        this.name_txt.htmlText = "<b>" + this.name_str;
        this.userid_txt.text = KEYS.Get("label_userid", { "v1": param1.userid });
        this.idleFrameLabel = param1.friend ? "green" : "gray";
        this.background.gotoAndStop(this.idleFrameLabel);
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.thisOver));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.thisOut));
    }

    private thisOver(param1: MouseEvent): void {
        this.background.gotoAndStop("white");
    }

    private thisOut(param1: MouseEvent): void {
        this.background.gotoAndStop(this.idleFrameLabel);
    }

    public displayAs(param1: string): void {
    }

    public shouldLoadImage(): void {
        if (!this.loader) {
            this.loader = new Loader();
            this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onImgComplete));
            this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.onErr));
            try {
                if (this.data.pic.length > 5) {
                    this.loader.load(new URLRequest(this.data.pic), new LoaderContext(true));
                }
            } catch (e) {
            }
        }
    }

    private onErr(param1: IOErrorEvent): void {
    }

    private onImgComplete(param1: Event): void {
        this.addChild(this.loader);
        this.loader.x = this.placeholder.x;
        this.loader.y = this.placeholder.y;
        this.loader.width = this.loader.height = 50;
        this.setChildIndex(this.photoRing, (this.numChildren - 1) | 0);
    }

    public override toString(): string {
        return this.name_str;
    }
}
