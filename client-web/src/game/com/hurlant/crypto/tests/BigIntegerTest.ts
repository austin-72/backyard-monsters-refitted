import * as as3 from "as3";
import { int } from "as3";
import { BigInteger, Hex, ITestHarness, TestCase } from "@game";

export class BigIntegerTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "BigInteger Tests");
        this.runTest(as3.bind(this, this.testAdd), "BigInteger Addition");
        h.endTestCase();
    }

    public testAdd(): void {
        let n1: BigInteger = BigInteger.nbv(25);
        let n2: BigInteger = BigInteger.nbv(1002);
        let n3: BigInteger = n1.add(n2);
        let v: int = n3.valueOf() | 0;
        this.assert("25+1002 = " + v, 25 + 1002 == v);

        let p: BigInteger = new BigInteger(Hex.toArray("e564d8b801a61f47"));
        let xp: BigInteger = new BigInteger(Hex.toArray("99246db2a3507fa"));

        xp = xp.add(p);

        this.assert("xp==eef71f932bdb2741", xp.toString(16) == "eef71f932bdb2741");
    }
}
