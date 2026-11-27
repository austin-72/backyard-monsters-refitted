import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData, IBitmapDrawable, Shape } from "flash/display";
import { Event } from "flash/events";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { BYMConfig, GLOBAL, ImageCache, MAP, RasterData } from "@game";

/**
 * Inferno-only (12 October): the invite grounds move (com/monsters/subscriptions/IoTerrainPopup; art/grounds).
 *
 *  - Ashfall: its embers glow, two sets of them brightening and fading out of step
 *  - Obsidian Glass: the fire in its seams shifts, bright patches drifting across the yard
 *  - Soulfire Rift: its rivers glow brighter and dimmer, and the light drifts along them
 *
 * The ground's sheet (MAPBG) holds the ground with its light at half strength, so it looks right before anything
 * moves (and if the pictures below never come). The light itself, alone on black (grounds/<ground>_glow*.jpg), is
 * added over the ground about 12 times a second, through the yard's own drawing (RasterData, drawn added, right
 * after the ground and before any shadow): its strength for the glowing, a soft patchy mask
 * (grounds/io_ground_flow.png, seamless) sliding over it for the shifting. One 1000 x 500 picture, at the 16 places
 * the ground's sheet is laid (MAP.swapBG), so it costs the same whatever the yard's size.
 */
export class IoGroundFx extends ASObject {
    /** [the light's pictures, [period ms, phase] of each one's glowing or null, the mask's drift in px a second or null]. */
    public static readonly LOOKS: any = {
        "io_ashfall": [["grounds/io_ashfall_glowA.jpg", "grounds/io_ashfall_glowB.jpg"], [[2200, 0], [2900, 2.1]], null],
        "io_obsidian": [["grounds/io_obsidian_glow.jpg"], null, [44, 22]],
        "io_soulfire": [["grounds/io_soulfire_glow.jpg"], [[2600, 0]], [52, 26]],
        // (27 November, 72's suggestion: the outpost grounds)
        "io_sulfur": [["grounds/io_sulfur_glowA.jpg", "grounds/io_sulfur_glowB.jpg"], [[1900, 0], [2500, 1.7]], null],
        "io_magma": [["grounds/io_magma_glow.jpg"], [[3400, 0]], [30, 15]],
        "io_witchfire": [["grounds/io_witchfire_glow.jpg"], [[2300, 0]], [38, 19]],
        "io_bloodstone": [["grounds/io_bloodstone_glow.jpg"], [[1400, 0]], null],
        "io_gilded": [["grounds/io_gilded_glow.jpg"], [[2800, 0]], [46, 23]],
        // (27 November, 72's suggestion: the level grounds)
        "io_cinder": [["grounds/io_cinder_glow.jpg"], [[2600, 0]], [34, 17]],
        "io_amethyst": [["grounds/io_amethyst_glow.jpg"], [[2100, 0]], [40, 20]],
        "io_hellforge": [["grounds/io_hellforge_glow.jpg"], [[3000, 0]], [48, 24]],
    };

    public static readonly FLOW: string = "grounds/io_ground_flow.png";

    /** Between two drawings of the light (about 12 a second). */
    public static readonly STEP_MS: int = 80;

    private static _texture: string = null;
    private static _entries: any[] = [];
    private static _overlay: BitmapData = null;
    private static _layers: any[] = null;
    private static _mask: BitmapData = null;
    private static _ticker: Shape = null;
    private static _last: int = 0;
    /** Each start's number (13 October): the pictures of an earlier start, coming in late, build nothing. */
    private static _gen: int = 0;
    private static _ct: ColorTransform = new ColorTransform();
    private static _m: Matrix = new Matrix();

    public $ctor(): void {
        super.$ctor();
    }

    /** The ground just laid (MAP.swapBG): its light set moving, if it has one; any other's taken away. */
    public static start(texture: string): void {
        IoGroundFx.stop();
        let look: any = IoGroundFx.LOOKS[texture];
        if (!GLOBAL.INFERNO_ONLY || !look || !BYMConfig.instance.RENDERER_ON || !MAP.ioGroundRaster) {
            return;
        }
        IoGroundFx._texture = texture;
        let gen: int = ++IoGroundFx._gen;
        let names: any[] = (as3.as(look[0], Array)).concat(look[2] ? [IoGroundFx.FLOW] : []);
        let got: any = {};
        let left: int = names.length | 0;
        for (let n of as3.values(names)) {
            let name: string = String(n);
            ImageCache.GetImageWithCallBack(name, (key: string, bmd: BitmapData, args: any[] = null): void => {
                got[name] = bmd;
                left--;
                // (all in, and still the ground being shown)
                if (left == 0 && gen == IoGroundFx._gen && IoGroundFx._texture == texture && MAP.texture == texture) {
                    IoGroundFx.build(look, got);
                }
            });
        }
    }

    /** No light moving (another ground laid, the yard left). */
    public static stop(): void {
        IoGroundFx._gen++;
        for (let e of as3.values(IoGroundFx._entries)) {
            (e as RasterData).clear(false);
        }
        IoGroundFx._entries = [];
        if (IoGroundFx._ticker) {
            IoGroundFx._ticker.removeEventListener(Event.ENTER_FRAME, IoGroundFx.tick);
            // (and off the yard: each ground laid left an empty Shape on it)
            if (IoGroundFx._ticker.parent) {
                IoGroundFx._ticker.parent.removeChild(IoGroundFx._ticker);
            }
            IoGroundFx._ticker = null;
        }
        if (IoGroundFx._overlay) {
            IoGroundFx._overlay.dispose();
            IoGroundFx._overlay = null;
        }
        if (IoGroundFx._mask) {
            IoGroundFx._mask.dispose();
            IoGroundFx._mask = null;
        }
        IoGroundFx._layers = null;
        IoGroundFx._texture = null;
    }

    /** Whether a ground's light is moving now (the tests). */
    public static get running(): boolean {
        return IoGroundFx._entries.length > 0;
    }

    private static build(look: any, got: any): void {
        let ground: RasterData = MAP.ioGroundRaster;
        if (!ground || ground._cleared || !ground._pt) {
            return;
        }
        let layers: any[] = [];
        for (let n of as3.values(look[0])) {
            let bmd: BitmapData = as3.as(got[String(n)], BitmapData);
            if (!bmd) {
                return;
            }
            layers.push(bmd);
        }
        IoGroundFx._layers = layers;
        let w: int = (layers[0] as BitmapData).width | 0;
        let h: int = (layers[0] as BitmapData).height | 0;
        IoGroundFx._overlay = new BitmapData(w, h, true, 0);
        if (look[2]) {
            // the mask two by two, so a window of it can slide anywhere and wrap round
            let flow: BitmapData = as3.as(got[IoGroundFx.FLOW], BitmapData);
            if (!flow) {
                return;
            }
            IoGroundFx._mask = new BitmapData(flow.width * 2, flow.height * 2, true, 0);
            for (let i: int = 0; i < 4; i++) {
                IoGroundFx._mask.copyPixels(flow, flow.rect, new Point((i % 2) * flow.width, ((i / 2) | 0) * flow.height));
            }
        }
        // the light at the ground's 16 places (MAP.swapBG: 4 x 4 of the 1000 x 500 sheet), drawn added just after the ground
        let at: int = RasterData.s_unsortedData.indexOf(ground) | 0;
        for (let i: int = 0; i < 4; i++) {
            for (let j: int = 0; j < 4; j++) {
                let e: RasterData = new RasterData(as3.cast(IoGroundFx._overlay, IBitmapDrawable), new Point(ground._pt.x + i * 1000, ground._pt.y + j * 500), 0, "add", true);
                IoGroundFx._entries.push(e);
            }
        }
        if (at >= 0) {
            let mine: any[] = RasterData.s_unsortedData.splice(RasterData.s_unsortedData.length - IoGroundFx._entries.length, IoGroundFx._entries.length);
            for (let k: int = 0; k < mine.length; k++) {
                RasterData.s_unsortedData.splice(at + 1 + k, 0, mine[k]);
            }
        }
        IoGroundFx._last = 0;
        IoGroundFx.draw(getTimer());
        IoGroundFx._ticker = new Shape();
        IoGroundFx._ticker.addEventListener(Event.ENTER_FRAME, IoGroundFx.tick);
        // (a listener on a Shape off the display list still runs every frame, as in Flash)
        GLOBAL._layerMap.addChild(IoGroundFx._ticker);
    }

    private static tick(e: Event = null): void {
        let first: RasterData = IoGroundFx._entries.length ? as3.as(IoGroundFx._entries[0], RasterData) : null;
        // (the yard gone: its drawing cleared with it)
        if (!first || first._cleared || !IoGroundFx._overlay || MAP.texture != IoGroundFx._texture) {
            IoGroundFx.stop();
            return;
        }
        let now: int = getTimer();
        if (now - IoGroundFx._last < IoGroundFx.STEP_MS) {
            return;
        }
        IoGroundFx.draw(now);
    }

    /** The light at time `now` (ms) into the one picture all 16 places show. */
    private static draw(now: int): void {
        IoGroundFx._last = now;
        let look: any = IoGroundFx.LOOKS[IoGroundFx._texture];
        let o: BitmapData = IoGroundFx._overlay;
        let pulse: any[] = look[1] ? as3.as(look[1], Array) : null;
        o.fillRect(o.rect, 0);
        for (let i: int = 0; i < IoGroundFx._layers.length; i++) {
            let p: number = 1;
            if (pulse && pulse[i]) {
                // between a little and all of it (the sheet already has half the light)
                p = 0.08 + 0.92 * (0.5 + 0.5 * Math.sin(2 * Math.PI * now / Number(pulse[i][0]) + Number(pulse[i][1])));
            }
            IoGroundFx._ct.alphaMultiplier = p;
            o.draw(as3.cast(IoGroundFx._layers[i], IBitmapDrawable), null, IoGroundFx._ct, i == 0 ? null : "add");
        }
        let drift: any[] = look[2] ? as3.as(look[2], Array) : null;
        if (drift && IoGroundFx._mask) {
            // the mask at twice its size (it is soft), sliding; only the light under its bright patches stays
            let mw: number = IoGroundFx._mask.width;
            let mh: number = IoGroundFx._mask.height;
            let sx: number = (now / 1000 * Number(drift[0])) % mw;
            let sy: number = (now / 1000 * Number(drift[1])) % mh;
            IoGroundFx._m.a = IoGroundFx._m.d = 2;
            IoGroundFx._m.tx = -sx;
            IoGroundFx._m.ty = -sy;
            o.draw(as3.cast(IoGroundFx._mask, IBitmapDrawable), IoGroundFx._m, null, "alpha", null, true);
        }
    }
}
