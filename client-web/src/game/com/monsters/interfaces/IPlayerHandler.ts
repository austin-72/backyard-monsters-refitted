import * as as3 from "as3";
import { IHandler, Player } from "@game";

export interface IPlayerHandler extends IHandler {
    player: Player;
}
export const IPlayerHandler = as3.iface("com.monsters.interfaces::IPlayerHandler", [IHandler]);
