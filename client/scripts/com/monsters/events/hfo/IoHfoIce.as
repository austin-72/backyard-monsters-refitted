package com.monsters.events.hfo {
    import com.monsters.configs.BYMConfig;
    import com.monsters.rendering.RasterData;
    import flash.display.BitmapData;
    import flash.display.BlendMode;
    import flash.display.Sprite;
    import flash.geom.Point;
    import flash.geom.Rectangle;

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
    public class IoHfoIce extends BMUSHROOM {

        public static const SMALL:String = "small";

        public static const BIG:String = "big";

        public static const TOWER:String = "tower";

        /** Ids of their own, far above any building's (BASE._buildingCount). */
        public static const ID_BASE:int = 900000;

        public var kind:String;

        /** The server's id for it: a patch's id, or the tower's id. */
        public var ioServerId:int;

        public var tower:BFOUNDATION;

        /** Picture names (IoHfoArt.PICS). */
        public var picture:String;

        private var _ioDone:Boolean = false;

        private var _hit:Sprite;

        public function IoHfoIce(kind:String, size:int, tower:BFOUNDATION = null) {
            super();
            this.kind = kind;
            this.tower = tower;
            _type = 7;
            _footprint = [new Rectangle(0, 0, size, size)];
            _gridCost = kind == TOWER ? [] : [[new Rectangle(0, 0, size, size), 10]];
            SetProps();
        }

        /** A patch at grid point (x, y) (frame: its picture, 1-5 small, 1-3 big). */
        public static function patch(kind:String, serverId:int, x:int, y:int, frame:int):IoHfoIce {
            var ice:IoHfoIce = new IoHfoIce(kind, kind == BIG ? 60 : 30);
            ice.ioServerId = serverId;
            ice.picture = kind + Math.max(1, Math.min(kind == BIG ? 3 : 5, frame));
            ice.Setup({"X": x, "Y": y, "id": ID_BASE + serverId, "t": 7, "frame": frame});
            return ice;
        }

        /** The ice a tower is sealed in (Day 3). */
        public static function onTower(tower:BFOUNDATION):IoHfoIce {
            var fp:Rectangle = tower._footprint && tower._footprint.length ? tower._footprint[0] as Rectangle : new Rectangle(0, 0, 60, 60);
            var ice:IoHfoIce = new IoHfoIce(TOWER, fp.width, tower);
            ice.ioServerId = tower._id;
            ice.picture = "ice_" + IoHfoArt.towerSize(tower);
            var at:Object = tower.Export();
            ice.Setup({"X": at.X, "Y": at.Y, "id": ID_BASE + 50000 + tower._id, "t": 7, "frame": 1});
            return ice;
        }

        /** The tower's ice stands on the tower: it blocks nothing more (and must not unblock the tower's ground). */
        override public function GridCost(param1:Boolean = true):void {
            if (this.kind != TOWER) {
                super.GridCost(param1);
            }
        }

        /** Drawn from the event's pictures (BMUSHROOM.PlaceB asks): the ice, and its shadow on the ground. */
        override protected function ioPlaceOwn():Boolean {
            if (!BYMConfig.instance.RENDERER_ON) {
                return true;
            }
            if (this.kind == TOWER && this.tower) {
                // drawn over the tower it seals
                _middle = (this.tower._middle ? this.tower._middle : 30) + 2;
            }
            var top:BitmapData = IoHfoArt.pic(this.picture);
            var shadow:BitmapData = IoHfoArt.pic(this.picture + "_shadow");
            var topAt:Point = IoHfoArt.picAt(this.picture);
            var shadowAt:Point = IoHfoArt.picAt(this.picture + "_shadow");
            _offsets[_RASTERDATA_TOP].x = topAt.x;
            _offsets[_RASTERDATA_TOP].y = topAt.y;
            _offsets[_RASTERDATA_SHADOW].x = shadowAt.x;
            _offsets[_RASTERDATA_SHADOW].y = shadowAt.y;
            var off:Point = MAP.instance.offset;
            _rasterPt[_RASTERDATA_TOP].x = _mc.x + topAt.x - off.x;
            _rasterPt[_RASTERDATA_TOP].y = _mc.y + topAt.y - off.y;
            _rasterPt[_RASTERDATA_SHADOW].x = _mc.x + shadowAt.x - off.x;
            _rasterPt[_RASTERDATA_SHADOW].y = _mc.y + shadowAt.y - off.y;
            if (top) {
                _rasterData[_RASTERDATA_TOP] = _rasterData[_RASTERDATA_TOP] || new RasterData(top, _rasterPt[_RASTERDATA_TOP], int.MAX_VALUE);
            }
            if (shadow) {
                _rasterData[_RASTERDATA_SHADOW] = _rasterData[_RASTERDATA_SHADOW] || new RasterData(shadow, _rasterPt[_RASTERDATA_SHADOW], MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true);
            }
            // clicked anywhere on the ice (the hit clip sits at the picture's corner: m_hitOffsetIndex)
            if (_mcHit) {
                var r:Rectangle = new Rectangle(topAt.x, topAt.y, top ? top.width : 40, top ? top.height : 30);
                var hitAt:Point = _offsets[m_hitOffsetIndex];
                if (!this._hit) {
                    this._hit = new Sprite();
                    this._hit.mouseEnabled = false;
                    this._hit.mouseChildren = false;
                }
                this._hit.graphics.clear();
                this._hit.graphics.beginFill(0xFFFFFF, 1);
                this._hit.graphics.drawRect(r.x - hitAt.x, r.y - hitAt.y + (this.kind == TOWER ? 0 : 4), r.width, r.height - (this.kind == TOWER ? 0 : 4));
                this._hit.graphics.endFill();
                if (this._hit.parent != _mcHit) {
                    _mcHit.addChild(this._hit);
                }
                _mcHit.hitArea = this._hit;
            }
            _origin = new Point(x, y);
            updateRasterData();
            return true;
        }

        /** The name the building info shows. */
        public function get nameKey():String {
            return this.kind == SMALL ? "#bi_icepatch#" : (this.kind == BIG ? "#bi_icepatch_big#" : "hfo_tower_frozen");
        }

        /** The worker shakes the ice a while, then it is the event's to settle (IoHfo.workerDone). */
        override public function HasWorker():void {
            if (this._ioDone) {
                return;
            }
            if (_shake > (this.kind == BIG ? 90 : 60)) {
                _mc.x = _origin.x;
                _mc.y = _origin.y;
                _mcBase.x = _origin.x;
                _mcBase.y = _origin.y;
                _shake = 0;
                this._ioDone = true;
                updateRasterData();
                IoHfo.workerDone(this);
                return;
            }
            if (_shake % 2 == 0) {
                _mc.x = _origin.x - 2 + Math.random() * 4;
                _mc.y = _origin.y - 2 + Math.random() * 4;
                _mcBase.x = _origin.x - 1 + Math.random() * 2;
                _mcBase.y = _origin.y - 1 + Math.random() * 2;
            }
            ++_shake;
            updateRasterData();
        }

        /** Ready for another worker (a big patch that held, or a request that failed). */
        public function ioReset():void {
            this._ioDone = false;
            _picking = false;
            _hasWorker = false;
            _shake = 0;
            _mc.alpha = 1;
            updateRasterData();
        }

        /** Gone from the yard. */
        public function ioRemove():void {
            RecycleC();
        }
    }
}
