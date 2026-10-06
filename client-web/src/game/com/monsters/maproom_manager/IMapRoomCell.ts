import * as as3 from "as3";
import { int } from "as3";

export interface IMapRoomCell {
    readonly baseID: number;

    readonly baseType: int;

    readonly cellX: int;

    readonly cellY: int;

    readonly cellHeight: int;

    readonly isDestroyed: boolean;

    readonly isLocked: boolean;
}
export const IMapRoomCell = as3.iface("com.monsters.maproom_manager::IMapRoomCell", []);
