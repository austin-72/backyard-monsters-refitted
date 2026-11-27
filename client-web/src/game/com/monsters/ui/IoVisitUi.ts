import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, MovieClip, Shape, Sprite, Stage } from "flash/display";
import { Event, IOErrorEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFieldAutoSize } from "flash/text";
import { getTimer } from "flash/utils";
import { IoPlanShare, ALLIANCES, ALLIANCEWINDOW, ATTACK, AllianceConstants, BASE, BFOUNDATION, BRESOURCE, BSTORAGE, BUILDING5, Chat, EnumYardType, GLOBAL, InstanceManager, IoAllianceUi, IoChatMenu, IoCritterMenu, IoLeaderboards, IoMapShare, IoMapSnapshot, IoMapUi, IoPet, IoPets, IoPetsPanel, IoQuests, IoSign, IoToast, IoUnderworld, IoWhosOnline, KEYS, LOGIN, MAP, MapRoomCell, MapRoomManager, SOUNDS, UI2, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom, IoYardHelp } from "@game";

/**
 * Inferno-only (15 October, QoL #667-#669, #671, #672, #676): looking at another player's yard.
 *
 * A panel over the visitor bar (UI_VISITOR, the bottom right):
 * - the owner chip (#669): their alliance tag and name, how you stand with them, where the yard is, the protection
 *   left, and whether they are online or when they were last seen; a click opens the chat's name menu (IoChatMenu);
 * - Bookmark (the map's bookmarks, MapRoom.ioAddBookmarkAt) and Share (the map's [map:x,y] chat token, IoMapShare)
 *   (#672);
 * - for a yard opened from elsewhere than the map (the alliance windows, the Members list): Open on map and Attack
 *   (when one of your yards reaches it), and the visit counts for the quest book's "look at yards" quest (#667). The
 *   yard's map cell is found in the world snapshot (IoMapSnapshot) by its base id;
 * - after "Visit yard" on the alliance Members list (VisitMembers): ◀ ▶ through the list's yards, and Back to Members
 *   (#668).
 *
 * In the yard (#671, #676): a click on a building shows a card with what it is (its level, health, a tower's range and
 * damage, what a storage or harvester would give up); a sign with a message on it carries a mark, and its message
 * shows while the pointer is on it; a click on a pet says whose it is, its name and its kind.
 *
 * Made once a viewed yard is built (BASE.ProcessD calls Setup); gone when the yard is left, or the map opens. Never
 * in a replay (its yard is shown in view mode) or the Hellgate arena.
 */
export class IoVisitUi extends ASObject {
    private static readonly W: int = 330;

    private static readonly PAD: int = 8;

    private static readonly ROW_H: int = 26;

    private static readonly CHIP_H: int = 38;

    /** How many times (a second apart) the yard's map cell is looked for in the world snapshot. */
    private static readonly LOOKS: int = 25;

    private static _panel: Sprite = null;

    private static _h: int = 0;

    private static _chipName: TextField = null;

    private static _chipInfo: TextField = null;

    private static _chipDot: Shape = null;

    /** The yard shown: its base id (as BASE._loadedBaseID prints), its owner and their name. */
    private static _baseId: string = null;

    private static _uid: int = 0;

    private static _name: string = "";

    /** The visit came from the map (GLOBAL._currentCell is this yard's cell): the visitor bar has Open Map and Attack. */
    private static _fromMap: boolean = false;

    /** Where the yard is: { x, y, prot (protected until), pflag, locked, aid, online (-1 not known) }, or null. */
    private static _at: any = null;

    private static _looks: int = 0;

    private static _nextSlow: int = 0;

    /** "Visit yard" from the Members list: its rows (with a yard), and which one is shown. */
    private static _steps: any[] = null;

    private static _stepAt: int = -1;

    /** Who's Online's answer (chat/online): id -> { tag, aid, at, online }, and when it came. */
    private static _who: any = null;

    private static _whoAt: int = 0;

    private static _whoAsked: boolean = false;

    /** (16 October) The visitor bar's buttons the card was last laid out with (actsSig). */
    private static _actsSig: string = "";

    private static _card: Sprite = null;

    /** The signs with a message: { sign, mark }. */
    private static _marks: any[] = [];

    private static _tip: Sprite = null;

    private static _tipSign: IoSign = null;

    /** The pet or building under the pointer when the button went down on the yard: { x, y, pet, b }. */
    private static _down: any = null;

    private static _listening: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    /** Looking at a yard that isn't one's own (view, a tribe's yard, helping a friend). */
    public static viewing(): boolean {
        let m: string = GLOBAL.mode;
        let modes: any = GLOBAL.e_BASE_MODE;
        return m == modes.VIEW || m == modes.IVIEW || m == modes.WMVIEW || m == modes.IWMVIEW || m == modes.HELP || m == modes.IHELP;
    }

    /** The panel, or null (tests). */
    public static get panel(): Sprite {
        return IoVisitUi._panel;
    }

    /** The building card open now, or null (tests). */
    public static get card(): Sprite {
        return IoVisitUi._card;
    }

    /** Where the yard shown was found: { x, y, ... }, or null (tests). */
    public static get at(): any {
        return IoVisitUi._at;
    }

    // ---- made and taken away
    /** The viewed yard is built (BASE.ProcessD): the panel, the yard's clicks and the signs' marks. */
    public static Setup(): void {
        IoVisitUi.Hide();
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (!IoVisitUi.viewing() || (BASE.loadObject && BASE.loadObject.io_replay_view) || GLOBAL.ioTdMode()) {
            // (QoL #668: the alliance mates' yards are left)
            IoVisitUi._steps = null;
            return;
        }
        IoVisitUi._baseId = String(BASE._loadedBaseID);
        IoVisitUi._uid = BASE._userID | 0;
        IoVisitUi._name = BASE._ownerName ? String(BASE._ownerName) : "";
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMVIEW) {
            IoVisitUi._uid = 0;
        }
        let cell: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
        IoVisitUi._fromMap = cell != null && String(Number(cell._baseID)) == IoVisitUi._baseId;
        // (QoL #668: still going through the Members list's yards?)
        if (IoVisitUi._steps) {
            IoVisitUi._stepAt = -1;
            for (let i: int = 0; i < IoVisitUi._steps.length; i++) {
                if (String(Number(IoVisitUi._steps[i].base_id)) == IoVisitUi._baseId) {
                    IoVisitUi._stepAt = i;
                    break;
                }
            }
            if (IoVisitUi._stepAt < 0) {
                IoVisitUi._steps = null;
            }
        }
        IoVisitUi._at = null;
        IoVisitUi._looks = 0;
        IoVisitUi._nextSlow = (getTimer() + 1000) | 0;
        // (the panel: QoL #669 the owner chip, #672 Bookmark and Share, #667 Open on map and Attack, #668 the steps)
        let p: Sprite = new Sprite();
        p.name = "ioVisitPanel";
        IoVisitUi._panel = p;
        GLOBAL._layerUI.addChild(p);
        p.addEventListener(Event.ENTER_FRAME, IoVisitUi.tick);
        // (23 October, the user's: "the bottom right box ... first shows a second box under it for a split second with
        // redundant buttons": the visitor bar under the card kept its own Return Home until its next Update hid it
        // (UI_VISITOR.ioDress): hidden now, as the card takes its buttons. Not while helping: its bar is the helper's.)
        try {
            if (UI2._visitor && UI2._visitor.mc && GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP && GLOBAL.mode != GLOBAL.e_BASE_MODE.IHELP) {
                UI2._visitor.mc.visible = false;
            }
        } catch (e) {
        }
        IoVisitUi.locate();
        IoVisitUi.layout();
        // (QoL #671: a building's card; QoL #676: a pet's name and kind, the signs' marks and messages)
        IoVisitUi.listen(true);
        IoVisitUi.markSigns();
        IoVisitUi.askWho();
    }

    /** Takes it all away (a new yard, the map, Setup again). */
    public static Hide(): void {
        IoVisitUi.hideCard();
        IoVisitUi.hideTip();
        IoVisitUi.listen(false);
        for (let m of as3.values(IoVisitUi._marks)) {
            let s: IoSign = as3.as(m.sign, IoSign);
            if (s && s._mcHit) {
                s._mcHit.removeEventListener(MouseEvent.ROLL_OVER, IoVisitUi.signOver);
                s._mcHit.removeEventListener(MouseEvent.ROLL_OUT, IoVisitUi.signOut);
            }
            let mark: DisplayObject = as3.as(m.mark, DisplayObject);
            if (mark && mark.parent) {
                mark.parent.removeChild(mark);
            }
        }
        IoVisitUi._marks = [];
        if (IoVisitUi._panel) {
            IoVisitUi._panel.removeEventListener(Event.ENTER_FRAME, IoVisitUi.tick);
            if (IoVisitUi._panel.parent) {
                IoVisitUi._panel.parent.removeChild(IoVisitUi._panel);
            }
        }
        IoVisitUi._panel = null;
        IoVisitUi._chipName = null;
        IoVisitUi._chipInfo = null;
        IoVisitUi._chipDot = null;
        IoVisitUi._baseId = null;
    }

    /** The yard Setup was made for is still the one on screen. */
    private static stillHere(): boolean {
        return GLOBAL.INFERNO_ONLY && IoVisitUi._baseId != null && !BASE._loading && !GLOBAL.isMapOpen() && IoVisitUi.viewing() && String(BASE._loadedBaseID) == IoVisitUi._baseId;
    }

    private static tick(e: Event): void {
        if (!IoVisitUi.stillHere()) {
            IoVisitUi.Hide();
            return;
        }
        // (16 October: the bar's buttons changed (Open Map became Return Home, one enabled): the card again)
        if (IoVisitUi._panel && IoVisitUi._panel.visible && IoVisitUi.actsSig(IoVisitUi.visitorActs()) != IoVisitUi._actsSig) {
            IoVisitUi.layout();
        }
        IoVisitUi.place();
        IoVisitUi.moveTip();
        if (getTimer() >= IoVisitUi._nextSlow) {
            IoVisitUi._nextSlow = (getTimer() + 1000) | 0;
            if (!IoVisitUi._at && IoVisitUi._looks < IoVisitUi.LOOKS) {
                IoVisitUi._looks++;
                if (IoVisitUi.locate() || IoVisitUi._looks >= IoVisitUi.LOOKS) {
                    IoVisitUi.layout();
                }
            }
            IoVisitUi.refreshChip();
            IoVisitUi.placeMarks();
        }
    }

    // ---- where the yard is (QoL #667)
    /** Finds the yard's map cell: the map's own (a visit from the map), else the world snapshot's. True once known. */
    private static locate(): boolean {
        if (IoVisitUi._at) {
            return true;
        }
        let cell: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
        if (IoVisitUi._fromMap && cell) {
            IoVisitUi._at = { "x": cell.X, "y": cell.Y, "prot": cell._protected ? Number(cell._ioProtUntil) : 0, "pflag": cell._protected ? 1 : 0, "locked": cell._locked | 0, "aid": cell._allianceID | 0, "online": cell._online ? 1 : 0, "alliance": cell._alliance ? cell._alliance.name : null };
            IoVisitUi.found();
            return true;
        }
        if (!IoMapSnapshot.ready) {
            // (asked for at most every few minutes: IoMapSnapshot keeps to its own gaps)
            IoMapSnapshot.Request();
            return false;
        }
        for (let entry of as3.values(IoMapSnapshot.cells)) {
            if ((entry[2] | 0) >= 2 && String(Number(entry[4])) == IoVisitUi._baseId) {
                let player: any = IoMapSnapshot.PlayerInfo(entry[3] | 0);
                let now: number = GLOBAL.Timestamp();
                IoVisitUi._at = { "x": entry[0] | 0, "y": entry[1] | 0, "prot": Number(entry[9]) || 0, "pflag": Number(entry[9]) > now ? 1 : 0, "locked": entry[12] | 0, "aid": player ? player.alliance | 0 : 0, "online": -1, "alliance": null };
                IoVisitUi.found();
                return true;
            }
        }
        return false;
    }

    private static found(): void {
        // (QoL #667: the visit counts for the quest book's "look at yards" quest, once a cell, as from the map)
        if (IoVisitUi._at) {
            IoQuests.viewed(IoVisitUi._at.x | 0, IoVisitUi._at.y | 0);
        }
    }

    /** A map cell for the yard (from the snapshot), as the map makes one, for the map's yard window. */
    private static makeCell(): MapRoomCell {
        if (!IoVisitUi._at) {
            return null;
        }
        let x: int = IoVisitUi._at.x | 0;
        let y: int = IoVisitUi._at.y | 0;
        let data: any = IoMapSnapshot.CellAt(x, y);
        if (!data || !data.bid) {
            return null;
        }
        let c: MapRoomCell = new MapRoomCell();
        c.Setup(data);
        c.cellX = x;
        c.cellY = y;
        c._ioProtUntil = Number(IoVisitUi._at.prot) || 0;
        return c;
    }

    /** Hex steps between two cells (as MapRoomPopup.GetCellsInRange counts them). */
    private static hexDistance(x1: int, y1: int, x2: int, y2: int): int {
        let r1: int = (y1 - (x1 - (x1 & 1)) / 2) | 0;
        let r2: int = (y2 - (x2 - (x2 & 1)) / 2) | 0;
        let dq: int = (x2 - x1) | 0;
        let dr: int = (r2 - r1) | 0;
        return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) | 0;
    }

    /** Does one of the player's yards' Flingers reach it? 1 yes, 0 no, -1 not known (the Depths, no snapshot). */
    private static reach(): int {
        if (!IoVisitUi._at || !IoMapSnapshot.ready) {
            return -1;
        }
        let x: int = IoVisitUi._at.x | 0;
        let y: int = IoVisitUi._at.y | 0;
        if (IoUnderworld.isUnder(x, y)) {
            return -1;
        }
        for (let entry of as3.values(IoMapSnapshot.cells)) {
            if ((entry[3] | 0) != LOGIN._playerID || (entry[2] | 0) < 2 || IoUnderworld.isUnder(entry[0] | 0, entry[1] | 0)) {
                continue;
            }
            let range: int = BUILDING5.getFlingerRange(entry[6] | 0, (entry[2] | 0) == 2);
            if (IoVisitUi.hexDistance(entry[0] | 0, entry[1] | 0, x, y) <= range) {
                return 1;
            }
        }
        return 0;
    }

    // ---- who it is (QoL #669)
    private static isPlayerYard(): boolean {
        return IoVisitUi._uid > 0 && IoVisitUi._uid != LOGIN._playerID;
    }

    /** Who's Online's list (tags, online, last active), at most once a minute. */
    private static askWho(): void {
        if (!IoVisitUi.isPlayerYard() || IoVisitUi._whoAsked) {
            return;
        }
        let now: int = GLOBAL.Timestamp() | 0;
        if (IoVisitUi._who && now - IoVisitUi._whoAt < 60) {
            return;
        }
        IoVisitUi._whoAsked = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "chat/online", [["v", 1]], (r: any): void => {
            IoVisitUi._whoAsked = false;
            if (!r || r.error || !as3.is(r.players, Array)) {
                return;
            }
            let who: any = {};
            for (let p of as3.values(as3.as(r.players, Array))) {
                who[String(p.id | 0)] = p;
            }
            IoVisitUi._who = who;
            IoVisitUi._whoAt = GLOBAL.Timestamp() | 0;
            IoVisitUi.refreshChip();
        }, (e: IOErrorEvent): void => {
            IoVisitUi._whoAsked = false;
        });
    }

    private static whoEntry(): any {
        return IoVisitUi._who && IoVisitUi._uid > 0 ? IoVisitUi._who[String(IoVisitUi._uid)] || null : null;
    }

    private static stepEntry(): any {
        if (!IoVisitUi._steps || IoVisitUi._stepAt < 0 || IoVisitUi._stepAt >= IoVisitUi._steps.length) {
            return null;
        }
        let m: any = IoVisitUi._steps[IoVisitUi._stepAt];
        return m && (m.user_id | 0) == IoVisitUi._uid ? m : null;
    }

    /** The owner's alliance id (0: none). */
    private static allianceId(): int {
        if (IoVisitUi._at && (IoVisitUi._at.aid | 0) > 0) {
            return IoVisitUi._at.aid | 0;
        }
        let player: any = IoVisitUi._uid > 0 ? IoMapSnapshot.PlayerInfo(IoVisitUi._uid) : null;
        if (player && (player.alliance | 0) > 0) {
            return player.alliance | 0;
        }
        let w: any = IoVisitUi.whoEntry();
        if (w && (w.aid | 0) > 0) {
            return w.aid | 0;
        }
        if (IoVisitUi.stepEntry() && ALLIANCES._allianceID) {
            return ALLIANCES._allianceID | 0;
        }
        return 0;
    }

    /** The owner's alliance tag: as the chat shows it (Who's Online), else the default (its name's first 3 letters). */
    private static tag(aid: int): string {
        let w: any = IoVisitUi.whoEntry();
        if (w && w.tag) {
            return String(w.tag);
        }
        if (aid <= 0) {
            return "";
        }
        let name: string = null;
        let info: any = IoMapSnapshot.AllianceInfo(aid);
        if (info && info.name) {
            name = String(info.name);
        } else if (IoVisitUi._at && IoVisitUi._at.alliance) {
            name = String(IoVisitUi._at.alliance);
        } else if (aid == ALLIANCES._allianceID) {
            name = ALLIANCES.AllianceName();
        }
        if (!name) {
            return "";
        }
        let chars: string = name.replace(/[^0-9A-Za-zÀ-ɏ]/g, "");
        return (chars.length > 0 ? chars : name.replace(/^\s+/, "")).substr(0, 3);
    }

    /** How the player stands with the owner: "you", "ally", "friendly", "hostile", "neutral" or "none". */
    private static stance(aid: int): string {
        if (IoVisitUi._uid == LOGIN._playerID) {
            return "you";
        }
        if (aid <= 0) {
            return "none";
        }
        if (ALLIANCES._allianceID && aid == ALLIANCES._allianceID) {
            return "ally";
        }
        // (the stance the player's alliance set towards theirs, as the chat's tag colours: BYMChat.ioTagColor)
        let mine: any = ALLIANCES._myAlliance as any;
        let rel: number = mine && mine.relationships ? Number(mine.relationships[aid]) | 0 : 0;
        return rel < 0 ? "hostile" : (rel > 0 ? "friendly" : "neutral");
    }

    /** { online: true / false / null (not known), seen: when last active (server time), 0 not known }. */
    private static status(): any {
        let m: any = IoVisitUi.stepEntry();
        if (m) {
            return { "online": Boolean(m.status && m.status.online), "seen": Number(m.last_seen) || 0 };
        }
        let w: any = IoVisitUi.whoEntry();
        if (w) {
            return { "online": Boolean(w.online), "seen": Number(w.at) || 0 };
        }
        if (IoVisitUi._at && (IoVisitUi._at.online | 0) >= 0 && IoVisitUi._fromMap) {
            return { "online": (IoVisitUi._at.online | 0) == 1, "seen": 0 };
        }
        return { "online": null, "seen": 0 };
    }

    private static chipNameHtml(): string {
        let aid: int = IoVisitUi.allianceId();
        let tag: string = IoVisitUi.tag(aid);
        let html: string = tag ? "<font color=\"#E8E0D8\">[</font><font color=\"" + IoWhosOnline.tagColor(aid) + "\">" + IoMapUi.escape(tag) + "</font><font color=\"#E8E0D8\">]</font> " : "";
        html += "<font color=\"#FFD24A\">" + IoMapUi.escape(IoVisitUi._name || "?") + "</font>";
        let player: any = IoVisitUi._uid > 0 ? IoMapSnapshot.PlayerInfo(IoVisitUi._uid) : null;
        if (player && (player.level | 0) > 0) {
            html += " <font color=\"#B8B0A8\">" + KEYS.Get("io_visit_level", { "v1": player.level | 0 }) + "</font>";
        }
        return html;
    }

    private static chipInfoHtml(): string {
        let parts: any[] = [];
        let aid: int = IoVisitUi.allianceId();
        parts.push("<font color=\"" + IoWhosOnline.tagColor(aid) + "\">" + KEYS.Get("io_visit_stance_" + IoVisitUi.stance(aid)) + "</font>");
        if (IoVisitUi._at) {
            parts.push(IoMapUi.coord(IoVisitUi._at.x | 0, IoVisitUi._at.y | 0));
        } else if (IoVisitUi._looks < IoVisitUi.LOOKS) {
            parts.push("…");
        }
        let now: number = GLOBAL.Timestamp();
        if (IoVisitUi._at && Number(IoVisitUi._at.prot) > now) {
            parts.push("<font color=\"#7DB8FF\">" + KEYS.Get("io_visit_protected", { "v1": GLOBAL.ioDuration(Number(IoVisitUi._at.prot) - now) }) + "</font>");
        } else if (IoVisitUi._at ? (IoVisitUi._at.pflag | 0) == 1 : BASE._isProtected > 0) {
            parts.push("<font color=\"#7DB8FF\">" + KEYS.Get("io_visit_protected_on") + "</font>");
        }
        let st: any = IoVisitUi.status();
        if (st.online === true) {
            parts.push("<font color=\"#5BE04A\">" + KEYS.Get("io_visit_online") + "</font>");
        } else if (Number(st.seen) > 0) {
            parts.push(KEYS.Get("io_visit_seen", { "v1": IoAllianceUi.ago(Number(st.seen)) }));
        }
        return parts.join("  ·  ");
    }

    private static refreshChip(): void {
        if (IoVisitUi._chipName) {
            IoVisitUi._chipName.htmlText = IoVisitUi.chipNameHtml();
        }
        if (IoVisitUi._chipInfo) {
            IoVisitUi._chipInfo.htmlText = IoVisitUi.chipInfoHtml();
        }
        if (IoVisitUi._chipDot) {
            let st: any = IoVisitUi.status();
            let g: any = IoVisitUi._chipDot.graphics;
            g.clear();
            if (st.online != null) {
                g.lineStyle(1, (st.online ? 0x1E7A12 : 0x5A5A5A) >>> 0, 1);
                g.beginFill((st.online ? 0x35C21F : 0x8A8A8A) >>> 0, 1);
                g.drawCircle(0, 0, 4);
                g.endFill();
            }
        }
    }

    /** The chip's click: the chat's name menu for the owner (Send a message, Mention, Jump, Find, Copy, Ignore). */
    private static chipClick(e: MouseEvent): void {
        if (!IoVisitUi.isPlayerYard()) {
            return;
        }
        let aid: int = IoVisitUi.allianceId();
        let st: any = IoVisitUi.status();
        let uid: string = String(IoVisitUi._uid);
        let ignored: boolean = Chat._bymChat != null && Chat._bymChat.userIsIgnored(uid);
        let ago: number = st.online === true || !(Number(st.seen) > 0) ? 0 : Math.max(60, GLOBAL.Timestamp() - Number(st.seen));
        IoChatMenu.Show(uid, IoVisitUi._name, ignored, e.stageX, e.stageY, { "tag": IoVisitUi.tag(aid) || null, "aid": aid, "online": st.online, "ago": ago });
    }

    // ---- the panel
    private static label(size: int, width: int, bold: boolean = false): TextField {
        let t: TextField = IoMapUi.label("", size, IoMapUi.LIGHT, bold, width);
        t.mouseEnabled = false;
        return t;
    }

    /** Draws the panel again (the yard found, a bookmark made). */
    private static layout(): void {
        let p: Sprite = IoVisitUi._panel;
        if (!p) {
            return;
        }
        while (p.numChildren > 0) {
            p.removeChildAt(0);
        }
        p.graphics.clear();
        IoVisitUi._chipName = null;
        IoVisitUi._chipInfo = null;
        IoVisitUi._chipDot = null;
        const W: int = IoVisitUi.W;
        const PAD: int = IoVisitUi.PAD;
        const GAP: int = 6;
        let inner: int = (W - PAD * 2) | 0;
        let y: int = PAD;
        let player: boolean = IoVisitUi.isPlayerYard();
        if (player) {
            let chip: Sprite = new Sprite();
            chip.name = "ioVisitChip";
            chip.buttonMode = true;
            chip.mouseChildren = false;
            chip.x = PAD;
            chip.y = y;
            let hover: Shape = new Shape();
            IoMapUi.roundBox(hover.graphics, 0, 0, inner, IoVisitUi.CHIP_H, 0x54391F, 1, -1, 6);
            hover.alpha = 0;
            chip.addChild(hover);
            // (a hit area the size of the chip: the texts take no clicks)
            IoMapUi.hitArea(chip.graphics, inner, IoVisitUi.CHIP_H);
            let dot: Shape = new Shape();
            dot.x = 10;
            dot.y = 11;
            chip.addChild(dot);
            IoVisitUi._chipDot = dot;
            let name: TextField = IoVisitUi.label(13, inner - 24, true);
            name.name = "ioVisitChipName";
            name.x = 18;
            name.y = 1;
            name.height = 20;
            chip.addChild(name);
            IoVisitUi._chipName = name;
            let info: TextField = IoVisitUi.label(10, inner - 8, false);
            info.name = "ioVisitChipInfo";
            info.x = 4;
            info.y = 20;
            info.height = 17;
            chip.addChild(info);
            IoVisitUi._chipInfo = info;
            chip.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                hover.alpha = 1;
            });
            chip.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                hover.alpha = 0;
            });
            chip.addEventListener(MouseEvent.CLICK, IoVisitUi.chipClick);
            p.addChild(chip);
            y += IoVisitUi.CHIP_H + 4;
            // (QoL #65: what destroying it all would give, from what can be seen here: ATTACK.ioLootEstimate; the
            // view mode's top bar has no counters to show it in)
            let loot: any[] = ATTACK.ioLootEstimate();
            let lootText: string = loot ? ATTACK.ioLootLine(loot) : "";
            if (lootText) {
                let lt: TextField = IoVisitUi.label(10, inner, false);
                lt.name = "ioVisitLoot";
                lt.htmlText = '<font color="#E8C77A">' + KEYS.Get("io_visit_loot") + "</font> " + lootText;
                lt.x = PAD + 4;
                lt.y = y - 2;
                lt.height = 16;
                GLOBAL.ioFitText(lt, 8);
                p.addChild(lt);
                y += 16;
            }
        }
        // Bookmark, Share (QoL #672); Open on map, Attack (QoL #667: a visit from elsewhere than the map)
        let known: boolean = IoVisitUi._at != null;
        let marked: boolean = known && IoVisitUi.bookmarked();
        let buttons: any[] = [];
        buttons.push([marked ? KEYS.Get("io_visit_bookmarked") : KEYS.Get("io_visit_bookmark"), "ioVisitBookmark", IoVisitUi.bookmarkClick, "grey", known && !marked, 1]);
        buttons.push([KEYS.Get("io_visit_share"), "ioVisitShare", IoVisitUi.shareClick, "grey", known, 1]);
        // (QoL #673: the yard's layout, without its traps, as the Yard Planner's Import code)
        buttons.push([KEYS.Get("io_plan3_copy_btn"), "ioPlan3CopyLayout", IoPlanShare.CopyVisitedLayout, "grey", GLOBAL.INFERNO_ONLY, 1.3]);
        if (player && !IoVisitUi._fromMap) {
            buttons.push([KEYS.Get("io_visit_open_map"), "ioVisitOpenMap", IoVisitUi.openMapClick, "grey", true, 1.45]);
            if (IoVisitUi.offerAttack()) {
                buttons.push([KEYS.Get("map_attack_btn"), "ioVisitAttack", IoVisitUi.attackClick, "gold", true, 1]);
            }
        }
        // (16 October, the user's: "the end attack or return home in the same bar as the others") the visitor bar's
        // buttons (Return Home, or Open Map, Attack and Home) with the card's, last: the bar itself is hidden while
        // the card shows (UI_VISITOR.ioDress)
        let acts: any[] = player || known ? IoVisitUi.visitorActs() : [];
        for (let a of acts) {
            buttons.push(a);
        }
        IoVisitUi._actsSig = IoVisitUi.actsSig(acts);
        // (more than four: two rows, the first the longer)
        let firstRow: int = Math.ceil(buttons.length / 2) | 0;
        let rows: any[] = buttons.length > 4 ? [buttons.slice(0, firstRow), buttons.slice(firstRow)] : [buttons];
        for (let ri: int = 0; ri < rows.length; ri++) {
        let rowButtons: any[] = rows[ri];
        if (ri > 0) {
            y += IoVisitUi.ROW_H + GAP;
        }
        let weights: number = 0;
        for (let b of as3.values(rowButtons)) {
            weights += Number(b[5]);
        }
        let room: number = inner - GAP * (rowButtons.length - 1);
        let x: number = PAD;
        for (let i: int = 0; i < rowButtons.length; i++) {
            let spec: any[] = rowButtons[i];
            let w: int = i == rowButtons.length - 1 ? (PAD + inner - Math.round(x)) | 0 : Math.floor(room * Number(spec[5]) / weights) | 0;
            let btn: any = IoMapUi.button(String(spec[0]), w, IoVisitUi.ROW_H, spec[2], String(spec[3]), 11);
            btn.name = String(spec[1]);
            btn.x = Math.round(x);
            btn.y = y;
            if (!spec[4]) {
                btn.setEnabled(false);
            }
            GLOBAL.ioFitText(btn.getChildAt(btn.numChildren - 1), 8);
            p.addChild(btn);
            x += w + GAP;
        }
        }
        y += IoVisitUi.ROW_H + GAP;
        // ◀ Back to Members ▶ (QoL #668)
        if (IoVisitUi._steps && IoVisitUi._steps.length > 0) {
            let arrow: int = 34;
            let prev: any = IoMapUi.button("◀", arrow, IoVisitUi.ROW_H, (e: MouseEvent): void => {
                IoVisitUi.goStep((IoVisitUi._stepAt - 1) | 0);
            }, "grey", 11);
            prev.name = "ioVisitPrev";
            prev.x = PAD;
            prev.y = y;
            p.addChild(prev);
            let back: any = IoMapUi.button(KEYS.Get("io_visit_back_members", { "v1": IoVisitUi._stepAt + 1, "v2": IoVisitUi._steps.length }), inner - (arrow + GAP) * 2, IoVisitUi.ROW_H, IoVisitUi.backToMembers, "grey", 11);
            back.name = "ioVisitBackMembers";
            back.x = PAD + arrow + GAP;
            back.y = y;
            p.addChild(back);
            let next: any = IoMapUi.button("▶", arrow, IoVisitUi.ROW_H, (e: MouseEvent): void => {
                IoVisitUi.goStep((IoVisitUi._stepAt + 1) | 0);
            }, "grey", 11);
            next.name = "ioVisitNext";
            next.x = PAD + inner - arrow;
            next.y = y;
            p.addChild(next);
            if (IoVisitUi._steps.length < 2) {
                prev.setEnabled(false);
                next.setEnabled(false);
            }
            y += IoVisitUi.ROW_H + GAP;
        }
        IoVisitUi._h = (y - GAP + PAD) | 0;
        IoMapUi.glass(p.graphics, W, IoVisitUi._h, 9);
        // a tribe's yard not found on the map: nothing to show
        p.visible = player || known;
        IoVisitUi.refreshChip();
        IoVisitUi.place();
    }

    private static stop(e: MouseEvent): void {
        e.stopPropagation();
    }

    /**
     * (16 October) Is the card showing? Then the visitor bar's buttons are in it, and the bar is hidden
     * (UI_VISITOR.ioDress); without a card (a tribe's yard not on the map, an attack) the bar shows them.
     */
    public static get hasCard(): boolean {
        let p: Sprite = IoVisitUi._panel;
        return p != null && p.visible && p.stage != null;
    }

    /** The visitor bar's buttons as the card's: [label, name, click, style, enabled, weight] (UI_VISITOR.ioActions). */
    private static visitorActs(): any[] {
        try {
            return UI2._visitor ? UI2._visitor.ioActions() : [];
        } catch (e) {
            return [];
        }
    }

    /** What the card was laid out with of the bar's buttons: a change (a label, Enabled) lays it out again. */
    private static actsSig(acts: any[]): string {
        return acts.map((a: any): string => a[1] + ":" + a[0] + ":" + a[3] + ":" + a[4]).join(",");
    }

    /** Over the visitor bar, right-aligned with it. */
    private static place(): void {
        let p: Sprite = IoVisitUi._panel;
        if (!p || !GLOBAL._SCREEN) {
            return;
        }
        let bar: Rectangle = null;
        try {
            if (UI2._visitor && UI2._visitor.mc && UI2._visitor.mc.mcBG && UI2._visitor.mc.stage) {
                bar = UI2._visitor.mc.mcBG.getBounds(GLOBAL._layerUI);
            }
        } catch (e) {
            bar = null;
        }
        let right: number = bar ? bar.right : GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - 10;
        // (the bar hidden, its buttons in the card: the card where the bar was)
        let barShown: boolean = bar != null && UI2._visitor.mc.visible;
        let bottom: number = bar ? (barShown ? bar.top - 6 : bar.bottom) : (GLOBAL._SCREENHUD ? GLOBAL._SCREENHUD.y : GLOBAL._SCREEN.bottom) - 70;
        let x: number = Math.round(Math.max(GLOBAL._SCREEN.x + 6, right - IoVisitUi.W));
        let y: number = Math.round(Math.max(GLOBAL._SCREEN.y + 6, bottom - IoVisitUi._h));
        if (p.x != x || p.y != y) {
            p.x = x;
            p.y = y;
        }
    }

    // ---- Bookmark and Share (QoL #672)
    /**
     * The map's bookmarks as the map would have them: they are read from the login's data only when the map opens
     * (MapRoomPopup.Setup); one added before then would have been written over the first.
     */
    private static syncBookmarks(): void {
        if (MapRoom._bookmarks.length > 0) {
            return;
        }
        let count: int = MapRoom.BookmarkDataGet("mbms");
        for (let i: int = 0; i < count; i++) {
            let at: int = MapRoom.BookmarkDataGet("mbm" + i);
            let bx: int = (at / 10000) | 0;
            let by: int = (at - bx * 10000) | 0;
            MapRoom._currentPosition = new Point(bx, by);
            MapRoom.AddBookmark(MapRoom.BookmarkDataGetStr("mbmn" + i), false);
        }
    }

    private static bookmarked(): boolean {
        IoVisitUi.syncBookmarks();
        return IoVisitUi._at != null && MapRoom.ioBookmarkIndex(IoVisitUi._at.x | 0, IoVisitUi._at.y | 0) >= 0;
    }

    private static bookmarkClick(e: MouseEvent = null): void {
        if (!IoVisitUi._at) {
            return;
        }
        if (IoVisitUi.bookmarked()) {
            IoToast.Show(KEYS.Get("newmap_bm_done"), 3000);
            IoVisitUi.layout();
            return;
        }
        let name: string = String(IoVisitUi._name || "").replace(/^\s+|\s+$/g, "");
        if (!name) {
            name = IoMapUi.coord(IoVisitUi._at.x | 0, IoVisitUi._at.y | 0);
        }
        name = name.substr(0, 20);
        let r: any = MapRoom.ioAddBookmarkAt(IoVisitUi._at.x | 0, IoVisitUi._at.y | 0, name);
        if (r && String(r.message) == "SUCCESS") {
            IoToast.Show(KEYS.Get("io_visit_bookmark_done", { "v1": IoMapUi.escape(name) }), 4000);
        } else if (r && r.message) {
            GLOBAL.Message(String(r.message));
        }
        IoVisitUi.layout();
    }

    private static shareClick(e: MouseEvent = null): void {
        if (!IoVisitUi._at || !IoVisitUi._panel) {
            return;
        }
        let btn: DisplayObject = IoVisitUi._panel.getChildByName("ioVisitShare");
        let at: Point = btn ? GLOBAL._layerTop.globalToLocal(btn.localToGlobal(new Point(btn.width / 2, 0))) : new Point(GLOBAL._SCREENCENTER.x, GLOBAL._SCREENCENTER.y);
        IoMapShare.ShowChooser(GLOBAL._layerTop, at.x, at.y, GLOBAL._SCREEN, IoVisitUi._at.x | 0, IoVisitUi._at.y | 0);
    }

    // ---- Open on map, Attack (QoL #667)
    private static offerAttack(): boolean {
        if (!IoVisitUi._at || IoVisitUi._fromMap || !IoVisitUi.isPlayerYard()) {
            return false;
        }
        let s: string = IoVisitUi.stance(IoVisitUi.allianceId());
        if (s == "you" || s == "ally") {
            return false;
        }
        if (BASE.loadObject && BASE.loadObject.canattack == false && !GLOBAL.ioTestMode()) {
            return false;
        }
        // (none when it is known that none of the player's Flingers reaches it)
        return IoVisitUi.reach() != 0 || GLOBAL.ioTestMode();
    }

    private static openMapClick(e: MouseEvent = null): void {
        IoVisitUi.openOnMap(false);
    }

    private static attackClick(e: MouseEvent = null): void {
        if (!IoVisitUi._at) {
            return;
        }
        if (!GLOBAL.ioTestMode()) {
            if (!ATTACK.hasCreaturesToAttackWith) {
                GLOBAL.Message(KEYS.Get("msg_nocreaturesattack"));
                return;
            }
            let now: number = GLOBAL.Timestamp();
            if (Number(IoVisitUi._at.prot) > now) {
                GLOBAL.Message(KEYS.Get("newmap_dp") + " " + KEYS.Get("io_protected_left", { "v1": GLOBAL.ioDuration(Number(IoVisitUi._at.prot) - now) }));
                return;
            }
            if ((IoVisitUi._at.locked | 0) != 0 && (IoVisitUi._at.locked | 0) != LOGIN._playerID) {
                GLOBAL.Message(KEYS.Get("io_visit_locked"));
                return;
            }
            if (IoVisitUi.reach() == 0) {
                GLOBAL.Message(KEYS.Get("io_visit_out_of_range"));
                return;
            }
        }
        IoVisitUi.openOnMap(true);
    }

    /**
     * The map, open on the yard with its window, as the visitor bar's Open Map does for a yard opened from the map;
     * `attack`: and that window's Attack pressed once it is open, when it can be (MapRoom.ioActWait).
     */
    private static openOnMap(attack: boolean): void {
        if (BASE.ioAttackRunning() || BASE._loading) {
            return;
        }
        IoVisitUi.hideCard();
        let cell: MapRoomCell = MapRoomManager.instance.isInMapRoom2 ? IoVisitUi.makeCell() : null;
        if (!cell) {
            if (IoVisitUi._at) {
                IoMapShare.OpenOwnWorld(IoVisitUi._at.x | 0, IoVisitUi._at.y | 0);
            } else if (IoVisitUi.isPlayerYard()) {
                IoLeaderboards.JumpToPlayer(IoVisitUi._uid, IoVisitUi._name);
            }
            return;
        }
        GLOBAL._currentCell = cell;
        MapRoom.ioActWait = attack ? "attack" : "";
        MapRoomManager.instance.ioSetupAndShowYard();
        if (!GLOBAL.ioMapOpening()) {
            // (the map didn't open: the yard is not left with a map cell it didn't come from)
            GLOBAL._currentCell = null;
            MapRoom.ioActWait = "";
        }
    }

    // ---- the alliance mates' yards (QoL #668)
    /**
     * The Members list's "Visit yard": that member's yard, then ◀ ▶ through the list's others (in its order, those
     * with a yard, not the player), and Back to Members. `list`: the rows as the list shows them; `m`: the one clicked.
     */
    public static VisitMembers(list: any[], m: any): void {
        if (!GLOBAL.INFERNO_ONLY || !m) {
            return;
        }
        let steps: any[] = [];
        for (let r of as3.values(list || [])) {
            if (r && Number(r.base_id) > 0 && (r.user_id | 0) != LOGIN._playerID) {
                steps.push(r);
            }
        }
        let at: int = -1;
        for (let i: int = 0; i < steps.length; i++) {
            if ((steps[i].user_id | 0) == (m.user_id | 0)) {
                at = i;
                break;
            }
        }
        if (at < 0) {
            return;
        }
        IoVisitUi._steps = steps;
        IoVisitUi.goStep(at);
    }

    private static goStep(index: int): void {
        let n: int = IoVisitUi._steps ? IoVisitUi._steps.length | 0 : 0;
        if (n == 0 || BASE._loading || BASE.ioAttackRunning()) {
            return;
        }
        if (BASE._saving || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL.Message(KEYS.Get("io_visit_saving"));
            return;
        }
        let i: int = (((index % n) + n) % n) | 0;
        let r: any = IoVisitUi._steps[i];
        IoVisitUi._stepAt = i;
        ALLIANCEWINDOW.Hide();
        IoChatMenu.Hide();
        IoCritterMenu.Hide();
        IoVisitUi.hideCard();
        SOUNDS.Play("click1");
        GLOBAL._currentCell = null;
        let yardType: int = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
        BASE.LoadBase(null, 0, Number(r.base_id), GLOBAL.e_BASE_MODE.VIEW, false, yardType);
    }

    private static backToMembers(e: MouseEvent = null): void {
        ALLIANCEWINDOW.Show();
        if (ALLIANCEWINDOW._mc) {
            ALLIANCEWINDOW._mc.SelectTab(AllianceConstants.IO_TAB_MEMBERS);
        }
    }

    // ---- the yard's clicks: buildings (QoL #671), pets (QoL #676)
    private static listen(on: boolean): void {
        let layer: Sprite = GLOBAL._layerMap;
        if (on && !IoVisitUi._listening && layer) {
            layer.addEventListener(MouseEvent.MOUSE_DOWN, IoVisitUi.onMapDown);
            IoVisitUi._listening = true;
        } else if (!on && IoVisitUi._listening) {
            if (layer) {
                layer.removeEventListener(MouseEvent.MOUSE_DOWN, IoVisitUi.onMapDown);
            }
            if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, IoVisitUi.onStageUp, true);
            }
            IoVisitUi._listening = false;
            IoVisitUi._down = null;
        }
    }

    /** The pet drawn under the pointer (the yard's renderer draws them: they take no clicks of their own). */
    private static petUnder(): IoPet {
        if (!MAP._BUILDINGTOPS) {
            return null;
        }
        let mx: number = MAP._BUILDINGTOPS.mouseX;
        let my: number = MAP._BUILDINGTOPS.mouseY;
        let best: IoPet = null;
        let bestD: number = 1e9;
        for (let pet of as3.values(IoPets.walking)) {
            let b: any = pet.box;
            if (mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 4 && my <= b.y + b.h + 4) {
                let d: number = Math.abs(mx - (b.x + b.w / 2)) + Math.abs(my - (b.y + b.h / 2));
                if (d < bestD) {
                    bestD = d;
                    best = as3.as(pet, IoPet);
                }
            }
        }
        return best;
    }

    /** The building whose hit area this is (or is in), or null. */
    private static buildingAt(target: any): BFOUNDATION {
        let d: DisplayObject = as3.as(target, DisplayObject);
        if (!d) {
            return null;
        }
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b && b._mcHit && (b._mcHit == d || b._mcHit.contains(d))) {
                return as3.as(b, BFOUNDATION);
            }
        }
        return null;
    }

    /** A building that gets a card: not a sign (it reads itself out), a trap, a taunt or gift, or a mushroom. */
    private static carded(b: BFOUNDATION): boolean {
        if (!b || b instanceof IoSign) {
            return false;
        }
        let c: string = String(b._class);
        return c != "trap" && c != "taunt" && c != "gift" && c != "mushroom" && GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP && GLOBAL.mode != GLOBAL.e_BASE_MODE.IHELP;
    }

    private static onMapDown(e: MouseEvent): void {
        if (!IoVisitUi.stillHere() || !GLOBAL._ROOT || !GLOBAL._ROOT.stage) {
            return;
        }
        IoVisitUi.hideTip();
        let stage: Stage = GLOBAL._ROOT.stage;
        let pet: IoPet = IoVisitUi.petUnder();
        let b: BFOUNDATION = pet ? null : IoVisitUi.buildingAt(e.target);
        if (!pet && !IoVisitUi.carded(b)) {
            IoVisitUi._down = null;
            return;
        }
        IoVisitUi._down = { "x": stage.mouseX, "y": stage.mouseY, "pet": pet, "b": b };
        // (the capture phase: before the yard's own mouse-up forgets whether it was dragged)
        stage.removeEventListener(MouseEvent.MOUSE_UP, IoVisitUi.onStageUp, true);
        stage.addEventListener(MouseEvent.MOUSE_UP, IoVisitUi.onStageUp, true, (int.MAX_VALUE - 1) | 0);
    }

    private static onStageUp(e: MouseEvent): void {
        let stage: Stage = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        if (stage) {
            stage.removeEventListener(MouseEvent.MOUSE_UP, IoVisitUi.onStageUp, true);
        }
        let was: any = IoVisitUi._down;
        IoVisitUi._down = null;
        if (!was || !stage || !IoVisitUi.stillHere() || MAP._dragged) {
            return;
        }
        if (Math.abs(stage.mouseX - Number(was.x)) + Math.abs(stage.mouseY - Number(was.y)) > 8) {
            return;
        }
        if (was.pet) {
            if (IoVisitUi.petUnder() == was.pet) {
                IoVisitUi.petCard(as3.as(was.pet, IoPet));
            }
            return;
        }
        if (was.b && IoVisitUi.buildingAt(e.target) == was.b) {
            IoVisitUi.showCard(as3.as(was.b, BFOUNDATION));
        }
    }

    /** (QoL #676) a pet: whose it is, its name and its kind. */
    private static petCard(pet: IoPet): void {
        if (!pet) {
            return;
        }
        IoVisitUi.hideCard();
        SOUNDS.Play("click1");
        let kind: string = IoPetsPanel.monsterName(pet.monster);
        let title: string = pet.petName ? pet.petName : kind;
        let parts: any[] = [];
        if (pet.petName) {
            parts.push(kind);
        }
        if (pet.big) {
            parts.push(KEYS.Get("io_visit_pet_big"));
        }
        if (IoVisitUi._name) {
            parts.push(KEYS.Get("io_visit_pet_of", { "v1": IoVisitUi._name }));
        }
        IoCritterMenu.Show(title, parts.join(" · "), []);
    }

    // ---- the building card (QoL #671)
    private static resName(r: int): string {
        return KEYS.Get(as3.str(GLOBAL._resourceNames[r - 1]));
    }

    private static yardHas(r: int): number {
        try {
            let v: any = BASE._resources ? BASE._resources["r" + r] : null;
            return v ? Math.max(0, Number(v.Get())) : 0;
        } catch (e) {
        }
        return 0;
    }

    /**
     * What destroying a storage takes from the yard (as BSTORAGE.Destroyed counts it: a share of each resource, up to
     * a cap; half the Magma), resource by resource, or null when the yard's resources are not known.
     */
    private static lootIfDestroyed(b: BFOUNDATION): any[] {
        // (the rule BSTORAGE.Destroyed uses, shared with the scouting estimate: ATTACK.ioStorageLoot)
        let out: any[] = [];
        let some: boolean = false;
        for (let r: int = 1; r < 5; r++) {
            let v: number = ATTACK.ioStorageLoot(b._type, r, IoVisitUi.yardHas(r), ATTACK.ioWildYard());
            if (v > 0) {
                some = true;
                out.push([r, v]);
            }
        }
        return some ? out : null;
    }

    private static cardLines(b: BFOUNDATION): any[] {
        let lines: any[] = [];
        let props: any = GLOBAL._buildingProps[b._type - 1] || b._buildingProps || {};
        let lvl: int = b.getEffectiveLevel();
        let muted: string = "#B8B0A8";
        if (props.costs && props.costs.length > 1 && lvl > 0) {
            let level: string = KEYS.Get("bdg_level", { "v1": lvl });
            if (b._fortification && b._fortification.Get() > 0) {
                level += "  ·  " + KEYS.Get("io_visit_card_fortified", { "v1": b._fortification.Get() });
            }
            lines.push("<font color=\"" + muted + "\">" + level + "</font>");
        }
        let hp: number = Math.max(0, Math.floor(b.health));
        let max: number = Math.max(1, Math.floor(b.maxHealth));
        if (hp <= 0 || b._destroyed) {
            lines.push("<font color=\"#FF6A4A\">" + KEYS.Get("io_visit_card_destroyed") + "</font>");
        } else {
            let colour: string = hp < max * 0.5 ? "#FF6A4A" : (hp < max ? "#FFD84A" : "#E8E0D8");
            lines.push("<font color=\"" + colour + "\">" + KEYS.Get("io_visit_card_health", { "v1": GLOBAL.FormatNumber(hp), "v2": GLOBAL.FormatNumber(max) }) + "</font>");
        }
        if (b._countdownBuild && b._countdownBuild.Get() > 0) {
            lines.push("<font color=\"" + muted + "\">" + KEYS.Get("io_visit_card_building") + "</font>");
        } else if (b._countdownUpgrade && b._countdownUpgrade.Get() > 0) {
            lines.push("<font color=\"" + muted + "\">" + KEYS.Get("io_visit_card_upgrading") + "</font>");
        } else if (b._repairing) {
            lines.push("<font color=\"" + muted + "\">" + KEYS.Get("io_visit_card_repairing") + "</font>");
        }
        if (String(b._class) == "tower" && b._range > 0) {
            lines.push(KEYS.Get("io_visit_card_range", { "v1": GLOBAL.FormatNumber(b._range) }));
            let dmg: number = Number(b.damage);
            if (dmg > 0) {
                // (40 game steps a second, as the building's own stats line counts it: BFOUNDATION.Description)
                let perSecond: number = b._rate > 0 ? Math.round(dmg * 40 / b._rate) : 0;
                lines.push(perSecond > 0 ? KEYS.Get("io_visit_card_damage", { "v1": GLOBAL.FormatNumber(dmg), "v2": GLOBAL.FormatNumber(perSecond) }) : KEYS.Get("io_visit_card_damage_shot", { "v1": GLOBAL.FormatNumber(dmg) }));
            }
            if (b._splash > 0) {
                lines.push(KEYS.Get("io_visit_card_splash", { "v1": GLOBAL.FormatNumber(b._splash) }));
            }
        }
        if (b instanceof BSTORAGE) {
            let loot: any[] = IoVisitUi.lootIfDestroyed(b);
            if (loot) {
                lines.push("<font color=\"#FFD24A\">" + KEYS.Get("io_visit_card_loot") + "</font>");
                for (let l of as3.values(loot)) {
                    lines.push("  " + GLOBAL.ioShort(Number(l[1])) + " " + IoVisitUi.resName(l[0] | 0));
                }
            }
        } else if (b instanceof BRESOURCE && b._type >= 1 && b._type <= 4 && b._stored) {
            let held: number = Math.max(0, Number(b._stored.Get()));
            if (held > 0) {
                lines.push("<font color=\"#FFD24A\">" + KEYS.Get("io_visit_card_holds", { "v1": GLOBAL.ioShort(held), "v2": IoVisitUi.resName(b._type) }) + "</font>");
            }
        }
        return lines;
    }

    private static cardTitle(b: BFOUNDATION): string {
        let props: any = GLOBAL._buildingProps[b._type - 1] || b._buildingProps || {};
        let lvl: int = b.getEffectiveLevel();
        if (props.names && props.names.length > 1 && lvl > 0 && props.names.length >= lvl) {
            return KEYS.Get(as3.str(props.names[lvl - 1]));
        }
        return KEYS.Get(as3.str(props.name));
    }

    /** A building's card, by the pointer: read only. Goes on a click anywhere else, Escape, or the yard changing. */
    private static showCard(b: BFOUNDATION): void {
        IoVisitUi.hideCard();
        IoCritterMenu.Hide();
        if (!b || !GLOBAL._ROOT || !GLOBAL._ROOT.stage) {
            return;
        }
        SOUNDS.Play("click1");
        const W: int = 230;
        let c: Sprite = new Sprite();
        c.name = "ioVisitCard";
        let title: TextField = IoMapUi.label(IoVisitUi.cardTitle(b), 13, IoMapUi.LIGHT, true, W - 20);
        title.name = "ioVisitCardTitle";
        title.x = 10;
        title.y = 7;
        GLOBAL.ioFitText(title, 9);
        c.addChild(title);
        let body: TextField = IoMapUi.label("", 11, 0xE8E0D8, false, W - 20);
        body.name = "ioVisitCardText";
        body.multiline = true;
        body.wordWrap = true;
        body.autoSize = TextFieldAutoSize.LEFT;
        body.htmlText = IoVisitUi.cardLines(b).join("<br>");
        body.x = 10;
        body.y = 28;
        c.addChild(body);
        let h: int = Math.ceil(body.y + body.height + 8) | 0;
        // (27 November, 72's suggestion: Help out, a job here 5% nearer done, once a player a job: IoYardHelp)
        if (IoYardHelp.canHelp(b)) {
            let helped: boolean = IoYardHelp.helped(b);
            let hb: MovieClip = IoMapUi.button(KEYS.Get(helped ? "io_help_btn_done" : "io_help_btn", { "v1": Math.round(IoYardHelp.share * 100) }), W - 20, 26, (e: MouseEvent): void => {
                if (!IoYardHelp.helped(b)) {
                    IoYardHelp.help(b, (): void => {
                        if (IoVisitUi._card && IoVisitUi._card.parent) {
                            let at: Point = new Point(IoVisitUi._card.x, IoVisitUi._card.y);
                            IoVisitUi.showCard(b);
                            if (IoVisitUi._card) {
                                IoVisitUi._card.x = at.x;
                                IoVisitUi._card.y = at.y;
                            }
                        }
                    });
                }
            }, helped ? "grey" : "gold");
            hb.name = "ioVisitHelp";
            hb.x = 10;
            hb.y = h - 2;
            if (helped) {
                hb.alpha = 0.6;
                hb.mouseEnabled = false;
                hb.mouseChildren = false;
            }
            c.addChild(hb);
            h = (h + 32) | 0;
        }
        IoMapUi.glass(c.graphics, W, h, 8);
        c.addEventListener(MouseEvent.MOUSE_DOWN, IoVisitUi.stop);
        let stage: Stage = GLOBAL._ROOT.stage;
        let x: number = stage.mouseX + 14;
        if (x + W > stage.stageWidth - 6) {
            x = stage.mouseX - W - 14;
        }
        c.x = Math.max(6, Math.min(stage.stageWidth - W - 6, x)) | 0;
        c.y = Math.max(6, Math.min(stage.stageHeight - h - 6, stage.mouseY - 20)) | 0;
        GLOBAL._layerWindows.addChild(c);
        IoVisitUi._card = c;
        // (next frame: the click that opened it must not close it)
        c.addEventListener(Event.ENTER_FRAME, IoVisitUi.armCard);
    }

    private static armCard(e: Event): void {
        let c: Sprite = as3.as(e.currentTarget, Sprite);
        c.removeEventListener(Event.ENTER_FRAME, IoVisitUi.armCard);
        if (IoVisitUi._card == c && c.stage) {
            c.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoVisitUi.cardOutside, true, 0);
            c.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoVisitUi.cardKey);
        }
    }

    private static cardOutside(e: MouseEvent): void {
        let c: Sprite = IoVisitUi._card;
        let t: DisplayObject = as3.as(e.target, DisplayObject);
        while (t) {
            if (t == c) {
                return;
            }
            t = t.parent;
        }
        IoVisitUi.hideCard();
    }

    private static cardKey(e: KeyboardEvent): void {
        if (e.keyCode == 27) {
            IoVisitUi.hideCard();
        }
    }

    public static hideCard(): void {
        let c: Sprite = IoVisitUi._card;
        IoVisitUi._card = null;
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoVisitUi.cardOutside, true);
            GLOBAL._ROOT.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoVisitUi.cardKey);
        }
        if (c) {
            c.removeEventListener(Event.ENTER_FRAME, IoVisitUi.armCard);
            if (c.parent) {
                c.parent.removeChild(c);
            }
        }
    }

    // ---- signs with a message (QoL #676)
    private static markSigns(): void {
        if (!MAP._BUILDINGINFO) {
            return;
        }
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let s: IoSign = as3.as(b, IoSign);
            if (!s || !s._ioMsg || !s._mcHit) {
                continue;
            }
            let mark: Sprite = new Sprite();
            mark.name = "ioVisitSignMark";
            mark.mouseEnabled = false;
            mark.mouseChildren = false;
            let g: any = mark.graphics;
            // (a little speech bubble with three dots, over the sign)
            g.lineStyle(1.5, 0x5A3A1A, 1);
            g.beginFill(0xF3E2BE, 1);
            g.drawRoundRect(-11, -18, 22, 13, 8, 8);
            g.endFill();
            g.beginFill(0xF3E2BE, 1);
            g.moveTo(-4, -5.5);
            g.lineTo(0, 0);
            g.lineTo(4, -5.5);
            g.endFill();
            g.lineStyle();
            g.beginFill(0x5A3A1A, 1);
            g.drawCircle(-5, -11.5, 1.6);
            g.drawCircle(0, -11.5, 1.6);
            g.drawCircle(5, -11.5, 1.6);
            g.endFill();
            MAP._BUILDINGINFO.addChild(mark);
            IoVisitUi._marks.push({ "sign": s, "mark": mark });
            s._mcHit.addEventListener(MouseEvent.ROLL_OVER, IoVisitUi.signOver);
            s._mcHit.addEventListener(MouseEvent.ROLL_OUT, IoVisitUi.signOut);
        }
        IoVisitUi.placeMarks();
    }

    private static placeMarks(): void {
        for (let m of as3.values(IoVisitUi._marks)) {
            let s: IoSign = as3.as(m.sign, IoSign);
            let mark: Sprite = as3.as(m.mark, Sprite);
            if (!s || !mark || !s._mcHit || !mark.parent || !s._mcHit.stage) {
                continue;
            }
            let r: Rectangle = s._mcHit.getBounds(mark.parent);
            mark.x = Math.round(r.x + r.width / 2);
            mark.y = Math.round(r.y - 2);
        }
    }

    private static signFor(hit: any): IoSign {
        for (let m of as3.values(IoVisitUi._marks)) {
            let s: IoSign = as3.as(m.sign, IoSign);
            if (s && s._mcHit == hit) {
                return s;
            }
        }
        return null;
    }

    private static signOver(e: MouseEvent): void {
        let s: IoSign = IoVisitUi.signFor(e.currentTarget);
        if (!s || !s._ioMsg || !IoVisitUi.stillHere()) {
            return;
        }
        IoVisitUi.hideTip();
        let tip: Sprite = new Sprite();
        tip.name = "ioVisitSignTip";
        tip.mouseEnabled = false;
        tip.mouseChildren = false;
        let t: TextField = IoMapUi.label("", 12, IoMapUi.LIGHT, true, 240);
        t.name = "ioVisitSignTipText";
        t.multiline = true;
        t.wordWrap = true;
        t.autoSize = TextFieldAutoSize.LEFT;
        t.text = s._ioMsg;
        let w: number = Math.min(240, Math.ceil(t.textWidth) + 8);
        t.width = w;
        t.x = 9;
        t.y = 6;
        tip.addChild(t);
        IoMapUi.glass(tip.graphics, w + 18, Math.ceil(t.height) + 12, 8);
        GLOBAL._layerTop.addChild(tip);
        IoVisitUi._tip = tip;
        IoVisitUi._tipSign = s;
        IoVisitUi.moveTip();
    }

    private static signOut(e: MouseEvent): void {
        let s: IoSign = IoVisitUi.signFor(e.currentTarget);
        if (s && s == IoVisitUi._tipSign) {
            IoVisitUi.hideTip();
        }
    }

    private static moveTip(): void {
        let tip: Sprite = IoVisitUi._tip;
        if (!tip || !GLOBAL._ROOT || !GLOBAL._ROOT.stage) {
            return;
        }
        let stage: Stage = GLOBAL._ROOT.stage;
        let x: number = stage.mouseX + 16;
        if (x + tip.width > stage.stageWidth - 6) {
            x = stage.mouseX - tip.width - 10;
        }
        tip.x = Math.round(Math.max(6, x));
        tip.y = Math.round(Math.max(6, stage.mouseY - tip.height - 10));
    }

    private static hideTip(): void {
        if (IoVisitUi._tip && IoVisitUi._tip.parent) {
            IoVisitUi._tip.parent.removeChild(IoVisitUi._tip);
        }
        IoVisitUi._tip = null;
        IoVisitUi._tipSign = null;
    }
}
