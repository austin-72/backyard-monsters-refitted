import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface IAsn1Type {
    getType(): uint;
    getLength(): uint;

    toDER(): ByteArray;
}
export const IAsn1Type = as3.iface("com.hurlant.util.der::IAsn1Type", []);
