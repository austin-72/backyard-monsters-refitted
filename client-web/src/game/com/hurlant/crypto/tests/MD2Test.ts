import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { Hex, ITestHarness, MD2, TestCase } from "@game";

export class MD2Test extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "MD2 Test");
        this.runTest(as3.bind(this, this.testMd2), "MD2 Test Vectors");
        h.endTestCase();
    }

    /**
     * Test Vectors grabbed from
     * http://www.faqs.org/rfcs/rfc1319.html
     */
    public testMd2(): void {
        let srcs: any[] = ["", Hex.fromString("a"), Hex.fromString("abc"), Hex.fromString("message digest"), Hex.fromString("abcdefghijklmnopqrstuvwxyz"), Hex.fromString("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"), Hex.fromString("12345678901234567890123456789012345678901234567890123456789012345678901234567890")];
        let hashes: any[] = ["8350e5a3e24c153df2275c9f80692773", "32ec01ec4a6dac72c0ab96fb34c0b5d1", "da853b0d3f88d99b30283a69e6ded6bb", "ab4f496bfb2a530b219ff33031fe06b0", "4e8ddff3650292ab5a4108c3aa47940b", "da33def2a42df13975352846c30338cd", "d5976f79d83d3a0dc9806c3c66f3efd8"];
        let md2: MD2 = new MD2();
        for (let i: uint = 0; i < srcs.length; i++) {
            let src: ByteArray = Hex.toArray(as3.str(srcs[i]));
            let digest: ByteArray = md2.hash(src);
            this.assert("MD2 Test " + i, Hex.fromArray(digest) == hashes[i]);
        }
    }
}
