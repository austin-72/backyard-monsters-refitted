import * as as3 from "as3";
import { ASObject, int } from "as3";
import { EnumYardType, KEYS, MapRoom3Cell } from "@game";

export class Bookmark extends ASObject {
    static {
        as3.fields(this, { m_MapRoom3Cell: null, m_UserDefinedName: "" });
    }

    private m_MapRoom3Cell: MapRoom3Cell;
    private m_UserDefinedName: string;

    public $ctor(param1?: MapRoom3Cell, param2: string = ""): void {
        super.$ctor();
        this.m_MapRoom3Cell = param1;
        this.m_UserDefinedName = param2;
    }

    private static MakeDefaultBookmarkName(param1: MapRoom3Cell): string {
        switch (param1.cellType) {
            case EnumYardType.PLAYER:
                return KEYS.Get("bm_starter_cell_name", { "fname": param1.name });
            case EnumYardType.RESOURCE:
                return KEYS.Get("bm_resource_cell_name", { "v1": param1.baseLevel });
            case EnumYardType.STRONGHOLD:
                return KEYS.Get("bm_stronghold_cell_name", { "v1": param1.baseLevel });
            case EnumYardType.FORTIFICATION:
                return KEYS.Get("bm_fortification_cell_name", { "v1": param1.baseLevel });
            case EnumYardType.EMPTY:
            default:
                if (param1.isOwnedByWildMonster) {
                    return KEYS.Get("bm_wild_monster_cell_name");
                }
                return "";
        }
    }

    public get mapCell(): MapRoom3Cell {
        return this.m_MapRoom3Cell;
    }

    public get cellX(): int {
        return !(!this.m_MapRoom3Cell) ? this.m_MapRoom3Cell.cellX : -1;
    }

    public get cellY(): int {
        return !(!this.m_MapRoom3Cell) ? this.m_MapRoom3Cell.cellY : -1;
    }

    public get displayName(): string {
        return !(!this.m_UserDefinedName) ? this.m_UserDefinedName : Bookmark.MakeDefaultBookmarkName(this.m_MapRoom3Cell);
    }

    public get userDefinedName(): string {
        return this.m_UserDefinedName;
    }

    public set userDefinedName(param1: string) {
        this.m_UserDefinedName = param1;
    }

    public Clear(): void {
        this.m_MapRoom3Cell = null;
        this.m_UserDefinedName = null;
    }
}
