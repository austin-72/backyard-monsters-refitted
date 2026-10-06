import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { FocusEvent, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, Button_CLIP, GLOBAL, ImageCache, KEYS, POPUPSETTINGS, SOUNDS, ScrollSetV, URLLoaderApi, frame_CLIP } from "@game";

export class AllianceFormPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _mode: 0, _selectedIdx: 0, _cells: null, _previewCells: null, _scrollContent: null, _allianceName: null, _allianceDesc: null, _nameField: null, _descField: null });
    }

    public static MODE_CREATE: int; // const
    public static MODE_EDIT: int; // const

    // Index of the My Alliance tab in ALLIANCEPOPUP (TAB_LABELS order), jumped
    // to after a successful create — mirrors the original.
    private static MY_ALLIANCE_TAB: int; // const

    private static BG_W: int; // const
    private static BG_H: int; // const
    private static PAD_H: int; // const
    private static PAD_TOP: int; // const
    private static TITLE_SIZE: int; // const
    private static TITLE_H: int; // const
    private static TITLE_GAP: int; // const
    private static PAD_BOTTOM: int; // const
    private static CONTENT_Y_OFFSET: int; // const
    private static CONTENT_H: int; // const

    private static GRID_COLS: int; // const
    private static CELL_SIZE: int; // const
    private static GRID_CONTENT_W: int; // const
    private static SCROLLBAR_ALLOC: int; // const
    private static GRID_H: int; // const

    private static COL_GAP: int; // const
    private static RIGHT_FORM_W: int; // const

    private static SHIELD_IDS: any[]; // const

    static {
        as3.lazyStatics(this, { MODE_CREATE: 0, MODE_EDIT: 0, MY_ALLIANCE_TAB: 0, BG_W: 0, BG_H: 0, PAD_H: 0, PAD_TOP: 0, TITLE_SIZE: 0, TITLE_H: 0, TITLE_GAP: 0, PAD_BOTTOM: 0, CONTENT_Y_OFFSET: 0, CONTENT_H: 0, GRID_COLS: 0, CELL_SIZE: 0, GRID_CONTENT_W: 0, SCROLLBAR_ALLOC: 0, GRID_H: 0, COL_GAP: 0, RIGHT_FORM_W: 0, SHIELD_IDS: null }, () => {
            AllianceFormPopup.MODE_CREATE = 0;
            AllianceFormPopup.MODE_EDIT = 1;
            AllianceFormPopup.MY_ALLIANCE_TAB = 1;
            AllianceFormPopup.BG_W = 580;
            AllianceFormPopup.BG_H = 500;
            AllianceFormPopup.PAD_H = 28;
            AllianceFormPopup.PAD_TOP = 22;
            AllianceFormPopup.TITLE_SIZE = 24;
            AllianceFormPopup.TITLE_H = 32;
            AllianceFormPopup.TITLE_GAP = 12;
            AllianceFormPopup.PAD_BOTTOM = 20;
            AllianceFormPopup.CONTENT_Y_OFFSET = (AllianceFormPopup.PAD_TOP + AllianceFormPopup.TITLE_H + AllianceFormPopup.TITLE_GAP) | 0;
            AllianceFormPopup.CONTENT_H = (AllianceFormPopup.BG_H - AllianceFormPopup.CONTENT_Y_OFFSET - AllianceFormPopup.PAD_BOTTOM) | 0;
            AllianceFormPopup.GRID_COLS = 4;
            AllianceFormPopup.CELL_SIZE = 67;
            AllianceFormPopup.GRID_CONTENT_W = 280;
            AllianceFormPopup.SCROLLBAR_ALLOC = 16;
            AllianceFormPopup.GRID_H = (AllianceFormPopup.CONTENT_H - 10) | 0;
            AllianceFormPopup.COL_GAP = 10;
            AllianceFormPopup.RIGHT_FORM_W = (AllianceFormPopup.BG_W - AllianceFormPopup.PAD_H * 2 - AllianceFormPopup.GRID_CONTENT_W - AllianceFormPopup.SCROLLBAR_ALLOC - AllianceFormPopup.COL_GAP) | 0;
            AllianceFormPopup.SHIELD_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41];
        });
    }
    private _mc: MovieClip;
    private _mode: int;
    private _selectedIdx: int;
    private _cells: any[];
    private _previewCells: any[];
    private _scrollContent: MovieClip;
    private _allianceName: string;
    private _allianceDesc: string;
    private _nameField: TextField;
    private _descField: TextField;

    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Opens the create/edit form. In edit mode, `image` and `description`
     * prefill the shield selection and description field with the alliance's
     * current values (the name is shown read-only and cannot be changed).
     * @param {int} mode - MODE_CREATE or MODE_EDIT.
     * @param {String} allianceName - Existing name, shown read-only in edit mode.
     * @param {int} image - Existing shield id, preselected in edit mode.
     * @param {String} description - Existing description, prefilled in edit mode.
     */
    public Show(mode: int, allianceName: string = null, image: int = 0, description: string = null): void {
        this._mode = mode;
        this._allianceName = allianceName;
        this._allianceDesc = description;
        this._mc = new MovieClip();
        this._cells = [];
        this._selectedIdx = this._indexOfShield(image);

        const frameX: int = (-((AllianceFormPopup.BG_W * 0.5) | 0)) | 0;
        const frameY: int = (-((AllianceFormPopup.BG_H * 0.5) | 0)) | 0;
        const contentX: int = (frameX + AllianceFormPopup.PAD_H) | 0;
        const contentY: int = (frameY + AllianceFormPopup.CONTENT_Y_OFFSET) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = AllianceFormPopup.BG_W;
        frame.height = AllianceFormPopup.BG_H;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this._onClose));

        let tTitle: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = AllianceFormPopup.BG_W - AllianceFormPopup.PAD_H * 2;
        tTitle.height = AllianceFormPopup.TITLE_H;
        let titleFmt: TextFormat = new TextFormat("Groboldov", AllianceFormPopup.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = KEYS.Get(mode == AllianceFormPopup.MODE_CREATE ? "alliance_create_title" : "alliance_edit_title");
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = contentX;
        tTitle.y = frameY + AllianceFormPopup.PAD_TOP;

        let leftBg: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        leftBg.mouseEnabled = false;
        leftBg.graphics.beginFill(AllianceConstants.INNER_BG, 1);
        leftBg.graphics.lineStyle(1, 8947848, 1);
        leftBg.graphics.drawRect(0, 0, AllianceFormPopup.GRID_CONTENT_W + AllianceFormPopup.SCROLLBAR_ALLOC, AllianceFormPopup.GRID_H);
        leftBg.graphics.endFill();
        leftBg.x = contentX;
        leftBg.y = contentY;

        this._buildShieldGrid(contentX, contentY);

        const rightColX: int = (contentX + AllianceFormPopup.GRID_CONTENT_W + AllianceFormPopup.SCROLLBAR_ALLOC + AllianceFormPopup.COL_GAP) | 0;
        this._buildFormColumn(rightColX, contentY);

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    private _buildShieldGrid(leftX: int, leftY: int): void {
        let gridContainer: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        gridContainer.x = leftX;
        gridContainer.y = leftY;

        this._scrollContent = as3.as(gridContainer.addChild(new MovieClip()), MovieClip);
        this._scrollContent.x = 6;
        for (let i: int = 0; i < AllianceFormPopup.SHIELD_IDS.length; i++) {
            let cell: MovieClip = as3.as(this._scrollContent.addChild(new MovieClip()), MovieClip);
            cell.buttonMode = true;
            cell.mouseChildren = false;
            cell.focusRect = false;
            cell.x = (i % AllianceFormPopup.GRID_COLS) * AllianceFormPopup.CELL_SIZE;
            cell.y = ((i / AllianceFormPopup.GRID_COLS) | 0) * AllianceFormPopup.CELL_SIZE + 5;
            this._drawCell(cell, i == this._selectedIdx);
            this._loadIcon(cell, AllianceFormPopup.SHIELD_IDS[i] | 0, (AllianceFormPopup.CELL_SIZE - 2) | 0, 2);
            cell.addEventListener(MouseEvent.CLICK, this._makeShieldClickHandler(i));
            this._cells.push(cell);
        }

        let maskMC: MovieClip = as3.as(gridContainer.addChild(new MovieClip()), MovieClip);
        maskMC.graphics.beginFill(16711680, 1);
        maskMC.graphics.drawRect(0, 0, AllianceFormPopup.GRID_CONTENT_W, AllianceFormPopup.GRID_H);
        maskMC.graphics.endFill();
        this._scrollContent.mask = maskMC;

        let scrollBar: ScrollSetV = as3.as(gridContainer.addChild(new ScrollSetV(this._scrollContent, maskMC, true)), ScrollSetV);
        scrollBar.x = AllianceFormPopup.GRID_CONTENT_W;
        scrollBar.y = 0;
    }

    private _buildFormColumn(x: int, y: int): void {
        const gap: int = 10;
        const inputH: int = 36;
        const textareaH: int = 80;
        const btnH: int = 36;
        const btnW: int = 150;
        const BOTTOM_PAD: int = 10;
        const colBottom: int = (y + AllianceFormPopup.CONTENT_H) | 0;

        let tDesc: TextField = new TextField();
        tDesc.wordWrap = true;
        tDesc.multiline = true;
        tDesc.width = AllianceFormPopup.RIGHT_FORM_W;
        tDesc.defaultTextFormat = new TextFormat("Verdana", 15, 0x333333);
        tDesc.htmlText = KEYS.Get(this._mode == AllianceFormPopup.MODE_CREATE ? "alliance_create_desc" : "alliance_edit_desc");
        tDesc.height = (tDesc.textHeight | 0) + 6;
        tDesc.selectable = false;
        tDesc.mouseEnabled = false;
        tDesc.x = x;
        tDesc.y = y;
        this._mc.addChild(tDesc);

        const btnY: int = (colBottom - BOTTOM_PAD - btnH) | 0;
        let actBtn: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        actBtn.Setup(KEYS.Get(this._mode == AllianceFormPopup.MODE_CREATE ? "alliance_btn_create" : "alliance_btn_save"), false, btnW, btnH);
        actBtn.x = x + (((AllianceFormPopup.RIGHT_FORM_W - btnW) / 2) | 0);
        actBtn.y = btnY;
        actBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onAction));

        const textareaY: int = (btnY - gap - textareaH) | 0;
        let descBg: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        descBg.mouseEnabled = false;
        descBg.graphics.beginFill(16777215, 1);
        descBg.graphics.lineStyle(1, 8947848, 1);
        descBg.graphics.drawRoundRect(0, 0, AllianceFormPopup.RIGHT_FORM_W, textareaH, 4, 4);
        descBg.graphics.endFill();
        descBg.x = x;
        descBg.y = textareaY;

        let descField: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        this._descField = descField;
        descField.type = TextFieldType.INPUT;
        descField.selectable = true;
        descField.mouseEnabled = true;
        descField.background = false;
        descField.border = false;
        descField.wordWrap = true;
        descField.multiline = true;
        descField.maxChars = 255;
        descField.width = AllianceFormPopup.RIGHT_FORM_W - 12;
        descField.height = textareaH - 8;
        descField.x = x + 6;
        descField.y = textareaY + 4;
        descField.defaultTextFormat = new TextFormat("Verdana", 11, 0x333333);
        if (this._mode == AllianceFormPopup.MODE_EDIT && this._allianceDesc != null && this._allianceDesc.length > 0) {
            descField.text = this._allianceDesc;
        } else {
            this._applyPlaceholder(descField, KEYS.Get("alliance_desc_placeholder"));
        }

        this._previewCells = [];
        const previewSizes: any[] = [60, 36, 20];
        const nameInputY: int = (textareaY - gap - inputH) | 0;
        const previewY: int = (nameInputY - gap - 60) | 0;
        let previewX: int = x;
        for (let i: int = 0; i < previewSizes.length; i++) {
            let sz: int = previewSizes[i] | 0;
            let pCell: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
            pCell.mouseEnabled = false;
            pCell.graphics.beginFill(0, 0);
            pCell.graphics.drawRect(0, 0, sz, sz);
            pCell.graphics.endFill();
            pCell.x = previewX;
            pCell.y = previewY;
            previewX = (previewX + (sz + 8)) | 0;
            this._loadIcon(pCell, AllianceFormPopup.SHIELD_IDS[this._selectedIdx] | 0, sz);
            this._previewCells.push(pCell);
        }

        let nameBg: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        nameBg.mouseEnabled = false;
        nameBg.graphics.beginFill(16777215, 1);
        nameBg.graphics.lineStyle(1, 8947848, 1);
        nameBg.graphics.drawRoundRect(0, 0, AllianceFormPopup.RIGHT_FORM_W, inputH, 4, 4);
        nameBg.graphics.endFill();
        nameBg.x = x;
        nameBg.y = nameInputY;

        let nameField: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        this._nameField = nameField;
        nameField.background = false;
        nameField.border = false;
        nameField.width = AllianceFormPopup.RIGHT_FORM_W - 12;
        nameField.height = 18;
        nameField.x = x + 6;
        nameField.y = nameInputY + (((inputH - 18) / 2) | 0);
        nameField.defaultTextFormat = new TextFormat("Verdana", 11, 0x333333);
        if (this._mode == AllianceFormPopup.MODE_CREATE) {
            nameField.type = TextFieldType.INPUT;
            nameField.selectable = true;
            nameField.mouseEnabled = true;
            nameField.maxChars = 30;
            this._applyPlaceholder(nameField, KEYS.Get("alliance_name_placeholder"));
        } else {
            nameField.type = TextFieldType.DYNAMIC;
            nameField.selectable = false;
            nameField.mouseEnabled = false;
            nameField.text = (this._allianceName != null) ? this._allianceName : "";
        }
    }

    /**
     * Returns the grid index of a shield id, or 0 (first shield) when the id is
     * absent from SHIELD_IDS — used to preselect the current shield on edit.
     */
    private _indexOfShield(id: int): int {
        let idx: int = AllianceFormPopup.SHIELD_IDS.indexOf(id);
        return idx < 0 ? 0 : idx;
    }

    /**
     * Returns the ImageCache key for a shield icon (relative to GLOBAL._storageURL).
     * IDs 1–20 use the _large suffix; 21–41 use _medium.
     */
    private _iconKey(id: int): string {
        let suffix: string = id <= 20 ? "_large" : "_medium";
        return "alliances/" + id + suffix + ".png";
    }

    /**
     * Loads a shield icon into a container via ImageCache, scaling it to fit targetSize.
     * Subsequent calls for the same icon are served from the in-memory BitmapData cache.
     */
    private _loadIcon(container: MovieClip, id: int, targetSize: int, padding: int = 0): void {
        let inner: int = (targetSize - padding * 2) | 0;
        ImageCache.GetImageWithCallBack(this._iconKey(id), (key: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            let mc: MovieClip = as3.as(args[0], MovieClip);
            let ts: int = args[1] | 0;
            let inn: int = args[2] | 0;
            if (bmd.width > 0 && bmd.height > 0) {
                let scale: number = Math.min(inn / bmd.width, inn / bmd.height);
                bmp.scaleX = bmp.scaleY = scale;
                bmp.x = ((ts - bmd.width * scale) / 2) | 0;
                bmp.y = ((ts - bmd.height * scale) / 2) | 0;
            }
            mc.addChild(bmp);
        }, true, 4, "", [container, targetSize, inner]);
    }

    /**
     * Wires placeholder text (light gray) to a TextField, clearing on focus and
     * restoring on blur when empty.
     */
    private _applyPlaceholder(field: TextField, placeholder: string): void {
        field.htmlText = "<font color=\"#AAAAAA\">" + placeholder + "</font>";
        field.addEventListener(FocusEvent.FOCUS_IN, (e: FocusEvent): void => {
            if (field.text == placeholder) {
                field.text = "";
            }
        });
        field.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            if (field.text == "") {
                field.htmlText = "<font color=\"#AAAAAA\">" + placeholder + "</font>";
            }
        });
    }

    private _drawCell(cell: MovieClip, selected: boolean = false): void {
        const BG_PAD: int = 2;
        cell.graphics.clear();
        cell.graphics.beginFill(0, 0);
        cell.graphics.drawRect(0, 0, AllianceFormPopup.CELL_SIZE - 2, AllianceFormPopup.CELL_SIZE - 2);
        cell.graphics.endFill();
        if (selected) {
            cell.graphics.beginFill(3355443, 1);
            cell.graphics.drawRect(BG_PAD, BG_PAD, AllianceFormPopup.CELL_SIZE - 2 - BG_PAD * 2, AllianceFormPopup.CELL_SIZE - 2 - BG_PAD * 2);
            cell.graphics.endFill();
        }
    }

    private _makeShieldClickHandler(idx: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this._drawCell(as3.as(this._cells[this._selectedIdx], MovieClip), false);
            this._selectedIdx = idx;
            this._drawCell(as3.as(this._cells[this._selectedIdx], MovieClip), true);
            this._updatePreview();
        };
    }

    private _updatePreview(): void {
        if (this._previewCells == null) {
            return;
        }
        let previewSizes: any[] = [60, 36, 20];
        for (let i: int = 0; i < this._previewCells.length; i++) {
            let pc: MovieClip = as3.as(this._previewCells[i], MovieClip);
            while (pc.numChildren > 0) {
                pc.removeChildAt(0);
            }
            this._loadIcon(pc, AllianceFormPopup.SHIELD_IDS[this._selectedIdx] | 0, previewSizes[i] | 0);
        }
    }

    private _onAction(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._mode == AllianceFormPopup.MODE_CREATE) {
            this._submitCreate();
        } else {
            this._submitEdit();
        }
    }

    /**
     * Reads the form and posts a create-alliance request, mirroring the
     * original client: both the name and the description are required (an
     * untouched field still showing its placeholder counts as empty).
     */
    private _submitCreate(): void {
        let name: string = (this._nameField != null) ? this._trim(this._nameField.text) : "";
        if (name == KEYS.Get("alliance_name_placeholder")) {
            name = "";
        }
        if (name.length == 0) {
            GLOBAL.Message(KEYS.Get("alliance_err_name_too_short"));
            return;
        }

        let description: string = (this._descField != null) ? this._trim(this._descField.text) : "";
        if (description == KEYS.Get("alliance_desc_placeholder")) {
            description = "";
        }
        if (description.length == 0) {
            GLOBAL.Message(KEYS.Get("alliance_err_desc_too_short"));
            return;
        }

        let image: int = AllianceFormPopup.SHIELD_IDS[this._selectedIdx] | 0;

        let r: URLLoaderApi = new URLLoaderApi();
        let createVars: any[] = [["alliance_name", name], ["alliance_image", image], ["alliance_desc", description]];
        r.load(GLOBAL._allianceURL + "createalliance", createVars, as3.bind(this, this._onCreateComplete), as3.bind(this, this._onCreateFail));
    }

    /**
     * Handles the create-alliance response. The transport routes both success
     * (200) and server-sent error bodies here, so a present `alliance` field
     * signals success; otherwise `error` carries a message to display.
     *
     * Mirrors the original: on success there is no confirmation popup — the
     * form closes and the window jumps to the My Alliance tab.
     */
    private _onCreateComplete(response: any): void {
        if (response && response.alliance) {
            ALLIANCES._allianceID = response.alliance.alliance_id | 0;
            ALLIANCES._myAlliance = ALLIANCES.SetAlliance(response.alliance);
            ALLIANCES._isLeader = true;
            ALLIANCES.InvalidateMyAlliance();
            this._onClose();
            if (ALLIANCEWINDOW._mc != null) {
                ALLIANCEWINDOW._mc.SelectTab(AllianceFormPopup.MY_ALLIANCE_TAB);
            }
            ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
            return;
        }
        GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
    }

    private _onCreateFail(e: IOErrorEvent): void {
        GLOBAL.Message(KEYS.Get("alliance_err_generic"));
    }

    /**
     * Reads the form and posts an edit-alliance request. The name is immutable,
     * so only the shield image and description are sent; as on create, the
     * description is required (an untouched placeholder counts as empty).
     */
    private _submitEdit(): void {
        let description: string = (this._descField != null) ? this._trim(this._descField.text) : "";
        if (description == KEYS.Get("alliance_desc_placeholder")) {
            description = "";
        }
        if (description.length == 0) {
            GLOBAL.Message(KEYS.Get("alliance_err_desc_too_short"));
            return;
        }

        let image: int = AllianceFormPopup.SHIELD_IDS[this._selectedIdx] | 0;

        let r: URLLoaderApi = new URLLoaderApi();
        let editVars: any[] = [["alliance_image", image], ["alliance_desc", description]];
        r.load(GLOBAL._allianceURL + "editalliance", editVars, as3.bind(this, this._onEditComplete), as3.bind(this, this._onEditFail));
    }

    /**
     * Handles the edit-alliance response. As with create, a present `alliance`
     * field signals success; otherwise `error` carries a message. On success the
     * cached My Alliance payload is invalidated and the tab is re-rendered so the
     * new shield and description show immediately.
     */
    private _onEditComplete(response: any): void {
        if (response && response.alliance) {
            ALLIANCES._myAlliance = ALLIANCES.SetAlliance(response.alliance);
            ALLIANCES.InvalidateMyAlliance();
            this._onClose();
            if (ALLIANCEWINDOW._mc != null) {
                ALLIANCEWINDOW._mc.SelectTab(AllianceFormPopup.MY_ALLIANCE_TAB);
            }

            // SelectTab rebuilds the tab strip from the store the invalidate above
            // just emptied, so the Members label draws 0/0 and nothing puts it right -
            // the tab's own load refills the store but never touches the strip. This
            // coalesces onto that same request and refreshes the labels when it lands.
            ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
            return;
        }
        GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
    }

    private _onEditFail(e: IOErrorEvent): void {
        GLOBAL.Message(KEYS.Get("alliance_err_generic"));
    }

    /**
     * Trims leading/trailing whitespace (AS3 String has no native trim).
     */
    private _trim(value: string): string {
        if (value == null) {
            return "";
        }
        return value.replace(/^\s+|\s+$/g, "");
    }

    private _onClose(e: MouseEvent = null): void {
        SOUNDS.Play("close");
        GLOBAL.BlockerRemove();
        if (this._mc && this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
    }
}
