import * as as3 from "as3";
import { int, uint } from "as3";
import { Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { TextFieldAutoSize } from "flash/text";
import { Contact, ThreadMember_CLIP } from "@game";

export class ThreadMember extends ThreadMember_CLIP {
    static {
        as3.fields(this, { bg_mc: null, loader: null, data: null, margin: 10, left: null, right: null, configuration: null });
    }

    public bg_mc: MovieClip;
    public loader: Loader;
    public data: any;
    public margin: uint;
    public left: any;
    public right: any;
    private configuration: any;

    public $ctor(): void {
        super.$ctor();
        this.left = { "imageX": 0, "bg": this.leftbg_mc, "txtX": 77, "txtLayout": TextFieldAutoSize.LEFT };
        this.right = { "imageX": 327, "bg": this.rightbg_mc, "txtX": 3, "txtLayout": TextFieldAutoSize.RIGHT };
        this.setOrientation("left");
    }

    public Setup(param1: any): void {
        this.body_txt.autoSize = as3.str(this.configuration.txtLayout);
        this.body_txt.text = as3.str(param1.message);
        this.configuration.bg.height = (this.body_txt.height + this.margin * 2) | 0;
        this.configuration.bg.y = this.margin + ((0.5 * this.configuration.bg.height - this.margin) | 0);
        this.data = param1;
    }

    public setOrientation(param1: string): void {
        this.configuration = param1 == "left" ? this.left : this.right;
        let _loc2_: any = param1 == "left" ? this.right : this.left;
        this.bg_mc = as3.cast(this.configuration.bg, MovieClip);
        this.placeholder.x = Number(this.configuration.imageX);
        _loc2_.bg.visible = false;
        this.configuration.bg.visible = true;
        this.configuration.bg.height = (this.body_txt.height + this.margin * 2) | 0;
        this.configuration.bg.y = this.margin + ((0.5 * this.configuration.bg.height - this.margin) | 0);
        this.photoRing.x = this.placeholder.x;
        this.photoRing.y = this.placeholder.y;
        this.body_txt.x = Number(this.configuration.txtX);
        this.body_txt.autoSize = as3.str(this.configuration.txtLayout);
    }

    public getVisibleHeight(): int {
        return this.bg_mc.height > 50 ? this.bg_mc.height | 0 : 50;
    }

    public shouldLoadImage(): void {
        let _loc1_: Contact = null;
        let _loc2_: string = null;
        if (!this.loader) {
            _loc1_ = Contact.contactWithUserId(this.data.userid >>> 0, true);
            if (!_loc1_) {
                return;
            }
            _loc2_ = _loc1_.pic;
            this.loader = new Loader();
            this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onImgComplete));
            this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.onErr));
            try {
                this.loader.load(new URLRequest(_loc2_));
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
}
