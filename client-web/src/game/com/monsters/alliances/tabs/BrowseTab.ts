import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, GradientType, MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { Matrix } from "flash/geom";
import { TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { getTimer } from "flash/utils";
import { AllianceConstants, AllianceFormPopup, ALLIANCES, AllianceTabBase, BrowseActionPopup, Button_CLIP, GLOBAL, ImageCache, IoAllianceUi, IoCrest, KEYS, SOUNDS, URLLoaderApi } from "@game";

export class BrowseTab extends AllianceTabBase {
    static {
        as3.fields(this, { _filterMode: 0, _filterBtnAll: null, _filterBtnWorld: null, _activePopup: null, _currentPage: 1, _totalPages: 0, _searchTerm: "", _searchField: null, _resultsLayer: null, _loading: false, _shown: null, _note: null });
    }

    private static PAD: int; // const
    private static BTN_H: int; // const
    private static BTN_FILTER_W: int; // const
    private static INPUT_W: int; // const
    private static BTN_SEARCH_W: int; // const
    private static CTRL_Y: int; // const
    private static TABLE_Y: int; // const
    private static HEADER_H: int; // const
    private static ROW_H: int; // const
    private static TABLE_X: int; // const
    private static TABLE_W: int; // const

    // CONTENT_W - PAD * 2
    // Column proportions from the original browse table (alliance.v343.css),
    // scaled to TABLE_W.
    private static C_RANK_X: int; // const
    private static C_RANK_W: int; // const
    private static C_NAME_X: int; // const
    private static C_NAME_W: int; // const
    private static C_MEM_X: int; // const
    private static C_MEM_W: int; // const
    private static C_EP_X: int; // const
    private static C_EP_W: int; // const
    private static C_LDR_X: int; // const
    private static C_LDR_W: int; // const
    private static C_ACT_X: int; // const
    private static C_ACT_W: int; // const

    private static ICON_W: int; // const

    // Original actions button is 97×25
    private static ACT_BTN_W: int; // const

    private static POP_RIGHT_X: int; // const
    private static POP_X: int; // const

    private static PAGE_BTN_SIZE: int; // const
    private static PAGE_BTN_GAP: int; // const
    private static PAGE_Y_GAP: int; // const
    private static PAGE_VISIBLE: int; // const

    private static ENDPOINT: string; // const

    static {
        as3.lazyStatics(this, { PAD: 0, BTN_H: 0, BTN_FILTER_W: 0, INPUT_W: 0, BTN_SEARCH_W: 0, CTRL_Y: 0, TABLE_Y: 0, HEADER_H: 0, ROW_H: 0, TABLE_X: 0, TABLE_W: 0, C_RANK_X: 0, C_RANK_W: 0, C_NAME_X: 0, C_NAME_W: 0, C_MEM_X: 0, C_MEM_W: 0, C_EP_X: 0, C_EP_W: 0, C_LDR_X: 0, C_LDR_W: 0, C_ACT_X: 0, C_ACT_W: 0, ICON_W: 0, ACT_BTN_W: 0, POP_RIGHT_X: 0, POP_X: 0, PAGE_BTN_SIZE: 0, PAGE_BTN_GAP: 0, PAGE_Y_GAP: 0, PAGE_VISIBLE: 0, ENDPOINT: null }, () => {
            BrowseTab.PAD = 10;
            BrowseTab.BTN_H = 36;
            BrowseTab.BTN_FILTER_W = 120;
            BrowseTab.INPUT_W = 260;
            BrowseTab.BTN_SEARCH_W = 110;
            BrowseTab.CTRL_Y = 10;
            BrowseTab.TABLE_Y = (BrowseTab.CTRL_Y + BrowseTab.BTN_H + 12) | 0;
            BrowseTab.HEADER_H = 22;
            BrowseTab.ROW_H = 36;
            BrowseTab.TABLE_X = BrowseTab.PAD;
            BrowseTab.TABLE_W = 788;
            BrowseTab.C_RANK_X = 0;
            BrowseTab.C_RANK_W = 50;
            BrowseTab.C_NAME_X = 50;
            BrowseTab.C_NAME_W = 287;
            BrowseTab.C_MEM_X = 337;
            BrowseTab.C_MEM_W = 81;
            BrowseTab.C_EP_X = 418;
            BrowseTab.C_EP_W = 119;
            BrowseTab.C_LDR_X = 537;
            BrowseTab.C_LDR_W = 138;
            BrowseTab.C_ACT_X = 675;
            BrowseTab.C_ACT_W = 113;
            BrowseTab.ICON_W = BrowseTab.ROW_H;
            BrowseTab.ACT_BTN_W = 97;
            BrowseTab.POP_RIGHT_X = (BrowseTab.TABLE_X + BrowseTab.C_ACT_X + BrowseTab.C_ACT_W) | 0;
            BrowseTab.POP_X = (BrowseTab.POP_RIGHT_X - BrowseActionPopup.POPUP_W) | 0;
            BrowseTab.PAGE_BTN_SIZE = 30;
            BrowseTab.PAGE_BTN_GAP = 6;
            BrowseTab.PAGE_Y_GAP = 13;
            BrowseTab.PAGE_VISIBLE = 10;
            BrowseTab.ENDPOINT = "searchalliances";
        });
    }
    private _filterMode: int;
    private _filterBtnAll: MovieClip;
    private _filterBtnWorld: MovieClip;
    private _activePopup: any;
    private _currentPage: int;
    private _totalPages: int;
    private _searchTerm: string;
    private _searchField: TextField;
    private _resultsLayer: MovieClip;
    private _loading: boolean;
    /** (QoL #543) what the rows on show were asked with: { page, filter, term }, or null before any */
    private _shown: any;
    private _note: TextField;

    /**
     * (Inferno-only, QoL #543) the pages asked for, by "filter|page|term": { t (getTimer), r (the answer) }. One less
     * than a minute old is shown without asking again (the server allows 30 searches a minute); an older one stands
     * in for a page the server refuses.
     */
    private static _cache: any = {};
    private static _cacheAid: int = -1;
    private static readonly CACHE_MS: int = 60000;
    private static readonly CACHE_KEEP_MS: int = 600000;

    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Builds the static controls once, then loads the first page of results.
     * The results table and pagination live in their own layer so they can be
     * re-rendered on search / filter / page change without rebuilding controls.
     */
    public override build(): void {
        this._buildControls();
        this._resultsLayer = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._fetch();
    }

    /**
     * Requests the current page of alliances from the server for the active
     * search term and world filter. `page` is sent 0-indexed to match the
     * server; the client tracks it 1-indexed for display.
     */
    private _fetch(): void {
        if (this._loading) {
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            this._ioFetch();
            return;
        }
        this._loading = true;
        this._clearResults();

        let vars: any[] = [["search", this._searchTerm], ["page", String(this._currentPage - 1)], ["world", this._filterMode == 1 ? "true" : "false"]];
        let r: URLLoaderApi = new URLLoaderApi();
        r.load(GLOBAL._allianceURL + BrowseTab.ENDPOINT, vars, as3.bind(this, this._onSearchComplete), as3.bind(this, this._onSearchFail));
    }

    /**
     * Renders the returned page. Server-sent errors arrive here (not _onSearchFail)
     * with an `error` field; an empty result set shows the no-results message.
     * @param {Object} response - Parsed { totalResults, pageSize, alliances[] } payload.
     */
    private _onSearchComplete(response: any): void {
        this._loading = false;
        if (this.stage == null) {
            return;
        }
        this._clearResults();

        if (response == null || response.error) {
            if (response && response.error) {
                GLOBAL.Message(String(response.error));
            }
            this._showStatus(KEYS.Get("alliance_browse_no_results"));
            return;
        }

        let list: any[] = as3.as(response.alliances, Array);
        let pageSize: int = response.pageSize | 0;
        let totalResults: int = response.totalResults | 0;
        this._totalPages = ((pageSize > 0) ? Math.ceil(totalResults / pageSize) : 0) | 0;

        if (list == null || list.length == 0) {
            this._showStatus(KEYS.Get("alliance_browse_no_results"));
            return;
        }

        this._buildTable(this._mapRows(list));
        this._buildPagination();
    }

    /** (QoL #543) What the current page is asked with. */
    private _ioKey(): string {
        return this._filterMode + "|" + this._currentPage + "|" + String(this._searchTerm || "").toLowerCase();
    }

    /**
     * (Inferno-only, QoL #543) As _fetch, from memory when the page was asked for within the last minute; the rows on
     * show stay until the answer, and stay (with "Couldn't refresh") when the server refuses or fails.
     */
    private _ioFetch(): void {
        this._dismissActivePopup();
        if (BrowseTab._cacheAid != ALLIANCES._allianceID) {
            // (joined, left or made one: whose row is "mine" and every stance changed)
            BrowseTab._cache = {};
            BrowseTab._cacheAid = ALLIANCES._allianceID;
        }
        let key: string = this._ioKey();
        let hit: any = BrowseTab._cache[key];
        if (hit && getTimer() - Number(hit.t) < BrowseTab.CACHE_MS) {
            this._ioShow(hit.r);
            return;
        }
        this._loading = true;
        let vars: any[] = [["search", this._searchTerm], ["page", String(this._currentPage - 1)], ["world", this._filterMode == 1 ? "true" : "false"]];
        new URLLoaderApi().load(GLOBAL._allianceURL + BrowseTab.ENDPOINT, vars, (response: any): void => {
            this._ioAnswer(key, response);
        }, (e: IOErrorEvent): void => {
            this._ioAnswer(key, null);
        });
    }

    private _ioAnswer(key: string, response: any): void {
        this._loading = false;
        let ok: boolean = response != null && !response.error && response.alliances != null;
        if (ok) {
            let now: int = getTimer();
            for (let k in BrowseTab._cache) {
                if (now - Number(BrowseTab._cache[k].t) > BrowseTab.CACHE_KEEP_MS) {
                    delete BrowseTab._cache[k];
                }
            }
            BrowseTab._cache[key] = { "t": now, "r": response };
        }
        if (this.stage == null) {
            return;
        }
        if (key != this._ioKey()) {
            // (another page, filter or search was chosen while this one was on its way)
            this._ioFetch();
            return;
        }
        if (ok) {
            this._ioShow(response);
            return;
        }
        let stale: any = BrowseTab._cache[key];
        let kept: boolean = true;
        if (stale) {
            this._ioShow(stale.r);
        } else if (this._shown) {
            // the rows on show stay: back to what they were asked with
            this._currentPage = this._shown.page | 0;
            this._filterMode = this._shown.filter | 0;
            this._searchTerm = String(this._shown.term);
            if (this._searchField) {
                this._searchField.text = this._searchTerm;
            }
            this._drawFilterBtn(this._filterBtnAll, KEYS.Get("alliance_filter_all"), BrowseTab.BTN_FILTER_W, BrowseTab.BTN_H, this._filterMode == 0);
            this._drawFilterBtn(this._filterBtnWorld, KEYS.Get("alliance_filter_world"), BrowseTab.BTN_FILTER_W, BrowseTab.BTN_H, this._filterMode == 1);
        } else {
            // (nothing to keep showing)
            kept = false;
            this._clearResults();
            this._showStatus(KEYS.Get("io_al2_browse_failed"));
        }
        if (this._note && kept) {
            this._note.text = KEYS.Get("io_al2_browse_stale");
            this._note.visible = true;
        }
    }

    /** (QoL #543) Draws an answer (fresh or from memory) and notes what it was asked with. */
    private _ioShow(response: any): void {
        this._onSearchComplete(response);
        this._shown = { "page": this._currentPage, "filter": this._filterMode, "term": this._searchTerm };
        if (this._note) {
            this._note.visible = false;
        }
    }

    /** (QoL #543) A stance changed in a row: the pages in memory follow. */
    private static _ioPatchCache(allianceId: int, relationship: int): void {
        for (let k in BrowseTab._cache) {
            let list: any[] = as3.as(BrowseTab._cache[k].r.alliances, Array);
            for (let item of as3.values(list || [])) {
                if ((item.alliance_id | 0) == allianceId) {
                    item.relationship = relationship;
                }
            }
        }
    }

    private _onSearchFail(e: IOErrorEvent): void {
        this._loading = false;
        if (this.stage == null) {
            return;
        }
        this._clearResults();
        this._showStatus(KEYS.Get("alliance_browse_no_results"));
    }

    /**
     * Maps server rows onto the shape the table renderer expects, resolving the
     * diplomacy swatch colour and flagging the viewer's own alliance (the "me"
     * row, which is highlighted and has no actions button). leader_baseid is
     * carried through unrendered for the actions popup's Visit Leader button,
     * and is 0 when the leader has no main yard to visit. (Inferno-only, QoL #166:
     * and who can join, for the popup's join button: joinMode, minLevel.)
     * @param {Array} list - Raw server alliance rows.
     * @returns {Array} Rows for _buildTable.
     */
    private _mapRows(list: any[]): any[] {
        let out: any[] = [];
        let i: int = 0;
        while (i < list.length) {
            let item: any = list[i];
            let allianceId: int = item.alliance_id | 0;
            out.push({ rank: item.rank | 0, name: String(item.name), members: item.members | 0, ep: GLOBAL.INFERNO_ONLY ? GLOBAL.FormatNumber(Number(item.ep)) : String(item.ep), leader: String(item.leader_name), leader_baseid: Number(item.leader_baseid), relationship: item.relationship | 0, color: this._relationshipColor(item.relationship | 0), alliance_id: allianceId, image: item.image | 0, crest: item.crest || null, self: allianceId != 0 && allianceId == ALLIANCES._allianceID, tag: item.tag ? String(item.tag) : null, max: item.max_members | 0, online: item.online != null ? item.online | 0 : -1, desc: item.description ? String(item.description) : "", theirs: item.their_stance != null ? item.their_stance | 0 : 0, joinMode: item.join_mode ? String(item.join_mode) : "request", minLevel: item.min_level | 0 });
            i++;
        }
        return out;
    }

    /**
     * Loads an alliance shield icon into the row's icon box, centred and scaled
     * to fit inside the given inset (leaving the relationship-colour fill showing
     * as a border). IDs 1-20 use the _large asset, 21+ use _medium — matching
     * MyAllianceTab / AllianceFormPopup.
     * @param {MovieClip} container - The icon box (relationship-tinted).
     * @param {int} id - Shield id 1-41.
     * @param {int} inset - Padding between the box edge and the shield.
     */
    private _loadShield(container: MovieClip, id: int, inset: int, crest: any = null): void {
        // (14 October: its own crest, when it has one)
        if (IoCrest.fit(container, crest, (BrowseTab.ROW_H - inset * 2) | 0, inset + (((BrowseTab.ICON_W - BrowseTab.ROW_H) / 2) | 0), inset)) {
            return;
        }
        if (id <= 0) {
            return;
        }
        let suffix: string = id <= 20 ? "_large" : "_medium";
        let key: string = "alliances/" + id + suffix + ".png";
        let box: int = (BrowseTab.ROW_H - inset * 2) | 0;
        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            let mc: MovieClip = as3.as(args[0], MovieClip);
            let ins: int = args[1] | 0;
            let sz: int = args[2] | 0;
            if (bmd.width > 0 && bmd.height > 0) {
                let scale: number = Math.min(sz / bmd.width, sz / bmd.height);
                bmp.scaleX = bmp.scaleY = scale;
                bmp.x = ins + (((sz - bmd.width * scale) / 2) | 0);
                bmp.y = ins + (((sz - bmd.height * scale) / 2) | 0);
            }
            mc.addChild(bmp);
        }, true, 4, "", [container, inset, box]);
    }

    /**
     * Recolours one row's shield frame after its relationship changes.
     *
     * A stance write only ever alters the `relationship` field of that one row -
     * searchAlliances orders by empire points (Inferno: empire value) and filters on name and world, so
     * nothing can reorder or drop out - which is why this repaints in place
     * rather than refetching the page.
     *
     * @param {Object} rowData - The row whose relationship has just changed.
     */
    private _repaintRelationship(rowData: any): void {
        let swatch: MovieClip = as3.as(rowData.swatch, MovieClip);

        if (swatch == null) {
            return;
        }

        rowData.color = this._relationshipColor(rowData.relationship | 0);

        swatch.graphics.clear();
        swatch.graphics.beginFill(rowData.color >>> 0, 1);
        swatch.graphics.drawRect(0, 0, BrowseTab.ICON_W, BrowseTab.ROW_H);
        swatch.graphics.endFill();
        swatch.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        swatch.graphics.moveTo(BrowseTab.ICON_W, 0);
        swatch.graphics.lineTo(BrowseTab.ICON_W, BrowseTab.ROW_H);
    }

    private _relationshipColor(relationship: int): uint {
        if (relationship < 0) {
            return AllianceConstants.REL_HOSTILE;
        }
        if (relationship > 0) {
            return AllianceConstants.REL_FRIENDLY;
        }
        return AllianceConstants.REL_NEUTRAL;
    }

    /**
     * Draws a centered status message (loading / no results) in the results layer.
     */
    private _showStatus(message: string): void {
        if (this._resultsLayer == null) {
            return;
        }
        let tf: TextField = as3.as(this._resultsLayer.addChild(new TextField()), TextField);
        tf.selectable = false;
        tf.mouseEnabled = false;
        tf.width = BrowseTab.TABLE_W;
        tf.height = 24;
        tf.x = BrowseTab.TABLE_X;
        tf.y = BrowseTab.TABLE_Y + 12;
        let fmt: TextFormat = new TextFormat("Verdana", 13, 0x5A3B1E, true);
        fmt.align = TextFormatAlign.CENTER;
        tf.defaultTextFormat = fmt;
        tf.text = message;
    }

    /**
     * Clears the results layer (table, pagination, status text) and dismisses any
     * open actions popup, leaving the controls intact.
     */
    private _clearResults(): void {
        this._dismissActivePopup();
        if (this._resultsLayer == null) {
            return;
        }
        while (this._resultsLayer.numChildren > 0) {
            this._resultsLayer.removeChildAt(0);
        }
    }

    private _buildControls(): void {
        this._filterBtnAll = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._filterBtnAll.x = BrowseTab.PAD;
        this._filterBtnAll.y = BrowseTab.CTRL_Y;
        this._filterBtnAll.buttonMode = true;
        this._filterBtnAll.mouseChildren = false;
        this._drawFilterBtn(this._filterBtnAll, KEYS.Get("alliance_filter_all"), BrowseTab.BTN_FILTER_W, BrowseTab.BTN_H, this._filterMode == 0);
        this._filterBtnAll.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onFilterClick));

        this._filterBtnWorld = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._filterBtnWorld.x = BrowseTab.PAD + BrowseTab.BTN_FILTER_W + 5;
        this._filterBtnWorld.y = BrowseTab.CTRL_Y;
        this._filterBtnWorld.buttonMode = true;
        this._filterBtnWorld.mouseChildren = false;
        this._drawFilterBtn(this._filterBtnWorld, KEYS.Get("alliance_filter_world"), BrowseTab.BTN_FILTER_W, BrowseTab.BTN_H, this._filterMode == 1);
        this._filterBtnWorld.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onFilterClick));

        if (!ALLIANCES._myAlliance) {
            let btnCreate: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
            btnCreate.Setup(KEYS.Get("alliance_btn_create"), false, 130, BrowseTab.BTN_H);
            btnCreate.x = this._filterBtnWorld.x + BrowseTab.BTN_FILTER_W + 5;
            btnCreate.y = BrowseTab.CTRL_Y;
            btnCreate.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onCreateAlliance));
        }

        const searchBtnX: int = (this.CONTENT_W - BrowseTab.PAD - BrowseTab.BTN_SEARCH_W) | 0;
        const inputX: int = (searchBtnX - 8 - BrowseTab.INPUT_W) | 0;
        const INPUT_BOX_H: int = 32;
        // FIELD_H sized to one line — avoids Flash rendering typed text in the
        // corner of an oversized INPUT TextField
        const FIELD_H: int = 18;

        let inputBg: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        inputBg.mouseEnabled = false;
        inputBg.graphics.beginFill(16777215, 1);
        inputBg.graphics.lineStyle(1, 8947848, 1);
        inputBg.graphics.drawRoundRect(0, 0, BrowseTab.INPUT_W, INPUT_BOX_H, 2, 2);
        inputBg.graphics.endFill();
        inputBg.x = inputX;
        inputBg.y = BrowseTab.CTRL_Y;

        this._searchField = as3.as(this.addChild(new TextField()), TextField);
        this._searchField.type = TextFieldType.INPUT;
        this._searchField.background = false;
        this._searchField.border = false;
        this._searchField.selectable = true;
        this._searchField.mouseEnabled = true;
        this._searchField.maxChars = 30;
        this._searchField.width = BrowseTab.INPUT_W - 12;
        this._searchField.height = FIELD_H;
        this._searchField.x = inputX + 6;
        this._searchField.y = BrowseTab.CTRL_Y + (((INPUT_BOX_H - FIELD_H) / 2) | 0);
        let sfmt: TextFormat = new TextFormat("Verdana", 11, 0x333333, true);
        this._searchField.defaultTextFormat = sfmt;
        this._searchField.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this._onSearchKey));
        this._searchField.name = "ioAlBrowseSearch";

        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #543: under the search box, when the rows on show could not be refreshed)
            this._note = IoAllianceUi.addText(this, "", inputX, (BrowseTab.CTRL_Y + INPUT_BOX_H + 1) | 0, 10, 0xA03010, true, BrowseTab.INPUT_W);
            this._note.height = 15;
            this._note.name = "ioAlBrowseNote";
            this._note.visible = false;
        }

        let btnSearch: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        btnSearch.Setup(KEYS.Get("alliance_btn_search"), false, BrowseTab.BTN_SEARCH_W, BrowseTab.BTN_H);
        btnSearch.x = searchBtnX;
        btnSearch.y = BrowseTab.CTRL_Y;
        btnSearch.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onSearch));
    }

    private _onSearchKey(e: KeyboardEvent): void {
        if (e.keyCode == Keyboard.ENTER) {
            this._onSearch(null);
        }
    }

    /**
     * Runs a search from the input field, resetting to the first page.
     */
    private _onSearch(e: MouseEvent): void {
        SOUNDS.Play("click1");
        this._searchTerm = (this._searchField != null && this._searchField.text != null) ? this._searchField.text : "";
        this._currentPage = 1;
        this._fetch();
    }

    private _buildTable(rows: any[]): void {
        const totalH: int = (BrowseTab.HEADER_H + rows.length * BrowseTab.ROW_H) | 0;

        let tableMC: MovieClip = as3.as(this._resultsLayer.addChild(new MovieClip()), MovieClip);
        tableMC.x = BrowseTab.TABLE_X;
        tableMC.y = BrowseTab.TABLE_Y;

        tableMC.graphics.beginFill(AllianceConstants.HEADER_BG);
        tableMC.graphics.drawRect(0, 0, BrowseTab.TABLE_W, BrowseTab.HEADER_H);
        tableMC.graphics.endFill();

        let fi: int = 0;
        while (fi < rows.length) {
            let rowFill: uint = Boolean(rows[fi].self) ? AllianceConstants.ROW_ME : ((fi % 2 == 0) ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1);
            tableMC.graphics.beginFill(rowFill);
            tableMC.graphics.drawRect(0, BrowseTab.HEADER_H + fi * BrowseTab.ROW_H, BrowseTab.TABLE_W, BrowseTab.ROW_H);
            tableMC.graphics.endFill();
            fi++;
        }

        tableMC.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        let vLineXs: any[] = [BrowseTab.C_NAME_X, BrowseTab.C_MEM_X, BrowseTab.C_EP_X, BrowseTab.C_LDR_X, BrowseTab.C_ACT_X];
        let vli: int = 0;
        while (vli < vLineXs.length) {
            tableMC.graphics.moveTo(vLineXs[vli] | 0, 0);
            tableMC.graphics.lineTo(vLineXs[vli] | 0, totalH);
            vli++;
        }
        tableMC.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        tableMC.graphics.drawRect(0, 0, BrowseTab.TABLE_W, totalH);

        this._addLabel(tableMC, KEYS.Get("alliance_col_rank"), BrowseTab.C_RANK_X, 0, BrowseTab.C_RANK_W, BrowseTab.HEADER_H, true, TextFormatAlign.CENTER);
        this._addLabel(tableMC, KEYS.Get("alliance_col_name"), (BrowseTab.C_NAME_X + 5) | 0, 0, (BrowseTab.C_MEM_X - BrowseTab.C_NAME_X - 5) | 0, BrowseTab.HEADER_H, true, TextFormatAlign.LEFT);
        this._addLabel(tableMC, KEYS.Get("alliance_col_members"), BrowseTab.C_MEM_X, 0, BrowseTab.C_MEM_W, BrowseTab.HEADER_H, true, TextFormatAlign.CENTER);
        this._addLabel(tableMC, KEYS.Get(GLOBAL.INFERNO_ONLY ? "io_alliance_col_ev" : "alliance_col_ep"), BrowseTab.C_EP_X, 0, BrowseTab.C_EP_W, BrowseTab.HEADER_H, true, TextFormatAlign.CENTER);
        this._addLabel(tableMC, KEYS.Get("alliance_col_leader"), (BrowseTab.C_LDR_X + 5) | 0, 0, (BrowseTab.C_LDR_W - 5) | 0, BrowseTab.HEADER_H, true, TextFormatAlign.LEFT);
        this._addLabel(tableMC, KEYS.Get("alliance_col_actions"), BrowseTab.C_ACT_X, 0, BrowseTab.C_ACT_W, BrowseTab.HEADER_H, true, TextFormatAlign.CENTER);

        let ri: int = 0;
        while (ri < rows.length) {
            let rowData: any = rows[ri];
            let rowBaseY: int = (BrowseTab.HEADER_H + ri * BrowseTab.ROW_H) | 0;

            this._addLabel(tableMC, String(rowData.rank), BrowseTab.C_RANK_X, rowBaseY, BrowseTab.C_RANK_W, BrowseTab.ROW_H, false, TextFormatAlign.CENTER);

            // The shield sits in a relationship-tinted frame (matching the
            // original's relation_div wrapper); the colour fill shows as a border
            // once the shield image loads inset on top of it.
            let iconMC: MovieClip = as3.as(tableMC.addChild(new MovieClip()), MovieClip);
            iconMC.mouseEnabled = false;
            iconMC.graphics.beginFill(rowData.color >>> 0, 1);
            iconMC.graphics.drawRect(0, 0, BrowseTab.ICON_W, BrowseTab.ROW_H);
            iconMC.graphics.endFill();
            iconMC.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
            iconMC.graphics.moveTo(BrowseTab.ICON_W, 0);
            iconMC.graphics.lineTo(BrowseTab.ICON_W, BrowseTab.ROW_H);
            iconMC.x = BrowseTab.C_NAME_X + 1;
            iconMC.y = rowBaseY;
            this._loadShield(iconMC, rowData.image | 0, 3, rowData.crest);

            rowData.swatch = iconMC;

            const nameX: int = (BrowseTab.C_NAME_X + 1 + BrowseTab.ICON_W + 8) | 0;
            // (Inferno-only, QoL #170: its chat tag before the name, and "12/50", or Full)
            // (QoL #170: the start of its description under the name, and how many are online under the count)
            const nameW: int = (BrowseTab.C_MEM_X - nameX - 5) | 0;
            let desc: string = rowData.desc ? String(rowData.desc) : "";
            this._addLabel(tableMC, (rowData.tag ? "[" + rowData.tag + "] " : "") + as3.str(rowData.name), nameX, (desc ? rowBaseY - 8 : rowBaseY) | 0, nameW, BrowseTab.ROW_H, false, TextFormatAlign.LEFT);
            if (desc) {
                let descField: TextField = IoAllianceUi.addText(tableMC, desc, nameX, (rowBaseY + 18) | 0, 10, AllianceConstants.IO_MUTED, false, nameW);
                descField.height = 16;
                descField.name = "ioAlBrowseDesc";
                // (one line: cut short with "..." where it runs past the column)
                while (descField.textWidth > nameW - 6 && desc.length > 4) {
                    desc = desc.slice(0, -2).replace(/\s+$/, "");
                    descField.text = desc + "...";
                }
            }
            // (Inferno-only, 27 November, admintester's: the badge and the name clicked: the alliance's card, its badge
            // large and its whole description)
            if (GLOBAL.INFERNO_ONLY) {
                let hit: Sprite = new Sprite();
                hit.name = "ioAlBrowseCardHit";
                hit.graphics.beginFill(0xffffff, 0);
                hit.graphics.drawRect(0, 0, nameX + nameW - (BrowseTab.C_NAME_X + 1), BrowseTab.ROW_H);
                hit.graphics.endFill();
                hit.x = BrowseTab.C_NAME_X + 1;
                hit.y = rowBaseY;
                hit.buttonMode = true;
                hit.useHandCursor = true;
                tableMC.addChild(hit);
                hit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    SOUNDS.Play("click1");
                    this._ioShowCard(rowData);
                });
            }
            let full: boolean = (rowData.max | 0) > 0 && (rowData.members | 0) >= (rowData.max | 0);
            let online: int = rowData.online != null ? rowData.online | 0 : -1;
            this._addLabel(tableMC, (rowData.max | 0) > 0 ? (full ? KEYS.Get("io_ally_full") : rowData.members + "/" + rowData.max) : String(rowData.members), BrowseTab.C_MEM_X, (online >= 0 ? rowBaseY - 8 : rowBaseY) | 0, BrowseTab.C_MEM_W, BrowseTab.ROW_H, full, TextFormatAlign.CENTER, (full ? 0xC0281C : 0) >>> 0);
            if (online >= 0) {
                let onField: TextField = IoAllianceUi.addText(tableMC, KEYS.Get("io_al2_browse_online", { "v1": String(online) }), BrowseTab.C_MEM_X, (rowBaseY + 18) | 0, 10, (online > 0 ? AllianceConstants.IO_GAINED : AllianceConstants.IO_MUTED) >>> 0, online > 0, BrowseTab.C_MEM_W, IoAllianceUi.CENTER);
                onField.height = 16;
                onField.name = "ioAlBrowseOnline";
            }
            this._addLabel(tableMC, as3.str(rowData.ep), BrowseTab.C_EP_X, rowBaseY, BrowseTab.C_EP_W, BrowseTab.ROW_H, false, TextFormatAlign.CENTER);
            // (Inferno-only, QoL #176: how they have flagged the player's alliance, under the leader's name)
            let theirs: int = GLOBAL.INFERNO_ONLY && !rowData.self ? rowData.theirs | 0 : 0;
            this._addLabel(tableMC, as3.str(rowData.leader), (BrowseTab.C_LDR_X + 5) | 0, (theirs != 0 ? rowBaseY - 8 : rowBaseY) | 0, (BrowseTab.C_LDR_W - 5) | 0, BrowseTab.ROW_H, false, TextFormatAlign.LEFT);
            if (theirs != 0) {
                let stanceField: TextField = IoAllianceUi.addText(tableMC, KEYS.Get(theirs > 0 ? "io_al4_their_ally" : "io_al4_their_foe"), (BrowseTab.C_LDR_X + 5) | 0, (rowBaseY + 18) | 0, 10, (theirs > 0 ? AllianceConstants.IO_GAINED : AllianceConstants.IO_LOST) >>> 0, true, (BrowseTab.C_LDR_W - 8) | 0);
                stanceField.height = 16;
                stanceField.name = "ioAl4TheirStance";
            }

            // The viewer's own alliance has no actions to take on itself.
            if (!rowData.self) {
                let actBtn: Button_CLIP = as3.as(tableMC.addChild(new Button_CLIP()), Button_CLIP);
                actBtn.Setup(KEYS.Get("alliance_col_actions"), false, BrowseTab.ACT_BTN_W, (BrowseTab.ROW_H - 6) | 0);
                actBtn._txt.htmlText = "<b><font color=\"#000000\">" + KEYS.Get("alliance_col_actions") + "</font></b>";
                actBtn.x = BrowseTab.C_ACT_X + (((BrowseTab.C_ACT_W - BrowseTab.ACT_BTN_W) / 2) | 0);
                actBtn.y = rowBaseY + 3;
                actBtn.addEventListener(MouseEvent.CLICK, this._makeActionsHandler(rowData, rowBaseY));
            }

            ri++;
        }

        let gridOverlay: MovieClip = as3.as(tableMC.addChild(new MovieClip()), MovieClip);
        gridOverlay.mouseEnabled = false;
        gridOverlay.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        let hli: int = 0;
        while (hli < rows.length) {
            let hlineY: int = ((hli == 0) ? BrowseTab.HEADER_H : BrowseTab.HEADER_H + hli * BrowseTab.ROW_H) | 0;
            gridOverlay.graphics.moveTo(0, hlineY);
            gridOverlay.graphics.lineTo(BrowseTab.TABLE_W, hlineY);
            hli++;
        }
        // Redraw the outer frame's bottom edge on top of the icon rects, which
        // otherwise hide it on the last/only row.
        gridOverlay.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        gridOverlay.graphics.moveTo(0, totalH);
        gridOverlay.graphics.lineTo(BrowseTab.TABLE_W, totalH);
    }

    /**
     * Builds the pagination row (<<, a sliding window of page numbers, >>). It
     * sits on the wooden frame at the bottom of the popup, just below the beige
     * inner section, right-aligned to the inner section's right edge. The window
     * shows up to PAGE_VISIBLE pages and slides as the current page advances
     * past it (e.g. 1–10, then 2–11, …). The current page and the arrows at the
     * first/last page are drawn non-clickable.
     */
    private _buildPagination(): void {
        const total: int = this._totalPages;
        if (total <= 1) {
            return;
        }

        const visible: int = Math.min(BrowseTab.PAGE_VISIBLE, total) | 0;
        let start: int = ((this._currentPage <= visible) ? 1 : this._currentPage - visible + 1) | 0;
        if (start > total - visible + 1) {
            start = (total - visible + 1) | 0;
        }
        if (start < 1) {
            start = 1;
        }
        const end: int = (start + visible - 1) | 0;

        const count: int = (visible + 2) | 0;
        const totalW: int = (count * BrowseTab.PAGE_BTN_SIZE + (count - 1) * BrowseTab.PAGE_BTN_GAP) | 0;
        const py: int = (this.CONTENT_H + BrowseTab.PAGE_Y_GAP) | 0;
        const step: int = (BrowseTab.PAGE_BTN_SIZE + BrowseTab.PAGE_BTN_GAP) | 0;
        let x: int = (this.CONTENT_W - totalW) | 0;

        let prev: MovieClip = this._makePageButton("<<", (this._currentPage - 1) | 0, this._currentPage <= 1);
        prev.x = x;
        prev.y = py;
        this._resultsLayer.addChild(prev);
        x += step;

        for (let p: int = start; p <= end; p++) {
            let num: MovieClip = this._makePageButton(String(p), p, p == this._currentPage);
            num.x = x;
            num.y = py;
            this._resultsLayer.addChild(num);
            x += step;
        }

        let next: MovieClip = this._makePageButton(">>", (this._currentPage + 1) | 0, this._currentPage >= total);
        next.x = x;
        next.y = py;
        this._resultsLayer.addChild(next);
    }

    /**
     * Creates a small square page button (a number or << / >>). When marked
     * active it is drawn with the hover colour and is non-interactive — used
     * for the current page number and for the << / >> arrows when already on
     * the first / last page. All other buttons are clickable.
     * @param {String} label - Button text (number or arrows)
     * @param {int} targetPage - Page to switch to on click
     * @param {Boolean} current - Whether this button is in the active/end state
     * @returns {MovieClip} The page button
     */
    private _makePageButton(label: string, targetPage: int, current: boolean): MovieClip {
        let mc: MovieClip = null;
        mc = new MovieClip();
        this._drawPageBtn(mc, current, false);

        let tf: TextField = as3.as(mc.addChild(new TextField()), TextField);
        tf.selectable = false;
        tf.mouseEnabled = false;
        tf.width = BrowseTab.PAGE_BTN_SIZE;
        tf.height = 16;
        tf.x = 0;
        tf.y = ((BrowseTab.PAGE_BTN_SIZE - 16) / 2) | 0;
        let fmt: TextFormat = new TextFormat("Verdana", 11, 0x333333, true);
        fmt.align = TextFormatAlign.CENTER;
        tf.defaultTextFormat = fmt;
        tf.text = label;

        if (current) {
            mc.mouseEnabled = false;
        } else {
            mc.buttonMode = true;
            mc.mouseChildren = false;
            mc.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                this._drawPageBtn(mc, false, true);
            });
            mc.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                this._drawPageBtn(mc, false, false);
            });
            mc.addEventListener(MouseEvent.CLICK, this._makePageHandler(targetPage));
        }

        return mc;
    }

    /**
     * Draws (or redraws) a page button's background: gray gradient normally,
     * lighter on hover. The current page uses that same lighter hover colour.
     */
    private _drawPageBtn(mc: MovieClip, current: boolean, hover: boolean): void {
        mc.graphics.clear();
        mc.graphics.lineStyle(1, 8947848, 1);
        if (current || hover) {
            mc.graphics.beginFill(16448250, 1);
        } else {
            let mtx: Matrix = new Matrix();
            mtx.createGradientBox(BrowseTab.PAGE_BTN_SIZE, BrowseTab.PAGE_BTN_SIZE, Math.PI / 2, 0, 0);
            mc.graphics.beginGradientFill(GradientType.LINEAR, [0xF4F5F2, 0xD9D9D9], [1, 1], [0, 255], mtx);
        }
        mc.graphics.drawRoundRect(0, 0, BrowseTab.PAGE_BTN_SIZE, BrowseTab.PAGE_BTN_SIZE, 4, 4);
        mc.graphics.endFill();
    }

    /**
     * Builds a click handler that loads the given page from the server.
     * @param {int} targetPage - Page to switch to
     * @returns {Function} MouseEvent handler
     */
    private _makePageHandler(targetPage: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            if (targetPage < 1 || targetPage > this._totalPages || targetPage == this._currentPage) {
                return;
            }
            this._currentPage = targetPage;
            this._fetch();
        };
    }

    private _makeActionsHandler(rowData: any, rowBaseY: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            const popY: int = (Math.min(BrowseTab.TABLE_Y + rowBaseY, this.CONTENT_H - BrowseActionPopup.PopupHeight()) + 12) | 0;
            this._showActionsPopup(rowData, (BrowseTab.POP_X - 30) | 0, popY);
        };
    }

    private _showActionsPopup(rowData: any, popX: int, popY: int): void {
        this._dismissActivePopup();

        let onRelationshipChanged: Function = (): void => {
            this._repaintRelationship(rowData);
            // (QoL #543)
            BrowseTab._ioPatchCache(rowData.alliance_id | 0, rowData.relationship | 0);
        };

        this._activePopup = new BrowseActionPopup(rowData, as3.bind(this, this._dismissActivePopup), onRelationshipChanged);
        this._activePopup.x = popX;
        this._activePopup.y = popY;
        this.addChild(this._activePopup);
        this.stage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageMouseDown));
    }

    /**
     * (Inferno-only, 27 November, admintester's: "clicking on an alliance badge should make it larger", and "clicking
     * on an alliance name should make the description larger in a popup (combine this with badge recommendation)")
     * A card in the middle of the tab: the badge at 150 px, the tag and name, the whole description, the leader and
     * members, and Actions (the row's own popup). Closed by its X, a click outside it, or Actions.
     */
    private _ioShowCard(rowData: any): void {
        this._dismissActivePopup();
        const W: int = 460;
        const BADGE: int = 150;
        const PAD: int = 16;
        let card: Sprite = new Sprite();
        card.name = "ioAlBrowseCard";
        let textX: int = (PAD + BADGE + 16) | 0;
        let textW: int = (W - textX - PAD) | 0;
        let title: TextField = IoAllianceUi.addText(card, (rowData.tag ? "[" + rowData.tag + "] " : "") + as3.str(rowData.name), textX, PAD, 15, AllianceConstants.IO_INK, true, (textW - 18) | 0, "left", false, true);
        title.name = "ioAlCardName";
        let y: int = (title.y + title.height + 4) | 0;
        let facts: TextField = IoAllianceUi.addText(card, KEYS.Get("alliance_col_leader") + ": " + as3.str(rowData.leader) + "\n" + KEYS.Get("alliance_col_members") + ": " + ((rowData.max | 0) > 0 ? rowData.members + "/" + rowData.max : String(rowData.members)) + (rowData.online != null ? "  ·  " + KEYS.Get("io_al2_browse_online", { "v1": String(rowData.online | 0) }) : ""), textX, y, 11, AllianceConstants.IO_MUTED, false, textW, "left", false, true);
        y = (facts.y + facts.height + 8) | 0;
        let desc: string = rowData.desc ? String(rowData.desc) : KEYS.Get("io_al_card_nodesc");
        let body: TextField = IoAllianceUi.addText(card, desc, textX, y, 13, AllianceConstants.IO_INK, false, textW, "left", false, true);
        body.name = "ioAlCardDesc";
        body.selectable = true;
        body.mouseEnabled = true;
        // (a long one: up to 220 px of it, scrolled with the wheel)
        if (body.height > 220) {
            body.height = 220;
        }
        let h: int = Math.max(PAD * 2 + BADGE, body.y + body.height + PAD + (rowData.self ? 0 : 34)) | 0;
        card.graphics.lineStyle(2, AllianceConstants.TABLE_BORDER, 1);
        card.graphics.beginFill(0xFBF4E6, 1);
        card.graphics.drawRoundRect(0, 0, W, h, 14, 14);
        card.graphics.endFill();
        card.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        card.graphics.beginFill(rowData.color >>> 0, 1);
        card.graphics.drawRect(PAD - 4, PAD - 4, BADGE + 8, BADGE + 8);
        card.graphics.endFill();
        let badge: Sprite = new Sprite();
        badge.name = "ioAlCardBadge";
        badge.mouseEnabled = false;
        badge.x = PAD;
        badge.y = PAD;
        card.addChild(badge);
        IoAllianceUi.emblem(badge, rowData.image | 0, BADGE, rowData.crest);
        let close: MovieClip = IoAllianceUi.button("X", 22, 22, (e: MouseEvent): void => {
            SOUNDS.Play("close");
            this._dismissActivePopup();
        });
        close.name = "ioAlCardClose";
        close.x = W - 22 - 8;
        close.y = 8;
        card.addChild(close);
        if (!rowData.self) {
            let act: MovieClip = IoAllianceUi.button(KEYS.Get("alliance_col_actions"), 110, 26, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this._showActionsPopup(rowData, (BrowseTab.POP_X - 30) | 0, Math.min(card.y, this.CONTENT_H - BrowseActionPopup.PopupHeight()) | 0);
            });
            act.name = "ioAlCardActions";
            act.x = W - PAD - 110;
            act.y = h - PAD - 26;
            card.addChild(act);
        }
        card.x = ((this.CONTENT_W - W) / 2) | 0;
        card.y = Math.max(8, ((this.CONTENT_H - h) / 2) | 0) | 0;
        this._activePopup = card;
        this.addChild(card);
        if (this.stage) {
            this.stage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageMouseDown));
        }
    }

    private _dismissActivePopup(): void {
        if (this._activePopup == null) {
            return;
        }
        if (this._activePopup.parent) {
            this._activePopup.parent.removeChild(this._activePopup);
        }
        this._activePopup = null;
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageMouseDown));
        }
    }

    private _onStageMouseDown(e: MouseEvent): void {
        if (this._activePopup == null) {
            return;
        }
        let target: DisplayObject = as3.as(e.target, DisplayObject);
        while (target != null) {
            if (target == this._activePopup) {
                return;
            }
            target = as3.as(target.parent, DisplayObject);
        }
        this._dismissActivePopup();
    }

    private _onFilterClick(e: MouseEvent): void {
        SOUNDS.Play("click1");
        this._filterMode = (e.currentTarget == this._filterBtnAll) ? 0 : 1;
        this._drawFilterBtn(this._filterBtnAll, KEYS.Get("alliance_filter_all"), BrowseTab.BTN_FILTER_W, BrowseTab.BTN_H, this._filterMode == 0);
        this._drawFilterBtn(this._filterBtnWorld, KEYS.Get("alliance_filter_world"), BrowseTab.BTN_FILTER_W, BrowseTab.BTN_H, this._filterMode == 1);
        this._currentPage = 1;
        this._fetch();
    }

    private _onCreateAlliance(e: MouseEvent): void {
        SOUNDS.Play("click1");
        new AllianceFormPopup().Show(AllianceFormPopup.MODE_CREATE);
    }

    /**
     * Draws (or redraws) a custom filter button.
     * Active state: top-to-bottom gradient (near-white → gray), dark text.
     * Inactive state: solid white background, dimmed text.
     */
    private _drawFilterBtn(mc: MovieClip, label: string, w: int, h: int, active: boolean): void {
        mc.graphics.clear();
        mc.graphics.lineStyle(1, 8947848, 1);
        if (active) {
            let mtx: Matrix = new Matrix();
            mtx.createGradientBox(w, h, Math.PI / 2, 0, 0);
            mc.graphics.beginGradientFill(GradientType.LINEAR, [0xF4F5F2, 0xD9D9D9], [1, 1], [0, 255], mtx);
        } else {
            mc.graphics.beginFill(16777215, 1);
        }
        mc.graphics.drawRoundRect(0, 0, w, h, 6, 6);
        mc.graphics.endFill();

        while (mc.numChildren > 0) {
            mc.removeChildAt(0);
        }

        let tf: TextField = as3.as(mc.addChild(new TextField()), TextField);
        tf.selectable = false;
        tf.mouseEnabled = false;
        tf.width = w;
        tf.height = 20;
        tf.x = 0;
        tf.y = ((h - 18) / 2) | 0;
        let fmt: TextFormat = new TextFormat("Verdana", 11, active ? 0x333333 : 0x666666, true);
        fmt.align = TextFormatAlign.CENTER;
        tf.defaultTextFormat = fmt;
        tf.text = label;
    }
}
