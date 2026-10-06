import * as as3 from "as3";
import { ICipher } from "@game";

export interface IMode extends ICipher {
}
export const IMode = as3.iface("com.hurlant.crypto.symmetric::IMode", [ICipher]);
