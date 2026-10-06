import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { ARC4, Hex, ITestHarness, TestCase } from "@game";

export class ARC4Test extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "ARC4 Test");
        this.runTest(as3.bind(this, this.testLameVectors), "ARC4 Test Vectors");
        h.endTestCase();
    }

    /**
     * Sad test vectors pilfered from
     * http://en.wikipedia.org/wiki/RC4
     */
    public testLameVectors(): void {
        let keys: any[] = [Hex.fromString("Key"), Hex.fromString("Wiki"), Hex.fromString("Secret")];
        let pts: any[] = [Hex.fromString("Plaintext"), Hex.fromString("pedia"), Hex.fromString("Attack at dawn")];
        let cts: any[] = ["BBF316E8D940AF0AD3", "1021BF0420", "45A01F645FC35B383552544B9BF5"];

        for (let i: uint = 0; i < keys.length; i++) {
            let key: ByteArray = Hex.toArray(as3.str(keys[i]));
            let pt: ByteArray = Hex.toArray(as3.str(pts[i]));
            let rc4: ARC4 = new ARC4(key);
            rc4.encrypt(pt);
            let out: string = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + cts[i] + " to " + out, cts[i] == out);
            // now go back to plaintext
            rc4.init(key);
            rc4.decrypt(pt);
            out = Hex.fromArray(pt);
            this.assert("comparing " + pts[i] + " to " + out, pts[i] == out);
        }
    }
}
