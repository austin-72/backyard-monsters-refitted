import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { BYMConfig, CREATURES, CreepSkinManager, GLOBAL, GRID, IoIceCreep, IoPets, IoYardFx, KEYS, MAP, RasterData, SOUNDS, SPRITES } from "@game";

/**
 * Inferno-only: one pet (IoPets), a copy of a monster at 60% of its size wandering the yard: it walks to a spot nearby
 * that nothing stands on (in a straight line clear of buildings), stops a while, and goes on. Just for looks:
 * nothing targets it, it targets nothing, and it isn't saved where it is.
 *
 * It is drawn from the monster's own sprite sheet (SPRITES, as a creep draws itself) at full size on a canvas
 * of the monster's frame, then shrunk to 60% on the one shown. Like a worker, it is a sprite on the map's
 * building layer with a RasterData for the renderer.
 *
 * Played with (10 October; the menu when it is clicked in the player's own yard: IoPets.menu): it follows the
 * pointer a while, fetches a bone, does a trick, is petted (hearts), has the zoomies or a nap. A pet fed Magma
 * (pets/grow) is full size for good (`big`: drawn at 100%).
 *
 * (22 October, the Store's Extras: IoShop) A Golden Coat: drawn in gold (ioGild), glinting now and then; a Name Tag:
 * its name on a tag of that colour.
 */
export class IoPet extends Sprite {
    static {
        as3.fields(this, { petId: 0, monster: null, gx: NaN, gy: NaN, _tx: NaN, _ty: NaN, _walking: false, _rest: 0, _rotation: 90, _frame: 0, _fly: false, _ice: null, _ioFitted: false, _full: null, _small: null, _feetX: NaN, _feetY: NaN, _bitmap: null, _rasterData: null, _rasterPt: null, _lastKey: -2, _scaler: null, _name: "", _nameBmd: null, _nameRaster: null, _namePt: null, _nameField: null, big: false, _scale: 0.6, _mode: "", _modeT: 0, _speedMul: 1, _hop: 0, _hopT: 0, _spin: 0, _homeX: NaN, _homeY: NaN, _bone: null, _boneFlight: 0, _boneFrom: null, _boneTo: null, _zoomLeft: 0, _fxT: 0, gold: false, tag: "", _nameCard: null });
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
    /** (22 October) Its picture made as big as its sheet's frames need (once the sheet is in). */
    private _ioFitted: boolean;
    /** Its name over it (none: no label). */
    private _name: string;
    private _nameBmd: BitmapData;
    private _nameRaster: RasterData;
    private _namePt: Point;
    private _nameField: TextField;
    /** (22 October) A Name Tag drawn without the renderer. */
    private _nameCard: Sprite;
    /** Fed Magma: full size (pets/grow). */
    public big: boolean;
    private _scale: number;
    /** What it is doing for the player: "" (wandering), follow, fetch, fetchBack, trick, pat, zoom, nap. */
    private _mode: string;
    /** Steps left in the mode (follow, trick, pat, nap). */
    private _modeT: int;
    private _speedMul: number;
    /** How high it is off the ground (a hop), in pixels, and the hop's step. */
    private _hop: number;
    private _hopT: int;
    /** Degrees a step it turns (a trick's spin). */
    private _spin: number;
    private _homeX: number;
    private _homeY: number;
    /** The fetched bone (IoYardFx), its flight (steps left), from and to (the yard's units). */
    private _bone: any;
    private _boneFlight: int;
    private _boneFrom: Point;
    private _boneTo: Point;
    private _zoomLeft: int;
    private _fxT: int;
    /** (22 October) A Golden Coat. */
    public gold: boolean;
    /** (22 October) A Name Tag's colour ("rrggbb"), or "". */
    public tag: string;

    public $ctor(id?: int, monster?: string, at?: Point, name: string = "", big: boolean = false, gold: boolean = false, tag: string = ""): void {
        super.$ctor();
        this.big = big;
        this.gold = gold;
        this.tag = tag ? tag : "";
        this._scale = big ? 1 : IoPet.SCALE;
        this._speedMul = 1;
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
        this._small = new BitmapData(Math.ceil(w * this._scale), Math.ceil(h * this._scale), true, 0);
        this._scaler = new Matrix(this._scale, 0, 0, this._scale, 0, 0);
        this._bitmap = new Bitmap(this._small);
        this._bitmap.x = -this._feetX * this._scale;
        this._bitmap.y = -this._feetY * this._scale - (this._fly ? 14 : 0);
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

    /** (22 October) Its Golden Coat and Name Tag's colour (IoPets.sync): drawn again when they change. */
    public setLook(gold: boolean, tag: string): void {
        tag = tag ? tag : "";
        if (gold != this.gold) {
            this.gold = gold;
            this._lastKey = -1;
        }
        if (tag != this.tag) {
            this.tag = tag;
            // (the name drawn again, on its tag)
            let n: string = this._name;
            this._name = "";
            this.clearName();
            this.setName(n);
        }
    }

    /** Its name, shown small over it (an empty one: none); on a tag of its Name Tag's colour when it has one. */
    public setName(name: string): void {
        name = name ? name : "";
        if (name == this._name && (this._nameBmd || this._nameField || this._nameCard || !name)) {
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
        if (this.tag) {
            // (22 October: a Name Tag: the name on a tag of its colour, a little ring at its left, the text dark or light
            // to stand out on it)
            let col: uint = parseInt(this.tag, 16) >>> 0;
            let lum: number = 0.3 * ((col >> 16) & 255) + 0.59 * ((col >> 8) & 255) + 0.11 * (col & 255);
            let ink: uint = lum > 150 ? 0x2A1A08 : 0xFFFFFF;
            let tagTf: TextField = new TextField();
            tagTf.defaultTextFormat = new TextFormat("Verdana", 10, ink, true);
            tagTf.autoSize = TextFieldAutoSize.LEFT;
            tagTf.text = name;
            let tw: int = (Math.ceil(tagTf.textWidth) + 20) | 0;
            let th: int = (Math.ceil(tagTf.textHeight) + 7) | 0;
            let card: Sprite = new Sprite();
            card.graphics.lineStyle(1, 0x1A0A04, 0.9);
            card.graphics.beginFill(col, 1);
            card.graphics.drawRoundRect(0.5, 0.5, tw - 1, th - 1, 8, 8);
            card.graphics.endFill();
            card.graphics.lineStyle(1, 0x1A0A04, 0.8);
            card.graphics.beginFill(0xF4ECDA, 1);
            card.graphics.drawCircle(6, th / 2, 2.2);
            card.graphics.endFill();
            tagTf.x = 11;
            tagTf.y = 1;
            card.addChild(tagTf);
            if (BYMConfig.instance.RENDERER_ON) {
                this._nameBmd = new BitmapData(tw, th, true, 0);
                this._nameBmd.draw(as3.cast(card, IBitmapDrawable));
                this._namePt = new Point();
                this._nameRaster = new RasterData(as3.cast(this._nameBmd, IBitmapDrawable), this._namePt, int.MAX_VALUE);
            } else {
                card.mouseEnabled = false;
                card.mouseChildren = false;
                this._nameCard = card;
                this.addChild(card);
            }
            this.place();
            return;
        }
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
        if (this._nameCard && this._nameCard.parent) {
            this._nameCard.parent.removeChild(this._nameCard);
        }
        this._nameCard = null;
    }

    public get petName(): string {
        return this._name;
    }

    /** One game step: walk on, or rest, or pick the next spot (or what the player asked it to do). */
    public tick(): void {
        if (this._mode) {
            this.play();
        } else if (this._walking) {
            this.walk(IoPet.SPEED);
            if (!this._walking) {
                this._rest = (60 + ((Math.random() * 240) | 0)) | 0;
            }
        } else if (--this._rest <= 0 || this._frame % 40 == 0 && !IoPets.free(this.gx, this.gy)) {
            // (and at once when something now stands where it rests: a wart that grew there, a building placed)
            this.pickSpot();
        }
        if (!this._walking) {
            ++this._frame;
        }
        this.hopStep();
        this.place();
        this.draw(false);
        // (22 October: a Golden Coat glints now and then)
        if (this.gold && this._small && Math.random() < 1 / 160) {
            IoYardFx.sparkle(this.x + (Math.random() - 0.5) * this._small.width * 0.6, this.headY() + 6 + Math.random() * this._small.height * 0.5, this.y);
        }
    }

    /** A step towards (_tx, _ty) at this speed; done (not walking) once there. */
    private walk(speed: number): void {
        let dx: number = this._tx - this.gx;
        let dy: number = this._ty - this.gy;
        let d: number = Math.sqrt(dx * dx + dy * dy);
        if (d <= speed) {
            this.gx = this._tx;
            this.gy = this._ty;
            this._walking = false;
            return;
        }
        this._walking = true;
        this.gx += dx / d * speed;
        this.gy += dy / d * speed;
        this.face(dx / d, dy / d);
        ++this._frame;
    }

    /** Its facing on screen for a direction in the yard, as a creep's (0 facing right, turning clockwise). */
    private face(ux: number, uy: number): void {
        let from: Point = GRID.ToISO(this.gx - ux * 10, this.gy - uy * 10, 0);
        let to: Point = GRID.ToISO(this.gx, this.gy, 0);
        let r: number = Math.atan2(to.y - from.y, to.x - from.x) * 57.2957795;
        this._rotation = r < 0 ? r + 360 : r;
    }

    // ---- played with (IoPets.menu)
    /** What it is doing for the player ("" when it is just wandering). */
    public get mode(): string {
        return this._mode;
    }

    /** Follows the pointer for 45 seconds (or until told to stop). */
    public playFollow(): void {
        this.startMode("follow", 40 * 45);
        IoYardFx.word("!", this.x, this.headY() - 6, this.y, 30, 0xFFD24A);
    }

    /** A bone thrown somewhere near: it runs for it and brings it back. */
    public playFetch(): void {
        let to: Point = null;
        for (let tries: int = 0; tries < 24 && !to; tries++) {
            let a: number = Math.random() * Math.PI * 2;
            let dist: number = 120 + Math.random() * 160;
            let x: number = this.gx + Math.cos(a) * dist;
            let y: number = this.gy + Math.sin(a) * dist;
            if (IoPets.clearLine(this.gx, this.gy, x, y)) {
                to = new Point(x, y);
            }
        }
        if (!to) {
            // (nowhere clear to throw it: a happy hop instead)
            this.playTrick();
            return;
        }
        this.startMode("fetch", 0);
        this._homeX = this.gx;
        this._homeY = this.gy;
        this._boneFrom = new Point(this.gx, this.gy);
        this._boneTo = to;
        this._boneFlight = 24;
        this._tx = to.x;
        this._ty = to.y;
        let at: Point = GRID.ToISO(this.gx, this.gy, 0);
        this._bone = IoYardFx.show(IoYardFx.boneArt(), at.x, at.y - 20, at.y, 0);
        SOUNDS.Play("click1");
    }

    /** Spins round twice and hops. */
    public playTrick(): void {
        this.startMode("trick", 64);
        this._spin = 360 * 2 / 64;
        this.hop(3);
    }

    /** Petted: hearts, and a little hop. */
    public playPat(): void {
        this.startMode("pat", 60);
        this.hop(1);
        IoYardFx.heart(this.x, this.headY(), this.y);
    }

    /** Runs about fast, here and there. */
    public playZoomies(): void {
        this.startMode("zoom", 0);
        this._zoomLeft = 7;
        this._walking = false;
    }

    /** Lies still a while, Zs floating up. */
    public playNap(): void {
        this.startMode("nap", 40 * 20);
        this._walking = false;
    }

    /** Back to wandering. */
    public stopPlay(): void {
        if (this._bone) {
            IoYardFx.remove(this._bone);
            this._bone = null;
        }
        this._mode = "";
        this._modeT = 0;
        this._spin = 0;
        this._walking = false;
        this._rest = (40 + ((Math.random() * 80) | 0)) | 0;
    }

    private startMode(mode: string, steps: int): void {
        this.stopPlay();
        this._mode = mode;
        this._modeT = steps;
        this._fxT = 0;
    }

    /** Hops this many times. */
    private hop(times: int): void {
        this._hopT = (times * 16) | 0;
    }

    private hopStep(): void {
        if (this._hopT > 0) {
            this._hopT--;
            this._hop = Math.abs(Math.sin(this._hopT / 16 * Math.PI)) * 9;
        } else {
            this._hop = 0;
        }
    }

    /** Over its head (and its name), on the map's building layer (y). */
    private headY(): number {
        return this.y + this._bitmap.y - this._hop - 4 - (this._nameBmd ? this._nameBmd.height : (this._nameField || this._nameCard ? 16 : 0));
    }

    /** A step of what the player asked for. */
    private play(): void {
        this._fxT++;
        if (this._mode == "follow") {
            // towards the pointer (on the yard), stopping a little short; sliding along what is in the way
            let p: Point = GRID.FromISO(MAP._BUILDINGTOPS.mouseX, MAP._BUILDINGTOPS.mouseY);
            let dx: number = p.x - this.gx;
            let dy: number = p.y - this.gy;
            let d: number = Math.sqrt(dx * dx + dy * dy);
            if (d > 26) {
                let speed: number = Math.min(2.4, 0.7 + d / 140);
                let nx: number = this.gx + dx / d * speed;
                let ny: number = this.gy + dy / d * speed;
                if (IoPets.free(nx, ny)) {
                    this.gx = nx;
                    this.gy = ny;
                } else if (IoPets.free(nx, this.gy)) {
                    this.gx = nx;
                } else if (IoPets.free(this.gx, ny)) {
                    this.gy = ny;
                }
                this._walking = true;
                this.face(dx / d, dy / d);
                ++this._frame;
            } else {
                this._walking = false;
            }
            if (--this._modeT <= 0) {
                this.stopPlay();
            }
        } else if (this._mode == "fetch") {
            if (this._boneFlight > 0) {
                // the bone flies in an arc to where it lands; the pet watches, then runs
                this._boneFlight--;
                let t: number = 1 - this._boneFlight / 24;
                let gx: number = this._boneFrom.x + (this._boneTo.x - this._boneFrom.x) * t;
                let gy: number = this._boneFrom.y + (this._boneTo.y - this._boneFrom.y) * t;
                let at: Point = GRID.ToISO(gx, gy, 0);
                IoYardFx.move(this._bone, at.x, at.y - 4 - Math.sin(t * Math.PI) * 60, at.y);
                return;
            }
            this.walk(1.7);
            if (!this._walking) {
                this._mode = "fetchBack";
                this._tx = this._homeX;
                this._ty = this._homeY;
                this.hop(1);
            }
        } else if (this._mode == "fetchBack") {
            this.walk(1.4);
            let at: Point = GRID.ToISO(this.gx, this.gy, 0);
            IoYardFx.move(this._bone, at.x, this.y + this._bitmap.y * 0.5 - this._hop, at.y + 1);
            if (!this._walking) {
                IoYardFx.remove(this._bone);
                this._bone = null;
                IoYardFx.heart(this.x, this.headY(), this.y);
                this.hop(2);
                this.stopPlay();
            }
        } else if (this._mode == "trick") {
            this._rotation = (this._rotation + this._spin + 360) % 360;
            this._walking = true;
            ++this._frame;
            if (this._fxT % 10 == 0) {
                IoYardFx.sparkle(this.x, this.headY() + 8, this.y);
            }
            if (--this._modeT <= 0) {
                IoYardFx.word(KEYS.Get("io_t3t_pet_tada"), this.x, this.headY() - 6, this.y, 50, 0xFFD24A);
                this.stopPlay();
            }
        } else if (this._mode == "pat") {
            if (this._fxT % 14 == 0) {
                IoYardFx.heart(this.x, this.headY(), this.y);
            }
            if (--this._modeT <= 0) {
                this.stopPlay();
            }
        } else if (this._mode == "zoom") {
            if (!this._walking) {
                if (this._zoomLeft-- <= 0) {
                    IoYardFx.word("!", this.x, this.headY() - 6, this.y, 30, 0xFFD24A);
                    this.stopPlay();
                    return;
                }
                this.pickSpot();
                if (!this._walking) {
                    this.stopPlay();
                    return;
                }
            }
            this.walk(2.6);
        } else if (this._mode == "nap") {
            this._walking = false;
            if (this._fxT % 50 == 1) {
                IoYardFx.word(this._fxT % 100 == 1 ? "z" : "Z", this.x + 8, this.headY(), this.y, 70, 0xCFE3FF);
            }
            if (--this._modeT <= 0) {
                IoYardFx.word("!", this.x, this.headY() - 6, this.y, 30, 0xFFD24A);
                this.stopPlay();
            }
        }
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
            this._rasterPt.y = this.y + this._bitmap.y - this._hop - offset.y;
            this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y - offset.y) * 1000 + this.x - offset.x);
            if (this._nameRaster) {
                // over its head, centred
                this._namePt.x = (this.x - this._nameBmd.width / 2 - offset.x) | 0;
                this._namePt.y = (this.y + this._bitmap.y - this._hop - this._nameBmd.height - 1 - offset.y) | 0;
                this._nameRaster.depth = this._rasterData.depth + 1;
            }
        } else if (this._nameField) {
            this._nameField.x = -this._nameField.width / 2;
            this._nameField.y = this._bitmap.y - this._nameField.height;
        } else if (this._nameCard) {
            this._nameCard.x = -this._nameCard.width / 2;
            this._nameCard.y = this._bitmap.y - this._nameCard.height - 1;
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
        if (!this._ice && !this._ioFitted) {
            this.ioFit(sheet);
        }
        this._full.fillRect(this._full.rect, 0);
        if (this._ice) {
            let walkRows: int = this._ice[4] | 0;
            SPRITES.GetFrameById(this._full, this.monster, column, (this._walking || this._fly ? step % walkRows + 1 : 0) | 0);
        } else {
            let action: string = !this._walking && !this._fly && IoPet.CREEPS_STILL[this.monster] ? "idle" : "walking";
            // (the frame number drives the walk; -1: always drawn, not only when the facing changes)
            // (the Spurtz's sheet has 30 facings, but SPRITES reads it as 32: facing 337 to 360 drew nothing, so a
            // walking Spurtz pet vanished now and then; given as the facing that lands on the right column)
            // (26 October: SPRITES reads the Spurtz's 30 facings as 30 now: its facing as it is)
            let facing: int = this._rotation | 0;
            if (CreepSkinManager.instance.GetSprite(this._full, this.monster, action, facing, this._walking || this._fly ? this._frame : 0, -1) < 0) {
                return;
            }
        }
        this._lastKey = key;
        this._small.fillRect(this._small.rect, 0);
        this._small.draw(as3.cast(this._full, IBitmapDrawable), this._scaler, null, null, null, true);
        if (this.gold) {
            IoPet.ioGild(this._small);
        }
    }

    /**
     * (22 October) A Golden Coat: each pixel's light turned to gold (dark amber through gold to a pale shine), its
     * shadow (dark, see-through, colourless, as IoSkins tells it) left as it is.
     */
    public static ioGild(bmd: BitmapData): void {
        let img: ImageData = bmd.data();
        let d: Uint8ClampedArray = img.data;
        for (let p: int = 0; p < d.length; p += 4) {
            let a: int = d[p + 3];
            if (a == 0) {
                continue;
            }
            let r: number = d[p] / 255, g: number = d[p + 1] / 255, b: number = d[p + 2] / 255;
            let mx: number = Math.max(r, g, b), mn: number = Math.min(r, g, b);
            if (a < 217 && mx < 0.35 && (mx > 0.000001 ? (mx - mn) / mx : 0) < 0.5) {
                continue;
            }
            let l: number = Math.pow(0.3 * r + 0.59 * g + 0.11 * b, 0.75);
            if (l < 0.55) {
                let t: number = l / 0.55;
                d[p] = 70 + (214 - 70) * t;
                d[p + 1] = 38 + (150 - 38) * t;
                d[p + 2] = 6 + (30 - 6) * t;
            } else {
                let t: number = (l - 0.55) / 0.45;
                d[p] = 214 + (255 - 214) * t;
                d[p + 1] = 150 + (240 - 150) * t;
                d[p + 2] = 30 + (170 - 30) * t;
            }
        }
        bmd.$putData(img);
    }

    /**
     * (22 October, the user's: "Some pets are cut off when facing certain way - in particular the large valgos when
     * facing left") Its picture as big as its sheet's frames: a frame is copied at the sheet's offset, at its own size,
     * so a sheet larger than a creep's usual 52 x 50 (a Valgos facing left reaches 69 across; some sheets far more) lost its
     * edge. In battles the graphics card draws them straight from the sheet; a pet draws through its own picture.
     */
    private ioFit(sheet: any): void {
        this._ioFitted = true;
        let rect: any = sheet ? sheet.rect : null;
        let off: any = sheet ? sheet.offset : null;
        if (!rect || !off) {
            return;
        }
        let w: int = Math.max(this._full.width, Math.ceil(Number(off.x) + Number(rect.width))) | 0;
        let h: int = Math.max(this._full.height, Math.ceil(Number(off.y) + Number(rect.height))) | 0;
        if (!(w > this._full.width || h > this._full.height) || w > 400 || h > 400) {
            return;
        }
        this._full.dispose();
        this._small.dispose();
        this._full = new BitmapData(w, h, true, 0);
        this._small = new BitmapData(Math.ceil(w * this._scale), Math.ceil(h * this._scale), true, 0);
        this._bitmap.bitmapData = this._small;
        if (this._rasterData) {
            this._rasterData.data = as3.cast(this._small, IBitmapDrawable);
        }
        this._lastKey = -1;
    }

    /** Where it is drawn on the map's building layer (for clicks: IoYardPick). */
    public get box(): any {
        return { "x": this.x + this._bitmap.x, "y": this.y + this._bitmap.y - this._hop, "w": this._small ? this._small.width : 0, "h": this._small ? this._small.height : 0 };
    }

    public clear(): void {
        if (this._bone) {
            IoYardFx.remove(this._bone);
            this._bone = null;
        }
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
