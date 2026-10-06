import * as as3 from "as3";
import { ASObject } from "as3";
import { BigInteger, IReduction } from "@game";

// AS3 namespace bi_internal: members declared in it are plain properties in TypeScript.

/**
 * A "null" reducer
 */
export class NullReduction extends ASObject implements IReduction {
    static {
        as3.implement(this, [IReduction]);
    }


    public revert(x: BigInteger): BigInteger {
        return x;
    }

    public mulTo(x: BigInteger, y: BigInteger, r: BigInteger): void {
        x.multiplyTo(y, r);
    }

    public sqrTo(x: BigInteger, r: BigInteger): void {
        x.squareTo(r);
    }

    public convert(x: BigInteger): BigInteger {
        return x;
    }

    public reduce(x: BigInteger): void {
    }
}
