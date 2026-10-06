import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { Hex, ITestHarness, TestCase, TripleDESKey } from "@game";

export class TripleDESKeyTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "Triped Des Test");
        this.runTest(as3.bind(this, this.testECB), "Triple DES ECB Test Vectors");
        h.endTestCase();
    }

    /**
     * Lots of vectors at http://csrc.nist.gov/publications/nistpubs/800-20/800-20.pdf
     * XXX move them in here.
     */
    public testECB(): void {
        let keys: any[] = ["010101010101010101010101010101010101010101010101", "dd24b3aafcc69278d650dad234956b01e371384619492ac4"];
        let pts: any[] = ["8000000000000000", "F36B21045A030303"];
        let cts: any[] = ["95F8A5E5DD31D900", "E823A43DEEA4D0A4"];

        for (let i: uint = 0; i < keys.length; i++) {
            let key: ByteArray = Hex.toArray(as3.str(keys[i]));
            let pt: ByteArray = Hex.toArray(as3.str(pts[i]));
            let ede: TripleDESKey = new TripleDESKey(key);
            ede.encrypt(pt);
            let out: string = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + cts[i] + " to " + out, cts[i] == out);
            // now go back to plaintext
            ede.decrypt(pt);
            out = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + pts[i] + " to " + out, pts[i] == out);
        }
    }
}
