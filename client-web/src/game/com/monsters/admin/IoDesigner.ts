import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { FileFilter, FileReference } from "flash/net";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Timer } from "flash/utils";
import { ATTACK, BASE, BFOUNDATION, BMUSHROOM, Button_CLIP, CellData, CREATURELOCKER, CREATURES, EnumYardType, frame_CLIP, GLOBAL, GRID, HOUSING, InstanceManager, IoKit, IoTestMode, KEYS, PLEASEWAIT, POPUPSETTINGS, SecNum, SOUNDS, URLLoaderApi } from "@game";

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
 *
 * 15 October (QoL #412-#420):
 *  - Save first checks the draft (server "check"; checkLayout here): what it changes against the layout in use
 *    (buildings added, taken away, moved, at another level; monsters), what looks wrong (no Under Hall,
 *    buildings overlapping, more monsters than the Compounds hold), and whether another admin saved the layout
 *    after this draft was made. Save (or Save anyway) goes on; a newer save is only overwritten when asked.
 *  - Tools in the bar: the last 5 saved versions (Use one; Revert to previous), start from another layout's
 *    buildings or copy its monsters, and for a kit its name and price.
 *  - The list says when each layout was saved and by whom; Export and Import (the export script's file).
 *  - QoL #416, Try it in the bar (tribes and Moloch, admin test mode on): a practice attack on the draft on screen,
 *    test mode's (every monster, as many as you like), then back to the draft. The server shows the draft to the
 *    attack as a wild monster yard and never writes it (designs.ts tryItYard; baseSave.ts).
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

    // ---- (QoL #412/#413/#417) the Tools window
    private static readonly TOOLS_W: int = 620;

    private static readonly TOOLS_H: int = 580;

    private static readonly MONTHS: any[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    private static _tools: MovieClip = null;

    private static _toolsData: any = null;

    private static _fromIndex: int = 0;

    private static _fromLabel: TextField = null;

    private static _kitName: TextField = null;

    private static _kitPrice: any[] = null;

    private static _kitAuto: boolean = true;

    private static _kitAutoBtn: Sprite = null;

    // ---- (QoL #416) the draft a Try it is attacking ({baseid, kind, key}), to go back to afterwards
    private static _tryIt: any = null;
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
        // (QoL #420: the Designer's layouts and kits to a file, and such a file back in)
        this.add(IoDesigner.button("Export", 80, 28, IoDesigner.exportClick), (fx + 28) | 0, (fy + IoDesigner.H - 54) | 0);
        this.add(IoDesigner.button("Import", 80, 28, as3.bind(this, this.importClick)), (fx + 114) | 0, (fy + IoDesigner.H - 54) | 0);

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
        IoDesigner.closeTools();
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
        // (15 October, QoL #418: a narrower name, cut to fit, so the status has room for when and by whom)
        let name: TextField = as3.as(this._list.addChild(IoDesigner.label(String(row.name), 11, 2759178, true, 196, TextFormatAlign.LEFT)), TextField);
        name.wordWrap = false;
        name.height = 19;
        name.y = y + 2;
        IoDesigner.fitText(name, 194);
        // (QoL #418: buildings and monsters first, then when it was saved and by whom)
        let status: string = (row.buildings | 0) + " buildings";
        if (kind != "kit") {
            status += " · " + (row.monsters | 0) + " monsters";
        }
        if (row.custom) {
            let at: string = IoDesigner.when(Number(row.at));
            status += " · " + (at != "" ? at : kind == "kit" ? "changed" : "designed") + (row.by ? " by " + row.by : "");
        } else {
            status += " · " + (kind == "kit" ? "as exported" : "stock");
        }
        if ((row.versions | 0) > 0) {
            status += " · " + (row.versions | 0) + " kept";
        }
        if (row.note) {
            status += " · " + row.note;
        }
        let s: TextField = as3.as(this._list.addChild(IoDesigner.label(status, 9, (row.custom ? 0x8A2A00 : 0x5A4A3A) >>> 0, false, 236, TextFormatAlign.LEFT)), TextField);
        s.name = "ioDesignStatus_" + kind + "_" + key;
        s.wordWrap = false;
        s.height = 17;
        s.x = 200;
        s.y = y + 3;
        IoDesigner.fitText(s, 234);
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
        IoDesigner.remakeAsk(kind, key, "<b>Make " + name + "'s yards on the map again?</b><br><br>Yards made before the layout changed keep their old one until they are made again. This makes them again now, with the layout in use (destroyed yards and yards being attacked right now are left).");
    }

    /**
     * 14 October (QoL #286): Remake says how many yards it would make again, and how many of them are damaged
     * (made again, a damaged yard comes back fresh, full health and loot, wiping players' progress on it), and
     * can leave the damaged ones as they are.
     */
    private static remakeAsk(kind: string, key: string, head: string): void {
        IoDesigner.call("storedcount", [["kind", kind], ["key", key]], (r: any): void => {
            let total: int = r.total | 0;
            let untouched: int = r.untouched | 0;
            let damaged: int = (total - untouched) | 0;
            if (total <= 0) {
                GLOBAL.Message(head + "<br><br>No yards of it are stored on the map now.");
                return;
            }
            let text: string = head + "<br><br>" + total + " yard" + (total == 1 ? "" : "s") + ": " + untouched + " untouched, " + damaged + " damaged (players' progress on " + (damaged == 1 ? "it" : "them") + " would be lost).";
            if (damaged > 0 && untouched > 0) {
                GLOBAL.Message(text, "Untouched only (" + untouched + ")", (): void => {
                    IoDesigner.remake(kind, key, true);
                }, null, "All " + total, (): void => {
                    IoDesigner.remake(kind, key, false);
                });
            } else {
                GLOBAL.Message(text, "Make again", (): void => {
                    IoDesigner.remake(kind, key, false);
                });
            }
        }, GLOBAL.Message);
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

    private static open(kind: string, key: string, resume: string = ""): void {
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Opening the design...");
        IoDesigner.whenSaved((): void => {
            IoDesigner.call("open", [["kind", kind], ["key", key], ["resume", resume]], (serverData: any): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                // (14 October, QoL #287: a draft changed since it was opened and never saved is offered back;
                // opening again used to throw it away and start from the saved layout)
                if (serverData.askResume) {
                    let at: Date = new Date(Number(serverData.draftAt) * 1000);
                    GLOBAL.Message("<b>You have an unsaved draft of this.</b><br><br>Last changed " + at.toLocaleDateString() + " " + at.toLocaleTimeString() + ". Continue it, or start again from the saved layout (the draft is lost)?", "Continue draft", (): void => {
                        IoDesigner.open(kind, key, "1");
                    }, null, "Start again", (): void => {
                        IoDesigner.open(kind, key, "0");
                    });
                    return;
                }
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
        let free: boolean = Boolean(design && (design.free | 0) == 1);
        // (the UI kit's obsidian panel, 11 October)
        // (15 October: kits 630 wide, with Tools; it was 620)
        // (QoL #416: tribes and Moloch 730 wide, with Try it and narrower buttons; it was 710)
        if (!IoKit.panel(bar.graphics, 0, 0, free ? 730 : 630, 50)) {
            bar.graphics.lineStyle(1, 16756816, 1);
            bar.graphics.beginFill(2755076, 0.88);
            bar.graphics.drawRoundRect(0, 0, free ? 730 : 630, 50, 10, 10);
            bar.graphics.endFill();
        }
        let t: TextField = as3.as(bar.addChild(IoDesigner.label("DESIGNING: " + (design ? String(design.title) : ""), 12, 16766346, true, 600, TextFormatAlign.LEFT)), TextField);
        t.name = "ioTitle";
        t.wordWrap = false;
        // (15 October: 284 wide, the buttons from 300, room for Tools; it was 314, from 330)
        t.width = 284;
        t.height = 20;
        t.x = 10;
        t.y = 3;
        IoDesigner.fitText(t, 282);
        let n: TextField = as3.as(bar.addChild(IoDesigner.label(design && (design.free | 0) == 1 ? "Free and instant; no building limits and no yard edge." : "Free and instant; an outpost's buildings and limits.", 9, 14731424, false, 288, TextFormatAlign.LEFT)), TextField);
        n.wordWrap = false;
        n.height = 16;
        n.x = 10;
        n.y = 25;
        let x: int = 300;
        // (tribes and Moloch: Monsters, for the monsters in the Compounds; QoL #412/#413/#417: Tools)
        // (QoL #416: and Try it, a practice attack on the draft; the buttons from 300 to 720)
        let specs: any[] = free ? [["Save", 50, IoDesigner.saveClick], ["Reset", 50, IoDesigner.barResetClick], ["Monsters", 70, IoDesigner.monstersClick], ["Designer", 70, IoDesigner.Show], ["Tools", 50, IoDesigner.toolsClick], ["Try it", 50, IoDesigner.tryItClick, "ioTryIt"], ["Exit", 44, IoDesigner.exitClick]] : [["Save", 56, IoDesigner.saveClick], ["Reset", 56, IoDesigner.barResetClick], ["Designer", 76, IoDesigner.Show], ["Tools", 56, IoDesigner.toolsClick], ["Exit", 50, IoDesigner.exitClick]];
        for (let spec of as3.values(specs)) {
            let b: Sprite = as3.as(bar.addChild(IoDesigner.button(as3.str(spec[0]), spec[1] | 0, 26, spec[2])), Sprite);
            if (spec.length > 3) {
                b.name = as3.str(spec[3]);
            }
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

    /**
     * Saves the draft, then makes it the layout in use.
     * 15 October (QoL #414, #415, #419): first the draft is checked (server "check", and checkLayout here) and the
     * admin is shown what Save changes, what looks wrong, and whether someone saved the layout after this draft was
     * made; Save (or Save anyway) goes on from there.
     */
    private static saveClick(e: MouseEvent = null): void {
        let design: any = null;
        let baseid: string = null;
        design = GLOBAL.ioDesign();
        if (IoDesigner._busy || !design) {
            return;
        }
        baseid = String(BASE._loadedBaseID);
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Checking the design...");
        IoDesigner.whenSaved((): void => {
            IoDesigner.call("check", [["baseid", baseid]], (serverData: any): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                IoDesigner.confirmSave(design, baseid, serverData, IoDesigner.checkLayout(design));
            }, (message: string): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                GLOBAL.Message(message);
            });
        });
    }

    /** QoL #414/#415/#419: what Save would do, and Save or Cancel. */
    private static confirmSave(design: any, baseid: string, check: any, warnings: any[]): void {
        let notes: any[] = warnings.concat(as3.is(check.notes, Array) ? as3.as(check.notes, Array) : []);
        let conflict: boolean = (check.conflict | 0) == 1;
        let text: string = "<b>Save " + String(check.title || design.title) + "?</b><br><br>" + IoDesigner.changesText(check);
        if (notes.length > 0) {
            text += "<br><br><font color=\"#B00000\"><b>Check first:</b></font><br>- " + notes.join("<br>- ");
        }
        if (conflict) {
            text += "<br><br><font color=\"#B00000\"><b>" + IoDesigner.savedBy(check) + " saved this layout after you opened it.</b></font> Saving puts yours in its place (theirs is kept with the saved versions: Tools).";
        }
        GLOBAL.Message(text, "Cancel", null, null, notes.length > 0 || conflict ? "Save anyway" : "Save", (): void => {
            IoDesigner.doSave(design, baseid, conflict);
        });
    }

    /** "Bob, 15 Oct 14:05" / "Someone": who saved the layout in use, and when (a check's or a save's answer). */
    private static savedBy(answer: any): string {
        let when: string = IoDesigner.when(Number(answer.at));
        return (answer.by ? String(answer.by) : "Someone") + (when != "" ? " (" + when + ")" : "");
    }

    /** The server's check as text: buildings, then monsters. */
    private static changesText(check: any): string {
        if ((check.unchanged | 0) == 1) {
            return "Nothing has changed since it was last saved.";
        }
        let parts: any[] = [];
        let added: string = IoDesigner.typeCounts(check.added);
        let removed: string = IoDesigner.typeCounts(check.removed);
        if (added != "") {
            parts.push("added " + added);
        }
        if (removed != "") {
            parts.push("taken away " + removed);
        }
        if ((check.moved | 0) > 0) {
            parts.push((check.moved | 0) + " moved");
        }
        if ((check.levels | 0) > 0) {
            parts.push((check.levels | 0) + " at another level");
        }
        let text: string = "<b>Buildings</b> (" + (check.before | 0) + " now, " + (check.after | 0) + " after): " + (parts.length > 0 ? parts.join("; ") : "no changes") + ".";
        if ((check.left | 0) > 0) {
            text += " " + (check.left | 0) + " that aren't outpost buildings are left out of the kit.";
        }
        if (String(check.kind) != "kit") {
            let m: any[] = [];
            for (let row of as3.values(as3.is(check.monsters, Array) ? as3.as(check.monsters, Array) : [])) {
                m.push(IoDesigner.monsterName(String(row[0])) + " " + (row[1] | 0) + " -> " + (row[2] | 0));
            }
            for (let row of as3.values(as3.is(check.levels, Array) ? as3.as(check.levels, Array) : [])) {
                m.push(IoDesigner.monsterName(String(row[0])) + " level " + (row[1] | 0) + " -> " + (row[2] | 0));
            }
            if (m.length > 8) {
                let more: int = (m.length - 8) | 0;
                m = m.slice(0, 8);
                m.push("and " + more + " more");
            }
            text += "<br><b>Monsters:</b> " + (m.length > 0 ? m.join(", ") : "no changes") + ".";
        }
        return text;
    }

    /** {building type: how many} as "2 Cannon Tower, 1 Silo" ("" for none). */
    private static typeCounts(counts: any): string {
        let out: any[] = [];
        let t: string = null;
        for (t in counts) {
            if ((counts[t] | 0) > 0) {
                out.push((counts[t] | 0) + " " + IoDesigner.buildingName(Number(t) | 0));
            }
        }
        return out.join(", ");
    }

    private static buildingName(type: int): string {
        let props: any = GLOBAL._buildingProps ? GLOBAL._buildingProps[type - 1] : null;
        return props && props.name ? KEYS.Get(as3.str(props.name)) : "building " + type;
    }

    private static monsterName(id: string): string {
        let c: any = CREATURELOCKER._creatures[id];
        return c ? KEYS.Get(as3.str(c.name)) : id;
    }

    /**
     * QoL #414: what looks wrong in the yard on screen: no Under Hall (a kit: no outpost hall), buildings standing on
     * each other (their footprints, as the yard's grid has them), more monsters than the Compounds hold.
     */
    public static checkLayout(design: any): any[] {
        let out: any[] = [];
        let kit: boolean = String(design.kind) == "kit";
        let hallType: int = kit ? 112 : 14;
        let hasHall: boolean = false;
        let rects: any[] = [];
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b instanceof BMUSHROOM || b === GLOBAL._newBuilding || !b._mc) {
                continue;
            }
            if (b._type == hallType) {
                hasHall = true;
            }
            if (!b._footprint || b._footprint.length == 0) {
                continue;
            }
            let p: any = GRID.FromISO(b._mc.x, b._mc.y);
            for (let fp of as3.values(b._footprint)) {
                rects.push([b, Number(p.x + fp.x), Number(p.y + fp.y), Number(fp.width), Number(fp.height)]);
            }
        }
        // (a kit without its outpost hall: the server's check says so, Save refuses it)
        if (!hasHall && !kit) {
            out.push("There is no Under Hall.");
        }
        // (overlapping by more than 2 squares each way: rounding leaves neighbours touching)
        let pairs: any = {};
        let n: int = 0;
        let example: string = null;
        for (let i: int = 0; i < rects.length; i++) {
            let a: any[] = rects[i];
            for (let j: int = (i + 1) | 0; j < rects.length; j++) {
                let c: any[] = rects[j];
                if (a[0] === c[0]) {
                    continue;
                }
                let w: number = Math.min(a[1] + a[3], c[1] + c[3]) - Math.max(a[1], c[1]);
                let h: number = Math.min(a[2] + a[4], c[2] + c[4]) - Math.max(a[2], c[2]);
                if (w > 2 && h > 2) {
                    let k: string = Math.min(a[0]._id, c[0]._id) + ":" + Math.max(a[0]._id, c[0]._id);
                    if (!pairs[k]) {
                        pairs[k] = true;
                        n++;
                        if (!example) {
                            example = IoDesigner.buildingName(a[0]._type) + " and " + IoDesigner.buildingName(c[0]._type);
                        }
                    }
                }
            }
        }
        if (n > 0) {
            out.push(n + (n == 1 ? " pair of buildings overlaps" : " pairs of buildings overlap") + " (" + example + (n > 1 ? ", and others" : "") + ").");
        }
        if ((design.free | 0) == 1) {
            IoDesigner.readDefenders();
            let used: int = IoDesigner.roomUsed();
            let has: int = IoDesigner.roomHas();
            if (used > has) {
                out.push("The monsters need " + used + " room and the Compounds hold " + has + ".");
            }
        }
        return out;
    }

    /** Save itself; `force`: over a save made after this draft (QoL #419: else the server answers {conflict}). */
    private static doSave(design: any, baseid: string, force: boolean): void {
        if (IoDesigner._busy) {
            return;
        }
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Saving the design...");
        IoDesigner.whenSaved((): void => {
            IoDesigner.call("save", [["baseid", baseid], ["force", force ? "1" : "0"]], (serverData: any): void => {
                IoDesigner._busy = false;
                PLEASEWAIT.Hide();
                if ((serverData.conflict | 0) == 1) {
                    GLOBAL.Message("<b>" + IoDesigner.savedBy(serverData) + " saved this layout after you opened it.</b><br><br>Save yours in its place? Theirs is kept with the saved versions (Tools).", "Cancel", null, null, "Save mine", (): void => {
                        IoDesigner.doSave(design, baseid, true);
                    });
                    return;
                }
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
                // (the draft goes with the reset: not offered back as unsaved work)
                IoDesigner.open(kind, key, "0");
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

    // ---- 15 October, QoL #416: Try it, a practice attack on the draft on screen
    /**
     * Try it (the design bar, tribes and Moloch): the draft is saved, then attacked as test mode's practice attacks are
     * (any monster, as many as you like, from no yard of the admin's: PopupAttackA's test mode setup, the Gauntlet's
     * load), as a wild monster yard (wmattack; the server shows it as one and writes nothing of the attack anywhere:
     * services/admin/designs.ts tryItYard). The attack's end window brings the admin back to the draft (ioTryItBack).
     * Admin test mode must be on (the server refuses it otherwise).
     */
    public static tryItClick(e: MouseEvent = null): void {
        let design: any = GLOBAL.ioDesign();
        if (!GLOBAL.INFERNO_ONLY || IoDesigner._busy || !design) {
            return;
        }
        if ((design.free | 0) != 1) {
            GLOBAL.Message("Try it is for wild tribe and Moloch layouts.");
            return;
        }
        if (!IoTestMode.on()) {
            GLOBAL.Message("<b>Try it needs admin test mode.</b><br><br>The attack is a test mode practice attack. Switch test mode on from the Admin menu, then open this layout again from the Designer (Continue draft keeps your changes).");
            return;
        }
        if (BASE.ioAttackRunning() || BASE._loading) {
            GLOBAL.Message("Not while the yard is being attacked.");
            return;
        }
        GLOBAL.Message("<b>Try it: attack " + String(design.title) + "?</b><br><br>A practice attack on the layout on screen, as players will find it, with any monster, as many as you like. Nothing of the attack is kept: the draft stays as it is, and you come back to it afterwards. (The layout in use only changes with Save.)", "Cancel", null, null, "Attack", (): void => {
            IoDesigner.startTryIt(design);
        });
    }

    private static startTryIt(design: any): void {
        let baseid: string = null;
        if (IoDesigner._busy || !GLOBAL.ioDesign()) {
            return;
        }
        baseid = String(BASE._loadedBaseID);
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Saving the draft...");
        IoDesigner.whenSaved((): void => {
            let monsterType: string = null;
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            // (the draft has left the screen meanwhile)
            if (!GLOBAL.ioDesign() || String(BASE._loadedBaseID) != baseid || BASE._loading || BASE.ioAttackRunning()) {
                return;
            }
            IoDesigner.ioCloseOpen();
            // test mode's practice attack, as the map's attack window sets it up (PopupAttackA): any monster, as many as
            // you like, flinger 4; and no yard of the admin's in range, so nothing is taken from one (as in a Siege)
            ATTACK._curCreaturesAvailable = new Array();
            for (const $value of as3.values(CREATURELOCKER.ioTestMonsterIds())) {
                monsterType = as3.str($value);
                ATTACK._curCreaturesAvailable[monsterType] = 999;
            }
            GLOBAL._attackerMapResources = { "r1": GLOBAL._resources.r1.Get(), "r2": GLOBAL._resources.r2.Get(), "r3": GLOBAL._resources.r3.Get(), "catapult": new SecNum(Number(GLOBAL._playerCatapultLevel ? GLOBAL._playerCatapultLevel.Get() : 0)), "flinger": new SecNum(4) };
            GLOBAL._attackerCellsInRange = new Vector<CellData>(0, true, CellData);
            GLOBAL._currentCell = null;
            IoDesigner._tryIt = { "baseid": baseid, "kind": String(design.kind), "key": String(design.key) };
            // (nothing more of the yard on screen is saved: the attack loads in its place)
            BASE._blockSave = true;
            BASE.LoadBase(null, 0, Number(baseid), GLOBAL.e_BASE_MODE.WMATTACK, false, EnumYardType.MAIN_YARD);
        });
    }

    /** QoL #416: a Try it's attack is on screen (its end window brings the admin back to the draft: popup_attackend). */
    public static ioTryingIt(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY && IoDesigner._tryIt && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK) && String(BASE._loadedBaseID) == String(IoDesigner._tryIt.baseid));
    }

    /** QoL #416: the end window's button after a Try it. */
    public static ioTryItButton(): string {
        return "Back to the design";
    }

    /** QoL #416: the Try it is over: the draft again, as it was before the attack (the attack wrote nothing to it). */
    public static ioTryItBack(): void {
        let t: any = IoDesigner._tryIt;
        IoDesigner._tryIt = null;
        if (!t) {
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            return;
        }
        BASE.LoadBase(null, 0, Number(t.baseid), GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    /** Tells what happened; for a tribe level or Moloch base with yards stored on the map, offers to remake them. */
    private static afterChange(text: string, kind: string, key: string, stored: int): void {
        if (kind == "kit" || stored <= 0) {
            GLOBAL.Message(text);
            return;
        }
        IoDesigner.remakeAsk(kind, key, text + "<br><br>Yards of it on the map were made with the old layout. Make them again now?");
    }

    private static remake(kind: string, key: string, untouchedOnly: boolean = false): void {
        IoDesigner.call("replace", [["kind", kind], ["key", key], ["untouched", untouchedOnly ? "1" : "0"]], (serverData: any): void => {
            let n: int = serverData.replaced | 0;
            GLOBAL.Message(n + " yard" + (n == 1 ? "" : "s") + " made again with the layout in use.");
        }, GLOBAL.Message);
    }

    // ---- 15 October, QoL #412 / #413 / #417: the Tools window of the design bar
    /** Opens the Tools for the draft on screen (server "tools": its kept versions, the layouts to start from, a kit's name and price). */
    public static toolsClick(e: MouseEvent = null): void {
        let design: any = GLOBAL.ioDesign();
        let baseid: string = null;
        if (IoDesigner._busy || !design) {
            return;
        }
        baseid = String(BASE._loadedBaseID);
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Opening the tools...");
        IoDesigner.call("tools", [["baseid", baseid]], (serverData: any): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            IoDesigner.showTools(design, serverData);
        }, (message: string): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(message);
        });
    }

    private static showTools(design: any, data: any): void {
        let mc: MovieClip = null;
        let versions: any[] = as3.is(data.versions, Array) ? as3.as(data.versions, Array) : [];
        let sources: any[] = as3.is(data.sources, Array) ? as3.as(data.sources, Array) : [];
        let kind: string = String(design.kind);
        let free: boolean = (design.free | 0) == 1;
        IoDesigner.closeTools();
        mc = new MovieClip();
        mc.name = "ioDesignTools";
        IoDesigner._tools = mc;
        IoDesigner._toolsData = data;
        let fx: int = (-((IoDesigner.TOOLS_W / 2) | 0)) | 0;
        let fy: int = (-((IoDesigner.TOOLS_H / 2) | 0)) | 0;
        let x0: int = (fx + 28) | 0;
        let inner: int = (IoDesigner.TOOLS_W - 56) | 0;
        let frame: frame_CLIP = as3.as(mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoDesigner.TOOLS_W;
        frame.height = IoDesigner.TOOLS_H;
        frame.x = fx;
        frame.y = fy;
        frame.Setup(true, IoDesigner.closeTools);
        let title: TextField = as3.as(mc.addChild(IoDesigner.label("Tools: " + String(data.title || design.title), 16, 2759178, true, inner, TextFormatAlign.CENTER)), TextField);
        title.wordWrap = false;
        title.x = x0;
        title.y = fy + 26;
        IoDesigner.fitText(title, (inner - 4) | 0);
        let y: int = (fy + 62) | 0;

        // the kept versions (QoL #412)
        IoDesigner.toolsLabel(mc, "<b>Saved versions</b> (the last " + (data.kept | 0) + " before the one in use" + (data.current && Number(data.current.at) > 0 ? ", which " + IoDesigner.savedBy(data.current) + " saved" : "") + ")", x0, y, (inner - 160) | 0);
        IoDesigner.toolsButton(mc, "Revert to previous", 150, (x0 + inner - 150) | 0, (y - 2) | 0, "ioRevertPrevious", (e: MouseEvent): void => {
            IoDesigner.useVersionAsk(design, versions.length > 0 ? versions[0] : null, true);
        });
        y += 28;
        if (versions.length == 0) {
            IoDesigner.toolsLabel(mc, "None kept yet. Each Save, Reset, revert and import keeps the version it replaces." + (kind != "kit" ? " (Reset puts the stock layout back.)" : ""), x0, y, inner);
        }
        for (let i: int = 0; i < versions.length && i < 5; i++) {
            let v: any = versions[i];
            let line: string = IoDesigner.when(Number(v.at)) + (v.by ? " by " + String(v.by) : "") + " · " + (v.buildings | 0) + " buildings" + (kind != "kit" ? " · " + ((v.monsters | 0) < 0 ? "the stock yard's monsters" : (v.monsters | 0) + " monsters") : "");
            IoDesigner.toolsLabel(mc, line, x0, (y + 3) | 0, (inner - 70) | 0).name = "ioVersion_" + i;
            IoDesigner.toolsButton(mc, "Use", 60, (x0 + inner - 60) | 0, y, "ioVersionUse_" + i, IoDesigner.useClick(design, v));
            y += 26;
        }
        y = (fy + 62 + 28 + 5 * 26 + 12) | 0;

        // start from another layout (QoL #413)
        IoDesigner.toolsLabel(mc, "<b>Start from another layout</b>", x0, y, inner);
        y += 24;
        if (IoDesigner._fromIndex >= sources.length) {
            IoDesigner._fromIndex = 0;
        }
        IoDesigner.toolsButton(mc, "<", 30, x0, y, "ioFromPrev", (e: MouseEvent): void => {
            IoDesigner.moveFrom(-1);
        });
        IoDesigner._fromLabel = IoDesigner.toolsLabel(mc, "", (x0 + 36) | 0, (y + 3) | 0, 300);
        IoDesigner._fromLabel.name = "ioFromName";
        IoDesigner.toolsButton(mc, ">", 30, (x0 + 340) | 0, y, "ioFromNext", (e: MouseEvent): void => {
            IoDesigner.moveFrom(1);
        });
        IoDesigner.moveFrom(0);
        y += 30;
        IoDesigner.toolsButton(mc, "Use its buildings", 160, x0, y, "ioCopyBuildings", (e: MouseEvent): void => {
            IoDesigner.copyClick(design, "buildings");
        });
        if (free) {
            IoDesigner.toolsButton(mc, "Copy its monsters", 160, (x0 + 168) | 0, y, "ioCopyMonsters", (e: MouseEvent): void => {
                IoDesigner.copyClick(design, "monsters");
            });
        }
        y += 30;
        IoDesigner.toolsLabel(mc, "Only the layout on screen changes; Save makes it the one in use. Buildings: the other layout's, as it is in use, in place of these." + (free ? " Monsters: its monsters and their levels in this yard's Compounds." : ""), x0, y, inner);
        y += 40;

        // a kit's name and price (QoL #417)
        if (kind == "kit") {
            let kit: any = data.kit || {};
            IoDesigner.toolsLabel(mc, "<b>Kit name and price</b> (the kit popup)", x0, y, inner);
            y += 24;
            if ((kit.empty | 0) == 1) {
                IoDesigner.toolsLabel(mc, "This kit has no layout yet: save one first, then name and price it.", x0, y, inner);
            } else {
                IoDesigner.toolsLabel(mc, "Name", x0, (y + 3) | 0, 50);
                IoDesigner._kitName = IoDesigner.toolsInput(mc, String(kit.name || ""), 260, (x0 + 54) | 0, y, "ioKitName");
                IoDesigner._kitName.maxChars = 32;
                y += 30;
                let price: any = kit.price;
                IoDesigner._kitAuto = !price || as3.is(price, String);
                IoDesigner._kitAutoBtn = IoDesigner.toolsButton(mc, IoDesigner._kitAuto ? "Auto price" : "Own price", 116, x0, y, "ioKitPriceMode", (e: MouseEvent): void => {
                    IoDesigner._kitAuto = !IoDesigner._kitAuto;
                    IoDesigner.showKitPrice();
                });
                IoDesigner._kitPrice = [];
                let labels: any[] = [["bone", "r1", 36, 76], ["coal", "r2", 36, 76], ["sulfur", "r3", 44, 76], ["shiny", "shiny", 38, 36]];
                let px: int = (x0 + 124) | 0;
                for (let spec of as3.values(labels)) {
                    IoDesigner.toolsLabel(mc, as3.str(spec[0]), px, (y + 3) | 0, spec[2] | 0);
                    px = (px + (spec[2] | 0)) | 0;
                    let value: string = price && !as3.is(price, String) && price[spec[1]] != null ? String(price[spec[1]] | 0) : "";
                    let f: TextField = IoDesigner.toolsInput(mc, value, spec[3] | 0, px, y, "ioKitPrice_" + as3.str(spec[1]));
                    f.restrict = "0-9";
                    IoDesigner._kitPrice.push(f);
                    px = (px + (spec[3] | 0) + 4) | 0;
                }
                IoDesigner.showKitPrice();
                y += 30;
                IoDesigner.toolsButton(mc, "Save name and price", 170, x0, y, "ioKitSave", (e: MouseEvent): void => {
                    IoDesigner.kitSaveClick(design);
                });
                IoDesigner.toolsLabel(mc, "Auto: the price is what its buildings cost. Shiny left empty: worked out from the price.", (x0 + 178) | 0, (y + 1) | 0, (inner - 178) | 0);
            }
        }

        let ok: Button_CLIP = as3.as(mc.addChild(new Button_CLIP()), Button_CLIP);
        ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
        ok.x = -((ok.width * 0.5) | 0);
        ok.y = fy + IoDesigner.TOOLS_H - 58;
        ok.addEventListener(MouseEvent.CLICK, IoDesigner.closeTools);
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        POPUPSETTINGS.AlignToCenter(mc);
        POPUPSETTINGS.ScaleUp(mc);
    }

    private static closeTools(e: MouseEvent = null): void {
        if (!IoDesigner._tools) {
            return;
        }
        GLOBAL.BlockerRemove();
        if (IoDesigner._tools.parent) {
            IoDesigner._tools.parent.removeChild(IoDesigner._tools);
        }
        IoDesigner._tools = null;
        IoDesigner._fromLabel = null;
        IoDesigner._kitName = null;
        IoDesigner._kitPrice = null;
        IoDesigner._kitAutoBtn = null;
    }

    private static toolsLabel(mc: MovieClip, html: string, x: int, y: int, width: int): TextField {
        let t: TextField = as3.as(mc.addChild(IoDesigner.label("", 10, 3811866, false, width, TextFormatAlign.LEFT)), TextField);
        t.htmlText = html;
        t.x = x;
        t.y = y;
        return t;
    }

    private static toolsButton(mc: MovieClip, text: string, width: int, x: int, y: int, name: string, onClick: Function): Sprite {
        let b: Sprite = as3.as(mc.addChild(IoDesigner.button(text, width, 24, onClick)), Sprite);
        b.name = name;
        b.x = x;
        b.y = y;
        return b;
    }

    private static toolsInput(mc: MovieClip, text: string, width: int, x: int, y: int, name: string): TextField {
        let f: TextField = new TextField();
        f.type = TextFieldType.INPUT;
        f.border = true;
        f.borderColor = 9071173;
        f.background = true;
        f.backgroundColor = 16777215;
        f.width = width;
        f.height = 22;
        let format: TextFormat = new TextFormat("Verdana", 11, 0x000000, true);
        f.defaultTextFormat = format;
        f.text = text;
        f.name = name;
        f.x = x;
        f.y = y + 1;
        mc.addChild(f);
        return f;
    }

    /** The layout to start from: the next or previous one (0: as it is). */
    private static moveFrom(by: int): void {
        let sources: any[] = IoDesigner._toolsData && as3.is(IoDesigner._toolsData.sources, Array) ? as3.as(IoDesigner._toolsData.sources, Array) : [];
        if (!IoDesigner._fromLabel) {
            return;
        }
        if (sources.length == 0) {
            IoDesigner._fromLabel.htmlText = "<b>(no other layouts)</b>";
            return;
        }
        IoDesigner._fromIndex = (((IoDesigner._fromIndex + by) % sources.length + sources.length) % sources.length) | 0;
        IoDesigner._fromLabel.htmlText = "<b>" + String(sources[IoDesigner._fromIndex].name) + "</b>  (" + (IoDesigner._fromIndex + 1) + " of " + sources.length + ")";
    }

    private static copyClick(design: any, what: string): void {
        let sources: any[] = IoDesigner._toolsData && as3.is(IoDesigner._toolsData.sources, Array) ? as3.as(IoDesigner._toolsData.sources, Array) : [];
        let src: any = sources.length > 0 ? sources[IoDesigner._fromIndex] : null;
        let baseid: string = String(BASE._loadedBaseID);
        let buildings: boolean = what == "buildings";
        if (!src || IoDesigner._busy) {
            return;
        }
        GLOBAL.Message("<b>" + (buildings ? "Start from " + String(src.name) + "'s buildings?" : "Copy " + String(src.name) + "'s monsters?") + "</b><br><br>" + (buildings ? "The buildings on screen are put away and its buildings, as it is in use now, put in their place." : "The monsters in this yard's Compounds, and their levels, become its monsters.") + " Only this draft changes: Save makes it the layout in use.", "Cancel", null, null, buildings ? "Use its buildings" : "Copy its monsters", (): void => {
            IoDesigner.closeTools();
            IoDesigner._busy = true;
            PLEASEWAIT.Show(buildings ? "Taking its buildings..." : "Taking its monsters...");
            IoDesigner.whenSaved((): void => {
                // (nothing from the yard on screen may be saved over what comes from the server)
                BASE._blockSave = true;
                IoDesigner.call("copyfrom", [["baseid", baseid], ["fromkind", String(src.kind)], ["fromkey", String(src.key)], ["what", what]], (serverData: any): void => {
                    IoDesigner._busy = false;
                    PLEASEWAIT.Hide();
                    BASE.LoadBase(null, 0, Number(baseid), GLOBAL.e_BASE_MODE.BUILD, false, String(design.kind) == "kit" ? EnumYardType.OUTPOST : EnumYardType.MAIN_YARD);
                }, (message: string): void => {
                    IoDesigner._busy = false;
                    PLEASEWAIT.Hide();
                    BASE._blockSave = false;
                    GLOBAL.Message(message);
                });
            });
        });
    }

    private static useClick(design: any, v: any): Function {
        return (e: MouseEvent): void => {
            IoDesigner.useVersionAsk(design, v, false);
        };
    }

    /** QoL #412: a kept version in use again (the one in use is kept in its place); the draft is made again from it. */
    private static useVersionAsk(design: any, v: any, previous: boolean): void {
        let kind: string = String(design.kind);
        let key: string = String(design.key);
        if (IoDesigner._busy) {
            return;
        }
        if (!v) {
            GLOBAL.Message("No saved versions of this layout are kept yet." + (kind != "kit" ? " Reset puts the stock layout back." : ""));
            return;
        }
        let saved: string = IoDesigner.when(Number(v.at)) + (v.by ? " by " + String(v.by) : "");
        GLOBAL.Message("<b>" + (previous ? "Revert to the previous version?" : "Use this version?") + "</b><br><br>The version saved " + saved + " (" + (v.buildings | 0) + " buildings) becomes the layout in use now; the one in use is kept with the saved versions. Changes on screen that aren't saved are lost.", "Cancel", null, null, previous ? "Revert" : "Use it", (): void => {
            IoDesigner.closeTools();
            IoDesigner._busy = true;
            IoDesigner.call("useversion", [["kind", kind], ["key", key], ["id", String(v.id)]], (serverData: any): void => {
                IoDesigner._busy = false;
                IoDesigner.open(kind, key, "0");
                IoDesigner.afterChange("<b>" + String(serverData.saved) + ": the version saved " + saved + " is in use again</b> (" + (serverData.buildings | 0) + " buildings).", kind, key, serverData.stored | 0);
            }, (message: string): void => {
                IoDesigner._busy = false;
                GLOBAL.Message(message);
            });
        });
    }

    private static showKitPrice(): void {
        if (IoDesigner._kitAutoBtn) {
            as3.cast(IoDesigner._kitAutoBtn.getChildAt((IoDesigner._kitAutoBtn.numChildren - 1) | 0), TextField).text = IoDesigner._kitAuto ? "Auto price" : "Own price";
        }
        for (let f of as3.values(IoDesigner._kitPrice || [])) {
            as3.cast(f, TextField).alpha = IoDesigner._kitAuto ? 0.4 : 1;
            as3.cast(f, TextField).type = IoDesigner._kitAuto ? TextFieldType.DYNAMIC : TextFieldType.INPUT;
        }
    }

    /** QoL #417: the kit's name and price written to the kit file (its layout as it is). */
    private static kitSaveClick(design: any): void {
        let key: string = String(design.key);
        let price: string = "auto";
        if (IoDesigner._busy || !IoDesigner._kitName || !IoDesigner._kitPrice) {
            return;
        }
        if (!IoDesigner._kitAuto) {
            let v: any[] = [];
            for (let f of as3.values(IoDesigner._kitPrice)) {
                v.push(as3.cast(f, TextField).text.replace(/[^0-9]/g, ""));
            }
            if (v[0] == "" || v[1] == "" || v[2] == "") {
                GLOBAL.Message("Give the bone, coal and sulfur of the price (0 for none), or choose Auto price.");
                return;
            }
            price = JSON.stringify({ "r1": Number(v[0]), "r2": Number(v[1]), "r3": Number(v[2]), "shiny": v[3] == "" ? null : Number(v[3]) });
        }
        IoDesigner._busy = true;
        IoDesigner.call("kitinfo", [["key", key], ["name", IoDesigner._kitName.text], ["price", price]], (serverData: any): void => {
            IoDesigner._busy = false;
            let p: any = serverData.price;
            GLOBAL.Message("<b>Kit " + key + " is \"" + String(serverData.name) + "\" now</b>, " + (!p || as3.is(p, String) ? "at the auto price" : "for " + (p.r1 | 0) + " bone, " + (p.r2 | 0) + " coal, " + (p.r3 | 0) + " sulfur or " + (p.shiny | 0) + " shiny") + ". Players see it in the kit popup.");
        }, (message: string): void => {
            IoDesigner._busy = false;
            GLOBAL.Message(message);
        });
    }

    // ---- 15 October, QoL #420: export and import
    /** The Designer's layouts and kits as one file (the format of scripts/export-designs.ts), downloaded. */
    private static exportClick(e: MouseEvent = null): void {
        if (IoDesigner._busy) {
            return;
        }
        IoDesigner._busy = true;
        PLEASEWAIT.Show("Exporting the designs...");
        IoDesigner.call("export", [], (serverData: any): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            let d: Date = new Date();
            let stamp: string = d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate();
            try {
                new FileReference().save(String(serverData.file), "inferno-designs-" + stamp + ".json");
            } catch (err) {
                GLOBAL.Message("Files can't be saved here.");
                return;
            }
            GLOBAL.Message("<b>Exported</b> " + (serverData.designs | 0) + " designed layouts and " + (serverData.kits | 0) + " kits to inferno-designs-" + stamp + ".json.");
        }, (message: string): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(message);
        });
    }

    /** A designs file opened and looked at by the server first; Import puts it in use. */
    private importClick(e: MouseEvent = null): void {
        let file: FileReference = null;
        let self: IoDesigner = this;
        if (IoDesigner._busy) {
            return;
        }
        file = new FileReference();
        file.addEventListener(Event.SELECT, (ev: Event): void => {
            file.load();
        });
        file.addEventListener(Event.COMPLETE, (ev: Event): void => {
            if (!file.data || file.data.length == 0) {
                GLOBAL.Message("That file is empty.");
                return;
            }
            if (file.data.length > 6000000) {
                GLOBAL.Message("That file is too big to be a designs file.");
                return;
            }
            file.data.position = 0;
            IoDesigner.importSend(self, file.data.readUTFBytes(file.data.length), false);
        });
        try {
            file.browse([new FileFilter("Designer exports (*.json)", "*.json")]);
        } catch (err) {
            GLOBAL.Message("Files can't be opened here.");
        }
    }

    private static importSend(list: IoDesigner, text: string, apply: boolean): void {
        IoDesigner._busy = true;
        PLEASEWAIT.Show(apply ? "Importing the designs..." : "Reading the file...");
        IoDesigner.call("import", [["file", text], ["apply", apply ? "1" : "0"]], (serverData: any): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            let kits: any[] = as3.is(serverData.kits, Array) ? as3.as(serverData.kits, Array) : [];
            let kitsChanged: int = 0;
            let kitText: any[] = [];
            for (let k of as3.values(kits)) {
                kitText.push((k.slot | 0) + " \"" + String(k.name) + "\" (" + (k.buildings | 0) + " buildings" + ((k.changed | 0) == 1 ? ", differs" : ", the same") + ")");
                if ((k.changed | 0) == 1) {
                    kitsChanged++;
                }
            }
            let skipped: any[] = as3.is(serverData.skipped, Array) ? as3.as(serverData.skipped, Array) : [];
            let skippedText: string = skipped.length > 0 ? "<br><br><b>Left out (" + (serverData.skippedCount | 0) + "):</b> " + skipped.join("; ") + ((serverData.skippedCount | 0) > skipped.length ? "; ..." : "") : "";
            if (!apply) {
                let changed: int = ((serverData.tribesChanged | 0) + (serverData.molochChanged | 0) + kitsChanged) | 0;
                let msg: string = "<b>A designs file" + (serverData.exportedAt ? " exported " + String(serverData.exportedAt).substr(0, 16).replace("T", " ") + " (UTC)" : "") + "</b><br><br>Wild tribe layouts: " + (serverData.tribes | 0) + " (" + (serverData.tribesChanged | 0) + " differ from the ones in use)<br>Moloch bases: " + (serverData.moloch | 0) + " (" + (serverData.molochChanged | 0) + " differ)<br>Kits: " + (kitText.length > 0 ? kitText.join(", ") : "none") + skippedText;
                if (changed == 0) {
                    GLOBAL.Message(msg + "<br><br>Nothing in it differs from what is in use.");
                    return;
                }
                GLOBAL.Message(msg + "<br><br>Import puts the " + changed + " that differ in use (layouts and kits it has nothing for stay as they are). Each one replaced is kept with its saved versions first (Tools: revert).", "Cancel", null, null, "Import", (): void => {
                    IoDesigner.importSend(list, text, true);
                });
                return;
            }
            let layouts: int = serverData.layoutsReplaced | 0;
            GLOBAL.Message("<b>Imported:</b> " + layouts + " layouts and " + (serverData.kitsReplaced | 0) + " kits replaced." + skippedText + (layouts > 0 ? "<br><br>Yards already on the map keep their old layouts until they are made again (Remake, in the list)." : ""));
            if (list && list._mc) {
                list.refresh();
            }
        }, (message: string): void => {
            IoDesigner._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(message);
        });
    }

    /** "15 Oct 14:05" (with the year when not this one); "" for none. */
    private static when(at: number): string {
        if (!(at > 0)) {
            return "";
        }
        let d: Date = new Date(at * 1000);
        let hh: int = d.getHours() | 0;
        let mm: int = d.getMinutes() | 0;
        return d.getDate() + " " + as3.str(IoDesigner.MONTHS[d.getMonth()]) + (d.getFullYear() != new Date().getFullYear() ? " " + d.getFullYear() : "") + " " + (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
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
        // (11 October: the game's own stock button)
        let face: MovieClip = IoKit.stockFace(b, width, height, false);
        draw = (fill: uint): void => {
            IoKit.stockState(face, fill != 0xF2D98C, true);
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
