import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, IBitmapDrawable, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { SharedObject } from "flash/net";
import { BYMConfig, CREATURELOCKER, GLOBAL, LOGIN, ImageCache, IoHfo, IoHfoArt, IoHfoIce, IoHfoWaves, IoKit, IoRimegrave, KEYS, MAP, PLEASEWAIT, POPUPS, POPUPSETTINGS, RasterData, SOUNDS, SPRITES, WMATTACK } from "@game";

/**
 * Hell Freezes Over: what the player sees of the event besides the yard (IoHfo): the line under the top bar
 * (towers freed on Day 3; "the ice is weakening" once every wave is through with some skipped), the popups
 * (Hell has frozen over!, a wave won or lost, the last wave, the champion), the event's window (its button
 * sits under Moloch's Gauntlet's from Day 3: UI_TOP) and Rimegrave standing where the ice was.
 * Every text is a language key (hfo_*: server/public/gamestage/assets/*.json).
 */
export class IoHfoUi extends ASObject {
    // ---- the line under the top bar
    private static _hud: Sprite = null;

    // ---- popups (POPUPS): the pack's header art with the title over it, the text, buttons
    private static readonly POP_W: int = 480;

    // ---- the event's window
    private static readonly W: int = 740;

    private static readonly H: int = 520;

    private static _window: MovieClip = null;

    public static Hud(): void {
        IoHfoUi.HudOff();
        let f: any = IoHfo.flag();
        if (!f || !IoHfo.inYard() || WMATTACK._inProgress) {
            return;
        }
        let text: string = null;
        let click: boolean = false;
        let pan: boolean = false;
        if ((f.day | 0) == 3 && f.towers.iced) {
            text = KEYS.Get("hfo_hud_towers", { "v1": (as3.as(f.towers.thawed, Array)).length, "v2": (as3.as(f.towers.iced, Array)).length });
            // (QoL #587: a click shows the next tower still sealed: on a big yard the last ones were hard to find)
            if (GLOBAL.INFERNO_ONLY && IoHfoUi.towerIces().length > 0) {
                text += "  ·  " + KEYS.Get("io_hfo2_hud_towers_find");
                pan = true;
            }
            // (QoL #588: towers still sealed that are busy (built, upgraded, fortified) can't be freed yet: how long)
            if (GLOBAL.INFERNO_ONLY) {
                let busy: any[] = IoHfoUi.ioBusyTowers();
                if ((busy[0] | 0) > 0) {
                    text += "  ·  " + KEYS.Get("io_ev3_hud_busy", { "v1": busy[0] | 0, "v2": GLOBAL.ioDuration(Math.max(1, busy[1] | 0)) });
                }
            }
        } else if (((f.day | 0) == 1 || (f.day | 0) == 2) && f.ready) {
            // (QoL #584: Day 1 and Day 2 say how far along they are, and when the next day can start)
            let next: number = Number(f.nextAt) || 0;
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #108: the next day begins in the yard when its time comes: no visit or reload needed)
                text = next > GLOBAL.Timestamp() ? KEYS.Get("io_ev3_hud_daydone_at", { "v1": (f.day | 0) + 1, "v2": IoHfoUi.clock(next) }) : KEYS.Get("io_ev3_hud_daydone", { "v1": (f.day | 0) + 1 });
            } else {
                text = next > GLOBAL.Timestamp() ? KEYS.Get("io_hfo_hud_daydone_at", { "v1": IoHfoUi.clock(next) }) : KEYS.Get("io_hfo_hud_daydone");
            }
        } else if ((f.day | 0) == 1 && f.small) {
            text = KEYS.Get("io_hfo_hud_ice", { "v1": f.small.cleared | 0, "v2": f.small.total | 0 });
            // (QoL #107: when the next patch comes, and the next day)
            if (GLOBAL.INFERNO_ONLY) {
                let more: number = IoHfoUi.nextPatchAt(f);
                if (more > 0) {
                    text += "  ·  " + KEYS.Get("io_hfo2_hud_more_ice", { "v1": IoHfoUi.clock(more) });
                }
                text += IoHfoUi.nextDayNote(f);
            }
        } else if ((f.day | 0) == 2 && f.big) {
            text = KEYS.Get("io_hfo_hud_cursed", { "v1": (as3.as(f.big.tried, Array) || []).length, "v2": f.big.total | 0 });
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #107)
                text += IoHfoUi.nextDayNote(f);
            }
        } else if ((f.day | 0) >= 4 && !(Number(f.done) > 0) && (f.current | 0) > 13) {
            text = KEYS.Get("hfo_banner_weakening");
            click = true;
        }
        if (!text) {
            return;
        }
        IoHfoUi._hud = new Sprite();
        IoHfoUi._hud.name = "ioHfoHud";
        let t: TextField = IoHfoUi.label(text, 14, 15267583, true, 520, TextFormatAlign.CENTER);
        t.filters = [new GlowFilter(0x0A2A4A, 1, 4, 4, 6, 1)];
        let w: number = Math.max(240, t.textWidth + 40);
        IoHfoUi._hud.graphics.lineStyle(2, 10149119, 1);
        IoHfoUi._hud.graphics.beginFill(928324, 0.88);
        IoHfoUi._hud.graphics.drawRoundRect(-w / 2, 0, w, 30, 14, 14);
        IoHfoUi._hud.graphics.endFill();
        // (centred in the bar by its own width: an auto-sized field kept its left edge, so the text ran out of
        // the bar: the user's report, 4 October)
        t.width = w - 16;
        t.height = 22;
        t.x = -t.width / 2;
        t.y = 4;
        IoHfoUi._hud.addChild(t);
        if (click) {
            IoHfoUi._hud.buttonMode = true;
            IoHfoUi._hud.mouseChildren = false;
            IoHfoUi._hud.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                IoHfoUi.ShowWindow();
            });
        } else if (pan) {
            IoHfoUi._hud.buttonMode = true;
            IoHfoUi._hud.mouseChildren = false;
            IoHfoUi._hud.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                IoHfoUi.panToTower();
            });
        } else {
            IoHfoUi._hud.mouseEnabled = false;
            IoHfoUi._hud.mouseChildren = false;
        }
        GLOBAL.RefreshScreen();
        IoHfoUi._hud.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width / 2;
        IoHfoUi._hud.y = GLOBAL._SCREEN.y + 84;
        GLOBAL._layerUI.addChild(IoHfoUi._hud);
    }

    public static HudOff(): void {
        if (IoHfoUi._hud && IoHfoUi._hud.parent) {
            IoHfoUi._hud.parent.removeChild(IoHfoUi._hud);
        }
        IoHfoUi._hud = null;
    }

    /** QoL #107: when Day 1's next small patch comes (seconds), or 0 (all of them are here). As IoHfo.spawnPatches. */
    private static nextPatchAt(f: any): number {
        let start: number = f.dayAt ? Number(f.dayAt[1]) || 0 : 0;
        let total: int = f.small.total | 0;
        let every: int = Math.max(1, f.small.every | 0) | 0;
        if (start <= 0) {
            return 0;
        }
        let allowed: int = Math.min(total, 6 + Math.floor(Math.max(0, GLOBAL.Timestamp() - start) / every)) | 0;
        return allowed >= total ? 0 : start + (allowed - 6 + 1) * every;
    }

    /** QoL #107: "  ·  Day 2 after 09:30" while the next day's time is still to come, or "". */
    private static nextDayNote(f: any): string {
        let next: number = Number(f.nextAt) || 0;
        return next > GLOBAL.Timestamp() ? "  ·  " + KEYS.Get("io_hfo2_hud_next_day", { "v1": (f.day | 0) + 1, "v2": IoHfoUi.clock(next) }) : "";
    }

    /** The ice of the towers still sealed (Day 3), in a steady order. */
    private static towerIces(): any[] {
        let out: any[] = [];
        for (let ice of as3.values(IoHfo.ices())) {
            if (ice.kind == IoHfoIce.TOWER && ice._mc) {
                out.push(ice);
            }
        }
        out.sort((a: any, b: any): number => (a.ioServerId | 0) - (b.ioServerId | 0));
        return out;
    }

    /**
     * QoL #588: the towers still sealed that are busy (being built, upgraded or fortified, so their ice can't be broken
     * yet): [how many, the longest wait in seconds].
     */
    public static ioBusyTowers(): any[] {
        let n: int = 0;
        let longest: int = 0;
        for (let ice of as3.values(IoHfoUi.towerIces())) {
            let left: int = ice.tower ? IoHfo.ioBusyFor(ice.tower) : 0;
            if (left > 0) {
                n++;
                longest = Math.max(longest, left) | 0;
            }
        }
        return [n, longest];
    }

    /** The next tower the HUD's click shows (QoL #587). */
    private static _panAt: int = 0;

    /** QoL #587: the view moves to the next tower still sealed (one with no worker on it first). */
    private static panToTower(): void {
        let list: any[] = IoHfoUi.towerIces();
        let free: any[] = [];
        for (let ice of as3.values(list)) {
            if (!ice._picking) {
                free.push(ice);
            }
        }
        if (free.length) {
            list = free;
        }
        if (!list.length) {
            return;
        }
        let ice: any = list[IoHfoUi._panAt % list.length];
        IoHfoUi._panAt = (IoHfoUi._panAt + 1) | 0;
        SOUNDS.Play("click1");
        MAP.FocusTo(ice._mc.x | 0, ice._mc.y | 0, 0.5);
    }

    /** QoL #109: a wave's prize in Shiny (the server's `prizes`), or 0 (not known). */
    public static prize(f: any, wave: int): int {
        let prizes: any[] = f ? as3.as(f.prizes, Array) : null;
        return prizes && wave >= 1 && wave <= prizes.length ? prizes[wave - 1] | 0 : 0;
    }

    /**
     * QoL #593: the button's tip: where the player is (towers freed, the wave to fight and its tries and prize, the
     * waves skipped), as Frozen Monster Invasion's says. (UI_TOP.ioMakeHfoButton)
     */
    public static tip(): string {
        let title: string = "<b>" + KEYS.Get("hfo_event_title") + "</b>";
        let f: any = IoHfo.flag();
        if (!f) {
            return title;
        }
        let day: int = f.day | 0;
        if (day == 3 && f.towers && f.towers.iced) {
            return title + "<br>" + KEYS.Get("hfo_hud_towers", { "v1": (as3.as(f.towers.thawed, Array) || []).length, "v2": (as3.as(f.towers.iced, Array)).length });
        }
        if (day < 4) {
            return title;
        }
        if (Number(f.done) > 0) {
            return title + "<br>" + KEYS.Get("io_hfo2_tip_done");
        }
        let current: int = f.current | 0;
        if (current > 13) {
            return title + "<br>" + KEYS.Get("hfo_banner_weakening");
        }
        let w: any[] = as3.as(f.waves, Array) ? as3.as(f.waves[current - 1], Array) : null;
        let line: string = KEYS.Get("io_hfo2_tip_wave", { "v1": current }) + "  ·  " + KEYS.Get("hfo_hud_tries", { "v1": Math.max(0, (f.tries | 0) - (w ? w[0] | 0 : 0)) });
        let prize: int = IoHfoUi.prize(f, current);
        if (prize > 0) {
            line += "  ·  " + KEYS.Get("io_hfo2_prize", { "v1": prize });
        }
        return title + "<br>" + line;
    }

    // ---- QoL #113: the wave's bar under the top bar (both frozen events' waves: IoHfoWaves, IoFmiWaves)
    private static _waveBar: Sprite = null;

    private static _waveBarText: TextField = null;

    private static readonly BAR_H: int = 10;

    // ---- QoL #114: the waves at twice the speed (both frozen events' waves), as Hellgate Defense's fast forward
    /** The speed the player picked (1 or 2), kept for the next wave this session. */
    private static _ioSpeedWant: int = 1;

    /** A wave is on at the picked speed (GLOBAL.ioStepScale is the waves' own until it ends). */
    private static _ioSpeedOn: boolean = false;

    private static _ioSpeedBtn: Sprite = null;

    /**
     * A wave starts (IoHfoWaves.begin, IoFmiWaves.begin): it runs at the picked speed. GLOBAL.ioStepScale runs the
     * battle's steps (monsters, towers, shots, the wave's own step clock: its surges, the blizzard and the melt keep
     * their fighting time); building timers, workers and the raids' clocks are not in it.
     */
    public static ioSpeedStart(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoHfoUi._ioSpeedOn = true;
        GLOBAL.ioStepScale = IoHfoUi._ioSpeedWant;
        IoHfoUi.ioSpeedButton();
    }

    /** The wave is over (won, lost, or the yard left): back to the usual speed. */
    public static ioSpeedStop(): void {
        if (!IoHfoUi._ioSpeedOn) {
            return;
        }
        IoHfoUi._ioSpeedOn = false;
        GLOBAL.ioStepScale = 1;
        IoHfoUi.ioSpeedButton();
    }

    /** The speed now (1 or 2), while a wave is on; 1 otherwise. */
    public static get ioSpeed(): int {
        return IoHfoUi._ioSpeedOn ? IoHfoUi._ioSpeedWant : 1;
    }

    /** 1x or 2x, while a wave is on (the speed button; tests too). */
    public static ioSetSpeed(n: int): void {
        IoHfoUi._ioSpeedWant = n >= 2 ? 2 : 1;
        if (IoHfoUi._ioSpeedOn) {
            GLOBAL.ioStepScale = IoHfoUi._ioSpeedWant;
        }
        IoHfoUi.ioSpeedButton();
    }

    /** The button at the right of the wave's bar ("Speed 1x" / "Speed 2x"), drawn again with the speed. */
    private static ioSpeedButton(): void {
        if (IoHfoUi._ioSpeedBtn && IoHfoUi._ioSpeedBtn.parent) {
            IoHfoUi._ioSpeedBtn.parent.removeChild(IoHfoUi._ioSpeedBtn);
        }
        IoHfoUi._ioSpeedBtn = null;
        if (!IoHfoUi._ioSpeedOn || !IoHfoUi._waveBar) {
            return;
        }
        let b: Sprite = IoHfoUi.iceButton(KEYS.Get("io_ev3_speed", { "v1": IoHfoUi._ioSpeedWant }), 104, 26, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoHfoUi.ioSetSpeed(IoHfoUi._ioSpeedWant >= 2 ? 1 : 2);
        }, true, IoHfoUi._ioSpeedWant >= 2);
        b.name = "ioWaveSpeed";
        b.x = IoHfoUi._ioBarHalf + 8;
        b.y = 9;
        IoHfoUi._ioSpeedBtn = b;
        IoHfoUi._waveBar.mouseChildren = true;
        IoHfoUi._waveBar.addChild(b);
    }

    /** Half the wave bar's width (its panel, without the speed button). */
    private static _ioBarHalf: int = 150;

    /** Shows or updates the bar: `text` over it, the yard destroyed filling it, a line where the wave is lost. */
    public static WaveBar(name: string, text: string, destroyed: int, lose: int): void {
        if (!GLOBAL._layerUI) {
            return;
        }
        if (!IoHfoUi._waveBar || IoHfoUi._waveBar.name != name) {
            IoHfoUi.WaveBarOff();
            IoHfoUi._waveBar = new Sprite();
            IoHfoUi._waveBar.name = name;
            IoHfoUi._waveBar.mouseEnabled = false;
            // (QoL #114: its speed button takes clicks; the bar and its text don't)
            IoHfoUi._waveBar.mouseChildren = GLOBAL.INFERNO_ONLY && IoHfoUi._ioSpeedOn;
            IoHfoUi._waveBarText = IoHfoUi.label("", 12, 15267583, true, 600, TextFormatAlign.CENTER);
            IoHfoUi._waveBarText.name = name + "Text";
            IoHfoUi._waveBarText.filters = [new GlowFilter(0x0A2A4A, 1, 4, 4, 6, 1)];
            IoHfoUi._waveBarText.y = 4;
            IoHfoUi._waveBar.addChild(IoHfoUi._waveBarText);
        }
        let t: TextField = IoHfoUi._waveBarText;
        t.text = text;
        let w: int = Math.max(300, (t.textWidth | 0) + 40) | 0;
        t.width = w - 16;
        t.height = 20;
        t.x = -t.width / 2;
        let barW: int = (w - 40) | 0;
        let barX: int = (-barW / 2) | 0;
        let barY: int = 26;
        let g: any = IoHfoUi._waveBar.graphics;
        g.clear();
        g.lineStyle(2, 10149119, 1);
        g.beginFill(928324, 0.88);
        g.drawRoundRect(-w / 2, 0, w, 44, 14, 14);
        g.endFill();
        g.lineStyle(1, 0x3A6A94, 1);
        g.beginFill(0x081626, 1);
        g.drawRect(barX, barY, barW, IoHfoUi.BAR_H);
        g.endFill();
        let pct: number = Math.max(0, Math.min(100, destroyed));
        g.lineStyle(0, 0, 0);
        g.beginFill((destroyed >= lose - 20 ? 0xE0501C : 0xFF9A3A) >>> 0, 1);
        g.drawRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * pct / 100), IoHfoUi.BAR_H - 2);
        g.endFill();
        // the losing line
        g.lineStyle(2, 16777215, 1);
        g.moveTo(barX + barW * lose / 100, barY - 3);
        g.lineTo(barX + barW * lose / 100, barY + IoHfoUi.BAR_H + 3);
        // (QoL #114: the speed button at its right, moved with its width)
        if (IoHfoUi._ioSpeedOn) {
            IoHfoUi._ioBarHalf = (w / 2) | 0;
            if (!IoHfoUi._ioSpeedBtn) {
                IoHfoUi.ioSpeedButton();
            } else {
                IoHfoUi._ioSpeedBtn.x = IoHfoUi._ioBarHalf + 8;
            }
        }
        GLOBAL.RefreshScreen();
        IoHfoUi._waveBar.x = (GLOBAL._SCREEN.x + GLOBAL._SCREEN.width / 2) | 0;
        IoHfoUi._waveBar.y = (GLOBAL._SCREEN.y + 84) | 0;
        if (IoHfoUi._waveBar.parent != GLOBAL._layerUI) {
            GLOBAL._layerUI.addChild(IoHfoUi._waveBar);
        }
    }

    public static WaveBarOff(): void {
        if (IoHfoUi._waveBar && IoHfoUi._waveBar.parent) {
            IoHfoUi._waveBar.parent.removeChild(IoHfoUi._waveBar);
        }
        IoHfoUi._waveBar = null;
        IoHfoUi._waveBarText = null;
        IoHfoUi._ioSpeedBtn = null;
    }

    /** buttons: [[text, onClick], ...]; the first is the main one. */
    private static popup(header: string, title: string, body: string, buttons: any[]): MovieClip {
        let art: Sprite = null;
        let mc: MovieClip = new MovieClip();
        mc.name = "ioHfoPopup";
        let bodyField: TextField = IoHfoUi.label("", 13, 15398143, false, (IoHfoUi.POP_W - 60) | 0, TextFormatAlign.CENTER);
        bodyField.multiline = true;
        bodyField.wordWrap = true;
        bodyField.htmlText = body;
        bodyField.autoSize = TextFieldAutoSize.CENTER;
        let h: int = (20 + 150 + 14 + (bodyField.textHeight | 0) + 16 + 40 + 22) | 0;
        let left: int = (-IoHfoUi.POP_W / 2) | 0;
        let top: int = (-((h / 2) | 0)) | 0;
        let m: Matrix = new Matrix();
        m.createGradientBox(IoHfoUi.POP_W, h, Math.PI / 2, left, top);
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(4, 398372, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E4466, 0x0E2238, 0x081626], [1, 1, 1], [0, 120, 255], m);
        bg.graphics.drawRoundRect(left, top, IoHfoUi.POP_W, h, 24, 24);
        bg.graphics.endFill();
        bg.graphics.lineStyle(2, 10149119, 0.9);
        bg.graphics.drawRoundRect(left + 5, top + 5, IoHfoUi.POP_W - 10, h - 10, 20, 20);
        bg.filters = [new GlowFilter(0x6AC8FF, 0.6, 18, 18, 2, 2)];
        mc.addChild(bg);
        IoKit.rim(mc, "ioHfoRim", left, top, IoHfoUi.POP_W, h, bg, "frame_ice");
        art = new Sprite();
        art.x = -220;
        art.y = top + 20;
        mc.addChild(art);
        ImageCache.GetImageWithCallBack("hfo/ui/" + header, (key: string, bmd: BitmapData, args: any[] = null): void => {
            let b: Bitmap = new Bitmap(bmd);
            b.smoothing = true;
            art.addChildAt(b, 0);
        });
        let titleField: TextField = IoHfoUi.label(title, 26, 16777215, false, 440, TextFormatAlign.CENTER, "Groboldov");
        titleField.embedFonts = true;
        titleField.height = 40;
        titleField.y = 150 - 46;
        titleField.filters = [new GlowFilter(0x1A5AA0, 1, 6, 6, 6, 2), new DropShadowFilter(2, 45, 0, 0.9, 3, 3, 1, 2)];
        art.addChild(titleField);
        bodyField.x = left + 30;
        bodyField.y = top + 20 + 150 + 14;
        mc.addChild(bodyField);
        let bw: int = buttons.length > 1 ? 180 : 220;
        let gap: int = 16;
        let total: int = (buttons.length * bw + (buttons.length - 1) * gap) | 0;
        for (let i: int = 0; i < buttons.length; i++) {
            let b: Sprite = IoHfoUi.iceButton(String(buttons[i][0]), bw, 36, as3.as(buttons[i][1], Function), true, i == 0);
            b.x = -total / 2 + i * (bw + gap);
            b.y = top + h - 22 - 36;
            mc.addChild(b);
        }
        return mc;
    }

    private static show(mc: MovieClip): void {
        POPUPS.Push(mc, null, null, "", "", false, "now");
    }

    /** A time of day, in the player's own time (HH:MM). */
    private static clock(seconds: number): string {
        let d: Date = new Date(seconds * 1000);
        return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
    }

    /**
     * QoL #583: the first time a day of the event is seen in this browser, what it wants. (Ice just appeared, and
     * Day 2's task was never said.) Kept per player and per run of the event.
     */
    public static DayPopup(begun: boolean = false): void {
        let f: any = IoHfo.flag();
        let day: int = f ? f.day | 0 : 0;
        if (day < 1 || day > 3) {
            return;
        }
        let key: string = "ioHfoDay" + LOGIN._playerID + "_" + (Number(f.t0) || 0) + "_" + day;
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            if (so.data[key]) {
                return;
            }
            so.data[key] = 1;
            so.flush();
        } catch (e) {
            return;
        }
        let body: string = KEYS.Get("io_hfo_day" + day + "_body");
        if (begun && GLOBAL.INFERNO_ONLY) {
            // (QoL #108: the day began in the yard, without a reload: it says so)
            body = "<b>" + KEYS.Get("io_ev3_day_begun", { "v1": day }) + "</b><br><br>" + body;
        }
        IoHfoUi.show(IoHfoUi.popup("popup_frozen.png", KEYS.Get("io_hfo_day" + day + "_title"), body, [[KEYS.Get("btn_ok"), (e: MouseEvent): void => {
            POPUPS.Next();
        }]]));
    }

    /** "Hell has frozen over!": the last tower is free and the waves begin. */
    public static FrozenPopup(): void {
        IoHfoUi.show(IoHfoUi.popup("popup_frozen.png", KEYS.Get("hfo_pop_frozen_title"), KEYS.Get("hfo_pop_frozen_body"), [[KEYS.Get("hfo_pop_frozen_btn"), (e: MouseEvent): void => {
            POPUPS.Next();
            IoHfo.call("seen", [["what", "frozen"]], (r: any): void => {
                IoHfoUi.Hud();
                IoHfoWaves.Start(IoHfo.flag().current | 0);
            });
        }], [KEYS.Get("io_hfo_later"), (e: MouseEvent): void => {
            // (QoL #582: it can be put off; it came back on every load and its only button began wave 1 at once,
            // using a try. Marked seen, the waves start from the event's window when the player is ready.)
            POPUPS.Next();
            IoHfo.call("seen", [["what", "frozen"]], (r: any): void => {
                IoHfoUi.Hud();
                GLOBAL.Message(KEYS.Get("io_hfo_later_note"));
            });
        }]]));
        SOUNDS.Play("quake", 0.3);
    }

    /** After a wave (the server's `last`): won, lost, skipped; and what to do next. */
    public static WaveResult(r: any): void {
        let last: any = null;
        let current: int = 0;
        let f: any = IoHfo.flag();
        last = f ? f.last : null;
        if (!f || !last) {
            return;
        }
        current = f.current | 0;
        let done: boolean = Number(f.done) > 0;
        let close: any[] = [KEYS.Get("btn_close"), (e: MouseEvent): void => {
            POPUPS.Next();
        }];
        let buttons: any[] = [];
        let title: string = null;
        let body: string = null;
        let header: string = null;
        if (last.result == "won") {
            header = "popup_wave_won.png";
            if ((last.wave | 0) == 13 && (last.paid | 0) > 0) {
                title = KEYS.Get("hfo_pop_final_title");
                body = KEYS.Get("hfo_pop_final_body", { "v1": last.paid | 0 });
            } else {
                title = KEYS.Get("hfo_pop_wave_won_title");
                body = (last.paid | 0) > 0 ? KEYS.Get("hfo_pop_wave_won_body", { "v1": last.paid | 0 }) : KEYS.Get("hfo_pop_wave_won_replay_body");
            }
            if (done) {
                buttons.push([KEYS.Get("btn_ok"), (e: MouseEvent): void => {
                    POPUPS.Next();
                    IoHfo.Reveal();
                }]);
            } else if (current <= 13) {
                buttons.push([KEYS.Get("hfo_pop_wave_won_btn"), (e: MouseEvent): void => {
                    POPUPS.Next();
                    IoHfoWaves.Start(current);
                }], close);
            } else {
                buttons.push([KEYS.Get("btn_ok"), (e: MouseEvent): void => {
                    POPUPS.Next();
                    IoHfoUi.ShowWindow();
                }]);
            }
            SOUNDS.Play("chaching");
        } else {
            header = "popup_wave_failed.png";
            title = KEYS.Get("hfo_pop_wave_failed_title");
            if (last.replay) {
                body = KEYS.Get("hfo_pop_wave_replay_failed_body");
                buttons.push([KEYS.Get("hfo_pop_wave_retry_btn"), (e: MouseEvent): void => {
                    POPUPS.Next();
                    IoHfoWaves.Start(last.wave | 0);
                }], close);
            } else if (!last.skipped) {
                body = KEYS.Get("hfo_pop_wave_failed_body", { "v1": last.triesLeft | 0 });
                buttons.push([KEYS.Get("hfo_pop_wave_retry_btn"), (e: MouseEvent): void => {
                    POPUPS.Next();
                    IoHfoWaves.Start(current);
                }], close);
            } else {
                body = KEYS.Get("hfo_pop_wave_skipped_body");
                if (current <= 13) {
                    buttons.push([KEYS.Get("hfo_pop_wave_won_btn"), (e: MouseEvent): void => {
                        POPUPS.Next();
                        IoHfoWaves.Start(current);
                    }], close);
                } else {
                    buttons.push([KEYS.Get("btn_ok"), (e: MouseEvent): void => {
                        POPUPS.Next();
                        IoHfoUi.ShowWindow();
                    }]);
                }
            }
        }
        IoHfoUi.show(IoHfoUi.popup(header, title, body, buttons));
    }

    /** The curse is broken: Rimegrave can be unlocked. Opens the Strongbox on him. */
    public static ChampionPopup(): void {
        IoHfoUi.show(IoHfoUi.popup("popup_champion.png", KEYS.Get("hfo_pop_champion_title"), KEYS.Get("hfo_pop_champion_body"), [[KEYS.Get("hfo_pop_champion_btn"), (e: MouseEvent): void => {
            POPUPS.Next();
            CREATURELOCKER._popupCreatureID = CREATURELOCKER.RIMEGRAVE_ID;
            CREATURELOCKER._page = 5;
            CREATURELOCKER.Show();
        }], [KEYS.Get("btn_close"), (e: MouseEvent): void => {
            POPUPS.Next();
        }]]));
    }

    // ---- Rimegrave, standing where the ice was (a few seconds, then he fades)
    public static ShowRimegrave(at: Point): void {
        let frame: BitmapData = null;
        let raster: RasterData = null;
        let ticks: int = 0;
        let holder: Sprite = null;
        let step: Function = null;
        if (!BYMConfig.instance.RENDERER_ON || !MAP.instance) {
            return;
        }
        SPRITES.SetupSprite("IC25_1");
        let size: any[] = as3.cast(IoRimegrave.SHEETS[0], Array);
        frame = new BitmapData(size[0] | 0, size[1] | 0, true, 0);
        let off: Point = MAP.instance.offset;
        let pt: Point = new Point(at.x - (size[2] | 0) - off.x, at.y + 20 - (size[3] | 0) - off.y);
        raster = new RasterData(as3.cast(frame, IBitmapDrawable), pt, IoHfoArt.mapDepth(at.x, at.y + 40));
        ticks = 0;
        holder = new Sprite();
        step = (e: Event): void => {
            ticks++;
            // facing the camera (90 degrees: column 4), standing; the walk rows breathe a little
            let sheet: any = SPRITES.GetSpriteDescriptor("IC25_1");
            if (sheet && sheet.image) {
                SPRITES.GetFrameById(frame, "IC25_1", 4, (ticks < 60 ? 0 : 9 + ((ticks / 6) | 0) % 6) | 0);
            }
            if (ticks > 200) {
                raster.alpha = Math.max(0, 1 - (ticks - 200) / 40);
            }
            if (ticks > 240) {
                holder.removeEventListener(Event.ENTER_FRAME, step);
                raster.clear();
            }
        };
        holder.addEventListener(Event.ENTER_FRAME, step);
    }

    public static CloseWindow(e: MouseEvent = null): void {
        if (!IoHfoUi._window) {
            return;
        }
        if (e) {
            SOUNDS.Play("close");
        }
        GLOBAL.BlockerRemove();
        if (IoHfoUi._window.parent) {
            IoHfoUi._window.parent.removeChild(IoHfoUi._window);
        }
        IoHfoUi._window = null;
    }

    public static ShowWindow(e: MouseEvent = null): void {
        if (IoHfoUi._window || !IoHfo.inYard()) {
            return;
        }
        if (WMATTACK._inProgress) {
            GLOBAL.Message(KEYS.Get("hfo_err_attack"));
            return;
        }
        if (e) {
            SOUNDS.Play("click1");
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        IoHfo.call("status", [["v", "1"]], (r: any): void => {
            PLEASEWAIT.Hide();
            if (!IoHfoUi._window && IoHfo.inYard() && !WMATTACK._inProgress) {
                IoHfoUi.build();
            }
        }, (): void => {
            PLEASEWAIT.Hide();
        });
    }

    private static build(): void {
        let banner: Sprite = null;
        let thermo: Sprite = null;
        let f: any = IoHfo.flag();
        if (!f) {
            return;
        }
        let left: int = (-IoHfoUi.W / 2) | 0;
        let top: int = (-IoHfoUi.H / 2) | 0;
        let mc: MovieClip = new MovieClip();
        mc.name = "ioHfoWindow";
        let m: Matrix = new Matrix();
        m.createGradientBox(IoHfoUi.W, IoHfoUi.H, Math.PI / 2, left, top);
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(4, 398372, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x24507A, 0x10263E, 0x08121F], [1, 1, 1], [0, 110, 255], m);
        bg.graphics.drawRoundRect(left, top, IoHfoUi.W, IoHfoUi.H, 26, 26);
        bg.graphics.endFill();
        bg.graphics.lineStyle(2, 10149119, 0.9);
        bg.graphics.drawRoundRect(left + 6, top + 6, IoHfoUi.W - 12, IoHfoUi.H - 12, 22, 22);
        // icicles along the top
        bg.graphics.lineStyle(0, 0, 0);
        for (let ix: int = (left + 18) | 0; ix < -left - 18; ix += 22) {
            bg.graphics.beginFill(13627391, 0.55);
            bg.graphics.moveTo(ix, top + 7);
            bg.graphics.lineTo(ix + 10, top + 7);
            bg.graphics.lineTo(ix + 5, top + 14 + (ix * 7 % 11 + 11) % 11);
            bg.graphics.endFill();
        }
        bg.filters = [new GlowFilter(0x6AC8FF, 0.6, 22, 22, 2, 2)];
        mc.addChild(bg);
        // (the frozen kit's rim, 11 October)
        IoKit.rim(mc, "ioHfoRim", left, top, IoHfoUi.W, IoHfoUi.H, bg, "frame_ice");

        // the banner
        banner = new Sprite();
        banner.x = -357;
        banner.y = top + 22;
        mc.addChild(banner);
        ImageCache.GetImageWithCallBack("hfo/promo/hellfreezesoverbanner.jpg", (key: string, bmd: BitmapData, args: any[] = null): void => {
            banner.addChild(new Bitmap(bmd));
        });

        // the thermometer: heat restored
        let won: int = 0;
        let waves: any[] = as3.as(f.waves, Array);
        for (let w of as3.values(waves)) {
            if (w[1]) {
                won++;
            }
        }
        thermo = new Sprite();
        thermo.x = left + 40;
        thermo.y = top + 132;
        mc.addChild(thermo);
        ImageCache.GetImageWithCallBack("hfo/ui/thermo_" + (won < 10 ? "0" : "") + won + ".png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let b: Bitmap = new Bitmap(bmd);
            b.smoothing = true;
            b.scaleX = b.scaleY = 1.5;
            thermo.addChild(b);
        });
        // (two lines under the thermometer: on one, "Heat restored: 13 / 13" was cut off)
        let heat: TextField = IoHfoUi.label("", 12, 16767392, true, 130, TextFormatAlign.CENTER);
        heat.multiline = true;
        heat.wordWrap = true;
        heat.height = 40;
        // the count on its own line ("Heat restored:" / "13 / 13", in every language: after the first colon)
        heat.text = KEYS.Get("hfo_hud_heat", { "v1": won }).replace(/:\s*/, ":\n");
        heat.x = left + 8;
        heat.y = top + 132 + 226;
        mc.addChild(heat);

        // the story so far
        let desc: TextField = IoHfoUi.label("", 12, 14478330, false, 250, TextFormatAlign.LEFT, "Georgia", true);
        desc.multiline = true;
        desc.wordWrap = true;
        desc.htmlText = KEYS.Get("hfo_event_desc");
        desc.autoSize = TextFieldAutoSize.LEFT;
        desc.x = left + 120;
        desc.y = top + 128;
        mc.addChild(desc);
        let y: int = (desc.y + desc.textHeight + 14) | 0;
        let note: string = null;
        if ((f.day | 0) < 4) {
            note = f.towers.iced ? KEYS.Get("hfo_hud_towers", { "v1": (as3.as(f.towers.thawed, Array)).length, "v2": (as3.as(f.towers.iced, Array)).length }) + "<br>" + KEYS.Get("hfo_tower_frozen_desc") : KEYS.Get("hfo_tower_frozen_desc");
        } else if (Number(f.done) > 0) {
            note = KEYS.Get("hfo_pop_champion_body");
        } else if ((f.current | 0) > 13) {
            note = KEYS.Get("hfo_banner_weakening");
        }
        if (note) {
            let noteField: TextField = IoHfoUi.label("", 12, 10149119, true, 250, TextFormatAlign.LEFT);
            noteField.multiline = true;
            noteField.wordWrap = true;
            noteField.htmlText = note;
            noteField.autoSize = TextFieldAutoSize.LEFT;
            noteField.x = left + 120;
            noteField.y = y;
            mc.addChild(noteField);
            y = (noteField.y + noteField.textHeight + 12) | 0;
        }
        if (GLOBAL.INFERNO_ONLY && !(Number(f.done) > 0)) {
            // (QoL #109: the wave to fight, what it pays and its tries)
            let current: int = f.current | 0;
            if ((f.day | 0) >= 4 && current >= 1 && current <= 13) {
                let cw: any[] = as3.as(waves[current - 1], Array);
                let prize: int = IoHfoUi.prize(f, current);
                let line: string = "<b>" + KEYS.Get("hfo_wave_n", { "v1": current }) + "</b>" + (prize > 0 ? ": " + KEYS.Get("io_hfo2_prize", { "v1": prize }) : "") + "  ·  " + KEYS.Get("hfo_hud_tries", { "v1": Math.max(0, (f.tries | 0) - (cw ? cw[0] | 0 : 0)) });
                y = IoHfoUi.windowNote(mc, "ioHfoNoteWave", line, 0xFFD27A, left, y);
            }
            // (QoL #594: the Compound is sealed while a wave is on, as the invasions' window says)
            if ((f.day | 0) >= 3) {
                y = IoHfoUi.windowNote(mc, "ioHfoNoteCompound", KEYS.Get("io_hfo2_compound"), 0xA8C8E8, left, y);
            }
        }

        // the waves: two columns
        let listX: int = (left + 390) | 0;
        let listY: int = (top + 128) | 0;
        for (let i: int = 0; i < 13; i++) {
            let row: Sprite = IoHfoUi.waveRow((i + 1) | 0, as3.as(waves[i], Array), f);
            row.x = listX + (i < 7 ? 0 : 172);
            row.y = listY + (i < 7 ? i : i - 7) * 52;
            mc.addChild(row);
        }

        // close
        let x: Sprite = new Sprite();
        x.name = "ioHfoClose";
        x.buttonMode = true;
        x.mouseChildren = false;
        x.graphics.lineStyle(2, 10149119, 1);
        x.graphics.beginFill(926264, 1);
        x.graphics.drawCircle(0, 0, 14);
        x.graphics.endFill();
        x.graphics.lineStyle(3, 16777215, 1);
        x.graphics.moveTo(-5, -5);
        x.graphics.lineTo(5, 5);
        x.graphics.moveTo(5, -5);
        x.graphics.lineTo(-5, 5);
        x.x = -left - 22;
        x.y = top + 22;
        x.addEventListener(MouseEvent.CLICK, IoHfoUi.CloseWindow);
        mc.addChild(x);

        IoHfoUi._window = mc;
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        POPUPSETTINGS.AlignToCenter(mc);
        POPUPSETTINGS.ScaleUp(mc);
    }

    /** A note in the window's left column, under the story (QoL #109, #594); the y under it. */
    private static windowNote(mc: MovieClip, name: string, html: string, color: uint, left: int, y: int): int {
        let field: TextField = IoHfoUi.label("", 11, color, false, 250, TextFormatAlign.LEFT);
        field.name = name;
        field.multiline = true;
        field.wordWrap = true;
        field.htmlText = html;
        field.autoSize = TextFieldAutoSize.LEFT;
        field.x = left + 120;
        field.y = y;
        mc.addChild(field);
        return (field.y + field.textHeight + 10) | 0;
    }

    /** One wave in the list: its mark, its number and state, the tries left (the one to fight), a button. */
    private static waveRow(wave: int, w: any[], f: any): Sprite {
        let mark: Sprite = null;
        let row: Sprite = new Sprite();
        row.name = "ioHfoWave" + wave;
        let tries: int = w ? w[0] | 0 : 0;
        let won: boolean = Boolean(w && w[1]);
        let skipped: boolean = Boolean(w && w[2] && !won);
        let current: boolean = (f.current | 0) == wave && (f.day | 0) >= 4;
        row.graphics.lineStyle(1, (current ? 0xFFD9A0 : 0x3A6A94) >>> 0, 1);
        row.graphics.beginFill((current ? 0x2A3A50 : 0x0E2238) >>> 0, 0.85);
        row.graphics.drawRoundRect(0, 0, 162, 46, 10, 10);
        row.graphics.endFill();
        mark = new Sprite();
        mark.x = 6;
        mark.y = 10;
        row.addChild(mark);
        ImageCache.GetImageWithCallBack("hfo/ui/" + (won ? "wave_won.png" : (skipped ? "wave_skipped.png" : "wave_pending.png")), (key: string, bmd: BitmapData, args: any[] = null): void => {
            mark.addChild(new Bitmap(bmd));
        });
        let name: TextField = IoHfoUi.label(KEYS.Get("hfo_wave_n", { "v1": wave }), 12, 16777215, true, 120, TextFormatAlign.LEFT);
        name.x = 36;
        name.y = 2;
        row.addChild(name);
        let state: TextField = IoHfoUi.label(KEYS.Get(won ? "hfo_wave_won" : (skipped ? "hfo_wave_skipped" : "hfo_wave_pending")), 9, (won ? 0xFFD27A : (skipped ? 0xFF9A8A : 0xA8C8E8)) >>> 0, false, 124, TextFormatAlign.LEFT);
        state.multiline = true;
        state.wordWrap = true;
        state.height = 26;
        state.x = 36;
        state.y = 18;
        row.addChild(state);
        // (QoL #109: what a wave still to win pays; the one to fight says it in the left column, by its tries)
        let prize: int = GLOBAL.INFERNO_ONLY && !won && !skipped && !current ? IoHfoUi.prize(f, wave) : 0;
        if (prize > 0) {
            let pay: TextField = IoHfoUi.label(KEYS.Get("io_hfo2_prize", { "v1": prize }), 9, 0xFFD27A, true, 66, TextFormatAlign.RIGHT);
            pay.name = "ioHfoWavePrize" + wave;
            pay.x = 90;
            pay.y = 4;
            row.addChild(pay);
        }
        if (current) {
            // the tries left, then Start
            for (let t: int = 0; t < (f.tries | 0); t++) {
                let tryMark: Sprite = new Sprite();
                tryMark.x = 92 + t * 14;
                tryMark.y = 3;
                tryMark.scaleX = tryMark.scaleY = 0.7;
                row.addChild(tryMark);
                IoHfoUi.loadInto(tryMark, "hfo/ui/" + (t < (f.tries | 0) - tries ? "try.png" : "try_used.png"));
            }
            state.visible = false;
            let start: Sprite = IoHfoUi.iceButton(KEYS.Get("hfo_wave_start_btn"), 100, 22, (e: MouseEvent): void => {
                IoHfoWaves.Start(wave);
            }, true, true);
            start.x = 36;
            start.y = 20;
            row.addChild(start);
        } else if (skipped && (f.day | 0) >= 4) {
            state.visible = false;
            let replay: Sprite = IoHfoUi.iceButton(KEYS.Get("hfo_wave_replay_btn"), 100, 22, (e: MouseEvent): void => {
                IoHfoWaves.Start(wave);
            }, true, false);
            replay.x = 36;
            replay.y = 20;
            row.addChild(replay);
        }
        return row;
    }

    private static loadInto(holder: Sprite, path: string): void {
        ImageCache.GetImageWithCallBack(path, (key: string, bmd: BitmapData, args: any[] = null): void => {
            holder.addChild(new Bitmap(bmd));
        });
    }

    // ---- helpers
    public static iceButton(text: string, width: int, height: int, onClick: Function, enabled: boolean, main: boolean): Sprite {
        let b: Sprite = null;
        let m: Matrix = null;
        let draw: Function = null;
        b = new Sprite();
        m = new Matrix();
        b.buttonMode = enabled;
        b.mouseChildren = false;
        m.createGradientBox(width, height, Math.PI / 2, 0, 0);
        draw = (hot: boolean): void => {
            b.graphics.clear();
            // the frozen events' kit (11 October): frozen glass (main), frosted steel, dulled when it can't be used
            if (IoKit.slice(b.graphics, !enabled ? "btn_ice_d" : (main ? "btn_ice" : "btn_steel") + (hot ? "_h" : ""), 0, 0, width, height)) {
                return;
            }
            b.graphics.lineStyle(2, (enabled ? 0xE8F8FF : 0x5A6A7A) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, !enabled ? [0x4A5A6A, 0x2A3644, 0x1A2430] : (main ? (hot ? [0xB8F0FF, 0x3AA8F0, 0x1050A8] : [0x9ADCFF, 0x2A88D8, 0x0C3C88]) : (hot ? [0x7A9AB8, 0x3A5A7A, 0x20384E] : [0x6A88A6, 0x2E4A66, 0x182C40])), [1, 1, 1], [0, 140, 255], m);
            b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
            b.graphics.endFill();
        };
        draw(false);
        IoKit.whenLoaded(["btn_ice", "btn_ice_h", "btn_ice_d", "btn_steel", "btn_steel_h"], (): void => {
            draw(false);
        });
        let t: TextField = IoHfoUi.label(text, height >= 30 ? 16 : 11, 16777215, height < 30, width, TextFormatAlign.CENTER, height >= 30 ? "Groboldov" : "Verdana");
        t.embedFonts = height >= 30;
        t.height = height;
        t.y = height >= 30 ? ((height - 24) / 2) | 0 : 3;
        t.filters = [new GlowFilter(0x061A36, 1, 3, 3, 5, 1)];
        b.addChild(t);
        if (enabled) {
            if (main) {
                b.filters = [new GlowFilter(0x6AC8FF, 0.7, 10, 10, 2, 2)];
            }
            b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                draw(true);
            });
            b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                draw(false);
            });
            b.addEventListener(MouseEvent.CLICK, onClick);
        }
        return b;
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string, font: string = "Verdana", italic: boolean = false): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat(font, size, color, bold, italic);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }
}
