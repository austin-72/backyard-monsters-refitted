import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, GradientType, MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { clearInterval, getTimer, setInterval } from "flash/utils";
import { castWorkerAvailable, castWorkerFrame, castWorkerStats } from "flash/_castWorker";
import { ArcadeWindow, ATTACK, UI_TOP, BASE, CasinoUI, CasinoWindow, Chat, EnumYardType, GLOBAL, IoAttackLogs, IoGauntlet, IoKit, IoLiveWatch, IoReplayPlayer, IoReplayRecorder, IoSiege, IoTd, IoTd2, KEYS, LOGGER, POPUPSETTINGS, SOUNDS, URLLoaderApi } from "@game";
import { player as flashPlayer } from "flash/display/core";

/**
 * Inferno-only (18 October, the user's): the Watch menu, the top bar's Watch (between the Attack Log and the
 * Leaderboards). Anyone can watch what anyone else is doing live (server: services/live/liveActivity.ts):
 *
 * - The menu lists everything live now, the longest going first: attacks (on a player's yard or outpost, on a tribe's,
 *   the Gauntlet's, Siege), games of the Brimstone Pit and of the Devil's Arcade, Hellgate Defense runs. A name
 *   follows that player: whatever they are doing, and whatever they do next ("waiting" while they do nothing that can
 *   be watched). Watch all shows the attack going on the longest, then anything else live, and waits for the next
 *   thing when nothing is.
 * - Every game says what its player is doing (activity), with its regular look for attacks on its own yards
 *   (IoLiveWatch.poll, attackwatch/status, every 5 s).
 * - An attack is watched from its recording, over the yard (IoReplayPlayer's live mode, as a yard's own player watches
 *   an attack on it: IoLiveWatch.watch, spectator). Anything else is watched as pictures of the player's game (its
 *   window: the Pit's, the arcade's; or the whole screen: Hellgate, Siege, the Gauntlet), copied from the game's own
 *   canvas at the screen's resolution and sent over the Watch socket (/live/ws, up to 15 a second, as fast as the
 *   connections keep up: server services/live/liveStream.ts); the watcher's viewer (the "viewer" window here),
 *   as big as their screen allows, shows each as it comes.
 */
export class IoWatch extends ASObject {
    // ---------------------------------------------------------------------------------------------
    // What this game is doing (attackwatch/status, with IoLiveWatch's look)
    // ---------------------------------------------------------------------------------------------

    private static _actSig: string = "";

    private static _actSince: number = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static get on(): boolean {
        return GLOBAL.INFERNO_ONLY && Boolean(GLOBAL._flags) && (GLOBAL._flags.io_liveattacks | 0) == 1;
    }

    /** What the player is doing now that others can watch ({k, t, d, key, s}), or null. */
    public static activity(): any {
        if (!IoWatch.on || GLOBAL.ioTestMode() || BASE._loading) {
            return null;
        }
        let act: any = null;
        // (an attack of the player's own, in any attack mode, the Inferno's too, until its end is sent; 18 October:
        // not BASE.ioAttackRunning, which is a raid on the player's own yard)
        let attacking: boolean = GLOBAL.isInAttackMode && !ATTACK._sentOver;
        if (IoTd2.on) {
            act = { "k": "hellgate", "t": "Hellgate Defense 2" };
        } else if (IoTd.on) {
            act = { "k": "hellgate", "t": "Hellgate Defense" };
        } else if (attacking && IoSiege.attacking) {
            act = { "k": "siege", "t": "Siege" };
        } else if (attacking && IoGauntlet.inAttack()) {
            act = { "k": "gauntlet", "t": KEYS.Get("io_watch_gauntlet_gate", { "v1": IoGauntlet.attackStage | 0 }) };
        } else if (attacking) {
            act = { "k": "attack", "t": String(BASE._ownerName || ""), "key": IoReplayRecorder.recording ? IoReplayRecorder.key : null };
        } else {
            let pit: any = CasinoWindow.ioLiveInfo();
            let arcade: any = ArcadeWindow.ioLiveInfo();
            if (pit) {
                act = { "k": "casino", "t": pit.title };
            } else if (arcade) {
                act = { "k": "arcade", "t": arcade.title, "d": arcade.mode };
            }
        }
        if (!act) {
            IoWatch._actSig = "";
            return null;
        }
        let sig: string = act.k + "|" + act.t + "|" + (act.key || "");
        if (sig != IoWatch._actSig) {
            IoWatch._actSig = sig;
            IoWatch._actSince = GLOBAL.Timestamp();
        }
        act.s = IoWatch._actSince;
        return act;
    }

    // ---------------------------------------------------------------------------------------------
    // The Watch socket (live/ticket, then /live/ws: server services/live/liveStream.ts)
    // ---------------------------------------------------------------------------------------------

    private static _ws: any = null;

    private static _wsOpen: boolean = false;

    private static _wsConnecting: boolean = false;

    private static _wsRetryAt: number = 0;

    /** The socket is kept until then (getTimer): this game is watched, or does something that can be. */
    private static _wsWantUntil: number = 0;

    private static _houseTimer: any = null;

    /** How many watch this player's pictures (the socket's last word). */
    private static _watcherCount: int = 0;

    /** The socket is wanted a while longer: the game connects (and stays connected) meanwhile. */
    private static wantSocket(ms: number): void {
        if (!IoWatch.on) {
            return;
        }
        IoWatch._wsWantUntil = Math.max(IoWatch._wsWantUntil, getTimer() + ms);
        if (IoWatch._houseTimer == null) {
            IoWatch._houseTimer = setInterval((): void => {
                IoWatch.housekeep();
            }, 500);
        }
        IoWatch.connect();
    }

    /** Connected while wanted (a watcher's viewer open keeps it wanted), closed a while after. */
    private static housekeep(): void {
        if (IoWatch._vItem && !IoWatch._vItem.key && IoWatch.viewerOpen) {
            IoWatch._wsWantUntil = Math.max(IoWatch._wsWantUntil, getTimer() + 5000);
        }
        if (getTimer() < IoWatch._wsWantUntil) {
            IoWatch.connect();
            return;
        }
        if (IoWatch._ws) {
            let ws: any = IoWatch._ws;
            IoWatch.dropSocket();
            try {
                ws.close();
            } catch (e) {
            }
        }
        if (IoWatch._houseTimer != null) {
            clearInterval(IoWatch._houseTimer);
            IoWatch._houseTimer = null;
        }
    }

    private static dropSocket(): void {
        // (a new connection starts with whole pictures, both ways)
        IoWatch._castNeedKey = true;
        IoWatch._castPrev = null;
        IoWatch._vQueue = [];
        IoWatch._vFrame = null;
        IoWatch._ws = null;
        IoWatch._wsOpen = false;
        IoWatch._castOn = false;
        IoWatch._inFlight = 0;
    }

    private static connect(): void {
        let Native: any = (globalThis as any).WebSocket;
        if (IoWatch._ws || IoWatch._wsConnecting || !IoWatch.on || !Native || getTimer() < IoWatch._wsRetryAt) {
            return;
        }
        IoWatch._wsConnecting = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "live/ticket", [["t", GLOBAL.Timestamp()]], (r: any): void => {
            IoWatch._wsConnecting = false;
            if (!r || (r.error !== 0 && r.error !== "0") || !r.ticket || IoWatch._ws) {
                IoWatch._wsRetryAt = getTimer() + 5000;
                return;
            }
            let base: string = String(GLOBAL.serverUrl);
            if (base.charAt(base.length - 1) != "/") {
                base += "/";
            }
            let ws: any = null;
            try {
                ws = new Native(base.replace(/^http/, "ws") + String(r.path) + "?ticket=" + String(r.ticket));
            } catch (e) {
                IoWatch._wsRetryAt = getTimer() + 5000;
                return;
            }
            ws.binaryType = "arraybuffer";
            IoWatch._ws = ws;
            ws.onopen = (): void => {
                if (IoWatch._ws != ws) {
                    return;
                }
                IoWatch._wsOpen = true;
                // (a viewer waiting for this socket: its player's pictures)
                if (IoWatch._vItem && !IoWatch._vItem.key) {
                    IoWatch.send({ "t": "watch", "uid": IoWatch._vItem.uid | 0 });
                }
            };
            ws.onmessage = (ev: any): void => {
                if (IoWatch._ws == ws) {
                    IoWatch.onSocket(ev.data);
                }
            };
            ws.onclose = (): void => {
                if (IoWatch._ws == ws) {
                    IoWatch.dropSocket();
                    IoWatch._wsRetryAt = getTimer() + 2000;
                }
            };
            ws.onerror = (): void => {
            };
        }, (e: IOErrorEvent): void => {
            IoWatch._wsConnecting = false;
            IoWatch._wsRetryAt = getTimer() + 5000;
        });
    }

    private static send(msg: any): void {
        if (IoWatch._ws && IoWatch._wsOpen) {
            try {
                IoWatch._ws.send(JSON.stringify(msg));
            } catch (e) {
            }
        }
    }

    private static onSocket(data: any): void {
        if (typeof data == "string") {
            let msg: any = null;
            try {
                msg = JSON.parse(data);
            } catch (e) {
                return;
            }
            if (!msg) {
                return;
            }
            // (someone started or stopped watching: the list of who is watching, at once)
            if ((msg.t == "on" || msg.t == "off") && (msg.n | 0) != IoWatch._watcherCount) {
                IoWatch._watcherCount = msg.n | 0;
                IoLiveWatch.poll();
            }
            if (msg.t == "on") {
                IoWatch._castOn = true;
                // (a new watcher: a whole picture first)
                if (msg.key) {
                    IoWatch._castNeedKey = true;
                }
                IoWatch.startCasting();
            } else if (msg.t == "key") {
                IoWatch._castNeedKey = true;
            } else if (msg.t == "off") {
                IoWatch._castOn = false;
            } else if (msg.t == "ok") {
                IoWatch._inFlight = Math.max(0, IoWatch._inFlight - 1);
            }
            return;
        }
        // (a picture of the player watched)
        IoWatch.showFrame(data);
    }

    // ---------------------------------------------------------------------------------------------
    // Pictures of this game, while someone watches it: copied from the screen itself, sent over the socket
    // ---------------------------------------------------------------------------------------------

    /** Someone watches this game (the server's word): pictures go. */
    private static _castOn: boolean = false;

    private static _castTimer: any = null;

    /** Pictures sent the server hasn't passed on yet (at most CAST_AHEAD: a slow connection gets fewer, not later). */
    private static _inFlight: int = 0;

    private static _encoding: boolean = false;

    private static _castAt: number = 0;

    private static _castCanvas: any = null;

    private static _castType: string = null;

    private static _castBroken: boolean = false;

    private static readonly CAST_AHEAD: int = 2;

    /** Pictures a second: a game's window; the whole screen (Hellgate, Siege, the Gauntlet). */
    private static readonly WINDOW_FPS: number = 15;

    private static readonly SCREEN_FPS: number = 10;

    /** The biggest picture sent (pixels, both ways). */
    private static readonly PIC_MAX_W: int = 1280;

    private static readonly PIC_MAX_H: int = 960;

    /** The server says someone watches this player (attackwatch/status's stream: 1): connected, the pictures follow. */
    public static castWanted(): void {
        IoWatch.wantSocket(15000);
    }

    /** This game is doing something that can be watched (not an attack: those are watched from their recording). */
    public static watchable(act: any): void {
        if (act && !act.key) {
            IoWatch.wantSocket(15000);
        }
    }

    private static startCasting(): void {
        if (IoWatch._castTimer == null && !IoWatch._castBroken) {
            IoWatch._castTimer = setInterval((): void => {
                IoWatch.castStep();
            }, 33);
        }
    }

    private static castStop(): void {
        if (IoWatch._castTimer != null) {
            clearInterval(IoWatch._castTimer);
            IoWatch._castTimer = null;
        }
    }

    /**
     * (18 October, the user's: lighter) The stream is a full picture now and then (a "key": when someone starts watching,
     * every KEY_EVERY_MS, when most of the screen changed) and, in between, only the squares of the screen that
     * changed since the picture before (TILE pixels a side), packed side by side into one small picture: a still
     * screen sends nothing, a game with one thing moving sends that thing. Each message: "IOW2", 0 (key) or 1 (the
     * changed squares), the square's size, the picture's width and height, how many squares and where each is
     * (column, row), then the picture (WebP, or JPEG).
     */
    private static readonly TILE: int = 64;

    private static readonly KEY_EVERY_MS: number = 10000;

    /** More than this share of the squares changed: a whole picture (as light, and simpler). */
    private static readonly KEY_SHARE: number = 0.55;

    /** The screen as last sent, pixel by pixel (what the squares are compared with). */
    private static _castPrev: any = null;

    private static _castKeyAt: number = 0;

    /** The server asked for a whole picture (someone started watching, or fell behind). */
    private static _castNeedKey: boolean = true;

    private static _castAtlas: any = null;

    /** Sent: whole pictures, pictures of changed squares, bytes (for tests). */
    public static castKeys: int = 0;

    public static castDeltas: int = 0;

    public static castBytes: number = 0;

    /** For tests: the background thread's pictures (flash/_castWorker). */
    public static get castWorker(): any {
        return { "available": castWorkerAvailable(), "made": castWorkerStats.made, "none": castWorkerStats.none, "failed": castWorkerStats.failed };
    }

    private static castStep(): void {
        if (!IoWatch._castOn || !IoWatch._wsOpen || !IoWatch._ws) {
            IoWatch.castStop();
            return;
        }
        if (IoWatch._encoding || IoWatch._inFlight >= IoWatch.CAST_AHEAD || Number(IoWatch._ws.bufferedAmount || 0) > 600000) {
            return;
        }
        let doc: any = (globalThis as any).document;
        if (doc && doc.hidden) {
            return;
        }
        let act: any = IoWatch.activity();
        if (!act || act.key) {
            return;
        }
        let fps: number = act.k == "casino" || act.k == "arcade" ? IoWatch.WINDOW_FPS : IoWatch.SCREEN_FPS;
        if (getTimer() - IoWatch._castAt < 1000 / fps - 4) {
            return;
        }
        IoWatch._castAt = getTimer();
        let canvas: any = IoWatch.capture(act);
        if (!canvas) {
            return;
        }
        try {
            IoWatch.castFrame(canvas);
        } catch (e) {
            IoWatch._encoding = false;
            IoWatch._castBroken = true;
            IoWatch.castStop();
            LOGGER.Log("log", "Watch: no picture of the game (" + e.message + ")");
        }
    }

    /**
     * A captured screen: a whole picture, the changed squares, or nothing (nothing changed). Made in a background
     * thread where the browser can (flash/_castWorker: the game only takes a snapshot); otherwise here (castFrameHere).
     */
    private static castFrame(canvas: any): void {
        if (!castWorkerAvailable()) {
            IoWatch.castFrameHere(canvas);
            return;
        }
        let key: boolean = IoWatch._castNeedKey || getTimer() - IoWatch._castKeyAt > IoWatch.KEY_EVERY_MS;
        let ws: any = IoWatch._ws;
        IoWatch._encoding = true;
        castWorkerFrame(canvas, { "key": key, "tile": IoWatch.TILE, "keyShare": IoWatch.KEY_SHARE, "type": IoWatch.castType(), "quality": IoWatch._castType == "image/webp" ? 0.8 : 0.85 }).then((r: any): void => {
            IoWatch._encoding = false;
            if (r.error) {
                // (the next one made here, and whole: the last one sent may not be known here)
                castWorkerStats.failed++;
                IoWatch._castPrev = null;
                IoWatch._castNeedKey = true;
                return;
            }
            if (r.none) {
                castWorkerStats.none++;
                return;
            }
            castWorkerStats.made++;
            if (r.key) {
                IoWatch._castNeedKey = false;
                IoWatch._castKeyAt = getTimer();
            }
            if (IoWatch._ws == ws && IoWatch._wsOpen && IoWatch._castOn) {
                try {
                    ws.send(r.buf);
                    IoWatch._inFlight++;
                    IoWatch.castBytes += r.buf.byteLength;
                    if (r.key) {
                        IoWatch.castKeys++;
                    } else {
                        IoWatch.castDeltas++;
                    }
                } catch (e) {
                }
            } else {
                // (not sent: the next must be whole)
                IoWatch._castNeedKey = true;
            }
        }, (): void => {
            IoWatch._encoding = false;
            IoWatch._castNeedKey = true;
        });
    }

    /** castFrame on the game's own thread (a browser that can't make pictures in a background thread). */
    private static castFrameHere(canvas: any): void {
        let w: int = canvas.width | 0;
        let h: int = canvas.height | 0;
        let T: int = IoWatch.TILE;
        let cols: int = Math.ceil(w / T) | 0;
        let rows: int = Math.ceil(h / T) | 0;
        let pixels: any = new (globalThis as any).Uint32Array(canvas.getContext("2d").getImageData(0, 0, w, h).data.buffer);
        let prev: any = IoWatch._castPrev;
        let key: boolean = IoWatch._castNeedKey || !prev || prev.length != pixels.length || IoWatch._castPrevW != w || getTimer() - IoWatch._castKeyAt > IoWatch.KEY_EVERY_MS;
        let changed: any[] = [];
        if (!key) {
            // (each square compared with the screen as last sent, row by row: the first different pixel is enough)
            for (let ty: int = 0; ty < rows; ty++) {
                let y0: int = ty * T;
                let y1: int = Math.min(h, y0 + T) | 0;
                for (let tx: int = 0; tx < cols; tx++) {
                    let x0: int = tx * T;
                    let x1: int = Math.min(w, x0 + T) | 0;
                    let diff: boolean = false;
                    for (let y: int = y0; y < y1 && !diff; y++) {
                        let row: int = y * w;
                        for (let x: int = x0; x < x1; x++) {
                            if (pixels[row + x] !== prev[row + x]) {
                                diff = true;
                                break;
                            }
                        }
                    }
                    if (diff) {
                        changed.push(tx, ty);
                    }
                }
            }
            if (!changed.length) {
                return;
            }
            if (changed.length / 2 > cols * rows * IoWatch.KEY_SHARE) {
                key = true;
            }
        }
        IoWatch._castPrev = pixels;
        IoWatch._castPrevW = w;
        let source: any = canvas;
        let count: int = 0;
        if (key) {
            IoWatch._castNeedKey = false;
            IoWatch._castKeyAt = getTimer();
        } else {
            // (the changed squares side by side, up to 16 a row)
            count = (changed.length / 2) | 0;
            let across: int = Math.min(count, 16) | 0;
            let down: int = Math.ceil(count / across) | 0;
            let atlas: any = IoWatch._castAtlas;
            if (!atlas) {
                atlas = IoWatch._castAtlas = (globalThis as any).document.createElement("canvas");
            }
            if (atlas.width != across * T || atlas.height != down * T) {
                atlas.width = across * T;
                atlas.height = down * T;
            }
            let actx: any = atlas.getContext("2d");
            for (let i: int = 0; i < count; i++) {
                let tx: int = changed[i * 2];
                let ty: int = changed[i * 2 + 1];
                let tw: int = Math.min(T, w - tx * T) | 0;
                let th: int = Math.min(T, h - ty * T) | 0;
                actx.drawImage(canvas, tx * T, ty * T, tw, th, (i % across) * T, ((i / across) | 0) * T, tw, th);
            }
            source = atlas;
        }
        // (the header: "IOW2", kind, square size, width, height, how many squares, where each is)
        let head: any = new (globalThis as any).Uint8Array(12 + count * 2);
        head[0] = 73;
        head[1] = 79;
        head[2] = 87;
        head[3] = 50;
        head[4] = key ? 0 : 1;
        head[5] = T;
        head[6] = w & 255;
        head[7] = (w >> 8) & 255;
        head[8] = h & 255;
        head[9] = (h >> 8) & 255;
        head[10] = count & 255;
        head[11] = (count >> 8) & 255;
        for (let j: int = 0; j < count * 2; j++) {
            head[12 + j] = changed[j];
        }
        IoWatch._encoding = true;
        let ws: any = IoWatch._ws;
        source.toBlob((blob: any): void => {
            if (!blob) {
                IoWatch._encoding = false;
                return;
            }
            new (globalThis as any).Blob([head, blob]).arrayBuffer().then((buf: any): void => {
                IoWatch._encoding = false;
                if (IoWatch._ws == ws && IoWatch._wsOpen && IoWatch._castOn) {
                    try {
                        ws.send(buf);
                        IoWatch._inFlight++;
                        IoWatch.castBytes += buf.byteLength;
                        if (key) {
                            IoWatch.castKeys++;
                        } else {
                            IoWatch.castDeltas++;
                        }
                    } catch (e) {
                    }
                } else {
                    // (not sent: the next must be whole)
                    IoWatch._castNeedKey = true;
                }
            }, (): void => {
                IoWatch._encoding = false;
                IoWatch._castNeedKey = true;
            });
        }, IoWatch.castType(), IoWatch._castType == "image/webp" ? 0.8 : 0.85);
    }

    private static _castPrevW: int = 0;

    /**
     * Where the chat shows, on the stage: its messages' box (the chat's own mask: the chat itself reaches far past it,
     * its whole history), with its tabs above and the line to type in below.
     */
    private static chatArea(): Rectangle {
        try {
            let box: any = Chat._bymChat.chatBox;
            let mask: DisplayObject = box && box.background ? as3.as(box.background.mcMask, DisplayObject) : null;
            if (!mask || !mask.stage) {
                return null;
            }
            let r: Rectangle = mask.getBounds(mask.stage);
            return new Rectangle(r.x - 20, r.y - 34, r.width + 44, r.height + 34 + 52);
        } catch (e) {
            return null;
        }
    }

    /** a is drawn over b (later in the display list). */
    private static isAbove(a: DisplayObject, b: DisplayObject): boolean {
        let chain: Function = (o: DisplayObject): any[] => {
            let out: any[] = [];
            while (o) {
                out.unshift(o);
                o = o.parent;
            }
            return out;
        };
        let ca: any[] = chain(a);
        let cb: any[] = chain(b);
        let i: int = 0;
        while (i < ca.length && i < cb.length && ca[i] == cb[i]) {
            i++;
        }
        if (i == 0 || i >= ca.length || i >= cb.length) {
            return i >= cb.length;
        }
        let parent: any = ca[i - 1];
        return parent.getChildIndex(ca[i]) > parent.getChildIndex(cb[i]);
    }

    /** WebP where the browser makes it (sharper for its size), else JPEG. */
    private static castType(): string {
        if (!IoWatch._castType) {
            IoWatch._castType = "image/jpeg";
            try {
                let doc: any = (globalThis as any).document;
                let c: any = doc.createElement("canvas");
                c.width = c.height = 2;
                if (String(c.toDataURL("image/webp")).indexOf("data:image/webp") == 0) {
                    IoWatch._castType = "image/webp";
                }
            } catch (e) {
            }
        }
        return IoWatch._castType;
    }

    /**
     * What the screen shows for this activity, copied from the game's own canvas (at the screen's resolution, as the
     * player sees it): the game's window (the Pit's, the arcade's), or the whole screen (Hellgate, Siege, the
     * Gauntlet). The chat is covered. A canvas, or null.
     */
    public static capture(act: any): any {
        let player: any = (globalThis as any).__player;
        let screen: any = player ? player.canvas : null;
        let stage: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        let view: any = stage ? stage.$ioView : null;
        if (!screen || !view || !(view.px > 0) || screen.width < 16 || screen.height < 16) {
            return null;
        }
        let px: number = Number(view.px);
        let toCanvas: Function = (r: Rectangle): any => {
            return { "x": (r.x - view.x) * px, "y": (r.y - view.y) * px, "w": r.width * px, "h": r.height * px };
        };
        let src: any = { "x": 0, "y": 0, "w": screen.width, "h": screen.height };
        let win: DisplayObject = null;
        if (act.k == "casino" || act.k == "arcade") {
            let info: any = act.k == "casino" ? CasinoWindow.ioLiveInfo() : ArcadeWindow.ioLiveInfo();
            win = info ? as3.as(info.mc, DisplayObject) : null;
            if (!win || !win.stage) {
                return null;
            }
            src = toCanvas(win.getBounds(win.stage));
        }
        // (on the screen only)
        let x0: number = Math.max(0, Math.floor(src.x));
        let y0: number = Math.max(0, Math.floor(src.y));
        let x1: number = Math.min(screen.width, Math.ceil(src.x + src.w));
        let y1: number = Math.min(screen.height, Math.ceil(src.y + src.h));
        if (x1 - x0 < 16 || y1 - y0 < 16) {
            return null;
        }
        let sw: number = x1 - x0;
        let sh: number = y1 - y0;
        let s: number = Math.min(1, IoWatch.PIC_MAX_W / sw, IoWatch.PIC_MAX_H / sh);
        let w: int = Math.max(16, Math.round(sw * s)) | 0;
        let h: int = Math.max(16, Math.round(sh * s)) | 0;
        let c: any = IoWatch._castCanvas;
        if (!c) {
            c = IoWatch._castCanvas = (globalThis as any).document.createElement("canvas");
        }
        if (c.width != w || c.height != h) {
            c.width = w;
            c.height = h;
        }
        let ctx: any = c.getContext("2d", { "willReadFrequently": true });
        // (22 October: the last picture cleared first: shown straight from the card, the game's canvas is see-through
        // over the yard, and a frame without the card's canvas under it showed the last picture through it)
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // (21 October: the yard shown straight from the graphics card is under the game's canvas, not in it: first)
        let layer: any = flashPlayer.glLayer;
        if (layer && layer.style.display !== "none" && layer.width === screen.width && layer.height === screen.height) {
            ctx.drawImage(layer, x0, y0, sw, sh, 0, 0, w, h);
        }
        ctx.drawImage(screen, x0, y0, sw, sh, 0, 0, w, h);
        // (the player's chat isn't theirs to show: covered where it is over what's shown, not under a window)
        let chat: DisplayObject = Chat._bymChat ? as3.as(Chat._bymChat, DisplayObject) : null;
        let area: Rectangle = chat && chat.stage && chat.visible ? IoWatch.chatArea() : null;
        if (area && (!win || IoWatch.isAbove(chat, win))) {
            let r: any = toCanvas(area);
            let cx: number = (r.x - x0) * s;
            let cy: number = (r.y - y0) * s;
            if (cx < w && cy < h && cx + r.w * s > 0 && cy + r.h * s > 0) {
                ctx.fillStyle = "#140B09";
                ctx.fillRect(cx, cy, r.w * s, r.h * s);
            }
        }
        return c;
    }

    // ---------------------------------------------------------------------------------------------
    // Following someone, or watching all
    // ---------------------------------------------------------------------------------------------

    /** null (not watching), "follow" (one player) or "all". */
    private static _mode: string = null;

    private static _followUid: int = 0;

    private static _followName: string = null;

    /** What is shown now ({uid, name, kind, title, key, ...}: a live/list item), or null (waiting). */
    private static _current: any = null;

    private static _tickTimer: any = null;

    private static _tickBusy: boolean = false;

    /** Watch all's Next: this one is passed over until it changes. */
    private static _skip: string = null;

    private static _items: any[] = [];

    /** Next: what is shown is left even before its end. */
    private static _force: boolean = false;

    public static get mode(): string {
        return IoWatch._mode;
    }

    public static get followName(): string {
        return IoWatch._followName;
    }

    /** Follows one player: whatever they do that can be watched. */
    public static follow(uid: int, name: string): void {
        if (!IoWatch.on) {
            return;
        }
        IoWatch._mode = "follow";
        IoWatch._followUid = uid;
        IoWatch._followName = name;
        IoWatch._current = null;
        IoWatch._skip = null;
        IoWatch.startTicks();
    }

    /** Watches everything: the attack going on the longest, then anything else live, then the next thing. */
    public static watchAll(): void {
        if (!IoWatch.on) {
            return;
        }
        IoWatch._mode = "all";
        IoWatch._followUid = 0;
        IoWatch._followName = null;
        IoWatch._current = null;
        IoWatch._skip = null;
        IoWatch.startTicks();
    }

    /** Watch all: on to the next thing live. */
    public static next(): void {
        if (IoWatch._mode != "all") {
            return;
        }
        IoWatch._skip = IoWatch._current ? IoWatch.sig(IoWatch._current) : null;
        IoWatch._current = null;
        IoWatch._force = true;
        IoWatch.tick(true);
    }

    /** Stops watching: home, if an attack was shown. */
    public static stop(): void {
        IoWatch._mode = null;
        IoWatch._current = null;
        if (IoWatch._tickTimer != null) {
            clearInterval(IoWatch._tickTimer);
            IoWatch._tickTimer = null;
        }
        IoWatch.closeViewer();
        if (IoReplayPlayer.live && IoReplayPlayer.spectator) {
            IoReplayPlayer.Clear();
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }
    }

    /** Stops watching where the player is now. */
    private static quietStop(): void {
        IoWatch._mode = null;
        IoWatch._current = null;
        IoWatch._viewerAfterLoad = null;
        if (IoWatch._tickTimer != null) {
            clearInterval(IoWatch._tickTimer);
            IoWatch._tickTimer = null;
        }
    }

    private static startTicks(): void {
        if (IoWatch._tickTimer == null) {
            IoWatch._tickTimer = setInterval((): void => {
                IoWatch.tick(false);
            }, 3000);
        }
        IoWatch.tick(true);
    }

    private static sig(item: any): string {
        return item ? (item.uid | 0) + "|" + item.kind + "|" + (item.key || item.title) : "";
    }

    private static _overAt: number = 0;

    /**
     * The attack watched live hasn't shown its end yet (it is a few seconds behind), or has only just: it isn't left
     * (its end, "The attack is over", stays a few seconds).
     */
    private static holding(): boolean {
        if (!IoReplayPlayer.live || !IoReplayPlayer.spectator) {
            return false;
        }
        if (!IoReplayPlayer.liveOver) {
            IoWatch._overAt = 0;
            return true;
        }
        if (!IoWatch._overAt) {
            IoWatch._overAt = getTimer();
        }
        return getTimer() - IoWatch._overAt < 4000;
    }

    /** The attack watched live (or the pictures) are over: what's next. */
    public static ended(): void {
        if (IoWatch._mode) {
            IoWatch.tick(true);
        }
    }

    private static _shownAt: number = 0;

    private static tick(now: boolean): void {
        if (!IoWatch._mode || IoWatch._tickBusy || BASE._loading) {
            return;
        }
        // (the player went on to attack: the watching stops, and never takes them out of it)
        if (GLOBAL.isInAttackMode) {
            IoWatch.closeViewer();
            IoWatch.quietStop();
            return;
        }
        // (an attack shown, and the player went elsewhere from it: the watching stops)
        if (IoWatch._current && IoWatch._current.key && IoReplayPlayer.liveKey != String(IoWatch._current.key) && getTimer() - IoWatch._shownAt > 15000) {
            IoWatch.quietStop();
            return;
        }
        IoWatch._tickBusy = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "live/list", [["t", GLOBAL.Timestamp()]], (r: any): void => {
            IoWatch._tickBusy = false;
            if (!IoWatch._mode || !r || (r.error !== 0 && r.error !== "0")) {
                return;
            }
            IoWatch._items = as3.as(r.items, Array) || [];
            UI_TOP.ioLiveBadge(IoWatch._items.length | 0);
            IoWatch.choose(IoWatch._items);
        }, (e: IOErrorEvent): void => {
            IoWatch._tickBusy = false;
        });
    }

    /** What to show, from what is live. */
    private static choose(items: any[]): void {
        let target: any = null;
        if (IoWatch._mode == "follow") {
            for (let i of as3.values(items)) {
                if ((i.uid | 0) == IoWatch._followUid) {
                    target = i;
                }
            }
        } else {
            // (what is shown, while it lasts)
            if (IoWatch._current) {
                for (let i of as3.values(items)) {
                    if (IoWatch.sig(i) == IoWatch.sig(IoWatch._current)) {
                        target = i;
                    }
                }
            }
            if (!target) {
                let others: any[] = items.filter((i: any): boolean => IoWatch.sig(i) != IoWatch._skip);
                // (attacks first, the longest going first; then anything else, the longest going first)
                let attacks: any[] = others.filter((i: any): boolean => i.kind == "attack" || i.kind == "siege" || i.kind == "gauntlet");
                let rest: any[] = others.filter((i: any): boolean => !(i.kind == "attack" || i.kind == "siege" || i.kind == "gauntlet"));
                attacks.sort((a: any, b: any): int => (Number(a.since) - Number(b.since)) | 0);
                rest.sort((a: any, b: any): int => (Number(a.since) - Number(b.since)) | 0);
                target = attacks.length ? attacks[0] : (rest.length ? rest[0] : null);
            }
        }
        // (an attack shown live is left only once its end has been shown)
        if (!IoWatch._force && IoWatch.holding() && (!target || IoWatch.sig(target) != IoWatch.sig(IoWatch._current))) {
            return;
        }
        IoWatch._force = false;
        if (target && IoWatch._current && IoWatch.sig(target) == IoWatch.sig(IoWatch._current)) {
            return;
        }
        IoWatch.show(target);
    }

    private static show(item: any): void {
        IoWatch._current = item;
        IoWatch._shownAt = getTimer();
        IoWatch._overAt = 0;
        if (item && item.key) {
            // (an attack: from its recording, over its yard)
            IoWatch.closeViewer();
            if (IoReplayPlayer.liveKey != String(item.key)) {
                IoLiveWatch.watch({ "key": item.key, "baseid": item.baseid, "type": item.yardType, "attacker": item.name, "title": item.title }, true);
            }
            return;
        }
        // (pictures, or waiting: from home, not over an attack's yard)
        if (IoReplayPlayer.live && IoReplayPlayer.spectator) {
            IoReplayPlayer.Clear();
            IoWatch._viewerAfterLoad = item || { "waiting": true };
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            return;
        }
        IoWatch.openViewer(item);
    }

    private static _viewerAfterLoad: any = null;

    /** A yard is up (BASE): a viewer waiting for it opens. */
    public static afterLoad(): void {
        if (IoWatch._viewerAfterLoad && IoWatch._mode) {
            let item: any = IoWatch._viewerAfterLoad;
            IoWatch._viewerAfterLoad = null;
            IoWatch.openViewer(item.waiting ? null : item);
        }
    }

    // ---------------------------------------------------------------------------------------------
    // The viewer: pictures of someone's game (over the socket), or waiting
    // ---------------------------------------------------------------------------------------------

    private static _viewer: MovieClip = null;

    private static _vTitle: TextField = null;

    private static _vStatus: TextField = null;

    private static _vPic: Bitmap = null;

    private static _vData: BitmapData = null;

    /** The picture's place (stage pixels) and the viewer's pixels per stage pixel (the screen's own). */
    private static _vW: number = 0;

    private static _vH: number = 0;

    private static _vPx: number = 1;

    private static _vItem: any = null;

    private static _vTimer: any = null;

    private static _vBusy: boolean = false;

    private static _vGoneSince: number = 0;

    private static _vNext: Sprite = null;

    /** A picture being decoded. */
    private static _vDecoding: boolean = false;

    /** Pictures shown in the last second (for tests). */
    private static _vShown: int = 0;

    private static _vShownAt: number = 0;

    public static vFps: int = 0;

    /** The size of the last picture shown (for tests). */
    public static vLastW: int = 0;

    public static vLastH: int = 0;

    private static openViewer(item: any): void {
        if (!IoWatch._viewer || !IoWatch._viewer.stage) {
            IoWatch.buildViewer();
        }
        let before: any = IoWatch._vItem;
        IoWatch._vItem = item;
        IoWatch._vGoneSince = 0;
        if (!item || !before || (before.uid | 0) != (item.uid | 0)) {
            IoWatch._vQueue = [];
            IoWatch._vFrame = null;
        }
        if (IoWatch._vPic && (!item || !before || (before.uid | 0) != (item.uid | 0))) {
            IoWatch._vPic.visible = false;
        }
        IoWatch.viewerText();
        if (IoWatch._vTimer != null) {
            clearInterval(IoWatch._vTimer);
            IoWatch._vTimer = null;
        }
        IoWatch._vTimer = setInterval((): void => {
            IoWatch.viewerAsk();
        }, 1000);
        if (item) {
            // (the pictures: over the socket)
            IoWatch.wantSocket(10000);
            IoWatch.send({ "t": "watch", "uid": item.uid | 0 });
            IoWatch.viewerAsk();
        } else {
            IoWatch.send({ "t": "unwatch" });
        }
    }

    private static viewerText(): void {
        if (!IoWatch._viewer) {
            return;
        }
        let item: any = IoWatch._vItem;
        let tag: string = IoWatch._mode == "all" ? KEYS.Get("io_watch_all_tag") : KEYS.Get("io_watch_following", { "v1": IoWatch.esc(IoWatch._followName) });
        if (item) {
            IoWatch._vTitle.htmlText = "<font color=\"#FF5A3C\"><b>● " + IoWatch.esc(KEYS.Get("io_live_tag")) + "</b></font>  " + IoWatch.rowText(item) + "  <font color=\"#C8C0B8\" size=\"11\">" + tag + "</font>";
            IoWatch._vStatus.text = IoWatch._vPic && IoWatch._vPic.visible ? "" : KEYS.Get("io_watch_waiting_picture");
        } else {
            IoWatch._vTitle.htmlText = "<b>" + IoWatch.esc(KEYS.Get("io_watch_title")) + "</b>  <font color=\"#C8C0B8\" size=\"11\">" + tag + "</font>";
            IoWatch._vStatus.text = IoWatch._mode == "follow" ? KEYS.Get("io_watch_waiting_user", { "v1": IoWatch._followName || "" }) : KEYS.Get("io_watch_waiting_all");
        }
        if (IoWatch._vNext) {
            IoWatch._vNext.visible = IoWatch._mode == "all" && item != null;
        }
    }

    /**
     * The viewer: as big as the screen allows (up to about a 1180 x 900 window), its picture drawn at the screen's
     * own resolution (as many pixels as the game's canvas has there), so it's as sharp as what the player sees.
     */
    private static buildViewer(): void {
        // (the screen in stage pixels: on a wide screen the stage reaches past its 760 x 670)
        let stage: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        let view: any = stage ? stage.$ioView : null;
        let vw: number = view && view.w > 0 ? Number(view.w) : 760;
        let vh: number = view && view.h > 0 ? Number(view.h) : 670;
        let w: int = Math.max(560, Math.min(1180, vw - 40)) | 0;
        let h: int = Math.max(460, Math.min(900, vh - 30)) | 0;
        let px: number = view && view.px > 0 ? Math.min(3, Number(view.px)) : 1;
        IoWatch._vW = w - 40;
        IoWatch._vH = h - 120;
        IoWatch._vPx = px;
        let mc: MovieClip = new MovieClip();
        mc.name = "ioWatchViewer";
        let bg: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(w, h, Math.PI / 2, -w / 2, -h / 2);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(-w / 2, -h / 2, w, h, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        IoKit.rim(mc, "ioWatchRim", -w / 2, -h / 2, w, h, bg);
        IoWatch._vTitle = as3.as(mc.addChild(CasinoUI.label("", 13, 0xFFF2CC, false, w - 80)), TextField);
        IoWatch._vTitle.x = -w / 2 + 22;
        IoWatch._vTitle.y = -h / 2 + 18;
        IoWatch._vTitle.name = "ioWatchTitle";
        // (the picture's place)
        let top: number = -h / 2 + 52;
        let frame: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        frame.graphics.beginFill(0x050202, 1);
        frame.graphics.drawRect(-IoWatch._vW / 2 - 2, top - 2, IoWatch._vW + 4, IoWatch._vH + 4);
        frame.graphics.endFill();
        IoWatch._vData = new BitmapData(Math.round(IoWatch._vW * px) | 0, Math.round(IoWatch._vH * px) | 0, false, 0x050202);
        IoWatch._vPic = as3.as(mc.addChild(new Bitmap(IoWatch._vData)), Bitmap);
        IoWatch._vPic.smoothing = true;
        IoWatch._vPic.scaleX = IoWatch._vPic.scaleY = 1 / px;
        IoWatch._vPic.x = -IoWatch._vW / 2;
        IoWatch._vPic.y = top;
        IoWatch._vPic.name = "ioWatchPicture";
        IoWatch._vPic.visible = false;
        IoWatch._vStatus = as3.as(mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, w - 80, TextFormatAlign.CENTER)), TextField);
        IoWatch._vStatus.x = -w / 2 + 40;
        IoWatch._vStatus.y = top + IoWatch._vH / 2 - 12;
        IoWatch._vStatus.name = "ioWatchStatus";
        let stop: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_watch_stop"), 150, 30, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoWatch.stop();
        }, true, 13)), Sprite);
        stop.name = "ioWatchStop";
        stop.x = w / 2 - 172;
        stop.y = h / 2 - 50;
        IoWatch._vNext = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_watch_next"), 110, 30, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoWatch.next();
        }, true, 13)), Sprite);
        IoWatch._vNext.name = "ioWatchNext";
        IoWatch._vNext.x = w / 2 - 290;
        IoWatch._vNext.y = h / 2 - 50;
        let menu: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("tb_watch"), 110, 30, (e: MouseEvent): void => {
            IoWatch.Show(null);
        }, true, 13)), Sprite);
        menu.name = "ioWatchMenuButton";
        menu.x = -w / 2 + 22;
        menu.y = h / 2 - 50;
        GLOBAL._layerTop.addChild(mc);
        // (in the middle of the screen as it is)
        if (view && view.w > 0) {
            let at: Point = GLOBAL._layerTop.globalToLocal(new Point(Number(view.x) + vw / 2, Number(view.y) + vh / 2));
            mc.x = Math.round(at.x);
            mc.y = Math.round(at.y);
        } else {
            POPUPSETTINGS.AlignToCenter(mc);
        }
        IoWatch._viewer = mc;
    }

    private static closeViewer(): void {
        if (IoWatch._vTimer != null) {
            clearInterval(IoWatch._vTimer);
            IoWatch._vTimer = null;
        }
        IoWatch.send({ "t": "unwatch" });
        if (IoWatch._viewer && IoWatch._viewer.parent) {
            IoWatch._viewer.parent.removeChild(IoWatch._viewer);
        }
        IoWatch._viewer = null;
        IoWatch._vPic = null;
        if (IoWatch._vData) {
            IoWatch._vData.dispose();
            IoWatch._vData = null;
        }
        IoWatch._vItem = null;
        IoWatch._vQueue = [];
        IoWatch._vFrame = null;
    }

    public static get viewerOpen(): boolean {
        return IoWatch._viewer != null && IoWatch._viewer.stage != null;
    }

    /** What the player watched does now (live/view, every second): an activity gone for a few seconds is over. */
    private static viewerAsk(): void {
        let item: any = IoWatch._vItem;
        if (IoWatch._viewer && !IoWatch._viewer.stage && !BASE._loading) {
            // (its layer went with a yard the player opened: they went elsewhere, so the watching stops)
            IoWatch.closeViewer();
            IoWatch.quietStop();
            return;
        }
        if (!item || IoWatch._vBusy || !IoWatch._viewer) {
            return;
        }
        IoWatch._vBusy = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "live/view", [["uid", item.uid | 0]], (r: any): void => {
            IoWatch._vBusy = false;
            if (!IoWatch._viewer || IoWatch._vItem != item || !r || (r.error !== 0 && r.error !== "0")) {
                return;
            }
            let act: any = r.act;
            if (!act || IoWatch.sig({ "uid": item.uid, "kind": act.kind, "key": act.key, "title": act.title }) != IoWatch.sig(item)) {
                // (it ended, or the player went on to something else: what's next, a moment later)
                if (!IoWatch._vGoneSince) {
                    IoWatch._vGoneSince = getTimer();
                } else if (getTimer() - IoWatch._vGoneSince > 4000) {
                    IoWatch._vGoneSince = getTimer() + 600000;
                    IoWatch.ended();
                }
                return;
            }
            IoWatch._vGoneSince = 0;
        }, (e: IOErrorEvent): void => {
            IoWatch._vBusy = false;
        });
    }

    /** Bytes received, whole pictures and pictures of squares (for tests). */
    public static vBytes: number = 0;

    public static vKeys: int = 0;

    public static vDeltas: int = 0;

    /** The player's screen as last put together (whole pictures, the changed squares painted over them). */
    private static _vFrame: any = null;

    /** Messages waiting to be decoded, in order (squares can't be skipped: each builds on the picture before). */
    private static _vQueue: any[] = [];

    /**
     * (20 October) The server is told each picture is done with (shown, or let go), so it sends a game on a slow
     * connection fewer pictures rather than a queue of them (services/live/liveStream.ts: "got").
     */
    private static gotPictures(n: int): void {
        if (n > 0) {
            IoWatch.send({ "t": "got", "n": n });
        }
    }

    /** A picture came (the socket): decoded off the game's thread, in order, then shown. */
    private static showFrame(buf: any): void {
        if (!IoWatch._vData || !IoWatch._vItem || IoWatch._vItem.key) {
            IoWatch.gotPictures(1);
            return;
        }
        IoWatch.vBytes += Number(buf.byteLength || 0);
        IoWatch._vQueue.push(buf);
        if (IoWatch._vQueue.length > 8) {
            // (too far behind: what's waiting goes, and a whole picture is asked for)
            IoWatch.gotPictures(IoWatch._vQueue.length);
            IoWatch._vQueue = [];
            IoWatch._vFrame = null;
            IoWatch.send({ "t": "rekey" });
            return;
        }
        IoWatch.decodeNext();
    }

    private static decodeNext(): void {
        if (IoWatch._vDecoding || !IoWatch._vQueue.length) {
            return;
        }
        let buf: any = IoWatch._vQueue.shift();
        let G: any = globalThis as any;
        let bytes: any = new G.Uint8Array(buf);
        // ("IOW2", kind, square size, width, height, how many, where)
        if (bytes.length < 12 || bytes[0] != 73 || bytes[1] != 79 || bytes[2] != 87 || bytes[3] != 50) {
            IoWatch.gotPictures(1);
            IoWatch.decodeNext();
            return;
        }
        let key: boolean = bytes[4] == 0;
        let T: int = bytes[5] | 0;
        let w: int = bytes[6] | (bytes[7] << 8);
        let h: int = bytes[8] | (bytes[9] << 8);
        let count: int = bytes[10] | (bytes[11] << 8);
        let at: any[] = [];
        for (let i: int = 0; i < count * 2; i++) {
            at.push(bytes[12 + i]);
        }
        let frame: any = IoWatch._vFrame;
        if (!key && (!frame || frame.width != w || frame.height != h)) {
            // (squares with no picture under them: wait for a whole one)
            IoWatch.gotPictures(1);
            IoWatch.decodeNext();
            return;
        }
        IoWatch._vDecoding = true;
        let blob: any = new G.Blob([bytes.subarray(12 + count * 2)]);
        let done: Function = (): void => {
            IoWatch._vDecoding = false;
            IoWatch.gotPictures(1);
            IoWatch.decodeNext();
        };
        let paint: Function = (img: any): void => {
            if (key) {
                if (!frame || frame.width != w || frame.height != h) {
                    frame = IoWatch._vFrame = G.document.createElement("canvas");
                    frame.width = w;
                    frame.height = h;
                }
                frame.getContext("2d").drawImage(img, 0, 0, w, h);
                IoWatch.vKeys++;
            } else {
                let fctx: any = frame.getContext("2d");
                let across: int = Math.min(count, 16) | 0;
                for (let i: int = 0; i < count; i++) {
                    let tx: int = at[i * 2];
                    let ty: int = at[i * 2 + 1];
                    let tw: int = Math.min(T, w - tx * T) | 0;
                    let th: int = Math.min(T, h - ty * T) | 0;
                    fctx.drawImage(img, (i % across) * T, ((i / across) | 0) * T, tw, th, tx * T, ty * T, tw, th);
                }
                IoWatch.vDeltas++;
            }
            IoWatch.drawFrame(frame);
        };
        try {
            if (typeof G.createImageBitmap == "function") {
                G.createImageBitmap(blob).then((bmp: any): void => {
                    try {
                        paint(bmp);
                    } catch (e) {
                    }
                    try {
                        bmp.close();
                    } catch (e) {
                    }
                    done();
                }, (): void => {
                    done();
                });
                return;
            }
            let url: string = G.URL.createObjectURL(blob);
            let img: any = new G.Image();
            img.onload = (): void => {
                try {
                    paint(img);
                } catch (e) {
                }
                G.URL.revokeObjectURL(url);
                done();
            };
            img.onerror = (): void => {
                G.URL.revokeObjectURL(url);
                done();
            };
            img.src = url;
        } catch (e) {
            done();
        }
    }

    /** The player's screen as put together, fitted in the viewer's picture. */
    private static drawFrame(frame: any): void {
        let bd: any = IoWatch._vData;
        if (!bd || !IoWatch._vPic) {
            return;
        }
        let w: number = frame.width;
        let h: number = frame.height;
        let W: number = bd.width;
        let H: number = bd.height;
        let s: number = Math.min(W / Math.max(1, w), H / Math.max(1, h));
        let dw: number = w * s;
        let dh: number = h * s;
        bd.$ctx.imageSmoothingEnabled = true;
        bd.$ctx.imageSmoothingQuality = "high";
        bd.$ctx.fillStyle = "#050202";
        bd.$ctx.fillRect(0, 0, W, H);
        bd.$ctx.drawImage(frame, (W - dw) / 2, (H - dh) / 2, dw, dh);
        bd.$touch();
        if (!IoWatch._vPic.visible) {
            IoWatch._vPic.visible = true;
            IoWatch._vStatus.text = "";
        }
        IoWatch.vLastW = w | 0;
        IoWatch.vLastH = h | 0;
        IoWatch._vShown++;
        if (getTimer() - IoWatch._vShownAt >= 1000) {
            IoWatch.vFps = IoWatch._vShown;
            IoWatch._vShown = 0;
            IoWatch._vShownAt = getTimer();
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Who is watching this player (18 October, the user's): a small list at the top right while anyone does
    // ---------------------------------------------------------------------------------------------

    private static _wPanel: Sprite = null;

    private static _wText: TextField = null;

    /** The list as last shown ("" when nobody watches). */
    private static _wShown: string = "";

    public static watchedBy: any = null;

    /**
     * Who watches this player now (attackwatch/status's watchers: {names, more}, or none): their names, the players
     * appearing offline and any past the first few counted as "and 2 more".
     */
    public static showWatchers(w: any): void {
        let names: any[] = w ? as3.as(w.names, Array) || [] : [];
        let more: int = w ? w.more | 0 : 0;
        let total: int = (names.length + more) | 0;
        IoWatch.watchedBy = total ? { "names": names, "more": more } : null;
        if (!total || !IoWatch.on) {
            IoWatch.hideWatchers();
            return;
        }
        let html: string = "<font color=\"#FF5A3C\"><b>●</b></font> <b>" + IoWatch.esc(KEYS.Get("io_watch_you_title", { "v1": total })) + "</b>";
        for (let n of as3.values(names)) {
            html += "<br>" + IoWatch.esc(n);
        }
        if (more > 0) {
            html += "<br><font color=\"#C8C0B8\">" + IoWatch.esc(KEYS.Get(names.length ? "io_watch_you_more" : "io_watch_you_others", { "v1": more })) + "</font>";
        }
        if (!IoWatch._wPanel || !IoWatch._wPanel.stage) {
            IoWatch.buildWatchers();
        }
        if (html != IoWatch._wShown) {
            IoWatch._wShown = html;
            // (laid out at its widest, then fitted: the box as tall as its lines)
            IoWatch._wText.width = 224;
            IoWatch._wText.htmlText = html;
            let w2: number = Math.max(150, Math.min(240, IoWatch._wText.textWidth + 24));
            IoWatch._wText.width = w2 - 16;
            IoWatch._wText.height = IoWatch._wText.textHeight + 8;
            let h2: number = IoWatch._wText.textHeight + 20;
            let g: any = IoWatch._wPanel.graphics;
            g.clear();
            g.lineStyle(1, 0xB8541E, 0.9);
            g.beginFill(0x140B09, 0.82);
            g.drawRoundRect(0, 0, w2, h2, 12, 12);
            g.endFill();
        }
        IoWatch.placeWatchers();
    }

    private static buildWatchers(): void {
        IoWatch.hideWatchers();
        let p: Sprite = new Sprite();
        p.name = "ioWatchersPanel";
        p.mouseEnabled = false;
        p.mouseChildren = false;
        IoWatch._wText = as3.as(p.addChild(CasinoUI.label("", 12, 0xFFF2CC, false, 220)), TextField);
        IoWatch._wText.name = "ioWatchersText";
        IoWatch._wText.multiline = true;
        IoWatch._wText.wordWrap = true;
        IoWatch._wText.x = 8;
        IoWatch._wText.y = 6;
        IoWatch._wPanel = p;
        IoWatch._wShown = "";
        GLOBAL._layerTop.addChild(p);
    }

    /** At the top right of the screen, under the top bar's buttons. */
    private static placeWatchers(): void {
        let p: Sprite = IoWatch._wPanel;
        if (!p || !p.parent) {
            return;
        }
        let stage: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        let view: any = stage ? stage.$ioView : null;
        let vx: number = view && view.w > 0 ? Number(view.x) : 0;
        let vy: number = view && view.w > 0 ? Number(view.y) : 0;
        let vw: number = view && view.w > 0 ? Number(view.w) : 760;
        let at: Point = p.parent.globalToLocal(new Point(vx + vw - p.width - 70, vy + 62));
        p.x = Math.round(at.x);
        p.y = Math.round(at.y);
    }

    private static hideWatchers(): void {
        if (IoWatch._wPanel && IoWatch._wPanel.parent) {
            IoWatch._wPanel.parent.removeChild(IoWatch._wPanel);
        }
        IoWatch._wPanel = null;
        IoWatch._wShown = "";
    }

    // ---------------------------------------------------------------------------------------------
    // The menu: what's live now
    // ---------------------------------------------------------------------------------------------

    private static _open: IoWatch = null;

    public mc: MovieClip;

    private _list: any;

    private _status: TextField;

    private _sub: TextField;

    private _timer: uint;

    private static readonly ROW_H: int = 34;

    private static get W(): int {
        return IoAttackLogs.W;
    }

    private static get H(): int {
        return IoAttackLogs.H;
    }

    private static get LIST_X(): int {
        return (-IoWatch.W / 2 + 20) | 0;
    }

    private static get LIST_W(): int {
        return (IoWatch.W - 40) | 0;
    }

    private static get TOP(): int {
        return (-IoWatch.H / 2 + 130) | 0;
    }

    private static get LIST_H(): int {
        return (IoWatch.H / 2 - 30 - IoWatch.TOP) | 0;
    }

    public static Show(e: MouseEvent = null): void {
        if (IoWatch._open && (!IoWatch._open.mc || !IoWatch._open.mc.stage)) {
            IoWatch._open = null;
        }
        if (IoWatch._open || !IoWatch.on) {
            return;
        }
        SOUNDS.Play("click1");
        IoWatch._open = new IoWatch();
        IoWatch._open.build();
    }

    public static get isOpen(): boolean {
        return IoWatch._open != null;
    }

    private build(): void {
        this.mc = new MovieClip();
        this.mc.name = "ioWatchWindow";
        IoAttackLogs.frame(this.mc);
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("io_watch_title"), 34, (IoWatch.W - 200) | 0)), TextField);
        title.x = -IoWatch.W / 2 + 100;
        title.y = -IoWatch.H / 2 + 24;
        this._sub = as3.as(this.mc.addChild(CasinoUI.label("", 13, CasinoUI.GOLD, true, (IoWatch.W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._sub.x = -IoWatch.W / 2 + 20;
        this._sub.y = -IoWatch.H / 2 + 80;
        this._sub.name = "ioWatchSub";
        let all: Sprite = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("io_watch_all"), 150, 28, (e: MouseEvent): void => {
            this.close();
            IoWatch.watchAll();
        }, true, 13)), Sprite);
        all.name = "ioWatchAll";
        all.x = IoWatch.LIST_X + IoWatch.LIST_W - 150;
        all.y = -IoWatch.H / 2 + 98;
        if (IoWatch._mode) {
            let stop: Sprite = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("io_watch_stop"), 150, 28, (e: MouseEvent): void => {
                this.close();
                IoWatch.stop();
            }, true, 13)), Sprite);
            stop.name = "ioWatchMenuStop";
            stop.x = IoWatch.LIST_X;
            stop.y = -IoWatch.H / 2 + 98;
        }
        this._list = IoAttackLogs.scrollView(this.mc, IoWatch.LIST_X, IoWatch.TOP, IoWatch.LIST_W, IoWatch.LIST_H);
        this._status = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("io_watch_looking"), 14, CasinoUI.ASH, true, (IoWatch.LIST_W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._status.x = IoWatch.LIST_X + 20;
        this._status.y = IoWatch.TOP + 40;
        this._status.name = "ioWatchStatusLine";
        this.mc.addChild(IoAttackLogs.closeButton("ioWatchClose", as3.bind(this, this.close)));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL.ioBackdropCloses((): void => {
            this.close();
        });
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        this.fetch();
        this._timer = setInterval(as3.bind(this, this.fetch), 4000);
    }

    private fetch(): void {
        if (!this.mc) {
            return;
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "live/list", [["t", GLOBAL.Timestamp()]], (r: any): void => {
            if (!this.mc) {
                return;
            }
            if (!r || (r.error !== 0 && r.error !== "0")) {
                this._status.text = KEYS.Get("io_watch_failed");
                return;
            }
            this.fill(as3.as(r.items, Array) || [], Number(r.now) || GLOBAL.Timestamp());
            // (the Watch bar's count, the same)
            UI_TOP.ioLiveBadge((as3.as(r.items, Array) || []).length | 0);
        }, (e: IOErrorEvent): void => {
            if (this.mc) {
                this._status.text = KEYS.Get("io_watch_failed");
            }
        });
    }

    private fill(items: any[], now: number): void {
        let rows: Sprite = as3.cast(this._list.content, Sprite);
        while (rows.numChildren) {
            rows.removeChildAt(0);
        }
        let y: number = 6;
        for (let i: int = 0; i < items.length; i++) {
            rows.addChild(this.row(items[i], y, i, now));
            y += IoWatch.ROW_H;
        }
        this._list.setTotal(y + 6, false);
        this._status.text = items.length ? "" : KEYS.Get("io_watch_none");
        // (24 October: "0 things live now" when there's nothing)
        this._sub.text = items.length == 0 ? KEYS.Get("io_watch_sub_none") : items.length == 1 ? KEYS.Get("io_watch_sub_one") : KEYS.Get("io_watch_sub", { "v1": items.length });
    }

    private static readonly KIND_COLOURS: any = { "attack": 0xC0301A, "siege": 0xC0301A, "gauntlet": 0xC0301A, "casino": 0x9A7400, "arcade": 0x5A3AA8, "hellgate": 0x1E6A9A };

    /** "Ann is attacking Bob's yard", "Cara is playing Cinderjack in the Brimstone Pit"... (html) */
    public static rowText(item: any): string {
        let who: string = "<b>" + IoWatch.esc(item.name) + "</b>";
        let what: string = IoWatch.esc(item.title);
        let k: string = String(item.kind);
        let text: string = KEYS.Get("io_watch_row_" + k, { "v1": who, "v2": what });
        if (item.detail && k == "arcade") {
            text += " <font color=\"#C8C0B8\">(" + IoWatch.esc(item.detail) + ")</font>";
        }
        return text;
    }

    /** One live thing: its kind, who does what (a click follows them), and how long it has been going. */
    private row(item: any, y: number, i: int, now: number): Sprite {
        let r: Sprite = new Sprite();
        r.name = "ioWatch_" + (item.uid | 0);
        r.y = y;
        let w: int = (IoWatch.LIST_W - 32) | 0;
        r.graphics.beginFill((i % 2 ? 0x2A1A14 : 0x1E120E) >>> 0, 0.85);
        r.graphics.drawRoundRect(8, 0, w, IoWatch.ROW_H - 4, 8, 8);
        r.graphics.endFill();
        let k: string = String(item.kind);
        let chip: Sprite = as3.as(r.addChild(new Sprite()), Sprite);
        chip.graphics.beginFill((IoWatch.KIND_COLOURS[k] || 0x5A5A5A) >>> 0, 1);
        chip.graphics.drawRoundRect(0, 0, 84, 20, 8, 8);
        chip.graphics.endFill();
        chip.x = 16;
        chip.y = 5;
        let chipText: TextField = as3.as(chip.addChild(CasinoUI.label(KEYS.Get("io_watch_kind_" + k), 10, 0xFFFFFF, true, 84, TextFormatAlign.CENTER)), TextField);
        chipText.y = 2;
        let text: TextField = as3.as(r.addChild(CasinoUI.label("", 13, 0xFFFFFF, false, (w - 200) | 0)), TextField);
        text.htmlText = IoWatch.rowText(item);
        text.x = 108;
        text.y = 6;
        let since: number = Math.max(0, now - Number(item.since));
        let when: TextField = as3.as(r.addChild(CasinoUI.label(IoWatch.clock(since), 12, CasinoUI.ASH, true, 70, TextFormatAlign.RIGHT)), TextField);
        when.x = w - 80;
        when.y = 7;
        r.buttonMode = true;
        r.mouseChildren = false;
        r.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.close();
            IoWatch.follow(item.uid | 0, String(item.name));
        });
        return r;
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        clearInterval(this._timer);
        this._list.stop();
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        if (IoWatch._open == this) {
            IoWatch._open = null;
        }
    }

    // ---- small things
    public static clock(seconds: number): string {
        let s: int = Math.max(0, Math.floor(seconds)) | 0;
        let h: int = (s / 3600) | 0;
        let m: int = ((s % 3600) / 60) | 0;
        let r: int = s % 60;
        return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (r < 10 ? "0" : "") + r;
    }

    public static esc(text: any): string {
        return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
