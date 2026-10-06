import * as as3 from "as3";
import { ChatData, UserRecord } from "@game";

/**
 * Interface for chat authentication systems.
 */
export interface IAuthenticationSystem {
    authenticate(): boolean;

    readonly User: UserRecord;

    readonly Password: string;

    readonly Params: ChatData;
}
export const IAuthenticationSystem = as3.iface("com.monsters.chat::IAuthenticationSystem", []);
