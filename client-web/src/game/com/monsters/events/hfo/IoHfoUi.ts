import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, IBitmapDrawable, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { BYMConfig, CREATURELOCKER, GLOBAL, ImageCache, IoHfo, IoHfoArt, IoHfoWaves, IoRimegrave, KEYS, MAP, PLEASEWAIT, POPUPS, POPUPSETTINGS, RasterData, SOUNDS, SPRITES, WMATTACK } from "@game";

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
        if ((f.day | 0) == 3 && f.towers.iced) {
            text = KEYS.Get("hfo_hud_towers", { "v1": (as3.as(f.towers.thawed, Array)).length, "v2": (as3.as(f.towers.iced, Array)).length });
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

    /** "Hell has frozen over!": the last tower is free and the waves begin. */
    public static FrozenPopup(): void {
        IoHfoUi.show(IoHfoUi.popup("popup_frozen.png", KEYS.Get("hfo_pop_frozen_title"), KEYS.Get("hfo_pop_frozen_body"), [[KEYS.Get("hfo_pop_frozen_btn"), (e: MouseEvent): void => {
            POPUPS.Next();
            IoHfo.call("seen", [["what", "frozen"]], (r: any): void => {
                IoHfoUi.Hud();
                IoHfoWaves.Start(IoHfo.flag().current | 0);
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
            b.graphics.lineStyle(2, (enabled ? 0xE8F8FF : 0x5A6A7A) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, !enabled ? [0x4A5A6A, 0x2A3644, 0x1A2430] : (main ? (hot ? [0xB8F0FF, 0x3AA8F0, 0x1050A8] : [0x9ADCFF, 0x2A88D8, 0x0C3C88]) : (hot ? [0x7A9AB8, 0x3A5A7A, 0x20384E] : [0x6A88A6, 0x2E4A66, 0x182C40])), [1, 1, 1], [0, 140, 255], m);
            b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
            b.graphics.endFill();
        };
        draw(false);
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
