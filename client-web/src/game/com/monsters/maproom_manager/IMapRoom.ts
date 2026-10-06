import * as as3 from "as3";
import { Vector, int } from "as3";
import { Dictionary } from "flash/utils";
import { IMapRoomCell } from "@game";

export interface IMapRoom {
    bookmarkData: any;

    mapWidth: int;

    mapHeight: int;

    worldID: int;

    readonly isOpen: boolean;

    readonly flingerInRange: boolean;

    readonly viewOnly: boolean;

    readonly playerOwnedCells: Vector<IMapRoomCell>;

    readonly allianceDataById: Dictionary;

    Setup(): void;

    ReadyToShow(): boolean;

    ShowDelayed(param1?: boolean): void;

    Hide(): void;

    Tick(): void;

    TickFast(): void;

    BookmarksClear(): void;

    ResizeHandler(): void;

    FindCell(param1: int, param2: int): IMapRoomCell;

    LoadCell(param1: int, param2: int, param3?: boolean): void;

    CalculateCellId(param1: int, param2: int): int;
}
export const IMapRoom = as3.iface("com.monsters.maproom_manager::IMapRoom", []);
