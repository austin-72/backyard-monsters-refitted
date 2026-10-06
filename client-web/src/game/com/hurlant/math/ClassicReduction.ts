import * as as3 from "as3";
import { ASObject } from "as3";
import { BigInteger, IReduction } from "@game";

// AS3 namespace bi_internal: members declared in it are plain properties in TypeScript.

/**
 * Modular reduction using "classic" algorithm
 */
export class ClassicReduction extends ASObject implements IReduction {
    static {
        as3.implement(this, [IReduction]);
        as3.fields(this, { m: null });
    }

    private m: BigInteger;

    public $ctor(m?: BigInteger): void {
        super.$ctor();
        this.m = m;
    }

    public convert(x: BigInteger): BigInteger {
        if (x.s < 0 || x.compareTo(this.m) >= 0) {
            return x.mod(this.m);
        }
        return x;
    }

    public revert(x: BigInteger): BigInteger {
        return x;
    }

    public reduce(x: BigInteger): void {
        x.divRemTo(this.m, null, x);
    }

    public mulTo(x: BigInteger, y: BigInteger, r: BigInteger): void {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    public sqrTo(x: BigInteger, r: BigInteger): void {
        x.squareTo(r);
        this.reduce(r);
    }
}
