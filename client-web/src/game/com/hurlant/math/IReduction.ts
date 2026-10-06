import * as as3 from "as3";
import { BigInteger } from "@game";

export interface IReduction {
    convert(x: BigInteger): BigInteger;
    revert(x: BigInteger): BigInteger;
    reduce(x: BigInteger): void;
    mulTo(x: BigInteger, y: BigInteger, r: BigInteger): void;
    sqrTo(x: BigInteger, r: BigInteger): void;
}
export const IReduction = as3.iface("com.hurlant.math::IReduction", []);
