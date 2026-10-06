import * as as3 from "as3";
import { uint } from "as3";
import { Event, KeyboardEvent, MouseEvent } from "flash/events";
import { ColorTransform } from "flash/geom";
import { TextFieldType } from "flash/text";
import { Keyboard } from "flash/ui";
import { BasePlannerTransferPopup, BasePlannerTransferRow_CLIP, BaseTemplate, KEYS, SubscriptionHandler } from "@game";

export class BasePlannerTransferRow extends BasePlannerTransferRow_CLIP {
    static {
        as3.fields(this, { slot: 0, template: null, _isEditing: false, _DEFAULT_SLOT_NAME: "<Empty>" });
    }

    public slot: uint;
    public template: BaseTemplate;
    private _isEditing: boolean;
    private _DEFAULT_SLOT_NAME: string;

    public $ctor(param1?: BaseTemplate, param2?: uint): void {
        super.$ctor();
        this.template = param1;
        this.slot = param2;
        this.tSlotName.htmlText = KEYS.Get("basePlanner_slot_label", { "v1": String(param2 + 1) });
        this.tTemplateName.multiline = false;
        this.mcLock.visible = false;
        this.bTransfer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedTransfer), false, 0, true);
        this.tTemplateName.maxChars = 15;
        this.tTemplateName.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedEdit), false, 0, true);
        this.tTemplateName.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.rollOverName), false, 0, true);
        this.tTemplateName.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.rollOutName), false, 0, true);
        this.tTemplateName.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.pressedEnterOnName), false, 0, true);
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage), false, 0, true);
        if (param1) {
            this.tTemplateName.htmlText = param1.name;
        } else {
            this.tTemplateName.htmlText = KEYS.Get("basePlanner_layoutname", { "v1": (param2 + 1).toString() });
        }
        this.mcEdit.visible = false;
    }

    public set canEdit(param1: boolean) {
        this.tTemplateName.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedEdit));
        this.mcEdit.visible = false;
    }

    protected rollOutName(param1: MouseEvent): void {
        this.mcEdit.gotoAndStop("disabled");
    }

    protected rollOverName(param1: MouseEvent): void {
        this.mcEdit.gotoAndStop("enabled");
    }

    protected pressedEnterOnName(param1: KeyboardEvent): void {
        if (param1.keyCode == Keyboard.ENTER) {
            this.clickedTransfer(null);
        }
    }

    public set isEditing(param1: boolean) {
        if (param1 == this._isEditing) {
            return;
        }
        if (param1) {
            this.tTemplateName.type = TextFieldType.INPUT;
            this.tTemplateName.selectable = true;
            this.tTemplateName.setSelection(0, this.tTemplateName.text.length);
        } else {
            this.tTemplateName.type = TextFieldType.DYNAMIC;
            this.tTemplateName.selectable = false;
        }
        this._isEditing = param1;
    }

    public disable(param1: boolean = true): void {
        this.mouseChildren = false;
        this.bTransfer.visible = false;
        this.tTemplateName.htmlText = "<font color=\"#333333\">" + KEYS.Get("basePlanner_layoutname", { "v1": (this.slot + 1).toString() }) + "</font>";
        this.tSlotName.htmlText = "<font color=\"#AAAAAA\">" + KEYS.Get("basePlanner_slot_label", { "v1": String(this.slot + 1) }) + "</font>";
        this.mcBackground.transform.colorTransform = new ColorTransform(0.75, 0.75, 0.75);
        if (param1) {
            this.mcLock.visible = true;
            this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedUnlock), false, 0, true);
        }
    }

    protected clickedUnlock(param1: MouseEvent): void {
        SubscriptionHandler.instance.showPromoPopup();
    }

    protected removedFromStage(param1: Event): void {
        this.bTransfer.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedTransfer));
        this.tTemplateName.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedEdit));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage));
        this.tTemplateName.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.rollOverName));
        this.tTemplateName.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.rollOutName));
        this.tTemplateName.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.pressedEnterOnName));
    }

    protected clickedEdit(param1: MouseEvent): void {
        this.isEditing = true;
    }

    protected clickedTransfer(param1: MouseEvent): void {
        this.isEditing = false;
        this.dispatchEvent(new Event(BasePlannerTransferPopup.CLICKED_TRANSFER));
    }
}
