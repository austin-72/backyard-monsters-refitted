package com.monsters.rendering {
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Shape;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.geom.Rectangle;

    use namespace renderer_friend;

    public class Renderer {

        renderer_friend static var _debug:Boolean;

        private static var _debugShape:Shape;

        renderer_friend var _canvas:BitmapData;

        renderer_friend var _viewRect:Rectangle;

        private const _matrix:Matrix = new Matrix();

        private const _pt:Point = new Point();

        private const _bm:Bitmap = new Bitmap();

        private var _curCopyIndex:uint;

        private var _curDrawIndex:uint;

        private var _alphaMasks:Object = {};

        private var _alphaMaskCount:int = 0;

        public function Renderer(param1:BitmapData, param2:Rectangle) {
            super();
            this.renderer_friend::_canvas = param1;
            this.renderer_friend::_viewRect = param2;
        }

        public static function get debug():Boolean {
            return renderer_friend::_debug;
        }

        public static function set debug(param1:Boolean):void {
            renderer_friend::_debug = param1;
            if (renderer_friend::_debug) {
                _debugShape = _debugShape || new Shape();
                RasterData.renderer_friend::showDebug();
            }
            else {
                _debugShape = null;
                RasterData.renderer_friend::hideDebug();
            }
        }

        public function set canvas(param1:BitmapData):void {
            this.renderer_friend::_canvas = param1;
        }

        public function render():void {
            var _loc1_:Vector.<RasterData> = RasterData.renderer_friend::s_visibleData;
            this._curCopyIndex = this._curDrawIndex = 0;
            if (RasterData.renderer_friend::s_needsSort) {
                this.sortByDepth(_loc1_);
                RasterData.renderer_friend::s_needsSort = false;
            }
            this.renderer_friend::_canvas.lock();
            // Two passes instead of concat(): that built a new list of everything in the yard every frame.
            this.rasterize(RasterData.renderer_friend::s_unsortedData);
            this.rasterize(_loc1_);
            this.renderer_friend::_canvas.unlock();
        }

        /**
         * The list needs sorting almost every frame during a battle, because every moving monster
         * changes depth, yet it is nearly in order each time: buildings never move. Vector.sort()
         * with a compare function costs thousands of function calls regardless; an insertion sort is
         * close to free on a nearly sorted list, and it is stable, so equal depths do not flicker.
         * When the list really is out of order (a yard has just loaded) it gives up early and the
         * built-in sort does the job.
         */
        private function sortByDepth(param1:Vector.<RasterData>):void {
            var i:int = 1;
            var j:int = 0;
            var item:RasterData = null;
            var depth:Number = NaN;
            var length:int = int(param1.length);
            var budget:int = length * 12;
            while (i < length) {
                item = param1[i];
                depth = item.renderer_friend::_depth;
                j = i - 1;
                while (j >= 0 && param1[j].renderer_friend::_depth > depth) {
                    param1[j + 1] = param1[j];
                    j--;
                    if (--budget < 0) {
                        param1[j + 1] = item;
                        param1.sort(this.sortRasterData);
                        return;
                    }
                }
                param1[j + 1] = item;
                i++;
            }
        }

        /** Masks for half-transparent sprites, by size and alpha. They used to be made and thrown away per sprite per frame. */
        private function alphaMaskFor(param1:int, param2:int, param3:uint):BitmapData {
            var key:String = param1 + "x" + param2 + ":" + param3;
            var mask:BitmapData = this._alphaMasks[key];
            if (!mask) {
                if (this._alphaMaskCount >= 96) {
                    for each (mask in this._alphaMasks) {
                        mask.dispose();
                    }
                    this._alphaMasks = {};
                    this._alphaMaskCount = 0;
                }
                mask = new BitmapData(param1, param2, true, param3);
                this._alphaMasks[key] = mask;
                ++this._alphaMaskCount;
            }
            return mask;
        }

        private function cull(param1:Vector.<RasterData>):void {
            var _loc3_:RasterData = null;
            var _loc4_:Rectangle = null;
            var _loc2_:Vector.<RasterData> = param1;
            for each (_loc3_ in _loc2_) {
                (_loc4_ = _loc3_.renderer_friend::_rect).x = _loc3_.renderer_friend::_pt.x;
                _loc4_.y = _loc3_.renderer_friend::_pt.y;
                if (this.renderer_friend::_viewRect.intersects(_loc4_)) {
                    _loc2_[_loc2_.length] = _loc3_;
                }
            }
        }

        private function sortRasterData(param1:RasterData, param2:RasterData):Number {
            return param1.renderer_friend::_depth - param2.renderer_friend::_depth;
        }

        private function rasterize(param1:Vector.<RasterData>):void {
            var entries:Vector.<RasterData> = null;
            var entry:RasterData = null;
            var entryBmd:BitmapData = null;
            var alphaMask:BitmapData = null;
            var i:int = 0;

            entries = param1;
            var len:int = int(entries.length);

            while (i < len) {
                entry = entries[i];
                if (!entry || entry.renderer_friend::_cleared || !entry.renderer_friend::_pt) {
                    i++;
                    continue;
                }
                entryBmd = entry.renderer_friend::_data as BitmapData;
                this._pt.x = entry.renderer_friend::_pt.x;
                this._pt.y = entry.renderer_friend::_pt.y;
                if (entryBmd && !entry.renderer_friend::_blendMode && !entry.renderer_friend::_filter && (entry.renderer_friend::_scaleX & entry.renderer_friend::_scaleY) === 100) {
                    alphaMask = entry.renderer_friend::_alpha !== 4278190080 ? this.alphaMaskFor(entryBmd.width, entryBmd.height, entry.renderer_friend::_alpha) : null;
                    this.renderer_friend::_canvas.copyPixels(entryBmd, entryBmd.rect, this._pt, alphaMask);
                }
                else {
                    this._matrix.createBox(entry.renderer_friend::_scaleX * 0.01, entry.renderer_friend::_scaleY * 0.01, 0, this._pt.x, this._pt.y);
                    if (Boolean(entry.renderer_friend::_filter) && Boolean(entryBmd)) {
                        this._bm.bitmapData = entryBmd;
                        this._bm.filters = [entry.renderer_friend::_filter];
                        this.renderer_friend::_canvas.draw(this._bm, this._matrix, null, entry.renderer_friend::_blendMode);
                    }
                    else {
                        this.renderer_friend::_canvas.draw(entry.renderer_friend::_data, this._matrix, null, entry.renderer_friend::_blendMode);
                    }
                }
                i++;
            }
        }
    }
}
