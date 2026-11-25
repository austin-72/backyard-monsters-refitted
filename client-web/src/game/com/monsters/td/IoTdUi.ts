import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { ArcadeArt, BFOUNDATION, BTOWER, BYMChat, Chat, GLOBAL, ImageCache, IoKit, IoTd, IoTd2, IoTd2Fx, IoTd2Ui, IoTdLink, IoTdWaves, KEYS, MAP, SOUNDS, TweenLite } from "@game";

/**
 * Inferno-only (Hellgate Defense, IoTd): its interface. The bar along the top (wave, lives, gold, walls in
 * storage, the maze's length; Yard Planner, Start wave, Auto, Zoom, Help, Leave), what the next wave brings,
 * the tower shop along the bottom, a tower's panel (its three upgrade paths, what it shoots first, Sell), the
 * wave banners, the gold and lives floating up off the yard, and the start, help and end screens.
 */
export class IoTdUi extends ASObject {
    private static readonly PANEL: uint = 2364943;

    private static readonly EDGE: uint = 10119738;

    private static readonly GOLD: uint = 16765514;

    private static readonly TEXT: uint = 16181192;

    private static readonly DIM: uint = 11048056;

    private static _root: Sprite = null;

    private static _bar: Sprite = null;

    private static _fields: any = {};

    private static _buttons: any = {};

    private static _next: TextField = null;

    private static _shop: Sprite = null;

    private static _cards: any[] = [];

    private static _panel: Sprite = null;

    private static _panelTower: BFOUNDATION = null;

    /** Hellgate Defense 2's shop has two shelves of six: "classic" (Hellgate Defense's) and "forged" (IoTd2's). */
    private static _shelf: string = "classic";

    private static _cardPrices: any[] = [];

    private static _toast: TextField = null;

    private static _overlay: Sprite = null;

    private static _floats: int = 0;

    /** The shop's towers' blurbs: their keys (QoL #235: in the player's language, read when shown). */
    private static readonly BLURB: any = { "21": "io_t3t_tdui_blurb_21", "130": "io_t3t_tdui_blurb_130", "132": "io_t3t_tdui_blurb_132", "144": "io_t3t_tdui_blurb_144", "129": "io_t3t_tdui_blurb_129", "145": "io_t3t_tdui_blurb_145" };

    /** The chat's right edge, measured at most once a second (measuring it walks every line of the chat). */
    private static _chatRight: number = -100000;

    private static _chatRightAt: int = -100000;

    private static _nextKey: string = "";

    private static _panelKey: string = "";

    /** The paths' names: their keys (QoL #235). */
    private static readonly PATH_NAMES: any = { "dmg": "io_t3t_tdui_path_dmg", "rate": "io_t3t_tdui_path_rate", "range": "io_t3t_tdui_path_range" };

    /** The rules (QoL #235: in the player's language, read when shown: the language file isn't loaded when the class is). */
    private static get RULES(): string {
        return KEYS.Get("io_t3t_tdui_rules1") + "<br><br>" + KEYS.Get("io_t3t_tdui_rules2") + "<br><br>" + KEYS.Get("io_t3t_tdui_rules3") + "<br><br>" + KEYS.Get("io_t3t_tdui_rules4");
    }

    /** QoL #378: the keys, under the rules in Help. */
    private static get KEYS_LINE(): string {
        return "<br><br><font color=\"#C8B898\">" + KEYS.Get("io_t3t_tdui_keys") + "</font>";
    }

    /** The rules were shown this session (a run shows them by itself only the first time). */
    private static _helped: boolean = false;

    // ---- helpers
    /**
     * The panels' face (7 October, the user's: more detailed art): carved basalt and old leather
     * (arcade/hellgate/panel.jpg, art/devilsarcade/games), repeating; the plain colour until it has loaded.
     */
    public static readonly PANEL_ART: string = "arcade/hellgate/panel.jpg";

    // ---- the run's interface
    public static Show(): void {
        IoTdUi.Hide();
        IoTdUi._shelf = "classic";
        IoTdUi._root = new Sprite();
        IoTdUi._root.name = "tdUi";
        GLOBAL._layerUI.addChild(IoTdUi._root);
        IoTdUi.makeBar();
        IoTdUi.makeShop();
        IoTdUi._toast = IoTdUi.label("", 13, IoTdUi.TEXT, true, 600, TextFormatAlign.CENTER);
        IoTdUi._toast.filters = [new GlowFilter(0, 1, 4, 4, 6)];
        IoTdUi._toast.alpha = 0;
        IoTdUi._root.addChild(IoTdUi._toast);
        IoTdUi.layout();
    }

    public static Hide(): void {
        IoTdUi.ClosePanel();
        IoTdUi.closeOverlay();
        if (IoTdUi._root && IoTdUi._root.parent) {
            IoTdUi._root.parent.removeChild(IoTdUi._root);
        }
        IoTdUi._root = null;
        IoTdUi._bar = null;
        IoTdUi._shop = null;
        IoTdUi._cards = [];
        IoTdUi._fields = {};
        IoTdUi._buttons = {};
    }

    private static makeBar(): void {
        IoTdUi._bar = new Sprite();
        IoTdUi._bar.name = "tdBar";
        IoTdUi._root.addChild(IoTdUi._bar);
        // (QoL #377: 1040 with Pause in it)
        let w: int = 1040;
        IoTdUi.panel(IoTdUi._bar, w, 58);
        let title: TextField = IoTdUi.label(IoTd2.on ? "HELLGATE DEFENSE 2" : "HELLGATE DEFENSE", 10, IoTdUi.DIM, true, 160, TextFormatAlign.LEFT);
        title.x = 12;
        title.y = 5;
        IoTdUi._bar.addChild(title);
        IoTdUi._fields.wave = IoTdUi.addField(IoTdUi._bar, 12, 20, 140, 20, IoTdUi.GOLD);
        let x: int = 150;
        for (let f of as3.values([["lives", "io_t3t_tdui_lives", 60], ["gold", "io_t3t_tdui_gold", 80], ["walls", "io_t3t_tdui_walls", 60], ["maze", "io_t3t_tdui_maze", 70]])) {
            let cap: TextField = IoTdUi.label(KEYS.Get(String(f[1])), 10, IoTdUi.DIM, true, f[2] | 0, TextFormatAlign.CENTER);
            GLOBAL.ioFitText(cap, 7);
            cap.x = x;
            cap.y = 6;
            IoTdUi._bar.addChild(cap);
            IoTdUi._fields[f[0]] = IoTdUi.addField(IoTdUi._bar, x, 22, f[2] | 0, 18, IoTdUi.TEXT, TextFormatAlign.CENTER);
            x = (x + ((f[2] | 0) + 4)) | 0;
        }
        x += 6;
        for (let b of as3.values([["plan", "io_t3t_tdui_btn_plan", 100, IoTd.Plan], ["start", "io_t3t_tdui_btn_start", 104, IoTd.StartWave], ["auto", "io_t3t_tdui_auto_off", 70, IoTdUi.autoClick], ["fast", "io_t3t_tdui_speed", 70, IoTdUi.fastClick], ["pause", "io_t3t_tdui_pause", 56, IoTdUi.pauseClick], ["zoom", "io_t3t_tdui_zoom", 46, IoTdUi.zoomClick], ["help", "io_t3t_tdui_help", 42, IoTdUi.helpClick], ["leave", "io_t3t_tdui_leave", 50, IoTd.Leave]])) {
            let btn: Sprite = IoTdUi.button(KEYS.Get(String(b[1]), { "v1": 1 }), b[2] | 0, 34, as3.as(b[3], Function), "td" + String(b[0]).charAt(0).toUpperCase() + String(b[0]).substr(1), String(b[0]) == "start");
            btn.x = x;
            btn.y = 12;
            IoTdUi._bar.addChild(btn);
            IoTdUi._buttons[b[0]] = btn;
            x = (x + ((b[2] | 0) + 5)) | 0;
        }
        IoTdUi._next = IoTdUi.label("", 12, IoTdUi.TEXT, false, w, TextFormatAlign.CENTER);
        IoTdUi._nextKey = "";
        IoTdUi._next.filters = [new GlowFilter(0, 1, 4, 4, 6)];
        IoTdUi._root.addChild(IoTdUi._next);
    }

    private static makeShop(): void {
        if (IoTdUi._shop && IoTdUi._shop.parent) {
            IoTdUi._shop.parent.removeChild(IoTdUi._shop);
        }
        IoTdUi._shop = new Sprite();
        IoTdUi._shop.name = "tdShop";
        IoTdUi._root.addChildAt(IoTdUi._shop, 0);
        IoTdUi._cards = [];
        IoTdUi._cardPrices = [];
        // (Hellgate Defense 2: twelve towers, six on a shelf)
        let list: any[] = IoTd.towerList;
        let start: int = 0;
        let n: int = list.length;
        if (IoTd2.on) {
            start = IoTdUi._shelf == "forged" ? 6 : 0;
            n = 6;
        }
        let cw: int = 96;
        let gap: int = 6;
        IoTdUi.panel(IoTdUi._shop, (n * (cw + gap) + gap + 64) | 0, 116);
        if (IoTd2.on) {
            let a: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_shelf_classic"), 56, 44, IoTdUi.shelfClick("classic"), "tdShelf:classic", false);
            a.x = 5;
            a.y = 8;
            // ("Hellforged" is the towers' name: as it is in every language, QoL #235)
            let b: Sprite = IoTdUi.button("Hell-\nforged", 56, 50, IoTdUi.shelfClick("forged"), "tdShelf:forged", false);
            let bl: TextField = as3.as(b.getChildByName("label"), TextField);
            if (bl) {
                bl.text = "Hellforged";
                bl.wordWrap = true;
                bl.multiline = true;
                bl.height = 34;
                bl.y = 8;
                bl.setTextFormat(new TextFormat("Verdana", 9, bl.textColor, true, null, null, null, null, TextFormatAlign.CENTER));
            }
            b.x = 5;
            b.y = 58;
            IoTdUi.choose(IoTdUi._shelf == "forged" ? b : a);
            IoTdUi._shop.addChild(a);
            IoTdUi._shop.addChild(b);
        } else {
            let cap: TextField = IoTdUi.label(KEYS.Get("io_t3t_tdui_towers"), 10, IoTdUi.DIM, true, 60, TextFormatAlign.CENTER);
            GLOBAL.ioFitText(cap, 7);
            cap.x = 4;
            cap.y = 48;
            IoTdUi._shop.addChild(cap);
        }
        for (let i: int = 0; i < n; i++) {
            let type: int = list[start + i][0] | 0;
            let card: Sprite = IoTdUi.towerCard(type, list[start + i][1] | 0, cw);
            card.x = 64 + gap + i * (cw + gap);
            card.y = 6;
            IoTdUi._shop.addChild(card);
            IoTdUi._cards.push(card);
            IoTdUi._cardPrices.push(list[start + i][1] | 0);
        }
    }

    private static shelfClick(shelf: string): Function {
        return (e: MouseEvent): void => {
            if (IoTdUi._shelf == shelf) {
                return;
            }
            SOUNDS.Play("click1");
            IoTdUi._shelf = shelf;
            IoTdUi.makeShop();
            IoTdUi.layout();
            IoTdUi.Update();
        };
    }

    private static towerCard(type: int, price: int, w: int): Sprite {
        let pic: Sprite = null;
        let props: any = null;
        let card: Sprite = new Sprite();
        card.name = "tdBuy:" + type;
        card.buttonMode = true;
        card.mouseChildren = false;
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(1, IoTdUi.EDGE, 1);
        IoTdUi.texture(bg.graphics, 3810328, 1);
        bg.graphics.drawRoundRect(0, 0, w, 104, 10, 10);
        bg.graphics.endFill();
        // (a little lighter than the panels behind)
        bg.graphics.lineStyle(0, 0, 0);
        bg.graphics.beginFill(9067060, 0.18);
        bg.graphics.drawRoundRect(1, 1, w - 2, 102, 10, 10);
        bg.graphics.endFill();
        card.addChild(bg);
        pic = new Sprite();
        pic.x = (w - 56) / 2;
        pic.y = 4;
        card.addChild(pic);
        props = GLOBAL._buildingProps[type - 1];
        let img: string = "buildingbuttons/" + (props.buildingbuttons ? props.buildingbuttons[0] : String(type)) + ".jpg";
        if (IoTd2.isCustom(type)) {
            img = "buildingbuttons/td2_" + type + ".jpg";
        }
        ImageCache.GetImageWithCallBack(img, (key: string, bmd: BitmapData, args: any[] = null): void => {
            let bm: Bitmap = new Bitmap(bmd);
            bm.smoothing = true;
            bm.width = bm.height = 56;
            pic.addChild(bm);
        });
        let name: TextField = IoTdUi.label(KEYS.Get(as3.str(props.name)), 10, IoTdUi.TEXT, true, (w - 4) | 0, TextFormatAlign.CENTER);
        name.x = 2;
        name.y = 60;
        GLOBAL.ioFitText(name, 7);
        card.addChild(name);
        let cost: TextField = IoTdUi.label(KEYS.Get("io_t3t_tdui_gold_n", { "v1": price }), 11, IoTdUi.GOLD, true, w, TextFormatAlign.CENTER);
        cost.y = 80;
        card.addChild(cost);
        card.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoTd.Buy(type);
        });
        card.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            IoTdUi.Toast(KEYS.Get("io_t3t_tdui_card_tip", { "v1": KEYS.Get(as3.str(props.name)), "v2": IoTd2.isCustom(type) ? IoTd2.blurbOf(type) : KEYS.Get(as3.str(IoTdUi.BLURB[String(type)])), "v3": price }), 4);
        });
        return card;
    }

    private static layout(): void {
        if (!IoTdUi._root) {
            return;
        }
        let s: any = GLOBAL._SCREEN;
        let cx: number = Number(s.x + s.width / 2);
        if (IoTdUi._bar) {
            // (centred, but clear of the sound, music and full screen buttons at the top right)
            IoTdUi._bar.x = Math.max(Number(s.x + 8), Math.min(cx - IoTdUi._bar.width / 2, s.x + s.width - 196 - IoTdUi._bar.width)) | 0;
            IoTdUi._bar.y = (s.y + 6) | 0;
            IoTdUi._next.x = IoTdUi._bar.x;
            IoTdUi._next.y = IoTdUi._bar.y + 62;
        }
        if (IoTdUi._shop) {
            // (centred, but clear of the chat at the bottom left; smaller if the screen is too narrow for both)
            let sw: number = IoTdUi._shop.width / IoTdUi._shop.scaleX;
            let sh: number = IoTdUi._shop.height / IoTdUi._shop.scaleY;
            let left: number = Math.max(Number(s.x + 8), IoTdUi.chatRight());
            let right: number = s.x + s.width - 8;
            let sc: number = Math.max(0.6, Math.min(1, (right - left) / sw));
            IoTdUi._shop.scaleX = IoTdUi._shop.scaleY = sc;
            IoTdUi._shop.x = Math.min(Math.max(cx - sw * sc / 2, left), right - sw * sc) | 0;
            IoTdUi._shop.y = (s.y + s.height - sh * sc - 8) | 0;
        }
        if (IoTdUi._toast) {
            IoTdUi._toast.x = (cx - 300) | 0;
            IoTdUi._toast.y = IoTdUi._shop ? IoTdUi._shop.y - 26 : s.y + s.height - 60;
        }
        if (IoTdUi._panel) {
            IoTdUi._panel.x = (s.x + s.width - IoTdUi._panel.width - 10) | 0;
            IoTdUi._panel.y = (s.y + 100) | 0;
        }
        if (IoTd2.on) {
            IoTd2Ui.layout(IoTdUi._shop);
        }
    }

    /** The chat's right edge (where the tower shop may start), or nothing if the chat isn't showing. */
    private static chatRight(): number {
        let now: int = getTimer();
        if (now - IoTdUi._chatRightAt < 1000) {
            return IoTdUi._chatRight;
        }
        IoTdUi._chatRightAt = now;
        let c: BYMChat = Chat._bymChat;
        if (!c || !c.visible || !c.stage || !IoTdUi._root) {
            return IoTdUi._chatRight = -100000;
        }
        let box: DisplayObject = as3.cast(c.chatBox && c.chatBox.background ? as3.as(c.chatBox.background, DisplayObject) : c, DisplayObject);
        let r: Rectangle = box.getBounds(IoTdUi._root);
        return IoTdUi._chatRight = Number(r.width > 0 ? r.right + 8 : -100000);
    }

    /** The numbers (a few times a second, and after anything happens). */
    public static Update(): void {
        if (!IoTdUi._root) {
            return;
        }
        IoTdUi.layout();
        IoTdUi.setText(as3.cast(IoTdUi._fields.wave, TextField), IoTd.waveOn ? KEYS.Get("io_t3t_wv", { "v1": IoTd.wave }) : (IoTd.cleared > 0 ? KEYS.Get("io_t3t_tdui_wave_done", { "v1": IoTd.cleared }) : KEYS.Get("io_t3t_tdui_ready")), true);
        IoTdUi.setText(as3.cast(IoTdUi._fields.lives, TextField), "♥ " + IoTd.lives);
        (as3.as(IoTdUi._fields.lives, TextField)).textColor = (IoTd.lives <= 5 ? 0xFF5544 : IoTdUi.TEXT) >>> 0;
        IoTdUi.setText(as3.cast(IoTdUi._fields.gold, TextField), GLOBAL.FormatNumber(IoTd.gold));
        (as3.as(IoTdUi._fields.gold, TextField)).textColor = IoTdUi.GOLD;
        IoTdUi.setText(as3.cast(IoTdUi._fields.walls, TextField), String(IoTd.wallsLeft));
        IoTdUi.setText(as3.cast(IoTdUi._fields.maze, TextField), GLOBAL.FormatNumber(IoTd.mazeLength));
        IoTdUi.enable(as3.cast(IoTdUi._buttons.plan, Sprite), !IoTd.waveOn && !IoTd.over);
        IoTdUi.enable(as3.cast(IoTdUi._buttons.start, Sprite), !IoTd.waveOn && !IoTd.over);
        IoTdUi.setButton(as3.cast(IoTdUi._buttons.start, Sprite), IoTd.waveOn ? KEYS.Get("io_t3t_tdui_wave_on") : (IoTdLink.coop ? IoTdLink.readyLabel : KEYS.Get("io_t3t_tdui_start_n", { "v1": IoTd.cleared + 1 })));
        IoTdUi.setButton(as3.cast(IoTdUi._buttons.auto, Sprite), KEYS.Get(IoTd.auto ? "io_t3t_tdui_auto_on" : "io_t3t_tdui_auto_off"));
        IoTdUi.setButton(as3.cast(IoTdUi._buttons.fast, Sprite), KEYS.Get("io_t3t_tdui_speed", { "v1": IoTd.speed }));
        IoTdUi.ioPauseButton();
        if (IoTdUi._next) {
            // (only when it changes: the preview made the next wave's monsters again ten times a second)
            let nk: string = IoTd.over ? "over" : (IoTd.waveOn ? "on" + IoTd.wave : "next" + IoTd.cleared);
            if (nk != IoTdUi._nextKey) {
                IoTdUi._nextKey = nk;
                // (Hellgate Defense 2: the map and difficulty first)
                let where: string = IoTd2.on ? "<font color=\"#C8B89A\">" + IoTd2.mapNameOf(String(IoTd2.cfg.map || ""), IoTd2.cfg.mapName || "") + " · " + (IoTd2.cfg.daily ? KEYS.Get("io_t3t_td2_daily") : IoTd2.diffName(IoTd2.diff)) + "</font>   " : "";
                IoTdUi._next.htmlText = IoTd.over ? "" : where + (IoTd.waveOn ? "<b>" + (IoTd2.on ? IoTd2.title(IoTd.wave) : IoTdWaves.title(IoTd.wave)) + "</b>" : KEYS.Get("io_t3t_tdui_next", { "v1": IoTd.nextPreview }));
            }
        }
        for (let i: int = 0; i < IoTdUi._cards.length; i++) {
            let price: int = IoTdUi._cardPrices[i] | 0;
            (as3.as(IoTdUi._cards[i], Sprite)).alpha = Number(IoTd.gold >= price && !IoTd.over ? 1 : 0.45);
        }
        if (IoTdUi._panel && IoTdUi._panelTower) {
            IoTdUi.refreshPanel();
        }
    }

    private static autoClick(e: MouseEvent = null): void {
        IoTd.auto = !IoTd.auto;
        SOUNDS.Play("click1");
        IoTdUi.Update();
    }

    private static fastClick(e: MouseEvent = null): void {
        // (QoL #377: 1x, 2x, 3x and round again)
        IoTd.speed = IoTd.speed >= 3 ? 1 : IoTd.speed + 1;
        SOUNDS.Play("click1");
        IoTdUi.Update();
    }

    /** QoL #377: Pause / Go on (solo runs). */
    private static pauseClick(e: MouseEvent = null): void {
        IoTd.paused = !IoTd.paused;
        SOUNDS.Play("click1");
        IoTdUi.Update();
    }

    private static ioPauseButton(): void {
        let b: Sprite = as3.as(IoTdUi._buttons.pause, Sprite);
        if (!b) {
            return;
        }
        let solo: boolean = !IoTdLink.coop && !IoTdLink.versus;
        b.visible = solo;
        IoTdUi.setButton(b, KEYS.Get(IoTd.paused ? "io_t3t_tdui_go_on" : "io_t3t_tdui_pause"));
        IoTdUi.enable(b, !IoTd.over);
    }

    private static zoomClick(e: MouseEvent = null): void {
        GLOBAL.Zoom();
    }

    private static helpClick(e: MouseEvent = null): void {
        IoTdUi.Help(true);
    }

    // ---- a tower's panel
    public static TowerPanel(t: BFOUNDATION): void {
        IoTdUi.ClosePanel();
        if (!IoTdUi._root || !t) {
            return;
        }
        IoTdUi._panelTower = t;
        IoTdUi._panel = new Sprite();
        IoTdUi._panel.name = "tdPanel";
        IoTdUi._root.addChild(IoTdUi._panel);
        IoTdUi.refreshPanel();
        IoTdUi.layout();
        SOUNDS.Play("click1");
    }

    public static ClosePanel(e: MouseEvent = null): void {
        IoTdUi._panelKey = "";
        if (IoTdUi._panel && IoTdUi._panel.parent) {
            IoTdUi._panel.parent.removeChild(IoTdUi._panel);
        }
        IoTdUi._panel = null;
        IoTdUi._panelTower = null;
        IoTd2Fx.shown = null;
    }

    private static refreshPanel(): void {
        let t: BFOUNDATION = IoTdUi._panelTower;
        let info: any = IoTd.towerInfo(t);
        if (!t || !info || t.health <= 0 || !t._mc || !t._mc.parent && !t._position) {
            IoTdUi.ClosePanel();
            return;
        }
        if (IoTd2.on) {
            IoTd2Fx.shown = t;
        }
        // (made afresh only when what it shows changed: made again ten times a second, a click whose press and
        // let-go fell either side of it was lost, upgrades and Sell among them; 9 October)
        let key: string = t._type + "|" + info.dmg + "|" + info.rate + "|" + info.range + "|" + info.special + "|" + info.rank + "|" + info.drumDmg + "|" + info.spent + "|" + IoTd.priorityOf(t) + "|" + IoTd.gold + "|" + IoTd.sellPrice(t);
        if (key == IoTdUi._panelKey && IoTdUi._panel.numChildren) {
            return;
        }
        IoTdUi._panelKey = key;
        // (made afresh: only a handful of things in it)
        while (IoTdUi._panel.numChildren) {
            IoTdUi._panel.removeChildAt(0);
        }
        IoTdUi._panel.graphics.clear();
        let w: int = IoTd2.on ? 300 : 280;
        let paths: any[] = IoTd.paths;
        IoTdUi.panel(IoTdUi._panel, w, (IoTd.hasPriority(t._type) ? 300 : 262) + (IoTd2.on ? 72 : 0));
        let title: TextField = IoTdUi.label(KEYS.Get(as3.str(GLOBAL._buildingProps[t._type - 1].name)), 15, IoTdUi.GOLD, true, (w - 40) | 0, TextFormatAlign.LEFT);
        title.x = 12;
        title.y = 8;
        IoTdUi._panel.addChild(title);
        let x: Sprite = IoTdUi.button("X", 26, 24, IoTdUi.ClosePanel, "tdPanelClose");
        x.x = w - 34;
        x.y = 8;
        IoTdUi._panel.addChild(x);
        // (the simulation runs 80 steps a second; a tower shoots every 2 x _rate steps)
        let line: string = "";
        if (IoTd2.isCustom(t._type)) {
            line = IoTd2.statLine(t, info);
        } else {
            let tw: BTOWER = as3.as(t, BTOWER);
            let shots: number = Number(tw._rate > 0 ? 40 / tw._rate : 0);
            line = KEYS.Get("io_t3t_tdui_stats", { "v1": GLOBAL.FormatNumber(tw.damageProperty.value | 0), "v2": Math.round(shots * 10) / 10, "v3": tw._range });
        }
        let stats: TextField = IoTdUi.label(line, 11, IoTdUi.TEXT, false, (w - 20) | 0, TextFormatAlign.LEFT);
        stats.x = 12;
        stats.y = 34;
        IoTdUi._panel.addChild(stats);
        let y: int = 60;
        // (Hellgate Defense 2: the tower's rank, and what the drums round it give)
        if (IoTd2.on) {
            let r: int = info.rank | 0;
            let next: int = r < IoTd2.RANK_KILLS.length ? IoTd2.RANK_KILLS[r] | 0 : 0;
            let stars: string = "";
            for (let i: int = 0; i < IoTd2.RANK_KILLS.length; i++) {
                stars += i < r ? "★" : "☆";
            }
            let drum: string = Number(info.drumDmg) > 0 ? "   <font color=\"#FF9A3A\">" + KEYS.Get("io_t3t_tdui_drummed", { "v1": Math.round(Number(info.drumDmg) * 100) }) + "</font>" : "";
            let rank: TextField = IoTdUi.label("", 11, IoTdUi.GOLD, true, (w - 20) | 0, TextFormatAlign.LEFT);
            rank.htmlText = "<font color=\"#FFE680\">" + stars + "</font>  " + KEYS.Get("io_t3t_tdui_rank", { "v1": r }) + (t._type == IoTd2.DRUM || t._type == IoTd2.SHRINE ? "" : "  " + (next ? KEYS.Get("io_t3t_tdui_rank_kills", { "v1": Math.floor(Number(info.kills || 0)), "v2": next }) : KEYS.Get("io_t3t_tdui_rank_top"))) + drum;
            rank.x = 12;
            rank.y = 52;
            IoTdUi._panel.addChild(rank);
            y = 74;
        }
        for (const $value of as3.values(paths)) {
            let path: string = as3.str($value);
            let name: TextField = IoTdUi.label(IoTd2.on ? IoTd2.pathName(t._type, path) : KEYS.Get(as3.str(IoTdUi.PATH_NAMES[path])), IoTd2.on ? 11 : 12, path == "special" ? 0xFF9EDB : IoTdUi.TEXT, true, 100, TextFormatAlign.LEFT);
            // (QoL #235: a longer name in another language drawn smaller, clear of the pips)
            GLOBAL.ioFitText(name, 8);
            name.x = 12;
            name.y = y + 7;
            IoTdUi._panel.addChild(name);
            let tier: int = info[path] | 0;
            for (let p: int = 0; p < IoTd.TIERS; p++) {
                let pip: Shape = new Shape();
                pip.graphics.lineStyle(1, IoTdUi.EDGE, 1);
                pip.graphics.beginFill((p < tier ? IoTdUi.GOLD : 0x3A2418) >>> 0, 1);
                pip.graphics.drawCircle(0, 0, 6);
                pip.graphics.endFill();
                pip.x = 104 + p * 16;
                pip.y = y + 15;
                IoTdUi._panel.addChild(pip);
            }
            let price: int = IoTd.tierPrice(t, path);
            let up: Sprite = IoTdUi.button(price > 0 ? "+ " + price : KEYS.Get("io_t3t_tdui_max"), 86, 28, IoTdUi.upgradeClick(path), "tdUp:" + path, price > 0);
            up.x = w - 98;
            up.y = y;
            IoTdUi.enable(up, price > 0 && IoTd.gold >= price);
            IoTdUi._panel.addChild(up);
            // (QoL #380: pointing at an upgrade shows what it changes, in the stats line: "Damage 54 → 76")
            if (price > 0) {
                up.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                    let after: string = IoTdUi.ioPreview(t, info, path);
                    if (after) {
                        stats.htmlText = "<font color=\"#FFD58A\">" + after + "</font>";
                    }
                });
                up.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                    stats.text = line;
                });
            }
            y += 40;
            if (path == "special") {
                let spNow: string = IoTd2.specialText(t._type, tier > 0 ? tier : 1);
                let sp: TextField = IoTdUi.label((tier > 0 ? spNow : KEYS.Get("io_t3t_tdui_sp_next", { "v1": spNow })) + (tier > 0 && tier < IoTd.TIERS ? "  " + KEYS.Get("io_t3t_tdui_sp_then", { "v1": IoTd2.specialText(t._type, tier + 1).replace(/^.*?(\d+%?).*$/, "$1") }) : ""), 10, 0xFF9EDB, false, (w - 24) | 0, TextFormatAlign.LEFT);
                sp.x = 12;
                sp.y = y - 8;
                IoTdUi._panel.addChild(sp);
                y += 22;
            }
        }
        if (IoTd.hasPriority(t._type)) {
            let aim: TextField = IoTdUi.label(KEYS.Get("io_t3t_tdui_shoots"), 12, IoTdUi.TEXT, true, 70, TextFormatAlign.LEFT);
            GLOBAL.ioFitText(aim, 8);
            aim.x = 12;
            aim.y = y + 6;
            IoTdUi._panel.addChild(aim);
            let ax: int = 76;
            // ([priority, the button's name (English, as tests find it), its words' key])
            for (let pr of as3.values([[IoTd.FIRST, "First", "io_t3t_tdui_aim_first"], [IoTd.STRONG, "Strong", "io_t3t_tdui_aim_strong"], [IoTd.CLOSE, "Close", "io_t3t_tdui_aim_close"]])) {
                let b: Sprite = IoTdUi.button(KEYS.Get(String(pr[2])), 62, 26, IoTdUi.priorityClick(pr[0] | 0), "tdAim:" + pr[1], false);
                b.x = ax;
                b.y = y + 2;
                if (IoTd.priorityOf(t) == (pr[0] | 0)) {
                    IoTdUi.choose(b);
                }
                IoTdUi._panel.addChild(b);
                ax += 66;
            }
            y += 38;
        }
        // (QoL #381: bought since the last wave: all of it back)
        let allBack: boolean = IoTd.sellPrice(t) >= (info.spent | 0) && (info.spent | 0) > 0;
        let sell: Sprite = IoTdUi.button(KEYS.Get(allBack ? "io_t3t_tdui_sell_all" : "io_t3t_tdui_sell_for", { "v1": IoTd.sellPrice(t) }), allBack ? 190 : 140, 30, IoTdUi.sellClick, "tdSell", false);
        sell.x = (w - (allBack ? 190 : 140)) / 2;
        sell.y = y + 6;
        IoTdUi._panel.addChild(sell);
        let note: TextField = IoTdUi.label(KEYS.Get(allBack ? "io_t3t_tdui_note_all" : "io_t3t_tdui_note_lvl"), 10, IoTdUi.DIM, false, (w - 20) | 0, TextFormatAlign.CENTER);
        note.x = 10;
        note.y = y + 42;
        IoTdUi._panel.addChild(note);
    }

    /** A tower's stats line ("Damage 54   Shots/s 1.2   Range 160") as it is, or with one more tier of `path`. */
    private static ioStatLine(t: BFOUNDATION, info: any, path: string = null): string {
        if (IoTd2.isCustom(t._type)) {
            let copy: any = Object.assign({}, info);
            if (path) {
                copy[path] = (copy[path] | 0) + 1;
            }
            return IoTd2.statLine(t, copy);
        }
        let tw: BTOWER = as3.as(t, BTOWER);
        if (!tw) {
            return "";
        }
        if (path) {
            info[path] = (info[path] | 0) + 1;
        }
        let out: string = "";
        try {
            tw.Props();
            let shots: number = Number(tw._rate > 0 ? 40 / tw._rate : 0);
            out = KEYS.Get("io_t3t_tdui_stats", { "v1": GLOBAL.FormatNumber(tw.damageProperty.value | 0), "v2": Math.round(shots * 10) / 10, "v3": tw._range });
        } finally {
            if (path) {
                info[path] = (info[path] | 0) - 1;
                tw.Props();
            }
        }
        return out;
    }

    /**
     * QoL #380: what the next tier of `path` changes: "Damage 54 → 76" (each number that moves), or "" when none of
     * the line's numbers do (a special's own effect is under it).
     */
    public static ioPreview(t: BFOUNDATION, info: any, path: string): string {
        if (!info || !t) {
            return "";
        }
        let before: string = IoTdUi.ioStatLine(t, info);
        let after: string = IoTdUi.ioStatLine(t, info, path);
        let re: RegExp = /([^\d+%]*?)\s*([+]?[\d.,]+%?)/g;
        let a: any[] = [];
        let b: any[] = [];
        let m: any = null;
        while ((m = re.exec(before)) != null) {
            a.push([String(m[1]).replace(/^\s+|\s+$/g, ""), m[2]]);
        }
        re.lastIndex = 0;
        while ((m = re.exec(after)) != null) {
            b.push([String(m[1]).replace(/^\s+|\s+$/g, ""), m[2]]);
        }
        let parts: any[] = [];
        for (let i: int = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i][1] != b[i][1]) {
                parts.push((a[i][0] ? a[i][0] + " " : "") + a[i][1] + " → " + b[i][1]);
            }
        }
        return parts.join("   ");
    }

    private static upgradeClick(path: string): Function {
        return (e: MouseEvent): void => {
            if (IoTdUi._panelTower) {
                IoTd.Upgrade(IoTdUi._panelTower, path);
                if (IoTdUi._panel) {
                    IoTdUi.refreshPanel();
                }
            }
        };
    }

    private static priorityClick(priority: int): Function {
        return (e: MouseEvent): void => {
            if (IoTdUi._panelTower) {
                SOUNDS.Play("click1");
                IoTd.SetPriority(IoTdUi._panelTower, priority);
                IoTdUi.refreshPanel();
            }
        };
    }

    /** Inferno-only (QoL #498): a tower that cost this much gold or more asks before it is sold at a loss. */
    public static readonly IO_SELL_ASK_GOLD: int = 400;

    private static sellClick(e: MouseEvent): void {
        let t: BFOUNDATION = IoTdUi._panelTower;
        if (!t) {
            return;
        }
        IoTdUi.ioAskSell(t);
    }

    /** A tower sold, asked first when it is upgraded or dear (QoL #498). */
    private static ioAskSell(t: BFOUNDATION): void {
        // (QoL #498: an upgraded tower asks first; its upgrades are sold with it at a loss; and (15 October) any tower
        // that cost IO_SELL_ASK_GOLD or more, sold at a loss)
        let info: any = IoTd.towerInfo(t);
        let upgraded: boolean = info && (info.spent | 0) > IoTd.priceOf(t._type);
        let dear: boolean = GLOBAL.INFERNO_ONLY && info && (info.spent | 0) >= IoTdUi.IO_SELL_ASK_GOLD && IoTd.sellPrice(t) < (info.spent | 0);
        if (upgraded || dear) {
            let what: string = IoTd2.nameOf(t._type);
            let shown: int = IoTd.sellPrice(t);
            let ask: string = upgraded ? KEYS.Get("io_td_sell_ask", { "v1": what, "v2": GLOBAL.FormatNumber(shown) }) : KEYS.Get("io_arc2_td_sell_dear", { "v1": what, "v2": GLOBAL.FormatNumber(shown), "v3": GLOBAL.FormatNumber(info.spent | 0) });
            GLOBAL.ioDanger(ask, KEYS.Get("io_td_sell"), (): void => {
                // (18 October, SUSPECTED-BUGS.md: a wave begun while asking lowered the price, and it sold for less
                // than the question said) asked again at the new price
                if (IoTd.sellPrice(t) < shown) {
                    IoTdUi.ioAskSell(t);
                    return;
                }
                if (IoTdUi._panelTower == t) {
                    IoTdUi.ClosePanel();
                }
                IoTd.Sell(t);
            });
            return;
        }
        IoTdUi.ClosePanel();
        IoTd.Sell(t);
    }

    /**
     * Inferno-only (QoL #378): Hellgate's keys (IoHotkeys): Space starts the wave, F changes the speed, P pauses (solo),
     * Q W E R upgrade the chosen tower's paths, S sells it, Tab chooses the next tower. False for a key that isn't one.
     */
    public static ioKey(k: int): boolean {
        if (!IoTd.on || !IoTdUi._root || IoTdUi._overlay && IoTdUi._overlay.parent) {
            return false;
        }
        let paths: any[] = IoTd.paths;
        let up: int = [81, 87, 69, 82].indexOf(k);
        if (up >= 0) {
            if (IoTdUi._panelTower && up < paths.length) {
                IoTdUi.upgradeClick(String(paths[up]))(null);
            }
            return true;
        }
        switch (k) {
            case 32:
                IoTd.StartWave(new MouseEvent(MouseEvent.CLICK));
                return true;
            case 70:
                IoTdUi.fastClick();
                return true;
            case 80: {
                let pause: Sprite = as3.as(IoTdUi._buttons.pause, Sprite);
                if (pause && pause.visible && pause.mouseEnabled) {
                    IoTdUi.pauseClick();
                }
                return true;
            }
            case 83:
                IoTdUi.sellClick(null);
                return true;
            case 9:
                IoTdUi.ioNextTower();
                return true;
        }
        return false;
    }

    /** Tab: the next tower (left to right, then top to bottom) in the panel. */
    public static ioNextTower(): void {
        let list: any[] = [];
        for (let k of (IoTd.towers ? IoTd.towers.keys() : [])) {
            let b: any = k;
            if (b && b.health > 0 && b._mc) {
                list.push(b);
            }
        }
        if (!list.length) {
            return;
        }
        list.sort((a: any, b: any): number => a._mc.x - b._mc.x || a._mc.y - b._mc.y);
        let at: int = list.indexOf(IoTdUi._panelTower);
        IoTdUi.TowerPanel(as3.as(list[(at + 1) % list.length], BFOUNDATION));
    }

    // ---- messages
    /** The big words in the middle: "Wave 10: Drull!". */
    public static Banner(text: string, colour: uint, sub: string = null): void {
        let b: Sprite = null;
        if (!IoTdUi._root) {
            return;
        }
        let s: any = GLOBAL._SCREEN;
        b = new Sprite();
        b.mouseEnabled = b.mouseChildren = false;
        let t: TextField = IoTdUi.label(text, 34, colour, true, 900, TextFormatAlign.CENTER);
        t.filters = [new GlowFilter(0x000000, 1, 8, 8, 6), new DropShadowFilter(3, 45, 0, 0.8, 4, 4)];
        b.addChild(t);
        if (sub) {
            let t2: TextField = IoTdUi.label(sub, 16, IoTdUi.TEXT, true, 900, TextFormatAlign.CENTER);
            t2.filters = [new GlowFilter(0x000000, 1, 6, 6, 6)];
            t2.y = 48;
            b.addChild(t2);
        }
        b.x = (s.x + s.width / 2 - 450) | 0;
        b.y = (s.y + s.height * 0.32) | 0;
        IoTdUi._root.addChild(b);
        b.alpha = 0;
        TweenLite.to(b, 0.25, { "alpha": 1 });
        TweenLite.to(b, 0.6, { "alpha": 0, "y": b.y - 30, "delay": 2.4, "overwrite": false, "onComplete": (): void => {
            if (b.parent) {
                b.parent.removeChild(b);
            }
        } });
    }

    /** A short line above the shop. */
    public static Toast(text: string, seconds: number = 2.5): void {
        if (!IoTdUi._toast) {
            return;
        }
        IoTdUi._toast.htmlText = "<b>" + text + "</b>";
        IoTdUi._toast.alpha = text ? 1 : 0;
        TweenLite.killTweensOf(IoTdUi._toast);
        if (text) {
            TweenLite.to(IoTdUi._toast, 0.5, { "alpha": 0, "delay": seconds });
        }
    }

    /** Gold (or lives) floating up off a spot in the yard. */
    public static Float(text: string, at: Point, colour: uint): void {
        let t: TextField = null;
        if (!IoTdUi._root || IoTdUi._floats > 24 || !at || !MAP._BUILDINGTOPS || !MAP._BUILDINGTOPS.stage) {
            return;
        }
        let p: Point = IoTdUi._root.globalToLocal(MAP._BUILDINGTOPS.localToGlobal(new Point(at.x, at.y - 20)));
        t = IoTdUi.label(text, 13, colour, true, 80, TextFormatAlign.CENTER);
        t.filters = [new GlowFilter(0, 1, 3, 3, 6)];
        t.mouseEnabled = false;
        t.x = (p.x - 40) | 0;
        t.y = (p.y - 10) | 0;
        IoTdUi._root.addChildAt(t, 0);
        IoTdUi._floats++;
        TweenLite.to(t, 1.1, { "y": t.y - 34, "alpha": 0, "onComplete": (): void => {
            IoTdUi._floats--;
            if (t.parent) {
                t.parent.removeChild(t);
            }
        } });
    }

    // ---- the start, help and end screens
    public static closeOverlay(e: MouseEvent = null): void {
        if (IoTdUi._overlay && IoTdUi._overlay.parent) {
            IoTdUi._overlay.parent.removeChild(IoTdUi._overlay);
        }
        IoTdUi._overlay = null;
    }

    /** A window in the middle of the screen, the screen dimmed behind it. */
    public static overlay(w: int, h: int, name: string): Sprite {
        IoTdUi.closeOverlay();
        let s: any = GLOBAL._SCREEN;
        IoTdUi._overlay = new Sprite();
        IoTdUi._overlay.name = name;
        IoTdUi._overlay.graphics.beginFill(0, 0.45);
        IoTdUi._overlay.graphics.drawRect(Number(s.x), Number(s.y), Number(s.width), Number(s.height));
        IoTdUi._overlay.graphics.endFill();
        let box: Sprite = new Sprite();
        IoTdUi.panel(box, w, h);
        // (a window: the kit's forged rim, 11 October)
        IoKit.rim(box, "tdRim", 0, 0, w, h);
        box.x = (s.x + (s.width - w) / 2) | 0;
        box.y = (s.y + (s.height - h) / 2) | 0;
        IoTdUi._overlay.addChild(box);
        GLOBAL._layerTop.addChild(IoTdUi._overlay);
        return box;
    }

    public static heading(box: Sprite, text: string, w: int): void {
        let t: TextField = IoTdUi.label(text, 22, IoTdUi.GOLD, true, w, TextFormatAlign.CENTER);
        t.filters = [new GlowFilter(0x000000, 1, 4, 4, 4)];
        t.y = 14;
        box.addChild(t);
    }

    public static body(box: Sprite, html: string, y: int, w: int, h: int): TextField {
        let t: TextField = IoTdUi.label("", 13, IoTdUi.TEXT, false, (w - 48) | 0, TextFormatAlign.LEFT);
        t.height = h;
        t.htmlText = html;
        t.x = 24;
        t.y = y;
        box.addChild(t);
        return t;
    }

    /** The button's window: what it is, the player's best, Play. */
    public static Intro(best: any, play: Function): void {
        let w: int = 560;
        let box: Sprite = IoTdUi.overlay(w, 470, "tdIntro");
        IoTdUi.heading(box, "Hellgate Defense", w);
        let b: any = best || {};
        let rules: TextField = IoTdUi.body(box, IoTdUi.RULES + "<br><br><font color=\"#FFD24A\"><b>" + KEYS.Get("io_t3t_tdui_best", { "v1": (b.best_wave | 0) > 0 ? KEYS.Get("io_t3t_tdui_best_waves", { "v1": b.best_wave | 0 }) : KEYS.Get("io_t3t_tdui_best_none") }) + "</b>" + ((b.runs | 0) > 0 ? " " + KEYS.Get((b.runs | 0) == 1 ? "io_t3t_tdui_runs_one" : "io_t3t_tdui_runs_n", { "v1": b.runs | 0 }) : "") + "</font>", 52, w, 340);
        // (QoL #235: a longer language's rules drawn a little smaller to fit)
        GLOBAL.ioFitHeight(rules, 10);
        let go: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_play"), 140, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            play();
        }, "tdPlay", true);
        go.x = w / 2 - 150;
        go.y = 470 - 56;
        box.addChild(go);
        let no: Sprite = IoTdUi.button(KEYS.Get("io_arc2_not_now"), 140, 38, IoTdUi.closeOverlay, "tdNotNow", false);
        no.x = w / 2 + 10;
        no.y = 470 - 56;
        box.addChild(no);
    }

    public static Help(always: boolean): void {
        if (!always && (IoTdUi._helped || IoTd.cleared > 0)) {
            return;
        }
        IoTdUi._helped = true;
        let w: int = 560;
        let box: Sprite = IoTdUi.overlay(w, 476, "tdHelp");
        IoTdUi.heading(box, "Hellgate Defense", w);
        let rules: TextField = IoTdUi.body(box, IoTdUi.RULES + (GLOBAL.INFERNO_ONLY ? IoTdUi.KEYS_LINE : ""), 52, w, 356);
        GLOBAL.ioFitHeight(rules, 10);
        let ok: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_lets_go"), 160, 38, IoTdUi.closeOverlay, "tdHelpOk", true);
        ok.x = (w - 160) / 2;
        ok.y = 476 - 56;
        box.addChild(ok);
    }

    public static GameOver(waves: int, kills: int, r: any): void {
        IoTdUi.ClosePanel();
        let w: int = 460;
        // (QoL #459: not recorded: 40 higher, for Try again over the buttons)
        let retry: boolean = GLOBAL.INFERNO_ONLY && r && r.error && r.ioRetry != null;
        let h: int = retry ? 340 : 300;
        let box: Sprite = IoTdUi.overlay(w, h, "tdOver");
        IoTdUi.heading(box, KEYS.Get("io_t3t_tdui_fallen"), w);
        let b: any = r && r.best ? r.best : {};
        let html: string = "<p align=\"center\"><font size=\"18\">" + KEYS.Get(waves == 1 ? "io_t3t_tdui_survived_one" : "io_t3t_tdui_survived_n", { "v1": waves }) + "</font><br><br>" + KEYS.Get("io_t3t_tdui_killed", { "v1": GLOBAL.FormatNumber(kills) }) + "<br>" + (r && r.newBest ? "<font color=\"#7CFF6A\"><b>" + KEYS.Get("io_t3t_tdui_new_best") + "</b></font><br>" : "") + KEYS.Get("io_t3t_tdui_your_best_b", { "v1": b.best_wave | 0 }) + "<br><br>" + (r && r.error ? "<font color=\"#FF8866\">" + r.error + "</font>" : "<font color=\"#A89478\">" + KEYS.Get("io_t3t_tdui_lb_note") + "</font>") + "</p>";
        IoTdUi.body(box, html, 56, w, 170);
        let again: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_play_again"), 132, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.Again();
        }, "tdAgain", true);
        again.x = w / 2 - 210;
        again.y = h - 56;
        box.addChild(again);
        // (QoL #376: back to the Devil's Arcade, not only home)
        let arcade: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_arcade"), 132, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.toArcade("page");
        }, "tdArcade", false);
        arcade.x = w / 2 - 66;
        arcade.y = h - 56;
        box.addChild(arcade);
        let home: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_home"), 132, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.goHome();
        }, "tdHome");
        home.x = w / 2 + 78;
        home.y = h - 56;
        box.addChild(home);
        if (retry) {
            IoTdUi.ioRetryButton(box, (w - 160) / 2, h - 100, r, (r2: any): void => {
                IoTdUi.GameOver(waves, kills, r2);
            });
        }
    }

    /**
     * Inferno-only (QoL #459): an end screen's Try again (ioTd2Retry), for a run whose result wasn't recorded: sends
     * it once more (r.ioRetry), then `shown(answer)` draws the end again with what came.
     */
    public static ioRetryButton(box: Sprite, x: number, y: number, r: any, shown: Function): Sprite {
        let b: Sprite = null;
        b = IoTdUi.button(KEYS.Get("io_arc2_try_again"), 160, 34, (e: MouseEvent): void => {
            IoTdUi.enable(b, false);
            IoTdUi.setButton(b, KEYS.Get("io_arc2_trying"));
            r.ioRetry((r2: any): void => {
                if (!b.parent || !IoTdUi._overlay || !IoTdUi._overlay.contains(b)) {
                    return;
                }
                shown(r2);
            });
        }, "ioTd2Retry");
        b.x = x;
        b.y = y;
        box.addChild(b);
        return b;
    }

    /** A Versus or Co-op run's end (IoTdLink): the match's result, then home. */
    public static LinkedOver(title: string, line: string, colour: uint): void {
        IoTdUi.ClosePanel();
        let w: int = 460;
        let box: Sprite = IoTdUi.overlay(w, 240, "tdLinkedOver");
        IoTdUi.heading(box, title, w);
        IoTdUi.body(box, "<p align=\"center\"><font size=\"16\">" + line + "</font><br><br><font color=\"#A89478\">" + KEYS.Get(IoTdLink.coop ? "io_t3t_tdui_link_coop_note" : "io_t3t_tdui_link_vs_note") + "</font></p>", 60, w, 110);
        // (QoL #376: another match at once, or the arcade, or home)
        let mode: string = IoTdLink.coop ? "coop" : "versus";
        let another: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_another"), 150, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.toArcade(mode);
        }, "tdAnother", false);
        another.x = w / 2 - 216;
        another.y = 240 - 56;
        box.addChild(another);
        let arcade: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_arcade"), 124, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.toArcade("page");
        }, "tdArcade", false);
        arcade.x = w / 2 - 58;
        arcade.y = 240 - 56;
        box.addChild(arcade);
        let home: Sprite = IoTdUi.button(KEYS.Get("io_t3t_tdui_home"), 124, 38, (e: MouseEvent): void => {
            IoTdUi.closeOverlay();
            IoTd.goHome();
        }, "tdHome");
        home.x = w / 2 + 74;
        home.y = 240 - 56;
        box.addChild(home);
    }

    public static texture(g: any, color: uint, alpha: number): void {
        let t: BitmapData = ArcadeArt.picture(IoTdUi.PANEL_ART);
        if (t) {
            g.beginBitmapFill(t, null, true, true);
        } else {
            g.beginFill(color, alpha);
        }
    }

    public static panel(s: Sprite, w: int, h: int): void {
        let draw: Function = (): void => {
            s.graphics.clear();
            // the leather face, and the kit's rim round it (11 October; a plain line until it has loaded)
            let kit: boolean = IoKit.has("panel");
            if (!kit) {
                s.graphics.lineStyle(2, IoTdUi.EDGE, 1);
            }
            IoTdUi.texture(s.graphics, IoTdUi.PANEL, 0.93);
            s.graphics.drawRoundRect(kit ? 2 : 0, kit ? 2 : 0, kit ? w - 4 : w, kit ? h - 4 : h, 14, 14);
            s.graphics.endFill();
            if (kit) {
                IoKit.slice(s.graphics, "panel", 0, 0, w, h);
            }
        };
        draw();
        IoKit.whenLoaded(["panel"], draw);
        s.filters = [new DropShadowFilter(3, 60, 0, 0.6, 6, 6)];
    }

    private static addField(parent: Sprite, x: int, y: int, w: int, size: int, colour: uint, align: string = "left"): TextField {
        let t: TextField = IoTdUi.label("", size, colour, true, w, align);
        t.x = x;
        t.y = y;
        parent.addChild(t);
        return t;
    }

    /** `fit` (QoL #235): a longer translation drawn smaller to stay on its line. */
    private static setText(t: TextField, text: string, fit: boolean = false): void {
        if (t && t.text != text) {
            t.text = text;
            if (fit) {
                GLOBAL.ioFitText(t, 10);
            }
        }
    }

    public static label(text: string, size: int, colour: uint, bold: boolean, width: int, align: string): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.wordWrap = true;
        field.multiline = true;
        field.width = width;
        field.height = size * 2 + 10;
        let format: TextFormat = new TextFormat("Verdana", size, colour, bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    /**
     * `lit` (QoL #235): whether it is one of the molten buttons, said by the caller, as the words may be another
     * language's now; null: told by its English words, as before.
     */
    public static button(text: string, width: int, height: int, onClick: Function, name: string, lit: any = null): Sprite {
        let b: Sprite = null;
        let draw: Function = null;
        let t: TextField = null;
        let over: boolean = false;
        b = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        b.name = name;
        // the kit's buttons (11 October): molten gold for what moves the game on (Play, Start wave, Forge, the
        // upgrades), obsidian for the rest, molten for the chosen one of a row (choose()); the old pale gold box
        // until the pictures have loaded
        let primary: boolean = lit != null ? Boolean(lit) : /^(Play|Let's go|Forge|\+ |Start)/.test(text) || name == "tdStart";
        draw = (): void => {
            b.graphics.clear();
            let lit: boolean = primary || Boolean(b["tdChosen"]);
            let piece: string = (lit ? "btn_molten" : "btn_obsidian") + (over && b.mouseEnabled ? "_h" : "");
            if (IoKit.slice(b.graphics, piece, 0, 0, width, height)) {
                if (t) {
                    t.textColor = (lit ? 0xFFFFFF : 0xFFE0B0) >>> 0;
                    t.filters = lit ? [new GlowFilter(0x4A0A02, 1, 3, 3, 5, 1)] : [];
                }
                return;
            }
            if (t) {
                t.textColor = 2759178;
                t.filters = [];
            }
            b.graphics.lineStyle(1, 5913114, 1);
            b.graphics.beginFill((over && b.mouseEnabled ? 0xFFE9A8 : 0xF2D98C) >>> 0, 1);
            b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
            b.graphics.endFill();
        };
        t = IoTdUi.label(text, 11, 2759178, true, width, TextFormatAlign.CENTER);
        t.name = "label";
        t.wordWrap = false;
        t.height = 19;
        t.y = ((height - 19) / 2) | 0;
        // (QoL #235: a longer translation drawn smaller to fit the button)
        GLOBAL.ioFitText(t, 7);
        b.addChild(t);
        b["tdRedraw"] = draw;
        draw();
        IoKit.whenLoaded(["btn_molten", "btn_molten_h", "btn_obsidian", "btn_obsidian_h"], draw);
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            over = true;
            draw();
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            over = false;
            draw();
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (b.mouseEnabled) {
                onClick(e);
            }
        });
        return b;
    }

    /** Shows a button() as the chosen one of its row (a difficulty, an aim, a shelf). */
    public static choose(b: Sprite, on: boolean = true): void {
        if (!b) {
            return;
        }
        b["tdChosen"] = on;
        if (b["tdRedraw"]) {
            b["tdRedraw"]();
        }
        // (the old look's mark, while the kit's pictures load)
        b.filters = on && !IoKit.has("btn_molten") ? [new GlowFilter(IoTdUi.GOLD, 1, 6, 6, 3)] : [];
    }

    public static setButton(b: Sprite, text: string): void {
        let t: TextField = b ? as3.as(b.getChildByName("label"), TextField) : null;
        if (t && t.text != text) {
            t.text = text;
            // (QoL #235: fitted again: the words' size starts from the button's own)
            GLOBAL.ioFitText(t, 7);
        }
    }

    public static enable(b: Sprite, on: boolean): void {
        if (!b) {
            return;
        }
        b.mouseEnabled = on;
        b.buttonMode = on;
        b.alpha = Number(on ? 1 : 0.45);
    }
}
