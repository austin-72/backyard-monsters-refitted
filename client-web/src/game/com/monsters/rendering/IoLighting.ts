import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { BitmapData, DisplayObject, IBitmapDrawable, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { lightHere, lightInWorker, LightPicture, lightWorkerAvailable, lightWorkerStats } from "flash/_lightWorker";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, BFOUNDATION, Button_CLIP, CREATURES, CREEPS, GLOBAL, IoPets, MAP, RasterData, SOUNDS, WORKERS } from "@game";

/**
 * Inferno-only (20 October, the user's): the yard's lighting, and a spooky yard. Everyone sees the server's look (flag
 * io_lighting: InfernoOnlyConfig.yardLighting: its light, and the spooky yard on its Halloween calendar); an admin (flag
 * io_admin) can try others on the Admin menu's Lighting, kept in this browser as their own until Everyone's look. Only
 * how the yard is drawn: nothing in the game's rules.
 *
 * Directional light. The art has its light painted in, from the left (its shadows fall to the right and a little
 * down), so the light can turn up to 80 degrees either side of the art's own, not all the way round (from the other
 * side the painted highlights would face the wrong way). From the light's direction (`az`, degrees from the art's
 * own) and height (`el`, degrees above the ground):
 *  - each building's shadow is made from all its standing parts together (its top, its moving parts as they move,
 *    its fortification), laid along the ground away from the light, longer the lower the light (each point moved by
 *    its height above the building's foot, the middle of its footprint, times the light's slant), softened, in place
 *    of its painted shadow; what moves is made again as it moves (at most every MOVING_MS); the mushrooms too;
 *  - the workers, the pets and the monsters cast shadows of their own pictures, as they move (the monsters' round
 *    shadows moved a little away from the light; a battle of very many: only those);
 *  - how dark the shadows are: the light's own, or as chosen (the panel's Shadows);
 *  - each building is shaded a little across, lighter on the side facing the light and darker on the far side
 *    (drawn "overlay" over it, masked by its own outline);
 *  - the whole yard is tinted by the light's colour (warm low down, white high up, blue by moonlight) and a little
 *    lighter toward the light.
 * Presets: Morning, Noon, Evening, Moonlight; Day Cycle (the light moves with the time in the US Central time zone:
 * dawn, the sun across the sky, dusk, moonlight at night); Custom (the panel's sliders).
 * The panel's tabs: Light (Direction all the way round, even from behind the art's own light; Height, Strength,
 * Brightness, the light's colour, Warmth, Shading, Dark edges), Shadows (Opacity or Auto, Intensity brighter or darker,
 * Length, Softness, Colour bluer or browner, the buildings' and the monsters' each), Spooky (on or off, Webs, Web
 * opacity, Spiders, Dusty roofs, Gloom); each with Reset. Everything standing in the yard casts a shadow: every
 * building and decoration (from any standing part: a fountain has no top), the workers, the pets, every monster (all
 * its parts, whatever it is drawn as), and anything else drawn standing there (strays).
 *
 * Spooky: an abandoned yard, its webs where a spider would spin them: across the gaps in each building's own outline
 * (between its spikes, its chimney and its roof, its pipes, under its eaves), tied to the building or the ground at
 * its foot all round; in the corner with the ground where a building has no gaps; its roof furred grey with old web;
 * threads hanging where it overhangs, a spider down one on some; webs strung across the gaps between buildings standing
 * side by side (a spider sitting in some) and between some walls. The yard is a little greyer and darker at its edges.
 *
 * The still buildings' shadows and the webs are made in a background thread (21 October: flash/_lightWorker, a Web
 * Worker; on the game's thread where the browser has none): a yard loading, the light changing or the webs growing no
 * longer holds the game up while they're all made.
 *
 * All of it is drawn through the yard's own drawing (RasterData: Renderer's partial redraw, the zoom's lens, the
 * Tilt): the pictures are made once, again only when the light changes or a building's picture does
 * (beforeRender, from Renderer.render, keeps them where their buildings are).
 */
export class IoLighting extends ASObject {
    /** (a new key on 20 October, when everyone got the light: the tries before then are not kept) */
    private static readonly KEY: string = "io_lighting2";

    /** The ground direction the art's own shadows fall (degrees, on the yard's ground: right and a little down on screen). */
    private static readonly ART_ANGLE: number = -18.4;

    /**
     * How far either side of the art's own light the light can turn (degrees): all the way round (past 80 or so, the
     * art's own painted highlights face the wrong way: the panel lets an admin do it anyway).
     */
    public static readonly AZ_MAX: number = 180;

    /**
     * The panel's other sliders: each one's key, its tab, its title, its range, its default, its step and how its value
     * reads (pct: a percentage; x: times; px: pixels; side: toward `lo` below 0, toward `hi` above).
     */
    public static readonly SETTINGS: any[] = [
        { "k": "strength", "tab": "light", "title": "Strength", "min": 0, "max": 1, "def": 1, "step": 0.05, "fmt": "pct" },
        { "k": "bright", "tab": "light", "title": "Brightness", "min": 0.5, "max": 1.5, "def": 1, "step": 0.05, "fmt": "pct" },
        { "k": "tintAmt", "tab": "light", "title": "Light's colour", "min": 0, "max": 2, "def": 1, "step": 0.05, "fmt": "pct" },
        { "k": "warmth", "tab": "light", "title": "Warmth", "min": -1, "max": 1, "def": 0, "step": 0.05, "fmt": "side", "lo": "cooler", "hi": "warmer" },
        { "k": "shading", "tab": "light", "title": "Shading", "min": 0, "max": 2, "def": 1, "step": 0.05, "fmt": "pct" },
        { "k": "vignette", "tab": "light", "title": "Dark edges", "min": 0, "max": 1, "def": 0, "step": 0.05, "fmt": "pct" },
        { "k": "intensity", "tab": "shadows", "title": "Intensity", "min": -1, "max": 1, "def": 0, "step": 0.05, "fmt": "side", "lo": "brighter", "hi": "darker" },
        { "k": "length", "tab": "shadows", "title": "Length", "min": 0.25, "max": 3, "def": 1, "step": 0.05, "fmt": "x" },
        { "k": "soft", "tab": "shadows", "title": "Softness", "min": 0, "max": 6, "def": 1.6, "step": 0.2, "fmt": "px" },
        { "k": "shHue", "tab": "shadows", "title": "Colour", "min": -1, "max": 1, "def": 0, "step": 0.05, "fmt": "side", "lo": "bluer", "hi": "browner" },
        { "k": "shBuild", "tab": "shadows", "title": "Buildings'", "min": 0, "max": 2, "def": 1, "step": 0.05, "fmt": "pct" },
        { "k": "shWalk", "tab": "shadows", "title": "Monsters'", "min": 0, "max": 2, "def": 1, "step": 0.05, "fmt": "pct" },
        { "k": "webs", "tab": "spooky", "title": "Webs", "min": 0, "max": 2, "def": 1, "step": 0.25, "fmt": "pct" },
        { "k": "webAlpha", "tab": "spooky", "title": "Web opacity", "min": 0.1, "max": 1, "def": 0.5, "step": 0.05, "fmt": "pct" },
        { "k": "spiders", "tab": "spooky", "title": "Spiders", "min": 0, "max": 3, "def": 1, "step": 0.25, "fmt": "x" },
        { "k": "dust", "tab": "spooky", "title": "Dusty roofs", "min": 0, "max": 2, "def": 1, "step": 0.1, "fmt": "pct" },
        { "k": "gloom", "tab": "spooky", "title": "Gloom", "min": 0, "max": 1.5, "def": 1, "step": 0.05, "fmt": "pct" },
    ];

    /** A setting's value kept within its slider's range (its default when not a number). */
    private static clampSetting(def: any, v: any): number {
        let n: number = Number(v);
        if (v === null || v === undefined || v === "" || !(n === n)) {
            return def.def;
        }
        return Math.max(def.min, Math.min(def.max, n));
    }

    /** Presets: az (degrees from the art's own), el (height), tint (the light's colour), amb (how bright), sh (shadow strength). */
    public static readonly PRESETS: any = {
        "morning": { "az": -55, "el": 22, "tint": [255, 224, 190], "amb": 0.94, "sh": 0.5 },
        "noon": { "az": 0, "el": 66, "tint": [255, 251, 242], "amb": 1, "sh": 0.42 },
        "evening": { "az": 55, "el": 15, "tint": [255, 172, 112], "amb": 0.86, "sh": 0.55 },
        "moonlight": { "az": 25, "el": 38, "tint": [150, 168, 232], "amb": 0.84, "sh": 0.36 },
    };

    public static readonly MODES: string[] = ["off", "morning", "noon", "evening", "moonlight", "cycle", "custom"];

    private static _state: any = null;

    private static _panel: Sprite = null;

    // ---- what is drawn
    /** Each building's own pictures: {shadow, shade, web, ground, spider, keys...}. */
    private static _recs: Map<any, any> = new Map();
    private static _overlay: RasterData = null;
    private static _overlayKey: string = null;
    private static _lightKey: string = null;
    private static _overlayWant: string = null;
    private static _lightLook: any = null;
    private static _tickSeen: int = -1;
    /** The look as read at the start of this tick (beforeRender). */
    private static _st: any = null;
    /** True while the lighting casts the buildings' shadows: the game leaves their painted ones hidden. */
    public static paintedHidden: boolean = false;
    private static _tickAt: number = 0;
    private static _lightLit: boolean = false;
    private static _lightSpooky: boolean = false;
    private static _spookyKey: string = "";
    private static _light: any = null;
    private static _lightAt: number = -1e9;
    private static _active: boolean = false;
    private static _seen: int = 0;

    /** For tests: how many buildings have a cast shadow, a shading, webs; pictures made since the game opened. */
    public static stats: any = { "shadows": 0, "moving": 0, "walkers": 0, "shades": 0, "webs": 0, "spans": 0, "spiders": 0, "made": 0, "ms": 0 };

    public static get allowed(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY && GLOBAL._flags && (GLOBAL._flags.io_admin | 0) == 1);
    }

    /** A state read from what was kept (or sent): every field within its range. */
    private static stateFrom(s: any): any {
        s = s && typeof s == "object" ? s : {};
        let out: any = {
            "mode": IoLighting.MODES.indexOf(String(s.mode)) >= 0 ? String(s.mode) : "off",
            "az": Math.max(-IoLighting.AZ_MAX, Math.min(IoLighting.AZ_MAX, Number(s.az) || 0)),
            "el": Math.max(5, Math.min(85, Number(s.el) || 45)),
            "spooky": Boolean(s.spooky),
            // (how dark the shadows are, 0 to 1; null: as the light has them)
            "shadow": s.shadow === null || s.shadow === undefined || !(Number(s.shadow) >= 0) ? null : Math.min(1, Number(s.shadow)),
        };
        for (let d of IoLighting.SETTINGS) {
            out[d.k] = IoLighting.clampSetting(d, s[d.k]);
        }
        return out;
    }

    /** Whether this admin has a look of their own (kept in this browser), not everyone's. */
    public static get own(): boolean {
        if (IoLighting._own === null) {
            let kept: string = null;
            try {
                kept = window.localStorage.getItem(IoLighting.KEY);
            } catch (e) {
                kept = null;
            }
            IoLighting._own = kept != null;
            if (kept != null) {
                let s: any = null;
                try {
                    s = JSON.parse(kept);
                } catch (e) {
                    s = null;
                }
                IoLighting._state = IoLighting.stateFrom(s);
            }
        }
        return IoLighting.allowed && IoLighting._own;
    }

    private static _own: boolean = null;

    /**
     * The look as it is now ({mode, az, el, spooky, shadow, and every one of SETTINGS}): an admin's own, when they
     * chose one on the panel; else everyone's (the server's, io_lighting: its light, and the spooky yard as its
     * calendar has it today); none (off) when the server sends none.
     */
    public static get state(): any {
        if (IoLighting.own) {
            return IoLighting._state;
        }
        return IoLighting.everyone() || IoLighting.OFF;
    }

    private static readonly OFF: any = IoLighting.stateFrom({ "mode": "off" });

    /** Everyone's look (the server's io_lighting), as it is now: null when there's none. Looked at again each minute. */
    public static everyone(nowMs: number = NaN): any {
        let raw: any = GLOBAL._flags ? GLOBAL._flags.io_lighting : null;
        if (!raw) {
            return null;
        }
        let now: number = nowMs === nowMs ? nowMs : Date.now();
        let cached: any = IoLighting._everyone;
        if (nowMs !== nowMs && cached && cached.raw === raw && now - cached.at < 60000) {
            return cached.state;
        }
        let cfg: any = null;
        try {
            cfg = typeof raw == "string" ? JSON.parse(raw) : raw;
        } catch (e) {
            cfg = null;
        }
        if (!cfg || cfg.enabled === false) {
            return null;
        }
        let look: any = Object.assign({ "mode": "custom" }, cfg.look || {});
        let season: any = IoLighting.season(cfg.spooky, now);
        if (season) {
            look.spooky = true;
            look.webs = season.webs;
            look.gloom = season.gloom;
            look.webAlpha = season.webAlpha;
            // (the roofs as dusty as there are webs)
            look.dust = Math.min(1, season.webs);
        } else {
            look.spooky = false;
        }
        let state: any = IoLighting.stateFrom(look);
        if (nowMs !== nowMs) {
            IoLighting._everyone = { "raw": raw, "at": now, "state": state };
        }
        return state;
    }

    private static _everyone: any = null;

    /**
     * The spooky yard on its calendar (the server's io_lighting.spooky): between its first point and its last, each a
     * day and time ("MM-DD HH:MM", every year) in its time zone, how many webs and how gloomy, straight from one point to
     * the next: {webs, gloom, webAlpha}; null outside it, or with no webs and no gloom. Rounded (0.01) so the webs are
     * made again a few times a day at most.
     */
    public static season(cfg: any, nowMs: number): any {
        if (!cfg || cfg.enabled === false || !(cfg.points instanceof Array) || cfg.points.length < 2) {
            return null;
        }
        // (minutes into the year, in its time zone: months as if every year had 365 days)
        const DAYS: number[] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        let minutes = (mo: number, d: number, h: number, mi: number): number => ((DAYS[(mo - 1) % 12] + d - 1) * 24 + h) * 60 + mi;
        let now: number = 0;
        try {
            let parts: any = new Intl.DateTimeFormat("en-US", { "timeZone": cfg.timeZone || "America/Chicago", "month": "numeric", "day": "numeric", "hour": "numeric", "minute": "numeric", "hour12": false }).formatToParts(new Date(nowMs));
            let v: any = {};
            for (let p of parts) {
                v[p.type] = Number(p.value);
            }
            now = minutes(v.month, v.day, v.hour % 24, v.minute);
        } catch (e) {
            let d: Date = new Date(nowMs);
            now = minutes(d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes());
        }
        let pts: any[] = [];
        for (let p of cfg.points) {
            let m: any = /^(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(String(p.at));
            if (m) {
                pts.push({ "t": minutes(Number(m[1]), Number(m[2]), Number(m[3] || 0), Number(m[4] || 0)), "webs": Number(p.webs) || 0, "gloom": Number(p.gloom) || 0 });
            }
        }
        if (pts.length < 2) {
            return null;
        }
        // (a calendar running over the new year: its points after the first counted on into the next)
        for (let i = 1; i < pts.length; i++) {
            while (pts[i].t < pts[i - 1].t) {
                pts[i].t += 365 * 1440;
            }
        }
        let last: number = pts[pts.length - 1].t;
        if (now < pts[0].t && now + 365 * 1440 <= last) {
            now += 365 * 1440;
        }
        if (now < pts[0].t || now >= last) {
            return null;
        }
        for (let i = 0; i + 1 < pts.length; i++) {
            let a: any = pts[i], b: any = pts[i + 1];
            if (now >= a.t && now < b.t) {
                let f: number = (now - a.t) / Math.max(1, b.t - a.t);
                let webs: number = Math.round((a.webs + (b.webs - a.webs) * f) * 100) / 100;
                let gloom: number = Math.round((a.gloom + (b.gloom - a.gloom) * f) * 100) / 100;
                if (webs <= 0 && gloom <= 0) {
                    return null;
                }
                return { "webs": webs, "gloom": gloom, "webAlpha": Number(cfg.webAlpha) || 0.5 };
            }
        }
        return null;
    }

    /** An admin's change on the panel: from the look as it is (everyone's, the first time), kept as their own. */
    public static set(changes: any): void {
        if (!IoLighting.own) {
            IoLighting._state = IoLighting.stateFrom(IoLighting.state);
            IoLighting._own = true;
        }
        let s: any = IoLighting._state;
        for (let k in changes) {
            s[k] = changes[k];
        }
        s.az = Math.max(-IoLighting.AZ_MAX, Math.min(IoLighting.AZ_MAX, Number(s.az) || 0));
        s.el = Math.max(5, Math.min(85, Number(s.el) || 45));
        for (let d of IoLighting.SETTINGS) {
            s[d.k] = IoLighting.clampSetting(d, s[d.k]);
        }
        s.shadow = s.shadow === null || s.shadow === undefined || !(Number(s.shadow) >= 0) ? null : Math.min(1, Number(s.shadow));
        try {
            window.localStorage.setItem(IoLighting.KEY, JSON.stringify(s));
        } catch (e) {
        }
        IoLighting._lightAt = -1e9;
        if (IoLighting._refresh != null) {
            IoLighting._refresh();
        }
    }

    /** An admin's own look given up: everyone's again. */
    public static followEveryone(): void {
        try {
            window.localStorage.removeItem(IoLighting.KEY);
        } catch (e) {
        }
        IoLighting._own = false;
        IoLighting._state = null;
        IoLighting._lightAt = -1e9;
        if (IoLighting._refresh != null) {
            IoLighting._refresh();
        }
    }

    /**
     * The lighting drawn at all: everyone's (the server sends it), or an admin's own; never when the player has turned
     * it off (Settings, Display: Light and shadows; Battery saver: off), for speed.
     */
    public static get on(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY) && IoLighting.wanted && (IoLighting.own || IoLighting.everyone() != null);
    }

    /** The player's own setting (Settings: Light and shadows): on unless turned off. */
    public static get wanted(): boolean {
        return GLOBAL.ioPageSettings.lighting !== false;
    }

    public static get lit(): boolean {
        return IoLighting.on && IoLighting.state.mode != "off";
    }

    public static get spooky(): boolean {
        return IoLighting.on && Boolean(IoLighting.state.spooky);
    }

    /**
     * The light now: {az, el, tint, amb, sh, night}. Day Cycle by the time in the US Central time zone (the server's):
     * the sun from the morning side at 6:00 to the evening side at 18:00, highest at noon; dawn and dusk an hour each;
     * moonlight at night.
     */
    public static light(nowMs: number = NaN): any {
        let s: any = IoLighting.state;
        let k: number = s.strength;
        let mix = (a: any, b: any, t: number): any => ({
            "az": a.az + (b.az - a.az) * t, "el": a.el + (b.el - a.el) * t,
            "tint": [0, 1, 2].map((i: int): number => a.tint[i] + (b.tint[i] - a.tint[i]) * t),
            "amb": a.amb + (b.amb - a.amb) * t, "sh": a.sh + (b.sh - a.sh) * t,
        });
        let L: any = null;
        if (s.mode == "custom") {
            // (warm low down, white high up)
            let t: number = Math.max(0, Math.min(1, (s.el - 10) / 55));
            L = mix(IoLighting.PRESETS.evening, IoLighting.PRESETS.noon, t);
            L.az = s.az;
            L.el = s.el;
        } else if (s.mode == "cycle") {
            let h: number = IoLighting.centralHour(nowMs);
            let P: any = IoLighting.PRESETS;
            if (h >= 6 && h < 18) {
                let t: number = (h - 6) / 12;
                L = mix(P.morning, P.noon, Math.min(1, t * 2));
                if (t > 0.5) {
                    L = mix(P.noon, P.evening, (t - 0.5) * 2);
                }
                L.az = -70 + 140 * t;
                L.el = 12 + 58 * Math.sin(Math.PI * t);
            } else if (h >= 18 && h < 19) {
                // (22 October: from where the day left the light (70, 12), and to where it takes it up (-70, 12): the
                // evening's and the morning's own direction and height made it jump at 18:00 and at 06:00)
                L = mix({ ...P.evening, "az": 70, "el": 12 }, P.moonlight, h - 18);
            } else if (h >= 5 && h < 6) {
                L = mix(P.moonlight, { ...P.morning, "az": -70, "el": 12 }, h - 5);
            } else {
                L = mix(P.moonlight, P.moonlight, 0);
            }
        } else {
            let p: any = IoLighting.PRESETS[s.mode] || IoLighting.PRESETS.noon;
            L = mix(p, p, 0);
        }
        // (the panel's strength: none at 0, as chosen at 1)
        L.sh *= k;
        L.amb = 1 - (1 - L.amb) * k;
        L.tint = L.tint.map((c: number): number => 255 - (255 - c) * k);
        L.shade = k;
        L.k = k;
        // (the shadows as dark as chosen, whatever the light)
        L.shAuto = L.sh;
        if (s.shadow !== null && s.shadow !== undefined) {
            L.sh = s.shadow;
        }
        // ---- the panel's other sliders
        // the light's colour: more or less of it, warmer or cooler
        let ta: number = s.tintAmt;
        L.tint = L.tint.map((c: number): number => 255 - (255 - c) * ta);
        let wm: number = s.warmth;
        L.tint = [L.tint[0] + 40 * wm, L.tint[1] + 6 * wm, L.tint[2] - 50 * wm].map((c: number): number => Math.max(0, Math.min(255, c)));
        L.bright = s.bright;
        L.shade *= s.shading;
        L.vig = s.vignette;
        // the shadows: their length, softness, colour, intensity, each kind's darkness
        L.len = s.length;
        L.soft = s.soft;
        L.shHue = s.shHue;
        L.int = s.intensity;
        L.shB = Math.min(1, L.sh * s.shBuild);
        L.shW = Math.min(1, L.sh * s.shWalk);
        // (the shadows' paint, and how see-through it is drawn: shadowColour)
        IoLighting.shadowColour(L);
        L.shBk = L.shB * L.shK;
        L.shWk = L.shW * L.shK;
        return L;
    }

    /** The hour (with its fraction) in the US Central time zone. */
    public static centralHour(nowMs: number = NaN): number {
        let d: Date = new Date(nowMs === nowMs ? nowMs : Date.now());
        try {
            let parts: any = new Intl.DateTimeFormat("en-US", { "timeZone": "America/Chicago", "hour": "numeric", "minute": "numeric", "hour12": false }).formatToParts(d);
            let hh: number = 0;
            let mm: number = 0;
            for (let p of parts) {
                if (p.type == "hour") {
                    hh = Number(p.value) % 24;
                } else if (p.type == "minute") {
                    mm = Number(p.value);
                }
            }
            return hh + mm / 60;
        } catch (e) {
            return d.getHours() + d.getMinutes() / 60;
        }
    }

    /** The shadows' slant on screen: how far a point is moved per pixel of its height (x, y). */
    private static slant(L: any): any {
        let a: number = (IoLighting.ART_ANGLE + L.az) * Math.PI / 180;
        let gx: number = Math.cos(a) - Math.sin(a);
        let gy: number = (Math.cos(a) + Math.sin(a)) / 2;
        let n: number = Math.sqrt(gx * gx + gy * gy) || 1;
        let len: number = Math.min(6, Math.min(2.2, 1 / Math.tan(Math.max(5, L.el) * Math.PI / 180)) * (Number(L.len) || 1));
        return { "x": gx / n * len, "y": gy / n * len, "ux": gx / n, "uy": gy / n };
    }

    // ---------------------------------------------------------------------------------------------
    // Each frame, before the yard is drawn (Renderer.render)
    // ---------------------------------------------------------------------------------------------
    /** A building's parts that stand (and so cast a shadow): its fortification's back, its top, its moving parts, its fortification's front. */
    private static readonly PARTS: int[] = [7, 2, 3, 4, 5, 6];

    /** A shadow of something moving (its picture changing) made again at most this often (ms). */
    private static readonly MOVING_MS: int = 200;
    /** (21 October) MOVING_MS for this frame: three times as long in a battle of IO_CROWD monsters or more (their time
     * goes to the battle; a fire's or a flag's shadow moves a little less often) */
    private static _movingMs: int = 200;
    private static readonly IO_CROWD: int = 400;

    /** Monsters with a shadow of their own picture, at most (above it, only their round one: a battle of a thousand). */
    private static readonly CREEP_SHADOWS: int = 30;

    public static beforeRender(): void {
        let lit: boolean = IoLighting.lit;
        let spooky: boolean = IoLighting.spooky;
        if (!lit && !spooky) {
            if (IoLighting._active) {
                IoLighting.teardown();
            }
            return;
        }
        if (!MAP._canvas || !MAP.instance || !BASE._buildingsAll) {
            return;
        }
        let t0: number = performance.now();
        IoLighting._active = true;
        IoLighting._movingMs = (CREEPS._creepCount | 0) >= IoLighting.IO_CROWD ? IoLighting.MOVING_MS * 3 : IoLighting.MOVING_MS;
        // (the light: Day Cycle looked at again every 30 s)
        // (the time of the game's tick, not of this drawing: the yard drawn twice in one tick is drawn the same (the
        // spiders' bob, the moving shadows made again), so drawing it again in parts matches drawing it whole)
        if (GLOBAL._frameNumber !== IoLighting._tickSeen) {
            IoLighting._tickSeen = GLOBAL._frameNumber;
            IoLighting._tickAt = getTimer();
        }
        let now: number = IoLighting._tickAt;
        let look: any = IoLighting.state;
        // (the look, read once this tick: everything below reads it from here)
        IoLighting._st = look;
        // (the buildings' painted shadows left hidden by the game while these are cast: BFOUNDATION.updateRasterData)
        IoLighting.paintedHidden = lit;
        if (!IoLighting._light || now - IoLighting._lightAt > 30000 || look !== IoLighting._lightLook || lit !== IoLighting._lightLit || spooky !== IoLighting._lightSpooky) {
            IoLighting._lightLook = look;
            IoLighting._lightLit = lit;
            IoLighting._lightSpooky = spooky;
            IoLighting._lightAt = now;
            IoLighting._light = IoLighting.light();
            let L0: any = IoLighting._light;
            // (what the shadows' and shadings' pictures depend on: not how dark they are, set as they are drawn)
            IoLighting._lightKey = lit ? [Math.round(L0.az), Math.round(L0.el), L0.tint.map(Math.round).join(","), L0.len.toFixed(2), L0.soft.toFixed(1), L0.shHue.toFixed(2), L0.int.toFixed(2), Number(L0.shade).toFixed(2)].join("|") : "none";
            let s0: any = IoLighting.state;
            IoLighting._overlayWant = (lit ? [L0.tint.map(Math.round).join(","), L0.amb.toFixed(3), L0.bright.toFixed(2), L0.vig.toFixed(2), Math.round(L0.az), Math.round(L0.el)].join("|") : "none") + (spooky ? "|spooky" + s0.gloom.toFixed(2) : "");
            IoLighting._spookyKey = [s0.webs, s0.webAlpha, s0.dust].map((v: number): string => v.toFixed(2)).join(",");
        }
        let L: any = lit ? IoLighting._light : null;
        let S: any = L ? IoLighting.slant(L) : null;
        let key: string = IoLighting._lightKey;
        IoLighting.overlay(L, spooky, IoLighting._overlayWant);
        let off: Point = MAP.instance.offset;
        let seen: int = ++IoLighting._seen;
        let stats: any = { "shadows": 0, "moving": 0, "walkers": 0, "shades": 0, "webs": 0, "spans": 0, "spiders": 0 };
        let spanList: any[] = spooky ? [] : null;
        // (everything drawn for a building or a walker: what's left standing in the yard casts a stray's shadow)
        let covered: Set<any> = lit && now - IoLighting._straysAt > 400 ? new Set() : null;
        let each = (b: any): void => {
            if (!b || !b._rasterData || !b._mc || b.m_isCleared) {
                return;
            }
            let top: RasterData = b._rasterData[BFOUNDATION._RASTERDATA_TOP];
            // (no top: its first standing part (a fountain is all moving water))
            if (!top || top._cleared || !top._data) {
                top = null;
                for (let i of IoLighting.PARTS) {
                    let e: RasterData = b._rasterData[i];
                    if (!top && e && !e._cleared && e._data) {
                        top = e;
                    }
                }
            }
            let bmd: any = top && !top._cleared ? top._data : null;
            if (!bmd || !top._pt) {
                return;
            }
            // (a top drawn as a clip, not a picture (the mushrooms): only its shadow, from the clip drawn flat)
            let flatTop: boolean = !bmd.$canvas;
            if (flatTop) {
                let fl: any = IoLighting.flat(bmd);
                bmd = fl ? fl.bmd : null;
            }
            if (!bmd || !(bmd.width > 0)) {
                return;
            }
            let rec: any = IoLighting._recs.get(b);
            if (!rec) {
                rec = { "seen": 0 };
                IoLighting._recs.set(b, rec);
            }
            rec.seen = seen;
            if (covered) {
                for (let e of b._rasterData) {
                    if (e) {
                        covered.add(e);
                    }
                }
                // (its hover glow: the building itself, not something else standing there)
                if (b._ioGlow) {
                    covered.add(b._ioGlow);
                }
            }
            // (its foot's middle: kept, looked at again every 2 s)
            if (rec.footAt === undefined || now - rec.footAt > 2000) {
                rec.footAt = now;
                rec.footMid = b.ioFootMid ? b.ioFootMid() : 0;
            }
            let gx: number = b._mc.x - off.x;
            let gy: number = b._mc.y + rec.footMid - off.y;
            rec.lastGx = gx;
            rec.lastGy = gy;
            let relX: number = Math.round(top._pt.x - gx);
            let relY: number = Math.round(top._pt.y - gy);
            // (its top as drawn now, as a number: compared each tick without building strings)
            let topSig: number = ((IoLighting.idOf(bmd) * 1000003 + Number(bmd.$version || 0)) * 1009 + relX) * 1013 + relY;
            // (shown when any of its standing parts is: a decoration's top can be hidden, its moving part shown)
            let topVis: boolean = top._visible;
            let vis: boolean = topVis;
            for (let i of IoLighting.PARTS) {
                let e: RasterData = b._rasterData[i];
                if (!vis && e && !e._cleared && e._visible) {
                    vis = true;
                }
            }
            let isWall: boolean = b._class == "wall";
            // (none of it shown (the game leaves out what's off the screen): its pictures hidden, nothing worked out;
            // made when it's shown again)
            if (!vis && !topVis) {
                for (let n of ["shadow", "shade", "web", "spider"]) {
                    if (rec[n] && !rec[n]._cleared && rec[n]._visible) {
                        rec[n].visible = false;
                    }
                }
                if (rec.shadow) {
                    stats.shadows++;
                }
                return;
            }
            let painted: RasterData = b._rasterData[BFOUNDATION._RASTERDATA_SHADOW];
            if (lit) {
                if (painted && !painted._cleared && painted._visible) {
                    painted.visible = false;
                    rec.painted = painted;
                }
                // the cast shadow, of all its standing parts together (its moving parts too)
                // (fast: nothing about its parts changed since the last tick, nor the light: its shadow as it is)
                let sig: number = IoLighting.partsSig(b, gx, gy);
                let stillSig: number = IoLighting._stillSig;
                let fresh: boolean = sig === rec.partsSig && key === rec.partsKey && rec.shadow && !rec.shadow._cleared;
                // (only its moving parts' pictures changed, its shadow made again not long ago: it waits its turn)
                if (!fresh && rec.moving && stillSig === rec.stillSig && key === rec.partsKey && rec.shadow && !rec.shadow._cleared && now - (rec.shadowAt || 0) < IoLighting._movingMs) {
                    fresh = true;
                }
                let parts: any = fresh ? null : IoLighting.partsOf(b, gx, gy);
                let moving: boolean = fresh ? Boolean(rec.moving) : parts.moving;
                let want: string = fresh ? rec.shadowKey : parts.key + key;
                let stale: boolean = !fresh && (!rec.shadow || rec.shadow._cleared || rec.shadowKey != want);
                // (something moving: made again at most every MOVING_MS, unless the light or the building changed)
                if (stale && moving && rec.shadow && !rec.shadow._cleared && rec.shadowBase == parts.still + key && now - (rec.shadowAt || 0) < IoLighting._movingMs) {
                    stale = false;
                }
                // (the signature kept only once its shadow is up to date: a moving part waiting its turn is looked at again)
                if (!fresh) {
                    rec.moving = moving;
                    rec.stillSig = stillSig;
                    let upToDate: boolean = !stale && rec.shadowKey == want;
                    rec.partsSig = upToDate || stale ? sig : NaN;
                    rec.partsKey = key;
                }
                if (stale && !moving) {
                    // (a still building's: made in the background thread (flash/_lightWorker), or here where it can't
                    // be; until it comes, the shadow it had)
                    if (rec.shadowPending !== want) {
                        let src: any = parts.single ? parts.single : IoLighting.composite(rec, parts);
                        let p: any = { "relX": parts.x, "relY": parts.y, "sx": S.x, "sy": S.y, "blur": Math.max(0, Number(L.soft === undefined ? 1.6 : L.soft)), "colour": IoLighting.shadowColour(L) };
                        IoLighting.makePicture(rec, "shadowPending", want, "shadow", src.$canvas, p, (pic: LightPicture): void => {
                            // (22 October: the building gone (the yard left) before its shadow came: not drawn on the
                            // next yard at its old place)
                            if (b.m_isCleared || !b._rasterData || IoLighting._recs.get(b) !== rec) {
                                IoLighting.closePicture(pic);
                                return;
                            }
                            // (21 October: a new shadow the size of the one shown: drawn into its picture, the entry kept;
                            // a battle wore buildings down and made a new picture, a new canvas, for each step)
                            let had: any = rec.shadow && !rec.shadow._cleared ? rec.shadow._data : null;
                            if (pic && had && !had.$disposed && had.$ctx && had.width === (pic.img.width | 0) && had.height === (pic.img.height | 0) && rec.shadowPt && rec.shadowOff) {
                                had.$ctx.setTransform(1, 0, 0, 1, 0, 0);
                                had.$ctx.globalAlpha = 1;
                                had.$ctx.globalCompositeOperation = "source-over";
                                had.$ctx.clearRect(0, 0, had.width, had.height);
                                had.$ctx.drawImage(pic.img, 0, 0);
                                had.$touch();
                                IoLighting.closePicture(pic);
                                rec.shadowOff.x = pic.ox;
                                rec.shadowOff.y = pic.oy;
                                rec.shadowPt.x = rec.lastGx + pic.ox;
                                rec.shadowPt.y = rec.lastGy + pic.oy;
                                IoLighting.stats.made++;
                                rec.shadowKey = want;
                                rec.shadowBase = parts.still + key;
                                rec.shadowAt = IoLighting._tickAt;
                                rec.partsSig = NaN;
                                return;
                            }
                            IoLighting.dropEntry(rec, "shadow");
                            if (pic) {
                                rec.shadowPt = new Point(rec.lastGx + pic.ox, rec.lastGy + pic.oy);
                                rec.shadowOff = new Point(pic.ox, pic.oy);
                                rec.shadow = new RasterData(as3.cast(IoLighting.pictureData(pic), IBitmapDrawable), rec.shadowPt, MAP.DEPTH_SHADOW, null, true);
                                IoLighting.setAlpha(rec.shadow, IoLighting._light ? Number(IoLighting._light.shBk) : 0);
                                IoLighting.stats.made++;
                            }
                            rec.shadowKey = want;
                            rec.shadowBase = parts.still + key;
                            rec.shadowAt = IoLighting._tickAt;
                            rec.partsSig = NaN;
                        });
                    }
                } else if (stale) {
                    let src: any = parts.single ? parts.single : IoLighting.composite(rec, parts);
                    rec.shadowPending = null;
                    // (what moves: drawn again into its picture from before, when it fits, the entry kept)
                    let keep: boolean = moving && rec.shadow && !rec.shadow._cleared;
                    let made: any = src ? IoLighting.castShadow(src, parts.x, parts.y, S, L, !moving, keep ? rec.shadow._data : null) : null;
                    if (keep && made) {
                        if (rec.shadow._data !== made.bmd) {
                            let old: any = rec.shadow._data;
                            rec.shadow.data = as3.cast(made.bmd, IBitmapDrawable);
                            try {
                                old.dispose();
                            } catch (er) {
                            }
                        }
                        rec.shadowOff.x = made.ox;
                        rec.shadowOff.y = made.oy;
                    } else {
                        IoLighting.dropEntry(rec, "shadow");
                        if (made) {
                            rec.shadowPt = new Point();
                            rec.shadowOff = new Point(made.ox, made.oy);
                            rec.shadow = new RasterData(as3.cast(made.bmd, IBitmapDrawable), rec.shadowPt, MAP.DEPTH_SHADOW, null, true);
                            IoLighting.stats.made++;
                        }
                    }
                    rec.shadowKey = want;
                    rec.shadowBase = parts.still + key;
                    rec.shadowAt = now;
                }
                if (rec.shadow) {
                    rec.shadowPt.x = gx + rec.shadowOff.x;
                    rec.shadowPt.y = gy + rec.shadowOff.y;
                    IoLighting.setAlpha(rec.shadow, L.shBk);
                    rec.shadow.visible = vis && L.shBk > 0.005;
                    stats.shadows++;
                    if (moving) {
                        stats.moving++;
                    }
                }
                // the shading across it (not on walls: too small to show)
                if (!isWall && !flatTop && Number(L.shade) > 0.02) {
                    if (!rec.shade || rec.shade._cleared || rec.shadeSig !== topSig || rec.shadeKey !== key) {
                        IoLighting.dropEntry(rec, "shade");
                        let sh: BitmapData = IoLighting.shadeOf(bmd, S, L);
                        if (sh) {
                            rec.shade = new RasterData(as3.cast(sh, IBitmapDrawable), top._pt, top._depth + 0.5, "overlay");
                            rec.shade.$ioOurs = true;
                            IoLighting.stats.made++;
                        }
                        rec.shadeSig = topSig;
                        rec.shadeKey = key;
                    }
                    if (rec.shade) {
                        IoLighting.follow(rec.shade, top, 0.5, topVis);
                        stats.shades++;
                    }
                } else {
                    // (no shading to show (Strength or Shading 0): none drawn)
                    IoLighting.dropEntry(rec, "shade");
                }
            } else {
                IoLighting.dropEntry(rec, "shadow");
                IoLighting.dropEntry(rec, "shade");
                if (rec.painted && !rec.painted._cleared) {
                    rec.painted.visible = true;
                }
                rec.painted = null;
            }
            // ---- spooky: webs on it (its corners, under its eaves, its roof gone grey with them, threads hanging)
            if (spooky && !flatTop) {
                let n: int = (Number(b._id) || 0) | 0;
                // (none on walls nor decorations: walls only strung between, decorations none at all)
                let wantWeb: boolean = !isWall && b._class != "decoration";
                if (!wantWeb) {
                    IoLighting.dropEntry(rec, "web");
                } else if (!rec.web || rec.web._cleared || rec.webSig !== topSig || rec.webKey !== IoLighting._spookyKey) {
                    // (made in the background thread (flash/_lightWorker), or here where it can't be; until it comes,
                    // the webs it had)
                    let wantKey: string = topSig + "|" + IoLighting._spookyKey;
                    if (rec.webPending !== wantKey) {
                        let st: any = IoLighting._st;
                        let p: any = { "seed": n, "footY": -relY, "webs": Number(st.webs), "webAlpha": Number(st.webAlpha), "dust": Number(st.dust) };
                        let sk: string = IoLighting._spookyKey;
                        let topRef: RasterData = top;
                        IoLighting.makePicture(rec, "webPending", wantKey, "web", bmd.$canvas, p, (pic: LightPicture): void => {
                            IoLighting.dropEntry(rec, "web");
                            // (its building gone meanwhile (a yard loading): nothing put up)
                            if (pic && (topRef._cleared || !topRef._pt)) {
                                IoLighting.closePicture(pic);
                                return;
                            }
                            if (pic) {
                                rec.webPt = new Point(topRef._pt.x + pic.ox, topRef._pt.y + pic.oy);
                                rec.webOff = new Point(pic.ox, pic.oy);
                                rec.web = new RasterData(as3.cast(IoLighting.pictureData(pic), IBitmapDrawable), rec.webPt, topRef._depth + 6.5);
                                rec.web.$ioOurs = true;
                                rec.spiderAt = pic.spider ? new Point(pic.spider[0], pic.spider[1]) : null;
                                rec.webCount = pic.count | 0;
                                rec.webHubs = pic.hubs || [];
                                IoLighting.stats.made++;
                            }
                            rec.webSig = topSig;
                            rec.webKey = sk;
                        });
                    }
                }
                if (rec.web) {
                    rec.webPt.x = top._pt.x + rec.webOff.x;
                    rec.webPt.y = top._pt.y + rec.webOff.y;
                    rec.web.depth = top._depth + 6.5;
                    rec.web._ioFoot = top._ioFoot;
                    rec.web.visible = topVis;
                    stats.webs++;
                }
                // (a spider down a thread from under the eaves of some)
                // (how many: the Spiders slider; one in three at its usual)
                let spiders: number = Number(IoLighting._st.spiders);
                if (!isWall && topVis && IoLighting.rnd(n * 0.37 + 1) < spiders / 3 && rec.web && rec.spiderAt) {
                    if (!rec.spider || rec.spider._cleared) {
                        rec.spiderPt = new Point();
                        rec.spider = new RasterData(as3.cast(IoLighting.spiderPicture(), IBitmapDrawable), rec.spiderPt, top._depth + 7);
                        rec.spider.$ioOurs = true;
                        rec.spiderPhase = (n % 7) * 0.9;
                    }
                    // (moved about 7 times a second, not every tick: each move draws its patch of the yard again)
                    let bob: number = Math.sin(Math.floor(now / 150) * 150 / 900 + rec.spiderPhase) * 7;
                    rec.spiderPt.x = top._pt.x + rec.spiderAt.x - 8;
                    rec.spiderPt.y = Math.round(top._pt.y + rec.spiderAt.y + bob);
                    rec.spider.depth = top._depth + 7;
                    rec.spider._ioFoot = top._ioFoot;
                    rec.spider.visible = topVis;
                    stats.spiders++;
                } else {
                    IoLighting.dropEntry(rec, "spider");
                }
                // (webs strung only between buildings: never to a wall, a decoration or a trap)
                if (vis && topVis && !isWall && b._class != "decoration" && b._class != "trap") {
                    spanList.push({ "b": b, "id": n, "wall": false, "gx": gx, "gy": gy, "top": top, "bmd": bmd, "rec": rec });
                }
            } else {
                IoLighting.dropEntry(rec, "web");
                IoLighting.dropEntry(rec, "spider");
            }
        };
        for (let id in BASE._buildingsAll) {
            each(BASE._buildingsAll[id]);
        }
        // (the mushrooms aren't among the buildings)
        if (BASE._buildingsMushrooms) {
            for (let id in BASE._buildingsMushrooms) {
                each(BASE._buildingsMushrooms[id]);
            }
        }
        // (buildings gone: their pictures go)
        for (let [b, rec] of IoLighting._recs) {
            if (rec.seen != seen) {
                IoLighting.dropRec(rec);
                IoLighting._recs.delete(b);
            }
        }
        // ---- spooky: webs strung between buildings standing side by side, and between walls a block apart
        IoLighting.spans(spanList, stats, now);
        // ---- the workers, the pets, the monsters: their own shadows, from their pictures as they move
        IoLighting.walkers(L, S, off, now, stats, covered);
        for (let k in stats) {
            IoLighting.stats[k] = stats[k];
        }
        IoLighting.stats.ms = +(performance.now() - t0).toFixed(2);
    }

    private static _ids: int = 0;

    /** A picture's own number (kept on it), for knowing it again. */
    private static idOf(bmd: any): int {
        if (bmd.$ioLitId === undefined) {
            bmd.$ioLitId = ++IoLighting._ids;
        }
        return bmd.$ioLitId | 0;
    }

    /**
     * A building's standing parts as they are now: each one's picture and where it is from the building's foot, the
     * box round them all, whether any moves (its picture changing as it plays), a key for all of it and one leaving out
     * what moves.
     */
    private static partsOf(b: any, gx: number, gy: number): any {
        let list: any[] = [];
        let x0: number = 1e9, y0: number = 1e9, x1: number = -1e9, y1: number = -1e9;
        let key: string = "";
        let still: string = "";
        let moving: boolean = false;
        for (let i of IoLighting.PARTS) {
            let e: RasterData = b._rasterData[i];
            let d: any = e && !e._cleared ? e._data : null;
            if (!d || !e._pt || !e._visible) {
                continue;
            }
            let fx: number = 0, fy: number = 0;
            if (!d.$canvas) {
                let fl: any = IoLighting.flat(d);
                if (!fl) {
                    continue;
                }
                d = fl.bmd;
                fx = fl.dx;
                fy = fl.dy;
            }
            if (!(d.width > 0)) {
                continue;
            }
            let rx: number = Math.round(e._pt.x + fx - gx);
            let ry: number = Math.round(e._pt.y + fy - gy);
            list.push({ "d": d, "x": rx, "y": ry });
            x0 = Math.min(x0, rx);
            y0 = Math.min(y0, ry);
            x1 = Math.max(x1, rx + d.width);
            y1 = Math.max(y1, ry + d.height);
            let k: string = i + "=" + IoLighting.idOf(d) + "@" + rx + "," + ry + "/" + d.width + "x" + d.height;
            let isMoving: boolean = i >= 3 && i <= 5;
            key += k + ":" + Number(d.$version || 0) + ";";
            still += k + (isMoving ? "" : ":" + Number(d.$version || 0)) + ";";
            moving = moving || isMoving;
        }
        if (!list.length) {
            return { "key": "", "still": "", "moving": false, "single": null, "list": list, "x": 0, "y": 0, "w": 0, "h": 0 };
        }
        return { "key": key, "still": still, "moving": moving, "single": list.length == 1 ? list[0].d : null, "list": list, "x": list.length == 1 ? list[0].x : x0, "y": list.length == 1 ? list[0].y : y0, "w": Math.ceil(x1 - x0), "h": Math.ceil(y1 - y0) };
    }

    /**
     * A clip (not a picture: a mushroom's top) drawn flat into a picture, kept on it and drawn again when it changes:
     * {bmd, dx, dy} (where the picture's top left is from the clip's own point).
     */
    private static flat(clip: any): any {
        if (!(clip instanceof DisplayObject)) {
            return null;
        }
        let d: any = clip;
        let f: any = d.$ioFlat;
        // (looked at again at most every 400 ms: a clip's signature costs a walk through it)
        let t: number = IoLighting._tickAt || getTimer();
        if (f && t - (f.at || 0) < 400) {
            return f.bmd ? f : null;
        }
        let sig: number = typeof d.$contentSig == "function" ? Number(d.$contentSig()) : 0;
        if (f) {
            f.at = t;
        }
        if (f && f.sig === sig) {
            return f.bmd ? f : null;
        }
        if (f && f.bmd) {
            f.bmd.dispose();
        }
        let b: Rectangle = d.getBounds(d);
        let w: int = Math.min(1024, Math.ceil(b.width) + 2) | 0;
        let h: int = Math.min(1024, Math.ceil(b.height) + 2) | 0;
        f = d.$ioFlat = { "sig": sig, "at": t, "bmd": null, "dx": Math.floor(b.x), "dy": Math.floor(b.y) };
        if (w < 2 || h < 2) {
            return null;
        }
        try {
            let bmd: BitmapData = new BitmapData(w, h, true, 0);
            bmd.draw(as3.cast(d, IBitmapDrawable), new Matrix(1, 0, 0, 1, -f.dx, -f.dy));
            f.bmd = bmd;
        } catch (e) {
            return null;
        }
        return f;
    }

    /**
     * A number for a building's standing parts as they are now (their pictures, versions, where they are from its foot,
     * which are shown), cheap enough for every building every tick; NaN when one is a clip (looked at in full).
     */
    private static partsSig(b: any, gx: number, gy: number): number {
        let sig: number = 7;
        let still: number = 7;
        for (let i of IoLighting.PARTS) {
            let e: RasterData = b._rasterData[i];
            if (!e || e._cleared || !e._data || !e._pt || !e._visible) {
                continue;
            }
            let d: any = e._data;
            let ver: number = 0;
            let size: any = d;
            if (!d.$canvas) {
                // (a clip, a mushroom's: its flat picture's signature and size, looked at every 400 ms (a clip's own
                // size walks all of it))
                let f: any = IoLighting.flat(d);
                if (!f || !f.bmd) {
                    return NaN;
                }
                ver = Number(f.sig) % 1000003;
                size = f.bmd;
            } else {
                ver = Number(d.$version || 0);
            }
            let one: number = (i * 7 + IoLighting.idOf(d) * 101 + Math.round(e._pt.x - gx) * 17 + Math.round(e._pt.y - gy) * 19 + (size.width | 0) * 3 + (size.height | 0) * 5) % 4294967291;
            // (a moving part's picture changes every frame: the still parts' signature apart, for waiting its turn)
            if (i < 3 || i > 5) {
                still = (still * 31 + one + ver * 13) % 4294967291;
            } else {
                still = (still * 31 + one) % 4294967291;
            }
            sig = (sig * 31 + one + ver * 13) % 4294967291;
        }
        IoLighting._stillSig = still;
        return sig;
    }

    /**
     * A picture for a building (its shadow, its webs) made in the background thread, or here at once where it can't be
     * (flash/_lightWorker): `apply` when it comes, unless the building's gone, the lighting's off or something newer was
     * asked for since (rec[pendingName] no longer `want`).
     */
    private static makePicture(rec: any, pendingName: string, want: string, kind: "shadow" | "web", src: any, p: any, apply: Function): void {
        rec[pendingName] = want;
        let current = (): boolean => rec[pendingName] === want && !rec.dropped && IoLighting._active;
        if (!lightWorkerAvailable()) {
            let pic: LightPicture = lightHere(kind, src, p);
            rec[pendingName] = null;
            apply(pic);
            return;
        }
        lightInWorker(kind, src, p).then((pic: LightPicture): void => {
            if (!current()) {
                IoLighting.closePicture(pic);
                return;
            }
            if (pic === undefined) {
                // (the worker failed: made here instead)
                pic = lightHere(kind, src, p);
            }
            rec[pendingName] = null;
            apply(pic);
        });
    }

    /** A picture from the worker (or made here) as a BitmapData of its own. */
    private static pictureData(pic: LightPicture): BitmapData {
        let img: any = pic.img;
        let out: any = new BitmapData(Math.max(1, img.width | 0), Math.max(1, img.height | 0), true, 0);
        out.$ctx.drawImage(img, 0, 0);
        out.$touch();
        IoLighting.closePicture(pic);
        return out;
    }

    private static closePicture(pic: LightPicture): void {
        try {
            if (pic && pic.img && typeof (pic.img as any).close == "function") {
                (pic.img as any).close();
            }
        } catch (e) {
        }
    }

    /** For tests: the pictures made in the background thread (flash/_lightWorker), and failures there. */
    public static get inBackground(): any {
        return { "available": lightWorkerAvailable(), "made": lightWorkerStats.made, "failed": lightWorkerStats.failed };
    }

    /** An entry's alpha, set only when it changes (as the entry keeps it). */
    private static setAlpha(e: RasterData, a: number): void {
        let v: number = (Math.ceil(a * 255) << 24) >>> 0;
        if (e._alpha !== v) {
            e._alpha = v;
        }
    }

    /** The still parts' signature, from the last partsSig (its moving parts where they are, not their pictures). */
    private static _stillSig: number = 0;

    /** A building's standing parts drawn together into one picture (kept with it, used again). */
    private static composite(rec: any, parts: any): any {
        let w: int = Math.max(1, Math.min(2048, parts.w)) | 0;
        let h: int = Math.max(1, Math.min(2048, parts.h)) | 0;
        let c: any = rec.comp;
        if (!c || c.width != w || c.height != h) {
            if (c) {
                c.dispose();
            }
            c = rec.comp = new BitmapData(w, h, true, 0);
        }
        let ctx: any = c.$ctx;
        ctx.clearRect(0, 0, w, h);
        for (let p of parts.list) {
            ctx.drawImage(p.d.$canvas, p.x - parts.x, p.y - parts.y);
        }
        c.$touch();
        return c;
    }

    /** An entry kept with its building's top: where it is, its depth, its foot (the Tilt), shown when it is. */
    private static follow(e: RasterData, top: RasterData, plus: number, vis: boolean): void {
        if (e._pt !== top._pt) {
            e._pt = top._pt;
        }
        e.depth = top._depth + plus;
        e._ioFoot = top._ioFoot;
        e.visible = vis;
    }

    private static dropEntry(rec: any, name: string): void {
        // (a picture still being made for it isn't wanted either)
        if (name == "shadow") {
            rec.shadowPending = null;
        } else if (name == "web") {
            rec.webPending = null;
        }
        let e: RasterData = rec[name];
        if (e) {
            if (!e._cleared) {
                let bmd: any = e._data;
                e.clear(false);
                // (its own picture, not a shared one)
                if (name != "spider") {
                    try {
                        bmd.dispose();
                    } catch (er) {
                    }
                }
            }
            rec[name] = null;
        }
    }

    private static dropRec(rec: any): void {
        rec.dropped = true;
        for (let n of ["shadow", "shade", "web", "spider"]) {
            IoLighting.dropEntry(rec, n);
        }
        if (rec.comp) {
            rec.comp.dispose();
            rec.comp = null;
        }
        if (rec.painted && !rec.painted._cleared) {
            rec.painted.visible = true;
        }
        rec.painted = null;
    }

    /** Everything taken away: the painted shadows back, the monsters' shadows as they were. */
    public static teardown(): void {
        for (let [b, rec] of IoLighting._recs) {
            IoLighting.dropRec(rec);
        }
        IoLighting._recs.clear();
        for (let [k, sp] of IoLighting._spans) {
            IoLighting.dropEntry(sp, "web");
        }
        IoLighting._spans.clear();
        if (IoLighting._overlay && !IoLighting._overlay._cleared) {
            let bmd: any = IoLighting._overlay._data;
            IoLighting._overlay.clear(false);
            try {
                bmd.dispose();
            } catch (e) {
            }
        }
        IoLighting._overlay = null;
        IoLighting._overlayKey = null;
        IoLighting.dropOverlay2();
        IoLighting.paintedHidden = false;
        // (every building's painted shadow back, as the game shows it: it leaves them hidden while paintedHidden)
        for (let list of [BASE._buildingsAll, BASE._buildingsMushrooms]) {
            if (!list) {
                continue;
            }
            for (let id in list) {
                let b: any = list[id];
                let p: RasterData = b && b._rasterData ? b._rasterData[BFOUNDATION._RASTERDATA_SHADOW] : null;
                if (p && !p._cleared && !p._visible && b._mcBase && b._mcBase.visible && !b._moving) {
                    p.visible = true;
                }
            }
        }
        IoLighting.walkers(null, null, null, 0, null);
        IoLighting._active = false;
        for (let k in IoLighting.stats) {
            if (k != "made") {
                IoLighting.stats[k] = 0;
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // The pictures
    // ---------------------------------------------------------------------------------------------
    /**
     * A shadow from a picture (`bmd`, its top left at (relX, relY) from the foot): every point above the foot moved along
     * the ground away from the light by its height times the slant; the rows below the foot are on the ground already
     * (what stands there covers them). Softened unless `soft` is false (what moves: made again often). Its picture,
     * and where its top left goes, from the foot.
     */
    private static castShadow(bmd: any, relX: number, relY: number, S: any, L: any, soft: boolean = true, reuse: any = null): any {
        let w: int = bmd.width | 0;
        let clipH: int = Math.max(0, Math.min(bmd.height, -relY)) | 0;
        if (w < 2 || clipH < 2) {
            return null;
        }
        // (where the picture's corners land: x' = relX + u + h * Sx, y' = h * Sy, h = -relY - v)
        let xs: number[] = [];
        let ys: number[] = [];
        for (let [u, v] of [[0, 0], [w, 0], [0, clipH], [w, clipH]]) {
            let h: number = -relY - v;
            xs.push(relX + u + h * S.x);
            ys.push(h * S.y);
        }
        let blur: number = soft ? Math.max(0, Number(L.soft === undefined ? 1.6 : L.soft)) : 0;
        let pad: int = (Math.ceil(blur * 2.5) + 1) | 0;
        let bx: number = Math.floor(Math.min(...xs)) - pad;
        let by: number = Math.floor(Math.min(...ys)) - pad;
        let bw: int = Math.min(2048, Math.ceil(Math.max(...xs) - bx) + pad) | 0;
        let bh: int = Math.min(2048, Math.ceil(Math.max(...ys) - by) + pad) | 0;
        if (bw < 2 || bh < 2) {
            return null;
        }
        // (a picture made before used again when it's big enough and not far too big: what moves, made again often)
        let out: any = null;
        if (reuse && reuse.width >= bw && reuse.height >= bh && reuse.width <= bw * 1.5 + 16 && reuse.height <= bh * 1.5 + 16) {
            out = reuse;
            out.$ctx.setTransform(1, 0, 0, 1, 0, 0);
            out.$ctx.clearRect(0, 0, out.width, out.height);
        } else {
            out = new BitmapData(reuse ? Math.ceil(bw * 1.2) + 8 : bw, reuse ? Math.ceil(bh * 1.2) + 8 : bh, true, 0);
        }
        let ctx: any = out.$ctx;
        ctx.save();
        if (blur > 0.05) {
            try {
                ctx.filter = "blur(" + blur.toFixed(1) + "px)";
            } catch (e) {
            }
        }
        // (u, v) -> (x' - bx, y' - by): a = 1, b = 0, c = -Sx, d = -Sy
        ctx.setTransform(1, 0, -S.x, -S.y, relX + (-relY) * S.x - bx, (-relY) * S.y - by);
        ctx.drawImage(bmd.$canvas, 0, 0, w, clipH, 0, 0, w, clipH);
        ctx.restore();
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = IoLighting.shadowColour(L);
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.globalCompositeOperation = "source-over";
        out.$touch();
        return { "bmd": out, "ox": bx, "oy": by };
    }

    /**
     * The shadows' paint. Their colour is the light's own shadow, bluish and deep; bluer or browner (Colour); brighter
     * (toward white: a lighter shadow) or darker (toward black) (Intensity): as if drawn "multiply" (each channel of
     * what's under it times the colour's). Drawn instead as usual ("multiply" costs several times as much to draw,
     * every shadow in every patch of the yard drawn again): a darker paint (this) over it, as see-through as `L.shK`
     * times the shadow's own strength: the same as "multiply" for a grey shadow, and for a tinted one the same over a
     * middle grey (each channel darkened as much, its tint added back).
     */
    public static shadowColour(L: any): string {
        if (L.$shColour) {
            return L.$shColour;
        }
        let t: number[] = L.tint;
        let c: number[] = [t[0] * 0.16, t[1] * 0.14, t[2] * 0.2 + 20];
        let h: number = Number(L.shHue) || 0;
        if (h < 0) {
            let blue: number[] = [t[0] * 0.08, t[1] * 0.12, t[2] * 0.36 + 34];
            c = c.map((v: number, i: int): number => v + (blue[i] - v) * -h);
        } else if (h > 0) {
            let brown: number[] = [t[0] * 0.3 + 20, t[1] * 0.18 + 8, t[2] * 0.06];
            c = c.map((v: number, i: int): number => v + (brown[i] - v) * h);
        }
        let k: number = Number(L.int) || 0;
        if (k > 0) {
            c = c.map((v: number): number => v * (1 - k));
        } else if (k < 0) {
            c = c.map((v: number): number => v + (255 - v) * -k * 0.8);
        }
        c = c.map((v: number): number => Math.max(0, Math.min(255, v)) / 255);
        // (how much it darkens, on average: the paint's opacity at full strength; each channel's paint making up its own)
        let m: number = (c[0] + c[1] + c[2]) / 3;
        let shK: number = 1 - m;
        let paint: number[] = c.map((v: number): number => (shK < 0.01 ? 0 : Math.max(0, Math.min(255, 128 * (1 - (1 - v) / shK)))));
        L.shK = shK;
        L.$shColour = "rgb(" + paint.map((v: number): number => Math.round(v)).join(",") + ")";
        return L.$shColour;
    }

    /** A building's shading: lighter toward the light, darker away, in its own outline (drawn "overlay" over it). */
    private static shadeOf(bmd: any, S: any, L: any): BitmapData {
        let w: int = bmd.width | 0;
        let h: int = bmd.height | 0;
        if (w < 4 || h < 4) {
            return null;
        }
        let out: any = new BitmapData(w, h, true, 0);
        let ctx: any = out.$ctx;
        // (from the side facing the light to the far side, across its middle)
        let half: number = Math.max(w, h) / 2;
        let x0: number = w / 2 - S.ux * half;
        let y0: number = h / 2 - S.uy * half;
        let x1: number = w / 2 + S.ux * half;
        let y1: number = h / 2 + S.uy * half;
        let k: number = Number(L.shade) || 1;
        let lo: int = Math.round(128 - 72 * k) | 0;
        let hi: int = Math.round(128 + 62 * k) | 0;
        let g: any = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, "rgb(" + hi + "," + hi + "," + hi + ")");
        g.addColorStop(0.5, "rgb(128,128,128)");
        g.addColorStop(1, "rgb(" + lo + "," + lo + "," + lo + ")");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(bmd.$canvas, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        out.$touch();
        return out;
    }

    /** (22 October) The whole yard's light taken away, its picture let go (it was left to the garbage collector). */
    private static dropOverlay(): void {
        let o: any = IoLighting._overlay;
        if (!o || o._cleared) {
            return;
        }
        let bmd: any = o._data;
        o.clear(false);
        try {
            if (bmd && typeof bmd.dispose == "function") {
                bmd.dispose();
            }
        } catch (e) {
        }
    }

    /** The whole yard's light: its colour, a little lighter toward it; spooky: greyer, darker at the yard's edges. */
    private static overlay(L: any, spooky: boolean, key: string): void {
        let W: int = MAP._canvas.width | 0;
        let H: int = MAP._canvas.height | 0;
        if (!L && !spooky) {
            if (IoLighting._overlay) {
                IoLighting.dropOverlay();
                IoLighting._overlay = null;
                IoLighting._overlayKey = null;
            }
            IoLighting.dropOverlay2();
            return;
        }
        const N: int = 64;
        let k2: string = key + "|" + W + "x" + H;
        if (IoLighting._overlay && !IoLighting._overlay._cleared && IoLighting._overlayKey == k2) {
            return;
        }
        if (IoLighting._overlay && !IoLighting._overlay._cleared) {
            IoLighting.dropOverlay();
        }
        IoLighting._overlay = null;
        IoLighting._overlayKey = k2;
        IoLighting.dropOverlay2();
        // (nothing to change: no tint, no darkening, no edges, no gloom: none drawn over the whole yard, for speed)
        if (IoLighting.overlayIsNothing(L, spooky)) {
            return;
        }
        let bmd: any = new BitmapData(N, N, true, 0);
        let ctx: any = bmd.$ctx;
        let tint: number[] = L ? L.tint : [255, 255, 255];
        let amb: number = L ? L.amb : 1;
        let bright: number = L ? Number(L.bright) || 1 : 1;
        // (darker: less light; brighter: drawn lighter over it, below)
        amb *= Math.min(1, bright);
        let gloom: number = spooky ? Number(IoLighting._st.gloom) : 0;
        if (spooky) {
            // (greyer and a little green)
            tint = [tint[0] * (1 - 0.2 * gloom), tint[1] * (1 - 0.14 * gloom), tint[2] * (1 - 0.2 * gloom)];
            amb *= 1 - 0.12 * gloom;
        }
        let c = (f: number): string => "rgb(" + [0, 1, 2].map((i: int): number => Math.max(0, Math.min(255, Math.round(tint[i] * amb * f)))).join(",") + ")";
        if (L) {
            let S: any = IoLighting.slant(L);
            let g: any = ctx.createLinearGradient(N / 2 - S.ux * N / 2, N / 2 - S.uy * N / 2, N / 2 + S.ux * N / 2, N / 2 + S.uy * N / 2);
            // (lighter toward the light, darker away: as much as the light's strength)
            let k: number = Math.max(0, Math.min(1, Number(L.k === undefined ? 1 : L.k)));
            g.addColorStop(0, c(1 + 0.04 * k));
            g.addColorStop(1, c(1 - 0.1 * k));
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = c(1);
        }
        ctx.fillRect(0, 0, N, N);
        // (dark edges: the slider's, and the spooky yard's gloom)
        let vig: number = Math.min(0.95, (L ? Number(L.vig) || 0 : 0) * 0.75 + 0.55 * gloom);
        if (vig > 0.005) {
            let r: any = ctx.createRadialGradient(N / 2, N / 2, N * 0.22, N / 2, N / 2, N * 0.72);
            r.addColorStop(0, "rgba(0,0,0,0)");
            r.addColorStop(1, "rgba(10,14,12," + vig.toFixed(3) + ")");
            ctx.fillStyle = r;
            ctx.fillRect(0, 0, N, N);
        }
        // (drawn as usual, not "multiply" (several times as costly, in every patch of the yard drawn again): each pixel's
        // colour turned into a darker paint and how see-through it is, as the shadows' (shadowColour))
        try {
            let img: any = ctx.getImageData(0, 0, N, N);
            let px: any = img.data;
            for (let i: int = 0; i < px.length; i += 4) {
                let r: number = px[i] / 255, gg: number = px[i + 1] / 255, bb: number = px[i + 2] / 255;
                let k: number = 1 - (r + gg + bb) / 3;
                if (k < 0.004) {
                    px[i + 3] = 0;
                    continue;
                }
                px[i] = Math.max(0, Math.min(255, Math.round(128 * (1 - (1 - r) / k))));
                px[i + 1] = Math.max(0, Math.min(255, Math.round(128 * (1 - (1 - gg) / k))));
                px[i + 2] = Math.max(0, Math.min(255, Math.round(128 * (1 - (1 - bb) / k))));
                px[i + 3] = Math.max(0, Math.min(255, Math.round(k * 255)));
            }
            ctx.putImageData(img, 0, 0);
        } catch (er) {
        }
        bmd.$touch();
        let e: RasterData = new RasterData(as3.cast(bmd, IBitmapDrawable), new Point(0, 0), 1e15, null);
        e.scaleX = W / N;
        e.scaleY = H / N;
        (e as any).$ioOurs = true;
        IoLighting._overlay = e;
        IoLighting._overlayKey = k2;
        // brighter than as drawn: a grey drawn "screen" over it all
        IoLighting.dropOverlay2();
        if (bright > 1.001) {
            let b2: any = new BitmapData(4, 4, true, 0);
            let v: int = Math.round((bright - 1) * 0.7 * 255) | 0;
            b2.$ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
            b2.$ctx.fillRect(0, 0, 4, 4);
            b2.$touch();
            let e2: RasterData = new RasterData(as3.cast(b2, IBitmapDrawable), new Point(0, 0), 1e15 + 1, "screen");
            e2.scaleX = W / 4;
            e2.scaleY = H / 4;
            (e2 as any).$ioOurs = true;
            IoLighting._overlay2 = e2;
        }
    }

    private static _overlay2: RasterData = null;

    /** Whether the yard's light would change nothing: white, full, no gradient (Strength 0), no edges, no gloom. */
    private static overlayIsNothing(L: any, spooky: boolean): boolean {
        if (spooky && Number(IoLighting._st.gloom) > 0.005) {
            return false;
        }
        if (!L) {
            return true;
        }
        let k: number = Number(L.k === undefined ? 1 : L.k);
        let white: boolean = L.tint.every((c: number): boolean => c >= 254.5);
        return white && L.amb >= 0.998 && Math.abs((Number(L.bright) || 1) - 1) < 0.001 && k < 0.002 && !(Number(L.vig) > 0.005);
    }

    private static dropOverlay2(): void {
        if (IoLighting._overlay2 && !IoLighting._overlay2._cleared) {
            let bmd: any = IoLighting._overlay2._data;
            IoLighting._overlay2.clear(false);
            try {
                bmd.dispose();
            } catch (e) {
            }
        }
        IoLighting._overlay2 = null;
    }

    // ---- the workers, the pets, the monsters, and anything else standing in the yard
    /** Each one's shadow: {entry, pt, key, at}, kept on it as $ioLit. */
    private static _walkers: Set<any> = new Set();

    /** Anything else drawn standing in the yard, not a building nor a walker (an event's things): its shadow. */
    private static _strays: Map<any, any> = new Map();
    private static _straysAt: number = -1e9;

    /** Pictures this small (either way) cast no shadow of their own: icons, names, sparks. */
    private static readonly STRAY_MIN: int = 24;

    /**
     * A picture of what an entry draws: {bmd, dx, dy} (its top left from the entry's point), whatever it is: a picture,
     * a Bitmap (its picture), a clip (drawn flat, kept on it, drawn again when it changes). Null: nothing to draw.
     */
    private static pictureOf(d: any): any {
        if (!d) {
            return null;
        }
        if (d.$canvas) {
            return { "bmd": d, "dx": 0, "dy": 0 };
        }
        let inner: any = d.bitmapData;
        if (inner && inner.$canvas && !(d.numChildren > 0)) {
            return { "bmd": inner, "dx": 0, "dy": 0 };
        }
        return IoLighting.flat(d);
    }

    /** A number for what an entry draws now (cheap: no drawing, no strings), to know when its shadow needs making again. */
    private static drawnSig(d: any): number {
        if (d.$canvas) {
            return (IoLighting.idOf(d) * 1009 + Number(d.$version || 0)) % 4294967291;
        }
        let inner: any = d.bitmapData;
        if (inner && inner.$canvas && !(d.numChildren > 0)) {
            return (IoLighting.idOf(inner) * 1009 + Number(inner.$version || 0)) % 4294967291;
        }
        // (a clip: its flat picture's, looked at every 400 ms)
        let f: any = IoLighting.flat(d);
        return (IoLighting.idOf(d) * 1013 + (f ? Number(f.sig) % 1000003 : 0)) % 4294967291;
    }

    /**
     * Its other parts drawn with it (a Basilisk's front and the part over it), found among its fields once in a while:
     * every entry it keeps but its round shadow, its name, its icons, its bars, its glow.
     */
    private static extraParts(o: any, now: number): RasterData[] {
        if (o.$ioParts && now - (o.$ioPartsAt || 0) < 2000) {
            return o.$ioParts;
        }
        let out: RasterData[] = [];
        for (let k of Object.keys(o)) {
            let v: any = o[k];
            if (v instanceof RasterData && v !== o._rasterData && !/shadow|name|icon|bar|glow|status|hp/i.test(k)) {
                out.push(v);
            }
        }
        o.$ioParts = out;
        o.$ioPartsAt = now;
        return out;
    }

    /**
     * The shadows of what walks: the workers, the pets and every monster (up to CREEP_SHADOWS of them; past that only
     * their round shadows), and anything else standing in the yard (strays), from their pictures as they are (all their
     * parts; made again as they move, at most every MOVING_MS), their feet their foot; the monsters' round shadows moved
     * a little away from the light. L null: all taken away, as they were.
     */
    private static walkers(L: any, S: any, off: Point, now: number, stats: any, covered: Set<any> = null): void {
        let seen: Set<any> = new Set();
        if (L && S && off) {
            let cast = (o: any, entries: RasterData[], footX: number, footY: number, alpha: number, bottomFoot: boolean = false): boolean => {
                let gx: number = footX - off.x;
                let gy: number = footY - off.y;
                let shown: any[] = [];
                // (what it shows now, as a number: no strings built for every walker every tick)
                let k: number = 7;
                for (let e of entries) {
                    if (!e || e._cleared || !e._visible || !e._data || !e._pt) {
                        continue;
                    }
                    shown.push(e);
                    k = (k * 31 + IoLighting.drawnSig(e._data) + Math.round(e._pt.x - gx) * 17 + Math.round(e._pt.y - gy) * 19) % 4294967291;
                }
                if (!shown.length) {
                    return false;
                }
                let w: any = o.$ioLit;
                if (!w) {
                    w = o.$ioLit = { "pt": new Point(), "entry": null, "key": "", "at": -1e9 };
                }
                let lk: string = IoLighting._lightKey;
                if ((!w.entry || w.entry._cleared || w.key !== k || w.lightKey !== lk) && (now - w.at >= IoLighting._movingMs || !w.entry || w.entry._cleared)) {
                    // (its parts, as pictures, from its foot)
                    let parts: any[] = [];
                    let x0: number = 1e9, y0: number = 1e9, x1: number = -1e9, y1: number = -1e9;
                    for (let e of shown) {
                        let p: any = IoLighting.pictureOf(e._data);
                        if (!p || !p.bmd || !(p.bmd.width > 0)) {
                            continue;
                        }
                        let rx: number = Math.round(e._pt.x + p.dx - gx);
                        let ry: number = Math.round(e._pt.y + p.dy - gy);
                        parts.push({ "d": p.bmd, "x": rx, "y": ry });
                        x0 = Math.min(x0, rx);
                        y0 = Math.min(y0, ry);
                        x1 = Math.max(x1, rx + p.bmd.width);
                        y1 = Math.max(y1, ry + p.bmd.height);
                    }
                    let made: any = null;
                    if (parts.length) {
                        let src: any = parts.length == 1 ? parts[0].d : IoLighting.composite(w, { "list": parts, "x": x0, "y": y0, "w": Math.ceil(x1 - x0), "h": Math.ceil(y1 - y0) });
                        let sx: number = parts.length == 1 ? parts[0].x : x0;
                        let sy: number = parts.length == 1 ? parts[0].y : y0;
                        // (something without a known foot: its foot the bottom of what it shows)
                        if (bottomFoot) {
                            let box: any = IoLighting.opaqueBox(src);
                            let lift: number = sy + box.y + box.h;
                            sy -= lift;
                            w.lift = lift;
                        } else {
                            w.lift = 0;
                        }
                        // (into its picture from before, when it fits: no new picture each time it moves)
                        made = IoLighting.castShadow(src, sx, sy, S, L, false, w.entry && !w.entry._cleared ? w.entry._data : null);
                    }
                    if (made && w.entry && !w.entry._cleared) {
                        if (w.entry._data !== made.bmd) {
                            let old: any = w.entry._data;
                            w.entry.data = as3.cast(made.bmd, IBitmapDrawable);
                            try {
                                old.dispose();
                            } catch (er) {
                            }
                        }
                    } else {
                        if (w.entry && !w.entry._cleared) {
                            let old: any = w.entry._data;
                            w.entry.clear(false);
                            try {
                                old.dispose();
                            } catch (er) {
                            }
                        }
                        w.entry = made ? new RasterData(as3.cast(made.bmd, IBitmapDrawable), w.pt, MAP.DEPTH_SHADOW, null, true) : null;
                    }
                    if (made) {
                        w.ox = made.ox;
                        w.oy = made.oy;
                    }
                    w.key = k;
                    w.lightKey = lk;
                    w.at = now;
                }
                if (w.entry) {
                    w.pt.x = gx + w.ox;
                    w.pt.y = gy + (w.lift || 0) + w.oy;
                    IoLighting.setAlpha(w.entry, alpha);
                    w.entry.visible = alpha > 0.005;
                    seen.add(o);
                    stats.walkers++;
                    if (covered) {
                        for (let e of shown) {
                            covered.add(e);
                        }
                    }
                    return true;
                }
                return false;
            };
            for (let wk of IoLighting.workersList()) {
                cast(wk, [wk._rasterData], wk.x, wk.y, L.shWk);
            }
            for (let pet of as3.values(IoLighting.petsList())) {
                cast(pet, [pet._rasterData], pet.x, pet.y, L.shWk);
                IoLighting.petBlob(pet, L, S, off, seen);
            }
            // (21 October: each once, told by a set: looked for in the list so far, 2000 monsters took millions of looks a frame)
            let creeps: any[] = [];
            let had: Set<any> = new Set();
            for (let list of [CREEPS._creeps, CREATURES._creatures]) {
                if (list) {
                    for (let id in list) {
                        let one: any = list[id];
                        if (one && !had.has(one)) {
                            had.add(one);
                            creeps.push(one);
                        }
                    }
                }
            }
            let many: boolean = creeps.length > IoLighting.CREEP_SHADOWS;
            let dx: number = Math.max(-16, Math.min(16, S.x * 12));
            let dy: number = Math.max(-10, Math.min(10, S.y * 12));
            for (let m of creeps) {
                if (covered && m._rasterData) {
                    covered.add(m._rasterData);
                }
                if (!many && m._rasterData) {
                    cast(m, [m._rasterData].concat(IoLighting.extraParts(m, now)), m.x, m.y, L.shWk);
                } else if (m.$ioLit) {
                    // (too many now: its own shadow taken away, its round one kept)
                    IoLighting.dropOwn(m);
                }
                // (its round shadow, a little away from the light, as dark as the others)
                let sd: RasterData = m._shadowData;
                let sp: Point = m._shadowPt;
                if (sd && !sd._cleared && sp) {
                    if (!m.$ioBlobPt) {
                        m.$ioBlobPt = new Point();
                        m.$ioBlobAlpha = sd._alpha;
                    }
                    if (sd._pt !== m.$ioBlobPt) {
                        sd._pt = m.$ioBlobPt;
                    }
                    m.$ioBlobPt.x = sp.x + dx;
                    m.$ioBlobPt.y = sp.y + dy;
                    sd.alpha = Math.min(1, L.shW * (many ? 1.6 : 0.9));
                    seen.add(m);
                }
            }
            // anything else standing in the yard: looked for every 400 ms (`covered` made then), followed every frame
            {
                if (covered) {
                    IoLighting._straysAt = now;
                    let found: Map<any, any> = new Map();
                    for (let e of as3.values(RasterData.s_rasterData)) {
                        // (not drawn over everything (depth int.MAX_VALUE: an effect in the air, a projectile))
                        if (!e || e._cleared || !e._visible || e._unSorted || covered.has(e) || !e._data || !e._pt || !(e._depth > 2 && e._depth < 1e8)) {
                            continue;
                        }
                        let d: any = e._data;
                        let ww: number = Number(d.width), hh: number = Number(d.height);
                        if (!(ww >= IoLighting.STRAY_MIN && hh >= IoLighting.STRAY_MIN && ww <= 700 && hh <= 700)) {
                            continue;
                        }
                        let cn: string = d.constructor ? String(d.constructor.name) : "";
                        if (/icon|alert|text|label/i.test(cn) || e.$ioOurs) {
                            continue;
                        }
                        found.set(e, IoLighting._strays.get(e) || { "$ioLit": null });
                        if (found.size >= 60) {
                            break;
                        }
                    }
                    for (let [e, o] of IoLighting._strays) {
                        if (!found.has(e)) {
                            IoLighting.unwalk(o, true);
                        }
                    }
                    IoLighting._strays = found;
                }
                for (let [e, o] of IoLighting._strays) {
                    if (e._cleared || !e._visible) {
                        continue;
                    }
                    // (its foot: where the game stands it, from its depth (its ground point's y times 1000, plus its
                    // x): resources spurting from a building stand on the building's foot, their shadows on the ground
                    // below them, not under the bottom of their picture)
                    let w0: number = Number(e._data.width) || 0;
                    let fx: number = e._pt.x + w0 / 2;
                    let fy: number = Math.floor((e._depth - fx) / 1000);
                    if (!(fy > e._pt.y - 2000 && fy < MAP._canvas.height + 500)) {
                        continue;
                    }
                    if (cast(o, [e], fx + off.x, fy + off.y, L.shWk)) {
                        stats.strays = (stats.strays | 0) + 1;
                    }
                }
            }
        } else {
            for (let [e, o] of IoLighting._strays) {
                IoLighting.unwalk(o, true);
            }
            IoLighting._strays.clear();
        }
        for (let o of IoLighting._walkers) {
            if (!seen.has(o)) {
                IoLighting.unwalk(o, !L);
            }
        }
        IoLighting._walkers = seen;
    }

    /** One's own shadow (from its picture) taken away; its round one left as it is. */
    private static dropOwn(o: any): void {
        let w: any = o.$ioLit;
        if (w && w.entry && !w.entry._cleared) {
            let old: any = w.entry._data;
            w.entry.clear(false);
            try {
                old.dispose();
            } catch (er) {
            }
        }
        if (w && w.comp) {
            w.comp.dispose();
            w.comp = null;
        }
        o.$ioLit = null;
    }

    /** One's own shadow taken away (gone, or the light off), and its round one back as it was. */
    private static unwalk(o: any, all: boolean): void {
        let w: any = o.$ioLit;
        if (w && w.entry && !w.entry._cleared) {
            let old: any = w.entry._data;
            w.entry.clear(false);
            try {
                old.dispose();
            } catch (er) {
            }
        }
        if (w && w.comp) {
            w.comp.dispose();
            w.comp = null;
        }
        o.$ioLit = null;
        let sd: RasterData = o._shadowData;
        if (sd && !sd._cleared && o._shadowPt && o.$ioBlobPt) {
            sd._pt = o._shadowPt;
            sd._alpha = o.$ioBlobAlpha === undefined ? 4278190080 : o.$ioBlobAlpha;
        }
        o.$ioBlobPt = null;
        let pb: any = o.$ioPetBlob;
        if (pb && pb.entry && !pb.entry._cleared) {
            let old: any = pb.entry._data;
            pb.entry.clear(false);
            try {
                old.dispose();
            } catch (er) {
            }
        }
        o.$ioPetBlob = null;
    }

    /**
     * A pet's round shadow under its feet, where it touches the ground (as the monsters have theirs): its size from its
     * picture's, the shadows' colour, a little away from the light; a flying pet's smaller and fainter.
     */
    private static petBlob(pet: any, L: any, S: any, off: Point, seen: Set<any>): void {
        let e: RasterData = pet._rasterData;
        let d: any = e && !e._cleared && e._visible ? e._data : null;
        if (!d || !(d.width > 0)) {
            return;
        }
        let fly: boolean = Boolean(pet._fly);
        let colour: string = IoLighting.shadowColour(L);
        let w: int = Math.max(8, Math.round(d.width * (fly ? 0.5 : 0.7))) | 0;
        let h: int = Math.max(4, Math.round(w * 0.36)) | 0;
        let b: any = pet.$ioPetBlob;
        let key: string = w + "x" + h + colour;
        if (!b || !b.entry || b.entry._cleared || b.key != key) {
            if (b && b.entry && !b.entry._cleared) {
                let old: any = b.entry._data;
                b.entry.clear(false);
                try {
                    old.dispose();
                } catch (er) {
                }
            }
            let bmd: any = new BitmapData(w, h, true, 0);
            let ctx: any = bmd.$ctx;
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(1, h / w);
            let g: any = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
            g.addColorStop(0, colour);
            g.addColorStop(0.55, colour);
            g.addColorStop(1, colour.replace("rgb(", "rgba(").replace(")", ",0)"));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            bmd.$touch();
            let pt: Point = new Point();
            b = pet.$ioPetBlob = { "key": key, "pt": pt, "entry": new RasterData(as3.cast(bmd, IBitmapDrawable), pt, MAP.DEPTH_SHADOW, null, true) };
            (b.entry as any).$ioOurs = true;
        }
        let dx: number = Math.max(-6, Math.min(6, S.x * 5));
        let dy: number = Math.max(-3, Math.min(3, S.y * 5));
        b.pt.x = Math.round(pet.x - off.x - w / 2 + dx);
        b.pt.y = Math.round(pet.y - off.y - h / 2 + dy);
        IoLighting.setAlpha(b.entry, Math.min(1, L.shWk * (fly ? 0.45 : 0.75)));
        b.entry.visible = L.shWk > 0.005;
        seen.add(pet);
    }

    /** The workers walking the yard (their pictures). */
    private static workersList(): any[] {
        let out: any[] = [];
        for (let w of as3.values(WORKERS._workers || [])) {
            let mc: any = w && w.mc ? w.mc : null;
            if (mc && mc._rasterData) {
                out.push(mc);
            }
        }
        return out;
    }

    /** The pets out in the yard. */
    private static petsList(): any[] {
        return ((IoPets as any)._walking || []) as any[];
    }

    // ---- spooky
    /** The picture's alpha, looked at once per version: {w, h, d}. */
    private static alphaOf(bmd: any): any {
        let ver: number = Number(bmd.$version || 0);
        if (bmd.$ioAlpha && bmd.$ioAlphaVer === ver) {
            return bmd.$ioAlpha;
        }
        let a: any = { "w": bmd.width | 0, "h": bmd.height | 0, "d": null };
        try {
            a.d = bmd.$ctx.getImageData(0, 0, a.w, a.h).data;
        } catch (e) {
            a.d = null;
        }
        bmd.$ioAlpha = a;
        bmd.$ioAlphaVer = ver;
        return a;
    }

    private static solid(a: any, x: int, y: int): boolean {
        return a.d != null && x >= 0 && y >= 0 && x < a.w && y < a.h && a.d[(y * a.w + x) * 4 + 3] > 60;
    }

    /** The first solid pixel along row y, from the left or from the right (-1: none). */
    private static edge(a: any, y: int, fromLeft: boolean): int {
        if (fromLeft) {
            for (let x: int = 0; x < a.w; x++) {
                if (IoLighting.solid(a, x, y)) return x;
            }
        } else {
            for (let x: int = a.w - 1; x >= 0; x--) {
                if (IoLighting.solid(a, x, y)) return x;
            }
        }
        return -1;
    }

    /** The lowest solid row (-1: none). */
    private static bottomRow(a: any): int {
        for (let y: int = a.h - 1; y >= 0; y--) {
            for (let x: int = 0; x < a.w; x += 2) {
                if (IoLighting.solid(a, x, y)) return y;
            }
        }
        return -1;
    }

    /** The opaque part of a picture (its box), looked at on a coarse grid; kept per picture and version. */
    private static opaqueBox(bmd: any): any {
        let ver: number = Number(bmd.$version || 0);
        if (bmd.$ioBox && bmd.$ioBoxVer === ver) {
            return bmd.$ioBox;
        }
        let a: any = IoLighting.alphaOf(bmd);
        let w: int = a.w, h: int = a.h;
        let x0: int = w, y0: int = h, x1: int = 0, y1: int = 0;
        for (let y: int = 0; y < h; y += 2) {
            for (let x: int = 0; x < w; x += 2) {
                if (IoLighting.solid(a, x, y)) {
                    if (x < x0) x0 = x;
                    if (x > x1) x1 = x;
                    if (y < y0) y0 = y;
                    if (y > y1) y1 = y;
                }
            }
        }
        if (x1 < x0) {
            x0 = 0;
            y0 = 0;
            x1 = w;
            y1 = h;
        }
        let box: any = { "x": x0, "y": y0, "w": Math.max(1, x1 - x0), "h": Math.max(1, y1 - y0) };
        bmd.$ioBox = box;
        bmd.$ioBoxVer = ver;
        return box;
    }

    /** A random number from a seed (the same webs every time for the same building). */
    private static rnd(seed: number): number {
        let v: number = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        return v - Math.floor(v);
    }

    /**
     * A web held at its anchors (each [x, y, its angle from the hub], in order round it): a thread to each, rings
     * sagging toward the hub between neighbours (an open side, where nothing holds it, left open), a few torn, a faint
     * film across the middle, a loose strand.
     */
    private static drawHeldWeb(g: any, hx: number, hy: number, anchors: any[], alpha: number, seed: number): void {
        let rnd = (i: number): number => IoLighting.rnd(seed * 3.7 + i * 1.31);
        let n: int = anchors.length;
        let linked = (i: int): boolean => {
            let p: any = anchors[i], q: any = anchors[(i + 1) % n];
            let d: number = q[2] - p[2];
            if (d < 0) {
                d += Math.PI * 2;
            }
            return d < Math.PI * 0.6;
        };
        // (a film, very faint, across where it is closed)
        g.lineStyle();
        g.beginFill(0xD8D8DE, 0.07);
        for (let i: int = 0; i < n; i++) {
            if (!linked(i)) {
                continue;
            }
            let p: any = anchors[i], q: any = anchors[(i + 1) % n];
            g.moveTo(hx, hy);
            g.lineTo(hx + (p[0] - hx) * 0.8, hy + (p[1] - hy) * 0.8);
            g.lineTo(hx + (q[0] - hx) * 0.8, hy + (q[1] - hy) * 0.8);
            g.lineTo(hx, hy);
        }
        g.endFill();
        // spokes
        g.lineStyle(1, 0xD4D4DA, alpha);
        for (let p of anchors) {
            g.moveTo(hx, hy);
            g.lineTo(p[0], p[1]);
        }
        // rings
        let rings: int = 5 + ((rnd(1) * 3) | 0);
        for (let k: int = 1; k <= rings; k++) {
            let f: number = (k - 0.3 + rnd(k) * 0.4) / (rings + 0.5);
            g.lineStyle(0.8, 0xD8D8DE, alpha * (0.55 + 0.45 * (1 - f)));
            for (let i: int = 0; i < n; i++) {
                if (!linked(i) || rnd(k * 31 + i) < 0.12) {
                    continue;
                }
                let p: any = anchors[i], q: any = anchors[(i + 1) % n];
                let ax: number = hx + (p[0] - hx) * f, ay: number = hy + (p[1] - hy) * f;
                let bx: number = hx + (q[0] - hx) * f, by: number = hy + (q[1] - hy) * f;
                let mx: number = (ax + bx) / 2, my: number = (ay + by) / 2;
                // (sagging: toward the hub, and down a little)
                g.moveTo(ax, ay);
                g.curveTo(mx + (hx - mx) * 0.18, my + (hy - my) * 0.18 + 1.5, bx, by);
            }
        }
        // a loose strand from the edge, hanging
        let i0: int = (rnd(77) * n) | 0;
        let p: any = anchors[i0];
        let sx: number = hx + (p[0] - hx) * 0.7, sy: number = hy + (p[1] - hy) * 0.7;
        g.lineStyle(0.8, 0xE2E2E8, alpha * 0.7);
        g.moveTo(sx, sy);
        g.curveTo(sx + 2, sy + 6, sx + (rnd(78) - 0.5) * 6, sy + 10 + rnd(79) * 8);
    }

    // ---- webs strung between neighbours
    /** Each web between two buildings: {web, pt, key}, by the pair's ids. */
    private static _spans: Map<string, any> = new Map();

    /** The webs strung between neighbours, at most this many. */
    private static readonly SPANS_MAX: int = 90;

    /**
     * Between buildings standing side by side on screen (one's right edge near the other's left, at about the same
     * height), a web strung across the gap from one to the other, behind whichever stands in front; between walls a
     * block or two apart, one in three, across the gap. Worked out again when anything moves (each one's key: where
     * both are and their pictures).
     */
    private static spans(list: any[], stats: any, now: number): void {
        let wanted: Set<string> = new Set();
        if (list) {
            list.sort((p: any, q: any): number => p.gx - q.gx);
            let made: int = 0;
            for (let i: int = 0; i < list.length && made < IoLighting.SPANS_MAX; i++) {
                let A: any = list[i];
                for (let j: int = i + 1; j < list.length && made < IoLighting.SPANS_MAX; j++) {
                    let B: any = list[j];
                    let dx: number = B.gx - A.gx;
                    if (dx > 200) {
                        break;
                    }
                    if (Math.abs(B.gy - A.gy) > 40 || dx < 14) {
                        continue;
                    }
                    // (two at most from any one; fewer webs: only some of them, the same ones as there come to be more)
                    let amount: number = Number(IoLighting._st.webs);
                    let most: int = Math.max(amount > 0 ? 1 : 0, Math.round(2 * amount)) | 0;
                    if ((A.spans | 0) >= most || (B.spans | 0) >= most) {
                        continue;
                    }
                    if (amount < 1 && IoLighting.rnd(A.id * 2.3 + B.id * 0.7 + 5) >= amount) {
                        continue;
                    }
                    let id: string = A.id + "-" + B.id;
                    let sp: any = IoLighting.spanBetween(A, B, id);
                    if (sp) {
                        wanted.add(id);
                        made++;
                        stats.spans++;
                        A.spans = (A.spans | 0) + 1;
                        B.spans = (B.spans | 0) + 1;
                    } else if (IoLighting._spans.has(id)) {
                        // (22 October: "no web fits between these two" kept too: it was dropped below at once, and the
                        // two pictures' edges scanned again every frame)
                        wanted.add(id);
                    }
                }
            }
        }
        for (let [id, sp] of IoLighting._spans) {
            if (!wanted.has(id)) {
                IoLighting.dropEntry(sp, "web");
                IoLighting._spans.delete(id);
            }
        }
    }

    /** The web between A (on the left) and B, made or kept; null when their facing edges don't make a gap to span. */
    private static spanBetween(A: any, B: any, id: string): any {
        let ka: string = IoLighting.idOf(A.bmd) + "@" + Math.round(A.top._pt.x) + "," + Math.round(A.top._pt.y);
        let kb: string = IoLighting.idOf(B.bmd) + "@" + Math.round(B.top._pt.x) + "," + Math.round(B.top._pt.y);
        let key: string = ka + "|" + kb + "|" + IoLighting._spookyKey + "|" + Number(IoLighting._st.spiders).toFixed(2);
        let sp: any = IoLighting._spans.get(id);
        if (sp && sp.key == key && sp.web && !sp.web._cleared) {
            sp.web.depth = Math.min(A.top._depth, B.top._depth) + 6.6;
            sp.web.visible = true;
            return sp;
        }
        if (sp && sp.key == key && sp.none) {
            return null;
        }
        if (sp) {
            IoLighting.dropEntry(sp, "web");
        }
        sp = { "key": key, "web": null, "none": false };
        IoLighting._spans.set(id, sp);
        let a: any = IoLighting.alphaOf(A.bmd);
        let b: any = IoLighting.alphaOf(B.bmd);
        let boxA: any = IoLighting.opaqueBox(A.bmd);
        let boxB: any = IoLighting.opaqueBox(B.bmd);
        // (three points on each facing edge: a third, a half and two thirds of the way down each)
        let pts: any[] = [];
        for (let f of [0.3, 0.45, 0.6]) {
            let y: int = Math.round(boxA.y + boxA.h * f) | 0;
            let x: int = IoLighting.edge(a, y, false);
            if (x >= 0) pts.push([A.top._pt.x + x, A.top._pt.y + y, 0]);
        }
        for (let f of [0.6, 0.45, 0.3]) {
            let y: int = Math.round(boxB.y + boxB.h * f) | 0;
            let x: int = IoLighting.edge(b, y, true);
            if (x >= 0) pts.push([B.top._pt.x + x, B.top._pt.y + y, 1]);
        }
        let left: any[] = pts.filter((p: any): boolean => p[2] == 0);
        let right: any[] = pts.filter((p: any): boolean => p[2] == 1);
        let gap: number = right.length && left.length ? Math.min(...right.map((p: any): number => p[0])) - Math.max(...left.map((p: any): number => p[0])) : -1;
        if (left.length < 2 || right.length < 2 || gap < 8 || gap > (A.wall ? 50 : 130)) {
            sp.none = true;
            return null;
        }
        let x0: number = Math.min(...pts.map((p: any): number => p[0])) - 4;
        let y0: number = Math.min(...pts.map((p: any): number => p[1])) - 4;
        let x1: number = Math.max(...pts.map((p: any): number => p[0])) + 4;
        let y1: number = Math.max(...pts.map((p: any): number => p[1])) + 4;
        let hx: number = (x0 + x1) / 2 + (IoLighting.rnd(A.id + B.id) - 0.5) * 6;
        let hy: number = (y0 + y1) / 2 + (IoLighting.rnd(A.id * 3 + B.id) - 0.5) * 6;
        let shape: Shape = new Shape();
        let anchors: any[] = left.concat(right).map((p: any): any[] => [p[0] - x0, p[1] - y0, Math.atan2(p[1] - hy, p[0] - hx)]);
        anchors = anchors.map((p: any): any[] => [p[0], p[1], p[2] < 0 ? p[2] + Math.PI * 2 : p[2]]).sort((p: any, q: any): number => p[2] - q[2]);
        IoLighting.drawHeldWeb(shape.graphics, hx - x0, hy - y0, anchors, IoLighting._st.webAlpha * (A.wall ? 0.84 : 1), A.id * 31 + B.id);
        // (a spider sitting in some, the big ones)
        if (!A.wall && IoLighting.rnd(A.id * 1.7 + B.id) < Number(IoLighting._st.spiders) / 2) {
            let s: any = shape.graphics;
            s.lineStyle(1.3, 0x120A0A, 1);
            let cx: number = hx - x0, cy: number = hy - y0;
            for (let side of [-1, 1]) {
                for (let k: int = 0; k < 4; k++) {
                    s.moveTo(cx, cy - 1 + k);
                    s.lineTo(cx + side * 4, cy - 3 + k * 1.5);
                    s.lineTo(cx + side * 7, cy + k * 1.6);
                }
            }
            s.lineStyle();
            s.beginFill(0x1A0E0E, 1);
            s.drawCircle(cx, cy + 2, 3.4);
            s.drawCircle(cx, cy - 1.5, 2);
            s.endFill();
        }
        let w: int = Math.max(2, Math.ceil(x1 - x0)) | 0;
        let h: int = Math.max(2, Math.ceil(y1 - y0)) | 0;
        let out: any = new BitmapData(w, h, true, 0);
        out.draw(as3.cast(shape, IBitmapDrawable));
        sp.pt = new Point(Math.round(x0), Math.round(y0));
        sp.web = new RasterData(as3.cast(out, IBitmapDrawable), sp.pt, Math.min(A.top._depth, B.top._depth) + 6.6);
        sp.web.$ioOurs = true;
        sp.web._ioFoot = Math.max(A.top._ioFoot || 0, B.top._ioFoot || 0);
        IoLighting.stats.made++;
        return sp;
    }

    private static _spider: BitmapData = null;

    /** A small spider on its thread (the thread from the top). */
    private static spiderPicture(): BitmapData {
        if (IoLighting._spider) {
            return IoLighting._spider;
        }
        let shape: Shape = new Shape();
        let g: any = shape.graphics;
        g.lineStyle(1, 0xE8E8F0, 0.8);
        g.moveTo(8, 0);
        g.lineTo(8, 30);
        g.lineStyle(1.3, 0x120A0A, 1);
        for (let side of [-1, 1]) {
            for (let k: int = 0; k < 4; k++) {
                let y: number = 31 + k * 1.6;
                g.moveTo(8, y);
                g.lineTo(8 + side * 4, y - 2 + k);
                g.lineTo(8 + side * 7, y + 1 + k * 1.2);
            }
        }
        g.lineStyle();
        g.beginFill(0x1A0E0E, 1);
        g.drawCircle(8, 34, 3.6);
        g.endFill();
        g.beginFill(0x1A0E0E, 1);
        g.drawCircle(8, 30.5, 2);
        g.endFill();
        g.beginFill(0xD03020, 1);
        g.drawCircle(7, 30, 0.7);
        g.drawCircle(9, 30, 0.7);
        g.endFill();
        let out: any = new BitmapData(16, 42, true, 0);
        out.draw(as3.cast(shape, IBitmapDrawable));
        IoLighting._spider = out;
        return out;
    }

    // ---------------------------------------------------------------------------------------------
    // The panel (the Admin menu's Lighting)
    // ---------------------------------------------------------------------------------------------
    private static _refresh: Function = null;

    public static Toggle(e: MouseEvent = null): void {
        SOUNDS.Play("click1");
        if (IoLighting._panel && IoLighting._panel.parent) {
            IoLighting._panel.parent.removeChild(IoLighting._panel);
            IoLighting._panel = null;
            return;
        }
        IoLighting.Show();
    }

    public static get isOpen(): boolean {
        return IoLighting._panel != null && IoLighting._panel.parent != null;
    }

    public static Show(): void {
        if (!IoLighting.allowed) {
            return;
        }
        const W: int = 440, Hh: int = 412;
        let p: Sprite = new Sprite();
        p.name = "ioLightingPanel";
        p.graphics.lineStyle(2, 0x6E4A22, 1);
        p.graphics.beginFill(0x231811, 0.95);
        p.graphics.drawRoundRect(0, 0, W, Hh, 12, 12);
        p.graphics.endFill();
        p.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
        let label = (text: string, x: number, y: number, w: number, size: int = 11, colour: uint = 0xFFD24A, parent: Sprite = p): TextField => {
            let t: TextField = new TextField();
            let tf: TextFormat = new TextFormat("Verdana", size, colour, true);
            tf.align = TextFormatAlign.LEFT;
            t.defaultTextFormat = tf;
            t.selectable = false;
            t.mouseEnabled = false;
            t.width = w;
            t.height = 18;
            t.x = x;
            t.y = y;
            t.text = text;
            parent.addChild(t);
            return t;
        };
        let button = (name: string, text: string, x: number, y: number, w: int, h: int, click: Function, parent: Sprite = p): Button_CLIP => {
            let b: Button_CLIP = new Button_CLIP();
            b.Setup(text, false, w, h);
            b.name = name;
            b.x = x;
            b.y = y;
            b.addEventListener(MouseEvent.CLICK, (ev: MouseEvent): void => {
                SOUNDS.Play("click1");
                click();
            });
            parent.addChild(b);
            return b;
        };
        label("Lighting", 12, 8, 120);
        button("ioLightingClose", "X", W - 36, 6, 26, 22, (): void => IoLighting.Toggle());
        // (back to everyone's look: the server's, the one every player sees)
        let everyoneBtn: Button_CLIP = button("ioLighting_everyone", "Everyone's look", W - 150, 6, 108, 22, (): void => IoLighting.followEveryone());
        // the modes
        let names: any = { "off": "Off", "morning": "Morning", "noon": "Noon", "evening": "Evening", "moonlight": "Moonlight", "cycle": "Day Cycle", "custom": "Custom" };
        let modeBtns: any = {};
        let x: number = 12;
        for (let m of IoLighting.MODES) {
            let bw: int = m == "moonlight" || m == "cycle" ? 66 : (m == "off" ? 34 : 56);
            modeBtns[m] = button("ioLighting_" + m, names[m], x, 32, bw, 24, (): void => {
                let ch: any = { "mode": m };
                // (Custom starts from the light as it is now)
                if (m == "custom" && IoLighting.state.mode != "custom" && IoLighting.state.mode != "off") {
                    let L: any = IoLighting.light();
                    ch.az = Math.round(L.az);
                    ch.el = Math.round(L.el);
                }
                IoLighting.set(ch);
            });
            x += bw + 3;
        }
        // the tabs: each its own page of sliders
        const TABS: string[] = ["light", "shadows", "spooky"];
        let tabNames: any = { "light": "Light", "shadows": "Shadows", "spooky": "Spooky" };
        let pages: any = {};
        let tabBtns: any = {};
        let tab: string = IoLighting._tab;
        let showTab = (t: string): void => {
            tab = IoLighting._tab = t;
            for (let k of TABS) {
                (pages[k] as Sprite).visible = k == t;
                (tabBtns[k] as any).alpha = k == t ? 1 : 0.55;
            }
        };
        x = 12;
        for (let t of TABS) {
            tabBtns[t] = button("ioLightingTab_" + t, tabNames[t], x, 64, 90, 22, (): void => showTab(t));
            x += 94;
            let pg: Sprite = new Sprite();
            pg.name = "ioLightingPage_" + t;
            pg.y = 94;
            p.addChild(pg);
            pages[t] = pg;
        }
        // a slider: its track, its knob, its title and value
        let sliders: any[] = [];
        let rows: any = { "light": 0, "shadows": 0, "spooky": 0 };
        const ROW: int = 32, TRACK: int = 240;
        let slider = (t: string, name: string, title: string, min: number, max: number, get: Function, put: Function, text: Function, trackW: int = TRACK): void => {
            let pg: Sprite = pages[t];
            let y: number = 12 + rows[t]++ * ROW;
            let txt: TextField = label("", 12, y - 9, 170, 10, 0xF4E6C8, pg);
            let track: Sprite = new Sprite();
            track.name = "ioLighting_" + name;
            track.x = 184;
            track.y = y;
            track.buttonMode = true;
            track.graphics.beginFill(0x000000, 0.01);
            track.graphics.drawRect(-10, -12, trackW + 20, 24);
            track.graphics.endFill();
            track.graphics.lineStyle(4, 0x6E4A22, 1);
            track.graphics.moveTo(0, 0);
            track.graphics.lineTo(trackW, 0);
            // (a mark where the default is, for the sliders that go both ways)
            if (min < 0 && max > 0) {
                track.graphics.lineStyle(2, 0x9A7444, 1);
                let mx: number = (0 - min) / (max - min) * trackW;
                track.graphics.moveTo(mx, -6);
                track.graphics.lineTo(mx, 6);
            }
            let knob: Shape = new Shape();
            knob.graphics.lineStyle(2, 0x3A2A18, 1);
            knob.graphics.beginFill(0xFFD24A, 1);
            knob.graphics.drawCircle(0, 0, 7);
            knob.graphics.endFill();
            track.addChild(knob);
            pg.addChild(track);
            let show = (): void => {
                let v: number = get();
                knob.x = Math.max(0, Math.min(trackW, (v - min) / (max - min) * trackW));
                txt.text = title + ": " + text(v);
            };
            let dragging: boolean = false;
            let fromMouse = (): void => {
                let xx: number = Math.max(0, Math.min(trackW, track.mouseX));
                put(min + xx / trackW * (max - min));
            };
            track.addEventListener(MouseEvent.MOUSE_DOWN, (ev: MouseEvent): void => {
                dragging = true;
                fromMouse();
                ev.stopPropagation();
            });
            let move = (ev: MouseEvent): void => {
                if (dragging) {
                    fromMouse();
                }
            };
            let up = (ev: MouseEvent): void => {
                dragging = false;
            };
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, move);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, up);
            p.addEventListener("removedFromStage", (): void => {
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, move);
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, up);
            });
            sliders.push(show);
        };
        let custom = (ch: any): void => {
            // (moving the direction or the height makes it Custom, from the light as it was)
            if (IoLighting.state.mode != "custom") {
                let L: any = IoLighting.light();
                ch = Object.assign({ "mode": "custom", "az": Math.round(L.az), "el": Math.round(L.el) }, ch);
            }
            IoLighting.set(ch);
        };
        let fmt = (d: any, v: number): string => {
            if (d.fmt == "pct") {
                return Math.round(v * 100) + "%";
            }
            if (d.fmt == "x") {
                return (Math.round(v * 100) / 100) + "x";
            }
            if (d.fmt == "px") {
                return v < 0.05 ? "sharp" : (Math.round(v * 10) / 10) + " px";
            }
            if (Math.abs(v) < 0.025) {
                return "as it is";
            }
            return (v < 0 ? d.lo : d.hi) + " " + Math.round(Math.abs(v) * 100) + "%";
        };
        let direction = (v: number): string => {
            let a: number = Math.abs(Math.round(v));
            if (a < 3) {
                return "as the art";
            }
            if (a > 177) {
                return "opposite the art";
            }
            return (v < 0 ? "morning side " : "evening side ") + a + "°" + (a > 90 ? " (behind)" : "");
        };
        let lightOf = (k: string): number => (IoLighting.state.mode == "custom" || IoLighting.state.mode == "off" ? IoLighting.state[k] : IoLighting.light()[k]);
        // ---- Light
        slider("light", "dir", "Direction", -IoLighting.AZ_MAX, IoLighting.AZ_MAX, (): number => lightOf("az"), (v: number): void => custom({ "az": Math.round(v) }), direction);
        slider("light", "height", "Height", 5, 85, (): number => lightOf("el"), (v: number): void => custom({ "el": Math.round(v) }), (v: number): string => Math.round(v) + "° (" + (v < 20 ? "long" : v > 55 ? "short" : "medium") + ")");
        // ---- Shadows: how dark first (with its Auto)
        slider("shadows", "shadow", "Opacity", 0, 1, (): number => (IoLighting.state.shadow === null ? IoLighting.light().sh : IoLighting.state.shadow), (v: number): void => IoLighting.set({ "shadow": Math.round(v * 20) / 20 }), (v: number): string => Math.round(v * 100) + "%" + (IoLighting.state.shadow === null ? " (auto)" : ""), TRACK - 54);
        button("ioLighting_shadowAuto", "Auto", 184 + TRACK - 44, 12 - 10, 44, 20, (): void => IoLighting.set({ "shadow": null }), pages["shadows"]);
        // ---- Spooky: on or off first
        let spooky: Button_CLIP = button("ioLighting_spooky", "Spooky", 12, 2, 120, 24, (): void => IoLighting.set({ "spooky": !IoLighting.state.spooky }), pages["spooky"]);
        rows["spooky"] = 1;
        // ---- every other setting, on its tab
        for (let d of IoLighting.SETTINGS) {
            slider(d.tab, d.k, d.title, d.min, d.max, (): number => IoLighting.state[d.k], (v: number): void => {
                let ch: any = {};
                ch[d.k] = Math.round(v / d.step) * d.step;
                IoLighting.set(ch);
            }, (v: number): string => fmt(d, v));
        }
        // (each tab's Reset: its sliders back as they were)
        for (let t of TABS) {
            button("ioLightingReset_" + t, "Reset", W - 80, 12 + rows[t] * ROW - 12, 64, 22, (): void => {
                let ch: any = {};
                for (let d of IoLighting.SETTINGS) {
                    if (d.tab == t) {
                        ch[d.k] = d.def;
                    }
                }
                if (t == "light") {
                    ch.az = 0;
                    ch.el = 45;
                } else if (t == "shadows") {
                    ch.shadow = null;
                }
                IoLighting.set(ch);
            }, pages[t]);
        }
        let note: TextField = label("", 12, Hh - 24, W - 24, 10, 0xC8C0B8);
        let refresh = (): void => {
            let s: any = IoLighting.state;
            for (let m of IoLighting.MODES) {
                (modeBtns[m] as any).alpha = s.mode == m ? 1 : 0.55;
            }
            spooky.Setup(s.spooky ? "Spooky: on" : "Spooky: off", false, 120, 24);
            for (let f of sliders) {
                f();
            }
            let own: boolean = IoLighting.own;
            (everyoneBtn as any).alpha = own ? 1 : 0.55;
            let what: string = own ? "Your own look (only you see it)" : (IoLighting.everyone() ? "Everyone's look" : "No look from the server: the yard as drawn");
            if (!own && s.spooky) {
                what += " · spooky: webs " + Math.round(s.webs * 100) + "%, gloom " + Math.round(s.gloom * 100) + "%";
            }
            if (s.mode == "cycle") {
                let h: number = IoLighting.centralHour();
                note.text = what + " · Day Cycle " + Math.floor(h) + ":" + String(Math.floor((h % 1) * 60)).padStart(2, "0") + " US Central";
            } else {
                note.text = what + ".";
            }
        };
        showTab(tab);
        refresh();
        IoLighting._refresh = refresh;
        p.addEventListener("removedFromStage", (): void => {
            if (IoLighting._refresh === refresh) {
                IoLighting._refresh = null;
            }
        });
        p.x = Math.round(GLOBAL._SCREENCENTER.x - W / 2);
        p.y = 64;
        GLOBAL._layerTop.addChild(p);
        IoLighting._panel = p;
    }

    /** The panel's tab last shown. */
    private static _tab: string = "light";
}
