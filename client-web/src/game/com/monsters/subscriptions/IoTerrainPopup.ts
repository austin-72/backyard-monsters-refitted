import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable, MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { BASE, BUILDINGS, Button_CLIP, GLOBAL, ImageCache, InventoryManager, IoDave, IoEmotes, IoHfo, IoPets, IoPetsPanel, IoSign, IoSkins, IoTrophies, KEYS, LOGIN, MAP, PLEASEWAIT, POPUPSETTINGS, IoWin, SOUNDS, SPRITES, URLLoaderApi, WORKERS, frame_CLIP, hell_land1_1, hell_land2_1, hell_land3_1, hell_land4_1, hell_land5_1, hell_land6_1, hell_sand1_big, hell_sand2_big, hfo_frozen1, inferno_lava1, io_ashfall_big, io_obsidian_big, io_soulfire_big, isocrater1, isograss1, isorock1, isosand1, UI_TOP, BUILDINGSPOPUP, IoChampionStatue, IoShop, io_sulfur_big, io_magma_big, io_witchfire_big, io_bloodstone_big, io_gilded_big, io_cinder_big, io_amethyst_big, io_hellforge_big } from "@game";

/**
 * Inferno-only (10 October): the D.A.V.E. Club. The button in the resources' column (UI_TOP.ioDaveClub) opens this
 * window, in tabs:
 *
 *  - Ground: every ground the game has (the Inferno's lava, the outposts' and wild yards' grounds, the overworld's
 *    four, and Hell Freezes Over's frozen ground once its last wave is won), a picture of each, and Save. The
 *    server keeps it (terrain/set; services/yard/terrain.ts) and sends it with the yard's every load
 *    (io_terrain), so anyone who visits or attacks the yard sees it; BASE.Build lays it.
 *  - Chat name: the colour of the player's name in chat (dave/set; services/yard/dave.ts, IoDave).
 *  - Workers: the Inferno's imps or the overworld's builders, in all the player's yards, for everyone.
 *  - Champions: Korath and Drull frozen (once Hell Freezes Over's last wave is won), at home and in attacks; and
 *    (14 October) five skins for each of the five champions, bought for Shiny (dave/buy; IoSkins).
 *  - Emotes (14 October): the chat's emotes, free (IoEmotes; sent from the chat bar's button).
 *  - Decorations (23 October; Signs and Trophies were tabs of their own): the free Sign (IoSign), the Champion Statue
 *    (IoChampionStatue: its champion and level) and the event trophies, won or not, how to win the rest, and Place in
 *    yard (QoL #133: IoTrophies).
 *  - Pets (QoL #135): the Buildings menu's Pets cards here too (IoPetsPanel), with Swap.
 *
 * (QoL #137) In the player's own main yard a ground clicked is laid at once in the yard behind the window (its dark
 * screen made lighter on this tab), and the yard's own is put back if the window closes without Save. (QoL #592) While
 * the curse's ice covers the yard (IoHfo.frozenGround) nothing is shown, and the window says the new ground comes once
 * the curse breaks. (QoL #138) A skin not bought yet opens a preview first: the champion in it, walking and turning,
 * with Buy.
 */
export class IoTerrainPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _tiles: null, _chosen: null, _tab: "ground", _body: null, _tabs: null, _w: 0, _h: 0, _top: 0, _blocker: null, _blockerAlpha: 1, _was: null, _previewing: false, _skinPreview: null });
    }

    /** The grounds, in the window's order: [id, name, picture class] (a getter: the picture classes load later). */
    public static get TERRAINS(): any[] {
        return IoTerrainPopup._terrains || (IoTerrainPopup._terrains = [
        ["lava", "Lava Fields", inferno_lava1],
        ["hell_land1", "Ember Crust", hell_land1_1],
        ["hell_land2", "Netherrack", hell_land2_1],
        ["hell_land3", "Molten Veins", hell_land3_1],
        ["hell_land4", "Burning Rift", hell_land4_1],
        ["hell_land5", "Black Rock", hell_land5_1],
        ["hell_land6", "Cracked Basalt", hell_land6_1],
        ["hell_sand1", "Bone Field", hell_sand1_big],
        ["hell_sand2", "Bone Wastes", hell_sand2_big],
        ["grass", "Grass", isograss1],
        ["rock", "Rocky Grass", isorock1],
        ["sand", "Sand", isosand1],
        ["crater", "Crater", isocrater1],
        ["hfo_frozen", "Frozen Hell", hfo_frozen1],
        // (12 October) opened by inviting friends: 1, 2 and 3 who joined through the player's link
        ["io_ashfall", "Ashfall", io_ashfall_big],
        ["io_obsidian", "Obsidian Glass", io_obsidian_big],
        ["io_soulfire", "Soulfire Rift", io_soulfire_big],
        // (27 November, 72's suggestion) opened by holding 50, 100, 250, 500 and 1000 outposts
        ["io_sulfur", "Sulfur Springs", io_sulfur_big],
        ["io_magma", "Magma Sea", io_magma_big],
        ["io_witchfire", "Witchfire Marsh", io_witchfire_big],
        ["io_bloodstone", "Bloodstone", io_bloodstone_big],
        ["io_gilded", "Gilded Inferno", io_gilded_big],
        // (27 November, 72's suggestion) opened by reaching level 30, 40 and 50
        ["io_cinder", "Cinder Steppe", io_cinder_big],
        ["io_amethyst", "Amethyst Hollow", io_amethyst_big],
        ["io_hellforge", "Hellforge", io_hellforge_big]]);
    }

    private static _terrains: any[] = null;

    /** QoL #235: a ground's name in the player's language ("io_t3m_dc_t_<id>"), else the English one in TERRAINS. */
    public static terrainName(row: any[]): string {
        let key: string = "io_t3m_dc_t_" + String(row[0]);
        let said: string = KEYS.Get(key);
        return said && said != key ? said : String(row[1]);
    }

    private static readonly COLS: int = 5;

    private static readonly TILE_W: int = 112;

    private static readonly TILE_H: int = 74;

    private static readonly GAP: int = 10;

    /** The invite grounds: how many friends who joined through the player's link each needs (the server's INVITE_UNLOCKS). */
    public static inviteNeed(id: string): int {
        let need: any = IoDave.mine.inviteGrounds;
        if (need && need[id]) {
            return need[id] | 0;
        }
        return (id == "io_ashfall" ? 1 : (id == "io_obsidian" ? 2 : (id == "io_soulfire" ? 3 : 0))) | 0;
    }

    /** (27 November, 72's suggestion) The outpost grounds: how many outposts each needs (the server's OUTPOST_GROUNDS). */
    public static readonly OUTPOST_GROUNDS: any = { "io_sulfur": 50, "io_magma": 100, "io_witchfire": 250, "io_bloodstone": 500, "io_gilded": 1000 };

    public static outpostNeed(id: string): int {
        return (IoTerrainPopup.OUTPOST_GROUNDS[id] | 0) as int;
    }

    /** (27 November, 72's suggestion) The level grounds: the level each needs (the server's LEVEL_GROUNDS). */
    public static readonly LEVEL_GROUNDS: any = { "io_cinder": 30, "io_amethyst": 40, "io_hellforge": 50 };

    public static levelNeed(id: string): int {
        return (IoTerrainPopup.LEVEL_GROUNDS[id] | 0) as int;
    }

    /** The ground chosen for the loaded main yard (io_terrain), or null: its own. */
    public static chosen: string = null;

    /** The grounds the player may choose (io_terrains: the frozen one once Hell Freezes Over's last wave is won). */
    public static allowed: any[] = null;

    private static _open: IoTerrainPopup = null;

    private _mc: MovieClip;
    private _tiles: any[];
    private _chosen: string;
    private _tab: string;
    private _body: Sprite;
    private _tabs: any[];
    private _w: int;
    private _h: int;
    private _top: int;
    /** (QoL #137) The window's dark screen (lighter while a ground is shown behind it). */
    private _blocker: DisplayObject;
    private _blockerAlpha: number;
    /** (QoL #137) The yard's ground when the window opened, put back on close if not saved. */
    private _was: string;
    private _previewing: boolean;
    /** (QoL #138) The skin preview over the Champions tab, while open. */
    private _skinPreview: Sprite;

    /** The tab to open on (the tests use it too). */
    public static openTab: string = "ground";

    // (QoL #235: the captions are keys, read when the tabs are drawn)
    /**
     * 23 October (the user's: "make sure we have things in the correct categories, for example the champion statue
     * better fits in decorations"): Signs and Trophies, two tabs of one thing each, are one, Decorations ("decor"): the
     * Sign, the Champion Statue (its champion and level picked here) and the trophies, the things put in the yard.
     */
    private static readonly TABS: any[] = [["ground", "io_t3m_dc_tab_ground"], ["chat", "io_t3m_dc_tab_chat"], ["workers", "io_t3m_dc_tab_workers"], ["champions", "io_t3m_dc_tab_champions"], ["emotes", "io_t3m_dc_tab_emotes"], ["decor", "io_club2_tab_decor"]];

    /** The tabs shown: (QoL #135, #133) Pets and Trophies after the others. */
    private static get tabList(): any[] {
        if (!GLOBAL.INFERNO_ONLY) {
            return IoTerrainPopup.TABS;
        }
        return IoTerrainPopup.TABS.concat([["pets", KEYS.Get("io_club2_tab_pets")]]);
    }

    /** QoL #476: the window opened on one tab (the Store's Looks tab). */
    public static ShowTab(tab: string): void {
        // (the Signs and Trophies tabs are Decorations since 23 October)
        IoTerrainPopup.openTab = tab == "signs" || tab == "trophies" ? "decor" : tab;
        IoTerrainPopup.Show();
    }

    /** From the yard's load (BASE). */
    public static setData(terrain: any, allowed: any): void {
        IoTerrainPopup.chosen = terrain ? String(terrain) : null;
        IoTerrainPopup.allowed = as3.is(allowed, Array) ? as3.as(allowed, Array) : null;
    }

    /** The ground to lay for a main yard (BASE.Build): the chosen one, if any. */
    public static ground(): string {
        let t: string = IoTerrainPopup.chosen;
        for (let row of as3.values(IoTerrainPopup.TERRAINS)) {
            if (row[0] == t) {
                return t;
            }
        }
        return null;
    }

    public static Show(e: MouseEvent = null): void {
        if (IoTerrainPopup._open && IoTerrainPopup._open._mc && IoTerrainPopup._open._mc.stage) {
            return;
        }
        SOUNDS.Play("click1");
        IoTerrainPopup._open = new IoTerrainPopup();
    }

    public static Hide(): void {
        if (IoTerrainPopup._open) {
            IoTerrainPopup._open.close();
        }
        IoTerrainPopup._open = null;
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string): TextField {
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = width;
        t.height = size + 8;
        let f: TextFormat = new TextFormat("Verdana", size, color, bold);
        f.align = align;
        t.defaultTextFormat = f;
        // (16 October: a line break written into a text ("\\n" in the language files) is one; it showed "of\\nHell")
        t.text = String(text).split("\\n").join("\n");
        return t;
    }

    public $ctor(): void {
        super.$ctor();
        this._tiles = [];
        this._tabs = [];
        this._chosen = IoTerrainPopup.ground() || "lava";
        this._mc = new MovieClip();
        this._mc.name = "ioTerrainPopup";
        let cols: int = IoTerrainPopup.COLS;
        let rows: int = Math.ceil(IoTerrainPopup.TERRAINS.length / cols) | 0;
        let gridW: int = (cols * IoTerrainPopup.TILE_W + (cols - 1) * IoTerrainPopup.GAP) | 0;
        let tileFullH: int = (IoTerrainPopup.TILE_H + 20) | 0;
        let gridH: int = (rows * tileFullH + (rows - 1) * IoTerrainPopup.GAP) | 0;
        let w: int = (gridW + 60) | 0;
        let h: int = (gridH + 230) | 0;
        this._w = w;
        this._h = h;
        let left: int = (-((w * 0.5) | 0)) | 0;
        let top: int = (-((h * 0.5) | 0)) | 0;
        this._top = top;
        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = w;
        frame.height = h;
        frame.x = left;
        frame.y = top;
        frame.Setup(true, as3.bind(this, this.close));
        let title: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        title.selectable = false;
        title.mouseEnabled = false;
        title.embedFonts = true;
        title.antiAliasType = AntiAliasType.NORMAL;
        title.width = w - 60;
        title.height = 34;
        let tf: TextFormat = new TextFormat("Groboldov", 24, 0xFFFFFF);
        tf.align = TextFormatAlign.CENTER;
        title.defaultTextFormat = tf;
        title.text = "D.A.V.E. Club";
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = left + 30;
        title.y = top + 22;
        // the tabs (QoL #135, #133: eight of them, narrower to fit)
        let tabs: any[] = IoTerrainPopup.tabList;
        let tw: int = Math.min(100, ((w - 40 - (tabs.length - 1) * 6) / tabs.length) | 0) | 0;
        let tx: int = (-(((tabs.length * (tw + 6)) - 6) / 2)) | 0;
        for (let t of as3.values(tabs)) {
            let id: string = String(t[0]);
            let b: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
            b.name = "ioDaveTab:" + id;
            b.Setup(String(t[1]).indexOf("io_") == 0 ? KEYS.Get(String(t[1])) : String(t[1]), false, tw, 28);
            b.x = tx;
            b.y = top + 60;
            tx += tw + 6;
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this.showTab(id);
            });
            this._tabs.push({ "id": id, "b": b });
        }
        this._body = new Sprite();
        this._mc.addChild(this._body);
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        // (QoL #137: the screen just added, made lighter while a ground is shown in the yard behind)
        this._blocker = GLOBAL._layerTop.numChildren > 0 ? GLOBAL._layerTop.getChildAt(GLOBAL._layerTop.numChildren - 1) : null;
        this._blockerAlpha = this._blocker ? this._blocker.alpha : 1;
        this._was = MAP.texture;
        this._previewing = false;
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        // (16 October: smaller on a small screen, as the Quest Book is: its title and tabs were above the screen's top)
        IoWin.fit(this._mc, w + 40, h + 40);
        POPUPSETTINGS.ScaleUp(this._mc);
        this.showTab(IoTerrainPopup.openTab == "signs" || IoTerrainPopup.openTab == "trophies" ? "decor" : IoTerrainPopup.openTab || "ground");
        IoTerrainPopup.openTab = "ground";
    }

    private showTab(id: string): void {
        this._tab = id;
        this._skinPreview = null;
        // (QoL #137: the yard shows through on the Ground tab, where a ground clicked is laid in it)
        if (this._blocker) {
            this._blocker.alpha = id == "ground" && IoTerrainPopup.canPreview() ? this._blockerAlpha * 0.3 : this._blockerAlpha;
        }
        for (let t of as3.values(this._tabs)) {
            (t.b as Button_CLIP).Highlight = t.id == id || (t.id == "decor" && (id == "signs" || id == "trophies"));
        }
        while (this._body.numChildren > 0) {
            this._body.removeChildAt(0);
        }
        this._tiles = [];
        if (id == "chat") {
            this.chatTab();
        } else if (id == "workers") {
            this.workersTab();
        } else if (id == "champions") {
            this.championsTab();
        } else if (id == "decor" || id == "signs" || id == "trophies") {
            this._tab = "decor";
            this.decorTab();
        } else if (id == "emotes") {
            this.emotesTab();
        } else if (id == "pets" && GLOBAL.INFERNO_ONLY) {
            this.petsTab();
        } else {
            this.groundTab();
        }
    }

    private intro(text: string): void {
        let line: TextField = as3.as(this._body.addChild(IoTerrainPopup.label(text, 11, 3811866, false, this._w - 60, TextFormatAlign.CENTER)), TextField);
        line.wordWrap = true;
        line.multiline = true;
        line.height = 34;
        // (QoL #235: a longer line in another language drawn smaller to keep to its two lines)
        GLOBAL.ioFitHeight(line);
        line.x = -this._w / 2 + 30;
        line.y = this._top + 98;
    }

    private groundTab(): void {
        let cols: int = IoTerrainPopup.COLS;
        let gridW: int = (cols * IoTerrainPopup.TILE_W + (cols - 1) * IoTerrainPopup.GAP) | 0;
        let tileFullH: int = (IoTerrainPopup.TILE_H + 20) | 0;
        this.intro(KEYS.Get("io_t3m_dc_ground_intro"));
        let gx: int = (-((gridW * 0.5) | 0)) | 0;
        let gy: int = (this._top + 134) | 0;
        let allowed: any[] = IoTerrainPopup.allowed;
        let i: int = 0;
        for (let row of as3.values(IoTerrainPopup.TERRAINS)) {
            let id: string = String(row[0]);
            let open: boolean = !allowed || allowed.indexOf(id) >= 0;
            if ((id == "hfo_frozen" || IoTerrainPopup.inviteNeed(id) > 0 || IoTerrainPopup.outpostNeed(id) > 0 || IoTerrainPopup.levelNeed(id) > 0) && !allowed) {
                open = false;
            }
            let tile: Sprite = this.tile(id, IoTerrainPopup.terrainName(row), row[2], open);
            tile.x = gx + (i % cols) * (IoTerrainPopup.TILE_W + IoTerrainPopup.GAP);
            tile.y = gy + ((i / cols) | 0) * (tileFullH + IoTerrainPopup.GAP);
            this._body.addChild(tile);
            i++;
        }
        this.mark();
        let save: Button_CLIP = as3.as(this._body.addChild(new Button_CLIP()), Button_CLIP);
        save.name = "ioTerrainSave";
        save.Setup(KEYS.Get("btn_save"), false, 140, 36);
        save.Highlight = true;
        save.x = -((save.width * 0.5) | 0);
        save.y = this._top + this._h - 68;
        save.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSave));
        // (QoL #592: the curse's ice hides the ground until it breaks; QoL #137: else a ground clicked shows in the yard)
        let noteText: string = null;
        let cursed: boolean = GLOBAL.INFERNO_ONLY && IoHfo.frozenGround();
        if (cursed) {
            noteText = KEYS.Get("io_club2_ground_curse");
        } else if (IoTerrainPopup.canPreview()) {
            noteText = KEYS.Get("io_club2_ground_preview");
        }
        if (noteText) {
            let note: TextField = as3.as(this._body.addChild(IoTerrainPopup.label(noteText, 10, cursed ? 0x8A1A0A : 0x4A3A28, cursed, ((this._w / 2) - 30 - 84) | 0, TextFormatAlign.LEFT)), TextField);
            note.name = "ioClubGroundNote";
            note.multiline = true;
            note.wordWrap = true;
            note.height = 40;
            note.x = -this._w / 2 + 30;
            note.y = this._top + this._h - 70;
        }
    }

    /** QoL #137: the window is over the player's own main yard, as built, and its ground can be shown in it. */
    private static ownGround(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID) && !GLOBAL.ioDesignMode() && MAP.texture != null;
    }

    /** QoL #137: a ground clicked can be shown in the yard now (not while the curse's ice covers it: QoL #592). */
    public static canPreview(): boolean {
        return IoTerrainPopup.ownGround() && !IoHfo.frozenGround();
    }

    /** QoL #137: a ground laid in the yard behind the window, for a look (put back on close unless saved). */
    private preview(id: string): void {
        if (!IoTerrainPopup.canPreview() || !id || MAP.texture == id) {
            return;
        }
        MAP.swapBG(id);
        this._previewing = true;
    }

    // ---- choices saved at once (dave/set)
    private choose(key: string, value: string, then: Function = null): void {
        PLEASEWAIT.Show(KEYS.Get("radio_bSaving"));
        IoDave.set(key, value, (err: string): void => {
            PLEASEWAIT.Hide();
            if (err) {
                GLOBAL.Message(err);
                return;
            }
            SOUNDS.Play("purchasepopup");
            if (then != null) {
                then();
            }
            if (this._mc) {
                this.showTab(this._tab);
            }
        });
    }

    /** A choice's box: a picture or a sample, a name; framed in gold when chosen; dimmed and locked when not open. */
    private box(x: number, y: number, w: int, h: int, name: string, chosen: boolean, open: boolean, onClick: Function, lockText: string = null): Sprite {
        let b: Sprite = new Sprite();
        b.x = x;
        b.y = y;
        b.graphics.beginFill(0xF4ECDA, 1);
        b.graphics.drawRoundRect(0, 0, w, h, 10, 10);
        b.graphics.endFill();
        b.graphics.lineStyle(chosen ? 4 : 1, chosen ? 0xFFC125 : 0x3A2A18, 1, true);
        b.graphics.drawRoundRect(0, 0, w, h, 10, 10);
        let cap: TextField = IoTerrainPopup.label(name, 10, open ? 2759178 : 0x7A6A58, true, w, TextFormatAlign.CENTER);
        GLOBAL.ioFitText(cap);
        cap.y = h + 3;
        b.addChild(cap);
        if (open) {
            b.buttonMode = true;
            b.mouseChildren = false;
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                onClick();
            });
        } else if (lockText) {
            let lock: TextField = IoTerrainPopup.label(lockText, 9, 0xFFFFFF, true, w, TextFormatAlign.CENTER);
            lock.multiline = true;
            lock.wordWrap = true;
            lock.height = 30;
            lock.y = ((h - 26) / 2) | 0;
            lock.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
            b.addChild(lock);
        }
        this._body.addChild(b);
        return b;
    }

    /** A frame of a sprite sheet drawn into a box (a worker, a champion). */
    private sheetPicture(into: Sprite, url: string, fw: int, fh: int, col: int, row: int, scale: number, w: int, h: int, dim: boolean): void {
        ImageCache.GetImageWithCallBack(url, (key: string, bmd: BitmapData, args: any[] = null): void => {
            if (!bmd || !into.parent) {
                return;
            }
            let f: BitmapData = new BitmapData(fw, fh, true, 0);
            f.copyPixels(bmd, new Rectangle(col * fw, row * fh, fw, fh), new Point(0, 0));
            let bm: Bitmap = new Bitmap(f);
            bm.smoothing = true;
            bm.scaleX = bm.scaleY = scale;
            bm.x = (w - fw * scale) / 2;
            bm.y = (h - fh * scale) / 2;
            if (dim) {
                bm.alpha = 0.35;
            }
            into.addChildAt(bm, 0);
        });
    }

    private chatTab(): void {
        this.intro(KEYS.Get("io_t3m_dc_chat_intro"));
        let me: any = IoDave.mine;
        let colors: any = me.chatColors || {};
        let names: any[] = [null];
        for (let k in colors) {
            names.push(k);
        }
        let cols: int = 4;
        let bw: int = 140;
        let bh: int = 40;
        let gx: number = -((cols * bw + (cols - 1) * 12) / 2);
        let gy: number = this._top + 140;
        let who: string = LOGIN._playerName ? String(LOGIN._playerName) : KEYS.Get("io_t3m_cm_you");
        for (let i: int = 0; i < names.length; i++) {
            let name: string = names[i];
            let hex: string = name ? String(colors[name]) : "#000000";
            let b: Sprite = this.box(gx + (i % cols) * (bw + 12), gy + ((i / cols) | 0) * (bh + 30), bw, bh, name ? name.charAt(0).toUpperCase() + name.substr(1) : KEYS.Get("io_t3m_dc_black"), (me.chatColor || null) == name, true, (): void => {
                this.choose("chatColor", name || "");
            });
            let sample: TextField = new TextField();
            sample.selectable = false;
            sample.mouseEnabled = false;
            sample.width = bw;
            sample.height = 22;
            let f: TextFormat = new TextFormat("Verdana", 12, 0, true);
            f.align = TextFormatAlign.CENTER;
            sample.defaultTextFormat = f;
            sample.htmlText = "<b><font color=\"" + hex + "\">" + who.replace(/</g, "") + "</font>:</b> " + KEYS.Get("io_t3m_dc_hi");
            sample.y = 11;
            b.addChild(sample);
        }
        // (12 October) the name effects, opened by inviting friends: 1, 2 and 3 who joined through the player's link
        let fxs: any[] = as3.is(me.nameFx, Array) ? as3.as(me.nameFx, Array) : [];
        for (let k: int = 0; k < fxs.length; k++) {
            let fx: any = fxs[k];
            let id: string = String(fx.id);
            let spec: string = String(fx.spec);
            let need: int = fx.need | 0;
            // (27 November, 72's suggestion: the looks opened by holding outposts, and by the player's level)
            let needOutposts: int = fx.needOutposts | 0;
            let needLevel: int = fx.needLevel | 0;
            let open: boolean = IoDave.unlocked(need) && (me.outposts | 0) >= needOutposts && (me.level | 0) >= needLevel;
            let lockText: string = need > 0 ? IoDave.inviteLock(need) : (needOutposts > 0 ? KEYS.Get("io_t3m_dc_outpost_lock", { "v1": GLOBAL.FormatNumber(needOutposts) }) : KEYS.Get("io_t3m_dc_level_lock", { "v1": needLevel }));
            let at: int = (names.length + k) | 0;
            let fb: Sprite = this.box(gx + (at % cols) * (bw + 12), gy + ((at / cols) | 0) * (bh + 30), bw, bh, String(fx.name) + (open ? "" : KEYS.Get("io_t3m_dc_locked")), (me.chatColor || null) == id, open, (): void => {
                this.choose("chatColor", id);
            }, open ? null : lockText);
            fb.name = "ioDaveFx:" + id;
            let sample2: TextField = new TextField();
            sample2.selectable = false;
            sample2.mouseEnabled = false;
            sample2.width = bw;
            sample2.height = 22;
            let f2: TextFormat = new TextFormat("Verdana", 12, 0, true);
            f2.align = TextFormatAlign.CENTER;
            sample2.defaultTextFormat = f2;
            let plainWho: string = who.replace(/</g, "");
            sample2.htmlText = "<b>" + IoDave.fxHtml(spec, plainWho) + ":</b> " + KEYS.Get("io_t3m_dc_hi");
            sample2.y = 11;
            if (!open && need > 0) {
                sample2.alpha = 0.3;
                // (locked: a click shows the invite)
                fb.buttonMode = true;
                fb.mouseChildren = false;
                fb.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    SOUNDS.Play("click1");
                    this.close();
                    UI_TOP.ioShowInvite();
                });
            } else if (!open) {
                sample2.alpha = 0.3;
            }
            fb.addChildAt(sample2, 0);
            if (IoDave.fxMoves(spec)) {
                let last: int = 0;
                let tick: Function = null;
                tick = (e: Event): void => {
                    // (13 October) the tab changed or the popup closed: this sample stops (in this player every
                    // frame listener runs, on the stage or not, so it went on for the rest of the session)
                    if (!sample2.stage && last > 0) {
                        sample2.removeEventListener(Event.ENTER_FRAME, tick);
                        return;
                    }
                    let now: int = getTimer();
                    if (now - last >= 60) {
                        last = now;
                        sample2.htmlText = "<b>" + IoDave.fxHtml(spec, plainWho, now) + ":</b> " + KEYS.Get("io_t3m_dc_hi");
                    }
                };
                sample2.addEventListener(Event.ENTER_FRAME, tick);
            }
        }
    }

    private workersTab(): void {
        this.intro(KEYS.Get("io_t3m_dc_workers_intro"));
        let me: any = IoDave.mine;
        let skin: string = me.workerSkin == "overworld" || me.workerSkin == "frog" || me.workerSkin == "frog_red" ? String(me.workerSkin) : "inferno";
        // (27 November, 72's suggestion: two frogs, green and red, that hop all around: four looks in a row)
        let bw: int = 140;
        let bh: int = 150;
        let rows: any[] = [["inferno", KEYS.Get("io_t3m_dc_w_imps"), "monsters/inferno_worker.v2.png", 64, 55, 2.0, 0, 3], ["overworld", KEYS.Get("io_t3m_dc_w_builders"), "monsters/worker.png", 27, 27, 4.0, 1, 3], ["frog", KEYS.Get("io_t3m_dc_w_frog"), "monsters/io_frog.png", 64, 55, 2.0, 0, 5], ["frog_red", KEYS.Get("io_t3m_dc_w_frog_red"), "monsters/io_frog_red.png", 64, 55, 2.0, 0, 5]];
        // (the builders' second row wears the yellow hard hat)
        for (let i: int = 0; i < rows.length; i++) {
            let r: any[] = rows[i];
            let id: string = String(r[0]);
            let b: Sprite = this.box(-((rows.length * bw + (rows.length - 1) * 12) / 2) + i * (bw + 12), this._top + 150, bw, bh, String(r[1]), skin == id, true, (): void => {
                this.choose("workerSkin", id, (): void => {
                    IoDave.setYard({ "workerSkin": id, "champSkins": IoDave.mine.champSkins });
                    SPRITES.ioWorkerSprite();
                    for (let wk of as3.values(WORKERS._workers || [])) {
                        if (wk && wk.mc) {
                            try {
                                wk.mc.ioReskin();
                            } catch (e) {
                            }
                        }
                    }
                });
            });
            b.name = "ioDaveWorker:" + id;
            this.sheetPicture(b, String(r[2]), r[3] | 0, r[4] | 0, r[7] | 0, r[6] | 0, Number(r[5]), bw, bh, false);
        }
    }

    /** The champion the Champions tab shows (14 October: five, each with its skins). */
    private static _champ: string = "IC9";

    /**
     * Champions (14 October, the user's): pick a champion, then its look: its own, frozen (Korath and Drull, from
     * Hell Freezes Over) or one of five skins bought for Shiny (IoSkins; each champion's separately, theirs for
     * good). Theirs at home, in their attacks and to visitors, from the champion's next time out.
     */
    private championsTab(): void {
        let me: any = IoDave.mine;
        let skins: any = me.champSkins || {};
        let price: int = (me.skinPrice | 0) || 400;
        // (26 October: each skin its own price, 200 to 600: the server's skinPrices)
        let prices: any = me.skinPrices || {};
        let priceOf = (look: string): int => (prices[look] | 0) || price;
        let lo: int = price, hi: int = price;
        for (let k of IoSkins.LIST) {
            lo = Math.min(lo, priceOf(String(k[0]))) | 0;
            hi = Math.max(hi, priceOf(String(k[0]))) | 0;
        }
        this.intro(KEYS.Get("io_t3m_dc_champs_intro", { "v1": lo == hi ? GLOBAL.FormatNumber(lo) : GLOBAL.FormatNumber(lo) + "-" + GLOBAL.FormatNumber(hi) }));
        // the champions
        let champs: any[] = IoSkins.CHAMPIONS;
        let cw: int = 112;
        let cx: int = (-((champs.length * (cw + 6) - 6) / 2)) | 0;
        for (let c of champs) {
            let cid: string = String(c[0]);
            let b: Button_CLIP = as3.as(this._body.addChild(new Button_CLIP()), Button_CLIP);
            b.name = "ioDaveChamp:" + cid;
            b.Setup(String(c[1]), false, cw, 26);
            b.x = cx;
            b.y = this._top + 134;
            b.Highlight = cid == IoTerrainPopup._champ;
            cx += cw + 6;
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                IoTerrainPopup._champ = cid;
                this.showTab("champions");
            });
        }
        let row: any[] = null;
        for (let c of champs) {
            if (c[0] == IoTerrainPopup._champ) {
                row = c;
            }
        }
        if (!row) {
            row = champs[0];
        }
        let id: string = String(row[0]);
        let name: string = String(row[1]);
        let now: string = skins[id] ? String(skins[id]) : "";
        // its looks: its own, frozen (Korath and Drull), the five skins
        let looks: any[] = [["", name]];
        if (id == "IC9" || id == "IC10") {
            looks.push(["frozen", KEYS.Get("io_t3m_dc_frozen_look", { "v1": name })]);
        }
        for (let k of IoSkins.LIST) {
            looks.push([String(k[0]), KEYS.Get("io_t3m_dc_skin_look", { "v1": IoSkins.nameOf(String(k[0])), "v2": name })]);
        }
        // (26 October: up to eleven looks: six a row, smaller, in two rows)
        let many: boolean = looks.length > 8;
        let bw: int = many ? 92 : 140;
        let bh: int = many ? 118 : 150;
        let perRow: int = many ? 6 : 4;
        let gap: int = many ? 10 : 14;
        let frozenOpen: boolean = Boolean(me.frozenUnlocked);
        for (let i: int = 0; i < looks.length; i++) {
            let look: string = String(looks[i][0]);
            let inRow: int = Math.min(perRow, looks.length - ((i / perRow) | 0) * perRow) | 0;
            let x: number = -((inRow * (bw + gap) - gap) / 2) + (i % perRow) * (bw + gap);
            let y: number = this._top + 176 + ((i / perRow) | 0) * (bh + 34);
            let shiny: boolean = IoSkins.has(look);
            let owned: boolean = !shiny || IoDave.owns(id, look);
            let open: boolean = look == "frozen" ? frozenOpen : true;
            let lookName: string = String(looks[i][1]);
            let cost: int = priceOf(look);
            let box: Sprite = this.box(x, y, bw, bh, String(looks[i][1]), now == look, open, (): void => {
                if (owned) {
                    this.choose("champSkin." + id, look);
                    return;
                }
                // (QoL #138: a look at it first, moving, with Buy)
                if (GLOBAL.INFERNO_ONLY) {
                    this.skinPreview(row, look, lookName, cost);
                    return;
                }
                GLOBAL.Message(KEYS.Get("io_t3m_dc_spend_skin", { "v1": GLOBAL.FormatNumber(cost), "v2": IoSkins.nameOf(look), "v3": name }), KEYS.Get("btn_yes"), (): void => {
                    this.buy("champSkin." + id, look);
                }, null, KEYS.Get("btn_no"), (): void => {
                });
            }, look == "frozen" ? KEYS.Get("io_t3m_dc_hfo_lock") : null);
            box.name = "ioDaveSkin:" + id + ":" + (look || "own");
            if (shiny && !owned) {
                let tag: TextField = IoTerrainPopup.label(GLOBAL.FormatNumber(cost) + " Shiny", 10, 0xFFFFFF, true, bw - 16, TextFormatAlign.CENTER);
                tag.background = true;
                // (the dearest, Solid Gold, on gold)
                tag.backgroundColor = cost > price ? 0x9A7410 : 0x7A3A10;
                tag.height = 16;
                tag.x = 8;
                tag.y = bh - 22;
                box.addChild(tag);
            }
            this.championPicture(box, row, look, bw, bh, !open);
        }
    }

    /** A champion's picture in a look (its sheet, frozen or in a skin), in a box. */
    private championPicture(into: Sprite, row: any[], look: string, w: int, h: int, dim: boolean): void {
        let url: string = String(row[2]);
        if (look == "frozen") {
            url = url.replace(".png", ".frozen.png");
        } else if (IoSkins.has(look)) {
            url = IoSkins.key(url, look);
        }
        let fw: int = row[3] | 0, fh: int = row[4] | 0;
        // (on a dark ground, as in the yard; the figure cut from its frame and made as big as the box takes)
        let ground: Sprite = new Sprite();
        ground.graphics.beginFill(0x2A1D16, 1);
        ground.graphics.drawRoundRect(5, 5, w - 10, h - 10, 8, 8);
        ground.graphics.endFill();
        ground.mouseEnabled = false;
        into.addChildAt(ground, 0);
        if (row[0] == "IC32") {
            this.basiliskPicture(into, url, w, h, dim);
            return;
        }
        ImageCache.GetImageWithCallBack(url, (key: string, bmd: BitmapData, args: any[] = null): void => {
            if (!bmd || !into.parent) {
                return;
            }
            let f: BitmapData = new BitmapData(fw, fh, true, 0);
            f.copyPixels(bmd, new Rectangle(2 * fw, 0, fw, fh), new Point(0, 0));
            let r: Rectangle = f.getColorBoundsRect(0xFF000000, 0, false);
            if (r.width < 2 || r.height < 2) {
                r = f.rect;
            }
            let scale: number = Math.min(3.2, (w - 20) / r.width, (h - 34) / r.height);
            // (only the figure: a picture bigger than the box would take the clicks around it)
            let cut: BitmapData = new BitmapData(r.width, r.height, true, 0);
            cut.copyPixels(f, r, new Point(0, 0));
            let bm: Bitmap = new Bitmap(cut);
            bm.smoothing = true;
            bm.scaleX = bm.scaleY = scale;
            bm.x = (w - r.width * scale) / 2;
            bm.y = (h - 26 - r.height * scale) / 2 + 4;
            if (dim) {
                bm.alpha = 0.35;
            }
            into.addChildAt(bm, 1);
        });
    }

    /** The Basilisk's picture: his sheet is beads and heads (Basilisk), so a coil of them, his head on top. */
    private basiliskPicture(into: Sprite, url: string, w: int, h: int, dim: boolean): void {
        ImageCache.GetImageWithCallBack(url, (key: string, bmd: BitmapData, args: any[] = null): void => {
            if (!bmd || !into.parent) {
                return;
            }
            const C: int = 96;
            let pic: BitmapData = new BitmapData(w, h, true, 0);
            let bead = (col: int, rowN: int, x: number, y: number, s: number): void => {
                let m: Matrix = new Matrix();
                m.translate(-col * C, -rowN * C);
                m.scale(s, s);
                m.translate(x - C * s / 2, y - C * s / 2);
                pic.draw(bmd, m, null, null, new Rectangle(x - C * s / 2, y - C * s / 2, C * s, C * s), true);
            };
            // a coil, 2.4 turns rising: its beads close together (red, with black bands), the back of every turn
            // first, then the fronts from the bottom up; his head on top, looking out
            let n: int = 120;
            let cx: number = w / 2, cy: number = h * 0.62;
            let pass = (front: boolean): void => {
                for (let i: int = 0; i < n; i++) {
                    let t: number = i / (n - 1);
                    let a: number = t * Math.PI * 2 * 2.4;
                    if ((Math.sin(a) > 0) != front) {
                        continue;
                    }
                    let rr: number = 38 - t * 20;
                    let x: number = cx + Math.cos(a) * rr;
                    let y: number = cy + Math.sin(a) * rr * 0.45 - t * 30;
                    // (the bead's picture turned along the coil: its heading is the tangent)
                    let heading: number = Math.atan2(Math.cos(a) * 0.45, -Math.sin(a));
                    let col: int = (Math.round((heading / (Math.PI * 2)) * 16) % 16 + 16) % 16;
                    bead(col, ((i / 6) | 0) % 3 == 2 ? 1 : 0, x, y, 0.55);
                }
            };
            pass(false);
            pass(true);
            bead(12, 2, cx + 18 * Math.cos(Math.PI * 2 * 2.4), cy - 38, 0.8);
            let bm: Bitmap = new Bitmap(pic);
            bm.smoothing = true;
            if (dim) {
                bm.alpha = 0.35;
            }
            into.addChildAt(bm, 1);
        });
    }

    /** QoL #138: a champion's walk in its sheet: [first row, rows] (as the game walks it; SPRITES, IoRimegrave). */
    private static walkRows(id: string): any[] {
        if (id == "IC10") {
            return [1, 7];
        }
        if (id == "IC25") {
            return [1, 8];
        }
        return [0, 10];
    }

    /**
     * QoL #138: a skin not bought yet, shown first: the champion in it, big, walking and turning slowly round (the
     * Basilisk's coil gently swaying), its name and line, Buy (asks first, as before) and Close. Over the Champions
     * tab; a click beside it closes it too.
     */
    private skinPreview(row: any[], look: string, title: string, price: int): void {
        if (this._skinPreview && this._skinPreview.parent) {
            this._skinPreview.parent.removeChild(this._skinPreview);
        }
        let id: string = String(row[0]);
        let champ: string = String(row[1]);
        let pv: Sprite = new Sprite();
        pv.name = "ioClubSkinPreview";
        this._skinPreview = pv;
        // (a screen over the rest of the tab: a click on it closes the preview)
        let shade: Sprite = new Sprite();
        shade.graphics.beginFill(0x000000, 0.35);
        shade.graphics.drawRect(-this._w / 2 + 14, this._top + 96, this._w - 28, this._h - 110);
        shade.graphics.endFill();
        shade.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            this.closeSkinPreview();
        });
        pv.addChild(shade);
        const PW: int = 460;
        const PH: int = 380;
        let py: int = (this._top + 160) | 0;
        let panel: Sprite = new Sprite();
        panel.x = -PW / 2;
        panel.y = py;
        panel.graphics.lineStyle(3, 0xFFC125, 1, true);
        panel.graphics.beginFill(0x1C130E, 0.97);
        panel.graphics.drawRoundRect(0, 0, PW, PH, 14, 14);
        panel.graphics.endFill();
        pv.addChild(panel);
        let head: TextField = as3.as(panel.addChild(IoTerrainPopup.label(title, 16, 0xFFD24A, true, PW, TextFormatAlign.CENTER)), TextField);
        head.y = 10;
        let line: string = "";
        for (let k of IoSkins.LIST) {
            if (k[0] == look) {
                line = IoSkins.lineOf(look);
            }
        }
        let sub: TextField = as3.as(panel.addChild(IoTerrainPopup.label(line, 11, 0xE8E0D8, false, PW, TextFormatAlign.CENTER)), TextField);
        sub.y = 36;
        // the stage: the dark ground, the champion on it
        const SW: int = 320;
        const SH: int = 240;
        let stageBox: Sprite = new Sprite();
        stageBox.name = "ioClubSkinStage";
        stageBox.x = (PW - SW) / 2;
        stageBox.y = 60;
        stageBox.graphics.beginFill(0x2A1D16, 1);
        stageBox.graphics.drawRoundRect(0, 0, SW, SH, 10, 10);
        stageBox.graphics.endFill();
        stageBox.graphics.beginFill(0x000000, 0.35);
        stageBox.graphics.drawEllipse(SW / 2 - 70, SH - 62, 140, 30);
        stageBox.graphics.endFill();
        panel.addChild(stageBox);
        let wait: TextField = as3.as(stageBox.addChild(IoTerrainPopup.label(KEYS.Get("io_club2_skin_loading"), 11, 0xB8B0A8, false, SW, TextFormatAlign.CENTER)), TextField);
        wait.y = SH / 2 - 10;
        let url: string = IoSkins.key(String(row[2]), look);
        let fw: int = row[3] | 0, fh: int = row[4] | 0;
        let figure: Sprite = new Sprite();
        stageBox.addChild(figure);
        let sheet: BitmapData = null;
        let canvas: BitmapData = null;
        let walk: any[] = IoTerrainPopup.walkRows(id);
        let rows: int = walk[1] | 0;
        if (id == "IC32") {
            // (the Basilisk: his coil, as in the box, swaying)
            let coil: Sprite = new Sprite();
            // (basiliskPicture puts his picture second, over the box's ground: here an empty first child)
            coil.addChild(new Sprite());
            figure.addChild(coil);
            this.basiliskPicture(coil, url, SW, SH, false);
            sheet = new BitmapData(1, 1, true, 0);
            wait.visible = false;
        } else {
            ImageCache.GetImageWithCallBack(url, (key: string, bmd: BitmapData, args: any[] = null): void => {
                if (!bmd || !pv.parent) {
                    return;
                }
                let first: int = walk[0] | 0;
                let have: int = Math.floor(bmd.height / Math.max(1, fh)) | 0;
                rows = Math.max(1, Math.min(rows, have - first)) | 0;
                canvas = new BitmapData(fw, fh, true, 0);
                let bm: Bitmap = new Bitmap(canvas);
                bm.smoothing = true;
                let scale: number = Math.min(2.4, (SW - 30) / fw, (SH - 20) / fh);
                bm.scaleX = bm.scaleY = scale;
                bm.x = (SW - fw * scale) / 2;
                bm.y = (SH - fh * scale) / 2 - 6;
                figure.addChild(bm);
                sheet = bmd;
                wait.visible = false;
            });
        }
        let frame: int = 0;
        let col: int = 4;
        let steps: int = 0;
        let last: int = 0;
        let tick: Function = null;
        tick = (e: Event): void => {
            // (closed, or the tab changed: stops; every frame listener runs, on the stage or not)
            if (!pv.stage && last > 0) {
                pv.removeEventListener(Event.ENTER_FRAME, tick);
                return;
            }
            let now: int = getTimer();
            if (now - last < 90) {
                return;
            }
            last = now;
            if (!sheet) {
                return;
            }
            if (id == "IC32") {
                figure.y = Math.sin(now / 420) * 5;
                return;
            }
            if (!canvas) {
                return;
            }
            frame = ((frame + 1) % Math.max(1, rows)) | 0;
            // (a sixteenth of a turn every 14 steps of the walk: round in about 20 seconds)
            if (++steps % 14 == 0) {
                col = ((col + 1) % 16) | 0;
            }
            canvas.fillRect(canvas.rect, 0);
            canvas.copyPixels(sheet, new Rectangle(col * fw, ((walk[0] | 0) + frame) * fh, fw, fh), new Point(0, 0));
        };
        pv.addEventListener(Event.ENTER_FRAME, tick);
        let buyB: Button_CLIP = as3.as(panel.addChild(new Button_CLIP()), Button_CLIP);
        buyB.name = "ioClubSkinBuy";
        buyB.Setup(KEYS.Get("io_club2_skin_buy", { "v1": GLOBAL.FormatNumber(price) }), false, 180, 34);
        buyB.Highlight = true;
        buyB.x = PW / 2 - 190;
        buyB.y = PH - 56;
        buyB.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            GLOBAL.Message(KEYS.Get("io_t3m_dc_spend_skin", { "v1": GLOBAL.FormatNumber(price), "v2": IoSkins.nameOf(look), "v3": champ }), KEYS.Get("btn_yes"), (): void => {
                this.closeSkinPreview();
                this.buy("champSkin." + id, look);
            }, null, KEYS.Get("btn_no"), (): void => {
            });
        });
        let closeB: Button_CLIP = as3.as(panel.addChild(new Button_CLIP()), Button_CLIP);
        closeB.name = "ioClubSkinClose";
        closeB.Setup(KEYS.Get("btn_close"), false, 130, 34);
        closeB.x = PW / 2 + 10;
        closeB.y = PH - 56;
        closeB.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.closeSkinPreview();
        });
        this._body.addChild(pv);
    }

    private closeSkinPreview(): void {
        if (this._skinPreview && this._skinPreview.parent) {
            this._skinPreview.parent.removeChild(this._skinPreview);
        }
        this._skinPreview = null;
    }

    /** The page of the Pets tab (QoL #135). */
    private static _petsPage: int = 0;

    /**
     * QoL #135: the Pets tab: the Buildings menu's Pets cards (IoPetsPanel: Buy, Out or Swap, Store, Name), a little
     * smaller, with pages.
     */
    private petsTab(): void {
        this.intro(KEYS.Get("io_club2_pets_intro", { "v1": IoPets.maxOut }));
        let pages: int = Math.max(1, Math.ceil(IoPets.monsters.length / IoPetsPanel.PER_PAGE)) | 0;
        IoTerrainPopup._petsPage = Math.max(0, Math.min(pages - 1, IoTerrainPopup._petsPage)) | 0;
        const SCALE: number = 0.92;
        let holder: MovieClip = new MovieClip();
        holder.name = "ioClubPets";
        holder.scaleX = holder.scaleY = SCALE;
        holder.x = (-((650 * SCALE) / 2)) | 0;
        holder.y = this._top + 140;
        this._body.addChild(holder);
        let refresh: Function = (): void => {
            if (this._mc && this._tab == "pets") {
                this.showTab("pets");
            }
        };
        IoPetsPanel.fill(holder, IoTerrainPopup._petsPage, refresh);
        if (pages > 1 && IoPets.ownYard()) {
            let by: int = (this._top + this._h - 68) | 0;
            let prev: Button_CLIP = as3.as(this._body.addChild(new Button_CLIP()), Button_CLIP);
            prev.name = "ioClubPetsPrev";
            prev.Setup(KEYS.Get("io_club2_prev"), false, 120, 32);
            prev.x = -190;
            prev.y = by;
            prev.Enabled = IoTerrainPopup._petsPage > 0;
            prev.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (IoTerrainPopup._petsPage > 0) {
                    SOUNDS.Play("click1");
                    IoTerrainPopup._petsPage--;
                    this.showTab("pets");
                }
            });
            let pageText: TextField = as3.as(this._body.addChild(IoTerrainPopup.label((IoTerrainPopup._petsPage + 1) + " / " + pages, 12, 0x2A1A08, true, 120, TextFormatAlign.CENTER)), TextField);
            pageText.name = "ioClubPetsPage";
            pageText.x = -60;
            pageText.y = by + 7;
            let next: Button_CLIP = as3.as(this._body.addChild(new Button_CLIP()), Button_CLIP);
            next.name = "ioClubPetsNext";
            next.Setup(KEYS.Get("io_club2_next"), false, 120, 32);
            next.x = 70;
            next.y = by;
            next.Enabled = IoTerrainPopup._petsPage < pages - 1;
            next.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (IoTerrainPopup._petsPage < pages - 1) {
                    SOUNDS.Play("click1");
                    IoTerrainPopup._petsPage++;
                    this.showTab("pets");
                }
            });
        }
    }

    /** The Decorations tab's page (four cards a page). */
    private static _decorPage: int = 0;

    /**
     * 23 October: Decorations, the things put in the yard, a card each: the Sign (free: Build a Sign), the Champion
     * Statue (its champion in bronze: Champion picks which and, for Korath, Drull and Rimegrave, level 4, 5 or 6; Build
     * one opens the build menu's Animated decorations), and (QoL #133) the trophy cabinet: every event trophy, its
     * picture (dim until won), whether it is won (and its level), how to win it, and Place in yard for one won and
     * waiting in storage (the Club closes and it is in hand, as from the build menu: IoTrophies.placeNow). Four a page.
     */
    private decorTab(): void {
        this.intro(KEYS.Get("io_club2_decor_intro"));
        // (the invasion's totems only for a player who may take part in it, or has won one: the invasion is told to
        // nobody else)
        let mayInvade: boolean = Boolean(GLOBAL._flags && GLOBAL._flags.io_fmi);
        let list: any[] = IoTrophies.LIST.filter((t: any): boolean => String(t[0]).indexOf("fmi") != 0 || mayInvade || IoTrophies.level(t[1] | 0) > 0);
        let cards: any[] = [["sign", 0], ["statue", 0]].concat(GLOBAL.INFERNO_ONLY ? list : []);
        const PER: int = 4;
        const CW: int = 140;
        const CH: int = 310;
        const GAP: int = 14;
        let pages: int = Math.max(1, Math.ceil(cards.length / PER)) | 0;
        IoTerrainPopup._decorPage = Math.max(0, Math.min(pages - 1, IoTerrainPopup._decorPage)) | 0;
        let from: int = (IoTerrainPopup._decorPage * PER) | 0;
        let shown: any[] = cards.slice(from, from + PER);
        let x0: number = -((shown.length * (CW + GAP) - GAP) / 2);
        for (let i: int = 0; i < shown.length; i++) {
            let key: string = String(shown[i][0]);
            let card: Sprite = key == "sign" ? this.signCard(CW, CH) : (key == "statue" ? this.statueCard(CW, CH) : this.trophyCard(key, shown[i][1] | 0, CW, CH));
            card.x = x0 + i * (CW + GAP);
            card.y = this._top + 140;
            this._body.addChild(card);
        }
        if (pages > 1) {
            let by: int = (this._top + this._h - 68) | 0;
            let prev: Button_CLIP = as3.as(this._body.addChild(new Button_CLIP()), Button_CLIP);
            prev.name = "ioClubDecorPrev";
            prev.Setup(KEYS.Get("io_club2_prev"), false, 120, 32);
            prev.x = -190;
            prev.y = by;
            prev.Enabled = IoTerrainPopup._decorPage > 0;
            prev.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (IoTerrainPopup._decorPage > 0) {
                    SOUNDS.Play("click1");
                    IoTerrainPopup._decorPage--;
                    this.showTab("decor");
                }
            });
            let pageText: TextField = as3.as(this._body.addChild(IoTerrainPopup.label((IoTerrainPopup._decorPage + 1) + " / " + pages, 12, 0x2A1A08, true, 120, TextFormatAlign.CENTER)), TextField);
            pageText.name = "ioClubDecorPage";
            pageText.x = -60;
            pageText.y = by + 7;
            let next: Button_CLIP = as3.as(this._body.addChild(new Button_CLIP()), Button_CLIP);
            next.name = "ioClubDecorNext";
            next.Setup(KEYS.Get("io_club2_next"), false, 120, 32);
            next.x = 70;
            next.y = by;
            next.Enabled = IoTerrainPopup._decorPage < pages - 1;
            next.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (IoTerrainPopup._decorPage < pages - 1) {
                    SOUNDS.Play("click1");
                    IoTerrainPopup._decorPage++;
                    this.showTab("decor");
                }
            });
        }
    }

    /** The Decorations tab drawn again (the statue's champion changed: IoShop). */
    public static refreshDecor(): void {
        let o: IoTerrainPopup = IoTerrainPopup._open;
        if (o && o._mc && o._tab == "decor") {
            o.showTab("decor");
        }
    }

    /** A Decorations card: its frame, picture (scaled to 90 across), name, status and what it is. */
    private decorCard(name: string, cw: int, ch: int, picKey: string, title: string, status: string, statusColour: uint, about: string, lit: boolean, dim: boolean = false, buttons: int = 1): Sprite {
        let card: Sprite = new Sprite();
        card.name = name;
        card.graphics.beginFill(0xF4ECDA, 1);
        card.graphics.drawRoundRect(0, 0, cw, ch, 10, 10);
        card.graphics.endFill();
        card.graphics.lineStyle(lit ? 3 : 1, lit ? 0xFFC125 : 0x3A2A18, 1, true);
        card.graphics.drawRoundRect(0, 0, cw, ch, 10, 10);
        let pic: Sprite = new Sprite();
        pic.y = 8;
        card.addChild(pic);
        ImageCache.GetImageWithCallBack(picKey, (k: string, bmd: BitmapData, args: any[] = null): void => {
            if (!bmd || !pic.parent) {
                return;
            }
            let bm: Bitmap = new Bitmap(bmd);
            bm.smoothing = true;
            let sc: number = Math.min(90 / bmd.width, 120 / bmd.height);
            bm.scaleX = bm.scaleY = sc;
            bm.x = (cw - bmd.width * sc) / 2;
            if (dim) {
                bm.alpha = 0.35;
            }
            pic.addChild(bm);
        });
        let nameText: TextField = as3.as(card.addChild(IoTerrainPopup.label(title, 11, 0x2A1A08, true, cw, TextFormatAlign.CENTER)), TextField);
        nameText.y = 134;
        GLOBAL.ioFitText(nameText, 8);
        let st: TextField = as3.as(card.addChild(IoTerrainPopup.label(status, 10, statusColour, true, cw - 8, TextFormatAlign.CENTER)), TextField);
        st.name = "ioClubDecorStatus";
        st.x = 4;
        st.y = 152;
        GLOBAL.ioFitText(st, 8);
        let how: TextField = as3.as(card.addChild(IoTerrainPopup.label(about, 10, 0x3A2A18, false, cw - 12, TextFormatAlign.CENTER)), TextField);
        how.multiline = true;
        how.wordWrap = true;
        // (what it is, down to the card's buttons, never under them: drawn smaller to fit)
        how.height = Math.max(30, ch - 36 * buttons - 6 - 172);
        how.x = 6;
        how.y = 172;
        GLOBAL.ioFitHeight(how, 8);
        return card;
    }

    /** A Decorations card's button, `from` the card's foot (1: the lowest). */
    private decorButton(card: Sprite, name: string, label: string, cw: int, ch: int, from: int, lit: boolean, onClick: Function): Button_CLIP {
        let b: Button_CLIP = as3.as(card.addChild(new Button_CLIP()), Button_CLIP);
        b.name = name;
        b.Setup(label, false, cw - 16, 28);
        b.x = 8;
        b.y = ch - 36 * from;
        b.Highlight = lit;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick();
        });
        return b;
    }

    /** The Sign: free, built from the build menu's Flags & Signs (IoSign). */
    private signCard(cw: int, ch: int): Sprite {
        let card: Sprite = this.decorCard("ioClubDecor:sign", cw, ch, "buildingbuttons/150.jpg", KEYS.Get("io_club2_decor_sign"), KEYS.Get("io_club2_decor_free"), 0x2C6A0C, KEYS.Get("io_club2_decor_sign_how", { "v1": 10, "v2": IoSign.MAX }), false);
        this.decorButton(card, "ioDaveBuildSign", KEYS.Get("io_t3m_dc_build_sign"), cw, ch, 1, true, (): void => {
            this.close();
            BUILDINGS._buildingID = IoSign.TYPE;
            BUILDINGS._menuA = 4;
            BUILDINGS._menuB = BUILDINGSPOPUP.IO_TAB_FLAGS;
            BUILDINGS.Show();
            try {
                BUILDINGS._mc.SwitchB(4, BUILDINGSPOPUP.IO_TAB_FLAGS, 0);
            } catch (err) {
            }
        });
        return card;
    }

    /** The Champion Statue: which champion (and level) it shows, Champion to change it, Build one. */
    private statueCard(cw: int, ch: int): Sprite {
        let look: string = IoChampionStatue.lookOf(IoChampionStatue.yard);
        let mine: boolean = IoShop.data != null;
        let status: string = !look ? KEYS.Get("io_club2_decor_statue_none") : (IoChampionStatue.levelOf(look) > 0 ? KEYS.Get("io_club2_decor_statue_shows_lvl", { "v1": IoChampionStatue.nameOf(IoChampionStatue.championOf(look)), "v2": IoChampionStatue.levelOf(look) }) : KEYS.Get("io_club2_decor_statue_shows", { "v1": IoChampionStatue.nameOf(look) }));
        let card: Sprite = this.decorCard("ioClubDecor:statue", cw, ch, IoChampionStatue.cardKey(IoChampionStatue.TYPE, "buildingbuttons/171.jpg"), KEYS.Get("io_shop_statue"), status, look ? 0x2C6A0C : 0x7A6A58, KEYS.Get("io_club2_decor_statue_how"), false, false, 2);
        if (!mine) {
            return card;
        }
        this.decorButton(card, "ioClubStatueChampion", KEYS.Get("io_club2_decor_statue_pick"), cw, ch, 2, false, (): void => {
            IoShop.chooseStatue();
        });
        this.decorButton(card, "ioClubStatueBuild", KEYS.Get("io_club2_decor_statue_build"), cw, ch, 1, true, (): void => {
            this.close();
            IoShop.openAnimated();
        });
        return card;
    }

    /** A trophy (QoL #133): dim until won, its level, how it's won, Place in yard. */
    private trophyCard(key: string, type: int, cw: int, ch: int): Sprite {
        let lvl: int = IoTrophies.level(type);
        let max: int = IoTrophies.maxLevel(type);
        let won: boolean = lvl > 0;
        let statusText: string = !won ? KEYS.Get("io_club2_tro_notwon") : (max > 1 ? KEYS.Get("io_club2_tro_level", { "v1": lvl, "v2": max }) : KEYS.Get("io_club2_tro_won"));
        let card: Sprite = this.decorCard("ioClubTrophy:" + key, cw, ch, IoTrophies.picture(type, Math.max(1, lvl)), KEYS.Get("io_club2_tro_name_" + key), statusText, won ? 0x2C6A0C : 0x7A6A58, KEYS.Get("io_club2_tro_how_" + key), won, !won);
        let st: TextField = as3.as(card.getChildByName("ioClubDecorStatus"), TextField);
        if (st) {
            st.name = "ioClubTrophyStatus";
        }
        if (!won) {
            return card;
        }
        let own: boolean = IoTrophies.own();
        let here: int = own ? IoTrophies.inYard(type) : 0;
        let stored: int = own ? InventoryManager.buildingStorageCount(type) : 0;
        let canPlace: boolean = own && stored > 0;
        let place: Button_CLIP = this.decorButton(card, "ioClubTrophyPlace:" + key, KEYS.Get(here > 0 && stored <= 0 ? "io_club2_tro_inyard" : "io_club2_tro_place"), cw, ch, 1, canPlace, (): void => {
            if (!canPlace) {
                return;
            }
            this.close();
            if (!IoTrophies.placeNow(type)) {
                GLOBAL.Message(KEYS.Get("io_club2_tro_cantplace"));
            }
        });
        place.Enabled = canPlace;
        return card;
    }

    /** A skin bought (dave/buy) and put on. */
    private buy(key: string, value: string): void {
        PLEASEWAIT.Show(KEYS.Get("io_t3m_dc_buying"));
        IoDave.buy(key, value, (err: string): void => {
            PLEASEWAIT.Hide();
            if (err) {
                GLOBAL.Message(err);
                return;
            }
            SOUNDS.Play("purchasepopup");
            if (this._mc) {
                this.showTab(this._tab);
            }
        });
    }

    /** Emotes (14 October, the user's): every chat emote, the animated ones playing; free, sent from the chat bar's button. */
    private emotesTab(): void {
        this.intro(KEYS.Get("io_t3m_dc_emotes_intro", { "v1": IoEmotes.MAX }));
        let list: any[] = IoEmotes.LIST;
        let cols: int = 13;
        let cell: int = 44;
        let gx: number = -((cols * cell) / 2);
        let gy: number = this._top + 140;
        for (let i: int = 0; i < list.length; i++) {
            let e: any[] = list[i];
            let holder: Sprite = new Sprite();
            holder.name = "ioDaveEmote:" + e[0];
            holder.x = gx + (i % cols) * cell;
            holder.y = gy + ((i / cols) | 0) * (cell + 24);
            holder.graphics.beginFill(0xF4ECDA, 1);
            holder.graphics.drawRoundRect(0, 0, cell - 4, cell - 4, 8, 8);
            holder.graphics.endFill();
            let pic: Sprite = IoEmotes.make(String(e[0]), 36);
            pic.x = pic.y = 2;
            holder.addChild(pic);
            // (16 October: inside its own column, on two lines when it needs them: "Pouce levé" ran into "Pouce baissé")
            let cap: TextField = IoTerrainPopup.label(IoEmotes.label(e), 8, 0x2A1A08, true, cell, TextFormatAlign.CENTER);
            cap.height = 24;
            // (one line, a little smaller if need be; two lines only for two words that still don't fit: a word was
            // broken in two, "Diaboliqu-e")
            GLOBAL.ioFitText(cap, 7);
            if (cap.textWidth > cap.width - 4 && String(IoEmotes.label(e)).indexOf(" ") > 0) {
                let f: TextFormat = cap.getTextFormat();
                f.size = 8;
                cap.setTextFormat(f);
                cap.wordWrap = true;
                cap.multiline = true;
            }
            cap.x = -2;
            cap.y = cell - 4;
            holder.addChild(cap);
            this._body.addChild(holder);
        }
    }

    /** A ground's picture (a piece of its first tile) and name; a locked one says how to open it. */
    private tile(id: string, name: string, art: any, open: boolean): Sprite {
        let t: Sprite = new Sprite();
        t.name = "ioTerrain:" + id;
        let tw: int = IoTerrainPopup.TILE_W;
        let th: int = IoTerrainPopup.TILE_H;
        let pic: BitmapData = new BitmapData(tw, th, false, 0x201008);
        try {
            let src: BitmapData = as3.as(new art(0, 0), BitmapData);
            // (the middle of the tile, at half size: enough of the ground to see it)
            let scale: number = Math.max(tw / src.width, th / src.height, 0.5);
            let m: Matrix = new Matrix(scale, 0, 0, scale, (tw - src.width * scale) / 2, (th - src.height * scale) / 2);
            pic.draw(as3.cast(src, IBitmapDrawable), m, null, null, new Rectangle(0, 0, tw, th), true);
        } catch (e) {
        }
        let bm: Bitmap = new Bitmap(pic);
        t.addChild(bm);
        let edge: Sprite = new Sprite();
        edge.name = "edge";
        t.addChild(edge);
        // (16 October: no "(locked)" after the name: the dimmed picture says how to open it, and the longer languages'
        // names didn't fit with it)
        let caption: TextField = IoTerrainPopup.label(name, 10, open ? 2759178 : 0x7A6A58, true, tw, TextFormatAlign.CENTER);
        GLOBAL.ioFitText(caption);
        caption.y = th + 2;
        t.addChild(caption);
        if (open) {
            t.buttonMode = true;
            t.mouseChildren = false;
            t.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this._chosen = id;
                this.mark();
                // (QoL #137: shown in the yard behind the window)
                this.preview(id);
            });
        } else {
            bm.alpha = 0.35;
            let need: int = IoTerrainPopup.inviteNeed(id);
            let outposts: int = IoTerrainPopup.outpostNeed(id);
            let level: int = IoTerrainPopup.levelNeed(id);
            let lock: TextField = IoTerrainPopup.label(need > 0 ? IoDave.inviteLock(need) : (outposts > 0 ? KEYS.Get("io_t3m_dc_outpost_lock", { "v1": GLOBAL.FormatNumber(outposts) }) : (level > 0 ? KEYS.Get("io_t3m_dc_level_lock", { "v1": level }) : KEYS.Get("io_t3m_dc_hfo_lock"))), 9, 0xFFFFFF, true, tw, TextFormatAlign.CENTER);
            if (need > 0) {
                // (the invite: what opens it)
                t.buttonMode = true;
                t.mouseChildren = false;
                t.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    SOUNDS.Play("click1");
                    this.close();
                    UI_TOP.ioShowInvite();
                });
            }
            lock.multiline = true;
            lock.wordWrap = true;
            // (three lines in French)
            lock.height = 44;
            GLOBAL.ioFitHeight(lock, 8);
            lock.y = ((th - Math.min(44, lock.textHeight + 4)) / 2) | 0;
            lock.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
            t.addChild(lock);
        }
        this._tiles.push({ "id": id, "tile": t, "edge": edge });
        return t;
    }

    /** The chosen ground framed in gold. */
    private mark(): void {
        for (let o of as3.values(this._tiles)) {
            let g: any = (o.edge as Sprite).graphics;
            g.clear();
            if (o.id == this._chosen) {
                g.lineStyle(4, 0xFFC125, 1, true);
                g.drawRect(0, 0, IoTerrainPopup.TILE_W, IoTerrainPopup.TILE_H);
            } else {
                g.lineStyle(1, 0x3A2A18, 1, true);
                g.drawRect(0, 0, IoTerrainPopup.TILE_W, IoTerrainPopup.TILE_H);
            }
        }
    }

    private onSave(e: MouseEvent = null): void {
        let terrain: string = this._chosen;
        PLEASEWAIT.Show(KEYS.Get("radio_bSaving"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "terrain/set", [["terrain", terrain]], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || response.error !== 0 && response.error !== "0") {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_t3m_no_answer"));
                return;
            }
            IoTerrainPopup.chosen = terrain == "lava" ? null : terrain;
            if (as3.is(response.terrains, Array)) {
                IoTerrainPopup.allowed = as3.as(response.terrains, Array);
            }
            let cursed: boolean = IoHfo.frozenGround();
            // laid now (Hell Freezes Over's own frozen days keep their ice: BASE.Build); (QoL #137) only in the
            // player's own main yard (from someone else's, it was laid in theirs), and not again if shown already
            if (!cursed && (!GLOBAL.INFERNO_ONLY || IoTerrainPopup.ownGround()) && MAP.texture != terrain) {
                MAP.swapBG(terrain);
            }
            // (QoL #137: kept: nothing to put back)
            this._previewing = false;
            SOUNDS.Play("purchasepopup");
            this.close();
            // (QoL #592)
            if (cursed && GLOBAL.INFERNO_ONLY) {
                GLOBAL.Message(KEYS.Get("io_club2_ground_saved_curse"));
            }
        }, (err: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_t3m_no_answer2"));
        });
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        // (QoL #137: a ground shown but not saved: the yard's own put back)
        if (this._previewing && this._was && MAP.texture != this._was && IoTerrainPopup.ownGround()) {
            MAP.swapBG(this._was);
        }
        this._previewing = false;
        if (this._blocker) {
            this._blocker.alpha = this._blockerAlpha;
        }
        this._blocker = null;
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoTerrainPopup._open == this) {
            IoTerrainPopup._open = null;
        }
    }
}
