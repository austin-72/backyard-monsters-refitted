import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { Dictionary } from "flash/utils";
import { ImageCache, MapRoom3Cell, MapRoom3TileSet, SingletonLock } from "@game";

export class MapRoom3TileSetManager extends ASObject {
    static {
        as3.fields(this, { m_TileSetsInUse: null, m_CurrentTileSet: null, m_CurrentBackground: null });
    }

    private static s_Instance: MapRoom3TileSetManager = null;

    public static readonly BLOCKED_CELL_STARTING_HEIGHT: int = 51;

    public static readonly BORDER_CELL_HEIGHT: int = 100;

    public static readonly DEFAULT_BACKGROUND: string = "worldmap/background.jpg";

    public static DEFAULT_TILE_SET: any[] = [{ "src": "worldmap/tiles/clover01.png", "x": 0, "y": 0, "min_alt": 32, "max_alt": 35 }, { "src": "worldmap/tiles/clover02.png", "x": 0, "y": 0, "min_alt": 35, "max_alt": 38 }, { "src": "worldmap/tiles/clover03.png", "x": 0, "y": 0, "min_alt": 38, "max_alt": 41 }, { "src": "worldmap/tiles/clover04.png", "x": 0, "y": 0, "min_alt": 41, "max_alt": 44 }, { "src": "worldmap/tiles/clover05.png", "x": 0, "y": 0, "min_alt": 44, "max_alt": 47 }, { "src": "worldmap/tiles/clover06.png", "x": 0, "y": 0, "min_alt": 47, "max_alt": 50 }, { "src": "worldmap/tiles/brownplant01.png", "x": 0, "y": 0, "min_alt": 50, "max_alt": 52 }, { "src": "worldmap/tiles/brownplant02.png", "x": 0, "y": 0, "min_alt": 52, "max_alt": 54 }, { "src": "worldmap/tiles/brownplant03.png", "x": 0, "y": 0, "min_alt": 54, "max_alt": 56 }, { "src": "worldmap/tiles/brownplant04.png", "x": 0, "y": 0, "min_alt": 56, "max_alt": 58 }, { "src": "worldmap/tiles/brownplant05.png", "x": 0, "y": 0, "min_alt": 58, "max_alt": 60 }, { "src": "worldmap/tiles/greenplant01.png", "x": 0, "y": 0, "min_alt": 60, "max_alt": 62 }, { "src": "worldmap/tiles/greenplant02.png", "x": 0, "y": 0, "min_alt": 62, "max_alt": 64 }, { "src": "worldmap/tiles/greenplant03.png", "x": 0, "y": 0, "min_alt": 64, "max_alt": 66 }, { "src": "worldmap/tiles/greenplant04.png", "x": 0, "y": 0, "min_alt": 66, "max_alt": 68 }, { "src": "worldmap/tiles/greenplant05.png", "x": 0, "y": 0, "min_alt": 68, "max_alt": 70 }, { "src": "worldmap/tiles/spiky01.png", "x": 0, "y": 0, "min_alt": 70, "max_alt": 71 }, { "src": "worldmap/tiles/spiky02.png", "x": 0, "y": 0, "min_alt": 71, "max_alt": 72 }, { "src": "worldmap/tiles/spiky03.png", "x": 0, "y": 0, "min_alt": 72, "max_alt": 73 }, { "src": "worldmap/tiles/spiky04.png", "x": 0, "y": 0, "min_alt": 73, "max_alt": 75 }, { "src": "worldmap/tiles/spiky05.png", "x": 0, "y": 0, "min_alt": 75, "max_alt": 77 }, { "src": "worldmap/tiles/spiky06.png", "x": 0, "y": 0, "min_alt": 77, "max_alt": 79 }, { "src": "worldmap/tiles/spiky07.png", "x": 0, "y": 0, "min_alt": 78, "max_alt": 80 }, { "src": "worldmap/tiles/borderplant01.png", "x": 0, "y": 0, "min_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT - 1, "max_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT }, { "src": "worldmap/tiles/borderplant02.png", "x": 0, "y": 0, "min_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT - 1, "max_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT }, { "src": "worldmap/tiles/borderplant03.png", "x": 0, "y": 0, "min_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT - 1, "max_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT }, { "src": "worldmap/tiles/borderplant04.png", "x": 0, "y": 0, "min_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT - 1, "max_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT }, { "src": "worldmap/tiles/borderplant05.png", "x": 0, "y": 0, "min_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT - 1, "max_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT }];

    public static INFERNO_TILE_SET: any[] = [{ "src": "worldmap/tiles/tests/lava.png", "x": 0, "y": 0, "min_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT - 1, "max_alt": MapRoom3TileSetManager.BORDER_CELL_HEIGHT }];
    private m_TileSetsInUse: Dictionary;
    private m_CurrentTileSet: MapRoom3TileSet;
    private m_CurrentBackground: BitmapData;

    public $ctor(param1?: SingletonLock): void {
        this.m_TileSetsInUse = new Dictionary();
        super.$ctor();
    }

    public static get instance(): MapRoom3TileSetManager {
        return MapRoom3TileSetManager.s_Instance = MapRoom3TileSetManager.s_Instance || new MapRoom3TileSetManager(new SingletonLock());
    }

    public get currentBackground(): BitmapData {
        return this.m_CurrentBackground;
    }

    public get isCurrentTileSetAndBackgroundLoaded(): boolean {
        return Boolean(this.m_CurrentTileSet) && Boolean(this.m_CurrentBackground);
    }

    public SetCurrentTileSet(tileSet: any[], mapBg: string = "worldmap/background.jpg"): void {
        if (tileSet != MapRoom3TileSetManager.DEFAULT_TILE_SET && tileSet != MapRoom3TileSetManager.INFERNO_TILE_SET) {
            return;
        }
        if (this.m_TileSetsInUse.get(tileSet) == null) {
            this.m_CurrentTileSet = new MapRoom3TileSet(tileSet);
            this.m_TileSetsInUse.set(tileSet, this.m_CurrentTileSet);
        } else {
            this.m_CurrentTileSet = as3.as(this.m_TileSetsInUse.get(tileSet), MapRoom3TileSet);
        }
        ImageCache.GetImageWithCallBack(mapBg, as3.bind(this, this.OnBackgroundImageLoaded), true, 1);
    }

    private OnBackgroundImageLoaded(param1: string, param2: BitmapData): void {
        this.m_CurrentBackground = param2;
    }

    public GetTileToDrawForCell(param1: MapRoom3Cell, param2: int): any {
        return !(!this.m_CurrentTileSet) ? this.m_CurrentTileSet.GetTileToDrawForCell(param1, param2) : null;
    }
}
