import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Timer } from "flash/utils";
import { BASE, BFOUNDATION, Button_CLIP, CREATURELOCKER, EnumYardType, GLOBAL, HOUSING, InstanceManager, KEYS, PLEASEWAIT, POPUPSETTINGS, SOUNDS, URLLoaderApi, WMATTACK, com_monsters_maproom_advanced_MapRoom as MapRoom, frame_CLIP } from "@game";

/**
 * Inferno-only admin test mode: the switch next to the Admin button (UI_TOP), the "TEST MODE" banner and
 * the test tools window. Server: services/admin/testMode.ts (POST admin/testmode), flag io_testmode.
 *
 * Switching on: the yard is saved, the server takes a snapshot of the account and gives unlimited shiny and
 * resources, and the home yard is loaded again. While on (GLOBAL.ioTestMode): builds, upgrades, repairs,
 * hatching and training finish at once, placement limits are gone, every monster is unlocked, the Compound
 * has no limit, attacks are practice attacks on any yard without a time limit or fling limit, and the
 * catapult is free. Switching off (or switching account, or the next login) puts the snapshot back.
 */
export class IoTestMode extends ASObject {
    static {
        as3.fields(this, { _mc: null, _tribeBtn: null, _bandBtn: null, _monsterBtn: null, _levelBtn: null, _countField: null, _hoursField: null, _xField: null, _yField: null });
    }

    /** The last map cell clicked (MapRoomCell.Click), for the map tools. */
    public static lastX: int = -1;

    public static lastY: int = -1;

    private static readonly W: int = 560;

    private static readonly TRIBES: any[] = [["legionnaire", "Hellionnaire"], ["kozu", "Kozmodeus"], ["abunakki", "Abaddonakki"], ["dreadnaut", "Beelzenaut"], ["moloch", "Moloch"]];

    private static readonly BANDS: any[] = ["levels 1-10", "levels 11-20", "levels 21-30", "levels 31-40", "levels 41+"];

    private static _busy: boolean = false;

    private static _open: IoTestMode = null;

    // remembered choices while the game is open
    private static _tribe: int = 0;

    private static _band: int = 0;

    private static _monster: int = 0;

    private static _level: int = 1;

    private static _count: string = "5";

    private static _hours: string = "24";
    private _mc: MovieClip;
    private _tribeBtn: Sprite;
    private _bandBtn: Sprite;
    private _monsterBtn: Sprite;
    private _levelBtn: Sprite;
    private _countField: TextField;
    private _hoursField: TextField;
    private _xField: TextField;
    private _yField: TextField;

    public $ctor(): void {
        super.$ctor();
        this._mc = new MovieClip();
        let h: int = 470;
        let fx: int = (-((IoTestMode.W / 2) | 0)) | 0;
        let fy: int = (-((h / 2) | 0)) | 0;
        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoTestMode.W;
        frame.height = h;
        frame.x = fx;
        frame.y = fy;
        frame.Setup(true, as3.bind(this, this.close));

        let x0: int = (fx + 28) | 0;
        let y: int = (fy + 28) | 0;
        let title: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        title.selectable = false;
        title.mouseEnabled = false;
        title.embedFonts = true;
        title.antiAliasType = AntiAliasType.NORMAL;
        title.width = IoTestMode.W - 56;
        title.height = 30;
        let tf: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        tf.align = TextFormatAlign.CENTER;
        title.defaultTextFormat = tf;
        title.text = "Test tools";
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = x0;
        title.y = y;
        y += 40;

        // wild attack now
        this.heading("Wild attack now", x0, y);
        y += 22;
        this._tribeBtn = this.add(IoTestMode.button(as3.str(IoTestMode.TRIBES[IoTestMode._tribe][1]), 120, 24, as3.bind(this, this.nextTribe)), x0, y);
        this._bandBtn = this.add(IoTestMode.button(as3.str(IoTestMode.BANDS[IoTestMode._band]), 110, 24, as3.bind(this, this.nextBand)), (x0 + 128) | 0, y);
        this.add(IoTestMode.button("Attack now", 110, 24, as3.bind(this, this.wildAttack)), (x0 + 246) | 0, y);
        y += 38;

        // spawn monsters
        this.heading("Monsters", x0, y);
        y += 22;
        this._monsterBtn = this.add(IoTestMode.button(this.monsterName(), 120, 24, as3.bind(this, this.nextMonster)), x0, y);
        this._levelBtn = this.add(IoTestMode.button("level " + IoTestMode._level, 70, 24, as3.bind(this, this.nextLevel)), (x0 + 128) | 0, y);
        this._mc.addChild(IoTestMode.label("count", 11, 3811866, true, 40, TextFormatAlign.RIGHT)).x = x0 + 200;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
        this._countField = this.input(IoTestMode._count, 44, (x0 + 244) | 0, y);
        this.add(IoTestMode.button("Attack me", 90, 24, as3.bind(this, this.spawnAttackers)), (x0 + 296) | 0, y);
        this.add(IoTestMode.button("Defend", 80, 24, as3.bind(this, this.spawnDefenders)), (x0 + 392) | 0, y);
        y += 28;
        this._mc.addChild(IoTestMode.label("Defenders go in the Compound at that level (it becomes the Academy level for that monster).", 10, 3811866, false, (IoTestMode.W - 56) | 0, TextFormatAlign.LEFT)).x = x0;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y;
        y += 30;

        // yard
        this.heading("Yard", x0, y);
        y += 22;
        this.add(IoTestMode.button("Repair everything", 150, 24, as3.bind(this, this.repairAll)), x0, y);
        this.add(IoTestMode.button("Protection on", 120, 24, as3.bind(this, this.protectionOn)), (x0 + 158) | 0, y);
        this.add(IoTestMode.button("Protection off", 120, 24, as3.bind(this, this.protectionOff)), (x0 + 286) | 0, y);
        y += 38;

        // time
        this.heading("Fast-forward (this yard, until it is loaded again)", x0, y);
        y += 22;
        this._hoursField = this.input(IoTestMode._hours, 44, x0, y);
        this._mc.addChild(IoTestMode.label("hours", 11, 3811866, true, 44, TextFormatAlign.LEFT)).x = x0 + 50;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
        this.add(IoTestMode.button("Fast-forward", 110, 24, as3.bind(this, this.fastForwardClick)), (x0 + 100) | 0, y);
        y += 38;

        // map
        this.heading("Map (X and Y as the map shows them)", x0, y);
        y += 22;
        this._mc.addChild(IoTestMode.label("X", 11, 3811866, true, 14, TextFormatAlign.RIGHT)).x = x0;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
        this._xField = this.input(IoTestMode.lastX >= 0 ? String(IoTestMode.lastX) : "", 50, (x0 + 18) | 0, y);
        this._mc.addChild(IoTestMode.label("Y", 11, 3811866, true, 14, TextFormatAlign.RIGHT)).x = x0 + 72;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
        this._yField = this.input(IoTestMode.lastY >= 0 ? String(IoTestMode.lastY) : "", 50, (x0 + 90) | 0, y);
        this.add(IoTestMode.button("Jump there", 90, 24, as3.bind(this, this.jump)), (x0 + 150) | 0, y);
        this.add(IoTestMode.button("Take as outpost", 120, 24, as3.bind(this, this.takeCell)), (x0 + 246) | 0, y);
        this.add(IoTestMode.button("Make wild", 90, 24, as3.bind(this, this.wildCell)), (x0 + 372) | 0, y);
        y += 28;
        this._mc.addChild(IoTestMode.label("Take: free land or a tribe. Make wild: one of your outposts or a tribe (a fresh tribe grows). Other players' yards are left alone.", 10, 3811866, false, (IoTestMode.W - 56) | 0, TextFormatAlign.LEFT)).x = x0;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y;

        let ok: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
        ok.x = -((ok.width * 0.5) | 0);
        ok.y = fy + h - 58;
        ok.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    // ---- the switch
    /** The switch next to the Admin button. */
    public static ToggleClick(e: MouseEvent = null): void {
        if (IoTestMode._busy) {
            return;
        }
        SOUNDS.Play("click1");
        if (GLOBAL.ioTestMode()) {
            GLOBAL.Message("<b>Switch off admin test mode?</b><br><br>Your yards, outposts, shiny and resources go back to how they were when you switched it on.", "Switch off", (): void => {
                IoTestMode.switchOff(null);
            });
        } else {
            GLOBAL.Message("<b>Switch on admin test mode?</b><br><br>Your yards, outposts, shiny and resources are saved now and put back exactly as they are when you switch it off (switching account or logging in again does it too).<br><br>While it is on: unlimited resources and shiny, everything built and upgraded at once, no building limits, every monster, practice attacks on any yard, and the test tools.", "Switch on", IoTestMode.switchOn);
        }
    }

    private static switchOn(): void {
        IoTestMode._busy = true;
        PLEASEWAIT.Show("Switching on test mode...");
        try {
            BASE.Save(0, false, true);
        } catch (e) {
        }
        IoTestMode.whenSaved((): void => {
            BASE._blockSave = true;
            IoTestMode.call("on", [], (serverData: any): void => {
                IoTestMode._busy = false;
                PLEASEWAIT.Hide();
                IoTestMode.loadHome();
            }, (message: string): void => {
                // The answer may be what was lost (the server switched it on): ask again before
                // going on as if it were off.
                IoTestMode.call("status", [], (serverData: any): void => {
                    IoTestMode._busy = false;
                    PLEASEWAIT.Hide();
                    if (serverData.on) {
                        IoTestMode.loadHome();
                    } else {
                        BASE._blockSave = false;
                        GLOBAL.Message(message);
                    }
                }, (again: string): void => {
                    // Still no answer: reloading the home yard shows whatever the server has.
                    IoTestMode._busy = false;
                    PLEASEWAIT.Hide();
                    GLOBAL.Message(message);
                    IoTestMode.loadHome();
                });
            });
        });
    }

    /** Switches off and puts the account back; then `done` (switching account), or the home yard is loaded. */
    public static switchOff(done: Function): void {
        IoTestMode._busy = true;
        PLEASEWAIT.Show("Switching off test mode...");
        // Nothing from the test yard may be saved over the one put back.
        BASE._blockSave = true;
        IoTestMode.whenSaved((): void => {
            IoTestMode.call("off", [], (serverData: any): void => {
                IoTestMode._busy = false;
                PLEASEWAIT.Hide();
                if (done != null) {
                    done();
                } else {
                    IoTestMode.loadHome();
                }
            }, (message: string): void => {
                IoTestMode._busy = false;
                PLEASEWAIT.Hide();
                if (done != null) {
                    // The next login puts the account back anyway.
                    done();
                } else {
                    BASE._blockSave = false;
                    GLOBAL.Message(message);
                }
            });
        });
    }

    private static loadHome(): void {
        if (IoTestMode._open) {
            IoTestMode._open.close();
        }
        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    /**
     * Runs `then` once every change is saved (at most 8 seconds): no save under way and none waiting.
     * A save asked for while another was on its way is sent once that one is back.
     */
    private static whenSaved(then: Function): void {
        let deadline: int = 0;
        let wait: Timer = null;
        deadline = (GLOBAL.Timestamp() + 8) | 0;
        wait = new Timer(200);
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

    /** One test-mode request; `fail` also runs when no answer comes within 20 seconds. */
    private static call(action: string, vars: any[], ok: Function, fail: Function): void {
        let answered: boolean = false;
        let timeout: Timer = null;
        answered = false;
        timeout = new Timer(20000, 1);
        timeout.addEventListener(TimerEvent.TIMER_COMPLETE, (e: TimerEvent): void => {
            if (!answered) {
                answered = true;
                fail("Test mode: no answer from the server. Please try again.");
            }
        });
        timeout.start();
        new URLLoaderApi().load(GLOBAL.serverUrl + "admin/testmode", [["action", action]].concat(vars), (serverData: any): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            if (serverData && serverData.error == 0) {
                ok(serverData);
            } else {
                fail(serverData && serverData.error ? String(serverData.error) : "Test mode: no answer from the server.");
            }
        }, (e: Event): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            fail("Test mode: the server could not be reached. Please try again.");
        });
    }

    /** Closes the tools window (the yard is going: an attack starts, or BASE.Cleanup). */
    public static ioCloseOpen(): void {
        if (IoTestMode._open) {
            IoTestMode._open.close();
        }
        IoTestMode._open = null;
    }

    // ---- the banner
    /** "TEST MODE" text, shown while test mode is on (UI_TOP keeps one). */
    public static makeBanner(): TextField {
        let t: TextField = IoTestMode.label("TEST MODE  (undone when you switch it off)", 14, 16724016, true, 420, TextFormatAlign.CENTER);
        t.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 2)];
        return t;
    }

    // ---- the tools window
    public static ShowTools(e: MouseEvent = null): void {
        if (IoTestMode._open && (!IoTestMode._open._mc || !IoTestMode._open._mc.stage)) {
            IoTestMode._open = null;
        }
        if (IoTestMode._open || !GLOBAL.ioTestMode() || BASE.ioAttackRunning()) {
            return;
        }
        SOUNDS.Play("click1");
        IoTestMode._open = new IoTestMode();
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        IoTestMode._count = this._countField.text;
        IoTestMode._hours = this._hoursField.text;
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoTestMode._open == this) {
            IoTestMode._open = null;
        }
    }

    // ---- choices
    private nextTribe(e: MouseEvent): void {
        IoTestMode._tribe = ((IoTestMode._tribe + 1) % IoTestMode.TRIBES.length) | 0;
        IoTestMode.setText(this._tribeBtn, as3.str(IoTestMode.TRIBES[IoTestMode._tribe][1]));
    }

    private nextBand(e: MouseEvent): void {
        IoTestMode._band = ((IoTestMode._band + 1) % IoTestMode.BANDS.length) | 0;
        IoTestMode.setText(this._bandBtn, as3.str(IoTestMode.BANDS[IoTestMode._band]));
    }

    private nextMonster(e: MouseEvent): void {
        IoTestMode._monster = ((IoTestMode._monster + 1) % CREATURELOCKER.ioTestMonsterIds().length) | 0;
        IoTestMode.setText(this._monsterBtn, this.monsterName());
    }

    private nextLevel(e: MouseEvent): void {
        IoTestMode._level = (IoTestMode._level % 6 + 1) | 0;
        IoTestMode.setText(this._levelBtn, "level " + IoTestMode._level);
    }

    private monsterId(): string {
        return String(CREATURELOCKER.ioTestMonsterIds()[IoTestMode._monster]);
    }

    private monsterName(): string {
        let c: any = CREATURELOCKER._creatures[this.monsterId()];
        return c ? KEYS.Get(as3.str(c.name)) : this.monsterId();
    }

    private count(): int {
        return Math.max(1, Math.min(500, Number(this._countField.text) | 0)) | 0;
    }

    // ---- actions
    private ownYard(): boolean {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL.Message("Open one of your own yards first.");
            return false;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message("Not while your yard is being attacked.");
            return false;
        }
        return true;
    }

    private wildAttack(e: MouseEvent): void {
        if (!this.ownYard()) {
            return;
        }
        let why: string = WMATTACK.ioAdminAttack(as3.str(IoTestMode.TRIBES[IoTestMode._tribe][0]), IoTestMode._band);
        if (why) {
            GLOBAL.Message(why);
            return;
        }
        this.close();
    }

    private spawnAttackers(e: MouseEvent): void {
        if (!this.ownYard()) {
            return;
        }
        let monsters: any = {};
        monsters[this.monsterId()] = this.count();
        let why: string = WMATTACK.ioAdminAttack(as3.str(IoTestMode.TRIBES[IoTestMode._tribe][0]), IoTestMode._band, monsters, IoTestMode._level);
        if (why) {
            GLOBAL.Message(why);
            return;
        }
        this.close();
    }

    private spawnDefenders(e: MouseEvent): void {
        if (!this.ownYard()) {
            return;
        }
        if (!GLOBAL._bHousing) {
            GLOBAL.Message("Build a Compound first: defenders live there.");
            return;
        }
        let id: string = this.monsterId();
        if (!GLOBAL.player.m_upgrades[id]) {
            GLOBAL.player.m_upgrades[id] = { "level": IoTestMode._level };
        }
        GLOBAL.player.m_upgrades[id].level = IoTestMode._level;
        if (GLOBAL.player.monsterListByID(id)) {
            GLOBAL.player.monsterListByID(id).level = IoTestMode._level;
        }
        let made: int = 0;
        let at: Point = new Point(GLOBAL._bHousing._mc.x, GLOBAL._bHousing._mc.y);
        for (let i: int = 0; i < this.count(); i++) {
            if (HOUSING.HousingStore(id, at)) {
                made++;
            }
        }
        HOUSING.HousingSpace();
        BASE.Save();
        GLOBAL.Message(made + " " + this.monsterName() + " (level " + IoTestMode._level + ") now in your Compound.");
    }

    private repairAll(e: MouseEvent): void {
        if (!this.ownYard()) {
            return;
        }
        let fixed: int = 0;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b.health < b.maxHealth) {
                b.Repair();
                fixed++;
            }
        }
        BASE.Save();
        GLOBAL.Message(fixed > 0 ? fixed + " buildings repaired." : "Nothing needed repairing.");
    }

    private protectionOn(e: MouseEvent): void {
        this.protection(true);
    }

    private protectionOff(e: MouseEvent): void {
        this.protection(false);
    }

    private protection(on: boolean): void {
        IoTestMode.call("protection", [["on", on ? 1 : 0]], (serverData: any): void => {
            BASE._isProtected = serverData["protected"] | 0;
            GLOBAL.Message(on ? "Your main yard has damage protection for 7 days." : "Your main yard has no damage protection now.");
        }, GLOBAL.Message);
    }

    private fastForwardClick(e: MouseEvent): void {
        if (!this.ownYard()) {
            return;
        }
        let hours: int = Math.max(1, Math.min(24 * 30, Number(this._hoursField.text) | 0)) | 0;
        IoTestMode.fastForward((hours * 3600) | 0);
        GLOBAL.Message("Moved on " + hours + " hours: production, timers and the next wild attack.");
    }

    /**
     * Moves the yard on screen `seconds` into the future: the clock (timers that end at a time, the Academy,
     * the Strongbox, the next wild attack) and every building's own countdowns and production.
     */
    public static fastForward(seconds: int): void {
        GLOBAL.t += seconds;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            try {
                b.Tick(seconds);
            } catch (err) {
            }
        }
        BASE.CalcResources();
        BASE.Save();
    }

    private place(): Point {
        let x: int = Number(this._xField.text.replace(/[^0-9]/g, "")) | 0;
        let y: int = Number(this._yField.text.replace(/[^0-9]/g, "")) | 0;
        if (this._xField.text.replace(/[^0-9]/g, "") == "" || this._yField.text.replace(/[^0-9]/g, "") == "") {
            GLOBAL.Message("Enter X and Y first (clicking a cell on the map fills them in).");
            return null;
        }
        return new Point(x, y);
    }

    private jump(e: MouseEvent): void {
        let at: Point = this.place();
        if (!at) {
            return;
        }
        this.close();
        MapRoom.ioFocus = at;
        GLOBAL.ShowMap();
        if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
            MapRoom.ioFocus = null;
        }
    }

    private takeCell(e: MouseEvent): void {
        let at: Point = null;
        at = this.place();
        if (!at) {
            return;
        }
        IoTestMode.call("takecell", [["x", at.x], ["y", at.y]], (serverData: any): void => {
            GLOBAL._mapOutpost.push(new Point(at.x, at.y));
            GLOBAL._mapOutpostIDs.push(serverData.baseid);
            MapRoom.ioClearCells();
            GLOBAL.Message(at.x + ", " + at.y + " is now your outpost.", "Open it", (): void => {
                if (IoTestMode._open) {
                    IoTestMode._open.close();
                }
                BASE.ioLoadOutpost(at.x | 0, at.y | 0);
            });
        }, GLOBAL.Message);
    }

    private wildCell(e: MouseEvent): void {
        let at: Point = null;
        at = this.place();
        if (!at) {
            return;
        }
        IoTestMode.call("wildcell", [["x", at.x], ["y", at.y]], (serverData: any): void => {
            for (let i: int = (GLOBAL._mapOutpost.length - 1) | 0; i >= 0; i--) {
                if (GLOBAL._mapOutpost[i].x == at.x && GLOBAL._mapOutpost[i].y == at.y) {
                    GLOBAL._mapOutpost.splice(i, 1);
                    GLOBAL._mapOutpostIDs.splice(i, 1);
                }
            }
            MapRoom.ioClearCells();
            if (BASE.isOutpost && BASE._currentCellLoc && BASE._currentCellLoc.x == at.x && BASE._currentCellLoc.y == at.y) {
                GLOBAL.Message(at.x + ", " + at.y + " is wild again. Back to your main yard.");
                IoTestMode.loadHome();
                return;
            }
            GLOBAL.Message(at.x + ", " + at.y + " is wild again.");
        }, GLOBAL.Message);
    }

    // ---- helpers
    private heading(text: string, x: int, y: int): void {
        let t: TextField = as3.as(this._mc.addChild(IoTestMode.label(text, 12, 3811866, true, (IoTestMode.W - 56) | 0, TextFormatAlign.LEFT)), TextField);
        t.x = x;
        t.y = y;
    }

    private add(b: Sprite, x: int, y: int): Sprite {
        this._mc.addChild(b);
        b.x = x;
        b.y = y;
        return b;
    }

    private input(text: string, width: int, x: int, y: int): TextField {
        let f: TextField = new TextField();
        f.type = TextFieldType.INPUT;
        f.border = true;
        f.borderColor = 9071173;
        f.background = true;
        f.backgroundColor = 16777215;
        f.width = width;
        f.height = 22;
        let format: TextFormat = new TextFormat("Verdana", 12, 0x000000, true);
        format.align = TextFormatAlign.CENTER;
        f.defaultTextFormat = format;
        f.text = text;
        f.x = x;
        f.y = y + 1;
        this._mc.addChild(f);
        return f;
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

    private static setText(b: Sprite, text: string): void {
        as3.cast(b.getChildAt(0), TextField).text = text;
    }

    private static button(text: string, width: int, height: int, onClick: Function): Sprite {
        let b: Sprite = null;
        let draw: Function = null;
        b = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        draw = (fill: uint): void => {
            b.graphics.clear();
            b.graphics.lineStyle(1, 5913114, 1);
            b.graphics.beginFill(fill, 1);
            b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
            b.graphics.endFill();
        };
        draw(0xF2D98C);
        let t: TextField = as3.as(b.addChild(IoTestMode.label(text, 11, 2759178, true, width, TextFormatAlign.CENTER)), TextField);
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
