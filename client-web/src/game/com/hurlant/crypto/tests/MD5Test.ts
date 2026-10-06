import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { Hex, ITestHarness, MD5, TestCase } from "@game";

export class MD5Test extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "MD5 Test");
        this.runTest(as3.bind(this, this.testMd5), "MD5 Test Vectors");
        h.endTestCase();
    }

    /**
     * Test Vectors grabbed from
     * http://www.faqs.org/rfcs/rfc1321.html
     */
    public testMd5(): void {
        let srcs: any[] = ["", Hex.fromString("a"), Hex.fromString("abc"), Hex.fromString("message digest"), Hex.fromString("abcdefghijklmnopqrstuvwxyz"), Hex.fromString("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"), Hex.fromString("12345678901234567890123456789012345678901234567890123456789012345678901234567890")];
        let hashes: any[] = ["d41d8cd98f00b204e9800998ecf8427e", "0cc175b9c0f1b6a831c399e269772661", "900150983cd24fb0d6963f7d28e17f72", "f96b697d7cb7938d525a2f31aaf161d0", "c3fcd3d76192e4007dfb496cca67e13b", "d174ab98d277d9f5a5611c2c9f419d9f", "57edf4a22be3c955ac49da2e2107b67a"];
        let md5: MD5 = new MD5();
        for (let i: uint = 0; i < srcs.length; i++) {
            let src: ByteArray = Hex.toArray(as3.str(srcs[i]));
            let digest: ByteArray = md5.hash(src);
            this.assert("MD5 Test " + i, Hex.fromArray(digest) == hashes[i]);
        }
    }
}
