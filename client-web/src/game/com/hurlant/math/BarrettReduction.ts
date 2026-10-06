import * as as3 from "as3";
import { ASObject } from "as3";
import { BigInteger, IReduction } from "@game";

// AS3 namespace bi_internal: members declared in it are plain properties in TypeScript.

export class BarrettReduction extends ASObject implements IReduction {
    static {
        as3.implement(this, [IReduction]);
        as3.fields(this, { m: null, r2: null, q3: null, mu: null });
    }

    private m: BigInteger;
    private r2: BigInteger;
    private q3: BigInteger;
    private mu: BigInteger;

    public $ctor(m?: BigInteger): void {
        super.$ctor();
        // setup Barrett
        this.r2 = new BigInteger();
        this.q3 = new BigInteger();
        BigInteger.ONE.dlShiftTo((2 * m.t) | 0, this.r2);
        this.mu = this.r2.divide(m);
        this.m = m;
    }

    public revert(x: BigInteger): BigInteger {
        return x;
    }

    /**
     *
     * @param x
     * @param y
     * @param r = x*y mod m; x != r
     *
     */
    public mulTo(x: BigInteger, y: BigInteger, r: BigInteger): void {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    /**
     *
     * @param x
     * @param r = x^2 mod m; x != r
     *
     */
    public sqrTo(x: BigInteger, r: BigInteger): void {
        x.squareTo(r);
        this.reduce(r);
    }

    public convert(x: BigInteger): BigInteger {
        if (x.s < 0 || x.t > 2 * this.m.t) {
            return x.mod(this.m);
        } else if (x.compareTo(this.m) < 0) {
            return x;
        } else {
            let r: BigInteger = new BigInteger();
            x.copyTo(r);
            this.reduce(r);
            return r;
        }
    }

    /**
     *
     * @param x = x mod m (HAC 14.42)
     *
     */
    public reduce(lx: BigInteger): void {
        let x: BigInteger = as3.as(lx, BigInteger);
        x.drShiftTo((this.m.t - 1) | 0, this.r2);
        if (x.t > this.m.t + 1) {
            x.t = (this.m.t + 1) | 0;
            x.clamp();
        }
        this.mu.multiplyUpperTo(this.r2, (this.m.t + 1) | 0, this.q3);
        this.m.multiplyLowerTo(this.q3, (this.m.t + 1) | 0, this.r2);
        while (x.compareTo(this.r2) < 0) {
            x.dAddOffset(1, (this.m.t + 1) | 0);
        }
        x.subTo(this.r2, x);
        while (x.compareTo(this.m) >= 0) {
            x.subTo(this.m, x);
        }
    }
}
