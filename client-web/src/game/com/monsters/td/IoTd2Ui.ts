import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Shape, Sprite } from "flash/display";
import { KeyboardEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { TextField, TextFieldType, TextFormatAlign } from "flash/text";
import { BFOUNDATION, CasinoUI, GLOBAL, IoKit, IoTd, IoTd2, IoTdUi, KEYS, MAP, MonsterBase, SOUNDS } from "@game";

/**
 * Inferno-only (Hellgate Defense 2, IoTd2): its windows and the run's extra interface.
 *
 *  - The start window (from the Devil's Arcade): Campaign, four map cards (a sketch of each arena, its best wave,
 *    its skulls, what opens it), four difficulties, the embers and the Hellforge; or the Daily Challenge (today's
 *    map, its two modifiers, the player's best today).
 *  - The Hellforge: the eight perks, three levels each, bought with embers (td2/perk).
 *  - In the arena: the spell bar over the tower shop (keys 1 to 4; Meteor is aimed with a click on the ground),
 *    the boss bar under the top bar, and the rules the first time.
 *  - The win (wave 40): play on, or leave with it. The end: waves, points, embers, skulls, best.
 *
 * Built with IoTdUi's panels and buttons, so it looks like Hellgate Defense's own.
 */
export class IoTd2Ui extends ASObject {
    private static readonly GOLD: uint = 16765514;

    private static readonly TEXT: uint = 16181192;

    private static readonly DIM: uint = 11048056;

    private static readonly PINK: uint = 0xFF9EDB;

    private static _map: string = "gate";

    private static _diff: string = "normal";

    private static _mode: string = "solo";

    private static _status: any = null;

    private static _busy: boolean = false;

    /** Inferno-only (QoL #382): where the Hellforge's Back goes when it was opened from a run's end (null: the start window). */
    private static _ioForgeBack: Function = null;

    // ---- in the arena
    private static _hud: Sprite = null;

    private static _spells: any = {};

    private static _boss: Sprite = null;

    private static _bossOf: MonsterBase = null;

    private static _bossName: string = "";

    private static _aim: Sprite = null;

    private static _aimThen: Function = null;

    private static _keys: boolean = false;

    private static _helped: boolean = false;

    /** The rules (QoL #235: in the player's language, read when shown: the language file isn't loaded when the class is). */
    private static get RULES(): string {
        return KEYS.Get("io_t3t_td2ui_rules1") + "<br><br>" + KEYS.Get("io_t3t_td2ui_rules2") + "<br>" + KEYS.Get("io_t3t_td2ui_rules3") + "<br>" + KEYS.Get("io_t3t_td2ui_rules4") + "<br>" + KEYS.Get("io_t3t_td2ui_rules5") + "<br>" + KEYS.Get("io_t3t_td2ui_rules6");
    }

    /** QoL #235: a map's name and blurb (the server's map), a perk's or a modifier's name and words, by their ids. */
    private static mapWords(m: any): string {
        return m ? IoTd2.mapNameOf(String(m.id), m.name) : "";
    }

    private static mapBlurb(m: any): string {
        return m ? IoTd2.ioWords("io_t3t_td2_map_" + m.id + "_blurb", m.blurb) : "";
    }

    private static perkName(x: any): string {
        return x ? IoTd2.ioWords("io_t3t_td2_perk_" + x.id + "_name", x.name) : "";
    }

    private static perkText(x: any): string {
        return x ? IoTd2.ioWords("io_t3t_td2_perk_" + x.id + "_text", x.text) : "";
    }

    // ---- helpers (IoTdUi's)
    private static label(text: string, size: int, colour: uint, bold: boolean, width: int, align: string = "left"): TextField {
        return IoTdUi.label(text, size, colour, bold, width, align);
    }

    private static html(box: Sprite, text: string, x: number, y: number, w: int, h: int, size: int = 12): TextField {
        let t: TextField = IoTdUi.label("", size, IoTd2Ui.TEXT, false, w, TextFormatAlign.LEFT);
        t.height = h;
        t.htmlText = text;
        t.x = x;
        t.y = y;
        box.addChild(t);
        return t;
    }

    /** A row of skulls (a map's wins: one for each difficulty), `n` of them lit. */
    public static skullRow(n: int, of: int = 4, size: number = 12): Sprite {
        let row: Sprite = new Sprite();
        row.mouseEnabled = false;
        row.mouseChildren = false;
        for (let i: int = 0; i < of; i++) {
            let lit: boolean = i < n;
            let g: any = row.graphics;
            let x: number = i * size * 1.25 + size / 2;
            let y: number = size / 2;
            let r: number = size * 0.45;
            g.lineStyle(1, 0x1A0804, 1);
            g.beginFill(lit ? 0xFFE0C0 : 0x4A3A2E, 1);
            g.drawCircle(x, y - r * 0.15, r);
            g.endFill();
            g.beginFill(lit ? 0xFFE0C0 : 0x4A3A2E, 1);
            g.drawRect(x - r * 0.5, y + r * 0.45, r, r * 0.55);
            g.endFill();
            g.lineStyle(0, 0, 0);
            g.beginFill(lit ? 0xB0200A : 0x241A14, 1);
            g.drawCircle(x - r * 0.38, y - r * 0.15, r * 0.26);
            g.drawCircle(x + r * 0.38, y - r * 0.15, r * 0.26);
            g.endFill();
        }
        if (n > 0) {
            row.filters = [new GlowFilter(0xFF6A3A, 0.8, 6, 6, 2)];
        }
        return row;
    }

    // ---- the start window
    public static Intro(status: any, mode: string): void {
        IoTd2Ui._status = status;
        IoTd2Ui._ioForgeBack = null;
        IoTd2Ui._mode = mode == "daily" ? "daily" : "solo";
        let maps: any[] = as3.as(status.maps, Array) || [];
        // (the last one played, if it is open; else the furthest open)
        let want: string = IoTd2.lastMap;
        let ok: boolean = false;
        for (let m of as3.values(maps)) {
            if (m.id == want && m.unlocked) {
                ok = true;
            }
        }
        if (!ok) {
            for (let m of as3.values(maps)) {
                if (m.unlocked) {
                    want = String(m.id);
                }
            }
        }
        IoTd2Ui._map = want;
        IoTd2Ui._diff = IoTd2Ui.diffOpen(IoTd2.lastDiff) ? IoTd2.lastDiff : "normal";
        IoTd2Ui.drawIntro();
    }

    private static diffOpen(id: string): boolean {
        for (let d of as3.values(IoTd2Ui._status ? IoTd2Ui._status.difficulties || [] : [])) {
            if (d.id == id) {
                return Boolean(d.unlocked);
            }
        }
        return false;
    }

    private static drawIntro(): void {
        if (IoTd2Ui._mode == "daily") {
            IoTd2Ui.drawDaily();
            return;
        }
        let st: any = IoTd2Ui._status;
        let w: int = 780;
        let h: int = 540;
        let box: Sprite = IoTdUi.overlay(w, h, "td2Intro");
        IoTdUi.heading(box, "Hellgate Defense 2", w);
        let sub: TextField = IoTd2Ui.label(KEYS.Get("io_t3t_td2ui_sub"), 11, IoTd2Ui.DIM, true, w, TextFormatAlign.CENTER);
        sub.y = 44;
        box.addChild(sub);
        // the maps
        let maps: any[] = as3.as(st.maps, Array) || [];
        let cw: int = 176;
        let gap: int = 10;
        let x0: number = (w - (maps.length * cw + (maps.length - 1) * gap)) / 2;
        for (let i: int = 0; i < maps.length; i++) {
            let card: Sprite = IoTd2Ui.mapCard(maps[i], cw, 206, maps[i].id == IoTd2Ui._map);
            card.x = x0 + i * (cw + gap);
            card.y = 66;
            box.addChild(card);
        }
        // the difficulties
        let diffs: any[] = as3.as(st.difficulties, Array) || [];
        let dl: TextField = IoTd2Ui.label(KEYS.Get("io_t3t_td2ui_difficulty"), 10, IoTd2Ui.DIM, true, 200, TextFormatAlign.LEFT);
        dl.x = 26;
        dl.y = 284;
        box.addChild(dl);
        let bw: int = 176;
        for (let i: int = 0; i < diffs.length; i++) {
            let d: any = diffs[i];
            let b: Sprite = IoTdUi.button(IoTd2.diffName(d), bw, 30, IoTd2Ui.diffClick(String(d.id)), "td2Diff:" + d.id, false);
            b.x = x0 + i * (bw + gap);
            b.y = 302;
            let sk: Sprite = IoTd2Ui.skullRow(d.skulls | 0, d.skulls | 0, 11);
            sk.x = bw - sk.width - 8;
            sk.y = 9;
            b.addChild(sk);
            IoTdUi.enable(b, Boolean(d.unlocked));
            if (d.id == IoTd2Ui._diff) {
                IoTdUi.choose(b);
            }
            box.addChild(b);
            let note: TextField = IoTd2Ui.label(d.unlocked ? KEYS.Get("io_t3t_td2ui_diff_note", { "v1": d.lives | 0, "v2": d.gold | 0, "v3": d.hp }) : KEYS.Get("io_t3t_td2ui_diff_locked"), 9, d.unlocked ? IoTd2Ui.DIM : 0xFF8866, false, bw, TextFormatAlign.CENTER);
            note.x = b.x;
            note.y = 334;
            box.addChild(note);
        }
        // what the chosen map is
        let pick: any = null;
        for (let m of as3.values(maps)) {
            if (m.id == IoTd2Ui._map) {
                pick = m;
            }
        }
        let about: string = pick ? "<b>" + IoTd2Ui.mapWords(pick) + ".</b> " + IoTd2Ui.mapBlurb(pick) : "";
        IoTd2Ui.html(box, about, 26, 358, (w - 52) | 0, 40, 12);
        // the Hellforge
        let p: any = st.profile || {};
        let forge: string = "<font color=\"#FFB347\"><b>" + KEYS.Get("io_t3t_td2ui_embers", { "v1": GLOBAL.FormatNumber(p.embers | 0) }) + "</b></font>   ";
        let perks: any[] = [];
        for (let x of as3.values(st.perks || [])) {
            if ((x.level | 0) > 0) {
                perks.push(IoTd2Ui.perkName(x) + " " + x.level);
            }
        }
        forge += perks.length ? "<font color=\"#C8B89A\">" + KEYS.Get("io_t3t_td2ui_perks", { "v1": perks.join(", ") }) + "</font>" : "<font color=\"#A89478\">" + KEYS.Get("io_t3t_td2ui_embers_tip") + "</font>";
        IoTd2Ui.html(box, forge, 26, 404, (w - 200) | 0, 40, 11);
        let hf: Sprite = IoTdUi.button(KEYS.Get("io_hd2_forge"), 130, 34, (e: MouseEvent): void => {
            IoTd2Ui.Hellforge();
        }, "td2Forge", false);
        hf.x = w - 156;
        hf.y = 404;
        box.addChild(hf);
        // play
        let go: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_play_map", { "v1": pick ? IoTd2Ui.mapWords(pick) : "" }), 220, 40, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd2.open2(IoTd2Ui._map, IoTd2Ui._diff, false);
        }, "td2Play", true);
        go.x = w / 2 - 230;
        go.y = h - 62;
        IoTdUi.enable(go, Boolean(pick && pick.unlocked) && IoTd2Ui.diffOpen(IoTd2Ui._diff));
        box.addChild(go);
        let rules: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_how"), 120, 40, (e: MouseEvent): void => {
            IoTd2Ui.Help(true, true);
        }, "td2Rules", false);
        rules.x = w / 2 + 2;
        rules.y = h - 62;
        box.addChild(rules);
        let no: Sprite = IoTdUi.button(KEYS.Get("io_arc2_not_now"), 100, 40, IoTdUi.closeOverlay, "td2NotNow", false);
        no.x = w / 2 + 132;
        no.y = h - 62;
        box.addChild(no);
    }

    private static diffClick(id: string): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoTd2Ui._diff = id;
            IoTd2Ui.drawIntro();
        };
    }

    /** A map's card: its sketch, name, best and skulls; locked ones say what opens them. */
    private static mapCard(m: any, w: int, h: int, chosen: boolean): Sprite {
        let card: Sprite = new Sprite();
        card.name = "td2Map:" + m.id;
        card.buttonMode = Boolean(m.unlocked);
        card.mouseChildren = false;
        let bg: Shape = new Shape();
        let drawBg: Function = (): void => {
            bg.graphics.clear();
            // (the UI kit's obsidian panel, the chosen one ringed in gold; 11 October)
            if (IoKit.panel(bg.graphics, 0, 0, w, h)) {
                if (chosen) {
                    bg.graphics.lineStyle(3, IoTd2Ui.GOLD, 1);
                    bg.graphics.drawRoundRect(1, 1, w - 2, h - 2, 14, 14);
                }
                return;
            }
            bg.graphics.lineStyle(chosen ? 3 : 1, chosen ? IoTd2Ui.GOLD : 10119738, 1);
            bg.graphics.beginFill(0x1A0E0A, 0.85);
            bg.graphics.drawRoundRect(0, 0, w, h, 12, 12);
            bg.graphics.endFill();
        };
        drawBg();
        IoKit.whenLoaded(["panel", "panel_tile"], drawBg);
        card.addChild(bg);
        let sketch: Sprite = IoTd2Ui.sketch(m, w - 20, 108);
        sketch.x = 10;
        sketch.y = 10;
        card.addChild(sketch);
        // the arena as the game draws it (arcade/hellgate2/map_<id>.jpg, art/uikit/td2maps.py, 11 October): over
        // the sketch once it has loaded
        let shot: Sprite = new Sprite();
        shot.x = 10;
        shot.y = 10;
        card.addChild(shot);
        let round: Shape = new Shape();
        round.graphics.beginFill(0);
        round.graphics.drawRoundRect(10, 10, w - 20, 108, 10, 10);
        round.graphics.endFill();
        card.addChild(round);
        shot.mask = round;
        CasinoUI.picture(shot, "arcade/hellgate2/map_" + m.id + ".jpg", 0, 0, w - 20, 108, (b: any): void => {
            sketch.visible = false;
        });
        let name: TextField = IoTd2Ui.label(IoTd2Ui.mapWords(m), 13, m.unlocked ? IoTd2Ui.GOLD : IoTd2Ui.DIM, true, w, TextFormatAlign.CENTER);
        GLOBAL.ioFitText(name, 9);
        name.y = 122;
        card.addChild(name);
        let r: any = m.record || {};
        let line: TextField = IoTd2Ui.label("", 11, IoTd2Ui.TEXT, false, w, TextFormatAlign.CENTER);
        line.htmlText = "<p align=\"center\">" + (m.unlocked ? ((r.best | 0) > 0 ? KEYS.Get("io_t3t_td2ui_best_wave", { "v1": r.best | 0 }) : KEYS.Get("io_t3t_td2ui_not_played")) : "<font color=\"#FF8866\">" + KEYS.Get("io_t3t_td2ui_locked") + "</font><br><font size=\"10\" color=\"#A89478\">" + KEYS.Get("io_t3t_td2ui_unlock", { "v1": m.unlock ? m.unlock.wave : 15, "v2": IoTd2Ui.mapName(m.unlock ? String(m.unlock.map) : "") }) + "</font>") + "</p>";
        line.height = 60;
        line.y = 144;
        card.addChild(line);
        if (m.unlocked) {
            let sk: Sprite = IoTd2Ui.skullRow(r.skulls | 0, 4, 16);
            sk.x = (w - sk.width) / 2;
            sk.y = 168;
            card.addChild(sk);
        }
        if (!m.unlocked) {
            card.alpha = 0.6;
        }
        card.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (!m.unlocked) {
                SOUNDS.Play("error1", 0.5);
                return;
            }
            SOUNDS.Play("click1");
            IoTd2Ui._map = String(m.id);
            IoTd2Ui.drawIntro();
        });
        return card;
    }

    private static mapName(id: string): string {
        for (let m of as3.values(IoTd2Ui._status ? IoTd2Ui._status.maps || [] : [])) {
            if (m.id == id) {
                return IoTd2Ui.mapWords(m);
            }
        }
        return id;
    }

    /** A little drawing of an arena as the yard shows it: the diamond, its ways in (red), the Hall (gold), its rocks. */
    private static sketch(m: any, w: int, h: int): Sprite {
        let s: Sprite = new Sprite();
        let g: any = s.graphics;
        let half: number = Number(m.half || 320);
        // (the diamond and what stands round it: the ways in and the Hall reach 1.35 times its size)
        let k: number = Math.min(w / (5.6 * half), h / (2.9 * half));
        let cx: number = w / 2;
        let cy: number = h / 2;
        let iso: Function = (x: number, y: number): Point => new Point(cx + (x - y) * k, cy + (x + y) * 0.5 * k);
        g.beginFill(0x2A140C, 1);
        g.drawRoundRect(0, 0, w, h, 8, 8);
        g.endFill();
        let a: Point = iso(-half, -half);
        let b: Point = iso(half, -half);
        let c: Point = iso(half, half);
        let d: Point = iso(-half, half);
        g.lineStyle(3, 0x7A6A5A, 1);
        g.beginFill(0x4A2A1A, 1);
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.lineTo(c.x, c.y);
        g.lineTo(d.x, d.y);
        g.lineTo(a.x, a.y);
        g.endFill();
        let corner: any = { "L": [-1, 1], "R": [1, -1], "T": [-1, -1], "B": [1, 1] };
        for (let e of as3.values(m.entries || [])) {
            let cc: any[] = as3.as(corner[String(e)], Array);
            let p: Point = iso(Number(cc[0]) * half, Number(cc[1]) * half);
            let q: Point = iso(Number(cc[0]) * half * 1.35, Number(cc[1]) * half * 1.35);
            g.lineStyle(4, 0xFF3A2A, 1);
            g.moveTo(q.x, q.y);
            g.lineTo(p.x, p.y);
            g.lineStyle(0, 0, 0);
            g.beginFill(0xFF3A2A, 1);
            g.drawCircle(q.x, q.y, 5);
            g.endFill();
        }
        for (let r of as3.values(m.rockList || [])) {
            let p: Point = iso(Number(r[0]) + 10, Number(r[1]) + 10);
            g.lineStyle(0, 0, 0);
            g.beginFill(0x15100E, 1);
            g.drawCircle(p.x, p.y, Math.max(1.5, 14 * k));
            g.endFill();
        }
        let hall: Point = null;
        if (m.exit == "C") {
            hall = iso(0, 0);
        } else {
            let ec: any[] = as3.as(corner[String(m.exit)], Array);
            hall = iso(Number(ec[0]) * half * 1.3, Number(ec[1]) * half * 1.3);
        }
        g.lineStyle(2, 0x3A2A10, 1);
        g.beginFill(IoTd2Ui.GOLD, 1);
        g.drawRect(hall.x - 8, hall.y - 6, 16, 12);
        g.endFill();
        g.beginFill(0xC08A2A, 1);
        g.moveTo(hall.x - 10, hall.y - 6);
        g.lineTo(hall.x, hall.y - 14);
        g.lineTo(hall.x + 10, hall.y - 6);
        g.endFill();
        return s;
    }

    /** The Daily Challenge's window. */
    private static drawDaily(): void {
        let st: any = IoTd2Ui._status;
        let dy: any = st.daily || {};
        let w: int = 620;
        let h: int = 470;
        let box: Sprite = IoTdUi.overlay(w, h, "td2Daily");
        IoTdUi.heading(box, KEYS.Get("io_t3t_td2_daily"), w);
        let sub: TextField = IoTd2Ui.label("HELLGATE DEFENSE 2  ·  " + String(dy.day || ""), 11, IoTd2Ui.DIM, true, w, TextFormatAlign.CENTER);
        sub.y = 44;
        box.addChild(sub);
        let map: any = null;
        for (let m of as3.values(st.maps || [])) {
            if (m.id == dy.map) {
                map = m;
            }
        }
        if (map) {
            let sk: Sprite = IoTd2Ui.sketch(map, 220, 140);
            sk.x = 28;
            sk.y = 74;
            box.addChild(sk);
            // (the arena's picture over the sketch once loaded, as on the map cards; 11 October)
            let shot: Sprite = new Sprite();
            shot.x = 28;
            shot.y = 74;
            box.addChild(shot);
            let round: Shape = new Shape();
            round.graphics.beginFill(0);
            round.graphics.drawRoundRect(28, 74, 220, 140, 10, 10);
            round.graphics.endFill();
            box.addChild(round);
            shot.mask = round;
            CasinoUI.picture(shot, "arcade/hellgate2/map_" + map.id + ".jpg", 0, -6, 220, 152, (b: any): void => {
                sk.visible = false;
            });
        }
        let muts: string = "";
        for (let id of as3.values(dy.mutators || [])) {
            for (let mu of as3.values(st.mutators || [])) {
                if (mu.id == id) {
                    muts += "<font color=\"#FF9EDB\"><b>" + IoTd2.ioWords("io_t3t_td2_mut_" + mu.id + "_name", mu.name) + ":</b></font> " + IoTd2.ioWords("io_t3t_td2_mut_" + mu.id + "_text", mu.text) + "<br>";
                }
            }
        }
        let best: any = dy.best || {};
        IoTd2Ui.html(box, "<font size=\"16\" color=\"#FFD24A\"><b>" + IoTd2.mapNameOf(String(dy.map || ""), dy.mapName || "") + "</b></font><br>" + KEYS.Get("io_t3t_td2ui_daily_rules") + "<br><br>" + muts + "<br><font color=\"#FFD24A\"><b>" + KEYS.Get("io_t3t_td2ui_best_today", { "v1": (best.waves | 0) > 0 ? KEYS.Get("io_t3t_tdui_best_waves", { "v1": best.waves | 0 }) : KEYS.Get("io_t3t_td2ui_not_played_yet") }) + "</b></font>" + ((best.runs | 0) > 0 ? " " + KEYS.Get((best.runs | 0) == 1 ? "io_t3t_tdui_runs_one" : "io_t3t_tdui_runs_n", { "v1": best.runs | 0 }) : ""), 262, 70, w - 290, 250, 12);
        IoTd2Ui.html(box, "<font color=\"#A89478\">" + KEYS.Get("io_t3t_td2ui_daily_board") + "</font>", 28, 330, w - 56, 40, 11);
        let go: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_play_daily"), 230, 40, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd2.open2(String(dy.map), "normal", true);
        }, "td2PlayDaily", true);
        go.x = w / 2 - 240;
        go.y = h - 62;
        box.addChild(go);
        let camp: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_campaign"), 110, 40, (e: MouseEvent): void => {
            IoTd2Ui._mode = "solo";
            IoTd2Ui.drawIntro();
        }, "td2Campaign", false);
        camp.x = w / 2 + 2;
        camp.y = h - 62;
        box.addChild(camp);
        let no: Sprite = IoTdUi.button(KEYS.Get("io_arc2_not_now"), 100, 40, IoTdUi.closeOverlay, "td2NotNow", false);
        no.x = w / 2 + 122;
        no.y = h - 62;
        box.addChild(no);
    }

    // ---- the Hellforge
    public static Hellforge(): void {
        let st: any = IoTd2Ui._status;
        let w: int = 640;
        let h: int = 520;
        let box: Sprite = IoTdUi.overlay(w, h, "td2Hellforge");
        IoTdUi.heading(box, KEYS.Get("io_t3t_td2ui_forge_title"), w);
        let p: any = st.profile || {};
        let top: TextField = IoTd2Ui.label("", 13, IoTd2Ui.TEXT, true, w, TextFormatAlign.CENTER);
        top.htmlText = "<p align=\"center\"><font color=\"#FFB347\">" + KEYS.Get("io_t3t_td2ui_embers", { "v1": GLOBAL.FormatNumber(p.embers | 0) }) + "</font>   <font size=\"11\" color=\"#A89478\">" + KEYS.Get("io_t3t_td2ui_forge_tip") + "</font></p>";
        top.y = 46;
        box.addChild(top);
        let y: int = 76;
        for (let x of as3.values(st.perks || [])) {
            let row: TextField = IoTd2Ui.label("", 12, IoTd2Ui.TEXT, false, 380, TextFormatAlign.LEFT);
            let pips: string = "";
            for (let i: int = 0; i < (x.max | 0); i++) {
                pips += i < (x.level | 0) ? "<font color=\"#FFB347\">◆</font>" : "<font color=\"#5A4636\">◆</font>";
            }
            row.htmlText = "<b><font color=\"#FFD24A\">" + IoTd2Ui.perkName(x) + "</font></b>  " + pips + "<br><font size=\"11\">" + IoTd2Ui.perkText(x) + "</font>";
            row.height = 40;
            row.x = 26;
            row.y = y;
            box.addChild(row);
            let price: int = x.next | 0;
            let b: Sprite = IoTdUi.button(price > 0 ? KEYS.Get("io_t3t_td2ui_forge_n", { "v1": price }) : KEYS.Get("io_t3t_tdui_max"), 130, 30, IoTd2Ui.forgeClick(String(x.id)), "td2Perk:" + x.id, price > 0);
            b.x = w - 160;
            b.y = y + 4;
            IoTdUi.enable(b, price > 0 && (p.embers | 0) >= price && !IoTd2Ui._busy);
            box.addChild(b);
            y += 46;
        }
        let back: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_back"), 140, 38, (e: MouseEvent): void => {
            // (QoL #382: opened from a run's end: back to it)
            if (IoTd2Ui._ioForgeBack != null) {
                let then: Function = IoTd2Ui._ioForgeBack;
                IoTd2Ui._ioForgeBack = null;
                then();
                return;
            }
            IoTd2Ui.drawIntro();
        }, "td2ForgeBack", false);
        back.x = (w - 140) / 2;
        back.y = h - 56;
        box.addChild(back);
        if (GLOBAL.INFERNO_ONLY) {
            IoTd2Ui.ioRespecRow(box, w, h);
        }
    }

    private static forgeClick(id: string): Function {
        return (e: MouseEvent): void => {
            if (IoTd2Ui._busy) {
                return;
            }
            // (QoL #498: asks first: the perk, its next level, the price and the embers left)
            if (GLOBAL.INFERNO_ONLY && e != null) {
                let x: any = IoTd2Ui.ioPerk(id);
                let have: int = IoTd2Ui._status && IoTd2Ui._status.profile ? IoTd2Ui._status.profile.embers | 0 : 0;
                if (x) {
                    let m: any = GLOBAL.Message(KEYS.Get("io_arc2_forge_ask", { "v1": IoTd2Ui.perkName(x), "v2": ((x.level | 0) + 1) | 0, "v3": GLOBAL.FormatNumber(x.next | 0), "v4": GLOBAL.FormatNumber(Math.max(0, have - (x.next | 0))) }), KEYS.Get("io_arc2_forge_yes"), (): void => {
                        IoTd2Ui.forgeClick(id)(null);
                    }, null, KEYS.Get("io_arc2_not_now"), null);
                    if (m && m.bAction) {
                        m.bAction.name = "ioTd2ForgeYes";
                    }
                    if (m && m.bAction2) {
                        m.bAction2.name = "ioTd2ForgeNo";
                    }
                    return;
                }
            }
            IoTd2Ui._busy = true;
            IoTd.call("perk", [["id", id]], (r: any): void => {
                IoTd2Ui._busy = false;
                IoTd2Ui._status = r;
                IoTd2.status = r;
                SOUNDS.Play("upgrade1");
                IoTd2Ui.Hellforge();
            }, (message: string): void => {
                IoTd2Ui._busy = false;
                GLOBAL.Message(message);
            });
        };
    }

    /** Inferno-only (QoL #498): a perk as the status lists it ({id, name, level, next, ...}), or null. */
    private static ioPerk(id: string): any {
        for (let x of as3.values(IoTd2Ui._status && IoTd2Ui._status.perks ? IoTd2Ui._status.perks : [])) {
            if (String(x.id) == id) {
                return x;
            }
        }
        return null;
    }

    /**
     * Inferno-only (QoL #498): the Hellforge's free respec, once a week (td/respec; the server checks the week): every
     * perk taken back, the embers spent on them given back. The button (ioTd2Respec) bottom left, its line (ioTd2RespecLine)
     * over it.
     */
    private static ioRespecRow(box: Sprite, w: int, h: int): void {
        let st: any = IoTd2Ui._status || {};
        let rs: any = st.respec;
        if (!rs) {
            return;
        }
        let refund: int = rs.refund | 0;
        let line: TextField = IoTd2Ui.label("", 10, IoTd2Ui.DIM, true, 200, TextFormatAlign.LEFT);
        line.name = "ioTd2RespecLine";
        line.height = 16;
        line.x = 26;
        line.y = h - 74;
        if (rs.free) {
            line.text = refund > 0 ? KEYS.Get("io_arc2_respec_free", { "v1": GLOBAL.FormatNumber(refund) }) : KEYS.Get("io_arc2_respec_none");
        } else {
            let left: int = Math.max(0, (rs.next | 0) - GLOBAL.Timestamp()) | 0;
            let hours: int = Math.max(1, Math.ceil(left / 3600)) | 0;
            line.text = hours >= 48 ? KEYS.Get("io_arc2_respec_days", { "v1": Math.ceil(hours / 24) | 0 }) : KEYS.Get("io_arc2_respec_hours", { "v1": hours });
        }
        box.addChild(line);
        let b: Sprite = IoTdUi.button(KEYS.Get("io_arc2_respec"), 150, 34, (e: MouseEvent): void => {
            if (IoTd2Ui._busy) {
                return;
            }
            GLOBAL.ioDanger(KEYS.Get("io_arc2_respec_ask", { "v1": GLOBAL.FormatNumber(refund), "v2": rs.days | 0 }), KEYS.Get("io_arc2_respec"), (): void => {
                if (IoTd2Ui._busy) {
                    return;
                }
                IoTd2Ui._busy = true;
                IoTd.call("respec", [], (r: any): void => {
                    IoTd2Ui._busy = false;
                    IoTd2Ui._status = r;
                    IoTd2.status = r;
                    SOUNDS.Play("chaching");
                    IoTd2Ui.Hellforge();
                    GLOBAL.Message(KEYS.Get("io_arc2_respec_done", { "v1": GLOBAL.FormatNumber(r.refunded | 0) }));
                }, (message: string): void => {
                    IoTd2Ui._busy = false;
                    GLOBAL.Message(message);
                });
            }, null, KEYS.Get("io_arc2_not_now"));
        }, "ioTd2Respec");
        b.x = 26;
        b.y = h - 56;
        IoTdUi.enable(b, Boolean(rs.free) && refund > 0 && !IoTd2Ui._busy);
        box.addChild(b);
    }

    // ---- in the arena
    public static Show(): void {
        IoTd2Ui.Hide();
        let root: Sprite = IoTd2Ui.uiRoot();
        if (!root) {
            return;
        }
        IoTd2Ui._hud = new Sprite();
        IoTd2Ui._hud.name = "td2Hud";
        root.addChild(IoTd2Ui._hud);
        IoTd2Ui._spells = {};
        let x: int = 0;
        for (let s of as3.values(IoTd2.SPELLS)) {
            let b: Sprite = IoTd2Ui.spellButton(as3.as(s, Array), x);
            IoTd2Ui._hud.addChild(b);
            IoTd2Ui._spells[s[0]] = b;
            x += 62;
        }
        IoTd2Ui._boss = new Sprite();
        IoTd2Ui._boss.name = "td2Boss";
        IoTd2Ui._boss.visible = false;
        IoTd2Ui._boss.mouseEnabled = false;
        IoTd2Ui._boss.mouseChildren = false;
        root.addChild(IoTd2Ui._boss);
        if (!IoTd2Ui._keys && GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoTd2Ui.onKey);
            IoTd2Ui._keys = true;
        }
        IoTd2Ui.Update();
        IoTd2Ui.Help(false);
    }

    public static Hide(): void {
        IoTd2Ui.stopAim();
        if (IoTd2Ui._hud && IoTd2Ui._hud.parent) {
            IoTd2Ui._hud.parent.removeChild(IoTd2Ui._hud);
        }
        if (IoTd2Ui._boss && IoTd2Ui._boss.parent) {
            IoTd2Ui._boss.parent.removeChild(IoTd2Ui._boss);
        }
        IoTd2Ui._hud = null;
        IoTd2Ui._boss = null;
        IoTd2Ui._bossOf = null;
        IoTd2Ui._spells = {};
        if (IoTd2Ui._keys && GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoTd2Ui.onKey);
        }
        IoTd2Ui._keys = false;
    }

    private static uiRoot(): Sprite {
        let layer: Sprite = GLOBAL._layerUI;
        if (!layer) {
            return null;
        }
        let r: Sprite = as3.as(layer.getChildByName("tdUi"), Sprite);
        return r || layer;
    }

    public static Help(always: boolean, fromIntro: boolean = false): void {
        if (!always && IoTd2Ui._helped) {
            return;
        }
        IoTd2Ui._helped = true;
        let w: int = 620;
        let box: Sprite = IoTdUi.overlay(w, 470, "td2Help");
        IoTdUi.heading(box, "Hellgate Defense 2", w);
        let rules: TextField = IoTdUi.body(box, IoTd2Ui.RULES, 52, w, 350);
        // (QoL #235: a longer language's rules drawn a little smaller to fit)
        GLOBAL.ioFitHeight(rules, 10);
        let ok: Sprite = IoTdUi.button(KEYS.Get(fromIntro ? "io_t3t_td2ui_back" : "io_t3t_tdui_lets_go"), 160, 38, (e: MouseEvent): void => {
            if (fromIntro) {
                IoTd2Ui.drawIntro();
            } else {
                IoTdUi.closeOverlay();
            }
        }, "td2HelpOk", !fromIntro);
        ok.x = (w - 160) / 2;
        ok.y = 470 - 56;
        box.addChild(ok);
    }

    private static spellButton(s: any[], x: int): Sprite {
        let id: string = String(s[0]);
        let b: Sprite = new Sprite();
        b.name = "td2Spell:" + id;
        b.buttonMode = true;
        b.mouseChildren = false;
        b.x = x;
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(2, 10119738, 1);
        IoTdUi.texture(bg.graphics, 2364943, 0.95);
        bg.graphics.drawRoundRect(0, 0, 56, 66, 12, 12);
        bg.graphics.endFill();
        b.addChild(bg);
        let icon: Shape = IoTd2Ui.icon(id);
        icon.x = 28;
        icon.y = 24;
        b.addChild(icon);
        let veil: Shape = new Shape();
        veil.name = "veil";
        b.addChild(veil);
        let name: TextField = IoTd2Ui.label(IoTd2.spellName(s), 8, IoTd2Ui.TEXT, true, 56, TextFormatAlign.CENTER);
        name.y = 46;
        GLOBAL.ioFitText(name, 6);
        b.addChild(name);
        let key: TextField = IoTd2Ui.label(String(IoTd2.SPELLS.indexOf(s) + 1), 9, IoTd2Ui.GOLD, true, 14, TextFormatAlign.CENTER);
        key.x = 3;
        key.y = 2;
        b.addChild(key);
        let left: TextField = IoTd2Ui.label("", 14, 0xFFFFFF, true, 56, TextFormatAlign.CENTER);
        left.name = "left";
        left.y = 14;
        left.filters = [new GlowFilter(0, 1, 3, 3, 6)];
        b.addChild(left);
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoTd2.Cast(id);
        });
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            IoTdUi.Toast(KEYS.Get("io_t3t_td2ui_spell_tip", { "v1": IoTd2.spellName(s), "v2": IoTd2.SPELLS.indexOf(s) + 1, "v3": IoTd2.spellText(s), "v4": Math.round(IoTd2.spellSteps(s) / 80) }), 4);
        });
        return b;
    }

    /** A spell's little picture. */
    private static icon(id: string): Shape {
        let s: Shape = new Shape();
        let g: any = s.graphics;
        if (id == "meteor") {
            g.lineStyle(0, 0, 0);
            g.beginFill(0xFF8A2A, 0.6);
            g.moveTo(10, -14);
            g.lineTo(-2, -6);
            g.lineTo(4, 2);
            g.endFill();
            g.beginFill(0x3A1A0A, 1);
            g.drawCircle(-3, 4, 9);
            g.endFill();
            g.beginFill(0xFFD24A, 1);
            g.drawCircle(-5, 2, 3);
            g.endFill();
            s.filters = [new GlowFilter(0xFF5A1A, 1, 10, 10, 2)];
        } else if (id == "nova") {
            g.lineStyle(3, 0xBFF4FF, 1);
            for (let i: int = 0; i < 6; i++) {
                let a: number = i * Math.PI / 3;
                g.moveTo(0, 0);
                g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
                g.moveTo(Math.cos(a) * 8 + Math.cos(a + 0.8) * 4, Math.sin(a) * 8 + Math.sin(a + 0.8) * 4);
                g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
                g.lineTo(Math.cos(a) * 8 + Math.cos(a - 0.8) * 4, Math.sin(a) * 8 + Math.sin(a - 0.8) * 4);
            }
            s.filters = [new GlowFilter(0x4AB0FF, 1, 10, 10, 2)];
        } else if (id == "pact") {
            g.lineStyle(1, 0x5A0A0A, 1);
            g.beginFill(0xD4141E, 1);
            g.moveTo(0, -14);
            g.curveTo(10, 0, 9, 5);
            g.curveTo(6, 13, 0, 13);
            g.curveTo(-6, 13, -9, 5);
            g.curveTo(-10, 0, 0, -14);
            g.endFill();
            g.beginFill(0xFF8A8A, 0.8);
            g.drawCircle(-3, 4, 2.5);
            g.endFill();
            s.filters = [new GlowFilter(0xFF2A2A, 1, 10, 10, 2)];
        } else {
            // Moloch's Wrath: a horned skull
            g.lineStyle(1, 0x3A0A0A, 1);
            g.beginFill(0xFFE0C0, 1);
            g.drawEllipse(-10, -10, 20, 18);
            g.endFill();
            g.beginFill(0xFFE0C0, 1);
            g.drawRect(-6, 5, 12, 6);
            g.endFill();
            g.beginFill(0x2A0A0A, 1);
            g.drawCircle(-4, -1, 3);
            g.drawCircle(4, -1, 3);
            g.endFill();
            g.lineStyle(3, 0xA01010, 1);
            g.moveTo(-8, -8);
            g.curveTo(-16, -12, -13, -18);
            g.moveTo(8, -8);
            g.curveTo(16, -12, 13, -18);
            s.filters = [new GlowFilter(0xFF3322, 1, 10, 10, 2)];
        }
        return s;
    }

    /** The spell bar sits over the tower shop's right end (IoTdUi.layout). */
    public static layout(shop: Sprite): void {
        if (!IoTd2Ui._hud) {
            return;
        }
        let s: any = GLOBAL._SCREEN;
        if (shop) {
            IoTd2Ui._hud.scaleX = IoTd2Ui._hud.scaleY = shop.scaleX;
            IoTd2Ui._hud.x = (shop.x + shop.width - IoTd2Ui._hud.width) | 0;
            IoTd2Ui._hud.y = (shop.y - IoTd2Ui._hud.height - 30) | 0;
        } else {
            IoTd2Ui._hud.x = (s.x + s.width - IoTd2Ui._hud.width - 10) | 0;
            IoTd2Ui._hud.y = (s.y + s.height - 220) | 0;
        }
        if (IoTd2Ui._boss) {
            IoTd2Ui._boss.x = (s.x + s.width / 2 - 200) | 0;
            IoTd2Ui._boss.y = (s.y + 96) | 0;
        }
    }

    public static Update(): void {
        IoTd2Ui.frame(0);
    }

    /** The spells' charge and the boss bar, every few frames. */
    public static frame(n: int): void {
        if (n % 4 != 0 || !IoTd2Ui._hud) {
            return;
        }
        for (let s of as3.values(IoTd2.SPELLS)) {
            let id: string = String(s[0]);
            let b: Sprite = as3.as(IoTd2Ui._spells[id], Sprite);
            if (!b) {
                continue;
            }
            let full: int = IoTd2.spellSteps(as3.as(s, Array));
            let left: int = IoTd2.charge[id] | 0;
            let locked: boolean = (s[3] | 0) > 1 && IoTd.cleared + (IoTd.waveOn ? 1 : 0) < (s[3] | 0);
            let veil: Shape = as3.as(b.getChildByName("veil"), Shape);
            let t: TextField = as3.as(b.getChildByName("left"), TextField);
            veil.graphics.clear();
            let share: number = locked ? 1 : (full > 0 ? left / full : 0);
            if (share > 0) {
                veil.graphics.beginFill(0x000000, 0.6);
                veil.graphics.drawRoundRect(2, 2 + 62 * (1 - share), 52, 62 * share, 10, 10);
                veil.graphics.endFill();
            }
            let txt: string = locked ? KEYS.Get("io_t3t_td2ui_wave_short", { "v1": s[3] | 0 }) : (left > 0 ? String(Math.ceil(left / 80)) : "");
            if (t.text != txt) {
                t.text = txt;
            }
            let ready: boolean = !locked && left <= 0 && IoTd.waveOn;
            b.filters = ready ? [new GlowFilter(0xFFD24A, 0.6 + 0.4 * Math.sin(n * 0.2), 8, 8, 2)] : [];
            if (id == "pact" && IoTd2.pactLeft > 0) {
                b.filters = [new GlowFilter(0xFF2A2A, 1, 10, 10, 3)];
            }
        }
        IoTd2Ui.drawBoss();
    }

    // ---- the boss bar
    public static bossCame(c: MonsterBase, name: string): void {
        if (!IoTd2Ui._bossOf || c.maxHealth >= IoTd2Ui._bossOf.maxHealth || IoTd2Ui._bossOf.health <= 0) {
            IoTd2Ui._bossOf = c;
            IoTd2Ui._bossName = name;
        }
    }

    public static bossGone(c: MonsterBase): void {
        if (IoTd2Ui._bossOf == c) {
            IoTd2Ui._bossOf = null;
        }
    }

    private static drawBoss(): void {
        let b: Sprite = IoTd2Ui._boss;
        if (!b) {
            return;
        }
        let c: MonsterBase = IoTd2Ui._bossOf;
        let info: any = c ? IoTd.infoOf(c) : null;
        if (!c || !info || info.leaked || c.health <= 0 || c.dead) {
            b.visible = false;
            return;
        }
        b.visible = true;
        while (b.numChildren) {
            b.removeChildAt(0);
        }
        let g: any = b.graphics;
        g.clear();
        let share: number = Math.max(0, Math.min(1, c.health / Math.max(1, c.maxHealth)));
        g.lineStyle(2, 0x2A0A04, 1);
        g.beginFill(0x1A0806, 0.85);
        g.drawRoundRect(0, 0, 400, 30, 10, 10);
        g.endFill();
        g.lineStyle(0, 0, 0);
        g.beginFill(info.warden ? 0xD41A10 : 0xE06A1A, 1);
        g.drawRoundRect(4, 16, 392 * share, 10, 6, 6);
        g.endFill();
        if (info.warden) {
            g.lineStyle(1, 0xFFFFFF, 0.5);
            g.moveTo(4 + 392 * 0.66, 15);
            g.lineTo(4 + 392 * 0.66, 27);
            g.moveTo(4 + 392 * 0.33, 15);
            g.lineTo(4 + 392 * 0.33, 27);
        }
        let t: TextField = IoTd2Ui.label(IoTd2Ui._bossName.toUpperCase() + "   " + GLOBAL.FormatNumber(Math.ceil(c.health)) + " / " + GLOBAL.FormatNumber(Math.ceil(c.maxHealth)) + (info.stoneLeft > 0 ? "   " + KEYS.Get("io_t3t_td2ui_stone") : "") + (info.invulnLeft > 0 ? "   " + KEYS.Get("io_t3t_td2ui_untouchable") : ""), 10, 0xFFE0C0, true, 400, TextFormatAlign.CENTER);
        t.y = 1;
        b.addChild(t);
    }

    // ---- aiming a meteor
    public static aim(then: Function): void {
        IoTd2Ui.stopAim();
        let layer: Sprite = GLOBAL._layerUI;
        let s: any = GLOBAL._SCREEN;
        if (!layer || !s) {
            return;
        }
        IoTd2Ui._aimThen = then;
        IoTd2Ui._aim = new Sprite();
        IoTd2Ui._aim.name = "td2Aim";
        IoTd2Ui._aim.graphics.beginFill(0x000000, 0.01);
        IoTd2Ui._aim.graphics.drawRect(Number(s.x), Number(s.y), Number(s.width), Number(s.height));
        IoTd2Ui._aim.graphics.endFill();
        let ring: Shape = new Shape();
        ring.name = "ring";
        IoTd2Ui._aim.addChild(ring);
        layer.addChildAt(IoTd2Ui._aim, 0);
        IoTd2Ui._aim.addEventListener(MouseEvent.MOUSE_MOVE, IoTd2Ui.aimMove);
        IoTd2Ui._aim.addEventListener(MouseEvent.CLICK, IoTd2Ui.aimClick);
        IoTdUi.Toast(KEYS.Get("io_t3t_td2ui_aim"), 4);
        IoTd2Ui.aimMove(null);
    }

    private static stopAim(): void {
        if (IoTd2Ui._aim) {
            IoTd2Ui._aim.removeEventListener(MouseEvent.MOUSE_MOVE, IoTd2Ui.aimMove);
            IoTd2Ui._aim.removeEventListener(MouseEvent.CLICK, IoTd2Ui.aimClick);
            if (IoTd2Ui._aim.parent) {
                IoTd2Ui._aim.parent.removeChild(IoTd2Ui._aim);
            }
        }
        IoTd2Ui._aim = null;
        IoTd2Ui._aimThen = null;
    }

    /** A point on the screen as a point in the yard (isometric, MAP's). */
    private static toYard(x: number, y: number): Point {
        let at: Sprite = MAP._BUILDINGTOPS;
        return at ? at.globalToLocal(new Point(x, y)) : null;
    }

    private static aimMove(e: MouseEvent): void {
        if (!IoTd2Ui._aim || !MAP._BUILDINGTOPS) {
            return;
        }
        let ring: Shape = as3.as(IoTd2Ui._aim.getChildByName("ring"), Shape);
        let mx: number = IoTd2Ui._aim.mouseX;
        let my: number = IoTd2Ui._aim.mouseY;
        // the meteor's 85 grid units, as they look on the screen now (the yard may be zoomed)
        let a: Point = MAP._BUILDINGTOPS.localToGlobal(new Point(0, 0));
        let b: Point = MAP._BUILDINGTOPS.localToGlobal(new Point(85 * 1.41, 0));
        let k: number = Point.distance(a, b) / (85 * 1.41);
        let rx: number = 85 * 1.41 * k;
        ring.graphics.clear();
        ring.graphics.lineStyle(3, 0xFF5A1A, 0.95);
        ring.graphics.beginFill(0xFF5A1A, 0.15);
        ring.graphics.drawEllipse(mx - rx, my - rx / 2, rx * 2, rx);
        ring.graphics.endFill();
        ring.graphics.lineStyle(1, 0xFFD24A, 0.9);
        ring.graphics.moveTo(mx - 8, my);
        ring.graphics.lineTo(mx + 8, my);
        ring.graphics.moveTo(mx, my - 6);
        ring.graphics.lineTo(mx, my + 6);
    }

    private static aimClick(e: MouseEvent): void {
        if (!IoTd2Ui._aim) {
            return;
        }
        let p: Point = IoTd2Ui._aim.localToGlobal(new Point(IoTd2Ui._aim.mouseX, IoTd2Ui._aim.mouseY));
        let then: Function = IoTd2Ui._aimThen;
        IoTd2Ui.stopAim();
        let yard: Point = IoTd2Ui.toYard(p.x, p.y);
        if (then != null && yard) {
            then(yard);
        }
    }

    private static onKey(e: KeyboardEvent): void {
        if (!IoTd2.on) {
            return;
        }
        let f: any = GLOBAL._ROOT && GLOBAL._ROOT.stage ? GLOBAL._ROOT.stage.focus : null;
        if (f instanceof TextField && as3.as(f, TextField).type == TextFieldType.INPUT) {
            return;
        }
        if (e.keyCode == 27) {
            if (IoTd2Ui._aim) {
                IoTd2Ui.stopAim();
                IoTdUi.Toast("");
            }
            return;
        }
        let i: int = (e.keyCode - 49) | 0;
        if (i >= 0 && i < IoTd2.SPELLS.length) {
            IoTd2.Cast(String(IoTd2.SPELLS[i][0]));
        }
    }

    // ---- the win, and the end
    public static Victory(): void {
        IoTdUi.ClosePanel();
        let w: int = 520;
        let h: int = 330;
        let box: Sprite = IoTdUi.overlay(w, h, "td2Victory");
        IoTdUi.heading(box, KEYS.Get("io_t3t_td2ui_sealed"), w);
        let d: any = IoTd2.diff || {};
        let n: int = 0;
        let i: int = 0;
        for (let x of as3.values(["easy", "normal", "hard", "inferno"])) {
            i++;
            if (x == d.id) {
                n = i;
            }
        }
        let daily: boolean = Boolean(IoTd2.cfg.daily);
        let ioMap: string = IoTd2.mapNameOf(String(IoTd2.cfg.map || ""), IoTd2.cfg.mapName || "");
        IoTdUi.body(box, "<p align=\"center\"><font size=\"16\">" + (daily ? KEYS.Get("io_t3t_td2ui_won_daily", { "v1": ioMap }) : KEYS.Get("io_t3t_td2ui_won", { "v1": ioMap, "v2": IoTd2.diffName(d) })) + "</font><br><br>" + (daily ? "" : "<br><br><br><br>") + KEYS.Get("io_t3t_td2ui_play_on_tip") + "</p>", 60, w, 200);
        if (!daily) {
            let sk: Sprite = IoTd2Ui.skullRow(n, 4, 30);
            sk.x = (w - sk.width) / 2;
            sk.y = 100;
            box.addChild(sk);
        }
        let on: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_play_on"), 150, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd2.playOn();
        }, "td2PlayOn", true);
        on.x = w / 2 - 160;
        on.y = h - 56;
        box.addChild(on);
        let leave: Sprite = IoTdUi.button(KEYS.Get("io_t3t_td2ui_leave_win"), 170, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd2.playOn();
            IoTd.endNow();
        }, "td2LeaveWin", false);
        leave.x = w / 2 + 10;
        leave.y = h - 56;
        box.addChild(leave);
        SOUNDS.Play("chaching");
    }

    /** The run is over: what it earned. `left`: the player left (or took the win) rather than the Hall falling. */
    public static GameOver(r: any, left: boolean = false): void {
        IoTdUi.ClosePanel();
        let w: int = 500;
        // (QoL #382: taller, for the run's summary and the Hellforge's button)
        let h: int = GLOBAL.INFERNO_ONLY ? 400 : 360;
        let box: Sprite = IoTdUi.overlay(w, h, "td2Over");
        let won: boolean = Boolean(r && r.victory);
        IoTdUi.heading(box, KEYS.Get(won ? "io_t3t_td2ui_victory" : (left ? "io_t3t_td2ui_run_over" : "io_t3t_tdui_fallen")), w);
        let html: string = "";
        if (r && r.error) {
            html = "<p align=\"center\"><font color=\"#FF8866\">" + r.error + "</font></p>";
        } else {
            let waves: int = r && r.recorded ? r.wave | 0 : IoTd.cleared;
            html = "<p align=\"center\"><font size=\"18\">" + KEYS.Get(waves == 1 ? "io_t3t_td2ui_held_one" : "io_t3t_td2ui_held_n", { "v1": waves }) + "</font><br><br>" + KEYS.Get("io_t3t_tdui_killed", { "v1": GLOBAL.FormatNumber(r && r.recorded ? r.kills | 0 : IoTd.kills) }) + "<br>";
            if (r && r.recorded) {
                html += (r.daily ? KEYS.Get("io_t3t_td2ui_daily_points", { "v1": r.points | 0 }) + "<br>" : KEYS.Get("io_t3t_td2ui_points", { "v1": GLOBAL.FormatNumber(r.points | 0) }) + "<br>") + "<font color=\"#FFB347\"><b>" + KEYS.Get("io_t3t_td2ui_embers_won", { "v1": r.embers | 0 }) + "</b></font> " + KEYS.Get("io_t3t_td2ui_you_have", { "v1": GLOBAL.FormatNumber(r.profile ? r.profile.embers | 0 : 0) }) + "<br>";
                if (r.newSkulls) {
                    html += "<font color=\"#7CFF6A\"><b>" + KEYS.Get((r.skulls | 0) == 1 ? "io_t3t_td2ui_skull_one" : "io_t3t_td2ui_skull_n", { "v1": r.skulls | 0 }) + "</b></font><br>";
                } else if (r.newBest) {
                    html += "<font color=\"#7CFF6A\"><b>" + KEYS.Get("io_t3t_td2ui_new_best_map") + "</b></font><br>";
                }
            }
            html += "<br><font color=\"#A89478\">" + KEYS.Get("io_t3t_td2ui_boards_note") + "</font></p>";
        }
        IoTdUi.body(box, html, 56, w, 230);
        // (QoL #459: not recorded: Try again under the error)
        if (GLOBAL.INFERNO_ONLY && r && r.error && r.ioRetry != null) {
            IoTdUi.ioRetryButton(box, (w - 160) / 2, 110, r, (r2: any): void => {
                IoTd2Ui.GameOver(r2, left);
            });
        }
        let again: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_play_again"), 150, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd2.again();
        }, "tdAgain", true);
        again.x = w / 2 - 160;
        again.y = h - 56;
        box.addChild(again);
        let home: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_home"), 150, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.goHome();
        }, "tdHome", false);
        home.x = w / 2 + 10;
        home.y = h - 56;
        box.addChild(home);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #382: the run in two lines over the buttons (its waves, the towers standing, the tower with the
            // most kills), and the Hellforge between Play again and Back home, to spend the embers just earned)
            let sum: TextField = IoTd2Ui.label("", 12, IoTd2Ui.TEXT, true, (w - 48) | 0, TextFormatAlign.CENTER);
            sum.name = "ioHd2Summary";
            sum.multiline = true;
            sum.wordWrap = true;
            sum.height = 40;
            sum.x = 24;
            sum.y = h - 104;
            sum.htmlText = IoTd2Ui.ioRunSummary(r);
            box.addChild(sum);
            let forge: Sprite = IoTdUi.button(KEYS.Get("io_hd2_forge"), 150, 38, (e: MouseEvent): void => {
                IoTd2Ui.ioForgeFromEnd(r, left);
            }, "ioHd2Forge");
            again.x = w / 2 - 235;
            forge.x = w / 2 - 75;
            forge.y = h - 56;
            home.x = w / 2 + 85;
            box.addChild(forge);
        }
    }

    /** Inferno-only (QoL #382): the end's summary: the waves, the towers standing, the MVP tower (IoTd2.ioMvp). */
    public static ioRunSummary(r: any): string {
        let waves: int = (r && r.recorded ? r.wave | 0 : IoTd.cleared) | 0;
        let towers: int = 0;
        for (let k of (IoTd.towers?.keys() ?? [])) {
            if (as3.as(k, BFOUNDATION)) {
                towers++;
            }
        }
        let mvp: any = IoTd2.ioMvp || {};
        let line: string = KEYS.Get("io_hd2_summary", { "v1": waves, "v2": towers });
        let best: string = (mvp.kills | 0) > 0 ? KEYS.Get("io_hd2_mvp", { "v1": IoTd2.nameOf(mvp.type | 0), "v2": GLOBAL.FormatNumber(mvp.kills | 0) }) : KEYS.Get("io_hd2_mvp_none");
        return "<p align=\"center\">" + line + "<br><font color=\"#FFD24A\">" + best + "</font></p>";
    }

    /** Inferno-only (QoL #382): the Hellforge from a run's end (its Back comes back to the end). */
    public static ioForgeFromEnd(r: any, left: boolean): void {
        let open: Function = (): void => {
            // (the embers the run just earned: the end's answer is the newest)
            if (r && r.profile && IoTd2Ui._status) {
                IoTd2Ui._status.profile = r.profile;
            }
            IoTd2Ui._ioForgeBack = (): void => {
                // (what was spent there shown on the end)
                if (r && r.profile && IoTd2Ui._status && IoTd2Ui._status.profile) {
                    r.profile = IoTd2Ui._status.profile;
                }
                IoTd2Ui.GameOver(r, left);
            };
            IoTd2Ui.Hellforge();
        };
        if (IoTd2Ui._status && IoTd2Ui._status.perks) {
            open();
            return;
        }
        // (a run come back to after a reload: the perks not known yet)
        if (IoTd2Ui._busy) {
            return;
        }
        IoTd2Ui._busy = true;
        IoTd.call("status2", [], (st: any): void => {
            IoTd2Ui._busy = false;
            IoTd2.status = st;
            IoTd2Ui._status = st;
            open();
        }, (message: string): void => {
            IoTd2Ui._busy = false;
            GLOBAL.Message(message);
        });
    }
}
