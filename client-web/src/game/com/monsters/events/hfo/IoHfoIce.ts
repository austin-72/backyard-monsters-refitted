import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, BlendMode, IBitmapDrawable, Sprite } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { BFOUNDATION, BMUSHROOM, BYMConfig, IoHfo, IoHfoArt, MAP, RasterData } from "@game";

/**
 * Hell Freezes Over: ice in the player's main yard that a worker is sent to (IoHfo), built as one of the yard's
 * mushrooms (type 7) so it is handled like the warts: clicked, a worker queued (MUSHROOMS.PickWorker), never
 * attacked, never saved with the buildings (the server keeps where it is: services/events/hfo.ts).
 *
 *   "small"  Day 1: a small ice patch, footprint 30, blocks building like a wart. A worker clears it.
 *   "big"    Day 2: a big cursed patch, footprint 60. A worker chips at it, it cracks and snaps back.
 *   "tower"  Day 3: the block of ice a defence tower is sealed in. It stands on the tower (blocking nothing
 *            more) and takes the tower's clicks; a worker frees the tower.
 */
export class IoHfoIce extends BMUSHROOM {
    static {
        as3.fields(this, { kind: null, ioServerId: 0, tower: null, picture: null, _ioDone: false, _hit: null });
    }

    public static readonly SMALL: string = "small";

    public static readonly BIG: string = "big";

    public static readonly TOWER: string = "tower";

    /** Ids of their own, far above any building's (BASE._buildingCount). */
    public static readonly ID_BASE: int = 900000;
    public kind: string;
    /** The server's id for it: a patch's id, or the tower's id. */
    public ioServerId: int;
    public tower: BFOUNDATION;
    /** Picture names (IoHfoArt.PICS). */
    public picture: string;
    private _ioDone: boolean;
    private _hit: Sprite;

    public $ctor(kind?: any /* string */, size?: int, tower: BFOUNDATION = null): void {
        super.$ctor();
        this.kind = kind;
        this.tower = tower;
        this._type = 7;
        this._footprint = [new Rectangle(0, 0, size, size)];
        this._gridCost = kind == IoHfoIce.TOWER ? [] : [[new Rectangle(0, 0, size, size), 10]];
        this.SetProps();
    }

    /** A patch at grid point (x, y) (frame: its picture, 1-5 small, 1-3 big). */
    public static patch(kind: string, serverId: int, x: int, y: int, frame: int): IoHfoIce {
        let ice: IoHfoIce = new IoHfoIce(kind, kind == IoHfoIce.BIG ? 60 : 30);
        ice.ioServerId = serverId;
        ice.picture = kind + Math.max(1, Math.min(kind == IoHfoIce.BIG ? 3 : 5, frame));
        ice.Setup({ "X": x, "Y": y, "id": IoHfoIce.ID_BASE + serverId, "t": 7, "frame": frame });
        return ice;
    }

    /** The ice a tower is sealed in (Day 3). */
    public static onTower(tower: BFOUNDATION): IoHfoIce {
        let fp: Rectangle = tower._footprint && tower._footprint.length ? as3.as(tower._footprint[0], Rectangle) : new Rectangle(0, 0, 60, 60);
        let ice: IoHfoIce = new IoHfoIce(IoHfoIce.TOWER, fp.width | 0, tower);
        ice.ioServerId = tower._id;
        ice.picture = "ice_" + IoHfoArt.towerSize(tower);
        let at: any = tower.Export();
        ice.Setup({ "X": at.X, "Y": at.Y, "id": IoHfoIce.ID_BASE + 50000 + tower._id, "t": 7, "frame": 1 });
        return ice;
    }

    /** The tower's ice stands on the tower: it blocks nothing more (and must not unblock the tower's ground). */
    public override GridCost(param1: boolean = true): void {
        if (this.kind != IoHfoIce.TOWER) {
            super.GridCost(param1);
        }
    }

    /** Drawn from the event's pictures (BMUSHROOM.PlaceB asks): the ice, and its shadow on the ground. */
    protected override ioPlaceOwn(): boolean {
        if (!BYMConfig.instance.RENDERER_ON) {
            return true;
        }
        if (this.kind == IoHfoIce.TOWER && this.tower) {
            // drawn over the tower it seals
            this._middle = ((this.tower._middle ? this.tower._middle : 30) + 2) | 0;
        }
        let top: BitmapData = IoHfoArt.pic(this.picture);
        let shadow: BitmapData = IoHfoArt.pic(this.picture + "_shadow");
        let topAt: Point = IoHfoArt.picAt(this.picture);
        let shadowAt: Point = IoHfoArt.picAt(this.picture + "_shadow");
        as3.vget(this._offsets, BFOUNDATION._RASTERDATA_TOP).x = topAt.x;
        as3.vget(this._offsets, BFOUNDATION._RASTERDATA_TOP).y = topAt.y;
        as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).x = shadowAt.x;
        as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).y = shadowAt.y;
        let off: Point = MAP.instance.offset;
        as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_TOP).x = this._mc.x + topAt.x - off.x;
        as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_TOP).y = this._mc.y + topAt.y - off.y;
        as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW).x = this._mc.x + shadowAt.x - off.x;
        as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW).y = this._mc.y + shadowAt.y - off.y;
        if (top) {
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_TOP, as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP) || new RasterData(as3.cast(top, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_TOP), int.MAX_VALUE));
        }
        if (shadow) {
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW, as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW) || new RasterData(as3.cast(shadow, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW), MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true));
        }
        // clicked anywhere on the ice (the hit clip sits at the picture's corner: m_hitOffsetIndex)
        if (this._mcHit) {
            let r: Rectangle = new Rectangle(topAt.x, topAt.y, top ? top.width : 40, top ? top.height : 30);
            let hitAt: Point = as3.vget(this._offsets, this.m_hitOffsetIndex);
            if (!this._hit) {
                this._hit = new Sprite();
                this._hit.mouseEnabled = false;
                this._hit.mouseChildren = false;
            }
            this._hit.graphics.clear();
            this._hit.graphics.beginFill(16777215, 1);
            this._hit.graphics.drawRect(r.x - hitAt.x, r.y - hitAt.y + (this.kind == IoHfoIce.TOWER ? 0 : 4), r.width, r.height - (this.kind == IoHfoIce.TOWER ? 0 : 4));
            this._hit.graphics.endFill();
            if (this._hit.parent != this._mcHit) {
                this._mcHit.addChild(this._hit);
            }
            this._mcHit.hitArea = this._hit;
        }
        this._origin = new Point(this.x, this.y);
        this.updateRasterData();
        return true;
    }

    /** The name the building info shows. */
    public get nameKey(): string {
        return this.kind == IoHfoIce.SMALL ? "#bi_icepatch#" : (this.kind == IoHfoIce.BIG ? "#bi_icepatch_big#" : "hfo_tower_frozen");
    }

    /** The worker shakes the ice a while, then it is the event's to settle (IoHfo.workerDone). */
    public override HasWorker(): void {
        if (this._ioDone) {
            return;
        }
        if (this._shake > (this.kind == IoHfoIce.BIG ? 90 : 60)) {
            this._mc.x = this._origin.x;
            this._mc.y = this._origin.y;
            this._mcBase.x = this._origin.x;
            this._mcBase.y = this._origin.y;
            this._shake = 0;
            this._ioDone = true;
            this.updateRasterData();
            IoHfo.workerDone(this);
            return;
        }
        if (this._shake % 2 == 0) {
            this._mc.x = this._origin.x - 2 + Math.random() * 4;
            this._mc.y = this._origin.y - 2 + Math.random() * 4;
            this._mcBase.x = this._origin.x - 1 + Math.random() * 2;
            this._mcBase.y = this._origin.y - 1 + Math.random() * 2;
        }
        ++this._shake;
        this.updateRasterData();
    }

    /** Ready for another worker (a big patch that held, or a request that failed). */
    public ioReset(): void {
        this._ioDone = false;
        this._picking = false;
        this._hasWorker = false;
        this._shake = 0;
        this._mc.alpha = 1;
        this.updateRasterData();
    }

    /** Gone from the yard. */
    public ioRemove(): void {
        this.RecycleC();
    }
}
