import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Timer } from "flash/utils";
import { BASE, Button_CLIP, CREATURELOCKER, CREATURES, EnumYardType, GLOBAL, HOUSING, KEYS, PLEASEWAIT, POPUPSETTINGS, SOUNDS, URLLoaderApi, frame_CLIP } from "@game";

/**
 * Inferno-only: the Designer, for admins (the Designer button next to Admin in the top bar). A list of
 * the outpost kits, every wild tribe level and Moloch's 13 bases, each with Edit. Edit opens the layout
 * as a yard of its own (a "draft", server services/admin/designs.ts), built with the game's own tools:
 * everything is free and finished at once (GLOBAL.ioFreeBuild). Kits keep an outpost's buildings and limits;
 * wild tribes and Moloch's bases have no building limits and no yard edge (GLOBAL.ioDesignFree).
 *
 * While a draft is on screen the design bar under the top bar says which one, with Save (the layout is
 * used from then on), Reset (back to the stock layout), Monsters (tribes and Moloch: how many of each monster
 * live in its Compounds and at what level; the Monsters window), Designer (the list) and Exit (home). Leaving a
 * draft without Save keeps the layout as it was: the next Edit starts afresh from what is saved.
 *
 * Server: POST admin/design (controllers/admin/adminDesign.ts), flag io_design on the draft's load.
 */
export class IoDesigner extends ASObject {
    static {
        as3.fields(this, { _mc: null, _list: null, _tabs: null, _data: null });
    }

    private static readonly W: int = 680;

    private static readonly H: int = 640;

    private static readonly TABS: any[] = [["kits", "Outpost kits"], ["tribes", "Wild tribes"], ["moloch", "Moloch's bases"]];

    private static _tab: int = 1;

    private static _open: IoDesigner = null;

    private static _busy: boolean = false;

    // ---- the Monsters window (tribes and Moloch): the monsters in the yard's Compounds, and their levels
    private static readonly MON_W: int = 620;

    private static readonly MON_H: int = 660;

    private static readonly MAX_OF_ONE: int = 999;

    private static _mon: MovieClip = null;

    private static _monCounts: any = null;

    private static _monLevels: any = null;

    private static _monRoom: TextField = null;
    private _mc: MovieClip;
    private _list: Sprite;
    private _tabs: any[];
    private _data: any;

    public $ctor(data?: any): void {
        this._tabs = [];
        super.$ctor();
        this._data = data;
        this._mc = new MovieClip();
        let fx: int = (-((IoDesigner.W / 2) | 0)) | 0;
        let fy: int = (-((IoDesigner.H / 2) | 0)) | 0;
        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoDesigner.W;
        frame.height = IoDesigner.H;
        frame.x = fx;
        frame.y = fy;
        frame.Setup(true, as3.bind(this, this.close));

        let title: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        title.selectable = false;
        title.mouseEnabled = false;
        title.embedFonts = true;
        title.antiAliasType = AntiAliasType.NORMAL;
        title.width = IoDesigner.W - 56;
        title.height = 30;
        let tf: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        tf.align = TextFormatAlign.CENTER;
        title.defaultTextFormat = tf;
        title.text = "Designer";
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = fx + 28;
        title.y = fy + 24;

        let i: int = 0;
        while (i < IoDesigner.TABS.length) {
            this._tabs.push(this.add(IoDesigner.button(as3.str(IoDesigner.TABS[i][1]), 150, 26, this.tabClick(i)), (fx + 28 + i * 158) | 0, (fy + 64) | 0));
            i++;
        }
        this._list = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._list.x = fx + 28;
        this._list.y = fy + 102;

        let ok: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
        ok.x = -((ok.width * 0.5) | 0);
        ok.y = fy + IoDesigner.H - 58;
        ok.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));

        this.showTab();
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    // ---- the list
    public static Show(e: MouseEvent = null): void {
        if (IoDesigner._open && (!IoDesigner._open._mc || !IoDesigner._open._mc.stage)) {
            IoDesigner._open = null;
        }
        if (IoDesigner._open || IoDesigner._busy || !IoDesigner.isAdmin()) {
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message("Not while the yard is being attacked.");
            return;
        }
        SOUNDS.Play("click1");
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Opening the Designer...");
        IoDesigner.call("list", [], (serverData: any): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            IoDesigner._open = new IoDesigner(serverData);
        }, (message: string): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(message);
        });
    }

    private static isAdmin(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY && GLOBAL._flags && (GLOBAL._flags.io_admin | 0) == 1);
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoDesigner._open == this) {
            IoDesigner._open = null;
        }
    }

    /** Closes the list (the yard is going: BASE.Cleanup). */
    public static ioCloseOpen(): void {
        if (IoDesigner._open) {
            IoDesigner._open.close();
        }
        IoDesigner._open = null;
        IoDesigner.closeMonsters();
    }

    private tabClick(index: int): Function {
        return (e: MouseEvent): void => {
            IoDesigner._tab = index;
            this.showTab();
        };
    }

    private showTab(): void {
        let row: any = null;
        let y: int = 0;
        let i: int = 0;
        let rows: any[] = this._data && as3.is(this._data[IoDesigner.TABS[IoDesigner._tab][0]], Array) ? as3.as(this._data[IoDesigner.TABS[IoDesigner._tab][0]], Array) : [];
        while (this._list.numChildren) {
            this._list.removeChildAt(0);
        }
        i = 0;
        while (i < this._tabs.length) {
            as3.cast(this._tabs[i], Sprite).alpha = Number(i == IoDesigner._tab ? 1 : 0.6);
            i++;
        }
        let help: string = IoDesigner._tab == 0 ? "An outpost kit is designed in an outpost, with an outpost's buildings and limits. Save writes the kit players buy from the kit popup." : IoDesigner._tab == 1 ? "Each level of each tribe's yards. No building limits and no yard edge. Yards already on the map keep their layout until they are made again (Remake)." : "The Gauntlet's gates, I to XIII; the late ones are the Moloch strongholds on the map too. No building limits and no yard edge.";
        let h: TextField = as3.as(this._list.addChild(IoDesigner.label(help, 10, 3811866, false, (IoDesigner.W - 56) | 0, TextFormatAlign.LEFT)), TextField);
        h.y = 0;
        y = 34;
        for (row of as3.values(rows)) {
            this.addRow(row, y);
            y += 22;
        }
    }

    private addRow(row: any, y: int): void {
        let kind: string = null;
        let key: string = null;
        kind = String(row.kind);
        key = String(row.key);
        let name: TextField = as3.as(this._list.addChild(IoDesigner.label(String(row.name), 11, 2759178, true, 270, TextFormatAlign.LEFT)), TextField);
        name.wordWrap = false;
        name.height = 19;
        name.y = y + 2;
        let status: string = row.custom ? (kind == "kit" ? "changed" : "designed") + (row.by ? " by " + row.by : "") : kind == "kit" ? "as exported" : "stock";
        status += " · " + (row.buildings | 0) + " buildings";
        if (kind != "kit") {
            status += " · " + (row.monsters | 0) + " monsters";
        }
        if (row.note) {
            status += " · " + row.note;
        }
        let s: TextField = as3.as(this._list.addChild(IoDesigner.label(status, 9, (row.custom ? 0x8A2A00 : 0x5A4A3A) >>> 0, false, 200, TextFormatAlign.LEFT)), TextField);
        s.wordWrap = false;
        s.height = 17;
        s.x = 272;
        s.y = y + 3;
        let b: Sprite = as3.as(this._list.addChild(IoDesigner.button("Edit", 50, 21, (e: MouseEvent): void => {
            IoDesigner.edit(kind, key);
        })), Sprite);
        b.x = 440;
        b.y = y;
        if (row.custom) {
            b = as3.as(this._list.addChild(IoDesigner.button("Reset", 54, 21, (e: MouseEvent): void => {
                this.resetClick(kind, key, String(row.name));
            })), Sprite);
            b.x = 494;
            b.y = y;
            if (kind != "kit") {
                b = as3.as(this._list.addChild(IoDesigner.button("Remake", 64, 21, (e: MouseEvent): void => {
                    this.remakeClick(kind, key, String(row.name));
                })), Sprite);
                b.x = 552;
                b.y = y;
            }
        }
    }

    private refresh(): void {
        let self: IoDesigner = null;
        self = this;
        IoDesigner.call("list", [], (serverData: any): void => {
            self._data = serverData;
            if (self._mc) {
                self.showTab();
            }
        }, GLOBAL.Message);
    }

    private resetClick(kind: string, key: string, name: string): void {
        let self: IoDesigner = null;
        self = this;
        GLOBAL.Message("<b>Put " + name + " back as it was?</b><br><br>" + (kind == "kit" ? "The kit goes back to how it was before it was first changed in the Designer." : "The stock layout is used again."), "Reset", (): void => {
            IoDesigner.call("reset", [["kind", kind], ["key", key]], (serverData: any): void => {
                self.refresh();
                IoDesigner.afterChange("<b>" + name + " is back to its stock layout.</b>", kind, key, serverData.stored | 0);
            }, GLOBAL.Message);
        });
    }

    private remakeClick(kind: string, key: string, name: string): void {
        GLOBAL.Message("<b>Make " + name + "'s yards on the map again?</b><br><br>Yards made before the layout changed keep their old one until they are made again. This makes them again now, with the layout in use (destroyed yards and yards being attacked right now are left).", "Make again", (): void => {
            IoDesigner.remake(kind, key);
        });
    }

    // ---- opening a layout
    private static edit(kind: string, key: string): void {
        if (IoDesigner._busy) {
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message("Not while the yard is being attacked.");
            return;
        }
        if (GLOBAL.ioDesignMode()) {
            GLOBAL.Message("<b>Leave this design?</b><br><br>Changes you haven't saved with Save are lost.", "Leave", (): void => {
                IoDesigner.open(kind, key);
            });
            return;
        }
        IoDesigner.open(kind, key);
    }

    private static open(kind: string, key: string): void {
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Opening the design...");
        IoDesigner.whenSaved((): void => {
            IoDesigner.call("open", [["kind", kind], ["key", key]], (serverData: any): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                IoDesigner.ioCloseOpen();
                // A kit is designed in an outpost (its buildings and limits); the rest as a main yard.
                BASE.LoadBase(null, 0, Number(serverData.baseid), GLOBAL.e_BASE_MODE.BUILD, false, kind == "kit" ? EnumYardType.OUTPOST : EnumYardType.MAIN_YARD);
            }, (message: string): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                GLOBAL.Message(message);
            });
        });
    }

    /** The monsters the window offers: every Inferno monster there is (and Rezghul while he is one). */
    public static monsterIds(): any[] {
        let out: any[] = [];
        for (const $value of as3.values(CREATURELOCKER.ioTestMonsterIds())) {
            let id: string = as3.str($value);
            // (Hell Freezes Over's monsters are hidden from players, not from the Designer)
            if (CREATURELOCKER._creatures[id] && (!CREATURELOCKER._creatures[id].blocked || CREATURELOCKER.ioIsIceMonster(id))) {
                out.push(id);
            }
        }
        return out;
    }

    /** How many of each the draft has now (as it loaded), and each monster's level. */
    private static readDefenders(): void {
        IoDesigner._monCounts = {};
        IoDesigner._monLevels = {};
        let raw: any = BASE._rawMonsters;
        let from: any = raw && raw.housed ? raw.housed : raw;
        let id: string = null;
        for (id in from) {
            if (as3.is(from[id], Array)) {
                IoDesigner._monCounts[id] = (as3.as(from[id], Array)).length;
            } else if (!isNaN(Number(from[id]))) {
                IoDesigner._monCounts[id] = from[id] | 0;
            }
        }
        for (const $value of as3.values(IoDesigner.monsterIds())) {
            id = as3.str($value);
            let up: any = GLOBAL.player && GLOBAL.player.m_upgrades ? GLOBAL.player.m_upgrades[id] : null;
            IoDesigner._monLevels[id] = Math.max(1, Math.min(6, up && up.level ? up.level | 0 : 1));
            if (!IoDesigner._monCounts[id]) {
                IoDesigner._monCounts[id] = 0;
            }
        }
    }

    private static roomUsed(): int {
        let used: int = 0;
        for (const $value of as3.values(IoDesigner.monsterIds())) {
            let id: string = as3.str($value);
            used = (used + (IoDesigner._monCounts[id] | 0) * (CREATURES.GetProperty(id, "cStorage", 0, true) | 0)) | 0;
        }
        return used;
    }

    private static roomHas(): int {
        HOUSING.HousingSpace();
        return (HOUSING._housingCapacity ? HOUSING._housingCapacity.Get() : 0) | 0;
    }

    public static monstersClick(e: MouseEvent = null): void {
        let design: any = GLOBAL.ioDesign();
        if (IoDesigner._busy || !design || (design.free | 0) != 1) {
            return;
        }
        if (IoDesigner._mon) {
            IoDesigner.closeMonsters();
        }
        IoDesigner.readDefenders();
        let mc: MovieClip = new MovieClip();
        IoDesigner._mon = mc;
        let fx: int = (-((IoDesigner.MON_W / 2) | 0)) | 0;
        let fy: int = (-((IoDesigner.MON_H / 2) | 0)) | 0;
        let frame: frame_CLIP = as3.as(mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoDesigner.MON_W;
        frame.height = IoDesigner.MON_H;
        frame.x = fx;
        frame.y = fy;
        frame.Setup(true, IoDesigner.closeMonsters);
        let title: TextField = as3.as(mc.addChild(IoDesigner.label("Monsters in the Compounds", 16, 2759178, true, (IoDesigner.MON_W - 56) | 0, TextFormatAlign.CENTER)), TextField);
        title.x = fx + 28;
        title.y = fy + 26;
        let help: TextField = as3.as(mc.addChild(IoDesigner.label("How many of each live in this yard's Compounds, and at what level (1-6). They defend it. As many as its Compounds hold (build more here for more room); Save stores them with the layout.", 10, 3811866, false, (IoDesigner.MON_W - 56) | 0, TextFormatAlign.LEFT)), TextField);
        help.x = fx + 28;
        help.y = fy + 56;
        IoDesigner._monRoom = as3.as(mc.addChild(IoDesigner.label("", 11, 2759178, true, (IoDesigner.MON_W - 56) | 0, TextFormatAlign.LEFT)), TextField);
        IoDesigner._monRoom.name = "ioMonRoom";
        IoDesigner._monRoom.x = fx + 28;
        IoDesigner._monRoom.y = fy + 90;
        let y: int = (fy + 116) | 0;
        for (const $value of as3.values(IoDesigner.monsterIds())) {
            let id: string = as3.str($value);
            IoDesigner.addMonsterRow(mc, id, (fx + 28) | 0, y);
            y += 27;
        }
        let apply: Sprite = as3.as(mc.addChild(IoDesigner.button("Apply", 100, 28, IoDesigner.applyMonsters)), Sprite);
        apply.x = -106;
        apply.y = fy + IoDesigner.MON_H - 62;
        let cancel: Sprite = as3.as(mc.addChild(IoDesigner.button("Cancel", 100, 28, IoDesigner.closeMonsters)), Sprite);
        cancel.x = 6;
        cancel.y = fy + IoDesigner.MON_H - 62;
        IoDesigner.showRoom();
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        POPUPSETTINGS.AlignToCenter(mc);
        POPUPSETTINGS.ScaleUp(mc);
    }

    private static addMonsterRow(mc: MovieClip, id: string, x: int, y: int): void {
        let count: TextField = null;
        let level: TextField = null;
        let data: any = CREATURELOCKER._creatures[id];
        let name: TextField = as3.as(mc.addChild(IoDesigner.label(KEYS.Get(as3.str(data.name)), 11, 2759178, true, 150, TextFormatAlign.LEFT)), TextField);
        name.wordWrap = false;
        name.height = 19;
        name.x = x;
        name.y = y + 2;
        let size: TextField = as3.as(mc.addChild(IoDesigner.label((CREATURES.GetProperty(id, "cStorage", 0, true) | 0) + " room", 9, 5917242, false, 60, TextFormatAlign.LEFT)), TextField);
        size.wordWrap = false;
        size.height = 17;
        size.x = x + 150;
        size.y = y + 4;
        count = as3.as(mc.addChild(IoDesigner.label(String(IoDesigner._monCounts[id]), 12, 2759178, true, 44, TextFormatAlign.CENTER)), TextField);
        count.name = "ioMonCount_" + id;
        count.wordWrap = false;
        count.height = 20;
        count.x = x + 290;
        count.y = y + 1;
        level = as3.as(mc.addChild(IoDesigner.label("L" + IoDesigner._monLevels[id], 12, 2759178, true, 34, TextFormatAlign.CENTER)), TextField);
        level.name = "ioMonLevel_" + id;
        level.wordWrap = false;
        level.height = 20;
        level.x = x + 482;
        level.y = y + 1;
        let put: Function = (b: Sprite, bx: int, name: string): void => {
            b.name = name;
            b.x = bx;
            b.y = y;
            mc.addChild(b);
        };
        let changeCount: Function = (by: int): Function => {
            return (e: MouseEvent): void => {
                IoDesigner._monCounts[id] = Math.max(0, Math.min(IoDesigner.MAX_OF_ONE, (IoDesigner._monCounts[id] | 0) + by));
                count.text = String(IoDesigner._monCounts[id]);
                IoDesigner.showRoom();
            };
        };
        let changeLevel: Function = (by: int): Function => {
            return (e: MouseEvent): void => {
                IoDesigner._monLevels[id] = Math.max(1, Math.min(6, (IoDesigner._monLevels[id] | 0) + by));
                level.text = "L" + IoDesigner._monLevels[id];
            };
        };
        put(IoDesigner.button("-10", 34, 22, changeCount(-10)), x + 214, "ioMon_" + id + "_m10");
        put(IoDesigner.button("-", 34, 22, changeCount(-1)), x + 252, "ioMon_" + id + "_m1");
        put(IoDesigner.button("+", 34, 22, changeCount(1)), x + 338, "ioMon_" + id + "_p1");
        put(IoDesigner.button("+10", 34, 22, changeCount(10)), x + 376, "ioMon_" + id + "_p10");
        put(IoDesigner.button("-", 30, 22, changeLevel(-1)), x + 448, "ioMon_" + id + "_lm");
        put(IoDesigner.button("+", 30, 22, changeLevel(1)), x + 520, "ioMon_" + id + "_lp");
    }

    private static showRoom(): void {
        if (!IoDesigner._monRoom) {
            return;
        }
        let used: int = IoDesigner.roomUsed();
        let has: int = IoDesigner.roomHas();
        IoDesigner._monRoom.htmlText = "Room in the Compounds: " + (used > has ? "<font color=\"#CC0000\">" + used + "</font>" : String(used)) + " of " + has + (has <= 0 ? " (this yard has no Compound: build one)" : used > has ? " (too many: take some out or build more Compounds)" : "");
    }

    private static closeMonsters(e: MouseEvent = null): void {
        if (!IoDesigner._mon) {
            return;
        }
        GLOBAL.BlockerRemove();
        if (IoDesigner._mon.parent) {
            IoDesigner._mon.parent.removeChild(IoDesigner._mon);
        }
        IoDesigner._mon = null;
        IoDesigner._monRoom = null;
    }

    /** Puts them in the draft (server), then loads the draft again to show them in its Compounds. */
    private static applyMonsters(e: MouseEvent = null): void {
        let counts: any = null;
        let levels: any = null;
        let baseid: string = null;
        let design: any = GLOBAL.ioDesign();
        if (IoDesigner._busy || !design || !IoDesigner._mon) {
            return;
        }
        let used: int = IoDesigner.roomUsed();
        let has: int = IoDesigner.roomHas();
        if (used > has) {
            GLOBAL.Message(has <= 0 ? "This yard has no Compound to hold them: build one first (it's free here)." : "They need " + used + " room and its Compounds hold " + has + ". Take some out or build more Compounds (no limits here).");
            return;
        }
        counts = {};
        levels = {};
        for (const $value of as3.values(IoDesigner.monsterIds())) {
            let id: string = as3.str($value);
            if ((IoDesigner._monCounts[id] | 0) > 0) {
                counts[id] = IoDesigner._monCounts[id] | 0;
            }
            levels[id] = IoDesigner._monLevels[id] | 0;
        }
        baseid = String(BASE._loadedBaseID);
        IoDesigner._busy = true;
        IoDesigner.closeMonsters();
        PLEASEWAIT.Show("Putting the monsters in...");
        IoDesigner.whenSaved((): void => {
            IoDesigner.call("defenders", [["baseid", baseid], ["monsters", JSON.stringify(counts)], ["levels", JSON.stringify(levels)]], (serverData: any): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                // the draft again, as saved: its buildings and now these monsters
                BASE.LoadBase(null, 0, Number(baseid), GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            }, (message: string): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                GLOBAL.Message(message);
            });
        });
    }

    // ---- the design bar (UI_TOP keeps one while a draft is on screen)
    public static makeBar(): Sprite {
        let bar: Sprite = new Sprite();
        let design: any = GLOBAL.ioDesign();
        bar.graphics.lineStyle(1, 16756816, 1);
        bar.graphics.beginFill(2755076, 0.88);
        let free: boolean = Boolean(design && (design.free | 0) == 1);
        bar.graphics.drawRoundRect(0, 0, free ? 710 : 620, 50, 10, 10);
        bar.graphics.endFill();
        let t: TextField = as3.as(bar.addChild(IoDesigner.label("DESIGNING: " + (design ? String(design.title) : ""), 12, 16766346, true, 600, TextFormatAlign.LEFT)), TextField);
        t.name = "ioTitle";
        t.wordWrap = false;
        t.width = 314;
        t.height = 20;
        t.x = 10;
        t.y = 3;
        IoDesigner.fitText(t, 312);
        let n: TextField = as3.as(bar.addChild(IoDesigner.label(design && (design.free | 0) == 1 ? "Free and instant; no building limits and no yard edge." : "Free and instant; an outpost's buildings and limits.", 9, 14731424, false, 340, TextFormatAlign.LEFT)), TextField);
        n.wordWrap = false;
        n.height = 16;
        n.x = 10;
        n.y = 25;
        let x: int = 330;
        // (tribes and Moloch: Monsters, for the monsters in the Compounds)
        let specs: any[] = free ? [["Save", 64, IoDesigner.saveClick], ["Reset", 64, IoDesigner.barResetClick], ["Monsters", 84, IoDesigner.monstersClick], ["Designer", 84, IoDesigner.Show], ["Exit", 56, IoDesigner.exitClick]] : [["Save", 64, IoDesigner.saveClick], ["Reset", 64, IoDesigner.barResetClick], ["Designer", 84, IoDesigner.Show], ["Exit", 56, IoDesigner.exitClick]];
        for (let spec of as3.values(specs)) {
            let b: Sprite = as3.as(bar.addChild(IoDesigner.button(as3.str(spec[0]), spec[1] | 0, 26, spec[2])), Sprite);
            b.x = x;
            b.y = 12;
            x = (x + ((spec[1] | 0) + 6)) | 0;
        }
        return bar;
    }

    /** Keeps a one-line label within `width`: a smaller size first, then cut short with an ellipsis. */
    private static fitText(t: TextField, width: int): void {
        let tf: TextFormat = t.getTextFormat();
        let size: int = tf.size | 0;
        while (t.textWidth > width && size > 10) {
            size--;
            tf.size = size;
            t.setTextFormat(tf);
        }
        let text: string = t.text;
        while (t.textWidth > width && text.length > 4) {
            text = text.substr(0, text.length - 2);
            t.text = text + "...";
            t.setTextFormat(tf);
        }
    }

    /** Saves the draft, then makes it the layout in use. */
    private static saveClick(e: MouseEvent = null): void {
        let design: any = null;
        design = GLOBAL.ioDesign();
        if (IoDesigner._busy || !design) {
            return;
        }
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Saving the design...");
        IoDesigner.whenSaved((): void => {
            IoDesigner.call("save", [["baseid", String(BASE._loadedBaseID)]], (serverData: any): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                let text: string = "<b>Saved: " + String(serverData.saved) + "</b> (" + (serverData.buildings | 0) + " buildings).";
                if (String(design.kind) == "kit") {
                    text += "<br><br>Players get it from the kit popup from now on.";
                }
                IoDesigner.afterChange(text, String(design.kind), String(design.key), serverData.stored | 0);
            }, (message: string): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                GLOBAL.Message(message);
            });
        });
    }

    private static barResetClick(e: MouseEvent = null): void {
        let kind: string = null;
        let key: string = null;
        let design: any = GLOBAL.ioDesign();
        if (IoDesigner._busy || !design) {
            return;
        }
        kind = String(design.kind);
        key = String(design.key);
        GLOBAL.Message("<b>Put this layout back as it was?</b><br><br>" + (kind == "kit" ? "The kit goes back to how it was before it was first changed in the Designer." : "The stock layout is used again.") + " Changes on screen are lost.", "Reset", (): void => {
            IoDesigner._busy = true;
            IoDesigner.call("reset", [["kind", kind], ["key", key]], (serverData: any): void => {
                IoDesigner._busy = false;
                let stored: int = serverData.stored | 0;
                IoDesigner.open(kind, key);
                if (stored > 0) {
                    IoDesigner.afterChange("<b>Back to the stock layout.</b>", kind, key, stored);
                }
            }, (message: string): void => {
                IoDesigner._busy = false;
                GLOBAL.Message(message);
            });
        });
    }

    private static exitClick(e: MouseEvent = null): void {
        if (IoDesigner._busy) {
            return;
        }
        GLOBAL.Message("<b>Leave the Designer?</b><br><br>Changes you haven't saved with Save are lost.", "Leave", (): void => {
            let home: Function = null;
            IoDesigner._busy = true;
            BASE._blockSave = true;
            // (the draft is gone on the server: nothing more is saved to it; loading the home yard lets saves
            // through again)
            home = (): void => {
                IoDesigner._busy = false;
                IoDesigner.ioCloseOpen();
                BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            };
            IoDesigner.call("close", [], (serverData: any): void => {
                home();
            }, (message: string): void => {
                home();
            });
        });
    }

    /** Tells what happened; for a tribe level or Moloch base with yards stored on the map, offers to remake them. */
    private static afterChange(text: string, kind: string, key: string, stored: int): void {
        if (kind == "kit" || stored <= 0) {
            GLOBAL.Message(text);
            return;
        }
        GLOBAL.Message(text + "<br><br>" + stored + " yard" + (stored == 1 ? "" : "s") + " of it on the map " + (stored == 1 ? "was" : "were") + " made with the old layout. Make " + (stored == 1 ? "it" : "them") + " again now?", "Make again", (): void => {
            IoDesigner.remake(kind, key);
        });
    }

    private static remake(kind: string, key: string): void {
        IoDesigner.call("replace", [["kind", kind], ["key", key]], (serverData: any): void => {
            let n: int = serverData.replaced | 0;
            GLOBAL.Message(n + " yard" + (n == 1 ? "" : "s") + " made again with the layout in use.");
        }, GLOBAL.Message);
    }

    // ---- server
    /** Runs `then` once every change to the yard on screen is saved (at most 8 seconds). */
    private static whenSaved(then: Function): void {
        let deadline: int = 0;
        let wait: Timer = null;
        deadline = (GLOBAL.Timestamp() + 8) | 0;
        wait = new Timer(200);
        try {
            BASE.Save(0, false, true);
        } catch (e) {
        }
        wait.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            let saved: boolean = !BASE._saving && BASE._saveCounterA == BASE._saveCounterB;
            if (saved || GLOBAL.Timestamp() > deadline) {
                wait.stop();
                then();
                return;
            }
            if (!BASE._saving) {
                try {
                    BASE.Save(0, false, true);
                } catch (err) {
                }
            }
        });
        wait.start();
    }

    /** One Designer request; `fail` also runs when no answer comes within 30 seconds. */
    private static call(action: string, vars: any[], ok: Function, fail: Function): void {
        let answered: boolean = false;
        let timeout: Timer = null;
        answered = false;
        timeout = new Timer(30000, 1);
        timeout.addEventListener(TimerEvent.TIMER_COMPLETE, (e: TimerEvent): void => {
            if (!answered) {
                answered = true;
                fail("Designer: no answer from the server. Please try again.");
            }
        });
        timeout.start();
        new URLLoaderApi().load(GLOBAL.serverUrl + "admin/design", [["action", action]].concat(vars), (serverData: any): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            if (serverData && serverData.error == 0) {
                ok(serverData);
            } else {
                fail(serverData && serverData.error ? String(serverData.error) : "Designer: no answer from the server.");
            }
        }, (e: Event): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            fail("Designer: the server could not be reached. Please try again.");
        });
    }

    // ---- helpers
    private add(b: Sprite, x: int, y: int): Sprite {
        this._mc.addChild(b);
        b.x = x;
        b.y = y;
        return b;
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.wordWrap = true;
        field.multiline = true;
        field.width = width;
        field.height = size * 2 + 10;
        let format: TextFormat = new TextFormat("Verdana", size, color, bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    private static button(text: string, width: int, height: int, onClick: Function): Sprite {
        let b: Sprite = null;
        let draw: Function = null;
        b = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        b.name = "io_" + text;
        draw = (fill: uint): void => {
            b.graphics.clear();
            b.graphics.lineStyle(1, 5913114, 1);
            b.graphics.beginFill(fill, 1);
            b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
            b.graphics.endFill();
        };
        draw(0xF2D98C);
        let t: TextField = as3.as(b.addChild(IoDesigner.label(text, 11, 2759178, true, width, TextFormatAlign.CENTER)), TextField);
        t.wordWrap = false;
        t.height = 19;
        t.y = ((height - 19) / 2) | 0;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(0xFFE9A8);
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(0xF2D98C);
        });
        b.addEventListener(MouseEvent.CLICK, onClick);
        return b;
    }
}
