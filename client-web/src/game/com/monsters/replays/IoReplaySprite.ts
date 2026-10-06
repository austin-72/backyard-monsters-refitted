import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Sprite } from "flash/display";
import { Point } from "flash/geom";
import { BYMConfig, GLOBAL, MAP, RasterData, SPRITES } from "@game";

/**
 * Inferno-only (attack replays): a champion of the champion cage in a replay, drawn from its sprite as the
 * champion draws itself (ChampionBase.getNextSprite), at a place the replay gives. (The other monsters are their
 * own classes made as puppets: MonsterBase.ioPuppet.)
 */
export class IoReplaySprite extends Sprite {
    static {
        as3.fields(this, { _spriteID: null, _canvas: null, _bitmap: null, _rasterData: null, _rasterPt: null, _rotation: 0, _frame: 0, _offY: NaN, _glows: null });
    }

    private _spriteID: string;
    private _canvas: BitmapData;
    private _bitmap: Bitmap;
    private _rasterData: RasterData;
    private _rasterPt: Point;
    private _rotation: number;
    private _frame: int;
    private _offY: number;
    /** Its glows (a replay's recorded GlowFilters), put on each frame drawn. */
    private _glows: any[];

    public $ctor(spriteID?: string, offX?: int, offY?: int): void {
        super.$ctor();
        this._spriteID = spriteID;
        this.mouseEnabled = false;
        this.mouseChildren = false;
        SPRITES.SetupSprite(spriteID);
        let d: any = SPRITES.GetSpriteDescriptor(spriteID);
        this._canvas = new BitmapData(d ? d.width | 0 : 100, d ? d.height | 0 : 100, true, 0);
        this._bitmap = new Bitmap(this._canvas);
        this._bitmap.x = offX;
        this._bitmap.y = offY;
        this._offY = offY;
        this._rasterPt = new Point();
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._canvas, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        } else {
            this.addChild(this._bitmap);
        }
    }

    public show(x: number, y: number, altitude: number, walking: boolean): void {
        let dx: number = x - this.x;
        let dy: number = y - this.y;
        if (dx * dx + dy * dy > 0.25) {
            let r: number = Math.atan2(dy, dx) * 57.2957795;
            this._rotation = r < 0 ? r + 360 : r;
        }
        this.x = x;
        this.y = y;
        this._bitmap.y = this._offY - altitude;
        if (walking) {
            ++this._frame;
        }
        if (GLOBAL._render) {
            this._canvas.fillRect(this._canvas.rect, 0);
            SPRITES.GetSprite(this._canvas, this._spriteID, walking ? "walking" : "idle", (this._rotation - 45) | 0, this._frame);
            for (let f of as3.values(this._glows || [])) {
                try {
                    this._canvas.applyFilter(this._canvas, this._canvas.rect, new Point(), f);
                } catch (e) {
                }
            }
        }
        if (this._rasterData) {
            let offset: Point = MAP.instance.offset;
            this._rasterPt.x = this.x + this._bitmap.x - offset.x;
            this._rasterPt.y = this.y + this._bitmap.y - offset.y;
            this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y - offset.y) * 1000 + this.x - offset.x);
        }
    }

    public glow(glows: any[]): void {
        this._glows = glows && glows.length ? glows : null;
        if (!BYMConfig.instance.RENDERER_ON) {
            this._bitmap.filters = this._glows || [];
        }
    }

    public clear(): void {
        if (this._rasterData) {
            this._rasterData.clear();
            this._rasterData = null;
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
        if (this._canvas) {
            this._canvas.dispose();
            this._canvas = null;
        }
    }
}
