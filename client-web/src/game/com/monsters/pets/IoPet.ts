import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { BYMConfig, CREATURES, CreepSkinManager, GLOBAL, GRID, IoIceCreep, IoPets, MAP, RasterData, SPRITES } from "@game";

/**
 * Inferno-only: one pet (IoPets), a copy of a monster at 60% of its size wandering the yard: it walks to a spot nearby
 * that nothing stands on (in a straight line clear of buildings), stops a while, and goes on. Just for looks:
 * nothing targets it, it targets nothing, and it isn't saved where it is.
 *
 * It is drawn from the monster's own sprite sheet (SPRITES, as a creep draws itself) at full size on a canvas
 * of the monster's frame, then shrunk to 60% on the one shown. Like a worker, it is a sprite on the map's
 * building layer with a RasterData for the renderer.
 */
export class IoPet extends Sprite {
    static {
        as3.fields(this, { petId: 0, monster: null, gx: NaN, gy: NaN, _tx: NaN, _ty: NaN, _walking: false, _rest: 0, _rotation: 90, _frame: 0, _fly: false, _ice: null, _full: null, _small: null, _feetX: NaN, _feetY: NaN, _bitmap: null, _rasterData: null, _rasterPt: null, _lastKey: -2, _scaler: null, _name: "", _nameBmd: null, _nameRaster: null, _namePt: null, _nameField: null });
    }

    public static readonly SCALE: number = 0.6;

    /** Yard units a step while walking. */
    private static readonly SPEED: number = 0.55;

    /** How far it looks for its next spot. */
    private static readonly ROAM: int = 220;

    /** The new Inferno monsters with a standing frame of their own ("idle": SPRITES' row 0). */
    private static readonly CREEPS_STILL: any = { "IC12": true, "IC14": true, "IC15": true, "IC20": true };
    public petId: int;
    public monster: string;
    /** Where it is in the yard (the yard's own units; x and y are the map's). */
    public gx: number;
    public gy: number;
    private _tx: number;
    private _ty: number;
    private _walking: boolean;
    private _rest: int;
    private _rotation: number;
    private _frame: int;
    private _fly: boolean;
    private _ice: any[];
    private _full: BitmapData;
    private _small: BitmapData;
    private _feetX: number;
    private _feetY: number;
    private _bitmap: Bitmap;
    private _rasterData: RasterData;
    private _rasterPt: Point;
    private _lastKey: int;
    private _scaler: Matrix;
    /** Its name over it (none: no label). */
    private _name: string;
    private _nameBmd: BitmapData;
    private _nameRaster: RasterData;
    private _namePt: Point;
    private _nameField: TextField;

    public $ctor(id?: int, monster?: string, at?: Point, name: string = ""): void {
        super.$ctor();
        this.petId = id;
        this.monster = monster;
        this.name = "ioPet" + id;
        this.mouseEnabled = false;
        this.mouseChildren = false;
        this.gx = at.x;
        this.gy = at.y;
        this._tx = at.x;
        this._ty = at.y;
        this._rest = (20 + ((Math.random() * 120) | 0)) | 0;
        this._rotation = Math.random() * 360;
        this._frame = (Math.random() * 64) | 0;
        let movement: string = as3.as(CREATURES.GetProperty(monster, "movement", 0, true), String);
        this._fly = movement == "fly" || movement == "fly_low";
        this._ice = as3.as(IoIceCreep.SHEETS[monster], Array);
        let w: int = 52;
        let h: int = 50;
        this._feetX = 26;
        this._feetY = 36;
        if (this._ice) {
            w = this._ice[0] | 0;
            h = this._ice[1] | 0;
            this._feetX = Number(this._ice[2]);
            this._feetY = Number(this._ice[3]);
            SPRITES.SetupSprite(monster);
        } else {
            if (monster == "IC20") {
                // (the Emberghoul's sheet is wider than a creep's usual canvas: Emberghoul.useOwnCanvas)
                w = 66;
                h = 45;
                this._feetX = 33;
                this._feetY = 38;
            }
            CreepSkinManager.instance.SetupSkins(monster);
        }
        this._full = new BitmapData(w, h, true, 0);
        this._small = new BitmapData(Math.ceil(w * IoPet.SCALE), Math.ceil(h * IoPet.SCALE), true, 0);
        this._scaler = new Matrix(IoPet.SCALE, 0, 0, IoPet.SCALE, 0, 0);
        this._bitmap = new Bitmap(this._small);
        this._bitmap.x = -this._feetX * IoPet.SCALE;
        this._bitmap.y = -this._feetY * IoPet.SCALE - (this._fly ? 14 : 0);
        this._rasterPt = new Point();
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._small, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        } else {
            this.addChild(this._bitmap);
        }
        this.setName(name);
        this.place();
        this.draw(true);
    }

    /** Its name, shown small over it (an empty one: none). */
    public setName(name: string): void {
        name = name ? name : "";
        if (name == this._name && (this._nameBmd || !name)) {
            return;
        }
        this._name = name;
        this.clearName();
        if (!name) {
            return;
        }
        let tf: TextField = new TextField();
        let format: TextFormat = new TextFormat("Verdana", 10, 0xFFFFFF, true);
        tf.defaultTextFormat = format;
        tf.autoSize = TextFieldAutoSize.LEFT;
        tf.text = name;
        let w: int = (Math.ceil(tf.textWidth) + 8) | 0;
        let h: int = (Math.ceil(tf.textHeight) + 6) | 0;
        if (BYMConfig.instance.RENDERER_ON) {
            // a dark outline (the text drawn round it in black), then the name in white
            this._nameBmd = new BitmapData(w, h, true, 0);
            let black: TextField = new TextField();
            black.defaultTextFormat = new TextFormat("Verdana", 10, 0x1A0A04, true);
            black.autoSize = TextFieldAutoSize.LEFT;
            black.text = name;
            for (let ox: int = -1; ox <= 1; ox++) {
                for (let oy: int = -1; oy <= 1; oy++) {
                    if (ox || oy) {
                        this._nameBmd.draw(as3.cast(black, IBitmapDrawable), new Matrix(1, 0, 0, 1, 2 + ox, 1 + oy));
                    }
                }
            }
            this._nameBmd.draw(as3.cast(tf, IBitmapDrawable), new Matrix(1, 0, 0, 1, 2, 1));
            this._namePt = new Point();
            this._nameRaster = new RasterData(as3.cast(this._nameBmd, IBitmapDrawable), this._namePt, int.MAX_VALUE);
        } else {
            tf.filters = [new GlowFilter(0x1A0A04, 1, 3, 3, 6, 1)];
            tf.selectable = false;
            tf.mouseEnabled = false;
            this._nameField = tf;
            this.addChild(tf);
        }
        this.place();
    }

    private clearName(): void {
        if (this._nameRaster) {
            this._nameRaster.clear();
            this._nameRaster = null;
        }
        if (this._nameBmd) {
            this._nameBmd.dispose();
            this._nameBmd = null;
        }
        if (this._nameField && this._nameField.parent) {
            this._nameField.parent.removeChild(this._nameField);
        }
        this._nameField = null;
    }

    public get petName(): string {
        return this._name;
    }

    /** One game step: walk on, or rest, or pick the next spot. */
    public tick(): void {
        if (this._walking) {
            let dx: number = this._tx - this.gx;
            let dy: number = this._ty - this.gy;
            let d: number = Math.sqrt(dx * dx + dy * dy);
            if (d <= IoPet.SPEED) {
                this.gx = this._tx;
                this.gy = this._ty;
                this._walking = false;
                this._rest = (60 + ((Math.random() * 240) | 0)) | 0;
            } else {
                this.gx += dx / d * IoPet.SPEED;
                this.gy += dy / d * IoPet.SPEED;
                // its facing on screen, as a creep's (0 facing right, turning clockwise)
                let from: Point = GRID.ToISO(this.gx - dx / d * 10, this.gy - dy / d * 10, 0);
                let to: Point = GRID.ToISO(this.gx, this.gy, 0);
                let r: number = Math.atan2(to.y - from.y, to.x - from.x) * 57.2957795;
                this._rotation = r < 0 ? r + 360 : r;
            }
            ++this._frame;
        } else if (--this._rest <= 0 || this._frame % 40 == 0 && !IoPets.free(this.gx, this.gy)) {
            // (and at once when something now stands where it rests: a wart that grew there, a building placed)
            this.pickSpot();
        }
        if (!this._walking) {
            ++this._frame;
        }
        this.place();
        this.draw(false);
    }

    /** The next spot: somewhere near, in the yard, reached in a straight line nothing stands in. */
    private pickSpot(): void {
        for (let tries: int = 0; tries < 12; tries++) {
            let a: number = Math.random() * Math.PI * 2;
            let dist: number = 40 + Math.random() * IoPet.ROAM;
            let x: number = this.gx + Math.cos(a) * dist;
            let y: number = this.gy + Math.sin(a) * dist;
            if (IoPets.clearLine(this.gx, this.gy, x, y)) {
                this._tx = x;
                this._ty = y;
                this._walking = true;
                return;
            }
        }
        this._rest = (40 + ((Math.random() * 80) | 0)) | 0;
    }

    private place(): void {
        let p: Point = GRID.ToISO(this.gx, this.gy, 0);
        this.x = p.x;
        this.y = p.y;
        if (this._rasterData) {
            let offset: Point = MAP.instance.offset;
            this._rasterPt.x = this.x + this._bitmap.x - offset.x;
            this._rasterPt.y = this.y + this._bitmap.y - offset.y;
            this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y - offset.y) * 1000 + this.x - offset.x);
            if (this._nameRaster) {
                // over its head, centred
                this._namePt.x = (this.x - this._nameBmd.width / 2 - offset.x) | 0;
                this._namePt.y = (this.y + this._bitmap.y - this._nameBmd.height - 1 - offset.y) | 0;
                this._nameRaster.depth = this._rasterData.depth + 1;
            }
        } else if (this._nameField) {
            this._nameField.x = -this._nameField.width / 2;
            this._nameField.y = this._bitmap.y - this._nameField.height;
        }
    }

    /** Its frame now: the walk while it walks, standing while it rests (redrawn only when it changes). */
    private draw(force: boolean): void {
        if (!GLOBAL._render) {
            return;
        }
        let column: int = (((this._rotation / 12) | 0) % 30) | 0;
        let step: int = this._walking || this._fly ? (this._frame / 8) | 0 : 0;
        let key: int = (column * 1000 + step % 1000) | 0;
        if (!force && key == this._lastKey) {
            return;
        }
        let sheet: any = SPRITES.GetSpriteDescriptor(this.monster);
        if (!sheet || !sheet.image) {
            return;
        }
        this._full.fillRect(this._full.rect, 0);
        if (this._ice) {
            let walkRows: int = this._ice[4] | 0;
            SPRITES.GetFrameById(this._full, this.monster, column, (this._walking || this._fly ? step % walkRows + 1 : 0) | 0);
        } else {
            let action: string = !this._walking && !this._fly && IoPet.CREEPS_STILL[this.monster] ? "idle" : "walking";
            // (the frame number drives the walk; -1: always drawn, not only when the facing changes)
            if (CreepSkinManager.instance.GetSprite(this._full, this.monster, action, this._rotation | 0, this._walking || this._fly ? this._frame : 0, -1) < 0) {
                return;
            }
        }
        this._lastKey = key;
        this._small.fillRect(this._small.rect, 0);
        this._small.draw(as3.cast(this._full, IBitmapDrawable), this._scaler, null, null, null, true);
    }

    public clear(): void {
        this.clearName();
        if (this._rasterData) {
            this._rasterData.clear();
            this._rasterData = null;
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
        if (this._full) {
            this._full.dispose();
        }
        if (this._small) {
            this._small.dispose();
        }
        this._full = null;
        this._small = null;
    }
}
