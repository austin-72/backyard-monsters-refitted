import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TextField, TextFormat } from "flash/text";
import { SOUNDS, ACHIEVEMENTS, BASE, BFOUNDATION, BUY, Button_CLIP, CREATURES, CREEPS, GLOBAL, ImageCache, InfernoKits, InstanceManager, IoMapUi, IoOutpostsPopup, IoTextPrompt, IoUnderworld, KEYS, Kit, LOGGER, PATHING, PLEASEWAIT, POPUPS, SecNum, io_kit_empty, popup_prefab_CLIP, popup_prefab_enlarge } from "@game";

export class popup_prefab extends popup_prefab_CLIP {
    static {
        as3.fields(this, { _KITS: null, _ioPage: 0, _ioTable: null, _ioToken: 0, _ioListeners: null, _ioThumbs: null, _ioPrev: null, _ioNext: null, _ioSave: null, _triggered: false, _ioBatch: null, _ioPager: null, _ioFrame0: null });
    }

    /** The table's top and height in the popup's art (its ten rows of 21.45). */
    private static readonly IO_TABLE_TOP: number = -114;

    private static readonly IO_TABLE_HEIGHT: number = 214.5;
    private _KITS: Vector<Kit>;
    // Inferno-only: six kits over two pages, sharing the popup's three columns.
    private _ioPage: int;

    /** (Inferno-only, QoL #333) the page the kit window was last turned to */
    private static _ioLastPage: int = 0;
    /** Inferno-only: the comparison table's rows, drawn for as many rows as there are (the art has ten). */
    private _ioTable: Shape;
    private _ioToken: int;
    private _ioListeners: any[];
    private _ioThumbs: any[];
    private _ioPrev: Button_CLIP;
    private _ioNext: Button_CLIP;
    /** One "save this outpost here" button under each of the player's own kit columns (page 3). */
    private _ioSave: any[];
    private _triggered: boolean;

    /**
     * Inferno-only (QoL #334, 15 October): set just before the window is made for several outposts at once (the
     * Outposts list's Choose kit...: [{baseid, x, y}]); the window takes it (_ioBatch) and builds the kit chosen on
     * all of them (ioBatchSelect, IoOutpostsPopup.ioBatchRun) instead of on the yard showing.
     */
    public static ioBatch: any[] = null;

    private _ioBatch: any[];

    public $ctor(): void {
        // (QoL #334: a window for several outposts)
        this._ioBatch = GLOBAL.INFERNO_ONLY && popup_prefab.ioBatch && popup_prefab.ioBatch.length > 0 ? popup_prefab.ioBatch : null;
        popup_prefab.ioBatch = null;
        // (13 November: a kit's hall calcification is priced from how far the hall standing is: the outpost open, built
        // over alone; 0, the whole of it, for several outposts at once)
        InfernoKits.ioStandingHallFort = !this._ioBatch && BASE.isOutpost && GLOBAL.townHall && (GLOBAL.townHall._type | 0) == 112 ? GLOBAL.townHall._fortification.Get() | 0 : 0;
        // (Inferno-only, QoL #333: on the page it was last turned to)
        this._ioPage = GLOBAL.INFERNO_ONLY ? popup_prefab._ioLastPage : 0;
        this._ioListeners = [];
        this._ioThumbs = [null, null, null, null];
        this._ioSave = [null, null, null, null];
        this._KITS = Vector.from([new Kit(JSON.parse("{\"0\":{\"Y\":-105,\"t\":112,\"id\":0,\"X\":-65},\"1\":{\"Y\":-165,\"t\":21,\"prefab\":5,\"id\":1,\"X\":-155},\"2\":{\"Y\":25,\"t\":21,\"prefab\":5,\"id\":2,\"X\":-15},\"3\":{\"Y\":-175,\"t\":21,\"prefab\":5,\"id\":3,\"X\":125},\"4\":{\"Y\":15,\"t\":20,\"prefab\":5,\"id\":4,\"X\":-155},\"5\":{\"Y\":25,\"t\":20,\"prefab\":5,\"id\":5,\"X\":125},\"6\":{\"Y\":-175,\"t\":20,\"prefab\":5,\"id\":6,\"X\":-15},\"7\":{\"Y\":-75,\"t\":25,\"id\":7,\"X\":-155},\"8\":{\"Y\":115,\"t\":15,\"prefab\":2,\"id\":8,\"X\":35},\"9\":{\"Y\":-295,\"t\":13,\"prefab\":2,\"id\":9,\"X\":-35},\"10\":{\"Y\":115,\"t\":13,\"prefab\":2,\"id\":10,\"X\":-65},\"11\":{\"Y\":-285,\"t\":5,\"prefab\":2,\"id\":11,\"X\":-125},\"13\":{\"Y\":-85,\"t\":22,\"id\":13,\"X\":85},\"14\":{\"rCP\":1,\"Y\":-175,\"t\":1,\"prefab\":8,\"id\":14,\"X\":-85},\"15\":{\"rCP\":10,\"Y\":25,\"t\":1,\"prefab\":8,\"id\":15,\"X\":55},\"16\":{\"rCP\":9,\"Y\":-175,\"t\":2,\"prefab\":8,\"id\":16,\"X\":55},\"17\":{\"rCP\":2,\"Y\":25,\"t\":2,\"prefab\":8,\"id\":17,\"X\":-85},\"18\":{\"Y\":-195,\"t\":17,\"prefab\":2,\"id\":18,\"X\":165},\"19\":{\"rCP\":3,\"Y\":-40,\"t\":3,\"prefab\":8,\"id\":19,\"X\":-255},\"20\":{\"rCP\":10,\"Y\":-35,\"t\":4,\"prefab\":8,\"id\":20,\"X\":225},\"21\":{\"rCP\":7,\"Y\":-110,\"t\":4,\"prefab\":8,\"id\":21,\"X\":-255},\"22\":{\"Y\":-75,\"t\":17,\"prefab\":3,\"id\":22,\"X\":185},\"23\":{\"Y\":-65,\"t\":17,\"prefab\":3,\"id\":23,\"X\":-85},\"24\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":24,\"X\":185},\"25\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":25,\"X\":85},\"26\":{\"Y\":-55,\"t\":17,\"prefab\":3,\"id\":26,\"X\":185},\"27\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":27,\"X\":125},\"28\":{\"Y\":-35,\"t\":17,\"prefab\":3,\"id\":28,\"X\":185},\"29\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":29,\"X\":105},\"30\":{\"Y\":-45,\"t\":17,\"prefab\":3,\"id\":30,\"X\":-85},\"31\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":31,\"X\":145},\"32\":{\"Y\":-25,\"t\":17,\"prefab\":3,\"id\":32,\"X\":-85},\"33\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":33,\"X\":165},\"34\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":34,\"X\":65},\"35\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":35,\"X\":145},\"36\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":36,\"X\":165},\"37\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":37,\"X\":125},\"38\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":38,\"X\":-185},\"39\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":39,\"X\":65},\"40\":{\"Y\":-85,\"t\":17,\"prefab\":3,\"id\":40,\"X\":65},\"41\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":41,\"X\":85},\"42\":{\"Y\":-65,\"t\":17,\"prefab\":3,\"id\":42,\"X\":65},\"43\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":43,\"X\":105},\"44\":{\"Y\":-45,\"t\":17,\"prefab\":3,\"id\":44,\"X\":65},\"45\":{\"Y\":-85,\"t\":17,\"prefab\":3,\"id\":45,\"X\":-185},\"46\":{\"Y\":-25,\"t\":17,\"prefab\":3,\"id\":46,\"X\":65},\"47\":{\"Y\":-45,\"t\":17,\"prefab\":3,\"id\":47,\"X\":-185},\"48\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":48,\"X\":-145},\"49\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":49,\"X\":-165},\"50\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":50,\"X\":-105},\"51\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":51,\"X\":-125},\"52\":{\"Y\":-85,\"t\":17,\"prefab\":3,\"id\":52,\"X\":-85},\"53\":{\"Y\":-65,\"t\":17,\"prefab\":3,\"id\":53,\"X\":-185},\"54\":{\"Y\":-25,\"t\":17,\"prefab\":3,\"id\":54,\"X\":-185},\"55\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":55,\"X\":-165},\"56\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":56,\"X\":-105},\"57\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":57,\"X\":-145},\"58\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":58,\"X\":-125},\"59\":{\"Y\":-15,\"t\":17,\"prefab\":3,\"id\":59,\"X\":185},\"60\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":60,\"X\":-85},\"61\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":61,\"X\":185},\"62\":{\"Y\":-195,\"t\":17,\"prefab\":2,\"id\":62,\"X\":185},\"63\":{\"Y\":-185,\"t\":17,\"prefab\":2,\"id\":63,\"X\":-115},\"64\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":64,\"X\":165},\"65\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":65,\"X\":145},\"66\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":66,\"X\":125},\"67\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":67,\"X\":105},\"68\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":68,\"X\":85},\"69\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":69,\"X\":65},\"70\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":70,\"X\":45},\"71\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":71,\"X\":25},\"72\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":72,\"X\":5},\"73\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":73,\"X\":-15},\"74\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":74,\"X\":-35},\"75\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":75,\"X\":-55},\"76\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":76,\"X\":-75},\"77\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":77,\"X\":-95},\"78\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":78,\"X\":-115},\"79\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":79,\"X\":-135},\"80\":{\"Y\":85,\"t\":17,\"prefab\":2,\"id\":80,\"X\":-155},\"81\":{\"Y\":15,\"t\":17,\"prefab\":3,\"id\":81,\"X\":-185},\"82\":{\"Y\":35,\"t\":17,\"prefab\":2,\"id\":82,\"X\":-185},\"83\":{\"Y\":55,\"t\":17,\"prefab\":2,\"id\":83,\"X\":-185},\"84\":{\"Y\":75,\"t\":17,\"prefab\":2,\"id\":84,\"X\":-175},\"85\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":85,\"X\":185},\"86\":{\"Y\":75,\"t\":17,\"prefab\":2,\"id\":86,\"X\":195},\"87\":{\"Y\":55,\"t\":17,\"prefab\":2,\"id\":87,\"X\":195},\"88\":{\"Y\":35,\"t\":17,\"prefab\":2,\"id\":88,\"X\":205},\"89\":{\"Y\":15,\"t\":17,\"prefab\":3,\"id\":89,\"X\":205},\"90\":{\"Y\":-115,\"t\":17,\"prefab\":3,\"id\":90,\"X\":-175},\"91\":{\"Y\":-135,\"t\":17,\"prefab\":2,\"id\":91,\"X\":-175},\"92\":{\"Y\":-155,\"t\":17,\"prefab\":2,\"id\":92,\"X\":-175},\"93\":{\"Y\":-175,\"t\":17,\"prefab\":2,\"id\":93,\"X\":-175},\"94\":{\"Y\":-185,\"t\":17,\"prefab\":2,\"id\":94,\"X\":-155},\"95\":{\"Y\":-185,\"t\":17,\"prefab\":2,\"id\":95,\"X\":-135},\"96\":{\"Y\":-195,\"t\":17,\"prefab\":2,\"id\":96,\"X\":145},\"97\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":97,\"X\":-95},\"98\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":98,\"X\":-75},\"99\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":99,\"X\":-55},\"100\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":100,\"X\":-35},\"101\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":101,\"X\":-15},\"102\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":102,\"X\":5},\"103\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":103,\"X\":25},\"104\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":104,\"X\":45},\"105\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":105,\"X\":65},\"106\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":106,\"X\":85},\"107\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":107,\"X\":105},\"108\":{\"Y\":-115,\"t\":17,\"prefab\":3,\"id\":108,\"X\":195},\"110\":{\"Y\":-135,\"t\":17,\"prefab\":2,\"id\":110,\"X\":195},\"111\":{\"Y\":-155,\"t\":17,\"prefab\":2,\"id\":111,\"X\":195},\"112\":{\"Y\":-175,\"t\":17,\"prefab\":2,\"id\":112,\"X\":195},\"113\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":113,\"X\":125},\"114\":{\"rCP\":6,\"Y\":-105,\"t\":3,\"prefab\":8,\"id\":114,\"X\":225}}")), new Kit(JSON.parse("{\"0\":{\"Y\":-85,\"t\":112,\"id\":0,\"X\":-145},\"1\":{\"Y\":-315,\"t\":21,\"prefab\":6,\"id\":1,\"X\":-215},\"2\":{\"Y\":45,\"t\":21,\"prefab\":6,\"id\":2,\"X\":145},\"3\":{\"Y\":-155,\"t\":21,\"prefab\":6,\"id\":3,\"X\":-375},\"4\":{\"Y\":205,\"t\":21,\"prefab\":6,\"id\":4,\"X\":-15},\"5\":{\"Y\":-155,\"t\":20,\"prefab\":6,\"id\":5,\"X\":-85},\"6\":{\"Y\":45,\"t\":20,\"prefab\":6,\"id\":6,\"X\":-145},\"7\":{\"Y\":-155,\"t\":20,\"prefab\":6,\"id\":7,\"X\":-215},\"8\":{\"Y\":45,\"t\":20,\"prefab\":6,\"id\":8,\"X\":-15},\"9\":{\"Y\":115,\"t\":25,\"id\":9,\"X\":55},\"10\":{\"Y\":-225,\"t\":25,\"id\":10,\"X\":-285},\"11\":{\"Y\":-95,\"t\":23,\"id\":11,\"X\":-15},\"12\":{\"Y\":-15,\"t\":23,\"id\":12,\"X\":-215},\"13\":{\"Y\":135,\"t\":15,\"prefab\":3,\"id\":13,\"X\":-195},\"14\":{\"Y\":-345,\"t\":13,\"prefab\":3,\"id\":14,\"X\":-405},\"15\":{\"Y\":205,\"t\":13,\"prefab\":3,\"id\":15,\"X\":145},\"16\":{\"Y\":-285,\"t\":16,\"id\":16,\"X\":-125},\"17\":{\"Y\":-95,\"t\":5,\"prefab\":3,\"id\":17,\"X\":75},\"19\":{\"rCP\":14,\"Y\":-315,\"t\":1,\"prefab\":8,\"id\":19,\"X\":-285},\"20\":{\"rCP\":13,\"Y\":115,\"t\":1,\"prefab\":8,\"id\":20,\"X\":-15},\"21\":{\"rCP\":1,\"Y\":-225,\"t\":2,\"prefab\":8,\"id\":21,\"X\":-215},\"22\":{\"rCP\":17,\"Y\":115,\"t\":2,\"prefab\":8,\"id\":22,\"X\":145},\"23\":{\"rCP\":10,\"Y\":-155,\"t\":3,\"prefab\":8,\"id\":23,\"X\":-285},\"24\":{\"rCP\":12,\"Y\":205,\"t\":3,\"prefab\":8,\"id\":24,\"X\":55},\"25\":{\"rCP\":9,\"Y\":-225,\"t\":4,\"prefab\":8,\"id\":25,\"X\":-375},\"26\":{\"rCP\":15,\"Y\":45,\"t\":4,\"prefab\":8,\"id\":26,\"X\":55},\"27\":{\"Y\":-185,\"t\":17,\"prefab\":4,\"id\":27,\"X\":-305},\"28\":{\"Y\":-145,\"t\":17,\"prefab\":4,\"id\":28,\"X\":-305},\"29\":{\"Y\":-165,\"t\":17,\"prefab\":4,\"id\":29,\"X\":-305},\"30\":{\"Y\":-125,\"t\":17,\"prefab\":4,\"id\":30,\"X\":-305},\"31\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":31,\"X\":-305},\"32\":{\"Y\":-205,\"t\":17,\"prefab\":4,\"id\":32,\"X\":-305},\"33\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":33,\"X\":-305},\"34\":{\"Y\":-225,\"t\":17,\"prefab\":4,\"id\":34,\"X\":-305},\"35\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":35,\"X\":-285},\"36\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":36,\"X\":-205},\"37\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":37,\"X\":-265},\"38\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":38,\"X\":-185},\"39\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":39,\"X\":-245},\"40\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":40,\"X\":-165},\"41\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":41,\"X\":-225},\"42\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":42,\"X\":-145},\"43\":{\"Y\":-225,\"t\":17,\"prefab\":4,\"id\":43,\"X\":-145},\"44\":{\"Y\":-205,\"t\":17,\"prefab\":4,\"id\":44,\"X\":-145},\"45\":{\"Y\":-185,\"t\":17,\"prefab\":4,\"id\":45,\"X\":-145},\"46\":{\"Y\":-165,\"t\":17,\"prefab\":4,\"id\":46,\"X\":-145},\"47\":{\"Y\":-145,\"t\":17,\"prefab\":4,\"id\":47,\"X\":-145},\"48\":{\"Y\":-125,\"t\":17,\"prefab\":4,\"id\":48,\"X\":-145},\"49\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":49,\"X\":-285},\"50\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":50,\"X\":-145},\"51\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":51,\"X\":-265},\"52\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":52,\"X\":-245},\"53\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":53,\"X\":-225},\"54\":{\"Y\":-65,\"t\":17,\"prefab\":4,\"id\":54,\"X\":-165},\"55\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":55,\"X\":-205},\"56\":{\"Y\":-45,\"t\":17,\"prefab\":4,\"id\":56,\"X\":-165},\"57\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":57,\"X\":-165},\"58\":{\"Y\":-35,\"t\":17,\"prefab\":4,\"id\":58,\"X\":-215},\"59\":{\"Y\":-35,\"t\":17,\"prefab\":4,\"id\":59,\"X\":-195},\"60\":{\"Y\":-35,\"t\":17,\"prefab\":4,\"id\":60,\"X\":-235},\"61\":{\"Y\":-15,\"t\":17,\"prefab\":4,\"id\":61,\"X\":-235},\"62\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":62,\"X\":-235},\"63\":{\"Y\":5,\"t\":17,\"prefab\":4,\"id\":63,\"X\":-235},\"64\":{\"Y\":55,\"t\":17,\"prefab\":4,\"id\":64,\"X\":-215},\"65\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":65,\"X\":-235},\"66\":{\"Y\":55,\"t\":17,\"prefab\":4,\"id\":66,\"X\":-195},\"67\":{\"Y\":75,\"t\":24,\"id\":67,\"X\":-165},\"68\":{\"Y\":205,\"t\":24,\"id\":68,\"X\":125},\"69\":{\"Y\":55,\"t\":17,\"prefab\":4,\"id\":69,\"X\":-175},\"70\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":70,\"X\":-125},\"71\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":71,\"X\":-105},\"72\":{\"Y\":-155,\"t\":17,\"prefab\":4,\"id\":72,\"X\":-105},\"73\":{\"Y\":-125,\"t\":24,\"id\":73,\"X\":-105},\"74\":{\"Y\":-135,\"t\":24,\"id\":74,\"X\":-125},\"75\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":75,\"X\":-105},\"76\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":76,\"X\":-85},\"77\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":77,\"X\":-65},\"78\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":78,\"X\":-45},\"79\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":79,\"X\":-25},\"80\":{\"Y\":-165,\"t\":17,\"prefab\":4,\"id\":80,\"X\":-5},\"81\":{\"Y\":-135,\"t\":24,\"id\":81,\"X\":-15},\"82\":{\"Y\":-245,\"t\":24,\"id\":82,\"X\":-305},\"83\":{\"Y\":-265,\"t\":24,\"id\":83,\"X\":-305},\"84\":{\"Y\":-245,\"t\":24,\"id\":84,\"X\":-325},\"85\":{\"Y\":-115,\"t\":17,\"prefab\":4,\"id\":85,\"X\":-5},\"86\":{\"Y\":-115,\"t\":17,\"prefab\":4,\"id\":86,\"X\":15},\"87\":{\"Y\":-115,\"t\":17,\"prefab\":4,\"id\":87,\"X\":35},\"88\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":88,\"X\":55},\"89\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":89,\"X\":55},\"90\":{\"Y\":-65,\"t\":17,\"prefab\":4,\"id\":90,\"X\":55},\"91\":{\"Y\":-45,\"t\":17,\"prefab\":4,\"id\":91,\"X\":55},\"92\":{\"Y\":-25,\"t\":17,\"prefab\":4,\"id\":92,\"X\":55},\"93\":{\"Y\":-25,\"t\":17,\"prefab\":4,\"id\":93,\"X\":35},\"94\":{\"Y\":-25,\"t\":17,\"prefab\":4,\"id\":94,\"X\":15},\"95\":{\"Y\":-15,\"t\":17,\"prefab\":4,\"id\":95,\"X\":-15},\"96\":{\"Y\":5,\"t\":17,\"prefab\":4,\"id\":96,\"X\":-15},\"97\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":97,\"X\":-15},\"98\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":98,\"X\":-35},\"99\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":99,\"X\":-55},\"100\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":100,\"X\":-75},\"101\":{\"Y\":95,\"t\":17,\"prefab\":4,\"id\":101,\"X\":-75},\"102\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":102,\"X\":-75},\"103\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":103,\"X\":-95},\"104\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":104,\"X\":-115},\"105\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":105,\"X\":-135},\"106\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":106,\"X\":-155},\"107\":{\"Y\":105,\"t\":17,\"prefab\":4,\"id\":107,\"X\":-175},\"108\":{\"Y\":65,\"t\":17,\"prefab\":4,\"id\":108,\"X\":-35},\"109\":{\"Y\":85,\"t\":17,\"prefab\":4,\"id\":109,\"X\":-35},\"110\":{\"Y\":105,\"t\":17,\"prefab\":4,\"id\":110,\"X\":-35},\"111\":{\"Y\":125,\"t\":17,\"prefab\":4,\"id\":111,\"X\":-35},\"112\":{\"Y\":145,\"t\":17,\"prefab\":4,\"id\":112,\"X\":-35},\"113\":{\"Y\":165,\"t\":17,\"prefab\":4,\"id\":113,\"X\":-35},\"114\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":114,\"X\":-35},\"115\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":115,\"X\":-15},\"116\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":116,\"X\":5},\"117\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":117,\"X\":25},\"118\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":118,\"X\":45},\"119\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":119,\"X\":65},\"120\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":120,\"X\":85},\"121\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":121,\"X\":105},\"122\":{\"Y\":165,\"t\":17,\"prefab\":4,\"id\":122,\"X\":125},\"123\":{\"Y\":145,\"t\":17,\"prefab\":4,\"id\":123,\"X\":125},\"124\":{\"Y\":125,\"t\":17,\"prefab\":4,\"id\":124,\"X\":125},\"125\":{\"Y\":105,\"t\":17,\"prefab\":4,\"id\":125,\"X\":125},\"126\":{\"Y\":85,\"t\":17,\"prefab\":4,\"id\":126,\"X\":125},\"127\":{\"Y\":65,\"t\":17,\"prefab\":4,\"id\":127,\"X\":125},\"128\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":128,\"X\":125},\"129\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":129,\"X\":125},\"130\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":130,\"X\":105},\"131\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":131,\"X\":85},\"132\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":132,\"X\":65},\"133\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":133,\"X\":45},\"134\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":134,\"X\":25},\"135\":{\"Y\":-55,\"t\":24,\"id\":135,\"X\":-185},\"136\":{\"Y\":-75,\"t\":24,\"id\":136,\"X\":-185},\"137\":{\"Y\":-55,\"t\":24,\"id\":137,\"X\":-205},\"138\":{\"Y\":-145,\"t\":24,\"id\":138,\"X\":5},\"139\":{\"Y\":-5,\"t\":24,\"id\":139,\"X\":5},\"140\":{\"Y\":-5,\"t\":24,\"id\":140,\"X\":25},\"141\":{\"Y\":15,\"t\":24,\"id\":141,\"X\":5},\"142\":{\"Y\":185,\"t\":24,\"id\":142,\"X\":125},\"143\":{\"Y\":185,\"t\":24,\"id\":143,\"X\":145},\"144\":{\"Y\":85,\"t\":24,\"id\":144,\"X\":-185},\"145\":{\"Y\":65,\"t\":24,\"id\":145,\"X\":-75},\"146\":{\"Y\":75,\"t\":24,\"id\":146,\"X\":-55},\"147\":{\"Y\":75,\"t\":22,\"id\":147,\"X\":-285},\"148\":{\"Y\":-205,\"t\":22,\"id\":148,\"X\":25}}")), new Kit(JSON.parse("{\"0\":{\"Y\":-50,\"t\":112,\"fort\":4,\"id\":0,\"X\":0},\"2\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":2,\"X\":130},\"3\":{\"Y\":40,\"t\":17,\"prefab\":5,\"id\":3,\"X\":130},\"4\":{\"Y\":20,\"t\":17,\"prefab\":5,\"id\":4,\"X\":130},\"5\":{\"Y\":0,\"t\":17,\"prefab\":5,\"id\":5,\"X\":130},\"6\":{\"Y\":-20,\"t\":17,\"prefab\":5,\"id\":6,\"X\":130},\"7\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":7,\"X\":150},\"8\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":8,\"X\":170},\"9\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":9,\"X\":190},\"10\":{\"Y\":80,\"t\":115,\"prefab\":5,\"fort\":3,\"id\":10,\"X\":150},\"12\":{\"Y\":100,\"t\":17,\"prefab\":5,\"id\":12,\"X\":130},\"13\":{\"Y\":120,\"t\":17,\"prefab\":5,\"id\":13,\"X\":130},\"14\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":14,\"X\":210},\"15\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":15,\"X\":130},\"16\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":16,\"X\":230},\"17\":{\"Y\":80,\"t\":17,\"prefab\":5,\"id\":17,\"X\":230},\"18\":{\"Y\":100,\"t\":17,\"prefab\":5,\"id\":18,\"X\":230},\"19\":{\"Y\":120,\"t\":17,\"prefab\":5,\"id\":19,\"X\":230},\"20\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":20,\"X\":230},\"21\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":21,\"X\":290},\"22\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":22,\"X\":210},\"23\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":23,\"X\":190},\"24\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":24,\"X\":170},\"25\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":25,\"X\":150},\"26\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":26,\"X\":310},\"27\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":27,\"X\":-20},\"28\":{\"Y\":-30,\"t\":17,\"prefab\":5,\"id\":28,\"X\":-20},\"29\":{\"Y\":-10,\"t\":17,\"prefab\":5,\"id\":29,\"X\":-20},\"30\":{\"Y\":10,\"t\":17,\"prefab\":5,\"id\":30,\"X\":-20},\"31\":{\"Y\":30,\"t\":17,\"prefab\":5,\"id\":31,\"X\":-20},\"32\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":32,\"X\":-40},\"33\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":33,\"X\":-60},\"34\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":34,\"X\":-80},\"35\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":35,\"X\":-100},\"36\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":36,\"X\":-120},\"37\":{\"Y\":-70,\"t\":17,\"prefab\":5,\"id\":37,\"X\":-120},\"38\":{\"Y\":-90,\"t\":17,\"prefab\":5,\"id\":38,\"X\":-120},\"39\":{\"Y\":-110,\"t\":17,\"prefab\":5,\"id\":39,\"X\":-120},\"40\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":40,\"X\":-120},\"41\":{\"Y\":-120,\"t\":115,\"prefab\":5,\"fort\":3,\"id\":41,\"X\":-100},\"42\":{\"Y\":-20,\"t\":17,\"prefab\":5,\"id\":42,\"X\":-200},\"43\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":43,\"X\":-100},\"44\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":44,\"X\":-80},\"45\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":45,\"X\":-60},\"46\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":46,\"X\":-40},\"47\":{\"Y\":0,\"t\":17,\"prefab\":5,\"id\":47,\"X\":-200},\"48\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":48,\"X\":-20},\"49\":{\"Y\":-110,\"t\":17,\"prefab\":5,\"id\":49,\"X\":-20},\"50\":{\"Y\":-90,\"t\":17,\"prefab\":5,\"id\":50,\"X\":-20},\"51\":{\"Y\":-70,\"t\":117,\"id\":51,\"X\":-20},\"52\":{\"Y\":80,\"t\":23,\"prefab\":3,\"fort\":2,\"id\":52,\"X\":60},\"53\":{\"Y\":-120,\"t\":118,\"prefab\":3,\"fort\":2,\"id\":53,\"X\":0},\"54\":{\"Y\":100,\"t\":17,\"prefab\":5,\"id\":54,\"X\":40},\"55\":{\"Y\":80,\"t\":24,\"id\":55,\"X\":40},\"56\":{\"Y\":-70,\"t\":24,\"id\":56,\"X\":70},\"57\":{\"Y\":80,\"t\":117,\"id\":57,\"X\":20},\"58\":{\"Y\":-70,\"t\":117,\"id\":58,\"X\":90},\"59\":{\"Y\":60,\"t\":15,\"prefab\":6,\"id\":59,\"X\":-430},\"60\":{\"Y\":-130,\"t\":22,\"prefab\":3,\"id\":60,\"X\":130},\"61\":{\"Y\":70,\"t\":22,\"prefab\":3,\"id\":61,\"X\":-90},\"62\":{\"Y\":-30,\"t\":25,\"prefab\":3,\"fort\":2,\"id\":62,\"X\":-90},\"63\":{\"Y\":50,\"t\":117,\"id\":63,\"X\":-20},\"64\":{\"Y\":40,\"t\":24,\"id\":64,\"X\":-40},\"65\":{\"Y\":40,\"t\":24,\"id\":65,\"X\":-60},\"66\":{\"Y\":-40,\"t\":24,\"id\":66,\"X\":130},\"67\":{\"Y\":-30,\"t\":24,\"id\":67,\"X\":150},\"69\":{\"Y\":-30,\"t\":24,\"id\":69,\"X\":170},\"70\":{\"Y\":-90,\"t\":17,\"prefab\":5,\"id\":70,\"X\":70},\"71\":{\"Y\":-110,\"t\":17,\"prefab\":5,\"id\":71,\"X\":70},\"72\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":72,\"X\":70},\"73\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":73,\"X\":70},\"74\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":74,\"X\":50},\"75\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":75,\"X\":30},\"76\":{\"Y\":-170,\"t\":17,\"prefab\":5,\"id\":76,\"X\":70},\"77\":{\"Y\":-190,\"t\":17,\"prefab\":5,\"id\":77,\"X\":70},\"78\":{\"Y\":-210,\"t\":17,\"prefab\":5,\"id\":78,\"X\":70},\"79\":{\"Y\":-220,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":79,\"X\":110},\"80\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":80,\"X\":110},\"81\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":81,\"X\":130},\"82\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":82,\"X\":150},\"83\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":83,\"X\":110},\"84\":{\"Y\":120,\"t\":17,\"prefab\":5,\"id\":84,\"X\":40},\"85\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":85,\"X\":40},\"86\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":86,\"X\":60},\"87\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":87,\"X\":80},\"88\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":88,\"X\":40},\"89\":{\"Y\":180,\"t\":17,\"prefab\":5,\"id\":89,\"X\":40},\"90\":{\"Y\":200,\"t\":17,\"prefab\":5,\"id\":90,\"X\":40},\"91\":{\"Y\":220,\"t\":17,\"prefab\":5,\"id\":91,\"X\":40},\"92\":{\"Y\":-210,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":92,\"X\":0},\"93\":{\"Y\":170,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":93,\"X\":60},\"94\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":94,\"X\":250},\"95\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":95,\"X\":270},\"96\":{\"Y\":20,\"t\":17,\"prefab\":5,\"id\":96,\"X\":220},\"97\":{\"Y\":40,\"t\":24,\"id\":97,\"X\":220},\"98\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":98,\"X\":-140},\"99\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":99,\"X\":-160},\"100\":{\"Y\":-10,\"t\":17,\"prefab\":5,\"id\":100,\"X\":-110},\"101\":{\"Y\":-30,\"t\":24,\"id\":101,\"X\":-110},\"102\":{\"Y\":0,\"t\":17,\"prefab\":5,\"id\":102,\"X\":220},\"103\":{\"Y\":-20,\"t\":17,\"prefab\":5,\"id\":103,\"X\":220},\"104\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":104,\"X\":220},\"105\":{\"Y\":-110,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":105,\"X\":220},\"106\":{\"Y\":70,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":106,\"X\":-160},\"107\":{\"Y\":10,\"t\":17,\"prefab\":5,\"id\":107,\"X\":-110},\"108\":{\"Y\":30,\"t\":17,\"prefab\":5,\"id\":108,\"X\":-110},\"109\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":109,\"X\":-110},\"110\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":110,\"X\":-130},\"111\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":111,\"X\":-150},\"112\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":112,\"X\":-170},\"113\":{\"Y\":-20,\"t\":23,\"prefab\":3,\"fort\":2,\"id\":113,\"X\":-180},\"114\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":114,\"X\":240},\"115\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":115,\"X\":260},\"116\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":116,\"X\":280},\"117\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":117,\"X\":0},\"118\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":118,\"X\":0},\"119\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":119,\"X\":-20},\"120\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":120,\"X\":-40},\"121\":{\"Y\":-120,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":121,\"X\":-190},\"122\":{\"Y\":-140,\"t\":24,\"id\":122,\"X\":0},\"123\":{\"Y\":-150,\"t\":24,\"id\":123,\"X\":-20},\"124\":{\"Y\":-20,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":124,\"X\":240},\"125\":{\"Y\":180,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":125,\"X\":-30},\"126\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":126,\"X\":300},\"127\":{\"Y\":-60,\"t\":17,\"prefab\":5,\"id\":127,\"X\":290},\"128\":{\"Y\":-80,\"t\":17,\"prefab\":5,\"id\":128,\"X\":290},\"129\":{\"Y\":70,\"t\":17,\"prefab\":5,\"id\":129,\"X\":-180},\"130\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":130,\"X\":-190},\"131\":{\"Y\":160,\"t\":24,\"id\":131,\"X\":20},\"132\":{\"Y\":140,\"t\":24,\"id\":132,\"X\":20},\"133\":{\"Y\":-150,\"t\":24,\"id\":133,\"X\":90},\"134\":{\"Y\":-130,\"t\":24,\"id\":134,\"X\":90},\"135\":{\"Y\":10,\"t\":17,\"prefab\":5,\"id\":135,\"X\":310},\"136\":{\"Y\":30,\"t\":17,\"prefab\":5,\"id\":136,\"X\":310},\"137\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":137,\"X\":-180},\"138\":{\"Y\":90,\"t\":17,\"prefab\":5,\"id\":138,\"X\":-180},\"139\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":139,\"X\":-200},\"140\":{\"Y\":20,\"t\":24,\"id\":140,\"X\":-200},\"143\":{\"Y\":140,\"t\":24,\"id\":143,\"X\":-110},\"144\":{\"Y\":-150,\"t\":24,\"id\":144,\"X\":190},\"145\":{\"Y\":-130,\"t\":24,\"id\":145,\"X\":220},\"146\":{\"Y\":80,\"t\":24,\"id\":146,\"X\":0},\"147\":{\"Y\":100,\"t\":24,\"id\":147,\"X\":0},\"148\":{\"Y\":-70,\"t\":24,\"id\":148,\"X\":110},\"149\":{\"Y\":-30,\"t\":24,\"id\":149,\"X\":190},\"150\":{\"Y\":150,\"t\":24,\"id\":150,\"X\":100},\"151\":{\"Y\":160,\"t\":24,\"id\":151,\"X\":-90},\"152\":{\"Y\":-10,\"t\":25,\"prefab\":3,\"fort\":2,\"id\":152,\"X\":150},\"153\":{\"Y\":-360,\"t\":9,\"id\":153,\"X\":-110},\"154\":{\"Y\":-370,\"t\":13,\"prefab\":3,\"id\":154,\"X\":30},\"155\":{\"rCP\":9,\"Y\":-180,\"t\":1,\"prefab\":8,\"id\":155,\"X\":250},\"156\":{\"rCP\":8,\"Y\":-220,\"t\":2,\"prefab\":8,\"id\":156,\"X\":180},\"157\":{\"rCP\":7,\"Y\":-335,\"t\":3,\"prefab\":8,\"id\":157,\"X\":225},\"158\":{\"rCP\":12,\"Y\":35,\"t\":4,\"prefab\":8,\"id\":158,\"X\":365},\"159\":{\"Y\":290,\"t\":13,\"prefab\":3,\"id\":159,\"X\":55},\"160\":{\"Y\":270,\"t\":5,\"prefab\":4,\"id\":160,\"X\":230},\"161\":{\"rCP\":7,\"Y\":80,\"t\":1,\"prefab\":8,\"id\":161,\"X\":-250},\"162\":{\"rCP\":1,\"Y\":140,\"t\":2,\"prefab\":8,\"id\":162,\"X\":-180},\"163\":{\"rCP\":9,\"Y\":300,\"t\":3,\"prefab\":8,\"id\":163,\"X\":-90},\"164\":{\"rCP\":8,\"Y\":255,\"t\":4,\"prefab\":8,\"id\":164,\"X\":-225},\"165\":{\"Y\":-125,\"t\":16,\"id\":165,\"X\":355},\"167\":{\"Y\":-110,\"t\":10,\"id\":167,\"X\":-400},\"168\":{\"rCP\":8,\"Y\":-150,\"t\":1,\"prefab\":8,\"id\":168,\"X\":-260},\"169\":{\"rCP\":16,\"Y\":-190,\"t\":2,\"prefab\":8,\"id\":169,\"X\":-190},\"170\":{\"rCP\":4,\"Y\":-260,\"t\":3,\"prefab\":8,\"id\":170,\"X\":-350},\"171\":{\"rCP\":3,\"Y\":-340,\"t\":4,\"prefab\":8,\"id\":171,\"X\":-240},\"172\":{\"rCP\":13,\"Y\":170,\"t\":2,\"prefab\":8,\"id\":172,\"X\":180},\"173\":{\"rCP\":7,\"Y\":110,\"t\":1,\"prefab\":8,\"id\":173,\"X\":250},\"174\":{\"rCP\":14,\"Y\":155,\"t\":3,\"prefab\":8,\"id\":174,\"X\":350},\"175\":{\"rCP\":6,\"Y\":-255,\"t\":4,\"prefab\":8,\"id\":175,\"X\":345},\"176\":{\"Y\":80,\"t\":117,\"id\":176,\"X\":130}}"))], Kit);
        super.$ctor();
        let _loc1_: any[] = [];
        let _loc2_: int = 1;
        if (GLOBAL.INFERNO_ONLY) {
            // Draw straight away with whatever is known, then again once the kit file has arrived.
            this.ioRenderPage();
            InfernoKits.load(as3.bind(this, this.ioRenderPage));
        }
        while (_loc2_ < 4 && !GLOBAL.INFERNO_ONLY) {
            ImageCache.GetImageWithCallBack("ui/prefab-" + (_loc2_ + 1) + ".v5.jpg", as3.bind(this, this.ThumbnailLoaded), true, 1, "", [_loc2_]);
            this["img" + _loc2_].addEventListener(MouseEvent.CLICK, this.Enlarge(_loc2_));
            this["img" + _loc2_].buttonMode = true;
            _loc1_ = as3.cast(this.GetBuildings(_loc2_).costs, Array);
            this["c" + _loc2_].htmlText = "<b>" + GLOBAL.FormatNumber(Number(_loc1_[0].Get())) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[0])) + "<br>" + GLOBAL.FormatNumber(Number(_loc1_[1].Get())) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[1])) + "<br>" + GLOBAL.FormatNumber(Number(_loc1_[2].Get())) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[2])) + "</b>";
            this["b" + _loc2_].SetupKey("btn_useresources");
            this["b" + _loc2_].addEventListener(MouseEvent.CLICK, this.PreSelect(_loc2_));
            this["b" + _loc2_ + "s"].Setup(KEYS.Get("btn_useshiny", { "v1": _loc1_[3].Get() }));
            this["b" + _loc2_ + "s"].addEventListener(MouseEvent.CLICK, this.PreBuyOutright(_loc2_, _loc1_[3].Get() | 0));
            this["b" + _loc2_ + "s"].Highlight = true;
            this.tSelect.htmlText = "<b>" + KEYS.Get("str_selectsk") + "</b>";
            this.t1.htmlText = "<b>" + KEYS.Get("str_regularkit") + "</b>";
            this.t2.htmlText = "<b>" + KEYS.Get("str_megakit") + "</b>";
            this.t3.htmlText = "<b>" + KEYS.Get("str_ultrakit") + "</b>";
            _loc2_++;
        }
        if (!GLOBAL.INFERNO_ONLY) {
            // The stock text describes the three overworld kits. Inferno-only builds count the real
            // contents of whichever kits are on the page instead (ioRenderPage).
            this.tCol1.htmlText = KEYS.Get("popup_prefab_col1");
            this.tCol2.htmlText = KEYS.Get("popup_prefab_col2");
            this.tCol3.htmlText = KEYS.Get("popup_prefab_col3");
            this.tCol4.htmlText = KEYS.Get("popup_prefab_col4");
        }
        this.tShiny.htmlText = "<b>" + GLOBAL.FormatNumber(BASE._credits.Get()) + " " + KEYS.Get("#r_shiny#") + "</b>";
        this.tInstantNotice.htmlText = GLOBAL.INFERNO_ONLY ? KEYS.Get("io_t3k_kit_instant") : KEYS.Get("popup_prefab_instantnotice");
        if (GLOBAL.INFERNO_ONLY) {
            // (24 October: bright blue on the window's brown was hard to read; the dark brown of its other words)
            this.tInstantNotice.textColor = 0x3A1E00;
        }
    }

    public static getShinyWorthFromResources(param1: number): uint {
        return (Math.sqrt(param1 / 2) * 0.75) >>> 0;
    }

    public static getResourceCostFromBuild(param1: any): number {
        let _loc3_: any = null;
        let _loc4_: uint = 0;
        let _loc5_: uint = 0;
        let _loc6_: any = undefined;
        let _loc7_: any = null;
        let _loc2_: uint = 0;
        for (_loc3_ of as3.values(param1)) {
            _loc4_ = _loc3_.t >>> 0;
            if (popup_prefab.isBuildingOfValidType(_loc4_)) {
                _loc5_ = _loc3_.l >>> 0;
                // (Inferno-only: the outposts' table, and a building or level it hasn't is left out: from the main yard
                // a kit's price threw here, and the kit window never opened)
                _loc6_ = GLOBAL.INFERNO_ONLY ? InfernoKits.props()[_loc4_ - 1] : GLOBAL._buildingProps[_loc4_ - 1];
                _loc7_ = _loc6_ && _loc6_.costs ? _loc6_.costs[_loc5_] : null;
                if (!_loc7_ && GLOBAL.INFERNO_ONLY) {
                    continue;
                }
                _loc2_ = (_loc2_ + _loc7_.r1.Get()) >>> 0;
                _loc2_ = (_loc2_ + _loc7_.r2.Get()) >>> 0;
                _loc2_ = (_loc2_ + _loc7_.r3.Get()) >>> 0;
                _loc2_ = (_loc2_ + _loc7_.r4.Get()) >>> 0;
            }
        }
        return _loc2_;
    }

    private static isBuildingOfValidType(param1: uint): boolean {
        return param1 != 121;
    }

    private ioListen(param1: any, param2: Function): void {
        param1.addEventListener(MouseEvent.CLICK, param2);
        this._ioListeners.push([param1, param2]);
    }

    /** Fills the three columns with the kits of the current page. Safe to call repeatedly. */
    private ioRenderPage(): void {
        let _loc1_: any[] = null;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: boolean = false;
        let _loc5_: any[] = null;
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        if (this._triggered) {
            return;
        }
        for (_loc1_ of as3.values(this._ioListeners)) {
            _loc1_[0].removeEventListener(MouseEvent.CLICK, _loc1_[1]);
        }
        this._ioListeners = [];
        ++this._ioToken;
        _loc6_ = InfernoKits.pageCount;
        if (this._ioPage >= _loc6_) {
            this._ioPage = 0;
        }
        _loc2_ = 1;
        while (_loc2_ < 4) {
            _loc3_ = (this._ioPage * InfernoKits.PER_PAGE + _loc2_) | 0;
            _loc4_ = InfernoKits.hasKit(_loc3_);
            if (this._ioThumbs[_loc2_]) {
                if (this._ioThumbs[_loc2_].parent) {
                    this._ioThumbs[_loc2_].parent.removeChild(this._ioThumbs[_loc2_]);
                }
                this._ioThumbs[_loc2_] = null;
            }
            this["img" + _loc2_].visible = _loc4_;
            this["img" + _loc2_].buttonMode = _loc4_;
            this["t" + _loc2_].visible = _loc4_;
            this["c" + _loc2_].visible = _loc4_;
            this["b" + _loc2_].visible = _loc4_;
            this["b" + _loc2_ + "s"].visible = _loc4_;
            // tCol1 holds the row labels; tCol2-4 sit under kit columns 1-3.
            this["tCol" + (_loc2_ + 1)].visible = _loc4_;
            if (_loc4_) {
                // (QoL #335: against what this outpost has built: green more, red less)
                // (QoL #334: for several outposts, not against the yard showing)
                this["tCol" + (_loc2_ + 1)].htmlText = InfernoKits.contentsText(this.GetBuildings(_loc3_).buildings, GLOBAL.INFERNO_ONLY && BASE.isOutpostOrInfernoOutpost && !this._ioBatch ? InfernoKits.builtHere() : null);
                _loc5_ = as3.cast(this.GetBuildings(_loc3_).costs, Array);
                if (InfernoKits.thumbPath(_loc3_)) {
                    ImageCache.GetImageWithCallBack(InfernoKits.thumbPath(_loc3_), as3.bind(this, this.ioThumbLoaded), true, 1, "", [_loc2_, this._ioToken]);
                } else if (InfernoKits.isPlayerSlot(_loc3_) && !InfernoKits.playerKit(_loc3_)) {
                    // Empty player slot: the picture is built into the game.
                    this.ioThumbLoaded("", new io_kit_empty(0, 0), [_loc2_, this._ioToken]);
                }
                this["t" + _loc2_].htmlText = "<b>" + InfernoKits.kitName(_loc3_) + "</b>";
                this.ioFitTitle(as3.cast(this["t" + _loc2_], TextField), InfernoKits.kitName(_loc3_));
                this["c" + _loc2_].htmlText = "<b>" + GLOBAL.FormatNumber(Number(_loc5_[0].Get())) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[0])) + "<br>" + GLOBAL.FormatNumber(Number(_loc5_[1].Get())) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[1])) + "<br>" + GLOBAL.FormatNumber(Number(_loc5_[2].Get())) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[2])) + "</b>";
                this["b" + _loc2_].SetupKey("btn_useresources");
                this["b" + _loc2_ + "s"].Setup(KEYS.Get("btn_useshiny", { "v1": _loc5_[3].Get() }));
                this["b" + _loc2_ + "s"].Highlight = true;
                this.ioListen(this["img" + _loc2_], this.Enlarge(_loc3_));
                this.ioListen(this["b" + _loc2_], this.PreSelect(_loc3_));
                this.ioListen(this["b" + _loc2_ + "s"], this.PreBuyOutright(_loc3_, _loc5_[3].Get() | 0));
                this.ioPlayerSlot(_loc2_, _loc3_);
                // (QoL #334: several outposts: resources only, the price asked for all of them first)
                if (this._ioBatch) {
                    this["b" + _loc2_ + "s"].visible = false;
                    this.ioHideSave(_loc2_);
                }
            } else {
                this.ioHideSave(_loc2_);
            }
            // (QoL #337: Rename and Delete over a saved player kit)
            InfernoKits.ioSlotTools(this, _loc2_, _loc4_ ? _loc3_ : 0, as3.bind(this, this.ioRenderPage));
            _loc2_++;
        }
        this.tCol1.htmlText = InfernoKits.rowLabels();
        this.ioTableRows(InfernoKits.rowCount);
        this.tSelect.htmlText = "<b>" + (this._ioBatch ? KEYS.Get("io_op3_batch_title", { "v1": this._ioBatch.length }) : KEYS.Get("str_selectsk")) + "</b>";
        this.ioPager(_loc6_);
    }

    /** (23 October) The pager's row, and the frame's first top and height (ioPager). */
    private _ioPager: Sprite;

    private _ioFrame0: any[];

    /** The pager row's height, inside the frame's top. */
    private static readonly IO_PAGER_H: int = 40;

    /**
     * Inferno-only (23 October, the user's: "change the box shape to include the buttons on top of it inside the box.
     * Also show Page x of 4 on it with Page 1 2 3 4 buttons"): Prev and Next sat over the window, outside its frame;
     * the frame is now taller at the top (frame.ioResize), and in that strip: Prev, "Page x of N", a button for each
     * page (the one shown lit), Next.
     */
    private ioPager(pages: int): void {
        let fr: any = this.mcFrame;
        if (fr && !this._ioFrame0) {
            this._ioFrame0 = [fr.y, fr.height];
        }
        if (this._ioPager && this._ioPager.parent) {
            this._ioPager.parent.removeChild(this._ioPager);
        }
        this._ioPager = null;
        // (the old Prev and Next over the window: gone; kept as fields for what still reads them)
        for (let old of [this._ioPrev, this._ioNext]) {
            if (old && old.parent) {
                old.parent.removeChild(old);
            }
        }
        this._ioPrev = this._ioNext = null;
        let y0: number = this._ioFrame0 ? Number(this._ioFrame0[0]) : -245;
        let h0: number = this._ioFrame0 ? Number(this._ioFrame0[1]) : 490;
        if (pages <= 1) {
            if (fr && fr.ioResize) {
                fr.ioResize(fr.width, h0, NaN, y0);
            }
            return;
        }
        const H: int = popup_prefab.IO_PAGER_H;
        if (fr && fr.ioResize) {
            fr.ioResize(fr.width, h0 + H, NaN, y0 - H);
        }
        let row: Sprite = new Sprite();
        row.name = "ioKitPager";
        this._ioPager = row;
        this.addChild(row);
        let items: DisplayObject[] = [];
        let prev: Button_CLIP = new Button_CLIP();
        prev.Setup(KEYS.Get("btn_prev"), false, 70, 26);
        prev.name = "ioKitPrev";
        prev.addEventListener(MouseEvent.CLICK, this.ioTurnPage(-1));
        items.push(prev);
        let label: TextField = new TextField();
        label.name = "ioKitPageText";
        label.selectable = false;
        label.mouseEnabled = false;
        let f: TextFormat = new TextFormat("Verdana", 12, 0x3A2412, true);
        f.align = "center";
        label.defaultTextFormat = f;
        label.width = 110;
        label.height = 20;
        label.text = KEYS.Get("io_t3k_kit_page", { "v1": this._ioPage + 1, "v2": pages });
        items.push(label);
        for (let i: int = 0; i < pages; i++) {
            let b: Button_CLIP = new Button_CLIP();
            b.Setup(String(i + 1), false, 34, 26);
            b.name = "ioKitPage" + (i + 1);
            b.Highlight = i == this._ioPage;
            let to: int = i;
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                this.ioGoPage(to);
            });
            items.push(b);
        }
        let next: Button_CLIP = new Button_CLIP();
        next.Setup(KEYS.Get("btn_next"), false, 70, 26);
        next.name = "ioKitNext";
        next.addEventListener(MouseEvent.CLICK, this.ioTurnPage(1));
        items.push(next);
        let total: number = 0;
        for (let it of items) {
            total += it.width;
        }
        total += 6 * (items.length - 1);
        let mid: number = fr ? fr.x + fr.width / 2 : 0;
        let x: number = mid - total / 2;
        for (let it of items) {
            it.x = Math.round(x);
            it.y = it instanceof TextField ? 4 : 0;
            row.addChild(it);
            x += it.width + 6;
        }
        row.y = Math.round(y0 - H + 12);
        this._ioPrev = prev;
        this._ioNext = next;
    }

    /** A page by its number (from 0). */
    public ioGoPage(page: int): void {
        let pages: int = InfernoKits.pageCount;
        if (page < 0 || page >= pages || page == this._ioPage) {
            return;
        }
        SOUNDS.Play("click1");
        this._ioPage = page;
        popup_prefab._ioLastPage = this._ioPage;
        this.ioRenderPage();
    }

    /**
     * Inferno-only: the table under the kits, drawn over the art's own (which has ten rows) for `rows` rows in
     * the same space (29 September: an eleventh, the Cinder Coil and Obsidian Mortar), white and beige in turn,
     * with the art's column lines; the four text columns' line spacing made to match.
     */
    private ioTableRows(rows: int): void {
        let i: int = 0;
        let h: number = popup_prefab.IO_TABLE_HEIGHT / rows;
        if (!this._ioTable) {
            this._ioTable = new Shape();
            this.addChildAt(this._ioTable, this.getChildIndex(this.t2));
        }
        let g: any = this._ioTable.graphics;
        g.clear();
        i = 0;
        while (i < rows) {
            g.beginFill(i % 2 == 0 ? 0xFFFFFF : 0xF3ECD5);
            g.drawRect(-285, popup_prefab.IO_TABLE_TOP + i * h, 570, h);
            g.endFill();
            i++;
        }
        g.lineStyle(1, 0xCCCCCC);
        i = 1;
        while (i < rows) {
            g.moveTo(-285, popup_prefab.IO_TABLE_TOP + i * h);
            g.lineTo(285, popup_prefab.IO_TABLE_TOP + i * h);
            i++;
        }
        g.lineStyle(1, 0x4D4D4D);
        g.drawRect(-285, popup_prefab.IO_TABLE_TOP, 570, popup_prefab.IO_TABLE_HEIGHT);
        for (const $value of as3.values([-135, 5, 145])) {
            let x: number = Number($value);
            g.moveTo(x, popup_prefab.IO_TABLE_TOP);
            g.lineTo(x, popup_prefab.IO_TABLE_TOP + popup_prefab.IO_TABLE_HEIGHT);
        }
        // the text: 11 pt Verdana is 13.2 high, the rest of a row is leading
        i = 1;
        while (i <= 4) {
            let t: TextField = as3.as(this["tCol" + i], TextField);
            let f: TextFormat = t.getTextFormat();
            f.leading = h - 13.2;
            t.setTextFormat(f);
            t.height = popup_prefab.IO_TABLE_HEIGHT + 4;
            i++;
        }
    }

    /**
     * Player kit columns: an empty slot offers only "Save this outpost here"; a filled one is bought like
     * any kit and can be replaced with the outpost that is open. Other columns hide the save button.
     */
    private ioPlayerSlot(param1: int, param2: int): void {
        let kitID: int = 0;
        let filled: boolean = false;
        let column: int = param1;
        kitID = param2;
        filled = InfernoKits.playerKit(kitID) != null;
        let save: Button_CLIP = null;
        if (!InfernoKits.isPlayerSlot(kitID)) {
            this.ioHideSave(column);
            return;
        }
        if (GLOBAL.INFERNO_ONLY && InfernoKits.playerKitsFailed) {
            // (QoL #432: the slots couldn't be read: no Save that could write over a kit the player has)
            this["c" + column].htmlText = KEYS.Get("io_kits_load_failed");
            this["b" + column].visible = false;
            this["b" + column + "s"].visible = false;
            this.ioHideSave(column);
            return;
        }
        this["img" + column].buttonMode = filled && InfernoKits.thumbPath(kitID) != null;
        // No shiny buy-out for player kits.
        this["b" + column + "s"].visible = false;
        // (QoL #334: for several outposts: a player kit is built like the others; an empty slot has nothing to save from here)
        if (this._ioBatch) {
            if (!filled) {
                this["c" + column].htmlText = KEYS.Get("io_op3_batch_slot_empty");
                this["b" + column].visible = false;
            }
            this.ioHideSave(column);
            return;
        }
        if (!filled) {
            this["c" + column].htmlText = KEYS.Get("io_t3k_kit_empty_slot");
            // (23 October: its line ran past the column's foot, cut off: drawn smaller to fit)
            GLOBAL.ioFitHeight(as3.as(this["c" + column], TextField));
            this["b" + column].visible = false;
            this["b" + column + "s"].visible = false;
        }
        save = as3.cast(this._ioSave[column], Button_CLIP);
        if (!save) {
            save = new Button_CLIP();
            this.addChild(save);
            this._ioSave[column] = save;
        }
        // Gold, and the same size and place in the column as the Use Resources button above it.
        let resourcesButton: Button_CLIP = as3.as(this["b" + column], Button_CLIP);
        save.Setup(KEYS.Get(filled ? "io_t3k_kit_replace" : "io_t3k_kit_save_here"), false, resourcesButton.width | 0, resourcesButton.height | 0);
        save.Highlight = true;
        save.x = resourcesButton.x + (((resourcesButton.width - save.width) / 2) | 0);
        save.y = Number(filled ? this["b" + column + "s"].y : resourcesButton.y);
        save.visible = true;
        this.ioListen(save, (e: MouseEvent = null): void => {
            let slot: int = (kitID - InfernoKits.PLAYER_FIRST + 1) | 0;
            let text: string = filled ? KEYS.Get("io_t3k_kit_replaces", { "v1": InfernoKits.kitName(kitID) }) : KEYS.Get("io_t3k_kit_saves_into", { "v1": slot });
            IoTextPrompt.Show(KEYS.Get("io_t3k_kit_name_title"), text, filled ? InfernoKits.kitName(kitID) : KEYS.Get("io_t3k_kit_default_name", { "v1": slot }), 24, KEYS.Get("btn_save"), (name: string): void => {
                // (QoL #450: it can wait up to 30 s for the yard's save first: shown, and one save at a time)
                PLEASEWAIT.Show(KEYS.Get("io_kit_saving"));
                InfernoKits.savePlayerKit(kitID, name, (error: string): void => {
                    PLEASEWAIT.Hide();
                    if (error) {
                        GLOBAL.Message(error);
                        return;
                    }
                    GLOBAL.Message(KEYS.Get("io_t3k_kit_saved"));
                    this.ioRenderPage();
                });
            });
        });
    }

    /** A kit name wider than its column is shortened with "..."; the full name is kept in the kit. */
    private ioFitTitle(param1: TextField, param2: string): void {
        let name: string = param2;
        if (!param1 || param1.textWidth <= param1.width - 6) {
            return;
        }
        while (name.length > 3 && param1.textWidth > param1.width - 6) {
            name = name.substr(0, name.length - 1);
            param1.htmlText = "<b>" + name + "...</b>";
        }
    }

    private ioHideSave(param1: int): void {
        if (this._ioSave[param1]) {
            this._ioSave[param1].visible = false;
        }
    }

    private ioTurnPage(param1: int): Function {
        let step: int = 0;
        step = param1;
        return (param1: MouseEvent = null): void => {
            let pages: int = InfernoKits.pageCount;
            this._ioPage = ((this._ioPage + step + pages) % pages) | 0;
            // (QoL #333: opened again on this page, this session)
            popup_prefab._ioLastPage = this._ioPage;
            this.ioRenderPage();
        };
    }

    public ioThumbLoaded(param1: string, param2: BitmapData, param3: any[]): void {
        // A slow image from a page that has since been turned must not land in the new page.
        if (param3[1] != this._ioToken) {
            return;
        }
        this._ioThumbs[param3[0]] = new Bitmap(param2);
        this["img" + param3[0]].addChild(this._ioThumbs[param3[0]]);
    }

    public Enlarge(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            if (GLOBAL.INFERNO_ONLY && InfernoKits.isPlayerSlot(n) && !InfernoKits.largePath(n)) {
                // An empty slot, or a kit saved before pictures were drawn.
                return;
            }
            let _loc2_: any = new popup_prefab_enlarge();
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(as3.cast(_loc2_, DisplayObject));
            _loc2_.Setup(n);
            _loc2_.Center();
        };
    }

    public ThumbnailLoaded(param1: string, param2: BitmapData, param3: any[]): void {
        if (param3[0] == 1) {
            this.img1.addChild(new Bitmap(param2));
        } else if (param3[0] == 2) {
            this.img2.addChild(new Bitmap(param2));
        } else if (param3[0] == 3) {
            this.img3.addChild(new Bitmap(param2));
        }
    }

    /** Inferno-only (QoL #276): the monsters housed in this outpost now. */
    public static ioHousedCount(): int {
        let n: int = 0;
        if (!GLOBAL.INFERNO_ONLY || !GLOBAL.player || !GLOBAL.player.monsterList) {
            return 0;
        }
        for (let i: int = 0; i < GLOBAL.player.monsterList.length; i++) {
            n += as3.vget(GLOBAL.player.monsterList, i).numCreeps | 0;
        }
        return n;
    }

    /**
     * Inferno-only (14 October, QoL #276): the kit warning says what is replaced, and that the housed monsters
     * stay (the server used to delete them) as long as the kit's Compound has room for them.
     */
    public static ioKitWarning(buildings: int): string {
        if (!GLOBAL.INFERNO_ONLY) {
            return KEYS.Get("kit_warning");
        }
        let housed: int = popup_prefab.ioHousedCount();
        let text: string = KEYS.Get("io_kit_warning", { "v1": Math.max(0, buildings) });
        if (housed > 0) {
            text += " " + KEYS.Get("io_kit_warning_housed", { "v1": housed });
        }
        return text;
    }

    public PreBuyOutright(param1: int, param2: int): Function {
        let kitID: int = 0;
        let shinyCost: int = 0;
        kitID = param1;
        shinyCost = param2;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = 0;
            let _loc3_: any = InstanceManager.getInstancesByClass(BFOUNDATION);
            if (_loc3_.length > 1 || popup_prefab.ioHousedCount() > 0) {
                GLOBAL.Message(popup_prefab.ioKitWarning(_loc3_.length - 1), KEYS.Get("btn_build"), as3.bind(this, this.BuyOutright), [kitID, shinyCost]);
            } else {
                this.BuyOutright(kitID, shinyCost);
            }
        };
    }

    public BuyOutright(param1: int, param2: int): void {
        let kitID: int = 0;
        let kitShiny: int = 0;
        if (GLOBAL.INFERNO_ONLY && InfernoKits.isPlayerSlot(param1)) {
            return;
        }
        // (QoL #334: not for several outposts: its button is hidden then)
        if (this._ioBatch) {
            return;
        }
        if (BASE._credits.Get() < param2) {
            POPUPS.Next();
            POPUPS.ioShinyNeed(param2);
            return;
        }
        kitID = param1;
        kitShiny = param2;
        if (!GLOBAL.ioConfirmShiny(param2, KEYS.Get("io_t3k_for_build_kit"), (): void => {
            this.BuyOutright(kitID, kitShiny);
        })) {
            return;
        }
        let _loc3_: any[] = as3.cast(this.GetBuildings(param1).costs, Array);
        let _loc4_: int = _loc3_[3].Get() | 0;
        if (param2 == _loc4_) {
            if (GLOBAL.INFERNO_ONLY) {
                // (18 October: the server charges the Shiny with the build)
                this.BuildKit(param1, true, { "r": [0, 0, 0], "s": param2 });
                LOGGER.Stat([41, param1 + 1 + "b", param2]);
                return;
            }
            this.BuildKit(param1, true);
            BASE.Purchase("KIT", param2, "popup_prefab");
            LOGGER.Stat([41, param1 + 1 + "b", param2]);
        } else {
            LOGGER.Log("err", "KitCostMismatch (BuyOutright) expected:" + _loc4_ + " got:" + param2);
            GLOBAL.ErrorMessage("Expected to cost:" + param2 + " recalculated cost was:" + _loc4_, GLOBAL.ERROR_ORANGE_BOX_ONLY);
        }
    }

    public PreSelect(param1: int): Function {
        let kitID: int = 0;
        kitID = param1;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = 0;
            // (QoL #334: for several outposts: their total price asked first)
            if (this._ioBatch) {
                this.ioBatchSelect(kitID);
                return;
            }
            let _loc3_: any = InstanceManager.getInstancesByClass(BFOUNDATION);
            if (_loc3_.length > 1 || popup_prefab.ioHousedCount() > 0) {
                GLOBAL.Message(popup_prefab.ioKitWarning(_loc3_.length - 1), KEYS.Get("btn_build"), as3.bind(this, this.Select), [kitID]);
            } else {
                this.Select(kitID);
            }
        };
    }

    public Select(param1: int): void {
        let _loc2_: any[] = null;
        let _loc3_: int = 0;
        let _loc6_: int = 0;
        let _loc8_: int = 0;
        if (this._triggered) {
            return;
        }
        let _loc4_: any[] = as3.cast(this.GetBuildings(param1).costs, Array);
        let _loc5_: any[] = [];
        let _loc7_: int = 0;
        _loc6_ = Math.min(Number(GLOBAL._resources.r1.Get()), Number(_loc4_[0].Get())) | 0;
        _loc7_ = (_loc7_ + (_loc4_[0].Get() - _loc6_)) | 0;
        if (_loc6_ != _loc4_[0].Get()) {
            _loc5_.push([_loc4_[0].Get() - _loc6_, KEYS.Get(as3.str(GLOBAL._resourceNames[0]))]);
        }
        _loc6_ = Math.min(Number(GLOBAL._resources.r2.Get()), Number(_loc4_[1].Get())) | 0;
        _loc7_ = (_loc7_ + (_loc4_[1].Get() - _loc6_)) | 0;
        if (_loc6_ != _loc4_[1].Get()) {
            _loc5_.push([_loc4_[1].Get() - _loc6_, KEYS.Get(as3.str(GLOBAL._resourceNames[1]))]);
        }
        _loc6_ = Math.min(Number(GLOBAL._resources.r3.Get()), Number(_loc4_[2].Get())) | 0;
        _loc7_ = (_loc7_ + (_loc4_[2].Get() - _loc6_)) | 0;
        if (_loc6_ != _loc4_[2].Get()) {
            _loc5_.push([_loc4_[2].Get() - _loc6_, KEYS.Get(as3.str(GLOBAL._resourceNames[2]))]);
        }
        if (_loc5_.length > 0 && GLOBAL.INFERNO_ONLY && InfernoKits.isPlayerSlot(param1)) {
            // Player kits are bought with resources only: no shiny, not even to make up a shortfall.
            GLOBAL.Message(KEYS.Get("io_t3k_kit_need_own", { "v1": GLOBAL.Array2String(_loc5_) }));
            return;
        }
        if (_loc5_.length > 0) {
            _loc8_ = Math.ceil(Math.pow(Math.sqrt(_loc7_ / 2), 0.75)) | 0;
            // (Inferno-only, QoL #235: in the player's language)
            if (GLOBAL.INFERNO_ONLY) {
                GLOBAL.Message(KEYS.Get("io_t3k_kit_need", { "v1": GLOBAL.Array2String(_loc5_), "v2": _loc8_ }), KEYS.Get("io_t3k_kit_use_shiny", { "v1": _loc8_ }), as3.bind(this, this.PayForKit), [param1, _loc8_]);
                return;
            }
            GLOBAL.Message("<b>You need an extra " + GLOBAL.Array2String(_loc5_) + " to build this kit.</b><br><br>You can bank resources in your outposts and main yard or use " + _loc8_ + " shiny to make up the difference.", "Use " + _loc8_ + " Shiny", as3.bind(this, this.PayForKit), [param1, _loc8_]);
            return;
        }
        if (GLOBAL._resources.r1.Get() >= _loc4_[0].Get()) {
            if (GLOBAL._resources.r2.Get() >= _loc4_[1].Get()) {
                if (GLOBAL._resources.r3.Get() >= _loc4_[2].Get()) {
                    if (GLOBAL.INFERNO_ONLY) {
                        // (18 October: the server charges the kit with its build; a player kit, resources only)
                        LOGGER.Stat([38, param1 + 1, 0]);
                        this.BuildKit(param1, false, { "r": [Number(_loc4_[0].Get()), Number(_loc4_[1].Get()), Number(_loc4_[2].Get())], "s": 0, "o": InfernoKits.isPlayerSlot(param1) ? 1 : 0 });
                        BASE.Save();
                        POPUPS.Next();
                        return;
                    }
                    // (13 November: the kit's own price, discounts in it already: no Devil's Contract discount again)
                    BASE._ioPlainCharge = true;
                    BASE.Charge(1, Number(_loc4_[0].Get()));
                    BASE.Charge(2, Number(_loc4_[1].Get()));
                    BASE.Charge(3, Number(_loc4_[2].Get()));
                    BASE._ioPlainCharge = false;
                    LOGGER.Stat([38, param1 + 1, 0]);
                    this.BuildKit(param1);
                    BASE.Save();
                    POPUPS.Next();
                    return;
                }
                GLOBAL.Message(KEYS.Get("newmap_sk_res"));
                return;
            }
            GLOBAL.Message(KEYS.Get("newmap_sk_res"));
            return;
        }
        GLOBAL.Message(KEYS.Get("newmap_sk_res"));
    }

    private PayForKit(param1: int, param2: int): void {
        let topupKit: int = 0;
        let topupShiny: int = 0;
        let _loc5_: int = 0;
        if (BASE._credits.Get() < param2) {
            GLOBAL.Message("<b>" + KEYS.Get("pop_noshiny_title") + "</b><br>" + KEYS.Get("pop_noshiny_body"), KEYS.Get("str_getmore_btn"), BUY.Show);
            return;
        }
        topupKit = param1;
        topupShiny = param2;
        if (!GLOBAL.ioConfirmShiny(param2, KEYS.Get("io_t3k_for_topoff_kit"), (): void => {
            this.PayForKit(topupKit, topupShiny);
        })) {
            return;
        }
        let _loc3_: any[] = as3.cast(this.GetBuildings(param1).costs, Array);
        let _loc4_: int = 0;
        if (GLOBAL.INFERNO_ONLY) {
            // (18 October: the server charges the kit with its build: the resources there are, and the rest in Shiny,
            // at most the Shiny agreed to here)
            LOGGER.Stat([38, param1 + 1, param2]);
            this.BuildKit(param1, false, { "r": [Number(_loc3_[0].Get()), Number(_loc3_[1].Get()), Number(_loc3_[2].Get())], "s": param2 });
            return;
        }
        _loc5_ = Math.min(Number(GLOBAL._resources.r1.Get()), Number(_loc3_[0].Get())) | 0;
        _loc4_ = (_loc4_ + (_loc3_[0].Get() - _loc5_)) | 0;
        BASE.Charge(1, _loc5_);
        _loc5_ = Math.min(Number(GLOBAL._resources.r2.Get()), Number(_loc3_[1].Get())) | 0;
        _loc4_ = (_loc4_ + (_loc3_[1].Get() - _loc5_)) | 0;
        BASE.Charge(2, _loc5_);
        _loc5_ = Math.min(Number(GLOBAL._resources.r3.Get()), Number(_loc3_[2].Get())) | 0;
        _loc4_ = (_loc4_ + (_loc3_[2].Get() - _loc5_)) | 0;
        BASE.Charge(3, _loc5_);
        if (param2 == Math.ceil(Math.pow(Math.sqrt(_loc4_ / 2), 0.75))) {
            this.BuildKit(param1);
            BASE.Purchase("KIT", param2, "popup_prefab");
            LOGGER.Stat([38, param1 + 1, param2]);
        } else {
            LOGGER.Log("err", "KitCostMismatch expected:" + param2 + " got:" + Math.ceil(Math.pow(Math.sqrt(_loc4_ / 2), 0.75)));
            GLOBAL.ErrorMessage("Expected to cost:" + param2 + " recalculated cost was:" + Math.ceil(Math.pow(Math.sqrt(_loc4_ / 2), 0.75)), GLOBAL.ERROR_ORANGE_BOX_ONLY);
        }
    }

    private BuildKit(param1: int, param2: boolean = false, pay: any = null): void {
        let _loc4_: BFOUNDATION = null;
        let _loc6_: any = null;
        this._triggered = true;
        this.b1.Enabled = false;
        this.b2.Enabled = false;
        this.b3.Enabled = false;
        let _loc3_: any = this.GetBuildings(param1).buildings;
        if (GLOBAL.INFERNO_ONLY) {
            // The server wipes the outpost and writes the kit into it; the yard is then loaded again
            // from that save. Nothing is edited locally, so nothing old can be saved back.
            // Every kit is finished at its levels at once, bought with resources or with shiny.
            for (_loc6_ of as3.values(_loc3_)) {
                if (_loc6_.t != 112) {
                    if (!_loc6_.prefab) {
                        _loc6_.prefab = 1;
                    }
                    _loc6_.l = _loc6_.prefab;
                    delete _loc6_.prefab;
                }
            }
            ACHIEVEMENTS.Check("starterkit", 1);
            POPUPS.Next();
            GLOBAL.ioApplyKit(_loc3_, pay);
            return;
        }
        CREATURES.Clear();
        CREEPS.Clear();
        let _loc5_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc4_ of (_loc5_ ?? [])) {
            if (_loc4_._type !== 112) {
                _loc4_.clear();
                _loc4_._mc.visible = false;
                _loc4_._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(_loc4_, _loc4_.TickFast));
                _loc4_._mcBase.Clear();
                _loc4_.topContainer.Clear();
                _loc4_.animContainer.Clear();
                _loc4_._animBMD = null;
                _loc4_._animContainerBMD = null;
            }
        }
        for (_loc6_ of as3.values(_loc3_)) {
            if (_loc6_.t == 112) {
                GLOBAL.townHall.Setup(_loc6_);
                if (GLOBAL.townHall.health < GLOBAL.townHall.maxHealth) {
                    GLOBAL.townHall.setHealth(GLOBAL.townHall.maxHealth);
                    GLOBAL.townHall.Repaired();
                }
            } else {
                if (!_loc6_.prefab) {
                    _loc6_.prefab = 1;
                }
                if (param2) {
                    _loc6_.l = _loc6_.prefab;
                    delete _loc6_.prefab;
                }
                (_loc4_ = BASE.addBuildingC(_loc6_.t | 0)).Setup(_loc6_);
                if (_loc4_._class == "resource") {
                    _loc4_._stored = new SecNum(0);
                }
            }
        }
        ACHIEVEMENTS.Check("starterkit", 1);
        PATHING.ResetCosts();
        POPUPS.Next();
        BASE.Save();
    }

    // (QoL #334: `ioUnder` for an outpost other than the yard showing: true in the Depths, where a kit has no Flinger)
    private GetBuildings(param1: int, ioUnder: any = null): any {
        let _loc2_: any = null;
        let _loc3_: any[] = [];
        let _loc4_: any[] = [0, 0, 0, 0];
        if (GLOBAL.INFERNO_ONLY && InfernoKits.isPlayerSlot(param1)) {
            return { "buildings": InfernoKits.customBuildings(param1), "costs": InfernoKits.customCosts(param1) };
        }
        if (GLOBAL.INFERNO_ONLY && !InfernoKits.usingCustom) {
            // Paging test: slots 4-6 are the three stock kits again.
            param1 = InfernoKits.stockId(param1);
        }
        if (param1 == 1) {
            _loc2_ = JSON.parse("{\"0\":{\"Y\":-105,\"t\":112,\"id\":0,\"X\":-65},\"1\":{\"Y\":-165,\"t\":21,\"prefab\":5,\"id\":1,\"X\":-155},\"2\":{\"Y\":25,\"t\":21,\"prefab\":5,\"id\":2,\"X\":-15},\"3\":{\"Y\":-175,\"t\":21,\"prefab\":5,\"id\":3,\"X\":125},\"4\":{\"Y\":15,\"t\":20,\"prefab\":5,\"id\":4,\"X\":-155},\"5\":{\"Y\":25,\"t\":20,\"prefab\":5,\"id\":5,\"X\":125},\"6\":{\"Y\":-175,\"t\":20,\"prefab\":5,\"id\":6,\"X\":-15},\"7\":{\"Y\":-75,\"t\":25,\"id\":7,\"X\":-155},\"8\":{\"Y\":115,\"t\":15,\"prefab\":2,\"id\":8,\"X\":35},\"9\":{\"Y\":-295,\"t\":13,\"prefab\":2,\"id\":9,\"X\":-35},\"10\":{\"Y\":115,\"t\":13,\"prefab\":2,\"id\":10,\"X\":-65},\"11\":{\"Y\":-285,\"t\":5,\"prefab\":2,\"id\":11,\"X\":-125},\"13\":{\"Y\":-85,\"t\":22,\"id\":13,\"X\":85},\"14\":{\"rCP\":1,\"Y\":-175,\"t\":1,\"prefab\":8,\"id\":14,\"X\":-85},\"15\":{\"rCP\":10,\"Y\":25,\"t\":1,\"prefab\":8,\"id\":15,\"X\":55},\"16\":{\"rCP\":9,\"Y\":-175,\"t\":2,\"prefab\":8,\"id\":16,\"X\":55},\"17\":{\"rCP\":2,\"Y\":25,\"t\":2,\"prefab\":8,\"id\":17,\"X\":-85},\"18\":{\"Y\":-195,\"t\":17,\"prefab\":2,\"id\":18,\"X\":165},\"19\":{\"rCP\":3,\"Y\":-40,\"t\":3,\"prefab\":8,\"id\":19,\"X\":-255},\"20\":{\"rCP\":10,\"Y\":-35,\"t\":4,\"prefab\":8,\"id\":20,\"X\":225},\"21\":{\"rCP\":7,\"Y\":-110,\"t\":4,\"prefab\":8,\"id\":21,\"X\":-255},\"22\":{\"Y\":-75,\"t\":17,\"prefab\":3,\"id\":22,\"X\":185},\"23\":{\"Y\":-65,\"t\":17,\"prefab\":3,\"id\":23,\"X\":-85},\"24\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":24,\"X\":185},\"25\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":25,\"X\":85},\"26\":{\"Y\":-55,\"t\":17,\"prefab\":3,\"id\":26,\"X\":185},\"27\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":27,\"X\":125},\"28\":{\"Y\":-35,\"t\":17,\"prefab\":3,\"id\":28,\"X\":185},\"29\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":29,\"X\":105},\"30\":{\"Y\":-45,\"t\":17,\"prefab\":3,\"id\":30,\"X\":-85},\"31\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":31,\"X\":145},\"32\":{\"Y\":-25,\"t\":17,\"prefab\":3,\"id\":32,\"X\":-85},\"33\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":33,\"X\":165},\"34\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":34,\"X\":65},\"35\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":35,\"X\":145},\"36\":{\"Y\":-105,\"t\":17,\"prefab\":3,\"id\":36,\"X\":165},\"37\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":37,\"X\":125},\"38\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":38,\"X\":-185},\"39\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":39,\"X\":65},\"40\":{\"Y\":-85,\"t\":17,\"prefab\":3,\"id\":40,\"X\":65},\"41\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":41,\"X\":85},\"42\":{\"Y\":-65,\"t\":17,\"prefab\":3,\"id\":42,\"X\":65},\"43\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":43,\"X\":105},\"44\":{\"Y\":-45,\"t\":17,\"prefab\":3,\"id\":44,\"X\":65},\"45\":{\"Y\":-85,\"t\":17,\"prefab\":3,\"id\":45,\"X\":-185},\"46\":{\"Y\":-25,\"t\":17,\"prefab\":3,\"id\":46,\"X\":65},\"47\":{\"Y\":-45,\"t\":17,\"prefab\":3,\"id\":47,\"X\":-185},\"48\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":48,\"X\":-145},\"49\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":49,\"X\":-165},\"50\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":50,\"X\":-105},\"51\":{\"Y\":-95,\"t\":17,\"prefab\":3,\"id\":51,\"X\":-125},\"52\":{\"Y\":-85,\"t\":17,\"prefab\":3,\"id\":52,\"X\":-85},\"53\":{\"Y\":-65,\"t\":17,\"prefab\":3,\"id\":53,\"X\":-185},\"54\":{\"Y\":-25,\"t\":17,\"prefab\":3,\"id\":54,\"X\":-185},\"55\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":55,\"X\":-165},\"56\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":56,\"X\":-105},\"57\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":57,\"X\":-145},\"58\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":58,\"X\":-125},\"59\":{\"Y\":-15,\"t\":17,\"prefab\":3,\"id\":59,\"X\":185},\"60\":{\"Y\":-5,\"t\":17,\"prefab\":3,\"id\":60,\"X\":-85},\"61\":{\"Y\":5,\"t\":17,\"prefab\":3,\"id\":61,\"X\":185},\"62\":{\"Y\":-195,\"t\":17,\"prefab\":2,\"id\":62,\"X\":185},\"63\":{\"Y\":-185,\"t\":17,\"prefab\":2,\"id\":63,\"X\":-115},\"64\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":64,\"X\":165},\"65\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":65,\"X\":145},\"66\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":66,\"X\":125},\"67\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":67,\"X\":105},\"68\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":68,\"X\":85},\"69\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":69,\"X\":65},\"70\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":70,\"X\":45},\"71\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":71,\"X\":25},\"72\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":72,\"X\":5},\"73\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":73,\"X\":-15},\"74\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":74,\"X\":-35},\"75\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":75,\"X\":-55},\"76\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":76,\"X\":-75},\"77\":{\"Y\":95,\"t\":17,\"prefab\":3,\"id\":77,\"X\":-95},\"78\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":78,\"X\":-115},\"79\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":79,\"X\":-135},\"80\":{\"Y\":85,\"t\":17,\"prefab\":2,\"id\":80,\"X\":-155},\"81\":{\"Y\":15,\"t\":17,\"prefab\":3,\"id\":81,\"X\":-185},\"82\":{\"Y\":35,\"t\":17,\"prefab\":2,\"id\":82,\"X\":-185},\"83\":{\"Y\":55,\"t\":17,\"prefab\":2,\"id\":83,\"X\":-185},\"84\":{\"Y\":75,\"t\":17,\"prefab\":2,\"id\":84,\"X\":-175},\"85\":{\"Y\":95,\"t\":17,\"prefab\":2,\"id\":85,\"X\":185},\"86\":{\"Y\":75,\"t\":17,\"prefab\":2,\"id\":86,\"X\":195},\"87\":{\"Y\":55,\"t\":17,\"prefab\":2,\"id\":87,\"X\":195},\"88\":{\"Y\":35,\"t\":17,\"prefab\":2,\"id\":88,\"X\":205},\"89\":{\"Y\":15,\"t\":17,\"prefab\":3,\"id\":89,\"X\":205},\"90\":{\"Y\":-115,\"t\":17,\"prefab\":3,\"id\":90,\"X\":-175},\"91\":{\"Y\":-135,\"t\":17,\"prefab\":2,\"id\":91,\"X\":-175},\"92\":{\"Y\":-155,\"t\":17,\"prefab\":2,\"id\":92,\"X\":-175},\"93\":{\"Y\":-175,\"t\":17,\"prefab\":2,\"id\":93,\"X\":-175},\"94\":{\"Y\":-185,\"t\":17,\"prefab\":2,\"id\":94,\"X\":-155},\"95\":{\"Y\":-185,\"t\":17,\"prefab\":2,\"id\":95,\"X\":-135},\"96\":{\"Y\":-195,\"t\":17,\"prefab\":2,\"id\":96,\"X\":145},\"97\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":97,\"X\":-95},\"98\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":98,\"X\":-75},\"99\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":99,\"X\":-55},\"100\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":100,\"X\":-35},\"101\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":101,\"X\":-15},\"102\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":102,\"X\":5},\"103\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":103,\"X\":25},\"104\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":104,\"X\":45},\"105\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":105,\"X\":65},\"106\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":106,\"X\":85},\"107\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":107,\"X\":105},\"108\":{\"Y\":-115,\"t\":17,\"prefab\":3,\"id\":108,\"X\":195},\"110\":{\"Y\":-135,\"t\":17,\"prefab\":2,\"id\":110,\"X\":195},\"111\":{\"Y\":-155,\"t\":17,\"prefab\":2,\"id\":111,\"X\":195},\"112\":{\"Y\":-175,\"t\":17,\"prefab\":2,\"id\":112,\"X\":195},\"113\":{\"Y\":-195,\"t\":17,\"prefab\":3,\"id\":113,\"X\":125},\"114\":{\"rCP\":6,\"Y\":-105,\"t\":3,\"prefab\":8,\"id\":114,\"X\":225}}");
            _loc3_[0] = new SecNum(12000000);
            _loc3_[1] = new SecNum(12000000);
            _loc3_[2] = new SecNum(6000000);
            _loc3_[3] = new SecNum(420);
        } else if (param1 == 2) {
            _loc2_ = JSON.parse("{\"0\":{\"Y\":-85,\"t\":112,\"id\":0,\"X\":-145},\"1\":{\"Y\":-315,\"t\":21,\"prefab\":6,\"id\":1,\"X\":-215},\"2\":{\"Y\":45,\"t\":21,\"prefab\":6,\"id\":2,\"X\":145},\"3\":{\"Y\":-155,\"t\":21,\"prefab\":6,\"id\":3,\"X\":-375},\"4\":{\"Y\":205,\"t\":21,\"prefab\":6,\"id\":4,\"X\":-15},\"5\":{\"Y\":-155,\"t\":20,\"prefab\":6,\"id\":5,\"X\":-85},\"6\":{\"Y\":45,\"t\":20,\"prefab\":6,\"id\":6,\"X\":-145},\"7\":{\"Y\":-155,\"t\":20,\"prefab\":6,\"id\":7,\"X\":-215},\"8\":{\"Y\":45,\"t\":20,\"prefab\":6,\"id\":8,\"X\":-15},\"9\":{\"Y\":115,\"t\":25,\"id\":9,\"X\":55},\"10\":{\"Y\":-225,\"t\":25,\"id\":10,\"X\":-285},\"11\":{\"Y\":-95,\"t\":23,\"id\":11,\"X\":-15},\"12\":{\"Y\":-15,\"t\":23,\"id\":12,\"X\":-215},\"13\":{\"Y\":135,\"t\":15,\"prefab\":3,\"id\":13,\"X\":-195},\"14\":{\"Y\":-345,\"t\":13,\"prefab\":3,\"id\":14,\"X\":-405},\"15\":{\"Y\":205,\"t\":13,\"prefab\":3,\"id\":15,\"X\":145},\"16\":{\"Y\":-285,\"t\":16,\"id\":16,\"X\":-125},\"17\":{\"Y\":-95,\"t\":5,\"prefab\":3,\"id\":17,\"X\":75},\"19\":{\"rCP\":14,\"Y\":-315,\"t\":1,\"prefab\":8,\"id\":19,\"X\":-285},\"20\":{\"rCP\":13,\"Y\":115,\"t\":1,\"prefab\":8,\"id\":20,\"X\":-15},\"21\":{\"rCP\":1,\"Y\":-225,\"t\":2,\"prefab\":8,\"id\":21,\"X\":-215},\"22\":{\"rCP\":17,\"Y\":115,\"t\":2,\"prefab\":8,\"id\":22,\"X\":145},\"23\":{\"rCP\":10,\"Y\":-155,\"t\":3,\"prefab\":8,\"id\":23,\"X\":-285},\"24\":{\"rCP\":12,\"Y\":205,\"t\":3,\"prefab\":8,\"id\":24,\"X\":55},\"25\":{\"rCP\":9,\"Y\":-225,\"t\":4,\"prefab\":8,\"id\":25,\"X\":-375},\"26\":{\"rCP\":15,\"Y\":45,\"t\":4,\"prefab\":8,\"id\":26,\"X\":55},\"27\":{\"Y\":-185,\"t\":17,\"prefab\":4,\"id\":27,\"X\":-305},\"28\":{\"Y\":-145,\"t\":17,\"prefab\":4,\"id\":28,\"X\":-305},\"29\":{\"Y\":-165,\"t\":17,\"prefab\":4,\"id\":29,\"X\":-305},\"30\":{\"Y\":-125,\"t\":17,\"prefab\":4,\"id\":30,\"X\":-305},\"31\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":31,\"X\":-305},\"32\":{\"Y\":-205,\"t\":17,\"prefab\":4,\"id\":32,\"X\":-305},\"33\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":33,\"X\":-305},\"34\":{\"Y\":-225,\"t\":17,\"prefab\":4,\"id\":34,\"X\":-305},\"35\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":35,\"X\":-285},\"36\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":36,\"X\":-205},\"37\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":37,\"X\":-265},\"38\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":38,\"X\":-185},\"39\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":39,\"X\":-245},\"40\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":40,\"X\":-165},\"41\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":41,\"X\":-225},\"42\":{\"Y\":-245,\"t\":17,\"prefab\":4,\"id\":42,\"X\":-145},\"43\":{\"Y\":-225,\"t\":17,\"prefab\":4,\"id\":43,\"X\":-145},\"44\":{\"Y\":-205,\"t\":17,\"prefab\":4,\"id\":44,\"X\":-145},\"45\":{\"Y\":-185,\"t\":17,\"prefab\":4,\"id\":45,\"X\":-145},\"46\":{\"Y\":-165,\"t\":17,\"prefab\":4,\"id\":46,\"X\":-145},\"47\":{\"Y\":-145,\"t\":17,\"prefab\":4,\"id\":47,\"X\":-145},\"48\":{\"Y\":-125,\"t\":17,\"prefab\":4,\"id\":48,\"X\":-145},\"49\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":49,\"X\":-285},\"50\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":50,\"X\":-145},\"51\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":51,\"X\":-265},\"52\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":52,\"X\":-245},\"53\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":53,\"X\":-225},\"54\":{\"Y\":-65,\"t\":17,\"prefab\":4,\"id\":54,\"X\":-165},\"55\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":55,\"X\":-205},\"56\":{\"Y\":-45,\"t\":17,\"prefab\":4,\"id\":56,\"X\":-165},\"57\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":57,\"X\":-165},\"58\":{\"Y\":-35,\"t\":17,\"prefab\":4,\"id\":58,\"X\":-215},\"59\":{\"Y\":-35,\"t\":17,\"prefab\":4,\"id\":59,\"X\":-195},\"60\":{\"Y\":-35,\"t\":17,\"prefab\":4,\"id\":60,\"X\":-235},\"61\":{\"Y\":-15,\"t\":17,\"prefab\":4,\"id\":61,\"X\":-235},\"62\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":62,\"X\":-235},\"63\":{\"Y\":5,\"t\":17,\"prefab\":4,\"id\":63,\"X\":-235},\"64\":{\"Y\":55,\"t\":17,\"prefab\":4,\"id\":64,\"X\":-215},\"65\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":65,\"X\":-235},\"66\":{\"Y\":55,\"t\":17,\"prefab\":4,\"id\":66,\"X\":-195},\"67\":{\"Y\":75,\"t\":24,\"id\":67,\"X\":-165},\"68\":{\"Y\":205,\"t\":24,\"id\":68,\"X\":125},\"69\":{\"Y\":55,\"t\":17,\"prefab\":4,\"id\":69,\"X\":-175},\"70\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":70,\"X\":-125},\"71\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":71,\"X\":-105},\"72\":{\"Y\":-155,\"t\":17,\"prefab\":4,\"id\":72,\"X\":-105},\"73\":{\"Y\":-125,\"t\":24,\"id\":73,\"X\":-105},\"74\":{\"Y\":-135,\"t\":24,\"id\":74,\"X\":-125},\"75\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":75,\"X\":-105},\"76\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":76,\"X\":-85},\"77\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":77,\"X\":-65},\"78\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":78,\"X\":-45},\"79\":{\"Y\":-175,\"t\":17,\"prefab\":4,\"id\":79,\"X\":-25},\"80\":{\"Y\":-165,\"t\":17,\"prefab\":4,\"id\":80,\"X\":-5},\"81\":{\"Y\":-135,\"t\":24,\"id\":81,\"X\":-15},\"82\":{\"Y\":-245,\"t\":24,\"id\":82,\"X\":-305},\"83\":{\"Y\":-265,\"t\":24,\"id\":83,\"X\":-305},\"84\":{\"Y\":-245,\"t\":24,\"id\":84,\"X\":-325},\"85\":{\"Y\":-115,\"t\":17,\"prefab\":4,\"id\":85,\"X\":-5},\"86\":{\"Y\":-115,\"t\":17,\"prefab\":4,\"id\":86,\"X\":15},\"87\":{\"Y\":-115,\"t\":17,\"prefab\":4,\"id\":87,\"X\":35},\"88\":{\"Y\":-105,\"t\":17,\"prefab\":4,\"id\":88,\"X\":55},\"89\":{\"Y\":-85,\"t\":17,\"prefab\":4,\"id\":89,\"X\":55},\"90\":{\"Y\":-65,\"t\":17,\"prefab\":4,\"id\":90,\"X\":55},\"91\":{\"Y\":-45,\"t\":17,\"prefab\":4,\"id\":91,\"X\":55},\"92\":{\"Y\":-25,\"t\":17,\"prefab\":4,\"id\":92,\"X\":55},\"93\":{\"Y\":-25,\"t\":17,\"prefab\":4,\"id\":93,\"X\":35},\"94\":{\"Y\":-25,\"t\":17,\"prefab\":4,\"id\":94,\"X\":15},\"95\":{\"Y\":-15,\"t\":17,\"prefab\":4,\"id\":95,\"X\":-15},\"96\":{\"Y\":5,\"t\":17,\"prefab\":4,\"id\":96,\"X\":-15},\"97\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":97,\"X\":-15},\"98\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":98,\"X\":-35},\"99\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":99,\"X\":-55},\"100\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":100,\"X\":-75},\"101\":{\"Y\":95,\"t\":17,\"prefab\":4,\"id\":101,\"X\":-75},\"102\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":102,\"X\":-75},\"103\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":103,\"X\":-95},\"104\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":104,\"X\":-115},\"105\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":105,\"X\":-135},\"106\":{\"Y\":115,\"t\":17,\"prefab\":4,\"id\":106,\"X\":-155},\"107\":{\"Y\":105,\"t\":17,\"prefab\":4,\"id\":107,\"X\":-175},\"108\":{\"Y\":65,\"t\":17,\"prefab\":4,\"id\":108,\"X\":-35},\"109\":{\"Y\":85,\"t\":17,\"prefab\":4,\"id\":109,\"X\":-35},\"110\":{\"Y\":105,\"t\":17,\"prefab\":4,\"id\":110,\"X\":-35},\"111\":{\"Y\":125,\"t\":17,\"prefab\":4,\"id\":111,\"X\":-35},\"112\":{\"Y\":145,\"t\":17,\"prefab\":4,\"id\":112,\"X\":-35},\"113\":{\"Y\":165,\"t\":17,\"prefab\":4,\"id\":113,\"X\":-35},\"114\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":114,\"X\":-35},\"115\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":115,\"X\":-15},\"116\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":116,\"X\":5},\"117\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":117,\"X\":25},\"118\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":118,\"X\":45},\"119\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":119,\"X\":65},\"120\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":120,\"X\":85},\"121\":{\"Y\":185,\"t\":17,\"prefab\":4,\"id\":121,\"X\":105},\"122\":{\"Y\":165,\"t\":17,\"prefab\":4,\"id\":122,\"X\":125},\"123\":{\"Y\":145,\"t\":17,\"prefab\":4,\"id\":123,\"X\":125},\"124\":{\"Y\":125,\"t\":17,\"prefab\":4,\"id\":124,\"X\":125},\"125\":{\"Y\":105,\"t\":17,\"prefab\":4,\"id\":125,\"X\":125},\"126\":{\"Y\":85,\"t\":17,\"prefab\":4,\"id\":126,\"X\":125},\"127\":{\"Y\":65,\"t\":17,\"prefab\":4,\"id\":127,\"X\":125},\"128\":{\"Y\":45,\"t\":17,\"prefab\":4,\"id\":128,\"X\":125},\"129\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":129,\"X\":125},\"130\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":130,\"X\":105},\"131\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":131,\"X\":85},\"132\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":132,\"X\":65},\"133\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":133,\"X\":45},\"134\":{\"Y\":25,\"t\":17,\"prefab\":4,\"id\":134,\"X\":25},\"135\":{\"Y\":-55,\"t\":24,\"id\":135,\"X\":-185},\"136\":{\"Y\":-75,\"t\":24,\"id\":136,\"X\":-185},\"137\":{\"Y\":-55,\"t\":24,\"id\":137,\"X\":-205},\"138\":{\"Y\":-145,\"t\":24,\"id\":138,\"X\":5},\"139\":{\"Y\":-5,\"t\":24,\"id\":139,\"X\":5},\"140\":{\"Y\":-5,\"t\":24,\"id\":140,\"X\":25},\"141\":{\"Y\":15,\"t\":24,\"id\":141,\"X\":5},\"142\":{\"Y\":185,\"t\":24,\"id\":142,\"X\":125},\"143\":{\"Y\":185,\"t\":24,\"id\":143,\"X\":145},\"144\":{\"Y\":85,\"t\":24,\"id\":144,\"X\":-185},\"145\":{\"Y\":65,\"t\":24,\"id\":145,\"X\":-75},\"146\":{\"Y\":75,\"t\":24,\"id\":146,\"X\":-55},\"147\":{\"Y\":75,\"t\":22,\"id\":147,\"X\":-285},\"148\":{\"Y\":-205,\"t\":22,\"id\":148,\"X\":25}}");
            _loc3_[0] = new SecNum(50000000);
            _loc3_[1] = new SecNum(50000000);
            _loc3_[2] = new SecNum(25000000);
            _loc3_[3] = new SecNum(800);
        } else if (param1 == 3) {
            _loc2_ = JSON.parse("{\"0\":{\"Y\":-50,\"t\":112,\"fort\":4,\"id\":0,\"X\":0},\"2\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":2,\"X\":130},\"3\":{\"Y\":40,\"t\":17,\"prefab\":5,\"id\":3,\"X\":130},\"4\":{\"Y\":20,\"t\":17,\"prefab\":5,\"id\":4,\"X\":130},\"5\":{\"Y\":0,\"t\":17,\"prefab\":5,\"id\":5,\"X\":130},\"6\":{\"Y\":-20,\"t\":17,\"prefab\":5,\"id\":6,\"X\":130},\"7\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":7,\"X\":150},\"8\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":8,\"X\":170},\"9\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":9,\"X\":190},\"10\":{\"Y\":80,\"t\":115,\"prefab\":5,\"fort\":3,\"id\":10,\"X\":150},\"12\":{\"Y\":100,\"t\":17,\"prefab\":5,\"id\":12,\"X\":130},\"13\":{\"Y\":120,\"t\":17,\"prefab\":5,\"id\":13,\"X\":130},\"14\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":14,\"X\":210},\"15\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":15,\"X\":130},\"16\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":16,\"X\":230},\"17\":{\"Y\":80,\"t\":17,\"prefab\":5,\"id\":17,\"X\":230},\"18\":{\"Y\":100,\"t\":17,\"prefab\":5,\"id\":18,\"X\":230},\"19\":{\"Y\":120,\"t\":17,\"prefab\":5,\"id\":19,\"X\":230},\"20\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":20,\"X\":230},\"21\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":21,\"X\":290},\"22\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":22,\"X\":210},\"23\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":23,\"X\":190},\"24\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":24,\"X\":170},\"25\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":25,\"X\":150},\"26\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":26,\"X\":310},\"27\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":27,\"X\":-20},\"28\":{\"Y\":-30,\"t\":17,\"prefab\":5,\"id\":28,\"X\":-20},\"29\":{\"Y\":-10,\"t\":17,\"prefab\":5,\"id\":29,\"X\":-20},\"30\":{\"Y\":10,\"t\":17,\"prefab\":5,\"id\":30,\"X\":-20},\"31\":{\"Y\":30,\"t\":17,\"prefab\":5,\"id\":31,\"X\":-20},\"32\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":32,\"X\":-40},\"33\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":33,\"X\":-60},\"34\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":34,\"X\":-80},\"35\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":35,\"X\":-100},\"36\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":36,\"X\":-120},\"37\":{\"Y\":-70,\"t\":17,\"prefab\":5,\"id\":37,\"X\":-120},\"38\":{\"Y\":-90,\"t\":17,\"prefab\":5,\"id\":38,\"X\":-120},\"39\":{\"Y\":-110,\"t\":17,\"prefab\":5,\"id\":39,\"X\":-120},\"40\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":40,\"X\":-120},\"41\":{\"Y\":-120,\"t\":115,\"prefab\":5,\"fort\":3,\"id\":41,\"X\":-100},\"42\":{\"Y\":-20,\"t\":17,\"prefab\":5,\"id\":42,\"X\":-200},\"43\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":43,\"X\":-100},\"44\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":44,\"X\":-80},\"45\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":45,\"X\":-60},\"46\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":46,\"X\":-40},\"47\":{\"Y\":0,\"t\":17,\"prefab\":5,\"id\":47,\"X\":-200},\"48\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":48,\"X\":-20},\"49\":{\"Y\":-110,\"t\":17,\"prefab\":5,\"id\":49,\"X\":-20},\"50\":{\"Y\":-90,\"t\":17,\"prefab\":5,\"id\":50,\"X\":-20},\"51\":{\"Y\":-70,\"t\":117,\"id\":51,\"X\":-20},\"52\":{\"Y\":80,\"t\":23,\"prefab\":3,\"fort\":2,\"id\":52,\"X\":60},\"53\":{\"Y\":-120,\"t\":118,\"prefab\":3,\"fort\":2,\"id\":53,\"X\":0},\"54\":{\"Y\":100,\"t\":17,\"prefab\":5,\"id\":54,\"X\":40},\"55\":{\"Y\":80,\"t\":24,\"id\":55,\"X\":40},\"56\":{\"Y\":-70,\"t\":24,\"id\":56,\"X\":70},\"57\":{\"Y\":80,\"t\":117,\"id\":57,\"X\":20},\"58\":{\"Y\":-70,\"t\":117,\"id\":58,\"X\":90},\"59\":{\"Y\":60,\"t\":15,\"prefab\":6,\"id\":59,\"X\":-430},\"60\":{\"Y\":-130,\"t\":22,\"prefab\":3,\"id\":60,\"X\":130},\"61\":{\"Y\":70,\"t\":22,\"prefab\":3,\"id\":61,\"X\":-90},\"62\":{\"Y\":-30,\"t\":25,\"prefab\":3,\"fort\":2,\"id\":62,\"X\":-90},\"63\":{\"Y\":50,\"t\":117,\"id\":63,\"X\":-20},\"64\":{\"Y\":40,\"t\":24,\"id\":64,\"X\":-40},\"65\":{\"Y\":40,\"t\":24,\"id\":65,\"X\":-60},\"66\":{\"Y\":-40,\"t\":24,\"id\":66,\"X\":130},\"67\":{\"Y\":-30,\"t\":24,\"id\":67,\"X\":150},\"69\":{\"Y\":-30,\"t\":24,\"id\":69,\"X\":170},\"70\":{\"Y\":-90,\"t\":17,\"prefab\":5,\"id\":70,\"X\":70},\"71\":{\"Y\":-110,\"t\":17,\"prefab\":5,\"id\":71,\"X\":70},\"72\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":72,\"X\":70},\"73\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":73,\"X\":70},\"74\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":74,\"X\":50},\"75\":{\"Y\":-140,\"t\":17,\"prefab\":5,\"id\":75,\"X\":30},\"76\":{\"Y\":-170,\"t\":17,\"prefab\":5,\"id\":76,\"X\":70},\"77\":{\"Y\":-190,\"t\":17,\"prefab\":5,\"id\":77,\"X\":70},\"78\":{\"Y\":-210,\"t\":17,\"prefab\":5,\"id\":78,\"X\":70},\"79\":{\"Y\":-220,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":79,\"X\":110},\"80\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":80,\"X\":110},\"81\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":81,\"X\":130},\"82\":{\"Y\":-150,\"t\":17,\"prefab\":5,\"id\":82,\"X\":150},\"83\":{\"Y\":-130,\"t\":17,\"prefab\":5,\"id\":83,\"X\":110},\"84\":{\"Y\":120,\"t\":17,\"prefab\":5,\"id\":84,\"X\":40},\"85\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":85,\"X\":40},\"86\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":86,\"X\":60},\"87\":{\"Y\":150,\"t\":17,\"prefab\":5,\"id\":87,\"X\":80},\"88\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":88,\"X\":40},\"89\":{\"Y\":180,\"t\":17,\"prefab\":5,\"id\":89,\"X\":40},\"90\":{\"Y\":200,\"t\":17,\"prefab\":5,\"id\":90,\"X\":40},\"91\":{\"Y\":220,\"t\":17,\"prefab\":5,\"id\":91,\"X\":40},\"92\":{\"Y\":-210,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":92,\"X\":0},\"93\":{\"Y\":170,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":93,\"X\":60},\"94\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":94,\"X\":250},\"95\":{\"Y\":60,\"t\":17,\"prefab\":5,\"id\":95,\"X\":270},\"96\":{\"Y\":20,\"t\":17,\"prefab\":5,\"id\":96,\"X\":220},\"97\":{\"Y\":40,\"t\":24,\"id\":97,\"X\":220},\"98\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":98,\"X\":-140},\"99\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":99,\"X\":-160},\"100\":{\"Y\":-10,\"t\":17,\"prefab\":5,\"id\":100,\"X\":-110},\"101\":{\"Y\":-30,\"t\":24,\"id\":101,\"X\":-110},\"102\":{\"Y\":0,\"t\":17,\"prefab\":5,\"id\":102,\"X\":220},\"103\":{\"Y\":-20,\"t\":17,\"prefab\":5,\"id\":103,\"X\":220},\"104\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":104,\"X\":220},\"105\":{\"Y\":-110,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":105,\"X\":220},\"106\":{\"Y\":70,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":106,\"X\":-160},\"107\":{\"Y\":10,\"t\":17,\"prefab\":5,\"id\":107,\"X\":-110},\"108\":{\"Y\":30,\"t\":17,\"prefab\":5,\"id\":108,\"X\":-110},\"109\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":109,\"X\":-110},\"110\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":110,\"X\":-130},\"111\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":111,\"X\":-150},\"112\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":112,\"X\":-170},\"113\":{\"Y\":-20,\"t\":23,\"prefab\":3,\"fort\":2,\"id\":113,\"X\":-180},\"114\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":114,\"X\":240},\"115\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":115,\"X\":260},\"116\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":116,\"X\":280},\"117\":{\"Y\":140,\"t\":17,\"prefab\":5,\"id\":117,\"X\":0},\"118\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":118,\"X\":0},\"119\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":119,\"X\":-20},\"120\":{\"Y\":160,\"t\":17,\"prefab\":5,\"id\":120,\"X\":-40},\"121\":{\"Y\":-120,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":121,\"X\":-190},\"122\":{\"Y\":-140,\"t\":24,\"id\":122,\"X\":0},\"123\":{\"Y\":-150,\"t\":24,\"id\":123,\"X\":-20},\"124\":{\"Y\":-20,\"t\":20,\"prefab\":8,\"fort\":1,\"id\":124,\"X\":240},\"125\":{\"Y\":180,\"t\":21,\"prefab\":8,\"fort\":1,\"id\":125,\"X\":-30},\"126\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":126,\"X\":300},\"127\":{\"Y\":-60,\"t\":17,\"prefab\":5,\"id\":127,\"X\":290},\"128\":{\"Y\":-80,\"t\":17,\"prefab\":5,\"id\":128,\"X\":290},\"129\":{\"Y\":70,\"t\":17,\"prefab\":5,\"id\":129,\"X\":-180},\"130\":{\"Y\":50,\"t\":17,\"prefab\":5,\"id\":130,\"X\":-190},\"131\":{\"Y\":160,\"t\":24,\"id\":131,\"X\":20},\"132\":{\"Y\":140,\"t\":24,\"id\":132,\"X\":20},\"133\":{\"Y\":-150,\"t\":24,\"id\":133,\"X\":90},\"134\":{\"Y\":-130,\"t\":24,\"id\":134,\"X\":90},\"135\":{\"Y\":10,\"t\":17,\"prefab\":5,\"id\":135,\"X\":310},\"136\":{\"Y\":30,\"t\":17,\"prefab\":5,\"id\":136,\"X\":310},\"137\":{\"Y\":-50,\"t\":17,\"prefab\":5,\"id\":137,\"X\":-180},\"138\":{\"Y\":90,\"t\":17,\"prefab\":5,\"id\":138,\"X\":-180},\"139\":{\"Y\":-40,\"t\":17,\"prefab\":5,\"id\":139,\"X\":-200},\"140\":{\"Y\":20,\"t\":24,\"id\":140,\"X\":-200},\"143\":{\"Y\":140,\"t\":24,\"id\":143,\"X\":-110},\"144\":{\"Y\":-150,\"t\":24,\"id\":144,\"X\":190},\"145\":{\"Y\":-130,\"t\":24,\"id\":145,\"X\":220},\"146\":{\"Y\":80,\"t\":24,\"id\":146,\"X\":0},\"147\":{\"Y\":100,\"t\":24,\"id\":147,\"X\":0},\"148\":{\"Y\":-70,\"t\":24,\"id\":148,\"X\":110},\"149\":{\"Y\":-30,\"t\":24,\"id\":149,\"X\":190},\"150\":{\"Y\":150,\"t\":24,\"id\":150,\"X\":100},\"151\":{\"Y\":160,\"t\":24,\"id\":151,\"X\":-90},\"152\":{\"Y\":-10,\"t\":25,\"prefab\":3,\"fort\":2,\"id\":152,\"X\":150},\"153\":{\"Y\":-360,\"t\":9,\"id\":153,\"X\":-110},\"154\":{\"Y\":-370,\"t\":13,\"prefab\":3,\"id\":154,\"X\":30},\"155\":{\"rCP\":9,\"Y\":-180,\"t\":1,\"prefab\":8,\"id\":155,\"X\":250},\"156\":{\"rCP\":8,\"Y\":-220,\"t\":2,\"prefab\":8,\"id\":156,\"X\":180},\"157\":{\"rCP\":7,\"Y\":-335,\"t\":3,\"prefab\":8,\"id\":157,\"X\":225},\"158\":{\"rCP\":12,\"Y\":35,\"t\":4,\"prefab\":8,\"id\":158,\"X\":365},\"159\":{\"Y\":290,\"t\":13,\"prefab\":3,\"id\":159,\"X\":55},\"160\":{\"Y\":270,\"t\":5,\"prefab\":4,\"id\":160,\"X\":230},\"161\":{\"rCP\":7,\"Y\":80,\"t\":1,\"prefab\":8,\"id\":161,\"X\":-250},\"162\":{\"rCP\":1,\"Y\":140,\"t\":2,\"prefab\":8,\"id\":162,\"X\":-180},\"163\":{\"rCP\":9,\"Y\":300,\"t\":3,\"prefab\":8,\"id\":163,\"X\":-90},\"164\":{\"rCP\":8,\"Y\":255,\"t\":4,\"prefab\":8,\"id\":164,\"X\":-225},\"165\":{\"Y\":-125,\"t\":16,\"id\":165,\"X\":355},\"167\":{\"Y\":-110,\"t\":10,\"id\":167,\"X\":-400},\"168\":{\"rCP\":8,\"Y\":-150,\"t\":1,\"prefab\":8,\"id\":168,\"X\":-260},\"169\":{\"rCP\":16,\"Y\":-190,\"t\":2,\"prefab\":8,\"id\":169,\"X\":-190},\"170\":{\"rCP\":4,\"Y\":-260,\"t\":3,\"prefab\":8,\"id\":170,\"X\":-350},\"171\":{\"rCP\":3,\"Y\":-340,\"t\":4,\"prefab\":8,\"id\":171,\"X\":-240},\"172\":{\"rCP\":13,\"Y\":170,\"t\":2,\"prefab\":8,\"id\":172,\"X\":180},\"173\":{\"rCP\":7,\"Y\":110,\"t\":1,\"prefab\":8,\"id\":173,\"X\":250},\"174\":{\"rCP\":14,\"Y\":155,\"t\":3,\"prefab\":8,\"id\":174,\"X\":350},\"175\":{\"rCP\":6,\"Y\":-255,\"t\":4,\"prefab\":8,\"id\":175,\"X\":345},\"176\":{\"Y\":80,\"t\":117,\"id\":176,\"X\":130}}");
            _loc3_[0] = new SecNum(200000000);
            _loc3_[1] = new SecNum(200000000);
            _loc3_[2] = new SecNum(100000000);
            _loc3_[3] = new SecNum(1500);
        } else if (!(GLOBAL.INFERNO_ONLY && InfernoKits.hasKit(param1))) {
            LOGGER.Log("err", "popup_prefab.GetBuildings " + param1);
        }
        if (GLOBAL.INFERNO_ONLY && _loc2_) {
            _loc2_ = InfernoKits.convert(_loc2_);
            _loc3_ = InfernoKits.costs(param1);
        }
        if (GLOBAL.INFERNO_ONLY && InfernoKits.usingCustom && InfernoKits.hasKit(param1)) {
            _loc2_ = InfernoKits.customBuildings(param1);
            _loc3_ = InfernoKits.customCosts(param1);
        }
        if (GLOBAL.INFERNO_ONLY && _loc2_ && (ioUnder != null ? Boolean(ioUnder) : BASE.ioInUnderworldOutpost())) {
            return popup_prefab.ioWithoutFlinger(_loc2_, _loc3_, param1);
        }
        return { "buildings": _loc2_, "costs": _loc3_ };
    }

    /**
     * Inferno-only (QoL #334, 15 October): the kit chosen for several outposts: each one's buildings and price (one in
     * the Depths has no Flinger, and costs less), the total asked, then IoOutpostsPopup.ioBatchRun builds them all.
     * Resources only (no Shiny buy-out or top-up for several at once).
     */
    private ioBatchSelect(kitID: int): void {
        let jobs: any[] = [];
        let total: number[] = [0, 0, 0];
        let name: string = InfernoKits.kitName(kitID);
        if (this._triggered || !this._ioBatch) {
            return;
        }
        for (let o of as3.values(this._ioBatch)) {
            let kit: any = this.GetBuildings(kitID, IoUnderworld.isUnder(o.x | 0, o.y | 0));
            if (!kit || !kit.buildings || !kit.costs) {
                continue;
            }
            let costs: any[] = as3.cast(kit.costs, Array);
            let cost: number[] = [Number(costs[0].Get()), Number(costs[1].Get()), Number(costs[2].Get())];
            jobs.push({ "baseid": String(o.baseid), "x": o.x | 0, "y": o.y | 0, "buildings": popup_prefab.ioFinished(kit.buildings), "cost": cost });
            for (let r: int = 0; r < 3; r++) {
                total[r] += cost[r];
            }
        }
        if (jobs.length == 0) {
            return;
        }
        let short: any[] = [];
        for (let r: int = 0; r < 3; r++) {
            let have: number = Number(GLOBAL._resources["r" + (r + 1)].Get());
            if (!GLOBAL.ioFreeBuild() && have < total[r]) {
                short.push([total[r] - have, KEYS.Get(as3.str(GLOBAL._resourceNames[r]))]);
            }
        }
        if (short.length > 0) {
            GLOBAL.Message(KEYS.Get("io_op3_batch_short", { "v1": GLOBAL.Array2String(short), "v2": jobs.length }));
            return;
        }
        let price: string = GLOBAL.FormatNumber(total[0]) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[0])) + ", " + GLOBAL.FormatNumber(total[1]) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[1])) + ", " + GLOBAL.FormatNumber(total[2]) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[2]));
        GLOBAL.ioDanger(KEYS.Get("io_op3_batch_ask", { "v1": IoMapUi.escape(name), "v2": jobs.length, "v3": price }), KEYS.Get("io_op3_batch_build"), (): void => {
            if (this._triggered) {
                return;
            }
            this._triggered = true;
            POPUPS.Next();
            IoOutpostsPopup.ioBatchRun(jobs, name);
        });
    }

    /** Inferno-only (QoL #330, #334): a copy of a kit's buildings finished at their kit levels (as BuildKit sends them). */
    public static ioFinished(buildings: any): any {
        let out: any = {};
        for (let key in buildings) {
            let copy: any = {};
            for (let field in buildings[key]) {
                copy[field] = buildings[key][field];
            }
            if ((copy.t | 0) != 112) {
                if (!copy.prefab) {
                    copy.prefab = 1;
                }
                copy.l = copy.prefab;
                delete copy.prefab;
            }
            out[key] = copy;
        }
        return out;
    }

    /**
     * Inferno-only (QoL #330, 15 October): a kit's buildings and price ({buildings, costs: [r1, r2, r3, shiny] as
     * SecNums}) without the window, for the takeover popup: the server's kits and the player's own, as GetBuildings
     * gives them (`under`: an outpost in the Depths, no Flinger). null for a kit that isn't there (or the three stock
     * kits, only drawn by the window itself).
     */
    public static ioKitOf(kitID: int, under: boolean): any {
        // (13 November: for a takeover: the hall standing there isn't known here, so the kit's hall calcification is priced in full)
        InfernoKits.ioStandingHallFort = 0;
        if (!GLOBAL.INFERNO_ONLY) {
            return null;
        }
        if (InfernoKits.isPlayerSlot(kitID)) {
            return InfernoKits.playerKit(kitID) ? { "buildings": InfernoKits.customBuildings(kitID), "costs": InfernoKits.customCosts(kitID) } : null;
        }
        if (!InfernoKits.usingCustom || !InfernoKits.hasKit(kitID)) {
            return null;
        }
        let buildings: any = InfernoKits.customBuildings(kitID);
        let costs: any[] = InfernoKits.customCosts(kitID);
        return under ? popup_prefab.ioWithoutFlinger(buildings, costs, kitID) : { "buildings": buildings, "costs": costs };
    }

    /**
     * Inferno-only (14 October, QoL #277): an outpost in the Depths of Hell has no Flinger, and the server leaves
     * a kit's out, but the kit still listed it and charged for it. It is taken out of the list, and its build
     * and upgrade costs (up to its kit level) out of the resource price. The Shiny buy-out is unchanged.
     */
    public static ioWithoutFlinger(buildings: any, costs: any[], kitID: int = 0): any {
        let kept: any = {};
        let less: number[] = [0, 0, 0];
        for (let key in buildings) {
            let b: any = buildings[key];
            if ((b.t | 0) != 5) {
                kept[key] = b;
                continue;
            }
            let props: any = GLOBAL.INFERNO_ONLY ? InfernoKits.props()[4] : GLOBAL._buildingProps[4];
            let top: int = Math.max(1, (b.l | 0) || (b.prefab | 0) || 1) | 0;
            for (let level: int = 0; props && props.costs && level < top && level < props.costs.length; level++) {
                less[0] += props.costs[level].r1.Get();
                less[1] += props.costs[level].r2.Get();
                less[2] += props.costs[level].r3.Get();
            }
        }
        let out: any[] = costs ? costs.slice() : [];
        if (kitID > 0 && GLOBAL.INFERNO_ONLY && (InfernoKits.isPlayerSlot(kitID) ? !!InfernoKits.playerKit(kitID) : InfernoKits.usingCustom && InfernoKits.hasKit(kitID))) {
            // (12 November: a kit's price is worked out from its buildings, a player's own as a pre-made one: again,
            // without the Flinger)
            let again: any[] = InfernoKits.customCosts(kitID, kept);
            for (let i: int = 0; i < 3 && i < out.length; i++) {
                out[i] = again[i];
            }
            return { "buildings": kept, "costs": out };
        }
        for (let i: int = 0; i < 3 && i < out.length; i++) {
            out[i] = new SecNum(Math.max(0, Number(out[i].Get()) - less[i]));
        }
        return { "buildings": kept, "costs": out };
    }
}
