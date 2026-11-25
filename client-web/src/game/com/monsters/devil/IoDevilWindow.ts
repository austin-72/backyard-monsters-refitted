import * as as3 from "as3";
import { int, uint } from "as3";
import { GradientType, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { CasinoUI, GLOBAL, IoDevil, IoWin, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only (13 November, the user's picks from the design canvas): the Devil's Contract's offer window. "C2"
 * (an open book: the ledger's three bargains on the left page, the chosen one's terms on the right, signed with a
 * wax seal) with "ledger animation 3" until it is signed (the Devil deals three cards face down, turns them over and
 * sweeps them into the book's list, then the right page opens from the spine) and "ledger animation 2" from then on
 * (a page turns over to each contract picked; signing shakes the page, stamps the seal, writes the signature and
 * burns the other two away; refusing burns everything).
 *
 * Drawn here, nothing from the game's art; Pirata One and Alegreya (SIL Open Font License, public/fonts) are loaded
 * before it is drawn. The offer, signing and refusing are the server's (IoDevil.sign / refuse): the animation plays
 * once the server has the answer, and its message is shown if it hasn't.
 */
export class IoDevilWindow {
    public static readonly W: int = 724;
    public static readonly H: int = 520;
    private static readonly PAGE_W: int = 341;
    private static readonly SPINE_X: int = 355;
    private static readonly RIGHT_X: int = 369;
    private static readonly ROW_Y: int = 106;
    private static readonly ROW_H: int = 68;

    private static _win: any = null;
    private static _ui: any = null;
    private static _anims: any[] = [];
    private static _picked: string = null;
    private static _phase: string = null;
    private static _ids: string[] = [];

    public static get isOpen(): boolean {
        return Boolean(IoDevilWindow._win) && !IoDevilWindow._win.closed;
    }

    /** Opens the waiting offer (IoDevil.offerTick, or the player). */
    public static Show(): void {
        let ids: string[] = IoDevil.offer();
        if (!ids.length || IoDevilWindow.isOpen) {
            return;
        }
        IoDevilWindow._ids = ids.slice(0, 3);
        IoDevilWindow._picked = IoDevilWindow._ids[0];
        IoDevilWindow._phase = "intro";
        // the window's fonts first (a second at most), so its first frame isn't drawn in another
        let built: boolean = false;
        let build: Function = (): void => {
            if (!built) {
                built = true;
                IoDevilWindow.build();
            }
        };
        try {
            let fonts: any = (document as any).fonts;
            if (fonts && fonts.load) {
                Promise.all([fonts.load("32px 'Pirata One'"), fonts.load("16px 'Alegreya'"), fonts.load("italic 16px 'Alegreya'"), fonts.load("bold 16px 'Alegreya'")]).then((): void => build(), (): void => build());
                setTimeout((): void => build(), 1000);
                return;
            }
        } catch (e) {
        }
        build();
    }

    /** The contracts in force, in a message (the pill's click). */
    public static ShowLedger(): void {
        let now: int = GLOBAL.Timestamp() | 0;
        let lines: string[] = [];
        for (let e of IoDevil.entries()) {
            if (now >= Number(e.boonUntil) && now >= Number(e.priceUntil)) {
                continue;
            }
            let d: any = IoDevil.describe(e.id);
            let left: Function = (until: number): string => (now < until ? KEYS.Get("io_dv_left", { "v1": GLOBAL.ioDuration(until - now) }) : KEYS.Get("io_dv_ended"));
            lines.push(KEYS.Get("io_dv_ledger_line", { "v1": d.name, "v2": d.boon, "v3": left(Number(e.boonUntil)), "v4": d.price, "v5": left(Number(e.priceUntil)) }));
        }
        if (!lines.length) {
            return;
        }
        GLOBAL.Message("<b>" + KEYS.Get("io_dv_ledger_title") + "</b><br><br>" + lines.join("<br><br>"));
    }

    // ---- drawing helpers
    private static text(s: string, size: number, color: uint, font: string, w: number, align: string = "left", bold: boolean = false, italic: boolean = false, lines: int = 1): TextField {
        let f: TextField = new TextField();
        f.selectable = false;
        f.mouseEnabled = false;
        f.width = w;
        let fmt: TextFormat = new TextFormat(font, size, color, bold);
        fmt.italic = italic;
        fmt.align = align;
        f.defaultTextFormat = fmt;
        if (lines > 1) {
            f.multiline = true;
            f.wordWrap = true;
        }
        f.height = Math.ceil(size * 1.3 * lines + 8);
        f.text = s;
        return f;
    }

    private static box(g: any, x: number, y: number, w: number, h: number, line: int, lineAlpha: number, fill: int, fillAlpha: number, r: number): void {
        if (line >= 0) {
            g.lineStyle(1, line >>> 0, lineAlpha);
        } else {
            g.lineStyle();
        }
        if (fill >= 0) {
            g.beginFill(fill >>> 0, fillAlpha);
        }
        g.drawRoundRect(x, y, w, h, r, r);
        if (fill >= 0) {
            g.endFill();
        }
    }

    /** A parchment page, w x h at x, y, darker towards the spine (`spineRight`: the spine is on its right). */
    private static page(parent: Sprite, x: number, y: number, w: number, h: number, spineRight: boolean): Sprite {
        let p: Sprite = as3.as(parent.addChild(new Sprite()), Sprite);
        p.x = x;
        p.y = y;
        let g: any = p.graphics;
        g.beginFill(0xEAD9B5, 1);
        g.drawRoundRect(0, 0, w, h, 8, 8);
        g.endFill();
        let m: Matrix = new Matrix();
        m.createGradientBox(40, h, 0, spineRight ? w - 40 : 0, 0);
        g.beginGradientFill(GradientType.LINEAR, [0x5A280A, 0x5A280A], spineRight ? [0, 0.45] : [0.45, 0], [0, 255], m);
        g.drawRect(spineRight ? w - 40 : 0, 0, 40, h);
        g.endFill();
        let m2: Matrix = new Matrix();
        m2.createGradientBox(w, 30, Math.PI / 2, 0, h - 30);
        g.beginGradientFill(GradientType.LINEAR, [0x784614, 0x784614], [0, 0.22], [0, 255], m2);
        g.drawRect(0, h - 30, w, 30);
        g.endFill();
        return p;
    }

    // ---- the window
    private static build(): void {
        let W: int = IoDevilWindow.W;
        let H: int = IoDevilWindow.H;
        let left: int = (-W / 2) | 0;
        let top: int = (-H / 2) | 0;
        let mc: MovieClip = new MovieClip();
        mc.name = "ioDevilWindow";
        let book: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        book.x = left;
        book.y = top;
        let ui: any = { "mc": mc, "book": book, "rows": [] };
        IoDevilWindow._ui = ui;
        IoDevilWindow._anims = [];
        let win: any = { "mc": mc, "closed": false, "close": null };
        win.close = (): void => {
            if (win.closed) {
                return;
            }
            win.closed = true;
            mc.removeEventListener(Event.ENTER_FRAME, IoDevilWindow.tick);
            if (mc.parent) {
                mc.parent.removeChild(mc);
                GLOBAL.BlockerRemove();
                SOUNDS.Play("close");
            }
        };
        IoDevilWindow._win = win;

        // leather, the two pages and the spine
        let g: any = book.graphics;
        g.lineStyle(3, 0x241008, 1);
        g.beginFill(0x4A1C10, 1);
        g.drawRoundRect(0, 0, W, H, 32, 32);
        g.endFill();
        g.lineStyle(2, 0x7A3A1C, 1);
        g.drawRoundRect(4, 4, W - 8, H - 8, 26, 26);
        g.lineStyle();
        book.filters = [new DropShadowFilter(14, 90, 0, 0.7, 40, 40, 1, 2), new GlowFilter(0xFF4A00, 0.25, 30, 30, 2, 2)];
        let PW: int = IoDevilWindow.PAGE_W;
        let pageH: int = H - 28;
        ui.leftPage = IoDevilWindow.page(book, 14, 14, PW, pageH, true);
        let spine: Sprite = as3.as(book.addChild(new Sprite()), Sprite);
        spine.graphics.beginFill(0x2A0F08, 1);
        spine.graphics.drawRect(IoDevilWindow.SPINE_X, 14, 14, pageH);
        spine.graphics.endFill();
        ui.rightPage = IoDevilWindow.page(book, IoDevilWindow.RIGHT_X, 14, PW, pageH, false);
        // (the right page's terms sit in their own layer, which turns from the spine: its origin is the spine)
        ui.right = as3.as(ui.rightPage.addChild(new Sprite()), Sprite);
        let ribbon: Sprite = as3.as(book.addChild(new Sprite()), Sprite);
        ribbon.graphics.beginFill(0x9E1B1B, 1);
        ribbon.graphics.moveTo(W - 120, -6);
        ribbon.graphics.lineTo(W - 98, -6);
        ribbon.graphics.lineTo(W - 98, 64);
        ribbon.graphics.lineTo(W - 109, 52);
        ribbon.graphics.lineTo(W - 120, 64);
        ribbon.graphics.lineTo(W - 120, -6);
        ribbon.graphics.endFill();

        // the left page: today's bargains
        let lp: Sprite = ui.leftPage;
        let kick: TextField = as3.as(lp.addChild(IoDevilWindow.text(KEYS.Get("io_dv_bargains"), 12, 0x7A5A30, "Alegreya", PW - 48, "left", true)), TextField);
        kick.x = 24;
        kick.y = 20;
        let title: TextField = as3.as(lp.addChild(IoDevilWindow.text(KEYS.Get("io_dv_ledger"), 32, 0x3A2414, "Pirata One", PW - 48)), TextField);
        title.x = 24;
        title.y = 36;
        GLOBAL.ioFitText(title, 20);
        lp.graphics.beginFill(0x8E1717, 1);
        lp.graphics.drawRect(24, 82, PW - 48, 2);
        lp.graphics.endFill();
        for (let i: int = 0; i < IoDevilWindow._ids.length; i++) {
            ui.rows.push(IoDevilWindow.row(lp, IoDevilWindow._ids[i], i));
        }
        let refuse: MovieClip = new MovieClip();
        refuse.buttonMode = true;
        refuse.mouseChildren = false;
        let rt: TextField = as3.as(refuse.addChild(IoDevilWindow.text(KEYS.Get("io_dv_close"), 15, 0x5A3A1E, "Alegreya", PW - 48, "center", true)), TextField);
        GLOBAL.ioFitText(rt, 11);
        rt.y = 11;
        refuse.graphics.lineStyle(2, 0x8A6A42, 1);
        refuse.graphics.beginFill(0xEAD9B5, 0.01);
        refuse.graphics.drawRoundRect(0, 0, PW - 48, 44, 12, 12);
        refuse.graphics.endFill();
        refuse.x = 24;
        refuse.y = pageH - 18 - 44;
        refuse.name = "ioDevilRefuse";
        refuse.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoDevilWindow.refuse();
        });
        lp.addChild(refuse);
        ui.refuse = refuse;

        // the right page: the chosen contract's terms
        IoDevilWindow.drawTerms();

        // the deal (ledger animation 3), over everything
        IoDevilWindow.deal();

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        IoWin.fit(mc, W, H);
        mc.addEventListener(Event.ENTER_FRAME, IoDevilWindow.tick);
        SOUNDS.Play("click1");
    }

    /** One of the left page's three bargains. */
    private static row(lp: Sprite, id: string, i: int): any {
        let d: any = IoDevil.describe(id);
        let PW: int = IoDevilWindow.PAGE_W;
        let b: MovieClip = new MovieClip();
        b.name = "ioDevilRow:" + id;
        b.buttonMode = true;
        b.mouseChildren = false;
        b.x = 24;
        b.y = IoDevilWindow.ROW_Y + i * IoDevilWindow.ROW_H;
        let body: Sprite = as3.as(b.addChild(new Sprite()), Sprite);
        let bg: Sprite = as3.as(body.addChild(new Sprite()), Sprite);
        let num: TextField = as3.as(body.addChild(IoDevilWindow.text(d.numeral, 26, 0x8E1717, "Pirata One", 44, "center")), TextField);
        num.y = 14;
        let name: TextField = as3.as(body.addChild(IoDevilWindow.text(d.name, 20, 0x2A1A0E, "Alegreya", PW - 48 - 80, "left", true)), TextField);
        name.x = 50;
        name.y = 10;
        GLOBAL.ioFitText(name, 14);
        let short: TextField = as3.as(body.addChild(IoDevilWindow.text(d.short, 14, 0x5A3A1E, "Alegreya", PW - 48 - 80)), TextField);
        short.x = 50;
        short.y = 36;
        GLOBAL.ioFitText(short, 11);
        let arrow: TextField = as3.as(body.addChild(IoDevilWindow.text("❯", 20, 0x8E1717, "Alegreya", 24, "center", true)), TextField);
        arrow.x = PW - 48 - 26;
        arrow.y = 20;
        body.graphics.beginFill(0xB8925A, 1);
        body.graphics.drawRect(0, IoDevilWindow.ROW_H - 1, PW - 48, 1);
        body.graphics.endFill();
        let hit: Sprite = as3.as(b.addChild(new Sprite()), Sprite);
        hit.graphics.beginFill(0, 0);
        hit.graphics.drawRect(0, 0, PW - 48, IoDevilWindow.ROW_H);
        hit.graphics.endFill();
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoDevilWindow.pick(id);
        });
        lp.addChild(b);
        let r: any = { "id": id, "mc": b, "body": body, "bg": bg, "arrow": arrow };
        IoDevilWindow.drawRow(r);
        return r;
    }

    private static drawRow(r: any): void {
        let on: boolean = r.id == IoDevilWindow._picked;
        r.bg.graphics.clear();
        if (on) {
            r.bg.graphics.beginFill(0x9E1B1B, 0.1);
            r.bg.graphics.drawRect(0, 0, IoDevilWindow.PAGE_W - 48, IoDevilWindow.ROW_H - 1);
            r.bg.graphics.endFill();
        }
        r.arrow.visible = on;
    }

    /** The right page's terms, for the contract picked (drawn again for each). */
    private static drawTerms(): void {
        let ui: any = IoDevilWindow._ui;
        let PW: int = IoDevilWindow.PAGE_W;
        let pageH: int = IoDevilWindow.H - 28;
        if (ui.terms && ui.terms.parent) {
            ui.terms.parent.removeChild(ui.terms);
        }
        let t: Sprite = as3.as(ui.right.addChild(new Sprite()), Sprite);
        ui.terms = t;
        let d: any = IoDevil.describe(IoDevilWindow._picked);
        let x: int = 22;
        let w: int = PW - 46;
        let name: TextField = as3.as(t.addChild(IoDevilWindow.text(d.name, 30, 0x3A2414, "Pirata One", w - 60)), TextField);
        name.x = x;
        name.y = 18;
        GLOBAL.ioFitText(name, 18);
        let num: TextField = as3.as(t.addChild(IoDevilWindow.text(d.numeral, 22, 0x8E1717, "Pirata One", 60, "right")), TextField);
        num.x = x + w - 60;
        num.y = 24;
        let accepts: TextField = as3.as(t.addChild(IoDevilWindow.text(KEYS.Get("io_dv_accepts"), 15, 0x5A3A1E, "Alegreya", w, "left", false, true)), TextField);
        accepts.x = x;
        accepts.y = 60;
        GLOBAL.ioFitText(accepts, 11);
        let clause: Function = (y: int, label: string, body: string, ink: uint, line: uint, tint: boolean): void => {
            if (tint) {
                IoDevilWindow.box(t.graphics, x, y, w, 84, -1, 1, 0x9E1B1B, 0.06, 12);
            }
            IoDevilWindow.box(t.graphics, x, y, w, 84, line, 1, -1, 0, 12);
            let l: TextField = as3.as(t.addChild(IoDevilWindow.text(label, 12, ink, "Alegreya", w - 24, "left", true)), TextField);
            l.x = x + 12;
            l.y = y + 6;
            let b: TextField = as3.as(t.addChild(IoDevilWindow.text(body, 17, ink == 0x6B4A12 ? 0x2A1A0E : ink, "Alegreya", w - 24, "left", true, false, 2)), TextField);
            b.x = x + 12;
            b.y = y + 24;
        };
        clause(88, KEYS.Get("io_dv_boon_lbl", { "v1": KEYS.Get("io_dv_hours", { "v1": d.boonHours }) }), d.boon, 0x6B4A12, 0xB8925A, false);
        clause(182, KEYS.Get("io_dv_price_lbl", { "v1": KEYS.Get("io_dv_hours", { "v1": d.priceHours }) }), d.price, 0x8E1717, 0xC9A0A0, true);
        let unbreak: TextField = as3.as(t.addChild(IoDevilWindow.text(KEYS.Get("io_dv_unbreakable"), 14, 0x4A3018, "Alegreya", w)), TextField);
        unbreak.x = x;
        unbreak.y = 276;
        // the signature line and the seal
        let sealY: int = pageH - 18 - 88;
        let sealX: int = x + w - 88;
        t.graphics.lineStyle();
        t.graphics.beginFill(0x7A5A30, 1);
        t.graphics.drawRect(x, sealY + 60, w - 102, 1);
        t.graphics.endFill();
        let sigLbl: TextField = as3.as(t.addChild(IoDevilWindow.text(KEYS.Get("io_dv_signature"), 12, 0x6B4A2A, "Alegreya", w - 102)), TextField);
        sigLbl.x = x;
        sigLbl.y = sealY + 64;
        let sig: TextField = as3.as(t.addChild(IoDevilWindow.text(KEYS.Get("io_dv_signed_in"), 24, 0x8E1717, "Alegreya", w - 102, "left", false, true)), TextField);
        sig.x = x;
        sig.y = sealY + 22;
        sig.visible = false;
        ui.sig = sig;
        let seal: MovieClip = new MovieClip();
        seal.name = "ioDevilSign";
        seal.buttonMode = true;
        seal.mouseChildren = false;
        seal.graphics.beginFill(0x5E0D0D, 1);
        seal.graphics.drawCircle(44, 48, 44);
        seal.graphics.endFill();
        seal.graphics.lineStyle(4, 0x5E0D0D, 1);
        seal.graphics.beginFill(0x9E1B1B, 1);
        seal.graphics.drawCircle(44, 44, 42);
        seal.graphics.endFill();
        let st: TextField = as3.as(seal.addChild(IoDevilWindow.text(KEYS.Get("io_dv_sign"), 21, 0xF3E6CF, "Pirata One", 76, "center", false, false, 2)), TextField);
        st.x = 6;
        st.y = 18;
        seal.x = sealX;
        seal.y = sealY;
        seal.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoDevilWindow.sign();
        });
        t.addChild(seal);
        ui.seal = seal;
        let stamp: Sprite = as3.as(t.addChild(new Sprite()), Sprite);
        stamp.graphics.lineStyle(5, 0x5E0D0D, 1);
        stamp.graphics.beginFill(0x9E1B1B, 1);
        stamp.graphics.drawCircle(0, 0, 42);
        stamp.graphics.endFill();
        let sd: TextField = as3.as(stamp.addChild(IoDevilWindow.text("D", 44, 0xF3E6CF, "Pirata One", 84, "center")), TextField);
        sd.x = -42;
        sd.y = -32;
        stamp.filters = [new DropShadowFilter(4, 90, 0, 0.5, 10, 10, 1, 2)];
        stamp.x = sealX + 44;
        stamp.y = sealY + 44;
        stamp.visible = false;
        ui.stamp = stamp;
    }

    // ---- choosing
    private static pick(id: string): void {
        if (IoDevilWindow._phase != "open" || id == IoDevilWindow._picked) {
            return;
        }
        IoDevilWindow._picked = id;
        for (let r of IoDevilWindow._ui.rows) {
            IoDevilWindow.drawRow(r);
        }
        IoDevilWindow.drawTerms();
        // (ledger animation 2: the page turns over to it, from the spine)
        let right: Sprite = IoDevilWindow._ui.right;
        IoDevilWindow.anim(0, 550, (p: number): void => {
            let e: number = IoDevilWindow.easeOut(p);
            right.scaleX = Math.max(0.001, e);
            right.alpha = 0.55 + 0.45 * e;
        });
        SOUNDS.Play("click1");
    }

    private static sign(): void {
        if (IoDevilWindow._phase != "open" || !IoDevilWindow._picked) {
            return;
        }
        IoDevilWindow._phase = "busy";
        IoDevil.sign(IoDevilWindow._picked, (error: string): void => {
            if (error) {
                IoDevilWindow._phase = "open";
                GLOBAL.Message(error);
                return;
            }
            IoDevilWindow.sealAndBurn();
        });
    }

    private static refuse(): void {
        if (IoDevilWindow._phase != "open") {
            return;
        }
        IoDevilWindow._phase = "busy";
        IoDevil.refuse((error: string): void => {
            if (error) {
                IoDevilWindow._phase = "open";
                GLOBAL.Message(error);
                return;
            }
            IoDevilWindow.burnAll();
        });
    }

    // ---- ledger animation 2: seal and burn
    private static sealAndBurn(): void {
        let ui: any = IoDevilWindow._ui;
        IoDevilWindow._phase = "signing";
        ui.refuse.visible = false;
        // the page shakes
        let right: Sprite = ui.right;
        IoDevilWindow.anim(200, 350, (p: number): void => {
            right.x = p >= 1 ? 0 : Math.sin(p * Math.PI * 5) * 5 * (1 - p);
        });
        // the other two burn away
        for (let r of ui.rows) {
            if (r.id != IoDevilWindow._picked) {
                IoDevilWindow.burn(r.body, IoDevilWindow.PAGE_W - 48, IoDevilWindow.ROW_H, 0);
                r.mc.buttonMode = false;
            }
        }
        // the seal comes down
        ui.seal.visible = false;
        let stamp: Sprite = ui.stamp;
        stamp.visible = true;
        stamp.alpha = 0;
        IoDevilWindow.anim(500, 700, (p: number): void => {
            let s: number;
            let rot: number;
            if (p < 0.55) {
                let q: number = p / 0.55;
                s = 3.2 + (0.88 - 3.2) * q;
                rot = -40 + 32 * q;
                stamp.alpha = Math.min(1, q * 1.4);
            } else if (p < 0.75) {
                let q: number = (p - 0.55) / 0.2;
                s = 0.88 + (1.06 - 0.88) * q;
                rot = -8 - 6 * q;
                stamp.alpha = 1;
            } else {
                let q: number = (p - 0.75) / 0.25;
                s = 1.06 + (1 - 1.06) * q;
                rot = -14 + 2 * q;
            }
            stamp.scaleX = stamp.scaleY = s;
            stamp.rotation = rot;
        }, (): void => {
            SOUNDS.Play("click1");
        });
        // and the signature writes itself
        let sig: TextField = ui.sig;
        let mask: Sprite = as3.as(ui.terms.addChild(new Sprite()), Sprite);
        mask.x = sig.x;
        mask.y = sig.y;
        sig.mask = mask;
        IoDevilWindow.anim(1100, 900, (p: number): void => {
            sig.visible = true;
            mask.graphics.clear();
            mask.graphics.beginFill(0, 1);
            mask.graphics.drawRect(0, 0, Math.max(1, sig.width * p), sig.height);
            mask.graphics.endFill();
        });
        IoDevilWindow.anim(2300, 1, (p: number): void => {}, (): void => {
            IoDevilWindow._phase = "signed";
            let d: any = IoDevil.describe(IoDevilWindow._picked);
            IoDevilWindow.result(KEYS.Get("io_dv_signed_title", { "v1": d.name }), KEYS.Get("io_dv_signed_text"));
        });
    }

    private static burnAll(): void {
        let ui: any = IoDevilWindow._ui;
        IoDevilWindow._phase = "refusing";
        ui.refuse.visible = false;
        let i: int = 0;
        for (let r of ui.rows) {
            IoDevilWindow.burn(r.body, IoDevilWindow.PAGE_W - 48, IoDevilWindow.ROW_H, i * 120);
            r.mc.buttonMode = false;
            i++;
        }
        IoDevilWindow.burn(ui.right, IoDevilWindow.PAGE_W, IoDevilWindow.H - 28, 200);
        IoDevilWindow.anim(2300, 1, (p: number): void => {}, (): void => {
            IoDevilWindow._phase = "refused";
            IoDevilWindow.result(KEYS.Get("io_dv_closed_title"), KEYS.Get("io_dv_closed_text"));
        });
    }

    /** Burns `s` (w x h) away from the bottom up, an ember line at the edge, starting `delay` ms from now. */
    private static burn(s: Sprite, w: number, h: number, delay: int): void {
        let parent: any = s.parent;
        let mask: Sprite = new Sprite();
        mask.x = s.x;
        mask.y = s.y;
        parent.addChild(mask);
        s.mask = mask;
        let edge: Sprite = new Sprite();
        edge.graphics.beginFill(0xFFB04A, 1);
        edge.graphics.drawRoundRect(-4, -6, w + 8, 12, 12, 12);
        edge.graphics.endFill();
        edge.filters = [new GlowFilter(0xFF5A14, 0.9, 16, 16, 3, 2), new GlowFilter(0xFFF1C4, 0.8, 4, 4, 2, 1)];
        edge.x = s.x;
        edge.visible = false;
        parent.addChild(edge);
        IoDevilWindow.anim(delay, 1400, (p: number): void => {
            let e: number = p * p;
            let left: number = h * (1 - e);
            mask.graphics.clear();
            mask.graphics.beginFill(0, 1);
            mask.graphics.drawRect(0, 0, w, Math.max(0.5, left));
            mask.graphics.endFill();
            s.alpha = 1 - 0.55 * Math.min(1, p * 1.6);
            edge.visible = p < 1;
            edge.y = s.y + left;
            edge.alpha = p > 0.9 ? (1 - p) * 10 : 1;
        }, (): void => {
            s.visible = false;
            if (edge.parent) {
                edge.parent.removeChild(edge);
            }
        });
    }

    /** The end: a note on the left page, and OK to close. */
    private static result(title: string, body: string): void {
        let ui: any = IoDevilWindow._ui;
        let PW: int = IoDevilWindow.PAGE_W;
        let n: Sprite = new Sprite();
        let w: int = PW - 36;
        let g: any = n.graphics;
        g.lineStyle(2, 0xB8862F, 1);
        g.beginFill(0x140805, 1);
        g.drawRoundRect(0, 0, w, 150, 16, 16);
        g.endFill();
        let t: TextField = as3.as(n.addChild(IoDevilWindow.text(title, 26, 0xE8B04A, "Pirata One", w - 24, "center")), TextField);
        t.x = 12;
        t.y = 12;
        GLOBAL.ioFitText(t, 16);
        let b: TextField = as3.as(n.addChild(IoDevilWindow.text(body, 15, 0xD8C2A0, "Alegreya", w - 24, "center", false, false, 2)), TextField);
        b.x = 12;
        b.y = 50;
        let ok: Sprite = CasinoUI.button(KEYS.Get("btn_ok"), 120, 36, (e: any = null): void => {
            if (IoDevilWindow._win) {
                IoDevilWindow._win.close();
            }
        });
        ok.name = "ioDevilOk";
        ok.x = (w - 120) / 2;
        ok.y = 100;
        n.addChild(ok);
        // On the left page, where the burnt rows were, so the seal and the signature stay in sight.
        n.x = IoDevilWindow.SPINE_X - PW + 18;
        n.y = IoDevilWindow.H - 28 - 150 - 4;
        n.alpha = 0;
        ui.book.addChild(n);
        IoDevilWindow.anim(0, 500, (p: number): void => {
            n.alpha = p;
            n.y = IoDevilWindow.H - 28 - 150 - 4 + 8 * (1 - p);
        });
    }

    // ---- ledger animation 3: the deal
    private static deal(): void {
        let ui: any = IoDevilWindow._ui;
        let W: int = IoDevilWindow.W;
        let H: int = IoDevilWindow.H;
        let veil: Sprite = as3.as(ui.book.addChild(new Sprite()), Sprite);
        veil.graphics.beginFill(0x0E0604, 0.94);
        veil.graphics.drawRoundRect(0, 0, W, H, 32, 32);
        veil.graphics.endFill();
        let kick: TextField = as3.as(veil.addChild(IoDevilWindow.text(KEYS.Get("io_dv_deals"), 13, 0xFF8A3D, "Alegreya", W, "center", true)), TextField);
        kick.y = 84;
        // the left page's rows and the right page wait for the cards
        for (let r of ui.rows) {
            r.mc.alpha = 0;
        }
        ui.right.scaleX = 0.001;
        let cardW: int = 150;
        let cardH: int = 210;
        let cy: int = 290;
        let x0: int = ((W - (3 * cardW + 2 * 16)) / 2) | 0;
        let sx: number[] = [200, 0, -200];
        let sr: number[] = [-30, 8, 30];
        let er: number[] = [-4, 0, 4];
        for (let i: int = 0; i < ui.rows.length; i++) {
            let d: any = IoDevil.describe(ui.rows[i].id);
            let card: Sprite = as3.as(veil.addChild(new Sprite()), Sprite);
            let front: Sprite = as3.as(card.addChild(new Sprite()), Sprite);
            IoDevilWindow.box(front.graphics, -cardW / 2, -cardH / 2, cardW, cardH, -1, 1, 0x1D0D0A, 1, 20);
            front.graphics.lineStyle(2, 0xC9893A, 1);
            front.graphics.drawRoundRect(-cardW / 2, -cardH / 2, cardW, cardH, 20, 20);
            let fn: TextField = as3.as(front.addChild(IoDevilWindow.text(d.numeral, 40, 0xFFB35A, "Pirata One", cardW, "center")), TextField);
            fn.x = -cardW / 2;
            fn.y = -72;
            let fname: TextField = as3.as(front.addChild(IoDevilWindow.text(d.name, 22, 0xF3E6CF, "Pirata One", cardW - 16, "center")), TextField);
            fname.x = -cardW / 2 + 8;
            fname.y = -12;
            GLOBAL.ioFitText(fname, 14);
            let fs: TextField = as3.as(front.addChild(IoDevilWindow.text(d.short, 13, 0xC9B08E, "Alegreya", cardW - 16, "center")), TextField);
            fs.x = -cardW / 2 + 8;
            fs.y = 22;
            GLOBAL.ioFitText(fs, 10);
            let back: Sprite = as3.as(card.addChild(new Sprite()), Sprite);
            IoDevilWindow.box(back.graphics, -cardW / 2, -cardH / 2, cardW, cardH, -1, 1, 0x3D120C, 1, 20);
            back.graphics.lineStyle(2, 0xC9893A, 1);
            back.graphics.drawRoundRect(-cardW / 2, -cardH / 2, cardW, cardH, 20, 20);
            back.graphics.drawCircle(0, 0, 30);
            let bd: TextField = as3.as(back.addChild(IoDevilWindow.text("D", 32, 0xC9893A, "Pirata One", 60, "center")), TextField);
            bd.x = -30;
            bd.y = -24;
            front.visible = false;
            let tx: number = x0 + i * (cardW + 16) + cardW / 2;
            card.alpha = 0;
            // dealt from the deck below
            IoDevilWindow.anim(200 + i * 220, 500, (p: number): void => {
                let e: number = IoDevilWindow.easeOut(p);
                card.alpha = Math.min(1, p * 6);
                card.x = tx + sx[i] * (1 - e);
                card.y = cy + 300 * (1 - e);
                card.rotation = sr[i] + (er[i] - sr[i]) * e;
                card.scaleY = 0.6 + 0.4 * e;
                card.scaleX = card.scaleY;
            });
            // turned over
            IoDevilWindow.anim(900 + i * 200, 500, (p: number): void => {
                let k: number = card.scaleY;
                if (p < 0.5) {
                    card.scaleX = k * Math.max(0.01, 1 - p * 2);
                } else {
                    back.visible = false;
                    front.visible = true;
                    card.scaleX = k * Math.max(0.01, p * 2 - 1);
                }
            });
            // and swept into the book's list
            let row: any = ui.rows[i];
            let gx: number = 14 + 24 + (IoDevilWindow.PAGE_W - 48) / 2;
            let gy: number = 14 + IoDevilWindow.ROW_Y + i * IoDevilWindow.ROW_H + IoDevilWindow.ROW_H / 2;
            IoDevilWindow.anim(1950 + i * 80, 450, (p: number): void => {
                let e: number = p * p;
                card.x = tx + (gx - tx) * e;
                card.y = cy + (gy - cy) * e;
                card.scaleX = card.scaleY = 1 - 0.7 * e;
                card.rotation = er[i] * (1 - e);
                card.alpha = 1 - e;
            });
            IoDevilWindow.anim(2300 + i * 120, 500, (p: number): void => {
                let e: number = IoDevilWindow.easeOut(p);
                row.mc.alpha = e;
                row.mc.x = 24 - 12 * (1 - e);
            });
        }
        IoDevilWindow.anim(2080, 520, (p: number): void => {
            veil.alpha = 1 - p;
        }, (): void => {
            if (veil.parent) {
                veil.parent.removeChild(veil);
            }
        });
        // the right page opens from the spine
        let right: Sprite = ui.right;
        IoDevilWindow.anim(2500, 800, (p: number): void => {
            let e: number = IoDevilWindow.easeOut(p);
            right.scaleX = Math.max(0.001, e);
            right.alpha = 0.4 + 0.6 * Math.min(1, p * 1.6);
        }, (): void => {
            IoDevilWindow._phase = "open";
        });
    }

    // ---- the animations' clock
    private static anim(delay: int, dur: int, fn: Function, done: Function = null): void {
        IoDevilWindow._anims.push({ "at": getTimer() + delay, "dur": Math.max(1, dur), "fn": fn, "done": done, "started": false });
    }

    private static easeOut(p: number): number {
        return 1 - Math.pow(1 - p, 3);
    }

    private static tick(e: Event = null): void {
        let now: int = getTimer();
        let list: any[] = IoDevilWindow._anims;
        let keep: any[] = [];
        for (let a of list) {
            if (now < a.at) {
                keep.push(a);
                continue;
            }
            let p: number = Math.min(1, (now - a.at) / a.dur);
            try {
                a.fn(p);
            } catch (err) {
            }
            if (p < 1) {
                keep.push(a);
            } else if (a.done) {
                try {
                    a.done();
                } catch (err) {
                }
            }
        }
        // (an animation's `done` may add more)
        for (let a of IoDevilWindow._anims) {
            if (list.indexOf(a) < 0) {
                keep.push(a);
            }
        }
        IoDevilWindow._anims = keep;
    }
}
