import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, DisplayObjectContainer, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { TextField } from "flash/text";
import { Dictionary } from "flash/utils";
import { ALLIANCES, BASE, BYMChat, Chat, GLOBAL, IoMapSnapshot, IoMapUi, IoPinEditorPopup, IoQuests, IoReplays, IoUnderworld, SOUNDS, TweenLite, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: sharing a place on the map in chat.
 *
 * The map room's Share button asks which tab (Global or Alliance) and sends a short token for the place,
 * [map:x,y:world], after whatever the player has typed into the chat box. The chat shows the token as a
 * pill with the coordinates; clicking it opens the map there (or moves the open map there). The world tag
 * keeps a place shared on one world from being opened on another.
 */
export class IoMapShare extends ASObject {
    /** [map:263,95] or [map:263,95:ab12cd] */
    private static readonly TOKEN: RegExp = /\[map:(\d{1,3}),(\d{1,3})(?::([0-9a-zA-Z]{1,12}))?\]/g;

    /** A place, or an attack replay ([replay:key]: the fourth group). */
    private static readonly ANY_TOKEN: RegExp = /\[map:(\d{1,3}),(\d{1,3})(?::([0-9a-zA-Z]{1,12}))?\]|\[replay:([0-9a-zA-Z]{6,24})\]/g;

    private static readonly NBSP: string = " ";

    private static _chooser: Sprite = null;

    /** Chat lines with places: line -> { text, links, pills, width } (to draw the pills again on a resize). */
    private static _decorated: Dictionary = new Dictionary(true);

    /** The world a place opened from chat was shared on, until the map knows which world it shows. */
    private static _pendingTag: string = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Token(cellX: int, cellY: int): string {
        let tag: string = IoMapSnapshot.worldTag;
        return "[map:" + cellX + "," + cellY + (tag ? ":" + tag : "") + "]";
    }

    // ---- sharing from the map
    /**
     * Asks where to share a place: a small bubble at (x, y) of the host, kept inside `area` (the host's
     * map area).
     */
    public static ShowChooser(host: DisplayObjectContainer, x: number, y: number, area: Rectangle, cellX: int, cellY: int): void {
        let bubble: Sprite = null;
        bubble = new Sprite();
        let title: TextField = null;
        let close: Sprite = null;
        let global: MovieClip = null;
        let alliance: MovieClip = null;
        let inAlliance: boolean = ALLIANCES._allianceID > 0;
        // The leader and officers can also pin the place to the alliance board (2 October). Before the
        // player's role has loaded the button shows for any member: the server says who may.
        let canPin: boolean = inAlliance && (ALLIANCES.ioIsStaff() || ALLIANCES.ioRole() == "");
        if (inAlliance && ALLIANCES.ioRole() == "") {
            ALLIANCES.LoadMyAlliance(null);
        }
        let w: int = 236;
        let h: int = canPin ? 100 : 68;
        IoMapShare.HideChooser();
        IoMapUi.glass(bubble.graphics, w, h, 9);
        title = IoMapUi.label("", 12, IoMapUi.LIGHT, false, (w - 34) | 0);
        title.htmlText = "Share <b>" + IoMapUi.coord(cellX, cellY) + "</b> in";
        title.x = 10;
        title.y = 7;
        bubble.addChild(title);
        close = new Sprite();
        IoMapUi.hitArea(close.graphics, 20, 20);
        IoMapUi.cross(close.graphics, 5, 5, 9, IoMapUi.LIGHT);
        close.x = w - 26;
        close.y = 6;
        close.buttonMode = true;
        close.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            IoMapShare.HideChooser();
        });
        bubble.addChild(close);
        global = IoMapUi.button("Global", 104, 26, (e: MouseEvent): void => {
            IoMapShare.share(host, area, BYMChat.IO_GLOBAL, cellX, cellY);
        }, "gold");
        global.x = 10;
        global.y = 32;
        bubble.addChild(global);
        alliance = IoMapUi.button("Alliance", 104, 26, (e: MouseEvent): void => {
            IoMapShare.share(host, area, BYMChat.IO_ALLIANCE, cellX, cellY);
        }, "grey");
        alliance.x = 122;
        alliance.y = 32;
        Object(alliance).setEnabled(inAlliance);
        bubble.addChild(alliance);
        if (canPin) {
            let pin: MovieClip = IoMapUi.button("Pin to alliance board", (w - 20) | 0, 26, (e: MouseEvent): void => {
                IoMapShare.HideChooser();
                IoPinEditorPopup.Show({ "x": cellX, "y": cellY, "world_id": IoMapSnapshot.world, "title": "", "body": "" });
            }, "grey");
            pin.x = 10;
            pin.y = 64;
            pin.name = "ioSharePin";
            bubble.addChild(pin);
        }
        bubble.x = Math.round(Math.max(area.x + 4, Math.min(area.right - w - 4, x - w * 0.5)));
        bubble.y = Math.round(Math.max(area.y + 4, Math.min(area.bottom - h - 4, y - h - 10)));
        bubble.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        bubble.name = "ioShareChooser";
        host.addChild(bubble);
        IoMapShare._chooser = bubble;
        if (bubble.stage) {
            // Closes when the mouse goes down anywhere else (next frame: not on this very click).
            TweenLite.delayedCall(0.05, (): void => {
                if (IoMapShare._chooser == bubble && bubble.stage) {
                    bubble.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoMapShare.onStageDown);
                }
            });
        }
    }

    private static onStageDown(e: MouseEvent): void {
        if (IoMapShare._chooser && IoMapShare._chooser.stage && e.target instanceof DisplayObject && IoMapShare._chooser.contains(as3.cast(e.target, DisplayObject))) {
            return;
        }
        IoMapShare.HideChooser();
    }

    public static HideChooser(): void {
        if (IoMapShare._chooser) {
            if (IoMapShare._chooser.stage) {
                IoMapShare._chooser.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoMapShare.onStageDown);
            }
            if (IoMapShare._chooser.parent) {
                IoMapShare._chooser.parent.removeChild(IoMapShare._chooser);
            }
            IoMapShare._chooser = null;
        }
    }

    private static share(host: DisplayObjectContainer, area: Rectangle, mode: string, cellX: int, cellY: int): void {
        let error: string = Chat._bymChat ? Chat._bymChat.ioShareLocation(mode, IoMapShare.Token(cellX, cellY)) : "The chat is not connected right now.";
        IoMapShare.HideChooser();
        if (error) {
            GLOBAL.Message(error);
            return;
        }
        IoMapShare.Toast(host, "Posted to " + (mode == BYMChat.IO_ALLIANCE ? "Alliance" : "Global") + " chat", area.x + area.width * 0.5, area.bottom - 60);
    }

    /** A short note over the map that fades away. */
    public static Toast(host: DisplayObjectContainer, text: string, centreX: number, y: number): void {
        let toast: Sprite = null;
        toast = new Sprite();
        let label: TextField = IoMapUi.label(text, 12, IoMapUi.LIGHT, true, 300);
        label.width = label.textWidth + 8;
        label.x = 14;
        label.y = 6;
        IoMapUi.glass(toast.graphics, label.width + 28, 30, 15);
        toast.addChild(label);
        toast.mouseEnabled = false;
        toast.mouseChildren = false;
        toast.x = Math.round(centreX - toast.width * 0.5);
        toast.y = Math.round(y);
        host.addChild(toast);
        TweenLite.to(toast, 0.6, { "alpha": 0, "delay": 2.2, "onComplete": (): void => {
            if (toast.parent) {
                toast.parent.removeChild(toast);
            }
        } });
    }

    // ---- the chat
    /**
     * A chat line's html with its place tokens made into coordinates. Returns { html, links }, links being
     * { x, y, tag, label } in the order they appear; null when the line has none.
     */
    public static RenderChat(html: string): any {
        let links: any[] = null;
        links = [];
        if (!html || (html.indexOf("[map:") < 0 && html.indexOf(IoReplays.TOKEN_START) < 0)) {
            return null;
        }
        // (3 October: attack replays shared from the attack logs or a replay, [replay:key], show as a pill too,
        // with a play mark; clicking one watches it: IoReplays.Watch)
        IoMapShare.ANY_TOKEN.lastIndex = 0;
        let out: string = html.replace(IoMapShare.ANY_TOKEN, (...match: any[]): string => {
            if (match[4]) {
                let replayLabel: string = IoMapShare.NBSP + IoMapShare.NBSP + IoMapShare.NBSP + IoMapShare.NBSP + "Attack replay" + IoMapShare.NBSP;
                links.push({ "replay": String(match[4]), "label": replayLabel });
                return "<font color=\"#6A3F00\"><b>" + replayLabel + "</b></font>";
            }
            let cellX: int = match[1] | 0;
            let cellY: int = match[2] | 0;
            // (non-breaking spaces: the pin and its numbers stay on one line; the Depths' cells their own numbers)
            let label: string = IoMapShare.NBSP + IoMapShare.NBSP + IoMapShare.NBSP + IoMapShare.NBSP + IoMapUi.coord(cellX, cellY).split(" ").join(IoMapShare.NBSP) + IoMapShare.NBSP;
            links.push({ "x": cellX, "y": cellY, "tag": match[3] ? String(match[3]) : "", "label": label });
            return "<font color=\"#6A3F00\"><b>" + label + "</b></font>";
        });
        return links.length > 0 ? { "html": out, "links": links } : null;
    }

    /**
     * Draws the pills behind a chat line's places and makes them clickable. `line` is the line's clip,
     * `text` its text field (already laid out).
     */
    public static DecorateChat(line: MovieClip, text: TextField, links: any[]): void {
        let plain: string = text.text;
        let from: int = 0;
        let link: any = null;
        let start: int = 0;
        let pills: Shape = new Shape();
        for (link of as3.values(links)) {
            start = plain.indexOf(String(link.label), from);
            if (start < 0) {
                continue;
            }
            link.start = start;
            link.end = start + String(link.label).length;
            from = link.end | 0;
        }
        pills.x = text.x;
        pills.y = text.y;
        line.addChildAt(pills, Math.max(0, line.getChildIndex(text)) | 0);
        IoMapShare._decorated.set(line, { "text": text, "links": links, "pills": pills, "width": -1 });
        IoMapShare.RelayoutChat(line);
        line.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            let hit: any = IoMapShare.linkAt(text, links);
            if (hit) {
                e.stopPropagation();
                SOUNDS.Play("click1");
                if (hit.replay) {
                    IoReplays.Watch(String(hit.replay));
                } else {
                    IoMapShare.Open(hit.x | 0, hit.y | 0, String(hit.tag));
                }
            }
        });
        line.addEventListener(MouseEvent.MOUSE_MOVE, (e: MouseEvent): void => {
            let over: boolean = IoMapShare.linkAt(text, links) != null;
            if (line.buttonMode != over) {
                line.buttonMode = over;
                line.useHandCursor = over;
            }
        });
    }

    /** The chat has laid its line out again (a new width): the pills follow the text. */
    public static RelayoutChat(line: DisplayObject): void {
        let entry: any = IoMapShare._decorated.get(line);
        let link: any = null;
        let g: Graphics = null;
        if (!entry || entry.width == as3.cast(entry.text, TextField).width) {
            return;
        }
        entry.width = as3.cast(entry.text, TextField).width;
        g = as3.cast(entry.pills, Shape).graphics;
        g.clear();
        for (link of as3.values(entry.links)) {
            if ((link.end | 0) > 0) {
                IoMapShare.drawPill(g, as3.cast(entry.text, TextField), link.start | 0, link.end | 0, Boolean(link.replay));
            }
        }
    }

    private static linkAt(text: TextField, links: any[]): any {
        let index: int = text.getCharIndexAtPoint(text.mouseX, text.mouseY);
        if (index < 0) {
            return null;
        }
        for (let link of as3.values(links)) {
            if (link.end > 0 && index >= (link.start | 0) && index < (link.end | 0)) {
                return link;
            }
        }
        return null;
    }

    /** A rounded pill behind characters start to end (one per line they are on), a pin at its start. */
    private static drawPill(g: Graphics, text: TextField, start: int, end: int, replay: boolean = false): void {
        let box: Rectangle = null;
        let line: int = -1;
        let lineBox: Rectangle = null;
        let first: boolean = true;
        let i: int = start;
        let boxes: any[] = [];
        while (i < end) {
            box = text.getCharBoundaries(i);
            if (box) {
                if (text.getLineIndexOfChar(i) != line || !lineBox) {
                    line = text.getLineIndexOfChar(i);
                    lineBox = box.clone();
                    boxes.push(lineBox);
                } else {
                    lineBox.width = Math.max(lineBox.right, box.right) - lineBox.x;
                    lineBox.height = Math.max(lineBox.height, box.height);
                }
            }
            i++;
        }
        for (box of as3.values(boxes)) {
            IoMapUi.roundBox(g, box.x, box.y + 1, box.width, box.height - 1, 16245667, 1, 0xB8860B, Math.min(8, box.height / 2), 1);
            if (first) {
                if (replay) {
                    // (a play mark, for a replay)
                    let h: number = Math.min(10, box.height - 5);
                    let cy: number = box.y + box.height * 0.5 + 0.5;
                    g.lineStyle();
                    g.beginFill(6962944, 1);
                    g.moveTo(box.x + 4, cy - h * 0.5);
                    g.lineTo(box.x + 4 + h * 0.85, cy);
                    g.lineTo(box.x + 4, cy + h * 0.5);
                    g.lineTo(box.x + 4, cy - h * 0.5);
                    g.endFill();
                } else {
                    IoMapUi.pin(g, box.x + 7, box.y + box.height - 2, 12092939, Math.min(12, box.height - 3), 6962944);
                }
                first = false;
            }
        }
    }

    // ---- opening a shared place
    /** Opens the map at a place from chat (or moves the open map there). */
    public static Open(cellX: int, cellY: int, tag: string): void {
        let where: Point = new Point(cellX, cellY);
        if (tag && IoMapSnapshot.world && tag != IoMapSnapshot.worldTag) {
            GLOBAL.Message("This place was shared on another world, so it is not on your map.");
            return;
        }
        IoQuests.once("map_openlink");
        // (the quest book)
        if ((cellX < 0 || cellY < 0 || cellX >= MapRoom._mapWidth || cellY >= MapRoom._mapHeight) && !IoUnderworld.isUnder(cellX, cellY)) {
            return;
        }
        if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
            MapRoom.JumpTo(where);
            MapRoom._mc.ioMarkSpot(cellX, cellY);
            return;
        }
        if (BASE.ioAttackRunning() || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            GLOBAL.Message("Not during an attack. Open it again when you are back in your yard.");
            return;
        }
        IoMapShare._pendingTag = tag && !IoMapSnapshot.world ? tag : null;
        MapRoom.ioFocus = where;
        MapRoom.ioMark = where;
        GLOBAL.ShowMap();
        if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
            MapRoom.ioFocus = null;
            // the map didn't open: don't jump there the next time it does
            MapRoom.ioMark = null;
            IoMapShare._pendingTag = null;
        }
    }

    /**
     * Opens the map on a cell of the player's own world (or moves the open map there), marked: the
     * leaderboards' Jump (com/monsters/leaderboards/IoLeaderboards). Its caller has made sure it is the
     * player's world.
     */
    public static OpenOwnWorld(cellX: int, cellY: int): void {
        let where: Point = new Point(cellX, cellY);
        if (cellX < 0 || cellY < 0) {
            return;
        }
        if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
            MapRoom.JumpTo(where);
            MapRoom._mc.ioMarkSpot(cellX, cellY);
            return;
        }
        if (BASE.ioAttackRunning() || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            GLOBAL.Message("Not during an attack. Open it again when you are back in your yard.");
            return;
        }
        MapRoom.ioFocus = where;
        MapRoom.ioMark = where;
        GLOBAL.ShowMap();
        if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
            MapRoom.ioFocus = null;
            // the map didn't open: don't jump there the next time it does
            MapRoom.ioMark = null;
        }
    }

    /** The map now knows its world: a place opened from another world's chat is said to be so. */
    public static CheckPendingWorld(): void {
        if (IoMapShare._pendingTag && IoMapSnapshot.world) {
            if (IoMapShare._pendingTag != IoMapSnapshot.worldTag) {
                GLOBAL.Message("That place was shared on another world, so it is not on your map.");
            }
            IoMapShare._pendingTag = null;
        }
    }
}
