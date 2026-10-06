import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ImageCache, MapRoom3Cell, MapRoom3TileSetRange } from "@game";

export class MapRoom3TileSet extends ASObject {
    static {
        as3.fields(this, { m_TileSetInfo: null, m_TileSetRanges: null, m_URLLookup: null });
    }

    private m_TileSetInfo: any[];
    private m_TileSetRanges: any[];
    private m_URLLookup: any;

    /*
     * Initializes the tile set for Map Room 3 based on altitude-based segmentation.
     *
     * The constructor takes in a tile set definition array, extracts unique altitude cutoffs
     * from the min/max altitudes of the tiles, organizes the tile set into altitude ranges,
     * and associates each range with the applicable tile indices. It also triggers the image
     * loading for the tiles and sets up lookup maps.
     *
     * @param tileSet An array of tile metadata objects, each containing:
     *                - min_alt: Minimum altitude for which this tile is used.
     *                - max_alt: Maximum altitude for which this tile is used.
     *                - src: The image source path for the tile.
     */
    public $ctor(tileSet?: any[]): void {
        super.$ctor();

        let currentRange: MapRoom3TileSetRange = null;
        let heightCutoffs: any[] = new Array();
        let tileImageSources: any[] = new Array();
        let tileIndex: int = 0;
        let rangeIndex: int = 0;

        this.m_TileSetInfo = tileSet;
        this.m_TileSetRanges = new Array();
        this.m_URLLookup = new Object();

        tileIndex = 0;
        while (tileIndex < this.m_TileSetInfo.length) {
            if (heightCutoffs.indexOf(this.m_TileSetInfo[tileIndex].min_alt | 0) == -1) {
                heightCutoffs.push(this.m_TileSetInfo[tileIndex].min_alt | 0);
            }
            if (heightCutoffs.indexOf(this.m_TileSetInfo[tileIndex].max_alt | 0) == -1) {
                heightCutoffs.push(this.m_TileSetInfo[tileIndex].max_alt | 0);
            }
            tileImageSources.push(this.m_TileSetInfo[tileIndex].src);
            this.m_URLLookup[this.m_TileSetInfo[tileIndex].src] = tileIndex;
            tileIndex++;
        }
        as3.sort(heightCutoffs, Array.NUMERIC);
        ImageCache.GetImageGroupWithCallBack("map_tiles", tileImageSources, as3.bind(this, this.OnImagesLoaded));
        tileIndex = 0;
        while (tileIndex < heightCutoffs.length - 1) {
            currentRange = new MapRoom3TileSetRange(heightCutoffs[tileIndex] | 0, heightCutoffs[tileIndex + 1] | 0);
            this.m_TileSetRanges.push(currentRange);
            tileIndex++;
        }
        tileIndex = 0;
        while (tileIndex < this.m_TileSetInfo.length) {
            rangeIndex = 0;
            currentRange = as3.cast(this.m_TileSetRanges[rangeIndex], MapRoom3TileSetRange);
            while (rangeIndex < this.m_TileSetRanges.length && currentRange.end <= this.m_TileSetInfo[tileIndex].min_alt) {
                rangeIndex++;
                currentRange = as3.cast(this.m_TileSetRanges[rangeIndex], MapRoom3TileSetRange);
            }
            while (rangeIndex < this.m_TileSetRanges.length && currentRange.end <= this.m_TileSetInfo[tileIndex].max_alt) {
                currentRange.options.push(tileIndex);
                rangeIndex++;
                currentRange = as3.cast(this.m_TileSetRanges[rangeIndex], MapRoom3TileSetRange);
            }
            tileIndex++;
        }
    }

    private OnImagesLoaded(param1: any[], param2: string): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        _loc3_ = 0;
        while (_loc3_ < param1.length) {
            _loc4_ = this.m_URLLookup[param1[_loc3_][0]] | 0;
            this.m_TileSetInfo[_loc4_].bmd = param1[_loc3_][1];
            _loc3_++;
        }
    }

    public GetTileToDrawForCell(param1: MapRoom3Cell, param2: int): any {
        let _loc4_: MapRoom3TileSetRange = null;
        let _loc6_: any = 0;
        let _loc7_: int = 0;
        let _loc3_: any = null;
        if (param1.cellHeight < this.m_TileSetRanges[0].start) {
            return _loc3_;
        }
        let _loc5_: int = 0;
        while (_loc5_ < this.m_TileSetRanges.length && this.m_TileSetRanges[_loc5_].end < param1.cellHeight) {
            _loc5_++;
        }
        if (_loc5_ < this.m_TileSetRanges.length) {
            _loc4_ = as3.cast(this.m_TileSetRanges[_loc5_], MapRoom3TileSetRange);
            _loc6_ = param2;
            _loc6_ ^= _loc6_ << 21;
            _loc6_ ^= _loc6_ >>> 35;
            _loc6_ ^= _loc6_ << 4;
            _loc7_ = ((_loc6_ = Math.abs(Number(_loc6_))) % _loc4_.options.length) | 0;
            _loc7_ = _loc4_.options[_loc7_] | 0;
            return this.m_TileSetInfo[_loc7_];
        }
        return _loc3_;
    }
}
