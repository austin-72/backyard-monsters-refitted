import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface IConnectionState {
    decrypt(type: uint, length: uint, p: ByteArray): ByteArray;
    encrypt(type: uint, p: ByteArray): ByteArray;
}
export const IConnectionState = as3.iface("com.hurlant.crypto.tls::IConnectionState", []);
