import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { URLRequest, navigateToURL } from "flash/net";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Timer } from "flash/utils";
import { ACADEMY, BASE, BFOUNDATION, Button_CLIP, CREATURELOCKER, EnumYardType, GAME, GLOBAL, HOUSING, InstanceManager, IoDesigner, IoPets, IoTilt, KEYS, PLEASEWAIT, POPUPSETTINGS, SOUNDS, TUTORIAL, URLLoaderApi, WMATTACK, com_monsters_maproom_advanced_MapRoom as MapRoom, frame_CLIP, IoLighting, ATTACK } from "@game";

/**
 * Inferno-only admin test mode: the switch next to the Admin button (UI_TOP), the "TEST MODE" banner and
 * the test tools window. Server: services/admin/testMode.ts (POST admin/testmode), flag io_testmode.
 *
 * Switching on: the yard is saved, the server takes a snapshot of the account and gives unlimited shiny and
 * resources, and the home yard is loaded again. While on (GLOBAL.ioTestMode): builds, upgrades, repairs,
 * hatching and training finish at once, placement limits are gone, every monster is unlocked, the Compound
 * has no limit, attacks are practice attacks on any yard without a time limit or fling limit, and the
 * catapult is free. Switching off (or switching account, or the next login) puts the snapshot back.
 *
 * 15 October: more tools (QoL #395), all on the admin's own main yard and so put back with it: an Academy level
 * for the chosen monster, that monster unlocked in the Strongbox, one of it as a pet (the server takes pets made
 * while testing away again), the Under Hall's level, and any building put down and taken to a level. "Again"
 * (QoL #411, top right of the tools) does the last tool once more, with the same choices.
 *
 * 15 October, later:
 *  - QoL #410: one "Admin ▾" button in the top bar (UI_TOP calls ioAdminMenu) with a small menu: the admin panel, test
 *    mode on or off, the test tools, the Designer and the tilt. It was five buttons in a row (Admin, Test, Test tools,
 *    Designer, Tilt).
 *  - QoL #396: test mode with the account's own shiny and resources and real costs, waits and prompts (the "Real
 *    costs" choice when switching on; flag io_testreal in place of io_testmode). Attacks are still practice on the
 *    server, and the account is still put back when it is switched off.
 *  - QoL #397: Fast-forward on the main yard moves it on on the server too (protection, Strongbox unlocks and Academy
 *    training under way, Hell Freezes Over's next day), so it is kept when the yard is loaded again.
 *  - QoL #404: the panel's "View yard in game" opens the game with ?ioview=<base id>: once the admin's own yard is
 *    up, that yard is shown in view mode (asked first).
 */
export class IoTestMode extends ASObject {
    static {
        as3.fields(this, { _mc: null, _tribeBtn: null, _bandBtn: null, _monsterBtn: null, _levelBtn: null, _countField: null, _hoursField: null, _xField: null, _yField: null, _typeBtn: null, _hallField: null, _bLevelField: null, _againBtn: null });
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

    // (QoL #395) the building to put down (an index in buildTypes()), its level, and the Under Hall level asked for
    private static _bType: int = 0;

    private static _bLevel: string = "1";

    private static _hall: string = "";

    // (QoL #411) the last tool used, with its choices, and what to call it
    private static _again: Function = null;

    private static _againLabel: string = null;

    // (QoL #410) the Admin button and its menu (on the top layer), and the label the button shows
    private static _menuBtn: Button_CLIP = null;

    private static _menu: Sprite = null;

    private static _menuLabel: string = null;

    // (QoL #404) whether the page's ?ioview was looked at yet
    private static _viewChecked: boolean = false;

    // (QoL #396) the "TEST MODE" banner made last (UI_TOP keeps it), its text kept to the profile
    private static _banner: TextField = null;

    // (QoL #397) what the server's fast-forward did, said once the yard is up again
    private static _pendingMsg: string = null;
    private _mc: MovieClip;
    private _tribeBtn: Sprite;
    private _bandBtn: Sprite;
    private _monsterBtn: Sprite;
    private _levelBtn: Sprite;
    private _countField: TextField;
    private _hoursField: TextField;
    private _xField: TextField;
    private _yField: TextField;
    private _typeBtn: Sprite;
    private _hallField: TextField;
    private _bLevelField: TextField;
    private _againBtn: Sprite;

    public $ctor(): void {
        super.$ctor();
        this._mc = new MovieClip();
        // (15 October, QoL #395: 610, with the Academy row and the Buildings section; it was 470)
        let h: int = GLOBAL.INFERNO_ONLY ? 610 : 470;
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
        // (QoL #411) the last tool once more, top right
        if (GLOBAL.INFERNO_ONLY) {
            this._againBtn = this.add(IoTestMode.button(IoTestMode.againText(), 160, 24, IoTestMode.againClick), (x0 + IoTestMode.W - 56 - 160) | 0, (y + 2) | 0);
            this._againBtn.name = "ioTestAgain";
            this._againBtn.alpha = IoTestMode._again != null ? 1 : 0.5;
        }
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
        // (QoL #395) the same monster and level: the Academy, the Strongbox, a pet
        if (GLOBAL.INFERNO_ONLY) {
            this.add(IoTestMode.button("Set Academy level", 140, 24, as3.bind(this, this.academyClick)), x0, y).name = "ioTestAcademy";
            this.add(IoTestMode.button("Unlock in Strongbox", 150, 24, as3.bind(this, this.unlockClick)), (x0 + 148) | 0, y).name = "ioTestUnlock";
            this.add(IoTestMode.button("Give as a pet", 110, 24, as3.bind(this, this.petClick)), (x0 + 306) | 0, y).name = "ioTestPet";
            y += 28;
        }
        this._mc.addChild(IoTestMode.label(GLOBAL.INFERNO_ONLY ? "Defenders go in the Compound at that level (also that monster's Academy level). Academy level: from now on. A pet: one in your main yard, gone again when test mode is switched off." : "Defenders go in the Compound at that level (it becomes the Academy level for that monster).", 10, 3811866, false, (IoTestMode.W - 56) | 0, TextFormatAlign.LEFT)).x = x0;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y;
        y += 30;

        // (QoL #395) buildings of the main yard
        if (GLOBAL.INFERNO_ONLY) {
            this.heading("Buildings (your main yard)", x0, y);
            y += 22;
            this._mc.addChild(IoTestMode.label("Under Hall level", 11, 3811866, true, 120, TextFormatAlign.LEFT)).x = x0;
            this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
            this._hallField = this.input(IoTestMode._hall != "" ? IoTestMode._hall : String(GLOBAL.townHall && GLOBAL.townHall._type == 14 ? GLOBAL.townHall._lvl.Get() | 0 : 1), 44, (x0 + 122) | 0, y);
            this._hallField.name = "ioTestHallLevel";
            this.add(IoTestMode.button("Set", 60, 24, as3.bind(this, this.hallClick)), (x0 + 172) | 0, y).name = "ioTestHallSet";
            y += 28;
            this.add(IoTestMode.button("<", 26, 24, as3.bind(this, this.prevType)), x0, y).name = "ioTestTypePrev";
            this._typeBtn = this.add(IoTestMode.button(IoTestMode.typeName(), 210, 24, as3.bind(this, this.nextType)), (x0 + 30) | 0, y);
            this._typeBtn.name = "ioTestType";
            this.add(IoTestMode.button(">", 26, 24, as3.bind(this, this.nextType)), (x0 + 244) | 0, y).name = "ioTestTypeNext";
            this._mc.addChild(IoTestMode.label("level", 11, 3811866, true, 40, TextFormatAlign.RIGHT)).x = x0 + 274;
            this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
            this._bLevelField = this.input(IoTestMode._bLevel, 40, (x0 + 318) | 0, y);
            this._bLevelField.name = "ioTestBuildLevel";
            this.add(IoTestMode.button("Put it down", 100, 24, as3.bind(this, this.placeClick)), (x0 + 366) | 0, y).name = "ioTestPlace";
            y += 28;
            this._mc.addChild(IoTestMode.label("Put it down like a new building; it then goes to that level (the yard is loaded again).", 10, 3811866, false, (IoTestMode.W - 56) | 0, TextFormatAlign.LEFT)).x = x0;
            this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y;
            y += 26;
        }

        // yard
        this.heading("Yard", x0, y);
        y += 22;
        this.add(IoTestMode.button("Repair everything", 150, 24, as3.bind(this, this.repairAll)), x0, y);
        this.add(IoTestMode.button("Protection on", 120, 24, as3.bind(this, this.protectionOn)), (x0 + 158) | 0, y);
        this.add(IoTestMode.button("Protection off", 120, 24, as3.bind(this, this.protectionOff)), (x0 + 286) | 0, y);
        y += 38;

        // time
        // (QoL #397: on the main yard, the server's part is kept)
        this.heading(GLOBAL.INFERNO_ONLY ? "Fast-forward (the main yard is moved on on the server too)" : "Fast-forward (this yard, until it is loaded again)", x0, y);
        y += 22;
        this._hoursField = this.input(IoTestMode._hours, 44, x0, y);
        this._mc.addChild(IoTestMode.label("hours", 11, 3811866, true, 44, TextFormatAlign.LEFT)).x = x0 + 50;
        this._mc.getChildAt((this._mc.numChildren - 1) | 0).y = y + 4;
        this._hoursField.name = "ioTestFFHours";
        this.add(IoTestMode.button("Fast-forward", 110, 24, as3.bind(this, this.fastForwardClick)), (x0 + 100) | 0, y).name = "ioTestFastForward";
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
        if (IoTestMode.on()) {
            GLOBAL.Message("<b>Switch off admin test mode?</b><br><br>Your yards, outposts, shiny and resources go back to how they were when you switched it on.", "Switch off", (): void => {
                IoTestMode.switchOff(null);
            });
        } else if (GLOBAL.INFERNO_ONLY) {
            // (QoL #396: or with the account's own shiny and resources, and real costs)
            GLOBAL.Message("<b>Switch on admin test mode?</b><br><br>Your yards, outposts, shiny and resources are saved now and put back exactly as they are when you switch it off (switching account or logging in again does it too).<br><br><b>Switch on:</b> unlimited resources and shiny, everything built and upgraded at once, no building limits, every monster, practice attacks on any yard, and the test tools.<br><b>Real costs:</b> your own shiny and resources, real costs, waits and prompts, as a player has them; attacks are still practice, and the test tools are there.", "Switch on", (): void => {
                IoTestMode.switchOn("full");
            }, null, "Real costs", (): void => {
                IoTestMode.switchOn("real");
            });
        } else {
            GLOBAL.Message("<b>Switch on admin test mode?</b><br><br>Your yards, outposts, shiny and resources are saved now and put back exactly as they are when you switch it off (switching account or logging in again does it too).<br><br>While it is on: unlimited resources and shiny, everything built and upgraded at once, no building limits, every monster, practice attacks on any yard, and the test tools.", "Switch on", (): void => {
                IoTestMode.switchOn("full");
            });
        }
    }

    /** Test mode is on, either profile (QoL #396: io_testmode for the full one, io_testreal for real costs). */
    public static on(): boolean {
        return GLOBAL.ioTestMode() || IoTestMode.realOn();
    }

    /** QoL #396: test mode is on with real costs (the game plays as for a player; the server still puts it back). */
    public static realOn(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL._flags != null && (GLOBAL._flags.io_testreal | 0) == 1;
    }

    private static switchOn(profile: string = "full"): void {
        IoTestMode._busy = true;
        PLEASEWAIT.Show("Switching on test mode...");
        try {
            BASE.Save(0, false, true);
        } catch (e) {
        }
        IoTestMode.whenSaved((): void => {
            BASE._blockSave = true;
            IoTestMode.call("on", GLOBAL.INFERNO_ONLY ? [["profile", profile]] : [], (serverData: any): void => {
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
        IoTestMode.closeMenu();
    }

    // ---- the banner
    /** "TEST MODE" text, shown while test mode is on (UI_TOP keeps one). */
    public static makeBanner(): TextField {
        let t: TextField = IoTestMode.label(IoTestMode.bannerText(), 14, 16724016, true, 420, TextFormatAlign.CENTER);
        t.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 2)];
        // (QoL #396: kept, so its text follows the profile)
        IoTestMode._banner = t;
        return t;
    }

    private static bannerText(): string {
        return IoTestMode.realOn() ? "TEST MODE, REAL COSTS  (undone at switch-off)" : "TEST MODE  (undone when you switch it off)";
    }

    // ---- 21 October: the Flinger's drop circle, bigger or smaller, in a test mode attack (ATTACK.ioDropStep)
    private static _drop: Sprite = null;

    private static _dropText: TextField = null;

    /**
     * A small bar under the TEST MODE line while the Flinger's drop circle is up in a test mode attack: the circle a
     * step smaller (−) or bigger (+), back to its usual size (1×), and its size now; [ and ] do the same.
     */
    public static ioDropWidget(show: boolean): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (!show) {
            if (IoTestMode._drop) {
                IoTestMode._drop.visible = false;
            }
            return;
        }
        if (!IoTestMode._drop) {
            let bar: Sprite = new Sprite();
            bar.name = "ioDropSize";
            let g: any = bar.graphics;
            g.lineStyle(1, 0xFF4F30, 0.9);
            g.beginFill(0x1A0A04, 0.85);
            g.drawRoundRect(0, 0, 300, 30, 12);
            g.endFill();
            let title: TextField = IoTestMode.label("Drop circle", 11, 0xFFE6C8, true, 90, TextFormatAlign.LEFT);
            title.x = 10;
            title.y = 7;
            bar.addChild(title);
            let button = (name: string, text: string, x: number, w: number, step: int): void => {
                let b: Sprite = new Sprite();
                b.name = name;
                b.buttonMode = true;
                b.useHandCursor = true;
                b.mouseChildren = false;
                let bg: any = b.graphics;
                bg.lineStyle(1, 0xFFB35A, 1);
                bg.beginFill(0x5A1E08, 1);
                bg.drawRoundRect(0, 0, w, 20, 8);
                bg.endFill();
                let t: TextField = IoTestMode.label(text, 12, 0xFFF4E0, true, w, TextFormatAlign.CENTER);
                t.y = 1;
                b.addChild(t);
                b.x = x;
                b.y = 5;
                // (not a click on the yard under it: no fling, no drag)
                b.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
                    e.stopPropagation();
                });
                b.addEventListener(MouseEvent.MOUSE_UP, (e: MouseEvent): void => {
                    e.stopPropagation();
                });
                b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    e.stopPropagation();
                    SOUNDS.Play("click1");
                    ATTACK.ioDropStep(step);
                });
                bar.addChild(b);
            };
            button("ioDropSmaller", "−", 96, 26, -1);
            let size: TextField = IoTestMode.label("", 11, 0xFFFFFF, true, 104, TextFormatAlign.CENTER);
            size.name = "ioDropSizeText";
            size.x = 124;
            size.y = 7;
            bar.addChild(size);
            IoTestMode._dropText = size;
            button("ioDropBigger", "+", 230, 26, 1);
            button("ioDropReset", "1×", 260, 32, 0);
            bar.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
                e.stopPropagation();
            });
            IoTestMode._drop = bar;
        }
        let parent: Sprite = GLOBAL._layerUI;
        if (parent && IoTestMode._drop.parent != parent) {
            parent.addChild(IoTestMode._drop);
        }
        IoTestMode._dropText.text = ATTACK.ioDropScale() + "×  (" + ATTACK.ioDropSize() + ")  [ ]";
        IoTestMode._drop.x = (GLOBAL._SCREENCENTER.x - 150) | 0;
        IoTestMode._drop.y = 88;
        IoTestMode._drop.visible = true;
    }

    // ---- 15 October, QoL #410: the Admin button and its menu
    /**
     * The top bar's "Admin ▾" button (UI_TOP.ioShowAdminButton, every frame of the own yard in build mode): placed at
     * `x`, `y` in `parent` (the top bar), or hidden (`show` false: not an admin). Its menu has what the row of buttons
     * had: the admin panel, test mode on or off, the test tools (while on), the Designer and the tilt.
     */
    public static ioAdminMenu(parent: MovieClip, show: boolean, x: number, y: number): void {
        if (!GLOBAL.INFERNO_ONLY || !parent) {
            return;
        }
        if (!show) {
            if (IoTestMode._menuBtn) {
                IoTestMode._menuBtn.visible = false;
            }
            IoTestMode.closeMenu();
            return;
        }
        if (!IoTestMode._menuBtn || IoTestMode._menuBtn.parent != parent) {
            if (IoTestMode._menuBtn && IoTestMode._menuBtn.parent) {
                IoTestMode._menuBtn.parent.removeChild(IoTestMode._menuBtn);
            }
            IoTestMode.closeMenu();
            IoTestMode._menuBtn = new Button_CLIP();
            IoTestMode._menuBtn.name = "ioAdminMenuButton";
            IoTestMode._menuBtn.addEventListener(MouseEvent.CLICK, IoTestMode.menuClick);
            parent.addChild(IoTestMode._menuBtn);
            IoTestMode._menuLabel = null;
        }
        // (while test mode is on the button says so: the Test: ON button went into the menu)
        let label: string = IoTestMode.on() ? "Admin: TEST ▾" : "Admin ▾";
        if (IoTestMode._menuLabel != label) {
            IoTestMode._menuLabel = label;
            IoTestMode._menuBtn.Setup(label);
        }
        IoTestMode._menuBtn.visible = true;
        IoTestMode._menuBtn.x = x;
        IoTestMode._menuBtn.y = y;
        if (IoTestMode._menu) {
            IoTestMode.placeMenu();
        }
        if (IoTestMode._banner && IoTestMode._banner.text != IoTestMode.bannerText()) {
            IoTestMode._banner.text = IoTestMode.bannerText();
        }
        if (IoTestMode._pendingMsg && !BASE._loading && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            let text: string = IoTestMode._pendingMsg;
            IoTestMode._pendingMsg = null;
            GLOBAL.Message(text);
        }
        IoTestMode.viewFromLink();
    }

    private static menuClick(e: MouseEvent = null): void {
        if (IoTestMode._menu) {
            IoTestMode.closeMenu();
            return;
        }
        SOUNDS.Play("click1");
        let items: any[] = [["panel", "Admin panel", IoTestMode.openPanel]];
        // (QoL #261: a support account (flag io_admin_role) has the panel only: the server refuses it test mode and the Designer)
        let ioSupport: boolean = Boolean(GLOBAL._flags && String(GLOBAL._flags.io_admin_role || "") == "support");
        if (!ioSupport) {
            items.push(["test", IoTestMode.on() ? "Switch test mode off" : "Switch test mode on...", IoTestMode.ToggleClick]);
            if (IoTestMode.on()) {
                items.push(["tools", "Test tools", IoTestMode.ShowTools]);
            }
            items.push(["designer", "Designer", IoDesigner.Show]);
        }
        if (IoTilt.allowed) {
            items.push(["tilt", "Tilt", IoTilt.Toggle]);
        }
        // (20 October: the yard's lighting and a spooky yard, in this admin's own game only)
        if (IoLighting.allowed) {
            items.push(["lighting", "Lighting", IoLighting.Toggle]);
        }
        let m: Sprite = new Sprite();
        m.name = "ioAdminMenu";
        let w: int = 170;
        let h: int = (items.length * 28 + 10) | 0;
        m.graphics.lineStyle(2, 0x6E4A22, 1);
        m.graphics.beginFill(0x231811, 0.94);
        m.graphics.drawRoundRect(0, 0, w, h, 10, 10);
        m.graphics.endFill();
        m.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
        let iy: int = 6;
        for (let item of as3.values(items)) {
            let run: Function = item[2] as Function;
            let b: Sprite = IoTestMode.button(as3.str(item[1]), (w - 12) | 0, 24, (ev: MouseEvent): void => {
                IoTestMode.closeMenu();
                run(null);
            });
            b.name = "ioAdminMenu_" + as3.str(item[0]);
            b.x = 6;
            b.y = iy;
            m.addChild(b);
            iy = (iy + 28) | 0;
        }
        IoTestMode._menu = m;
        GLOBAL._layerTop.addChild(m);
        IoTestMode.placeMenu();
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoTestMode.menuOutside);
        }
    }

    /** The menu just under the button (the top layer has its own coordinates). */
    private static placeMenu(): void {
        if (!IoTestMode._menu || !IoTestMode._menuBtn || !IoTestMode._menuBtn.parent || !IoTestMode._menuBtn.visible) {
            IoTestMode.closeMenu();
            return;
        }
        let at: Point = GLOBAL._layerTop.globalToLocal(IoTestMode._menuBtn.parent.localToGlobal(new Point(IoTestMode._menuBtn.x, IoTestMode._menuBtn.y + IoTestMode._menuBtn.height + 4)));
        IoTestMode._menu.x = at.x | 0;
        IoTestMode._menu.y = at.y | 0;
    }

    private static menuOutside(e: MouseEvent): void {
        let t: DisplayObject = as3.as(e.target, DisplayObject);
        if (t && ((IoTestMode._menu && IoTestMode._menu.contains(t)) || (IoTestMode._menuBtn && IoTestMode._menuBtn.contains(t)))) {
            return;
        }
        IoTestMode.closeMenu();
    }

    public static closeMenu(): void {
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoTestMode.menuOutside);
        }
        if (IoTestMode._menu && IoTestMode._menu.parent) {
            IoTestMode._menu.parent.removeChild(IoTestMode._menu);
        }
        IoTestMode._menu = null;
    }

    /** The admin panel in the browser: a one-time sign-in code from the server (as the Admin button did). */
    public static openPanel(e: MouseEvent = null): void {
        // A field is sent so Flash keeps this a POST (it turns an empty POST into a GET).
        new URLLoaderApi().load(GLOBAL.serverUrl + "admin/session", [["open", 1]], (serverData: any): void => {
            if (serverData && serverData.error == 0 && serverData.code) {
                navigateToURL(new URLRequest(GLOBAL.serverUrl + "admin/signin?code=" + String(serverData.code)), "_blank");
            } else {
                GLOBAL.Message(serverData && serverData.error ? String(serverData.error) : "The admin panel could not be opened.");
            }
        }, (err: Event): void => {
            GLOBAL.Message("The admin panel could not be opened. Please try again.");
        });
    }

    /**
     * QoL #404: the panel's "View yard in game" opens the game with ?ioview=<base id>. Once the admin's own yard is up
     * (build mode, nothing loading or being saved), that yard is shown in view mode, as a visit (asked first). Once
     * per page: the address loses it, so reloading the page doesn't open it again.
     */
    private static viewFromLink(): void {
        if (IoTestMode._viewChecked) {
            return;
        }
        if (BASE._loading || BASE._saving || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE.ioAttackRunning() || TUTORIAL._stage < 200) {
            return;
        }
        IoTestMode._viewChecked = true;
        let raw: string = "";
        try {
            raw = String(GAME._instance && GAME._instance.loaderInfo && GAME._instance.loaderInfo.parameters ? (GAME._instance.loaderInfo.parameters["ioview"] ?? "") : "");
        } catch (err) {
            raw = "";
        }
        if (!/^\d{1,18}$/.test(raw)) {
            return;
        }
        try {
            let w: any = globalThis as any;
            if (w.history && w.history.replaceState && w.location) {
                let u: any = new w.URL(String(w.location.href));
                u.searchParams.delete("ioview");
                w.history.replaceState(w.history.state, "", String(u.toString()));
            }
        } catch (err) {
        }
        if (raw == String(GLOBAL._homeBaseID)) {
            return;
        }
        GLOBAL.Message("<b>View this yard?</b><br><br>The admin panel asked to show yard " + raw + ", view only (as a visit: nothing on it changes).", "View it", (): void => {
            if (BASE._loading || BASE.ioAttackRunning()) {
                return;
            }
            GLOBAL._currentCell = null;
            BASE.LoadBase(null, 0, Number(raw), GLOBAL.e_BASE_MODE.VIEW, false, EnumYardType.MAIN_YARD);
        });
    }

    // ---- the tools window
    public static ShowTools(e: MouseEvent = null): void {
        if (IoTestMode._open && (!IoTestMode._open._mc || !IoTestMode._open._mc.stage)) {
            IoTestMode._open = null;
        }
        if (IoTestMode._open || !IoTestMode.on() || BASE.ioAttackRunning()) {
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
        if (this._hallField) {
            IoTestMode._hall = this._hallField.text;
        }
        if (this._bLevelField) {
            IoTestMode._bLevel = this._bLevelField.text;
        }
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
    // (15 October, QoL #411: each tool is a static do... with its choices; the button reads the window's choices and
    // hands them over through remember(), which keeps them for Again)
    private static ownYardOk(): boolean {
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

    /** QoL #395: the tools that change the main yard itself work there only. */
    private static mainYardOk(): boolean {
        if (!IoTestMode.ownYardOk()) {
            return false;
        }
        if (BASE.isOutpost || String(BASE._loadedBaseID) != String(GLOBAL._homeBaseID)) {
            GLOBAL.Message("Open your main yard first: this tool changes it.");
            return false;
        }
        return true;
    }

    /** QoL #411: runs a tool and keeps it (with its choices) for Again. */
    private static remember(label: string, run: Function): void {
        if (GLOBAL.INFERNO_ONLY) {
            IoTestMode._again = run;
            IoTestMode._againLabel = label;
            if (IoTestMode._open && IoTestMode._open._againBtn) {
                IoTestMode.setText(IoTestMode._open._againBtn, IoTestMode.againText());
                IoTestMode._open._againBtn.alpha = 1;
            }
        }
        run();
    }

    private static againText(): string {
        if (IoTestMode._again == null || !IoTestMode._againLabel) {
            return "Again";
        }
        let text: string = "Again: " + IoTestMode._againLabel;
        return text.length > 24 ? text.substr(0, 23) + "..." : text;
    }

    /** QoL #411: the last tool once more, with the same choices. */
    public static againClick(e: MouseEvent = null): void {
        if (IoTestMode._busy) {
            return;
        }
        if (IoTestMode._again == null) {
            GLOBAL.Message("Nothing to do again yet: use one of the tools first.");
            return;
        }
        IoTestMode._again();
    }

    private wildAttack(e: MouseEvent): void {
        let tribe: int = IoTestMode._tribe;
        let band: int = IoTestMode._band;
        IoTestMode.remember("wild attack", (): void => {
            IoTestMode.doWildAttack(tribe, band);
        });
    }

    private static doWildAttack(tribe: int, band: int): void {
        if (!IoTestMode.ownYardOk()) {
            return;
        }
        let why: string = WMATTACK.ioAdminAttack(as3.str(IoTestMode.TRIBES[tribe][0]), band);
        if (why) {
            GLOBAL.Message(why);
            return;
        }
        IoTestMode.ioCloseOpen();
    }

    private spawnAttackers(e: MouseEvent): void {
        let tribe: int = IoTestMode._tribe;
        let band: int = IoTestMode._band;
        let id: string = this.monsterId();
        let level: int = IoTestMode._level;
        let n: int = this.count();
        IoTestMode.remember("attack me " + n + "x" + id, (): void => {
            IoTestMode.doAttackers(tribe, band, id, level, n);
        });
    }

    private static doAttackers(tribe: int, band: int, id: string, level: int, n: int): void {
        if (!IoTestMode.ownYardOk()) {
            return;
        }
        let monsters: any = {};
        monsters[id] = n;
        let why: string = WMATTACK.ioAdminAttack(as3.str(IoTestMode.TRIBES[tribe][0]), band, monsters, level);
        if (why) {
            GLOBAL.Message(why);
            return;
        }
        IoTestMode.ioCloseOpen();
    }

    private spawnDefenders(e: MouseEvent): void {
        let id: string = this.monsterId();
        let level: int = IoTestMode._level;
        let n: int = this.count();
        IoTestMode.remember("defend " + n + "x" + id, (): void => {
            IoTestMode.doDefenders(id, level, n);
        });
    }

    private static doDefenders(id: string, level: int, n: int): void {
        if (!IoTestMode.ownYardOk()) {
            return;
        }
        if (!GLOBAL._bHousing) {
            GLOBAL.Message("Build a Compound first: defenders live there.");
            return;
        }
        if (!GLOBAL.player.m_upgrades[id]) {
            GLOBAL.player.m_upgrades[id] = { "level": level };
        }
        GLOBAL.player.m_upgrades[id].level = level;
        if (GLOBAL.player.monsterListByID(id)) {
            GLOBAL.player.monsterListByID(id).level = level;
        }
        let made: int = 0;
        let at: Point = new Point(GLOBAL._bHousing._mc.x, GLOBAL._bHousing._mc.y);
        for (let i: int = 0; i < n; i++) {
            if (HOUSING.HousingStore(id, at)) {
                made++;
            }
        }
        HOUSING.HousingSpace();
        BASE.Save();
        GLOBAL.Message(made + " " + IoTestMode.monsterNameOf(id) + " (level " + level + ") now in your Compound.");
    }

    private repairAll(e: MouseEvent): void {
        IoTestMode.remember("repair", IoTestMode.doRepair);
    }

    private static doRepair(): void {
        if (!IoTestMode.ownYardOk()) {
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
        IoTestMode.remember("protection on", (): void => {
            IoTestMode.protection(true);
        });
    }

    private protectionOff(e: MouseEvent): void {
        IoTestMode.remember("protection off", (): void => {
            IoTestMode.protection(false);
        });
    }

    private static protection(on: boolean): void {
        IoTestMode.call("protection", [["on", on ? 1 : 0]], (serverData: any): void => {
            BASE._isProtected = serverData["protected"] | 0;
            GLOBAL.Message(on ? "Your main yard has damage protection for 7 days." : "Your main yard has no damage protection now.");
        }, GLOBAL.Message);
    }

    private fastForwardClick(e: MouseEvent): void {
        let hours: int = Math.max(1, Math.min(24 * 30, Number(this._hoursField.text) | 0)) | 0;
        IoTestMode.remember("fast-forward " + hours + "h", (): void => {
            if (!IoTestMode.ownYardOk()) {
                return;
            }
            IoTestMode.fastForward((hours * 3600) | 0);
            // (QoL #397: the main yard: then the server moves what it keeps on too, and the yard is loaded again)
            if (GLOBAL.INFERNO_ONLY && !BASE.isOutpost && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID)) {
                IoTestMode.changeYard("fastforward", [["hours", hours]], (serverData: any): void => {
                    let done: any[] = as3.is(serverData.done, Array) ? as3.as(serverData.done, Array) : [];
                    IoTestMode._pendingMsg = "<b>Moved on " + hours + " hours.</b><br><br>In the yard: production, timers and the next wild attack.<br>On the server: " + (done.length > 0 ? done.join("; ") : "nothing else to move (no protection, unlocks or training under way)") + ".";
                });
                return;
            }
            GLOBAL.Message("Moved on " + hours + " hours: production, timers and the next wild attack." + (GLOBAL.INFERNO_ONLY ? " (Until this yard is loaded again: the server's part is for your main yard.)" : ""));
        });
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
        if (!GLOBAL.ioMapOpening()) {
            MapRoom.ioFocus = null;
        }
    }

    private takeCell(e: MouseEvent): void {
        let at: Point = this.place();
        if (!at) {
            return;
        }
        IoTestMode.remember("take " + at.x + "," + at.y, (): void => {
            IoTestMode.doTakeCell(at);
        });
    }

    private static doTakeCell(at: Point): void {
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
        let at: Point = this.place();
        if (!at) {
            return;
        }
        IoTestMode.remember("make " + at.x + "," + at.y + " wild", (): void => {
            IoTestMode.doWildCell(at);
        });
    }

    private static doWildCell(at: Point): void {
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

    // ---- 15 October, QoL #395: the Academy, the Strongbox, pets, the Under Hall, buildings at a level
    private academyClick(e: MouseEvent): void {
        let id: string = this.monsterId();
        let level: int = IoTestMode._level;
        IoTestMode.remember("Academy " + id + " L" + level, (): void => {
            IoTestMode.doAcademy(id, level);
        });
    }

    /** The monster's Academy level from now on (training under way for it stops). Saved with the main yard. */
    private static doAcademy(id: string, level: int): void {
        if (!IoTestMode.mainYardOk() || !GLOBAL.player || !GLOBAL.player.m_upgrades) {
            return;
        }
        let up: any = GLOBAL.player.m_upgrades[id] || {};
        up.level = level;
        delete up.time;
        delete up.duration;
        GLOBAL.player.m_upgrades[id] = up;
        if (ACADEMY._building && ACADEMY._building._upgrading == id) {
            ACADEMY._building._upgrading = null;
        }
        if (GLOBAL.player.monsterListByID(id)) {
            GLOBAL.player.monsterListByID(id).level = level;
        }
        BASE.Save();
        GLOBAL.Message(IoTestMode.monsterNameOf(id) + " is at Academy level " + level + " now.");
    }

    private unlockClick(e: MouseEvent): void {
        let id: string = this.monsterId();
        IoTestMode.remember("unlock " + id, (): void => {
            IoTestMode.doUnlock(id);
        });
    }

    /** The monster unlocked in the Strongbox (an unlock under way for it is finished). Saved with the main yard. */
    private static doUnlock(id: string): void {
        if (!IoTestMode.mainYardOk() || !CREATURELOCKER._lockerData) {
            return;
        }
        let was: boolean = Boolean(CREATURELOCKER._lockerData[id] && CREATURELOCKER._lockerData[id].t == 2);
        CREATURELOCKER._lockerData[id] = { "t": 2 };
        if (GLOBAL.player && GLOBAL.player.m_upgrades && !GLOBAL.player.m_upgrades[id]) {
            GLOBAL.player.m_upgrades[id] = { "level": 1 };
        }
        BASE.Save();
        GLOBAL.Message(IoTestMode.monsterNameOf(id) + (was ? " was unlocked in the Strongbox already." : " is unlocked in the Strongbox now."));
    }

    private petClick(e: MouseEvent): void {
        let id: string = this.monsterId();
        IoTestMode.remember("pet " + id, (): void => {
            IoTestMode.doPet(id);
        });
    }

    /** One of the monster as a pet (server: taken away again when test mode is switched off). */
    private static doPet(id: string): void {
        if (!IoTestMode.mainYardOk()) {
            return;
        }
        IoTestMode.call("pet", [["monster", id]], (serverData: any): void => {
            IoPets.apply(serverData);
            GLOBAL.Message("A " + IoTestMode.monsterNameOf(id) + " pet is yours " + ((serverData.out | 0) == 1 ? "and out in your yard" : "(in storage: as many as can be are out)") + ". It goes again when test mode is switched off.");
        }, GLOBAL.Message);
    }

    private hallClick(e: MouseEvent): void {
        let level: int = Number(this._hallField.text.replace(/[^0-9]/g, "")) | 0;
        IoTestMode.remember("Under Hall " + level, (): void => {
            IoTestMode.doHallLevel(level);
        });
    }

    private static maxLevelOf(type: int): int {
        let props: any = GLOBAL._buildingProps ? GLOBAL._buildingProps[type - 1] : null;
        return (props && props.costs && props.costs.length ? props.costs.length : 1) | 0;
    }

    /** The Under Hall at that level (the server changes the saved yard, which is loaded again). */
    private static doHallLevel(level: int): void {
        if (!IoTestMode.mainYardOk()) {
            return;
        }
        if (!GLOBAL.townHall || GLOBAL.townHall._type != 14) {
            GLOBAL.Message("Your main yard has no Under Hall.");
            return;
        }
        let max: int = IoTestMode.maxLevelOf(14);
        if (level < 1 || level > max) {
            GLOBAL.Message("The Under Hall goes from level 1 to " + max + ".");
            return;
        }
        IoTestMode.changeYard("halllevel", [["level", level]]);
    }

    /** Saves the yard, has the server change it (main yard only), then loads it again (`done`: told the answer first). */
    private static changeYard(action: string, vars: any[], done: Function = null): void {
        if (IoTestMode._busy) {
            return;
        }
        IoTestMode._busy = true;
        PLEASEWAIT.Show("Changing your yard...");
        try {
            BASE.Save(0, false, true);
        } catch (e) {
        }
        IoTestMode.whenSaved((): void => {
            // (nothing from the yard on screen may be saved over the change)
            BASE._blockSave = true;
            IoTestMode.call(action, vars, (serverData: any): void => {
                IoTestMode._busy = false;
                PLEASEWAIT.Hide();
                if (done != null) {
                    done(serverData);
                }
                IoTestMode.loadHome();
            }, (message: string): void => {
                IoTestMode._busy = false;
                PLEASEWAIT.Hide();
                BASE._blockSave = false;
                GLOBAL.Message(message);
            });
        });
    }

    /** The building types that can be put down: every building but decorations and those switched off. */
    public static buildTypes(): any[] {
        let out: any[] = [];
        let props: any[] = GLOBAL._buildingProps ? GLOBAL._buildingProps : [];
        for (let i: int = 0; i < props.length; i++) {
            let p: any = props[i];
            if (p && !p.block && p.type != "decoration" && p.costs && p.costs.length > 0) {
                out.push((i + 1) | 0);
            }
        }
        return out;
    }

    private static typeId(): int {
        let types: any[] = IoTestMode.buildTypes();
        if (types.length == 0) {
            return 0;
        }
        IoTestMode._bType = ((IoTestMode._bType % types.length + types.length) % types.length) | 0;
        return types[IoTestMode._bType] | 0;
    }

    private static typeName(): string {
        let t: int = IoTestMode.typeId();
        let props: any = t > 0 ? GLOBAL._buildingProps[t - 1] : null;
        return props ? KEYS.Get(as3.str(props.name)) + " (" + t + ")" : "no buildings";
    }

    private nextType(e: MouseEvent): void {
        IoTestMode._bType++;
        IoTestMode.setText(this._typeBtn, IoTestMode.typeName());
    }

    private prevType(e: MouseEvent): void {
        IoTestMode._bType--;
        IoTestMode.setText(this._typeBtn, IoTestMode.typeName());
    }

    private placeClick(e: MouseEvent): void {
        let t: int = IoTestMode.typeId();
        let level: int = Math.max(1, Number(this._bLevelField.text.replace(/[^0-9]/g, "")) | 0) | 0;
        if (t <= 0) {
            return;
        }
        IoTestMode.remember("put down " + t + " L" + level, (): void => {
            IoTestMode.doPlace(t, level);
        });
    }

    /**
     * Building `type` on the pointer, to put down as any new building (free and at once in test mode); once it is
     * down and built, the server takes it to `level` and the yard is loaded again.
     */
    private static doPlace(type: int, level: int): void {
        let b: BFOUNDATION = null;
        let ticks: int = 0;
        let poll: Timer = null;
        if (!IoTestMode.mainYardOk()) {
            return;
        }
        let max: int = IoTestMode.maxLevelOf(type);
        if (level > max) {
            GLOBAL.Message("That building goes up to level " + max + ".");
            return;
        }
        IoTestMode.ioCloseOpen();
        b = BASE.addBuildingB(type);
        if (!b || level <= 1) {
            // (not on the pointer: the game said why; level 1: nothing more to do)
            return;
        }
        poll = new Timer(250);
        poll.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            ticks++;
            // (given up after 5 minutes, or when the yard is left)
            if (ticks > 1200 || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || String(BASE._loadedBaseID) != String(GLOBAL._homeBaseID)) {
                poll.stop();
                return;
            }
            if (GLOBAL._newBuilding === b || (b._countdownBuild && b._countdownBuild.Get() > 0)) {
                return;
            }
            poll.stop();
            if (!b._mc || !b._mc.parent || IoTestMode.instances().indexOf(b) < 0) {
                // (put back)
                return;
            }
            IoTestMode.changeYard("buildinglevel", [["id", b._id], ["level", level]]);
        });
        poll.start();
    }

    private static instances(): any[] {
        let out: any[] = [];
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            out.push(b);
        }
        return out;
    }

    private static monsterNameOf(id: string): string {
        let c: any = CREATURELOCKER._creatures[id];
        return c ? KEYS.Get(as3.str(c.name)) : id;
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
