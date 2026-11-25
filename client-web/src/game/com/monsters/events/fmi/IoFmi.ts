import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, CREATURELOCKER, GLOBAL, ImageCache, IoFmiWaves, IoKit, IoTrophies, KEYS, PLEASEWAIT, POPUPSETTINGS, SOUNDS, URLLoaderApi, WMATTACK } from "@game";

/**
 * Inferno-only (10 October): the Frozen Monster Invasions (the server: services/events/fmi.ts; the waves:
 * IoFmiWaves). Every month from the 15th for a week, Invasion 1 and 2 taking turns, for players who have won Hell
 * Freezes Over's last wave. The server sends this month's invasion as the flag io_fmi (none: the player can't
 * take part) and with every answer. The button sits in the workers' column where Moloch's Gauntlet's goes
 * (UI_TOP.ioFmiButton), shown while the invasion is on and from a week before; it opens this window: the invasion,
 * how far the player has held it off, the next wave's attackers, the totem, and Fight.
 *
 * Only on the player's own main yard in build mode (not outposts, attacks, visits or Designer drafts).
 */
export class IoFmi extends ASObject {
    private static _raw: string = null;

    private static _flag: any = null;

    private static _ticker: Sprite = null;

    private static _window: MovieClip = null;

    private static readonly W: int = 640;

    private static readonly H: int = 470;

    /** The totem's level after each wave won (as the server's TOTEM_LEVELS). */
    public static readonly TOTEM_AT: any[] = [[1, 1], [10, 2], [20, 3], [30, 4], [31, 5], [32, 6]];

    public $ctor(): void {
        super.$ctor();
    }

    /** This month's invasion as the server last said, or null (the player can't take part). */
    public static flag(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_fmi ? String(GLOBAL._flags.io_fmi) : "";
        if (raw != IoFmi._raw) {
            IoFmi._raw = raw;
            IoFmi._flag = null;
            if (raw != "") {
                try {
                    IoFmi._flag = JSON.parse(raw);
                } catch (e) {
                    IoFmi._flag = null;
                }
            }
        }
        return IoFmi._flag;
    }

    /** Which invasion this month's is (1 or 2). */
    public static kind(): int {
        let f: any = IoFmi.flag();
        return f && (f.kind | 0) == 2 ? 2 : 1;
    }

    public static inYard(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && !GLOBAL.ioDesignMode() && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
    }

    /** The button shows: the player may take part, and the invasion is on or comes within a week. */
    public static buttonShown(): boolean {
        let f: any = IoFmi.flag();
        return Boolean(f && (f.open || f.soon)) && IoFmi.inYard();
    }

    /** Its ring turns: on, and a wave left to fight. */
    public static waveWaiting(): boolean {
        let f: any = IoFmi.flag();
        return Boolean(f && f.open && (f.won | 0) < (f.waves | 0)) && !IoFmiWaves.running;
    }

    /** The button's tip. */
    public static tip(): string {
        let f: any = IoFmi.flag();
        let title: string = KEYS.Get("io_t3m_fmi_tip_title", { "v1": IoFmi.kind() == 2 ? "2" : "1" });
        if (!f) {
            return title + KEYS.Get("io_t3m_fmi_tip_monthly");
        }
        if (!f.open) {
            return title + KEYS.Get("io_t3m_fmi_tip_comes", { "v1": IoFmi.span(Number(f.startsAt) - GLOBAL.Timestamp()) });
        }
        if ((f.won | 0) >= (f.waves | 0)) {
            return title + KEYS.Get("io_t3m_fmi_tip_all", { "v1": f.waves | 0 });
        }
        return title + KEYS.Get("io_t3m_fmi_tip_on", { "v1": (f.won | 0) + 1, "v2": f.waves | 0, "v3": IoFmi.span(Number(f.endsAt) - GLOBAL.Timestamp()) });
    }

    public static Setup(): void {
        IoFmi.Cleanup();
        if (!IoFmi.inYard()) {
            return;
        }
        if (!IoFmi._ticker) {
            IoFmi._ticker = new Sprite();
        }
        IoFmi._ticker.addEventListener(Event.ENTER_FRAME, IoFmi.tick);
    }

    public static Cleanup(): void {
        if (IoFmi._ticker) {
            IoFmi._ticker.removeEventListener(Event.ENTER_FRAME, IoFmi.tick);
        }
        IoFmi.CloseWindow();
    }

    private static tick(e: Event): void {
        IoFmiWaves.Tick();
    }

    // ---- the server
    /** POST fmi/<action>; `ok` gets the answer (its progress applied first), `failed` an error. */
    /** `quiet`: no message when the server can't be reached (`failed(true)`: the caller tries again). */
    public static call(action: string, vars: any[], ok: Function = null, failed: Function = null, quiet: boolean = false): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "fmi/" + action, vars || [["v", "1"]], (r: any): void => {
            if (!r || r.error) {
                if (quiet && !r) {
                    if (failed != null) {
                        failed(true);
                    }
                    return;
                }
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_t3m_no_answer"));
                if (failed != null) {
                    failed(false);
                }
                return;
            }
            IoFmi.apply(r);
            if (ok != null) {
                ok(r);
            }
        }, (err: any): void => {
            if (!quiet) {
                GLOBAL.Message(KEYS.Get("io_t3m_no_answer2"));
            }
            if (failed != null) {
                failed(true);
            }
        });
    }

    /** An answer: the progress as it is now (into the flags, as the next poll would bring it). */
    private static apply(r: any): void {
        if (r && r.fmi && GLOBAL._flags) {
            GLOBAL._flags.io_fmi = JSON.stringify(r.fmi);
            if (r.fmi.trophies) {
                GLOBAL._flags.io_trophies = JSON.stringify(r.fmi.trophies);
                IoTrophies.Sync();
            }
        }
    }

    // ---- words
    /** "6d 4h", "3h 12m", "12m". */
    public static span(seconds: number): string {
        let s: int = Math.max(0, seconds) | 0;
        let d: int = (s / 86400) | 0;
        let h: int = ((s % 86400) / 3600) | 0;
        let m: int = ((s % 3600) / 60) | 0;
        if (d > 0) {
            return KEYS.Get("io_t3m_span_dh", { "v1": d, "v2": h });
        }
        if (h > 0) {
            return KEYS.Get("io_t3m_span_hm", { "v1": h, "v2": m });
        }
        return KEYS.Get("io_t3m_span_m", { "v1": Math.max(1, m) });
    }

    /** A monster's name (the tables' id). */
    public static monsterName(id: string): string {
        let c: any = CREATURELOCKER._creatures[id];
        return c ? KEYS.Get(String(c.name)) : id;
    }

    /** A wave's attackers: [[id, how many, level], ...] in the order they first come. */
    public static attackers(kind: int, wave: int): any[] {
        let table: any[] = IoFmiWaves.waves(kind);
        let surges: any[] = as3.as(table[Math.max(0, Math.min(table.length, wave) - 1)], Array) || [];
        let out: any[] = [];
        let at: any = {};
        for (let s of as3.values(surges)) {
            for (let g of as3.values(as3.as(s[1], Array))) {
                let letter: string = String(g[0]);
                let id: string = String(IoFmiWaves.IDS[letter] || letter);
                let champion: boolean = "KDAM".indexOf(letter) >= 0;
                let key: string = champion ? id + ":" + (g[3] | 0) : id;
                if (at[key] == null) {
                    at[key] = out.length;
                    out.push([id, 0, champion ? g[3] | 0 : 0]);
                }
                out[at[key]][1] += champion ? 1 : Math.max(1, Math.round((g[1] | 0) * IoFmiWaves.countScale));
            }
        }
        return out;
    }

    /** The totem's level for so many waves won. */
    public static totemLevel(won: int): int {
        let l: int = 0;
        for (let t of as3.values(IoFmi.TOTEM_AT)) {
            if (won >= (t[0] | 0)) {
                l = t[1] | 0;
            }
        }
        return l;
    }

    /** The next wave that raises the totem (0: none). */
    public static nextTotemWave(won: int): int {
        for (let t of as3.values(IoFmi.TOTEM_AT)) {
            if (won < (t[0] | 0)) {
                return t[0] | 0;
            }
        }
        return 0;
    }

    // ---- the window
    public static ShowWindow(e: MouseEvent = null): void {
        if (IoFmi._window || !IoFmi.inYard()) {
            return;
        }
        if (WMATTACK._inProgress || IoFmiWaves.running) {
            GLOBAL.Message(KEYS.Get("io_t3m_fmi_under_attack"));
            return;
        }
        if (e) {
            SOUNDS.Play("click1");
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        IoFmi.call("status", [["v", "1"]], (r: any): void => {
            PLEASEWAIT.Hide();
            if (!IoFmi._window && IoFmi.inYard() && !WMATTACK._inProgress) {
                IoFmi.build();
            }
        }, (): void => {
            PLEASEWAIT.Hide();
        });
    }

    public static CloseWindow(e: MouseEvent = null): void {
        if (!IoFmi._window) {
            return;
        }
        GLOBAL.BlockerRemove();
        if (IoFmi._window.parent) {
            IoFmi._window.parent.removeChild(IoFmi._window);
        }
        IoFmi._window = null;
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string, font: string = "Verdana"): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat(font, size, color, bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    private static button(text: string, w: int, h: int, onClick: Function, gold: boolean): Sprite {
        let b: Sprite = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        let t: TextField = null;
        let draw: Function = (over: boolean): void => {
            b.graphics.clear();
            // the frozen events' kit (11 October): frozen glass for the main one, frosted steel for the rest
            if (IoKit.slice(b.graphics, (gold ? "btn_ice" : "btn_steel") + (over ? "_h" : ""), 0, 0, w, h)) {
                if (t) {
                    t.textColor = 0xFFFFFF;
                    t.filters = [new GlowFilter(0x061A36, 1, 3, 3, 5, 1)];
                }
                return;
            }
            b.graphics.lineStyle(2, (gold ? 0x8A5A10 : 0x6AC8FF) >>> 0, 1);
            b.graphics.beginFill((gold ? (over ? 0xFFE08A : 0xF2C14E) : (over ? 0x2E5A84 : 0x1C3A5A)) >>> 0, 1);
            b.graphics.drawRoundRect(0, 0, w, h, 12, 12);
            b.graphics.endFill();
        };
        t = IoFmi.label(text, 13, (gold ? 0x2A1A04 : 0xE6F4FF) >>> 0, true, w, TextFormatAlign.CENTER);
        t.y = ((h - 21) / 2) | 0;
        b.addChild(t);
        draw(false);
        IoKit.whenLoaded(["btn_ice", "btn_ice_h", "btn_steel", "btn_steel_h"], (): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick(e);
        });
        return b;
    }

    private static build(): void {
        let f: any = IoFmi.flag();
        if (!f) {
            return;
        }
        let kind: int = f.kind | 0;
        let waves: int = Math.max(1, f.waves | 0) | 0;
        let won: int = f.won | 0;
        let next: int = Math.min(waves, won + 1) | 0;
        let W: int = IoFmi.W;
        // (QoL #112: room for the marks' legend under them)
        let H: int = (GLOBAL.INFERNO_ONLY ? IoFmi.H + IoFmi.LEGEND_H : IoFmi.H) | 0;
        let left: int = (-W / 2) | 0;
        let top: int = (-H / 2) | 0;
        let mc: MovieClip = new MovieClip();
        mc.name = "ioFmiWindow";
        let m: Matrix = new Matrix();
        m.createGradientBox(W, H, Math.PI / 2, left, top);
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(4, 0x061428, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x2E6A9A, 0x12304E, 0x0A1626], [1, 1, 1], [0, 120, 255], m);
        bg.graphics.drawRoundRect(left, top, W, H, 26, 26);
        bg.graphics.endFill();
        bg.graphics.lineStyle(2, 0x9ADCFF, 0.9);
        bg.graphics.drawRoundRect(left + 6, top + 6, W - 12, H - 12, 22, 22);
        bg.graphics.lineStyle(0, 0, 0);
        for (let ix: int = (left + 18) | 0; ix < -left - 18; ix += 22) {
            bg.graphics.beginFill(0xCFEFFF, 0.55);
            bg.graphics.moveTo(ix, top + 7);
            bg.graphics.lineTo(ix + 10, top + 7);
            bg.graphics.lineTo(ix + 5, top + 14 + (ix * 7 % 11 + 11) % 11);
            bg.graphics.endFill();
        }
        bg.filters = [new GlowFilter(0x6AC8FF, 0.6, 22, 22, 2, 2)];
        mc.addChild(bg);
        // (the frozen kit's rim, 11 October)
        IoKit.rim(mc, "ioFmiRim", left, top, W, H, bg, "frame_ice");

        let title: TextField = IoFmi.label(KEYS.Get("io_t3m_fmi_title", { "v1": kind }), 26, 0xFFFFFF, false, W - 60, TextFormatAlign.CENTER, "Groboldov");
        title.embedFonts = true;
        title.height = 40;
        title.filters = [new GlowFilter(0x0A3A6A, 1, 4, 4, 8, 2)];
        title.x = left + 30;
        title.y = top + 22;
        mc.addChild(title);

        let now: number = Number(f.now) || GLOBAL.Timestamp();
        let when: string = f.open ? KEYS.Get("io_t3m_fmi_on_left", { "v1": IoFmi.span(Number(f.endsAt) - now) }) : KEYS.Get("io_t3m_fmi_comes", { "v1": IoFmi.span(Number(f.startsAt) - now) });
        if (f.test) {
            when = "Admin test mode: the invasion is always on, and its progress is the test's own.";
        }
        let sub: TextField = IoFmi.label(when, 13, 0xFFE7A8, true, W - 60, TextFormatAlign.CENTER);
        sub.x = left + 30;
        sub.y = top + 62;
        mc.addChild(sub);

        let story: TextField = IoFmi.label("", 12, 0xD6ECFF, false, W - 80, TextFormatAlign.CENTER);
        story.multiline = true;
        story.wordWrap = true;
        story.text = KEYS.Get(kind == 1 ? "io_t3m_fmi_story1" : "io_t3m_fmi_story2") + KEYS.Get("io_t3m_fmi_story_tail");
        story.autoSize = TextFieldAutoSize.CENTER;
        story.x = left + 40;
        story.y = top + 86;
        mc.addChild(story);

        // the waves: 32 marks in two rows
        let y: int = (story.y + story.textHeight + 16) | 0;
        // (Inferno-only, QoL #605: the progress is this month's: next month's invasion starts again at wave 1)
        let head: TextField = IoFmi.label(GLOBAL.INFERNO_ONLY ? KEYS.Get("io_fmi2_head", { "v1": won, "v2": waves }) : "Waves held off: " + won + " of " + waves, 14, 0xFFFFFF, true, W - 60, TextFormatAlign.CENTER);
        head.name = "ioFmiHead";
        head.x = left + 30;
        head.y = y;
        mc.addChild(head);
        y += 26;
        let perRow: int = 16;
        let markW: int = 30;
        let rowX: int = (-(perRow * markW) / 2) | 0;
        for (let i: int = 0; i < waves; i++) {
            let mark: Sprite = new Sprite();
            let wnum: int = (i + 1) | 0;
            let done: boolean = wnum <= won;
            let isNext: boolean = wnum == won + 1;
            let major: boolean = IoFmi.nextTotemWave(wnum - 1) == wnum;
            mark.graphics.lineStyle(isNext ? 2 : 1, (isNext ? 0xFFD24A : (major ? 0xFFF2B0 : 0x6AC8FF)) >>> 0, 1);
            mark.graphics.beginFill((done ? 0x8FE0FF : 0x0E2238) >>> 0, done ? 0.95 : 0.85);
            mark.graphics.drawRoundRect(0, 0, markW - 4, 24, 8, 8);
            mark.graphics.endFill();
            if (GLOBAL.INFERNO_ONLY && major) {
                // (QoL #112: a wave that grows the totem wears a dot, as the legend shows)
                IoFmi.totemDot(mark, markW - 7, 3);
            }
            let n: TextField = IoFmi.label(String(wnum), 10, (done ? 0x0A2440 : 0xCFE8FF) >>> 0, true, markW - 4, TextFormatAlign.CENTER);
            n.y = 4;
            mark.addChild(n);
            mark.name = "ioFmiWave" + wnum;
            mark.x = rowX + (i % perRow) * markW;
            mark.y = y + ((i / perRow) | 0) * 30;
            mc.addChild(mark);
        }
        y += 66;
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #112: what each mark means)
            let rows: int = Math.ceil(waves / perRow) | 0;
            let legend: Sprite = IoFmi.legend(W - 60);
            legend.y = y - 66 + rows * 30 + 2;
            mc.addChild(legend);
            y += IoFmi.LEGEND_H;
        }

        // the next wave's attackers, with their pictures
        if (won < waves) {
            let nextHead: TextField = IoFmi.label(next == waves ? KEYS.Get("io_t3m_fmi_next_last") : (next >= 31 ? KEYS.Get("io_t3m_fmi_next_bonus", { "v1": next - 30 }) : KEYS.Get("io_t3m_fmi_next", { "v1": next })), 13, 0xFFE7A8, true, W - 60, TextFormatAlign.CENTER);
            nextHead.x = left + 30;
            nextHead.y = y;
            mc.addChild(nextHead);
            y += 24;
            let list: any[] = IoFmi.attackers(kind, next);
            let cellW: int = 92;
            let cells: int = Math.min(6, list.length) | 0;
            let startX: int = (-(cells * cellW) / 2) | 0;
            for (let k: int = 0; k < list.length && k < 6; k++) {
                let a: any[] = as3.as(list[k], Array);
                let cell: Sprite = new Sprite();
                cell.x = startX + k * cellW;
                cell.y = y;
                let pic: Sprite = new Sprite();
                pic.x = (cellW - 44) / 2;
                cell.addChild(pic);
                ImageCache.GetImageWithCallBack("monsters/" + String(a[0]) + "-small.png", (key: string, bmd: BitmapData, args: any[] = null): void => {
                    let b: Bitmap = new Bitmap(bmd);
                    b.smoothing = true;
                    b.width = b.height = 44;
                    pic.addChild(b);
                });
                let line: string = (a[2] | 0) > 0 ? KEYS.Get("io_t3m_fmi_att_level", { "v1": IoFmi.monsterName(String(a[0])), "v2": a[2] | 0 }) : (a[1] | 0) + " " + IoFmi.monsterName(String(a[0]));
                let t: TextField = IoFmi.label(line, 10, 0xFFFFFF, true, cellW, TextFormatAlign.CENTER);
                t.y = 46;
                cell.addChild(t);
                mc.addChild(cell);
            }
            if (list.length > 6) {
                let more: TextField = IoFmi.label(KEYS.Get("io_t3m_fmi_more", { "v1": list.length - 6 }), 10, 0xCFE8FF, false, W - 60, TextFormatAlign.CENTER);
                more.x = left + 30;
                more.y = y + 62;
                mc.addChild(more);
            }
            y += 80;
        } else {
            let all: TextField = IoFmi.label(KEYS.Get("io_t3m_fmi_all_done"), 13, 0xFFE7A8, true, W - 60, TextFormatAlign.CENTER);
            all.x = left + 30;
            all.y = y + 20;
            mc.addChild(all);
            y += 80;
        }

        // the totem
        let trophies: any = f.trophies || {};
        let level: int = trophies["fmi" + kind] | 0;
        let nextAt: int = IoFmi.nextTotemWave(won);
        let tot: TextField = IoFmi.label((level > 0 ? KEYS.Get("io_t3m_fmi_tot_level", { "v1": KEYS.Get("bdg_fmitotem" + kind), "v2": level }) : KEYS.Get("io_t3m_fmi_tot_win", { "v1": KEYS.Get("bdg_fmitotem" + kind) })) + (level > 0 && nextAt > 0 ? KEYS.Get("io_t3m_fmi_tot_grows", { "v1": nextAt }) : ""), 12, 0xD6ECFF, false, W - 60, TextFormatAlign.CENTER);
        tot.x = left + 30;
        tot.y = top + H - 104;
        mc.addChild(tot);

        if (f.open && won < waves) {
            let fight: Sprite = IoFmi.button(KEYS.Get("io_t3m_fmi_fight", { "v1": next }), 200, 40, (e: MouseEvent): void => {
                IoFmiWaves.Start(next);
            }, true);
            fight.name = "ioFmiFight";
            fight.x = -100;
            fight.y = top + H - 70;
            mc.addChild(fight);
        } else {
            let close: Sprite = IoFmi.button(KEYS.Get("btn_close"), 160, 40, IoFmi.CloseWindow, false);
            close.x = -80;
            close.y = top + H - 70;
            mc.addChild(close);
        }

        let x: Sprite = new Sprite();
        x.name = "ioFmiClose";
        x.buttonMode = true;
        x.mouseChildren = false;
        x.graphics.lineStyle(2, 0x9ADCFF, 1);
        x.graphics.beginFill(0x0E2238, 1);
        x.graphics.drawCircle(0, 0, 14);
        x.graphics.endFill();
        x.graphics.lineStyle(3, 0xFFFFFF, 1);
        x.graphics.moveTo(-5, -5);
        x.graphics.lineTo(5, 5);
        x.graphics.moveTo(5, -5);
        x.graphics.lineTo(-5, 5);
        x.x = -left - 22;
        x.y = top + 22;
        x.addEventListener(MouseEvent.CLICK, IoFmi.CloseWindow);
        mc.addChild(x);

        IoFmi._window = mc;
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        POPUPSETTINGS.AlignToCenter(mc);
        POPUPSETTINGS.ScaleUp(mc);
    }

    /** QoL #112: the height the marks' legend takes in the window. */
    private static readonly LEGEND_H: int = 22;

    /** QoL #112: the dot on a mark whose wave grows the totem. */
    private static totemDot(s: Sprite, x: number, y: number): void {
        s.graphics.lineStyle(1, 0x5A3A08, 1);
        s.graphics.beginFill(0xFFF2B0, 1);
        s.graphics.drawCircle(x, y, 3);
        s.graphics.endFill();
    }

    /**
     * QoL #112: the line under the waves' marks saying what each one means (held off, the next to fight, still to
     * come, the totem grows), drawn as the marks are; centred, and made smaller if it is wider than `maxW`.
     */
    private static legend(maxW: int): Sprite {
        let out: Sprite = new Sprite();
        out.name = "ioFmiLegend";
        out.mouseEnabled = false;
        out.mouseChildren = false;
        // [fill, its alpha, line colour, line width, totem dot, key]
        let items: any[] = [[0x8FE0FF, 0.95, 0x6AC8FF, 1, false, "io_ev3_legend_won"], [0x0E2238, 0.85, 0xFFD24A, 2, false, "io_ev3_legend_next"], [0x0E2238, 0.85, 0x6AC8FF, 1, false, "io_ev3_legend_later"], [0x0E2238, 0.85, 0xFFF2B0, 1, true, "io_ev3_legend_totem"]];
        let x: number = 0;
        for (let it of as3.values(items)) {
            let swatch: Sprite = new Sprite();
            swatch.graphics.lineStyle(it[3] | 0, (it[2] | 0) >>> 0, 1);
            swatch.graphics.beginFill((it[0] | 0) >>> 0, Number(it[1]));
            swatch.graphics.drawRoundRect(0, 0, 20, 14, 6, 6);
            swatch.graphics.endFill();
            if (it[4]) {
                IoFmi.totemDot(swatch, 17, 3);
            }
            swatch.x = x;
            swatch.y = 2;
            out.addChild(swatch);
            let t: TextField = IoFmi.label(KEYS.Get(String(it[5])), 10, 0xD6ECFF, false, 200, TextFormatAlign.LEFT);
            t.width = Math.max(10, t.textWidth + 6);
            t.x = x + 25;
            t.y = 0;
            out.addChild(t);
            x = t.x + t.width + 14;
        }
        let total: number = Math.max(1, x - 14);
        let k: number = total > maxW ? maxW / total : 1;
        out.scaleX = out.scaleY = k;
        out.x = -total * k / 2;
        return out;
    }

    /** A wave is over: what happened, and the totem when it grew. */
    public static WaveResult(result: any, r: any): void {
        let wave: int = result.wave | 0;
        let f: any = IoFmi.flag();
        let level: int = f && f.trophies ? f.trophies["fmi" + (result.kind | 0)] | 0 : 0;
        // (the totem won or raised now: not in admin test mode, and not when an earlier month's run already took it higher)
        let grew: boolean = Boolean(result.won) && IoFmi.nextTotemWave(wave - 1) == wave && !result.practice && !(f && f.test) && level == IoFmi.totemLevel(wave);
        let text: string = null;
        if (result.won) {
            text = KEYS.Get("io_t3m_fmi_res_won", { "v1": wave, "v2": result.worst | 0 });
            if (grew) {
                text += KEYS.Get(level <= 1 ? "io_t3m_fmi_res_new" : "io_t3m_fmi_res_grew", { "v1": KEYS.Get("bdg_fmitotem" + result.kind), "v2": level });
            }
            if (f && f.test && IoFmi.nextTotemWave(wave - 1) == wave) {
                text += "<br><br>(Admin test mode: no totem is won.)";
            }
            if (!result.practice && f && (f.won | 0) < (f.waves | 0)) {
                text += KEYS.Get("io_t3m_fmi_res_next", { "v1": wave + 1 });
            }
            SOUNDS.Play("chaching");
        } else {
            text = KEYS.Get("io_t3m_fmi_res_lost", { "v1": wave, "v2": result.destroyed | 0 });
        }
        if (result.practice) {
            text = KEYS.Get("io_t3m_fmi_practice", { "v1": text });
        }
        if (result.won && !result.practice && f && (f.won | 0) < (f.waves | 0)) {
            // (QoL #110: the next wave a click away)
            GLOBAL.Message(text, KEYS.Get("io_t3m_fmi_fight", { "v1": wave + 1 }), (): void => {
                IoFmiWaves.Start((wave + 1) | 0);
            }, null, KEYS.Get("io_hfo_later"), null);
            return;
        }
        GLOBAL.Message(text);
    }
}
