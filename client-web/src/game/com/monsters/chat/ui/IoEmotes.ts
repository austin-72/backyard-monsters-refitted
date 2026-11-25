import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, Sprite } from "flash/display";
import { Event } from "flash/events";
import { Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { ImageCache, KEYS } from "@game";

/**
 * Inferno-only (14 October, the user's): the chat's 52 emotes, 19 of them animated, a D.A.V.E. Club perk (free).
 *
 * An emote is the token [e:id] in a chat line's text (the server keeps up to 5 a line, of the ids it knows: the same
 * list, server/public/assets/chat/emotes.json). The chat draws each as a picture: after the name when the line is
 * only emotes, else in a row under the text (ChatBox.ioMakeLine). The art: art/emotes/emotes.py ->
 * assets/chat/emotes.png, one row an emote, its frames 48 x 48 left to right.
 */
export class IoEmotes extends ASObject {
    /** [id, name, frames, frames a second] in the sheet's order (its rows). */
    public static readonly LIST: any[] = [
        ["grin", "Grin", 1, 0], ["lol", "LOL", 8, 10], ["cry", "Cry", 8, 8], ["angry", "Angry", 8, 8], ["cool", "Cool", 1, 0],
        ["love", "Love", 8, 8], ["shock", "Shocked", 1, 0], ["sleep", "Sleepy", 8, 5], ["wink", "Wink", 10, 6], ["evil", "Evil", 1, 0],
        ["think", "Thinking", 1, 0], ["facepalm", "Facepalm", 1, 0], ["sweat", "Nervous", 1, 0], ["tongue", "Tongue", 1, 0],
        ["sick", "Sick", 1, 0], ["halo", "Innocent", 1, 0], ["smug", "Smug", 1, 0], ["mindblown", "Mind blown", 10, 10],
        ["hello", "Hello", 8, 8], ["dance", "Dance", 8, 8], ["thumbs", "Thumbs up", 1, 0], ["thumbsdown", "Thumbs down", 1, 0],
        ["clap", "Clap", 8, 10], ["wave", "Wave", 8, 8], ["fist", "Fist bump", 1, 0], ["pray", "Please", 1, 0],
        ["fire", "Fire", 8, 10], ["skull", "Skull", 1, 0], ["rip", "RIP", 1, 0], ["heart", "Heart", 8, 8],
        ["brokenheart", "Heartbroken", 1, 0], ["crown", "Crown", 1, 0], ["trophy", "Trophy", 1, 0], ["shiny", "Shiny", 8, 8],
        ["magma", "Magma", 1, 0], ["bone", "Bone", 1, 0], ["sword", "Sword", 1, 0], ["shield", "Shield", 1, 0],
        ["bomb", "Bomb", 6, 12], ["boom", "Boom", 10, 12], ["lightning", "Lightning", 1, 0], ["pitchfork", "Pitchfork", 1, 0],
        ["eye", "Eye-ra", 12, 8], ["basilisk", "Hiss", 8, 10], ["whiteflag", "Surrender", 8, 8], ["popcorn", "Popcorn", 1, 0],
        ["salt", "Salty", 1, 0], ["gg", "GG", 1, 0], ["rekt", "Rekt", 1, 0], ["100", "100", 1, 0], ["huh", "?!", 1, 0],
        ["nice", "Nice", 1, 0],
    ];

    public static readonly CELL: int = 48;

    /** At most this many in one line (the server's limit too). */
    public static readonly MAX: int = 5;

    public static readonly TOKEN: RegExp = /\[e:([a-z0-9]{1,16})\]/g;

    private static _sheet: BitmapData = null;

    private static _loading: boolean = false;

    private static _waiting: any[] = [];

    /** Frames cut and scaled, by id and size. */
    private static _frames: any = {};

    private static _index: any = null;

    public static info(id: string): any[] {
        if (!IoEmotes._index) {
            IoEmotes._index = {};
            for (let i: int = 0; i < IoEmotes.LIST.length; i++) {
                IoEmotes._index[IoEmotes.LIST[i][0]] = i;
            }
        }
        let i: any = IoEmotes._index[id];
        return i == null ? null : as3.cast(IoEmotes.LIST[i | 0], Array);
    }

    /** The emotes in a line's text (known ones, at most MAX), in order. */
    public static idsIn(text: string): string[] {
        let out: string[] = [];
        if (!text || text.indexOf("[e:") < 0) {
            return out;
        }
        let re: RegExp = new RegExp(IoEmotes.TOKEN.source, "g");
        let m: any;
        while ((m = re.exec(text)) != null && out.length < IoEmotes.MAX) {
            if (IoEmotes.info(String(m[1]))) {
                out.push(String(m[1]));
            }
        }
        return out;
    }

    /** The text with the emote tokens taken out. */
    public static strip(text: string): string {
        return text ? text.replace(new RegExp(IoEmotes.TOKEN.source, "g"), "") : text;
    }

    /** For places that show text only: each emote as its name in brackets ("(Grin)"). */
    public static plain(text: string): string {
        if (!text || text.indexOf("[e:") < 0) {
            return text;
        }
        return text.replace(new RegExp(IoEmotes.TOKEN.source, "g"), (all: string, id: string): string => {
            let e: any[] = IoEmotes.info(id);
            return e ? "(" + IoEmotes.label(e) + ")" : all;
        });
    }

    /** An emote's name in the player's language (QoL #235: "io_t3m_em_<id>", else the English one in LIST). */
    public static label(e: any[]): string {
        if (!e) {
            return "";
        }
        let key: string = "io_t3m_em_" + e[0];
        let said: string = KEYS.Get(key);
        return said && said != key ? said : String(e[1]);
    }

    public static token(id: string): string {
        return "[e:" + id + "]";
    }

    // ---- Inferno-only (QoL #157): ":grin:" typed in a chat line becomes the emote, and the picker shows the emotes used
    // lately first (kept in this browser).
    /** Where the emotes used lately are kept (this browser), newest first. */
    public static readonly IO_RECENT_KEY: string = "bymr-chat-recent-emotes";

    /** One row of the picker. */
    public static readonly IO_RECENT_MAX: int = 12;

    /** Other words for some (":smile:" is the Grin). */
    private static readonly IO_ALIASES: any = { "smile": "grin", "laugh": "lol", "sob": "cry", "rage": "angry", "sunglasses": "cool", "thumbsup": "thumbs", "kiss": "love", "zzz": "sleep", "hmm": "think", "tada": "clap", "hi": "hello" };

    private static _ioRecent: string[] = null;

    /** The emote a shortcode stands for (its id or another word for it, any capitals), or null. */
    public static ioChat2Code(word: string): string {
        let id: string = String(word || "").toLowerCase();
        if (IoEmotes.info(id)) {
            return id;
        }
        let alias: any = IoEmotes.IO_ALIASES[id];
        return alias && IoEmotes.info(String(alias)) ? String(alias) : null;
    }

    /** A line with each ":id:" of an emote the game has made its token, up to MAX in the line (tokens in it count). */
    public static ioChat2Shortcodes(text: string): string {
        if (!text || text.indexOf(":") < 0) {
            return text;
        }
        let have: int = IoEmotes.idsIn(text).length | 0;
        return text.replace(/:([A-Za-z0-9]{1,16}):/g, (all: string, word: string): string => {
            let id: string = IoEmotes.ioChat2Code(word);
            if (!id || have >= IoEmotes.MAX) {
                return all;
            }
            have++;
            return IoEmotes.token(id);
        });
    }

    /** The emotes used lately, newest first (known ones, at most a row). */
    public static ioChat2Recent(): string[] {
        if (IoEmotes._ioRecent == null) {
            let list: string[] = [];
            try {
                let raw: any = window.localStorage.getItem(IoEmotes.IO_RECENT_KEY);
                if (raw) {
                    list = String(raw).split(",");
                }
            } catch (e) {
            }
            IoEmotes._ioRecent = list.filter((id: string): boolean => IoEmotes.info(id) != null).slice(0, IoEmotes.IO_RECENT_MAX);
        }
        return IoEmotes._ioRecent.concat();
    }

    /** A line was sent with these emotes: they go to the front of the recent ones. */
    public static ioChat2Used(ids: string[]): void {
        if (!ids || !ids.length) {
            return;
        }
        let list: string[] = IoEmotes.ioChat2Recent();
        for (let i: int = (ids.length - 1) | 0; i >= 0; i--) {
            let id: string = String(ids[i]);
            if (!IoEmotes.info(id)) {
                continue;
            }
            list = list.filter((x: string): boolean => x != id);
            list.unshift(id);
        }
        IoEmotes._ioRecent = list.slice(0, IoEmotes.IO_RECENT_MAX);
        try {
            window.localStorage.setItem(IoEmotes.IO_RECENT_KEY, IoEmotes._ioRecent.join(","));
        } catch (e) {
        }
    }

    private static withSheet(fn: Function): void {
        if (IoEmotes._sheet) {
            fn();
            return;
        }
        IoEmotes._waiting.push(fn);
        if (IoEmotes._loading) {
            return;
        }
        IoEmotes._loading = true;
        ImageCache.GetImageWithCallBack("chat/emotes.png", (key: string, bmd: BitmapData): void => {
            IoEmotes._loading = false;
            if (!bmd) {
                IoEmotes._waiting = [];
                return;
            }
            IoEmotes._sheet = bmd;
            let waiting: any[] = IoEmotes._waiting;
            IoEmotes._waiting = [];
            for (let w of waiting) {
                try {
                    w();
                } catch (e) {
                }
            }
        });
    }

    /** An emote's frames at a size (cut from the sheet, scaled smoothly; kept). */
    private static framesOf(id: string, size: int): BitmapData[] {
        let key: string = id + "@" + size;
        if (IoEmotes._frames[key]) {
            return IoEmotes._frames[key];
        }
        let e: any[] = IoEmotes.info(id);
        let row: int = IoEmotes._index[id] | 0;
        let out: BitmapData[] = [];
        let cell: BitmapData = new BitmapData(IoEmotes.CELL, IoEmotes.CELL, true, 0);
        let m: Matrix = new Matrix();
        m.scale(size / IoEmotes.CELL, size / IoEmotes.CELL);
        for (let f: int = 0; f < (e[2] | 0); f++) {
            cell.fillRect(cell.rect, 0);
            cell.copyPixels(IoEmotes._sheet, new Rectangle(f * IoEmotes.CELL, row * IoEmotes.CELL, IoEmotes.CELL, IoEmotes.CELL), new Point(0, 0));
            let b: BitmapData = new BitmapData(size, size, true, 0);
            b.draw(cell, m, null, null, null, true);
            out.push(b);
        }
        IoEmotes._frames[key] = out;
        return out;
    }

    /**
     * An emote's picture, `size` across (its top left at 0,0); an animated one plays while it is shown, every
     * one of a kind in step (from the clock).
     */
    public static make(id: string, size: int): Sprite {
        let s: Sprite = new Sprite();
        s.name = "ioEmote:" + id;
        s.mouseEnabled = false;
        s.mouseChildren = false;
        let e: any[] = IoEmotes.info(id);
        if (!e) {
            return s;
        }
        let bm: Bitmap = new Bitmap(new BitmapData(size, size, true, 0));
        s.addChild(bm);
        IoEmotes.withSheet((): void => {
            let frames: BitmapData[] = IoEmotes.framesOf(id, size);
            bm.bitmapData = frames[0];
            if (frames.length > 1) {
                let fps: number = Number(e[3]) || 8;
                let shown: int = 0;
                s.addEventListener(Event.ENTER_FRAME, (ev: Event): void => {
                    let f: int = (Math.floor(getTimer() / 1000 * fps) % frames.length) | 0;
                    if (f != shown) {
                        shown = f;
                        bm.bitmapData = frames[f];
                    }
                });
            }
        });
        return s;
    }
}
