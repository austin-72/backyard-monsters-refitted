import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { Hex, ITestHarness, SHA224, TestCase } from "@game";

export class SHA224Test extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "SHA-224 Test");
        this.runTest(as3.bind(this, this.testSha224), "SHA-224 Test Vectors");
        // takes a few seconds, but uncomment if you must.
        // runTest(testLongSha224,"SHA-224 Long Test Vectors");
        h.endTestCase();
    }

    /**
     * Test vectors courtesy of
     * http://www.ietf.org/rfc/rfc3874.txt
     */
    public testSha224(): void {
        let srcs: any[] = [Hex.fromString("abc"), Hex.fromString("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")];
        let hashes: any[] = ["23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7", "75388b16512776cc5dba5da1fd890150b0c6455cb4f58b1952522525"];

        let sha224: SHA224 = new SHA224();
        for (let i: uint = 0; i < srcs.length; i++) {
            let src: ByteArray = Hex.toArray(as3.str(srcs[i]));
            let digest: ByteArray = sha224.hash(src);
            this.assert("SHA224 Test " + i, Hex.fromArray(digest) == hashes[i]);
        }
    }

    public testLongSha224(): void {
        let src: ByteArray = new ByteArray();
        let a: uint = "a".charCodeAt(0) >>> 0;
        for (let i: uint = 0; i < 1e6; i++) {
            src[i] = a;
        }
        let sha224: SHA224 = new SHA224();
        let digest: ByteArray = sha224.hash(src);
        let hash: string = "20794655980c91d8bbb4c1ea97618a4bf03f42581948b2ee4ee7ad67";
        this.assert("SHA224 Long Test", Hex.fromArray(digest) == hash);
    }
}
