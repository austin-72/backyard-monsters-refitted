import * as as3 from "as3";
import { int } from "as3";
import { MouseEvent } from "flash/events";
import { TextFieldAutoSize } from "flash/text";
import { Console, GLOBAL, MESSAGE_CLIP, POPUPSETTINGS, SOUNDS, print } from "@game";

export class MESSAGE extends MESSAGE_CLIP {
    static {
        as3.fields(this, { _mc: null, _action: null, _action2: null, _args: null, _args2: null });
    }

    public _mc: MESSAGE_CLIP;
    public _action: Function;
    public _action2: Function;
    public _args: any[];
    public _args2: any[];

    public $ctor(): void {
        super.$ctor();
    }

    public Show(param1: string = null, param2: string = null, param3: Function = null, param4: any[] = null, param5: string = null, param6: Function = null, param7: any[] = null, param8: int = 1, param9: boolean = true): MESSAGE {
        this._action = param3;
        this._action2 = param6;
        this._args = param4;
        this._args2 = param7;
        this.tMessage.autoSize = TextFieldAutoSize.CENTER;
        this.tMessage.htmlText = param1;
        this.mcBG.height = this.tMessage.height + 45;
        if (param2) {
            this.bAction.Setup(param2);
            this.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Action));
            this.mcBG.height += 30;
        } else {
            this.bAction.visible = false;
        }
        if (param5) {
            this.bAction2.Setup(param5);
            this.bAction2.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Action2));
            this.mcBG.height += 30;
        } else {
            this.bAction2.visible = false;
        }
        this.mcBG.y = 0 - ((this.mcBG.height * 0.5) | 0);
        this.mcBG.Setup(param9);
        this.tMessage.y = this.mcBG.y + 20;
        this.bAction.y = this.mcBG.y + this.mcBG.height - 45;
        this.bAction2.y = this.mcBG.y + this.mcBG.height - 45;
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        this._mc = as3.as(GLOBAL._layerTop.addChild(this), MESSAGE_CLIP);
        this._mc.Center();
        this._mc.ScaleUp();
        return this;
    }

    public Action(param1: MouseEvent): void {
        let e: MouseEvent = param1;
        this.Hide();
        if (Boolean(this._action)) {
            try {
                if (!this._args) {
                    this._action();
                } else if (this._args.length == 1) {
                    this._action(this._args[0]);
                } else if (this._args.length == 2) {
                    this._action(this._args[0], this._args[1]);
                } else if (this._args.length == 3) {
                    this._action(this._args[0], this._args[1], this._args[2]);
                } else if (this._args.length == 4) {
                    this._action(this._args[0], this._args[1], this._args[2], this._args[3]);
                } else {
                    print("ERROR: MESSAGE.Action only handles up to 4 parameters! (cause its programmed funky)");
                }
            } catch (error) {
                Console.warning(error + "MESSAGE.Action (invalid action and/or arguments)", true);
            }
        }
    }

    public Action2(param1: MouseEvent): void {
        this.Hide();
        if (Boolean(this._action2)) {
            if (!this._args2) {
                this._action2();
            } else if (this._args2.length == 1) {
                this._action2(this._args2[0]);
            } else if (this._args2.length == 2) {
                this._action2(this._args2[0], this._args2[1]);
            } else if (this._args2.length == 3) {
                this._action2(this._args2[0], this._args2[1], this._args2[2]);
            }
        }
    }

    public Hide(param1: MouseEvent = null): void {
        GLOBAL.BlockerRemove();
        SOUNDS.Play("close");
        if (Boolean(this._mc) && Boolean(this._mc.parent)) {
            GLOBAL._layerTop.removeChild(this._mc);
        }
        this._mc = null;
    }

    public Resize(): void {
        if (GLOBAL._SCREENCENTER) {
            this._mc.x = GLOBAL._SCREENCENTER.x;
            this._mc.y = GLOBAL._SCREENCENTER.y;
        } else {
            this._mc.x = GLOBAL._SCREENINIT.width / 2;
            this._mc.y = GLOBAL._SCREENINIT.height / 2;
        }
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
