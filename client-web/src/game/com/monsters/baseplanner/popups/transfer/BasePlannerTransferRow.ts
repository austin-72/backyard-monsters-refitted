import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip } from "flash/display";
import { Event, KeyboardEvent, MouseEvent } from "flash/events";
import { ColorTransform } from "flash/geom";
import { TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { BasePlanner, BasePlannerTransferPopup, BasePlannerTransferRow_CLIP, BaseTemplate, BFOUNDATION, GLOBAL, InstanceManager, IoFormat, IoMapUi, KEYS, PlannerTemplate, SubscriptionHandler } from "@game";

export class BasePlannerTransferRow extends BasePlannerTransferRow_CLIP {
    static {
        as3.fields(this, { slot: 0, template: null, _isEditing: false, _DEFAULT_SLOT_NAME: "<Empty>", ioRenameButton: null, ioDeleteButton: null, ioCountsTotal: -1, ioCountsMissing: -1 });
    }

    /** Inferno-only (QoL #680): the row's Rename and Delete (ioSlotButtons) send these. */
    public static readonly IO_RENAME_CLICK: string = "ioRenameClick";

    public static readonly IO_DELETE_CLICK: string = "ioDeleteClick";

    /** How much wider the Save and Load windows are, for Rename and Delete at the right of each row. */
    public static readonly IO_EXTRA_WIDTH: int = 120;

    public slot: uint;
    public template: BaseTemplate;
    public ioRenameButton: MovieClip;
    public ioDeleteButton: MovieClip;
    /** Inferno-only (QoL #681): the saved layout's buildings and those not in this yard (-1: not shown, an empty slot). */
    public ioCountsTotal: int;
    public ioCountsMissing: int;
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
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #680: names of up to 30 letters; the server keeps 60)
            this.tTemplateName.maxChars = 30;
        }
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
        if (GLOBAL.INFERNO_ONLY) {
            this.ioShowSaved(param1 ? param1.savedAt : 0, Boolean(param1 && param1.nodes && param1.nodes.length));
            // (QoL #680: a long name made smaller to fit, on two lines if it still doesn't, and Rename and Delete at
            // the right of the row)
            this.ioFitName();
            if (BasePlannerTransferRow.ioSlotButtons) {
                this.ioAddSlotButtons();
            }
            // (QoL #681: how many buildings the layout has, and how many of them this yard doesn't have)
            if (!BasePlannerTransferRow.ioIsEmpty(param1) && param1.nodes && param1.nodes.length) {
                this.ioShowCounts(param1);
            }
        }
    }

    /**
     * Inferno-only (QoL #681): a saved layout's buildings, and those of them not in this yard: a building it places that
     * the yard has no building for (by its id, of the same kind, as Load matches them; a second place for one building
     * counts as one that has gone, as Load takes it). Load puts one of that kind from storage there, if there is one.
     */
    public static ioCounts(param1: BaseTemplate): any {
        let byId: any = {};
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (b && b._type != 7) {
                byId[String(b._id)] = b;
            }
        }
        let total: int = 0;
        let missing: int = 0;
        let planned: int = 0;
        let used: any = {};
        for (let n of (param1 && param1.nodes ? param1.nodes : [])) {
            if (!n) {
                continue;
            }
            // (QoL #685: a planned building, not built yet, is counted on its own)
            if (n.id == PlannerTemplate.IO_GHOST_ID) {
                planned++;
                continue;
            }
            total++;
            if (n.id == PlannerTemplate._DECORATION_ID) {
                // (put down from storage when it was saved: Load takes one of its kind from storage again)
                continue;
            }
            let b: BFOUNDATION = as3.as(byId[String(n.id)], BFOUNDATION);
            if (!b || (n.type > 0 && b._type != (n.type | 0)) || used[String(n.id)]) {
                missing++;
            } else {
                used[String(n.id)] = true;
            }
        }
        return { "total": total, "missing": missing, "planned": planned };
    }

    /** The counts in a small line under the row ("212 buildings · 3 not in this yard"). */
    private ioShowCounts(param1: BaseTemplate): void {
        let c: any = BasePlannerTransferRow.ioCounts(param1);
        let f: TextField = new TextField();
        f.name = "ioPlan2SlotInfo";
        f.selectable = false;
        f.mouseEnabled = false;
        f.defaultTextFormat = new TextFormat("Verdana", 9, 0x6A5A48, false);
        f.width = 300 + BasePlannerTransferRow.IO_EXTRA_WIDTH;
        f.height = 14;
        f.x = this.tTemplateName.x;
        f.y = 36;
        let line: string = c.total == 1 ? KEYS.Get("io_plan2_slot_count1") : KEYS.Get("io_plan2_slot_count", { "v1": c.total });
        if (param1 && param1.ioFromElsewhere) {
            // (12 November: a shared outpost slot saved in another outpost: placed by kind of building, its ids aren't this yard's)
            line += " · " + KEYS.Get("io_plan4_other_outpost");
            c.missing = 0;
        } else if (c.missing > 0) {
            line += " · <font color=\"#A0200F\">" + KEYS.Get("io_plan2_slot_missing", { "v1": c.missing }) + "</font>";
        }
        if (c.planned > 0) {
            line += " · " + KEYS.Get("io_plan3_slot_planned", { "v1": c.planned });
        }
        f.htmlText = line;
        this.addChild(f);
        this.ioCountsTotal = c.total | 0;
        this.ioCountsMissing = c.missing | 0;
    }

    /** Inferno-only (QoL #680): a name of up to 30 letters in the name's room: smaller, then on two lines. */
    private ioFitName(): void {
        let f: TextField = this.tTemplateName;
        GLOBAL.ioFitText(f, 11);
        if (f.textWidth > f.width - 4) {
            f.wordWrap = true;
            GLOBAL.ioFitHeight(f, 8);
        }
    }

    /** Inferno-only (QoL #680): whether the rows have Rename and Delete (where layouts can be saved). */
    public static get ioSlotButtons(): boolean {
        return GLOBAL.INFERNO_ONLY && BasePlanner.canSave;
    }

    /** Inferno-only (QoL #680): a slot nothing was ever saved in (the list fills those with a blank layout). */
    public static ioIsEmpty(param1: BaseTemplate): boolean {
        return !param1 || !(param1.savedAt > 0) && (!param1.nodes || param1.nodes.length == 0);
    }

    /** Rename and Delete, right of the row's Save / Load button; greyed for an empty slot. */
    private ioAddSlotButtons(): void {
        let empty: boolean = BasePlannerTransferRow.ioIsEmpty(this.template);
        let x: number = this.bTransfer.x + this.bTransfer.width + 4;
        this.ioRenameButton = IoMapUi.button(KEYS.Get("io_plan_rename"), 60, 26, (e: MouseEvent): void => {
            this.isEditing = false;
            this.dispatchEvent(new Event(BasePlannerTransferRow.IO_RENAME_CLICK));
        }, "grey", 9);
        this.ioRenameButton.name = "ioPlanRename";
        this.ioDeleteButton = IoMapUi.button(KEYS.Get("io_plan_delete"), 60, 26, (e: MouseEvent): void => {
            this.isEditing = false;
            this.dispatchEvent(new Event(BasePlannerTransferRow.IO_DELETE_CLICK));
        }, "grey", 9);
        this.ioDeleteButton.name = "ioPlanDelete";
        for (let b of [this.ioRenameButton, this.ioDeleteButton] as any[]) {
            b.x = Math.round(x);
            b.y = 5;
            x += 64;
            if (empty) {
                b.setEnabled(false);
            }
            this.addChild(b);
        }
    }

    /**
     * Inferno-only (QoL #680): Load's row for an empty slot, greyed and not clickable (loading one put every building
     * into storage, as Clear does).
     */
    public ioGreyOut(): void {
        this.bTransfer.Enabled = false;
        this.bTransfer.mouseEnabled = false;
        this.bTransfer.mouseChildren = false;
        this.bTransfer.alpha = 0.5;
        this.tTemplateName.mouseEnabled = false;
        this.tTemplateName.textColor = 0x777777;
        this.mcBackground.transform.colorTransform = new ColorTransform(0.75, 0.75, 0.75);
    }

    /** Inferno-only (10 October): when the slot was last saved, at the right of its name ("Empty": never). */
    private ioShowSaved(at: number, used: boolean): void {
        let f: TextField = new TextField();
        f.name = "ioSaved";
        f.selectable = false;
        f.mouseEnabled = false;
        f.multiline = true;
        f.wordWrap = true;
        let format: TextFormat = new TextFormat("Verdana", 9, 0x6A5A48, false);
        format.align = TextFormatAlign.RIGHT;
        format.leading = -1;
        f.defaultTextFormat = format;
        f.width = 84;
        f.height = 28;
        this.tTemplateName.width = Math.max(60, this.tTemplateName.width - 86);
        f.x = this.tTemplateName.x + this.tTemplateName.width + 2;
        // (QoL #235: "Saved" and "Empty" in the player's language)
        f.text = at > 0 ? BasePlannerTransferRow.ioDay(at) + "\n" + BasePlannerTransferRow.ioTime(at) : (used ? IoFormat.text("settings_saved", "Saved") : IoFormat.text("io_fmt_empty", "Empty"));
        f.y = this.tTemplateName.y + (this.tTemplateName.height - f.textHeight - 4) / 2;
        this.addChild(f);
    }

    private static readonly IO_MONTHS: any[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /** "10 Oct 2026" in the player's own time and language (QoL #574: the game's one date, IoFormat.date). */
    public static ioDay(seconds: number): string {
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.date(seconds);
        }
        let d: Date = new Date(seconds * 1000);
        return BasePlannerTransferRow.IO_MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    }

    /** "10:41" in the player's own time (QoL #574: the game's one clock, IoFormat.time; it was "10:41 AM"). */
    public static ioTime(seconds: number): string {
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.time(seconds);
        }
        let d: Date = new Date(seconds * 1000);
        let h: number = d.getHours();
        let m: number = d.getMinutes();
        return ((h + 11) % 12 + 1) + ":" + (m < 10 ? "0" : "") + m + (h < 12 ? " AM" : " PM");
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
