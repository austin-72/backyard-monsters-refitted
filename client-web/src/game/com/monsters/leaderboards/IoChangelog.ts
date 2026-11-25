import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { setTimeout, clearTimeout } from "flash/utils";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { LOGIN, IoWin, CasinoUI, GLOBAL, IoAttackLogs, IoFormat, IoKit, IoQuestBook, IoQuests, KEYS, POPUPSETTINGS, SOUNDS, UI_TOP, URLLoaderApi } from "@game";

/**
 * Inferno-only (4 October, the user's): the Changelog, opened by the top bar's button right of the attack logs
 * (UI_TOP.ioChangelogButton). Every change ever made to the Inferno, day by day, newest first, each with its area
 * (Yard, Map, Depths...), a short title and a line or two saying what it means.
 *
 * (22 October: easier to read) On the left, what to show and which topic:
 *  - Show: "New for you" (the changes not seen yet, UI_TOP.ioChangesFresh: what it opens on when there are any),
 *    "Recent" (the newest RECENT_DAYS days: what it opens on otherwise) or "Everything" (each day folded but the
 *    newest: a click on a day's heading opens or folds it).
 *  - Topics: the areas players think of together (the server's `topics`, controllers/changelog.ts), each with how
 *    many changes it has in what is shown.
 * Under the list: "Titles only" (one line a change; a click on one shows what it means), the search, the page
 * (/changes, the same with the phone's own scrolling) and the guide. The topic and "Titles only" are kept
 * (UI_TOP.ioMark). Changes not seen yet say NEW in Recent and Everything. On a phone the text is larger.
 *
 * Data: the server's /changelog (controllers/changelog.ts), which is server/public/docs/changelog.json; asked
 * for each time the window opens, so a new version is published by replacing that file. It is in English.
 * Hell Freezes Over stays "[ CLASSIFIED ]" there, as in the players' guide.
 */
export class IoChangelog extends ASObject {
    static {
        as3.fields(this, { mc: null, _list: null, _days: null, _status: null, _sub: null, _dayTops: null, _ioRetry: null, _ioFind: null, _ioFindHint: null, _ioArea: "", _ioWait: 0, _ioView: "", _ioTopic: "", _ioBrief: false, _ioBriefBtn: null, _ioDayOpen: null, _ioItemOpen: null, _ioKeys: null });
    }

    private static W: int; // const

    private static H: int; // const

    private static DAYS_X: int; // const

    private static DAYS_W: int; // const

    private static LIST_X: int; // const

    private static LIST_W: int; // const

    private static TOP: int; // const

    private static LIST_H: int; // const

    private static TEXT_W: int; // const

    /** Each area's colour (the tag in front of a change). */
    private static AREAS: any; // const

    private static MONTHS: any[]; // const

    private static WEEKDAYS: any[]; // const

    /** "Recent": the newest this many days. */
    public static readonly RECENT_DAYS: int = 7;

    private static _open: IoChangelog;

    /** The last answer, kept while the game runs (opened again, it shows at once and is asked for again). */
    private static _cache: any;

    /**
     * The changes new to this player in this run ("date:id": true, UI_TOP.ioChangesFresh, worked out before the
     * window marks them seen): they stay new until the game is loaded again.
     */
    private static _fresh: any;

    static {
        as3.lazyStatics(this, { W: 0, H: 0, DAYS_X: 0, DAYS_W: 0, LIST_X: 0, LIST_W: 0, TOP: 0, LIST_H: 0, TEXT_W: 0, AREAS: null, MONTHS: null, WEEKDAYS: null, _open: null, _cache: null, _fresh: null }, () => {
            IoChangelog.W = IoAttackLogs.W;
            IoChangelog.H = IoAttackLogs.H;
            IoChangelog.DAYS_X = (-IoChangelog.W / 2 + 20) | 0;
            IoChangelog.DAYS_W = 184;
            IoChangelog.LIST_X = (IoChangelog.DAYS_X + IoChangelog.DAYS_W + 10) | 0;
            IoChangelog.LIST_W = (IoChangelog.W / 2 - 20 - IoChangelog.LIST_X) | 0;
            IoChangelog.TOP = (-IoChangelog.H / 2 + 118) | 0;
            IoChangelog.LIST_H = (IoChangelog.H / 2 - 52 - IoChangelog.TOP) | 0;
            IoChangelog.TEXT_W = (IoChangelog.LIST_W - 12 - 10 - 24) | 0;
            IoChangelog.AREAS = { "Yard": 0x6AB04A, "Map": 0x4A8AD0, "Depths": 0xB070F0, "Battles": 0xE0503A, "Monsters": 0xE08A3A, "Buildings": 0xC8A050, "Economy": 0xE0C040, "Events": 0xFF7A2A, "Quests": 0x50B0A0, "Alliances": 0x5A9AE0, "Chat": 0x80C0E0, "Leaderboards": 0xD0B060, "Brimstone Pit": 0xD06A90, "Pets": 0xA0D070, "Replays": 0x9A9AE0, "Interface": 0xB8A898, "Browser": 0x70B8B0, "Admins": 0x9A7AC0, "Fixes": 0x8A9A8A, "Hellgate": 0xD2462A, "Arcade": 0xFF3A7A, "Outposts": 0x7AA0C8, "Signing in": 0xC8B060, "Server": 0x8AA0B0, "D.A.V.E. Club": 0xE0A0D0 };
            IoChangelog.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            IoChangelog.WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            IoChangelog._open = null;
            IoChangelog._cache = null;
            IoChangelog._fresh = null;
        });
    }
    public mc: MovieClip;
    private _list: any;
    /** The left column: what to show and the topics (22 October; the days' buttons were here). */
    private _days: any;
    private _status: TextField;
    private _sub: TextField;
    /** Where each day's heading is in the list (by its index). */
    private _dayTops: any[];

    /** "new", "recent" or "all" ("" until the first answer picks one). */
    private _ioView: string;

    /** The topic shown alone (its id; "" for all). */
    private _ioTopic: string;

    /** Titles only: one line a change. */
    private _ioBrief: boolean;

    private _ioBriefBtn: Sprite;

    /** A day the player opened or folded (date: open), for this view. */
    private _ioDayOpen: any;

    /** In Titles only, the changes opened ("date:id": true). */
    private _ioItemOpen: any;

    /** The changes drawn, by their row's name ("ioClItem" + n: "date:id"), for a test. */
    private _ioKeys: any;

    public $ctor(): void {
        this._dayTops = [];
        this._ioDayOpen = {};
        this._ioItemOpen = {};
        this._ioKeys = {};
        super.$ctor();
        this._ioTopic = GLOBAL.INFERNO_ONLY ? UI_TOP.ioMark("ioClTopic") : "";
        this._ioBrief = GLOBAL.INFERNO_ONLY && UI_TOP.ioMark("ioClBrief") == "1";
        this.mc = new MovieClip();
        this.mc.name = "ioChangelogWindow";
        IoAttackLogs.frame(this.mc);
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("cl_title"), 34, (IoChangelog.W - 200) | 0)), TextField);
        title.x = -IoChangelog.W / 2 + 100;
        title.y = -IoChangelog.H / 2 + 24;
        this._sub = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("cl_sub"), 13, CasinoUI.GOLD, true, (IoChangelog.W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._sub.x = -IoChangelog.W / 2 + 20;
        this._sub.y = -IoChangelog.H / 2 + 80;
        GLOBAL.ioFitText(this._sub);
        this._days = IoAttackLogs.scrollView(this.mc, IoChangelog.DAYS_X, IoChangelog.TOP, IoChangelog.DAYS_W, IoChangelog.LIST_H);
        this._list = IoAttackLogs.scrollView(this.mc, IoChangelog.LIST_X, IoChangelog.TOP, IoChangelog.LIST_W, IoChangelog.LIST_H);
        this._status = as3.as(this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, (IoChangelog.LIST_W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._status.x = IoChangelog.LIST_X + 20;
        this._status.y = IoChangelog.TOP + 40;
        let barY: number = IoChangelog.TOP + IoChangelog.LIST_H + 10;
        // (22 October: Titles only, at the left under the topics)
        this._ioBriefBtn = as3.as(this.mc.addChild(CasinoUI.toggle(KEYS.Get("io_cl_brief"), (IoChangelog.DAYS_W - 12) | 0, 24, (e: MouseEvent): void => {
            this.ioSetBrief(!this._ioBrief);
        })), Sprite);
        this._ioBriefBtn.name = "ioClBrief";
        this._ioBriefBtn.x = IoChangelog.DAYS_X;
        this._ioBriefBtn.y = barY - 5;
        CasinoUI.choose(this._ioBriefBtn, this._ioBrief);
        // (QoL #143: the player guide, as on the login page, at the right)
        let guide: Sprite = as3.as(this.mc.addChild(IoQuestBook.textLink(KEYS.Get("io_guide_link"), (): void => {
            GLOBAL.gotoURL(GLOBAL.serverUrl + (GLOBAL.INFERNO_ONLY && LOGIN.token ? "guide/more#k=" + encodeURIComponent(LOGIN.token) : "guide")); // (QoL #653: the guide, with the chapters this player may read)
        })), Sprite);
        guide.name = "ioClGuide";
        guide.scaleX = guide.scaleY = 1.2;
        guide.x = IoChangelog.W / 2 - 20 - guide.width;
        guide.y = barY;
        // (22 October: the same as a page, with the topic chosen: on a phone it scrolls as the phone does)
        let page: Sprite = as3.as(this.mc.addChild(IoQuestBook.textLink(KEYS.Get("io_cl_page"), (): void => {
            let q: any[] = [];
            if (this._ioTopic) {
                q.push("topic=" + encodeURIComponent(this._ioTopic));
            }
            if (this._ioBrief) {
                q.push("brief=1");
            }
            GLOBAL.gotoURL(GLOBAL.serverUrl + "changes" + (q.length ? "?" + q.join("&") : ""));
        })), Sprite);
        page.name = "ioClPage";
        page.scaleX = page.scaleY = 1.2;
        page.x = guide.x - 14 - page.width;
        page.y = barY;
        // (QoL #142: a search box; a click on a change's area tag shows only that area)
        let findW: int = 190;
        this._ioFind = as3.as(this.mc.addChild(CasinoUI.input(findW, 22, "", 40, null)), TextField);
        this._ioFind.name = "ioClFind";
        let ff: TextFormat = this._ioFind.defaultTextFormat;
        ff.align = TextFormatAlign.LEFT;
        ff.size = 12;
        this._ioFind.defaultTextFormat = ff;
        this._ioFind.setTextFormat(ff);
        this._ioFind.x = page.x - 14 - findW;
        this._ioFind.y = barY - 3;
        this._ioFindHint = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("cl_find"), 12, CasinoUI.ASH, false, (findW - 10) | 0)), TextField);
        this._ioFindHint.mouseEnabled = false;
        this._ioFindHint.x = this._ioFind.x + 5;
        this._ioFindHint.y = this._ioFind.y + 2;
        this._ioFind.addEventListener(Event.CHANGE, (e: Event): void => {
            this._ioFindHint.visible = !this._ioFind.text;
            clearTimeout(this._ioWait);
            this._ioWait = setTimeout((): void => {
                if (this.mc && IoChangelog._cache) {
                    this.fill(IoChangelog._cache);
                }
            }, 250);
        });
        let hintX: number = this._ioBriefBtn.x + this._ioBriefBtn.width + 12;
        let hint: TextField = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("cl_hint"), 11, CasinoUI.ASH, false, Math.max(60, this._ioFind.x - hintX - 10) | 0, TextFormatAlign.LEFT)), TextField);
        hint.name = "ioClHint";
        hint.x = hintX;
        hint.y = barY;
        GLOBAL.ioFitText(hint);
        // (22 October: only where it has room to be read: the folding days' triangles say most of it)
        hint.visible = !IoAttackLogs.ioPhone && hint.width >= 150;
        this.mc.addChild(IoAttackLogs.closeButton("ioClClose", as3.bind(this, this.close)));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        // (QoL #464: a click on the backdrop closes it)
        GLOBAL.ioBackdropCloses((): void => {
            this.close();
        });
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        IoWin.fit(this.mc, IoChangelog.W, IoChangelog.H); // (QoL #466)
        POPUPSETTINGS.ScaleUp(this.mc);
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache);
        } else {
            this._status.text = KEYS.Get("cl_loading");
            IoWin.watchLoading(this._status); // (QoL #447)
        }
        this.fetch();
    }

    public static Show(e: MouseEvent = null): void {
        if (IoChangelog._open && (!IoChangelog._open.mc || !IoChangelog._open.mc.stage)) {
            IoChangelog._open = null;
        }
        if (IoChangelog._open) {
            return;
        }
        SOUNDS.Play("click1");
        IoChangelog._open = new IoChangelog();
        IoQuests.once("changelog");
    }

    public static get isOpen(): boolean {
        return IoChangelog._open != null;
    }

    /** Closes it (the yard is going). */
    public static CloseOpen(): void {
        if (IoChangelog._open) {
            IoChangelog._open.close();
        }
        IoChangelog._open = null;
    }

    private fetch(): void {
        let self: IoChangelog = null;
        self = this;
        new URLLoaderApi().load(GLOBAL.serverUrl + "changelog", null, (r: any): void => {
            if (!self.mc) {
                return;
            }
            if (!r || r.error || !(as3.is(r.entries, Array))) {
                if (!IoChangelog._cache) {
                    self.ioFailed();
                }
                return;
            }
            let fresh: boolean = !IoChangelog._cache || JSON.stringify(IoChangelog._cache.entries) != JSON.stringify(r.entries) || JSON.stringify(IoChangelog._cache.topics) != JSON.stringify(r.topics);
            // (22 October: what is new to this player, before it is marked seen; kept while the game runs)
            if (GLOBAL.INFERNO_ONLY) {
                if (!IoChangelog._fresh) {
                    IoChangelog._fresh = {};
                }
                let ids: any = UI_TOP.ioChangesFresh(as3.as(r.entries, Array)).ids;
                for (let k in ids) {
                    if (!IoChangelog._fresh[k]) {
                        IoChangelog._fresh[k] = true;
                        fresh = true;
                    }
                }
            }
            // (QoL #141: seen: the top bar's count of new changes goes)
            UI_TOP.ioChangesSeen(as3.as(r.entries, Array), true);
            IoChangelog._cache = r;
            if (fresh) {
                self.fill(r);
            }
        }, (e: IOErrorEvent): void => {
            if (self.mc && !IoChangelog._cache) {
                self.ioFailed();
            }
        });
    }

    private _ioRetry: Sprite;

    private _ioFind: TextField;

    private _ioFindHint: TextField;

    /** The area shown alone ("" for all; QoL #142). */
    private _ioArea: string;

    private _ioWait: uint;

    /**
     * QoL #142: the changes that match the search and the area chosen (all of them without either); 22 October:
     * and the topic's areas (`areas`, { area: true }; null for every area).
     */
    public static ioMatch(item: any, query: string, area: string, areas: any = null): boolean {
        if (area && String(item.area || "") != area) {
            return false;
        }
        if (areas && !areas[String(item.area || "")]) {
            return false;
        }
        if (!query) {
            return true;
        }
        let all: string = (String(item.area || "") + " " + IoChangelog.areaLabel(String(item.area || "")) + " " + String(item.title || "") + " " + String(item.text || "")).toLowerCase();
        for (let word of as3.values(query.toLowerCase().split(/\s+/))) {
            if (word && all.indexOf(word) < 0) {
                return false;
            }
        }
        return true;
    }

    /** An area's name as its tag shows it, in the player's language (QoL #235: "io_t3m_cl_area_yard"...; else as written). */
    public static areaLabel(area: string): string {
        if (!area) {
            return "";
        }
        let key: string = "io_t3m_cl_area_" + area.toLowerCase().replace(/[^a-z]/g, "");
        let said: string = KEYS.Get(key);
        return said && said != key ? said : area;
    }

    /** A topic's name in the player's language ("io_cl_topic_yard"...; else the server's English). */
    public static topicLabel(topic: any): string {
        if (!topic) {
            return KEYS.Get("io_cl_topic_all");
        }
        let key: string = "io_cl_topic_" + String(topic.id || "");
        let said: string = KEYS.Get(key);
        return said && said != key ? said : String(topic.name || topic.id || "");
    }

    /** Shows only one area (or all again, the same area clicked twice). */
    public ioShowArea(area: string): void {
        this._ioArea = this._ioArea == area ? "" : area;
        SOUNDS.Play("click1");
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache);
        }
    }

    /** 22 October: what to show ("new", "recent", "all"); the days opened or folded start again. */
    public ioSetView(view: string): void {
        if (this._ioView != view) {
            this._ioDayOpen = {};
        }
        this._ioView = view;
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache, true);
        }
    }

    /** 22 October: one topic ("" for all); a tag's area goes. Kept for next time. */
    public ioSetTopic(topic: string): void {
        this._ioTopic = topic;
        this._ioArea = "";
        if (GLOBAL.INFERNO_ONLY) {
            UI_TOP.ioMark("ioClTopic", topic);
        }
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache, true);
        }
    }

    /** 22 October: Titles only, or each change with what it means. Kept for next time. */
    public ioSetBrief(on: boolean): void {
        this._ioBrief = on;
        CasinoUI.choose(this._ioBriefBtn, on);
        if (GLOBAL.INFERNO_ONLY) {
            UI_TOP.ioMark("ioClBrief", on ? "1" : "0");
        }
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache);
        }
    }

    /** 22 October: a day's heading clicked: it opens or folds. */
    public ioToggleDay(date: string, open: boolean): void {
        this._ioDayOpen[date] = !open;
        SOUNDS.Play("click1");
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache);
        }
    }

    /** 22 October: in Titles only, a change clicked: what it means shows, or goes. */
    public ioToggleItem(key: string): void {
        this._ioItemOpen[key] = !this._ioItemOpen[key];
        SOUNDS.Play("click1");
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache);
        }
    }

    /** QoL #460: couldn't load: says so, with Try again under it. */
    private ioFailed(): void {
        this._status.text = KEYS.Get("cl_failed");
        if (!this._ioRetry) {
            this._ioRetry = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("io_try_again"), 140, 30, (): void => {
                this._ioRetry.visible = false;
                this._status.text = KEYS.Get("cl_loading");
            IoWin.watchLoading(this._status); // (QoL #447)
                this.fetch();
            })), Sprite);
            this._ioRetry.name = "ioClRetry";
        }
        this._ioRetry.x = (this._status.x + this._status.width / 2 - 70) | 0;
        this._ioRetry.y = (this._status.y + Math.max(24, this._status.textHeight + 12)) | 0;
        this._ioRetry.visible = true;
    }

    /** "2026-10-04" as "Sunday 4 October 2026" (or as "4 Oct", short). */
    public static dayName(iso: string, short: boolean = false): string {
        // (Inferno-only, QoL #574: the game's one date, its day and month names in the player's language: they
        // were English in every language)
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.isoDay(iso, !short);
        }
        let p: any[] = String(iso).split("-");
        if (p.length < 3) {
            return String(iso);
        }
        let y: int = p[0] | 0;
        let m: int = ((p[1] | 0) - 1) | 0;
        let d: int = p[2] | 0;
        if (m < 0 || m > 11) {
            return String(iso);
        }
        if (short) {
            return d + " " + String(IoChangelog.MONTHS[m]).substr(0, 3) + " " + y;
        }
        return IoChangelog.WEEKDAYS[new Date(y, m, d).getDay()] + " " + d + " " + IoChangelog.MONTHS[m] + " " + y;
    }

    /** A change's key: its day and UI_TOP.ioClId. */
    public static keyOf(date: string, item: any): string {
        return date + ":" + UI_TOP.ioClId(item);
    }

    /** Is this change new to the player (this run)? */
    public static isNew(date: string, item: any): boolean {
        return !!IoChangelog._fresh && !!IoChangelog._fresh[IoChangelog.keyOf(date, item)];
    }

    /** The changes `view` shows, by day ({ date, headline, items }), before the topic and the search. */
    public static inView(entries: any[], view: string): any[] {
        if (view == "recent") {
            return entries.slice(0, IoChangelog.RECENT_DAYS);
        }
        if (view != "new") {
            return entries;
        }
        let out: any[] = [];
        for (let e of as3.values(entries)) {
            let date: string = as3.str(e.date);
            let its: any[] = (as3.as(e.items, Array) || []).filter((it: any): boolean => IoChangelog.isNew(date, it));
            if (its.length) {
                out.push({ "date": e.date, "headline": e.headline, "items": its });
            }
        }
        return out;
    }

    /** The topic's areas ({ area: true }), or null (no such topic: every area). */
    private static areasOf(topics: any[], id: string): any {
        if (!id) {
            return null;
        }
        for (let t of as3.values(topics)) {
            if (String(t.id) == id) {
                let out: any = {};
                for (let a of as3.values(as3.as(t.areas, Array) || [])) {
                    out[String(a)] = true;
                }
                return out;
            }
        }
        return null;
    }

    private static count(entries: any[], query: string, area: string, areas: any): int {
        let n: int = 0;
        for (let e of as3.values(entries)) {
            for (let it of as3.values(as3.as(e.items, Array) || [])) {
                if (IoChangelog.ioMatch(it, query, area, areas)) {
                    n++;
                }
            }
        }
        return n;
    }

    private static get ioPhone(): boolean {
        return IoAttackLogs.ioPhone;
    }

    private fill(data: any, top: boolean = false): void {
        if (this._ioRetry) {
            this._ioRetry.visible = false;
        }
        let all: any[] = as3.as(data.entries, Array) || [];
        let topics: any[] = as3.as(data.topics, Array) || [];
        let newN: int = IoChangelog.count(IoChangelog.inView(all, "new"), "", "", null);
        // (what it opens on: the new changes, when there are any; else the latest days)
        if (!this._ioView) {
            this._ioView = newN > 0 ? "new" : "recent";
        }
        if (this._ioTopic && !IoChangelog.areasOf(topics, this._ioTopic)) {
            this._ioTopic = "";
        }
        let areas: any = IoChangelog.areasOf(topics, this._ioTopic);
        let query: string = this._ioFind ? String(this._ioFind.text || "").replace(/^\s+|\s+$/g, "") : "";
        let shown: any[] = IoChangelog.inView(all, this._ioView);
        let total: int = IoChangelog.count(shown, "", "", null);
        // (QoL #142: only the matching changes, and only the days that have any)
        let filtered: boolean = !!query || !!this._ioArea || !!areas;
        let entries: any[] = shown;
        if (filtered) {
            let kept: any[] = [];
            for (let e1 of as3.values(shown)) {
                let its: any[] = (as3.as(e1.items, Array) || []).filter((it: any): boolean => IoChangelog.ioMatch(it, query, this._ioArea, areas));
                if (its.length) {
                    kept.push({ "date": e1.date, "headline": e1.headline, "items": its });
                }
            }
            entries = kept;
        }
        this.fillSide(all, topics, query, areas, newN);
        let rows: Sprite = as3.cast(this._list.content, Sprite);
        while (rows.numChildren) {
            rows.removeChildAt(0);
        }
        this._dayTops = [];
        this._ioKeys = {};
        let phone: boolean = IoChangelog.ioPhone;
        let headH: int = phone ? 50 : 44;
        let count: int = 0;
        let y: number = 8;
        for (let i: int = 0; i < entries.length; i++) {
            let entry: any = entries[i];
            let date: string = as3.str(entry.date);
            let its: any[] = as3.as(entry.items, Array) || [];
            // (22 October: Everything folds the days but the newest; a search or a tag opens them all)
            let open: boolean = this._ioDayOpen[date] != null ? Boolean(this._ioDayOpen[date]) : (this._ioView != "all" || !!query || !!this._ioArea || i == 0);
            this._dayTops.push(y);
            // the day's heading: a click opens or folds it
            let head: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
            head.name = "ioClDay" + i;
            head.y = y;
            head.buttonMode = true;
            head.mouseChildren = false;
            head["ioOpen"] = open;
            head.graphics.beginFill(open ? 3807760 : 0x24100A, 0.95);
            head.graphics.lineStyle(1, open ? 13127706 : 0x7A3414, 1);
            head.graphics.drawRoundRect(6, 0, IoChangelog.LIST_W - 28, headH, 10, 10);
            head.graphics.endFill();
            // (a triangle: down when open)
            head.graphics.lineStyle(0, 0, 0);
            head.graphics.beginFill(CasinoUI.GOLD, 1);
            if (open) {
                head.graphics.moveTo(14, 10);
                head.graphics.lineTo(24, 10);
                head.graphics.lineTo(19, 16);
            } else {
                head.graphics.moveTo(16, 8);
                head.graphics.lineTo(22, 13);
                head.graphics.lineTo(16, 18);
            }
            head.graphics.endFill();
            let when: TextField = as3.as(head.addChild(CasinoUI.label(IoChangelog.dayName(date), phone ? 15 : 14, CasinoUI.GOLD, true, (IoChangelog.LIST_W - 150) | 0)), TextField);
            when.x = 30;
            when.y = 3;
            GLOBAL.ioFitText(when);
            let n: TextField = as3.as(head.addChild(CasinoUI.label(KEYS.Get(its.length == 1 ? "io_cl_one_change" : "io_cl_changes", { "v1": GLOBAL.FormatNumber(its.length) }), phone ? 13 : 12, CasinoUI.ASH, true, 100, TextFormatAlign.RIGHT)), TextField);
            n.x = IoChangelog.LIST_W - 28 - 104;
            n.y = 4;
            let what: TextField = as3.as(head.addChild(CasinoUI.label(String(entry.headline || ""), phone ? 12 : 11, CasinoUI.ASH, false, (IoChangelog.LIST_W - 64) | 0)), TextField);
            what.x = 30;
            what.y = phone ? 26 : 23;
            GLOBAL.ioFitText(what, phone ? 11 : 8);
            let at: string = date;
            let was: boolean = open;
            head.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                this.ioToggleDay(at, was);
            });
            y += headH + 8;
            if (open) {
                for (let item of as3.values(its)) {
                    y += this.addItem(rows, y, item, date, count);
                    count++;
                }
                y += 10;
            } else {
                count = (count + its.length) | 0;
            }
        }
        this._list.setTotal(y + 8, top);
        let none: string = this._ioView == "new" && !filtered ? "io_cl_none_new" : (filtered ? "cl_none_found" : "cl_failed");
        this._status.text = entries.length ? "" : KEYS.Get(none);
        let found: int = IoChangelog.count(entries, "", "", null);
        if (this._ioArea) {
            this._sub.htmlText = KEYS.Get("cl_found_area", { "v1": GLOBAL.FormatNumber(found), "v2": GLOBAL.FormatNumber(total), "v3": IoChangelog.areaLabel(this._ioArea) });
        } else if (areas && !query) {
            this._sub.htmlText = KEYS.Get("io_cl_found_topic", { "v1": GLOBAL.FormatNumber(found), "v2": GLOBAL.FormatNumber(total), "v3": IoChangelog.topicLabel(this.topicOf(topics, this._ioTopic)) });
        } else if (filtered) {
            this._sub.htmlText = KEYS.Get("cl_found", { "v1": GLOBAL.FormatNumber(found), "v2": GLOBAL.FormatNumber(total) });
        } else if (this._ioView == "new") {
            this._sub.htmlText = KEYS.Get(total == 1 ? "io_cl_sub_new1" : "io_cl_sub_new", { "v1": GLOBAL.FormatNumber(total) });
        } else if (this._ioView == "recent") {
            this._sub.htmlText = KEYS.Get("io_cl_sub_recent", { "v1": GLOBAL.FormatNumber(total), "v2": shown.length });
        } else {
            this._sub.htmlText = KEYS.Get("cl_sub_count", { "v1": GLOBAL.FormatNumber(total), "v2": shown.length, "v3": IoChangelog.dayName(String(data.updated || (all.length ? all[0].date : "")), true) });
        }
        GLOBAL.ioFitText(this._sub);
    }

    private topicOf(topics: any[], id: string): any {
        for (let t of as3.values(topics)) {
            if (String(t.id) == id) {
                return t;
            }
        }
        return null;
    }

    /** 22 October: the left column: Show (New for you, Recent, Everything) and the topics, each with its count. */
    private fillSide(all: any[], topics: any[], query: string, areas: any, newN: int): void {
        let side: Sprite = as3.cast(this._days.content, Sprite);
        while (side.numChildren) {
            side.removeChildAt(0);
        }
        let phone: boolean = IoChangelog.ioPhone;
        let bh: int = phone ? 32 : 26;
        let step: int = (bh + 4) | 0;
        let y: number = 6;
        let label = (key: string): void => {
            let t: TextField = as3.as(side.addChild(CasinoUI.label(KEYS.Get(key), phone ? 12 : 11, CasinoUI.EMBER, true, (IoChangelog.DAYS_W - 32) | 0)), TextField);
            t.x = 10;
            t.y = y;
            y += phone ? 20 : 18;
        };
        label("io_cl_show");
        let views: any[] = ["new", "recent", "all"];
        let viewKeys: any[] = ["io_cl_view_new", "io_cl_view_recent", "io_cl_view_all"];
        for (let i: int = 0; i < views.length; i++) {
            let v: string = as3.str(views[i]);
            let n: int = IoChangelog.count(IoChangelog.inView(all, v), query, this._ioArea, areas);
            let b: Sprite = as3.as(side.addChild(this.sideButton("ioClView:" + v, KEYS.Get(as3.str(viewKeys[i])), n, this._ioView == v, bh, v == "new" && n > 0, (): void => {
                this.ioSetView(v);
            })), Sprite);
            b.y = y;
            y += step;
        }
        y += 8;
        if (topics.length) {
            label("io_cl_topics");
            let shown: any[] = IoChangelog.inView(all, this._ioView);
            let list: any[] = [null].concat(topics);
            for (let t of as3.values(list)) {
                let id: string = t ? String(t.id) : "";
                let n2: int = IoChangelog.count(shown, query, "", t ? IoChangelog.areasOf(topics, id) : null);
                let b2: Sprite = as3.as(side.addChild(this.sideButton("ioClTopic:" + (id || "all"), IoChangelog.topicLabel(t), n2, this._ioTopic == id, bh, false, (): void => {
                    this.ioSetTopic(id);
                })), Sprite);
                b2.y = y;
                y += step;
            }
        }
        this._days.setTotal(y + 4, false);
    }

    /** A button of the left column: its name, how many changes (on the right), lit when chosen. */
    private sideButton(name: string, label: string, n: int, on: boolean, h: int, hot: boolean, onClick: Function): Sprite {
        let b: Sprite = null;
        let draw: Function = null;
        let w: int = (IoChangelog.DAYS_W - 32) | 0;
        b = new Sprite();
        b.name = name;
        b.buttonMode = true;
        b.mouseChildren = false;
        b["ioChosen"] = on;
        draw = (over: boolean): void => {
            b.graphics.clear();
            // (the kit's obsidian button, molten when chosen, as CasinoUI.toggle)
            if (IoKit.slice(b.graphics, on ? "btn_molten" : (over ? "btn_obsidian_h" : "btn_obsidian"), 6, 0, w, h)) {
                return;
            }
            b.graphics.lineStyle(1, (on ? 0xFFE0A0 : (over ? 0xFFC060 : 0x9A3A14)) >>> 0, 1);
            b.graphics.beginFill((on ? 0xB0501A : (over ? 0x5A2A14 : 0x2A1610)) >>> 0, 1);
            b.graphics.drawRoundRect(6, 0, w, h, 8, 8);
            b.graphics.endFill();
        };
        draw(false);
        IoKit.whenLoaded(["btn_obsidian", "btn_obsidian_h", "btn_molten"], (): void => {
            draw(false);
        });
        let size: int = IoChangelog.ioPhone ? 13 : 11;
        let t: TextField = as3.as(b.addChild(CasinoUI.label(label, size, on ? 0xFFFFFF : CasinoUI.GOLD, true, (w - 36) | 0)), TextField);
        t.x = 12;
        t.y = ((h - size - 6) / 2) | 0;
        GLOBAL.ioFitText(t, IoChangelog.ioPhone ? 10 : 8);
        // (the count; New for you's is a red badge while there are new ones)
        let c: TextField = as3.as(b.addChild(CasinoUI.label(GLOBAL.FormatNumber(n), size, hot ? 0xFFFFFF : (on ? 0xFFE6C0 : CasinoUI.ASH), true, 34, TextFormatAlign.RIGHT)), TextField);
        c.name = "n";
        c.x = w - 34;
        c.y = t.y;
        if (hot) {
            let cw: number = Math.max(20, c.textWidth + 10);
            b.graphics.lineStyle(1, 0xFFE6A0, 1);
            b.graphics.beginFill(0xC0201A, 1);
            b.graphics.drawRoundRect(w + 2 - cw, ((h - 16) / 2) | 0, cw, 16, 16, 16);
            b.graphics.endFill();
            c.x = w + 2 - cw / 2 - 17 - 2;
            c.width = 34;
            let cf: TextFormat = c.getTextFormat();
            cf.align = TextFormatAlign.CENTER;
            c.setTextFormat(cf);
            c.y = (((h - 16) / 2) | 0) - 1;
        }
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick();
        });
        return b;
    }

    /** One change: its area's tag, its title, what it means (in Titles only, when opened); returns how tall it is. */
    private addItem(rows: Sprite, y: number, item: any, date: string, index: int): number {
        let phone: boolean = IoChangelog.ioPhone;
        let area: string = String(item.area || "");
        let colour: uint = (IoChangelog.AREAS[area] != null ? IoChangelog.AREAS[area] >>> 0 : 0xB8A898) >>> 0;
        let key: string = IoChangelog.keyOf(date, item);
        let row: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
        row.name = "ioClItem" + index;
        this._ioKeys[row.name] = key;
        row.y = y;
        let tagW: int = phone ? 96 : 84;
        let tagH: int = phone ? 20 : 16;
        let titleSize: int = phone ? 14 : 12;
        let titleX: int = (14 + tagW + 8) | 0;
        let tag: TextField = as3.as(row.addChild(CasinoUI.label(IoChangelog.areaLabel(area), phone ? 11 : 9, 1707530, true, tagW, TextFormatAlign.CENTER)), TextField);
        tag.x = 14;
        tag.y = phone ? 3 : 2;
        GLOBAL.ioFitText(tag);
        row.graphics.beginFill(colour, 1);
        row.graphics.drawRoundRect(14, 2, tagW, tagH, 8, 8);
        row.graphics.endFill();
        let isNew: boolean = this._ioView != "new" && IoChangelog.isNew(date, item);
        let brief: boolean = this._ioBrief;
        let opened: boolean = !brief || !!this._ioItemOpen[key];
        let titleW: int = (IoChangelog.TEXT_W - titleX + 14 - (isNew ? 44 : 0) - (brief ? 18 : 0)) | 0;
        let title: TextField = as3.as(row.addChild(CasinoUI.label(String(item.title || ""), titleSize, 16777215, true, titleW)), TextField);
        title.x = titleX;
        title.y = phone ? 1 : 0;
        GLOBAL.ioFitText(title, phone ? 11 : 8);
        let lineH: int = phone ? 24 : 20;
        // (22 October: Titles only: the line opens what it means; "+" or "−" at its end)
        if (brief) {
            let hit: Sprite = as3.as(row.addChildAt(new Sprite(), 0), Sprite);
            hit.name = "ioClOpen";
            hit.graphics.beginFill(0xFFFFFF, opened ? 0.05 : 0);
            hit.graphics.drawRoundRect(titleX - 4, 0, IoChangelog.TEXT_W - titleX + 18, lineH - 2, 6, 6);
            hit.graphics.endFill();
            hit.buttonMode = true;
            hit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                this.ioToggleItem(key);
            });
            title.mouseEnabled = false;
            let sign: TextField = as3.as(row.addChild(CasinoUI.label(opened ? "-" : "+", titleSize + 2, CasinoUI.GOLD, true, 16, TextFormatAlign.CENTER)), TextField);
            sign.mouseEnabled = false;
            sign.x = IoChangelog.TEXT_W - 2;
            sign.y = -2;
        }
        if (isNew) {
            let mark: TextField = as3.as(row.addChild(CasinoUI.label(KEYS.Get("io_cl_new_mark"), phone ? 11 : 9, 0xFFFFFF, true, 40, TextFormatAlign.CENTER)), TextField);
            mark.name = "ioClNew";
            mark.mouseEnabled = false;
            mark.x = IoChangelog.TEXT_W - (brief ? 18 : 0) - 40;
            mark.y = phone ? 3 : 2;
            row.graphics.beginFill(0xC0201A, 1);
            row.graphics.drawRoundRect(mark.x, 2, 40, tagH, 8, 8);
            row.graphics.endFill();
        }
        // (QoL #142: the tag shows only its area; again, all)
        let tagHit: Sprite = as3.as(row.addChild(new Sprite()), Sprite);
        tagHit.name = "ioClArea:" + area;
        tagHit.graphics.beginFill(0, 0);
        tagHit.graphics.drawRect(14, 2, tagW, tagH);
        tagHit.graphics.endFill();
        tagHit.buttonMode = true;
        if (this._ioArea == area) {
            tagHit.graphics.lineStyle(2, 16777215, 1);
            tagHit.graphics.drawRoundRect(13, 1, tagW + 2, tagH + 2, 8, 8);
        }
        tagHit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            this.ioShowArea(area);
        });
        if (!opened) {
            return lineH + 2;
        }
        let text: TextField = as3.as(row.addChild(CasinoUI.label(String(item.text || ""), phone ? 13 : 11, 14208192, false, IoChangelog.TEXT_W)), TextField);
        text.name = "ioClText";
        text.wordWrap = true;
        text.multiline = true;
        text.autoSize = TextFieldAutoSize.LEFT;
        text.text = String(item.text || "");
        text.x = 14;
        text.y = lineH;
        let h: number = lineH + Math.max(16, text.textHeight + 6);
        // (Inferno-only, QoL #649: a change a later one undid or changed: "Changed later, see 13 Oct 2026", under it)
        let later: any = item.later != null && typeof item.later == "object" ? item.later : (item.later ? { "date": String(item.later) } : null);
        if (GLOBAL.INFERNO_ONLY && later && later.date) {
            let mark2: TextField = as3.as(row.addChild(CasinoUI.label(KEYS.Get(later.note ? "io_acc_cl_later_note" : "io_acc_cl_later", { "v1": IoChangelog.dayName(String(later.date), true), "v2": String(later.note || "") }), phone ? 12 : 11, CasinoUI.EMBER, true, IoChangelog.TEXT_W)), TextField);
            mark2.name = "ioClLater";
            mark2.x = 14;
            mark2.y = h;
            GLOBAL.ioFitText(mark2);
            h += phone ? 20 : 18;
        }
        return h + 8;
    }

    /** Scrolls the list to day `i`. */
    public goTo(i: int): void {
        if (i < 0 || i >= this._dayTops.length) {
            return;
        }
        this._list.offset = Number(this._dayTops[i]) - 4;
        this._list.place();
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        this._list.stop();
        this._days.stop();
        clearTimeout(this._ioWait);
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        if (IoChangelog._open == this) {
            IoChangelog._open = null;
        }
    }
}
