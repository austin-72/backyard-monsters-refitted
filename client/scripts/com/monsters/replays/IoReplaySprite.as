package com.monsters.replays {
    import com.monsters.configs.BYMConfig;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Sprite;
    import flash.filters.BitmapFilter;
    import flash.geom.Point;

    /**
     * Inferno-only (attack replays): a champion of the champion cage in a replay, drawn from its sprite as the
     * champion draws itself (ChampionBase.getNextSprite), at a place the replay gives. (The other monsters are their
     * own classes made as puppets: MonsterBase.ioPuppet.)
     */
    public class IoReplaySprite extends Sprite {

        private var _spriteID:String;

        private var _canvas:BitmapData;

        private var _bitmap:Bitmap;

        private var _rasterData:RasterData;

        private var _rasterPt:Point;

        private var _rotation:Number = 0;

        private var _frame:int = 0;

        private var _offY:Number;

        /** Its glows (a replay's recorded GlowFilters), put on each frame drawn. */
        private var _glows:Array = null;

        public function IoReplaySprite(spriteID:String, offX:int, offY:int) {
            super();
            this._spriteID = spriteID;
            this.mouseEnabled = false;
            this.mouseChildren = false;
            SPRITES.SetupSprite(spriteID);
            var d:Object = SPRITES.GetSpriteDescriptor(spriteID);
            this._canvas = new BitmapData(d ? int(d.width) : 100, d ? int(d.height) : 100, true, 0);
            this._bitmap = new Bitmap(this._canvas);
            this._bitmap.x = offX;
            this._bitmap.y = offY;
            this._offY = offY;
            this._rasterPt = new Point();
            if (BYMConfig.instance.RENDERER_ON) {
                this._rasterData = new RasterData(this._canvas, this._rasterPt, int.MAX_VALUE);
            }
            else {
                addChild(this._bitmap);
            }
        }

        public function show(x:Number, y:Number, altitude:Number, walking:Boolean):void {
            var dx:Number = x - this.x;
            var dy:Number = y - this.y;
            if (dx * dx + dy * dy > 0.25) {
                var r:Number = Math.atan2(dy, dx) * 57.2957795;
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
                SPRITES.GetSprite(this._canvas, this._spriteID, walking ? "walking" : "idle", this._rotation - 45, this._frame);
                for each (var f:BitmapFilter in this._glows || []) {
                    try {
                        this._canvas.applyFilter(this._canvas, this._canvas.rect, new Point(), f);
                    }
                    catch (e:Error) {
                    }
                }
            }
            if (this._rasterData) {
                var offset:Point = MAP.instance.offset;
                this._rasterPt.x = this.x + this._bitmap.x - offset.x;
                this._rasterPt.y = this.y + this._bitmap.y - offset.y;
                this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y - offset.y) * 1000 + this.x - offset.x);
            }
        }

        public function glow(glows:Array):void {
            this._glows = glows && glows.length ? glows : null;
            if (!BYMConfig.instance.RENDERER_ON) {
                this._bitmap.filters = this._glows || [];
            }
        }

        public function clear():void {
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
}
