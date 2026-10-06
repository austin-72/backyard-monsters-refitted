import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { DESKey, Hex, ITestHarness, TestCase } from "@game";

export class DESKeyTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "DESKey Test");
        this.runTest(as3.bind(this, this.testECB), "DES ECB Test Vectors");
        h.endTestCase();
    }

    /**
     * Test vectors mostly grabbed from
     * http://csrc.nist.gov/publications/nistpubs/800-17/800-17.pdf
     * (Appendix A and B)
     * incomplete.
     */
    public testECB(): void {
        let keys: any[] = ["3b3898371520f75e", "10316E028C8F3B4A", "0101010101010101", "0101010101010101", "0101010101010101", "0101010101010101", "0101010101010101", "0101010101010101", "0101010101010101", "0101010101010101", "0101010101010101", "8001010101010101", "4001010101010101", "2001010101010101", "1001010101010101", "0801010101010101", "0401010101010101", "0201010101010101", "0180010101010101", "0140010101010101"];
        let pts: any[] = ["0000000000000000", "0000000000000000", "8000000000000000", "4000000000000000", "2000000000000000", "1000000000000000", "0800000000000000", "0400000000000000", "0200000000000000", "0100000000000000", "0080000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000"];
        let cts: any[] = ["83A1E814889253E0", "82DCBAFBDEAB6602", "95F8A5E5DD31D900", "DD7F121CA5015619", "2E8653104F3834EA", "4BD388FF6CD81D4F", "20B9E767B2FB1456", "55579380D77138EF", "6CC5DEFAAF04512F", "0D9F279BA5D87260", "D9031B0271BD5A0A", "95A8D72813DAA94D", "0EEC1487DD8C26D5", "7AD16FFB79C45926", "D3746294CA6A6CF3", "809F5F873C1FD761", "C02FAFFEC989D1FC", "4615AA1D33E72F10", "2055123350C00858", "DF3B99D6577397C8"];

        for (let i: uint = 0; i < keys.length; i++) {
            let key: ByteArray = Hex.toArray(as3.str(keys[i]));
            let pt: ByteArray = Hex.toArray(as3.str(pts[i]));
            let des: DESKey = new DESKey(key);
            des.encrypt(pt);
            let out: string = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + cts[i] + " to " + out, cts[i] == out);
            // now go back to plaintext
            des.decrypt(pt);
            out = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + pts[i] + " to " + out, pts[i] == out);
        }
    }
}
