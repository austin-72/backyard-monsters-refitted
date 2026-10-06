import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BigInteger, IReduction } from "@game";

// AS3 namespace bi_internal: members declared in it are plain properties in TypeScript.

/**
 * Montgomery reduction
 */
export class MontgomeryReduction extends ASObject implements IReduction {
    static {
        as3.implement(this, [IReduction]);
        as3.fields(this, { m: null, mp: 0, mpl: 0, mph: 0, um: 0, mt2: 0 });
    }

    private m: BigInteger;
    private mp: int;
    private mpl: int;
    private mph: int;
    private um: int;
    private mt2: int;

    public $ctor(m?: BigInteger): void {
        super.$ctor();
        this.m = m;
        this.mp = m.invDigit();
        this.mpl = this.mp & 0x7fff;
        this.mph = this.mp >> 15;
        this.um = ((1 << (BigInteger.DB - 15)) - 1) | 0;
        this.mt2 = (2 * m.t) | 0;
    }

    /**
     * xR mod m
     */
    public convert(x: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        x.abs().dlShiftTo(this.m.t, r);
        r.divRemTo(this.m, null, r);
        if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
            this.m.subTo(r, r);
        }
        return r;
    }

    /**
     * x/R mod m
     */
    public revert(x: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        x.copyTo(r);
        this.reduce(r);
        return r;
    }

    /**
     * x = x/R mod m (HAC 14.32)
     */
    public reduce(x: BigInteger): void {
        while (x.t <= this.mt2) {
            // pad x so am has enough room later
            x.a[x.t++] = 0;
        }
        for (let i: int = 0; i < this.m.t; ++i) {
            // faster way of calculating u0 = x[i]*mp mod DV
            let j: int = x.a[i] & 0x7fff;
            let u0: int = (j * this.mpl + (((j * this.mph + (x.a[i] >> 15) * this.mpl) & this.um) << 15)) & BigInteger.DM;
            // use am to combine the multiply-shift-add into one call
            j = (i + this.m.t) | 0;
            x.a[j] += this.m.am(0, u0, x, i, 0, this.m.t);
            // propagate carry
            while (x.a[j] >= BigInteger.DV) {
                x.a[j] -= BigInteger.DV;
                x.a[++j]++;
            }
        }
        x.clamp();
        x.drShiftTo(this.m.t, x);
        if (x.compareTo(this.m) >= 0) {
            x.subTo(this.m, x);
        }
    }

    /**
     * r = "x^2/R mod m"; x != r
     */
    public sqrTo(x: BigInteger, r: BigInteger): void {
        x.squareTo(r);
        this.reduce(r);
    }

    /**
     * r = "xy/R mod m"; x,y != r
     */
    public mulTo(x: BigInteger, y: BigInteger, r: BigInteger): void {
        x.multiplyTo(y, r);
        this.reduce(r);
    }
}
