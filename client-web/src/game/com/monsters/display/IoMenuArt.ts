import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, BlendMode, Shape, Sprite } from "flash/display";
import { Event } from "flash/events";
import { ColorTransform, Point, Rectangle } from "flash/geom";
import { GLOBAL, ImageCache } from "@game";

/**
 * Inferno-only: a building drawn live from its yard art (its imageData: shadow, top and anim strips), for the
 * build menu (BUILDINGBUTTON) and the building window (BUILDINGOPTIONSPOPUP). Used where the Inferno has art
 * of its own and the button picture is the overworld's, and for every building that moves (the user's, 29
 * September):
 *  - a tower that turns (its anim strip is its turret's facings) turns to follow the mouse;
 *  - a building that animates plays its strips in a loop, as in the yard; the Quake Tower drops its hammer
 *    once, then waits 4 seconds;
 *  - one scale for everything, so buildings keep their sizes relative to each other (the Cinder Coil and
 *    Obsidian Mortar no longer fill the button), made smaller only where one would not fit.
 * `silhouette` draws it as the grey shape the menu shows for a building not yet unlocked.
 */
export class IoMenuArt extends Sprite {
    static {
        as3.fields(this, { _id: 0, _art: null, _base: null, _box: null, _silhouette: false, _pending: 0, _images: null, _holder: null, _strips: null, _frame: 0, _wait: 0 });
    }

    /** The towers whose anim strip is their facings (BTOWER.Rotate: grid angle to frame). */
    public static readonly TURNING: any = { 20: 1, 21: 1, 23: 1, 25: 1, 115: 1, 118: 1, 130: 1, 132: 1, 144: 1, 145: 1 };

    public static readonly QUAKE: int = 129;

    /** Buildings that have Inferno yard art but only the overworld's button and window pictures. */
    public static readonly OVERWORLD_PICTURES: any = { 5: 1, 9: 1, 10: 1, 11: 1, 12: 1, 16: 1, 51: 1 };

    /** The menu's scale for every building (the yard draws them at 1). */
    public static readonly SCALE: number = 0.72;

    /** Quake Tower: the pause after each drop (stage frames, 40 a second). */
    private static readonly QUAKE_WAIT: int = 160;

    private static readonly LAYERS: any[] = ["shadow", "top", "anim", "anim2", "anim3"];
    private _id: int;
    private _art: any;
    private _base: string;
    private _box: Rectangle;
    private _silhouette: boolean;
    private _pending: int;
    private _images: any;
    private _holder: Sprite;
    /** name -> {bmd (the strip), frame (BitmapData drawn into), rect, frames, tick} */
    private _strips: any;
    private _frame: int;
    private _wait: int;

    /**
     * @param props  the building's props
     * @param level  the level to draw (its art tier)
     * @param box    where it goes (the building is centred in it, and made smaller if it would not fit)
     */
    public $ctor(props?: any, level?: int, box?: Rectangle, silhouette: boolean = false): void {
        this._images = {};
        this._strips = {};
        super.$ctor();
        this.mouseEnabled = false;
        this.mouseChildren = false;
        this._id = props.id | 0;
        this._art = IoMenuArt.tierOf(props, level);
        this._base = String(props.imageData.baseurl);
        this._box = box;
        this._silhouette = silhouette;
        this._holder = as3.as(this.addChild(new Sprite()), Sprite);
        let mask: Shape = as3.as(this.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRect(box.x, box.y, box.width, box.height);
        mask.graphics.endFill();
        this._holder.mask = mask;
        let name: string = null;
        for (const $value of as3.values(IoMenuArt.LAYERS)) {
            name = as3.str($value);
            if (this._art && this._art[name]) {
                ++this._pending;
            }
        }
        for (const $value of as3.values(IoMenuArt.LAYERS)) {
            name = as3.str($value);
            if (this._art && this._art[name]) {
                ImageCache.GetImageWithCallBack(this._base + this._art[name][0], this.loaded(name));
            }
        }
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.gone));
    }

    /** Whether this building is drawn live in the Inferno menu (else the button picture is used). */
    public static wanted(props: any): boolean {
        if (!GLOBAL.INFERNO_ONLY || !props || !props.imageData) {
            return false;
        }
        let art: any = IoMenuArt.tierOf(props, 1);
        let base: string = String(props.imageData.baseurl || "");
        if (!art || base.indexOf("buildings/i") != 0 || !(art.top || art.anim)) {
            return false;
        }
        let moves: boolean = Boolean(art.anim || art.anim2 || art.anim3);
        return Boolean(moves || IoMenuArt.OVERWORLD_PICTURES[props.id | 0] || !props.buildingbuttons || props.buildingbuttons.length == 0);
    }

    /** The imageData tier a building of this level is drawn with (the highest key at or under it). */
    public static tierOf(props: any, level: int): any {
        let best: int = 0;
        let key: string = null;
        for (key in props.imageData) {
            let n: number = Number(key);
            if (!isNaN(n) && n <= Math.max(1, level) && n > best) {
                best = n | 0;
            }
        }
        return best ? props.imageData[best] : null;
    }

    public get turns(): boolean {
        return Boolean(IoMenuArt.TURNING[this._id]);
    }

    public get animates(): boolean {
        for (let n in this._strips) {
            if (this._strips[n].frames > 1) {
                return true;
            }
        }
        return false;
    }

    /** The anim strip's frame on screen now (for the tests). */
    public get frame(): int {
        return this._strips.anim ? this._strips.anim.tick | 0 : -1;
    }

    public get ready(): boolean {
        return this._pending == 0 && this._holder.numChildren > 0;
    }

    private loaded(name: string): Function {
        return (key: string, bmd: BitmapData, ...rest: any[]): void => {
            if (this._images[name]) {
                return;
            }
            this._images[name] = bmd;
            if (--this._pending == 0) {
                this.build();
            }
        };
    }

    private build(): void {
        let bounds: Rectangle = null;
        let name: string = null;
        let spec: any[] = null;
        let r: Rectangle = null;
        for (const $value of as3.values(IoMenuArt.LAYERS)) {
            name = as3.str($value);
            spec = as3.cast(this._art[name], Array);
            if (!spec || !this._images[name]) {
                continue;
            }
            if (name == "shadow") {
                continue;
            }
            if (spec[1] instanceof Rectangle) {
                r = as3.cast(spec[1], Rectangle).clone();
            } else {
                r = new Rectangle(spec[1].x, spec[1].y, as3.cast(this._images[name], BitmapData).width, as3.cast(this._images[name], BitmapData).height);
            }
            bounds = bounds ? bounds.union(r) : r;
        }
        if (!bounds) {
            return;
        }
        let scale: number = Math.min(IoMenuArt.SCALE, (this._box.width - 8) / bounds.width, (this._box.height - 6) / bounds.height);
        this._holder.scaleX = this._holder.scaleY = scale;
        this._holder.x = this._box.x + this._box.width / 2 - (bounds.x + bounds.width / 2) * scale;
        this._holder.y = this._box.y + this._box.height / 2 - (bounds.y + bounds.height / 2) * scale;
        for (const $value of as3.values(IoMenuArt.LAYERS)) {
            name = as3.str($value);
            spec = as3.cast(this._art[name], Array);
            let bmd: BitmapData = as3.cast(this._images[name], BitmapData);
            if (!spec || !bmd) {
                continue;
            }
            let shown: Bitmap = null;
            if (spec[1] instanceof Rectangle) {
                r = as3.cast(spec[1], Rectangle);
                let frames: int = Math.max(1, spec[2] | 0) | 0;
                let cell: BitmapData = new BitmapData(Math.max(1, r.width | 0), Math.max(1, r.height | 0), true, 0);
                this._strips[name] = { "bmd": bmd, "frame": cell, "rect": new Rectangle(0, 0, r.width | 0, r.height | 0), "frames": frames, "tick": 0 };
                this.draw(name);
                shown = new Bitmap(cell);
                shown.x = r.x;
                shown.y = r.y;
            } else {
                shown = new Bitmap(bmd);
                shown.x = Number(spec[1].x);
                shown.y = Number(spec[1].y);
            }
            shown.smoothing = true;
            if (name == "shadow") {
                shown.blendMode = BlendMode.MULTIPLY;
            } else if (this._silhouette) {
                shown.transform.colorTransform = new ColorTransform(0, 0, 0, 1, 0x77, 0x77, 0x77, 0);
            }
            this._holder.addChild(shown);
        }
        if (this.turns || this.animates) {
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        }
        if (this.turns) {
            this.face();
        }
    }

    private draw(name: string): void {
        let s: any = this._strips[name];
        s.rect.x = s.rect.width * s.tick;
        as3.cast(s.frame, BitmapData).fillRect(as3.cast(s.frame, BitmapData).rect, 0);
        as3.cast(s.frame, BitmapData).copyPixels(as3.cast(s.bmd, BitmapData), as3.cast(s.rect, Rectangle), new Point(0, 0));
    }

    /** Turns the turret to face the mouse: the angle in yard (grid) terms, as BTOWER.Rotate works it out. */
    private face(): void {
        let s: any = this._strips.anim;
        if (!s || !this.stage) {
            return;
        }
        let at: Point = this._holder.localToGlobal(new Point(0, 0));
        let dx: number = this.stage.mouseX - at.x;
        let dy: number = this.stage.mouseY - at.y;
        let gx: number = dx * 0.5 + dy;
        let gy: number = dy - dx * 0.5;
        let deg: number = Math.atan2(gy, gx) * 180 / Math.PI;
        if (deg < 0) {
            deg += 360;
        }
        let f: int = (((deg * s.frames / 360) | 0) % s.frames) | 0;
        if (f != s.tick) {
            s.tick = f;
            this.draw("anim");
        }
    }

    private tick(e: Event = null): void {
        ++this._frame;
        if (this.turns) {
            this.face();
            return;
        }
        let name: string = null;
        let s: any = null;
        if (this._id == IoMenuArt.QUAKE) {
            s = this._strips.anim;
            if (!s) {
                return;
            }
            if (this._wait > 0) {
                --this._wait;
                return;
            }
            // the drop: a frame every 2 stage frames, the last four (the hammer landing) every frame
            if (s.tick >= s.frames - 4 || this._frame % 2 == 0) {
                if (++s.tick >= s.frames) {
                    s.tick = 0;
                    this._wait = IoMenuArt.QUAKE_WAIT;
                }
                this.draw("anim");
            }
            return;
        }
        if (this._frame % 3 != 0) {
            return;
        }
        for (name in this._strips) {
            s = this._strips[name];
            if (s.frames > 1) {
                s.tick = (s.tick + 1) % s.frames;
                this.draw(name);
            }
        }
    }

    private gone(e: Event = null): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.gone));
    }
}
