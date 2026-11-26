import * as as3 from "as3";
import { ASObject } from "as3";
import { DisplayObject, DisplayObjectContainer, SimpleButton, Sprite, Stage } from "flash/display";
import { Rectangle } from "flash/geom";
import { Capabilities } from "flash/system";
import { TextField } from "flash/text";
import { getQualifiedClassName } from "flash/utils";
import { pick as pickAt, player as flashPlayer } from "flash/display/core";
import { BASE, Button, CREATURELOCKER, CREEPS, GLOBAL, IOBuild, IoBugReport, IoWatch, KEYS, LOGIN, POPUPS } from "@game";
import { runtimeHooks } from "../../../../flash/_runtime";

/**
 * Inferno-only (25 November, the user's: "Make it so right clicking shows options that are not game related like
 * "report a bug" or "suggest a change" allowing the user to highlight whatever their mouse is over and optionally
 * attach a screenshot or anything similar you can think of that belongs in the right click menu. Admin right clicks
 * should be noted as admin in the report a bug/etc. I want to be able to tell you to look at the things players said
 * and we can review and select what changes to make.").
 *
 * A right-click anywhere on the game (the player: runtimeHooks.contextMenu; Shift with it gives the browser's own menu)
 * opens this menu, drawn by the page over the game:
 *
 *   Report a bug… / Suggest a change…   a form with a screenshot taken at the right-click, what was under the
 *                                       pointer highlighted on it (Smaller / Bigger step through what it is part of;
 *                                       a click on the picture picks something else, a drag draws a box), the
 *                                       screenshot attached or not, the chat hidden in it or not, a picture of the
 *                                       player's own. Sent with where they are and their last clicks (IoBugReport).
 *   My reports                          what they sent, its status and the team's answer ("1 new" when there is one)
 *   Copy "text"                         the text under the pointer (a name, a chat line, a number)
 *   Copy game info                      the build, the account, where they are and the browser: for asking for help
 *   Save a screenshot                   the screen as a PNG, as it is (the interface too, unlike Photo mode)
 *   Full screen, Settings, Reload the game
 *
 * The server keeps the reports (POST feedback, feedback/mine: server/src/services/feedback/playerFeedback.ts) and
 * marks an admin's as an admin's (from the account, not from here). The settings menu has the same reports for
 * touch screens, which have no right-click (openReport).
 */

interface Part {
    o: DisplayObject | null;
    /** On the stage: x, y, w, h. */
    r: number[];
    label: string;
    target: string;
}

interface Shot {
    canvas: any;
    /** stage x -> picture x: (x - vx) * px */
    vx: number;
    vy: number;
    px: number;
}

export class IoFeedback extends ASObject {
    private static _installed: boolean = false;

    private static _menu: any = null;

    private static _glow: any = null;

    private static _dialog: any = null;

    private static _unseen: number = -1;

    private static _unseenAt: number = 0;

    private static readonly CSS: string = `
.iofb-menu { position: fixed; z-index: 2000; min-width: 230px; max-width: 320px; background: linear-gradient(#24090500, #1a0604), #1a0604; border: 1px solid #7a2a12; border-radius: 9px; box-shadow: 0 10px 34px rgba(0,0,0,.75), 0 0 18px rgba(255,90,20,.12); padding: 5px; font: 13px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f2dcc8; user-select: none; }
.iofb-menu .iofb-about { padding: 5px 9px 6px; color: #c9a68c; font-size: 12px; border-bottom: 1px solid #4a1a0c; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.iofb-menu .iofb-about b { color: #ffb070; font-weight: 600; }
.iofb-menu button { display: flex; width: 100%; align-items: center; gap: 9px; background: none; border: 0; color: inherit; font: inherit; text-align: left; padding: 6px 9px; border-radius: 6px; cursor: pointer; }
.iofb-menu button:hover:not(:disabled), .iofb-menu button:focus-visible { background: #4a170a; color: #fff1d8; outline: none; }
.iofb-menu button:disabled { opacity: .45; cursor: default; }
.iofb-menu button i { font-style: normal; width: 18px; text-align: center; flex: none; }
.iofb-menu button span.iofb-n { margin-left: auto; background: #ff6a1a; color: #1a0604; border-radius: 9px; padding: 0 6px; font-size: 11px; font-weight: 700; }
.iofb-menu hr { border: 0; border-top: 1px solid #4a1a0c; margin: 4px 2px; }
.iofb-menu .iofb-foot { padding: 4px 9px 2px; color: #8f6a55; font-size: 11px; }
.iofb-menu .iofb-admin { color: #ff8a5a; font-weight: 700; }
.iofb-glow { position: fixed; z-index: 1999; pointer-events: none; border: 2px solid #ff7a2a; border-radius: 4px; background: rgba(255,122,42,.12); box-shadow: 0 0 0 9999px rgba(0,0,0,.18), 0 0 12px rgba(255,122,42,.7); transition: all .08s; }
.iofb-shade { position: fixed; inset: 0; z-index: 2001; background: rgba(8,2,1,.72); display: flex; align-items: center; justify-content: center; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f2dcc8; }
.iofb-box { background: linear-gradient(#1e0805, #140403); border: 1px solid #7a2a12; border-radius: 12px; box-shadow: 0 0 30px rgba(255,80,20,.15), 0 14px 50px rgba(0,0,0,.8); padding: 14px 16px; width: min(900px, 96vw); max-height: 94vh; overflow: auto; box-sizing: border-box; }
.iofb-box h2 { margin: 0 0 10px; font: 400 18px "Groboldov", system-ui, sans-serif; letter-spacing: .6px; color: #ff9a4a; display: flex; gap: 10px; align-items: center; }
.iofb-box h2 .iofb-tabs { margin-left: auto; display: flex; gap: 4px; font: 13px system-ui, sans-serif; letter-spacing: 0; }
.iofb-box .iofb-tabs button { background: #2a0d08; border: 1px solid #6a2410; color: #d9b89e; border-radius: 6px; padding: 3px 9px; cursor: pointer; font: inherit; }
.iofb-box .iofb-tabs button.on { background: #55180a; color: #fff1d8; border-color: #ff7a2a; }
.iofb-cols { display: flex; gap: 16px; flex-wrap: wrap; }
.iofb-pic { flex: 1 1 380px; min-width: 260px; }
.iofb-pic canvas { width: 100%; height: auto; border: 1px solid #6a2410; border-radius: 6px; cursor: crosshair; display: block; background: #000; touch-action: none; }
.iofb-form { flex: 1 1 300px; min-width: 240px; display: flex; flex-direction: column; gap: 8px; }
.iofb-box textarea { width: 100%; box-sizing: border-box; min-height: 120px; resize: vertical; background: #2a0d08; color: #f2dcc8; border: 1px solid #6a2410; border-radius: 6px; padding: 8px; font: inherit; user-select: text; }
.iofb-box select { background: #2a0d08; color: #f2dcc8; border: 1px solid #6a2410; border-radius: 6px; padding: 3px 6px; font: inherit; }
.iofb-box .iofb-btn { background: linear-gradient(#3a1008, #250805); color: #ffd8b0; border: 1px solid #6a2410; border-radius: 6px; padding: 5px 10px; cursor: pointer; font: inherit; }
.iofb-box .iofb-btn:hover:not(:disabled) { background: linear-gradient(#55180a, #300a05); border-color: #ff7a2a; color: #fff1d8; }
.iofb-box .iofb-btn:disabled { opacity: .45; cursor: default; }
.iofb-box .iofb-go { background: linear-gradient(#d9561a, #a83a0e); color: #fff; border-color: #ff8a3a; font-weight: 600; padding: 7px 16px; }
.iofb-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.iofb-hint { color: #b88a70; font-size: 12px; }
.iofb-what { font-size: 13px; color: #ffcf9e; min-height: 18px; overflow-wrap: anywhere; }
.iofb-err { color: #ff8a7a; font-size: 13px; min-height: 18px; }
.iofb-ok { color: #9be08f; }
.iofb-badge { background: #7a1a0a; color: #ffd0b0; border: 1px solid #ff6a3a; border-radius: 5px; padding: 1px 6px; font: 600 11px system-ui, sans-serif; letter-spacing: .5px; }
.iofb-list { display: flex; flex-direction: column; gap: 8px; }
.iofb-item { border: 1px solid #4a1a0c; border-radius: 8px; padding: 8px 10px; background: #180604; }
.iofb-item .iofb-top { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #b88a70; }
.iofb-item .iofb-st { margin-left: auto; border-radius: 9px; padding: 0 8px; font-size: 11px; font-weight: 700; background: #3a1a10; color: #f2c8a8; }
.iofb-item .iofb-st.planned { background: #4a3a08; color: #ffe08a; } .iofb-item .iofb-st.done { background: #1a4a14; color: #b8f0a8; } .iofb-item .iofb-st.declined { background: #3a2a2a; color: #c8b0b0; }
.iofb-item .iofb-txt { white-space: pre-wrap; margin: 4px 0; overflow-wrap: anywhere; }
.iofb-item .iofb-reply { border-left: 3px solid #ff7a2a; padding: 4px 8px; margin-top: 6px; background: #240a05; white-space: pre-wrap; overflow-wrap: anywhere; }
.iofb-item .iofb-new { color: #ff9a4a; font-weight: 700; }
`;

    // ------------------------------------------------------------------ words

    /** The game's words for key, or the English given (#v1# and the like filled in). */
    private static t(key: string, en: string, vars: any = null): string {
        try {
            let said: string = String(KEYS.Get(key, vars));
            if (said && said != key) {
                return said;
            }
        } catch (e) {
        }
        let out: string = en;
        if (vars) {
            for (let k of Object.keys(vars)) {
                out = out.split("#" + k + "#").join(String(vars[k]));
            }
        }
        return out;
    }

    private static esc(v: any): string {
        return String(v == null ? "" : v).replace(/[&<>"']/g, (c: string): string => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" } as any)[c]);
    }

    // ------------------------------------------------------------------ set up

    /** GAME, once the stage is there: a right-click on the game opens the menu. */
    public static Install(stage: Stage): void {
        if (IoFeedback._installed || !GLOBAL.INFERNO_ONLY || typeof document === "undefined") {
            return;
        }
        IoFeedback._installed = true;
        let style: any = document.createElement("style");
        style.textContent = IoFeedback.CSS;
        document.head.appendChild(style);
        runtimeHooks.contextMenu = (cx: number, cy: number, sx: number, sy: number): void => {
            IoFeedback.openMenu(cx, cy, sx, sy);
        };
        document.addEventListener("contextmenu", (e: any): void => IoFeedback.pageMenu(e));
        document.addEventListener("pointerdown", (e: any): void => {
            if (IoFeedback._menu && !IoFeedback._menu.contains(e.target)) {
                IoFeedback.closeMenu();
            }
        }, true);
        window.addEventListener("keydown", (e: any): void => {
            if (e.key == "Escape") {
                if (IoFeedback._menu) {
                    e.preventDefault();
                    e.stopPropagation();
                    IoFeedback.closeMenu();
                } else if (IoFeedback._dialog) {
                    e.preventDefault();
                    e.stopPropagation();
                    IoFeedback.closeDialog();
                }
            }
        }, true);
        window.addEventListener("blur", (): void => IoFeedback.closeMenu());
        window.addEventListener("resize", (): void => IoFeedback.closeMenu());
    }

    private static loggedIn(): boolean {
        return !!(LOGIN.token && GLOBAL.serverUrl);
    }

    private static isAdmin(): boolean {
        return !!(GLOBAL._flags && (GLOBAL._flags.io_admin | 0) == 1);
    }

    private static stage(): Stage {
        return GLOBAL._ROOT && GLOBAL._ROOT.stage ? GLOBAL._ROOT.stage : (flashPlayer as any).stage;
    }

    // ------------------------------------------------------------------ what is under the pointer

    private static readonly GENERIC: RegExp = /^(MovieClip|Sprite|Shape|Bitmap|TextField|SimpleButton|Loader|emptyMc|GAME|DisplayObject|DisplayObjectContainer|InteractiveObject|Stage)$/;

    private static className(o: any): string {
        let c: string = getQualifiedClassName(o) || "";
        return c.substr(c.lastIndexOf(":") + 1);
    }

    /** What a click at (x, y) on the stage would hit (the tests: rightclick-sweep). */
    public static hitAt(x: number, y: number): any {
        try {
            return pickAt(IoFeedback.stage() as any, x, y).target;
        } catch (e) {
            return null;
        }
    }

    /** The deepest visible thing drawn at (x, y) on the stage, under c. */
    private static deepestAt(c: DisplayObjectContainer, x: number, y: number, depth: number = 0): DisplayObject {
        if (depth > 40) {
            return null;
        }
        for (let i: number = c.numChildren - 1; i >= 0; i--) {
            let ch: any = c.getChildAt(i);
            if (!ch || !ch.visible || ch.alpha <= 0.02 || ch.$maskOwner) {
                continue;
            }
            if (ch instanceof DisplayObjectContainer) {
                if (!ch.hitTestPoint(x, y, false)) {
                    continue;
                }
                let inner: DisplayObject = IoFeedback.deepestAt(ch, x, y, depth + 1);
                if (inner) {
                    return inner;
                }
                // (nothing of its children there: its own drawing, if it is there)
                if (ch.hitTestPoint(x, y, true)) {
                    return ch;
                }
            } else if (ch.hitTestPoint(x, y, false) && ch.hitTestPoint(x, y, true)) {
                return ch;
            }
        }
        return null;
    }

    /** "Sharpshooter Tower (level 3)". */
    private static buildingName(b: any): string {
        let props: any = GLOBAL._buildingProps ? GLOBAL._buildingProps[(b._type | 0) - 1] : null;
        let name: string = props && props.name ? KEYS.Get(String(props.name)) : "#" + b._type;
        let lvl: number = b._lvl && typeof b._lvl.Get == "function" ? b._lvl.Get() | 0 : 0;
        return lvl > 0 ? IoFeedback.t("io_fb_what_building", "#v1# (level #v2#)", { "v1": name, "v2": lvl }) : name;
    }

    /**
     * The yard's building at (x, y): the yard is drawn as one picture, so a building is found by its hit area (what a
     * click on it hits, see-through): the one under the pointer first, else the one nearest the front.
     */
    private static buildingAt(x: number, y: number): any {
        try {
            let over: any = GLOBAL._buildingMousedOver;
            let hits: (b: any) => boolean = (b: any): boolean => !!(b && b._mcHit && b._mcHit.stage && b._mcHit.hitTestPoint(x, y, true));
            if (hits(over)) {
                return over;
            }
            let best: any = null;
            let bestY: number = -Infinity;
            let all: any = BASE._buildingsAll || {};
            for (let id of Object.keys(all)) {
                let b: any = all[id];
                if (hits(b)) {
                    // (the front one: lowest on the screen)
                    let r: Rectangle = b._mcHit.getBounds(b._mcHit.stage);
                    if (r.y + r.height > bestY) {
                        bestY = r.y + r.height;
                        best = b;
                    }
                }
            }
            return best;
        } catch (e) {
            return null;
        }
    }

    /** The building or monster that o draws, if any. */
    private static gameThingOf(o: DisplayObject): string {
        let parts: (b: any) => any[] = (b: any): any[] => {
            let out: any[] = [];
            for (let k of ["_mc", "_mcBase", "_mcHit", "_mcFootprint", "_graphic", "_graphicMC"]) {
                try {
                    if (b[k]) {
                        out.push(b[k]);
                    }
                } catch (e) {
                }
            }
            return out;
        };
        try {
            let over: any = GLOBAL._buildingMousedOver;
            let all: any = BASE._buildingsAll || {};
            let list: any[] = over ? [over] : [];
            for (let id of Object.keys(all)) {
                list.push(all[id]);
            }
            for (let b of list) {
                if (b && parts(b).indexOf(o) >= 0) {
                    return IoFeedback.buildingName(b);
                }
            }
            let creeps: any = CREEPS._creeps || {};
            for (let id of Object.keys(creeps)) {
                let c: any = creeps[id];
                if (c && parts(c).indexOf(o) >= 0) {
                    let info: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[c._creatureID] : null;
                    return info && info.name ? KEYS.Get(String(info.name)) : String(c._creatureID || "?");
                }
            }
        } catch (e) {
        }
        return "";
    }

    /** The words on o: a button's label, else the first text inside it with letters in it (not a count on a badge). */
    private static textIn(o: DisplayObject, depth: number = 0): string {
        let found: string[] = [];
        IoFeedback.collectText(o, depth, found);
        for (let t of found) {
            if (/[^\d\s.,:%+\-×x\/]/.test(t)) {
                return t;
            }
        }
        return found.length ? found[0] : "";
    }

    private static collectText(o: DisplayObject, depth: number, out: string[]): void {
        if (!o || out.length >= 6) {
            return;
        }
        let own: any = (o as any).label;
        if (typeof own == "string" && own.trim()) {
            out.push(own.replace(/\s+/g, " ").trim());
            return;
        }
        if (o instanceof TextField) {
            let t: string = String(as3.cast(o, TextField).text || "").replace(/\s+/g, " ").trim();
            if (t) {
                out.push(t);
            }
            return;
        }
        if (o instanceof Button && as3.cast(o, Button)._txt && as3.cast(o, Button)._txt.text) {
            out.push(String(as3.cast(o, Button)._txt.text).replace(/\s+/g, " ").trim());
            return;
        }
        if (depth < 4 && o instanceof DisplayObjectContainer) {
            let c: DisplayObjectContainer = as3.cast(o, DisplayObjectContainer);
            for (let i: number = 0; i < c.numChildren; i++) {
                let ch: DisplayObject = c.getChildAt(i);
                if (ch && ch.visible) {
                    IoFeedback.collectText(ch, depth + 1, out);
                }
            }
        }
    }

    /** The part of the screen o is in, in the player's words ("the chat", "the top bar"), or "". */
    private static areaOf(o: DisplayObject): string {
        for (let p: DisplayObject = o; p && !(p instanceof Stage); p = p.parent) {
            let cls: string = IoFeedback.className(p);
            if (cls == "BYMChat" || cls == "ChatBox") {
                return IoFeedback.t("io_fb_area_chat", "the chat");
            }
            if (cls == "UI_TOP") {
                return IoFeedback.t("io_fb_area_top", "the top bar");
            }
            if (cls == "UI_MENU") {
                return IoFeedback.t("io_fb_area_menu", "the menu at the bottom");
            }
            if (cls == "UI_MISSIONMENU") {
                return IoFeedback.t("io_fb_area_quests", "the quest panel");
            }
            if (p == (POPUPS as any)._mc || (p.parent && [GLOBAL._layerWindows, GLOBAL._layerMessages, GLOBAL._layerTop].indexOf(p.parent as any) >= 0)) {
                let title: string = IoFeedback.titleOf(p);
                return title ? IoFeedback.t("io_fb_area_window_named", "the “#v1#” window", { "v1": title }) : IoFeedback.t("io_fb_area_window", "the window");
            }
            if (GLOBAL._layerMap && p == (GLOBAL._layerMap as any)) {
                return IoFeedback.t("io_fb_area_yard", "the yard");
            }
        }
        return "";
    }

    private static cut(s: string, n: number): string {
        return s.length > n ? s.substr(0, n - 1) + "…" : s;
    }

    /** The visible texts on the stage and their boxes, for one right-click (textUnder). */
    private static _texts: any[] = null;

    private static visibleTexts(): any[] {
        if (IoFeedback._texts) {
            return IoFeedback._texts;
        }
        let out: any[] = [];
        let stage: Stage = IoFeedback.stage();
        let walk: (d: any, depth: number) => void = (d: any, depth: number): void => {
            if (!d || !d.visible || d.alpha <= 0.02 || depth > 40 || out.length > 3000) {
                return;
            }
            if (d instanceof TextField) {
                let t: string = String(d.text || "").replace(/\s+/g, " ").trim();
                if (t) {
                    try {
                        let b: Rectangle = d.getBounds(stage);
                        out.push({ "t": t, "r": [b.x, b.y, b.width, b.height] });
                    } catch (e) {
                    }
                }
                return;
            }
            if (d instanceof DisplayObjectContainer) {
                for (let i: number = 0; i < d.numChildren; i++) {
                    walk(d.getChildAt(i), depth + 1);
                }
            }
        };
        if (stage) {
            walk(stage, 0);
        }
        IoFeedback._texts = out;
        return out;
    }

    /** Words drawn inside o's box (a see-through button over a heading, a tab over its name), or "". */
    private static textUnder(o: DisplayObject): string {
        let b: Rectangle = null;
        try {
            b = o.getBounds(IoFeedback.stage());
        } catch (e) {
            return "";
        }
        // (a button's size only: a big area holds many words, none of them its name)
        if (b.width * b.height > 60000 || b.height > 120) {
            return "";
        }
        let best: string = "";
        let bestArea: number = 0;
        for (let x of IoFeedback.visibleTexts()) {
            let r: number[] = x.r;
            let cx: number = r[0] + r[2] / 2;
            let cy: number = r[1] + r[3] / 2;
            if (cx < b.x || cy < b.y || cx > b.x + b.width || cy > b.y + b.height || r[2] * r[3] > b.width * b.height * 1.5 + 200) {
                continue;
            }
            if (!/[^\d\s.,:%+\-×x\/]/.test(x.t)) {
                continue;
            }
            if (r[2] * r[3] > bestArea) {
                bestArea = r[2] * r[3];
                best = x.t;
            }
        }
        return best;
    }

    /** "ioClArea:Fixes" -> "Fixes", "bPrevious" -> "Previous", "ioAttackLogs" -> "Attack Logs"; "" for names that say nothing. */
    private static nameWords(name: string): string {
        name = String(name || "");
        if (!name || /^instance\d+$/.test(name)) {
            return "";
        }
        let colon: number = name.indexOf(":");
        if (colon >= 0 && /[A-Za-z]/.test(name.substr(colon + 1))) {
            return name.substr(colon + 1).replace(/_/g, " ").trim();
        }
        let w: string = name.replace(/_?\d+$/, "").replace(/^(io|mc|bt|btn|b|m|_)(?=[A-Z_])/, "").replace(/_CLIP$/i, "").replace(/^_+/, "");
        w = w.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
        if (!w || /^(hit|mc hit|bg|background|frame|clip|icon|mc|mc icon|button|btn|base|art|graphic|image|img|holder|container|canvas|shape|sprite|content|inner|mask|glare|overlay)$/i.test(w)) {
            return "";
        }
        return w.charAt(0).toUpperCase() + w.substr(1);
    }

    /** A class's name in words: "icon_worker_inferno" -> "Worker", "BUILDINGSPOPUP" -> "BUILDINGS". */
    private static classWords(o: DisplayObject): string {
        let cls: string = IoFeedback.className(o);
        if (IoFeedback.GENERIC.test(cls) || /^(ChatBox|ChatBox_CLIP|mc|icon|StoneButton|Button|ScrollSet|popup_bg)$/i.test(cls)) {
            return "";
        }
        let w: string = cls.replace(/^Io/, "").replace(/^icon_/i, "").replace(/_(inferno|clip|mc)$/i, "").replace(/(POPUP|Popup|Window)$/, "");
        w = w.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
        let parts: string[] = w.split(/\s+/);
        if (parts.length > 3) {
            w = parts.slice(parts.length - 3).join(" ");
        }
        return w ? w.charAt(0).toUpperCase() + w.substr(1) : "";
    }

    /** Whether o takes clicks: a button, or anything listening for them. */
    private static takesClicks(o: DisplayObject): boolean {
        if (o instanceof Button || o instanceof SimpleButton || (o instanceof Sprite && as3.cast(o, Sprite).buttonMode)) {
            return true;
        }
        try {
            let d: any = o;
            return !!(d.hasEventListener && (d.hasEventListener("click") || d.hasEventListener("mouseDown") || d.hasEventListener("mouseUp")));
        } catch (e) {
            return false;
        }
    }

    /** The window o is in (a child of the windows' layer), or null. */
    private static windowOf(o: DisplayObject): DisplayObject {
        let layers: any[] = [GLOBAL._layerWindows, GLOBAL._layerMessages, GLOBAL._layerTop];
        for (let p: DisplayObject = o; p && p.parent && !(p instanceof Stage); p = p.parent) {
            if (layers.indexOf(p.parent) >= 0) {
                return p;
            }
        }
        return null;
    }

    /** A window's title: its heading (the biggest words near its top), or "". */
    private static titleOf(w: DisplayObject): string {
        try {
            let any: any = w;
            if (any.tA && any.tA.text && String(any.tA.text).trim()) {
                return IoFeedback.cut(String(any.tA.text).replace(/\s+/g, " ").trim(), 40);
            }
            let st1: Stage = IoFeedback.stage();
            let b: Rectangle = w.getBounds(st1);
            // (its own words only, not those of what is behind it; its box on the stage)
            let own: any[] = [];
            let walk: (d: any, depth: number) => void = (d: any, depth: number): void => {
                if (!d || !d.visible || depth > 30 || own.length > 400) {
                    return;
                }
                if (d instanceof TextField) {
                    let t0: string = String(d.text || "").replace(/\s+/g, " ").trim();
                    if (t0) {
                        let rb: Rectangle = d.getBounds(st1);
                        own.push({ "t": t0, "r": [rb.x, rb.y, rb.width, rb.height] });
                    }
                    return;
                }
                if (d instanceof DisplayObjectContainer) {
                    for (let i: number = 0; i < d.numChildren; i++) {
                        walk(d.getChildAt(i), depth + 1);
                    }
                }
            };
            walk(w, 0);
            let bx0: number = Math.max(0, b.x);
            let by0: number = Math.max(0, b.y);
            b = new Rectangle(bx0, by0, Math.min(st1.stageWidth, b.x + b.width) - bx0, Math.min(st1.stageHeight, b.y + b.height) - by0);
            let best: string = "";
            let bestH: number = 0;
            for (let x of own) {
                let r: number[] = x.r;
                if (r[0] < b.x - 2 || r[0] + r[2] > b.x + b.width + 2 || r[1] < b.y - 2 || r[1] > b.y + Math.min(90, b.height * 0.25) || !/[A-Za-zÀ-ÿ]/.test(x.t) || x.t.length > 40) {
                    continue;
                }
                if (r[3] > bestH + 1) {
                    bestH = r[3];
                    best = x.t;
                }
            }
            return best;
        } catch (e) {
            return "";
        }
    }

    /** A monster's name for its code ("IC5" -> "Pokey"), or "" when it isn't one. */
    private static monsterName(code: string): string {
        try {
            let all: any = CREATURELOCKER._creatures;
            let c: any = all && code ? all[code] : null;
            return c && c.name ? String(KEYS.Get(String(c.name))) : "";
        } catch (e) {
            return "";
        }
    }

    /** The words just right of o on its line (a checkbox's label), or "". */
    private static textBeside(o: DisplayObject): string {
        let b: Rectangle = null;
        try {
            b = o.getBounds(IoFeedback.stage());
        } catch (e) {
            return "";
        }
        let best: string = "";
        let bestGap: number = 170;
        for (let x of IoFeedback.visibleTexts()) {
            let r: number[] = x.r;
            let cy: number = r[1] + r[3] / 2;
            let gap: number = r[0] - (b.x + b.width);
            if (cy < b.y - 2 || cy > b.y + b.height + 2 || gap < -4 || gap >= bestGap || !/[A-Za-zÀ-ÿ]/.test(x.t)) {
                continue;
            }
            bestGap = gap;
            best = x.t;
        }
        return best;
    }

    /** What o is, in the player's words, and whether that says something (a button, a building, a window...). */
    private static labelOf(o: DisplayObject): any {
        let thing: string = IoFeedback.gameThingOf(o);
        if (thing) {
            return { "label": thing, "strong": true };
        }
        let T: (k: string, en: string, v?: any) => string = IoFeedback.t;
        let win: DisplayObject = IoFeedback.windowOf(o);
        if (o == (POPUPS as any)._mc || (win && o == win)) {
            let title: string = IoFeedback.titleOf(o) || IoFeedback.classWords(o) || POPUPS.ioShowing().replace(/^\s*/, "");
            return { "label": T("io_fb_what_window", "Window: #v1#", { "v1": title }), "strong": true };
        }
        let name: string = String((o as any).name || "");
        // (a building's tile in a menu: its _buildingProps)
        let bp: any = (o as any)._buildingProps;
        if (bp && bp.name && !(o as any)._lvl) {
            try {
                return { "label": String(KEYS.Get(String(bp.name))), "strong": true };
            } catch (e) {
            }
        }
        // (a monster's tile: its code in its name, "ioHatchMonster:IC5")
        let code: string = name.indexOf(":") >= 0 ? name.substr(name.indexOf(":") + 1) : "";
        let mon: string = IoFeedback.monsterName(code);
        if (mon) {
            return { "label": mon, "strong": true };
        }
        let slot: any = /^slot(\d+)$/i.exec(name);
        if (slot) {
            return { "label": T("io_fb_what_slot", "Slot #v1#", { "v1": (slot[1] | 0) + 1 }), "strong": true };
        }
        // (the Soul Crucible's resources: ioCrucibleFrom0..3, ioCrucibleTo0..3)
        let res: any = /(From|To)([0-3])$/.exec(name);
        if (res && /crucible/i.test(name)) {
            let rn0: string = "";
            try {
                rn0 = KEYS.Get(String(GLOBAL._resourceNames[res[2] | 0]));
            } catch (e) {
            }
            if (rn0) {
                return { "label": res[1] == "From" ? T("io_fb_what_res_from", "Pour in: #v1#", { "v1": rn0 }) : T("io_fb_what_res_to", "Take out: #v1#", { "v1": rn0 }), "strong": true };
            }
        }
        // (the resource bar's rows)
        let row: any = /^mcR([1-4])$/.exec(name) || (o.parent ? /^mcR([1-4])$/.exec(String((o.parent as any).name || "")) : null);
        if (row && IoFeedback.areaOf(o) == T("io_fb_area_top", "the top bar")) {
            let rn: string = "";
            try {
                rn = KEYS.Get(String(GLOBAL._resourceNames[(row[1] | 0) - 1]));
            } catch (e) {
            }
            if (rn) {
                return { "label": T("io_fb_what_resource", "#v1# (the resource bar)", { "v1": rn }), "strong": true };
            }
        }
        if (o instanceof TextField && String(as3.cast(o, TextField).type) == "input") {
            let a0: string = IoFeedback.areaOf(o);
            return { "label": a0 ? T("io_fb_what_input_in", "The text box in #v1#", { "v1": a0 }) : T("io_fb_what_input", "A text box"), "strong": true };
        }
        let box: Rectangle = null;
        try {
            box = o.getBounds(IoFeedback.stage());
        } catch (e) {
        }
        let thin: boolean = !!box && ((box.width <= 16 && box.height >= box.width * 1.8) || (box.height <= 12 && box.width >= box.height * 3));
        if (IoFeedback.takesClicks(o)) {
            if (/scroll/i.test(name) || /scroll/i.test(IoFeedback.className(o)) || /scroll/i.test(String(o.parent ? IoFeedback.className(o.parent) : "")) || (thin && !IoFeedback.textIn(o))) {
                return { "label": T("io_fb_what_scroll", "A scroll bar"), "strong": true };
            }
            // (a close button: by its name, or a small square button at a window's top right corner)
            let corner: boolean = false;
            if (win && box && box.width <= 40 && box.height <= 40 && Math.abs(box.width - box.height) <= 8 && !IoFeedback.textIn(o)) {
                try {
                    // (the window's box on the stage: a planner's canvas reaches far beyond it)
                    let st0: Stage = IoFeedback.stage();
                    let wb0: Rectangle = win.getBounds(st0);
                    let wx: number = Math.max(0, wb0.x);
                    let wy: number = Math.max(0, wb0.y);
                    let ww: number = Math.min(st0.stageWidth, wb0.x + wb0.width) - wx;
                    let wh: number = Math.min(st0.stageHeight, wb0.y + wb0.height) - wy;
                    corner = box.x + box.width / 2 > wx + ww * 0.85 && box.y + box.height / 2 < wy + Math.min(80, wh * 0.2);
                } catch (e) {
                }
            }
            if (corner || (/close/i.test(name) && !/disclose/i.test(name))) {
                let wt: string = win ? IoFeedback.titleOf(win) : "";
                return { "label": wt ? T("io_fb_what_close_of", "The close button of “#v1#”", { "v1": wt }) : T("io_fb_what_close", "A close button"), "strong": true };
            }
            // (a big area that takes clicks, a list or a board: what it is part of)
            if (box && ((box.width * box.height > 60000 && box.height > 60) || box.height > 150)) {
                let where: string = IoFeedback.areaOf(o);
                let nw: string = IoFeedback.nameWords(name);
                if (where || nw) {
                    return { "label": nw && !where ? nw : T("io_fb_what_contents", "The contents of #v1#", { "v1": where }), "strong": true };
                }
            }
            // (a small square, a checkbox or a switch, is named by the words beside it)
            let small: boolean = !!box && box.width <= 32 && box.height <= 32;
            let txt: string = IoFeedback.textIn(o) || IoFeedback.textUnder(o) || (small ? IoFeedback.textBeside(o) : "") || IoFeedback.nameWords(name) || IoFeedback.classWords(o);
            txt = IoFeedback.monsterName(txt) || txt;
            // (only a number on it, a badge's count: its name says more)
            if (txt && !/[A-Za-zÀ-ÿ]/.test(txt)) {
                txt = IoFeedback.nameWords(name) || IoFeedback.classWords(o) || txt;
            }
            if (txt) {
                return { "label": T("io_fb_what_button", "Button “#v1#”", { "v1": IoFeedback.cut(txt, 40) }), "strong": true };
            }
            let area: string = IoFeedback.areaOf(o);
            return { "label": area ? T("io_fb_what_button_in", "A button in #v1#", { "v1": area }) : T("io_fb_what_button_plain", "A button"), "strong": true };
        }
        if (o instanceof TextField) {
            let txt: string = IoFeedback.textIn(o);
            if (txt) {
                return { "label": T("io_fb_what_text", "Text “#v1#”", { "v1": IoFeedback.cut(txt, 50) }), "strong": false };
            }
        }
        let cls: string = IoFeedback.className(o);
        if (cls == "BYMChat" || cls == "UI_TOP" || cls == "UI_MENU") {
            let area0: string = IoFeedback.areaOf(o);
            return { "label": area0.charAt(0).toUpperCase() + area0.substr(1), "strong": false };
        }
        // (a tile or a card: the words on it, when it is small enough for them to be its name)
        if (box && box.width * box.height <= 40000 && o instanceof DisplayObjectContainer) {
            let words: string = IoFeedback.textIn(o);
            if (words && /[A-Za-zÀ-ÿ]/.test(words)) {
                return { "label": "“" + IoFeedback.cut(words, 40) + "”", "strong": false };
            }
        }
        let cw: string = IoFeedback.classWords(o);
        if (cw) {
            return { "label": cw, "strong": /(POPUP|Window|Popup|Panel|Bar|Menu)$/.test(cls) };
        }
        let area: string = IoFeedback.areaOf(o);
        return { "label": area ? T("io_fb_what_part_of", "Part of #v1#", { "v1": area }) : T("io_fb_what_part", "Part of the screen"), "strong": false };
    }

    /**
     * What is at (x, y) on the stage, from the smallest to the largest it is part of (each a different box), and which
     * to highlight first: the first that says something (a button, a building, a window), else the smallest.
     */
    private static partsAt(x: number, y: number): any {
        let stage: Stage = IoFeedback.stage();
        let out: Part[] = [];
        IoFeedback._texts = null;
        if (!stage) {
            return { "parts": out, "pick": -1 };
        }
        // (what a click there would hit, as the game sees it; then the deepest thing drawn inside that: a button's text,
        // a building's picture. Nothing there takes clicks: the deepest thing drawn there.)
        let hit: any = null;
        try {
            hit = pickAt(stage as any, x, y).target;
        } catch (e) {
        }
        let deepest: DisplayObject = null;
        if (hit && !(hit instanceof Stage)) {
            // (a SimpleButton draws its states without making them its children: the button itself)
            deepest = hit instanceof DisplayObjectContainer && !(hit instanceof SimpleButton) ? IoFeedback.deepestAt(as3.cast(hit, DisplayObjectContainer), x, y) || hit : hit;
        } else {
            deepest = IoFeedback.deepestAt(stage, x, y);
        }
        let sw: number = stage.stageWidth;
        let sh: number = stage.stageHeight;
        let pick: number = -1;
        let strong: boolean[] = [];
        // (on the yard, nothing of the interface over it: the building there, then nothing of the yard's picture)
        let map: DisplayObject = GLOBAL._layerMap ? as3.as(GLOBAL._layerMap, DisplayObject) : null;
        let inMap: (o: DisplayObject) => boolean = (o: DisplayObject): boolean => !!(o && map && (o == map || (map instanceof DisplayObjectContainer && as3.cast(map, DisplayObjectContainer).contains(o))));
        let onMap: boolean = !deepest || inMap(deepest) || inMap(hit);
        let building: any = onMap ? IoFeedback.buildingAt(x, y) : null;
        if (building) {
            let hb: Rectangle = building._mcHit.getBounds(stage);
            let bx: number = Math.max(0, hb.x);
            let by: number = Math.max(0, hb.y);
            out.push({ o: building._mcHit, r: [bx, by, Math.min(sw, hb.x + hb.width) - bx, Math.min(sh, hb.y + hb.height) - by], label: IoFeedback.buildingName(building), target: "building " + building._type + " (id " + building._id + ")" });
            pick = 0;
            return { "parts": out, "pick": pick, "deepest": deepest };
        }
        for (let o: DisplayObject = deepest; o && !(o instanceof Stage); o = o.parent) {
            let b: Rectangle = null;
            try {
                b = o.getBounds(stage);
            } catch (e) {
                continue;
            }
            // (on the stage only)
            let x0: number = Math.max(0, b.x);
            let y0: number = Math.max(0, b.y);
            let x1: number = Math.min(sw, b.x + b.width);
            let y1: number = Math.min(sh, b.y + b.height);
            if (!(x1 - x0 >= 3 && y1 - y0 >= 3)) {
                continue;
            }
            if ((x1 - x0) * (y1 - y0) > sw * sh * 0.85) {
                continue;
            }
            let r: number[] = [x0, y0, x1 - x0, y1 - y0];
            let l: any = IoFeedback.labelOf(o);
            let last: Part = out.length ? out[out.length - 1] : null;
            if (last && Math.abs(last.r[0] - r[0]) < 3 && Math.abs(last.r[1] - r[1]) < 3 && Math.abs(last.r[2] - r[2]) < 3 && Math.abs(last.r[3] - r[3]) < 3) {
                // (the same box: the better name kept)
                if (l.strong && !strong[out.length - 1]) {
                    last.label = l.label;
                    last.o = o;
                    last.target = IoBugReport.describe(o);
                    strong[out.length - 1] = true;
                    if (pick < 0) {
                        pick = out.length - 1;
                    }
                }
                continue;
            }
            strong.push(!!l.strong);
            out.push({ o: o, r: r, label: l.label, target: IoBugReport.describe(o) });
            if (l.strong && pick < 0) {
                pick = out.length - 1;
            }
            if (out.length >= 12) {
                break;
            }
        }
        // (a part of a button or a building with no name of its own: an icon, a picture, a tip: named by the button, and the
        // smallest such is what is highlighted first)
        for (let i: number = 0; i < out.length; i++) {
            if (strong[i]) {
                continue;
            }
            for (let j: number = i + 1; j < out.length; j++) {
                if (!strong[j]) {
                    continue;
                }
                let a: number[] = out[i].r;
                let b: number[] = out[j].r;
                let inside: boolean = a[0] >= b[0] - 2 && a[1] >= b[1] - 2 && a[0] + a[2] <= b[0] + b[2] + 2 && a[1] + a[3] <= b[1] + b[3] + 2;
                if (inside && out[j].o && (IoFeedback.takesClicks(out[j].o) || IoFeedback.gameThingOf(out[j].o))) {
                    out[i].label = out[j].label;
                    strong[i] = true;
                }
                break;
            }
        }
        pick = strong.indexOf(true);
        // (nothing of its own there, as on a window's dimmed background or an empty part of it: the window on screen)
        if (!out.length) {
            try {
                let w: any = (POPUPS as any)._mc;
                if (w && w.stage && w.visible) {
                    let b: Rectangle = w.getBounds(stage);
                    let x0: number = Math.max(0, b.x);
                    let y0: number = Math.max(0, b.y);
                    let x1: number = Math.min(sw, b.x + b.width);
                    let y1: number = Math.min(sh, b.y + b.height);
                    if (x1 - x0 >= 3 && y1 - y0 >= 3) {
                        out.push({ o: w, r: [x0, y0, x1 - x0, y1 - y0], label: IoFeedback.labelOf(w).label, target: IoBugReport.describe(w) });
                    }
                }
            } catch (e) {
            }
        }
        if (pick < 0 && out.length) {
            pick = 0;
        }
        return { "parts": out, "pick": pick, "deepest": deepest };
    }

    // ------------------------------------------------------------------ the screen

    /** The screen as it is now, at most 1600 x 1200, and how stage pixels map onto it. */
    private static takeShot(): Shot {
        try {
            let p: any = (globalThis as any).__player;
            let screen: any = p ? p.canvas : null;
            let stage: any = IoFeedback.stage();
            let view: any = stage ? stage.$ioView : null;
            if (!screen || !view || screen.width < 16 || screen.height < 16) {
                return null;
            }
            let k: number = Math.min(1, 1600 / screen.width, 1200 / screen.height);
            let c: any = document.createElement("canvas");
            c.width = Math.max(16, Math.round(screen.width * k));
            c.height = Math.max(16, Math.round(screen.height * k));
            let ctx: any = c.getContext("2d");
            ctx.fillStyle = "#0d0403";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            // (the yard drawn by the graphics card is under the game's canvas: first)
            let layer: any = flashPlayer.glLayer;
            if (layer && layer.style.display !== "none" && layer.width === screen.width && layer.height === screen.height) {
                ctx.drawImage(layer, 0, 0, c.width, c.height);
            }
            ctx.drawImage(screen, 0, 0, c.width, c.height);
            return { canvas: c, vx: Number(view.x), vy: Number(view.y), px: Number(view.px) * k };
        } catch (e) {
            return null;
        }
    }

    private static toPic(s: Shot, r: number[]): number[] {
        return [(r[0] - s.vx) * s.px, (r[1] - s.vy) * s.px, r[2] * s.px, r[3] * s.px];
    }

    private static toStage(s: Shot, x: number, y: number): number[] {
        return [x / s.px + s.vx, y / s.px + s.vy];
    }

    /** Where the chat is on the picture, or null. */
    private static chatOn(s: Shot): number[] {
        try {
            let a: Rectangle = IoWatch.chatArea();
            return a ? IoFeedback.toPic(s, [a.x, a.y, a.width, a.height]) : null;
        } catch (e) {
            return null;
        }
    }

    private static clientRect(r: number[]): number[] {
        let p: any = (globalThis as any).__player;
        if (!p || typeof p.stageToClient != "function") {
            return null;
        }
        let a: any = p.stageToClient(r[0], r[1]);
        let b: any = p.stageToClient(r[0] + r[2], r[1] + r[3]);
        return [a.x, a.y, b.x - a.x, b.y - a.y];
    }

    private static showGlow(r: number[]): void {
        IoFeedback.hideGlow();
        let c: number[] = r ? IoFeedback.clientRect(r) : null;
        if (!c) {
            return;
        }
        let g: any = document.createElement("div");
        g.className = "iofb-glow";
        Object.assign(g.style, { left: c[0] - 2 + "px", top: c[1] - 2 + "px", width: c[2] + "px", height: c[3] + "px" });
        document.body.appendChild(g);
        IoFeedback._glow = g;
    }

    private static showGlowClient(c: number[]): void {
        IoFeedback.hideGlow();
        let g: any = document.createElement("div");
        g.className = "iofb-glow";
        Object.assign(g.style, { left: c[0] - 2 + "px", top: c[1] - 2 + "px", width: c[2] + "px", height: c[3] + "px" });
        document.body.appendChild(g);
        IoFeedback._glow = g;
    }

    /**
     * A right-click on the page around the game (its header and buttons, the settings): the menu, about the page's
     * button or words there. Text boxes keep the browser's menu (paste), and so does Shift.
     */
    private static pageMenu(e: any): void {
        let t: any = e.target;
        if (!t || !t.closest || e.shiftKey || e.defaultPrevented) {
            return;
        }
        let p: any = (globalThis as any).__player;
        if ((p && t == p.canvas) || t.closest(".iofb-menu, .iofb-shade")) {
            return;
        }
        if (t.closest("input, textarea, select, [contenteditable=true]")) {
            return;
        }
        e.preventDefault();
        let el: any = t.closest("button, a, [title], [aria-label], label, h1, h2, h3, [data-k]");
        let label: string = "";
        let words: string = "";
        let rect: number[] = null;
        if (el) {
            words = String(el.textContent || "").replace(/\s+/g, " ").trim();
            let name: string = String(el.getAttribute("aria-label") || el.getAttribute("title") || words || "").trim();
            if (name) {
                label = el.tagName == "BUTTON" || el.tagName == "A" ? IoFeedback.t("io_fb_what_button", "Button “#v1#”", { "v1": IoFeedback.cut(name, 40) }) : IoFeedback.cut(name, 50);
            }
            let b: any = el.getBoundingClientRect();
            if (b.width > 2 && b.height > 2) {
                rect = [b.left, b.top, b.width, b.height];
            }
        }
        let id: string = el ? String(el.id || el.getAttribute("data-k") || el.tagName.toLowerCase()) : "page";
        IoFeedback.openMenu(e.clientX, e.clientY, 0, 0, { "label": label || IoFeedback.t("io_fb_what_page", "The page around the game"), "target": "page: " + id, "text": IoFeedback.cut(words, 200), "rect": rect });
    }

    private static hideGlow(): void {
        if (IoFeedback._glow) {
            IoFeedback._glow.remove();
            IoFeedback._glow = null;
        }
    }

    // ------------------------------------------------------------------ the menu

    private static openMenu(cx: number, cy: number, sx: number, sy: number, dom: any = null): void {
        IoFeedback.closeMenu();
        if (IoFeedback._dialog) {
            return;
        }
        let shot: Shot = IoFeedback.takeShot();
        let at: any = { "parts": [], "pick": -1 };
        let part: Part = null;
        let text: string = "";
        // (the page's own buttons and words around the game: named by their title or words, outlined on the page)
        let domLabel: string = "";
        let domTarget: string = "";
        if (dom) {
            domLabel = dom.label;
            domTarget = dom.target;
            text = dom.text;
        } else {
            try {
                at = IoFeedback.partsAt(sx, sy);
            } catch (e) {
            }
            part = at.pick >= 0 ? at.parts[at.pick] : null;
            try {
                text = at.deepest ? IoFeedback.textIn(at.deepest, 3) : "";
            } catch (e) {
            }
        }
        let logged: boolean = IoFeedback.loggedIn();
        let shell: any = (globalThis as any).__bwShell;

        let m: any = document.createElement("div");
        m.className = "iofb-menu";
        m.setAttribute("role", "menu");
        m.addEventListener("contextmenu", (e: any): void => e.preventDefault());
        let html: string = "";
        if (part || domLabel) {
            html += "<div class=\"iofb-about\">" + IoFeedback.esc(IoFeedback.t("io_fb_about", "About")) + ": <b>" + IoFeedback.esc(part ? part.label : domLabel) + "</b></div>";
        }
        let item: (id: string, icon: string, label: string, on: boolean, extra?: string) => string = (id: string, icon: string, label: string, on: boolean, extra: string = ""): string => {
            return "<button role=\"menuitem\" data-a=\"" + id + "\"" + (on ? "" : " disabled") + "><i>" + icon + "</i><span>" + IoFeedback.esc(label) + "</span>" + extra + "</button>";
        };
        html += item("bug", "🐞", IoFeedback.t("io_fb_bug", "Report a bug…"), logged);
        html += item("idea", "💡", IoFeedback.t("io_fb_idea", "Suggest a change…"), logged);
        html += item("mine", "📨", IoFeedback.t("io_fb_mine", "My reports"), logged, IoFeedback._unseen > 0 ? "<span class=\"iofb-n\">" + IoFeedback._unseen + "</span>" : "");
        html += "<hr>";
        if (text) {
            html += item("copytext", "📋", IoFeedback.t("io_fb_copy_text", "Copy “#v1#”", { "v1": IoFeedback.cut(text, 28) }), true);
        }
        html += item("info", "ℹ️", IoFeedback.t("io_fb_copy_info", "Copy game info"), true);
        html += item("shot", "📷", IoFeedback.t("io_fb_shot", "Save a screenshot"), !!shot);
        if (shell && typeof shell.fullscreen == "function") {
            html += item("full", "⛶", shell.isFullscreen && shell.isFullscreen() ? IoFeedback.t("io_fb_full_leave", "Leave full screen") : IoFeedback.t("io_fb_full", "Full screen"), true);
        }
        if (shell && typeof shell.menu == "function") {
            html += item("settings", "⚙️", IoFeedback.t("io_fb_settings", "Settings"), true);
        }
        html += item("reload", "↻", IoFeedback.t("io_fb_reload", "Reload the game"), true);
        html += "<div class=\"iofb-foot\">" + (IoFeedback.isAdmin() ? "<span class=\"iofb-admin\">" + IoFeedback.esc(IoFeedback.t("io_fb_admin", "Admin")) + "</span> · " : "") + IoFeedback.esc(logged ? IoFeedback.t("io_fb_shift_hint", "Shift + right-click: the browser's menu") : IoFeedback.t("io_fb_login_first", "Log in to send a report")) + "</div>";
        m.innerHTML = html;
        document.body.appendChild(m);
        IoFeedback._menu = m;
        // (inside the window)
        let w: number = m.offsetWidth;
        let h: number = m.offsetHeight;
        m.style.left = Math.max(4, Math.min(cx, window.innerWidth - w - 4)) + "px";
        m.style.top = Math.max(4, Math.min(cy, window.innerHeight - h - 4)) + "px";
        if (part) {
            IoFeedback.showGlow(part.r);
        } else if (dom && dom.rect) {
            IoFeedback.showGlowClient(dom.rect);
        }
        m.addEventListener("click", (e: any): void => {
            let b: any = e.target && e.target.closest ? e.target.closest("button[data-a]") : null;
            if (!b || b.disabled) {
                return;
            }
            let a: string = String(b.getAttribute("data-a"));
            IoFeedback.closeMenu();
            if (a == "bug" || a == "idea") {
                IoFeedback.openReport(a, shot, at.parts, at.pick, domLabel, domTarget);
            } else if (a == "mine") {
                IoFeedback.openMine();
            } else if (a == "copytext") {
                IoFeedback.copy(text);
            } else if (a == "info") {
                IoFeedback.copy(IoFeedback.gameInfo());
            } else if (a == "shot") {
                IoFeedback.download(shot);
            } else if (a == "full") {
                shell.fullscreen();
            } else if (a == "settings") {
                shell.menu();
            } else if (a == "reload") {
                if (window.confirm(IoFeedback.t("io_fb_reload_ask", "Reload the game? Anything not saved yet may be lost."))) {
                    location.reload();
                }
            }
        });
        // ("My reports (1 new)": asked at most once a minute)
        if (logged && Date.now() - IoFeedback._unseenAt > 60000) {
            IoFeedback._unseenAt = Date.now();
            IoFeedback.request("feedback/mine", { "count": 1 }).then((r: any): void => {
                IoFeedback._unseen = r && r.unseen != null ? r.unseen | 0 : 0;
                let b: any = IoFeedback._menu == m ? m.querySelector("button[data-a=mine]") : null;
                if (b && IoFeedback._unseen > 0 && !b.querySelector(".iofb-n")) {
                    let n: any = document.createElement("span");
                    n.className = "iofb-n";
                    n.textContent = String(IoFeedback._unseen);
                    b.appendChild(n);
                }
            }).catch((): void => {
            });
        }
    }

    private static closeMenu(): void {
        if (IoFeedback._menu) {
            IoFeedback._menu.remove();
            IoFeedback._menu = null;
        }
        if (!IoFeedback._dialog) {
            IoFeedback.hideGlow();
        }
    }

    private static toast(text: string): void {
        let d: any = document.createElement("div");
        Object.assign(d.style, { position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", zIndex: "2100", background: "rgba(20,6,3,.94)", color: "#f2dcc8", border: "1px solid #7a2a12", borderRadius: "8px", padding: "8px 14px", font: "13px system-ui, sans-serif", pointerEvents: "none" });
        d.textContent = text;
        document.body.appendChild(d);
        setTimeout((): void => d.remove(), 2200);
    }

    private static copy(text: string): void {
        let done: () => void = (): void => IoFeedback.toast(IoFeedback.t("io_fb_copied", "Copied"));
        try {
            navigator.clipboard.writeText(text).then(done, (): void => {
                window.prompt(IoFeedback.t("io_fb_copy_this", "Copy this:"), text);
            });
        } catch (e) {
            window.prompt(IoFeedback.t("io_fb_copy_this", "Copy this:"), text);
        }
    }

    private static where(): string {
        try {
            return IoBugReport.where();
        } catch (e) {
            return "mode: " + GLOBAL._loadmode;
        }
    }

    private static gameInfo(): string {
        let name: string = LOGIN._playerName || "";
        let id: number = LOGIN._playerID | 0;
        return "Inferno Map Room 2 · build " + IOBuild.stamp + "\n" + (name || id ? "player: " + name + (id ? " (#" + id + ")" : "") + "\n" : "") + IoFeedback.where() + "\nbrowser: " + navigator.userAgent + "\nwindow: " + window.innerWidth + "x" + window.innerHeight + " @" + (window.devicePixelRatio || 1) + "x · " + new Date().toISOString().replace("T", " ").substr(0, 16) + " UTC";
    }

    private static download(shot: Shot): void {
        if (!shot) {
            return;
        }
        let a: any = document.createElement("a");
        a.download = "inferno-" + new Date().toISOString().replace(/[:T]/g, "-").substr(0, 16) + ".png";
        a.href = shot.canvas.toDataURL("image/png");
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    private static request(path: string, body: any): Promise<any> {
        return fetch(GLOBAL.serverUrl + path, {
            "method": "POST",
            "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + LOGIN.token },
            "body": JSON.stringify(body),
        }).then((r: any): any => r.json());
    }

    // ------------------------------------------------------------------ the report

    private static closeDialog(): void {
        if (IoFeedback._dialog) {
            IoFeedback._dialog.remove();
            IoFeedback._dialog = null;
        }
        IoFeedback.hideGlow();
        try {
            let p: any = (globalThis as any).__player;
            if (p && p.canvas) {
                p.canvas.focus({ "preventScroll": true });
            }
        } catch (e) {
        }
    }

    private static shade(): any {
        IoFeedback.closeDialog();
        let sh: any = document.createElement("div");
        sh.className = "iofb-shade";
        sh.addEventListener("contextmenu", (e: any): void => e.preventDefault());
        // (the game underneath gets nothing: no keys, no wheel)
        for (let ev of ["keydown", "keyup", "keypress", "wheel"]) {
            sh.addEventListener(ev, (e: any): void => {
                if (!(ev == "keydown" && e.key == "Escape")) {
                    e.stopPropagation();
                }
            });
        }
        sh.addEventListener("pointerdown", (e: any): void => {
            if (e.target == sh) {
                IoFeedback.closeDialog();
            }
        });
        document.body.appendChild(sh);
        IoFeedback._dialog = sh;
        return sh;
    }

    /**
     * The report form: kind "bug" or "idea". From the menu with the screenshot taken at the right-click and what was
     * under the pointer; from the settings menu (touch screens) with neither (a screenshot is taken now).
     */
    public static openReport(kind: string, shot: Shot = null, parts: Part[] = null, pick: number = -1, pageLabel: string = "", pageTarget: string = ""): void {
        IoFeedback.closeMenu();
        if (!IoFeedback.loggedIn()) {
            IoFeedback.toast(IoFeedback.t("io_fb_login_first", "Log in to send a report"));
            return;
        }
        // (from the settings menu: the menu itself closed first, then the screen as it is)
        if (!shot) {
            shot = IoFeedback.takeShot();
        }
        parts = parts || [];
        let sel: number = pick;
        let box: number[] = null; // a box the player drew, stage pixels
        let picture: string = null; // a picture of their own (data URL)
        let sending: boolean = false;
        let sh: any = IoFeedback.shade();
        let T: (k: string, en: string, v?: any) => string = IoFeedback.t;
        let E: (v: any) => string = IoFeedback.esc;
        let d: any = document.createElement("div");
        d.className = "iofb-box";
        d.innerHTML =
            "<h2><span id=\"iofb-title\"></span>" + (IoFeedback.isAdmin() ? "<span class=\"iofb-badge\" title=\"" + E(T("io_fb_as_admin", "Sent as an admin")) + "\">" + E(T("io_fb_admin", "Admin")).toUpperCase() + "</span>" : "") +
            "<span class=\"iofb-tabs\"><button data-k=\"bug\">🐞 " + E(T("io_fb_kind_bug", "Bug")) + "</button><button data-k=\"idea\">💡 " + E(T("io_fb_kind_idea", "Suggestion")) + "</button></span></h2>" +
            "<div class=\"iofb-cols\">" +
            "<div class=\"iofb-pic\">" +
            (shot ? "<canvas id=\"iofb-cv\"></canvas>" : "<div class=\"iofb-hint\">" + E(T("io_fb_no_shot", "No screenshot could be taken.")) + "</div>") +
            "<div class=\"iofb-what\" id=\"iofb-what\"></div>" +
            (shot ? "<div class=\"iofb-row\"><button class=\"iofb-btn\" id=\"iofb-smaller\">− " + E(T("io_fb_smaller", "Smaller")) + "</button><button class=\"iofb-btn\" id=\"iofb-bigger\">+ " + E(T("io_fb_bigger", "Bigger")) + "</button><button class=\"iofb-btn\" id=\"iofb-none\">" + E(T("io_fb_none", "No highlight")) + "</button></div>" +
                "<div class=\"iofb-hint\">" + E(T("io_fb_pick_hint", "Click the picture to pick something else, or drag to draw a box around it.")) + "</div>" +
                "<label class=\"iofb-row\"><input type=\"checkbox\" id=\"iofb-attach\" checked> " + E(T("io_fb_attach_shot", "Attach this screenshot")) + "</label>" +
                "<label class=\"iofb-row\"><input type=\"checkbox\" id=\"iofb-chat\" checked> " + E(T("io_fb_hide_chat", "Hide the chat in it")) + "</label>" : "") +
            "<div class=\"iofb-row\"><button class=\"iofb-btn\" id=\"iofb-addpic\">🖼 " + E(T("io_fb_add_pic", "Add a picture…")) + "</button><span id=\"iofb-picname\" class=\"iofb-hint\"></span><input type=\"file\" id=\"iofb-file\" accept=\"image/png,image/jpeg,image/webp,image/gif\" style=\"display:none\"></div>" +
            "</div>" +
            "<div class=\"iofb-form\">" +
            "<textarea id=\"iofb-text\" maxlength=\"3000\"></textarea>" +
            "<div class=\"iofb-row\" id=\"iofb-often-row\"><span>" + E(T("io_fb_how_often", "How often?")) + "</span><select id=\"iofb-often\"><option value=\"\">—</option><option value=\"once\">" + E(T("io_fb_often_once", "Once")) + "</option><option value=\"sometimes\">" + E(T("io_fb_often_some", "Sometimes")) + "</option><option value=\"always\">" + E(T("io_fb_often_always", "Every time")) + "</option></select></div>" +
            "<div class=\"iofb-hint\">" + E(T("io_fb_sent_with", "Sent with it: where you are in the game, your last few clicks and the game's version.")) + (IoFeedback.isAdmin() ? " <b>" + E(T("io_fb_as_admin", "Sent as an admin")) + ".</b>" : "") + "</div>" +
            "<div class=\"iofb-err\" id=\"iofb-err\"></div>" +
            "<div class=\"iofb-row\" style=\"margin-top:auto\"><button class=\"iofb-btn iofb-go\" id=\"iofb-send\">" + E(T("io_fb_send", "Send")) + "</button><button class=\"iofb-btn\" id=\"iofb-cancel\">" + E(T("io_fb_cancel", "Cancel")) + "</button><button class=\"iofb-btn\" id=\"iofb-mine\" style=\"margin-left:auto\">📨 " + E(T("io_fb_mine", "My reports")) + "</button></div>" +
            "</div></div>";
        sh.appendChild(d);
        let q: (id: string) => any = (id: string): any => d.querySelector("#" + id);
        let text: any = q("iofb-text");
        let setKind: (k: string) => void = (k: string): void => {
            kind = k == "idea" ? "idea" : "bug";
            q("iofb-title").textContent = kind == "bug" ? T("io_fb_title_bug", "Report a bug") : T("io_fb_title_idea", "Suggest a change");
            text.placeholder = kind == "bug" ? T("io_fb_q_bug", "What happened? What did you expect instead?") : T("io_fb_q_idea", "What would you change, and why?");
            q("iofb-often-row").style.display = kind == "bug" ? "" : "none";
            for (let b of d.querySelectorAll(".iofb-tabs button")) {
                b.classList.toggle("on", b.getAttribute("data-k") == kind);
            }
        };
        for (let b of d.querySelectorAll(".iofb-tabs button")) {
            b.addEventListener("click", (): void => setKind(String(b.getAttribute("data-k"))));
        }
        setKind(kind);

        // ---- the picture and its highlight
        let cv: any = q("iofb-cv");
        let current: () => number[] = (): number[] => box ? box : sel >= 0 && parts[sel] ? parts[sel].r : null;
        let drawn: number[] = null; // the box being dragged, picture pixels
        let draw: () => void = (): void => {
            if (!cv) {
                return;
            }
            let c: any = shot.canvas;
            if (cv.width != c.width || cv.height != c.height) {
                cv.width = c.width;
                cv.height = c.height;
            }
            let g: any = cv.getContext("2d");
            g.drawImage(c, 0, 0);
            if (q("iofb-chat") && q("iofb-chat").checked) {
                IoFeedback.coverChat(g, shot);
            }
            let r: number[] = drawn || (current() ? IoFeedback.toPic(shot, current()) : null);
            if (r) {
                IoFeedback.drawHighlight(g, r, cv.width, cv.height);
            }
        };
        let say: () => void = (): void => {
            let w: string;
            if (box) {
                w = T("io_fb_what_box", "A box you drew");
            } else if (sel >= 0 && parts[sel]) {
                w = parts[sel].label;
            } else if (pageLabel) {
                w = pageLabel;
            } else {
                w = T("io_fb_about_screen", "The whole screen");
            }
            q("iofb-what").innerHTML = E(T("io_fb_about", "About")) + ": <b>" + E(w) + "</b>";
            if (q("iofb-smaller")) {
                q("iofb-smaller").disabled = box != null || sel <= 0;
                q("iofb-bigger").disabled = box != null ? false : sel >= parts.length - 1;
                q("iofb-none").disabled = !box && sel < 0;
            }
            draw();
        };
        if (cv) {
            q("iofb-smaller").onclick = (): void => {
                if (sel > 0) {
                    sel--;
                }
                say();
            };
            q("iofb-bigger").onclick = (): void => {
                if (box) {
                    box = null;
                } else if (sel < parts.length - 1) {
                    sel++;
                }
                say();
            };
            q("iofb-none").onclick = (): void => {
                box = null;
                sel = -1;
                say();
            };
            q("iofb-chat").onchange = draw;
            let picAt: (e: any) => number[] = (e: any): number[] => {
                let b: any = cv.getBoundingClientRect();
                return [(e.clientX - b.left) * cv.width / Math.max(1, b.width), (e.clientY - b.top) * cv.height / Math.max(1, b.height)];
            };
            let down: number[] = null;
            cv.addEventListener("pointerdown", (e: any): void => {
                e.preventDefault();
                down = picAt(e);
                cv.setPointerCapture(e.pointerId);
            });
            cv.addEventListener("pointermove", (e: any): void => {
                if (!down) {
                    return;
                }
                let p: number[] = picAt(e);
                let k: number = cv.width / Math.max(1, cv.getBoundingClientRect().width);
                if (Math.abs(p[0] - down[0]) > 6 * k || Math.abs(p[1] - down[1]) > 6 * k) {
                    drawn = [Math.min(down[0], p[0]), Math.min(down[1], p[1]), Math.abs(p[0] - down[0]), Math.abs(p[1] - down[1])];
                    draw();
                }
            });
            cv.addEventListener("pointerup", (e: any): void => {
                if (!down) {
                    return;
                }
                let p: number[] = picAt(e);
                if (drawn) {
                    let a: number[] = IoFeedback.toStage(shot, drawn[0], drawn[1]);
                    box = [a[0], a[1], drawn[2] / shot.px, drawn[3] / shot.px];
                    drawn = null;
                } else {
                    // (a click: what is there now, on the game behind)
                    let s: number[] = IoFeedback.toStage(shot, p[0], p[1]);
                    let at: any = IoFeedback.partsAt(s[0], s[1]);
                    parts = at.parts;
                    sel = at.pick;
                    box = null;
                    pageLabel = "";
                    pageTarget = "";
                }
                down = null;
                say();
            });
        }
        say();

        // ---- a picture of their own
        let file: any = q("iofb-file");
        q("iofb-addpic").onclick = (): void => {
            if (picture) {
                picture = null;
                q("iofb-picname").textContent = "";
                q("iofb-addpic").textContent = "🖼 " + T("io_fb_add_pic", "Add a picture…");
                return;
            }
            file.click();
        };
        file.onchange = (): void => {
            let f: any = file.files && file.files[0];
            file.value = "";
            if (!f) {
                return;
            }
            IoFeedback.readPicture(f).then((url: string): void => {
                picture = url;
                q("iofb-picname").textContent = IoFeedback.cut(String(f.name || ""), 30);
                q("iofb-addpic").textContent = "✕ " + T("io_fb_pic_remove", "Remove the picture");
            }).catch((): void => {
                q("iofb-err").textContent = T("io_fb_err_pic", "That picture couldn't be read.");
            });
        };

        q("iofb-cancel").onclick = (): void => IoFeedback.closeDialog();
        q("iofb-mine").onclick = (): void => IoFeedback.openMine();
        q("iofb-send").onclick = (): void => {
            if (sending) {
                return;
            }
            let words: string = String(text.value || "").trim();
            if (words.length < 5) {
                q("iofb-err").textContent = T("io_fb_err_short", "Please write a little more (at least #v1# characters).", { "v1": 5 });
                text.focus();
                return;
            }
            let r: number[] = current();
            let part: Part = !box && sel >= 0 ? parts[sel] : null;
            let attach: boolean = !!(cv && q("iofb-attach").checked);
            let payload: any = {
                "kind": kind,
                "text": words,
                "howOften": kind == "bug" ? q("iofb-often").value : "",
                "subject": box ? T("io_fb_what_box", "A box you drew") : part ? part.label : pageLabel,
                "target": part ? part.target : pageTarget,
                "highlight": r && shot ? { "pic": IoFeedback.toPic(shot, r).map((n: number): number => Math.round(n)), "stage": r.map((n: number): number => Math.round(n)) } : null,
                "place": IoFeedback.where(),
                "context": IoBugReport.trail().substr(0, 7000),
                "build": String(IOBuild.stamp),
                "player": Capabilities.version,
                "shot": attach ? IoFeedback.finalShot(shot, r, q("iofb-chat").checked) : null,
                "picture": picture,
            };
            sending = true;
            q("iofb-send").disabled = true;
            q("iofb-send").textContent = T("io_fb_sending", "Sending…");
            q("iofb-err").textContent = "";
            IoFeedback.request("feedback", payload).then((res: any): void => {
                if (res && res.error === 0) {
                    IoFeedback.thanks(sh, kind);
                    return;
                }
                throw res && res.error ? res : { "error": "?" };
            }).catch((err: any): void => {
                sending = false;
                if (!IoFeedback._dialog) {
                    return;
                }
                q("iofb-send").disabled = false;
                q("iofb-send").textContent = T("io_fb_send", "Send");
                q("iofb-err").textContent = err && err.error == "limit" ? T("io_fb_err_limit", "You've sent a lot of reports: please try again later.") : T("io_fb_err_send", "It couldn't be sent: #v1#", { "v1": err && err.error && err.error != "?" ? err.error : T("io_fb_err_net", "no answer from the server") });
            });
        };
        setTimeout((): void => text.focus(), 30);
    }

    private static thanks(sh: any, kind: string): void {
        let T: (k: string, en: string, v?: any) => string = IoFeedback.t;
        let E: (v: any) => string = IoFeedback.esc;
        let d: any = sh.querySelector(".iofb-box");
        d.style.width = "min(440px, 94vw)";
        d.innerHTML = "<h2>" + E(kind == "bug" ? T("io_fb_title_bug", "Report a bug") : T("io_fb_title_idea", "Suggest a change")) + "</h2><p class=\"iofb-ok\">" + E(T("io_fb_thanks", "Thank you! You can follow it under My reports.")) + "</p><div class=\"iofb-row\"><button class=\"iofb-btn iofb-go\" id=\"iofb-ok\">OK</button><button class=\"iofb-btn\" id=\"iofb-mine2\">📨 " + E(T("io_fb_mine", "My reports")) + "</button></div>";
        d.querySelector("#iofb-ok").onclick = (): void => IoFeedback.closeDialog();
        d.querySelector("#iofb-mine2").onclick = (): void => IoFeedback.openMine();
        d.querySelector("#iofb-ok").focus();
    }

    private static coverChat(g: any, shot: Shot): void {
        let c: number[] = IoFeedback.chatOn(shot);
        if (!c) {
            return;
        }
        g.fillStyle = "#140B09";
        g.fillRect(c[0], c[1], c[2], c[3]);
        g.fillStyle = "#8f6a55";
        g.font = Math.max(11, Math.round(13 * shot.px)) + "px system-ui, sans-serif";
        g.fillText(IoFeedback.t("io_fb_chat_hidden", "(chat hidden)"), c[0] + 10 * shot.px, c[1] + 22 * shot.px);
    }

    private static drawHighlight(g: any, r: number[], w: number, h: number): void {
        let lw: number = Math.max(2, Math.round(Math.min(w, h) / 260));
        g.save();
        g.fillStyle = "rgba(0,0,0,0.28)";
        g.beginPath();
        g.rect(0, 0, w, h);
        g.rect(r[0] - lw, r[1] - lw, r[2] + 2 * lw, r[3] + 2 * lw);
        g.fill("evenodd");
        g.strokeStyle = "#ff7a2a";
        g.lineWidth = lw;
        g.shadowColor = "rgba(255,122,42,.9)";
        g.shadowBlur = lw * 3;
        g.strokeRect(r[0] - lw / 2, r[1] - lw / 2, r[2] + lw, r[3] + lw);
        g.restore();
    }

    /** The screenshot sent: the chat covered (if chosen), the highlight drawn on it; a JPEG of at most about 1.3 MB. */
    private static finalShot(shot: Shot, r: number[], hideChat: boolean): string {
        if (!shot) {
            return null;
        }
        let scale: number = 1;
        for (let attempt: number = 0; attempt < 5; attempt++) {
            let c: any = document.createElement("canvas");
            c.width = Math.max(16, Math.round(shot.canvas.width * scale));
            c.height = Math.max(16, Math.round(shot.canvas.height * scale));
            let g: any = c.getContext("2d");
            g.scale(scale, scale);
            g.drawImage(shot.canvas, 0, 0);
            if (hideChat) {
                IoFeedback.coverChat(g, shot);
            }
            if (r) {
                IoFeedback.drawHighlight(g, IoFeedback.toPic(shot, r), shot.canvas.width, shot.canvas.height);
            }
            let url: string = c.toDataURL("image/jpeg", attempt == 0 ? 0.86 : 0.72);
            if (url.length < 1800000) {
                return url;
            }
            scale *= 0.75;
        }
        return null;
    }

    /** A picture the player picked, as a JPEG of at most 1600 x 1600 (a data URL). */
    private static readPicture(f: any): Promise<string> {
        return new Promise((resolve: (v: string) => void, reject: (e: any) => void): void => {
            if (!f || !/^image\//.test(String(f.type || "")) || f.size > 25 * 1024 * 1024) {
                reject(null);
                return;
            }
            let url: string = URL.createObjectURL(f);
            let img: any = new Image();
            img.onload = (): void => {
                try {
                    let k: number = Math.min(1, 1600 / Math.max(1, img.naturalWidth), 1600 / Math.max(1, img.naturalHeight));
                    let c: any = document.createElement("canvas");
                    c.width = Math.max(1, Math.round(img.naturalWidth * k));
                    c.height = Math.max(1, Math.round(img.naturalHeight * k));
                    let g: any = c.getContext("2d");
                    g.fillStyle = "#fff";
                    g.fillRect(0, 0, c.width, c.height);
                    g.drawImage(img, 0, 0, c.width, c.height);
                    let out: string = c.toDataURL("image/jpeg", 0.85);
                    if (out.length > 1900000) {
                        out = c.toDataURL("image/jpeg", 0.6);
                    }
                    URL.revokeObjectURL(url);
                    resolve(out);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = (): void => {
                URL.revokeObjectURL(url);
                reject(null);
            };
            img.src = url;
        });
    }

    // ------------------------------------------------------------------ my reports

    /** What the player sent, with its status and the team's answer. Opening it marks the answers seen. */
    public static openMine(): void {
        IoFeedback.closeMenu();
        if (!IoFeedback.loggedIn()) {
            IoFeedback.toast(IoFeedback.t("io_fb_login_first", "Log in to send a report"));
            return;
        }
        let T: (k: string, en: string, v?: any) => string = IoFeedback.t;
        let E: (v: any) => string = IoFeedback.esc;
        let sh: any = IoFeedback.shade();
        let d: any = document.createElement("div");
        d.className = "iofb-box";
        d.style.width = "min(620px, 96vw)";
        d.innerHTML = "<h2>📨 " + E(T("io_fb_mine_title", "My reports")) + "</h2><div class=\"iofb-list\" id=\"iofb-list\"><div class=\"iofb-hint\">…</div></div><div class=\"iofb-row\" style=\"margin-top:10px\"><button class=\"iofb-btn\" id=\"iofb-close\">" + E(T("io_fb_close", "Close")) + "</button><button class=\"iofb-btn\" id=\"iofb-newbug\" style=\"margin-left:auto\">🐞 " + E(T("io_fb_bug", "Report a bug…")) + "</button><button class=\"iofb-btn\" id=\"iofb-newidea\">💡 " + E(T("io_fb_idea", "Suggest a change…")) + "</button></div>";
        sh.appendChild(d);
        d.querySelector("#iofb-close").onclick = (): void => IoFeedback.closeDialog();
        d.querySelector("#iofb-newbug").onclick = (): void => IoFeedback.openReport("bug");
        d.querySelector("#iofb-newidea").onclick = (): void => IoFeedback.openReport("idea");
        let status: any = {
            "new": T("io_fb_st_new", "Received"),
            "seen": T("io_fb_st_seen", "Read"),
            "planned": T("io_fb_st_planned", "Planned"),
            "done": T("io_fb_st_done", "Done"),
            "declined": T("io_fb_st_declined", "Not planned"),
        };
        IoFeedback.request("feedback/mine", { "seen": 1 }).then((r: any): void => {
            let list: any = d.querySelector("#iofb-list");
            if (!list) {
                return;
            }
            IoFeedback._unseen = 0;
            IoFeedback._unseenAt = Date.now();
            let rows: any[] = r && r.reports ? r.reports : [];
            if (!rows.length) {
                list.innerHTML = "<div class=\"iofb-hint\">" + E(T("io_fb_mine_none", "You haven't sent any reports yet.")) + "</div>";
                return;
            }
            list.innerHTML = rows.map((x: any): string => {
                let when: string = "";
                try {
                    when = new Date(x.created_at).toLocaleString(undefined, { "dateStyle": "medium", "timeStyle": "short" } as any);
                } catch (e) {
                }
                return "<div class=\"iofb-item\"><div class=\"iofb-top\"><span>" + (x.kind == "bug" ? "🐞 " + E(T("io_fb_kind_bug", "Bug")) : "💡 " + E(T("io_fb_kind_idea", "Suggestion"))) + " #" + (x.id | 0) + "</span><span>" + E(when) + "</span>" + (!x.reply_seen ? "<span class=\"iofb-new\">" + E(T("io_fb_new", "New")) + "</span>" : "") +
                    "<span class=\"iofb-st " + E(x.status) + "\">" + E(status[x.status] || x.status) + "</span></div>" +
                    (x.subject ? "<div class=\"iofb-hint\">" + E(T("io_fb_about", "About")) + ": " + E(x.subject) + "</div>" : "") +
                    "<div class=\"iofb-txt\">" + E(x.text) + "</div>" +
                    (x.reply ? "<div class=\"iofb-reply\"><div class=\"iofb-hint\">" + E(T("io_fb_reply", "The team's answer:")) + "</div>" + E(x.reply) + "</div>" : "") + "</div>";
            }).join("");
        }).catch((): void => {
            let list: any = d.querySelector("#iofb-list");
            if (list) {
                list.innerHTML = "<div class=\"iofb-err\">" + E(T("io_fb_err_net", "no answer from the server")) + "</div>";
            }
        });
    }
}
