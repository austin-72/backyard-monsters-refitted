import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { TextField, TextFormatAlign } from "flash/text";
import { clearInterval, setInterval } from "flash/utils";
import { ALLIANCES, BYMChat, CasinoUI, Chat, GLOBAL, IoAttackLogs, IoChatMenu, IoFormat, IoToast, KEYS, LOGIN, POPUPSETTINGS, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only (13 October, the user's): Who's Online?, opened by the chat bar's button on its left (ChatBox). Every
 * player active in the last 24 hours, the most recent first: those online now (active in the last 5 minutes) with a
 * green dot, then those recently online with a grey one and how long ago. Each name has its alliance tag before it,
 * coloured by how the player stands with that alliance, as in the chat; a click on a name opens the chat's menu for
 * them (Send a message, Ignore, Jump to their yard...).
 *
 * Data: the server's /chat/online (controllers/chat/whosOnline.ts), asked for when it opens and every 30 seconds
 * while it is open.
 *
 * (QoL #235: its words in the player's language, io_tr_who_*)
 */
export class IoWhosOnline extends ASObject {
    static {
        as3.fields(this, { mc: null, _list: null, _status: null, _sub: null, _timer: 0, _toggle: null, _hidden: false });
    }

    private static readonly ROW_H: int = 28;

    private static _open: IoWhosOnline = null;

    /** The last answer, kept while the game runs (opened again, it shows at once and is asked for again). */
    private static _cache: any = null;

    public mc: MovieClip;
    private _list: any;
    private _status: TextField;
    private _sub: TextField;
    private _timer: uint;
    /** The "appear offline" button, and whether the player does (as the server last said). */
    private _toggle: Sprite;
    private _hidden: boolean;

    private static get W(): int {
        return IoAttackLogs.W;
    }

    private static get H(): int {
        return IoAttackLogs.H;
    }

    private static get LIST_X(): int {
        return (-IoWhosOnline.W / 2 + 20) | 0;
    }

    private static get LIST_W(): int {
        return (IoWhosOnline.W - 40) | 0;
    }

    private static get TOP(): int {
        // (Inferno-only, QoL #158: room for the filter row above the list)
        return (-IoWhosOnline.H / 2 + 130) | 0;
    }

    /** QoL #158: which players the list shows: "all", "mine" (my alliance), "friendly", "hostile"; kept while open. */
    private static _filter: string = "all";

    private _filterChips: any[];

    private _search: TextField;

    private static get LIST_H(): int {
        return (IoWhosOnline.H / 2 - 30 - IoWhosOnline.TOP) | 0;
    }

    public $ctor(): void {
        super.$ctor();
        this.mc = new MovieClip();
        this.mc.name = "ioWhosOnlineWindow";
        IoAttackLogs.frame(this.mc);
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("io_tr_who_title"), 34, (IoWhosOnline.W - 200) | 0)), TextField);
        title.x = -IoWhosOnline.W / 2 + 100;
        title.y = -IoWhosOnline.H / 2 + 24;
        this._sub = as3.as(this.mc.addChild(CasinoUI.label("", 13, CasinoUI.GOLD, true, (IoWhosOnline.W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._sub.x = -IoWhosOnline.W / 2 + 20;
        this._sub.y = -IoWhosOnline.H / 2 + 80;
        this.drawFilters();
        this._list = IoAttackLogs.scrollView(this.mc, IoWhosOnline.LIST_X, IoWhosOnline.TOP, IoWhosOnline.LIST_W, IoWhosOnline.LIST_H);
        this._status = as3.as(this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, (IoWhosOnline.LIST_W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._status.x = IoWhosOnline.LIST_X + 20;
        this._status.y = IoWhosOnline.TOP + 40;
        this.mc.addChild(IoAttackLogs.closeButton("ioWhoClose", as3.bind(this, this.close)));
        this._hidden = IoWhosOnline._cache ? !!IoWhosOnline._cache.hidden : false;
        this.drawToggle();
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        // (QoL #464: a click on the backdrop closes it)
        GLOBAL.ioBackdropCloses((): void => {
            this.close();
        });
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        if (IoWhosOnline._cache) {
            this.fill(IoWhosOnline._cache);
        } else {
            this._status.text = KEYS.Get("io_tr_who_looking");
        }
        this.fetch();
        this._timer = setInterval(as3.bind(this, this.fetch), 30000);
    }

    public static Show(e: MouseEvent = null): void {
        if (IoWhosOnline._open && (!IoWhosOnline._open.mc || !IoWhosOnline._open.mc.stage)) {
            IoWhosOnline._open = null;
        }
        if (IoWhosOnline._open) {
            return;
        }
        SOUNDS.Play("click1");
        IoWhosOnline._open = new IoWhosOnline();
    }

    public static get isOpen(): boolean {
        return IoWhosOnline._open != null;
    }

    /** Closes it (the yard is going). */
    public static CloseOpen(): void {
        if (IoWhosOnline._open) {
            IoWhosOnline._open.close();
        }
        IoWhosOnline._open = null;
    }

    /**
     * Inferno-only (13 October, the user's): appear offline, or online again. Others see the player as offline: not on
     * their Who's Online, a grey dot in chat. Kept until changed.
     */
    private drawToggle(): void {
        if (!this.mc) {
            return;
        }
        if (this._toggle && this._toggle.parent) {
            this._toggle.parent.removeChild(this._toggle);
        }
        // (on the list's top right, beside "Online now")
        this._toggle = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get(this._hidden ? "io_tr_who_appear_online" : "io_tr_who_appear_offline"), 140, 24, as3.bind(this, this.onToggle), true, 12)), Sprite);
        this._toggle.name = "ioWhoToggle";
        this._toggle.x = IoWhosOnline.LIST_X + IoWhosOnline.LIST_W - 30 - 140;
        this._toggle.y = IoWhosOnline.TOP + 4;
    }

    private onToggle(e: MouseEvent = null): void {
        SOUNDS.Play("click1");
        this.fetch(this._hidden ? "0" : "1");
    }

    private fetch(hide: string = null): void {
        let self: IoWhosOnline = this;
        if (!this.mc) {
            return;
        }
        let vars: any[] = [["v", 1]];
        if (hide != null) {
            vars.push(["hide", hide]);
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "chat/online", vars, (r: any): void => {
            if (!self.mc) {
                return;
            }
            if (!r || r.error || !as3.is(r.players, Array)) {
                if (!IoWhosOnline._cache) {
                    self._status.text = KEYS.Get("io_tr_who_failed");
                }
                self.ioFailed(hide);
                return;
            }
            IoWhosOnline._cache = r;
            IoWhosOnline._ioAt = GLOBAL.Timestamp();
            // (Inferno-only, QoL #477: the chat bar's Offline chip and its count follow)
            if (GLOBAL.INFERNO_ONLY && Chat._bymChat != null && Chat._bymChat.chatBox != null) {
                let seen: int = (as3.as(r.players, Array) || []).filter((p: any): boolean => !!p.online && !p.hidden).length | 0;
                Chat._bymChat.chatBox.ioChat2Presence(!!r.hidden, seen);
            }
            if (!!r.hidden != self._hidden) {
                self._hidden = !!r.hidden;
                self.drawToggle();
            }
            self.fill(r);
        }, (e: IOErrorEvent): void => {
            if (self.mc && !IoWhosOnline._cache) {
                self._status.text = KEYS.Get("io_tr_who_failed");
            }
            if (self.mc) {
                self.ioFailed(hide);
            }
        });
    }

    /** (Inferno-only, QoL #453) when the list last came */
    private static _ioAt: number = 0;

    /**
     * QoL #453: a failed Appear offline / online says so (the button stayed as it was, silently); a failed refresh
     * of a list already shown says how old it is.
     */
    private ioFailed(hide: string): void {
        if (hide != null) {
            IoToast.Show(KEYS.Get("io_who_hide_failed"), 3500);
        }
        if (IoWhosOnline._cache && IoWhosOnline._ioAt > 0 && this._sub) {
            let base: string = this._sub.text.split("  ·  " + KEYS.Get("io_who_stale", { "v1": "" }).split(" ")[0])[0];
            this._sub.text = base + "  ·  " + KEYS.Get("io_who_stale", { "v1": GLOBAL.ioDuration(GLOBAL.Timestamp() - IoWhosOnline._ioAt) });
        }
    }

    /** The colour of an alliance tag on this dark window: the world map's, by how the player stands with it. */
    public static tagColor(aid: int): string {
        let c: string = BYMChat.ioTagColor(aid);
        // (Inferno-only, QoL #228: with the colour-blind setting, friendly in blue and hostile in orange (IoFormat);
        // the chat's own colours may be those already)
        if (GLOBAL.INFERNO_ONLY && IoFormat.colourBlind) {
            let cb: string = ({ "#CC2E14": IoFormat.relHtml(-1, "#FF6A4A"), "#D55E00": IoFormat.relHtml(-1, "#FF6A4A"), "#178A0C": IoFormat.relHtml(1, "#4BE03A"), "#0072B2": IoFormat.relHtml(1, "#4BE03A") } as any)[c];
            if (cb) {
                return cb;
            }
        }
        // (the chat's colours are for its light lines; here the map's brighter ones)
        return ({ "#2A6FC9": "#7DB8FF", "#CC2E14": "#FF6A4A", "#178A0C": "#4BE03A", "#9A7400": "#FFD84A" } as any)[c] || "#C8C0B8";
    }

    /** "2 min ago", "3 h ago". */
    public static ago(seconds: number): string {
        // (Inferno-only, QoL #572: the game's one "time ago" (IoFormat.since, short), in the player's language; a
        // minute at least, as before)
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.since(Math.max(60, Number(seconds) || 0), true);
        }
        let s: number = Math.max(0, seconds);
        if (s < 3600) {
            return Math.max(1, Math.floor(s / 60)) + " min ago";
        }
        return Math.floor(s / 3600) + " h ago";
    }

    /** QoL #158: All / My alliance / Friendly / Hostile, and a name box, over the list. */
    private drawFilters(): void {
        let y: int = (-IoWhosOnline.H / 2 + 100) | 0;
        let x: int = IoWhosOnline.LIST_X;
        this._filterChips = [];
        for (let f of [["all", KEYS.Get("io_tr_who_f_all")], ["mine", KEYS.Get("io_tr_who_f_mine")], ["friendly", KEYS.Get("io_tr_who_f_friendly")], ["hostile", KEYS.Get("io_tr_who_f_hostile")]]) {
            let key: string = String(f[0]);
            let chip: Sprite = CasinoUI.toggle(String(f[1]), key == "mine" ? 104 : 80, 24, (e: MouseEvent): void => {
                IoWhosOnline._filter = key;
                this.refreshFilters();
            }, "tab");
            chip.name = "ioWhoFilter_" + key;
            (chip as any).ioKey = key;
            chip.x = x;
            chip.y = y;
            x = (x + chip.width + 6) | 0;
            this.mc.addChild(chip);
            this._filterChips.push(chip);
        }
        let find: TextField = CasinoUI.input(170, 24, "", 20, null);
        find.name = "ioWhoSearch";
        find.x = IoWhosOnline.LIST_X + IoWhosOnline.LIST_W - 170;
        find.y = y;
        find.addEventListener(Event.CHANGE, (e: Event): void => {
            this.refreshFilters();
        });
        this.mc.addChild(find);
        this._search = find;
        let hint: TextField = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("io_tr_who_find"), 12, CasinoUI.ASH, true, 50, TextFormatAlign.RIGHT)), TextField);
        hint.x = find.x - 56;
        hint.y = y + 4;
        this.refreshFilters(false);
    }

    private refreshFilters(redraw: boolean = true): void {
        for (let c of as3.values(this._filterChips || [])) {
            CasinoUI.choose(as3.cast(c, Sprite), (c as any).ioKey == IoWhosOnline._filter);
        }
        if (redraw && IoWhosOnline._cache) {
            this.fill(IoWhosOnline._cache);
        }
    }

    /** QoL #158: whether a player passes the filter and the name box. */
    private shows(p: any): boolean {
        let want: string = this._search ? this._search.text.replace(/^\s+|\s+$/g, "").toLowerCase() : "";
        if (want && String(p.name).toLowerCase().indexOf(want) < 0 && String(p.tag || "").toLowerCase() != want) {
            return false;
        }
        let aid: int = p.aid | 0;
        let f: string = IoWhosOnline._filter;
        if (f == "mine") {
            return aid > 0 && aid == (ALLIANCES._allianceID | 0);
        }
        if (f == "friendly" || f == "hostile") {
            if (!aid || aid == (ALLIANCES._allianceID | 0)) {
                return false;
            }
            let mine: any = ALLIANCES._myAlliance as any;
            let stance: int = Number(mine && mine.relationships ? mine.relationships[aid] : 0) | 0;
            return f == "friendly" ? stance > 0 : stance < 0;
        }
        return true;
    }

    private fill(data: any): void {
        let all: any[] = as3.as(data.players, Array) || [];
        let players: any[] = all.filter((p: any): boolean => (p.id | 0) == LOGIN._playerID || this.shows(p));
        let rows: Sprite = as3.cast(this._list.content, Sprite);
        while (rows.numChildren) {
            rows.removeChildAt(0);
        }
        let now: number = Number(data.now) || Math.floor(new Date().getTime() / 1000);
        let online: any[] = players.filter((p: any): boolean => !!p.online);
        let recent: any[] = players.filter((p: any): boolean => !p.online);
        let y: number = 6;
        let section = (label: string, list: any[]): void => {
            let head: TextField = as3.as(rows.addChild(CasinoUI.label(label, 13, CasinoUI.GOLD, true, (IoWhosOnline.LIST_W - 60) | 0)), TextField);
            head.x = 14;
            head.y = y;
            y += 24;
            for (let i: int = 0; i < list.length; i++) {
                rows.addChild(this.row(list[i], y, i, now));
                y += IoWhosOnline.ROW_H;
            }
            y += 10;
        };
        section(KEYS.Get("io_tr_who_online_now", { "v1": online.length }), online);
        if (recent.length) {
            section(KEYS.Get("io_tr_who_recent", { "v1": recent.length }), recent);
        }
        this._list.setTotal(y + 6, false);
        this._status.text = players.length ? "" : KEYS.Get(all.length ? "io_tr_who_no_match" : "io_tr_who_nobody");
        let seen: int = all.filter((p: any): boolean => !!p.online && !p.hidden).length;
        this._sub.text = (seen == 1 ? KEYS.Get("io_tr_who_seen_one") : KEYS.Get("io_tr_who_seen_n", { "v1": seen })) + (this._hidden ? "  ·  " + KEYS.Get("io_tr_who_you_hidden") : "");
    }

    /** One player: their dot, [TAG] and name (a click opens the chat's menu for them), and when they were on. */
    private row(p: any, y: number, i: int, now: number): Sprite {
        let r: Sprite = new Sprite();
        r.name = "ioWho_" + (p.id | 0);
        r.y = y;
        let w: int = (IoWhosOnline.LIST_W - 32) | 0;
        r.graphics.beginFill((i % 2 ? 0x2A1A14 : 0x1E120E) >>> 0, 0.85);
        r.graphics.drawRoundRect(8, 0, w, IoWhosOnline.ROW_H - 4, 8, 8);
        r.graphics.endFill();
        let on: boolean = !!p.online;
        // (the player's own row: appearing offline, a hollow grey dot)
        let ghost: boolean = !!p.hidden;
        if (ghost) {
            on = false;
        }
        r.graphics.lineStyle(ghost ? 2 : 1, (on ? 0x1E7A12 : (ghost ? 0x9A9A9A : 0x5A5A5A)) >>> 0, 1);
        r.graphics.beginFill((on ? 0x35C21F : 0x8A8A8A) >>> 0, ghost ? 0 : 1);
        r.graphics.drawCircle(24, (IoWhosOnline.ROW_H - 4) / 2, 5);
        r.graphics.endFill();
        let me: boolean = (p.id | 0) == LOGIN._playerID;
        let tag: string = p.tag ? "<font color=\"#E8E0D8\">[</font><font color=\"" + IoWhosOnline.tagColor(p.aid | 0) + "\">" + BYMChat.ioEsc(String(p.tag)) + "</font><font color=\"#E8E0D8\">]</font> " : "";
        let name: TextField = as3.as(r.addChild(CasinoUI.label("", 13, 0xFFFFFF, true, (w - 200) | 0)), TextField);
        name.htmlText = tag + "<font color=\"#FFFFFF\">" + BYMChat.ioEsc(String(p.name)) + (me ? " <font color=\"#C8C0B8\">" + KEYS.Get(ghost ? "io_tr_who_you_ghost" : "io_tr_who_you") + "</font>" : "") + "</font>";
        name.x = 38;
        name.y = 4;
        let when: TextField = as3.as(r.addChild(CasinoUI.label(on ? KEYS.Get("io_tr_who_online") : (ghost ? KEYS.Get("io_tr_who_appearing_offline") : IoWhosOnline.ago(now - Number(p.at))), 12, on ? 0x5BE04A : CasinoUI.ASH, on, 140, TextFormatAlign.RIGHT)), TextField);
        when.x = w - 150;
        when.y = 5;
        if (!me) {
            r.buttonMode = true;
            r.mouseChildren = false;
            r.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                IoChatMenu.Show(String(p.id | 0), String(p.name), Chat._bymChat != null && Chat._bymChat.userIsIgnored(String(p.id | 0)), e.stageX, e.stageY, { "tag": p.tag, "aid": p.aid | 0, "online": !!p.online, "ago": on ? 0 : Math.max(60, now - Number(p.at)) });
            });
        }
        return r;
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        clearInterval(this._timer);
        IoChatMenu.Hide();
        this._list.stop();
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        if (IoWhosOnline._open == this) {
            IoWhosOnline._open = null;
        }
    }
}
