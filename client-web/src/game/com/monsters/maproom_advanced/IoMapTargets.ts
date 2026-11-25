import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { DisplayObject, Graphics, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { TextField } from "flash/text";
import { GLOBAL, IoMapFilters, IoMapLod, IoMapSnapshot, IoMapUi, IoScrollPane, IoUnderworld, KEYS, LOGIN, SOUNDS, TRIBES } from "@game";

/**
 * Inferno-only (QoL #74, 15 October): Targets, a button on the map room window's top edge, left of Back and Recent.
 * It opens a list of every yard within your reach: the cells your yards' flingers reach (as the world map draws your
 * range, IoMapFilters.rangePixels), in the world above. Players' main yards and outposts and tribe yards, each with its
 * type, level, damage, the protection it has left and how far it is from your nearest yard. Sortable by any of those
 * (a click on a column's name; again turns it round), All / Players / Tribe yards, and Damaged only. The Filters'
 * target filters (level, protected, locked) apply too. Go goes there; Attack goes there and opens the yard's window, as
 * a click on the map does, and presses its Attack (or Take over) when it can (MapRoom.ioAttackCell).
 *
 * Everything comes from the world snapshot (IoMapSnapshot, at most 5 minutes old): nothing is asked of the server.
 * The Depths of Hell's yards are not listed (they are reached through the portals: the map shows that range).
 */
export class IoMapTargets extends Sprite {
    static {
        as3.fields(this, { _button: null, _panel: null, _pane: null, _onGo: null, _onAttack: null, _areaOf: null, _all: null, _builtVersion: -1, _builtFilters: -1, _builtMinute: -1, _shown: 0, _panelH: 0 });
    }

    private static readonly BUTTON_W: int = 74;

    private static readonly BUTTON_H: int = 22;

    private static readonly PANEL_W: int = 440;

    private static readonly ROW_H: int = 30;

    /** Rows drawn at a time ("Show more" adds as many again). */
    private static readonly PAGE: int = 100;

    /** The columns: [key, x, width] in a row (the name's column is the rest, from 18). */
    private static readonly COLUMNS: any[] = [["name", 18, 150], ["level", 170, 34], ["damage", 206, 42], ["protection", 250, 58], ["distance", 310, 30]];

    /** The list's order and what it shows (for the session). */
    private static s_sort: string = "distance";

    private static s_desc: boolean = false;

    private static s_kind: string = "all";

    private static s_damagedOnly: boolean = false;

    private _button: MovieClip;
    private _panel: Sprite;
    private _pane: IoScrollPane;
    private _onGo: Function;
    private _onAttack: Function;
    private _areaOf: Function;
    /** Every target in reach, sorted (before the page limit). */
    private _all: any[];
    private _builtVersion: int;
    private _builtFilters: int;
    private _builtMinute: int;
    private _shown: int;
    private _panelH: int;

    /** onGo(x, y), onAttack(x, y); areaOf(): the map's area, in the parent's coordinates (the list stays over it). */
    public $ctor(onGo?: Function, onAttack?: Function, areaOf?: Function): void {
        super.$ctor();
        this.name = "ioMap3Targets";
        this._onGo = onGo;
        this._onAttack = onAttack;
        this._areaOf = areaOf;
        this._button = IoMapUi.button(KEYS.Get("io_map3_targets"), IoMapTargets.BUTTON_W, IoMapTargets.BUTTON_H, (e: MouseEvent): void => {
            if (this._panel) {
                this.Close();
            } else {
                this.open();
            }
        }, "gold", 10);
        this._button.name = "ioMap3TargetsButton";
        this.addChild(this._button);
        this.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.addEventListener(MouseEvent.MOUSE_WHEEL, (e: MouseEvent): void => {
            e.stopPropagation();
        });
    }

    public static get WIDTH(): int {
        return IoMapTargets.BUTTON_W;
    }

    public get isOpen(): boolean {
        return this._panel != null;
    }

    // ---- what is in reach
    /** The player's yards up here, [x, y] (the Depths' are left out: they reach only through the portals). */
    private static ownYards(): any[] {
        let out: any[] = [];
        if (GLOBAL._mapHome && !IoUnderworld.isUnder(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0)) {
            out.push([GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0]);
        }
        for (let p of as3.values(GLOBAL._mapOutpost)) {
            if (p && !IoUnderworld.isUnder(p.x | 0, p.y | 0)) {
                out.push([p.x | 0, p.y | 0]);
            }
        }
        return out;
    }

    /**
     * How many cells from the nearest of these yards (the map's hex distance, across the world's wrapped edges: the
     * nearest copy of the place each way), or -1 with none.
     */
    public static distanceFrom(yards: any[], cellX: int, cellY: int): int {
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        let best: int = -1;
        for (let yard of as3.values(yards)) {
            let tx: int = (cellX + Math.round(((yard[0] | 0) - cellX) / w) * w) | 0;
            let ty: int = (cellY + Math.round(((yard[1] | 0) - cellY) / h) * h) | 0;
            let d: int = IoUnderworld.hexDistance(yard[0] | 0, yard[1] | 0, tx, ty);
            if (best < 0 || d < best) {
                best = d;
            }
        }
        return best;
    }

    /** (QoL #76 too) How far a place is from the player's nearest yard up here (-1: not known, or in the Depths). */
    public static distanceToNearest(cellX: int, cellY: int): int {
        if (!IoMapSnapshot.ready || IoUnderworld.isUnder(cellX, cellY)) {
            return -1;
        }
        return IoMapTargets.distanceFrom(IoMapTargets.ownYards(), cellX, cellY);
    }

    /**
     * Every yard within reach, from the snapshot: { x, y, kind (2 main yard, 3 outpost, 1 tribe yard), name, level,
     * damage, protectedLeft (seconds), ready (a tribe yard to take over), locked, relation, distance }. Null before the snapshot.
     */
    public static build(): any[] {
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        let pixels: Vector<uint> = null;
        let yards: any[] = null;
        let out: any[] = [];
        let now: int = GLOBAL.Timestamp();
        let x: int = 0;
        let y: int = 0;
        if (!IoMapSnapshot.ready) {
            return null;
        }
        pixels = IoMapFilters.rangePixels();
        if (!pixels || pixels.length != w * h) {
            return out;
        }
        yards = IoMapTargets.ownYards();
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                if ((as3.vget(pixels, y * w + x) >>> 0) == 0) {
                    continue;
                }
                let entry: any[] = IoMapSnapshot.EntryAt(x, y);
                let target: any = null;
                if (entry && (entry[2] | 0) >= 2) {
                    let uid: int = entry[3] | 0;
                    if (uid == LOGIN._playerID) {
                        continue;
                    }
                    let player: any = IoMapSnapshot.PlayerInfo(uid) || {};
                    let made: any = IoMapSnapshot.CellAt(x, y) || {};
                    let until: int = entry[9] | 0;
                    target = { "kind": entry[2] | 0, "name": String(player.name || "?"), "level": (player.level | 0) || (entry[11] | 0), "damage": made.dm | 0, "protectedLeft": until > now ? until - now : 0, "ready": false, "locked": (made.lo | 0) != 0, "relation": IoMapUi.relation(uid, player.alliance | 0) };
                } else {
                    let wild: any = IoMapSnapshot.WildAt(x, y);
                    if (!wild) {
                        continue;
                    }
                    target = { "kind": 1, "name": TRIBES.DisplayName(String(wild.tribe)), "level": wild.level | 0, "damage": entry ? entry[8] | 0 : 0, "protectedLeft": 0, "ready": entry != null && (entry[10] | 0) != 0, "locked": entry != null && (entry[12] | 0) != 0, "relation": -1 };
                }
                target.x = x;
                target.y = y;
                target.distance = IoMapTargets.distanceFrom(yards, x, y);
                out.push(target);
            }
        }
        return out;
    }

    /** What the list shows of them: the kind chosen, Damaged only, and the Filters' target filters. */
    private static shows(t: any): boolean {
        if (IoMapTargets.s_kind == "players" && t.kind < 2 || IoMapTargets.s_kind == "tribes" && t.kind != 1) {
            return false;
        }
        if (IoMapTargets.s_damagedOnly && t.damage <= 0 && !t.ready) {
            return false;
        }
        return IoMapFilters.targetOk(t.level | 0, (t.protectedLeft | 0) > 0, Boolean(t.locked), t.x | 0, t.y | 0, false);
    }

    private static compare(a: any, b: any): int {
        let key: string = IoMapTargets.s_sort;
        let d: number = 0;
        if (key == "name") {
            d = String(a.name).toLowerCase() < String(b.name).toLowerCase() ? -1 : (String(a.name).toLowerCase() > String(b.name).toLowerCase() ? 1 : 0);
        } else if (key == "damage") {
            // (a tribe yard ready to take over counts as the most damaged)
            d = ((a.ready ? 101 : a.damage) - (b.ready ? 101 : b.damage));
        } else if (key == "protection") {
            d = (a.protectedLeft | 0) - (b.protectedLeft | 0);
        } else if (key == "level") {
            d = (a.level | 0) - (b.level | 0);
        } else {
            d = (a.distance | 0) - (b.distance | 0);
        }
        if (IoMapTargets.s_desc) {
            d = -d;
        }
        if (d == 0) {
            d = (a.distance | 0) - (b.distance | 0);
        }
        if (d == 0) {
            d = ((b.level | 0) - (a.level | 0));
        }
        return (d < 0 ? -1 : (d > 0 ? 1 : 0)) | 0;
    }

    // ---- the list
    private rebuild(): void {
        let all: any[] = IoMapTargets.build();
        this._builtVersion = IoMapSnapshot.version;
        this._builtFilters = IoMapFilters.version;
        this._all = null;
        if (all) {
            this._all = [];
            for (let t of as3.values(all)) {
                if (IoMapTargets.shows(t)) {
                    this._all.push(t);
                }
            }
            as3.sort(this._all, IoMapTargets.compare);
        }
    }

    private open(keepOffset: boolean = false): void {
        let offset: number = keepOffset && this._pane ? this._pane.offset : 0;
        let w: int = IoMapTargets.PANEL_W;
        let y: int = 8;
        let area: Rectangle = this._areaOf != null ? as3.as(this._areaOf(), Rectangle) : null;
        let title: TextField = null;
        let close: Sprite = null;
        let maxH: int = 0;
        let listTop: int = 0;
        let rowsH: int = 0;
        if (!keepOffset) {
            this._shown = IoMapTargets.PAGE;
        }
        this.Close();
        this.rebuild();
        this._builtMinute = (GLOBAL.Timestamp() / 60) | 0;
        this._panel = new Sprite();
        this._panel.name = "ioMap3TargetsPanel";
        title = IoMapUi.label(KEYS.Get("io_map3_targets_title"), 10, IoMapUi.MUTED, true, 200);
        title.x = 10;
        title.y = y;
        this._panel.addChild(title);
        if (this._all) {
            let count: TextField = IoMapUi.label(KEYS.Get(this._all.length == 1 ? "io_map3_targets_one" : "io_map3_targets_n", { "v1": GLOBAL.FormatNumber(this._all.length) }), 10, IoMapUi.MUTED, false, 150, "right");
            count.name = "ioMap3TargetsCount";
            count.x = w - 34 - 150;
            count.y = y;
            this._panel.addChild(count);
        }
        close = new Sprite();
        IoMapUi.hitArea(close.graphics, 18, 18);
        IoMapUi.cross(close.graphics, 5, 5, 8, IoMapUi.MUTED);
        close.name = "ioMap3TargetsClose";
        close.x = w - 24;
        close.y = y - 1;
        close.buttonMode = true;
        close.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("close");
            this.Close();
        });
        this._panel.addChild(close);
        y += 22;
        // All / Players / Tribe yards, and Damaged only
        let x: int = 10;
        for (let kind of as3.values(["all", "players", "tribes"])) {
            let k: string = as3.str(kind);
            let b: MovieClip = IoMapUi.button(KEYS.Get("io_map3_targets_" + k), k == "tribes" ? 80 : 60, 20, (e: MouseEvent): void => {
                if (IoMapTargets.s_kind != k) {
                    IoMapTargets.s_kind = k;
                    this.open();
                }
            }, IoMapTargets.s_kind == k ? "gold" : "grey", 9);
            b.name = "ioMap3TargetsKind_" + k;
            b.x = x;
            b.y = y;
            this._panel.addChild(b);
            x += (k == "tribes" ? 80 : 60) + 4;
        }
        let damaged: MovieClip = IoMapUi.checkbox(KEYS.Get("io_map3_targets_damaged"), IoMapTargets.s_damagedOnly, (on: boolean): void => {
            IoMapTargets.s_damagedOnly = on;
            this.open();
        }, 130);
        damaged.name = "ioMap3TargetsDamaged";
        damaged.x = x + 10;
        damaged.y = y;
        this._panel.addChild(damaged);
        y += 26;
        // the columns' names: a click sorts by it
        for (let column of as3.values(IoMapTargets.COLUMNS)) {
            this._panel.addChild(this.columnHead(as3.str(column[0]), (column[1] | 0) + 6, y, column[2] | 0));
        }
        y += 18;
        listTop = y;
        // as tall as the map lets it be under the button
        maxH = area ? (area.bottom - (this.y + IoMapTargets.BUTTON_H + 8) - 10) | 0 : 420;
        maxH = Math.max(160, maxH) | 0;
        let content: Sprite = new Sprite();
        rowsH = this.fillRows(content, (w - 12 - IoScrollPane.BAR_W - 2) | 0);
        let paneH: int = Math.max(40, Math.min(rowsH, maxH - listTop - 34)) | 0;
        this._pane = new IoScrollPane((w - 12) | 0, paneH);
        this._pane.x = 6;
        this._pane.y = listTop;
        this._pane.content.addChild(content);
        this._panel.addChild(this._pane);
        this._pane.refresh(rowsH);
        y = (listTop + paneH + 6) | 0;
        let note: TextField = IoMapUi.label("", 9, IoMapUi.MUTED, false, (w - 120) | 0);
        note.multiline = true;
        note.wordWrap = true;
        note.htmlText = KEYS.Get("io_map3_targets_note") + (IoMapFilters.targeting ? " " + KEYS.Get("io_map3_targets_filters") : "");
        note.height = 26;
        note.x = 10;
        note.y = y;
        this._panel.addChild(note);
        if (this._all && this._all.length > this._shown) {
            let more: MovieClip = IoMapUi.button(KEYS.Get("io_map3_targets_more", { "v1": Math.min(IoMapTargets.PAGE, this._all.length - this._shown) }), 100, 20, (e: MouseEvent): void => {
                this._shown += IoMapTargets.PAGE;
                this.open(true);
            }, "grey", 9);
            more.name = "ioMap3TargetsMore";
            more.x = w - 110;
            more.y = y;
            this._panel.addChild(more);
        }
        y += 28;
        this._panelH = y;
        IoMapUi.roundBox(this._panel.graphics, 0, 0, w, y, IoMapUi.PAPER, 1, IoMapUi.EDGE, 8, 2);
        // under the button, inside the map's area
        this._panel.y = IoMapTargets.BUTTON_H + 8;
        this._panel.x = 0;
        if (area) {
            this._panel.x = Math.round(Math.max(area.x + 6 - this.x, Math.min(0, area.right - 6 - w - this.x)));
        }
        this.addChild(this._panel);
        if (offset > 0) {
            this._pane.scrollTo(offset);
        }
    }

    /** A column's name, with an arrow on the one the list is sorted by. */
    private columnHead(key: string, x: int, y: int, width: int): Sprite {
        let head: Sprite = new Sprite();
        let on: boolean = IoMapTargets.s_sort == key;
        let text: TextField = IoMapUi.label(KEYS.Get("io_map3_col_" + key) + (on ? (IoMapTargets.s_desc ? " ▼" : " ▲") : ""), 9, (on ? IoMapUi.INK : IoMapUi.MUTED) >>> 0, true, width + (key == "name" ? 0 : 12), key == "name" ? "left" : "center");
        GLOBAL.ioFitText(text, 7);
        head.name = "ioMap3TargetsSort_" + key;
        head.addChild(text);
        IoMapUi.hitArea(head.graphics, text.width, 16);
        head.x = key == "name" ? x : x - 6;
        head.y = y;
        head.buttonMode = true;
        head.mouseChildren = false;
        head.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            if (IoMapTargets.s_sort == key) {
                IoMapTargets.s_desc = !IoMapTargets.s_desc;
            } else {
                IoMapTargets.s_sort = key;
                // (the most damaged, the most protection, the highest first; the nearest, the names A to Z)
                IoMapTargets.s_desc = key == "damage" || key == "protection" || key == "level";
            }
            this.open();
        });
        return head;
    }

    /** The rows (up to _shown of them), or a note. Returns their height. */
    private fillRows(content: Sprite, w: int): int {
        let y: int = 0;
        let i: int = 0;
        let t: TextField = null;
        if (!this._all || this._all.length == 0) {
            t = IoMapUi.label("", 10, IoMapUi.MUTED, false, (w - 12) | 0);
            t.multiline = true;
            t.wordWrap = true;
            t.htmlText = KEYS.Get(this._all ? "io_map3_targets_none" : "io_map3_targets_loading");
            t.height = 40;
            t.x = 6;
            t.y = 6;
            content.addChild(t);
            return 50;
        }
        while (i < this._all.length && i < this._shown) {
            content.addChild(this.row(i, this._all[i], y, w));
            y += IoMapTargets.ROW_H;
            i++;
        }
        return y;
    }

    /** "2d 4h", "3h 12m", "45m" */
    public static shortTime(seconds: int): string {
        let days: int = (seconds / 86400) | 0;
        let hours: int = ((seconds % 86400) / 3600) | 0;
        let minutes: int = Math.max(1, ((seconds % 3600) / 60) | 0) | 0;
        if (days > 0) {
            return days + KEYS.Get("global_days_short") + " " + hours + KEYS.Get("global_hours_short");
        }
        if (hours > 0) {
            return hours + KEYS.Get("global_hours_short") + " " + minutes + KEYS.Get("global_minutes_short");
        }
        return minutes + KEYS.Get("global_minutes_short");
    }

    /** A target: a dot (the owner's colour, or the tribe yard's mark), name and type, level, damage, protection, distance, Go, Attack. */
    private row(index: int, target: any, y: int, w: int): Sprite {
        let row: Sprite = new Sprite();
        let draw: Function = null;
        let cellX: int = target.x | 0;
        let cellY: int = target.y | 0;
        let tribe: boolean = target.kind == 1;
        let name: TextField = IoMapUi.label(String(target.name), 10, IoMapUi.INK, true, 150);
        let type: TextField = IoMapUi.label("", 9, IoMapUi.MUTED, false, 150);
        let protectedNow: boolean = (target.protectedLeft | 0) > 0;
        row.name = "ioMap3TargetRow_" + cellX + "_" + cellY;
        draw = (over: boolean): void => {
            let g: Graphics = row.graphics;
            g.clear();
            g.beginFill(over ? IoMapUi.PAPER_LIGHT : (index % 2 ? IoMapUi.PAPER : IoMapUi.PAPER_ROW), 1);
            g.drawRect(0, 0, w, IoMapTargets.ROW_H);
            g.endFill();
            g.lineStyle(1, IoMapUi.RULE, 1);
            g.moveTo(0, IoMapTargets.ROW_H - 0.5);
            g.lineTo(w, IoMapTargets.ROW_H - 0.5);
            if (tribe) {
                g.lineStyle(0.8, 3811856, 0.9);
                g.beginFill(target.ready ? IoMapLod.CAMP_READY : (target.damage > 0 ? IoMapLod.CAMP_DAMAGED : 9071156), 1);
                IoMapLod.diamond(g, 9, 11, 4.5);
            } else {
                g.lineStyle(1, 0, 1);
                g.beginFill(IoMapUi.relationColour(target.relation | 0), 1);
                g.drawCircle(9, 11, target.kind == 2 ? 5 : 3.5);
            }
            g.endFill();
            g.lineStyle();
        };
        row.y = y;
        draw(false);
        GLOBAL.ioFitText(name, 8);
        name.x = 16;
        name.y = 1;
        row.addChild(name);
        type.htmlText = (tribe ? KEYS.Get("io_map3_type_tribe") : KEYS.Get(target.kind == 2 ? "io_map3_type_main" : "io_map3_type_outpost")) + " · " + IoMapUi.coord(cellX, cellY) + (target.ready ? " · <font color=\"#B71C1C\">" + KEYS.Get("io_map3_camp_ready") + "</font>" : "") + (target.locked ? " · " + KEYS.Get("io_map3_locked") : "");
        GLOBAL.ioFitText(type, 7);
        type.x = 16;
        type.y = 15;
        row.addChild(type);
        row.addChild(IoMapTargets.cellText(String(target.level | 0), IoMapTargets.COLUMNS[1], IoMapUi.INK));
        row.addChild(IoMapTargets.cellText(target.ready ? "100%" : (target.damage > 0 ? target.damage + "%" : "-"), IoMapTargets.COLUMNS[2], target.damage > 0 || target.ready ? 11872020 : IoMapUi.MUTED));
        row.addChild(IoMapTargets.cellText(protectedNow ? IoMapTargets.shortTime(target.protectedLeft | 0) : "-", IoMapTargets.COLUMNS[3], protectedNow ? 2309293 : IoMapUi.MUTED));
        row.addChild(IoMapTargets.cellText(target.distance >= 0 ? String(target.distance) : "?", IoMapTargets.COLUMNS[4], IoMapUi.INK));
        let go: MovieClip = IoMapUi.button(KEYS.Get("io_op2_go"), 28, 18, (e: MouseEvent): void => {
            this.Close();
            if (this._onGo != null) {
                this._onGo(cellX, cellY);
            }
        }, "grey", 9);
        go.name = "ioMap3TargetGo_" + cellX + "_" + cellY;
        go.x = 344;
        go.y = 6;
        row.addChild(go);
        let attack: MovieClip = IoMapUi.button(KEYS.Get(target.ready ? "io_map3_takeover" : "io_map3_attack"), Math.max(40, w - 376) | 0, 18, (e: MouseEvent): void => {
            this.Close();
            if (this._onAttack != null) {
                this._onAttack(cellX, cellY);
            }
        }, "gold", 9);
        attack.name = "ioMap3TargetAttack_" + cellX + "_" + cellY;
        attack.x = 374;
        attack.y = 6;
        // (protected, or being played: the yard can't be attacked now)
        attack.setEnabled(!protectedNow && !target.locked);
        row.addChild(attack);
        row.buttonMode = true;
        row.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        row.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.Close();
            if (this._onGo != null) {
                this._onGo(cellX, cellY);
            }
        });
        return row;
    }

    private static cellText(text: string, column: any[], colour: uint): TextField {
        let field: TextField = IoMapUi.label(text, 10, colour, false, column[2] | 0, "center");
        GLOBAL.ioFitText(field, 7);
        field.x = column[1] | 0;
        field.y = 7;
        return field;
    }

    /** The map calls this every second: the open list follows a new snapshot, the Filters, and the protection's clock. */
    public Tick(): void {
        if (!this._panel) {
            return;
        }
        if (this._builtVersion != IoMapSnapshot.version || this._builtFilters != IoMapFilters.version || this._builtMinute != ((GLOBAL.Timestamp() / 60) | 0)) {
            this.open(true);
        }
    }

    /** A mouse press anywhere else closes the list (the map room calls this). */
    public ioStageDown(target: DisplayObject): void {
        if (this._panel && target && !this.contains(target)) {
            this.Close();
        }
    }

    public Close(): void {
        if (this._panel) {
            if (this._panel.parent) {
                this._panel.parent.removeChild(this._panel);
            }
            this._panel = null;
            this._pane = null;
        }
    }

    public Cleanup(): void {
        this.Close();
        this._onGo = null;
        this._onAttack = null;
        this._areaOf = null;
        this._all = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
